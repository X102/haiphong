# ============ BẢN ĐỒ LỚP PHỦ TOÀN CẦU CHO GEOPORTAL 2.7 -> HUGGING FACE (xem, thống kê, so sánh với bản đồ riêng) ============
# Chạy trên Colab (CPU), cần tài khoản Google Earth Engine có dự án (GEE_PROJECT) và Google Drive.
# Bốn sản phẩm, giữ nguyên MÃ LỚP GỐC (không gộp trước) để trang tự quy đổi về chú giải chung 7 lớp hoặc hệ 3 lớp khi so sánh:
#   DW    Dynamic World V1 (Google, WRI), 10 m, nhãn trội (mode) mùa khô tháng 11 năm trước đến tháng 4 (hoặc cả năm)
#   ESRI  Esri / Impact Observatory 10 m Annual LULC, mỗi năm một ảnh
#   WC    ESA WorldCover 10 m, 2020 (v100) và 2021 (v200)
#   GLC   GLC_FCS30D (Zhang và cs. 2024), 30 m, mỗi năm 2000-2022, 35 lớp
# Ảnh xuất theo đúng lưới UTM 48N của bộ dữ liệu (manifest["grid"]) để không lệch điểm ảnh, cắt theo ranh giới xã, đổi sang COG
# EPSG:3857 láng giềng gần nhất, 0 = ngoài vùng. Dynamic World lưu mã + 1 (1..9) vì 0 dành cho "không có dữ liệu".
# Giấy phép: DW, ESRI, WorldCover, GLC_FCS30D đều CC BY 4.0 (ghi công trong manifest và README).
#
# CHE_DO = "dung_lai" (mặc định, KHÔNG cần Earth Engine): dùng 20 ảnh GL_DW_2017..2025, GL_ESRI_2017..2025, GL_WC20_2020,
# GL_WC21_2021 đã xuất trước đây bằng s2_globallc (sổ tay s2_gee_globallc_akkaunt3, tài khoản thứ ba) và chép vào
# Drive/HP_3class_v1/globallc. Các ảnh này đã quy về hệ 3 lớp (1 thực vật, 2 nước, 3 xây dựng, 0 = lớp không quy đổi: thực vật
# ngập nước, đất trống, băng, mây), UTM 48N 10 m đúng lưới nghiên cứu. Trong ranh giới, 0 được ghi thành 4 "ngoài ba lớp" để
# thống kê phân biệt với "ngoài vùng". Muốn chú giải gốc đầy đủ (và GLC_FCS30D) thì đặt CHE_DO = "gee" khi còn hạn mức.
CHE_DO = "dung_lai"
THU_MUC_GL = ["HP_3class_v1/globallc", "HP_globallc_export", "HP_globallc"]   # nơi tìm GL_*.tif trong Drive (theo thứ tự)
HF_REPO = "lopmaybay/haiphong-lop-tham-chieu"
GEE_PROJECT = ""                    # dự án Earth Engine (chỉ cần khi CHE_DO = "gee"), vd "ee-lopmaybay"
SAN_PHAM = ["DW", "ESRI", "WC", "GLC"]
NAM = list(range(2017, 2026))       # năm muốn có (mỗi sản phẩm tự bỏ năm không có)
DW_MUA_KHO = True                   # True: tháng 11 năm trước đến tháng 4 (khớp ảnh tổng hợp mùa khô); False: cả năm
THU_MUC_DRIVE = "HP_LULC_TG"        # thư mục Drive nhận ảnh xuất từ Earth Engine
LAM_LAI = False                     # True: xuất và dựng lại cả năm đã có
GUI_LEN = True

# ---------------- HÀM (thuần, thử được ngoài Colab) ----------------
import os, re, json, time, glob, math, shutil
import numpy as np

