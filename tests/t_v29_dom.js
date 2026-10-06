// Bản 2.9 phần A: lỗi "Cannot read properties of undefined (reading 'offset')" khi phát hiện thay đổi cả tỉnh.
// Nguyên nhân: geotiff.js 2.1.3 (BlockedSource.readSliceData) lấy khối thứ floor(top / blockSize) khi một lát cắt kết thúc
// đúng ranh giới khối 64 KiB -> khối chưa tải -> undefined.offset. Vá theo từng tệp (vaGeoTIFF); đọc cửa sổ lớn theo dải;
// lưới thô (cả tỉnh) đọc PC từ lớp xám có overview.
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/pcx/pc3_2025.tif") || !fs.existsSync("/tmp/fx/x29.jpg")) execSync("python3 " + __dirname + "/mk_fx29.py");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("2.9", undefined, {numeric: true}) >= 0, "bản 2.9: " + E("VERSION"));

  // ---------- A1. lát cắt kết thúc đúng ranh giới khối: có vá thì đúng từng byte, không vá thì lỗi 'offset'
  const URL_ = "http://127.0.0.1:8765/s2d/s2d_2025.tif";
  const A1 = await E(`(async () => {
    const url = ${JSON.stringify(URL_)}, t = await tiffOf(url, true), S = t.source, bs = S.blockSize, fsz = S.fileSize, out = [];
    const cases = [[0, bs], [100, bs - 100], [bs - 10, 20], [3 * bs, 2 * bs], [5, 7 * bs - 5], [fsz - 1000, 1000]];
    for (const [o, l] of cases) {
      const a = new Uint8Array((await S.fetch([{offset: o, length: l}]))[0]);
      const r = await fetch(url, {headers: {Range: "bytes=" + o + "-" + (o + l - 1)}}), b = new Uint8Array(await r.arrayBuffer());
      out.push(a.length === b.length && a.every((v, i) => v === b[i]));
    }
    let loi = ""; const t0 = await GeoTIFF.fromUrl(url, {allowFullFile: false});
    try { await t0.source.fetch([{offset: 0, length: t0.source.blockSize}]); } catch (e) { loi = e.message; }
    return {out, loi, va: !!S._va29, bs};
  })()`);
  ok(A1.va && A1.out.length === 6 && A1.out.every(Boolean), `đã vá: 6 lát cắt (có lát kết thúc đúng ranh giới khối ${A1.bs} B) trùng từng byte với yêu cầu HTTP Range`);
  ok(/offset/.test(A1.loi), "đối chứng: thư viện chưa vá báo đúng lỗi của anh: " + A1.loi);

  // ---------- A2. đọc cửa sổ lớn theo dải = đọc một lần; trần kích thước báo lỗi dễ hiểu
  const A2 = await E(`(async () => {
    const t = await tiffOf(${JSON.stringify(URL_)}, true), im = t._imgs[0].im, W = im.getWidth(), H = im.getHeight(), win = [7, 3, W - 5, H - 2];
    const a = await im.readRasters({window: win, samples: [0, 6], interleave: true});
    DOC_DAI_PX = 1e5; const b = await docCua(im, win, [0, 6]); DOC_DAI_PX = 4e6;
    DOC_MAX_PX = 1e5; let loi = ""; try { await docCua(im, win, [0, 6]); } catch (e) { loi = e.message; } DOC_MAX_PX = 60e6;
    return {n: a.length, same: a.length === b.length && a.every((v, i) => v === b[i]), loi};
  })()`);
  ok(A2.same && A2.n > 3e6, `đọc theo dải (theo chiều cao ô) trùng đọc một lần: ${A2.n} giá trị`);
  ok(/quá lớn/.test(A2.loi), "cửa sổ vượt trần: báo 'vùng đọc quá lớn', không treo trình duyệt");

  // ---------- A3. lưới thô: PC đọc từ lớp xám 8 bit có overview; giải mã khớp PC gốc (PC trơn theo không gian, mk_fx29.py)
  E(`(() => { MAN._pc0 = MAN.pc; MAN.pc = Object.assign({}, MAN.pc, {duong_dan: "pcx/pcs_{y}.tif"}); MAN._ly0 = MAN.layers.slice();
    MAN.layers = MAN.layers.filter(l => !/^pc\\d+$/.test(l.id)).concat([1, 2, 3].map(q => ({id: "pc" + q, ten: "PC" + q, kieu: "xam", bang_mau_lien_tuc: "rdbu", duong_dan: "pcx/pc" + q + "_{y}.tif", nam: [2025], keo_gian: [-300, 300]}))); })()`);
  const A3 = await E(`(async () => {
    const a = CORE.to3857(...CORE.toLL(661000, 2318500)), c = CORE.to3857(...CORE.toLL(674000, 2309500)), bb = [a[0], c[1], c[0], a[1]];
    const gTho = CORE.gridFor(bb, 200, {x0: 0, y1: 0, res0: 10}), gMin = CORE.gridFor(bb, 900, {x0: 0, y1: 0, res0: 10});
    const goc = cdPCXam(gMin, 2025), X = await cdPCXam(gTho, 2025);
    const kg = MAN.layers.find(l => l.id === "pc1"); kg.keo_gian = undefined; const G = await cdDocPC(gTho, 2025); kg.keo_gian = [-300, 300];
    let n = 0, s = 0, mx = 0; for (let q = 0; q < 3; q++) for (let i = 0; i < X[q].length; i++) { if (!isFinite(X[q][i]) || !isFinite(G[q][i])) continue; const d = Math.abs(X[q][i] - G[q][i]); n++; s += d; mx = Math.max(mx, d); }
    return {res: gTho.res, resMin: gMin.res, gocNull: goc === null, n, tb: s / n, mx, k: X.length};
  })()`);
  E("MAN.pc = MAN._pc0; MAN.layers = MAN._ly0");
  ok(A3.gocNull, `lưới mịn (${A3.resMin.toFixed(1)} m) vẫn đọc PC gốc`);
  ok(A3.k === 3 && A3.n > 1000, `lưới thô (${A3.res.toFixed(0)} m): đọc 3 lớp xám PC, ${A3.n} giá trị so được`);
  ok(A3.tb < 0.06, `giải mã 8 bit khớp PC gốc: sai khác trung bình ${A3.tb.toFixed(3)}, lớn nhất ${A3.mx.toFixed(2)} (PC trong khoảng ±2.5; bước lượng tử 6/254 = 0.024)`);

  // ---------- A4. phát hiện thay đổi, phạm vi cả tỉnh, đủ bốn nhóm đặc trưng, chuẩn hoá tương đối (như ảnh chụp của anh)
  $("vnTinh").value = "31"; $("vnTinh").onchange(); await until(() => E("V27.tinh === '31' && VG.xa.length === 2"), 5000, "tỉnh thử");
  E("cdMo(true)"); await sleep(200);
  $("cdPV").value = "tinh"; $("cdPV").onchange && $("cdPV").onchange(); if ($("cdPP")) $("cdPP").value = "cva";
  $("cdNguong").value = "otsu"; $("cdPL").value = "sobo"; $("cdChuan").checked = true;
  w.document.querySelectorAll('#cdP [data-cd]').forEach(c => { c.checked = true; });
  $("cdChay").click();
  await until(() => /xong|lỗi/.test($("cdTrang").textContent), 60000, "thay đổi cả tỉnh");
  ok(/xong/.test($("cdTrang").textContent) && E("CD.kq && CD.kq.tong > 0"), "phát hiện thay đổi cả tỉnh, đủ S2 + chỉ số + PC + embedding: chạy xong (" + $("cdTrang").textContent.slice(0, 120) + ")");

  // ---------- B. xuất bản đồ: chọn nội dung, quản lý lớp, chú giải kèm diện tích, GeoTIFF, PDF có toạ độ, world file
  const JPG = Array.from(fs.readFileSync("/tmp/fx/x29.jpg"));
  E(`HTMLCanvasElement.prototype.toBlob = function (cb, t) { cb(new Blob([new Uint8Array(${JSON.stringify(JPG)})], {type: t})); }`);
  const doiV = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change")); $(id).dispatchEvent(new w.Event("input")); };
  const tai = async b => new Uint8Array(await new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsArrayBuffer(b); }));
  $("selBase").value = "none"; $("selBase").dispatchEvent(new w.Event("change")); await sleep(50);   // jsdom không tải được ô ảnh nền từ Internet
  $("bXB").click(); await sleep(50);
  const ND = [...$("xbND").options].map(o => o.value);
  ok($("dlgXB").open && ND[0] === "man" && ND.includes("cd") && ND.includes("ovl:lulc_ctx"), "chọn bản đồ cần xuất: như màn hình, kết quả thay đổi, từng lớp dữ liệu (" + ND.length + " lựa chọn)");
  doiV("xbND", "cd"); await sleep(20);
  const L1 = E("XB.lop.filter(s => s.on).map(s => s.k)");
  ok(L1.includes("cd") && !L1.some(k => /^ovl:|^pl$|^tk$|^diem$/.test(k)) && $("xbPham").value === "kq", `chọn "thay đổi": chỉ bật kết quả thay đổi (+ nền, ranh giới đang hiện), khung vừa phạm vi kết quả: ${L1.join(", ")}`);
  const rows = [...$("xbLop").querySelectorAll(".xbR")];
  ok(rows.length === E("XB.lop.length") && rows.every(r => r.querySelector("[data-op]") && r.querySelector("[data-len]")) && rows.some(r => r.querySelector("[data-md]")) && rows.some(r => r.querySelector("[data-nam]")),
     `bảng quản lý lớp: ${rows.length} lớp, mỗi lớp có bật tắt, độ đục, lên xuống; kết quả chọn cách xem, lớp dữ liệu chọn năm`);
  // chú giải kèm diện tích: khung vừa kết quả -> diện tích từng loại = đúng số của bảng kết quả
  doiV("xbCGSo", "ha_pct"); doiV("xbDD", "jpg"); $("xbWF").checked = true; doiV("xbKho", "c2");
  const VE = [];
  E("window._vc0 = xbVeCanvas; xbVeCanvas = function () { window._VC = (window._VC || 0) + 1; return _vc0.apply(this, arguments); }");
  let nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent), 20000, "xuất JPEG + world file");
  ok(/đã xuất .*\.zip/.test($("xbTT").textContent) && E("window._VC") === 1, "xuất JPEG kèm tệp toạ độ thành ZIP; chỉ vẽ đúng một ảnh kết quả (" + $("xbTT").textContent.slice(0, 90) + ")");
  const CG = E("(() => { const o = Object.assign({}, XB.o); return null; })()");
  const R1 = await E(`(async () => { const o = Object.assign({}, xbDoc(), {dpi: 60}); const R = await xbVe(o); const g = R.CG.find(q => q.k === "cd");
    return {muc: g.muc.map(m => [m.ten, m.ha]), tong: g.tong, dt: CD.kq.ten_loai.map((t, k) => [t, CD.kq.dt[k]]).filter(q => q[1] > 0), T: CD.kq.tong, E: R.E, F: R.F, W: R.W, H: R.H}; })()`);
  const lech = Math.max(...R1.muc.map(([t, h]) => Math.abs(h - (R1.dt.find(q => q[0] === t) || [0, NaN])[1])));
  ok(R1.muc.length === R1.dt.length && lech < 1e-6 && Math.abs(R1.tong - R1.T) < 1e-6, `diện tích trong chú giải = bảng kết quả (${R1.muc.map(([t, h]) => t + " " + h.toFixed(2)).join("; ")}; tổng ${R1.tong.toFixed(1)} ha)`);
  const zipB = await tai(blobs[nb]); fs.writeFileSync("/tmp/xb29.zip", zipB);
  const Z = JSON.parse(execSync(`python3 -c "
import zipfile, json, rasterio, os
z = zipfile.ZipFile('/tmp/xb29.zip'); n = z.namelist(); d = '/tmp/xb29z'; os.makedirs(d, exist_ok=True); z.extractall(d)
j = [f for f in n if f.endswith('.jpg')][0]
with rasterio.open(os.path.join(d, j)) as r: print(json.dumps({'ten': n, 'crs': str(r.crs), 't': list(r.transform)[:6], 'loi': z.testzip()}))"`).toString());
  ok(Z.loi === null && Z.ten.some(f => /\.jgw$/.test(f)) && Z.ten.some(f => /\.prj$/.test(f)) && Z.ten.some(f => /\.jpg\.aux\.xml$/.test(f)) && Z.crs === "EPSG:3857",
     "ZIP: ảnh + .jgw + .prj + .aux.xml; GDAL đọc ra EPSG:3857: " + Z.ten.join(", "));
  // GeoTIFF khung bản đồ
  doiV("xbDD", "tif"); nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent) && blobs.length > nb, 20000, "GeoTIFF");
  fs.writeFileSync("/tmp/xb29.tif", await tai(blobs[nb]));
  const Rt = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {chiKhung: true})); return {E: R.E, W: R.W, H: R.H}; })()`);
  const G = JSON.parse(execSync(`python3 -c "
