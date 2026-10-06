/* =============================== BẢN 3.5: LẤY MẪU NHANH =============================== */
/* ① Bộ nhớ ảnh dải đã vẽ + nạp trước 2-3 điểm kế tiếp (dải ảnh mọi năm, đồ thị theo năm, đặc trưng gợi ý, ô ảnh nền).
   ② Gợi ý lớp tại chỗ: láng giềng gần nhất (kNN) trên đặc trưng theo năm của các điểm đã gán (embedding, PC, S2 10 băng, Landsat có sẵn;
      hoặc băng và chỉ số đọc trực tuyến). Không dùng điểm đang xem để gợi ý cho chính nó. Gán mù một phần điểm để đo độ đúng của gợi ý.
   ③ Chế độ lưới: nhiều điểm cùng năm trên một màn, gán bằng phím cho các ô đã chọn, Enter nhận gợi ý.
   Biến cấp tệp khai báo bằng var. */

/* ---------------- ① bộ nhớ ảnh dải đã vẽ ---------------- */
/* Các hàm vẽ một khung quanh điểm (s2dVe, lsdVe, v27Ve, s2oVe) được bọc: cùng tham số và cùng cách xem thì vẽ lại từ bản đã lưu,
   không đọc lại ảnh. Chỉ áp cho khung nhỏ (dải ảnh, ô lưới: ≤ 220 px, khác 256 để không đụng ô bản đồ). Lời gọi đang chạy dùng chung. */
var ANH = {m: new Map(), byte: 0, tran: 64e6, trung: 0, goi: 0};   // tối đa khoảng 64 MB ảnh đã vẽ (bản 3.6: đủ cho nạp trước 20 điểm)
function anhChuKy(ten) {
  if (ten === "s2dVe") return JSON.stringify(typeof S2V !== "undefined" ? S2V : null) + (ST.chiso ? ST.chiso.dung.join() + ST.chiso.tu.map(t => t.bt).join() : "");
  if (ten === "lsdVe") return JSON.stringify(typeof LSV !== "undefined" ? LSV : null) + (ST.chiso ? ST.chiso.dung.join() : "");
  if (ten === "s2oVe") return JSON.stringify(S2OV) + "|" + (typeof s2oKyKH === "function" ? s2oKyKH() : "") + "|" + (typeof s2oNg === "function" ? s2oNg() : "");
  return "";
}
function anhBoc(ten, viTriW, viTriCv, khoaThem) {
  const goc = window[ten]; if (typeof goc !== "function") return;
  const moi = async function () {
    const a = Array.from(arguments), w = a[viTriW], cv = a[viTriCv];
    if (!(w > 0 && w <= 220 && w !== 256)) return goc.apply(this, a);
    const k = [ten, khoaThem(a), w, anhChuKy(ten)].join("|");
    ANH.goi++;
    let e = ANH.m.get(k);
    if (e) { ANH.trung++; ANH.m.delete(k); ANH.m.set(k, e); }
    else {
      const c2 = document.createElement("canvas"); c2.width = c2.height = w;
      const a2 = a.slice(); a2[viTriCv] = c2;
      e = {pr: goc.apply(this, a2).then(ret => ({ret, cv: c2})), b: w * w * 4};
      const bo = () => { if (ANH.m.get(k) === e) { ANH.m.delete(k); ANH.byte -= e.b; } };
      e.pr.then(r => { if (r.ret == null || (ten === "v27Ve" && !r.ret.n)) bo(); }, bo);
      ANH.m.set(k, e); ANH.byte += e.b;
      while (ANH.byte > ANH.tran && ANH.m.size > 1) { const k0 = ANH.m.keys().next().value; ANH.byte -= ANH.m.get(k0).b; ANH.m.delete(k0); }
    }
    const r = await e.pr;
    const g = cv && cv.getContext && cv.getContext("2d");
    if (g) { try { g.drawImage(r.cv, 0, 0); } catch (er) { /* bỏ */ } }
    return r.ret;
  };
  window[ten] = moi;                                 // hàm khai báo ở cấp trang là thuộc tính của window: gán lại là mọi chỗ gọi dùng bản bọc
}
var anhBB = bb => bb.map(v => Math.round(v * 10) / 10).join(",");
anhBoc("s2dVe", 2, 5, a => a[0] + "|" + anhBB(a[1]) + "|" + a[4]);
anhBoc("lsdVe", 2, 5, a => a[0] + "|" + anhBB(a[1]) + "|" + a[4]);
anhBoc("v27Ve", 3, 4, a => a[0] + "|" + a[1] + "|" + anhBB(a[2]));
anhBoc("s2oVe", 2, 4, a => a[0] + "|" + anhBB(a[1]) + "|" + JSON.stringify(a[5] || null));

