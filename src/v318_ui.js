/* =============================== BẢN 3.18 / 3.18.1 =============================== */
/* Sơ đồ lớp xếp tầng (bản đồ tách lớp kiểu trục đo, "exploded axonometric"): mỗi lớp chọn (ảnh nền, lớp dữ liệu theo năm, kết quả
   phân loại / thay đổi / phương án, véc tơ: ranh giới, OSM, điểm) được dựng thành một tấm phẳng, cắt theo cùng một hình (ranh giới
   vùng, xã, tỉnh, vùng gộp, hoặc hình tròn, vuông, vuông bo góc, lục giác, elip, thoi quanh một tâm với bán kính cho trước), rồi các
   tấm được xoay, nghiêng (phép chiếu song song) và xếp chồng cách nhau; có độ dày tấm, bóng đổ, đường gióng, nhãn kèm đường dẫn và
   chú giải nhỏ, mũi tên bắc theo hướng đã xoay, tiêu đề, dòng nguồn. Dùng lại hàm vẽ lớp của Xuất bản đồ (xbDS, xbVeCacLop).
   Bản 3.18.1: · xem trước hiện dần từng tầng (tấm chờ "đang tải"), phóng to khung xem, ▶ xem chuyển động ngay trong hộp;
   · tổ hợp kênh riêng cho từng tầng (S2 10 băng, Landsat: tổ hợp sẵn, R-G-B tuỳ chọn, chỉ số, tương phản; DEM: cách xem), nhãn
   ngắn kèm tổ hợp; · khoảng cách tầng theo chiều cao tấm đã chiếu (ít chồng lấn), véc tơ mặc định không nền, nét véc tơ và chữ trên
   tấm theo tỉ lệ ảnh xuất; mẫu trình bày; · video chính xác từng khung bằng WebCodecs (MP4 H.264 hoặc WebM VP9, tg_mux.js), năm kiểu
   chuyển động (tách tầng, xoay vòng 360°, tách rồi xoay vòng, lần lượt từng tầng, lắc lặp liền mạch), thời lượng, số khung/giây. */
const TG_MAC = {vung: "nhin", hinh: "ranh", R: 0, tam: "vung", dao: true, xoay: -30, nghieng: 36, gian: 0.75, day: 0.014, nen: "trang",
  nhan: "phai", chu: 12, vien: true, gion: true, bong: true, bac: true, cg: true, tongHop: false, tieuDe: "", phuDe: "", nguon: "", kho: "fhd", w: 1920, h: 1080, dd: "png",
  kieuDong: "tach_xoay", giay: 10, fps: 30, vid: "mp4", ban: 2};
const TG = {o: Object.assign({}, TG_MAC, ls("laymau_hp_tang_v1") || {}), tang: ls("laymau_hp_tang_ds_v1") || null, cache: new Map(), tokD: 0, tokX: 0,
  tamDiem: ls("laymau_hp_tang_tam_v1") || null, P: null, hen: null, khoaTC: Promise.resolve(), choi: null, ma: null};
if (TG.o.ban !== 2) Object.assign(TG.o, {gian: TG_MAC.gian, day: TG_MAC.day, ban: 2});   // 3.18 -> 3.18.1: khoảng cách đổi sang theo chiều cao tấm
const TG_KHO = {fhd: [1920, 1080, "1920 × 1080 (trình chiếu 16:9)"], qhd: [2560, 1440, "2560 × 1440"], vuong: [2000, 2000, "2000 × 2000 (vuông)"],
  doc: [1080, 1920, "1080 × 1920 (dọc, điện thoại)"], a4d: [2480, 3508, "A4 dọc, 300 dpi"], a4n: [3508, 2480, "A4 ngang, 300 dpi"], tu: [0, 0, "tự đặt"]};
const TG_HINH = [["ranh", "theo ranh giới vùng"], ["tron", "tròn"], ["vuong", "vuông"], ["bo", "vuông bo góc"], ["luc", "lục giác"], ["elip", "elip"], ["thoi", "hình thoi"]];
const TG_NEN = {trang: "#ffffff", xam: "#f2f4f7", giay: "#faf7f0", toi: "#0f172a"};
const TG_MAU = {kt: ["kiến trúc: nền trắng, tấm mỏng", {nen: "trang", xoay: -30, nghieng: 36, gian: 0.75, day: 0.012, bong: true, vien: true, gion: true}],
  toi: ["nền tối, tấm dày", {nen: "toi", xoay: 24, nghieng: 32, gian: 0.8, day: 0.026, bong: true, vien: true, gion: true}],
  giay: ["màu giấy, nhìn cao", {nen: "giay", xoay: -45, nghieng: 50, gian: 0.65, day: 0.018, bong: true, vien: true, gion: false}],
  tren: ["gần nhìn thẳng từ trên", {nen: "trang", xoay: 0, nghieng: 68, gian: 0.45, day: 0.01, bong: false, vien: true, gion: true}]};
const TG_DONG = [["tach", "tách tầng, xoay nhẹ"], ["xoay", "xoay vòng 360°"], ["tach_xoay", "tách tầng rồi xoay vòng"], ["lan_luot", "lần lượt từng tầng"], ["lac", "lắc qua lại (lặp liền mạch)"]];
const tg$ = id => document.getElementById(id);
function tgLuu() { ls("laymau_hp_tang_v1", TG.o); ls("laymau_hp_tang_ds_v1", TG.tang); }

/* ---------------- hình cắt ---------------- */
function tgDT(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a) / 2; }
function tgBBP(P) { const b = [Infinity, Infinity, -Infinity, -Infinity];
  P.forEach(pg => pg[0].forEach(q => { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); })); return b; }
