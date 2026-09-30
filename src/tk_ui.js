/* =============================== BẢN 2.7: PHƯƠNG ÁN LỚP PHỦ, THỐNG KÊ, SO SÁNH =============================== */
/* Phương án = một bản đồ lớp dùng được cho phân tích: các lớp "lop" của bộ dữ liệu (bản đồ riêng của luận án, lớp phủ toàn cầu
   DW, ESRI, WorldCover, GLC_FCS30D), bản đồ tạo trong trang từ điểm mẫu, và GeoTIFF bản đồ lớp của người dùng (nhập từ máy).
   Thống kê theo chú giải gốc, chú giải chung 7 lớp hoặc hệ 3 lớp; ma trận đồng thuận và kappa giữa hai bản đồ; theo xã; CSV, GeoTIFF.
   Bản đồ tạo và nhập lưu trong IndexedDB của trình duyệt và đi kèm tệp tiến độ (mã hoá loạt chạy). */
const CHUNG27 = {1: "nước", 2: "cây gỗ, rừng", 3: "cây trồng", 4: "cỏ, cây bụi", 5: "ngập nước có thực vật", 6: "xây dựng", 7: "đất trống"};
const CHUNG_MAU = {1: "#419bdf", 2: "#397d49", 3: "#e49635", 4: "#c9c26b", 5: "#7a87c6", 6: "#c4281b", 7: "#a59b8f"};
const CHUNG_N3 = {1: 2, 2: 1, 3: 1, 4: 1, 5: 0, 6: 3, 7: 0};
const BA_MAU = {1: "#2e9d3a", 2: "#1f5fbf", 3: "#d7191c"};
const CHUNG_HE = {N1: 1, N2: 1, N3: 1, T1: 3, T2: 3, T3: 2, T4: 2, T5: 5, X1: 6, X2: 6, X3: 6, X4: 6, D1: 7, D2: 7, D3: 7};
const PA = {rieng: [], xong: false};
const tk$ = id => document.getElementById(id);
const TK = {kq: null, hien: null, nhap: null};

/* ---------- quy đổi ---------- */
function paHe3(ma) { const v = IDX.lop3(ma); return v >= 1 && v <= 3 ? v : 0; }
function paLopTuTen(ten) {                     // đoán quy đổi từ tên lớp (bản đồ trong manifest không ghi bảng quy đổi)
  const t = CORE.khongDau(String(ten || ""));
  const m = /^([ntxd]\d)\b/.exec(t); if (m) { const ma = m[1].toUpperCase(); if (IDX.by[ma]) return {chung: CHUNG_HE[ma] || 0, n3: paHe3(ma)}; }
  if (/^thuc vat$/.test(t)) return {chung: 0, n3: 1};
  if (/^nuoc$|mat nuoc|song|ao|ho\b/.test(t)) return {chung: 1, n3: 2};
  if (/xay dung|do thi|dan cu|cong nghiep/.test(t)) return {chung: 6, n3: 3};
  if (/rung ngap man|ngap/.test(t)) return {chung: 5, n3: 0};
  if (/rung|cay go|cay lau nam/.test(t)) return {chung: 2, n3: 1};
  if (/lua|cay trong|canh tac|hang nam/.test(t)) return {chung: 3, n3: 1};
  if (/co|cay bui/.test(t)) return {chung: 4, n3: 1};
  if (/dat trong|cat|da\b/.test(t)) return {chung: 7, n3: 0};
  return {chung: 0, n3: 0};
}
function paLopMan(L0) {
  const ten = L0.ten_lop || TEN3, mau = L0.bang_mau || {}, out = {};
  Object.keys(Object.assign({}, ten, mau)).forEach(k => { const v = +k; if (!(v > 0)) return;
    const d = paLopTuTen(ten[k]);
    out[v] = {ten: ten[k] || String(v), mau: mau[k] || "#999999", chung: L0.chung && L0.chung[k] != null ? +L0.chung[k] : d.chung, n3: L0.nhom3 && L0.nhom3[k] != null ? +L0.nhom3[k] : d.n3}; });
  return out;
}
function paDS() {                              // mọi phương án: bộ dữ liệu trước, rồi bản đồ riêng
  const m = MAN ? MAN.layers.filter(l => l.kieu === "lop").map(L0 => ({id: "man:" + L0.id, nguon: L0.nhom === "lulc_tg" ? "tg" : "man", L0, nam: L0.nam.slice(), lop: paLopMan(L0)})) : [];
  return m.concat(PA.rieng);
}
function paTen(pa) { return pa.L0 ? lname(pa.L0) : pa.ten; }
function paLopTen(pa, v) { const c = pa.lop[v]; return c ? T(c.ten) : String(v); }
async function paDoc(pa, g, y) {               // giá trị gốc trên lưới g (láng giềng gần nhất), null nếu không có
  if (pa.L0) {
    if (!pa.L0.nam.includes(y)) return null;
    const url = CORE.dataUrl(CFG, pa.L0.duong_dan.replace("{y}", y)), r = await vgThuLai(() => readBox(url, g.bb, g.w, g.h, true), url);
    return r ? (r.n === 1 ? r.data : r.data.filter((_, i) => i % r.n === 0)) : null;
  }
  const s = pa.du[y] || (pa.nam ? null : Object.values(pa.du)[0]); if (!s) return null;
  const out = new Uint8Array(g.w * g.h), ci = new Int32Array(g.w);
  for (let i = 0; i < g.w; i++) { const c = Math.floor((g.x0 + (i + 0.5) * g.res - s.g0.x0) / s.g0.res); ci[i] = c >= 0 && c < s.g0.w ? c : -1; }
  for (let j = 0; j < g.h; j++) {
    const r = Math.floor((s.g0.y1 - (g.y1 - (j + 0.5) * g.res)) / s.g0.res); if (r < 0 || r >= s.g0.h) continue;
    for (let i = 0; i < g.w; i++) if (ci[i] >= 0) out[j * g.w + i] = s.data[r * s.g0.w + ci[i]];
  }
  return out;
}
function paBang(pa, che) {                     // bảng tra 256 giá trị gốc -> mã chú giải
  const b = new Uint8Array(256);
  Object.entries(pa.lop).forEach(([v, c]) => { b[+v] = che === "goc" ? +v : che === "chung" ? (c.chung || 0) : (c.n3 || 0); });
  return b;
}
function tkChuGiai(che, pa) {                  // [{ma, ten, mau}] của chú giải
  if (che === "chung") return Object.keys(CHUNG27).map(k => ({ma: +k, ten: T(CHUNG27[k]), mau: CHUNG_MAU[k]}));
  if (che === "3") return [1, 2, 3].map(k => ({ma: k, ten: T(TEN3[k]), mau: BA_MAU[k]}));
  return Object.keys(pa.lop).map(Number).sort((a, b) => a - b).map(v => ({ma: v, ten: paLopTen(pa, v), mau: pa.lop[v].mau}));
}

