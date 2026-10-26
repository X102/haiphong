# Kiểm thử lõi hồi quy chỉ số bản 3.19 (hq_core.js) đối chiếu với numpy, scipy:
# năm thập phân; hàm beta không đầy đủ, p của hệ số góc (scipy.stats.linregress); hồi quy từ các tổng cộng dồn theo năm có dời gốc
# thời gian (cặp năm, cả khoảng) so với np.polyfit trên từng điểm ảnh; ranh giới 5 cấp theo luận án; lọc theo p; ngưỡng khoảng dài.
import json, os, subprocess, tempfile, datetime
import numpy as np
from scipy import stats, special

D = os.path.dirname(os.path.abspath(__file__))
TEP = next(p for p in [os.path.join(D, "..", "hq_core.js"), os.path.join(D, "..", "src", "hq_core.js"), os.path.join(D, "hq_core.js")] if os.path.exists(p))
LOI = []
def ok(dk, ten):
    print(("  ok  " if dk else "  LỖI ") + ten)
    if not dk: LOI.append(ten)

def node(code, du=None):
    js = f"const {{HQC}} = require({json.dumps(os.path.abspath(TEP))}); const DU = {json.dumps(du) if du is not None else 'null'};\n" + code
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f: f.write(js); ten = f.name
    r = subprocess.run(["node", "--max-old-space-size=2048", ten], capture_output=True, text=True, timeout=160); os.unlink(ten)
    if r.returncode: print(r.stderr[-2000:]); raise SystemExit(2)
    return json.loads(r.stdout)

# ---------- ① năm thập phân
ngay = ["2017-01-01", "2017-07-02", "2020-02-29", "2020-12-31", "2024-06-15"]
r = node("console.log(JSON.stringify(DU.map(HQC.namTP)))", ngay)
def tp(s):
    d = datetime.date.fromisoformat(s); a = datetime.date(d.year, 1, 1); b = datetime.date(d.year + 1, 1, 1)
    return d.year + ((d - a).days + 0.5) / (b - a).days
ok(all(abs(x - tp(s)) < 1e-12 for x, s in zip(r, ngay)), "năm thập phân (giữa ngày, năm nhuận) khớp")

# ---------- ② beta không đầy đủ, p của hệ số góc
ab = [(0.5, 0.5, 0.3), (1, 0.5, 0.9), (3.5, 0.5, 0.2), (10, 0.5, 0.95), (50, 0.5, 0.99), (2, 3, 0.4), (0.5, 7, 0.01)]
r = node("console.log(JSON.stringify(DU.map(q => HQC.betaI(q[0], q[1], q[2]))))", ab)
ref = [special.betainc(a, b, x) for a, b, x in ab]
ok(np.allclose(r, ref, rtol=1e-9, atol=1e-13), f"betaI khớp scipy.special.betainc (sai lệch lớn nhất {np.max(np.abs(np.array(r) - ref)):.1e})")

rng = np.random.default_rng(7)
chuoi = []
for n in [3, 4, 5, 8, 12, 25, 60, 150]:
    for sl in [0.0, 0.03, 0.15, 0.6]:
        t = np.sort(rng.uniform(2019, 2021, n)); y = 0.5 + sl * (t - 2019) + rng.normal(0, 0.08, n)
        chuoi.append((t.tolist(), y.tolist()))
r = node("console.log(JSON.stringify(DU.map(c => HQC.olsDiem(c[0], c[1]))))", chuoi)
sai = []
for (t, y), o in zip(chuoi, r):
    L = stats.linregress(t, y)
    sai.append(max(abs(o["a"] - L.slope) / max(1e-9, abs(L.slope)), abs(o["b"] - L.intercept) / max(1, abs(L.intercept)), abs(o["r2"] - L.rvalue ** 2), abs(o["p"] - L.pvalue)))
ok(max(sai) < 1e-7, f"olsDiem: a, b, R², p khớp scipy.stats.linregress trên {len(chuoi)} chuỗi (n = 3..150; sai lệch lớn nhất {max(sai):.1e})")
r = node("console.log(JSON.stringify([HQC.pDoc(1, 10), HQC.pDoc(0, 10), HQC.pDoc(0.5, 2), HQC.olsDiem([2020.5, 2020.5], [0.1, 0.2]).a]))")
ok(r[0] == 0 and abs(r[1] - 1) < 1e-12 and r[2] is None and r[3] is None, "p: R² = 1 -> 0, R² = 0 -> 1, n = 2 -> không có; mọi quan sát cùng thời điểm -> không có hệ số góc")

# ---------- ③ hồi quy từ tổng năm (cặp năm liền kề, cả khoảng) = polyfit trên từng điểm ảnh
N, nam = 300, list(range(2017, 2023))
obs = {}                                                  # (i, y) -> [(u, v)]
for i in range(N):
    sl = rng.normal(0, 0.15); thieu = rng.random() < 0.08
    for y in nam:
        k = 0 if (thieu and y == 2019) else int(rng.integers(0, 14))
        u = np.sort(rng.uniform(-0.15, 1.0, k))          # có cảnh của mùa vắt qua năm trước (u < 0)
        v = 0.4 + sl * (y + u - 2017) + 0.1 * np.sin(2 * np.pi * u) + rng.normal(0, 0.05, k)
        obs[(i, y)] = list(zip(u.tolist(), v.tolist()))
