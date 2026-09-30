// Bản 2.8: IR-MAD và hồi quy xu hướng trong bảng Phát hiện thay đổi; GeoTIFF có nodata, bảng màu, QML; độ trong suốt mọi lớp;
// kéo giãn cột, dải dưới, bảng nổi; xuất bản đồ JPEG có dpi (trình tự dựng; hình thật kiểm bằng Chromium)
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  const doi = (id, v) => { const e = $(id); if (v !== undefined) e.value = v; e.dispatchEvent(new w.Event("change")); };
  const docTif = async b => { w.__b = b; return E(`(async () => { const ab = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsArrayBuffer(window.__b); });
    const t = await GeoTIFF.fromArrayBuffer(ab), im = await t.getImage(), d = await im.readRasters({interleave: true});
    return {w: im.getWidth(), h: im.getHeight(), nd: im.getGDALNoData(), fmt: im.fileDirectory.SampleFormat, spp: im.getSamplesPerPixel(), cm: !!im.fileDirectory.ColorMap, e: im.getGeoKeys().ProjectedCSTypeGeoKey, d: Array.from(d)}; })()`); };
  E(`map.fitBounds(L.latLngBounds(VG.xa.flatMap(x => [[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]])), {animate: false})`);
  const G = {x0: 660000, y0: 2320000}, pix = (c, r) => E(`(() => { const ll = CORE.toLL(${G.x0 + 10 * c + 5}, ${G.y0 - 10 * r - 5}), q = CORE.llToPix(CD.kq.g, ll[0], ll[1]); return Math.floor(q[1]) * CD.kq.g.w + Math.floor(q[0]); })()`);

  // ---------- IR-MAD
  await E("cdMo(true)"); await sleep(200);
  doi("cdPP", "irmad");
  ok($("cdChuan").disabled && !$("cdNguong").querySelector('option[value="chi2"]').disabled && $("cdXhW").hidden && !$("cdDLW").hidden, "IR-MAD: tắt chuẩn hoá bức xạ (không cần), mở ngưỡng χ²");
  doi("cdPV", "tinh"); doi("cdNguong", "chi2"); ok(!$("cdChiW").hidden, "chọn ngưỡng χ² thì hiện mức ý nghĩa"); $("cdPL").value = "sobo";
  w.document.querySelectorAll('#cdP [data-cd]').forEach(c => { c.checked = ["s2", "cs"].includes(c.dataset.cd); });
  $("cdChay").click(); await until(() => E("CD.kq") && /xong/.test($("cdTrang").textContent), 60000, "IR-MAD");
  const p = E("CD.kq.ten.length"), rho = E("CD.kq.mad.rho");
  ok(E("CD.kq.pp") === "irmad" && rho.length === p && rho.every(r => r >= 0 && r < 1) && E("CD.kq.mad.it") >= 2, `IR-MAD chạy: ${p} đặc trưng, ${E("CD.kq.mad.it")} vòng, ρ ${Math.min(...rho).toFixed(3)} .. ${Math.max(...rho).toFixed(3)}`);
  ok(Math.abs(E("CD.kq.t") - Math.sqrt(E(`XH.chi2inv(0.99, ${p})`) / p)) < 1e-9 && E("CD.kq.tCach") === "chi2", "ngưỡng χ² 99 % quy ra độ lớn √(χ²/p)");
  const iPatch = pix(730, 315), iBinh = pix(100, 900);
  ok(E(`CD.kq.doi[${iPatch}]`) === 1 && E(`CD.kq.mag[${iPatch}]`) > 3 * E(`CD.kq.mag[${iBinh}]`), `mảng sáng bất thường năm 2023 được phát hiện (độ lớn ${E(`CD.kq.mag[${iPatch}]`).toFixed(1)}, chỗ thường ${E(`CD.kq.mag[${iBinh}]`).toFixed(2)})`);
  ok(/IR-MAD \(Nielsen 2007\)/.test($("cdTom").textContent) && /báo thừa/.test($("cdTom").textContent) && /tương quan chính tắc/.test($("cdBang").textContent), "nhận định ghi phương pháp, cảnh báo ngưỡng χ², bảng hệ số tương quan chính tắc");
  // GeoTIFF bản đồ loại thay đổi: 0 = không đổi, 255 = không có dữ liệu, kèm QML
  doi("cdXem", "loai"); let nb = blobs.length; $("cdTif").click(); await sleep(700);
  ok(blobs[nb] && blobs[nb].type === "image/tiff" && blobs[nb + 1] && blobs[nb + 1].type === "text/xml", "GeoTIFF + tệp kiểu QGIS");
  let tf = await docTif(blobs[nb]); const qml = await docBlob(blobs[nb + 1]);
  const nV = E("CD.kq.valid.reduce((s, v) => s + v, 0)"), nDoi = E("CD.kq.doi.reduce((s, v) => s + v, 0)");
  ok(tf.nd === 255 && tf.cm && tf.e === 3857 && tf.d.filter(v => v !== 255).length === nV && tf.d.filter(v => v === 0).length === nV - nDoi,
     `GeoTIFF thay đổi: nodata 255, bảng màu, 0 = không đổi (${nV - nDoi}), đúng số điểm ảnh có dữ liệu (${nV})`);
  ok(/value="0"[^>]*label="không đổi"/.test(qml) && /<paletteEntry value="\d+"/.test(qml), "QML có nhãn \"không đổi\" và các loại thay đổi");
  doi("cdXem", "do"); nb = blobs.length; $("cdTif").click(); await sleep(700);
  tf = await docTif(blobs[nb]);
  ok(tf.fmt[0] === 3 && Number.isNaN(tf.nd) && tf.d.filter(v => !Number.isNaN(v)).length === nV, "GeoTIFF độ lớn: Float32, NaN = không có dữ liệu");

  // ---------- hồi quy xu hướng (thêm năm 2024 có sẵn trong dữ liệu giả)
  E("MAN.s2d.nam = [2023, 2024, 2025]"); await E("cdMo(true)"); await sleep(100);
  doi("cdPP", "xh");
  ok(!$("cdXhW").hidden && $("cdDLW").hidden && $("cdCachW").hidden && $("cdAT").textContent === "Từ năm" && $("cdXem").querySelector('option[value="xlop"]') &&
     E("CD.kq") === null && $("cdKQ").hidden, "chế độ xu hướng: khối riêng, nhãn năm, cách xem riêng, bỏ kết quả cũ");
  $("cdA").value = "2023"; $("cdB").value = "2025"; doi("xhCS", "NDVI"); doi("xhCach", "ols"); doi("xhNg", "ma"); $("xhCap").checked = true;
  ok($("xhT1").value === "0.01" && $("xhT2").value === "0.03" && $("xhT1").disabled, "ngưỡng theo mã GEE 0.01 / 0.03");
  doi("xhNg", "bao"); ok($("xhT1").value === "0.1" && $("xhT2").value === "0.2", "ngưỡng theo bài Thủy Nguyên 0.1 / 0.2"); doi("xhNg", "ma");
  $("cdChay").click(); await until(() => E("CD.kq && CD.kq.kieu === 'xh'") && /xong/.test($("cdTrang").textContent), 60000, "hồi quy");
  const K = E("({nam: CD.kq.nam, tong: CD.kq.tong, s: [1,2,3,4,5].reduce((a, k) => a + CD.kq.dt[k], 0), cap: CD.kq.cap.map(c => Array.from(c.dt)), n: CD.kq.N})");
  ok(K.nam.join() === "2023,2024,2025" && Math.abs(K.s - K.tong) < 1e-6 * K.tong && K.cap.length === 2, `3 năm, tổng 5 cấp = diện tích có dữ liệu (${K.tong.toFixed(1)} ha), 2 cặp năm`);
  const kt = await E(`(async () => { const c = csLay("NDVI"), g = CD.kq.g, V = []; for (const y of [2023, 2024, 2025]) V.push(await xhDocCS(g, y, c));
    let md = 0, sai = 0, n = 0; for (let i = 0; i < g.w * g.h; i += 97) { if (!CD.kq.lop[i]) continue; const o = XH.olsMot([2023, 2024, 2025], V.map(a => a[i]));
      md = Math.max(md, Math.abs(o.slope - CD.kq.slope[i])); if (XH.lopXuHuong(o.slope, 0.01, 0.03) !== CD.kq.lop[i]) sai++; n++; } return {md, sai, n}; })()`);
  ok(kt.n > 100 && kt.md < 1e-5 && kt.sai === 0, `hệ số góc khớp OLS tính lại độc lập trên ${kt.n} điểm ảnh (sai lệch ${kt.md.toExponential(1)}), cấp đúng ngưỡng`);
  ok(K.cap[0][1] > K.cap[1][1] && K.cap[1][5] > K.cap[0][5], `dải mất NIR năm 2024: cặp 2023-2024 giảm mạnh ${K.cap[0][1].toFixed(1)} ha, cặp 2024-2025 tăng mạnh ${K.cap[1][5].toFixed(1)} ha`);
  ok($("cdMT").querySelectorAll("tr").length === 3 && $("cdBD").querySelectorAll("svg").length === 3 && /Theo cặp năm liền kề/.test($("cdTom").textContent) &&
     w.document.querySelector('#cdP [data-ctab="mt"]').textContent === "Cặp năm", "bảng cặp năm, 3 biểu đồ, nhận định theo cặp, tab đổi tên");
  const gt = await E(`(async () => { const ll = CORE.toLL(${G.x0 + 10 * 250 + 5}, ${G.y0 - 10 * 400 - 5}); const r = await giaTriTai({lat: ll[1], lng: ll[0]}); return r.map(x => x[0] + " | " + x[1]).join("\\n"); })()`);
  ok(/Δ NDVI 2023-2025/.test(gt) && /hệ số góc/.test(gt), "giá trị tại điểm có dòng xu hướng");
  doi("cdXem", "xslope"); ok(E("!!CD.hien && map.hasLayer(CD.hien)") && $("cdLeg").querySelector("i.ramp28"), "bản đồ hệ số góc, chú giải dải màu");
  nb = blobs.length; $("cdTif").click(); await sleep(700); tf = await docTif(blobs[nb]);
  ok(tf.spp === 2 && tf.fmt[0] === 3, "GeoTIFF hệ số góc: Float32 hai băng (hệ số góc, R²)");
  doi("cdXem", "xlop"); nb = blobs.length; $("cdTif").click(); await sleep(700); tf = await docTif(blobs[nb]);
  ok(tf.nd === 255 && tf.d.every(v => v === 255 || (v >= 1 && v <= 5)) && /Giảm mạnh|giảm mạnh/.test(await docBlob(blobs[nb + 1])), "GeoTIFF 5 cấp xu hướng, QML có tên cấp");
  nb = blobs.length; $("cdCSV").click(); await sleep(30); const csv = await docBlob(blobs[nb]);
  ok(csv.split("\n").filter(l => /^xu_huong,/.test(l)).length === 5 && csv.split("\n").filter(l => /^cap_nam,/.test(l)).length === 10, "CSV: 5 cấp + 2 cặp × 5 cấp");
  nb = blobs.length; E("bcThayDoi()"); await sleep(30); const h = await docBlob(blobs[nb]);
  ok(/<title>Xu hướng NDVI 2023-2025<\/title>/.test(h) && /<h2>Cặp năm<\/h2>/.test(h) && /OLS/.test(h), "báo cáo HTML xu hướng");
  // Mann–Kendall: với 3 năm |Z| lớn nhất là 1.04 < 1.96 nên không điểm ảnh nào có ý nghĩa: tính là ổn định
  doi("xhCach", "mk"); ok(!$("xhZW").hidden, "Mann–Kendall: hiện độ tin cậy");
  $("cdChay").click(); await until(() => E("CD.kq && CD.kq.cach === 'mk'") && /xong/.test($("cdTrang").textContent), 60000, "Mann–Kendall");
  ok(E("CD.kq.pSig") === 0 && Math.abs(E("CD.kq.dt[3]") - E("CD.kq.tong")) < 1e-6, "Mann–Kendall 3 năm: không có xu hướng ý nghĩa 95 %, mọi điểm ảnh ổn định (đúng lý thuyết)");
  E("MAN.s2d.nam = [2023, 2025]"); await E("cdMo(true)"); $("cdA").value = "2023"; $("cdB").value = "2025"; $("cdChay").click();
  await until(() => /Mann–Kendall cần ít nhất 3 năm/.test($("cdTrang").textContent), 5000, "báo lỗi 2 năm");
  ok(true, "Mann–Kendall với 2 năm: báo cần ít nhất 3 năm");
  E("MAN.s2d.nam = [2023, 2024, 2025]"); doi("xhCach", "ols"); $("cdA").value = "2023"; $("cdB").value = "2025";
  $("cdChay").click(); await until(() => E("CD.kq && CD.kq.cach === 'ols'") && /xong/.test($("cdTrang").textContent), 60000, "chạy lại OLS");

  // ---------- độ trong suốt
  E("v28Ve()"); const hang = [...$("opDS").querySelectorAll("[data-op]")].map(r => r.dataset.op);
  ok(hang.includes("cd") && hang.includes("diem"), `danh sách lớp đang hiện: ${hang.join(", ")}`);
  const rg = $("opDS").querySelector('[data-op="cd"]'); rg.value = "0.4"; rg.dispatchEvent(new w.Event("input"));
  ok(E("CD.hien.options.opacity") === 0.4 && E("V28.op.cd") === 0.4, "kéo thanh: lớp kết quả mờ 40 %");
  doi("cdXem", "xslope"); await sleep(20); ok(E("CD.hien.options.opacity") === 0.4, "vẽ lại kết quả vẫn giữ độ mờ đã chọn");
  E("VG.gXa && VG.gXa.addTo(map)"); E("v28Ve()"); const rx = $("opDS").querySelector('[data-op="xa"]');
  if (rx) { rx.value = "0.5"; rx.dispatchEvent(new w.Event("input")); }
  ok(rx && E("(() => { let ok = true, n = 0; const ap = l => { if (l.getLayers) { l.eachLayer(ap); return; } if (l._op28) { n++; ok = ok && Math.abs(l.options.opacity - l._op28.o * 0.5) < 1e-9; } }; ap(VG.gXa); return ok && n > 0; })()"),
     "ranh giới xã: độ mờ nét, nền nhân theo thanh");

  // ---------- kéo giãn
  E("V28.kt.side = 300; v28ApDung()");
  ok($("side").style.width === "300px" && !$("keoTrai").hidden, "cột bảng điều khiển 300 px, có tay kéo");
  w.document.body.classList.add("dk-duoi"); await sleep(30); E("V28.kt.duoi = 250; v28ApDung()");
  ok($("app").style.gridTemplateColumns.startsWith("300px") && $("app").style.gridTemplateRows === "minmax(0,1fr) 250px" && !$("keoDuoi").hidden && $("keoPhai").hidden,
     "dải dưới bản đồ cao 250 px, cột trái giữ 300 px");
  $("keoTrai").dispatchEvent(new w.MouseEvent("dblclick", {bubbles: true})); await sleep(10);
  ok(E("V28.kt.side") === undefined && !$("app").style.gridTemplateColumns, "nhấp đúp tay kéo: về độ rộng mặc định");
  w.document.body.classList.remove("dk-duoi"); E("V28.kt = {}; v28ApDung()");
  ok(["cdP", "tkP", "plP", "vung", "panel"].every(id => $(id).classList.contains("rz28")), "các bảng nổi kéo giãn được ở góc");

  // ---------- xuất bản đồ (jsdom: canvas giả; kiểm trình tự, chú giải, tên tệp, dpi)
  $("selBase").value = "none"; doi("selBase");
  E(`HTMLCanvasElement.prototype.toBlob = function (cb, t) { cb(new Blob([new Uint8Array([0xFF,0xD8,0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0,0xFF,0xD9])], {type: t})); }`);
  $("bXB").click(); await sleep(50);
  ok($("dlgXB").open && $("xbKho").options.length === 6 && /Nguồn/.test($("xbNguon").value) && /EPSG:3857/.test($("xbNguon").value), "hộp thoại xuất bản đồ, dòng nguồn tự điền");
  const cg = [...$("xbCG").querySelectorAll("[data-cg]")].map(i => i.dataset.cg);
  ok(cg.includes("cd") && cg.includes("vec"), `chú giải gồm: ${cg.join(", ")}`);
  const nhom = E("xbChuGiai().find(g => g.k === 'cd')");
  ok(nhom && /Xu hướng NDVI 2023-2025/.test(nhom.tieuDe), "nhóm chú giải lấy từ kết quả đang hiện");
  $("xbTieuDe").value = "Thử xuất"; doi("xbKho", "c2"); ok($("xbW").value === "17.5" && /2067 × 1417/.test($("xbTT").textContent), "khổ hai cột 17.5 × 12 cm ở 300 dpi = 2067 × 1417 điểm ảnh");
  nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất/.test($("xbTT").textContent) || /lỗi/.test($("xbTT").textContent), 20000, "xuất");
  const b = blobs[nb], u = b ? new Uint8Array(await new Promise(r => { const f = new w.FileReader(); f.onload = () => r(f.result); f.readAsArrayBuffer(b); })) : [];
  ok(b && b.type === "image/jpeg" && u[13] === 1 && u[14] * 256 + u[15] === 300 && /đã xuất ban_do_thu_xuat_300dpi_/i.test($("xbTT").textContent), `JPEG ghi 300 dpi, tên tệp theo tiêu đề (${$("xbTT").textContent.slice(0, 80)})`);
  doi("xbDD", "png"); $("xbXemBtn").click(); await until(() => /xem trước/.test($("xbTT").textContent) || /lỗi/.test($("xbTT").textContent), 20000, "xem trước");
  ok(/xem trước/.test($("xbTT").textContent), "xem trước dựng ở độ phân giải màn hình");
  $("xbDong").click(); doi("xbDD", "jpg");

  // ---------- dịch
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|\b(xem|nghi|so theo)\b/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100); await E("cdMo(true)"); $("bXB").click(); await sleep(50); E("v28Ve()");
    const sot = new Set();
    for (const goc of [$("cdP"), $("dlgXB"), $("opW")]) {
      const wk = w.document.createTreeWalker(goc, 4); let m;
      while ((m = wk.nextNode())) { const p_ = m.parentElement; if (!p_ || p_.closest("script,style,#cdAIKQ,textarea,#xbNguon")) continue; const t = m.nodeValue.trim();
        if (t && VI.test(t) && !/Tây|Đông|Thu|thử|Phạm Đăng Hiển|Thủy Nguyên|Xa Bac|Xa Nam/.test(t)) sot.add(t.slice(0, 70)); }
      [...goc.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v)) sot.add("@" + v.slice(0, 70)); }));
    }
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở phần 2.8 (sót ${sot.size}, T_MISS ${miss.length})` + (sot.size + miss.length ? "\n      " + [...sot, ...miss].slice(0, 25).join("\n      ") : ""));
    $("xbDong").click();
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
