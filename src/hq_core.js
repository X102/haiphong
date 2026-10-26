/* =============================== BẢN 3.19: LÕI HỒI QUY CHỈ SỐ THEO ẢNH ĐA THỜI GIAN (thuần JS, thử được bằng node) =============================== */
/* Theo luận án (mục 2.8.2, công thức 18, 19): với từng điểm ảnh, hệ số góc a của chỉ số theo thời gian t (năm thập phân) tính bằng
   bình phương nhỏ nhất trên MỌI lần quan sát quang đãng trong khoảng, không chỉ hai thời điểm đầu cuối; R² = 1 − SSE/SST.
   Hồi quy theo bước năm: mỗi cặp năm liền kề một lần; 5 cấp: giảm mạnh a < −0.2, giảm vừa −0.2 ≤ a < −0.1, ổn định |a| ≤ 0.1,
   tăng vừa 0.1 < a ≤ 0.2, tăng mạnh a > 0.2.
   Cách tính để đọc ảnh một lượt: mỗi năm giữ 6 tổng cộng dồn (n, Σt, Σt², Σy, Σty, Σy²) với t tính từ đầu năm đó; tổng của một
   khoảng nhiều năm là tổng các năm sau khi dời gốc thời gian (t' = t + d), nên cặp năm và cả khoảng tính ngay từ các tổng năm,
   không phải giữ từng lần quan sát. Thêm: p hai phía của hệ số góc (kiểm định t, df = n − 2, qua hàm beta không đầy đủ). */
