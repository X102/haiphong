/* =============================== BẢN 3.16 =============================== */
/* Xuất bản đồ nhiều năm (bản đồ có nhiều năm: phương án nhiều năm, kết quả phân loại nhiều năm, lớp dữ liệu theo năm):
   ① từng năm một tệp: cùng khổ, cùng khung, cùng lớp; tiêu đề, tên tệp đúng năm; gói ZIP kèm bảng diện tích các năm (CSV);
   ② ghép các năm trong một ảnh: các ô bản đồ cùng phạm vi, cùng tỉ lệ, nhãn năm trên mỗi ô, lưới toạ độ ghi ở cột trái và hàng dưới,
      mũi tên bắc và thước tỉ lệ một lần, một chú giải chung (hợp các lớp của mọi năm), bảng diện tích từng lớp theo năm (ha, km², %)
      kèm cột thay đổi giữa năm đầu và năm cuối. Ảnh nền, nhãn địa danh tải một lần cho mọi ô. */
var XBL = Object.assign({che: "mot", cot: 0, bang: "ha", theo: true, nam: {}}, ls("laymau_hp_xb_loat_v1") || {});
function xbLoatLuu() { ls("laymau_hp_xb_loat_v1", XBL); }
function xbLoatND() {                             // nội dung đang chọn có từ hai năm -> {d, s, nam}
  if (!XB.lop || !XB.nd || XB.nd === "man") return null;
  const d = xbDS().find(q => q.k === XB.nd), s = XB.lop.find(q => q.k === XB.nd);
  if (!d || !s || !Array.isArray(d.nam)) return null;
  const nam = d.nam.filter(y => y > 0).sort((a, b) => a - b); return nam.length > 1 ? {d, s, nam} : null;
}
function xbLoatBat() { return !!(xb$("xbLoatW") && !xb$("xbLoatW").hidden && XBL.che !== "mot" && xbLoatND()); }
function xbLoatNamChon(L) { const c = XBL.nam[XB.nd]; return c ? L.nam.filter(y => c.includes(y)) : L.nam.slice(); }

/* ---------------- giao diện ---------------- */
(function () {
  const det = xb$("xbLop") && xb$("xbLop").closest("details"); if (!det || xb$("xbLoatW")) return;
  det.insertAdjacentHTML("afterend", `<div id="xbLoatW" hidden data-noi18n><div class="vg-o">` +
    `<span data-t="nn"></span><select id="xbLoat" style="grid-column:span 3"></select>` +
    `<span data-t="cot" data-gh></span><select id="xbLoatCot" data-gh></select><span data-t="bang" data-gh></span><select id="xbLoatBang" data-gh></select></div>` +
    `<div class="row"><label data-gh><input type="checkbox" id="xbLoatTheo"> <span data-t="theo"></span></label></div>` +
    `<div class="xahop" id="xbLoatNamW"><div class="xahop-dau"><button type="button" data-het></button><button type="button" data-bo></button><span class="mu sm" id="xbLoatTT"></span></div>` +
    `<div class="xahop-ds" id="xbLoatNam"></div></div></div>`);
  xb$("xbLoat").onchange = () => { XBL.che = xb$("xbLoat").value; xbLoatLuu(); xbLoatVe(); xbTDCapNhat(); };
  xb$("xbLoatCot").onchange = () => { XBL.cot = +xb$("xbLoatCot").value; xbLoatLuu(); };
  xb$("xbLoatBang").onchange = () => { XBL.bang = xb$("xbLoatBang").value; xbLoatLuu(); };
  xb$("xbLoatTheo").onchange = () => { XBL.theo = xb$("xbLoatTheo").checked; xbLoatLuu(); };
  const tat = on => { const L = xbLoatND(); if (!L) return; XBL.nam[XB.nd] = on ? L.nam.slice() : []; xbLoatLuu(); xbLoatVe(); xbTDCapNhat(); };
  xb$("xbLoatNamW").querySelector("[data-het]").onclick = () => tat(true);
  xb$("xbLoatNamW").querySelector("[data-bo]").onclick = () => tat(false);
  xbLoatChu();
})();
function xbLoatChu() {                            // chữ theo ngôn ngữ
  const w = xb$("xbLoatW"); if (!w) return; const t = (k, s) => { const e = w.querySelector(`[data-t="${k}"]`); if (e) e.textContent = s; };
  t("nn", T("Nhiều năm")); t("cot", T("Số cột")); t("bang", T("Bảng số liệu")); t("theo", T("các lớp dữ liệu khác có năm đó cũng đổi theo năm của từng ô"));
  const op = (id, ds, v) => { xb$(id).innerHTML = ds.map(([x, s]) => `<option value="${x}">${esc(s)}</option>`).join(""); xb$(id).value = String(v); };
  op("xbLoat", [["mot", T("một năm (chọn ở danh sách lớp)")], ["tep", T("từng năm một tệp (gói ZIP kèm bảng diện tích)")], ["ghep", T("ghép các năm trong một ảnh (chung chú giải)")]], XBL.che);
  op("xbLoatCot", [[0, T("tự chọn")]].concat([1, 2, 3, 4, 5, 6].map(n => [n, String(n)])), XBL.cot);
  op("xbLoatBang", [["khong", T("không")], ["ha", T("diện tích, ha")], ["km2", T("diện tích, km²")], ["pct", T("tỉ lệ %")], ["ha_pct", T("ha và %")]], XBL.bang);
  xb$("xbLoatTheo").checked = XBL.theo !== false;
  w.querySelector("[data-het]").textContent = T("chọn hết"); w.querySelector("[data-bo]").textContent = T("bỏ hết");
  xb$("xbLoat").title = T("bản đồ có nhiều năm: xuất từng năm thành tệp riêng, hoặc ghép các năm thành một ảnh có chung chú giải và bảng số liệu");
  xb$("xbLoatBang").title = T("bảng diện tích từng lớp theo năm dưới các ô bản đồ, đếm trong khung (hoặc trong ranh giới cắt)");
}
function xbLoatVe() {                             // hiện khối "Nhiều năm" khi bản đồ chọn có từ hai năm
  const w = xb$("xbLoatW"); if (!w) return; const L = xbLoatND(); w.hidden = !L; if (!L) { xb$("xbLoatTT").textContent = ""; xb$("xbLoatNam").innerHTML = ""; return; }
  xb$("xbLoat").value = XBL.che;
  w.querySelectorAll("[data-gh]").forEach(e => { e.hidden = XBL.che !== "ghep"; });
  xb$("xbLoatNamW").hidden = XBL.che === "mot";
  const chon = new Set(xbLoatNamChon(L));
  xb$("xbLoatNam").innerHTML = L.nam.map(y => `<label><input type="checkbox" value="${y}"${chon.has(y) ? " checked" : ""}> ${y}</label>`).join("");
  xb$("xbLoatNam").querySelectorAll("input").forEach(i => { i.onchange = () => { XBL.nam[XB.nd] = [...xb$("xbLoatNam").querySelectorAll("input:checked")].map(x => +x.value); xbLoatLuu(); xbLoatTT(); xbTDCapNhat(); }; });
  xbLoatTT();
}
function xbLoatTT() { const L = xbLoatND(); if (!L) return; const n = xbLoatNamChon(L).length;
  xb$("xbLoatTT").textContent = XBL.che === "tep" ? T("{n} năm: {n} tệp", {n}) : T("{n} năm: {n} ô bản đồ", {n}); }
