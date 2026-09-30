# Kiểm thử lõi toán bản 2.8 (xh_core.js) đối chiếu với numpy, scipy, rasterio, Pillow:
# χ², erfc; IR-MAD (so với cài đặt tham chiếu numpy theo Nielsen 2007 và khả năng tìm đúng điểm ảnh thay đổi);
# xu hướng OLS, Theil–Sen, Mann–Kendall; GeoTIFF (hệ toạ độ, lưới, nodata, bảng màu, Float32); QML; dpi JPEG, PNG.
import json, os, subprocess, sys, tempfile, io
import numpy as np
from scipy import stats, linalg

D = os.path.dirname(os.path.abspath(__file__))
TEP = next(p for p in [os.path.join(D, "..", "xh_core.js"), os.path.join(D, "..", "src", "xh_core.js"), os.path.join(D, "xh_core.js")] if os.path.exists(p))
LOI = []
def ok(dk, ten):
    print(("  ok  " if dk else "  LỖI ") + ten)
    if not dk: LOI.append(ten)

def node(code, du=None):
    js = f"const {{XH}} = require({json.dumps(os.path.abspath(TEP))}); const fs = require('fs'); const DU = {json.dumps(du) if du is not None else 'null'};\n" + code
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f: f.write(js); ten = f.name
    r = subprocess.run(["node", "--max-old-space-size=2048", ten], capture_output=True, text=True, timeout=160); os.unlink(ten)
    if r.returncode: print(r.stderr[-2000:]); raise SystemExit(2)
    return json.loads(r.stdout)

# ---------- ① phân phối
xs = [0.1, 0.5, 1, 2.7, 5, 9.3, 15, 30, 55, 120]; ks = [1, 2, 3, 5, 10, 14, 20, 28]
r = node("console.log(JSON.stringify({sf: DU.ks.map(k => DU.xs.map(x => XH.chi2sf(x, k))), inv: DU.ks.map(k => [0.9, 0.95, 0.99, 0.999].map(p => XH.chi2inv(p, k))),"
         " ec: [-2, -0.7, 0, 0.3, 1, 2.5, 4].map(XH.erfc), lg: [0.3, 1, 2.5, 7, 12.5, 40].map(XH.lnGamma)}))", {"xs": xs, "ks": ks})
sf = np.array(r["sf"]); ref = np.array([[stats.chi2.sf(x, k) for x in xs] for k in ks])
ok(np.all(np.abs(sf - ref) <= 1e-9 + 1e-7 * ref), f"chi2sf khớp scipy (sai lệch tương đối lớn nhất {np.max(np.abs(sf - ref) / np.maximum(ref, 1e-300)):.1e})")
inv = np.array(r["inv"]); refi = np.array([[stats.chi2.ppf(p, k) for p in [0.9, 0.95, 0.99, 0.999]] for k in ks])
ok(np.all(np.abs(inv - refi) < 1e-6 * refi), "chi2inv khớp scipy")
from scipy.special import erfc as serfc, gammaln
ok(np.allclose(r["ec"], serfc([-2, -0.7, 0, 0.3, 1, 2.5, 4]), rtol=2e-7, atol=1e-9), "erfc khớp scipy (sai số < 2e-7)")
ok(np.allclose(r["lg"], gammaln([0.3, 1, 2.5, 7, 12.5, 40]), rtol=1e-12, atol=1e-12), "lnGamma khớp scipy")

# ---------- ② Jacobi
rng = np.random.default_rng(7)
Q = rng.normal(size=(9, 9)); S = Q @ Q.T
r = node("const E = XH.jacobi(Float64Array.from(DU.S), 9); console.log(JSON.stringify({val: E.val, vec: Array.from(E.vec)}))", {"S": S.ravel().tolist()})
V = np.array(r["vec"]).reshape(9, 9); lam = np.array(r["val"])
ok(np.allclose(np.sort(lam), linalg.eigvalsh(S), rtol=1e-10) and np.allclose(S @ V, V * lam, atol=1e-8) and np.allclose(V.T @ V, np.eye(9), atol=1e-10),
   "Jacobi: trị riêng khớp scipy, véc tơ riêng trực chuẩn")

