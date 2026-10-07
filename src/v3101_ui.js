/* =============================== BẢN 3.10.1 =============================== */
/* ① Ô "đến mã" luôn ghi mã điểm đang xem (đổi theo khi sang điểm), gợi ý mã khi gõ, tìm theo một phần mã.
   ② Thang màu trên bản đồ cho mọi lớp đang hiện bằng bảng màu: chỉ số (S2 10 băng, S2 trực tuyến, Landsat), nhiệt độ Landsat,
      DEM (độ cao, độ dốc), lớp một băng có kéo giãn (PC, lớp mới của bản 3.11), và chú giải lớp phân loại.
   ③ POI Overture: ẩn / hiện từng nhóm chức năng (bấm vào chú giải), tên POI từ mức phóng 17, bấm vào POI hoặc nhà để xem thông tin.
   ④ Đường mùa vụ: bấm vào đồ thị để xem mọi giá trị tại kỳ đó (S2, S1, nhiệt độ); chọn đường S1 (VV, VH, VH−VV). */

/* ---------------- ① ô đến mã ---------------- */
function maDS() {
  const g = $("goto"); if (!g) return;
  let dl = $("dsMa"); if (!dl) { dl = document.createElement("datalist"); dl.id = "dsMa"; document.body.appendChild(dl); g.setAttribute("list", "dsMa"); }
  const ids = visible().map(p => p.id), k = ids.length + "|" + (ids[0] || "") + "|" + (ids[ids.length - 1] || "");
  if (dl.dataset.k === k) return;
  dl.dataset.k = k; dl.innerHTML = ids.slice(0, 3000).map(i => `<option value="${esc(i)}"></option>`).join("");
}
var _renderPoint3101 = renderPoint;
renderPoint = function () {
  const r = _renderPoint3101.apply(this, arguments);
  const g = $("goto"), p = cur(); if (g && document.activeElement !== g) g.value = p ? p.id : "";
  maDS();
  return r;
};
(function () {
  const g = $("goto"); if (!g) return;
  g.addEventListener("focus", () => { try { g.select(); } catch (e) { /* bỏ */ } });
  g.onchange = () => {
    const q = g.value.trim(); if (!q) return;
    if (ST.diem[q]) { select(q, true); return; }
    const ql = q.toLowerCase(), ds = visible().filter(p => String(p.id).toLowerCase().includes(ql));
    if (ds.length) { select(ds[0].id, true); if (ds.length > 1) msg(T("{n} mã chứa “{q}”: mở {id}", {n: ds.length, q, id: ds[0].id}), "ok", 3000); }
    else { msg(T("không có mã {id}", {id: q})); const p = cur(); g.value = p ? p.id : ""; }
  };
})();

