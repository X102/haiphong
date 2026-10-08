// Bản 3.13: xuất bản đồ đúng ngôn ngữ (tên lớp của phương án), tên tệp đủ thông tin, nhãn địa danh dự phòng; chọn xã bằng ô tích và
// lưu thành vùng gộp; khung "các xã chọn" khi xuất bản đồ; Shapefile điểm mẫu (đọc lại bằng geopandas); quản lý phương án.
const fs = require("fs"), {execSync} = require("child_process");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.13", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  const mkPts = ds => E(`(() => { const o = []; ${JSON.stringify(ds)}.forEach(([r, c, ma]) => { const ll = CORE.toLL(660000 + c * 10 + 5, 2320000 - r * 10 - 5); o.push({lon: ll[0], lat: ll[1], nhan: {2025: ma}}); }); return o; })()`);
  const P = mkPts([[200, 560, "N1"], [600, 600, "N1"], [1000, 640, "N1"], [400, 680, "N1"], [800, 720, "N1"],
                   [200, 1050, "X1"], [600, 1100, "X1"], [1000, 1200, "X1"], [300, 1300, "X1"], [800, 1400, "X1"]]);
  E(`taoBoTuDiem("mẫu xuất thử", [2025], ${JSON.stringify(P)}, {})`); await sleep(100);
  const bo = E("ST.bo");
  E(`map.setView([20.95, 106.6], 11, {animate: false})`);

  // ---------- 1. danh sách xã có ô tích (bảng Phân loại), lưu thành vùng gộp
  $("bPL").click(); await until(() => E("VG.xa && VG.xa.length === 2") && $("plXa").options.length === 2, 8000, "xã");
  const hop = $("plXa").nextElementSibling;
  ok($("plXa").style.display === "none" && hop && hop.classList.contains("xahop") && hop.querySelectorAll("[data-k]").length === 2, "ô chọn nhiều xã thành danh sách ô tích");
  hop.querySelector("[data-tim]").value = "dong"; hop.querySelector("[data-tim]").dispatchEvent(new w.Event("input"));
  const hien = [...hop.querySelectorAll("label")].filter(l => !l.hidden).map(l => l.textContent.trim());
  ok(hien.join() === "Đông", "tìm “dong” (không dấu): chỉ còn xã Đông");
  const cb = [...hop.querySelectorAll("[data-k]")].find(c => !c.parentElement.hidden); cb.checked = true; cb.onchange();
  ok([...$("plXa").selectedOptions].map(o => o.textContent).join() === "Đông" && /đã chọn 1 xã, \d+ ha/.test(hop.querySelector("[data-tt]").textContent), "tích xã Đông: ô chọn gốc nhận, ghi số xã và diện tích");
  hop.querySelector("[data-ten]").value = "Đông thử"; hop.querySelector("[data-luu]").click(); await sleep(30);
  const gid = E("Object.values(ST.vgop).find(g => g.ten === 'Đông thử').id");
  ok(!!gid && E(`ST.vgop["${gid}"].xa.map(x => x.ten).join()`) === "Đông" && $("plPV").value === "gop:" + gid && [...$("tkPV").options].some(o => o.value === "gop:" + gid),
     "lưu thành vùng gộp: có trong mọi ô Phạm vi, bảng Phân loại chuyển sang vùng đó");

  // ---------- 2. phân loại xã Đông, lưu hai lần cùng tên
  $("plNam").value = "2025"; $("plBo").value = bo; $("plPP").value = "ecl_mau"; $("plPP").onchange(); $("plK").value = "1"; $("plNguon").value = "d2";
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:/.test(i.value); });
  $("plChay").click(); await until(() => /xong|lỗi/.test($("plTT").textContent) && E("PL.kq && PL.kq.nguon === 'd2'"), 60000, "phân loại");
  ok(E("PL.kq.keys.join()") === "N1,X1", "phân loại vùng gộp Đông thử (mẫu +2 km): N1, X1");
  $("plTen").value = "Phân loại thử"; $("plLuu").click(); await sleep(30); $("plLuu").click(); await sleep(30);
  const pas = E("PA.rieng.filter(p => /^Phân loại thử/.test(p.ten)).map(p => ({id: p.id, ten: p.ten, ma: Object.values(p.lop).map(l => l.ma)}))");
  ok(pas.length === 2 && pas[0].ten === "Phân loại thử" && pas[1].ten === "Phân loại thử (2)" && pas[0].ma.join() === "N1,X1", "lưu hai lần cùng tên: lần sau tự thành “(2)”; phương án lưu mã lớp");
  const id1 = pas[0].id;

  // ---------- 3. quản lý phương án ở bảng Thống kê
  E("tkMo(true)"); await sleep(200);
  const hang = [...$("tkPA").querySelectorAll(".pa-hang")].find(h => h.querySelector(`input[value="${id1}"]`));
  ok(hang && /phạm vi: vùng gộp|phạm vi: Đông thử/.test(hang.textContent) && /10 mẫu \(5 ngoài phạm vi\)/.test(hang.textContent) && hang.querySelector("[data-xem]") && hang.querySelector("[data-xb]"),
     "phương án ghi phạm vi, thời gian, số mẫu, có nút xem, đến, đổi tên, xuất bản đồ, GeoTIFF: " + (hang ? hang.querySelector(".sm").textContent.slice(0, 90) : ""));
  hang.querySelector("[data-xem]").click(); await sleep(30);
  ok(E(`!!PA_XEM["${id1}"] && map.hasLayer(PA_XEM["${id1}"])`) && $("tkPA").querySelector(`[data-xem="${id1}"]`).classList.contains("on"), "👁: hiện phương án trên bản đồ");
  E(`paDoiTen("${id1}", "Bản đồ Đông 2025")`);
  ok(E(`PA.rieng.find(p => p.id === "${id1}").ten`) === "Bản đồ Đông 2025" && /Bản đồ Đông 2025/.test($("tkPA").textContent), "đổi tên phương án");
  ok(E(`paTenRieng("Phân loại thử (2)", "x")`) === "Phân loại thử (2) (2)", "đổi tên trùng cũng tự đánh số");

  // ---------- 4. xuất bản đồ của đúng phương án đó, khung các xã chọn
  E(`xbMo("pa:${id1}", "kq")`); await sleep(100);
  ok($("xbND").value === "pa:" + id1 && $("xbPham").value === "kq" && /phương án: Bản đồ Đông 2025/.test($("xbND").selectedOptions[0].textContent), "🖨 / hộp xuất: chọn đúng phương án, khung vừa phạm vi");
  let R = await E(`(async () => { const o = Object.assign({}, xbDoc(), {dpi: 40, cgSo: "ha"}); const R = await xbVe(o); const g = R.CG.find(q => q.k === "pa:${id1}"); return g ? {muc: g.muc.map(m => [m.ten, m.ha]), tong: g.tong} : null; })()`);
  const dt = E("Array.from(PL.kq.dt)");
  ok(R && R.muc.length === 2 && gan(R.muc[0][1], dt[0], 0.03 * dt[0] + 5) && gan(R.muc[1][1], dt[1], 0.03 * dt[1] + 5), `chú giải bản đồ xuất có diện tích từng lớp khớp kết quả phân loại: ${R && R.muc.map(m => m[1].toFixed(0)).join(", ")} ha`);
  $("xbPham").value = "xa"; $("xbPham").onchange(); await sleep(30);
  ok(!$("xbXaW").hidden && $("xbXa").nextElementSibling.classList.contains("xahop") && $("xbXa").options.length === 2, "khung “các xã chọn dưới đây”: hiện danh sách xã có ô tích");
  const cbX = [...$("xbXa").nextElementSibling.querySelectorAll("[data-k]")]; cbX[cbX.findIndex((c, k) => $("xbXa").options[k].textContent === "Tây")].click(); await sleep(20);
  ok(E(`xbPhamVi("xa").ten`) === "Tây" && E(`!!xbPhamVi("xa").mp`) && !$("xbCat").disabled, "chọn xã Tây làm khung, cắt theo ranh giới được");
  const ten = E(`xbTenTep(Object.assign({}, xbDoc()))`);
  ok(/^ban_do_.+_Tay_25\.7x17cm_300dpi_\d{4}-\d{2}-\d{2}_\d{4}$/.test(ten) && /^[A-Za-z0-9._-]+$/.test(ten) && /Ban_do_Dong_2025/.test(ten), "tên tệp: nội dung, phạm vi, khổ, dpi, giờ (không dấu): " + ten);

  // ---------- 5. tiếng Nga: tên lớp của phương án, tên tệp phiên âm
  E("setLang('ru')"); await sleep(100);
  const cgRu = E(`tkChuGiai("goc", PA.rieng.find(p => p.id === "${id1}")).map(l => l.ten)`);
  ok(cgRu.length === 2 && cgRu.every(t => !VI.test(t)) && /^N1 /.test(cgRu[0]), "tiếng Nga: tên lớp của phương án theo ngôn ngữ đang chọn (không còn chữ Việt): " + cgRu.join(" | "));
  E(`(() => { const p = PA.rieng.find(p => p.id === "${id1}"); Object.values(p.lop).forEach(l => { delete l.ma; }); })()`);
  ok(E(`tkChuGiai("goc", PA.rieng.find(p => p.id === "${id1}")).map(l => l.ten)`).join() === cgRu.join(), "phương án cũ chưa lưu mã lớp: suy ra mã từ giá trị, vẫn dịch được");
  R = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {dpi: 40})); const g = R.CG.find(q => q.k === "pa:${id1}"); return g ? g.muc.map(m => m.ten) : null; })()`);
  ok(R && R.every(t => !VI.test(t)), "chú giải bản đồ xuất bằng tiếng Nga: " + (R || []).join(" | "));
  E(`$("xbTieuDe").value = "Классификация 2025"`);
  const tenRu = E(`xbTenTep(Object.assign({}, xbDoc()))`);
  ok(/^ban_do_Klassifikatsiya_2025_/.test(tenRu) && /^[A-Za-z0-9._-]+$/.test(tenRu), "tiêu đề tiếng Nga: tên tệp phiên âm Latin: " + tenRu);
  E(`$("xbTieuDe").value = ""; setLang('vi')`); await sleep(50);

  // ---------- 6. nhãn địa danh dự phòng khi xuất
  $("cNhan").checked = true; $("selNhan").value = "esri"; $("selNhan").onchange(); await sleep(30);
  E(`window._xbAnhCu = xbAnh; window.GOI = []; xbAnh = async u => { GOI.push(u); if (/arcgisonline/.test(u)) return null; if (/google/.test(u) && window.GOOGLE_HONG) return null; const c = document.createElement("canvas"); c.width = c.height = 256; return c; }`);
  const r1 = await E(`(async () => { XB.nhanDP = null; XB.nhanHong = {}; const im = await xbO(V27.nhan, {x: 6516, y: 3613, z: 13}); return {co: !!im, dp: XB.nhanDP, goi: GOI.slice()}; })()`);
  ok(r1.co && r1.dp === "Google" && /arcgisonline/.test(r1.goi[0]) && /google/.test(r1.goi[1]), "nhãn Esri không tải chéo được: lấy ô nhãn Google");
  const r2 = await E(`(async () => { window.GOOGLE_HONG = true; GOI.length = 0; XB.nhanDP = null; XB.nhanHong = {}; const im = await xbO(V27.nhan, {x: 6516, y: 3613, z: 13}); return {co: !!im, dp: XB.nhanDP, goi: GOI.slice()}; })()`);
  ok(r2.co && r2.dp === "CARTO" && /cartocdn\.com\/rastertiles\/voyager_only_labels\/13\/6516\/3613@2x\.png/.test(r2.goi[2]), "Google cũng không được: lấy nhãn CARTO");
  const r3 = await E(`(async () => { window.GOOGLE_HONG = false; XB.lop = null; xbDatND("man"); const s = XB.lop.find(q => q.k === "nhan"); s.on = true; s.op = 1;
    const o = Object.assign({}, xbDoc(), {dpi: 30}); XB.o.nguonTay = false; o.nguon = xbNguonMac(o); const R = await xbVe(o); return {dp: XB.nhanDP, nguon: o.nguon, thieu: R.thieu}; })()`);
  ok(r3.dp === "Google" && /nhãn địa danh \(Google\)/.test(r3.nguon) && !r3.thieu.length, "xuất bản đồ với nhãn Esri: thử trước, dùng Google cho cả bản đồ, dòng nguồn ghi Google, không báo thiếu ô: " + r3.nguon.slice(0, 60));
  E(`xbAnh = window._xbAnhCu; XB.nhanDP = null`);
  ok(/nhãn địa danh \(Esri\)/.test(E("xbLopTen(V27.nhan)")), "ngoài lúc xuất: ghi nhà cung cấp đang chọn");
  $("selNhan").value = "carto"; $("selNhan").onchange(); await sleep(30);
  ok(/cartocdn\.com\/rastertiles\/voyager_only_labels/.test(E("V27.nhan._url")) && [...$("selNhan").options].some(o => o.value === "carto"), "ô nguồn nhãn có CARTO (OSM)");
  $("cNhan").checked = false; $("cNhan").onchange();

  // ---------- 7. Shapefile điểm mẫu, gộp nhiều bộ
  E(`ST.diem[Object.keys(ST.diem).find(k => ST.diem[k].bo === "${bo}")].ghi_chu = "Ghi chú có dấu: Đông, Тест"`);
  $("bExp") && $("bExp").click(); await sleep(50);
  $("eShp").click(); await sleep(30);
  ok(!$("eShpW").hidden && $("eShpBo").querySelectorAll("input").length >= 2, "nút Shapefile: chọn các bộ điểm cần gộp");
  $("eShpBo").querySelectorAll("input").forEach(i => { i.checked = i.value === bo || i.value === "E0"; });
  const nb = blobs.length; $("eShpNhan").checked = false; $("eShpTai").click(); await sleep(200);
  ok(blobs.length === nb + 1 && /đã xuất diem_mau_2_bo_\d{4}-\d{2}-\d{2}_\d{4}\.zip: 14 điểm/.test($("eShpTT").textContent), "xuất ZIP: " + $("eShpTT").textContent);
  const ab = await new Promise(res => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.readAsArrayBuffer(blobs[nb]); });
  fs.writeFileSync("/tmp/fx/diem_thu.zip", Buffer.from(ab));
  const py = execSync(`python3 -c "