CHUNG = {1: "nước", 2: "cây gỗ, rừng", 3: "cây trồng", 4: "cỏ, cây bụi", 5: "ngập nước có thực vật", 6: "xây dựng", 7: "đất trống"}
SP = {
    "DW": dict(id="dw", ten="Dynamic World V1: nhãn trội theo năm", ten_en="Dynamic World V1: annual dominant label",
               ten_ru="Dynamic World V1: преобладающий класс за год", asset="GOOGLE/DYNAMICWORLD/V1", band="label", nam=(2016, 2026),
               cach="mode", do_phan_giai_m=10, cong=1, giay_phep="CC BY 4.0",
               trich_dan="Brown C.F. et al. (2022) Dynamic World, Near real-time global 10 m land use land cover mapping. Scientific Data 9, 251",
               lop={0: ("nước", "#419bdf", 1, 2), 1: ("cây gỗ", "#397d49", 2, 1), 2: ("cỏ", "#88b053", 4, 1), 3: ("thực vật ngập nước", "#7a87c6", 5, 0),
                    4: ("cây trồng", "#e49635", 3, 1), 5: ("cây bụi", "#dfc35a", 4, 1), 6: ("xây dựng", "#c4281b", 6, 3), 7: ("đất trống", "#a59b8f", 7, 0),
                    8: ("băng tuyết", "#b39fe1", 0, 0)}),         # mã gốc 0..8, lưu 1..9
    "ESRI": dict(id="esri", ten="Esri 10 m Annual LULC", ten_en="Esri 10 m Annual LULC", ten_ru="Esri 10 m Annual LULC",
                 asset="projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS", band="b1", nam=(2017, 2025), cach="nam",
                 do_phan_giai_m=10, cong=0, giay_phep="CC BY 4.0",
                 trich_dan="Karra K. et al. (2021) Global land use/land cover with Sentinel-2 and deep learning. IGARSS 2021; Impact Observatory, Esri",
                 lop={1: ("nước", "#419bdf", 1, 2), 2: ("cây gỗ", "#397d49", 2, 1), 4: ("thực vật ngập nước", "#7a87c6", 5, 0),
                      5: ("cây trồng", "#e49635", 3, 1), 7: ("xây dựng", "#c4281b", 6, 3), 8: ("đất trống", "#a59b8f", 7, 0),
                      9: ("băng tuyết", "#a8ebff", 0, 0), 10: ("mây", "#616161", 0, 0), 11: ("đồng cỏ, cây bụi", "#e3e2c3", 4, 1)}),
    "WC": dict(id="wc", ten="ESA WorldCover 10 m", ten_en="ESA WorldCover 10 m", ten_ru="ESA WorldCover 10 м",
               asset={2020: "ESA/WorldCover/v100", 2021: "ESA/WorldCover/v200"}, band="Map", nam=(2020, 2021), cach="mot",
               do_phan_giai_m=10, cong=0, giay_phep="CC BY 4.0",
               trich_dan="Zanaga D. et al. (2021, 2022) ESA WorldCover 10 m v100, v200. doi:10.5281/zenodo.5571936, 10.5281/zenodo.7254221",
               lop={10: ("cây gỗ", "#006400", 2, 1), 20: ("cây bụi", "#ffbb22", 4, 1), 30: ("đồng cỏ", "#ffff4c", 4, 1), 40: ("đất canh tác", "#f096ff", 3, 1),
                    50: ("xây dựng", "#fa0000", 6, 3), 60: ("đất trống, thực vật thưa", "#b4b4b4", 7, 0), 70: ("băng tuyết", "#f0f0f0", 0, 0),
                    80: ("mặt nước thường xuyên", "#0064c8", 1, 2), 90: ("đất ngập nước thân thảo", "#0096a0", 5, 0),
                    95: ("rừng ngập mặn", "#00cf75", 5, 0), 100: ("rêu, địa y", "#fae6a0", 0, 0)}),
    "GLC": dict(id="glc", ten="GLC_FCS30D 30 m", ten_en="GLC_FCS30D 30 m", ten_ru="GLC_FCS30D 30 м",
                asset="projects/sat-io/open-datasets/GLC-FCS30D/annual", band=None, nam=(2000, 2022), cach="dai_nam",
                do_phan_giai_m=30, cong=0, giay_phep="CC BY 4.0",
                trich_dan="Zhang X. et al. (2024) GLC_FCS30D: the first global 30 m land-cover dynamics monitoring product. ESSD 16, 1353-1381",
                lop={10: ("cây trồng nhờ mưa", "#ffff64", 3, 1), 11: ("cây trồng thân thảo", "#ffff64", 3, 1), 12: ("cây trồng thân gỗ, vườn cây", "#ffff00", 3, 1),
                     20: ("cây trồng có tưới", "#aaf0f0", 3, 1), 51: ("rừng lá rộng thường xanh thưa", "#4c7300", 2, 1),
                     52: ("rừng lá rộng thường xanh kín", "#006400", 2, 1), 61: ("rừng lá rộng rụng lá thưa", "#aac800", 2, 1),
                     62: ("rừng lá rộng rụng lá kín", "#00a000", 2, 1), 71: ("rừng lá kim thường xanh thưa", "#005000", 2, 1),
                     72: ("rừng lá kim thường xanh kín", "#003c00", 2, 1), 81: ("rừng lá kim rụng lá thưa", "#286400", 2, 1),
                     82: ("rừng lá kim rụng lá kín", "#285000", 2, 1), 91: ("rừng hỗn giao thưa", "#a0b432", 2, 1), 92: ("rừng hỗn giao kín", "#788200", 2, 1),
                     120: ("cây bụi", "#966400", 4, 1), 121: ("cây bụi thường xanh", "#964b00", 4, 1), 122: ("cây bụi rụng lá", "#966400", 4, 1),
                     130: ("đồng cỏ", "#ffb432", 4, 1), 140: ("địa y, rêu", "#ffdcd2", 0, 0), 150: ("thực vật thưa", "#ffebaf", 4, 1),
                     152: ("cây bụi thưa", "#ffd278", 4, 1), 153: ("thân thảo thưa", "#ffebaf", 4, 1), 181: ("đầm lầy cây gỗ", "#00a884", 5, 0),
                     182: ("bãi lầy thân thảo", "#73ffdf", 5, 0), 183: ("bãi ngập", "#9ebbd7", 5, 0), 184: ("đất mặn", "#828282", 7, 0),
                     185: ("rừng ngập mặn", "#f57ab6", 5, 0), 186: ("bãi lầy mặn", "#66cdab", 5, 0), 187: ("bãi triều", "#444f89", 7, 0),
                     190: ("bề mặt không thấm", "#c31400", 6, 3), 200: ("đất trống", "#fff5d7", 7, 0), 201: ("đất trống cố kết", "#dcdcdc", 7, 0),
                     202: ("đất trống bở rời", "#fff5d7", 7, 0), 210: ("mặt nước", "#0046c8", 1, 2), 220: ("băng tuyết vĩnh cửu", "#ffffff", 0, 0)}),
}
# (tên, màu, lớp chung 1..7 hoặc 0, hệ 3 lớp: 1 thực vật, 2 nước, 3 xây dựng, 0 = không quy đổi). Hệ 3 lớp theo s2_globallc:
# thực vật ngập nước, rừng ngập mặn, đất trống, băng, mây không gán vào ba lớp (không làm đẹp số liệu của lớp nào).