/* ---------------- một khung ảnh quanh điểm cho một năm (dùng chung cho nạp trước và chế độ lưới) ---------------- */
function anhChu(cv, W, s1, s2) {
  const g = cv && cv.getContext && cv.getContext("2d"); if (!g) return;
  g.fillStyle = "#eef0f3"; g.fillRect(0, 0, W, W); g.fillStyle = "#667085"; g.font = "10px sans-serif"; g.textAlign = "center";
  g.fillText(s1, W / 2, W / 2 - (s2 ? 6 : -3)); if (s2) g.fillText(s2, W / 2, W / 2 + 8);
}
async function anhNam(p, y, W, half, cv, nguon) {   // -> true nếu có ảnh
  const c = CORE.to3857(p.lon, p.lat), bb = [c[0] - half, c[1] - half, c[0] + half, c[1] + half];
  const N = nguon || await v27Nguon(p);
  if (N.ng === "s2o") {
    const K = s2oKH(); if (!K || !K.nam[y] || !(K.nam[y].chon || []).length) { anhChu(cv, W, T("không có")); return false; }
    const nhanh = (s2o$("s2oDai") || {}).value !== "ghep";
    const px = await s2oVe(y, bb, W, W, cv, nhanh ? {diem: [p.lon, p.lat]} : null); stripDanh(cv, W, half); return !!px;
  }
  if (N.ng === "wb" || N.ng === "eox") {
    if (N.ng === "eox" && !EOX_NAM.includes(y)) { anhChu(cv, W, T("không có")); return false; }
    const r = await v27Ve(N.ng, y, bb, W, cv);
    if (N.ng === "eox" && cv && v27Trang(cv)) { anhChu(cv, W, T("EOX không có"), T("ảnh năm này ở đây")); return false; }
    stripDanh(cv, W, half); return !!(r && r.n);
  }
  const s = $("selStrip").value, L0 = s === "s2d" && MAN.s2d ? s2dL0() : s === "lsd" && typeof lsdL0 === "function" ? lsdL0() : MAN.layers.find(l => l.id === s);
  if (!L0 || !L0.nam.includes(y)) { anhChu(cv, W, T("không có")); return false; }
  const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y));
  if (L0.kieu === "s2d") { await s2dVe(url, bb, W, W, 18, cv); stripDanh(cv, W, half); return true; }
  if (L0.kieu === "lsd") { await lsdVe(url, bb, W, W, 18, cv); stripDanh(cv, W, half); return true; }
  const r = await readBox(url, bb, W, W); if (r && cv) { paint(cv, r.data, r.n, L0); stripDanh(cv, W, half); } return !!r;
}
async function hangDoi(ds, n, f, dung) {            // chạy f trên ds, tối đa n việc cùng lúc; dung() true thì thôi
  let i = 0; const chay = async () => { while (i < ds.length) { if (dung && dung()) return; const j = i++; try { await f(ds[j], j); } catch (e) { /* bỏ */ } } };
  await Promise.all(Array.from({length: Math.min(n, ds.length)}, chay));
}

/* ---------------- nạp trước các điểm kế tiếp ---------------- */
var NT = Object.assign({so: 2, dir: 1}, ls("laymau_hp_nt_v1") || {});
NT.tok = 0; NT.xong = new Set(); NT.hen = null; NT.dang = 0;
function ntLuu() { ls("laymau_hp_nt_v1", {so: NT.so}); }
function ntKeTiep() {
  const v = visible(), i = v.findIndex(p => p.id === ST.cur); if (!v.length || i < 0) return [];
  const out = []; for (let k = 1; k <= NT.so && k < v.length; k++) out.push(v[(i + NT.dir * k + v.length * 4) % v.length]);
  return out.filter((p, j, a) => a.indexOf(p) === j && p.id !== ST.cur);
}
function ntKhoa(p) { return [p.id, $("selStrip").value, stripNua(), stripCo(), CVS.kind, CVS.grp, CVS.s1 ? 1 : 0, anhChuKy("s2dVe"), anhChuKy("lsdVe"), anhChuKy("s2oVe")].join("|"); }
/* bản 3.6: nạp trước nhường bản đồ: đợi khi các lớp bản đồ đang tải ô (ô S2 trực tuyến của khung nhìn quan trọng hơn ảnh điểm sau);
   đợi tối đa 4 giây mỗi lần, để một lớp tải mãi không xong (máy chủ ô hỏng) không làm nạp trước đứng hẳn */
async function ntNhuong(tok) {
  if (NT.boDoi === tok) return;                      // lượt này đã đợi hết 4 giây một lần: lớp tải mãi, thôi không đợi nữa
  for (let i = 0; i < 16; i++) {
    if (tok !== NT.tok) return;
    let dang = false; try { map.eachLayer(l => { if (!dang && l.isLoading && l.isLoading()) dang = true; }); } catch (e) { /* bỏ */ }
    if (!dang) return;
    await new Promise(r => setTimeout(r, 250));
  }
  NT.boDoi = tok;
}
async function ntDai(p, tok) {                       // dải ảnh mọi năm như renderStrip sẽ vẽ (vào bộ nhớ ảnh)
  const N = await v27Nguon(p), WS = stripCo(), half = stripNua();
  let ys;
  if (N.ng === "s2o") { const L0 = s2oL0(); ys = L0 ? L0.nam.slice() : []; }
  else if (N.ng === "wb" || N.ng === "eox") ys = v27NamDai(N.ng).filter(y => N.ng !== "eox" || EOX_NAM.includes(y));
  else { const s = $("selStrip").value, L0 = s === "s2d" && MAN.s2d ? s2dL0() : s === "lsd" && typeof lsdL0 === "function" ? lsdL0() : MAN.layers.find(l => l.id === s); ys = L0 ? L0.nam.slice() : []; }
  ys.sort((a, b) => Math.abs(a - ST.nam) - Math.abs(b - ST.nam));            // năm đang gán trước
  await hangDoi(ys, NT.so >= 5 ? 2 : 3, async y => {
    await ntNhuong(tok); if (tok !== NT.tok) return;
    const cv = document.createElement("canvas"); cv.width = cv.height = WS;
    await anhNam(p, y, WS, half, cv, N);
  }, () => tok !== NT.tok);
}
async function ntNen(p, tok) {                        // ô ảnh nền Wayback quanh điểm ở mức phóng sẽ dùng khi sang điểm
  if (typeof base === "undefined" || !base || typeof base._ve !== "function") return;
  const z = Math.max(map.getZoom(), 17), sz = map.getSize(), c = map.project([p.lat, p.lon], z);
  const x0 = Math.floor((c.x - sz.x / 2) / 256), x1 = Math.floor((c.x + sz.x / 2) / 256), y0 = Math.floor((c.y - sz.y / 2) / 256), y1 = Math.floor((c.y + sz.y / 2) / 256);
  const o = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) o.push({x, y, z});
  if (o.length > 40) return;
  await hangDoi(o, 4, async q => { const cv = document.createElement("canvas"); cv.width = cv.height = 256; await base._ve(q, cv); }, () => tok !== NT.tok);
}
async function ntNap(p, tok, thu) {
  if (!MAN || !p) return;
  await ntNhuong(tok);
  await ntDai(p, tok); if (tok !== NT.tok) return;
  if (CVS.kind === "nam" && CVS.grp && typeof annualFor === "function") { try { await annualFor(p, CVS.grp); } catch (e) { /* bỏ */ } }
  else { try { if (MAN.pc) await pcAt(p); if (MAN.s2d) await s2dAt(p); } catch (e) { /* bỏ */ } }
  if (tok !== NT.tok) return;
  try { await lopAt(p); } catch (e) { /* bỏ */ }
  try { await gyDacTrung(p); } catch (e) { /* bỏ */ }
  if (tok !== NT.tok) return;
  if (CVS.kind !== "nam" && CVS.s1 && !(thu > 4) && typeof s1Diem === "function") { try { await s1Diem(p); } catch (e) { /* bỏ */ } }   // bản 3.6: đường S1
  if (tok !== NT.tok) return;
  if (!(thu > 2)) ntNen(p, tok).catch(() => {});     // ô ảnh nền: chạy nền, chỉ cho 3 điểm gần nhất
}
function ntTT() {
  const e = $("ntTT"); if (!e) return;
  const ds = ntKeTiep(), xong = ds.filter(p => NT.xong.has(ntKhoa(p))).length;
  e.textContent = NT.so && ds.length ? `⚡${xong}/${ds.length}` : "";
  e.title = NT.so && ds.length ? T("đã nạp trước dải ảnh, đồ thị, gợi ý của {a}/{b} điểm kế tiếp", {a: xong, b: ds.length}) : "";
}
function ntBatDau(tre) {                             // gọi khi đổi điểm, đổi năm, đổi cách xem: hẹn chạy sau khi điểm đang xem đã vẽ
  clearTimeout(NT.hen); const tok = ++NT.tok;
  if (!NT.so || LUOI.mo) { ntTT(); return; }
  NT.hen = setTimeout(async () => {
    const ds = ntKeTiep();
    for (let thu = 0; thu < ds.length; thu++) {
      const p = ds[thu];
      if (tok !== NT.tok) return;
      const k = ntKhoa(p); if (NT.xong.has(k)) continue;
      NT.dang++; try { await ntNap(p, tok, thu); } finally { NT.dang--; }
      if (tok === NT.tok) { NT.xong.add(k); if (NT.xong.size > 3000) NT.xong.clear(); }
      ntTT();
    }
    ntTT();
  }, tre == null ? 1500 : tre);
  ntTT();
}
var _step35 = step;
step = function (d) { NT.dir = d < 0 ? -1 : 1; return _step35.apply(this, arguments); };
var _select35 = select;
select = function () { const r = _select35.apply(this, arguments); ntBatDau(); return r; };

