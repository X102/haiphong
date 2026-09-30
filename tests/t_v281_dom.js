// Bản 2.8.1: giao diện ru/en không còn chuỗi tiếng Việt trong thống kê vùng (tên lớp của manifest, đơn vị ha), bộ điểm ứng viên
const {ok, xong} = require("./kiemtra"), {moTrang} = require("./trang");
(async () => {
  const {w, $, E, sleep, until} = moTrang({geoman: true});
  await until(() => E("MAN") && E("VG.xa") && E("VG.xa.length") > 0, 8000, "manifest + xã");
  const coLop = E("MAN.layers.filter(l => l.kieu === 'lop').map(l => l.id)");
  ok(coLop.includes("wc"), "dữ liệu giả có lớp WorldCover (lop): " + coLop.join(","));
  for (const L_ of ["ru", "en"]) {
    E(`setLang('${L_}')`); await sleep(80);
    await E(`(async () => { const r = await vgTKDaGiac(VG.xa[0].mp); window.__r = r; vgHienTK(r.st, r.g, r.lop, "", null); })()`);
    const lopTen = E("__r.lop.map(l => lname(l))"), xa = E("VG.xa.map(x => x.ten)");
    let txt = $("vgTK").textContent; xa.forEach(t => { txt = txt.split(t).join(""); });   // tên xã là địa danh, giữ nguyên
    ok(E("__r.lop.every(l => l.ten_ru && l.ten_en || !MAN.layers.find(m => m.id === l.id).ten_ru)"), `${L_}: bản sao lớp giữ ten_ru, ten_en`);
    ok(lopTen.every(t => !E(`VI_RE.test(${JSON.stringify(t)})`)), `${L_}: tên lớp trong thống kê không còn tiếng Việt: ${lopTen.join(" | ")}`);
    ok(!E(`VI_RE.test(${JSON.stringify(txt)})`), `${L_}: bảng thống kê vùng không còn chữ tiếng Việt: ${txt.slice(0, 400)}`);
    ok(L_ === "ru" ? /\d га/.test(txt) && !/\d ha/.test(txt) : /\d ha/.test(txt), `${L_}: đơn vị diện tích ${L_ === "ru" ? "га" : "ha"}`);
    ok(L_ === "ru" ? /км²/.test(txt) && !/km²/.test(txt) : /km²/.test(txt), `${L_}: km² theo ngôn ngữ`);
    ok(E(`T("km")`) === (L_ === "ru" ? "км" : "km") && E(`T("m")`) === (L_ === "ru" ? "м" : "m"), `${L_}: đơn vị thước tỉ lệ trên bản đồ xuất`);
    ok(E(`T("1371 điểm ứng viên phân tầng (lớp CTX 2025 × cụm PCA)")`) !== "1371 điểm ứng viên phân tầng (lớp CTX 2025 × cụm PCA)", `${L_}: tên bộ 1371 điểm ứng viên đã dịch`);
    ok(!/E6/.test(E(`lname({id: "lulc_ctxts", ten: "Bản đồ 3 lớp CTX+TS11 (E6)"})`)), `${L_}: tên lớp CTX+PC không còn mã nội bộ E6`);
  }
  E("setLang('vi')"); await sleep(50);
  ok(E(`lname({id: "lulc_ctxts", ten: "Bản đồ 3 lớp CTX+TS11 (E6)"})`) === "Bản đồ 3 lớp CTX + PC chuỗi năm", "vi: tên lớp CTX+PC không còn mã E6");
  xong();
})().catch(e => { console.error("LỖI", e); process.exit(1); });
