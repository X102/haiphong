# =============================================================================
# LANDSAT 1987-2026: PCA phổ CHUỖI NĂM với MỘT bộ hệ số chung cho mọi năm (như PCA của S2 trong pcats)
#   Đầu vào: ảnh mùa khô 30 m ĐÃ chuẩn hoá tương đối (ls_landsat: chuan_hoa_anh / ls_gee, rồi ap_chuan_hoa IR-MAD),
#            10 băng BLUE..SWIR2 (×10000), TEMP, NOBS, NGUON, CAMBIEN.
#   Đặc trưng mỗi điểm ảnh: 6 băng phản xạ + NDVI, MNDWI, NDBI (9 chiều).
#   Khớp: cùng một bộ điểm ảnh ngẫu nhiên cho mọi năm (như bộ điểm cố định của pcats), chỉ dùng điểm NGUON ≤ 1
#         (≥ 2 lần quan sát trong mùa), bỏ năm trong nam_khong_fit; chọn số PC bằng 7 tiêu chí không nhãn của
#         pca_ts_py.phan_tich_so_pc và (nếu có) độ chính xác phân loại 3 lớp tại điểm có nhãn (tiêu chí 8).
#   Vì sao KHÔNG làm PCA nhiều kỳ trong năm cho Landsat: trước 2013 chỉ có một hoặc hai cảm biến 16 ngày, mùa mưa ở
#   Hải Phòng gần như luôn có mây, nên kỳ mùa mưa phần lớn phải nội suy; PC khi đó phản ánh mật độ ảnh của từng thời
#   kỳ hơn là mặt đất. Ảnh mùa khô có ở mọi năm, đã chuẩn hoá chéo cảm biến, nên PC so được giữa 1987 và 2026.
#   (PCA nhiều kỳ Landsat bản cũ vẫn có trong pcats, cấu hình "LS", cho ai cần đường mùa vụ và chấp nhận NFILL cao.)
# Sản phẩm: lspc_{năm}.tif (k PC × 100, int16, lưới 30 m gốc S2) + ảnh xám COG 3857 từng PC cho geoportal.
# =============================================================================
import os, json, time
import numpy as np
import pandas as pd

from ls_landsat import TEN_BANG, NODATA, HE_SO, CRS

__version__ = "1.0"
DAC_TRUNG = TEN_BANG + ["NDVI", "MNDWI", "NDBI"]
CHI_SO = {"NDVI": ("NIR", "RED"), "MNDWI": ("GREEN", "SWIR1"), "NDBI": ("SWIR1", "NIR")}
CAU_HINH_LSPCA = dict(
    ten="Landsat mùa khô 30 m, đã chuẩn hoá tương đối (IR-MAD), PCA phổ chuỗi năm",
    ky=[[11, 4]], dac_trung=DAC_TRUNG,
    nam_khong_fit=[2012],          # mùa khô 2012 chỉ còn ETM+ SLC-off: khe dữ liệu lớn, không dùng để khớp
    nfill_max_fit=0,               # NFILL := 1 khi NGUON là 2 hoặc 3 (một lần quan sát, mượn năm lân cận)
    k_xet=9, k_geoportal=5, so_diem_moi_nam=6000, hat_giong=20261001)


def ten_cot(cfg=None):
    """Tên cột theo quy ước pca_ts_py (đặc trưng_p01): dùng lại được mọi hàm khớp và chọn k của pcats."""
    cfg = cfg or CAU_HINH_LSPCA
    return [f"{f}_p01" for f in cfg["dac_trung"]]


def dac_trung(sr):
    """sr: (6, ...) phản xạ (đơn vị 0..1, float). Trả về (9, ...): 6 băng + NDVI, MNDWI, NDBI.
    Chỉ số = (a - b) / (a + b), cắt [-1, 1]; mẫu số gần 0 cho 0 (như _nd của pcats, không che nước có phản xạ âm)."""
    sr = np.asarray(sr, np.float64)
    out = [sr[i] for i in range(6)]
    for ten, (a, b) in CHI_SO.items():
        x, y = sr[TEN_BANG.index(a)], sr[TEN_BANG.index(b)]
        s = x + y
        with np.errstate(all="ignore"):
            v = np.where(np.abs(s) > 1e-6, (x - y) / s, 0.0)
        out.append(np.clip(v, -1, 1))
    return np.stack(out)