du = {"N": N, "nam": nam, "obs": [[obs[(i, y)] for y in nam] for i in range(N)]}
code = """
const S = DU.nam.map(() => HQC.tong(DU.N));
DU.obs.forEach((o, i) => o.forEach((ds, k) => ds.forEach(q => HQC.them(S[k], i, q[0], q[1]))));
const cap = [];
for (let k = 0; k + 1 < DU.nam.length; k++) { const R = HQC.ky([{S: S[k], d: 0}, {S: S[k + 1], d: 1}], DU.N, {nMin: 4, dau: true, cuoi: true}); cap.push({a: Array.from(R.a), r2: Array.from(R.r2), n: Array.from(R.n)}); }
const T = HQC.tong(DU.N); S.forEach((s, k) => HQC.congDich(T, s, k));
const R = HQC.ky([{S: T, d: 0}], DU.N, {nMin: 4});
const R2 = HQC.ky(S.map((s, k) => ({S: s, d: k})), DU.N, {nMin: 4, namMin: 2});
console.log(JSON.stringify({cap, ca: {a: Array.from(R.a), r2: Array.from(R.r2), n: Array.from(R.n)}, ca2: {a: Array.from(R2.a), n: Array.from(R2.n)}}));
"""
r = node(code, du)
def ref(i, ys, nMin, dauCuoi):
    t, v = [], []
    for y in ys: t += [y - ys[0] + q[0] for q in obs[(i, y)]]; v += [q[1] for q in obs[(i, y)]]
    if len(t) < nMin or (dauCuoi and (not obs[(i, ys[0])] or not obs[(i, ys[-1])])): return None
    a, b = np.polyfit(t, v, 1); r2 = 1 - np.sum((np.array(v) - a * np.array(t) - b) ** 2) / np.sum((np.array(v) - np.mean(v)) ** 2)
    return a, r2, len(t)
loi_a = loi_r = 0; khop_co = True; dem = 0
for k in range(len(nam) - 1):
    for i in range(N):
        e = ref(i, nam[k:k + 2], 4, True); a = r["cap"][k]["a"][i]
        if e is None: khop_co &= a is None; continue
        dem += 1; loi_a = max(loi_a, abs(a - e[0])); loi_r = max(loi_r, abs(r["cap"][k]["r2"][i] - e[1])); khop_co &= r["cap"][k]["n"][i] == e[2]
ok(khop_co and loi_a < 2e-6 and loi_r < 2e-5, f"cặp năm liền kề: hệ số góc, R², n khớp np.polyfit trên {dem} điểm ảnh × cặp (sai lệch a {loi_a:.1e}, R² {loi_r:.1e}; Float32)")
loi_a = loi_r = 0; khop_co = True
for i in range(N):
    e = ref(i, nam, 4, False); a = r["ca"]["a"][i]
    if e is None: khop_co &= a is None; continue
    loi_a = max(loi_a, abs(a - e[0])); loi_r = max(loi_r, abs(r["ca"]["r2"][i] - e[1])); khop_co &= r["ca"]["n"][i] == e[2]
ok(khop_co and loi_a < 2e-6 and loi_r < 2e-5, f"cả khoảng {nam[0]}-{nam[-1]} từ tổng dời gốc (congDich) khớp np.polyfit (sai lệch a {loi_a:.1e}, R² {loi_r:.1e})")
ok(np.allclose(np.array(r["ca2"]["a"], dtype=float), np.array(r["ca"]["a"], dtype=float), atol=1e-6, equal_nan=True) and r["ca2"]["n"] == r["ca"]["n"],
   "cả khoảng: cộng các năm trong ky() = cộng dồn trước bằng congDich")
thieu = [i for i in range(N) if not obs[(i, 2019)]]
ok(len(thieu) > 0 and all(r["cap"][1]["a"][i] is None and r["cap"][2]["a"][i] is None for i in thieu), f"điểm ảnh không có quan sát năm 2019 ({len(thieu)}): bỏ cặp 2018-2019, 2019-2020")

# ---------- ④ cấp, lọc theo p, ngưỡng khoảng dài
r = node("console.log(JSON.stringify([[-0.25, -0.2, -0.15, -0.1, 0, 0.1, 0.1000001, 0.2, 0.2000001, NaN].map(a => HQC.lop(a, 0.1, 0.2)),"
         " Array.from(HQC.phanCap({a: Float32Array.from([-0.3, -0.3, 0.15, 0.05, NaN]), r2: new Float32Array(5), n: new Uint16Array(5)}, 0.1, 0.2, Float32Array.from([0.01, 0.2, 0.04, 0.001, NaN]), 0.05)),"
         " HQC.nguongDai(0.1, 2), HQC.nguongDai(0.1, 9)]))")
ok(r[0] == [1, 2, 2, 3, 3, 3, 4, 4, 5, 0], "5 cấp đúng biên của luận án: a < −0.2; −0.2 ≤ a < −0.1; |a| ≤ 0.1; 0.1 < a ≤ 0.2; a > 0.2")
ok(r[1] == [1, 3, 4, 3, 0], "lọc ý nghĩa: p ≥ α thì về ổn định, p < α giữ cấp")
# bước nhảy Δ ở giữa khoảng S năm, quan sát đều: hệ số góc = 1.5Δ/S
for S_ in [2, 5, 9]:
    t = np.linspace(0, S_, 20001); y = np.where(t > S_ / 2, 0.3, 0.0); a = np.polyfit(t, y, 1)[0]
    ok(abs(a - 1.5 * 0.3 / S_) < 1e-3, f"bước nhảy Δ = 0.3 giữa khoảng {S_} năm cho hệ số góc {a:.4f} ≈ 1.5Δ/S")
ok(abs(r[2] - 0.1) < 1e-12 and abs(r[3] - 0.1 * 2 / 9) < 1e-12, "ngưỡng khoảng dài = ngưỡng cặp năm × 2/S (cặp năm giữ nguyên)")

print("TẤT CẢ ĐẠT" if not LOI else f"CÓ {len(LOI)} LỖI")
