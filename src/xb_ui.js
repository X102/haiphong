/* =============================== BẢN 2.8: XUẤT BẢN ĐỒ THÀNH ẢNH (JPEG, PNG) ĐỂ ĐƯA VÀO BÀI BÁO, BÀI TRÌNH CHIẾU =============================== */
/* Dựng lại khung nhìn hiện tại ở độ phân giải in (mặc định 300 dpi) trên một canvas riêng, không đụng vào bản đồ đang xem:
   ảnh nền và lớp đối chiếu lấy lại theo ô ở mức phóng hợp với độ phân giải in, kết quả phân tích (ảnh phủ), ranh giới, vùng, điểm
   vẽ lại theo kiểu đang hiện (kể cả độ trong suốt); thêm khung, lưới toạ độ (độ phút giây, độ thập phân hoặc UTM 48N) có nhãn,
   chú giải, thước tỉ lệ kèm tỉ lệ số, mũi tên bắc, tiêu đề, dòng nguồn. Ghi dpi vào tệp (JFIF, pHYs) để Word, PowerPoint đặt đúng cỡ.
   Bản 2.9: chọn bản đồ cần xuất (phân loại, thay đổi, xu hướng, lớp phủ, vùng đang chọn, một lớp dữ liệu, hoặc như màn hình) thay cho
   việc chụp lẫn mọi lớp đang hiện; quản lý lớp ngay trong hộp thoại (bật tắt, độ trong suốt, năm, thứ tự) mà không đổi bản đồ đang xem;
   khung theo khung nhìn, theo phạm vi kết quả, cả tỉnh, vùng đang chọn hay một vùng đã lưu, có thể cắt dữ liệu theo ranh giới;
   chú giải kèm diện tích (ha, km²) và tỉ lệ % đếm trên đúng các điểm ảnh nằm trong khung (hoặc trong ranh giới cắt);
   định dạng có toạ độ: GeoTIFF khung bản đồ (RGBA, EPSG:3857), PDF có toạ độ (ISO 32000, /VP /Measure /GEO),
   JPEG/PNG kèm world file, .prj, .aux.xml trong một tệp ZIP. */
const XB_MAC = {kho: "a4n", w: 25.7, h: 17, dpi: 300, dd: "jpg", luoi: "dms", cgv: "phai", chu: 9, net: 1, duong: true, thuoc: true, bac: true, khung: true, tieuDe: "", phuDe: "", nguon: "",
  cgSo: "khong", wf: false, cat: false};
const XB = {o: Object.assign({}, XB_MAC, ls("laymau_hp_xb28_v1") || {}), tok: 0, bo: {}, lop: null, nd: "man", pham: "nhin", tam: {}};
const XB_KHO = {a4n: [25.7, 17, "A4 ngang"], a4d: [17, 25.7, "A4 dọc"], c1: [8.5, 7.5, "một cột bài báo"], c2: [17.5, 12, "hai cột bài báo"], sl: [25.4, 14.3, "trình chiếu 16:9"], tu: [0, 0, "tự đặt"]};
const XB_R = 20037508.342789244;
const xb$ = id => document.getElementById(id);

