# =============================================================================
# PCA CHUỖI THỜI GIAN CHO HẢI PHÒNG MỚI, CHẠY TRÊN NHIỀU TÀI KHOẢN GEE
# Phần Python thuần (không cần Earth Engine): kế hoạch, chia việc, khớp PCA chung,
# gom và kiểm tra ảnh xuất.
# =============================================================================
import os, re, glob, json, math, time, hashlib
import numpy as np, pandas as pd

PHIEN_BAN = "v1"
GOC_LUOI = (615610.0, 2352020.0)       # gốc lưới của ảnh tổ hợp S2_HP_{năm} (EPSG:32648)
CRS = "EPSG:32648"

# Năm đã có mẫu: mẫu huấn luyện 2023-2026, điểm kiểm định 2017/2019/2021/2023/2025.
UU_TIEN_CHUNG = [2025, 2023, 2024, 2021, 2019, 2017, 2026, 2022, 2020, 2018]
# Năm có điểm mang nhãn: huấn luyện 2023-2026, kiểm định 2017/2019/2021/2023/2025.
NAM_CO_NHAN = [2017, 2019, 2021, 2023, 2024, 2025, 2026]

CAU_HINH_MAC_DINH = {
    "S2": dict(
        ten="Sentinel-2 L2A (S2_SR_HARMONIZED), mây lọc bằng Cloud Score+",
        nam=list(range(2017, 2027)), nam_tam=[2026], nam_khong_fit=[2017, 2026],
        uu_tien=UU_TIEN_CHUNG,
        ky=[[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]],      # 6 kỳ hai tháng
        dac_trung=["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12", "NDVI", "MNDWI"],
        res=10, k_xet=20, cs_min=0.60, may_canh_max=90, nfill_max_fit=2, so_diem_mau=5000),
    "S1": None,                                                        # xem S1_V2 bên dưới
    "LS": dict(
        ten="Landsat 5/7/8/9 Collection 2 L2 (không quy đổi chéo cảm biến)",
        nam=list(range(1987, 2027)), nam_tam=[2026], nam_khong_fit=[2012, 2026],
        uu_tien=UU_TIEN_CHUNG + [2015, 2013, 2010, 2005, 2000, 1995, 1990, 1987],
        ky=[[1, 3], [4, 6], [7, 9], [10, 12]],                         # 4 quý
        dac_trung=["BLUE", "GREEN", "RED", "NIR", "SWIR1", "SWIR2", "NDVI", "MNDWI"],
        res=30, k_xet=20, may_canh_max=80, quy_doi_oli=False, dung_l7=True, nfill_max_fit=1,
        so_diem_mau=5000),
}

# S1 bản 2 (thay bản 1 sau khi bản 1 tốn khoảng 95 EECU-giờ cho 3 việc lấy mẫu mà vẫn hết giờ):
#  - 6 kỳ hai tháng (bản 1: 12 tháng), trùng kỳ với S2;
#  - MỘT hướng quỹ đạo, chốt ở bước 1b (tệp huong_s1.json), nên số cảnh giảm khoảng một nửa;
#  - 20 m: độ phân giải thật của GRD IW khoảng 20 x 22 m; lưới 20 m cùng gốc, mỗi ô = 2 x 2 ô 10 m;
#  - không nội suy từng điểm ảnh (S1 không bị mây che); kỳ trống cả vùng thì lấy trung vị cả năm;
#  - lọc trung vị 3 x 3 một lần trên chồng ảnh cuối, không lọc từng kỳ;
#  - NOBS là số cảnh trong năm của cả vùng (không đếm từng điểm ảnh để bớt một lượt đọc).
S1_V2 = dict(
    ten="Sentinel-1 GRD IW, VV và VH (dB), gamma0 theo góc tới, một hướng quỹ đạo",
    phien=2, nam=list(range(2015, 2027)), nam_tam=[2015, 2026], nam_khong_fit=[2015, 2026],
    uu_tien=UU_TIEN_CHUNG + [2016, 2015],
    ky=[[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]],
    dac_trung=["VV", "VH", "VVmVH"],
    res=20, k_xet=18, huong=None, gamma0=True, loc_khong_gian=True, noi_suy="ky",
    nfill_max_fit=1, so_diem_mau=3000)
CAU_HINH_MAC_DINH["S1"] = S1_V2
KHOA_MA_CAU_HINH = ("ky", "dac_trung", "res", "huong", "gamma0", "loc_khong_gian", "noi_suy",
                    "phien", "cs_min", "may_canh_max", "quy_doi_oli", "dung_l7")


def ma_cau_hinh(cfg):
    """Mã 6 ký tự của các tham số quyết định giá trị đầu vào PCA: ghi vào mỗi CSV mẫu để
    không bao giờ trộn CSV của hai cấu hình khác nhau."""
    d = {k: cfg.get(k) for k in KHOA_MA_CAU_HINH}
    return hashlib.md5(json.dumps(d, sort_keys=True).encode()).hexdigest()[:6]


def nang_cap_ke_hoach(ke_hoach, huong_s1=None):
    """
    Nâng kế hoạch đã lập (ke_hoach.json) lên cấu hình hiện hành, TRONG BỘ NHỚ, giống hệt nhau
    trên mọi tài khoản (không ghi đè tệp chung):
      - S1 bản 1 -> bản 2 (giữ nguyên năm, ưu tiên, việc và tên việc);
      - thêm lưới 20 m cùng gốc;
      - số điểm mẫu theo cảm biến (so_diem_mau) nếu chưa có;
      - hướng quỹ đạo S1 lấy từ huong_s1.json (None = chưa chốt: mọi việc S1 bị giữ lại).
    """
    cb = ke_hoach["cam_bien"]
    if cb["S1"].get("phien", 1) < 2:
        cu = cb["S1"]
        moi = json.loads(json.dumps(S1_V2))
        for k in ("nam", "nam_tam", "nam_khong_fit", "uu_tien"):
            moi[k] = cu[k]
        cb["S1"] = moi
    for ten, c in cb.items():
        c.setdefault("so_diem_mau", CAU_HINH_MAC_DINH[ten].get("so_diem_mau", ke_hoach["mau"]["so_diem"]))
        c["so_diem_mau"] = min(int(c["so_diem_mau"]), int(ke_hoach["mau"]["so_diem"]))
    if huong_s1 is not None:
        assert huong_s1 in ("ASCENDING", "DESCENDING", "CA_HAI"), huong_s1
        cb["S1"]["huong"] = huong_s1
    l10 = ke_hoach["luoi"]["10"]
    for r in sorted({c["res"] for c in cb.values()}):
        if str(r) not in ke_hoach["luoi"]:
            # khung 10 m đã phủ vùng xuất; nới ra mép lưới r m cùng gốc
            ke_hoach["luoi"][str(r)] = khung_luoi(l10["khung"], r, tuple(ke_hoach["goc_luoi"]))
    for c in cb.values():
        c["ma_cau_hinh"] = ma_cau_hinh(c)
    return ke_hoach


