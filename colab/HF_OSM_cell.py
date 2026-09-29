# ============ OPENSTREETMAP CHO GEOPORTAL 2.2 -> HUGGING FACE (xem, truy vấn, sửa, lấy mẫu trong trang) ============
# Chạy độc lập trên Colab CPU. Bản 2: KHÔNG phụ thuộc Overpass (máy chủ overpass-api.de hay từ chối kết nối từ Colab).
# Tải bản trích OSM Việt Nam của Geofabrik (.osm.pbf, cập nhật hằng ngày), cắt theo ranh giới Hải Phòng mới bằng
# osmium-tool, đọc bằng pyosmium (tự dựng đa giác từ đường khép kín và quan hệ multipolygon), chia 7 chủ đề, mỗi chủ đề
# một tệp FlatGeobuf có chỉ mục không gian (trang web chỉ đọc phần trong khung nhìn), kèm GeoPackage gộp để tải về.
# Nếu Geofabrik không tải được: đặt NGUON = "overpass" để dùng osmnx qua các máy chủ Overpass dự phòng.
# Chạy lại thì bỏ qua chủ đề đã có (LAM_LAI = True để cập nhật). Dữ liệu © OpenStreetMap contributors, ODbL 1.0.
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
CHON = ["sdd", "tunhien", "nuoc", "kenh", "duong", "nha", "diem"]   # bỏ bớt chủ đề nếu cần
NGUON = "geofabrik"        # "geofabrik" (khuyên dùng) hoặc "overpass"
PBF_URL = "https://download.geofabrik.de/asia/vietnam-latest.osm.pbf"
OVERPASS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter"]
LAM_LAI = False
LAM_GPKG = True            # thêm osm/osm_haiphong.gpkg (mọi chủ đề) để tải về
GUI_LEN = True
CAP_NHAT_SPACE = False
SPACE = "lopmaybay/lay-mau-hai-phong"

# ---------------- HÀM (thuần, thử được ngoài Colab) ----------------
import os, sys, re, json, time, shutil
import numpy as np

CHU_DE = {   # id: (tên, hình, thẻ); hình: vung = đa giác, duong = đường, diem = điểm; True = có khoá, danh sách = giá trị cho phép
    "sdd": ("Sử dụng đất (landuse, leisure)", "vung",
            {"landuse": True, "leisure": ["park", "garden", "golf_course", "pitch", "recreation_ground", "stadium", "nature_reserve"]}),
    "tunhien": ("Tự nhiên (rừng, cây bụi, đất ngập nước, bãi cát, núi đá)", "vung",
                {"natural": ["wood", "scrub", "grassland", "heath", "wetland", "beach", "sand", "bare_rock", "rock", "mud", "shingle"]}),
    "nuoc": ("Mặt nước (sông, hồ, ao, kênh dạng vùng)", "vung",
             {"natural": ["water", "bay"], "water": True, "waterway": ["riverbank", "dock", "canal"], "landuse": ["reservoir", "basin", "aquaculture"]}),
    "kenh": ("Sông, kênh, mương (đường)", "duong", {"waterway": ["river", "stream", "canal", "drain", "ditch", "tidal_channel"]}),
    "duong": ("Đường giao thông, đường sắt", "duong", {"highway": True, "railway": ["rail", "light_rail", "narrow_gauge"]}),
    "nha": ("Nhà, công trình (building)", "vung", {"building": True}),
    "diem": ("Điểm quan tâm (trường, chợ, cơ quan, địa danh)", "diem",
             {"amenity": True, "shop": True, "tourism": True, "office": True, "place": True, "historic": True}),
}
UU_TIEN = ["building", "landuse", "natural", "water", "wetland", "leisure", "waterway", "highway", "railway", "aeroway",
           "amenity", "shop", "tourism", "office", "historic", "place"]
HINH = {"vung": ("Polygon", "MultiPolygon"), "duong": ("LineString", "MultiLineString"), "diem": ("Point",)}


def the_chinh(tags):
    """Thẻ chính 'khoá=giá trị' theo thứ tự ưu tiên (trang dùng để tô màu và quy đổi lớp)."""
    for k in UU_TIEN:
        v = tags.get(k)
        if v is not None and str(v) not in ("", "nan", "None", "no"):
            return f"{k}={v}"
    return ""


def khop_the(tags, spec):
    """Đối tượng thuộc chủ đề nếu có ít nhất một khoá khớp (như cách osmnx hiểu `tags`)."""
    for k, v in spec.items():
        x = tags.get(k)
        if x is None or x == "no":
            continue
        if v is True or x in v:
            return True
    return False


