# =============================================================================
# LANDSAT 1987-2026 CHO GEOPORTAL HẢI PHÒNG: phần Python thuần (không cần Earth Engine, không cần GPU)
#   ① kiểm kê ảnh Landsat có sẵn trên Drive (loại tệp, hệ toạ độ, thang giá trị, độ phủ ranh giới, mùa);
#   ② phương án A: chuẩn hoá ảnh tổng hợp có sẵn (HP-YYYY-Mosaic.tif) về lưới 30 m của geoportal;
#   ③ chuẩn hoá bức xạ tương đối bằng IR-MAD (Canty & Nielsen 2008) về một ảnh tham chiếu chung;
#   ④ cầu nối Landsat - Sentinel-2 trên các năm chung (chẩn đoán, không sửa ảnh);
#   ⑤ COG, ảnh xem nhanh, kéo giãn cố định, mục manifest, đẩy lên Hugging Face.
# Lưới: EPSG:32648, ô 30 m, CÙNG GỐC với lưới 10 m của ảnh S2_HP_{năm}: mỗi điểm ảnh Landsat trùng khít 3 × 3 điểm ảnh S2.
# =============================================================================
import os, re, glob, json, math, time, hashlib
import numpy as np

__version__ = "1.0"
CRS = "EPSG:32648"
GOC_LUOI = (615610.0, 2352020.0)          # gốc lưới của ảnh tổng hợp S2_HP_{năm} (giống pcats/pca_ts_py.py)
RES = 30.0
TEN_BANG = ["BLUE", "GREEN", "RED", "NIR", "SWIR1", "SWIR2"]
BANG_S2 = ["B2", "B3", "B4", "B8", "B11", "B12"]       # tên băng S2 tương đương: geoportal dùng chung công thức chỉ số
BANG_PHU = ["TEMP", "NOBS", "NGUON", "CAMBIEN"]
BANG_RA = TEN_BANG + BANG_PHU
NODATA = -32768
HE_SO = 10000                              # phản xạ × 10000 (như DN của S2 L2A)
HE_SO_T = 100                              # nhiệt độ bề mặt °C × 100
# cờ cảm biến (băng CAMBIEN, cộng bit)
BIT_CB = {"L4": 1, "L5": 1, "L7": 2, "L8": 4, "L9": 8}
# cờ cửa sổ thời gian (băng NGUON): 0 mùa khô đúng năm, 1 mùa khô nới (10 → 5), 2 một ảnh trong mùa,
# 3 mượn mùa khô năm trước và năm sau, 9 ảnh có sẵn không rõ cửa sổ (phương án A)
NGUON_TEN = {0: "mùa khô đúng năm (≥ 2 ảnh)", 1: "mùa khô nới tháng 10 đến 5 (≥ 2 ảnh)", 2: "chỉ một ảnh trong mùa",
             3: "mượn mùa khô năm trước và sau", 9: "ảnh có sẵn, không rõ cửa sổ"}
ALIAS = {"BLUE": ["BLUE", "B", "SR_B1_TM", "B1_TM"], "GREEN": ["GREEN", "G"], "RED": ["RED", "R"], "NIR": ["NIR", "N"],
         "SWIR1": ["SWIR1", "SWIR_1", "S1"], "SWIR2": ["SWIR2", "SWIR_2", "S2"], "TEMP": ["TEMP", "ST", "LST", "TEMPERATURE"],
         "NOBS": ["CLEAR_COUNT", "NOBS", "COUNT", "N_OBS", "CLEARCOUNT"]}


# --------------------------------------------------------------------------- ① lưới
def khung_luoi(bounds, res=RES, goc=GOC_LUOI):
    """Khung chữ nhật phủ `bounds` (EPSG:32648) và nằm đúng mép điểm ảnh của lưới gốc."""
    x0, y0 = goc
    xmin, ymin, xmax, ymax = bounds
    c0, c1 = math.floor((xmin - x0) / res), math.ceil((xmax - x0) / res)
    r0, r1 = math.floor((y0 - ymax) / res), math.ceil((y0 - ymin) / res)
    return dict(ct=[float(res), 0.0, x0, 0.0, -float(res), y0],
                khung=[x0 + c0 * res, y0 - r1 * res, x0 + c1 * res, y0 - r0 * res],
                rong=int(c1 - c0), cao=int(r1 - r0), cot0=int(c0), hang0=int(r0), res=float(res))


def luoi_tu_ranh(ranh, vien_m=500.0, res=RES):
    """ranh: GeoDataFrame / GeoSeries / hình shapely (EPSG:4326 hoặc có crs) -> lưới 30 m phủ ranh giới nới vien_m."""
    import geopandas as gpd
    if hasattr(ranh, "to_crs"):
        g = ranh.to_crs(CRS)
        hinh = g.union_all() if hasattr(g, "union_all") else g.unary_union
    else:
        hinh = gpd.GeoSeries([ranh], crs=4326).to_crs(CRS).iloc[0]
    return khung_luoi(hinh.buffer(vien_m).bounds, res)


def transform_luoi(L):
    from rasterio.transform import from_origin
    return from_origin(L["khung"][0], L["khung"][3], L["res"], L["res"])


# --------------------------------------------------------------------------- ② kiểm kê
_CANH = re.compile(r"(L[TEC]0[4-9])_(L1TP|L1GT|L1GS|L2SP|L2SR)_(\d{3})(\d{3})_(\d{8})_(\d{8})_(\d{2})_(T1|T2|RT)", re.I)


def nhan_dang_ten(path):
    """Nhận dạng tệp theo tên: cảnh USGS (cảm biến, mức xử lý, hàng-cột, ngày, collection, tier) hoặc ảnh tổng hợp năm."""
    ten = os.path.basename(path)
    m = _CANH.search(ten)
    if m:
        vt = {"LT04": "L4", "LT05": "L5", "LE07": "L7", "LC08": "L8", "LC09": "L9"}.get(m.group(1).upper(), m.group(1))
        return dict(kieu="canh", cam_bien=vt, muc=m.group(2).upper(), path=int(m.group(3)), row=int(m.group(4)),
                    ngay=m.group(5), collection=int(m.group(7)), tier=m.group(8).upper(), nam=int(m.group(5)[:4]))
    ys = [int(x) for x in re.findall(r"(?<!\d)((?:19[89]\d|20[0-3]\d))(?!\d)", ten)]
    return dict(kieu="tong_hop_nam" if ys else "khac", nam=ys[0] if ys else None)


def chi_so_bang(mo_ta, so_bang):
    """{tên chuẩn: chỉ số 1-based} từ mô tả băng; không có mô tả thì theo thứ tự B,G,R,NIR,SWIR1,SWIR2,[TEMP],[NOBS]."""
    d = [str(x or "").strip().upper() for x in (mo_ta or [])]
    out = {}
    for k, al in ALIAS.items():
        for i, x in enumerate(d):
            if x in al:
                out[k] = i + 1; break
    if not all(k in out for k in TEN_BANG):
        if so_bang >= 6:
            out = {k: i + 1 for i, k in enumerate(TEN_BANG)}
            if so_bang >= 7: out["TEMP"] = 7
            if so_bang >= 8: out["NOBS"] = 8
    return out