def ten_bang_dau_vao(cfg):
    """Tên các băng đầu vào PCA theo đúng thứ tự: kỳ trước, đặc trưng sau."""
    return [f"{f}_p{i + 1:02d}" for i in range(len(cfg["ky"])) for f in cfg["dac_trung"]]


def khung_luoi(bounds, res, goc=GOC_LUOI):
    """Khung chữ nhật phủ `bounds` (xmin, ymin, xmax, ymax, EPSG:32648) và nằm đúng mép
    điểm ảnh của lưới gốc: điểm ảnh 10 m và 30 m đều trùng khít lưới S2_HP_{năm}."""
    x0, y0 = goc
    xmin, ymin, xmax, ymax = bounds
    c0, c1 = math.floor((xmin - x0) / res), math.ceil((xmax - x0) / res)
    r0, r1 = math.floor((y0 - ymax) / res), math.ceil((y0 - ymin) / res)
    return dict(ct=[float(res), 0.0, x0, 0.0, -float(res), y0],
                khung=[x0 + c0 * res, y0 - r1 * res, x0 + c1 * res, y0 - r0 * res],
                rong=int(c1 - c0), cao=int(r1 - r0), cot0=int(c0), hang0=int(r0))


def lap_ke_hoach(bnd, tai_khoan, cau_hinh=None, dem_diem=15000, hat_giong=20260924,
                 dem_mau_dong=None, vien_m=500, don_gian_m=20):
    """
    bnd: GeoDataFrame ranh giới Hải Phòng mới (114 xã/phường).
    tai_khoan: danh sách nhãn tài khoản tham gia, theo thứ tự, vd ["tk1", "tk2", "tk3"].
    Trả về dict kế hoạch (ghi ra JSON để mọi tài khoản dùng chung).
    """
    from shapely.geometry import mapping
    cau_hinh = json.loads(json.dumps(cau_hinh or CAU_HINH_MAC_DINH))
    utm = bnd.to_crs(CRS)
    hp = utm.union_all() if hasattr(utm, "union_all") else utm.unary_union
    ranh = hp.simplify(don_gian_m, preserve_topology=True)
    vung = hp.buffer(vien_m).simplify(don_gian_m, preserve_topology=True)
    import geopandas as gpd
    g4326 = gpd.GeoSeries([ranh, vung], crs=CRS).to_crs(4326)
    luoi = {str(r): khung_luoi(vung.bounds, r) for r in sorted({c["res"] for c in cau_hinh.values()})}

    viec = []
    for giai_doan in ("MAU", "NHAN", "PCA"):
        viec += _tao_viec(cau_hinh, giai_doan, tai_khoan)
    return dict(
        phien_ban=PHIEN_BAN, tao_luc=time.strftime("%Y-%m-%d %H:%M"), crs=CRS,
        goc_luoi=list(GOC_LUOI), luoi=luoi,
        ranh_gioi_geojson=mapping(g4326.iloc[0]), vung_xuat_geojson=mapping(g4326.iloc[1]),
        dien_tich_km2=round(hp.area / 1e6, 1), vien_m=vien_m,
        tai_khoan=list(tai_khoan), cam_bien=cau_hinh,
        mau=dict(so_diem=int(dem_diem), hat_giong=int(hat_giong)),
        thu_muc_xuat="HP_PCA_TS_XUAT_{tk}", thu_muc_chung="HP_PCA_TS_CHUNG",
        cong_viec=viec)


def _tao_viec(cau_hinh, giai_doan, tai_khoan):
    ds = []
    for cb, c in cau_hinh.items():
        nam_cb = [y for y in c["nam"] if giai_doan != "NHAN" or y in NAM_CO_NHAN]
        thu_tu = [y for y in c["uu_tien"] if y in nam_cb] + \
                 [y for y in sorted(nam_cb, reverse=True) if y not in c["uu_tien"]]
        for k, y in enumerate(thu_tu):
            ds.append(dict(giai_doan=giai_doan, cam_bien=cb, nam=int(y), hang=k))
    # xen kẽ cảm biến theo hạng ưu tiên: S2 2025, S1 2025, LS 2025, S2 2023...
    ds.sort(key=lambda v: (v["hang"], ["S2", "S1", "LS"].index(v["cam_bien"])))
    for i, v in enumerate(ds):
        v["id"] = f"{giai_doan}_{v['cam_bien']}_{v['nam']}"
        v["tai_khoan"] = tai_khoan[i % len(tai_khoan)]
        v["tam"] = v["nam"] in cau_hinh[v["cam_bien"]]["nam_tam"]
    return ds


def bo_sung_viec_nhan(ke_hoach):
    """Kế hoạch lập bằng bản notebook cũ chưa có việc NHAN: thêm vào (không đổi việc cũ)."""
    if any(v["giai_doan"] == "NHAN" for v in ke_hoach["cong_viec"]):
        return False
    for c in ke_hoach["cam_bien"].values():                     # bản cũ dùng k_xuat
        c.setdefault("k_xet", 20)
    ke_hoach["cong_viec"] += _tao_viec(ke_hoach["cam_bien"], "NHAN", ke_hoach["tai_khoan"])
    return True