import geopandas as gpd, json
g = gpd.read_file('zip:///tmp/fx/diem_thu.zip')
r = g[g['ghi_chu'].str.len() > 0].iloc[0]
print(json.dumps({'n': len(g), 'crs': g.crs.to_epsg(), 'cot': list(g.columns), 'bo': sorted(set(g['bo_diem'])), 'ma': sorted(set(g['ma_2025'].dropna()) - {''}),
  'ghi': r['ghi_chu'], 'x': float(r.geometry.x), 'lon': float(r['lon']), 'lop': sorted(set(g['lop_2025'].dropna()) - {''})}, ensure_ascii=False))"`).toString();
  const S = JSON.parse(py);
  ok(S.n === 14 && S.crs === 4326 && S.bo.length === 2 && S.ma.join() === "N1,X1" && ["id", "ten_bo", "so_nam", "ma_2025", "lop_2025", "l3_2025"].every(c => S.cot.includes(c)),
     `geopandas đọc lại: 14 điểm của 2 bộ, WGS 84, trường id, ten_bo, ma_2025, lop_2025…`);
  ok(S.ghi === "Ghi chú có dấu: Đông, Тест" && gan(S.x, S.lon, 1e-7) && S.lop.every(t => /Sông|Đô thị/.test(t)), "chữ UTF-8 (Việt, Nga) giữ nguyên; toạ độ hình học khớp cột lon");

  // ---------- 8. dịch, lỗi
  E("setLang('ru')"); await sleep(80); E("tkMo(true)"); await sleep(100);
  ok(/выбрать все/.test($("tkXa").nextElementSibling.textContent) && /Shapefile/.test($("eShp").textContent) && /вариант:/.test(E(`xbDS().find(d => d.k === "pa:${id1}").ten`)), "tiếng Nga: danh sách xã, Shapefile, phương án trong hộp xuất");
  const miss = E("[...T_MISS]").filter(x => /xã|vùng|bộ điểm|phương án|Shapefile|nhãn|mẫu|phạm vi/i.test(x) && !/thử|Đông|Tây/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
