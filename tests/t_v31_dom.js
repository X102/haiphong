// Bản 3.1: kiểu ranh giới hành chính và tên xã; gộp nhiều xã thành một vùng (tìm tên, dán danh sách, nhấp bản đồ, hoà tan, phạm vi,
// GeoJSON, tệp tiến độ); Sentinel-2 trực tuyến (tìm cảnh qua STAC giả lọc như Earth Search, chấm SCL, chọn cảnh, offset theo cờ
// earthsearch:boa_offset_applied, ghép trung vị có và không che mây, lớp, dải ảnh, giá trị tại điểm, CSV, kế hoạch JSON, dịch).
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/s2o/items.json") || !fs.existsSync("/tmp/fx/ref31.json")) execSync("python3 " + __dirname + "/mk_fx31.py");
const REF = JSON.parse(fs.readFileSync("/tmp/fx/ref31.json", "utf8")).ref;
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.1", "bản " + E("VERSION"));
  ok(E("typeof polygonClipping") === "object" && E("typeof S2OC") === "object", "thư viện polygon-clipping và lõi S2OC đã nạp");
  await until(() => !$("vnW").hidden && E("V27.tinh === '31' && VG.xa && VG.xa.length === 2"), 6000, "hành chính tỉnh 31");

  // ---------- 1. kiểu ranh giới, tên xã
  ok(E("BG.kieu") === "sang" && $("bgKieu").value === "sang" && $("bgXaMau").value === "#ffe14d", "mặc định kiểu sáng (vàng) cho ranh giới xã");
  $("cVnXa").checked = true; $("cVnXa").dispatchEvent(new w.Event("change")); $("cVnXa").onchange && $("cVnXa").onchange();
  const kx = () => E("(() => { let o = null; VG.gXa.eachLayer(l => { o = l.options.style ? (typeof l.options.style === 'function' ? null : l.options.style) : l.options; }); return o; })()");
  const mauXa = () => E("(() => { let c = []; VG.gXa.eachLayer(l => l.eachLayer && l.eachLayer(p => c.push(p.options.color + '|' + p.options.weight + '|' + p.options.dashArray))); return c; })()");
  ok(mauXa().length === 2 && mauXa().every(s => s === "#ffe14d|1.6|null"), "viền xã theo kiểu sáng: " + mauXa().join(", "));
  E("map.setView([20.918, 106.61], 13, {animate: false})"); await sleep(250);
  const ten = () => E("BGT.xa.getLayers().map(m => m.options.icon.options.html.replace(/<[^>]+>/g, ''))").sort();
  ok(ten().join() === "Tây,Đông" && E("map.hasLayer(BGT.xa)"), "tên xã hiện ở mức phóng 13: " + ten().join());
  E("map.setView([20.918, 106.61], 11, {animate: false})"); await sleep(250);
  ok(ten().length === 0, "dưới mức 12 không hiện tên xã");
  $("bgXaZ").value = "10"; $("bgXaZ").dispatchEvent(new w.Event("change")); await sleep(30);
  ok(ten().length === 2 && E("BG.kieu") === "tu" && $("bgKieu").value === "tu", "hạ mức hiện tên xuống 10: hiện lại, kiểu thành tuỳ chọn");
  $("bgKieu").value = "toi"; $("bgKieu").dispatchEvent(new w.Event("change")); await sleep(30);
  ok(mauXa().every(s => s === "#344054|1.2|6 4") && $("bgXaMau").value === "#344054", "kiểu tối: viền xám đậm, nét đứt");
  $("bgXaMau").value = "#00ff00"; $("bgXaMau").dispatchEvent(new w.Event("input"));
  $("bgXaNenDo").value = "0.3"; $("bgXaNenDo").dispatchEvent(new w.Event("input")); await sleep(20);
  const luu = JSON.parse(w.localStorage.getItem("laymau_hp_bg_v1"));
  ok(mauXa().every(s => /^#00ff00\|/.test(s)) && E("(() => { let f; VG.gXa.eachLayer(l => l.eachLayer(p => { f = p.options.fill + '|' + p.options.fillOpacity; })); return f; })()") === "true|0.3" &&
     luu.kieu === "tu" && luu.xa.mau === "#00ff00", "màu tự chọn và nền 0.3 áp ngay, nhớ trong trình duyệt");
  $("bgXaTen").checked = false; $("bgXaTen").dispatchEvent(new w.Event("change")); await sleep(20);
  ok(ten().length === 0, "tắt tên xã");
  $("bgKieu").value = "sang"; $("bgKieu").dispatchEvent(new w.Event("change"));
  $("cVnTinh").checked = true; $("cVnTinh").onchange(); await until(() => E("!!V27.tinhL"), 4000, "ranh giới tỉnh");
  await sleep(50);
  const ct = E("(() => { let c = []; V27.tinhL.eachLayer(p => c.push(p.options.color + '|' + p.options.weight)); return c; })()");
  ok(ct.length === 2 && ct.every(s => s === "#ff6b3d|2.6"), "viền tỉnh theo kiểu sáng (cam): " + ct.join());
  ok(E("BGT.tinh.getLayers().length") === 2 && /Tinh Thu A/.test(E("BGT.tinh.getLayers().map(m => m.options.icon.options.html).join()")), "tên hai tỉnh hiện trên bản đồ");
  $("cVnTinh").checked = false; $("cVnTinh").onchange(); await sleep(30);
  ok(E("BGT.tinh.getLayers().length") === 0 && !E("V27.tinhL"), "tắt ranh giới tỉnh: bỏ cả tên tỉnh");

  // ---------- 2. gộp xã thành vùng
  $("bGop").click(); await sleep(30);
  ok(!$("xgP").hidden && /chưa chọn xã nào/.test($("xgXa").textContent), "mở bảng gộp xã");
  $("xgTim").value = "dong"; $("xgTim").dispatchEvent(new w.Event("input")); await sleep(20);
  const bD = [...$("xgKQ").querySelectorAll("button")].find(b => /Phường Đông/.test(b.textContent));
  ok(!!bD, "tìm không dấu 'dong' ra Phường Đông"); bD.click();
  await until(() => E("XG.chon.length") === 1, 3000, "thêm Đông");
  $("xgDan").value = "Xã Tây\nXa Bac (Tinh Thu B)\nPhuong Dong; Không Có Xã";
  $("xgKhop").click(); await until(() => /khớp và thêm/.test($("xgKhopKQ").textContent), 4000, "khớp danh sách");
  ok(/khớp và thêm 2 xã/.test($("xgKhopKQ").textContent) && /Không Có Xã/.test($("xgKhopKQ").textContent) &&
     E("XG.chon.map(c => c.tinh + ':' + c.ten).join()") === "31:Đông,31:Tây,22:Xa Bac", "dán danh sách: thêm Tây và Xa Bac (tỉnh B theo tên tỉnh), bỏ trùng Đông, báo tên không thấy");
  // trùng tên: ưu tiên tỉnh đang chọn khi không ghi tỉnh, ghi tỉnh thì theo tỉnh đó
  E(`V27.dm.xa.push(["99999", "Xa Bac", "31", 106.6, 20.9])`);
  ok(E(`xgKhopDong({ten: "Xa Bac"}).ung[0][2]`) === "31" && E(`xgKhopDong({ten: "Xa Bac", tinh: "Thu B"}).ung[0][2]`) === "22" &&
     E(`(() => { const t = V27.tinh; V27.tinh = "01"; const r = xgKhopDong({ten: "xa bac"}).loai; V27.tinh = t; return r; })()`) === "nhieu", "trùng tên: ưu tiên tỉnh đang chọn, theo tỉnh ghi kèm, báo nhiều khả năng khi không phân định");
  E(`V27.dm.xa.pop()`);
  // chọn trên bản đồ: nhấp vào xã của tỉnh khác (tự nạp ranh giới tỉnh, xã), nhấp lần nữa để bỏ
  $("xgBan").click(); ok(E("XG.ban") && E("map.hasLayer(XG.bat)"), "bật chọn trên bản đồ");
  E("XG.bat.fire('click', {latlng: L.latLng(20.89, 106.756)})"); await until(() => E("XG.chon.length") === 4, 4000, "nhấp thêm Xa Nam");
  ok(E("XG.chon[3].ten") === "Xa Nam" && E("XG.chon[3].tinh") === "22", "nhấp trên bản đồ: thêm Xa Nam của tỉnh 22");
  E("XG.bat.fire('click', {latlng: L.latLng(20.89, 106.756)})"); await until(() => E("XG.chon.length") === 3, 4000, "nhấp bỏ Xa Nam");
  ok(E("XG.chon.length") === 3, "nhấp lại cùng chỗ: bỏ xã đó");
  E("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))");
  ok(!E("XG.ban") && !E("XG.bat"), "Esc: thôi chọn trên bản đồ");
  const tong = E("XG.chon.reduce((s, c) => s + xgDienTich(c.mp), 0)");
  ok(E("(() => { const p = window.polygonClipping; window.polygonClipping = undefined; const r = xgHoaTan(XG.chon.map(c => c.mp)).length; window.polygonClipping = p; return r; })()") === 3,
     "không có thư viện hoà tan: giữ nguyên 3 phần");
  $("xgTen").value = "Vùng thử"; $("xgLuu").click(); await sleep(50);
  const id = E("XG.id"), g = E(`ST.vgop["${id}"]`);
  ok(g && g.ten === "Vùng thử" && g.xa.length === 3 && g.geom.type === "MultiPolygon" && g.geom.coordinates.length <= 2 && g.hoa_tan === true,
     `gộp và lưu: 3 xã hoà tan còn ${g && g.geom.coordinates.length} phần (Tây và Đông chung cạnh)`);
  ok(gan(g.ha, tong, tong * 0.002), `diện tích sau hoà tan ${g.ha.toFixed(1)} ha = tổng các xã ${tong.toFixed(1)} ha`);
  ok(/đã lưu Vùng thử: 3 xã/.test($("xgTT").textContent) && E("map.hasLayer(XG.lop)") && $("xgDS").value === id, "báo đã lưu, hiện vùng trên bản đồ, chọn trong danh sách vùng gộp");
  const coPV = ["cdPV", "tkPV", "plPV", "boPV", "s2oPV"].filter(s => [...$(s).options].some(o => o.value === "gop:" + id && /Vùng thử/.test(o.textContent)));
  ok(coPV.length === 5, "vùng gộp có trong 5 ô phạm vi: " + coPV.join());
  ok(E(`xbPhamDS().some(o => o[0] === "gop:${id}")`), "vùng gộp có trong phạm vi xuất bản đồ");
  const PV = E(`(() => { const P = v27PhamVi("gop:${id}"); return {k: P.kieu, n: P.mp.length, bb: P.bb.length, ten: P.ten}; })()`);
  ok(PV.k === "gop" && PV.n === g.geom.coordinates.length && PV.bb === 4 && PV.ten === "Vùng thử", "v27PhamVi đọc được vùng gộp (dùng cho Thống kê, Phân loại)");
  $("cdPV").value = "gop:" + id; ok(E("cdPhamVi().kieu") === "gop", "Phát hiện thay đổi đọc được vùng gộp");
  $("cdPV").value = "nhin";
  const nb = blobs.length; $("xgGeo").click(); await sleep(20);
  const gj = JSON.parse(await docBlob(blobs[nb]));
  ok(gj.features[0].properties.so_xa === 3 && gj.features[0].geometry.type === "MultiPolygon" && /Tây/.test(gj.features[0].properties.xa), "tải GeoJSON của vùng gộp");
  // sửa vùng: nạp lại các xã (kể cả xã của tỉnh khác) rồi lưu đè cùng mã
  $("xgChon").value = id; $("xgChon").onchange(); await until(() => E("XG.chon.length") === 3, 4000, "nạp lại vùng");
  ok(E("XG.id") === id && $("xgTen").value === "Vùng thử", "chọn vùng đã lưu để sửa: nạp lại 3 xã");
  // tệp tiến độ
  const j = JSON.parse(JSON.stringify(E("phienXuat()")));     // phienXuat trả ST theo tham chiếu: chụp lại trước khi xoá
  ok(j.st && j.st.vgop && j.st.vgop[id], "tệp tiến độ có vùng gộp");
  E(`delete ST.vgop["${id}"]; xgNapPV()`);
  await E(`phienNhap({st: {vgop: ${JSON.stringify(j.st.vgop)}}})`); await sleep(30);
  ok(E(`!!ST.vgop["${id}"]`) && [...$("tkPV").options].some(o => o.value === "gop:" + id), "nhập tệp tiến độ: khôi phục vùng gộp và ô phạm vi");
  $("xgDong").click();

  // ---------- 3. Sentinel-2 trực tuyến
  ok(E(`S2OC.cuaSo(2024, [11, 4])`) === "2023-11-01T00:00:00Z/2024-04-30T23:59:59Z" && E(`S2OC.cuaSo(2024, [2, 2])`) === "2024-02-01T00:00:00Z/2024-02-29T23:59:59Z", "cửa sổ thời gian: qua năm, tháng 2 năm nhuận");
  E(`window.STAC_REQ = []; window.F0 = window.fetch; window.fetch = async (u, o) => {
    if (String(u) !== S2OC.API) return F0(u, o);
    const b = JSON.parse(o.body); STAC_REQ.push(b);
    const all = await F0("http://127.0.0.1:8765/s2o/items.json").then(r => r.json()), [t0, t1] = b.datetime.split("/");
    const f = all.features.filter(it => b.collections.includes(it.collection) && it.properties.datetime >= t0 && it.properties.datetime <= t1 &&
      it.properties["eo:cloud_cover"] <= b.query["eo:cloud_cover"].lte && !(it.bbox[0] > b.bbox[2] || it.bbox[2] < b.bbox[0] || it.bbox[1] > b.bbox[3] || it.bbox[3] < b.bbox[1]));
    return {ok: true, status: 200, json: async () => ({type: "FeatureCollection", features: f})}; }`);
  $("bS2O").click(); await sleep(30);
  ok(!$("s2oP").hidden && $("s2oT1").options.length === 12 && $("s2oN1").options[0].value === "2017" && /chưa có kế hoạch cảnh/.test($("s2oBang").textContent), "mở bảng S2 trực tuyến: 12 tháng, năm từ 2017");
  $("s2oPV").value = "gop:" + id; $("s2oT1").value = "11"; $("s2oT1").dispatchEvent(new w.Event("change")); $("s2oT2").value = "4"; $("s2oT2").dispatchEvent(new w.Event("change"));
  ok(/qua năm/.test($("s2oTGiai").textContent), "tháng 11 đến 4: giải thích năm Y gồm cuối năm trước");
  $("s2oN1").value = "2023"; $("s2oN2").value = "2024"; $("s2oSo").value = "2";
  $("s2oTim").click(); await until(() => /xong/.test($("s2oTT").textContent) || /lỗi/.test($("s2oTT").textContent), 30000, "tìm cảnh");
  ok(/xong: 2 năm có ảnh/.test($("s2oTT").textContent), "tìm xong: " + $("s2oTT").textContent);
  const RQ = E("STAC_REQ");
  ok(RQ.length === 2 && RQ[0].datetime === "2022-11-01T00:00:00Z/2023-04-30T23:59:59Z" && RQ[1].datetime === "2023-11-01T00:00:00Z/2024-04-30T23:59:59Z" &&
     RQ[1].query["eo:cloud_cover"].lte === 60 && RQ[1].collections[0] === "sentinel-2-l2a" && gan(RQ[1].bbox[0], g.bl[0], 1e-9) && RQ[1].fields.include.includes("bbox"),
     "yêu cầu STAC: đúng cửa sổ qua năm, mây ≤ 60, bộ sentinel-2-l2a, hộp bao của vùng gộp");
  const N24 = E("ST.s2o.nam[2024]"), N23 = E("ST.s2o.nam[2023]");
  ok(N24.ung.map(s => s.id).join() === "A,B,C", "2024: ứng viên A, B, C (A2 trùng ngày và ô bị bỏ, E nhiều mây và G ngoài tháng do máy chủ lọc)");
  ok(N24.chon.slice().sort().join() === "A,B" && N24.phu === 1 && N24.ung.find(s => s.id === "C").ro === 0, `2024: chọn A, B; mọi ô có ít nhất 1 lần quang đãng; C mây kín bị bỏ (trung bình ${N24.tb} lần)`);
  ok(N24.ung.find(s => s.id === "A").o === 0 && gan(N24.ung.find(s => s.id === "B").o, -0.1, 1e-12), "offset: A có cờ boa_offset_applied nên 0, B không cờ nên -0.1");
  ok(N23.chon.join() === "D" && N23.ung.length === 1, "2023: một cảnh D");
  ok(E("!!OVL.s2o && OVL.s2o.on") && /Sentinel-2 trực tuyến/.test($("ols").textContent) && !!w.document.querySelector("[data-s2ov] [data-k=mode]"), "lớp Sentinel-2 trực tuyến xuất hiện và bật");
  ok($("s2oBang").querySelectorAll("tr").length === 3 && $("s2oBang").querySelectorAll("input[data-y]").length === 4 && /100 %/.test($("s2oBang").textContent), "bảng kế hoạch: 2 năm, 4 cảnh có thể chọn lại, phủ 100 %");
  // ghép: phản xạ giống nhau dù offset khác; che mây theo SCL
  const gh = (lon, lat, y, che, bang) => E(`(async () => { const m = S2OC.ll2m(${lon}, ${lat}); const v = await S2OC.ghep(s2oCanh(${y}), ${JSON.stringify(bang || ["B4", "B8"])}, [m[0] - 5, m[1] - 5, m[0] + 5, m[1] + 5], 1, 1, ${che}); return Array.from(v); })()`);
  const giua = await gh(106.65, 20.92, 2024, true), tay1 = await gh(106.57, 20.92, 2024, true), tay0 = await gh(106.57, 20.92, 2024, false);
  const dong1 = await gh(106.80, 20.93, 2024, true), dong0 = await gh(106.80, 20.93, 2024, false), n23 = await gh(106.65, 20.92, 2023, true);
  ok(gan(giua[0], REF.B4, 0.5) && gan(giua[1], REF.B8, 0.5), `giữa: trung vị A (DN ${REF.B4}) và B (DN ${REF.B4 + 1000}, offset -0.1) = ${giua.map(Math.round)}`);
  ok(gan(tay1[0], 600, 0.5) && gan(tay0[0], 2800, 0.5), `phía tây A có mây: che mây chỉ lấy B (${Math.round(tay1[0])}), không che thì trung vị với mây (${Math.round(tay0[0])})`);
  ok(gan(dong1[0], 600, 0.5) && gan(dong0[0], 400, 0.5), `phía đông B có bóng mây: che ${Math.round(dong1[0])}, không che ${Math.round(dong0[0])}`);
  ok(gan(n23[0], 900, 0.5) && gan(n23[1], 2000, 0.5), "2023: cảnh D (B4 900, B8 2000)");
  const tci = await gh(106.65, 20.92, 2024, true, ["TCI"]), tciT = await gh(106.57, 20.92, 2024, true, ["TCI"]);
  ok(tci.join() === "42,63,84" && tciT.join() === "44,66,88", "TCI: trung vị (40, 44) = 42 ...; phía tây chỉ B");
  // tô màu lớp
  const ve = (lon, lat, y) => E(`(async () => { const m = S2OC.ll2m(${lon}, ${lat}); const px = await s2oVe(${y}, [m[0] - 5, m[1] - 5, m[0] + 5, m[1] + 5], 1, 1, null); return px ? Array.from(px) : null; })()`);
  E(`S2OV.mode = "tci"; S2OV.gain = 1`);
  ok((await ve(106.65, 20.92, 2024)).join() === "42,63,84,255", "lớp màu thật ESA");
  E(`S2OV.mode = "rgb"; S2OV.pre = "432"`);
  const k4 = E("S2O.keo.B4"), k3 = E("S2O.keo.B3"), k2 = E("S2O.keo.B2"), st = (v, k) => Math.round(255 * Math.max(0, Math.min(1, (v - k[0]) / (k[1] - k[0]))));
  const rgb = await ve(106.65, 20.92, 2024);
  ok(rgb.join() === [st(REF.B4, k4), st(REF.B3, k3), st(REF.B2, k2), 255].join(), "tổ hợp 4-3-2 kéo giãn cố định: " + rgb.join());
  E(`S2OV.mode = "idx"; S2OV.chi = "NDVI"`);
  ok(E("s2oCanBang().slice().sort().join()") === "B4,B8", "chỉ số NDVI chỉ đọc B4, B8");
  const nd = (REF.B8 - REF.B4) / (REF.B8 + REF.B4), c = E(`(() => { const c = csLay("NDVI"), t = Math.max(0, Math.min(1, (${nd} - c.lo) / (c.hi - c.lo))); return Array.from(lut2(c.mau)[1 + Math.round(t * 254)]).slice(0, 3); })()`);
  const pi = await ve(106.65, 20.92, 2024);
  ok(pi.slice(0, 3).join() === c.join() && pi[3] === 255, `NDVI ${nd.toFixed(3)} tô theo bảng màu của chỉ số`);
  ok((await ve(106.95, 20.92, 2024)) === null, "ô ngoài hộp bao mọi cảnh: không đọc gì");
  E(`S2OV.mode = "tci"`);
  // dải ảnh theo năm
  ok([...$("selStrip").options].some(o => o.value === "s2o"), "dải ảnh có nguồn S2 trực tuyến");
  E(`PROBE = CORE.newPoint("⌖", 106.65, 20.92, {bo: ""}); $("selStrip").value = "s2o"; renderStrip()`);
  await until(() => E(`$("strip").querySelectorAll(".it").length`) >= 3, 4000, "dải ảnh");
  await sleep(1500);
  ok(E(`[...$("strip").querySelectorAll(".it .lb")].map(e => e.textContent).join()`) === "2023,2024,2025" && !/không đọc được/.test($("stripmsg").textContent),
     "dải ảnh S2 trực tuyến: 2023, 2024 có ảnh, 2025 không có");
  // giá trị tại điểm (đọc khi bấm)
  E(`ST.nam = 2024`);
  const rows = await E(`giaTriTai(L.latLng(20.92, 106.65))`);
  const r = rows.find(x => /S2 trực tuyến 2024/.test(x[0]));
  ok(!!r && /data-s2odoc/.test(r[1]), "giá trị tại điểm: có dòng S2 trực tuyến với nút đọc");
  const box = w.document.createElement("div"); box.innerHTML = r[1]; w.document.body.appendChild(box);
  box.querySelector("[data-s2odoc]").dispatchEvent(new w.MouseEvent("click", {bubbles: true}));
  await until(() => /B4 600/.test(box.textContent), 8000, "đọc 10 băng");
  ok(/B2 300 · B3 500 · B4 600/.test(box.textContent) && /NDVI/.test(box.textContent), "đọc 10 băng tại điểm và các chỉ số: " + box.textContent.slice(0, 80));
  // chọn lại cảnh
  E(`s2oDoiChon("2024", "B", false)`);
  ok(E("ST.s2o.nam[2024].chon.join()") === "A" && E("ST.s2o.nam[2024].phu") < 1 && E("ST.s2o.nam[2024].phu") > 0.3, "bỏ cảnh B: chỉ còn A, độ phủ giảm (phía tây mây) " + E("ST.s2o.nam[2024].phu"));
  E(`s2oDoiChon("2024", "B", true)`);
  ok(E("ST.s2o.nam[2024].chon.slice().sort().join()") === "A,B" && E("ST.s2o.nam[2024].phu") === 1, "chọn lại B: phủ 100 % (" + E("ST.s2o.nam[2024].chon.join() + ' ' + ST.s2o.nam[2024].phu") + ")");
  // CSV, lưu và nạp kế hoạch
  let k = blobs.length; $("s2oCSV").click(); await sleep(20);
  const csv = (await docBlob(blobs[k])).trim().split("\n");
  ok(csv.length === 5 && /^nam,canh,ngay/.test(csv[0]) && csv.some(l => /^2024,A,2024-01-10,10,.*,1$/.test(l)) && csv.some(l => /^2024,C,2023-12-05,55,0,.*,0$/.test(l)), "CSV các cảnh, cờ đã chọn");
  k = blobs.length; $("s2oLuuKH").click(); await sleep(20);
  const kh = JSON.parse(await docBlob(blobs[k]));
  ok(kh.loai === "s2o_ke_hoach" && kh.cfg.thang.join() === "11,4" && kh.nam["2024"].chon.length === 2, "lưu kế hoạch JSON");
  E(`ST.s2o = null; s2oSauDoi(false)`);
  ok(!E("OVL.s2o") && ![...$("selStrip").options].some(o => o.value === "s2o"), "xoá kế hoạch: mất lớp và nguồn dải ảnh");
  E(`s2oNapKH(${JSON.stringify(kh)})`);
  ok(E("s2oNamCo().join()") === "2023,2024" && E("!!OVL.s2o && OVL.s2o.on") && $("s2oT1").value === "11", "nạp lại kế hoạch: lớp trở lại, ô tháng theo kế hoạch");
  const j2 = JSON.parse(JSON.stringify(E("phienXuat()")));
  ok(j2.st.s2o && j2.st.s2o.nam["2024"].chon.length === 2, "tệp tiến độ có kế hoạch cảnh");
  // lớp thật trên bản đồ (S2OLayer)
  E(`map.setView([20.92, 106.65], 12, {animate: false}); refreshOverlays()`); await sleep(1500);
  ok(E("OVL.s2o.layer instanceof S2OLayer") && E("OVL.s2o.layer._y") === 2024, "lớp S2OLayer của năm 2024 trên bản đồ");
  // phạm vi quá rộng
  E(`$("s2oPV").value = "nhin"; map.setView([16, 106], 6, {animate: false})`); $("s2oTim").click(); await until(() => /lỗi/.test($("s2oTT").textContent), 3000, "báo phạm vi rộng");
  ok(/phạm vi quá rộng/.test($("s2oTT").textContent), "khung nhìn quá rộng: báo lỗi, không tìm");

  // ---------- 4. dịch
  E("setLang('ru')"); await sleep(80);
  ok(/Найти сцены/.test($("s2oP").textContent) && /Объединить и сохранить/.test($("xgP").textContent) && /Цвет границ/.test($("bgW").textContent) && /S2 онлайн/.test($("bS2O").textContent),
     "tiếng Nga: bảng S2 trực tuyến, gộp xã, kiểu ranh giới");
  const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i, sot = new Set();
  for (const goc of [$("s2oP"), $("xgP"), $("bgW")]) {
    const it = w.document.createTreeWalker(goc, 4); let m;
    while ((m = it.nextNode())) { const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|Vùng thử|Phường|Xã|Không Có/.test(t)) sot.add(t.slice(0, 60)); }
    goc.querySelectorAll("[title],[placeholder]").forEach(e => { const t = e.getAttribute("title") || e.getAttribute("placeholder"); if (VI.test(t)) sot.add("@" + t.slice(0, 50)); });
  }
  ok(sot.size === 0, "không sót chữ Việt trong ba bảng mới" + (sot.size ? ": " + [...sot].join(" | ") : ""));
  E("setLang('en')"); await sleep(50);
  ok(/Find scenes/.test($("s2oP").textContent) && /Sentinel-2 online/.test($("ols").textContent), "tiếng Anh: bảng và tên lớp");
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