def viec_cua(ke_hoach, tk, giai_doan, lam_thay=(), da_xong=(), cam_bien=None):
    """
    Việc của tài khoản `tk`, cộng việc nhận thay: mỗi phần tử của `lam_thay` là nhãn tài khoản
    ("tk1": nhận mọi việc của tk1) hoặc mã việc cụ thể ("MAU_S2_2019"). Bỏ việc đã xong.
    `cam_bien`: chỉ lấy các cảm biến này (vd ["S2", "LS"]); None = mọi cảm biến.
    """
    ai = {x for x in lam_thay if x in ke_hoach["tai_khoan"]} | {tk}
    viec_le = {x for x in lam_thay if x not in ke_hoach["tai_khoan"]}
    xong = set(da_xong)
    return [v for v in ke_hoach["cong_viec"]
            if v["giai_doan"] == giai_doan and (v["tai_khoan"] in ai or v["id"] in viec_le)
            and v["id"] not in xong and (cam_bien is None or v["cam_bien"] in cam_bien)]


def ten_san_pham(cb, nam, ma_he_so, tam=False):
    return f"HP_PCA_{cb}_{nam}_{ma_he_so}" + ("_tam" if tam else "")


# ------------------------------------------------------------------ khớp PCA chung
def ma_bam(d):
    s = json.dumps({k: np.round(np.asarray(d[k], dtype=float), 6).tolist()
                    for k in ("mean", "std", "W")}, sort_keys=True)
    return hashlib.md5(s.encode()).hexdigest()[:6]


def doc_mau(duong_dan_csv, ten_dt, cfg=None):
    """Đọc CSV mẫu. Có `cfg` thì kiểm cột cfg_ma: CSV làm bằng cấu hình khác bị từ chối.
    S1 bản 2 bắt buộc có cột này (CSV S1 bản 1 có tên cột trùng một phần nhưng nghĩa khác)."""
    df = pd.read_csv(duong_dan_csv)
    ten = os.path.basename(duong_dan_csv)
    thieu = [c for c in ten_dt + ["NOBS", "NFILL"] if c not in df.columns]
    if thieu:
        raise ValueError(f"{ten} thiếu cột {thieu[:5]}")
    if cfg is not None:
        ma = cfg.get("ma_cau_hinh") or ma_cau_hinh(cfg)
        if "cfg_ma" in df.columns:
            co = set(df["cfg_ma"].astype(str))
            if co != {ma}:
                raise ValueError(f"{ten}: làm bằng cấu hình {sorted(co)}, cấu hình hiện hành {ma}: "
                                 "gửi lại việc này với LAM_LAI = True")
        elif cfg.get("phien", 1) >= 2:
            raise ValueError(f"{ten}: không có cột cfg_ma, tức là làm bằng cấu hình cũ: gửi lại")
    return df


def doc_mau_tot(ds_duong_dan, ten_dt, cfg=None):
    """Nhiều bản cùng tên (vd hai tài khoản cùng làm một việc): lấy bản đầu tiên hợp lệ.
    Trả về (DataFrame hoặc None, danh sách lỗi)."""
    loi = []
    for p in ds_duong_dan:
        try:
            return doc_mau(p, ten_dt, cfg), loi
        except ValueError as e:
            loi.append(str(e))
    return None, loi


def khop_pca(mau_theo_nam, cfg, cb):
    """
    mau_theo_nam: {năm: DataFrame mẫu} của MỘT cảm biến.
    Khớp PCA trên ma trận tương quan, gộp mọi năm khớp (cùng bộ điểm mỗi năm), bỏ điểm
    phải lấp quá `nfill_max_fit` kỳ. Trả về dict hệ số, dùng chung cho mọi năm.
    """
    ten = ten_bang_dau_vao(cfg)
    nam_fit = [y for y in sorted(mau_theo_nam) if y not in cfg["nam_khong_fit"]]
    if not nam_fit:
        raise ValueError(f"{cb}: chưa có năm nào dùng được để khớp")
    # cùng MỘT bộ điểm cho mọi năm: năm lấy 15.000 điểm và năm lấy 5.000 điểm đầu của cùng
    # dãy ngẫu nhiên thì chỉ giữ phần chung, để năm nào cũng nặng như nhau trong PCA gộp
    chung = None
    if all("system:index" in mau_theo_nam[y].columns for y in nam_fit):
        for y in nam_fit:
            s = set(mau_theo_nam[y]["system:index"].astype(str))
            chung = s if chung is None else chung & s
        nho = min(len(mau_theo_nam[y]) for y in nam_fit)
        if len(chung) < 0.5 * nho:
            raise ValueError(f"{cb}: các năm chỉ chung {len(chung)} điểm (năm ít nhất có {nho}): "
                             "bộ điểm không khớp giữa các tài khoản, kiểm tra hinh_gee.json")
    khoi, dem = [], {}
    for y in nam_fit:
        d = mau_theo_nam[y]
        if chung is not None:
            d = d[d["system:index"].astype(str).isin(chung)]
        d = d[(d.NFILL <= cfg["nfill_max_fit"]) & d[ten].notna().all(1)]
        dem[int(y)] = int(len(d))
        khoi.append(d[ten].to_numpy(np.float64))
    X = np.vstack(khoi)
    mu, sd = X.mean(0), X.std(0)
    sd = np.where(sd < 1e-9, 1.0, sd)
    Z = (X - mu) / sd
    C = np.cov(Z, rowvar=False)
    ev, V = np.linalg.eigh(C)
    thu_tu = np.argsort(ev)[::-1]
    ev, V = ev[thu_tu], V[:, thu_tu]
    V = V * np.sign(V[np.abs(V).argmax(0), np.arange(V.shape[1])])     # dấu cố định
    k = V.shape[1]                     # ĐỦ mọi thành phần; chot_k() cắt lại sau khi thử nghiệm
    kq = dict(cam_bien=cb, phien_ban=PHIEN_BAN, bang=ten, mean=mu.tolist(), std=sd.tolist(),
              W=V.T.tolist(), tri_rieng=np.clip(ev, 0, None).tolist(),
              ti_le=(np.clip(ev, 0, None) / np.clip(ev, 0, None).sum()).tolist(), k=k,
              he_so_nhan=100, da_chot=False,
              nam_fit=[int(y) for y in nam_fit], so_diem_fit=dem,
              nfill_max_fit=cfg["nfill_max_fit"], tao_luc=time.strftime("%Y-%m-%d %H:%M"),
              ma_cau_hinh=cfg.get("ma_cau_hinh") or ma_cau_hinh(cfg),
              so_diem_chung=len(chung) if chung is not None else None)
    kq["ma"] = ma_bam(kq)
    return kq


