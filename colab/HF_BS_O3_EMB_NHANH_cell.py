# ============ 3. EMBEDDING NHANH (GPU): MỘT LƯỢT MỖI NĂM, CHIẾU TRÊN GPU, CÁC BƯỚC GỐI ĐẦU ============
# Nhanh hơn ô cũ (4 phút/năm) nhờ:
#  (1) MỘT lượt encoder mỗi năm cho cả ảnh chiếu lẫn vector 64 chiều tại hai bộ điểm (ô cũ chạy encoder 3 lần);
#  (2) gộp các ô 1024 cùng cỡ thành LÔ trên GPU; chiếu 64 -> 6 và lượng tử hoá ngay trên GPU, chỉ chép uint8 về;
#  (3) nhiều luồng đọc ô trong khi GPU chạy;
#  (4) chép ảnh S2 các năm sau từ Drive TRONG KHI đang tính năm này; dựng hai COG (g7, g7b) trong MỘT lượt nắn,
#      nhiều luồng, ở nền, gối đầu với năm sau.
# Chạy tiếp được: năm đã có đủ g7, g7b hợp lệ và đủ điểm thì bỏ qua; tệp chép dở (bị ngắt) được phát hiện, làm lại.
LO = 8          # số ô 1024 mỗi lô GPU (A100 80 GB: 8-16 thoải mái). Cổng không đạt thì đặt LO = 1
N_DOC = 4       # số luồng đọc ô
N_CHEP = 2      # số năm chép trước từ Drive
N_COG = 2       # số năm dựng COG song song ở nền
sys.modules.pop("s2_hf_lop", None)
if phien_ban(f"{MOD}/s2_hf_lop.py", r'__version__ = "([\d.]+)"') < (1, 2):
    print("Tải lên HP_modules: s2_hf_lop.py (bản 1.2)"); from google.colab import files
    for k in files.upload(): shutil.copy(k, MOD)
    sys.modules.pop("s2_hf_lop", None)
import s2_hf_lop as H
assert H.__version__ >= "1.2", f"s2_hf_lop {H.__version__}: cần bản 1.2"
import torch, s2_pixlab as P, s2_fast as FA, s2_e6 as E6
from concurrent.futures import ThreadPoolExecutor
DEV = "cuda" if torch.cuda.is_available() else "cpu"
if LAM["emb"] and DEV == "cpu" and not CHO_PHEP_CPU:
    LAM["emb"] = False
    print("KHÔNG có GPU: bỏ phần embedding (đổi runtime sang GPU rồi chạy lại ô này)")


def tim(p):
    if not p:
        return None
    for q in (p, f"{OUT3}/{p}"):
        if os.path.exists(q):
            return q
    c = sorted(glob.glob(f"{OUT3}/**/{os.path.basename(p)}", recursive=True))
    return c[0] if c else None


def nap_encoder(ten, ckpt):
    st = torch.load(ckpt, map_location="cpu", weights_only=False)
    cfg = st.get("cfg", {}) or {}
    net = P.build_arch(cfg.get("arch", "dilated_v4"), 10, int(cfg.get("dim", 64)),
                       width=int(cfg.get("width", 48)), dilations=tuple(cfg.get("dilations", (1, 2, 4))),
                       depth=int(cfg.get("depth", 3)))
    net.load_state_dict(st["state_dict"])
    enc = P.DenseEncoder(ten, net, st["mean"], st["std"], int(cfg.get("dim", 64))).to(DEV)
    enc.pad = st.get("pad", 12); enc.net.eval()
    return enc


MASKS = {}


def mat_na(sp):
    with rasterio.open(sp) as d_:
        sig = (d_.height, d_.width, tuple(np.round(d_.transform[:6], 3)))
    if sig not in MASKS:
        MASKS[sig] = FA.boundary_mask(sp, bnd)
    return MASKS[sig]


def luu_parquet(df_, p):
    df_.to_parquet(p + ".part", index=False); os.replace(p + ".part", p)


