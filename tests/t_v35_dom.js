// Bản 3.5: bộ nhớ ảnh dải đã vẽ, nạp trước điểm kế tiếp, gợi ý lớp kNN (gán mù, Enter, cột xuất, gộp), chế độ lưới (chọn ô, phím lớp,
// Enter nhận gợi ý, trang, năm, đóng), dịch. Dữ liệu giả: mk_fixtures.py (bộ E0, 4 điểm, S2 10 băng, PC, embedding).
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  const phim = (k, them) => w.document.body.dispatchEvent(new w.KeyboardEvent("keydown", Object.assign({key: k, bubbles: true}, them || {})));
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "3.5", "bản " + E("VERSION"));
  ok(!!$("ntSo") && !!$("bLuoi") && !!$("gyBox") && !!$("luoiP") && $("luoiP").hidden, "có ô nạp trước, nút lưới, dòng gợi ý; lưới đang đóng");

  // ---------- 1. bộ nhớ ảnh dải: vẽ lại dải không đọc lại ảnh
  E(`$("selStrip").value = "s2d"; ST.filter = "all"; select("E0001", false)`);
  await until(() => E("ANH.m.size") >= 2, 8000, "dải ảnh vẽ lần đầu");
  await sleep(600);
  const t0 = E("ANH.trung"), m0 = E("ANH.m.size");
  E("renderStrip()"); await sleep(400);
  ok(E("ANH.trung") - t0 >= 2 && E("ANH.m.size") === m0, `vẽ lại dải: dùng ${E("ANH.trung") - t0} khung đã lưu, không đọc thêm (${m0} khung)`);
  const b0 = E("ANH.byte");
  ok(b0 > 0 && b0 <= E("ANH.tran"), "bộ nhớ ảnh có giới hạn dung lượng: " + Math.round(b0 / 1024) + " KB");

  // ---------- 2. nạp trước 2 điểm kế tiếp
  E(`NT.so = 2; $("ntSo").value = "2"; CVS.kind = "nam"; CVS.grp = "pc"`);
  const ke = E(`ntKeTiep().map(p => p.id).join()`);
  ok(ke === "E0002,E0003", "điểm kế tiếp theo chiều đi tới: " + ke);
  E(`select("E0001", false); ntBatDau(0)`);
  await until(() => /⚡2\/2/.test($("ntTT").textContent), 15000, "nạp trước xong 2 điểm");
  ok(/⚡2\/2/.test($("ntTT").textContent), "đã nạp trước: " + $("ntTT").textContent);
  const p2 = E(`(() => { const p = ST.diem.E0002; return {an: !!AN_CACHE[p.x + "," + p.y + "|pc"], gy: GYF.has(gyKhoa(p))}; })()`);
  ok(p2.an && p2.gy, "điểm kế tiếp đã có đồ thị theo năm (PC) và đặc trưng gợi ý trong bộ nhớ");
  const t1 = E("ANH.trung");
  E(`step(1)`); await sleep(500);
  ok(E("ST.cur") === "E0002" && E("ANH.trung") - t1 >= 2, `sang điểm sau: dải ảnh lấy từ bản nạp trước (${E("ANH.trung") - t1} khung)`);
  E(`step(-1)`); const lui = E(`ntKeTiep().map(p => p.id).join()`), vs = E(`visible().map(p => p.id).join()`);
  ok(E("NT.dir") === -1 && E("ST.cur") === "E0001" && lui === "E0000,E0003", `đi lùi thì nạp trước theo chiều lùi: ${lui} (danh sách ${vs})`);
  E(`NT.dir = 1`);

  // ---------- 3. gợi ý lớp: đặc trưng thật từ dữ liệu có sẵn
  const f1 = await E(`gyDacTrung(ST.diem.E0001).then(e => e && {sig: e.sig.slice(0, 40), nam: Object.keys(e.ys).join(), d: e.names.length})`);
  ok(f1 && /^co:/.test(f1.sig) && f1.d >= 5 && f1.nam.length, `đặc trưng theo năm từ dữ liệu có sẵn: ${f1 && f1.d} chiều, năm ${f1 && f1.nam}`);
  // dựng tập mẫu giả hai cụm rõ ràng (đặc trưng gán thẳng) để kiểm cơ chế kNN
  E(`(() => {
    for (let i = 0; i < 16; i++) { const id = "G" + i, p = CORE.newPoint(id, 106.6 + i * 0.001, 20.9, {bo: "E0"}); ST.diem[id] = p;
      const a = i < 8, ys = {}; [2023, 2024, 2025].forEach(y => { ys[y] = a ? [0.1 + 0.01 * i, 0.2, 0.3] : [0.9 - 0.01 * i, 0.8, 0.7]; if (i < 14) CORE.setLabel(p, y, a ? "N1" : "T4"); });
      GYF.set(gyKhoa(p), {sig: "thu", names: ["a", "b", "c"], ys}); }
    GY.tap = null; GY.ver++; GY.mu = 0; GY.toiThieu = 10; })()`);
  const g = E(`(() => { const r = gyDoan(ST.diem.G14, 2024); return {ma: r.ma, tin: r.tin, n: r.n, k: r.k}; })()`);
  ok(g.ma === "T4" && g.tin > 0.95 && g.n === 42, `kNN: điểm cụm thứ hai được gợi ý T4 (${Math.round(100 * g.tin)} %, ${g.n} mẫu, ${g.k} láng giềng)`);
  const tu = E(`(() => { GY.k = 3; const p = ST.diem.G1; const r = gyDoan(p, 2023); GY.k = 7; return r.ma; })()`);
  ok(tu === "N1", "không dùng chính điểm đang xem (đoán đúng nhờ điểm khác cùng cụm)");
  ok(E(`gyKNN(gyTap("thu"), [0.15, 0.2, null], "x").ma`) === "N1", "thiếu một chiều đặc trưng vẫn đoán được (chỉ dùng chiều có giá trị)");
  E(`setYear(2024); select("G14", false)`); await sleep(100);
  ok(/T4/.test($("gyBox").textContent) && /Enter/.test($("gyBox").textContent) && !!w.document.querySelector("#cls button.gy"), "dòng gợi ý dưới các nút lớp, nút lớp gợi ý được đánh dấu: " + $("gyBox").textContent.slice(0, 60));
  ok(/ước tính đúng \d+ %/.test($("gyBox").textContent), "có độ đúng ước tính bằng kiểm chéo bỏ điểm");
  phim("Enter"); await sleep(50);
  const gy14 = E(`ST.diem.G14.gy[2024]`);
  ok(E(`ST.diem.G14.nhan[2024]`) === "T4" && gy14.n === 1 && gy14.g === "T4" && !gy14.mu, "Enter: nhận gợi ý, ghi cờ nhận gợi ý");
  ok(E("ST.nam") === 2025, "nhận gợi ý xong tự sang năm sau như gán bằng phím");
  phim("1"); await sleep(50);
  const gy25 = E(`ST.diem.G14.gy[2025]`);
  ok(E(`ST.diem.G14.nhan[2025]`) === "N1" && gy25.g === "T4" && !gy25.n, "gán khác gợi ý bằng phím lớp: ghi gợi ý T4 nhưng không tính là nhận");
  // gán mù
  E(`GY.mu = 100; select("G15", false); setYear(2023)`); await sleep(50);
  ok(/gán mù/.test($("gyBox").textContent), "điểm gán mù không hiện gợi ý");
  phim("Enter"); await sleep(30);
  ok(!E(`ST.diem.G15.nhan[2023]`), "Enter không gán gì ở điểm gán mù");
  phim("4"); await sleep(30);
  ok(E(`ST.diem.G15.gy[2023].mu`) === 1 && E(`ST.diem.G15.gy[2023].g`) === "T4", "điểm mù vẫn ghi gợi ý (ẩn) để đo độ đúng");
  ok(E(`gyMuDo().n`) === 1 && E(`gyMuDo().d`) === 0, "đếm độ đúng trên nhãn gán mù (gợi ý T4, người gán T1: sai 1/1)");
  E(`GY.mu = 0`);
  // xuất, gộp
  const row = E(`CORE.exportLong([ST.diem.G14], [2024, 2025], IDX)`);
  ok(row[0].goi_y_knn === "T4" && row[0].nhan_tu_goi_y === 1 && row[1].goi_y_knn === "T4" && row[1].nhan_tu_goi_y === 0 && row[0].gan_mu === 0, "CSV dạng dài có goi_y_knn, tin_goi_y, gan_mu, nhan_tu_goi_y");
  E(`CORE.setLabel(ST.diem.G14, 2025, "T4")`);
  ok(E(`CORE.exportLong([ST.diem.G14], [2025], IDX)[0].goi_y_knn`) === "", "nhãn đã đổi sau đó (không qua gán): không ghi gợi ý cũ");
  const gop = E(`(() => { const a = {G14: CORE.newPoint("G14", 106.6, 20.9, {bo: "E0"})}, b = {G14: JSON.parse(JSON.stringify(ST.diem.G14))}; CORE.merge(a, b); return a.G14.gy && a.G14.gy[2024] ? a.G14.gy[2024].g : ""; })()`);
  ok(gop === "T4", "gộp tiến độ: gợi ý lúc gán đi cùng nhãn");
  // không dùng U, M làm mẫu
  E(`CORE.setLabel(ST.diem.G0, 2023, "U"); GY.ver++`);
  ok(!E(`gyTap("thu").Y.includes("U")`), "lớp U, M không vào tập mẫu");

  // ---------- 4. chế độ lưới
  E(`ST.filter = "all"; setYear(2025); select("G0", false)`);
  phim("l"); await sleep(100);
  ok(!$("luoiP").hidden && E("LUOI.mo"), "phím l mở chế độ lưới");
  const so = $("luoiP").querySelectorAll(".lo").length, can = E(`visible().filter(p => !p.nhan[2025]).length`);
  ok(so === Math.min(E("LUOI.co"), can) && can > 0, `lưới: ${so} ô (điểm chưa gán năm 2025)`);
  await until(() => [...$("luoiP").querySelectorAll(".lo-gy")].some(e => /\d+%/.test(e.textContent)), 8000, "gợi ý trên ô");
  const o = [...$("luoiP").querySelectorAll(".lo")], oG = o.filter(x => x.dataset.id === "E0002");
  ok(/T4/.test(o.find(x => x.dataset.id === "G15").querySelector(".lo-gy").textContent), "ô có gợi ý lớp và độ tin");
  const thuTu = o.map(x => x.dataset.id), iN = thuTu.findIndex(id => E(`(gyDoan(ST.diem["${id}"], 2025) || {}).ma`) === "N1"), iT = thuTu.indexOf("G15");
  ok(iN < 0 || iN < iT, "xếp theo lớp gợi ý (N1 trước T4)");
  oG[0] && oG[0].dispatchEvent(new w.MouseEvent("click", {bubbles: true}));
  ok(E("LUOI.chon.size") === 1 && oG[0].classList.contains("chon"), "nhấp chọn một ô");
  const nam0 = E("ST.nam"); phim("8"); await sleep(50);
  const idG = oG[0].dataset.id;
  ok(E(`ST.diem.${idG}.nhan[2025]`) === "T5" && E("LUOI.chon.size") === 0 && E("ST.nam") === nam0, "phím lớp gán cho ô đã chọn, không tự sang năm, bỏ chọn sau khi gán");
  ok(/^luoi/.test(E(`ST.diem.${idG}.anh[2025].s`)) && E(`ST.diem.${idG}.gy[2025].l`) === "T5", "gán trên lưới ghi nguồn ảnh (luoi) và gợi ý lúc gán");
  ok(!$("luoiP").hidden && E("ST.cur") === "G0", "các phím của chế độ điểm không chạy khi đang ở lưới");
  // Enter: nhận gợi ý cho mọi ô đủ ngưỡng
  E(`GY.nguong = 0.6`);
  const truoc = E(`visible().filter(p => !p.nhan[2025]).length`);
  phim("Enter"); await sleep(80);
  const sau = E(`visible().filter(p => !p.nhan[2025]).length`);
  ok(sau < truoc && E(`ST.diem.G15.nhan[2025]`) === "T4" && E(`ST.diem.G15.gy[2025].n`) === 1, `Enter: nhận gợi ý cho ${truoc - sau} ô đủ ngưỡng`);
  ok(!E(`ST.diem.E0001.nhan[2025]`), "điểm chưa đủ mẫu để gợi ý (E0) không bị gán bừa");
  // chọn cả trang, xoá nhãn
  phim("a", {ctrlKey: true}); await sleep(20);
  ok(E("LUOI.chon.size") === $("luoiP").querySelectorAll(".lo").length, "Ctrl+A chọn cả trang");
  phim("Escape"); ok(E("LUOI.chon.size") === 0 && !$("luoiP").hidden, "Esc lần đầu: bỏ chọn");
  E(`LUOI.chon.add("G15"); luoiNhan()`); phim("Backspace"); await sleep(30);
  ok(!E(`ST.diem.G15.nhan[2025]`) && !(E(`ST.diem.G15.gy`) || {})[2025], "Backspace xoá nhãn ô đã chọn (và gợi ý lúc gán)");
  // đổi năm, trang
  phim("ArrowLeft"); await sleep(80);
  ok(E("ST.nam") === 2024 && /2024/.test($("luoiP").querySelector(".luoi-dau").textContent), "← đổi năm trong lưới");
  E(`LUOI.co = 4; LUOI.ds = luoiDanhSach(); LUOI.trang = 0; luoiVe()`); const tr1 = E(`luoiTrangDs().map(p => p.id).join()`);
  phim("n"); await sleep(50); const tr2 = E(`luoiTrangDs().map(p => p.id).join()`);
  ok(tr1 !== tr2 && E("LUOI.trang") === 1, "n: trang sau");
  // nhấp đúp mở điểm
  const o2 = $("luoiP").querySelector(".lo"), id2 = o2.dataset.id;
  o2.dispatchEvent(new w.MouseEvent("dblclick", {bubbles: true})); await sleep(50);
  ok($("luoiP").hidden && E("ST.cur") === id2, "nhấp đúp: đóng lưới, mở điểm đó");
  E(`LUOI.co = 40; luoiLuu()`);
  phim("l"); await sleep(50); phim("Escape"); phim("Escape"); await sleep(30);
  ok($("luoiP").hidden, "Esc đóng lưới");

  // ---------- 5. dịch
  E("setLang('ru')"); await sleep(60);
  E("luoiMo(true)"); await sleep(50);
  ok(/Сетка/.test($("luoiP").textContent) && /предзагрузка 2 точек/.test($("ntSo").selectedOptions[0].textContent), "tiếng Nga: lưới, ô nạp trước");
  E("luoiMo(false)"); E(`select("G14", false); setYear(2024)`); await sleep(50);
  const miss = E("[...T_MISS]").filter(x => /gợi ý|lưới|nạp trước|láng giềng|gán mù|ô |trang/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
