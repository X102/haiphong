# Bản 2.9: PC trơn theo không gian (3 thành phần, đơn vị ×100) dạng pc5d gốc (UTM, int16, không overview) và dạng
# ba lớp xám PC1..PC3 (3857, 8 bit, có overview, lo = -300, hi = 300) để thử đường đọc PC thô cho phạm vi lớn.
# Ghi vào /tmp/fx/data/pcx/ (chỉ khi chưa có).
import sys, os, numpy as np, rasterio
from rasterio.transform import from_origin
HERE = os.path.dirname(os.path.abspath(__file__))
GOC = next(d for d in (os.path.dirname(HERE), os.path.join(os.path.dirname(HERE), "colab")) if os.path.exists(os.path.join(d, "s2_hf_lop.py")))
sys.path.insert(0, GOC)
import s2_hf_lop as H
FX = "/tmp/fx"; R = f"{FX}/data"; os.makedirs(f"{R}/pcx", exist_ok=True)
Hh, W, x0, y0 = 1200, 1500, 660000.0, 2320000.0
if not os.path.exists(f"{R}/pcx/pc3_2025.tif"):
    yy, xx = np.mgrid[0:Hh, 0:W].astype(float)
    pcs = np.stack([200 * np.sin(xx / 97) * np.cos(yy / 131), 250 * (xx / W - 0.5) + 80 * np.sin(yy / 53), 150 * np.cos((xx + yy) / 173)])
    arr = np.concatenate([np.round(pcs), np.full((1, Hh, W), 6), np.zeros((1, Hh, W))]).astype(np.int16)
    arr[:, 0:5, 0:5] = -32768
    with rasterio.open(f"{FX}/pcx_raw.tif", "w", driver="GTiff", width=W, height=Hh, count=5, dtype="int16", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10), nodata=-32768) as o:
        o.write(arr); o.descriptions = ("PC01", "PC02", "PC03", "NOBS", "NFILL")
    H.pc_cog(f"{FX}/pcx_raw.tif", f"{R}/pcx/pcs_2025.tif", k=3, tmp_dir=FX, verbose=False)
    grid = H.grid_3857((x0, y0 - Hh * 10, x0 + W * 10, y0), res=10)
    for q in (1, 2, 3):
        H.gray_cog(f"{FX}/pcx_raw.tif", q, -300, 300, f"{R}/pcx/pc{q}_2025.tif", grid, nodata=-32768, tmp_dir=FX, verbose=False)
if not os.path.exists(f"{FX}/x29.jpg"):                 # JPEG nhỏ thật (thay cho toBlob của jsdom khi thử PDF có toạ độ)
    from PIL import Image
    a = np.zeros((60, 80, 3), np.uint8); a[:, :, 0] = np.arange(80) * 3; a[:, :, 1] = (np.arange(60) * 4)[:, None]
    Image.fromarray(a).save(f"{FX}/x29.jpg", quality=90)
print("ok")
