// Bản 2.3: điểm tra cứu (nhấp bản đồ xem dải ảnh + đường mùa vụ), ẩn bảng chính, tìm xã theo tên, nhóm xã,
// điểm mẫu có hiệu lực theo xã / bán kính, trừ chỗ đã lưu, chốt khu, ẩn vùng đã lưu, so sánh các năm có bản đồ và biểu đồ
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json");
(async () => {
  const {w, $, E, sleep, key, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("2.3", undefined, {numeric: true}) >= 0, "bản 2.3");
  const click = (lon, lat, oe) => E(`map.fire("click", {latlng: L.latLng(${lat}, ${lon}), originalEvent: ${JSON.stringify(oe || {})}})`);

  // ---------- hàm thuần
  const eq = E(`(() => { const N = 900, nf = 3, F = new Uint8Array(N * nf), v = new Uint8Array(N).fill(1); let s = 7;
      const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let i = 0; i < F.length; i++) F[i] = Math.floor(r() * 256); for (let i = 0; i < N; i += 13) v[i] = 0;
      const G = [[[10, 200, 30], [120, 40, 90]], [[200, 200, 10]], [[60, 60, 60], [250, 5, 128]]], ng = [[128, 128, 128]];
      const a = CORE.distSelMulti(F, nf, N, v, G, ng, 0.35, null);
      const seeds = []; G.forEach((g, gi) => g.forEach(q => seeds.push({g: gi, v: q, dom: null}))); ng.forEach(q => seeds.push({g: -1, v: q, dom: null}));
      const b = CORE.distSelZoned(F, nf, N, v, seeds, 0.35, null, null, null, false);
      let dc = 0, dd = 0; for (let i = 0; i < N; i++) { if (a.cls[i] !== b.cls[i]) dc++; if (v[i] && Math.abs(a.d[i] - b.d[i]) > 1e-6) dd++; }
      return {dc, dd, n: [...a.cls].filter(Boolean).length}; })()`);
  ok(eq.dc === 0 && eq.dd === 0 && eq.n > 50, `distSelZoned không miền, không chặn: trùng khít distSelMulti (${eq.n} điểm ảnh được chọn, lệch ${eq.dc})`);
  const zn = E(`(() => { const F = new Uint8Array([10, 12, 90, 88, 11, 91]), v = new Uint8Array(6).fill(1);
      const S = [{g: 0, v: [10], dom: Int32Array.from([0, 1, 2])}, {g: 1, v: [90], dom: Int32Array.from([3, 4, 5])}];
      return Array.from(CORE.distSelZoned(F, 1, 6, v, S, 0.5, null, null, null, false).cls); })()`);
  ok(JSON.stringify(zn) === "[1,1,1,2,2,2]", `mỗi mẫu chỉ quyết định trong miền của nó: ô 90 ở miền A vẫn về A, ô 11 ở miền B về B ${JSON.stringify(zn)}`);
  const ch = E(`[CORE.chan(0, 3, false), CORE.chan(3, 3, false), CORE.chan(5, 3, false), CORE.chan(3, 3, true), CORE.chan(5, 0, false), CORE.chan(CORE.KHOA + 3, 3, false), CORE.chan(CORE.KHOA + 5, 0, false), CORE.chan(4, -1, false)]`);
  ok(JSON.stringify(ch) === "[false,false,true,true,false,true,true,true]", `luật chặn: tự do / cùng lớp / lớp khác / trừ hết / mẫu chưa gán lớp / khu đã chốt chặn cả cùng lớp ${JSON.stringify(ch)}`);
  const cp = E("(() => { const g = CORE.gridFor([11800000, 2380000, 11810000, 2390000], 2000, {x0: 0, y1: 0, res0: 10}); const ll = CORE.m2ll(11805000, 2385000); return {n: CORE.circlePix(g, ll[0], ll[1], 1000).length, c: Math.cos(ll[1] * Math.PI / 180)}; })()");
  const kyv = Math.PI * Math.pow(1000 / (10 * cp.c), 2);
  ok(Math.abs(cp.n - kyv) / kyv < 0.02, `circlePix: số điểm ảnh trong vòng 1 km ≈ π r² (${cp.n} so với ${kyv.toFixed(0)})`);
  ok(E("CORE.khongDau('Thuỷ Nguyên')") === "thuy nguyen" && E("CORE.khongDau('ĐÔNG Hải')") === "dong hai", "tìm không dấu: Thuỷ Nguyên -> thuy nguyen, Đ -> d");

  // ---------- điểm tra cứu
  E("setYear(2025)");
  E(`map.setView([${RV.lang[0][1]}, ${RV.lang[0][0]}], 14, {animate: false})`);
  ok(E("TRA_ON") === true && $("cTra").checked, "mặc định bật tra cứu khi nhấp bản đồ");
  click(RV.lang[0][0], RV.lang[0][1]);
  await until(() => E("PROBE") && $("strip").querySelectorAll(".it").length >= 2, 5000, "dải ảnh của điểm tra cứu");
  ok(E("PROBE.id") === "⌖" && !E("ST.diem['⌖']") && /Điểm tra cứu/.test($("vzNguon").textContent) && E("!!traDau && map.hasLayer(traDau)"),
     "nhấp bản đồ: điểm tra cứu tạm (không vào bộ điểm), có dấu trên bản đồ, dòng đầu ghi rõ");
  await until(() => $("curve").querySelector("svg") || /không có/.test($("curve").textContent), 5000, "đường mùa vụ điểm tra cứu");
  ok(!!$("curve").querySelector("svg"), "đường mùa vụ tái dựng từ ảnh PC tại điểm tra cứu");
  $("selCurveKind").value = "nam"; $("selCurveKind").onchange();
  await until(() => $("curve").querySelectorAll("circle").length >= E("MAN.pc.k"), 5000, "đồ thị theo năm của điểm tra cứu");
  ok($("curve").querySelectorAll("circle").length >= E("MAN.pc.k"), "đồ thị giá trị theo năm (PC) cũng theo điểm tra cứu");
  $("selCurveKind").value = "ky"; $("selCurveKind").onchange();
  const nd0 = E("Object.keys(ST.diem).length");
  $("vzNguon").querySelector('[data-a="them"]').click(); await sleep(50);
  ok(E("Object.keys(ST.diem).length") === nd0 + 1 && E("PROBE") === null && E("cur().bo") === "tay" && Math.abs(E("cur().lat") - RV.lang[0][1]) < 1e-4,
     "＋ thêm thành điểm: điểm thật ở đúng chỗ tra cứu, bỏ điểm tra cứu");
  click(RV.lang[1][0], RV.lang[1][1]); await sleep(50);
  ok(E("PROBE") && /về điểm/.test($("vzNguon").textContent), "có điểm đang gán: nút quay về điểm đó");
  $("vzNguon").querySelector('[data-a="ve"]').click(); await sleep(30);
  ok(E("PROBE") === null && E("vizPt().id") === E("ST.cur"), "↩ về điểm đang gán");
  click(RV.lang[1][0], RV.lang[1][1]); E("select('E0001', false)"); ok(E("PROBE") === null, "chọn một điểm thật thì bỏ điểm tra cứu");
  $("cTra").checked = false; $("cTra").onchange(); click(RV.lang[1][0], RV.lang[1][1]);
  ok(E("PROBE") === null && E("ls('laymau_hp_tra_v1')") === false, "tắt tra cứu: nhấp bản đồ không đặt điểm tra cứu, trang nhớ lựa chọn");
  $("cTra").checked = true; $("cTra").onchange();

  // ---------- ẩn bảng chính
  $("bSideAn").click(); await sleep(80);
  ok(w.document.body.classList.contains("side-an") && !$("ctlSide").hidden, "ẩn bảng điều khiển chính, hiện nút ☰ trên bản đồ");
  $("ctlSide").click(); await sleep(80);
  ok(!w.document.body.classList.contains("side-an") && $("ctlSide").hidden, "☰ mở lại bảng");
  key("["); ok(w.document.body.classList.contains("side-an"), "phím [ ẩn / hiện bảng"); key("[");

  // ---------- tìm xã theo tên
  $("xaTimB").click(); await sleep(50);
  await until(() => E("VG.xa && VG.xa.length") === 2, 5000, "ranh giới xã khi bấm tìm");
  $("xaTim").value = "dong"; $("xaTim").oninput(); await sleep(50);
  ok($("xaGoiY").querySelectorAll("li[data-i]:not([data-w])").length === 1 && /Đông/.test($("xaGoiY").textContent), "gõ không dấu 'dong' gợi ý xã Đông");
  $("xaTim").onkeydown(new w.KeyboardEvent("keydown", {key: "Enter"})); await sleep(50);
  const xD = E("VG.xa.find(x => x.ten === 'Đông').bl"), c0 = E("[map.getCenter().lng, map.getCenter().lat]");
  ok(E("!!XT.hl && map.hasLayer(XT.hl)") && c0[0] > xD[0] && c0[0] < xD[2] && c0[1] > xD[1] && c0[1] < xD[3], "Enter: bay tới xã Đông, tô sáng ranh giới");

  // ---------- chọn vùng: phạm vi theo xã rõ ràng
  const P = RV.lang.concat(RV.dai);
  E(`map.fitBounds([[${Math.min(...P.map(q => q[1])) - 0.004}, ${Math.min(...P.map(q => q[0])) - 0.004}], [${Math.max(...P.map(q => q[1])) + 0.004}, ${Math.max(...P.map(q => q[0])) + 0.004}]], {animate: false})`);
  key("o"); await sleep(60);
  E("vg$('vgTau').value = '0.2'; vg$('vgMin').value = '0'; vg$('vgTru').value = 'khong'; vg$('vgHL').value = 'all'");
  E("vg$('vgPV').value = 'xa'; vgPVHien()");
  ok($("vgXaW").hidden && /xã có điểm mẫu/.test($("vgPVGiai").textContent), "phạm vi 'xã có điểm mẫu': ẩn danh sách, có câu giải thích");
  [...$("vgXa").options].forEach(o => { o.selected = o.textContent === "Đông"; });           // chọn nhầm một dòng trong danh sách
  click(RV.lang[0][0], RV.lang[0][1]);
  await until(() => E("VG.kq && VG.kq.prm.pv") === "xa", 8000, "phạm vi xã có điểm mẫu");
  const xaTay = E("VG.xa.find(x => x.ten === 'Tây').i");
  ok(JSON.stringify(E("Object.keys(VG.res.st.theo_xa).filter(k => +k > 0).map(Number)")) === JSON.stringify([xaTay]),
     "đặt điểm ở xã Tây: tìm khắp xã Tây, không bị dòng chọn nhầm trong danh sách chi phối (lỗi cũ)");
  E("vg$('vgPV').value = 'xads'; vg$('vgPV').onchange()");
  await until(() => E("VG.kq && VG.kq.prm.pv") === "xads", 8000, "phạm vi xã chọn ở danh sách");
  const xaDong = E("VG.xa.find(x => x.ten === 'Đông').i");
  ok(!$("vgXaW").hidden && JSON.stringify(E("Object.keys(VG.res.st.theo_xa).filter(k => +k > 0).map(Number)")) === JSON.stringify([xaDong]),
     "phạm vi 'các xã chọn ở danh sách': chỉ tìm trong xã Đông đã chọn");
  // Ctrl + nhấp chọn thêm xã
  click(RV.dai[0][0], RV.dai[0][1], {ctrlKey: true}); await until(() => E("vgXaChon().length") === 2, 3000, "Ctrl + nhấp thêm xã");
  ok(E("VG.pos.length") === 1 && E("vgXaChon().length") === 2, "Ctrl + nhấp: thêm xã Tây vào danh sách, không đặt điểm mẫu");
  // nhóm xã
  $("vgNhomTen").value = "cả hai"; $("vgNhomLuu").click();
  ok(JSON.stringify(E("ST.nhom_xa['cả hai'].slice().sort()")) === JSON.stringify(["Tây", "Đông"].sort()) && [...$("vgNhom").options].some(o => o.value === "cả hai"), "lưu nhóm xã có tên");
  $("vgXaBo").click(); ok(E("vgXaChon().length") === 0, "bỏ chọn mọi xã");
  $("vgNhom").value = "cả hai"; $("vgNhom").onchange(); ok(E("vgXaChon().length") === 2, "chọn nhóm: chọn lại cả hai xã");
  $("vgXaLoc").value = "tay"; $("vgXaLoc").oninput();
  ok([...$("vgXa").options].filter(o => !o.hidden).length === 2, "lọc danh sách: xã đang chọn vẫn hiện"); $("vgXaLoc").value = ""; $("vgXaLoc").oninput();
  E("VG.pos = []; VG.neg = []; vgXoaKQ(); vgVeHat()");

  // ---------- mỗi điểm mẫu chỉ quyết định trong xã của nó
  E("vg$('vgPV').value = 'nhin'; vgPVHien()");
  const cot = (ma, xa) => E(`(() => { const K = VG.kq, D = VG.data; let n = 0; for (let i = 0; i < K.masks.${ma}.length; i++) if (K.masks.${ma}[i] && D.xaIdx[i] === ${xa}) n++; return n; })()`);
  const dat = async (hl) => {
    E(`VG.pos = []; VG.neg = []; vgXoaKQ(); vg$('vgHL').value = '${hl}'; vgPVHien()`);
    $("vgLopHat").querySelector('[data-ma="X2"]').click(); click(RV.lang[2][0], RV.lang[2][1]);
    $("vgLopHat").querySelector('[data-ma="X4"]').click(); click(RV.dai[1][0], RV.dai[1][1]);
    await until(() => E("VG.kq && VG.kq.lops.length === 2 && VG.kq.prm.hieu_luc") === hl, 10000, "hai lớp, hiệu lực " + hl);
  };
  await dat("all");
  const A = {x2Tay: cot("X2", xaTay), x4Dong: cot("X4", xaDong)};
  await dat("xa");
  const Z = {x2Tay: cot("X2", xaTay), x4Dong: cot("X4", xaDong), x4Tay: cot("X4", xaTay), x2Dong: cot("X2", xaDong)};
  ok(A.x2Tay > 500 && Z.x2Tay === 0 && Z.x4Dong === 0 && Z.x2Dong > 500 && Z.x4Tay > A.x2Tay * 0.5,
     `mẫu X2 đặt ở xã Đông: khi có hiệu lực mọi nơi thì kéo cả làng ở xã Tây (${A.x2Tay} điểm ảnh); chỉ trong xã của nó thì không lan sang Tây (${Z.x2Tay}), Tây do mẫu X4 ở Tây quyết định`);
  ok(E("VG.gXaChon.getLayers().length") === 2, "viền các xã đang làm miền của điểm mẫu");
  E("vg$('vgHL').value = 'r'; vg$('vgBK').value = '1'; vg$('vgHL').onchange()");
  await until(() => E("VG.kq && VG.kq.prm.hieu_luc") === "r", 10000, "hiệu lực bán kính");
  const rOK = E(`(() => { const K = VG.kq, g = K.g; let xa = 0; for (let i = 0; i < K.masks.X2.length; i++) if (K.masks.X2[i]) {
      const x = i % g.w, y = (i - x) / g.w, ll = CORE.pixToLL(g, x + 0.5, y + 0.5), d = L.latLng(ll[1], ll[0]).distanceTo(L.latLng(${RV.lang[2][1]}, ${RV.lang[2][0]}));
      if (d > 1000 + 2 * g.res) xa++; } return xa; })()`);
  ok(rOK === 0 && !$("vung").querySelector("[data-vgr]").hidden, "hiệu lực trong bán kính 1 km: không điểm ảnh X2 nào xa mẫu quá 1 km; hiện ô R");
  E("vg$('vgHL').value = 'all'; vgPVHien()");

  // ---------- trừ chỗ đã lưu, chốt khu
  await dat("all");
  E("vgLuuHet()");
  ok(E("Object.values(ST.vung).length") === 2, "lưu hai vùng X2, X4 (chưa chốt)");
  const chiX4 = async (tru) => {
    E(`VG.pos = []; VG.neg = []; vgXoaKQ(); vg$('vgTru').value = '${tru}'`);
    $("vgLopHat").querySelector('[data-ma="X4"]').click(); click(RV.dai[1][0], RV.dai[1][1]);
    await until(() => E("VG.kq && VG.kq.prm.tru") === tru, 10000, "chỉ X4, trừ " + tru);
    return RV.lang.map(q => E(`vgLopTai(L.latLng(${q[1]}, ${q[0]}))`));
  };
  const k0 = await chiX4("khong"), k1 = await chiX4("khac");
  ok(k0.filter(v => v === "X4").length >= 3 && k1.every(v => v === null) && /đang trừ chỗ của 2 vùng/.test($("vgTruTT").textContent),
     `chỉ còn mẫu X4: không trừ thì X4 lấn cả các làng (${k0.join(",")}); trừ chỗ đã lưu cho lớp khác thì bỏ các làng đã là X2 (${k1.join(",")})`);
  E("ST.vung = {}; save(); vgVeVung()");
  await dat("all");
  E("vg$('vgKhuTen').value = 'khu thử'"); $("vgChot").click(); await sleep(50);
  const khu = E("Object.values(ST.khu)");
  ok(khu.length === 1 && khu[0].ten === "khu thử" && khu[0].vung.length === 2 && E("Object.values(ST.vung).every(v => v.khu === '" + khu[0].id + "')") &&
     E("VG.pos.length") === 0 && E("VG.kq") === null && $("vgKhuDS").querySelectorAll("[data-k]").length === 1, "🔒 Chốt khu: lưu vùng mọi lớp gắn mã khu, dọn điểm mẫu, hiện trong danh sách khu");
  E("vg$('vgTru').value = 'khac'"); $("vgLopHat").querySelector('[data-ma="X2"]').click(); click(RV.lang[3][0], RV.lang[3][1]);
  await until(() => E("VG.kq && VG.kq.lops.length === 1"), 10000, "X2 sau khi chốt");
  ok(RV.lang.every(q => E(`vgLopTai(L.latLng(${q[1]}, ${q[0]}))`) === null) && /khu đã chốt/.test($("vgTruTT").textContent),
     "khu đã chốt bị trừ với mọi lớp, kể cả cùng lớp X2 (không lưu trùng diện tích)");
  E("VG.pos = []; vgXoaKQ(); vgVeHat()");
  // ẩn vùng đã lưu
  ok(E("VG.gVung.getLayers().length") === 2, "vùng đã lưu hiện trên bản đồ");
  $("vgVungHien").checked = false; $("vgVungHien").onchange();
  ok(E("VG.gVung.getLayers().length") === 0 && !$("cVung").checked, "bỏ 'hiện trên bản đồ': ẩn mọi vùng đã lưu (đồng bộ ô ở bảng ảnh nền)");
  $("cVung").checked = true; $("cVung").onchange(); ok(E("VG.gVung.getLayers().length") === 2, "bật lại từ bảng ảnh nền");
  $("vgKhuDS").querySelector('[data-a="an"]').click(); ok(E("VG.gVung.getLayers().length") === 0, "ẩn riêng một khu");
  $("vgKhuDS").querySelector('[data-a="an"]').click();
  $("vgVungNam").checked = true; $("vgVungNam").onchange(); E("setYear(2023)");
  ok(E("VG.gVung.getLayers().length") === 0, "chỉ hiện vùng của năm đang gán (năm 2023 chưa có vùng)");
  E("setYear(2025)"); $("vgVungNam").checked = false; $("vgVungNam").onchange();
  // mở lại khu
  $("vgKhuDS").querySelector('[data-a="mo"]').click();
  await until(() => E("VG.kq && VG.kq.lops.length === 2"), 10000, "mở lại khu");
  ok(E("Object.keys(ST.khu).length") === 0 && E("Object.keys(ST.vung).length") === 0 && E("VG.pos.length") === 2 && E("vg$('vgKhuTen').value") === "khu thử",
     "mở lại khu: xoá vùng của khu, đưa hai điểm mẫu về và tính lại để sửa tiếp");

  // ---------- so sánh các năm: bảng, biểu đồ, bản đồ
  E("vg$('vgNamVec').value = 'goc'"); await E("vgNam9()");
  ok(!$("vgNamViz").hidden && E("VG.nam.ys.join()") === "2023,2025" && $("vgNamBD").querySelectorAll("circle[data-y]").length === 4,
     "so sánh: bảng + biểu đồ diện tích theo năm (2 năm × 2 lớp)");
  const bd = E(`(() => { const N0 = VG.nam, gi = N0.lops.indexOf("X2") + 1, a = N0.cls[2025], b = N0.cls[2023]; let mat = 0, duoc = 0, giu = 0;
      for (let i = 0; i < a.length; i++) { const x = a[i] === gi, y = b[i] === gi; if (x && !y) mat++; else if (y && !x) duoc++; else if (x && y) giu++; } return {mat, duoc, giu}; })()`);
  ok(bd.mat > 100 && bd.duoc < bd.mat / 5 && bd.giu > bd.mat, `năm 2023 thiếu một làng: phần X2 mất so với 2025 rõ (${bd.mat} điểm ảnh), phần được rất ít (${bd.duoc})`);
  E("vg$('vgNamLop').value = 'X2'"); vgNamChon: {
    E("vgNamChonNam(2023)"); E("vg$('vgNamXem').value = 'bd'; vg$('vgNamXem').onchange()");
    ok(E("VG.obj.chiXem") === 2023 && E("!!VG.hien") && /được/.test($("vgNamLeg").textContent) && /2025 → 2023/.test($("vgNamYV").textContent), "bản đồ được / mất so với năm gốc, có chú giải");
  }
  E("vg$('vgNamXem').value = 'ts'; vg$('vgNamXem').onchange()");
  ok(/cả 2 năm/.test($("vgNamLeg").textContent) && $("vgNamY").disabled, "bản đồ số năm thuộc lớp");
  E("vg$('vgNamXem').value = 'dau'; vg$('vgNamXem').onchange()");
  ok(/đã thuộc lớp từ 2023/.test($("vgNamLeg").textContent), "bản đồ năm bắt đầu thuộc lớp");
  key("2"); click(RV.lang[0][0], RV.lang[0][1]); await sleep(50);
  ok(E("VG.loai.length") === 0, "đang xem bản đồ so sánh: công cụ xoá mảng bị khoá"); key("1");
  $("vgNamThoat").click(); ok(!E("VG.obj.chiXem"), "↩ về kết quả năm đang gán để sửa tiếp");
  blobs.length = 0; $("vgNamCSV").click(); const csv = await docBlob(blobs[0]);
  ok(/^nam,ma_lop,dien_tich_ha,so_manh,nam_goc,dac_trung_mau/.test(csv) && csv.trim().split("\n").length === 5, "xuất CSV so sánh (2 năm × 2 lớp)");
  E("vg$('vgNamVec').value = 'tung'"); await E("vgNam9()");
  ok(E("VG.namTK.vec") === "tung" && E("VG.nam.ys.length") === 2 && /tại chỗ ở từng năm/.test($("vgNamTK").textContent), "tuỳ chọn lấy đặc trưng mẫu tại chỗ ở từng năm");
  E("vg$('vgNamXem').value = 'nam'; vg$('vgNamXem').onchange()");
  const y0 = E("VG.namY"); $("vgNamChay").click(); ok(E("!!VG.chay"), "▶ bắt đầu chạy");
  await until(() => E("VG.namY") !== y0, 4000, "▶ sang năm khác"); ok(E("VG.namY") !== y0 && E("VG.obj.chiXem") === E("VG.namY"), `▶ chạy qua các năm (${y0} -> ${E("VG.namY")})`); $("vgNamChay").click();
  ok(!E("VG.chay"), "⏸ dừng");

  // ---------- tiếng Nga, tiếng Anh
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  E("vg$('vgPV').value = 'xads'; vgPVHien(); vgTab('luu')");
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100);
    E("vg$('vgNamXem').value = 'bd'; vgNamVe()"); click(RV.lang[1][0], RV.lang[1][1]); key("o"); key("o"); await sleep(30);
    E(`VG.mode || vgBat(true)`); E("traDat(L.latLng(" + RV.lang[1][1] + ", " + RV.lang[1][0] + "))"); await sleep(50);
    const sot = new Set(), wk = w.document.createTreeWalker(w.document.body, 4); let m;
    while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#msgs")) continue;
      const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|E0 thử|Tiếng Việt|khu thử|cả hai|name~Cát/.test(t)) sot.add(t.slice(0, 70)); }
    [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Ngôn ngữ|: X\d|Tây|Đông|name~Cát/.test(v)) sot.add("@" + v.slice(0, 60)); }));
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở các phần 2.3 (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 30).join("\n      ") : ""));
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
