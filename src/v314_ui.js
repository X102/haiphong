/* =============================== BẢN 3.14 =============================== */
/* ① Tên theo ngôn ngữ đang chọn: tên tự động của phương án ("Phân loại 2025 · Đông Hải") lưu dạng cấu trúc và dựng lại theo ngôn ngữ
      (cả phương án đã lưu trước đây, nhận ra theo mẫu tên); địa danh không dấu ở giao diện Nga, Anh; ô tên đổi theo kết quả mới (trước
      đây giữ tên của lần chạy trước); tiêu đề, phụ đề khi xuất bản đồ tự đặt theo nội dung và phạm vi, không mang theo chữ cũ.
   ② Phân loại nhiều năm một lần: chọn các năm, chạy lần lượt với cùng thiết lập, bảng tóm tắt các năm, xem từng năm, lưu một phương án
      nhiều năm, xuất bản đồ chọn năm.
   ③ Hậu xử lý kết quả phân loại theo điểm ảnh (bỏ "muối tiêu", hai điểm ảnh liền nhau cùng một mặt nước mà khác lớp):
      đồng nhất trong đối tượng (siêu điểm ảnh SLIC trên 3 thành phần chính của đặc trưng, mỗi đối tượng một lớp theo bỏ phiếu có trọng số
      độ chắc chắn), lọc đa số 3 × 3 hoặc 5 × 5, bỏ mảnh nhỏ hơn một diện tích (gộp vào lớp xung quanh), làm mịn theo năm (bỏ thay đổi
      một năm rồi quay lại) khi chạy từ 3 năm. */

