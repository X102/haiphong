/* =============================== BẢN 2.1 =============================== */
/* ① lớp S2 10 băng (ảnh dữ liệu int16 trên lưới UTM gốc): tổ hợp màu, chỉ số, CTX tính ngay trong trình duyệt;
   ② đồ thị giá trị điểm ảnh theo năm (PC, embedding, S2, chỉ số, CTX); ③ bảng ảnh nền thu gọn, dải ảnh và
   đường mùa vụ đặt sang cột phải hoặc dải dưới bản đồ; ④ tạo bộ điểm mới (lưới, ngẫu nhiên, phân tầng) với
   các năm cần gán riêng. */

/* ---------------- ① S2 10 băng + CTX ---------------- */
function s2dL0() {
  const s = MAN && MAN.s2d; if (!s) return null;
  return {id: "s2d", ten: "S2 10 băng: tổ hợp màu, chỉ số, CTX (tính trong trình duyệt)", kieu: "s2d", duong_dan: s.duong_dan, nam: s.nam || []};
}
function s2Bang() { return (MAN && MAN.s2d && MAN.s2d.bang) || CORE.S2_BANDS; }
let S2V = Object.assign({mode: "rgb", pre: "432", r: 2, g: 1, b: 0, chi: "NDVI", tk: "s", cs: 15, mot: false, bd: 6, gain: 1},
                        ls("laymau_hp_s2v_v1") || {});
const S2_PRE = {"432": [2, 1, 0], "843": [6, 2, 1], "1184": [8, 6, 2], "128a4": [9, 7, 2], "1182": [8, 6, 0]};
const S2_PRE_TEN = {"432": "4-3-2 màu thật", "843": "8-4-3 hồng ngoại (thực vật đỏ)", "1184": "11-8-4 (xây dựng hồng tím)",
                    "128a4": "12-8A-4", "1182": "11-8-2", "tu": "tuỳ chọn R-G-B"};
const S2_CHI = {NDVI: [-0.2, 0.9, "ndvi"], NDWI: [-0.6, 0.6, "burd"], MNDWI: [-0.6, 0.6, "burd"], NDBI: [-0.5, 0.5, "rdbu"], BSI: [-0.4, 0.4, "rdbu"]};
function s2Keo() {                         // kéo giãn CỐ ĐỊNH (mọi năm như nhau): từ manifest, không có thì mặc định 100..3000 DN
  const k = (MAN && MAN.s2d && MAN.s2d.keo_gian) || {}, n = s2Bang().length;
  const lo = k.lo || new Array(n).fill(100), hi = k.hi || new Array(n).fill(3000);
  return {lo, hi, s5: k.s5 || hi.map((h, i) => 0.2 * (h - lo[i])), s15: k.s15 || hi.map((h, i) => 0.3 * (h - lo[i])), mac_dinh: !k.lo};
}
function s2Need() {                        // các băng cần đọc và phần đệm (CTX cần ô quanh điểm ảnh)
  const m = S2V.mode;
  if (m === "idx") {                                                   // bản 2.4: chỉ đọc các băng chỉ số đang chọn cần
    const c = typeof csLay === "function" ? (csLay(S2V.chi) || csLay("NDVI")) : null;
    const bs = c && c.f && c.f.chi.length ? c.f.chi.slice().sort((a, b) => a - b) : [0, 1, 2, 6, 8];
    return {bands: bs, pad: 0};
  }
  const bs = m === "ctx" && S2V.mot ? [+S2V.bd] : [+S2V.r, +S2V.g, +S2V.b];
  return {bands: bs, pad: m === "ctx" ? (+S2V.cs - 1) / 2 : 0};
}
let s2MsgT = 0;
function s2Msg(t) { const e = document.querySelector("[data-s2v] [data-msg]"); if (e) e.textContent = t; clearTimeout(s2MsgT); if (t) s2MsgT = setTimeout(() => { if (e) e.textContent = ""; }, 6000); }
/* đọc cửa sổ ảnh UTM phủ một ô 3857 (bb), trả chỉ số điểm ảnh nguồn cho từng điểm ảnh đích (láng giềng gần nhất);
   toạ độ UTM của từng điểm đích nội suy song tuyến từ 4 góc (sai số dưới 1 m trên một ô bản đồ) */
