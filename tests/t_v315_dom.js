// Bản 3.15: phân loại theo khối (huấn luyện một lần, phân loại từng khối, ghép) cho phạm vi lớn; tự chuyển khi lưới đơn quá lớn;
// ảnh thu nhỏ để hiện; mã Worker; gộp nhiều phương án thành một bản đồ.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
(async () => {
  const {w, $, E, sleep, until, errs, puts} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.15", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  ok([...$("plLuoi").options].map(o => o.value).join() === "900,1500,2500,k0,k10,k20,k30", "ô Lưới có các chế độ theo khối");

  // ---------- 1. dữ liệu giả: bộ mẫu hai năm, xã Đông
  const mkPts = ds => E(`(() => { const o = []; ${JSON.stringify(ds)}.forEach(([r, c, ma]) => { const ll = CORE.toLL(660000 + c * 10 + 5, 2320000 - r * 10 - 5); o.push({lon: ll[0], lat: ll[1], nhan: {2023: ma, 2025: ma}}); }); return o; })()`);
  const P = mkPts([[200, 560, "N1"], [600, 600, "N1"], [1000, 640, "N1"], [400, 680, "N1"], [800, 720, "N1"], [300, 900, "N1"], [700, 950, "N1"],
                   [200, 1050, "X1"], [600, 1100, "X1"], [1000, 1200, "X1"], [300, 1300, "X1"], [800, 1400, "X1"]]);
  E(`taoBoTuDiem("mẫu khối thử", [2023, 2025], ${JSON.stringify(P)}, {})`); await sleep(100);
  const bo = E("ST.bo");
  E(`map.setView([20.95, 106.6], 11, {animate: false})`);
  $("bPL").click(); await until(() => E("VG.xa && VG.xa.length === 2") && $("plXa").options.length === 2, 8000, "xã");
  const chonXa = ten => { [...$("plXa").options].forEach(o => { o.selected = o.textContent === ten; }); $("plPV").value = "xa"; $("plPV").onchange(); };
  chonXa("Đông");
  $("plBo").value = bo; $("plPP").value = "ecl_mau"; $("plPP").onchange(); $("plK").value = "1"; $("plNguon").value = "trong";
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:/.test(i.value); });
  $("plNhieu").checked = false; $("plNhieu").onchange(); $("plNam").value = "2025";
  ["plHxDT", "plHxDS", "plHxMMU"].forEach(id => { $(id).value = "0"; $(id).onchange(); });
  const chay = async (dk, ten) => { const t0 = E("PL.tok"); $("plChay").click(); await until(() => E("PL.tok") > t0 && /xong|lỗi|ошибка|готово/.test($("plTT").textContent) && E(dk), 120000, ten); await sleep(30); };
  const tom = () => E(`(() => { const K = PL.kq; return {g: [K.g.x0, K.g.y1, K.g.w, K.g.h, K.g.res].join(), tong: K.tong, n: K.nMau, khoi: K.khoi || null, dt: Array.from(K.dt), hx: K.hx}; })()`);

  // ---------- 2. lưới đơn và theo khối 10 m: cùng kết quả
  $("plLuoi").value = "2500";
  await chay("PL.kq && !PL.kq.khoi", "lưới đơn");
  const A = tom(); E(`window.__A = PL.kq.cls.slice()`);
  $("plLuoi").value = "k10"; $("plLuoi").dispatchEvent(new w.Event("change"));
  await chay("PL.kq && PL.kq.khoi", "theo khối 10 m");
  const B = tom();
  const kh = E(`(() => { const a = window.__A, b = PL.kq.cls; if (a.length !== b.length) return null; let n = 0, k = 0; for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) { n++; if (a[i] === b[i]) k++; } } return {n, k}; })()`);
  ok(A.g === B.g && kh && kh.k / kh.n >= 0.999 && Math.abs(A.tong - B.tong) < 0.01 * A.tong && A.n === B.n,
     `theo khối (${B.khoi.n} khối ${B.khoi.B} × ${B.khoi.B}, lề 10) khớp lưới đơn cùng bước 10 m: ${kh ? (100 * kh.k / kh.n).toFixed(3) : "?"} % điểm ảnh cùng lớp, diện tích ${A.tong.toFixed(1)} / ${B.tong.toFixed(1)} ha, ${B.n} mẫu`);
  ok(/Theo khối: \d+ khối 512 × 512 điểm ảnh, lưới 10 m/.test($("plTom").textContent) && E(`localStorage.getItem("laymau_hp_pl_luoi_v1")`).includes("k10"), "tóm tắt ghi số khối, bước lưới; trình duyệt nhớ chế độ lưới");
  ok(B.khoi.worker === false && E("PL.kq.s1") === null, "jsdom không có Worker: tính ngay trên trang; không giữ bản đồ độ giống mẫu");
  $("plXem").value = "tin"; $("plXem").onchange(); await sleep(20);
  ok($("plXem").value === "lop" && E("!!PL.hien"), "chế độ xem “độ giống mẫu” tự về “lớp” khi theo khối");

  // ---------- 3. mã Worker: chạy được và cho đúng kết quả như trên trang
  const wk = await E(`(async () => { const ma = plWorkerMa(); let kq = null; const f = new Function("postMessage", "var onmessage;" + ma + "\\nreturn onmessage;")(m => { kq = m; });
    const nf = 4, n = 300, F = new Uint8Array(n * nf), valid = new Uint8Array(n).fill(1); let r = 3; for (let i = 0; i < F.length; i++) { r = (r * 1103515245 + 12345) % 2147483648; F[i] = r % 256; } valid[7] = 0;
    const mu = [100, 120, 90, 110], a = [0.02, 0.03, 0.025, 0.01], V = [], lab = []; for (let i = 0; i < 30; i++) { V.push(plChuan(F.subarray(i * nf, i * nf + nf), mu, a, new Float32Array(nf))); lab.push(i % 3); }
    const refs = plThamChieu(V, lab, 3, "cos_mau", 300), s = 1 / (255 * 2);
    f({data: {id: 5, F, nf, valid, mu, a, refs: refs.map(q => ({v: Array.from(q.v), k: q.k})), K: 3, cos: true, s, kv: 3}});
    const T_ = await plTinhKhoi(F, nf, valid, mu, a, refs, 3, true, s, 3);
    let k = 0; for (let i = 0; i < n; i++) if (kq.cls[i] === T_.cls[i] && Math.abs(kq.mg[i] - T_.mg[i]) < 1e-6) k++;
    return {id: kq.id, k, n, rong: kq.cls[7]}; })()`);
  ok(wk.id === 5 && wk.k === wk.n && wk.rong === 0, `mã Worker (dựng từ plChuan, plGiong, plXep của trang) cho đúng kết quả như tính trên trang: ${wk.k}/${wk.n} điểm ảnh`);

  // ---------- 4. lưới đơn quá lớn: tự chuyển sang theo khối
  E(`DOC_MAX_PX = 4e6`);
  $("plLuoi").value = "900";
  await chay("PL.kq && PL.kq.khoi && PL.kq.khoi.tuDong", "tự chuyển");
  ok(E("PL.kq.khoi.tuDong") && /Đã tự chuyển sang theo khối/.test($("plTom").textContent) && /xong/.test($("plTT").textContent),
     "lưới đơn báo “vùng đọc quá lớn” (trần đọc hạ xuống 4 triệu giá trị): tự chuyển sang theo khối và chạy xong");
  E(`DOC_MAX_PX = 60e6`);

  // ---------- 5. hậu xử lý theo khối
  $("plLuoi").value = "k10"; $("plHxDT").value = "100"; $("plHxDT").onchange(); $("plHxDS").value = "1"; $("plHxDS").onchange(); $("plHxMMU").value = "0.25"; $("plHxMMU").onchange();
  await chay("PL.kq && PL.kq.khoi && PL.kq.hx", "theo khối có hậu xử lý");
  const H = tom();
  ok(H.hx.buoc.length === 3 && H.hx.buoc[0][1] > 0 && H.hx.doi > 0 && Math.abs(H.tong - B.tong) < 0.001 * B.tong && /Hậu xử lý: đồng nhất trong \d+ đối tượng ≈ 100 m/.test($("plTom").textContent),
     `hậu xử lý chạy trong từng khối (${H.hx.buoc[0][1]} đối tượng, đổi lớp ${(100 * H.hx.doi / H.hx.tong).toFixed(1)} % điểm ảnh), tổng diện tích giữ nguyên`);
  ["plHxDT", "plHxDS", "plHxMMU"].forEach(id => { $(id).value = "0"; $(id).onchange(); });

  // ---------- 6. ảnh thu nhỏ để hiện, xuất
  E(`PL_KHOI.HIEN = 300`);
  const np = puts.length, c = E(`(() => { const c = plCanvas(PL.kq, "lop"); return {w: c.width, h: c.height, W: PL.kq.g.w, H: PL.kq.g.h}; })()`); c.n = puts[np] ? puts[np].op : 0;
  ok(Math.max(c.w, c.h) <= 300 && c.n > 0.3 * c.w * c.h && Math.abs(c.w / c.h - c.W / c.H) < 0.02, `bản đồ lớn hiện bằng ảnh thu nhỏ: ${c.W} × ${c.H} → ${c.w} × ${c.h} điểm ảnh`);

  // ---------- 7. nhiều năm theo khối
  $("plNhieu").checked = true; $("plNhieu").onchange(); await sleep(20);
  $("plNamDS").querySelectorAll("input").forEach(i => { i.checked = i.value === "2023" || i.value === "2025"; }); $("plNamDS").querySelector("input").onchange();
  const t0 = E("PL.loatTok"); $("plChay").click();
  await until(() => E("PL.loatNam && PL.loatNam.length === 2") && E("PL.loatTok") === t0 + 1, 180000, "nhiều năm theo khối");
  await sleep(50);
  const L2 = E(`(() => ({nam: PL.loatNam.join(), khoi: PL.loatNam.every(y => PL.loat[y].khoi), xa23: !!PL.loat[2023].xa, xa25: !!PL.loat[2025].xa}))()`);
  ok(L2.nam === "2023,2025" && L2.khoi && !L2.xa23 && L2.xa25, "hai năm 2023, 2025 theo khối; dữ liệu chẩn đoán lớn của năm trước được bỏ để đỡ bộ nhớ");
  const cg = E(`(() => { const g = xbCGPL(PL.loat[2023], "cb"); const r = g.dem([-1e9, -1e9, 1e9, 1e9].reduce((o, v, i) => (o[["x0","y0","x1","y1"][i]] = v, o), {}), null); return {k: g.muc.length, tong: r.tong}; })()`);
  ok(cg.k >= 2 && cg.tong > 0, "xuất bản đồ năm trước ở chế độ cảnh báo: tự về chú giải lớp, không lỗi");
  $("plLuu").click(); await sleep(80);
  const paD = E(`(() => { const p = PA.rieng[PA.rieng.length - 1]; return {id: p.id, nam: p.nam.join(), n: p.du[2025].data.reduce((s, v) => s + (v ? 1 : 0), 0)}; })()`);
  ok(paD.nam === "2023,2025" && paD.n > 0, "lưu phương án nhiều năm từ kết quả theo khối");
  const pc = E(`(() => { const c = paCanvas(PA.rieng.find(p => p.id === "${paD.id}"), 2025); return [c.width, c.height]; })()`);
  ok(Math.max(...pc) <= 300, "phương án lớn hiện bằng ảnh thu nhỏ: " + pc.join(" × "));
  E(`PL_KHOI.HIEN = 4096`);

  // ---------- 8. xã Tây (mẫu: mọi điểm đã gán), rồi gộp hai xã
  $("plNhieu").checked = false; $("plNhieu").onchange(); $("plNam").value = "2025";
  chonXa("Tây"); $("plNguon").value = "all"; $("plTen").dataset.tay = "";
  await chay("PL.kq && PL.kq.khoi && /Tây/.test(v27TenPV(PL.kq.PV))", "xã Tây theo khối");
  $("plLuu").click(); await sleep(80);
  const paT = E(`(() => { const p = PA.rieng[PA.rieng.length - 1]; return {id: p.id, n: p.du[2025].data.reduce((s, v) => s + (v ? 1 : 0), 0)}; })()`);
  E(`TK.chon = ["${paT.id}", "${paD.id}"]; tkVeDS()`); await sleep(30);
  $("tkPA").querySelectorAll("input[type=checkbox]").forEach(i => { i.checked = i.value === paT.id || i.value === paD.id; });
  ok(!!$("tkGop") && /Gộp các phương án đã chọn/.test($("tkGop").textContent), "nút gộp phương án ở Thống kê lớp phủ");
  const nPA = E("PA.rieng.length"); $("tkGop").click();
  await until(() => E("PA.rieng.length") === nPA + 1 && /đã gộp/.test($("tkGopTT").textContent), 20000, "gộp");
  const G = E(`(() => { const p = PA.rieng[PA.rieng.length - 1]; return {ten: paTen(p), nam: p.nam.join(), n: p.du[2025].data.reduce((s, v) => s + (v ? 1 : 0), 0), n23: p.du[2023] ? p.du[2023].data.reduce((s, v) => s + (v ? 1 : 0), 0) : 0, res: p.du[2025].g0.res, lop: Object.keys(p.lop).length}; })()`);
  ok(G.nam === "2023,2025" && G.res === 10 && G.n === paT.n + paD.n && G.n23 === E(`PA.rieng.find(p => p.id === "${paD.id}").du[2023].data.reduce((s, v) => s + (v ? 1 : 0), 0)`) && G.lop >= 2,
     `gộp hai xã: ${paT.n} + ${paD.n} = ${G.n} điểm ảnh (năm 2025), năm 2023 chỉ có ở Đông; lưới ${G.res} m; tên “${G.ten}”`);
  ok(/^Gộp 2 phương án: /.test(G.ten), "tên tự đặt cho bản gộp");
  let loi = null; try { await E(`paGop(["${paT.id}"])`); } catch (e) { loi = String(e.message || e); }
  ok(loi && /ít nhất hai phương án/.test(loi), "gộp cần ít nhất hai phương án");

  // ---------- 9. tiếng Nga
  E("setLang('ru')"); await sleep(100);
  ok(/по блокам, 10 м/.test([...$("plLuoi").options].map(o => o.textContent).join("|")) && /Объединить выбранные варианты/.test($("tkGop").textContent) && /По блокам: \d+ блоков 512 × 512 пикселей/.test($("plTom").textContent),
     "tiếng Nga: ô Lưới, nút gộp, tóm tắt theo khối");
  const miss = E("[...T_MISS]").filter(x => /khối|gộp|phương án|lưới/i.test(x) && !/thử/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  ok(!VI.test($("plTom").textContent.replace(/mẫu khối thử|Tây|Đông/g, "")), "tóm tắt không còn chữ Việt");
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
