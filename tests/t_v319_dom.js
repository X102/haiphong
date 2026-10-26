// Bản 3.19: hồi quy chỉ số theo ảnh đa thời gian (theo luận án): thanh công cụ theo nhóm; mọi cảnh quang đãng (cảnh giả lập có đáp án:
// một nửa vùng NDVI tụt bậc đầu 2020, nửa kia ổn định; mây theo điểm ảnh; một ngày hai ô MGRS chia đôi vùng) -> hệ số góc, R², n của
// từng cặp năm và cả khoảng khớp hồi quy tính lại độc lập trên từng điểm ảnh; 5 cấp, diện tích, cân bằng; đổi ngưỡng, lọc theo p
// không đọc lại ảnh; ảnh tổng hợp năm của bộ dữ liệu (hệ số góc = hiệu / số năm); bản đồ, chú giải; theo xã; đối chiếu bản đồ lớp phủ;
// chuỗi tại điểm; xuất CSV, GeoTIFF, GeoJSON, điểm kiểm tra; Xuất bản đồ; bảng giá trị tại điểm; dừng giữa chừng; tiếng Nga.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest");
  ok(E("VERSION").localeCompare("3.19", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  E("setYear(2025)"); key("o"); await sleep(50); await until(() => E("VG.xa && VG.xa.length") === 2, 5000, "ranh giới xã"); key("o"); await sleep(20);

  // ---------- 1. thanh công cụ theo nhóm
  const nhom = E(`[...document.querySelectorAll("#thanhCC .cc-ten")].map(e => e.textContent + ":" + [...e.nextElementSibling.querySelectorAll("button,select")].map(b => b.id).join(","))`);
  ok(nhom.length === 4 && /^Dữ liệu:bLoad,bExport,bS2O$/.test(nhom[0]) && /^Phân tích:bVung,bPL,bTK,bCD,bHQ,bAI$/.test(nhom[1]) && /^Trình bày:bXB,bTang,selDock$/.test(nhom[2]) && /^Ứng dụng:bSet,bHelp,bGT,bBaoLoi,bCai$/.test(nhom[3]),
     "4 nhóm: " + nhom.join(" | "));
  const icon = E(`[...document.querySelectorAll("#thanhCC button")].filter(b => !b.hidden).map(b => b.id + (b.querySelector("svg.ic use") && document.querySelector(b.querySelector("svg.ic use").getAttribute("href")) ? "" : "!")).join(",")`);
  ok(!/!/.test(icon), "mọi nút có biểu tượng nét (symbol có thật): " + icon);
  ok($("bExport").textContent.trim() === "Xuất…" && /Hồi quy chỉ số/.test($("bHQ").textContent) && /Xếp tầng/.test($("bTang").textContent) && !/[🐞🤖🧭📊🛰🖨🧱]/u.test($("thanhCC").textContent), "chữ nút giữ nguyên, bỏ biểu tượng emoji lẫn trong chữ");

  // ---------- 2. cảnh giả lập: NDVI = (B8 − B4)/(B8 + B4); SCL 4 quang đãng, 9 mây, 0 ngoài ô
  E(`window.GEN = {
    ngay: {2019: ["2019-01-15", "2019-03-10", "2019-05-20", "2019-07-05", "2019-09-12", "2019-11-25"], 2020: ["2020-01-18", "2020-03-02", "2020-05-22", "2020-07-09", "2020-09-15", "2020-11-28"],
           2021: ["2021-01-12", "2021-03-14", "2021-05-19", "2021-07-02", "2021-09-20", "2021-11-23"]},
    mid: null, goi: 0, dung: 0,
    ndvi(X, Y, t) { const n = 0.02 * (((Math.floor(X / 10) * 31 + Math.floor(Y / 10) * 17) % 13) / 13); return X < GEN.mid ? (t < 2020 ? 0.8 : 0.35) + n : 0.6 + 0.03 * Math.sin(2 * Math.PI * t) + n; },
    may(X, Y, di) { return (Math.floor(X / 10) + Math.floor(Y / 10) + di) % 7 === 0; },
    canh: {}
  };
  S2OC.tim = async o => { GEN.goi++; const y = +o.datetime.split("/")[1].slice(0, 4), ds = []; (GEN.ngay[y] || []).forEach((d, di) => {
      const mot = nua => { const sc = {id: y + "_" + di + (nua || ""), ngay: d, di, nua, epsg: 32648, s: 1e-4, o: 0, ng: "s2", may: 10, o_mgrs: "48Q" + (nua || "A"), f: {}}; GEN.canh[sc.id] = sc; ds.push(sc); };
      if (di === 2) { mot("trai"); mot("phai"); } else mot(""); }); return ds; };
  S2OC.url = (sc, b) => "fake://" + sc.id + "/" + b;
  S2OC.chuanBi = async () => {};
  S2OC.layMau = async (u, G) => { if (GEN.dung) await new Promise(r => setTimeout(r, GEN.dung)); const m = /^fake:\\/\\/([^/]+)\\/(\\w+)$/.exec(u), sc = GEN.canh[m[1]], b = m[2], n = G.X.length, o = new Float32Array(n);
    if (GEN.mid == null) { let a = Infinity, z = -Infinity; for (let k = 0; k < n; k++) { a = Math.min(a, G.X[k]); z = Math.max(z, G.X[k]); } GEN.mid = (a + z) / 2; }
    const t = HQC.namTP(sc.ngay);
    for (let k = 0; k < n; k++) { const X = G.X[k], Y = G.Y[k], ngoai = (sc.nua === "trai" && X >= GEN.mid) || (sc.nua === "phai" && X < GEN.mid);
      if (b === "SCL") o[k] = ngoai ? 0 : GEN.may(X, Y, sc.di) ? 9 : 4;
      else { const v = GEN.ndvi(X, Y, t), b8 = 3000; o[k] = b === "B8" ? b8 : b === "B4" ? b8 * (1 - v) / (1 + v) : 1000; } }
    return o; };
  GEN.ky = (X, Y, a, b) => { const ts = [], vs = []; for (let y = a; y <= b; y++) GEN.ngay[y].forEach((d, di) => { if (GEN.may(X, Y, di)) return; ts.push(HQC.namTP(d)); vs.push(GEN.ndvi(X, Y, HQC.namTP(d))); }); return HQC.olsDiem(ts, vs); };
  0`);

  // ---------- 3. mở bảng, chạy trên xã Tây, 2019-2021, mọi cảnh S2
  $("bHQ").click(); await until(() => !$("hqP").hidden && $("hqVung").options.length > 2, 4000, "mở bảng hồi quy");
  const vungs = E(`[...$("hqVung").options].map(o => o.value)`);
  ok(vungs.includes("nhin") && vungs.includes("xa:1") && vungs.includes("tinh"), "phạm vi: khung nhìn, cả tỉnh, từng xã");
  ok(E(`[...$("hqNguon").options].map(o => o.value + (o.disabled ? "-" : "")).join()`) === "s2c,s2t,lsc,lst-", "nguồn: S2 mọi cảnh, S2 tổng hợp năm (bộ dữ liệu có s2d), Landsat mọi cảnh, Landsat tổng hợp (chưa có: khoá)");
  ok($("hqCS").value === "NDVI" && $("hqC1").value === "0.1" && $("hqC2").value === "0.2", "mặc định NDVI, ngưỡng 0.1 / 0.2 của luận án");
  const dat = (id, v) => { $(id).value = String(v); $(id).dispatchEvent(new w.Event("change")); };
  dat("hqVung", "xa:1"); dat("hqLuoi", "300"); dat("hqA", 2019); dat("hqB", 2021);
  ok(/lưới \d+ × \d+, ô ≈ \d+ m; 3 năm/.test($("hqUoc").textContent), "ước lượng lưới: " + $("hqUoc").textContent);
  $("hqChay").click(); await until(() => /xong/.test($("hqTT").textContent) || /lỗi/.test($("hqTT").textContent), 30000, "tính hồi quy");
  ok(/xong: 3 năm, 3 kỳ · 18 cảnh dùng được/.test($("hqTT").textContent), "trạng thái: " + $("hqTT").textContent);
  const K = E(`(() => { const K = HQ.kq; return {ky: K.ky.map(q => q.k + (q.cap ? "" : "*")), w: K.g.w, h: K.g.h, N: K.N, nV: K.nV, st: K.nam.map(y => [K.st[y].tim, K.st[y].dung])}; })()`);
  ok(K.ky.join() === "2019-2020,2020-2021,all*" && K.st.every(s => s[0] === 7 && s[1] === 6), `kỳ: ${K.ky.join(", ")}; mỗi năm 7 cảnh (một ngày hai ô) gộp thành 6 ngày chụp`);

  const deu = E(`(() => { const ds = []; for (let m = 1; m <= 12; m++) for (let k = 0; k < (m <= 3 ? 12 : 2); k++) ds.push({id: m + "_" + k, ngay: "2020-" + String(m).padStart(2, "0") + "-" + String(k + 1).padStart(2, "0"), may: m <= 3 ? k : 50 + k});
    const c = hqChonDeu(ds.sort((a, b) => a.may - b.may), 24), th = {}; c.forEach(sc => { th[sc.ngay.slice(5, 7)] = (th[sc.ngay.slice(5, 7)] || 0) + 1; }); return {n: c.length, thang: Object.keys(th).length, max: Math.max(...Object.values(th))}; })()`);
  ok(deu.n === 24 && deu.thang === 12 && deu.max === 2, "quá số cảnh tối đa: chia đều theo tháng (mùa khô ít mây không lấn hết), 24 cảnh trải 12 tháng");

  // ---------- 4. đáp án tính lại độc lập trên từng điểm ảnh
  const chk = E(`(() => { const K = HQ.kq, G = S2OC.luoiAnh(32648, K.g.bb, K.g.w, K.g.h); let sai = 0, nmax = 0, da = 0, dr = 0, dem = 0, lopSai = 0, demTrai = 0, demPhai = 0;
    for (let i = 0; i < K.N; i += 7) { if (K.vung && !K.vung[i]) continue; const X = G.X[i], Y = G.Y[i];
      K.ky.forEach(q => { const e = GEN.ky(X, Y, q.a, q.b), a = q.R.a[i];
        if (!(e.n >= 4)) { if (a === a) sai++; return; }
        if (!(a === a)) { sai++; return; } dem++; da = Math.max(da, Math.abs(a - e.a)); if (e.r2 === e.r2) dr = Math.max(dr, Math.abs(q.R.r2[i] - e.r2)); if (q.R.n[i] !== e.n) nmax++;
        if (q.cls[i] !== HQC.lop(e.a, q.t1, q.t2) && Math.abs(Math.abs(e.a) - q.t1) > 1e-5 && Math.abs(Math.abs(e.a) - q.t2) > 1e-5) lopSai++; });
      if (X < GEN.mid) demTrai++; else demPhai++; }
    return {sai, nmax, da, dr, dem, lopSai, demTrai, demPhai}; })()`);
  ok(chk.dem > 1000 && chk.sai === 0 && chk.nmax === 0 && chk.da < 2e-5 && chk.dr < 1e-4 && chk.lopSai === 0,
     `hệ số góc, R², n, cấp của ${chk.dem} điểm ảnh × kỳ khớp hồi quy tính lại (mây theo điểm ảnh, ngày hai ô): sai lệch a ${chk.da.toExponential(1)}, R² ${chk.dr.toExponential(1)}`);
  const lop = E(`(() => { const K = HQ.kq, G = S2OC.luoiAnh(32648, K.g.bb, K.g.w, K.g.h), d = {}; K.ky.forEach(q => { const c = {tr: [0, 0, 0, 0, 0, 0], ph: [0, 0, 0, 0, 0, 0]};
      for (let i = 0; i < K.N; i++) if (q.cls[i]) c[G.X[i] < GEN.mid ? "tr" : "ph"][q.cls[i]]++; d[q.k] = c; }); return d; })()`);
  const tron = (c, k) => c[k] / c.reduce((s, v) => s + v, 0);
  ok(tron(lop["2019-2020"].tr, 1) > 0.99 && tron(lop["2019-2020"].ph, 3) > 0.99 && tron(lop["2020-2021"].tr, 3) > 0.99 && tron(lop["2020-2021"].ph, 3) > 0.99,
     "nửa trái (NDVI tụt 0.45 đầu 2020): giảm mạnh ở 2019-2020, ổn định ở 2020-2021; nửa phải ổn định ở mọi cặp");
  const ky0 = E(`(() => { const q = HQ.kq.ky[0], ca = HQ.kq.ky[2]; return {dt: Array.from(q.dt), tong: q.tong, giam: q.giam, tang: q.tang, t1: ca.t1, t2: ca.t2}; })()`);
  ok(gan(ky0.tong, ky0.dt.slice(1).reduce((s, v) => s + v, 0), 1e-9) && ky0.giam > 0.3 * ky0.tong && gan(ky0.t1, 0.1 * 2 / 3, 1e-12) && gan(ky0.t2, 0.2 * 2 / 3, 1e-12),
     `diện tích 2019-2020: giảm ${ky0.giam.toFixed(1)} / ${ky0.tong.toFixed(1)} ha; ngưỡng cả khoảng 3 năm quy đổi ×2/3: ${ky0.t1.toFixed(4)} / ${ky0.t2.toFixed(4)}`);

  // ---------- 5. bảng, nhận định, biểu đồ, bản đồ
  ok(/bảng 25/.test($("hqBang").textContent) && E(`$("hqBang").querySelectorAll("tr").length`) >= 9 && /cộng các cặp/.test($("hqBang").textContent) && /cả khoảng 2019–2021/.test($("hqBang").textContent),
     "bảng theo kỳ kiểu bảng 25 (5 cấp, cân bằng, R², n), dòng cộng các cặp, dòng cả khoảng; bảng ảnh theo năm");
  ok(/giảm nhiều nhất 2019–2020/.test($("hqTom").textContent) && /cân bằng âm nhất 2019–2020/.test($("hqTom").textContent) && /18 ngày chụp/.test($("hqTom").textContent) && /p là danh nghĩa/.test($("hqTom").textContent),
     "nhận định: cặp giảm nhiều nhất, cân bằng âm nhất, số ngày chụp, lưu ý p");
  ok(E(`$("hqBD").querySelectorAll("svg").length`) === 3 && E(`$("hqBD").querySelectorAll("circle").length`) === 2, "3 biểu đồ (cột chồng theo cặp + đường cân bằng, tần suất hệ số góc, số lần quan sát)");
  ok(E("!!(HQ.hien && map.hasLayer(HQ.hien))") && /giảm mạnh/.test($("hqLeg").textContent) && /ha/.test($("hqLeg").textContent), "lớp cấp biến động trên bản đồ, chú giải có diện tích");
  for (const m of ["a", "r2", "p", "n"]) { dat("hqXem", m); await sleep(10); }
  ok(/hệ số góc NDVI\/năm/.test(E(`hqCGMuc(HQ.kq, HQ.kq.ky[0], "a")[0].ten`)) && /p < 0.01/.test($("hqLeg").textContent) === false && /số lần quan sát/.test($("hqLeg").textContent), "đổi cách xem: hệ số góc, R², p, n (chú giải theo cách xem)");
  dat("hqXem", "lop");

  // ---------- 6. đổi ngưỡng, lọc theo p: không đọc lại ảnh
  const goi0 = E("GEN.goi");
  $("hqC1").value = "0.5"; $("hqC2").value = "0.6"; $("hqC1").dispatchEvent(new w.Event("change")); await sleep(20);
  ok(E("GEN.goi") === goi0 && E("HQ.kq.ky[0].dt[1] + HQ.kq.ky[0].dt[2]") < 1e-9 && E("HQ.kq.ky[0].t1") === 0.5, "ngưỡng 0.5 / 0.6: không còn điểm ảnh giảm, không đọc lại ảnh");
  $("hqCLA").click(); await sleep(20);
  ok(gan(E("HQ.kq.ky[0].giam"), ky0.giam, 1e-9), "nút «theo luận án» trả 0.1 / 0.2");
  $("hqYN").checked = true; $("hqYN").dispatchEvent(new w.Event("change")); await sleep(20);
  const pk = E(`(() => { const q = HQ.kq.ky[0]; let x = 0; for (let i = 0; i < HQ.kq.N; i++) if (q.cls[i] && q.cls[i] !== 3 && !(q.P[i] < 0.05)) x++; return {x, co: !!q.P, dt: q.dt[1]}; })()`);
  ok(pk.co && pk.x === 0 && pk.dt > 0, "lọc theo p (α = 0.05): mọi điểm ảnh giảm, tăng còn lại có p < 0.05");
  $("hqYN").checked = false; $("hqYN").dispatchEvent(new w.Event("change")); await sleep(10);

  // ---------- 7. theo xã, xuất bản đồ, bảng giá trị tại điểm
  ok(/Tây/.test($("hqXa").textContent), "theo xã: có xã Tây");
  const xb = E(`(() => { const d = xbDS().find(q => q.k === "hq"); if (!d) return null; const r = d.ve({md: "lop|2019-2020"}), c = d.cg({md: "lop|2019-2020"}); return {ten: d.ten, md: d.md.length, anh: !!r.anh, muc: c.muc.length, dem: typeof c.dem, md0: d.md0}; })()`);
  ok(xb && xb.ten === "Hồi quy NDVI 2019-2021" && xb.md === 15 && xb.anh && xb.muc === 5 && xb.dem === "function", "Xuất bản đồ, Xếp tầng: có lớp hồi quy (5 cách xem × 3 kỳ, chú giải đếm diện tích theo khung)");
  const pt = E(`(() => { const K = HQ.kq, x = Math.floor(K.g.w * 0.25), y = Math.floor(K.g.h / 2), ll = CORE.pixToLL(K.g, x + 0.5, y + 0.5); return {lng: ll[0], lat: ll[1]}; })()`);
  E(`HQ.ky = "2019-2020"; $("hqKy").value = "2019-2020"; $("hqKy").onchange()`);
  const dong = await w.eval(`giaTriTai(L.latLng(${pt.lat}, ${pt.lng}))`);
  ok(dong.length && /^📈 NDVI 2019–2020/.test(dong[0][0]) && /giảm mạnh/.test(dong[0][1]) && /R²/.test(dong[0][1]) && / p /.test(dong[0][1]), "bảng giá trị tại điểm: dòng hồi quy (cấp, a, R², n, p)");

  // ---------- 8. chuỗi tại điểm
  await w.eval(`hqDiemChay(L.latLng(${pt.lat}, ${pt.lng}))`); await until(() => E("HQ.diem && HQ.diem.obs.length > 0") && /lần quan sát/.test($("hqDiemTT").textContent), 10000, "chuỗi tại điểm");
  const dm = E(`(() => { const D = HQ.diem; return {n: D.obs.length, svg: $("hqDiem").querySelectorAll("svg circle").length, dong: $("hqDiem").querySelectorAll("tr").length, txt: $("hqDiem").textContent}; })()`);
  ok(dm.n >= 14 && dm.n <= 18 && dm.svg === dm.n && dm.dong === 4 && /giảm mạnh/.test(dm.txt), `chuỗi tại điểm: ${dm.n} lần quan sát (mây bỏ, ngày hai ô một lần), đồ thị, bảng 3 kỳ, cấp giảm mạnh`);

  // ---------- 9. đối chiếu bản đồ lớp phủ
  E(`hqTab("lp")`); await sleep(20);
  ok(E(`[...$("hqPA").options].length`) >= 2, "danh sách bản đồ lớp phủ: " + E(`[...$("hqPA").options].map(o => o.textContent).join(", ")`));
  dat("hqPA", "man:wc"); await sleep(10); $("hqLPChay").click(); await until(() => $("hqLP").querySelector("table") || /lỗi/.test($("hqLP").textContent), 8000, "đối chiếu lớp phủ");
  ok(!!$("hqLP").querySelector("table") && /Giảm \(vừa \+ mạnh\)/.test($("hqLP").textContent), "đối chiếu: bảng cấp × lớp phủ và câu tóm tắt nơi giảm tập trung" + (/lỗi/.test($("hqLP").textContent) ? ": " + $("hqLP").textContent : ""));

  // ---------- 10. xuất
  const nb = blobs.length; $("hqCSV").click(); await sleep(30);
  const csv = await docBlob(blobs[blobs.length - 1]);
  if (process.env.IN) console.log(csv.slice(0, 600));
  ok(blobs.length === nb + 1 && /^bang,ky,tu_nam/.test(csv) && /ky,2019–2020,2019,2020,1,0.1,0.2,,1,giảm mạnh/.test(csv) && /\nxa,/.test(csv) && /\nnam,/.test(csv), "CSV: theo kỳ (ngưỡng, cấp, diện tích, cân bằng, R², n), theo xã, theo năm");
  $("hqTif").click(); await sleep(700); ok(blobs.length >= nb + 3 && blobs[nb + 1].type === "image/tiff", "GeoTIFF cấp (kèm QML)");
  const n2 = blobs.length; $("hqTifKy").click(); await sleep(700); ok(blobs.length >= n2 + 1 && blobs[n2].type === "image/tiff", "GeoTIFF mọi kỳ (mỗi kỳ một băng)");
  const n3 = blobs.length; $("hqGeo").click(); await sleep(30);
  const gj = JSON.parse(await docBlob(blobs[n3]));
  ok(gj.features.length > 0 && gj.features.every(f => [1, 2, 4, 5].includes(f.properties.cap)) && gj.features.some(f => f.properties.cap === 1), `GeoJSON: ${gj.features.length} đa giác giảm, tăng của kỳ đang chọn`);
  const bo0 = E("Object.keys(ST.bo_cfg).length"); $("hqNDiem").value = "4"; $("hqRai").click(); await sleep(50);
  const bo1 = E(`(() => { const c = ST.bo_cfg[ST.bo]; return {n: Object.keys(ST.bo_cfg).length, cach: c.cach, nam: c.nam.join(), d: Object.values(ST.diem).filter(p => p.bo === ST.bo).length}; })()`);
  ok(bo1.n === bo0 + 1 && bo1.cach === "kiem_tra_hoi_quy" && bo1.nam === "2019,2020" && bo1.d >= 8 && bo1.d <= 20, `rải điểm kiểm tra: bộ mới ${bo1.d} điểm (4 mỗi cấp), năm 2019, 2020`);

  // ---------- 11. ảnh tổng hợp năm của bộ dữ liệu: hệ số góc = hiệu chỉ số / số năm
  dat("hqNguon", "s2t"); dat("hqVung", "xa:1");
  ok(E(`[...$("hqA").options].map(o => o.value).join()`) === "2023,2025", "năm của ảnh tổng hợp theo bộ dữ liệu: 2023, 2025");
  dat("hqA", 2023); dat("hqB", 2025);
  $("hqChay").click(); await until(() => /xong/.test($("hqTT").textContent) && E("HQ.kq.o.nguon") === "s2t" || /lỗi/.test($("hqTT").textContent), 20000, "tính trên ảnh tổng hợp");
  const th = E(`(() => { const K = HQ.kq, q = K.ky[0], V = K.V; let sai = 0, dem = 0; for (let i = 0; i < K.N; i++) { const a = V[2023][i], b = V[2025][i];
      if (a === a && b === b) { dem++; if (!(Math.abs(q.R.a[i] - (b - a) / 2) < 1e-5) || !(q.R.n[i] === 2)) sai++; } else if (q.R.a[i] === q.R.a[i]) sai++; }
    return {ky: K.ky.map(x => x.k).join(), sai, dem, r2: q.r2tb}; })()`);
  ok(th.ky === "2023-2025" && th.dem > 100 && th.sai === 0, `tổng hợp năm: kỳ ${th.ky}, hệ số góc = (NDVI 2025 − NDVI 2023)/2 trên ${th.dem} điểm ảnh, n = 2`);
  ok(/R² = 1 và không có p/.test($("hqTom").textContent), "nhận định nói rõ: một ảnh mỗi năm, R² = 1, không có p");

  // ---------- 12. dừng giữa chừng
  dat("hqNguon", "s2c"); dat("hqA", 2019); dat("hqB", 2021); E("GEN.dung = 40");
  $("hqChay").click(); await sleep(150);
  ok(/Dừng/.test($("hqChay").textContent), "đang tính: nút đổi thành «Dừng»");
  $("hqChay").click(); await sleep(400);
  ok(/đã dừng/.test($("hqTT").textContent) && /Tính hồi quy/.test($("hqChay").textContent) && E("HQ.kq.o.nguon") === "s2t", "dừng: báo đã dừng, giữ kết quả cũ");
  E("GEN.dung = 0");

  // ---------- 13. lối sang từ bảng Thay đổi; tiếng Nga; không sót khoá
  ok(!!$("xhSangHQ") && /Hồi quy theo mọi cảnh/.test($("xhSangHQ").textContent), "khối xu hướng của bảng Thay đổi có lối sang bảng Hồi quy");
  E("setLang('ru')"); await sleep(50);
  ok(/Регрессия индекса/.test($("bHQ").textContent) && /АНАЛИЗ|Анализ/.test($("thanhCC").textContent) && /Оформление/.test($("thanhCC").textContent) && /Регрессия индекса по разновременным снимкам/.test($("hqP").textContent)
     && /умеренное снижение/.test($("hqBang").textContent + $("hqLeg").textContent + $("hqP").textContent), "tiếng Nga: nút, nhóm thanh công cụ, bảng hồi quy");
  const miss = E("[...T_MISS]").filter(x => /hồi quy|kỳ|cảnh|quan sát|ngưỡng|hệ số|cấp|lớp phủ|điểm|Phân tích|Trình bày|Ứng dụng|năm/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 8).join(" | ") : ""));
  E("setLang('vi')"); await sleep(30); $("hqDong").click();
  ok($("hqP").hidden, "đóng bảng");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
