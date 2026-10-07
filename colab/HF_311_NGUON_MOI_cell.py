# ============ GEOPORTAL 3.11: NGUỒN DỮ LIỆU MỚI CHO HẢI PHÒNG -> HUGGING FACE ============
# Chạy trên Colab (CPU), cần tài khoản Google Earth Engine có dự án (GEE_PROJECT) và Google Drive (thư mục HP_HF_LOP_THAM_CHIEU
# đã có manifest.json, ranh_gioi/xa.geojson của bộ dữ liệu). Mọi sản phẩm lấy qua Earth Engine, xuất về Drive theo đúng lưới UTM
# của bộ dữ liệu (manifest["grid"]), đổi sang COG EPSG:3857, cắt theo ranh giới xã, ghi manifest, đẩy lên Hugging Face.
#
#   AEF   AlphaEarth Foundations Satellite Embedding V1 (Google, Google DeepMind), 64 chiều, 10 m, mỗi năm 2017-2025.
#         Lưu ĐỦ 64 kênh (uint8 = round(sign(x)·sqrt|x|·127.5) + 128, 0 = trống: cùng cách lượng tử của bản gốc trên GCS /
#         Source Cooperative, dịch thêm 128 để khỏi phải dùng kiểu int8), ô 128 × 128, không có ảnh thu nhỏ: trang chỉ đọc
#         một điểm ảnh tại điểm mẫu (gợi ý lớp kNN, độ giống giữa các năm). Kèm ảnh màu 3 thành phần chính (PCA trên năm tham
#         chiếu) để xem. Đọc thẳng bản gốc từ Source Cooperative trong trình duyệt không dùng được: một điểm, một năm cần
#         65 yêu cầu, hơn 47 MB (đo 07.10.2026), vì ô 1024 × 1024 và mỗi kênh một ô riêng.
#   DIST  OPERA DIST-ANN-HLS V1 (NASA JPL): trạng thái xáo trộn thực vật trong năm (VEG-DIST-STATUS, mã gốc; 0 = không xáo
#         trộn, để trong suốt) và mức suy giảm thực vật lớn nhất (VEG-ANOM-MAX, %), 30 m, các năm có trên Earth Engine.
#   NUOC  OPERA DSWx-HLS V1: tần suất có nước mặt trong năm (%) = số lần nước (nước mở hoặc nước một phần) / số lần quan sát
#         hợp lệ (bỏ mây, tuyết, biển che), 30 m, từ tháng 4/2023; bỏ điểm ảnh có ít hơn NUOC_TOI_THIEU lần quan sát.
#   DEN   Ánh sáng đêm VIIRS (NOAA/VIIRS/DNB/ANNUAL_V22, Earth Observation Group), bức xạ trung bình năm (nW/cm²/sr), ~460 m,
#         lưu theo thang log10(1 + x), 2012-2024 (các năm có trên Earth Engine).
#   NHA   GlobalBuildingAtlas (TUM, Zhu và cs. 2025): chiều cao nhà lớn nhất (m) và tỉ lệ phủ nhà (%) trong mỗi ô 10 m, dựng
#         từ đa giác nhà có chiều cao (FeatureCollection trên GEE Community Catalog), năm tham chiếu khoảng 2019.
#
# Giấy phép: AEF CC BY 4.0; OPERA, VIIRS: dữ liệu mở NASA / NOAA (không hạn chế); GlobalBuildingAtlas CC BY-NC 3.0 (phi
# thương mại). Ghi công trong manifest và README.
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
GEE_PROJECT = ""                    # dự án Earth Engine, vd "ee-lopmaybay"
SAN_PHAM = ["AEF", "DIST", "NUOC", "DEN", "NHA"]
NAM_AEF = list(range(2017, 2026))
AEF_DO_PHAN_GIAI = 10               # 10 m như bản gốc; 20 hay 30 nếu thiếu chỗ Drive (64 kênh, mỗi năm vài GB ở 10 m)
AEF_NAM_THAM_CHIEU = 2024           # năm dùng để tính 3 thành phần chính cho ảnh màu (cùng phép chiếu cho mọi năm)
AEF_TUNG_NAM = True                 # True: làm lần lượt từng năm (xuất, đổi COG, đẩy lên, xoá bản trên Drive) để Drive chỉ giữ một
                                    # năm: 64 kênh 10 m cho cả tỉnh là vài GB một năm, quá hạn mức Drive miễn phí nếu xuất cùng lúc
NAM_DIST = [2023, 2024, 2025]       # năm nào không có trên Earth Engine thì tự bỏ
NAM_NUOC = [2023, 2024, 2025, 2026]
NUOC_TOI_THIEU = 5                  # số lần quan sát hợp lệ tối thiểu để tính tần suất nước
NAM_DEN = list(range(2012, 2025))
DEN_MAX = 300.0                     # nW/cm²/sr: đầu cao của thang log (sáng hơn thì bằng màu cao nhất)
NHA_CAO_MAX = 100.0                 # m
THU_MUC_DRIVE = "HP_HF_311"         # thư mục Drive nhận ảnh xuất từ Earth Engine
LAM_LAI = False                     # True: xuất và dựng lại cả năm đã có
GUI_LEN = True

