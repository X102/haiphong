// Bản 2.4: thư viện 248 chỉ số S2 + công thức tự nhập (biên dịch an toàn), DEM (độ cao, độ dốc, bóng địa hình),
// giá trị tại điểm khi nhấp, đặc trưng so sánh mở rộng (S2, chỉ số, CTX, PC, DEM), dòng điểm tra cứu ở dải dưới bản đồ
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json"), RD = require("/tmp/fx/ref_dem.json");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "2.4", "bản 2.4");

  // ---------- biên dịch công thức
  const BT = (bt, v) => E(`(() => { try { return CORE.bieuThuc(${JSON.stringify(bt)}, CORE.S2_BANDS, CHISO_IDB.hang)(${JSON.stringify(v || [0.03, 0.06, 0.03, 0.10, 0.30, 0.38, 0.40, 0.42, 0.20, 0.10])}); } catch (e) { return "LỖI " + e.message; } })()`);
  const v0 = [0.03, 0.06, 0.03, 0.10, 0.30, 0.38, 0.40, 0.42, 0.20, 0.10];
  ok(gan(BT("(B8 - B4) / (B8 + B4)"), E(`CORE.indices(${JSON.stringify(v0.map(x => x * 10000))})[0]`), 1e-9) && gan(BT("(NIR - RED) / (nir + red)"), 0.37 / 0.43, 1e-12) &&
     gan(BT("(B08 - B04) / (B08 + B04)"), 0.37 / 0.43, 1e-12), "NDVI tự nhập trùng CORE.indices; B08, NIR, nir đều hiểu");
  ok(BT("2**3") === 8 && BT("2^3") === 8 && BT("-2**2") === -4 && BT("2**-1") === 0.5 && BT("sqrt(4) + abs(-1) + min(1, 2) + max(1, 2)") === 6 && gan(BT("log(exp(2))"), 2, 1e-12),
     "luỹ thừa như Python (-2**2 = -4), ^ cũng là luỹ thừa, các hàm");
  ok(gan(BT("a_35 * B04"), 0.331 * 0.03, 1e-12), "hằng số của thư viện (a_35 = 0.331)");
  const loi = [BT("B1 + B2"), BT("(B8 - B4"), BT("constructor"), BT("alert(1)"), BT("B8; x"), BT("")];
  ok(loi.every(x => typeof x === "string" && x.startsWith("LỖI")) && /B1/.test(loi[0]) && /\)/.test(loi[1]) && /constructor/.test(loi[2]) && /alert/.test(loi[3]),
     `công thức sai hoặc chèn mã đều bị từ chối: ${loi.map(x => String(x).slice(4, 40)).join(" | ")}`);
  ok(BT("B8 / (B4 - B4)") === null, "chia cho 0 cho giá trị trống (không phải Infinity)");
  const idb = E(`(() => { let n = 0, bad = [], huu = 0; CHISO_IDB.ds.forEach(x => { if (x.thieu.length) return; n++;
      try { const f = CORE.bieuThuc(x.bt, CORE.S2_BANDS, CHISO_IDB.hang), r = f([0.03, 0.06, 0.03, 0.10, 0.30, 0.38, 0.40, 0.42, 0.20, 0.10]); if (r != null) huu++; } catch (e) { bad.push(x.id + ": " + e.message); } });
      return {tong: CHISO_IDB.ds.length, n, bad, huu}; })()`);
  ok(idb.tong === 248 && idb.n === 228 && idb.bad.length === 0 && idb.huu > 200, `thư viện: 248 chỉ số, 228 tính được (thiếu B1/B9/B10: 20), mọi công thức biên dịch được, ${idb.huu} cho giá trị hữu hạn trên phổ thực vật` + (idb.bad.length ? " " + idb.bad.slice(0, 3).join("; ") : ""));

  // ---------- hộp chỉ số: thư viện, tự nhập
  E("csMo()"); await sleep(30);
  ok($("dlgCS").open && $("csDung").querySelectorAll("[data-id]").length === 5 && $("csThuVien").querySelectorAll("tr[data-id]").length === 150, "mở hộp Chỉ số: 5 đang dùng, thư viện hiện 150 dòng đầu");
  $("csTim").value = "enhanced vegetation"; $("csTim").oninput();
  const evi = [...$("csThuVien").querySelectorAll("tr[data-id]")].map(t => t.dataset.id);
  ok(evi.includes("idb:32") && evi.length >= 2, `tìm "enhanced vegetation": ${evi.join(", ")}`);
  $("csThuVien").querySelector('tr[data-id="idb:32"] [data-a="them"]').click(); await sleep(30);
  ok(E("ST.chiso.dung.includes('idb:32')") && [...$("dlgCS").querySelectorAll("#csDung b")].some(b => b.textContent === "EVI"), "＋ thêm EVI (IDB 32) vào danh sách đang dùng");
  $("csTim").value = "ndvi"; $("csTim").oninput();
  ok([...$("csThuVien").querySelectorAll("tr[data-id] b")].some(b => /^NDVI·\d+$/.test(b.textContent)), "tên trùng (nhiều công thức NDVI) có số thứ tự IDB để phân biệt");
  $("csTim").value = "B09"; $("csTim").oninput();
  ok($("csThuVien").querySelectorAll("tr.tat").length > 0 && !$("csThuVien").querySelector("tr.tat [data-a=them]"), "chỉ số cần B9 bị làm mờ, không thêm được");
  $("csBT").value = "(B11 - B12) / (B11 + (B12"; $("csThu").click();
  ok(/lỗi công thức/.test($("csTT").textContent), "kiểm tra công thức sai: báo lỗi");
  $("csTen").value = "NDTI"; $("csBT").value = "(SWIR1 - SWIR2) / (SWIR1 + SWIR2)"; $("csThu").click();
  ok(/hợp lệ, dùng B11, B12/.test($("csTT").textContent), "kiểm tra công thức đúng: nêu băng dùng và khoảng trên phổ mẫu");
  $("csThem").click(); await sleep(30);
  const uid = E("ST.chiso.tu[0] && ST.chiso.tu[0].id");
  ok(uid && E(`ST.chiso.dung.includes('${uid}')`) && E("ST.chiso.tu[0].ten") === "NDTI", "＋ thêm công thức tự nhập NDTI vào danh sách");
  const r0 = $("csDung").querySelector(`[data-id="${uid}"]`); r0.querySelector('[data-k="lo"]').value = "-0.1"; r0.querySelector('[data-k="hi"]').value = "0.3"; r0.querySelector('[data-k="hi"]').onchange();
  ok(JSON.stringify(E(`ST.chiso.khoang['${uid}']`)) === "[-0.1,0.3]", "đặt khoảng hiển thị riêng cho NDTI");
  $("csDong").click();

  // ---------- chỉ số ở lớp S2, đồ thị theo năm
  const opts = E(`[...document.querySelectorAll('[data-s2v] [data-k="chi"] option')].map(o => o.value)`);
  ok(opts.includes("idb:32") && opts.includes(uid) && opts.includes("__them"), "chọn chỉ số của lớp S2 lấy theo danh sách đang dùng, có mục ＋ chỉ số khác");
  const px = await E(`(async () => { S2V.mode = "idx"; S2V.chi = "${uid}"; const t = await tiffOf(CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", 2025)));
      const m = CORE.to3857(${RV.lang[0][0]}, ${RV.lang[0][1]}); const px = await s2dVe(CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", 2025)), [m[0] - 300, m[1] - 300, m[0] + 300, m[1] + 300], 32, 32, 16, null);
      const need = s2Need(); return {n: px ? px.filter((v, i) => i % 4 === 3 && v).length : -1, bands: need.bands}; })()`);
  ok(px.n > 900 && JSON.stringify(px.bands) === "[8,9]", `lớp S2 chế độ chỉ số NDTI: chỉ đọc B11, B12 (${JSON.stringify(px.bands)}), tô ${px.n} / 1024 điểm ảnh`);
  E("S2V.mode = 'rgb'");
  E("select('E0001', false)"); $("selCurveKind").value = "nam"; $("selCurveKind").onchange(); $("selCurveGrp").value = "idx"; $("selCurveGrp").onchange();
  await until(() => /NDTI/.test($("curve").textContent), 6000, "đồ thị theo năm có NDTI");
  const nd = E(`(async () => { const A = await annualFor(cur(), "idx"), d = (await s2dAt(cur()))[2025], i = A.names.indexOf("NDTI"); return {v: A.ys[2025][i], k: (d.v[8] - d.v[9]) / (d.v[8] + d.v[9]), names: A.names}; })()`);
  const ndv = await nd;
  ok(ndv.names.includes("EVI") && gan(ndv.v, ndv.k, 1e-9), `đồ thị theo năm, nhóm chỉ số: có EVI, NDTI; NDTI tại điểm = (B11 − B12)/(B11 + B12) = ${ndv.k.toFixed(4)}`);
  ok(E("cvChiSo(['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12']).map(c => c.ten)").includes("NDTI") && E("cvChiSo(['NDVI','MNDWI','B8']).length") === 0,
     "đường mùa vụ 6 kỳ: chỉ số tính được khi PC tái dựng đủ các băng nó cần");
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange();

  // ---------- DEM
  ok(E("!!MAN.dem") && E("OVL.dem && OVL.dem.L0.kieu") === "dem" && !!$("ols").querySelector("[data-dem] select"), "DEM có trong bảng lớp, có chọn cách hiển thị");
  const doc = E(`(() => { const a = new Int16Array(25); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) a[y * 5 + x] = x * 100; const G = demDoc(a, 5, 5, 10, 0.1, -32768); return [G.doc[12], G.bong[12]]; })()`);
  ok(gan(doc[0], 45, 1e-6) && doc[1] > 0, `độ dốc Horn: mặt nghiêng 10 m / 10 m = ${doc[0].toFixed(2)}°`);
  const dd = await E(`demAt(CORE.newPoint("x", ${RD.dinh[0]}, ${RD.dinh[1]}))`);
  const ds = await E(`demAt(CORE.newPoint("x", ${RD.dinh[0] + 0.009}, ${RD.dinh[1]}))`);
  ok(dd && gan(dd.cao, RD.cao, 1.5) && dd.doc < 2 && ds && ds.doc > 3, `độ cao tại đỉnh đồi ${dd && dd.cao.toFixed(1)} m (≈ ${RD.cao}), dốc ${dd && dd.doc.toFixed(1)}°; sườn đồi dốc ${ds && ds.doc.toFixed(1)}°`);
  const dv = await E(`(async () => { const out = {}; for (const m of ["cao", "doc", "bong", "caobong"]) { DEMV.mode = m; const c = CORE.to3857(${RD.dinh[0]}, ${RD.dinh[1]});
      const px = await demVe(CORE.dataUrl(CFG, MAN.dem.duong_dan), [c[0] - 2000, c[1] - 2000, c[0] + 2000, c[1] + 2000], 64, 64, null); out[m] = px ? px.filter((v, i) => i % 4 === 3 && v).length : -1; } DEMV.mode = "caobong"; return out; })()`);
  ok(Object.values(dv).every(n => n === 4096), `ô DEM vẽ đủ ở mọi cách hiển thị ${JSON.stringify(dv)}`);

  // ---------- giá trị tại điểm
  E("OVL.s2tc.on = true; OVL.lulc_ctx.on = true; OVL.g7.on = true; refreshOverlays()");
  const rows = await E(`giaTriTai(L.latLng(${RV.lang[2][1]}, ${RV.lang[2][0]}))`), txt = rows.map(r => r[0] + ": " + r[1].replace(/<[^>]+>/g, "")).join("\n");
  ok(/xã, phường: Đông/.test(txt) && /CTX.*:\s+(thực vật|nước|xây dựng)/.test(txt) && /S2 màu thật.*R \d+/.test(txt) && /Embedding g7.*1: -?\d/.test(txt) &&
     /chỉ số 2025: NDVI -?\d.*EVI.*NDTI/.test(txt) && /DEM: độ cao \d+(\.\d)? m/.test(txt), "giá trị tại điểm: xã, lớp CTX, màu S2, embedding (đổi từ 8 bit), chỉ số đang dùng, DEM\n      " + txt.split("\n").join("\n      "));
  E(`showInfo(L.latLng(${RV.lang[2][1]}, ${RV.lang[2][0]}))`);
  await until(() => infoTbl(), 5000, "bảng giá trị trong khung thông tin");
  function infoTbl() { const e = w.document.querySelector(".leaflet-popup [data-gt] table"); return e && e.querySelectorAll("tr").length >= 5; }
  ok(infoTbl() && !!w.document.querySelector(".leaflet-popup .lk"), "khung thông tin điểm: bảng giá trị ở trên, liên kết ngoài ở dưới");
  E("map.closePopup()");
  E(`traDat(L.latLng(${RV.lang[2][1]}, ${RV.lang[2][0]}))`);
  await until(() => $("vzNguon").querySelector("details.gt-tai table"), 5000, "giá trị ở dòng điểm tra cứu");
  ok(/DEM/.test($("vzNguon").querySelector("details.gt-tai").textContent), "dòng điểm tra cứu có bảng giá trị tại điểm (mở / đóng được)");
  ok([...w.document.querySelectorAll("style")].some(s => /body\.dk-duoi #viz \.vz-ng\{grid-column:1\/-1/.test(s.textContent)), "dải dưới bản đồ: dòng điểm tra cứu trải hết chiều ngang, không chiếm cột dải ảnh");
  E("OVL.s2tc.on = false; OVL.lulc_ctx.on = false; OVL.g7.on = false; refreshOverlays(); traBo()");

  // ---------- đặc trưng so sánh mở rộng
  key("o"); await sleep(60);
  const ids = E("vgNguonDT().map(d => d.id)");
  ok(["g7", "s2:B2", "s2:B12", "cs:NDVI", "cs:idb:32", "cs:" + uid, "ctx:m5", "ctx:s15", "pc:1", "dem:cao", "dem:doc"].every(i => ids.includes(i)) &&
     $("vgDT").querySelectorAll("details[data-nh]").length === 6, `đặc trưng so sánh: 6 nhóm, ${ids.length} mục (ảnh 8 bit, S2, chỉ số, CTX, PC, DEM)`);
  const P = RD.dinh;
  E(`map.setView([${P[1]}, ${P[0]}], 13, {animate: false})`);
  const chon = async (arr, extra) => {
    E(`VG.pos = []; VG.neg = []; vgXoaKQ(); ls("laymau_hp_vung_dt_v1", ${JSON.stringify(arr)}); vgVeDT(); VG.data = null;
       vg$('vgPV').value = 'nhin'; vg$('vgHL').value = 'all'; vg$('vgTru').value = 'khong'; vg$('vgMin').value = '0'; vg$('vgTau').value = '${extra || 0.03}'`);
    E(`map.fire("click", {latlng: L.latLng(${P[1]}, ${P[0]}), originalEvent: {}})`);
    await until(() => E("VG.kq && VG.data && VG.data.ids.split(',').sort().join()") === arr.slice().sort().join(), 15000, "vùng theo " + arr.join());
  };
  await chon(["dem:cao"]);
  const dk = await E(`(async () => { const D = await demLuoi(VG.data.g), m = VG.kq.masks[VG.kq.lops[0]]; let n = 0, thap = 0, mn = 1e9;
      for (let i = 0; i < m.length; i++) if (m[i]) { n++; mn = Math.min(mn, D.cao[i]); if (D.cao[i] < 100) thap++; } return {n, thap, mn, nf: VG.data.nf}; })()`);
  ok(dk.n > 20 && dk.thap === 0 && dk.nf === 1, `chọn vùng chỉ theo độ cao, mẫu ở đỉnh đồi: ${dk.n} điểm ảnh, thấp nhất ${dk.mn.toFixed(1)} m (đều trên 100 m)`);
  await chon(["s2:B4", "ctx:m5", "cs:NDVI", "pc:1"], 0.2);
  ok(E("VG.data.nf") === 1 + 10 + 1 + 1 && E("VG.kq.st[VG.kq.lops[0]].n_px") > 0 && E("JSON.stringify(Object.keys(VG.data.sc))") === '["pc:1"]',
     `S2 + CTX (10 băng) + chỉ số + PC: ${E("VG.data.nf")} kênh; chỉ PC dùng phân vị (giữ khi so sánh các năm)`);
  E("VG.pos = []; vgXoaKQ()");
  E(`map.setView([${RV.lang[0][1]}, ${RV.lang[0][0]}], 14, {animate: false})`);
  await chon(["cs:NDVI", "s2:B8"], 0.2);
  await E("vgNam9()");
  ok(E("VG.nam && VG.nam.ys.join()") === "2023,2025", "so sánh các năm chạy được với đặc trưng chỉ số, băng S2 (năm có ảnh S2 10 băng)");
  E("VG.pos = []; vgXoaKQ(); ls('laymau_hp_vung_dt_v1', null); vgVeDT()"); key("o");

  // ---------- tiếng Nga, tiếng Anh
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100);
    key("o"); await sleep(50); E(`traDat(L.latLng(${RV.lang[2][1]}, ${RV.lang[2][0]}))`); E("csMo()"); $("csBT").value = "(B8 - "; $("csThu").click();
    E("OVL.dem.on = true; refreshOverlays()"); await sleep(400);
    const sot = new Set(), wk = w.document.createTreeWalker(w.document.body, 4); let m;
    while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#msgs,#csThuVien")) continue;
      const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|E0 thử|Tiếng Việt|name~Cát|khu thử|cả hai/.test(t)) sot.add(t.slice(0, 70)); }
    [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Ngôn ngữ|: X\d|Tây|Đông|name~Cát/.test(v)) sot.add("@" + v.slice(0, 60)); }));
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở phần 2.4 (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 30).join("\n      ") : ""));
    $("csDong").click(); key("o"); E("OVL.dem.on = false; refreshOverlays(); traBo()");
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
