# ============ S2 10 BĂNG CHO GEOPORTAL 2.1 -> HUGGING FACE (CTX, tổ hợp màu, chỉ số tính ngay trong trình duyệt) ============
# Chạy độc lập trên Colab CPU, SAU các notebook s2_HF_LOP_THAM_CHIEU và s2_HF_BO_SUNG_PC_EMB.
# Mỗi năm: ảnh tổng hợp S2_HP_{y}.tif (int16, 10 băng, UTM 48N gốc, lưới 10 m của bộ phân loại; 2017, 2018 dùng bản vá _v2)
# -> COG s2d/s2d_{y}.tif (DEFLATE + predictor, ô 256, overview trung bình), GIỮ NGUYÊN giá trị và lưới gốc,
# nên CTX (TB, ĐLC 5 × 5, 15 × 15) trang tính tại điểm trùng với đặc trưng bộ phân loại đã dùng.
# Khoảng 2-3 GB mỗi năm. Mặc định dựng trên đĩa Colab rồi đẩy từng năm và xoá (không tốn chỗ Drive); chạy lại
# thì bỏ qua năm đã có trên Hugging Face. Token HF: Colab Secrets (HF_TOKEN) hoặc nhập tay, không ghi vào ô.
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
NAM = list(range(2017, 2027))
NAM_KEO = 2023             # năm tham chiếu để tính kéo giãn màu cố định (giống nhau mọi năm)
LUU_DRIVE = False          # True: giữ thêm một bản trên Drive (HP_HF_LOP_THAM_CHIEU/s2d, ~25 GB)
LAM_LAI = False            # True: dựng lại cả năm đã có trên Hugging Face
GUI_LEN = True
CAP_NHAT_SPACE = False     # True: cập nhật cả index.html của Space
SPACE = "lopmaybay/lay-mau-hai-phong"

# ---------------- HÀM (thuần, thử được ngoài Colab) ----------------
import os, sys, re, json, time, shutil
import numpy as np

S2_BANDS = ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"]


def s2d_cog(src, out):
    """Ảnh 10 băng -> COG giữ nguyên kiểu, giá trị và lưới; overview trung bình để xem ở mức thu nhỏ."""
    import rasterio.shutil as rsh
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    rsh.copy(src, out, driver="COG", compress="DEFLATE", predictor=2, blocksize=256, overviews="AUTO",
             resampling="AVERAGE", BIGTIFF="IF_SAFER", NUM_THREADS="ALL_CPUS")
    return out


def s2d_keo_gian(src, n_win=60, win=256, seed=0, windows=(5, 15), p=(2, 98)):
    """Kéo giãn cố định cho trang: p2, p98 từng băng (bỏ điểm ảnh 0) và p98 của độ lệch chuẩn CTX từng cửa sổ.
    CTX như s2_classify.context_features: uniform_filter(mode="nearest") trên giá trị gốc."""
    import rasterio
    from rasterio.windows import Window
    from scipy.ndimage import uniform_filter
    rng = np.random.default_rng(seed)
    vals, sds = [], {w: [] for w in windows}
    with rasterio.open(src) as ds:
        nb, W, H = ds.count, ds.width, ds.height
        ww, hh = min(win, W), min(win, H)
        tries = 0
        while len(vals) < n_win and tries < n_win * 20:
            tries += 1
            c0, r0 = int(rng.integers(0, max(1, W - ww + 1))), int(rng.integers(0, max(1, H - hh + 1)))
            a = ds.read(window=Window(c0, r0, ww, hh)).astype(np.float64)
            ok = (a != 0).any(0)
            if ok.mean() < 0.5:
                continue
            vals.append(a[:, ok])
            for w in windows:
                r = (w - 1) // 2
                inner = ok.copy(); inner[:r, :] = inner[-r:, :] = inner[:, :r] = inner[:, -r:] = False
                s = []
                for b in range(nb):
                    m = uniform_filter(a[b], w, mode="nearest"); m2 = uniform_filter(a[b] * a[b], w, mode="nearest")
                    s.append(np.sqrt(np.maximum(m2 - m * m, 0))[inner])
                sds[w].append(np.stack(s))
    if not vals:
        raise RuntimeError("không có cửa sổ nào đủ dữ liệu để tính kéo giãn")
    V = np.concatenate(vals, 1)
    out = dict(lo=[float(np.percentile(V[b], p[0])) for b in range(V.shape[0])],
               hi=[float(np.percentile(V[b], p[1])) for b in range(V.shape[0])], n_cua_so=len(vals), phan_vi=list(p))
    for w in windows:
        S = np.concatenate(sds[w], 1)
        out[f"s{w}"] = [float(np.percentile(S[b], p[1])) for b in range(S.shape[0])]
    for k in ("lo", "hi", "s5", "s15"):
        if k in out:
            out[k] = [round(v, 1) for v in out[k]]
    return out


