# Kiểm thử phần hàm của hai ô Colab bản 2.7: ranh giới Việt Nam (dữ liệu nguồn giả cùng cấu trúc kho thanglequoc) và
# lớp phủ toàn cầu (Earth Engine giả, ảnh xuất giả có mảnh ghép, cắt theo ranh giới, manifest)
import json, os, pathlib, shutil, sys, tempfile, types
import numpy as np

D = pathlib.Path(__file__).resolve().parent.parent
tim = lambda ten: next(p for p in [D / ten, D / "colab" / ten] if p.exists())
loi = []
def ok(dk, t):
    print(("  ok  " if dk else "  LỖI ") + t)
    if not dk: loi.append(t)
def ham(p):
    ns = {}; exec(compile(p.read_text(encoding="utf-8").split("# ---------------- CHẠY (Colab)")[0], p.name, "exec"), ns); return ns

T = pathlib.Path(tempfile.mkdtemp())
# ---------- ô ranh giới Việt Nam
V = ham(tim("HF_VN_RANH_GIOI_cell.py"))
def fc(pr, poly):
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "id": pr["code"], "properties": pr, "geometry": {"type": "Polygon", "coordinates": [poly]}}]}
o = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
goc = T / "json" / "geojson"
for ma, ten, bb, xs in [("31", "Hải Phòng", (106.4, 20.6, 106.9, 21.0), [("10507", "Thành Đông", "Phường", (106.4, 20.6, 106.65, 21.0)), ("10525", "An Lão", "Xã", (106.65, 20.6, 106.9, 21.0))]),
                        ("22", "Quảng Ninh", (106.9, 20.8, 107.5, 21.2), [("06700", "Hạ Long", "Phường", (106.9, 20.8, 107.5, 21.2))])]:
    d = goc / f"{ma}_x"; (d / "wards").mkdir(parents=True)
    json.dump(fc({"code": ma, "name": ten, "fullName": "Tỉnh " + ten, "nameEn": ten, "areaKm2": 100.0}, o(*bb)), open(d / f"{ma}_x.geojson", "w"))
    for mx, tx, loai, b2 in xs:
        # thêm nhiều đỉnh thừa trên cạnh để thấy giản lược có tác dụng
        r = o(*b2); dd = [[r[0][0] + (r[1][0] - r[0][0]) * k / 50, r[0][1] + 1e-7 * (k % 2)] for k in range(50)] + r[1:]
        json.dump(fc({"code": mx, "name": tx, "fullName": f"{loai} {tx}", "nameEn": tx, "fullNameEn": tx, "areaKm2": 10.0}, dd), open(d / "wards" / f"{mx}_{tx}.geojson", "w"))
(goc / "README.md").write_text("x")
kq = V["dung"](str(goc), str(T / "ra"), "abc123", verbose=False)
t = json.load(open(T / "ra/vn/tinh.geojson")); x31 = json.load(open(T / "ra/vn/xa/31.geojson")); dm = json.load(open(T / "ra/vn/danh_muc.json"))
ok(kq["so_tinh"] == 2 and kq["so_xa"] == 3 and len(t["features"]) == 2 and len(x31["features"]) == 2 and os.path.exists(T / "ra/vn/xa/22.geojson"),
   "ranh giới: 2 tỉnh, 3 xã, mỗi tỉnh một tệp xã")
p = x31["features"][0]["properties"]
ok(p["ten"] == "Phường Thành Đông" and p["ten_ngan"] == "Thành Đông" and p["ma_tinh"] == "31" and p["ma"] == "10507", "thuộc tính xã: tên đầy đủ, tên ngắn, mã, mã tỉnh")
ok(len(x31["features"][0]["geometry"]["coordinates"][0]) < 20, "giản lược bỏ đỉnh thừa")
ok([q["ma"] for q in dm["tinh"]] == ["22", "31"] and dm["tinh"][1]["so_xa"] == 2 and len(dm["tinh"][1]["bb"]) == 4 and dm["xa"][0][0] == "06700" and len(dm["xa"][0]) == 5,
   "danh mục: tỉnh (mã, số xã, hộp bao), xã (mã, tên, mã tỉnh, điểm đại diện)")
