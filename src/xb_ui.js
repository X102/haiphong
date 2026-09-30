/* =============================== BẢN 2.8: XUẤT BẢN ĐỒ THÀNH ẢNH (JPEG, PNG) ĐỂ ĐƯA VÀO BÀI BÁO, BÀI TRÌNH CHIẾU =============================== */
/* Dựng lại khung nhìn hiện tại ở độ phân giải in (mặc định 300 dpi) trên một canvas riêng, không đụng vào bản đồ đang xem:
   ảnh nền và lớp đối chiếu lấy lại theo ô ở mức phóng hợp với độ phân giải in, kết quả phân tích (ảnh phủ), ranh giới, vùng, điểm
   vẽ lại theo kiểu đang hiện (kể cả độ trong suốt); thêm khung, lưới toạ độ (độ phút giây, độ thập phân hoặc UTM 48N) có nhãn,
   chú giải, thước tỉ lệ kèm tỉ lệ số, mũi tên bắc, tiêu đề, dòng nguồn. Ghi dpi vào tệp (JFIF, pHYs) để Word, PowerPoint đặt đúng cỡ. */
const XB_MAC = {kho: "a4n", w: 25.7, h: 17, dpi: 300, dd: "jpg", luoi: "dms", cgv: "phai", chu: 9, net: 1, duong: true, thuoc: true, bac: true, khung: true, tieuDe: "", phuDe: "", nguon: ""};
const XB = {o: Object.assign({}, XB_MAC, ls("laymau_hp_xb28_v1") || {}), tok: 0, bo: {}};
const XB_KHO = {a4n: [25.7, 17, "A4 ngang"], a4d: [17, 25.7, "A4 dọc"], c1: [8.5, 7.5, "một cột bài báo"], c2: [17.5, 12, "hai cột bài báo"], sl: [25.4, 14.3, "trình chiếu 16:9"], tu: [0, 0, "tự đặt"]};
const XB_R = 20037508.342789244;
const xb$ = id => document.getElementById(id);

/* ---------- lấy ảnh ô ---------- */
async function xbAnh(url) {                     // tải ảnh qua CORS để canvas không bị "nhiễm", null nếu máy chủ không cho
  try {
    const r = await fetch(url, {mode: "cors", credentials: "omit"}); if (!r.ok) return null;
    const b = await r.blob(); if (!/^image\//.test(b.type || "image/")) return null;
    if (typeof createImageBitmap === "function") return await createImageBitmap(b);
    const u = URL.createObjectURL(b); return await new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = u; });
  } catch (e) { return null; }
}
function xbCat(im, o) {                         // phần (ox, oy, sub) của ô tổ tiên phóng lên 256 × 256
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext && c.getContext("2d"); if (!g) return null;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(im, o.ox, o.oy, o.sub, o.sub, 0, 0, 256, 256); return c;
}
function xbSach(cv) { try { const g = cv.getContext && cv.getContext("2d"); if (!g) return false; g.getImageData(0, 0, 1, 1); return true; } catch (e) { return false; } }
async function xbO(l, c) {                      // một ô của lớp l ở toạ độ c -> ảnh vẽ được (không nhiễm) hoặc null
  if (typeof WaybackLayer !== "undefined" && l instanceof WaybackLayer) {
    if (l._rel !== "now") { try { const t = await timCha(l._rel, c); if (t && t !== "chan") { const im = await xbAnh(`${WB}/tile/${t.r}/${t.o.z}/${t.o.y}/${t.o.x}`); if (im) return xbCat(im, t.o); } } catch (e) { /* thử thẳng */ } }
    for (let k = 0; k <= 3 && c.z - k >= 0; k++) { const o = oCha(c, k), im = await xbAnh(l._url(l._rel, o)); if (im) return xbCat(im, o); }
    return null;
  }
  if (l instanceof L.TileLayer) {
    const sd = l.options.subdomains, s = sd && sd.length ? sd[Math.abs(c.x + c.y) % sd.length] : "";
    return xbAnh(L.Util.template(l._url, L.extend({r: "", s}, l.options, {x: c.x, y: c.y, z: c.z})));
  }
  if (l.createTile) {                           // lớp tự vẽ của trang (COG, S2, DEM, EOX...): gọi đúng hàm vẽ ô
    const el = await new Promise(ok => { let xong = false, t = null;
      const e0 = l.createTile(Object.assign(L.point(c.x, c.y), {z: c.z}), (err, tile) => { if (xong) return; xong = true; clearTimeout(t); ok(tile || e0); });
      t = setTimeout(() => { if (!xong) { xong = true; ok(null); } }, 45000); });
    if (!el) return null;
    if (el.tagName === "IMG") { if (!el.complete) await new Promise(ok => { el.onload = el.onerror = ok; }); return el.naturalWidth ? el : null; }
    return xbSach(el) ? el : null;
  }
  return null;
}
async function xbHang(viec, n, moi) {           // chạy song song tối đa n việc
  let i = 0; const chay = async () => { while (i < viec.length) { const k = i++; await viec[k](); if (moi) moi(); } };
  await Promise.all(Array.from({length: Math.min(n, viec.length)}, chay));
}

