// Bản 3.7: lấy điểm mẫu từ Google Earth. Kiểm: tính toạ độ tâm (Street View theo góc cúi + chiều cao, nhìn từ trên đúng điểm nhìn,
// nhìn lên trời bị từ chối); dấu trang chạy trong một trang Google Earth giả (dấu tâm, toạ độ, ngày ảnh, chép); Ctrl+V trong geoportal
// tạo điểm, năm theo ngày ảnh, vòng sai số, không tự mở lại Google Earth; dán đường dẫn, dán toạ độ; trùng điểm; sửa ngày; cột xuất; dịch.
const {ok, xong, NM} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const {JSDOM} = require(NM + "/jsdom");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.7", "bản " + E("VERSION"));
  const dan = s => { const ev = new w.Event("paste", {bubbles: true, cancelable: true}); Object.defineProperty(ev, "clipboardData", {value: {getData: () => s}}); w.document.body.dispatchEvent(ev); return ev.defaultPrevented; };

  // ---------- 1. tính toạ độ tâm
  const SV = "https://earth.google.com/web/search/20.896964,106.582205/@20.89,106.58,6.5a,0d,60y,90h,82.874983651t,0r/data=abc";
  const r1 = E(`geTinh(${JSON.stringify(SV)}, 2.5)`);
  const dLon = 20 / (6371008.8 * Math.cos(20.89 * Math.PI / 180)) * 180 / Math.PI;
  ok(r1.kieu === "sv" && gan(r1.kc, 20, 0.01) && gan(r1.lat, 20.89, 1e-7) && gan(r1.lon, 106.58 + dLon, 1e-7) && gan(r1.ss, 3.23, 0.02),
     `Street View: góc cúi 7.125°, máy ảnh cao 2.5 m → tâm cách 20 m về hướng đông (±${r1.ss.toFixed(2)} m)`);
  const r2 = E(`geTinh("https://earth.google.com/web/@20.9,106.6,10a,1200d,35y,0h,0t,0r", 2.5)`);
  ok(r2.kieu === "tren" && r2.lat === 20.9 && r2.lon === 106.6 && r2.ss === 0, "nhìn từ trên (khoảng cách > 0): tâm đúng là toạ độ trong đường dẫn");
  ok(E(`geTinh("https://earth.google.com/web/@20.9,106.6,6a,0d,60y,0h,95t,0r", 2.5).loi`) === "chan_troi" && E(`geTinh("https://example.com", 2.5)`) === null, "nhìn lên trời bị từ chối; đường dẫn khác không đọc");
  ok(gan(E(`geTinh(${JSON.stringify(SV)}, 3.5).kc`), 28, 0.01), "đổi chiều cao máy ảnh 3.5 m (ruộng thấp hơn đường): khoảng cách 28 m");

  // ---------- 2. dấu trang trong một trang Google Earth giả
  const href = E("geHref()");
  ok(/^javascript:/.test(href) && decodeURIComponent(href.slice(11)).includes("LMGE1") && decodeURIComponent(href.slice(11)).includes("function geTinh"), "dấu trang: mã chạy được, mang theo hàm tính");
  const ge = new JSDOM(`<!doctype html><html lang="vi"><body><div id="app"><canvas width="800" height="600"></canvas></div><div id="duoi"><span>Google</span><span>thg 10 2024</span></div></body></html>`,
    {url: SV, runScripts: "outside-only", pretendToBeVisual: true});
  const gw = ge.window; let chep = null;
  Object.defineProperty(gw.navigator, "clipboard", {value: {writeText: async s => { chep = s; }}});
  gw.alert = m => { throw new Error("alert: " + m); };
  gw.eval(decodeURIComponent(href.slice(11)));
  ok(!!gw.__lmGE && gw.document.querySelectorAll("div[style*='2147483647'] > div").length >= 4, "bấm dấu trang: hiện dấu tâm và hộp thông tin");
  const hopTxt = gw.document.documentElement.lastElementChild.textContent;
  ok(/20\.890000, 106\.58019[23]/.test(hopTxt) && /cách máy ảnh 20 m \(±3 m\)/.test(hopTxt) && /thg 10 2024 \(2024-10\)/.test(hopTxt), "hộp thông tin: toạ độ tâm, khoảng cách, sai số, ngày ảnh: " + hopTxt.slice(0, 120));
  gw.__lmGE.chep(); await sleep(30);
  ok(/^LMGE1\|20\.8900000\|106\.580192[45]\|2024-10\|thg 10 2024\|https%3A/.test(chep || ""), "Chép điểm: một dòng LMGE1 có toạ độ, ngày ảnh, đường dẫn");
  gw.eval(decodeURIComponent(href.slice(11)));
  ok(!gw.__lmGE && !gw.document.querySelector("div[style*='2147483647']"), "bấm dấu trang lần nữa: tắt dấu tâm");
  ge.window.close();

  // ---------- 3. Ctrl+V trong geoportal
  E(`window.MO = []; window.open = (u) => { MO.push(u); return null; }; TM.k = "gearth"; ST.filter = "all"; setYear(2025)`);
  const n0 = E("Object.keys(ST.diem).length");
  ok(dan(chep) && E("Object.keys(ST.diem).length") === n0 + 1, "dán dòng LMGE1: tạo một điểm mới");
  const p = E("cur()");
  ok(gan(p.sv.goc[0], 20.89, 1e-6) && gan(p.sv.goc[1], 106.5801925, 1e-6) && gan(p.lat, 20.89, 1e-4) && gan(p.lon, 106.5801925, 1e-4) && p.sv.ngay === "2024-10" && p.sv.kieu === "sv" && gan(p.sv.kc, 20, 0.1) && p.sv.cam[0] === 20.89 && /earth\.google/.test(p.sv.url),
     "điểm mới: toạ độ tâm (ghi nguyên), điểm mẫu ở tâm điểm ảnh 10 m chứa nó, ngày ảnh, vị trí máy ảnh, khoảng cách, đường dẫn: " + JSON.stringify({lat: p.lat, lon: p.lon, sv: p.sv}).slice(0, 300));
  ok(E("ST.nam") === 2024 && E("MO.length") === 0, "chuyển sang năm của ngày ảnh (2024); không tự mở lại Google Earth");
  ok(E("GE_LOP && GE_LOP.getLayers().length") === 3 && /Street View/.test($("pinfo").textContent), "bản đồ: vòng sai số, tia nhìn, vị trí máy ảnh; khung điểm ghi nguồn ảnh");
  w.document.body.dispatchEvent(new w.KeyboardEvent("keydown", {key: "4", bubbles: true})); await sleep(20);
  const row = E(`CORE.exportLong([cur()], [2024], IDX)[0]`);
  ok(E("cur().nhan[2024]") === "T1" && row.nguon_mau === "gearth:sv" && row.ngay_anh_mau === "2024-10" && gan(row.kc_may_anh_m, 20, 0.1) && gan(row.sai_so_m, 3.2, 0.1),
     "bấm phím lớp gán năm 2024; CSV có nguon_mau, ngay_anh_mau, kc_may_anh_m, sai_so_m");
  const id1 = E("ST.cur");
  dan(chep); ok(E("Object.keys(ST.diem).length") === n0 + 1 && E("ST.cur") === id1, "dán lại điểm trong cùng điểm ảnh 10 m: mở điểm đã có, không tạo trùng");
  // dán đường dẫn Google Earth (không có ngày ảnh)
  ok(dan("https://earth.google.com/web/@20.91,106.62,6a,0d,60y,180h,80t,0r") && E("Object.keys(ST.diem).length") === n0 + 2, "dán đường dẫn Google Earth: tạo điểm");
  ok(E("cur().sv.ngay") === null && E("ST.nam") === 2024 && !!$("pinfo").querySelector("[data-ge-ngay]"), "không có ngày ảnh: giữ năm đang xem, có ô nhập ngày ảnh");
  const inp = $("pinfo").querySelector("[data-ge-ngay]"); inp.value = "2023-05"; inp.dispatchEvent(new w.Event("change"));
  ok(E("cur().sv.ngay") === "2023-05" && E("ST.nam") === 2023, "nhập ngày ảnh 2023-05: chuyển sang năm 2023");
  // dán toạ độ; dán chữ khác
  ok(dan("20.880000, 106.610000") && gan(E("cur().lat"), 20.88, 1e-4) && E("cur().sv.goc[0]") === 20.88 && E("cur().sv.nguon") === "toado", "dán “vĩ độ, kinh độ”: tạo điểm ở đúng toạ độ");
  const n1 = E("Object.keys(ST.diem).length");
  ok(!dan("xin chào") && E("Object.keys(ST.diem).length") === n1, "dán chữ khác: không làm gì");
  ok(!dan("https://earth.google.com/web/@20.9,106.6,6a,0d,60y,0h,95t,0r") || E("Object.keys(ST.diem).length") === n1, "đường dẫn nhìn lên trời: không tạo điểm");
  // gộp tiến độ mang theo thông tin ảnh mặt đất
  const gop = E(`(() => { const a = {X: CORE.newPoint("X", 106.6, 20.9, {bo: "tay"})}, b = {X: JSON.parse(JSON.stringify(ST.diem["${id1}"]))}; b.X.id = "X"; CORE.merge(a, b); return a.X.sv ? a.X.sv.ngay : ""; })()`);
  ok(gop === "2024-10", "gộp tiến độ: giữ thông tin ảnh Google Earth");

  // ---------- 4. hộp hướng dẫn
  $("bGE").click(); await sleep(20);
  ok($("dlgGE").open && /^javascript:/.test($("geBM").getAttribute("href")), "nút 📌 GE: hộp hướng dẫn có nút dấu trang");
  $("geH").value = "3.5"; $("geH").onchange();
  ok(E("GEP.H") === 3.5 && decodeURIComponent($("geBM").getAttribute("href")).includes(")(3.5,40,"), "đổi chiều cao máy ảnh: dấu trang cập nhật, nhớ trong trình duyệt");
  const nb = blobs.length; $("geUS").click(); await sleep(20);
  const us = await docBlob(blobs[nb]);
  ok(/@match\s+https:\/\/earth\.google\.com\/\*/.test(us) && us.includes("var geTinh = function geTinh") && us.includes("lmGEnut"), "tải userscript Tampermonkey (dự phòng khi dấu trang bị chặn)");
  new Function(us.replace(/^\/\/.*$/mg, ""));                                                   // cú pháp đúng
  $("geH").value = "2.5"; $("geH").onchange(); $("geDong").click();

  // ---------- 5. dịch
  E("setLang('ru')"); await sleep(60);
  ok(/Точки выборки из Google Earth/.test($("dlgGE").textContent) && /Копировать точку/.test(decodeURIComponent(E("geHref()"))), "tiếng Nga: hộp hướng dẫn, chữ trong dấu trang");
  const miss = E("[...T_MISS]").filter(x => /Google Earth|máy ảnh|ngày ảnh|dấu trang|Tâm|toạ độ/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi'); TM.k = ''");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
