/* =============================== BẢN 3.4 =============================== */
/* Ảnh trực tuyến nhiều nguồn: ngoài Sentinel-2 (AWS) có thêm Landsat 4-9 Collection 2 Level-2 (30 m, từ 1984) và Sentinel-1 RTC
   (radar VV, VH đã hiệu chỉnh địa hình, 10 m, từ 2015), cả hai lấy từ Microsoft Planetary Computer, đọc và ghép ngay trong trình duyệt
   như S2 trực tuyến. Mỗi nguồn giữ một kế hoạch cảnh riêng (ST.s2oKho); kế hoạch đang dùng là ST.s2o.
   Landsat: băng quy về tên S2 (B2 lam, B3 lục, B4 đỏ, B8 NIR, B11, B12 SWIR) nên các chỉ số dùng chung; che mây theo QA_PIXEL.
   Sentinel-1: không có mây; ghép trung vị nhiều cảnh để giảm nhiễu đốm; giá trị hiện bằng dB; chỉ số riêng cho radar. */
function s2oNg() { const K = s2oKH(); return (K && K.cfg && K.cfg.nguon) || "s2"; }
Object.defineProperty(S2OC, "BANG", {configurable: true, get: () => S2OC.NGUON[s2oNg()].bang});   // băng của nguồn đang dùng
var S2O_NG_TEN = {
  s2: {ten: "Sentinel-2 trực tuyến (AWS): ảnh ghép theo năm, tổ hợp màu, chỉ số", ten_ru: "Sentinel-2 онлайн (AWS): годовой композит, синтезы, индексы", ten_en: "Sentinel-2 online (AWS): yearly composite, colour composites, indices", ngan: "Sentinel-2 AWS"},
  ls: {ten: "Landsat trực tuyến (Planetary Computer): ảnh ghép theo năm, tổ hợp màu, chỉ số", ten_ru: "Landsat онлайн (Planetary Computer): годовой композит, синтезы, индексы", ten_en: "Landsat online (Planetary Computer): yearly composite, colour composites, indices", ngan: "Landsat PC"},
  s1: {ten: "Sentinel-1 radar trực tuyến (Planetary Computer): ảnh ghép VV, VH theo năm", ten_ru: "Sentinel-1 радар онлайн (Planetary Computer): годовой композит VV, VH", ten_en: "Sentinel-1 radar online (Planetary Computer): yearly VV, VH composite", ngan: "Sentinel-1 PC"}};
var _s2oL034 = s2oL0;
s2oL0 = function () { const L0 = _s2oL034(); return L0 ? Object.assign(L0, S2O_NG_TEN[s2oNg()], {ngan: undefined}) : L0; };
function s2oNguonKH(cfg) {
  const ng = cfg.nguon || "s2";
  return ng === "ls" ? "Microsoft Planetary Computer, landsat-c2-l2" : ng === "s1" ? "Microsoft Planetary Computer, sentinel-1-rtc" : "Element 84 Earth Search, " + cfg.bo;
}
function s2oTenTCI() { const ng = s2oNg(); return ng === "s1" ? "VV, VH, VV/VH (radar)" : ng === "ls" ? "màu thật 4-3-2" : "màu thật của ESA (nhanh)"; }
function s2oDonVi() { return s2oNg() === "s1" ? "tán xạ ngược γ⁰, dB" : "phản xạ × 10000"; }
function s2oNguonDiem(px) {
  const ng = s2oNg();
  return ng === "s1" ? T("Sentinel-1 RTC trên Planetary Computer, trung vị các cảnh đã ghép tại điểm ({px} m)", {px})
    : ng === "ls" ? T("Landsat C2 L2 trên Planetary Computer, trung vị các cảnh đã ghép quang đãng tại điểm ({px} m)", {px: Math.max(30, px)})
    : T("Sentinel-2 L2A trên AWS, trung vị các cảnh đã ghép quang đãng tại điểm ({px} m)", {px});
}
function s2oDB(v) { return v > 0 ? 10 * Math.log10(v / 10000) : null; }      // giá trị lưu (γ⁰ × 10000) -> dB
function s2oBV(b, v) { return s2oNg() === "s1" ? s2oDB(v) : v; }
function s2oFmtB(b, v) { if (v == null || !isFinite(v)) return "-"; return s2oNg() === "s1" ? (s2oDB(v) == null ? "-" : s2oDB(v).toFixed(1) + " dB") : Math.round(v); }

