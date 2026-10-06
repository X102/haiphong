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
/* bản 3.8: giao nhiều tia nhìn. Mỗi góc nhìn Street View (máy ảnh ở chỗ khác nhau, cùng nhắm vào một chỗ) cho một tia trên mặt
   phẳng: gốc là vị trí máy ảnh, hướng là hướng nhìn h. Điểm cần tìm là nơi các tia gặp nhau: bình phương tối thiểu có trọng số của
   khoảng cách vuông góc tới từng tia, trọng số 1/((σθ·d)² + σc²) với σθ = 0.5° (nhắm tâm, hướng máy ảnh), σc = 1 m (vị trí tương đối
   của các ảnh), d = khoảng cách máy ảnh tới điểm (lặp vài lần). Cách này KHÔNG cần chiều cao máy ảnh nên không bị lệch khi ruộng
   thấp hơn mặt đường. Góc giao giữa các tia nhỏ hơn 10° thì kém chính xác: khi đó thêm ước lượng theo góc cúi của từng ảnh.
   Ma trận hiệp phương sai cho elip sai số; tia nào chỉ ngược hướng, hay các tia không gặp nhau (độ lệch chuẩn hoá trung bình > 1.5) thì báo: chỉ kiểm được từ 3 góc nhìn trở lên (2 tia luôn gặp nhau). */
