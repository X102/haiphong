/* =============================== BẢN 3.1 =============================== */
/* ① ranh giới hành chính: màu, độ dày, kiểu nét, nền, tên xã và tên tỉnh theo mức phóng (mặc định sáng, nhìn rõ trên ảnh vệ tinh);
   ② gộp nhiều xã thành một vùng: tìm theo tên, dán danh sách tên (kèm tỉnh, không dấu cũng được), nhấp trên bản đồ; hoà tan ranh
      giới (polygon-clipping); vùng gộp là phạm vi ở Thay đổi, Lớp phủ, Phân loại, Tạo bộ điểm, Xuất bản đồ, S2 trực tuyến;
   ③ Sentinel-2 trực tuyến cho vùng chưa có dữ liệu sẵn: kế hoạch cảnh theo năm (S2OC trong s2o_core.js), lớp xem, dải ảnh, giá trị
      tại điểm. Biến cấp tệp khai báo bằng var (các phần nạp trước có thể gọi hàm ở đây sớm). */

/* ---------------- ① kiểu ranh giới, tên ---------------- */
var BG_MAU = {
  sang: {xa: {mau: "#ffe14d", day: 1.6, net: "lien", nen: "#ffe14d", nen_do: 0, ten: true, co: 12, chu: "#ffffff", z: 12, gon: true}, tinh: {mau: "#ff6b3d", day: 2.6, ten: true}},
  toi: {xa: {mau: "#344054", day: 1.2, net: "dut", nen: "#344054", nen_do: 0, ten: true, co: 12, chu: "#1d2939", z: 12, gon: true}, tinh: {mau: "#6d28d9", day: 2, ten: true}},
  trang: {xa: {mau: "#ffffff", day: 1.4, net: "lien", nen: "#ffffff", nen_do: 0, ten: true, co: 12, chu: "#ffffff", z: 12, gon: true}, tinh: {mau: "#ffd400", day: 2.6, ten: true}}};
var BG = (function () { const l = ls("laymau_hp_bg_v1"); return l && l.xa && l.tinh ? l : Object.assign({kieu: "sang"}, JSON.parse(JSON.stringify(BG_MAU.sang))); })();
var BGT = {xa: L.layerGroup(), tinh: L.layerGroup(), t: 0};
function bgSang(hex) { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 150; }
function bgNet(n) { return n === "dut" ? "6 4" : n === "cham" ? "1 5" : null; }
function bgKieuXa() { const x = BG.xa; return {color: x.mau, weight: +x.day, opacity: 0.95, dashArray: bgNet(x.net), lineCap: x.net === "cham" ? "round" : "butt",
  fill: +x.nen_do > 0, fillColor: x.nen, fillOpacity: +x.nen_do}; }
function bgKieuTinh() { return {color: BG.tinh.mau, weight: +BG.tinh.day, opacity: 1, fill: false, dashArray: "8 4"}; }
function bgDiemNhan(mp) {                          // điểm đặt tên: tâm "xa mép nhất" của phần lớn nhất (dò lưới 16 × 16 rồi tinh 8 × 8)
  let tot = null, dt = -1;
  mp.forEach(pg => { const r = pg[0]; let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); if (Math.abs(a) > dt) { dt = Math.abs(a); tot = pg; } });
  if (!tot) return null;
  let b = [Infinity, Infinity, -Infinity, -Infinity]; tot[0].forEach(q => { b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])]; });
  const kc = (x, y) => { let m = Infinity; tot.forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const ax = r[j][0], ay = r[j][1], dx = r[i][0] - ax, dy = r[i][1] - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0, ex = ax + t * dx - x, ey = ay + t * dy - y; m = Math.min(m, ex * ex + ey * ey); } }); return m; };
  let best = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], bv = -1;
  const do_ = (x0, y0, x1, y1, n) => { for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) / n * (x1 - x0), y = y0 + (j + 0.5) / n * (y1 - y0);
    if (!vgPIP(x, y, [tot])) continue; const v = kc(x, y); if (v > bv) { bv = v; best = [x, y]; } } };
  do_(b[0], b[1], b[2], b[3], 16);
  const sx = (b[2] - b[0]) / 16, sy = (b[3] - b[1]) / 16; do_(best[0] - sx, best[1] - sy, best[0] + sx, best[1] + sy, 8);
  return best;
}
function bgTenHTML(t, co, chu) { const h = bgSang(chu) ? "rgba(0,0,0,.85)" : "rgba(255,255,255,.9)";
  return `<span style="font-size:${co}px;color:${chu};text-shadow:0 0 3px ${h},0 0 2px ${h},0 0 1px ${h}">${esc(t)}</span>`; }
