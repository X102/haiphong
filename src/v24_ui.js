/* =============================== BẢN 2.4 =============================== */
/* ① thư viện chỉ số: 248 chỉ số Sentinel-2 (Index DataBase, theo tệp 248-INDEX-S2.txt của tác giả) và công thức tự nhập,
   dùng chung cho lớp S2 (chế độ chỉ số), đồ thị theo năm, đường mùa vụ 6 kỳ, giá trị tại điểm, đặc trưng chọn vùng;
   ② DEM (độ cao, độ dốc, bóng địa hình); ③ giá trị các lớp tại điểm khi nhấp bản đồ. */

/* ---------------- ① chỉ số ---------------- */
const CHISO_IDB = /*__CHISO__*/null;
const CS_GOC = {                            // 5 chỉ số cũ của trang, giữ nguyên công thức như CORE.indices
  NDVI: {bt: "(B8 - B4) / (B8 + B4)", lo: -0.2, hi: 0.9, mau: "ndvi", ten_day: "Normalized Difference Vegetation Index"},
  NDWI: {bt: "(B3 - B8) / (B3 + B8)", lo: -0.6, hi: 0.6, mau: "burd", ten_day: "Normalized Difference Water Index (McFeeters)"},
  MNDWI: {bt: "(B3 - B11) / (B3 + B11)", lo: -0.6, hi: 0.6, mau: "burd", ten_day: "Modified Normalized Difference Water Index (Xu)"},
  NDBI: {bt: "(B11 - B8) / (B11 + B8)", lo: -0.5, hi: 0.5, mau: "rdbu", ten_day: "Normalized Difference Built-up Index"},
  BSI: {bt: "((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))", lo: -0.4, hi: 0.4, mau: "rdbu", ten_day: "Bare Soil Index"},
};
ST.chiso = Object.assign({dung: Object.keys(CS_GOC), tu: [], khoang: {}}, ST.chiso || {});
const CS_TRUNG = {};                         // tên ngắn trùng nhau (vd NDVI có 3 công thức) thì thêm số thứ tự IDB
(CHISO_IDB ? CHISO_IDB.ds : []).forEach(x => { CS_TRUNG[x.ten] = (CS_TRUNG[x.ten] || 0) + 1; });
Object.keys(CS_GOC).forEach(k => { CS_TRUNG[k] = (CS_TRUNG[k] || 0) + 1; });
function csDinh(id) {
  if (CS_GOC[id]) return Object.assign({id, ten: id, nguon: "goc"}, CS_GOC[id]);
  const m = /^idb:(\d+)$/.exec(id);
  if (m && CHISO_IDB) {
    const x = CHISO_IDB.ds[+m[1] - 1]; if (!x) return null;
    return {id, ten: CS_TRUNG[x.ten] > 1 ? `${x.ten}·${x.so}` : x.ten, ten_day: x.ten_day, cong_thuc: x.cong_thuc, bt: x.bt, thieu: x.thieu, nguon: "idb", so: x.so};
  }
  if (/^u:/.test(id)) { const u = ST.chiso.tu.find(t => t.id === id); return u ? {id, ten: u.ten, bt: u.bt, nguon: "tu"} : null; }
  return null;
}
const CS_CACHE = {};
function csLay(id) {                        // định nghĩa + hàm đã biên dịch + khoảng hiển thị
  const d = csDinh(id); if (!d) return null;
  const bangs = s2Bang(), key = id + "|" + d.bt + "|" + bangs.join();
  let c = CS_CACHE[key];
  if (!c) {
    try {
      const f = CORE.bieuThuc(d.bt, bangs, CHISO_IDB ? CHISO_IDB.hang : {});
      c = Object.assign({}, d, {f, loi: null, kh: d.lo != null ? [d.lo, d.hi] : CORE.khoangMau(f, bangs)});
    } catch (e) { c = Object.assign({}, d, {f: null, loi: e.message, kh: [-1, 1]}); }
    CS_CACHE[key] = c;
  }
  const k = ST.chiso.khoang[id];
  return Object.assign({}, c, {lo: k ? k[0] : c.kh[0], hi: k ? k[1] : c.kh[1], mau: c.mau || "viridis"});
}
function csDS() { return ST.chiso.dung.map(csLay).filter(c => c && c.f); }
function csTinh(c, dn) { return c && c.f ? c.f(dn.map(x => x / 10000)) : null; }      // dn: DN (phản xạ × 10000), thứ tự s2Bang()
function csGop(o) {                          // nhập tệp tiến độ của người khác: thêm công thức tự nhập chưa có
  (o.tu || []).forEach(u => { if (!ST.chiso.tu.some(t => t.bt === u.bt)) ST.chiso.tu.push(u); });
  (o.dung || []).forEach(id => { if (!ST.chiso.dung.includes(id) && csDinh(id)) ST.chiso.dung.push(id); });
  csDoi();
}
function csDoi() {                           // danh sách hay khoảng đổi: vẽ lại mọi chỗ có chỉ số
  save(); GT_CACHE.clear();
  if (!ST.chiso.dung.includes(S2V.chi)) { S2V.chi = ST.chiso.dung[0] || "NDVI"; ls("laymau_hp_s2v_v1", S2V); }
  const box = document.querySelector("[data-s2v]"); if (box) s2vUI(box);
  if (OVL.s2d && OVL.s2d.layer && OVL.s2d.layer.redraw && S2V.mode === "idx") OVL.s2d.layer.redraw();
  if (typeof VG !== "undefined" && MAN) vgVeDT();
  renderCurve(); if ($("selStrip").value === "s2d" && S2V.mode === "idx") renderStrip(); else vzNguon();
}
function csMo() { csVe(); if (!$("dlgCS").open) $("dlgCS").showModal(); }
function csVe() {
  $("csDung").innerHTML = ST.chiso.dung.map(id => {
    const c = csLay(id); if (!c) return "";
    return `<div class="row" data-id="${esc(id)}"><b style="min-width:92px">${esc(c.ten)}</b><code title="${esc(c.bt)}">${esc(c.bt)}</code>` +
      (c.loi ? ` <span style="color:#b42318">${esc(T(c.loi))}</span>` : "") + `<span style="flex:1"></span>` +
      `<input type="number" step="any" data-k="lo" value="${c.lo}" title="${T("đầu thấp của thang màu")}"> .. <input type="number" step="any" data-k="hi" value="${c.hi}" title="${T("đầu cao của thang màu")}">` +
      `<button type="button" data-a="len" title="${T("đưa lên trên")}">↑</button><button type="button" data-a="bo" title="${T("bỏ khỏi danh sách đang dùng")}">×</button></div>`;
  }).join("") || `<span class="mu">${T("chưa có chỉ số nào")}</span>`;
  $("csDung").querySelectorAll("[data-id]").forEach(r => {
    const id = r.dataset.id;
    r.querySelectorAll("input").forEach(i => { i.onchange = () => {
      const lo = +r.querySelector('[data-k="lo"]').value, hi = +r.querySelector('[data-k="hi"]').value;
      if (isFinite(lo) && isFinite(hi) && hi > lo) { ST.chiso.khoang[id] = [lo, hi]; csDoi(); } }; });
    r.querySelectorAll("button").forEach(b => { b.onclick = () => {
      const d = ST.chiso.dung, i = d.indexOf(id);
      if (b.dataset.a === "bo") d.splice(i, 1); else if (i > 0) { d.splice(i, 1); d.splice(i - 1, 0, id); }
      csDoi(); csVe(); }; });
  });
  csVeTV();
}
function csTatCa() {                         // mọi chỉ số: có sẵn, tự nhập, thư viện IDB
  return Object.keys(CS_GOC).map(csDinh).concat(ST.chiso.tu.map(u => csDinh(u.id)), (CHISO_IDB ? CHISO_IDB.ds : []).map(x => csDinh("idb:" + x.so))).filter(Boolean);
}
function csVeTV() {
  const q = CORE.khongDau($("csTim").value), ds = csTatCa();
  const khop = ds.filter(d => !q || CORE.khongDau([d.ten, d.ten_day || "", d.bt, d.cong_thuc || "", d.so ? "idb " + d.so : ""].join(" ")).includes(q));
  $("csDem").textContent = T("{n} / {m} chỉ số", {n: khop.length, m: ds.length});
  const N = 150;
  $("csThuVien").innerHTML = `<table>` + khop.slice(0, N).map(d => {
    const dung = ST.chiso.dung.includes(d.id), tat = d.thieu && d.thieu.length;
    return `<tr data-id="${esc(d.id)}" class="${tat ? "tat" : ""}"><td>${tat ? "" : `<button type="button" data-a="them"${dung ? " disabled" : ""}>${dung ? "✓" : "＋"}</button>`}</td>` +
      `<td><b>${esc(d.ten)}</b>${d.nguon === "tu" ? ` <button type="button" data-a="xoatu" title="${T("xoá công thức tự nhập")}">🗑</button>` : ""}` +
      `<div class="mu">${esc(d.ten_day || (d.nguon === "tu" ? T("công thức tự nhập") : ""))}</div></td>` +
      `<td><code title="${esc(d.cong_thuc || d.bt)}">${esc(d.bt)}</code>${tat ? `<div class="mu">${T("cần {b}, ảnh của trang không có", {b: d.thieu.join(", ")})}</div>` : ""}</td></tr>`;
  }).join("") + `</table>` + (khop.length > N ? `<div class="mu sm">${T("hiện {a} / {n}: gõ thêm để lọc", {a: N, n: khop.length})}</div>` : "");
  $("csThuVien").querySelectorAll("button").forEach(b => { b.onclick = () => {
    const id = b.closest("[data-id]").dataset.id;
    if (b.dataset.a === "them") { if (!ST.chiso.dung.includes(id)) ST.chiso.dung.push(id); }
    else if (b.dataset.a === "xoatu") {
      if (!confirm(T("Xoá công thức {t}?", {t: (csDinh(id) || {}).ten || id}))) return;
      ST.chiso.tu = ST.chiso.tu.filter(u => u.id !== id); ST.chiso.dung = ST.chiso.dung.filter(x => x !== id);
    }
    csDoi(); csVe(); }; });
}
function csThu() {                           // kiểm công thức tự nhập: cú pháp, băng dùng, khoảng trên phổ mẫu, giá trị tại điểm
  const bt = $("csBT").value.trim(), tt = $("csTT");
  try {
    const f = CORE.bieuThuc(bt, s2Bang(), CHISO_IDB ? CHISO_IDB.hang : {}), kh = CORE.khoangMau(f, s2Bang());
    const t = T("công thức hợp lệ, dùng {b}", {b: f.bang.join(", ") || "-"}) + " · " + T("trên các phổ mẫu: {a} .. {c}", {a: kh[0], c: kh[1]});
    tt.textContent = t; tt.style.color = "#1a7f37";
    const p = vizPt();
    if (p && MAN && MAN.s2d) s2dAt(p).then(A => { const d = A[ST.nam]; if (d && tt.textContent === t) { const x = f(d.v.map(v => v / 10000));
      tt.textContent = t + " · " + T("tại điểm đang xem, năm {y}: {v}", {y: ST.nam, v: x == null ? "-" : fmtV(x)}); } }).catch(() => {});
    return f;
  } catch (e) { tt.textContent = T("lỗi công thức: ") + T(e.message); tt.style.color = "#b42318"; return null; }
}
function csThem() {
  const f = csThu(); if (!f) return;
  let ten = $("csTen").value.trim() || "CT" + (ST.chiso.tu.length + 1);
  const trung = n => csTatCa().some(d => d.ten === n); let k = 2, goc = ten; while (trung(ten)) ten = goc + "_" + k++;
  const id = "u:" + Date.now().toString(36);
  ST.chiso.tu.push({id, ten, bt: $("csBT").value.trim()}); ST.chiso.dung.push(id);
  $("csTen").value = ""; $("csBT").value = "";
  csDoi(); csVe(); msg(T("đã thêm chỉ số {t}", {t: ten}), "ok", 2500);
}
async function csCan() {                     // khoảng hiển thị = phân vị 2-98 % trong khung nhìn, năm đang gán
  if (!MAN || !MAN.s2d || !(MAN.s2d.nam || []).includes(ST.nam)) { msg(T("chưa có ảnh S2 10 băng năm {y}", {y: ST.nam}), "wa", 3000); return; }
  const b = map.getBounds(), a = CORE.to3857(b.getWest(), b.getSouth()), c = CORE.to3857(b.getEast(), b.getNorth()), nb = s2Bang().length, W = 160;
  const R = await readUTM(CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", ST.nam)), [a[0], a[1], c[0], c[1]], W, W, 0, Array.from({length: nb}, (_, i) => i));
  if (!R) { msg("ảnh S2 10 băng không phủ vùng này", "wa", 3000); return; }
  let n = 0;
  csDS().forEach(cs => {
    const vals = [];
    for (let i = 0; i < W * W; i++) { const j = R.idx[i]; if (j < 0) continue; const v = []; let z = true;
      for (let q = 0; q < nb; q++) { v.push(R.src[j * nb + q] / 10000); if (R.src[j * nb + q]) z = false; }
      if (z) continue; const x = cs.f(v); if (x != null) vals.push(x); }
    if (vals.length > 20) { const lo = CORE.phanVi(vals, 0.02), hi = CORE.phanVi(vals, 0.98); if (hi > lo) { ST.chiso.khoang[cs.id] = [+lo.toPrecision(3), +hi.toPrecision(3)]; n++; } }
  });
  csDoi(); csVe(); msg(T("đã căn khoảng {n} chỉ số theo khung nhìn, năm {y}", {n, y: ST.nam}), "ok", 3000);
}
$("csTim").oninput = csVeTV;
$("csThu").onclick = csThu; $("csThem").onclick = csThem;
$("csBT").onkeydown = e => { if (e.key === "Enter") { csThem(); e.preventDefault(); } };
$("csCan").onclick = csCan;
$("csMacDinh").onclick = () => { ST.chiso.dung = Object.keys(CS_GOC); ST.chiso.khoang = {}; csDoi(); csVe(); };
$("csDong").onclick = () => $("dlgCS").close();
$("bCurveCS").onclick = csMo;

/* ---------------- ② DEM ---------------- */
CORE.CMAP.dia_hinh = [[34, 139, 84], [120, 190, 100], [233, 231, 160], [214, 174, 104], [168, 108, 64], [128, 96, 84], [245, 245, 245]];
function demL0() {
  const d = MAN && MAN.dem; if (!d) return null;
  return {id: "dem", ten: d.ten || "DEM: độ cao, độ dốc, bóng địa hình", kieu: "dem", duong_dan: d.duong_dan, nam: null};
}
let DEMV = Object.assign({mode: "caobong", lo: null, hi: null}, ls("laymau_hp_demv_v1") || {});
function demHeSo() { return (MAN && MAN.dem && MAN.dem.he_so) || 1; }
function demNodata() { return MAN && MAN.dem && MAN.dem.nodata != null ? MAN.dem.nodata : -32768; }
function demKhoang() {
  const k = (MAN && MAN.dem && MAN.dem.keo_gian) || {};
  return [DEMV.lo != null ? DEMV.lo : (k.lo != null ? k.lo : 0), DEMV.hi != null ? DEMV.hi : (k.hi != null ? k.hi : 50)];
}
/* độ dốc (độ) và bóng địa hình (0..255, nắng từ tây bắc 315°, cao 45°) theo Horn, trên lưới nguồn w × h cỡ ô cs mét */
function demDoc(a, w, h, cs, hs, nod) {
  const n = w * h, doc = new Float32Array(n), bong = new Uint8Array(n), zen = Math.PI / 4, az = (360 - 315 + 90) * Math.PI / 180;
  const z = (x, y) => { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); const v = a[y * w + x]; return v === nod ? null : v * hs; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c0 = z(x, y); if (c0 == null) { doc[y * w + x] = NaN; continue; }
    const g = (dx, dy) => { const v = z(x + dx, y + dy); return v == null ? c0 : v; };
    const A = g(-1, -1), B = g(0, -1), C = g(1, -1), D = g(-1, 0), F = g(1, 0), G = g(-1, 1), H = g(0, 1), I = g(1, 1);
    const dzdx = ((C + 2 * F + I) - (A + 2 * D + G)) / (8 * cs), dzdy = ((G + 2 * H + I) - (A + 2 * B + C)) / (8 * cs);
    const sl = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)), asp = Math.atan2(dzdy, -dzdx);
    doc[y * w + x] = sl * 180 / Math.PI;
    bong[y * w + x] = Math.max(0, Math.min(255, Math.round(255 * (Math.cos(zen) * Math.cos(sl) + Math.sin(zen) * Math.sin(sl) * Math.cos(az - asp)))));
  }
  return {doc, bong};
}
function demRGBA(R, w, h) {                  // ảnh RGBA theo cách hiển thị DEMV (thuần tính toán để kiểm thử)
  const out = new Uint8ClampedArray(w * h * 4), hs = demHeSo(), nod = demNodata(), [lo, hi] = demKhoang(), m = DEMV.mode;
  const G = m === "cao" ? null : demDoc(R.src, R.sw, R.sh, R.rx, hs, nod), lt = lut2("dia_hinh"), ld = lut2("magma");
  for (let k = 0; k < w * h; k++) {
    const j = R.idx[k]; if (j < 0) continue; const v = R.src[j]; if (v === nod) continue;
    const o = k * 4, e = v * hs;
    let c;
    if (m === "doc") c = ld[1 + Math.round(Math.max(0, Math.min(1, G.doc[j] / 30)) * 254)];
    else if (m === "bong") c = [G.bong[j], G.bong[j], G.bong[j]];
    else {
      c = lt[1 + Math.round(Math.max(0, Math.min(1, (e - lo) / (hi - lo || 1))) * 254)];
      if (m === "caobong") { const f = 0.55 + 0.45 * G.bong[j] / 255; c = c.map(x => Math.round(x * f)); }
    }
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  return out;
}
async function demVe(url, bb, w, h, canvas) {
  const R = await readUTM(url, bb, w, h, 1, [0], true); if (!R) return null;
  const px = demRGBA(R, w, h), ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (ctx) { const img = ctx.createImageData(w, h); img.data.set(px); ctx.putImageData(img, 0, 0); }
  return px;
}
const DEMLayer = L.GridLayer.extend({
  initialize(url, opts) { this._url = url; L.GridLayer.prototype.initialize.call(this, opts); },
  createTile(coords, done) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    demVe(this._url, CORE.tileBbox(coords.z, coords.x, coords.y), 256, 256, c).then(() => done(null, c))
      .catch(e => { this._err = (this._err || 0) + 1; if (this._err === 3) olMsg(T("không đọc được {l}: {e}", {l: lname(demL0()), e: e.message || e})); done(null, c); });
    return c;
  },
});
function demUI(div) {
  const [lo, hi] = demKhoang(), opt = (a, s) => a.map(([v, t]) => `<option value="${v}"${v === s ? " selected" : ""}>${t}</option>`).join("");
  div.setAttribute("data-noi18n", "");
  div.innerHTML = `<div class="row sm"><select data-k="mode">${opt([["caobong", T("độ cao + bóng địa hình")], ["cao", T("độ cao")], ["doc", T("độ dốc (0-30°)")], ["bong", T("bóng địa hình")]], DEMV.mode)}</select>
    <span data-cao>${T("thang")} <input type="number" step="any" data-k="lo" value="${lo}" style="width:54px"> .. <input type="number" step="any" data-k="hi" value="${hi}" style="width:54px"> m</span></div>
    <div class="mu sm">${esc((MAN && MAN.dem && MAN.dem.nguon) || "")}. ${T("Mô hình bề mặt: gồm cả nhà và cây, không phải mặt đất trần.")}</div>`;
  const upd = () => { div.querySelector("[data-cao]").hidden = !(DEMV.mode === "cao" || DEMV.mode === "caobong"); };
  div.querySelectorAll("[data-k]").forEach(e => { e.onchange = () => {
    const k = e.dataset.k; DEMV[k] = k === "mode" ? e.value : (e.value === "" ? null : +e.value);
    ls("laymau_hp_demv_v1", DEMV); upd(); if (OVL.dem && OVL.dem.layer && OVL.dem.layer.redraw) OVL.dem.layer.redraw(); }; });
  upd();
}
const DEM_PT = {};
async function demAt(p) {                    // độ cao (m), độ dốc (độ) tại điểm, từ ảnh gốc
  if (!MAN || !MAN.dem) return null;
  const key = p.x + "," + p.y; if (key in DEM_PT) return DEM_PT[key];
  let out = null;
  try {
    const t = await tiffOf(CORE.dataUrl(CFG, MAN.dem.duong_dan)), I = t._imgs[0], ox = t._bb[0], oy = t._bb[3];
    const col = Math.floor((p.x - ox) / I.rx), row = Math.floor((oy - p.y) / I.ry);
    if (col >= 0 && row >= 0 && col < I.w && row < I.h) {
      const c0 = Math.max(0, col - 1), r0 = Math.max(0, row - 1), c1 = Math.min(I.w, col + 2), r1 = Math.min(I.h, row + 2);
      const a = await I.im.readRasters({window: [c0, r0, c1, r1], interleave: true}), sw = c1 - c0, sh = r1 - r0, j = (row - r0) * sw + (col - c0);
      if (a[j] !== demNodata()) { const G = demDoc(a, sw, sh, I.rx, demHeSo(), demNodata()); out = {cao: a[j] * demHeSo(), doc: G.doc[j]}; }
    }
  } catch (e) { out = null; }
  return (DEM_PT[key] = out);
}
const DEM_LUOI = new WeakMap();
async function demLuoi(g) {                  // độ cao, độ dốc trên lưới phân tích g (láng giềng gần nhất từ ảnh DEM)
  if (DEM_LUOI.has(g)) return DEM_LUOI.get(g);
  const N = g.w * g.h, cao = new Float32Array(N).fill(NaN), doc = new Float32Array(N).fill(NaN);
  const url = CORE.dataUrl(CFG, MAN.dem.duong_dan), R = await vgThuLai(() => readUTM(url, g.bb, g.w, g.h, 1, [0], true, true), url);
  if (R) {
    const G = demDoc(R.src, R.sw, R.sh, R.rx, demHeSo(), demNodata());
    for (let i = 0; i < N; i++) { const j = R.idx[i]; if (j < 0 || R.src[j] === demNodata()) continue; cao[i] = R.src[j] * demHeSo(); doc[i] = G.doc[j]; }
  }
  const o = {cao, doc}; DEM_LUOI.set(g, o); return o;
}