/* ---------------- ① tên theo ngôn ngữ ---------------- */
function diaDanh(t) {                             // địa danh: giữ nguyên ở giao diện Việt, bỏ dấu ở giao diện khác
  t = String(t == null ? "" : t);
  if (LANG === "vi") return t;                    // chỉ chữ Latin có dấu (chữ Nga như й, ё giữ nguyên)
  return t.replace(/[\u00C0-\u024F\u1E00-\u1EFF]/g, ch => ch === "đ" ? "d" : ch === "Đ" ? "D" : ch.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}
var _v27TenPV314 = v27TenPV;
v27TenPV = function (P) { const t = _v27TenPV314.apply(this, arguments); return P && (P.kieu === "xa" || P.kieu === "tinh") ? diaDanh(t) : t; };
function namChu(ys) {                             // [2017, 2018, 2019] -> "2017–2019"; có khoảng trống thì liệt kê
  ys = (ys || []).map(Number).filter(Boolean).sort((a, b) => a - b); if (!ys.length) return ""; if (ys.length === 1) return String(ys[0]);
  return ys.every((y, i) => !i || y === ys[i - 1] + 1) ? `${ys[0]}–${ys[ys.length - 1]}` : ys.join(", ");
}
const PA_TEN_TL = () => [...new Set(["Phân loại"].concat(Object.keys(I18N).map(l => (I18N[l] || {})["Phân loại"])).filter(Boolean))];
function paTuDong(pa) {                           // {nam, pv, kieu, id, so} của tên tự động, hoặc null nếu tên do người dùng đặt
  if (!pa || pa.L0) return null; if (pa.ten_tu_dong) return pa.ten_tu_dong; if (pa.nguon !== "tao") return null;
  const tl = PA_TEN_TL().map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const m = new RegExp(`^(?:${tl}) (\\d{4}(?:[–-]\\d{4})?(?:, \\d{4})*) · (.+?)(?: \\((\\d+)\\))?$`).exec(pa.ten || "");
  if (!m) return null;
  const nhin = Object.keys(I18N).map(l => (I18N[l] || {})["khung nhìn"]).concat(["khung nhìn"]).includes(m[2]);
  return {nam: m[1], pv: m[2], kieu: nhin ? "nhin" : "", so: m[3] ? +m[3] : 0};
}
function paPVTen(a) { return a.kieu === "nhin" ? T("khung nhìn") : a.kieu === "vung" ? T("vùng {id}", {id: a.id}) : a.kieu === "gop" ? a.pv : diaDanh(a.pv); }
function paTenTD(a) { return `${T("Phân loại")} ${a.nam} · ${paPVTen(a)}` + (a.so ? ` (${a.so})` : ""); }
var _paTen314 = paTen;
paTen = function (pa) { const a = paTuDong(pa); return a ? paTenTD(a) : _paTen314.apply(this, arguments); };
paTenRieng = function (ten, id) {                 // tên không trùng tên (đã dựng theo ngôn ngữ) của phương án khác
  const co = t => paDS().some(q => q.id !== id && paTen(q) === t);
  if (!co(ten)) return ten; let k = 2; while (co(`${ten} (${k})`)) k++; return `${ten} (${k})`;
};
function plTenMac() {                             // tên tự động của kết quả đang xem (một năm hoặc nhiều năm)
  const K = PL.kq; if (!K) return "";
  return `${T("Phân loại")} ${PL.loat && PL.loatNam && PL.loatNam.length > 1 ? namChu(PL.loatNam) : K.y} · ${v27TenPV(K.PV)}`;
}
var _paThem314 = paThem;
paThem = function (pa) {                          // phương án tạo với tên tự động: lưu dạng cấu trúc để dựng lại theo ngôn ngữ
  if (pa && pa.nguon === "tao" && !pa.ten_tu_dong && PL.kq && pa.ten === plTenMac().slice(0, 80)) {   // chỉ khi tên đúng là tên tự động
    const P = PL.kq.PV, a = {nam: namChu(pa.nam), pv: P.kieu === "xa" || P.kieu === "tinh" || P.kieu === "gop" ? (P.ten || "") : "", kieu: P.kieu, id: P.id, so: 0};
    const co = so => paDS().some(q => q.id !== pa.id && paTen(q) === paTenTD(Object.assign({}, a, {so})));
    if (co(0)) { a.so = 2; while (co(a.so)) a.so++; }
    pa.ten_tu_dong = a; pa.ten = paTenTD(a);
  }
  return _paThem314.apply(this, arguments);
};
paDoiTen = function (id, ten) {                   // đổi tên: tên người dùng đặt thay cho tên tự động
  const pa = PA.rieng.find(q => q.id === id); if (!pa) return;
  if (ten == null) ten = prompt(T("Tên mới của phương án"), paTen(pa)); if (ten == null || !String(ten).trim()) return;
  ten = String(ten).trim(); if (ten === paTen(pa)) return;
  delete pa.ten_tu_dong; pa.ten = paTenRieng(ten, pa.id); paLuuDB(pa); tkVeDS(); document.dispatchEvent(new CustomEvent("pa27"));
};
pl$("plTen").addEventListener("input", () => { pl$("plTen").dataset.tay = "1"; });
var _paMoTa314 = paMoTa;
paMoTa = function (pa) {                          // phạm vi lưu lúc tạo: địa danh không dấu ở giao diện Nga, Anh
  const ts = pa && pa.tham_so; if (!ts || !ts.pham_vi || LANG === "vi") return _paMoTa314.apply(this, arguments);
  const cu = ts.pham_vi; ts.pham_vi = diaDanh(cu); try { return _paMoTa314.apply(this, arguments); } finally { ts.pham_vi = cu; }
};
var _paCG314 = paCG;
paCG = function (pa, y) {                         // chú giải bản đồ xuất: tên tự động ghi đúng năm đang xuất
  const gr = _paCG314.apply(this, arguments), a = paTuDong(pa);
  if (a) gr.tieuDe = `${T("Phân loại")} ${y > 0 ? y : a.nam} · ${paPVTen(a)}`;
  return gr;
};

/* tiêu đề, phụ đề khi xuất bản đồ: tự đặt theo nội dung và phạm vi (người dùng gõ thì giữ cho đúng nội dung đó) */
function xbTDMac() {
  const nd = XB.nd, by = {}; xbDS().forEach(d => { by[d.k] = d; }); const d = by[nd], s = (XB.lop || []).find(q => q.k === nd), y = s && s.nam > 0 ? s.nam : null;
  let td = "", pd = "";
  if (/^pa:/.test(nd)) { const pa = PA.rieng.find(q => "pa:" + q.id === nd);
    if (pa) { const a = paTuDong(pa);
      if (a) { td = `${T("Phân loại")} ${y || a.nam}`; pd = paPVTen(a); }
      else { td = paTen(pa) + (y && !String(paTen(pa)).includes(String(y)) ? " " + y : ""); pd = pa.tham_so && pa.tham_so.pham_vi ? diaDanh(pa.tham_so.pham_vi) : ""; } } }
  else if (nd === "pl" && PL.kq) { td = T("Phân loại {y}", {y: y || PL.kq.y}); pd = v27TenPV(PL.kq.PV); }
  else if (d && nd !== "man") td = d.ten + (y && !String(d.ten).includes(String(y)) ? " " + y : "");
  if (XB.pham && XB.pham !== "nhin" && XB.pham !== "kq") { const P = xbPhamVi(XB.pham); if (P.ten) pd = /^gop:/.test(XB.pham) ? P.ten : diaDanh(P.ten); }   // khung chọn riêng: phụ đề theo khung
  return {td, pd};
}
xbTenTep = function (o) {                         // tên tệp: tiêu đề (hoặc nội dung), năm, phụ đề (hoặc phạm vi), khổ, dpi, giờ
  const by = {}; xbDS().forEach(d => { by[d.k] = d; });
  const s = (XB.lop || []).find(q => q.k === XB.nd), d = by[XB.nd], pham = o.pham || XB.pham;
  const nd = o.tieuDe || (d ? d.ten : T("bản đồ")), nam = s && s.nam > 0 ? String(s.nam) : "";
  const pv = o.phuDe || (pham === "nhin" || pham === "kq" ? "" : (xbPhamVi(pham).ten || ""));
  const phan = [nd, nam && !String(nd).includes(nam) ? nam : "", pv && !String(nd).includes(pv) ? String(pv).slice(0, 60) : "", `${+o.w}x${+o.h}cm`, `${o.dpi}dpi`, gioTep313()];
  return ("ban_do_" + phan.map(tenTep313).filter(Boolean).join("_")).slice(0, 160);
};
function xbTDCapNhat() {
  if (XB.o.tdTay && XB.o.tdTay.nd === XB.nd) return;
  const m = xbTDMac(); XB.o.tdTay = null; XB.o.tieuDe = m.td; XB.o.phuDe = m.pd;
  if (xb$("xbTieuDe")) { xb$("xbTieuDe").value = m.td; xb$("xbPhuDe").value = m.pd; }
}
["xbTieuDe", "xbPhuDe"].forEach(id => { const e = xb$(id); if (e) e.addEventListener("input", () => { XB.o.tdTay = {nd: XB.nd}; XB.o.tieuDe = xb$("xbTieuDe").value; XB.o.phuDe = xb$("xbPhuDe").value; }); });
var _xbMo314 = xbMo;
xbMo = function () { const r = _xbMo314.apply(this, arguments); xbTDCapNhat(); return r; };
var _xbSauDoi314 = xbSauDoi;
xbSauDoi = function () { const r = _xbSauDoi314.apply(this, arguments); xbTDCapNhat(); return r; };
(function () { const f = xb$("xbND").onchange; xb$("xbND").onchange = function (e) { if (f) f.call(this, e); xbTDCapNhat(); };
  const g = xb$("xbPham").onchange; xb$("xbPham").onchange = function (e) { if (g) g.call(this, e); xbTDCapNhat(); }; })();

/* ---------------- ③ hậu xử lý ---------------- */
var HX = Object.assign({dt: 0, ds: 0, mmu: 0, tg: true}, ls("laymau_hp_pl_hx_v1") || {});
function hxDaSo(cls, w, h, K, r) {                // lọc đa số cửa sổ (2r+1)²: đổi sang lớp chiếm nhiều nhất nếu nhiều hơn lớp hiện tại
  const out = cls.slice(), dem = new Int32Array(K + 1); let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, c = cls[i]; if (!c) continue;
    dem.fill(0);
    for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) dem[cls[yy * w + xx]]++;
    let b = c; for (let k = 1; k <= K; k++) if (dem[k] > dem[b]) b = k;
    if (b !== c) { out[i] = b; n++; } }
  cls.set(out); return n;
}
function hxManhNho(cls, w, h, minPx) {            // mảnh (4 liền) nhỏ hơn minPx điểm ảnh: gộp vào lớp xung quanh nhiều nhất
  let tong = 0;
  for (let vong = 0; vong < 4; vong++) {
    const lab = new Int32Array(w * h), q = new Int32Array(w * h); let doi = 0, id = 0;
    for (let p = 0; p < w * h; p++) {
      if (!cls[p] || lab[p]) continue;
      const c = cls[p]; id++; let qh = 0, qt = 0; q[qt++] = p; lab[p] = id;
      while (qh < qt) { const t = q[qh++], x = t % w, y = (t - x) / w;
        if (x > 0 && !lab[t - 1] && cls[t - 1] === c) { lab[t - 1] = id; q[qt++] = t - 1; }
        if (x < w - 1 && !lab[t + 1] && cls[t + 1] === c) { lab[t + 1] = id; q[qt++] = t + 1; }
        if (y > 0 && !lab[t - w] && cls[t - w] === c) { lab[t - w] = id; q[qt++] = t - w; }
        if (y < h - 1 && !lab[t + w] && cls[t + w] === c) { lab[t + w] = id; q[qt++] = t + w; } }
      if (qt >= minPx) continue;
      const dem = new Map();
      for (let j = 0; j < qt; j++) { const t = q[j], x = t % w, y = (t - x) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const v = cls[yy * w + xx]; if (v && v !== c) dem.set(v, (dem.get(v) || 0) + 1); } }
      if (!dem.size) continue;
      let b = 0, nb = -1; dem.forEach((m, v) => { if (m > nb) { nb = m; b = v; } });
      for (let j = 0; j < qt; j++) cls[q[j]] = b;
      doi += qt;
    }
    tong += doi; if (!doi) break;
  }
  return tong;
}
function hxPCA3(chay, F, nf, mu, a) {             // 3 thành phần chính của đặc trưng đã chuẩn hoá (mẫu tối đa 20 000 điểm ảnh)
  const st = Math.max(1, Math.floor(chay.length / 20000)), C = new Float64Array(nf * nf), z = new Float64Array(nf); let n = 0;
  for (let q = 0; q < chay.length; q += st) { const i = chay[q];
    for (let c = 0; c < nf; c++) z[c] = (F[i * nf + c] - mu[c]) * a[c];
    for (let r = 0; r < nf; r++) for (let c = r; c < nf; c++) C[r * nf + c] += z[r] * z[c]; n++; }
  for (let r = 0; r < nf; r++) for (let c = r; c < nf; c++) { C[r * nf + c] /= Math.max(1, n - 1); C[c * nf + r] = C[r * nf + c]; }
  const E = XH.jacobi(C, nf), th = E.val.map((v, k) => [v, k]).sort((p, q) => q[0] - p[0]).slice(0, Math.min(3, nf));
  return th.map(([v, k]) => ({w: Array.from({length: nf}, (_, r) => E.vec[r * nf + k] / Math.sqrt(Math.max(v, 1e-9)))}));
}
function hxSLIC(P, d, w, h, mask, S, m, vong) {   // siêu điểm ảnh SLIC: P đặc trưng (d chiều / điểm ảnh), mask vùng tính -> {lab, n}
  const N = w * h, lab = new Int32Array(N).fill(-1), kc = new Float32Array(N), C = [];
  for (let y = Math.floor(S / 2); y < h; y += S) for (let x = Math.floor(S / 2); x < w; x += S) {
    let p = -1; for (let r = 0; r <= 2 && p < 0; r++) for (let yy = y - r; yy <= y + r && p < 0; yy++) for (let xx = x - r; xx <= x + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const t = yy * w + xx; if (mask[t]) { p = t; break; } }
    if (p >= 0) { const c = {x: p % w, y: Math.floor(p / w), f: new Float64Array(d)}; for (let k = 0; k < d; k++) c.f[k] = P[p * d + k]; C.push(c); } }
  const m2 = m * m / (S * S);
  for (let it = 0; it < vong; it++) {
    kc.fill(Infinity);
    C.forEach((c, k) => { const x0 = Math.max(0, Math.round(c.x) - S), x1 = Math.min(w - 1, Math.round(c.x) + S), y0 = Math.max(0, Math.round(c.y) - S), y1 = Math.min(h - 1, Math.round(c.y) + S);
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const t = yy * w + xx; if (!mask[t]) continue;
        let dc = 0; for (let j = 0; j < d; j++) { const e = P[t * d + j] - c.f[j]; dc += e * e; }
        const dx = xx - c.x, dy = yy - c.y, D = dc + (dx * dx + dy * dy) * m2; if (D < kc[t]) { kc[t] = D; lab[t] = k; } } });
    const sx = new Float64Array(C.length), sy = new Float64Array(C.length), sf = new Float64Array(C.length * d), sn = new Float64Array(C.length);
    for (let t = 0; t < N; t++) { const k = lab[t]; if (k < 0) continue; sx[k] += t % w; sy[k] += Math.floor(t / w); sn[k]++; for (let j = 0; j < d; j++) sf[k * d + j] += P[t * d + j]; }
    C.forEach((c, k) => { if (!sn[k]) return; c.x = sx[k] / sn[k]; c.y = sy[k] / sn[k]; for (let j = 0; j < d; j++) c.f[j] = sf[k * d + j] / sn[k]; });
  }
  return {lab, n: C.length};
}
function hxBoPhieu(cls, lab, n, K, mg) {          // mỗi đối tượng một lớp: bỏ phiếu, trọng số 1 + độ chênh với lớp thứ hai
  const P = new Float64Array(n * (K + 1)); let doi = 0;
  for (let t = 0; t < cls.length; t++) { const k = lab[t]; if (k < 0 || !cls[t]) continue; P[k * (K + 1) + cls[t]] += 1 + Math.max(0, (mg && mg[t]) || 0); }
  const best = new Uint8Array(n); for (let k = 0; k < n; k++) { let b = 0, v = 0; for (let c = 1; c <= K; c++) if (P[k * (K + 1) + c] > v) { v = P[k * (K + 1) + c]; b = c; } best[k] = b; }
  for (let t = 0; t < cls.length; t++) { const k = lab[t]; if (k < 0 || !cls[t] || !best[k]) continue; if (cls[t] !== best[k]) { cls[t] = best[k]; doi++; } }
  return doi;
}
function hxThoiGian(seq) {                        // seq: mảng các năm (đã xếp), mỗi năm một mảng mã lớp (0 = không có): bỏ đổi lớp một năm
  let n = 0;
  for (let t = 1; t < seq.length - 1; t++) { const A = seq[t - 1], B = seq[t], C = seq[t + 1];
    for (let i = 0; i < B.length; i++) { const a = A[i]; if (a && a === C[i] && B[i] && B[i] !== a) { B[i] = a; n++; } } }
  return n;
}
function hxMinPx(g, ha) { const lat = CORE.m2ll(0, (g.bb[1] + g.bb[3]) / 2)[1], s = g.res * Math.cos(lat * Math.PI / 180); return Math.max(1, Math.round(ha * 1e4 / (s * s))); }
async function plHauXuLy(o) {                     // gọi từ plChay sau phân loại từng điểm ảnh
  const {cls, g, K, mg, chay, F, nf, mu, a, tt} = o, buoc = [], truoc = cls.slice(); let soDT = 0;
  if (!(HX.dt > 0 || HX.ds > 0 || HX.mmu > 0)) return null;
  if (HX.dt > 0) {
    tt.textContent = T("hậu xử lý: chia đối tượng…"); await plTre();
    const W3 = hxPCA3(chay, F, nf, mu, a), d = W3.length, N = g.w * g.h, P = new Float32Array(N * d), mask = new Uint8Array(N);
    for (const i of chay) { mask[i] = 1; for (let k = 0; k < d; k++) { let s = 0; const w = W3[k].w; for (let c = 0; c < nf; c++) s += (F[i * nf + c] - mu[c]) * a[c] * w[c]; P[i * d + k] = s; } }
    const S = Math.max(3, Math.round(HX.dt / g.res)), R = hxSLIC(P, d, g.w, g.h, mask, S, 1.5, 6);
    hxBoPhieu(cls, R.lab, R.n, K, mg); soDT = R.n; buoc.push(["dt", R.n, HX.dt]);
  }
  if (HX.ds > 0) { tt.textContent = T("hậu xử lý: lọc đa số…"); await plTre(); hxDaSo(cls, g.w, g.h, K, HX.ds); buoc.push(["ds", 2 * HX.ds + 1]); }
  if (HX.mmu > 0) { tt.textContent = T("hậu xử lý: bỏ mảnh nhỏ…"); await plTre(); hxManhNho(cls, g.w, g.h, hxMinPx(g, HX.mmu)); buoc.push(["mmu", HX.mmu]); }
  let doi = 0; for (const i of chay) if (cls[i] !== truoc[i]) doi++;
  return {buoc, doi, tong: chay.length, soDT, dt: HX.dt, ds: HX.ds, mmu: HX.mmu};
}
function hxBuocChu(hx) {                         // các bước hậu xử lý, chữ theo ngôn ngữ lúc hiện
  return hx.buoc.map(b => b[0] === "dt" ? T("đồng nhất trong {n} đối tượng ≈ {s} m", {n: b[1], s: b[2]}) : b[0] === "ds" ? T("lọc đa số {k} × {k}", {k: b[1]})
    : T("bỏ mảnh nhỏ hơn {a} ha", {a: b[1]})).join(", ");
}
function plDienTich(K) {                          // tính lại diện tích từng lớp (sau làm mịn theo năm)
  const ra = CORE.rowArea(K.g), dt = new Float64Array(K.K); let tong = 0;
  for (let i = 0; i < K.cls.length; i++) { const c = K.cls[i]; if (!c) continue; const ha = ra[Math.floor(i / K.g.w)] / 1e4; dt[c - 1] += ha; tong += ha; }
  K.dt = dt; K.tong = tong;
}
function plLamMinTG(kq, ys) {                     // làm mịn theo năm trên mã lớp (giá trị v), cùng lưới
  const g0 = kq[ys[0]].g; if (ys.some(y => kq[y].g.w !== g0.w || kq[y].g.h !== g0.h || kq[y].g.x0 !== g0.x0 || kq[y].g.y1 !== g0.y1)) return 0;
  const seq = ys.map(y => { const K = kq[y], v = new Uint16Array(K.cls.length), m = K.lop.map(l => +l.v); for (let i = 0; i < v.length; i++) if (K.cls[i]) v[i] = m[K.cls[i] - 1]; return v; });
  const n = hxThoiGian(seq); let doi = 0;
  ys.forEach((y, t) => { const K = kq[y], vt = new Map(K.lop.map((l, k) => [+l.v, k + 1])); let d = 0;
    for (let i = 0; i < K.cls.length; i++) { if (!K.cls[i]) continue; const c = vt.get(seq[t][i]); if (c && c !== K.cls[i]) { K.cls[i] = c; d++; } }
    if (d) { plDienTich(K); K.doiTG = d; doi += d; } });
  return n ? doi : 0;
}

