# =============================================================================
# LANDSAT 1987-2026: phần Earth Engine (Python API) của PHƯƠNG ÁN B (dựng lại, đồng nhất)
#   anh_nam(y)       : ảnh tổng hợp mùa khô năm y (1/11 năm trước đến 30/4), 10 băng int16 như ls_landsat.BANG_RA
#   anh_tham_chieu() : ảnh tham chiếu chung (trung vị mùa khô 2015-2020, chỉ OLI) cho bước chuẩn hoá IR-MAD
#   gui_nam(...)     : xuất GeoTIFF về Drive đúng lưới 30 m của geoportal, chia việc cho nhiều tài khoản GEE
#   dem_canh(...)    : đếm cảnh mùa khô từng năm theo cảm biến (chỉ đọc siêu dữ liệu) trước khi chạy lớn
# Chọn lựa (lý do ở LANDSAT_PHUONG_AN.md):
#   - USGS Collection 2 Level-2, Tier 1 (độ chính xác hình học; lưới điểm khống chế C2 căn theo ảnh tham chiếu toàn cầu
#     của Sentinel-2), TM / ETM+ / OLI / OLI-2;
#   - KHÔNG quy đổi ETM+ -> OLI bằng hệ số Roy và cs. (2016): hướng dẫn của Earth Engine ghi rõ cách đó đã lỗi thời,
#     không khuyến nghị và không cần với phản xạ bề mặt Collection 2; phần chênh còn lại giữa các năm xử lý bằng IR-MAD
#     trên ảnh đã xuất (ls_landsat.he_so_chuan_hoa), có cổng chất lượng;
#   - lọc từng cảnh: QA_PIXEL bit 0-4 (trống, mây nới, mây ti, mây, bóng mây), QA_RADSAT (bão hoà), phản xạ ngoài
#     [-0.05, 1], khói mù: SR_ATMOS_OPACITY > 0.3 (TM, ETM+) và SR_QA_AEROSOL mức cao (OLI), bỏ 2 điểm ảnh mép cảnh TM/ETM+;
#   - cảm biến theo năm: Landsat 7 chỉ đến 2016 (quỹ đạo trôi khỏi giờ chụp danh định từ 2017) và từ 2014 chỉ để dự phòng
#     khi OLI thiếu; 2012 (không có TM, chưa có OLI) dùng ETM+ SLC-off;
#   - mùa khô như ảnh S2 của geoportal; thiếu ảnh thì lần lượt: nới tháng 10 đến 5, một ảnh trong mùa, mượn mùa khô năm
#     trước và sau; băng NGUON ghi rõ điểm ảnh lấy theo cách nào.
# =============================================================================
import json
import hashlib
import ee

from ls_landsat import (CRS, NODATA, HE_SO, HE_SO_T, BIT_CB, TEN_BANG, BANG_RA, khung_luoi, CAU_HINH_GEE,
                        ma_cau_hinh_gee, chia_viec, ten_tep_gee)

LS_ID = {"L4": "LANDSAT/LT04/C02/T1_L2", "L5": "LANDSAT/LT05/C02/T1_L2", "L7": "LANDSAT/LE07/C02/T1_L2",
         "L8": "LANDSAT/LC08/C02/T1_L2", "L9": "LANDSAT/LC09/C02/T1_L2"}
SR = {"L4": ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"], "L5": ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"],
      "L7": ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"], "L8": ["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"],
      "L9": ["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"]}
ST = {"L4": "ST_B6", "L5": "ST_B6", "L7": "ST_B6", "L8": "ST_B10", "L9": "ST_B10"}
CAU_HINH_MAC = CAU_HINH_GEE                # cấu hình nằm ở ls_landsat để tài khoản chính (không chạy GEE) cũng đọc được
KH = dict(cfg=None, AOI=None, LOC=None, L=None)


def ma_cau_hinh(cfg):
    return ma_cau_hinh_gee(cfg)