var _xbVeND316 = xbVeND;
xbVeND = function () { const r = _xbVeND316.apply(this, arguments); xbLoatVe(); return r; };
var _xbTDMac316 = xbTDMac;
xbTDMac = function () {                           // bản đồ ghép: tiêu đề ghi khoảng năm
  const L = xbLoatBat() && XBL.che === "ghep" ? xbLoatND() : null; if (!L) return _xbTDMac316.apply(this, arguments);
  const ys = xbLoatNamChon(L); if (!ys.length) return _xbTDMac316.apply(this, arguments);
  const cu = L.s.nam; L.s.nam = ys[0];
  try { const m = _xbTDMac316.apply(this, arguments); return {td: String(m.td).split(String(ys[0])).join(namChu(ys)), pd: m.pd}; } finally { L.s.nam = cu; }
};
if (typeof setLang === "function") { const _sl316 = setLang; setLang = function () { const r = _sl316.apply(this, arguments); xbLoatChu(); if (xb$("dlgXB").open) xbLoatVe(); return r; }; }

/* ---------------- số liệu theo năm ---------------- */
function xbLoatKhoa(m) { return (m.ramp ? m.ramp.join(",") : m.mau) + "|" + m.ten; }
function xbLoatCG(L, ys) {                        // nhóm chú giải của từng năm và nhóm chung (hợp các mục)
  const grs = ys.map(y => L.d.cg ? L.d.cg(Object.assign({}, L.s, {nam: y})) : null), muc = [];
  grs.forEach(gr => { if (gr) gr.muc.forEach(m => { if (!muc.some(q => xbLoatKhoa(q) === xbLoatKhoa(m))) muc.push(Object.assign({}, m, {ha: undefined})); }); });
  const g0 = grs.find(Boolean);
  return {grs, chung: g0 ? {k: g0.k, tieuDe: String(g0.tieuDe).split(String(ys[grs.indexOf(g0)])).join(namChu(ys)), muc} : null};
}
async function xbLoatBang(L, ys, grs, E, mp) {   // -> {ys, hang: [{m, ha: [năm]}], tong: [năm]} hoặc null nếu không đếm được diện tích
  if (!grs.length || grs.some(gr => !gr || !gr.dem)) return null;
  const hang = [], tong = [];
  for (let t = 0; t < ys.length; t++) {
    const gr = grs[t], r = await gr.dem(E, mp); tong.push(r.tong || 0);
    gr.muc.forEach((m, j) => { const kh = xbLoatKhoa(m); let h = hang.find(q => q.kh === kh); if (!h) { h = {kh, m, ha: new Array(ys.length).fill(0)}; hang.push(h); } h.ha[t] += r.ha[j] || 0; });
  }
  return {ys, hang: hang.filter(h => h.ha.some(v => v > 0)), tong};
}
function xbBangCSV(B) {                           // bảng diện tích -> CSV (ha và % mỗi năm)
  const cot = ["lop"].concat(...B.ys.map(y => [`ha_${y}`, `pct_${y}`]));
  const rows = B.hang.map(h => { const r = {lop: h.m.ten}; B.ys.forEach((y, t) => { r[`ha_${y}`] = +h.ha[t].toFixed(3); r[`pct_${y}`] = B.tong[t] > 0 ? +(100 * h.ha[t] / B.tong[t]).toFixed(3) : ""; }); return r; });
  const tg = {lop: T("tổng có dữ liệu")}; B.ys.forEach((y, t) => { tg[`ha_${y}`] = +B.tong[t].toFixed(3); tg[`pct_${y}`] = 100; }); rows.push(tg);
  return "﻿" + CORE.toCSV(rows, cot);
}
function xbBangO(v, tong, kieu) {                 // chữ một ô của bảng
  const p = tong > 0 ? 100 * v / tong : 0, pc = p > 0 && p < 0.05 ? "<0.1" : p.toFixed(1);
  return kieu === "km2" ? xbSoChu(v / 100, v >= 10000 ? 1 : 2) : kieu === "pct" ? pc : kieu === "ha_pct" ? `${xbHa(v)} (${pc})` : xbHa(v);
}
function xbBangDelta(h, B, kieu) {                // thay đổi năm cuối so với năm đầu
  const n = B.ys.length - 1, a = h ? h.ha[0] : B.tong[0], b = h ? h.ha[n] : B.tong[n];
  if (kieu === "pct") { const pa = B.tong[0] > 0 ? 100 * a / B.tong[0] : 0, pb = B.tong[n] > 0 ? 100 * b / B.tong[n] : 0, d = pb - pa; return (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(d).toFixed(1); }
  const d = b - a; if (Math.abs(d) < 1e-9) return "0"; const s = kieu === "km2" ? xbSoChu(Math.abs(d) / 100, 2) : xbHa(Math.abs(d)); return (d > 0 ? "+" : "−") + s;
}
function xbBangDo(g, B, kieu, ft, rong) {         // kích thước bảng (cỡ chữ ft), tên lớp cắt ngắn cho vừa bề rộng
  const pad = ft * 0.5, sw = ft * 1.1, coD = B.ys.length > 1;
  const cot = B.ys.map((y, t) => Math.max(xbDo(g, String(y), ft, true), ...B.hang.map(h => xbDo(g, xbBangO(h.ha[t], B.tong[t], kieu), ft)), xbDo(g, xbBangO(B.tong[t], B.tong[t], kieu === "pct" ? "pct" : kieu), ft)) + 2 * pad);
  const dCot = coD ? Math.max(xbDo(g, "Δ " + B.ys[0] + "–" + B.ys[B.ys.length - 1], ft, true), ...B.hang.map(h => xbDo(g, xbBangDelta(h, B, kieu), ft))) + 2 * pad : 0;
  const soW = cot.reduce((a, b) => a + b, 0) + dCot;
  let ten = Math.max(xbDo(g, T("Lớp"), ft, true), ...B.hang.map(h => sw + ft * 0.4 + xbDo(g, h.m.ten, ft)), xbDo(g, T("tổng có dữ liệu"), ft, true)) + 2 * pad;
  const tenMax = Math.max(rong - soW, rong * 0.25); if (ten > tenMax) ten = tenMax;
  return {cot, dCot, ten, w: ten + soW, rh: ft * 1.55, h: ft * 1.55 * (B.hang.length + 2) + ft * 1.5, ft, pad, sw, coD};
}
function xbCatChu(g, t, ft, rong) { if (xbDo(g, t, ft) <= rong) return t; let s = String(t); while (s.length > 1 && xbDo(g, s + "…", ft) > rong) s = s.slice(0, -1); return s + "…"; }
function xbVeBang(g, B, D, x, y, k, kieu, ghi) {  // vẽ bảng: hàng tiêu đề (năm), từng lớp, tổng; dòng ghi đơn vị và phạm vi đếm ở trên
  const {ft, rh, pad, sw} = D; let cy = y;
  xbChu(g, ghi, x, cy + ft * 0.6, ft * 0.92, "left", false, "#344054"); cy += ft * 1.5;
  const xs = [x + D.ten]; D.cot.forEach(w => xs.push(xs[xs.length - 1] + w)); if (D.coD) xs.push(xs[xs.length - 1] + D.dCot);
  g.save(); g.fillStyle = "#f2f4f7"; g.fillRect(x, cy, D.w, rh); g.restore();
  xbChu(g, T("Lớp"), x + pad, cy + rh / 2, ft, "left", true);
  B.ys.forEach((yy, t) => xbChu(g, String(yy), xs[t + 1] - pad, cy + rh / 2, ft, "right", true));
  if (D.coD) xbChu(g, "Δ " + B.ys[0] + "–" + B.ys[B.ys.length - 1], xs[xs.length - 1] - pad, cy + rh / 2, ft, "right", true);
  const dong = yy => { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + D.w, yy); g.stroke(); };
  g.save(); g.strokeStyle = "#98a2b3"; g.lineWidth = Math.max(1, 0.6 * k); dong(cy); dong(cy + rh); g.restore(); cy += rh;
  B.hang.forEach(h => {
    g.save(); g.fillStyle = h.m.mau || (h.m.ramp && h.m.ramp[0]) || "#999"; g.fillRect(x + pad, cy + (rh - ft * 0.8) / 2, sw, ft * 0.8);
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = Math.max(1, 0.5 * k); g.strokeRect(x + pad, cy + (rh - ft * 0.8) / 2, sw, ft * 0.8); g.restore();
    xbChu(g, xbCatChu(g, h.m.ten, ft, D.ten - sw - ft * 0.4 - 2 * pad), x + pad + sw + ft * 0.4, cy + rh / 2, ft, "left");
    h.ha.forEach((v, t) => xbChu(g, xbBangO(v, B.tong[t], kieu), xs[t + 1] - pad, cy + rh / 2, ft, "right"));
    if (D.coD) xbChu(g, xbBangDelta(h, B, kieu), xs[xs.length - 1] - pad, cy + rh / 2, ft, "right", false, "#344054");
    cy += rh; });
  g.save(); g.strokeStyle = "#98a2b3"; g.lineWidth = Math.max(1, 0.6 * k); dong(cy); g.restore();
  xbChu(g, T("tổng có dữ liệu"), x + pad, cy + rh / 2, ft, "left", true);
  B.tong.forEach((v, t) => xbChu(g, kieu === "pct" ? "100" : xbBangO(v, v, kieu === "ha_pct" ? "ha" : kieu), xs[t + 1] - pad, cy + rh / 2, ft, "right", true));
  if (D.coD && kieu !== "pct") xbChu(g, xbBangDelta(null, B, kieu === "ha_pct" ? "ha" : kieu), xs[xs.length - 1] - pad, cy + rh / 2, ft, "right", true, "#344054");
  cy += rh; g.save(); g.strokeStyle = "#475467"; g.lineWidth = Math.max(1, 0.9 * k); dong(cy); g.restore();
  return cy - y;
}
function xbBangGhi(kieu, catTen) {
  const dv = kieu === "km2" ? T("km²") : kieu === "pct" ? T("% diện tích có dữ liệu") : kieu === "ha_pct" ? T("ha (% diện tích có dữ liệu)") : T("ha");
  return T("Diện tích các lớp theo năm, {d}", {d: dv}) + "; " + (catTen ? T("đếm trong ranh giới {v}", {v: catTen}) : T("đếm trong khung bản đồ"));
}