# ---------------- HÀM (thuần, thử được ngoài Colab) ----------------
import os, re, json, time, glob, math, shutil
import numpy as np

TRICH = {
    "AEF": "Brown C.F. et al. (2025) AlphaEarth Foundations: An embedding field model for accurate and efficient global mapping from sparse label data. arXiv:2507.22291. Dữ liệu: The AlphaEarth Foundations Satellite Embedding dataset is produced by Google and Google DeepMind (CC BY 4.0)",
    "DIST": "Hansen M. (2024) OPERA Land Surface Disturbance Annual from Harmonized Landsat Sentinel-2 product (Version 1). NASA LP DAAC. doi:10.5067/SNWG/OPERA_L3_DIST-ANN-HLS_V1.001; Pickens A.H. et al. (2025) Rapid monitoring of global land change. Nature Communications 16, 8820",
    "NUOC": "OPERA (2023) OPERA Dynamic Surface Water Extent from Harmonized Landsat Sentinel-2 (Version 1). PO.DAAC. doi:10.5067/OPDSW-PL3V1",
    "DEN": "Elvidge C.D. et al. (2021) Annual time series of global VIIRS nighttime lights derived from monthly averages: 2012 to 2019. Remote Sensing 13(5), 922 (VNL v2.2, Earth Observation Group, Colorado School of Mines)",
    "NHA": "Zhu X.X. et al. (2025) GlobalBuildingAtlas: An Open Global and Complete Dataset of Building Polygons, Heights and LoD1 3D Models. arXiv:2506.04106; doi:10.14459/2025mp1782307 (CC BY-NC 3.0)",
}
DIST_LOP = {3: ("xáo trộn < 50 %, đang diễn ra", "#dee043"), 6: ("xáo trộn ≥ 50 %, đang diễn ra", "#e01b07"),
            7: ("xáo trộn < 50 %, đã kết thúc", "#9e9e9e"), 8: ("xáo trộn ≥ 50 %, đã kết thúc", "#5f3dc4"),
            9: ("xáo trộn < 50 % từ năm trước", "#f59f00"), 10: ("xáo trộn ≥ 50 % từ năm trước", "#a61e4d")}


def aef_luong_tu(x):
    """Số thực [-1, 1] -> uint8 1..255 (0 dành cho trống), theo cách lượng tử của bản AEF gốc: q = round(sign·sqrt|x|·127.5)."""
    x = np.asarray(x, dtype=np.float64)
    q = np.clip(np.round(np.sign(x) * np.sqrt(np.abs(x)) * 127.5), -127, 127)
    return (q + 128).astype(np.uint8)


def aef_giai(u):
    """uint8 1..255 -> số thực [-1, 1]; 0 -> nan."""
    u = np.asarray(u).astype(np.float64); q = u - 128
    out = np.sign(q) * (q / 127.5) ** 2
    out[np.asarray(u) == 0] = np.nan
    return out


def pca_khop(X, k=3):
    """X (n, d) -> (trung bình, k thành phần chính (k, d)); dấu cố định: phần tử lớn nhất của mỗi thành phần dương."""
    m = X.mean(axis=0); _, _, vt = np.linalg.svd(X - m, full_matrices=False)
    tp = vt[:k]
    tp = tp * np.sign(tp[np.arange(k), np.abs(tp).argmax(axis=1)])[:, None]
    return m, tp


def byte_tuyen_tinh(a, lo, hi, trong=None):
    """Giá trị thật -> uint8 1..255 theo [lo, hi] (ngoài khoảng: bám đầu mút); trong (mặt nạ True) hoặc nan -> 0."""
    a = np.asarray(a, dtype=np.float64)
    b = np.clip(np.round(1 + (a - lo) / np.maximum(np.asarray(hi, dtype=np.float64) - lo, 1e-12) * 254), 1, 255)
    bad = ~np.isfinite(a) if trong is None else (~np.isfinite(a)) | trong
    b[bad] = 0
    return b.astype(np.uint8)


def gba_o(lon, lat):
    """Tên tài sản GBA (ô 5° × 5°) chứa điểm lon, lat: vd e105_n25_e110_n20."""
    x0 = int(math.floor(lon / 5) * 5); y1 = int(math.ceil(lat / 5) * 5)
    f = lambda v, d, a: f"{d if v >= 0 else a}{abs(v):03d}" if d in "ew" else f"{d if v >= 0 else a}{abs(v):02d}"
    return f"{f(x0, 'e', 'w')}_{f(y1, 'n', 's')}_{f(x0 + 5, 'e', 'w')}_{f(y1 - 5, 'n', 's')}"


def gba_cac_o(bb):
    """Mọi ô GBA phủ hộp lon/lat bb = (x0, y0, x1, y1)."""
    out = []
    for x in range(int(math.floor(bb[0] / 5) * 5), int(math.ceil(bb[2] / 5) * 5), 5):
        for y in range(int(math.floor(bb[1] / 5) * 5), int(math.ceil(bb[3] / 5) * 5), 5):
            out.append(gba_o(x + 2.5, y + 2.5))
    return sorted(set(out))