/* ---------------- ② thang màu trên bản đồ ---------------- */
var TMAU = {an: ls("laymau_hp_tmau_v1") === "an"};
function tmauKG(L0) {                                // lớp một băng: [thấp, cao] giá trị thật của mã 1..255, log, đơn vị
  const kg = L0.keo_gian; if (!kg) return null;
  const pc_ = /^(ls)?pc\d+$/.test(L0.id), k = pc_ ? 100 : 1;
  return {lo: kg[0] / k, hi: kg[1] / k, log: !!L0.log, dv: L0.don_vi || ""};
}
function tmauDS() {                                  // các thang đang cần hiện
  const ds = [], on = k => typeof OVL !== "undefined" && OVL[k] && OVL[k].on && OVL[k].layer;
  const chi = (c, nguon, nm) => { if (c) ds.push({ten: `${c.ten} · ${nguon}`, mau: nm || c.mau || "viridis", lo: c.lo, hi: c.hi}); };
  try {
    if (on("s2d") && typeof S2V !== "undefined" && S2V.mode === "idx" && typeof csLay === "function") chi(csLay(S2V.chi) || csLay("NDVI"), T("S2 10 băng"));
    if (on("s2o") && typeof S2OV !== "undefined" && S2OV.mode === "idx" && typeof csLay === "function") { const c = csLay(S2OV.chi) || csLay("NDVI"); chi(c, T("S2 trực tuyến"), c && (c.mau || "ndvi")); }
    if (on("lsd") && typeof LSV !== "undefined") {
      if (LSV.mode === "idx" && typeof csLay === "function") chi(csLay(LSV.chi), "Landsat");
      else if (LSV.mode === "temp" && MAN && MAN.ls) { const t = MAN.ls.nhiet_xem || [15, 40]; ds.push({ten: T("nhiệt độ bề mặt") + " · Landsat", mau: "magma", lo: t[0], hi: t[1], dv: "°C"}); }
    }
    if (on("dem") && typeof DEMV !== "undefined") {
      if (DEMV.mode === "cao" || DEMV.mode === "caobong") { const [lo, hi] = demKhoang(); ds.push({ten: T("độ cao") + " · DEM", mau: "dia_hinh", lo, hi, dv: "m"}); }
      else if (DEMV.mode === "doc") ds.push({ten: T("độ dốc") + " · DEM", mau: "magma", lo: 0, hi: 30, dv: "°"});
    }
    Object.values(OVL || {}).forEach(o => {
      if (!o.on || !o.layer || !o.L0) return;
      const L0 = o.L0;
      if (L0.kieu === "xam") { const k = tmauKG(L0); ds.push(Object.assign({ten: lname(L0), mau: L0.bang_mau_lien_tuc || "xam"}, k || {lo: 1, hi: 255, tuong_doi: true})); }
      else if (L0.kieu === "lop" && L0.bang_mau) ds.push({ten: lname(L0), lop: Object.entries(L0.bang_mau).map(([k, c]) => [c, T((L0.ten_lop || {})[k] || k)])});
    });
  } catch (e) { /* bỏ */ }
  return ds;
}
function tmauNhan(v, d) {                            // số cho nhãn thang (log: đổi ngược)
  const x = d.log ? Math.pow(10, v) - 1 : v, a = Math.abs(x);
  const s = !isFinite(x) ? "-" : a < 1e-9 ? "0" : (+x.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3)).toString();   // gọn: 0, 16.4, 300, 0.35
  return s + (d.dv ? " " + d.dv : "");
}
function tmauHTML(ds) {
  return ds.map(d => {
    if (d.lop) return `<div class="tm-dong"><b>${esc(d.ten)}</b><div class="tm-lop">${d.lop.slice(0, 16).map(([c, t]) => `<span><i style="background:${c}"></i>${esc(t)}</span>`).join("")}${d.lop.length > 16 ? `<span class="mu">+${d.lop.length - 16}</span>` : ""}</div></div>`;
    const lt = lut2(d.mau), st = [];
    for (let i = 0; i <= 10; i++) { const c = lt[1 + Math.round(i / 10 * 254)] || [0, 0, 0]; st.push(`rgb(${c[0]},${c[1]},${c[2]}) ${i * 10}%`); }
    const mid = (d.lo + d.hi) / 2;
    return `<div class="tm-dong"><b>${esc(d.ten)}</b><div class="tm-thanh" style="background:linear-gradient(90deg,${st.join(",")})"></div>` +
      `<div class="tm-so"><span>${d.tuong_doi ? T("thấp") : tmauNhan(d.lo, d)}</span><span>${d.tuong_doi ? "" : tmauNhan(mid, d)}</span><span>${d.tuong_doi ? T("cao") : tmauNhan(d.hi, d)}</span></div>` +
      (d.log ? `<div class="mu">${T("thang log")}</div>` : "") + `</div>`;
  }).join("");
}
var TMAU_CTL = L.control({position: "bottomleft"});
TMAU_CTL.onAdd = function () {
  const d = L.DomUtil.create("div", "tmau"); d.id = "tmau"; d.setAttribute("data-noi18n", "");
  L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
  return d;
};
TMAU_CTL.addTo(map);
function tmauVe() {
  const d = $("tmau"); if (!d) return;
  const ds = tmauDS();
  d.hidden = !ds.length;
  if (!ds.length) { d.innerHTML = ""; return; }
  d.innerHTML = `<div class="tm-dau"><b>${T("Thang màu")}</b><button type="button" data-tm title="${esc(T("thu gọn / mở thang màu"))}">${TMAU.an ? "▸" : "▾"}</button></div>` +
    (TMAU.an ? "" : `<div class="tm-than">${tmauHTML(ds)}</div>`);
  d.querySelector("[data-tm]").onclick = () => { TMAU.an = !TMAU.an; ls("laymau_hp_tmau_v1", TMAU.an ? "an" : "mo"); tmauVe(); };
}
let tmauHen = null;
function tmauSau() { clearTimeout(tmauHen); tmauHen = setTimeout(tmauVe, 120); }
var _refreshOverlays3101 = refreshOverlays;
refreshOverlays = function () { const r = _refreshOverlays3101.apply(this, arguments); tmauSau(); return r; };
document.addEventListener("change", tmauSau, true);
map.on("layeradd layerremove", tmauSau);
if (typeof setLang === "function") { const _sl = setLang; setLang = function () { const r = _sl.apply(this, arguments); tmauSau(); return r; }; }
setTimeout(tmauVe, 0);