m = V["ghi_manifest"]({"phien_ban": 5}, "abc123")
ok(m["vn"]["xa"] == "vn/xa/{ma}.geojson" and m["vn"]["tinh_mac_dinh"] == "31" and m["phien_ban"] == 7, "manifest['vn']")

# ---------- ô lớp phủ toàn cầu
L = ham(tim("HF_LULC_TG_cell.py"))
GOI = []
class Anh:
    def __init__(s, ten): s.ten = ten
    def __getattr__(s, k):
        def f(*a, **kw): GOI.append((s.ten, k, a)); return Anh(s.ten + "." + k)
        return f
class Col(Anh): pass
ee = types.SimpleNamespace(ImageCollection=lambda a: Col(f"IC({a})"), Reducer=types.SimpleNamespace(mode=lambda: "mode"),
                           batch=types.SimpleNamespace(Export=types.SimpleNamespace(image=types.SimpleNamespace(toDrive=lambda **kw: (GOI.append(("export", kw)), types.SimpleNamespace(start=lambda: GOI.append(("start",))))[1]))))
grid = {"crs": "EPSG:32648", "x0": 615610.0, "y0": 2352020.0, "res": 10.0}
ok(L["nam_co"]("WC", range(2017, 2026)) == [2020, 2021] and L["nam_co"]("GLC", range(2017, 2026)) == [2017, 2018, 2019, 2020, 2021, 2022]
   and L["nam_co"]("DW", [2016, 2025]) == [2016, 2025], "năm có của từng sản phẩm")
ten = L["xuat"](ee, "GLC", 2019, "vung", grid)
ex = [g for g in GOI if g[0] == "export"][-1][1]
ok(ten == "LULCTG_glc_2019" and ex["crsTransform"] == [30, 0, 615610.0, 0, -30, 2352020.0] and ex["crs"] == "EPSG:32648" and ex["folder"] == "HP_LULC_TG"
   and any(g[1] == "select" and g[2] == ("b20",) for g in GOI), "GLC_FCS30D 2019: băng b20, lưới 30 m trùng gốc lưới bộ dữ liệu")
GOI.clear(); L["xuat"](ee, "DW", 2021, "vung", grid)
ok(any(g[1] == "filterDate" and g[2] == ("2020-11-01", "2021-05-01") for g in GOI) and any(g[1] == "add" and g[2] == (1,) for g in GOI)
   and [g for g in GOI if g[0] == "export"][-1][1]["crsTransform"][0] == 10, "Dynamic World 2021: mode mùa khô 11/2020-4/2021, mã + 1, lưới 10 m")
GOI.clear(); ok(L["xuat"](ee, "WC", 2019, "vung", grid) is None and not GOI, "năm không có thì không xuất")
mm = L["muc_manifest"]("DW", [2021, 2020])
ok(mm["duong_dan"] == "lulc_tg/dw_{y}.tif" and mm["nam"] == [2020, 2021] and mm["ten_lop"]["1"] == "nước" and mm["chung"]["7"] == 6 and mm["nhom3"]["4"] == 0
   and mm["bang_mau"]["1"] == "#419bdf" and mm["kieu"] == "lop" and "CC BY" in mm["giay_phep"], "manifest DW: mã + 1, tên, màu, chú giải chung, 3 lớp")
ok(all(set(v["lop"]) and all(len(q) == 4 and q[2] in range(8) and q[3] in range(4) for q in v["lop"].values()) for v in L["SP"].values()), "bảng lớp đủ 4 cột, mã quy đổi hợp lệ")

import rasterio
from rasterio.transform import from_origin
from shapely.geometry import box
from pyproj import Transformer
# hai mảnh UTM 10 m ghép lại (như Earth Engine chia ảnh), lớp 10 bên trái, 80 bên phải
x0, y0 = 615610.0, 2352020.0
for i, v in enumerate([10, 80]):
    a = np.full((200, 100), v, np.uint8)
    with rasterio.open(T / f"LULCTG_wc_2021-000{i}.tif", "w", driver="GTiff", width=100, height=200, count=1, dtype="uint8", crs="EPSG:32648",
                       transform=from_origin(x0 + i * 1000, y0, 10, 10), nodata=0) as d:
        d.write(a, 1)