/* ---------------- ② bản đồ ghép nhiều năm ---------------- */
async function xbVeGhep(o, L, ys, tt) {           // -> {c, W, H, E, F, Fds, thieu, tl, CG, B}
  const dpi = o.dpi, cm = v => v / 2.54 * dpi, fs = o.chu * dpi / 72, k = dpi / 96 * (o.net || 1), n = ys.length;
  const W = Math.round(cm(o.w)), H = Math.round(cm(o.h)); if (!(W > 50 && H > 50)) throw new Error(T("khổ ảnh quá nhỏ"));
  if (W * H > 64e6) throw new Error(T("ảnh quá lớn ({w} × {h} điểm ảnh): giảm khổ hoặc độ phân giải", {w: W, h: H}));
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext && c.getContext("2d"); if (!g) throw new Error(T("trình duyệt không vẽ được canvas"));
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  XB.nhanDP = null; XB.nhanHong = {};
  const PV = xbPhamVi(o.pham || XB.pham), mp = o.cat && PV.mp ? PV.mp : null; o.catTen = mp ? PV.ten : "";
  const o2 = Object.assign({}, o, {cgSo: "khong"}), {grs, chung} = xbLoatCG(L, ys);
  const CG = o.cgv === "tat" ? [] : [].concat(chung && !XB.bo[chung.k] && chung.muc.length ? [chung] : [], xbChuGiai().filter(gr => gr.k !== XB.nd && !XB.bo[gr.k]));
  const le = cm(0.35); let top = le, bot = H - le, left = le, right = W - le;
  if (o.tieuDe) top += fs * 1.9; if (o.phuDe) top += fs * 1.35;
  const nguon = o.nguon ? xbDong(g, o.nguon, fs * 0.72, W - 2 * le) : []; bot -= nguon.length * fs * 1.05 + (nguon.length ? fs * 0.3 : 0);
  let cgD = null; if (o.cgv === "phai" && CG.length) { cgD = xbDoCG(g, CG, fs, o2); right -= cgD.w + fs * 0.8; }
  // bảng: cỡ chữ vừa bề rộng (đo trước bằng số giả, điền số thật sau khi biết khung)
  const kieu = XBL.bang, coBang = kieu && kieu !== "khong" && grs.length && grs.every(gr => gr && gr.dem);
  let Dg = null; const bot0 = bot;
  if (coBang) { const gia = {ys, hang: [], tong: ys.map(() => 88888.8)}; xbLoatCG(L, ys).chung.muc.forEach(m => gia.hang.push({m, ha: ys.map(() => 88888.8)}));
    let ft = fs * 0.78; Dg = xbBangDo(g, gia, kieu, ft, right - left); while (Dg.w > right - left && ft > fs * 0.45) { ft *= 0.92; Dg = xbBangDo(g, gia, kieu, ft, right - left); }
    bot -= Dg.h + fs * 0.6; }
  // lưới các ô: chọn số cột cho ô bản đồ lớn nhất (theo tỉ lệ phạm vi)
  let x0, y0, x1, y1;
  if (PV.bb) { const pd = Math.max(PV.bb[2] - PV.bb[0], PV.bb[3] - PV.bb[1]) * 0.03; [x0, y0, x1, y1] = [PV.bb[0] - pd, PV.bb[1] - pd, PV.bb[2] + pd, PV.bb[3] + pd]; }
  else { const b = map.getBounds(), p0 = CORE.to3857(b.getWest(), b.getSouth()), p1 = CORE.to3857(b.getEast(), b.getNorth()); [x0, y0, x1, y1] = [p0[0], p0[1], p1[0], p1[1]]; }
  const gar = (x1 - x0) / (y1 - y0), coNhan = o.luoi !== "tat";
  const mL = coNhan ? Math.max(xbDo(g, o.luoi === "utm" ? "2 400 000" : "106°40'30\"E", fs * 0.82) + fs * 0.8, fs * 2) : fs * 0.4, mB = coNhan ? fs * 1.45 : fs * 0.3, mR = coNhan ? fs * 0.5 : fs * 0.2;
  const lh = coNhan ? fs * 1.75 : fs * 1.3, gx = coNhan ? fs * 0.9 : fs * 0.6, gy = coNhan ? fs * 1.6 : fs * 0.5, Aw = right - left, Ah = bot - top;
  const thu = cc => { const r = Math.ceil(n / cc), cw = (Aw - mL - mR - (cc - 1) * gx) / cc, ch = (Ah - mB - r * lh - (r - 1) * gy) / r; if (cw <= 0 || ch <= 0) return null;
    const fw = Math.min(cw, ch * gar); return {c: cc, r, fw, fh: fw / gar}; };
  let Q = null; if (XBL.cot > 0) Q = thu(Math.min(XBL.cot, n));
  if (!Q) {                                        // ô lớn nhất; gần như bằng nhau (≥ 97 %) thì chọn lưới ít ô trống, cân đối hơn; muốn khác thì chọn Số cột
    const ds = []; for (let cc = 1; cc <= n; cc++) { const q = thu(cc); if (q) ds.push(q); }
    const max = Math.max(0, ...ds.map(q => q.fw * q.fh));
    Q = ds.filter(q => q.fw * q.fh >= 0.97 * max).sort((p, q) => (p.r * p.c - n) - (q.r * q.c - n) || Math.abs(p.r - p.c) - Math.abs(q.r - q.c) || q.fw * q.fh - p.fw * p.fh)[0] || null; }
  if (!Q || Q.fw < 40 || Q.fh < 40) throw new Error(T("khổ ảnh không đủ chỗ cho {n} ô bản đồ: tăng khổ, giảm số năm, cỡ chữ hoặc bỏ bảng", {n}));
  const {r: R_, fw, fh} = Q, C_ = Q.c, tw = mL + C_ * fw + (C_ - 1) * gx + mR, th = R_ * (lh + fh) + (R_ - 1) * gy + mB;
  const khoi = th + (Dg ? fs * 0.6 + Dg.h : 0), ox = left + (Aw - tw) / 2, oy = top + Math.max(0, (bot0 - top - khoi) / 2);   // các ô và bảng đặt giữa theo chiều dọc
  const Fds = ys.map((_, i) => ({x: ox + mL + (i % C_) * (fw + gx), y: oy + Math.floor(i / C_) * (lh + fh + gy) + lh, w: fw, h: fh}));
  const E = {x0, y0, x1, y1, r: (x1 - x0) / fw};
  // vẽ từng ô: ảnh nền, nhãn tải một lần (cùng phạm vi, cùng cỡ); bản đồ chọn (và lớp dữ liệu khác có năm đó) theo năm của ô
  const by = {}; xbDS().forEach(d => { by[d.k] = d; });
  const cache = new Map(), thieu = new Set(); let tl = "";
  for (let i = 0; i < n; i++) {
    const y = ys[i], F = Fds[i], Ei = Object.assign({}, E, {fx: F.x, fy: F.y, fw: F.w, fh: F.h});
    if (tt) tt(T("ô {i}/{n}: năm {y}…", {i: i + 1, n, y}));
    const ds = XB.lop.filter(s => s.on && s.op > 0 && by[s.k]).map(s => { const d = by[s.k];
      const doi = s.k === XB.nd || (XBL.theo !== false && Array.isArray(d.nam) && d.nam.includes(y));
      return {s: doi ? Object.assign({}, s, {nam: y}) : s, d}; });
    const R = await xbVeCacLop(g, Ei, F, ds, mp, k, fs, m => { if (tt) tt(T("ô {i}/{n}: năm {y}…", {i: i + 1, n, y}) + " " + m); }, cache);
    R.thieu.forEach(t => thieu.add(t));
    const cot = i % C_;
    xbLuoi(g, Ei, Object.assign({}, o, {nhanX: i + C_ >= n, nhanY: cot === 0}), fs, k);
    if (o.khung !== false) { g.save(); g.strokeStyle = "#111"; g.lineWidth = Math.max(1, 1.1 * k); g.setLineDash([]); g.strokeRect(F.x, F.y, F.w, F.h); g.restore(); }
    xbChu(g, String(y), F.x + F.w / 2, F.y - (coNhan ? fs * 0.45 + fs * 0.62 : fs * 0.62), fs * 1.1, "center", true);
  }
  cache.clear();
  // vùng trống cuối lưới (khi số năm không chia hết số cột): đặt mũi tên bắc, thước tỉ lệ (và chú giải nếu chọn "trong khung")
  const trongO = n < R_ * C_ ? {x: ox + mL + (n % C_) * (fw + gx), y: oy + Math.floor(n / C_) * (lh + fh + gy) + lh, w: (C_ - n % C_) * (fw + gx) - gx, h: fh} : null;
  const E0 = Object.assign({}, E, {fx: Fds[0].x, fy: Fds[0].y, fw, fh});
  let cgH = 0;
  if (CG.length && o.cgv === "phai") cgH = xbVeCG(g, CG, right + fs * 0.8, Fds[0].y, fs, k, false, o2).h;
  if (CG.length && o.cgv === "trong") { const D = xbDoCG(g, CG, fs, o2);
    if (trongO) xbVeCG(g, CG, trongO.x, trongO.y, fs, k, true, o2);
    else { const F = Fds[n - 1]; xbVeCG(g, CG, F.x + F.w - D.w - fs * 0.5, F.y + F.h - D.h - fs * 0.5, fs, k, true, o2); } }
  const oDanh = trongO && !(CG.length && o.cgv === "trong");
  if (o.bac) { const F = oDanh ? trongO : Fds[Math.min(C_, n) - 1]; xbBac(g, Object.assign({}, E0, {fx: F.x, fy: F.y, fw: F.w, fh: F.h}), fs, T("B")); }
  if (o.thuoc) {                                  // thước tỉ lệ một lần: ở vùng trống, dưới chú giải bên phải, hoặc trong ô dưới trái
    let x, y, mw;
    if (trongO) { x = trongO.x + fs * 0.6; y = trongO.y + trongO.h - fs * 1.2; mw = Math.min(trongO.w * 0.6, fs * 14); }
    else if (CG.length && o.cgv === "phai" && Fds[0].y + cgH + fs * 4.5 < bot) { x = right + fs * 1.4; y = Fds[0].y + cgH + fs * 3; mw = Math.max(W - le - x - fs * 1.5, fs * 4); }
    else { const F = Fds[(R_ - 1) * C_]; x = F.x + fs * 1.1; y = F.y + F.h - fs * 2.1; mw = F.w * 0.45; }
    tl = xbThuocO(g, E0, fs, dpi, x, y, mw);
  }
  // bảng số liệu dưới các ô
  let B = null;
  if (coBang) { if (tt) tt(T("đang tính diện tích các năm…")); B = await xbLoatBang(L, ys, grs, E, mp);
    if (B && B.hang.length) { const D = xbBangDo(g, B, kieu, Dg.ft, right - left); const gX = ox + mL, gW = C_ * fw + (C_ - 1) * gx, bx = Math.max(left, Math.min(right - D.w, gX + (gW - D.w) / 2));
      xbVeBang(g, B, D, bx, oy + th + fs * 0.6, k, kieu, xbBangGhi(kieu, o.catTen)); } }
  if (o.tieuDe) xbChu(g, o.tieuDe, W / 2, le + fs * 0.85, fs * 1.45, "center", true);
  if (o.phuDe) xbChu(g, o.phuDe, W / 2, le + (o.tieuDe ? fs * 1.9 : 0) + fs * 0.6, fs * 1.02, "center", false, "#344054");
  nguon.forEach((d, i) => xbChu(g, d, le, H - le - (nguon.length - 1 - i) * fs * 1.05 - fs * 0.45, fs * 0.72, "left", false, "#344054"));
  return {c, W, H, E: Object.assign({}, E, {fx: Fds[0].x, fy: Fds[0].y, fw, fh}), F: Fds[0], Fds, thieu: [...thieu], tl, CG, B, cot: C_, hang: R_};
}

