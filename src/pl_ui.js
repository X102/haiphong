/* =============================== BẢN 2.7: TẠO BẢN ĐỒ LỚP PHỦ TỪ ĐIỂM MẪU (không học máy) =============================== */
/* Mỗi điểm ảnh về lớp của điểm mẫu (hoặc nguyên mẫu, tâm lớp) giống nó nhất, trên đúng các đặc trưng của công cụ chọn vùng.
   Độ giống: cosine trên đặc trưng đã chuẩn hoá (trừ trung bình, chia độ lệch chuẩn trong phạm vi), hoặc khoảng cách chuẩn hoá
   0..1 như công cụ chọn vùng. Kiểm định chéo trên chính các điểm mẫu, và cảnh báo: vùng xa mọi mẫu (cần thêm mẫu), cặp lớp
   lẫn nhau, lớp có hai nhóm mẫu khác hẳn nhau (nên tách), mẫu nghi gán nhầm, lớp ít mẫu, xã chưa có mẫu. */
const PL = {kq: null, hien: null, tok: 0, ma: {}};
const pl$ = id => document.getElementById(id);
const PL_MAX_REF = 300;                         // số đại diện tối đa khi so với từng điểm ảnh (rút gọn bằng k-means)
const BON_MAU = {1: "#2e9d3a", 2: "#1f5fbf", 3: "#d7191c", 4: "#b08a5a"}, BON_TEN = {1: "thực vật", 2: "nước", 3: "xây dựng", 4: "đất trống"};