# --------------------------------------------------------------------------- lấy mẫu
def chon_diem(tep_mau, n, seed, mask=None, toi_thieu_nam=None, tep_theo_nam=None):
    """Bộ điểm ảnh (hàng, cột) ngẫu nhiên CỐ ĐỊNH, dùng chung mọi năm (ảnh mọi năm cùng lưới).
    mask: mảng bool (ranh giới) cùng cỡ ảnh; None = mọi điểm có dữ liệu ở tep_mau."""
    import rasterio
    with rasterio.open(tep_mau) as d:
        H, W = d.height, d.width
        a = d.read(1)
    ok = (a != NODATA) if mask is None else (mask & (a != NODATA))
    rr, cc = np.nonzero(ok)
    rng = np.random.default_rng(seed)
    j = np.sort(rng.choice(len(rr), min(n, len(rr)), replace=False))
    return rr[j], cc[j], (H, W)


def doc_diem(tep, rr, cc):
    """Giá trị 10 băng tại các điểm ảnh (đọc theo khối hàng, không nạp cả ảnh)."""
    import rasterio
    from rasterio.windows import Window
    with rasterio.open(tep) as d:
        out = np.full((d.count, len(rr)), NODATA, np.int32)
        o = np.argsort(rr)
        r_s, c_s = rr[o], cc[o]
        for r0 in range(0, d.height, 1024):
            sel = (r_s >= r0) & (r_s < r0 + 1024)
            if not sel.any():
                continue
            h = min(1024, d.height - r0)
            a = d.read(window=Window(0, r0, d.width, h))
            out[:, o[sel]] = a[:, r_s[sel] - r0, c_s[sel]]
    return out


def bang_mau(tep, rr, cc, nam):
    """DataFrame theo quy ước pcats: cột đặc trưng_p01, NOBS, NFILL, NGUON, CAMBIEN, system:index (mã điểm ảnh)."""
    a = doc_diem(tep, rr, cc)
    hop = (a[:6] != NODATA).all(0)
    sr = a[:6].astype(np.float64) / HE_SO
    f = dac_trung(sr)
    df = pd.DataFrame(f.T, columns=ten_cot())
    df.loc[~hop, :] = np.nan
    ng = a[8].astype(float); ng[a[8] == NODATA] = np.nan
    df["NOBS"] = np.where(a[7] == NODATA, np.nan, a[7])
    df["NGUON"] = ng
    df["NFILL"] = np.where(np.isnan(ng), 9, np.isin(ng, (2, 3)).astype(int))     # NGUON 9 (ảnh có sẵn, phương án A): dùng được
    df["CAMBIEN"] = np.where(a[9] == NODATA, 0, a[9])
    df["system:index"] = [f"r{r}c{c}" for r, c in zip(rr, cc)]
    df["nam"] = int(nam)
    return df


def lay_mau(tep_theo_nam, n=None, seed=None, mask=None, nam_mau=None):
    """{năm: tệp} -> {năm: DataFrame}, cùng bộ điểm ảnh. Bộ điểm rút từ năm nam_mau (mặc định năm có nhiều dữ liệu nhất)."""
    cfg = CAU_HINH_LSPCA
    n, seed = n or cfg["so_diem_moi_nam"], seed or cfg["hat_giong"]
    nam_mau = nam_mau or _nam_day_du(tep_theo_nam)
    rr, cc, _ = chon_diem(tep_theo_nam[nam_mau], n, seed, mask)
    out = {}
    for y, t in sorted(tep_theo_nam.items()):
        out[int(y)] = bang_mau(t, rr, cc, y)          # điểm thiếu dữ liệu ở năm y: NaN, NFILL = 9 (không dùng để khớp)
    return out


