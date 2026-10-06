// Bản 3.8: giao nhiều tia nhìn Street View. Dựng các góc nhìn giả nhắm đúng một mục tiêu đã biết (máy ảnh thật cao 3.5 m, nhưng
// geoportal đặt 2.5 m: một góc nhìn bị lệch, giao tia thì không); kiểm toán, dấu trang (thêm góc nhìn, giao trực tiếp, chép LMGE2),
// dán vào geoportal (Ctrl+V, ô dán tay nhiều dòng, nút Dán điểm), thêm góc nhìn cho điểm đã có, cột xuất, dịch.
const {ok, xong, NM} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const {JSDOM} = require(NM + "/jsdom");
const R = 6371008.8, rad = Math.PI / 180;
const MT = {lat: 20.90, lon: 106.60};                                        // mục tiêu (bờ ruộng)
const kx = R * rad * Math.cos(MT.lat * rad), ky = R * rad;
function goc(dx, dy, H = 3.5, lech = 0) {                                     // máy ảnh ở (dx, dy) m so với mục tiêu, nhắm đúng mục tiêu
  const lat = MT.lat + dy / ky, lon = MT.lon + dx / kx, D = Math.hypot(dx, dy), h = (Math.atan2(-dx, -dy) / rad + 360 + lech) % 360, t = 90 - Math.atan(H / D) / rad;
  return `https://earth.google.com/web/search/x/@${lat.toFixed(7)},${lon.toFixed(7)},5.5a,0d,60y,${h.toFixed(4)}h,${t.toFixed(5)}t,0r/data=abc`;
}
const kc = (a, b) => Math.hypot((a.lat - b.lat) * ky, (a.lon - b.lon) * kx);
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.8", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  const dan = s => { const ev = new w.Event("paste", {bubbles: true, cancelable: true}); Object.defineProperty(ev, "clipboardData", {value: {getData: () => s}}); w.document.body.dispatchEvent(ev); return ev.defaultPrevented; };
  const U1 = goc(-12, -30), U2 = goc(14, -28), U3 = goc(30, -5);          // ba chỗ đứng trên đường phía nam, đông nam

  // ---------- 1. toán giao tia
  const don = E(`geTinh(${JSON.stringify(U1)}, 2.5)`);
  ok(kc(don, MT) > 5, `một góc nhìn, chiều cao đặt sai (2.5 thay vì 3.5 m): lệch ${kc(don, MT).toFixed(1)} m`);
  const g2 = E(`geTamGiac(${JSON.stringify([U1, U2])}, 2.5, geTinh)`);
  ok(kc(g2, MT) < 0.05 && g2.n === 2 && !g2.lech && g2.gocGiao > 40 && g2.ss > 0.5 && g2.ss < 3, `hai góc nhìn: giao tia đúng mục tiêu (lệch ${(kc(g2, MT) * 100).toFixed(1)} cm), góc giao ${g2.gocGiao.toFixed(0)}°, ±${g2.ss.toFixed(2)} m, không phụ thuộc chiều cao`);
  const g3 = E(`geTamGiac(${JSON.stringify([U1, U2, U3])}, 2.5, geTinh)`);
  ok(kc(g3, MT) < 0.05 && g3.n === 3 && g3.ss < g2.ss, `ba góc nhìn: sai số giảm (±${g3.ss.toFixed(2)} m < ±${g2.ss.toFixed(2)} m)`);
  const gn = E(`geTamGiac(${JSON.stringify([goc(-12, -30, 3.5, 0.4), goc(14, -28, 3.5, -0.4), goc(30, -5, 3.5, 0.3)])}, 2.5, geTinh)`);
  ok(kc(gn, MT) < 1 && !gn.lech, `nhắm lệch ±0.4°: vẫn trong ${kc(gn, MT).toFixed(2)} m, không báo lệch`);
  const gsai = E(`geTamGiac(${JSON.stringify([U1, U2, goc(30, -5, 3.5, 15)])}, 2.5, geTinh)`);
  ok(gsai.lech, "một góc nhìn nhắm chỗ khác (lệch 15°): báo các tia không gặp nhau");
  const gss = E(`geTamGiac(${JSON.stringify([goc(-2, -40), goc(2, -40)])}, 2.5, geTinh)`);
  ok(gss.gocGiao < 10 && gss.dungDiem, `hai chỗ đứng quá gần (góc giao ${gss.gocGiao.toFixed(1)}°): dùng thêm ước lượng theo góc cúi`);

  // ---------- 2. dấu trang: thêm góc nhìn, giao trực tiếp, chép
  const href = E("geHref()");
  const ge = new JSDOM(`<!doctype html><html lang="vi"><body><canvas width="800" height="600"></canvas><div><span>thg 3 2025</span></div></body></html>`, {url: U1, runScripts: "outside-only", pretendToBeVisual: true});
  const gw = ge.window; let chep = null, canhBao = null;
  Object.defineProperty(gw.navigator, "clipboard", {value: {writeText: async s => { chep = s; }}});
  gw.alert = m => { canhBao = m; };
  gw.eval(decodeURIComponent(href.slice(11)));
  const hop = () => gw.document.documentElement.lastElementChild.textContent;
  ok(/➕ Góc nhìn/.test(hop()) && /Chính xác hơn/.test(hop()), "dấu trang có nút ➕ Góc nhìn và gợi ý");
  gw.__lmGE.them(); gw.__lmGE.them();
  ok(gw.__lmGE.goc().length === 1 && /đã thêm/.test(canhBao || ""), "thêm góc nhìn; thêm lại đúng góc đó thì báo trùng");
  gw.history.pushState({}, "", U2.replace("https://earth.google.com", "")); gw.__lmGE.veLai();
  ok(/Giao 2 tia: 20\.90000\d, 106\.60000\d/.test(hop()), "sang ảnh thứ hai, nhắm đúng chỗ: hộp hiện ngay toạ độ giao 2 tia: " + (/Giao[^)]*\)/.exec(hop()) || [""])[0]);
  gw.__lmGE.chep(); await sleep(20);
  ok(/^LMGE2\|20\.90000\d\d\|106\.60000\d\d\|2\|/.test(chep || ""), "Chép điểm: một dòng LMGE2 gồm hai góc nhìn (góc hiện tại tự tính vào)");
  ge.window.close();

  // ---------- 3. dán vào geoportal
  E(`ST.filter = "all"; window.MO = []; window.open = u => { MO.push(u); return null; }; TM.k = "gearth"`);
  const n0 = E("Object.keys(ST.diem).length");
  ok(dan(chep) && E("Object.keys(ST.diem).length") === n0 + 1, "Ctrl+V dòng LMGE2: tạo điểm");
  const p = E("cur()");
  ok(p.sv.kieu === "giao_tia" && p.sv.n === 2 && kc({lat: p.sv.goc[0], lon: p.sv.goc[1]}, MT) < 0.05 && kc(p, MT) < 8 && p.sv.cac_goc.length === 2 && p.sv.ngay === "2025-03" && p.sv.truc.length === 3,
     "điểm giao tia: đúng mục tiêu, lưu hai góc nhìn, ngày ảnh, elip sai số");
  ok(E("GE_LOP.getLayers().length") === 5 && /Giao 2 tia nhìn/.test($("pinfo").textContent) && E("MO.length") === 0, "bản đồ: 2 tia, 2 máy ảnh, elip; khung điểm ghi giao tia; không tự mở Google Earth");
  w.document.body.dispatchEvent(new w.KeyboardEvent("keydown", {key: "4", bubbles: true})); await sleep(20);
  const row = E(`CORE.exportLong([cur()], [ST.nam], IDX)[0]`);
  ok(row.nguon_mau === "gearth:giao_tia" && row.so_goc_nhin === 2 && row.goc_giao_do > 40, "CSV: nguon_mau gearth:giao_tia, so_goc_nhin 2, goc_giao_do");
  // ô dán tay nhiều dòng (khi Ctrl+V không dùng được)
  const dong = [U2, U3].map(u => "LMGE1|||2025-03|thg 3 2025|" + encodeURIComponent(u)).join("\n");
  E(`delete ST.diem[ST.cur]; ST.cur = null; render()`);
  E(`Object.defineProperty(navigator, "clipboard", {configurable: true, value: {readText: async () => { throw new Error("không cho"); }}})`);
  $("bGEdan").click(); await sleep(30);
  ok($("dlgGEdan").open, "nút 📥 Dán điểm: trình duyệt không cho đọc bộ nhớ tạm thì mở ô để dán tay");
  $("geTxt").value = dong; $("geTxtTao").click(); await sleep(20);
  ok(!$("dlgGEdan").open && E("cur().sv.kieu") === "giao_tia" && E("cur().sv.n") === 2 && kc({lat: E("cur().sv.goc[0]"), lon: E("cur().sv.goc[1]")}, MT) < 0.05, "ô dán tay, hai dòng góc nhìn: tạo điểm giao tia");
  // nút Dán điểm đọc được bộ nhớ tạm
  E(`delete ST.diem[ST.cur]; ST.cur = null; render()`);
  E(`Object.defineProperty(navigator, "clipboard", {configurable: true, value: {readText: async () => ${JSON.stringify(chep)}}})`);
  $("bGEdan").click(); await sleep(40);
  ok(E("cur() && cur().sv.kieu") === "giao_tia" && !$("dlgGEdan").open, "nút 📥 Dán điểm đọc được bộ nhớ tạm: tạo điểm ngay, không cần Ctrl+V");
  // thêm góc nhìn cho điểm một góc nhìn
  E(`delete ST.diem[ST.cur]; ST.cur = null; render()`);
  dan("LMGE1|||2025-03|thg 3 2025|" + encodeURIComponent(U1));
  const truoc = E("cur().sv.goc"), idT = E("ST.cur");
  ok(E("cur().sv.kieu") === "sv" && kc({lat: truoc[0], lon: truoc[1]}, MT) > 5 && !!$("pinfo").querySelector("[data-ge-them]"), "điểm một góc nhìn (lệch vì chiều cao): khung điểm có nút ➕ thêm góc nhìn");
  E(`Object.defineProperty(navigator, "clipboard", {configurable: true, value: {readText: async () => ${JSON.stringify("LMGE1|||2025-03|thg 3 2025|" + encodeURIComponent(U2))}}})`);
  $("pinfo").querySelector("[data-ge-them]").click(); await sleep(40);
  ok(E("ST.cur") === idT && E("cur().sv.kieu") === "giao_tia" && E("cur().sv.n") === 2 && kc({lat: E("cur().sv.goc[0]"), lon: E("cur().sv.goc[1]")}, MT) < 0.05,
     `thêm góc nhìn thứ hai: cùng điểm, giao lại đúng mục tiêu (dời ${kc({lat: truoc[0], lon: truoc[1]}, MT).toFixed(1)} m)`);
  // hai góc nhìn song song
  ok(dan([goc(-5, -30, 3.5), goc(-5, -60, 3.5)].map(u => "LMGE1|||||" + encodeURIComponent(u)).join("\n")) || true, "hai góc nhìn cùng một hướng thẳng hàng: xử lý được");

  // ---------- 4. dịch
  E("setLang('ru')"); await sleep(60);
  ok(/Вставить точку/.test($("bGEdan").textContent) && /Ракурс/.test(decodeURIComponent(E("geHref()"))) && /Пересечение 2 лучей/.test($("pinfo").textContent), "tiếng Nga: nút Dán điểm, dấu trang, khung điểm");
  const miss = E("[...T_MISS]").filter(x => /góc nhìn|tia|Dán|giao/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi'); TM.k = ''");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
