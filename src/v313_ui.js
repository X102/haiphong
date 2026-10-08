/* =============================== BẢN 3.13 =============================== */
/* ① Xuất bản đồ: tên lớp của phương án theo ngôn ngữ đang chọn (phương án tạo từ điểm mẫu lưu tên lúc tạo); tên tệp mặc định có
      nội dung, năm, phạm vi, khổ, dpi, giờ địa phương (chữ Nga phiên âm Latin); nhãn địa danh: nguồn đang chọn không cho tải chéo
      (Esri) thì lấy Google, rồi CARTO; dòng nguồn ghi đúng nhà cung cấp nhãn.
   ② Chọn xã: các ô chọn nhiều xã thành danh sách ô tích có tìm kiếm, chọn hết / bỏ hết, diện tích, và nút lưu thành vùng gộp (dùng
      lại ở mọi bảng). Hộp xuất bản đồ có thêm khung "các xã chọn dưới đây" (cắt theo ranh giới được).
   ③ Xuất điểm mẫu Shapefile (ZIP: .shp .shx .dbf .prj .cpg), chọn các bộ điểm để gộp.
   ④ Quản lý phương án: thông tin (phạm vi, thời gian tạo, số mẫu, phương pháp), xem trên bản đồ, đến phạm vi, đổi tên, GeoTIFF,
      xuất bản đồ; tên trùng tự đánh số; mỗi phương án là một nội dung trong hộp xuất bản đồ. */