def khoi_tao(ranh_gdf, cfg=None, vien_m=500, sai_so_m=100):
    """ranh_gdf: GeoDataFrame ranh giới Hải Phòng mới. Rút gọn hình ở phía máy (ranh giới có hàng nghìn đỉnh), dựng lưới 30 m."""
    import geopandas as gpd
    from shapely.geometry import mapping
    cfg = json.loads(json.dumps(cfg or CAU_HINH_MAC))
    g = ranh_gdf.to_crs(CRS)
    hp = g.union_all() if hasattr(g, "union_all") else g.unary_union
    vung = hp.buffer(vien_m).simplify(sai_so_m, preserve_topology=True)
    L = khung_luoi(hp.buffer(vien_m).bounds)          # như luoi_tu_ranh: khung tính trên hình CHƯA rút gọn
    g4 = gpd.GeoSeries([vung], crs=CRS).to_crs(4326).iloc[0]
    KH.update(cfg=cfg, L=L, AOI=ee.Geometry(mapping(g4), None, False),
              LOC=ee.Geometry.Rectangle(coords=list(g4.bounds), proj="EPSG:4326", geodesic=False))
    return KH


def khoi_tao_tu_ke_hoach(kh):
    """kh: dict do tài khoản chính ghi (ls_landsat.lap_ke_hoach_gee): lưới, vùng cắt đã rút gọn, cấu hình. Mọi tài khoản
    dùng đúng một lưới và một cấu hình, nên tên tệp (mã cấu hình) và điểm ảnh trùng nhau."""
    cfg = json.loads(json.dumps(kh.get("cfg") or CAU_HINH_GEE))
    KH.update(cfg=cfg, L=kh["L"], AOI=ee.Geometry(kh["vung_geojson"], None, False),
              LOC=ee.Geometry.Rectangle(coords=list(kh["bao"]), proj="EPSG:4326", geodesic=False))
    return KH


def _ngay(y, tm):
    return ee.Date.fromYMD(int(y + tm[1]), int(tm[0]), 1)


def cua_so(y, khoa="mua"):
    a, b = KH["cfg"][khoa]
    return _ngay(y, a), _ngay(y, b).advance(1, "month")


def cam_bien_nam(y, cfg=None):
    """(chính, dự phòng) cho mùa khô năm y (từ 11/(y-1) đến 4/y)."""
    cfg = cfg or KH["cfg"]
    chinh = []
    if y <= 1994: chinh.append("L4")                  # Landsat 4 TM: ít cảnh ở Việt Nam, có thì dùng
    if y <= 2012: chinh.append("L5")                  # TM ngừng chụp 11/2011 -> mùa khô 2012 chỉ còn ít ngày tháng 11
    if 1999 <= y <= 2013: chinh.append("L7")          # 1999-2003 SLC-on; 2004-2013 SLC-off, bù TM và lấp 2012, 2013
    if y >= 2013: chinh.append("L8")
    if y >= 2022: chinh.append("L9")                  # dữ liệu Landsat 9 từ cuối 10/2021
    du = ["L7"] if cfg["l7_du_phong_tu"] <= y <= cfg["l7_den"] else []
    return chinh, [v for v in du if v not in chinh]