def giu_diem_chung(mau_theo_nam, cfg):
    """Giữ ở MỌI năm đúng phần điểm chung (theo system:index) của các năm dùng để khớp, để mọi
    tiêu chí ở bước 3b cũng tính trên cùng một bộ điểm. Trả về (dict mới, số điểm chung)."""
    nam_fit = [y for y in mau_theo_nam if y not in cfg["nam_khong_fit"]]
    if not nam_fit or not all("system:index" in mau_theo_nam[y].columns for y in mau_theo_nam):
        return mau_theo_nam, None
    chung = None
    for y in nam_fit:
        s = set(mau_theo_nam[y]["system:index"].astype(str))
        chung = s if chung is None else chung & s
    return ({y: d[d["system:index"].astype(str).isin(chung)].reset_index(drop=True)
             for y, d in mau_theo_nam.items()}, len(chung))


def diem_pc(df, he_so):
    ten = he_so["bang"]
    Z = (df[ten].to_numpy(np.float64) - np.asarray(he_so["mean"])) / np.asarray(he_so["std"])
    return Z @ np.asarray(he_so["W"]).T


def troi_theo_nam(mau_theo_nam, he_so):
    """
    Trung bình PC qua từng năm, tính trên các điểm có đủ dữ liệu ở MỌI năm (giao theo
    system:index), để so đúng cùng một bộ điểm. Năm nào lệch hẳn là năm có vấn đề ảnh.
    """
    ten = he_so["bang"]
    du = {y: d[d[ten].notna().all(1)] for y, d in mau_theo_nam.items()}
    chung = None
    if all("system:index" in d.columns for d in du.values()):
        for d in du.values():
            s = set(d["system:index"].astype(str))
            chung = s if chung is None else chung & s
    rows = []
    for y, d in sorted(du.items()):
        dd = d[d["system:index"].astype(str).isin(chung)] if chung else d
        P = diem_pc(dd, he_so)
        r = dict(nam=int(y), so_diem=len(dd), NOBS_tv=float(dd.NOBS.median()) if len(dd) else np.nan,
                 ti_le_co_lap=float((dd.NFILL > 0).mean()) if len(dd) else np.nan,
                 dung_de_khop=int(y) in he_so["nam_fit"])
        for j in range(min(4, P.shape[1])):
            r[f"PC{j + 1}_tb"] = float(P[:, j].mean()) if len(dd) else np.nan
        rows.append(r)
    return pd.DataFrame(rows)


# ------------------------------------------------------------------ tìm thư mục
def tim_thu_muc(ten_mau, goc_drive="/content/drive"):
    """Tìm thư mục theo tên (có thể có ký tự đại diện) trong My Drive và các lối tắt."""
    ung = glob.glob(f"{goc_drive}/MyDrive/{ten_mau}") + \
          glob.glob(f"{goc_drive}/.shortcut-targets-by-id/*/{ten_mau}") + \
          glob.glob(f"{goc_drive}/MyDrive/*/{ten_mau}")
    return sorted({os.path.realpath(p): p for p in ung if os.path.isdir(p)}.values())


# ------------------------------------------------------------------ gom kết quả
RE_MANH = re.compile(r"^(.*?)(-\d{10}-\d{10})?$")


def tim_ket_qua(thu_muc_xuat):
    """Mọi CSV mẫu và mọi mảnh ảnh PCA trong các thư mục xuất của các tài khoản."""
    csv, tif = {}, {}
    for tm in thu_muc_xuat:
        for p in glob.glob(f"{tm}/MAU_*.csv") + glob.glob(f"{tm}/NHAN_*.csv"):
            csv.setdefault(os.path.splitext(os.path.basename(p))[0], []).append(p)
        for p in glob.glob(f"{tm}/HP_PCA_*.tif"):
            goc = RE_MANH.match(os.path.splitext(os.path.basename(p))[0]).group(1)
            tif.setdefault(goc, []).append(p)
    return csv, tif


def _khung_xuat(ke_hoach, cb):
    L = ke_hoach["luoi"][str(ke_hoach["cam_bien"][cb]["res"])]
    return L["ct"][0], L["khung"][0], L["khung"][3], int(L["rong"]), int(L["cao"])


def kiem_manh(manh, ke_hoach, cb):
    """
    Các mảnh GEE có phủ ĐỦ khung xuất không. GEE chia ảnh lớn thành nhiều mảnh
    (tên đuôi -hàng-cột); nếu ghép khi mới có một phần mảnh (việc chép/chuyển chưa xong,
    Drive chưa đồng bộ) thì ảnh ghép bị trống cả một vùng. Mảnh không chồng nhau, nên đủ
    khi tổng số điểm ảnh các mảnh bằng số điểm ảnh của khung và mép ngoài trùng khung.
    Trả về (đủ hay không, số mảnh, % khung đã có).
    """
    import rasterio
    res, x0, y1, W, H = _khung_xuat(ke_hoach, cb)
    tong, trai, tren, phai, duoi = 0, np.inf, -np.inf, -np.inf, np.inf
    for p in manh:
        with rasterio.open(p) as d:
            tong += d.width * d.height
            trai, tren = min(trai, d.bounds.left), max(tren, d.bounds.top)
            phai, duoi = max(phai, d.bounds.right), min(duoi, d.bounds.bottom)
    du = (tong == W * H and abs(trai - x0) < res / 2 and abs(tren - y1) < res / 2
          and round((phai - trai) / res) == W and round((tren - duoi) / res) == H)
    return bool(du), len(manh), round(100.0 * tong / (W * H), 1)