import rasterio, json
with rasterio.open('/tmp/xb29.tif') as r: print(json.dumps({'crs': str(r.crs), 't': list(r.transform)[:6], 'w': r.width, 'h': r.height, 'n': r.count, 'ci': [c.name for c in r.colorinterp]}))"`).toString());
  ok(G.crs === "EPSG:3857" && G.n === 4 && G.ci.join() === "red,green,blue,alpha" && G.w === Rt.W && G.h === Rt.H && Math.abs(G.t[2] - Rt.E.x0) < 1e-3 && Math.abs(G.t[5] - Rt.E.y1) < 1e-3 && Math.abs(G.t[0] - Rt.E.r) < 1e-9,
     `GeoTIFF khung bản đồ: ${G.w} × ${G.h}, RGBA, EPSG:3857, gốc (${G.t[2].toFixed(1)}, ${G.t[5].toFixed(1)}), điểm ảnh ${G.t[0].toFixed(2)} m`);
  // PDF có toạ độ
  doiV("xbDD", "pdf"); nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent) && blobs.length > nb, 20000, "PDF");
  fs.writeFileSync("/tmp/xb29.pdf", await tai(blobs[nb]));
  const Rp = await E(`(async () => { const R = await xbVe(xbDoc()); return {E: R.E, F: R.F, W: R.W, H: R.H, dpi: XB.o.dpi}; })()`);
  const P = JSON.parse(execSync("python3 " + __dirname + "/kiem_geopdf.py /tmp/xb29.pdf").toString()), kp = 72 / Rp.dpi;
  ok(P.epsg === 3857 && P.chu_nhat && Math.abs(P.X[0] - Rp.E.x0) < 0.05 && Math.abs(P.X[1] - Rp.E.x1) < 0.05 && Math.abs(P.Y[0] - Rp.E.y0) < 0.05 && Math.abs(P.Y[1] - Rp.E.y1) < 0.05 &&
     Math.abs(P.bbox_pt[0] - Rp.F.x * kp) < 1e-3 && Math.abs(P.trang_pt[0] - Rp.W * kp) < 0.01, `PDF có toạ độ: khung ${P.bbox_pt.map(v => v.toFixed(1)).join(", ")} pt ↔ EPSG:3857 x ${P.X.map(v => v.toFixed(1)).join(" .. ")}, y ${P.Y.map(v => v.toFixed(1)).join(" .. ")} (đúng khung dựng)`);
  // quản lý lớp: tắt kết quả, bật lớp dữ liệu, đổi thứ tự; độc lập với bản đồ đang xem
  const hien0 = E("map.hasLayer(CD.hien)");
  doiV("xbND", "ovl:lulc_ctx"); await sleep(20);
  const L2 = E("XB.lop.filter(s => s.on).map(s => s.k)");
  ok(L2.includes("ovl:lulc_ctx") && !L2.includes("cd") && E("map.hasLayer(CD.hien)") === hien0, "chọn một lớp dữ liệu: chỉ bật lớp đó, bản đồ đang xem không đổi");
  const iL = E("XB.lop.findIndex(s => s.k === 'ovl:lulc_ctx')"); $("xbLop").querySelector(`.xbR[data-i="${iL}"] [data-len]`).click();
  ok(E("XB.lop.findIndex(s => s.k === 'ovl:lulc_ctx')") === iL + 1 || iL === E("XB.lop.length") - 1, "nút ▲ đưa lớp lên trên một bậc");
  const R2 = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {dpi: 60})); const g = R.CG.find(q => q.k === "ovl:lulc_ctx"); return g ? {muc: g.muc.map(m => [m.ten, m.ha]), tong: g.tong} : null; })()`);
  ok(R2 && R2.tong > 100 && Math.abs(R2.muc.reduce((s, m) => s + m[1], 0) - R2.tong) < 1e-6, `lớp dữ liệu dạng lớp: diện tích từng lớp đọc từ COG trong khung (${R2 && R2.muc.map(([t, h]) => t + " " + h.toFixed(0)).join("; ")} ha)`);
  // cắt theo ranh giới tỉnh: diện tích nhỏ hơn cả khung, ghi chú ghi "trong ranh giới"
  doiV("xbPham", "tinh"); ok(!$("xbCat").disabled, "khung cả tỉnh: cho cắt theo ranh giới"); $("xbCat").checked = true; doiV("xbCGSo", "ha");
  const R3 = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {dpi: 60})); const g = R.CG.find(q => q.k === "ovl:lulc_ctx"); return {tong: g.tong, ghi: xbGhiCG(g, "ha", "X")}; })()`);
  const R3b = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {dpi: 60, cat: false})); const g = R.CG.find(q => q.k === "ovl:lulc_ctx"); return g.tong; })()`);
  ok(R3.tong > 0 && R3.tong < R3b && /ranh giới X/.test(R3.ghi), `cắt theo ranh giới tỉnh: ${R3.tong.toFixed(0)} ha trong ranh giới < ${R3b.toFixed(0)} ha cả khung; ghi chú nói rõ phạm vi đếm`);
  $("xbCat").checked = false; doiV("xbND", "man"); doiV("xbCGSo", "khong"); doiV("xbDD", "jpg"); $("xbWF").checked = false; $("xbDong").click();
  E("xbVeCanvas = _vc0");

  // ---------- C. chọn vùng: xuất HTML, GeoTIFF, GeoJSON, bản đồ cho vùng đang chọn và vùng đã lưu
  const RV = require("/tmp/fx/ref_vung.json");
  E("setYear(2025)"); E("vgBat(true)"); await sleep(100);
  await until(() => E("VG.xa && VG.xa.length") === 2, 5000, "ranh giới xã");
  $("vgPV").value = "xa"; $("vgPV").onchange && $("vgPV").onchange();
  E(`map.fire("click", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}), originalEvent: {shiftKey: false}})`);
  await until(() => E("VG.res && VG.res.st && VG.res.st.n_px > 0"), 10000, "vùng chọn");
  const ST0 = E("({ha: VG.res.st.dien_tich_ha, n: VG.res.st.n_manh})");
  nb = blobs.length; w.document.querySelector('#vgXuatW [data-vx="html"]').click(); await until(() => blobs.length > nb, 30000, "HTML vùng");
  const hv = await (async b => new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsText(b); }))(blobs[nb]);
  ok(/<title>Vùng chọn:/.test(hv) && /<img class="bd2" src="data:image\/png;base64,/.test(hv) && /<h2>Theo xã<\/h2>/.test(hv) && hv.includes(ST0.ha.toFixed(2)),
     `HTML vùng đang chọn: thông số, bản đồ đầy đủ, theo xã, diện tích ${ST0.ha.toFixed(2)} ha`);
  nb = blobs.length; w.document.querySelector('#vgXuatW [data-vx="geo"]').click(); await sleep(50);
  const gv = JSON.parse(await (async b => new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsText(b); }))(blobs[nb]));
  ok(gv.features.length === 1 && /Polygon/.test(gv.features[0].geometry.type) && Math.abs(gv.features[0].properties.dien_tich_ha - ST0.ha) < 1e-3 && gv.features[0].properties.nam === 2025,
     "GeoJSON vùng đang chọn: một đối tượng, đủ thuộc tính (lớp, năm, diện tích, thống kê)");
  nb = blobs.length; w.document.querySelector('#vgXuatW [data-vx="tif"]').click(); await until(() => blobs.length >= nb + 2, 10000, "GeoTIFF vùng + qml");
  fs.writeFileSync("/tmp/vg29.tif", await tai(blobs[nb]));
  const TV = JSON.parse(execSync(`python3 -c "
