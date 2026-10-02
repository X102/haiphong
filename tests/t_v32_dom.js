// Bản 3.2: giá trị tại điểm không còn "Request failed" cho lớp S2 trực tuyến; ô trắng EOX; dải ảnh tự dùng S2 trực tuyến ngoài vùng dữ liệu;
// R-G-B tuỳ chọn, một cảnh theo ngày; đọc từng cảnh tại điểm; đồ thị theo năm có trung vị năm, cảnh thay khi mây, chấm từng cảnh;
// ghi ảnh đã xem khi gán nhãn (CSV, gộp tiến độ). Dữ liệu giả: mk_fx31.py (cảnh A mây phía tây, B bóng mây phía đông, C mây kín, D 2023).
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/s2o/items.json") || !fs.existsSync("/tmp/fx/ref31.json")) execSync("python3 " + __dirname + "/mk_fx31.py");
const REF = JSON.parse(fs.readFileSync("/tmp/fx/ref31.json", "utf8")).ref;
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.2", "bản " + E("VERSION"));
  await until(() => !$("vnW").hidden && E("V27.tinh === '31' && VG.xa && VG.xa.length === 2"), 6000, "hành chính tỉnh 31");

  // ---------- chuẩn bị: vùng gộp Tây + Đông + Xa Bac, kế hoạch cảnh qua STAC giả (như t_v31_dom)
  await E(`(async () => { await xgThem("Xã Tây", "31"); await xgThem("Phường Đông", "31"); await xgThem("Xa Bac", "22"); document.getElementById("xgTen").value = "Vùng thử"; await xgLuu(); })()`);
  E(`window.F0 = window.fetch; window.fetch = async (u, o) => {
    if (String(u) !== S2OC.API) return F0(u, o);
    const b = JSON.parse(o.body), all = await F0("http://127.0.0.1:8765/s2o/items.json").then(r => r.json()), [t0, t1] = b.datetime.split("/");
    const f = all.features.filter(it => b.collections.includes(it.collection) && it.properties.datetime >= t0 && it.properties.datetime <= t1 && it.properties["eo:cloud_cover"] <= b.query["eo:cloud_cover"].lte);
    return {ok: true, status: 200, json: async () => ({type: "FeatureCollection", features: f})}; }`);
  $("bS2O").click(); await sleep(20);
  const d = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change")); };
  d("s2oPV", "gop:" + E("XG.id")); d("s2oT1", "11"); d("s2oT2", "4"); d("s2oN1", "2023"); d("s2oN2", "2024"); d("s2oSo", "2");
  $("s2oTim").click(); await until(() => /xong|lỗi/.test($("s2oTT").textContent), 30000, "tìm cảnh");
  ok(/xong: 2 năm có ảnh/.test($("s2oTT").textContent) && E("ST.s2o.nam[2024].chon.slice().sort().join()") === "A,B", "kế hoạch cảnh: 2023 (D), 2024 (A, B)");
  $("s2oDong").click(); E("setYear(2024)");

  // ---------- 1. giá trị tại điểm không còn dòng lỗi của lớp S2 trực tuyến
  const rows = await E(`giaTriTai(L.latLng(20.92, 106.65))`);
  ok(!rows.some(r => /không đọc được/.test(r[1])) && rows.some(r => /S2 trực tuyến 2024/.test(r[0])), "giá trị tại điểm: chỉ còn dòng S2 trực tuyến có nút đọc, không còn 'Request failed'");

  // ---------- 2. ô trắng EOX, dải ảnh ngoài vùng dữ liệu
  const trang = E(`(() => { const mk = v => ({width: 2, height: 2, getContext: () => ({getImageData: () => ({data: new Uint8ClampedArray(16).fill(v)})})});
    const pha = {width: 2, height: 2, getContext: () => ({getImageData: () => ({data: Uint8ClampedArray.from([255,255,255,255, 30,60,40,255, 255,255,255,255, 255,255,255,255])})})};
    return [v27Trang(mk(255)), v27Trang(mk(120)), v27Trang(pha)].join(); })()`);
  ok(trang === "true,false,false", "nhận ra ô EOX trắng (không có ảnh năm đó), không nhầm ô có ảnh");
  E(`$("selStrip").value = "s2d"; PROBE = CORE.newPoint("⌖", 106.75, 20.94, {bo: ""}); renderStrip()`);
  await until(() => /Sentinel-2 trực tuyến/.test($("stripmsg").textContent), 6000, "dải ảnh S2 trực tuyến");
  await until(() => E(`$("strip").querySelectorAll(".it").length`) >= 3, 4000, "các năm");
  ok(E(`[...$("strip").querySelectorAll(".it .lb")].map(e => e.textContent).join()`) === "2023,2024,2025",
     "điểm ngoài vùng dữ liệu sẵn nhưng trong vùng kế hoạch: dải ảnh tự dùng S2 trực tuyến thay vì EOX");
  await sleep(1500);
  E(`window.SOVE = 0; const _v = s2oVe; s2oVe = function () { SOVE++; return _v.apply(this, arguments); }; window._vGoc = _v; renderStrip()`);
  await until(() => E(`$("strip").querySelectorAll(".it").length`) >= 3, 4000, "vẽ lại dải");
  await sleep(300);
  ok(E("SOVE") === 0, "vẽ lại dải ảnh (vd. sau khi gán nhãn, sang năm khác): dùng lại ô đã vẽ, không đọc lại ảnh (" + E("SOVE") + " lần đọc)");
  E(`s2oVe = window._vGoc`);
  E(`PROBE = CORE.newPoint("⌖", 105.0, 22.0, {bo: ""})`);
  ok((await E(`v27Nguon(PROBE)`)).ng === "eox", "điểm ngoài cả vùng kế hoạch: vẫn dùng EOX");

  // ---------- 3. R-G-B tuỳ chọn, một cảnh theo ngày
  const ve = (lon, lat) => E(`(async () => { const m = S2OC.ll2m(${lon}, ${lat}); const px = await s2oVe(2024, [m[0] - 5, m[1] - 5, m[0] + 5, m[1] + 5], 1, 1, null); return px ? Array.from(px) : null; })()`);
  E(`S2OV.mode = "rgb"; S2OV.pre = "tu"; S2OV.r = "B11"; S2OV.g = "B8"; S2OV.b = "B2"; S2OV.gain = 1; S2OV.nguon = "ghep"`);
  const st = (v, k) => Math.round(255 * Math.max(0, Math.min(1, (v - k[0]) / (k[1] - k[0]))));
  const kk = E("S2O.keo"), rgb = await ve(106.65, 20.92);
  ok(E("s2oCanBang().join()") === "B11,B8,B2" && rgb.join() === [st(REF.B11, kk.B11), st(REF.B8, kk.B8), st(REF.B2, kk.B2), 255].join(), "R-G-B tuỳ chọn B11-B8-B2: " + rgb.join());
  E(`S2OV.mode = "tci"; S2OV.nguon = "canh"; S2OV.canh = {}`);
  ok(E("s2oMotCanh(2024).id") === E("ST.s2o.nam[2024].chon[0]"), "một cảnh, chưa chọn ngày: lấy cảnh đã ghép quang đãng nhất");
  E(`S2OV.canh[2024] = "B"`); const tB = await ve(106.57, 20.92);
  E(`S2OV.canh[2024] = "A"`); const tA = await ve(106.57, 20.92), tA2 = await ve(106.65, 20.92);
  ok(tB.join() === "44,66,88,255" && tA.join() === "250,250,250,255" && tA2.join() === "40,60,80,255", "một cảnh: đúng ảnh của ngày chọn, không che mây (A phía tây là mây)");
  E(`OVL.s2o.on = true; buildOverlays()`);
  const opts = E(`[...document.querySelectorAll("[data-s2ov] [data-k=canh] option")].map(o => o.textContent.slice(0, 10)).join()`);
  ok(opts === "2023-12-05,2024-01-10,2024-02-15" && /★/.test(E(`document.querySelector("[data-s2ov] [data-k=canh] option[value=A]").textContent`)), "lớp: danh sách cảnh của năm theo ngày, đánh dấu cảnh đã ghép: " + opts);
  E(`S2OV.nguon = "ghep"`);

  // ---------- 4. giá trị tại điểm theo cảnh
  const h = await E(`s2oDiemHTML(106.57, 20.92, 2024)`);
  ok(/trung vị 1 cảnh quang đãng/.test(h) && /2024-01-10[^·]*✗ mây dày/.test(h) && /2024-02-15[^·]*✓/.test(h) && /B4 600/.test(h), "giá trị tại điểm phía tây: A mây dày ✗, B quang đãng ✓, trung vị 1 cảnh, B4 600");

  // ---------- 5. đồ thị theo năm và theo cảnh
  const giua = await E(`(async () => { const A = await annualFor(CORE.newPoint("⌖", 106.65, 20.92, {bo: ""}), "s2oidx"); return {names: A.names, ys: A.ys, canh: A.s2o.canh.map(c => c.ngay + ":" + (c.quang ? 1 : 0)).sort().join(), thay: A.s2o.thay, px: A.s2o.px, an: CVS.an.s2oidx}; })()`);
  const iN = giua.names.indexOf("NDVI");
  ok(iN >= 0 && gan(giua.ys[2024][iN], (REF.B8 - REF.B4) / (REF.B8 + REF.B4), 1e-4) && gan(giua.ys[2023][iN], (2000 - 900) / (2000 + 900), 1e-4) && giua.px === 20,
     `NDVI theo năm tại điểm (20 m): 2023 ${giua.ys[2023][iN].toFixed(3)}, 2024 ${giua.ys[2024][iN].toFixed(3)}`);
  ok(giua.canh === "2023-01-20:1,2024-01-10:1,2024-02-15:1" && !Object.keys(giua.thay).length, "chấm từng cảnh: D, A, B quang đãng tại điểm giữa");
  ok(giua.an.length === giua.names.length - 1 && !giua.an.includes(giua.names[0]), "mặc định chỉ hiện (và đọc) đường đầu tiên");
  E(`ST.s2o.nam[2024].chon = ["A"]`);
  const tay = await E(`(async () => { const A = await annualFor(CORE.newPoint("⌖", 106.57, 20.92, {bo: ""}), "s2oidx"); return {ys: A.ys, thay: A.s2o.thay, canh: A.s2o.canh.map(c => c.ngay + ":" + (c.quang ? 1 : 0) + (c.chon ? "c" : "")).join()}; })()`);
  ok(tay.thay[2024] === "2024-02-15" && gan(tay.ys[2024][iN], (REF.B8 - REF.B4) / (REF.B8 + REF.B4), 1e-4) && /2024-01-10:0c/.test(tay.canh) && /2024-02-15:1/.test(tay.canh),
     "cảnh đã ghép (A) mây tại điểm: năm 2024 vẫn có giá trị, thay bằng cảnh ứng viên B quang đãng: " + tay.canh);
  E(`S2OV.tatCa = true`);
  const tc = await E(`(async () => { const A = await annualFor(CORE.newPoint("⌖", 106.57, 20.92, {bo: ""}), "s2oidx"); return A.s2o.canh.filter(c => c.y === 2024).map(c => c.ngay + ":" + (c.quang ? 1 : 0)).sort().join(); })()`);
  ok(tc === "2023-12-05:0,2024-01-10:0,2024-02-15:1", "đọc cả cảnh ứng viên: C mây kín cũng hiện (×)");
  E(`S2OV.tatCa = false; ST.s2o.nam[2024].chon = ["A", "B"]`);
  // vẽ trong khung đồ thị
  E(`PROBE = CORE.newPoint("⌖", 106.75, 20.94, {bo: ""}); CVS.kind = "ky"; renderCurve()`);
  await until(() => !!$("curve").querySelector("[data-s2ocv]"), 6000, "nút sang chuỗi S2");
  $("curve").querySelector("[data-s2ocv]").click();
  await until(() => !!$("curve").querySelector("svg"), 15000, "đồ thị S2 theo năm");
  const svg = $("curve").querySelector("svg");
  ok(E("CVS.kind") === "nam" && E("CVS.grp") === "s2oidx" && svg.querySelectorAll("circle").length >= 5 && /Chấm nhỏ: từng cảnh/.test($("curve").textContent),
     `điểm chỉ có ảnh S2 trực tuyến: nút sang đồ thị theo năm, ${svg.querySelectorAll("circle").length} chấm (năm và từng cảnh)`);
  const nb = blobs.length; $("curve").querySelector("[data-s2ocsv]").click(); await sleep(20);
  const csv = (await docBlob(blobs[nb])).trim().split("\n");
  ok(/^nam,ngay,canh,da_ghep,quang_dang,scl,/.test(csv[0]) && csv.length === 4 && csv.some(l => /^2024,2024-02-15,B,1,1,5,/.test(l)), "CSV từng cảnh tại điểm: " + csv.length + " dòng");

  // ---------- 6. ghi ảnh đã xem khi gán nhãn
  E(`PROBE = null; select("E0001", false); setYear(2024); OVL.s2o.on = true; refreshOverlays()`);
  const ma = E("SCHEME.lop[0].ma");
  E(`label("${ma}")`);
  const a1 = E(`ST.diem.E0001.anh[2024]`);
  ok(a1 && a1.s2o && a1.s2o.kieu === "ghep" && a1.s2o.canh.slice().sort().join() === "A,B" && /^s2o:ghep:/.test(a1.s) && /wayback:/.test(a1.s) && a1.lop.includes("s2o"),
     "gán nhãn 2024: ghi cảnh đã ghép, ảnh nền Wayback, lớp đang bật: " + a1.s);
  await until(() => E(`ST.diem.E0001.anh[2024].s2o.quang.every(v => v === 0 || v === 1)`), 6000, "bổ sung quang đãng");
  ok(true, "đọc SCL tại điểm, ghi quang đãng hay mây cho từng cảnh: " + E(`ST.diem.E0001.anh[2024].s`));
  ok(E(`[...$("ytab").rows[0].cells].pop().textContent`) === "ảnh đã xem khi gán" && /s2o:ghep/.test($("ytab").textContent), "bảng các năm của điểm có cột ảnh đã xem");
  E(`setYear(2023); S2OV.nguon = "canh"; S2OV.canh[2023] = "D"; label("${ma}")`);
  ok(E(`ST.diem.E0001.anh[2023].s2o.kieu`) === "canh" && E(`ST.diem.E0001.anh[2023].s2o.ngay.join()`) === "2023-01-20", "gán trên một cảnh: ghi đúng cảnh, đúng ngày");
  E(`S2OV.nguon = "ghep"`);
  const rowsL = E(`CORE.exportLong(allPts(), allYears(), IDX).filter(r => r.id === "E0001")`);
  ok(rowsL.find(r => r.nam === 2024).anh === E(`ST.diem.E0001.anh[2024].s`) && /s2o:canh:2023-01-20/.test(rowsL.find(r => r.nam === 2023).anh), "CSV dạng dài có cột anh");
  const wide = E(`CORE.exportWide([ST.diem.E0001], [2023, 2024], IDX)[0]`);
  ok(/s2o:canh/.test(wide.anh_2023) && /s2o:ghep/.test(wide.anh_2024), "CSV dạng rộng có cột anh_năm");
  const gop = E(`(() => { const a = {X: CORE.newPoint("X", 106.6, 20.9, {bo: "b"})}, b = {X: JSON.parse(JSON.stringify(ST.diem.E0001))}; b.X.id = "X"; CORE.merge(a, b); return a.X.anh && a.X.anh[2024] ? a.X.anh[2024].s : ""; })()`);
  ok(gop === E(`ST.diem.E0001.anh[2024].s`), "gộp tiến độ: ảnh đã xem đi cùng nhãn");
  E(`setYear(2024); label(null)`);
  ok(!E(`ST.diem.E0001.anh[2024]`) && !E(`ST.diem.E0001.nhan[2024]`), "xoá nhãn: xoá luôn ảnh đã xem");

  // ---------- 7. dịch
  E("setLang('ru')"); await sleep(60);
  E(`buildOverlays()`);
  const lop = w.document.querySelector("[data-s2ov]").textContent;
  ok(/медианный композит выбранных сцен|одна сцена/.test(lop) && /график по пикселю 10 м/.test(lop), "tiếng Nga: điều khiển mới của lớp");
  const miss = E("[...T_MISS]").filter(x => /cảnh|ảnh|mây|đồ thị|trung vị|EOX|S2 trực tuyến|ứng viên/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