def ham_sach(vt, cfg=None):
    """Hàm map cho một cảm biến: phản xạ (6 băng chung), TEMP (°C), CB (bit cảm biến), che mọi điểm ảnh không đạt."""
    cfg = cfg or KH["cfg"]
    lo, hi = cfg["sr_khoang"]
    k_mep = cfg["bo_mep_px"].get(vt, 0)

    def f(im):
        qa = im.select("QA_PIXEL")
        tot = qa.bitwiseAnd(31).eq(0).And(im.select("QA_RADSAT").eq(0))
        sr = im.select(SR[vt], TEN_BANG).multiply(0.0000275).add(-0.2)
        tot = tot.And(sr.reduce(ee.Reducer.min()).gte(lo)).And(sr.reduce(ee.Reducer.max()).lte(hi))
        if vt in ("L4", "L5", "L7") and cfg.get("opacity_max"):
            tot = tot.And(im.select("SR_ATMOS_OPACITY").multiply(0.001).unmask(0).lte(cfg["opacity_max"]))
        if vt in ("L8", "L9") and cfg.get("bo_aerosol_cao"):
            tot = tot.And(im.select("SR_QA_AEROSOL").rightShift(6).bitwiseAnd(3).unmask(0).neq(3))
        if k_mep:
            tot = tot.And(qa.bitwiseAnd(1).eq(0).unmask(0).focalMin(radius=k_mep, kernelType="square", units="pixels"))
        t = im.select(ST[vt]).multiply(0.00341802).add(149.0).subtract(273.15).rename("TEMP")
        cb = ee.Image.constant(BIT_CB[vt]).toInt16().rename("CB")
        return (sr.addBands(t).addBands(cb).updateMask(tot)
                .set("system:time_start", im.get("system:time_start")).set("cam_bien", vt))
    return f


def tap(vts, t0, t1, cfg=None, vung=None):
    cfg = cfg or KH["cfg"]
    vung = vung or KH["LOC"]
    col = None
    if not vts:
        return ee.ImageCollection([])
    for vt in vts:
        c = (ee.ImageCollection(LS_ID[vt]).filterBounds(vung).filterDate(t0, t1)
             .filter(ee.Filter.lt("CLOUD_COVER", cfg["may_canh_max"])).map(ham_sach(vt, cfg)))
        col = c if col is None else col.merge(c)
    return col


def _rong():
    return ee.Image.constant([0] * 7 + [0]).rename(TEN_BANG + ["TEMP", "CB"]).toFloat().updateMask(ee.Image.constant(0))


def tong_hop(col):
    """(trung vị 6 băng + TEMP, số lần quan sát hợp lệ, OR bit cảm biến); tập rỗng cho ảnh rỗng thay vì lỗi."""
    co = col.size().gt(0)
    med = ee.Image(ee.Algorithms.If(co, col.select(TEN_BANG + ["TEMP"]).median(), _rong().select(TEN_BANG + ["TEMP"])))
    n = ee.Image(ee.Algorithms.If(co, col.select("BLUE").count(), ee.Image.constant(0))).unmask(0).rename("NOBS")
    cb = ee.Image(ee.Algorithms.If(co, col.select("CB").reduce(ee.Reducer.bitwiseOr()), ee.Image.constant(0))).unmask(0).rename("CB")
    return med, n.toInt16(), cb.toInt16()


def _tang(m, n, c, dk, ma):
    """Một tầng ứng viên: đủ 10 băng, che chung một mặt nạ (đủ 6 băng phản xạ và đạt điều kiện số lần quan sát)."""
    du6 = m.select(TEN_BANG).mask().reduce(ee.Reducer.min()).gt(0)
    return (ee.Image.cat([m.select(TEN_BANG), m.select("TEMP").unmask(-9999), n.rename("NOBS"),
                          ee.Image.constant(ma).toInt16().rename("NGUON"), c.rename("CAMBIEN")])
            .rename(TEN_BANG + ["TEMP", "NOBS", "NGUON", "CAMBIEN"]).updateMask(dk.And(du6)).toFloat())