def kiem_s2d(src, cog, n=300, seed=1):
    """So n điểm ảnh ngẫu nhiên giữa ảnh nguồn và COG (ảnh gốc): phải trùng tuyệt đối, cùng lưới."""
    import rasterio
    rng = np.random.default_rng(seed)
    with rasterio.open(src) as a, rasterio.open(cog) as b:
        assert a.transform == b.transform and a.crs == b.crs and (a.width, a.height, a.count) == (b.width, b.height, b.count), "khác lưới"
        rows, cols = rng.integers(0, a.height, n), rng.integers(0, a.width, n)
        d = 0
        for r, c in zip(rows, cols):
            win = ((int(r), int(r) + 1), (int(c), int(c) + 1))
            d = max(d, int(np.abs(a.read(window=win).astype(np.int64) - b.read(window=win).astype(np.int64)).max()))
        return d, len(b.overviews(1))


# ---------------- CHẠY (Colab) ----------------
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
!pip install -q rasterio huggingface_hub scipy
import rasterio
D = "/content/drive/MyDrive"; MOD = f"{D}/HP_modules"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"; DRIVE_MY = f"{D}/HP_multiyear"
TMP = "/content/tmp_s2d"; os.makedirs(TMP, exist_ok=True)
assert os.path.exists(f"{HF_DIR}/manifest.json"), "chưa có bộ dữ liệu trên Drive (HP_HF_LOP_THAM_CHIEU)"


def phien_ban(p, mau):
    if not os.path.exists(p):
        return (0,)
    m = re.search(mau, open(p, encoding="utf-8", errors="ignore").read())
    return tuple(int(v) for v in m.group(1).split(".")) if m else (0,)


if phien_ban(f"{MOD}/LAY_MAU_DA_NAM.html", r'const VERSION = "([\d.]+)"') < (2, 1):
    print("Tải lên HP_modules: LAY_MAU_DA_NAM.html (bản 2.1)"); from google.colab import files
    for k in files.upload(): shutil.copy(k, MOD)
assert phien_ban(f"{MOD}/LAY_MAU_DA_NAM.html", r'const VERSION = "([\d.]+)"') >= (2, 1), "cần LAY_MAU_DA_NAM.html bản 2.1"

RAS = {y: f"{DRIVE_MY}/S2_HP_{y}.tif" for y in NAM}
RAS.update({y: f"{DRIVE_MY}/S2_HP_{y}_v2.tif" for y in (2017, 2018)})     # ảnh đã vá, như chuỗi bản đồ
co_nguon = [y for y in NAM if os.path.exists(RAS[y])]
print("ảnh nguồn có:", co_nguon, "| thiếu:", [y for y in NAM if y not in co_nguon])
with rasterio.open(RAS[co_nguon[0]]) as ds:
    print(f"  lưới {ds.width} × {ds.height}, {ds.count} băng {ds.dtypes[0]}, {ds.crs}, gốc {ds.transform.c:.0f}, {ds.transform.f:.0f}")
    assert ds.count == 10, "ảnh nguồn phải có 10 băng"

tok = None
if GUI_LEN:
    from huggingface_hub import HfApi, CommitOperationAdd
    try:
        from google.colab import userdata; tok = userdata.get("HF_TOKEN")
    except Exception:
        import getpass; tok = getpass.getpass("HF token (quyền ghi): ")
    api = HfApi(token=tok)
    da_co = set(api.list_repo_files(HF_REPO, repo_type="dataset"))
else:
    da_co = set()


def ve_may(p):                     # chép nguồn Drive về đĩa Colab (đọc nhanh hơn nhiều)
    q = f"{TMP}/nguon_{os.path.basename(p)}"
    if not (os.path.exists(q) and os.path.getsize(q) == os.path.getsize(p)):
        shutil.copyfile(p, q)
    return q


