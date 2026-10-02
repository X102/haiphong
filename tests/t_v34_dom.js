// Bản 3.4: Landsat và Sentinel-1 trực tuyến từ Planetary Computer (STAC + vé SAS giả, COG giả mk_fx34.py).
// Kiểm: chọn nguồn trong bảng kế hoạch, yêu cầu STAC đúng bộ, vé SAS gắn vào đường dẫn, bỏ Landsat 7 sau 2003, che mây QA_PIXEL,
// thang phản xạ Landsat, chỉ số dùng chung; S1 không lọc mây, dB, chỉ số radar, ảnh màu VV/VH; mỗi nguồn một kế hoạch; ghi ảnh khi gán; dịch.
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/pc/items.json")) execSync("python3 " + __dirname + "/mk_fx34.py");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.4", "bản " + E("VERSION"));
  // lõi: mặt nạ theo nguồn
  ok(E(`[S2OC.quang("ls", 21824), S2OC.quang("ls", 22280), S2OC.quang("ls", 21826), S2OC.quang("ls", 1), S2OC.quang("s1", 0.05), S2OC.quang("s1", -32768), S2OC.quang("s2", 4), S2OC.quang("s2", 9)].join()`)
     === "true,false,false,false,true,false,true,false", "mặt nạ: QA_PIXEL Landsat (mây, mây giãn, không dữ liệu), S1 có dữ liệu, SCL S2");

  E(`window.PC_REQ = []; window.SAS_REQ = []; window.F0 = window.fetch; window.fetch = async (u, o) => {
    u = String(u);
    if (/\\/sas\\/v1\\/token\\//.test(u)) { SAS_REQ.push(u.split("/").pop()); return {ok: true, status: 200, json: async () => ({token: "st=tok" + SAS_REQ.length, "msft:expiry": new Date(Date.now() + 3600e3).toISOString()})}; }
    if (u !== S2OC.NGUON.ls.api) return F0(u, o);
    const b = JSON.parse(o.body); PC_REQ.push(b);
    const all = await F0("http://127.0.0.1:8765/pc/items.json").then(r => r.json()), [t0, t1] = b.datetime.split("/");
    const f = all.features.filter(it => b.collections.includes(it.collection) && it.properties.datetime >= t0 && it.properties.datetime <= t1 && (!b.query || it.properties["eo:cloud_cover"] <= b.query["eo:cloud_cover"].lte));
    return {ok: true, status: 200, json: async () => ({type: "FeatureCollection", features: f})}; }`);
  $("bS2O").click(); await sleep(20);
  const d = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change")); };
  const an = id => { const e = $("s2oP").querySelector(`#${id}`); return e.hidden || !!e.closest("[hidden]"); };

  // ---------- 1. Landsat
  d("s2oNguon", "ls"); await sleep(20);
  ok($("s2oN1").options[0].value === "1984" && !an("s2oMay") && !an("s2oL7") && an("s2oBo") && /Landsat/.test($("s2oP").querySelector(".vg-dau b").textContent),
     "chọn Landsat: năm từ 1984, có ô mây và Landsat 7, ẩn bộ dữ liệu S2");
  d("s2oPV", "nhin"); E(`map.setView([20.92, 106.68], 12, {animate: false})`); d("s2oT1", "1"); d("s2oT2", "4"); d("s2oN1", "1995"); d("s2oN2", "2005"); d("s2oSo", "2");
  $("s2oTim").click(); await until(() => /xong|lỗi/.test($("s2oTT").textContent), 60000, "tìm cảnh Landsat");
  const K = E("ST.s2o");
  ok(/xong: 2 năm có ảnh/.test($("s2oTT").textContent) && K.cfg.nguon === "ls", "tìm xong: " + $("s2oTT").textContent);
  const rq = E("PC_REQ");
  ok(rq.length === 11 && rq.every(b => b.collections[0] === "landsat-c2-l2" && !b.fields && b.query["eo:cloud_cover"].lte === 60) && E("SAS_REQ[0]") === "landsat-c2-l2",
     "yêu cầu STAC Planetary Computer: bộ landsat-c2-l2, lọc mây, xin vé SAS cho bộ dữ liệu");
  ok(K.nam[1995].chon.slice().sort().join() === "L1,L2" && K.nam[2005].ung.map(s => s.id).join() === "L8" && /Planetary Computer/.test(K.nguon),
     "kế hoạch: 1995 (L1, L2), 2005 chỉ L8 (Landsat 7 sau hỏng SLC bị bỏ)");
  const sc = K.nam[1995].ung.find(s => s.id === "L1");
  ok(sc.ng === "ls" && sc.o_mgrs === "WRS127/046" && gan(sc.s, 0.0000275, 1e-12) && sc.o === -0.2 && /\?st=tok/.test(E(`S2OC.url(ST.s2o.nam[1995].ung[0], "B4")`)),
     "cảnh Landsat: hàng WRS, thang 0.0000275 / −0.2, đường dẫn có vé SAS");
  ok(E("S2OC.BANG.join()") === "B2,B3,B4,B8,B11,B12" && /Landsat trực tuyến/.test(E("s2oL0().ten")), "băng và tên lớp theo nguồn Landsat");
  E("setYear(1995)");
  const ve = async (lon, lat) => E(`(async () => { const m = S2OC.ll2m(${lon}, ${lat}); return Array.from(await S2OC.ghep(s2oCanh(1995), ["B4", "B8"], [m[0] - 20, m[1] - 20, m[0] + 20, m[1] + 20], 1, 1, true)); })()`);
  const dong = await ve(106.70, 20.92), tay = await ve(106.55, 20.92);
  ok(gan(dong[0], 700, 2) && gan(dong[1], 3000, 2) && gan(tay[0], 800, 2), `ghép trung vị: phía đông B4 ${dong[0].toFixed(0)} (0.06 và 0.08), phía tây chỉ cảnh quang đãng ${tay[0].toFixed(0)}`);
  const h = await E(`s2oDiemHTML(106.55, 20.92, 1995)`);
  ok(/1995-01-15[^·]*✗ mây/.test(h) && /1995-02-20[^·]*✓/.test(h) && /NDVI/.test(h), "giá trị tại điểm: cảnh mây theo QA_PIXEL, NDVI");
  const A = await E(`(async () => { const A = await annualFor(CORE.newPoint("⌖", 106.70, 20.92, {bo: ""}), "s2oidx"); return {names: A.names, ys: A.ys, nguon: A.nguon}; })()`);
  const iN = A.names.indexOf("NDVI");
  ok(iN >= 0 && gan(A.ys[1995][iN], (0.30 - 0.07) / 0.37, 0.003) && gan(A.ys[2005][iN], 0.15 / 0.25, 0.003) && /Landsat/.test(A.nguon),
     `đồ thị theo năm Landsat: NDVI 1995 ${A.ys[1995][iN].toFixed(3)}, 2005 ${A.ys[2005][iN].toFixed(3)}`);
  ok(E(`s2oCS().every(c => c.f.bang.every(b => S2OC.BANG.includes(b)))`) && E(`S2OV.mode = "tci"; s2oCanBang().join()`) === "B4,B3,B2" && E(`S2OV.mode = "rgb"; S2OV.pre = "128a4"; s2oCanBang().join()`) === "B12,B8,B4",
     "Landsat: chỉ số chỉ còn loại đủ băng; màu thật 4-3-2; tổ hợp có B8A đổi sang B8");
  E(`S2OV.mode = "tci"`);
  const ma = E("SCHEME.lop[0].ma");
  E(`PROBE = null; select("E0001", false); setYear(1995); OVL.s2o.on = true; refreshOverlays(); label("${ma}")`);
  ok(/^landsat:ghep:1995/.test(E(`ST.diem.E0001.anh[1995].s`)), "gán nhãn: ghi ảnh Landsat đã xem: " + E(`ST.diem.E0001.anh[1995].s`));
  const taoLS = K.tao_luc;

  // ---------- 2. Sentinel-1
  d("s2oNguon", "s1"); await sleep(30);
  ok(!E("s2oKH()") && E("ST.s2oKho.ls.tao_luc") === taoLS && $("s2oN1").options[0].value === "2015" && an("s2oMay") && an("s2oChe") && an("s2oL7"),
     "đổi sang Sentinel-1: cất kế hoạch Landsat, năm từ 2015, ẩn mây, che mây, Landsat 7");
  d("s2oN1", "2020"); d("s2oN2", "2020"); d("s2oSo", "3");
  $("s2oTim").click(); await until(() => /xong|lỗi/.test($("s2oTT").textContent), 60000, "tìm cảnh S1");
  const b1 = E("PC_REQ").pop();
  ok(/xong: 1 năm có ảnh/.test($("s2oTT").textContent) && b1.collections[0] === "sentinel-1-rtc" && !b1.query && E("SAS_REQ").includes("sentinel-1-rtc"),
     "S1: bộ sentinel-1-rtc, không lọc mây, vé SAS riêng: " + $("s2oTT").textContent);
  ok(E("ST.s2o.nam[2020].chon.slice().sort().join()") === "S1a,S1b,S1c" && E("S2OC.BANG.join()") === "VV,VH" && E("ST.s2o.cfg.che") === false, "S1: ghép cả 3 cảnh, băng VV, VH");
  E("setYear(2020)");
  const h1 = await E(`s2oDiemHTML(106.70, 20.92, 2020)`), h2 = await E(`s2oDiemHTML(106.55, 20.92, 2020)`);
  ok(/VV -7\.0 dB/.test(h1) && /VH -14\.0 dB/.test(h1) && /RVI[^<]*<b>0\.66/.test(h1) && /VV -6\.0 dB/.test(h2) && /2020-01-05[^·]*✗/.test(h2),
     "S1 tại điểm: trung vị dB (−7.0 / −14.0), RVI, phía tây bỏ cảnh không có dữ liệu (−6.0 dB)");
  const px = E(`(() => { const v = Float32Array.from([2000, 400]); S2OV.mode = "tci"; return Array.from(s2oTo(v, s2oCanBang(), 1, 1)); })()`);
  ok(E("s2oCanBang().join()") === "VV,VH" && px[3] === 255 && px[0] > 150 && px[1] > 100 && px[2] > 50, "S1: ảnh màu VV, VH, VV/VH: " + px.join());
  E(`S2OV.mode = "idx"; S2OV.chi = "s1_rvi"`);
  const pi = E(`Array.from(s2oTo(Float32Array.from([2000, 400]), s2oCanBang(), 1, 1))`);
  ok(pi[3] === 255 && E("s2oCanBang().join()") === "VV,VH" && E("s2oCS().map(c => c.id).join()") === "s1_vv,s1_vh,s1_ti,s1_rvi,s1_hieu", "S1: chỉ số radar tô màu theo thang");
  const A1 = await E(`(async () => { const A = await annualFor(CORE.newPoint("⌖", 106.70, 20.92, {bo: ""}), "s2o"); return {names: A.names, ys: A.ys, don_vi: A.don_vi, canh: A.s2o.canh.length}; })()`);
  ok(A1.names.join() === "VV,VH" && gan(A1.ys[2020][0], -6.99, 0.02) && /dB/.test(A1.don_vi) && A1.canh === 3, `đồ thị theo năm S1 bằng dB: VV ${A1.ys[2020][0].toFixed(2)}, ${A1.canh} cảnh`);
  E(`S2OV.mode = "tci"; select("E0001", false); setYear(2020); label("${ma}")`);
  ok(/^s1:ghep:2020-01-05\+2020-02-10\+2020-03-15/.test(E(`ST.diem.E0001.anh[2020].s`)) || /^s1:ghep:/.test(E(`ST.diem.E0001.anh[2020].s`)), "gán nhãn: ghi ảnh Sentinel-1: " + E(`ST.diem.E0001.anh[2020].s`));

  // ---------- 3. đổi qua lại giữa các nguồn
  d("s2oNguon", "ls"); await sleep(30);
  ok(E("ST.s2o.tao_luc") === taoLS && E("ST.s2oKho.s1.cfg.nguon") === "s1" && E("S2OC.BANG.join()") === "B2,B3,B4,B8,B11,B12" && $("s2oN1").value === "1995",
     "về Landsat: lấy lại kế hoạch Landsat, kế hoạch S1 vẫn giữ");
  d("s2oNguon", "s2"); await sleep(30);
  ok(!E("s2oKH()") && E("S2OC.BANG.length") === 10 && $("s2oN1").options[0].value === "2017" && !an("s2oBo") && an("s2oL7"), "Sentinel-2: chưa có kế hoạch, 10 băng, năm từ 2017");
  d("s2oNguon", "s1"); await sleep(30);
  ok(E("ST.s2o.cfg.nguon") === "s1" && E("s2oNamCo().join()") === "2020", "về Sentinel-1: kế hoạch S1 còn nguyên");

  // ---------- 4. dịch
  E("setLang('ru')"); await sleep(60);
  ok(/Источник снимков/.test($("s2oP").textContent) && /Sentinel-1 онлайн/.test($("s2oP").querySelector(".vg-dau b").textContent), "tiếng Nga: ô nguồn ảnh, tên bảng");
  const miss = E("[...T_MISS]").filter(x => /Landsat|Sentinel-1|radar|dB|SAS|nguồn/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