# ---------- ③ IR-MAD
def irmad_ref(X, Y, maxit=30, tol=1e-4):         # tham chiếu numpy: bài toán trị riêng tổng quát bằng scipy.linalg.eigh
    n, p = X.shape; w = np.ones(n); rho_cu = None
    for it in range(1, maxit + 1):
        Z = np.hstack([X, Y]); m = np.average(Z, axis=0, weights=w); Zc = Z - m
        C = (Zc * w[:, None]).T @ Zc / w.sum()
        Sxx, Syy, Sxy = C[:p, :p], C[p:, p:], C[:p, p:]
        tr = np.trace(C); Sxx = Sxx + (1e-9 * tr / (2 * p) + 1e-15) * np.eye(p); Syy = Syy + (1e-9 * tr / (2 * p) + 1e-15) * np.eye(p)
        lam, A = linalg.eigh(Sxy @ np.linalg.solve(Syy, Sxy.T), Sxx)
        o = np.argsort(lam)[::-1]; lam = lam[o]; A = A[:, o]; rho = np.sqrt(np.clip(lam, 0, 1 - 1e-12))
        B = np.linalg.solve(Syy, Sxy.T @ A); B = B / np.sqrt(np.sum(B * (Syy @ B), axis=0))
        mad = (X - m[:p]) @ A - (Y - m[p:]) @ B
        chi = np.sum(mad ** 2 / (2 * (1 - rho)), axis=1); w = stats.chi2.sf(chi, p)
        if rho_cu is not None and np.max(np.abs(rho - rho_cu)) < tol: break
        rho_cu = rho
    return rho, chi, it

n, p = 6000, 5
L0 = rng.normal(size=(p, p)); X = rng.normal(size=(n, p)) @ L0.T + 3
Tlin = rng.normal(size=(p, p)) * 0.3 + np.eye(p) * 1.4
Y = X @ Tlin.T + 0.6 + rng.normal(size=(n, p)) * 0.35      # không đổi: biến đổi tuyến tính (khác bức xạ) + nhiễu
doi = np.zeros(n, bool); doi[rng.choice(n, 400, replace=False)] = True
Y[doi] = rng.normal(size=(doi.sum(), p)) @ L0.T * 1.3 + 5  # thay đổi thật
rho_ref, chi_ref, it_ref = irmad_ref(X, Y)
r = node("const X = DU.X.map(a => Float32Array.from(a)), Y = DU.Y.map(a => Float32Array.from(a)), n = X[0].length, mau = Int32Array.from({length: n}, (_, i) => i);"
         "const K = XH.irmad(X, Y, mau, {}); const Z = XH.irmadZ(K, X, Y, n, null);"
         "console.log(JSON.stringify({rho: K.rho, it: K.it, hoiTu: K.hoiTu, z: Array.from(Z)}))",
         {"X": X.T.tolist(), "Y": Y.T.tolist()})
rho = np.array(r["rho"]); chi = np.array(r["z"])
ok(np.allclose(rho, rho_ref, atol=2e-4), f"IR-MAD: hệ số tương quan chính tắc khớp tham chiếu numpy ({np.round(rho, 4).tolist()} / {np.round(rho_ref, 4).tolist()}), {r['it']} vòng, hội tụ {r['hoiTu']}")
ok(np.corrcoef(chi, chi_ref)[0, 1] > 0.999, "IR-MAD: thống kê χ² từng điểm ảnh khớp tham chiếu (tương quan > 0.999)")
def auc(s, y): r = stats.rankdata(s); n1 = y.sum(); return (r[y].sum() - n1 * (n1 + 1) / 2) / (n1 * (len(y) - n1))
cva = np.sqrt(np.mean(((Y - X) / np.std(Y - X, axis=0)) ** 2, axis=1))     # hiệu thô, không chuẩn hoá bức xạ
a_ir, a_cva = auc(chi, doi), auc(cva, doi)
ok(a_ir > 0.995 and a_ir > a_cva, f"IR-MAD xếp hạng thay đổi đúng dù hai năm khác bức xạ tuyến tính: AUC {a_ir:.4f} (hiệu thô {a_cva:.4f})")
mag = np.sqrt(chi / p); v = np.log1p(mag); h, e = np.histogram(v, 256, (0, v.max())); c = (e[:-1] + e[1:]) / 2; best = None
for k in range(1, 256):
    w0, w1 = h[:k].sum(), h[k:].sum()
    if w0 and w1:
        m0, m1 = (h[:k] * c[:k]).sum() / w0, (h[k:] * c[k:]).sum() / w1; s_ = w0 * w1 * (m0 - m1) ** 2
        if best is None or s_ > best[0]: best = (s_, e[k])
du = mag > max(2.5, np.expm1(best[1])); tp = np.sum(du & doi); fp = np.sum(du & ~doi)
ok(tp / doi.sum() > 0.97 and fp / (~doi).sum() < 0.01, f"ngưỡng Otsu trên √(χ²/p) như trang: phát hiện {tp}/{doi.sum()}, báo nhầm {fp}/{(~doi).sum()}")
t99 = stats.chi2.ppf(0.99, p); fp99 = np.sum((chi > t99) & ~doi)
ok(np.mean(chi[~doi]) > p, f"ghi nhận: chỗ không đổi có χ² trung bình {np.mean(chi[~doi]):.1f} > {p} (trọng số lặp làm co phương sai), ngưỡng χ² 99 % báo nhầm {fp99}/{(~doi).sum()}: trang ghi rõ điều này")

