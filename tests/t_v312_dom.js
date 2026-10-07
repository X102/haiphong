// Bản 3.12: phân loại từ điểm mẫu, mẫu huấn luyện ngoài phạm vi. Dữ liệu giả mk_fixtures.py: S2 tăng đều theo cột (1000 + 3·cột),
// lớp theo dải cột (0-499 thực vật, 500-999 nước, 1000-1499 xây dựng), hai xã Tây (cột 0-749) và Đông (cột 750-1499).
// Phân loại xã Đông: trong xã chỉ có mẫu X1, mẫu N1 ở xã Tây cách ranh giới 0.3-1.9 km, mẫu T1 ở xã Tây cách 3.5-6 km.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => a != null && Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.12", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  const mkPts = ds => E(`(() => { const o = []; ${JSON.stringify(ds)}.forEach(([r, c, ma]) => { const ll = CORE.toLL(660000 + c * 10 + 5, 2320000 - r * 10 - 5); o.push({lon: ll[0], lat: ll[1], nhan: {2025: ma}}); }); return o; })()`);
  const P = mkPts([[200, 150, "T1"], [700, 200, "T1"], [300, 300, "T1"], [900, 350, "T1"], [500, 400, "T1"],
                   [200, 560, "N1"], [600, 600, "N1"], [1000, 640, "N1"], [400, 680, "N1"], [800, 720, "N1"],
                   [200, 1050, "X1"], [600, 1100, "X1"], [1000, 1200, "X1"], [300, 1300, "X1"], [800, 1400, "X1"]]);
  E(`taoBoTuDiem("mẫu ngoài thử", [2025], ${JSON.stringify(P)}, {})`); await sleep(100);
  const bo = E("ST.bo");
  E(`map.setView([20.95, 106.6], 11, {animate: false})`);
  $("bPL").click(); await until(() => E("VG.xa && VG.xa.length === 2") && $("plXa").options.length === 2, 8000, "xã");
  ok(!!$("plNguon") && [...$("plNguon").options].map(o => o.value).join() === "trong,d2,d5,d10,all", "ô Mẫu huấn luyện: trong phạm vi, +2, 5, 10 km, mọi điểm đã gán");
  const datPV = () => { $("plNam").value = "2025"; $("plBo").value = bo; $("plPV").value = "xa"; $("plPV").onchange();
    [...$("plXa").options].forEach(o => { o.selected = o.textContent === "Đông"; });
    $("plPP").value = "ecl_mau"; $("plPP").onchange(); $("plK").value = "1"; };
  const chay = async (ng, re, ten) => { $("plNguon").value = ng; $("plNguon").onchange(); const t0 = E("PL.tok"); $("plChay").click();
    await until(() => E("PL.tok") > t0 && /xong|lỗi/.test($("plTT").textContent) && (/lỗi/.test($("plTT").textContent) || E(`PL.kq && PL.kq.nguon === "${ng}" && PL.kq.ids.join() === ${JSON.stringify(re.join())}`)), 90000, ten); };
  datPV();
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:/.test(i.value); });
  const S2 = [...$("plDT").querySelectorAll("input:checked")].map(i => i.value);

  // ---------- 1. trong phạm vi: chỉ một lớp -> báo, gợi ý dùng mẫu ngoài
  E("PL.kq = null"); await chay("trong", S2, "trong phạm vi");
  ok(/lỗi/.test($("plTT").textContent) && /ít nhất hai lớp/.test($("plTT").textContent) && /Mẫu huấn luyện/.test($("plTT").textContent), "xã Đông chỉ có mẫu X1: báo cần hai lớp, gợi ý chọn Mẫu huấn luyện: " + $("plTT").textContent.slice(0, 90));

  // ---------- 2. thêm vùng xung quanh 2 km
  await chay("d2", S2, "+2 km");
  let K = E("({n: PL.kq.nMau, nn: PL.kq.nNgoai, keys: PL.kq.keys, sn: Array.from(PL.kq.soNgoai), d: PL.kq.dNgoai, dt: Array.from(PL.kq.dt), res: PL.kq.g.res, tong: PL.kq.tong})");
  ok(K.n === 10 && K.nn === 5 && K.keys.join() === "N1,X1" && K.sn.join() === "5,0" && gan(K.d, 1895, 40), `+2 km: 5 mẫu N1 ở xã Tây (xa nhất ${(K.d / 1000).toFixed(2)} km) + 5 mẫu X1 trong xã; mẫu T1 (≥ 3.5 km) không lấy`);
  // ranh giới giữa hai lớp là trung điểm của mẫu N1 xa nhất (cột 720) và mẫu X1 gần nhất (cột 1050): cột 885
  ok(gan(K.dt[0], 1620, 0.12 * 1620) && gan(K.dt[1], 7380, 0.04 * 7380) && gan(K.tong, 9000, 150),
     `xã Đông: N1 ${K.dt[0].toFixed(0)} ha (mong đợi ≈ 1620, ranh giới ở trung điểm hai mẫu gần nhau nhất), X1 ${K.dt[1].toFixed(0)} ha (≈ 7380); chỉ phân loại trong xã (${K.tong.toFixed(0)} ha)`);
  const tom = $("plTom").textContent;
  ok(/5 trong phạm vi, 5 ngoài phạm vi \(xa nhất 1\.9 km; nguồn: phạm vi và vùng xung quanh 2 km\)/.test(tom) && /Riêng 5 mẫu trong phạm vi: đúng 100\.0 %/.test(tom) && /nơi khác có thể khác điều kiện/.test(tom),
     "tóm tắt: số mẫu trong, ngoài phạm vi, độ đúng riêng của mẫu trong phạm vi, lưu ý điều kiện nơi khác");
  ok(E("PL.cb.some(c => c.muc === 'ngoai' && /chỉ có mẫu ngoài phạm vi/.test(c.t))") && /5 ngoài/.test($("plDTBang").textContent), "cảnh báo: N1 chỉ có mẫu ngoài phạm vi; bảng diện tích ghi số mẫu ngoài");
  ok(E("PL.kq.xaTrong.length") === 0, "xã chưa có mẫu: chỉ tính mẫu trong phạm vi (xã Đông có mẫu X1)");
  $("plTen").value = "Phân loại Đông +2 km"; $("plLuu").click(); await sleep(30);
  ok(E("(PA.rieng.find(p => p.ten === 'Phân loại Đông +2 km') || {}).tham_so.nguon_mau") === "d2" && E("PA.rieng.find(p => p.ten === 'Phân loại Đông +2 km').tham_so.so_mau_ngoai") === 5, "phương án lưu nguồn mẫu và số mẫu ngoài");

  // ---------- 3. +5 km, mọi điểm
  await chay("d5", S2, "+5 km");
  K = E("({nn: PL.kq.nNgoai, keys: PL.kq.keys, sn: Array.from(PL.kq.soNgoai), d: PL.kq.dNgoai, dt: Array.from(PL.kq.dt)})");
  const iT = K.keys.indexOf("T1");
  ok(K.nn === 8 && iT >= 0 && K.sn[iT] === 3 && gan(K.d, 4495, 60), `+5 km: thêm 3 mẫu T1 cách 3.5-4.5 km (xa nhất ${(K.d / 1000).toFixed(2)} km), bỏ 2 mẫu cách 5.5, 6 km`);
  ok(K.dt[iT] < 5 && gan(K.dt[K.keys.indexOf("N1")], 1620, 0.12 * 1620), "mẫu T1 (dải thực vật ở xa) không chiếm chỗ nào trong xã Đông: phân loại vẫn đúng");
  await chay("all", S2, "mọi điểm");
  ok(E("PL.kq.nNgoai") === 10 && E("PL.kq.nMau") === 15 && /mọi điểm đã gán/.test($("plTom").textContent), "mọi điểm đã gán: đủ 10 mẫu ở xã Tây");

  // ---------- 4. đặc trưng tại mẫu ngoài phạm vi = đặc trưng của lưới phân tích nếu lưới phủ tới đó (cùng bước, cùng gốc, cùng thang)
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:|^ctx:s15$|^pc:1$/.test(i.value); });
  const S3 = [...$("plDT").querySelectorAll("input:checked")].map(i => i.value);
  ok(S3.includes("ctx:s15") && S3.includes("pc:1"), "có đặc trưng cửa sổ (CTX ĐLC 15 × 15) và PC1 (thang theo phân vị của phạm vi)");
  $("plPP").value = "ecl_mau"; await chay("d2", S3, "+2 km, CTX, PC");
  const ss = await E(`(async () => {
    const K = PL.kq, g = K.g, res = g.res, lui = Math.ceil(2500 / res), gB = {x0: g.x0 - lui * res, y1: g.y1, res, w: g.w + lui, h: g.h};
    gB.bb = [gB.x0, gB.y1 - gB.h * res, gB.x0 + gB.w * res, gB.y1];
    const sc = {}; await vgDoc(g, K.y, K.ids, sc);                     // thang của phạm vi (như lần phân loại)
    const D = await vgDoc(gB, K.y, K.ids, sc, {khongLop: true}), S = CORE.stackFeat(D.lst, gB.w * gB.h);
    const ng = K.mau.filter(m => m.ngoai);
    return ng.map(m => { const q = CORE.to3857(m.p.lon, m.p.lat), px = Math.floor((q[0] - gB.x0) / res), py = Math.floor((gB.y1 - q[1]) / res), i = py * gB.w + px;
      const v = S.F.slice(i * S.nf, i * S.nf + S.nf); let kh = 0; for (let c = 0; c < S.nf; c++) kh = Math.max(kh, Math.abs(v[c] - m.raw[c])); return [S.nf, m.raw.length, kh]; });
  })()`);
  ok(ss.length === 5 && ss.every(([a, b, kh]) => a === b && a === 21 && kh === 0), `5 mẫu ngoài: đủ ${ss[0] && ss[0][0]} đặc trưng (10 S2, 10 CTX, 1 PC), giống hệt khi đọc trên lưới phân tích mở rộng tới chỗ mẫu: chênh lớn nhất ${ss.map(x => x[2]).join(", ")}`);

  // ---------- 5. dịch, lỗi
  E("setLang('ru')"); await sleep(100);
  ok(/плюс окрестность 2 км/.test([...$("plNguon").options].map(o => o.textContent).join()) && /Обучающие образцы: 5 в пределах области, 5 за её пределами/.test($("plTom").textContent), "tiếng Nga: ô Mẫu huấn luyện, tóm tắt");
  const miss = E("[...T_MISS]").filter(x => /mẫu|phạm vi|khối|xung quanh/i.test(x) && !/thử/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
