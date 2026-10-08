/* =============================== BẢN 3.15 =============================== */
/* ① Phân loại theo khối cho phạm vi lớn (cả tỉnh, nhiều xã): lưới cố định 10/20/30 m (hoặc tự chọn bước nhỏ nhất vừa bộ nhớ),
      HUẤN LUYỆN MỘT LẦN (thang byte chung của PC, DEM lấy từ các khối mẫu rải khắp phạm vi; trung bình, độ lệch chuẩn để chuẩn hoá;
      đặc trưng tại mọi điểm mẫu đọc theo khối nhỏ quanh điểm), rồi PHÂN LOẠI TỪNG KHỐI 512 × 512 điểm ảnh có lề 10 điểm ảnh (đặc
      trưng cửa sổ CTX và hậu xử lý không bị cắt ở mép khối), hai khối đọc song song, tính điểm ảnh trong Web Worker (nhiều nhân)
      khi trình duyệt cho, rồi ghép vào một bản đồ. Lưới đơn báo "vùng đọc quá lớn" thì tự chuyển sang theo khối.
      Bản đồ lớn hiện trên màn hình và trong bản đồ xuất ở ảnh thu nhỏ (≤ 4096 điểm ảnh mỗi chiều); số liệu, GeoTIFF dùng đủ lưới.
   ② Gộp nhiều phương án (ví dụ phân loại từng xã) thành một bản đồ trên lưới chung. */
var PL_KHOI = {B: 512, LE: 10, MAX: 40e6, SONG: 2, HIEN: 4096, THONG_KE: 12};
function plKhoiChon() { const m = /^k(\d+)$/.exec(pl$("plLuoi").value || ""); return m ? +m[1] : null; }   // null: lưới đơn; 0: tự chọn bước
function plLuoiKhoi(bb, res) {                    // lưới cố định căn gốc 0, bước nhỏ nhất (bội 10 m) vừa PL_KHOI.MAX điểm ảnh
  let r = Math.max(10, res || 10);
  for (;;) { const g = CORE.gridFor(bb, 1e9, {x0: 0, y1: 0, res0: r}); if (g.w * g.h <= PL_KHOI.MAX) return g; r += 10; }
}
function plLuoiCon(g, i0, j0, w, h) { const c = {x0: g.x0 + i0 * g.res, y1: g.y1 - j0 * g.res, res: g.res, w, h}; c.bb = [c.x0, c.y1 - h * g.res, c.x0 + w * g.res, c.y1]; return c; }
async function plHang(viec, n) { let i = 0; const chay = async () => { while (i < viec.length) { const k = i++; await viec[k](); } }; await Promise.all(Array.from({length: Math.min(n, viec.length)}, chay)); }