function plCacBo() { return [...new Set(Object.values(ST.diem).map(p => p.bo))]; }
function plKhoa(ma, he) { if (he === "3") { const v = IDX.lop3(ma); return v >= 1 && v <= 4 ? v : null; } return IDX.by[ma] && !(SCHEME.dac_biet || []).some(c => c.ma === ma) ? ma : null; }
function plBoTot(y, he) {                       // bộ mẫu "dùng cho phân loại": nhiều lớp có từ 3 mẫu nhất ở năm y, rồi nhiều mẫu nhất
  const uu = MAN && MAN.point_sets ? (MAN.point_sets.find(s => s.phan_loai) || {}).id : null;
  let best = null;
  plCacBo().forEach(bo => { const dem = {}; Object.values(ST.diem).forEach(p => { if (p.bo !== bo) return; const k = plKhoa(p.nhan[y], he); if (k) dem[k] = (dem[k] || 0) + 1; });
    const s = [Object.values(dem).filter(n => n >= 3).length, Object.values(dem).reduce((a, b) => a + b, 0)];
    if (bo === uu && s[0] >= 2) s[0] += 1000;
    if (!best || s[0] > best.s[0] || (s[0] === best.s[0] && s[1] > best.s[1])) best = {bo, s}; });
  return best && best.s[1] ? best.bo : null;
}
function plMoTaLop(k, he) { return he === "3" ? {ten: T(BON_TEN[k]), mau: BON_MAU[k], v: k} : {ten: `${k} ${cten(IDX.by[k])}`, mau: IDX.by[k].mau, v: IDX.by[k].id}; }
async function plMo(on) {
  const P = pl$("plP"); P.hidden = on === false ? true : (on === true ? false : !P.hidden);
  if (P.hidden) return;
  if (!VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  const ys = [...new Set((MAN && MAN.s2d ? MAN.s2d.nam : []).concat(years()))].sort((a, b) => a - b), sn = pl$("plNam");
  sn.innerHTML = ys.map(y => `<option>${y}</option>`).join(""); sn.value = String(ys.includes(ST.nam) ? ST.nam : ys[ys.length - 1]);
  plVeBo(); pl$("plXa").innerHTML = v27DSXa(); pl$("plVung").innerHTML = v27DSVung();
  plVeDT(); plHien();
  if (PL.kq) { PL.kq.lop = PL.kq.keys.map(k => plMoTaLop(k, PL.kq.he)); plVeKQ(); }
}
function plVeBo() {
  const y = +pl$("plNam").value, he = pl$("plHe").value, tot = plBoTot(y, he), s = pl$("plBo"), cu = s.value;
  s.innerHTML = `<option value="">${T("tự chọn bộ đủ lớp nhất")}${tot ? " (" + esc(typeof boTen === "function" ? boTen(tot) : tot) + ")" : ""}</option><option value="*">${T("mọi bộ điểm (gộp)")}</option>` +
    plCacBo().map(b => `<option value="${esc(b)}">${esc(typeof boTen === "function" ? boTen(b) : b)}</option>`).join("");
  if ([...s.options].some(o => o.value === cu)) s.value = cu;
}
function plVeDT() {                               // đặc trưng: như công cụ chọn vùng (mặc định lấy đúng lựa chọn ở đó)
  const box = pl$("plDT"), ds = vgNguonDT(), cu = ls("laymau_hp_pl_dt_v1") || ls("laymau_hp_vung_dt_v1") || ds.filter(d => d.nhom === "s2").map(d => d.id), chon = new Set(cu);
  box.innerHTML = VG_NHOM.map(([nh, ten]) => { const it = ds.filter(d => d.nhom === nh); if (!it.length) return "";
    return `<details${it.some(d => chon.has(d.id)) ? " open" : ""}><summary>${T(ten)}</summary>` + it.map(d => `<label style="display:inline-flex;margin-right:8px"><input type="checkbox" value="${d.id}"${chon.has(d.id) ? " checked" : ""}> ${esc(d.ten)}</label>`).join("") + `</details>`; }).join("");
  box.querySelectorAll("input").forEach(i => { i.onchange = () => ls("laymau_hp_pl_dt_v1", plDT()); });
}
function plDT() { return [...pl$("plDT").querySelectorAll("input:checked")].map(i => i.value); }
function plHien() { const pv = pl$("plPV").value; pl$("plXaW").hidden = pv !== "xa"; pl$("plVungW").hidden = pv !== "vung"; pl$("plK").disabled = !/_mau$/.test(pl$("plPP").value); }
const plTre = () => new Promise(r => setTimeout(r, 0));

/* ---------- toán ---------- */
function plChuan(v, mu, a, out) { let s = 0; for (let c = 0; c < v.length; c++) { const z = (v[c] - mu[c]) * a[c]; out[c] = z; s += z * z; } s = Math.sqrt(s) || 1; for (let c = 0; c < v.length; c++) out[c] /= s; return out; }
function plGiong(x, r, cos, s) { let t = 0; if (cos) { for (let c = 0; c < x.length; c++) t += x[c] * r[c]; return t; } for (let c = 0; c < x.length; c++) { const e = x[c] - r[c]; t += e * e; } return 1 - Math.sqrt(t) * s; }
function plThamChieu(V, lab, K, pp, max) {       // đại diện: [{v, k}]
  const cos = pp.startsWith("cos"), out = [], n = V.length, nf = V[0].length;
  for (let k = 0; k < K; k++) {
    const Vk = V.filter((_, i) => lab[i] === k); if (!Vk.length) continue;
    let R;
    if (/_tam$/.test(pp)) { const m = new Float32Array(nf); Vk.forEach(v => { for (let c = 0; c < nf; c++) m[c] += v[c] / Vk.length; }); R = [m]; }
    else if (/_nm$/.test(pp)) R = CORE.kMeans(Vk.map(v => Array.from(v)), nf, Math.min(6, Math.max(1, Math.round(Vk.length / 4))), 20, 7 + k);
    else { const q = Math.max(1, Math.round(max * Vk.length / n)); R = Vk.length > q ? CORE.kMeans(Vk.map(v => Array.from(v)), nf, q, 12, 11 + k) : Vk; }
    R.forEach(r => { let v = Float32Array.from(r); if (cos) { let s = 0; for (let c = 0; c < nf; c++) s += v[c] * v[c]; s = Math.sqrt(s) || 1; v = v.map(x => x / s); } out.push({v, k}); });
  }
  return out;
}
function plXep(x, refs, K, cos, s, kv) {         // -> {k: lớp, s1: độ giống lớn nhất, m: chênh với lớp thứ hai, k2}
  const best = new Float32Array(K).fill(-Infinity);
  let top = null;
  if (kv > 1) top = [];
  for (let r = 0; r < refs.length; r++) { const g = plGiong(x, refs[r].v, cos, s), k = refs[r].k; if (g > best[k]) best[k] = g;
    if (top) { if (top.length < kv) { top.push([g, k]); top.sort((a, b) => a[0] - b[0]); } else if (g > top[0][0]) { top[0] = [g, k]; top.sort((a, b) => a[0] - b[0]); } } }
  let k1 = 0; for (let k = 1; k < K; k++) if (best[k] > best[k1]) k1 = k;
  let kw = k1;
  if (top) { const w = new Float32Array(K); top.forEach(([g, k]) => { w[k] += 1 + 1e-3 * g; }); kw = 0; for (let k = 1; k < K; k++) if (w[k] > w[kw]) kw = k; }
  let k2 = -1; for (let k = 0; k < K; k++) if (k !== kw && best[k] > -Infinity && (k2 < 0 || best[k] > best[k2])) k2 = k;
  return {k: kw, s1: best[k1], m: k2 < 0 ? 1 : best[kw] - best[k2], k2};
}
function plKiemDinh(V, lab, K, pp, kv, s) {      // nhãn dự đoán của từng mẫu: bỏ-một-ra (mẫu) hoặc 5 phần (nguyên mẫu, tâm)
  const cos = pp.startsWith("cos"), n = V.length, du = new Int16Array(n).fill(-1), mg = new Float32Array(n);
  if (/_mau$/.test(pp)) {
    const all = V.map((v, i) => ({v, k: lab[i]}));
    for (let i = 0; i < n; i++) { const r = plXep(V[i], all.filter((_, j) => j !== i), K, cos, s, kv); du[i] = r.k; mg[i] = r.m; }
  } else {
    const fold = new Int8Array(n), dem = new Int32Array(K); for (let i = 0; i < n; i++) fold[i] = (dem[lab[i]]++) % 5;
    for (let f = 0; f < 5; f++) { const tr = [], tl = []; for (let i = 0; i < n; i++) if (fold[i] !== f) { tr.push(V[i]); tl.push(lab[i]); }
      if (!tr.length) continue; const refs = plThamChieu(tr, tl, K, pp, PL_MAX_REF);
      for (let i = 0; i < n; i++) if (fold[i] === f) { const r = plXep(V[i], refs, K, cos, s, 1); du[i] = r.k; mg[i] = r.m; } }
  }
  const M = Array.from({length: K}, () => new Float64Array(K)); for (let i = 0; i < n; i++) if (du[i] >= 0) M[lab[i]][du[i]]++;
  return {du, mg, M};
}
function plTach(V, lab, K) {                      // lớp có hai nhóm mẫu khác hẳn nhau: 2-means, khoảng cách hai tâm / độ tản trong nhóm
  const out = [];
  for (let k = 0; k < K; k++) {
    const idx = []; lab.forEach((q, i) => { if (q === k) idx.push(i); }); if (idx.length < 6) continue;
    const X = idx.map(i => Array.from(V[i])), nf = X[0].length, C = CORE.kMeans(X, nf, 2, 25, 5 + k); if (C.length < 2) continue;
    const d2 = (a, b) => { let t = 0; for (let c = 0; c < nf; c++) { const e = a[c] - b[c]; t += e * e; } return Math.sqrt(t); };
    const g = X.map(x => d2(x, C[0]) <= d2(x, C[1]) ? 0 : 1), n1 = g.filter(v => v === 1).length;
    if (n1 < 3 || idx.length - n1 < 3) continue;
    const trong = X.reduce((s, x, i) => s + d2(x, C[g[i]]), 0) / X.length, tach = d2(C[0], C[1]) / Math.max(trong, 1e-9);
    if (tach >= 2.2) out.push({k, tach, nhom: [idx.filter((_, i) => g[i] === 0), idx.filter((_, i) => g[i] === 1)]});
  }
  return out;
}

/* ---------- bản 3.12: mẫu huấn luyện ngoài phạm vi (vùng xung quanh, mọi điểm đã gán) ---------- */
/* Đặc trưng tại mẫu ngoài phạm vi đọc trên các lưới nhỏ CÙNG bước, CÙNG gốc với lưới phân tích, và cùng thang đổi byte của lưới đó
   (PC, độ cao DEM lấy phân vị trên phạm vi): giá trị đúng như khi lưới phân tích phủ tới chỗ mẫu. Chuẩn hoá (trừ trung bình, chia
   độ lệch chuẩn) vẫn tính trên phạm vi cần phân loại. */
const PL_MAX_NGOAI = 1500;                      // số mẫu ngoài phạm vi tối đa (gần phạm vi nhất trước)
function plKhoangCach(PV) {                     // (lon, lat) -> khoảng cách mặt đất (m) tới ranh giới phạm vi
  let rings;
  if (PV.mp) rings = [].concat(...PV.mp);
  else { const a = CORE.m2ll(PV.bb[0], PV.bb[1]), b = CORE.m2ll(PV.bb[2], PV.bb[3]); rings = [[[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]]]; }
  return (lon, lat) => {
    const kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110574; let best = Infinity;
    for (const rg of rings) for (let i = 1; i < rg.length; i++) {
      const ax = (rg[i - 1][0] - lon) * kx, ay = (rg[i - 1][1] - lat) * ky, bx = (rg[i][0] - lon) * kx, by = (rg[i][1] - lat) * ky;
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
      const d = Math.hypot(ax + t * dx, ay + t * dy); if (d < best) best = d;
    }
    return best;
  };
}
async function plDocNgoai(g, y, ids, sc, ds, tien) {   // ds: [{p}] -> gán o.raw (Uint8Array nf) cho mẫu đọc được
  const res = g.res, B = 256 * res, m = 10, nhom = new Map();
  ds.forEach(o => { const q = CORE.to3857(o.p.lon, o.p.lat); o.mx = q[0]; o.my = q[1];
    const k = Math.floor(q[0] / B) + "," + Math.floor(q[1] / B); if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(o); });
  let i = 0;
  for (const nh of nhom.values()) {
    const xs = nh.map(o => o.mx), ys = nh.map(o => o.my);
    const i0 = Math.floor((Math.min(...xs) - g.x0) / res) - m, i1 = Math.ceil((Math.max(...xs) - g.x0) / res) + m;
    const j0 = Math.floor((g.y1 - Math.max(...ys)) / res) - m, j1 = Math.ceil((g.y1 - Math.min(...ys)) / res) + m;
    const gc = {x0: g.x0 + i0 * res, y1: g.y1 - j0 * res, res, w: i1 - i0, h: j1 - j0}; gc.bb = [gc.x0, gc.y1 - gc.h * res, gc.x0 + gc.w * res, gc.y1];
    if (tien && (await tien(++i, nhom.size)) === false) return false;
    let S = null;
    try { const D = await vgDoc(gc, y, ids, sc, {khongLop: true}); S = CORE.stackFeat(D.lst, gc.w * gc.h); } catch (e) { S = null; }   // khối ngoài vùng dữ liệu: bỏ
    if (!S) continue;
    nh.forEach(o => { const px = Math.floor((o.mx - gc.x0) / res), py = Math.floor((gc.y1 - o.my) / res), k = py * gc.w + px;
      if (px >= 0 && py >= 0 && px < gc.w && py < gc.h && S.valid[k]) o.raw = S.F.slice(k * S.nf, k * S.nf + S.nf); });
  }
  return true;
}
function plNguonTen(K) {                        // mô tả nguồn mẫu huấn luyện
  const n = K.nguon || "trong";
  return n === "trong" ? T("trong phạm vi") : n === "all" ? T("mọi điểm đã gán (gần phạm vi nhất trước)") : T("phạm vi và vùng xung quanh {d} km", {d: n.slice(1)});
}

/* ---------- chạy ---------- */
async function plChay() {
  const tok = ++PL.tok, tt = pl$("plTT"), y = +pl$("plNam").value, he = pl$("plHe").value, pp = pl$("plPP").value, kv = /_mau$/.test(pp) ? Math.max(1, +pl$("plK").value || 1) : 1;
  const cos = pp.startsWith("cos");
  try {
    if (!MAN) throw new Error(T("chưa nạp manifest"));
    const ids = plDT(); if (!ids.length) throw new Error(T("chọn ít nhất một đặc trưng"));
    const PV = v27PhamVi(pl$("plPV").value, [...pl$("plXa").selectedOptions].map(o => +o.value), pl$("plVung").value);
    const g = CORE.gridFor(PV.bb, +pl$("plLuoi").value || 900, {x0: 0, y1: 0, res0: 10}), N = g.w * g.h;
    tt.textContent = T("đang đọc đặc trưng năm {y}…", {y});
    const sc = {}, D = await vgDoc(g, y, ids, sc); if (tok !== PL.tok) return;
    const S = CORE.stackFeat(D.lst, N), nf = S.nf, F = S.F;
    const vung = PV.mp ? CORE.rasterizeRings(CORE.polysToPixRings(g, PV.mp), g.w, g.h) : null;
    const bo = pl$("plBo").value || plBoTot(y, he), dac = new Set((SCHEME.dac_biet || []).map(c => c.ma));
    const nguon = (pl$("plNguon") && pl$("plNguon").value) || "trong", ngoai = [];
    const mau = Object.values(ST.diem).filter(p => (bo === "*" || p.bo === bo) && p.nhan[y] && !dac.has(p.nhan[y])).map(p => {
      const k = plKhoa(p.nhan[y], he); if (!k) return null;
      const q = CORE.llToPix(g, p.lon, p.lat), x = Math.floor(q[0]), yy = Math.floor(q[1]);
      if (x < 0 || yy < 0 || x >= g.w || yy >= g.h) { if (nguon !== "trong") ngoai.push({p, key: k, ngoai: true}); return null; }
      const i = yy * g.w + x; return S.valid[i] ? {p, i, key: k} : null; }).filter(Boolean);
    let dNgoai = 0, catBot = 0;
    if (ngoai.length) {                           // bản 3.12: mẫu ngoài phạm vi trong vùng xung quanh (hoặc mọi điểm), gần trước
      const dMax = nguon === "all" ? Infinity : +nguon.slice(1) * 1000, dk = plKhoangCach(PV);
      ngoai.forEach(o => { o.d = dk(o.p.lon, o.p.lat); });
      let chon = ngoai.filter(o => o.d <= dMax).sort((p, q) => p.d - q.d);
      if (chon.length > PL_MAX_NGOAI) { catBot = chon.length - PL_MAX_NGOAI; chon = chon.slice(0, PL_MAX_NGOAI); }
      if (chon.length) {
        const ok = await plDocNgoai(g, y, ids, sc, chon, async (i, n) => { tt.textContent = T("đang đọc đặc trưng tại {m} mẫu ngoài phạm vi ({i}/{n} khối)…", {m: chon.length, i, n}); await plTre(); return tok === PL.tok; });
        if (!ok || tok !== PL.tok) return;
        chon.filter(o => o.raw).forEach(o => { mau.push(o); dNgoai = Math.max(dNgoai, o.d); });
      }
    }
    const keys = [...new Set(mau.map(m => m.key))].sort((a, b) => he === "3" ? a - b : SCHEME.lop.findIndex(c => c.ma === a) - SCHEME.lop.findIndex(c => c.ma === b));
    if (keys.length < 2) throw new Error(T("cần điểm mẫu có nhãn năm {y} của ít nhất hai lớp nằm trong phạm vi", {y}) + (nguon === "trong" ? "; " + T("hoặc chọn Mẫu huấn luyện: thêm vùng xung quanh, mọi điểm đã gán") : ""));
    const K = keys.length, lab = mau.map(m => keys.indexOf(m.key)), lop = keys.map(k => plMoTaLop(k, he));
    // thống kê chuẩn hoá trên phạm vi
    const buoc = Math.max(1, Math.floor(N / 150000)), mu = new Float64Array(nf), sq = new Float64Array(nf); let n0 = 0;
    for (let i = 0; i < N; i += buoc) { if (!S.valid[i] || (vung && !vung[i])) continue; n0++; for (let c = 0; c < nf; c++) { const v = F[i * nf + c]; mu[c] += v; sq[c] += v * v; } }
    if (n0 < 10) throw new Error(T("phạm vi này gần như không có dữ liệu"));
    const a = new Float64Array(nf); for (let c = 0; c < nf; c++) { mu[c] /= n0; a[c] = 1 / Math.max(Math.sqrt(Math.max(sq[c] / n0 - mu[c] * mu[c], 0)), 1); }
    const s = 1 / (255 * Math.sqrt(nf)), raw = i => F.subarray(i * nf, i * nf + nf);
    const vec = i => cos ? plChuan(raw(i), mu, a, new Float32Array(nf)) : Float32Array.from(raw(i));
    const V = mau.map(m => m.ngoai ? (cos ? plChuan(m.raw, mu, a, new Float32Array(nf)) : Float32Array.from(m.raw)) : vec(m.i));
    const refs = plThamChieu(V, lab, K, pp, PL_MAX_REF);
    // phân loại từng điểm ảnh
    const cls = new Uint8Array(N), s1 = new Float32Array(N).fill(NaN), mg = new Float32Array(N), k2 = new Int8Array(N).fill(-1), x = new Float32Array(nf);
    const chay = []; for (let i = 0; i < N; i++) if (S.valid[i] && (!vung || vung[i])) chay.push(i);
    for (let q = 0; q < chay.length; q++) {
      const i = chay[q], v = cos ? plChuan(raw(i), mu, a, x) : raw(i), r = plXep(v, refs, K, cos, s, kv);
      cls[i] = r.k + 1; s1[i] = r.s1; mg[i] = r.m; k2[i] = r.k2;
      if (q % 40000 === 39999) { tt.textContent = T("đang phân loại {p} %…", {p: Math.round(100 * q / chay.length)}); await plTre(); if (tok !== PL.tok) return; }
    }
    tt.textContent = T("đang kiểm định, tìm chỗ cần thêm mẫu…"); await plTre();
    const KD = plKiemDinh(V, lab, K, pp, kv, s);
    // ngưỡng "xa mọi mẫu": phân vị 5 % độ giống của mỗi mẫu với mẫu khác gần nhất (hoặc với đại diện gần nhất)
    const gm = V.map((v, i) => { let b = -Infinity; if (/_mau$/.test(pp)) { V.forEach((u, j) => { if (j !== i) b = Math.max(b, plGiong(v, u, cos, s)); }); } else refs.forEach(r => { b = Math.max(b, plGiong(v, r.v, cos, s)); }); return b; });
    const tau = V.length >= 20 ? CORE.phanVi(gm, 0.05) : Math.min(...gm), m0 = cos ? 0.02 : 0.01;
    const xa = new Uint8Array(N), lan = new Uint8Array(N); let haXa = 0, haLan = 0, tong = 0; const ra = CORE.rowArea(g), cap = {}, dt = new Float64Array(K);
    for (const i of chay) { const j = Math.floor(i / g.w), ha = ra[j] / 1e4; tong += ha; dt[cls[i] - 1] += ha;
      if (s1[i] < tau) { xa[i] = 1; haXa += ha; }
      if (mg[i] < m0 && k2[i] >= 0) { lan[i] = 1; haLan += ha; const t = [cls[i] - 1, k2[i]].sort((p, q) => p - q).join(","); cap[t] = (cap[t] || 0) + ha; } }
    // vùng xa mọi mẫu: các mảng liền, lớn nhất trước
    const minPx = Math.max(1, Math.round(1e4 / Math.pow(g.res * Math.cos(map.getCenter().lat * Math.PI / 180), 2))), LC = CORE.labelComp(CORE.removeSmall(xa, g.w, g.h, minPx), g.w, g.h, 8, 1);
    const manh = []; if (LC.n) { const acc = new Map(); for (let i = 0; i < N; i++) { const l = LC.lab[i]; if (!l) continue; const o = acc.get(l) || {n: 0, ha: 0, sx: 0, sy: 0, lop: new Float64Array(K)};
        const xx = i % g.w, yy = (i - xx) / g.w, ha = ra[yy] / 1e4; o.n++; o.ha += ha; o.sx += xx; o.sy += yy; o.lop[cls[i] - 1] += ha; acc.set(l, o); }
      acc.forEach(o => { const ll = CORE.pixToLL(g, o.sx / o.n + 0.5, o.sy / o.n + 0.5); let kk = 0; for (let k = 1; k < K; k++) if (o.lop[k] > o.lop[kk]) kk = k;
        manh.push({ha: o.ha, lon: ll[0], lat: ll[1], k: kk, xa: VG.xa ? (vgXaTai(ll[0], ll[1]) || {}).ten : null}); });
      manh.sort((p, q) => q.ha - p.ha); }
    const tach = plTach(V, lab, K), sai = [];
    mau.forEach((m, i) => { if (KD.du[i] >= 0 && KD.du[i] !== lab[i]) sai.push({id: m.p.id, that: lab[i], du: KD.du[i], mg: KD.mg[i]}); });
    sai.sort((p, q) => q.mg - p.mg);
    const soMau = new Int32Array(K), soNgoai = new Int32Array(K); lab.forEach((k, i) => { soMau[k]++; if (mau[i].ngoai) soNgoai[k]++; });
    const Mt = Array.from({length: K}, () => new Float64Array(K)); mau.forEach((m, i) => { if (!m.ngoai && KD.du[i] >= 0) Mt[lab[i]][KD.du[i]]++; });
    let xaTrong = []; if (VG.xa) { const XI = vgXaIdx(g), haX = {}, coMau = new Set(); for (const i of chay) if (XI[i]) haX[XI[i]] = (haX[XI[i]] || 0) + ra[Math.floor(i / g.w)] / 1e4;
      mau.forEach(m => { if (!m.ngoai && XI[m.i]) coMau.add(XI[m.i]); });
      xaTrong = Object.entries(haX).filter(([x0, h]) => !coMau.has(+x0) && h >= 0.01 * tong).map(([x0, h]) => ({ten: (VG.xa.find(q => q.i === +x0) || {}).ten || x0, ha: h, x: +x0})).sort((p, q) => q.ha - p.ha); }
    if (tok !== PL.tok) return;
    PL.kq = {g, PV, y, he, pp, kv, bo, K, keys, lop, cls, s1, mg, xa, lan, tau, m0, dt, tong, haXa, haLan, cap, manh, tach, sai, soMau, xaTrong, KD, mau, lab, nMau: mau.length, nRef: refs.length, ids, chay: chay.length,
      nguon, soNgoai, nNgoai: mau.filter(m => m.ngoai).length, dNgoai, catBot, Mt};
    plVeKQ(); pl$("plKQ").hidden = false;
    tt.textContent = T("xong: {n} điểm mẫu, {k} lớp, {h} ha", {n: mau.length, k: K, h: tong.toFixed(0)});
  } catch (e) { if (tok === PL.tok) tt.textContent = T("lỗi: ") + (typeof vgLoiDoc === "function" ? vgLoiDoc(e) : (e.message || e)); }
  TIFF_PT.clear();
}

/* ---------- kết quả ---------- */
function plCanhBao(K_) {                          // danh sách cảnh báo, nhận xét (mỗi mục một hành động)
  const K = K_, L = [], ten = k => esc(K.lop[k].ten), pct = v => (100 * v / Math.max(K.tong, 1e-9)).toFixed(1);
  if (K.haXa > 0) L.push({muc: "thieu", t: T("{h} ha ({p} %) xa mọi điểm mẫu: nên lấy thêm mẫu ở đó", {h: K.haXa.toFixed(1), p: pct(K.haXa)}),
    ds: K.manh.slice(0, 10).map((m, i) => ({t: T("mảng {i}: {h} ha, gần giống {l}", {i: i + 1, h: m.ha.toFixed(1), l: ten(m.k)}) + (m.xa ? " · " + esc(m.xa) : ""), bay: [m.lon, m.lat], them: true}))});
  Object.entries(K.cap).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([t, h]) => { if (h < 0.005 * K.tong) return; const [p, q] = t.split(",").map(Number);
    L.push({muc: "lan", t: T("{a} và {b} khó phân biệt trên {h} ha: thêm mẫu ở ranh giới hai lớp, thêm đặc trưng (chỉ số, CTX, PC), hoặc cân nhắc gộp nếu vẫn không tách được", {a: ten(p), b: ten(q), h: h.toFixed(1)})}); });
  K.tach.forEach(o => L.push({muc: "tach", t: T("{l}: các mẫu chia thành hai nhóm khác hẳn nhau ({a} và {b} điểm, độ tách {s}): nên tách thành hai lớp con, hoặc kiểm tra lại nhãn của nhóm nhỏ", {l: ten(o.k), a: o.nhom[0].length, b: o.nhom[1].length, s: o.tach.toFixed(1)}),
    ds: o.nhom.map((g, j) => ({t: T("nhóm {j}: {ids}", {j: j + 1, ids: g.slice(0, 12).map(i => K.mau[i].p.id).join(", ") + (g.length > 12 ? "…" : "")}), diem: g.map(i => K.mau[i].p.id)}))}));
  if (K.sai.length) L.push({muc: "sai", t: T("{n} điểm mẫu bị kiểm định chéo xếp vào lớp khác: xem lại nhãn (đầu danh sách là chỗ chắc chắn nhất)", {n: K.sai.length}),
    ds: K.sai.slice(0, 15).map(o => ({t: `${esc(o.id)}: ${ten(o.that)} → ${ten(o.du)}`, diem: [o.id]}))});
  if (K.nNgoai) Array.from(K.soMau).forEach((n, k) => { if (n && K.soNgoai[k] === n) L.push({muc: "ngoai", t: T("{l} chỉ có mẫu ngoài phạm vi ({n} điểm): bản đồ dựa vào mẫu nơi khác; nên lấy vài mẫu của lớp này ngay trong phạm vi để kiểm tra", {l: ten(k), n})}); });
  Array.from(K.soMau).forEach((n, k) => { if (n < 5) L.push({muc: "it", t: T("{l} chỉ có {n} điểm mẫu: nên có ít nhất 5 đến 10 mẫu rải khắp phạm vi", {l: ten(k), n})}); });
  Array.from(K.dt).forEach((h, k) => { if (h > 0.2 * K.tong && K.soMau[k] < 0.05 * K.nMau) L.push({muc: "lech", t: T("{l} chiếm {p} % diện tích nhưng chỉ {n} % số mẫu: nên thêm mẫu cho lớp này", {l: ten(k), p: pct(h), n: (100 * K.soMau[k] / K.nMau).toFixed(0)})}); });
  if (K.xaTrong.length) L.push({muc: "xa", t: T("{n} xã chưa có điểm mẫu nào (mỗi xã từ 1 % diện tích phạm vi)", {n: K.xaTrong.length}),
    ds: K.xaTrong.slice(0, 10).map(x => ({t: `${esc(x.ten)}: ${x.ha.toFixed(0)} ${T("ha")}`, xaI: x.x}))});
  const thieu = K.he === "3" ? [1, 2, 3].filter(k => !K.keys.includes(k)).map(k => T(BON_TEN[k])) : (SCHEME.lop || []).filter(c => c.bat_buoc && !K.keys.includes(c.ma)).map(c => c.ma);
  if (thieu.length) L.push({muc: "vang", t: T("không có mẫu cho: {l}, nên bản đồ không có các lớp này", {l: thieu.join(", ")})});
  return L;
}
function plVeKQ() {
  const K = PL.kq; if (!K) return;
  const M = K.KD.M, n = M.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0), kk = kappa27(M);
  const f1 = M.map((r, k) => { const tp = r[k], rs = r.reduce((a, b) => a + b, 0), cs = M.reduce((s, q) => s + q[k], 0); const p = cs ? tp / cs : 0, rr = rs ? tp / rs : 0; return {p, r: rr, f: p + rr ? 2 * p * rr / (p + rr) : 0}; });
  PL.cb = plCanhBao(K);
  const ppT = {cos_mau: T("cosine, k mẫu gần nhất bỏ phiếu"), cos_nm: T("cosine, nguyên mẫu từng lớp (k-means)"), ecl_mau: T("khoảng cách chuẩn hoá, mẫu gần nhất (như chọn vùng)"), ecl_tam: T("khoảng cách chuẩn hoá, tâm lớp")}[K.pp];
  pl$("plTom").innerHTML = `<p>${T("Năm {y}, {v}: {k} lớp từ {n} điểm mẫu ({bo}); {pp}{kv}; {f} đặc trưng.", {y: K.y, v: esc(v27TenPV(K.PV)), k: K.K, n: K.nMau,
      bo: esc(K.bo === "*" ? T("mọi bộ điểm") : (typeof boTen === "function" ? boTen(K.bo) : K.bo)), pp: ppT, kv: /_mau$/.test(K.pp) && K.kv > 1 ? ` (k = ${K.kv})` : "", f: K.ids.length})}</p>` +
    (K.nNgoai ? `<p>${T("Mẫu huấn luyện: {a} trong phạm vi, {b} ngoài phạm vi (xa nhất {d} km; nguồn: {s}).", {a: K.nMau - K.nNgoai, b: K.nNgoai, d: (K.dNgoai / 1000).toFixed(1), s: plNguonTen(K)})}` +
      (K.catBot ? " " + T("Bỏ {n} mẫu xa hơn (tối đa {m} mẫu ngoài phạm vi).", {n: K.catBot, m: PL_MAX_NGOAI}) : "") + `</p>` : "") +
    `<p>${T("Kiểm định chéo trên các điểm mẫu: đúng {oa} %, kappa {kp} (lạc quan hơn độ chính xác thật vì mẫu thường lấy ở chỗ dễ nhận).", {oa: (100 * kk.oa).toFixed(1), kp: kk.kappa.toFixed(2)})}` +
      (K.nNgoai ? (() => { const nt = K.Mt.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0), dt = K.Mt.reduce((s, r, i) => s + r[i], 0);
        return " " + (nt ? T("Riêng {n} mẫu trong phạm vi: đúng {oa} %.", {n: nt, oa: (100 * dt / nt).toFixed(1)}) : T("Không có mẫu nào trong phạm vi để kiểm tra riêng.")); })() : "") + `</p>` +
    `<p>${T("Xa mọi mẫu: {a} ha; khó phân biệt giữa hai lớp: {b} ha.", {a: K.haXa.toFixed(1), b: K.haLan.toFixed(1)})}${K.nRef < K.nMau ? " " + T("(so với {r} đại diện rút gọn từ {n} mẫu)", {r: K.nRef, n: K.nMau}) : ""}</p>` +
    `<p class="mu sm">${T("Phân loại không học máy: mỗi điểm ảnh về lớp của mẫu giống nó nhất. Kết quả phụ thuộc trực tiếp vào độ phủ và độ sạch của bộ mẫu; xem các cảnh báo.")}` +
      (K.nNgoai ? " " + T("Mẫu ngoài phạm vi giúp đủ lớp, nhưng nơi khác có thể khác điều kiện (đất, mùa vụ, ảnh): so độ đúng riêng của mẫu trong phạm vi, thấp thì lấy thêm mẫu tại chỗ.") : "") + `</p>`;
  pl$("plDTBang").innerHTML = `<table><tr><th>${T("lớp")}</th><th>${T("mẫu")}</th><th>${T("ha")}</th><th>%</th></tr>` + K.lop.map((l, k) =>
    `<tr><td><i class="sw" style="background:${l.mau}"></i> ${esc(l.ten)}</td><td>${K.soMau[k]}${K.nNgoai && K.soNgoai[k] ? ` <span class="mu">(${K.soNgoai[k]} ${T("ngoài")})</span>` : ""}</td><td>${K.dt[k].toFixed(1)}</td><td>${(100 * K.dt[k] / Math.max(K.tong, 1e-9)).toFixed(1)}</td></tr>`).join("") + `</table>`;
  pl$("plKDBang").innerHTML = `<p class="mu sm">${T("Hàng: nhãn; cột: lớp dự đoán khi bỏ mẫu đó ra (hoặc chia 5 phần). Số điểm mẫu.")}</p><table><tr><th></th>` + K.lop.map(l => `<th>${esc(l.ten.split(" ")[0])}</th>`).join("") + `<th>${T("độ phủ")}</th></tr>` +
    M.map((r, i) => `<tr><th>${esc(K.lop[i].ten)}</th>` + Array.from(r).map((v, j) => `<td class="${i === j ? "dg" : ""}">${v || ""}</td>`).join("") + `<td>${(100 * f1[i].r).toFixed(0)} %</td></tr>`).join("") +
    `<tr><th>${T("độ chính xác")}</th>` + f1.map(q => `<td>${(100 * q.p).toFixed(0)} %</td>`).join("") + `<td></td></tr></table>`;
  pl$("plCB").innerHTML = PL.cb.length ? PL.cb.map((c, i) => `<div class="cb27 cb-${c.muc}"><b>${c.t}</b>` + (c.ds || []).map((d, j) =>
      `<div class="sm">${d.t} ${d.bay ? `<button type="button" data-cb="${i},${j},bay">${T("xem")}</button>` : ""}${d.them ? `<button type="button" data-cb="${i},${j},them">${T("thêm điểm")}</button>` : ""}` +
      `${d.diem ? `<button type="button" data-cb="${i},${j},diem">${T("chọn điểm")}</button>` : ""}${d.xaI ? `<button type="button" data-cb="${i},${j},xa">${T("xem")}</button>` : ""}</div>`).join("") + `</div>`).join("")
    : `<p>${T("Không có cảnh báo.")}</p>`;
  pl$("plCB").querySelectorAll("[data-cb]").forEach(b => { b.onclick = () => { const [i, j, h] = b.dataset.cb.split(","), d = PL.cb[+i].ds[+j];
    if (h === "bay") map.setView([d.bay[1], d.bay[0]], Math.max(map.getZoom(), 15));
    else if (h === "them") { map.setView([d.bay[1], d.bay[0]], Math.max(map.getZoom(), 16)); const p = themDiemTai(d.bay[0], d.bay[1]); msg(T("đã thêm điểm {id}: gán nhãn năm {y} cho điểm này", {id: p.id, y: PL.kq.y}), "ok", 5000); }
    else if (h === "diem") { if (ST.diem[d.diem[0]]) { ST.bo = ST.diem[d.diem[0]].bo; buildSetSelect(); select(d.diem[0], true); } msg(d.diem.join(", "), "ok", 8000); }
    else if (h === "xa") { const x = VG.xa.find(q => q.i === d.xaI); if (x) map.fitBounds([[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]]); } }; });
  pl$("plTen").value = pl$("plTen").value || `${T("Phân loại")} ${K.y} · ${v27TenPV(K.PV)}`.slice(0, 80);
  plVe();
}
function plCanvas(K, mode) {                      // bản 2.9: vẽ kết quả phân loại lên canvas (dùng cho bản đồ và cho xuất bản đồ)
  const g = K.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(g.w, g.h), d = img.data, rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], mau = K.lop.map(l => rgb(l.mau));
  for (let i = 0; i < g.w * g.h; i++) {
    if (!K.cls[i]) continue; let o = null, al = 205;
    if (mode === "lop") o = mau[K.cls[i] - 1];
    else if (mode === "tin") { const t = Math.max(0, Math.min(1, (K.s1[i] - K.tau) / Math.max(1e-6, 1 - K.tau))); const v = Math.round(255 * t); o = [255 - v, v, 60]; al = 180; }
    else if (mode === "cb") { if (K.xa[i]) o = [236, 72, 153]; else if (K.lan[i]) o = [245, 158, 11]; }
    if (o) { d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = al; }
  }
  ctx.putImageData(img, 0, 0); c._mode = mode; return c;
}
function plVe() {
  const K = PL.kq; if (PL.hien) { map.removeLayer(PL.hien); PL.hien = null; } if (!K) return;
  const mode = pl$("plXem").value; if (mode === "tat") { pl$("plLeg").innerHTML = ""; return; }
  const c = plCanvas(K, mode); if (!c) return; const g = K.g;
  const A = CORE.m2ll(g.bb[0], g.bb[1]), B = CORE.m2ll(g.bb[2], g.bb[3]);
  PL.canvas = c;
  PL.hien = L.imageOverlay(c.toDataURL(), [[A[1], A[0]], [B[1], B[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 458}).addTo(map);
  const el = PL.hien.getElement && PL.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
  const sw = h => `<i style="background:${h}"></i>`;
  pl$("plLeg").innerHTML = `<div class="leg">` + (mode === "lop" ? K.lop.map(l => `<span>${sw(l.mau)}${esc(l.ten)}</span>`).join("") :
    mode === "tin" ? `<span>${sw("#ff003c")}${T("ít giống mẫu")}</span><span>${sw("#00ff3c")}${T("rất giống mẫu")}</span>` :
    `<span>${sw("#ec4899")}${T("xa mọi mẫu: cần thêm mẫu")}</span><span>${sw("#f59e0b")}${T("khó phân biệt hai lớp")}</span>`) + `</div>`;
}
function plGiaTri(K) { const v = new Uint8Array(K.cls.length); const m = K.lop.map(l => l.v); for (let i = 0; i < v.length; i++) if (K.cls[i]) v[i] = m[K.cls[i] - 1]; return v; }
function plLuu() {
  const K = PL.kq; if (!K) return; const lop = {};
  K.lop.forEach((l, k) => { const key = K.keys[k]; lop[l.v] = {ten: l.ten, mau: l.mau, chung: K.he === "3" ? ({1: 0, 2: 1, 3: 6, 4: 7})[key] : (CHUNG_HE[key] || 0), n3: K.he === "3" ? (key <= 3 ? key : 0) : paHe3(key)}; });
  paThem({id: "tao_" + Date.now().toString(36), ten: pl$("plTen").value || T("Phân loại"), nguon: "tao", nam: [K.y], lop,
    du: {[K.y]: {g0: {x0: K.g.x0, y1: K.g.y1, res: K.g.res, w: K.g.w, h: K.g.h}, data: plGiaTri(K)}},
    tham_so: {pp: K.pp, k: K.kv, he: K.he, bo: K.bo, dac_trung: K.ids, pham_vi: v27TenPV(K.PV), so_mau: K.nMau, nguon_mau: K.nguon || "trong", so_mau_ngoai: K.nNgoai || 0}, tao_luc: new Date().toISOString()});
  msg(T("đã lưu thành phương án: dùng được ở Thống kê lớp phủ và Phát hiện thay đổi"), "ok", 5000);
}
function plGeo() {
  const K = PL.kq; if (!K) return; const fs = [];
  K.lop.forEach((l, k) => { const m = new Uint8Array(K.cls.length); for (let i = 0; i < m.length; i++) if (K.cls[i] === k + 1) m[i] = 1;
    CORE.vectorize(m, K.g, 1).forEach(pg => fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: pg}, properties: {lop: K.keys[k], ten: l.ten, gia_tri: l.v, nam: K.y, dien_tich_ha: +(CORE.geodesicArea([pg]) / 1e4).toFixed(4)}})); });
  download(`phan_loai_${K.y}_${stamp()}.geojson`, JSON.stringify({type: "FeatureCollection", features: fs}), "application/geo+json");
}
function plCSV() {
  const K = PL.kq; if (!K) return;
  const rows = K.lop.map((l, k) => ({bang: "dien_tich", lop: l.ten, gia_tri: l.v, so_mau: K.soMau[k], dien_tich_ha: +K.dt[k].toFixed(3)}))
    .concat(K.sai.map(o => ({bang: "mau_nghi_sai", id: o.id, lop: K.lop[o.that].ten, du_doan: K.lop[o.du].ten})))
    .concat(K.manh.map((m, i) => ({bang: "xa_moi_mau", id: i + 1, lon: +m.lon.toFixed(6), lat: +m.lat.toFixed(6), dien_tich_ha: +m.ha.toFixed(3), lop: K.lop[m.k].ten})));
  download(`phan_loai_${K.y}_${stamp()}.csv`, CORE.toCSV(rows, ["bang", "id", "lop", "gia_tri", "so_mau", "du_doan", "lon", "lat", "dien_tich_ha"]), "text/csv");
}
function plTab(t) { document.querySelectorAll("#plP [data-ptab]").forEach(b => b.classList.toggle("on", b.dataset.ptab === t)); document.querySelectorAll("#plP [data-ppane]").forEach(p => { p.hidden = p.dataset.ppane !== t; }); }
$("bPL").onclick = () => plMo();
pl$("plDong").onclick = () => { plMo(false); if (PL.hien) { map.removeLayer(PL.hien); PL.hien = null; } };
pl$("plThu").onclick = () => { const b = pl$("plBody"); b.hidden = !b.hidden; pl$("plThu").textContent = b.hidden ? "+" : "–"; };
pl$("plPV").onchange = plHien; pl$("plPP").onchange = plHien;
if (pl$("plNguon")) { const cu = ls("laymau_hp_pl_nguon_v1"); if (cu && [...pl$("plNguon").options].some(o => o.value === cu)) pl$("plNguon").value = cu;
  pl$("plNguon").onchange = () => ls("laymau_hp_pl_nguon_v1", pl$("plNguon").value); }