function xbThuocO(g, E, fs, dpi, x, y, maxW) {    // thước tỉ lệ ở vị trí cho trước (x: đầu thước, y: đỉnh vạch), dài tối đa maxW
  const lat = CORE.m2ll((E.x0 + E.x1) / 2, (E.y0 + E.y1) / 2)[1], mPx = E.r * Math.cos(lat * Math.PI / 180);
  const S = XH.thuocTiLe(mPx, maxW), h = fs * 0.42;
  const mau = Math.round(mPx * dpi / 0.0254), tl = "1 : " + String(mau >= 10000 ? Math.round(mau / 100) * 100 : Math.round(mau / 10) * 10).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const giua = S.px >= xbDo(g, String(S.m), fs * 0.72) * 3.2;     // thước ngắn: bỏ nhãn giữa cho khỏi chồng chữ
  const nhan = [["0", 0]].concat(giua ? [[String(S.m >= 1000 ? S.m / 2000 : S.m / 2), 0.5]] : [], [[S.nhan.replace(/ km$/, " " + T("km")).replace(/ m$/, " " + T("m")), 1]]);
  g.save(); g.fillStyle = "rgba(255,255,255,.85)";
  const wTl = xbDo(g, tl, fs * 0.8); g.fillRect(x - fs * 0.6, y - fs * 1.25, Math.max(S.px + xbDo(g, nhan[nhan.length - 1][0], fs * 0.72) / 2, wTl) + fs * 1.4, fs * 2.85);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#fff" : "#111"; g.fillRect(x + S.px * i / 4, y, S.px / 4, h); }
  g.strokeStyle = "#111"; g.lineWidth = Math.max(1, fs * 0.06); g.strokeRect(x, y, S.px, h);
  nhan.forEach(([t, f]) => xbChu(g, t, x + S.px * f, y - fs * 0.55, fs * 0.72, "center"));
  xbChu(g, tl, x, y + h + fs * 0.7, fs * 0.8, "left"); g.restore();
  return tl;
}

