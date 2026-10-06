/* =============================== BẢN 3.9: MÙA VỤ 12 THÁNG =============================== */
/* Đường mùa vụ 12 kỳ: mỗi tháng một giá trị. Đường 6 kỳ là tái dựng từ PCA chuỗi năm (6 kỳ 2 tháng), không tách được ra từng tháng,
   nên 12 tháng lấy thẳng Sentinel-2 L2A tại điểm: sentinel-2-l2a trên Microsoft Planetary Computer, API điểm của máy chủ (một yêu cầu
   cho mỗi cảnh, 10 băng + SCL). Cảnh lọc trước theo mây cả cảnh ≤ 80 %, cùng ngày ở hai ô MGRS thì giữ cảnh ít mây hơn; tại điểm chỉ
   giữ cảnh quang đãng theo SCL (4, 5, 6, 7, 11). Phản xạ × 10000 = DN − 1000 với baseline xử lý từ 04.00 (BOA_ADD_OFFSET), DN với
   baseline cũ. Mỗi cảnh tính đủ đặc trưng (10 băng ra phản xạ, NDVI, MNDWI, các chỉ số đang dùng), mỗi tháng lấy trung vị.
   Đo 06.10.2026 tại 20.89696, 106.58221 (ruộng lúa): năm 2024 có 52 ngày cảnh sau lọc mây, 26 cảnh quang đãng tại điểm, tháng 7
   không có cảnh nào; NDVI theo tháng thấp ở tháng 4 (0.40) và tháng 8 (0.43), cao ở tháng 6 (0.68) và tháng 9 (0.66): đúng hai vụ lúa.
   Mỗi yêu cầu điểm 0.7–0.9 s (trung vị); 6 yêu cầu cùng lúc mất 8–21 s cho một năm, 12 yêu cầu cùng lúc 2–6 s, không lỗi: hàng đợi
   chung (S1 + S2 tháng) nâng từ 6 lên 12. Năm đang gán đọc trước, điểm đang xem được ưu tiên; kết quả giữ trong IndexedDB. */
