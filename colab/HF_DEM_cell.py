# ============ DEM CHO GEOPORTAL 2.4 -> HUGGING FACE (độ cao, độ dốc, bóng địa hình; đặc trưng so sánh) ============
# Chạy độc lập trên Colab CPU, sau khi đã có ranh giới xã trên bộ dữ liệu (HF_RANH_GIOI_XA_cell.py).
# Nguồn: Copernicus DEM GLO-30 (mô hình BỀ MẶT 30 m: gồm cả nhà, cây), các ô 1° × 1° dạng COG công khai trên AWS
# (s3://copernicus-dem-30m, không cần tài khoản). Ô chỉ có biển không tồn tại (404) thì bỏ qua.
# Ra: dem/dem_cop30.tif, int16 = độ cao × 10 (đêximét), nodata -32768, UTM 48N (EPSG:32648) bước 30 m, COG DEFLATE có overview.
# Trang tự tính độ dốc (Horn) và bóng địa hình. Token HF: Colab Secrets (HF_TOKEN) hoặc nhập tay, không ghi vào ô.
# Ghi công bắt buộc khi phân phối: "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under
# COPERNICUS by the European Union and ESA; all rights reserved", kèm câu miễn trừ trách nhiệm (ghi trong README).
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
BUOC_M = 30                # bước lưới UTM (m); 30 = độ phân giải gốc
DEM_NOI = 0.03             # nới hộp bao ranh giới (độ) để không hụt mép
LAM_LAI = False            # True: dựng lại dù đã có trên Hugging Face
GUI_LEN = True
AWS = "https://copernicus-dem-30m.s3.amazonaws.com"
NGUON_DEM = "Copernicus DEM GLO-30 (DSM 30 m)"
GHI_CONG = ("© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; "
            "all rights reserved. The organisations in charge of the Copernicus programme by law or by delegation do not incur any "
            "liability for any use of the Copernicus WorldDEM-30.")

# ---------------- HÀM (thuần, thử được ngoài Colab) ----------------
import os, re, json, time, math, shutil
import numpy as np


def ten_o(lat, lon):
    """Tên ô Copernicus DEM 1° × 1° có góc tây nam (lat, lon), vd N20_00_E106_00."""
    ns, ew = ("N" if lat >= 0 else "S"), ("E" if lon >= 0 else "W")
    t = f"Copernicus_DSM_COG_10_{ns}{abs(lat):02d}_00_{ew}{abs(lon):03d}_00_DEM"
    return t, f"{AWS}/{t}/{t}.tif"


def cac_o(bb):
    """Các ô 1° phủ hộp bao (lon0, lat0, lon1, lat1)."""
    return [ten_o(la, lo) for la in range(math.floor(bb[1]), math.floor(bb[3]) + 1) for lo in range(math.floor(bb[0]), math.floor(bb[2]) + 1)]


def dem_utm(nguon, out, bb, buoc=BUOC_M, crs="EPSG:32648"):
    """Ghép các ô (EPSG:4326, float32 m) -> một ảnh UTM int16 đêximét phủ hộp bao bb (lon, lat); nội suy song tuyến."""
    import rasterio
    from rasterio.merge import merge
    from rasterio.warp import reproject, Resampling, transform_bounds
    from rasterio.transform import from_origin
    ds = [rasterio.open(p) for p in nguon]
    try:
        m, tr = merge(ds, bounds=bb, nodata=np.nan, dtype="float32")
        src_crs = ds[0].crs
    finally:
        for d in ds: d.close()
    x0, y0, x1, y1 = transform_bounds("EPSG:4326", crs, *bb, densify_pts=21)
    x0, y1 = math.floor(x0 / buoc) * buoc, math.ceil(y1 / buoc) * buoc
    W, H = int(math.ceil((x1 - x0) / buoc)), int(math.ceil((y1 - y0) / buoc))
    dst = np.full((H, W), np.nan, np.float32)
    reproject(m[0], dst, src_transform=tr, src_crs=src_crs, src_nodata=np.nan, dst_transform=from_origin(x0, y1, buoc, buoc),
              dst_crs=crs, dst_nodata=np.nan, resampling=Resampling.bilinear)
    a = np.where(np.isfinite(dst), np.clip(np.round(dst * 10), -32767, 32767), -32768).astype(np.int16)
    prof = dict(driver="GTiff", width=W, height=H, count=1, dtype="int16", crs=crs, transform=from_origin(x0, y1, buoc, buoc),
                nodata=-32768, compress="DEFLATE", predictor=2, tiled=True, blockxsize=256, blockysize=256)
    tmp = out + ".tmp.tif"
    with rasterio.open(tmp, "w", **prof) as o:
        o.write(a, 1)
    dem_cog(tmp, out); os.remove(tmp)
    return out


def dem_cog(src, out):
    """GeoTIFF -> COG giữ nguyên giá trị (overview trung bình)."""
    import rasterio.shutil as rsh
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    rsh.copy(src, out, driver="COG", compress="DEFLATE", predictor=2, blocksize=256, overviews="AUTO", resampling="AVERAGE", NUM_THREADS="ALL_CPUS")
    return out