def nam_co(k, nam):
    a, b = SP[k]["nam"]
    return [y for y in nam if a <= y <= b]


def muc_manifest(k, nam_xong):
    """Mục layers[] của manifest cho sản phẩm k (mã lớp sau khi cộng `cong`)."""
    p = SP[k]
    return dict(id=p["id"], ten=p["ten"], ten_en=p["ten_en"], ten_ru=p["ten_ru"], kieu="lop", nhom="lulc_tg",
                duong_dan=f"lulc_tg/{p['id']}_{{y}}.tif", nam=sorted(nam_xong),
                ten_lop={str(c + p["cong"]): v[0] for c, v in p["lop"].items()},
                bang_mau={str(c + p["cong"]): v[1] for c, v in p["lop"].items()},
                chung={str(c + p["cong"]): v[2] for c, v in p["lop"].items()},
                nhom3={str(c + p["cong"]): v[3] for c, v in p["lop"].items()},
                do_phan_giai_m=p["do_phan_giai_m"], nguon=p["asset"] if isinstance(p["asset"], str) else ", ".join(p["asset"].values()),
                giay_phep=p["giay_phep"], trich_dan=p["trich_dan"],
                ghi_chu=("mã lớp gốc + 1 (0 = không có dữ liệu)" if p["cong"] else "mã lớp gốc") +
                        ("; nhãn trội mùa khô (tháng 11 năm trước đến tháng 4)" if k == "DW" and DW_MUA_KHO else ""))