def cac_tang(y, cfg=None, vung=None):
    """Các tầng theo thứ tự ưu tiên GIẢM dần (băng NGUON):
    0  mùa khô, cảm biến chính, ≥ n_toi_thieu lần quan sát;
    0  (chỉ khi có cảm biến dự phòng) mùa khô, chính + dự phòng, ≥ n_toi_thieu;
    1  mùa nới tháng 10 đến 5, chính + dự phòng, ≥ n_toi_thieu;
    2  mùa nới, đúng 1 lần quan sát;
    3  mượn mùa khô năm trước và năm sau, ≥ n_toi_thieu."""
    cfg = cfg or KH["cfg"]
    nt = cfg["n_toi_thieu"]
    chinh, du = cam_bien_nam(y, cfg)
    t = []
    m, n, c = tong_hop(tap(chinh, *cua_so(y), cfg, vung)); t.append(_tang(m, n, c, n.gte(nt), 0))
    if du:
        m, n, c = tong_hop(tap(chinh + du, *cua_so(y), cfg, vung)); t.append(_tang(m, n, c, n.gte(nt), 0))
    m, n, c = tong_hop(tap(chinh + du, *cua_so(y, "mua_noi"), cfg, vung))
    t.append(_tang(m, n, c, n.gte(nt), 1)); t.append(_tang(m, n, c, n.gte(1), 2))
    ct, _ = cam_bien_nam(y - 1, cfg); cs, _ = cam_bien_nam(y + 1, cfg)
    m, n, c = tong_hop(tap(ct, *cua_so(y - 1), cfg, vung).merge(tap(cs, *cua_so(y + 1), cfg, vung)))
    t.append(_tang(m, n, c, n.gte(nt), 3))
    return t, chinh, du


def anh_nam(y, cfg=None, vung=None):
    """Ảnh mùa khô năm y: mỗi điểm ảnh lấy từ tầng ưu tiên cao nhất có dữ liệu (cac_tang).
    Trả về ảnh 10 băng int16 (BANG_RA); NOBS là số lần quan sát của chính tầng đã dùng; nodata khi không tầng nào đạt."""
    cfg = cfg or KH["cfg"]
    t, chinh, du = cac_tang(y, cfg, vung)
    g = ee.ImageCollection(list(reversed(t))).mosaic()          # mosaic: ảnh cuối danh sách nằm trên cùng
    sr_i = g.select(TEN_BANG).multiply(HE_SO).round().clamp(-32767, 32767).toInt16()
    tp = g.select("TEMP")
    tp_i = tp.multiply(HE_SO_T).round().clamp(-32767, 32767).toInt16().updateMask(tp.gt(-9000))
    anh = ee.Image.cat([sr_i, tp_i, g.select("NOBS").toInt16(), g.select("NGUON").toInt16(),
                        g.select("CAMBIEN").toInt16()]).rename(BANG_RA)
    return anh.set({"nam": y, "cam_bien_chinh": ",".join(chinh), "cam_bien_du_phong": ",".join(du), "ma_cau_hinh": ma_cau_hinh(cfg)})


def anh_tham_chieu(cfg=None, vung=None):
    """Tham chiếu chung cho IR-MAD: trung vị mọi lần quan sát OLI trong các mùa khô nam_tham_chieu (mặc định 2015-2020)."""
    cfg = cfg or KH["cfg"]
    a, b = cfg["nam_tham_chieu"]
    col = None
    for y in range(a, b + 1):
        c = tap(["L8"], *cua_so(y), cfg, vung)
        col = c if col is None else col.merge(c)
    m, n, cb = tong_hop(col)
    sr = m.select(TEN_BANG).multiply(HE_SO).round().toInt16()
    tp = m.select("TEMP").multiply(HE_SO_T).round().toInt16()
    anh = ee.Image.cat([sr, tp, n, ee.Image.constant(0).toInt16(), cb]).rename(BANG_RA).updateMask(n.gte(cfg["n_toi_thieu"]))
    return anh.set({"tham_chieu": f"{a}-{b}", "ma_cau_hinh": ma_cau_hinh(cfg)})


def ten_tep(y, cfg=None):
    return ten_tep_gee(y, cfg or KH["cfg"])


