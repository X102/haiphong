/* =============================== BẢN 3.7: LẤY ĐIỂM MẪU TỪ GOOGLE EARTH =============================== */
/* Google Earth web không cho trang khác đọc tab của nó (COOP same-origin), nên việc lấy điểm làm qua hai bước:
   ① một dấu trang (bookmarklet) chạy NGAY TRONG tab Google Earth: vẽ dấu tâm đúng giữa khung ảnh 3D, đọc vị trí và hướng máy ảnh từ
      đường dẫn của trang (@vĩ độ,kinh độ,độ cao a,khoảng cách d,góc nhìn y,hướng h,độ nghiêng t,...), tính toạ độ mặt đất tại tâm,
      đọc ngày ảnh trên thanh dưới, hiện ngay toạ độ, khoảng cách, sai số; nút "Chép điểm" chép một dòng mô tả điểm;
   ② trong geoportal bấm Ctrl+V: tạo điểm mẫu ở đúng toạ độ đó, ghi ngày ảnh, vị trí máy ảnh, khoảng cách, sai số, đường dẫn;
      chuyển sang năm của ngày ảnh; bấm phím lớp để gán.
   Toạ độ tại tâm: ở chế độ nhìn từ trên (khoảng cách d > 0) vĩ độ, kinh độ trong đường dẫn chính là điểm đang nhìn (đúng tâm màn hình);
   ở Street View (d = 0) đó là vị trí máy ảnh, tâm màn hình là giao của tia nhìn với mặt đất phẳng: khoảng cách = H / tan(90° − t),
   H = chiều cao máy ảnh so với mặt đất tại chỗ nhìn (xe Street View khoảng 2.5 m; ruộng thấp hơn mặt đường thì cộng thêm). */