/* ---------- lấy ảnh ô ---------- */
async function xbAnh(url) {                     // tải ảnh qua CORS để canvas không bị "nhiễm", null nếu máy chủ không cho
  try {
    const ac = typeof AbortController === "function" ? new AbortController() : null, hen = ac ? setTimeout(() => ac.abort(), 20000) : null;   // bản 2.9: không chờ mãi một ô
    const r = await fetch(url, Object.assign({mode: "cors", credentials: "omit"}, ac ? {signal: ac.signal} : {})); if (hen) clearTimeout(hen); if (!r.ok) return null;
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
function xbVeO(g, E, l, dung, op) {             // lớp ô: chọn mức phóng, vẽ từng ô vào đúng chỗ (op: độ đục do hộp thoại đặt)
  if (op == null) op = l.options.opacity != null ? l.options.opacity : 1;
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
function xbVeCanvas(g, E, im, bb, op) {        // bản 2.9: ảnh kết quả (canvas) có hộp bao 3857, giữ điểm ảnh sắc nét
  if (!im || !(im.width || im.naturalWidth) || !bb) return;
  g.save(); g.globalAlpha = op != null ? op : 1; g.imageSmoothingEnabled = false;
  g.drawImage(im, E.fx + (bb[0] - E.x0) / E.r, E.fy + (E.y1 - bb[3]) / E.r, (bb[2] - bb[0]) / E.r, (bb[3] - bb[1]) / E.r); g.restore();
}
function xbP(E, ll) { const m = CORE.to3857(ll.lng, ll.lat); return [E.fx + (m[0] - E.x0) / E.r, E.fy + (E.y1 - m[1]) / E.r]; }
function xbVeVecto(g, E, l, k, nhan, am) {      // am: hệ số độ đục thêm (bản 2.9, quản lý lớp)
  const o = l.options || {}; if (o.stroke === false && !o.fill) return; if (am == null) am = 1;
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
  if (o.fill) { g.globalAlpha = am * (o.fillOpacity != null ? o.fillOpacity : 0.2); g.fillStyle = o.fillColor || o.color || "#3388ff"; g.fill("evenodd"); }
  if (o.stroke !== false) {
    g.globalAlpha = am * (o.opacity != null ? o.opacity : 1); g.strokeStyle = o.color || "#3388ff"; g.lineWidth = Math.max(0.5, (o.weight != null ? o.weight : 3) * k);
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
/* ---------- 2.9: các lớp đưa được vào bản đồ xuất, độc lập với bản đồ đang xem ---------- */
const PL_XEM = [["lop", "lớp"], ["tin", "độ giống mẫu"], ["cb", "chỗ cần thêm mẫu, chỗ lẫn"]];
function xbPaths(g) { const out = [], tim = l => { if (!l) return; if (l instanceof L.Path) out.push(l); else if (l.eachLayer) l.eachLayer(tim); }; tim(g); return out; }
function xbTamLop(o, y) {                       // lớp dữ liệu năm y: dùng lại lớp đang hiện nếu trùng, nếu không tạo lớp tạm (không thêm vào bản đồ)
  const url = CORE.dataUrl(CFG, o.L0.duong_dan.replace("{y}", y));
  if (o.layer && o.layer._url === url) return o.layer;
  if (!XB.tam[url]) { const op = {opacity: 1, minZoom: 8, maxZoom: 21, maxNativeZoom: 17};
    XB.tam[url] = o.L0.kieu === "dem" ? new DEMLayer(url, op) : o.L0.kieu === "s2d" ? new S2DLayer(url, op) : o.L0.kieu === "lsd" ? new LSDLayer(url, op) : o.L0.kieu === "s2o" ? new S2OLayer(url, op) : new COGLayer(url, o.L0, op); }
  return XB.tam[url];
}
function xbNamDS(L0) { return Array.isArray(L0.nam) && L0.nam.length ? L0.nam.slice().sort((a, b) => a - b) : [-1]; }
function xbOp(l) { return l && l.options && l.options.opacity != null ? l.options.opacity : 1; }
function xbMP(geo) {                            // GeoJSON (Feature, FeatureCollection, hình) -> MultiPolygon [[vòng [lon, lat]...]...]
  if (!geo) return []; if (geo.type === "FeatureCollection") return [].concat(...geo.features.map(f => xbMP(f)));
  if (geo.type === "Feature") return xbMP(geo.geometry); return vgMP(geo);
}
/* Mỗi mục: k, nhom (nen, du_lieu, ket_qua, vecto), ten, man() (đang hiện trên màn hình), op0 (độ đục trên màn hình),
   nam (danh sách năm, lớp dữ liệu), md (các cách xem, kết quả), ve(s) -> {o: lớp ô} | {anh, bb} | {paths}, bb (hộp bao 3857 của kết quả),
   cg(s) -> nhóm chú giải (kèm hàm dem để đếm diện tích trong khung). */
function xbDS() {
  const ds = [], coL = l => !!(l && map.hasLayer(l)), ov = typeof OVL === "object" ? OVL : {};
  if (typeof base !== "undefined" && base) ds.push({k: "base", nhom: "nen", ten: xbLopTen(base), man: () => coL(base), op0: () => xbOp(base), ve: () => ({o: base})});
  if (typeof V27 !== "undefined" && V27.nhan) ds.push({k: "nhan", nhom: "nen", ten: T("nhãn địa danh"), man: () => coL(V27.nhan), op0: () => xbOp(V27.nhan), ve: () => ({o: V27.nhan})});
  Object.values(ov).forEach(o => { const L0 = o.L0; if (!L0 || !L0.duong_dan) return;
    const nam = xbNamDS(L0), y0 = layerYear(L0, ST.nam);
    ds.push({k: "ovl:" + L0.id, nhom: "du_lieu", ten: lname(L0), L0, nam, nam0: y0 != null ? y0 : nam[nam.length - 1],
      man: () => !!(o.layer && coL(o.layer)), op0: () => o.op, ve: s => ({o: xbTamLop(o, s.nam != null ? s.nam : (y0 != null ? y0 : nam[nam.length - 1]))}), cg: s => xbCGDuLieu(L0, s)}); });
  if (PL.kq) { const K = PL.kq; ds.push({k: "pl", nhom: "ket_qua", ten: T("Phân loại {y}", {y: K.y}), md: PL_XEM.map(([v, t]) => [v, T(t)]), md0: xbMd(pl$("plXem").value, PL_XEM),
    man: () => coL(PL.hien), op0: () => xbOp(PL.hien), bb: K.g.bb, ve: s => ({anh: plCanvas(K, s.md), bb: K.g.bb}), cg: s => xbCGPL(K, s.md)}); }
  if (CD.kq && CD.kq.kieu !== "xh") { const K = CD.kq; ds.push({k: "cd", nhom: "ket_qua", ten: T("Thay đổi {a} → {b}", {a: K.A, b: K.B}), md: CD_XEM.filter(q => q[0] !== "tat" && (q[0] !== "tu" || (K.lop && K.lop.length))).map(([v, t]) => [v, T(t)]),
    md0: xbMd(cd$("cdXem").value, CD_XEM), man: () => coL(CD.hien), op0: () => xbOp(CD.hien), bb: K.g.bb, ve: s => ({anh: cdCanvas(K, s.md), bb: K.g.bb}), cg: s => xbCGCD(K, s.md)}); }
  if (CD.kq && CD.kq.kieu === "xh") { const K = CD.kq; ds.push({k: "cd", nhom: "ket_qua", ten: T("Xu hướng {c} {a}-{b}", {c: K.cs.ten, a: K.A, b: K.B}), md: XH_XEM.filter(q => q[0] !== "tat").map(([v, t]) => [v, T(t)]),
    md0: xbMd(cd$("cdXem").value, XH_XEM), man: () => coL(CD.hien), op0: () => xbOp(CD.hien), bb: K.g.bb, ve: s => ({anh: xhCanvas(K, s.md), bb: K.g.bb}), cg: s => xbCGXH(K, s.md)}); }
  if (TK.kq) { const K = TK.kq, md = K.cot.map((c, k) => ["lop:" + k, tkTenCot(c)]).concat(K.cot.length > 1 ? [["dt", T("đồng thuận")]] : []);
    const m0 = TK._xem === "dt" ? "dt" : "lop:" + (TK._k != null ? TK._k : (+tk$("tkCotXem").value || 0));
    ds.push({k: "tk", nhom: "ket_qua", ten: T("bản đồ lớp phủ (thống kê)"), md, md0: md.some(q => q[0] === m0) ? m0 : md[0][0], man: () => coL(TK.hien), op0: () => xbOp(TK.hien), bb: K.g.bb,
      ve: s => { const [a, b] = s.md.split(":"); return {anh: tkCanvas(K, +b || 0, a), bb: K.g.bb}; }, cg: s => xbCGTK(K, s.md)}); }
  if (VG.hien && VG.hien._image) { const b = VG.hien.getBounds(), p0 = CORE.to3857(b.getWest(), b.getSouth()), p1 = CORE.to3857(b.getEast(), b.getNorth()), bb = [p0[0], p0[1], p1[0], p1[1]];
    ds.push({k: "vg", nhom: "ket_qua", ten: T("kết quả chọn vùng"), man: () => coL(VG.hien), op0: () => xbOp(VG.hien), bb, ve: () => ({anh: VG.hien._image, bb}),
      cg: () => ({k: "vg", tieuDe: T("kết quả chọn vùng"), muc: [{mau: VG.res && VG.res.ma ? vgMau(VG.res.ma) : "#d61ea0", ten: VG.res && VG.res.ma ? vgTenLop(VG.res.ma) : T("vùng đang chọn"), kieu: "o"}]})}); }
  const vec = (k, ten, lay, mt) => { const g = lay(); if (!g || !xbPaths(g).length) return;
    ds.push({k, nhom: "vecto", ten, man: () => coL(g), op0: () => 1, ve: () => ({paths: xbPaths(g)}), vec: mt || (() => { const o = xbPaths(g)[0].options || {}; return {mau: o.color || "#3388ff", ten, kieu: o.fill ? "vung" : "duong", dash: o.dashArray}; })}); };
  vec("vung", T("vùng mẫu đã lưu"), () => VG.gVung, () => ({mau: (xbPaths(VG.gVung)[0].options || {}).color || "#f59e0b", ten: T("vùng mẫu đã lưu"), kieu: "vung"}));
  vec("sua", T("ranh giới vùng đang sửa"), () => VG.sua);
  vec("xa", T("ranh giới xã"), () => VG.gXa);
  vec("tinh", T("ranh giới tỉnh"), () => (typeof V27 !== "undefined" ? V27.tinhL : null));
  if (typeof OSM !== "undefined" && typeof osmLopGL === "function" && MAN && MAN.osm) (MAN.osm.lop || []).forEach(l => {
    vec("osm:" + l.id, "OSM · " + T(l.ten), () => { try { const q = OSM.lop[l.id]; return q && q.g; } catch (e) { return null; } }); });
  vec("bo", T("bộ điểm đang tạo"), () => (typeof BO !== "undefined" ? BO.xem : null), () => ({mau: "#f97316", ten: T("bộ điểm đang tạo"), kieu: "diem"}));
  vec("diem", T("điểm mẫu"), () => gPts, () => ({mau: "#0b63ce", ten: T("điểm mẫu"), kieu: "diem"}));
  if (XB.them && XB.them.d) ds.push(XB.them.d);  // lớp tạm do bảng khác đưa vào (vd vùng đang chọn)
  return ds;
}
function xbMd(v, ds) { return ds.some(q => q[0] === v && v !== "tat") ? v : ds[0][0]; }

/* ---------- 2.9: chú giải từ số liệu của kết quả (không đọc từ giao diện) ---------- */
// g: lưới kết quả; ma(i): undefined = không có dữ liệu, -1 = có dữ liệu nhưng không thuộc mục nào, k = mục k
function xbDem(g, ma, n, E, mp) {
  const ra = CORE.rowArea(g), ha = new Float64Array(n), cat = mp && mp.length ? CORE.rasterizeRings(CORE.polysToPixRings(g, mp), g.w, g.h) : null;
  const i0 = Math.max(0, Math.floor((E.x0 - g.x0) / g.res)), i1 = Math.min(g.w, Math.ceil((E.x1 - g.x0) / g.res));
  const j0 = Math.max(0, Math.floor((g.y1 - E.y1) / g.res)), j1 = Math.min(g.h, Math.ceil((g.y1 - E.y0) / g.res));
  let tong = 0;
  for (let y = j0; y < j1; y++) { const cy = g.y1 - (y + 0.5) * g.res; if (cy < E.y0 || cy > E.y1) continue; const a = ra[y] / 1e4;
    for (let x = i0; x < i1; x++) { const cx = g.x0 + (x + 0.5) * g.res; if (cx < E.x0 || cx > E.x1) continue; const i = y * g.w + x; if (cat && !cat[i]) continue;
      const k = ma(i); if (k === undefined) continue; tong += a; if (k >= 0 && k < n) ha[k] += a; } }
  return {ha, tong};
}
function xbRamp(ten, mau, lo, hi) { return {ramp: mau, ten: `${lo} .. ${hi}`, kieu: "o", tieu: ten}; }
function xbCGPL(K, md) {
  const gr = {k: "pl", tieuDe: T("Phân loại {y}", {y: K.y}), muc: []};
  if (md === "lop") { gr.muc = K.lop.map(l => ({mau: l.mau, ten: l.ten, kieu: "o"})); gr.dem = (E, mp) => xbDem(K.g, i => (K.cls[i] ? K.cls[i] - 1 : undefined), K.lop.length, E, mp); }
  else if (md === "tin") gr.muc = [{mau: "#ff003c", ten: T("ít giống mẫu"), kieu: "o"}, {mau: "#00ff3c", ten: T("rất giống mẫu"), kieu: "o"}];
  else { gr.muc = [{mau: "#ec4899", ten: T("xa mọi mẫu: cần thêm mẫu"), kieu: "o"}, {mau: "#f59e0b", ten: T("khó phân biệt hai lớp"), kieu: "o"}];
    gr.dem = (E, mp) => xbDem(K.g, i => (K.cls[i] ? (K.xa[i] ? 0 : K.lan[i] ? 1 : -1) : undefined), 2, E, mp); }
  return gr;
}
function xbCGCD(K, md) {
  const gr = {k: "cd", tieuDe: T("Thay đổi {a} → {b}", {a: K.A, b: K.B}), muc: []}, v = i => (K.valid[i] ? true : undefined);
  if (md === "loai") { const ks = K.ten_loai.map((t, k) => (t && K.dt[k] > 0 ? k : -1)).filter(k => k >= 0), vt = {}; ks.forEach((k, j) => { vt[k] = j; });
    gr.muc = ks.map(k => ({mau: K.pl === "sobo" ? CD_MAU[k] : (k === 1 ? CD_MAU[1] : CD_MAU[9]), ten: K.ten_loai[k], kieu: "o"}));
    gr.dem = (E, mp) => xbDem(K.g, i => (v(i) ? (K.doi[i] && vt[K.loai[i]] != null ? vt[K.loai[i]] : -1) : undefined), ks.length, E, mp); }
  else if (md === "doi") { gr.muc = [{mau: "#d62728", ten: T("thay đổi {a} → {b}", {a: K.A, b: K.B}), kieu: "o"}]; gr.dem = (E, mp) => xbDem(K.g, i => (v(i) ? (K.doi[i] ? 0 : -1) : undefined), 1, E, mp); }
  else if (md === "tu") { gr.muc = K.lop.map((t, k) => ({mau: K.lopMau[k], ten: t, kieu: "o"})); gr.dem = (E, mp) => xbDem(K.g, i => (v(i) ? (K.doi[i] && K.cB[i] ? K.cB[i] - 1 : -1) : undefined), K.lop.length, E, mp); }
  else if (md === "do") gr.muc = [Object.assign(xbRamp("", ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"], "0", K.hi.toFixed(2)), {ten: T("độ lớn 0 .. {h} (ngưỡng {t})", {h: K.hi.toFixed(2), t: K.t.toFixed(2)})})];
  else gr.muc = [{mau: "#b2182b", ten: T("NDVI giảm"), kieu: "o"}, {mau: "#2166ac", ten: T("NDVI tăng"), kieu: "o"}];
  return gr;
}
function xbCGXH(K, md) {
  const gr = {k: "cd", tieuDe: T("Xu hướng {c} {a}-{b}", {c: K.cs.ten, a: K.A, b: K.B}), muc: []}, mk = K.cach === "mk";
  if (md === "xlop") { gr.muc = [1, 2, 3, 4, 5].map(k => ({mau: XH_MAU[k], ten: T(XH_TEN[k]), kieu: "o"})); gr.dem = (E, mp) => xbDem(K.g, i => (K.lop[i] ? K.lop[i] - 1 : undefined), 5, E, mp); }
  else if (md === "xslope") gr.muc = [Object.assign(xbRamp("", XH_MAU.slice(1), (-K.t2).toFixed(3), "+" + K.t2.toFixed(3)), {ten: T("hệ số góc {c}/năm", {c: K.cs.ten}) + `: ${(-K.t2).toFixed(3)} .. +${K.t2.toFixed(3)}`})];
  else if (md === "xr2") gr.muc = [mk ? Object.assign(xbRamp("", ["#d7191c", "#ffffbf", "#1a9641"], "-3", "+3"), {ten: "Z Mann–Kendall: -3 .. +3"}) : Object.assign(xbRamp("", ["#ffffff", "#8e44ad"], "0", "1"), {ten: "R²: 0 .. 1"})];
  else gr.muc = [Object.assign(xbRamp("", ["#000000", "#ffffff"], "0", String(K.nam.length)), {ten: T("số năm có dữ liệu") + `: 0 .. ${K.nam.length}`})];
  return gr;
}
function xbCGTK(K, md) {
  if (md === "dt") { const A = K.cot[+tk$("tkCotA").value || 0], B = K.cot[+tk$("tkCotB").value || 1];
    return {k: "tk", tieuDe: A && B ? tkTenCot(A) + " / " + tkTenCot(B) : T("đồng thuận"), muc: [{mau: "#22c55e", ten: T("trùng lớp"), kieu: "o"}, {mau: "#ef4444", ten: T("khác lớp"), kieu: "o"}],
      dem: (E, mp) => xbDem(K.g, i => (A.ma[i] && B.ma[i] ? (A.ma[i] === B.ma[i] ? 0 : 1) : undefined), 2, E, mp)}; }
  const C = K.cot[+md.split(":")[1] || 0]; if (!C) return null;
  const ls_ = C.cg.filter(l => C.dt[l.ma]), vt = {}; ls_.forEach((l, j) => { vt[l.ma] = j; });
  return {k: "tk", tieuDe: tkTenCot(C), muc: ls_.map(l => ({mau: l.mau, ten: l.ten, kieu: "o"})), dem: (E, mp) => xbDem(K.g, i => (C.ma[i] ? (vt[C.ma[i]] != null ? vt[C.ma[i]] : -1) : undefined), ls_.length, E, mp)};
}
function xbCGDuLieu(L0, s) {                    // lớp dữ liệu: bản đồ lớp -> ô màu + diện tích đọc từ COG trong khung; ảnh xám -> dải màu
  const y = s.nam != null ? s.nam : layerYear(L0, ST.nam), tieuDe = lname(L0) + (y > 0 ? " " + y : "");
  if (L0.kieu === "lop") { const mau = L0.bang_mau || {}, ten = L0.ten_lop || {}, ks = Object.keys(mau).map(Number).sort((a, b) => a - b), vt = {}; ks.forEach((v, j) => { vt[v] = j; });
    return {k: "ovl:" + L0.id, tieuDe, muc: ks.map(v => ({mau: mau[v], ten: T(ten[v] || String(v)), kieu: "o"})),
      dem: async (E, mp) => { const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), sp = Math.max(E.x1 - E.x0, E.y1 - E.y0), res = sp / 1200;
        const g = {x0: E.x0, y1: E.y1, res, w: Math.max(1, Math.round((E.x1 - E.x0) / res)), h: Math.max(1, Math.round((E.y1 - E.y0) / res))}; g.bb = [g.x0, g.y1 - g.h * res, g.x0 + g.w * res, g.y1];
        const r = await readBox(url, g.bb, g.w, g.h); if (!r) return {ha: new Float64Array(ks.length), tong: 0};
        return xbDem(g, i => { const v = r.data[i * r.n]; return v ? (vt[v] != null ? vt[v] : -1) : undefined; }, ks.length, E, mp); }}; }
  if (L0.kieu === "xam") { const lt = LUTS[L0.bang_mau_lien_tuc || "xam"] || (LUTS[L0.bang_mau_lien_tuc || "xam"] = CORE.lut(L0.bang_mau_lien_tuc || "xam"));
    const stop = [1, 64, 128, 191, 255].map(v => { const c = lt[v] || [0, 0, 0]; return `rgb(${c[0]},${c[1]},${c[2]})`; });
    const kg = L0.keo_gian, d = /^pc\d+$/.test(L0.id) ? 100 : 1, lo = kg ? String(+(kg[0] / d).toFixed(2)) : T("thấp"), hi = kg ? String(+(kg[1] / d).toFixed(2)) : T("cao");
    return {k: "ovl:" + L0.id, tieuDe, muc: [Object.assign(xbRamp("", stop, lo, hi), {ten: `${lo} .. ${hi}`})]}; }
  return null;
}
function xbChuGiai() {                           // nhóm chú giải theo các lớp đang bật trong hộp thoại: [{k, tieuDe, muc, dem?}]
  if (!XB.lop) xbDatND(XB.nd);
  const ds = xbDS(), by = {}; ds.forEach(d => { by[d.k] = d; });
  const out = [], vec = [];
  XB.lop.slice().reverse().forEach(s => { const d = by[s.k]; if (!d || !s.on || !(s.op > 0)) return;
    if (d.vec) { vec.push(Object.assign({k: d.k}, d.vec())); return; }
    const gr = d.cg ? d.cg(s) : null; if (gr && gr.muc.length) out.push(gr); });
  if (vec.length) out.push({k: "vec", tieuDe: T("Ký hiệu khác"), muc: vec});
  return out;
}
async function xbSoLieu(CG, E, mp) {             // điền diện tích từng mục (ha) và tổng có dữ liệu, trong khung (và trong ranh giới cắt)
  for (const gr of CG) { if (!gr.dem) continue;
    try { const r = await gr.dem(E, mp); gr.tong = r.tong; gr.muc.forEach((m, k) => { m.ha = r.ha[k]; }); } catch (e) { gr.tong = null; } }
}
function xbSoChu(v, nd) { const [a, b] = Math.abs(v).toFixed(nd).split("."); return (v < 0 ? "-" : "") + a.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (b ? "." + b : ""); }
function xbHa(v) { return xbSoChu(v, v >= 1000 ? 0 : v >= 10 ? 1 : 2); }
function xbSoMuc(m, gr, kieu) {                  // chữ số liệu của một mục chú giải theo lựa chọn
  if (!kieu || kieu === "khong" || m.ha == null || !(gr.tong > 0)) return "";
  const p = 100 * m.ha / gr.tong, pc = (p > 0 && p < 0.05 ? "<0.1" : p.toFixed(1)) + " %";
  const km = xbSoChu(m.ha / 100, m.ha >= 10000 ? 1 : m.ha >= 100 ? 2 : 3) + " " + T("km²");
  return kieu === "ha" ? xbHa(m.ha) + " " + T("ha") : kieu === "km2" ? km : kieu === "pct" ? pc : xbHa(m.ha) + " " + T("ha") + " (" + pc + ")";
}
function xbGhiCG(gr, kieu, catTen) {             // dòng ghi dưới nhóm: tổng và phạm vi đếm
  if (!kieu || kieu === "khong" || !(gr.tong > 0)) return "";
  const t = kieu === "km2" ? xbSoChu(gr.tong / 100, 2) + " " + T("km²") : xbHa(gr.tong) + " " + T("ha");
  return catTen ? T("{t} có dữ liệu trong ranh giới {v}", {t, v: catTen}) : T("{t} có dữ liệu trong khung bản đồ", {t});
}
function xbDoCG(g, CG, fs, o) {                  // kích thước khối chú giải (có cột số liệu nếu chọn)
  const kieu = o && o.cgSo, mau = "888 888.8 " + T("ha") + " (88.8 %)";
  let w = 0, h = 0; CG.forEach(gr => { w = Math.max(w, xbDo(g, gr.tieuDe, fs * 0.9, true)); h += fs * 1.5;
    const so = kieu && kieu !== "khong" && gr.dem, cs = so ? Math.max(...gr.muc.map(m => xbDo(g, m.ha != null ? xbSoMuc(m, gr, kieu) : mau.slice(0, kieu === "ha_pct" ? 99 : 12), fs * 0.78))) : 0;
    const cn = Math.max(0, ...gr.muc.map(m => (m.kieu === "chu" ? 0 : (m.ramp ? fs * 4.2 : fs * 1.6)) + xbDo(g, m.ten, fs * 0.82)));
    gr._cn = cn; gr._cs = cs; w = Math.max(w, cn + (cs ? fs * 0.9 + cs : 0)); h += gr.muc.length * fs * 1.3;
    const ghi = so ? (xbGhiCG(gr, kieu, o.catTen) || xbGhiCG({tong: 88888.8}, kieu, o.catTen)) : "";
    if (ghi) { w = Math.max(w, xbDo(g, ghi, fs * 0.7)); h += fs * 1.1; } h += fs * 0.4; });
  return {w: w + fs * 1.2, h: h + fs * 0.6};
}
function xbVeCG(g, CG, x, y, fs, k, nen, o) {
  const D = xbDoCG(g, CG, fs, o), kieu = o && o.cgSo;
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
      const so = gr.dem ? xbSoMuc(m, gr, kieu) : ""; if (so) xbChu(g, so, cx + (gr._cn || 0) + fs * 0.9 + (gr._cs || 0), cy, fs * 0.78, "right", false, "#344054");
      cy += fs * 1.3; });
    const ghi = gr.dem ? xbGhiCG(gr, kieu, o && o.catTen) : "";
    if (ghi) { xbChu(g, ghi, cx, cy - fs * 0.1, fs * 0.7, "left", false, "#475467"); cy += fs * 1.1; }
    cy += fs * 0.4; });
  return D;
}

/* ---------- 2.9: nội dung, khung, ranh giới cắt ---------- */
function xbDatND(nd) {                           // đặt các lớp theo nội dung chọn: "man" (như màn hình) hoặc một kết quả / một lớp dữ liệu
  const ds = xbDS(), cu = {}; (XB.lop || []).forEach(s => { cu[s.k] = s; });
  XB.nd = ds.some(d => d.k === nd) || nd === "man" ? nd : "man";
  XB.lop = ds.map(d => {
    const s = {k: d.k, op: d.op0(), on: false, nam: d.nam ? (cu[d.k] && cu[d.k].nam != null ? cu[d.k].nam : d.nam0) : undefined, md: d.md ? (cu[d.k] && cu[d.k].md || d.md0) : undefined};
    if (XB.nd === "man") s.on = d.man();
    else if (d.k === XB.nd) { s.on = true; s.op = d.nhom === "du_lieu" ? Math.max(d.op0(), 0.85) : 1; }
    else if (d.nhom === "nen") s.on = d.man();
    else if (d.k === "tinh" || d.k === "xa" || d.k === "sua") s.on = d.man();
    return s;
  });
  if (XB.nd !== "man" && ds.find(d => d.k === XB.nd && d.bb)) XB.pham = "kq";
  else if (XB.nd === "man" && XB.pham === "kq") XB.pham = "nhin";
}
function xbPhamDS() {                            // [[giá trị, tên]] các cách chọn khung
  const out = [["nhin", T("khung nhìn hiện tại")]];
  const d = xbDS().find(q => q.k === XB.nd && q.bb); if (d) out.push(["kq", T("vừa phạm vi {t}", {t: d.ten})]);
  if ((typeof V27 !== "undefined" && V27.fc) || (VG.xa && VG.xa.length)) out.push(["tinh", T("cả tỉnh đang chọn")]);
  if (XB.them && XB.them.pv) out.push(["them", XB.them.pv.ten]);
  if (VG.poly && VG.poly.length) out.push(["vg", T("vùng đang chọn (ranh giới đã sửa)")]);
  Object.values(ST.vung || {}).forEach(v => out.push(["vung:" + v.id, T("vùng {id}", {id: v.id}) + (v.ma ? " · " + vgTenLop(v.ma) : "")]));
  Object.values(ST.vgop || {}).forEach(g => out.push(["gop:" + g.id, T("vùng gộp: {t}", {t: g.ten})]));
  return out;
}
function xbPhamVi(pham) {                        // -> {bb 3857 | null, mp | null, ten}
  if (pham === "kq") { const d = xbDS().find(q => q.k === XB.nd && q.bb); if (d) return {bb: d.bb, mp: null, ten: d.ten}; }
  if (pham === "tinh") { const mp = typeof V27 !== "undefined" && V27.fc ? xbMP(V27.fc) : [].concat(...(VG.xa || []).map(x => x.mp));
    if (mp.length) return {bb: vgBB3857(mp), mp, ten: (typeof v27TinhTen === "function" && v27TinhTen()) || T("cả tỉnh")}; }
  if (pham === "them" && XB.them && XB.them.pv) return XB.them.pv;
  if (pham === "vg" && VG.poly && VG.poly.length) return {bb: vgBB3857(VG.poly), mp: VG.poly, ten: T("vùng đang chọn")};
  if (/^vung:/.test(pham)) { const v = ST.vung[pham.slice(5)]; if (v) { const mp = vgMP(v.geom); return {bb: vgBB3857(mp), mp, ten: T("vùng {id}", {id: v.id})}; } }
  if (/^gop:/.test(pham) && ST.vgop && ST.vgop[pham.slice(4)] && typeof xgPV === "function") return xgPV(pham.slice(4));
  return {bb: null, mp: null, ten: ""};
}
function xbCatPath(g, E, mp) {                   // đường cắt theo đa giác (lon, lat) trên canvas
  g.beginPath(); mp.forEach(pg => pg.forEach(r => r.forEach((q, i) => { const p = xbP(E, {lat: q[1], lng: q[0]}); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }))); g.closePath();
}

/* ---------- dựng bản đồ ---------- */
async function xbVe(o, tt) {                     // -> {c: canvas, thieu: [tên lớp thiếu ô], tl, W, H, E, F}
  const dpi = o.dpi, cm = v => v / 2.54 * dpi, fs = o.chu * dpi / 72, k = dpi / 96 * (o.net || 1);
  const W = Math.round(cm(o.w)), H = Math.round(cm(o.h)); if (!(W > 50 && H > 50)) throw new Error(T("khổ ảnh quá nhỏ"));
  if (W * H > 64e6) throw new Error(T("ảnh quá lớn ({w} × {h} điểm ảnh): giảm khổ hoặc độ phân giải", {w: W, h: H}));
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext && c.getContext("2d"); if (!g) throw new Error(T("trình duyệt không vẽ được canvas"));
  const chi = !!o.chiKhung;                      // chỉ khung bản đồ (GeoTIFF): không lề, không trang trí, nền trong suốt
  if (!chi) { g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); }
  const PV = xbPhamVi(o.pham || XB.pham), mp = o.cat && PV.mp ? PV.mp : null; o.catTen = mp ? PV.ten : "";
  const le = chi ? 0 : cm(0.35), CG = chi || o.cgv === "tat" ? [] : xbChuGiai().filter(gr => !XB.bo[gr.k]);
  let top = le, bot = H - le, left = le, right = W - le;
  if (!chi && o.tieuDe) top += fs * 1.9; if (!chi && o.phuDe) top += fs * 1.35;
  const nguon = !chi && o.nguon ? xbDong(g, o.nguon, fs * 0.72, W - 2 * le) : []; bot -= nguon.length * fs * 1.05 + (nguon.length ? fs * 0.3 : 0);
  const coNhan = !chi && o.luoi !== "tat", mL = chi ? 0 : coNhan ? Math.max(xbDo(g, o.luoi === "utm" ? "2 400 000" : "106°40'30\"E", fs * 0.82) + fs * 0.8, fs * 2) : fs * 0.4;
  const mB = chi ? 0 : coNhan ? fs * 1.45 : fs * 0.3, mT = chi ? 0 : coNhan ? fs * 0.5 : fs * 0.2, mR = chi ? 0 : coNhan ? fs * 0.5 : fs * 0.2;
  let cgD = null; if (o.cgv === "phai" && CG.length) { cgD = xbDoCG(g, CG, fs, o); right -= cgD.w + fs * 0.8; }
  const F = {x: left + mL, y: top + mT, w: right - left - mL - mR, h: bot - top - mT - mB};
  if (!(F.w > 40 && F.h > 40)) throw new Error(T("khổ ảnh không đủ chỗ cho bản đồ: tăng khổ hoặc giảm cỡ chữ, bớt chú giải"));
  // khung địa lý: theo lựa chọn (khung nhìn, phạm vi kết quả, tỉnh, vùng), nới cho đúng tỉ lệ khung
  let x0, y0, x1, y1;
  if (PV.bb) { const pd = Math.max(PV.bb[2] - PV.bb[0], PV.bb[3] - PV.bb[1]) * 0.03; [x0, y0, x1, y1] = [PV.bb[0] - pd, PV.bb[1] - pd, PV.bb[2] + pd, PV.bb[3] + pd]; }
  else { const b = map.getBounds(), p0 = CORE.to3857(b.getWest(), b.getSouth()), p1 = CORE.to3857(b.getEast(), b.getNorth()); [x0, y0, x1, y1] = [p0[0], p0[1], p1[0], p1[1]]; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ar = F.w / F.h;
  if ((x1 - x0) / (y1 - y0) > ar) { const hh = (x1 - x0) / ar; y0 = cy - hh / 2; y1 = cy + hh / 2; } else { const ww = (y1 - y0) * ar; x0 = cx - ww / 2; x1 = cx + ww / 2; }
  const E = {x0, y0, x1, y1, r: (x1 - x0) / F.w, fx: F.x, fy: F.y, fw: F.w, fh: F.h};
  if (CG.length && o.cgSo && o.cgSo !== "khong") { if (tt) tt(T("đang tính diện tích cho chú giải…")); await xbSoLieu(CG, E, mp); }
  // các lớp theo thứ tự trong hộp thoại (dưới trước, trên sau)
  const by = {}; xbDS().forEach(d => { by[d.k] = d; });
  const ds = XB.lop.filter(s => s.on && s.op > 0 && by[s.k]).map(s => ({s, d: by[s.k]}));
  const thieu = [], nhan = []; let tong = 0, xong = 0;
  g.save(); g.beginPath(); g.rect(F.x, F.y, F.w, F.h); g.clip();
  const E0 = Object.assign({}, E, {fx: 0, fy: 0});
  for (const {s, d} of ds) {
    const v = d.ve(s); if (!v) continue;
    const cat = mp && (d.nhom === "du_lieu" || d.nhom === "ket_qua");
    if (cat) { g.save(); xbCatPath(g, E, mp); g.clip("evenodd"); }
    if (v.o) {
      const cv = document.createElement("canvas"); cv.width = Math.ceil(F.w); cv.height = Math.ceil(F.h); const g2 = cv.getContext("2d");
      const dd = {co: 0, thieu: 0}, viec = xbVeO(g2, E0, v.o, dd, 1); tong += viec.length;
      await xbHang(viec, 6, () => { xong++; if (tt) tt(T("đang dựng bản đồ: {a}/{b} ô ảnh", {a: xong, b: tong})); });
      if (dd.co) { g.save(); g.globalAlpha = s.op; g.drawImage(cv, F.x, F.y); g.restore(); }
      if (dd.thieu && !dd.co) thieu.push(d.ten);
    } else if (v.anh) xbVeCanvas(g, E, v.anh, v.bb, s.op);
    else if (v.paths) v.paths.forEach(p => xbVeVecto(g, E, p, k, nhan, s.op));
    if (cat) g.restore();
  }
  if (mp) { g.save(); xbCatPath(g, E, mp); g.strokeStyle = "#111"; g.lineWidth = Math.max(1, 1.3 * k); g.setLineDash([]); g.stroke(); g.restore(); }
  nhan.forEach(n => xbChu(g, n.t, n.p[0], n.p[1], fs * 0.72, "center", false, "#111", "rgba(255,255,255,.9)"));
  g.restore();
  let tl = "";
  if (!chi) {
    xbLuoi(g, E, o, fs, k);
    if (o.khung !== false) { g.save(); g.strokeStyle = "#111"; g.lineWidth = Math.max(1, 1.1 * k); g.setLineDash([]); g.strokeRect(F.x, F.y, F.w, F.h); g.restore(); }
    if (o.bac) xbBac(g, E, fs, T("B"));
    tl = o.thuoc ? xbThuoc(g, E, fs, dpi) : "";
    if (CG.length && o.cgv === "phai") xbVeCG(g, CG, right + fs * 0.8, F.y, fs, k, false, o);
    if (CG.length && o.cgv === "trong") { const D = xbDoCG(g, CG, fs, o); xbVeCG(g, CG, F.x + F.w - D.w - fs * 0.5, F.y + F.h - D.h - fs * 0.5, fs, k, true, o); }
    if (o.tieuDe) xbChu(g, o.tieuDe, W / 2, le + fs * 0.85, fs * 1.45, "center", true);
    if (o.phuDe) xbChu(g, o.phuDe, W / 2, le + (o.tieuDe ? fs * 1.9 : 0) + fs * 0.6, fs * 1.02, "center", false, "#344054");
    nguon.forEach((d, i) => xbChu(g, d, le, H - le - (nguon.length - 1 - i) * fs * 1.05 - fs * 0.45, fs * 0.72, "left", false, "#344054"));
  }
  return {c, thieu, tl, W, H, E, F, CG};
}

/* ---------- hộp thoại ---------- */
function xbNguonMac(o) {
  o = o || XB.o; if (!XB.lop) xbDatND(XB.nd);
  const by = {}; xbDS().forEach(d => { by[d.k] = d; });
  const ten = XB.lop.filter(s => s.on && s.op > 0 && by[s.k] && (by[s.k].nhom === "nen" || by[s.k].nhom === "du_lieu"))
    .map(s => by[s.k].ten + (s.nam > 0 ? " " + s.nam : ""));
  const luoi = o.luoi === "utm" ? T("lưới UTM vùng 48N (EPSG:32648, mét)") : T("lưới kinh độ, vĩ độ WGS 84");
  const tg = GT_MAC.tac_gia[LANG] || GT_MAC.tac_gia.vi;
  const ng = [...new Set(ten)].concat(MAN && MAN.s2d ? ["Copernicus Sentinel-2"] : [], typeof coLS === "function" && coLS() ? ["USGS Landsat Collection 2"] : []);
  return (ng.length ? `${T("Nguồn")}: ${ng.join("; ")}. ` : "") + `${T("Phép chiếu Web Mercator (EPSG:3857); {l}.", {l: luoi})} ` +
    `${T("Geoportal lớp phủ Hải Phòng")} v${VERSION}, ${tg}, ${new Date().toLocaleDateString(LANG === "vi" ? "vi-VN" : LANG)}.`;
}
function xbDoc() {                              // đọc hộp thoại -> XB.o
  const o = XB.o, v = id => xb$(id).value, c = id => xb$(id).checked;
  Object.assign(o, {kho: v("xbKho"), w: +v("xbW"), h: +v("xbH"), dpi: +v("xbDpi"), dd: v("xbDD"), luoi: v("xbLuoi"), cgv: v("xbCGV"), chu: +v("xbChu") || 9, net: +v("xbNet") || 1,
    duong: c("xbDuong"), thuoc: c("xbThuoc"), bac: c("xbBac"), khung: c("xbKhung"), tieuDe: v("xbTieuDe"), phuDe: v("xbPhuDe"), nguon: v("xbNguon"),
    cgSo: v("xbCGSo"), wf: c("xbWF"), cat: c("xbCat"), pham: v("xbPham")});
  XB.pham = o.pham;
  ls("laymau_hp_xb28_v1", Object.assign({}, o, {tieuDe: o.tieuDe, nguon: o.nguonTay ? o.nguon : "", pham: undefined}));
  return o;
}
function xbVeLop() {                            // danh sách lớp trong hộp thoại (trên cùng = vẽ sau cùng)
  const by = {}; xbDS().forEach(d => { by[d.k] = d; });
  const NH = {nen: T("nền"), du_lieu: T("dữ liệu"), ket_qua: T("kết quả"), vecto: T("véc tơ")};
  const hang = XB.lop.map((s, i) => [s, i]).filter(([s]) => by[s.k]).reverse();
  xb$("xbLop").innerHTML = hang.map(([s, i]) => { const d = by[s.k];
    const nam = d.nam && d.nam.length > 1 ? `<select data-nam>${d.nam.map(y => `<option value="${y}"${y === s.nam ? " selected" : ""}>${y}</option>`).join("")}</select>` : (d.nam && d.nam[0] > 0 ? `<span class="mu">${d.nam[0]}</span>` : "");
    const md = d.md ? `<select data-md>${d.md.map(([v, t]) => `<option value="${esc(v)}"${v === s.md ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>` : "";
    return `<div class="xbR" data-i="${i}"><label title="${esc(NH[d.nhom])}"><input type="checkbox" data-on${s.on ? " checked" : ""}> ${esc(d.ten)}</label>${nam}${md}` +
      `<input type="range" min="0" max="1" step="0.05" value="${s.op}" data-op><span class="mu sm" data-opv>${Math.round(s.op * 100)}%</span>` +
      `<button type="button" data-len title="${esc(T("lên trên"))}">▲</button><button type="button" data-xuong title="${esc(T("xuống dưới"))}">▼</button></div>`; }).join("") ||
    `<span class="mu sm">${T("chưa có lớp nào")}</span>`;
  xb$("xbLop").querySelectorAll(".xbR").forEach(r => { const i = +r.dataset.i, s = XB.lop[i];
    r.querySelector("[data-on]").onchange = e => { s.on = e.target.checked; xbSauDoi(); };
    const op = r.querySelector("[data-op]"); op.oninput = () => { s.op = +op.value; r.querySelector("[data-opv]").textContent = Math.round(s.op * 100) + "%"; };
    const n = r.querySelector("[data-nam]"); if (n) n.onchange = () => { s.nam = +n.value; xbSauDoi(); };
    const m = r.querySelector("[data-md]"); if (m) m.onchange = () => { s.md = m.value; xbSauDoi(); };
    r.querySelector("[data-len]").onclick = () => { if (i < XB.lop.length - 1) { [XB.lop[i], XB.lop[i + 1]] = [XB.lop[i + 1], XB.lop[i]]; xbVeLop(); } };
    r.querySelector("[data-xuong]").onclick = () => { if (i > 0) { [XB.lop[i], XB.lop[i - 1]] = [XB.lop[i - 1], XB.lop[i]]; xbVeLop(); } };
  });
}
function xbVeCGDS() {                           // các nhóm chú giải (bật tắt từng nhóm)
  const CG = xbChuGiai();
  xb$("xbCG").innerHTML = CG.map(gr => `<label><input type="checkbox" data-cg="${esc(gr.k)}"${XB.bo[gr.k] ? "" : " checked"}> ${esc(gr.tieuDe)} <span class="mu">(${gr.muc.length})</span></label>`).join("") ||
    `<span class="mu sm">${T("chưa có lớp nào cần chú giải (bật kết quả phân tích hoặc lớp bản đồ lớp)")}</span>`;
  xb$("xbCG").querySelectorAll("[data-cg]").forEach(i => { i.onchange = () => { XB.bo[i.dataset.cg] = !i.checked; }; });
}
function xbSauDoi() { xbVeCGDS(); if (!XB.o.nguonTay) { XB.o.nguon = xbNguonMac(); xb$("xbNguon").value = XB.o.nguon; } }
function xbVeND() {                             // ô chọn nội dung và khung
  const ds = xbDS(), nd = [["man", T("như trên màn hình (mọi lớp đang hiện)")]].concat(XB.them && XB.them.d ? [[XB.them.d.k, XB.them.d.ten]] : [], ds.filter(d => d.nhom === "ket_qua").map(d => [d.k, d.ten]),
    ds.filter(d => d.nhom === "du_lieu").map(d => [d.k, T("lớp dữ liệu: {t}", {t: d.ten})]));
  xb$("xbND").innerHTML = nd.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join(""); xb$("xbND").value = nd.some(q => q[0] === XB.nd) ? XB.nd : "man";
  const ph = xbPhamDS(); xb$("xbPham").innerHTML = ph.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
  xb$("xbPham").value = ph.some(q => q[0] === XB.pham) ? XB.pham : "nhin"; XB.pham = xb$("xbPham").value;
  const coCat = !!xbPhamVi(XB.pham).mp; xb$("xbCat").disabled = !coCat; if (!coCat) xb$("xbCat").checked = false;
}
function xbHien() {                             // đổ giá trị vào hộp thoại
  const o = XB.o, d = (id, x) => { xb$(id).value = x; }, k = (id, x) => { xb$(id).checked = !!x; };
  xb$("xbKho").innerHTML = Object.entries(XB_KHO).map(([v, q]) => `<option value="${v}">${esc(T(q[2]))}${q[0] ? ` (${q[0]} × ${q[1]} cm)` : ""}</option>`).join("");
  d("xbKho", o.kho); d("xbW", o.w); d("xbH", o.h); d("xbDpi", String(o.dpi)); d("xbDD", o.dd); d("xbLuoi", o.luoi); d("xbCGV", o.cgv); d("xbChu", o.chu); d("xbNet", o.net);
  d("xbCGSo", o.cgSo || "khong"); k("xbWF", o.wf); k("xbCat", o.cat);
  k("xbDuong", o.duong); k("xbThuoc", o.thuoc); k("xbBac", o.bac); k("xbKhung", o.khung !== false); d("xbTieuDe", o.tieuDe || ""); d("xbPhuDe", o.phuDe || "");
  const cu = XB.lop ? XB.lop.map(s => s.k).join() : "", moi = xbDS().map(d => d.k).join();
  if (!XB.lop || XB.nd === "man" || cu.split(",").sort().join() !== moi.split(",").sort().join()) xbDatND(XB.nd);   // "như màn hình": đọc lại màn hình mỗi lần mở
  xbVeND(); xbVeLop(); xbVeCGDS(); xbDDHien();
  if (!o.nguonTay) o.nguon = xbNguonMac(); d("xbNguon", o.nguon);
  xbCo();
}
function xbDDHien() { const dd = xb$("xbDD").value; xb$("xbWF").parentElement.hidden = !(dd === "jpg" || dd === "png"); }
function xbCo() { const o = XB.o, W = Math.round(o.w / 2.54 * o.dpi), H = Math.round(o.h / 2.54 * o.dpi); xb$("xbTT").textContent = T("{w} × {h} điểm ảnh", {w: W, h: H}); }
async function xbBlob(c, kieu, q) {
  const blob = await new Promise((ok, no) => { try { c.toBlob(b => (b ? ok(b) : no(new Error(T("không tạo được ảnh")))), kieu, q); } catch (e) { no(e); } });
  const ab = blob.arrayBuffer ? await blob.arrayBuffer() : await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => no(fr.error); fr.readAsArrayBuffer(blob); });
  return new Uint8Array(ab);
}
async function xbChay(xem) {
  const tok = ++XB.tok, o = Object.assign({}, xbDoc()), tt = s => { if (tok === XB.tok) xb$("xbTT").textContent = s; };
  try {
    if (xem) { const W = xb$("xbXem").parentElement.clientWidth || 700; o.dpi = Math.max(20, Math.min(96, Math.floor(W / (o.w / 2.54)))); }
    tt(T("đang dựng bản đồ…"));
    const geoTif = !xem && o.dd === "tif";
    const R = await xbVe(geoTif ? Object.assign({}, o, {chiKhung: true}) : o, tt); if (tok !== XB.tok) return;
    const ghi = R.thieu.length ? " " + T("Không lấy được: {l} (máy chủ không cho tải chéo hoặc không có ô ảnh).", {l: R.thieu.join(", ")}) : "";
    if (xem) { const cv = xb$("xbXem"); cv.width = R.W; cv.height = R.H; cv.getContext("2d").drawImage(R.c, 0, 0); tt(T("xem trước ({t})", {t: R.tl || "-"}) + ghi); return; }
    const goc = (o.tieuDe ? `ban_do_${v28TenTep(o.tieuDe)}` : "ban_do") + `_${o.dpi}dpi_${stamp()}`, E = R.E;
    let ten, du, kieu;
    if (geoTif) {                                // GeoTIFF khung bản đồ: RGBA 8 bit, EPSG:3857, điểm ảnh = r mét Web Mercator
      const id = R.c.getContext("2d").getImageData(0, 0, R.W, R.H).data, N = R.W * R.H, B = [0, 1, 2, 3].map(() => new Uint8Array(N));
      for (let i = 0; i < N; i++) { B[0][i] = id[i * 4]; B[1][i] = id[i * 4 + 1]; B[2][i] = id[i * 4 + 2]; B[3][i] = id[i * 4 + 3]; }
      du = new Uint8Array(XH.tifGhi({bands: B, w: R.W, h: R.H, x0: E.x0 - E.fx * E.r, y1: E.y1 + E.fy * E.r, res: E.r, epsg: 3857, rgb: true}));
      ten = goc + ".tif"; kieu = "image/tiff";
    } else if (o.dd === "pdf") {                // PDF có toạ độ: cả trang là một ảnh JPEG, khung bản đồ khai báo bằng Viewport + Measure GEO
      const jpg = await xbBlob(R.c, "image/jpeg", 0.92), kp = 72 / o.dpi, a = CORE.m2ll(E.x0, E.y0), b = CORE.m2ll(E.x1, E.y1);
      du = XH.pdfGeo({jpeg: jpg, wPx: R.W, hPx: R.H, wPt: R.W * kp, hPt: R.H * kp, vp: [R.F.x * kp, (R.H - R.F.y - R.F.h) * kp, (R.F.x + R.F.w) * kp, (R.H - R.F.y) * kp],
        ll: {w: a[0], s: a[1], e: b[0], n: b[1]}, ten: o.tieuDe || "map"});
      ten = goc + ".pdf"; kieu = "application/pdf";
    } else {
      kieu = o.dd === "png" ? "image/png" : "image/jpeg";
      const u8 = await xbBlob(R.c, kieu, 0.93), anh = o.dd === "png" ? XH.pngDpi(u8, o.dpi) : XH.jpegDpi(u8, o.dpi), duoi = o.dd === "png" ? "png" : "jpg";
      if (o.wf) {                                // world file: tâm điểm ảnh góc trên trái của cả ảnh (lề, chú giải nằm ngoài khung nhưng cùng phép affine)
        const wf = XH.worldFile(E.r, E.x0 + (0.5 - E.fx) * E.r, E.y1 - (0.5 - E.fy) * E.r);
        du = XH.zip([{ten: goc + "." + duoi, du: anh}, {ten: goc + (duoi === "png" ? ".pgw" : ".jgw"), du: wf}, {ten: goc + ".prj", du: XH.WKT_3857},
          {ten: goc + "." + duoi + ".aux.xml", du: XH.auxXml()}]);
        ten = goc + ".zip"; kieu = "application/zip";
      } else { du = anh; ten = goc + "." + duoi; }
    }
    v28Tai(ten, du, kieu);
    tt(T("đã xuất {f}: {w} × {h} điểm ảnh, {d} dpi, {cw} × {ch} cm", {f: ten, w: R.W, h: R.H, d: o.dpi, cw: o.w, ch: o.h}) + ghi);
    return {ten, du, R};
  } catch (e) { tt(T("lỗi: ") + (/tainted|insecure|SecurityError/i.test(String(e && (e.name + e.message))) ? T("một lớp ảnh không cho tải chéo nên trình duyệt chặn xuất: tắt lớp đó hoặc đổi ảnh nền rồi thử lại") : (e.message || e))); }
}
async function xbAnhBaoCao(k, g) {               // bản 2.9: ảnh bản đồ đầy đủ cho báo cáo HTML (không đổi lựa chọn trong hộp thoại xuất)
  const luu = {lop: XB.lop, nd: XB.nd, pham: XB.pham, bo: XB.bo};
  try {
    XB.lop = null; XB.bo = {}; xbDatND(k); if (!XB.lop.some(s => s.k === k && s.on)) return null; XB.pham = "kq";
    const by = {}; xbDS().forEach(d => { by[d.k] = d; });
    XB.lop.forEach(s => { if (by[s.k] && (by[s.k].nhom === "nen" || by[s.k].nhom === "du_lieu")) s.on = false; });   // bản đồ chuyên đề: kết quả + ranh giới, không ảnh nền
    const ar = g && g.w && g.h ? g.w / g.h : 1.3, h = Math.max(8, Math.min(20, 12.5 / ar + 2.2));
    const o = Object.assign({}, XB_MAC, {w: 18, h: +h.toFixed(1), dpi: 150, chu: 7.5, cgv: "phai", cgSo: "ha_pct", luoi: "dms", tieuDe: "", phuDe: "", pham: "kq", cat: false});
    o.nguon = xbNguonMac(o);
    const R = await xbVe(o);
    return {url: R.c.toDataURL("image/png"), thieu: R.thieu, W: R.W, H: R.H};
  } finally { Object.assign(XB, luu); }
}
function xbMo(nd, pham) {                        // nd, pham: mở sẵn một nội dung (vd từ bảng Chọn vùng)
  const d = xb$("dlgXB");
  if (nd) { XB.lop = null; XB.nd = nd; } if (pham) XB.pham = pham;
  xbHien(); if (pham) { xb$("xbPham").value = pham; xbDoc(); xbVeND(); }
  if (!d.open) d.showModal ? d.showModal() : d.show();
}
$("bXB").onclick = () => { if (XB.them) { XB.them = null; XB.lop = null; if (XB.nd === "vgx") XB.nd = "man"; if (XB.pham === "them") XB.pham = "nhin"; } xbMo(); };
xb$("xbDong").onclick = () => xb$("dlgXB").close();
xb$("xbXemBtn").onclick = () => xbChay(true);
xb$("xbXuatBtn").onclick = () => xbChay(false);
xb$("xbND").onchange = () => { xbDatND(xb$("xbND").value); xbVeND(); xbVeLop(); xbSauDoi(); };
xb$("xbPham").onchange = () => { XB.pham = xb$("xbPham").value; xbVeND(); xbSauDoi(); };
xb$("xbDD").onchange = xbDDHien;
xb$("xbKho").onchange = () => { const q = XB_KHO[xb$("xbKho").value]; if (q && q[0]) { xb$("xbW").value = q[0]; xb$("xbH").value = q[1]; } xbDoc(); xbCo(); };
["xbW", "xbH", "xbDpi"].forEach(id => { xb$(id).addEventListener("input", () => { if (id !== "xbDpi") xb$("xbKho").value = "tu"; xbDoc(); xbCo(); }); });
xb$("xbNguon").addEventListener("input", () => { XB.o.nguonTay = true; });
xb$("xbLuoi").addEventListener("change", () => { if (!XB.o.nguonTay) { xbDoc(); XB.o.nguon = xbNguonMac(); xb$("xbNguon").value = XB.o.nguon; } });
xb$("xbNguonMac").onclick = () => { XB.o.nguonTay = false; xbDoc(); XB.o.nguon = xbNguonMac(); xb$("xbNguon").value = XB.o.nguon; };
const _setLang28xb = setLang;
setLang = function (l) { _setLang28xb(l); if (xb$("dlgXB").open) { if (!XB.o.nguonTay) XB.o.nguon = ""; xbHien(); } };
