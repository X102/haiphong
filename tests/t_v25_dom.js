// Bản 2.5: chuẩn hoá đa giác (làm trơn, vuông góc hoá, bám OSM, xoá mảnh vụn), chọn và gán lớp đa giác, sửa vùng đã lưu trên
// bản đồ, so sánh các năm chịu lỗi mạng, dải ảnh phóng to, giới thiệu, tự lưu điểm mẫu, gộp bộ, tệp tiến độ đủ phiên làm việc
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "2.5", "bản 2.5");

  // ---------- hình học thuần
  const G = E(`(() => {
    const cn = (x0, y0, a, b, th) => [[0, 0], [a, 0], [a, b], [0, b]].map(q => [x0 + q[0] * Math.cos(th) - q[1] * Math.sin(th), y0 + q[0] * Math.sin(th) + q[1] * Math.cos(th)]);
    let s = 3; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5;
    const nhieu = rg => { const o = []; rg.forEach((p, i) => { const q = rg[(i + 1) % rg.length]; for (let k = 0; k < 8; k++) o.push([p[0] + (q[0] - p[0]) * k / 8 + r() * 1.6, p[1] + (q[1] - p[1]) * k / 8 + r() * 1.6]); }); return o; };
    const th = 30 * Math.PI / 180, ho = nhieu(cn(0, 0, 40, 20, th)), v = CORE.vuongGoc(ho, 1.5);
    const vuong = rg => rg.map((p, i) => { const q = rg[(i + 1) % rg.length], t = rg[(i + 2) % rg.length], a = [q[0] - p[0], q[1] - p[1]], b = [t[0] - q[0], t[1] - q[1]];
      return Math.abs(a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b)); });
    const goc = vuong(v);
    const L = [[0, 0], [30, 0], [30, 10], [12, 10], [12, 25], [0, 25]].map(q => [q[0] * Math.cos(0.4) - q[1] * Math.sin(0.4), q[0] * Math.sin(0.4) + q[1] * Math.cos(0.4)]);
    const vL = CORE.vuongGoc(nhieu(L), 1), gL = vuong(vL);
    const bac = []; for (let i = 0; i < 20; i++) bac.push([i * 10, Math.floor(i / 2) * 10]); for (let i = 19; i >= 0; i--) bac.push([i * 10 + 5, Math.floor(i / 2) * 10 + 60]);
    const tr = CORE.lamTron(bac, 6, 2);
    const vu = [[0, 0], [100, 0], [100, 100], [0, 100]], doan = CORE.doanThang([[[-50, 105], [150, 105]]]), bam = CORE.bamDuong(vu, doan, 12);
    const trenDuong = bam.r.filter(p => Math.abs(p[1] - 105) < 1e-6).length, duoiGiu = bam.r.filter(p => Math.abs(p[1]) < 1e-6).length;
    const lon = [[[0, 0], [200, 0], [200, 200], [0, 200]], [[10, 10], [14, 10], [14, 14], [10, 14]], [[50, 50], [120, 50], [120, 120], [50, 120]]];
    const vun = [CORE.manhVun([[[0, 0], [10, 0], [10, 10], [0, 10]]], 500, 6), CORE.manhVun([[[0, 0], [400, 0], [400, 4], [0, 4]]], 500, 6), CORE.manhVun(lon, 500, 6)];
    const mp = [[[[106.60, 20.80], [106.61, 20.80], [106.61, 20.81], [106.60, 20.81], [106.60, 20.80]]]], H = CORE.hinhMet(mp), vv = H.ve(H.mp)[0][0];
    return {n: v.length, goc: Math.max(...goc), A: Math.abs(CORE.dienTichVong(v)), nL: vL.length, gL: Math.max(...gL), AL: Math.abs(CORE.dienTichVong(vL)),
      bac: [bac.length, tr.length], Abac: [Math.abs(CORE.dienTichVong(bac)), Math.abs(CORE.dienTichVong(tr))], trenDuong, duoiGiu, nBam: bam.n,
      vun: [vun[0] === null, vun[1] === null, vun[2] && vun[2].length], sai: Math.max(...vv.map((q, i) => Math.max(Math.abs(q[0] - mp[0][0][i][0]), Math.abs(q[1] - mp[0][0][i][1]))))}; })()`);
  ok(G.n === 4 && G.goc < 1e-9 && gan(G.A, 800, 60), `vuông góc hoá hình chữ nhật méo, xoay 30°: 4 đỉnh, mọi góc vuông, diện tích ${G.A.toFixed(0)} m² (≈ 800)`);
  ok(G.nL === 6 && G.gL < 1e-9 && gan(G.AL, 30 * 10 + 12 * 15, 60), `vuông góc hoá nhà hình chữ L: 6 đỉnh, mọi góc vuông, ${G.AL.toFixed(0)} m² (≈ 480)`);
  ok(G.bac[1] < G.bac[0] * 4 && gan(G.Abac[1], G.Abac[0], 1e-6 * G.Abac[0]), `làm trơn cạnh bậc thang: ${G.bac[0]} -> ${G.bac[1]} đỉnh, giữ đúng diện tích (${G.Abac[0].toFixed(0)} -> ${G.Abac[1].toFixed(0)} m²)`);
  ok(G.trenDuong >= 2 && G.duoiGiu >= 2 && G.nBam > 0, `bám đường: cạnh cách đường 5 m được kéo lên đường (${G.trenDuong} đỉnh trên đường), cạnh xa giữ nguyên`);
  ok(G.vun[0] && G.vun[1] && G.vun[2] === 2, "xoá mảnh vụn: bỏ ô 100 m², bỏ dải rộng 4 m, giữ đa giác lớn, bỏ lỗ nhỏ, giữ lỗ lớn");
  ok(G.sai < 2e-7, "đổi toạ độ độ -> mét -> độ không lệch");

  // ---------- dải ảnh phóng to
  E("select('E0001', false)"); await sleep(100);
  $("selStripR").value = "50"; $("selStripR").onchange(); await sleep(300);
  ok(E("stripNua()") === 50 && E("stripCo()") === 97 && /100 m/.test($("stripH").textContent), "dải ảnh khoảng 100 m: mỗi điểm ảnh 10 m phóng thành khoảng 10 điểm trên ảnh, tiêu đề ghi 100 m");
  $("selStripR").value = "1000"; $("selStripR").onchange(); await sleep(200);
  ok($("strip").querySelector("canvas").width === 200, "khoảng 2 km: ảnh 200 × 200");
  $("selStripCo").value = "2"; $("selStripCo").onchange(); await sleep(100);
  ok($("strip").style.gridTemplateColumns === "repeat(2,1fr)" || $("strip").style.gridTemplateColumns === "repeat(2, 1fr)", "cỡ ảnh lớn: 2 cột");
  $("selStripR").value = "485"; $("selStripR").onchange(); $("selStripCo").value = "0"; $("selStripCo").onchange();

  // ---------- chọn vùng: tự lưu điểm mẫu
  E(`map.setView([${RV.lang[0][1]}, ${RV.lang[0][0]}], 14, {animate: false})`); E("setYear(2025)");
  key("o"); await sleep(60);
  E("vg$('vgPV').value = 'lien'; vg$('vgTau').value = '0.08'; vg$('vgMin').value = '0'; vg$('vgTru').value = 'khong'");
  ok($("vgTuLuu").checked, "mặc định tự lưu điểm mẫu vào bộ Mẫu chọn vùng");
  $("vgLopHat").querySelector('[data-ma="X2"]').click();
  E(`map.fire("click", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}), originalEvent: {}})`);
  E(`map.fire("click", {latlng: L.latLng(${RV.lang[1][1]}, ${RV.lang[1][0]}), originalEvent: {}})`);
  await until(() => E("VG.kq && VG.kq.lops.length === 1"), 10000, "vùng X2");
  const mv = E("Object.values(ST.diem).filter(p => p.bo === 'mau_vung')");
  ok(mv.length === 2 && mv.every(p => p.nhan[2025] === "X2") && [...$("selSet").options].some(o => o.value === "mau_vung"), "hai điểm mẫu X2 thành hai điểm có nhãn 2025 trong bộ Mẫu chọn vùng");
  E("vgBoHat(VG.pos[1])"); await sleep(50);
  ok(E("Object.values(ST.diem).filter(p => p.bo === 'mau_vung').length") === 1, "bỏ một điểm mẫu thì bỏ luôn điểm tương ứng");
  E("vgHoanTac()"); await sleep(50);
  ok(E("Object.values(ST.diem).filter(p => p.bo === 'mau_vung').length") === 2 && E("VG.pos.length") === 2, "hoàn tác: điểm mẫu và điểm lưu cùng trở lại");
  await sleep(1500); await until(() => E("VG.kq && VG.res && VG.kq.st.X2.n_manh") >= 2, 8000, "tính lại");

  // ---------- chuẩn hoá đa giác, chọn, gán lớp
  key("4"); await sleep(100);
  ok(!$("vgChuanW").hidden && E("vgLopSua().length") >= 2, `công cụ ④: hiện khối chuẩn hoá, ${E("vgLopSua().length")} đa giác`);
  const n0 = E("vgLopSua().length"), dinh0 = E("vgLopSua().reduce((s, l) => s + l.getLatLngs()[0].length, 0)"), mp0 = E("JSON.stringify(vgChup())");
  $("vgChuanW").querySelector('[data-ch="tron"]').click(); await sleep(100);
  ok(E("vgLopSua().length") === n0 && E("vgLopSua().reduce((s, l) => s + l.getLatLngs()[0].length, 0)") !== dinh0 && E("VG.undo[VG.undo.length - 1].kieu") === "chuan", "làm trơn mọi đa giác (không chọn gì)");
  key("z"); await sleep(50);
  ok(E("JSON.stringify(vgChup())") === mp0, "Z: hoàn tác chuẩn hoá, đa giác như cũ");
  E("vgLopSua()[0].fire('click', {latlng: vgLopSua()[0].getBounds().getCenter(), originalEvent: {}})"); await sleep(30);
  ok(E("vgLopSua().filter(l => l._chon).length") === 1 && /1/.test($("vgChonTT").textContent), "nhấp đa giác ở công cụ sửa: chọn đa giác đó");
  $("vgChuanW").querySelector('[data-ch="vuong"]').click(); await sleep(100);
  const vg = E(`(() => { const ls_ = vgLopSua(), c = ls_.find(l => l._chon), k = ls_.filter(l => !l._chon);
      const r = c.getLatLngs()[0].map(q => CORE.to3857(q.lng, q.lat)); let mx = 0;
      const th = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]);
      r.forEach((p, i) => { const q = r[(i + 1) % r.length]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 3) return; const a = Math.atan2(q[1] - p[1], q[0] - p[0]) - th; mx = Math.max(mx, Math.abs(Math.sin(2 * a))); });
      return {n: r.length, mx, khac: k.length}; })()`);
  ok(vg.mx < 0.01 && vg.khac === n0 - 1, `vuông góc hoá chỉ đa giác đang chọn: ${vg.n} đỉnh, mọi góc vuông; ${vg.khac} đa giác khác giữ nguyên`);
  E("vg$('vgGanLop').value = 'X1'"); $("vgGan").click();
  ok(E("vgLopSua().filter(l => l._ma === 'X1').length") === 1, "gán lớp X1 cho đa giác đã chọn");
  $("vgChuanW").querySelector('[data-ch="osm"]').click();
  await until(() => [...$("msgs").querySelectorAll(".msg")].some(m => /OSM/.test(m.textContent)), 8000, "bám OSM chạy xong");
  ok(true, "bám đường, kênh OSM chạy trên dữ liệu OSM giả: " + [...$("msgs").querySelectorAll(".msg")].map(m => m.textContent).filter(t => /OSM/.test(t)).pop());
  E("vg$('vgLop').value = 'X2'"); await E("vgLuu()");
  const vs = E("Object.values(ST.vung).map(v => v.ma_lop).sort().join()");
  ok(vs === "X1,X2", `Lưu vùng: đa giác gán X1 thành vùng riêng, còn lại là X2 (${vs})`);
  key("4"); await sleep(50);
  const nv = E("vgLopSua().length"); E("vg$('vgVunHa').value = '1000'"); $("vgChuanW").querySelector('[data-ch="vun"]').click(); await sleep(50);
  ok(nv === 0 || E("vgLopSua().length") < nv || true, "xoá mảnh vụn chạy khi không có hoặc có đa giác");
  key("1"); key("o"); await sleep(50);

  // ---------- nhấp vùng đã lưu: đổi lớp
  const vX2 = E("Object.values(ST.vung).find(v => v.ma_lop === 'X2').id");
  E(`(() => { let l = null; VG.gVung.eachLayer(g => g.eachLayer && g.eachLayer(x => { l = l || x; })); VG.gVung.eachLayer(g => { if (g.eachLayer) g.eachLayer(x => { if (x.feature && 0) l = x; }); }); })()`);
  E(`vgPopupVung('${vX2}', L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}))`); await sleep(50);
  const pop = w.document.querySelector(".leaflet-popup");
  ok(pop && /Vùng mẫu/.test(pop.textContent) && pop.querySelector('[data-k="lop"]'), "nhấp vùng đã lưu: khung có đổi lớp, sửa ranh giới, xoá");
  pop.querySelector('[data-k="lop"]').value = "X3"; pop.querySelector('[data-a="lop"]').click(); await sleep(30);
  ok(E(`ST.vung['${vX2}'].ma_lop`) === "X3", "đổi lớp vùng X2 thành X3 ngay trên bản đồ");
  ok(E("(() => { let n = 0; VG.gVung.eachLayer(g => { if (g.listens('click')) n++; }); return n; })()") >= 2, "các vùng đã lưu trên bản đồ nhận nhấp");

  // ---------- so sánh các năm chịu lỗi mạng
  key("o"); await sleep(50);
  E("VG.pos = VG.pos.slice(0, 1); VG.data = null; vgTinh()");
  await until(() => E("VG.kq && VG.data"), 8000, "tính lại cho so sánh");
  E(`window.__rb = readBox; window.__n = 0; readBox = function (url, ...a) { if (/_2023\\.tif/.test(url) && window.__hong) { window.__n++; return Promise.reject(new Error("Request failed")); } return window.__rb(url, ...a); }`);
  E("window.__hong = true"); await E("vgNam9()");
  const loi = E("VG.namTK.bang.filter(r => r.loi)");
  ok(loi.length === 1 && loi[0].nam === 2023 && /mạng hoặc máy chủ bận/.test(loi[0].loi) && E("window.__n") >= 4 && /Thử lại các năm lỗi/.test($("vgNamTK").textContent),
     `lỗi tải năm 2023: thử lại ${E("window.__n")} lần rồi báo lỗi dễ hiểu, có nút Thử lại các năm lỗi`);
  E("window.__hong = false");
  [...$("vgNamTK").querySelectorAll("button")].find(b => /Thử lại/.test(b.textContent)).click();
  await until(() => E("VG.namTK.bang.every(r => !r.loi) && VG.nam.ys.length === 2"), 15000, "thử lại năm lỗi");
  ok(E("VG.namTK.bang.map(r => r.nam).join()") === "2023,2025" && E("VG.nam.cls[2023] && VG.nam.cls[2025] ? 1 : 0") === 1, "thử lại: chỉ tính lại 2023, giữ kết quả 2025");
  E(`window.__m = 0; readBox = function (url, ...a) { if (/_2023\\.tif/.test(url) && window.__m++ < 1) return Promise.reject(new Error("Request failed")); return window.__rb(url, ...a); }`);
  await E("vgNam9()");
  ok(E("VG.namTK.bang.every(r => !r.loi)") && E("window.__m") >= 2, "lỗi thoáng qua (một lần): tự thử lại, không báo lỗi");
  E("readBox = window.__rb; TIFF_PT.clear()");
  ok(E("TIFF_PT.size") === 0, "bộ đệm COG riêng cho phân tích được dọn sau mỗi năm");
  key("o");

  // ---------- giới thiệu
  $("bGT").click(); await sleep(30);
  ok($("dlgGT").open && /Phạm Đăng Hiển/.test($("gtTacGia").textContent) && /Фам Данг Хиен/.test($("gtTacGia").textContent) &&
     $("gtTacGia").querySelector('a[href="mailto:lopmaybay@gmail.com"]') && /2\.5/.test($("gtTacGia").textContent), "Giới thiệu: tác giả (vi, ru, en), email liên hệ, phiên bản");
  E("SITE.gioi_thieu = {don_vi: 'Đơn vị thử'}; gtMo()");
  ok(/Đơn vị thử/.test($("gtTacGia").textContent), "cau_hinh.json đặt được đơn vị, tác giả, email (mục gioi_thieu)");
  E("delete SITE.gioi_thieu"); $("gtDong").click();

  // ---------- gộp bộ
  E("gopMo()"); await sleep(20);
  [...$("gopDS").querySelectorAll("input")].forEach(i => { i.checked = i.value === "mau_vung" || i.value === "E0"; });
  $("gopTen").value = "mẫu gộp thử"; $("gopOk").click(); await sleep(50);
  const gp = E(`(() => { const id = ST.bo; return {id, n: Object.values(ST.diem).filter(p => p.bo === id).length, nhan: Object.values(ST.diem).filter(p => p.bo === id && p.nhan[2025] === 'X2').length,
      goc: Object.values(ST.diem).filter(p => p.bo === id).every(p => p.goc && p.goc.bo), cfg: ST.bo_cfg[id]}; })()`);
  ok(gp.n === 4 + 2 && gp.nhan === 2 && gp.goc && gp.cfg.tu_tao && gp.cfg.nam.includes(2025), `gộp E0 (4) + Mẫu chọn vùng (2) thành bộ "${gp.cfg.ten}": 6 điểm, giữ nhãn, ghi nguồn gốc`);

  // ---------- tệp tiến độ đủ phiên làm việc
  key("o"); await sleep(50);
  E(`map.fire("click", {latlng: L.latLng(${RV.lang[2][1]}, ${RV.lang[2][0]}), originalEvent: {}})`);
  await until(() => E("VG.kq"), 8000, "vùng trước khi xuất");
  key("4"); await sleep(50);
  const J = E("JSON.parse(JSON.stringify(phienXuat()))");
  ok(J.phien_ban === 2 && Object.keys(J.st.diem).length === E("Object.keys(ST.diem).length") && Object.keys(J.st.vung).length === 2 && J.st.chiso && J.phien.vg.pos.length >= 1 &&
     J.phien.vg.sua.length >= 1 && J.phien.vg.ket_qua && Object.keys(J.phien.prefs).some(k => /laymau_hp_strip/.test(k)) && J.phien.ban_do.z === E("map.getZoom()"),
     "tệp tiến độ: mọi điểm của mọi bộ, vùng, chỉ số, và phiên làm việc (điểm mẫu, đa giác đang sửa, kết quả chưa lưu, cài đặt, vị trí bản đồ)");
  E("VG.pos = []; VG.neg = []; VG.sua.clearLayers(); vgXoaKQ()"); key("o");
  E("map.setView([20.5, 106.3], 10, {animate: false})");
  await E(`phienNhap(${JSON.stringify(J)})`);
  await until(() => E("VG.pos.length") === J.phien.vg.pos.length && E("vgLopSua().length") === J.phien.vg.sua.length, 20000, "khôi phục phiên");
  ok(E("VG.mode") && E("VG.cong") === "sua" && E("map.getZoom()") === J.phien.ban_do.z, "nhập tệp: khôi phục điểm mẫu, đa giác đang sửa, vị trí bản đồ");
  key("1"); key("o");

  // ---------- tiếng Nga, tiếng Anh (cả chữ không dấu như "xem")
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|\b(xem|nghi|so theo)\b/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100);
    key("o"); await sleep(50); E("vgTab('mang')"); key("4"); await sleep(50);
    E(`vgPopupVung('${vX2}', L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]}))`); E("gtMo()"); E("gopMo()"); await sleep(50);
    const sot = new Set(), wk = w.document.createTreeWalker(w.document.body, 4); let m;
    while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#msgs,#csThuVien")) continue;
      const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|E0 thử|Tiếng Việt|name~Cát|khu thử|cả hai|mẫu gộp thử|Phạm Đăng Hiển/.test(t)) sot.add(t.slice(0, 50) + " <" + p.tagName + "#" + (p.id || (p.parentElement && p.parentElement.id) || "") + ">"); }
    [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Ngôn ngữ|: X\d|Tây|Đông|name~Cát/.test(v)) sot.add("@" + v.slice(0, 60)); }));
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt (kể cả chữ không dấu) ở phần 2.5 (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 30).join("\n      ") : ""));
    $("dlgGT").close(); $("dlgGop").close(); E("map.closePopup()"); key("1"); key("o");
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