def luoi_3857(bounds_utm, crs="EPSG:32648", res=10.0):
    """Lưới Web Mercator phủ khung UTM, góc là bội số của res (như ô Colab 2.7)."""
    from rasterio.warp import transform_bounds
    from rasterio.transform import from_origin
    x0, y0, x1, y1 = transform_bounds(crs, "EPSG:3857", *bounds_utm, densify_pts=41)
    x0 = math.floor(x0 / res) * res; y1 = math.ceil(y1 / res) * res
    return from_origin(x0, y1, res, res), int(math.ceil((x1 - x0) / res)), int(math.ceil((y1 - y0) / res))


def ghep(nguon, tmp_dir="/tmp"):
    """Earth Engine chia ảnh lớn thành nhiều mảnh: ghép thành một GeoTIFF (giữ nodata 0)."""
    import rasterio
    from rasterio.merge import merge
    if len(nguon) == 1:
        return nguon[0], False
    ds = [rasterio.open(p) for p in nguon]
    a, t = merge(ds, nodata=0); prof = ds[0].profile; [d.close() for d in ds]
    out = f"{tmp_dir}/_ghep_{os.getpid()}_{int(time.time() * 1000) % 100000}.tif"
    prof.update(driver="GTiff", width=a.shape[2], height=a.shape[1], transform=t, nodata=0, tiled=True, blockxsize=256, blockysize=256,
                compress="deflate", BIGTIFF="IF_SAFER")
    with rasterio.open(out, "w", **prof) as o:
        o.write(a)
    return out, True