/* ---------- chỉ số: S2 và Landsat dùng thư viện chỉ số chung; Sentinel-1 có bộ riêng ---------- */
var S1CS = [
  {id: "s1_vv", ten: "VV (dB)", lo: -25, hi: 0, mau: "viridis", bang: ["VV"], g: v => s2oDB(v.VV)},
  {id: "s1_vh", ten: "VH (dB)", lo: -30, hi: -5, mau: "viridis", bang: ["VH"], g: v => s2oDB(v.VH)},
  {id: "s1_ti", ten: "VH/VV", lo: 0, hi: 0.6, mau: "viridis", bang: ["VV", "VH"], g: v => v.VV > 0 && v.VH > 0 ? v.VH / v.VV : null},
  {id: "s1_rvi", ten: "RVI = 4·VH/(VV+VH)", lo: 0, hi: 1.5, mau: "ndvi", bang: ["VV", "VH"], g: v => v.VV > 0 && v.VH > 0 ? 4 * v.VH / (v.VV + v.VH) : null},
  {id: "s1_hieu", ten: "VV−VH (dB)", lo: 0, hi: 15, mau: "viridis", bang: ["VV", "VH"], g: v => v.VV > 0 && v.VH > 0 ? 10 * Math.log10(v.VV / v.VH) : null}];