CONG = {}
for cf in (EMB_CAU_HINH if LAM["emb"] else []):
    if not cf["lam"]:
        continue
    ten = cf["ten"]; ck = tim(cf["ckpt"])
    if ck is None:
        print(f"[{ten}] không thấy {cf['ckpt']}: bỏ qua"); continue
    try:
        enc = nap_encoder(ten, ck)
    except Exception as e:
        print(f"[{ten}] không nạp được encoder {ck}: {type(e).__name__}: {e}"); continue
    mom = None
    if cf.get("he_so_chung"):
        hp = tim(cf["he_so_chung"]); assert hp, f"[{ten}] không thấy {cf['he_so_chung']}"
        hs_ = json.load(open(hp)); mom = (np.array(hs_["mean"], np.float32), np.array(hs_["std"], np.float32))
    print(f"[{ten}] {ck} | dim {enc.dim}, lề {enc.pad}, chuẩn hoá {'chung' if mom else 'theo từng ảnh'}, lô {LO}")

    # (a) phép chiếu 64 -> N_TP CHUNG cho mọi năm (đã có từ lần chạy trước thì dùng lại)
    os.makedirs(f"{HF_DIR}/emb", exist_ok=True)
    p_pr = f"{HF_DIR}/emb/{ten}_phep_chieu.json"
    if os.path.exists(p_pr):
        PR = json.load(open(p_pr))
    else:
        Z = []
        for y in NAM_KHOP:
            sp = may(RAS[y])
            Z.append(H.embed_sample(sp, H.torch_embed_fn(enc, sp, mom, DEV), enc.pad, mask=mat_na(sp),
                                    n_tiles=6, per_tile=5000, tile=1024, seed=y))
        PR = H.fit_proj(np.concatenate(Z), n=N_TP)
        PR.update(encoder=ten, ckpt=os.path.basename(ck), chuan_hoa="chung" if mom else "theo từng ảnh",
                  nam_khop=list(NAM_KHOP), tile=1024, pad=int(enc.pad), ghi_chu=cf["ghi_chu"])
        json.dump(PR, open(p_pr, "w"))
    mu_, C_ = np.asarray(PR["mu"], np.float32), np.asarray(PR["comps"], np.float32)
    print(f"   tỉ lệ phương sai {N_TP} thành phần: {np.round(PR['ti_le_phuong_sai'], 3).tolist()}")

    # (b) các năm còn thiếu
    EMB_DIEM = {b: (pd.read_parquet(f"{HF_DIR}/diem/emb_{ten}_{b}.parquet")
                    if os.path.exists(f"{HF_DIR}/diem/emb_{ten}_{b}.parquet") else pd.DataFrame()) for b in BO_DIEM}
    ra = lambda y: (f"{HF_DIR}/{ten}/{ten}_{y}.tif", f"{HF_DIR}/{ten}b/{ten}b_{y}.tif")
    xong_anh = lambda y: all(os.path.exists(o) and H.hop_le(o) for o in ra(y))
    xong_diem = lambda y: (not LAM["emb_diem"]) or all(len(v) and (v.year == y).any() for v in EMB_DIEM.values())
    nam_lam = [y for y in NAM if os.path.exists(RAS[y]) and not (xong_anh(y) and xong_diem(y))]
    print(f"   còn phải làm: {nam_lam}")
    p_cong = f"{HF_DIR}/emb/{ten}_cong_nhanh.json"
    if os.path.exists(p_cong):
        CONG[ten] = json.load(open(p_cong))
    pool_chep, pool_cog = ThreadPoolExecutor(N_CHEP), ThreadPoolExecutor(N_COG)
    f_chep, viec_cog, t0 = {}, [], time.time()


    def lam_cog(y, u8, ten=ten):
        o1, o2 = ra(y)
        if not xong_anh(y):
            a1, a2 = f"{TMP}/{ten}_{y}.tif", f"{TMP}/{ten}b_{y}.tif"
            H.rgb_cog_nhom(u8, [([1, 2, 3], a1), ([4, 5, 6], a2)], GRID, tmp_dir=TMP, verbose=False)
            H.chep_an_toan(a1, o1); H.chep_an_toan(a2, o2); os.remove(a1); os.remove(a2)
        os.remove(u8)
        return y, time.time()


    try:
        for i, y in enumerate(nam_lam):
            for y_ in nam_lam[i:i + N_CHEP + 1]:                 # chép trước các năm sau
                if y_ not in f_chep:
                    f_chep[y_] = pool_chep.submit(may, RAS[y_])
            sp = f_chep.pop(y).result()
            u8 = f"{TMP}/{ten}_{y}_u8.tif"
            pts = {b: (d.x_utm.values, d.y_utm.values) for b, d in BO_DIEM.items()} if LAM["emb_diem"] else None
            res = H.embed_pass(sp, H.torch_proj_fn(enc, sp, PR, mom, DEV), enc.pad, N_TP, u8, tile=1024,
                               mask=mat_na(sp), points=pts, batch=LO, n_doc=N_DOC)
            if ten not in CONG:
                # CỔNG của đường nhanh (lô, chiếu trên GPU): so với embed_points_tiled (từng ô một, như bản đồ g7c)
                d = BO_DIEM["E0_900"]
                zr = E6.embed_points_tiled(enc, sp, d.x_utm.values, d.y_utm.values, moments=mom, tile=1024,
                                           device=DEV).to_numpy(np.float32)
                q_ref = H.quantize(((zr - mu_) @ C_.T).T, PR["lo"], PR["hi"]).T.astype(int)
                q_ras = H.sample_bands(u8, d.x_utm.values, d.y_utm.values).astype(int)
                ok = (q_ref > 0).all(1) & (q_ras > 0).all(1)
                t_anh = float((np.abs(q_ref[ok] - q_ras[ok]) <= 1).all(1).mean()) if ok.any() else 0.0
                t_diem = float("nan")
                if res:
                    zp = res["E0_900"].to_numpy(np.float32); ok2 = np.isfinite(zr).all(1) & np.isfinite(zp).all(1)
                    t_diem = float(np.abs(zr[ok2] - zp[ok2]).max() / max(np.abs(zr[ok2]).max(), 1e-9))
                CONG[ten] = dict(trung_anh=t_anh, lech_diem_tuong_doi=t_diem, n_diem=int(ok.sum()), nam=y, lo=LO)
                json.dump(CONG[ten], open(p_cong, "w"))
                print(f"   CỔNG {ten} (đường nhanh, lô {LO}): ảnh trùng {t_anh:.4f} ở {int(ok.sum())} điểm E0; "
                      f"vector tại điểm lệch tương đối tối đa {t_diem:.1e}")
                assert t_anh >= 0.99 and not (t_diem > 0.01), "đường nhanh không khớp: đặt LO = 1 rồi chạy lại ô này"
            if res:
                for b, d in BO_DIEM.items():
                    if not (len(EMB_DIEM[b]) and (EMB_DIEM[b].year == y).any()):
                        ze = res[b].copy(); ze.insert(0, "year", y); ze.insert(0, "id", d["id"].values)
                        EMB_DIEM[b] = pd.concat([EMB_DIEM[b], ze], ignore_index=True)
                        luu_parquet(EMB_DIEM[b], f"{HF_DIR}/diem/emb_{ten}_{b}.parquet")
            bo(RAS[y])                                           # phép chiếu đã khớp: không cần giữ ảnh S2
            viec_cog.append(pool_cog.submit(lam_cog, y, u8))
            print(f"   {ten} {y}: xong phần GPU, {(time.time() - t0) / 60:.1f} phút", flush=True)
        for f_ in viec_cog:
            y_, t_ = f_.result()
            print(f"   {ten} {y_}: COG xong, {(t_ - t0) / 60:.1f} phút")
    finally:
        pool_chep.shutdown(wait=True); pool_cog.shutdown(wait=True)
    del enc
    if DEV == "cuda":
        torch.cuda.empty_cache()
for lop in [c["ten"] + s for c in EMB_CAU_HINH for s in ("", "b")]:
    fs = glob.glob(f"{HF_DIR}/{lop}/*.tif")
    if fs:
        print(f"  {lop:8s}: {len(fs)} tệp, {sum(os.path.getsize(f) for f in fs) / 1e9:.2f} GB")