/* ---------------- ② nhiều năm ---------------- */
PL.loatTok = 0;
async function plChayLoat() {
  pl$("plTen").dataset.tay = "";
  const tok = ++PL.loatTok, nhieu = pl$("plNhieu").checked, ys = nhieu ? [...pl$("plNamDS").querySelectorAll("input:checked")].map(i => +i.value).sort((a, b) => a - b) : [];
  PL.loat = null; PL.loatNam = null; PL.loatLoi = null; pl$("plLoatR").hidden = true; pl$("plLoatTT").textContent = "";
  if (!nhieu || ys.length < 2) { if (nhieu && ys.length === 1) pl$("plNam").value = String(ys[0]); await plChay(); return; }
  const kq = {}, loi = {};
  for (let j = 0; j < ys.length; j++) {
    const y = ys[j]; pl$("plNam").value = String(y); if (typeof plVeBo === "function") plVeBo();
    pl$("plLoatTT").textContent = T("đang chạy năm {y} ({i}/{n})", {y, i: j + 1, n: ys.length});
    PL.kq = null; await plChay(); if (tok !== PL.loatTok) return;
    if (PL.kq && PL.kq.y === y) kq[y] = PL.kq; else loi[y] = pl$("plTT").textContent.replace(/^[^:]*:\s*/, "");
  }
  const ok = ys.filter(y => kq[y]); if (!ok.length) { pl$("plLoatTT").textContent = T("không năm nào chạy được"); return; }
  let tg = 0; if (HX.tg && ok.length >= 3) tg = plLamMinTG(kq, ok);
  PL.loat = kq; PL.loatNam = ok; PL.loatLoi = loi; PL.loatTG = tg;
  const s = pl$("plLoatNam"); s.innerHTML = ok.map(y => `<option>${y}</option>`).join(""); s.value = String(ok[ok.length - 1]); pl$("plLoatR").hidden = false;
  PL.kq = kq[ok[ok.length - 1]]; pl$("plNam").value = String(PL.kq.y);
  pl$("plLoatTT").textContent = T("xong {n} năm", {n: ok.length}) + (Object.keys(loi).length ? "; " + T("không chạy được: {y}", {y: Object.keys(loi).join(", ")}) : "");
  plVeKQ(); pl$("plKQ").hidden = false;
}
function plBangNam() {                            // bảng tóm tắt các năm
  const ys = PL.loatNam || [], lop = new Map();
  ys.forEach(y => PL.loat[y].lop.forEach(l => { if (!lop.has(+l.v)) lop.set(+l.v, l); }));
  const ds = [...lop.values()];
  return `<table class="sm"><tr><th>${T("năm")}</th><th>${T("mẫu")}</th><th>${T("đúng")}</th><th>kappa</th>` + ds.map(l => `<th title="${esc(l.ten)}"><i class="sw" style="background:${l.mau}"></i>${esc(String(l.ten).split(" ")[0])}</th>`).join("") + `</tr>` +
    ys.map(y => { const K = PL.loat[y], kk = kappa27(K.KD.M), dt = new Map(K.lop.map((l, k) => [+l.v, K.dt[k]]));
      return `<tr><td>${y}</td><td>${K.nMau}</td><td>${(100 * kk.oa).toFixed(1)} %</td><td>${kk.kappa.toFixed(2)}</td>` + ds.map(l => `<td>${dt.has(+l.v) ? dt.get(+l.v).toFixed(1) : "–"}</td>`).join("") + `</tr>`; }).join("") +
    `</table><p class="mu sm">${T("Diện tích các lớp tính bằng ha.")}${PL.loatTG ? " " + T("Làm mịn theo năm đã đổi lớp {n} điểm ảnh (bỏ các thay đổi chỉ kéo dài một năm).", {n: PL.loatTG}) : ""}</p>`;
}
var _plVeKQ314 = plVeKQ;
plVeKQ = function () {
  const r = _plVeKQ314.apply(this, arguments), K = PL.kq; if (!K) return r;
  let them = "";
  if (K.hx) them += `<p>${T("Hậu xử lý: {b}; đổi lớp {p} % điểm ảnh.", {b: hxBuocChu(K.hx), p: (100 * K.hx.doi / Math.max(1, K.hx.tong)).toFixed(1)})}</p>`;
  if (PL.loat && PL.loatNam && PL.loatNam.length > 1) them += `<h4>${T("Các năm")}</h4>` + plBangNam();
  if (them) pl$("plTom").insertAdjacentHTML("beforeend", them);
  if (pl$("plTen").dataset.tay !== "1") pl$("plTen").value = plTenMac().slice(0, 80);
  return r;
};
var _plLuu314 = plLuu;
plLuu = function () {                             // nhiều năm: một phương án có bản đồ của từng năm
  if (!(PL.loat && PL.loatNam && PL.loatNam.length > 1)) return _plLuu314.apply(this, arguments);
  const ys = PL.loatNam, lop = {}, du = {}, K0 = PL.kq;
  ys.forEach(y => { const K = PL.loat[y];
    K.lop.forEach((l, k) => { const key = K.keys[k]; if (!lop[l.v]) lop[l.v] = {ten: l.ten, ma: K.he === "3" ? undefined : key, mau: l.mau,
      chung: K.he === "3" ? ({1: 0, 2: 1, 3: 6, 4: 7})[key] : (CHUNG_HE[key] || 0), n3: K.he === "3" ? (key <= 3 ? key : 0) : paHe3(key)}; });
    du[y] = {g0: {x0: K.g.x0, y1: K.g.y1, res: K.g.res, w: K.g.w, h: K.g.h}, data: plGiaTri(K)}; });
  paThem({id: "tao_" + Date.now().toString(36), ten: pl$("plTen").value || T("Phân loại"), nguon: "tao", nam: ys.slice(), lop, du,
    tham_so: {pp: K0.pp, k: K0.kv, he: K0.he, bo: K0.bo, dac_trung: K0.ids, pham_vi: v27TenPV(K0.PV), so_mau: ys.map(y => PL.loat[y].nMau).join(", "),
      nguon_mau: K0.nguon || "trong", so_mau_ngoai: K0.nNgoai || 0, hau_xu_ly: K0.hx ? {dt: K0.hx.dt, ds: K0.hx.ds, mmu: K0.hx.mmu} : null, lam_min_nam: !!PL.loatTG}, tao_luc: new Date().toISOString()});
  msg(T("đã lưu thành phương án nhiều năm ({y}): dùng được ở Thống kê lớp phủ, Phát hiện thay đổi, Xuất bản đồ", {y: namChu(ys)}), "ok", 6000);
};
var _xbDS314 = xbDS;
xbDS = function () {                              // kết quả phân loại nhiều năm: chọn năm khi xuất bản đồ
  const ds = _xbDS314.apply(this, arguments), d = ds.find(q => q.k === "pl");
  if (d && PL.loat && PL.loatNam && PL.loatNam.length > 1) {
    const ys = PL.loatNam; d.nam = ys; d.nam0 = PL.kq.y; d.ten = T("Phân loại {y}", {y: namChu(ys)});
    d.ve = s => { const K = PL.loat[s.nam] || PL.kq; return {anh: plCanvas(K, s.md), bb: K.g.bb}; };
    d.cg = s => xbCGPL(PL.loat[s.nam] || PL.kq, s.md);
  }
  return ds;
};