def anh_nam(ee, k, y, vung):
    """ee.Image một băng uint8 (mã lớp gốc + cong) của sản phẩm k năm y, hoặc None nếu không có."""
    p = SP[k]
    if not (p["nam"][0] <= y <= p["nam"][1]):
        return None
    if p["cach"] == "mode":
        s = (f"{y - 1}-11-01", f"{y}-05-01") if DW_MUA_KHO else (f"{y}-01-01", f"{y + 1}-01-01")
        col = ee.ImageCollection(p["asset"]).filterDate(*s).filterBounds(vung).select(p["band"])
        img = col.reduce(ee.Reducer.mode())
    elif p["cach"] == "nam":
        img = ee.ImageCollection(p["asset"]).filterDate(f"{y}-01-01", f"{y + 1}-01-01").filterBounds(vung).mosaic().select([0])
    elif p["cach"] == "mot":
        img = ee.ImageCollection(p["asset"][y]).first().select(p["band"])
    else:                                        # GLC_FCS30D: mỗi băng một năm, b1 = 2000
        img = ee.ImageCollection(p["asset"]).filterBounds(vung).mosaic().select(f"b{y - 1999}")
    if p["cong"]:
        img = img.add(p["cong"])
    return img.rename("lop").toUint8()


def xuat(ee, k, y, vung, grid, thu_muc=THU_MUC_DRIVE):
    """Gửi lệnh xuất sang Drive theo đúng lưới UTM của bộ dữ liệu (bước = độ phân giải sản phẩm, gốc trùng lưới)."""
    img = anh_nam(ee, k, y, vung)
    if img is None:
        return None
    r = SP[k]["do_phan_giai_m"]
    ten = f"LULCTG_{SP[k]['id']}_{y}"
    t = ee.batch.Export.image.toDrive(image=img.clip(vung), description=ten, folder=thu_muc, fileNamePrefix=ten, region=vung,
                                      crs=grid["crs"], crsTransform=[r, 0, grid["x0"], 0, -r, grid["y0"]], maxPixels=int(1e13),
                                      fileFormat="GeoTIFF")
    t.start()
    return ten


def luoi_3857(bounds_utm, crs="EPSG:32648", res=10.0):
    """Lưới Web Mercator phủ khung UTM, góc là bội số của res (như s2_hf_lop.grid_3857)."""
    from rasterio.warp import transform_bounds
    from rasterio.transform import from_origin
    x0, y0, x1, y1 = transform_bounds(crs, "EPSG:3857", *bounds_utm, densify_pts=41)
    x0 = math.floor(x0 / res) * res; y1 = math.ceil(y1 / res) * res
    return from_origin(x0, y1, res, res), int(math.ceil((x1 - x0) / res)), int(math.ceil((y1 - y0) / res))


