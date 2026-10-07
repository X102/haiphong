// Bản 3.10: ① Overture: tệp PMTiles giả (mk_fx310.py, đáp án biết trước) đọc bằng bộ đọc PMTiles/MVT tự viết của trang: tìm bản mới
// nhất qua STAC, thống kê quanh điểm (nhóm chức năng, ngưỡng tin cậy, bán kính, đối tượng sát cạnh ô có ở hai ô, nhà có lỗ, nhà
// ngầm, thư mục lá, ô không nén), khung điểm, lớp bản đồ, tính cho mọi điểm, cột CSV, gộp tiến độ.
// ② Nhiệt độ bề mặt Landsat: STAC và API điểm Planetary Computer giả; loại mây QA, mây sáng QA bỏ sót, cảnh lạnh bất thường;
// trung vị theo kỳ / tháng; trục °C; cùng S1; ghi vào điểm; nạp trước; dịch.
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
execSync("python3 " + __dirname + "/mk_fx310.py");
const DA = JSON.parse(fs.readFileSync("/tmp/fx/data/ov/dap_an.json", "utf8"));
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.10", undefined, {numeric: true}) >= 0 && E("VERSION").localeCompare("3.9", undefined, {numeric: true}) > 0, "bản " + E("VERSION"));
  w.DecompressionStream = DecompressionStream;           // trình duyệt thật có sẵn; jsdom thì lấy của node

  // ---------- 1. Overture: tìm bản, thống kê quanh điểm
  E(`OV.STAC = "http://127.0.0.1:8765/ov/catalog.json"; OV.TILE = "http://127.0.0.1:8765/ov/{ban}/{kieu}.pmtiles"; OV.ban = ""; OV.banT = 0;
     OV.K.clear(); OV.O.clear(); OV.TK.clear(); window.PD = CORE.newPoint("OVT", ${DA.lon}, ${DA.lat}, {bo: "E0"})`);
  ok(await E("ovBan()") === "2026-09-23.1" && /2026-09-23\.1/.test($("ovBan").textContent), "tìm bản Overture mới nhất qua STAC: 2026-09-23.1 (bỏ bản 2026-08-19.0)");
  const s = await E("ovThongKe(PD, 250, 0.3)");
  ok(s.poi === 15 && s.nhom.tm === 8 && s.nhom.au === 4 && s.nhom.gd === 1 && s.nhom.yt === 1 && s.nhom.kh === 1 && s.nhom.cn === 0,
     `POI trong 250 m: 15 (thương mại 8, ăn uống 4, giáo dục 1, y tế 1, khác 1): ${s.poi} ${JSON.stringify(s.nhom)}`);
  ok(s.nhom.yt === 1, "POI sát cạnh ô, có ở cả hai ô vector: đếm một lần");
  const H = -[8, 4, 1, 1, 1].map(n => n / 15).reduce((a, p) => a + p * Math.log(p), 0) / Math.log(11);
  ok(gan(s.dd, H, 1e-6) && gan(s.km2, 15 / (Math.PI * 0.25 * 0.25), 0.1), `độ đa dạng chức năng ${s.dd.toFixed(3)} (Shannon chuẩn hoá theo 11 nhóm), mật độ ${s.km2.toFixed(1)}/km²`);
  ok(s.gan[0].n === "Cửa hàng 0" && gan(s.gan[0].d, 20, 8), "POI gần nhất: " + JSON.stringify(s.gan[0]));
  ok(s.nha === 14, "nhà trong 250 m: 14 (bỏ nhà ngầm, nhà xa; có nhà ở ô bên cạnh): " + s.nha);
  ok(gan(s.phu * Math.PI * 250 * 250, 5300, 5300 * 0.05) && gan(s.dt_max, 3000, 90) && gan(s.ty_lon, 3000 / 5300, 0.03),
     `diện tích nhà ${Math.round(s.phu * Math.PI * 62500)} m² (đáp án 5300, nhà có lỗ tính 800 m²), lớn nhất ${Math.round(s.dt_max)} m² (3000), nhà ≥ 1000 m² chiếm ${(100 * s.ty_lon).toFixed(1)}%`);
  ok(s.tang_n === 1 && s.tang_tb === 5 && s.nguon["OpenStreetMap"] === 2 && s.nguon["Microsoft ML Buildings"] === 1, "số tầng, nguồn hình nhà: " + JSON.stringify(s.nguon));
  const s5 = await E("ovThongKe(PD, 500, 0.3)"), s0 = await E("ovThongKe(PD, 250, 0)");
  ok(s5.poi === 17 && s5.nhom.cn === 2, "bán kính 500 m: thêm 2 POI công nghiệp, kho vận (một ở ô bên cạnh): " + s5.poi);
  ok(s0.poi === 16 && s0.nhom.tm === 9, "ngưỡng tin cậy 0: thêm POI tin cậy 0.1");

  // ---------- 2. khung điểm, ghi vào điểm
  E(`ST.diem.OVT = PD; ST.filter = "all"; $("ovR").value = "250"; $("ovR").onchange(); select("OVT", false)`);
  await until(() => /15<\/b> POI/.test($("ovBox").innerHTML), 8000, "khung Overture");
  ok(/Quanh điểm 250 m/.test($("ovBox").textContent) && /14<\/b> nhà/.test($("ovBox").innerHTML) && $("ovBox").querySelectorAll(".ov-thanh i").length === 5,
     "khung điểm: số POI, số nhà, thanh nhóm chức năng (5 nhóm)");
  ok(E("cur().ov.poi") === 15 && E("cur().ov.r") === 250 && E("cur().ov.nha") === 14 && E("cur().ov.ban") === "2026-09-23.1", "ghi thống kê vào điểm (p.ov)");
  $("ovR").value = "500"; $("ovR").onchange();
  await until(() => /17<\/b> POI/.test($("ovBox").innerHTML), 8000, "bán kính 500");
  ok(E("cur().ov.r") === 500 && E("cur().ov.nhom.cn") === 2 && E(`JSON.parse(localStorage.getItem("laymau_hp_ov_v1")).r`) === 500, "đổi bán kính 500 m: khung, điểm, lựa chọn nhớ trong trình duyệt");
  E(`$("cOvTK").checked = false; $("cOvTK").onchange()`); await sleep(50);
  ok($("ovBox").innerHTML === "", "tắt thống kê quanh điểm: khung trống");
  E(`$("cOvTK").checked = true; $("cOvTK").onchange()`); await sleep(100);

  // ---------- 3. lớp bản đồ
  E(`window.VE = []; const _v = ovVe; ovVe = function (cv, t, kieu, s, ox, oy, z) { VE.push([kieu, z, s]); return _v.apply(this, arguments); }; map.setView([PD.lat, PD.lon], 12)`);
  E(`$("cOvNha").checked = true; $("cOvNha").onchange(); $("cOvPoi").checked = true; $("cOvPoi").onchange()`); await sleep(100);
  ok(E("!!OV.lopNha && map.hasLayer(OV.lopNha) && !!OV.lopPoi && map.hasLayer(OV.lopPoi)") && /mức 14/.test($("ovTT").textContent), "bật lớp nhà, POI; mức phóng 12: nhắc phóng tới mức 14");
  ok(/thương mại/.test($("ovCG").textContent) && /≥ 5000 m²/.test($("ovCG").textContent), "chú giải: nhóm chức năng, cỡ nhà");
  E(`map.setView([PD.lat, PD.lon], 16)`);
  await until(() => E(`VE.some(v => v[0] === "buildings" && v[1] === 16 && v[2] === 4) && VE.some(v => v[0] === "places")`), 8000, "vẽ ô");
  ok(E(`VE.some(v => v[0] === "buildings" && v[2] === 4)`) && $("ovTT").textContent === "", "mức 16: vẽ từ ô mức 14 phóng 4 lần, hết lời nhắc");
  ok(E(`v28DS().some(d => d.k === "ovnha" && d.lay() === OV.lopNha)`), "lớp Overture có trong bảng độ trong suốt");
  E(`$("cOvNha").checked = false; $("cOvNha").onchange(); $("cOvPoi").checked = false; $("cOvPoi").onchange()`);
  ok(E("!OV.lopNha && !OV.lopPoi"), "tắt: bỏ lớp khỏi bản đồ");

  // ---------- 4. tính cho mọi điểm, CSV, gộp
  E(`Object.values(ST.diem).forEach(p => { delete p.ov; })`);
  $("ovTatCa").click();
  await until(() => /đã tính Overture cho 5\/5/.test($("ovTT").textContent), 15000, "tính cho mọi điểm");
  ok(E("Object.values(ST.diem).every(p => p.ov && p.ov.r === 500)") && E("ST.diem.OVT.ov.poi") === 17, "tính cho mọi điểm: 5/5 điểm có p.ov — " + $("ovTT").textContent);
  E(`setYear(2024); CORE.setLabel(ST.diem.OVT, 2024, "1")`);
  const row = E(`CORE.exportLong([ST.diem.OVT], [2024], IDX)[0]`);
  ok(row.ov_poi === 17 && row.ov_poi_cn === 2 && row.ov_poi_tm === 8 && row.ov_nha >= 14 && row.ov_r_m === 500 && row.ov_ban === "2026-09-23.1" && row.ov_dt_nha_max_m2 > 2900 && "lst_tv_c" in row,
     "CSV dạng dài: cột ov_poi, ov_poi_<nhóm>, ov_nha, ov_phu_xd, ov_dt_nha_…, lst_tv_c");
  const gop = E(`(() => { const a = {X: CORE.newPoint("X", 106.6, 20.9)}, b = {X: Object.assign(CORE.newPoint("X", 106.6, 20.9), {ov: ST.diem.OVT.ov, lst: {2024: [30.5, 9]}})}; CORE.merge(a, b); return [a.X.ov && a.X.ov.poi, a.X.lst && a.X.lst[2024][0]]; })()`);
  ok(gop[0] === 17 && gop[1] === 30.5, "gộp tiến độ mang theo p.ov, p.lst");

  // ---------- 5. nhiệt độ bề mặt Landsat
  const DN = t => Math.round((t + 273.15 - 149) / 0.00341802), XANH = r => Math.round((r + 0.2) / 0.0000275);
  E(`window.LS_DEM = {stac: [], diem: []}; window.F0 = window.fetch; window.fetch = async (u, o) => {
    u = String(u); const tl = j => ({ok: true, status: 200, json: async () => j});
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /landsat-c2-l2/.test(o.body)) {
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/"), f = []; LS_DEM.stac.push(b);
      for (let y = +t0.slice(0, 4); y <= +t1.slice(0, 4); y++) for (let m = 1; m <= 12; m++) for (const d of ["05", "21"]) {
        const n = y + "-" + String(m).padStart(2, "0") + "-" + d;
        f.push({id: "A_" + n, properties: {datetime: n + "T03:20:00Z", "eo:cloud_cover": 20, platform: m % 2 ? "landsat-8" : "landsat-9"}});
        f.push({id: "B_" + n, properties: {datetime: n + "T03:20:30Z", "eo:cloud_cover": 60, platform: "landsat-8"}});
      }
      return tl({type: "FeatureCollection", features: f, links: []}); }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u) && /collection=landsat-c2-l2/.test(u)) {
      const id = decodeURIComponent(/item=([^&]+)/.exec(u)[1]); LS_DEM.diem.push(id);
      if ([...u.matchAll(/assets=(\\w+)/g)].map(x => x[1]).join() !== "lwir11,qa_pixel,blue") return {ok: false, status: 400, json: async () => ({})};
      const y = +id.slice(2, 6), m = +id.slice(7, 9), d = +id.slice(10, 12);
      let t = 20 + m + (d === 21 ? 2 : 0), qa = 21824, bl = ${XANH(0.06)};
      if (m === 7) qa = 22280;                                         // tháng 7: mây theo QA
      if (y === 2024 && m === 4 && d === 5) { t = -30; bl = ${XANH(0.5)}; }   // mây sáng QA bỏ sót
      if (y === 2024 && m === 6 && d === 21) t = 10;                   // lạnh bất thường (mây mỏng)
      return tl({values: [Math.round((t + 273.15 - 149) / 0.00341802), qa, bl]}); }
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-2-l2a/.test(o.body)) return tl({type: "FeatureCollection", features: [], links: []});
    if (/\\/stac\\/v1\\/search$/.test(u) && o && /sentinel-1-rtc/.test(o.body)) {
      const b = JSON.parse(o.body), [t0, t1] = b.datetime.split("/"), f = [];
      for (let y = +t0.slice(0, 4); y <= +t1.slice(0, 4); y++) for (let m = 1; m <= 12; m++) { const n = y + "-" + String(m).padStart(2, "0") + "-11";
        f.push({id: "D91_" + n, properties: {datetime: n + "T22:51:00Z", "sat:orbit_state": "descending", "sat:relative_orbit": 91}}); }
      return tl({type: "FeatureCollection", features: f, links: []}); }
    if (/\\/data\\/v1\\/item\\/point\\//.test(u)) { const m = +decodeURIComponent(/item=([^&]+)/.exec(u)[1]).slice(9, 11); return tl({values: [Math.pow(10, (-15 + m) / 10), Math.pow(10, (-22 + m / 2) / 10)]}); }
    return F0(u, o); }`);
  E(`select("E0001", false); setYear(2024); CVS.mode = "mot"; CVS.ky12 = false; CVS.s1 = false; $("selCurveKy").value = "6"`);
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(150);
  ok(!$("lbCurveLST").hidden && !$("cbCurveLST").checked, "đường mùa vụ có ô + nhiệt (chưa bật)");
  $("cbCurveLST").checked = true; $("cbCurveLST").onchange();
  ok(E("CVS.lst") === true && E(`JSON.parse(localStorage.getItem("laymau_hp_curve_v1")).lst`) === true, "bật + nhiệt, nhớ trong trình duyệt");
  await until(() => E(`(LST.m.get(s1Khoa(ST.diem.E0001)) || {}).xong`), 20000, "đọc xong Landsat");
  await sleep(250);
  const b = E("LS_DEM.stac[0]");
  ok(b.query["eo:cloud_cover"].lte === 80 && b.query.platform.in.join() === "landsat-8,landsat-9" && E(`LS_DEM.diem.every(id => id.startsWith("A_"))`),
     "tìm cảnh Landsat 8/9, mây ≤ 80 %; cùng ngày hai cảnh: đọc cảnh ít mây hơn");
  ok(E(`LS_DEM.diem.slice(0, 10).every(id => id.includes("_2024-"))`), "năm đang gán (2024) đọc trước");
  const e = E(`(() => { const e = LST.m.get(s1Khoa(ST.diem.E0001)); return {n6: e.nam[2024], n12: e.nam12[2024], n1: e.nam1[2024],
    sang: e.canh.filter(c => c.sang).map(c => c.d), lanh: e.canh.filter(c => c.lanh).map(c => c.d), may: e.canh.filter(c => !c.qa_sach).length}; })()`);
  ok(e.sang.join() === "2024-04-05" && e.lanh.join() === "2024-06-21" && e.may === 6, `loại mây QA (tháng 7: ${e.may} cảnh), mây sáng QA bỏ sót (${e.sang}), cảnh lạnh bất thường (${e.lanh})`);
  const k12 = [22, 23, 24, 26, 26, 26, null, 29, 30, 31, 32, 33];
  ok(e.n12.T.every((v, i) => k12[i] == null ? v === null : gan(v, k12[i], 0.02)), "trung vị theo tháng năm 2024: " + e.n12.T.map(v => v == null ? "–" : v.toFixed(1)).join(" "));
  ok([22.5, 25, 26, 29, 30.5, 32.5].every((v, i) => gan(e.n6.T[i], v, 0.02)), "trung vị theo kỳ 2 tháng: " + e.n6.T.map(v => v.toFixed(1)).join(" "));
  ok(e.n1[1] === 20 && gan(e.n1[0], 27.5, 0.02), `trung vị cả năm ${e.n1[0]} °C từ ${e.n1[1]} cảnh`);
  let svg = $("curve").querySelector("svg").innerHTML;
  ok(/°C</.test(svg) && /fill="#c92a2a"/.test(svg) && /stroke="#c92a2a"/.test(svg) && /nhiệt độ bề mặt Landsat/.test($("curve").textContent), "đồ thị có đường nhiệt độ đỏ, trục °C, chú giải");
  ok((svg.match(/<rect[^>]*fill="#c92a2a" opacity=".55"/g) || []).length === 20 && (svg.match(/<line[^>]*stroke="#c92a2a"/g) || []).length === 2,
     "chế độ một năm: 20 ô cảnh quang đãng, 2 vạch cảnh bị loại (mây sáng, lạnh bất thường)");
  ok(/Năm 2024: trung vị 27\.5 °C \(20 cảnh\)/.test($("curve").textContent) && /loại thêm 2 cảnh nghi mây/.test($("curve").textContent), "chú giải: trung vị năm, số cảnh bị loại thêm");
  ok(JSON.stringify(E("ST.diem.E0001.lst[2024]")) === JSON.stringify([27.5, 20]), "ghi trung vị từng năm vào điểm (p.lst)");
  CVS_12: {
    E(`$("selCurveKy").value = "12"; $("selCurveKy").onchange()`); await sleep(300);
    svg = ($("curve").querySelector("svg") || {}).innerHTML || "";
    ok(/LST 2024, tháng 5: 26\.0 °C/.test(svg), "12 tháng: đường nhiệt độ theo tháng");
    E(`$("selCurveKy").value = "6"; $("selCurveKy").onchange()`); await sleep(200);
  }
  $("cbCurveS1").checked = true; $("cbCurveS1").onchange();
  await until(() => E(`(S1C.m.get(s1Khoa(ST.diem.E0001)) || {}).xong`), 20000, "S1");
  await sleep(250);
  svg = $("curve").querySelector("svg").innerHTML;
  const xDB = +(/<text x="([\d.]+)"[^>]*>dB</.exec(svg) || [])[1], xC = +(/<text x="([\d.]+)"[^>]*>°C</.exec(svg) || [])[1];
  if (process.env.VE) require("fs").writeFileSync(process.env.VE, `<!doctype html><meta charset="utf-8">${[...w.document.querySelectorAll("style")].map(x => x.outerHTML).join("")}<body style="background:#fff;padding:10px"><div style="width:600px">${$("curve").innerHTML}</div><hr><div style="width:600px">${$("ovBox") ? "" : ""}</div></body>`);
  ok(/#e8590c/.test(svg) && xDB > 0 && xC > xDB + 20, `bật cả + S1: hai trục phải, dB ở trong (x ${xDB}), °C ở ngoài (x ${xC})`);
  for (const md of ["chong", "chuoi"]) { E(`CVS.mode = "${md}"; renderCurve()`); await sleep(150); ok(/#c92a2a/.test($("curve").querySelector("svg").innerHTML) && />°C</.test($("curve").querySelector("svg").innerHTML), `cách xem "${md}" có nhiệt độ`); }
  E(`CVS.mode = "mot"`); $("cbCurveS1").checked = false; $("cbCurveS1").onchange(); await sleep(100);
  // nạp trước
  E(`delete ST.diem.E0003.ov; select("E0002", false); NT.so = 2; NT.xong.clear(); ntBatDau(0)`);
  await until(() => E(`!!(LST.m.get(s1Khoa(ST.diem.E0003)) || {}).xong && !!ST.diem.E0003.ov`), 20000, "nạp trước");
  ok(/\|to500_0\.3$/.test(E("ntKhoa(ST.diem.E0003)")), "nạp trước: nhiệt độ và thống kê Overture của điểm kế tiếp; khoá có + nhiệt, bán kính, ngưỡng: " + E("ntKhoa(ST.diem.E0003)").slice(-12));
  $("selCurveKind").value = "nam"; $("selCurveKind").onchange(); await sleep(80);
  ok($("lbCurveLST").hidden, "giá trị theo năm: ẩn ô + nhiệt");
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(80);

  // ---------- 6. dịch
  E("setLang('ru')"); await sleep(80);
  E(`select("OVT", false); renderCurve()`); await sleep(300);
  ok(/\+ темп\./.test($("lbCurveLST").textContent) && /Вокруг точки, 500 м/.test($("ovBox").textContent) && /торговля/.test($("ovBox").textContent) && /Рассчитать для всех точек/.test($("ovTatCa").textContent),
     "tiếng Nga: ô + nhiệt, khung Overture, nút");
  const miss = E("[...T_MISS]").filter(x => /Overture|nhà|POI|nhiệt|Landsat|mây|chức năng|°C/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi'); CVS.lst = false; $('cbCurveLST').checked = false");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
