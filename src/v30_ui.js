/* =============================== BẢN 3.0: LANDSAT 1987-2026, NGUỒN ẢNH QUANG HỌC THỨ HAI =============================== */
/* Biến cấp tệp khai báo bằng var: các hàm ở đây (qhNguon...) có thể được gọi từ phần nạp trước (xh_ui) khi tệp này chưa chạy. */
/* Manifest có mục `ls` (ảnh mùa khô 30 m, 10 băng int16: BLUE..SWIR2 × 10000, TEMP °C × 100, NOBS, NGUON, CAMBIEN; nodata
   -32768), `lspc` (hệ số PCA phổ chuỗi năm) và các lớp mang nguon = "ls" (lstc, lspc1..5, lsg, lsgb). Trang thêm:
   ① lớp Landsat 6 băng tính trong trình duyệt (tổ hợp màu theo TÊN băng, chỉ số dùng được với 6 băng, nhiệt độ bề mặt, nguồn
   điểm ảnh, cảm biến), chọn năm 1987-2026; ② dải ảnh theo năm; ③ giá trị tại điểm và đồ thị theo năm (băng, chỉ số, PC tính
   đúng từ phản xạ, embedding, nhiệt độ); ④ nguồn ảnh cho phát hiện thay đổi, IR-MAD và xu hướng (qhNguon). */
function coLS() { return !!(MAN && MAN.ls && (MAN.ls.nam || []).length); }
function lsBang() { return (MAN && MAN.ls && MAN.ls.bang) || ["B2", "B3", "B4", "B8", "B11", "B12"]; }       // tên tương đương S2
function lsTenBang() { return (MAN && MAN.ls && MAN.ls.ten_bang) || ["BLUE", "GREEN", "RED", "NIR", "SWIR1", "SWIR2"]; }
function lsNhan(i) { return `${lsTenBang()[i]} (${lsBang()[i]})`; }
function lsNam() { return coLS() ? MAN.ls.nam.slice().sort((a, b) => a - b) : []; }
function lsdL0() {
  if (!coLS()) return null;
  return {id: "lsd", ten: "Landsat 6 băng: tổ hợp màu, chỉ số, nhiệt độ, nguồn điểm ảnh (tính trong trình duyệt)", kieu: "lsd", nguon: "ls",
          duong_dan: MAN.ls.duong_dan, nam: lsNam()};
}
function lsLayers() { return MAN ? MAN.layers.filter(l => l.nguon === "ls") : []; }
function lsEmbLayers() { return lsLayers().filter(l => l.kieu === "rgb" && l.phep_chieu); }
var LSV = Object.assign({mode: "rgb", pre: "tn", r: "B4", g: "B3", b: "B2", chi: "NDVI", gain: 1}, ls("laymau_hp_lsv_v1") || {});
var LS_PRE = {tn: ["B4", "B3", "B2"], hn: ["B8", "B4", "B3"], sw: ["B11", "B8", "B4"], sw2: ["B12", "B11", "B4"], nu: ["B12", "B8", "B3"]};
var LS_PRE_TEN = {tn: "màu thật (đỏ, lục, lam)", hn: "hồng ngoại: NIR, đỏ, lục (thực vật đỏ)", sw: "SWIR1, NIR, đỏ (xây dựng hồng tím)",
                    sw2: "SWIR2, SWIR1, đỏ", nu: "SWIR2, NIR, lục", tu: "tuỳ chọn R-G-B"};
var LS_NGUON = {0: ["mùa khô, ≥ 2 quan sát", "#1a9641"], 1: ["nới tháng 10 đến 5, ≥ 2 quan sát", "#a6d96a"], 2: ["một quan sát", "#fdae61"],
                  3: ["mượn mùa khô năm trước, sau", "#d7191c"], 9: ["ảnh tổng hợp có sẵn", "#9e9e9e"]};