def lop_cog(nguon, out, grid, hinh=None, tmp_dir="/tmp", rows=2048, ma_trong=None):
    """Một hay nhiều mảnh GeoTIFF mã lớp -> COG 3857 trên `grid`, láng giềng gần nhất, 0 ngoài `hinh` (shapely, EPSG:3857).
    ma_trong: mã ghi cho điểm ảnh 0 NẰM TRONG `hinh` (ảnh nguồn dùng 0 cho "lớp không quy đổi" chứ không phải "trống")."""
    import rasterio
    import rasterio.shutil as rsh
    from rasterio.enums import Resampling
    from rasterio.features import geometry_mask
    from rasterio.merge import merge
    from rasterio.vrt import WarpedVRT
    from rasterio.windows import Window, transform as wtf
    tf, w, h = grid
    src = nguon[0]
    if len(nguon) > 1:                          # Earth Engine chia ảnh lớn thành nhiều mảnh
        ds = [rasterio.open(p) for p in nguon]
        a, t = merge(ds, nodata=0); prof = ds[0].profile; [d.close() for d in ds]
        src = f"{tmp_dir}/_ghep_{os.getpid()}.tif"
        prof.update(driver="GTiff", width=a.shape[2], height=a.shape[1], transform=t, nodata=0, tiled=True, blockxsize=256, blockysize=256, compress="deflate")
        with rasterio.open(src, "w", **prof) as o:
            o.write(a)
    tmp = f"{tmp_dir}/_lop_{os.getpid()}.tif"
    prof = dict(driver="GTiff", width=w, height=h, count=1, dtype="uint8", crs="EPSG:3857", transform=tf, nodata=0, tiled=True,
                blockxsize=256, blockysize=256, compress="deflate")
    dem = {}
    with rasterio.open(src) as ds, WarpedVRT(ds, crs="EPSG:3857", transform=tf, width=w, height=h, resampling=Resampling.nearest,
                                            src_nodata=0, nodata=0) as v, rasterio.open(tmp, "w", **prof) as o:
        for r0 in range(0, h, rows):
            hh = min(rows, h - r0); win = Window(0, r0, w, hh)
            a = v.read(1, window=win)
            if hinh is not None:
                ngoai = geometry_mask([hinh], out_shape=a.shape, transform=wtf(win, tf), invert=False)
                if ma_trong:
                    a[(a == 0) & ~ngoai] = ma_trong
                a[ngoai] = 0
            u, c = np.unique(a, return_counts=True)
            for q, n in zip(u.tolist(), c.tolist()):
                dem[q] = dem.get(q, 0) + n
            o.write(a, 1, window=win)
    if os.path.exists(out):
        os.remove(out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    rsh.copy(tmp, out, driver="COG", compress="DEFLATE", blocksize=256, overviews="AUTO", resampling="MODE")
    os.remove(tmp)
    if src != nguon[0]:
        os.remove(src)
    return {int(k): int(v) for k, v in dem.items() if k}


def cho_xong(ee, ten, phut=180, verbose=True):
    """Chờ các lệnh xuất tên `ten` xong; trả {tên: trạng thái}."""
    t0 = time.time(); kq = {}
    while time.time() - t0 < phut * 60:
        kq = {}
        for t in ee.batch.Task.list()[:300]:
            s = t.status(); d = s.get("description", "")
            if d in ten and d not in kq:
                kq[d] = s.get("state")
        con = [d for d in ten if kq.get(d) not in ("COMPLETED", "FAILED", "CANCELLED")]
        if verbose:
            print(f"\r  xong {sum(v == 'COMPLETED' for v in kq.values())}/{len(ten)}, lỗi {sum(v in ('FAILED', 'CANCELLED') for v in kq.values())}",
                  end="", flush=True)
        if not con:
            break
        time.sleep(30)
    if verbose:
        print()
    return kq


# ---- dùng lại ảnh GL_*.tif đã quy về 3 lớp (s2_globallc) ----
GL_SP = {"DW": ("dw", "Dynamic World V1: quy về 3 lớp (mùa khô)", "Dynamic World V1: 3 classes (dry season)", "Dynamic World V1: 3 класса (сухой сезон)", "GOOGLE/DYNAMICWORLD/V1"),
         "ESRI": ("esri", "Esri 10 m Annual LULC: quy về 3 lớp", "Esri 10 m Annual LULC: 3 classes", "Esri 10 m Annual LULC: 3 класса", "projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS"),
         "WC20": ("wc", "ESA WorldCover 10 m: quy về 3 lớp", "ESA WorldCover 10 m: 3 classes", "ESA WorldCover 10 м: 3 класса", "ESA/WorldCover/v100, v200"),
         "WC21": ("wc", "ESA WorldCover 10 m: quy về 3 lớp", "ESA WorldCover 10 m: 3 classes", "ESA WorldCover 10 м: 3 класса", "ESA/WorldCover/v100, v200")}
GL_LOP = {1: ("thực vật", "#2e9d3a", 0, 1), 2: ("nước", "#1f5fbf", 1, 2), 3: ("xây dựng", "#d7191c", 6, 3),
          4: ("ngoài ba lớp (thực vật ngập nước, đất trống, mây)", "#bdbdbd", 0, 0)}


def tim_gl(goc, thu_muc=THU_MUC_GL):
    """{(id lớp, năm): [đường dẫn]} của các ảnh GL_<SP>_<năm>.tif (kể cả khi Earth Engine chia mảnh) trong thư mục đầu tiên có ảnh."""
    for tm in thu_muc:
        ds = sorted(glob.glob(f"{goc}/{tm}/GL_*.tif"))
        if not ds:
            continue
        out = {}
        for p in ds:
            m = re.match(r"^GL_([A-Z0-9]+)_(\d{4})(-\d+-\d+)?\.tif$", os.path.basename(p))
            if m and m.group(1) in GL_SP:
                out.setdefault((GL_SP[m.group(1)][0], int(m.group(2))), []).append(p)
        if out:
            return f"{goc}/{tm}", out
    return None, {}


def muc_manifest_gl(k, nam_xong):
    id_, ten, ten_en, ten_ru, nguon = GL_SP[k]
    return dict(id=id_, ten=ten, ten_en=ten_en, ten_ru=ten_ru, kieu="lop", nhom="lulc_tg", duong_dan=f"lulc_tg/{id_}_{{y}}.tif", nam=sorted(nam_xong),
                ten_lop={str(c): v[0] for c, v in GL_LOP.items()}, bang_mau={str(c): v[1] for c, v in GL_LOP.items()},
                chung={str(c): v[2] for c, v in GL_LOP.items()}, nhom3={str(c): v[3] for c, v in GL_LOP.items()},
                do_phan_giai_m=10, nguon=nguon, giay_phep="CC BY 4.0", trich_dan=SP[{"dw": "DW", "esri": "ESRI", "wc": "WC"}[id_]]["trich_dan"],
                ghi_chu="đã quy về 3 lớp bằng s2_globallc (bảng quy đổi TƯỜNG MINH: thực vật ngập nước, đất trống, băng, mây không gán vào ba lớp; "
                        "trong ranh giới chúng mang mã 4)")


# ---------------- CHẠY (Colab) ----------------
try:
    from google.colab import drive; drive.mount("/content/drive")
except Exception:
    pass
import subprocess
subprocess.run(["pip", "install", "-q", "rasterio", "geopandas", "huggingface_hub"] + (["earthengine-api"] if CHE_DO == "gee" else []), check=False)
import geopandas as gpd
from shapely.ops import unary_union
D = "/content/drive/MyDrive"; HF_DIR = f"{D}/HP_HF_LOP_THAM_CHIEU"; TMP = "/content/tmp_lulc"; os.makedirs(TMP, exist_ok=True)
man = json.load(open(f"{HF_DIR}/manifest.json"))
xa = gpd.read_file(f"{HF_DIR}/{man.get('ranh_gioi_xa', 'ranh_gioi/xa.geojson')}")
bien = unary_union(list(xa.geometry))
grid_utm = man["grid"]
bu = xa.to_crs(grid_utm["crs"]).total_bounds
G3857 = luoi_3857(bu, grid_utm["crs"])
hinh3857 = gpd.GeoSeries([bien], crs="EPSG:4326").to_crs("EPSG:3857").iloc[0]
da_co = {l["id"]: l for l in man["layers"]}
tok = None
if GUI_LEN:
    from huggingface_hub import HfApi
    try:
        from google.colab import userdata; tok = userdata.get("HF_TOKEN")
    except Exception:
        import getpass; tok = getpass.getpass("HF token (quyền ghi): ")
    api = HfApi(token=tok)
    tren_hf = set(api.list_repo_files(HF_REPO, repo_type="dataset"))
else:
    tren_hf = set()
os.makedirs(f"{HF_DIR}/lulc_tg", exist_ok=True)
thong_ke, moi = {}, []
if CHE_DO == "dung_lai":
    TM, GL = tim_gl(D)
    assert GL, ("không thấy ảnh GL_*.tif trong " + ", ".join(THU_MUC_GL) + ": kiểm tra lối tắt HP_3class_v1 trong My Drive, "
                "hoặc đặt CHE_DO = \"gee\"")
    print("dùng lại", sum(len(v) for v in GL.values()), "ảnh trong", TM)
    nam_theo = {}
    for (id_, y), manh in sorted(GL.items()):
        dich = f"{HF_DIR}/lulc_tg/{id_}_{y}.tif"
        if not LAM_LAI and f"lulc_tg/{id_}_{y}.tif" in tren_hf and y in da_co.get(id_, {}).get("nam", []):
            nam_theo.setdefault(id_, set()).add(y); continue
        dem = lop_cog(manh, dich, G3857, hinh3857, tmp_dir=TMP, ma_trong=4)
        thong_ke[f"{id_}_{y}"] = dem; nam_theo.setdefault(id_, set()).add(y); moi.append(f"lulc_tg/{id_}_{y}.tif")
        print(f"  {id_} {y}: {os.path.getsize(dich) / 1e6:.1f} MB, lớp", sorted(dem))
    for k0 in ["DW", "ESRI", "WC20"]:
        id_ = GL_SP[k0][0]
        if id_ in nam_theo:
            m = muc_manifest_gl(k0, nam_theo[id_]); man["layers"] = [l for l in man["layers"] if l["id"] != m["id"]] + [m]
else:
    import ee
    assert GEE_PROJECT, "điền GEE_PROJECT (dự án Earth Engine)"
    ee.Authenticate(); ee.Initialize(project=GEE_PROJECT)
    vung = ee.Geometry.Rectangle(list(xa.total_bounds), "EPSG:4326", False)
    # 1. xuất những năm còn thiếu
    viec = []
    for k in SAN_PHAM:
        for y in nam_co(k, NAM):
            ten = f"LULCTG_{SP[k]['id']}_{y}"
            if not LAM_LAI and (f"lulc_tg/{SP[k]['id']}_{y}.tif" in tren_hf or glob.glob(f"{D}/{THU_MUC_DRIVE}/{ten}*.tif")):
                continue
            if xuat(ee, k, y, vung, grid_utm):
                viec.append(ten); print("  xuất", ten)
    if viec:
        print("chờ Earth Engine (xem thêm ở code.earthengine.google.com/tasks)…")
        tt = cho_xong(ee, viec)
        for d, s in tt.items():
            if s != "COMPLETED":
                print("  KHÔNG xong:", d, s)
        time.sleep(60)                                  # Drive cần thời gian đồng bộ tệp mới
    # 2. COG 3857, cắt theo ranh giới, thống kê
    for k in SAN_PHAM:
        xong = list(da_co.get(SP[k]["id"], {}).get("nam", [])) if not LAM_LAI else []
        for y in nam_co(k, NAM):
            ten = f"LULCTG_{SP[k]['id']}_{y}"; dich = f"{HF_DIR}/lulc_tg/{SP[k]['id']}_{y}.tif"
            manh = sorted(glob.glob(f"{D}/{THU_MUC_DRIVE}/{ten}*.tif"))
            if not manh:
                continue
            dem = lop_cog(manh, dich, G3857, hinh3857, tmp_dir=TMP)
            thong_ke[f"{SP[k]['id']}_{y}"] = dem; xong.append(y); moi.append(f"lulc_tg/{SP[k]['id']}_{y}.tif")
            print(f"  {SP[k]['id']} {y}: {os.path.getsize(dich) / 1e6:.1f} MB, lớp", sorted(dem))
        if xong:
            m = muc_manifest(k, sorted(set(xong)))
            man["layers"] = [l for l in man["layers"] if l["id"] != m["id"]] + [m]
json.dump(thong_ke, open(f"{HF_DIR}/lulc_tg/thong_ke_diem_anh.json", "w"), indent=1)
if not os.path.exists(f"{HF_DIR}/manifest_v6.json"):
    shutil.copyfile(f"{HF_DIR}/manifest.json", f"{HF_DIR}/manifest_v6.json")
man["phien_ban"] = max(int(man.get("phien_ban", 1)), 7); man["cap_nhat"] = time.strftime("%Y-%m-%d %H:%M")
man["chu_giai_chung"] = {str(k): v for k, v in CHUNG.items()}
json.dump(man, open(f"{HF_DIR}/manifest.json", "w"), ensure_ascii=False, indent=1)
rd = open(f"{HF_DIR}/README.md", encoding="utf-8").read().split("\n## Lớp phủ toàn cầu")[0]
if CHE_DO == "dung_lai":
    rd += (f"\n## Lớp phủ toàn cầu ({time.strftime('%Y-%m-%d')})\n"
           "- `lulc_tg/dw_{năm}.tif`, `lulc_tg/esri_{năm}.tif`, `lulc_tg/wc_{năm}.tif`: Dynamic World V1 (nhãn trội mùa khô), Esri 10 m Annual LULC, "
           "ESA WorldCover 2020, 2021 (đều CC BY 4.0), đã quy về 3 lớp bằng s2_globallc: 1 thực vật, 2 nước, 3 xây dựng, 4 ngoài ba lớp "
           "(thực vật ngập nước, đất trống, băng, mây); COG EPSG:3857 10 m, cắt theo ranh giới xã. Chú giải gốc cần xuất lại bằng Earth Engine.\n"
           + "".join(f"- {SP[k]['trich_dan']}.\n" for k in ["DW", "ESRI", "WC"]))
else:
    rd += f"\n## Lớp phủ toàn cầu ({time.strftime('%Y-%m-%d')})\n" + "".join(
        f"- `lulc_tg/{SP[k]['id']}_{{năm}}.tif`: {SP[k]['ten']}, {SP[k]['do_phan_giai_m']} m, {SP[k]['giay_phep']}. {SP[k]['trich_dan']}.\n" for k in SAN_PHAM) + \
        "- Mã lớp gốc (Dynamic World: mã + 1), COG EPSG:3857, cắt theo ranh giới xã; bảng quy đổi về chú giải chung 7 lớp và hệ 3 lớp nằm trong manifest.\n"
open(f"{HF_DIR}/README.md", "w", encoding="utf-8").write(rd)
if GUI_LEN and moi:
    for t in moi + ["lulc_tg/thong_ke_diem_anh.json", "manifest.json", "manifest_v6.json", "README.md"]:
        api.upload_file(path_or_fileobj=f"{HF_DIR}/{t}", path_in_repo=t, repo_id=HF_REPO, repo_type="dataset",
                        commit_message="Geoportal 2.7: lớp phủ toàn cầu")
    print("đã đẩy lên", HF_REPO, len(moi), "ảnh")