function bgTenVe() {
  BGT.xa.clearLayers(); BGT.tinh.clearLayers();
  if (typeof map === "undefined") return;
  const z = map.getZoom(), bd = map.getBounds().pad(0.2), co = $("cVnXa") && $("cVnXa").checked;
  if (co && BG.xa.ten && z >= +BG.xa.z && typeof VG !== "undefined" && VG.xa) {
    VG.xa.forEach(x => {
      if (!(x.bl[2] >= bd.getWest() && x.bl[0] <= bd.getEast() && x.bl[3] >= bd.getSouth() && x.bl[1] <= bd.getNorth())) return;
      if (!x._nh) x._nh = bgDiemNhan(x.mp) || [(x.bl[0] + x.bl[2]) / 2, (x.bl[1] + x.bl[3]) / 2];
      const t = BG.xa.gon ? x.ten.replace(/^(xã|phường|thị trấn|đặc khu|thị xã)\s+/i, "") : x.ten;
      L.marker([x._nh[1], x._nh[0]], {icon: L.divIcon({className: "bg-ten", html: bgTenHTML(t, +BG.xa.co, BG.xa.chu), iconSize: [0, 0]}),
        interactive: false, keyboard: false, pmIgnore: true}).addTo(BGT.xa);
    });
  }
  if (BGT.xa.getLayers().length) BGT.xa.addTo(map); else map.removeLayer(BGT.xa);
  if ($("cVnTinh") && $("cVnTinh").checked && BG.tinh.ten && typeof V27 !== "undefined" && V27.tinhGJ && z >= 6) {
    V27.tinhGJ.forEach(t => {
      if (!t._nh) t._nh = bgDiemNhan(t.mp) || [(t.bl[0] + t.bl[2]) / 2, (t.bl[1] + t.bl[3]) / 2];
      L.marker([t._nh[1], t._nh[0]], {icon: L.divIcon({className: "bg-ten", html: bgTenHTML(t.ten, 15, BG.tinh.mau), iconSize: [0, 0]}),
        interactive: false, keyboard: false, pmIgnore: true}).addTo(BGT.tinh);
    });
  }
  if (BGT.tinh.getLayers().length) BGT.tinh.addTo(map); else map.removeLayer(BGT.tinh);
}
function bgApDung() {
  if (typeof VG !== "undefined" && VG.gXa) VG.gXa.eachLayer(l => { if (l.setStyle) l.setStyle(bgKieuXa()); });
  if (typeof V27 !== "undefined" && V27.tinhL && V27.tinhL.setStyle) V27.tinhL.setStyle(bgKieuTinh());
  bgTenVe();
}
function bgUI() {                                   // đưa giá trị BG lên các ô
  const d = (id, v) => { const e = $(id); if (!e) return; if (e.type === "checkbox") e.checked = !!v; else e.value = v; };
  d("bgKieu", BG.kieu); d("bgXaMau", BG.xa.mau); d("bgXaDay", BG.xa.day); d("bgXaNet", BG.xa.net); d("bgXaNen", BG.xa.nen); d("bgXaNenDo", BG.xa.nen_do);
  d("bgXaTen", BG.xa.ten); d("bgXaCo", BG.xa.co); d("bgXaChu", BG.xa.chu); d("bgXaZ", BG.xa.z); d("bgXaGon", BG.xa.gon);
  d("bgTiMau", BG.tinh.mau); d("bgTiDay", BG.tinh.day); d("bgTiTen", BG.tinh.ten);
}
function bgDoc() {                                  // đọc các ô vào BG
  const v = id => $(id).type === "checkbox" ? $(id).checked : $(id).value;
  Object.assign(BG.xa, {mau: v("bgXaMau"), day: +v("bgXaDay"), net: v("bgXaNet"), nen: v("bgXaNen"), nen_do: +v("bgXaNenDo"), ten: v("bgXaTen"), co: +v("bgXaCo"),
    chu: v("bgXaChu"), z: +v("bgXaZ"), gon: v("bgXaGon")});
  Object.assign(BG.tinh, {mau: v("bgTiMau"), day: +v("bgTiDay"), ten: v("bgTiTen")});
}
(function () {
  if (!$("bgKieu")) return;
  bgUI();
  $("bgKieu").addEventListener("change", () => { const k = $("bgKieu").value; if (BG_MAU[k]) { const m = JSON.parse(JSON.stringify(BG_MAU[k])); BG.xa = m.xa; BG.tinh = m.tinh; } BG.kieu = k; bgUI(); ls("laymau_hp_bg_v1", BG); bgApDung(); });
  ["bgXaMau", "bgXaDay", "bgXaNet", "bgXaNen", "bgXaNenDo", "bgXaTen", "bgXaCo", "bgXaChu", "bgXaZ", "bgXaGon", "bgTiMau", "bgTiDay", "bgTiTen"].forEach(id => {
    const e = $(id); if (!e) return;
    e.addEventListener(e.type === "range" || e.type === "color" ? "input" : "change", () => { bgDoc(); BG.kieu = "tu"; $("bgKieu").value = "tu"; ls("laymau_hp_bg_v1", BG); bgApDung(); });
  });
  if (typeof vgNapXa === "function") { const _napXa31 = vgNapXa; vgNapXa = function (fc) { const r = _napXa31.apply(this, arguments); try { bgApDung(); } catch (e) { /* bỏ */ } return r; }; }
  if (typeof v27VeTinh === "function") { const _veTinh31 = v27VeTinh; v27VeTinh = async function () { await _veTinh31.apply(this, arguments); try { bgApDung(); } catch (e) { /* bỏ */ } }; $("cVnTinh").onchange = v27VeTinh; }
  $("cVnXa").addEventListener("change", bgTenVe);
  map.on("zoomend moveend", () => { clearTimeout(BGT.t); BGT.t = setTimeout(bgTenVe, 120); });
  bgApDung();
})();