# 1) kéo giãn cố định từ năm tham chiếu
nk = NAM_KEO if NAM_KEO in co_nguon else co_nguon[-1]
t0 = time.time(); src = ve_may(RAS[nk])
KG = s2d_keo_gian(src); KG["nam_tham_chieu"] = nk
print(f"kéo giãn ({nk}, {KG['n_cua_so']} cửa sổ, {time.time() - t0:.0f}s):")
for i, b in enumerate(S2_BANDS):
    print(f"  {b:4s} {KG['lo'][i]:7.0f} .. {KG['hi'][i]:7.0f} | ĐLC p98 5×5 {KG['s5'][i]:6.0f}  15×15 {KG['s15'][i]:6.0f}")

# 2) từng năm: COG, kiểm, đẩy, xoá bản trên máy
nam_co = sorted(int(m.group(1)) for f in da_co for m in [re.match(r"s2d/s2d_(\d{4})\.tif$", f)] if m)
for y in co_nguon:
    ten = f"s2d/s2d_{y}.tif"
    if ten in da_co and not LAM_LAI:
        print(f"== {y}: đã có trên Hugging Face, bỏ qua"); continue
    t0 = time.time(); print(f"== {y}")
    src = ve_may(RAS[y]); out = f"{TMP}/s2d_{y}.tif"
    s2d_cog(src, out)
    d, nov = kiem_s2d(src, out)
    assert d == 0, f"COG {y} khác nguồn ({d})"
    print(f"   COG {os.path.getsize(out) / 1e9:.2f} GB, {nov} mức overview, trùng nguồn, {time.time() - t0:.0f}s")
    if LUU_DRIVE:
        os.makedirs(f"{HF_DIR}/s2d", exist_ok=True); shutil.copyfile(out, f"{HF_DIR}/{ten}")
    if GUI_LEN:
        api.upload_file(path_or_fileobj=out, path_in_repo=ten, repo_id=HF_REPO, repo_type="dataset",
                        commit_message=f"S2 10 băng {y} (COG int16, lưới UTM gốc) cho geoportal 2.1")
        print(f"   đã đẩy, {time.time() - t0:.0f}s")
    nam_co = sorted(set(nam_co) | {y})
    os.remove(out); os.remove(src)

# 3) manifest, README, trang
man = json.load(open(f"{HF_DIR}/manifest.json"))
if not os.path.exists(f"{HF_DIR}/manifest_v3.json"):
    shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v3.json")          # giữ bản trước
man["s2d"] = dict(duong_dan="s2d/s2d_{y}.tif", nam=nam_co, bang=S2_BANDS, crs="EPSG:32648", don_vi="DN (phản xạ × 10000)",
                  keo_gian=KG, ctx=dict(cua_so=[5, 15], bien="nearest", nhu="s2_classify.context_features"),
                  nguon="S2_HP_{y}.tif (2017, 2018: bản vá _v2), lưới UTM 48N gốc 10 m, không đổi giá trị")
man["phien_ban"] = max(int(man.get("phien_ban", 1)), 3); man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
json.dump(man, open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
shutil.copyfile(f"{MOD}/LAY_MAU_DA_NAM.html", f"{HF_DIR}/LAY_MAU_DA_NAM.html")
rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## S2 10 băng")[0]
rd += (f"\n## S2 10 băng ({time.strftime('%Y-%m-%d')})\n- `s2d/s2d_{{y}}.tif`: ảnh tổng hợp mùa khô Sentinel-2, 10 băng "
       f"({', '.join(S2_BANDS)}), int16 DN (phản xạ × 10000), lưới UTM 48N gốc 10 m, COG DEFLATE có overview; năm {nam_co[0]}-{nam_co[-1]}.\n"
       f"  Trang lấy mẫu (bản 2.1) tính tổ hợp màu, chỉ số và CTX (trung bình, độ lệch chuẩn 5 × 5 và 15 × 15, biên nearest) ngay trong trình duyệt;\n"
       f"  giá trị tại điểm trùng với đặc trưng của bộ phân loại. Kéo giãn cố định theo năm {nk} (p2-p98) ghi trong manifest.\n")
open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)
if GUI_LEN:
    tep = ["manifest.json", "manifest_v3.json", "README.md", "LAY_MAU_DA_NAM.html"]
    api.create_commit(repo_id=HF_REPO, repo_type="dataset", commit_message="Geoportal 2.1: lớp S2 10 băng + CTX, manifest",
                      operations=[CommitOperationAdd(path_in_repo=t, path_or_fileobj=f"{HF_DIR}/{t}") for t in tep])
    if CAP_NHAT_SPACE:
        api.upload_file(path_or_fileobj=f"{HF_DIR}/LAY_MAU_DA_NAM.html", path_in_repo="index.html", repo_id=SPACE, repo_type="space")
print("xong: s2d có các năm", nam_co)
