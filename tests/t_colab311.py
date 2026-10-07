# Kiểm thử phần hàm của ô Colab bản 3.11 (HF_311_NGUON_MOI_cell.py): lượng tử AEF, PCA, đổi byte, tên ô GBA, COG 3857 64 kênh
# từ ảnh xuất giả có mảnh ghép, ảnh màu PCA, manifest, và dựng biểu thức Earth Engine bằng ee giả (không gọi mạng).
import json, os, pathlib, tempfile, math
import numpy as np

D = pathlib.Path(__file__).resolve().parent.parent
tim = lambda ten: next(p for p in [D / ten, D / "colab" / ten, D / "src" / ten] if p.exists())
loi = []
def ok(dk, t):
    print(("  ok  " if dk else "  LỖI ") + t)
    if not dk: loi.append(t)
ns = {}
exec(compile(tim("HF_311_NGUON_MOI_cell.py").read_text(encoding="utf-8").split("# ---------------- CHẠY (Colab)")[0], "HF_311", "exec"), ns)
C = type("C", (), ns)

# ---------- 1. lượng tử AEF
x = np.linspace(-1, 1, 2001)
u = C.aef_luong_tu(x); g = C.aef_giai(u)
ok(u.dtype == np.uint8 and u.min() >= 1 and u.max() <= 255 and u[1000] == 128, "lượng tử AEF: uint8 1..255, 0 dành cho trống, 0 -> 128")
ok(np.nanmax(np.abs(g - x)) < 0.016, f"giải lượng tử sai tối đa {np.nanmax(np.abs(g - x)):.4f} (bước căn bậc hai, khớp bản gốc)")
ok(np.isnan(C.aef_giai(np.array([0, 200]))[0]), "mã 0 -> trống")
# đúng công thức của README Google: ((q / 127.5) ** 2) * sign(q) với q int8
q = np.array([-127, -64, 0, 33, 127]); ok(np.allclose(C.aef_giai(q + 128), ((q / 127.5) ** 2) * np.sign(q)), "khớp công thức giải lượng tử của Google")

# ---------- 2. PCA, byte
rng = np.random.default_rng(1)
X = rng.normal(size=(500, 64)) * np.r_[6.0, 3.0, 2.0, np.linspace(1, 0.1, 61)]
m, tp = C.pca_khop(X)
ok(tp.shape == (3, 64) and np.allclose(tp @ tp.T, np.eye(3), atol=1e-8) and np.argmax(np.abs(tp[0])) == 0, "PCA: 3 thành phần trực chuẩn, thành phần 1 theo chiều biến thiên lớn nhất")
b = C.byte_tuyen_tinh(np.array([-1, 0, 50, 100, 200, np.nan]), 0, 100)
ok(list(b) == [1, 1, 128, 255, 255, 0], "đổi byte: bám đầu mút, nan -> 0: " + str(list(b)))

# ---------- 3. ô GBA
ok(C.gba_o(106.6, 20.9) == "e105_n25_e110_n20" and C.gba_o(-70.2, -33.4) == "w075_s30_w070_s35", "tên ô GBA: e105_n25_e110_n20 (Hải Phòng), w075_s30_w070_s35")
ok(C.gba_cac_o((106.1, 20.5, 107.1, 21.1)) == ["e105_n25_e110_n20"] and len(C.gba_cac_o((104.5, 19.5, 106, 21))) == 4, "danh sách ô GBA phủ hộp bao")

# ---------- 4. COG 64 kênh từ hai mảnh UTM
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import box
T = pathlib.Path(tempfile.mkdtemp())
x0, y1, r = 671000.0, 2313000.0, 10.0
rng2 = np.random.default_rng(2); full = rng2.integers(1, 256, size=(64, 60, 80), dtype=np.uint8); full[:, :5, :5] = 0
for k, (c0, c1) in enumerate([(0, 40), (40, 80)]):
    with rasterio.open(T / f"HP311_AEF_2024-{k:010d}-0000000000.tif", "w", driver="GTiff", width=c1 - c0, height=60, count=64, dtype="uint8",
                       crs="EPSG:32648", transform=from_origin(x0 + c0 * r, y1, r, r), nodata=0) as o:
        o.write(full[:, :, c0:c1])
G = C.luoi_3857((x0, y1 - 600, x0 + 800, y1), "EPSG:32648", 10.0)
from rasterio.warp import transform_bounds
hinh = box(*transform_bounds("EPSG:32648", "EPSG:3857", x0 + 100, y1 - 500, x0 + 700, y1 - 100))
manh = sorted(str(p) for p in T.glob("HP311_AEF_2024*.tif"))
dem = C.ra_cog(manh, str(T / "aef/aef64_2024.tif"), G, hinh, tmp_dir=str(T), rows=16, blocksize=128, overviews="NONE")
with rasterio.open(T / "aef/aef64_2024.tif") as ds:
    tags = ds.tags(ns="IMAGE_STRUCTURE"); bs = ds.block_shapes[0]
    ok(ds.count == 64 and ds.dtypes[0] == "uint8" and ds.crs.to_epsg() == 3857 and bs == (128, 128) and ds.nodata == 0 and not ds.overviews(1),
       f"COG 64 kênh: uint8, EPSG:3857, ô {bs}, nodata 0, không có ảnh thu nhỏ; nén {tags.get('COMPRESSION')}, predictor {tags.get('PREDICTOR')}")
    from rasterio.warp import transform as tr
    xs, ys = tr("EPSG:32648", "EPSG:3857", [x0 + 405], [y1 - 305]); rr, cc = ds.index(xs[0], ys[0])
    v = ds.read(window=((rr, rr + 1), (cc, cc + 1)))[:, 0, 0]
    ok(np.array_equal(v, full[:, 30, 40]), "đọc lại một điểm ảnh (sát chỗ ghép hai mảnh): đủ 64 giá trị, đúng giá trị gốc")
    a = ds.read(1)
    ok(dem[1] > 0 and (a > 0).sum() == dem[1] and a[0, 0] == 0, f"cắt theo ranh giới: {dem[1]} điểm ảnh trong vùng, ngoài = 0")

