# ============ RANH GIỚI HÀNH CHÍNH VIỆT NAM (34 tỉnh, 3321 xã) CHO GEOPORTAL 2.7 -> HUGGING FACE ============
# Chạy độc lập trên Colab CPU (khoảng 3 đến 5 phút). Token HF: Colab Secrets (HF_TOKEN) hoặc nhập ẩn, không ghi vào ô.
# Nguồn: kho thanglequoc/vietnamese-provinces-database (giấy phép MIT), thư mục json/geojson: ranh giới 34 tỉnh và 3321 xã
# theo đơn vị hành chính từ 01/07/2025 (cập nhật theo các nghị quyết sau đó), dẫn xuất từ "Bản đồ tham khảo đơn vị hành chính
# Việt Nam" (sapnhap.bando.com.vn, NXB Tài nguyên Môi trường và Bản đồ Việt Nam). Mã tỉnh, mã xã là mã chính thức.
# Ra trên bộ dữ liệu:
#   vn/tinh.geojson          34 tỉnh, giản lược GIAN_LUOC_TINH_M (hiện ranh giới, chọn tỉnh, phạm vi cả tỉnh)
#   vn/xa/<mã tỉnh>.geojson  xã của từng tỉnh, giản lược GIAN_LUOC_XA_M (nạp khi chọn tỉnh: tìm xã, chọn vùng, thống kê)
#   vn/danh_muc.json         tên, mã, hộp bao, điểm đại diện của mọi tỉnh và xã (tìm kiếm toàn quốc)
#   manifest["vn"]
# Các tỉnh khác chưa có ảnh: ranh giới để tìm xã, đặt phạm vi, xem ảnh nền và dải ảnh (Wayback, Sentinel-2 cloudless).
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
KHO_NGUON = "https://github.com/thanglequoc/vietnamese-provinces-database.git"
NHANH = "master"
GIAN_LUOC_TINH_M = 30       # m; ranh giới tỉnh (34 hình, cỡ tệp nhỏ)
GIAN_LUOC_XA_M = 5          # m; như ranh giới xã Hải Phòng hiện có
TINH_MAC_DINH = "31"        # Hải Phòng: tỉnh của bộ dữ liệu ảnh hiện có
GUI_LEN = True

# ---------------- HÀM (thuần, thử được ngoài Colab) ----------------
import os, re, json, time, glob, shutil, subprocess