/* ---------------- ② gợi ý lớp tại chỗ (kNN) ---------------- */
var GY = Object.assign({bat: true, k: 7, mu: 10, nguong: 0.6, toiThieu: 10}, ls("laymau_hp_gy_v1") || {});
GY.ver = 0; GY.nhan = false; GY.tap = null; GY.cv = null;
function gyLuu() { ls("laymau_hp_gy_v1", {bat: GY.bat, k: GY.k, mu: GY.mu, nguong: GY.nguong}); }
var GYF = new Map();                                 // khoá toạ độ -> {sig, names, ys: {năm: [số]}}
var GYDB = {db: null, san: null};
function gyKhoa(p) { return (+p.x).toFixed(1) + "," + (+p.y).toFixed(1); }
GYDB.san = (async () => {                            // kho bền trong trình duyệt (IndexedDB): đặc trưng giữ qua các lần mở trang
  if (typeof indexedDB === "undefined") return;
  try {
    GYDB.db = await new Promise((ok, loi) => { const r = indexedDB.open("laymau_hp_goi_y", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("f"); r.onsuccess = () => ok(r.result); r.onerror = () => loi(r.error); });
    await new Promise(ok => { const t = GYDB.db.transaction("f", "readonly").objectStore("f").openCursor();
      t.onsuccess = () => { const c = t.result; if (c) { if (!GYF.has(c.key)) GYF.set(c.key, c.value); c.continue(); } else ok(); }; t.onerror = () => ok(); });
  } catch (e) { GYDB.db = null; }
})();
function gyGhiKho(k, v) { if (!GYDB.db) return; try { GYDB.db.transaction("f", "readwrite").objectStore("f").put(v, k); } catch (e) { /* bỏ */ } }
var GY_DANG = new Map(), GY_KHONG = new Map();      // điểm không có đặc trưng (theo kế hoạch cảnh lúc thử): khỏi thử lại
function gyNhomCo() { return ["emb", "pc", "s2", "ls"].filter(g => NHOM_NAM.some(n => n.id === g && n.co())); }
async function gyDacTrungCo(p) {                     // đặc trưng từ dữ liệu có sẵn của bộ ảnh
  const names = [], ys = {}; let off = 0;
  for (const g of gyNhomCo()) {
    let A; try { A = await annualFor(p, g); } catch (e) { continue; }
    const nb = A.names.length, sc = g === "s2" || g === "ls" ? 1e-4 : 1;
    Object.entries(A.ys).forEach(([y, v]) => { const r = ys[y] = ys[y] || []; for (let i = 0; i < nb; i++) r[off + i] = v[i] == null || !isFinite(v[i]) ? null : +(v[i] * sc).toFixed(5); });
    A.names.forEach(n => names.push(g + ":" + n)); off += nb;
  }
  Object.values(ys).forEach(r => { for (let i = 0; i < off; i++) if (r[i] === undefined) r[i] = null; });
  Object.keys(ys).forEach(y => { if (!ys[y].some(v => v != null)) delete ys[y]; });
  return Object.keys(ys).length ? {sig: "co:" + names.join(","), names, ys} : null;
}
async function gyDacTrungTT(p) {                     // đặc trưng đọc trực tuyến theo kế hoạch cảnh đang dùng (trung vị cảnh quang đãng tại điểm)
  const K = s2oKH(); if (!K || !s2oTrongKH(p)) return null;
  const ng = s2oNg(), s1 = ng === "s1", bang = s1 ? ["VV", "VH"] : ["B2", "B3", "B4", "B8", "B11", "B12"];
  const names = s1 ? ["VV dB", "VH dB", "VV-VH dB"] : bang.concat(["NDVI", "MNDWI", "NDBI"]), ys = {};
  for (const y of Object.keys(K.nam).map(Number)) {
    const ds = s2oCanh(y).filter(sc => s2oPhuDiem(sc, p.lon, p.lat)); if (!ds.length) continue;
    const rs = await s2oDocNhieu(ds, p.lon, p.lat, bang, 20), q = rs.filter(r => r.quang); if (!q.length) continue;
    const m = {}; bang.forEach(b => { m[b] = s2oTrung(q, b); });
    if (s1) { const a = s2oDB(m.VV), b = s2oDB(m.VH); if (a == null || b == null) continue; ys[y] = [a, b, a - b].map(v => +v.toFixed(3)); continue; }
    if (bang.some(b => m[b] == null)) continue;
    const r = bang.map(b => m[b] / 1e4), nd = (a, b) => a + b ? (a - b) / (a + b) : 0;
    ys[y] = r.concat([nd(r[3], r[2]), nd(r[1], r[4]), nd(r[4], r[3])]).map(v => +v.toFixed(4));
  }
  return Object.keys(ys).length ? {sig: "tt:" + ng + ":" + names.join(","), names, ys} : null;
}
async function gyDacTrung(p) {
  const k = gyKhoa(p);
  await GYDB.san;
  const co = GYF.get(k); if (co && co.ys && Object.keys(co.ys).length) return co;
  if (GY_DANG.has(k)) return GY_DANG.get(k);
  const kh = (typeof s2oKyKH === "function" ? s2oKyKH() : "") + "|" + (MAN ? MAN.layers.length : 0);
  if (GY_KHONG.get(k) === kh) return null;
  const pr = (async () => {
    let e = null;
    try { e = await gyDacTrungCo(p); } catch (er) { e = null; }
    if (!e) { try { e = await gyDacTrungTT(p); } catch (er) { e = null; } }
    if (e) { GYF.set(k, e); gyGhiKho(k, e); GY.tap = null; } else GY_KHONG.set(k, kh);
    return e;
  })();
  GY_DANG.set(k, pr); pr.finally(() => GY_DANG.delete(k));
  return pr;
}
function gyMu(p) {                                   // điểm gán mù: cố định theo mã điểm, GY.mu % số điểm
  let h = 2166136261; const s = String(p.id); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100) < GY.mu;
}
function gyBoQua(ma) { const c = IDX.by[ma]; return !c || (SCHEME.dac_biet || []).some(d => d.ma === ma); }   // U, M không phải lớp phủ
function gyTap(sig) {                                // tập mẫu đã gán có cùng loại đặc trưng; chuẩn hoá z theo từng chiều
  if (GY.tap && GY.tap.ver === GY.ver && GY.tap.sig === sig) return GY.tap;
  const X = [], Y = [], P = [];
  Object.values(ST.diem).forEach(p => {
    const e = GYF.get(gyKhoa(p)); if (!e || e.sig !== sig) return;
    Object.entries(p.nhan || {}).forEach(([y, ma]) => { if (!ma || gyBoQua(ma)) return; const x = e.ys[y]; if (!x) return; X.push(x); Y.push(ma); P.push(p.id); });
  });
  const D = X.length ? X[0].length : 0, mu = new Float64Array(D), sd = new Float64Array(D);
  for (let j = 0; j < D; j++) { let s = 0, s2 = 0, n = 0; for (const x of X) { const v = x[j]; if (v != null) { s += v; s2 += v * v; n++; } }
    mu[j] = n ? s / n : 0; sd[j] = n > 1 ? Math.sqrt(Math.max(1e-12, s2 / n - mu[j] * mu[j])) : 1; }
  const Z = X.map(x => Float64Array.from(x, (v, j) => v == null ? NaN : (v - mu[j]) / sd[j]));
  return (GY.tap = {ver: GY.ver, sig, Z, Y, P, mu, sd, D, n: X.length, lop: new Set(Y).size});
}
function gyKNN(tap, x, boId) {
  const z = Float64Array.from(x, (v, j) => v == null ? NaN : (v - tap.mu[j]) / tap.sd[j]), k = Math.max(1, GY.k), best = [];
  for (let i = 0; i < tap.n; i++) {
    if (tap.P[i] === boId) continue;
    const t = tap.Z[i]; let s = 0, m = 0;
    for (let j = 0; j < tap.D; j++) { const a = z[j], b = t[j]; if (a === a && b === b) { s += (a - b) * (a - b); m++; } }
    if (m < Math.ceil(tap.D / 2)) continue;
    const d = Math.sqrt(s * tap.D / m);
    if (best.length < k) { best.push([d, i]); best.sort((u, v) => u[0] - v[0]); }
    else if (d < best[k - 1][0]) { best[k - 1] = [d, i]; best.sort((u, v) => u[0] - v[0]); }
  }
  if (!best.length) return null;
  const w = {}; let tong = 0;
  best.forEach(([d, i]) => { const q = 1 / (d + 0.05); w[tap.Y[i]] = (w[tap.Y[i]] || 0) + q; tong += q; });
  const top = Object.entries(w).sort((a, b) => b[1] - a[1]).map(([ma, v]) => [ma, v / tong]);
  return {ma: top[0][0], tin: top[0][1], top, k: best.length};
}
function gyDoan(p, y) {                              // đồng bộ, chỉ dùng đặc trưng đã có: {ma, tin, top, n} | {thieu: n} | null
  const e = GYF.get(gyKhoa(p)); if (!e) return null;
  const x = e.ys[y]; if (!x) return {khongNam: true};
  const tap = gyTap(e.sig); if (tap.n < GY.toiThieu || tap.lop < 2) return {thieu: tap.n, sig: e.sig};
  const r = gyKNN(tap, x, p.id); if (!r) return null;
  return Object.assign(r, {n: tap.n, sig: e.sig});
}
function gyKiemCheo(sig) {                           // độ đúng ước tính: bỏ cả điểm khi đoán mẫu của nó (≤ 400 mẫu thử; tính lại khi số mẫu tăng 5 %)
  const tap = gyTap(sig), moc = Math.floor(tap.n / Math.max(10, Math.round(tap.n * 0.05)));
  if (GY.cv && GY.cv.sig === sig && GY.cv.moc === moc) return GY.cv;
  let dung = 0, n = 0;
  const buoc = Math.max(1, Math.ceil(tap.n / 400));
  for (let i = 0; i < tap.n; i += buoc) {
    const x = Array.from(tap.Z[i], (v, j) => v === v ? v * tap.sd[j] + tap.mu[j] : null), r = gyKNN(tap, x, tap.P[i]);
    if (!r) continue; n++; if (r.ma === tap.Y[i]) dung++;
  }
  return (GY.cv = {moc, sig, n, dung, ti: n ? dung / n : null});
}
function gyMuDo() {                                  // độ đúng trên các nhãn gán mù (gợi ý không hiện khi gán): ước lượng không thiên lệch
  let n = 0, d = 0;
  Object.values(ST.diem).forEach(p => Object.entries(p.gy || {}).forEach(([y, g]) => { if (g.mu && g.g && p.nhan[y] === g.l && !gyBoQua(g.l)) { n++; if (g.g === g.l) d++; } }));
  return {n, d};
}
function gyGhi(p, y, ma) {                           // ghi gợi ý lúc gán, để báo cáo: gợi ý gì, độ tin, điểm mù, có nhận gợi ý không
  if (ma == null) { if (p.gy) delete p.gy[y]; return; }
  const g = gyDoan(p, y), co = g && g.ma;
  p.gy = p.gy || {};
  const r = {l: ma};                                 // gọn: chỉ ghi trường có giá trị (tệp tiến độ nhỏ khi có hàng chục nghìn nhãn)
  if (co) { r.g = g.ma; r.t = +g.tin.toFixed(2); }
  if (gyMu(p)) r.mu = 1;
  if (GY.nhan && co && g.ma === ma) r.n = 1;
  p.gy[y] = r;
}
var _label35 = label;
label = function (ma) {
  const p = cur(); if (p) gyGhi(p, ST.nam, ma);
  GY.ver++;
  return _label35.apply(this, arguments);
};
function gyNhan() {                                  // Enter: nhận gợi ý cho năm đang xem
  const p = cur(); if (!p || !GY.bat || gyMu(p)) return false;
  const g = gyDoan(p, ST.nam); if (!g || !g.ma) return false;
  GY.nhan = true; try { label(g.ma); } finally { GY.nhan = false; }
  return true;
}
function gyTenLop(ma) { const c = IDX.by[ma]; return c ? `<span class="sw" style="background:${c.mau}"></span>${esc(ma)} ${esc(cten(c))}` : esc(ma); }
function gyHop() {                                   // dòng gợi ý dưới các nút lớp
  const box = $("gyBox"); if (!box) return;
  document.querySelectorAll("#cls button.gy").forEach(b => b.classList.remove("gy"));
  const p = cur();
  if (!GY.bat || !p) { box.innerHTML = GY.bat ? "" : `<span class="mu">${T("gợi ý lớp đang tắt")}</span> <button type="button" data-gy="bat">${T("bật")}</button>`; gyNut(box); return; }
  if (gyMu(p)) { box.innerHTML = `<span class="mu">🙈 ${T("điểm gán mù: không hiện gợi ý (để đo độ đúng của gợi ý)")}</span>`; return; }
  const g = gyDoan(p, ST.nam);
  if (!g) {
    box.innerHTML = `<span class="mu">${T("gợi ý: đang tính đặc trưng tại điểm…")}</span>`;
    const id = p.id; gyDacTrung(p).then(e => { if (cur() && cur().id === id) { if (e) gyHop(); else box.innerHTML = `<span class="mu">${T("gợi ý: không có dữ liệu đặc trưng tại điểm này")}</span>`; } });
    return;
  }
  if (g.khongNam) { box.innerHTML = `<span class="mu">${T("gợi ý: năm này không có đặc trưng tại điểm")}</span>`; return; }
  if (g.thieu != null) { box.innerHTML = `<span class="mu">${T("gợi ý: cần ít nhất {a} mẫu đã gán cùng loại đặc trưng, hiện có {b}", {a: GY.toiThieu, b: g.thieu})}</span> ${gyNutBoSung()}`; gyNut(box); return; }
  const cv = gyKiemCheo(g.sig), mu = gyMuDo(), tinTh = g.tin < GY.nguong;
  box.innerHTML = `<b>${T("Gợi ý")}:</b> <span class="chip${tinTh ? " mu" : ""}">${gyTenLop(g.ma)} <b>${Math.round(100 * g.tin)} %</b></span>` +
    (g.top[1] ? ` <span class="mu">· ${esc(g.top[1][0])} ${Math.round(100 * g.top[1][1])} %</span>` : "") +
    ` <kbd>Enter</kbd> ${T("nhận")}` +
    `<div class="mu" style="font-size:10px">${T("{k} láng giềng trong {n} mẫu đã gán", {k: g.k, n: g.n})}` +
    (cv.ti != null ? ` · ${T("ước tính đúng {t} % (kiểm chéo bỏ điểm, {n} mẫu)", {t: Math.round(100 * cv.ti), n: cv.n})}` : "") +
    (mu.n ? ` · ${T("đúng {t} % trên {n} nhãn gán mù", {t: Math.round(100 * mu.d / mu.n), n: mu.n})}` : "") + (gyChuaCo().length ? ` · ${gyNutBoSung()}` : "") + `</div>`;
  const b = [...document.querySelectorAll("#cls button")].find(x => (x.textContent || "").includes(g.ma + " ")); if (b) b.classList.add("gy");
  gyNut(box);
}
function gyChuaCo() { return Object.values(ST.diem).filter(p => Object.values(p.nhan || {}).some(m => m && !gyBoQua(m)) && !GYF.has(gyKhoa(p))); }
function gyNutBoSung() { const n = gyChuaCo().length; return n ? `<button type="button" data-gy="bosung" title="${esc(T("đọc đặc trưng cho các điểm đã gán mà chưa có, chạy nền"))}">${T("thêm {n} điểm đã gán vào mẫu", {n})}</button>` : ""; }
var GY_BS = {chay: false, xong: 0, tong: 0};
async function gyBoSung() {                          // đọc đặc trưng cho các điểm đã gán (chạy nền, 3 điểm một lúc)
  if (GY_BS.chay) return; const ds = gyChuaCo(); if (!ds.length) return;
  GY_BS.chay = true; GY_BS.xong = 0; GY_BS.tong = ds.length;
  await hangDoi(ds, 3, async p => { await gyDacTrung(p); GY_BS.xong++; if (GY_BS.xong % 10 === 0 || GY_BS.xong === GY_BS.tong) { msg(T("đặc trưng gợi ý: {a}/{b} điểm", {a: GY_BS.xong, b: GY_BS.tong}), "ok", 1500); gyHop(); } });
  GY_BS.chay = false; GY.ver++; gyHop(); if (LUOI.mo) luoiNhan();
}
function gyNut(box) {
  box.querySelectorAll("[data-gy]").forEach(b => { b.onclick = () => { if (b.dataset.gy === "bat") { GY.bat = true; gyLuu(); gyHop(); } else gyBoSung(); }; });
}
var _renderPoint35 = renderPoint;
renderPoint = function () { _renderPoint35.apply(this, arguments); try { gyHop(); } catch (e) { /* bỏ */ } };