var LS_CB = [[1, "TM"], [2, "ETM+"], [4, "OLI"], [8, "OLI-2"]];
var LS_CB_MAU = {1: "#e41a1c", 2: "#ff7f00", 3: "#984ea3", 4: "#377eb8", 6: "#4daf4a", 8: "#a65628", 12: "#f781bf"};
function lsCbTen(v) { const t = LS_CB.filter(([b]) => v & b).map(q => q[1]); return t.length ? t.join(" + ") : "-"; }
var LS_ND = -32768;
function lsKeo() {
  const k = (MAN && MAN.ls && MAN.ls.keo_gian) || {};
  return {lo: k.lo || [100, 100, 100, 100, 100, 100], hi: k.hi || [2500, 2500, 2500, 4500, 4000, 3500]};
}
var LS_CS = {};
function lsCsLay(id) {                     // chỉ số biên dịch theo 6 băng Landsat; công thức cần băng S2 khác (B5, B6, B7, B8A) thì null
  const d = typeof csDinh === "function" ? csDinh(id) : null; if (!d) return null;
  const bangs = lsBang(), key = id + "|" + d.bt + "|" + bangs.join();
  if (!(key in LS_CS)) {
    try { const f = CORE.bieuThuc(d.bt, bangs, typeof CHISO_IDB !== "undefined" && CHISO_IDB ? CHISO_IDB.hang : {});
      LS_CS[key] = Object.assign({}, d, {f, kh: d.lo != null ? [d.lo, d.hi] : CORE.khoangMau(f, bangs)});
    } catch (e) { LS_CS[key] = null; }
  }
  const c = LS_CS[key]; if (!c) return null;
  const k = ST.chiso.khoang[id];
  return Object.assign({}, c, {lo: k ? k[0] : c.kh[0], hi: k ? k[1] : c.kh[1], mau: c.mau || "viridis"});
}
function lsCsDS() { return (typeof csDS === "function" ? csDS() : []).map(c => lsCsLay(c.id)).filter(Boolean); }
function lsNeed() {
  const b = lsBang(), m = LSV.mode;
  if (m === "idx") { const c = lsCsLay(LSV.chi) || lsCsLay("NDVI"); return {bands: c && c.f.chi.length ? c.f.chi.slice() : [2, 3], c}; }
  if (m === "temp") return {bands: [6]};
  if (m === "nguon") return {bands: [8]};
  if (m === "cb") return {bands: [9]};
  const t = LSV.pre === "tu" ? [LSV.r, LSV.g, LSV.b] : (LS_PRE[LSV.pre] || LS_PRE.tn);
  return {bands: t.map(n => Math.max(0, b.indexOf(n)))};
}
var lsMsgT = 0;
function lsMsg(t) { const e = document.querySelector("[data-lsv] [data-msg]"); if (e) e.textContent = t; clearTimeout(lsMsgT); if (t) lsMsgT = setTimeout(() => { if (e) e.textContent = ""; }, 6000); }
function lsHex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
/* ảnh RGBA theo LSV (thuần tính toán, kiểm thử được); R: kết quả readUTM trên ảnh ls 10 băng */
function lsdRGBA(R, w, h, need) {
  const out = new Uint8ClampedArray(w * h * 4), K = lsKeo(), g = Math.max(0.1, +LSV.gain || 1), nb = R.nb, bs = need.bands, m = LSV.mode;
  const cs = m === "idx" ? need.c : null, lt = lut2(m === "idx" ? (cs ? cs.mau : "ndvi") : m === "temp" ? "magma" : "xam");
  const buf = new Array(6).fill(0), tlo = (MAN.ls.nhiet_xem || [15, 40])[0], thi = (MAN.ls.nhiet_xem || [15, 40])[1];
  for (let k = 0; k < w * h; k++) {
    const j = R.idx[k]; if (j < 0) continue;
    const o = k * 4;
    if (m === "nguon" || m === "cb") {
      const v = R.src[j * nb]; if (v === LS_ND || (m === "cb" && !v)) continue;
      const hx = m === "nguon" ? (LS_NGUON[v] || [0, "#000000"])[1] : (LS_CB_MAU[v] || "#555555"), c = lsHex(hx);
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; continue;
    }
    let z = false; for (let q = 0; q < nb; q++) if (R.src[j * nb + q] === LS_ND) { z = true; break; }
    if (z) continue;
    if (m === "idx") {
      for (let q = 0; q < bs.length; q++) buf[bs[q]] = R.src[j * nb + q] / 10000;
      const x = cs && cs.f ? cs.f(buf) : null; if (x == null) continue;
      const t = Math.max(0, Math.min(1, (x - cs.lo) / (cs.hi - cs.lo))), c = lt[1 + Math.round(t * 254)];
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; continue;
    }
    if (m === "temp") {
      const t = Math.max(0, Math.min(1, (R.src[j * nb] / 100 - tlo) / (thi - tlo))), c = lt[1 + Math.round(t * 254)];
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; continue;
    }
    for (let q = 0; q < 3; q++) { const b = bs[q]; out[o + q] = Math.round(255 * Math.max(0, Math.min(1, (R.src[j * nb + q] - K.lo[b]) / ((K.hi[b] - K.lo[b]) / g)))); }
    out[o + 3] = 255;
  }
  return out;
}
async function lsdVe(url, bb, w, h, z, canvas) {
  const need = lsNeed();
  if (LSV.mode === "idx" && !need.c) { lsMsg(T("chỉ số này cần băng mà Landsat không có")); return null; }
  const R = await readUTM(url, bb, w, h, 0, need.bands);
  if (!R) return null;
  const px = lsdRGBA(R, w, h, need);
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (ctx) { const img = ctx.createImageData(w, h); img.data.set(px); ctx.putImageData(img, 0, 0); }
  return px;
}
var LSDLayer = L.GridLayer.extend({
  initialize(url, opts) { this._url = url; L.GridLayer.prototype.initialize.call(this, opts); },
  createTile(coords, done) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    lsdVe(this._url, CORE.tileBbox(coords.z, coords.x, coords.y), 256, 256, coords.z, c).then(() => done(null, c))
      .catch(e => { this._err = (this._err || 0) + 1; if (this._err === 3) olMsg(T("không đọc được {l}: {e}", {l: lname(lsdL0()), e: e.message || e})); done(null, c); });
    return c;
  },
});
function lsvLuu() {
  ls("laymau_hp_lsv_v1", LSV);
  if (OVL.lsd && OVL.lsd.layer && OVL.lsd.layer.redraw) OVL.lsd.layer.redraw();
  if ($("selStrip").value === "lsd") renderStrip();
  lsChuGiai();
}
function lsChuGiai() {
  const e = document.querySelector("[data-lsv] [data-cg]"); if (!e) return;
  const m = LSV.mode;
  e.innerHTML = m === "nguon" ? Object.entries(LS_NGUON).map(([k, [t, c]]) => `<span class="sw" style="background:${c}"></span> ${k}: ${esc(T(t))}`).join("<br>")
    : m === "cb" ? Object.entries(LS_CB_MAU).map(([k, c]) => `<span class="sw" style="background:${c}"></span> ${esc(lsCbTen(+k))}`).join(" · ")
    : m === "temp" ? `${T("nhiệt độ bề mặt mùa khô")}: ${(MAN.ls.nhiet_xem || [15, 40]).join(" .. ")} °C`
    : m === "idx" && !lsCsLay(LSV.chi) ? T("chỉ số này cần băng mà Landsat không có") : "";
}
function lsvUI(div) {
  const opt = (a, sel) => a.map(([v, t]) => `<option value="${esc(String(v))}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`).join("");
  const bo = lsBang().map((b, i) => [b, lsNhan(i)]), ys = lsNam();
  const chi = lsCsDS().map(c => [c.id, c.ten]);
  div.setAttribute("data-noi18n", "");
  div.innerHTML = `<div class="row sm"><select data-k="mode">${opt([["rgb", T("tổ hợp màu")], ["idx", T("chỉ số")], ["temp", T("nhiệt độ bề mặt")],
      ["nguon", T("nguồn điểm ảnh")], ["cb", T("cảm biến")]], LSV.mode)}</select>
    <select data-k="pre" data-show="rgb">${opt(Object.keys(LS_PRE_TEN).map(k => [k, T(LS_PRE_TEN[k])]), LSV.pre)}</select>
    <select data-k="chi" data-show="idx">${opt(chi.concat([["__them", T("＋ chỉ số khác…")]]), LSV.chi)}</select></div>
    <div class="row sm" data-show="tu">R <select data-k="r">${opt(bo, LSV.r)}</select> G <select data-k="g">${opt(bo, LSV.g)}</select> B <select data-k="b">${opt(bo, LSV.b)}</select></div>
    <div class="row sm">${T("năm Landsat")} <select data-k="nam">${opt(ys.map(y => [y, y]), ys.includes(ST.nam) ? ST.nam : "")}${ys.includes(ST.nam) ? "" : `<option value="" selected>${ST.nam}: ${T("không có")}</option>`}</select>
      <span data-show="rgb">${T("tương phản")} <input type="range" data-k="gain" min="0.5" max="3" step="0.1" value="${LSV.gain}"></span> <span class="mu" data-msg></span></div>
    <div class="mu sm" data-cg></div>
    <div class="mu sm">${T("ảnh tổng hợp mùa khô 30 m, chuẩn hoá tương đối giữa các năm; kéo giãn cố định, giống nhau mọi năm")}</div>`;
  const upd = () => {
    const m = LSV.mode, show = {rgb: m === "rgb", idx: m === "idx", tu: m === "rgb" && LSV.pre === "tu"};
    div.querySelectorAll("[data-show]").forEach(e => { e.hidden = !e.dataset.show.split(" ").some(k => show[k]); });
  };
  div.querySelectorAll("[data-k]").forEach(e => {
    e.addEventListener("change", () => {
      const k = e.dataset.k;
      if (k === "nam") { if (e.value) setYear(+e.value); return; }
      if (k === "chi" && e.value === "__them") { e.value = LSV.chi; if (typeof csMo === "function") csMo(); return; }
      LSV[k] = e.type === "range" ? +e.value : e.value;
      if (k === "pre" && LS_PRE[LSV.pre]) [LSV.r, LSV.g, LSV.b] = LS_PRE[LSV.pre];
      if (/^(r|g|b)$/.test(k)) { LSV.pre = "tu"; const sp = div.querySelector('[data-k="pre"]'); if (sp) sp.value = "tu"; }
      upd(); lsMsg(""); lsvLuu();
    });
  });
  upd(); lsChuGiai();
}
async function renderStripLSD(L0, p, bb, ys, tok) {
  const box = $("strip"), WS = typeof stripCo === "function" ? stripCo() : 97, half = (bb[2] - bb[0]) / 2;
  for (const y of ys) {
    const it = document.createElement("div"); it.className = "it" + (y === ST.nam ? " cur" : "");
    const cv = document.createElement("canvas"); cv.width = cv.height = WS;
    it.appendChild(cv);
    it.insertAdjacentHTML("beforeend", `<span class="lb">${y}</span>` + (p.nhan[y] ? `<span class="lc" style="background:${color(p.nhan[y])}"></span>` : ""));
    it.onclick = () => setYear(y);
    box.appendChild(it);
    if (!L0.nam.includes(y)) { const g = cv.getContext && cv.getContext("2d"); if (g) { g.fillStyle = "#555"; g.fillText(T("không có"), WS / 2 - 22, WS / 2); } continue; }
    lsdVe(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), bb, WS, WS, 18, cv).then(() => {
      if (tok !== stripTok) return;
      if (typeof stripDanh === "function") stripDanh(cv, WS, half);
    }).catch(e => { if (tok === stripTok) $("stripmsg").textContent = T("không đọc được: ") + (e.message || e); });
  }
}

