// Bản 3.17: biểu đồ diện tích theo ngưỡng ở Chọn vùng: đường tính một lượt phải khớp đúng diện tích chọn thật ở từng ngưỡng (khi tắt
// làm sạch), cả vùng liền lẫn bán kính; điểm đã gán cùng lớp / lớp khác, độ thuần theo bản đồ tham chiếu, gợi ý, nhấp đặt ngưỡng, tô bản đồ, CSV.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json");
const gan = (a, b, t) => a != null && b != null && Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs, blobs, docBlob} = moTrang({geoman: true});
  const click = (lon, lat, shift) => E(`map.fire("click", {latlng: L.latLng(${lat}, ${lon}), originalEvent: {shiftKey: ${!!shift}}})`);
  await until(() => E("MAN") && E("MAN.layers.length") >= 5, 8000, "manifest");
  ok(E("VERSION").localeCompare("3.17", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  E("setYear(2025)"); key("o"); await sleep(50);
  await until(() => E("VG.xa && VG.xa.length") === 2, 5000, "ranh giới xã");
  E(`vgChonLop("X2")`);
  // tắt làm sạch để so đúng từng điểm ảnh
  ["vgMinPx", "vgLo", "vgKhe"].forEach(id => { const e = $(id); e.value = e.tagName === "SELECT" ? (e.options[0] && e.options[0].value) : "0"; });
  click(RV.lang[0][0], RV.lang[0][1]);
  await until(() => E("VG.res && VG.res.st"), 8000, "vùng liền");
  ok(!!$("ngMo"), "nút 📈 cạnh thanh ngưỡng");
  $("ngMo").click(); await until(() => E("!!NG.kq"), 8000, "tính đường");
  const nb = E("NG.kq.nb"), lien = E("NG.kq.lien");
  ok(nb === 200 && lien && $("ngVe").querySelector("svg"), `bảng mở, đường có ${nb} ngưỡng (bước 0.002), chế độ vùng liền`);

  // ---------- 1. đường khớp diện tích chọn thật ở từng ngưỡng
  const soSanh = async ten => {
    const sai = [];
    for (const t of [0.006, 0.02, 0.05, 0.1, 0.2, 0.35]) {
      $("vgTau").value = t.toFixed(3); E("vgChon()"); await sleep(5);
      const that = E("VG.res.st.dien_tich_ha"), b = Math.round(t / 0.002) - 1, duong = E(`NG.kq.A[${b}]`);
      if (!gan(that, duong, 1e-6 * Math.max(1, that))) sai.push(`${t}: ${that} ≠ ${duong}`);
    }
    ok(sai.length === 0, `${ten}: đường trùng diện tích chọn thật ở 6 ngưỡng (0.006 … 0.35)` + (sai.length ? " — " + sai.join("; ") : ""));
  };
  await soSanh("vùng liền với điểm mẫu");
  const A = E("Array.from(NG.kq.A)"), Ap = E("Array.from(NG.kq.Ap)");
  ok(A.every((v, i) => !i || v >= A[i - 1] - 1e-9) && A.every((v, i) => v <= Ap[i] + 1e-9), "đường tăng dần; vùng liền không vượt diện tích chỉ xét phổ");
  const G0 = E("NG.goiy"), bK = G0.khuyu != null ? Math.round(G0.khuyu / 0.002) - 1 : -1, bT = G0.tren != null ? Math.round(G0.tren / 0.002) - 2 : 199;
  ok(G0.khuyu != null && G0.khuyu < 0.05 && (G0.tren == null || G0.khuyu < G0.tren) && A[bK] >= 0.6 * A[bT] && $("ngTom").textContent.includes("thoải"),
    `chưa có điểm đã gán: cận dưới là khuỷu đường τ = ${G0.khuyu} (${A[bK] && A[bK].toFixed(1)} / ${A[bT] && A[bT].toFixed(1)} ha trước mốc lấn)`);
  $("vgPV").value = "bk"; $("vgBK").value = "3"; $("vgPV").onchange();
  await until(() => E("VG.res && VG.res.prm.pv") === "bk" && E("NG.kq && !NG.kq.lien"), 8000, "bán kính");
  await soSanh("bán kính 3 km (không cần liền)");
  $("vgPV").value = "lien"; $("vgPV").onchange(); await until(() => E("VG.res && VG.res.prm.pv") === "lien" && E("NG.kq && NG.kq.lien"), 8000, "về vùng liền");

  // ---------- 2. điểm đã gán năm 2025: cùng lớp (làng kia) và lớp khác (ruộng quanh)
  const P = E(`(() => { const out = {}; const L1 = ${JSON.stringify(RV.lang)}; const them = (id, lon, lat, ma) => { ST.diem[id] = {id, bo: "thu317", lon, lat, nhan: {2025: ma}, tg: {2025: 1}, tin: {}}; };
    them("C1", L1[0][0] + 0.0004, L1[0][1] + 0.0003, "X2"); them("C2", L1[0][0] - 0.0004, L1[0][1] - 0.0002, "X2"); them("C3", L1[0][0] + 0.0002, L1[0][1] - 0.0004, "X2");
    for (let k = 0; k < 6; k++) them("K" + k, L1[0][0] + 0.004 + k * 0.003, L1[0][1] + 0.002, "T1");
    return Object.keys(ST.diem).length; })()`);
  E("ngCapNhat(true)"); await sleep(20);
  const K = E(`({n: NG.kq.diem.length, cung: NG.kq.diem.filter(p => p.cung).length, khac: NG.kq.diem.filter(p => !p.cung).length, G: NG.goiy, L: NG.kq.L && {dom: NG.kq.L.dom, ten: NG.kq.L.ten_dom}})`);
  ok(K.cung === 3 && K.khac === 6, `điểm đã gán trong lưới: ${K.cung} cùng lớp X2, ${K.khac} lớp khác (T1)`);
  ok(K.G.phu != null && (K.G.lan == null || K.G.lan > K.G.phu), `mốc: phủ 80 % điểm cùng lớp từ τ = ${K.G.phu}` + (K.G.lan != null ? `; điểm lớp khác đầu tiên ở τ = ${K.G.lan}` : "; chưa điểm lớp khác nào bị chọn trong 0..0.4"));
  ok(K.L && K.L.dom != null, `độ thuần theo bản đồ tham chiếu (lớp «${K.L && K.L.ten}» ở điểm mẫu)`);
  const thuan = E("Array.from(NG.kq.L.Aq, (q, b) => q > 0 ? NG.kq.L.Ad[b] / q : null).filter(v => v != null)");
  ok(thuan.length > 50 && thuan.every(v => v >= 0 && v <= 1 + 1e-9) && thuan[0] >= thuan[thuan.length - 1] - 1e-9, `độ thuần trong [0, 1], giảm khi nới ngưỡng (${(100 * thuan[0]).toFixed(0)} % → ${(100 * thuan[thuan.length - 1]).toFixed(0)} %)`);
  ok(/Khoảng ngưỡng gợi ý|Chưa có ngưỡng nào|Chưa đủ căn cứ/.test($("ngTom").textContent) && /Mốc/.test($("ngTom").textContent), "tóm tắt có gợi ý và các mốc");
  // điểm lớp khác ngay sát làng: phải bị chọn sớm và đánh dấu
  E(`ST.diem.KX = {id: "KX", bo: "thu317", lon: ${RV.lang[0][0]} + 0.0003, lat: ${RV.lang[0][1]}, nhan: {2025: "T1"}, tg: {2025: 1}, tin: {}}`); E("ngCapNhat(true)"); await sleep(10);
  const G2 = E("NG.goiy");
  ok(G2.lan != null && G2.lanDiem.id === "KX" && G2.mauThuan === (G2.duoi != null && G2.duoi >= G2.lan), `điểm lớp khác trong làng bị chọn ở τ = ${G2.lan}: ${G2.mauThuan ? "báo mâu thuẫn (chưa ngưỡng nào vừa phủ vừa không lấn)" : "mốc lấn"}`);
  ok($("ngDS").querySelector("table") && /KX/.test($("ngDS").textContent), "bảng điểm lớp khác bị chọn theo thứ tự ngưỡng");
  E("delete ST.diem.KX"); E("ngCapNhat(true)");

  // ---------- 3. nhấp lên biểu đồ đặt ngưỡng; vạch ngưỡng hiện tại
  const svg = $("ngVe").querySelector("svg"), W = 680, ml = 56, pw = 680 - 56 - 46;
  svg.dispatchEvent(new w.MouseEvent("click", {bubbles: true, clientX: ml + pw * 0.25, clientY: 100}));
  await sleep(20);
  ok(gan(+$("vgTau").value, 0.1, 0.0021) && gan(+$("ngVe").querySelector("#ngNow").getAttribute("x1"), ml + pw * 0.25, 2), `nhấp lên biểu đồ ở 1/4 trục: ngưỡng ${$("vgTau").value}, vạch hiện tại dời theo`);

  // ---------- 4. tô bản đồ theo ngưỡng vào vùng; CSV; tiếng Nga; đóng
  $("ngBD").checked = true; $("ngBD").onchange(); await sleep(10);
  ok(E("!!NG.nen && map.hasLayer(NG.nen)"), "tô bản đồ theo ngưỡng vào vùng");
  const nb0 = blobs.length; $("ngCSV").click(); await sleep(30);
  const csv = await docBlob(blobs[nb0]);
  ok(/^tau,dien_tich_ha,chi_pho_ha,do_thuan_pct,phu_cung_lop_pct,so_diem_lop_khac/.test(csv) && csv.trim().split("\n").length === 201, "CSV 200 ngưỡng: diện tích, chỉ phổ, độ thuần, độ phủ, số điểm lớp khác");
  E("setLang('ru')"); await sleep(50);
  ok(/Площадь в зависимости от порога/.test($("ngP").textContent) && /Опорная карта/.test($("ngP").textContent), "tiếng Nga: bảng diện tích theo ngưỡng");
  const miss = E("[...T_MISS]").filter(x => /ngưỡng|điểm|lớp|diện tích|thuần|gợi ý/i.test(x) && !/thử/.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 5).join(" | ") : ""));
  E("setLang('vi')"); await sleep(30);
  $("ngDong").click(); ok($("ngP").hidden && !E("NG.nen"), "đóng bảng, bỏ lớp tô");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
