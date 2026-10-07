// Bản 3.10.1 và 3.11. Trang mở với manifest311.json (manifest giả + lớp mới dựng bằng chính hàm của ô Colab, mk_fx311.py).
// 3.10.1: ô đến mã đổi theo điểm, tìm theo một phần mã; thang màu (chỉ số S2, DEM, lớp một băng có / không kéo giãn, thang log,
// lớp phân loại), thu gọn; POI: ẩn / hiện nhóm, bấm xem POI và nhà (dữ liệu Overture giả mk_fx310.py); đường mùa vụ: chọn đường S1
// (VV, VH, VH−VV), bấm vào đồ thị xem giá trị. 3.11: lớp mới trong bảng lớp, giá trị thật kèm đơn vị, AlphaEarth tại điểm (độ giống
// các năm), gợi ý lớp bằng 64 chiều; dịch.
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/manifest311.json")) execSync("python3 " + __dirname + "/mk_fx311.py");
if (!fs.existsSync("/tmp/fx/data/ov/dap_an.json")) execSync("python3 " + __dirname + "/mk_fx310.py");
const DA = JSON.parse(fs.readFileSync("/tmp/fx/data/ov/dap_an.json", "utf8"));
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true, truoc: w => {
    const f = w.fetch; w.fetch = (u, o) => f(String(u).replace(/manifest\.json(\?.*)?$/, "manifest311.json"), o); }});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.11", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  w.DecompressionStream = DecompressionStream;

  // ---------- 1. ô đến mã
  E(`ST.filter = "all"; select("E0002", false)`); await sleep(50);
  ok($("goto").value === "E0002" && $("goto").getAttribute("list") === "dsMa" && $("dsMa").options.length >= 4, "ô đến mã ghi mã điểm đang xem, có danh sách gợi ý mã");
  E(`step(1)`); await sleep(50);
  ok($("goto").value === E("ST.cur") && E("ST.cur") !== "E0002", "sang điểm khác (n): ô đến mã đổi theo: " + $("goto").value);
  $("goto").value = "0001"; $("goto").onchange(); await sleep(30);
  ok(E("ST.cur") === "E0001", "gõ một phần mã (0001): mở E0001");
  $("goto").value = "khongco"; $("goto").onchange(); await sleep(30);
  ok(E("ST.cur") === "E0001" && $("goto").value === "E0001", "mã không có: báo, trả lại mã đang xem");

  // ---------- 2. thang màu
  ok($("tmau") && $("tmau").hidden, "không lớp nào dùng bảng màu: ẩn thang màu");
  E(`S2V.mode = "idx"; S2V.chi = "NDVI"; OVL.s2d.on = true; refreshOverlays()`); await sleep(250);
  let tm = $("tmau").textContent;
  ok(!$("tmau").hidden && /NDVI/.test(tm) && /S2 10 băng/.test(tm) && $("tmau").querySelector(".tm-thanh").style.background.includes("linear-gradient"), "S2 10 băng, chế độ chỉ số: thang màu NDVI với dải màu: " + tm.replace(/\s+/g, " ").slice(0, 80));
  E(`OVL.s2d.on = false; DEMV.mode = "cao"; OVL.dem.on = true; refreshOverlays()`); await sleep(250);
  tm = $("tmau").textContent;
  ok(/độ cao · DEM/.test(tm) && / m/.test(tm) && !/NDVI/.test(tm), "DEM độ cao: thang màu có đơn vị m");
  E(`OVL.dem.on = false; OVL.pc1.on = true; OVL.lulc_ctx.on = true; OVL.den_dem.on = true; refreshOverlays()`); await sleep(300);
  tm = $("tmau").textContent;
  ok(/PC1/.test(tm) && /thấp/.test(tm), "lớp một băng không có kéo giãn (PC1): thang tương đối thấp – cao");
  ok(/thực vật/.test(tm) && $("tmau").querySelectorAll(".tm-lop i").length >= 3, "lớp phân loại (CTX): chú giải ô màu");
  ok(/Ánh sáng đêm VIIRS/.test(tm) && /nW\/cm²\/sr/.test(tm) && /thang log/.test(tm) && /0 nW\/cm²\/sr16\.4 nW\/cm²\/sr300 nW/.test(tm), "ánh sáng đêm: thang log, đổi ngược ra nW/cm²/sr (0, giữa 16.4, đầu cao 300)");
  $("tmau").querySelector("[data-tm]").click(); await sleep(30);
  ok(!$("tmau").querySelector(".tm-than") && E(`localStorage.getItem("laymau_hp_tmau_v1")`) === '"an"', "thu gọn thang màu, nhớ trong trình duyệt");
  $("tmau").querySelector("[data-tm]").click(); await sleep(30);

  // ---------- 3. 3.11: lớp mới, giá trị tại điểm
  ok(["aef_rgb", "dist_tt", "dist_max", "den_dem", "nha_cao", "nha_phu"].every(id => E(`!!OVL["${id}"]`)) && /GlobalBuildingAtlas/.test($("ols").textContent), "bảng lớp đối chiếu có các lớp mới (AlphaEarth, DIST, ánh sáng đêm, nhà)");
  E(`OVL.nha_cao.on = true; OVL.dist_tt.on = true; setYear(2024); refreshOverlays()`); await sleep(200);
  const p1 = E("({lat: ST.diem.E0001.lat, lng: ST.diem.E0001.lon})");
  const rows = await E(`giaTriTai(L.latLng(${p1.lat}, ${p1.lng}))`);
  const txt = rows.map(r => r[0] + ": " + r[1]).join(" | ");
  const den = /Ánh sáng đêm[^|]*: ([\d.,]+) nW/.exec(txt), cao = /chiều cao nhà[^|]*: ([\d.,]+) m/.exec(txt);
  ok(den && gan(parseFloat(den[1].replace(",", ".")), 50, 1.5), "giá trị tại điểm: ánh sáng đêm ≈ 50 nW/cm²/sr (lưu log, đổi ngược): " + (den && den[0]));
  ok(cao && gan(parseFloat(cao[1].replace(",", ".")), 24, 0.3), "chiều cao nhà ≈ 24 m: " + (cao && cao[0]));
  ok(/xáo trộn ≥ 50 %, đang diễn ra/.test(txt), "DIST 2024: tên lớp xáo trộn");
  E(`["pc1", "lulc_ctx", "den_dem", "nha_cao", "dist_tt"].forEach(k => { OVL[k].on = false; }); refreshOverlays()`);

  // ---------- 4. AlphaEarth tại điểm
  const a1 = await E(`annualFor(ST.diem.E0001, "aef")`), a0 = await E(`annualFor(ST.diem.E0000, "aef")`);
  ok(a1.ys[2023][0] === null && gan(a1.ys[2024][0], 1, 0.002) && a1.ys[2025][0] < 0.2 && a1.ys[2025][1] < 0.2, `vùng đổi: độ giống năm trước 2024 ${a1.ys[2024][0]}, 2025 ${a1.ys[2025][0]} (tụt mạnh)`);
  ok(gan(a0.ys[2025][0], 1, 0.002) && gan(a0.ys[2025][1], 1, 0.002), "vùng không đổi: độ giống ≈ 1 mọi năm");
  const v = await E(`annualFor(ST.diem.E0001, "aefv")`);
  ok(v.names.length === 64 && v.ys[2024].length === 64 && gan(Math.hypot(...v.ys[2024]), 1, 0.01), "64 chiều tại điểm, độ dài 1 (đọc COG 64 kênh, ô 128, predictor 2)");
  E(`CVS.kind = "nam"; CVS.grp = "aef"; select("E0001", false); renderCurve()`); await sleep(400);
  ok([...$("selCurveGrp").options].some(o => o.value === "aef") && $("selCurveGrp").value === "aef" && /giống năm trước/.test($("curve").textContent), "đồ thị giá trị theo năm: nhóm AlphaEarth, độ giống năm trước, năm đầu");
  E(`CVS.kind = "ky"; renderCurve()`); await sleep(150);
  // gợi ý lớp bằng 64 chiều
  ok(E("gyNhomCo().join()") === "aefv" && /\|aef$/.test(E("gyKhoa(ST.diem.E0001)")) && !$("lbGyAef").hidden && $("gyAef").checked, "gợi ý lớp dùng 64 chiều AlphaEarth (ô “dùng AlphaEarth” bật sẵn)");
  E(`["E0000", "E0001", "E0002", "E0003"].forEach((id, i) => CORE.setLabel(ST.diem[id], 2024, i % 2 ? "1" : "2"))`);
  const e1 = await E(`gyDacTrung(ST.diem.E0002)`);
  ok(e1 && e1.sig.startsWith("co:aefv:") && e1.names.length === 64, "đặc trưng gợi ý: 64 chiều AlphaEarth");
  $("gyAef").checked = false; $("gyAef").onchange();
  ok(E("gyNhomCo().join()") !== "aefv" && !/\|aef$/.test(E("gyKhoa(ST.diem.E0001)")) && E(`JSON.parse(localStorage.getItem("laymau_hp_gyaef_v1"))`) === false, "tắt: về đặc trưng có sẵn, nhớ lựa chọn");
  $("gyAef").checked = true; $("gyAef").onchange();

  // ---------- 5. POI: nhóm ẩn / hiện, bấm xem POI và nhà
  E(`OV.STAC = "http://127.0.0.1:8765/ov/catalog.json"; OV.TILE = "http://127.0.0.1:8765/ov/{ban}/{kieu}.pmtiles"; OV.ban = ""; OV.banT = 0; OV.K.clear(); OV.O.clear(); OV.TK.clear()`);
  E(`$("cOvPoi").checked = true; $("cOvPoi").onchange(); $("cOvNha").checked = true; $("cOvNha").onchange(); map.setView([${DA.lat}, ${DA.lon}], 17)`); await sleep(200);
  const tmS = $("ovCG").querySelector('[data-ovg="tm"]');
  ok(!!tmS, "chú giải POI có từng nhóm bấm được");
  tmS.click(); await sleep(30);
  ok(E("OV.an.includes('tm')") && $("ovCG").querySelector('[data-ovg="tm"]').classList.contains("tat") && E(`JSON.parse(localStorage.getItem("laymau_hp_ov_v1")).an`).includes("tm"), "bấm nhóm thương mại: ẩn, nhớ trong trình duyệt");
  const mPerDeg = 111320 * Math.cos(DA.lat * Math.PI / 180), ll = (dx, dy) => [DA.lat + dy / 110574, DA.lon + dx / mPerDeg];
  let [la, lo] = ll(20, 0);
  let h = await E(`ovBam({latlng: L.latLng(${la}, ${lo})})`);
  ok(!h || !/Cửa hàng 0/.test(h), "POI thuộc nhóm đang ẩn: không mở thông tin");
  $("ovCG").querySelector('[data-ovg="tm"]').click(); await sleep(30);
  h = await E(`ovBam({latlng: L.latLng(${la}, ${lo})})`);
  ok(h && /Cửa hàng 0/.test(h) && /thương mại/.test(h) && /clothing_store/.test(h) && /shopping › fashion_and_apparel_store/.test(h) && /0\.90/.test(h), "bấm vào POI: tên, nhóm, loại, phân loại, độ tin cậy");
  await sleep(30);
  ok(!!w.document.querySelector(".leaflet-popup-content .ov-pop"), "mở khung thông tin trên bản đồ");
  [la, lo] = ll(0, 60);
  h = await E(`ovBam({latlng: L.latLng(${la}, ${lo})})`);
  ok(h && /Nhà/.test(h) && /(39\d|40\d|41\d) m²/.test(h) && /16\.0 m/.test(h) && /apartments/.test(h) && /OpenStreetMap/.test(h), "bấm vào nhà: diện tích nền ≈ 400 m², chiều cao 16 m, loại, nguồn hình");
  [la, lo] = ll(220, 0);
  h = await E(`ovBam({latlng: L.latLng(${la}, ${lo})})`);
  ok(!h, "bấm vào lỗ giữa nhà có lỗ: không phải nhà");
  E(`$("cOvPoi").checked = false; $("cOvPoi").onchange(); $("cOvNha").checked = false; $("cOvNha").onchange()`);

  // ---------- 6. đường mùa vụ: chọn đường S1, bấm xem giá trị
  E(`window.F0 = window.fetch; window.fetch = async (u, o) => {
    u = String(u); const tl = j => ({ok: true, status: 200, json: async () => j});
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-1-rtc/.test(o.body)) {
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/"), f = [];
      for (let y = +t0.slice(0, 4); y <= +t1.slice(0, 4); y++) for (let m = 1; m <= 12; m++) for (const d of ["05", "17"]) { const n = y + "-" + String(m).padStart(2, "0") + "-" + d;
        f.push({id: "D91_" + n, properties: {datetime: n + "T22:51:00Z", "sat:orbit_state": "descending", "sat:relative_orbit": 91}}); }
      return tl({type: "FeatureCollection", features: f, links: []}); }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u)) { const m = +decodeURIComponent(/item=([^&]+)/.exec(u)[1]).slice(9, 11); return tl({values: [Math.pow(10, (-15 + m) / 10), Math.pow(10, (-22 + m / 2) / 10)]}); }
    return F0(u, o); }`);
  E(`select("E0001", false); setYear(2024); CVS.mode = "mot"; CVS.ky12 = false; CVS.feat = "NDVI"`);
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(150);
  ok([...$("selCurveKind").options].find(o => o.value === "ky").textContent === "mùa vụ theo kỳ", "đổi tên “mùa vụ 6 kỳ” thành “mùa vụ theo kỳ” (vì có cả 12 tháng)");
  ok($("s1Chon") && $("s1Chon").hidden, "ô chọn đường S1 ẩn khi chưa bật + S1");
  $("cbCurveS1").checked = true; $("cbCurveS1").onchange();
  await until(() => E(`(S1C.m.get(s1Khoa(ST.diem.E0001)) || {}).xong`), 15000, "S1");
  await sleep(250);
  ok(!$("s1Chon").hidden && /VV, VH/.test($("s1Chon").querySelector("summary").textContent), "bật + S1: ô chọn đường hiện, mặc định VV, VH");
  $("s1c_VV").checked = false; $("s1c_VV").onchange(); $("s1c_RT").checked = true; $("s1c_RT").onchange(); await sleep(200);
  let svg = $("curve").querySelector("svg").innerHTML;
  ok(!/#e8590c/.test(svg) && /#ae3ec9/.test(svg) && /#0b7285/.test(svg) && /S1 VH−VV/.test($("curve").textContent) && E("CVS.s1b.join()") === "VH,RT", "chọn VH và VH−VV: đồ thị bỏ VV, có VH−VV");
  const rt = E(`S1C.m.get(s1Khoa(ST.diem.E0001)).nam[2024].RT`);
  ok(gan(rt[0], -7 + 0.75, 0.01) || gan(rt[0], (-22 + 0.75) - (-15 + 1.5), 0.01), "VH−VV theo kỳ: trung vị từng cảnh VH − VV: " + rt[0]);
  $("s1c_VH").checked = false; $("s1c_VH").onchange(); $("s1c_RT").checked = false; $("s1c_RT").onchange();
  ok($("s1c_RT").checked && E("CVS.s1b.join()") === "RT", "bỏ hết: giữ lại ít nhất một đường");
  $("s1c_VV").checked = true; $("s1c_VV").onchange(); $("s1c_VH").checked = true; $("s1c_VH").onchange(); $("s1c_RT").checked = false; $("s1c_RT").onchange(); await sleep(150);
  // bấm vào đồ thị
  const sv = $("curve").querySelector("svg"), [md, W, L0, R0, n] = sv.dataset.cv.split("|");
  sv.getBoundingClientRect = () => ({left: 0, top: 0, width: +W, height: 150});
  $("curve").getBoundingClientRect = () => ({left: 0, top: 0, width: +W, height: 300});
  const xk = +L0 + 2 * (+W - +L0 - +R0) / (+n - 1);                 // kỳ thứ 3 (5-6)
  sv.dispatchEvent(new w.MouseEvent("click", {bubbles: true, clientX: xk + 3, clientY: 40}));
  await sleep(50);
  const tip = $("curve").querySelector(".cvtip");
  ok(tip && /kỳ 5-6 · 2024/.test(tip.textContent) && /S1 VV 2024: -9\.5 dB/.test(tip.textContent) && /S1 VH 2024/.test(tip.textContent) && /NDVI/.test(tip.textContent),
     "bấm vào đồ thị: hộp giá trị kỳ 5-6 năm 2024 (NDVI, S1 VV −9.5 dB, VH): " + (tip ? tip.textContent.replace(/\s+/g, " ").slice(0, 120) : ""));
  ok(!!sv.querySelector(".cv-doc"), "vạch dọc tại kỳ đã bấm");
  tip.querySelector("button").click(); await sleep(20);
  ok(!$("curve").querySelector(".cvtip") && !sv.querySelector(".cv-doc"), "đóng hộp giá trị");
  E(`CVS.mode = "chuoi"; renderCurve()`); await sleep(200);
  const s2 = $("curve").querySelector("svg"), c2 = s2.dataset.cv.split("|");
  s2.getBoundingClientRect = () => ({left: 0, top: 0, width: +c2[1], height: 175});
  const ys = Object.keys(E("lastCV.ys")).map(Number).sort((a, b) => a - b), yC = ys[ys.length - 1], k2 = (ys.length - 1) * 6 + 1;
  s2.dispatchEvent(new w.MouseEvent("click", {bubbles: true, clientX: +c2[2] + k2 * (+c2[1] - +c2[2] - +c2[3]) / (+c2[4] - 1), clientY: 40}));
  await sleep(50);
  ok(new RegExp("kỳ 3-4 · " + yC).test(($("curve").querySelector(".cvtip") || {}).textContent || "") && +c2[4] === ys.length * 6, "chuỗi liên tục (" + ys.join(", ") + "): bấm đúng kỳ 3-4 năm " + yC);
  E(`CVS.mode = "mot"; CVS.s1 = false; $("cbCurveS1").checked = false; renderCurve()`);

  // ---------- 7. dịch
  E("setLang('ru')"); await sleep(80);
  E(`OVL.den_dem.on = true; refreshOverlays()`); await sleep(250);
  ok(/Цветовая шкала/.test($("tmau").textContent) && /логарифмическая/.test($("tmau").textContent) && /использовать AlphaEarth/.test($("lbGyAef").textContent) && /по периодам/.test([...$("selCurveKind").options].map(o => o.textContent).join()),
     "tiếng Nga: thang màu, ô AlphaEarth, tên đường mùa vụ");
  const miss = E("[...T_MISS]").filter(x => /AlphaEarth|thang|giống|nhà|POI|S1|mã|loại|nguồn/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