async function readUTM(url, bb, w, h, pad, samples, tong, rieng) {   // tong: vẫn chọn ảnh overview khi có đệm; rieng: bản COG riêng cho phân tích
  const t = await tiffOf(url, rieng), ox = t._bb[0], oy = t._bb[3];
  const cor = [[bb[0], bb[3]], [bb[2], bb[3]], [bb[0], bb[1]], [bb[2], bb[1]]].map(m => { const ll = CORE.m2ll(m[0], m[1]); return CORE.toUTM(ll[0], ll[1]); });
  const xs = cor.map(c => c[0]), ys = cor.map(c => c[1]), ub = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  if (!CORE.inter(ub, t._bb)) return null;
  const I = pad && !tong ? t._imgs[0] : CORE.pickImage(t._imgs, (ub[2] - ub[0]) / w);
  const c0 = Math.max(0, Math.floor((ub[0] - ox) / I.rx) - pad - 1), c1 = Math.min(I.w, Math.ceil((ub[2] - ox) / I.rx) + pad + 1);
  const r0 = Math.max(0, Math.floor((oy - ub[3]) / I.ry) - pad - 1), r1 = Math.min(I.h, Math.ceil((oy - ub[1]) / I.ry) + pad + 1);
  if (c1 <= c0 || r1 <= r0) return null;
  const src = await docCua(I.im, [c0, r0, c1, r1], samples);
  const sw = c1 - c0, sh = r1 - r0, idx = new Int32Array(w * h).fill(-1);
  for (let j = 0; j < h; j++) {
    const v = (j + 0.5) / h;
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w, a = (1 - u) * (1 - v), b = u * (1 - v), c = (1 - u) * v, d = u * v;
      const X = a * cor[0][0] + b * cor[1][0] + c * cor[2][0] + d * cor[3][0], Y = a * cor[0][1] + b * cor[1][1] + c * cor[2][1] + d * cor[3][1];
      const col = Math.floor((X - ox) / I.rx) - c0, row = Math.floor((oy - Y) / I.ry) - r0;
      if (col >= 0 && row >= 0 && col < sw && row < sh) idx[j * w + i] = row * sw + col;
    }
  }
  return {src, sw, sh, nb: samples.length, idx, rx: I.rx};
}
const LUT2 = {};
function lut2(n) { return LUT2[n] || (LUT2[n] = CORE.lut(n)); }
/* ảnh RGBA (w × h) theo cách hiển thị S2V; thuần tính toán để kiểm thử được */
function s2dRGBA(R, w, h, need) {
  const out = new Uint8ClampedArray(w * h * 4), K = s2Keo(), g = Math.max(0.1, +S2V.gain || 1), nb = R.nb, bs = need.bands;
  let box = null;
  if (S2V.mode === "ctx") box = bs.map((b, q) => CORE.boxImage(R.src, R.sw, R.sh, nb, q, need.pad));
  const st = S2V.tk === "m" ? "m" : "s", sHi = +S2V.cs === 5 ? K.s5 : K.s15;
  const cs = S2V.mode === "idx" && typeof csLay === "function" ? (csLay(S2V.chi) || csLay("NDVI")) : null;
  const lt = lut2(S2V.mode === "idx" ? (cs ? cs.mau : "ndvi") : "magma");
  for (let k = 0; k < w * h; k++) {
    const j = R.idx[k]; if (j < 0) continue;
    let z = true; for (let q = 0; q < nb; q++) if (R.src[j * nb + q]) { z = false; break; }
    if (z) continue;
    const o = k * 4;
    if (S2V.mode === "idx") {
      const v = new Array(s2Bang().length).fill(0); bs.forEach((b, q) => { v[b] = R.src[j * nb + q] / 10000; });
      const x = cs && cs.f ? cs.f(v) : null; if (x == null) continue;
      const t = Math.max(0, Math.min(1, (x - cs.lo) / (cs.hi - cs.lo))), c = lt[1 + Math.round(t * 254)];
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; continue;
    }
    const val = q => box ? box[q][st][j] : R.src[j * nb + q];
    const sc = q => { const b = bs[q]; return st === "s" && box ? val(q) / (sHi[b] / g) : (val(q) - K.lo[b]) / ((K.hi[b] - K.lo[b]) / g); };
    if (bs.length === 1) {
      const t = Math.max(0, Math.min(1, sc(0))), c = lt[1 + Math.round(t * 254)];
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
    } else for (let q = 0; q < 3; q++) out[o + q] = Math.round(255 * Math.max(0, Math.min(1, sc(q))));
    out[o + 3] = 255;
  }
  return out;
}
async function s2dVe(url, bb, w, h, z, canvas) {
  const need = s2Need();
  if (S2V.mode === "ctx" && z < 13) { s2Msg(T("CTX tính ở độ phân giải gốc 10 m: phóng to tới mức 13 trở lên")); return null; }
  const R = await readUTM(url, bb, w, h, need.pad, need.bands);
  if (!R) return null;
  const px = s2dRGBA(R, w, h, need);
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (ctx) { const img = ctx.createImageData(w, h); img.data.set(px); ctx.putImageData(img, 0, 0); }
  return px;
}
const S2DLayer = L.GridLayer.extend({
  initialize(url, opts) { this._url = url; L.GridLayer.prototype.initialize.call(this, opts); },
  createTile(coords, done) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    s2dVe(this._url, CORE.tileBbox(coords.z, coords.x, coords.y), 256, 256, coords.z, c).then(() => done(null, c))
      .catch(e => { this._err = (this._err || 0) + 1; if (this._err === 3) olMsg(T("không đọc được {l}: {e}", {l: lname(s2dL0()), e: e.message || e})); done(null, c); });
    return c;
  },
});
function s2vLuu() {
  ls("laymau_hp_s2v_v1", S2V);
  if (OVL.s2d && OVL.s2d.layer && OVL.s2d.layer.redraw) OVL.s2d.layer.redraw();
  if ($("selStrip").value === "s2d") renderStrip();
}
function s2vUI(div) {
  const bs = s2Bang(), opt = (a, sel) => a.map(([v, t]) => `<option value="${v}"${String(v) === String(sel) ? " selected" : ""}>${t}</option>`).join("");
  const bo = bs.map((b, i) => [i, b]);
  div.setAttribute("data-noi18n", "");
  div.innerHTML = `<div class="row sm"><select data-k="mode">${opt([["rgb", T("tổ hợp màu")], ["idx", T("chỉ số")], ["ctx", "CTX"]], S2V.mode)}</select>
    <select data-k="pre" data-show="rgb ctx3">${opt(Object.keys(S2_PRE_TEN).map(k => [k, T(S2_PRE_TEN[k])]), S2V.pre)}</select>
    <select data-k="chi" data-show="idx">${opt((typeof csDS === "function" ? csDS().map(c => [c.id, c.ten]) : CORE.IDX_NAMES.map(n => [n, n])).concat([["__them", T("＋ chỉ số khác…")]]), S2V.chi)}</select>
    <select data-k="tk" data-show="ctx">${opt([["m", T("trung bình")], ["s", T("độ lệch chuẩn")]], S2V.tk)}</select>
    <select data-k="cs" data-show="ctx">${opt([[5, "5 × 5"], [15, "15 × 15"]], S2V.cs)}</select>
    <label data-show="ctx"><input type="checkbox" data-k="mot"${S2V.mot ? " checked" : ""}> ${T("1 băng")}</label></div>
    <div class="row sm" data-show="tu">R <select data-k="r">${opt(bo, S2V.r)}</select> G <select data-k="g">${opt(bo, S2V.g)}</select> B <select data-k="b">${opt(bo, S2V.b)}</select></div>
    <div class="row sm" data-show="mot">${T("băng")} <select data-k="bd">${opt(bo, S2V.bd)}</select></div>
    <div class="row sm">${T("tương phản")} <input type="range" data-k="gain" min="0.5" max="3" step="0.1" value="${S2V.gain}"> <span class="mu" data-msg></span></div>
    <div class="mu sm">${s2Keo().mac_dinh ? T("kéo giãn mặc định 100-3000 DN (manifest chưa có kéo giãn)") : T("kéo giãn cố định theo năm tham chiếu, giống nhau mọi năm")}</div>`;
  const upd = () => {
    const m = S2V.mode, show = {rgb: m === "rgb", idx: m === "idx", ctx: m === "ctx", ctx3: m === "ctx" && !S2V.mot,
                               tu: S2V.pre === "tu" && (m === "rgb" || (m === "ctx" && !S2V.mot)), mot: m === "ctx" && S2V.mot};
    div.querySelectorAll("[data-show]").forEach(e => { e.hidden = !e.dataset.show.split(" ").some(k => show[k]); });
  };
  div.querySelectorAll("[data-k]").forEach(e => {
    const f = () => {
      const k = e.dataset.k;
      if (k === "chi" && e.value === "__them") { e.value = S2V.chi; if (typeof csMo === "function") csMo(); return; }
      S2V[k] = e.type === "checkbox" ? e.checked : (e.type === "range" ? +e.value : (/^(r|g|b|bd|cs)$/.test(k) ? +e.value : e.value));
      if (k === "pre" && S2_PRE[S2V.pre]) { [S2V.r, S2V.g, S2V.b] = S2_PRE[S2V.pre]; }
      if (/^(r|g|b)$/.test(k)) { S2V.pre = "tu"; const sp = div.querySelector('[data-k="pre"]'); if (sp) sp.value = "tu"; }
      upd(); s2Msg(""); s2vLuu();
    };
    e.addEventListener(e.type === "range" ? "change" : "change", f);
  });
  upd();
}
async function renderStripS2D(L0, p, bb, ys, tok) {
  const box = $("strip"), WS = typeof stripCo === "function" ? stripCo() : 97, half = (bb[2] - bb[0]) / 2;
  for (const y of ys) {
    const it = document.createElement("div"); it.className = "it" + (y === ST.nam ? " cur" : "");
    const cv = document.createElement("canvas"); cv.width = cv.height = WS;
    it.appendChild(cv);
    it.insertAdjacentHTML("beforeend", `<span class="lb">${y}</span>` + (p.nhan[y] ? `<span class="lc" style="background:${color(p.nhan[y])}"></span>` : ""));
    it.onclick = () => setYear(y);
    box.appendChild(it);
    if (!L0.nam.includes(y)) { const g = cv.getContext && cv.getContext("2d"); if (g) { g.fillStyle = "#555"; g.fillText(T("không có"), WS / 2 - 22, WS / 2); } continue; }
    s2dVe(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), bb, WS, WS, 18, cv).then(() => {
      if (tok !== stripTok) return;
      if (typeof stripDanh === "function") stripDanh(cv, WS, half);
    }).catch(e => { if (tok === stripTok) $("stripmsg").textContent = T("không đọc được: ") + (e.message || e); });
  }
}
/* giá trị tại điểm, mọi năm: 10 băng, 5 chỉ số, 40 đặc trưng CTX; đúng cách tính của bộ phân loại (s2_classify) */
const S2PT = {};
async function s2dAt(p) {
  if (!MAN || !MAN.s2d) return {};
  const key = p.x + "," + p.y; if (S2PT[key]) return S2PT[key];
  const out = {};
  for (const y of MAN.s2d.nam || []) {
    try {
      const t = await tiffOf(CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", y)));
      const I = t._imgs[0], ox = t._bb[0], oy = t._bb[3];
      const col = Math.floor((p.x - ox) / I.rx), row = Math.floor((oy - p.y) / I.ry);
      if (col < 0 || row < 0 || col >= I.w || row >= I.h) continue;
      const c0 = Math.max(0, col - 8), r0 = Math.max(0, row - 8), c1 = Math.min(I.w, col + 9), r1 = Math.min(I.h, row + 9);
      const a = await I.im.readRasters({window: [c0, r0, c1, r1], interleave: true});
      const sw = c1 - c0, sh = r1 - r0, nb = t._n, cx = col - c0, cy = row - r0, o = (cy * sw + cx) * nb;
      const v = Array.from(a.slice(o, o + nb));
      if (v.every(z => !z)) continue;
      const c5 = CORE.ctxPoint(a, sw, sh, nb, cx, cy, 5), c15 = CORE.ctxPoint(a, sw, sh, nb, cx, cy, 15);
      out[y] = {v: v, idx: CORE.indices(v), m5: c5.m, s5: c5.s, m15: c15.m, s15: c15.s};
    } catch (e) { /* bỏ năm lỗi */ }
  }
  return (S2PT[key] = out);
}

/* ---------------- ② giá trị điểm ảnh theo năm ---------------- */
function embLayers() { return MAN ? MAN.layers.filter(l => l.kieu === "rgb" && l.nguon !== "ls" && (l.phep_chieu || /^Embedding /.test(l.ten || ""))) : []; }
function pcLayers() { return MAN ? MAN.layers.filter(l => /^pc\d+$/.test(l.id) && l.kieu === "xam") : []; }
const coS2 = () => !!(MAN && MAN.s2d);
const NHOM_NAM = [
  {id: "pc", ten: "PC1-5 của PCA chuỗi năm", co: () => !!(MAN && (MAN.pc || pcLayers().length))},
  {id: "emb", ten: "Embedding: các thành phần chính", co: () => embLayers().length > 0},
  {id: "s2", ten: "S2: 10 băng (DN, ảnh mùa khô)", co: coS2},
  {id: "idx", ten: "Chỉ số (danh sách đang dùng, ∑ để thêm)", co: coS2},
  {id: "m5", ten: "CTX trung bình 5 × 5", co: coS2},
  {id: "s5", ten: "CTX độ lệch chuẩn 5 × 5", co: coS2},
  {id: "m15", ten: "CTX trung bình 15 × 15", co: coS2},
  {id: "s15", ten: "CTX độ lệch chuẩn 15 × 15", co: coS2},
  {id: "rgb", ten: "Ảnh màu 8 bit (s2tc, s2sw)", co: () => !coS2() && !!MAN && MAN.layers.some(l => l.id === "s2tc" || l.id === "s2sw")},
];
async function pxAt(url, p) {              // một điểm ảnh của COG 3857 chứa điểm (ảnh gốc, láng giềng gần nhất)
  const m = CORE.to3857(p.lon, p.lat), r = await readBox(url, [m[0] - 2, m[1] - 2, m[0] + 2, m[1] + 2], 1, 1);
  return r ? Array.from(r.data.slice(0, r.n)) : null;
}
const EMB_PJ = {}, LOP_PT = {}, AN_CACHE = {};
async function embPJ(L0) {
  if (!L0.phep_chieu) return null;
  if (!(L0.id in EMB_PJ)) { try { EMB_PJ[L0.id] = JSON.parse(await getText(L0.phep_chieu)); } catch (e) { EMB_PJ[L0.id] = null; } }
  return EMB_PJ[L0.id];
}
async function lopAt(p) {                  // giá trị các bản đồ lớp tại điểm, mọi năm (dải dưới đồ thị)
  const key = p.x + "," + p.y; if (LOP_PT[key]) return LOP_PT[key];
  const out = {};
  for (const L0 of (MAN ? MAN.layers.filter(l => l.kieu === "lop") : [])) {
    const mp = {};
    for (const y of L0.nam) { try { const v = await pxAt(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), p); if (v && v[0]) mp[y] = v[0]; } catch (e) { /* bỏ */ } }
    out[L0.id] = {L0, map: mp};
  }
  return (LOP_PT[key] = out);
}
async function annualFor(p, grp) {
  const key = p.x + "," + p.y + "|" + grp + (grp === "idx" && typeof ST !== "undefined" && ST.chiso ? "|" + ST.chiso.dung.join() + "|" + ST.chiso.tu.map(t => t.bt).join() : "");
  if (AN_CACHE[key]) return AN_CACHE[key];
  let names = [], ys = {}, don_vi = "", nguon = "";
  if (grp === "pc") {
    if (MAN.pc) {
      const pv = await pcAt(p), s = (MAN.pc.he_so && MAN.pc.he_so.he_so_nhan) || 100;
      names = Array.from({length: MAN.pc.k}, (_, i) => "PC" + (i + 1));
      Object.entries(pv).forEach(([y, d]) => { ys[y] = d.pcs.map(v => v / s); });
      nguon = "ảnh dữ liệu PC (int16), giá trị đúng"; don_vi = "đơn vị PC";
    } else {
      const Ls = pcLayers(); names = Ls.map(l => l.id.toUpperCase());
      for (let j = 0; j < Ls.length; j++) for (const y of Ls[j].nam) {
        const v = await pxAt(CORE.dataUrl(CFG, Ls[j].duong_dan.replace("{y}", y)), p); if (!v || !v[0]) continue;
        const kg = Ls[j].keo_gian || [-100, 100]; (ys[y] = ys[y] || new Array(Ls.length).fill(null))[j] = (kg[0] + (v[0] - 1) / 254 * (kg[1] - kg[0])) / 100;
      }
      nguon = "đọc ngược từ ảnh xám 8 bit, gần đúng"; don_vi = "đơn vị PC";
    }
  } else if (grp === "emb") {
    const Ls = embLayers(); let nb = 0; nguon = "ảnh chiếu 8 bit của embedding";
    for (const L0 of Ls) {
      const m = /thành phần ([\d-]+)/.exec(L0.ten || ""), tp = m ? m[1].split("-").map(Number) : [1, 2, 3].map(i => i + nb);
      const pj = await embPJ(L0), mE = /^Embedding (\S+?),/.exec(L0.ten || ""), e = mE ? mE[1] : L0.id;
      tp.forEach(k => names.push(`${e} ${k}`));
      for (const y of L0.nam) {
        const v = await pxAt(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), p); if (!v || !v[0]) continue;
        const row = ys[y] = ys[y] || [];
        tp.forEach((k, q) => { row[nb + q] = pj && pj.lo && pj.hi ? pj.lo[k - 1] + (v[q] - 1) / 254 * (pj.hi[k - 1] - pj.lo[k - 1]) : v[q]; });
      }
      nb += tp.length; if (pj) nguon = "thành phần chính của embedding, đổi từ 8 bit theo phép chiếu";
    }
    Object.values(ys).forEach(r => { for (let i = 0; i < names.length; i++) if (r[i] === undefined) r[i] = null; });
    don_vi = "đơn vị phép chiếu";
  } else if (["s2", "idx", "m5", "s5", "m15", "s15"].includes(grp)) {
    const sv = await s2dAt(p), bs = s2Bang();
    const DS = grp === "idx" && typeof csDS === "function" ? csDS() : null;          // bản 2.4: danh sách chỉ số đang dùng
    names = grp === "s2" ? bs.slice() : grp === "idx" ? (DS ? DS.map(c => c.ten) : CORE.IDX_NAMES.slice()) : bs.map(b => b + "_" + grp);
    Object.entries(sv).forEach(([y, d]) => { ys[y] = grp === "s2" ? d.v : grp === "idx" ? (DS ? DS.map(c => csTinh(c, d.v)) : d.idx) : d[grp]; });
    nguon = grp === "s2" ? "ảnh S2 10 băng, giá trị gốc" : grp === "idx" ? "tính từ 10 băng như bộ phân loại" : "CTX tính từ ảnh 10 băng như bộ phân loại (biên kiểu nearest)";
    don_vi = grp === "idx" ? "không thứ nguyên" : "DN";
  } else if (grp === "rgb") {
    for (const [id, bn] of [["s2tc", ["B4", "B3", "B2"]], ["s2sw", ["B11", "B8", "B4"]]]) {
      const L0 = MAN.layers.find(l => l.id === id); if (!L0) continue;
      const nb = names.length; bn.forEach(b => names.push(`${b} (${id})`));
      for (const y of L0.nam) {
        const v = await pxAt(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), p); if (!v || !v[0]) continue;
        const row = ys[y] = ys[y] || []; v.slice(0, 3).forEach((x, q) => { row[nb + q] = x; });
      }
    }
    Object.values(ys).forEach(r => { for (let i = 0; i < names.length; i++) if (r[i] === undefined) r[i] = null; });
    nguon = "giá trị hiển thị 8 bit (1-255), không phải phản xạ"; don_vi = "8 bit";
  }
  const out = {names, ys, don_vi, nguon, lop: await lopAt(p)};
  return (AN_CACHE[key] = out);
}
const PAL10 = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
function anCol(A, i) { const b = A.names[i].split(/[_ ]/)[0]; return /^B\d/.test(b) && CVCOL[b] ? CVCOL[b] : PAL10[i % 10]; }
function anStats(A) { const y2 = {}; Object.entries(A.ys).forEach(([y, v]) => { y2[y] = {G: v}; }); return CORE.seasonStats(y2, "G", A.names.length); }
function anZ(S, i, v) { return S.med[i] == null ? 0 : (v - S.med[i]) / Math.max(1.4826 * (S.mad[i] || 0), 1e-9); }
function niceTicks(lo, hi, n) {
  const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
  const st = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, t = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-6; v += st) t.push(+v.toPrecision(12));
  return t;
}
function fmtV(v) { const a = Math.abs(v); return a >= 1000 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3); }
function annualSVG(A, p, W, H) {
  const yrs = Object.keys(A.ys).map(Number).sort((a, b) => a - b), an = new Set(CVS.an[CVS.grp] || []), S = anStats(A);
  const vis = A.names.map((n, i) => i).filter(i => !an.has(A.names[i]));
  const lops = Object.values(A.lop || {}), B0 = 16 + (1 + lops.length) * 11, L0 = 46, R0 = 10, T0 = 8;
  const val = (y, i) => { const v = A.ys[y][i]; if (v == null || !isFinite(v)) return null; return CVS.z ? anZ(S, i, v) : v; };
  let lo = Infinity, hi = -Infinity;
  yrs.forEach(y => vis.forEach(i => { const v = val(y, i); if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pd = (hi - lo) * 0.06; lo -= pd; hi += pd;
  const n = yrs.length, span = W - L0 - R0, dx = span / Math.max(1, n);           // mỗi năm một ô, điểm ở giữa ô
  const X = k => L0 + (k + 0.5) * dx, Y = v => T0 + (1 - (v - lo) / (hi - lo)) * (H - T0 - B0);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  niceTicks(lo, hi, 5).forEach(t => {
    s += `<line x1="${L0}" x2="${W - R0}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${t === 0 ? "#c9ced6" : "#e9ecf0"}"/>` +
         `<text x="${L0 - 3}" y="${(Y(t) + 3).toFixed(1)}" font-size="9" fill="#98a2b3" text-anchor="end">${fmtV(t)}</text>`;
  });
  yrs.forEach((y, k) => {
    const x = X(k), x0 = x - dx / 2;
    if (S.anom.includes(y)) s += `<rect x="${x0.toFixed(1)}" y="${T0}" width="${dx.toFixed(1)}" height="${H - T0 - B0}" fill="#d92d20" opacity=".07"><title>${T("năm lệch khỏi các năm khác")}</title></rect>`;
    if (y === ST.nam) s += `<rect x="${x0.toFixed(1)}" y="${T0}" width="${dx.toFixed(1)}" height="${H - T0 - B0}" fill="#0b63ce" opacity=".07"/>`;
    let yy = H - B0 + 3;
    const ma = p && p.nhan[y];
    s += `<rect x="${(x0 + 1).toFixed(1)}" y="${yy}" width="${Math.max(1, dx - 2).toFixed(1)}" height="9" rx="2" fill="${ma ? color(ma) : "#eef0f3"}"><title>${y}: ${ma ? ma + " " + cten(IDX.by[ma]) : T("chưa gán")}</title></rect>`;
    lops.forEach(Lx => {
      yy += 11; const v = Lx.map[y], c = v && Lx.L0.bang_mau ? Lx.L0.bang_mau[v] : null, tn = v ? T(((Lx.L0.ten_lop || {})[v]) || String(v)) : T("không có");
      s += `<rect x="${(x0 + 1).toFixed(1)}" y="${yy}" width="${Math.max(1, dx - 2).toFixed(1)}" height="9" rx="2" fill="${c || "#f2f4f7"}"><title>${lname(Lx.L0)} ${y}: ${tn}</title></rect>`;
    });
    s += `<text x="${x.toFixed(1)}" y="${H - 3}" font-size="9" text-anchor="middle" fill="${y === ST.nam ? "#0b63ce" : "#667085"}" font-weight="${y === ST.nam ? 700 : 400}">${y}</text>`;
  });
  s += `<text x="2" y="${H - B0 + 11}" font-size="8" fill="#98a2b3">${T("nhãn")}</text>`;
  lops.forEach((Lx, q) => { s += `<text x="2" y="${H - B0 + 22 + q * 11}" font-size="8" fill="#98a2b3">${Lx.L0.id.replace("lulc_", "")}</text>`; });
  vis.forEach(i => {
    const c = anCol(A, i), pts = yrs.map((y, k) => [k, val(y, i)]).filter(t => t[1] != null);
    if (pts.length > 1) s += `<polyline points="${pts.map(t => X(t[0]).toFixed(1) + "," + Y(t[1]).toFixed(1)).join(" ")}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>`;
    pts.forEach(t => {
      const y = yrs[t[0]], raw = A.ys[y][i], z = yrs.length >= 4 ? anZ(S, i, raw) : 0, lech = Math.abs(z) >= 3.5;
      s += `<circle cx="${X(t[0]).toFixed(1)}" cy="${Y(t[1]).toFixed(1)}" r="${lech ? 3.6 : 2.4}" fill="${c}"${lech ? ' stroke="#d92d20" stroke-width="1.6"' : ""}>` +
           `<title>${A.names[i]} ${y}: ${fmtV(raw)}${S.med[i] != null ? " (" + T("trung vị") + " " + fmtV(S.med[i]) + (yrs.length >= 4 ? ", z " + z.toFixed(1) : "") + ")" : ""}</title></circle>`;
    });
  });
  return s + "</svg>";
}
function annualLegend(A, p) {
  const S = anStats(A), an = new Set(CVS.an[CVS.grp] || []), yrs = Object.keys(A.ys).map(Number).sort((a, b) => a - b);
  let h = `<div class="cvleg">` + A.names.map((n, i) => `<span data-s="${n}" class="${an.has(n) ? "off" : ""}" title="${T("bấm để ẩn / hiện đường này")}"><i style="background:${anCol(A, i)}"></i>${n}</span>`).join("") + `</div>`;
  if (yrs.length >= 4) {
    const t = S.anom.map(y => {
      const w = S.worst[y], nm = w.ky >= 0 ? A.names[w.ky] : "", d = w.ky >= 0 ? A.ys[y][w.ky] - S.med[w.ky] : 0;
      return T("{y} ({f} {dir} trung vị {d})", {y: y, f: nm, dir: d < 0 ? T("thấp hơn") : T("cao hơn"), d: fmtV(Math.abs(d))});
    });
    h += t.length ? `<div class="cvwarn">${T("Năm lệch khỏi các năm khác:")} ${t.join("; ")}</div>` : `<div class="cvnote">${T("Không có năm nào lệch rõ khỏi các năm khác.")}</div>`;
  } else h += `<div class="cvnote">${T("cần ít nhất 4 năm để đánh dấu năm lệch")}</div>`;
  h += `<div class="cvnote">${T(A.nguon)} · ${T(A.don_vi)} · ${T("{n} năm", {n: yrs.length})}${CVS.z ? " · " + T("điểm z bền của từng đường (trung vị, MAD qua các năm)") : ""}</div>`;
  const lops = Object.values(A.lop || {});
  h += `<div class="cvnote">${T("dải dưới trục: nhãn đã gán")}${lops.map(l => "; " + lname(l.L0)).join("")}. ${T("Chấm viền đỏ: giá trị lệch xa trung vị các năm (|z| ≥ 3.5).")}</div>`;
  return h;
}
let lastAN = null;
async function renderAnnual(tok) {
  const box = $("curve"), p = vizPt();
  if (!p) { box.innerHTML = ""; lastAN = null; return; }
  if (!MAN) { box.innerHTML = `<div class="mu sm">${T("(cần manifest)")}</div>`; return; }
  if (!NHOM_NAM.some(g => g.co() && g.id === CVS.grp)) { box.innerHTML = `<div class="mu sm">${T("bộ dữ liệu chưa có lớp nào cho đồ thị theo năm")}</div>`; return; }
  box.innerHTML = `<div class="mu sm">${T("đang đọc…")}</div>`;
  let A;
  try { A = await annualFor(p, CVS.grp); } catch (e) { if (tok === curveTok) box.innerHTML = `<div class="mu sm">${T("không đọc được: ")}${e.message || e}</div>`; return; }
  if (tok !== curveTok) return;
  lastAN = A;
  if (!Object.keys(A.ys).length) { box.innerHTML = `<div class="mu sm">${T("không có giá trị nào tại điểm này cho nhóm đã chọn")}</div>`; return; }
  box.innerHTML = annualSVG(A, p, cvW(box), Math.round(200 * cvH())) + annualLegend(A, p);
  wireCurveLeg(box);
  if ($("dlgCurve").open) renderCurveBig();
}
function cvW(box) { return Math.max(340, Math.min(1400, (box && box.clientWidth) || 380)); }
function cvH() { return DOCK === "duoi" ? 0.95 : 1; }
function cvCtl() {
  const k = CVS.kind === "nam" ? "nam" : "ky";
  $("selCurveKind").value = k;
  const fs = curveFeats(), sf = $("selCurveFeat");
  if (sf.dataset.fs !== fs.join()) { sf.innerHTML = fs.map(f => `<option value="${f}">${f}</option>`).join(""); sf.dataset.fs = fs.join(); }
  if (!fs.includes(CVS.feat)) CVS.feat = fs[0] || "NDVI";
  sf.value = CVS.feat; $("selCurveMode").value = CVS.mode;
  const gs = NHOM_NAM.filter(g => g.co()), sg = $("selCurveGrp"), key = gs.map(g => g.id).join() + "|" + LANG;
  if (sg.dataset.k !== key) {
    sg.innerHTML = gs.map(g => `<option value="${g.id}">${T(g.ten)}</option>`).join("") || `<option value="">${T("(cần manifest)")}</option>`;
    sg.dataset.k = key;
  }
  if (gs.length && !gs.some(g => g.id === CVS.grp)) CVS.grp = gs[0].id;
  sg.value = CVS.grp; $("cbCurveZ").checked = !!CVS.z;
  $("selCurveMode").hidden = $("selCurveFeat").hidden = k === "nam";
  sg.hidden = $("lbCurveZ").hidden = k !== "nam";
  $("curveH").textContent = k === "nam" ? T("Giá trị điểm ảnh theo năm (PC, embedding, S2, CTX)") : T("Đường mùa vụ 6 kỳ (tái dựng từ PCA chuỗi năm)");
}

/* ---------------- ③ bảng ảnh nền thu gọn, bố cục dải ảnh + đường mùa vụ ---------------- */
function pnTomTat() {
  const th = $("panel").classList.contains("thu"), n = Object.values(OVL).filter(o => o.on).length;
  $("pnTom").textContent = th ? " · " + T("{n} lớp bật", {n: n}) : "";
}
function pnThu(on) {
  $("panel").classList.toggle("thu", !!on); $("pnThu").textContent = on ? "▸" : "▾";
  $("pnThu").title = on ? T("mở bảng ảnh nền và lớp đối chiếu") : T("thu gọn bảng ảnh nền và lớp đối chiếu");
  ls("laymau_hp_pnthu_v1", !!on); pnTomTat();
}
$("pnThu").onclick = () => pnThu(!$("panel").classList.contains("thu"));
$("panel").querySelector(".pn-dau b").onclick = () => pnThu(!$("panel").classList.contains("thu"));
let DOCK = ls("laymau_hp_dock_v1") || "trai";
function setDock(m, khongLuu) {
  if (!["trai", "phai", "duoi"].includes(m)) m = "trai";
  const hien = isMobile() ? "trai" : m;           // điện thoại: luôn trong ngăn kéo
  DOCK = hien; if (!khongLuu) ls("laymau_hp_dock_v1", m);
  $("selDock").value = m;
  document.body.classList.toggle("dk-phai", hien === "phai"); document.body.classList.toggle("dk-duoi", hien === "duoi");
  const viz = $("viz"), dock = $("dock");
  if (hien === "trai") { if (viz.parentElement !== $("side")) $("side").insertBefore(viz, $("statsH")); dock.hidden = true; }
  else { if (viz.parentElement !== dock) dock.appendChild(viz); dock.hidden = false; }
  setTimeout(() => { map.invalidateSize(); if (vizPt()) renderCurve(); }, 80);
}
$("selDock").onchange = () => setDock($("selDock").value);
if (MQ && MQ.addEventListener) MQ.addEventListener("change", () => setDock(ls("laymau_hp_dock_v1") || "trai", true));

/* ---------------- ④ tạo bộ điểm mới, các năm cần gán của từng bộ ---------------- */
const BO = {kieu: "moi", hcn: null, xem: L.layerGroup().addTo(map), pts: null, khung: null};
function boSlug(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
}
function boMoiNam() {                     // các năm có thể chọn: năm của bộ dữ liệu, năm cài đặt, năm bộ đang có
  const s = new Set(CFG.years.concat(MAN && MAN.years ? MAN.years : [], years()));
  return [...s].sort((a, b) => a - b);
}
function boHien() {
  const moi = BO.kieu === "moi", cach = $("boCach").value;
  $("dlgBo").querySelectorAll("[data-moi]").forEach(e => { e.hidden = !moi; });
  $("dlgBo").querySelectorAll("[data-sua]").forEach(e => { e.hidden = moi || !(boCfg() && boCfg().tu_tao); });
  $("dlgBo").querySelectorAll("[data-cach]").forEach(e => { e.hidden = !moi || !e.dataset.cach.split(" ").includes(cach); });
  const pv = $("boPV").value, tr = cach === "trong";
  $("boPV").closest("tr").hidden = !moi || tr;
  $("boXa").hidden = !(pv === "xa"); $("boVung").hidden = pv !== "vung"; $("boVe").hidden = pv !== "hcn";
  $("boPVTT").textContent = pv === "hcn" ? (BO.hcn ? T("đã vẽ") : T("chưa vẽ")) : "";
  $("boXem").hidden = !moi || tr;
}
async function boMo(kieu) {
  BO.kieu = kieu; BO.pts = null; BO.xem.clearLayers();
  $("boTieuDe").textContent = kieu === "moi" ? T("Tạo bộ điểm mới") : T("Bộ điểm: các năm cần gán");
  $("boOk").textContent = kieu === "moi" ? T("Tạo bộ") : T("Lưu");
  const c = boCfg(), ps = MAN && MAN.point_sets.find(x => x.id === ST.bo);
  $("boTen").value = kieu === "moi" ? "" : (c && c.ten) || (ps ? psname(ps) : ST.bo);
  $("boTen").disabled = kieu !== "moi" && !(c && c.tu_tao);
  const chon = new Set(kieu === "moi" ? CFG.years : years());
  $("boNamChon").setAttribute("data-noi18n", "");
  $("boNamChon").innerHTML = boMoiNam().map(y => `<label><input type="checkbox" value="${y}"${chon.has(y) ? " checked" : ""}> ${y}</label>`).join("") +
    ` <button type="button" data-a="het">${T("tất cả")}</button><button type="button" data-a="khong">${T("bỏ hết")}</button>`;
  $("boNamChon").querySelectorAll("button").forEach(b => { b.onclick = () => $("boNamChon").querySelectorAll("input").forEach(i => { i.checked = b.dataset.a === "het"; }); });
  const lopL = MAN ? MAN.layers.filter(l => l.kieu === "lop") : [];
  $("boLopBD").innerHTML = lopL.map(l => `<option value="${l.id}">${lname(l)}</option>`).join("") || `<option value="">${T("(không có bản đồ lớp)")}</option>`;
  const napNam = () => { const L0 = lopL.find(l => l.id === $("boLopBD").value); $("boNamBD").innerHTML = (L0 ? L0.nam : []).map(y => `<option${y === ST.nam ? " selected" : ""}>${y}</option>`).join(""); };
  $("boLopBD").onchange = napNam; napNam();
  $("boVung").innerHTML = Object.values(ST.vung || {}).map(v => `<option value="${v.id}">${v.id} · ${v.ma_lop} · ${v.nam} · ${v.thong_ke.dien_tich_ha.toFixed(1)} ${T("ha")}</option>`).join("") ||
    `<option value="">${T("(chưa lưu vùng nào)")}</option>`;
  if (typeof VG !== "undefined" && !VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  const xs = typeof VG !== "undefined" && VG.xa ? VG.xa.slice().sort((a, b) => a.ten.localeCompare(b.ten, "vi")) : [];
  $("boXa").innerHTML = xs.map(x => `<option value="${x.i}">${x.ten}</option>`).join("");
  [...$("boPV").options].forEach(o => { if (o.value === "xa" || o.value === "tp") o.disabled = !xs.length; });
  [...$("boPV").options].forEach(o => { if (o.value === "vung") o.disabled = !Object.keys(ST.vung || {}).length; });
  if ($("boPV").selectedOptions[0] && $("boPV").selectedOptions[0].disabled) $("boPV").value = "nhin";
  $("boTT").textContent = "";
  boHien();
  if (!$("dlgBo").open) $("dlgBo").showModal();
}
function boNamDaChon() { return [...$("boNamChon").querySelectorAll("input:checked")].map(i => +i.value).sort((a, b) => a - b); }
function boPhamVi() {                     // -> {mp: MultiPolygon (lon, lat) các phần, bb UTM, trong(x, y), ten}
  const pv = $("boPV").value;
  let parts = [], ten = "";
  const hop = b => [[[[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]]];
  if (pv === "nhin") { const b = map.getBounds(); parts = [hop([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])]; ten = T("khung nhìn"); }
  else if (pv === "hcn") { if (!BO.hcn) throw new Error(T("chưa vẽ hình chữ nhật: bấm Vẽ… rồi nhấp hai góc trên bản đồ")); parts = [hop(BO.hcn)]; ten = T("hình chữ nhật"); }
  else if (pv === "xa" || pv === "tp") {
    const all = typeof VG !== "undefined" && VG.xa ? VG.xa : [];
    const ids = pv === "tp" ? all.map(x => x.i) : [...$("boXa").selectedOptions].map(o => +o.value);
    if (!ids.length) throw new Error(T("chưa chọn xã nào"));
    parts = all.filter(x => ids.includes(x.i)).map(x => x.mp);
    ten = pv === "tp" ? T("toàn thành phố") : all.filter(x => ids.includes(x.i)).map(x => x.ten).join(", ");
  } else if (pv === "vung") {
    const v = ST.vung && ST.vung[$("boVung").value]; if (!v) throw new Error(T("chưa có vùng đã lưu"));
    parts = [v.geom.coordinates]; ten = T("vùng {id}", {id: v.id});
  } else if (/^gop:/.test(pv) && typeof xgPV === "function") {      // bản 3.1: vùng gộp nhiều xã
    const G = xgPV(pv.slice(4)); parts = [G.mp]; ten = G.ten;
  }
  const P = parts.map(mp => {                // hộp bao (lon, lat) từng phần để lọc nhanh trước khi kiểm điểm trong đa giác
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    mp.forEach(pg => pg[0].forEach(q => { b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])]; }));
    return {mp, b};
  });
  let bb = [Infinity, Infinity, -Infinity, -Infinity];
  P.forEach(o => [[o.b[0], o.b[1]], [o.b[2], o.b[1]], [o.b[0], o.b[3]], [o.b[2], o.b[3]]].forEach(q => {
    const u = CORE.toUTM(q[0], q[1]); bb = [Math.min(bb[0], u[0]), Math.min(bb[1], u[1]), Math.max(bb[2], u[0]), Math.max(bb[3], u[1])]; }));
  const trong = (x, y) => { const ll = CORE.toLL(x, y); return P.some(o => ll[0] >= o.b[0] && ll[0] <= o.b[2] && ll[1] >= o.b[1] && ll[1] <= o.b[3] && CORE.pip(ll[0], ll[1], o.mp)); };
  return {parts: P, bb, trong, ten};
}
async function boSinh() {                  // -> [{lon, lat, tang?, goi_y?}]
  const cach = $("boCach").value, rf = CORE.rnd(Date.now() % 2147483647), PV = boPhamVi(), out = [];
  if (cach === "luoi" || cach === "lech") {
    const S = Math.max(10, +$("boBuoc").value || 1000);
    const n0 = (PV.bb[2] - PV.bb[0]) * (PV.bb[3] - PV.bb[1]) / (S * S);
    if (n0 > 200000) throw new Error(T("lưới quá dày cho phạm vi này (khoảng {n} ô): tăng bước lưới", {n: Math.round(n0)}));
    CORE.gridPts(PV.bb, S, cach === "lech", rf).forEach(q => { if (PV.trong(q[0], q[1])) out.push(q); });
  } else if (cach === "nn") {
    CORE.randPts(PV.bb, Math.max(1, +$("boN").value || 100), Math.max(0, +$("boDmin").value || 0), PV.trong, rf).forEach(q => out.push(q));
  } else if (cach === "pt") {
    const L0 = MAN && MAN.layers.find(l => l.id === $("boLopBD").value), y = +$("boNamBD").value;
    if (!L0) throw new Error(T("chưa có bản đồ lớp trong bộ dữ liệu"));
    const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), t = await tiffOf(url);
    let b3 = [Infinity, Infinity, -Infinity, -Infinity];
    PV.parts.forEach(o => [[o.b[0], o.b[1]], [o.b[2], o.b[3]]].forEach(q => { const m = CORE.to3857(q[0], q[1]); b3 = [Math.min(b3[0], m[0]), Math.min(b3[1], m[1]), Math.max(b3[2], m[0]), Math.max(b3[3], m[1])]; }));
    const g = CORE.gridFor(b3, 1500, {x0: t._bb[0], y1: t._bb[3], res0: t._imgs[0].rx});
    const r = await readBox(url, g.bb, g.w, g.h); if (!r) throw new Error(T("bản đồ lớp không phủ phạm vi này"));
    const allow = new Uint8Array(g.w * g.h);
    PV.parts.forEach(o => CORE.rasterizeRings(CORE.polysToPixRings(g, o.mp), g.w, g.h, allow, 1));
    const nPer = Math.max(1, +$("boNLop").value || 50), dmin = Math.max(0, +$("boDmin").value || 0);
    const pick = CORE.stratPick(r.data, allow, nPer, rf);
    Object.entries(pick).forEach(([v, L_]) => {
      const u = L_.map(i => { const px = i % g.w, py = (i - px) / g.w, ll = CORE.pixToLL(g, px + 0.5, py + 0.5), q = CORE.toUTM(ll[0], ll[1]); q.v = +v; return q; });
      CORE.thinPts(u, Math.max(dmin, g.res), nPer).forEach(q => out.push(Object.assign([q[0], q[1]], {tang: q.v, nam_bd: y, lop_bd: L0.id})));
    });
  }
  return out.map(q => { const ll = CORE.toLL(q[0], q[1]); return {lon: ll[0], lat: ll[1], tang: q.tang, nam_bd: q.nam_bd, lop_bd: q.lop_bd}; });
}
async function boXemTruoc() {
  BO.xem.clearLayers(); $("boTT").textContent = T("đang tạo…");
  try {
    BO.pts = await boSinh();
    BO.pts.slice(0, 20000).forEach(q => L.circleMarker([q.lat, q.lon], {renderer: cvs, radius: 3, color: "#f79009", weight: 1, fillColor: "#fff", fillOpacity: 0.9, interactive: false, pmIgnore: true}).addTo(BO.xem));
    $("boTT").textContent = T("{n} điểm (xem trước màu cam trên bản đồ)", {n: BO.pts.length}) + (BO.pts.length > 5000 ? " · " + T("nhiều điểm: cân nhắc tăng bước lưới hoặc giảm số điểm") : "");
  } catch (e) { BO.pts = null; $("boTT").textContent = T("lỗi: ") + (e.message || e); }
}
async function boTao() {
  const nam = boNamDaChon();
  if (!nam.length) { $("boTT").textContent = T("chọn ít nhất một năm cần gán"); return; }
  if (BO.kieu === "sua") {
    const c = Object.assign({}, boCfg() || {}, {nam: nam});
    if (c.tu_tao && $("boTen").value.trim()) c.ten = $("boTen").value.trim();
    ST.bo_cfg[ST.bo] = c; save(); $("dlgBo").close(); buildSetSelect(); render();
    msg(T("đã lưu các năm cần gán của bộ {b}: {n} năm", {b: c.ten || ST.bo, n: nam.length}), "ok", 3000); return;
  }
  const cach = $("boCach").value;
  let pts = [];
  if (cach !== "trong") { if (!BO.pts) await boXemTruoc(); if (!BO.pts) return; pts = BO.pts; }
  if (pts.length > 5000 && !confirm(T("Tạo {n} điểm?", {n: pts.length}))) return;
  const ten = $("boTen").value.trim() || T("bộ mới");
  let tham = {cach: cach};
  if (cach === "luoi" || cach === "lech") tham.buoc_m = +$("boBuoc").value;
  if (cach === "nn") { tham.n = +$("boN").value; tham.cach_nhau_m = +$("boDmin").value; }
  if (cach === "pt") { tham.ban_do = $("boLopBD").value; tham.nam_ban_do = +$("boNamBD").value; tham.n_moi_lop = +$("boNLop").value; tham.cach_nhau_m = +$("boDmin").value; }
  let pvTen = ""; try { if (cach !== "trong") pvTen = boPhamVi().ten; } catch (e) { /* bộ trống */ }
  BO.xem.clearLayers(); BO.pts = null; $("dlgBo").close();
  taoBoTuDiem(ten, nam, pts, {cach, tham_so: tham, pham_vi: pvTen});
}
/* tạo một bộ điểm tự tạo từ danh sách {lon, lat, tang?, nam_bd?, lop_bd?, osm?, nhan?: {nam: mã}} (dùng chung: lưới, OSM...) */
function taoBoTuDiem(ten, nam, pts, meta) {
  const goc = boSlug(ten) || "bo";
  let id = goc, k = 2;
  while (ST.bo_cfg[id] || (MAN && MAN.point_sets.some(x => x.id === id)) || id === "tay" || id === "vung") id = goc + "_" + k++;
  ST.bo_cfg[id] = Object.assign({ten, nam, tu_tao: true, tao_luc: new Date().toISOString()}, meta || {});
  const w = String(pts.length).length, now = Date.now();
  pts.forEach((q, i) => {
    const pid = `${id}-${String(i + 1).padStart(Math.max(3, w), "0")}`, p = CORE.newPoint(pid, q.lon, q.lat, {bo: id});
    if (q.tang != null) { p.tang = q.tang; if (q.lop_bd && /^lulc/.test(q.lop_bd)) p.goi_y[q.nam_bd] = q.tang; }
    if (q.osm) p.osm = q.osm;
    Object.entries(q.nhan || {}).forEach(([y, ma]) => { CORE.setLabel(p, +y, ma, now); p.tin[y] = 1; });
    ST.diem[pid] = p;
  });
  ST.bo = id; ST.cur = null;
  if (!years().includes(ST.nam)) ST.nam = years()[0];
  save(); buildSetSelect(); render();
  msg(!pts.length ? T('đã tạo bộ trống "{t}": bật Thêm điểm (m) rồi nhấp lên bản đồ', {t: ten}) :
      T('đã tạo bộ "{t}": {n} điểm, gán {k} năm', {t: ten, n: pts.length, k: nam.length}), "ok", 6000);
  if (pts.length) { const b = L.latLngBounds(pts.map(q => [q.lat, q.lon])); map.fitBounds(b, {maxZoom: 15, padding: [30, 30]}); }
  return id;
}
function boXoa() {
  const c = boCfg(); if (!c || !c.tu_tao) return;
  const P = Object.values(ST.diem).filter(p => p.bo === ST.bo), nl = P.reduce((s, p) => s + Object.keys(p.nhan).length, 0);
  if (!confirm(T("Xoá bộ {t}: {n} điểm, {k} nhãn đã gán? (nên xuất tệp tiến độ JSON trước)", {t: c.ten, n: P.length, k: nl}))) return;
  P.forEach(p => { delete ST.diem[p.id]; });
  delete ST.bo_cfg[ST.bo]; ST.bo = ""; ST.cur = null;
  const s = new Set(Object.values(ST.diem).map(p => p.bo)); ST.bo = [...s][0] || (MAN && MAN.point_sets[0] ? MAN.point_sets[0].id : "");
  save(); $("dlgBo").close(); buildSetSelect(); render();
}
map.on("click", e => {                     // vẽ hình chữ nhật: hai lần nhấp
  if (!BO_VE) return;
  BO_VE.push([e.latlng.lng, e.latlng.lat]);
  if (BO_VE.length === 1) { msg(T("nhấp góc đối diện"), "ok", 3000); return; }
  const a = BO_VE[0], b = BO_VE[1];
  BO.hcn = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  BO_VE = null; map.getContainer().style.cursor = "";
  if (BO.khung) map.removeLayer(BO.khung);
  BO.khung = L.rectangle([[BO.hcn[1], BO.hcn[0]], [BO.hcn[3], BO.hcn[2]]], {color: "#f79009", weight: 2, fill: false, dashArray: "6 4", interactive: false, pmIgnore: true}).addTo(map);
  $("dlgBo").showModal(); boHien();
});
$("bBoMoi").onclick = () => boMo("moi");
$("bBoSua").onclick = () => boMo("sua");
$("boCach").onchange = () => { BO.pts = null; BO.xem.clearLayers(); boHien(); };
$("boPV").onchange = () => { BO.pts = null; BO.xem.clearLayers(); boHien(); };
["boBuoc", "boN", "boNLop", "boDmin", "boLopBD", "boNamBD", "boXa", "boVung"].forEach(id => { $(id).addEventListener("change", () => { BO.pts = null; }); });
$("boVe").onclick = () => {
  if (typeof VG !== "undefined" && VG.mode) vgBat(false);
  if (addMode) $("bMode").click();
  BO_VE = []; $("dlgBo").close(); map.getContainer().style.cursor = "crosshair";
  msg(T("nhấp góc thứ nhất của hình chữ nhật trên bản đồ"), "ok", 4000);
};
$("boThemNamB").onclick = () => {
  const y = Math.round(+$("boThemNam").value); if (!(y >= 1985 && y <= 2100)) return;
  const box = $("boNamChon"), ex = box.querySelector(`input[value="${y}"]`);
  if (ex) { ex.checked = true; return; }
  const lb = document.createElement("label"); lb.innerHTML = `<input type="checkbox" value="${y}" checked> ${y}`;
  const ins = [...box.querySelectorAll("label")].find(l => +l.querySelector("input").value > y);
  box.insertBefore(lb, ins || box.querySelector("button")); $("boThemNam").value = "";
};
$("boXem").onclick = boXemTruoc;
$("boOk").onclick = boTao;
$("boXoa").onclick = boXoa;
$("boDong").onclick = () => { $("dlgBo").close(); };
$("dlgBo").addEventListener("close", () => { if (!BO_VE) { BO.xem.clearLayers(); if (BO.khung) { map.removeLayer(BO.khung); BO.khung = null; } } });