/* ---------------- ② gộp nhiều xã thành một vùng ---------------- */
if (!ST.vgop) ST.vgop = {};
var XG = {chon: [], id: "", ban: false, bat: null, lop: L.layerGroup(), sang: L.layerGroup(), xaTinh: {}};
var xg$ = id => document.getElementById(id);
function xgGon(s) { return CORE.khongDau(s).replace(/^(xa|phuong|thi tran|dac khu|thi xa)\s+/, "").replace(/\s+/g, " ").trim(); }
function xgGonTinh(s) { return CORE.khongDau(s).replace(/^(tinh|thanh pho|tp\.?)\s+/, "").replace(/\s+/g, " ").trim(); }
async function xgXaCuaTinh(tinh) {                 // [{ten, mp, bl}] các xã của một tỉnh (tỉnh đang chọn: dùng luôn VG.xa)
  if (typeof V27 !== "undefined" && V27.tinh === tinh && VG.xa && VG.xa.length) return VG.xa;
  if (!MAN || !MAN.vn) throw new Error(T("bộ dữ liệu chưa có ranh giới hành chính Việt Nam"));
  if (!XG.xaTinh[tinh]) XG.xaTinh[tinh] = getText(MAN.vn.xa.replace("{ma}", tinh)).then(t => JSON.parse(t).features.filter(f => f.geometry && /Polygon/.test(f.geometry.type)).map(f => {
    const mp = vgMP(f.geometry), bl = [Infinity, Infinity, -Infinity, -Infinity];
    mp.forEach(pg => pg[0].forEach(q => { bl[0] = Math.min(bl[0], q[0]); bl[1] = Math.min(bl[1], q[1]); bl[2] = Math.max(bl[2], q[0]); bl[3] = Math.max(bl[3], q[1]); }));
    return {ten: vgTenXa(f.properties), mp, bl};
  })).catch(e => { delete XG.xaTinh[tinh]; throw e; });
  return XG.xaTinh[tinh];
}
function xgTinhTen(ma) { return typeof v27TinhTen === "function" ? v27TinhTen(ma) : ma; }
function xgKhoa(c) { return c.tinh + "|" + c.ten; }
async function xgThem(ten, tinh, im) {             // thêm một xã (theo tên đúng trong danh mục và mã tỉnh); trả về true nếu thêm mới
  if (XG.chon.some(c => c.tinh === tinh && c.ten === ten)) return false;
  const ds = await xgXaCuaTinh(tinh), k = CORE.khongDau(ten);
  const x = ds.find(z => CORE.khongDau(z.ten) === k) || ds.find(z => xgGon(z.ten) === xgGon(ten));
  if (!x) { if (!im) msg(T("không thấy ranh giới của {x}", {x: ten}), "wa", 3000); return false; }
  if (XG.chon.some(c => c.tinh === tinh && c.ten === x.ten)) return false;       // tên trong danh mục có thể khác tên trong tệp ranh giới
  XG.chon.push({ten: x.ten, tinh, mp: x.mp, bl: x.bl});
  return true;
}
function xgBo(i) { XG.chon.splice(i, 1); xgVe(); }
function xgDienTich(mp) {                          // ha, xấp xỉ phẳng cục bộ (sai số không đáng kể ở cỡ tỉnh)
  let a = 0; mp.forEach(pg => pg.forEach((r, k) => { const lat0 = r[0][1] * Math.PI / 180, kx = 6371008.8 * Math.PI / 180 * Math.cos(lat0), ky = 6371008.8 * Math.PI / 180; let s = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] * kx) * (r[i][1] * ky) - (r[i][0] * kx) * (r[j][1] * ky); a += (k ? -1 : 1) * Math.abs(s) / 2; }));
  return a / 1e4;
}
function xgHoaTan(mps) {                           // hợp các đa giác; không có thư viện thì giữ nguyên các phần (vẫn đúng cho phân tích)
  if (!mps.length) return [];
  try { if (typeof polygonClipping !== "undefined") return polygonClipping.union.apply(null, mps); } catch (e) { /* bỏ, dùng các phần */ }
  return [].concat(...mps);
}
function xgVe() {
  const tong = XG.chon.reduce((s, c) => s + xgDienTich(c.mp), 0);
  xg$("xgSo").textContent = XG.chon.length ? `(${XG.chon.length}, ${tong.toFixed(0)} ${T("ha")})` : "";
  xg$("xgXa").innerHTML = XG.chon.map((c, i) => `<button type="button" data-bo="${i}" title="${esc(T("bỏ xã này"))}">${esc(c.ten)}${c.tinh !== (typeof V27 !== "undefined" ? V27.tinh : "") ? " · " + esc(xgTinhTen(c.tinh)) : ""} ×</button>`).join("") ||
    `<span class="mu">${T("chưa chọn xã nào")}</span>`;
  xg$("xgXa").querySelectorAll("[data-bo]").forEach(b => { b.onclick = () => xgBo(+b.dataset.bo); });
  XG.sang.clearLayers();
  XG.chon.forEach(c => L.polygon(c.mp.map(pg => pg.map(r => r.map(q => [q[1], q[0]]))), {color: "#f59e0b", weight: 2, fill: true, fillColor: "#fde047", fillOpacity: 0.18, interactive: false, pmIgnore: true}).addTo(XG.sang));
  if (!xg$("xgP").hidden) XG.sang.addTo(map);
}
function xgTim() {
  const q = CORE.khongDau(xg$("xgTim").value), box = xg$("xgKQ"); box.innerHTML = "";
  if (q.length < 2 || typeof V27 === "undefined" || !V27.dm) return;
  const kq = V27.dm.xa.filter(x => CORE.khongDau(x[1]).includes(q)).sort((a, b) => (a[2] === V27.tinh ? 0 : 1) - (b[2] === V27.tinh ? 0 : 1)).slice(0, 12);
  box.innerHTML = kq.map((x, i) => `<button type="button" data-k="${i}">${esc(x[1])} · ${esc(xgTinhTen(x[2]))}</button>`).join("") || `<span class="mu sm">${T("không thấy")}</span>`;
  box.querySelectorAll("[data-k]").forEach(b => { b.onclick = async () => { const x = kq[+b.dataset.k]; await xgThem(x[1], x[2]); xgVe(); }; });
}
function xgTachDong(s) {                           // "Xã A, Tỉnh B" | "Xã A - Tỉnh B" | "Xã A (Tỉnh B)" -> {ten, tinh?}
  s = s.trim(); let tinh = null, m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(s);
  if (m) { s = m[1]; tinh = m[2]; } else { m = /^(.*?)\s*[,–-]\s*(.+)$/.exec(s); if (m) { s = m[1]; tinh = m[2]; } }
  return {ten: s.trim(), tinh: tinh && tinh.trim()};
}
function xgKhopDong(d) {                           // -> {loai: "dung"|"nhieu"|"khong", ung: [[ma, ten, tinh]]}
  const dm = V27.dm, kd = CORE.khongDau(d.ten), g = xgGon(d.ten);
  let ung = dm.xa.filter(x => CORE.khongDau(x[1]) === kd);
  if (!ung.length) ung = dm.xa.filter(x => xgGon(x[1]) === g);
  if (d.tinh) { const gt = xgGonTinh(d.tinh), ts = dm.tinh.filter(t => xgGonTinh(t.ten) === gt || xgGonTinh(t.ten_day_du || "") === gt).map(t => t.ma); ung = ung.filter(x => ts.includes(x[2])); }
  if (ung.length > 1) { const o = ung.filter(x => x[2] === V27.tinh); if (o.length === 1 && !d.tinh) ung = o; }
  return {loai: ung.length === 1 ? "dung" : ung.length ? "nhieu" : "khong", ung};
}
async function xgKhop() {
  const box = xg$("xgKhopKQ"); if (typeof V27 === "undefined" || !V27.dm) { box.textContent = T("chưa nạp danh mục hành chính"); return; }
  const dong = xg$("xgDan").value.split(/[\n;]+/).map(s => s.trim()).filter(Boolean);
  let them = 0; const nhieu = [], khong = [];
  for (const s of dong) {
    const r = xgKhopDong(xgTachDong(s));
    if (r.loai === "dung") { if (await xgThem(r.ung[0][1], r.ung[0][2], true)) them++; }
    else if (r.loai === "nhieu") nhieu.push({s, ung: r.ung}); else khong.push(s);
  }
  xgVe();
  box.innerHTML = `<div>${T("khớp và thêm {n} xã", {n: them})}</div>` +
    (nhieu.length ? `<div>${T("trùng tên, chọn đúng xã:")} ` + nhieu.map((q, i) => `<div><b>${esc(q.s)}</b>: ` + q.ung.map((x, j) => `<button type="button" data-n="${i}:${j}">${esc(x[1])} · ${esc(xgTinhTen(x[2]))}</button>`).join("") + "</div>").join("") + "</div>" : "") +
    (khong.length ? `<div style="color:#b42318">${T("không thấy:")} ${khong.map(esc).join("; ")}</div>` : "");
  box.querySelectorAll("[data-n]").forEach(b => { b.onclick = async () => { const [i, j] = b.dataset.n.split(":").map(Number), x = nhieu[i].ung[j]; await xgThem(x[1], x[2]); b.parentElement.remove(); xgVe(); }; });
}
async function xgBanNhap(ll) {                     // chế độ chọn trên bản đồ: thêm hoặc bỏ xã ở chỗ nhấp
  let x = typeof vgXaTai === "function" ? vgXaTai(ll.lng, ll.lat) : null, tinh = typeof V27 !== "undefined" ? V27.tinh : "";
  if (!x && typeof v27NapTinh === "function") {
    try { await v27NapTinh(); const t = v27TinhTai(ll.lng, ll.lat); if (t) { tinh = t.ma; const ds = await xgXaCuaTinh(tinh); x = ds.find(z => ll.lng >= z.bl[0] && ll.lng <= z.bl[2] && ll.lat >= z.bl[1] && ll.lat <= z.bl[3] && vgPIP(ll.lng, ll.lat, z.mp)) || null; } } catch (e) { /* bỏ */ }
  }
  if (!x) { msg(T("chỗ này không thuộc xã nào"), "wa", 1500); return; }
  const i = XG.chon.findIndex(c => c.tinh === tinh && c.ten === x.ten);
  if (i >= 0) XG.chon.splice(i, 1); else XG.chon.push({ten: x.ten, tinh, mp: x.mp, bl: x.bl});
  xgVe();
}
function xgBatBan(on) {
  XG.ban = on; xg$("xgBan").classList.toggle("on", on);
  if (XG.bat) { map.removeLayer(XG.bat); XG.bat = null; }
  if (on) {
    if (!map.getPane("xgBat")) { map.createPane("xgBat"); map.getPane("xgBat").style.zIndex = 645; }
    XG.bat = L.rectangle([[-85, -180], [85, 180]], {pane: "xgBat", interactive: true, bubblingMouseEvents: false, stroke: false, fillColor: "#000", fillOpacity: 0.01, pmIgnore: true}).addTo(map);
    XG.bat.on("click", e => xgBanNhap(e.latlng));
    map.getContainer().style.cursor = "crosshair";
  } else map.getContainer().style.cursor = "";
}
function xgDS() { return Object.values(ST.vgop || {}); }
function xgPV(id) { const g = ST.vgop && ST.vgop[id]; if (!g) throw new Error(T("không còn vùng gộp này")); const mp = vgMP(g.geom); return {bb: vgBB3857(mp), mp, kieu: "gop", ten: g.ten}; }
function xgNapPV() {                               // đưa các vùng gộp vào mọi ô chọn phạm vi
  ["cdPV", "tkPV", "plPV", "boPV", "s2oPV"].forEach(id => { const s = $(id); if (!s) return; const cu = s.value;
    [...s.options].filter(o => /^gop:/.test(o.value)).forEach(o => o.remove());
    xgDS().forEach(g => { const o = document.createElement("option"); o.value = "gop:" + g.id; o.textContent = T("vùng gộp: {t}", {t: g.ten}); s.appendChild(o); });
    if ([...s.options].some(o => o.value === cu)) s.value = cu; });
  const s = xg$("xgDS"); if (s) { const cu = s.value;
    s.innerHTML = `<option value="">${T("vùng gộp đã lưu ({n})", {n: xgDS().length})}</option>` + xgDS().map(g => `<option value="${g.id}">${esc(g.ten)} · ${g.ha.toFixed(0)} ${T("ha")}</option>`).join("");
    s.value = xgDS().some(g => g.id === cu) ? cu : ""; }
  const c = xg$("xgChon"); if (c) { c.innerHTML = `<option value="">${T("＋ vùng mới")}</option>` + xgDS().map(g => `<option value="${g.id}">${esc(g.ten)}</option>`).join(""); c.value = XG.id || ""; }
}
function xgVeVung(id) {                            // hiện một vùng gộp đã lưu trên bản đồ
  XG.lop.clearLayers(); const g = ST.vgop[id]; if (!g) { map.removeLayer(XG.lop); return; }
  L.geoJSON(g.geom, {style: {color: "#f97316", weight: 3.2, fill: true, fillOpacity: 0.04, fillColor: "#f97316"}, interactive: false, pmIgnore: true}).addTo(XG.lop);
  const nh = bgDiemNhan(vgMP(g.geom)); if (nh) L.marker([nh[1], nh[0]], {icon: L.divIcon({className: "bg-ten", html: `<div style="position:relative;top:20px">${bgTenHTML(g.ten, 15, "#f97316")}</div>`, iconSize: [0, 0]}), interactive: false, pmIgnore: true}).addTo(XG.lop);
  XG.lop.addTo(map);
}
function xgDen(id) { const g = ST.vgop[id]; if (!g) return; map.fitBounds([[g.bl[1], g.bl[0]], [g.bl[3], g.bl[2]]]); xgVeVung(id); }
async function xgLuu() {
  if (!XG.chon.length) { msg(T("chưa chọn xã nào"), "wa", 2500); return null; }
  const ten = xg$("xgTen").value.trim() || XG.chon.slice(0, 3).map(c => c.ten).join(", ") + (XG.chon.length > 3 ? " …" : "");
  const mp = xgHoaTan(XG.chon.map(c => c.mp)), bl = [Infinity, Infinity, -Infinity, -Infinity];
  mp.forEach(pg => pg[0].forEach(q => { bl[0] = Math.min(bl[0], q[0]); bl[1] = Math.min(bl[1], q[1]); bl[2] = Math.max(bl[2], q[0]); bl[3] = Math.max(bl[3], q[1]); }));
  const id = XG.id || "g" + Date.now().toString(36);
  ST.vgop[id] = {id, ten, xa: XG.chon.map(c => ({ten: c.ten, tinh: c.tinh})), geom: {type: "MultiPolygon", coordinates: mp}, bl, ha: xgDienTich(mp),
                 hoa_tan: typeof polygonClipping !== "undefined", tao_luc: new Date().toISOString()};
  XG.id = id; save(); xgNapPV(); xg$("xgDS").value = id; xgVeVung(id);
  xg$("xgTT").textContent = T("đã lưu {t}: {n} xã, {a} ha, {p} phần", {t: ten, n: XG.chon.length, a: ST.vgop[id].ha.toFixed(0), p: mp.length});
  document.dispatchEvent(new CustomEvent("vgop31"));
  return ST.vgop[id];
}
async function xgNapVung(id) {                     // sửa một vùng đã lưu: nạp lại các xã
  XG.id = id || ""; XG.chon = [];
  const g = ST.vgop[id]; xg$("xgTen").value = g ? g.ten : "";
  if (g) for (const x of g.xa) { try { await xgThem(x.ten, x.tinh, true); } catch (e) { /* tỉnh không nạp được */ } }
  xgVe();
}
function xgMo(on) {
  const P = xg$("xgP"); P.hidden = on === false ? true : on === true ? false : !P.hidden;
  if (P.hidden) { xgBatBan(false); map.removeLayer(XG.sang); return; }
  xgNapPV(); xgVe(); XG.sang.addTo(map);
}
function xgGeoJSON(id) {
  const g = ST.vgop[id || XG.id]; if (!g) { msg(T("chưa lưu vùng"), "wa", 2000); return; }
  const fc = {type: "FeatureCollection", features: [{type: "Feature", properties: {ten: g.ten, so_xa: g.xa.length, dien_tich_ha: +g.ha.toFixed(2), xa: g.xa.map(x => x.ten).join("; ")}, geometry: g.geom}]};
  download(`vung_gop_${typeof boSlug === "function" ? boSlug(g.ten) : g.id}.geojson`, JSON.stringify(fc), "application/geo+json");
}
(function () {
  if (!xg$("xgP")) return;
  $("bGop").onclick = () => xgMo(true);
  xg$("xgDong").onclick = () => xgMo(false);
  xg$("xgTim").addEventListener("input", xgTim);
  xg$("xgKhop").onclick = xgKhop;
  xg$("xgBan").onclick = () => xgBatBan(!XG.ban);
  xg$("xgCaTinh").onclick = () => { (VG.xa || []).forEach(x => { if (!XG.chon.some(c => c.tinh === V27.tinh && c.ten === x.ten)) XG.chon.push({ten: x.ten, tinh: V27.tinh, mp: x.mp, bl: x.bl}); }); xgVe(); };
  xg$("xgBoHet").onclick = () => { XG.chon = []; xgVe(); };
  xg$("xgLuu").onclick = xgLuu;
  xg$("xgDen").onclick = () => { if (XG.id) xgDen(XG.id); else if (XG.chon.length) { const b = XG.chon.reduce((a, c) => [Math.min(a[0], c.bl[0]), Math.min(a[1], c.bl[1]), Math.max(a[2], c.bl[2]), Math.max(a[3], c.bl[3])], [Infinity, Infinity, -Infinity, -Infinity]); map.fitBounds([[b[1], b[0]], [b[3], b[2]]]); } };
  xg$("xgGeo").onclick = () => xgGeoJSON();
  xg$("xgXoa").onclick = () => { if (!XG.id || !ST.vgop[XG.id] || !confirm(T("Xoá vùng gộp {t}?", {t: ST.vgop[XG.id].ten}))) return; delete ST.vgop[XG.id]; XG.id = ""; save(); xgNapPV(); XG.lop.clearLayers(); xg$("xgTT").textContent = ""; };
  xg$("xgChon").onchange = () => xgNapVung(xg$("xgChon").value);
  xg$("xgDS").onchange = () => { const v = xg$("xgDS").value; if (v) xgDen(v); else { XG.lop.clearLayers(); map.removeLayer(XG.lop); } };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && XG.ban) xgBatBan(false); });
  const el = xg$("xgP"); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
  const dau = el.querySelector(".vg-dau"); let st = null;
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; el.style.left = Math.max(0, st.l + e.clientX - st.x) + "px"; el.style.top = Math.max(0, st.t + e.clientY - st.y) + "px"; });
  document.addEventListener("mouseup", () => { st = null; });
  xgNapPV();
})();
if (typeof boMo === "function") { const _boMo31 = boMo; boMo = async function () { const r = await _boMo31.apply(this, arguments); xgNapPV(); return r; }; }

