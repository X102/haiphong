/* =============================== BẢN 2.6: PHÁT HIỆN THAY ĐỔI GIỮA HAI NĂM =============================== */
/* Quy trình (mọi con số trên trang đều tính lại được từ ảnh):
   ① đọc S2 10 băng hai năm trên cùng lưới (phạm vi: khung nhìn, các xã, một vùng đã lưu); ② chuẩn hoá bức xạ tương đối:
   hồi quy từng băng năm sau theo năm trước trên các điểm ảnh ổn định (độ lớn thay đổi thấp nhất 30 %); ③ độ lớn thay đổi
   = căn trung bình bình phương của hiệu từng đặc trưng chia độ lệch chuẩn bền của hiệu đó (phân tích véc tơ thay đổi);
   ④ ngưỡng Otsu, theo điểm đã gán nhãn cả hai năm (tối ưu F1), hoặc tự đặt; bỏ mảng nhỏ; ⑤ loại thay đổi: theo lớp sơ bộ
   từ chỉ số (không cần mẫu), theo điểm mẫu (nguyên mẫu k-means của từng lớp, từng năm) hoặc theo bản đồ lớp có sẵn;
   ⑥ bảng diện tích, ma trận từ-đến, biểu đồ, độ chính xác trên điểm mẫu, nhận định, xuất CSV, GeoJSON, rải điểm kiểm tra. */