# ---------- ④ xu hướng
nam = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
V = rng.normal(0.5, 0.1, size=(len(nam), 200)); V[:, :50] += np.outer(np.arange(9), -0.05 * np.ones(50)); V[3, 60:70] = np.nan
r = node("const V = DU.V.map(a => Float32Array.from(a.map(x => x === null ? NaN : x))); const o = XH.xuHuong(DU.nam, V, 200, 'ols', 2), m = XH.xuHuong(DU.nam, V, 200, 'mk', 3);"
         "console.log(JSON.stringify({s: Array.from(o.slope), r2: Array.from(o.r2), ts: Array.from(m.slope), z: Array.from(m.z), n: Array.from(o.n),"
         " lop: [-0.05, -0.02, -0.01, 0, 0.01, 0.015, 0.03, 0.031, NaN].map(s => XH.lopXuHuong(s, 0.01, 0.03))}))",
         {"nam": nam, "V": [[None if np.isnan(x) else float(x) for x in row] for row in V]})
t = np.array(nam, float); okO = okT = okZ = True
for i in range(200):
    msk = ~np.isnan(V[:, i]); lr = stats.linregress(t[msk], V[msk, i])
    okO &= abs(r["s"][i] - lr.slope) < 1e-5 and abs(r["r2"][i] - lr.rvalue ** 2) < 1e-4
    okT &= abs(r["ts"][i] - np.median([(V[b, i] - V[a, i]) / (t[b] - t[a]) for a in range(9) for b in range(a + 1, 9) if msk[a] and msk[b]])) < 1e-5
    y = V[msk, i]; nn = len(y); S = sum(np.sign(y[b] - y[a]) for a in range(nn) for b in range(a + 1, nn)); vs = nn * (nn - 1) * (2 * nn + 5) / 18
    zr = (S - np.sign(S)) / np.sqrt(vs); okZ &= abs(r["z"][i] - zr) < 1e-4
ok(okO, "OLS: hệ số góc và R² khớp scipy.stats.linregress (cả điểm ảnh thiếu một năm)")
ok(okT, "Theil–Sen: trung vị hệ số góc từng cặp khớp")
ok(okZ, "Mann–Kendall: Z khớp công thức (S − dấu S)/√Var(S)")
ok(r["n"][65] == 8 and r["n"][0] == 9, "đếm số năm có dữ liệu")
ok(r["lop"] == [1, 2, 3, 3, 3, 4, 4, 5, 0], "5 cấp xu hướng: |s| ≤ ngưỡng nhẹ là ổn định, như công cụ GEE")
ok(np.mean(np.array(r["s"][:50])) < -0.045, "điểm ảnh giảm đều 0.05/năm được ước lượng đúng")

# ---------- ⑤ GeoTIFF, QML
import rasterio
tmp = tempfile.mkdtemp()
node("const w = 7, h = 5, a = new Uint8Array(w * h); for (let i = 0; i < a.length; i++) a[i] = [1, 2, 6, 254, 255][i % 5];"
     "fs.writeFileSync(DU.d + '/u8.tif', Buffer.from(XH.tifGhi({w, h, bands: [a], x0: 11873000.5, y1: 2378000.25, res: 10.5, epsg: 3857, nodata: 255, mau: [null, [65, 155, 223], [57, 125, 73], , , , [196, 40, 27]]})));"
     "const f = new Float32Array(w * h).map((_, i) => i === 3 ? NaN : i / 100 - 0.1), g = new Float32Array(w * h).map((_, i) => i / 35);"
     "fs.writeFileSync(DU.d + '/f32.tif', Buffer.from(XH.tifGhi({w, h, bands: [f, g], x0: 600000, y1: 2360000, res: 30, epsg: 32648, nodata: NaN})));"
     "fs.writeFileSync(DU.d + '/l.qml', XH.qmlLop([{ma: 1, mau: '#419bdf', ten: 'nước & \"ao\"'}, {ma: 254, mau: '#bdbdbd', ten: 'không quy đổi được'}]));"
     "fs.writeFileSync(DU.d + '/c.qml', XH.qmlLienTuc([[-0.03, '#d7191c'], [0, '#ffffbf'], [0.03, '#1a9641']]));"
     "console.log('{}')", {"d": tmp})