/* ---------------- ③ giá trị tại điểm, mọi năm (đọc một điểm ảnh của ảnh 10 băng, song song có giới hạn) ---------------- */
var LSPT = {};
async function lsAt(p) {
  if (!coLS()) return {};
  const key = p.x + "," + p.y; if (LSPT[key]) return LSPT[key];
  const out = {}, ys = lsNam();
  let k = 0;
  const mot = async () => {
    while (k < ys.length) {
      const y = ys[k++];
      try {
        const t = await tiffOf(CORE.dataUrl(CFG, MAN.ls.duong_dan.replace("{y}", y)));
        const I = t._imgs[0], ox = t._bb[0], oy = t._bb[3];
        const col = Math.floor((p.x - ox) / I.rx), row = Math.floor((oy - p.y) / I.ry);
        if (col < 0 || row < 0 || col >= I.w || row >= I.h) continue;
        const a = await I.im.readRasters({window: [col, row, col + 1, row + 1], interleave: true});
        const v = Array.from(a.slice(0, t._n));
        if (v[0] === LS_ND) continue;
        out[y] = {sr: v.slice(0, 6), temp: v[6] === LS_ND ? null : v[6] / 100, nobs: v[7], nguon: v[8], cb: v[9]};
      } catch (e) { /* bỏ năm lỗi */ }
    }
  };
  await Promise.all(Array.from({length: 6}, mot));
  return (LSPT[key] = out);
}
function lsPC(sr) {                         // PC tính ĐÚNG từ phản xạ theo hệ số chung trong manifest (không qua ảnh 8 bit)
  const P = MAN.lspc; if (!P || !sr) return null;
  const x = sr.map(v => v / 10000), nd = (a, b) => { const s = x[a] + x[b]; return Math.abs(s) > 1e-6 ? Math.max(-1, Math.min(1, (x[a] - x[b]) / s)) : 0; };
  const f = x.concat([nd(3, 2), nd(1, 4), nd(4, 3)]);                                  // NDVI, MNDWI, NDBI như ls_pca.dac_trung
  const z = f.map((v, i) => (v - P.mean[i]) / P.std[i]);
  return P.W.slice(0, P.k).map(w => w.reduce((s, wi, i) => s + wi * z[i], 0));
}
async function lsEmbAt(p) {                  // thành phần embedding Landsat theo năm, đổi từ 8 bit theo phép chiếu
  const out = {}, names = [];
  for (const L0 of lsEmbLayers()) {
    const m = /thành phần ([\d-]+)/.exec(L0.ten || ""), tp = m ? m[1].split("-").map(Number) : [1, 2, 3], pj = await embPJ(L0), nb = names.length;
    tp.forEach(k => names.push("Landsat emb " + k));
    for (const y of L0.nam) {
      const v = await pxAt(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), p); if (!v || !v[0]) continue;
      const row = out[y] = out[y] || [];
      tp.forEach((k, q) => { row[nb + q] = pj && pj.lo ? pj.lo[k - 1] + (v[q] - 1) / 254 * (pj.hi[k - 1] - pj.lo[k - 1]) : v[q]; });
    }
  }
  Object.values(out).forEach(r => { for (let i = 0; i < names.length; i++) if (r[i] === undefined) r[i] = null; });
  return {names, ys: out};
}
NHOM_NAM.push(
  {id: "ls", ten: "Landsat: 6 băng (phản xạ × 10000, mùa khô 1987-2026)", co: coLS},
  {id: "lsidx", ten: "Landsat: chỉ số (danh sách đang dùng, chỉ số cần 6 băng)", co: coLS},
  {id: "lspc", ten: "Landsat: PC của PCA phổ chuỗi năm (tính từ phản xạ)", co: () => coLS() && !!MAN.lspc},
  {id: "lsemb", ten: "Landsat: embedding (thành phần chính)", co: () => lsEmbLayers().length > 0},
  {id: "lst", ten: "Landsat: nhiệt độ bề mặt mùa khô (°C)", co: coLS});