def ra_cog(nguon, out, grid, hinh=None, kenh=None, tmp_dir="/tmp", rows=1024, resampling="nearest", blocksize=256, overviews="AUTO",
           ov_resampling="AVERAGE", bien_doi=None):
    """Một hay nhiều mảnh GeoTIFF uint8 -> COG 3857 trên `grid` (transform, w, h), 0 ngoài `hinh` (shapely, EPSG:3857).
    kenh: danh sách kênh (1-based) cần lấy (mặc định mọi kênh). bien_doi(a) -> a: đổi giá trị từng cửa sổ (vd lọc mã).
    Trả {kênh: số điểm ảnh khác 0}."""
    import rasterio
    import rasterio.shutil as rsh
    from rasterio.enums import Resampling
    from rasterio.features import geometry_mask
    from rasterio.vrt import WarpedVRT
    from rasterio.windows import Window, transform as wtf
    tf, w, h = grid
    src, tam = ghep(nguon, tmp_dir)
    with rasterio.open(src) as ds:
        kenh = kenh or list(range(1, ds.count + 1))
        tmp = f"{tmp_dir}/_cog_{os.getpid()}_{os.path.basename(out)}"
        prof = dict(driver="GTiff", width=w, height=h, count=len(kenh), dtype="uint8", crs="EPSG:3857", transform=tf, nodata=0, tiled=True,
                    blockxsize=blocksize, blockysize=blocksize, compress="deflate", interleave="pixel", BIGTIFF="IF_SAFER")
        dem = {k: 0 for k in range(1, len(kenh) + 1)}
        with WarpedVRT(ds, crs="EPSG:3857", transform=tf, width=w, height=h, resampling=getattr(Resampling, resampling), src_nodata=0,
                       nodata=0) as v, rasterio.open(tmp, "w", **prof) as o:
            for r0 in range(0, h, rows):
                hh = min(rows, h - r0); win = Window(0, r0, w, hh)
                a = v.read(kenh, window=win)
                if bien_doi is not None:
                    a = bien_doi(a)
                if hinh is not None:
                    ngoai = geometry_mask([hinh], out_shape=a.shape[1:], transform=wtf(win, tf), invert=False)
                    a[:, ngoai] = 0
                for q in range(a.shape[0]):
                    dem[q + 1] += int((a[q] > 0).sum())
                o.write(a, window=win)
    if os.path.exists(out):
        os.remove(out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    tuy = dict(driver="COG", compress="DEFLATE", blocksize=blocksize, overviews=overviews, BIGTIFF="IF_SAFER")
    if overviews != "NONE":
        tuy["resampling"] = ov_resampling
    if len(kenh) > 3:
        tuy["predictor"] = "YES"
    rsh.copy(tmp, out, **tuy)
    os.remove(tmp)
    if tam:
        os.remove(src)
    return dem


def aef_mau_pca(cac_tep, nam_tc, n_mau=200000, rows=512, seed=0):
    """Khớp PCA 3 thành phần trên các điểm ảnh mẫu của năm tham chiếu (COG 64 kênh uint8). Trả phép chiếu
    {tb, thanh_phan (3 × 64), lo, hi (phân vị 2, 98 của từng thành phần)}."""
    import rasterio
    rng = np.random.default_rng(seed); X = []
    with rasterio.open(cac_tep[nam_tc]) as ds:
        h = ds.height; buoc = max(1, h // 64)
        for r0 in range(0, h, buoc):
            a = ds.read(window=((r0, r0 + 1), (0, ds.width)))[:, 0, :].T                   # một hàng mỗi `buoc` hàng
            a = a[(a > 0).all(axis=1)]
            if len(a):
                X.append(a[rng.choice(len(a), min(len(a), max(1, n_mau // 64)), replace=False)])
    X = aef_giai(np.concatenate(X)) if X else np.zeros((0, 64))
    assert len(X) > 100, "năm tham chiếu không có đủ điểm ảnh"
    m, tp = pca_khop(X)
    P = (X - m) @ tp.T
    return {"tb": m.round(6).tolist(), "thanh_phan": tp.round(6).tolist(), "lo": np.percentile(P, 2, axis=0).round(5).tolist(),
            "hi": np.percentile(P, 98, axis=0).round(5).tolist(), "nam_tham_chieu": nam_tc, "so_mau": int(len(X))}


def aef_rgb(src, out, pj, rows=512):
    """COG 64 kênh -> COG ảnh màu 3 thành phần chính (uint8 1..255, 0 = trống), cùng lưới, có ảnh thu nhỏ."""
    import rasterio
    import rasterio.shutil as rsh
    from rasterio.windows import Window
    m, tp, lo, hi = (np.array(pj[k]) for k in ("tb", "thanh_phan", "lo", "hi"))
    with rasterio.open(src) as ds:
        prof = dict(driver="GTiff", width=ds.width, height=ds.height, count=3, dtype="uint8", crs=ds.crs, transform=ds.transform, nodata=0,
                    tiled=True, blockxsize=256, blockysize=256, compress="deflate")
        tmp = out + ".tmp.tif"
        with rasterio.open(tmp, "w", **prof) as o:
            for r0 in range(0, ds.height, rows):
                hh = min(rows, ds.height - r0); win = Window(0, r0, ds.width, hh)
                a = ds.read(window=win)                                   # (64, hh, w)
                v = a.reshape(64, -1).T; ok_ = (v > 0).all(axis=1)
                P = (aef_giai(v) - m) @ tp.T
                b = np.zeros((len(v), 3), np.uint8)
                if ok_.any():
                    b[ok_] = byte_tuyen_tinh(P[ok_], lo, hi)
                o.write(b.T.reshape(3, hh, ds.width), window=win)
    if os.path.exists(out):
        os.remove(out)
    rsh.copy(tmp, out, driver="COG", compress="DEFLATE", blocksize=256, overviews="AUTO", resampling="AVERAGE")
    os.remove(tmp)


def muc_manifest(sp, nam=None, pj=None):
    """Mục manifest của các lớp sản phẩm sp (danh sách, vì một sản phẩm có thể có nhiều lớp)."""
    if sp == "AEF":
        return [dict(id="aef_rgb", ten="Embedding AlphaEarth, thành phần 1-2-3", ten_en="AlphaEarth embedding, components 1-2-3",
                     ten_ru="Эмбеддинг AlphaEarth, компоненты 1-2-3", kieu="rgb", nhom="aef", duong_dan="aef/aef_rgb_{y}.tif", nam=sorted(nam),
                     phep_chieu="aef/aef_phep_chieu.json", do_phan_giai_m=AEF_DO_PHAN_GIAI, nguon="GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL",
                     giay_phep="CC BY 4.0", trich_dan=TRICH["AEF"],
                     ghi_chu="3 thành phần chính của 64 chiều (PCA trên năm tham chiếu, cùng phép chiếu cho mọi năm), kéo giãn phân vị 2-98")]
    if sp == "DIST":
        return [dict(id="dist_tt", ten="OPERA DIST-ANN: xáo trộn thực vật trong năm", ten_en="OPERA DIST-ANN: annual vegetation disturbance",
                     ten_ru="OPERA DIST-ANN: нарушения растительности за год", kieu="lop", nhom="opera", duong_dan="opera/dist_tt_{y}.tif", nam=sorted(nam),
                     ten_lop={str(k): v[0] for k, v in DIST_LOP.items()}, bang_mau={str(k): v[1] for k, v in DIST_LOP.items()},
                     do_phan_giai_m=30, nguon="OPERA/DIST/L3_DIST-ANN-HLS/V1 (VEG-DIST-STATUS)", giay_phep="NASA EOSDIS, không hạn chế",
                     trich_dan=TRICH["DIST"], ghi_chu="mã gốc VEG-DIST-STATUS; 0 (không xáo trộn) để trong suốt"),
                dict(id="dist_max", ten="OPERA DIST-ANN: mức suy giảm thực vật lớn nhất", ten_en="OPERA DIST-ANN: maximum vegetation loss anomaly",
                     ten_ru="OPERA DIST-ANN: максимальная аномалия потери растительности", kieu="xam", nhom="opera", duong_dan="opera/dist_max_{y}.tif",
                     nam=sorted(nam), bang_mau_lien_tuc="magma", keo_gian=[0, 100], don_vi="%", do_phan_giai_m=30,
                     nguon="OPERA/DIST/L3_DIST-ANN-HLS/V1 (VEG-ANOM-MAX)", giay_phep="NASA EOSDIS, không hạn chế", trich_dan=TRICH["DIST"],
                     ghi_chu="chỉ nơi có xáo trộn (VEG-DIST-STATUS > 0)")]
    if sp == "NUOC":
        return [dict(id="nuoc_ts", ten="OPERA DSWx-HLS: tần suất có nước mặt", ten_en="OPERA DSWx-HLS: surface water frequency",
                     ten_ru="OPERA DSWx-HLS: частота наличия поверхностной воды", kieu="xam", nhom="opera", duong_dan="opera/nuoc_ts_{y}.tif",
                     nam=sorted(nam), bang_mau_lien_tuc="nuoc", keo_gian=[0, 100], don_vi="%", do_phan_giai_m=30,
                     nguon="OPERA/DSWX/L3_V1/HLS (WTR)", giay_phep="NASA EOSDIS, không hạn chế", trich_dan=TRICH["NUOC"],
                     ghi_chu=f"nước mở + nước một phần / số lần quan sát hợp lệ; bỏ điểm ảnh dưới {NUOC_TOI_THIEU} lần quan sát; năm 2023 từ tháng 4")]
    if sp == "DEN":
        return [dict(id="den_dem", ten="Ánh sáng đêm VIIRS (VNL v2.2)", ten_en="VIIRS night-time lights (VNL v2.2)", ten_ru="Ночные огни VIIRS (VNL v2.2)",
                     kieu="xam", nhom="den", duong_dan="den/den_{y}.tif", nam=sorted(nam), bang_mau_lien_tuc="den",
                     keo_gian=[0, round(math.log10(1 + DEN_MAX), 4)], log=True, don_vi="nW/cm²/sr", do_phan_giai_m=460,
                     nguon="NOAA/VIIRS/DNB/ANNUAL_V22 (average_masked)", giay_phep="dữ liệu công (EOG)", trich_dan=TRICH["DEN"],
                     ghi_chu="lưu theo log10(1 + bức xạ); trang đổi ngược khi hiện giá trị")]
    if sp == "NHA":
        return [dict(id="nha_cao", ten="GlobalBuildingAtlas: chiều cao nhà", ten_en="GlobalBuildingAtlas: building height", ten_ru="GlobalBuildingAtlas: высота зданий",
                     kieu="xam", nhom="nha", duong_dan="nha/nha_cao.tif", bang_mau_lien_tuc="nha", keo_gian=[0, NHA_CAO_MAX], don_vi="m", do_phan_giai_m=10,
                     nguon="projects/sat-io/open-datasets/GLOBAL_BUILDING_ATLAS", giay_phep="CC BY-NC 3.0", trich_dan=TRICH["NHA"],
                     ghi_chu="chiều cao lớn nhất của các nhà trong ô 10 m (đa giác vẽ ở 2 m rồi lấy lớn nhất); năm tham chiếu khoảng 2019"),
                dict(id="nha_phu", ten="GlobalBuildingAtlas: tỉ lệ phủ nhà", ten_en="GlobalBuildingAtlas: building cover", ten_ru="GlobalBuildingAtlas: доля застройки",
                     kieu="xam", nhom="nha", duong_dan="nha/nha_phu.tif", bang_mau_lien_tuc="nha", keo_gian=[0, 100], don_vi="%", do_phan_giai_m=10,
                     nguon="projects/sat-io/open-datasets/GLOBAL_BUILDING_ATLAS", giay_phep="CC BY-NC 3.0", trich_dan=TRICH["NHA"],
                     ghi_chu="phần trăm diện tích ô 10 m nằm trong đa giác nhà (vẽ ở 2 m)")]
    raise ValueError(sp)


def ghi_manifest(man, cac_lop, aef=None):
    """Thay các lớp cùng id, thêm mục aef (64 chiều), nâng phiên bản."""
    ids = {l["id"] for l in cac_lop}
    man["layers"] = [l for l in man.get("layers", []) if l["id"] not in ids] + cac_lop
    if aef:
        man["aef"] = aef
    man["phien_ban"] = max(int(man.get("phien_ban", 1)), 8); man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
    return man


# ---------------- ẢNH EARTH ENGINE (cần ee) ----------------
def anh_ee(ee, sp, y, vung):
    """ee.Image uint8 (một hay vài băng) của sản phẩm sp năm y, hoặc None nếu không có ảnh."""
    if sp == "AEF":
        col = ee.ImageCollection("GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL").filterDate(f"{y}-01-01", f"{y + 1}-01-01").filterBounds(vung)
        x = col.mosaic()
        q = x.abs().sqrt().multiply(127.5).round().multiply(x.signum()).clamp(-127, 127).add(128)
        return q.unmask(0).toUint8(), col.size()
    if sp == "DIST":
        col = ee.ImageCollection("OPERA/DIST/L3_DIST-ANN-HLS/V1").filterDate(f"{y}-01-01", f"{y + 1}-01-01").filterBounds(vung)
        m = col.mosaic(); st = m.select("VEG-DIST-STATUS"); co = st.gt(0).And(st.lte(10))
        an = m.select("VEG-ANOM-MAX").min(100).multiply(2.54).add(1).round()
        return ee.Image.cat([st.updateMask(co), an.updateMask(co)]).unmask(0).toUint8(), col.size()
    if sp == "NUOC":
        col = ee.ImageCollection("OPERA/DSWX/L3_V1/HLS").filterDate(f"{y}-01-01", f"{y + 1}-01-01").filterBounds(vung).select("WTR_Water_classification")
        hop = col.map(lambda i: i.lt(252)).sum(); nuoc = col.map(lambda i: i.eq(1).Or(i.eq(2))).sum()
        ts = nuoc.divide(hop.max(1)).multiply(100)
        b = ts.multiply(2.54).add(1).round().updateMask(hop.gte(NUOC_TOI_THIEU))
        return ee.Image.cat([b, hop.min(254).add(1)]).unmask(0).toUint8(), col.size()
    if sp == "DEN":
        col = ee.ImageCollection("NOAA/VIIRS/DNB/ANNUAL_V22").filterDate(f"{y}-01-01", f"{y + 1}-01-01")
        r = col.first().select("average_masked").max(0)
        b = r.add(1).log10().divide(math.log10(1 + DEN_MAX)).min(1).multiply(254).add(1).round()
        return b.unmask(0).toUint8(), col.size()
    raise ValueError(sp)


def anh_nha(ee, vung, bb_ll, crs):
    """Chiều cao lớn nhất (m) và tỉ lệ phủ nhà (%) trong ô 10 m, từ đa giác GBA vẽ ở 2 m."""
    fc = ee.FeatureCollection([ee.FeatureCollection(f"projects/sat-io/open-datasets/GLOBAL_BUILDING_ATLAS/{o}") for o in gba_cac_o(bb_ll)]).flatten()
    fc = fc.filterBounds(vung).filter(ee.Filter.gt("height", 0))
    proj2 = ee.Projection(crs).atScale(2)
    cao = fc.reduceToImage(["height"], ee.Reducer.max()).reproject(proj2)
    phu = cao.gt(0).unmask(0)
    p10 = ee.Projection(crs).atScale(10)
    cao10 = cao.reduceResolution(ee.Reducer.max(), maxPixels=64).reproject(p10)
    phu10 = phu.reduceResolution(ee.Reducer.mean(), maxPixels=64).reproject(p10)
    b1 = cao10.min(NHA_CAO_MAX).divide(NHA_CAO_MAX).multiply(254).add(1).round()
    b2 = phu10.multiply(254).add(1).round().updateMask(phu10.gt(0))
    return ee.Image.cat([b1, b2]).unmask(0).toUint8()


def xuat(ee, img, ten, vung, grid, r, thu_muc=THU_MUC_DRIVE):
    """Xuất sang Drive theo lưới UTM của bộ dữ liệu (bước r m, gốc trùng lưới)."""
    t = ee.batch.Export.image.toDrive(image=img.clip(vung), description=ten, folder=thu_muc, fileNamePrefix=ten, region=vung,
                                      crs=grid["crs"], crsTransform=[r, 0, grid["x0"], 0, -r, grid["y0"]], maxPixels=int(1e13),
                                      fileFormat="GeoTIFF")
    t.start()
    return ten


def cho_xong(ee, ten, phut=360, verbose=True):
    """Chờ các lệnh xuất tên `ten` xong; trả {tên: trạng thái}."""
    t0 = time.time(); kq = {}
    while time.time() - t0 < phut * 60:
        kq = {}
        for t in ee.batch.Task.list()[:400]:
            s = t.status(); d = s.get("description", "")
            if d in ten and d not in kq:
                kq[d] = s.get("state")
        con = [d for d in ten if kq.get(d) not in ("COMPLETED", "FAILED", "CANCELLED")]
        if verbose:
            print(f"\r  xong {sum(v == 'COMPLETED' for v in kq.values())}/{len(ten)}, lỗi {sum(v in ('FAILED', 'CANCELLED') for v in kq.values())}",
                  end="", flush=True)
        if not con:
            break
        time.sleep(30)
    if verbose:
        print()
    return kq


# ---------------- CHẠY (Colab) ----------------
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
import subprocess
subprocess.run(["pip", "install", "-q", "rasterio", "geopandas", "huggingface_hub", "earthengine-api"], check=False)
import geopandas as gpd
import ee
from shapely.ops import unary_union
assert GEE_PROJECT, "điền GEE_PROJECT (dự án Earth Engine)"
ee.Authenticate(); ee.Initialize(project=GEE_PROJECT)
D = "/content/drive/MyDrive"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"; TMP = "/content/tmp_311"; os.makedirs(TMP, exist_ok=True)
for d_ in ["aef", "opera", "den", "nha"]:
    os.makedirs(f"{HF_DIR}/{d_}", exist_ok=True)
man = json.load(open(f"{HF_DIR}/manifest.json"))
xa = gpd.read_file(f"{HF_DIR}/{man.get('ranh_gioi_xa', 'ranh_gioi/xa.geojson')}")
bien = unary_union(list(xa.geometry)); BB = tuple(xa.total_bounds)
grid_utm = man["grid"]; bu = xa.to_crs(grid_utm["crs"]).total_bounds
G10 = luoi_3857(bu, grid_utm["crs"], 10.0); G30 = luoi_3857(bu, grid_utm["crs"], 30.0); G100 = luoi_3857(bu, grid_utm["crs"], 100.0)
GAEF = luoi_3857(bu, grid_utm["crs"], float(AEF_DO_PHAN_GIAI))
hinh3857 = gpd.GeoSeries([bien], crs="EPSG:4326").to_crs("EPSG:3857").iloc[0]
vung = ee.Geometry.Rectangle(list(BB), "EPSG:4326", False)
tok = None
if GUI_LEN:
    from huggingface_hub import HfApi
    try:
        from google.colab import userdata; tok = userdata.get("HF_TOKEN")
    except Exception:
        import getpass; tok = getpass.getpass("HF token (quyền ghi): ")
    api = HfApi(token=tok); tren_hf = set(api.list_repo_files(HF_REPO, repo_type="dataset"))
else:
    tren_hf = set()
NAM = {"AEF": NAM_AEF, "DIST": NAM_DIST, "NUOC": NAM_NUOC, "DEN": NAM_DEN}
BUOC = {"AEF": AEF_DO_PHAN_GIAI, "DIST": 30, "NUOC": 30, "DEN": 100}
DICH = {"AEF": "aef/aef64_{y}.tif", "DIST": "opera/dist_tt_{y}.tif", "NUOC": "opera/nuoc_ts_{y}.tif", "DEN": "den/den_{y}.tif"}
# 1. xuất những gì còn thiếu (năm không có ảnh trên Earth Engine thì bỏ)
viec, co_nam = [], {k: [] for k in NAM}
for sp in [s for s in SAN_PHAM if s in NAM and s != "AEF"]:                  # AEF làm riêng từng năm ở bước 2
    for y in NAM[sp]:
        ten = f"HP311_{sp}_{y}"
        if not LAM_LAI and DICH[sp].format(y=y) in tren_hf:
            co_nam[sp].append(y); continue
        if glob.glob(f"{D}/{THU_MUC_DRIVE}/{ten}*.tif"):
            co_nam[sp].append(y); continue
        img, n = anh_ee(ee, sp, y, vung)
        if n.getInfo() == 0:
            print(f"  {sp} {y}: không có ảnh trên Earth Engine, bỏ"); continue
        viec.append(xuat(ee, img, ten, vung, grid_utm, BUOC[sp])); co_nam[sp].append(y); print("  xuất", ten)
if "NHA" in SAN_PHAM and (LAM_LAI or "nha/nha_cao.tif" not in tren_hf) and not glob.glob(f"{D}/{THU_MUC_DRIVE}/HP311_NHA*.tif"):
    viec.append(xuat(ee, anh_nha(ee, vung, BB, grid_utm["crs"]), "HP311_NHA", vung, grid_utm, 10)); print("  xuất HP311_NHA")
if viec:
    print("chờ Earth Engine (xem thêm ở code.earthengine.google.com/tasks)…")
    tt = cho_xong(ee, viec)
    for d, s in tt.items():
        if s != "COMPLETED":
            print("  KHÔNG xong:", d, s)
    time.sleep(60)                                   # Drive cần thời gian đồng bộ tệp mới
# 2. COG 3857, cắt theo ranh giới
moi, lop, aef_muc, tk = [], [], None, {}
manh = lambda ten: sorted(glob.glob(f"{D}/{THU_MUC_DRIVE}/{ten}*.tif"))
for sp in [s for s in ["DIST", "NUOC", "DEN"] if s in SAN_PHAM]:
    xong = []
    for y in co_nam[sp]:
        m_ = manh(f"HP311_{sp}_{y}")
        if not m_:
            if DICH[sp].format(y=y) in tren_hf:
                xong.append(y)
            continue
        if sp == "DIST":
            tk[f"dist_{y}"] = ra_cog(m_, f"{HF_DIR}/opera/dist_tt_{y}.tif", G30, hinh3857, kenh=[1], tmp_dir=TMP, ov_resampling="MODE")
            ra_cog(m_, f"{HF_DIR}/opera/dist_max_{y}.tif", G30, hinh3857, kenh=[2], tmp_dir=TMP); moi += [f"opera/dist_tt_{y}.tif", f"opera/dist_max_{y}.tif"]
        elif sp == "NUOC":
            tk[f"nuoc_{y}"] = ra_cog(m_, f"{HF_DIR}/opera/nuoc_ts_{y}.tif", G30, hinh3857, kenh=[1], tmp_dir=TMP); moi.append(f"opera/nuoc_ts_{y}.tif")
        else:
            tk[f"den_{y}"] = ra_cog(m_, f"{HF_DIR}/den/den_{y}.tif", G100, hinh3857, kenh=[1], tmp_dir=TMP, resampling="bilinear"); moi.append(f"den/den_{y}.tif")
        xong.append(y); print(f"  {sp} {y} xong")
    if xong:
        lop += muc_manifest(sp, xong)
if "NHA" in SAN_PHAM:
    m_ = manh("HP311_NHA")
    if m_:
        tk["nha"] = ra_cog(m_, f"{HF_DIR}/nha/nha_cao.tif", G10, hinh3857, kenh=[1], tmp_dir=TMP, ov_resampling="MAX")
        ra_cog(m_, f"{HF_DIR}/nha/nha_phu.tif", G10, hinh3857, kenh=[2], tmp_dir=TMP); moi += ["nha/nha_cao.tif", "nha/nha_phu.tif"]
    if m_ or "nha/nha_cao.tif" in tren_hf:
        lop += muc_manifest("NHA")
if "AEF" in SAN_PHAM:
    xong, pj = [], None
    if os.path.exists(f"{HF_DIR}/aef/aef_phep_chieu.json") and not LAM_LAI:
        pj = json.load(open(f"{HF_DIR}/aef/aef_phep_chieu.json"))
    thu_tu = sorted(NAM_AEF, key=lambda y: (y != AEF_NAM_THAM_CHIEU, y))            # năm tham chiếu trước: khớp PCA một lần
    for y in thu_tu:
        ten = f"HP311_AEF_{y}"; dich = f"{HF_DIR}/aef/aef64_{y}.tif"
        if not LAM_LAI and f"aef/aef64_{y}.tif" in tren_hf and f"aef/aef_rgb_{y}.tif" in tren_hf:
            xong.append(y); continue
        if not manh(ten) and not os.path.exists(dich):
            img, n = anh_ee(ee, "AEF", y, vung)
            if n.getInfo() == 0:
                print(f"  AEF {y}: không có ảnh trên Earth Engine, bỏ"); continue
            xuat(ee, img, ten, vung, grid_utm, AEF_DO_PHAN_GIAI); print("  xuất", ten, "(chờ, có thể lâu)")
            cho_xong(ee, [ten]); time.sleep(60)
        if manh(ten):
            ra_cog(manh(ten), dich, GAEF, hinh3857, tmp_dir=TMP, rows=256, blocksize=128, overviews="NONE")
        if not os.path.exists(dich):
            print(f"  AEF {y}: không có tệp"); continue
        print(f"  AEF {y}: {os.path.getsize(dich) / 1e9:.2f} GB")
        if pj is None:
            pj = aef_mau_pca({y: dich}, y)
            json.dump(pj, open(f"{HF_DIR}/aef/aef_phep_chieu.json", "w")); moi.append("aef/aef_phep_chieu.json")
        aef_rgb(dich, f"{HF_DIR}/aef/aef_rgb_{y}.tif", pj); xong.append(y)
        if GUI_LEN:
            for t in [f"aef/aef64_{y}.tif", f"aef/aef_rgb_{y}.tif"] + (["aef/aef_phep_chieu.json"] if "aef/aef_phep_chieu.json" in moi else []):
                api.upload_file(path_or_fileobj=f"{HF_DIR}/{t}", path_in_repo=t, repo_id=HF_REPO, repo_type="dataset", commit_message=f"Geoportal 3.11: AlphaEarth {y}")
            moi = [t for t in moi if t != "aef/aef_phep_chieu.json"]
            if AEF_TUNG_NAM:                        # giữ chỗ Drive: bỏ ảnh xuất và bản 64 kênh (đã ở Hugging Face)
                for f in manh(ten) + [dich]:
                    os.remove(f)
    if xong:
        lop += muc_manifest("AEF", xong)
        aef_muc = dict(duong_dan="aef/aef64_{y}.tif", nam=sorted(xong), kenh=64, ma_hoa="u8 = round(sign(x)·sqrt|x|·127.5) + 128; 0 = trống",
                       do_phan_giai_m=AEF_DO_PHAN_GIAI, nguon="GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL", giay_phep="CC BY 4.0", trich_dan=TRICH["AEF"])
json.dump(tk, open(f"{HF_DIR}/thong_ke_311.json", "w"), indent=1)
if not os.path.exists(f"{HF_DIR}/manifest_v7.json"):
    shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v7.json")
man = ghi_manifest(man, lop, aef_muc)
json.dump(man, open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## Nguồn mới (3.11)")[0]
rd += f"\n## Nguồn mới (3.11, {time.strftime('%Y-%m-%d')})\n" + "".join(f"- `{l['duong_dan']}`: {l['ten']}. {l['ghi_chu']}. {l['giay_phep']}. {l['trich_dan']}.\n" for l in lop)
if aef_muc:
    rd += f"- `aef/aef64_{{năm}}.tif`: AlphaEarth 64 chiều, {aef_muc['ma_hoa']}, COG EPSG:3857, ô 128 × 128, không có ảnh thu nhỏ.\n"
open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)
if GUI_LEN and moi:
    for t in moi + ["thong_ke_311.json", "manifest.json", "manifest_v7.json", "README.md"]:
        api.upload_file(path_or_fileobj=f"{HF_DIR}/{t}", path_in_repo=t, repo_id=HF_REPO, repo_type="dataset", commit_message="Geoportal 3.11: nguồn mới")
    print("đã đẩy lên", HF_REPO, len(moi), "tệp")