def _nam_day_du(tep_theo_nam):
    import rasterio
    tot, best = -1, None
    for y, t in tep_theo_nam.items():
        with rasterio.open(t) as d:
            k = max(1, min(d.width, d.height) // 400)
            a = d.read(1, out_shape=(d.height // k, d.width // k))
        v = float((a != NODATA).mean())
        if v > tot:
            tot, best = v, y
    return best


# --------------------------------------------------------------------------- khớp, chọn k (dùng lại pca_ts_py)
def khop(mau_theo_nam, P, cfg=None):
    """P: module pca_ts_py. Trả về hệ số ĐỦ mọi thành phần (chưa chốt k)."""
    cfg = cfg or CAU_HINH_LSPCA
    hs = P.khop_pca(mau_theo_nam, dict(cfg, ma_cau_hinh=ma_cau_hinh(cfg)), "LSPCA")
    hs["dac_trung"] = cfg["dac_trung"]
    hs["don_vi"] = "phản xạ 0..1 và chỉ số -1..1, chuẩn hoá z theo mean/std chung"
    return hs


def ma_cau_hinh(cfg=None):
    import hashlib
    cfg = cfg or CAU_HINH_LSPCA
    d = {k: cfg[k] for k in ("dac_trung", "nam_khong_fit", "nfill_max_fit")}
    return hashlib.md5(json.dumps(d, sort_keys=True).encode()).hexdigest()[:6]


def pc_tu_mau(df, hs):
    """PC (N, k) của DataFrame mẫu."""
    Z = (df[hs["bang"]].to_numpy(np.float64) - np.asarray(hs["mean"])) / np.asarray(hs["std"])
    return Z @ np.asarray(hs["W"]).T


def troi_theo_cam_bien(mau_theo_nam, hs):
    """Trung bình PC theo năm VÀ cảm biến chủ đạo (để thấy bước nhảy khi đổi cảm biến: 1999, 2013, 2022).
    Chỉ điểm có dữ liệu ở mọi năm; cột 'buoc_nhay_PCj' = chênh so với năm trước, chia độ lệch chuẩn PCj."""
    rows = []
    ten = hs["bang"]
    chung = None
    for y, df in mau_theo_nam.items():
        s = set(df.loc[df[ten].notna().all(1), "system:index"])
        chung = s if chung is None else chung & s
    sd = None
    for y, df in sorted(mau_theo_nam.items()):
        dd = df[df["system:index"].isin(chung)]
        if not len(dd):
            continue
        Pc = pc_tu_mau(dd, hs)
        if sd is None:
            sd = Pc.std(0) + 1e-9
        cb = int(np.bincount(dd.CAMBIEN.astype(int)).argmax())
        r = dict(nam=int(y), so_diem=len(dd), cam_bien_chu_dao=cb, ti_le_nguon_ge2=float((dd.NGUON >= 2).mean()))
        for j in range(min(5, Pc.shape[1])):
            r[f"PC{j + 1}_tb"] = float(Pc[:, j].mean())
        rows.append(r)
    t = pd.DataFrame(rows)
    for j in range(min(5, len(hs["W"]))):
        c = f"PC{j + 1}_tb"
        if c in t:
            t[f"buoc_nhay_PC{j + 1}"] = t[c].diff() / sd[j]
    return t


# --------------------------------------------------------------------------- điểm có nhãn (tiêu chí 8)
def mau_tai_diem_nhan(tep_theo_nam, diem_nhan):
    """diem_nhan: list dict (pid, lon, lat, nam, cls, nguon) như pca_ts_py.lap_diem_nhan. Đọc đặc trưng Landsat tại điểm
    trong đúng năm. Trả về DataFrame có cột đặc trưng_p01, cls, nguon, nam, lon, lat."""
    import rasterio
    from pyproj import Transformer
    d = pd.DataFrame(diem_nhan)
    tr = Transformer.from_crs(4326, CRS, always_xy=True)
    x, y = tr.transform(d.lon.values, d.lat.values)
    d["x"], d["y"] = x, y
    rows = []
    for nam, g in d.groupby("nam"):
        t = tep_theo_nam.get(int(nam))
        if t is None:
            continue
        with rasterio.open(t) as ds:
            r, c = rasterio.transform.rowcol(ds.transform, g.x.values, g.y.values)
            r, c = np.asarray(r), np.asarray(c)
            trong = (r >= 0) & (r < ds.height) & (c >= 0) & (c < ds.width)
        a = np.full((10, len(g)), NODATA)
        if trong.any():
            a[:, trong] = doc_diem(t, r[trong], c[trong])
        hop = (a[:6] != NODATA).all(0)
        f = dac_trung(a[:6].astype(float) / HE_SO)
        df = pd.DataFrame(f.T, columns=ten_cot())
        df.loc[~hop, :] = np.nan
        for k in ("cls", "nguon", "nam", "lon", "lat", "pid"):
            df[k] = g[k].values
        rows.append(df)
    return pd.concat(rows, ignore_index=True) if rows else pd.DataFrame()


# --------------------------------------------------------------------------- áp hệ số lên ảnh
def ap_anh(tep, out, hs, k=None, rows=512):
    """Ảnh mùa khô 10 băng -> k PC × he_so_nhan (int16), nodata -32768, CÙNG lưới. Thêm băng NGUON để biết độ tin."""
    import rasterio
    from rasterio.windows import Window
    k = int(k or hs["k"])
    W_ = np.asarray(hs["W"])[:k]
    mu, sd = np.asarray(hs["mean"]), np.asarray(hs["std"])
    nhan = float(hs.get("he_so_nhan", 100))
    with rasterio.open(tep) as d:
        prof = d.profile.copy()
        prof.update(count=k + 1, dtype="int16", nodata=NODATA, compress="deflate", predictor=2, tiled=True,
                    blockxsize=256, blockysize=256, BIGTIFF="IF_SAFER")
        prof.pop("photometric", None)
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        with rasterio.open(out, "w", **prof) as o:
            for r0 in range(0, d.height, rows):
                h = min(rows, d.height - r0)
                win = Window(0, r0, d.width, h)
                a = d.read(window=win)
                hop = (a[:6] != NODATA).all(0)
                f = dac_trung(a[:6].astype(np.float64) / HE_SO).reshape(len(DAC_TRUNG), -1)
                z = (f - mu[:, None]) / sd[:, None]
                pc = (W_ @ z).reshape(k, h, d.width)
                ra = np.clip(np.round(pc * nhan), -32767, 32767).astype(np.int16)
                ra[:, ~hop] = NODATA
                ng = a[8].astype(np.int16); ng[~hop] = NODATA
                o.write(np.concatenate([ra, ng[None]]), window=win)
            o.descriptions = tuple([f"PC{j:02d}" for j in range(1, k + 1)] + ["NGUON"])
            o.update_tags(ma_he_so=hs.get("ma", ""), he_so_nhan=str(nhan), dac_trung=",".join(DAC_TRUNG))
    return out


def keo_gian_pc(mau_theo_nam, hs, k=None, p=98):
    """Kéo giãn chung mọi năm cho ảnh xám PC (đỏ +, xanh −, trắng 0): [lo, hi] = [-m, +m], m = phân vị p của |PC|
    (đơn vị PC × he_so_nhan, như trường keo_gian của lớp pc1..5 của S2)."""
    k = int(k or hs["k"])
    X = np.vstack([pc_tu_mau(df[df[hs["bang"]].notna().all(1)], hs)[:, :k] for df in mau_theo_nam.values()])
    m = np.percentile(np.abs(X), p, axis=0) * float(hs.get("he_so_nhan", 100))
    return {q + 1: [int(-round(m[q])), int(round(m[q]))] for q in range(k)}


def muc_manifest_lspc(hs, nam, kg):
    """Mục 'lspc' của manifest: đủ để trang tính PC từ giá trị phản xạ tại điểm và vẽ đường năm."""
    return dict(duong_dan="lspc/lspc_{y}.tif", nam=sorted(int(y) for y in nam), k=int(hs["k"]),
                dac_trung=hs.get("dac_trung", DAC_TRUNG), mean=hs["mean"], std=hs["std"], W=hs["W"],
                ti_le=hs.get("ti_le", [])[:int(hs["k"])], he_so_nhan=hs.get("he_so_nhan", 100), keo_gian=kg,
                ma=hs.get("ma", ""), ly_do_chon_k=hs.get("ly_do_chon_k", ""), phien_ban_ma=__version__,
                ghi_chu="PCA phổ, một bộ hệ số cho mọi năm, trên ảnh mùa khô đã chuẩn hoá tương đối")