def kieu_gia_tri(mau_nir, dtype):
    """Thang giá trị của băng phản xạ (lấy từ NIR): 'phan_xa' (0..1), 'dn_c2' (DN Collection 2, 7273..43636),
    'x10000' (phản xạ × 10000) hoặc 'khong_ro'."""
    v = np.asarray(mau_nir, float); v = v[np.isfinite(v)]
    if not len(v):
        return "khong_ro"
    p50, p98 = np.percentile(v, 50), np.percentile(v, 98)
    if str(dtype).startswith("float") and p98 < 2.0:
        return "phan_xa"
    if 7000 <= p50 <= 25000 and p98 < 45000:
        return "dn_c2"
    if 300 <= p98 <= 12000:
        return "x10000"
    return "khong_ro"


def ve_phan_xa(a, kieu):
    """Mảng giá trị gốc -> phản xạ (float)."""
    a = np.asarray(a, np.float32)
    if kieu == "phan_xa":
        return a
    if kieu == "dn_c2":
        return a * 0.0000275 - 0.2
    if kieu == "x10000":
        return a / 10000.0
    raise ValueError(f"không rõ thang giá trị ({kieu})")


def _doc_thu_nho(ds, bands, max_canh=600):
    k = max(1, int(math.ceil(max(ds.width, ds.height) / max_canh)))
    a = ds.read(bands, out_shape=(len(bands), max(1, ds.height // k), max(1, ds.width // k)), masked=True).astype(np.float64)
    return a.filled(np.nan), k


def kiem_ke(thu_muc, ranh=None, mau="**/*.tif", bao_cao_gee=None, in_ra=True):
    """
    Kiểm kê mọi GeoTIFF Landsat trong thư mục (đệ quy). Mỗi dòng: tệp, loại, năm, hệ toạ độ, cỡ điểm ảnh (m),
    số băng và tên băng, kiểu dữ liệu, thang giá trị, phân vị phản xạ, nhiệt độ trung vị (dấu hiệu mùa), số lần quan
    sát, độ phủ ranh giới (khung và dữ liệu hợp lệ), cảnh báo. `ranh`: GeoDataFrame ranh giới Hải Phòng mới.
    `bao_cao_gee`: CSV báo cáo cảnh của GEE (như HP_Mosaic_Images_Report_*.csv) để đếm cảnh mùa khô theo năm.
    """
    import pandas as pd
    import rasterio
    from rasterio.warp import transform_geom
    from shapely.geometry import shape, box, mapping
    tep = sorted(set(glob.glob(os.path.join(thu_muc, mau), recursive=True)))
    tep = [t for t in tep if not t.lower().endswith((".aux.xml", ".ovr"))]
    hinh = None
    if ranh is not None:
        g = ranh.to_crs(4326) if hasattr(ranh, "to_crs") else ranh
        hinh = g.union_all() if hasattr(g, "union_all") else (g.unary_union if hasattr(g, "unary_union") else g)
    dong = []
    for t in tep:
        r = dict(tep=os.path.relpath(t, thu_muc), **nhan_dang_ten(t))
        try:
            with rasterio.open(t) as ds:
                r.update(crs=str(ds.crs), w=ds.width, h=ds.height, so_bang=ds.count, kieu_du_lieu=ds.dtypes[0],
                         nodata=ds.nodata, mo_ta=",".join(str(x) for x in (ds.descriptions or []) if x))
                if ds.crs and ds.crs.is_geographic:
                    lat = (ds.bounds.top + ds.bounds.bottom) / 2
                    r["res_m"] = round(abs(ds.transform.a) * 111320 * math.cos(math.radians(lat)), 1)
                else:
                    r["res_m"] = round(abs(ds.transform.a), 2)
                idx = chi_so_bang(ds.descriptions, ds.count)
                if all(k in idx for k in TEN_BANG):
                    a, k = _doc_thu_nho(ds, [idx[b] for b in TEN_BANG])
                    r["thang"] = kieu_gia_tri(a[3], ds.dtypes[0])
                    if r["thang"] != "khong_ro":
                        rf = ve_phan_xa(a, r["thang"])
                        hop = np.isfinite(rf).all(0)
                        if ds.nodata is not None:
                            hop &= ~(a == ds.nodata).any(0)
                        r["ti_le_hop_le"] = round(float(hop.mean()), 3)
                        for i, b in enumerate(TEN_BANG):
                            v = rf[i][hop]
                            if len(v):
                                r[f"{b}_p50"] = round(float(np.percentile(v, 50)), 4)
                        r["phan_xa_ngoai_0_1"] = round(float(((rf > 1.0) | (rf < -0.05)).any(0)[hop].mean()), 4) if hop.any() else None
                    if "TEMP" in idx:
                        tt, _ = _doc_thu_nho(ds, [idx["TEMP"]])
                        v = tt[0][np.isfinite(tt[0])]
                        if len(v):
                            p50 = float(np.percentile(v, 50))
                            r["TEMP_p50"] = round(p50 - 273.15 if p50 > 150 else p50, 2)
                    if "NOBS" in idx:
                        nn, _ = _doc_thu_nho(ds, [idx["NOBS"]])
                        v = nn[0][np.isfinite(nn[0])]
                        if len(v):
                            r["NOBS_p50"] = float(np.percentile(v, 50)); r["NOBS_min"] = float(v.min())
                if hinh is not None and ds.crs:
                    hb = shape(transform_geom("EPSG:4326", ds.crs, mapping(hinh)))
                    k_ = box(*ds.bounds)
                    r["phu_khung_pct"] = round(100 * hb.intersection(k_).area / max(hb.area, 1e-12), 1)
                    # độ phủ dữ liệu hợp lệ: 3000 điểm ngẫu nhiên trong ranh giới
                    rng = np.random.default_rng(0)
                    x0, y0, x1, y1 = hb.bounds
                    xs, ys = rng.uniform(x0, x1, 20000), rng.uniform(y0, y1, 20000)
                    trong = _trong_hinh(hb, xs, ys)
                    xs, ys = xs[trong][:3000], ys[trong][:3000]
                    if len(xs):
                        rr, cc = rasterio.transform.rowcol(ds.transform, xs, ys)
                        rr, cc = np.asarray(rr), np.asarray(cc)
                        tr = (rr >= 0) & (rr < ds.height) & (cc >= 0) & (cc < ds.width)
                        ok = np.zeros(len(xs), bool)
                        if tr.any() and all(k in idx for k in TEN_BANG):
                            b1 = idx["NIR"]
                            vals = np.array([v[0] for v in ds.sample(list(zip(xs[tr], ys[tr])), indexes=b1)], float)
                            hl = np.isfinite(vals)
                            if ds.nodata is not None:
                                hl &= vals != ds.nodata
                            ok[np.where(tr)[0][hl]] = True
                        r["phu_du_lieu_pct"] = round(100 * ok.mean(), 1)
        except Exception as e:                                   # noqa: BLE001
            r["loi"] = f"{type(e).__name__}: {e}"[:160]
        dong.append(r)
    df = pd.DataFrame(dong)
    if bao_cao_gee and os.path.exists(bao_cao_gee):
        mk = mua_kho_tu_bao_cao(bao_cao_gee)
        df = df.merge(mk, how="left", on="nam") if "nam" in df else df
    df["canh_bao"] = df.apply(_canh_bao, axis=1) if len(df) else []
    if in_ra and len(df):
        cot = [c for c in ["tep", "kieu", "nam", "crs", "res_m", "so_bang", "thang", "TEMP_p50", "NOBS_p50", "phu_khung_pct",
                           "phu_du_lieu_pct", "canh_mua_kho", "canh_bao"] if c in df]
        print(df[cot].to_string(index=False, max_colwidth=70))
    return df


def _trong_hinh(hinh, xs, ys):
    try:
        import shapely
        return shapely.contains_xy(hinh, xs, ys)                 # shapely >= 2.0
    except AttributeError:
        from shapely import vectorized
        return vectorized.contains(hinh, xs, ys)


def mua_kho_tu_bao_cao(csv):
    """Từ CSV báo cáo cảnh của GEE (cột Image_ID kiểu 2_LT05_126045_19870118, Cloud_Cover_Percent):
    số cảnh trong mùa khô năm y (1/11/(y-1) đến 30/4/y), số cảnh mây < 50 %, các cảm biến, các tháng có cảnh trong năm."""
    import pandas as pd
    d = pd.read_csv(csv)
    s = d["Image_ID"].astype(str)
    d["ngay"] = pd.to_datetime(s.str.extract(r"_(\d{8})$")[0], format="%Y%m%d", errors="coerce")
    d["cb"] = s.str.extract(r"(L[TEC]0\d)")[0]
    d = d.dropna(subset=["ngay"])
    out = []
    for y in sorted(set(d["ngay"].dt.year) | set(d["ngay"].dt.year + 1)):
        m = d[(d.ngay >= f"{y - 1}-11-01") & (d.ngay < f"{y}-05-01")]
        cn = d[d.ngay.dt.year == y]
        if not len(cn) and not len(m):
            continue
        out.append(dict(nam=int(y), canh_mua_kho=len(m),
                        canh_mua_kho_may50=int((m["Cloud_Cover_Percent"] < 50).sum()) if "Cloud_Cover_Percent" in m else None,
                        cam_bien_bao_cao=",".join(sorted(set(cn["cb"].dropna()))),
                        thang_co_canh=" ".join(str(x) for x in sorted(set(cn.ngay.dt.month)))))
    return pd.DataFrame(out)


def _canh_bao(r):
    w = []
    def g(k):
        v = r.get(k) if hasattr(r, "get") else None
        return None if v is None or (isinstance(v, float) and math.isnan(v)) else v
    if g("loi"): w.append("không đọc được")
    if str(g("crs") or "").endswith("4326"): w.append("hệ toạ độ địa lý: phải nắn lại (mất một lần lấy mẫu lại)")
    if g("phu_khung_pct") is not None and g("phu_khung_pct") < 95: w.append(f"chỉ phủ {g('phu_khung_pct')} % Hải Phòng mới")
    if g("phan_xa_ngoai_0_1") and g("phan_xa_ngoai_0_1") > 0.001: w.append("có phản xạ ngoài 0..1 (bão hoà, chưa lọc QA_RADSAT?)")
    th = str(g("thang_co_canh") or "")
    if th and len(th.split()) > 7: w.append("ảnh tổng hợp gộp nhiều mùa (tháng " + th + ")")
    if g("canh_mua_kho_may50") is not None and g("canh_mua_kho_may50") < 2: w.append("mùa khô có dưới 2 cảnh ít mây")
    if g("NOBS_min") is not None and g("NOBS_min") < 2: w.append("có điểm ảnh chỉ 1 lần quan sát")
    return "; ".join(w)


def thieu_nam(df, tu=1987, den=2026):
    co = set(int(x) for x in df["nam"].dropna()) if "nam" in df else set()
    return [y for y in range(tu, den + 1) if y not in co]


# --------------------------------------------------------------------------- ③ phương án A: chuẩn hoá ảnh có sẵn
def cb_theo_nam(y):
    """Cảm biến của ảnh có sẵn khi không có thông tin từng điểm ảnh (APP-TONGHOP dùng L5 đến 2011, L8/9 từ 2013)."""
    if y <= 2011: return BIT_CB["L5"]
    if y >= 2021: return BIT_CB["L8"] | BIT_CB["L9"]
    return BIT_CB["L8"]


def chuan_hoa_anh(src, out, L, nam, thang=None, lay_mau="bilinear", nguon=9, cam_bien=None, tmp_dir="/tmp", verbose=True):
    """
    Ảnh tổng hợp có sẵn (mọi hệ toạ độ, phản xạ 0..1 hoặc DN) -> GeoTIFF int16 10 băng trên lưới L (EPSG:32648, 30 m):
    BLUE..SWIR2 (phản xạ × 10000), TEMP (°C × 100), NOBS, NGUON, CAMBIEN; nodata -32768.
    Phản xạ và nhiệt độ lấy mẫu song tuyến (bilinear), NOBS láng giềng gần nhất. Trả về đường dẫn tệp (GTiff thường,
    chưa phải COG: gọi lam_cog sau khi chuẩn hoá tương đối).
    """
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.vrt import WarpedVRT
    from rasterio.windows import Window
    t0 = time.time()
    tf, W, H = transform_luoi(L), L["rong"], L["cao"]
    with rasterio.open(src) as ds:
        idx = chi_so_bang(ds.descriptions, ds.count)
        if not all(k in idx for k in TEN_BANG):
            raise ValueError(f"{src}: không nhận ra đủ 6 băng phản xạ (mô tả {ds.descriptions})")
        if thang is None:
            a, _ = _doc_thu_nho(ds, [idx["NIR"]])
            thang = kieu_gia_tri(a[0], ds.dtypes[0])
        kw = dict(crs=CRS, transform=tf, width=W, height=H)
        if ds.nodata is not None:
            kw.update(src_nodata=ds.nodata, nodata=ds.nodata)
        elif np.dtype(ds.dtypes[0]).kind == "f":
            kw.update(src_nodata=np.nan, nodata=np.nan)     # ảnh GEE float không ghi nodata: NaN ngoài vùng; ngoài khung ảnh gốc cũng NaN thay vì 0
        prof = dict(driver="GTiff", width=W, height=H, count=len(BANG_RA), dtype="int16", crs=CRS, transform=tf,
                    nodata=NODATA, tiled=True, blockxsize=256, blockysize=256, compress="deflate", predictor=2, BIGTIFF="IF_SAFER")
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        cbv = cam_bien if cam_bien is not None else cb_theo_nam(nam)
        with WarpedVRT(ds, resampling=getattr(Resampling, lay_mau), **kw) as v, \
                WarpedVRT(ds, resampling=Resampling.nearest, **kw) as vn, rasterio.open(out, "w", **prof) as o:
            for r0 in range(0, H, 512):
                hh = min(512, H - r0); win = Window(0, r0, W, hh)
                a = v.read([idx[b] for b in TEN_BANG], window=win, masked=True).astype(np.float32)
                m = np.ma.getmaskarray(a).any(0) | ~np.isfinite(a.filled(np.nan)).all(0)
                rf = ve_phan_xa(a.filled(np.nan), thang)
                ra = np.full((len(BANG_RA), hh, W), NODATA, np.int16)
                ra[:6] = np.clip(np.round(np.nan_to_num(rf) * HE_SO), -32767, 32767).astype(np.int16)
                if "TEMP" in idx:
                    t_ = v.read(idx["TEMP"], window=win, masked=True).astype(np.float32).filled(np.nan)
                    t_ = np.where(t_ > 150, t_ - 273.15, t_)               # Kelvin -> °C
                    ra[6] = np.where(np.isfinite(t_), np.clip(np.round(t_ * HE_SO_T), -32767, 32767), NODATA).astype(np.int16)
                if "NOBS" in idx:
                    n_ = vn.read(idx["NOBS"], window=win, masked=True).astype(np.float32).filled(np.nan)
                    ra[7] = np.where(np.isfinite(n_), np.clip(n_, 0, 32767), NODATA).astype(np.int16)
                    m |= ~(n_ > 0)                                           # không có lần quan sát nào: trống
                ra[8] = nguon; ra[9] = cbv
                ra[:, m] = NODATA
                o.write(ra, window=win)
            o.descriptions = tuple(BANG_RA)
            o.update_tags(nam=str(nam), thang_goc=thang, nguon_goc=os.path.basename(src), phuong_an="A")
    if verbose:
        print(f"    {os.path.basename(out)}: {W}×{H}, thang gốc {thang}, {time.time() - t0:.0f}s")
    return out


# --------------------------------------------------------------------------- ④ IR-MAD và chuẩn hoá tương đối
def irmad(X, Y, lap=50, sai_so=1e-5):
    """
    IR-MAD (Nielsen 2007; Canty & Nielsen 2008): tương quan chính tắc giữa X và Y (N × p), biến MAD, trọng số = xác
    suất KHÔNG đổi theo χ²(p) của tổng bình phương biến MAD chuẩn hoá; lặp đến khi hệ số tương quan chính tắc ổn định.
    Trả về dict(p_khong_doi (N,), rho (p,), n_lap).
    """
    from scipy.stats import chi2
    X, Y = np.asarray(X, np.float64), np.asarray(Y, np.float64)
    N, p = X.shape
    w = np.ones(N); rho_cu = None
    for it in range(1, lap + 1):
        sw = w.sum()
        mx, my = w @ X / sw, w @ Y / sw
        Xc, Yc = X - mx, Y - my
        S11 = (Xc * w[:, None]).T @ Xc / sw + 1e-12 * np.eye(p)
        S22 = (Yc * w[:, None]).T @ Yc / sw + 1e-12 * np.eye(p)
        S12 = (Xc * w[:, None]).T @ Yc / sw
        L1 = np.linalg.cholesky(S11)
        Li = np.linalg.inv(L1)
        C = Li @ S12 @ np.linalg.solve(S22, S12.T) @ Li.T
        ev, U = np.linalg.eigh((C + C.T) / 2)
        o = np.argsort(ev)[::-1]; ev, U = ev[o], U[:, o]
        rho = np.sqrt(np.clip(ev, 0, 1))
        A = Li.T @ U                                             # a' S11 a = 1
        B = np.linalg.solve(S22, S12.T) @ A / np.maximum(rho, 1e-12)
        B /= np.sqrt(np.maximum(np.einsum("ij,jk,ki->i", B.T, S22, B), 1e-24))[None, :]   # b' S22 b = 1
        sg = np.sign(np.einsum("ij,jk,ki->i", A.T, S12, B)); B *= np.where(sg == 0, 1, sg)[None, :]
        M = Xc @ A - Yc @ B
        var = np.maximum(2 * (1 - rho), 1e-12)
        Z = (M * M / var).sum(1)
        w = 1 - chi2.cdf(Z, p)
        if rho_cu is not None and np.max(np.abs(rho - rho_cu)) < sai_so:
            break
        rho_cu = rho
    return dict(p_khong_doi=w, rho=rho, n_lap=it, mad=M)


def hoi_quy_truc_giao(x, y):
    """Hồi quy trực giao (tổng bình phương khoảng cách vuông góc): y ≈ a x + b. Trả về a, b, r²."""
    x, y = np.asarray(x, np.float64), np.asarray(y, np.float64)
    mx, my = x.mean(), y.mean()
    sxx, syy, sxy = ((x - mx) ** 2).mean(), ((y - my) ** 2).mean(), ((x - mx) * (y - my)).mean()
    a = (syy - sxx + math.sqrt((syy - sxx) ** 2 + 4 * sxy * sxy)) / (2 * sxy) if abs(sxy) > 1e-18 else 1.0
    r2 = sxy * sxy / max(sxx * syy, 1e-24)
    return float(a), float(my - a * mx), float(r2)


# p_min: xác suất KHÔNG đổi tối thiểu để là điểm ảnh bất biến (Canty & Nielsen dùng 0.95).
# Xác suất tính lại bằng thang ĐỘ LỆCH TUYỆT ĐỐI TRUNG VỊ của từng biến MAD ở vòng cuối: trọng số IR-MAD thu hẹp dần
# phương sai ước lượng, nên khi hai ảnh gần giống nhau (năm OLI so với tham chiếu OLI) gần như mọi điểm ảnh bị coi là
# "đổi". Thang trung vị bền với cả hai chiều (đuôi dày do đổi thật, phương sai ước lượng sụp).
# Khi ít hơn n_pif_muc điểm vượt p_min: lấy n_pif_muc điểm có xác suất cao nhất trong số điểm KHÔNG có ý nghĩa thay đổi
# ở mức 5 % (p > 0.05). n_pif_min: dưới mức này không chuẩn hoá năm đó.
# Từng băng: hồi quy trực giao nếu r² ≥ r2_min và hệ số góc trong a_khoang; không thì hệ số TỈ LỆ trung bình trên điểm bất
# biến (chỉ sửa độ lợi, chặn 0) nếu r² ≥ r2_min_ti_le và tỉ lệ trong a_khoang; không nữa thì giữ nguyên băng đó.
# Ghi rõ cách cho từng băng.
CONG_MAC = dict(p_min=0.95, n_pif_muc=5000, n_pif_min=500, r2_min=0.85, r2_min_ti_le=0.5, a_khoang=(0.7, 1.43),
                n_mau=300000)


def xac_suat_ben(M):
    """Xác suất KHÔNG đổi theo χ²(p) với biến MAD chuẩn hoá bằng trung vị và 1.4826 × độ lệch tuyệt đối trung vị."""
    from scipy.stats import chi2
    M = np.asarray(M, np.float64)
    med = np.median(M, 0)
    s = 1.4826 * np.median(np.abs(M - med), 0)
    s = np.where(s > 1e-12, s, M.std(0) + 1e-12)
    return 1 - chi2.cdf((((M - med) / s) ** 2).sum(1), M.shape[1])


def doc_cap(tep, tep_tc, bang=6, buoc=2, n_mau=300000, seed=0):
    """Giá trị phản xạ (×10000) của các điểm ảnh hợp lệ ở CẢ hai ảnh (cùng lưới), lấy thưa `buoc` rồi chọn ngẫu nhiên."""
    import rasterio
    from rasterio.enums import Resampling
    with rasterio.open(tep) as a, rasterio.open(tep_tc) as b:
        if (a.width, a.height, tuple(a.transform)[:6]) != (b.width, b.height, tuple(b.transform)[:6]):
            raise ValueError("hai ảnh không cùng lưới")
        sh = (bang, max(1, a.height // buoc), max(1, a.width // buoc))
        X = a.read(list(range(1, bang + 1)), out_shape=sh, resampling=Resampling.nearest).reshape(bang, -1).T.astype(np.float64)
        Y = b.read(list(range(1, bang + 1)), out_shape=sh, resampling=Resampling.nearest).reshape(bang, -1).T.astype(np.float64)
    ok = ((X != NODATA).all(1) & (Y != NODATA).all(1) & (X > -2000).all(1) & (Y > -2000).all(1)
          & (X < 15000).all(1) & (Y < 15000).all(1))
    X, Y = X[ok], Y[ok]
    if len(X) > n_mau:
        k = np.random.default_rng(seed).choice(len(X), n_mau, replace=False); X, Y = X[k], Y[k]
    return X, Y


def he_so_chuan_hoa(X, Y, cong=None):
    """Từ cặp (X: ảnh cần chuẩn hoá, Y: tham chiếu): IR-MAD chọn điểm ảnh bất biến, hệ số từng băng (xem CONG_MAC).
    Trả về dict(a, b, r2, cach, n_pif, dat, ly_do) với Y ≈ a X + b; `dat` = năm qua cổng (đủ điểm bất biến, ít nhất
    một băng sửa được)."""
    c = dict(CONG_MAC, **(cong or {}))
    nb = X.shape[1]
    if len(X) < c["n_pif_min"]:
        return dict(a=[1.0] * nb, b=[0.0] * nb, r2=[0.0] * nb, cach=["giu"] * nb, n_pif=0, dat=False,
                    ly_do="quá ít điểm ảnh chung")
    R = irmad(X, Y)
    p = xac_suat_ben(R["mad"])
    pif = p > c["p_min"]
    if pif.sum() < c["n_pif_muc"]:
        ung = np.where(p > 0.05)[0]
        k = min(len(ung), c["n_pif_muc"])
        pif = np.zeros(len(p), bool); pif[ung[np.argsort(p[ung])[::-1][:k]]] = True
    n = int(pif.sum())
    a, b, r2, cach = [], [], [], []
    lo, hi = c["a_khoang"]
    for j in range(nb):
        aj, bj, rj = hoi_quy_truc_giao(X[pif, j], Y[pif, j]) if n > 10 else (1.0, 0.0, 0.0)
        tl = float(Y[pif, j].mean() / X[pif, j].mean()) if n > 10 and abs(X[pif, j].mean()) > 1e-9 else 1.0
        if n >= c["n_pif_min"] and rj >= c["r2_min"] and lo <= aj <= hi:
            cj = "truc_giao"
        elif n >= c["n_pif_min"] and rj >= c["r2_min_ti_le"] and lo <= tl <= hi:
            aj, bj, cj = tl, 0.0, "ti_le"
        else:
            aj, bj, cj = 1.0, 0.0, "giu"
        a.append(round(aj, 5)); b.append(round(bj, 2)); r2.append(round(rj, 4)); cach.append(cj)
    ly = []
    if n < c["n_pif_min"]:
        ly.append(f"chỉ {n} điểm ảnh bất biến")
    if any(x != "truc_giao" for x in cach):
        ly.append("băng " + ", ".join(f"{TEN_BANG[j] if j < len(TEN_BANG) else j}: {x}" for j, x in enumerate(cach)
                                      if x != "truc_giao"))
    dat = n >= c["n_pif_min"] and any(x != "giu" for x in cach)
    return dict(a=a, b=b, r2=r2, cach=cach, n_pif=n, ti_le_pif=round(n / len(X), 4),
                rho=[round(float(x), 4) for x in R["rho"]], n_lap=R["n_lap"], dat=dat, ly_do="; ".join(ly))


def ap_chuan_hoa(src, out, hs, bang=6):
    """Áp Y = a X + b cho `bang` băng phản xạ đầu (giữ nodata, giữ các băng còn lại), ghi tệp mới."""
    import rasterio
    from rasterio.windows import Window
    with rasterio.open(src) as ds:
        prof = ds.profile.copy()
        with rasterio.open(out, "w", **prof) as o:
            for r0 in range(0, ds.height, 512):
                hh = min(512, ds.height - r0); win = Window(0, r0, ds.width, hh)
                a = ds.read(window=win)
                for j in range(bang):
                    v = a[j]; ok = v != NODATA
                    v2 = np.round(v.astype(np.float64) * hs["a"][j] + hs["b"][j])
                    a[j] = np.where(ok, np.clip(v2, -32767, 32767), NODATA).astype(np.int16)
                o.write(a, window=win)
            o.descriptions = ds.descriptions
            tags = ds.tags(); tags.update(chuan_hoa=json.dumps({k: hs[k] for k in ("a", "b", "r2", "n_pif")}))
            o.update_tags(**tags)
    return out


# --------------------------------------------------------------------------- ⑤ cầu nối Landsat - Sentinel-2 (chẩn đoán)
S2_THU_TU = ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"]      # thứ tự băng của S2_HP_{năm}


def cau_noi_s2(ls_tif, s2_tif, so_khoi=40, canh=200, seed=0):
    """So sánh phản xạ Landsat (30 m) với S2 (10 m, gộp trung bình 3 × 3 trên lưới chung) cùng năm, từng băng.
    Trả về dict băng -> n, OLS (a, b), r², độ lệch trung bình và RMSE (đơn vị phản xạ). Chỉ chẩn đoán, không sửa ảnh."""
    import rasterio
    from rasterio.windows import Window
    rng = np.random.default_rng(seed)
    acc = {b: ([], []) for b in BANG_S2}
    with rasterio.open(ls_tif) as L, rasterio.open(s2_tif) as S:
        if abs(S.transform.a - L.transform.a / 3) > 1e-6:
            raise ValueError("ảnh S2 phải là lưới 10 m cùng gốc (S2_HP_{năm})")
        dx = (L.transform.c - S.transform.c) / S.transform.a
        dy = (S.transform.f - L.transform.f) / S.transform.a
        if abs(dx - round(dx)) > 1e-6 or abs(dy - round(dy)) > 1e-6:
            raise ValueError("hai lưới lệch nhau, không trùng khít 3 × 3")
        dx, dy = int(round(dx)), int(round(dy))
        for _ in range(so_khoi * 5):
            if sum(len(v[0]) for v in acc.values()) >= so_khoi * canh * canh * len(BANG_S2) // 4:
                break
            c0, r0 = int(rng.integers(0, max(1, L.width - canh))), int(rng.integers(0, max(1, L.height - canh)))
            sc, sr = dx + 3 * c0, dy + 3 * r0
            if sc < 0 or sr < 0 or sc + 3 * canh > S.width or sr + 3 * canh > S.height:
                continue
            a = L.read(list(range(1, 7)), window=Window(c0, r0, canh, canh)).astype(np.float64)
            s = S.read([S2_THU_TU.index(b) + 1 for b in BANG_S2], window=Window(sc, sr, 3 * canh, 3 * canh)).astype(np.float64)
            hl = (s > 0).all(0)
            s = np.where(hl, s, np.nan).reshape(6, canh, 3, canh, 3)
            with np.errstate(all="ignore"):
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", RuntimeWarning)
                    sm = np.nanmean(s, axis=(2, 4))
            ok = (a != NODATA).all(0) & np.isfinite(sm).all(0) & (hl.reshape(canh, 3, canh, 3).all(axis=(1, 3)))
            if ok.mean() < 0.3:
                continue
            for j, b in enumerate(BANG_S2):
                acc[b][0].append(a[j][ok] / HE_SO); acc[b][1].append(sm[j][ok] / HE_SO)
    out = {}
    for b, (xs, ys) in acc.items():
        if not xs:
            continue
        x, y = np.concatenate(xs), np.concatenate(ys)
        A = np.vstack([x, np.ones_like(x)]).T
        (aa, bb), *_ = np.linalg.lstsq(A, y, rcond=None)
        r = np.corrcoef(x, y)[0, 1]
        out[b] = dict(n=int(len(x)), a=round(float(aa), 4), b=round(float(bb), 4), r2=round(float(r * r), 4),
                      lech=round(float((x - y).mean()), 4), rmse=round(float(np.sqrt(((x - y) ** 2).mean())), 4))
    return out


# --------------------------------------------------------------------------- ⑥ COG, kéo giãn, xem nhanh
def lam_cog(src, out, blocksize=256):
    """GeoTIFF int16 10 băng -> COG (DEFLATE, predictor 2, overview trung bình) để trình duyệt đọc theo đoạn."""
    import rasterio.shutil as rsh
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    rsh.copy(src, out, driver="COG", compress="DEFLATE", predictor=2, blocksize=blocksize, overviews="AUTO",
             resampling="AVERAGE", BIGTIFF="IF_SAFER", NUM_THREADS="ALL_CPUS")
    return out


def keo_gian(ds_tep, n_win=40, win=200, seed=0, windows=(5, 15), p=(2, 98)):
    """Kéo giãn CỐ ĐỊNH chung mọi năm (như s2d): lo, hi = p2, p98 từng băng phản xạ (gộp mẫu các năm), và p98 độ lệch
    chuẩn CTX ở cửa sổ 5 × 5, 15 × 15 (s5, s15). Đơn vị DN (phản xạ × 10000)."""
    import rasterio
    from rasterio.windows import Window
    from scipy.ndimage import uniform_filter
    rng = np.random.default_rng(seed)
    vals, sds = [], {w: [] for w in windows}
    for t in ds_tep:
        with rasterio.open(t) as ds:
            W, H = ds.width, ds.height
            ww, hh = min(win, W), min(win, H)
            got, tries = 0, 0
            while got < max(1, n_win // max(1, len(ds_tep))) and tries < 400:
                tries += 1
                c0, r0 = int(rng.integers(0, max(1, W - ww + 1))), int(rng.integers(0, max(1, H - hh + 1)))
                a = ds.read(list(range(1, 7)), window=Window(c0, r0, ww, hh)).astype(np.float64)
                ok = (a != NODATA).all(0)
                if ok.mean() < 0.5:
                    continue
                got += 1
                vals.append(a[:, ok])
                for w_ in windows:
                    r = (w_ - 1) // 2
                    inner = ok.copy(); inner[:r, :] = inner[-r:, :] = inner[:, :r] = inner[:, -r:] = False
                    s = []
                    for b in range(6):
                        x = np.where(ok, a[b], 0)
                        m = uniform_filter(x, w_, mode="nearest"); m2 = uniform_filter(x * x, w_, mode="nearest")
                        s.append(np.sqrt(np.maximum(m2 - m * m, 0))[inner])
                    sds[w_].append(np.stack(s))
    V = np.concatenate(vals, 1)
    out = dict(lo=[int(round(x)) for x in np.percentile(V, p[0], 1)], hi=[int(round(x)) for x in np.percentile(V, p[1], 1)])
    for w_ in windows:
        S = np.concatenate(sds[w_], 1)
        out[f"s{w_}"] = [int(round(x)) for x in np.percentile(S, p[1], 1)]
    return out


def anh_xem_nhanh(src, out, grid3857, kg, bang=("RED", "GREEN", "BLUE"), gamma=1.0, tmp_dir="/tmp", verbose=True):
    """Ảnh màu 8 bit trên lưới 3857 (như s2tc): kéo giãn cố định kg (lo, hi) giống nhau mọi năm."""
    import s2_hf_lop as H
    ix = [TEN_BANG.index(b) for b in bang]
    return H.rgb_cog(src, [i + 1 for i in ix], [kg["lo"][i] for i in ix], [kg["hi"][i] for i in ix], out, grid3857,
                     gamma=gamma, nodata=NODATA, tmp_dir=tmp_dir, verbose=verbose)


# --------------------------------------------------------------------------- ⑦ manifest, Hugging Face
def muc_manifest(nam, kg, L, phuong_an, chuan_hoa=None, cau_noi=None, ghi_chu=""):
    """Mục 'ls' của manifest.json (geoportal 3.0 đọc mục này như một nguồn ảnh quang học thứ hai)."""
    return dict(duong_dan="ls/ls_{y}.tif", nam=sorted(int(y) for y in nam), bang=BANG_S2, ten_bang=TEN_BANG, bang_phu=BANG_PHU,
                he_so=HE_SO, he_so_nhiet=HE_SO_T, crs=CRS, res=RES, goc_luoi=list(GOC_LUOI), khung=L["khung"], keo_gian=kg,
                phuong_an=phuong_an, mua="mùa khô: 1/11 năm trước đến 30/4", nguon_ten=NGUON_TEN, bit_cam_bien=BIT_CB,
                nguon="USGS Landsat Collection 2 Level-2 (TM, ETM+, OLI, OLI-2), Tier 1; xử lý: Phạm Đăng Hiển",
                chuan_hoa=chuan_hoa or {}, cau_noi_s2=cau_noi or {}, ghi_chu=ghi_chu, phien_ban_ma=__version__)


def lop_manifest(nam, co_pca=0, pca_kg=None, co_emb=False):
    """Các lớp xem của Landsat (thêm vào manifest['layers']): màu thật, (tuỳ) PC xám, (tuỳ) embedding RGB.
    Trường 'nguon': 'ls' để geoportal tách khỏi lớp Sentinel-2."""
    nam = sorted(int(y) for y in nam)
    ds = [dict(id="lstc", ten="Landsat màu thật (tổng hợp mùa khô)", ten_en="Landsat natural colour (dry-season composite)",
               ten_ru="Landsat в естественных цветах (композит сухого сезона)", kieu="rgb", nguon="ls",
               duong_dan="lstc/lstc_{y}.tif", nam=nam)]
    for q in range(1, co_pca + 1):
        ds.append(dict(id=f"lspc{q}", ten=f"Landsat PC{q} chuỗi năm (đỏ +, xanh −, trắng 0)",
                       ten_en=f"Landsat PC{q} of the annual series (red +, blue −, white 0)",
                       ten_ru=f"Landsat PC{q} годового ряда (красный +, синий −, белый 0)", kieu="xam", nguon="ls",
                       bang_mau_lien_tuc="rdbu", duong_dan=f"lspc{q}/lspc{q}_{{y}}.tif", nam=nam,
                       keo_gian=(pca_kg or {}).get(q)))
    if co_emb:
        for tp, sfx in (("1-2-3", ""), ("4-5-6", "b")):
            ds.append(dict(id=f"lsg{sfx}", ten=f"Embedding Landsat, thành phần {tp}", ten_en=f"Landsat embedding, components {tp}",
                           ten_ru=f"Эмбеддинг Landsat, компоненты {tp}", kieu="rgb", nguon="ls",
                           duong_dan=f"lsg{sfx}/lsg{sfx}_{{y}}.tif", nam=nam, phep_chieu="emb/lsg_phep_chieu.json"))
    return ds


def gop_manifest(man, muc_ls=None, lop=None, muc_lspc=None):
    """Gộp vào manifest hiện có: thay mục cùng id (không trùng lặp), giữ nguyên mọi thứ khác."""
    man = json.loads(json.dumps(man))
    if muc_ls is not None:
        man["ls"] = muc_ls
    if muc_lspc is not None:
        man["lspc"] = muc_lspc
    if lop:
        ids = {l["id"] for l in lop}
        man["layers"] = [l for l in man.get("layers", []) if l.get("id") not in ids] + lop
    man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
    return man


def day_tep(api, repo, local, path_in_repo, lan=4, msg=None):
    """Đẩy một tệp lên kho dữ liệu HF, thử lại khi lỗi mạng (đợi tăng dần)."""
    for k in range(lan):
        try:
            api.upload_file(path_or_fileobj=local, path_in_repo=path_in_repo, repo_id=repo, repo_type="dataset",
                            commit_message=msg or f"Landsat: {path_in_repo}")
            return True
        except Exception as e:                                   # noqa: BLE001
            if k == lan - 1:
                raise
            print(f"    lỗi đẩy {path_in_repo} ({type(e).__name__}), thử lại sau {10 * (k + 1)} s")
            time.sleep(10 * (k + 1))


def da_co_tren_hf(api, repo):
    """Tập đường dẫn đã có trong kho dữ liệu (để chạy lại thì bỏ qua)."""
    try:
        return set(api.list_repo_files(repo, repo_type="dataset"))
    except Exception:                                            # noqa: BLE001
        return set()


def cap_nhat_manifest_hf(api, repo, ham_sua, tmp_dir="/tmp"):
    """Tải manifest.json mới nhất, lưu bản sao an toàn manifest_luu/manifest_{giờ}.json, sửa bằng ham_sua(man) -> man,
    rồi đẩy lại. Không bao giờ ghi đè mà không có bản sao."""
    from huggingface_hub import hf_hub_download
    p = hf_hub_download(repo, "manifest.json", repo_type="dataset", force_download=True, local_dir=tmp_dir)
    man = json.load(open(p, encoding="utf-8"))
    st = time.strftime("%Y%m%d_%H%M")
    day_tep(api, repo, p, f"manifest_luu/manifest_{st}.json", msg="bản sao manifest trước khi thêm Landsat")
    moi = ham_sua(man)
    q = os.path.join(tmp_dir, "manifest_moi.json")
    json.dump(moi, open(q, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    day_tep(api, repo, q, "manifest.json", msg="manifest: thêm Landsat")
    return moi


def ma_bam(d):
    return hashlib.md5(json.dumps(d, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:6]


# --------------------------------------------------------------------------- ⑧ kế hoạch phương án B (GEE) và gom kết quả
# Cấu hình dựng ảnh trên GEE (ls_gee.py dùng). Đặt ở đây để tài khoản chính, không chạy GEE, cũng đọc được mã cấu hình.
CAU_HINH_GEE = dict(
    phien="B1",
    mua=[[11, -1], [4, 0]],             # mùa khô năm y: tháng 11 năm y-1 đến hết tháng 4 năm y (như ảnh S2 của geoportal)
    mua_noi=[[10, -1], [5, 0]],         # nới khi thiếu ảnh: tháng 10 năm y-1 đến hết tháng 5 năm y
    may_canh_max=80,                    # bỏ cảnh mây > 80 % trước khi lọc từng điểm ảnh (bớt việc cho GEE)
    sr_khoang=[-0.05, 1.0],
    opacity_max=0.3,                    # TM, ETM+: SR_ATMOS_OPACITY × 0.001 > 0.3 là khói mù hoặc mây (USGS)
    bo_aerosol_cao=True,                # OLI: SR_QA_AEROSOL bit 6-7 = 11 (mức cao) không nên dùng (USGS)
    bo_mep_px={"L4": 2, "L5": 2, "L7": 2, "L8": 0, "L9": 0},
    l7_den=2016,                        # quỹ đạo Landsat 7 trôi khỏi giờ chụp danh định từ 2017 (USGS)
    l7_du_phong_tu=2014,                # từ 2014 Landsat 7 chỉ dùng khi OLI thiếu ảnh
    n_toi_thieu=2,
    nam_tham_chieu=[2015, 2020])


def ma_cau_hinh_gee(cfg=None):
    return hashlib.md5(json.dumps(cfg or CAU_HINH_GEE, sort_keys=True).encode()).hexdigest()[:6]


def ten_tep_gee(y, cfg=None):
    return f"LS_HP_{int(y)}_{ma_cau_hinh_gee(cfg)}"


def chia_viec(ds_nam, tai_khoan):
    """Năm có mẫu, năm gần đây trước; xen kẽ tài khoản. Trả về {tài khoản: [năm]}."""
    uu = [2025, 2023, 2017, 2011, 1987, 2022, 2020, 2000, 1995, 1990, 2005, 2012, 2013]
    thu_tu = [y for y in uu if y in ds_nam] + [y for y in sorted(ds_nam, reverse=True) if y not in uu]
    out = {tk: [] for tk in tai_khoan}
    for i, y in enumerate(thu_tu):
        out[tai_khoan[i % len(tai_khoan)]].append(y)
    return out


def lap_ke_hoach_gee(bnd, tai_khoan, nam=range(1987, 2027), vien_m=500, sai_so_m=100, cfg=None):
    """Kế hoạch dùng chung cho mọi tài khoản GEE (tài khoản chính ghi ke_hoach_ls.json vào thư mục chung):
    lưới 30 m (khung tính trên ranh giới nới vien_m, CHƯA rút gọn, như luoi_tu_ranh), vùng cắt đã rút gọn (EPSG:4326),
    cấu hình, mã cấu hình và việc của từng tài khoản."""
    import geopandas as gpd
    from shapely.geometry import mapping
    g = bnd.to_crs(CRS)
    hp = g.union_all() if hasattr(g, "union_all") else g.unary_union
    L = khung_luoi(hp.buffer(vien_m).bounds)
    vung = hp.buffer(vien_m).simplify(sai_so_m, preserve_topology=True)
    g4 = gpd.GeoSeries([vung], crs=CRS).to_crs(4326).iloc[0]
    cfg = json.loads(json.dumps(cfg or CAU_HINH_GEE))
    nam = [int(y) for y in nam]
    return dict(phien_ban=__version__, tao_luc=time.strftime("%Y-%m-%d %H:%M"), crs=CRS, L=L,
                vung_geojson=json.loads(json.dumps(mapping(g4))), bao=list(g4.bounds), cfg=cfg,
                ma_cau_hinh=ma_cau_hinh_gee(cfg), nam=nam, tai_khoan=list(tai_khoan), chia=chia_viec(nam, list(tai_khoan)),
                thu_muc_xuat="HP_LS_XUAT_{tk}", thu_muc_chung="HP_LS_CHUNG")


_MANH = re.compile(r"^(LS_HP_(?:TC_\d{4}_\d{4}|\d{4})_[0-9a-f]{6})(-\d{10}-\d{10})?\.tif$")


def tim_xuat_gee(ds_thu_muc, ma=None):
    """{tên gốc: [mảnh]} của mọi tệp xuất GEE (GEE chia ảnh lớn thành mảnh tên đuôi -hàng-cột). Lọc theo mã cấu hình."""
    out = {}
    for tm in ds_thu_muc:
        for p in glob.glob(os.path.join(tm, "**", "LS_HP_*.tif"), recursive=True):
            m = _MANH.match(os.path.basename(p))
            if not m or (ma and not m.group(1).endswith("_" + ma)):
                continue
            out.setdefault(m.group(1), {})[os.path.basename(p)] = p        # cùng tên ở hai thư mục: giữ một
    return {k: sorted(v.values()) for k, v in out.items()}


def ghep_manh(manh, out, L):
    """Ghép các mảnh GEE vào ĐÚNG khung lưới L (nodata ngoài phần có mảnh). Kiểm: cỡ điểm ảnh, lệch nguyên điểm ảnh,
    đủ phủ khung. Trả về dict(du, so_manh, pct_phu)."""
    import rasterio
    from rasterio.windows import Window
    tf, W, H = transform_luoi(L), L["rong"], L["cao"]
    phu = np.zeros((H, W), bool)
    with rasterio.open(manh[0]) as d0:
        prof = dict(driver="GTiff", width=W, height=H, count=d0.count, dtype=d0.dtypes[0], crs=CRS, transform=tf,
                    nodata=NODATA, tiled=True, blockxsize=256, blockysize=256, compress="deflate", predictor=2,
                    BIGTIFF="IF_SAFER")
        mo_ta = d0.descriptions
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with rasterio.open(out + ".part.tif", "w", **prof) as o:
        for p in manh:
            with rasterio.open(p) as d:
                if abs(d.transform.a - L["res"]) > 1e-6:
                    raise ValueError(f"{p}: cỡ điểm ảnh {d.transform.a} khác {L['res']}")
                fc, fr = (d.transform.c - tf.c) / L["res"], (tf.f - d.transform.f) / L["res"]
                if abs(fc - round(fc)) > 1e-6 or abs(fr - round(fr)) > 1e-6:
                    raise ValueError(f"{p}: lệch lưới ({fc:.3f}, {fr:.3f} điểm ảnh)")
                c0, r0 = int(round(fc)), int(round(fr))
                ca, ra = max(0, c0), max(0, r0)
                cb, rb = min(W, c0 + d.width), min(H, r0 + d.height)
                if cb <= ca or rb <= ra:
                    continue
                for rr in range(ra, rb, 1024):
                    h = min(1024, rb - rr)
                    a = d.read(window=Window(ca - c0, rr - r0, cb - ca, h))
                    o.write(a, window=Window(ca, rr, cb - ca, h))
                phu[ra:rb, ca:cb] = True
        if mo_ta and any(mo_ta):
            o.descriptions = tuple(m or f"b{i + 1}" for i, m in enumerate(mo_ta))
    os.replace(out + ".part.tif", out)
    pct = round(100.0 * phu.mean(), 2)
    return dict(du=bool(phu.all()), so_manh=len(manh), pct_phu=pct)


def mat_na_ranh(bnd, L):
    """Mặt nạ bool (cao, rộng) trên lưới L: True trong ranh giới (GeoDataFrame bất kỳ hệ toạ độ)."""
    from rasterio.features import geometry_mask
    g = bnd.to_crs(CRS)
    return geometry_mask(list(g.geometry), out_shape=(L["cao"], L["rong"]), transform=transform_luoi(L), invert=True)


def tham_chieu_trung_vi(ds_tep, out, rows=256):
    """Ảnh tham chiếu = trung vị từng điểm ảnh của nhiều ảnh cùng lưới (phương án A: các năm OLI 2015-2020, khi không có
    ảnh tham chiếu GEE). Ghi 10 băng như BANG_RA: 6 phản xạ trung vị, TEMP trung vị, NOBS = số ảnh có dữ liệu,
    NGUON 0, CAMBIEN = OR các ảnh."""
    import rasterio
    from rasterio.windows import Window
    srcs = [rasterio.open(t) for t in ds_tep]
    try:
        d0 = srcs[0]
        prof = d0.profile.copy()
        prof.update(count=len(BANG_RA), dtype="int16", nodata=NODATA, compress="deflate", predictor=2, tiled=True,
                    blockxsize=256, blockysize=256)
        with rasterio.open(out, "w", **prof) as o:
            for r0 in range(0, d0.height, rows):
                h = min(rows, d0.height - r0)
                win = Window(0, r0, d0.width, h)
                A = np.stack([s.read(window=win) for s in srcs]).astype(np.float64)       # (n, 10, h, w)
                hop = (A[:, :6] != NODATA).all(1)                                           # (n, h, w)
                X = np.where(hop[:, None], A[:, :7], np.nan)
                X[:, 6][A[:, 6] == NODATA] = np.nan
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", RuntimeWarning)
                    med = np.nanmedian(X, axis=0)
                ra = np.full((len(BANG_RA), h, d0.width), NODATA, np.int16)
                co = hop.any(0)
                ra[:7] = np.where(np.isfinite(med), np.round(med), NODATA).astype(np.int16)
                ra[:6, ~co] = NODATA
                ra[7] = np.where(co, hop.sum(0), NODATA)
                ra[8] = np.where(co, 0, NODATA)
                cb = np.zeros((h, d0.width), np.int64)
                for k in range(len(srcs)):
                    cb |= np.where(hop[k], np.maximum(A[k, 9], 0), 0).astype(np.int64)
                ra[9] = np.where(co, cb, NODATA)
                o.write(ra, window=win)
            o.descriptions = tuple(BANG_RA)
            o.update_tags(tham_chieu="trung vị " + ", ".join(os.path.basename(t) for t in ds_tep))
    finally:
        for s in srcs:
            s.close()
    return out