const CD = {kq: null, hien: null, tok: 0}, CD_SAN = 2.5;   // sàn ngưỡng tự động: 2.5 lần độ lệch chuẩn bền
const cd$ = id => document.getElementById(id);
const CD_MAU = [null, "#d62728", "#1f77b4", "#2ca02c", "#8c564b", "#17becf", "#9467bd", "#ff7f0e", "#98df8a", "#e377c2"];
const CD_SOBO = [null, "nước", "thực vật", "xây dựng, đất trống"];
const CD_SOBO_MAU = [null, "#1f5fbf", "#2e9d3a", "#d7191c"];
function cdNamCo() { return MAN && MAN.s2d ? (MAN.s2d.nam || []).slice().sort((a, b) => a - b) : []; }
async function cdMo(on) {
  const P = cd$("cdP"); P.hidden = on === false ? true : (on === true ? false : !P.hidden);
  if (P.hidden) return;
  const ys = cdNamCo(), sa = cd$("cdA"), sb = cd$("cdB");
  if (sa.dataset.k !== ys.join()) {
    sa.innerHTML = sb.innerHTML = ys.map(y => `<option>${y}</option>`).join(""); sa.dataset.k = ys.join();
    if (ys.length) { sa.value = ys[0]; sb.value = ys[ys.length - 1]; }
  }
  if (!ys.length) cd$("cdTrang").textContent = T("cần ảnh S2 10 băng (s2d) của bộ dữ liệu");
  const bo = new Set(Object.values(ST.diem).map(p => p.bo));
  cd$("cdBo").innerHTML = `<option value="">${T("mọi bộ điểm")}</option>` + [...bo].map(b => `<option value="${esc(b)}">${esc(typeof boTen === "function" ? boTen(b) : b)}</option>`).join("");
  cd$("cdVung").innerHTML = Object.values(ST.vung).map(v => `<option value="${v.id}">${v.id} · ${v.ma_lop} · ${v.nam} · ${v.thong_ke.dien_tich_ha.toFixed(1)} ${T("ha")}</option>`).join("") || `<option value="">${T("(chưa lưu vùng nào)")}</option>`;
  if (!VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  cd$("cdXa").innerHTML = (VG.xa || []).slice().sort((a, b) => a.ten.localeCompare(b.ten, "vi")).map(x => `<option value="${x.i}">${esc(x.ten)}</option>`).join("");
  cdHien();
}
function cdHien() {
  const pv = cd$("cdPV").value; cd$("cdXaW").hidden = pv !== "xa"; cd$("cdVungW").hidden = pv !== "vung";
  cd$("cdTV").textContent = (+cd$("cdT").value).toFixed(2);
  cd$("cdT").disabled = cd$("cdNguong").value !== "tay";
}
function cdPhamVi() {                         // -> {bb 3857, mp (MultiPolygon lon/lat) | null, ten}
  const pv = cd$("cdPV").value;
  if (pv === "nhin") { const b = map.getBounds(), a = CORE.to3857(b.getWest(), b.getSouth()), c = CORE.to3857(b.getEast(), b.getNorth()); return {bb: [a[0], a[1], c[0], c[1]], mp: null, kieu: "nhin"}; }
  if (pv === "xa") {
    const ids = [...cd$("cdXa").selectedOptions].map(o => +o.value), xs = (VG.xa || []).filter(x => ids.includes(x.i));
    if (!xs.length) throw new Error(T("chưa chọn xã nào"));
    const mp = [].concat(...xs.map(x => x.mp)); return {bb: vgBB3857(mp), mp, kieu: "xa", ten: xs.map(x => x.ten).join(", ")};
  }
  const v = ST.vung[cd$("cdVung").value]; if (!v) throw new Error(T("chưa có vùng đã lưu"));
  const mp = vgMP(v.geom); return {bb: vgBB3857(mp), mp, kieu: "vung", id: v.id};
}
function cdTenPV(P) { return P.kieu === "nhin" ? T("khung nhìn") : P.kieu === "vung" ? T("vùng {id}", {id: P.id}) : P.ten; }
async function cdDocS2(g, y) {                // phản xạ 10 băng trên lưới g: mảng Float32 từng băng (NaN = trống)
  const nb = s2Bang().length, url = CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", y)), N = g.w * g.h;
  const R = await vgThuLai(() => readUTM(url, g.bb, g.w, g.h, 0, Array.from({length: nb}, (_, i) => i), false, true), url);
  const B = Array.from({length: nb}, () => new Float32Array(N).fill(NaN));
  if (R) for (let i = 0; i < N; i++) { const j = R.idx[i]; if (j < 0) continue; let z = true;
    for (let b = 0; b < nb; b++) if (R.src[j * nb + b]) { z = false; break; }
    if (!z) for (let b = 0; b < nb; b++) B[b][i] = R.src[j * nb + b] / 10000; }
  return B;
}
function cdChiSo(B) {                          // NDVI, MNDWI, NDBI, BSI (như CORE.indices) từ phản xạ
  const bs = s2Bang(), k = n => B[bs.indexOf(n)], N = B[0].length, nd = (a, b) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = (a[i] - b[i]) / Math.max(a[i] + b[i], 1e-6); return o; };
  const bsi = new Float32Array(N), b11 = k("B11"), b4 = k("B4"), b8 = k("B8"), b2 = k("B2");
  for (let i = 0; i < N; i++) { const p = b11[i] + b4[i], q = b8[i] + b2[i]; bsi[i] = (p - q) / Math.max(p + q, 1e-6); }
  return {NDVI: nd(b8, b4), MNDWI: nd(k("B3"), b11), NDBI: nd(b11, b8), BSI: bsi};
}
function cdTiepCS(B, c) {                      // chỉ số đang dùng (công thức tự nhập, thư viện) trên phản xạ
  const N = B[0].length, o = new Float32Array(N).fill(NaN), buf = new Array(B.length).fill(0);
  for (let i = 0; i < N; i++) { if (!isFinite(B[0][i])) continue; for (const b of c.f.chi) buf[b] = B[b][i]; const x = c.f(buf); if (x != null) o[i] = x; }
  return o;
}
async function cdDocPC(g, y) {
  if (!MAN.pc || !MAN.pc.nam.includes(y)) return null;
  const k = MAN.pc.k, url = CORE.dataUrl(CFG, MAN.pc.duong_dan.replace("{y}", y)), s = (MAN.pc.he_so && MAN.pc.he_so.he_so_nhan) || 100, N = g.w * g.h;
  const R = await vgThuLai(() => readUTM(url, g.bb, g.w, g.h, 0, Array.from({length: k}, (_, i) => i), false, true), url);
  const out = Array.from({length: k}, () => new Float32Array(N).fill(NaN));
  if (R) for (let i = 0; i < N; i++) { const j = R.idx[i]; if (j < 0 || R.src[j * k] === -32768) continue; for (let q = 0; q < k; q++) out[q][i] = R.src[j * k + q] / s; }
  return out;
}
async function cdDocEmb(g, y) {                // các thành phần embedding (đổi từ 8 bit theo phép chiếu)
  const out = [], N = g.w * g.h;
  for (const L0 of embLayers()) {
    if (!L0.nam.includes(y)) return null;
    const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), r = await vgThuLai(() => readBox(url, g.bb, g.w, g.h, true), url), pj = await embPJ(L0);
    const m = /thành phần ([\d-]+)/.exec(L0.ten || ""), tp = m ? m[1].split("-").map(Number) : [1, 2, 3];
    for (let q = 0; q < 3; q++) { const a = new Float32Array(N).fill(NaN);
      if (r) for (let i = 0; i < N; i++) { const v = r.data[i * r.n + q]; if (v) a[i] = pj && pj.lo ? pj.lo[tp[q] - 1] + (v - 1) / 254 * (pj.hi[tp[q] - 1] - pj.lo[tp[q] - 1]) : v; }
      out.push(a); }
  }
  return out.length ? out : null;
}
function cdMau(g, A, B, bo) {                  // điểm đã gán nhãn cả hai năm (bỏ M, U), nằm trong lưới
  const dac = new Set((SCHEME.dac_biet || []).map(c => c.ma));
  return Object.values(ST.diem).filter(p => (!bo || p.bo === bo) && p.nhan[A] && p.nhan[B] && !dac.has(p.nhan[A]) && !dac.has(p.nhan[B])).map(p => {
    const q = CORE.llToPix(g, p.lon, p.lat), x = Math.floor(q[0]), y = Math.floor(q[1]);
    return x >= 0 && y >= 0 && x < g.w && y < g.h ? {p, i: y * g.w + x, a: p.nhan[A], b: p.nhan[B]} : null;
  }).filter(Boolean);
}
function cdDanhGia(M, doi) {                   // ma trận nhầm lẫn thay đổi / không đổi trên điểm mẫu
  let tp = 0, fp = 0, fn = 0, tn = 0;
  M.forEach(m => { const that = m.a !== m.b, du = !!doi[m.i]; if (that && du) tp++; else if (!that && du) fp++; else if (that && !du) fn++; else tn++; });
  const n = tp + fp + fn + tn, pr = tp + fp ? tp / (tp + fp) : 0, rc = tp + fn ? tp / (tp + fn) : 0;
  return {tp, fp, fn, tn, n, oa: n ? (tp + tn) / n : 0, pr, rc, f1: pr + rc ? 2 * pr * rc / (pr + rc) : 0};
}
async function cdChay() {
  const tok = ++CD.tok, A = +cd$("cdA").value, B = +cd$("cdB").value, tt = cd$("cdTrang");
  try {
    if (!MAN || !MAN.s2d) throw new Error(T("cần ảnh S2 10 băng (s2d) của bộ dữ liệu"));
    if (!(A < B)) throw new Error(T("năm trước phải nhỏ hơn năm sau"));
    const PV = cdPhamVi(), g = CORE.gridFor(PV.bb, 900, {x0: 0, y1: 0, res0: 10}), N = g.w * g.h, dung = k => !!document.querySelector(`#cdP [data-cd="${k}"]`).checked;
    tt.textContent = T("đang đọc ảnh năm {y}…", {y: A}); const SA = await cdDocS2(g, A);
    tt.textContent = T("đang đọc ảnh năm {y}…", {y: B}); const SB = await cdDocS2(g, B);
    if (tok !== CD.tok) return;
    const vung = PV.mp ? CORE.rasterizeRings(CORE.polysToPixRings(g, PV.mp), g.w, g.h) : null;
    const valid = new Uint8Array(N); let nv = 0;
    for (let i = 0; i < N; i++) if (isFinite(SA[0][i]) && isFinite(SB[0][i]) && (!vung || vung[i])) { valid[i] = 1; nv++; }
    if (nv < 50) throw new Error(T("phạm vi này gần như không có dữ liệu cả hai năm"));
    const buoc = Math.max(1, Math.floor(N / 150000)), nb = SA.length;
    const doLon = F => {                        // F: [[a, b]...] -> độ lớn (căn trung bình bình phương hiệu chuẩn hoá bền)
      const m = new Float32Array(N).fill(NaN), sd = F.map(([a, b]) => { const d = new Float32Array(N).fill(NaN); for (let i = 0; i < N; i += buoc) if (valid[i]) d[i] = b[i] - a[i]; return Math.max(CORE.lechBen(d, buoc), 1e-6); });
      for (let i = 0; i < N; i++) { if (!valid[i]) continue; let s = 0, n = 0; F.forEach(([a, b], f) => { const z = (b[i] - a[i]) / sd[f]; if (isFinite(z)) { s += z * z; n++; } }); if (n) m[i] = Math.sqrt(s / n); }
      return {m, sd};
    };
    // ② chuẩn hoá bức xạ tương đối: điểm ảnh ổn định = 30 % thay đổi ít nhất (theo 10 băng gốc)
    let heSo = null;
    if (cd$("cdChuan").checked) {
      const m0 = doLon(SA.map((a, b) => [a, SB[b]])).m, mau = []; for (let i = 0; i < N; i += buoc) if (valid[i] && isFinite(m0[i])) mau.push(m0[i]);
      const t30 = CORE.phanVi(mau, 0.3); heSo = [];
      for (let b = 0; b < nb; b++) { const x = [], y = []; for (let i = 0; i < N; i += buoc) if (valid[i] && m0[i] <= t30) { x.push(SA[b][i]); y.push(SB[b][i]); }
        const h = CORE.hoiQuy(x, y); if (!(h.a > 0.2 && h.a < 5)) { heSo.push({a: 1, b: 0, n: h.n}); continue; }
        heSo.push(h); for (let i = 0; i < N; i++) if (isFinite(SB[b][i])) SB[b][i] = (SB[b][i] - h.b) / h.a; }
    }
    const IA = cdChiSo(SA), IB = cdChiSo(SB), F = [], ten = [];
    if (dung("s2")) s2Bang().forEach((b, q) => { F.push([SA[q], SB[q]]); ten.push(b); });
    if (dung("cs")) {
      ["NDVI", "MNDWI", "NDBI", "BSI"].forEach(k => { F.push([IA[k], IB[k]]); ten.push(k); });
      csDS().filter(c => !CS_GOC[c.id]).forEach(c => { F.push([cdTiepCS(SA, c), cdTiepCS(SB, c)]); ten.push(c.ten); });
    }
    if (dung("ctx")) { const r = Math.max(1, Math.round(7 * 10 / g.res));
      for (let b = 0; b < nb; b++) { const f = S => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = isFinite(S[b][i]) ? S[b][i] : 0; return CORE.boxImage(a, g.w, g.h, 1, 0, r).m; };
        F.push([f(SA), f(SB)]); ten.push("CTX " + s2Bang()[b]); } }
    if (dung("pc")) { tt.textContent = T("đang đọc PC…"); const PA = await cdDocPC(g, A), PB = await cdDocPC(g, B);
      if (PA && PB) PA.forEach((a, q) => { F.push([a, PB[q]]); ten.push("PC" + (q + 1)); }); }
    if (dung("emb")) { tt.textContent = T("đang đọc embedding…"); const EA = await cdDocEmb(g, A), EB = await cdDocEmb(g, B);
      if (EA && EB) EA.forEach((a, q) => { F.push([a, EB[q]]); ten.push("emb " + (q + 1)); }); }
    if (!F.length) throw new Error(T("chọn ít nhất một nhóm dữ liệu so sánh"));
    if (tok !== CD.tok) return;
    tt.textContent = T("đang tính…");
    const {m: mag, sd} = doLon(F);
    const vm = []; for (let i = 0; i < N; i += buoc) if (valid[i] && isFinite(mag[i])) vm.push(mag[i]);
    const mx = vm.reduce((a, b) => (b > a ? b : a), 0), ngCach = cd$("cdNguong").value;
    const otsuLog = () => Math.max(CD_SAN, Math.expm1(CORE.otsu(vm.map(Math.log1p), 0, Math.log1p(mx) || 1, 256)));   // thay đổi hiếm vẫn tách được
    const mauDiem = cdMau(g, A, B, cd$("cdBo").value).filter(m => valid[m.i]);
    const res = Math.abs(g.res * Math.cos(map.getCenter().lat * Math.PI / 180)), minPx = Math.max(1, Math.round((+cd$("cdMin").value || 0) * 1e4 / (res * res)));
    const nhiPhan = t => { const d = new Uint8Array(N); for (let i = 0; i < N; i++) if (valid[i] && mag[i] > t) d[i] = 1; return CORE.removeSmall(d, g.w, g.h, minPx); };
    let t = +cd$("cdT").value, tCach = "tay", hieuChinh = null;
    if (ngCach === "otsu") { t = otsuLog(); tCach = "otsu"; }
    if (ngCach === "mau") {
      const that = mauDiem.filter(m => m.a !== m.b).length;
      if (that < 3 || mauDiem.length - that < 3) { t = otsuLog(); tCach = "otsu"; msg(T("chưa đủ điểm mẫu (cần ít nhất 3 điểm đổi lớp và 3 điểm không đổi): dùng ngưỡng Otsu"), "wa", 5000); }
      else {                                    // chọn ngưỡng cho F1 lớn nhất trên các điểm mẫu
        const ung = [...new Set(mauDiem.map(m => mag[m.i]).filter(isFinite).concat(Array.from({length: 60}, (_, k) => CORE.phanVi(vm, 0.4 + 0.595 * k / 59))))].sort((a, b) => a - b);
        let best = null;
        ung.forEach(c => { const x = c - 1e-6, d = {}; mauDiem.forEach(m => { d[m.i] = mag[m.i] > x ? 1 : 0; }); const e = cdDanhGia(mauDiem, d); if (!best || e.f1 > best.f1 + 1e-9) best = Object.assign({t: x}, e); });
        t = best.t; tCach = "mau"; hieuChinh = best;
      }
    }
    const doi = nhiPhan(t), hi = Math.max(CORE.phanVi(vm, 0.995) || 1, 1.5 * t);
    // ⑤ loại thay đổi
    const pl = cd$("cdPL").value, cA = new Uint8Array(N), cB = new Uint8Array(N); let lop = CD_SOBO.slice(1).map(x => T(x)), lopMau = CD_SOBO_MAU.slice(1), plTT = "";
    if (pl === "sobo") { for (let i = 0; i < N; i++) if (valid[i]) { cA[i] = CORE.lopSoBo(IA.NDVI[i], IA.MNDWI[i]); cB[i] = CORE.lopSoBo(IB.NDVI[i], IB.MNDWI[i]); } }
    else if (pl === "bando") {
      const L0 = MAN.layers.find(l => l.kieu === "lop" && l.nam.includes(A) && l.nam.includes(B));
      if (!L0) throw new Error(T("bộ dữ liệu không có bản đồ lớp nào có cả năm {a} và {b}", {a: A, b: B}));
      const doc = async y => { const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)); return vgThuLai(() => readBox(url, g.bb, g.w, g.h, true), url); };
      const ra = await doc(A), rb = await doc(B), ma = Object.keys(L0.bang_mau || L0.ten_lop || {}).map(Number).sort((a, b) => a - b);
      lop = ma.map(k => T((L0.ten_lop || TEN3)[k] || String(k))); lopMau = ma.map(k => (L0.bang_mau || {})[k] || "#999");
      for (let i = 0; i < N; i++) if (valid[i]) { cA[i] = ra ? ma.indexOf(ra.data[i]) + 1 : 0; cB[i] = rb ? ma.indexOf(rb.data[i]) + 1 : 0; }
      plTT = lname(L0);
    } else {                                    // theo điểm mẫu: nguyên mẫu k-means của từng lớp ở từng năm, trên đặc trưng chuẩn hoá chung
      const Fn = s2Bang().map((b, q) => [SA[q], SB[q]]).concat(["NDVI", "MNDWI", "NDBI", "BSI"].map(k => [IA[k], IB[k]])), nf = Fn.length;
      const mu = Fn.map(([a, b]) => { let s = 0, n = 0; for (let i = 0; i < N; i += buoc) if (valid[i]) { s += a[i] + b[i]; n += 2; } return s / Math.max(n, 1); });
      const sdv = Fn.map(([a, b], f) => { let s = 0, n = 0; for (let i = 0; i < N; i += buoc) if (valid[i]) { s += (a[i] - mu[f]) ** 2 + (b[i] - mu[f]) ** 2; n += 2; } return Math.sqrt(s / Math.max(n, 1)) || 1; });
      const ma = [...new Set(mauDiem.flatMap(m => [m.a, m.b]))].sort((x, y) => (IDX.by[x] ? SCHEME.lop.indexOf(IDX.by[x]) : 99) - (IDX.by[y] ? SCHEME.lop.indexOf(IDX.by[y]) : 99));
      if (ma.length < 2) throw new Error(T("cần điểm mẫu có nhãn cả hai năm của ít nhất hai lớp"));
      lop = ma.map(x => `${x} ${cten(IDX.by[x])}`); lopMau = ma.map(x => (IDX.by[x] || {}).mau || "#999");
      const nam = (k, y) => { const X = new Float32Array(N * nf); for (let i = 0; i < N; i++) if (valid[i]) for (let f = 0; f < nf; f++) X[i * nf + f] = (Fn[f][k][i] - mu[f]) / sdv[f]; return X; };
      const XA = nam(0), XB = nam(1), vec = (X, i) => Array.from(X.subarray(i * nf, i * nf + nf));
      const proto = (X, key) => { const out = []; ma.forEach((c, li) => { const V = mauDiem.filter(m => m[key] === c).map(m => vec(X, m.i)); if (!V.length) return;
        CORE.kMeans(V, nf, Math.min(3, Math.ceil(V.length / 5)), 15, 11).forEach(v => out.push({lop: li, v})); }); return out; };
      const kA = CORE.phanLoaiNguyenMau(XA, nf, N, valid, proto(XA, "a")), kB = CORE.phanLoaiNguyenMau(XB, nf, N, valid, proto(XB, "b"));
      cA.set(kA); cB.set(kB);
      const dung_ = mauDiem.filter(m => lop[cA[m.i] - 1] && ma[cA[m.i] - 1] === m.a).length + mauDiem.filter(m => ma[cB[m.i] - 1] === m.b).length;
      plTT = T("{n} điểm mẫu, trùng nhãn {p} % (tính trên chính các điểm mẫu, lạc quan)", {n: mauDiem.length, p: (100 * dung_ / Math.max(1, 2 * mauDiem.length)).toFixed(0)});
    }
    const loai = new Uint8Array(N), dN = new Float32Array(N).fill(NaN);
    for (let i = 0; i < N; i++) if (valid[i]) { dN[i] = IB.NDVI[i] - IA.NDVI[i];
      loai[i] = pl === "sobo" ? CORE.loaiThayDoi(cA[i], cB[i], dN[i], doi[i]) : (!doi[i] ? 0 : (cA[i] && cB[i] && cA[i] !== cB[i] ? 1 : 2)); }
    // ⑥ thống kê
    const ra = CORE.rowArea(g), dt = new Float64Array(10), K = lop.length, mt = Array.from({length: K}, () => new Float64Array(K));
    const tb = Array.from({length: 10}, () => ({n: 0, dN: 0, dW: 0, dB: 0})); let tong = 0, tongDoi = 0;
    const xaIdx = VG.xa ? vgXaIdx(g) : null, theoXa = {};
    for (let j = 0; j < g.h; j++) for (let x = 0; x < g.w; x++) { const i = j * g.w + x; if (!valid[i]) continue; const a = ra[j] / 1e4; tong += a;
      if (cA[i] && cB[i]) mt[cA[i] - 1][cB[i] - 1] += a;
      if (doi[i]) { tongDoi += a; dt[loai[i]] += a; const s = tb[loai[i]]; s.n++; s.dN += dN[i]; s.dW += IB.MNDWI[i] - IA.MNDWI[i]; s.dB += IB.NDBI[i] - IA.NDBI[i];
        if (xaIdx && xaIdx[i]) theoXa[xaIdx[i]] = (theoXa[xaIdx[i]] || 0) + a; } }
    const ten_loai = pl === "sobo" ? CORE.LOAI_TD.map(x => x && T(x)) : [null, T("đổi lớp"), T("thay đổi trong cùng lớp")];
    const danhGia = mauDiem.length ? cdDanhGia(mauDiem, doi) : null;
    CD.kq = {A, B, g, N, valid, mag, doi, loai, cA, cB, dN, IA, IB, t, tCach, hi, ten, sd, heSo, pl, plTT, lop, lopMau, mt, dt, tb, tong, tongDoi,
             ten_loai, danhGia, hieuChinh, theoXa, PV, vm, minPx, res};
    cd$("cdKQ").hidden = false; cdVe(); cdBang(); tt.textContent = T("xong: {a} ha thay đổi / {b} ha", {a: tongDoi.toFixed(1), b: tong.toFixed(1)});
  } catch (e) { if (tok === CD.tok) tt.textContent = T("lỗi: ") + (typeof vgLoiDoc === "function" ? vgLoiDoc(e) : (e.message || e)); }
  TIFF_PT.clear();
}
function cdVe() {                              // lớp bản đồ kết quả
  const K = CD.kq; if (CD.hien) { map.removeLayer(CD.hien); CD.hien = null; }
  if (!K) return; const mode = cd$("cdXem").value; if (mode === "tat") { cd$("cdLeg").innerHTML = ""; return; }
  const g = K.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h;
  const ctx = c.getContext("2d"); if (!ctx) return;
  const img = ctx.createImageData(g.w, g.h), d = img.data, rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const lm = lut2("magma"), lr = lut2("rdbu"), mau = CD_MAU.map(h => h && rgb(h)), lmau = K.lopMau.map(rgb);
  for (let i = 0; i < K.N; i++) {
    if (!K.valid[i]) continue; let c3 = null, a = 200;
    if (mode === "loai") { if (K.doi[i]) c3 = mau[K.pl === "sobo" ? K.loai[i] : (K.loai[i] === 1 ? 1 : 9)]; }
    else if (mode === "doi") { if (K.doi[i]) c3 = [214, 39, 40]; }
    else if (mode === "do") { const t = Math.min(1, K.mag[i] / K.hi); c3 = lm[1 + Math.round(t * 254)]; a = 190; }
    else if (mode === "ndvi") { const t = Math.max(0, Math.min(1, (K.dN[i] + 0.5) / 1)); c3 = lr[1 + Math.round((1 - t) * 254)]; a = 190; }
    else if (mode === "tu") { if (K.doi[i] && K.cB[i]) c3 = lmau[K.cB[i] - 1]; }
    if (c3) { d[i * 4] = c3[0]; d[i * 4 + 1] = c3[1]; d[i * 4 + 2] = c3[2]; d[i * 4 + 3] = a; }
  }
  ctx.putImageData(img, 0, 0);
  const A = CORE.m2ll(g.bb[0], g.bb[1]), B = CORE.m2ll(g.bb[2], g.bb[3]);
  CD.hien = L.imageOverlay(c.toDataURL(), [[A[1], A[0]], [B[1], B[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 460}).addTo(map);
  const el = CD.hien.getElement && CD.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
  CD.canvas = c;
  const sw = h => `<i style="background:${h}"></i>`;
  let h = "";
  if (mode === "loai") h = K.ten_loai.map((t, k) => t && K.dt[k] > 0 ? `<span>${sw(K.pl === "sobo" ? CD_MAU[k] : (k === 1 ? CD_MAU[1] : CD_MAU[9]))}${esc(t)}</span>` : "").join("");
  else if (mode === "doi") h = `<span>${sw("#d62728")}${T("thay đổi {a} → {b}", {a: K.A, b: K.B})}</span>`;
  else if (mode === "do") h = `<span>${T("độ lớn 0 .. {h} (ngưỡng {t})", {h: K.hi.toFixed(2), t: K.t.toFixed(2)})}</span>`;
  else if (mode === "ndvi") h = `<span>${sw("#b2182b")}${T("NDVI giảm")}</span><span>${sw("#2166ac")}${T("NDVI tăng")}</span>`;
  else if (mode === "tu") h = K.lop.map((t, k) => `<span>${sw(K.lopMau[k])}${esc(t)}</span>`).join("");
  cd$("cdLeg").innerHTML = `<div class="leg">${h}</div>`;
}
function cdSVGHist(K) {                        // tần suất độ lớn thay đổi, vạch ngưỡng
  const W = 400, H = 130, nb = 60, h = new Array(nb).fill(0); K.vm.forEach(v => { const k = Math.min(nb - 1, Math.floor(v / K.hi * nb)); if (k >= 0) h[k]++; });
  const mx = Math.max(...h.map(x => Math.log10(1 + x)), 1), bw = (W - 40) / nb, X = v => 34 + v / K.hi * (W - 40);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  h.forEach((c, k) => { const y = (H - 22) * Math.log10(1 + c) / mx; s += `<rect x="${(34 + k * bw).toFixed(1)}" y="${(H - 18 - y).toFixed(1)}" width="${(bw - 0.5).toFixed(1)}" height="${y.toFixed(1)}" fill="${k / nb * K.hi > K.t ? "#d62728" : "#98a2b3"}"/>`; });
  s += `<line x1="${X(K.t).toFixed(1)}" x2="${X(K.t).toFixed(1)}" y1="4" y2="${H - 18}" stroke="#111" stroke-dasharray="4 3"/>`;
  s += `<text x="${X(K.t).toFixed(1)}" y="12" font-size="9" text-anchor="middle">${T("ngưỡng")} ${K.t.toFixed(2)}</text>`;
  [0, 0.5, 1].forEach(f => { s += `<text x="${X(f * K.hi).toFixed(1)}" y="${H - 5}" font-size="9" text-anchor="middle" fill="#667085">${(f * K.hi).toFixed(1)}</text>`; });
  s += `<text x="2" y="10" font-size="9" fill="#667085">log</text>`;
  return s + "</svg>";
}
function cdSVGCot(K) {                         // diện tích từng loại thay đổi
  const ds = K.ten_loai.map((t, k) => [k, t, K.dt[k]]).filter(x => x[1] && x[2] > 0).sort((a, b) => b[2] - a[2]);
  if (!ds.length) return "";
  const W = 400, H = 20 + ds.length * 18, mx = ds[0][2];
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  ds.forEach(([k, t, a], r) => { const y = 8 + r * 18, w = (W - 200) * a / mx;
    s += `<text x="4" y="${y + 11}" font-size="10">${esc(t.length > 30 ? t.slice(0, 29) + "…" : t)}</text><rect x="160" y="${y}" width="${w.toFixed(1)}" height="13" fill="${K.pl === "sobo" ? CD_MAU[k] : (k === 1 ? CD_MAU[1] : CD_MAU[9])}"/>` +
         `<text x="${(164 + w).toFixed(1)}" y="${y + 11}" font-size="10">${a.toFixed(1)} ${T("ha")}</text>`; });
  return s + "</svg>";
}
function cdNhanDinh(K) {                       // câu nhận định dựng từ đúng các con số đã tính
  const ds = K.ten_loai.map((t, k) => [t, K.dt[k]]).filter(x => x[0] && x[1] > 0).sort((a, b) => b[1] - a[1]);
  const p = v => (100 * v / Math.max(K.tong, 1e-9)).toFixed(1);
  const cach = {otsu: T("tự động theo Otsu (không dưới 2.5)"), mau: T("tối ưu F1 trên điểm mẫu"), tay: T("tự đặt")}[K.tCach];
  let h = `<p>${T("Phạm vi: {v}; diện tích có dữ liệu cả hai năm {x} và {y}: {a} ha.", {v: esc(cdTenPV(K.PV)), a: K.tong.toFixed(1), x: K.A, y: K.B})} ` +
    `${T("Với ngưỡng độ lớn {t} ({c}) và bỏ mảng dưới {m} ha, {d} ha ({p} %) được coi là thay đổi.", {t: K.t.toFixed(2), c: cach, m: (+cd$("cdMin").value || 0).toFixed(2), d: K.tongDoi.toFixed(1), p: p(K.tongDoi)})}</p>`;
  if (ds.length) h += `<p>${T("Các loại chính")}: ` + ds.slice(0, 4).map(([t, a]) => `${esc(t)} ${a.toFixed(1)} ${T("ha")} (${p(a)} %)`).join("; ") + ".</p>";
  if (K.pl === "sobo") {
    const tv = k => K.mt.reduce((s, r) => s + r[k], 0), tr = k => K.mt[k].reduce((s, v) => s + v, 0);
    h += `<p>${T("Theo lớp sơ bộ từ chỉ số")}: ` + CD_SOBO.slice(1).map((n, k) => `${T(n)} ${tr(k).toFixed(1)} → ${tv(k).toFixed(1)} ${T("ha")}`).join("; ") + `.</p>`;
  } else if (K.plTT) h += `<p class="mu">${esc(K.plTT)}</p>`;
  if (K.heSo) { const bs = s2Bang(), r = K.heSo[bs.indexOf("B4")], n8 = K.heSo[bs.indexOf("B8")];
    h += `<p class="mu">${T("Chuẩn hoá bức xạ: năm {y} được đưa về thang của năm {x} (băng đỏ: hệ số {a}, băng cận hồng ngoại: hệ số {b}).", {y: K.B, x: K.A, a: r.a.toFixed(3), b: n8.a.toFixed(3)})}</p>`; }
  if (K.danhGia && K.danhGia.n) { const e = K.danhGia;
    h += `<p>${T("Trên {n} điểm đã gán nhãn cả hai năm: đúng {oa} %, độ chính xác phát hiện {pr} %, độ phủ {rc} %, F1 {f1}.", {n: e.n, oa: (100 * e.oa).toFixed(0), pr: (100 * e.pr).toFixed(0), rc: (100 * e.rc).toFixed(0), f1: e.f1.toFixed(2)})}</p>`; }
  h += `<p class="mu sm">${T("Đây là kết quả tự động từ ảnh tổng hợp mùa khô; lớp sơ bộ theo ngưỡng chỉ số chỉ để gợi ý loại thay đổi. Kiểm tra bằng dải ảnh theo năm và rải điểm kiểm tra.")}</p>`;
  return h;
}
function cdBang() {
  const K = CD.kq; if (!K) return;
  cd$("cdTom").innerHTML = cdNhanDinh(K);
  const p = v => (100 * v / Math.max(K.tong, 1e-9)).toFixed(1);
  let h = `<table><tr><th>${T("loại thay đổi")}</th><th>${T("ha")}</th><th>%</th><th>ΔNDVI</th><th>ΔMNDWI</th><th>ΔNDBI</th></tr>`;
  K.ten_loai.forEach((t, k) => { if (!t || !K.dt[k]) return; const s = K.tb[k];
    h += `<tr><td><i style="display:inline-block;width:10px;height:10px;background:${K.pl === "sobo" ? CD_MAU[k] : (k === 1 ? CD_MAU[1] : CD_MAU[9])}"></i> ${esc(t)}</td><td>${K.dt[k].toFixed(2)}</td><td>${p(K.dt[k])}</td>` +
      `<td>${(s.dN / s.n).toFixed(3)}</td><td>${(s.dW / s.n).toFixed(3)}</td><td>${(s.dB / s.n).toFixed(3)}</td></tr>`; });
  h += `<tr><td><b>${T("tổng thay đổi")}</b></td><td><b>${K.tongDoi.toFixed(2)}</b></td><td><b>${p(K.tongDoi)}</b></td><td colspan="3"></td></tr></table>`;
  const xa = Object.entries(K.theoXa).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (xa.length) h += `<p><b>${T("Theo xã")}</b></p><table>` + xa.map(([i, a]) => `<tr><td>${esc((VG.xa.find(x => x.i === +i) || {}).ten || i)}</td><td>${a.toFixed(2)} ${T("ha")}</td></tr>`).join("") + `</table>`;
  if (K.danhGia && K.danhGia.n) { const e = K.danhGia;
    h += `<p><b>${T("Đánh giá trên điểm mẫu")}</b> (${e.n})</p><table><tr><th></th><th>${T("dự báo: thay đổi")}</th><th>${T("dự báo: không đổi")}</th></tr>` +
      `<tr><td>${T("nhãn: đổi lớp")}</td><td>${e.tp}</td><td>${e.fn}</td></tr><tr><td>${T("nhãn: không đổi")}</td><td>${e.fp}</td><td>${e.tn}</td></tr></table>`; }
  h += `<p class="mu sm">${T("Đặc trưng dùng")}: ${K.ten.map(esc).join(", ")}</p>`;
  cd$("cdBang").innerHTML = h;
  let m = `<p class="mu sm">${T("Hàng: lớp năm {a}; cột: lớp năm {b}; ô: ha (mọi điểm ảnh có dữ liệu, cả chỗ không đổi).", {a: K.A, b: K.B})} ${K.pl === "sobo" ? T("Lớp sơ bộ từ chỉ số.") : esc(K.plTT)}</p>`;
  m += `<table><tr><th>${K.A} \\ ${K.B}</th>` + K.lop.map(t => `<th>${esc(t)}</th>`).join("") + `<th>${T("tổng")}</th></tr>`;
  K.mt.forEach((r, i) => { m += `<tr><th>${esc(K.lop[i])}</th>` + Array.from(r).map((v, j) => `<td class="${i === j ? "dg" : ""}">${v.toFixed(1)}</td>`).join("") + `<td>${r.reduce((s, v) => s + v, 0).toFixed(1)}</td></tr>`; });
  m += `<tr><th>${T("tổng")}</th>` + K.lop.map((t, j) => `<td>${K.mt.reduce((s, r) => s + r[j], 0).toFixed(1)}</td>`).join("") + `<td></td></tr></table>`;
  cd$("cdMT").innerHTML = m;
  cd$("cdBD").innerHTML = `<p class="mu sm">${T("Tần suất độ lớn thay đổi (thang log), đỏ là phần vượt ngưỡng")}</p>` + cdSVGHist(K) + `<p class="mu sm">${T("Diện tích từng loại thay đổi")}</p>` + cdSVGCot(K);
}
function cdTab(t) { document.querySelectorAll("#cdP [data-ctab]").forEach(b => b.classList.toggle("on", b.dataset.ctab === t)); document.querySelectorAll("#cdP [data-cpane]").forEach(p => { p.hidden = p.dataset.cpane !== t; }); }
function cdCSV() {
  const K = CD.kq; if (!K) return; const rows = [];
  K.ten_loai.forEach((t, k) => { if (t && K.dt[k]) rows.push({bang: "loai", nam_truoc: K.A, nam_sau: K.B, muc: t, tu: "", den: "", dien_tich_ha: +K.dt[k].toFixed(3)}); });
  K.mt.forEach((r, i) => r.forEach((v, j) => rows.push({bang: "ma_tran", nam_truoc: K.A, nam_sau: K.B, muc: "", tu: K.lop[i], den: K.lop[j], dien_tich_ha: +v.toFixed(3)})));
  download(`thay_doi_${K.A}_${K.B}_${stamp()}.csv`, CORE.toCSV(rows, ["bang", "nam_truoc", "nam_sau", "muc", "tu", "den", "dien_tich_ha"]), "text/csv");
}
function cdGeo() {
  const K = CD.kq; if (!K) return; const fs = [];
  K.ten_loai.forEach((t, k) => { if (!t || !K.dt[k]) return; const m = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (K.doi[i] && K.loai[i] === k) m[i] = 1;
    CORE.vectorize(m, K.g, 1).forEach(pg => fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: pg},
      properties: {loai: k, ten_loai: t, nam_truoc: K.A, nam_sau: K.B, dien_tich_ha: +(CORE.geodesicArea([pg]) / 1e4).toFixed(4)}})); });
  download(`thay_doi_${K.A}_${K.B}_${stamp()}.geojson`, JSON.stringify({type: "FeatureCollection", features: fs}), "application/geo+json");
}
function cdRai() {                             // rải điểm ngẫu nhiên trong từng loại thay đổi thành bộ điểm mới (gán nhãn cả hai năm để kiểm tra)
  const K = CD.kq; if (!K) return; const n = Math.max(1, +cd$("cdNDiem").value || 10), pts = [];
  K.ten_loai.forEach((t, k) => { if (!t || !K.dt[k]) return; const m = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (K.doi[i] && K.loai[i] === k) m[i] = 1;
    CORE.samplePixels(m, n, 1000 + k).forEach(i => { const x = i % K.g.w, y = (i - x) / K.g.w, ll = CORE.pixToLL(K.g, x + 0.5, y + 0.5); pts.push({lon: ll[0], lat: ll[1], tang: k}); }); });
  const m0 = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (K.valid[i] && !K.doi[i]) m0[i] = 1;   // cả chỗ không đổi để kiểm sai sót bỏ sót
  CORE.samplePixels(m0, n, 999).forEach(i => { const x = i % K.g.w, y = (i - x) / K.g.w, ll = CORE.pixToLL(K.g, x + 0.5, y + 0.5); pts.push({lon: ll[0], lat: ll[1], tang: 0}); });
  taoBoTuDiem(T("kiểm tra thay đổi {a}-{b}", {a: K.A, b: K.B}), [K.A, K.B], pts, {cach: "kiem_tra_thay_doi", tham_so: {nam_truoc: K.A, nam_sau: K.B, nguong: +K.t.toFixed(3)}});
}
function cdTaiDiem(ll) {                       // một dòng cho bảng giá trị tại điểm
  const K = CD.kq; if (!K) return null;
  const q = CORE.llToPix(K.g, ll.lng, ll.lat), x = Math.floor(q[0]), y = Math.floor(q[1]); if (x < 0 || y < 0 || x >= K.g.w || y >= K.g.h) return null;
  const i = y * K.g.w + x; if (!K.valid[i]) return null;
  const t = K.doi[i] ? (K.ten_loai[K.loai[i]] || T("thay đổi")) : T("không đổi");
  return [`Δ ${K.A} → ${K.B}`, `<b>${esc(t)}</b> · ${T("độ lớn")} ${K.mag[i].toFixed(2)} (${T("ngưỡng")} ${K.t.toFixed(2)}) · ΔNDVI ${K.dN[i].toFixed(3)} · ΔMNDWI ${(K.IB.MNDWI[i] - K.IA.MNDWI[i]).toFixed(3)}` +
    (K.cA[i] && K.cB[i] ? ` · ${esc(K.lop[K.cA[i] - 1])} → ${esc(K.lop[K.cB[i] - 1])}` : "")];
}
const _giaTriTai26 = giaTriTai;
giaTriTai = async function (ll) { const r = await _giaTriTai26(ll), d = cdTaiDiem(ll); return d ? [d].concat(r.filter(x => !/^Δ /.test(x[0]))) : r; };
$("bCD").onclick = () => cdMo();
cd$("cdDong").onclick = () => { cdMo(false); if (CD.hien) { map.removeLayer(CD.hien); CD.hien = null; } };
cd$("cdThu").onclick = () => { const b = cd$("cdBody"); b.hidden = !b.hidden; cd$("cdThu").textContent = b.hidden ? "+" : "–"; };
["cdPV", "cdNguong", "cdT"].forEach(id => { cd$(id).addEventListener(id === "cdT" ? "input" : "change", cdHien); });
cd$("cdChay").onclick = cdChay; cd$("cdXem").onchange = cdVe;
document.querySelectorAll("#cdP [data-ctab]").forEach(b => { b.onclick = () => cdTab(b.dataset.ctab); });
cd$("cdCSV").onclick = cdCSV; cd$("cdGeo").onclick = cdGeo; cd$("cdRai").onclick = cdRai;
["cdP"].forEach(id => { const el = cd$(id); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); el.addEventListener("click", ev => ev.stopPropagation()); });
(function keoCD() {                            // kéo bảng bằng thanh tiêu đề
  const el = cd$("cdP"), dau = el.querySelector(".vg-dau"); let st = null;
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; el.style.left = Math.max(0, st.l + e.clientX - st.x) + "px"; el.style.top = Math.max(0, st.t + e.clientY - st.y) + "px"; });
  document.addEventListener("mouseup", () => { st = null; });
})();
const _setLang26 = setLang;
setLang = function (l) { _setLang26(l); if (CD.kq) { const K = CD.kq; K.ten_loai = K.pl === "sobo" ? CORE.LOAI_TD.map(x => x && T(x)) : [null, T("đổi lớp"), T("thay đổi trong cùng lớp")];
  if (K.pl === "sobo") K.lop = CD_SOBO.slice(1).map(x => T(x)); cdBang(); cdVe(); cd$("cdTrang").textContent = T("xong: {a} ha thay đổi / {b} ha", {a: K.tongDoi.toFixed(1), b: K.tong.toFixed(1)}); }
  else cd$("cdTrang").textContent = ""; if (!cd$("cdP").hidden) cdMo(true); };
