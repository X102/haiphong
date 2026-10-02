# Dữ liệu giả cho bản 3.4: Landsat C2 L2 và Sentinel-1 RTC kiểu Planetary Computer (COG UTM 48N, cùng lưới với mk_fx31).
#   Landsat (DN = (phản xạ + 0.2) / 0.0000275, QA_PIXEL 21824 = quang đãng, 22280 = mây):
#     L1 1995-01-15 landsat-5: mây ở phía tây lon < 106.60; B4 = 0.06
#     L2 1995-02-20 landsat-5: quang đãng; B4 = 0.08
#     L3 1995-03-10: QA_PIXEL ghi quang đãng nhưng lam 0.35 (mây Fmask bỏ sót), phải bị loại bằng phép thử độ sáng
#     L7 2005-01-10 landsat-7: sau hỏng SLC, phải bị bỏ
#     L8 2005-03-01 landsat-5: quang đãng; B4 = 0.05, B8 = 0.20
#   Sentinel-1 (float32 tuyến tính, nodata −32768):
#     S1a 2020-01-05: VV 0.1, VH 0.02, phía tây không có dữ liệu
#     S1b 2020-02-10: VV 0.2, VH 0.04;  S1c 2020-03-15: VV 0.3, VH 0.06
import json, os
import numpy as np, rasterio
from rasterio.transform import from_origin
from pyproj import Transformer
R = "/tmp/fx/data/pc"; os.makedirs(R, exist_ok=True)
tf = Transformer.from_crs(4326, 32648, always_xy=True)
x0, y1 = tf.transform(106.49, 21.02); x1, y0 = tf.transform(106.87, 20.82)
PX = 50.0
x0, y1 = np.floor(x0 / PX) * PX, np.ceil(y1 / PX) * PX
W, H = int(np.ceil((x1 - x0) / PX)), int(np.ceil((y1 - y0) / PX))
T = from_origin(x0, y1, PX, PX)
inv = Transformer.from_crs(32648, 4326, always_xy=True)
xs = x0 + (np.arange(W) + 0.5) * PX; ys = y1 - (np.arange(H) + 0.5) * PX
XX, YY = np.meshgrid(xs, ys); LON, LAT = inv.transform(XX, YY)
tay = LON < 106.60; ones = np.ones((H, W))

def ghi(p, a, dtype, nodata=None):
    with rasterio.open(p, "w", driver="GTiff", width=W, height=H, count=1, dtype=dtype, crs="EPSG:32648", transform=T,
                       tiled=True, blockxsize=256, blockysize=256, compress="deflate", nodata=nodata) as o:
        o.write(a.astype(dtype)[None])
LS = {"B2": ("blue", 0.03), "B3": ("green", 0.05), "B4": ("red", 0.06), "B8": ("nir08", 0.30), "B11": ("swir16", 0.18), "B12": ("swir22", 0.10)}
dn = lambda r: np.round((r + 0.2) / 0.0000275)
items = []
def ls(id_, ngay, nen, qa, doi):
    d = f"{R}/{id_}"; os.makedirs(d, exist_ok=True); base = f"http://127.0.0.1:8765/pc/{id_}/"; a = {}
    for b, (k, r) in LS.items():
        ghi(f"{d}/{k}.tif", dn(doi.get(b, r)) * ones, "uint16", 0); a[k] = {"href": base + k + ".tif"}
    ghi(f"{d}/qa_pixel.tif", qa, "uint16", 1); a["qa_pixel"] = {"href": base + "qa_pixel.tif"}
    a["red"]["raster:bands"] = [{"nodata": 0, "data_type": "uint16", "scale": 0.0000275, "offset": -0.2}]
    items.append({"type": "Feature", "id": id_, "collection": "landsat-c2-l2", "bbox": [106.49, 20.82, 106.87, 21.02], "assets": a,
                  "properties": {"datetime": ngay + "T03:00:00Z", "eo:cloud_cover": 20.0, "proj:epsg": 32648, "platform": nen, "landsat:wrs_path": "127", "landsat:wrs_row": "046"}})
ls("L1", "1995-01-15", "landsat-5", np.where(tay, 22280, 21824), {})
ls("L2", "1995-02-20", "landsat-5", 21824 * ones, {"B4": 0.08})
ls("L3", "1995-03-10", "landsat-5", 21824 * ones, {"B2": 0.35, "B3": 0.36, "B4": 0.38, "B8": 0.40})   # mây mà QA_PIXEL bỏ sót (lam 0.35)
ls("L7", "2005-01-10", "landsat-7", 21824 * ones, {})
ls("L8", "2005-03-01", "landsat-5", 21824 * ones, {"B4": 0.05, "B8": 0.20})
def s1(id_, ngay, vv, vh, trong):
    d = f"{R}/{id_}"; os.makedirs(d, exist_ok=True); base = f"http://127.0.0.1:8765/pc/{id_}/"
    ghi(f"{d}/vv.tif", np.where(trong, -32768, vv * ones), "float32", -32768); ghi(f"{d}/vh.tif", np.where(trong, -32768, vh * ones), "float32", -32768)
    items.append({"type": "Feature", "id": id_, "collection": "sentinel-1-rtc", "bbox": [106.49, 20.82, 106.87, 21.02],
                  "assets": {"vv": {"href": base + "vv.tif"}, "vh": {"href": base + "vh.tif"}},
                  "properties": {"datetime": ngay + "T11:00:00Z", "proj:epsg": 32648, "platform": "SENTINEL-1A", "sat:orbit_state": "ascending", "sat:relative_orbit": 26}})
s1("S1a", "2020-01-05", 0.1, 0.02, tay); s1("S1b", "2020-02-10", 0.2, 0.04, np.zeros((H, W), bool)); s1("S1c", "2020-03-15", 0.3, 0.06, np.zeros((H, W), bool))
json.dump({"type": "FeatureCollection", "features": items}, open(f"{R}/items.json", "w"))
print("pc:", W, "x", H, len(items), "item")