var _annualFor30 = annualFor;
annualFor = async function (p, grp) {
  if (!/^(ls|lsidx|lspc|lsemb|lst)$/.test(grp)) return _annualFor30(p, grp);
  const key = p.x + "," + p.y + "|" + grp + (grp === "lsidx" ? "|" + ST.chiso.dung.join() + "|" + ST.chiso.tu.map(t => t.bt).join() : "");
  if (AN_CACHE[key]) return AN_CACHE[key];
  let names = [], ys = {}, don_vi = "", nguon = "";
  if (grp === "lsemb") { const E = await lsEmbAt(p); names = E.names; ys = E.ys; don_vi = T("đơn vị phép chiếu"); nguon = T("ảnh chiếu 8 bit của embedding Landsat"); }
  else {
    const A = await lsAt(p), DS = grp === "lsidx" ? lsCsDS() : null;
    names = grp === "ls" ? lsTenBang().slice() : grp === "lsidx" ? DS.map(c => c.ten) : grp === "lspc" ? Array.from({length: MAN.lspc.k}, (_, i) => "PC" + (i + 1)) : [T("nhiệt độ (°C)")];
    Object.entries(A).forEach(([y, d]) => {
      ys[y] = grp === "ls" ? d.sr : grp === "lsidx" ? DS.map(c => c.f(d.sr.map(v => v / 10000))) : grp === "lspc" ? lsPC(d.sr) : [d.temp];
    });
    don_vi = grp === "ls" ? "DN" : grp === "lsidx" ? T("không thứ nguyên") : grp === "lspc" ? T("đơn vị PC") : "°C";
    nguon = grp === "lspc" ? T("PC tính từ phản xạ theo hệ số chung trong manifest") : T("ảnh Landsat mùa khô, đã chuẩn hoá tương đối");
  }
  const out = {names, ys, don_vi, nguon, lop: await lopAt(p)};
  return (AN_CACHE[key] = out);
};
/* các dòng Landsat của bảng giá trị tại điểm (năm đang xem) */
async function lsGiaTri(p, y) {
  if (!coLS()) return [];
  if (!lsNam().includes(y)) return [[`Landsat ${y}`, `<span class="mu">${T("không có năm {y}", {y})}</span>`]];
  const d = (await lsAt(p))[y];
  if (!d) return [[`Landsat ${y}`, `<span class="mu">${T("không có dữ liệu")}</span>`]];
  const ng = LS_NGUON[d.nguon], rows = [[`Landsat ${y}`, lsTenBang().map((b, i) => `${b} ${d.sr[i]}`).join(" · ") +
    (d.temp != null ? ` · ${T("nhiệt độ")} <b>${d.temp.toFixed(1)} °C</b>` : "")],
    [T("Landsat: nguồn điểm ảnh"), `<span class="sw" style="background:${ng ? ng[1] : "#000"}"></span> ${esc(ng ? T(ng[0]) : String(d.nguon))} · ${T("cảm biến")} ${esc(lsCbTen(d.cb))} · NOBS ${d.nobs}`]];
  const ds = lsCsDS(); if (ds.length) rows.push([T("Landsat: chỉ số {y}", {y}), ds.map(c => `${esc(c.ten)} <b>${gtSo(c.f(d.sr.map(v => v / 10000)))}</b>`).join(" · ")]);
  const pc = lsPC(d.sr); if (pc) rows.push([T("Landsat: PC {y}", {y}), pc.map((v, i) => `PC${i + 1} <b>${gtSo(v)}</b>`).join(" · ")]);
  return rows;
}
var _giaTriTai30 = giaTriTai;
giaTriTai = async function (ll) {
  const r = await _giaTriTai30(ll);
  if (!coLS()) return r;
  const p = CORE.newPoint("⌖", ll.lng, ll.lat, {bo: ""});
  try { return r.concat(await lsGiaTri(p, ST.nam)); } catch (e) { return r; }
};

