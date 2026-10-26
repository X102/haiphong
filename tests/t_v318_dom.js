// Bản 3.18: sơ đồ lớp xếp tầng: hình cắt (ranh giới vùng/xã, hoà tan ranh giới trong, bỏ đảo xa; tròn, vuông, lục giác… đúng bán kính),
// danh sách tầng (như bản đồ, thêm, lên/xuống, bỏ, mỗi năm một tầng), bố cục nằm trong khung ở nhiều góc, kéo để xoay, xuất PNG,
// ảnh động báo rõ khi trình duyệt không hỗ trợ, chọn tâm trên bản đồ, tiếng Nga.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs, blobs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest");
  ok(E("VERSION").localeCompare("3.18", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  E("setYear(2025)"); key("o"); await sleep(50); await until(() => E("VG.xa && VG.xa.length") === 2, 5000, "ranh giới xã"); key("o"); await sleep(20);
  E(`HTMLCanvasElement.prototype.toBlob = function (cb, t) { cb(new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,0,73,69,78,68,174,66,96,130])], {type: t})); }`);

  // ---------- 1. mở hộp: nút trên thanh công cụ, tầng mặc định như bản đồ đang xem, ô chọn vùng có từng xã
  ok(!!$("bTang") && /Xếp tầng/.test($("bTang").textContent), "nút 🧱 Xếp tầng cạnh Xuất bản đồ");
  E(`localStorage.removeItem("laymau_hp_tang_ds_v1"); TG.tang = null`);
  $("bTang").click(); await until(() => /đang dựng tầng 1\/\d/.test($("tgTT").textContent), 8000, "bắt đầu dựng xem trước");   // ảnh nền tải ô từ mạng ngoài: không chờ xong
  ok($("dlgTang").open && E("TG.tang.length") >= 1 && E("TG.tang[0].k") === "base", `mở hộp, tầng mặc định như bản đồ: ${E("TG.tang.map(t => t.k).join(', ')")} (ảnh nền ở đáy)`);
  const vung = E(`[...$("tgVung").options].map(o => o.value)`);
  ok(vung.includes("nhin") && vung.includes("tinh") && vung.includes("xa:1") && vung.includes("xa:2"), "vùng: khung nhìn, cả tỉnh, từng xã (" + vung.join(", ") + ")");

  // ---------- 2. hình cắt
  const G1 = E(`(() => { const G = tgHinhHoc(Object.assign({}, TG.o, {vung: "tinh", hinh: "ranh", dao: true})); return {n: G.P.length, ten: G.ten, bb: G.bb}; })()`);
  ok(G1.n === 1, `ranh giới cả tỉnh ghép từ 2 xã: hoà tan ranh giới trong thành ${G1.n} vùng`);
  const G2 = E(`(() => { const G = tgHinhHoc(Object.assign({}, TG.o, {vung: "xa:1", hinh: "ranh"})); return {n: G.P.length, ten: G.ten}; })()`);
  ok(G2.n === 1 && G2.ten === "Tây", "ranh giới một xã (Tây)");
  const dao = E(`(() => { const sq = (x, y, r) => [[[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r], [x - r, y - r]]];
    const P = [sq(0, 0, 10000), sq(300000, 0, 200), sq(12000, 0, 300), sq(-60000, 0, 2000)]; return tgBoDao(P).length; })()`);
  ok(dao === 3, "bỏ đảo xa: giữ đảo lớn (≥ 0.5 %) và đảo gần bờ, bỏ đảo nhỏ ở xa");
  const sai = [];
  for (const h of ["tron", "vuong", "bo", "luc", "elip", "thoi"]) {
    const r = E(`(() => { const G = tgHinhHoc(Object.assign({}, TG.o, {vung: "xa:1", hinh: "${h}", tam: "vung", R: 2.5})); const v = G.P[0][0], b = G.bb, c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
      const co = Math.cos(CORE.m2ll(c[0], c[1])[1] * Math.PI / 180); return {n: v.length, kin: v[0][0] === v[v.length - 1][0] && v[0][1] === v[v.length - 1][1], rx: (b[2] - b[0]) / 2 * co, km: G.km}; })()`);
    if (!r.kin || !gan(r.rx, 2500, 30) || r.km !== 2.5) sai.push(`${h}: ${JSON.stringify(r)}`);
  }
  ok(sai.length === 0, "6 hình (tròn, vuông, vuông bo góc, lục giác, elip, thoi) khép kín, nửa bề rộng đúng 2.5 km trên mặt đất" + (sai.length ? ": " + sai.join("; ") : ""));
  const Rtu = E(`tgRTu(Object.assign({}, TG.o, {vung: "xa:1", tam: "vung"}))`);
  const Rmo = E(`(() => { const b = VG.xa.find(x => x.i === 1).bb, c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; return 0.5 * Math.max(b[2] - b[0], b[3] - b[1]) * Math.cos(CORE.m2ll(c[0], c[1])[1] * Math.PI / 180) / 1000; })()`);
  ok(gan(Rtu, Rmo, 1e-6) && Rtu > 1, `bán kính tự động vừa xã (nửa cạnh dài trên mặt đất): ${Rtu.toFixed(2)} km`);

  // ---------- 3. danh sách tầng
  $("tgVung").value = "tinh"; $("tgVung").dispatchEvent(new w.Event("change")); $("tgHinh").value = "tron"; $("tgHinh").dispatchEvent(new w.Event("change"));
  ok(!$("tgR").closest("[data-hh]").hidden && $("dlgTang").querySelector("[data-rg]").hidden && /tự động: \d/.test($("tgR").placeholder), "hình tròn: hiện ô tâm, bán kính (gợi ý bán kính tự động), ẩn ô bỏ đảo");
  $("tgXoaHet").click(); ok(E("TG.tang.length") === 0 && /chưa có tầng/.test($("tgDS").textContent), "bỏ hết tầng");
  $("tgThem").click(); $("tgThem").click(); const k2 = E("TG.tang.map(t => t.k)");
  ok(k2.length === 2 && k2[0] !== k2[1], "thêm hai tầng khác lớp: " + k2.join(", "));
  const hang = $("tgDS").querySelectorAll(".tg-tang");
  ok(hang.length === 2 && hang[0].dataset.i === "1", "danh sách: tầng trên cùng ở đầu");
  hang[0].querySelector("[data-xuong]").click(); ok(E("TG.tang[0].k") === k2[1] && E("TG.tang[1].k") === k2[0], "đổi chỗ tầng (xuống dưới)");
  const sel = $("tgDS").querySelector('.tg-tang[data-i="0"] select[data-f=k]'); sel.value = "ovl:lulc_ctx"; sel.dispatchEvent(new w.Event("change", {bubbles: true}));
  ok(E("TG.tang[0].k") === "ovl:lulc_ctx" && E("TG.tang[0].nam") === 2025 && $("tgDS").querySelector('.tg-tang[data-i="0"] select[data-f=nam]'), "đổi lớp của tầng: lớp CTX, có ô chọn năm (2025)");
  const nh = $("tgDS").querySelector('.tg-tang[data-i="0"] input[data-f=nhan]'); nh.value = "Lớp phủ"; nh.dispatchEvent(new w.Event("input", {bubbles: true}));
  ok(E("TG.tang[0].nhan") === "Lớp phủ", "sửa nhãn tầng");
  $("tgDS").querySelector('.tg-tang[data-i="1"] [data-xoa]').click(); ok(E("TG.tang.length") === 1, "bỏ một tầng");
  $("tgNamLop").value = "ovl:lulc_ctx"; $("tgTheoNam").click();
  ok(E("TG.tang.map(t => t.k + ':' + t.nam + ':' + t.nhan).join()") === "ovl:lulc_ctx:2023:2023,ovl:lulc_ctx:2025:2025", "mỗi năm một tầng: CTX 2023 (đáy), 2025");
  E(`TG.tang.push({k: "xa", nhan: "", nen: "", op: 1})`); $("tgTongHop").checked = true; $("tgTongHop").dispatchEvent(new w.Event("change"));
  await sleep(200); await until(() => E("TG.P && TG.P.xong && TG.P.lat.length") === 4, 8000, "dựng lại");
  ok(E("TG.P.lat[0].t") === null && E("TG.P.lat.map(L => L.nen).join()") === "trang,trang,trang,khong", "tầng đáy tổng hợp; nền tấm tự động: lớp ảnh nền đặc, véc tơ không nền");
  ok(E("TG.P.lat[1].cg && TG.P.lat[1].cg.length") >= 2, "chú giải nhỏ của tầng CTX lấy từ bản đồ lớp");

  // ---------- 4. bố cục nằm trong khung ở nhiều góc, cả nhãn trái/phải, khổ ngang/dọc
  const bc = E(`(() => { const out = []; for (const [W, H] of [[1920, 1080], [1080, 1920], [2000, 2000]]) for (const xoay of [-90, -28, 0, 45, 135]) for (const nghieng of [15, 40, 90]) for (const nhan of ["phai", "trai", "khong"]) {
      const o = Object.assign({}, TG.o, {xoay, nghieng, nhan, tieuDe: "T", phuDe: "P", nguon: "N"}), c = tgGhep(o, TG.P, W, H), B = c._tg;
      const trai = B.cx + B.x0 * B.s, phai = B.cx + B.x1 * B.s, tren = B.cyB - (B.n - 1) * B.gap * B.s + B.y0 * B.s, duoi = B.cyB + B.y1 * B.s + B.day * B.s;
      const lab = B.co ? (nhan === "phai" ? phai + B.dan + B.cot <= W - B.le + 1 : trai - B.dan - B.cot >= B.le - 1) : true;
      out.push({W, H, xoay, nghieng, nhan, okv: trai >= B.le - 1 && phai <= W - B.le + 1 && tren >= B.le + B.dau - 1 && duoi <= H - B.le + 1 && B.s > 0 && lab}); }
    return {n: out.length, sai: out.filter(q => !q.okv)}; })()`);
  ok(bc.sai.length === 0, `bố cục: ${bc.n} tổ hợp (3 khổ × 5 góc xoay × 3 góc nhìn × 3 kiểu nhãn), tầng và cột nhãn đều nằm trong lề` + (bc.sai.length ? ": " + JSON.stringify(bc.sai.slice(0, 3)) : ""));
  const ga = E(`(() => { const o = Object.assign({}, TG.o, {gian: 0.5}), a = tgGhep(o, TG.P, 1600, 1200)._tg, b = tgGhep(Object.assign({}, o, {gian: 0.1}), TG.P, 1600, 1200)._tg; return [a.gap / a.fh, b.gap / b.fh, a.s < b.s]; })()`);
  ok(gan(ga[0], 0.5, 1e-9) && gan(ga[1], 0.1, 1e-9) && ga[2], "khoảng cách tầng theo chiều cao tấm đã chiếu; tầng giãn thì thu nhỏ để vừa khung");
  const dinh = E(`(() => { const s = [-60, -20, 20, 60].map(x => tgGhep(Object.assign({}, TG.o, {xoay: x}), TG.P, 1600, 1000, {coDinh: true})._tg.s); return Math.max(...s) - Math.min(...s); })()`);
  ok(dinh < 1e-9, "ảnh động: tỉ lệ không đổi khi xoay (khung cố định theo bán kính lớn nhất)");

  // ---------- 5. kéo trên ảnh xem trước: ngang xoay, dọc đổi góc nhìn
  const x0 = E("TG.o.xoay"), n0 = E("TG.o.nghieng"), cv = $("tgXem");
  cv.dispatchEvent(new w.MouseEvent("pointerdown", {bubbles: true, clientX: 100, clientY: 100})); cv.dispatchEvent(new w.MouseEvent("pointermove", {bubbles: true, clientX: 180, clientY: 60}));
  cv.dispatchEvent(new w.MouseEvent("pointerup", {bubbles: true, clientX: 180, clientY: 60}));
  ok(E("TG.o.xoay") === Math.round(x0 + 36) && E("TG.o.nghieng") === Math.min(90, Math.round(n0 + 12)) && $("tgXoayV").textContent === E("TG.o.xoay") + "°", `kéo chuột: xoay ${x0}° → ${E("TG.o.xoay")}°, góc nhìn ${n0}° → ${E("TG.o.nghieng")}°`);

  // ---------- 6. xuất PNG; ảnh động khi trình duyệt không hỗ trợ
  const nb = blobs.length; $("tgKho").value = "vuong"; $("tgKho").dispatchEvent(new w.Event("change")); $("tgXuat").click();
  await until(() => /đã xuất/.test($("tgTT").textContent), 15000, "xuất ảnh");
  ok(blobs.length > nb && blobs[blobs.length - 1].type === "image/png" && /xep_tang_.*_4tang_2000x2000_.*\.png/.test($("tgTT").textContent), "xuất PNG 2000 × 2000: " + $("tgTT").textContent.slice(0, 90));
  ok(+$("tgW").value === 2000 && +$("tgH").value === 2000 && E("JSON.parse(localStorage.getItem('laymau_hp_tang_v1')).kho") === "vuong", "khổ vuông, lưu tuỳ chọn");
  $("tgVid").click(); await until(() => /không quay được ảnh động/.test($("tgTT").textContent), 3000, "ảnh động");
  ok(true, "video: báo rõ trình duyệt không hỗ trợ (jsdom không có WebCodecs, MediaRecorder)");

  // ---------- 7. chọn tâm trên bản đồ
  $("tgChonTam").click(); await sleep(10);
  ok(!$("dlgTang").open && !!$("tgChonTamP"), "chọn tâm: đóng hộp, phủ lớp bắt nhấp lên bản đồ");
  $("tgChonTamP").dispatchEvent(new w.MouseEvent("click", {bubbles: true, clientX: 300, clientY: 200}));
  await sleep(30);
  ok($("dlgTang").open && !$("tgChonTamP") && E("TG.o.tam") === "diem" && Array.isArray(E("TG.tamDiem")) && $("tgTam").value === "diem", "nhấp bản đồ: đặt tâm, mở lại hộp, tâm = điểm chọn");
  const tt = E(`(() => { const G = tgHinhHoc(TG.o), b = G.bb; return [(b[0] + b[2]) / 2 - TG.tamDiem[0], (b[1] + b[3]) / 2 - TG.tamDiem[1]]; })()`);
  ok(Math.abs(tt[0]) < 1 && Math.abs(tt[1]) < 1, "hình tròn nằm đúng tâm đã chọn");

  // ---------- 8. tiếng Nga; không sót khoá; đóng
  E("setLang('ru')"); await sleep(50);
  ok(/Разнесённая схема слоёв/.test($("dlgTang").textContent) && /Уровни/.test($("bTang").textContent) && /круг/.test($("tgHinh").textContent), "tiếng Nga: hộp, nút, tên hình");
  const miss = E("[...T_MISS]").filter(x => /tầng|tấm|hình|xoay|nhãn|nền|ảnh động|tâm/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 6).join(" | ") : ""));
  E("setLang('vi')"); await sleep(30);
  $("tgDong").click(); ok(!$("dlgTang").open, "đóng hộp");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
