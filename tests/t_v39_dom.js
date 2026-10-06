// Bản 3.9: đường mùa vụ 12 tháng. STAC và API điểm Planetary Computer giả cho sentinel-2-l2a: mỗi tháng 3 cảnh (ngày 3, 13 quang đãng,
// ngày 23 mây), tháng 7 mây cả tháng, tháng 1 ngày 23 không có dữ liệu; cùng ngày có thêm cảnh ô MGRS thứ hai nhiều mây hơn; baseline 03.01
// (không offset) cho tháng 1-3, 05.11 (offset −1000) cho các tháng khác. Kiểm trung vị theo tháng, lọc SCL, offset, chọn cảnh ít mây,
// đồ thị 12 tháng, chấm từng cảnh, S1 theo tháng, nạp trước, dịch.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
const R4 = 0.05, NIR = (m, d) => 0.1 + 0.03 * m + (d === 13 ? 0.02 : 0);           // phản xạ đỏ, cận hồng ngoại của cảnh quang đãng
const nd = (a, b) => (a - b) / (a + b);
const THAT = require("fs").readFileSync(__dirname + "/s2m_that_20.89696_106.58221.txt", "utf8").split("\n").filter(l => /^\d{4}-/.test(l)).map(l => l.trim().split(","));
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.9", "bản " + E("VERSION"));
  ok([...$("selCurveKy").options].map(o => o.value).join() === "6,12", "đường mùa vụ có ô chọn 6 kỳ / 12 tháng");

  w.THAT = THAT;
  E(`window.PC_DEM = {s2stac: [], s2: [], s1: 0}; window.F0 = window.fetch; window.fetch = async (u, o) => {
    u = String(u);
    const tl = j => ({ok: true, status: 200, json: async () => j});
    const gan_ = (lon, lat) => Math.abs(lon - 106.582205) < 0.001 && Math.abs(lat - 20.896964) < 0.001;
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-2-l2a/.test(o.body) && gan_(...JSON.parse(o.body).intersects.coordinates)) {
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/");
      return tl({type: "FeatureCollection", links: [], features: THAT.filter(r => r[0] >= t0.slice(0, 10) && r[0] <= t1.slice(0, 10)).map(r => ({id: "R_" + r[0], properties: {datetime: r[0] + "T03:31:00Z", "eo:cloud_cover": +r[2], "s2:processing_baseline": r[1]}}))}); }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u) && /item=R_/.test(u)) {
      const d = /item=R_([\\d-]+)/.exec(u)[1], r = THAT.find(x => x[0] === d); return tl({values: r.slice(3).map(Number)}); }
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-2-l2a/.test(o.body)) {
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/"), f = []; PC_DEM.s2stac.push(b);
      for (let y = +t0.slice(0, 4); y <= +t1.slice(0, 4); y++) for (let m = 1; m <= 12; m++) for (const d of [3, 13, 23]) {
        const n = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"), pb = m <= 3 ? "03.01" : "05.11";
        f.push({id: "T1_" + n, properties: {datetime: n + "T03:31:00Z", "eo:cloud_cover": 20, "s2:processing_baseline": pb, "s2:mgrs_tile": "48QXJ"}});
        f.push({id: "T2_" + n, properties: {datetime: n + "T03:31:05Z", "eo:cloud_cover": 70, "s2:processing_baseline": pb, "s2:mgrs_tile": "48QXH"}});
      }
      return tl({type: "FeatureCollection", features: f, links: []}); }
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-1-rtc/.test(o.body)) { PC_DEM.s1++;
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/"), f = [];
      for (let y = +t0.slice(0, 4); y <= +t1.slice(0, 4); y++) for (let m = 1; m <= 12; m++) for (const d of ["05", "17"]) {
        const n = y + "-" + String(m).padStart(2, "0") + "-" + d;
        f.push({id: "D91_" + n, properties: {datetime: n + "T22:51:00Z", "sat:orbit_state": "descending", "sat:relative_orbit": 91}}); }
      return tl({type: "FeatureCollection", features: f, links: []}); }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u) && /collection=sentinel-2-l2a/.test(u)) {
      const id = decodeURIComponent(/item=([^&]+)/.exec(u)[1]); PC_DEM.s2.push(id);
      const m = +id.slice(8, 10), d = +id.slice(11, 13), off = m <= 3 ? 0 : 1000, A = [...u.matchAll(/assets=(\\w+)/g)].map(x => x[1]);
      if (A.join() !== "B02,B03,B04,B05,B06,B07,B08,B8A,B11,B12,SCL") return {ok: false, status: 400, json: async () => ({})};
      if (m === 1 && d === 23) return tl({values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]});                           // không có dữ liệu
      const may = d === 23 || m === 7, n = may ? 0.5 : ${"0.1"} + 0.03 * m + (d === 13 ? 0.02 : 0), r = may ? 0.5 : ${R4};
      const refl = [0.04, 0.06, r, 0.12, 0.2, 0.24, n, 0.26, 0.18, 0.12];
      return tl({values: refl.map(x => Math.round(x * 10000) + off).concat([may ? (m === 7 && d !== 23 ? 8 : 9) : 4])}); }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u)) { PC_DEM.s1++;
      const id = decodeURIComponent(/item=([^&]+)/.exec(u)[1]), m = +id.slice(9, 11);
      return tl({values: [Math.pow(10, (-15 + m) / 10), Math.pow(10, (-22 + m / 2) / 10)]}); }
    return F0(u, o); }`);

  // ---------- 1. bật 12 tháng
  E(`select("E0001", false); setYear(2024); CVS.mode = "mot"; CVS.feat = "NDVI"; CVS.s1 = false`);
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(150);
  ok(!$("selCurveKy").hidden && $("selCurveKy").value === "6" && /6 kỳ/.test($("curveH").textContent), "mặc định 6 kỳ như trước");
  $("selCurveKy").value = "12"; $("selCurveKy").onchange();
  ok(E("CVS.ky12") === true && E(`JSON.parse(localStorage.getItem("laymau_hp_curve_v1")).ky12`) === true, "chọn 12 tháng, nhớ trong trình duyệt");
  ok(/12 tháng/.test($("curveH").textContent), "tiêu đề: " + $("curveH").textContent);
  await until(() => E(`(S2M.m.get(s1Khoa(ST.diem.E0001)) || {}).xong`), 20000, "đọc xong S2 theo tháng");
  await sleep(250);
  const b = E("PC_DEM.s2stac[0]");
  ok(b.collections[0] === "sentinel-2-l2a" && b.query["eo:cloud_cover"].lte === 80 && b.intersects.type === "Point", "tìm cảnh: sentinel-2-l2a tại điểm, mây cả cảnh ≤ 80 %");
  ok(E(`PC_DEM.s2.every(id => id.startsWith("T1_"))`) && E(`new Set(PC_DEM.s2).size === PC_DEM.s2.length`), "cùng ngày hai ô MGRS: chỉ đọc cảnh ít mây hơn, mỗi cảnh một lần");
  ok(E(`PC_DEM.s2.slice(0, 12).every(id => id.includes("_2024-"))`), "năm đang gán (2024) đọc trước");
  const e = E(`(() => { const e = S2M.m.get(s1Khoa(ST.diem.E0001)), N = e.nam[2024]; return {N, n: e.canh.length, q: e.canh.filter(c => c.quang).length}; })()`);
  const kv = Array.from({length: 12}, (_, i) => i === 6 ? null : (nd(NIR(i + 1, 3), R4) + nd(NIR(i + 1, 13), R4)) / 2);
  ok(e.N.NDVI.every((v, i) => i === 6 ? v === null : gan(v, kv[i], 1e-3)), "NDVI tháng = trung vị các cảnh quang đãng: " + e.N.NDVI.map(v => v == null ? "–" : v.toFixed(3)).join(" "));
  ok(e.N.n.join() === "2,2,2,2,2,2,0,2,2,2,2,2", "bỏ cảnh mây (SCL 8, 9) và cảnh không có dữ liệu; tháng 7 mây cả tháng thì để trống: " + e.N.n.join());
  ok(gan(e.N.B4[0], 0.05, 1e-4) && gan(e.N.B4[4], 0.05, 1e-4) && gan(e.N.B8[0], 0.14, 1e-4), "phản xạ đúng cả hai baseline: tháng 1 (03.01, không offset) B4 " + e.N.B4[0] + ", tháng 5 (05.11, trừ 1000) B4 " + e.N.B4[4]);
  ok(e.N.MNDWI && e.N.B5 && e.N.B12, "đủ 10 băng, NDVI, MNDWI (" + Object.keys(e.N).length + " đặc trưng)");

  // ---------- 2. đồ thị
  let svg = $("curve").querySelector("svg").innerHTML;
  const nhan = [...$("curve").querySelector("svg").querySelectorAll("text")].map(t => t.textContent).filter(t => /^th /.test(t));
  ok(nhan.length === 12 && nhan[11] === "th 12", "trục 12 tháng: " + nhan.join(", "));
  ok((svg.match(/<circle[^>]*fill="#2e9d3a"[^>]*opacity=".55"/g) || []).length === 22, "chế độ một năm: chấm từng cảnh quang đãng (NDVI 22 cảnh)");
  ok((svg.match(/<line[^>]*stroke="#98a2b3" stroke-width="1.2"/g) || []).length === 14, "vạch xám dưới trục: 14 cảnh mây / không có dữ liệu tại điểm");
  const tx = $("curve").textContent;
  ok(/Sentinel-2 L2A/.test(tx) && /tháng không có ảnh quang đãng: 7/.test(tx) && /năm 2024: 22 cảnh quang đãng/.test(tx), "chú giải: nguồn, số cảnh quang đãng, tháng trống");
  // đặc trưng chỉ có ở 12 tháng
  ok([...$("selCurveFeat").options].map(o => o.value).includes("B5"), "ô đặc trưng có đủ 10 băng");
  $("selCurveFeat").value = "B5"; $("selCurveFeat").onchange(); await sleep(150);
  E(`renderCurve()`); await sleep(150);
  ok(E("CVS.feat") === "B5" && $("selCurveFeat").value === "B5" && /stroke="#c2410c"/.test($("curve").querySelector("svg").innerHTML), "chọn B5: giữ lựa chọn khi vẽ lại, có đường B5");
  E(`CVS.feat = "NDVI"`);
  for (const md of ["chong", "chuoi"]) {
    E(`CVS.mode = "${md}"; renderCurve()`); await sleep(150);
    const s = $("curve").querySelector("svg");
    ok(s && /polyline/.test(s.innerHTML) && (md !== "chuoi" || /2024, tháng 5:/.test(s.innerHTML)), `cách xem "${md}" vẽ được 12 tháng`);
  }
  E(`CVS.mode = "mot"`);
  const truoc = E("PC_DEM.s2.length");
  E(`renderCurve()`); await sleep(150);
  ok(E("PC_DEM.s2.length") === truoc, "vẽ lại không đọc lại (đã giữ trong bộ nhớ)");

  // ---------- 3. S1 theo tháng
  $("cbCurveS1").checked = true; $("cbCurveS1").onchange();
  await until(() => E(`(S1C.m.get(s1Khoa(ST.diem.E0001)) || {}).xong`), 20000, "đọc xong S1");
  await sleep(250);
  const vv = E(`S1C.m.get(s1Khoa(ST.diem.E0001)).nam12[2024].VV`);
  ok(vv.length === 12 && vv.every((v, i) => gan(v, -15 + i + 1, 0.01)), "S1 theo tháng: VV = " + vv.join(" "));
  svg = $("curve").querySelector("svg").innerHTML;
  ok(/#e8590c/.test(svg) && /#2e9d3a/.test(svg) && /trung vị dB theo tháng/.test($("curve").textContent), "đồ thị có cả NDVI tháng (S2) và VV, VH tháng (S1)");
  ok(E("S1C.MAX") === 12, "hàng đợi chung S1 + S2: 12 yêu cầu cùng lúc");
  $("cbCurveS1").checked = false; $("cbCurveS1").onchange(); await sleep(100);

  // ---------- 4. điểm xa (không có ảnh PC sẵn): vẫn có 12 tháng
  E(`ST.diem.XA = CORE.newPoint("XA", 105.20, 19.30, {bo: "E0"}); ST.filter = "all"; select("XA", false)`);
  await until(() => E(`(S2M.m.get(s1Khoa(ST.diem.XA)) || {}).xong`), 20000, "S2 điểm xa");
  await sleep(250);
  ok(!/không có đường mùa vụ/.test($("curve").textContent) && /polyline/.test(($("curve").querySelector("svg") || {}).innerHTML || ""), "điểm ngoài vùng có ảnh sẵn: vẫn vẽ đường 12 tháng");

  // ---------- 4b. dữ liệu thật đã ghi (ruộng lúa 20.89696, 106.58221): tái lập đúng các con số trong BAN_3_9.md
  E(`ST.diem.RUONG = CORE.newPoint("RUONG", 106.582205, 20.896964, {bo: "E0"}); select("RUONG", false); setYear(2024); CVS.feat = "NDVI"; CVS.mode = "mot"; renderCurve()`);
  await until(() => E(`(S2M.m.get(s1Khoa(ST.diem.RUONG)) || {}).xong`), 20000, "S2 điểm thật");
  await sleep(250);
  const th = E(`(() => { const e = S2M.m.get(s1Khoa(ST.diem.RUONG)), c = e.canh.filter(c => c.d.startsWith("2024")); return {n: c.length, q: c.filter(c => c.quang).length, ndvi: e.nam[2024].NDVI.map(v => v == null ? null : +v.toFixed(2))}; })()`);
  ok(th.n === 52 && th.q === 26, `dữ liệu thật năm 2024: ${th.n} cảnh, ${th.q} cảnh quang đãng tại điểm`);
  ok(JSON.stringify(th.ndvi) === JSON.stringify([0.56, 0.54, 0.49, 0.40, 0.58, 0.68, null, 0.43, 0.66, 0.56, 0.56, 0.58]), "NDVI tháng 2024 đúng như ghi trong BAN_3_9.md: " + th.ndvi.map(v => v == null ? "–" : v).join(" "));
  if (process.env.VE) {                                // ghi đồ thị ra tệp để xem bằng mắt
    const ve = async (md, f) => { E(`CVS.mode = "${md}"; CVS.feat = "${f}"; renderCurve()`); await sleep(250); return `<h4>${md} · ${f}</h4><div class="cvbox" style="width:560px">${$("curve").innerHTML}</div>`; };
    E(`CVS.s1 = true; $("cbCurveS1").checked = true; renderCurve()`);
    await until(() => E(`(S1C.m.get(s1Khoa(ST.diem.RUONG)) || {}).xong`), 20000, "S1 điểm thật (giả)");
    let h = await ve("mot", "NDVI"); E(`CVS.s1 = false; $("cbCurveS1").checked = false`);
    h += await ve("chong", "NDVI") + await ve("chuoi", "NDVI");
    require("fs").writeFileSync(process.env.VE, `<!doctype html><meta charset="utf-8"><title>Mùa vụ 12 tháng</title>${[...w.document.querySelectorAll("style")].map(x => x.outerHTML).join("")}<body style="padding:12px;background:#fff">${h}</body>`);
    E(`CVS.mode = "mot"`);
  }
  E(`delete ST.diem.RUONG`);

  // ---------- 5. nạp trước
  E(`delete ST.diem.XA; NT.so = 2; select("E0002", false); NT.xong.clear(); ntBatDau(0)`);
  await until(() => E(`!!(S2M.m.get(s1Khoa(ST.diem.E0003)) || {}).xong`), 25000, "nạp trước 12 tháng cho điểm kế tiếp");
  ok(E(`!!(S2M.m.get(s1Khoa(ST.diem.E0003)) || {}).xong`) && /\|12$/.test(E(`ntKhoa(ST.diem.E0003)`)), "nạp trước đường 12 tháng của điểm kế tiếp; khoá nạp trước tách 6 / 12");

  // ---------- 6. về 6 kỳ
  $("selCurveKy").value = "6"; $("selCurveKy").onchange(); await sleep(250);
  const nh6 = [...(($("curve").querySelector("svg") || {querySelectorAll: () => []}).querySelectorAll("text"))].map(t => t.textContent).filter(t => /^th /.test(t));
  ok(E("KY.length") === 6 && /6 kỳ/.test($("curveH").textContent) && (nh6.length === 0 || nh6[0] === "th 1-2"), "về 6 kỳ: như trước");
  $("selCurveKind").value = "nam"; $("selCurveKind").onchange(); await sleep(100);
  ok($("selCurveKy").hidden, "giá trị theo năm: ẩn ô 6 kỳ / 12 tháng");
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(100);

  // ---------- 7. dịch
  $("selCurveKy").value = "12"; $("selCurveKy").onchange(); await sleep(200);
  E("setLang('ru')"); await sleep(80);
  E(`renderCurve()`); await sleep(250);
  ok(/12 месяцев/.test([...$("selCurveKy").options].map(o => o.textContent).join()) && /12 месяцам/.test($("curveH").textContent) && /медиана по месяцам/.test($("curve").textContent), "tiếng Nga: ô chọn, tiêu đề, chú giải");
  const miss = E("[...T_MISS]").filter(x => /tháng|S2|cảnh|kỳ/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  $("selCurveKy").value = "6"; $("selCurveKy").onchange(); await sleep(100);
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
