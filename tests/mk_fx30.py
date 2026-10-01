# Bản 3.0: dữ liệu Landsat giả cho bài thử trang, dựng bằng ĐÚNG các hàm của ls_landsat.py, ls_pca.py (ô Colab ls_HF_LANDSAT):
# ls/ls_{y}.tif (COG 10 băng int16, lưới 30 m cùng gốc S2), lstc, lspc + lspc1..5, lsg, lsgb, emb/lsg_phep_chieu.json;
# mục manifest ghi riêng /tmp/fx/data/manifest_ls.json (bài thử gộp vào MAN), giá trị đúng tại hai điểm ghi /tmp/fx/ref_ls.json.
import os, sys, json, numpy as np, rasterio
HERE = os.path.dirname(os.path.abspath(__file__))
for d in (os.path.join(HERE, "..", "..", "landsat"), os.path.join(HERE, "..", "colab"), os.path.join(HERE, "..")):
    if os.path.exists(os.path.join(d, "ls_landsat.py")):
        sys.path.insert(0, d)
for d in (os.path.join(HERE, "..", "..", "pcats"), os.path.join(HERE, "..", "colab")):
    if os.path.exists(os.path.join(d, "pca_ts_py.py")):
        sys.path.insert(0, d)
sys.path.insert(0, os.path.dirname(HERE))
import ls_landsat as LS, ls_pca as LP, pca_ts_py as P, s2_hf_lop as H
FX, R = "/tmp/fx", "/tmp/fx/data"
NAM = [1990, 2000, 2010, 2023, 2025]
CB = {1990: 1, 2000: 3, 2010: 3, 2023: 12, 2025: 12}
L = LS.khung_luoi((660000.0, 2308000.0, 675000.0, 2320000.0))
tf, Wd, Hd = LS.transform_luoi(L), L["rong"], L["cao"]
yy, xx = np.mgrid[0:Hd, 0:Wd]
rng = np.random.default_rng(30)
COT = (100, 150)                                                    # dải cột mất thực vật sau 2010 (đô thị hoá)


from scipy.ndimage import gaussian_filter
VAN = np.stack([gaussian_filter(np.random.default_rng(100 + b).normal(size=(Hd, Wd)), 4) for b in range(6)])
VAN = 300 * VAN / VAN.std(axis=(1, 2), keepdims=True)                 # kết cấu mặt đất riêng từng băng, giống nhau mọi năm


def anh(y):
    base = np.array([500, 800, 700, 3000, 1800, 900])[:, None, None]
    sr = base + 2 * xx[None] + VAN + (y - 1990) * 3 + rng.normal(0, 15, (6, Hd, Wd))
    if y >= 2023:
        s = (slice(None), slice(None), slice(*COT))
        sr[3][s[1:]] = 1200; sr[2][s[1:]] = 1500; sr[4][s[1:]] = 2600
    a = np.zeros((10, Hd, Wd), np.int16)
    a[:6] = np.clip(np.round(sr), -32767, 32767)
    a[6] = 2500 + (y - 1990) * 5; a[7] = 4
    a[8] = 0; a[8][:20] = 2; a[8][20:40] = 3
    a[9] = CB[y]
    a[:, :5, :5] = LS.NODATA
    return a


os.makedirs(f"{FX}/ls_raw", exist_ok=True)
RAW = {}
for y in NAM:
    p = f"{FX}/ls_raw/ls_{y}.tif"
    with rasterio.open(p, "w", driver="GTiff", width=Wd, height=Hd, count=10, dtype="int16", crs=LS.CRS, transform=tf,
                       nodata=LS.NODATA) as o:
        o.write(anh(y)); o.descriptions = tuple(LS.BANG_RA)
    RAW[y] = p
    LS.lam_cog(p, f"{R}/ls/ls_{y}.tif")
G3 = H.grid_3857(L["khung"], "EPSG:32648", res=30.0)
KG = LS.keo_gian(list(RAW.values()), n_win=10, win=100)
for y in NAM:
    LS.anh_xem_nhanh(RAW[y], f"{R}/lstc/lstc_{y}.tif", G3, KG, tmp_dir=FX, verbose=False)