def _xuat(anh, ten, thu_muc, chay_that=True):
    L = KH["L"]
    t = ee.batch.Export.image.toDrive(
        image=anh.clip(KH["AOI"]).unmask(NODATA, sameFootprint=False).toInt16(), description=ten, folder=thu_muc,
        fileNamePrefix=ten, region=ee.Geometry.Rectangle(coords=L["khung"], proj=CRS, geodesic=False),
        crs=CRS, crsTransform=L["ct"], maxPixels=1e13, fileFormat="GeoTIFF",
        formatOptions={"cloudOptimized": True, "noData": NODATA})
    if chay_that:
        t.start()
    return t


def nhiem_vu_hien_co():
    try:
        ds = ee.data.getTaskList()
    except Exception as e:                                            # noqa: BLE001
        print("không đọc được danh sách nhiệm vụ:", e); return {}
    tot = {"COMPLETED": 4, "SUCCEEDED": 4, "RUNNING": 3, "READY": 2, "PENDING": 2, "FAILED": 1, "CANCELLED": 0}
    kq = {}
    for t in ds:
        d, s = t.get("description"), t.get("state")
        if d and tot.get(s, -1) > tot.get(kq.get(d), -1):
            kq[d] = s
    return kq


def gui_nam(ds_nam, thu_muc, chay_that=True, lam_lai=False, them_tham_chieu=False):
    """Gửi việc xuất cho các năm (bỏ năm đã có việc đang chạy hoặc đã xong, trừ khi lam_lai)."""
    dang = nhiem_vu_hien_co()
    da = []
    if them_tham_chieu:
        a, b = KH["cfg"]["nam_tham_chieu"]
        ten = f"LS_HP_TC_{a}_{b}_{ma_cau_hinh(KH['cfg'])}"
        if lam_lai or dang.get(ten) not in ("READY", "RUNNING", "COMPLETED", "SUCCEEDED", "PENDING"):
            _xuat(anh_tham_chieu(), ten, thu_muc, chay_that); da.append(ten)
            print(f"  {'đã gửi' if chay_that else 'chạy khô'} {ten}")
    for y in ds_nam:
        ten = ten_tep(y)
        if not lam_lai and dang.get(ten) in ("READY", "RUNNING", "COMPLETED", "SUCCEEDED", "PENDING"):
            print(f"  bỏ qua {ten}: đã có nhiệm vụ ({dang[ten]})"); continue
        _xuat(anh_nam(y), ten, thu_muc, chay_that); da.append(ten)
        print(f"  {'đã gửi' if chay_that else 'chạy khô'} {ten} -> {thu_muc}")
    return da


def dem_canh(ds_nam, cfg=None, vung=None, in_ra=True):
    """Số cảnh trong mùa khô từng năm theo cảm biến (mây cảnh < may_canh_max), chỉ đọc siêu dữ liệu."""
    cfg = cfg or KH["cfg"]
    vung = vung or KH["LOC"]
    dong = []
    for y in ds_nam:
        chinh, du = cam_bien_nam(y, cfg)
        t0, t1 = cua_so(y)
        d = {vt: ee.ImageCollection(LS_ID[vt]).filterBounds(vung).filterDate(t0, t1)
             .filter(ee.Filter.lt("CLOUD_COVER", cfg["may_canh_max"])).size() for vt in chinh + du}
        try:
            r = ee.Dictionary(d).getInfo()
        except Exception as e:                                        # noqa: BLE001
            r = {"loi": str(e)[:80]}
        r.update(nam=y, chinh=",".join(chinh), du_phong=",".join(du))
        dong.append(r)
        if in_ra:
            print(f"  {y}: {r}", flush=True)
    return dong


def chay_thu(y, hop, cfg=None):
    """Tính trên một ô nhỏ rồi in trung bình các băng (bắt lỗi đồ thị tính toán trước khi gửi việc lớn)."""
    anh = anh_nam(y, cfg)
    return anh.reduceRegion(ee.Reducer.mean(), hop, crs=CRS, scale=90, maxPixels=1e9, bestEffort=True, tileScale=4).getInfo()