/* ---------------- ④ nguồn ảnh cho phát hiện thay đổi, IR-MAD, xu hướng ---------------- */
var NGUON_CD = ls("laymau_hp_cdnguon_v1") || "s2";
function qhNguon(n) {
  n = n || NGUON_CD || "s2";
  if (n === "ls" && coLS()) {
    const pcL = q => MAN.layers.find(l => l.id === "lspc" + q);
    return {id: "ls", ten: "Landsat", man: MAN.ls, bang: lsBang(), tenBang: lsTenBang(), nb: 6, res: 30, nd: LS_ND,
            pc: MAN.lspc ? {k: MAN.lspc.k, duong_dan: MAN.lspc.duong_dan, nam: MAN.ls.nam, he_so_nhan: MAN.lspc.he_so_nhan || 100, xam: pcL} : null,
            emb: lsEmbLayers(), cs: c => (c ? lsCsLay(c.id) : null)};
  }
  const pcL = q => MAN.layers.find(l => l.id === "pc" + q);
  return {id: "s2", ten: "Sentinel-2", man: MAN && MAN.s2d, bang: s2Bang(), tenBang: s2Bang(), nb: s2Bang().length, res: 10, nd: 0,
          pc: MAN && MAN.pc ? {k: MAN.pc.k, duong_dan: MAN.pc.duong_dan, nam: MAN.pc.nam, he_so_nhan: (MAN.pc.he_so && MAN.pc.he_so.he_so_nhan) || 100, xam: pcL} : null,
          emb: typeof embLayers === "function" ? embLayers() : [], cs: c => c};
}
function qhCanAnh() { const q = qhNguon(); return q.id === "ls" ? T("cần ảnh Landsat (ls) của bộ dữ liệu") : T("cần ảnh S2 10 băng (s2d) của bộ dữ liệu"); }
function cdNguonUI() {                       // ô chọn nguồn ảnh trong bảng phát hiện thay đổi (chỉ hiện khi có Landsat)
  const w = cd$("cdNguonW"), s = cd$("cdNguonAnh"); if (!w || !s) return;
  w.hidden = !coLS();
  if (!coLS() && NGUON_CD === "ls") NGUON_CD = "s2";
  const ys = lsNam(), s2 = MAN && MAN.s2d ? MAN.s2d.nam.slice().sort((a, b) => a - b) : [];
  s.innerHTML = (s2.length ? `<option value="s2">Sentinel-2 (${s2[0]}-${s2[s2.length - 1]}, 10 m)</option>` : "") +
                (ys.length ? `<option value="ls">Landsat (${ys[0]}-${ys[ys.length - 1]}, 30 m)</option>` : "");
  s.value = NGUON_CD;
  const lc = document.querySelector('#cdP [data-cd="ctx"]');
  if (lc && lc.parentElement) { const t = [...lc.parentElement.childNodes].find(n => n.nodeType === 3); if (t) t.textContent = " " + (NGUON_CD === "ls" ? T("CTX trung bình 15 × 15 (6 băng)") : T("CTX trung bình 15 × 15 (10 băng)")); }
  const lb = document.querySelector('#cdP [data-cd="s2"]');
  if (lb && lb.parentElement) { const t = [...lb.parentElement.childNodes].find(n => n.nodeType === 3); if (t) t.textContent = " " + (NGUON_CD === "ls" ? T("Landsat 6 băng (phản xạ)") : T("S2 10 băng (phản xạ)")); }
}
(function () {
  const s = typeof cd$ === "function" ? cd$("cdNguonAnh") : null; if (!s) return;
  s.addEventListener("change", () => {
    NGUON_CD = s.value; ls("laymau_hp_cdnguon_v1", NGUON_CD);
    const sa = cd$("cdA"); sa.dataset.k = "";                        // dựng lại danh sách năm theo nguồn
    if (CD.hien) { map.removeLayer(CD.hien); CD.hien = null; } CD.kq = null; cd$("cdKQ").hidden = true; cd$("cdTrang").textContent = "";
    cdMo(true);
  });
})();
var _cdMo30 = cdMo;
cdMo = async function (on) { cdNguonUI(); return _cdMo30(on); };
var _setLang30 = setLang;
setLang = function (l) { _setLang30(l); if (cd$("cdP") && !cd$("cdP").hidden) cdNguonUI(); };
var _setYear30 = setYear;
setYear = function (y) { _setYear30(y); const b = document.querySelector("[data-lsv]"); if (b && typeof lsvUI === "function") lsvUI(b); };