S1CS.forEach(c => { c.f = Object.assign(() => null, {bang: c.bang}); c.s1 = true; });
function s2oCS() {
  if (s2oNg() === "s1") return S1CS;
  const ds = typeof csDS === "function" ? csDS() : [];
  if (s2oNg() !== "ls") return ds;
  const co = new Set(S2OC.NGUON.ls.bang);                                     // Landsat: chỉ các chỉ số đủ băng
  return ds.filter(c => c.f && (c.f.bang || []).every(b => co.has(b)));
}
function s2oCsLay(id) {
  if (s2oNg() === "s1") return S1CS.find(c => c.id === id) || S1CS[3];
  const c = csLay(id) || csLay("NDVI"); if (s2oNg() !== "ls") return c;
  const co = new Set(S2OC.NGUON.ls.bang); return c && c.f && (c.f.bang || []).every(b => co.has(b)) ? c : csLay("NDVI");
}
function s2oTinh(c, vm) {                           // vm: {băng: giá trị × 10000}
  if (!c) return null;
  if (c.s1) { const x = c.g(vm); return x == null || !isFinite(x) ? null : x; }
  return csTinh(c, s2Bang().map(b => vm[b] == null ? NaN : vm[b]));
}
var LS_DOI = {B8A: "B8", B5: "B8", B6: "B8", B7: "B8"};                     // tổ hợp S2 dùng băng Landsat không có: đổi sang băng gần nhất
var _s2oCanBang34 = s2oCanBang;
s2oCanBang = function () {
  const ng = s2oNg();
  if (ng === "s1") return S2OV.mode === "idx" ? s2oCsLay(S2OV.chi).bang.slice() : ["VV", "VH"];
  if (ng === "ls") {
    if (S2OV.mode === "tci") return ["B4", "B3", "B2"];
    if (S2OV.mode === "idx") { const c = s2oCsLay(S2OV.chi); const b = c && c.f ? c.f.bang.filter(q => S2OC.BANG.includes(q)) : []; return b.length ? b : ["B4", "B8"]; }
    return _s2oCanBang34().map(b => S2OC.BANG.includes(b) ? b : LS_DOI[b] || "B4");
  }
  if (S2OV.mode === "idx") { const c = s2oCsLay(S2OV.chi); const b = c && c.f ? c.f.bang.filter(q => S2OC.BANG.includes(q)) : []; return b.length ? b : ["B4", "B8"]; }
  return _s2oCanBang34();
};
s2oTo = function (vals, bang, w, h) {               // giá trị ghép -> RGBA (mọi nguồn)
  const out = new Uint8ClampedArray(w * h * 4), nb = bang[0] === "TCI" ? 3 : bang.length, g = Math.max(0.1, +S2OV.gain || 1), ng = s2oNg();
  const cs = S2OV.mode === "idx" ? s2oCsLay(S2OV.chi) : null, lt = cs ? lut2(cs.mau || "ndvi") : null, vm = {};
  const s1 = ng === "s1" && !cs, keo = (q, x) => Math.round(255 * Math.max(0, Math.min(1, x)));
  for (let k = 0; k < w * h; k++) {
    const o = k * 4;
    if (bang[0] === "TCI") { const r = vals[k * 3]; if (r !== r) continue; for (let q = 0; q < 3; q++) out[o + q] = Math.min(255, vals[k * 3 + q] * g); out[o + 3] = 255; continue; }
    let z = false; for (let q = 0; q < nb; q++) if (vals[k * nb + q] !== vals[k * nb + q]) { z = true; break; } if (z) continue;
    if (cs) { for (let q = 0; q < nb; q++) vm[bang[q]] = vals[k * nb + q]; const x = s2oTinh(cs, vm); if (x == null || !isFinite(x)) continue;
      const t = Math.max(0, Math.min(1, (x - cs.lo) / (cs.hi - cs.lo))), c = lt[1 + Math.round(t * 254)]; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; continue; }
    if (s1) {                                        // R = VV [−20, 0] dB, G = VH [−27, −7] dB, B = VV/VH [0, 15] dB
      const vv = s2oDB(vals[k * nb]), vh = s2oDB(vals[k * nb + 1]); if (vv == null || vh == null) continue;
      out[o] = keo(0, (vv + 20) / 20 * g); out[o + 1] = keo(1, (vh + 27) / 20 * g); out[o + 2] = keo(2, (vv - vh) / 15 * g); out[o + 3] = 255; continue; }
    for (let q = 0; q < 3; q++) { const kg = S2O.keo[bang[q]] || [0, 3000]; out[o + q] = keo(q, (vals[k * nb + q] - kg[0]) / ((kg[1] - kg[0]) / g)); }
    out[o + 3] = 255;
  }
  return out;
};
/* tên lớp mặt nạ tại điểm theo nguồn */
var _s2oSclTen34 = s2oSclTen;
s2oSclTen = function (v, r) {
  const ng = s2oNg();
  if (ng === "s2") return _s2oSclTen34(v);
  if (ng === "ls" && r && r.v && r.v.B2 > S2OC.SANG && S2OC.quang("ls", v)) return T("mây sáng (QA_PIXEL bỏ sót)");
  if (!(v > 0)) return T("không có dữ liệu");
  if (ng === "s1") return T("có dữ liệu");
  return (v & 1) ? T("không có dữ liệu") : (v & 8) ? T("mây") : (v & 16) ? T("bóng mây") : (v & 4) ? T("mây ti") : (v & 2) ? T("mây (vùng giãn)") : (v & 32) ? T("tuyết") : (v & 128) ? T("nước") : T("quang đãng");
};
/* nhóm đồ thị theo năm: tên theo nguồn */
NHOM_NAM.filter(g => g.id === "s2oidx" || g.id === "s2o").forEach(g => {
  const cu = g.ten;
  Object.defineProperty(g, "ten", {configurable: true, get: () => {
    const ng = s2oNg(); if (ng === "s2") return cu;
    return {ls: {s2oidx: "Landsat trực tuyến: chỉ số theo năm và theo cảnh (tại điểm)", s2o: "Landsat trực tuyến: 6 băng theo năm và theo cảnh (tại điểm)"},
            s1: {s2oidx: "Sentinel-1 trực tuyến: chỉ số radar theo năm và theo cảnh (tại điểm)", s2o: "Sentinel-1 trực tuyến: VV, VH (dB) theo năm và theo cảnh (tại điểm)"}}[ng][g.id];
  }});
});
S2O_HIEN_MAC.s2o = ["B4", "B8", "B11", "VV", "VH"];
/* nút đọc giá trị tại điểm và dòng nguồn khi xuất bản đồ */
if (typeof giaTriTai === "function") {
  const _gtt34 = giaTriTai;
  giaTriTai = async function (ll) {
    const r = await _gtt34(ll), ng = s2oNg(); if (ng === "s2") return r;
    const tn = ng === "ls" ? "Landsat" : "Sentinel-1";
    r.forEach(row => { if (/data-s2odoc/.test(row[1] || "")) { row[0] = T("{t} trực tuyến {y}", {t: tn, y: ST.nam}); row[1] = row[1].replace(/>[^<]*<\/button>/, `>${T("đọc các băng tại điểm")}</button>`); } });
    return r;
  };
}
if (typeof xbNguonMac === "function") {
  const _xbNg34 = xbNguonMac;
  xbNguonMac = function () {
    let s = _xbNg34.apply(this, arguments); const ng = s2oNg();
    if (ng === "s2" || !(OVL.s2o && OVL.s2o.on)) return s;
    s = s.replace("; Copernicus Sentinel-2 (ESA), AWS Open Data", "");
    return s + (ng === "ls" ? "; Landsat Collection 2 Level-2 (USGS), Microsoft Planetary Computer" : "; Copernicus Sentinel-1 RTC (ESA), Microsoft Planetary Computer");
  };
}
/* lỗi đọc ô: ghi đúng tên nguồn */
S2OLayer.prototype.createTile = function (coords, done) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  s2oVe(this._y, CORE.tileBbox(coords.z, coords.x, coords.y), 256, 256, c).then(() => done(null, c))
    .catch(e => { this._err = (this._err || 0) + 1; if (this._err === 3) olMsg(T("không đọc được {l}: {e}", {l: S2O_NG_TEN[s2oNg()].ngan, e: e.message || e})); done(null, c); });
  return c;
};