/* ---------- lưu bản đồ riêng: IndexedDB, tệp tiến độ (mã hoá loạt chạy) ---------- */
function paDB() {
  return new Promise((ok, no) => { if (!window.indexedDB) { no(new Error("IndexedDB")); return; }
    const r = indexedDB.open("laymauPA", 1); r.onupgradeneeded = () => r.result.createObjectStore("pa"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
}
async function paLuuDB(pa, xoa) {
  try { const db = await paDB(); await new Promise((ok, no) => { const t = db.transaction("pa", "readwrite"); if (xoa) t.objectStore("pa").delete(pa.id); else t.objectStore("pa").put(pa, pa.id);
    t.oncomplete = ok; t.onerror = () => no(t.error); }); } catch (e) { /* trình duyệt không cho lưu: vẫn dùng trong phiên */ }
}
async function paNapDB() {
  try { const db = await paDB(); const all = await new Promise((ok, no) => { const q = db.transaction("pa").objectStore("pa").getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
    all.forEach(pa => { if (!PA.rieng.some(q => q.id === pa.id)) PA.rieng.push(pa); }); } catch (e) { /* không có IndexedDB */ }
  PA.xong = true; tkVeDS();
}
function paThem(pa) { PA.rieng = PA.rieng.filter(q => q.id !== pa.id).concat([pa]); paLuuDB(pa); tkVeDS(); document.dispatchEvent(new CustomEvent("pa27")); }
function paXoa(id) { const pa = PA.rieng.find(q => q.id === id); if (!pa) return; PA.rieng = PA.rieng.filter(q => q.id !== id); paLuuDB(pa, true); tkVeDS(); }
function rleMa(a) { const o = []; let v = a[0], n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === v) n++; else { o.push(v, n); v = a[i]; n = 1; } } o.push(v, n); return o; }
function rleGiai(o, N) { const a = new Uint8Array(N); let p = 0; for (let k = 0; k < o.length; k += 2) { a.fill(o[k], p, p + o[k + 1]); p += o[k + 1]; } return a; }
const _phienXuat27 = phienXuat;
phienXuat = function () {
  const j = _phienXuat27();
  j.pa_rieng = PA.rieng.map(pa => Object.assign({}, pa, {du: Object.fromEntries(Object.entries(pa.du).map(([y, s]) => [y, {g0: s.g0, rle: rleMa(s.data)}]))}));
  return j;
};
const _phienNhap27 = phienNhap;
phienNhap = async function (j) {
  (j.pa_rieng || []).forEach(pa => { try {
    pa.du = Object.fromEntries(Object.entries(pa.du).map(([y, s]) => [y, {g0: s.g0, data: rleGiai(s.rle, s.g0.w * s.g0.h)}]));
    PA.rieng = PA.rieng.filter(q => q.id !== pa.id).concat([pa]); paLuuDB(pa); } catch (e) { /* bỏ bản hỏng */ } });
  tkVeDS();
  return _phienNhap27(j);
};

/* ---------- GeoTIFF: xuất (EPSG:3857, bản 2.8: v28TifLop có nodata, bảng màu, QML) và nhập bản đồ lớp của người dùng ---------- */
const VN2000 = "+towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278";
function paProj(e) {                           // chuỗi proj4 của mã EPSG hay gặp ở Việt Nam
  if (e === 4326 || e === 4979) return "EPSG:4326";
  if (e === 3857 || e === 900913 || e === 3785) return "EPSG:3857";
  if (e >= 32601 && e <= 32660) return `+proj=utm +zone=${e - 32600} +datum=WGS84 +units=m +no_defs`;
  if (e >= 32701 && e <= 32760) return `+proj=utm +zone=${e - 32700} +south +datum=WGS84 +units=m +no_defs`;
  if (e === 3405 || e === 3406) return `+proj=utm +zone=${e === 3405 ? 48 : 49} +ellps=WGS84 ${VN2000} +units=m +no_defs`;
  if (e === 4756) return `+proj=longlat +ellps=WGS84 ${VN2000} +no_defs`;
  throw new Error(T("chưa hỗ trợ hệ toạ độ EPSG:{e}: hãy lưu lại bản đồ theo WGS84, UTM, VN-2000 hoặc EPSG:3857", {e}));
}
async function paDocTif(buf, ten) {            // -> bản đồ trên lưới 3857 (chưa lưu) + danh sách giá trị, màu gợi ý
  const tif = await GeoTIFF.fromArrayBuffer(buf), im = await tif.getImage(), gk = im.getGeoKeys() || {};
  const e = gk.ProjectedCSTypeGeoKey && gk.ProjectedCSTypeGeoKey !== 32767 ? gk.ProjectedCSTypeGeoKey : gk.GeographicTypeGeoKey;
  if (!e) throw new Error(T("ảnh không có hệ toạ độ (GeoTIFF thiếu khoá địa lý)"));
  const def = paProj(e), w = im.getWidth(), h = im.getHeight(), bb = im.getBoundingBox();
  const toM = proj4(def, "EPSG:3857"), toS = proj4("EPSG:3857", def);
  const goc = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]], [(bb[0] + bb[2]) / 2, bb[1]], [(bb[0] + bb[2]) / 2, bb[3]], [bb[0], (bb[1] + bb[3]) / 2], [bb[2], (bb[1] + bb[3]) / 2]].map(q => toM.forward(q));
  const mb = [Math.min(...goc.map(q => q[0])), Math.min(...goc.map(q => q[1])), Math.max(...goc.map(q => q[0])), Math.max(...goc.map(q => q[1]))];
  let res = Math.max((mb[2] - mb[0]) / w, (mb[3] - mb[1]) / h);
  while (Math.ceil((mb[2] - mb[0]) / res) * Math.ceil((mb[3] - mb[1]) / res) > 16e6) res *= 1.25;
  const g0 = {x0: mb[0], y1: mb[3], res, w: Math.ceil((mb[2] - mb[0]) / res), h: Math.ceil((mb[3] - mb[1]) / res)};
  let rw = w, rh = h; while (rw * rh > 64e6) { rw = Math.ceil(rw / 2); rh = Math.ceil(rh / 2); }
  const src = await im.readRasters({samples: [0], interleave: true, width: rw, height: rh, resampleMethod: "nearest"});
  const nd = im.getGDALNoData(), sx = (bb[2] - bb[0]) / rw, sy = (bb[3] - bb[1]) / rh;
  const dem = new Map(); for (let i = 0; i < src.length; i += 7) { const v = src[i]; if (v && v !== nd) dem.set(v, (dem.get(v) || 0) + 1); }
  if (dem.size > 250) throw new Error(T("ảnh có hơn 250 giá trị khác nhau: không phải bản đồ lớp"));
  const gia = [...dem.keys()].sort((a, b) => a - b), ma = new Map(); gia.forEach((v, k) => ma.set(v, v >= 1 && v <= 255 && Number.isInteger(v) && gia.every(q => q <= 255) ? v : k + 1));
  const data = new Uint8Array(g0.w * g0.h), B = 16;                // toạ độ nguồn nội suy trên lưới thưa 16 điểm ảnh
  const nx = Math.ceil(g0.w / B) + 1, ny = Math.ceil(g0.h / B) + 1, LX = new Float64Array(nx * ny), LY = new Float64Array(nx * ny);
  for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) { const q = toS.forward([g0.x0 + Math.min(a * B, g0.w) * res, g0.y1 - Math.min(b * B, g0.h) * res]); LX[b * nx + a] = q[0]; LY[b * nx + a] = q[1]; }
  for (let j = 0; j < g0.h; j++) {
    const b = Math.floor((j + 0.5) / B), fb = ((j + 0.5) - b * B) / B;
    for (let i = 0; i < g0.w; i++) {
      const a = Math.floor((i + 0.5) / B), fa = ((i + 0.5) - a * B) / B, k0 = b * nx + a;
      const X = (1 - fb) * ((1 - fa) * LX[k0] + fa * LX[k0 + 1]) + fb * ((1 - fa) * LX[k0 + nx] + fa * LX[k0 + nx + 1]);
      const Y = (1 - fb) * ((1 - fa) * LY[k0] + fa * LY[k0 + 1]) + fb * ((1 - fa) * LY[k0 + nx] + fa * LY[k0 + nx + 1]);
      const c = Math.floor((X - bb[0]) / sx), r = Math.floor((bb[3] - Y) / sy);
      if (c < 0 || r < 0 || c >= rw || r >= rh) continue;
      const v = src[r * rw + c]; if (v && v !== nd) data[j * g0.w + i] = ma.get(v) || 0;
    }
  }
  const cm = im.fileDirectory.ColorMap, n = cm ? cm.length / 3 : 0, hx = x => Math.round(x / 257).toString(16).padStart(2, "0");
  const lop = {}; gia.forEach(v => { const m = ma.get(v);
    const mau = cm && v < n ? "#" + hx(cm[v]) + hx(cm[n + v]) + hx(cm[2 * n + v]) : ["#2e9d3a", "#1f5fbf", "#d7191c", "#e49635", "#a59b8f", "#7a87c6", "#397d49", "#c9c26b"][(m - 1) % 8];
    lop[m] = {ten: T("lớp {v}", {v}), mau, chung: 0, n3: 0, goc: v}; });
  const ynam = /(19|20)\d{2}/.exec(ten || ""), epsg = e;
  return {g0, data, lop, nam: ynam ? +ynam[0] : ST.nam, epsg, ten: String(ten || "").replace(/\.(tiff?|TIF+)$/, "")};
}
const TK_UNG = () => [["", T("(không quy đổi)")]].concat([1, 2, 3].map(k => ["3:" + k, T("3 lớp") + ": " + T(TEN3[k])]),
  Object.keys(CHUNG27).map(k => ["c:" + k, T("chung") + ": " + T(CHUNG27[k])]), (SCHEME.lop || []).map(c => ["h:" + c.ma, `${c.ma} ${cten(c)}`]));
