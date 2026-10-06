// Bản 3.0: Landsat 1987-2026 là nguồn ảnh quang học thứ hai. Dữ liệu giả dựng bằng đúng hàm của ô Colab (mk_fx30.py).
const {execSync} = require("child_process"), fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang} = require("./trang");
if (!fs.existsSync("/tmp/fx/data/manifest_ls.json") || !fs.existsSync("/tmp/fx/ref_ls.json")) execSync("python3 " + __dirname + "/mk_fx30.py");
const REF = JSON.parse(fs.readFileSync("/tmp/fx/ref_ls.json", "utf8"));
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.0", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  ok(E("coLS()") === false && !$("ols").textContent.includes("Landsat"), "bộ dữ liệu chưa có Landsat: không hiện gì thêm");
  // gộp mục Landsat vào manifest (như ô cuối của notebook ls_HF_LANDSAT)
  await E(`fetch("http://127.0.0.1:8765/manifest_ls.json").then(r => r.json()).then(X => { MAN.ls = X.ls; MAN.lspc = X.lspc; MAN.layers = MAN.layers.concat(X.layers); buildOverlays(); buildStripSelect(); })`);
  await sleep(50);

  // ---------- 1. bảng lớp: nhóm Landsat cuối danh sách, lớp tính trong trình duyệt, embedding S2 không lẫn Landsat
  const ol = [...$("ols").children].map(d => d.className + ":" + d.textContent.trim().slice(0, 40));
  const iH = ol.findIndex(s => s.startsWith("olh:Landsat 1987-2026"));
  ok(iH > 0 && /Landsat 6 băng/.test(ol[iH + 1]) && ol.length - iH - 1 === 9, "bảng lớp: tiêu đề nhóm Landsat, lớp 6 băng và 8 lớp Landsat ở cuối (" + (ol.length - iH - 1) + " mục)");
  ok(E("embLayers().map(l => l.id).join()") === "g7,g7b" && E("lsEmbLayers().map(l => l.id).join()") === "lsg,lsgb", "embedding S2 (g7, g7b) và Landsat (lsg, lsgb) tách riêng");
  ok(!!w.document.querySelector("[data-lsv] [data-k=mode]") && [...w.document.querySelectorAll("[data-lsv] [data-k=nam] option")].filter(o => o.value).length === 5, "lớp 6 băng có chọn cách xem và 5 năm Landsat");

  // ---------- 2. vẽ lớp 6 băng: tổ hợp màu đúng kéo giãn chung, nguồn điểm ảnh, cảm biến, chỉ số, chỗ trống
  const D0 = REF.diem[0], D1 = REF.diem[1];
  const veDiem = (d, y, h = 0) => E(`(async () => {
    const m = CORE.to3857(${d.lon}, ${d.lat}), bb = [m[0] - 3, m[1] - 3 - ${h}, m[0] + 3, m[1] + 3 - ${h}];
    const px = await lsdVe(CORE.dataUrl(CFG, MAN.ls.duong_dan.replace("{y}", ${y})), bb, 2, 2, 16, null); return px ? Array.from(px.slice(0, 4)) : null; })()`);
  E(`LSV.mode = "rgb"; LSV.pre = "tn"; LSV.gain = 1`);
  const K = E("lsKeo()"), sr = D0.nam["2010"].sr, kv = [2, 1, 0].map(b => Math.round(255 * Math.max(0, Math.min(1, (sr[b] - K.lo[b]) / (K.hi[b] - K.lo[b])))));
  const px = await veDiem(D0, 2010);
  ok(px && px.slice(0, 3).every((v, i) => Math.abs(v - kv[i]) <= 1) && px[3] === 255, `màu thật 2010 tại điểm: ${px} = kéo giãn chung từ phản xạ ${kv}`);
  E(`LSV.mode = "nguon"`);
  const oHang = r => { const ll = E(`CORE.toLL(${D0.x}, ${REF.L.khung[3]} - 30 * ${r} - 15)`); return {lon: ll[0], lat: ll[1]}; };
  const pN = await veDiem(oHang(10), 2010), pN2 = await veDiem(oHang(30), 2010);
  ok(pN && pN.join() === "253,174,97,255" && pN2 && pN2.join() === "215,25,28,255", `nguồn điểm ảnh: hàng 10 = một quan sát (cam), hàng 30 = mượn năm lân cận (đỏ)`);
  E(`LSV.mode = "cb"`);
  const pC = await veDiem(D0, 2023), pC0 = await veDiem(D0, 1990);
  ok(pC && pC.join() === "247,129,191,255" && pC0 && pC0.join() === "228,26,28,255", "cảm biến: 2023 OLI + OLI-2, 1990 TM");
  E(`LSV.mode = "idx"; LSV.chi = "NDVI"`);
  const nd = E(`(() => { const c = lsCsLay("NDVI"), s = ${JSON.stringify(D0.nam["2010"].sr)}; return c.f(s.map(v => v / 10000)); })()`);
  const s10 = D0.nam["2010"].sr;
  ok(Math.abs(nd - (s10[3] - s10[2]) / (s10[3] + s10[2])) < 1e-9 && (await veDiem(D0, 2010))[3] === 255, `NDVI theo 6 băng Landsat: ${nd.toFixed(4)} đúng công thức`);
  const B5 = E(`(() => { const i = CHISO_IDB.ds.findIndex(x => /\\bB0?5\\b/.test(x.bt) && !/\\bB0?[67]\\b/.test(x.bt)); const id = "idb:" + (i + 1); return {id, s2: !!(csLay(id) || {}).f, ls: lsCsLay(id)}; })()`);
  ok(B5.s2 && B5.ls === null, `chỉ số cần B5 (${B5.id}): dùng được với S2, Landsat báo không có băng`);
  E(`LSV.mode = "temp"`);
  ok((await veDiem(D0, 2025))[3] === 255, "nhiệt độ bề mặt vẽ được");
  E(`LSV.mode = "rgb"`);
  const goc = await E(`(async () => { const ll = CORE.toLL(${REF.L.khung[0]} + 45, ${REF.L.khung[3]} - 45), m = CORE.to3857(ll[0], ll[1]);
    const px = await lsdVe(CORE.dataUrl(CFG, MAN.ls.duong_dan.replace("{y}", 2010)), [m[0] - 3, m[1] - 3, m[0] + 3, m[1] + 3], 2, 2, 16, null); return px ? px[3] : -1; })()`);
  ok(goc === 0, "điểm ảnh nodata (-32768) để trống");

  // ---------- 3. chọn năm Landsat ngoài các năm S2; dải ảnh theo năm
  E(`OVL.lsd.on = true; refreshOverlays()`);
  const sel = w.document.querySelector("[data-lsv] [data-k=nam]"); sel.value = "1990"; sel.dispatchEvent(new w.Event("change")); await sleep(50);
  ok(E("ST.nam") === 1990 && OVLspan(E) === "1990", "chọn năm 1990 ngay trong lớp: lớp Landsat hiện năm 1990");
  ok(E(`OVL.lsd.layer instanceof LSDLayer`) && /không có năm 1990/.test(E(`OVL.s2d ? OVL.s2d.span.textContent : "không có năm 1990"`)), "lớp S2 báo không có năm 1990");
  E(`PROBE = CORE.newPoint("⌖", ${D1.lon}, ${D1.lat}, {bo: ""}); $("selStrip").value = "lsd"; renderStrip()`);
  await until(() => E(`$("strip").querySelectorAll(".it").length`) >= 6, 4000, "dải ảnh");
  const it = E(`[...$("strip").querySelectorAll(".it .lb")].map(e => e.textContent).join()`);
  ok(it === "1990,2000,2010,2023,2024,2025", "dải ảnh Landsat: " + it + " (2024 không có ảnh Landsat)");

  // ---------- 4. giá trị tại điểm, mọi năm: đúng từng số; PC tính từ phản xạ khớp ls_pca (Python) và ảnh lspc
  const A = await E(`lsAt(CORE.newPoint("⌖", ${D0.lon}, ${D0.lat}, {bo: ""}))`);
  const dung = Object.entries(D0.nam).every(([y, d]) => A[y] && A[y].sr.join() === d.sr.join() && A[y].temp === d.temp && A[y].nguon === d.nguon && A[y].cb === d.cb);
  ok(dung && Object.keys(A).length === 5, "lsAt: 6 băng, nhiệt độ, nguồn, cảm biến đúng từng số ở 5 năm");
  const pc = E(`lsPC(${JSON.stringify(D0.nam["2023"].sr)})`), pr = D0.nam["2023"].pc, pa = D0.nam["2023"].pc_anh;
  ok(pc.every((v, i) => Math.abs(v - pr[i]) < 1e-9) && pc.every((v, i) => Math.abs(v - pa[i] / 100) <= 0.0051),
     `PC trong trang = PC của ls_pca (Python): ${pc.map(v => v.toFixed(3))}; khớp ảnh lspc × 100 trong sai số làm tròn`);
  const AN = {};
  for (const g of ["ls", "lsidx", "lspc", "lsemb", "lst"]) AN[g] = await E(`annualFor(CORE.newPoint("⌖", ${D0.lon}, ${D0.lat}, {bo: ""}), "${g}")`);
  ok(AN.ls.names.length === 6 && Object.keys(AN.ls.ys).length === 5 && AN.ls.ys["1990"].join() === D0.nam["1990"].sr.join(), "đồ thị theo năm: Landsat 6 băng, 5 năm");
  ok(AN.lspc.ys["2010"].every((v, i) => Math.abs(v - D0.nam["2010"].pc[i]) < 1e-9) && AN.lst.ys["2025"][0] === D0.nam["2025"].temp, "đồ thị: PC và nhiệt độ đúng");
  const iN = AN.lsidx.names.indexOf("NDVI"), nd23 = AN.lsidx.ys["2023"][iN], nd10 = AN.lsidx.ys["2010"][iN];
  ok(iN >= 0 && nd23 < nd10 - 0.3, `đồ thị chỉ số: NDVI tại dải đô thị hoá giảm ${nd10.toFixed(2)} -> ${nd23.toFixed(2)}`);
  const e0 = AN.lsemb.ys["2010"], ek = D0.nam["2010"].sr.map(v => (v - 1500) / 1500);
  ok(AN.lsemb.names.length === 6 && e0.every((v, i) => Math.abs(v - ek[i]) < 0.03), "đồ thị embedding Landsat: 6 thành phần đổi từ 8 bit theo phép chiếu");
  const nhom = E(`NHOM_NAM.filter(g => g.co()).map(g => g.id).join()`);
  ok(/ls,lsidx,lspc,lsemb,lst/.test(nhom), "nhóm đồ thị theo năm có đủ 5 nhóm Landsat");
  E("setYear(2023)");
  const gt = await E(`giaTriTai(L.latLng(${D0.lat}, ${D0.lon})).then(r => r.map(x => x[0] + " | " + x[1]).join("\\n"))`);
  ok(/Landsat 2023 \| BLUE \d+ · GREEN \d+ · RED 1500 · NIR 1200/.test(gt) && /nguồn điểm ảnh/.test(gt) && /OLI \+ OLI-2/.test(gt) && /Landsat: PC 2023/.test(gt),
     "bảng giá trị tại điểm: phản xạ, nhiệt độ, nguồn, cảm biến, chỉ số, PC của năm đang xem");

  // ---------- 5. phát hiện thay đổi, IR-MAD và xu hướng trên Landsat
  E(`map.fitBounds([[${REF.diem[0].lat} - 0.04, ${REF.diem[0].lon} - 0.02], [${REF.diem[0].lat} + 0.03, ${REF.diem[1].lon} + 0.03]])`);
  E("cdMo(true)"); await sleep(100);
  ok(!$("cdNguonW").hidden && [...$("cdNguonAnh").options].map(o => o.value).join() === "s2,ls", "bảng thay đổi có ô Nguồn ảnh (Sentinel-2, Landsat)");
  $("cdNguonAnh").value = "ls"; $("cdNguonAnh").dispatchEvent(new w.Event("change")); await sleep(100);
  ok([...$("cdA").options].map(o => o.value).join() === "1990,2000,2010,2023,2025" && /Landsat 6 băng/.test($("cdDLW").textContent), "chọn Landsat: năm 1990-2025, nhóm dữ liệu đổi tên");
  $("cdPP").value = "cva"; $("cdPP").dispatchEvent(new w.Event("change"));
  $("cdA").value = "2010"; $("cdB").value = "2023"; $("cdPV").value = "nhin"; $("cdNguong").value = "otsu"; $("cdPL").value = "sobo";
  w.document.querySelectorAll('#cdP [data-cd]').forEach(c => { c.checked = ["s2", "cs"].includes(c.dataset.cd); });
  $("cdChay").click();
  await until(() => /xong|lỗi/.test($("cdTrang").textContent), 60000, "thay đổi Landsat");
  const kiemDai = `(() => { const K = CD.kq, g = K.g, L0 = ${JSON.stringify(REF.L)}; let trong = 0, ngoai = 0, nTrong = 0;
    for (let j = 0; j < g.h; j += 2) for (let i = 0; i < g.w; i += 2) { const k = j * g.w + i; if (!K.valid[k]) continue;
      const mx = g.bb[0] + (i + 0.5) * (g.bb[2] - g.bb[0]) / g.w, my = g.bb[3] - (j + 0.5) * (g.bb[3] - g.bb[1]) / g.h, ll = CORE.m2ll(mx, my), u = CORE.toUTM(ll[0], ll[1]);
      const c = Math.floor((u[0] - L0.khung[0]) / 30), r = Math.floor((L0.khung[3] - u[1]) / 30), o = c >= ${REF.cot[0] + 1} && c < ${REF.cot[1] - 1} && r > 45, x = K.kieu === "xh" ? K.lop[k] <= 2 : K.doi[k];
      if (o) { nTrong++; if (x) trong++; } else if (x && c > 0 && (c < ${REF.cot[0] - 1} || c > ${REF.cot[1] + 1})) ngoai++; }
    return {trong, nTrong, ngoai, nguon: K.nguon}; })()`;
  let r = E(kiemDai);
  ok(/xong/.test($("cdTrang").textContent) && r.nguon === "ls" && r.trong / r.nTrong > 0.9 && r.ngoai < 0.02 * r.nTrong,
     `CVA Landsat 2010 -> 2023: ${r.trong}/${r.nTrong} điểm của dải đô thị hoá là thay đổi, ngoài dải ${r.ngoai}`);
  $("cdPP").value = "irmad"; $("cdPP").dispatchEvent(new w.Event("change")); $("cdNguong").value = "chi2";
  $("cdChay").click(); await until(() => /xong|lỗi/.test($("cdTrang").textContent), 60000, "IR-MAD Landsat");
  r = E(kiemDai);
  ok(/xong/.test($("cdTrang").textContent) && r.trong / r.nTrong > 0.9, `IR-MAD Landsat: ${r.trong}/${r.nTrong} điểm trong dải là thay đổi (${$("cdTrang").textContent.slice(0, 60)})`);
  $("cdPP").value = "xh"; $("cdPP").dispatchEvent(new w.Event("change")); await sleep(50);
  $("cdA").value = "1990"; $("cdB").value = "2025"; $("xhCS").value = "NDVI"; $("xhCach").value = "ols"; $("xhNg").value = "ma"; $("xhNg").dispatchEvent(new w.Event("change"));
  $("cdChay").click(); await until(() => /xong|lỗi/.test($("cdTrang").textContent), 60000, "xu hướng Landsat");
  r = E(kiemDai);
  ok(/xong: 5 năm/.test($("cdTrang").textContent) && r.nguon === "ls" && r.trong / r.nTrong > 0.9, `xu hướng NDVI 1990-2025 (5 năm Landsat): ${r.trong}/${r.nTrong} điểm dải đô thị hoá ở cấp giảm`);
  $("xhCS").innerHTML += `<option value="${B5.id}">B5</option>`; $("xhCS").value = B5.id;
  $("cdChay").click(); await until(() => /lỗi/.test($("cdTrang").textContent), 10000, "chỉ số cần B5");
  ok(/Landsat không có/.test($("cdTrang").textContent), "xu hướng với chỉ số cần B5 trên Landsat: báo lỗi dễ hiểu");
  $("cdNguonAnh").value = "s2"; $("cdNguonAnh").dispatchEvent(new w.Event("change")); await sleep(100);
  ok([...$("cdA").options].map(o => o.value).join() === "2023,2025" && /S2 10 băng/.test($("cdDLW").textContent), "về Sentinel-2: năm 2023, 2025");

  // ---------- 6. ngôn ngữ
  E(`setLang("ru")`); await sleep(50);
  const ru = $("ols").textContent, sl = w.document.querySelector("[data-lsv] [data-k=mode]").textContent;
  ok(/Landsat 1987-2026/.test(ru) && /температура поверхности/.test(sl) && /источник пикселя/.test(sl), "tiếng Nga: lớp Landsat và các cách xem");
  E(`setLang("en")`); await sleep(50);
  ok(/Landsat 6 bands/.test($("ols").textContent) && /Imagery source/.test($("cdNguonW").textContent), "tiếng Anh: lớp và ô nguồn ảnh");
  const miss = E(`Object.keys(T_MISS || {}).filter(k => /Landsat|nhiệt độ|nguồn điểm|cảm biến/.test(k))`);
  ok(!miss || !miss.length, "không còn chữ tiếng Việt chưa dịch của bản 3.0: " + JSON.stringify(miss));
  ok(!errs.filter(e => !/Could not load|ECONNREFUSED|arcgis|tile|wayback/i.test(e)).length, "không lỗi JavaScript: " + errs.slice(0, 2).join(" | ").slice(0, 300));
  xong();
})();
function OVLspan(E) { return E("OVL.lsd.span.textContent"); }