/* ---------------- giao diện ---------------- */
(function () {
  const o = pl$("plNam").closest(".vg-o");
  o.insertAdjacentHTML("afterend", `<div class="row" id="plNhieuR"><label><input type="checkbox" id="plNhieu"> <span data-t="nhieu"></span></label><span class="mu sm" id="plLoatTT" data-noi18n></span></div>` +
    `<div id="plNamDSW" class="xahop" hidden data-noi18n><div class="xahop-dau"><button type="button" data-het></button><button type="button" data-bo></button></div><div class="xahop-ds" id="plNamDS"></div></div>`);
  pl$("plChay").closest(".row").insertAdjacentHTML("beforebegin", `<details id="plHxW" data-noi18n><summary data-t="hx"></summary><div class="vg-o">` +
    `<span data-t="dt"></span><select id="plHxDT"></select><span data-t="ds"></span><select id="plHxDS"></select>` +
    `<span data-t="mmu"></span><select id="plHxMMU"></select><label style="grid-column:span 2"><input type="checkbox" id="plHxTG"> <span data-t="tg"></span></label></div></details>`);
  pl$("plKQ").insertAdjacentHTML("afterbegin", `<div class="row" id="plLoatR" hidden><span data-t="namkq"></span> <select id="plLoatNam" data-noi18n></select></div>`);
  pl$("plNhieu").onchange = () => { pl$("plNamDSW").hidden = !pl$("plNhieu").checked; ls("laymau_hp_pl_nhieu_v1", pl$("plNhieu").checked); plNamVe(); };
  pl$("plNamDSW").querySelector("[data-het]").onclick = () => { pl$("plNamDS").querySelectorAll("input").forEach(i => { i.checked = true; }); plNamLuu(); };
  pl$("plNamDSW").querySelector("[data-bo]").onclick = () => { pl$("plNamDS").querySelectorAll("input").forEach(i => { i.checked = false; }); plNamLuu(); };
  pl$("plLoatNam").onchange = () => { const y = +pl$("plLoatNam").value; if (!PL.loat || !PL.loat[y]) return; PL.kq = PL.loat[y]; pl$("plNam").value = String(y); plVeKQ(); };
  ["plHxDT", "plHxDS", "plHxMMU"].forEach(id => { pl$(id).onchange = () => { HX[{plHxDT: "dt", plHxDS: "ds", plHxMMU: "mmu"}[id]] = +pl$(id).value; ls("laymau_hp_pl_hx_v1", HX); }; });
  pl$("plHxTG").onchange = () => { HX.tg = pl$("plHxTG").checked; ls("laymau_hp_pl_hx_v1", HX); };
  pl$("plNhieu").checked = !!ls("laymau_hp_pl_nhieu_v1"); pl$("plNamDSW").hidden = !pl$("plNhieu").checked;
  pl$("plChay").onclick = () => { plChayLoat(); };
  pl$("plLuu").onclick = () => plLuu();             // nút gắn hàm cũ: gọi qua tên để dùng bản nhiều năm
  plHxChu();
})();
function plNamLuu() { ls("laymau_hp_pl_nam_v1", [...pl$("plNamDS").querySelectorAll("input:checked")].map(i => +i.value)); }
function plNamVe() {                              // danh sách năm (như ô Năm), nhớ lựa chọn
  const ys = [...pl$("plNam").options].map(o => +o.value), cu = new Set(ls("laymau_hp_pl_nam_v1") || ys);
  pl$("plNamDS").innerHTML = ys.map(y => `<label><input type="checkbox" value="${y}"${cu.has(y) ? " checked" : ""}> ${y}</label>`).join("");
  pl$("plNamDS").querySelectorAll("input").forEach(i => { i.onchange = plNamLuu; });
}
function plHxChu() {                              // chữ của các ô (theo ngôn ngữ)
  const t = (k, s) => { const e = document.querySelector(`#plP [data-t="${k}"]`); if (e) e.textContent = s; };
  t("nhieu", T("nhiều năm")); t("hx", T("Hậu xử lý (bỏ điểm ảnh lẻ, đồng nhất theo đối tượng)")); t("dt", T("đồng nhất trong đối tượng"));
  t("ds", T("lọc đa số")); t("mmu", T("bỏ mảnh nhỏ hơn")); t("tg", T("làm mịn theo năm (khi chạy từ 3 năm)")); t("namkq", T("năm"));
  pl$("plNamDSW").querySelector("[data-het]").textContent = T("chọn hết"); pl$("plNamDSW").querySelector("[data-bo]").textContent = T("bỏ hết");
  const op = (id, ds, v) => { pl$(id).innerHTML = ds.map(([x, s]) => `<option value="${x}">${esc(s)}</option>`).join(""); pl$(id).value = String(v); };
  op("plHxDT", [[0, T("tắt")], [50, "≈ 50 m"], [100, "≈ 100 m"], [200, "≈ 200 m"]], HX.dt);
  op("plHxDS", [[0, T("tắt")], [1, "3 × 3"], [2, "5 × 5"]], HX.ds);
  op("plHxMMU", [[0, T("tắt")], [0.1, "0.1 " + T("ha")], [0.25, "0.25 " + T("ha")], [0.5, "0.5 " + T("ha")], [1, "1 " + T("ha")]], HX.mmu);
  pl$("plHxTG").checked = HX.tg !== false;
  pl$("plHxDT").title = T("chia ảnh thành đối tượng (siêu điểm ảnh) theo đặc trưng, mỗi đối tượng nhận một lớp theo đa số điểm ảnh bên trong: một ao, một đoạn sông không còn bị chia hai lớp");
  pl$("plHxDS").title = T("mỗi điểm ảnh nhận lớp chiếm nhiều nhất trong cửa sổ quanh nó");
  pl$("plHxMMU").title = T("mảnh liền cùng lớp nhỏ hơn diện tích này được gộp vào lớp xung quanh");
  pl$("plNhieu").parentElement.title = T("chạy lần lượt các năm đã chọn với cùng thiết lập; mỗi năm dùng nhãn và ảnh của năm đó");
}
var _plMo314 = plMo;
plMo = async function () { const r = await _plMo314.apply(this, arguments); if (!pl$("plP").hidden) plNamVe(); return r; };
if (typeof setLang === "function") { const _sl314 = setLang; setLang = function () { const r = _sl314.apply(this, arguments); plHxChu();
  if (PL.loat) Object.values(PL.loat).forEach(K => { K.lop = K.keys.map(k => plMoTaLop(k, K.he)); });
  if (!pl$("plP").hidden) { plNamVe(); if (PL.kq) plVeKQ(); } if (tk$("tkPA")) tkVeDS(); return r; }; }