with rasterio.open(os.path.join(tmp, "u8.tif")) as s:
    a = s.read(1); cm = s.colormap(1)
    ok(s.crs.to_epsg() == 3857 and s.nodata == 255 and s.dtypes[0] == "uint8" and abs(s.transform.a - 10.5) < 1e-9 and abs(s.transform.c - 11873000.5) < 1e-6 and abs(s.transform.f - 2378000.25) < 1e-6,
       "GeoTIFF Uint8: EPSG:3857, lưới, GDAL_NODATA = 255 đọc đúng bằng rasterio")
    ok(a[0, :5].tolist() == [1, 2, 6, 254, 255] and cm[1][:3] == (65, 155, 223) and cm[6][:3] == (196, 40, 27), "giá trị lớp và bảng màu nhúng trong tệp đọc đúng")
with rasterio.open(os.path.join(tmp, "f32.tif")) as s:
    b = s.read()
    ok(s.count == 2 and s.dtypes[0] == "float32" and s.crs.to_epsg() == 32648 and np.isnan(s.nodata) and np.isnan(b[0, 0, 3]) and abs(b[0, 0, 4] + 0.06) < 1e-6 and abs(b[1, 4, 6] - 34 / 35) < 1e-6,
       "GeoTIFF Float32 hai băng: UTM 48N, nodata NaN, giá trị đúng")
import xml.etree.ElementTree as ET
q = ET.parse(os.path.join(tmp, "l.qml")).getroot(); pe = q.findall(".//paletteEntry")
ok(q.find(".//rasterrenderer").get("type") == "paletted" and pe[0].get("label") == 'nước & "ao"' and pe[1].get("value") == "254", "QML bảng lớp: XML hợp lệ, nhãn có ký tự đặc biệt")
q2 = ET.parse(os.path.join(tmp, "c.qml")).getroot()
ok(len(q2.findall(".//colorrampshader/item")) == 3, "QML dải màu liên tục hợp lệ")

# ---------- ⑥ dpi
from PIL import Image
for fmt in ["JPEG", "PNG"]:
    bb = io.BytesIO(); Image.new("RGB", (40, 30), (200, 10, 10)).save(bb, fmt); raw = list(bb.getvalue())
    r = node(f"const u = Uint8Array.from(DU.raw), o = XH.{'jpegDpi' if fmt == 'JPEG' else 'pngDpi'}(u, 300); console.log(JSON.stringify(Array.from(o)))", {"raw": raw})
    im = Image.open(io.BytesIO(bytes(r))); im.load(); dpi = im.info.get("dpi")
    ok(dpi is not None and abs(dpi[0] - 300) < 0.5 and im.size == (40, 30), f"{fmt}: ghi {dpi} dpi, ảnh vẫn mở được")
bb = io.BytesIO(); Image.new("RGB", (8, 8)).save(bb, "JPEG"); raw = bytearray(bb.getvalue())
k = raw.index(b"\xff\xdb"); noJ = bytes(raw[:2]) + bytes(raw[k:])                    # JPEG không có JFIF
r = node("console.log(JSON.stringify(Array.from(XH.jpegDpi(Uint8Array.from(DU.raw), 300))))", {"raw": list(noJ)})
im = Image.open(io.BytesIO(bytes(r))); ok(abs(im.info.get("dpi", (0, 0))[0] - 300) < 0.5, "JPEG không có JFIF: chèn đoạn APP0 có 300 dpi")

# ---------- lưới, thước
r = node("console.log(JSON.stringify({b: [XH.buocDep(1234, 5), XH.buocDep(0.37, 4), XH.buocDep(9, 3)], d: [XH.buocDo(0.25, 4), XH.buocDo(0.04, 4), XH.buocDo(2.2, 4)],"
         " s: [XH.dms(106.675, 'x'), XH.dms(20.8583333, 'y'), XH.dms(-0.5, 'x', 2)], t: [XH.thuocTiLe(2.3, 150), XH.thuocTiLe(37, 200)]}))")
ok(r["b"] == [250, 0.1, 5] and abs(r["d"][0] - 1 / 12) < 1e-12 and abs(r["d"][1] - 1 / 60) < 1e-12 and r["d"][2] == 1, "bước lưới tròn (số, độ phút)")
ok(r["s"] == ["106°40'30\"E", "20°51'30\"N", "0.50°W"], "định dạng độ phút giây")
ok(r["t"][0]["nhan"] == "200 m" and abs(r["t"][0]["px"] - 200 / 2.3) < 1e-9 and r["t"][1]["nhan"] == "5 km", "thước tỉ lệ tròn")

print("TẤT CẢ ĐẠT" if not LOI else f"{len(LOI)} LỖI")
sys.exit(1 if LOI else 0)