/* ---------------- ③ POI chi tiết: nhóm ẩn / hiện, tên, thông tin khi bấm ---------------- */
if (!Array.isArray(OV.an)) OV.an = [];
var _ovLuu3101 = ovLuu;
ovLuu = function () { _ovLuu3101(); const o = ls("laymau_hp_ov_v1") || {}; o.an = OV.an; ls("laymau_hp_ov_v1", o); };
var _ovVe3101 = ovVe;
ovVe = function (cv, t, kieu, s, ox, oy, z) {
  if (kieu !== "places") return _ovVe3101.apply(this, arguments);
  const ctx = cv.getContext("2d"), L_ = t.place; if (!L_) return;
  const ext = L_.ext, k = 256 * s / ext, bx0 = ox * ext / s, by0 = oy * ext / s, bx1 = (ox + 1) * ext / s, by1 = (oy + 1) * ext / s;
  const tx = v => (v - bx0) * k, ty = v => (v - by0) * k, R = z >= 17 ? 4.5 : z >= 16 ? 3 : 2.2, an = new Set(OV.an), nhan = [];
  ctx.lineWidth = 0.8; ctx.strokeStyle = "#fff";
  for (const F of mvtGiai(L_)) {
    if (F.t !== 1 || F.cx < bx0 - 8 || F.cx > bx1 + 8 || F.cy < by0 - 8 || F.cy > by1 + 8) continue;
    if (F.p.confidence != null && F.p.confidence < OV.tc) continue;
    const g = ovNhom(F.p); if (an.has(g)) continue;
    F.g.forEach(q => { const x = tx(q[0]), y = ty(q[1]); ctx.beginPath(); ctx.arc(x, y, R, 0, 2 * Math.PI); ctx.fillStyle = OVN_MAU[g]; ctx.fill(); ctx.stroke(); if (z >= 17) nhan.push([x, y, ovTen(F.p)]); });
  }
  if (nhan.length) {                                  // tên POI, bỏ tên chồng lên tên đã vẽ
    ctx.font = "11px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.fillStyle = "#1d2939";
    const da = [];
    nhan.forEach(([x, y, ten]) => {
      if (!ten) return; const t2 = ten.length > 22 ? ten.slice(0, 21) + "…" : ten, w = (ctx.measureText ? ctx.measureText(t2).width : 6 * t2.length) || 6 * t2.length;
      const b = [x + 6, y - 7, x + 6 + w, y + 7]; if (da.some(a => !(b[2] < a[0] || b[0] > a[2] || b[3] < a[1] || b[1] > a[3]))) return;
      da.push(b); ctx.strokeText(t2, x + 6, y); ctx.fillText(t2, x + 6, y);
    });
  }
};
function ovJ(v) { if (v == null) return null; if (typeof v !== "string") return v; try { return JSON.parse(v); } catch (e) { return v; } }
function ovTen(p) { if (p["@name"]) return String(p["@name"]); const n = ovJ(p.names); return n && n.primary ? String(n.primary) : p.name ? String(p.name) : ""; }
function ovLink(u) { u = String(u || ""); return /^https?:\/\//.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40))}</a>` : esc(u); }
function ovPopPOI(F) {
  const p = F.p, g = ovNhom(p), G = OVN.find(x => x.k === g), tx = ovJ(p.taxonomy), ad = ovJ(p.addresses), ph = ovJ(p.phones), we = ovJ(p.websites), so = ovJ(p.socials), em = ovJ(p.emails), br = ovJ(p.brand), src = ovJ(p.sources);
  const ds = v => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
  const dc = ds(ad).map(a => typeof a === "string" ? a : [a.freeform, a.locality, a.region].filter(Boolean).join(", ")).filter(Boolean);
  const rows = [
    [T("nhóm"), `<i class="ov-ch" style="background:${G.mau}"></i>${esc(T(G.ten))}`],
    [T("loại"), esc(p.basic_category || (tx && tx.primary) || "")],
    [T("phân loại"), tx && tx.hierarchy ? esc(tx.hierarchy.join(" › ")) : ""],
    [T("địa chỉ"), esc(dc.join("; "))],
    [T("điện thoại"), esc(ds(ph).join(", "))],
    ["web", ds(we).map(ovLink).join(" ")],
    [T("mạng xã hội"), ds(so).slice(0, 3).map(ovLink).join(" ")],
    ["email", esc(ds(em).join(", "))],
    [T("thương hiệu"), br ? esc((br.names && br.names.primary) || br.wikidata || "") : ""],
    [T("độ tin cậy"), p.confidence != null ? (+p.confidence).toFixed(2) : ""],
    [T("nguồn"), esc(ds(src).map(s => s.dataset || s).filter(x => typeof x === "string").filter((x, i, a) => a.indexOf(x) === i).join(", "))],
  ].filter(r => r[1]);
  return `<div class="ov-pop"><b>📍 ${esc(ovTen(p) || T("(không tên)"))}</b><table>${rows.map(([a, b]) => `<tr><td class="k">${a}</td><td>${b}</td></tr>`).join("")}</table><div class="mu">Overture ${esc(OV.ban)} · ${T("POI")}</div></div>`;
}
function ovPopNha(F, m2) {
  const p = F.p, rows = [
    [T("diện tích nền"), Math.round(m2) + " m²"], [T("loại"), esc([p.subtype, p.class].filter(Boolean).join(" · "))],
    [T("số tầng"), p.num_floors != null ? esc(p.num_floors) : ""], [T("chiều cao"), p.height != null ? (+p.height).toFixed(1) + " m" : ""],
    [T("mái"), esc(p.roof_shape || "")], [T("tên"), esc(ovTen(p))], [T("nguồn hình"), esc(p["@geometry_source"] || "")]].filter(r => r[1]);
  return `<div class="ov-pop"><b>🏠 ${T("Nhà")}</b> <i class="ov-ch" style="background:${ovCoNha(m2).mau}"></i><table>${rows.map(([a, b]) => `<tr><td class="k">${a}</td><td>${b}</td></tr>`).join("")}</table><div class="mu">Overture ${esc(OV.ban)}</div></div>`;
}
function ovTrongVong(x, y, r) { let c = false; for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
async function ovBam(e) {                           // bấm bản đồ khi lớp POI / nhà đang hiện: tìm đối tượng dưới con trỏ
  if (!(OV.lopPoi || OV.lopNha) || map.getZoom() < 14) return null;
  const z = 14, n = Math.pow(2, z), la = e.latlng.lat * Math.PI / 180, gx = (e.latlng.lng + 180) / 360 * n, gy = (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n;
  const tx = Math.floor(gx), ty = Math.floor(gy), sc = Math.pow(2, map.getZoom() - z);
  let html = null;
  if (OV.lopPoi) {
    const t = await ovO("places", z, tx, ty), L_ = t && t.place;
    if (L_) {
      const ext = L_.ext, fx = (gx - tx) * ext, fy = (gy - ty) * ext, tol = 9 * ext / (256 * sc), an = new Set(OV.an);
      let best = null, bd = tol;
      for (const F of mvtGiai(L_)) {
        if (F.t !== 1 || F.cx == null || (F.p.confidence != null && F.p.confidence < OV.tc) || an.has(ovNhom(F.p))) continue;
        const d = Math.hypot(F.cx - fx, F.cy - fy); if (d <= bd) { bd = d; best = F; }
      }
      if (best) html = ovPopPOI(best);
    }
  }
  if (!html && OV.lopNha) {
    const t = await ovO("buildings", z, tx, ty), L_ = t && t.building;
    if (L_) {
      const ext = L_.ext, fx = (gx - tx) * ext, fy = (gy - ty) * ext, mu = 40075016.686 * Math.cos(la) / n / ext;
      let best = null;
      for (const F of mvtGiai(L_)) {
        if (F.t !== 3 || fx < F.x0 || fx > F.x1 || fy < F.y0 || fy > F.y1) continue;
        let tr = false; F.g.forEach(r => { if (ovTrongVong(fx, fy, r)) tr = !tr; });
        if (tr && (!best || F.dt < best.dt)) best = F;
      }
      if (best) html = ovPopNha(best, best.dt * mu * mu);
    }
  }
  if (html) setTimeout(() => L.popup({maxWidth: 340, className: "ov-popup"}).setLatLng(e.latlng).setContent(html).openOn(map), 0);
  return html;
}
map.on("click", e => { ovBam(e).catch(() => {}); });
var _ovChuGiai3101 = ovChuGiai;
ovChuGiai = function () {
  _ovChuGiai3101.apply(this, arguments);
  const e = $("ovCG"); if (!e || !OV.poi) return;
  const an = new Set(OV.an), d = e.querySelectorAll(".ov-cg")[OV.nha ? 1 : 0]; if (!d) return;
  d.innerHTML = `📍 ${OVN.map(g => `<span data-ovg="${g.k}" class="${an.has(g.k) ? "tat" : ""}" title="${esc(T("bấm để ẩn / hiện nhóm này trên bản đồ"))}"><i style="background:${g.mau};border-radius:50%"></i>${T(g.ten)}</span>`).join("")}`;
  d.querySelectorAll("[data-ovg]").forEach(s => { s.onclick = () => {
    const k = s.dataset.ovg, i = OV.an.indexOf(k); if (i >= 0) OV.an.splice(i, 1); else OV.an.push(k);
    ovLuu(); ovChuGiai(); if (OV.lopPoi) OV.lopPoi.redraw(); }; });
};
ovChuGiai();

/* ---------------- ④ đường mùa vụ: chọn đường S1, bấm xem giá trị ---------------- */
if (!Array.isArray(CVS.s1b) || !CVS.s1b.length) CVS.s1b = ["VV", "VH"];
(function () {                                        // ô thả xuống chọn nhiều đường S1, cạnh ô + S1
  const lb = $("lbCurveS1"); if (!lb || $("s1Chon")) return;
  lb.insertAdjacentHTML("afterend", `<details id="s1Chon" class="dd" data-noi18n><summary title=""></summary><div class="dd-ds">` +
    ["VV", "VH", "RT"].map(b => `<label><input type="checkbox" id="s1c_${b}" value="${b}"><i style="background:${S1MAU[b]}"></i>${S1TEN[b]}</label>`).join("") +
    `<div class="mu sm" data-gc></div></div></details>`);
  const d = $("s1Chon");
  d.querySelectorAll("input").forEach(c => { c.onchange = () => {
    const ch = [...d.querySelectorAll("input:checked")].map(x => x.value);
    if (!ch.length) { c.checked = true; return; }               // giữ ít nhất một đường; tắt hẳn S1 bằng ô + S1
    CVS.s1b = ch; ls("laymau_hp_curve_v1", CVS); s1ChonUI(); renderCurve(); }; });
  s1ChonUI();
})();
function s1ChonUI() {
  const d = $("s1Chon"); if (!d) return;
  d.hidden = CVS.kind === "nam" || !CVS.s1;
  d.querySelectorAll("input").forEach(c => { c.checked = CVS.s1b.includes(c.value); });
  d.querySelector("summary").textContent = CVS.s1b.map(b => S1TEN[b]).join(", ") + " ▾";
  d.querySelector("summary").title = T("chọn đường S1 hiện trên đồ thị (một hoặc nhiều)");
  d.querySelector("[data-gc]").textContent = T("VH−VV: tỉ số phân cực (dB), cao khi thực vật dày");
}
var _cvCtl3101 = cvCtl;
cvCtl = function () { _cvCtl3101.apply(this, arguments); s1ChonUI(); };
(function () { const cb = $("cbCurveS1"); if (!cb) return; const f = cb.onchange; cb.onchange = function () { const r = f && f.apply(this, arguments); s1ChonUI(); return r; }; })();

function cvGiaTri(cv, mode, j, nky, yrs) {          // các dòng giá trị tại vị trí j của đồ thị
  const out = [], y = mode === "chuoi" ? yrs[Math.floor(j / nky)] : ST.nam, i = mode === "chuoi" ? j % nky : j, f2 = v => v == null || !isFinite(v) ? null : v;
  const feats = mode === "mot" ? (CVS.feat === "NDVI" || CVS.feat === "MNDWI" ? ["NDVI", "MNDWI"] : [CVS.feat]) : [CVS.feat];
  if (mode === "chong") {
    yrs.forEach(yy => { const v = f2(((cv.ys[yy] || {})[CVS.feat] || [])[i]); if (v != null) out.push({mau: cvCol(CVS.feat), ten: `${CVS.feat} ${yy}`, gt: v.toFixed(3), dam: yy === ST.nam}); });
  } else feats.forEach(f => { const v = f2(((cv.ys[y] || {})[f] || [])[i]); out.push({mau: cvCol(f), ten: `${f} ${y}`, gt: v == null ? "–" : v.toFixed(3), dam: true}); });
  if (mode !== "chuoi") feats.forEach(f => { const S = CORE.seasonStats(cv.ys, f, nky), m = S.med[i]; if (m != null) out.push({mau: "#98a2b3", ten: `${f} ${T("trung vị các năm")}`, gt: m.toFixed(3)}); });
  const so = ((cv.ys[y] || {}).SO_CANH || [])[i]; if (so != null) out.push({mau: "#667085", ten: T("cảnh S2 quang đãng"), gt: String(so)});
  if (cv.s1) { const N = ((nky === 12 ? cv.s1.nam12 : cv.s1.nam) || {})[y]; if (N) s1Bang().forEach(b => { const v = f2((N[b] || [])[i]); out.push({mau: S1MAU[b], ten: `S1 ${S1TEN[b]} ${y}`, gt: v == null ? "–" : v.toFixed(1) + " dB" + (N.n ? ` (${N.n[i]} ${T("cảnh")})` : "")}); }); }
  if (cv.lst) { const N = ((nky === 12 ? cv.lst.nam12 : cv.lst.nam) || {})[y]; if (N) { const v = f2(N.T[i]); out.push({mau: LST.MAU, ten: `${T("nhiệt độ bề mặt")} ${y}`, gt: v == null ? "–" : v.toFixed(1) + " °C" + ` (${N.n[i]} ${T("cảnh")})`}); } }
  return {tieu_de: `${kyTen(i)}${mode === "chuoi" || mode === "mot" ? " · " + y : ""}`, dong: out};
}
function cvBam(ev) {                                 // bấm vào đồ thị mùa vụ: hộp giá trị tại kỳ gần nhất, vạch dọc
  const svg = ev.target.closest && ev.target.closest("svg[data-cv]"); if (!svg || CVS.kind === "nam") return;
  const box = svg.parentElement; if (!box || !lastCV) return;
  const [mode, W, L0, R0, n, nky, T0, yd] = svg.dataset.cv.split("|").map((v, k) => k ? +v : v);
  const rc = svg.getBoundingClientRect(), sx = rc.width ? (ev.clientX - rc.left) * W / rc.width : 0;
  const j = Math.max(0, Math.min(n - 1, Math.round((sx - L0) / ((W - L0 - R0) / Math.max(1, n - 1)))));
  const yrs = Object.keys(lastCV.ys).map(Number).sort((a, b) => a - b), G = cvGiaTri(lastCV, mode, j, nky, yrs), X = L0 + (n > 1 ? j * (W - L0 - R0) / (n - 1) : 0);
  svg.querySelectorAll(".cv-doc").forEach(e => e.remove());
  svg.insertAdjacentHTML("beforeend", `<line class="cv-doc" x1="${X.toFixed(1)}" x2="${X.toFixed(1)}" y1="${T0}" y2="${yd}" stroke="#101828" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>`);
  box.querySelectorAll(".cvtip").forEach(e => e.remove());
  if (getComputedStyle(box).position === "static") box.style.position = "relative";
  const tip = document.createElement("div"); tip.className = "cvtip"; tip.setAttribute("data-noi18n", "");
  tip.innerHTML = `<div class="cvtip-dau"><b>${esc(G.tieu_de)}</b><button type="button" title="${esc(T("đóng"))}">×</button></div>` +
    (G.dong.length ? G.dong.map(r => `<div class="${r.dam ? "dam" : ""}"><i style="background:${r.mau}"></i>${esc(r.ten)}: <b>${esc(r.gt)}</b></div>`).join("") : `<div class="mu">${T("không có giá trị")}</div>`);
  const bx = box.getBoundingClientRect(), left = (ev.clientX - bx.left) + 12;
  tip.style.left = Math.max(0, Math.min(left, (bx.width || 400) - 230)) + "px"; tip.style.top = Math.max(0, (ev.clientY - bx.top) - 10) + "px";
  box.appendChild(tip);
  tip.querySelector("button").onclick = e => { e.stopPropagation(); tip.remove(); svg.querySelectorAll(".cv-doc").forEach(x => x.remove()); };
}
["curve", "curveBig"].forEach(id => { const e = $(id); if (e) e.addEventListener("click", cvBam); });
