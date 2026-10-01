/* =============================== BẢN 2.7: ẢNH NỀN GOOGLE, OSM, NHÃN; DẢI ẢNH THEO NĂM TỪ WAYBACK, EOX; HÀNH CHÍNH VIỆT NAM =============================== */
/* Dải ảnh theo năm chạy được ở mọi nơi, kể cả chỗ bộ dữ liệu không có ảnh: Sentinel-2 cloudless của EOX (ảnh tổng hợp năm 10 m,
   2016-2025, CC BY-NC-SA 4.0) hoặc Esri Wayback (bản phát hành gần năm, độ phân giải cao). Ranh giới 34 tỉnh, 3321 xã: chọn tỉnh
   là nạp các xã của tỉnh đó cho tìm xã, chọn vùng, phát hiện thay đổi, thống kê, phân loại. */
const V27 = {nhan: null, tinhL: null, tinhGJ: null, dm: null, tinh: null, man: null, phu: {}, sang: null};
const EOX_NAM = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const NEN27 = {gm: ["m", 20], gs: ["s", 20], gy: ["y", 20], gp: ["p", 15], osm: [null, 19]};
const W3857 = 20037508.342789244;
function ggUrl(l) { return `https://mt{s}.google.com/vt/lyrs=${l}&x={x}&y={y}&z={z}&hl=${LANG === "vi" ? "vi" : LANG}`; }

/* ---------- ảnh nền ---------- */
const _setBase27 = setBase;
setBase = function () {
  const m = $("selBase").value, N = NEN27[m], wb = !N && m !== "none";
  $("selRel").parentElement.hidden = !wb;
  if (!N) { _setBase27(); v27Nhan(); return; }
  if (base) { map.removeLayer(base); base = null; }
  tileWarn(false); PHONG.n = 0; PHONG.z = null;
  base = m === "osm" ? L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 21, maxNativeZoom: 19, attribution: "© OpenStreetMap contributors"})
    : L.tileLayer(ggUrl(N[0]), {subdomains: "0123", maxZoom: 21, maxNativeZoom: N[1], attribution: "© Google"});
  base.addTo(map); base.bringToBack();
  $("relnote").textContent = m === "osm" ? T("OpenStreetMap: bản đồ cộng đồng, không theo năm") : T("Google: ảnh, bản đồ hiện tại (không theo năm); dùng theo điều khoản của Google");
  phongNote(); v27Nhan();
};
function v27Nhan() {                          // lớp nhãn (địa danh, đường) trên mọi ảnh nền và lớp đối chiếu, dưới điểm
  const on = $("cNhan").checked, ng = $("selNhan").value;
  if (V27.nhan) { map.removeLayer(V27.nhan); V27.nhan = null; }
  ls("laymau_hp_nhan_v1", {on, ng});
  if (!on) return;
  if (!map.getPane("nhan27")) { const p = map.createPane("nhan27"); p.style.zIndex = 390; p.style.pointerEvents = "none"; }
  V27.nhan = ng === "esri"
    ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {pane: "nhan27", maxZoom: 21, maxNativeZoom: 19, attribution: "Esri"})
    : L.tileLayer(ggUrl("h"), {pane: "nhan27", subdomains: "0123", maxZoom: 21, maxNativeZoom: 20, attribution: "© Google"});
  V27.nhan.addTo(map);
}

