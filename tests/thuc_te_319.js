// Bản 3.19: kiểm trên ảnh thật (dán vào bảng điều khiển trình duyệt ở trang geoportal đã chạy, cần S2OC, CORE, VG.xa):
// đọc mọi cảnh Sentinel-2 L2A quang đãng của một xã như v319_ui.js (gộp ngày nhiều ô MGRS, SCL, phản xạ = DN·s + o), cộng dồn tổng năm,
// tính hệ số góc NDVI từng cặp năm và cả khoảng, so sánh tổng năm với hồi quy tính trực tiếp trên chuỗi đọc lại tại vài điểm ảnh.
window.TT319 = async function (xaId, A, B, toiDa, luoi) {
  const x = VG.xa.find(q => q.i === xaId), g = CORE.gridFor(x.bb, luoi || 250, {x0: 0, y1: 0, res0: 10}), N = g.w * g.h;
  const vung = CORE.rasterizeRings(CORE.polysToPixRings(g, x.mp), g.w, g.h), p0 = CORE.m2ll(g.bb[0], g.bb[1]), p1 = CORE.m2ll(g.bb[2], g.bb[3]);
  const namTP = d => { const y = +d.slice(0, 4), a = Date.UTC(y, 0, 1), b = Date.UTC(y + 1, 0, 1); return y + (Date.UTC(y, +d.slice(5, 7) - 1, +d.slice(8, 10)) + 43200000 - a) / (b - a); };
  const S = {}, luoiG = {}, st = {}, mau = [];                        // mau: vài điểm ảnh giữ cả chuỗi để đối chiếu
  for (let i = 0, k = 0; i < N && k < 40; i += 997) if (vung[i]) { mau.push(i); k++; }
  const chuoi = new Map(mau.map(i => [i, []]));
  for (let y = A; y <= B; y++) {
    const ds = (await S2OC.tim({nguon: "s2", bbox: [p0[0], p0[1], p1[0], p1[1]], datetime: S2OC.cuaSo(y, [1, 12]), may: 60, gioi_han: 100})).slice(0, toiDa || 25);
    const s = {n: new Uint16Array(N), t: new Float64Array(N), tt: new Float64Array(N), y: new Float64Array(N), ty: new Float64Array(N), yy: new Float64Array(N)}; S[y] = s;
    const nhom = new Map(); ds.forEach(sc => { const a = nhom.get(sc.ngay) || []; a.push(sc); nhom.set(sc.ngay, a); });
    st[y] = {tim: ds.length, dung: 0, quan: 0, offset: [...new Set(ds.map(sc => sc.o))].join("/")};
    const ngays = [...nhom.keys()]; let j = 0;
    await Promise.all([0, 1, 2].map(async () => { while (j < ngays.length) { const d = ngays[j++], val = new Float32Array(N).fill(NaN); let co = 0;
      for (const sc of nhom.get(d)) { try {
        const G = luoiG[sc.epsg] || (luoiG[sc.epsg] = S2OC.luoiAnh(sc.epsg, g.bb, g.w, g.h));
        const scl = await S2OC.layMau(S2OC.url(sc, "SCL"), G, [0]); let k = 0; for (let i = 0; i < N; i++) if (vung[i] && val[i] !== val[i] && S2OC.quang("s2", scl[i])) k++; if (!k) continue;
        const [b4, b8] = await Promise.all(["B4", "B8"].map(b => S2OC.layMau(S2OC.url(sc, b), G, [0])));
        for (let i = 0; i < N; i++) { if (!vung[i] || val[i] === val[i] || !S2OC.quang("s2", scl[i]) || !(b4[i] > 0) || !(b8[i] > 0)) continue;
          const r = b4[i] * sc.s + sc.o, n = b8[i] * sc.s + sc.o, v = (n - r) / Math.max(n + r, 1e-6); if (isFinite(v)) { val[i] = v; co++; } } } catch (e) { console.warn(sc.id, e); } }
      if (co) { const t = namTP(d) - y; for (let i = 0; i < N; i++) { const v = val[i]; if (v === v) { s.n[i]++; s.t[i] += t; s.tt[i] += t * t; s.y[i] += v; s.ty[i] += t * v; s.yy[i] += v * v; } }
        st[y].dung++; st[y].quan += co; mau.forEach(i => { if (val[i] === val[i]) chuoi.get(i).push([namTP(d), val[i]]); }); } } }));
  }
  const ky = (ys, i) => { let n = 0, a1 = 0, a2 = 0, b1 = 0, ab = 0, b2 = 0; ys.forEach(y => { const s = S[y], m = s.n[i], d = y - ys[0]; if (!m) return; n += m; a1 += s.t[i] + m * d; a2 += s.tt[i] + 2 * d * s.t[i] + d * d * m; b1 += s.y[i]; ab += s.ty[i] + d * s.y[i]; b2 += s.yy[i]; });
    const sxx = a2 - a1 * a1 / n, sxy = ab - a1 * b1 / n, s2 = b2 - b1 * b1 / n; return n >= 4 && sxx > 1e-6 * n ? [sxy / sxx, sxy * sxy / (sxx * s2), n] : null; };
  const lop = a => (a < -0.2 ? 1 : a < -0.1 ? 2 : a <= 0.1 ? 3 : a <= 0.2 ? 4 : 5), ra = CORE.rowArea(g), kq = [];
  for (let y = A; y < B; y++) { const dt = [0, 0, 0, 0, 0, 0]; let sr = 0, nr = 0, sn = 0;
    for (let i = 0; i < N; i++) { if (!vung[i] || !S[y].n[i] || !S[y + 1].n[i]) continue; const r = ky([y, y + 1], i); if (!r) continue; dt[lop(r[0])] += ra[Math.floor(i / g.w)] / 1e4; if (isFinite(r[1])) { sr += r[1]; nr++; } sn += r[2]; }
    kq.push({ky: y + "-" + (y + 1), dt: dt.slice(1).map(v => +v.toFixed(1)), canBang: +((dt[4] + dt[5]) - (dt[1] + dt[2])).toFixed(1), r2: +(sr / nr).toFixed(3), n: +(sn / Math.max(1, nr)).toFixed(1)}); }
  // đối chiếu: hồi quy trực tiếp trên chuỗi điểm (t tuyệt đối) = hồi quy từ tổng năm có dời gốc
  let lech = 0, dem = 0;
  mau.forEach(i => { const c = chuoi.get(i).filter(q => q[0] >= A && q[0] < A + 2); if (c.length < 4) return; const r = ky([A, A + 1], i); if (!r) return;
    const n = c.length, mt = c.reduce((s, q) => s + q[0], 0) / n, mv = c.reduce((s, q) => s + q[1], 0) / n; let sxy = 0, sxx = 0; c.forEach(q => { sxy += (q[0] - mt) * (q[1] - mv); sxx += (q[0] - mt) ** 2; });
    lech = Math.max(lech, Math.abs(sxy / sxx - r[0])); dem++; });
  const nCa = []; for (let i = 0; i < N; i += 13) if (vung[i]) { let n = 0; for (let y = A; y <= B; y++) n += S[y].n[i]; nCa.push(n); }
  return {xa: x.ten, luoi: g.w + "x" + g.h, o_m: +(g.res * Math.cos(CORE.m2ll((g.bb[0] + g.bb[2]) / 2, (g.bb[1] + g.bb[3]) / 2)[1] * Math.PI / 180)).toFixed(1), st, kq,
          doiChieu: {diem: dem, lechLonNhat: lech}, quanSatCaKhoang: {tb: +(nCa.reduce((s, v) => s + v, 0) / nCa.length).toFixed(1), min: Math.min(...nCa), max: Math.max(...nCa)}, _S: S, _g: g, _vung: vung};
};