["plNam", "plHe"].forEach(id => { pl$(id).onchange = plVeBo; });
pl$("plChay").onclick = plChay; pl$("plXem").onchange = plVe; pl$("plLuu").onclick = plLuu; pl$("plGeo").onclick = plGeo; pl$("plCSV").onclick = plCSV;
pl$("plTif").onclick = () => { const K = PL.kq; if (!K) return;
  try { v28TifLop(`phan_loai_${K.y}_${stamp()}`, K.g, plGiaTri(K), null, K.lop.map(l => ({ma: l.v, ten: l.ten, mau: l.mau}))); } catch (e) { msg(T("lỗi: ") + (e.message || e), "er", 6000); } };
document.querySelectorAll("#plP [data-ptab]").forEach(b => { b.onclick = () => plTab(b.dataset.ptab); });
document.addEventListener("xa27", () => { if (!pl$("plP").hidden) pl$("plXa").innerHTML = v27DSXa(); });
{ const el = pl$("plP"); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
  const dau = el.querySelector(".vg-dau"); let st = null;
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; el.style.left = Math.max(0, st.l + e.clientX - st.x) + "px"; el.style.top = Math.max(0, st.t + e.clientY - st.y) + "px"; });
  document.addEventListener("mouseup", () => { st = null; }); }
if (typeof cdChay === "function") {            // phát hiện thay đổi "theo bản đồ lớp có sẵn": chọn được mọi phương án
  const _cdMo27 = cdMo;
  cdMo = async function (on) { await _cdMo27(on); const s = cd$("cdPA"); if (!s) return; const cu = s.value; const ds = paDS();
    s.innerHTML = ds.map(pa => `<option value="${esc(pa.id)}">${esc(paTen(pa))}${pa.nam ? " (" + pa.nam.join(", ") + ")" : ""}</option>`).join(""); if (cu && ds.some(p => p.id === cu)) s.value = cu; };
}
const _setLang27pl = setLang;
setLang = function (l) { _setLang27pl(l); pl$("plTT").textContent = ""; if (!pl$("plP").hidden) { plVeBo(); plVeDT(); if (PL.kq) { PL.kq.lop = PL.kq.keys.map(k => plMoTaLop(k, PL.kq.he)); plVeKQ(); } } };