G3857 = L["luoi_3857"]((x0, y0 - 2000, x0 + 2000, y0), "EPSG:32648")
tr = Transformer.from_crs(32648, 3857, always_xy=True)
xa, ya = tr.transform(x0, y0 - 2000); xb, yb = tr.transform(x0 + 1500, y0)
dem = L["lop_cog"]([str(T / "LULCTG_wc_2021-0000.tif"), str(T / "LULCTG_wc_2021-0001.tif")], str(T / "wc_2021.tif"), G3857, box(xa, ya, xb, yb), tmp_dir=str(T))
with rasterio.open(T / "wc_2021.tif") as d:
    a = d.read(1); pr = d.profile
ok(str(pr["crs"]) == "EPSG:3857" and pr["nodata"] == 0 and set(np.unique(a)) == {0, 10, 80}, "COG 3857, hai mảnh ghép, giữ mã 10 và 80, 0 ngoài vùng")
ok(dem[10] > 0 and dem[80] > 0 and 1.6 < dem[10] / dem[80] < 2.4, f"cắt theo ranh giới: phần 80 chỉ còn nửa ({dem[10]} : {dem[80]} điểm ảnh)")
with rasterio.open(T / "wc_2021.tif") as d:
    ok(len(d.overviews(1)) >= 0 and d.profile.get("blockxsize") == 256, "COG xếp ô 256")
# dùng lại ảnh GL_*.tif đã quy về 3 lớp (không cần Earth Engine): 0 trong ranh giới -> 4 "ngoài ba lớp", ngoài ranh giới -> 0
gd = T / "drive"; (gd / "HP_3class_v1" / "globallc").mkdir(parents=True)
for ten, v in [("GL_DW_2017.tif", 1), ("GL_DW_2018.tif", 2), ("GL_ESRI_2020.tif", 3), ("GL_WC20_2020.tif", 1), ("GL_WC21_2021.tif", 2), ("GL_KHAC_2020.tif", 1)]:
    a = np.full((200, 200), v, np.uint8); a[:, :50] = 0                # một phần tư bên trái: lớp không quy đổi
    with rasterio.open(gd / "HP_3class_v1" / "globallc" / ten, "w", driver="GTiff", width=200, height=200, count=1, dtype="uint8", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10), nodata=0) as d:
        d.write(a, 1)
tm, GL = L["tim_gl"](str(gd))
ok(tm.endswith("HP_3class_v1/globallc") and sorted(GL) == [("dw", 2017), ("dw", 2018), ("esri", 2020), ("wc", 2020), ("wc", 2021)], "tìm ảnh GL_* trong HP_3class_v1/globallc, bỏ tệp lạ; WC20, WC21 gộp thành một lớp")
G2 = L["luoi_3857"]((x0, y0 - 2000, x0 + 2000, y0), "EPSG:32648")
xb2, yb2 = tr.transform(x0 + 1500, y0)
dem = L["lop_cog"](GL[("dw", 2017)], str(T / "dw_2017.tif"), G2, box(xa, ya, xb2, yb2), tmp_dir=str(T), ma_trong=4)
ok(set(dem) == {1, 4} and 1.8 < dem[1] / dem[4] < 2.2, f"0 trong ranh giới thành 4 (tỉ lệ lớp 1 : lớp 4 = {dem[1] / dem[4]:.2f}, đúng 1000 : 500 m)")
mg = L["muc_manifest_gl"]("WC20", {2020, 2021})
ok(mg["id"] == "wc" and mg["nam"] == [2020, 2021] and mg["nhom3"] == {"1": 1, "2": 2, "3": 3, "4": 0} and mg["chung"]["2"] == 1 and mg["chung"]["3"] == 6 and mg["chung"]["1"] == 0 and "4" in mg["ten_lop"],
   "manifest lớp dùng lại: 3 lớp + mã 4, quy đổi 3 lớp và chung")
shutil.rmtree(T)
print("TẤT CẢ ĐẠT" if not loi else f"{len(loi)} LỖI")
sys.exit(1 if loi else 0)