def tai_nguon(thu_muc, kho=KHO_NGUON, nhanh=NHANH):
    """Lấy riêng thư mục json/geojson của kho nguồn (sparse checkout, khoảng 600 MB). Trả (đường dẫn, mã commit)."""
    if not os.path.isdir(f"{thu_muc}/json/geojson"):
        subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", "-b", nhanh, kho, thu_muc], check=True)
        subprocess.run(["git", "-C", thu_muc, "sparse-checkout", "set", "json/geojson"], check=True)
    cm = subprocess.run(["git", "-C", thu_muc, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    return f"{thu_muc}/json/geojson", cm


def _mot(p):
    j = json.load(open(p, encoding="utf-8"))
    f = j["features"][0]
    return f["properties"], f["geometry"]


def doc_nguon(goc):
    """Đọc thư mục json/geojson: -> (bảng tỉnh, bảng xã) dạng GeoDataFrame EPSG:4326."""
    import geopandas as gpd
    from shapely.geometry import shape
    T, X = [], []
    for d in sorted(glob.glob(f"{goc}/*/")):
        ten_tm = os.path.basename(d.rstrip("/"))
        m = re.match(r"^(\d+)_", ten_tm)
        if not m:
            continue
        ma_t = m.group(1)
        pt = glob.glob(f"{d}{ten_tm}.geojson")
        if not pt:
            continue
        pr, ge = _mot(pt[0])
        T.append(dict(ma=str(pr.get("code") or ma_t), ten=pr.get("name"), ten_day_du=pr.get("fullName"), ten_en=pr.get("nameEn"),
                      dien_tich_km2=pr.get("areaKm2"), geometry=shape(ge)))
        for p in sorted(glob.glob(f"{d}wards/*.geojson")):
            pr, ge = _mot(p)
            X.append(dict(ma=str(pr.get("code")), ten=pr.get("fullName") or pr.get("name"), ten_ngan=pr.get("name"),
                          ten_en=pr.get("fullNameEn") or pr.get("nameEn"), ma_tinh=ma_t, dien_tich_km2=pr.get("areaKm2"), geometry=shape(ge)))
    t = gpd.GeoDataFrame(T, crs="EPSG:4326"); x = gpd.GeoDataFrame(X, crs="EPSG:4326")
    return t, x


def gian_luoc(g, m):
    """Giản lược m mét (tính trong UTM 48N; sai số tỉ lệ ở phía đông ngoài múi 48 không đáng kể với vài mét)."""
    if not m:
        return g
    g = g.copy()
    u = g.to_crs("EPSG:32648")
    u["geometry"] = u.geometry.simplify(m, preserve_topology=True)
    g["geometry"] = u.to_crs("EPSG:4326").geometry
    return g


def ghi_geojson(g, p):
    if os.path.exists(p):
        os.remove(p)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    g.to_file(p, driver="GeoJSON", COORDINATE_PRECISION=6)
    return os.path.getsize(p)


def dung(goc, ra, cm="", gian_tinh=GIAN_LUOC_TINH_M, gian_xa=GIAN_LUOC_XA_M, verbose=True):
    """Dựng vn/ trong thư mục `ra`: tinh.geojson, xa/<mã>.geojson, danh_muc.json. Trả thông tin tóm tắt."""
    t0 = time.time()
    t, x = doc_nguon(goc)
    assert len(t) > 0 and len(x) > 0, "không đọc được tỉnh, xã nào"
    tg = gian_luoc(t, gian_tinh)
    tg["so_xa"] = [int((x.ma_tinh == m).sum()) for m in tg.ma]
    n_t = ghi_geojson(tg, f"{ra}/vn/tinh.geojson")
    co = 0
    for ma, nhom in x.groupby("ma_tinh"):
        g = gian_luoc(nhom.reset_index(drop=True), gian_xa)
        co += ghi_geojson(g[["ma", "ten", "ten_ngan", "ten_en", "ma_tinh", "dien_tich_km2", "geometry"]], f"{ra}/vn/xa/{ma}.geojson")
    rp = x.geometry.representative_point()
    dm = dict(nguon="thanglequoc/vietnamese-provinces-database (MIT), từ sapnhap.bando.com.vn", commit=cm, tao_luc=time.strftime("%Y-%m-%d"),
              tinh=[dict(ma=r.ma, ten=r.ten, ten_day_du=r.ten_day_du, ten_en=r.ten_en, so_xa=int(r.so_xa),
                         dien_tich_km2=r.dien_tich_km2, bb=[round(v, 5) for v in r.geometry.bounds]) for r in tg.itertuples()],
              xa=[[r.ma, r.ten, r.ma_tinh, round(p.x, 5), round(p.y, 5)] for r, p in zip(x.itertuples(), rp)])
    os.makedirs(f"{ra}/vn", exist_ok=True)
    json.dump(dm, open(f"{ra}/vn/danh_muc.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    kq = dict(so_tinh=len(t), so_xa=len(x), mb_tinh=round(n_t / 1e6, 2), mb_xa=round(co / 1e6, 1),
              mb_danh_muc=round(os.path.getsize(f"{ra}/vn/danh_muc.json") / 1e6, 2), giay=round(time.time() - t0))
    if verbose:
        print(f"{kq['so_tinh']} tỉnh ({kq['mb_tinh']} MB), {kq['so_xa']} xã ({kq['mb_xa']} MB, {len(set(x.ma_tinh))} tệp), "
              f"danh mục {kq['mb_danh_muc']} MB, {kq['giay']} s")
    return kq


def ghi_manifest(man, cm, tinh_mac_dinh=TINH_MAC_DINH):
    man["vn"] = dict(tinh="vn/tinh.geojson", xa="vn/xa/{ma}.geojson", danh_muc="vn/danh_muc.json", tinh_mac_dinh=tinh_mac_dinh,
                     nguon="thanglequoc/vietnamese-provinces-database (giấy phép MIT), ranh giới từ sapnhap.bando.com.vn",
                     commit=cm, ghi_chu="34 tỉnh, 3321 xã theo đơn vị hành chính từ 01/07/2025")
    man["phien_ban"] = max(int(man.get("phien_ban", 1)), 7)
    man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
    return man


# ---------------- CHẠY (Colab) ----------------
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
subprocess.run(["pip", "install", "-q", "geopandas", "huggingface_hub"], check=False)
D = "/content/drive/MyDrive"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"; NGUON = "/content/vn_nguon"
assert os.path.exists(f"{HF_DIR}/manifest.json"), "chưa có bộ dữ liệu trên Drive (HP_HF_LOP_THAM_CHIEU)"
goc, cm = tai_nguon(NGUON)
print("nguồn:", KHO_NGUON, "commit", cm)
kq = dung(goc, HF_DIR, cm)
man = json.load(open(f"{HF_DIR}/manifest.json"))
if not os.path.exists(f"{HF_DIR}/manifest_v6.json"):
    shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v6.json")          # giữ bản trước
json.dump(ghi_manifest(man, cm), open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## Ranh giới hành chính Việt Nam")[0]
rd += (f"\n## Ranh giới hành chính Việt Nam ({time.strftime('%Y-%m-%d')})\n- `vn/tinh.geojson`: {kq['so_tinh']} tỉnh (giản lược "
       f"{GIAN_LUOC_TINH_M} m); `vn/xa/<mã tỉnh>.geojson`: {kq['so_xa']} xã (giản lược {GIAN_LUOC_XA_M} m); `vn/danh_muc.json`: tên, mã, "
       f"hộp bao để tìm kiếm.\n- Nguồn: thanglequoc/vietnamese-provinces-database (MIT, commit {cm}), ranh giới dẫn xuất từ Bản đồ tham khảo "
       f"đơn vị hành chính Việt Nam (sapnhap.bando.com.vn). Mã tỉnh, xã là mã chính thức.\n")
open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)
if GUI_LEN:
    from huggingface_hub import HfApi
    try:
        from google.colab import userdata; tok = userdata.get("HF_TOKEN")
    except Exception:
        import getpass; tok = getpass.getpass("HF token (quyền ghi): ")
    api = HfApi(token=tok)
    api.upload_folder(repo_id=HF_REPO, repo_type="dataset", folder_path=f"{HF_DIR}/vn", path_in_repo="vn",
                      commit_message="Geoportal 2.7: ranh giới 34 tỉnh, 3321 xã")
    for t in ["manifest.json", "manifest_v6.json", "README.md"]:
        api.upload_file(path_or_fileobj=f"{HF_DIR}/{t}", path_in_repo=t, repo_id=HF_REPO, repo_type="dataset",
                        commit_message="Geoportal 2.7: manifest ranh giới Việt Nam")
    print("đã đẩy lên", HF_REPO)