def _gdf(rows, ranh=None):
    """rows: [(osm_type, osm_id, tags, shapely geom)] -> GeoDataFrame cột chuẩn, chỉ giữ đối tượng cắt ranh giới."""
    import geopandas as gpd
    g = gpd.GeoDataFrame(dict(osm_type=[r[0] for r in rows], osm_id=np.array([r[1] for r in rows], dtype="int64"),
                              the=[the_chinh(r[2]) for r in rows], ten=[r[2].get("name", "") for r in rows],
                              tags=[json.dumps(r[2], ensure_ascii=False) for r in rows]),
                         geometry=[r[3] for r in rows], crs="EPSG:4326")
    if ranh is not None and len(g):
        g = g[g.geometry.intersects(ranh)]
    return g.reset_index(drop=True)


def doc_pbf(path, chon, ranh=None):
    """Đọc tệp OSM (.osm.pbf hoặc .osm) bằng pyosmium: đa giác từ đường khép kín và quan hệ multipolygon (khu vực),
    đường từ way, điểm từ node có thẻ. Trả {chủ đề: GeoDataFrame chuẩn}. Đa giác -> MultiPolygon, đường -> MultiLineString."""
    import osmium
    from shapely import wkb
    from shapely.geometry import MultiLineString
    fab = osmium.geom.WKBFactory()
    theo = {h: [c for c in chon if CHU_DE[c][1] == h] for h in HINH}
    rows = {c: [] for c in chon}
    fp = osmium.FileProcessor(path).with_locations().with_areas().with_filter(osmium.filter.EmptyTagFilter())
    for o in fp:
        tags = {t.k: t.v for t in o.tags}
        if o.is_area():
            cds = [c for c in theo["vung"] if khop_the(tags, CHU_DE[c][2])]
            if not cds:
                continue
            try:
                geom = wkb.loads(fab.create_multipolygon(o), hex=True)
            except Exception:
                continue                     # quan hệ hỏng, vòng không khép
            typ, oid = ("way" if o.from_way() else "relation"), o.orig_id()
        elif o.is_way():
            cds = [c for c in theo["duong"] if khop_the(tags, CHU_DE[c][2])]
            if not cds:
                continue
            try:
                geom = MultiLineString([wkb.loads(fab.create_linestring(o), hex=True)])
            except Exception:
                continue
            typ, oid = "way", o.id
        elif o.is_node():
            cds = [c for c in theo["diem"] if khop_the(tags, CHU_DE[c][2])]
            if not cds:
                continue
            geom = wkb.loads(fab.create_point(o), hex=True)
            typ, oid = "node", o.id
        else:
            continue
        for c in cds:
            rows[c].append((typ, oid, tags, geom))
    return {c: _gdf(rows[c], ranh) for c in chon}


def chuan_hoa(gdf, hinh, ranh=None):
    """(Đường dự phòng Overpass) GeoDataFrame của osmnx (nhiều cột thẻ) -> cột chuẩn như doc_pbf."""
    from shapely.geometry import MultiPolygon, MultiLineString
    g = gdf.reset_index()
    tcol = next(c for c in ("element", "element_type") if c in g.columns)
    icol = next(c for c in ("id", "osmid") if c in g.columns)
    g = g[g.geometry.notna() & g.geometry.geom_type.isin(HINH[hinh])]
    bo = {tcol, icol, "geometry", "nodes", "ways", "members"}
    cols = [c for c in g.columns if c not in bo]
    ok = lambda v: v is not None and not (isinstance(v, float) and np.isnan(v)) and str(v) != ""
    T = [{k: str(v) for k, v in r.items() if ok(v)} for r in g[cols].to_dict("records")] if cols else [{} for _ in range(len(g))]
    geom = [MultiPolygon([x]) if x.geom_type == "Polygon" else MultiLineString([x]) if x.geom_type == "LineString" else x for x in g.geometry]
    return _gdf([(str(a), int(b), t, x) for a, b, t, x in zip(g[tcol], g[icol], T, geom)], ranh)


def ghi_fgb(g, out):
    """FlatGeobuf có chỉ mục không gian (cây R đóng gói): trang đọc theo khung nhìn bằng yêu cầu HTTP Range."""
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    if os.path.exists(out):
        os.remove(out)
    g.to_file(out, driver="FlatGeobuf", engine="pyogrio", SPATIAL_INDEX="YES")
    return out


