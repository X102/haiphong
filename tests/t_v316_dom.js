// Bản 3.16: xuất bản đồ nhiều năm: từng năm một tệp (ZIP kèm CSV diện tích), ghép các năm trong một ảnh (chung chú giải, bảng diện tích theo năm).
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang"), fs = require("fs"), {execSync} = require("child_process");
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.16", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  E(`HTMLCanvasElement.prototype.toBlob = function (cb, t) { cb(new Blob([new Uint8Array([0xFF,0xD8,0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0,0xFF,0xD9])], {type: t})); }`);
  // ghi lại chữ vẽ lên canvas (canvas giả của jsdom không có điểm ảnh)
  E(`(() => { const goc = HTMLCanvasElement.prototype.getContext; window.__chu = [];
    HTMLCanvasElement.prototype.getContext = function () { const g = goc.apply(this, arguments); if (!g) return g;
      return new Proxy(g, {get(t, k) { if (k === "fillText") return (s, x, y) => window.__chu.push([String(s), x, y]); return t[k]; }, set(t, k, v) { t[k] = v; return true; }}); }; })()`);

  // ---------- 1. phương án hai năm, đáp án biết trước: 2023 nửa trái lớp 1; 2025 60 % lớp 1, thêm một ô lớp 3
  const pa = E(`(() => { const ct = CORE.toLL(667500, 2314000), m = CORE.to3857(ct[0], ct[1]), w = 400, h = 300;
    const g0 = {x0: Math.round(m[0] / 10) * 10 - 2000, y1: Math.round(m[1] / 10) * 10 + 1500, res: 10, w, h};
    const mk = (cot, them) => { const d = new Uint8Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) d[j * w + i] = i < cot ? 1 : 2;
      if (them) for (let j = 0; j < 10; j++) for (let i = 390; i < 400; i++) d[j * w + i] = 3; return d; };
    const pa = {id: "loat1", ten: "Bản đồ thử", nguon: "nhap", nam: [2023, 2025], lop: {1: {ten: "Nước thử", mau: "#1f5fbf"}, 2: {ten: "Xây dựng thử", mau: "#d7191c"}, 3: {ten: "Đất trống thử", mau: "#b08a5a"}},
      du: {2023: {g0, data: mk(200)}, 2025: {g0, data: mk(240, true)}}, tham_so: {pham_vi: "Đông"}, tao_luc: new Date().toISOString()};
    paThem(pa);
    const g = Object.assign({}, g0); g.bb = [g.x0, g.y1 - h * 10, g.x0 + w * 10, g.y1]; const ra = CORE.rowArea(g);
    let tong = 0, a1 = 0, b1 = 0, c3 = 0; for (let j = 0; j < h; j++) { const ha = ra[j] / 1e4; tong += w * ha; a1 += 200 * ha; b1 += 240 * ha; if (j < 10) c3 += 10 * ha; }
    return {id: pa.id, tong, a1, b1, c3}; })()`);
  const tatNen = () => E(`XB.lop.forEach(s => { if (s.k === "base" || s.k === "nhan") s.on = false; }); xbVeLop()`);   // không tải ảnh nền (không có mạng)
  E(`xbMo("pa:${pa.id}", "kq")`); await sleep(80); tatNen();
  ok(!$("xbLoatW").hidden && $("xbLoatNam").querySelectorAll("input").length === 2 && [...$("xbLoat").options].map(o => o.value).join() === "mot,tep,ghep",
     "hộp xuất: bản đồ hai năm có mục Nhiều năm (một năm, từng năm một tệp, ghép trong một ảnh) và danh sách năm");
  E(`xbMo("man")`); await sleep(30);
  ok($("xbLoatW").hidden, "bản đồ “như màn hình” (không có nhiều năm): mục Nhiều năm ẩn");
  E(`xbMo("pa:${pa.id}", "kq")`); await sleep(30); tatNen();

  // ---------- 2. ghép các năm trong một ảnh
  $("xbLoat").value = "ghep"; $("xbLoat").onchange(); await sleep(20);
  ok($("xbTieuDe").value === "Bản đồ thử 2023, 2025" && !$("xbLoatCot").hidden && !$("xbLoatBang").hidden, "chế độ ghép: tiêu đề ghi khoảng năm, hiện ô số cột, bảng số liệu: " + $("xbTieuDe").value);
  $("xbLoatBang").value = "ha_pct"; $("xbLoatBang").onchange(); $("xbDpi").value = "150"; $("xbCGV").value = "phai";
  E(`window.__chu.length = 0`);
  const R = await E(`(async () => { const L = xbLoatND(), o = Object.assign({}, xbDoc(), {dpi: 80}); const R = await xbVeGhep(o, L, xbLoatNamChon(L));
    return {W: R.W, H: R.H, Fds: R.Fds, cot: R.cot, hang: R.hang, ys: R.B && R.B.ys, tong: R.B && R.B.tong, hang_: R.B && R.B.hang.map(h => ({ten: h.m.ten, ha: h.ha})), cg: R.CG.map(g => ({t: g.tieuDe, n: g.muc.length})), tl: R.tl}; })()`);
  const F = R.Fds, trong = F.every(f => f.x >= 0 && f.y >= 0 && f.x + f.w <= R.W && f.y + f.h <= R.H), chong = F[0].x + F[0].w <= F[1].x || F[0].y + F[0].h <= F[1].y;
  ok(F.length === 2 && trong && chong && gan(F[0].w, F[1].w, 1e-6) && gan(F[0].h, F[1].h, 1e-6) && gan(F[0].w / F[0].h, 4240 / 3240, 0.005),
     `hai ô bản đồ cùng cỡ, cùng tỉ lệ phạm vi, không chồng nhau, nằm trong ảnh (${R.cot} cột × ${R.hang} hàng, ô ${F[0].w.toFixed(0)} × ${F[0].h.toFixed(0)} điểm ảnh)`);
  ok(R.cg.length >= 1 && R.cg[0].t === "Bản đồ thử 2023, 2025" && R.cg[0].n === 3, "một chú giải chung: hợp các lớp của mọi năm (3 lớp; lớp 3 chỉ có năm 2025), tiêu đề ghi khoảng năm");
  const h1 = R.hang_.find(h => h.ten === "Nước thử"), h3 = R.hang_.find(h => h.ten === "Đất trống thử");
  ok(R.ys.join() === "2023,2025" && gan(R.tong[0], pa.tong, 1e-6 * pa.tong) && gan(R.tong[1], pa.tong, 1e-6 * pa.tong) && gan(h1.ha[0], pa.a1, 1e-6 * pa.a1) && gan(h1.ha[1], pa.b1 - 0, 1e-6 * pa.b1) && gan(h3.ha[0], 0, 1e-9) && gan(h3.ha[1], pa.c3, 1e-6 * pa.c3),
     `bảng diện tích đúng đáp án: tổng ${pa.tong.toFixed(1)} ha mỗi năm; lớp 1: ${pa.a1.toFixed(1)} → ${pa.b1.toFixed(1)} ha; lớp 3 chỉ năm 2025 (${pa.c3.toFixed(2)} ha)`);
  const chu = E(`window.__chu.map(q => q[0])`);
  const coChu = t => chu.includes(t);
  ok(coChu("2023") && coChu("2025") && coChu("Bản đồ thử 2023, 2025") && coChu("Lớp") && coChu("Δ 2023–2025") && coChu("Nước thử") && chu.some(t => /^Diện tích các lớp theo năm, ha \(% diện tích có dữ liệu\); đếm trong khung bản đồ$/.test(t)),
     "ảnh ghép có nhãn năm trên từng ô, tiêu đề, chú giải, bảng (cột Δ 2023–2025, dòng ghi đơn vị và phạm vi đếm)");
  const dl = chu.filter(t => /^\+|^−/.test(t));
  ok(dl.length >= 2, "cột thay đổi có dấu (+, −): " + dl.slice(0, 4).join(" "));
  ok(/^1 : /.test(R.tl), "thước tỉ lệ vẽ một lần ở ô dưới trái: " + R.tl);
  // xem trước, xuất (JPEG + CSV trong ZIP khi chọn kèm tệp)
  await E(`xbChay(true)`);
  ok(/^xem trước: 2 năm, \d cột × \d hàng/.test($("xbTT").textContent), "xem trước bản đồ ghép: " + $("xbTT").textContent);
  $("xbWF").checked = true; let nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent) && blobs.length > nb, 60000, "xuất ghép"); if (blobs.length <= nb) { xong(); return; }
  ok(/^đã xuất ban_do_Ban_do_thu_2023_2025_.*\.zip: 2 năm trong một ảnh/.test($("xbTT").textContent), "xuất bản đồ ghép: " + $("xbTT").textContent.slice(0, 120));
  const doc = async b => Buffer.from(await new Promise(res => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.readAsArrayBuffer(b); }));
  fs.writeFileSync("/tmp/fx/ghep.zip", await doc(blobs[nb]));
  const Z1 = JSON.parse(execSync(`python3 -c "
import zipfile, json
z = zipfile.ZipFile('/tmp/fx/ghep.zip'); n = z.namelist(); c = [x for x in n if x.endswith('.csv')]
print(json.dumps({'n': n, 'csv': z.read(c[0]).decode('utf-8-sig') if c else ''}, ensure_ascii=False))"`).toString());
  ok(Z1.n.length === 2 && Z1.n.some(f => /\.jpg$/.test(f)) && /lop,ha_2023,pct_2023,ha_2025,pct_2025/.test(Z1.csv) && /Nước thử,/.test(Z1.csv), "ZIP: ảnh ghép + bảng diện tích CSV (ha, % mỗi năm); không kèm world file (nhiều khung)");

  // ---------- 3. từng năm một tệp
  $("xbLoat").value = "tep"; $("xbLoat").onchange(); await sleep(20);
  ok($("xbLoatCot").hidden && /2 năm: 2 tệp/.test($("xbLoatTT").textContent) && $("xbTieuDe").value === "Bản đồ thử 2025", "chế độ từng năm: tiêu đề trở lại một năm; ghi số tệp");
  await E(`xbChay(true)`);
  ok(/^xem trước năm 2023 \(xuất sẽ tạo 2 tệp\)/.test($("xbTT").textContent), "xem trước năm đầu: " + $("xbTT").textContent);
  $("xbWF").checked = false; nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent) && blobs.length > nb, 60000, "xuất từng năm");
  ok(/^đã xuất ban_do_Ban_do_thu_2023_2025_.*\.zip: 2 năm, 3 tệp/.test($("xbTT").textContent), "xuất từng năm: " + $("xbTT").textContent.slice(0, 120));
  fs.writeFileSync("/tmp/fx/loat.zip", await doc(blobs[blobs.length - 1]));
  const Z2 = JSON.parse(execSync(`python3 -c "
import zipfile, json
z = zipfile.ZipFile('/tmp/fx/loat.zip'); n = z.namelist(); c = [x for x in n if x.endswith('.csv')]
print(json.dumps({'n': n, 'csv': z.read(c[0]).decode('utf-8-sig') if c else ''}, ensure_ascii=False))"`).toString());
  const anh = Z2.n.filter(f => /\.jpg$/.test(f));
  ok(anh.length === 2 && /Ban_do_thu_2023_/.test(anh[0]) && /Ban_do_thu_2025_/.test(anh[1]) && /Đất trống thử,0,0,/.test(Z2.csv), "ZIP: mỗi năm một ảnh, tên tệp đúng năm; CSV diện tích (lớp 3 năm 2023 bằng 0): " + anh.join(", "));
  ok(E(`XB.lop.find(s => s.k === "pa:${pa.id}").nam`) === 2025, "sau khi xuất, năm chọn ở danh sách lớp giữ nguyên");
  // tiêu đề tự gõ: thay năm theo từng tệp
  $("xbTieuDe").value = "Hiện trạng 2025"; $("xbTieuDe").dispatchEvent(new w.Event("input"));
  nb = blobs.length; $("xbXuatBtn").click(); await until(() => /đã xuất|lỗi/.test($("xbTT").textContent) && blobs.length > nb, 60000, "xuất từng năm, tiêu đề tự gõ");
  fs.writeFileSync("/tmp/fx/loat2.zip", await doc(blobs[blobs.length - 1]));
  const n3 = JSON.parse(execSync(`python3 -c "import zipfile, json; print(json.dumps(zipfile.ZipFile('/tmp/fx/loat2.zip').namelist()))"`).toString());
  ok(n3.some(f => /^ban_do_Hien_trang_2023_/.test(f)) && n3.some(f => /^ban_do_Hien_trang_2025_/.test(f)), "tiêu đề tự gõ có năm: mỗi tệp thay đúng năm (" + n3.filter(f => /jpg$/.test(f)).join(", ") + ")");

  // ---------- 4. lớp dữ liệu theo năm (bản đồ lớp toàn cầu giả), ghép, bảng đọc từ COG
  const ovl = E(`xbDS().filter(d => /^ovl:/.test(d.k) && d.nam && d.nam.length > 1 && d.L0.kieu === "lop").map(d => d.k)`);
  if (ovl.length) {
    E(`xbMo("${ovl[0]}", "tinh")`); await sleep(50); tatNen(); $("xbLoat").value = "ghep"; $("xbLoat").onchange(); $("xbLoatBang").value = "pct"; $("xbLoatBang").onchange();
    const R2 = await E(`(async () => { const L = xbLoatND(), o = Object.assign({}, xbDoc(), {dpi: 60}); const R = await xbVeGhep(o, L, xbLoatNamChon(L));
      return {n: R.Fds.length, B: R.B ? {ys: R.B.ys, tong: R.B.tong, k: R.B.hang.length} : null}; })()`);
    ok(R2.n === 2 && R2.B && R2.B.ys.length === 2 && R2.B.tong.every(v => v > 0) && R2.B.k >= 2, `lớp dữ liệu theo năm (${ovl[0]}): ghép hai năm, bảng % đọc lại từ COG (${R2.B && R2.B.k} lớp)`);
  } else ok(true, "không có lớp dữ liệu dạng lớp nhiều năm trong dữ liệu giả");

  // ---------- 5. tiếng Nga; một năm vẫn như cũ
  E("setLang('ru')"); await sleep(80);
  ok(/Несколько лет/.test($("xbLoatW").textContent) && /все годы на одном изображении/.test([...$("xbLoat").options].map(o => o.textContent).join("|")), "tiếng Nga: mục Nhiều năm");
  const miss = E("[...T_MISS]").filter(x => /năm|bảng|ô bản đồ|tệp|ghép|Lớp|diện tích/i.test(x) && !/thử/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')"); await sleep(50);
  E(`xbMo("pa:${pa.id}", "kq")`); await sleep(30); tatNen(); $("xbLoat").value = "mot"; $("xbLoat").onchange();
  await E(`xbChay(true)`);
  ok(/^xem trước \(/.test($("xbTT").textContent), "chế độ một năm: xuất như cũ: " + $("xbTT").textContent.slice(0, 60));
  w.document.getElementById("dlgXB").close();
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