/* ---- tính điểm ảnh trong Web Worker (cùng mã plXep, plGiong, plChuan); không có Worker thì tính ngay trên trang ---- */
var PLW = {ds: null, hong: false, CHO_THU: 2000, CHO_VIEC: 120000};
function plWorkerMa() {                           // mã của Worker: đúng các hàm plChuan, plGiong, plXep của trang
  return [plChuan, plGiong, plXep].map(f => f.toString()).join("\n") + `
      onmessage = e => { const d = e.data; if (d.thu) { postMessage({id: d.id, thu: 1}); return; }
        const {F, nf, valid, mu, a, refs, K, cos, s, kv} = d, n = valid.length, cls = new Uint8Array(n), s1 = new Float32Array(n), mg = new Float32Array(n), k2 = new Int8Array(n).fill(-1), x = new Float32Array(nf);
        const R = refs.map(r => ({v: Float32Array.from(r.v), k: r.k}));
        for (let i = 0; i < n; i++) { if (!valid[i]) continue; const raw = F.subarray(i * nf, i * nf + nf), v = cos ? plChuan(raw, mu, a, x) : raw, r = plXep(v, R, K, cos, s, kv);
          cls[i] = r.k + 1; s1[i] = r.s1; mg[i] = r.m; k2[i] = r.k2; }
        postMessage({id: d.id, cls, s1, mg, k2}, [cls.buffer, s1.buffer, mg.buffer, k2.buffer]); };`;
}
function plWorkerGui(o, msg, han) {               // gửi một việc cho Worker o; quá hạn hoặc lỗi thì báo hỏng (rơi về tính trên trang)
  const id = ++PLW.id; o.ban = true;
  return new Promise((ok, no) => {
    const t = setTimeout(() => { if (PLW.cho.has(id)) { PLW.cho.delete(id); PLW.hong = true; no(0); } }, han);
    PLW.cho.set(id, {ok: d => { clearTimeout(t); ok(d); }, no: e => { clearTimeout(t); no(e); }});
    try { o.w.postMessage(Object.assign({id}, msg)); } catch (e) { PLW.cho.delete(id); clearTimeout(t); PLW.hong = true; no(0); }
  });
}
async function plWorkerTao() {                    // tạo Worker một lần, thử trả lời trong 2 giây (Worker bị chặn, Worker giả: tính trên trang)
  if (PLW.ds || PLW.hong) return PLW.hong ? null : PLW.ds;
  if (PLW.dang) return PLW.dang;
  PLW.dang = (async () => {
    try {
      if (typeof Worker !== "function" || typeof Blob !== "function" || !URL.createObjectURL) throw 1;
      const url = URL.createObjectURL(new Blob([plWorkerMa()], {type: "text/javascript"})), n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
      const ds = Array.from({length: n}, () => ({w: new Worker(url), ban: false})); PLW.cho = new Map(); PLW.id = PLW.id || 0;
      ds.forEach(o => { o.w.onmessage = e => { const f = PLW.cho.get(e.data && e.data.id); if (f) { PLW.cho.delete(e.data.id); o.ban = false; f.ok(e.data); } };
        o.w.onerror = () => { PLW.hong = true; PLW.cho.forEach(f => f.no(0)); PLW.cho.clear(); }; });
      await Promise.all(ds.map(o => plWorkerGui(o, {thu: 1}, PLW.CHO_THU)));
      PLW.ds = ds;
    } catch (e) { PLW.hong = true; PLW.ds = null; }
    return PLW.hong ? null : PLW.ds;
  })();
  return PLW.dang;
}
async function plTinhKhoi(F, nf, valid, mu, a, refs, K, cos, s, kv) {   // -> {cls, s1, mg, k2} của một khối
  const ds = await plWorkerTao();
  if (ds && !PLW.hong) {
    let o = ds.find(q => !q.ban); while (!o && !PLW.hong) { await new Promise(r => setTimeout(r, 5)); o = ds.find(q => !q.ban); }
    if (o && !PLW.hong) {
      try { return await plWorkerGui(o, {F, nf, valid, mu: Float64Array.from(mu), a: Float64Array.from(a), refs: refs.map(r => ({v: Array.from(r.v), k: r.k})), K, cos, s, kv}, PLW.CHO_VIEC); }
      catch (e) { o.ban = false; /* rơi xuống tính trên trang */ } }
  }
  const n = valid.length, cls = new Uint8Array(n), s1 = new Float32Array(n), mg = new Float32Array(n), k2 = new Int8Array(n).fill(-1), x = new Float32Array(nf);
  for (let i = 0; i < n; i++) { if (!valid[i]) continue; const raw = F.subarray(i * nf, i * nf + nf), v = cos ? plChuan(raw, mu, a, x) : raw, r = plXep(v, refs, K, cos, s, kv);
    cls[i] = r.k + 1; s1[i] = r.s1; mg[i] = r.m; k2[i] = r.k2; if (i % 50000 === 49999) await plTre(); }
  return {cls, s1, mg, k2};
}

