// Bản 3.6: nạp trước 5/10/20 điểm và nhường bản đồ; đường mùa vụ S2 + S1 (STAC và API điểm Planetary Computer giả);
// S2 trực tuyến bỏ cảnh mây kín ở khung đang vẽ (ảnh giả mk_fx31.py); nhắc dùng lớp có sẵn; dịch.
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/s2o/items.json")) execSync("python3 " + __dirname + "/mk_fx31.py");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.6", "bản " + E("VERSION"));

  // ---------- 1. nạp trước 5, 10, 20 điểm; nhường bản đồ
  ok(["5", "10", "20"].every(v => [...$("ntSo").options].some(o => o.value === v)), "ô nạp trước có 5, 10, 20 điểm");
  E(`for (let i = 0; i < 14; i++) { const id = "Q" + i; ST.diem[id] = CORE.newPoint(id, 106.62 + i * 0.004, 20.88, {bo: "E0"}); } ST.filter = "all"; $("selStrip").value = "s2d"`);
  E(`$("ntSo").value = "10"; $("ntSo").onchange()`);
  ok(E("NT.so") === 10 && E(`JSON.parse(localStorage.getItem("laymau_hp_nt_v1")).so`) === 10, "chọn nạp trước 10 điểm, nhớ trong trình duyệt");
  E(`select("E0000", false)`);
  ok(E(`ntKeTiep().length`) === 10, "10 điểm kế tiếp: " + E(`ntKeTiep().map(p => p.id).join()`));
  E(`$("selBase").value = "none"; setBase()`);
  E(`window.DANG = true; window.GIA = L.layerGroup(); GIA.isLoading = () => window.DANG; GIA.addTo(map); NT.xong.clear(); ntBatDau(0)`);
  await sleep(1500);
  const a0 = E("ANH.m.size");
  ok(E("NT.dang") === 1 && /⚡0\//.test($("ntTT").textContent), "bản đồ đang tải ô: nạp trước đứng chờ (" + $("ntTT").textContent + ")");
  E(`window.DANG = false`);
  await until(() => /⚡[1-9]/.test($("ntTT").textContent), 15000, "nạp trước chạy lại khi bản đồ tải xong");
  ok(E("ANH.m.size") > a0, `bản đồ tải xong: nạp trước chạy tiếp (${$("ntTT").textContent})`);
  E(`map.removeLayer(GIA); NT.so = 2; NT.tok++`);

  // ---------- 2. đường mùa vụ S2 + S1
  E(`window.PC_DEM = {stac: 0, diem: 0, item: []}; window.F0 = window.fetch; window.fetch = async (u, o) => {
    u = String(u);
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-1-rtc/.test(o.body)) { PC_DEM.stac++;
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/"), f = [];
      for (let y = +t0.slice(0, 4); y <= +t1.slice(0, 4); y++) for (let m = 1; m <= 12; m++) {
        const d = y + "-" + String(m).padStart(2, "0") + "-05", d2 = y + "-" + String(m).padStart(2, "0") + "-17";
        f.push({id: "D91_" + d, properties: {datetime: d + "T22:51:00Z", "sat:orbit_state": "descending", "sat:relative_orbit": 91}});
        f.push({id: "D91_" + d2, properties: {datetime: d2 + "T22:51:00Z", "sat:orbit_state": "descending", "sat:relative_orbit": 91}});
        if (m % 4 === 0) f.push({id: "A55_" + d, properties: {datetime: d + "T11:00:00Z", "sat:orbit_state": "ascending", "sat:relative_orbit": 55}});
      }
      return {ok: true, status: 200, json: async () => ({type: "FeatureCollection", features: f, links: []})}; }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u)) { PC_DEM.diem++;
      const id = decodeURIComponent(/item=([^&]+)/.exec(u)[1]); PC_DEM.item.push(id);
      const m = +id.slice(9, 11), vv = Math.pow(10, (-15 + m) / 10), vh = Math.pow(10, (-22 + m / 2) / 10);   // VV = −15 + tháng dB
      return {ok: true, status: 200, json: async () => ({values: [vv, vh], band_names: ["vv_b1", "vh_b1"]})}; }
    return F0(u, o); }`);
  E(`select("E0001", false); setYear(2024); CVS.mode = "mot"`);
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(200);
  ok(!$("lbCurveS1").hidden && !$("cbCurveS1").checked, "đường mùa vụ 6 kỳ có ô + S1 (chưa bật)");
  const svg0 = $("curve").querySelector("svg");
  ok(svg0 && !svg0.innerHTML.includes("#e8590c"), "chưa bật: chỉ có đường S2");
  $("cbCurveS1").checked = true; $("cbCurveS1").onchange();
  await until(() => E(`(S1C.m.get(s1Khoa(ST.diem.E0001)) || {}).xong`), 15000, "đọc xong S1");
  await sleep(200);
  const e = E(`(() => { const e = S1C.m.get(s1Khoa(ST.diem.E0001)); return {quy: e.quy, n: e.canh.length, vv: e.nam[2024].VV, vh: e.nam[2024].VH, nk: e.nam[2024].n}; })()`);
  ok(e.quy === "descending 91" && E(`PC_DEM.item.every(id => id.startsWith("D91_"))`), "chọn một quỹ đạo (quỹ đạo nhiều cảnh nhất), không trộn quỹ đạo tăng: " + e.quy);
  ok(gan(e.vv[0], -13.5, 0.01) && gan(e.vv[5], -3.5, 0.01) && e.nk.join() === "4,4,4,4,4,4", `trung vị dB theo kỳ 2 tháng: kỳ 1-2 ${e.vv[0]}, kỳ 11-12 ${e.vv[5]} (4 cảnh mỗi kỳ)`);
  ok(E(`PC_DEM.item.slice(0, 6).every(id => id.includes("_2024-"))`), "năm đang gán (2024) đọc trước");
  const svg = $("curve").querySelector("svg").innerHTML;
  ok(/#e8590c/.test(svg) && /#ae3ec9/.test(svg) && />dB</.test(svg) && /stroke="#2e9d3a"/.test(svg), "đồ thị có cả NDVI (S2) và VV, VH (S1), trục dB bên phải");
  ok(/Sentinel-1 RTC/.test($("curve").textContent) && /quỹ đạo giảm 91/.test($("curve").textContent) && /S1 VV/.test($("curve").textContent), "chú giải S1: nguồn, quỹ đạo, màu đường");
  ok((svg.match(/<circle[^>]*fill="#e8590c"[^>]*opacity=".55"/g) || []).length >= 20, "chế độ một năm: chấm từng cảnh S1 của năm đang xem");
  for (const md of ["chong", "chuoi"]) {
    E(`CVS.mode = "${md}"; renderCurve()`); await sleep(150);
    ok(/#e8590c/.test($("curve").querySelector("svg").innerHTML), `cách xem "${md}" cũng có đường S1`);
  }
  E(`CVS.mode = "mot"`);
  const truoc = E("PC_DEM.diem");
  E(`renderCurve()`); await sleep(150);
  ok(E("PC_DEM.diem") === truoc, "vẽ lại không đọc lại S1 (đã giữ trong bộ nhớ)");
  // điểm ngoài vùng có PC (không có đường S2): vẫn có đường S1
  E(`ST.diem.XA = CORE.newPoint("XA", 105.20, 19.30, {bo: "E0"}); select("XA", false)`);
  await until(() => E(`(S1C.m.get(s1Khoa(ST.diem.XA)) || {}).xong`), 15000, "S1 điểm xa");
  await sleep(200);
  ok(/#e8590c/.test(($("curve").querySelector("svg") || {}).innerHTML || "") && !/không có đường mùa vụ/.test($("curve").textContent), "điểm không có đường S2: vẫn vẽ đường S1");
  // nạp trước có S1
  E(`select("E0002", false); NT.xong.clear(); ntBatDau(0)`);
  await until(() => E(`!!(S1C.m.get(s1Khoa(ST.diem.E0003)) || {}).xong`), 20000, "nạp trước S1 cho điểm kế tiếp");
  ok(E(`!!(S1C.m.get(s1Khoa(ST.diem.E0003)) || {}).xong`), "bật S1 thì nạp trước cả đường S1 của điểm kế tiếp");
  $("cbCurveS1").checked = false; $("cbCurveS1").onchange(); await sleep(150);
  ok(!/#e8590c/.test($("curve").querySelector("svg").innerHTML), "tắt + S1: bỏ đường S1");

  // ---------- 3. S2 trực tuyến: bỏ cảnh mây kín ở khung đang vẽ
  const r = await E(`(async () => {
    const it = (await F0("http://127.0.0.1:8765/s2o/items.json").then(r => r.json())).features, by = {};
    it.forEach(f => { by[f.id] = S2OC.thuGon(f, "s2"); });
    const m = S2OC.ll2m(106.70, 20.92), bb = [m[0] - 300, m[1] - 300, m[0] + 300, m[1] + 300];
    const v1 = await S2OC.ghep([by.A, by.C, by.B], ["B4"], bb, 8, 8, true, 3), l1 = Object.assign({}, S2OC.ghep.lanCuoi);
    const v2 = await S2OC.ghep([by.A, by.B], ["B4"], bb, 8, 8, true, 3);
    const v3 = await S2OC.ghep([by.A, by.C, by.B], ["B4"], bb, 8, 8, false), l3 = Object.assign({}, S2OC.ghep.lanCuoi);
    return {l1, l3, giong: Array.from(v1).every((x, i) => x === v2[i] || (x !== x && v2[i] !== v2[i])), v: v1[27]}; })()`);
  ok(r.l1.canh === 3 && r.l1.doc === 2 && r.giong, `che mây: cảnh C mây kín ở khung bị bỏ (đọc băng ${r.l1.doc}/${r.l1.canh} cảnh), ảnh ghép không đổi`);
  ok(r.l3.doc === 3, "không che mây (xem một cảnh, dải nhanh): vẫn đọc mọi cảnh");
  // nhắc dùng lớp có sẵn trong vùng có S2 10 băng
  const nhac = await E(`(async () => { const cu = ST.s2o;
    ST.s2o = {cfg: {thang: [1, 4], nam: [2024, 2024], may: 60, so: 3, che: true, bo: "sentinel-2-l2a", nguon: "s2"}, pv: {ten: "x", bl: [106.60, 20.85, 106.75, 20.95], kieu: "nhin"}, nam: {2024: {ung: [], chon: []}}};
    const d = document.createElement("div"); s2ovUI(d); await new Promise(r => setTimeout(r, 400)); const t = d.textContent; ST.s2o = cu; return t; })()`);
  ok(/nhanh hơn nhiều/.test(nhac), "S2 trực tuyến trong vùng có ảnh S2 sẵn: nhắc dùng lớp “S2 10 băng”");

  // ---------- 4. dịch
  E("setLang('ru')"); await sleep(60);
  E(`select("E0001", false); CVS.s1 = true; renderCurve()`); await sleep(300);
  ok(/предзагрузка 20 точек/.test([...$("ntSo").options].map(o => o.textContent).join()) && /Sentinel-1/.test($("lbCurveS1").title) && /нисходящая орбита/.test($("curve").textContent), "tiếng Nga: ô nạp trước, ô + S1, chú giải S1");
  const miss = E("[...T_MISS]").filter(x => /S1|nạp trước|quỹ đạo|cảnh|dB|trục/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi'); CVS.s1 = false");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
