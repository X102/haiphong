// Bản 3.14: hậu xử lý phân loại (hàm thuần và trên dữ liệu giả), phân loại nhiều năm, tên phương án / tiêu đề bản đồ theo ngôn ngữ.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.14", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));

  // ---------- 1. hàm hậu xử lý (đáp án biết trước)
  ok(E(`(() => { const c = new Uint8Array(81).fill(1); c[40] = 2; const n = hxDaSo(c, 9, 9, 2, 1); return n === 1 && c.every(v => v === 1); })()`), "lọc đa số 3 × 3: điểm ảnh lẻ giữa vùng đổi theo xung quanh");
  ok(E(`(() => { const w = 10, c = new Uint8Array(100).fill(1); [[1,1],[1,2],[2,1],[2,2]].forEach(([y,x]) => { c[y*w+x] = 2; });
    for (let y = 5; y < 9; y++) for (let x = 5; x < 9; x++) c[y*w+x] = 3; const n = hxManhNho(c, w, 10, 9);
    return n === 4 && c[11] === 1 && c[55] === 3 && c.filter(v => v === 3).length === 16; })()`), "bỏ mảnh nhỏ: mảnh 4 điểm ảnh (< 9) gộp vào lớp xung quanh, mảnh 16 điểm ảnh giữ nguyên");
  ok(E(`(() => { const s = [Uint16Array.from([1,1,2,0]), Uint16Array.from([2,1,1,3]), Uint16Array.from([1,1,2,0])]; const n = hxThoiGian(s);
    return n === 2 && Array.from(s[1]).join() === "1,1,2,3"; })()`), "làm mịn theo năm: 1-2-1 thành 1-1-1, 2-1-2 thành 2-2-2; không đụng năm đầu, năm cuối, chỗ trống");
  const sl = E(`(() => { const w = 40, h = 20, N = w * h, P = new Float32Array(N), mask = new Uint8Array(N).fill(1), cls = new Uint8Array(N);
    let r = 7; const ng = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < N; i++) { const x = i % w, phai = x >= 20; P[i] = (phai ? 5 : 0) + 0.3 * ng(); cls[i] = (phai ? 2 : 1); if (ng() < 0.25) cls[i] = 3 - cls[i]; }
    const sai0 = Array.from(cls).filter((c, i) => c !== ((i % w) >= 20 ? 2 : 1)).length;
    const R = hxSLIC(P, 1, w, h, mask, 5, 1.5, 6); hxBoPhieu(cls, R.lab, R.n, 2, null);
    const sai = Array.from(cls).filter((c, i) => c !== ((i % w) >= 20 ? 2 : 1)).length;
    const qua = Array.from({length: R.n}, (_, k) => new Set(Array.from(R.lab).map((l, i) => l === k ? (i % w >= 20) : null).filter(v => v !== null)).size).filter(n => n > 1).length;
    return {sai0, sai, n: R.n, qua}; })()`);
  ok(sl.sai0 > 150 && sl.sai === 0 && sl.qua === 0, `đồng nhất trong đối tượng: 25 % điểm ảnh gán sai ngẫu nhiên (${sl.sai0}) còn ${sl.sai}; ${sl.n} đối tượng, không đối tượng nào vượt ranh giới hai vùng`);

  // ---------- 2. dữ liệu giả: bộ mẫu hai năm, xã Đông
  const mkPts = ds => E(`(() => { const o = []; ${JSON.stringify(ds)}.forEach(([r, c, ma]) => { const ll = CORE.toLL(660000 + c * 10 + 5, 2320000 - r * 10 - 5); o.push({lon: ll[0], lat: ll[1], nhan: {2023: ma, 2025: ma}}); }); return o; })()`);
  const P = mkPts([[200, 560, "N1"], [600, 600, "N1"], [1000, 640, "N1"], [400, 680, "N1"], [800, 720, "N1"], [300, 900, "N1"], [700, 950, "N1"],
                   [200, 1050, "X1"], [600, 1100, "X1"], [1000, 1200, "X1"], [300, 1300, "X1"], [800, 1400, "X1"]]);
  E(`taoBoTuDiem("mẫu nhiều năm thử", [2023, 2025], ${JSON.stringify(P)}, {})`); await sleep(100);
  const bo = E("ST.bo");
  E(`map.setView([20.95, 106.6], 11, {animate: false})`);
  $("bPL").click(); await until(() => E("VG.xa && VG.xa.length === 2") && $("plXa").options.length === 2, 8000, "xã");
  [...$("plXa").options].forEach(o => { o.selected = o.textContent === "Đông"; }); $("plPV").value = "xa"; $("plPV").onchange();
  $("plBo").value = bo; $("plPP").value = "ecl_mau"; $("plPP").onchange(); $("plK").value = "1"; $("plNguon").value = "trong";
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:/.test(i.value); });
  const chay = async (dk, ten) => { const t0 = E("PL.tok"); $("plChay").click(); await until(() => E("PL.tok") > t0 && /xong|lỗi/.test($("plTT").textContent) && E(dk), 90000, ten); await sleep(30); };
  const manh = `(() => { const K = PL.kq, w = K.g.w, h = K.g.h, c = K.cls, lab = new Int32Array(w * h); let n = 0, nho = 0; const q = [];
    for (let p = 0; p < w * h; p++) { if (!c[p] || lab[p]) continue; n++; let sz = 0; q.length = 0; q.push(p); lab[p] = n;
      while (q.length) { const t = q.pop(), x = t % w; sz++; [[t - 1, x > 0], [t + 1, x < w - 1], [t - w, t >= w], [t + w, t < w * (h - 1)]].forEach(([u, okk]) => { if (okk && !lab[u] && c[u] === c[t]) { lab[u] = n; q.push(u); } }); }
      if (sz < hxMinPx(K.g, 0.25)) nho++; }
    return {n, nho, tong: K.tong}; })()`;
  // không hậu xử lý
  $("plNhieu").checked = false; $("plNhieu").onchange(); $("plNam").value = "2025";
  ["plHxDT", "plHxDS", "plHxMMU"].forEach(id => { $(id).value = "0"; $(id).onchange(); });
  await chay("PL.kq && PL.kq.y === 2025 && !PL.kq.hx", "phân loại không hậu xử lý");
  const M0 = E(manh);
  // có hậu xử lý
  $("plHxDT").value = "100"; $("plHxDT").onchange(); $("plHxDS").value = "1"; $("plHxDS").onchange(); $("plHxMMU").value = "0.25"; $("plHxMMU").onchange();
  await chay("PL.kq && PL.kq.hx", "phân loại có hậu xử lý");
  const M1 = E(manh), hx = E("PL.kq.hx");
  ok(M1.nho === 0 && M1.n < M0.n && gan(M1.tong, M0.tong, 0.5) && hx.doi > 0 && hx.buoc.length === 3,
     `hậu xử lý (đối tượng ≈ 100 m, lọc 3 × 3, bỏ mảnh < 0.25 ha): ${M0.n} mảnh còn ${M1.n}, không còn mảnh < 0.25 ha (trước: ${M0.nho}), đổi lớp ${(100 * hx.doi / hx.tong).toFixed(1)} % điểm ảnh, tổng diện tích giữ nguyên`);
  ok(/Hậu xử lý: đồng nhất trong \d+ đối tượng ≈ 100 m, lọc đa số 3 × 3, bỏ mảnh nhỏ hơn 0.25 ha; đổi lớp [\d.]+ % điểm ảnh/.test($("plTom").textContent) && E(`JSON.parse(localStorage.getItem("laymau_hp_pl_hx_v1")).dt`) === 100,
     "tóm tắt ghi các bước hậu xử lý; trình duyệt nhớ lựa chọn");
  ok(/^Phân loại 2025 · Đông$/.test($("plTen").value), "ô tên đổi theo kết quả mới: " + $("plTen").value);

  // ---------- 3. nhiều năm
  $("plNhieu").checked = true; $("plNhieu").onchange(); await sleep(20);
  ok(!$("plNamDSW").hidden && $("plNamDS").querySelectorAll("input").length >= 2, "ô nhiều năm: danh sách năm có ô tích");
  $("plNamDS").querySelectorAll("input").forEach(i => { i.checked = i.value === "2023" || i.value === "2025"; }); $("plNamDS").querySelector("input").onchange();
  const t0 = E("PL.loatTok"); $("plChay").click();
  await until(() => E("PL.loatNam && PL.loatNam.length === 2") && E("PL.loatTok") === t0 + 1, 120000, "nhiều năm");
  await sleep(50);
  ok(E("PL.loatNam.join()") === "2023,2025" && !$("plLoatR").hidden && $("plTom").querySelectorAll("table tr").length === 3 && /Các năm/.test($("plTom").textContent),
     "chạy hai năm 2023, 2025: bảng tóm tắt hai dòng, ô chọn năm kết quả");
  ok(/^Phân loại 2023, 2025 · Đông$/.test($("plTen").value), "tên tự động ghi các năm: " + $("plTen").value);
  $("plLoatNam").value = "2023"; $("plLoatNam").onchange(); await sleep(30);
  ok(E("PL.kq.y") === 2023 && /Năm 2023/.test($("plTom").textContent), "xem kết quả năm 2023");
  const xb = E(`(() => { const d = xbDS().find(q => q.k === "pl"); return {nam: d.nam, ten: d.ten}; })()`);
  ok(xb.nam.join() === "2023,2025" && /2023, 2025/.test(xb.ten), "xuất bản đồ: kết quả phân loại chọn được năm");
  $("plLuu").click(); await sleep(50);
  const pa = E(`(() => { const p = PA.rieng[PA.rieng.length - 1]; return {id: p.id, nam: p.nam, du: Object.keys(p.du), td: p.ten_tu_dong, ten: p.ten}; })()`);
  ok(pa.nam.join() === "2023,2025" && pa.du.join() === "2023,2025" && pa.td && pa.td.nam === "2023, 2025" && pa.td.pv === "Đông", "lưu một phương án nhiều năm (bản đồ của cả hai năm), tên lưu dạng cấu trúc");

  // ---------- 4. tiếng Nga: tên phương án, tên cũ, tiêu đề và chú giải bản đồ xuất
  E(`PA.rieng.push({id: "cu1", ten: "Phân loại 2025 · Đông Hải", nguon: "tao", nam: [2025], lop: {11: {ten: "N1 Sông, kênh, hồ, mặt nước chuyên dùng", mau: "#1f5fbf"}}, du: {}})`);
  E("setLang('ru')"); await sleep(100);
  ok(E(`paTen(PA.rieng.find(p => p.id === "${pa.id}"))`) === "Классификация 2023, 2025 · Dong" && E(`paTen(PA.rieng.find(p => p.id === "cu1"))`) === "Классификация 2025 · Dong Hai",
     "tiếng Nga: tên tự động dựng lại theo ngôn ngữ, địa danh không dấu; cả phương án lưu trước đây");
  const tom = $("plTom").textContent.replace(/mẫu nhiều năm thử/g, "");
  ok(E(`diaDanh("Đông Hải; объединённый район")`) === "Dong Hai; объединённый район", "bỏ dấu địa danh Việt, giữ nguyên chữ Nga (й, ё)");
  ok(/^Classification|^Классификация/.test(E(`paMoTa(PA.rieng.find(p => p.id === "${pa.id}"))`) ? "Классификация" : "") && !VI.test(E(`paMoTa(PA.rieng.find(p => p.id === "${pa.id}"))`)), "dòng thông tin phương án không còn chữ Việt: " + E(`paMoTa(PA.rieng.find(p => p.id === "${pa.id}"))`));
  ok(/^Классификация 2023, 2025 · Dong$/.test($("plTen").value) && !VI.test(tom), "ô tên và tóm tắt bằng tiếng Nga" + (VI.test(tom) ? ": " + (tom.match(/.{0,40}[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ].{0,40}/gi) || []).join(" | ") : ""));
  E(`xbMo("pa:${pa.id}", "kq")`); await sleep(80);
  ok($("xbTieuDe").value === "Классификация 2025" && $("xbPhuDe").value === "Dong", `hộp xuất: tiêu đề, phụ đề tự đặt theo phương án (${$("xbTieuDe").value} / ${$("xbPhuDe").value})`);
  const R = await E(`(async () => { const R = await xbVe(Object.assign({}, xbDoc(), {dpi: 30})); const g = R.CG.find(q => q.k === "pa:${pa.id}"); return g ? {t: g.tieuDe, m: g.muc.map(m => m.ten)} : null; })()`);
  ok(R && R.t === "Классификация 2025 · Dong" && R.m.every(t => !VI.test(t)), "chú giải: tiêu đề đúng năm đang xuất, không còn chữ Việt: " + (R && R.t));
  ok(/^ban_do_Klassifikatsiya_2025_Dong_/.test(E(`xbTenTep(xbDoc())`)), "tên tệp: " + E(`xbTenTep(xbDoc())`));
  $("xbTieuDe").value = "Моя карта"; $("xbTieuDe").dispatchEvent(new w.Event("input")); E(`xbMo("pa:${pa.id}", "kq")`); await sleep(30);
  ok($("xbTieuDe").value === "Моя карта", "tiêu đề tự gõ được giữ khi mở lại cùng nội dung");
  $("xbND").value = "man"; $("xbND").onchange(); await sleep(30);
  ok($("xbTieuDe").value === "" && $("xbPhuDe").value === "", "đổi sang nội dung khác: tiêu đề cũ không bị mang theo");
  w.document.getElementById("dlgXB").close();
  E(`paDoiTen("${pa.id}", "Карта Донг")`);
  ok(E(`paTen(PA.rieng.find(p => p.id === "${pa.id}"))`) === "Карта Донг" && !E(`PA.rieng.find(p => p.id === "${pa.id}").ten_tu_dong`), "đổi tên: tên người dùng đặt thay cho tên tự động");

  // ---------- 5. dịch, lỗi
  ok(/несколько лет/.test($("plNhieu").parentElement.textContent) && /Постобработка/.test($("plHxW").textContent) && /мажоритарный фильтр/.test($("plHxW").textContent), "tiếng Nga: ô nhiều năm, hậu xử lý");
  const miss = E("[...T_MISS]").filter(x => /năm|hậu xử lý|đối tượng|mảnh|lọc|phương án|Phân loại/i.test(x) && !/thử/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