function geTamGiac(urls, H, geTinh) {
  var r = Math.PI / 180, R = 6371008.8, ST = 0.5 * r, SC = 1, ds = [];
  for (var i = 0; i < urls.length; i++) { var x = geTinh(urls[i], H); if (x && x.cam && x.kieu !== "tren") ds.push(x); }
  if (ds.length < 2) return null;
  var lat0 = 0, lon0 = 0; ds.forEach(function (x) { lat0 += x.cam.lat / ds.length; lon0 += x.cam.lon / ds.length; });
  var kx = R * r * Math.cos(lat0 * r), ky = R * r;
  var tia = ds.map(function (x) { var h = x.cam.huong * r;
    return {c: [(x.cam.lon - lon0) * kx, (x.cam.lat - lat0) * ky], u: [Math.sin(h), Math.cos(h)], g: x.loi ? null : [(x.lon - lon0) * kx, (x.lat - lat0) * ky], ss: x.ss, x: x}; });
  var goc = 0;
  for (var a1 = 0; a1 < tia.length; a1++) for (var a2 = a1 + 1; a2 < tia.length; a2++) {
    var cs = Math.abs(tia[a1].u[0] * tia[a2].u[0] + tia[a1].u[1] * tia[a2].u[1]); goc = Math.max(goc, Math.acos(Math.min(1, cs)) / r); }
  var dungDiem = goc < 10;
  function giai(w) {
    var A = [0, 0, 0], b = [0, 0];
    tia.forEach(function (t, k) { var ux = t.u[0], uy = t.u[1], m11 = 1 - ux * ux, m12 = -ux * uy, m22 = 1 - uy * uy, wi = w[k];
      A[0] += wi * m11; A[1] += wi * m12; A[2] += wi * m22; b[0] += wi * (m11 * t.c[0] + m12 * t.c[1]); b[1] += wi * (m12 * t.c[0] + m22 * t.c[1]);
      if (dungDiem && t.g) { var wg = 1 / (t.ss * t.ss); A[0] += wg; A[2] += wg; b[0] += wg * t.g[0]; b[1] += wg * t.g[1]; } });
    var det = A[0] * A[2] - A[1] * A[1]; if (!(Math.abs(det) > 1e-12)) return null;
    var inv = [A[2] / det, -A[1] / det, A[0] / det];
    return {p: [inv[0] * b[0] + inv[1] * b[1], inv[1] * b[0] + inv[2] * b[1]], cov: inv};
  }
  var trongSo = function (p) { return tia.map(function (t) { var d = p ? Math.max(2, Math.hypot(p[0] - t.c[0], p[1] - t.c[1])) : (t.g ? Math.hypot(t.g[0] - t.c[0], t.g[1] - t.c[1]) : 25);
    return 1 / (Math.pow(ST * d, 2) + SC * SC); }); };
  var w = trongSo(null), kq = giai(w); if (!kq) return null;
  for (var it = 0; it < 4; it++) { w = trongSo(kq.p); var k2 = giai(w); if (!k2) break; kq = k2; }
  var nguoc = 0, chi = 0, kc = 0;
  var tiaRa = tia.map(function (t, k) { var dx = kq.p[0] - t.c[0], dy = kq.p[1] - t.c[1], tt = dx * t.u[0] + dy * t.u[1], e = Math.abs(dx * t.u[1] - dy * t.u[0]);
    if (tt < 0) nguoc++; chi += e * e * w[k]; kc += Math.hypot(dx, dy) / tia.length;
    return {cam: [t.x.cam.lat, t.x.cam.lon], huong: t.x.cam.huong, kc: Math.hypot(dx, dy), lech: e}; });
  chi = Math.sqrt(chi / tia.length);
  var ca = kq.cov[0], cb = kq.cov[1], cc = kq.cov[2], tb = (ca + cc) / 2, rr = Math.sqrt(Math.pow((ca - cc) / 2, 2) + cb * cb);
  return {lat: lat0 + kq.p[1] / ky, lon: lon0 + kq.p[0] / kx, ss: Math.sqrt(ca + cc), truc: [Math.sqrt(Math.max(0, tb + rr)), Math.sqrt(Math.max(0, tb - rr)), 0.5 * Math.atan2(2 * cb, ca - cc) / r],
          gocGiao: goc, n: tia.length, nguoc: nguoc, chi: chi, lech: chi > 1.5 || nguoc > 0, kc: kc, dungDiem: dungDiem, tia: tiaRa, kieu: "giao_tia"};
}
/* dấu trang: chạy trong tab Google Earth */
function geDauTrang(H, XA, L, geTinh, geTamGiac) {
  var W = window, d = document;
  if (W.__lmGE) { W.__lmGE.tat(); return; }
  if (!/earth\.google\./.test(location.host)) { alert(L.chiGE); return; }
  var Z = 2147483647, goc = d.createElement("div"), mk = function (css) { var e = d.createElement("div"); e.style.cssText = css; goc.appendChild(e); return e; };
  goc.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;z-index:" + Z + ";pointer-events:none";
  var ngang = mk("position:fixed;height:2px;width:44px;background:#ff1744;box-shadow:0 0 0 1px #fff"), doc = mk("position:fixed;width:2px;height:44px;background:#ff1744;box-shadow:0 0 0 1px #fff");
  var vong = mk("position:fixed;width:16px;height:16px;border:2px solid #ff1744;border-radius:50%;box-shadow:0 0 0 1px #fff");
  var hop = mk("position:fixed;pointer-events:auto;background:rgba(255,255,255,.95);border:1px solid #888;border-radius:8px;padding:6px 8px;font:13px/1.35 sans-serif;color:#111;max-width:440px;box-shadow:0 2px 8px rgba(0,0,0,.3)");
  var t1 = d.createElement("div"), t2 = d.createElement("div"), t3 = d.createElement("div"), t4 = d.createElement("div"), hang = d.createElement("div");
  t1.style.fontWeight = "700"; t3.style.color = "#555"; t4.style.cssText = "margin-top:3px;color:#0b4fa8;font-weight:600"; hang.style.cssText = "margin-top:4px;display:flex;gap:6px;flex-wrap:wrap";
  var nut = function (chu, tieuDe) { var b = d.createElement("button"); b.textContent = chu; if (tieuDe) b.title = tieuDe;
    b.style.cssText = "font:13px sans-serif;padding:3px 9px;border:1px solid #777;border-radius:5px;background:#f3f3f3;cursor:pointer"; hang.appendChild(b); return b; };
  var bThem = nut("➕ " + L.them, L.themGT), bChep = nut("📋 " + L.chep), bXoa = nut("🗑", L.xoaGT), bTat = nut("×");
  [t1, t2, t3, t4, hang].forEach(function (e) { hop.appendChild(e); });
  d.documentElement.appendChild(goc);
  function sau(root, f) { var st = [root]; while (st.length) { var n = st.pop(); if (!n) continue; f(n); if (n.shadowRoot) st.push(n.shadowRoot); var ch = n.children || []; for (var i = 0; i < ch.length; i++) if (ch[i] !== goc) st.push(ch[i]); } }
  var khung = null, ngay = null, cacGoc = [];
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
  function khacGoc(u) {                                // góc nhìn hiện tại khác góc nhìn đã thêm cuối cùng (chỗ máy ảnh hoặc hướng)
    if (!cacGoc.length) return true; var a = geTinh(u, H), b = geTinh(cacGoc[cacGoc.length - 1].u, H); if (!a || !b) return true;
    return Math.abs(a.cam.lat - b.cam.lat) > 5e-6 || Math.abs(a.cam.lon - b.cam.lon) > 5e-6 || Math.abs(a.cam.huong - b.cam.huong) > 0.3;
  }
  function dungGoc() { var ds = cacGoc.map(function (v) { return v.u; }); if (khacGoc(location.href)) ds.push(location.href); return ds; }
  function veLai() {
    if (!khung) timKhung();
    var x = khung.left + khung.width / 2, y = khung.top + khung.height / 2;
    ngang.style.left = (x - 22) + "px"; ngang.style.top = (y - 1) + "px"; doc.style.left = (x - 1) + "px"; doc.style.top = (y - 22) + "px";
    vong.style.left = (x - 10) + "px"; vong.style.top = (y - 10) + "px";
    hop.style.left = (khung.left + 10) + "px"; hop.style.top = (khung.top + 10) + "px";
    var r = geTinh(location.href, H), mau = "#ff1744";
    if (!r) { t1.textContent = L.chuaUrl; t2.textContent = ""; }
    else if (r.loi) { t1.textContent = L.chanTroi; t2.textContent = cacGoc.length ? L.vanDung : ""; mau = "#888"; }
    else {
      t1.textContent = L.tam + ": " + r.lat.toFixed(6) + ", " + r.lon.toFixed(6);
      t2.textContent = r.kieu === "sv" ? L.cach.replace("{d}", r.kc.toFixed(0)).replace("{s}", r.ss.toFixed(0)) + (r.kc > XA ? " · " + L.xa : "") : L.tren;
      mau = r.kieu === "sv" && r.kc > XA ? "#ff9100" : "#ff1744";
    }
    t3.textContent = ngay ? L.ngay + ": " + ngay.s + " (" + ngay.g + ")" : L.khongNgay;
    var ds = dungGoc(), g = ds.length >= 2 ? geTamGiac(ds, H, geTinh) : null;
    t4.textContent = !cacGoc.length ? L.goiY : !g ? L.daCo.replace("{n}", cacGoc.length) :
      L.giao.replace("{n}", g.n).replace("{t}", g.lat.toFixed(6) + ", " + g.lon.toFixed(6)).replace("{s}", g.ss.toFixed(1)).replace("{g}", g.gocGiao.toFixed(0)) +
      (g.lech ? " · " + L.lech : g.gocGiao < 10 ? " · " + L.gocNho : g.n === 2 ? " · " + L.ba : "");
    t4.style.color = g && g.lech ? "#b42318" : "#0b4fa8";
    [ngang, doc].forEach(function (e) { e.style.background = mau; }); vong.style.borderColor = mau;
  }
  function them() {
    timNgay(); var r = geTinh(location.href, H); if (!r || r.kieu === "tren") { alert(r ? L.chiSV : L.chuaUrl); return; }
    if (!khacGoc(location.href)) { alert(L.trungGoc); return; }
    cacGoc.push({u: location.href, g: ngay ? ngay.g : "", s: ngay ? ngay.s : ""}); veLai();
  }
  function chep() {
    timNgay();
    var ds = cacGoc.slice(); if (khacGoc(location.href)) { var r0 = geTinh(location.href, H); if (r0 && r0.kieu !== "tren") ds.push({u: location.href, g: ngay ? ngay.g : "", s: ngay ? ngay.s : ""}); }
    var s;
    if (ds.length >= 2) {
      var g = geTamGiac(ds.map(function (v) { return v.u; }), H, geTinh); if (!g) { alert(L.khongGiao); return; }
      s = ["LMGE2", g.lat.toFixed(7), g.lon.toFixed(7), ds.length].concat(ds.map(function (v) { return encodeURIComponent(v.u) + "^" + v.g + "^" + encodeURIComponent(v.s); })).join("|");
    } else {
      var r = geTinh(location.href, H);
      if (!r || r.loi) { alert(r ? L.chanTroi : L.chuaUrl); return; }
      s = ["LMGE1", r.lat.toFixed(7), r.lon.toFixed(7), ngay ? ngay.g : "", ngay ? ngay.s : "", encodeURIComponent(location.href)].join("|");
    }
    var xong = function () { bChep.textContent = "✓ " + L.daChep; setTimeout(function () { bChep.textContent = "📋 " + L.chep; }, 1800); };
    var cu = function () { var ta = d.createElement("textarea"); ta.value = s; ta.style.cssText = "position:fixed;left:-9999px"; d.body.appendChild(ta); ta.select(); try { d.execCommand("copy"); xong(); } catch (e) { prompt(L.chepTay, s); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(xong, cu); else cu();
    W.__lmGE.chepCuoi = s;
  }
  bThem.onclick = them; bChep.onclick = chep; bXoa.onclick = function () { cacGoc = []; veLai(); }; bTat.onclick = function () { W.__lmGE.tat(); };
  timKhung(); timNgay(); veLai();
  var h1 = setInterval(veLai, 300), h2 = setInterval(timKhung, 1500), h3 = setInterval(timNgay, 2500), nghe = function () { khung = null; };
  W.addEventListener("resize", nghe);
  W.__lmGE = {tat: function () { clearInterval(h1); clearInterval(h2); clearInterval(h3); W.removeEventListener("resize", nghe); goc.remove(); W.__lmGE = null; },
              chep: chep, them: them, veLai: veLai, goc: function () { return cacGoc; }};
}
function geNhan() {                                  // chữ trong dấu trang theo ngôn ngữ đang dùng
  return {chiGE: T("Dấu trang này dùng trong tab Google Earth (earth.google.com)."), chep: T("Chép điểm"), daChep: T("đã chép, sang geoportal bấm Ctrl+V"),
    chepTay: T("Chép dòng này rồi dán vào geoportal (Ctrl+V):"), chuaUrl: T("Chưa đọc được vị trí từ đường dẫn: di chuyển góc nhìn một chút."),
    chanTroi: T("Tâm đang nhìn lên trời: hạ góc nhìn xuống mặt đất."), tam: T("Tâm"), cach: T("cách máy ảnh {d} m (±{s} m)"),
    xa: T("xa quá, nên nhìn chỗ gần hơn"), tren: T("nhìn từ trên: đúng điểm giữa màn hình"), ngay: T("Ngày ảnh"), khongNgay: T("Chưa thấy ngày ảnh (sẽ nhập trong geoportal)"),
    them: T("Góc nhìn"), themGT: T("Thêm góc nhìn này; sang ảnh Street View khác, nhắm đúng chỗ đó rồi thêm tiếp: toạ độ là giao các tia nhìn"),
    xoaGT: T("Xoá các góc nhìn đã thêm"), vanDung: T("góc nhìn này vẫn dùng được cho giao tia (chỉ cần hướng nhìn)"),
    goiY: T("Chính xác hơn: ➕ thêm góc nhìn, sang ảnh khác nhắm lại đúng chỗ đó"), daCo: T("Đã thêm {n} góc nhìn: sang ảnh khác, nhắm đúng chỗ đó"),
    giao: T("Giao {n} tia: {t} (±{s} m, góc giao {g}°)"), lech: T("các tia không gặp nhau: kiểm lại chỗ nhắm"), gocNho: T("góc giao nhỏ: đứng xa nhau hơn"),
    chiSV: T("Góc nhìn chỉ thêm được ở Street View"), trungGoc: T("Góc nhìn này đã thêm: sang ảnh khác (chỗ đứng khác)"), khongGiao: T("Không giao được các tia: hướng nhìn gần như song song"), ba: T("thêm góc thứ ba để tự kiểm")};
}
function geHref() {
  const src = "(" + geDauTrang.toString() + ")(" + (+GEP.H || 2.5) + "," + (+GEP.xa || 40) + "," + JSON.stringify(geNhan()) + "," + geTinh.toString() + "," + geTamGiac.toString() + ")";
  return "javascript:" + encodeURIComponent(src);
}

/* dự phòng khi trình duyệt không chạy dấu trang trên Google Earth: cùng mã đó dạng userscript cho Tampermonkey (nút 📌 nổi ở góc dưới) */
function geUserscript() {
  return ["// ==UserScript==", "// @name         Geoportal Hai Phong: lay diem mau tu Google Earth", "// @namespace    x102.github.io/haiphong",
    "// @version      " + VERSION, "// @match        https://earth.google.com/*", "// @grant        none", "// ==/UserScript==",
    "(function () {", "  var geTinh = " + geTinh.toString() + ";", "  var geTamGiac = " + geTamGiac.toString() + ";", "  var geDauTrang = " + geDauTrang.toString() + ";",
    "  var H = " + (+GEP.H || 2.5) + ", XA = " + (+GEP.xa || 40) + ", L = " + JSON.stringify(geNhan()) + ";",
    "  function nut() { if (document.getElementById('lmGEnut')) return; var b = document.createElement('button'); b.id = 'lmGEnut'; b.textContent = '📌'; b.title = L.tam + ' / ' + L.chep;",
    "    b.style.cssText = 'position:fixed;right:14px;bottom:96px;z-index:2147483647;width:40px;height:40px;border-radius:50%;border:2px solid #ff1744;background:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.3)';",
    "    b.onclick = function () { geDauTrang(H, XA, L, geTinh, geTamGiac); }; (document.body || document.documentElement).appendChild(b); }",
    "  nut(); setInterval(nut, 3000);", "})();", ""].join("\n");
}

/* ---------- phía geoportal: Ctrl+V tạo điểm ---------- */
var GE_LOP = null;
function gePhanTich(txt) {                           // -> {lat, lon, ngay, ngayGoc, url, r (một góc nhìn) | tg (giao tia), cacGoc} | {loi} | null
  txt = String(txt || "").trim(); if (!txt) return null;
  const H = +GEP.H || 2.5, goc = []; let toaDo = null;
  txt.split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach(dong => {
    if (/^LMGE2\|/.test(dong)) { dong.split("|").slice(4).forEach(v => { const a = v.split("^"); const u = decodeURIComponent(a[0] || ""); if (u) goc.push({url: u, ngay: a[1] || null, ngayGoc: decodeURIComponent(a[2] || "")}); }); return; }
    if (/^LMGE1\|/.test(dong)) { const a = dong.split("|"), u = decodeURIComponent(a[5] || ""); if (u) goc.push({url: u, ngay: a[3] || null, ngayGoc: a[4] || "", lat: +a[1], lon: +a[2]}); return; }
    if (/earth\.google\.[^/]+\/web\//.test(dong) && /@-?\d/.test(dong)) { goc.push({url: dong, ngay: null, ngayGoc: ""}); return; }
    const m = /^(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})$/.exec(dong);
    if (m && Math.abs(+m[1]) <= 90 && Math.abs(+m[2]) <= 180) toaDo = {lat: +m[1], lon: +m[2]};
  });
  if (!goc.length) return toaDo ? {lat: toaDo.lat, lon: toaDo.lon, ngay: null, ngayGoc: "", url: "", r: null} : null;
  const coNgay = goc.find(v => v.ngay) || {};
  if (goc.length === 1 || goc.filter(v => { const r = geTinh(v.url, H); return r && r.cam && r.kieu !== "tren"; }).length < 2) {
    const v = goc[goc.length - 1], r = geTinh(v.url, H);
    if (!r) { return isFinite(v.lat) ? {lat: v.lat, lon: v.lon, ngay: v.ngay, ngayGoc: v.ngayGoc, url: v.url, r: null} : null; }
    if (r.loi) return {loi: r.loi};
    return {lat: r.lat, lon: r.lon, ngay: v.ngay || coNgay.ngay || null, ngayGoc: v.ngayGoc || coNgay.ngayGoc || "", url: v.url, r};       // tính lại theo chiều cao máy ảnh đặt ở geoportal
  }
  const tg = geTamGiac(goc.map(v => v.url), H, geTinh);
  if (!tg) return {loi: "song_song"};
  return {lat: tg.lat, lon: tg.lon, ngay: coNgay.ngay || null, ngayGoc: coNgay.ngayGoc || "", url: goc[0].url, tg, cacGoc: goc};
}
function geVe(p) {                                   // vị trí máy ảnh, tia nhìn, vòng (elip) sai số
  if (GE_LOP) { map.removeLayer(GE_LOP); GE_LOP = null; }
  const s = p && p.sv; if (!s) return;
  GE_LOP = L.layerGroup().addTo(map);
  const g0 = s.goc || [p.lat, p.lon], mau = "#ff1744";
  const cam = (c, tren) => L.circleMarker(c, {radius: 4, color: mau, fillColor: "#fff", fillOpacity: 1, weight: 2, interactive: !!tren}).addTo(GE_LOP);
  if (s.kieu === "giao_tia" && s.cac_goc) {
    const kx = 6371008.8 * Math.PI / 180 * Math.cos(g0[0] * Math.PI / 180), ky = 6371008.8 * Math.PI / 180;
    s.cac_goc.forEach((v, k) => {
      if (!v.cam) return;
      const dx = (g0[1] - v.cam[1]) * kx, dy = (g0[0] - v.cam[0]) * ky, d = Math.hypot(dx, dy) * 1.25, h = v.huong * Math.PI / 180;
      L.polyline([v.cam, [v.cam[0] + d * Math.cos(h) / ky, v.cam[1] + d * Math.sin(h) / kx]], {color: mau, weight: 1.5, dashArray: "4 3", interactive: false}).addTo(GE_LOP);
      cam(v.cam, true).bindTooltip(`${k + 1}: ${v.ngay || ""} · ${Math.round(v.kc || 0)} m`);
    });
    if (s.truc) {                                     // elip sai số 1σ
      const [a, b, th] = s.truc, t0 = th * Math.PI / 180, pts = [];
      for (let i = 0; i <= 36; i++) { const t = i / 36 * 2 * Math.PI, x = a * Math.cos(t) * Math.cos(t0) - b * Math.sin(t) * Math.sin(t0), y = a * Math.cos(t) * Math.sin(t0) + b * Math.sin(t) * Math.cos(t0);
        pts.push([g0[0] + y / ky, g0[1] + x / kx]); }
      L.polygon(pts, {color: mau, weight: 1.5, fillOpacity: 0.1, interactive: false}).addTo(GE_LOP);
    }
    return;
  }
  if (s.ss) L.circle(g0, {radius: s.ss, color: mau, weight: 1.5, fillOpacity: 0.08, interactive: false}).addTo(GE_LOP);
  if (s.cam && s.kieu === "sv") {
    L.polyline([[s.cam[0], s.cam[1]], g0], {color: mau, weight: 1.5, dashArray: "4 3", interactive: false}).addTo(GE_LOP);
    cam([s.cam[0], s.cam[1]]);
  }
}
function geSv(g) {                                   // thông tin nguồn ảnh của điểm (p.sv) từ kết quả gePhanTich
  if (g.tg) {
    const tg = g.tg;
    return {nguon: "gearth", kieu: "giao_tia", goc: [+g.lat.toFixed(7), +g.lon.toFixed(7)], ngay: g.ngay || null, ngay_goc: g.ngayGoc || "",
            n: tg.n, ss: +tg.ss.toFixed(1), kc: +tg.kc.toFixed(1), goc_giao: Math.round(tg.gocGiao), lech: !!tg.lech, chi: +tg.chi.toFixed(2),
            truc: [+tg.truc[0].toFixed(2), +tg.truc[1].toFixed(2), Math.round(tg.truc[2])],
            cac_goc: g.cacGoc.map((v, k) => { const t = tg.tia[k] || {}; return {url: v.url, ngay: v.ngay || null, ngay_goc: v.ngayGoc || "", cam: t.cam ? [+t.cam[0].toFixed(7), +t.cam[1].toFixed(7)] : null, huong: t.huong != null ? +(+t.huong).toFixed(1) : null, kc: t.kc != null ? +t.kc.toFixed(1) : null}; }),
            url: g.url || ""};
  }
  const r = g.r || {}, c = r.cam;
  return {nguon: g.url ? "gearth" : "toado", goc: [+g.lat.toFixed(7), +g.lon.toFixed(7)], ngay: g.ngay || null, ngay_goc: g.ngayGoc || "", kieu: r.kieu || null, kc: r.kc != null ? +r.kc.toFixed(1) : null,
          ss: r.ss != null ? +r.ss.toFixed(1) : null, H: r.kieu === "sv" ? +GEP.H : null, cam: c ? [+c.lat.toFixed(7), +c.lon.toFixed(7)] : null,
          huong: c ? +c.huong.toFixed(1) : null, nghieng: c ? +c.nghieng.toFixed(1) : null, url: g.url || ""};
}
function geNgayCanhBao(g) {                          // các góc nhìn chụp khác ngày nhau
  const ns = [...new Set((g.cacGoc || []).map(v => v.ngay).filter(Boolean))];
  return ns.length > 1 ? T("các góc nhìn chụp khác ngày: {d}", {d: ns.join(", ")}) : "";
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
    p.sv = geSv(g);
    p.ghi_chu = (p.ghi_chu ? p.ghi_chu + " | " : "") + geTomTat(p.sv);
    save();
  }
  const y = p.sv && p.sv.ngay ? +p.sv.ngay.slice(0, 4) : null;
  if (y && years().includes(y) && y !== ST.nam) setYear(y); else render();
  map.setView([p.lat, p.lon], Math.max(map.getZoom(), 17));
  geVe(p);
  const cb = [geNgayCanhBao(g), g.tg && g.tg.lech ? T("các tia không gặp nhau: kiểm lại chỗ nhắm") : "", g.tg && g.tg.gocGiao < 10 ? T("góc giao nhỏ: đứng xa nhau hơn") : ""].filter(Boolean).join(" · ");
  if (!gan) msg(geTomTat(p.sv) + " · " + (y ? (years().includes(y) ? T("năm {y}", {y}) : T("năm {y} không nằm trong các năm cần gán", {y})) : T("chưa có ngày ảnh: chọn năm rồi gán")) + " · " + T("bấm phím lớp để gán") + (cb ? " · ⚠ " + cb : ""), cb ? "wa" : "ok", 8000);
  return p;
}
function geThemGoc(p, g) {                           // thêm góc nhìn vào điểm đã có: giao lại các tia, dời điểm
  const s = p.sv || {}, cu = s.cac_goc ? s.cac_goc.map(v => ({url: v.url, ngay: v.ngay, ngayGoc: v.ngay_goc})) : s.url ? [{url: s.url, ngay: s.ngay, ngayGoc: s.ngay_goc}] : [];
  const moi = g.cacGoc ? g.cacGoc : g.url ? [{url: g.url, ngay: g.ngay, ngayGoc: g.ngayGoc}] : [];
  if (!moi.length) { msg(T("Bộ nhớ tạm không có góc nhìn Google Earth"), "wa", 3500); return null; }
  const tat = cu.concat(moi).filter((v, i, a) => a.findIndex(x => x.url === v.url) === i);
  const g2 = gePhanTich(tat.map(v => "LMGE1|||" + (v.ngay || "") + "|" + (v.ngayGoc || "") + "|" + encodeURIComponent(v.url)).join("\n"));
  if (!g2 || g2.loi || !g2.tg) { msg(T("Không giao được các tia: hướng nhìn gần như song song"), "wa", 4000); return null; }
  const o = CORE.newPoint(p.id, g2.lon, g2.lat);
  if (o.x !== p.x || o.y !== p.y) {
    const khac = Object.values(ST.diem).find(q => q !== p && q.x === o.x && q.y === o.y);
    if (khac) { msg(T("Toạ độ mới rơi vào điểm ảnh của điểm {id}: không dời", {id: khac.id}), "wa", 4500); return null; }
    p.lat = o.lat; p.lon = o.lon; p.x = o.x; p.y = o.y;
  }
  const truoc = p.sv && p.sv.goc ? p.sv.goc : [p.lat, p.lon];
  p.sv = geSv(g2);
  p.ghi_chu = (p.ghi_chu || "").replace(/(Street View|Google Earth|Giao )[^|]*/, geTomTat(p.sv));
  save(); render(); geVe(p);
  const doi = Math.hypot((p.sv.goc[0] - truoc[0]) * 111320, (p.sv.goc[1] - truoc[1]) * 111320 * Math.cos(p.lat * Math.PI / 180));
  msg(geTomTat(p.sv) + " · " + T("dời {m} m so với trước", {m: doi.toFixed(1)}) + (geNgayCanhBao(g2) ? " · ⚠ " + geNgayCanhBao(g2) : ""), g2.tg.lech ? "wa" : "ok", 7000);
  return p;
}
function geTomTat(s) {
  if (!s) return "";
  const n = s.ngay ? T("ảnh {d}", {d: s.ngay}) : T("chưa có ngày ảnh");
  if (s.kieu === "giao_tia") return T("Giao {k} tia nhìn Street View (Google Earth), {n}, góc giao {g}°, ±{s} m", {k: s.n, n, g: s.goc_giao, s: (+s.ss).toFixed(1)});
  return s.nguon === "gearth" ? (s.kieu === "sv" ? T("Street View (Google Earth), {n}, cách máy ảnh {k} m (±{s} m)", {n, k: Math.round(s.kc), s: Math.round(s.ss)})
                                                 : T("Google Earth nhìn từ trên, {n}", {n})) : T("toạ độ dán vào");
}
function geXuLy(s, them) {                           // xử lý chữ dán vào (Ctrl+V, nút Dán, ô dán): tạo điểm, hoặc thêm góc nhìn cho điểm đang xem
  const g = gePhanTich(s);
  if (!g) { msg(T("Bộ nhớ tạm không có điểm Google Earth hay toạ độ"), "wa", 3500); return false; }
  if (g.loi) { msg(g.loi === "song_song" ? T("Không giao được các tia: hướng nhìn gần như song song") : T("Tâm đang nhìn lên trời: hạ góc nhìn xuống mặt đất."), "wa", 4000); return false; }
  if (typeof LUOI !== "undefined" && LUOI.mo) luoiMo(false);
  if (them && cur()) return !!geThemGoc(cur(), g);
  geTaoDiem(g); return true;
}
document.addEventListener("paste", e => {
  const t = e.target && e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
  const s = (e.clipboardData || window.clipboardData) ? (e.clipboardData || window.clipboardData).getData("text") : "";
  if (!gePhanTich(s)) return;
  e.preventDefault();
  geXuLy(s, false);
});
/* bản 3.8: nút thay cho Ctrl+V; không đọc được bộ nhớ tạm thì mở ô để dán tay */
async function geDanNut(them) {
  let s = null;
  try { if (navigator.clipboard && navigator.clipboard.readText) s = await navigator.clipboard.readText(); } catch (e) { s = null; }
  if (s && gePhanTich(s)) { geXuLy(s, them); return; }
  geMoO(them, s);
}
function geMoO(them, s) {
  const dl = $("dlgGEdan"); if (!dl) return;
  $("geTxt").value = s && !gePhanTich(s) ? "" : (s || "");
  dl.dataset.them = them ? "1" : ""; $("geTxtThem").hidden = !cur(); dl.showModal(); setTimeout(() => $("geTxt").focus(), 30);
}
/* thông tin ảnh mặt đất trong khung điểm; sửa ngày ảnh */
var _renderPoint37 = renderPoint;
renderPoint = function () {
  _renderPoint37.apply(this, arguments);
  const p = cur(), box = $("pinfo"); if (!p || !box) { geVe(null); return; }
  if (!p.sv) { if (GE_LOP) geVe(null); return; }
  const s = p.sv;
  const lk = s.cac_goc ? s.cac_goc.map((v, k) => `<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" title="${esc((v.ngay || "") + " · " + Math.round(v.kc || 0) + " m")}">${k + 1}</a>`).join(" ")
                      : s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${T("mở lại góc nhìn")}</a>` : "";
  box.insertAdjacentHTML("beforeend", `<div class="sm" data-ge style="margin-top:3px">📷 ${esc(geTomTat(s))}${s.ngay_goc ? ` <span class="mu">(“${esc(s.ngay_goc)}”)</span>` : ""}
    ${s.lech ? ` <b style="color:#b42318">⚠ ${T("các tia không gặp nhau: kiểm lại chỗ nhắm")}</b>` : ""}
    · ${T("ngày ảnh")} <input type="month" data-ge-ngay value="${esc((s.ngay || "").slice(0, 7))}" style="width:140px">
    ${lk ? ` · ${s.cac_goc ? T("góc nhìn") + ": " : ""}${lk}` : ""}
    ${s.nguon === "gearth" ? ` · <button type="button" data-ge-them title="${esc(T("Dán thêm góc nhìn Street View khác của đúng chỗ này: toạ độ là giao các tia nhìn, chính xác hơn"))}">➕ ${T("thêm góc nhìn")}</button>` : ""}</div>`);
  const bt = box.querySelector("[data-ge-them]"); if (bt) bt.onclick = () => geDanNut(true);
  const inp = box.querySelector("[data-ge-ngay]");
  if (inp) inp.onchange = () => { s.ngay = inp.value || null; p.ghi_chu = (p.ghi_chu || "").replace(/(Giao |Street View|Google Earth)[^|]*/, geTomTat(s)); save(); const y = s.ngay ? +s.ngay.slice(0, 4) : null; if (y && years().includes(y)) setYear(y); else render(); };
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
  $("geDan").onclick = () => { dl.close(); geDanNut(false); };
  if ($("bGEdan")) $("bGEdan").onclick = () => geDanNut(false);
  const d2 = $("dlgGEdan");
  if (d2) {
    $("geTxtTao").onclick = () => { if (geXuLy($("geTxt").value, false)) d2.close(); };
    $("geTxtThem").onclick = () => { if (geXuLy($("geTxt").value, true)) d2.close(); };
    $("geTxtDong").onclick = () => d2.close();
  }
})();
var _select37 = select;                              // tạo điểm từ Google Earth thì không tự mở lại Google Earth (bản 3.6.1)
select = function () { if (TM.tam) { const k = TM.k; TM.k = ""; try { return _select37.apply(this, arguments); } finally { TM.k = k; } } return _select37.apply(this, arguments); };