/* ---------- dải ảnh theo năm: Sentinel-2 cloudless (EOX), Esri Wayback ---------- */
function eoxLop(y) { return y === 2016 ? "s2cloudless_3857" : `s2cloudless-${y}_3857`; }
let v27Tai = function (src) {                 // ảnh ô: thử CORS trước (để gửi được cho AI), không được thì nạp thường (chỉ để xem)
  return new Promise((ok, no) => {
    const a = new Image(); a.crossOrigin = "anonymous";
    a.onload = () => ok({im: a, sach: true});
    a.onerror = () => { const b = new Image(); b.onload = () => ok({im: b, sach: false}); b.onerror = () => no(new Error("ảnh")); b.src = src; };
    a.src = src;
  });
};
async function v27ONguon(ng, y, z, x, yy) {
  if (ng === "eox") { const r = await v27Tai(`https://tiles.maps.eox.at/wmts/1.0.0/${eoxLop(y)}/default/g/${z}/${yy}/${x}.jpg`); return {im: r.im, sach: r.sach, sx: 0, sy: 0, s: 256}; }
  const rel = REL[CORE.releaseForYear(REL, y)][1], c = {z, x, y: yy}; let o = oCha(c, 0), r = rel;
  try { const tim = await Promise.race([timCha(rel, c), new Promise((_, no) => setTimeout(() => no(new Error("tilemap")), 6000))]); if (tim) { o = tim.o; r = tim.r; } } catch (e) { /* thử thẳng */ }
  const q = await v27Tai(`${WB}/tile/${r}/${o.z}/${o.y}/${o.x}`);
  return {im: q.im, sach: q.sach, sx: o.ox, sy: o.oy, s: o.sub};
}
function v27Zoom(ng, bb, W) { return Math.max(1, Math.min(ng === "eox" ? 15 : 19, Math.ceil(Math.log2(2 * W3857 * W / (256 * (bb[2] - bb[0])))))); }
async function v27Ve(ng, y, bb, W, cv) {       // vẽ khung bb (3857) cỡ W × W vào canvas từ các ô của nguồn
  const g = cv.getContext && cv.getContext("2d"); if (!g) return {sach: false};
  const z = v27Zoom(ng, bb, W), ts = 2 * W3857 / (1 << z), k = W / (bb[2] - bb[0]);
  const tx0 = Math.floor((bb[0] + W3857) / ts), tx1 = Math.floor((bb[2] + W3857) / ts), ty0 = Math.floor((W3857 - bb[3]) / ts), ty1 = Math.floor((W3857 - bb[1]) / ts);
  let sach = true, n = 0; const vc = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++)
    vc.push(v27ONguon(ng, y, z, tx, ty).then(o => {
      g.imageSmoothingEnabled = true;
      g.drawImage(o.im, o.sx, o.sy, o.s, o.s, (tx * ts - W3857 - bb[0]) * k, (bb[3] - (W3857 - ty * ts)) * k, ts * k + 0.5, ts * k + 0.5);
      n++; if (!o.sach) sach = false;
    }).catch(() => { sach = false; }));
  await Promise.all(vc);
  return {sach, z, n};
}
async function v27Phu(L0, p) {                 // lớp dữ liệu có phủ điểm không (hộp bao của ảnh năm đầu)
  const k = L0.id; if (!(k in V27.phu)) {
    try { const t = await tiffOf(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", L0.nam[0]))); V27.phu[k] = {bb: t._bb, utm: L0.kieu === "s2d" || L0.kieu === "lsd"}; }
    catch (e) { V27.phu[k] = null; }
  }
  const P = V27.phu[k]; if (!P) return false;
  const q = P.utm ? CORE.toUTM(p.lon, p.lat) : CORE.to3857(p.lon, p.lat);
  return q[0] >= P.bb[0] && q[0] <= P.bb[2] && q[1] >= P.bb[1] && q[1] <= P.bb[3];
}
async function v27Nguon(p) {                   // nguồn dải ảnh cho điểm: lớp đang chọn, hoặc EOX khi điểm ngoài vùng có dữ liệu
  const s = $("selStrip").value;
  if (s === "wb" || s === "eox") return {ng: s};
  if (!MAN) return {ng: "eox", tu: true};
  if (s === "s2o" && typeof s2oL0 === "function" && s2oL0()) return {ng: s};
  const L0 = s === "s2d" && MAN.s2d ? s2dL0() : s === "lsd" && typeof lsdL0 === "function" ? lsdL0() : MAN.layers.find(l => l.id === s);
  const s2o = typeof s2oTrongKH === "function" && s2oTrongKH(p);      // bản 3.2: điểm trong vùng của kế hoạch S2 trực tuyến
  if (!L0) return s2o ? {ng: "s2o", tu: true} : {ng: "eox", tu: true};
  return (await v27Phu(L0, p)) ? {ng: s} : s2o ? {ng: "s2o", tu: true} : {ng: "eox", tu: true};
}
function v27Trang(cv) {                         // bản 3.2: ô EOX trắng (máy chủ không có ảnh năm đó ở đây, như s2cloudless 2017 ở Việt Nam)
  try { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 247 && d[i + 1] > 247 && d[i + 2] > 247) n++;
    return n > 0.97 * d.length / 4; } catch (e) { return false; }
}
function v27NamDai(ng) {
  const ys = new Set(years());
  (ng === "eox" ? EOX_NAM : REL.map(r => +r[0].slice(0, 4)).filter(y => y >= 2016)).forEach(y => ys.add(y));
  return [...ys].sort((a, b) => a - b);
}
function v27TenNguon(ng) { return ng === "eox" ? T("Sentinel-2 cloudless (EOX): ảnh tổng hợp năm 10 m") : T("Esri Wayback: bản phát hành đầu tiên sau mùa khô của năm"); }
const _renderStrip27 = renderStrip;
renderStrip = async function () {
  const p = vizPt(), rq = V27.rq = (V27.rq || 0) + 1;
  const N = p ? await v27Nguon(p) : null;
  if (rq !== V27.rq) return;                   // đã có lần vẽ mới hơn
  if (N && N.ng === "s2o" && N.tu && typeof renderStripS2O === "function") {        // bản 3.2
    const box = $("strip"), tok = ++stripTok; stripTieuDe(); box.innerHTML = "";
    if (typeof vzNguon === "function") vzNguon();
    $("stripmsg").textContent = T("điểm ngoài vùng có dữ liệu của bộ ảnh: dùng ") + T("Sentinel-2 trực tuyến (AWS), theo kế hoạch cảnh");
    const L0 = s2oL0(), c = CORE.to3857(p.lon, p.lat), half = stripNua();
    renderStripS2O(L0, p, [c[0] - half, c[1] - half, c[0] + half, c[1] + half], Array.from(new Set(L0.nam.concat(years()))).sort(), tok); return;
  }
  if (!N || (N.ng !== "wb" && N.ng !== "eox")) return _renderStrip27.apply(this, arguments);
  const box = $("strip"), tok = ++stripTok; stripTieuDe(); box.innerHTML = "";
  if (typeof vzNguon === "function") vzNguon();
  $("stripmsg").textContent = (N.tu ? T("điểm ngoài vùng có dữ liệu của bộ ảnh: dùng ") : T("nguồn: ")) + v27TenNguon(N.ng);
  const c = CORE.to3857(p.lon, p.lat), half = stripNua(), bb = [c[0] - half, c[1] - half, c[0] + half, c[1] + half], WS = stripCo();
  for (const y of v27NamDai(N.ng)) {
    const it = document.createElement("div"); it.className = "it" + (y === ST.nam ? " cur" : "");
    const cv = document.createElement("canvas"); cv.width = cv.height = WS; it.appendChild(cv);
    const ri = N.ng === "wb" ? CORE.releaseForYear(REL, y) : -1;
    it.insertAdjacentHTML("beforeend", `<span class="lb">${y}${N.ng === "wb" ? " · " + REL[ri][0].slice(2) : ""}</span>` + (p.nhan && p.nhan[y] ? `<span class="lc" style="background:${color(p.nhan[y])}"></span>` : ""));
    it.onclick = () => setYear(y); box.appendChild(it);
    if (N.ng === "eox" && !EOX_NAM.includes(y)) { const g = cv.getContext && cv.getContext("2d"); if (g) { g.fillStyle = "#555"; g.fillText(T("không có"), WS / 2 - 22, WS / 2); } continue; }
    v27Ve(N.ng, y, bb, WS, cv).then(r => {
      if (tok !== stripTok || !r.n) return;
      if (N.ng === "eox" && v27Trang(cv)) {      // bản 3.2: báo rõ thay vì để ô trắng
        const g = cv.getContext("2d"); g.fillStyle = "#e9ecf0"; g.fillRect(0, 0, WS, WS); g.fillStyle = "#475467"; g.font = "11px sans-serif"; g.textAlign = "center";
        g.fillText(T("EOX không có"), WS / 2, WS / 2 - 6); g.fillText(T("ảnh năm này ở đây"), WS / 2, WS / 2 + 8); it.title = T("EOX không có ảnh năm này ở đây");
        it.classList.add("trong");
      } else stripDanh(cv, WS, half);
    });
  }
  try { if (typeof aiCapNhatDiem === "function") aiCapNhatDiem(); } catch (e) { /* bỏ */ }
};
const _buildStrip27 = buildStripSelect;
buildStripSelect = function () {
  _buildStrip27();
  const s = $("selStrip"); [...s.options].forEach(o => { if (!o.value || o.value === T("(cần manifest)")) o.remove(); });
  [["eox", "Sentinel-2 cloudless theo năm (EOX, 10 m, 2016-2025, mọi nơi)"], ["wb", "Esri Wayback theo năm (ảnh độ phân giải cao, mọi nơi)"]].forEach(([v, t]) => {
    if (s.querySelector(`option[value="${v}"]`)) return; const o = document.createElement("option"); o.value = v; o.textContent = T(t); s.appendChild(o); });
  const pref = ls("laymau_hp_strip_v1"); if (pref && [...s.options].some(o => o.value === pref)) s.value = pref;
  v27SauMan();
};
if (typeof aiDaiAnh === "function") {           // trợ lý AI: dải ảnh gửi đi dùng cùng nguồn với dải đang xem
  const _aiDaiAnh27 = aiDaiAnh;
  aiDaiAnh = async function (p, ys) {
    const N = await v27Nguon(p); if (N.ng !== "wb" && N.ng !== "eox") return _aiDaiAnh27(p, ys);
    const cv0 = document.createElement("canvas"), g0 = cv0.getContext && cv0.getContext("2d"); if (!g0) return null;
    const c = CORE.to3857(p.lon, p.lat), half = stripNua(), bb = [c[0] - half, c[1] - half, c[0] + half, c[1] + half];
    ys = v27NamDai(N.ng).filter(y => N.ng !== "eox" || EOX_NAM.includes(y));
    const WS = 160, cot = Math.min(5, ys.length), hang = Math.ceil(ys.length / cot), HD = 16;
    cv0.width = cot * WS + (cot - 1) * 4; cv0.height = hang * (WS + HD) + (hang - 1) * 4; g0.fillStyle = "#fff"; g0.fillRect(0, 0, cv0.width, cv0.height);
    for (let k = 0; k < ys.length; k++) {
      const y = ys[k], x0 = (k % cot) * (WS + 4), y0 = Math.floor(k / cot) * (WS + HD + 4), cv = document.createElement("canvas"); cv.width = cv.height = WS;
      g0.fillStyle = "#111"; g0.font = "bold 12px sans-serif"; g0.fillText(String(y) + (p.nhan && p.nhan[y] ? "  [" + p.nhan[y] + "]" : ""), x0 + 2, y0 + 12);
      await v27Ve(N.ng, y, bb, WS, cv); g0.drawImage(cv, x0, y0 + HD);
      g0.strokeStyle = "#ff0"; g0.lineWidth = 1.5; const cx = x0 + WS / 2, cy = y0 + HD + WS / 2;
      g0.beginPath(); g0.moveTo(cx - 9, cy); g0.lineTo(cx - 3, cy); g0.moveTo(cx + 3, cy); g0.lineTo(cx + 9, cy); g0.moveTo(cx, cy - 9); g0.lineTo(cx, cy - 3); g0.moveTo(cx, cy + 3); g0.lineTo(cx, cy + 9); g0.stroke();
    }
    const a = await aiAnhCanvas(cv0, "image/jpeg", 0.85); if (!a) return null;
    a.mo_ta = (N.ng === "eox" ? "yearly Sentinel-2 cloudless mosaics by EOX (true colour, 10 m)" : "Esri Wayback very high resolution imagery, release closest after each dry season") +
      ` around the point; each tile ${Math.round(2 * half)} m wide, point at the yellow cross, [code] = label already assigned`;
    return a;
  };
}

/* ---------- hành chính Việt Nam ---------- */
async function v27SauMan() {
  if (!MAN || V27.man === MAN) return; V27.man = MAN; V27.phu = {};
  const W = $("vnW"); if (!MAN.vn) { W.hidden = true; return; }
  W.hidden = false;
  try { V27.dm = JSON.parse(await getText(MAN.vn.danh_muc)); } catch (e) { $("vnTT").textContent = T("không nạp được danh mục hành chính: ") + e.message; return; }
  const s = $("vnTinh");
  s.innerHTML = V27.dm.tinh.slice().sort((a, b) => a.ten.localeCompare(b.ten, "vi")).map(t => `<option value="${t.ma}">${esc(t.ten)} (${t.so_xa})</option>`).join("");
  const pr = ls("laymau_hp_vn_v1") || {};
  $("cVnTinh").checked = !!pr.tinh; if (pr.tinh) v27VeTinh();
  const ma = pr.ma && V27.dm.tinh.some(t => t.ma === pr.ma) ? pr.ma : (MAN.vn.tinh_mac_dinh || s.options[0].value);
  s.value = ma; V27.tinh = ma;
  if (ma !== MAN.vn.tinh_mac_dinh) await v27ChonTinh(ma, false);
  else { if (!VG.xa && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } } v27TT(); }
}
function v27TinhTen(ma) { const t = V27.dm && V27.dm.tinh.find(q => q.ma === (ma || V27.tinh)); return t ? t.ten_day_du || t.ten : ""; }
function v27TT() { $("vnTT").textContent = V27.tinh ? T("{t}: {n} xã, phường", {t: v27TinhTen(), n: VG.xa ? VG.xa.length : "…"}) : ""; }
async function v27ChonTinh(ma, bay) {
  V27.tinh = ma; $("vnTinh").value = ma; ls("laymau_hp_vn_v1", Object.assign(ls("laymau_hp_vn_v1") || {}, {ma}));
  $("vnTT").textContent = T("đang nạp xã…");
  try {
    if (ma === MAN.vn.tinh_mac_dinh && MAN.ranh_gioi_xa) await vgTaiXaHF();
    else vgNapXa(JSON.parse(await getText(MAN.vn.xa.replace("{ma}", ma))));
  } catch (e) { $("vnTT").textContent = T("không nạp được xã của tỉnh: ") + e.message; return; }
  v27TT();
  if (bay) { const t = V27.dm.tinh.find(q => q.ma === ma); if (t) map.fitBounds([[t.bb[1], t.bb[0]], [t.bb[3], t.bb[2]]]); }
  if ($("cVnXa").checked) VG.gXa.addTo(map);
  if (typeof cdMo === "function" && !cd$("cdP").hidden) cdMo(true);
  document.dispatchEvent(new CustomEvent("xa27"));
}
async function v27NapTinh() {
  if (V27.tinhGJ || !MAN || !MAN.vn) return V27.tinhGJ;
  const fc = JSON.parse(await getText(MAN.vn.tinh));
  V27.tinhGJ = fc.features.map(f => { const mp = vgMP(f.geometry), bl = [Infinity, Infinity, -Infinity, -Infinity];
    mp.forEach(pg => pg[0].forEach(q => { bl[0] = Math.min(bl[0], q[0]); bl[1] = Math.min(bl[1], q[1]); bl[2] = Math.max(bl[2], q[0]); bl[3] = Math.max(bl[3], q[1]); }));
    return {ma: String(f.properties.ma), ten: f.properties.ten_day_du || f.properties.ten, mp, bl}; });
  V27.fc = fc; return V27.tinhGJ;
}
async function v27VeTinh() {
  const on = $("cVnTinh").checked; ls("laymau_hp_vn_v1", Object.assign(ls("laymau_hp_vn_v1") || {}, {tinh: on}));
  if (V27.tinhL) { map.removeLayer(V27.tinhL); V27.tinhL = null; }
  if (!on) return;
  try { await v27NapTinh(); } catch (e) { $("vnTT").textContent = T("không nạp được ranh giới tỉnh: ") + e.message; return; }
  V27.tinhL = L.geoJSON(V27.fc, {style: {color: "#6d28d9", weight: 1.6, fill: false, dashArray: "7 4"}, interactive: false, pmIgnore: true}).addTo(map);
}
function v27TinhTai(lon, lat) { return (V27.tinhGJ || []).find(t => lon >= t.bl[0] && lon <= t.bl[2] && lat >= t.bl[1] && lat <= t.bl[3] && vgPIP(lon, lat, t.mp)) || null; }
function v27Tim() {
  const q = CORE.khongDau($("vnTim").value), box = $("vnKQ"); box.innerHTML = "";
  if (!V27.dm || q.length < 2) return;
  const kq = [];
  V27.dm.tinh.forEach(t => { if (CORE.khongDau(t.ten_day_du || t.ten).includes(q)) kq.push({t: "tinh", ma: t.ma, ten: t.ten_day_du || t.ten}); });
  for (const x of V27.dm.xa) { if (kq.length > 40) break; if (CORE.khongDau(x[1]).includes(q)) kq.push({t: "xa", ma: x[0], ten: x[1], tinh: x[2], lon: x[3], lat: x[4]}); }
  box.innerHTML = kq.slice(0, 15).map((r, i) => `<button type="button" data-k="${i}">${esc(r.ten)}${r.t === "xa" ? " · " + esc(v27TinhTen(r.tinh)) : ""}</button>`).join("") +
    (kq.length > 15 ? `<span class="mu sm"> ${T("và {n} kết quả khác", {n: kq.length - 15})}</span>` : "") + (kq.length ? "" : `<span class="mu sm">${T("không thấy")}</span>`);
  box.querySelectorAll("[data-k]").forEach(b => { b.onclick = () => v27Den(kq[+b.dataset.k]); });
}
async function v27Den(r) {
  if (r.t === "tinh") { await v27ChonTinh(r.ma, true); return; }
  if (V27.tinh !== r.tinh) await v27ChonTinh(r.tinh, false);
  const k = CORE.khongDau(r.ten), ngan = k.replace(/^(xa|phuong|dac khu|thi tran)\s+/, "");
  const x = (VG.xa || []).find(z => CORE.khongDau(z.ten) === k) || (VG.xa || []).find(z => CORE.khongDau(z.ten).replace(/^(xa|phuong|dac khu|thi tran)\s+/, "") === ngan);
  if (V27.sang) { map.removeLayer(V27.sang); V27.sang = null; }
  if (x) {
    map.fitBounds([[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]]);
    V27.sang = L.polygon(x.mp.map(pg => pg.map(rg => rg.map(q => [q[1], q[0]]))), {color: "#f59e0b", weight: 3, fill: false, interactive: false, pmIgnore: true}).addTo(map);
    setTimeout(() => { if (V27.sang) { map.removeLayer(V27.sang); V27.sang = null; } }, 6000);
  } else map.setView([r.lat, r.lon], 14);
  $("vnKQ").innerHTML = ""; $("vnTim").value = r.ten;
}
/* phạm vi dùng chung cho các bảng phân tích: nhìn, xa (các xã chọn), tinh (cả tỉnh đang chọn), vung (một vùng đã lưu) */
function v27PhamVi(pv, xaIds, vungId) {
  if (/^gop:/.test(pv || "") && typeof xgPV === "function") return xgPV(pv.slice(4));      // bản 3.1: vùng gộp nhiều xã
  if (pv === "nhin") { const b = map.getBounds(), a = CORE.to3857(b.getWest(), b.getSouth()), c = CORE.to3857(b.getEast(), b.getNorth()); return {bb: [a[0], a[1], c[0], c[1]], mp: null, kieu: "nhin"}; }
  if (pv === "xa") { const xs = (VG.xa || []).filter(x => xaIds.includes(x.i)); if (!xs.length) throw new Error(T("chưa chọn xã nào"));
    const mp = [].concat(...xs.map(x => x.mp)); return {bb: vgBB3857(mp), mp, kieu: "xa", ten: xs.map(x => x.ten).join(", ")}; }
  if (pv === "tinh") { if (!VG.xa || !VG.xa.length) throw new Error(T("chưa nạp các xã của tỉnh"));
    const mp = [].concat(...VG.xa.map(x => x.mp)); return {bb: vgBB3857(mp), mp, kieu: "tinh", ten: v27TinhTen() || T("cả tỉnh")}; }
  const v = ST.vung[vungId]; if (!v) throw new Error(T("chưa có vùng đã lưu"));
  const mp = vgMP(v.geom); return {bb: vgBB3857(mp), mp, kieu: "vung", id: v.id};
}
function v27TenPV(P) { return P.kieu === "nhin" ? T("khung nhìn") : P.kieu === "vung" ? T("vùng {id}", {id: P.id}) : P.ten; }
function v27DSVung() { return Object.values(ST.vung).map(v => `<option value="${v.id}">${v.id} · ${v.ma_lop} · ${v.nam} · ${v.thong_ke.dien_tich_ha.toFixed(1)} ${T("ha")}</option>`).join("") || `<option value="">${T("(chưa lưu vùng nào)")}</option>`; }
function v27DSXa() { return (VG.xa || []).slice().sort((a, b) => a.ten.localeCompare(b.ten, "vi")).map(x => `<option value="${x.i}">${esc(x.ten)}</option>`).join(""); }
if (typeof cdPhamVi === "function") {            // phát hiện thay đổi: thêm phạm vi cả tỉnh
  const _cdPV27 = cdPhamVi;
  cdPhamVi = function () { const v = cd$("cdPV").value; return v === "tinh" || /^gop:/.test(v) ? v27PhamVi(v) : _cdPV27(); };
}
if (typeof giaTriTai === "function") {           // giá trị tại điểm: thêm tỉnh
  const _gtt27 = giaTriTai;
  giaTriTai = async function (ll) {
    const r = await _gtt27(ll);
    if (MAN && MAN.vn) { try { await v27NapTinh(); const t = v27TinhTai(ll.lng, ll.lat); if (t && !r.some(x => x[0] === T("tỉnh, thành phố"))) r.unshift([T("tỉnh, thành phố"), esc(t.ten)]); } catch (e) { /* bỏ */ } }
    return r;
  };
}
$("cNhan").onchange = v27Nhan; $("selNhan").onchange = v27Nhan;
$("vnTinh").onchange = () => v27ChonTinh($("vnTinh").value, true);
$("cVnTinh").onchange = v27VeTinh;
$("cVnXa").onchange = () => { if (!VG.gXa) return; if ($("cVnXa").checked) VG.gXa.addTo(map); else map.removeLayer(VG.gXa); const h = vg$("vgXaHien"); if (h) h.checked = $("cVnXa").checked; };
$("vnTim").addEventListener("input", v27Tim);
{ const pr = ls("laymau_hp_nhan_v1"); if (pr) { $("cNhan").checked = !!pr.on; $("selNhan").value = pr.ng || "gg"; } }
setBase();
if (MAN) v27SauMan();
const _setLang27 = setLang;
setLang = function (l) {
  _setLang27(l);
  if (NEN27[$("selBase").value]) setBase(); else v27Nhan();
  const s = $("selStrip"); ["eox", "wb"].forEach(v => { const o = s.querySelector(`option[value="${v}"]`); if (o) o.remove(); }); buildStripSelect(); v27TT(); v27Tim();
};