/* ---------- các lớp đang hiện, theo thứ tự vẽ ---------- */
function xbThuTu() {
  const ds = []; map.eachLayer(l => { if (l instanceof L.GridLayer || l instanceof L.ImageOverlay || l instanceof L.Path) ds.push(l); });
  const pane = l => (l.options && l.options.pane) || (l instanceof L.GridLayer ? "tilePane" : "overlayPane");
  const zp = n => { const p = map.getPane(n); if (!p) return 0; const z = +(p.style.zIndex || getComputedStyle(p).zIndex); return isFinite(z) ? z : 0; };
  const zDef = {tilePane: 200, overlayPane: 400, shadowPane: 500, markerPane: 600};
  return ds.map((l, k) => ({l, zp: zp(pane(l)) || zDef[pane(l)] || 400, zi: l instanceof L.Path ? 0 : ((l.options && l.options.zIndex) || 0), k}))
    .sort((a, b) => a.zp - b.zp || a.zi - b.zi || a.k - b.k).map(q => q.l);
}
function xbLopTen(l) {
  if (typeof base !== "undefined" && l === base) { const s = $("selBase"); return s ? s.selectedOptions[0].textContent.trim() : T("ảnh nền"); }
  if (typeof V27 !== "undefined" && l === V27.nhan) return T("nhãn địa danh");
  const o = Object.values(typeof OVL === "object" ? OVL : {}).find(q => q.layer === l); if (o) return lname(o.L0);
  return T("lớp khác");
}

