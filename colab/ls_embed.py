# =============================================================================
# LANDSAT 1987-2026: embedding từng điểm ảnh có ngữ cảnh, cùng kiến trúc với g7 của S2
#   dilated_v4 (s2_pixlab.build_arch), rộng 48, giãn (1, 2, 4), sâu 3, 64 chiều, mục tiêu tái dựng che 60 %, 1500 bước.
#   Khác S2: 6 băng vào (BLUE..SWIR2 của ảnh mùa khô đã chuẩn hoá tương đối), 30 m.
#   Chuẩn hoá đầu vào bằng MỘT bộ trung bình, độ lệch chuẩn chung mọi năm (không theo từng ảnh): đổi thật của mặt đất
#   (đô thị sáng lên, ao hồ mở rộng) không bị chuẩn hoá mất, và năm nào cũng qua cùng một phép biến đổi.
#   Mảnh huấn luyện chia đều cho mọi năm (mỗi năm cùng số mảnh), nên 1987-2012 (TM, ETM+) nặng ngang 2013-2026 (OLI).
#   Tuỳ chọn chung_s2: thêm đầu ra 1 × 1 học dự đoán 6 thành phần chính của embedding g7 S2 (2017-2026, gộp 3 × 3 về
#   30 m, đọc từ chính các ảnh g7, g7b trên HF và phép chiếu emb/g7_phep_chieu.json). Khi đó phép chiếu của Landsat
#   là đầu ra này, nên màu lsg so được với màu g7 trên cùng một thang.
# Phần không cần torch (mảnh, mô men, đánh giá, phép chiếu, đọc mục tiêu S2) kiểm thử ở t_ls_embed.py;
# phần torch tự kiểm bằng self_test() trên Colab.
# =============================================================================
import os, json, time
import numpy as np
import pandas as pd

from ls_landsat import TEN_BANG, NODATA

__version__ = "1.0"
CAU_HINH_EMB = dict(
    ten="lsg7", arch="dilated_v4", in_ch=6, dim=64, width=48, dilations=(1, 2, 4), depth=3,
    objective="recon", steps=1500, bs=32, manh=128, tile=96, lr=1e-3, mask_ratio=0.6, seed=0,
    manh_moi_nam=48, pad=12,
    chung_s2=False, nam_s2=list(range(2017, 2027)), w_s2=1.0, n_comp=6)


# --------------------------------------------------------------------------- dữ liệu
def doc_6(tep):
    """6 băng phản xạ (int16 ×10000) và mặt nạ hợp lệ của một ảnh mùa khô 10 băng."""
    import rasterio
    with rasterio.open(tep) as d:
        a = d.read(list(range(1, 7)))
    return a, (a != NODATA).all(0)


def mo_men_chung(tep_theo_nam, n_moi_nam=20000, seed=0):
    """Trung bình, độ lệch chuẩn từng băng (đơn vị DN ×10000), cùng số điểm mỗi năm. Trả về (mean[6], std[6])."""
    rng = np.random.default_rng(seed)
    gom = []
    for y, t in sorted(tep_theo_nam.items()):
        a, ok = doc_6(t)
        rr, cc = np.nonzero(ok)
        if not len(rr):
            continue
        j = rng.choice(len(rr), min(n_moi_nam, len(rr)), replace=False)
        gom.append(a[:, rr[j], cc[j]].T)
    X = np.concatenate(gom).astype(np.float64)
    return X.mean(0).tolist(), np.maximum(X.std(0), 1.0).tolist()