var GEP = Object.assign({H: 2.5, xa: 40}, ls("laymau_hp_ge_v1") || {});
function geLuu() { ls("laymau_hp_ge_v1", {H: GEP.H, xa: GEP.xa}); }
/* hàm tính dùng chung cho geoportal và dấu trang (được chép nguyên văn vào dấu trang, nên không dùng biến bên ngoài) */
function geTinh(url, H) {
  var m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)a,(-?\d+(?:\.\d+)?)d,(-?\d+(?:\.\d+)?)y,(-?\d+(?:\.\d+)?)h,(-?\d+(?:\.\d+)?)t/.exec(String(url || ""));
  if (!m) return null;
  var c = {lat: +m[1], lon: +m[2], alt: +m[3], d: +m[4], fov: +m[5], huong: +m[6], nghieng: +m[7]};
  if (!(Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180) || (c.lat === 0 && c.lon === 0)) return null;
  if (c.d > 0) return {lat: c.lat, lon: c.lon, kc: 0, ss: 0, kieu: "tren", cam: c};              // nhìn từ trên: đúng điểm nhìn
  var cui = 90 - c.nghieng;                                                                         // góc cúi dưới đường chân trời
  if (cui <= 0.5) return {loi: "chan_troi", cam: c};
  var r = Math.PI / 180, kc = H / Math.tan(cui * r);
  var R = 6371008.8, br = c.huong * r, dr = kc / R, la1 = c.lat * r, lo1 = c.lon * r;
  var la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(br));
  var lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la1), Math.cos(dr) - Math.sin(la1) * Math.sin(la2));
  var sa = kc * kc / H * 0.3 * r, sh = kc * 0.3 / H, ss = Math.sqrt(sa * sa + sh * sh + 4);     // góc ±0.3°, chiều cao ±0.3 m, vị trí ảnh ±2 m
  return {lat: la2 / r, lon: lo2 / r, kc: kc, ss: ss, kieu: "sv", cam: c};
}
/* dấu trang: chạy trong tab Google Earth */
function geDauTrang(H, XA, L, geTinh) {
  var W = window, d = document;
  if (W.__lmGE) { W.__lmGE.tat(); return; }
  if (!/earth\.google\./.test(location.host)) { alert(L.chiGE); return; }
  var Z = 2147483647, goc = d.createElement("div"), mk = function (css) { var e = d.createElement("div"); e.style.cssText = css; goc.appendChild(e); return e; };
  goc.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;z-index:" + Z + ";pointer-events:none";
  var ngang = mk("position:fixed;height:2px;width:44px;background:#ff1744;box-shadow:0 0 0 1px #fff"), doc = mk("position:fixed;width:2px;height:44px;background:#ff1744;box-shadow:0 0 0 1px #fff");
  var vong = mk("position:fixed;width:16px;height:16px;border:2px solid #ff1744;border-radius:50%;box-shadow:0 0 0 1px #fff");
  var hop = mk("position:fixed;pointer-events:auto;background:rgba(255,255,255,.95);border:1px solid #888;border-radius:8px;padding:6px 8px;font:13px/1.35 sans-serif;color:#111;max-width:420px;box-shadow:0 2px 8px rgba(0,0,0,.3)");
  var t1 = d.createElement("div"), t2 = d.createElement("div"), t3 = d.createElement("div"), hang = d.createElement("div");
  t1.style.fontWeight = "700"; t3.style.color = "#555"; hang.style.cssText = "margin-top:4px;display:flex;gap:6px";
  var bChep = d.createElement("button"), bTat = d.createElement("button");
  bChep.textContent = "📋 " + L.chep; bTat.textContent = "×";
  [bChep, bTat].forEach(function (b) { b.style.cssText = "font:13px sans-serif;padding:3px 10px;border:1px solid #777;border-radius:5px;background:#f3f3f3;cursor:pointer"; hang.appendChild(b); });
  [t1, t2, t3, hang].forEach(function (e) { hop.appendChild(e); });
  d.documentElement.appendChild(goc);
  function sau(root, f) { var st = [root]; while (st.length) { var n = st.pop(); if (!n) continue; f(n); if (n.shadowRoot) st.push(n.shadowRoot); var ch = n.children || []; for (var i = 0; i < ch.length; i++) if (ch[i] !== goc) st.push(ch[i]); } }
  var khung = null, ngay = null;
  function timKhung() {                                // khung ảnh 3D: canvas lớn nhất đang hiện
    var tot = null, dt = 0;
    sau(d.documentElement, function (n) { if (n.tagName === "CANVAS") { var r = n.getBoundingClientRect(), a = r.width * r.height; if (a > dt) { dt = a; tot = r; } } });
    khung = tot && dt > 40000 ? tot : {left: 0, top: 0, width: innerWidth, height: innerHeight};
  }
  var THANG = {jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, "янв": 1, "фев": 2, "мар": 3, "апр": 4, "мая": 5, "май": 5, "июн": 6, "июл": 7, "авг": 8, "сен": 9, "окт": 10, "ноя": 11, "дек": 12};
  function docNgay(s) {                                // -> "YYYY-MM" hoặc "YYYY-MM-DD"
    var m = /(?:thg|tháng)\s*(\d{1,2})[\s,/]*(?:năm\s*)?((?:19|20)\d{2})/i.exec(s); if (m) return m[2] + "-" + ("0" + m[1]).slice(-2);
    m = /\b([A-Za-z]{3})[a-z]*\.?\s+((?:19|20)\d{2})\b/.exec(s); if (m && THANG[m[1].toLowerCase()]) return m[2] + "-" + ("0" + THANG[m[1].toLowerCase()]).slice(-2);
    m = /([а-яё]{3})[а-яё]*\.?\s+((?:19|20)\d{2})/i.exec(s); if (m && THANG[m[1].toLowerCase()]) return m[2] + "-" + ("0" + THANG[m[1].toLowerCase()]).slice(-2);
    m = /\b(\d{1,2})[/.](\d{1,2})[/.]((?:19|20)\d{2})\b/.exec(s);
    if (m) { var us = /^en-US/i.test(d.documentElement.lang || navigator.language), mo = us ? m[1] : m[2], ng = us ? m[2] : m[1]; return m[3] + "-" + ("0" + mo).slice(-2) + "-" + ("0" + ng).slice(-2); }
    return null;
  }
  function timNgay() {                                 // ngày ảnh trên thanh dưới của Google Earth
    var duoi = null, bat = null;
    sau(d.documentElement, function (n) {
      if (duoi || !n.childNodes) return;
      for (var i = 0; i < n.childNodes.length; i++) { var c = n.childNodes[i]; if (c.nodeType !== 3) continue; var s = c.nodeValue.trim(); if (!s || s.length > 40) continue;
        var g = docNgay(s); if (!g) continue; var r = n.getBoundingClientRect ? n.getBoundingClientRect() : null;
        if (r && r.top > innerHeight * 0.6) { duoi = {g: g, s: s}; return; } if (!bat) bat = {g: g, s: s}; }
    });
    ngay = duoi || bat;
  }
  function veLai() {
    if (!khung) timKhung();
    var x = khung.left + khung.width / 2, y = khung.top + khung.height / 2;
    ngang.style.left = (x - 22) + "px"; ngang.style.top = (y - 1) + "px"; doc.style.left = (x - 1) + "px"; doc.style.top = (y - 22) + "px";
    vong.style.left = (x - 10) + "px"; vong.style.top = (y - 10) + "px";
    hop.style.left = (khung.left + 10) + "px"; hop.style.top = (khung.top + 10) + "px";
    var r = geTinh(location.href, H), mau = "#ff1744";
    if (!r) { t1.textContent = L.chuaUrl; t2.textContent = ""; }
    else if (r.loi) { t1.textContent = L.chanTroi; t2.textContent = ""; mau = "#888"; }
    else {
      t1.textContent = L.tam + ": " + r.lat.toFixed(6) + ", " + r.lon.toFixed(6);
      t2.textContent = r.kieu === "sv" ? L.cach.replace("{d}", r.kc.toFixed(0)).replace("{s}", r.ss.toFixed(0)) + (r.kc > XA ? " · " + L.xa : "") : L.tren;
      mau = r.kieu === "sv" && r.kc > XA ? "#ff9100" : "#ff1744";
    }
    t3.textContent = ngay ? L.ngay + ": " + ngay.s + " (" + ngay.g + ")" : L.khongNgay;
    [ngang, doc].forEach(function (e) { e.style.background = mau; }); vong.style.borderColor = mau;
  }
  function chep() {
    timNgay(); var r = geTinh(location.href, H);
    if (!r || r.loi) { alert(r ? L.chanTroi : L.chuaUrl); return; }
    var s = ["LMGE1", r.lat.toFixed(7), r.lon.toFixed(7), ngay ? ngay.g : "", ngay ? ngay.s : "", encodeURIComponent(location.href)].join("|");
    var xong = function () { bChep.textContent = "✓ " + L.daChep; setTimeout(function () { bChep.textContent = "📋 " + L.chep; }, 1800); };
    var cu = function () { var ta = d.createElement("textarea"); ta.value = s; ta.style.cssText = "position:fixed;left:-9999px"; d.body.appendChild(ta); ta.select(); try { d.execCommand("copy"); xong(); } catch (e) { prompt(L.chepTay, s); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(xong, cu); else cu();
  }
  bChep.onclick = chep; bTat.onclick = function () { W.__lmGE.tat(); };
  timKhung(); timNgay(); veLai();
  var h1 = setInterval(veLai, 300), h2 = setInterval(timKhung, 1500), h3 = setInterval(timNgay, 2500), nghe = function () { khung = null; };
  W.addEventListener("resize", nghe);
  W.__lmGE = {tat: function () { clearInterval(h1); clearInterval(h2); clearInterval(h3); W.removeEventListener("resize", nghe); goc.remove(); W.__lmGE = null; }, chep: chep, veLai: veLai};
}
function geNhan() {                                  // chữ trong dấu trang theo ngôn ngữ đang dùng
  return {chiGE: T("Dấu trang này dùng trong tab Google Earth (earth.google.com)."), chep: T("Chép điểm"), daChep: T("đã chép, sang geoportal bấm Ctrl+V"),
    chepTay: T("Chép dòng này rồi dán vào geoportal (Ctrl+V):"), chuaUrl: T("Chưa đọc được vị trí từ đường dẫn: di chuyển góc nhìn một chút."),
    chanTroi: T("Tâm đang nhìn lên trời: hạ góc nhìn xuống mặt đất."), tam: T("Tâm"), cach: T("cách máy ảnh {d} m (±{s} m)"),
    xa: T("xa quá, nên nhìn chỗ gần hơn"), tren: T("nhìn từ trên: đúng điểm giữa màn hình"), ngay: T("Ngày ảnh"), khongNgay: T("Chưa thấy ngày ảnh (sẽ nhập trong geoportal)")};
}
function geHref() {
  const src = "(" + geDauTrang.toString() + ")(" + (+GEP.H || 2.5) + "," + (+GEP.xa || 40) + "," + JSON.stringify(geNhan()) + "," + geTinh.toString() + ")";
  return "javascript:" + encodeURIComponent(src);
}

/* dự phòng khi trình duyệt không chạy dấu trang trên Google Earth: cùng mã đó dạng userscript cho Tampermonkey (nút 📌 nổi ở góc dưới) */
function geUserscript() {
  return ["// ==UserScript==", "// @name         Geoportal Hai Phong: lay diem mau tu Google Earth", "// @namespace    x102.github.io/haiphong",
    "// @version      " + VERSION, "// @match        https://earth.google.com/*", "// @grant        none", "// ==/UserScript==",
    "(function () {", "  var geTinh = " + geTinh.toString() + ";", "  var geDauTrang = " + geDauTrang.toString() + ";",
    "  var H = " + (+GEP.H || 2.5) + ", XA = " + (+GEP.xa || 40) + ", L = " + JSON.stringify(geNhan()) + ";",
    "  function nut() { if (document.getElementById('lmGEnut')) return; var b = document.createElement('button'); b.id = 'lmGEnut'; b.textContent = '📌'; b.title = L.tam + ' / ' + L.chep;",
    "    b.style.cssText = 'position:fixed;right:14px;bottom:96px;z-index:2147483647;width:40px;height:40px;border-radius:50%;border:2px solid #ff1744;background:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.3)';",
    "    b.onclick = function () { geDauTrang(H, XA, L, geTinh); }; (document.body || document.documentElement).appendChild(b); }",
    "  nut(); setInterval(nut, 3000);", "})();", ""].join("\n");
}

/* ---------- phía geoportal: Ctrl+V tạo điểm ---------- */
var GE_LOP = null;
function gePhanTich(txt) {                           // -> {lat, lon, ngay, ngayGoc, url, r (kết quả geTinh)} | null
  txt = String(txt || "").trim(); if (!txt) return null;
  if (/^LMGE1\|/.test(txt)) {
    const a = txt.split("|"), url = decodeURIComponent(a[5] || ""), r = geTinh(url, +GEP.H || 2.5);
    const lat = r && !r.loi ? r.lat : +a[1], lon = r && !r.loi ? r.lon : +a[2];       // tính lại theo chiều cao máy ảnh đang đặt ở geoportal
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return {lat, lon, ngay: a[3] || null, ngayGoc: a[4] || "", url, r};
  }
  if (/earth\.google\.[^/]+\/web\//.test(txt) && /@-?\d/.test(txt)) {
    const r = geTinh(txt, +GEP.H || 2.5); if (!r) return null;
    if (r.loi) return {loi: r.loi};
    return {lat: r.lat, lon: r.lon, ngay: null, ngayGoc: "", url: txt, r};
  }
  const m = /^(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})$/.exec(txt);
  if (m) { const lat = +m[1], lon = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return {lat, lon, ngay: null, ngayGoc: "", url: "", r: null}; }
  return null;
}
function geVe(p) {                                   // vị trí máy ảnh, tia nhìn, vòng sai số
  if (GE_LOP) { map.removeLayer(GE_LOP); GE_LOP = null; }
  const s = p && p.sv; if (!s) return;
  GE_LOP = L.layerGroup().addTo(map);
  const g0 = s.goc || [p.lat, p.lon];
  if (s.ss) L.circle(g0, {radius: s.ss, color: "#ff1744", weight: 1.5, fillOpacity: 0.08, interactive: false}).addTo(GE_LOP);
  if (s.cam && s.kieu === "sv") {
    L.polyline([[s.cam[0], s.cam[1]], g0], {color: "#ff1744", weight: 1.5, dashArray: "4 3", interactive: false}).addTo(GE_LOP);
    L.circleMarker([s.cam[0], s.cam[1]], {radius: 4, color: "#ff1744", fillColor: "#fff", fillOpacity: 1, weight: 2, interactive: false}).addTo(GE_LOP);
  }
}
function geTaoDiem(g) {
  const o = CORE.newPoint("_", g.lon, g.lat);         // điểm mẫu đặt ở tâm điểm ảnh 10 m chứa toạ độ (như điểm thêm tay): một điểm ảnh một mẫu
  const gan = Object.values(ST.diem).find(q => q.x === o.x && q.y === o.y);
  TM.tam = true;
  let p;
  try {
    if (gan) { select(gan.id, false); p = gan; msg(T("Đã có điểm {id} ở điểm ảnh 10 m này: mở điểm đó.", {id: gan.id}), "wa", 3500); }
    else p = themDiemTai(g.lon, g.lat);
  } finally { TM.tam = false; }
  if (!gan) {
    const r = g.r || {}, c = r.cam;
    p.sv = {nguon: g.url ? "gearth" : "toado", goc: [+g.lat.toFixed(7), +g.lon.toFixed(7)], ngay: g.ngay || null, ngay_goc: g.ngayGoc || "", kieu: r.kieu || null, kc: r.kc != null ? +r.kc.toFixed(1) : null,
            ss: r.ss != null ? +r.ss.toFixed(1) : null, H: r.kieu === "sv" ? +GEP.H : null, cam: c ? [+c.lat.toFixed(7), +c.lon.toFixed(7)] : null,
            huong: c ? +c.huong.toFixed(1) : null, nghieng: c ? +c.nghieng.toFixed(1) : null, url: g.url || ""};
    p.ghi_chu = (p.ghi_chu ? p.ghi_chu + " | " : "") + geTomTat(p.sv);
    save();
  }
  const y = p.sv && p.sv.ngay ? +p.sv.ngay.slice(0, 4) : null;
  if (y && years().includes(y) && y !== ST.nam) setYear(y); else render();
  map.setView([p.lat, p.lon], Math.max(map.getZoom(), 17));
  geVe(p);
  if (!gan) msg(geTomTat(p.sv) + " · " + (y ? (years().includes(y) ? T("năm {y}", {y}) : T("năm {y} không nằm trong các năm cần gán", {y})) : T("chưa có ngày ảnh: chọn năm rồi gán")) + " · " + T("bấm phím lớp để gán"), "ok", 7000);
  return p;
}
function geTomTat(s) {
  if (!s) return "";
  const n = s.ngay ? T("ảnh {d}", {d: s.ngay}) : T("chưa có ngày ảnh");
  return s.nguon === "gearth" ? (s.kieu === "sv" ? T("Street View (Google Earth), {n}, cách máy ảnh {k} m (±{s} m)", {n, k: Math.round(s.kc), s: Math.round(s.ss)})
                                                 : T("Google Earth nhìn từ trên, {n}", {n})) : T("toạ độ dán vào");
}
document.addEventListener("paste", e => {
  const t = e.target && e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
  const s = (e.clipboardData || window.clipboardData) ? (e.clipboardData || window.clipboardData).getData("text") : "";
  const g = gePhanTich(s); if (!g) return;
  e.preventDefault();
  if (g.loi) { msg(T("Tâm đang nhìn lên trời: hạ góc nhìn xuống mặt đất."), "wa", 4000); return; }
  if (typeof LUOI !== "undefined" && LUOI.mo) luoiMo(false);
  geTaoDiem(g);
});
/* thông tin ảnh mặt đất trong khung điểm; sửa ngày ảnh */
var _renderPoint37 = renderPoint;
renderPoint = function () {
  _renderPoint37.apply(this, arguments);
  const p = cur(), box = $("pinfo"); if (!p || !box) { geVe(null); return; }
  if (!p.sv) { if (GE_LOP) geVe(null); return; }
  const s = p.sv;
  box.insertAdjacentHTML("beforeend", `<div class="sm" data-ge style="margin-top:3px">📷 ${esc(geTomTat(s))}${s.ngay_goc ? ` <span class="mu">(“${esc(s.ngay_goc)}”)</span>` : ""}
    · ${T("ngày ảnh")} <input type="month" data-ge-ngay value="${esc((s.ngay || "").slice(0, 7))}" style="width:140px">
    ${s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${T("mở lại góc nhìn")}</a>` : ""}</div>`);
  const inp = box.querySelector("[data-ge-ngay]");
  if (inp) inp.onchange = () => { s.ngay = inp.value || null; p.ghi_chu = (p.ghi_chu || "").replace(/(Street View|Google Earth)[^|]*/, geTomTat(s)); save(); const y = s.ngay ? +s.ngay.slice(0, 4) : null; if (y && years().includes(y)) setYear(y); else render(); };
  geVe(p);
};
(function () {                                      // hộp hướng dẫn, dấu trang, chiều cao máy ảnh
  const b = $("bGE"), dl = $("dlgGE"); if (!b || !dl) return;
  const ve = () => {
    $("geH").value = GEP.H; $("geXa").value = GEP.xa;
    const a = $("geBM"); a.setAttribute("href", geHref());
  };
  b.onclick = () => { ve(); dl.showModal(); };
  $("geDong").onclick = () => dl.close();
  $("geH").onchange = () => { GEP.H = Math.max(0.5, Math.min(10, +$("geH").value || 2.5)); geLuu(); ve(); };
  $("geXa").onchange = () => { GEP.xa = Math.max(10, Math.min(200, +$("geXa").value || 40)); geLuu(); ve(); };
  $("geBM").onclick = e => { e.preventDefault(); msg(T("Kéo nút này lên thanh dấu trang của trình duyệt, rồi bấm nó trong tab Google Earth."), "wa", 5000); };
  if ($("geUS")) $("geUS").onclick = () => download("lay_diem_google_earth.user.js", geUserscript(), "text/javascript");
  $("geDan").onclick = async () => {
    try { const s = await navigator.clipboard.readText(); const g = gePhanTich(s); if (!g) { msg(T("Bộ nhớ tạm không có điểm Google Earth hay toạ độ"), "wa", 3500); return; } if (g.loi) { msg(T("Tâm đang nhìn lên trời: hạ góc nhìn xuống mặt đất."), "wa", 4000); return; } dl.close(); geTaoDiem(g); }
    catch (e) { msg(T("Trình duyệt không cho đọc bộ nhớ tạm: bấm Ctrl+V trên bản đồ"), "wa", 4000); }
  };
})();
var _select37 = select;                              // tạo điểm từ Google Earth thì không tự mở lại Google Earth (bản 3.6.1)
select = function () { if (TM.tam) { const k = TM.k; TM.k = ""; try { return _select37.apply(this, arguments); } finally { TM.k = k; } } return _select37.apply(this, arguments); };