/* ---------- vẽ ---------- */
function xbVeO(g, E, l, dung) {                 // lớp ô: chọn mức phóng, vẽ từng ô vào đúng chỗ
  const op = l.options.opacity != null ? l.options.opacity : 1;
  const zMuon = Math.log2(156543.03392804097 / E.r), maxN = l.options.maxNativeZoom != null ? l.options.maxNativeZoom : (l.options.maxZoom != null ? l.options.maxZoom : 19);
  let z = Math.max(l.options.minZoom || 0, Math.min(maxN, Math.ceil(zMuon - 0.3))), ts, tx0, tx1, ty0, ty1;
  for (;;) { ts = 2 * XB_R / Math.pow(2, z);
    tx0 = Math.floor((E.x0 + XB_R) / ts); tx1 = Math.floor((E.x1 + XB_R - 1e-6) / ts); ty0 = Math.floor((XB_R - E.y1) / ts); ty1 = Math.floor((XB_R - E.y0 - 1e-6) / ts);
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= 1600 || z <= 0) break; z--; }
  const pix = (l.options && l.options.pixel28) || (l._L0 && l._L0.kieu === "lop"), viec = [], n = Math.pow(2, z);
  for (let ty = Math.max(0, ty0); ty <= Math.min(n - 1, ty1); ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const txw = ((tx % n) + n) % n;
    viec.push(async () => {
      const im = op > 0 ? await xbO(l, {x: txw, y: ty, z}) : null; if (!im) { dung.thieu++; return; }
      const X0 = E.fx + (tx * ts - XB_R - E.x0) / E.r, Y0 = E.fy + (E.y1 - (XB_R - ty * ts)) / E.r, s = ts / E.r;
      const a = Math.floor(X0), b = Math.floor(Y0), w = Math.ceil(X0 + s) - a, h = Math.ceil(Y0 + s) - b;
      g.save(); g.imageSmoothingEnabled = !pix; if (!pix) g.imageSmoothingQuality = "high"; g.drawImage(im, a, b, w, h); g.restore(); dung.co++;
    });
  }
  return viec;
}
function xbVeAnh(g, E, l) {                     // ảnh phủ (kết quả phân tích): giữ điểm ảnh sắc nét
  const im = l._image; if (!im || !(im.naturalWidth || im.width)) return;
  const b = l.getBounds(), p0 = CORE.to3857(b.getWest(), b.getSouth()), p1 = CORE.to3857(b.getEast(), b.getNorth());
  g.save(); g.globalAlpha = l.options.opacity != null ? l.options.opacity : 1; g.imageSmoothingEnabled = false;
  g.drawImage(im, E.fx + (p0[0] - E.x0) / E.r, E.fy + (E.y1 - p1[1]) / E.r, (p1[0] - p0[0]) / E.r, (p1[1] - p0[1]) / E.r); g.restore();
}
function xbP(E, ll) { const m = CORE.to3857(ll.lng, ll.lat); return [E.fx + (m[0] - E.x0) / E.r, E.fy + (E.y1 - m[1]) / E.r]; }
function xbVeVecto(g, E, l, k, nhan) {
  const o = l.options || {}; if (o.stroke === false && !o.fill) return;
  if (l.getBounds) { const b = l.getBounds(); if (b.isValid && b.isValid()) { const p = xbP(E, b.getSouthWest()), q = xbP(E, b.getNorthEast()); if (q[0] < E.fx - 50 || p[0] > E.fx + E.fw + 50 || p[1] < E.fy - 50 || q[1] > E.fy + E.fh + 50) return; } }
  g.save(); g.beginPath();
  if (l instanceof L.CircleMarker) {
    const p = xbP(E, l.getLatLng()), ll = l.getLatLng();
    let r = (l.getRadius ? l.getRadius() : o.radius || 5);
    r = l instanceof L.Circle ? r / Math.cos(ll.lat * Math.PI / 180) / E.r : r * k;
    g.arc(p[0], p[1], Math.max(0.5, r), 0, 2 * Math.PI);
  } else if (l.getLatLngs) {
    const vong = a => { if (!a.length) return; if (a[0] instanceof L.LatLng || a[0].lat != null) { a.forEach((ll, i) => { const p = xbP(E, ll); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); if (l instanceof L.Polygon) g.closePath(); } else a.forEach(vong); };
    vong(l.getLatLngs());
  } else { g.restore(); return; }
  if (o.fill) { g.globalAlpha = o.fillOpacity != null ? o.fillOpacity : 0.2; g.fillStyle = o.fillColor || o.color || "#3388ff"; g.fill("evenodd"); }
  if (o.stroke !== false) {
    g.globalAlpha = o.opacity != null ? o.opacity : 1; g.strokeStyle = o.color || "#3388ff"; g.lineWidth = Math.max(0.5, (o.weight != null ? o.weight : 3) * k);
    g.lineJoin = "round"; g.lineCap = "round"; g.setLineDash(o.dashArray ? String(o.dashArray).split(/[ ,]+/).map(v => +v * k).filter(v => v > 0) : []); g.stroke();
  }
  g.restore();
  const tip = l.getTooltip && l.getTooltip();
  if (nhan && tip && tip.options && tip.options.permanent && (!l.isTooltipOpen || l.isTooltipOpen())) {
    const ct = typeof tip._content === "string" ? tip._content.replace(/<[^>]+>/g, "") : "";
    const ll = tip._latlng || (l.getCenter ? l.getCenter() : l.getLatLng && l.getLatLng());
    if (ct && ll) nhan.push({t: ct, p: xbP(E, ll)});
  }
}
function xbChu(g, t, x, y, px, can, dam, mau, vien) {
  g.font = `${dam ? "600 " : ""}${px}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; g.textAlign = can || "left"; g.textBaseline = "middle";
  if (vien) { g.lineWidth = px * 0.28; g.strokeStyle = vien; g.lineJoin = "round"; g.strokeText(t, x, y); }
  g.fillStyle = mau || "#111"; g.fillText(t, x, y);
}
function xbDo(g, t, px, dam) { g.font = `${dam ? "600 " : ""}${px}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; return g.measureText(t).width; }
function xbDong(g, t, px, rong) {               // chia dòng theo bề rộng
  const tu = String(t).split(/\s+/), out = []; let d = "";
  tu.forEach(w => { const th = d ? d + " " + w : w; if (d && xbDo(g, th, px) > rong) { out.push(d); d = w; } else d = th; }); if (d) out.push(d); return out;
}
function xbLuoi(g, E, o, fs, k) {               // lưới toạ độ: đường mảnh + vạch khắc + nhãn ở cạnh trái, dưới
  if (o.luoi === "tat") return;
  const nhan = [], ve = pts => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
  const duong = pts => { if (!o.duong) return; g.save(); g.beginPath(); g.rect(E.fx, E.fy, E.fw, E.fh); g.clip();
    ve(pts); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.8 * k; g.stroke(); ve(pts); g.strokeStyle = "rgba(20,20,20,.62)"; g.lineWidth = 0.7 * k; g.stroke(); g.restore(); };
  const ll0 = CORE.m2ll(E.x0, E.y0), ll1 = CORE.m2ll(E.x1, E.y1);
  if (o.luoi === "utm") {
    const c = [[ll0[0], ll0[1]], [ll1[0], ll0[1]], [ll0[0], ll1[1]], [ll1[0], ll1[1]]].map(q => CORE.toUTM(q[0], q[1]));
    const e0 = Math.min(...c.map(q => q[0])), e1 = Math.max(...c.map(q => q[0])), n0 = Math.min(...c.map(q => q[1])), n1 = Math.max(...c.map(q => q[1]));
    const st = XH.buocDep(Math.min(e1 - e0, (n1 - n0) * E.fw / E.fh), 4), P = (e, n) => { const ll = CORE.toLL(e, n); return xbP(E, {lat: ll[1], lng: ll[0]}); };
    const tx = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    for (let e = Math.ceil(e0 / st) * st; e <= e1; e += st) { const pts = []; for (let i = 0; i <= 24; i++) pts.push(P(e, n0 + (n1 - n0) * i / 24)); duong(pts);
      const cat = pts.find((p, i) => i && pts[i - 1][1] >= E.fy + E.fh && p[1] <= E.fy + E.fh) || pts[0], x = cat[0];
      if (x > E.fx + fs && x < E.fx + E.fw - fs) nhan.push(["x", x, tx(e)]); }
    for (let n = Math.ceil(n0 / st) * st; n <= n1; n += st) { const pts = []; for (let i = 0; i <= 24; i++) pts.push(P(e0 + (e1 - e0) * i / 24, n)); duong(pts);
      const cat = pts.find((p, i) => i && pts[i - 1][0] <= E.fx && p[0] >= E.fx) || pts[0], y = cat[1];
      if (y > E.fy + fs && y < E.fy + E.fh - fs) nhan.push(["y", y, tx(n)]); }
  } else {
    const dms = o.luoi === "dms", spanX = ll1[0] - ll0[0], spanY = ll1[1] - ll0[1];
    const st = dms ? XH.buocDo(Math.min(spanX, spanY * E.fw / E.fh), 4) : XH.buocDep(Math.min(spanX, spanY * E.fw / E.fh), 4);
    let nd = 0; while (nd < 7 && Math.abs(st * Math.pow(10, nd) - Math.round(st * Math.pow(10, nd))) > 1e-7) nd++;
    const fm = (v, t) => dms ? XH.dms(v, t) : XH.dms(v, t, nd);
    for (let v = Math.ceil(ll0[0] / st - 1e-9) * st; v <= ll1[0] + 1e-12; v += st) { const x = xbP(E, {lat: 0, lng: v})[0]; duong([[x, E.fy], [x, E.fy + E.fh]]);
      if (x > E.fx + fs && x < E.fx + E.fw - fs) nhan.push(["x", x, fm(v, "x")]); }
    for (let v = Math.ceil(ll0[1] / st - 1e-9) * st; v <= ll1[1] + 1e-12; v += st) { const y = xbP(E, {lat: v, lng: ll0[0]})[1]; duong([[E.fx, y], [E.fx + E.fw, y]]);
      if (y > E.fy + fs && y < E.fy + E.fh - fs) nhan.push(["y", y, fm(v, "y")]); }
  }
  const tk = fs * 0.45; g.strokeStyle = "#111"; g.lineWidth = Math.max(1, 0.9 * k); g.setLineDash([]);
  nhan.forEach(([t, v, s]) => {
    g.beginPath();
    if (t === "x") { g.moveTo(v, E.fy + E.fh); g.lineTo(v, E.fy + E.fh + tk); g.moveTo(v, E.fy); g.lineTo(v, E.fy - tk); g.stroke(); if (o.nhanLuoi !== false) xbChu(g, s, v, E.fy + E.fh + tk + fs * 0.62, fs * 0.82, "center"); }
    else { g.moveTo(E.fx, v); g.lineTo(E.fx - tk, v); g.moveTo(E.fx + E.fw, v); g.lineTo(E.fx + E.fw + tk, v); g.stroke(); if (o.nhanLuoi !== false) xbChu(g, s, E.fx - tk - fs * 0.2, v, fs * 0.82, "right"); }
  });
}
function xbBac(g, E, fs, chu) {                 // mũi tên bắc ở góc trên phải trong khung
  const s = fs * 2.2, x = E.fx + E.fw - s * 0.9, y = E.fy + s * 0.55;
  g.save(); g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(x, y + s * 0.55, s * 0.72, 0, 2 * Math.PI); g.fill();
  g.lineWidth = Math.max(1, fs * 0.08); g.strokeStyle = "#111";
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - s * 0.32, y + s * 0.95); g.lineTo(x, y + s * 0.72); g.closePath(); g.fillStyle = "#111"; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 0.32, y + s * 0.95); g.lineTo(x, y + s * 0.72); g.closePath(); g.fillStyle = "#fff"; g.fill(); g.stroke();
  xbChu(g, chu, x, y + s * 1.12, fs * 0.9, "center", true); g.restore();
}
function xbThuoc(g, E, fs, dpi) {               // thước tỉ lệ ở góc dưới trái trong khung, kèm tỉ lệ số
  const lat = CORE.m2ll((E.x0 + E.x1) / 2, (E.y0 + E.y1) / 2)[1], mPx = E.r * Math.cos(lat * Math.PI / 180);
  const S = XH.thuocTiLe(mPx, E.fw * 0.24), h = fs * 0.42, x = E.fx + fs * 1.1, y = E.fy + E.fh - fs * 2.1;
  const mau = Math.round(mPx * dpi / 0.0254), tl = "1 : " + String(mau >= 10000 ? Math.round(mau / 100) * 100 : Math.round(mau / 10) * 10).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const nhan = [["0", 0], [String(S.m >= 1000 ? S.m / 2000 : S.m / 2), 0.5], [S.nhan.replace(/ km$/, " " + T("km")).replace(/ m$/, " " + T("m")), 1]];
  g.save(); g.fillStyle = "rgba(255,255,255,.85)";
  const wTl = xbDo(g, tl, fs * 0.8); g.fillRect(x - fs * 0.6, y - fs * 1.25, Math.max(S.px, wTl) + fs * 2.4, fs * 2.85);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#fff" : "#111"; g.fillRect(x + S.px * i / 4, y, S.px / 4, h); }
  g.strokeStyle = "#111"; g.lineWidth = Math.max(1, fs * 0.06); g.strokeRect(x, y, S.px, h);
  nhan.forEach(([t, f]) => xbChu(g, t, x + S.px * f, y - fs * 0.55, fs * 0.72, "center"));
  xbChu(g, tl, x, y + h + fs * 0.7, fs * 0.8, "left"); g.restore();
  return tl;
}
function xbChuGiai() {                           // nhóm chú giải của các lớp đang hiện: [{k, tieuDe, muc: [{mau, ten, kieu, ramp}]}]
  const out = [], coL = l => l && map.hasLayer(l);
  const tuLeg = (k, el, td) => { if (!el) return; const muc = [];
    el.querySelectorAll(".leg span").forEach(sp => { const i = sp.querySelector("i"), bg = i ? (i.style.background || i.style.backgroundColor || "") : "";
      const ram = (bg.match(/#[0-9a-f]{6}|rgb\([^)]+\)/gi) || []); muc.push({mau: ram[0] || bg, ramp: /gradient/.test(bg) ? ram : null, ten: sp.textContent.trim(), kieu: i ? "o" : "chu"}); });
    if (muc.length) out.push({k, tieuDe: td, muc}); };
  if (coL(CD.hien) && CD.kq) tuLeg("cd", cd$("cdLeg"), CD.kq.kieu === "xh" ? T("Xu hướng {c} {a}-{b}", {c: CD.kq.cs.ten, a: CD.kq.A, b: CD.kq.B}) : T("Thay đổi {a} → {b}", {a: CD.kq.A, b: CD.kq.B}));
  if (coL(PL.hien) && PL.kq) tuLeg("pl", pl$("plLeg"), T("Phân loại {y}", {y: PL.kq.y}));
  if (coL(TK.hien) && TK.kq) {
    if (TK._xem === "dt") { const A = TK.kq.cot[+tk$("tkCotA").value || 0], B = TK.kq.cot[+tk$("tkCotB").value || 1];
      out.push({k: "tk", tieuDe: A && B ? tkTenCot(A) + " / " + tkTenCot(B) : T("đồng thuận"), muc: [{mau: "#22c55e", ten: T("trùng lớp"), kieu: "o"}, {mau: "#ef4444", ten: T("khác lớp"), kieu: "o"}]}); }
    else { const c = TK.kq.cot[TK._k != null ? TK._k : (+tk$("tkCotXem").value || 0)];
      out.push({k: "tk", tieuDe: c ? tkTenCot(c) : T("bản đồ lớp phủ"), muc: c ? c.cg.filter(l => c.dt[l.ma]).map(l => ({mau: l.mau, ten: l.ten, kieu: "o"})) : []}); } }
  Object.values(typeof OVL === "object" ? OVL : {}).forEach(o => { if (!coL(o.layer) || o.L0.kieu !== "lop") return; const L0 = o.L0, ten = L0.ten_lop || {}, mau = L0.bang_mau || {};
    out.push({k: "ovl:" + L0.id, tieuDe: lname(L0) + " " + (layerYear(L0, ST.nam) > 0 ? layerYear(L0, ST.nam) : ""), muc: Object.keys(mau).sort((a, b) => a - b).map(v => ({mau: mau[v], ten: T(ten[v] || String(v)), kieu: "o"}))}); });
  const vec = [], dau = g => { let r = null; const tim = l => { if (r) return; if (l.getLayers) l.eachLayer(tim); else if (l.options && l.options.color) r = l.options; }; if (g) tim(g); return r || {}; };
  if (coL(VG.gVung) && VG.gVung.getLayers().length) { const o = dau(VG.gVung); vec.push({mau: o.color || "#f59e0b", ten: T("vùng mẫu đã lưu"), kieu: "vung"}); }
  if (coL(VG.gXa) && VG.gXa.getLayers().length) { const o = dau(VG.gXa); vec.push({mau: o.color || "#475467", ten: T("ranh giới xã"), kieu: "duong", dash: o.dashArray}); }
  if (typeof V27 !== "undefined" && coL(V27.tinhL)) { const o = dau(V27.tinhL); vec.push({mau: o.color || "#6d28d9", ten: T("ranh giới tỉnh"), kieu: "duong", dash: o.dashArray || "7 4"}); }
  if (coL(gPts) && gPts.getLayers().length) vec.push({mau: "#0b63ce", ten: T("điểm mẫu"), kieu: "diem"});
  if (vec.length) out.push({k: "vec", tieuDe: T("Ký hiệu khác"), muc: vec});
  return out;
}
function xbDoCG(g, CG, fs) {                     // kích thước khối chú giải
  let w = 0, h = 0; CG.forEach(gr => { w = Math.max(w, xbDo(g, gr.tieuDe, fs * 0.9, true)); h += fs * 1.5;
    gr.muc.forEach(m => { w = Math.max(w, (m.kieu === "chu" ? 0 : (m.ramp ? fs * 4.2 : fs * 1.6)) + xbDo(g, m.ten, fs * 0.82)); h += fs * 1.3; }); h += fs * 0.4; });
  return {w: w + fs * 1.2, h: h + fs * 0.6};
}
function xbVeCG(g, CG, x, y, fs, k, nen) {
  const D = xbDoCG(g, CG, fs);
  if (nen) { g.save(); g.fillStyle = "rgba(255,255,255,.9)"; g.strokeStyle = "#667085"; g.lineWidth = Math.max(1, 0.6 * k); g.fillRect(x, y, D.w, D.h); g.strokeRect(x, y, D.w, D.h); g.restore(); }
  let cy = y + fs * 0.8; const cx = x + fs * 0.6;
  CG.forEach(gr => { xbChu(g, gr.tieuDe, cx, cy, fs * 0.9, "left", true); cy += fs * 1.35;
    gr.muc.forEach(m => {
      const sw = fs * 1.05, sh = fs * 0.78, y0 = cy - sh / 2; g.save(); g.setLineDash([]);
      if (m.ramp) { const gd = g.createLinearGradient(cx, 0, cx + fs * 3.6, 0);
        if (gd) { m.ramp.forEach((c, i) => gd.addColorStop(m.ramp.length > 1 ? i / (m.ramp.length - 1) : 0, c)); g.fillStyle = gd; } else g.fillStyle = m.ramp[0] || "#999"; g.fillRect(cx, y0, fs * 3.6, sh); g.strokeStyle = "#667085"; g.lineWidth = Math.max(1, 0.5 * k); g.strokeRect(cx, y0, fs * 3.6, sh); }
      else if (m.kieu === "o") { g.fillStyle = m.mau; g.fillRect(cx, y0, sw, sh); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = Math.max(1, 0.5 * k); g.strokeRect(cx, y0, sw, sh); }
      else if (m.kieu === "vung") { g.fillStyle = m.mau; g.globalAlpha = 0.3; g.fillRect(cx, y0, sw, sh); g.globalAlpha = 1; g.strokeStyle = m.mau; g.lineWidth = 1.5 * k; g.strokeRect(cx, y0, sw, sh); }
      else if (m.kieu === "duong") { g.strokeStyle = m.mau; g.lineWidth = 1.4 * k; if (m.dash) g.setLineDash(String(m.dash).split(/[ ,]+/).map(v => +v * k * 0.6).filter(v => v > 0)); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + sw, cy); g.stroke(); }
      else if (m.kieu === "diem") { g.fillStyle = m.mau; g.beginPath(); g.arc(cx + sw / 2, cy, sh * 0.38, 0, 2 * Math.PI); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, 0.6 * k); g.stroke(); }
      g.restore();
      xbChu(g, m.ten, cx + (m.kieu === "chu" ? 0 : (m.ramp ? fs * 4.1 : sw + fs * 0.45)), cy, fs * 0.82, "left");
      cy += fs * 1.3; });
    cy += fs * 0.4; });
  return D;
}
async function xbVe(o, tt) {                     // -> {c: canvas, thieu: [tên lớp thiếu ô]}
  const dpi = o.dpi, cm = v => v / 2.54 * dpi, fs = o.chu * dpi / 72, k = dpi / 96 * (o.net || 1);
  const W = Math.round(cm(o.w)), H = Math.round(cm(o.h)); if (!(W > 50 && H > 50)) throw new Error(T("khổ ảnh quá nhỏ"));
  if (W * H > 64e6) throw new Error(T("ảnh quá lớn ({w} × {h} điểm ảnh): giảm khổ hoặc độ phân giải", {w: W, h: H}));
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext && c.getContext("2d"); if (!g) throw new Error(T("trình duyệt không vẽ được canvas"));
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const le = cm(0.35), CG = o.cgv === "tat" ? [] : xbChuGiai().filter(gr => !XB.bo[gr.k]);
  let top = le, bot = H - le, left = le, right = W - le;
  if (o.tieuDe) top += fs * 1.9; if (o.phuDe) top += fs * 1.35;
  const nguon = o.nguon ? xbDong(g, o.nguon, fs * 0.72, W - 2 * le) : []; bot -= nguon.length * fs * 1.05 + (nguon.length ? fs * 0.3 : 0);
  const coNhan = o.luoi !== "tat", mL = coNhan ? Math.max(xbDo(g, o.luoi === "utm" ? "2 400 000" : "106°40'30\"E", fs * 0.82) + fs * 0.8, fs * 2) : fs * 0.4;
  const mB = coNhan ? fs * 1.45 : fs * 0.3, mT = coNhan ? fs * 0.5 : fs * 0.2, mR = coNhan ? fs * 0.5 : fs * 0.2;
  let cgD = null; if (o.cgv === "phai" && CG.length) { cgD = xbDoCG(g, CG, fs); right -= cgD.w + fs * 0.8; }
  const F = {x: left + mL, y: top + mT, w: right - left - mL - mR, h: bot - top - mT - mB};
  if (!(F.w > 40 && F.h > 40)) throw new Error(T("khổ ảnh không đủ chỗ cho bản đồ: tăng khổ hoặc giảm cỡ chữ, bớt chú giải"));
  // khung địa lý: khung nhìn hiện tại, nới cho đúng tỉ lệ khung
  const b = map.getBounds(), p0 = CORE.to3857(b.getWest(), b.getSouth()), p1 = CORE.to3857(b.getEast(), b.getNorth());
  let x0 = p0[0], y0 = p0[1], x1 = p1[0], y1 = p1[1]; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ar = F.w / F.h;
  if ((x1 - x0) / (y1 - y0) > ar) { const hh = (x1 - x0) / ar; y0 = cy - hh / 2; y1 = cy + hh / 2; } else { const ww = (y1 - y0) * ar; x0 = cx - ww / 2; x1 = cx + ww / 2; }
  const E = {x0, y0, x1, y1, r: (x1 - x0) / F.w, fx: F.x, fy: F.y, fw: F.w, fh: F.h};
  // các lớp
  const ds = xbThuTu(), thieu = [], nhan = [];
  let tong = 0, xong = 0;
  g.save(); g.beginPath(); g.rect(F.x, F.y, F.w, F.h); g.clip();
  const E0 = Object.assign({}, E, {fx: 0, fy: 0});
  for (const l of ds) {
    if (l instanceof L.GridLayer) {
      const op = l.options.opacity != null ? l.options.opacity : 1; if (op <= 0) continue;
      // mỗi lớp vẽ lên một canvas cỡ khung rồi ghép theo đúng thứ tự và độ trong suốt (ô trong một lớp tải song song)
      const cv = document.createElement("canvas"); cv.width = Math.ceil(F.w); cv.height = Math.ceil(F.h); const g2 = cv.getContext("2d");
      const d = {co: 0, thieu: 0}, viec = xbVeO(g2, E0, l, d); tong += viec.length;
      await xbHang(viec, 6, () => { xong++; if (tt) tt(T("đang dựng bản đồ: {a}/{b} ô ảnh", {a: xong, b: tong})); });
      if (d.co) { g.save(); g.globalAlpha = op; g.drawImage(cv, F.x, F.y); g.restore(); }
      if (d.thieu && !d.co) thieu.push(xbLopTen(l));
    } else if (l instanceof L.ImageOverlay) xbVeAnh(g, E, l);
    else if (l instanceof L.Path) xbVeVecto(g, E, l, k, nhan);
  }
  nhan.forEach(n => xbChu(g, n.t, n.p[0], n.p[1], fs * 0.72, "center", false, "#111", "rgba(255,255,255,.9)"));
  g.restore();
  xbLuoi(g, E, o, fs, k);
  if (o.khung !== false) { g.save(); g.strokeStyle = "#111"; g.lineWidth = Math.max(1, 1.1 * k); g.setLineDash([]); g.strokeRect(F.x, F.y, F.w, F.h); g.restore(); }
  if (o.bac) xbBac(g, E, fs, T("B"));
  const tl = o.thuoc ? xbThuoc(g, E, fs, dpi) : "";
  if (CG.length && o.cgv === "phai") xbVeCG(g, CG, right + fs * 0.8, F.y, fs, k, false);
  if (CG.length && o.cgv === "trong") { const D = xbDoCG(g, CG, fs); xbVeCG(g, CG, F.x + F.w - D.w - fs * 0.5, F.y + F.h - D.h - fs * 0.5, fs, k, true); }
  if (o.tieuDe) xbChu(g, o.tieuDe, W / 2, le + fs * 0.85, fs * 1.45, "center", true);
  if (o.phuDe) xbChu(g, o.phuDe, W / 2, le + (o.tieuDe ? fs * 1.9 : 0) + fs * 0.6, fs * 1.02, "center", false, "#344054");
  nguon.forEach((d, i) => xbChu(g, d, le, H - le - (nguon.length - 1 - i) * fs * 1.05 - fs * 0.45, fs * 0.72, "left", false, "#344054"));
  return {c, thieu, tl, W, H};
}

/* ---------- hộp thoại ---------- */
function xbNguonMac() {
  const o = XB.o, ten = xbThuTu().filter(l => l instanceof L.GridLayer && (l.options.opacity == null || l.options.opacity > 0)).map(xbLopTen);
  const luoi = o.luoi === "utm" ? T("lưới UTM vùng 48N (EPSG:32648, mét)") : T("lưới kinh độ, vĩ độ WGS 84");
  const tg = GT_MAC.tac_gia[LANG] || GT_MAC.tac_gia.vi;
  return `${T("Nguồn")}: ${[...new Set(ten)].join("; ")}${MAN && MAN.s2d ? "; Copernicus Sentinel-2" : ""}. ${T("Phép chiếu Web Mercator (EPSG:3857); {l}.", {l: luoi})} ` +
    `${T("Geoportal lớp phủ Hải Phòng")} v${VERSION}, ${tg}, ${new Date().toLocaleDateString(LANG === "vi" ? "vi-VN" : LANG)}.`;
}
function xbDoc() {                              // đọc hộp thoại -> XB.o
  const o = XB.o, v = id => xb$(id).value, c = id => xb$(id).checked;
  Object.assign(o, {kho: v("xbKho"), w: +v("xbW"), h: +v("xbH"), dpi: +v("xbDpi"), dd: v("xbDD"), luoi: v("xbLuoi"), cgv: v("xbCGV"), chu: +v("xbChu") || 9, net: +v("xbNet") || 1,
    duong: c("xbDuong"), thuoc: c("xbThuoc"), bac: c("xbBac"), khung: c("xbKhung"), tieuDe: v("xbTieuDe"), phuDe: v("xbPhuDe"), nguon: v("xbNguon")});
  ls("laymau_hp_xb28_v1", Object.assign({}, o, {tieuDe: o.tieuDe, nguon: o.nguonTay ? o.nguon : ""}));
  return o;
}
function xbHien() {                             // đổ giá trị vào hộp thoại
  const o = XB.o, d = (id, x) => { xb$(id).value = x; }, k = (id, x) => { xb$(id).checked = !!x; };
  xb$("xbKho").innerHTML = Object.entries(XB_KHO).map(([v, q]) => `<option value="${v}">${esc(T(q[2]))}${q[0] ? ` (${q[0]} × ${q[1]} cm)` : ""}</option>`).join("");
  d("xbKho", o.kho); d("xbW", o.w); d("xbH", o.h); d("xbDpi", String(o.dpi)); d("xbDD", o.dd); d("xbLuoi", o.luoi); d("xbCGV", o.cgv); d("xbChu", o.chu); d("xbNet", o.net);
  k("xbDuong", o.duong); k("xbThuoc", o.thuoc); k("xbBac", o.bac); k("xbKhung", o.khung !== false); d("xbTieuDe", o.tieuDe || ""); d("xbPhuDe", o.phuDe || "");
  if (!o.nguonTay) o.nguon = xbNguonMac(); d("xbNguon", o.nguon);
  const CG = xbChuGiai();
  xb$("xbCG").innerHTML = CG.map(gr => `<label><input type="checkbox" data-cg="${esc(gr.k)}"${XB.bo[gr.k] ? "" : " checked"}> ${esc(gr.tieuDe)} <span class="mu">(${gr.muc.length})</span></label>`).join("") ||
    `<span class="mu sm">${T("chưa có lớp nào cần chú giải (bật kết quả phân tích hoặc lớp bản đồ lớp)")}</span>`;
  xb$("xbCG").querySelectorAll("[data-cg]").forEach(i => { i.onchange = () => { XB.bo[i.dataset.cg] = !i.checked; }; });
  xbCo();
}
function xbCo() { const o = XB.o, W = Math.round(o.w / 2.54 * o.dpi), H = Math.round(o.h / 2.54 * o.dpi); xb$("xbTT").textContent = T("{w} × {h} điểm ảnh", {w: W, h: H}); }
async function xbChay(xem) {
  const tok = ++XB.tok, o = Object.assign({}, xbDoc()), tt = s => { if (tok === XB.tok) xb$("xbTT").textContent = s; };
  try {
    if (xem) { const W = xb$("xbXem").parentElement.clientWidth || 700; o.dpi = Math.max(20, Math.min(96, Math.floor(W / (o.w / 2.54)))); }
    tt(T("đang dựng bản đồ…"));
    const R = await xbVe(o, tt); if (tok !== XB.tok) return;
    const ghi = R.thieu.length ? " " + T("Không lấy được: {l} (máy chủ không cho tải chéo hoặc không có ô ảnh).", {l: R.thieu.join(", ")}) : "";
    if (xem) { const cv = xb$("xbXem"); cv.width = R.W; cv.height = R.H; cv.getContext("2d").drawImage(R.c, 0, 0); tt(T("xem trước ({t})", {t: R.tl || "-"}) + ghi); return; }
    const kieu = o.dd === "png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((ok, no) => { try { R.c.toBlob(b => (b ? ok(b) : no(new Error(T("không tạo được ảnh")))), kieu, 0.93); } catch (e) { no(e); } });
    const ab = blob.arrayBuffer ? await blob.arrayBuffer() : await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => no(fr.error); fr.readAsArrayBuffer(blob); });
    const u8 = new Uint8Array(ab), out = o.dd === "png" ? XH.pngDpi(u8, o.dpi) : XH.jpegDpi(u8, o.dpi);
    const ten = `ban_do_${v28TenTep(o.tieuDe || "")}_${o.dpi}dpi_${stamp()}.${o.dd === "png" ? "png" : "jpg"}`.replace("__", "_");
    v28Tai(ten, out, kieu);
    tt(T("đã xuất {f}: {w} × {h} điểm ảnh, {d} dpi, {cw} × {ch} cm", {f: ten, w: R.W, h: R.H, d: o.dpi, cw: o.w, ch: o.h}) + ghi);
  } catch (e) { tt(T("lỗi: ") + (/tainted|insecure|SecurityError/i.test(String(e && (e.name + e.message))) ? T("một lớp ảnh không cho tải chéo nên trình duyệt chặn xuất: tắt lớp đó hoặc đổi ảnh nền rồi thử lại") : (e.message || e))); }
}
function xbMo() { const d = xb$("dlgXB"); xbHien(); if (!d.open) d.showModal ? d.showModal() : d.show(); }
$("bXB").onclick = xbMo;
xb$("xbDong").onclick = () => xb$("dlgXB").close();
xb$("xbXemBtn").onclick = () => xbChay(true);
xb$("xbXuatBtn").onclick = () => xbChay(false);
xb$("xbKho").onchange = () => { const q = XB_KHO[xb$("xbKho").value]; if (q && q[0]) { xb$("xbW").value = q[0]; xb$("xbH").value = q[1]; } xbDoc(); xbCo(); };
["xbW", "xbH", "xbDpi"].forEach(id => { xb$(id).addEventListener("input", () => { if (id !== "xbDpi") xb$("xbKho").value = "tu"; xbDoc(); xbCo(); }); });
xb$("xbNguon").addEventListener("input", () => { XB.o.nguonTay = true; });
xb$("xbLuoi").addEventListener("change", () => { if (!XB.o.nguonTay) { xbDoc(); XB.o.nguon = xbNguonMac(); xb$("xbNguon").value = XB.o.nguon; } });
xb$("xbNguonMac").onclick = () => { XB.o.nguonTay = false; xbDoc(); XB.o.nguon = xbNguonMac(); xb$("xbNguon").value = XB.o.nguon; };
const _setLang28xb = setLang;
setLang = function (l) { _setLang28xb(l); if (xb$("dlgXB").open) { if (!XB.o.nguonTay) XB.o.nguon = ""; xbHien(); } };
