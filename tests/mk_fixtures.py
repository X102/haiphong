# Dữ liệu giả cho các bài thử trang lấy mẫu: COG 3857 (s2tc, lulc_ctx, pc1, g7, g7b), ảnh PC dữ liệu,
# hai xã, 4 "làng" tròn và 6 "dải đường" bị chọn nhầm. Ghi vào /tmp/fx/data + /tmp/fx/ref*.json.
import sys, json, os, shutil, numpy as np, pandas as pd, rasterio, geopandas as gpd
from rasterio.transform import from_origin
from shapely.geometry import box
from pyproj import Transformer
HERE = os.path.dirname(os.path.abspath(__file__))
GOC = next(d for d in (os.path.dirname(HERE), os.path.join(os.path.dirname(HERE), "colab")) if os.path.exists(os.path.join(d, "s2_hf_lop.py")))
sys.path.insert(0, GOC)                     # thư mục dựng (có s2_hf_lop.py) hoặc kho GitHub (colab/)
import s2_hf_lop as H
FX = "/tmp/fx"; R = f"{FX}/data"; shutil.rmtree(FX, ignore_errors=True); os.makedirs(R)
rng = np.random.default_rng(3)
Hh, W, x0, y0 = 1200, 1500, 660000.0, 2320000.0
yy, xx = np.mgrid[0:Hh, 0:W]
s2 = np.stack([(1000 + 3 * xx + b * 50 + rng.normal(0, 30, (Hh, W))) for b in range(10)]).clip(1, 9000).astype(np.int16)
s2[:, :100, :100] = 0
with rasterio.open(f"{FX}/s2.tif", "w", driver="GTiff", width=W, height=Hh, count=10, dtype="int16", crs="EPSG:32648",
                   transform=from_origin(x0, y0, 10, 10)) as o: o.write(s2)
grid = H.grid_3857((x0, y0 - Hh * 10, x0 + W * 10, y0), res=10)
for d in ["s2tc", "lulc_ctx", "pc", "diem", "pc1", "g7", "g7b", "ranh_gioi", "s2d", "emb", "osm"]: os.makedirs(f"{R}/{d}")
for y in (2023, 2025):
    H.rgb_cog(f"{FX}/s2.tif", [3, 2, 1], [1000] * 3, [6000] * 3, f"{R}/s2tc/s2tc_{y}.tif", grid, tmp_dir=FX, verbose=False)