def cat_manh(tep_theo_nam, n_moi_nam, P, seed=0, mask=None, buoc=None, them=None):
    """Mảnh P × P HỢP LỆ TOÀN BỘ (không lỗ, trong ranh giới nếu có mask), cùng số mảnh mỗi năm.
    them: {năm: mảng (C, H, W)} cắt kèm đúng vị trí (vd mục tiêu S2). Trả về (X int16 (N, 6, P, P), bảng vị trí, dict them)."""
    rng = np.random.default_rng(seed)
    buoc = buoc or max(8, P // 4)
    X, meta, T = [], [], {}
    for y, t in sorted(tep_theo_nam.items()):
        a, ok = doc_6(t)
        if mask is not None:
            ok = ok & mask
        H, W = ok.shape
        # đếm điểm hợp lệ trong cửa sổ bằng ảnh tích phân
        I = np.pad(ok.astype(np.int32).cumsum(0).cumsum(1), ((1, 0), (1, 0)))
        ung = []
        for r0 in range(0, H - P + 1, buoc):
            for c0 in range(0, W - P + 1, buoc):
                s = I[r0 + P, c0 + P] - I[r0, c0 + P] - I[r0 + P, c0] + I[r0, c0]
                if s == P * P:
                    ung.append((r0, c0))
        if not ung:
            continue
        pick = rng.choice(len(ung), min(n_moi_nam, len(ung)), replace=False)
        for i in pick:
            r0, c0 = ung[i]
            X.append(a[:, r0:r0 + P, c0:c0 + P])
            meta.append(dict(nam=int(y), r0=int(r0), c0=int(c0)))
            if them is not None:
                src = them.get(int(y))
                blk = (src[:, r0:r0 + P, c0:c0 + P] if src is not None
                       else np.full((next(iter(them.values())).shape[0], P, P), np.nan, np.float16))
                T.setdefault("T", []).append(blk.astype(np.float16))
    if not X:
        raise ValueError(f"không có mảnh {P} × {P} nào hợp lệ toàn bộ trong ranh giới: giảm 'manh' (EMB_CFG) hoặc kiểm tra ảnh")
    X = np.stack(X).astype(np.int16)
    T = np.stack(T["T"]) if T.get("T") else None
    return X, pd.DataFrame(meta), T


# --------------------------------------------------------------------------- mục tiêu S2 (tuỳ chọn chung_s2)
def muc_tieu_s2(tep_g, tep_gb, phep_chieu_s2, L, tmp_dir="/tmp"):
    """Đọc ảnh g7 (thành phần 1-3) và g7b (4-6) trên HF (COG 3857, 8 bit), gộp trung bình về lưới Landsat 30 m L,
    đổi 1..255 về giá trị thành phần theo lo, hi của phép chiếu S2. Trả về (6, H, W) float32, NaN nơi không có."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.vrt import WarpedVRT
    from ls_landsat import transform_luoi, CRS
    tf, W, H = transform_luoi(L), L["rong"], L["cao"]
    lo, hi = np.asarray(phep_chieu_s2["lo"], np.float64), np.asarray(phep_chieu_s2["hi"], np.float64)
    out = np.full((6, H, W), np.nan, np.float32)
    for k, tep in enumerate((tep_g, tep_gb)):
        with rasterio.open(tep) as ds, WarpedVRT(ds, crs=CRS, transform=tf, width=W, height=H,
                                                 resampling=Resampling.average, src_nodata=0, nodata=0) as v:
            a = v.read([1, 2, 3]).astype(np.float64)
        m = (a == 0).any(0)
        for q in range(3):
            j = 3 * k + q
            x = lo[j] + (a[q] - 1) / 254.0 * (hi[j] - lo[j])
            x[m] = np.nan
            out[j] = x
    return out


def chuan_muc_tieu(T):
    """(N, 6, P, P) -> (T chuẩn hoá theo từng thành phần, tm, ts) bỏ qua NaN."""
    Tf = T.astype(np.float32)
    tm = np.nanmean(Tf, axis=(0, 2, 3)); ts = np.nanstd(Tf, axis=(0, 2, 3)) + 1e-6
    return ((Tf - tm[None, :, None, None]) / ts[None, :, None, None]).astype(np.float16), tm.tolist(), ts.tolist()


def dau_ra_thanh_phep_chieu(A, b, tm, ts, lo, hi):
    """Đầu ra 1 × 1 (y_chuẩn = A z + b) -> phép chiếu dạng fit_proj: y = C (z - mu) với y theo thang S2.
    y = ts * (A z + b) + tm  =>  C = ts[:, None] * A,  mu = -pinv(C) (ts * b + tm) (nghiệm chuẩn nhỏ nhất, đúng vì C đủ hạng)."""
    A, b, tm, ts = (np.asarray(v, np.float64) for v in (A, b, tm, ts))
    C = ts[:, None] * A
    mu = -np.linalg.pinv(C) @ (ts * b + tm)
    return dict(mu=mu.tolist(), comps=C.tolist(), lo=list(map(float, lo)), hi=list(map(float, hi)),
                kieu="dau_ra_chung_s2", ghi_chu="thành phần theo thang phép chiếu g7 của S2")


def dau_ra_ab(h):
    """Trọng số (A (6, dim), b (6,)) của đầu ra 1 × 1: nhận module torch hoặc state_dict đã lưu trong ckpt."""
    sd = h.state_dict() if hasattr(h, "state_dict") else h
    W = sd["weight"]; B = sd["bias"]
    W = W.detach().cpu().numpy() if hasattr(W, "detach") else np.asarray(W)
    B = B.detach().cpu().numpy() if hasattr(B, "detach") else np.asarray(B)
    return W.reshape(W.shape[0], W.shape[1]), B.reshape(-1)


def tim_lop_g7(man, ten="g7"):
    """Hai lớp embedding S2 (thành phần 1-3 và 4-6) và đường dẫn phép chiếu trong manifest. Bỏ lớp Landsat (nguon 'ls')."""
    import re as _re
    ds = [l for l in man.get("layers", []) if l.get("kieu") == "rgb" and l.get("phep_chieu") and l.get("nguon") != "ls"]
    nhom = {}
    for l in ds:
        m = _re.match(r"^Embedding (\S+?),", l.get("ten", ""))
        nhom.setdefault(m.group(1) if m else l["id"], []).append(l)
    if not nhom:
        return None
    ds = nhom.get(ten) or next(iter(nhom.values()))
    a = next((l for l in ds if "1-2-3" in l.get("ten", "")), None)
    b = next((l for l in ds if "4-5-6" in l.get("ten", "")), None)
    return (a, b, a["phep_chieu"]) if a and b else None


# --------------------------------------------------------------------------- đánh giá (numpy)
def r2_tuyen_tinh(Z, Y, ti_le_kiem=0.3, seed=0, alpha=1e-3):
    """Hồi quy ridge Z -> Y, R² trên phần để riêng, từng cột của Y. Z (N, d), Y (N, m)."""
    rng = np.random.default_rng(seed)
    ok = np.isfinite(Z).all(1) & np.isfinite(Y).all(1)
    Z, Y = Z[ok].astype(np.float64), Y[ok].astype(np.float64)
    p = rng.permutation(len(Z)); n_k = int(len(Z) * ti_le_kiem)
    k, h = p[:n_k], p[n_k:]
    zm, zs = Z[h].mean(0), Z[h].std(0) + 1e-9
    A = np.c_[(Z[h] - zm) / zs, np.ones(len(h))]
    B = np.linalg.solve(A.T @ A + alpha * np.eye(A.shape[1]), A.T @ Y[h])
    P_ = np.c_[(Z[k] - zm) / zs, np.ones(len(k))] @ B
    ss = ((Y[k] - Y[k].mean(0)) ** 2).sum(0)
    return (1 - ((Y[k] - P_) ** 2).sum(0) / np.maximum(ss, 1e-12)).tolist()


def on_dinh_theo_nam(Zn, Xn, nam, chuyen_cam_bien=(1999, 2013, 2022), q_on_dinh=0.25):
    """Zn: {năm: (N, d)} embedding tại CÙNG N điểm ảnh; Xn: {năm: (N, 6)} phản xạ chuẩn hoá z cùng điểm.
    Với mỗi cặp năm liền kề: điểm 'phổ ổn định' = |Δ phản xạ| thuộc q_on_dinh thấp nhất; đo trung vị |Δ embedding| (chuẩn
    hoá theo trung vị chung) trên điểm ổn định, và tương quan hạng Spearman giữa |Δ phổ| và |Δ embedding| trên mọi điểm.
    Bước chuyển cảm biến (1998->1999, 2012->2013, 2021->2022) được đánh dấu: trôi lớn bất thường ở đó là dấu hiệu lệch
    cảm biến lọt qua chuẩn hoá."""
    from scipy.stats import spearmanr
    ys = sorted(y for y in nam if y in Zn and y - 1 in Zn)
    dz_all = [np.linalg.norm(Zn[y] - Zn[y - 1], axis=1) for y in ys]
    thang = np.nanmedian(np.concatenate(dz_all)) if dz_all else 1.0
    rows = []
    for y, dz in zip(ys, dz_all):
        dx = np.linalg.norm(Xn[y] - Xn[y - 1], axis=1)
        ok = np.isfinite(dz) & np.isfinite(dx)
        if ok.sum() < 20:
            continue
        nguong = np.quantile(dx[ok], q_on_dinh)
        on = ok & (dx <= nguong)
        rows.append(dict(cap=f"{y - 1}-{y}", nam=y, so_diem=int(ok.sum()),
                         dz_on_dinh=float(np.median(dz[on]) / thang), dz_tat_ca=float(np.median(dz[ok]) / thang),
                         spearman=float(spearmanr(dx[ok], dz[ok]).correlation), chuyen_cam_bien=y in chuyen_cam_bien))
    t = pd.DataFrame(rows)
    if len(t):
        nen = t.loc[~t.chuyen_cam_bien, "dz_on_dinh"]
        t["ti_so_voi_nen"] = t.dz_on_dinh / (np.median(nen) if len(nen) else np.nan)
    return t


# --------------------------------------------------------------------------- torch
def _P():
    import s2_pixlab as P
    return P


def tao_encoder(mom, cfg=None, device="cuda"):
    cfg = dict(CAU_HINH_EMB, **(cfg or {}))
    P = _P()
    net = P.build_arch(cfg["arch"], cfg["in_ch"], cfg["dim"], width=cfg["width"], dilations=tuple(cfg["dilations"]),
                       depth=cfg["depth"])
    enc = P.DenseEncoder(cfg["ten"], net, mom[0], mom[1], cfg["dim"]).to(device)
    enc.pad = int(cfg["pad"])
    return enc


def huan_luyen(enc, X, cfg=None, T=None):
    """Không chung_s2: đúng train_dense của s2_pixlab (mục tiêu tái dựng che 60 %). Có chung_s2 (T khác None): vòng lặp
    riêng = tái dựng như trên + w_s2 × smooth L1 giữa đầu ra 1 × 1 (64 -> 6) và mục tiêu S2 đã chuẩn hoá, chỉ ở điểm có
    mục tiêu. Trả về (lịch sử, đầu ra 1 × 1 hoặc None)."""
    cfg = dict(CAU_HINH_EMB, **(cfg or {}))
    P = _P()
    if T is None or not cfg["chung_s2"]:
        return P.train_dense(enc, X, objective=cfg["objective"], steps=cfg["steps"], bs=cfg["bs"], tile=cfg["tile"],
                             lr=cfg["lr"], mask_ratio=cfg["mask_ratio"], seed=cfg["seed"]), None
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    dev = enc.device
    rng = np.random.default_rng(cfg["seed"]); torch.manual_seed(cfg["seed"])
    gen = torch.Generator(device=dev); gen.manual_seed(cfg["seed"])
    Xg = torch.from_numpy(np.clip(X, -32767, 32767).astype(np.int16)).to(dev)
    Tg = torch.from_numpy(np.asarray(T, np.float16)).to(dev)
    co_t = np.isfinite(np.asarray(T[:, 0, ::8, ::8], np.float32)).mean((1, 2)) > 0.5
    i_t, i_k = np.nonzero(co_t)[0], np.arange(len(X))
    dec = nn.Sequential(nn.Conv2d(enc.dim, 64, 3, padding=1), nn.GELU(), nn.Conv2d(64, X.shape[1], 1)).to(dev)
    head = nn.Conv2d(enc.dim, T.shape[1], 1).to(dev)
    params = list(enc.net.parameters()) + list(dec.parameters()) + list(head.parameters())
    opt = torch.optim.AdamW(params, lr=cfg["lr"], weight_decay=1e-4)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=cfg["lr"], total_steps=cfg["steps"], pct_start=0.1)
    Pp, tile, bs = X.shape[-1], cfg["tile"], cfg["bs"]
    hist, t0 = [], time.time()
    enc.net.train()
    for step in range(1, cfg["steps"] + 1):
        nt = bs // 2 if len(i_t) else 0                                    # nửa lô là mảnh có mục tiêu S2
        idx = np.r_[rng.choice(i_t, nt), rng.choice(i_k, bs - nt)].astype(int)
        y0 = rng.integers(0, Pp - tile + 1, bs); x0 = rng.integers(0, Pp - tile + 1, bs)
        xb = torch.stack([Xg[i, :, a:a + tile, b:b + tile] for i, a, b in zip(idx, y0, x0)])
        tb = torch.stack([Tg[i, :, a:a + tile, b:b + tile] for i, a, b in zip(idx, y0, x0)]).float()
        x = enc.norm(xb)
        mask = P.make_mask(bs, tile, tile, cfg["mask_ratio"], dev, gen)
        z_m = enc.net(x * (1 - mask))
        rec = (F.smooth_l1_loss(dec(z_m), x, reduction="none") * mask).sum() / (mask.sum() * x.shape[1] + 1e-6)
        z = enc.net(x)
        vt = torch.isfinite(tb).all(1, keepdim=True).float()
        dis = (F.smooth_l1_loss(head(z), torch.nan_to_num(tb), reduction="none") * vt).sum() / (vt.sum() * tb.shape[1] + 1e-6)
        loss = rec + cfg["w_s2"] * dis
        opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(params, 1.0); opt.step(); sch.step()
        hist.append(dict(step=step, loss=float(loss.detach()), rec=float(rec.detach()), s2=float(dis.detach())))
        if step % 100 == 0 or step == cfg["steps"]:
            print(f"    [{enc.name}/recon+s2] {step}/{cfg['steps']} loss {hist[-1]['loss']:.3f} rec {hist[-1]['rec']:.3f} "
                  f"s2 {hist[-1]['s2']:.3f} ({time.time() - t0:.0f}s)")
    enc.net.eval(); head.eval()
    return hist, head


def luu_ckpt(enc, path, cfg, mom, head=None, them=None):
    import torch
    cfg = dict(CAU_HINH_EMB, **(cfg or {}))
    st = dict(state_dict=enc.net.state_dict(), mean=list(mom[0]), std=list(mom[1]), pad=enc.pad,
              cfg={k: cfg[k] for k in ("arch", "in_ch", "dim", "width", "dilations", "depth", "objective", "steps",
                                       "chung_s2", "ten")},
              bang=TEN_BANG, chuan_hoa="chung mọi năm", phien_ban_ma=__version__, them=them or {})
    if head is not None:
        st["head"] = {k: v.detach().cpu() for k, v in head.state_dict().items()}
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    torch.save(st, path + ".part"); os.replace(path + ".part", path)
    return path


def nap_ckpt(path, device="cuda"):
    import torch
    st = torch.load(path, map_location="cpu", weights_only=False)
    c = st["cfg"]
    enc = tao_encoder((st["mean"], st["std"]), dict(c, pad=st.get("pad", 12)), device=device)
    enc.net.load_state_dict(st["state_dict"]); enc.net.eval()
    return enc, st


def embed_anh(enc, a6, ok, tile=1024, device=None, half=True):
    """(6, H, W) int16 + mặt nạ -> (dim, H, W) float16, NaN ngoài vùng hợp lệ. Chia ô có lề enc.pad, đệm đối xứng
    (như bản đồ g7). Điểm không hợp lệ được điền trung bình chung trước khi vào mạng để không làm méo hàng xóm.
    Lớp GRN chuẩn hoá theo cả ô nên kết quả phụ thuộc cỡ ô: lấy mẫu, phép chiếu và bản đồ đều dùng CÙNG tile (1024)."""
    import torch
    dev = device or enc.device
    pad = int(enc.pad)
    mean = np.asarray(enc.mean.detach().cpu()).reshape(-1)
    a = np.where(ok[None], a6, mean[:, None, None].astype(np.float32)).astype(np.float32)
    H, W = ok.shape
    out = np.full((enc.dim, H, W), np.nan, np.float16)
    use_amp = str(dev).startswith("cuda") and torch.cuda.is_available()
    enc.net.eval()
    for r0 in range(0, H, tile):
        for c0 in range(0, W, tile):
            th, tw = min(tile, H - r0), min(tile, W - c0)
            ra, rb, ca, cb = max(0, r0 - pad), min(H, r0 + th + pad), max(0, c0 - pad), min(W, c0 + tw + pad)
            blk = a[:, ra:rb, ca:cb]
            p_ = ((0, 0), (pad - (r0 - ra), pad - (rb - r0 - th)), (pad - (c0 - ca), pad - (cb - c0 - tw)))
            blk = np.pad(blk, p_, mode="symmetric")
            with torch.inference_mode():
                x = enc.norm(torch.from_numpy(blk[None]).to(dev))
                if use_amp:
                    with torch.autocast("cuda", dtype=torch.float16):
                        z = enc.net(x)
                else:
                    z = enc.net(x)
                z = z.float()[0, :, pad:pad + th, pad:pad + tw]
                if half:
                    z = z.half()
            out[:, r0:r0 + th, c0:c0 + tw] = z.cpu().numpy().astype(np.float16)
    out[:, ~ok] = np.nan
    return out


def mau_z(enc, tep_theo_nam, n_moi_nam=8000, seed=0, rr_cc=None):
    """Embedding tại điểm ảnh ngẫu nhiên, cùng số điểm mỗi năm (hoặc tại đúng rr_cc cho mọi năm).
    Trả về (Z (N, dim), X6 (N, 6) DN, mảng năm (N,))."""
    rng = np.random.default_rng(seed)
    Zs, Xs, Ys = [], [], []
    for y, t in sorted(tep_theo_nam.items()):
        a, ok = doc_6(t)
        z = embed_anh(enc, a, ok)
        if rr_cc is None:
            rr, cc = np.nonzero(ok)
            j = rng.choice(len(rr), min(n_moi_nam, len(rr)), replace=False)
            rr, cc = rr[j], cc[j]
        else:
            rr, cc = rr_cc
        Zs.append(z[:, rr, cc].T.astype(np.float32)); Xs.append(np.where(ok[rr, cc][:, None], a[:, rr, cc].T, np.nan))
        Ys.append(np.full(len(rr), int(y)))
    return np.concatenate(Zs), np.concatenate(Xs).astype(np.float32), np.concatenate(Ys)


def ghi_chieu(enc, tep, out, proj, tile=1024):
    """Ảnh chiếu uint8 n băng (1..255, 0 = trống) trên CÙNG lưới 30 m của ảnh vào (để dựng lsg, lsgb bằng rgb_cog_nhom)."""
    import rasterio
    from s2_hf_lop import quantize
    a, ok = doc_6(tep)
    z = embed_anh(enc, a, ok, tile=tile).astype(np.float32)
    mu, C = np.asarray(proj["mu"], np.float32), np.asarray(proj["comps"], np.float32)
    y = np.tensordot(C, z - mu[:, None, None], axes=(1, 0))
    q = quantize(y, proj["lo"], proj["hi"])
    q[:, ~(ok & np.isfinite(y).all(0))] = 0
    with rasterio.open(tep) as d:
        prof = dict(driver="GTiff", width=d.width, height=d.height, count=q.shape[0], dtype="uint8", crs=d.crs,
                    transform=d.transform, nodata=0, tiled=True, blockxsize=256, blockysize=256, compress="deflate")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with rasterio.open(out, "w", **prof) as o:
        o.write(q)
    return out, z


def self_test(device=None):
    """Chạy trên Colab (có torch): mảnh giả, huấn luyện vài bước cả hai chế độ, nhúng ảnh, phép chiếu đầu ra."""
    import torch
    dev = device or ("cuda" if torch.cuda.is_available() else "cpu")
    rng = np.random.default_rng(0)
    X = (rng.normal(1500, 400, (16, 6, 64, 64))).astype(np.int16)
    mom = (X.reshape(16, 6, -1).transpose(1, 0, 2).reshape(6, -1).mean(1).tolist(),
           X.reshape(16, 6, -1).transpose(1, 0, 2).reshape(6, -1).std(1).tolist())
    cfg = dict(steps=6, bs=4, tile=32, width=8, dim=16)
    enc = tao_encoder(mom, cfg, dev)
    h, _ = huan_luyen(enc, X, cfg)
    assert len(h) == 6 and np.isfinite(h[-1]["loss"])
    T = rng.normal(0, 1, (16, 6, 64, 64)).astype(np.float16); T[8:] = np.nan
    enc2 = tao_encoder(mom, cfg, dev)
    h2, head = huan_luyen(enc2, X, dict(cfg, chung_s2=True), T=T)
    assert head is not None and np.isfinite(h2[-1]["s2"])
    a6 = X[0, :, :50, :40]; ok = np.ones((50, 40), bool); ok[:3] = False
    z = embed_anh(enc2, a6, ok, tile=24)
    assert z.shape == (16, 50, 40) and np.isnan(z[:, 0]).all() and np.isfinite(z[:, 10]).all()
    z2 = embed_anh(enc2, a6, ok, tile=24)
    assert np.array_equal(np.nan_to_num(z), np.nan_to_num(z2)), "nhúng hai lần khác nhau"
    A = head.weight.detach().cpu().numpy()[:, :, 0, 0]; b = head.bias.detach().cpu().numpy()
    pj = dau_ra_thanh_phep_chieu(A, b, [0.0] * 6, [1.0] * 6, [-3] * 6, [3] * 6)
    zz = z[:, 10, 5].astype(np.float64)
    y1 = np.asarray(pj["comps"]) @ (zz - np.asarray(pj["mu"]))
    y2 = A @ zz + b
    assert np.allclose(y1, y2, atol=1e-4)
    print("ls_embed self_test: ĐẠT (", dev, ")")
    return True
