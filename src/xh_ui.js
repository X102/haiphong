/* =============================== BẢN 2.8: PHÁT HIỆN THAY ĐỔI BẰNG HỒI QUY TUYẾN TÍNH (XU HƯỚNG) =============================== */
/* Theo công cụ GEE ChuyenDoiXanh v6.11 và bài "Сравнение источников спутниковых данных... Тхюйнгуен" của tác giả: hệ số góc a của
   chỉ số thực vật theo thời gian (đơn vị: chỉ số/năm) từng điểm ảnh; OLS kèm R², hoặc Theil–Sen kèm kiểm định Mann–Kendall (điểm ảnh
   không có ý nghĩa thống kê tính là ổn định); 5 cấp: giảm mạnh, giảm nhẹ, ổn định (|a| ≤ ngưỡng nhẹ), tăng nhẹ, tăng mạnh.
   Khác với bài báo (mọi cảnh Sentinel-2 không mây trong khoảng), trang dùng ảnh tổng hợp mùa khô của bộ dữ liệu: mỗi năm một giá trị,
   nên với một cặp năm liền kề, hệ số góc chính là hiệu chỉ số giữa hai năm (R² = 1). */
const XH_MAU = [null, "#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"];
const XH_TEN = [null, "giảm mạnh", "giảm nhẹ", "ổn định", "tăng nhẹ", "tăng mạnh"];
const XH_NG = {ma: [0.01, 0.03], bao: [0.1, 0.2]};
const XH_XEM = [["xlop", "cấp xu hướng"], ["xslope", "hệ số góc (chỉ số/năm)"], ["xr2", "R² (OLS) hoặc Z Mann–Kendall"], ["xn", "số năm có dữ liệu"], ["tat", "tắt"]];
const CD_XEM = [["loai", "loại thay đổi"], ["doi", "thay đổi / không đổi"], ["do", "độ lớn thay đổi"], ["ndvi", "hiệu NDVI"], ["tu", "lớp năm sau ở chỗ thay đổi"], ["tat", "tắt"]];
function xhHien() {                            // ẩn hiện các khối theo phương pháp; đổi nhãn năm, tab, cách xem
  const pp = cd$("cdPP") ? cd$("cdPP").value : "cva", xh = pp === "xh";
  const w = (id, an) => { const e = cd$(id); if (e) e.hidden = an; };
  w("cdXhW", !xh); w("cdDLW", xh); w("cdCachW", xh);
  cd$("cdAT").textContent = T(xh ? "Từ năm" : "Năm trước"); cd$("cdBT").textContent = T(xh ? "Đến năm" : "Năm sau");
  const tab = document.querySelector('#cdP [data-ctab="mt"]'); if (tab) tab.textContent = T(xh ? "Cặp năm" : "Ma trận");
  const ch = cd$("cdChuan"); if (ch) { ch.disabled = pp === "irmad"; ch.parentElement.title = pp === "irmad" ? T("IR-MAD không đổi khi mỗi băng bị biến đổi tuyến tính nên không cần bước này") : ""; }
  const ng = cd$("cdNguong"), o2 = ng && ng.querySelector('option[value="chi2"]');
  if (o2) { o2.hidden = o2.disabled = pp !== "irmad"; if (pp !== "irmad" && ng.value === "chi2") ng.value = "otsu"; }
  if (cd$("cdChiW")) cd$("cdChiW").hidden = !(pp === "irmad" && ng.value === "chi2");
  const sx = cd$("cdXem"), ds = xh ? XH_XEM : CD_XEM, cu = sx.value;
  sx.innerHTML = ds.map(([v, t]) => `<option value="${v}">${esc(T(t))}</option>`).join("");
  sx.value = ds.some(q => q[0] === cu) ? cu : ds[0][0];
  const sel = cd$("xhCS"); if (sel && typeof csDS === "function") { const v = sel.value || "NDVI", ds = csDS();
    sel.innerHTML = ds.map(c => `<option value="${esc(c.id)}">${esc(c.ten)}</option>`).join(""); sel.value = ds.some(c => c.id === v) ? v : (ds.some(c => c.id === "NDVI") ? "NDVI" : (ds[0] || {}).id || ""); }
  const nt = cd$("xhNg"); if (nt && nt.value !== "tay") { const [a, b] = XH_NG[nt.value]; cd$("xhT1").value = a; cd$("xhT2").value = b; }
  if (nt) { cd$("xhT1").disabled = cd$("xhT2").disabled = nt.value !== "tay"; }
  if (cd$("xhZW")) cd$("xhZW").hidden = cd$("xhCach").value !== "mk";
}
async function xhDocCS(g, y, c) {              // một chỉ số trên lưới g từ ảnh S2 10 băng năm y (chỉ đọc các băng cần)
  const ch = c.f.chi.slice(), N = g.w * g.h, o = new Float32Array(N).fill(NaN); if (!ch.length) return o;
  const url = CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", y));
  const R = await vgThuLai(() => readUTM(url, g.bb, g.w, g.h, 0, ch, false, true), url); if (!R) return o;
  const buf = new Array(s2Bang().length).fill(0), nb = ch.length;
  for (let i = 0; i < N; i++) { const j = R.idx[i]; if (j < 0) continue; let z = true;
    for (let b = 0; b < nb; b++) if (R.src[j * nb + b]) { z = false; break; } if (z) continue;
    for (let b = 0; b < nb; b++) buf[ch[b]] = R.src[j * nb + b] / 10000; const x = c.f(buf); if (x != null) o[i] = x; }
  return o;
}
function xhPhanCap(R, N, valid, t1, t2, mk, zc, loc) {
  const lop = new Uint8Array(N);
  for (let i = 0; i < N; i++) { if (!valid[i]) continue; let c = XH.lopXuHuong(R.slope[i], t1, t2); if (c && mk && loc && !(Math.abs(R.z[i]) >= zc)) c = 3; lop[i] = c; }
  return lop;
}
async function xhChay() {
  const tok = ++CD.tok, tt = cd$("cdTrang");
  try {
    if (!MAN || !MAN.s2d) throw new Error(T("cần ảnh S2 10 băng (s2d) của bộ dữ liệu"));
    const A = +cd$("cdA").value, B = +cd$("cdB").value; if (!(A < B)) throw new Error(T("năm đầu phải nhỏ hơn năm cuối"));
    const nam = cdNamCo().filter(y => y >= A && y <= B), cach = cd$("xhCach").value, mk = cach === "mk";
    if (mk && nam.length < 3) throw new Error(T("Mann–Kendall cần ít nhất 3 năm có ảnh trong khoảng"));
    const c = csLay(cd$("xhCS").value); if (!c || !c.f) throw new Error(T("chưa chọn chỉ số"));
    const t1 = Math.abs(+cd$("xhT1").value), t2 = Math.abs(+cd$("xhT2").value); if (!(t2 > t1)) throw new Error(T("ngưỡng mạnh phải lớn hơn ngưỡng nhẹ"));
    const zc = +cd$("xhZ").value, loc = cd$("xhMask").checked;
    const PV = cdPhamVi(), g = CORE.gridFor(PV.bb, 900, {x0: 0, y1: 0, res0: 10}), N = g.w * g.h;
    const vung = PV.mp ? CORE.rasterizeRings(CORE.polysToPixRings(g, PV.mp), g.w, g.h) : null;
    const V = [];
    for (const y of nam) { tt.textContent = T("đang đọc ảnh năm {y}…", {y}); V.push(await xhDocCS(g, y, c)); if (tok !== CD.tok) return; }
    const valid = new Uint8Array(N); let nv = 0;
    for (let i = 0; i < N; i++) { if (vung && !vung[i]) continue; let k = 0; for (const a of V) if (isFinite(a[i])) k++; if (k >= (mk ? 3 : 2)) { valid[i] = 1; nv++; } }
    if (nv < 50) throw new Error(T("phạm vi này gần như không có dữ liệu trong các năm đã chọn"));
    tt.textContent = T("đang tính…");
    const R = XH.xuHuong(nam, V, N, cach, mk ? 3 : 2, valid), lop = xhPhanCap(R, N, valid, t1, t2, mk, zc, loc);
    const ra = CORE.rowArea(g), dt = new Float64Array(6), tbS = new Float64Array(6), dem = new Float64Array(6), theoXa = {}, xaIdx = VG.xa ? vgXaIdx(g) : null;
    let tong = 0, sR = 0, nR = 0, nSig = 0;
    for (let j = 0; j < g.h; j++) { const a = ra[j] / 1e4; for (let x = 0; x < g.w; x++) { const i = j * g.w + x; if (!lop[i]) continue;
      const k = lop[i]; tong += a; dt[k] += a; tbS[k] += R.slope[i]; dem[k]++;
      if (isFinite(R.r2[i])) { sR += R.r2[i]; nR++; } if (mk && Math.abs(R.z[i]) >= zc) nSig++;
      if (xaIdx && xaIdx[i]) { const o = theoXa[xaIdx[i]] || (theoXa[xaIdx[i]] = new Float64Array(6)); o[k] += a; } } }
    const cap = [];
    if (cd$("xhCap").checked && nam.length > 2) for (let k = 0; k + 1 < nam.length; k++) {
      tt.textContent = T("cặp {a}-{b}…", {a: nam[k], b: nam[k + 1]});
      const v2 = new Uint8Array(N); for (let i = 0; i < N; i++) if ((!vung || vung[i]) && isFinite(V[k][i]) && isFinite(V[k + 1][i])) v2[i] = 1;
      const R2 = XH.xuHuong([nam[k], nam[k + 1]], [V[k], V[k + 1]], N, "ols", 2, v2), l2 = xhPhanCap(R2, N, v2, t1, t2, false), d2 = new Float64Array(6);
      for (let j = 0; j < g.h; j++) { const a = ra[j] / 1e4; for (let i = j * g.w, e = i + g.w; i < e; i++) if (l2[i]) d2[l2[i]] += a; }
      cap.push({a: nam[k], b: nam[k + 1], dt: d2});
    }
    const vs = []; const buoc = Math.max(1, Math.floor(N / 150000)); for (let i = 0; i < N; i += buoc) if (lop[i] && isFinite(R.slope[i])) vs.push(R.slope[i]);
    CD.kq = {kieu: "xh", A, B, nam, g, N, valid, slope: R.slope, r2: R.r2, z: R.z, n: R.n, lop, dt, tbS, dem, tong, theoXa, cach, zc, loc, t1, t2,
      ngNguon: cd$("xhNg").value, cs: {id: c.id, ten: c.ten}, cap, PV, vs, r2tb: nR ? sR / nR : NaN, pSig: mk && dem.reduce((s, v) => s + v, 0) ? nSig / dem.reduce((s, v) => s + v, 0) : NaN,
      res: Math.abs(g.res * Math.cos(map.getCenter().lat * Math.PI / 180))};
    cd$("cdKQ").hidden = false; xhVe(); xhBang();
    tt.textContent = T("xong: {n} năm, {a} ha", {n: nam.length, a: tong.toFixed(1)});
  } catch (e) { if (tok === CD.tok) tt.textContent = T("lỗi: ") + (typeof vgLoiDoc === "function" ? vgLoiDoc(e) : (e.message || e)); }
  TIFF_PT.clear();
}
function xhDoc(v, lo, hi, mau) {               // nội suy dải màu nhiều mốc
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))) * (mau.length - 1), k = Math.min(mau.length - 2, Math.floor(t)), f = t - k;
  const a = v28Rgb(mau[k]), b = v28Rgb(mau[k + 1]); return [0, 1, 2].map(q => Math.round(a[q] + (b[q] - a[q]) * f));
}
function xhCanvas(K, mode) {                   // bản 2.9: vẽ xu hướng lên canvas (bản đồ và xuất bản đồ)
  const g = K.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(g.w, g.h), d = img.data, mk = K.cach === "mk", pal5 = XH_MAU.slice(1), lm = XH_MAU.map(h => h && v28Rgb(h));
  const nMax = Math.max(1, K.nam.length);
  for (let i = 0; i < K.N; i++) { if (!K.lop[i]) continue; let o = null, al = 200;
    if (mode === "xlop") o = lm[K.lop[i]];
    else if (mode === "xslope") o = xhDoc(K.slope[i], -K.t2, K.t2, pal5);
    else if (mode === "xr2") o = mk ? xhDoc(K.z[i], -3, 3, ["#d7191c", "#ffffbf", "#1a9641"]) : xhDoc(K.r2[i], 0, 1, ["#ffffff", "#8e44ad"]);
    else if (mode === "xn") { const v = Math.round(255 * K.n[i] / nMax); o = [v, v, v]; }
    if (o) { d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = al; } }
  ctx.putImageData(img, 0, 0); c._mode = mode; return c;
}
function xhVe() {
  const K = CD.kq; if (CD.hien) { map.removeLayer(CD.hien); CD.hien = null; }
  if (!K || K.kieu !== "xh") return; const mode = cd$("cdXem").value; if (mode === "tat") { cd$("cdLeg").innerHTML = ""; return; }
  const c = xhCanvas(K, mode); if (!c) return; const g = K.g, nMax = Math.max(1, K.nam.length), mk = K.cach === "mk", pal5 = XH_MAU.slice(1);
  const A0 = CORE.m2ll(g.bb[0], g.bb[1]), B0 = CORE.m2ll(g.bb[2], g.bb[3]);
  CD.hien = L.imageOverlay(c.toDataURL(), [[A0[1], A0[0]], [B0[1], B0[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 460}).addTo(map);
  const el = CD.hien.getElement && CD.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
  CD.canvas = c;
  const sw = h => `<i style="background:${h}"></i>`, ramp = (m, lo, hi) => `<span><i class="ramp28" style="background:linear-gradient(90deg,${m.join(",")})"></i> ${lo} .. ${hi}</span>`;
  let h = "";
  if (mode === "xlop") h = [1, 2, 3, 4, 5].map(k => `<span>${sw(XH_MAU[k])}${esc(T(XH_TEN[k]))}</span>`).join("");
  else if (mode === "xslope") h = `<span>${T("hệ số góc {c}/năm", {c: esc(K.cs.ten)})}</span>` + ramp(pal5, (-K.t2).toFixed(3), "+" + K.t2.toFixed(3));
  else if (mode === "xr2") h = mk ? `<span>Z Mann–Kendall</span>` + ramp(["#d7191c", "#ffffbf", "#1a9641"], "-3", "+3") : `<span>R²</span>` + ramp(["#ffffff", "#8e44ad"], "0", "1");
  else if (mode === "xn") h = `<span>${T("số năm có dữ liệu")}</span>` + ramp(["#000000", "#ffffff"], "0", nMax);
  cd$("cdLeg").innerHTML = `<div class="leg">${h}</div>`;
}
function xhTenCach(K) { return K.cach === "mk" ? T("Theil–Sen + Mann–Kendall (Z tới hạn {z}{m})", {z: K.zc, m: K.loc ? T(", không ý nghĩa tính là ổn định") : ""}) : T("OLS: hồi quy tuyến tính"); }
function xhTenNg(K) { return K.ngNguon === "ma" ? T("theo mã GEE ChuyenDoiXanh v6.11") : K.ngNguon === "bao" ? T("theo bài Thủy Nguyên (cặp năm liền kề)") : T("tự đặt"); }
function xhNhanDinh(K) {
  const p = v => (100 * v / Math.max(K.tong, 1e-9)).toFixed(1), tb = k => K.dem[k] ? K.tbS[k] / K.dem[k] : NaN;
  const giam = K.dt[1] + K.dt[2], tang = K.dt[4] + K.dt[5];
  let h = `<p>${T("Phạm vi: {v}; chỉ số {c}; {n} năm có ảnh ({ds}), mỗi năm một ảnh tổng hợp mùa khô; {cach}.", {v: esc(cdTenPV(K.PV)), c: esc(K.cs.ten), n: K.nam.length, ds: K.nam.join(", "), cach: esc(xhTenCach(K))})}</p>`;
  h += `<p>${T("Phân cấp theo hệ số góc a ({c}/năm): |a| ≤ {t1} ổn định; {t1} < |a| ≤ {t2} nhẹ; |a| > {t2} mạnh ({ng}).", {c: esc(K.cs.ten), t1: K.t1, t2: K.t2, ng: esc(xhTenNg(K))})}</p>`;
  h += `<p>${T("Trên {a} ha có dữ liệu: giảm {g} ha ({pg} %, trong đó giảm mạnh {gm} ha), ổn định {o} ha ({po} %), tăng {t} ha ({pt} %, trong đó tăng mạnh {tm} ha).",
    {a: K.tong.toFixed(1), g: giam.toFixed(1), pg: p(giam), gm: K.dt[1].toFixed(1), o: K.dt[3].toFixed(1), po: p(K.dt[3]), t: tang.toFixed(1), pt: p(tang), tm: K.dt[5].toFixed(1)})} ` +
    `${T("Cân bằng tăng trừ giảm: {b} ha.", {b: (tang - giam >= 0 ? "+" : "") + (tang - giam).toFixed(1)})}</p>`;
  if (K.cach === "ols" && isFinite(K.r2tb)) h += `<p>${T("R² trung bình {r}.", {r: K.r2tb.toFixed(3)})}${K.nam.length === 2 ? " " + T("Chỉ có hai năm nên R² luôn bằng 1 và hệ số góc là hiệu chỉ số giữa hai năm.") : ""}</p>`;
  if (K.cach === "mk" && isFinite(K.pSig)) h += `<p>${T("{p} % điểm ảnh có xu hướng đơn điệu có ý nghĩa (|Z| ≥ {z}).", {p: (100 * K.pSig).toFixed(1), z: K.zc})}</p>`;
  if (K.cap.length) { const x = K.cap.map(c => ({c, g: c.dt[1] + c.dt[2], t: c.dt[4] + c.dt[5]})), mg = x.reduce((a, b) => (b.g > a.g ? b : a)), mt = x.reduce((a, b) => (b.t > a.t ? b : a));
    h += `<p>${T("Theo cặp năm liền kề: giảm nhiều nhất {a}-{b} ({g} ha), tăng nhiều nhất {c}-{d} ({t} ha).", {a: mg.c.a, b: mg.c.b, g: mg.g.toFixed(1), c: mt.c.a, d: mt.c.b, t: mt.t.toFixed(1)})}</p>`; }
  h += `<p class="mu sm">${T("Bài báo dùng mọi cảnh Sentinel-2 không mây trong khoảng năm; trang dùng một ảnh tổng hợp mỗi năm nên hệ số góc tương đương nhưng R² và kiểm định có ít điểm hơn. Ngưỡng 0.1 / 0.2 của bài hợp với cặp năm liền kề; khoảng nhiều năm thì hệ số góc nhỏ hơn và nên dùng ngưỡng nhỏ hơn.")}</p>`;
  return h;
}
function xhSVG(K) {                            // tần suất hệ số góc, vạch ngưỡng; diện tích 5 cấp; cặp năm
  const lo = -2 * K.t2, hi = 2 * K.t2, nb = 60, hh = new Array(nb).fill(0), W = 400, H = 130;
  K.vs.forEach(v => { const k = Math.max(0, Math.min(nb - 1, Math.floor((v - lo) / (hi - lo) * nb))); hh[k]++; });
  const mx = Math.max(...hh.map(x => Math.log10(1 + x)), 1), bw = (W - 40) / nb, X = v => 34 + (v - lo) / (hi - lo) * (W - 40);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  hh.forEach((c, k) => { const y = (H - 22) * Math.log10(1 + c) / mx, v = lo + (k + 0.5) / nb * (hi - lo); s += `<rect x="${(34 + k * bw).toFixed(1)}" y="${(H - 18 - y).toFixed(1)}" width="${(bw - 0.5).toFixed(1)}" height="${y.toFixed(1)}" fill="${XH_MAU[XH.lopXuHuong(v, K.t1, K.t2)]}" stroke="#98a2b3" stroke-width="0.3"/>`; });
  [-K.t2, -K.t1, K.t1, K.t2].forEach(t => { s += `<line x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="4" y2="${H - 18}" stroke="#111" stroke-dasharray="3 3"/>`; });
  [lo, 0, hi].forEach(v => { s += `<text x="${X(v).toFixed(1)}" y="${H - 5}" font-size="9" text-anchor="middle" fill="#667085">${v === 0 ? 0 : v.toFixed(3)}</text>`; });
  s += `<text x="2" y="10" font-size="9" fill="#667085">log</text></svg>`;
  const mxA = Math.max(...[1, 2, 3, 4, 5].map(k => K.dt[k]), 1e-9); let s2 = `<svg viewBox="0 0 400 110" xmlns="http://www.w3.org/2000/svg">`;
  [1, 2, 3, 4, 5].forEach((k, r) => { const y = 6 + r * 20, w = 200 * K.dt[k] / mxA;
    s2 += `<text x="4" y="${y + 11}" font-size="10">${esc(T(XH_TEN[k]))}</text><rect x="110" y="${y}" width="${w.toFixed(1)}" height="13" fill="${XH_MAU[k]}" stroke="#98a2b3" stroke-width="0.4"/><text x="${(114 + w).toFixed(1)}" y="${y + 11}" font-size="10">${K.dt[k].toFixed(1)} ${T("ha")}</text>`; });
  s2 += "</svg>";
  let s3 = "";
  if (K.cap.length) {                          // cột chồng giảm (dưới 0) / tăng (trên 0) theo cặp năm
    const Wc = 400, Hc = 170, n = K.cap.length, m = Math.max(...K.cap.map(c => Math.max(c.dt[1] + c.dt[2], c.dt[4] + c.dt[5])), 1e-9), y0 = 80, sc = 70 / m, cw = (Wc - 50) / n;
    s3 = `<svg viewBox="0 0 ${Wc} ${Hc}" xmlns="http://www.w3.org/2000/svg"><line x1="40" x2="${Wc}" y1="${y0}" y2="${y0}" stroke="#667085"/><text x="2" y="12" font-size="9" fill="#667085">${T("ha")}</text>` +
      `<text x="2" y="${y0 - 64}" font-size="9" fill="#667085">+${m.toFixed(0)}</text><text x="2" y="${y0 + 72}" font-size="9" fill="#667085">-${m.toFixed(0)}</text>`;
    K.cap.forEach((c, k) => { const x = 44 + k * cw, w = cw * 0.7; let yu = y0, yd = y0;
      [4, 5].forEach(q => { const hq = c.dt[q] * sc; yu -= hq; s3 += `<rect x="${x.toFixed(1)}" y="${yu.toFixed(1)}" width="${w.toFixed(1)}" height="${hq.toFixed(1)}" fill="${XH_MAU[q]}"><title>${c.a}-${c.b} ${esc(T(XH_TEN[q]))}: ${c.dt[q].toFixed(1)} ${T("ha")}</title></rect>`; });
      [2, 1].forEach(q => { const hq = c.dt[q] * sc; s3 += `<rect x="${x.toFixed(1)}" y="${yd.toFixed(1)}" width="${w.toFixed(1)}" height="${hq.toFixed(1)}" fill="${XH_MAU[q]}"><title>${c.a}-${c.b} ${esc(T(XH_TEN[q]))}: ${c.dt[q].toFixed(1)} ${T("ha")}</title></rect>`; yd += hq; });
      s3 += `<text x="${(x + w / 2).toFixed(1)}" y="${Hc - 4}" font-size="8.5" text-anchor="middle" fill="#344054">${String(c.a).slice(2)}-${String(c.b).slice(2)}</text>`; });
    s3 += "</svg>";
  }
  return `<p class="mu sm">${T("Tần suất hệ số góc (thang log), màu theo cấp, vạch là các ngưỡng")}</p>` + s +
    `<p class="mu sm">${T("Diện tích từng cấp")}</p>` + s2 + (s3 ? `<p class="mu sm">${T("Tăng (trên) và giảm (dưới) theo cặp năm liền kề")}</p>` + s3 : "");
}
function xhBang() {
  const K = CD.kq; if (!K || K.kieu !== "xh") return;
  cd$("cdTom").innerHTML = xhNhanDinh(K);
  const p = v => (100 * v / Math.max(K.tong, 1e-9)).toFixed(1), sw = k => `<i style="display:inline-block;width:10px;height:10px;background:${XH_MAU[k]};border:1px solid #98a2b3"></i>`;
  let h = `<table><tr><th>${T("cấp")}</th><th>${T("ha")}</th><th>%</th><th>${T("hệ số góc TB")}</th></tr>` +
    [1, 2, 3, 4, 5].map(k => `<tr><td>${sw(k)} ${esc(T(XH_TEN[k]))}</td><td>${K.dt[k].toFixed(2)}</td><td>${p(K.dt[k])}</td><td>${K.dem[k] ? (K.tbS[k] / K.dem[k]).toFixed(4) : "-"}</td></tr>`).join("") +
    `<tr><td><b>${T("tổng")}</b></td><td><b>${K.tong.toFixed(2)}</b></td><td>100</td><td></td></tr></table>`;
  const xa = Object.entries(K.theoXa).map(([i, o]) => ({ten: (VG.xa.find(x => x.i === +i) || {}).ten || i, g: o[1] + o[2], t: o[4] + o[5], o})).sort((a, b) => b.g - a.g).slice(0, 15);
  if (xa.length) h += `<p><b>${T("Theo xã (xếp theo diện tích giảm)")}</b></p><table><tr><th>${T("xã, phường")}</th><th>${T("giảm")}</th><th>${T("tăng")}</th><th>${T("cân bằng")}</th></tr>` +
    xa.map(r => `<tr><td>${esc(r.ten)}</td><td>${r.g.toFixed(1)}</td><td>${r.t.toFixed(1)}</td><td>${(r.t - r.g).toFixed(1)}</td></tr>`).join("") + `</table>`;
  h += `<p class="mu sm">${T("Chỉ số")}: ${esc(K.cs.ten)} · ${esc(xhTenCach(K))} · ${T("ngưỡng")} ${K.t1} / ${K.t2} (${esc(xhTenNg(K))})</p>`;
  cd$("cdBang").innerHTML = h;
  let m = "";
  if (K.cap.length) {
    m = `<p class="mu sm">${T("Diện tích (ha) từng cấp cho mỗi cặp năm liền kề (hệ số góc = hiệu chỉ số giữa hai năm, cùng ngưỡng)")}</p><table><tr><th>${T("cặp năm")}</th>` +
      [1, 2, 3, 4, 5].map(k => `<th>${sw(k)} ${esc(T(XH_TEN[k]))}</th>`).join("") + `<th>${T("cân bằng")}</th></tr>` +
      K.cap.map(c => `<tr><td>${c.a}-${c.b}</td>` + [1, 2, 3, 4, 5].map(k => `<td>${c.dt[k].toFixed(1)}</td>`).join("") + `<td>${((c.dt[4] + c.dt[5]) - (c.dt[1] + c.dt[2])).toFixed(1)}</td></tr>`).join("") + `</table>`;
  } else m = `<p class="mu sm">${T("Đánh dấu \"thêm bảng từng cặp năm liền kề\" rồi chạy lại để có bảng này (như bảng 5 của bài Thủy Nguyên).")}</p>`;
  cd$("cdMT").innerHTML = m;
  cd$("cdBD").innerHTML = xhSVG(K);
}
function xhCSV() {
  const K = CD.kq; if (!K) return; const rows = [], ten = k => T(XH_TEN[k]);
  [1, 2, 3, 4, 5].forEach(k => rows.push({bang: "xu_huong", chi_so: K.cs.ten, tu_nam: K.A, den_nam: K.B, cap: k, ten_cap: ten(k), dien_tich_ha: +K.dt[k].toFixed(3), ty_le_pct: +(100 * K.dt[k] / Math.max(K.tong, 1e-9)).toFixed(3)}));
  K.cap.forEach(c => [1, 2, 3, 4, 5].forEach(k => rows.push({bang: "cap_nam", chi_so: K.cs.ten, tu_nam: c.a, den_nam: c.b, cap: k, ten_cap: ten(k), dien_tich_ha: +c.dt[k].toFixed(3)})));
  Object.entries(K.theoXa).forEach(([i, o]) => [1, 2, 3, 4, 5].forEach(k => { if (o[k]) rows.push({bang: "xa", chi_so: K.cs.ten, tu_nam: K.A, den_nam: K.B, xa: (VG.xa.find(x => x.i === +i) || {}).ten || i, cap: k, ten_cap: ten(k), dien_tich_ha: +o[k].toFixed(3)}); }));
  download(`xu_huong_${v28TenTep(K.cs.ten)}_${K.A}_${K.B}_${stamp()}.csv`, CORE.toCSV(rows, ["bang", "chi_so", "tu_nam", "den_nam", "xa", "cap", "ten_cap", "dien_tich_ha", "ty_le_pct"]), "text/csv");
}
function xhGeo() {                             // mảng các cấp giảm, tăng (bỏ ổn định cho gọn)
  const K = CD.kq; if (!K) return; const fs = [];
  [1, 2, 4, 5].forEach(k => { if (!K.dt[k]) return; const m = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (K.lop[i] === k) m[i] = 1;
    CORE.vectorize(m, K.g, 1).forEach(pg => fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: pg},
      properties: {cap: k, ten_cap: T(XH_TEN[k]), chi_so: K.cs.ten, tu_nam: K.A, den_nam: K.B, dien_tich_ha: +(CORE.geodesicArea([pg]) / 1e4).toFixed(4)}})); });
  download(`xu_huong_${v28TenTep(K.cs.ten)}_${K.A}_${K.B}_${stamp()}.geojson`, JSON.stringify({type: "FeatureCollection", features: fs}), "application/geo+json");
}
function xhRai() {                             // điểm kiểm tra rải trong từng cấp, gán nhãn mọi năm trong khoảng
  const K = CD.kq; if (!K) return; const n = Math.max(1, +cd$("cdNDiem").value || 10), pts = [];
  [1, 2, 3, 4, 5].forEach(k => { if (!K.dt[k]) return; const m = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (K.lop[i] === k) m[i] = 1;
    CORE.samplePixels(m, n, 2000 + k).forEach(i => { const x = i % K.g.w, y = (i - x) / K.g.w, ll = CORE.pixToLL(K.g, x + 0.5, y + 0.5); pts.push({lon: ll[0], lat: ll[1], tang: k}); }); });
  taoBoTuDiem(T("kiểm tra xu hướng {c} {a}-{b}", {c: K.cs.ten, a: K.A, b: K.B}), K.nam, pts, {cach: "kiem_tra_xu_huong", tham_so: {chi_so: K.cs.ten, tu_nam: K.A, den_nam: K.B, nguong: [K.t1, K.t2], cach: K.cach}});
}
function xhTif() {
  const K = CD.kq; if (!K) return; const mode = cd$("cdXem").value, ten = `xu_huong_${v28TenTep(K.cs.ten)}_${K.A}_${K.B}_${mode}_${stamp()}`;
  if (mode === "xlop" || mode === "tat") { v28TifLop(ten, K.g, K.lop, null, [1, 2, 3, 4, 5].map(k => ({ma: k, ten: T(XH_TEN[k]), mau: XH_MAU[k]}))); return; }
  if (mode === "xn") { v28TifLop(ten, K.g, K.n, null, K.nam.map((_, k) => ({ma: k + 1, ten: T("{n} năm", {n: k + 1}), mau: "#" + [0, 0, 0].map(() => Math.round(255 * (k + 1) / K.nam.length).toString(16).padStart(2, "0")).join("")}))); return; }
  const f = a => { const o = new Float32Array(K.N).fill(NaN); for (let i = 0; i < K.N; i++) if (K.lop[i]) o[i] = a[i]; return o; };
  if (mode === "xslope") v28TifSo(ten, K.g, [f(K.slope), f(K.cach === "mk" ? K.z : K.r2)],
    [[-K.t2, XH_MAU[1], (-K.t2) + ""], [-K.t1, XH_MAU[2], (-K.t1) + ""], [0, XH_MAU[3], "0"], [K.t1, XH_MAU[4], K.t1 + ""], [K.t2, XH_MAU[5], K.t2 + ""]]);
  else v28TifSo(ten, K.g, [f(K.cach === "mk" ? K.z : K.r2)], K.cach === "mk" ? [[-3, "#d7191c"], [0, "#ffffbf"], [3, "#1a9641"]] : [[0, "#ffffff"], [1, "#8e44ad"]]);
}
function xhTaiDiem(ll) {
  const K = CD.kq, q = CORE.llToPix(K.g, ll.lng, ll.lat), x = Math.floor(q[0]), y = Math.floor(q[1]);
  if (x < 0 || y < 0 || x >= K.g.w || y >= K.g.h) return null; const i = y * K.g.w + x; if (!K.lop[i]) return null;
  return [`Δ ${K.cs.ten} ${K.A}-${K.B}`, `<b>${esc(T(XH_TEN[K.lop[i]]))}</b> · ${T("hệ số góc")} ${K.slope[i].toFixed(4)}/${T("năm")} · ` +
    (K.cach === "mk" ? `Z ${K.z[i].toFixed(2)}` : `R² ${isFinite(K.r2[i]) ? K.r2[i].toFixed(3) : "-"}`) + ` · n ${K.n[i]}`];
}
["cdPP", "xhNg", "xhCach", "cdNguong"].forEach(id => { const e = cd$(id); if (e) e.addEventListener("change", cdHien); });
["cdPP"].forEach(id => { const e = cd$(id); if (e) e.addEventListener("change", () => { if (CD.hien) { map.removeLayer(CD.hien); CD.hien = null; } CD.kq = null; cd$("cdKQ").hidden = true; cd$("cdTrang").textContent = ""; }); });
xhHien();                                      // nhãn năm, tab, cách xem theo ngôn ngữ ngay từ đầu (các chữ này mang data-noi18n)
const _setLang28xh = setLang;
setLang = function (l) { _setLang28xh(l); xhHien(); };