/* ---------- bảng kế hoạch: chọn nguồn, mỗi nguồn một kế hoạch ---------- */
if (!ST.s2oKho || typeof ST.s2oKho !== "object") ST.s2oKho = {};
function s2oKhoLuu() { const K = s2oKH(); if (K) ST.s2oKho[(K.cfg && K.cfg.nguon) || "s2"] = K; }
s2oKhoLuu();
var _s2oCfgDoc34 = s2oCfgDoc;
s2oCfgDoc = function () {
  const c = _s2oCfgDoc34(); c.nguon = s2o$("s2oNguon") ? s2o$("s2oNguon").value : "s2"; c.boL7 = s2o$("s2oL7") ? s2o$("s2oL7").checked : true;
  if (c.nguon === "s1") c.che = false;
  return c;
};
function s2oHienNg(ng) {
  const P = s2o$("s2oP"); if (!P) return;
  P.querySelectorAll("[data-ng]").forEach(e => { e.hidden = !e.dataset.ng.split(" ").includes(ng); });
  const b = P.querySelector(".vg-dau b"); if (b) b.textContent = "⠿ " + T({s2: "Sentinel-2 trực tuyến", ls: "Landsat trực tuyến", s1: "Sentinel-1 trực tuyến"}[ng]);
}
var _s2oDien34 = s2oDien;
s2oDien = function (ngChon) {
  const K = s2oKH(), ng = ngChon || (K && K.cfg.nguon) || (s2o$("s2oNguon") && s2o$("s2oNguon").value) || "s2";
  const K2 = ST.s2oKho[ng] || (K && (K.cfg.nguon || "s2") === ng ? K : null);
  const cu = ST.s2o; ST.s2o = K2;                     // điền cấu hình của kế hoạch nguồn này (nếu có), rồi trả lại kế hoạch đang dùng
  try { _s2oDien34(); } finally { ST.s2o = cu; }
  const n0 = S2OC.NGUON[ng].nam0, ny = new Date().getFullYear();
  const nm = Array.from({length: ny - n0 + 1}, (_, i) => `<option value="${n0 + i}">${n0 + i}</option>`).join("");
  const c = K2 ? K2.cfg : {nam: [ny - 6, ny]};
  s2o$("s2oN1").innerHTML = nm; s2o$("s2oN2").innerHTML = nm;
  s2o$("s2oN1").value = Math.max(n0, Math.min(ny, c.nam[0])); s2o$("s2oN2").value = Math.max(n0, Math.min(ny, c.nam[1]));
  if (s2o$("s2oNguon")) s2o$("s2oNguon").value = ng;
  if (s2o$("s2oL7")) s2o$("s2oL7").checked = !(K2 && K2.cfg.boL7 === false);
  s2oHienNg(ng);
};
function s2oDoiNguon(ng) {                          // đổi nguồn: cất kế hoạch đang dùng, lấy kế hoạch đã có của nguồn mới (nếu có)
  s2oKhoLuu(); S2O.tok++; S2O.mat = {};
  const moi = ST.s2oKho[ng] || null, cu = s2oKH();
  if ((cu && (cu.cfg.nguon || "s2")) !== ng) {
    ST.s2o = moi; if (S2OV.mode === "idx" && !s2oCS().some(c => c.id === S2OV.chi)) S2OV.chi = (s2oCS()[0] || {}).id || "NDVI";
    if (ng === "s1" && S2OV.mode === "rgb") S2OV.mode = "tci";
    ls("laymau_hp_s2ov_v1", S2OV); save(); s2oSauDoi(!!moi);
  }
  s2oDien(ng); s2oBang(); s2o$("s2oTT").textContent = "";
}
var _s2oTim34 = s2oTim;
s2oTim = async function () {
  const ng = s2oCfgDoc().nguon;
  if ((s2oNg()) !== ng) { s2oKhoLuu(); ST.s2o = null; }
  await _s2oTim34.apply(this, arguments);
  s2oKhoLuu(); save();
};
(function () {
  const sel = s2o$("s2oNguon"); if (!sel) return;
  sel.addEventListener("change", () => s2oDoiNguon(sel.value));
  if (s2o$("s2oTim")) s2o$("s2oTim").onclick = s2oTim;
  s2oHienNg(s2oNg());
})();
/* s2ovUI: với S1 ẩn tổ hợp màu S2 (chỉ còn ảnh VV, VH, VV/VH và chỉ số radar) */
var _s2ovUI34 = s2ovUI;
s2ovUI = function (div) {
  _s2ovUI34(div);
  const ng = s2oNg();
  if (ng === "s1") { const o = div.querySelector('[data-k="mode"] option[value="rgb"]'); if (o) o.remove(); }
  if (ng === "ls") div.querySelectorAll('[data-k="pre"] option').forEach(o => { if (o.value === "128a4") o.textContent = o.textContent.replace("8A", "8"); });
};
if (typeof phienNhap === "function") {              // tệp tiến độ: nhận kho kế hoạch theo nguồn
  const _phienNhap34 = phienNhap;
  phienNhap = async function (j) {
    const kho = j && j.st && j.st.s2oKho; if (kho) Object.entries(kho).forEach(([k, v]) => { if (!ST.s2oKho[k] && v && v.nam) ST.s2oKho[k] = v; });
    return _phienNhap34(j);
  };
}