# PCA phổ chuỗi năm: đúng các hàm của ô Colab
MAU = LP.lay_mau(RAW, n=3000, seed=5)
HS = P.chot_k(LP.khop(MAU, P, dict(LP.CAU_HINH_LSPCA, nam_khong_fit=[])), 5, "thử")
HS["dac_trung"] = LP.DAC_TRUNG
KGP = LP.keo_gian_pc(MAU, HS)
for y in NAM:
    t = f"{FX}/ls_raw/lspc_{y}.tif"
    LP.ap_anh(RAW[y], t, HS)
    LS.lam_cog(t, f"{R}/lspc/lspc_{y}.tif")
    for q in range(1, 6):
        H.gray_cog(t, q, KGP[q][0], KGP[q][1], f"{R}/lspc{q}/lspc{q}_{y}.tif", G3, nodata=LS.NODATA, tmp_dir=FX, verbose=False)
# embedding giả: 6 thành phần = tổ hợp tuyến tính phản xạ, lượng tử 1..255 theo lo, hi như ô Colab
PJ = dict(mu=[0.0] * 6, comps=np.eye(6).tolist(), lo=[-2.0] * 6, hi=[2.0] * 6, encoder="gia")
os.makedirs(f"{R}/emb", exist_ok=True); json.dump(PJ, open(f"{R}/emb/lsg_phep_chieu.json", "w"))
for y in NAM:
    a = rasterio.open(RAW[y]).read().astype(float)
    comp = np.stack([(a[b] - 1500) / 1500 for b in range(6)])
    q = H.quantize(comp, PJ["lo"], PJ["hi"]); q[:, (a[0] == LS.NODATA)] = 0
    t = f"{FX}/ls_raw/lsq_{y}.tif"
    with rasterio.open(t, "w", driver="GTiff", width=Wd, height=Hd, count=6, dtype="uint8", crs=LS.CRS, transform=tf, nodata=0) as o:
        o.write(q)
    H.rgb_cog_nhom(t, [([1, 2, 3], f"{R}/lsg/lsg_{y}.tif"), ([4, 5, 6], f"{R}/lsgb/lsgb_{y}.tif")], G3, tmp_dir=FX, verbose=False)
man = dict(ls=LS.muc_manifest(NAM, KG, L, "B", chuan_hoa={}, cau_noi={}), lspc=LP.muc_manifest_lspc(HS, NAM, KGP),
           layers=LS.lop_manifest(NAM, co_pca=5, pca_kg=KGP, co_emb=True))
json.dump(man, open(f"{R}/manifest_ls.json", "w"), ensure_ascii=False)
# giá trị đúng tại hai điểm (trong dải đổi, ngoài dải)
from pyproj import Transformer
TL = Transformer.from_crs(32648, 4326, always_xy=True)
ref = {"diem": []}
for (r, c) in ((60, 120), (60, 300)):
    x, y_ = tf.c + 30 * c + 15, tf.f - 30 * r - 15
    lon, lat = TL.transform(x, y_)
    d = {"r": r, "c": c, "x": x, "y": y_, "lon": lon, "lat": lat, "nam": {}}
    for y in NAM:
        a = rasterio.open(RAW[y]).read()[:, r, c].astype(int).tolist()
        f = LP.dac_trung(np.array(a[:6], float)[:, None] / 10000)[:, 0]
        pc = (np.asarray(HS["W"]) @ ((f - np.asarray(HS["mean"])) / np.asarray(HS["std"]))).tolist()
        pc_anh = rasterio.open(f"{R}/lspc/lspc_{y}.tif").read()[:5, r, c].tolist()
        d["nam"][str(y)] = dict(sr=a[:6], temp=a[6] / 100, nobs=a[7], nguon=a[8], cb=a[9], pc=pc, pc_anh=pc_anh)
    ref["diem"].append(d)
ref.update(cot=list(COT), L=L, nam=NAM)
json.dump(ref, open(f"{FX}/ref_ls.json", "w"))
print("mk_fx30 xong:", Wd, "×", Hd, "năm", NAM)
