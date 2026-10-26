// Bản 3.18.1: xếp tầng — tổ hợp kênh riêng từng tầng (S2 10 băng, DEM), đặt tạm rồi trả lại biến toàn cục (cả khi hai lượt dựng chạy
// cùng lúc), nhãn ngắn kèm tổ hợp; xem trước hiện dần; năm kiểu chuyển động; ▶ xem chuyển động; video qua WebCodecs (giả lập) ra MP4 / WebM
// đúng số khung; dừng giữa chừng.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, key, until, errs, blobs} = moTrang({geoman: true});
  const ab = b => new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(new Uint8Array(fr.result)); fr.readAsArrayBuffer(b); });
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest");
  ok(E("VERSION").localeCompare("3.18.1", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  const s2goc = E("JSON.stringify([S2V.pre, S2V.r, S2V.g, S2V.b, DEMV.mode])");
  E("setYear(2025)"); key("o"); await sleep(50); await until(() => E("VG.xa && VG.xa.length") === 2, 5000, "ranh giới xã"); key("o"); await sleep(20);
  E(`localStorage.removeItem("laymau_hp_tang_ds_v1"); TG.tang = [{k: "xa"}]; TG.o.vung = "tinh"; TG.o.hinh = "ranh"`);
  $("bTang").click(); await until(() => E("TG.P && TG.P.xong"), 8000, "dựng xem trước");

  // ---------- 1. tổ hợp kênh từng tầng
  E(`TG.tang = [tgTangMoi(xbDS().find(d => d.k === "ovl:s2d"), 2025), tgTangMoi(xbDS().find(d => d.k === "ovl:dem")), tgTangMoi(xbDS().find(d => d.k === "xa"))]; tgVeDS()`);
  const x0 = E(`$("tgDS").querySelectorAll(".tg-x").length`);
  ok(x0 === 2 && E(`TG.tang[0].v.mode`) === "rgb" && E(`TG.tang[1].v.mode`) === E("DEMV.mode"), "tầng S2 10 băng và DEM có hàng cách hiển thị riêng; véc tơ không có");
  const row = () => $("tgDS").querySelector('.tg-tang[data-i="0"] .tg-x'), doi = (k, v) => { const s = row().querySelector(`[data-x="${k}"]`); s.value = v; s.dispatchEvent(new w.Event("change", {bubbles: true})); };
  doi("pre", "843");
  ok(E("TG.tang[0].v.r") === 6 && E("TG.tang[0].v.g") === 2 && E("TG.tang[0].v.b") === 1 && /8-4-3/.test(E("tgTen(TG.tang[0], xbDS().find(d => d.k === 'ovl:s2d'))")), "chọn tổ hợp 8-4-3: kênh R-G-B = B8-B4-B3, nhãn ghi tổ hợp");
  doi("pre", "tu"); doi("r", "8");
  ok(E("TG.tang[0].v.pre") === "tu" && E("TG.tang[0].v.r") === 8 && /S2 10 băng 2025 · B11-B4-B3/.test(E("tgTen(TG.tang[0], xbDS().find(d => d.k === 'ovl:s2d'))")) && row().querySelectorAll(".tg-rgb select").length === 3,
    "R-G-B tuỳ chọn: B11-B4-B3, nhãn ngắn «S2 10 băng 2025 · B11-B4-B3»");
  doi("mode", "idx"); ok(row().querySelector('[data-x="chi"]') && !row().querySelector('[data-x="pre"]') && E("TG.tang[0].v.mode") === "idx", "chế độ chỉ số: ô chọn chỉ số thay cho tổ hợp");
  doi("mode", "rgb"); doi("pre", "843");
  const dm = $("tgDS").querySelector('.tg-tang[data-i="1"] .tg-x [data-x="mode"]'); dm.value = "doc"; dm.dispatchEvent(new w.Event("change", {bubbles: true}));
  ok(E("TG.tang[1].v.mode") === "doc" && /DEM · độ dốc/.test(E("tgTen(TG.tang[1], xbDS().find(d => d.k === 'ovl:dem'))")), "DEM: chọn độ dốc, nhãn «DEM · độ dốc…»");
  // đặt tạm biến toàn cục đúng lúc dựng tầng, trả lại sau; hai lượt dựng cùng lúc không giẫm nhau
  E(`window.__thay = []; const _x = xbVeCacLop; window.__xb = _x; xbVeCacLop = async function (g, E0, F, ds) { const k = ds[0].s.k; window.__thay.push(k + ":" + (k === "ovl:s2d" ? S2V.pre + "/" + S2V.r : k === "ovl:dem" ? DEMV.mode : "-")); await new Promise(r => setTimeout(r, 5)); return _x.apply(this, arguments); }`);
  await E(`(async () => { TG.cache.clear(); const o = Object.assign({}, TG.o); const A = TG.tang, B = A.map(t => Object.assign({}, t, {v: t.v && Object.assign({}, t.v, t.k === "ovl:s2d" ? {pre: "432", r: 2, g: 1, b: 0} : {mode: "cao"})}));
    const p1 = tgChuan(o, 300, null, 800, 600); TG.tang = B; const p2 = tgChuan(o, 320, null, 800, 600); TG.tang = A; await Promise.all([p1, p2]); })()`);
  const th = E("window.__thay");
  ok(th.includes("ovl:s2d:843/6") && th.includes("ovl:s2d:432/2") && th.includes("ovl:dem:doc") && th.includes("ovl:dem:cao"), "khi dựng: S2V, DEMV mang đúng tổ hợp của tầng đang dựng (" + th.join(", ") + ")");
  await sleep(300); await E("TG.khoaTC"); await until(() => E("TG.P && TG.P.xong"), 8000, "xem trước xong"); await E("TG.khoaTC");
  ok(E("JSON.stringify([S2V.pre, S2V.r, S2V.g, S2V.b, DEMV.mode])") === s2goc, "dựng xong (kể cả hai lượt chạy cùng lúc): S2V, DEMV trả về như bản đồ đang xem");
  E("xbVeCacLop = window.__xb");
  ok(E(`[...TG.cache.keys()].filter(k => /ovl:s2d/.test(k)).length`) >= 2, "đệm tầng phân biệt theo tổ hợp kênh");

  // ---------- 2. xem trước hiện dần
  const moi = await E(`(async () => { const ds = []; await tgChuan(Object.assign({}, TG.o, {tongHop: true}), 280, null, 800, 600, P => ds.push(P.lat.map(L => L.c ? 1 : 0).join(""))); return ds; })()`);
  ok(moi.length === 5 && moi[0] === "0000" && moi[1] === "0100" && moi[3] === "0111" && moi[4] === "1111", "xem trước hiện dần: tấm chờ trước, từng tầng hiện khi xong, tầng tổng hợp cuối cùng (" + moi.join(" → ") + ")");
  const cho = E(`(() => { const P = {G: TG.P.G, K: TG.P.K, lat: TG.P.lat.map(L => Object.assign({}, L, {c: null})), thieu: []}; const c = tgGhep(TG.o, P, 800, 600); return !!c._tg; })()`);
  ok(cho, "ghép được cả khi tầng chưa dựng xong (tấm chờ «đang tải…»)");

  // ---------- 3. khoảng cách theo chiều cao, mặc định, véc tơ không nền, mẫu trình bày
  ok(E("tgNen({}, {nhom: 'vecto'})") === "khong" && E("tgNen({}, {nhom: 'du_lieu'})") === "trang", "nền tấm tự động: véc tơ không nền, ảnh nền đặc");
  $("tgMau").value = "toi"; $("tgMau").dispatchEvent(new w.Event("change"));
  ok(E("TG.o.nen") === "toi" && $("tgNen").value === "toi" && $("tgGianV").textContent === "×0.80" && /2\.6 %/.test($("tgDayV").textContent), "mẫu trình bày «nền tối»: đổi nền, khoảng cách, độ dày (hiện số cạnh thanh trượt)");
  const vs = E(`(() => { const P = TG.P, r = [];
    for (const [W, H] of [[1920, 1080], [3840, 2160]]) { const v = tgVeSo(TG.o, P, W, H), s = tgGhep(TG.o, P, W, H)._tg.s; r.push(v.k * s, v.fs * s); } return r; })()`);
  ok(gan(vs[0], 1.08, 0.15) && gan(vs[2] / vs[0], 2, 0.15) && gan(vs[3] / vs[1], 2, 0.15), `nét véc tơ, chữ trên tấm theo tỉ lệ ảnh ra: 1 px nét = ${vs[0].toFixed(2)} px ở 1080p, ${vs[2].toFixed(2)} px ở 2160p`);

  // ---------- 4. kiểu chuyển động
  const kd = E(`(() => { const o = Object.assign({}, TG.o, {xoay: 10}), f = (k, t) => tgKhungDong(o, k, t, 4);
    return {xoay0: f("xoay", 0).o.xoay, xoay5: f("xoay", 0.5).o.xoay, tach0: f("tach", 0).tach, tach9: f("tach", 0.9).tach, tx0: f("tach_xoay", 0).tach, txEnd: f("tach_xoay", 0.999).o.xoay,
      ll0: f("lan_luot", 0).hien.map(h => h.a), ll5: f("lan_luot", 0.4).hien.map(h => +h.a.toFixed(2)), ll9: f("lan_luot", 0.95).hien.map(h => h.a), lac: f("lac", 0.25).o.xoay, lac0: f("lac", 0).o.xoay}; })()`);
  ok(kd.xoay0 === 10 && kd.xoay5 === 190, "xoay vòng 360°: t = 0.5 quay thêm 180°");
  ok(kd.tach0 === 0 && kd.tach9 === 1, "tách tầng: từ một khối (0) tới tách hẳn (1)");
  ok(kd.tx0 === 0 && gan(kd.txEnd, 370, 0.5), "tách rồi xoay vòng: cuối đoạn quay đủ 360°");
  ok(kd.ll0.every(a => a === 0) && kd.ll9.every(a => a === 1) && kd.ll5[0] === 1 && kd.ll5[3] === 0, "lần lượt từng tầng: đáy hiện trước, trên cùng hiện sau (" + kd.ll5.join(", ") + " ở t = 0.4)");
  ok(gan(kd.lac, 38, 1e-9) && kd.lac0 === 10, "lắc qua lại: biên độ 28°, đầu và cuối trùng nhau (lặp liền mạch)");
  $("tgChoi").click(); await sleep(60);
  ok(!!E("TG.choi") && /Dừng xem/.test($("tgChoi").textContent) && $("tgChoi2").textContent === "■", "▶ xem chuyển động ngay trong khung xem trước");
  $("tgChoi2").click(); ok(!E("TG.choi") && /Xem chuyển động/.test($("tgChoi").textContent), "dừng xem chuyển động");
  $("tgPhong").click(); ok($("dlgTang").classList.contains("tg-to"), "phóng to khung xem (ẩn cột điều khiển)"); $("tgPhong").click();

  // ---------- 5. video qua WebCodecs (giả lập bộ mã hoá)
  E(`window.VideoFrame = class { constructor(c, o) { this.timestamp = o.timestamp; } close() {} };
    window.__khung = 0; window.VideoEncoder = class { static async isConfigSupported(c) { return {supported: /^avc1\\.64/.test(c.codec) || /^vp09/.test(c.codec)}; }
      constructor(o) { this.o = o; this.encodeQueueSize = 0; this.n = 0; } configure(c) { this.c = c; window.__cfg = c; }
      encode(f, op) { window.__khung++; const b = new Uint8Array([0, 0, 0, 2, 0x65, 0x88]); const md = this.n++ === 0 ? {decoderConfig: {description: new Uint8Array([1, 100, 0, 40, 255, 225, 0, 4, 103, 100, 0, 40, 1, 0, 4, 104, 238, 60, 128]).buffer}} : undefined;
        this.o.output({byteLength: b.length, copyTo: d => d.set(b), timestamp: f.timestamp, type: op && op.keyFrame ? "key" : "delta"}, md); }
      async flush() {} close() {} };`);
  $("tgKho").value = "fhd"; $("tgKho").dispatchEvent(new w.Event("change")); $("tgGiay").value = "6"; $("tgFps").value = "24"; $("tgVidDD").value = "mp4"; $("tgKieuDong").value = "xoay";
  ["tgGiay", "tgFps", "tgVidDD", "tgKieuDong"].forEach(id => $(id).dispatchEvent(new w.Event("change")));
  const nb = blobs.length; $("tgVid").click();
  await until(() => /đã xuất .*\.mp4/.test($("tgTT").textContent), 20000, "xuất MP4");
  const mp4 = await ab(blobs[blobs.length - 1]), txt = Buffer.from(mp4).toString("latin1");
  const iz = txt.indexOf("stsz"), nk = (mp4[iz + 12] << 24) | (mp4[iz + 13] << 16) | (mp4[iz + 14] << 8) | mp4[iz + 15];
  ok(blobs.length > nb && blobs[blobs.length - 1].type === "video/mp4" && txt.slice(4, 8) === "ftyp" && nk === 144 && E("window.__khung") === 144, `MP4: 6 s × 24 khung/giây = ${nk} khung ghi vào tệp`);
  ok(E("__cfg.codec") === "avc1.640028" && E("__cfg.width") === 1920 && E("__cfg.height") === 1080 && /avc1\.640028/.test($("tgTT").textContent), "H.264 High mức 4.0 cho 1920 × 1080; dòng trạng thái ghi codec");
  $("tgVidDD").value = "webm"; $("tgVidDD").dispatchEvent(new w.Event("change")); E("window.__khung = 0"); $("tgVid").click();
  await until(() => /đã xuất .*\.webm/.test($("tgTT").textContent), 20000, "xuất WebM");
  const wb = await ab(blobs[blobs.length - 1]);
  ok(blobs[blobs.length - 1].type === "video/webm" && wb[0] === 0x1A && wb[1] === 0x45 && wb[2] === 0xDF && wb[3] === 0xA3 && E("window.__khung") === 144 && /^vp09/.test(E("__cfg.codec")), "WebM (VP9): đủ 144 khung, đầu tệp EBML");
  $("tgGiay").value = "30"; $("tgGiay").dispatchEvent(new w.Event("change")); $("tgVid").click(); await sleep(150);
  ok(/Dừng xuất video/.test($("tgVid").textContent), "đang xuất: nút đổi thành «Dừng xuất video»");
  $("tgVid").click(); await until(() => /đã dừng xuất video/.test($("tgTT").textContent), 8000, "dừng");
  ok(/Xuất video/.test($("tgVid").textContent) && !E("TG.ma"), "dừng giữa chừng: báo đã dừng, nút trở lại");

  // ---------- 6. tiếng Nga; không sót khoá
  E("setLang('ru')"); await sleep(50);
  ok(/Экспорт видео/.test($("tgVid").textContent) && /полный оборот 360°/.test($("tgKieuDong").textContent) && /Шаблон оформления/.test($("dlgTang").textContent), "tiếng Nga: video, kiểu chuyển động, mẫu trình bày");
  const miss = E("[...T_MISS]").filter(x => /tầng|tấm|kênh|video|khung|chuyển động|mẫu|xem|tổ hợp|kính/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 6).join(" | ") : ""));
  E("setLang('vi')"); await sleep(30); $("tgDong").click();
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