/* ---------- bản 3.4.1: dải ảnh nhanh chọn cảnh quang đãng nhất CẢ KHUNG quanh điểm, không chỉ đúng điểm ---------- */
/* Trước: lấy cảnh đầu tiên quang đãng đúng tại điểm rồi vẽ không che mây, nên khung quanh điểm vẫn có thể trắng mây; cảnh Landsat
   có hộp bao rộng hơn phần có dữ liệu (ảnh xoay) nên có khi vẽ ra ô trống. Nay chấm 7 × 7 điểm trong khung (mặt nạ + độ sáng lam
   với Landsat) cho cảnh đã ghép, thiếu thì xét thêm cảnh ứng viên; cảnh tốt nhất quang ≥ 85 % khung thì vẽ đúng cảnh đó, không thì
   ghép trung vị có che mây vài cảnh tốt nhất. Không cảnh nào phủ khung: ghi chữ thay vì để ô trắng. */
var S2O_CHON_DAI = new Map();
async function s2oChonDai(y, bb, diem) {
  const K = s2oKH(), N = K && K.nam[y]; if (!N) return [];
  const key = [s2oKyKH(), y, bb.map(v => Math.round(v)).join()].join("|"); if (S2O_CHON_DAI.has(key)) return S2O_CHON_DAI.get(key);
  const a = S2OC.m2ll(bb[0], bb[1]), c = S2OC.m2ll(bb[2], bb[3]), pts = [];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) pts.push([a[0] + (i + 0.5) / 7 * (c[0] - a[0]), a[1] + (j + 0.5) / 7 * (c[1] - a[1])]);
  const luoi = {pts, o: (bb[2] - bb[0]) / 7}, iTam = 24;
  const by = {}; (N.ung || []).forEach(s => { by[s.id] = s; });
  const phu = s => !s.bb || (s.bb[0] <= c[0] && s.bb[2] >= a[0] && s.bb[1] <= c[1] && s.bb[3] >= a[1]);
  const chon = (N.chon || []).map(id => by[id]).filter(s => s && phu(s)), khac = (N.ung || []).filter(s => !N.chon.includes(s.id) && phu(s)).sort((x, z) => (z.ro || 0) - (x.ro || 0));
  const kq = [];
  const cham = async ds => { for (let i = 0; i < ds.length; i += 4) await Promise.all(ds.slice(i, i + 4).map(async sc => {
    try { const m = await S2OC.matNa(sc, luoi); let q = 0, co = 0; for (const v of m) { if (v) co++; if (v === 2) q++; }
      kq.push({sc, q: q / m.length, co: co / m.length, tam: m[iTam] === 2}); } catch (e) { /* bỏ cảnh lỗi */ } })); };
  await cham(chon);
  const tot = () => kq.slice().sort((x, z) => (z.q - x.q) || (z.tam - x.tam))[0];
  if (!tot() || tot().q < 0.85) await cham(khac.slice(0, 10));
  const xep = kq.filter(r => r.co > 0).sort((x, z) => (z.q - x.q) || (z.tam - x.tam) || (x.sc.ngay < z.sc.ngay ? -1 : 1));
  S2O_CHON_DAI.set(key, xep); if (S2O_CHON_DAI.size > 600) S2O_CHON_DAI.delete(S2O_CHON_DAI.keys().next().value);
  return xep;
}
var _s2oVe34 = s2oVe;
s2oVe = async function (y, bb, w, h, canvas, opt) {
  if (!(opt && opt.diem) || s2oMotCanh(y)) return _s2oVe34.apply(this, arguments);
  const xep = await s2oChonDai(y, bb, opt.diem), ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!xep.length) { if (ctx) { ctx.fillStyle = "#667085"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(T("không có cảnh phủ"), w / 2, h / 2 - 8); } return null; }
  const mot = xep[0].q >= 0.85, ds = mot ? [xep[0].sc] : xep.filter(r => r.q > 0).slice(0, 4).map(r => r.sc);
  const bang = s2oCanBang(), vals = await S2OC.ghep(ds.length ? ds : [xep[0].sc], bang, bb, w, h, !mot && ds.length > 0);
  const px = s2oTo(vals, bang, w, h);
  if (ctx) { const img = ctx.createImageData(w, h); img.data.set(px); ctx.putImageData(img, 0, 0);
    if (!mot) { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(w - 16, h - 12, 16, 12); ctx.fillStyle = "#fff"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("∑" + ds.length, w - 8, h - 3); } }
  return px;
};
