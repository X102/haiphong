# ============ RANH GIỚI XÃ CHO CÔNG CỤ CHỌN VÙNG + GEOPORTAL 2.1 -> HUGGING FACE ============
# Chạy được độc lập (Colab CPU). Tạo ranh_gioi/xa.geojson (114 xã, WGS84, giản lược 5 m), ghi vào manifest,
# rồi đẩy lên bộ dữ liệu cùng trang LAY_MAU_DA_NAM.html bản 2.1 (geoportal: vi/ru/en, di động, đường mùa vụ nhiều năm, liên kết ngoài).
# Trước khi chạy: tải LAY_MAU_DA_NAM.html bản 2.1 vào HP_modules (ô sẽ hỏi nếu còn bản cũ).
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
GIAN_LUOC_M = 5          # giản lược ranh giới (m); 0 = giữ nguyên
GUI_LEN = True
CAP_NHAT_SPACE = False   # True: cập nhật cả index.html của Space
SPACE = "lopmaybay/lay-mau-hai-phong"

import os, sys, re, json, time, shutil
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
!pip install -q geopandas huggingface_hub
import geopandas as gpd
D = "/content/drive/MyDrive"; MOD = f"{D}/HP_modules"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"
assert os.path.exists(f"{HF_DIR}/manifest.json"), "chưa có bộ dữ liệu trên Drive (HP_HF_LOP_THAM_CHIEU)"


def phien_ban(p, mau):
    if not os.path.exists(p):
        return (0,)
    m = re.search(mau, open(p, encoding="utf-8", errors="ignore").read())
    return tuple(int(v) for v in m.group(1).split(".")) if m else (0,)


if phien_ban(f"{MOD}/LAY_MAU_DA_NAM.html", r'const VERSION = "([\d.]+)"') < (2, 1):
    print("Tải lên HP_modules: LAY_MAU_DA_NAM.html (bản 2.1)"); from google.colab import files
    for k in files.upload(): shutil.copy(k, MOD)
assert phien_ban(f"{MOD}/LAY_MAU_DA_NAM.html", r'const VERSION = "([\d.]+)"') >= (2, 1), "cần LAY_MAU_DA_NAM.html bản 2.1"
if MOD not in sys.path: sys.path.insert(0, MOD)
sys.modules.pop("s2_multiyear", None)
import s2_multiyear as M

bnd, name_col = M.read_boundary(f"{D}/TÀI LIỆU KHOÁ HỌC VIỄN THÁM/DỮ LIỆU/Hải Phòng (phường xã) - 34.zip")
g = bnd.to_crs("EPSG:32648")[[name_col, "geometry"]].rename(columns={name_col: "ten"}).reset_index(drop=True)
g["ma"] = range(1, len(g) + 1)
g["dien_tich_km2"] = (g.geometry.area / 1e6).round(3)
if GIAN_LUOC_M:
    g["geometry"] = g.geometry.simplify(GIAN_LUOC_M, preserve_topology=True)
g = g.to_crs("EPSG:4326")
os.makedirs(f"{HF_DIR}/ranh_gioi", exist_ok=True)
p_xa = f"{HF_DIR}/ranh_gioi/xa.geojson"
if os.path.exists(p_xa):
    os.remove(p_xa)
g.to_file(p_xa, driver="GeoJSON", COORDINATE_PRECISION=6)
print(f"ranh giới: {len(g)} xã, tổng {g.dien_tich_km2.sum():.1f} km², tệp {os.path.getsize(p_xa) / 1e6:.2f} MB")

man = json.load(open(f"{HF_DIR}/manifest.json"))
if not os.path.exists(f"{HF_DIR}/manifest_v2.json"):
    shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v2.json")          # giữ bản trước
man["ranh_gioi_xa"] = "ranh_gioi/xa.geojson"
man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
json.dump(man, open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
shutil.copyfile(f"{MOD}/LAY_MAU_DA_NAM.html", f"{HF_DIR}/LAY_MAU_DA_NAM.html")
rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## Ranh giới xã")[0]
rd += (f"\n## Ranh giới xã ({time.strftime('%Y-%m-%d')})\n- `ranh_gioi/xa.geojson`: {len(g)} xã/phường, WGS84, "
       f"giản lược {GIAN_LUOC_M} m, thuộc tính `ten`, `ma`, `dien_tich_km2`. Dùng cho chức năng chọn vùng của trang lấy mẫu.\n")
open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)

if GUI_LEN:
    from huggingface_hub import HfApi, CommitOperationAdd
    try:
        from google.colab import userdata; tok = userdata.get("HF_TOKEN")
    except Exception:
        import getpass; tok = getpass.getpass("HF token (quyền ghi): ")
    api = HfApi(token=tok)
    tep = ["ranh_gioi/xa.geojson", "manifest.json", "manifest_v2.json", "README.md", "LAY_MAU_DA_NAM.html"]
    api.create_commit(repo_id=HF_REPO, repo_type="dataset", commit_message="Ranh giới xã + geoportal 2.1 (vi/ru/en, di động, mùa vụ nhiều năm, liên kết ngoài)",
                      operations=[CommitOperationAdd(path_in_repo=t, path_or_fileobj=f"{HF_DIR}/{t}") for t in tep])
    if CAP_NHAT_SPACE:
        api.upload_file(path_or_fileobj=f"{HF_DIR}/LAY_MAU_DA_NAM.html", path_in_repo="index.html", repo_id=SPACE,
                        repo_type="space")
    print("xong:", f"https://huggingface.co/datasets/{HF_REPO}/blob/main/ranh_gioi/xa.geojson")