import rasterio, json, numpy as np, math
with rasterio.open('/tmp/vg29.tif') as r:
    a = r.read(1); t = r.transform; rows = np.arange(r.height)
    y = t[5] + (rows + 0.5) * t[4]; lat = np.degrees(2 * np.arctan(np.exp(y / 6378137)) - math.pi / 2)
    ha = float(((a == 1).sum(axis=1) * (t[0] * np.cos(np.radians(lat))) ** 2).sum() / 1e4)
    print(json.dumps({'crs': str(r.crs), 'gt': sorted(set(np.unique(a).tolist())), 'nd': r.nodata, 'ha': ha}))"`).toString());
  ok(TV.crs === "EPSG:3857" && TV.gt.join() === "1,255" && TV.nd === 255 && Math.abs(TV.ha - ST0.ha) / ST0.ha < 0.1,
     `GeoTIFF mặt nạ vùng: 1 = vùng, 255 = nodata, diện tích đếm lại ${TV.ha.toFixed(2)} ha (vùng ${ST0.ha.toFixed(2)} ha)`);
  w.document.querySelector('#vgXuatW [data-vx="bd"]').click(); await sleep(50);
  ok($("dlgXB").open && $("xbND").value === "vgx" && $("xbPham").value === "them" && $("xbCat").checked && E("XB.lop.find(s => s.k === 'vgx').on"),
     "Bản đồ… của vùng: hộp thoại xuất mở sẵn lớp vùng, khung theo vùng, cắt dữ liệu theo ranh giới " + JSON.stringify([$("dlgXB").open, $("xbND").value, $("xbPham").value, $("xbCat").checked, E("(XB.lop.find(s => s.k === 'vgx') || {}).on")]));
  $("xbWF").checked = false; doiV("xbDD", "png"); nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent) && blobs.length > nb, 20000, "ảnh vùng");
  ok(blobs[nb] && blobs[nb].type === "image/png", "xuất ảnh bản đồ của vùng: " + $("xbTT").textContent.slice(0, 70));
  $("xbDong").click(); doiV("xbDD", "jpg");
  $("bXB").click(); await sleep(30); ok(!E("XB.them") && ![...$("xbND").options].some(o => o.value === "vgx"), "mở lại từ nút chính: không còn lớp vùng tạm"); $("xbDong").click();
  // lưu vùng rồi xuất từ danh sách vùng đã lưu
  await E("vgLuu()"); await sleep(100);
  const idV = E("Object.keys(ST.vung).pop()"), sel = w.document.querySelector(`#vgDS [data-v="${idV}"] select[data-vx]`);
  ok(!!sel && sel.options.length === 5, "danh sách vùng đã lưu: mỗi vùng có ô chọn xuất (HTML, GeoTIFF, GeoJSON, bản đồ)");
  nb = blobs.length; sel.value = "geo"; sel.onchange(); await sleep(50);
  const gs = JSON.parse(await (async b => new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsText(b); }))(blobs[nb]));
  ok(gs.features.length === 1 && gs.features[0].properties.id === idV && sel.value === "", "GeoJSON một vùng đã lưu, mã vùng đúng");

  // ---------- D. biểu đồ SVG, dải ảnh PNG
  const svgEl = w.document.querySelector("#cdBD svg");
  nb = blobs.length; const S = E(`v29BDSVG(document.querySelector("#cdBD svg"))`);
  const sv = await (async b => new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsText(b); }))(blobs[nb]);
  ok(svgEl && /^<\?xml/.test(sv) && /xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(sv) && /<rect[^>]*fill="#fff"/.test(sv) && S.W > 0, "biểu đồ thành SVG độc lập (xmlns, cỡ, nền trắng)");
  E("ST.bo = 'E0'; buildSetSelect(); select('E0001', false)"); await until(() => w.document.querySelectorAll("#strip .it canvas").length >= 2, 8000, "dải ảnh");
  nb = blobs.length; await E("v29DaiPNG()");
  ok(blobs.length > nb && blobs[nb].type === "image/png", "dải ảnh theo năm thành một ảnh PNG");

  // ---------- E. gộp nhiều tệp tiến độ
  const goc = E("JSON.parse(JSON.stringify(phienXuat()))");
  const tep = (ten, sua) => { const j = JSON.parse(JSON.stringify(goc)); sua(j.st.diem, j); return new w.File([JSON.stringify(j)], ten, {type: "application/json"}); };
  E("Object.values(ST.diem).filter(p => p.bo === 'E0').forEach(p => { p.nhan = {}; p.tg = {}; p.tin = {}; })");
  const fA = tep("nguoi_A.json", D => { D.E0001.nhan = {2023: "T1"}; D.E0001.tg = {2023: 1000}; D.E0002.nhan = {2024: "N1"}; D.E0002.tg = {2024: 1000}; });
  const fB = tep("nguoi_B.json", D => { D.E0001.nhan = {2023: "X1"}; D.E0001.tg = {2023: 2000}; D.E0003.nhan = {2025: "N2"}; D.E0003.tg = {2025: 500};
    D.MOI1 = Object.assign(JSON.parse(JSON.stringify(D.E0001)), {id: "MOI1", nhan: {2025: "U"}, tg: {2025: 700}}); });
  const fC = tep("lan_2.json", D => { D.E0003.nhan = {2025: "N1"}; D.E0003.tg = {2025: 300}; });
  const fX = new w.File(["{khong phai json"], "hong.json");
  await E("v29GopMo")([fA, fB, fC, fX]); await sleep(50);
  ok($("dlgGopTep").open && $("gtDS").querySelectorAll("tr").length === 4 && /hong\.json/.test($("gtDS").textContent) && !$("gtOk").disabled,
     "chọn 4 tệp: 3 tệp tiến độ liệt kê (điểm, nhãn, vùng), tệp hỏng báo lỗi riêng");
  $("gtKieu").value = "moi"; $("gtDanh").checked = true; $("gtOk").click(); await sleep(50);
  const M = E("({a: ST.diem.E0001.nhan[2023], b: ST.diem.E0002.nhan[2024], c: ST.diem.E0003.nhan[2025], m: ST.diem.MOI1 && ST.diem.MOI1.nhan[2025], xl1: ST.diem.E0001.xem_lai, xl2: !!ST.diem.E0002.xem_lai, bc: {x: V29.bc.xung.length, d: V29.bc.moiDiem, n: V29.bc.moiNhan}})");
  ok(M.a === "X1" && M.b === "N1" && M.c === "N2" && M.m === "U" && M.xl1 && !M.xl2 && M.bc.x === 2 && M.bc.d === 1 && M.bc.n === 4,
     `lấy nhãn gán sau cùng: E0001/2023 = X1 (B gán sau A), E0003/2025 = N2 (B sau C), điểm mới MOI1; 2 chỗ khác nhau được đánh dấu xem lại`);
  ok(/2 chỗ/.test($("gtKQ").textContent) && $("gtKQ").querySelectorAll("tr").length === 3 && !$("gtCSV").hidden, "báo cáo gộp: số điểm, nhãn mới, bảng chỗ khác nhau");
  nb = blobs.length; $("gtCSV").click(); await sleep(30);
  const cx = await (async b => new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsText(b); }))(blobs[nb]);
  ok(/^id,bo_diem,nam,tep,ma_lop,gan_luc,da_chon/.test(cx) && cx.trim().split("\n").length === 5 && /nguoi_A\.json,T1/.test(cx), "CSV các nhãn khác nhau: mỗi tệp một dòng, cột đã chọn");
  // cách khác: tệp sau thắng; giữ nhãn đang có
  E("Object.values(ST.diem).filter(p => p.bo === 'E0').forEach(p => { p.nhan = {}; p.tg = {}; p.tin = {}; p.xem_lai = false; })"); E("delete ST.diem.MOI1");
  E("ST.diem.E0001.nhan[2023] = 'N2'; ST.diem.E0001.tg[2023] = 99999");
  await E("v29GopMo")([fB, fA, fC]); $("gtKieu").value = "sau"; $("gtOk").click(); await sleep(30);
  const M2 = E("[ST.diem.E0001.nhan[2023], ST.diem.E0003.nhan[2025]]");
  await E("v29GopMo")([fA, fB]); $("gtKieu").value = "giu"; $("gtOk").click(); await sleep(30);
  const M3 = E("ST.diem.E0001.nhan[2023]");
  ok(M2[0] === "T1" && M2[1] === "N1" && M3 === "T1", `tệp chọn sau thắng: [${M2}]; giữ nhãn đang có: ${M3}`);
  $("gtDong").click();

  // ---------- F. tiếng Nga, tiếng Anh: không sót chữ tiếng Việt ở phần 2.9
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|\b(xem|nghi|so theo)\b/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100);
    $("bXB").click(); await sleep(50); doiV("xbND", "cd"); doiV("xbCGSo", "ha_pct"); await E("xbChay(true)");
    await E("v29GopMo([])"); w.document.querySelector('#vgXuatW [data-vx="bd"]'); E("vgVeVung()");
    const sot = new Set();
    for (const goc of [$("dlgXB"), $("dlgGopTep"), $("vgXuatW"), $("vgDS"), $("dlgExp"), $("bdTai"), $("stripPNG").parentElement]) {
      const wk = w.document.createTreeWalker(goc, 4); let m;
      while ((m = wk.nextNode())) { const p_ = m.parentElement; if (!p_ || p_.closest("script,style,textarea,#xbNguon")) continue; const t = m.nodeValue.trim();
        if (t && VI.test(t) && !/Tây|Đông|Thu|thử|Phạm Đăng Hiển|Thủy Nguyên|Xa Bac|Xa Nam|nguoi_|lan_2/.test(t)) sot.add(t.slice(0, 70)); }
      [...goc.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Thủy Nguyên/.test(v)) sot.add("@" + v.slice(0, 70)); }));
    }
    const R_ = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {dpi: 40})); return R.CG.map(g => g.tieuDe + " | " + g.muc.map(m => m.ten + " " + xbSoMuc(m, g, "ha_pct")).join(" | ") + " | " + xbGhiCG(g, "ha_pct", "")).join(" || "); })()`);
    if (VI.test(R_.replace(/Tây|Đông|Xa Bac|Xa Nam/g, ""))) sot.add("chú giải: " + R_.slice(0, 120));
    const miss = E("[...T_MISS]").filter(x => !/E0 thử|thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở phần 2.9 (sót ${sot.size}, T_MISS ${miss.length})` + (sot.size + miss.length ? "\n      " + [...sot, ...miss].slice(0, 25).join("\n      ") : ""));
    $("xbDong").click(); $("gtDong").click();
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs));
  xong();
})().catch(e => { console.error("LỖI", e); process.exit(1); });