def kiem_tep_ghep(ra, ke_hoach, cb):
    """Tệp đã ghép có đúng kích thước và gốc của khung xuất không."""
    import rasterio
    res, x0, y1, W, H = _khung_xuat(ke_hoach, cb)
    try:
        with rasterio.open(ra) as d:
            return (d.width == W and d.height == H and abs(d.transform.c - x0) < res / 2
                    and abs(d.transform.f - y1) < res / 2)
    except Exception:                                               # noqa: BLE001
        return False


def ghep_va_kiem(manh, ra, ke_hoach, cb, tam_dir="/content/tmp_pca", k_thu_nho=4):
    """
    Ghép các mảnh GEE thành một tệp (chép theo dải 1024 hàng, không nạp cả ảnh vào RAM),
    kiểm lưới so với lưới gốc S2_HP, rồi thống kê trong ranh giới trên ảnh thu nhỏ.
    """
    import shutil, rasterio
    from rasterio.windows import Window
    from rasterio.transform import Affine
    from rasterio.enums import Resampling
    from rasterio.features import geometry_mask
    from shapely.geometry import shape
    import geopandas as gpd
    os.makedirs(tam_dir, exist_ok=True)
    cfg = ke_hoach["cam_bien"][cb]
    L = ke_hoach["luoi"][str(cfg["res"])]
    ds = [rasterio.open(p) for p in sorted(manh)]
    try:
        t0 = ds[0].transform
        res = t0.a
        trai, tren = min(d.bounds.left for d in ds), max(d.bounds.top for d in ds)
        phai, duoi = max(d.bounds.right for d in ds), min(d.bounds.bottom for d in ds)
        W, H = int(round((phai - trai) / res)), int(round((tren - duoi) / res))
        tf = Affine(res, 0, trai, 0, -res, tren)
        lech = ((trai - L["ct"][2]) / L["ct"][0], (tren - L["ct"][5]) / L["ct"][4])
        cung_luoi = (abs(res - L["ct"][0]) < 1e-9 and all(abs(v - round(v)) < 1e-6 for v in lech))
        prof = ds[0].profile.copy()
        prof.update(width=W, height=H, transform=tf, compress="deflate", predictor=2, tiled=True,
                    blockxsize=512, blockysize=512, BIGTIFF="YES")
        mo_ta = ds[0].descriptions
        tam = os.path.join(tam_dir, os.path.basename(ra))
        with rasterio.open(tam, "w", **prof) as o:
            for d in ds:
                c0 = int(round((d.bounds.left - trai) / res))
                r0 = int(round((tren - d.bounds.top) / res))
                for rr in range(0, d.height, 1024):
                    h = min(1024, d.height - rr)
                    o.write(d.read(window=Window(0, rr, d.width, h)),
                            window=Window(c0, r0 + rr, d.width, h))
            for i, m in enumerate(mo_ta, 1):
                if m:
                    o.set_band_description(i, m)
    finally:
        for d in ds:
            d.close()
    shutil.copy(tam, ra)
    # thống kê trong ranh giới, trên ảnh thu nhỏ k lần
    with rasterio.open(tam) as d:
        h, w = max(d.height // k_thu_nho, 1), max(d.width // k_thu_nho, 1)
        a = d.read(out_shape=(d.count, h, w), resampling=Resampling.nearest)
        tfk = d.transform * Affine.scale(d.width / w, d.height / h)
        nd = d.nodata
    os.remove(tam)
    rg = gpd.GeoSeries([shape(ke_hoach["ranh_gioi_geojson"])], crs=4326).to_crs(CRS)
    trong = geometry_mask(rg.geometry, out_shape=a.shape[1:], transform=tfk, invert=True)
    hop_le = trong & ((a[0] != nd) if nd is not None else True)
    ten_b = list(mo_ta)
    i_obs = ten_b.index("NOBS") if "NOBS" in ten_b else a.shape[0] - 2
    i_fill = ten_b.index("NFILL") if "NFILL" in ten_b else a.shape[0] - 1
    co = bool(hop_le.any())
    return dict(so_manh=len(manh), rong=W, cao=H, so_bang=int(a.shape[0]),
                lech_cot=round(lech[0], 3), lech_hang=round(lech[1], 3), cung_luoi=bool(cung_luoi),
                pct_co_du_lieu=round(100 * float(hop_le.sum()) / max(int(trong.sum()), 1), 2),
                NOBS_trung_vi=float(np.median(a[i_obs][hop_le])) if co else np.nan,
                pct_co_lap=round(100 * float((a[i_fill][hop_le] > 0).mean()), 2) if co else np.nan,
                NFILL_tb=round(float(a[i_fill][hop_le].mean()), 3) if co else np.nan)


def anh_xem_nhanh(p, k=8):
    """RGB từ PC1-3 (kéo giãn 2-98 %) để xem nhanh đường nối và vùng trống."""
    import rasterio
    from rasterio.enums import Resampling
    with rasterio.open(p) as d:
        h, w = max(d.height // k, 1), max(d.width // k, 1)
        a = d.read([1, 2, 3], out_shape=(3, h, w), resampling=Resampling.nearest).astype(np.float32)
        nd = d.nodata
    hl = (a[0] != nd) if nd is not None else np.ones(a.shape[1:], bool)
    rgb = np.zeros((h, w, 4), np.float32)
    for i in range(3):
        v = a[i][hl]
        lo, hi = (np.percentile(v, [2, 98]) if v.size else (0, 1))
        rgb[..., i] = np.clip((a[i] - lo) / max(hi - lo, 1e-6), 0, 1)
    rgb[..., 3] = hl
    return rgb


# ======================================================================================
# CHỌN SỐ PC BẰNG THỰC NGHIỆM
# ======================================================================================
def chot_k(he_so_day_du, k, ly_do=""):
    """Cắt hệ số về k thành phần đầu, đánh dấu đã chốt; mã băm đổi theo k."""
    h = json.loads(json.dumps(he_so_day_du))
    h["W"] = h["W"][:int(k)]
    h["k"] = int(k)
    h["da_chot"] = True
    h["ly_do_chon_k"] = ly_do
    h["ma"] = ma_bam(h)
    return h


def _pca_day_du(Z):
    ev, V = np.linalg.eigh(np.cov(Z, rowvar=False))
    o = np.argsort(ev)[::-1]
    ev, V = np.clip(ev[o], 0, None), V[:, o]
    V = V * np.sign(V[np.abs(V).argmax(0), np.arange(V.shape[1])])
    return ev, V                                      # cột j của V là PC j


def _giong_khong_gian(U, V, k):
    """Độ trùng hai không gian con k chiều: trung bình cos² các góc chính (1 là trùng)."""
    M = U[:, :k].T @ V[:, :k]
    return float((M ** 2).sum() / k)


def _dem_lien_tiep(dk):
    """Số phần tử đầu liên tiếp thoả điều kiện."""
    n = 0
    for x in dk:
        if not x:
            break
        n += 1
    return n


def phan_tich_so_pc(mau_theo_nam, cfg, k_xet=None, nguong=0.97, n_song_song=4000,
                    lap_song_song=30, lap_chia_doi=20, seed=0):
    """
    Bảy tiêu chí không cần nhãn, tính trên mẫu ngẫu nhiên các năm dùng để khớp:
      1. phương sai cộng dồn đạt 90/95/97/99 % (trong mẫu);
      2. Kaiser: trị riêng > 1 (PCA trên ma trận tương quan);
      3. gậy gãy (broken stick, Jackson 1993): PC j giữ lại khi tỉ lệ phương sai vượt
         kỳ vọng của một cây gậy bẻ ngẫu nhiên thành d đoạn;
      4. phân tích song song (Horn 1965): trị riêng phải vượt phân vị 95 % của trị riêng
         dữ liệu đã xáo từng cột (mất tương quan);
      5. ổn định khi chia đôi mẫu: PC j của hai nửa có hệ số Tucker >= 0.95;
      6. ổn định giữa các năm: PC j khớp riêng từng năm so với PC j khớp gộp, Tucker >= 0.95
         (trung vị qua các năm);
      7. phương sai giải thích trên NĂM ĐỂ RIÊNG: khớp trên các năm khác, đo trên năm để
         riêng (bỏ-một-năm), đạt `nguong`.
    Trả về (bảng theo k, dict số PC theo từng tiêu chí).
    """
    rng = np.random.default_rng(seed)
    ten = ten_bang_dau_vao(cfg)
    nam_fit = [y for y in sorted(mau_theo_nam) if y not in cfg["nam_khong_fit"]]
    khoi = {y: mau_theo_nam[y].loc[(mau_theo_nam[y].NFILL <= cfg["nfill_max_fit"])
                                   & mau_theo_nam[y][ten].notna().all(1), ten].to_numpy(np.float64)
            for y in nam_fit}
    X = np.vstack(list(khoi.values()))
    mu, sd = X.mean(0), np.where(X.std(0) < 1e-9, 1.0, X.std(0))
    Z = (X - mu) / sd
    d = Z.shape[1]
    K = min(k_xet or cfg.get("k_xet", 20), d)
    ev, V = _pca_day_du(Z)
    tl = ev / ev.sum()
    cd = np.cumsum(tl)

    gay = np.array([sum(1.0 / i for i in range(j, d + 1)) / d for j in range(1, d + 1)])

    idx = rng.choice(len(Z), min(n_song_song, len(Z)), replace=False)
    Zs = Z[idx]
    ev_s = np.sort(np.linalg.eigvalsh(np.corrcoef(Zs, rowvar=False)))[::-1]
    ngau = [np.sort(np.linalg.eigvalsh(np.corrcoef(
        np.column_stack([rng.permutation(Zs[:, j]) for j in range(d)]), rowvar=False)))[::-1]
        for _ in range(lap_song_song)]
    nguong_ss = np.percentile(np.array(ngau), 95, axis=0)

    sim_nua = np.zeros((lap_chia_doi, K)); tuck_nua = np.zeros((lap_chia_doi, K))
    for r in range(lap_chia_doi):
        p = rng.permutation(len(Z)); a, b = p[: len(p) // 2], p[len(p) // 2:]
        _, Va = _pca_day_du(Z[a]); _, Vb = _pca_day_du(Z[b])
        for k in range(1, K + 1):
            sim_nua[r, k - 1] = _giong_khong_gian(Va, Vb, k)
            tuck_nua[r, k - 1] = abs(float(Va[:, k - 1] @ Vb[:, k - 1]))

    sim_nam, tuck_nam = [], []
    for y, Xy in khoi.items():
        _, Vy = _pca_day_du((Xy - mu) / sd)
        sim_nam.append([_giong_khong_gian(V, Vy, k) for k in range(1, K + 1)])
        tuck_nam.append([abs(float(V[:, k - 1] @ Vy[:, k - 1])) for k in range(1, K + 1)])

    ngoai = []
    for y in nam_fit:
        Xo = np.vstack([khoi[t] for t in nam_fit if t != y])
        mo, so = Xo.mean(0), np.where(Xo.std(0) < 1e-9, 1.0, Xo.std(0))
        _, Vo = _pca_day_du((Xo - mo) / so)
        Zy = (khoi[y] - mo) / so
        tong = (Zy ** 2).sum()
        dong = []
        for k in range(1, K + 1):
            R = Zy - (Zy @ Vo[:, :k]) @ Vo[:, :k].T
            dong.append(1 - (R ** 2).sum() / tong)
        ngoai.append(dong)
    ngoai = np.array(ngoai)

    bang = pd.DataFrame(dict(
        k=np.arange(1, K + 1), tri_rieng=ev[:K], ti_le_pct=100 * tl[:K], cong_don_pct=100 * cd[:K],
        gay_gay_pct=100 * gay[:K], tri_rieng_mau_con=ev_s[:K], nguong_song_song=nguong_ss[:K],
        on_dinh_chia_doi=np.median(sim_nua, 0), tucker_chia_doi=np.median(tuck_nua, 0),
        on_dinh_giua_nam=np.median(np.array(sim_nam), 0), tucker_giua_nam=np.median(np.array(tuck_nam), 0),
        giai_thich_nam_de_rieng_pct=100 * ngoai.mean(0), giai_thich_nam_de_rieng_min_pct=100 * ngoai.min(0)))
    tieu_chi = {
        "phương sai 90 % (trong mẫu)": int(np.searchsorted(cd, 0.90) + 1),
        "phương sai 95 % (trong mẫu)": int(np.searchsorted(cd, 0.95) + 1),
        "phương sai 97 % (trong mẫu)": int(np.searchsorted(cd, 0.97) + 1),
        "phương sai 99 % (trong mẫu)": int(np.searchsorted(cd, 0.99) + 1),
        f"phương sai {int(100 * nguong)} % trên năm để riêng": int(np.searchsorted(ngoai.mean(0), nguong) + 1)
        if ngoai.mean(0).max() >= nguong else None,
        "Kaiser (trị riêng > 1)": int((ev > 1).sum()),
        "gậy gãy": _dem_lien_tiep(tl > gay),
        "phân tích song song (Horn)": _dem_lien_tiep(ev_s > nguong_ss),
        # Tucker từng PC (Lorenzo-Seva và ten Berge 2006: >= 0.95 coi là "như nhau"). Không
        # dùng độ trùng không gian con để CHỌN k: với mẫu lớn, cả hướng nhiễu cũng ổn định
        # và độ trùng trung bình luôn cao, nên nó chỉ in ra để tham khảo.
        "ổn định chia đôi (Tucker >= 0.95)": _dem_lien_tiep(np.median(tuck_nua, 0) >= 0.95),
        "ổn định giữa các năm (Tucker >= 0.95)": _dem_lien_tiep(np.median(np.array(tuck_nam), 0) >= 0.95),
    }
    return bang, tieu_chi


def danh_gia_phan_loai(nhan, he_so_day_du, k_xet=20, n_cay=200, lap_bs=500, seed=0, in_ra=True):
    """
    Tiêu chí 8, quyết định nhất: độ chính xác phân loại 3 lớp theo số PC.
    Học trên điểm huấn luyện (nguon == 'train', các năm 2023-2026), đo trên điểm kiểm định
    độc lập (nguon == 'val', 2017-2025, nhãn theo đúng năm). Kèm kiểm định chéo theo ô
    1 km trên tập huấn luyện. Mốc so sánh: dùng TẤT CẢ đặc trưng gốc (không PCA).
    Chọn k theo quy tắc một sai số chuẩn (Breiman và cs. 1984): k nhỏ nhất có độ chính xác
    không kém k tốt nhất quá một sai số chuẩn (bootstrap).
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import GroupKFold
    ten = he_so_day_du["bang"]
    d = nhan[nhan[ten].notna().all(1) & (nhan.cls > 0)].reset_index(drop=True)
    Z = (d[ten].to_numpy(np.float64) - np.asarray(he_so_day_du["mean"])) / np.asarray(he_so_day_du["std"])
    PC = Z @ np.asarray(he_so_day_du["W"]).T
    y = d.cls.to_numpy()
    tr, va = (d.nguon == "train").to_numpy(), (d.nguon == "val").to_numpy()
    nhom = (np.floor(d.lon / 0.01).astype(int) * 100000 + np.floor(d.lat / 0.01).astype(int)).to_numpy()
    rng = np.random.default_rng(seed)
    K = min(k_xet, PC.shape[1])
    rows = []
    for k in list(range(1, K + 1)) + ["tat_ca"]:
        F = Z if k == "tat_ca" else PC[:, :k]
        rf = RandomForestClassifier(n_cay, min_samples_leaf=2, class_weight="balanced_subsample",
                                    n_jobs=-1, random_state=seed)
        r = dict(k=k, so_dac_trung=F.shape[1])
        if tr.sum() and va.sum():
            rf.fit(F[tr], y[tr])
            dung = (rf.predict(F[va]) == y[va]).astype(float)
            bs = dung[rng.integers(0, len(dung), (lap_bs, len(dung)))].mean(1)
            r.update(OA_kiem_dinh=dung.mean(), SE_kiem_dinh=bs.std())
            for nm, g in d[va].groupby("nam"):
                r[f"OA_{nm}"] = dung[(d.nam[va] == nm).to_numpy()].mean()
        if tr.sum() >= 50:
            oa = []
            ntr = nhom[tr]
            for a, b in GroupKFold(5).split(F[tr], y[tr], ntr):
                rf.fit(F[tr][a], y[tr][a])
                oa.append((rf.predict(F[tr][b]) == y[tr][b]).mean())
            r.update(OA_cheo=float(np.mean(oa)), SE_cheo=float(np.std(oa) / np.sqrt(len(oa))))
        rows.append(r)
        if in_ra:
            print(f"    k = {k}: " + ", ".join(f"{c} {v:.4f}" for c, v in r.items()
                                               if c.startswith(("OA_kiem", "OA_cheo")) and v == v))
    bang = pd.DataFrame(rows)
    so = bang[bang.k != "tat_ca"].copy()
    cot, se = ("OA_kiem_dinh", "SE_kiem_dinh") if "OA_kiem_dinh" in so else ("OA_cheo", "SE_cheo")
    tot = so[cot].astype(float).idxmax()
    muc = so.loc[tot, cot] - so.loc[tot, se]
    k1se = int(so[so[cot] >= muc].k.astype(int).min())
    return bang, dict(k_mot_SE=k1se, k_tot_nhat=int(so.loc[tot, "k"]), thuoc_do=cot,
                      OA_tot_nhat=float(so.loc[tot, cot]), SE_tot_nhat=float(so.loc[tot, se]),
                      OA_tat_ca=float(bang[bang.k == "tat_ca"][cot].iloc[0]))


def de_xuat_k(tieu_chi, ket_qua_phan_loai=None):
    """
    Có nhãn: k theo quy tắc một sai số chuẩn trên độ chính xác phân loại (tiêu chí 8).
    Không có nhãn: trung vị của Kaiser, gậy gãy, phân tích song song, lấy số PC ổn định giữa
    các năm làm trần. Ngưỡng % phương sai KHÔNG dùng để chọn: sau khi chuẩn hoá, nhiễu dàn đều ra
    nhiều thành phần nhỏ nên ngưỡng 97 % phụ thuộc mức nhiễu hơn là số tín hiệu thật.
    """
    if ket_qua_phan_loai:
        return ket_qua_phan_loai["k_mot_SE"], (
            f"quy tắc một sai số chuẩn trên {ket_qua_phan_loai['thuoc_do']}: k tốt nhất "
            f"{ket_qua_phan_loai['k_tot_nhat']} ({ket_qua_phan_loai['OA_tot_nhat']:.4f} ± "
            f"{ket_qua_phan_loai['SE_tot_nhat']:.4f})")
    vung = [tieu_chi[t] for t in ("Kaiser (trị riêng > 1)", "gậy gãy", "phân tích song song (Horn)")
            if tieu_chi.get(t)]
    k = int(np.floor(np.median(vung))) if vung else 1
    tran = tieu_chi.get("ổn định giữa các năm (Tucker >= 0.95)") or k    # độ ổn định chỉ là trần
    return max(1, min(k, tran)), (f"trung vị của Kaiser, gậy gãy, song song {vung}, "
                                  f"không vượt số PC ổn định giữa các năm ({tran})")


def lap_diem_nhan(mau_huan_luyen, diem_kiem_dinh, nhan_kiem_dinh, cot_nam):
    """
    mau_huan_luyen: DataFrame samples3_clean (lon, lat, year, cls3, region).
    diem_kiem_dinh: GeoDataFrame E0 (id, geometry); nhan_kiem_dinh: DataFrame (id, cột nhãn).
    cot_nam: {năm: tên cột nhãn}. Nhãn 0 (không rõ) bị bỏ.
    """
    rows = []
    t = mau_huan_luyen
    if "region" in t.columns:
        t = t[t.region == "HP"]
    for i, r in enumerate(t.itertuples()):
        rows.append(dict(pid=f"t{i}", lon=float(r.lon), lat=float(r.lat), nam=int(r.year),
                         cls=int(r.cls3), nguon="train"))
    g = diem_kiem_dinh.to_crs(4326).merge(nhan_kiem_dinh, on="id", suffixes=("", "_nhan"))
    for nam, cot in cot_nam.items():
        for r in g.itertuples():
            c = int(getattr(r, cot))
            if c > 0:
                rows.append(dict(pid=f"v{r.id}_{nam}", lon=float(r.geometry.x), lat=float(r.geometry.y),
                                 nam=int(nam), cls=c, nguon="val"))
    return rows


# ------------------------------------------------------------------ chi phí EECU
HAN_MUC_CONG_DONG = 150.0          # EECU-giờ mỗi tháng mỗi dự án, bậc Community (từ 27/04/2026)
HAN_MUC_DONG_GOP = 1000.0          # bậc Contributor


def dien_tich_xuat_km2(ke_hoach):
    """Diện tích vùng xuất (ranh giới nới 500 m), km²."""
    import geopandas as gpd
    from shapely.geometry import shape
    g = gpd.GeoSeries([shape(ke_hoach["vung_xuat_geojson"])], crs=4326).to_crs(CRS)
    return float(g.area.iloc[0] / 1e6)


def du_bao_chi_phi(ke_hoach, do, so_nhan_theo_nam=None):
    """
    do: {cb: {"diem": (eecu_giay, so_diem), "anh": (eecu_giay, km2)}} đo từ các việc THU_*.
    Ngoại suy tuyến tính: chi phí lấy mẫu tỉ lệ số điểm, chi phí xuất ảnh tỉ lệ diện tích.
    Chỉ là ước lượng cỡ độ lớn (GEE không tính tiền tuyến tính hoàn toàn), đủ để biết có vừa
    hạn mức hay không. Trả về DataFrame, đơn vị EECU-giờ.
    """
    S = dien_tich_xuat_km2(ke_hoach)
    so_nhan_theo_nam = so_nhan_theo_nam or {}
    rows = []
    for cb, cfg in ke_hoach["cam_bien"].items():
        m = do.get(cb, {})
        viec = [v for v in ke_hoach["cong_viec"] if v["cam_bien"] == cb]
        n = {g: sum(v["giai_doan"] == g for v in viec) for g in ("MAU", "NHAN", "PCA")}
        r = dict(cam_bien=cb, so_viec_MAU=n["MAU"], so_viec_NHAN=n["NHAN"], so_viec_PCA=n["PCA"])
        if "diem" in m:
            e, k = m["diem"]
            mot = e / max(k, 1) / 3600.0                                  # EECU-giờ mỗi điểm
            r["MAU_moi_nam_h"] = mot * cfg["so_diem_mau"]
            nh = [so_nhan_theo_nam.get(int(v["nam"]), 0) for v in viec if v["giai_doan"] == "NHAN"]
            r["NHAN_tong_h"] = mot * sum(nh)
            r["MAU_tong_h"] = r["MAU_moi_nam_h"] * n["MAU"]
        if "anh" in m:
            e, a = m["anh"]
            r["PCA_moi_nam_h"] = e / max(a, 1e-9) * S / 3600.0
            r["PCA_tong_h"] = r["PCA_moi_nam_h"] * n["PCA"]
        co = [r[k] for k in ("MAU_tong_h", "NHAN_tong_h", "PCA_tong_h") if k in r]
        r["da_do"] = "+".join(k for k in ("diem", "anh") if k in m) or "chưa đo"
        r["tong_h"] = float(sum(co)) if co else float("nan")        # thiếu phần nào thì tổng còn thiếu
        r["so_thang_cong_dong"] = r["tong_h"] / HAN_MUC_CONG_DONG
        r["so_thang_dong_gop"] = r["tong_h"] / HAN_MUC_DONG_GOP
        rows.append(r)
    return pd.DataFrame(rows)
