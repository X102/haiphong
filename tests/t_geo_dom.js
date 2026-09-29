// Bản 2.0-2.1 (geoportal): đa ngôn ngữ, đường mùa vụ nhiều năm, liên kết ngoài, thông tin điểm, giao diện di động
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json");
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
(async () => {
  const {w, $, E, sleep, key, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "2.1" && $("selLang").options.length === 3 && E("LANG") === "vi", "bản 2.1, ba ngôn ngữ, mặc định tiếng Việt");
  // ---------- hàm thuần
  ok(E(`CORE.tr({ru: {"năm {y}": "{y} г."}}, "ru", "năm {y}", {y: 2025})`) === "2025 г." &&
     E(`CORE.tr({ru: {__re: [["^lưới (\\\\d+)×(\\\\d+)$", "сетка $1×$2"]]}}, "ru", "lưới 12×34")`) === "сетка 12×34" &&
     E(`CORE.tr({ru: {}}, "vi", "năm {y}", {y: 7})`) === "năm 7", "CORE.tr: khoá, mẫu, biến");
  const lk = E("CORE.links(20.71285, 106.506712, {year: 2023, wayback: 123, lang: 'ru'})");
  ok(lk.length === 12 && lk.every(x => /20\.712850|20\.71285/.test(decodeURIComponent(x.url))) &&
     lk.find(x => x.k === "wayback").url.includes("active=123") && lk.find(x => x.k === "copernicus").url.includes("fromTime=2022-11-01") &&
     lk.find(x => x.k === "wikimapia").url.includes("lang=ru"), "CORE.links: 12 liên kết đúng toạ độ, Wayback đúng bản, Copernicus đúng mùa khô");
  const st = E(`CORE.seasonStats({2019: {NDVI: [.2,.4,.6,.6,.4,.2]}, 2020: {NDVI: [.22,.41,.62,.58,.4,.21]}, 2021: {NDVI: [.2,.39,.6,.61,.42,.2]},
    2022: {NDVI: [-.1,-.1,-.05,-.1,-.1,-.1]}, 2023: {NDVI: [.21,.4,.59,.6,.41,.2]}}, "NDVI", 6)`);
  ok(JSON.stringify(st.anom) === "[2022]" && Math.abs(st.med[2] - 0.6) < 1e-9 && st.worst[2022].ky >= 0, `seasonStats: năm lệch ${JSON.stringify(st.anom)}`);

  // ---------- chọn điểm, đường mùa vụ nhiều năm (dữ liệu giả 5 năm, 2022 lệch)
  await until(() => E("CURVES.E0 && CURVES.E0._pos"), 8000, "đường mùa vụ E0 đã nạp");
  E(`CURVES.E0.nam = {}; [2019, 2020, 2021, 2022, 2023, 2025].forEach((y, k) => { CURVES.E0.nam[y] = {
      NDVI: CURVES.E0.id.map(() => y === 2022 ? [-.1, -.1, -.05, -.1, -.1, -.1] : [.2, .4, .6, .6, .4, .2].map(v => v + .01 * k)),
      MNDWI: CURVES.E0.id.map(() => [-.3, -.4, -.5, -.5, -.4, -.3]), NFILL: CURVES.E0.id.map(() => y === 2019 ? 2 : 0)}; });`);
  E("select('E0000', true)"); E("setYear(2025)");
  await until(() => /polyline/.test($("curve").innerHTML), 5000, "đường mùa vụ");
  $("selCurveMode").value = "chong"; $("selCurveMode").onchange(); await until(() => /cvleg/.test($("curve").innerHTML) && $("curve").querySelectorAll(".cvleg [data-y]").length === 6, 3000, "chồng các năm");
  const leg = [...$("curve").querySelectorAll(".cvleg [data-y]")];
  ok(leg.length === 6 && leg.find(s => s.dataset.y === "2022").classList.contains("an") && /2022/.test($("curve").querySelector(".cvwarn").textContent),
     "chồng các năm: 6 năm, đánh dấu 2022 lệch");
  ok($("curve").querySelectorAll("polyline").length >= 7 && $("curve").querySelector("polygon"), "mỗi năm một đường + dải trung vị");
  leg[0].click(); await sleep(30); ok(E("ST.nam") === 2019, "bấm chú giải chọn năm 2019");
  $("selCurveMode").value = "chuoi"; $("selCurveMode").onchange(); await until(() => $("curve").querySelectorAll("rect").length >= 6, 3000, "chuỗi liên tục");
  ok($("curve").querySelectorAll("circle").length >= 30 && $("curve").querySelectorAll("circle[fill='#d92d20']").length === 6 && /interpolat|nội suy/.test($("curve").innerHTML),
     "chuỗi liên tục: điểm từng kỳ, năm lệch tô đỏ, năm nội suy có nền");
  $("bCurveBig").click(); await sleep(30);
  ok($("dlgCurve").open && $("curveBig").querySelector("svg") && $("curveBig").querySelector('[data-big="selCurveMode"]'), "phóng to: hộp thoại có hình lớn và bộ chọn");
  $("cvClose").click(); E("setYear(2025)");

  // ---------- liên kết ngoài
  await sleep(50);
  const as = $("plinkBody").querySelectorAll("a");
  ok(as.length === 12 && [...as].every(a => a.target === "_blank" && a.rel.includes("noopener")), "liên kết ngoài của điểm: 12 liên kết, mở thẻ mới");
  ok(/GEE \[lon, lat\]/.test($("plinkBody").textContent) && $("plinkBody").querySelector(".co input").value.includes(","), "toạ độ và dòng GEE");
  E("setInfo(true)"); E(`map.fire("click", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]})})`); await sleep(30);
  ok(w.document.querySelectorAll(".leaflet-popup-content .lk a").length === 12, "bật thông tin điểm: nhấp bản đồ mở bảng liên kết");
  E("map.closePopup()"); E("setInfo(false)");
  E(`map.fire("contextmenu", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}), originalEvent: {preventDefault() {}}})`); await sleep(30);
  ok(w.document.querySelectorAll(".leaflet-popup-content .lk a").length === 12, "chuột phải mở bảng liên kết khi không chọn vùng");
  E("map.closePopup()");

  // ---------- tiếng Nga
  const goc = [...w.document.querySelectorAll("#side h2, #panel b, #dlgSet td, #dlgExp button")].map(e => e.textContent);
  E("setLang('ru')"); await sleep(50);
  ok(E("LANG") === "ru" && w.document.documentElement.lang === "ru" && /Геопортал/.test(w.document.title), "đổi sang tiếng Nga: lang, tiêu đề");
  ok($("bExport").textContent.trim() === "Экспорт…" && /Набор точек/.test($("side").textContent) && /Подложка/.test($("panel").textContent), "chữ tĩnh tiếng Nga");
  ok(/набор/.test($("pinfo").textContent) && /Реки, каналы, озёра/.test($("cls").textContent) && $("bSet").title === "" + $("bSet").title, "chữ động và tên lớp tiếng Nga");
  ok(/Внешние ссылки/.test($("plinks").textContent) && /Google Maps \(карта\)/.test($("plinkBody").textContent), "liên kết ngoài tiếng Nga");
  key("h"); await sleep(20);
  ok($("dlgHelp").open && /Как пользоваться/.test($("dlgHelp").textContent) && /Сезонные кривые/.test($("dlgHelp").textContent) && /дешифровочные признаки/.test($("helpcls").textContent),
     "trợ giúp tiếng Nga (khối HTML + bảng lớp)");
  $("hClose").click();
  // chọn vùng bằng tiếng Nga
  key("o"); await sleep(50); $("vgPV").value = "bk"; $("vgBK").value = "6";
  E(`map.fire("click", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}), originalEvent: {shiftKey: false}})`);
  await until(() => E("VG.obj && VG.obj.n") >= 8, 8000, "vùng khi ở tiếng Nga");
  ok(/фрагментов/.test($("vgTom").textContent) && /Выберите класс/.test($("vgGoiY").textContent) && /образцов/.test($("vgHat").textContent), "bảng chọn vùng tiếng Nga");
  key("s"); await sleep(50); key("2"); E(`map.fire("click", {latlng: L.latLng(${RV.dai[0][1]}, ${RV.dai[0][0]})})`); await sleep(50);
  $("vung").querySelector('[data-tab="mang"]').click(); await sleep(20);
  ok(/удалено 1/.test($("vgTom").textContent) && /Удалить фрагмент/.test($("vung").querySelector('[data-cong="xoa"]').textContent) && /вытянутости|удал\. от образцов/.test($("vgDSMang").textContent),
     "xoá mảng, thẻ Mảng tiếng Nga");
  // quét chữ tiếng Việt còn sót trên trang (trừ tên riêng trong dữ liệu)
  $("dlgExp").showModal(); $("dlgSet").showModal();
  const walker = w.document.createTreeWalker(w.document.body, 4); const sot = new Set(); let n;
  while ((n = walker.nextNode())) {
    const p = n.parentElement; if (!p || p.closest("script,style,[data-noi18n]")) continue;
    const t = n.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|E0 thử|Tiếng Việt|name~Cát/.test(t)) sot.add(t.slice(0, 80));
  }
  [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(a => { const v = e.getAttribute(a); if (v && VI.test(v) && !/Ngôn ngữ|name~Cát/.test(v)) sot.add("@" + a + ": " + v.slice(0, 60)); }));
  const miss = E("[...T_MISS]").filter(m => !/E0 thử/.test(m)); require("fs").writeFileSync("/tmp/t_miss.json", JSON.stringify({miss, sot: [...sot]}, null, 1));
  ok(sot.size === 0 && miss.length === 0, `không còn chữ tiếng Việt khi ở tiếng Nga (sót ${sot.size}, T_MISS ${miss.length})` +
     (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(m => "T: " + m)).slice(0, 25).join("\n      ") : ""));
  $("dlgExp").close(); $("dlgSet").close();
  // ---------- tiếng Anh, rồi về tiếng Việt
  E("T_MISS.clear()"); E("setLang('en')"); await sleep(30);
  ok($("bExport").textContent.trim() === "Export…" && /Paddy rice/.test($("cls").textContent) && /REGION TOOL/.test($("hud").textContent), "tiếng Anh: chữ tĩnh, lớp, dòng trạng thái");
  key("h"); await sleep(20); $("dlgExp").showModal(); $("dlgSet").showModal(); $("bCurveBig").click(); await sleep(30);
  E(`map.fire("contextmenu", {latlng: L.latLng(20.9, 106.6), originalEvent: {preventDefault() {}}})`);
  { const wk = w.document.createTreeWalker(w.document.body, 4); const s2 = new Set(); let m;
    while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,[data-noi18n]")) continue;
      const tt = m.nodeValue.trim(); if (tt && VI.test(tt) && !/Tây|Đông|E0 thử|Tiếng Việt|name~Cát/.test(tt)) s2.add(tt.slice(0, 80)); }
    [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(a => { const v = e.getAttribute(a); if (v && VI.test(v) && !/Ngôn ngữ|name~Cát/.test(v)) s2.add("@" + v.slice(0, 60)); }));
    const m2 = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(s2.size === 0 && m2.length === 0, `không còn chữ tiếng Việt khi ở tiếng Anh (sót ${s2.size}, T_MISS ${m2.length})` + (s2.size || m2.length ? "\n      " + [...s2].concat(m2).slice(0, 20).join("\n      ") : "")); }
  $("hClose").click(); $("dlgExp").close(); $("dlgSet").close(); $("cvClose").click(); E("map.closePopup()");
  key("o"); await sleep(20);
  E("setLang('vi')"); await sleep(30);
  const sau = [...w.document.querySelectorAll("#side h2, #panel b, #dlgSet td, #dlgExp button")].map(e => e.textContent);
  ok(JSON.stringify(goc) === JSON.stringify(sau) && $("bExport").textContent.trim() === "Xuất…" && /Rừng ngập mặn/.test($("cls").textContent), "về tiếng Việt: chữ tĩnh trả về đúng nguyên bản");
  ok(w.localStorage.getItem("laymau_hp_lang_v1") === '"vi"', "nhớ lựa chọn ngôn ngữ");

  // ---------- giao diện di động (logic; CSS không kiểm được trong jsdom)
  E("sheet('min')"); ok(w.document.body.dataset.sheet === "min", "ngăn kéo: thu gọn");
  const g = $("grip");
  g.dispatchEvent(new w.MouseEvent("pointerdown", {bubbles: true, clientY: 500})); g.dispatchEvent(new w.MouseEvent("pointerup", {bubbles: true, clientY: 500}));
  ok(w.document.body.dataset.sheet === "mid", "chạm thanh kéo: sang cỡ vừa");
  $("fSheet").click(); ok(w.document.body.dataset.sheet === "max", "nút ☰: mở hết");
  $("fLayers").click(); ok(w.document.body.classList.contains("show-panel") && $("fLayers").classList.contains("on"), "nút 🗂: hiện ảnh nền và lớp đối chiếu");
  $("fLayers").click(); ok(!w.document.body.classList.contains("show-panel"), "bấm lại: ẩn");
  ok(/2025 · E0000/.test($("gripInfo").textContent), "thanh kéo hiện năm và điểm: " + $("gripInfo").textContent);
  const nf = E("Object.keys(ST.diem).length"); $("fInfo").click(); await sleep(20);
  ok(E("infoOn") === true && E("Object.keys(ST.diem).length") === nf, "nút ⓘ bật thông tin điểm, không thêm điểm");
  E("setInfo(false)");
  // nút loại trừ (thay Shift+nhấp)
  key("o"); await sleep(20); key("1"); $("vgAm").click();
  const n0 = E("VG.neg.length"); E(`map.fire("click", {latlng: L.latLng(${RV.dai[2][1]}, ${RV.dai[2][0]}), originalEvent: {shiftKey: false}})`); await sleep(30);
  ok(E("VG.amBat") === true && E("VG.neg.length") === n0 + 1, "nút − Loại trừ: nhấp đặt điểm khác loại");
  $("vgAm").click(); key("o");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