/* ---------------- ③ giá trị tại điểm ---------------- */
const GT_CACHE = new Map();
function gtSo(x) { return x == null || !isFinite(x) ? "-" : fmtV(x); }
async function giaTriTai(ll) {               // [[nhãn, giá trị HTML]] của các lớp đang bật, chỉ số, DEM, xã, vùng mẫu, OSM tại một chỗ
  const p = CORE.newPoint("⌖", ll.lng, ll.lat, {bo: ""});
  const on = Object.values(OVL).filter(o => o.on).map(o => o.L0.id).join();
  const key = [LANG, p.x, p.y, ST.nam, on, ST.chiso.dung.join(), JSON.stringify(ST.chiso.khoang), S2V.mode, typeof LSV !== "undefined" ? LSV.mode : "", Object.keys(ST.vung).length].join("|");
  if (GT_CACHE.has(key)) return GT_CACHE.get(key).slice();          // bản 3.2.3: trả bản sao, các lớp bọc thêm dòng không làm bẩn bộ nhớ
  const rows = [];
  if (!VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  const x = VG.xa ? vgXaTai(ll.lng, ll.lat) : null; if (x) rows.push([T("xã, phường"), esc(x.ten)]);
  for (const o of Object.values(OVL).filter(o => o.on)) {
    const L0 = o.L0; if (L0.kieu === "dem" || L0.kieu === "lsd" || L0.kieu === "s2o") continue;          // Landsat (bản 3.0, lsGiaTri), S2 trực tuyến (bản 3.1): dòng riêng
    const y = layerYear(L0, ST.nam);
    if (!y) { rows.push([esc(lname(L0)), `<span class="mu">${T("không có năm {y}", {y: ST.nam})}</span>`]); continue; }
    try {
      if (L0.kieu === "s2d") {
        const d = (await s2dAt(p))[ST.nam];
        rows.push([esc(lname(L0)).split(":")[0] + " " + ST.nam, d ? s2Bang().map((b, i) => `${b} ${d.v[i]}`).join(" · ") : `<span class="mu">${T("không có dữ liệu")}</span>`]);
        continue;
      }
      const v = await pxAt(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), p), ten = esc(lname(L0)) + (y !== ST.nam && y !== -1 ? ` (${y})` : "");
      if (!v || v.every(q => !q)) { rows.push([ten, `<span class="mu">${T("không có dữ liệu")}</span>`]); continue; }
      if (L0.kieu === "lop") {
        const c = (L0.bang_mau || {})[v[0]];
        rows.push([ten, `${c ? `<span class="sw" style="background:${c}"></span> ` : ""}${esc(T((L0.ten_lop || TEN3)[v[0]] || String(v[0])))}`]);
      } else if (L0.kieu === "xam") {
        const kg = L0.keo_gian, pc_ = /^(ls)?pc\d+$/.test(L0.id); rows.push([ten, kg ? gtSo((kg[0] + (v[0] - 1) / 254 * (kg[1] - kg[0])) / (pc_ ? 100 : 1)) + (pc_ ? "" : ` <span class="mu">(${v[0]})</span>`) : String(v[0])]);
      } else {
        const pj = await embPJ(L0), m = /thành phần ([\d-]+)/.exec(L0.ten || ""), tp = m ? m[1].split("-").map(Number) : null;
        rows.push([ten, pj && pj.lo && tp ? tp.map((k, q) => `${k}: ${gtSo(pj.lo[k - 1] + (v[q] - 1) / 254 * (pj.hi[k - 1] - pj.lo[k - 1]))}`).join(" · ") : `R ${v[0]} · G ${v[1]} · B ${v[2]}`]);
      }
    } catch (e) { rows.push([esc(lname(L0)), `<span class="mu">${T("không đọc được: ")}${esc(e.message || e)}</span>`]); }
  }
  if (MAN && MAN.s2d && (MAN.s2d.nam || []).includes(ST.nam)) {
    try { const d = (await s2dAt(p))[ST.nam];
      if (d) rows.push([T("chỉ số {y}", {y: ST.nam}), csDS().map(c => `${esc(c.ten)} <b>${gtSo(csTinh(c, d.v))}</b>`).join(" · ") + ` <button type="button" data-cs title="${T("thêm, bớt chỉ số")}">∑</button>`]);
    } catch (e) { /* không đọc được */ }
  }
  if (MAN && MAN.dem) { const e = await demAt(p); if (e) rows.push(["DEM", `${T("độ cao")} <b>${e.cao.toFixed(1)} m</b> · ${T("độ dốc")} ${e.doc.toFixed(1)}°`]); }
  const vs = Object.values(ST.vung).filter(v => v.nam === ST.nam && v.geom && CORE.pip(ll.lng, ll.lat, vgMP(v.geom)));
  if (vs.length) rows.push([T("vùng mẫu {y}", {y: ST.nam}), vs.map(v => `<span class="sw" style="background:${(IDX.by[v.ma_lop] || {}).mau || "#555"}"></span> ${esc(v.ma_lop)}`).join(", ")]);
  if (typeof OSM !== "undefined" && OSM.lop) {
    const ft = [];
    Object.values(OSM.lop).forEach(L_ => L_.f.forEach(f => { if (f.geometry && /Polygon/.test(f.geometry.type) && CORE.pip(ll.lng, ll.lat, vgMP(f.geometry))) ft.push(f); }));
    if (ft.length) rows.push(["OSM", ft.slice(0, 4).map(f => esc(f.properties.the + (f.properties.ten ? " · " + f.properties.ten : ""))).join("; ")]);
  }
  GT_CACHE.set(key, rows); if (GT_CACHE.size > 200) GT_CACHE.delete(GT_CACHE.keys().next().value);
  return rows.slice();
}
function giaTriHTML(rows) {
  return rows.length ? `<table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>` : `<span class="mu sm">${T("không có lớp nào đang bật")}</span>`;
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-cs]"); if (b) { e.preventDefault(); csMo(); } });
/* dòng đầu khu dải ảnh: thêm bảng giá trị tại điểm đang xem (điểm tra cứu hoặc điểm đang gán) */
let GT_MO = ls("laymau_hp_gtmo_v1"); if (GT_MO === null) GT_MO = true;
const _vzNguonGoc = vzNguon;
vzNguon = function () {
  _vzNguonGoc();
  const b = $("vzNguon"), p = vizPt(); if (!b || !p || !MAN) return;
  const d = document.createElement("details"); d.className = "gt-tai"; d.open = GT_MO; d.style.flexBasis = "100%";
  d.innerHTML = `<summary>${T("giá trị tại điểm")} <span class="mu sm">(${T("năm {y}", {y: ST.nam})})</span></summary><div data-gt><span class="mu sm">${T("đang đọc giá trị tại điểm…")}</span></div>`;
  d.addEventListener("toggle", () => { GT_MO = d.open; ls("laymau_hp_gtmo_v1", GT_MO); });
  b.appendChild(d);
  const tok = (vzNguon.tok = (vzNguon.tok || 0) + 1);
  giaTriTai(L.latLng(p.lat, p.lon)).then(rows => { if (tok === vzNguon.tok) d.querySelector("[data-gt]").innerHTML = giaTriHTML(rows); })
    .catch(e => { d.querySelector("[data-gt]").textContent = T("không đọc được: ") + (e.message || e); });
};
const _refreshOvl24 = refreshOverlays;
refreshOverlays = function () { _refreshOvl24(); if (typeof vzNguon === "function" && $("vzNguon")) vzNguon(); };
