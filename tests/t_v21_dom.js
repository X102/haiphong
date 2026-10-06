// Bản 2.1: liên kết có ghim, bảng ảnh nền thu gọn, bố cục cột phải / dải dưới, S2 10 băng + CTX, đồ thị theo năm,
// tạo bộ điểm mới với năm cần gán riêng, chọn vùng nhiều lớp cạnh tranh
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json"), REF = require("/tmp/fx/ref.json");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs, puts} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "2.1", "bản 2.1");

  // ---------- hàm thuần
  const lk = E("CORE.links(20.71285, 106.506712, {year: 2023, wayback: 123, lang: 'ru', ten: 'E0001'})"), by = k => lk.find(x => x.k === k);
  ok(by("gsat").url.includes("/maps/place/20.712850,106.506712/") && by("gsat").ghim && by("gearth").url.includes("/web/search/20.712850,106.506712") &&
     by("bing").url.includes("sp=point.20.712850_106.506712_E0001") && by("yandex").url.includes("pt=106.506712%2C20.712850%2Cpm2rdm") &&
     by("osm").url.includes("mlat=") && !by("wayback").ghim && !by("copernicus").ghim && !by("sv").ghim, "liên kết: 7 trang có ghim đúng điểm, 4 trang đánh dấu giữa màn hình");
  const dm = E(`(() => { const F = new Uint8Array([10,10, 12,11, 90,90, 88,91, 50,50, 200,200]), v = new Uint8Array(6).fill(1);
      return Array.from(CORE.distSelMulti(F, 2, 6, v, [[[10,10]], [[90,90]]], [], 0.1, null).cls); })()`);
  ok(JSON.stringify(dm) === "[1,1,2,2,0,0]", `distSelMulti: mỗi điểm ảnh về lớp gần nhất, xa quá thì bỏ ${JSON.stringify(dm)}`);
  const bx = E(`(() => { const w = 9, h = 7, nb = 2, a = new Int16Array(w * h * nb); for (let i = 0; i < a.length; i++) a[i] = (i * 37) % 101;
      const B = CORE.boxImage(a, w, h, nb, 1, 2); let d = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = CORE.ctxPoint(a, w, h, nb, x, y, 5); d = Math.max(d, Math.abs(c.m[1] - B.m[y * w + x]), Math.abs(c.s[1] - B.s[y * w + x])); }
      return d; })()`);
  ok(bx < 1e-3, `boxImage (ảnh) trùng ctxPoint (điểm) kể cả ở mép (lệch ${bx})`);
  const gp = E("CORE.gridPts([1000, 2000, 5100, 4100], 1000, false, CORE.rnd(1))");
  ok(gp.length === 8 && gp.every(q => (q[0] - 500) % 1000 === 0 && (q[1] - 500) % 1000 === 0), `gridPts: tâm ô lưới 1 km (${gp.length} điểm)`);
  const rp = E("CORE.randPts([0, 0, 10000, 10000], 60, 500, null, CORE.rnd(7))");
  const dmin = Math.min(...rp.flatMap((a, i) => rp.slice(i + 1).map(b => Math.hypot(a[0] - b[0], a[1] - b[1]))));
  ok(rp.length === 60 && dmin >= 500, `randPts: 60 điểm cách nhau ≥ 500 m (nhỏ nhất ${dmin.toFixed(0)})`);

  // ---------- liên kết trong trang
  E("select('E0001', true)"); await sleep(100);
  const as = [...$("plinkBody").querySelectorAll("a")];
  ok(as.length === 12 && as.filter(a => a.dataset.ghim === "0").length === 5 && as.filter(a => a.dataset.ghim === "0").every(a => /⌖/.test(a.textContent)),
     "liên kết của điểm: có dấu 📍 / ⌖ giữa màn hình");
  const nm0 = $("msgs").children.length; as.find(a => a.dataset.k === "wayback").dispatchEvent(new w.MouseEvent("click", {bubbles: true, cancelable: true}));
  ok($("msgs").children.length > nm0 && /20\.\d+, 106\.\d+|\d+\.\d+, \d+\.\d+/.test($("msgs").lastChild.textContent), "bấm trang không ghim: báo điểm ở giữa màn hình và chép toạ độ");

  // ---------- bảng ảnh nền thu gọn, bố cục
  E("pnThu(true)"); ok($("panel").classList.contains("thu") && /lớp bật/.test($("pnTom").textContent) && E('ls("laymau_hp_pnthu_v1")') === true, "thu gọn bảng ảnh nền (nhớ trạng thái)");
  $("pnThu").click(); ok(!$("panel").classList.contains("thu"), "mở lại bảng ảnh nền");
  $("selDock").value = "duoi"; $("selDock").onchange(); await sleep(150);
  ok(w.document.body.classList.contains("dk-duoi") && $("viz").parentElement === $("dock") && !$("dock").hidden, "dải ảnh + đường mùa vụ sang dải dưới bản đồ");
  $("selDock").value = "phai"; $("selDock").onchange(); await sleep(150);
  ok(w.document.body.classList.contains("dk-phai") && !w.document.body.classList.contains("dk-duoi") && $("viz").parentElement === $("dock"), "sang cột phải");
  $("selDock").value = "trai"; $("selDock").onchange(); await sleep(150);
  ok($("viz").parentElement === $("side") && $("viz").nextElementSibling === $("statsH") && $("dock").hidden, "về trong bảng trái, đúng chỗ cũ");

  // ---------- đường mùa vụ 6 kỳ: mọi băng (tái dựng từ ảnh PC)
  await until(() => E("CURVES.E0 && CURVES.E0._pos"), 8000, "đường tính sẵn");
  E("select('E0001', true)"); E("setYear(2025)");
  ok(E("curveFeats()").join() === "NDVI,MNDWI,B8", `đặc trưng 6 kỳ theo manifest: ${E("curveFeats()").join()}`);
  $("selCurveFeat").value = "B8"; $("selCurveFeat").onchange();
  await until(() => /polyline/.test($("curve").innerHTML) && /B8/.test($("curve").textContent), 5000, "đường B8");
  const cvB8 = await E("curvesFor(cur())");
  ok(cvB8.ys[2025].B8.length === 6 && cvB8.ys[2025].NDVI.every((v, i) => gan(v, REF.curves.NDVI[1][i], 6e-4)), "B8 6 kỳ từ ảnh PC; NDVI vẫn là đường tính sẵn");
  $("selCurveFeat").value = "NDVI"; $("selCurveFeat").onchange();

  // ---------- đồ thị giá trị theo năm
  $("selCurveKind").value = "nam"; $("selCurveKind").onchange(); await sleep(50);
  const grp = [...$("selCurveGrp").options].map(o => o.value);
  ok(["pc", "emb", "s2", "idx", "m5", "s5", "m15", "s15"].every(g => grp.includes(g)) && !grp.includes("rgb"), `nhóm theo năm có: ${grp.join(",")}`);
  const P1 = E("cur()"), ri = E("Object.keys(ST.diem).indexOf('E0001')");
  const A = await E("annualFor(cur(), 's2')"), r25 = REF.s2d["2025"][1], r23 = REF.s2d["2023"][1];
  ok(JSON.stringify(A.ys[2025]) === JSON.stringify(r25.v) && JSON.stringify(A.ys[2023]) === JSON.stringify(r23.v), "S2 10 băng tại điểm: đúng giá trị gốc hai năm");
  const M5 = await E("annualFor(cur(), 'm5')"), S15 = await E("annualFor(cur(), 's15')");
  const dM = Math.max(...M5.ys[2025].map((v, i) => Math.abs(v - r25.m5[i]))), dS = Math.max(...S15.ys[2025].map((v, i) => Math.abs(v - r25.s15[i])));
  ok(dM < 0.05 && dS < 0.05, `CTX tại điểm trùng scipy uniform_filter(nearest): lệch TB5 ${dM.toFixed(4)}, ĐLC15 ${dS.toFixed(4)}`);
  const RB = REF.s2d_bien;                                                // điểm sát mép phải dưới của ảnh: biên kiểu nearest
  const Me = await E(`(() => { const ll = CORE.toLL(${RB.x}, ${RB.y}); return annualFor({id: "bien", x: ${RB.x}, y: ${RB.y}, lon: ll[0], lat: ll[1], nhan: {}}, 's15'); })()`);
  const dB = Me.ys[2025] ? Math.max(...Me.ys[2025].map((v, i) => Math.abs(v - RB.s15[i]))) : 99;
  ok(dB < 0.2, `CTX sát mép ảnh vẫn trùng (lặp giá trị mép), lệch ${dB.toFixed(3)} (scipy tính float32)`);
  const IX = await E("annualFor(cur(), 'idx')"), rr = r25.v.map(v => v / 1e4), ndvi = (rr[6] - rr[2]) / (rr[6] + rr[2]);
  ok(gan(IX.ys[2025][0], ndvi, 1e-12) && IX.names.join() === "NDVI,NDWI,MNDWI,NDBI,BSI", "chỉ số tại điểm như bộ phân loại");
  const PC = await E("annualFor(cur(), 'pc')"), EM = await E("annualFor(cur(), 'emb')");
  ok(PC.names.join() === "PC1,PC2,PC3" && PC.ys[2025] && PC.ys[2025].every(v => Math.abs(v) < 50), "PC tại điểm từ ảnh dữ liệu PC (÷ 100)");
  ok(EM.names.length === 6 && EM.ys[2025].every((v, i) => v >= [-3, -2, -1, -4, -5, -6][i] - 1e-9 && v <= [3, 2, 1, 4, 5, 6][i] + 1e-9) && /phép chiếu|chiếu/.test(EM.nguon),
     "embedding 6 thành phần đổi từ 8 bit theo phép chiếu");
  $("selCurveGrp").value = "s2"; $("selCurveGrp").onchange();
  await until(() => $("curve").querySelectorAll("circle").length >= 20, 5000, "đồ thị S2 theo năm");
  ok($("curve").querySelectorAll("polyline").length === 10 && $("curve").querySelectorAll(".cvleg [data-s]").length === 10 && /4 năm/.test($("curve").textContent),
     "đồ thị theo năm: 10 đường, chú giải bật tắt, báo cần ≥ 4 năm để đánh dấu năm lệch");
  $("curve").querySelector('.cvleg [data-s="B2"]').click(); await until(() => $("curve").querySelectorAll("polyline").length === 9, 3000, "ẩn B2");
  ok(E("CVS.an.s2").includes("B2"), "bấm chú giải ẩn đường B2");
  $("cbCurveZ").checked = true; $("cbCurveZ").onchange(); await sleep(300);
  ok(E("CVS.z") === true && $("curve").querySelector("svg"), "chuẩn hoá z");
  ok($("curve").querySelectorAll("rect[rx='2']").length >= 2 * 2, "dải nhãn và bản đồ lớp dưới trục");
  $("bCurveBig").click(); await sleep(200);
  ok($("dlgCurve").open && $("curveBig").querySelector("svg") && $("curveBig").querySelector('[data-big="selCurveGrp"]'), "phóng to đồ thị theo năm, có bộ chọn nhóm");
  const bg = $("curveBig").querySelector('[data-big="selCurveGrp"]'); bg.value = "m15"; bg.onchange(); await sleep(400);
  ok(E("CVS.grp") === "m15" && $("selCurveGrp").value === "m15", "đổi nhóm trong hộp phóng to đồng bộ về bảng");
  $("cvClose").click(); $("cbCurveZ").checked = false; $("cbCurveZ").onchange();
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange(); await sleep(50);

  // ---------- lớp S2 10 băng: tổ hợp màu, chỉ số, CTX
  ok(E("!!OVL.s2d") && /S2 10 băng/.test($("ols").textContent) && $("ols").querySelector("[data-s2v] select"), "lớp S2 10 băng có trong bảng lớp, kèm điều khiển");
  const bb = E(`(() => { const c = CORE.to3857(${P1.lon}, ${P1.lat}); return [c[0] - 600, c[1] - 600, c[0] + 600, c[1] + 600]; })()`);
  const url = E("CORE.dataUrl(CFG, 's2d/s2d_2025.tif')");
  const px1 = await E(`s2dVe(${JSON.stringify(url)}, ${JSON.stringify(bb)}, 64, 64, 15, null)`);
  const op = a => { let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i]) n++; return n; };
  ok(px1 && op(px1) === 64 * 64, `tổ hợp màu: ô 64 × 64 đủ điểm ảnh (${px1 && op(px1)})`);
  E("S2V.mode = 'ctx'; S2V.tk = 's'; S2V.cs = 15; S2V.mot = false");
  const pxLow = await E(`s2dVe(${JSON.stringify(url)}, ${JSON.stringify(bb)}, 64, 64, 11, null)`);
  const pxC = await E(`s2dVe(${JSON.stringify(url)}, ${JSON.stringify(bb)}, 64, 64, 15, null)`);
  ok(pxLow === null && pxC && op(pxC) === 64 * 64, "CTX: không tính khi thu nhỏ (< mức 13), tính được ở mức 15");
  const R = await E(`readUTM(${JSON.stringify(url)}, ${JSON.stringify(bb)}, 64, 64, 7, [6])`);
  ok(R && R.rx === 10 && R.sw > 64 && Array.from(R.idx).every(i => i >= 0), "đọc cửa sổ UTM ở độ phân giải gốc có đệm 7 điểm ảnh");
  E("S2V.mode = 'idx'; S2V.chi = 'NDVI'");
  const pxI = await E(`s2dVe(${JSON.stringify(url)}, ${JSON.stringify(bb)}, 32, 32, 12, null)`);
  ok(pxI && op(pxI) === 32 * 32, "chỉ số NDVI tô theo bảng màu");
  E("S2V.mode = 'rgb'"); E("s2vUI($('ols').querySelector('[data-s2v]'))");
  const sp = $("ols").querySelector('[data-s2v] [data-k="pre"]'); sp.value = "843"; sp.dispatchEvent(new w.Event("change"));
  ok(E("S2V.r") === 6 && E("S2V.g") === 2 && E("S2V.b") === 1 && E('ls("laymau_hp_s2v_v1").pre') === "843", "chọn tổ hợp 8-4-3");
  const cb = $("ols").querySelector("input[type=checkbox]"); cb.checked = true; cb.onchange(); await sleep(50);
  ok(E("OVL.s2d.layer instanceof S2DLayer"), "bật lớp: lớp lưới S2DLayer trên bản đồ");
  cb.checked = false; cb.onchange();
  $("selStrip").value = "s2d"; const np0 = puts.length, tr0 = E("typeof ANH === 'undefined' ? 0 : ANH.trung"); $("selStrip").onchange(); await sleep(1500);
  ok($("strip").querySelectorAll("canvas").length === 3 && (puts.length >= np0 + 2 || E("typeof ANH === 'undefined' ? 0 : ANH.trung") >= tr0 + 2), "dải ảnh theo năm bằng S2 10 băng (2023, 2025; 2024 không có)");

  // ---------- tạo bộ điểm mới
  await E("boMo('moi')"); await sleep(100);
  ok($("dlgBo").open && $("boXa").options.length === 2, "hộp tạo bộ điểm: có danh sách xã");
  $("boTen").value = "Lưới 2 km Tây"; $("boCach").value = "luoi"; $("boCach").onchange(); $("boBuoc").value = "2000";
  $("boPV").value = "xa"; $("boPV").onchange(); [...$("boXa").options].forEach(o => { o.selected = o.textContent === "Tây"; });
  $("boThemNam").value = "2026"; $("boThemNamB").click();
  $("boNamChon").querySelectorAll("input").forEach(i => { i.checked = ["2023", "2025", "2026"].includes(i.value); });
  await E("boXemTruoc()");
  const n = E("BO.pts.length"), inside = E(`BO.pts.every(q => CORE.pip(q.lon, q.lat, VG.xa.find(x => x.ten === "Tây").mp))`);
  ok(n > 5 && inside, `lưới 2 km trong xã Tây: ${n} điểm, đều trong xã`);
  await E("boTao()"); await sleep(100);
  const id = E("ST.bo");
  ok(/^Luoi_2_km_Tay/.test(id) && E(`Object.values(ST.diem).filter(p => p.bo === "${id}").length`) === n && JSON.stringify(E("years()")) === "[2023,2025,2026]",
     `tạo bộ ${id}: ${n} điểm, năm cần gán 2023, 2025, 2026`);
  ok([...$("years").querySelectorAll("button")].some(b => b.textContent === "2026") && /2023, 2025, 2026/.test($("boNam").textContent), "nút năm 2026 và dòng năm cần gán");
  const q0 = E(`Object.values(ST.diem).find(p => p.bo === "${id}")`), sn = E(`CORE.snap(${q0.x}, ${q0.y})`);
  ok(sn[0] === q0.x && sn[1] === q0.y, "điểm mới đặt đúng tâm điểm ảnh 10 m");
  E(`select("${q0.id}", false)`); E("setYear(2026)"); E("label('X2')");
  ok(E(`ST.diem["${q0.id}"].nhan[2026]`) === "X2" && /\/.*điểm đủ nhãn 2023-2026|2023-2026/.test($("progtxt").textContent), "gán được năm 2026, tiến độ tính theo năm của bộ");
  // phân tầng theo bản đồ lớp
  E("map.fitBounds(L.latLngBounds(ST.diem.E0000 ? [[ST.diem.E0000.lat, ST.diem.E0000.lon], [ST.diem.E0001.lat, ST.diem.E0001.lon]] : []), {animate: false})");
  E(`map.setView([${RV.lang[0][1]}, ${RV.lang[0][0]}], 12, {animate: false})`);
  await E("boMo('moi')"); $("boTen").value = "Phân tầng"; $("boCach").value = "pt"; $("boCach").onchange(); $("boPV").value = "nhin"; $("boPV").onchange();
  $("boNLop").value = "3"; $("boDmin").value = "200"; $("boLopBD").value = "lulc_ctx"; $("boLopBD").onchange(); $("boNamBD").value = "2025";
  await E("boXemTruoc()");
  const pts = E("BO.pts"), per = {};
  pts.forEach(q => { per[q.tang] = (per[q.tang] || 0) + 1; });
  ok(Object.keys(per).length === 3 && Object.values(per).every(v => v === 3), `phân tầng theo bản đồ lớp: ${JSON.stringify(per)}`);
  await E("boTao()"); const id2 = E("ST.bo");
  const p2 = E(`Object.values(ST.diem).filter(p => p.bo === "${id2}")`);
  const clsAt = await Promise.all(p2.map(p => E(`pxAt(CORE.dataUrl(CFG, "lulc_ctx/lulc_ctx_2025.tif"), ST.diem["${p.id}"]).then(v => v && v[0])`)));
  ok(p2.length === 9 && p2.every((p, i) => +p.tang === clsAt[i] && p.goi_y[2025] === +p.tang), "điểm phân tầng: tầng = lớp bản đồ tại điểm, gợi ý 3 lớp năm 2025");
  // sửa năm của bộ có sẵn (E0), xoá bộ tự tạo
  E("ST.bo = 'E0'; buildSetSelect(); render()"); await E("boMo('sua')");
  ok($("boTen").disabled && !$("boXoa").hidden === false, "sửa bộ E0: không đổi tên, không xoá được");
  $("boNamChon").querySelectorAll("input").forEach(i => { i.checked = ["2024", "2025"].includes(i.value); });
  await E("boTao()"); ok(JSON.stringify(E("years()")) === "[2024,2025]" && JSON.stringify(E("allYears()")) === "[2023,2024,2025,2026]", "năm cần gán riêng cho bộ E0; xuất tệp dùng hợp các năm");
  E(`ST.bo = "${id2}"; buildSetSelect(); render()`); await E("boMo('sua')");
  ok(!$("boXoa").hidden, "bộ tự tạo: có nút xoá"); $("boXoa").click(); await sleep(50);
  ok(!E(`ST.bo_cfg["${id2}"]`) && !E(`Object.values(ST.diem).some(p => p.bo === "${id2}")`), "xoá bộ tự tạo cùng các điểm của nó");
  E("ST.bo = 'E0'; buildSetSelect(); render()");

  // ---------- chọn vùng nhiều lớp: làng (X2) và dải đường (X4) cạnh tranh
  E(`map.fitBounds([[${Math.min(...RV.lang.map(q => q[1]), ...RV.dai.map(q => q[1])) - 0.004}, ${Math.min(...RV.lang.map(q => q[0]), ...RV.dai.map(q => q[0])) - 0.004}],
                    [${Math.max(...RV.lang.map(q => q[1]), ...RV.dai.map(q => q[1])) + 0.004}, ${Math.max(...RV.lang.map(q => q[0]), ...RV.dai.map(q => q[0])) + 0.004}]], {animate: false})`);
  E("delete ST.bo_cfg.E0; buildSetSelect(); setYear(2025)"); key("o"); await sleep(100);
  E("VG.pos = []; vgXoaKQ(); vgVeHat()");
  ok($("vgLopHat").querySelectorAll("button").length === 1 + E("SCHEME.lop.length"), "hàng nút lớp cho điểm mẫu");
  E("vg$('vgPV').value = 'nhin'"); E("vg$('vgTau').value = '0.2'"); E("vg$('vgMin').value = '0'");
  $("vgLopHat").querySelector('[data-ma="X2"]').click();
  E(`map.fire("click", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}), originalEvent: {}})`);
  await until(() => E("VG.kq && VG.kq.lops.length === 1"), 10000, "vùng lớp X2");
  const haMot = E("VG.kq.st.X2.dien_tich_ha");
  $("vgLopHat").querySelector('[data-ma="X4"]').click();
  E(`map.fire("click", {latlng: L.latLng(${RV.dai[0][1]}, ${RV.dai[0][0]}), originalEvent: {}})`);
  await until(() => E("VG.kq && VG.kq.lops.length === 2"), 10000, "vùng hai lớp");
  const K = E(`(() => { const K = VG.kq; let ov = 0; for (let i = 0; i < K.masks.X2.length; i++) if (K.masks.X2[i] && K.masks.X4[i]) ov++;
      return {lops: K.lops, ov, x2: K.st.X2.dien_tich_ha, x4: K.st.X4.dien_tich_ha, ma: VG.res.ma}; })()`);
  ok(K.ov === 0 && K.lops.join() === "X2,X4" && K.ma === "X4", `hai lớp không chồng nhau; đang làm việc với X4 (X2 ${K.x2.toFixed(1)} ha, X4 ${K.x4.toFixed(1)} ha)`);
  const lopLang = RV.lang.map(q => E(`vgLopTai(L.latLng(${q[1]}, ${q[0]}))`)), lopDai = RV.dai.map(q => E(`vgLopTai(L.latLng(${q[1]}, ${q[0]}))`));
  ok(lopLang.every(v => v === "X2") && lopDai.every(v => v === "X4"), `tâm 4 làng thuộc X2, tâm 6 dải đường thuộc X4 (${lopLang.join(",")} | ${lopDai.join(",")})`);
  ok(gan(K.x2, 4 * RV.ha_lang, 0.2 * 4 * RV.ha_lang) && haMot > K.x2 + 15 && K.x4 > 15,
     `cạnh tranh: làng về X2 (≈ ${(4 * RV.ha_lang).toFixed(0)} ha), dải đường về X4; khi chỉ có X2 thì dải đường lẫn vào (${haMot.toFixed(1)} ha)`);
  ok($("vgBangLop").querySelectorAll("tr[data-ma]").length === 2 && /X4/.test($("vgTom").textContent), "bảng các lớp và tóm tắt theo lớp đang chọn");
  $("vgBangLop").querySelector('tr[data-ma="X2"]').click(); await sleep(50);
  ok(E("VG.res.ma") === "X2" && E("vg$('vgLop').value") === "X2", "nhấp dòng X2: làm việc với X2, ô lớp lưu = X2");
  // xoá một mảng của lớp X4 khi đang ở X2: tự chuyển lớp
  key("2"); E(`map.fire("click", {latlng: L.latLng(${RV.dai[3][1]}, ${RV.dai[3][0]}), originalEvent: {}})`); await sleep(300);
  ok(E("VG.res.ma") === "X4" && E("VG.loai.length") === 1 && E("VG.loai[0].ma") === "X4", "nhấp mảng của lớp khác bằng công cụ xoá: chuyển sang X4 và xoá mảng đó");
  ok(E("VG.kq.st.X4.dien_tich_ha") < K.x4 && gan(E("VG.kq.st.X2.dien_tich_ha"), K.x2, 0.01), "xoá mảng X4 không ảnh hưởng X2");
  key("1");
  await E("vgNam9()");
  ok($("vgNamTK").querySelectorAll("tr[data-y]").length === 2 && /X2 ha/.test($("vgNamTK").textContent) && /X4 ha/.test($("vgNamTK").textContent), "so sánh các năm: cột diện tích từng lớp");
  E("vgLuuHet()");
  const vs = E("Object.values(ST.vung)");
  ok(vs.length === 2 && vs.map(v => v.ma_lop).sort().join() === "X2,X4" && vs.every(v => v.geom.coordinates.length > 0), "lưu mọi lớp: mỗi lớp một vùng");
  $("vgXoaHat").click(); await sleep(300);
  ok(E("VG.pos.every(h => h.ma === 'X2')") && E("VG.pos.length") === 1, "Xoá điểm mẫu khi nhiều lớp: chỉ xoá lớp đang chọn");
  ok(E("VG.undo.filter(u => u.kieu === 'hat').length") === 2, "nhấp nút trong bảng (vẽ lại ngay khi nhấp) không lọt xuống bản đồ thành điểm mẫu");
  key("o");

  // ---------- tiếng Nga, tiếng Anh ở các trạng thái mới: không còn chữ tiếng Việt, không thiếu khoá
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100);
    key("o"); await sleep(50); E("select('E0001', false)");
    $("selCurveKind").value = "nam"; $("selCurveKind").onchange(); $("selCurveGrp").value = "s15"; $("selCurveGrp").onchange();
    await until(() => $("curve").querySelectorAll("circle").length > 5, 5000, "đồ thị theo năm " + L_);
    $("selDock").value = "duoi"; $("selDock").onchange(); E("pnThu(true)");
    await E("boMo('moi')"); $("boCach").value = "pt"; $("boCach").onchange(); await sleep(50);
    const sot = new Set(), wk = w.document.createTreeWalker(w.document.body, 4); let m;
    while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#msgs")) continue;
      const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|E0 thử|Tiếng Việt|Lưới 2 km Tây|Phân tầng|name~Cát/.test(t)) sot.add(t.slice(0, 70)); }
    [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Ngôn ngữ|: X\d|Tây|Đông|name~Cát/.test(v)) sot.add("@" + v.slice(0, 60)); }));
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không còn chữ tiếng Việt ở các phần mới (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 25).join("\n      ") : ""));
    $("dlgBo").close(); E("pnThu(false)"); $("selDock").value = "trai"; $("selDock").onchange(); key("o"); await sleep(50);
    $("selCurveKind").value = "ky"; $("selCurveKind").onchange();
  }
  E("setLang('vi')"); await sleep(100);
  ok(!errs.length, loiJS(errs));
  xong();
})().catch(e => { console.log("  LỖI ngoại lệ:", e.stack || e); process.exit(1); });