/* ---------------- ③ chế độ lưới ---------------- */
var LUOI = Object.assign({co: 40, W: 128, half: 250, loc: "chua", xep: "gy", dien: false}, ls("laymau_hp_luoi_v1") || {});
LUOI.mo = false; LUOI.trang = 0; LUOI.ds = []; LUOI.chon = new Set(); LUOI.tok = 0; LUOI.cuoi = null;
function luoiLuu() { ls("laymau_hp_luoi_v1", {co: LUOI.co, W: LUOI.W, half: LUOI.half, loc: LUOI.loc, xep: LUOI.xep, dien: LUOI.dien}); }
function luoiDanhSach() {                            // các điểm của trang lưới: bộ đang lọc, (chưa gán năm này), xếp theo lớp gợi ý
  let ds = visible().slice();
  if (LUOI.loc === "chua") ds = ds.filter(p => !p.nhan[ST.nam]);
  if (LUOI.xep === "gy") {
    const g = new Map(ds.map(p => [p.id, gyMu(p) ? null : gyDoan(p, ST.nam)]));
    const ma = p => { const x = g.get(p.id); return x && x.ma ? x.ma : "~"; }, tin = p => { const x = g.get(p.id); return x && x.ma ? x.tin : 0; };
    const thu = Object.fromEntries((SCHEME.lop || []).concat(SCHEME.dac_biet || []).map((c, i) => [c.ma, i]));
    ds.sort((a, b) => ((thu[ma(a)] ?? 999) - (thu[ma(b)] ?? 999)) || (tin(b) - tin(a)) || (a.id < b.id ? -1 : 1));
  }
  return ds;
}
function luoiTrangDs() { return LUOI.ds.slice(LUOI.trang * LUOI.co, (LUOI.trang + 1) * LUOI.co); }
function luoiMo(on) {
  const P = $("luoiP"); LUOI.mo = on == null ? P.hidden : on; P.hidden = !LUOI.mo;
  if (!LUOI.mo) { LUOI.tok++; render(); ntBatDau(); return; }
  NT.tok++;                                          // dừng nạp trước của chế độ điểm
  const i = ST.cur ? luoiDanhSach().findIndex(p => p.id === ST.cur) : -1;
  LUOI.ds = luoiDanhSach(); LUOI.trang = i >= 0 ? Math.floor(i / LUOI.co) : 0; LUOI.chon.clear();
  luoiVe();
}
function luoiDauDong() {
  const ds = LUOI.ds, nt = Math.max(1, Math.ceil(ds.length / LUOI.co)), tr = luoiTrangDs(), gan = tr.filter(p => p.nhan[ST.nam]).length;
  const S = (o, sel) => o.map(([v, t]) => `<option value="${v}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`).join("");
  return `<div class="row luoi-dau">
    <b>▦ ${T("Lưới")}</b>
    <button type="button" data-l="nam-">‹</button><b>${T("năm {y}", {y: ST.nam})}</b><button type="button" data-l="nam+">›</button>
    <select data-l="loc">${S([["chua", T("chưa gán năm này")], ["tat", T("mọi điểm đang lọc")]], LUOI.loc)}</select>
    <select data-l="xep">${S([["gy", T("xếp theo lớp gợi ý")], ["ma", T("xếp theo mã điểm")]], LUOI.xep)}</select>
    <select data-l="co">${S([[24, "24"], [40, "40"], [60, "60"], [96, "96"]].map(([v]) => [v, T("{n} ô một trang", {n: v})]), LUOI.co)}</select>
    <select data-l="half">${S(STRIP_R.filter(q => q[0] <= 485).map(q => [q[0], T("khung {r}", {r: q[1]})]), LUOI.half)}</select>
    <select data-l="W">${S([[96, T("ô nhỏ")], [128, T("ô vừa")], [176, T("ô lớn")]], LUOI.W)}</select>
    <label title="${esc(T("gán xong thì điền nhãn đó cho các năm sau còn trống của điểm"))}"><input type="checkbox" data-l="dien"${LUOI.dien ? " checked" : ""}> ${T("điền các năm sau")}</label>
    <span style="margin-left:auto"></span>
    <button type="button" data-l="tr-">‹ <kbd>p</kbd></button><span>${T("trang {a}/{b}", {a: LUOI.trang + 1, b: nt})} · ${ds.length} ${T("điểm")}</span><button type="button" data-l="tr+"><kbd>n</kbd> ›</button>
    <button type="button" data-l="dong" title="${esc(T("đóng chế độ lưới (l hoặc Esc)"))}">× ${T("đóng")}</button></div>
    <div class="row sm mu luoi-tt"><span data-l="tt">${T("đã gán trang này {a}/{b}", {a: gan, b: tr.length})} · ${T("đã chọn {n}", {n: LUOI.chon.size})}</span>
      <span>· ${T("nhấp: chọn ô; Shift+nhấp: chọn dải; Ctrl+A: chọn cả trang; phím lớp: gán cho ô đã chọn; Enter: nhận gợi ý (ô đã chọn, hoặc mọi ô đủ tin cậy của trang); Backspace: xoá nhãn; nhấp đúp: mở điểm")}</span>
      <span>· ${T("ngưỡng tin cậy")} <input type="number" data-l="nguong" min="0" max="1" step="0.05" value="${GY.nguong}" style="width:52px"></span></div>`;
}
function luoiVe() {
  const P = $("luoiP"); if (!P || P.hidden) return;
  const tok = ++LUOI.tok, tr = luoiTrangDs();
  P.innerHTML = luoiDauDong() + `<div class="luoi-o" style="grid-template-columns:repeat(auto-fill,minmax(${LUOI.W + 8}px,1fr))">` +
    tr.map(p => `<div class="lo" data-id="${esc(p.id)}" style="width:${LUOI.W}px"><canvas width="${LUOI.W}" height="${LUOI.W}"></canvas>
      <span class="lo-id">${esc(String(p.id).slice(-8))}</span><span class="lo-gy"></span><span class="lo-nh"></span></div>`).join("") + "</div>" +
    (tr.length ? "" : `<div class="mu" style="padding:20px">${T("không có điểm nào theo bộ lọc này")}</div>`);
  luoiNoi(P);
  luoiNhan();
  hangDoi(tr, 6, async p => {                        // ảnh từng ô
    if (tok !== LUOI.tok) return;
    const o = [...P.querySelectorAll(".lo")].find(x => x.dataset.id === p.id), cv = o && o.querySelector("canvas"); if (!cv) return;
    await anhNam(p, ST.nam, LUOI.W, LUOI.half, cv);
  }, () => tok !== LUOI.tok).then(async () => {
    if (tok !== LUOI.tok) return;
    await hangDoi(tr, 3, async p => { const co = GYF.has(gyKhoa(p)); await gyDacTrung(p); if (!co) luoiNhan(p.id); }, () => tok !== LUOI.tok);
    if (tok !== LUOI.tok) return;
    const sau = LUOI.ds.slice((LUOI.trang + 1) * LUOI.co, (LUOI.trang + 2) * LUOI.co);      // nạp trước trang sau
    await hangDoi(sau, 4, async p => { const cv = document.createElement("canvas"); cv.width = cv.height = LUOI.W; await anhNam(p, ST.nam, LUOI.W, LUOI.half, cv); }, () => tok !== LUOI.tok);
    await hangDoi(sau, 2, p => gyDacTrung(p), () => tok !== LUOI.tok);
  });
}
function luoiNhan(chiId) {                           // cập nhật nhãn, gợi ý, chọn của từng ô (không vẽ lại ảnh)
  const P = $("luoiP"); if (!P || P.hidden) return;
  P.querySelectorAll(".lo").forEach(o => {
    const id = o.dataset.id; if (chiId && id !== chiId) return;
    const p = ST.diem[id]; if (!p) return;
    const ma = p.nhan[ST.nam], c = IDX.by[ma];
    o.classList.toggle("chon", LUOI.chon.has(id)); o.classList.toggle("da", !!ma);
    o.querySelector(".lo-nh").innerHTML = ma ? `<span class="sw" style="background:${c ? c.mau : "#999"}"></span>${esc(ma)}` : "";
    o.style.borderColor = ma && c ? c.mau : "";
    const gy = o.querySelector(".lo-gy");
    if (!GY.bat) { gy.textContent = ""; return; }
    if (gyMu(p)) { gy.textContent = "🙈"; gy.title = T("điểm gán mù: không hiện gợi ý"); return; }
    const g = gyDoan(p, ST.nam);
    if (g && g.ma) { const cg = IDX.by[g.ma]; gy.innerHTML = `<span class="sw" style="background:${cg ? cg.mau : "#999"}"></span>${esc(g.ma)} ${Math.round(100 * g.tin)}%`; gy.classList.toggle("thap", g.tin < GY.nguong); gy.title = g.top.map(([m, v]) => `${m} ${Math.round(100 * v)} %`).join(" · "); }
    else gy.textContent = g && g.thieu != null ? "" : "…";
  });
  const tt = P.querySelector('[data-l="tt"]'); if (tt) { const tr = luoiTrangDs(); tt.textContent = T("đã gán trang này {a}/{b}", {a: tr.filter(p => p.nhan[ST.nam]).length, b: tr.length}) + " · " + T("đã chọn {n}", {n: LUOI.chon.size}); }
}
function luoiNoi(P) {
  P.querySelectorAll("[data-l]").forEach(e => {
    const k = e.dataset.l;
    if (e.tagName === "BUTTON") e.onclick = () => {
      if (k === "dong") luoiMo(false);
      else if (k === "tr+" || k === "tr-") luoiTrang(k === "tr+" ? 1 : -1);
      else if (k === "nam+" || k === "nam-") luoiNam(k === "nam+" ? 1 : -1);
    };
    else if (e.tagName === "SELECT" || e.tagName === "INPUT") e.onchange = () => {
      if (k === "dien") LUOI.dien = e.checked;
      else if (k === "nguong") { GY.nguong = Math.max(0, Math.min(1, +e.value || 0)); gyLuu(); luoiNhan(); return; }
      else LUOI[k] = k === "loc" || k === "xep" ? e.value : +e.value;
      luoiLuu(); if (k !== "dien") { LUOI.ds = luoiDanhSach(); LUOI.trang = 0; LUOI.chon.clear(); luoiVe(); }
    };
  });
  P.querySelectorAll(".lo").forEach(o => {
    o.onclick = ev => {
      const id = o.dataset.id, tr = luoiTrangDs().map(p => p.id);
      if (ev.shiftKey && LUOI.cuoi && tr.includes(LUOI.cuoi)) { const a = tr.indexOf(LUOI.cuoi), b = tr.indexOf(id); tr.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => LUOI.chon.add(x)); }
      else if (LUOI.chon.has(id)) LUOI.chon.delete(id); else LUOI.chon.add(id);
      LUOI.cuoi = id; luoiNhan();
    };
    o.ondblclick = () => { const id = o.dataset.id; luoiMo(false); select(id, true); };
  });
}
function luoiTrang(d) {
  const nt = Math.max(1, Math.ceil(LUOI.ds.length / LUOI.co));
  if (d > 0 && LUOI.loc === "chua") {                // trang sau: bỏ các điểm vừa gán khỏi danh sách "chưa gán"
    const tr = new Set(luoiTrangDs().filter(p => p.nhan[ST.nam]).map(p => p.id));
    if (tr.size) { LUOI.ds = LUOI.ds.filter(p => !tr.has(p.id)); LUOI.chon.clear(); luoiVe(); return; }
  }
  LUOI.trang = Math.max(0, Math.min(nt - 1, LUOI.trang + d)); LUOI.chon.clear(); luoiVe();
}
function luoiNam(d) { stepYear(d); LUOI.ds = luoiDanhSach(); LUOI.trang = 0; LUOI.chon.clear(); luoiVe(); }
function luoiGan(ids, ma, nhan) {                    // gán (hoặc xoá) nhãn năm đang xem cho nhiều điểm; ghi gợi ý và ảnh đã xem
  const y = ST.nam, ys = years(); let n = 0;
  ids.forEach(id => {
    const p = ST.diem[id]; if (!p) return;
    GY.nhan = !!nhan; try { gyGhi(p, y, ma); } finally { GY.nhan = false; }
    CORE.setLabel(p, y, ma); n++;
    if (ma == null) { if (p.anh) delete p.anh[y]; return; }
    try { if (typeof s2oNguonAnh === "function") { p.anh = p.anh || {}; const d = s2oNguonAnh(p, y); d.luoi = 1; d.s = "luoi" + (d.s ? "; " + d.s : ""); p.anh[y] = d; } } catch (e) { /* bỏ */ }
    if (LUOI.dien) CORE.fillForward(p, ys, y);
  });
  GY.ver++; save(); luoiNhan(); renderProgress(); renderStats();
  return n;
}
function luoiNhanGoiY() {                            // Enter: ô đã chọn (mọi độ tin), không thì mọi ô chưa gán, không mù, đủ ngưỡng
  const tr = luoiTrangDs(), ds = LUOI.chon.size ? tr.filter(p => LUOI.chon.has(p.id)) : tr.filter(p => !p.nhan[ST.nam]);
  const theoLop = {};
  ds.forEach(p => { if (gyMu(p)) return; const g = gyDoan(p, ST.nam); if (!g || !g.ma || (!LUOI.chon.size && g.tin < GY.nguong)) return; (theoLop[g.ma] = theoLop[g.ma] || []).push(p.id); });
  let n = 0; Object.entries(theoLop).forEach(([ma, ids]) => { n += luoiGan(ids, ma, true); });
  LUOI.chon.clear(); luoiNhan();
  msg(n ? T("đã nhận gợi ý cho {n} điểm", {n}) : T("không có ô nào đủ điều kiện nhận gợi ý (điểm mù, chưa có gợi ý, hoặc dưới ngưỡng tin cậy)"), n ? "ok" : "wa", 2200);
}
document.addEventListener("keydown", e => {        // pha bắt: chạy trước bộ phím chung của trang
  const t = e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
  if (t === "BUTTON" && e.key === "Enter") return;
  if (LUOI.mo) {
    const k = e.key.toLowerCase(), chan = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if ((e.ctrlKey || e.metaKey) && k === "a") { luoiTrangDs().forEach(p => LUOI.chon.add(p.id)); luoiNhan(); return chan(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === "escape") { if (LUOI.chon.size) { LUOI.chon.clear(); luoiNhan(); } else luoiMo(false); return chan(); }
    if (k === "l" && !IDX.key.l) { luoiMo(false); return chan(); }
    if (k === "n" || k === "pagedown") { luoiTrang(1); return chan(); }
    if (k === "p" || k === "pageup") { luoiTrang(-1); return chan(); }
    if (k === "arrowleft" || k === "arrowright") { luoiNam(k === "arrowleft" ? -1 : 1); return chan(); }
    if (k === "enter") { luoiNhanGoiY(); return chan(); }
    if (k === "backspace" || k === "delete") { if (LUOI.chon.size) { luoiGan([...LUOI.chon], null); LUOI.chon.clear(); luoiNhan(); } return chan(); }
    if (IDX.key[k]) {
      if (!LUOI.chon.size) { msg(T("chọn ô trước (nhấp vào ô), rồi bấm phím lớp"), "wa", 1800); return chan(); }
      luoiGan([...LUOI.chon], IDX.key[k]); LUOI.chon.clear(); luoiNhan(); return chan();
    }
    return chan();                                   // các phím khác của chế độ điểm không chạy khi đang ở lưới
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if ($("dlgSet").open || $("dlgExp").open || $("dlgHelp").open) return;
  const k = e.key.toLowerCase();
  if (k === "l" && !IDX.key.l && !(typeof VG !== "undefined" && VG.mode)) { luoiMo(true); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (k === "enter" && gyNhan()) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
(function () {                                      // nút, ô chọn
  if ($("bLuoi")) $("bLuoi").onclick = () => luoiMo(true);
  if ($("ntSo")) { $("ntSo").value = String(NT.so); $("ntSo").onchange = () => { NT.so = +$("ntSo").value; ntLuu(); NT.xong.clear(); ntBatDau(0); }; }
  if ($("gyBat")) { $("gyBat").checked = !!GY.bat; $("gyBat").onchange = () => { GY.bat = $("gyBat").checked; gyLuu(); gyHop(); }; }
  if ($("gyMuPT")) { $("gyMuPT").value = GY.mu; $("gyMuPT").onchange = () => { GY.mu = Math.max(0, Math.min(50, +$("gyMuPT").value || 0)); gyLuu(); gyHop(); }; }
})();
["selStrip", "selStripR", "selStripCo"].forEach(id => { if ($(id)) $(id).addEventListener("change", () => { NT.xong.clear(); ntBatDau(); }); });
if (typeof phienNhap === "function") {              // tệp tiến độ của người khác mang theo p.gy (gợi ý lúc gán) qua CORE.merge
  const _phienNhap35 = phienNhap; phienNhap = async function () { const r = await _phienNhap35.apply(this, arguments); GY.ver++; return r; };
}
var _setLang35 = setLang;
setLang = function () { _setLang35.apply(this, arguments); ntTT(); if (LUOI.mo) luoiVe(); };