def dem_keo_gian(path, ranh=None, p=(2, 98)):
    """p2, p98 độ cao (m) trong ranh giới (nếu có) để trang đặt thang màu mặc định."""
    import rasterio
    from rasterio.features import geometry_mask
    with rasterio.open(path) as d:
        a = d.read(1).astype(np.float64); ok = a != d.nodata
        if ranh is not None:
            ok &= ~geometry_mask(ranh, out_shape=a.shape, transform=d.transform)
        v = a[ok] / 10
    if not v.size:
        return dict(lo=0.0, hi=50.0)
    return dict(lo=round(float(np.percentile(v, p[0])), 1), hi=round(float(np.percentile(v, p[1])), 1), phan_vi=list(p))


def ranh_hop(geojson_path):
    """Hộp bao (lon, lat) và các hình (đã đổi sang UTM 48N) của ranh giới xã."""
    import geopandas as gpd
    g = gpd.read_file(geojson_path)
    return tuple(float(v) for v in g.total_bounds), list(g.to_crs("EPSG:32648").geometry)


# ---------------- CHẠY (Colab) ----------------
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
!pip install -q rasterio geopandas huggingface_hub
import requests
D = "/content/drive/MyDrive"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"; TMP = "/content/tmp_dem"; os.makedirs(TMP, exist_ok=True)
assert os.path.exists(f"{HF_DIR}/manifest.json"), "chưa có bộ dữ liệu trên Drive (HP_HF_LOP_THAM_CHIEU)"
man = json.load(open(f"{HF_DIR}/manifest.json"))
RANH = f"{HF_DIR}/{man.get('ranh_gioi_xa', 'ranh_gioi/xa.geojson')}"
assert os.path.exists(RANH), "chưa có ranh giới xã (chạy HF_RANH_GIOI_XA_cell.py trước)"
bb, hinh = ranh_hop(RANH)
bb = (bb[0] - DEM_NOI, bb[1] - DEM_NOI, bb[2] + DEM_NOI, bb[3] + DEM_NOI)
print("hộp bao:", [round(v, 3) for v in bb])

tok = None
if GUI_LEN:
    from huggingface_hub import HfApi, CommitOperationAdd
    try:
        from google.colab import userdata; tok = userdata.get("HF_TOKEN")
    except Exception:
        import getpass; tok = getpass.getpass("HF token (quyền ghi): ")
    api = HfApi(token=tok)
    da_co = set(api.list_repo_files(HF_REPO, repo_type="dataset"))
else:
    da_co = set()
TEN = "dem/dem_cop30.tif"
if TEN in da_co and not LAM_LAI:
    print("DEM đã có trên Hugging Face; đặt LAM_LAI = True để dựng lại")
else:
    tai = []
    for t, url in cac_o(bb):
        p = f"{TMP}/{t}.tif"
        if not os.path.exists(p):
            r = requests.get(url, timeout=120, stream=True)
            if r.status_code == 404:
                print("  không có ô (biển):", t); continue
            r.raise_for_status()
            with open(p + ".part", "wb") as f:
                for c in r.iter_content(1 << 20): f.write(c)
            os.replace(p + ".part", p)
        tai.append(p); print("  ô", t, f"{os.path.getsize(p) / 1e6:.1f} MB")
    assert tai, "không tải được ô DEM nào"
    t0 = time.time(); out = f"{TMP}/dem_cop30.tif"
    dem_utm(tai, out, bb)
    KG = dem_keo_gian(out, hinh)
    import rasterio
    with rasterio.open(out) as d:
        print(f"DEM {d.width} × {d.height}, {d.res[0]:.0f} m, {os.path.getsize(out) / 1e6:.1f} MB, {len(d.overviews(1))} mức overview, "
              f"độ cao p2-p98 trong ranh giới {KG['lo']} .. {KG['hi']} m, {time.time() - t0:.0f}s")
    os.makedirs(f"{HF_DIR}/dem", exist_ok=True); shutil.copyfile(out, f"{HF_DIR}/{TEN}")
    # manifest (giữ bản trước), README
    if not os.path.exists(f"{HF_DIR}/manifest_v4.json"):
        shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v4.json")
    man["dem"] = dict(duong_dan=TEN, ten="DEM: độ cao, độ dốc, bóng địa hình", nguon=NGUON_DEM, crs="EPSG:32648", buoc_m=BUOC_M,
                      don_vi="dm (× 0.1 = m)", he_so=0.1, nodata=-32768, keo_gian=KG, ghi_cong=GHI_CONG,
                      ghi_chu="mô hình bề mặt (DSM): gồm cả nhà, cây; độ cao so với EGM2008")
    man["phien_ban"] = max(int(man.get("phien_ban", 1)), 4); man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
    json.dump(man, open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
    rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## DEM")[0]
    rd += (f"\n## DEM ({time.strftime('%Y-%m-%d')})\n- `{TEN}`: {NGUON_DEM}, ghép và chiếu về UTM 48N bước {BUOC_M} m, int16 đêximét "
           f"(nodata -32768), COG. Mô hình bề mặt: gồm cả nhà, cây. Trang (bản 2.4) tính độ dốc, bóng địa hình và dùng làm đặc trưng so sánh.\n"
           f"- Ghi công: {GHI_CONG}\n")
    open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)
    if GUI_LEN:
        api.create_commit(repo_id=HF_REPO, repo_type="dataset", commit_message="Geoportal 2.4: DEM Copernicus GLO-30",
                          operations=[CommitOperationAdd(path_in_repo=t, path_or_fileobj=f"{HF_DIR}/{t}") for t in
                                      [TEN, "manifest.json", "manifest_v4.json", "README.md"]])
        print("đã đẩy lên", HF_REPO)