/* ---------------- ③ Sentinel-2 trực tuyến ---------------- */
var S2O = {tok: 0, mat: {}, chay: false, keo: {B2: [100, 1800], B3: [200, 2000], B4: [100, 2200], B5: [300, 2800], B6: [500, 4500], B7: [500, 5000], B8: [500, 5000], B8A: [500, 5000], B11: [300, 4000], B12: [100, 3200]}};
var S2OV = Object.assign({mode: "tci", pre: "432", chi: "NDVI", gain: 1}, ls("laymau_hp_s2ov_v1") || {});
var S2O_PRE = {"432": ["B4", "B3", "B2"], "843": ["B8", "B4", "B3"], "1184": ["B11", "B8", "B4"], "128a4": ["B12", "B8A", "B4"], "1182": ["B11", "B8", "B2"]};
var s2o$ = id => document.getElementById(id);
function s2oKH() { return ST.s2o && ST.s2o.nam ? ST.s2o : null; }
function s2oNamCo() { const K = s2oKH(); return K ? Object.keys(K.nam).map(Number).filter(y => (K.nam[y].chon || []).length).sort((a, b) => a - b) : []; }
function s2oL0() {
  const ys = s2oNamCo(); if (!ys.length) return null;
  return {id: "s2o", ten: "Sentinel-2 trực tuyến (AWS): ảnh ghép theo năm, tổ hợp màu, chỉ số", kieu: "s2o", duong_dan: "s2o:{y}", nam: ys,
          ten_ru: "Sentinel-2 онлайн (AWS): годовой композит, синтезы, индексы", ten_en: "Sentinel-2 online (AWS): yearly composite, colour composites, indices"};
}
function s2oCanh(y, diem) {                         // các cảnh đã chọn của năm y
  const K = s2oKH(), N = K && K.nam[y]; if (!N) return [];
  const by = {}; (N.ung || []).forEach(s => { by[s.id] = s; });
  return (N.chon || []).map(id => by[id]).filter(Boolean);
}
function s2oCanBang() {                             // các băng cần đọc theo cách xem
  if (S2OV.mode === "tci") return ["TCI"];
  if (S2OV.mode === "idx") { const c = csLay(S2OV.chi) || csLay("NDVI"); const b = c && c.f ? c.f.bang.filter(q => S2OC.BANG.includes(q)) : []; return b.length ? b : ["B4", "B8"]; }
  return S2O_PRE[S2OV.pre] || S2O_PRE["432"];
}
function s2oTo(vals, bang, w, h) {                  // giá trị ghép -> RGBA
  const out = new Uint8ClampedArray(w * h * 4), nb = bang[0] === "TCI" ? 3 : bang.length, g = Math.max(0.1, +S2OV.gain || 1);
  const cs = S2OV.mode === "idx" ? (csLay(S2OV.chi) || csLay("NDVI")) : null, lt = cs ? lut2(cs.mau || "ndvi") : null, bs = s2Bang(), v = new Array(bs.length).fill(0);
  for (let k = 0; k < w * h; k++) {
    const o = k * 4;
    if (bang[0] === "TCI") { const r = vals[k * 3]; if (r !== r) continue; for (let q = 0; q < 3; q++) out[o + q] = Math.min(255, vals[k * 3 + q] * g); out[o + 3] = 255; continue; }
    let z = false; for (let q = 0; q < nb; q++) if (vals[k * nb + q] !== vals[k * nb + q]) { z = true; break; } if (z) continue;
    if (cs) { bang.forEach((b, q) => { v[bs.indexOf(b)] = vals[k * nb + q] / 10000; }); const x = cs.f ? cs.f(v) : null; if (x == null) continue;
      const t = Math.max(0, Math.min(1, (x - cs.lo) / (cs.hi - cs.lo))), c = lt[1 + Math.round(t * 254)]; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; continue; }
    for (let q = 0; q < 3; q++) { const kg = S2O.keo[bang[q]] || [0, 3000]; out[o + q] = Math.round(255 * Math.max(0, Math.min(1, (vals[k * nb + q] - kg[0]) / ((kg[1] - kg[0]) / g)))); }
    out[o + 3] = 255;
  }
  return out;
}
async function s2oVe(y, bb, w, h, canvas, opt) {   // opt.diem: [lon, lat] -> chỉ cảnh quang đãng đầu tiên tại điểm (dải ảnh nhanh)
  const a = S2OC.m2ll(bb[0], bb[1]), c = S2OC.m2ll(bb[2], bb[3]);                 // chỉ các cảnh có hộp bao chạm ô đang vẽ
  let ds = s2oCanh(y).filter(s => !s.bb || (s.bb[0] <= c[0] && s.bb[2] >= a[0] && s.bb[1] <= c[1] && s.bb[3] >= a[1]));
  if (!ds.length) return null;
  const K = s2oKH();
  if (opt && opt.diem) { let mot = null; for (const sc of ds) { try { if (await S2OC.trongTaiDiem(sc, opt.diem[0], opt.diem[1])) { mot = sc; break; } } catch (e) { /* bỏ */ } } ds = [mot || ds[0]]; }
  const bang = s2oCanBang(), vals = await S2OC.ghep(ds, bang, bb, w, h, K.cfg.che !== false && !(opt && opt.diem));
  const px = s2oTo(vals, bang, w, h);
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (ctx) { const img = ctx.createImageData(w, h); img.data.set(px); ctx.putImageData(img, 0, 0); }
  return px;
}
var S2OLayer = L.GridLayer.extend({
  initialize(url, opts) { this._url = url; this._y = +((/s2o:(\d{4})/.exec(url) || [])[1]); L.GridLayer.prototype.initialize.call(this, opts); },
  createTile(coords, done) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    s2oVe(this._y, CORE.tileBbox(coords.z, coords.x, coords.y), 256, 256, c).then(() => done(null, c))
      .catch(e => { this._err = (this._err || 0) + 1; if (this._err === 3) olMsg(T("không đọc được {l}: {e}", {l: "Sentinel-2 AWS", e: e.message || e})); done(null, c); });
    return c;
  },
});
function s2ovLuu() {
  ls("laymau_hp_s2ov_v1", S2OV);
  if (typeof OVL !== "undefined" && OVL.s2o && OVL.s2o.layer && OVL.s2o.layer.redraw) OVL.s2o.layer.redraw();
  if ($("selStrip").value === "s2o") renderStrip();
}
function s2ovUI(div) {
  const opt = (a, sel) => a.map(([v, t]) => `<option value="${esc(String(v))}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`).join("");
  const chi = (typeof csDS === "function" ? csDS() : []).map(c => [c.id, c.ten]);
  div.setAttribute("data-noi18n", "");
  div.innerHTML = `<div class="row sm"><select data-k="mode">${opt([["tci", T("màu thật của ESA (nhanh)")], ["rgb", T("tổ hợp màu")], ["idx", T("chỉ số")]], S2OV.mode)}</select>
    <select data-k="pre" data-show="rgb">${opt(Object.keys(S2O_PRE).filter(k => S2_PRE_TEN[k]).map(k => [k, T(S2_PRE_TEN[k])]), S2OV.pre)}</select>
    <select data-k="chi" data-show="idx">${opt(chi, S2OV.chi)}</select></div>
    <div class="row sm">${T("tương phản")} <input type="range" data-k="gain" min="0.5" max="3" step="0.1" value="${S2OV.gain}"> <button type="button" data-k="mo">${T("kế hoạch cảnh…")}</button></div>
    <div class="mu sm">${esc(s2oTomTat())}</div>`;
  const upd = () => div.querySelectorAll("[data-show]").forEach(e => { e.hidden = e.dataset.show !== S2OV.mode; });
  div.querySelectorAll("[data-k]").forEach(e => {
    if (e.dataset.k === "mo") { e.onclick = () => s2oMo(true); return; }
    e.addEventListener("change", () => { S2OV[e.dataset.k] = e.type === "range" ? +e.value : e.value; upd(); s2ovLuu(); });
  });
  upd();
}
function s2oTomTat() {
  const K = s2oKH(); if (!K) return "";
  const t = K.cfg.thang, ys = s2oNamCo();
  return T("{pv}; tháng {a} đến {b}; {n} năm có ảnh ({y0}-{y1}); {s} cảnh ghép", {pv: !K.pv ? "" : K.pv.kieu === "nhin" ? T("khung nhìn") : K.pv.ten, a: t[0], b: t[1], n: ys.length, y0: ys[0], y1: ys[ys.length - 1], s: K.cfg.so});
}
async function renderStripS2O(L0, p, bb, ys, tok) {
  const box = $("strip"), WS = typeof stripCo === "function" ? stripCo() : 97, half = (bb[2] - bb[0]) / 2, nhanh = (s2o$("s2oDai") || {}).value !== "ghep";
  for (const y of ys) {
    const it = document.createElement("div"); it.className = "it" + (y === ST.nam ? " cur" : "");
    const cv = document.createElement("canvas"); cv.width = cv.height = WS; it.appendChild(cv);
    it.insertAdjacentHTML("beforeend", `<span class="lb">${y}</span>` + (p.nhan[y] ? `<span class="lc" style="background:${color(p.nhan[y])}"></span>` : ""));
    it.onclick = () => setYear(y); box.appendChild(it);
    if (!L0.nam.includes(y)) { const g = cv.getContext && cv.getContext("2d"); if (g) { g.fillStyle = "#555"; g.fillText(T("không có"), WS / 2 - 22, WS / 2); } continue; }
    s2oVe(y, bb, WS, WS, cv, nhanh ? {diem: [p.lon, p.lat]} : null).then(() => { if (tok === stripTok && typeof stripDanh === "function") stripDanh(cv, WS, half); })
      .catch(e => { if (tok === stripTok) $("stripmsg").textContent = T("không đọc được: ") + (e.message || e); });
  }
}
/* giá trị tại điểm: đọc khi bấm nút (một năm, mọi băng, vài MB) */
async function s2oGiaTri(p, y) {
  const ds = s2oCanh(y); if (!ds.length) return null;
  const m = S2OC.ll2m(p.lon, p.lat), bb = [m[0] - 5, m[1] - 5, m[0] + 5, m[1] + 5];
  const v = await S2OC.ghep(ds, S2OC.BANG, bb, 1, 1, s2oKH().cfg.che !== false);
  return Array.from(v);
}
if (typeof giaTriTai === "function") {
  const _gtt31 = giaTriTai;
  giaTriTai = async function (ll) {
    const r = await _gtt31(ll);
    if (typeof OVL !== "undefined" && OVL.s2o && OVL.s2o.on && s2oNamCo().includes(ST.nam))
      r.push([T("S2 trực tuyến {y}", {y: ST.nam}), `<span data-s2ogt="${ll.lng.toFixed(6)},${ll.lat.toFixed(6)}"><button type="button" data-s2odoc>${T("đọc 10 băng tại điểm (vài MB)")}</button></span>`]);
    return r;
  };
}
document.addEventListener("click", async e => {
  const b = e.target.closest && e.target.closest("[data-s2odoc]"); if (!b) return;
  e.preventDefault(); const sp = b.closest("[data-s2ogt]"), [lon, lat] = sp.dataset.s2ogt.split(",").map(Number); b.disabled = true; b.textContent = T("đang đọc…");
  try { sp.innerHTML = await s2oDiemHTML(lon, lat, ST.nam); }        // bản 3.2: từng cảnh, quang đãng hay mây tại điểm
  catch (er) { sp.textContent = T("không đọc được: ") + (er.message || er); }
});
/* bảng kế hoạch */
function s2oCfgDoc() {
  return {thang: [+s2o$("s2oT1").value, +s2o$("s2oT2").value], nam: [+s2o$("s2oN1").value, +s2o$("s2oN2").value], may: +s2o$("s2oMay").value || 60,
          so: +s2o$("s2oSo").value, che: s2o$("s2oChe").checked, bo: s2o$("s2oBo").value, pv: s2o$("s2oPV").value};
}
function s2oPhamVi(pv) {                            // -> {ten, bl [w,s,e,n] lon/lat, mp | null}
  if (/^gop:/.test(pv)) { const g = ST.vgop[pv.slice(4)]; if (!g) throw new Error(T("không còn vùng gộp này")); return {ten: g.ten, bl: g.bl, mp: vgMP(g.geom), kieu: "gop"}; }
  if (pv === "tinh" && typeof VG !== "undefined" && VG.xa && VG.xa.length) { const mp = [].concat(...VG.xa.map(x => x.mp)), bl = VG.xa.reduce((a, x) => [Math.min(a[0], x.bl[0]), Math.min(a[1], x.bl[1]), Math.max(a[2], x.bl[2]), Math.max(a[3], x.bl[3])], [Infinity, Infinity, -Infinity, -Infinity]);
    return {ten: (typeof v27TinhTen === "function" && v27TinhTen()) || T("cả tỉnh"), bl, mp, kieu: "tinh"}; }
  const b = map.getBounds(); return {ten: T("khung nhìn"), bl: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], mp: null, kieu: "nhin"};
}
async function s2oTim() {
  const tok = ++S2O.tok, cfg = s2oCfgDoc(), tt = s2o$("s2oTT");
  try {
    if (!(cfg.nam[0] <= cfg.nam[1])) throw new Error(T("năm đầu phải nhỏ hơn hoặc bằng năm cuối"));
    const P = s2oPhamVi(cfg.pv), rong = (P.bl[2] - P.bl[0]) * 111 * Math.cos((P.bl[1] + P.bl[3]) / 2 * Math.PI / 180), cao = (P.bl[3] - P.bl[1]) * 111;
    if (rong * cao > 40000) throw new Error(T("phạm vi quá rộng ({a} km²): chọn vùng nhỏ hơn hoặc phóng to", {a: Math.round(rong * cao)}));
    const luoi = S2OC.luoiPhamVi(P.bl, P.mp, 40); if (!luoi.pts.length) throw new Error(T("phạm vi rỗng"));
    const K = {cfg, pv: {ten: P.ten, bl: P.bl, kieu: P.kieu}, nam: {}, tao_luc: new Date().toISOString(), nguon: "Element 84 Earth Search, " + cfg.bo};
    S2O.mat = {};
    for (let y = cfg.nam[0]; y <= cfg.nam[1]; y++) {
      if (tok !== S2O.tok) return;
      tt.textContent = T("năm {y}: đang tìm cảnh…", {y});
      let ung = [];
      try { ung = await S2OC.tim({bo: cfg.bo, bbox: P.bl, datetime: S2OC.cuaSo(y, cfg.thang), may: cfg.may}); } catch (e) { K.nam[y] = {ung: [], chon: [], loi: String(e.message || e)}; continue; }
      const soO = Math.max(1, new Set(ung.map(s => s.o_mgrs || s.epsg)).size);        // phạm vi trải nhiều ô MGRS: cần nhiều cảnh hơn
      ung = ung.slice(0, Math.min(48, 14 * soO));
      tt.textContent = T("năm {y}: chấm {n} cảnh theo lớp SCL…", {y, n: ung.length});
      const ms = [];
      for (let i = 0; i < ung.length; i += 6) {                                         // 6 cảnh một lượt: đỡ dồn yêu cầu
        if (tok !== S2O.tok) return;
        ms.push(...await Promise.all(ung.slice(i, i + 6).map(sc => S2OC.matNa(sc, luoi).catch(() => new Uint8Array(luoi.pts.length)))));
      }
      ung.forEach((sc, i) => { const m = ms[i]; let t = 0, c = 0; for (const v of m) { if (v) c++; if (v === 2) t++; } sc.ro = +(t / m.length).toFixed(3); sc.phu = +(c / m.length).toFixed(3); });
      const ch = S2OC.chon(ms.map(m => ({m})), cfg.so, (cfg.so + 3) * soO);
      S2O.mat[y] = Object.fromEntries(ung.map((sc, i) => [sc.id, ms[i]]));
      const chon = ch.chon.map(i => ung[i]).sort((a, b) => b.ro - a.ro).map(s => s.id);
      K.nam[y] = {ung, chon, phu: +ch.phu.toFixed(3), tb: +ch.tb.toFixed(2)};
      ST.s2o = K; s2oBang();
    }
    ST.s2o = K; save(); s2oBang();
    tt.textContent = T("xong: {n} năm có ảnh", {n: s2oNamCo().length});
    s2oSauDoi(true);
  } catch (e) { if (tok === S2O.tok) tt.textContent = T("lỗi: ") + (e.message || e); }
}
function s2oSauDoi(bat) {                           // kế hoạch đổi: dựng lại lớp, bật lớp, về năm có ảnh
  if (typeof OVL !== "undefined" && OVL.s2o && OVL.s2o.layer) { map.removeLayer(OVL.s2o.layer); OVL.s2o.layer = null; }
  if (typeof OVL !== "undefined") delete OVL.s2o;
  buildOverlays(); buildStripSelect();
  if (bat && OVL.s2o) { OVL.s2o.on = true; savePref(); const ys = s2oNamCo(); if (ys.length && !ys.includes(ST.nam)) setYear(ys[ys.length - 1]); else refreshOverlays(); buildOverlays(); }
}
function s2oDoiChon(y, id, on) {
  const N = ST.s2o.nam[y]; const s = new Set(N.chon); if (on) s.add(id); else s.delete(id);
  N.chon = N.ung.filter(x => s.has(x.id)).sort((a, b) => b.ro - a.ro).map(x => x.id);
  const M = S2O.mat[y]; if (M) { const ms = N.chon.map(i => M[i]).filter(Boolean); if (ms.length === N.chon.length) { const n = ms.length ? ms[0].length : 0, dem = new Uint8Array(n);
    ms.forEach(m => { for (let k = 0; k < n; k++) if (m[k] === 2) dem[k]++; }); let phu = 0, tb = 0; for (let k = 0; k < n; k++) { if (dem[k]) phu++; tb += dem[k]; } N.phu = n ? +(phu / n).toFixed(3) : 0; N.tb = n ? +(tb / n).toFixed(2) : 0; } else { N.phu = null; N.tb = null; } }
  save(); s2oBang(); s2oSauDoi(false);
}
function s2oBang() {
  const K = s2oKH(), box = s2o$("s2oBang"); if (!box) return;
  if (!K) { box.innerHTML = `<div class="mu sm">${T("chưa có kế hoạch cảnh: chọn phạm vi, tháng, năm rồi bấm Tìm cảnh")}</div>`; return; }
  const pc = v => v == null ? "-" : (100 * v).toFixed(0) + " %";
  box.innerHTML = `<div class="sm">${esc(s2oTomTat())}</div><table class="sm"><tr><th>${T("năm")}</th><th>${T("cảnh")}</th><th>${T("đã chọn (ngày, % quang đãng trong phạm vi)")}</th><th>${T("phủ")}</th><th></th></tr>` +
    Object.keys(K.nam).sort().map(y => { const N = K.nam[y], by = {}; (N.ung || []).forEach(s => { by[s.id] = s; });
      return `<tr><td>${y}</td><td>${(N.ung || []).length}</td><td>${N.loi ? `<span style="color:#b42318">${esc(N.loi)}</span>` : (N.chon || []).map(id => by[id] ? `${by[id].ngay} (${pc(by[id].ro)})` : id).join(", ") || `<span class="mu">${T("không có cảnh dùng được")}</span>`}
        <details><summary class="mu">${T("chọn lại")}</summary>${(N.ung || []).map(s => `<label style="display:block"><input type="checkbox" data-y="${y}" data-id="${esc(s.id)}"${N.chon.includes(s.id) ? " checked" : ""}> ${s.ngay} · ${T("mây cảnh")} ${s.may} % · ${T("quang đãng")} ${pc(s.ro)} · ${esc(s.o_mgrs || "")}</label>`).join("")}</details></td>
        <td>${pc(N.phu)}${N.tb != null ? ` · ${N.tb}×` : ""}</td><td>${(N.chon || []).length ? `<button type="button" data-xem="${y}">${T("xem")}</button>` : ""}</td></tr>`; }).join("") + "</table>";
  box.querySelectorAll("[data-xem]").forEach(b => { b.onclick = () => { if (OVL.s2o) { OVL.s2o.on = true; savePref(); buildOverlays(); } setYear(+b.dataset.xem); }; });
  box.querySelectorAll("input[data-y]").forEach(c => { c.onchange = () => s2oDoiChon(c.dataset.y, c.dataset.id, c.checked); });
}
function s2oCSV() {
  const K = s2oKH(); if (!K) return;
  const r = ["nam,canh,ngay,may_canh_pct,quang_dang_pham_vi,o_mgrs,epsg,offset,da_chon"];
  Object.keys(K.nam).sort().forEach(y => (K.nam[y].ung || []).forEach(s => r.push([y, s.id, s.ngay, s.may, s.ro, s.o_mgrs, s.epsg, s.o, K.nam[y].chon.includes(s.id) ? 1 : 0].join(","))));
  download(`s2_truc_tuyen_canh_${stamp()}.csv`, r.join("\n"), "text/csv");
}
function s2oNapKH(j) {
  if (!j || !j.nam || !j.cfg) throw new Error(T("tệp không phải kế hoạch cảnh Sentinel-2"));
  ST.s2o = {cfg: j.cfg, pv: j.pv, nam: j.nam, tao_luc: j.tao_luc, nguon: j.nguon}; S2O.mat = {}; save(); s2oDien(); s2oBang(); s2oSauDoi(true);
}
function s2oDien() {                                // đưa cấu hình kế hoạch (hoặc mặc định) lên các ô
  const K = s2oKH(), c = K ? K.cfg : {thang: [1, 12], nam: [new Date().getFullYear() - 6, new Date().getFullYear()], may: 60, so: 3, che: true, bo: "sentinel-2-l2a", pv: "nhin"};
  const th = Array.from({length: 12}, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join(""), ny = new Date().getFullYear();
  const nm = Array.from({length: ny - 2016}, (_, i) => `<option value="${2017 + i}">${2017 + i}</option>`).join("");
  s2o$("s2oT1").innerHTML = th; s2o$("s2oT2").innerHTML = th; s2o$("s2oN1").innerHTML = nm; s2o$("s2oN2").innerHTML = nm;
  s2o$("s2oT1").value = c.thang[0]; s2o$("s2oT2").value = c.thang[1]; s2o$("s2oN1").value = Math.max(2017, c.nam[0]); s2o$("s2oN2").value = Math.min(ny, c.nam[1]);
  s2o$("s2oMay").value = c.may; s2o$("s2oSo").value = c.so; s2o$("s2oChe").checked = c.che !== false; s2o$("s2oBo").value = c.bo;
  const pv = s2o$("s2oPV"); const cu = c.pv;
  pv.innerHTML = `<option value="nhin">${T("khung nhìn hiện tại")}</option>` + (typeof VG !== "undefined" && VG.xa && VG.xa.length ? `<option value="tinh">${T("cả tỉnh đang chọn")}</option>` : "");
  xgNapPV(); if ([...pv.options].some(o => o.value === cu)) pv.value = cu;
  s2oThangGiai();
}
function s2oThangGiai() {
  const a = +s2o$("s2oT1").value, b = +s2o$("s2oT2").value;
  s2o$("s2oTGiai").textContent = a > b ? T("năm Y gồm tháng {a} năm Y−1 đến tháng {b} năm Y (qua năm, như mùa khô)", {a, b}) : T("tháng {a} đến tháng {b} trong cùng năm", {a, b});
}
function s2oMo(on) {
  const P = s2o$("s2oP"); P.hidden = on === false ? true : on === true ? false : !P.hidden;
  if (P.hidden) return; s2oDien(); s2oBang();
}
(function () {
  if (!s2o$("s2oP")) return;
  $("bS2O").onclick = () => s2oMo();
  s2o$("s2oDong").onclick = () => s2oMo(false);
  s2o$("s2oTim").onclick = s2oTim;
  s2o$("s2oDung").onclick = () => { S2O.tok++; s2o$("s2oTT").textContent = T("đã dừng"); };
  s2o$("s2oCSV").onclick = s2oCSV;
  s2o$("s2oLuuKH").onclick = () => { const K = s2oKH(); if (!K) return; download(`s2_truc_tuyen_ke_hoach_${stamp()}.json`, JSON.stringify(Object.assign({loai: "s2o_ke_hoach"}, K)), "application/json"); };
  s2o$("s2oNapKH").onclick = () => $("s2oFile").click();
  $("s2oFile").onchange = async () => { const f = $("s2oFile").files[0]; if (!f) return; try { s2oNapKH(JSON.parse(await f.text())); msg(T("đã nạp kế hoạch cảnh"), "ok", 2500); } catch (e) { msg(T("lỗi: ") + (e.message || e), "er", 5000); } $("s2oFile").value = ""; };
  ["s2oT1", "s2oT2"].forEach(id => s2o$(id).addEventListener("change", s2oThangGiai));
  s2o$("s2oDai").addEventListener("change", () => { if ($("selStrip").value === "s2o") renderStrip(); });
  const el = s2o$("s2oP"); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
  const dau = el.querySelector(".vg-dau"); let st = null;
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; el.style.left = Math.max(0, st.l + e.clientX - st.x) + "px"; el.style.top = Math.max(0, st.t + e.clientY - st.y) + "px"; });
  document.addEventListener("mouseup", () => { st = null; });
})();
/* tệp tiến độ: ghép vùng gộp, kế hoạch cảnh */
if (typeof phienNhap === "function") {
  const _phienNhap31 = phienNhap;
  phienNhap = async function (j) {
    const st = (j && j.st) || {};
    Object.entries(st.vgop || {}).forEach(([k, v]) => { if (!ST.vgop[k]) ST.vgop[k] = v; });
    if (st.s2o && st.s2o.nam && !s2oKH()) ST.s2o = st.s2o;
    save(); xgNapPV();
    return _phienNhap31(j);
  };
}
var _setLang31 = setLang;
setLang = function (l) { _setLang31(l); ["s2oTT", "xgTT", "xgKhopKQ"].forEach(id => { if ($(id)) $(id).textContent = ""; }); xgNapPV(); if (!s2o$("s2oP").hidden) { s2oDien(); s2oBang(); } if (!xg$("xgP").hidden) xgVe(); };
if (typeof xbNguonMac === "function") {             // dòng nguồn khi xuất bản đồ có lớp S2 trực tuyến
  const _xbNg31 = xbNguonMac;
  xbNguonMac = function () { const s = _xbNg31.apply(this, arguments); return OVL.s2o && OVL.s2o.on && !/Sentinel-2/.test(s) ? s + "; Copernicus Sentinel-2 (ESA), AWS Open Data" : s; };
}
