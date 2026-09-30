/* =============================== BẢN 2.8: LÕI TOÁN (thuần JS, thử được bằng node) =============================== */
/* ① phân phối χ² và chuẩn (hàm gamma không đầy đủ, erfc); ② đại số tuyến tính nhỏ (Cholesky, Jacobi);
   ③ IR-MAD (Nielsen A.A., 2007, IEEE Trans. Image Process. 16(2): 463-478): tương quan chính tắc giữa hai thời điểm, biến MAD,
      thống kê χ², trọng số = xác suất không đổi, lặp đến khi hệ số tương quan chính tắc hội tụ;
   ④ xu hướng theo năm từng điểm ảnh: OLS (hệ số góc, R²) hoặc Theil–Sen + Mann–Kendall (Z, p), 5 cấp như công cụ GEE ChuyenDoiXanh;
   ⑤ ghi GeoTIFF (Uint8 có bảng màu, Float32; GDAL_NODATA), kiểu QGIS (.qml); ⑥ ghi dpi vào JPEG (JFIF) và PNG (pHYs). */
var XH = (function () {
  "use strict";
  /* ---------- ① phân phối ---------- */
  var LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lnGamma(x) {                                   // Lanczos (g = 7)
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
    x -= 1; var a = LG[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function gser(a, x) {                                   // P(a, x) bằng chuỗi
    var ap = a, s = 1 / a, d = s;
    for (var n = 0; n < 1000; n++) { ap += 1; d *= x / ap; s += d; if (Math.abs(d) < Math.abs(s) * 1e-15) break; }
    return s * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  function gcf(a, x) {                                    // Q(a, x) bằng liên phân số (Lentz)
    var TI = 1e-300, b = x + 1 - a, c = 1 / TI, d = 1 / b, h = d;
    for (var i = 1; i < 1000; i++) {
      var an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < TI) d = TI;
      c = b + an / c; if (Math.abs(c) < TI) c = TI; d = 1 / d; var de = d * c; h *= de; if (Math.abs(de - 1) < 1e-15) break;
    }
    return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
  }
  function gammaQ(a, x) { if (!(x > 0)) return 1; return x < a + 1 ? 1 - gser(a, x) : gcf(a, x); }
  function chi2sf(x, k) { return x > 0 ? gammaQ(k / 2, x / 2) : 1; }          // P(χ²_k > x)
  function chi2inv(p, k) {                                // phân vị: P(χ²_k ≤ x) = p
    var lo = 0, hi = k + 10 * Math.sqrt(2 * k) + 10;
    while (1 - chi2sf(hi, k) < p) hi *= 2;
    for (var i = 0; i < 200; i++) { var m = (lo + hi) / 2; if (1 - chi2sf(m, k) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function erfc(x) {                                      // Numerical Recipes erfcc, sai số tương đối < 1.2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 +
      t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function pHaiPhia(z) { return erfc(Math.abs(z) / Math.SQRT2); }             // p hai phía của Z chuẩn

  /* ---------- ② đại số tuyến tính (ma trận vuông n × n, Float64Array theo hàng) ---------- */
  function chol(A, n) {
    var L = new Float64Array(n * n);
    for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
      var s = A[i * n + j];
      for (var k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) { if (!(s > 0)) throw new Error("ma trận hiệp phương sai suy biến"); L[i * n + i] = Math.sqrt(s); }
      else L[i * n + j] = s / L[j * n + j];
    }
    return L;
  }
  function giaiDuoi(L, n, b) { var y = new Float64Array(n); for (var i = 0; i < n; i++) { var s = b[i]; for (var k = 0; k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; } return y; }
  function giaiTren(L, n, y) { var x = new Float64Array(n); for (var i = n - 1; i >= 0; i--) { var s = y[i]; for (var k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; } return x; }
  function jacobi(S, n) {                                 // trị riêng, véc tơ riêng (cột) của ma trận đối xứng
    var A = Float64Array.from(S), V = new Float64Array(n * n), i, k;
    for (i = 0; i < n; i++) V[i * n + i] = 1;
    for (var vong = 0; vong < 100; vong++) {
      var off = 0, dg = 0;
      for (i = 0; i < n; i++) { dg += A[i * n + i] * A[i * n + i]; for (k = i + 1; k < n; k++) off += A[i * n + k] * A[i * n + k]; }
      if (off <= 1e-26 * Math.max(dg, 1e-300)) break;
      for (var p = 0; p < n; p++) for (var q = p + 1; q < n; q++) {
        var apq = A[p * n + q]; if (Math.abs(apq) < 1e-300) continue;
        var th = (A[q * n + q] - A[p * n + p]) / (2 * apq), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        var c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (k = 0; k < n; k++) { var akp = A[k * n + p], akq = A[k * n + q]; A[k * n + p] = c * akp - s * akq; A[k * n + q] = s * akp + c * akq; }
        for (k = 0; k < n; k++) { var apk = A[p * n + k], aqk = A[q * n + k]; A[p * n + k] = c * apk - s * aqk; A[q * n + k] = s * apk + c * aqk; }
        for (k = 0; k < n; k++) { var vkp = V[k * n + p], vkq = V[k * n + q]; V[k * n + p] = c * vkp - s * vkq; V[k * n + q] = s * vkp + c * vkq; }
      }
    }
    var val = []; for (i = 0; i < n; i++) val.push(A[i * n + i]);
    return {val: val, vec: V};
  }

  /* ---------- ③ IR-MAD ---------- */
  // X, Y: p mảng (một mảng cho mỗi đặc trưng), cùng độ dài; mau: chỉ số điểm ảnh dùng để ước lượng (mọi đặc trưng hữu hạn)
  function irmad(X, Y, mau, opt) {
    opt = opt || {};
    var p = X.length, q = 2 * p, n = mau.length, maxIt = opt.maxIt || 30, tol = opt.tol || 1e-4;
    if (p < 1 || n < q + 2) throw new Error("quá ít điểm ảnh để ước lượng IR-MAD");
    var w = new Float64Array(n).fill(1), rhoCu = null, KQ = null, it, hoiTu = false, v = new Float64Array(q), i, j, k, r;
    for (it = 1; it <= maxIt; it++) {
      var sw = 0, m = new Float64Array(q), C = new Float64Array(q * q);
      for (r = 0; r < n; r++) { var ii = mau[r], wr = w[r]; if (!(wr > 0)) continue; sw += wr;
        for (j = 0; j < p; j++) { m[j] += wr * X[j][ii]; m[p + j] += wr * Y[j][ii]; } }
      if (!(sw > 0)) throw new Error("mọi trọng số bằng 0: gần như toàn bộ phạm vi thay đổi");
      for (j = 0; j < q; j++) m[j] /= sw;
      for (r = 0; r < n; r++) { var i2 = mau[r], w2 = w[r]; if (!(w2 > 0)) continue;
        for (j = 0; j < p; j++) { v[j] = X[j][i2] - m[j]; v[p + j] = Y[j][i2] - m[p + j]; }
        for (j = 0; j < q; j++) { var vj = w2 * v[j]; for (k = j; k < q; k++) C[j * q + k] += vj * v[k]; } }
      for (j = 0; j < q; j++) for (k = j; k < q; k++) { C[j * q + k] /= sw; C[k * q + j] = C[j * q + k]; }
      var Sxx = new Float64Array(p * p), Syy = new Float64Array(p * p), Sxy = new Float64Array(p * p), tr = 0;
      for (j = 0; j < p; j++) for (k = 0; k < p; k++) { Sxx[j * p + k] = C[j * q + k]; Syy[j * p + k] = C[(p + j) * q + p + k]; Sxy[j * p + k] = C[j * q + p + k]; }
      for (j = 0; j < p; j++) tr += Sxx[j * p + j] + Syy[j * p + j];
      var ridge = 1e-9 * tr / q + 1e-15;                  // chống suy biến khi các đặc trưng gần phụ thuộc tuyến tính
      for (j = 0; j < p; j++) { Sxx[j * p + j] += ridge; Syy[j * p + j] += ridge; }
      var Lx = chol(Sxx, p), Ly = chol(Syy, p);
      // Z = Syy⁻¹ Syx (cột j = Syy⁻¹ · (hàng j của Sxy))
      var Z = new Float64Array(p * p);
      for (j = 0; j < p; j++) { var col = new Float64Array(p); for (k = 0; k < p; k++) col[k] = Sxy[j * p + k];
        var z = giaiTren(Ly, p, giaiDuoi(Ly, p, col)); for (k = 0; k < p; k++) Z[k * p + j] = z[k]; }
      // M = Sxy Z (đối xứng), C2 = Lx⁻¹ M Lx⁻ᵀ
      var M = new Float64Array(p * p);
      for (j = 0; j < p; j++) for (k = 0; k < p; k++) { var s = 0; for (var l = 0; l < p; l++) s += Sxy[j * p + l] * Z[l * p + k]; M[j * p + k] = s; }
      var T1 = new Float64Array(p * p);                   // T1 = Lx⁻¹ M (từng cột)
      for (k = 0; k < p; k++) { var cm = new Float64Array(p); for (j = 0; j < p; j++) cm[j] = M[j * p + k]; var y1 = giaiDuoi(Lx, p, cm); for (j = 0; j < p; j++) T1[j * p + k] = y1[j]; }
      var C2 = new Float64Array(p * p);                   // C2 = T1 Lx⁻ᵀ = (Lx⁻¹ T1ᵀ)ᵀ
      for (j = 0; j < p; j++) { var rj = new Float64Array(p); for (k = 0; k < p; k++) rj[k] = T1[j * p + k]; var y2 = giaiDuoi(Lx, p, rj); for (k = 0; k < p; k++) C2[j * p + k] = y2[k]; }
      for (j = 0; j < p; j++) for (k = j + 1; k < p; k++) { var tb = (C2[j * p + k] + C2[k * p + j]) / 2; C2[j * p + k] = C2[k * p + j] = tb; }
      var E = jacobi(C2, p), thu = E.val.map(function (x, t) { return [x, t]; }).sort(function (a, b) { return b[0] - a[0]; });
      var rho = thu.map(function (e) { return Math.sqrt(Math.min(Math.max(e[0], 0), 1 - 1e-12)); });
      var A = new Float64Array(p * p), B = new Float64Array(p * p);   // cột c: véc tơ a_c, b_c
      for (var c = 0; c < p; c++) {
        var u = new Float64Array(p); for (j = 0; j < p; j++) u[j] = E.vec[j * p + thu[c][1]];
        var a = giaiTren(Lx, p, u), b = new Float64Array(p);          // aᵀ Sxx a = 1
        for (j = 0; j < p; j++) { var sb = 0; for (k = 0; k < p; k++) sb += Z[j * p + k] * a[k]; b[j] = sb; }
        var vb = 0; for (j = 0; j < p; j++) { var t2 = 0; for (k = 0; k < p; k++) t2 += Syy[j * p + k] * b[k]; vb += b[j] * t2; }
        vb = Math.sqrt(Math.max(vb, 1e-300));
        var cxy = 0; for (j = 0; j < p; j++) { var t3 = 0; for (k = 0; k < p; k++) t3 += Sxy[j * p + k] * b[k]; cxy += a[j] * t3; }
        var dau = cxy < 0 ? -1 : 1;                        // tương quan giữa U và V dương
        for (j = 0; j < p; j++) { A[j * p + c] = a[j]; B[j * p + c] = dau * b[j] / vb; }
      }
      // độ lệch chuẩn của biến MAD; sàn 1e-3 (ρ ≤ 0.9999995) để hai ảnh gần như chỉ khác nhau tuyến tính không làm χ² nổ vì sai số làm tròn
      var sd = rho.map(function (x) { return Math.sqrt(Math.max(2 * (1 - x), 1e-6)); });
      KQ = {p: p, rho: rho, A: A, B: B, mx: Array.prototype.slice.call(m, 0, p), my: Array.prototype.slice.call(m, p), sd: sd};
      // trọng số mới = xác suất không đổi P(χ²_p > Z)
      for (r = 0; r < n; r++) w[r] = chi2sf(zTai(KQ, X, Y, mau[r]), p);
      if (rhoCu) { var d = 0; for (j = 0; j < p; j++) d = Math.max(d, Math.abs(rho[j] - rhoCu[j])); if (d < tol) { hoiTu = true; break; } }
      rhoCu = rho;
    }
    KQ.it = Math.min(it, maxIt); KQ.hoiTu = hoiTu; KQ.n = n;
    return KQ;
  }
  function zTai(K, X, Y, i) {                             // thống kê χ² của một điểm ảnh
    var p = K.p, s = 0;
    for (var c = 0; c < p; c++) { var u = 0, v = 0;
      for (var j = 0; j < p; j++) { u += K.A[j * p + c] * (X[j][i] - K.mx[j]); v += K.B[j * p + c] * (Y[j][i] - K.my[j]); }
      var md = (u - v) / K.sd[c]; s += md * md; }
    return s;
  }
  function irmadZ(K, X, Y, N, valid) {                    // χ² cho mọi điểm ảnh hợp lệ (NaN chỗ khác)
    var out = new Float32Array(N).fill(NaN);
    for (var i = 0; i < N; i++) if (!valid || valid[i]) { var z = zTai(K, X, Y, i); if (isFinite(z)) out[i] = z; }
    return out;
  }

  /* ---------- ④ xu hướng theo năm ---------- */
  function olsMot(t, y) {
    var n = t.length, mt = 0, my = 0, i; for (i = 0; i < n; i++) { mt += t[i]; my += y[i]; } mt /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0; for (i = 0; i < n; i++) { var dx = t[i] - mt, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    var sl = sxx ? sxy / sxx : NaN;
    return {slope: sl, intercept: my - sl * mt, r2: sxx && syy ? sxy * sxy / (sxx * syy) : NaN, n: n};
  }
  function theilSen(t, y) {
    var s = [];
    for (var i = 0; i < t.length; i++) for (var j = i + 1; j < t.length; j++) if (t[j] !== t[i]) s.push((y[j] - y[i]) / (t[j] - t[i]));
    if (!s.length) return NaN; s.sort(function (a, b) { return a - b; });
    var m = s.length; return m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
  }
  function mannKendall(y) {                               // y theo thứ tự thời gian; hiệu chỉnh giá trị trùng như jsMannKendall
    var n = y.length, S = 0, i, j;
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) { var d = y[j] - y[i]; S += d > 0 ? 1 : d < 0 ? -1 : 0; }
    var dem = {}, tie = 0; for (i = 0; i < n; i++) dem[y[i]] = (dem[y[i]] || 0) + 1;
    for (var v in dem) { var tv = dem[v]; tie += tv * (tv - 1) * (2 * tv + 5); }
    var varS = (n * (n - 1) * (2 * n + 5) - tie) / 18;
    var Z = varS > 0 ? (S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0) : 0;
    return {S: S, Z: Z, p: varS > 0 ? pHaiPhia(Z) : 1, tau: n > 1 ? S / (n * (n - 1) / 2) : NaN, n: n};
  }
  // nam: [y0..]; V: mỗi năm một mảng (NaN = thiếu); cach "ols" | "mk"
  function xuHuong(nam, V, N, cach, nMin, valid) {
    var m = nam.length, sl = new Float32Array(N).fill(NaN), r2 = new Float32Array(N).fill(NaN), z = new Float32Array(N).fill(NaN), nn = new Uint8Array(N);
    var t = [], y = [];
    nMin = Math.max(nMin || 2, cach === "mk" ? 3 : 2);
    for (var i = 0; i < N; i++) {
      if (valid && !valid[i]) continue;
      t.length = 0; y.length = 0;
      for (var k = 0; k < m; k++) { var v = V[k][i]; if (isFinite(v)) { t.push(nam[k]); y.push(v); } }
      nn[i] = t.length; if (t.length < nMin) continue;
      if (cach === "mk") { sl[i] = theilSen(t, y); var mk = mannKendall(y); z[i] = mk.Z; r2[i] = mk.tau; }
      else { var o = olsMot(t, y); sl[i] = o.slope; r2[i] = o.r2; }
    }
    return {slope: sl, r2: r2, z: z, n: nn};
  }
  function lopXuHuong(s, tNhe, tManh) {                  // 1 giảm mạnh .. 5 tăng mạnh, 0 không có dữ liệu (như GEE: |s| ≤ tNhe là ổn định)
    if (!isFinite(s)) return 0;
    return s < -tManh ? 1 : s < -tNhe ? 2 : s <= tNhe ? 3 : s <= tManh ? 4 : 5;
  }

  /* ---------- ⑤ GeoTIFF và QML ---------- */
  var KICH = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 12: 8};       // BYTE, ASCII, SHORT, LONG, RATIONAL, DOUBLE
  // o: {w, h, bands: [Uint8Array | Float32Array], x0, y1, res, epsg, nodata, mau: [[r,g,b]...] (tuỳ chọn, chỉ Uint8 một băng)}
  function tifGhi(o) {
    var nb = o.bands.length, f32 = o.bands[0] instanceof Float32Array, bps = f32 ? 32 : 8, B = bps / 8, N = o.w * o.h, dl = N * nb * B;
    var dia = o.epsg === 4326 ? [1, 1, 0, 3, 1024, 0, 1, 2, 1025, 0, 1, 1, 2048, 0, 1, 4326] : [1, 1, 0, 3, 1024, 0, 1, 1, 1025, 0, 1, 1, 3072, 0, 1, o.epsg || 3857];
    var the = [[256, 4, [o.w]], [257, 4, [o.h]], [258, 3, rep(bps, nb)], [259, 3, [1]], [262, 3, [o.mau ? 3 : 1]], [273, 4, [0]], [277, 3, [nb]],
      [278, 4, [o.h]], [279, 4, [dl]], [284, 3, [1]]];
    if (o.mau) { var cm = new Array(768).fill(0); o.mau.forEach(function (c, i) { if (c && i < 256) { cm[i] = c[0] * 257; cm[256 + i] = c[1] * 257; cm[512 + i] = c[2] * 257; } }); the.push([320, 3, cm]); }
    if (nb > 1) the.push([338, 3, rep(0, nb - 1)]);
    the.push([339, 3, rep(f32 ? 3 : 1, nb)], [33550, 12, [o.res, o.res, 0]], [33922, 12, [0, 0, 0, o.x0, o.y1, 0]], [34735, 3, dia]);
    if (o.nodata != null) the.push([42113, 2, (isNaN(o.nodata) ? "nan" : String(o.nodata)) + "\u0000"]);
    var nT = the.length, ifd = 8, tran = ifd + 2 + 12 * nT + 4, lon = 0;
    the.forEach(function (t) { var c = typeof t[2] === "string" ? t[2].length : t[2].length, s = c * KICH[t[1]]; if (s > 4) lon += s + (s % 2); });
    var dOff = tran + lon; dOff += (8 - dOff % 8) % 8;
    var buf = new ArrayBuffer(dOff + dl), dv = new DataView(buf), u8 = new Uint8Array(buf), pos = tran;
    u8[0] = 0x49; u8[1] = 0x49; dv.setUint16(2, 42, true); dv.setUint32(4, ifd, true); dv.setUint16(ifd, nT, true);
    the.forEach(function (t, k) {
      if (t[0] === 273) t[2] = [dOff];
      var e = ifd + 2 + 12 * k, ty = t[1], v = t[2], c = v.length, s = c * KICH[ty], at = s > 4 ? pos : e + 8;
      dv.setUint16(e, t[0], true); dv.setUint16(e + 2, ty, true); dv.setUint32(e + 4, c, true);
      if (s > 4) { dv.setUint32(e + 8, pos, true); pos += s + (s % 2); }
      for (var i = 0; i < c; i++) {
        if (ty === 2) u8[at + i] = v.charCodeAt(i) & 0x7f;
        else if (ty === 3) dv.setUint16(at + 2 * i, v[i], true);
        else if (ty === 4) dv.setUint32(at + 4 * i, v[i], true);
        else if (ty === 12) dv.setFloat64(at + 8 * i, v[i], true);
      }
    });
    dv.setUint32(ifd + 2 + 12 * nT, 0, true);
    if (f32) { for (var i = 0; i < N; i++) for (var b = 0; b < nb; b++) dv.setFloat32(dOff + 4 * (i * nb + b), o.bands[b][i], true); }
    else if (nb === 1) u8.set(o.bands[0], dOff);
    else for (var j = 0; j < N; j++) for (var b2 = 0; b2 < nb; b2++) u8[dOff + j * nb + b2] = o.bands[b2][j];
    return buf;
  }
  function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
  function xmlEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var QML_DAU = "<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>\n<qgis version=\"3.28.0\" styleCategories=\"AllStyleCategories\">\n <pipe>\n";
  var QML_CUOI = "  <brightnesscontrast brightness=\"0\" contrast=\"0\" gamma=\"1\"/>\n  <huesaturation saturation=\"0\" grayscaleMode=\"0\" invertColors=\"0\" colorizeOn=\"0\" colorizeRed=\"255\" colorizeGreen=\"128\" colorizeBlue=\"128\" colorizeStrength=\"100\"/>\n" +
    "  <rasterresampler maxOversampling=\"2\"/>\n </pipe>\n <blendMode>0</blendMode>\n</qgis>\n";
  // ds: [{ma, mau "#rrggbb", ten}] -> kiểu "Paletted/Unique values" (nhãn lớp đúng tên)
  function qmlLop(ds) {
    return QML_DAU + "  <rasterrenderer type=\"paletted\" band=\"1\" opacity=\"1\" alphaBand=\"-1\" nodataColor=\"\">\n   <rasterTransparency/>\n   <colorPalette>\n" +
      ds.map(function (l) { return "    <paletteEntry value=\"" + l.ma + "\" color=\"" + l.mau + "\" alpha=\"255\" label=\"" + xmlEsc(l.ten) + "\"/>\n"; }).join("") +
      "   </colorPalette>\n  </rasterrenderer>\n" + QML_CUOI;
  }
  // băng liên tục: dải màu nội suy qua các mốc [[giá trị, "#rrggbb", nhãn]]
  function qmlLienTuc(moc, bang) {
    var lo = moc[0][0], hi = moc[moc.length - 1][0];
    return QML_DAU + "  <rasterrenderer type=\"singlebandpseudocolor\" band=\"" + (bang || 1) + "\" opacity=\"1\" alphaBand=\"-1\" classificationMin=\"" + lo + "\" classificationMax=\"" + hi + "\" nodataColor=\"\">\n" +
      "   <rasterTransparency/>\n   <rastershader>\n    <colorrampshader colorRampType=\"INTERPOLATED\" classificationMode=\"1\" clip=\"0\" minimumValue=\"" + lo + "\" maximumValue=\"" + hi + "\">\n" +
      moc.map(function (m) { return "     <item value=\"" + m[0] + "\" color=\"" + m[1] + "\" alpha=\"255\" label=\"" + xmlEsc(m[2] != null ? m[2] : m[0]) + "\"/>\n"; }).join("") +
      "    </colorrampshader>\n   </rastershader>\n  </rasterrenderer>\n" + QML_CUOI;
  }

  /* ---------- ⑥ dpi trong JPEG, PNG ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8, a, b) { var c = 0xFFFFFFFF; for (var i = a || 0, e = b == null ? u8.length : b; i < e; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function jpegDpi(u8, dpi) {
    if (u8[0] !== 0xFF || u8[1] !== 0xD8) return u8;
    if (u8[2] === 0xFF && u8[3] === 0xE0 && u8[6] === 0x4A && u8[7] === 0x46 && u8[8] === 0x49 && u8[9] === 0x46 && u8[10] === 0) {
      var o = new Uint8Array(u8); o[13] = 1; o[14] = dpi >> 8; o[15] = dpi & 255; o[16] = dpi >> 8; o[17] = dpi & 255; return o;
    }
    var app = [0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0];
    var r = new Uint8Array(u8.length + app.length); r.set(u8.subarray(0, 2), 0); r.set(app, 2); r.set(u8.subarray(2), 2 + app.length); return r;
  }
  function pngDpi(u8, dpi) {
    if (u8[1] !== 0x50 || u8[2] !== 0x4E || u8[3] !== 0x47) return u8;
    var ppm = Math.round(dpi / 0.0254), ch = new Uint8Array(21), dv = new DataView(ch.buffer);
    dv.setUint32(0, 9); ch.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); ch[16] = 1;
    dv.setUint32(17, crc32(ch, 4, 17));
    var dIHDR = 8 + 8 + 13 + 4, r = new Uint8Array(u8.length + 21);
    r.set(u8.subarray(0, dIHDR), 0); r.set(ch, dIHDR); r.set(u8.subarray(dIHDR), dIHDR + 21); return r;
  }

  /* ---------- lưới toạ độ, thước tỉ lệ ---------- */
  function buocDep(span, n) {                             // bước "tròn" 1, 2, 2.5, 5 × 10^k cho khoảng span chia khoảng n phần
    var raw = span / Math.max(n, 1), m = Math.pow(10, Math.floor(Math.log10(raw))), c = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < c.length; i++) if (c[i] * m >= raw) return c[i] * m;
    return 10 * m;
  }
  var BUOC_DO = [1 / 3600, 2 / 3600, 5 / 3600, 10 / 3600, 15 / 3600, 30 / 3600, 1 / 60, 2 / 60, 5 / 60, 10 / 60, 15 / 60, 30 / 60, 1, 2, 5, 10, 15, 30];
  function buocDo(span, n) { var raw = span / Math.max(n, 1); for (var i = 0; i < BUOC_DO.length; i++) if (BUOC_DO[i] >= raw * 0.999) return BUOC_DO[i]; return 45; }
  function dms(v, truc, thapPhan) {                       // 106°40'30"E; thapPhan: số chữ số thập phân nếu muốn dạng độ thập phân
    var h = truc === "x" ? (v >= 0 ? "E" : "W") : (v >= 0 ? "N" : "S"), a = Math.abs(v);
    if (thapPhan != null) return a.toFixed(thapPhan) + "°" + h;
    var s = Math.round(a * 3600), d = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), g = s % 60;
    return d + "°" + (m < 10 ? "0" : "") + m + "'" + (g ? (g < 10 ? "0" : "") + g + "\"" : "") + h;
  }
  function thuocTiLe(mPx, maxPx) {                        // độ dài thước "tròn" (m) không quá maxPx điểm ảnh
    var tot = maxPx * mPx, m = Math.pow(10, Math.floor(Math.log10(tot))), c = [5, 2, 1];
    for (var i = 0; i < c.length; i++) if (c[i] * m <= tot) { var L = c[i] * m; return {m: L, px: L / mPx, nhan: L >= 1000 ? (L / 1000) + " km" : L + " m"}; }
    return {m: m, px: m / mPx, nhan: m + " m"};
  }

  return {lnGamma: lnGamma, gammaQ: gammaQ, chi2sf: chi2sf, chi2inv: chi2inv, erfc: erfc, pHaiPhia: pHaiPhia,
          chol: chol, jacobi: jacobi, irmad: irmad, irmadZ: irmadZ, zTai: zTai,
          olsMot: olsMot, theilSen: theilSen, mannKendall: mannKendall, xuHuong: xuHuong, lopXuHuong: lopXuHuong,
          tifGhi: tifGhi, qmlLop: qmlLop, qmlLienTuc: qmlLienTuc, crc32: crc32, jpegDpi: jpegDpi, pngDpi: pngDpi,
          buocDep: buocDep, buocDo: buocDo, dms: dms, thuocTiLe: thuocTiLe};
})();
if (typeof module !== "undefined") module.exports = {XH: XH};