# ---------------- CHẠY (Colab) ----------------
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
!pip install -q osmium geopandas pyogrio huggingface_hub
import subprocess, requests
import geopandas as gpd
D = "/content/drive/MyDrive"; MOD = f"{D}/HP_modules"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"
TMP = "/content/tmp_osm"; os.makedirs(TMP, exist_ok=True)
assert os.path.exists(f"{HF_DIR}/ranh_gioi/xa.geojson"), "chưa có ranh giới xã: chạy HF_RANH_GIOI_XA_cell.py trước"


def phien_ban(p, mau):
    if not os.path.exists(p):
        return (0,)
    m = re.search(mau, open(p, encoding="utf-8", errors="ignore").read())
    return tuple(int(v) for v in m.group(1).split(".")) if m else (0,)


if phien_ban(f"{MOD}/LAY_MAU_DA_NAM.html", r'const VERSION = "([\d.]+)"') < (2, 2):
    print("Tải lên HP_modules: LAY_MAU_DA_NAM.html (bản 2.2)"); from google.colab import files
    for k in files.upload(): shutil.copy(k, MOD)
assert phien_ban(f"{MOD}/LAY_MAU_DA_NAM.html", r'const VERSION = "([\d.]+)"') >= (2, 2), "cần LAY_MAU_DA_NAM.html bản 2.2"
xa = gpd.read_file(f"{HF_DIR}/ranh_gioi/xa.geojson").to_crs(4326)
RANH = xa.union_all() if hasattr(xa, "union_all") else xa.unary_union
print(f"ranh giới: {len(xa)} xã, hộp bao {[round(v, 3) for v in RANH.bounds]}")

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
lam = [c for c in CHON if LAM_LAI or f"osm/{c}.fgb" not in da_co or not os.path.exists(f"{HF_DIR}/osm/{c}.fgb")]
print("cần dựng:", lam or "(không, mọi chủ đề đã có)")

KQ = {}
if lam and NGUON == "geofabrik":
    # 1) tải bản trích Việt Nam (nối tiếp được nếu đứt giữa chừng)
    vn = f"{TMP}/vietnam-latest.osm.pbf"
    tong = int(requests.head(PBF_URL, allow_redirects=True, timeout=60).headers.get("Content-Length", 0))
    if not (os.path.exists(vn) and os.path.getsize(vn) == tong):
        t0 = time.time(); co = os.path.getsize(vn) if os.path.exists(vn) else 0
        with requests.get(PBF_URL, stream=True, timeout=120, headers={"Range": f"bytes={co}-"} if co else {}) as r:
            r.raise_for_status()
            with open(vn, "ab" if co and r.status_code == 206 else "wb") as f:
                for b in r.iter_content(1 << 22):
                    f.write(b)
        print(f"Geofabrik: {os.path.getsize(vn) / 1e6:.0f} MB, {time.time() - t0:.0f}s")
    # 2) cắt theo ranh giới (đệm 300 m) bằng osmium-tool; không cài được thì đọc cả tệp Việt Nam (chậm hơn)
    hp = f"{TMP}/haiphong.osm.pbf"
    gpd.GeoSeries([RANH.buffer(0.003)], crs=4326).to_file(f"{TMP}/ranh.geojson", driver="GeoJSON")
    rc = subprocess.run("apt-get -qq install -y osmium-tool > /dev/null 2>&1 && osmium extract -p " +
                        f"{TMP}/ranh.geojson {vn} -o {hp} --overwrite", shell=True).returncode
    nguon = hp if rc == 0 and os.path.exists(hp) else vn
    print("đọc:", os.path.basename(nguon), f"{os.path.getsize(nguon) / 1e6:.0f} MB")
    t0 = time.time(); KQ = doc_pbf(nguon, lam, RANH)
    print(f"pyosmium: {time.time() - t0:.0f}s |", {c: len(g) for c, g in KQ.items()})
elif lam:
    !pip install -q osmnx
    import osmnx as ox
    ox.settings.timeout = 600; ox.settings.max_query_area_size = 2.5e8
    ox.settings.use_cache = True; ox.settings.cache_folder = f"{TMP}/cache"
    for c in lam:
        for url in OVERPASS:
            try:
                ox.settings.overpass_url = url.rsplit("/", 1)[0]
                KQ[c] = chuan_hoa(ox.features_from_polygon(RANH, CHU_DE[c][2]), CHU_DE[c][1], RANH)
                print(f"   {c}: {len(KQ[c])} đối tượng qua {url}"); break
            except Exception as e:
                print(f"   {c}: {url} lỗi ({str(e)[:80]}), thử máy chủ khác")
        assert c in KQ, f"không tải được {c} từ mọi máy chủ Overpass: dùng NGUON = 'geofabrik'"

