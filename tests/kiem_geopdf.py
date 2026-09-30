# Kiểm tệp PDF có toạ độ (ISO 32000, /VP /Measure /GEO) do trang xuất ra, theo đúng cách GDAL đọc: lấy khung Viewport,
# các cặp (vĩ độ, kinh độ) GPTS ứng với điểm LPTS trong hình vuông đơn vị, đổi sang hệ GCS (/EPSG), dựng phép affine,
# rồi so với khung mong đợi. Dùng: python3 kiem_geopdf.py tep.pdf [x0 y1 r fx fy dpi]  (in JSON)
import sys, json, re, pymupdf
from pyproj import Transformer
f = sys.argv[1]; doc = pymupdf.open(f); pg = doc[0]
RAW = open(f, "rb").read().decode("latin-1")            # đọc thẳng số trong tệp (MuPDF in lại số với ít chữ số hơn)
def obj(n): return re.search(r"(?<![0-9])" + str(n) + r" 0 obj(.*?)endobj", RAW, re.S).group(1)
xr = obj(pg.xref)
def gia(obj, k):
    m = re.search(r"/" + k + r"\s*(\[[^\]]*\]|\d+ 0 R|\([^)]*\)|\d+)", obj); return m.group(1) if m else None
vp = re.search(r"/VP\s*\[\s*<<(.*?)>>\s*\]", xr, re.S).group(1)
bbox = [float(v) for v in gia(vp, "BBox").strip("[]").split()]
mref = int(gia(vp, "Measure").split()[0]); ms = obj(mref)
gpts = [float(v) for v in gia(ms, "GPTS").strip("[]").split()]; lpts = [float(v) for v in gia(ms, "LPTS").strip("[]").split()]
gref = int(gia(ms, "GCS").split()[0]); gcs = obj(gref); epsg = int(gia(gcs, "EPSG"))
tr = Transformer.from_crs(4326, epsg, always_xy=True)
pts = []
for i in range(0, len(gpts), 2):
    X, Y = tr.transform(gpts[i + 1], gpts[i]); lx, ly = lpts[i], lpts[i + 1]
    pts.append((bbox[0] + lx * (bbox[2] - bbox[0]), bbox[1] + ly * (bbox[3] - bbox[1]), X, Y))
# affine từ trang (điểm, gốc dưới trái) sang hệ phẳng: X = a + b·u, Y = c + d·v (không xoay)
u0 = min(p[0] for p in pts); u1 = max(p[0] for p in pts); v0 = min(p[1] for p in pts); v1 = max(p[1] for p in pts)
Xl = [p[2] for p in pts if abs(p[0] - u0) < 1e-6]; Xr = [p[2] for p in pts if abs(p[0] - u1) < 1e-6]
Yb = [p[3] for p in pts if abs(p[1] - v0) < 1e-6]; Yt = [p[3] for p in pts if abs(p[1] - v1) < 1e-6]
chu_nhat = max(Xl) - min(Xl) < 0.01 and max(Xr) - min(Xr) < 0.01 and max(Yb) - min(Yb) < 0.01 and max(Yt) - min(Yt) < 0.01
kq = {"epsg": epsg, "bbox_pt": bbox, "trang_pt": [pg.rect.width, pg.rect.height], "X": [min(Xl), min(Xr)], "Y": [min(Yb), min(Yt)], "chu_nhat": chu_nhat,
      "m_moi_pt": [(min(Xr) - min(Xl)) / (u1 - u0), (min(Yt) - min(Yb)) / (v1 - v0)], "anh": len(pg.get_images())}
try: pix = pg.get_pixmap(dpi=72); kq["ve"] = [pix.width, pix.height, pix.pixel(int(pix.width * 0.5), int(pix.height * 0.5))]
except Exception as e: kq["ve"] = str(e)
print(json.dumps(kq))