/* ---------------- ① phân loại theo khối ---------------- */
async function plChayKhoi(tuDong) {
  const tok = ++PL.tok, tt = pl$("plTT"), y = +pl$("plNam").value, he = pl$("plHe").value, pp = pl$("plPP").value, kv = /_mau$/.test(pp) ? Math.max(1, +pl$("plK").value || 1) : 1;
  const cos = pp.startsWith("cos"), t0 = Date.now(), B = PL_KHOI.B, LE = PL_KHOI.LE;
  try {
    if (!MAN) throw new Error(T("chưa nạp manifest"));
    const ids = plDT(); if (!ids.length) throw new Error(T("chọn ít nhất một đặc trưng"));
    const PV = v27PhamVi(pl$("plPV").value, [...pl$("plXa").selectedOptions].map(o => +o.value), pl$("plVung").value);
    const g = plLuoiKhoi(PV.bb, plKhoiChon() || 10), N = g.w * g.h;
    const vung = PV.mp ? CORE.rasterizeRings(CORE.polysToPixRings(g, PV.mp), g.w, g.h) : null;
    const khoi = [];
    for (let j0 = 0; j0 < g.h; j0 += B) for (let i0 = 0; i0 < g.w; i0 += B) {
      const w = Math.min(B, g.w - i0), h = Math.min(B, g.h - j0); let co = !vung;
      for (let j = j0; j < j0 + h && !co; j++) { const o = j * g.w; for (let i = i0; i < i0 + w; i++) if (vung[o + i]) { co = true; break; } }
      if (co) khoi.push({i0, j0, w, h}); }
    if (!khoi.length) throw new Error(T("phạm vi này gần như không có dữ liệu"));
    // 1. thống kê chung: thang byte (PC, DEM) và trung bình, độ lệch chuẩn từ các khối mẫu rải khắp phạm vi
    const buocK = Math.max(1, Math.floor(khoi.length / PL_KHOI.THONG_KE)), mauK = khoi.filter((_, k) => k % buocK === 0).slice(0, PL_KHOI.THONG_KE);
    const oMau = mauK.map(kh => { const s = Math.min(96, kh.w, kh.h); return plLuoiCon(g, kh.i0 + Math.floor((kh.w - s) / 2), kh.j0 + Math.floor((kh.h - s) / 2), s, s); });
    const sc = {__thu: {}};
    for (let k = 0; k < oMau.length; k++) { tt.textContent = T("theo khối: lấy thống kê chung ({i}/{n})…", {i: k + 1, n: oMau.length});
      try { await vgDoc(oMau[k], y, ids, sc, {khongLop: true}); } catch (e) { /* khối ngoài vùng dữ liệu */ } if (tok !== PL.tok) return; }
    Object.entries(sc.__thu).forEach(([key, t]) => { let r = [CORE.phanVi(t.a, t.q), CORE.phanVi(t.a, 1 - t.q)]; if (r[0] == null || !(r[1] > r[0])) r = [r[0] || 0, (r[0] || 0) + 1]; sc[key] = r; });
    delete sc.__thu;
    let nf = 0, n0 = 0, mu = null, sq = null; const mauPCA = [];
    for (const gc of oMau) { let D; try { D = await vgDoc(gc, y, ids, sc, {khongLop: true}); } catch (e) { continue; } if (tok !== PL.tok) return;
      const S = CORE.stackFeat(D.lst, gc.w * gc.h); nf = S.nf; if (!mu) { mu = new Float64Array(nf); sq = new Float64Array(nf); }
      for (let jj = 0; jj < gc.h; jj++) for (let ii = 0; ii < gc.w; ii++) { const i = jj * gc.w + ii, gi = (Math.round((g.y1 - gc.y1) / g.res) + jj) * g.w + Math.round((gc.x0 - g.x0) / g.res) + ii;
        if (!S.valid[i] || (vung && !vung[gi])) continue; n0++; for (let c = 0; c < nf; c++) { const v = S.F[i * nf + c]; mu[c] += v; sq[c] += v * v; }
        if (mauPCA.length < 20000 && (i % 3 === 0)) mauPCA.push(S.F.slice(i * nf, i * nf + nf)); } }
    if (n0 < 10) throw new Error(T("phạm vi này gần như không có dữ liệu"));
    const a = new Float64Array(nf); for (let c = 0; c < nf; c++) { mu[c] /= n0; a[c] = 1 / Math.max(Math.sqrt(Math.max(sq[c] / n0 - mu[c] * mu[c], 0)), 1); }
    // 2. mẫu huấn luyện: đọc đặc trưng tại mọi điểm mẫu theo khối nhỏ quanh điểm, cùng lưới và cùng thang
    const bo = pl$("plBo").value || plBoTot(y, he), dac = new Set((SCHEME.dac_biet || []).map(c => c.ma)), nguon = (pl$("plNguon") && pl$("plNguon").value) || "trong";
    const trong = [], ngoai = [];
    Object.values(ST.diem).forEach(p => { if (!((bo === "*" || p.bo === bo) && p.nhan[y] && !dac.has(p.nhan[y]))) return; const k = plKhoa(p.nhan[y], he); if (!k) return;
      const q = CORE.llToPix(g, p.lon, p.lat), x = Math.floor(q[0]), yy = Math.floor(q[1]), i = yy * g.w + x;
      if (x >= 0 && yy >= 0 && x < g.w && yy < g.h && (!vung || vung[i])) trong.push({p, i, key: k}); else if (nguon !== "trong") ngoai.push({p, key: k, ngoai: true}); });
    let dNgoai = 0, catBot = 0, chon = [];
    if (ngoai.length) { const dMax = nguon === "all" ? Infinity : +nguon.slice(1) * 1000, dk = plKhoangCach(PV); ngoai.forEach(o => { o.d = dk(o.p.lon, o.p.lat); });
      chon = ngoai.filter(o => o.d <= dMax).sort((p, q) => p.d - q.d); if (chon.length > PL_MAX_NGOAI) { catBot = chon.length - PL_MAX_NGOAI; chon = chon.slice(0, PL_MAX_NGOAI); } }
    const tatCa = trong.concat(chon);
    if (tatCa.length) { const ok = await plDocNgoai(g, y, ids, sc, tatCa, async (i, n) => { tt.textContent = T("theo khối: đọc đặc trưng tại {m} điểm mẫu ({i}/{n} khối)…", {m: tatCa.length, i, n}); await plTre(); return tok === PL.tok; });
      if (!ok || tok !== PL.tok) return; }
    const mau = tatCa.filter(o => o.raw); mau.forEach(o => { if (o.ngoai) dNgoai = Math.max(dNgoai, o.d); });
    const keys = [...new Set(mau.map(m => m.key))].sort((a_, b_) => he === "3" ? a_ - b_ : SCHEME.lop.findIndex(c => c.ma === a_) - SCHEME.lop.findIndex(c => c.ma === b_));
    if (keys.length < 2) throw new Error(T("cần điểm mẫu có nhãn năm {y} của ít nhất hai lớp nằm trong phạm vi", {y}) + (nguon === "trong" ? "; " + T("hoặc chọn Mẫu huấn luyện: thêm vùng xung quanh, mọi điểm đã gán") : ""));
    const K = keys.length, lab = mau.map(m => keys.indexOf(m.key)), lop = keys.map(k => plMoTaLop(k, he)), s = 1 / (255 * Math.sqrt(nf));
    const V = mau.map(m => cos ? plChuan(m.raw, mu, a, new Float32Array(nf)) : Float32Array.from(m.raw)), refs = plThamChieu(V, lab, K, pp, PL_MAX_REF);
    const KD = plKiemDinh(V, lab, K, pp, kv, s);
    const gm = V.map((v, i) => { let b = -Infinity; if (/_mau$/.test(pp)) V.forEach((u, j) => { if (j !== i) b = Math.max(b, plGiong(v, u, cos, s)); }); else refs.forEach(r => { b = Math.max(b, plGiong(v, r.v, cos, s)); }); return b; });
    const tau = V.length >= 20 ? CORE.phanVi(gm, 0.05) : Math.min(...gm), m0 = cos ? 0.02 : 0.01;
    let W3 = null; if (HX.dt > 0 && mauPCA.length > 50) W3 = hxPCA3(mauPCA.map((_, k) => k), {length: 0}, nf, mu, a, mauPCA);
    // 3. phân loại từng khối (có lề), ghép
    const cls = new Uint8Array(N), xa = new Uint8Array(N), lan = new Uint8Array(N), ra = CORE.rowArea(g), cap = {}, dt = new Float64Array(K), manh = [];
    let tong = 0, haXa = 0, haLan = 0, xong = 0, doi = 0, nChay = 0, soDT = 0; const loiKhoi = [];
    const minXa = Math.max(1, Math.round(1e4 / Math.pow(g.res * Math.cos(CORE.m2ll(0, (g.bb[1] + g.bb[3]) / 2)[1] * Math.PI / 180), 2)));
    const viec = khoi.map(kh => async () => {
      if (tok !== PL.tok) return;
      const i0 = Math.max(0, kh.i0 - LE), j0 = Math.max(0, kh.j0 - LE), i1 = Math.min(g.w, kh.i0 + kh.w + LE), j1 = Math.min(g.h, kh.j0 + kh.h + LE), gc = plLuoiCon(g, i0, j0, i1 - i0, j1 - j0), n = gc.w * gc.h;
      let D; try { D = await vgDoc(gc, y, ids, sc, {khongLop: true}); } catch (e) { loiKhoi.push(e.message || String(e)); return; }
      if (tok !== PL.tok) return;
      const S = CORE.stackFeat(D.lst, n), hop = new Uint8Array(n);
      for (let jj = 0; jj < gc.h; jj++) for (let ii = 0; ii < gc.w; ii++) { const i = jj * gc.w + ii; if (S.valid[i] && (!vung || vung[(j0 + jj) * g.w + i0 + ii])) hop[i] = 1; }
      const R = await plTinhKhoi(S.F, nf, hop, mu, a, refs, K, cos, s, kv); if (tok !== PL.tok) return;
      const goc = R.cls.slice();
      if (W3) { const d = W3.length, P = new Float32Array(n * d); for (let i = 0; i < n; i++) if (hop[i]) for (let k = 0; k < d; k++) { let t = 0; const w = W3[k].w; for (let c = 0; c < nf; c++) t += (S.F[i * nf + c] - mu[c]) * a[c] * w[c]; P[i * d + k] = t; }
        const L_ = hxSLIC(P, d, gc.w, gc.h, hop, Math.max(3, Math.round(HX.dt / g.res)), 1.5, 6); hxBoPhieu(R.cls, L_.lab, L_.n, K, R.mg); soDT += L_.n; }
      if (HX.ds > 0) hxDaSo(R.cls, gc.w, gc.h, K, HX.ds);
      if (HX.mmu > 0) hxManhNho(R.cls, gc.w, gc.h, hxMinPx(g, HX.mmu));
      const xaT = new Uint8Array(kh.w * kh.h);
      for (let jj = 0; jj < kh.h; jj++) { const gy = kh.j0 + jj, ha = ra[gy] / 1e4;
        for (let ii = 0; ii < kh.w; ii++) { const gx = kh.i0 + ii, i = (gy - j0) * gc.w + (gx - i0), gi = gy * g.w + gx; if (!hop[i] || !R.cls[i]) continue;
          const c = R.cls[i]; cls[gi] = c; nChay++; tong += ha; dt[c - 1] += ha; if (c !== goc[i]) doi++;
          if (R.s1[i] < tau) { xa[gi] = 1; xaT[jj * kh.w + ii] = 1; haXa += ha; }
          if (R.mg[i] < m0 && R.k2[i] >= 0) { lan[gi] = 1; haLan += ha; const t = [c - 1, R.k2[i]].sort((p, q) => p - q).join(","); cap[t] = (cap[t] || 0) + ha; } } }
      const LC = CORE.labelComp(CORE.removeSmall(xaT, kh.w, kh.h, minXa), kh.w, kh.h, 8, 1);
      if (LC.n) { const acc = new Map(); for (let i = 0; i < kh.w * kh.h; i++) { const l = LC.lab[i]; if (!l) continue; const ii = i % kh.w, jj = (i - ii) / kh.w, gy = kh.j0 + jj, gx = kh.i0 + ii;
          const o = acc.get(l) || {n: 0, ha: 0, sx: 0, sy: 0, lop: new Float64Array(K)}; o.n++; const ha = ra[gy] / 1e4; o.ha += ha; o.sx += gx; o.sy += gy; o.lop[cls[gy * g.w + gx] - 1] += ha; acc.set(l, o); }
        acc.forEach(o => { const ll = CORE.pixToLL(g, o.sx / o.n + 0.5, o.sy / o.n + 0.5); let kk = 0; for (let k = 1; k < K; k++) if (o.lop[k] > o.lop[kk]) kk = k;
          manh.push({ha: o.ha, lon: ll[0], lat: ll[1], k: kk, xa: VG.xa ? (vgXaTai(ll[0], ll[1]) || {}).ten : null}); }); }
      xong++; const giay = (Date.now() - t0) / 1000, con = xong ? giay / xong * (khoi.length - xong) : 0;
      tt.textContent = T("theo khối: {a}/{b} khối, còn khoảng {m} phút", {a: xong, b: khoi.length, m: Math.max(1, Math.round(con / 60))});
    });
    tt.textContent = T("theo khối: {a}/{b} khối, còn khoảng {m} phút", {a: 0, b: khoi.length, m: "…"});
    await plHang(viec, PL_KHOI.SONG); if (tok !== PL.tok) return;
    if (!nChay) throw new Error(loiKhoi[0] || T("phạm vi này gần như không có dữ liệu"));
    manh.sort((p, q) => q.ha - p.ha);
    const tach = plTach(V, lab, K), sai = []; mau.forEach((m, i) => { if (KD.du[i] >= 0 && KD.du[i] !== lab[i]) sai.push({id: m.p.id, that: lab[i], du: KD.du[i], mg: KD.mg[i]}); }); sai.sort((p, q) => q.mg - p.mg);
    const soMau = new Int32Array(K), soNgoai = new Int32Array(K); lab.forEach((k, i) => { soMau[k]++; if (mau[i].ngoai) soNgoai[k]++; });
    const Mt = Array.from({length: K}, () => new Float64Array(K)); mau.forEach((m, i) => { if (!m.ngoai && KD.du[i] >= 0) Mt[lab[i]][KD.du[i]]++; });
    let xaTrong = []; if (VG.xa && N <= 10e6) { const XI = vgXaIdx(g), haX = {}, coMau = new Set(); for (let i = 0; i < N; i++) if (cls[i] && XI[i]) haX[XI[i]] = (haX[XI[i]] || 0) + ra[Math.floor(i / g.w)] / 1e4;
      mau.forEach(m => { if (!m.ngoai && XI[m.i]) coMau.add(XI[m.i]); });
      xaTrong = Object.entries(haX).filter(([x0, h]) => !coMau.has(+x0) && h >= 0.01 * tong).map(([x0, h]) => ({ten: (VG.xa.find(q => q.i === +x0) || {}).ten || x0, ha: h, x: +x0})).sort((p, q) => q.ha - p.ha); }
    const hx = HX.dt > 0 || HX.ds > 0 || HX.mmu > 0 ? {buoc: [].concat(HX.dt > 0 && W3 ? [["dt", soDT, HX.dt]] : [], HX.ds > 0 ? [["ds", 2 * HX.ds + 1]] : [], HX.mmu > 0 ? [["mmu", HX.mmu]] : []), doi, tong: nChay, dt: HX.dt, ds: HX.ds, mmu: HX.mmu} : null;
    PL.kq = {g, PV, y, he, pp, kv, bo, K, keys, lop, cls, s1: null, mg: null, xa, lan, tau, m0, dt, tong, haXa, haLan, cap, manh, tach, sai, soMau, xaTrong, KD, mau, lab, nMau: mau.length, nRef: refs.length, ids, chay: nChay,
      nguon, soNgoai, nNgoai: mau.filter(m => m.ngoai).length, dNgoai, catBot, Mt, hx, khoi: {n: khoi.length, B, res: g.res, giay: Math.round((Date.now() - t0) / 1000), tuDong: !!tuDong, loi: loiKhoi.length, worker: !!(PLW.ds && !PLW.hong)}};
    plVeKQ(); pl$("plKQ").hidden = false;
    tt.textContent = T("xong: {n} điểm mẫu, {k} lớp, {h} ha", {n: mau.length, k: K, h: tong.toFixed(0)});
  } catch (e) { if (tok === PL.tok) tt.textContent = T("lỗi: ") + (typeof vgLoiDoc === "function" ? vgLoiDoc(e) : (e.message || e)); }
  if (typeof TIFF_PT !== "undefined") TIFF_PT.clear();
}
var _hxPCA3_315 = hxPCA3;
hxPCA3 = function (chay, F, nf, mu, a, mauVec) {   // bản 3.15: nhận thẳng các véc tơ mẫu (theo khối)
  if (!mauVec) return _hxPCA3_315.apply(this, arguments);
  const n = mauVec.length, G = new Uint8Array(n * nf); mauVec.forEach((v, k) => G.set(v, k * nf));
  return _hxPCA3_315(Array.from({length: n}, (_, k) => k), G, nf, mu, a);
};
function plLoiLonRe() {                           // câu báo "vùng đọc quá lớn" (theo ngôn ngữ đang chọn)
  const t = T("vùng đọc quá lớn ({m} triệu giá trị): thu hẹp phạm vi hoặc tắt dữ liệu gốc 10 m", {m: "§"}).split("§")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(t);
}
var _plChay315 = plChay;
plChay = async function () {                      // chọn lưới đơn hay theo khối; lưới đơn quá lớn thì tự chuyển
  if (plKhoiChon() !== null) return plChayKhoi(false);
  await _plChay315.apply(this, arguments);
  if (plLoiLonRe().test(pl$("plTT").textContent)) {
    msg(T("Phạm vi lớn: lưới đơn không đọc được, tự chuyển sang phân loại theo khối (huấn luyện một lần, phân loại từng khối rồi ghép)."), "ok", 7000);
    return plChayKhoi(true);
  }
};
var _plVeKQ315 = plVeKQ;
plVeKQ = function () {
  const r = _plVeKQ315.apply(this, arguments), K = PL.kq; if (!K || !K.khoi) return r;
  pl$("plTom").insertAdjacentHTML("beforeend", `<p class="mu sm">${T("Theo khối: {n} khối {b} × {b} điểm ảnh, lưới {r} m, {s} giây{w}.", {n: K.khoi.n, b: K.khoi.B, r: Math.round(K.khoi.res), s: K.khoi.giay, w: K.khoi.worker ? ", " + T("tính song song trên nhiều nhân") : ""})}` +
    (K.khoi.tuDong ? " " + T("Đã tự chuyển sang theo khối vì phạm vi quá lớn cho lưới đơn.") : "") + (K.khoi.loi ? " " + T("{n} khối không đọc được (ngoài vùng dữ liệu).", {n: K.khoi.loi}) : "") +
    (K.s1 ? "" : " " + T("Bản đồ “độ giống mẫu” không có ở chế độ theo khối (tiết kiệm bộ nhớ).")) + `</p>`);
  return r;
};
function plThuNho(w, h) { const f = Math.max(1, Math.ceil(Math.max(w, h) / PL_KHOI.HIEN)); return {f, w: Math.ceil(w / f), h: Math.ceil(h / f)}; }
var _plCanvas315 = plCanvas;
plCanvas = function (K, mode) {                   // bản đồ lớn (theo khối): ảnh thu nhỏ ≤ 4096 điểm ảnh mỗi chiều để hiện, để xuất
  if (mode === "tin" && !K.s1) mode = "lop";
  if (mode === "cb" && !(K.xa && K.lan)) mode = "lop";
  if (Math.max(K.g.w, K.g.h) <= PL_KHOI.HIEN) return _plCanvas315.call(this, K, mode);
  const z = plThuNho(K.g.w, K.g.h), c = document.createElement("canvas"); c.width = z.w; c.height = z.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(z.w, z.h), d = img.data, rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], mau = K.lop.map(l => rgb(l.mau));
  for (let y = 0; y < z.h; y++) { const sy = Math.min(K.g.h - 1, y * z.f + (z.f >> 1));
    for (let x = 0; x < z.w; x++) { const i = sy * K.g.w + Math.min(K.g.w - 1, x * z.f + (z.f >> 1)), c_ = K.cls[i]; if (!c_) continue; let o = null;
      if (mode === "lop") o = mau[c_ - 1]; else if (mode === "cb") { if (K.xa[i]) o = [236, 72, 153]; else if (K.lan[i]) o = [245, 158, 11]; }
      if (o) { const j = (y * z.w + x) * 4; d[j] = o[0]; d[j + 1] = o[1]; d[j + 2] = o[2]; d[j + 3] = 205; } } }
  ctx.putImageData(img, 0, 0); c._mode = mode; return c;
};
var _xbCGPL315 = xbCGPL;
xbCGPL = function (K, md) { if (md === "cb" && !(K.xa && K.lan)) md = "lop"; if (md === "tin" && !K.s1) md = "lop"; return _xbCGPL315.call(this, K, md); };
var _plVe315 = plVe;
plVe = function () { const K = PL.kq; if (K && pl$("plXem").value === "tin" && !K.s1) pl$("plXem").value = "lop"; if (K && pl$("plXem").value === "cb" && !(K.xa && K.lan)) pl$("plXem").value = "lop"; return _plVe315.apply(this, arguments); };
pl$("plXem").onchange = () => plVe();
var _plGeo315 = plGeo;
plGeo = function () {                             // GeoJSON véc tơ hoá cả bản đồ: quá lớn thì khuyên GeoTIFF (không treo trình duyệt)
  const K = PL.kq; if (K && K.g.w * K.g.h > 16e6) { msg(T("bản đồ quá lớn để xuất GeoJSON ({m} triệu điểm ảnh): dùng GeoTIFF, hoặc phân loại từng xã", {m: Math.round(K.g.w * K.g.h / 1e6)}), "er", 8000); return; }
  return _plGeo315.apply(this, arguments);
};
pl$("plGeo").onclick = () => plGeo();
var _paCanvas315 = paCanvas;
paCanvas = function (pa, y) {                     // phương án lớn: ảnh thu nhỏ
  const q = paLuoi(pa, y); if (!q || Math.max(q.g.w, q.g.h) <= PL_KHOI.HIEN) return _paCanvas315.apply(this, arguments);
  const z = plThuNho(q.g.w, q.g.h), c = document.createElement("canvas"); c.width = z.w; c.height = z.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(z.w, z.h), d = img.data, bang = {};
  Object.entries(pa.lop).forEach(([v, l]) => { const h = l.mau || "#999999"; bang[v] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
  for (let yy = 0; yy < z.h; yy++) { const sy = Math.min(q.g.h - 1, yy * z.f + (z.f >> 1));
    for (let x = 0; x < z.w; x++) { const o = bang[q.data[sy * q.g.w + Math.min(q.g.w - 1, x * z.f + (z.f >> 1))]]; if (!o) continue; const j = (yy * z.w + x) * 4; d[j] = o[0]; d[j + 1] = o[1]; d[j + 2] = o[2]; d[j + 3] = 235; } }
  ctx.putImageData(img, 0, 0); return c;
};
plLamMinTG = function (kq, ys) {                  // bản 3.15: làm mịn theo năm từng điểm ảnh, không tạo mảng phụ lớn (bản đồ theo khối)
  const g0 = kq[ys[0]].g; if (ys.some(y => kq[y].g.w !== g0.w || kq[y].g.h !== g0.h || kq[y].g.x0 !== g0.x0 || kq[y].g.y1 !== g0.y1)) return 0;
  const T_ = ys.length, Ks = ys.map(y => kq[y]), v = Ks.map(K => K.lop.map(l => +l.v)), vt = Ks.map(K => new Map(K.lop.map((l, k) => [+l.v, k + 1]))), s = new Array(T_);
  const doiNam = new Int32Array(T_); let doi = 0;
  for (let i = 0; i < Ks[0].cls.length; i++) {
    for (let t = 0; t < T_; t++) { const c = Ks[t].cls[i]; s[t] = c ? v[t][c - 1] : 0; }
    for (let t = 1; t < T_ - 1; t++) { const a = s[t - 1]; if (a && a === s[t + 1] && s[t] && s[t] !== a) { const c = vt[t].get(a); if (c) { Ks[t].cls[i] = c; s[t] = a; doiNam[t]++; doi++; } } }
  }
  ys.forEach((y, t) => { if (doiNam[t]) { plDienTich(kq[y]); kq[y].doiTG = doiNam[t]; } });
  return doi;
};
var _plChayLoat315 = plChayLoat;
plChayLoat = async function () {                  // nhiều năm theo khối: bỏ dữ liệu chẩn đoán lớn của các năm trước để đỡ bộ nhớ
  const _plChay = plChay; let truoc = null;
  plChay = async function () { await _plChay.apply(this, arguments); if (truoc && truoc !== PL.kq && truoc.khoi) { truoc.xa = null; truoc.lan = null; } if (PL.kq && PL.kq.khoi) truoc = PL.kq; };
  try { return await _plChayLoat315.apply(this, arguments); } finally { plChay = _plChay; }
};
pl$("plLuoi").addEventListener("change", () => { ls("laymau_hp_pl_luoi_v1", pl$("plLuoi").value); });
(function () { const v = ls("laymau_hp_pl_luoi_v1"); if (v && [...pl$("plLuoi").options].some(o => o.value === v)) pl$("plLuoi").value = v; })();

/* ---------------- ② gộp nhiều phương án thành một bản đồ ---------------- */
async function paGop(ids, ten) {
  const ds = ids.map(id => PA.rieng.find(q => q.id === id)).filter(Boolean);
  if (ds.length < 2) throw new Error(T("chọn ít nhất hai phương án tạo trong trang hoặc nhập vào"));
  const ys = [...new Set([].concat(...ds.map(paNamDS)))].sort((a, b) => a - b);
  let res = Infinity, bb = [Infinity, Infinity, -Infinity, -Infinity];
  ds.forEach(pa => paNamDS(pa).forEach(y => { const q = paLuoi(pa, y); if (!q) return; res = Math.min(res, q.g.res); bb = [Math.min(bb[0], q.g.bb[0]), Math.min(bb[1], q.g.bb[1]), Math.max(bb[2], q.g.bb[2]), Math.max(bb[3], q.g.bb[3])]; }));
  if (!isFinite(res)) throw new Error(T("các phương án đã chọn không có dữ liệu"));
  let r = Math.max(10, Math.round(res / 10) * 10), g = CORE.gridFor(bb, 1e9, {x0: 0, y1: 0, res0: r}); while (g.w * g.h > PL_KHOI.MAX) { r += 10; g = CORE.gridFor(bb, 1e9, {x0: 0, y1: 0, res0: r}); }
  const lop = {}, trung = [];
  ds.forEach(pa => Object.entries(pa.lop).forEach(([v, l]) => { if (!lop[v]) lop[v] = Object.assign({}, l); else if (lop[v].ma !== l.ma && (lop[v].ten !== l.ten)) trung.push(v); }));
  const du = {};
  for (const y of ys) { const out = new Uint8Array(g.w * g.h);
    for (const pa of ds) { if (!paNamDS(pa).includes(y)) continue; const v = await paDoc(pa, g, y); if (!v) continue; for (let i = 0; i < out.length; i++) if (!out[i] && v[i]) out[i] = v[i]; }
    du[y] = {g0: {x0: g.x0, y1: g.y1, res: g.res, w: g.w, h: g.h}, data: out}; }
  const pa = {id: "gop_" + Date.now().toString(36), ten: ten || T("Gộp {n} phương án: {t}", {n: ds.length, t: ds.slice(0, 3).map(paTen).join(", ") + (ds.length > 3 ? " …" : "")}),
    nguon: "tao", nam: ys, lop, du, tham_so: {gop: ds.map(paTen), pham_vi: ds.map(p => (p.tham_so || {}).pham_vi).filter(Boolean).join(", ")}, tao_luc: new Date().toISOString()};
  paThem(pa);
  return {pa, res: g.res, trung: [...new Set(trung)]};
}
(function () {
  const box = tk$("tkPA"); if (!box || tk$("tkGop")) return;
  box.insertAdjacentHTML("afterend", `<div class="row"><button type="button" id="tkGop"></button><span class="mu sm" id="tkGopTT" data-noi18n></span></div>`);
  tk$("tkGop").onclick = async () => {
    const ids = [...tk$("tkPA").querySelectorAll("input[type=checkbox]:checked")].map(i => i.value).filter(id => PA.rieng.some(q => q.id === id));
    tk$("tkGopTT").textContent = T("đang gộp…");
    try { const r = await paGop(ids); tk$("tkGopTT").textContent = T("đã gộp thành {t} (lưới {r} m)", {t: paTen(r.pa), r: Math.round(r.res)}) + (r.trung.length ? "; " + T("có mã lớp trùng nhau giữa các phương án: kiểm tra chú giải") : ""); }
    catch (e) { tk$("tkGopTT").textContent = T("lỗi: ") + (e.message || e); }
  };
  plKhoiChu();
})();
function plKhoiChu() {
  if (tk$("tkGop")) { tk$("tkGop").textContent = T("Gộp các phương án đã chọn"); tk$("tkGop").title = T("ghép các bản đồ đã chọn (ví dụ phân loại từng xã) thành một bản đồ trên lưới chung; chỗ chồng nhau lấy bản đồ đứng trước trong danh sách"); }
}
if (typeof setLang === "function") { const _sl315 = setLang; setLang = function () { const r = _sl315.apply(this, arguments); plKhoiChu(); return r; }; }