function tkUngVoi(s, c) {                       // lựa chọn "ứng với" -> chung, n3 (và tên, màu theo hệ lớp)
  const [k, v] = s.split(":"); c.ung = s;
  if (k === "3") { c.n3 = +v; c.chung = {1: 0, 2: 1, 3: 6}[v]; }
  else if (k === "c") { c.chung = +v; c.n3 = CHUNG_N3[v]; }
  else if (k === "h") { c.chung = CHUNG_HE[v] || 0; c.n3 = paHe3(v); c.ten = `${v} ${cten(IDX.by[v])}`; c.mau = IDX.by[v].mau; c.he = v; }
  else { c.chung = 0; c.n3 = 0; }
}
async function tkNhapTep(f) {
  const tt = tk$("tkNhapTT"); tt.textContent = T("đang đọc {f}…", {f: f.name});
  try {
    const buf = f.arrayBuffer ? await f.arrayBuffer() : await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => no(fr.error); fr.readAsArrayBuffer(f); });
    const r = await paDocTif(buf, f.name); TK.nhap = r;
    const vs = Object.keys(r.lop).map(Number), cac = vs.map(v => r.lop[v].goc);
    Object.values(r.lop).forEach(c => {       // đoán: mã trùng id hệ lớp (11 = N1...) hoặc 1..3 là hệ 3 lớp
      const h = (SCHEME.lop || []).find(q => q.id === c.goc);
      if (h) tkUngVoi("h:" + h.ma, c); else if (cac.every(q => q >= 1 && q <= 3)) { tkUngVoi("3:" + c.goc, c); c.ten = TEN3[c.goc]; }
    });
    tkVeNhap(); tt.textContent = T("{w} × {h} điểm ảnh, EPSG:{e}, {n} lớp: đặt tên, quy đổi rồi lưu", {w: r.g0.w, h: r.g0.h, e: r.epsg, n: vs.length});
  } catch (e) { TK.nhap = null; tk$("tkNhapBang").innerHTML = ""; tt.textContent = T("lỗi: ") + (e.message || e); }
}
function tkVeNhap() {
  const r = TK.nhap, box = tk$("tkNhapBang"); if (!r) { box.innerHTML = ""; return; }
  const op = TK_UNG();
  box.innerHTML = `<div class="vg-o"><span>${T("Tên")}</span><input id="tkNhapTen" type="text" value="${esc(r.ten)}"><span>${T("Năm")}</span><input id="tkNhapNam" type="number" value="${r.nam}" style="width:80px"></div>` +
    `<table><tr><th>${T("giá trị")}</th><th>${T("màu")}</th><th>${T("tên lớp")}</th><th>${T("ứng với")}</th></tr>` +
    Object.entries(r.lop).map(([m, c]) => `<tr data-m="${m}"><td>${c.goc}</td><td><input type="color" value="${c.mau}" data-k="mau"></td><td><input type="text" value="${esc(T(c.ten))}" data-k="ten" style="width:130px"></td>` +
      `<td><select data-k="ung">${op.map(([v, t]) => `<option value="${v}"${v === (c.ung || "") ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></td></tr>`).join("") +
    `</table><div class="row"><button id="tkNhapLuu" type="button" class="on">${T("Lưu thành phương án")}</button><button id="tkNhapHuy" type="button">${T("Bỏ")}</button></div>`;
  box.querySelectorAll("tr[data-m]").forEach(tr => { const c = r.lop[tr.dataset.m];
    tr.querySelector('[data-k="mau"]').oninput = e => { c.mau = e.target.value; };
    tr.querySelector('[data-k="ten"]').oninput = e => { c.ten = e.target.value; };
    tr.querySelector('[data-k="ung"]').onchange = e => { tkUngVoi(e.target.value, c); tkVeNhap(); }; });
  tk$("tkNhapLuu").onclick = () => {
    const nam = +tk$("tkNhapNam").value || null;
    paThem({id: "nhap_" + Date.now().toString(36), ten: tk$("tkNhapTen").value || r.ten, nguon: "nhap", nam: nam ? [nam] : null, lop: r.lop, du: {[nam || 0]: {g0: r.g0, data: r.data}}, tao_luc: new Date().toISOString()});
    TK.nhap = null; box.innerHTML = ""; tk$("tkNhapTT").textContent = T("đã lưu phương án");
  };
  tk$("tkNhapHuy").onclick = () => { TK.nhap = null; box.innerHTML = ""; tk$("tkNhapTT").textContent = ""; };
}

/* ---------- bảng thống kê ---------- */
function tkVeDS() {
  const box = tk$("tkPA"); if (!box) return;
  const chon = new Set(TK.chon || ls("laymau_hp_tk_pa_v1") || []), ds = paDS();
  box.innerHTML = ds.map(pa => `<label style="display:block"><input type="checkbox" value="${esc(pa.id)}"${chon.has(pa.id) ? " checked" : ""}> ${esc(paTen(pa))} ` +
    `<span class="mu">${pa.nam ? pa.nam.join(", ") : ""}${pa.nguon === "tg" ? " · " + T("toàn cầu") : pa.nguon === "man" ? " · " + T("bộ dữ liệu") : pa.nguon === "tao" ? " · " + T("tạo từ điểm mẫu") : " · " + T("nhập")}</span>` +
    (pa.L0 ? "" : ` <button type="button" data-xoa="${esc(pa.id)}" title="${T("xoá phương án này khỏi trình duyệt")}">×</button>`) + `</label>`).join("") || `<span class="mu">${T("chưa có phương án nào")}</span>`;
  box.querySelectorAll("input").forEach(i => { i.onchange = () => { TK.chon = [...box.querySelectorAll("input:checked")].map(x => x.value); ls("laymau_hp_tk_pa_v1", TK.chon); tkVeNam(); }; });
  box.querySelectorAll("[data-xoa]").forEach(b => { b.onclick = e => { e.preventDefault(); if (confirm(T("Xoá phương án này khỏi trình duyệt?"))) paXoa(b.dataset.xoa); }; });
  tkVeNam();
}
function tkVeNam() {
  const box = tk$("tkNam"); if (!box) return;
  const chon = new Set(TK.chon || ls("laymau_hp_tk_pa_v1") || []), ys = new Set();
  paDS().filter(pa => chon.has(pa.id)).forEach(pa => (pa.nam || []).forEach(y => ys.add(y)));
  const cu = new Set([...box.querySelectorAll("input:checked")].map(i => +i.value));
  box.innerHTML = [...ys].sort((a, b) => a - b).map(y => `<label><input type="checkbox" value="${y}"${!cu.size || cu.has(y) ? " checked" : ""}> ${y}</label>`).join(" ") || `<span class="mu">${T("chọn phương án trước")}</span>`;
}
async function tkMo(on) {
  const P = tk$("tkP"); P.hidden = on === false ? true : (on === true ? false : !P.hidden);
  if (P.hidden) return;
  if (!VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  tk$("tkXa").innerHTML = v27DSXa(); tk$("tkVung").innerHTML = v27DSVung();
  tkVeDS(); tkHien();
  if (TK.kq) { TK.kq.cot.forEach(c => { c.cg = tkChuGiai(TK.kq.che, c.pa); }); tkVeKQ(); }
}
function tkHien() { const pv = tk$("tkPV").value; tk$("tkXaW").hidden = pv !== "xa"; tk$("tkVungW").hidden = pv !== "vung"; }
async function tkChay() {
  const tt = tk$("tkTT"), che = tk$("tkCG").value;
  try {
    const ids = [...tk$("tkPA").querySelectorAll("input:checked")].map(i => i.value), nam = [...tk$("tkNam").querySelectorAll("input:checked")].map(i => +i.value);
    const ds = paDS().filter(pa => ids.includes(pa.id)); if (!ds.length) throw new Error(T("chọn ít nhất một phương án"));
    const PV = v27PhamVi(tk$("tkPV").value, [...tk$("tkXa").selectedOptions].map(o => +o.value), tk$("tkVung").value);
    const g = CORE.gridFor(PV.bb, +tk$("tkLuoi").value || 900, {x0: 0, y1: 0, res0: 10}), N = g.w * g.h;
    const vung = PV.mp ? CORE.rasterizeRings(CORE.polysToPixRings(g, PV.mp), g.w, g.h) : null, ra = CORE.rowArea(g), cot = [];
    for (const pa of ds) for (const y of (pa.nam ? pa.nam.filter(q => nam.includes(q)) : [null])) {
      tt.textContent = T("đang đọc {t} {y}…", {t: paTen(pa), y: y || ""});
      const raw = await paDoc(pa, g, y); if (!raw) continue;
      const b = paBang(pa, che), ma = new Uint8Array(N), co = new Uint8Array(N), dt = {}; let tong = 0, loai = 0;
      for (let j = 0; j < g.h; j++) { const a = ra[j] / 1e4; for (let i = j * g.w, e = i + g.w; i < e; i++) {
        if ((vung && !vung[i]) || !raw[i]) continue; const c = b[raw[i]]; tong += a; co[i] = 1;
        if (c) { ma[i] = c; dt[c] = (dt[c] || 0) + a; } else loai += a; } }
      cot.push({pa, y, ma, co, dt, tong, loai, cg: tkChuGiai(che, pa)});
    }
    if (tk$("tkP").hidden) return;
    if (!cot.length) throw new Error(T("các phương án đã chọn không có dữ liệu trong phạm vi và các năm này"));
    TK.kq = {g, PV, vung, cot, che, xaIdx: VG.xa ? vgXaIdx(g) : null, ra};
    tk$("tkKQ").hidden = false; tkVeKQ(); tt.textContent = T("xong: {n} bản đồ, lưới {w} × {h}, ô {r} m", {n: cot.length, w: g.w, h: g.h, r: (g.res * Math.cos(map.getCenter().lat * Math.PI / 180)).toFixed(0)});
  } catch (e) { tt.textContent = T("lỗi: ") + (typeof vgLoiDoc === "function" ? vgLoiDoc(e) : (e.message || e)); }
  TIFF_PT.clear();
}
const tkTenCot = c => paTen(c.pa) + (c.y ? " " + c.y : "");
function tkCGChung(K) { return K.che === "goc" ? null : tkChuGiai(K.che); }
function tkVeKQ() {
  const K = TK.kq; if (!K) return;
  const opt = K.cot.map((c, k) => `<option value="${k}">${esc(tkTenCot(c))}</option>`).join("");
  ["tkCotXa", "tkCotA", "tkCotB", "tkCotXem"].forEach(id => { const s = tk$(id), v = s.value; s.innerHTML = opt; if (v && +v < K.cot.length) s.value = v; });
  if (K.cot.length > 1 && tk$("tkCotB").value === tk$("tkCotA").value) tk$("tkCotB").value = "1";
  tkBangDT(); tkBieuDo(); tkTheoXa(); tkDongThuan(); tkQuyDoi();
}
function tkBangDT() {
  const K = TK.kq, CG = tkCGChung(K), p = (v, t) => t ? (100 * v / t).toFixed(1) : "0.0"; let h = "";
  if (CG) {
    h = `<table><tr><th>${T("lớp")}</th>` + K.cot.map(c => `<th>${esc(tkTenCot(c))}</th>`).join("") + `</tr>` +
      CG.map(l => `<tr><td><i class="sw" style="background:${l.mau}"></i> ${esc(l.ten)}</td>` + K.cot.map(c => `<td>${(c.dt[l.ma] || 0).toFixed(1)}<span class="mu"> ${p(c.dt[l.ma] || 0, c.tong - c.loai)} %</span></td>`).join("") + `</tr>`).join("") +
      `<tr><td>${T("không quy đổi được")}</td>` + K.cot.map(c => `<td class="mu">${c.loai.toFixed(1)}</td>`).join("") + `</tr>` +
      `<tr><th>${T("tổng có dữ liệu")}</th>` + K.cot.map(c => `<th>${c.tong.toFixed(1)}</th>`).join("") + `</tr></table>`;
  } else h = K.cot.map(c => `<p><b>${esc(tkTenCot(c))}</b> · ${c.tong.toFixed(1)} ${T("ha")}</p><table>` + c.cg.filter(l => c.dt[l.ma]).map(l =>
    `<tr><td><i class="sw" style="background:${l.mau}"></i> ${l.ma} ${esc(l.ten)}</td><td>${c.dt[l.ma].toFixed(1)} ${T("ha")}</td><td>${p(c.dt[l.ma], c.tong)} %</td></tr>`).join("") + `</table>`).join("");
  tk$("tkBang").innerHTML = `<p class="mu sm">${T("Diện tích (ha) trong phạm vi {v}; % tính trên phần quy đổi được của từng bản đồ.", {v: esc(v27TenPV(K.PV))})}</p>` + h;
}
function tkBieuDo() {
  const K = TK.kq, W = 420, bh = 16, H = 14 + K.cot.length * (bh + 6);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  K.cot.forEach((c, r) => { const y = 6 + r * (bh + 6), t = Object.values(c.dt).reduce((a, b) => a + b, 0) || 1; let x = 150;
    s += `<text x="4" y="${y + 12}" font-size="10">${esc(tkTenCot(c).slice(0, 26))}</text>`;
    c.cg.forEach(l => { const w = 260 * (c.dt[l.ma] || 0) / t; if (w <= 0) return; s += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${bh}" fill="${l.mau}"><title>${esc(l.ten)}: ${(100 * (c.dt[l.ma] || 0) / t).toFixed(1)} %</title></rect>`; x += w; }); });
  s += "</svg>";
  const CG = tkCGChung(K); let s2 = "";
  if (CG) {                                   // diện tích từng lớp theo năm, mỗi bản đồ một đường
    const lop = +(tk$("tkLopBD").value || CG[0].ma), nhom = {};
    K.cot.forEach(c => { if (c.y) (nhom[c.pa.id] = nhom[c.pa.id] || {pa: c.pa, d: []}).d.push([c.y, c.dt[lop] || 0]); });
    const L_ = Object.values(nhom).filter(n => n.d.length > 1);
    if (L_.length) {
      const ys = [].concat(...L_.map(n => n.d.map(q => q[0]))), y0 = Math.min(...ys), y1 = Math.max(...ys), mx = Math.max(...[].concat(...L_.map(n => n.d.map(q => q[1]))), 1);
      const X = y => 40 + (y1 > y0 ? (y - y0) / (y1 - y0) : 0.5) * 360, Y = v => 150 - 130 * v / mx, mau = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];
      s2 = `<svg viewBox="0 0 ${W} 175" xmlns="http://www.w3.org/2000/svg"><text x="4" y="12" font-size="10">${T("ha")}</text><text x="4" y="24" font-size="9" fill="#667085">${mx.toFixed(0)}</text>`;
      for (let y = y0; y <= y1; y++) s2 += `<text x="${X(y).toFixed(1)}" y="168" font-size="9" text-anchor="middle" fill="#667085">${y}</text>`;
      L_.forEach((n, k) => { n.d.sort((a, b) => a[0] - b[0]); s2 += `<polyline points="${n.d.map(q => X(q[0]).toFixed(1) + "," + Y(q[1]).toFixed(1)).join(" ")}" fill="none" stroke="${mau[k % 6]}" stroke-width="2"/>` +
        n.d.map(q => `<circle cx="${X(q[0]).toFixed(1)}" cy="${Y(q[1]).toFixed(1)}" r="2.5" fill="${mau[k % 6]}"><title>${esc(paTen(n.pa))} ${q[0]}: ${q[1].toFixed(1)} ${T("ha")}</title></circle>`).join("") +
        `<text x="${W - 4}" y="${14 + 11 * k}" font-size="9" text-anchor="end" fill="${mau[k % 6]}">${esc(paTen(n.pa).slice(0, 30))}</text>`; });
      s2 += "</svg>";
    }
    const sl = tk$("tkLopBD"), v = sl.value; sl.innerHTML = CG.map(l => `<option value="${l.ma}">${esc(l.ten)}</option>`).join(""); sl.value = v || String(CG[0].ma); sl.parentElement.hidden = false;
  } else tk$("tkLopBD").parentElement.hidden = true;
  tk$("tkBD").innerHTML = `<p class="mu sm">${T("Cơ cấu lớp phủ của từng bản đồ (100 % = phần quy đổi được)")}</p>` + s +
    (s2 ? `<p class="mu sm">${T("Diện tích lớp đã chọn theo năm")}</p>` + s2 : "");
}
function tkTheoXa() {
  const K = TK.kq, box = tk$("tkXaBang"); if (!K.xaIdx) { box.innerHTML = `<p class="mu sm">${T("chưa có ranh giới xã")}</p>`; return; }
  const c = K.cot[+tk$("tkCotXa").value || 0], acc = {}, g = K.g;
  for (let j = 0; j < g.h; j++) { const a = K.ra[j] / 1e4; for (let i = j * g.w, e = i + g.w; i < e; i++) { const x = K.xaIdx[i], v = c.ma[i]; if (!x || !v) continue; const o = acc[x] || (acc[x] = {}); o[v] = (o[v] || 0) + a; } }
  const lop = c.cg.filter(l => Object.values(acc).some(o => o[l.ma]));
  const rows = Object.entries(acc).map(([x, o]) => ({ten: (VG.xa.find(q => q.i === +x) || {}).ten || x, o, t: Object.values(o).reduce((a, b) => a + b, 0)})).sort((a, b) => b.t - a.t);
  TK.xaRows = {c, lop, rows};
  box.innerHTML = `<table><tr><th>${T("xã, phường")}</th>` + lop.map(l => `<th><i class="sw" style="background:${l.mau}"></i> ${esc(l.ten)}</th>`).join("") + `<th>${T("tổng")}</th></tr>` +
    rows.slice(0, 200).map(r => `<tr><td>${esc(r.ten)}</td>` + lop.map(l => `<td>${(r.o[l.ma] || 0).toFixed(1)}</td>`).join("") + `<td>${r.t.toFixed(1)}</td></tr>`).join("") + `</table>`;
}
function tkDongThuan() {
  const K = TK.kq, box = tk$("tkDT"); if (K.cot.length < 2) { box.innerHTML = `<p class="mu sm">${T("cần ít nhất hai bản đồ")}</p>`; return; }
  const A = K.cot[+tk$("tkCotA").value || 0], B = K.cot[+tk$("tkCotB").value || 1], g = K.g;
  const la = A.cg.map(l => l.ma), lb = B.cg.map(l => l.ma), ia = {}, ib = {}; la.forEach((v, k) => { ia[v] = k; }); lb.forEach((v, k) => { ib[v] = k; });
  const M = la.map(() => new Float64Array(lb.length)); let tong = 0;
  for (let j = 0; j < g.h; j++) { const a = K.ra[j] / 1e4; for (let i = j * g.w, e = i + g.w; i < e; i++) { const u = A.ma[i], v = B.ma[i]; if (!u || !v || ia[u] == null || ib[v] == null) continue; M[ia[u]][ib[v]] += a; tong += a; } }
  const cung = K.che !== "goc" || (A.pa === B.pa);
  let h = `<p class="mu sm">${T("Hàng: {a}; cột: {b}; ô: ha trên phần cả hai bản đồ đều có lớp quy đổi được.", {a: esc(tkTenCot(A)), b: esc(tkTenCot(B))})}</p>`;
  if (cung) {
    const k = kappa27(M), rs = M.map(r => r.reduce((s, v) => s + v, 0)), cs = lb.map((_, j) => M.reduce((s, r) => s + r[j], 0));
    h += `<p><b>${T("Trùng khớp {oa} % diện tích, kappa {k}", {oa: (100 * k.oa).toFixed(1), k: k.kappa.toFixed(3)})}</b> (${tong.toFixed(1)} ${T("ha")})</p>`;
    h += `<table><tr><th>${T("lớp")}</th><th>${T("theo A")}</th><th>${T("theo B")}</th><th>${T("A trùng B")}</th><th>${T("B trùng A")}</th></tr>` +
      la.map((v, r) => `<tr><td><i class="sw" style="background:${A.cg[r].mau}"></i> ${esc(A.cg[r].ten)}</td><td>${rs[r].toFixed(1)}</td><td>${(cs[r] || 0).toFixed(1)}</td>` +
        `<td>${rs[r] ? (100 * M[r][r] / rs[r]).toFixed(1) : "-"} %</td><td>${cs[r] ? (100 * M[r][r] / cs[r]).toFixed(1) : "-"} %</td></tr>`).join("") + `</table>`;
    TK.dt = {oa: k.oa, kappa: k.kappa, M};
  } else { h += `<p class="mu sm">${T("Hai bản đồ khác chú giải: xem bảng chéo; chọn chú giải chung hoặc 3 lớp để có tỉ lệ trùng khớp và kappa.")}</p>`; TK.dt = {M}; }
  h += `<table><tr><th>A \\ B</th>` + B.cg.map(l => `<th>${esc(l.ten)}</th>`).join("") + `</tr>` +
    M.map((r, i) => `<tr><th>${esc(A.cg[i].ten)}</th>` + Array.from(r).map((v, j) => `<td class="${cung && i === j ? "dg" : ""}">${v ? v.toFixed(1) : ""}</td>`).join("") + `</tr>`).join("") + `</table>`;
  box.innerHTML = h;
}
function kappa27(M) {
  const n = M.length, rs = M.map(r => r.reduce((s, v) => s + v, 0)), cs = M[0] ? Array.from(M[0], (_, j) => M.reduce((s, r) => s + r[j], 0)) : [], t = rs.reduce((s, v) => s + v, 0) || 1;
  let d = 0, pe = 0; for (let i = 0; i < n; i++) { d += M[i][i] || 0; pe += rs[i] * (cs[i] || 0); }
  const po = d / t; pe /= t * t; return {oa: po, kappa: pe < 1 ? (po - pe) / (1 - pe) : 1};
}
function tkQuyDoi() {
  const K = TK.kq, seen = new Set();
  tk$("tkCGBang").innerHTML = `<p class="mu sm">${T("Bảng quy đổi từ lớp gốc về chú giải chung 7 lớp và hệ 3 lớp (thực vật, nước, xây dựng); lớp không quy đổi được không tính vào tỉ lệ.")}</p>` +
    K.cot.filter(c => !seen.has(c.pa.id) && seen.add(c.pa.id)).map(c => `<p><b>${esc(paTen(c.pa))}</b></p><table><tr><th>${T("lớp gốc")}</th><th>${T("chung")}</th><th>${T("3 lớp")}</th></tr>` +
      Object.keys(c.pa.lop).map(Number).sort((a, b) => a - b).map(v => { const l = c.pa.lop[v];
        return `<tr><td><i class="sw" style="background:${l.mau}"></i> ${v} ${esc(paLopTen(c.pa, v))}</td><td>${l.chung ? esc(T(CHUNG27[l.chung])) : "<span class='mu'>-</span>"}</td><td>${l.n3 ? esc(T(TEN3[l.n3])) : "<span class='mu'>-</span>"}</td></tr>`; }).join("") + `</table>`).join("");
}
function tkTab(t) { document.querySelectorAll("#tkP [data-ttab]").forEach(b => b.classList.toggle("on", b.dataset.ttab === t)); document.querySelectorAll("#tkP [data-tpane]").forEach(p => { p.hidden = p.dataset.tpane !== t; }); TK.tab = t; }
function tkCanvas(K, k, kieu) {                 // bản 2.9: vẽ bản đồ lớp phủ (hoặc trùng / khác A, B) lên canvas
  const g = K.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(g.w, g.h), d = img.data, rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  if (kieu === "dt") { const A = K.cot[+tk$("tkCotA").value || 0], B = K.cot[+tk$("tkCotB").value || 1];
    for (let i = 0; i < g.w * g.h; i++) { if (!A.ma[i] || !B.ma[i]) continue; const o = A.ma[i] === B.ma[i] ? [34, 197, 94] : [239, 68, 68]; d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 170; } }
  else { const C = K.cot[k], m = {}; C.cg.forEach(l => { m[l.ma] = rgb(l.mau); });
    for (let i = 0; i < g.w * g.h; i++) { const o = m[C.ma[i]]; if (!o) continue; d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 200; } }
  ctx.putImageData(img, 0, 0); c._mode = kieu; c._k = k; c._A = +tk$("tkCotA").value || 0; c._B = +tk$("tkCotB").value || 1; return c;
}
function tkVe(k, kieu) {                         // hiện một bản đồ (hoặc bản đồ trùng / khác của A, B) lên bản đồ
  const K = TK.kq; if (TK.hien) { map.removeLayer(TK.hien); TK.hien = null; } if (!K || kieu === "tat") return; TK._xem = kieu; TK._k = k;
  const c = tkCanvas(K, k, kieu); if (!c) return; const g = K.g;
  const A0 = CORE.m2ll(g.bb[0], g.bb[1]), B0 = CORE.m2ll(g.bb[2], g.bb[3]);
  TK.canvas = c;
  TK.hien = L.imageOverlay(c.toDataURL(), [[A0[1], A0[0]], [B0[1], B0[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 455}).addTo(map);
  const el = TK.hien.getElement && TK.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
}
function tkCSV() {
  const K = TK.kq; if (!K) return; const rows = [];
  K.cot.forEach(c => c.cg.forEach(l => { if (c.dt[l.ma]) rows.push({phuong_an: paTen(c.pa), nam: c.y || "", chu_giai: K.che, ma_lop: l.ma, lop: l.ten, dien_tich_ha: +c.dt[l.ma].toFixed(3),
    ty_le_pct: +(100 * c.dt[l.ma] / Math.max(c.tong - (K.che === "goc" ? 0 : c.loai), 1e-9)).toFixed(3)}); }));
  if (TK.xaRows) TK.xaRows.rows.forEach(r => TK.xaRows.lop.forEach(l => { if (r.o[l.ma]) rows.push({phuong_an: paTen(TK.xaRows.c.pa), nam: TK.xaRows.c.y || "", chu_giai: K.che, xa: r.ten, ma_lop: l.ma, lop: l.ten, dien_tich_ha: +r.o[l.ma].toFixed(3)}); }));
  download(`thong_ke_lop_phu_${stamp()}.csv`, CORE.toCSV(rows, ["phuong_an", "nam", "chu_giai", "xa", "ma_lop", "lop", "dien_tich_ha", "ty_le_pct"]), "text/csv");
}
$("bTK").onclick = () => tkMo();
tk$("tkDong").onclick = () => { tkMo(false); tkVe(0, "tat"); };
tk$("tkThu").onclick = () => { const b = tk$("tkBody"); b.hidden = !b.hidden; tk$("tkThu").textContent = b.hidden ? "+" : "–"; };
tk$("tkPV").onchange = tkHien; tk$("tkChay").onclick = tkChay; tk$("tkCSV").onclick = tkCSV;
document.querySelectorAll("#tkP [data-ttab]").forEach(b => { b.onclick = () => tkTab(b.dataset.ttab); });
["tkCotXa"].forEach(id => { tk$(id).onchange = tkTheoXa; });
["tkCotA", "tkCotB"].forEach(id => { tk$(id).onchange = tkDongThuan; });
tk$("tkLopBD").onchange = tkBieuDo;
tk$("tkXemBtn").onclick = () => tkVe(+tk$("tkCotXem").value, "lop");
tk$("tkXemDT").onclick = () => tkVe(0, "dt");
tk$("tkXemTat").onclick = () => tkVe(0, "tat");
tk$("tkTif").onclick = () => { const K = TK.kq; if (!K) return; const c = K.cot[+tk$("tkCotXem").value || 0];
  try { v28TifLop(`${(c.pa.L0 ? c.pa.L0.id : c.pa.id)}_${c.y || ""}_${K.che}_${stamp()}`, K.g, c.ma, c.co, c.cg); } catch (e) { msg(T("lỗi: ") + (e.message || e), "er", 6000); } };
tk$("tkNhap").onclick = () => tk$("tkNhapTep").click();
tk$("tkNhapTep").onchange = e => { const f = e.target.files[0]; if (f) tkNhapTep(f); e.target.value = ""; };
document.addEventListener("xa27", () => { if (!tk$("tkP").hidden) { tk$("tkXa").innerHTML = v27DSXa(); } });
{ const el = tk$("tkP"); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
  const dau = el.querySelector(".vg-dau"); let st = null;
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; el.style.left = Math.max(0, st.l + e.clientX - st.x) + "px"; el.style.top = Math.max(0, st.t + e.clientY - st.y) + "px"; });
  document.addEventListener("mouseup", () => { st = null; }); }
paNapDB();
const _setLang27tk = setLang;
setLang = function (l) { _setLang27tk(l); tk$("tkTT").textContent = ""; tk$("tkNhapTT").textContent = ""; tkVeDS(); if (!tk$("tkP").hidden) { if (TK.kq) { TK.kq.cot.forEach(c => { c.cg = tkChuGiai(TK.kq.che, c.pa); }); tkVeKQ(); } } if (TK.nhap) tkVeNhap(); };