cls = (1 + (xx // 500) % 3).astype(np.uint8); cls[:100, :100] = 0
with rasterio.open(f"{FX}/cls.tif", "w", driver="GTiff", width=W, height=Hh, count=1, dtype="uint8", crs="EPSG:32648",
                   transform=from_origin(x0, y0, 10, 10), nodata=0) as o: o.write(cls[None])
H.class_cog(f"{FX}/cls.tif", f"{R}/lulc_ctx/lulc_ctx_2025.tif", grid, tmp_dir=FX, verbose=False)
shutil.copyfile(f"{R}/lulc_ctx/lulc_ctx_2025.tif", f"{R}/lulc_ctx/lulc_ctx_2023.tif")
k, feats = 3, ["NDVI", "MNDWI", "B8"]
bang = [f"{f}_p{i + 1:02d}" for i in range(6) for f in feats]; nb = len(bang)
Wm = np.linalg.qr(rng.normal(size=(nb, nb)))[0][:k]
he = dict(W=Wm.tolist(), mean=(rng.normal(size=nb) * .2).tolist(), std=np.abs(rng.normal(.3, .05, nb)).tolist(), bang=bang, he_so_nhan=100)
pcs = (rng.normal(size=(k, Hh, W)) * 100).astype(np.int16)
arr = np.concatenate([pcs, np.full((1, Hh, W), 6), rng.integers(0, 3, (1, Hh, W))]).astype(np.int16)
arr[:, 0:5, 0:5] = -32768
with rasterio.open(f"{FX}/pcraw.tif", "w", driver="GTiff", width=W, height=Hh, count=k + 2, dtype="int16", crs="EPSG:32648",
                   transform=from_origin(x0, y0, 10, 10), nodata=-32768) as o:
    o.write(arr); o.descriptions = tuple([f"PC{i:02d}" for i in range(1, k + 1)] + ["NOBS", "NFILL"])
H.pc_cog(f"{FX}/pcraw.tif", f"{R}/pc/pc_2025.tif", k=k, tmp_dir=FX, verbose=False)
H.gray_cog(f"{FX}/pcraw.tif", 1, -300, 300, f"{R}/pc1/pc1_2025.tif", grid, nodata=-32768, tmp_dir=FX, verbose=False)
T = Transformer.from_crs(32648, 4326, always_xy=True)
rc = [(200, 300), (700, 1100), (1000, 50), (2, 2)]
xs = np.array([x0 + 10 * c + 5 for r, c in rc]); ys = np.array([y0 - 10 * r - 5 for r, c in rc])
lon, lat = T.transform(xs, ys)
pd.DataFrame(dict(id=[f"E{i:04d}" for i in range(len(rc))], lon=lon, lat=lat, x_utm=xs, y_utm=ys, tang=[1, 2, 3, 1],
                  goi_y_2025=[1, 2, 3, 0])).to_csv(f"{R}/diem/E0_900.csv", index=False)
cv = H.pc_curves(xs, ys, [2025], {2025: f"{FX}/pcraw.tif"}, he, k=k)
# bản 2.1: ảnh S2 10 băng (COG int16, lưới UTM gốc) dựng bằng đúng hàm của ô Colab HF_S2D_CTX_cell.py; 2023 = 2025 − 200
ns = {}; exec(open(os.path.join(GOC, "HF_S2D_CTX_cell.py"), encoding="utf-8").read().split("# ---------------- CHẠY (Colab)")[0], ns)
s2_23 = np.where(s2 > 0, np.clip(s2.astype(np.int32) - 200, 1, 9000), 0).astype(np.int16)
s2_23[:, 300:330, 700:760] = 5000                                  # một mảng sáng bất thường năm 2023
with rasterio.open(f"{FX}/s2_2023.tif", "w", driver="GTiff", width=W, height=Hh, count=10, dtype="int16", crs="EPSG:32648",
                   transform=from_origin(x0, y0, 10, 10)) as o: o.write(s2_23)
ns["s2d_cog"](f"{FX}/s2.tif", f"{R}/s2d/s2d_2025.tif"); ns["s2d_cog"](f"{FX}/s2_2023.tif", f"{R}/s2d/s2d_2023.tif")
assert ns["kiem_s2d"](f"{FX}/s2.tif", f"{R}/s2d/s2d_2025.tif")[0] == 0
KG = ns["s2d_keo_gian"](f"{FX}/s2.tif", n_win=20, win=200)
json.dump(dict(mu=[0] * 64, comps=[[0] * 64] * 6, lo=[-3, -2, -1, -4, -5, -6], hi=[3, 2, 1, 4, 5, 6]), open(f"{R}/emb/g7_phep_chieu.json", "w"))
json.dump(dict(id=[f"E{i:04d}" for i in range(len(rc))], ky=[[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]], k=k, nam=cv),
          open(f"{R}/diem/E0_900_duong_cong.json", "w"))
# embedding giả: 4 làng tròn (bán kính 30 px) + 6 dải đường (5 × 90 px) có phổ gần làng; 2023 thiếu làng số 2
lang = [(300, 400), (800, 300), (600, 1100), (900, 1300)]
dai = [(120, 150), (160, 560), (430, 180), (470, 600), (660, 520), (700, 150)]
bg = np.array([80, 150, 60, 140, 70, 160], float); vl = np.array([200, 60, 120, 90, 180, 40], float)
for y, bo_lang in [(2023, {2}), (2025, set())]:
    m = np.zeros((Hh, W), bool)
    for i, (r0, c0) in enumerate(lang):
        if i not in bo_lang: m |= (yy - r0) ** 2 + (xx - c0) ** 2 < 30 ** 2
    a = np.where(m[None], vl[:, None, None], bg[:, None, None]) + rng.normal(0, 4, (6, Hh, W))
    for (r0, c0) in dai:
        a[:, r0:r0 + 5, c0:c0 + 90] = np.array([188, 72, 114, 96, 168, 52], float)[:, None, None] + rng.normal(0, 4, (6, 5, 90))
    a = np.clip(np.round(a), 1, 255).astype(np.uint8)
    with rasterio.open(f"{FX}/g7u8_{y}.tif", "w", driver="GTiff", width=W, height=Hh, count=6, dtype="uint8", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10), nodata=0) as o: o.write(a)
    H.rgb_cog_nhom(f"{FX}/g7u8_{y}.tif", [([1, 2, 3], f"{R}/g7/g7_{y}.tif"), ([4, 5, 6], f"{R}/g7b/g7b_{y}.tif")], grid, tmp_dir=FX, verbose=False)
xmid = x0 + W * 5
xa = gpd.GeoDataFrame({"ten_xa": ["Tây", "Đông"]}, geometry=[box(x0, y0 - Hh * 10, xmid, y0), box(xmid, y0 - Hh * 10, x0 + W * 10, y0)], crs="EPSG:32648").to_crs(4326)
xa.to_file(f"{R}/ranh_gioi/xa.geojson", driver="GeoJSON")
man = H.make_manifest("test/x", [
    dict(id="s2tc", ten="S2 màu thật", kieu="rgb", duong_dan="s2tc/s2tc_{y}.tif", nam=[2023, 2025]),
    dict(id="lulc_ctx", ten="CTX", kieu="lop", duong_dan="lulc_ctx/lulc_ctx_{y}.tif", nam=[2023, 2025],
         bang_mau={"1": "#2e9d3a", "2": "#1f5fbf", "3": "#d7191c"}, ten_lop={"1": "thực vật", "2": "nước", "3": "xây dựng"}),
    dict(id="pc1", ten="PC1", kieu="xam", bang_mau_lien_tuc="rdbu", duong_dan="pc1/pc1_{y}.tif", nam=[2025]),
    dict(id="g7", ten="Embedding g7, thành phần 1-2-3", kieu="rgb", duong_dan="g7/g7_{y}.tif", nam=[2023, 2025], phep_chieu="emb/g7_phep_chieu.json"),
    dict(id="g7b", ten="Embedding g7, thành phần 4-5-6", kieu="rgb", duong_dan="g7b/g7b_{y}.tif", nam=[2023, 2025], phep_chieu="emb/g7_phep_chieu.json")],
    [2023, 2025], dict(crs="EPSG:32648", x0=615610.0, y0=2352020.0, res=10.0),
    [dict(id="E0", ten="E0 thử", duong_dan="diem/E0_900.csv", duong_cong="diem/E0_900_duong_cong.json")],
    dict(feats=feats), dict(duong_dan="pc/pc_{y}.tif", nam=[2025], k=k, crs="EPSG:32648", he_so=he))
man["ranh_gioi_xa"] = "ranh_gioi/xa.geojson"
# bản 2.2: OpenStreetMap giả (đúng hàm chuẩn hoá và ghi của ô Colab HF_OSM_cell.py): 4 làng = landuse=residential,
# 1 khu công nghiệp, 1 cánh đồng lúa, 3 ao nuôi, nhà trong làng, 2 con đường, 3 điểm quan tâm
from shapely.geometry import Point as SP, LineString as SL, box as SB
no = {}; exec(open(os.path.join(GOC, "HF_OSM_cell.py"), encoding="utf-8").read().split("# ---------------- CHẠY (Colab)")[0], no)
TL = Transformer.from_crs(32648, 4326, always_xy=True)
def ll_box(r0, c0, r1, c1):                     # hàng, cột điểm ảnh của lưới UTM giả
    (a0, b0), (a1, b1) = TL.transform(x0 + c0 * 10, y0 - r1 * 10), TL.transform(x0 + c1 * 10, y0 - r0 * 10)
    return SB(a0, b0, a1, b1)
def ll_circle(r, c, rad):
    lo, la = TL.transform(x0 + c * 10 + 5, y0 - r * 10 - 5); return SP(lo, la).buffer(rad * 10 / 111000 / np.cos(np.radians(la)), 24)
def gdf_osm(rows):
    idx = pd.MultiIndex.from_tuples([(r[0], r[1]) for r in rows], names=["element", "id"])
    cols = sorted({k for r in rows for k in r[2]})
    return gpd.GeoDataFrame({k: [r[2].get(k) for r in rows] for k in cols}, geometry=[r[3] for r in rows], index=idx, crs=4326)
sdd = [("way", 100 + i, {"landuse": "residential", "name": f"Làng {i + 1}"}, ll_circle(r, c, 30)) for i, (r, c) in enumerate(lang)]
sdd += [("way", 200, {"landuse": "industrial", "name": "KCN thử"}, ll_box(900, 900, 1100, 1300)),
        ("way", 201, {"landuse": "farmland", "crop": "rice"}, ll_box(100, 1200, 300, 1450)),
        ("relation", 202, {"landuse": "farmland"}, ll_box(1000, 150, 1150, 400))]
nuoc = [("way", 300 + i, {"natural": "water", "water": "pond"}, ll_box(r, c, r + 25, c + 40)) for i, (r, c) in enumerate([(500, 700), (540, 760), (580, 820)])]
nha = [("way", 400 + k, {"building": "house"}, ll_box(r - 2 + dy, c - 2 + dx, r + dy, c + dx)) for k, ((r, c), (dy, dx)) in
       enumerate([(q, d) for q in lang for d in [(0, 0), (8, 5), (-6, 9), (4, -8)]])]
duong = [("way", 500, {"highway": "primary", "name": "Đường thử"}, SL([TL.transform(x0 + 50 * 10, y0 - 600 * 10), TL.transform(x0 + 1400 * 10, y0 - 620 * 10)])),
         ("way", 501, {"highway": "residential"}, SL([TL.transform(x0 + 300 * 10, y0 - 100 * 10), TL.transform(x0 + 320 * 10, y0 - 1100 * 10)]))]
diem = [("node", 600 + i, t, SP(*TL.transform(x0 + c * 10 + 5, y0 - r * 10 - 5))) for i, (r, c, t) in
        enumerate([(300, 400, {"amenity": "school", "name": "Trường thử"}), (800, 300, {"amenity": "marketplace"}), (600, 1100, {"place": "village", "name": "Thôn C"})])]
ranh_ll = SB(*TL.transform(x0, y0 - Hh * 10), *TL.transform(x0 + W * 10, y0))
osm_lop = []
for cid, rows in [("sdd", sdd), ("nuoc", nuoc), ("nha", nha), ("duong", duong), ("diem", diem)]:
    ten, hinh, _ = no["CHU_DE"][cid]
    g_ = no["chuan_hoa"](gdf_osm(rows), hinh, ranh_ll); no["ghi_fgb"](g_, f"{R}/osm/{cid}.fgb")
    osm_lop.append(dict(id=cid, ten=ten, hinh=hinh, duong_dan=f"osm/{cid}.fgb", n=int(len(g_))))
json.dump(dict(hf_repo="x/khong-dung", bao_loi=dict(email="baoloi@example.org", github="nguoidung/haiphong-geoportal")), open(f"{R}/cau_hinh.json", "w"))
man_osm = dict(ngay="2026-09-29", nguon="© OpenStreetMap contributors, ODbL 1.0", lop=osm_lop)
man["s2d"] = dict(duong_dan="s2d/s2d_{y}.tif", nam=[2023, 2025], bang=ns["S2_BANDS"], crs="EPSG:32648", keo_gian=KG)
man["osm"] = man_osm
json.dump(man, open(f"{R}/manifest.json", "w"), ensure_ascii=False)
T3 = Transformer.from_crs(32648, 3857, always_xy=True)
mx, my = T3.transform(xs, ys)
ref = {}
with rasterio.open(f"{R}/s2tc/s2tc_2025.tif") as d: ref["rgb"] = [list(map(int, v)) for v in d.sample(zip(mx, my))]
with rasterio.open(f"{R}/lulc_ctx/lulc_ctx_2025.tif") as d: ref["cls"] = [int(v[0]) for v in d.sample(zip(mx, my))]
ref["pts"] = [dict(x=float(a), y=float(b), mx=float(c), my=float(e)) for a, b, c, e in zip(xs, ys, mx, my)]
ref["curves"] = cv["2025"]
# CTX, chỉ số tham chiếu: đúng công thức s2_classify.context_features (uniform_filter mode nearest, float32)
from scipy.ndimage import uniform_filter
ref["s2d"] = {}
for y, arr in [(2025, s2), (2023, s2_23)]:
    rows = [int(round((y0 - b) / 10 - 0.5)) for b in ys]; cols = [int(round((a - x0) / 10 - 0.5)) for a in xs]
    out = []
    for r, c in zip(rows, cols):
        d = {"v": [int(arr[b, r, c]) for b in range(10)]}
        for w in (5, 15):
            m_ = [float(uniform_filter(arr[b].astype(np.float32), w, mode="nearest")[r, c]) for b in range(10)]
            q_ = [float(uniform_filter(arr[b].astype(np.float32) ** 2, w, mode="nearest")[r, c]) for b in range(10)]
            d[f"m{w}"] = m_; d[f"s{w}"] = [float(np.sqrt(max(q - m * m, 0))) for q, m in zip(q_, m_)]
        out.append(d)
    ref["s2d"][str(y)] = out
# một điểm sát mép phải dưới của ảnh (biên kiểu nearest)
rb, cb = Hh - 2, W - 3
ref["s2d_bien"] = {"x": x0 + cb * 10 + 5, "y": y0 - rb * 10 - 5, "s15": [float(np.sqrt(max(
    uniform_filter(s2[b].astype(np.float32) ** 2, 15, mode="nearest")[rb, cb] - uniform_filter(s2[b].astype(np.float32), 15, mode="nearest")[rb, cb] ** 2, 0)))
    for b in range(10)]}
json.dump(ref, open(f"{FX}/ref.json", "w"))
json.dump({"lang": [list(T.transform(x0 + c * 10 + 5, y0 - r * 10 - 5)) for r, c in lang], "ha_lang": float(np.pi * 900 * 100 / 1e4),
           "dai": [list(T.transform(x0 + (c + 45) * 10, y0 - (r + 2.5) * 10)) for r, c in dai]}, open(f"{FX}/ref_vung.json", "w"))
print("dữ liệu giả xong:", sorted(os.listdir(R)))
