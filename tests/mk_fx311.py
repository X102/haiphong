# Bản 3.11: dữ liệu giả của các lớp mới, dựng bằng CHÍNH các hàm của ô Colab HF_311_NGUON_MOI_cell.py (ra_cog, aef_mau_pca,
# aef_rgb, muc_manifest, ghi_manifest) từ ảnh "xuất từ Earth Engine" giả trên lưới UTM, rồi ghi manifest311.json (manifest.json
# của bộ giả + lớp mới). Đáp án: AlphaEarth vùng tây (x < 665500) không đổi; vùng đông đổi hẳn năm 2025; ánh sáng đêm vùng đông
# 50 nW/cm²/sr; nhà vùng đông cao 24 m, phủ 40 %; DIST 2024 mã 6 ở vùng đông.
import json, math, pathlib, tempfile
import numpy as np
import rasterio
from rasterio.transform import from_origin

D = pathlib.Path(__file__).resolve().parent.parent
tim = lambda ten: next(p for p in [D / ten, D / "colab" / ten, D / "src" / ten] if p.exists())
ns = {}
exec(compile(tim("HF_311_NGUON_MOI_cell.py").read_text(encoding="utf-8").split("# ---------------- CHẠY (Colab)")[0], "HF_311", "exec"), ns)
ns["AEF_DO_PHAN_GIAI"] = 20
OUT = pathlib.Path("/tmp/fx/data"); T = pathlib.Path(tempfile.mkdtemp())
X0, Y1, X1, Y0, RANH = 659000.0, 2321000.0, 672000.0, 2309000.0, 665500.0


def utm(ten, r, mang):                                # mang (k, h, w) uint8 trên khung X0..X1, Y0..Y1, bước r
    p = T / f"{ten}.tif"
    with rasterio.open(p, "w", driver="GTiff", width=mang.shape[2], height=mang.shape[1], count=mang.shape[0], dtype="uint8",
                       crs="EPSG:32648", transform=from_origin(X0, Y1, r, r), nodata=0) as o:
        o.write(mang)
    return [str(p)]


def vung(r):                                          # mặt nạ vùng đông trên lưới bước r
    w, h = int((X1 - X0) / r), int((Y1 - Y0) / r)
    xs = X0 + (np.arange(w) + 0.5) * r
    return np.broadcast_to(xs >= RANH, (h, w)), w, h


def vec(seed):
    v = np.random.default_rng(seed).normal(size=64); return v / np.linalg.norm(v)


def main():
    bu = (X0, Y0, X1, Y1)
    G20, G30, G100, G10 = (ns["luoi_3857"](bu, "EPSG:32648", r) for r in (20.0, 30.0, 100.0, 10.0))
    A, B, C = vec(1), vec(2), vec(3)
    C = C - (C @ B) * B; C /= np.linalg.norm(C)                     # C vuông góc với B: cos(2025, 2024) ≈ 0 ở vùng đông
    dong, w, h = vung(20.0)
    tep = {}
    for y in (2023, 2024, 2025):
        v = np.where(dong[None], (C if y == 2025 else B)[:, None, None], A[:, None, None])
        u = ns["aef_luong_tu"](v)
        tep[y] = str(OUT / f"aef/aef64_{y}.tif")
        ns["ra_cog"](utm(f"aef_{y}", 20.0, u), tep[y], G20, None, tmp_dir=str(T), rows=128, blocksize=128, overviews="NONE")
    pj = ns["aef_mau_pca"](tep, 2024, n_mau=4000)
    json.dump(pj, open(OUT / "aef/aef_phep_chieu.json", "w"))
    for y, f in tep.items():
        ns["aef_rgb"](f, str(OUT / f"aef/aef_rgb_{y}.tif"), pj, rows=128)
    dong, w, h = vung(100.0)
    for y in (2023, 2024, 2025):
        b = ns["byte_tuyen_tinh"](np.where(dong, math.log10(51), math.log10(1.5)), 0, math.log10(301))
        ns["ra_cog"](utm(f"den_{y}", 100.0, b[None]), str(OUT / f"den/den_{y}.tif"), G100, None, tmp_dir=str(T), resampling="nearest")
    dong, w, h = vung(10.0)
    cao = ns["byte_tuyen_tinh"](np.where(dong, 24.0, np.nan), 0, 100); phu = ns["byte_tuyen_tinh"](np.where(dong, 40.0, np.nan), 0, 100)
    f = utm("nha", 10.0, np.stack([cao, phu]))
    ns["ra_cog"](f, str(OUT / "nha/nha_cao.tif"), G10, None, kenh=[1], tmp_dir=str(T)); ns["ra_cog"](f, str(OUT / "nha/nha_phu.tif"), G10, None, kenh=[2], tmp_dir=str(T))
    dong, w, h = vung(30.0)
    st = np.where(dong, 6, 0).astype(np.uint8); an = ns["byte_tuyen_tinh"](np.where(dong, 70.0, np.nan), 0, 100)
    f = utm("dist", 30.0, np.stack([st, an]))
    ns["ra_cog"](f, str(OUT / "opera/dist_tt_2024.tif"), G30, None, kenh=[1], tmp_dir=str(T)); ns["ra_cog"](f, str(OUT / "opera/dist_max_2024.tif"), G30, None, kenh=[2], tmp_dir=str(T))
    man = json.load(open(OUT / "manifest.json"))
    lop = ns["muc_manifest"]("AEF", [2023, 2024, 2025]) + ns["muc_manifest"]("DIST", [2024]) + ns["muc_manifest"]("DEN", [2023, 2024, 2025]) + ns["muc_manifest"]("NHA")
    aef = dict(duong_dan="aef/aef64_{y}.tif", nam=[2023, 2024, 2025], kenh=64, do_phan_giai_m=20)
    man = ns["ghi_manifest"](man, lop, aef)
    json.dump(man, open(OUT / "manifest311.json", "w"), ensure_ascii=False)
    print("xong 3.11:", [l["id"] for l in lop])


if __name__ == "__main__":
    main()