var S2M = {m: new Map(), dang: new Map(), db: null, AS: ["B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B11", "B12", "SCL"],
           TEN: ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"], TRONG: {4: 1, 5: 1, 6: 1, 7: 1, 11: 1}};
if (CVS.ky12 == null) CVS.ky12 = false;
S1C.MAX = 12;                                        // hàng đợi chung S1 + S2 tháng: 12 yêu cầu cùng lúc (đo ở trên)
s1Giu = function (k) { return new Promise(r => { if (S1C.hang.chay < S1C.MAX) { S1C.hang.chay++; r(); } else S1C.hang.cho.push({k, r}); }); };
S2M.san = (async () => {
  if (typeof indexedDB === "undefined") return;
  try { S2M.db = await new Promise((ok, loi) => { const r = indexedDB.open("laymau_hp_s2m", 1); r.onupgradeneeded = () => r.result.createObjectStore("d"); r.onsuccess = () => ok(r.result); r.onerror = () => loi(r.error); }); }
  catch (e) { S2M.db = null; }
})();
async function s2mDocKho(k) {
  await S2M.san; if (!S2M.db) return null;
  try { return await new Promise(ok => { const r = S2M.db.transaction("d", "readonly").objectStore("d").get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); } catch (e) { return null; }
}
function s2mGhiKho(k, v) { if (!S2M.db) return; try { S2M.db.transaction("d", "readwrite").objectStore("d").put(v, k); } catch (e) { /* bỏ */ } }
function s2mNam() { return s1Nam().filter(y => y >= 2016); }
function s2mDacTrung(v) {                            // v: 10 băng (phản xạ × 10000) -> {tên: giá trị}
  const o = {}, r = v.map(x => x / 1e4), nd = (a, b) => a + b ? (a - b) / (a + b) : null;
  S2M.TEN.forEach((b, i) => { o[b] = +r[i].toFixed(4); });                   // băng ghi bằng phản xạ (0..1), cùng thang với NDVI
  o.NDVI = nd(r[6], r[2]); o.MNDWI = nd(r[1], r[8]);
  try {
    const bs = s2Bang(), dn = bs.map(b => { const i = S2M.TEN.indexOf(b); return i >= 0 ? v[i] : NaN; });
    (typeof csDS === "function" ? csDS() : []).forEach(c => { if (o[c.ten] != null) return; const x = csTinh(c, dn); if (x != null && isFinite(x)) o[c.ten] = +x.toFixed(4); });
  } catch (e) { /* bỏ */ }
  return o;
}
function s2mCsK() { return ST.chiso ? ST.chiso.dung.join() + "|" + ST.chiso.tu.map(t => t.bt).join() : ""; }
function s2mDT(c) { const k = s2mCsK(); if (!c.f || c.fk !== k) { c.f = s2mDacTrung(c.v); c.fk = k; } return c.f; }   // đặc trưng của một cảnh (tính lại khi đổi chỉ số)
function s2mViTri(d) { const m = +d.slice(5, 7) - 1, dd = +d.slice(8, 10) - 1; return Math.max(0, Math.min(11, m + dd / 31 - 0.5)); }
function s2mTong(e) {                                // trung vị theo tháng của các cảnh quang đãng tại điểm, mỗi năm
  const nam = {}, tv = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  e.canh.forEach(c => {
    if (!c.quang || !c.v) return;
    const y = +c.d.slice(0, 4), k = +c.d.slice(5, 7) - 1, N = nam[y] = nam[y] || {_: {}, n: new Array(12).fill(0)};
    N.n[k]++;
    Object.entries(s2mDT(c)).forEach(([f, x]) => { if (x == null || !isFinite(x)) return; (N._[f] = N._[f] || Array.from({length: 12}, () => []))[k].push(x); });
  });
  Object.values(nam).forEach(N => { Object.entries(N._).forEach(([f, a]) => { N[f] = a.map(tv); }); delete N._; });
  e.nam = nam; e.fk = s2mCsK();
}
function s2mVeLai(k) {
  const q = vizPt(); if (!q || s1Khoa(q) !== k || CVS.kind === "nam" || !CVS.ky12) return;
  clearTimeout(S2M.henVe); S2M.henVe = setTimeout(() => { renderCurve(); if ($("dlgCurve") && $("dlgCurve").open) renderCurveBig(); }, 60);
}
async function s2mDiem(p) {                          // -> {canh: [{d, id, scl, quang, v[10]}], nam: {y: {đặc trưng: [12], n: [12]}}, xong, loi}
  const k = s1Khoa(p);
  if (S2M.m.has(k) && S2M.m.get(k).xong) return S2M.m.get(k);
  if (S2M.dang.has(k)) return S2M.dang.get(k);
  const e = {canh: [], nam: {}, xong: false, doc: 0, tong: 0};
  S2M.m.set(k, e);
  const bao = () => { s2mTong(e); s2mVeLai(k); };
  const pr = (async () => {
    const cu = await s2mDocKho(k), ys = s2mNam();
    if (cu && cu.xong && ys.every(y => (cu.nam_doc || []).includes(y))) { Object.assign(e, cu); bao(); return e; }
    try {
      const body = {collections: ["sentinel-2-l2a"], intersects: {type: "Point", coordinates: [p.lon, p.lat]}, datetime: `${ys[0]}-01-01T00:00:00Z/${ys[ys.length - 1]}-12-31T23:59:59Z`,
                    limit: 1000, query: {"eo:cloud_cover": {lte: 80}},
                    fields: {include: ["id", "properties.datetime", "properties.eo:cloud_cover", "properties.s2:processing_baseline", "properties.s2:mgrs_tile"], exclude: ["assets", "links", "geometry", "bbox"]}};
      let feats = [], j = await s1Lay(S1C.API + "/stac/v1/search", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
      for (let trang = 0; trang < 10; trang++) {
        feats = feats.concat(j.features || []);
        const nx = (j.links || []).find(l => l.rel === "next"); if (!nx) break;
        j = await s1Lay(nx.href, nx.method === "POST" ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(Object.assign({}, body, nx.body || {}))} : undefined);
      }
      const theoNgay = {};                            // cùng ngày ở hai ô MGRS: giữ cảnh ít mây hơn
      feats.forEach(f => { const d = String(f.properties.datetime).slice(0, 10), c = theoNgay[d]; if (!c || (f.properties["eo:cloud_cover"] || 0) < (c.properties["eo:cloud_cover"] || 0)) theoNgay[d] = f; });
      const nam0 = ST.nam, ds = Object.entries(theoNgay).map(([d, f]) => ({d, id: f.id, may: f.properties["eo:cloud_cover"], pb: parseFloat(f.properties["s2:processing_baseline"] || "0")}))
        .sort((a, b) => Math.abs(+a.d.slice(0, 4) - nam0) - Math.abs(+b.d.slice(0, 4) - nam0) || (a.d < b.d ? -1 : 1));
      if (!ds.length) { e.xong = true; e.loi = "khong_canh"; bao(); return e; }
      e.tong = ds.length; e.doc = 0;
      let hen = null;
      await Promise.all(ds.map(async c => {
        await s1Giu(k);
        try {
          const r = await s1Lay(`${S1C.API}/data/v1/item/point/${p.lon},${p.lat}?collection=sentinel-2-l2a&item=${encodeURIComponent(c.id)}&` + S2M.AS.map(a => "assets=" + a).join("&"));
          const x = r.values || [], scl = x[10], off = c.pb >= 4 ? -1000 : 0;
          const v = x.slice(0, 10).every(t => t > 0 && isFinite(t)) ? x.slice(0, 10).map(t => Math.max(1, t + off)) : null;
          e.canh.push({d: c.d, id: c.id, may: c.may, scl, quang: !!S2M.TRONG[scl] && !!v, v});
        } catch (er) { e.canh.push({d: c.d, id: c.id, scl: null, quang: false, v: null, loi: 1}); }
        finally { s1Nha(); }
        e.doc++;
        if (!hen) hen = setTimeout(() => { hen = null; bao(); }, 700);
      }));
      clearTimeout(hen);
      e.canh.sort((a, b) => a.d < b.d ? -1 : 1);
      e.xong = true; e.nam_doc = ys; bao();
      const hong = e.canh.filter(c => c.loi).length;
      if (hong <= 0.05 * e.canh.length) s2mGhiKho(k, {canh: e.canh.map(({f, fk, ...c}) => c), xong: true, nam_doc: ys, tong: e.tong, doc: e.doc});
      else e.hong = hong;
    } catch (er) { e.loi = String(er.message || er); e.xong = true; bao(); }
    return e;
  })();
  S2M.dang.set(k, pr); pr.finally(() => S2M.dang.delete(k));
  return pr;
}
function s2mGop(p) {                                 // dữ liệu 12 tháng cho đồ thị mùa vụ (đọc dần, vẽ lại khi có thêm)
  const k = s1Khoa(p), e0 = S2M.m.get(k);
  if (!e0 || !e0.xong) s2mDiem(p).catch(() => {});
  const e = S2M.m.get(k) || {canh: [], nam: {}, xong: false, doc: 0, tong: 0}, ys = {};
  if (e.canh.length && e.fk !== s2mCsK()) s2mTong(e);                          // đổi bộ chỉ số: tính lại
  Object.entries(e.nam || {}).forEach(([y, N]) => { const o = {}; Object.keys(N).forEach(f => { if (f !== "n") o[f] = N[f]; }); o.SO_CANH = N.n; ys[y] = o; });
  s2mNam().forEach(y => { if (!ys[y]) ys[y] = {}; });
  return {src: {kieu: "s2m"}, ys, s2m: e};
}
function s2mSVG(cv, g) {                             // chế độ "một năm": thêm chấm từng cảnh quang đãng của năm đang gán, vạch xám dưới trục là cảnh bị mây
  const {mode, feats, X, Y, H, B0} = g, e = cv.s2m; if (mode !== "mot" || !e) return "";
  let s = "";
  e.canh.forEach(c => {
    if (+c.d.slice(0, 4) !== ST.nam) return;
    const x = X(s2mViTri(c.d)).toFixed(1);
    if (!c.quang) { s += `<line x1="${x}" x2="${x}" y1="${H - B0 - 5}" y2="${H - B0}" stroke="#98a2b3" stroke-width="1.2"><title>${c.d}: ${T("mây/bóng mây tại điểm")} (SCL ${c.scl == null ? "?" : c.scl}${c.scl != null && typeof S2O_SCL !== "undefined" && S2O_SCL[c.scl] ? " " + T(S2O_SCL[c.scl]) : ""})</title></line>`; return; }
    const f = s2mDT(c);
    feats.forEach(k => { const v = f[k]; if (v == null || !isFinite(v)) return;
      s += `<circle cx="${x}" cy="${Y(v).toFixed(1)}" r="1.7" fill="${cvCol(k)}" opacity=".55"><title>${k} ${c.d}: ${v.toFixed(3)} (SCL ${c.scl})</title></circle>`; });
  });
  return s;
}
function s2mChuGiai(cv) {
  const e = cv.s2m, d = cv.ys[ST.nam], n = d && d.SO_CANH ? d.SO_CANH.reduce((a, b) => a + b, 0) : 0, trong = d && d.SO_CANH ? d.SO_CANH.map((x, i) => x ? null : i + 1).filter(Boolean) : [];
  let h = `<div class="cvnote">${T("Sentinel-2 L2A (Planetary Computer), trung vị theo tháng các cảnh quang đãng tại điểm (SCL), đúng điểm ảnh")}`;
  if (!e.xong) h += ` · <b>${T("đang đọc S2 {a}/{b} cảnh…", {a: e.doc || 0, b: e.tong || "?"})}</b>`;
  else if (e.loi) h += ` · <b style="color:#b42318">${e.loi === "khong_canh" ? T("không có cảnh S2 tại điểm") : T("lỗi đọc S2: ") + esc(e.loi)}</b>`;
  else h += ` · ${T("{a} cảnh, {b} cảnh quang đãng tại điểm", {a: e.canh.length, b: e.canh.filter(c => c.quang).length})}`;
  h += ` · ${T("năm {y}: {n} cảnh quang đãng", {y: ST.nam, n})}${trong.length && trong.length < 12 ? " · " + T("tháng không có ảnh quang đãng: {t}", {t: trong.join(", ")}) : ""}</div>`;
  return h;
}
var _cvCtl39 = cvCtl;
cvCtl = function () {
  const f0 = CVS.feat;                               // bản cũ đặt lại đặc trưng không có ở 6 kỳ: giữ lựa chọn của 12 tháng
  _cvCtl39.apply(this, arguments);
  const s = $("selCurveKy"); if (s) { s.value = CVS.ky12 ? "12" : "6"; s.hidden = CVS.kind === "nam"; }
  if (CVS.kind !== "nam" && CVS.ky12) {
    $("curveH").textContent = T("Đường mùa vụ 12 tháng (Sentinel-2 tại điểm, trực tuyến)");
    const sf = $("selCurveFeat"), fs = ["NDVI", "MNDWI"].concat(S2M.TEN, (typeof csDS === "function" ? csDS() : []).map(c => c.ten).filter(t => t !== "NDVI" && t !== "MNDWI"));
    if (sf.dataset.fs !== "12|" + fs.join()) { sf.innerHTML = fs.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join(""); sf.dataset.fs = "12|" + fs.join(); }
    CVS.feat = fs.includes(f0) ? f0 : fs.includes(CVS.feat) ? CVS.feat : "NDVI";
    sf.value = CVS.feat;
  }
};
(function () {
  const s = $("selCurveKy"); if (!s) return;
  s.value = CVS.ky12 ? "12" : "6";
  s.onchange = () => { CVS.ky12 = s.value === "12"; const sf = $("selCurveFeat"); if (sf) sf.dataset.fs = ""; ls("laymau_hp_curve_v1", CVS); renderCurve(); if (typeof NT !== "undefined") { NT.xong.clear(); ntBatDau(); } };
})();
/* nạp trước: đường 12 tháng của các điểm kế tiếp (5 điểm gần nhất) */
var _ntNap39 = ntNap;
ntNap = async function (p, tok, thu) {
  await _ntNap39.apply(this, arguments);
  if (tok !== NT.tok || CVS.kind === "nam" || !CVS.ky12 || thu > 4) return;
  try { await s2mDiem(p); } catch (e) { /* bỏ */ }
};
var _ntKhoa39 = ntKhoa;
ntKhoa = function (p) { return _ntKhoa39(p) + "|" + (CVS.ky12 ? 12 : 6); };
