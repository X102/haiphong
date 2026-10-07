/* =============================== BẢN 3.6 =============================== */
/* Đường mùa vụ 6 kỳ: thêm đường Sentinel-1 (VV, VH, dB, trục phải) cùng lúc với đường Sentinel-2 (NDVI, MNDWI, băng, chỉ số).
   Dữ liệu S1: sentinel-1-rtc trên Microsoft Planetary Computer, đọc giá trị tại điểm bằng API điểm của máy chủ (một yêu cầu cho mỗi cảnh,
   cả hai phân cực; máy chủ tự đọc ảnh nên không phải tải khối ảnh về trình duyệt). Đo 06.10.2026 ở Hải Phòng: 28 cảnh trong 2 s
   (6 yêu cầu cùng lúc). Một quỹ đạo cho mọi năm (quỹ đạo có nhiều cảnh nhất tại điểm) để góc nhìn đồng nhất; mỗi kỳ 2 tháng lấy trung
   vị dB các cảnh. Năm đang gán đọc trước, các năm khác đọc dần; kết quả giữ trong trình duyệt (IndexedDB). */
var S1C = {m: new Map(), dang: new Map(), hang: {chay: 0, cho: []}, db: null, API: "https://planetarycomputer.microsoft.com/api"};
if (CVS.s1 == null) CVS.s1 = false;
var S1MAU = {VV: "#e8590c", VH: "#ae3ec9", RT: "#0b7285"};      // RT: VH − VV (dB), bản 3.10.1
var S1TEN = {VV: "VV", VH: "VH", RT: "VH−VV"};
function s1Bang() { const b = (CVS.s1b && CVS.s1b.length ? CVS.s1b : ["VV", "VH"]).filter(k => S1MAU[k]); return b.length ? b : ["VV", "VH"]; }
function s1Khoa(p) { return (+p.lon).toFixed(5) + "," + (+p.lat).toFixed(5); }
S1C.san = (async () => {
  if (typeof indexedDB === "undefined") return;
  try { S1C.db = await new Promise((ok, loi) => { const r = indexedDB.open("laymau_hp_s1", 1); r.onupgradeneeded = () => r.result.createObjectStore("d"); r.onsuccess = () => ok(r.result); r.onerror = () => loi(r.error); }); }
  catch (e) { S1C.db = null; }
})();
async function s1DocKho(k) {
  await S1C.san; if (!S1C.db) return null;
  try { return await new Promise(ok => { const r = S1C.db.transaction("d", "readonly").objectStore("d").get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); } catch (e) { return null; }
}
function s1GhiKho(k, v) { if (!S1C.db) return; try { S1C.db.transaction("d", "readwrite").objectStore("d").put(v, k); } catch (e) { /* bỏ */ } }
/* hàng đợi chung 6 yêu cầu; điểm đang xem được ưu tiên (đổi điểm giữa chừng thì điểm mới không phải chờ điểm cũ đọc xong) */
function s1Giu(k) { return new Promise(r => { if (S1C.hang.chay < 6) { S1C.hang.chay++; r(); } else S1C.hang.cho.push({k, r}); }); }
function s1Nha() {
  const c = S1C.hang.cho; if (!c.length) { S1C.hang.chay--; return; }
  const q = vizPt(), kq = q ? s1Khoa(q) : null; let i = kq ? c.findIndex(x => x.k === kq) : -1; if (i < 0) i = 0;
  c.splice(i, 1)[0].r();
}
async function s1Lay(u, o) {                          // fetch có thử lại khi máy chủ bận (429, 5xx)
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, o);
    if (r.ok) return r.json();
    if (r.status !== 429 && r.status < 500) throw new Error("HTTP " + r.status);
    await new Promise(z => setTimeout(z, 1200 * (i + 1)));
  }
  throw new Error("máy chủ bận");
}
function s1Nam() {                                    // các năm cần: năm của đường S2 (PC), các năm cần gán; S1 có từ 2015
  const ys = new Set(years()); if (MAN && MAN.pc) MAN.pc.nam.forEach(y => ys.add(y));
  return [...ys].filter(y => y >= 2015 && y <= new Date().getFullYear()).sort((a, b) => a - b);
}
function s1Ky(ngay, nky) { const m = +ngay.slice(5, 7) - 1; return nky === 12 ? m : Math.min(5, Math.floor(m / 2)); }
function s1Tong(e) {                                  // trung vị dB theo kỳ 2 tháng (e.nam) và theo tháng (e.nam12), mỗi năm
  const tv = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  [6, 12].forEach(nky => {
    const nam = {}, rong = () => Array.from({length: nky}, () => []);
    e.canh.forEach(c => {
      if (c.vv == null) return;
      const y = +c.d.slice(0, 4), k = s1Ky(c.d, nky), N = nam[y] = nam[y] || {VV: rong(), VH: rong(), RT: rong()};
      N.VV[k].push(c.vv); if (c.vh != null) { N.VH[k].push(c.vh); N.RT[k].push(c.vh - c.vv); }
    });
    Object.values(nam).forEach(N => { N.n = N.VV.map(a => a.length); N.VV = N.VV.map(tv); N.VH = N.VH.map(tv); N.RT = N.RT.map(tv); });
    if (nky === 12) e.nam12 = nam; else e.nam = nam;
  });
}
function s1VeLai(k) {                                // điểm đang xem là điểm vừa có thêm dữ liệu S1: vẽ lại đồ thị (gộp các lần gọi)
  const q = vizPt(); if (!q || s1Khoa(q) !== k || CVS.kind === "nam" || !CVS.s1) return;
  clearTimeout(S1C.henVe); S1C.henVe = setTimeout(() => { renderCurve(); if ($("dlgCurve") && $("dlgCurve").open) renderCurveBig(); }, 60);
}
async function s1Diem(p) {                            // -> {canh: [{d, id, vv, vh (dB)}], nam: {y: {VV[6], VH[6], n[6]}}, quy, xong, loi}
  const k = s1Khoa(p);
  if (S1C.m.has(k) && S1C.m.get(k).xong) return S1C.m.get(k);
  if (S1C.dang.has(k)) return S1C.dang.get(k);
  const e = {canh: [], nam: {}, xong: false, doc: 0, tong: 0};
  S1C.m.set(k, e);
  const bao = () => { s1Tong(e); s1VeLai(k); };
  const pr = (async () => {
    const cu = await s1DocKho(k), ys = s1Nam();
    if (cu && cu.xong && ys.every(y => (cu.nam_doc || []).includes(y))) { Object.assign(e, cu); bao(); return e; }
    try {
      const body = {collections: ["sentinel-1-rtc"], intersects: {type: "Point", coordinates: [p.lon, p.lat]},
                    datetime: `${ys[0]}-01-01T00:00:00Z/${ys[ys.length - 1]}-12-31T23:59:59Z`, limit: 1000,
                    fields: {include: ["id", "properties.datetime", "properties.sat:orbit_state", "properties.sat:relative_orbit"], exclude: ["assets", "links", "geometry", "bbox"]}};
      let feats = [], j = await s1Lay(S1C.API + "/stac/v1/search", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
      for (let trang = 0; trang < 10; trang++) {
        feats = feats.concat(j.features || []);
        const nx = (j.links || []).find(l => l.rel === "next"); if (!nx) break;
        j = await s1Lay(nx.href, nx.method === "POST" ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(Object.assign({}, body, nx.body || {}))} : undefined);
      }
      const dem = {}; feats.forEach(f => { const q = f.properties["sat:orbit_state"] + " " + f.properties["sat:relative_orbit"]; dem[q] = (dem[q] || 0) + 1; });
      const quy = Object.entries(dem).sort((a, b) => b[1] - a[1])[0];
      if (!quy) { e.xong = true; e.loi = "khong_canh"; bao(); return e; }
      e.quy = quy[0];
      const nam0 = ST.nam, ds = feats.filter(f => f.properties["sat:orbit_state"] + " " + f.properties["sat:relative_orbit"] === quy[0])
        .map(f => ({id: f.id, d: String(f.properties.datetime).slice(0, 10)}))
        .sort((a, b) => Math.abs(+a.d.slice(0, 4) - nam0) - Math.abs(+b.d.slice(0, 4) - nam0) || (a.d < b.d ? -1 : 1));
      e.tong = ds.length; e.doc = 0;
      let hen = null;
      await Promise.all(ds.map(async c => {
        await s1Giu(k);
        try {
          const r = await s1Lay(`${S1C.API}/data/v1/item/point/${p.lon},${p.lat}?collection=sentinel-1-rtc&item=${encodeURIComponent(c.id)}&assets=vv&assets=vh`);
          const v = r.values || [], db = x => x > 0 && isFinite(x) && x !== -32768 ? +(10 * Math.log10(x)).toFixed(2) : null;
          e.canh.push({d: c.d, id: c.id, vv: db(v[0]), vh: db(v[1])});
        } catch (er) { e.canh.push({d: c.d, id: c.id, vv: null, vh: null, loi: 1}); }
        finally { s1Nha(); }
        e.doc++;
        if (!hen) hen = setTimeout(() => { hen = null; bao(); }, 600);       // vẽ lại dần, không quá 2 lần mỗi giây
      }));
      clearTimeout(hen);
      e.canh.sort((a, b) => a.d < b.d ? -1 : 1);
      e.xong = true; e.nam_doc = ys; bao();
      const hong = e.canh.filter(c => c.loi).length;
      if (hong <= 0.05 * e.canh.length) s1GhiKho(k, {canh: e.canh, nam: e.nam, quy: e.quy, xong: true, nam_doc: ys, tong: e.tong, doc: e.doc});
      else e.hong = hong;                               // lỗi mạng nhiều: không lưu vào trình duyệt (mở lại trang thì đọc lại)
    } catch (er) { e.loi = String(er.message || er); e.xong = true; bao(); }
    return e;
  })();
  S1C.dang.set(k, pr); pr.finally(() => S1C.dang.delete(k));
  return pr;
}
function s1Gop(cv, p) {                               // gắn dữ liệu S1 (có thể đang đọc dở) vào đường mùa vụ; vẽ lại khi có thêm
  const k = s1Khoa(p), e = S1C.m.get(k);
  if (!e || !e.xong) s1Diem(p).catch(() => {});
  const e2 = S1C.m.get(k) || {canh: [], nam: {}, xong: false, doc: 0, tong: 0};
  const out = cv ? Object.assign({}, cv, {ys: Object.assign({}, cv.ys)}) : {src: {kieu: "s1"}, ys: {}};
  if (!cv || !Object.keys(cv.ys).length) { out.src = {kieu: "s1"}; s1Nam().forEach(y => { if (!out.ys[y]) out.ys[y] = {}; }); }
  out.s1 = e2;
  return out;
}
function s1SVG(cv, g) {                               // lớp S1 trong đồ thị mùa vụ: trục dB bên phải, VV, VH nét đứt
  const {mode, yrs, X, W, H, R0, T0, B0, nky} = g, e = cv.s1, nam = (nky === 12 ? e.nam12 : e.nam) || {}, BS = s1Bang();
  const gt = (c, b) => b === "VV" ? c.vv : b === "VH" ? c.vh : (c.vv != null && c.vh != null ? c.vh - c.vv : null);
  const vals = [];
  Object.values(nam).forEach(N => BS.forEach(b => (N[b] || []).forEach(v => { if (v != null) vals.push(v); })));
  if (mode === "mot") e.canh.forEach(c => { if (+c.d.slice(0, 4) === ST.nam) BS.forEach(b => { const v = gt(c, b); if (v != null) vals.push(v); }); });
  if (!vals.length) return `<text x="${W - R0 - 4}" y="${T0 + 10}" font-size="9" text-anchor="end" fill="${S1MAU.VV}">S1: ${e.xong ? T("không có dữ liệu") : T("đang đọc…")}</text>`;
  vals.sort((a, b) => a - b);
  let lo = Math.floor(vals[Math.floor(vals.length * 0.02)] / 5) * 5, hi = Math.ceil(vals[Math.ceil(vals.length * 0.98) - 1] / 5) * 5;
  if (hi - lo < 10) { lo -= 5; hi += 5; }
  const Y = v => T0 + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - T0 - B0);
  let s = "";
  for (let v = lo; v <= hi + 1e-9; v += 5) s += `<text x="${W - R0 + 3}" y="${(Y(v) + 3).toFixed(1)}" font-size="8.5" fill="#9e77a8">${v}</text>`;
  s += `<text x="${W - R0 + 3}" y="${Math.max(8, T0 - 7)}" font-size="8" fill="#9e77a8">dB</text>`;
  const duong = (pts, mau, w, op, dash) => { const q = pts.filter(t => t[1] != null && isFinite(t[1])); if (q.length < 2) return "";
    return `<polyline points="${q.map(t => X(t[0]).toFixed(1) + "," + Y(t[1]).toFixed(1)).join(" ")}" fill="none" stroke="${mau}" stroke-width="${w}" opacity="${op}" stroke-dasharray="${dash || "6 3"}" stroke-linejoin="round"/>`; };
  const tv = (b, i) => { const a = Object.values(nam).map(N => (N[b] || [])[i]).filter(v => v != null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const viTri = d => { const m = +d.slice(5, 7) - 1, dd = +d.slice(8, 10) - 1; return Math.max(0, Math.min(nky - 1, nky === 12 ? m + dd / 31 - 0.5 : (m + dd / 31) / 2 - 0.5)); };
  if (mode === "chuoi") {
    BS.forEach(b => { s += duong(yrs.flatMap((y, k) => nam[y] && nam[y][b] ? nam[y][b].map((v, i) => [k * nky + i, v]) : []), S1MAU[b], 1.5, 0.95); });
    yrs.forEach((y, k) => { if (!nam[y]) return; BS.forEach(b => (nam[y][b] || []).forEach((v, i) => { if (v == null) return;
      s += `<circle cx="${X(k * nky + i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="1.6" fill="${S1MAU[b]}"><title>${S1TEN[b]} ${y}, ${kyTen(i)}: ${v.toFixed(1)} dB (${nam[y].n[i]} ${T("cảnh")})</title></circle>`; })); });
    return s;
  }
  BS.forEach(b => {
    if (mode === "mot") Object.entries(nam).forEach(([y, N]) => { if (+y !== ST.nam && N[b]) s += duong(N[b].map((v, i) => [i, v]), S1MAU[b], 1, 0.2, "3 3"); });
    else s += duong(KY.map((t, i) => [i, tv(b, i)]), S1MAU[b], 1.2, 0.7, "2 2");
    const N = nam[ST.nam];
    if (N && N[b]) { s += duong(N[b].map((v, i) => [i, v]), S1MAU[b], 2.4, 1);
      N[b].forEach((v, i) => { if (v != null) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.6" fill="#fff" stroke="${S1MAU[b]}" stroke-width="1.6"><title>${S1TEN[b]} ${ST.nam}, ${kyTen(i)}: ${v.toFixed(1)} dB (${T("trung vị")} ${N.n[i]} ${T("cảnh")})</title></circle>`; }); }
  });
  if (mode === "mot") e.canh.forEach(c => { if (+c.d.slice(0, 4) !== ST.nam) return; const x = X(viTri(c.d)).toFixed(1);
    BS.forEach(b => { const v = gt(c, b); if (v != null) s += `<circle cx="${x}" cy="${Y(v).toFixed(1)}" r="1.4" fill="${S1MAU[b]}" opacity=".55"><title>${S1TEN[b]} ${c.d}: ${v.toFixed(1)} dB</title></circle>`; }); });
  return s;
}
function s1ChuGiai(cv, mode) {
  const e = cv.s1;
  let h = `<div class="cvleg">` + s1Bang().map((b, k) => `<span><i style="background:${S1MAU[b]}"></i>S1 ${S1TEN[b]} (dB${k ? "" : ", " + T("trục phải")})</span>`).join("") +
    `<span>${mode === "mot" ? T("nét đứt đậm: năm {y}; chấm nhỏ: từng cảnh", {y: ST.nam}) : mode === "chong" ? T("nét đứt đậm: năm {y}; nét chấm: trung vị các năm", {y: ST.nam}) : T("nét đứt: S1 theo kỳ")}</span></div>`;
  const quy = e.quy ? e.quy.replace("descending", T("quỹ đạo giảm")).replace("ascending", T("quỹ đạo tăng")) : "";
  h += `<div class="cvnote">${KY.length === 12 ? T("Sentinel-1 RTC (Planetary Computer), trung vị dB theo tháng, đúng điểm ảnh 10 m") : T("Sentinel-1 RTC (Planetary Computer), trung vị dB theo kỳ 2 tháng, đúng điểm ảnh 10 m")}` + (quy ? ` · ${quy}` : "") +
    (e.xong ? (e.loi ? ` · <b style="color:#b42318">${e.loi === "khong_canh" ? T("không có cảnh S1 tại điểm") : T("lỗi đọc S1: ") + esc(e.loi)}</b>` : ` · ${T("{n} cảnh", {n: e.canh.filter(c => c.vv != null).length})}`)
      : ` · <b>${T("đang đọc S1 {a}/{b} cảnh…", {a: e.doc || 0, b: e.tong || "?"})}</b>`) + `</div>`;
  h += `<div class="cvnote">${T("Đọc nhanh: nước VV thấp (dưới −18 dB); lúa ngập đầu vụ VV thấp rồi tăng dần khi lúa lớn; đô thị VV cao, ít đổi theo mùa; rừng VH cao, ổn định.")}</div>`;
  return h;
}
var _cvCtl36 = cvCtl;
cvCtl = function () {
  _cvCtl36.apply(this, arguments);
  const lb = $("lbCurveS1"); if (lb) lb.hidden = CVS.kind === "nam";
  const cb = $("cbCurveS1"); if (cb) cb.checked = !!CVS.s1;
};
(function () {
  const cb = $("cbCurveS1"); if (!cb) return;
  cb.checked = !!CVS.s1;
  cb.onchange = () => { CVS.s1 = cb.checked; ls("laymau_hp_curve_v1", CVS); renderCurve(); if (typeof NT !== "undefined") { NT.xong.clear(); ntBatDau(); } };
})();

/* ---------- S2 trực tuyến trong vùng có dữ liệu sẵn: nhắc dùng lớp có sẵn ---------- */
var _s2ovUI36 = s2ovUI;
s2ovUI = function (div) {
  _s2ovUI36(div);
  const K = s2oKH(); if (!K || !K.pv || !K.pv.bl || !MAN || !MAN.s2d || s2oNg() !== "s2") return;
  const bl = K.pv.bl, tam = {lon: (bl[0] + bl[2]) / 2, lat: (bl[1] + bl[3]) / 2};
  v27Phu(s2dL0(), tam).then(co => {
    if (!co || div.querySelector(".s2o-nhac")) return;
    div.insertAdjacentHTML("beforeend", `<div class="mu sm s2o-nhac" style="color:#b54708">${T("Vùng này có sẵn ảnh S2 10 băng đã ghép (lớp “S2 10 băng”): nhanh hơn nhiều, vì S2 trực tuyến phải đọc từng cảnh từ AWS ở Mỹ (mỗi ô bản đồ 3 băng + lớp mây của mỗi cảnh).")}</div>`);
  }).catch(() => {});
};

/* ---------- bản 3.6.1: tự mở trang ngoài (mặc định Google Earth) khi sang điểm mới; phím t mở cho điểm đang xem ---------- */
/* Google Earth web gửi Cross-Origin-Opener-Policy: same-origin (đã kiểm 06.10.2026), nên trình duyệt cắt liên hệ giữa geoportal
   và tab Google Earth ngay khi trang đó tải: geoportal không thể chuyển tab cũ sang điểm mới, cũng không đóng được nó. Vì vậy mỗi
   điểm mở một tab mới; Ctrl+W đóng tab đó và trình duyệt quay về geoportal. Chỉ mở khi đổi điểm do thao tác của người dùng (phím,
   nhấp), để trình duyệt không chặn và không tự mở khi trang tải lại. */
var TM = Object.assign({k: ""}, ls("laymau_hp_tumo_v1") || {});
function tmUrl(p, k) {
  const L_ = CORE.links(p.lat, p.lon, {year: ST.nam, wayback: REL[relIdx] ? REL[relIdx][1] : null, lang: LANG, ten: p.id});
  const x = L_.find(l => l.k === (k || TM.k || "gearth")); return x ? x.url : null;
}
function tmMoDiem(p, k) {
  if (!p) return false;
  const u = tmUrl(p, k); if (!u) return false;
  window.open(u, "_blank", "noopener");                 // noopener: trang ngoài không điều khiển được tab geoportal
  TM.lan = (TM.lan || 0) + 1;
  if (TM.lan === 1) msg(T("Đã mở {s} ở tab mới. Xem xong bấm Ctrl+W để đóng tab và quay lại geoportal.", {s: T(LINK_LBL[k || TM.k || "gearth"], {y: ST.nam})}), "ok", 6000);
  return true;
}
function tmCoThaoTac() { const a = navigator.userActivation; return !a || a.isActive; }   // trình duyệt không có userActivation: coi như có
var _select361 = select;
select = function () {
  const truoc = ST.cur, r = _select361.apply(this, arguments);
  if (TM.k && ST.cur && ST.cur !== truoc && tmCoThaoTac()) tmMoDiem(cur());
  return r;
};
document.addEventListener("keydown", e => {         // phím t: mở trang đã chọn (hoặc Google Earth) cho điểm đang xem
  const t = e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (typeof LUOI !== "undefined" && LUOI.mo) return;
  if (e.key.toLowerCase() !== "t" || IDX.key.t || (typeof VG !== "undefined" && VG.mode)) return;
  const p = typeof vizPt === "function" ? vizPt() : cur(); if (!p) return;
  tmMoDiem(p); e.preventDefault(); e.stopImmediatePropagation();
}, true);
(function () {
  const s = $("tmMo"); if (!s) return;
  s.value = TM.k; s.onchange = () => { TM.k = s.value; ls("laymau_hp_tumo_v1", {k: TM.k}); };
})();