var HQC = (function () {
  "use strict";
  function namTP(ngay) {                                  // "YYYY-MM-DD" -> năm thập phân (giữa ngày, theo UTC)
    var y = +String(ngay).slice(0, 4), m = +String(ngay).slice(5, 7), d = +String(ngay).slice(8, 10);
    var a = Date.UTC(y, 0, 1), b = Date.UTC(y + 1, 0, 1);
    return y + (Date.UTC(y, m - 1, d) + 43200000 - a) / (b - a);
  }
  function tong(N) {                                      // các tổng cộng dồn của N điểm ảnh
    return {N: N, n: new Uint16Array(N), t: new Float64Array(N), tt: new Float64Array(N), y: new Float64Array(N), ty: new Float64Array(N), yy: new Float64Array(N)};
  }
  function them(S, i, t, v) { if (S.n[i] === 65535) return; S.n[i]++; S.t[i] += t; S.tt[i] += t * t; S.y[i] += v; S.ty[i] += t * v; S.yy[i] += v * v; }
  function congDich(D, S, d) {                            // D += S sau khi dời gốc thời gian của S một đoạn d (năm)
    for (var i = 0, N = D.N; i < N; i++) { var n = S.n[i]; if (!n) continue;
      D.n[i] = Math.min(65535, D.n[i] + n); D.t[i] += S.t[i] + n * d; D.tt[i] += S.tt[i] + 2 * d * S.t[i] + d * d * n;
      D.y[i] += S.y[i]; D.ty[i] += S.ty[i] + d * S.y[i]; D.yy[i] += S.yy[i]; }
  }
  /* hồi quy từ các tổng -> [a, b (gốc thời gian của các tổng), R²] hoặc null (ít hơn 2 lần quan sát, thời gian không trải ra) */
  function hoiQuy(n, st, stt, sy, sty, syy) {
    if (!(n >= 2)) return null;
    var sxx = stt - st * st / n, sxy = sty - st * sy / n, s2 = syy - sy * sy / n;
    if (!(sxx > 1e-6 * n)) return null;                   // mọi lần quan sát gần cùng một thời điểm (dưới ~1 giờ): không có hệ số góc
    var a = sxy / sxx, b = (sy - a * st) / n, r2 = s2 > 1e-12 * Math.max(1, Math.abs(syy)) ? Math.max(0, Math.min(1, sxy * sxy / (sxx * s2))) : NaN;
    return [a, b, r2];
  }
  function olsDiem(ts, ys) {                              // một chuỗi (t, y) -> {a, b, r2, n, p}; b theo t gốc
    var n = 0, st = 0, stt = 0, sy = 0, sty = 0, syy = 0;
    for (var k = 0; k < ts.length; k++) { var t = ts[k], v = ys[k]; if (!isFinite(t) || !isFinite(v)) continue; n++; st += t; stt += t * t; sy += v; sty += t * v; syy += v * v; }
    var t0 = n ? st / n : 0;                              // dời gốc về giữa cho ổn định số học rồi đổi lại
    var r = hoiQuy(n, 0, stt - st * st / n, sy, sty - t0 * sy, syy);
    if (!r) return {a: NaN, b: NaN, r2: NaN, n: n, p: NaN};
    return {a: r[0], b: r[1] - r[0] * t0, r2: r[2], n: n, p: pDoc(r[2], n)};
  }
  /* ---------- p của hệ số góc ---------- */
  var LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lnGamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
    x -= 1; var a = LG[0], t = x + 7.5; for (var i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {                              // liên phân số của hàm beta không đầy đủ (Lentz)
    var TI = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < TI) d = TI; d = 1 / d; var h = d;
    for (var m = 1; m <= 300; m++) { var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TI) d = TI; c = 1 + aa / c; if (Math.abs(c) < TI) c = TI; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < TI) d = TI; c = 1 + aa / c; if (Math.abs(c) < TI) c = TI; d = 1 / d; var de = d * c; h *= de;
      if (Math.abs(de - 1) < 1e-14) break; }
    return h;
  }
  function betaI(a, b, x) {                               // I_x(a, b) chuẩn hoá
    if (!(x > 0)) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function pDoc(r2, n) {                                  // p hai phía của H0: a = 0 (t = a / SE, df = n − 2)
    var df = n - 2; if (!(df >= 1) || !(r2 >= 0)) return NaN; if (r2 >= 1) return 0;
    var t2 = r2 * df / (1 - r2); return betaI(df / 2, 0.5, df / (df + t2));
  }
  function lop(a, t1, t2) {                               // 1 giảm mạnh .. 5 tăng mạnh, 0 không có (biên như luận án)
    if (!isFinite(a)) return 0; return a < -t2 ? 1 : a < -t1 ? 2 : a <= t1 ? 3 : a <= t2 ? 4 : 5;
  }
  /* ---------- tính một kỳ cho mọi điểm ảnh ----------
     ds: [{S, d}] các tổng năm và độ dời gốc thời gian; dk: {nMin, namMin (số năm có quan sát tối thiểu), dau, cuoi (bắt buộc có
     quan sát ở năm đầu, năm cuối của kỳ)}; mask (tuỳ chọn): 0 = ngoài phạm vi. -> {a, r2 (Float32, NaN = không có), n (Uint16)} */
  function ky(ds, N, dk, mask) {
    var A = new Float32Array(N).fill(NaN), R2 = new Float32Array(N).fill(NaN), NN = new Uint16Array(N), nMin = Math.max(2, dk.nMin || 2), namMin = dk.namMin || 1;
    var K = ds.length, dau = ds[0], cuoi = ds[K - 1];
    for (var i = 0; i < N; i++) {
      if (mask && !mask[i]) continue;
      if (dk.dau && !dau.S.n[i]) continue; if (dk.cuoi && !cuoi.S.n[i]) continue;
      var n = 0, st = 0, stt = 0, sy = 0, sty = 0, syy = 0, nam = 0;
      for (var k = 0; k < K; k++) { var S = ds[k].S, m = S.n[i]; if (!m) continue; var d = ds[k].d; nam++;
        n += m; st += S.t[i] + m * d; stt += S.tt[i] + 2 * d * S.t[i] + d * d * m; sy += S.y[i]; sty += S.ty[i] + d * S.y[i]; syy += S.yy[i]; }
      if (n < nMin || nam < namMin) continue;
      var r = hoiQuy(n, st, stt, sy, sty, syy); if (!r) continue;
      A[i] = r[0]; R2[i] = r[2]; NN[i] = Math.min(65535, n);
    }
    return {a: A, r2: R2, n: NN};
  }
  function pMang(R) {                                     // p của mọi điểm ảnh (NaN khi không có hoặc n ≤ 2)
    var N = R.a.length, P = new Float32Array(N).fill(NaN), nho = {};
    for (var i = 0; i < N; i++) { if (!(R.a[i] === R.a[i])) continue; var r2 = R.r2[i], n = R.n[i];
      if (!(r2 === r2)) { P[i] = n > 2 ? 1 : NaN; continue; }  // chỉ số không đổi: không có xu hướng
      P[i] = pDoc(r2, n); }
    return P;
  }
  function phanCap(R, t1, t2, P, alpha) {                 // -> Uint8Array cấp 1..5 (0 = không có); P, alpha: p ≥ alpha thì tính là ổn định
    var N = R.a.length, c = new Uint8Array(N);
    for (var i = 0; i < N; i++) { var a = R.a[i]; if (!(a === a)) continue; var k = lop(a, t1, t2);
      if (P && k !== 3 && !(P[i] < alpha)) k = 3; c[i] = k; }
    return c;
  }
  /* ngưỡng tương đương cho khoảng dài: một bước nhảy Δ ở giữa khoảng S năm, quan sát đều, cho hệ số góc 1.5·Δ/S; cặp năm (S = 2) cho
     0.75·Δ. Muốn cùng một bước nhảy xếp cùng cấp thì ngưỡng của khoảng S năm = ngưỡng cặp năm × 2/S. */
  function nguongDai(t, soNam) { return t * 2 / Math.max(2, soNam); }
  return {namTP: namTP, tong: tong, them: them, congDich: congDich, hoiQuy: hoiQuy, olsDiem: olsDiem, lnGamma: lnGamma, betaI: betaI, pDoc: pDoc,
          lop: lop, ky: ky, pMang: pMang, phanCap: phanCap, nguongDai: nguongDai};
})();
if (typeof module !== "undefined" && module.exports) module.exports = {HQC: HQC};
