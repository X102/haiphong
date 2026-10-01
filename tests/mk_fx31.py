# Dữ liệu giả cho bản 3.1 (Sentinel-2 trực tuyến): các cảnh L2A kiểu Earth Search (COG UTM 48N, tên tệp B02.tif ... SCL.tif, TCI.tif)
# phủ cả hai tỉnh thử, và danh sách item STAC (bài thử chặn fetch tới API rồi trả các item này, lọc như máy chủ thật).
#   A 2024-01-10: cờ earthsearch:boa_offset_applied = true (DN = phản xạ × 10000), mây (SCL 9, DN 5000) ở phía tây lon < 106.60
#   A2 cùng ngày, cùng ô, mây 40 %: bản xử lý lại, phải bị bỏ khi gộp trùng
#   B 2024-02-15: không có cờ, raster:bands offset −0.1 (DN = phản xạ × 10000 + 1000), bóng mây (SCL 3) ở phía đông lon > 106.76
#   C 2023-12-05: mây gần hết (SCL 8), thuộc năm 2024 khi chọn tháng 11 đến 4 (qua năm)
#   D 2023-01-20: cờ true, quang đãng, B4 = 900, B8 = 2000 (năm khác phổ khác)
#   E 2024-03-01: mây cả cảnh 80 % (máy chủ lọc theo eo:cloud_cover ≤ 60)
#   G 2024-06-10: ngoài tháng 11 đến 4
import json, os
import numpy as np, rasterio
from rasterio.transform import from_origin
from pyproj import Transformer
R = "/tmp/fx/data/s2o"; os.makedirs(R, exist_ok=True)
REF = {"B2": 300, "B3": 500, "B4": 600, "B5": 1000, "B6": 2000, "B7": 2500, "B8": 3000, "B8A": 3200, "B11": 1800, "B12": 1000}
TEN = {"B2": "B02", "B3": "B03", "B4": "B04", "B5": "B05", "B6": "B06", "B7": "B07", "B8": "B08", "B8A": "B8A", "B11": "B11", "B12": "B12"}
TAI = {"B2": "blue", "B3": "green", "B4": "red", "B5": "rededge1", "B6": "rededge2", "B7": "rededge3", "B8": "nir", "B8A": "nir08",
       "B11": "swir16", "B12": "swir22"}
tf = Transformer.from_crs(4326, 32648, always_xy=True)
x0, y1 = tf.transform(106.49, 21.02); x1, y0 = tf.transform(106.87, 20.82)
PX = 50.0
x0, y1 = np.floor(x0 / PX) * PX, np.ceil(y1 / PX) * PX
W, H = int(np.ceil((x1 - x0) / PX)), int(np.ceil((y1 - y0) / PX))
T = from_origin(x0, y1, PX, PX)
inv = Transformer.from_crs(32648, 4326, always_xy=True)
xs = x0 + (np.arange(W) + 0.5) * PX; ys = y1 - (np.arange(H) + 0.5) * PX
XX, YY = np.meshgrid(xs, ys); LON, LAT = inv.transform(XX, YY)

def ghi(p, a, dtype, nodata=None):
    a = a if a.ndim == 3 else a[None]
    with rasterio.open(p, "w", driver="GTiff", width=W, height=H, count=a.shape[0], dtype=dtype, crs="EPSG:32648", transform=T,
                       tiled=True, blockxsize=256, blockysize=256, compress="deflate", nodata=nodata) as o:
        o.write(a.astype(dtype))

def canh(id_, scl, dn, tci):
    d = f"{R}/{id_}"; os.makedirs(d, exist_ok=True)
    ghi(f"{d}/SCL.tif", scl, "uint8", 0)
    for b, v in dn.items(): ghi(f"{d}/{TEN[b]}.tif", v, "uint16", 0)
    ghi(f"{d}/TCI.tif", tci, "uint8", 0)

def item(id_, ngay, may, co, offset, bo="sentinel-2-l2a"):
    base = f"http://127.0.0.1:8765/s2o/{id_}/"
    a = {TAI[b]: {"href": base + TEN[b] + ".tif"} for b in TEN}
    a["scl"] = {"href": base + "SCL.tif"}; a["visual"] = {"href": base + "TCI.tif"}
    a["red"]["raster:bands"] = [{"nodata": 0, "data_type": "uint16", "scale": 0.0001, "offset": offset}]
    pr = {"datetime": ngay + "T03:35:00Z", "eo:cloud_cover": may, "proj:epsg": 32648, "grid:code": "MGRS-48QXH"}
    if co is not None: pr["earthsearch:boa_offset_applied"] = co
    return {"type": "Feature", "id": id_, "collection": bo, "bbox": [106.49, 20.82, 106.87, 21.02], "properties": pr, "assets": a}

ones = np.ones((H, W))
tay, dong = LON < 106.60, LON > 106.76
items = []
# A
scl = np.where(tay, 9, 4); dn = {b: np.where(tay, 5000, v * ones) for b, v in REF.items()}
canh("A", scl, dn, np.stack([np.where(tay, 250, c * ones) for c in (40, 60, 80)])); items.append(item("A", "2024-01-10", 10.0, True, -0.1))
canh("A2", np.full((H, W), 8), {b: 5000 * ones for b in REF}, np.full((3, H, W), 250)); items.append(item("A2", "2024-01-10", 40.0, True, -0.1))
# B
scl = np.where(dong, 3, 5); dn = {b: np.where(dong, 1200, v * ones + 1000) for b, v in REF.items()}
canh("B", scl, dn, np.stack([np.where(dong, 20, c * ones) for c in (44, 66, 88)])); items.append(item("B", "2024-02-15", 20.0, None, -0.1))
# C
scl = np.full((H, W), 8); canh("C", scl, {b: 6000 * ones for b in REF}, np.full((3, H, W), 240)); items.append(item("C", "2023-12-05", 55.0, True, -0.1))
# D
dn = {b: v * ones for b, v in REF.items()}; dn["B4"] = 900 * ones; dn["B8"] = 2000 * ones
canh("D", np.full((H, W), 4), dn, np.stack([c * ones for c in (50, 70, 60)])); items.append(item("D", "2023-01-20", 5.0, True, -0.1))
# E, G: chỉ cần item (không được tải)
items.append(item("E", "2024-03-01", 80.0, True, -0.1)); items.append(item("G", "2024-06-10", 3.0, True, -0.1))
json.dump({"type": "FeatureCollection", "features": items}, open(f"{R}/items.json", "w"))
json.dump({"ref": REF, "w": W, "h": H, "px": PX}, open("/tmp/fx/ref31.json", "w"))
print("s2o:", W, "x", H, "điểm ảnh,", len(items), "item")