function tgBoDao(P) {                               // bỏ mảnh nhỏ ở xa (đảo xa bờ làm khung phình to): giữ mảnh lớn nhất, mảnh ≥ 0.5 % của nó, mảnh ở gần nó
  if (P.length < 2) return P;
  const dt = P.map(pg => tgDT(pg[0])), k = dt.indexOf(Math.max(...dt)), b = tgBBP([P[k]]), d = 0.25 * Math.max(b[2] - b[0], b[3] - b[1]);
  return P.filter((pg, i) => { if (i === k || dt[i] >= 0.005 * dt[k]) return true; const q = tgBBP([pg]); return q[0] < b[2] + d && q[2] > b[0] - d && q[1] < b[3] + d && q[3] > b[1] - d; });
}
function tgHinh(hinh, c, R) {                       // một vòng khép kín (EPSG:3857) của hình quanh tâm c, "bán kính" R
  const v = [], cx = c[0], cy = c[1], vong = (n, f) => { for (let i = 0; i < n; i++) v.push(f(2 * Math.PI * i / n)); };
  if (hinh === "tron") vong(180, a => [cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  else if (hinh === "elip") vong(180, a => [cx + R * Math.cos(a), cy + 0.62 * R * Math.sin(a)]);
  else if (hinh === "luc") vong(6, a => [cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  else if (hinh === "thoi") vong(4, a => [cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  else if (hinh === "bo") { const r = 0.24 * R, h = R - r;
    [[h, h, 0], [-h, h, 90], [-h, -h, 180], [h, -h, 270]].forEach(([x, y, a0]) => { for (let i = 0; i <= 12; i++) { const a = (a0 + 90 * i / 12) * Math.PI / 180; v.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)]); } }); }
  else v.push([cx - R, cy - R], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R]);
  v.push(v[0].slice()); return v;
}
function tgNhinBB() { const b = map.getBounds(), p0 = CORE.to3857(b.getWest(), b.getSouth()), p1 = CORE.to3857(b.getEast(), b.getNorth()); return [p0[0], p0[1], p1[0], p1[1]]; }
function tgVungDS() {                               // [[giá trị, tên, nhóm]]: vùng (khung nhìn, tỉnh, vùng đã lưu, vùng gộp, phạm vi kết quả), từng xã
  const out = (typeof xbPhamDS === "function" ? xbPhamDS() : [["nhin", T("khung nhìn hiện tại")]]).filter(q => !["kq", "them", "xa"].includes(q[0])).map(q => [q[0], q[1], "v"]);
  xbDS().filter(d => d.bb).forEach(d => out.push(["bb:" + d.k, T("vừa phạm vi {t}", {t: d.ten}), "v"]));
  (VG.xa || []).slice().sort((a, b) => a.ten.localeCompare(b.ten, "vi")).forEach(x => out.push(["xa:" + x.i, x.ten, "x"]));
  return out;
}
function tgVung(v) {                                // -> {bb (3857), mp (lon, lat) | null, ten}
  if (/^xa:/.test(v)) { const x = (VG.xa || []).find(q => String(q.i) === v.slice(3)); if (x) return {bb: x.bb, mp: x.mp, ten: x.ten}; }
  if (/^bb:/.test(v)) { const d = xbDS().find(q => q.k === v.slice(3)); if (d && d.bb) return {bb: d.bb, mp: null, ten: d.ten}; }
  if (v && v !== "nhin") { try { const PV = xbPhamVi(v); if (PV && PV.bb) return PV; } catch (e) { /* vùng không còn */ } }
  return {bb: tgNhinBB(), mp: null, ten: T("khung nhìn hiện tại")};
}
function tgTam(o, V) {                              // tâm hình (3857)
  if (o.tam === "diem" && TG.tamDiem) return TG.tamDiem.slice();
  const b = o.tam === "nhin" ? tgNhinBB() : V.bb; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}
function tgRTu(o) { const V = tgVung(o.vung), b = V.bb, c = tgTam(o, V), co = Math.cos(CORE.m2ll(c[0], c[1])[1] * Math.PI / 180);   // bán kính tự động (km): vừa vùng
  return 0.5 * Math.max(b[2] - b[0], b[3] - b[1]) * co / 1000; }
function tgHinhHoc(o) {                             // -> {P: [[vòng ngoài, lỗ...]...] (3857), bb, ten, khoa}
  const V = tgVung(o.vung); let P, ten = V.ten;
  if (o.hinh === "ranh") {
    if (V.mp && V.mp.length) { P = V.mp.map(pg => pg.map(r => r.map(q => CORE.to3857(q[0], q[1]))));
      if (P.length > 1 && P.length <= 600 && typeof polygonClipping !== "undefined") { try { const u = polygonClipping.union.apply(null, P); if (u && u.length) P = u; } catch (e) { /* giữ các mảnh */ } }   // hoà tan ranh giới trong (vd tỉnh ghép từ các xã)
      if (o.dao) P = tgBoDao(P); }
    else { const b = V.bb; P = [[[[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]]]; }
  } else {
    const c = tgTam(o, V), co = Math.cos(CORE.m2ll(c[0], c[1])[1] * Math.PI / 180), km = o.R > 0 ? +o.R : tgRTu(o);
    P = [[tgHinh(o.hinh, c, km * 1000 / co)]];
    if (o.tam === "diem" && TG.tamDiem) { const ll = CORE.m2ll(c[0], c[1]); ten = `${ll[1].toFixed(4)}° N, ${ll[0].toFixed(4)}° E`; }
  }
  const bb = tgBBP(P);
  return {P, bb, ten, km: o.hinh === "ranh" ? null : (o.R > 0 ? +o.R : tgRTu(o)), khoa: JSON.stringify([o.vung, o.hinh, o.dao, bb.map(v => Math.round(v))])};
}

/* ---------------- cách hiển thị riêng của từng tầng (tổ hợp kênh) ---------------- */
// Lớp tính trong trình duyệt đọc cách hiển thị từ biến toàn cục (S2V, LSV, DEMV): khi dựng một tầng, đặt tạm cách hiển thị của tầng
// đó rồi trả lại; các lượt dựng chạy tuần tự qua một khoá để hai lượt (xem trước, xuất) không giẫm lên nhau.
const TG_XEM = {
  s2d: {g: () => (typeof S2V !== "undefined" ? S2V : null), k: ["mode", "pre", "r", "g", "b", "chi", "gain"]},
  lsd: {g: () => (typeof LSV !== "undefined" ? LSV : null), k: ["mode", "pre", "r", "g", "b", "chi", "gain"]},
  dem: {g: () => (typeof DEMV !== "undefined" ? DEMV : null), k: ["mode"]},
};
function tgXemLoai(d) { const k = d && d.L0 && d.L0.kieu; return k && TG_XEM[k] && TG_XEM[k].g() ? k : null; }
function tgXemMac(loai) { const X = TG_XEM[loai], g = X.g(), v = {}; X.k.forEach(k => { v[k] = g[k]; });
  if (loai === "s2d" && v.mode !== "idx") v.mode = "rgb"; return v; }
function tgXemTen(loai, v) {                        // mô tả ngắn cách hiển thị (đưa vào nhãn tầng)
  if (!v) return "";
  if (loai === "dem") return T({caobong: "độ cao + bóng địa hình", cao: "độ cao", doc: "độ dốc (0-30°)", bong: "bóng địa hình"}[v.mode] || "độ cao + bóng địa hình");
  if (v.mode === "idx") { const c = typeof csLay === "function" ? csLay(v.chi) : null; return (c && c.ten) || v.chi; }
  if (loai === "lsd" && v.mode !== "rgb") return T({temp: "nhiệt độ bề mặt", nguon: "nguồn điểm ảnh", cb: "cảm biến"}[v.mode] || v.mode);
  if (loai === "s2d") { const B = s2Bang(); return v.pre !== "tu" && S2_PRE_TEN[v.pre] ? T(S2_PRE_TEN[v.pre]) : [v.r, v.g, v.b].map(i => B[i] || "?").join("-"); }
  return v.pre !== "tu" && LS_PRE_TEN[v.pre] ? T(LS_PRE_TEN[v.pre]) : [v.r, v.g, v.b].join("-");
}
async function tgVoiXem(t, d, fn) {
  const loai = tgXemLoai(d); if (!loai || !t.v) return fn();
  const truoc = TG.khoaTC; let mo; TG.khoaTC = new Promise(r => { mo = r; }); await truoc;
  const X = TG_XEM[loai], g = X.g(), cu = {}; X.k.forEach(k => { cu[k] = g[k]; });
  X.k.forEach(k => { if (t.v[k] !== undefined) g[k] = t.v[k]; });
  try { return await fn(); } finally { Object.assign(g, cu); mo(); }
}
function tgXemUI(loai, v) {                         // các ô chọn cách hiển thị trong hàng của tầng
  const op = (a, s) => a.map(([x, t]) => `<option value="${esc(String(x))}"${String(x) === String(s) ? " selected" : ""}>${esc(t)}</option>`).join("");
  const sel = (k, a, tl) => `<select data-x="${k}" title="${esc(tl || "")}">${op(a, v[k])}</select>`;
  if (loai === "dem") return sel("mode", [["caobong", T("độ cao + bóng địa hình")], ["cao", T("độ cao")], ["doc", T("độ dốc (0-30°)")], ["bong", T("bóng địa hình")]]);
  const s2 = loai === "s2d", bang = s2 ? s2Bang().map((b, i) => [i, b]) : lsBang().map((b, i) => [b, lsTenBang()[i] + " (" + b + ")"]);
  const che = s2 ? [["rgb", T("tổ hợp màu")], ["idx", T("chỉ số")]] : [["rgb", T("tổ hợp màu")], ["idx", T("chỉ số")], ["temp", T("nhiệt độ bề mặt")], ["nguon", T("nguồn điểm ảnh")], ["cb", T("cảm biến")]];
  const pre = Object.keys(s2 ? S2_PRE_TEN : LS_PRE_TEN).map(k => [k, T((s2 ? S2_PRE_TEN : LS_PRE_TEN)[k])]);
  const chi = (s2 ? (typeof csDS === "function" ? csDS() : []) : (typeof lsCsDS === "function" ? lsCsDS() : [])).map(c => [c.id, c.ten]);
  let h = sel("mode", che, T("cách hiển thị"));
  if (v.mode === "rgb") { h += sel("pre", pre, T("tổ hợp kênh"));
    if (v.pre === "tu") h += `<span class="tg-rgb">R${sel("r", bang)} G${sel("g", bang)} B${sel("b", bang)}</span>`; }
  if (v.mode === "idx") h += sel("chi", chi.length ? chi : [[v.chi, v.chi]], T("chỉ số"));
  if (v.mode === "rgb" || v.mode === "idx") h += `<input data-x="gain" type="range" min="0.5" max="3" step="0.1" value="${+v.gain || 1}" title="${esc(T("tương phản"))}">`;
  return h;
}

/* ---------------- dựng từng tầng ---------------- */
function tgBy() { const by = {}; xbDS().forEach(d => { by[d.k] = d; }); return by; }
function tgNgan(d) { const t = String(d.ten), i = t.indexOf(":"); return d.nhom === "du_lieu" && i >= 2 && t.length - i > 12 ? t.slice(0, i) : t; }
function tgTen(t, d) {                              // nhãn mặc định: tên ngắn, năm, cách hiển thị
  if (!d) return t.k; const loai = tgXemLoai(d), x = loai && t.v ? tgXemTen(loai, t.v) : "";
  return tgNgan(d) + (t.nam > 0 ? " " + t.nam : "") + (x ? " · " + x : "");
}
function tgNen(t, d) { return t.nen || (d && d.nhom === "vecto" ? "khong" : "trang"); }
function tgTangMoi(d, y) {                          // một tầng mới của lớp d (năm y nếu có)
  const t = {k: d.k, nam: d.nam ? (y != null ? y : d.nam0) : undefined, md: d.md ? d.md0 : undefined, nhan: "", nen: "", op: 1}, loai = tgXemLoai(d);
  if (loai) t.v = tgXemMac(loai); return t;
}
function tgKhung(G, N) {                            // khung dựng một tầng: E (3857 -> điểm ảnh), cỡ w × h, cạnh dài N
  const b = G.bb, pd = 0.012 * Math.max(b[2] - b[0], b[3] - b[1]), x0 = b[0] - pd, y0 = b[1] - pd, x1 = b[2] + pd, y1 = b[3] + pd;
  const ar = (x1 - x0) / (y1 - y0), w = ar >= 1 ? N : Math.max(8, Math.round(N * ar)), h = ar >= 1 ? Math.max(8, Math.round(N / ar)) : N;
  return {w, h, E: {x0, y0, x1, y1, r: (x1 - x0) / w, fx: 0, fy: 0, fw: w, fh: h}};
}
function tgDuongPx(g, G, E) {                       // đường hình cắt trên canvas tầng
  g.beginPath(); G.P.forEach(pg => pg.forEach(r => { r.forEach((q, i) => { const x = (q[0] - E.x0) / E.r, y = (E.y1 - q[1]) / E.r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }));
}
function tgVeSo(o, P, W, H) {                       // nét véc tơ, chữ trên tấm theo tỉ lệ thật khi ghép: 1 px nét ≈ min(W, H)/1000 px trên ảnh ra
  const c = document.createElement("canvas"); c.width = c.height = 4;
  const B = tgBoCuc(o, P, W, H, c.getContext("2d")), s = B.s || 1, m = Math.min(W, H);
  return {k: Math.round(10 * Math.max(0.6, Math.min(14, m / 1000 / s))) / 10, fs: Math.max(6, o.chu * m / 800 * 0.8 / s)};
}
async function tgDungTang(G, K, t, d, N, ve, tt) {  // -> canvas tầng đã cắt theo hình (lưu đệm theo hình, cỡ, lớp, năm, cách xem, tổ hợp kênh, nét)
  const khoa = [G.khoa, N, t.k, t.nam, t.md, t.v ? JSON.stringify(t.v) : "", ve.k].join("|");
  if (TG.cache.has(khoa)) return TG.cache.get(khoa);
  const c = document.createElement("canvas"); c.width = K.w; c.height = K.h; const g = c.getContext("2d");
  const s = {k: t.k, on: true, op: 1, nam: t.nam, md: t.md};
  const r = await tgVoiXem(t, d, () => xbVeCacLop(g, K.E, {x: 0, y: 0, w: K.w, h: K.h}, [{s, d}], null, ve.k, ve.fs, tt));
  g.save(); g.globalCompositeOperation = "destination-in"; tgDuongPx(g, G, K.E); g.fillStyle = "#000"; g.fill("evenodd"); g.restore();
  c._thieu = (r && r.thieu) || [];
  let px = c.width * c.height; TG.cache.forEach(v => { px += v.width * v.height; });   // giữ đệm dưới ~60 triệu điểm ảnh (≈ 240 MB)
  for (const [k0, v] of TG.cache) { if (px <= 60e6) break; px -= v.width * v.height; TG.cache.delete(k0); }
  TG.cache.set(khoa, c); return c;
}
function tgCG(d, t) {                               // vài mục chú giải của tầng (ô màu hoặc dải màu)
  try { const gr = d.cg && d.cg(Object.assign({on: true, op: 1}, t)); return gr && gr.muc && gr.muc.length ? gr.muc.slice(0, 8) : null; } catch (e) { return null; }
}
async function tgChuan(o, N, tt, W, H, moi) {       // -> {G, K, lat: [{t, d, c, ten, nen, op, cg}] dưới -> trên, thieu}; moi(P) sau mỗi tầng xong (xem trước hiện dần)
  const G = tgHinhHoc(o), K = tgKhung(G, N), by = tgBy(), ds = (TG.tang || []).filter(t => by[t.k]);
  const lat = ds.map(t => { const d = by[t.k]; return {t, d, c: null, ten: t.nhan || tgTen(t, d), nen: tgNen(t, d), op: t.op != null ? +t.op : 1, cg: o.cg ? tgCG(d, t) : null}; });
  if (o.tongHop && lat.length > 1) lat.unshift({t: null, d: null, c: null, ten: T("tổng hợp các tầng"), nen: "trang", op: 1, cg: null, tong: true});
  const P = {G, K, lat, thieu: [], xong: false}, ve = tgVeSo(o, P, W || 1600, H || 1000), rieng = lat.filter(L => !L.tong);
  if (moi) moi(P);
  for (let i = 0; i < rieng.length; i++) {
    const L = rieng[i]; if (tt) tt(T("đang dựng tầng {i}/{n}: {t}", {i: i + 1, n: rieng.length, t: L.ten}), (i + 0.15) / rieng.length);
    L.c = await tgDungTang(G, K, L.t, L.d, N, ve, tt ? s => tt(s, (i + 0.5) / rieng.length) : null); P.thieu.push(...L.c._thieu);
    if (moi) moi(P);
  }
  if (lat[0] && lat[0].tong) {                       // tầng đáy: mọi tầng chồng lên nhau như bản đồ thường
    const c = document.createElement("canvas"); c.width = K.w; c.height = K.h; const g = c.getContext("2d");
    rieng.forEach(L => { g.globalAlpha = L.op; g.drawImage(L.c, 0, 0); }); g.globalAlpha = 1; lat[0].c = c;
  }
  P.thieu = [...new Set(P.thieu)]; P.xong = true; if (moi) moi(P);
  return P;
}

/* ---------------- phép chiếu, bố cục, ghép ---------------- */
function tgMT(o) {                                  // [a, b, c, d]: xoay quanh trục đứng rồi nghiêng (nén trục dọc theo sin góc nhìn)
  const a = (+o.xoay || 0) * Math.PI / 180, t = Math.sin(Math.max(5, Math.min(90, +o.nghieng || 40)) * Math.PI / 180);
  return [Math.cos(a), t * Math.sin(a), -Math.sin(a), t * Math.cos(a)];
}
function tgVien(P) {                                // các vòng hình cắt theo điểm ảnh tầng, gốc ở tâm tầng
  const {K, G} = P, w2 = K.w / 2, h2 = K.h / 2;
  return G.P.map(pg => pg.map(r => r.map(q => [(q[0] - K.E.x0) / K.E.r - w2, (K.E.y1 - q[1]) / K.E.r - h2])));
}
function tgDuong(g, V, M, s, cx, cy, noi) {         // đường viền tầng đã chiếu (noi: nối vào đường đang có)
  if (!noi) g.beginPath(); V.forEach(pg => pg.forEach(r => { r.forEach((q, i) => { const x = cx + s * (M[0] * q[0] + M[2] * q[1]), y = cy + s * (M[1] * q[0] + M[3] * q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }));
}
function tgCGDo(g, cg, fs, rong) {                  // xếp các mục chú giải nhỏ thành hàng trong bề rộng cho trước
  const f = fs * 0.74, o = f * 0.95, hang = [[]]; let x = 0;
  (cg || []).forEach(m => { const ten = String(m.ten == null ? "" : m.ten), w = (m.ramp ? f * 2.6 : o) + f * 0.35 + xbDo(g, ten, f) + f * 0.9;
    if (x > 0 && x + w > rong) { hang.push([]); x = 0; } hang[hang.length - 1].push({m, ten, w}); x += w; });
  return {hang: hang.filter(h => h.length), f, h: hang.filter(h => h.length).length * f * 1.35};
}
function tgBoCuc(o, P, W, H, g, coDinh) {           // vị trí các tầng, nhãn: tỉ lệ s, tâm cx, đáy cyB, bước tầng; coDinh: khung không đổi khi xoay (video)
  const V = tgVien(P), M = tgMT(o), n = P.lat.length, pr = q => [M[0] * q[0] + M[2] * q[1], M[1] * q[0] + M[3] * q[1]];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, L = [0, 0], R = [0, 0];
  V.forEach(pg => pg[0].forEach(q => { const p = pr(q); if (p[0] < x0) { x0 = p[0]; L = p; } if (p[0] > x1) { x1 = p[0]; R = p; } if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }));
  let bx0 = x0, bx1 = x1, by0 = y0, by1 = y1;
  if (coDinh) { let rm = 0; V.forEach(pg => pg[0].forEach(q => { rm = Math.max(rm, Math.hypot(q[0], q[1])); })); const t = Math.hypot(M[1], M[3]);
    bx0 = -rm; bx1 = rm; by0 = -rm * Math.abs(t); by1 = rm * Math.abs(t); }
  const fw = Math.max(1, bx1 - bx0), fh = Math.max(1, by1 - by0), gap = o.gian * fh, day = o.day * fw;   // khoảng cách theo chiều cao tấm đã chiếu
  const fs = o.chu * Math.min(W, H) / 800, le = Math.round(0.035 * Math.min(W, H));
  const dau = (o.tieuDe ? fs * 2.1 : 0) + (o.phuDe ? fs * 1.5 : 0) + (o.tieuDe || o.phuDe ? fs * 0.6 : 0);
  const nguon = o.nguon ? xbDong(g, o.nguon, fs * 0.72, W - 2 * le) : [], cuoi = nguon.length ? nguon.length * fs * 1.05 + fs * 0.5 : 0;
  let cot = 0; const co = o.nhan !== "khong" && n > 0, dan = fs * 2.6;   // cột nhãn
  if (co) { P.lat.forEach(Lt => { cot = Math.max(cot, xbDo(g, Lt.ten, fs, true)); if (Lt.cg) Lt.cg.forEach(m => { cot = Math.max(cot, Math.min(W * 0.3, xbDo(g, String(m.ten), fs * 0.74) + fs * 1.8)); }); });
    cot = Math.min(W * 0.34, Math.max(fs * 5, cot + fs * 0.5)); }
  const rongVe = W - 2 * le - (co ? cot + dan : 0), caoVe = H - 2 * le - dau - cuoi, Hs = fh + (n > 1 ? (n - 1) * gap : 0) + day;
  const s = Math.max(1e-6, Math.min(rongVe / fw, caoVe / Math.max(1e-6, Hs)));
  const trai = le + (co && o.nhan === "trai" ? cot + dan : 0), cx = trai + (rongVe - fw * s) / 2 - bx0 * s;
  const yDay = le + dau + (caoVe + Hs * s) / 2, cyB = yDay - by1 * s - day * s;
  return {V, M, n, x0, x1, y0, y1, bx0, bx1, L, R, fw, fh, gap, day, s, cx, cyB, fs, le, dau, nguon, cot, dan, co, rongVe, caoVe};
}
function tgGhep(o, P, W, H, opt) {                  // -> canvas W × H; opt: {tach 0..1, hien [{a, dy}], c: canvas đích, coDinh, nhanh (xem chuyển động)}
  opt = opt || {};
  const c = opt.c || document.createElement("canvas"); if (c.width !== W) c.width = W; if (c.height !== H) c.height = H;
  const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  const toi = o.nen === "toi", chu = toi ? "#f2f4f7" : "#101828", phu = toi ? "#98a2b3" : "#475467", canh = toi ? "#334155" : "#c3c9d2";
  if (o.nen !== "trong") { g.fillStyle = TG_NEN[o.nen] || "#fff"; g.fillRect(0, 0, W, H); }
  const B = tgBoCuc(o, P, W, H, g, opt.coDinh), {V, M, n, s, cx, cyB, fs, L, R} = B, buoc = B.gap * (opt.tach == null ? 1 : opt.tach), day = B.day * s;
  const hien = i => (opt.hien && opt.hien[i]) || {a: 1, dy: 0}, roi = Math.max(B.gap * s * 1.6, H * 0.12);
  const lech = opt.tach != null ? (B.gap - buoc) * s * (n - 1) / 2 : 0;   // khi tách dần: khối tách đều từ giữa, không dồn xuống đáy
  const goc = i => cyB - lech - i * buoc * s, cy = i => goc(i) + hien(i).dy * roi, net = Math.max(1, fs * 0.075);
  const aNhan = opt.tach == null ? 1 : Math.max(0, Math.min(1, (opt.tach - 0.4) / 0.6));   // nhãn hiện dần khi các tầng đã tách
  if (!n) { xbChu(g, T("chưa có tầng nào: thêm tầng ở danh sách bên trái"), W / 2, H / 2, fs, "center", false, phu); c._tg = B; return c; }
  let iTren = n - 1; if (opt.hien) { iTren = -1; for (let i = 0; i < n; i++) if (hien(i).a >= 0.5) iTren = i; }
  if (o.gion && n > 1 && iTren >= 1) { g.save(); g.globalAlpha = opt.hien ? Math.min(1, hien(0).a) : 1; g.strokeStyle = phu; g.lineWidth = net; g.setLineDash([fs * 0.22, fs * 0.28]);   // đường gióng hai bên (dưới các tầng)
    [L, R].forEach(p => { g.beginPath(); g.moveTo(cx + p[0] * s, goc(iTren) + p[1] * s); g.lineTo(cx + p[0] * s, goc(0) + p[1] * s + day); g.stroke(); }); g.restore(); }
  P.lat.forEach((Lt, i) => {
    const y = cy(i), tam = Lt.nen !== "khong", a = Math.max(0, Math.min(1, hien(i).a)); if (a <= 0.001) return;
    g.save(); g.globalAlpha = a;
    if (i === 0 && o.bong) {
      if (opt.nhanh) { for (let j = 1; j <= 3; j++) { tgDuong(g, V, M, s, cx, y + day + B.fw * s * 0.008 * j); g.fillStyle = toi ? "rgba(0,0,0,.18)" : "rgba(15,23,42,.06)"; g.fill("evenodd"); } }
      else { g.save(); g.shadowColor = toi ? "rgba(0,0,0,.55)" : "rgba(15,23,42,.28)"; g.shadowBlur = B.fw * s * 0.045; g.shadowOffsetY = B.fw * s * 0.02;
        tgDuong(g, V, M, s, cx, y + day); g.fillStyle = canh; g.fill("evenodd"); g.restore(); } }
    if (day >= 1 && (tam || i === 0)) {              // thành tấm: chồng các lớp viền dịch xuống, chỉ ngoài mặt tấm (tấm mờ không lộ thành bên dưới)
      g.save(); g.beginPath(); g.rect(0, 0, W, H); tgDuong(g, V, M, s, cx, y, true); g.clip("evenodd"); g.fillStyle = canh;
      const b1 = Math.max(1, day / (opt.nhanh ? 10 : 24)); for (let j = day; j > 0; j -= b1) { tgDuong(g, V, M, s, cx, y + j); g.fill("evenodd"); }
      if (o.vien) { tgDuong(g, V, M, s, cx, y + day); g.strokeStyle = toi ? "#475569" : "#98a2b3"; g.lineWidth = net * 0.8; g.stroke(); } g.restore(); }
    if (tam || !Lt.c) { tgDuong(g, V, M, s, cx, y);
      g.fillStyle = !Lt.c ? (toi ? "rgba(51,65,85,.45)" : "rgba(226,232,240,.55)") : Lt.nen === "kinh" ? (toi ? "rgba(148,163,184,.16)" : "rgba(255,255,255,.3)")
        : Lt.nen === "mo" ? (toi ? "rgba(30,41,59,.55)" : "rgba(255,255,255,.62)") : (toi ? "#1e293b" : "#ffffff"); g.fill("evenodd"); }
    if (Lt.c) { g.save(); g.globalAlpha = a * Lt.op; g.setTransform(s * M[0], s * M[1], s * M[2], s * M[3], cx, y); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = opt.nhanh ? "medium" : "high";
      g.drawImage(Lt.c, -P.K.w / 2, -P.K.h / 2); g.restore(); }
    else xbChu(g, T("đang tải…"), cx, y, fs * 0.9, "center", false, phu);
    if (o.vien || !Lt.c) { tgDuong(g, V, M, s, cx, y); g.strokeStyle = toi ? "#94a3b8" : "#667085"; g.lineWidth = net; if (!Lt.c) g.setLineDash([fs * 0.3, fs * 0.25]); g.stroke(); g.setLineDash([]); }
    g.restore();
  });
  if (B.co) {                                        // nhãn: chấm ở mép tầng, đường dẫn ngang tới cột nhãn; dãn cách cho khỏi đè
    const phai = o.nhan !== "trai", p = phai ? R : L, xN = phai ? cx + (opt.coDinh ? B.bx1 : B.x1) * s + B.dan : cx + (opt.coDinh ? B.bx0 : B.x0) * s - B.dan;
    const kh = P.lat.map((Lt, i) => { const cg = Lt.cg ? tgCGDo(g, Lt.cg, fs, B.cot) : null; return {i, Lt, cg, a: aNhan * Math.max(0, Math.min(1, hien(i).a)), ax: cx + p[0] * s, ay: cy(i) + p[1] * s, h: fs * 1.25 + (cg ? cg.h + fs * 0.15 : 0)}; })
      .filter(k => k.a > 0.001);
    const tren = kh.slice().sort((a, b) => a.ay - b.ay); let day0 = -Infinity;
    tren.forEach(k => { k.y = Math.max(k.ay, day0 + fs * 0.62 + fs * 0.25); day0 = k.y - fs * 0.62 + k.h; });
    const vuot = day0 - (H - B.le - (B.nguon.length ? B.nguon.length * fs * 1.05 + fs * 0.5 : 0)); if (vuot > 0) tren.forEach(k => { k.y -= vuot; });
    tren.forEach(k => {
      g.save(); g.globalAlpha = k.a; g.strokeStyle = chu; g.fillStyle = chu; g.lineWidth = net; g.setLineDash([]);
      g.beginPath(); g.arc(k.ax, k.ay, Math.max(1.5, fs * 0.17), 0, 2 * Math.PI); g.fill();
      const xg = phai ? xN - fs * 0.4 : xN + fs * 0.4, xk = phai ? xg - fs * 1.1 : xg + fs * 1.1;
      g.beginPath(); g.moveTo(k.ax, k.ay); if (Math.abs(k.y - k.ay) > 0.5) { g.lineTo(xk, k.ay); g.lineTo(xg, k.y); } else g.lineTo(xg, k.y); g.stroke();
      xbChu(g, k.Lt.ten, xN, k.y, fs, phai ? "left" : "right", true, chu);
      if (k.cg) { let yy = k.y + fs * 0.62 + fs * 0.15 + k.cg.f * 0.68;
        k.cg.hang.forEach(hg => { const tong = hg.reduce((a, q) => a + q.w, 0); let xx = phai ? xN : xN - tong;
          hg.forEach(q => { const f = k.cg.f, o2 = f * 0.95;
            if (q.m.ramp) { const gr = g.createLinearGradient(xx, 0, xx + f * 2.6, 0); if (gr && gr.addColorStop) { q.m.ramp.forEach((m, j) => gr.addColorStop(j / Math.max(1, q.m.ramp.length - 1), m)); g.fillStyle = gr; } else g.fillStyle = q.m.ramp[0]; g.fillRect(xx, yy - o2 / 2, f * 2.6, o2); xx += f * 2.6; }
            else { g.fillStyle = q.m.mau || "#999"; if (q.m.kieu === "duong") g.fillRect(xx, yy - net, o2, net * 2); else if (q.m.kieu === "diem") { g.beginPath(); g.arc(xx + o2 / 2, yy, o2 * 0.35, 0, 2 * Math.PI); g.fill(); } else g.fillRect(xx, yy - o2 / 2, o2, o2); xx += o2; }
            xbChu(g, q.ten, xx + f * 0.35, yy, f, "left", false, phu); xx += q.w - (q.m.ramp ? f * 2.6 : o2); });
          yy += k.cg.f * 1.35; }); }
      g.restore();
    });
  }
  if (o.bac) { const v = [-M[2], -M[3]], d = Math.hypot(v[0], v[1]) || 1, ux = v[0] / d, uy = v[1] / d, dai = fs * 2.2;   // mũi tên bắc theo hướng đã xoay
    const ox = B.le + fs * 1.6, oy = H - B.le - (B.nguon.length ? B.nguon.length * fs * 1.05 + fs * 0.5 : 0) - fs * 2.4;
    g.save(); g.strokeStyle = chu; g.fillStyle = chu; g.lineWidth = net * 1.4;
    g.beginPath(); g.moveTo(ox - ux * dai / 2, oy - uy * dai / 2); g.lineTo(ox + ux * dai / 2, oy + uy * dai / 2); g.stroke();
    const hx = ox + ux * dai / 2, hy = oy + uy * dai / 2, px = -uy, py = ux;
    g.beginPath(); g.moveTo(hx + ux * fs * 0.2, hy + uy * fs * 0.2); g.lineTo(hx - ux * fs * 0.5 + px * fs * 0.35, hy - uy * fs * 0.5 + py * fs * 0.35); g.lineTo(hx - ux * fs * 0.5 - px * fs * 0.35, hy - uy * fs * 0.5 - py * fs * 0.35); g.closePath(); g.fill();
    g.restore(); xbChu(g, T("B"), hx + ux * fs * 0.85, hy + uy * fs * 0.85, fs * 0.95, "center", true, chu); }
  if (o.tieuDe) xbChu(g, o.tieuDe, B.le, B.le + fs * 1.0, fs * 1.5, "left", true, chu);
  if (o.phuDe) xbChu(g, o.phuDe, B.le, B.le + (o.tieuDe ? fs * 2.1 : 0) + fs * 0.7, fs * 1.02, "left", false, phu);
  B.nguon.forEach((d, i) => xbChu(g, d, B.le, H - B.le - (B.nguon.length - 1 - i) * fs * 1.05 - fs * 0.45, fs * 0.72, "left", false, phu));
  c._tg = B; return c;
}
function tgN(W, H) { return Math.max(600, Math.min(2600, Math.round(Math.max(W, H) * 0.8))); }   // cạnh dài của tấm khi xuất

/* ---------------- chuyển động ---------------- */
function tgEm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
function tgKhungDong(o, kieu, t, n) {               // tham số một khung ở thời điểm t ∈ [0, 1): {o (góc), tach, hien}
  const r = {o, tach: 1, hien: null}, xoay = x => Object.assign({}, o, {xoay: x});
  if (kieu === "tach") { r.tach = tgEm((t - 0.06) / 0.4); r.o = xoay(o.xoay - 24 * (1 - tgEm((t - 0.15) / 0.6))); }
  else if (kieu === "xoay") r.o = xoay(o.xoay + 360 * t);
  else if (kieu === "tach_xoay") { r.tach = tgEm(t / 0.22); r.o = xoay(o.xoay + 360 * tgEm((t - 0.22) / 0.78)); }
  else if (kieu === "lan_luot") { r.hien = Array.from({length: n}, (_, i) => { const u = tgEm((t - 0.04 - 0.62 * i / Math.max(1, n)) / 0.16); return {a: u, dy: -(1 - u)}; });
    r.o = xoay(o.xoay - 8 + 16 * tgEm(t)); }
  else if (kieu === "lac") r.o = xoay(o.xoay + 28 * Math.sin(2 * Math.PI * t));
  return r;
}
function tgNutChoi() { const b = tg$("tgChoi"), b2 = tg$("tgChoi2"); const s = TG.choi ? "■ " + T("Dừng xem") : "▶ " + T("Xem chuyển động"); if (b) b.textContent = s; if (b2) { b2.textContent = TG.choi ? "■" : "▶"; b2.title = s; } }
function tgChoi() {                                 // xem chuyển động ngay trong khung xem trước (lặp lại)
  if (TG.choi) { const r = TG.choi.raf; TG.choi = null; if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(r); tgNutChoi(); tgVeXem(); return; }
  TG.choi = {t0: performance.now(), raf: 0}; tgNutChoi();
  const buoc = () => { if (!TG.choi || !tg$("dlgTang").open) { TG.choi = null; tgNutChoi(); return; }
    if (TG.P) { const o = TG.o, t = ((performance.now() - TG.choi.t0) / (Math.max(2, +o.giay || 10) * 1000)) % 1, k = tgKhungDong(o, o.kieuDong, t, TG.P.lat.length), [w, h] = tgNhoXem();
      try { tgGhep(k.o, TG.P, w, h, {c: tg$("tgXem"), tach: k.tach, hien: k.hien, coDinh: true, nhanh: true}); } catch (e) { /* bỏ khung lỗi */ } }
    TG.choi.raf = requestAnimationFrame(buoc); };
  buoc();
}

/* ---------------- danh sách tầng ---------------- */
function tgNhuManHinh() { TG.tang = xbDS().filter(d => d.k !== "nhan" && d.man()).map(d => tgTangMoi(d)); }   // các lớp đang hiện, ảnh nền ở đáy
function tgTheoNam(k) {                             // một lớp nhiều năm: mỗi năm một tầng, năm đầu ở đáy
  const d = xbDS().find(q => q.k === k); if (!d || !Array.isArray(d.nam)) return false;
  const ys = d.nam.filter(y => y > 0).sort((a, b) => a - b); if (ys.length < 2) return false;
  const mau = (TG.tang || []).find(t => t.k === k && t.v);   // giữ tổ hợp kênh đang chọn cho lớp này
  TG.tang = ys.map(y => Object.assign(tgTangMoi(d, y), {nhan: String(y), nen: "trang"}, mau ? {v: Object.assign({}, mau.v)} : {})); return true;
}
function tgNhomTen(nh) { return T({nen: "Ảnh nền", du_lieu: "Lớp dữ liệu", ket_qua: "Kết quả", vecto: "Véc tơ, ranh giới, điểm"}[nh] || "khác"); }
function tgOpLop(ds, k) {
  const nh = ["nen", "du_lieu", "ket_qua", "vecto"];
  return nh.map(n => { const q = ds.filter(d => d.nhom === n); return q.length ? `<optgroup label="${esc(tgNhomTen(n))}">` + q.map(d => `<option value="${esc(d.k)}"${d.k === k ? " selected" : ""}>${esc(d.ten)}</option>`).join("") + "</optgroup>" : ""; }).join("");
}
function tgVeDS() {
  const el = tg$("tgDS"); if (!el) return; const ds = xbDS(), by = {}; ds.forEach(d => { by[d.k] = d; });
  TG.tang = (TG.tang || []).filter(t => by[t.k]); const n = TG.tang.length;
  TG.tang.forEach(t => { const loai = tgXemLoai(by[t.k]); if (loai && !t.v) t.v = tgXemMac(loai); });
  const nen = [["", T("tự động")], ["khong", T("không nền")], ["kinh", T("kính mờ")], ["mo", T("trắng mờ")], ["trang", T("nền đặc")]];
  el.innerHTML = TG.tang.map((t, i) => { const d = by[t.k], loai = tgXemLoai(d);
    return `<div class="tg-tang" data-i="${i}"><div class="tg-h"><b class="tg-so" title="${esc(T("tầng {i} (1 = đáy)", {i: i + 1}))}">${i + 1}</b><select data-f="k">${tgOpLop(ds, t.k)}</select>` +
      (d.nam && d.nam.some(y => y > 0) ? `<select data-f="nam" class="tg-nam">${d.nam.map(y => `<option value="${y}"${+t.nam === y ? " selected" : ""}>${y > 0 ? y : T("không theo năm")}</option>`).join("")}</select>` : "") +
      (d.md ? `<select data-f="md">${d.md.map(([v, s]) => `<option value="${esc(v)}"${t.md === v ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>` : "") + `</div>` +
      (loai ? `<div class="tg-h tg-x" title="${esc(T("cách hiển thị riêng của tầng này (không đổi bản đồ đang xem)"))}">${tgXemUI(loai, t.v)}</div>` : "") +
      `<div class="tg-h"><input data-f="nhan" type="text" value="${esc(t.nhan || "")}" placeholder="${esc(tgTen(t, d))}" title="${esc(T("nhãn của tầng (để trống: tên lớp)"))}">` +
      `<select data-f="nen" title="${esc(T("nền của tấm"))}">${nen.map(([v, s]) => `<option value="${v}"${(t.nen || "") === v ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>` +
      `<input data-f="op" type="range" min="0.1" max="1" step="0.05" value="${t.op != null ? t.op : 1}" title="${esc(T("độ đục"))}">` +
      `<button type="button" data-len title="${esc(T("lên trên"))}"${i === n - 1 ? " disabled" : ""}>↑</button><button type="button" data-xuong title="${esc(T("xuống dưới"))}"${i === 0 ? " disabled" : ""}>↓</button><button type="button" data-xoa title="${esc(T("bỏ tầng"))}">✕</button></div></div>`; })
    .reverse().join("") || `<div class="mu sm">${esc(T("chưa có tầng nào: thêm tầng ở danh sách bên trái"))}</div>`;
  const nl = tg$("tgNamLop"), cu = nl.value, nhieu = ds.filter(d => Array.isArray(d.nam) && d.nam.filter(y => y > 0).length > 1);
  nl.innerHTML = nhieu.map(d => `<option value="${esc(d.k)}">${esc(d.ten)} (${d.nam.filter(y => y > 0).length} ${esc(T("năm"))})</option>`).join(""); if (nhieu.some(d => d.k === cu)) nl.value = cu;
  nl.parentElement.hidden = !nhieu.length;
}
function tgSuaDS(e) {                               // sửa một tầng từ danh sách
  const r = e.target.closest(".tg-tang"); if (!r) return; const i = +r.dataset.i, t = TG.tang[i]; if (!t) return; const f = e.target.dataset.f, x = e.target.dataset.x;
  if (x) {                                           // tổ hợp kênh, chỉ số, tương phản của tầng
    const d = xbDS().find(q => q.k === t.k), loai = tgXemLoai(d); if (!loai) return; t.v = t.v || tgXemMac(loai);
    t.v[x] = /^(r|g|b)$/.test(x) && loai === "s2d" ? +e.target.value : x === "gain" ? +e.target.value : e.target.value;
    if (x === "pre") { const P0 = loai === "s2d" ? S2_PRE : LS_PRE; if (P0[t.v.pre]) [t.v.r, t.v.g, t.v.b] = P0[t.v.pre]; }
    if (/^(r|g|b)$/.test(x)) t.v.pre = "tu";
    if (x !== "gain") tgVeDS(); tgLuu(); tgCapNhat(true); return;
  }
  if (!f) return;
  if (f === "k") { const d = xbDS().find(q => q.k === e.target.value); if (!d) return; TG.tang[i] = Object.assign(tgTangMoi(d), {nen: t.nen, op: t.op}); tgVeDS(); tgCapNhat(true); }
  else if (f === "nam") { t.nam = +e.target.value; tgVeDS(); tgCapNhat(true); }
  else if (f === "md") { t.md = e.target.value; tgVeDS(); tgCapNhat(true); }
  else if (f === "nhan") { t.nhan = e.target.value.trim(); tgCapNhatTen(); }
  else if (f === "nen") { t.nen = e.target.value; tgCapNhatTen(); }
  else if (f === "op") { t.op = +e.target.value; tgCapNhatTen(); }
  tgLuu();
}
function tgCapNhatTen() {                           // đổi nhãn, nền, độ đục: không dựng lại tầng, chỉ ghép
  if (TG.P) { const by = tgBy(); TG.P.lat.forEach(L => { if (!L.t) return; const d = by[L.t.k]; L.ten = L.t.nhan || tgTen(L.t, d); L.nen = tgNen(L.t, d); L.op = L.t.op != null ? +L.t.op : 1; }); }
  tgVeXem();
}

/* ---------------- hộp thoại ---------------- */
(function () {
  if (tg$("dlgTang")) return;
  const st = document.createElement("style");
  st.textContent = `#dlgTang{width:min(1280px,97vw);max-width:none;max-height:94vh}
    #dlgTang .tg-bo{display:grid;grid-template-columns:minmax(300px,400px) minmax(0,1fr);gap:14px;align-items:start}
    #dlgTang.tg-to .tg-bo{grid-template-columns:0 minmax(0,1fr)}#dlgTang.tg-to .tg-trai{display:none}
    #dlgTang .tg-phai{position:sticky;top:3.4em}
    #dlgTang .vg-o{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;align-items:center;margin:4px 0}
    #dlgTang .vg-o select,#dlgTang .vg-o input[type=text]{max-width:100%;min-width:0;box-sizing:border-box}
    #dlgTang details{border-top:1px solid #eef0f3;margin-top:4px;padding-top:3px}#dlgTang summary{cursor:pointer;font-weight:600}
    #dlgTang .tg-gt{display:flex;gap:6px;align-items:center}#dlgTang .tg-gt input{flex:1;min-width:0}#dlgTang .tg-gt b{min-width:3.6em;text-align:right;font-size:12px}
    #tgXem{width:100%;height:auto;display:block;border:1px solid #e4e7ec;border-radius:6px;cursor:grab;background:repeating-conic-gradient(#f2f4f7 0 25%,#fff 0 50%) 0 0/16px 16px;touch-action:none}
    .tg-cong{display:flex;gap:6px;align-items:center;margin-bottom:4px}.tg-cong button{padding:2px 9px}
    #tgTien{height:3px;background:#eef2f6;border-radius:2px;overflow:hidden;margin:0 0 4px}#tgTien i{display:block;height:100%;width:0;background:#0b63ce;transition:width .2s}
    #tgDS{display:flex;flex-direction:column;gap:4px;margin:4px 0}
    .tg-tang{border:1px solid #e4e7ec;border-radius:6px;padding:3px 4px;background:#fcfcfd}
    .tg-h{display:flex;gap:3px;align-items:center;margin:2px 0}.tg-h select{min-width:0;flex:1 1 0;max-width:100%}.tg-h input[type=text]{flex:1 1 0;min-width:0}
    .tg-h select.tg-nam{flex:0 0 auto}.tg-x{flex-wrap:wrap;background:#f5f8ff;border-radius:4px;padding:2px}.tg-x .tg-rgb{display:flex;gap:2px;align-items:center;font-size:11px}
    .tg-x .tg-rgb select{flex:0 0 auto;max-width:76px}
    .tg-h input[type=range]{width:64px}.tg-h button{padding:1px 6px}
    .tg-so{display:inline-block;min-width:1.5em;text-align:center;background:#eef4ff;color:#1d4ed8;border-radius:4px;font-size:11px}
    #tgChonTamP{position:absolute;inset:0;z-index:2500;cursor:crosshair;background:rgba(11,99,206,.06)}
    #tgChonTamP span{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:#0b63ce;color:#fff;padding:6px 10px;border-radius:6px;font-size:13px}
    @media (max-width:760px){#dlgTang .tg-bo{grid-template-columns:1fr}#dlgTang .tg-phai{position:static}}`;
  document.head.appendChild(st);
  document.body.insertAdjacentHTML("beforeend", `<dialog id="dlgTang" data-noi18n>
  <div class="dlg-dau"><div class="row" style="margin:0"><h3 style="margin:0 8px 0 0" data-t="tieu"></h3><span class="mu sm" id="tgTT"></span><span style="margin-left:auto"></span><button id="tgDongX" type="button">×</button></div>
    <div id="tgTien"><i></i></div></div>
  <div class="tg-bo"><div class="tg-trai">
    <details open><summary data-t="pv"></summary>
      <div class="vg-o"><span data-t="vung"></span><select id="tgVung"></select><span data-t="hinh"></span><select id="tgHinh"></select>
        <span data-t="tam" data-hh></span><span data-hh style="display:flex;gap:4px"><select id="tgTam" style="flex:1;min-width:0"></select><button id="tgChonTam" type="button">📍</button></span>
        <span data-t="bk" data-hh></span><span data-hh><input id="tgR" type="number" min="0" step="0.1" style="width:90px"> km</span></div>
      <label data-rg><input type="checkbox" id="tgDao"> <span data-t="dao"></span></label>
    </details>
    <details open><summary data-t="tang"></summary>
      <div class="row"><button id="tgThem" type="button"></button><button id="tgMan" type="button"></button><button id="tgXoaHet" type="button"></button></div>
      <div class="row"><select id="tgNamLop" style="flex:1;min-width:0"></select><button id="tgTheoNam" type="button"></button></div>
      <div id="tgDS"></div>
      <label><input type="checkbox" id="tgTongHop"> <span data-t="tonghop"></span></label>
    </details>
    <details open><summary data-t="kieu"></summary>
      <div class="vg-o"><span data-t="mau"></span><select id="tgMau"></select>
        <span data-t="xoay"></span><span class="tg-gt"><input id="tgXoay" type="range" min="-180" max="180" step="1"><b id="tgXoayV"></b></span>
        <span data-t="nghieng"></span><span class="tg-gt"><input id="tgNghieng" type="range" min="10" max="90" step="1"><b id="tgNghiengV"></b></span>
        <span data-t="gian"></span><span class="tg-gt"><input id="tgGian" type="range" min="0" max="1.6" step="0.01"><b id="tgGianV"></b></span>
        <span data-t="day"></span><span class="tg-gt"><input id="tgDay" type="range" min="0" max="0.06" step="0.002"><b id="tgDayV"></b></span>
        <span data-t="nen"></span><select id="tgNen"></select>
        <span data-t="nhan"></span><select id="tgNhan"></select>
        <span data-t="chu"></span><span><input id="tgChu" type="number" min="5" max="40" step="0.5" style="width:64px"></span></div>
      <div class="row" style="flex-wrap:wrap"><label><input type="checkbox" id="tgVien"> <span data-t="vien"></span></label><label><input type="checkbox" id="tgGion"> <span data-t="gion"></span></label>
        <label><input type="checkbox" id="tgBong"> <span data-t="bong"></span></label><label><input type="checkbox" id="tgBac"> <span data-t="bac"></span></label><label><input type="checkbox" id="tgCG"> <span data-t="cg"></span></label></div>
      <div class="vg-o"><span data-t="td"></span><input id="tgTieuDe" type="text"><span data-t="pd"></span><input id="tgPhuDe" type="text"><span data-t="ng"></span><input id="tgNguon" type="text"></div>
    </details>
    <details open><summary data-t="xuat"></summary>
      <div class="vg-o"><span data-t="kho"></span><select id="tgKho"></select><span data-t="co"></span><span><input id="tgW" type="number" min="200" max="8000" style="width:76px"> × <input id="tgH" type="number" min="200" max="8000" style="width:76px"> px</span>
        <span data-t="dd"></span><select id="tgDD"><option value="png">PNG</option><option value="jpg">JPEG</option></select></div>
    </details>
    <details open><summary data-t="vid"></summary>
      <div class="vg-o"><span data-t="kdong"></span><select id="tgKieuDong"></select>
        <span data-t="tluong"></span><span><select id="tgGiay"><option>6</option><option>10</option><option>15</option><option>20</option><option>30</option></select> s ·
          <select id="tgFps"><option value="24">24</option><option value="30">30</option><option value="60">60</option></select> <span data-t="khs"></span></span>
        <span data-t="vdd"></span><select id="tgVidDD"><option value="mp4">MP4 (H.264)</option><option value="webm">WebM (VP9)</option></select></div>
      <div class="row"><button id="tgChoi" type="button"></button></div>
    </details>
  </div><div class="tg-phai"><div class="tg-cong"><button id="tgChoi2" type="button">▶</button><button id="tgPhong" type="button">⛶</button><span class="mu sm" data-t="keo"></span></div>
    <canvas id="tgXem" width="10" height="10"></canvas></div></div>
  <div class="row dlg-nut"><button id="tgXemBtn" type="button"></button><button id="tgXuat" type="button" class="on"></button><button id="tgVid" type="button"></button><button id="tgDong" type="button"></button></div>
</dialog>`);
  const xb = tg$("bXB"); if (xb && !tg$("bTang")) xb.insertAdjacentHTML("afterend", `<button id="bTang" type="button" data-noi18n></button>`);
  tgChu();
  tg$("bTang").onclick = () => tgMo();
  tg$("tgDong").onclick = tg$("tgDongX").onclick = () => tg$("dlgTang").close();
  tg$("dlgTang").addEventListener("close", () => { if (TG.choi) tgChoi(); });
  tg$("tgDS").addEventListener("change", tgSuaDS);
  tg$("tgDS").addEventListener("input", e => { if (e.target.dataset.f === "op" || e.target.dataset.f === "nhan") tgSuaDS(e); });
  tg$("tgDS").addEventListener("click", e => {
    const r = e.target.closest(".tg-tang"); if (!r || e.target.tagName !== "BUTTON") return; const i = +r.dataset.i, A = TG.tang;
    if ("xoa" in e.target.dataset) A.splice(i, 1);
    else if ("len" in e.target.dataset && i < A.length - 1) [A[i], A[i + 1]] = [A[i + 1], A[i]];
    else if ("xuong" in e.target.dataset && i > 0) [A[i], A[i - 1]] = [A[i - 1], A[i]];
    else return;
    tgLuu(); tgVeDS(); tgCapNhat(true);
  });
  tg$("tgThem").onclick = () => { const ds = xbDS(), co = new Set((TG.tang || []).map(t => t.k)), d = ds.find(q => !co.has(q.k) && q.nhom === "vecto") || ds.find(q => !co.has(q.k)) || ds[0]; if (!d) return;
    (TG.tang = TG.tang || []).push(tgTangMoi(d)); tgLuu(); tgVeDS(); tgCapNhat(true); };
  tg$("tgMan").onclick = () => { tgNhuManHinh(); tgLuu(); tgVeDS(); tgCapNhat(true); };
  tg$("tgXoaHet").onclick = () => { TG.tang = []; tgLuu(); tgVeDS(); tgCapNhat(true); };
  tg$("tgTheoNam").onclick = () => { if (tgTheoNam(tg$("tgNamLop").value)) { tgLuu(); tgVeDS(); tgCapNhat(true); } };
  const lai = ["tgVung", "tgHinh", "tgTam", "tgR", "tgDao", "tgTongHop", "tgCG"], ghep = ["tgXoay", "tgNghieng", "tgGian", "tgDay", "tgNen", "tgNhan", "tgChu", "tgVien", "tgGion", "tgBong", "tgBac", "tgTieuDe", "tgPhuDe", "tgNguon", "tgKho", "tgW", "tgH"];
  lai.forEach(id => tg$(id).addEventListener("change", () => { tgDoc(); tgHienHinh(); tgCapNhat(true); }));
  ghep.forEach(id => tg$(id).addEventListener("input", () => { if (id === "tgW" || id === "tgH") tg$("tgKho").value = "tu"; if (/^tg(Xoay|Nghieng|Gian|Day|Nen|Vien|Gion|Bong)$/.test(id)) tg$("tgMau").value = "";
    tgDoc(); if (id === "tgNhan" || id === "tgChu" || id === "tgTieuDe" || id === "tgPhuDe" || id === "tgNguon" || id === "tgW" || id === "tgH" || id === "tgKho") tgCapNhatTen(); else tgVeXem(); }));
  tg$("tgKho").addEventListener("change", () => { const q = TG_KHO[tg$("tgKho").value]; if (q && q[0]) { tg$("tgW").value = q[0]; tg$("tgH").value = q[1]; } tgDoc(); tgVeXem(); });
  tg$("tgMau").addEventListener("change", () => { const m = TG_MAU[tg$("tgMau").value]; if (!m) return; Object.assign(TG.o, m[1], {mau: tg$("tgMau").value}); tgLuu(); tgHien(); tgVeXem(); });
  ["tgDD", "tgKieuDong", "tgGiay", "tgFps", "tgVidDD"].forEach(id => tg$(id).addEventListener("change", () => tgDoc()));
  tg$("tgChonTam").onclick = tgChonTam;
  tg$("tgXemBtn").onclick = () => tgCapNhat(true, true);
  tg$("tgXuat").onclick = () => tgXuat();
  tg$("tgVid").onclick = () => tgXuatVideo();
  tg$("tgChoi").onclick = tg$("tgChoi2").onclick = () => tgChoi();
  tg$("tgPhong").onclick = () => { tg$("dlgTang").classList.toggle("tg-to"); tg$("tgPhong").title = tg$("dlgTang").classList.contains("tg-to") ? T("thu khung xem") : T("phóng to khung xem"); tgVeXem(); };
  const cv = tg$("tgXem"); let k0 = null;                    // kéo trên ảnh xem trước: ngang xoay, dọc nghiêng
  cv.addEventListener("pointerdown", e => { k0 = {x: e.clientX, y: e.clientY, xoay: TG.o.xoay, ng: TG.o.nghieng}; cv.style.cursor = "grabbing"; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* jsdom */ } });
  cv.addEventListener("pointermove", e => { if (!k0) return; let a = k0.xoay + (e.clientX - k0.x) * 0.45; a = ((a + 180) % 360 + 360) % 360 - 180;
    TG.o.xoay = Math.round(a); TG.o.nghieng = Math.round(Math.max(10, Math.min(90, k0.ng - (e.clientY - k0.y) * 0.3))); tg$("tgMau").value = ""; tgHien(true); tgVeXem(); });
  const tha = () => { if (k0) { k0 = null; cv.style.cursor = "grab"; tgLuu(); } };
  cv.addEventListener("pointerup", tha); cv.addEventListener("pointercancel", tha); cv.addEventListener("pointerleave", tha);
})();
function tgChu() {                                  // chữ theo ngôn ngữ
  const w = tg$("dlgTang"); if (!w) return; const t = (k, s) => w.querySelectorAll(`[data-t="${k}"]`).forEach(e => { e.textContent = s; });
  t("tieu", T("Sơ đồ lớp xếp tầng")); t("pv", T("Phạm vi và hình cắt")); t("vung", T("Vùng")); t("hinh", T("Hình")); t("tam", T("Tâm")); t("bk", T("Bán kính"));
  t("dao", T("bỏ các mảnh nhỏ ở xa (đảo xa bờ)")); t("tang", T("Các tầng (trên cùng ở đầu danh sách)")); t("tonghop", T("thêm tầng đáy tổng hợp (mọi tầng chồng lên nhau)"));
  t("kieu", T("Góc nhìn và kiểu")); t("mau", T("Mẫu trình bày")); t("xoay", T("Xoay")); t("nghieng", T("Góc nhìn")); t("gian", T("Khoảng cách tầng")); t("day", T("Độ dày tấm")); t("nen", T("Nền ảnh"));
  t("nhan", T("Nhãn")); t("chu", T("Cỡ chữ")); t("vien", T("viền tấm")); t("gion", T("đường gióng")); t("bong", T("bóng đổ")); t("bac", T("mũi tên bắc")); t("cg", T("chú giải nhỏ cạnh nhãn"));
  t("td", T("Tiêu đề")); t("pd", T("Phụ đề")); t("ng", T("Nguồn, ghi chú")); t("xuat", T("Ảnh tĩnh")); t("kho", T("Khổ")); t("co", T("Cỡ")); t("dd", T("Định dạng"));
  t("vid", T("Video")); t("kdong", T("Chuyển động")); t("tluong", T("Thời lượng")); t("khs", T("khung/giây")); t("vdd", T("Định dạng"));
  t("keo", T("Kéo chuột trên hình: sang ngang để xoay, lên xuống để đổi góc nhìn."));
  const op = (id, ds, v) => { const e = tg$(id); e.innerHTML = ds.map(([x, s]) => `<option value="${esc(x)}">${esc(s)}</option>`).join(""); if (v != null) e.value = String(v); };
  op("tgHinh", TG_HINH.map(([v, s]) => [v, T(s)]), TG.o.hinh);
  op("tgTam", [["vung", T("giữa vùng")], ["nhin", T("giữa khung nhìn")], ["diem", T("điểm chọn trên bản đồ")]], TG.o.tam);
  op("tgNen", [["trang", T("trắng")], ["xam", T("xám nhạt")], ["giay", T("màu giấy")], ["toi", T("tối")], ["trong", T("trong suốt (PNG)")]], TG.o.nen);
  op("tgNhan", [["phai", T("bên phải")], ["trai", T("bên trái")], ["khong", T("không")]], TG.o.nhan);
  op("tgKho", Object.entries(TG_KHO).map(([k, q]) => [k, T(q[2])]), TG.o.kho);
  op("tgMau", [["", T("tự chỉnh")]].concat(Object.entries(TG_MAU).map(([k, q]) => [k, T(q[0])])), TG.o.mau || "");
  op("tgKieuDong", TG_DONG.map(([v, s]) => [v, T(s)]), TG.o.kieuDong);
  tg$("tgVidDD").options[0].textContent = "MP4 (H.264) · " + T("PowerPoint, Word, web"); tg$("tgVidDD").options[1].textContent = "WebM (VP9)";
  tg$("tgThem").textContent = "+ " + T("Thêm tầng"); tg$("tgMan").textContent = T("Như bản đồ đang xem"); tg$("tgXoaHet").textContent = T("Bỏ hết");
  tg$("tgTheoNam").textContent = "⇶ " + T("mỗi năm một tầng"); tg$("tgTheoNam").title = T("lớp có nhiều năm: dựng mỗi năm một tầng, năm đầu ở đáy");
  tg$("tgChonTam").title = T("nhấp lên bản đồ để đặt tâm hình"); tg$("tgPhong").title = T("phóng to khung xem");
  tg$("tgXemBtn").textContent = T("Dựng lại"); tg$("tgXuat").textContent = T("Xuất ảnh"); tg$("tgDong").textContent = T("Đóng");
  tg$("tgVid").textContent = TG.ma ? "■ " + T("Dừng xuất video") : "🎬 " + T("Xuất video"); tg$("tgVid").title = T("dựng video chính xác từng khung theo kiểu chuyển động đã chọn");
  tgNutChoi();
  const b = tg$("bTang"); if (b) { b.textContent = "🧱 " + T("Xếp tầng"); b.title = T("Sơ đồ lớp xếp tầng: tách các lớp đã chọn thành từng tầng nhìn nghiêng, cắt theo ranh giới vùng, xã, tỉnh hoặc hình tròn, vuông…; xuất ảnh, ảnh động"); }
  tg$("tgR").placeholder = T("tự động");
}
function tgVeVung() {                               // ô chọn vùng: nhóm vùng và nhóm xã
  const s = tg$("tgVung"), ds = tgVungDS(), nh = (g, ten) => { const q = ds.filter(x => x[2] === g); return q.length ? `<optgroup label="${esc(ten)}">` + q.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("") + "</optgroup>" : ""; };
  s.innerHTML = nh("v", T("Vùng")) + nh("x", T("Xã, phường"));
  s.value = ds.some(q => q[0] === TG.o.vung) ? TG.o.vung : "nhin"; TG.o.vung = s.value;
}
function tgHienHinh() {                             // ẩn hiện ô tâm, bán kính theo hình
  const rg = TG.o.hinh === "ranh"; tg$("dlgTang").querySelectorAll("[data-hh]").forEach(e => { e.hidden = rg; }); tg$("dlgTang").querySelectorAll("[data-rg]").forEach(e => { e.hidden = !rg; });
  if (!rg) { try { tg$("tgR").placeholder = T("tự động") + ": " + tgRTu(TG.o).toFixed(1); } catch (e) { /* chưa có vùng */ } }
}
function tgGiaTri() { const o = TG.o; tg$("tgXoayV").textContent = o.xoay + "°"; tg$("tgNghiengV").textContent = o.nghieng + "°"; tg$("tgGianV").textContent = "×" + (+o.gian).toFixed(2); tg$("tgDayV").textContent = (100 * o.day).toFixed(1) + " %"; }
function tgHien(chiGoc) {                           // đổ giá trị vào hộp thoại
  const o = TG.o, v = (id, x) => { tg$(id).value = x; }, c = (id, x) => { tg$(id).checked = !!x; };
  v("tgXoay", o.xoay); v("tgNghieng", o.nghieng); tgGiaTri(); if (chiGoc) return;
  tgVeVung(); v("tgHinh", o.hinh); v("tgTam", o.tam); v("tgR", o.R > 0 ? o.R : ""); c("tgDao", o.dao); c("tgTongHop", o.tongHop);
  v("tgGian", o.gian); v("tgDay", o.day); v("tgNen", o.nen); v("tgNhan", o.nhan); v("tgChu", o.chu); v("tgMau", o.mau || "");
  c("tgVien", o.vien); c("tgGion", o.gion); c("tgBong", o.bong); c("tgBac", o.bac); c("tgCG", o.cg);
  v("tgTieuDe", o.tieuDe); v("tgPhuDe", o.phuDe); v("tgNguon", o.nguon); v("tgKho", o.kho); v("tgW", o.w); v("tgH", o.h); v("tgDD", o.dd);
  v("tgKieuDong", o.kieuDong); v("tgGiay", o.giay); v("tgFps", o.fps); v("tgVidDD", o.vid); tgGiaTri();
  tgHienHinh(); tgVeDS();
}
function tgDoc() {                                  // đọc hộp thoại -> TG.o
  const o = TG.o, v = id => tg$(id).value, c = id => tg$(id).checked;
  Object.assign(o, {vung: v("tgVung") || "nhin", hinh: v("tgHinh"), tam: v("tgTam"), R: +v("tgR") || 0, dao: c("tgDao"), tongHop: c("tgTongHop"),
    xoay: +v("tgXoay"), nghieng: +v("tgNghieng"), gian: +v("tgGian"), day: +v("tgDay"), nen: v("tgNen"), nhan: v("tgNhan"), chu: +v("tgChu") || 12, mau: v("tgMau"),
    vien: c("tgVien"), gion: c("tgGion"), bong: c("tgBong"), bac: c("tgBac"), cg: c("tgCG"), tieuDe: v("tgTieuDe"), phuDe: v("tgPhuDe"), nguon: v("tgNguon"),
    kho: v("tgKho"), w: Math.max(200, Math.min(8000, +v("tgW") || 1920)), h: Math.max(200, Math.min(8000, +v("tgH") || 1080)), dd: v("tgDD"),
    kieuDong: v("tgKieuDong") || "tach_xoay", giay: +v("tgGiay") || 10, fps: +v("tgFps") || 30, vid: v("tgVidDD") || "mp4"});
  tgGiaTri(); tgLuu(); return o;
}
function tgTT(s, p) { tg$("tgTT").textContent = s; const b = tg$("tgTien").firstElementChild; b.style.width = p == null ? "0" : Math.round(100 * Math.max(0, Math.min(1, p))) + "%"; }
function tgDpr() { return Math.max(1, Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1)); }
function tgNhoXem() {                               // cỡ ảnh xem trước theo tỉ lệ khổ xuất
  const rong = Math.max(320, Math.min(1600, (tg$("tgXem").parentElement.clientWidth || 700))), o = TG.o;
  const k = tgDpr(); return [Math.round(rong * k), Math.round(rong * k * o.h / o.w)];
}
function tgVeXem() {                                // ghép lại xem trước (nhanh, gộp các yêu cầu trong một khung hình)
  if (TG._raf || TG.choi) return;
  TG._raf = (typeof requestAnimationFrame === "function" ? requestAnimationFrame : f => setTimeout(f, 16))(() => {
    TG._raf = null; if (!TG.P || TG.choi) return; const [w, h] = tgNhoXem();
    try { tgGhep(TG.o, TG.P, w, h, {c: tg$("tgXem")}); } catch (e) { tgTT(T("lỗi: ") + (e.message || e)); return; }
    if (!TG.P.xong) return;
    const P = TG.P, th = P.thieu.length ? " " + T("Không lấy được: {l} (máy chủ không cho tải chéo hoặc không có ô ảnh).", {l: P.thieu.join(", ")}) : "";
    if (!TG.ma) tgTT(T("{n} tầng · {t}", {n: P.lat.length, t: P.G.ten}) + (P.G.km ? " · R = " + P.G.km.toFixed(1) + " km" : "") + th);
  });
}
async function tgCapNhat(lai, ep) {                 // lai: dựng lại các tầng (đổi lớp, năm, hình, tổ hợp kênh); không thì chỉ ghép lại
  if (!lai && TG.P) { tgVeXem(); return; }
  const tok = ++TG.tokD;
  clearTimeout(TG.hen); await new Promise(ok => { TG.hen = setTimeout(ok, ep ? 0 : 150); }); if (tok !== TG.tokD) return;
  const [w, h] = tgNhoXem();
  try { await tgChuan(TG.o, Math.round(Math.min(1400, 700 * tgDpr())), (s, p) => { if (tok === TG.tokD && !TG.ma) tgTT(s, p); }, w, h, P => { if (tok !== TG.tokD) return; TG.P = P; tgVeXem(); }); }
  catch (e) { if (tok === TG.tokD) tgTT(T("lỗi: ") + (e.message || e)); }
}
function tgMo() {
  const d = tg$("dlgTang");
  if (!TG.tang || !TG.tang.length || !TG.tang.some(t => xbDS().some(q => q.k === t.k))) tgNhuManHinh();
  tgChu(); tgHien();
  if (!d.open) d.showModal ? d.showModal() : d.show();
  tgCapNhat(true, true);
}
function tgChonTam() {                              // nhấp lên bản đồ để đặt tâm (lớp phủ chặn nhấp để không kích hoạt việc khác của bản đồ)
  const d = tg$("dlgTang"); d.close();
  const box = map.getContainer(), p = document.createElement("div"); p.id = "tgChonTamP"; p.innerHTML = `<span>${esc(T("Nhấp lên bản đồ để đặt tâm hình (Esc: thôi)"))}</span>`;
  const xong = ll => { p.remove(); document.removeEventListener("keydown", phim, true);
    if (ll) { TG.tamDiem = CORE.to3857(ll.lng, ll.lat); ls("laymau_hp_tang_tam_v1", TG.tamDiem); TG.o.tam = "diem"; if (TG.o.hinh === "ranh") TG.o.hinh = "tron"; }
    tgHien(); if (!d.open) d.showModal ? d.showModal() : d.show(); tgCapNhat(true, true); };
  const phim = e => { if (e.key === "Escape") { e.preventDefault(); xong(null); } };
  p.addEventListener("click", e => { e.stopPropagation(); xong(map.mouseEventToLatLng(e)); });
  document.addEventListener("keydown", phim, true); box.appendChild(p);
}

/* ---------------- xuất ---------------- */
function tgTenTep(o, P, W, H, duoi) { return `xep_tang_${v28TenTep(P.G.ten || "vung")}_${P.lat.length}tang_${W}x${H}_${stamp()}.${duoi}`; }
function tgLoi(e) { return /tainted|insecure|SecurityError/i.test(String(e && (e.name + e.message))) ? T("một lớp ảnh không cho tải chéo nên trình duyệt chặn xuất: tắt lớp đó hoặc đổi ảnh nền rồi thử lại") : (e && e.message) || String(e); }
async function tgXuat() {                           // ảnh PNG / JPEG theo khổ chọn
  const tok = ++TG.tokX, o = Object.assign({}, tgDoc()), W = o.w, H = o.h, tt = (s, p) => { if (tok === TG.tokX) tgTT(s, p); };
  try {
    if (W * H > 64e6) throw new Error(T("ảnh quá lớn ({w} × {h} điểm ảnh): giảm khổ hoặc độ phân giải", {w: W, h: H}));
    const P = await tgChuan(o, tgN(W, H), tt, W, H); if (tok !== TG.tokX) return;
    if (!P.lat.length) throw new Error(T("chưa có tầng nào: thêm tầng ở danh sách bên trái"));
    tt(T("đang ghép ảnh…"), 0.95);
    const oo = o.dd === "jpg" && o.nen === "trong" ? Object.assign({}, o, {nen: "trang"}) : o, c = tgGhep(oo, P, W, H), dpi = /^a4/.test(o.kho) ? 300 : 150;
    const u8 = await xbBlob(c, o.dd === "jpg" ? "image/jpeg" : "image/png", 0.93), du = o.dd === "jpg" ? XH.jpegDpi(u8, dpi) : XH.pngDpi(u8, dpi);
    const ten = tgTenTep(o, P, W, H, o.dd === "jpg" ? "jpg" : "png"); v28Tai(ten, du, o.dd === "jpg" ? "image/jpeg" : "image/png");
    tt(T("đã xuất {f}: {w} × {h} điểm ảnh", {f: ten, w: W, h: H}) + (P.thieu.length ? " " + T("Không lấy được: {l} (máy chủ không cho tải chéo hoặc không có ô ảnh).", {l: P.thieu.join(", ")}) : ""));
    return {ten, du, c};
  } catch (e) { tt(T("lỗi: ") + tgLoi(e)); }
}
async function tgMaHoa(o, W, H, n, ve, tt, job) {   // WebCodecs: mã hoá từng khung (chính xác thời gian) rồi ghép MP4 / WebM -> {du, kieu, duoi}
  const fps = o.fps, br = Math.round(Math.min(50e6, Math.max(4e6, W * H * fps * 0.12)));
  const thu = o.vid === "webm" ? [] : [TGM.avcCodec(W, H), "avc1.4D0028", "avc1.42E028"].map(c => ({codec: c, mp4: true}));
  thu.push({codec: TGM.vp9Codec(W, H), mp4: false, id: "V_VP9"}, {codec: "vp8", mp4: false, id: "V_VP8"});
  let cf = null, chon = null;
  for (const q of thu) { const c = {codec: q.codec, width: W, height: H, bitrate: br, framerate: fps}; if (q.mp4) c.avc = {format: "avc"};
    try { const s = await VideoEncoder.isConfigSupported(c); if (s && s.supported) { cf = c; chon = q; break; } } catch (e) { /* thử codec khác */ } }
  if (!cf) throw new Error(T("trình duyệt không mã hoá được video ở cỡ {w} × {h}: chọn khổ nhỏ hơn", {w: W, h: H}));
  const mau = [], meta = {}; let loi = null;
  const enc = new VideoEncoder({output: (ch, md) => { const b = new Uint8Array(ch.byteLength); ch.copyTo(b); mau.push({b, ts: ch.timestamp, key: ch.type === "key"});
      const d = md && md.decoderConfig && md.decoderConfig.description; if (d && !meta.avcC) meta.avcC = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)); },
    error: e => { loi = e; }});
  enc.configure(cf);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  try {
    for (let i = 0; i < n; i++) {
      if (loi) throw loi; if (job.dung) throw new Error(T("đã dừng xuất video"));
      const k = ve(i / n); tgGhep(k.o, job.P, W, H, {c, tach: k.tach, hien: k.hien, coDinh: true});
      const f = new VideoFrame(c, {timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps)});
      enc.encode(f, {keyFrame: i % (fps * 2) === 0}); f.close();
      while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 4));
      if (i % 2 === 0) { tt(T("đang dựng video: khung {i}/{n}", {i: i + 1, n}), 0.3 + 0.68 * i / n); await new Promise(r => setTimeout(r, 0)); }
    }
    await enc.flush();
  } finally { try { enc.close(); } catch (e) { /* đã đóng */ } }
  if (loi) throw loi;
  if (chon.mp4) { if (!meta.avcC) throw new Error(T("trình duyệt không mã hoá được video ở cỡ {w} × {h}: chọn khổ nhỏ hơn", {w: W, h: H})); return {du: TGM.mp4(mau, meta.avcC, W, H, fps), kieu: "video/mp4", duoi: "mp4", codec: cf.codec}; }
  return {du: TGM.webm(mau, W, H, fps, chon.id), kieu: "video/webm", duoi: "webm", codec: cf.codec};
}
async function tgGhiMR(o, W, H, n, ve, tt, job) {   // dự phòng (trình duyệt chưa có WebCodecs): MediaRecorder, đưa từng khung theo nhịp thời gian thật
  const c = document.createElement("canvas"); c.width = W; c.height = H; const st = c.captureStream(0), tr = st.getVideoTracks()[0];
  const kieu = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(m => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(m)) || "video/webm";
  const rec = new MediaRecorder(st, {mimeType: kieu, videoBitsPerSecond: 8e6}), phan = [], dung = new Promise(ok => { rec.onstop = ok; });
  rec.ondataavailable = e => { if (e.data && e.data.size) phan.push(e.data); }; rec.start(250);
  const t0 = performance.now();
  for (let i = 0; i < n && !job.dung; i++) { const k = ve(i / n); tgGhep(k.o, job.P, W, H, {c, tach: k.tach, hien: k.hien, coDinh: true}); if (tr.requestFrame) tr.requestFrame();
    tt(T("đang dựng video: khung {i}/{n}", {i: i + 1, n}), 0.3 + 0.68 * i / n); const cho = t0 + (i + 1) * 1000 / o.fps - performance.now(); await new Promise(r => setTimeout(r, Math.max(0, cho))); }
  rec.stop(); await dung; if (job.dung) throw new Error(T("đã dừng xuất video"));
  return {du: new Blob(phan, {type: "video/webm"}), kieu: "video/webm", duoi: "webm", codec: "MediaRecorder"};
}
async function tgXuatVideo() {                      // video theo kiểu chuyển động, thời lượng, số khung/giây
  if (TG.ma) { TG.ma.dung = true; return; }
  const tok = ++TG.tokX, o = Object.assign({}, tgDoc()), tt = (s, p) => { if (tok === TG.tokX) tgTT(s, p); };
  const job = TG.ma = {dung: false, P: null}; tgChu();
  try {
    const coWC = typeof VideoEncoder === "function" && typeof VideoFrame === "function", coMR = typeof MediaRecorder !== "undefined" && HTMLCanvasElement.prototype.captureStream;
    if (!coWC && !coMR) throw new Error(T("trình duyệt này không quay được ảnh động (cần Chrome, Edge hoặc Firefox mới)"));
    const k = Math.min(1, 3840 / Math.max(o.w, o.h)), W = Math.round(o.w * k / 2) * 2, H = Math.round(o.h * k / 2) * 2, n = Math.max(2, Math.round(o.giay * o.fps));
    const P = await tgChuan(o, tgN(W, H), (s, p) => tt(s, 0.3 * (p || 0)), W, H); if (!P.lat.length) throw new Error(T("chưa có tầng nào: thêm tầng ở danh sách bên trái"));
    job.P = P; const oo = o.nen === "trong" ? Object.assign({}, o, {nen: "trang"}) : o, ve = t => tgKhungDong(oo, o.kieuDong, t, P.lat.length);
    const R = coWC ? await tgMaHoa(o, W, H, n, ve, tt, job) : await tgGhiMR(o, W, H, n, ve, tt, job);
    const ten = tgTenTep(o, P, W, H, R.duoi); v28Tai(ten, R.du, R.kieu);
    tt(T("đã xuất {f}: {w} × {h} điểm ảnh, {s} s, {fps} khung/giây ({c})", {f: ten, w: W, h: H, s: o.giay, fps: o.fps, c: R.codec}), 1);
    return {ten, R};
  } catch (e) { tt(T("lỗi: ") + tgLoi(e)); }
  finally { TG.ma = null; tgChu(); }
}
if (typeof setLang === "function") { const _sl318 = setLang; setLang = function () { const r = _sl318.apply(this, arguments); tgChu(); if (tg$("dlgTang").open) { tgHien(); tgCapNhatTen(); } return r; }; }