/* ---------------- ① tên lớp theo ngôn ngữ, tên tệp, nhãn dự phòng ---------------- */
function paMaLop(pa, v) {                         // mã lớp (N1, T1…) của giá trị v trong phương án tạo từ điểm mẫu
  const c = pa && pa.lop && pa.lop[v]; if (!c) return null;
  if (c.ma && IDX.by[c.ma]) return c.ma;
  if (pa.nguon !== "tao" || (pa.tham_so && pa.tham_so.he === "3")) return null;
  return Object.keys(IDX.by).find(m => +IDX.by[m].id === +v) || null;
}
var _paLopTen313 = paLopTen;
paLopTen = function (pa, v) {
  if (pa && pa.nguon === "tao") {
    if (pa.tham_so && pa.tham_so.he === "3" && typeof BON_TEN !== "undefined" && BON_TEN[v]) return T(BON_TEN[v]);
    const ma = paMaLop(pa, v); if (ma) return `${ma} ${cten(IDX.by[ma])}`;
  }
  return _paLopTen313.apply(this, arguments);
};
const RU_LAT = {а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"};
function tenTep313(s) {                           // chữ -> phần tên tệp (Latin, không dấu, phiên âm chữ Nga)
  const t = String(s || "").replace(/[А-яЁё]/g, ch => { const l = ch.toLowerCase(), r = RU_LAT[l]; return r == null ? ch : (ch !== l ? r.charAt(0).toUpperCase() + r.slice(1) : r); });
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9.-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}
function gioTep313(d) { d = d || new Date(); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; }
function xbTenTep(o) {                            // tên tệp mặc định của bản đồ xuất
  const by = {}; xbDS().forEach(d => { by[d.k] = d; });
  const s = (XB.lop || []).find(q => q.k === XB.nd), d = by[XB.nd];
  const nd = o.tieuDe || (d ? d.ten : T("bản đồ")), nam = s && s.nam > 0 ? String(s.nam) : "";
  const pv = (o.pham || XB.pham) === "nhin" ? "" : (xbPhamVi(o.pham || XB.pham).ten || "");
  const phan = [nd, nam && !String(nd).includes(nam) ? nam : "", pv && !String(nd).includes(pv) ? String(pv).slice(0, 60) : "", `${+o.w}x${+o.h}cm`, `${o.dpi}dpi`, gioTep313()];
  return ("ban_do_" + phan.map(tenTep313).filter(Boolean).join("_")).slice(0, 160);
}
function nhanNguon313() {                         // nhà cung cấp nhãn đang chọn
  const v = $("selNhan") ? $("selNhan").value : "gg"; return v === "esri" ? "Esri" : v === "carto" ? "CARTO" : "Google";
}
var _xbLopTen313 = xbLopTen;
xbLopTen = function (l) {
  if (typeof V27 !== "undefined" && l === V27.nhan) return T("nhãn địa danh") + " (" + (XB.nhanDP || nhanNguon313()) + ")";
  return _xbLopTen313.apply(this, arguments);
};
const XB_NHAN_DP = () => [typeof ggUrl === "function" ? {u: ggUrl("h"), s: "0123", ten: "Google"} : null,
  {u: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png", s: "abcd", ten: "CARTO"}].filter(Boolean);
var _xbO313 = xbO;
xbO = async function (l, c) {                     // nhãn địa danh: nguồn đang chọn không cho tải chéo thì thử nguồn khác
  const dp = typeof V27 !== "undefined" && l === V27.nhan && XB.nhanDP ? XB_NHAN_DP().find(d => d.ten === XB.nhanDP) : null;
  if (dp) return xbAnh(L.Util.template(dp.u, {s: dp.s[Math.abs(c.x + c.y) % dp.s.length], x: c.x, y: c.y, z: c.z, r: ""}));   // đã biết nguồn dự phòng
  const r = await _xbO313.apply(this, arguments);
  if (r || typeof V27 === "undefined" || l !== V27.nhan) return r;
  for (const d of XB_NHAN_DP()) {
    if (l._url && l._url.split("{")[0] === d.u.split("{")[0]) continue;
    if (XB.nhanHong && XB.nhanHong[d.ten] > 6 && !XB.nhanDP) continue;     // nguồn này đã hỏng nhiều lần
    const im = await xbAnh(L.Util.template(d.u, {s: d.s[Math.abs(c.x + c.y) % d.s.length], x: c.x, y: c.y, z: c.z, r: ""}));
    if (im) { XB.nhanDP = d.ten; return im; }
    XB.nhanHong = XB.nhanHong || {}; XB.nhanHong[d.ten] = (XB.nhanHong[d.ten] || 0) + 1;
  }
  return null;
};
var _xbVe313 = xbVe;
xbVe = async function (o) {                       // thử trước một ô nhãn ở giữa khung: nguồn đang chọn không cho tải chéo thì dùng nguồn dự phòng
  XB.nhanDP = null; XB.nhanHong = {};               // cho cả bản đồ, và ghi đúng nhà cung cấp ở dòng nguồn
  try {
    const s = (XB.lop || []).find(q => q.k === "nhan");
    if (s && s.on && s.op > 0 && typeof V27 !== "undefined" && V27.nhan) {
      const ct = map.getCenter(), z = 12, n = Math.pow(2, z), la = ct.lat * Math.PI / 180;
      const c = {x: Math.floor((ct.lng + 180) / 360 * n), y: Math.floor((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n), z};
      if (!(await _xbO313(V27.nhan, c))) for (const d of XB_NHAN_DP()) {
        if (V27.nhan._url && V27.nhan._url.split("{")[0] === d.u.split("{")[0]) continue;
        if (await xbAnh(L.Util.template(d.u, {s: d.s[0], x: c.x, y: c.y, z, r: ""}))) { XB.nhanDP = d.ten; break; } }
    }
  } catch (e) { /* bỏ: vẽ như cũ */ }
  if (XB.nhanDP && o && !o.chiKhung && !(XB.o && XB.o.nguonTay)) o.nguon = xbNguonMac(o);
  return _xbVe313.apply(this, arguments);
};

/* ---------------- ② danh sách xã có ô tích, lưu thành vùng gộp ---------------- */
const XA_HOP_PV = {tkXa: "tkPV", plXa: "plPV", cdXa: "cdPV", boXa: "boPV", xbXa: "xbPham"};
function xaHopXa(o) { return (VG.xa || []).find(x => String(x.i) === String(o.value)) || (VG.xa || []).find(x => x.ten === o.textContent.trim()); }
function xaHopVe(s) {
  const box = s._hop; if (!box) return;
  const q = CORE.khongDau(box.querySelector("[data-tim]").value.trim()), ds = box.querySelector("[data-ds]");
  const ops = [...s.options];
  ds.innerHTML = ops.map((o, k) => { const an = q && !CORE.khongDau(o.textContent).includes(q);
    return `<label${an ? " hidden" : ""}><input type="checkbox" data-k="${k}"${o.selected ? " checked" : ""}> ${esc(o.textContent)}</label>`; }).join("") || `<span class="mu sm">${T("chưa nạp các xã")}</span>`;
  ds.querySelectorAll("[data-k]").forEach(c => { c.onchange = () => { ops[+c.dataset.k].selected = c.checked; s.dispatchEvent(new Event("change", {bubbles: true})); xaHopTT(s); }; });
  xaHopTT(s);
}
function xaHopTT(s) {
  const box = s._hop, sel = [...s.selectedOptions], ha = sel.reduce((t, o) => { const x = xaHopXa(o); return t + (x && typeof xgDienTich === "function" ? xgDienTich(x.mp) : 0); }, 0);
  box.querySelector("[data-tt]").textContent = sel.length ? T("đã chọn {n} xã, {a} ha", {n: sel.length, a: ha.toFixed(0)}) : T("chưa chọn xã nào");
  box.querySelector("[data-luu]").disabled = !sel.length;
}
function xaHopLuu(s) {                            // các xã đang chọn -> vùng gộp (ST.vgop), chọn luôn làm phạm vi
  const box = s._hop, xs = [...s.selectedOptions].map(xaHopXa).filter(Boolean);
  if (!xs.length) { msg(T("chưa chọn xã nào"), "wa", 2500); return null; }
  const ten = box.querySelector("[data-ten]").value.trim() || xs.slice(0, 3).map(x => x.ten).join(", ") + (xs.length > 3 ? " …" : "");
  const mp = typeof xgHoaTan === "function" ? xgHoaTan(xs.map(x => x.mp)) : [].concat(...xs.map(x => x.mp)), bl = [Infinity, Infinity, -Infinity, -Infinity];
  mp.forEach(pg => pg[0].forEach(q => { bl[0] = Math.min(bl[0], q[0]); bl[1] = Math.min(bl[1], q[1]); bl[2] = Math.max(bl[2], q[0]); bl[3] = Math.max(bl[3], q[1]); }));
  if (!ST.vgop) ST.vgop = {};
  const id = "g" + Date.now().toString(36), tinh = typeof xgTinhHT === "function" ? xgTinhHT() : "";
  ST.vgop[id] = {id, ten, xa: xs.map(x => ({ten: x.ten, tinh})), geom: {type: "MultiPolygon", coordinates: mp}, bl, ha: typeof xgDienTich === "function" ? xgDienTich(mp) : 0,
    hoa_tan: typeof polygonClipping !== "undefined", tao_luc: new Date().toISOString()};
  save(); if (typeof xgNapPV === "function") xgNapPV(); document.dispatchEvent(new CustomEvent("vgop31"));
  const pv = $(XA_HOP_PV[s.id]);
  if (pv) { if (s.id === "xbXa") { XB.pham = "gop:" + id; xbVeND(); } else { pv.value = "gop:" + id; if (pv.onchange) pv.onchange(); pv.dispatchEvent(new Event("change", {bubbles: true})); } }
  box.querySelector("[data-ten]").value = "";
  msg(T("đã lưu vùng gộp {t} ({n} xã): chọn lại được ở mọi ô Phạm vi", {t: ten, n: xs.length}), "ok", 5000);
  return ST.vgop[id];
}
function xaHop(id) {                              // biến một ô chọn nhiều xã thành danh sách ô tích (ô chọn gốc vẫn giữ dữ liệu)
  const s = $(id); if (!s || s._hop) return;
  s.style.display = "none";
  const box = document.createElement("div"); box.className = "xahop"; box.setAttribute("data-noi18n", ""); s._hop = box; s.insertAdjacentElement("afterend", box);
  box.innerHTML = `<div class="xahop-dau"><input type="search" data-tim><button type="button" data-het></button><button type="button" data-bo></button></div><div class="xahop-ds" data-ds></div>` +
    `<div class="xahop-cuoi"><span class="mu sm" data-tt></span><input type="text" data-ten><button type="button" data-luu></button></div>`;
  box.querySelector("[data-tim]").addEventListener("input", () => xaHopVe(s));
  box.querySelector("[data-het]").onclick = () => { const ops = [...s.options]; box.querySelectorAll("[data-k]").forEach(c => { if (!c.parentElement.hidden) ops[+c.dataset.k].selected = true; }); s.dispatchEvent(new Event("change", {bubbles: true})); xaHopVe(s); };
  box.querySelector("[data-bo]").onclick = () => { [...s.options].forEach(o => { o.selected = false; }); s.dispatchEvent(new Event("change", {bubbles: true})); xaHopVe(s); };
  box.querySelector("[data-luu]").onclick = () => xaHopLuu(s);
  new MutationObserver(() => xaHopVe(s)).observe(s, {childList: true});
  xaHopChu(s); xaHopVe(s);
}
function xaHopChu(s) {                            // chữ theo ngôn ngữ
  const b = s._hop; if (!b) return;
  b.querySelector("[data-tim]").placeholder = T("tìm xã…"); b.querySelector("[data-het]").textContent = T("chọn hết"); b.querySelector("[data-bo]").textContent = T("bỏ hết");
  b.querySelector("[data-ten]").placeholder = T("tên vùng (tuỳ chọn)"); b.querySelector("[data-luu]").textContent = T("lưu thành vùng gộp");
  b.querySelector("[data-luu]").title = T("lưu các xã đang chọn thành một vùng gộp để lần sau chọn lại ở mọi ô Phạm vi");
}

/* hộp xuất bản đồ: khung "các xã chọn dưới đây" */
(function () {
  const ph = xb$("xbPham"); if (!ph || xb$("xbXaW")) return;
  ph.closest(".vg-o").insertAdjacentHTML("afterend", `<div class="row" id="xbXaW" hidden><select id="xbXa" multiple size="4" style="width:100%" data-noi18n></select></div>`);
})();
var _xbPhamDS313 = xbPhamDS;
xbPhamDS = function () {
  const out = _xbPhamDS313.apply(this, arguments);
  if (VG.xa && VG.xa.length) out.splice(1, 0, ["xa", T("các xã chọn dưới đây")]);
  return out;
};
var _xbPhamVi313 = xbPhamVi;
xbPhamVi = function (pham) {
  if (pham === "xa") { const xs = [...xb$("xbXa").selectedOptions].map(xaHopXa).filter(Boolean);
    if (xs.length) { const mp = [].concat(...xs.map(x => x.mp)); return {bb: vgBB3857(mp), mp, ten: xs.length <= 3 ? xs.map(x => x.ten).join(", ") : xs.slice(0, 3).map(x => x.ten).join(", ") + " …"}; }
    return {bb: null, mp: null, ten: ""}; }
  return _xbPhamVi313.apply(this, arguments);
};
var _xbVeND313 = xbVeND;
xbVeND = function () {
  const s = xb$("xbXa");
  if (s && VG.xa && s.options.length !== VG.xa.length) { const cu = new Set([...s.selectedOptions].map(o => o.value)); s.innerHTML = v27DSXa(); [...s.options].forEach(o => { o.selected = cu.has(o.value); }); }
  const r = _xbVeND313.apply(this, arguments);
  xb$("xbXaW").hidden = XB.pham !== "xa"; xaHop("xbXa");
  return r;
};
xb$("xbXa").addEventListener("change", () => { if (XB.pham !== "xa") return; const coCat = !!xbPhamVi("xa").mp; xb$("xbCat").disabled = !coCat; if (!coCat) xb$("xbCat").checked = false; if (typeof xbSauDoi === "function") xbSauDoi(); });

/* ---------------- ③ Shapefile điểm mẫu ---------------- */
function u8Chu(s) { return new TextEncoder().encode(String(s == null ? "" : s)); }
function catU8(b, n) {                            // cắt chuỗi UTF-8 tối đa n byte, không cắt giữa một ký tự
  if (b.length <= n) return b; let k = n; while (k > 0 && (b[k] & 0xC0) === 0x80) k--; return b.slice(0, k);
}
function shpDiem(rows, truong) {                  // rows: [{lon, lat, ...}], truong: [{ten (≤ 10 ký tự), khoa, kieu: "C" | "N", tp}] -> {shp, shx, dbf}
  const n = rows.length, xs = rows.map(r => +r.lon), ys = rows.map(r => +r.lat);
  const bb = n ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [0, 0, 0, 0];
  const dau = (dv, dai) => { const v = new DataView(new ArrayBuffer(100)); v.setInt32(0, 9994); v.setInt32(24, dai / 2); v.setInt32(28, 1000, true); v.setInt32(32, 1, true);
    [bb[0], bb[1], bb[2], bb[3]].forEach((q, i) => v.setFloat64(36 + 8 * i, q, true)); new Uint8Array(dv.buffer).set(new Uint8Array(v.buffer), 0); };
  const shp = new DataView(new ArrayBuffer(100 + n * 28)), shx = new DataView(new ArrayBuffer(100 + n * 8));
  dau(shp, 100 + n * 28); dau(shx, 100 + n * 8);
  rows.forEach((r, i) => { const o = 100 + i * 28; shp.setInt32(o, i + 1); shp.setInt32(o + 4, 10); shp.setInt32(o + 8, 1, true); shp.setFloat64(o + 12, xs[i], true); shp.setFloat64(o + 20, ys[i], true);
    shx.setInt32(100 + i * 8, o / 2); shx.setInt32(104 + i * 8, 10); });
  // DBF: chữ UTF-8 (kèm tệp .cpg), số viết thẳng
  const gt = rows.map(r => truong.map(f => { const v = r[f.khoa];
    if (f.kieu === "N") return v === "" || v == null || !isFinite(+v) ? null : (+v).toFixed(f.tp || 0);
    return u8Chu(v); }));
  truong.forEach((f, j) => { const m = Math.max(1, ...gt.map(g => (g[j] == null ? 0 : g[j].length)));
    f.dai = f.kieu === "N" ? Math.min(19, Math.max(m, (f.tp || 0) + 2)) : Math.min(254, m); });
  const nf = truong.length, hl = 32 + 32 * nf + 1, rl = 1 + truong.reduce((s, f) => s + f.dai, 0), dbf = new Uint8Array(hl + rl * n + 1), dv = new DataView(dbf.buffer), d = new Date();
  dbf[0] = 3; dbf[1] = d.getFullYear() - 1900; dbf[2] = d.getMonth() + 1; dbf[3] = d.getDate(); dv.setUint32(4, n, true); dv.setUint16(8, hl, true); dv.setUint16(10, rl, true);
  truong.forEach((f, j) => { const o = 32 + 32 * j, t = u8Chu(f.ten).slice(0, 10); dbf.set(t, o); dbf[o + 11] = f.kieu.charCodeAt(0); dbf[o + 16] = f.dai; dbf[o + 17] = f.kieu === "N" ? (f.tp || 0) : 0; });
  dbf[hl - 1] = 0x0D;
  gt.forEach((g, i) => { let o = hl + i * rl; dbf[o++] = 0x20;
    truong.forEach((f, j) => { const v = g[j];
      if (f.kieu === "N") { const t = v == null ? "" : v, b = u8Chu(t.padStart(f.dai, " ").slice(-f.dai)); dbf.set(b, o); if (v == null) dbf.fill(0x20, o, o + f.dai); }
      else { const b = catU8(v, f.dai); dbf.fill(0x20, o, o + f.dai); dbf.set(b, o); }
      o += f.dai; }); });
  dbf[dbf.length - 1] = 0x1A;
  return {shp: new Uint8Array(shp.buffer), shx: new Uint8Array(shx.buffer), dbf};
}
const WKT_4326 = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
function shpBoDS() { const dem = {}; Object.values(ST.diem).forEach(p => { dem[p.bo] = (dem[p.bo] || 0) + 1; }); return Object.entries(dem); }
function shpXuat(bos, chiNhan) {                  // -> {ten, du (ZIP), n}
  const set = new Set(bos), ys = allYears();
  let pts = Object.values(ST.diem).filter(p => set.has(p.bo));
  if (chiNhan) pts = pts.filter(p => ys.some(y => p.nhan[y]));
  if (!pts.length) throw new Error(T("không có điểm nào trong các bộ đã chọn"));
  const rows = CORE.exportWide(pts, ys, IDX).map((r, i) => { const p = pts[i];
    r.ten_bo = typeof boTen === "function" ? boTen(p.bo) : p.bo;
    ys.forEach(y => { const m = p.nhan[y]; r["lop_" + y] = m && IDX.by[m] ? cten(IDX.by[m]) : ""; });
    return r; });
  const tr = [["id", "id", "C"], ["bo_diem", "bo_diem", "C"], ["ten_bo", "ten_bo", "C"], ["lon", "lon", "N", 7], ["lat", "lat", "N", 7], ["x_utm", "x_utm", "N", 1], ["y_utm", "y_utm", "N", 1],
    ["tang", "tang", "C"], ["so_nam", "so_nam_co_nhan", "N", 0], ["so_doi", "so_lan_doi", "N", 0], ["xem_lai", "xem_lai", "N", 0], ["ghi_chu", "ghi_chu", "C"]]
    .concat(...ys.map(y => [["ma_" + y, "ma_" + y, "C"], ["lop_" + y, "lop_" + y, "C"], ["l3_" + y, "lop3_" + y, "C"], ["anh_" + y, "anh_" + y, "C"]]))
    .map(([ten, khoa, kieu, tp]) => ({ten, khoa, kieu, tp}));
  const F = shpDiem(rows, tr), goc = "diem_mau_" + (bos.length === 1 ? tenTep313(typeof boTen === "function" ? boTen(bos[0]) : bos[0]) || bos[0] : bos.length + "_bo") + "_" + gioTep313();
  const du = XH.zip([{ten: goc + ".shp", du: F.shp}, {ten: goc + ".shx", du: F.shx}, {ten: goc + ".dbf", du: F.dbf}, {ten: goc + ".prj", du: WKT_4326}, {ten: goc + ".cpg", du: "UTF-8"}]);
  return {ten: goc + ".zip", du, n: pts.length};
}
(function () {
  const ref = $("eGeo"); if (!ref || $("eShp")) return;
  ref.insertAdjacentHTML("afterend", `<button id="eShp" type="button"></button>`);
  ref.closest(".row").insertAdjacentHTML("afterend", `<div id="eShpW" class="xahop" hidden data-noi18n><div class="sm" data-tieu></div><div class="xahop-ds" id="eShpBo"></div>` +
    `<div class="xahop-cuoi"><label class="sm"><input type="checkbox" id="eShpNhan" checked> <span data-nhan></span></label><button type="button" id="eShpTai" class="on"></button><span class="mu sm" id="eShpTT"></span></div></div>`);
  $("eShp").onclick = () => { const w = $("eShpW"); w.hidden = !w.hidden; if (!w.hidden) shpVeBo(); };
  $("eShpTai").onclick = () => {
    const bos = [...$("eShpBo").querySelectorAll("input:checked")].map(i => i.value);
    try { if (!bos.length) throw new Error(T("chọn ít nhất một bộ điểm")); const r = shpXuat(bos, $("eShpNhan").checked);
      v28Tai(r.ten, r.du, "application/zip"); $("eShpTT").textContent = T("đã xuất {f}: {n} điểm", {f: r.ten, n: r.n}); }
    catch (e) { $("eShpTT").textContent = T("lỗi: ") + (e.message || e); }
  };
  shpChu();
})();
function shpVeBo() {
  const cu = new Set(ls("laymau_hp_shp_bo_v1") || [ST.bo]);
  $("eShpBo").innerHTML = shpBoDS().map(([b, n]) => `<label><input type="checkbox" value="${esc(b)}"${cu.has(b) ? " checked" : ""}> ${esc(typeof boTen === "function" ? boTen(b) : b)} <span class="mu">(${n})</span></label>`).join("");
  $("eShpBo").querySelectorAll("input").forEach(i => { i.onchange = () => ls("laymau_hp_shp_bo_v1", [...$("eShpBo").querySelectorAll("input:checked")].map(x => x.value)); });
}
function shpChu() {
  if (!$("eShp")) return;
  $("eShp").textContent = T("Shapefile (SHP)…"); $("eShp").title = T("xuất điểm mẫu thành Shapefile (ZIP), chọn các bộ điểm để gộp");
  $("eShpW").querySelector("[data-tieu]").textContent = T("Các bộ điểm gộp vào một Shapefile (toạ độ WGS 84, trường chữ UTF-8):");
  $("eShpW").querySelector("[data-nhan]").textContent = T("chỉ điểm đã có nhãn"); $("eShpTai").textContent = T("Tải Shapefile (ZIP)");
}

/* ---------------- ④ quản lý phương án ---------------- */
var PA_XEM = {};
function paNamDS(pa) { return (pa.nam && pa.nam.length ? pa.nam : Object.keys(pa.du || {}).map(Number)).slice().sort((a, b) => a - b); }
function paNam0(pa) { const ns = paNamDS(pa); return ns.includes(ST.nam) ? ST.nam : ns[ns.length - 1]; }
function paLuoi(pa, y) { const s = pa.du && (pa.du[y] || Object.values(pa.du)[0]); if (!s) return null; const g = Object.assign({}, s.g0); g.bb = [g.x0, g.y1 - g.h * g.res, g.x0 + g.w * g.res, g.y1]; return {g, data: s.data}; }
function paCanvas(pa, y) {
  const q = paLuoi(pa, y); if (!q) return null;
  const c = document.createElement("canvas"); c.width = q.g.w; c.height = q.g.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(q.g.w, q.g.h), d = img.data, bang = {};
  Object.entries(pa.lop).forEach(([v, l]) => { const h = l.mau || "#999999"; bang[v] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
  for (let i = 0; i < q.data.length; i++) { const o = bang[q.data[i]]; if (!o) continue; d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 235; }
  ctx.putImageData(img, 0, 0); return c;
}
function paCG(pa, y) {                            // chú giải + đếm diện tích cho hộp xuất bản đồ
  const q = paLuoi(pa, y), ks = Object.keys(pa.lop).map(Number).sort((a, b) => a - b), vt = {}; ks.forEach((v, j) => { vt[v] = j; });
  return {k: "pa:" + pa.id, tieuDe: paTen(pa) + (y > 0 && !String(paTen(pa)).includes(String(y)) ? " " + y : ""), muc: ks.map(v => ({mau: pa.lop[v].mau, ten: paLopTen(pa, v), kieu: "o"})),
    dem: q ? (E, mp) => xbDem(q.g, i => (q.data[i] ? (vt[q.data[i]] != null ? vt[q.data[i]] : -1) : undefined), ks.length, E, mp) : null};
}
function paXem(id, on) {                          // hiện / ẩn một phương án trên bản đồ
  const pa = PA.rieng.find(q => q.id === id); if (PA_XEM[id]) { map.removeLayer(PA_XEM[id]); delete PA_XEM[id]; }
  if (!pa || on === false) return false;
  const y = paNam0(pa), q = paLuoi(pa, y), c = paCanvas(pa, y); if (!q || !c) return false;
  const A = CORE.m2ll(q.g.bb[0], q.g.bb[1]), B = CORE.m2ll(q.g.bb[2], q.g.bb[3]);
  PA_XEM[id] = L.imageOverlay(c.toDataURL(), [[A[1], A[0]], [B[1], B[0]]], {opacity: 0.9, interactive: false, pmIgnore: true, zIndex: 457}).addTo(map);
  PA_XEM[id]._pa = {id, y}; const el = PA_XEM[id].getElement && PA_XEM[id].getElement(); if (el) el.style.imageRendering = "pixelated";
  return true;
}
function paDen(id) { const pa = PA.rieng.find(q => q.id === id), q = pa && paLuoi(pa, paNam0(pa)); if (!q) return;
  const A = CORE.m2ll(q.g.bb[0], q.g.bb[1]), B = CORE.m2ll(q.g.bb[2], q.g.bb[3]); map.fitBounds([[A[1], A[0]], [B[1], B[0]]]); }
function paDoiTen(id, ten) {
  const pa = PA.rieng.find(q => q.id === id); if (!pa) return;
  if (ten == null) ten = prompt(T("Tên mới của phương án"), pa.ten); if (ten == null || !String(ten).trim()) return;
  pa.ten = paTenRieng(String(ten).trim(), pa.id); paLuuDB(pa); tkVeDS(); document.dispatchEvent(new CustomEvent("pa27"));
}
function paTenRieng(ten, id) {                    // tên không trùng với phương án khác: thêm (2), (3)…
  const co = t => PA.rieng.some(q => q.id !== id && q.ten === t) || paDS().some(q => q.L0 && paTen(q) === t);
  if (!co(ten)) return ten; let k = 2; while (co(`${ten} (${k})`)) k++; return `${ten} (${k})`;
}
var _paThem313 = paThem;
paThem = function (pa) { if (pa && pa.ten) pa.ten = paTenRieng(pa.ten, pa.id); return _paThem313.apply(this, arguments); };
var _paXoa313 = paXoa;
paXoa = function (id) { paXem(id, false); return _paXoa313.apply(this, arguments); };
function paTif(id) {
  const pa = PA.rieng.find(q => q.id === id); if (!pa) return; const y = paNam0(pa), q = paLuoi(pa, y); if (!q) return;
  try { v28TifLop(`phuong_an_${tenTep313(paTen(pa))}_${y}`, q.g, q.data, null, Object.keys(pa.lop).map(Number).map(v => ({ma: v, ten: paLopTen(pa, v), mau: pa.lop[v].mau}))); }
  catch (e) { msg(T("lỗi: ") + (e.message || e), "er", 6000); }
}
function paMoTa(pa) {                             // dòng thông tin dưới tên phương án
  const ts = pa.tham_so || {}, out = [];
  if (ts.pham_vi) out.push(T("phạm vi: {v}", {v: ts.pham_vi}));
  if (pa.tao_luc) { const d = new Date(pa.tao_luc); if (!isNaN(d)) out.push(d.toLocaleString(LANG === "vi" ? "vi-VN" : LANG, {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"})); }
  if (ts.so_mau) out.push(T("{n} mẫu", {n: ts.so_mau}) + (ts.so_mau_ngoai ? " " + T("({n} ngoài phạm vi)", {n: ts.so_mau_ngoai}) : ""));
  const PP = {cos_mau: "cosine, k mẫu gần nhất bỏ phiếu", cos_nm: "cosine, nguyên mẫu từng lớp (k-means)", ecl_mau: "khoảng cách chuẩn hoá, mẫu gần nhất (như chọn vùng)", ecl_tam: "khoảng cách chuẩn hoá, tâm lớp"};
  if (ts.pp && PP[ts.pp]) out.push(T(PP[ts.pp]) + (/_mau$/.test(ts.pp) && ts.k > 1 ? ` (k = ${ts.k})` : ""));
  if (ts.nguon_mau && ts.nguon_mau !== "trong" && typeof plNguonTen === "function") out.push(T("mẫu: {s}", {s: plNguonTen({nguon: ts.nguon_mau})}));
  const q = paLuoi(pa, paNam0(pa)); if (q) out.push(`${q.g.w} × ${q.g.h} · ${Math.round(q.g.res)} m`);
  return out.join(" · ");
}
tkVeDS = function () {                            // danh sách phương án: chọn để thống kê, và quản lý từng bản đồ riêng
  const box = tk$("tkPA"); if (!box) return;
  const chon = new Set(TK.chon || ls("laymau_hp_tk_pa_v1") || []), ds = paDS();
  box.innerHTML = ds.map(pa => { const rieng = !pa.L0, nguon = pa.nguon === "tg" ? T("toàn cầu") : pa.nguon === "man" ? T("bộ dữ liệu") : pa.nguon === "tao" ? T("tạo từ điểm mẫu") : T("nhập");
    return `<div class="pa-hang"><label><input type="checkbox" value="${esc(pa.id)}"${chon.has(pa.id) ? " checked" : ""}> ${esc(paTen(pa))}</label> <span class="mu">${pa.nam ? pa.nam.join(", ") : ""} · ${nguon}</span>` +
      (rieng ? `<span class="pa-nut"><button type="button" data-xem="${esc(pa.id)}" class="${PA_XEM[pa.id] ? "on" : ""}" title="${esc(T("hiện / ẩn trên bản đồ"))}">👁</button>` +
        `<button type="button" data-den="${esc(pa.id)}" title="${esc(T("đến phạm vi của phương án"))}">⌖</button><button type="button" data-ten="${esc(pa.id)}" title="${esc(T("đổi tên"))}">✎</button>` +
        `<button type="button" data-xb="${esc(pa.id)}" title="${esc(T("xuất bản đồ của phương án này"))}">🖨</button><button type="button" data-tif="${esc(pa.id)}" title="${esc(T("tải GeoTIFF bản đồ lớp"))}">⤓</button>` +
        `<button type="button" data-xoa="${esc(pa.id)}" title="${esc(T("xoá phương án này khỏi trình duyệt"))}">×</button></span><div class="mu sm">${esc(paMoTa(pa))}</div>` : "") + `</div>`; }).join("") ||
    `<span class="mu">${T("chưa có phương án nào")}</span>`;
  box.querySelectorAll("input[type=checkbox]").forEach(i => { i.onchange = () => { TK.chon = [...box.querySelectorAll("input[type=checkbox]:checked")].map(x => x.value); ls("laymau_hp_tk_pa_v1", TK.chon); tkVeNam(); }; });
  box.querySelectorAll("[data-xoa]").forEach(b => { b.onclick = e => { e.preventDefault(); if (confirm(T("Xoá phương án này khỏi trình duyệt?"))) paXoa(b.dataset.xoa); }; });
  box.querySelectorAll("[data-xem]").forEach(b => { b.onclick = () => { paXem(b.dataset.xem, !PA_XEM[b.dataset.xem]); tkVeDS(); }; });
  box.querySelectorAll("[data-den]").forEach(b => { b.onclick = () => paDen(b.dataset.den); });
  box.querySelectorAll("[data-ten]").forEach(b => { b.onclick = () => paDoiTen(b.dataset.ten); });
  box.querySelectorAll("[data-tif]").forEach(b => { b.onclick = () => paTif(b.dataset.tif); });
  box.querySelectorAll("[data-xb]").forEach(b => { b.onclick = () => { XB.them = null; xbMo("pa:" + b.dataset.xb, "kq"); }; });
  tkVeNam();
};
var _xbDS313 = xbDS;
xbDS = function () {                              // mỗi phương án riêng là một nội dung xuất được (trước các lớp véc tơ)
  const ds = _xbDS313.apply(this, arguments), them = [];
  (PA.rieng || []).forEach(pa => { const nam = paNamDS(pa); if (!nam.length) return; const y0 = paNam0(pa), q0 = paLuoi(pa, y0); if (!q0) return;
    them.push({k: "pa:" + pa.id, nhom: "ket_qua", ten: T("phương án: {t}", {t: paTen(pa)}), nam: nam.length > 1 || nam[0] > 0 ? nam : undefined, nam0: y0,
      man: () => !!(PA_XEM[pa.id] && map.hasLayer(PA_XEM[pa.id])), op0: () => 0.9, bb: q0.g.bb,
      ve: s => { const y = s.nam != null ? s.nam : y0, q = paLuoi(pa, y); return q ? {anh: paCanvas(pa, y), bb: q.g.bb} : null; }, cg: s => paCG(pa, s.nam != null ? s.nam : y0)}); });
  const k = ds.findIndex(d => d.nhom === "vecto"); ds.splice(k < 0 ? ds.length : k, 0, ...them);
  const nh = ds.find(d => d.k === "nhan"); if (nh && typeof V27 !== "undefined") nh.ten = xbLopTen(V27.nhan);   // dòng nguồn ghi nhà cung cấp nhãn
  return ds;
};
var _xbChay313 = xbChay;
xbChay = async function () {
  const r = await _xbChay313.apply(this, arguments);
  if (XB.nhanDP && XB.nhanDP !== nhanNguon313()) { const el = xb$("xbTT"); el.textContent += " " + T("Nhãn địa danh lấy từ {s} vì {n} không cho tải chéo.", {s: XB.nhanDP, n: nhanNguon313()}); }
  return r;
};
document.addEventListener("pa27", () => { Object.keys(PA_XEM).forEach(id => { if (!PA.rieng.some(q => q.id === id)) paXem(id, false); }); });

/* ---------------- khởi động, ngôn ngữ ---------------- */
["tkXa", "plXa", "cdXa", "boXa"].forEach(xaHop);
if (typeof setLang === "function") { const _sl313 = setLang; setLang = function () { const r = _sl313.apply(this, arguments);
  Object.keys(XA_HOP_PV).forEach(id => { const s = $(id); if (s && s._hop) { xaHopChu(s); xaHopVe(s); } }); shpChu(); if (tk$("tkPA")) tkVeDS(); return r; }; }