/* ---------------- chạy: xem trước, xuất ---------------- */
function xbLoatTieuDe(L, y, o0) {                 // tiêu đề, phụ đề của năm y khi xuất từng năm
  const tay = XB.o.tdTay && XB.o.tdTay.nd === XB.nd;
  if (!tay) { const cu = L.s.nam; L.s.nam = y; try { const m = _xbTDMac316(); return {td: m.td, pd: m.pd}; } finally { L.s.nam = cu; } }
  let td = o0.tieuDe || "", co = false;
  L.nam.forEach(v => { if (td.includes(String(v))) { td = td.split(String(v)).join(String(y)); co = true; } });
  return {td: co || !td ? td : td + " " + y, pd: o0.phuDe};
}
var _xbChay316 = xbChay;
xbChay = async function (xem) {
  if (!xbLoatBat()) return _xbChay316.apply(this, arguments);
  const L = xbLoatND(), tok = ++XB.tok, o0 = Object.assign({}, xbDoc()), tt = s => { if (tok === XB.tok) xb$("xbTT").textContent = s; };
  const ys = xbLoatNamChon(L); if (!ys.length) { tt(T("chọn ít nhất một năm")); return; }
  const cu = L.s.nam, nguonTay = !!XB.o.nguonTay;
  try {
    if (xem) { const Wv = xb$("xbXem").parentElement.clientWidth || 700; o0.dpi = Math.max(20, Math.min(96, Math.floor(Wv / (o0.w / 2.54)))); }
    const xemCanvas = R => { const cv = xb$("xbXem"); cv.width = R.W; cv.height = R.H; cv.getContext("2d").drawImage(R.c, 0, 0); };
    const ghiThieu = t => (t.length ? " " + T("Không lấy được: {l} (máy chủ không cho tải chéo hoặc không có ô ảnh).", {l: t.join(", ")}) : "");
    if (XBL.che === "ghep") {
      const o = Object.assign({}, o0); if (o.dd === "tif") o.dd = "png";
      L.s.nam = null; if (!nguonTay) o.nguon = xbNguonMac(o);
      const R = await xbVeGhep(o, L, ys, tt); if (tok !== XB.tok) return;
      if (XB.nhanDP && !nguonTay) { /* dòng nguồn ghi nhà cung cấp nhãn dự phòng ở lần xuất sau */ }
      if (xem) { xemCanvas(R); tt(T("xem trước: {n} năm, {c} cột × {h} hàng ({t})", {n: ys.length, c: R.cot, h: R.hang, t: R.tl || "-"}) + ghiThieu(R.thieu)); return R; }
      const goc = xbTenTep(o), tep = await xbTep(R, o, goc, false);
      if (o0.wf && R.B) tep.push({ten: goc + "_bang_dien_tich.csv", du: xbBangCSV(R.B)});
      let ten, du, kieu; if (tep.length === 1) ({ten, du, kieu} = tep[0]); else { du = XH.zip(tep.map(f => ({ten: f.ten, du: f.du}))); ten = goc + ".zip"; kieu = "application/zip"; }
      v28Tai(ten, du, kieu);
      tt(T("đã xuất {f}: {n} năm trong một ảnh, {w} × {h} điểm ảnh, {d} dpi", {f: ten, n: ys.length, w: R.W, h: R.H, d: o.dpi}) + (o0.dd === "tif" ? " " + T("Bản đồ ghép không xuất GeoTIFF: đã xuất PNG.") : "") + ghiThieu(R.thieu));
      return {ten, du, R};
    }
    // từng năm một tệp
    const geoTif = !xem && o0.dd === "tif", tep = [], thieu = new Set(), bang = {ys: [], hang: [], tong: []};
    let coBang = true, R0 = null;
    for (let i = 0; i < (xem ? 1 : ys.length); i++) {
      const y = ys[i]; L.s.nam = y; const m = xbLoatTieuDe(L, y, o0), o = Object.assign({}, o0, {tieuDe: m.td, phuDe: m.pd});
      if (!nguonTay) o.nguon = xbNguonMac(o);
      const R = await xbVe(geoTif ? Object.assign({}, o, {chiKhung: true}) : o, s => tt(T("năm {y} ({i}/{n}): {s}", {y, i: i + 1, n: ys.length, s}))); if (tok !== XB.tok) return;
      R.thieu.forEach(t => thieu.add(t));
      if (xem) { xemCanvas(R); tt(T("xem trước năm {y} (xuất sẽ tạo {n} tệp)", {y, n: ys.length}) + ghiThieu(R.thieu)); return R; }
      tep.push(...await xbTep(R, o, xbTenTep(o), geoTif)); R0 = R;
      const gr = L.d.cg ? L.d.cg(L.s) : null;
      if (coBang && gr && gr.dem) { const PV = xbPhamVi(o.pham || XB.pham), mp = o.cat && PV.mp ? PV.mp : null, r = await gr.dem(R.E, mp);
        bang.ys.push(y); bang.tong.push(r.tong || 0);
        gr.muc.forEach((mm, j) => { const kh = xbLoatKhoa(mm); let h = bang.hang.find(q => q.kh === kh); if (!h) { h = {kh, m: mm, ha: []}; bang.hang.push(h); } h.ha[bang.ys.length - 1] = r.ha[j] || 0; }); }
      else coBang = false;
    }
    L.s.nam = null; const oz = Object.assign({}, o0, {tieuDe: XB.o.tdTay && XB.o.tdTay.nd === XB.nd ? o0.tieuDe : String(xbLoatTieuDe(L, ys[0], o0).td).split(String(ys[0])).join(namChu(ys))});
    const goc = xbTenTep(oz);
    if (coBang && bang.ys.length) { bang.hang.forEach(h => { for (let t = 0; t < bang.ys.length; t++) h.ha[t] = h.ha[t] || 0; }); bang.hang = bang.hang.filter(h => h.ha.some(v => v > 0));
      tep.push({ten: goc + "_bang_dien_tich.csv", du: xbBangCSV(bang)}); }
    const du = XH.zip(tep.map(f => ({ten: f.ten, du: f.du}))), ten = goc + ".zip";
    v28Tai(ten, du, "application/zip");
    tt(T("đã xuất {f}: {n} năm, {k} tệp", {f: ten, n: ys.length, k: tep.length}) + (R0 ? `, ${R0.W} × ${R0.H} ${T("điểm ảnh")}` : "") + ghiThieu([...thieu]));
    return {ten, du, tep: tep.map(f => f.ten), bang};
  } catch (e) { tt(T("lỗi: ") + (/tainted|insecure|SecurityError/i.test(String(e && (e.name + e.message))) ? T("một lớp ảnh không cho tải chéo nên trình duyệt chặn xuất: tắt lớp đó hoặc đổi ảnh nền rồi thử lại") : (e.message || e))); }
  finally { L.s.nam = cu; }
};