LOP = []
for cid in CHON:
    ten, hinh, _ = CHU_DE[cid]
    duong = f"osm/{cid}.fgb"; loc = f"{TMP}/{cid}.fgb"
    if cid in KQ:
        g = KQ[cid]; ghi_fgb(g, loc)
        os.makedirs(f"{HF_DIR}/osm", exist_ok=True); shutil.copyfile(loc, f"{HF_DIR}/{duong}")
        print(f"== {cid}: {len(g)} đối tượng, {os.path.getsize(loc) / 1e6:.1f} MB")
        if GUI_LEN:
            api.upload_file(path_or_fileobj=loc, path_in_repo=duong, repo_id=HF_REPO, repo_type="dataset",
                            commit_message=f"OSM {cid}: {len(g)} đối tượng (FlatGeobuf có chỉ mục)")
    else:
        g = gpd.read_file(f"{HF_DIR}/{duong}"); print(f"== {cid}: đã có ({len(g)} đối tượng)")
    LOP.append(dict(id=cid, ten=ten, hinh=hinh, duong_dan=duong, n=int(len(g)),
                    bbox=[round(v, 5) for v in g.total_bounds.tolist()] if len(g) else None))
    if LAM_GPKG:
        g.to_file(f"{TMP}/osm_haiphong.gpkg", layer=cid, driver="GPKG", engine="pyogrio")

man = json.load(open(f"{HF_DIR}/manifest.json"))
if not os.path.exists(f"{HF_DIR}/manifest_v4.json"):
    shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v4.json")
man["osm"] = dict(ngay=time.strftime("%Y-%m-%d"), nguon="© OpenStreetMap contributors, ODbL 1.0", lop=LOP,
                  gpkg="osm/osm_haiphong.gpkg" if LAM_GPKG else None,
                  ghi_chu=("Bản trích Geofabrik Việt Nam, cắt theo ranh giới xã, đọc bằng pyosmium" if NGUON == "geofabrik" else
                           "Tải bằng osmnx (Overpass)") + "; giữ đối tượng cắt ranh giới; cột tags là JSON mọi thẻ OSM.")
man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
json.dump(man, open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## OpenStreetMap")[0]
rd += (f"\n## OpenStreetMap ({time.strftime('%Y-%m-%d')})\n- `osm/*.fgb`: " + ", ".join(f"`{L['id']}` {L['n']:,}" for L in LOP) +
       " đối tượng; FlatGeobuf WGS84 có chỉ mục không gian, cột `osm_type`, `osm_id`, `the` (thẻ chính), `ten`, `tags` (JSON).\n"
       + ("- `osm/osm_haiphong.gpkg`: mọi chủ đề trong một GeoPackage để mở bằng QGIS.\n" if LAM_GPKG else "")
       + "- © OpenStreetMap contributors, cấp phép ODbL 1.0 (https://www.openstreetmap.org/copyright).\n")
open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)
if GUI_LEN:
    ops = [CommitOperationAdd(path_in_repo=t, path_or_fileobj=f"{HF_DIR}/{t}") for t in ["manifest.json", "manifest_v4.json", "README.md"]]
    if LAM_GPKG:
        ops.append(CommitOperationAdd(path_in_repo="osm/osm_haiphong.gpkg", path_or_fileobj=f"{TMP}/osm_haiphong.gpkg"))
    shutil.copyfile(f"{MOD}/LAY_MAU_DA_NAM.html", f"{HF_DIR}/LAY_MAU_DA_NAM.html")
    ops.append(CommitOperationAdd(path_in_repo="LAY_MAU_DA_NAM.html", path_or_fileobj=f"{HF_DIR}/LAY_MAU_DA_NAM.html"))
    api.create_commit(repo_id=HF_REPO, repo_type="dataset", commit_message="OSM cho geoportal 2.2: manifest, GeoPackage", operations=ops)
    if CAP_NHAT_SPACE:
        api.upload_file(path_or_fileobj=f"{HF_DIR}/LAY_MAU_DA_NAM.html", path_in_repo="index.html", repo_id=SPACE, repo_type="space")
print("xong:", [(L["id"], L["n"]) for L in LOP])