# ---------- 5. ảnh màu PCA
pj = C.aef_mau_pca({2024: str(T / "aef/aef64_2024.tif")}, 2024, n_mau=5000)
ok(len(pj["tb"]) == 64 and np.array(pj["thanh_phan"]).shape == (3, 64) and all(l < h for l, h in zip(pj["lo"], pj["hi"])) and pj["so_mau"] > 100, f"phép chiếu PCA từ {pj['so_mau']} điểm ảnh mẫu")
C.aef_rgb(str(T / "aef/aef64_2024.tif"), str(T / "aef/aef_rgb_2024.tif"), pj, rows=16)
with rasterio.open(T / "aef/aef_rgb_2024.tif") as ds:
    a = ds.read(); o64 = rasterio.open(T / "aef/aef64_2024.tif").read(1)
    ok(ds.count == 3 and ds.shape == o64.shape and ((a[0] > 0) == (o64 > 0)).all() and ds.profile["blockxsize"] == 256, "ảnh màu 3 thành phần: cùng lưới, trống đúng chỗ trống (ảnh thu nhỏ tự có khi ảnh lớn hơn một ô)")

# ---------- 6. manifest
L = C.muc_manifest("AEF", [2024, 2023]) + C.muc_manifest("DIST", [2023]) + C.muc_manifest("NUOC", [2024]) + C.muc_manifest("DEN", [2012]) + C.muc_manifest("NHA")
ids = [l["id"] for l in L]
ok(ids == ["aef_rgb", "dist_tt", "dist_max", "nuoc_ts", "den_dem", "nha_cao", "nha_phu"], "các lớp manifest: " + ", ".join(ids))
den = L[4]; ok(den["log"] and abs(den["keo_gian"][1] - math.log10(301)) < 1e-3 and den["kieu"] == "xam", "ánh sáng đêm: thang log10(1 + x), keo_gian [0, log10(301)]")
ok(L[0]["kieu"] == "rgb" and L[0]["ten"].startswith("Embedding ") and L[0]["phep_chieu"] == "aef/aef_phep_chieu.json", "AEF màu: kiểu rgb, tên 'Embedding …' (trang tự đưa vào nhóm embedding)")
ok("nam" not in L[5] and L[5]["giay_phep"] == "CC BY-NC 3.0", "GBA: lớp không đổi theo năm, ghi giấy phép phi thương mại")
man = C.ghi_manifest({"phien_ban": 7, "layers": [{"id": "dw"}, {"id": "den_dem", "cu": 1}]}, L, {"duong_dan": "aef/aef64_{y}.tif", "nam": [2024]})
ok([l["id"] for l in man["layers"]][:2] == ["dw", "aef_rgb"] and sum(l["id"] == "den_dem" for l in man["layers"]) == 1 and man["aef"]["nam"] == [2024] and man["phien_ban"] == 8,
   "ghi manifest: thay lớp trùng id, thêm mục aef, phiên bản 8")
json.dumps(man, ensure_ascii=False)

# ---------- 7. Earth Engine giả: dựng biểu thức không lỗi
class E:                                              # đối tượng ee giả: mọi phương thức trả đối tượng mới, ghi lại lời gọi
    goi = []
    def __init__(self, *a, **k): self.a = a
    def __getattr__(self, n):
        def f(*a, **k): E.goi.append(n); return E(n)
        return f
    def getInfo(self): return 3
class EE:
    Image = type("I", (), {"cat": staticmethod(lambda xs: E("cat"))}); ImageCollection = E; FeatureCollection = E; Filter = E(); Reducer = E()
    Projection = E; Geometry = E()
    class batch:
        class Export:
            class image:
                @staticmethod
                def toDrive(**k): EE.xuat.append(k); return E()
    xuat = []
for sp in ["AEF", "DIST", "NUOC", "DEN"]:
    img, n = C.anh_ee(EE, sp, 2024, E())
    ok(isinstance(img, E) and n.getInfo() == 3, f"ee giả: dựng ảnh {sp}")
ok({"sqrt", "signum", "add", "toUint8"} <= set(E.goi), "AEF: căn bậc hai, dấu, +128, uint8")
img = C.anh_nha(EE, E(), (106.1, 20.5, 107.1, 21.1), "EPSG:32648")
ok({"reduceToImage", "reduceResolution", "flatten"} <= set(E.goi), "GBA: vẽ đa giác ở 2 m, gộp về 10 m")
C.xuat(EE, E(), "HP311_DEN_2024", E(), {"crs": "EPSG:32648", "x0": 600000, "y0": 2400000}, 100)
k = EE.xuat[-1]; ok(k["crsTransform"] == [100, 0, 600000, 0, -100, 2400000] and k["folder"] == "HP_HF_311", "xuất theo đúng lưới UTM của bộ dữ liệu, bước 100 m")

print("TẤT CẢ ĐẠT" if not loi else f"{len(loi)} LỖI")
