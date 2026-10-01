/* =============================== BẢN 3.2 =============================== */
/* Sentinel-2 trực tuyến: ① R-G-B tuỳ chọn 10 băng, xem MỘT cảnh theo ngày (bên cạnh ảnh ghép trung vị);
   ② đọc từng cảnh tại điểm (SCL: quang đãng hay mây ở đúng điểm đó), giá trị tại điểm liệt kê cảnh nào được dùng;
   ③ đồ thị theo năm "S2 trực tuyến": mỗi năm một giá trị trung vị các cảnh đã ghép quang đãng tại điểm, nếu các cảnh đó đều mây
      tại điểm thì thay bằng cảnh ứng viên quang đãng (mỗi năm ít nhất một giá trị khi có), kèm chấm từng cảnh theo ngày trong năm
      để thấy điểm đổi giữa năm;
   ④ ghi ảnh đã xem khi gán nhãn (cảnh S2, ngày, quang đãng tại điểm, ảnh nền Wayback, lớp đang bật): cột "anh" trong CSV. */

/* ---------------- ① đổi băng, một cảnh ---------------- */
S2OV = Object.assign({r: "B8", g: "B4", b: "B3", nguon: "ghep", canh: {}, cv10: false, tatCa: false}, S2OV);
if (!S2OV.canh || typeof S2OV.canh !== "object") S2OV.canh = {};
var S2O_SCL = {0: "không có dữ liệu", 1: "bão hoà, lỗi", 2: "vùng tối", 3: "bóng mây", 4: "thực vật", 5: "không thực vật", 6: "nước", 7: "chưa phân loại",
               8: "mây", 9: "mây dày", 10: "mây ti", 11: "tuyết"};
var _s2oCanBang32 = s2oCanBang;
s2oCanBang = function () {
  if (S2OV.mode === "rgb" && S2OV.pre === "tu") return [S2OV.r, S2OV.g, S2OV.b].map(b => S2OC.BANG.includes(b) ? b : "B4");
  return _s2oCanBang32();
};
function s2oMotCanh(y) {                            // cảnh đang xem khi nguồn là "một cảnh": cảnh đã chọn tay, không thì cảnh đã ghép quang đãng nhất
  if (S2OV.nguon !== "canh") return null;
  const K = s2oKH(), N = K && K.nam[y]; if (!N) return null;
  const id = S2OV.canh[y] && (N.ung || []).some(s => s.id === S2OV.canh[y]) ? S2OV.canh[y] : (N.chon || [])[0];
  return (N.ung || []).find(s => s.id === id) || null;
}
function s2oPhuDiem(sc, lon, lat) { return !sc.bb || (lon >= sc.bb[0] && lon <= sc.bb[2] && lat >= sc.bb[1] && lat <= sc.bb[3]); }
function s2oTrongKH(p) { const K = s2oKH(); if (!K || !K.pv || !K.pv.bl || !s2oL0()) return false; const b = K.pv.bl; return p.lon >= b[0] && p.lon <= b[2] && p.lat >= b[1] && p.lat <= b[3]; }
s2oVe = async function (y, bb, w, h, canvas, opt) {
  const a = S2OC.m2ll(bb[0], bb[1]), c = S2OC.m2ll(bb[2], bb[3]), mot = s2oMotCanh(y);
  let ds = (mot ? [mot] : s2oCanh(y)).filter(s => !s.bb || (s.bb[0] <= c[0] && s.bb[2] >= a[0] && s.bb[1] <= c[1] && s.bb[3] >= a[1]));
  if (!ds.length) return null;
  const K = s2oKH();
  if (!mot && opt && opt.diem) { let m1 = null; for (const sc of ds) { try { if (await S2OC.trongTaiDiem(sc, opt.diem[0], opt.diem[1])) { m1 = sc; break; } } catch (e) { /* bỏ */ } } ds = [m1 || ds[0]]; }
  const bang = s2oCanBang(), vals = await S2OC.ghep(ds, bang, bb, w, h, !mot && K.cfg.che !== false && !(opt && opt.diem));   // một cảnh: hiện cả mây để thấy rõ
  const px = s2oTo(vals, bang, w, h);
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (ctx) { const img = ctx.createImageData(w, h); img.data.set(px); ctx.putImageData(img, 0, 0); }
  return px;
};
s2ovUI = function (div) {
  const opt = (a, sel) => a.map(([v, t]) => `<option value="${esc(String(v))}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`).join("");
  const chi = (typeof csDS === "function" ? csDS() : []).map(c => [c.id, c.ten]), BS = S2OC.BANG.map(b => [b, b]);
  const pres = Object.keys(S2O_PRE).filter(k => S2_PRE_TEN[k]).map(k => [k, T(S2_PRE_TEN[k])]).concat([["tu", T(S2_PRE_TEN.tu || "tuỳ chọn R-G-B")]]);
  const K = s2oKH(), N = K && K.nam[ST.nam], ung = N ? (N.ung || []).slice().sort((x, z) => x.ngay < z.ngay ? -1 : 1) : [], mot = s2oMotCanh(ST.nam);
  const canhOpt = ung.length ? ung.map(s => [s.id, `${s.ngay} · ${T("mây cảnh")} ${s.may} % · ${T("quang đãng")} ${Math.round(100 * (s.ro || 0))} %${N.chon.includes(s.id) ? " ★" : ""}`]) : [["", T("không có năm {y}", {y: ST.nam})]];
  div.setAttribute("data-noi18n", "");
  div.innerHTML = `<div class="row sm"><select data-k="mode">${opt([["tci", T("màu thật của ESA (nhanh)")], ["rgb", T("tổ hợp màu")], ["idx", T("chỉ số")]], S2OV.mode)}</select>
    <select data-k="pre" data-show="rgb">${opt(pres, S2OV.pre)}</select>
    <span data-show="tu">R <select data-k="r">${opt(BS, S2OV.r)}</select> G <select data-k="g">${opt(BS, S2OV.g)}</select> B <select data-k="b">${opt(BS, S2OV.b)}</select></span>
    <select data-k="chi" data-show="idx">${opt(chi, S2OV.chi)}</select></div>
    <div class="row sm"><select data-k="nguon" title="${esc(T("ảnh ghép: trung vị các cảnh đã chọn, bỏ mây; một cảnh: đúng ảnh của một ngày, để biết nhãn lấy trên ảnh nào"))}">${opt([["ghep", T("ảnh ghép trung vị các cảnh đã chọn")], ["canh", T("một cảnh (chọn ngày)")]], S2OV.nguon)}</select>
    <select data-k="canh" data-show="canh">${opt(canhOpt, mot ? mot.id : "")}</select></div>
    <div class="row sm">${T("tương phản")} <input type="range" data-k="gain" min="0.5" max="3" step="0.1" value="${S2OV.gain}"> <button type="button" data-k="mo">${T("kế hoạch cảnh…")}</button></div>
    <div class="row sm"><label title="${esc(T("đồ thị theo năm đọc ảnh ở 20 m (nhẹ hơn khoảng 4 lần); bật để đọc đúng điểm ảnh 10 m"))}"><input type="checkbox" data-k="cv10"${S2OV.cv10 ? " checked" : ""}> ${T("đồ thị đọc 10 m")}</label>
    <label title="${esc(T("đồ thị theo năm đọc cả các cảnh ứng viên chưa ghép (dày hơn, chậm hơn)"))}"><input type="checkbox" data-k="tatCa"${S2OV.tatCa ? " checked" : ""}> ${T("đồ thị: cả cảnh ứng viên")}</label></div>
    <div class="mu sm">${esc(s2oTomTat())}</div>`;
  const upd = () => div.querySelectorAll("[data-show]").forEach(e => {
    const s = e.dataset.show; e.hidden = s === "tu" ? !(S2OV.mode === "rgb" && S2OV.pre === "tu") : s === "canh" ? S2OV.nguon !== "canh" : s !== S2OV.mode; });
  div.querySelectorAll("[data-k]").forEach(e => {
    const k = e.dataset.k;
    if (k === "mo") { e.onclick = () => s2oMo(true); return; }
    e.addEventListener("change", () => {
      if (k === "canh") S2OV.canh[ST.nam] = e.value;
      else S2OV[k] = e.type === "range" ? +e.value : e.type === "checkbox" ? e.checked : e.value;
      upd(); s2ovLuu();
      if (k === "nguon") s2ovUI(div);
      if (k === "cv10" || k === "tatCa") { CVS.kind === "nam" && /^s2o/.test(CVS.grp) && renderCurve(); }
    });
  });
  upd();
};
if (typeof setYear === "function") {                // đổi năm: cập nhật danh sách cảnh của năm trong lớp
  const _setYear32 = setYear;
  setYear = function (y) { _setYear32.apply(this, arguments); const d = document.querySelector("[data-s2ov]"); if (d && S2OV.nguon === "canh") s2ovUI(d); };
}

/* ---------------- ② đọc từng cảnh tại điểm ---------------- */
var S2OD = new Map();                               // id|px|lon,lat -> {scl, v: {băng: phản xạ × 10000}}
async function s2oDocCanh(sc, lon, lat, bang, px) {
  px = px || 10;
  const key = sc.id + "|" + px + "|" + lon.toFixed(6) + "," + lat.toFixed(6);
  let r = S2OD.get(key); if (!r) { r = {scl: null, v: {}}; S2OD.set(key, r); if (S2OD.size > 8000) S2OD.delete(S2OD.keys().next().value); }
  const can = ["SCL"].concat(bang || []).filter((b, i, a) => a.indexOf(b) === i && (b === "SCL" ? r.scl == null : !(b in r.v)));
  if (can.length) {
    const m = S2OC.ll2m(lon, lat), G = S2OC.luoiAnh(sc.epsg, [m[0] - px / 2, m[1] - px / 2, m[0] + px / 2, m[1] + px / 2], 1, 1);
    const vs = await Promise.all(can.map(b => S2OC.url(sc, b) ? S2OC.layMau(S2OC.url(sc, b), G, [0]) : Promise.resolve(null)));
    can.forEach((b, i) => { const d = vs[i] ? vs[i][0] : 0; if (b === "SCL") r.scl = d; else r.v[b] = d ? (d * sc.s + sc.o) * 10000 : null; });
  }
  return {sc, scl: r.scl, quang: !!S2OC.TRONG[r.scl], v: r.v};
}
async function s2oDocNhieu(ds, lon, lat, bang, px, lim) {   // đọc nhiều cảnh, mỗi lượt `lim` cảnh
  const out = new Array(ds.length); lim = lim || 4;
  for (let i = 0; i < ds.length; i += lim)
    await Promise.all(ds.slice(i, i + lim).map((sc, k) => s2oDocCanh(sc, lon, lat, bang, px).then(r => { out[i + k] = r; }).catch(() => { out[i + k] = {sc, scl: null, quang: false, v: {}, loi: true}; })));
  return out;
}
function s2oTrung(rs, b) { const a = rs.map(r => r.v[b]).filter(v => v != null && isFinite(v)); return a.length ? S2OC.trungVi(Float64Array.from(a), a.length) : null; }
function s2oSclTen(scl) { return T(S2O_SCL[scl] || "không có dữ liệu"); }
async function s2oDiemHTML(lon, lat, y) {          // dòng giá trị tại điểm: trung vị các cảnh đã ghép quang đãng tại điểm, kèm từng cảnh
  const K = s2oKH(), N = K && K.nam[y]; if (!N) throw new Error(T("không có cảnh"));
  const mot = s2oMotCanh(y), ds = (mot ? [mot] : s2oCanh(y)).filter(sc => s2oPhuDiem(sc, lon, lat));
  if (!ds.length) throw new Error(T("không có cảnh"));
  const rs = await s2oDocNhieu(ds, lon, lat, S2OC.BANG, 10), q = mot ? rs : rs.filter(r => r.quang);
  const med = {}; S2OC.BANG.forEach(b => { med[b] = s2oTrung(q, b); });
  const dn = s2Bang().map(b => med[b] == null ? NaN : med[b]), cs = typeof csDS === "function" ? csDS() : [];
  const canh = rs.map(r => `${r.sc.ngay}${N.chon.includes(r.sc.id) ? "" : "*"} <span style="color:${r.quang ? "#067647" : "#b42318"}">${r.quang ? "✓" : "✗"} ${esc(s2oSclTen(r.scl))}</span>`).join(" · ");
  if (!q.length) return `<span class="mu">${T("mọi cảnh đã ghép đều mây tại điểm: xem đồ thị theo năm (có thay bằng cảnh ứng viên)")}</span><br>${canh}`;
  return (mot ? `<b>${T("một cảnh")} ${mot.ngay}</b> · ` : `<b>${T("trung vị {n} cảnh quang đãng", {n: q.length})}</b> · `) +
    S2OC.BANG.map(b => `${b} ${med[b] == null ? "-" : Math.round(med[b])}`).join(" · ") +
    (cs.length ? "<br>" + cs.map(c => `${esc(c.ten)} <b>${gtSo(csTinh(c, dn))}</b>`).join(" · ") : "") + `<br><span class="sm">${T("cảnh:")} ${canh}</span>`;
}

/* ---------------- ③ đồ thị theo năm: trung vị theo năm và từng cảnh ---------------- */
NHOM_NAM.push(
  {id: "s2oidx", ten: "S2 trực tuyến: chỉ số theo năm và theo cảnh (tại điểm)", co: () => !!s2oL0()},
  {id: "s2o", ten: "S2 trực tuyến: 10 băng theo năm và theo cảnh (tại điểm)", co: () => !!s2oL0()});
var S2O_HIEN_MAC = {s2oidx: 1, s2o: ["B4", "B8", "B11"]};      // mặc định chỉ hiện (và đọc) vài đường để đỡ tải
function s2oAnDuong(grp, names) {                  // các đường bị ẩn; lần đầu: ẩn hết trừ vài đường mặc định
  if (!CVS.an[grp]) { const m = S2O_HIEN_MAC[grp]; CVS.an[grp] = names.filter((n, i) => Array.isArray(m) ? !m.includes(n) : i >= m); ls("laymau_hp_curve_v1", CVS); }
  return new Set(CVS.an[grp]);
}
function s2oKyKH() { const K = s2oKH(); return K ? (K.tao_luc || "") + "|" + Object.entries(K.nam).map(([y, N]) => y + ":" + (N.chon || []).join("+")).join(";") : ""; }
async function s2oChuoi(p, grp) {
  const K = s2oKH(), DS = grp === "s2oidx" ? csDS() : null, names = grp === "s2oidx" ? DS.map(c => c.ten) : S2OC.BANG.slice();
  const an = s2oAnDuong(grp, names), hien = names.filter(n => !an.has(n));
  const bang = grp === "s2oidx" ? [...new Set([].concat(...DS.filter(c => hien.includes(c.ten)).map(c => c.f.bang)))].filter(b => S2OC.BANG.includes(b)) : hien.filter(b => S2OC.BANG.includes(b));
  const px = S2OV.cv10 ? 10 : 20, ys = {}, canh = [], thay = {};
  const giaTri = r => { const dn = s2Bang().map(b => r.v[b] == null ? NaN : r.v[b]);
    return grp === "s2oidx" ? DS.map(c => hien.includes(c.ten) ? (x => x == null || !isFinite(x) ? null : x)(csTinh(c, dn)) : null) : names.map(b => hien.includes(b) && r.v[b] != null ? r.v[b] : null); };
  for (const y of Object.keys(K.nam).map(Number).sort((a, b) => a - b)) {
    const N = K.nam[y], by = {}; (N.ung || []).forEach(s => { by[s.id] = s; });
    const w = S2OC.cuaSo(y, K.cfg.thang).split("/").map(Date.parse), pos = s => Math.max(0, Math.min(1, (Date.parse(s.ngay + "T12:00:00Z") - w[0]) / (w[1] - w[0])));
    const chon = (N.chon || []).map(id => by[id]).filter(s => s && s2oPhuDiem(s, p.lon, p.lat));
    const khac = (N.ung || []).filter(s => !N.chon.includes(s.id) && s2oPhuDiem(s, p.lon, p.lat)).sort((a, b) => (b.ro || 0) - (a.ro || 0));
    const rs = await s2oDocNhieu(chon, p.lon, p.lat, bang, px);
    let q = rs.filter(r => r.quang), rk = [];
    if (S2OV.tatCa) rk = await s2oDocNhieu(khac, p.lon, p.lat, bang, px);
    if (!q.length) {                                // mỗi năm ít nhất một giá trị: cảnh ứng viên quang đãng tại điểm, quang đãng nhiều nhất trước
      let r1 = rk.find(r => r.quang);
      for (let i = 0; !r1 && i < Math.min(8, khac.length); i++) { const r = await s2oDocCanh(khac[i], p.lon, p.lat, [], px); if (r.quang) r1 = await s2oDocCanh(khac[i], p.lon, p.lat, bang, px); }
      if (r1) { q = [r1]; thay[y] = r1.sc.ngay; }
    }
    if (q.length) { const med = {v: {}}; bang.forEach(b => { med.v[b] = s2oTrung(q, b); }); ys[y] = giaTri(med); }
    rs.concat(rk).forEach(r => canh.push({y, id: r.sc.id, ngay: r.sc.ngay, t: pos(r.sc), chon: N.chon.includes(r.sc.id), quang: r.quang, scl: r.scl, v: r.quang ? giaTri(r) : null}));
    if (thay[y] && !canh.some(c => c.y === y && c.ngay === thay[y])) { const r1 = q[0]; canh.push({y, id: r1.sc.id, ngay: r1.sc.ngay, t: pos(r1.sc), chon: false, quang: true, scl: r1.scl, v: giaTri(r1)}); }
  }
  return {names, ys, don_vi: grp === "s2oidx" ? T("không thứ nguyên") : T("phản xạ × 10000"), nguon: T("Sentinel-2 L2A trên AWS, trung vị các cảnh đã ghép quang đãng tại điểm ({px} m)", {px}),
          lop: await lopAt(p), s2o: {canh, thay, px}};
}
var _annualFor32 = annualFor;
annualFor = async function (p, grp) {
  if (grp !== "s2o" && grp !== "s2oidx") return _annualFor32(p, grp);
  const key = [p.x, p.y, grp, s2oKyKH(), S2OV.cv10, S2OV.tatCa, (CVS.an[grp] || []).join(), grp === "s2oidx" ? ST.chiso.dung.join() + ST.chiso.tu.map(t => t.bt).join() : ""].join("|");
  if (AN_CACHE[key]) return AN_CACHE[key];
  return (AN_CACHE[key] = await s2oChuoi(p, grp));
};
var _annualSVG32 = annualSVG;
annualSVG = function (A, p, W, H) {                 // thêm chấm từng cảnh trong ô của năm (vị trí theo ngày trong khoảng tháng)
  if (!A.s2o || CVS.z) return _annualSVG32(A, p, W, H);
  const yrs = Object.keys(A.ys).map(Number).concat(A.s2o.canh.map(c => c.y)).filter((y, i, a) => a.indexOf(y) === i).sort((a, b) => a - b);
  const A2 = Object.assign({}, A, {ys: Object.fromEntries(yrs.map(y => [y, A.ys[y] || A.names.map(() => null)]))});
  const an = new Set(CVS.an[CVS.grp] || []), vis = A.names.map((n, i) => i).filter(i => !an.has(A.names[i]));
  let lo = Infinity, hi = -Infinity;
  const gom = v => { if (v != null && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } };
  yrs.forEach(y => vis.forEach(i => gom(A2.ys[y][i]))); A.s2o.canh.forEach(c => c.v && vis.forEach(i => gom(c.v[i])));
  if (!isFinite(lo)) return _annualSVG32(A2, p, W, H);
  // giữ đúng thang của đồ thị gốc: thêm hai "năm" giả ngoài khung để thang bao cả các chấm, rồi bỏ cột của chúng
  const lops = Object.values(A.lop || {}), B0 = 16 + (1 + lops.length) * 11, L0 = 46, R0 = 10, T0 = 8;
  let s = _annualSVG32(Object.assign({}, A2, {ys: Object.assign({}, A2.ys)}), p, W, H);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; } const pd = (hi - lo) * 0.06; lo -= pd; hi += pd;
  const n = yrs.length, dx = (W - L0 - R0) / Math.max(1, n), Y = v => T0 + (1 - (v - lo) / (hi - lo)) * (H - T0 - B0);
  // vẽ lại phần dữ liệu theo thang mới: bỏ các đường, chấm cũ của đồ thị gốc
  s = s.replace(/<polyline[^>]*\/>/g, "").replace(/<circle[^>]*>.*?<\/circle>/g, "").replace(/<line x1="46"[^>]*\/>\s*<text[^>]*text-anchor="end">[^<]*<\/text>/g, "");
  let g = "";
  niceTicks(lo, hi, 5).forEach(t => { g += `<line x1="${L0}" x2="${W - R0}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${t === 0 ? "#c9ced6" : "#e9ecf0"}"/><text x="${L0 - 3}" y="${(Y(t) + 3).toFixed(1)}" font-size="9" fill="#98a2b3" text-anchor="end">${fmtV(t)}</text>`; });
  yrs.forEach((y, k) => {                            // vạch mây: cảnh mây tại điểm
    A.s2o.canh.filter(c => c.y === y && !c.quang).forEach(c => { const x = L0 + k * dx + (0.08 + 0.84 * c.t) * dx, yy = H - B0 - 4;
      g += `<text x="${x.toFixed(1)}" y="${yy}" font-size="8" text-anchor="middle" fill="#98a2b3">×<title>${c.ngay}: ${esc(s2oSclTen(c.scl))}</title></text>`; });
  });
  vis.forEach(i => {
    const c = anCol(A, i), pts = yrs.map((y, k) => [k, A2.ys[y][i], y]).filter(t => t[1] != null && isFinite(t[1]));
    A.s2o.canh.forEach(cn => { if (!cn.v || cn.v[i] == null) return; const k = yrs.indexOf(cn.y), x = L0 + k * dx + (0.08 + 0.84 * cn.t) * dx;
      g += `<circle cx="${x.toFixed(1)}" cy="${Y(cn.v[i]).toFixed(1)}" r="1.9" fill="${cn.chon ? c : "#fff"}" stroke="${c}" stroke-width="1" opacity=".75"><title>${A.names[i]} ${cn.ngay}${cn.chon ? "" : " (" + T("ứng viên") + ")"}: ${fmtV(cn.v[i])}</title></circle>`; });
    if (pts.length > 1) g += `<polyline points="${pts.map(t => (L0 + (t[0] + 0.5) * dx).toFixed(1) + "," + Y(t[1]).toFixed(1)).join(" ")}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>`;
    pts.forEach(t => { const th = A.s2o.thay[t[2]];
      g += `<circle cx="${(L0 + (t[0] + 0.5) * dx).toFixed(1)}" cy="${Y(t[1]).toFixed(1)}" r="3" fill="${th ? "#fff" : c}" stroke="${c}" stroke-width="1.6"${th ? ' stroke-dasharray="2 1.5"' : ""}><title>${A.names[i]} ${t[2]}: ${fmtV(t[1])}${th ? " · " + T("thay bằng cảnh {d} (cảnh đã ghép mây tại điểm)", {d: th}) : ""}</title></circle>`; });
  });
  return s.replace("</svg>", g + "</svg>");
};
var _annualLegend32 = annualLegend;
annualLegend = function (A, p) {
  let h = _annualLegend32(A, p);
  if (A.s2o) {
    h += `<div class="cvnote">${T("Chấm nhỏ: từng cảnh theo ngày trong khoảng tháng của năm (đặc: cảnh đã ghép; rỗng: cảnh ứng viên); ×: cảnh mây tại điểm; chấm lớn: trung vị các cảnh đã ghép quang đãng; vòng đứt: năm thay bằng cảnh ứng viên.")}</div>`;
    const th = Object.entries(A.s2o.thay); if (th.length) h += `<div class="cvwarn">${T("Năm dùng cảnh thay:")} ${th.map(([y, d]) => `${y} (${d})`).join(", ")}</div>`;
    const ko = Object.keys(s2oKH().nam).filter(y => !(y in A.ys)); if (ko.length) h += `<div class="cvwarn">${T("Năm không có cảnh quang đãng tại điểm:")} ${ko.join(", ")}</div>`;
    h += `<div class="row sm"><button type="button" data-s2ocsv>${T("CSV từng cảnh tại điểm")}</button></div>`;
  }
  return h;
};
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-s2ocsv]"); if (!b || !lastAN || !lastAN.s2o) return;
  const A = lastAN, p = vizPt(), r = ["nam,ngay,canh,da_ghep,quang_dang,scl," + A.names.join(",")];
  A.s2o.canh.slice().sort((a, z) => a.ngay < z.ngay ? -1 : 1).forEach(c => r.push([c.y, c.ngay, c.id, c.chon ? 1 : 0, c.quang ? 1 : 0, c.scl].concat(A.names.map((n, i) => c.v && c.v[i] != null ? +c.v[i].toFixed(4) : "")).join(",")));
  download(`s2_truc_tuyen_diem_${p ? p.id.replace(/[^\w-]/g, "_") : "diem"}_${stamp()}.csv`, r.join("\n"), "text/csv");
});
var _renderCurve32 = renderCurve;                   // điểm chỉ có ảnh S2 trực tuyến: chỉ đường sang đồ thị theo năm
renderCurve = async function () {
  await _renderCurve32.apply(this, arguments);
  const box = $("curve"), p = vizPt();
  if (CVS.kind === "nam" || !p || !s2oL0() || !s2oTrongKH(p) || box.querySelector("svg") || box.querySelector("[data-s2ocv]")) return;
  box.insertAdjacentHTML("beforeend", `<div class="row sm"><button type="button" data-s2ocv>${T("xem chuỗi S2 trực tuyến tại điểm (theo năm và theo cảnh)")}</button></div>`);
  box.querySelector("[data-s2ocv]").onclick = () => { CVS.kind = "nam"; CVS.grp = "s2oidx"; ls("laymau_hp_curve_v1", CVS); renderCurve(); };
};

/* ---------------- ④ ghi ảnh đã xem khi gán nhãn ---------------- */
function s2oNguonAnh(p, y) {                        // {tg, s (chuỗi gọn cho CSV), s2o, nen, lop, dai}
  const d = {tg: Date.now()}, s = [];
  const K = s2oKH(), N = K && K.nam[y], bat = typeof OVL !== "undefined" && OVL.s2o && OVL.s2o.on, dai = $("selStrip") ? $("selStrip").value : "";
  if (N && (bat || dai === "s2o" || s2oTrongKH(p))) {
    const mot = s2oMotCanh(y), ds = (mot ? [mot] : s2oCanh(y)).filter(sc => s2oPhuDiem(sc, p.lon, p.lat));
    const q = ds.map(sc => { const r = S2OD.get(sc.id + "|10|" + p.lon.toFixed(6) + "," + p.lat.toFixed(6)) || S2OD.get(sc.id + "|20|" + p.lon.toFixed(6) + "," + p.lat.toFixed(6));
      return r && r.scl != null ? (S2OC.TRONG[r.scl] ? 1 : 0) : null; });
    d.s2o = {kieu: mot ? "canh" : "ghep", bo: K.cfg.bo, che: K.cfg.che !== false, canh: ds.map(sc => sc.id), ngay: ds.map(sc => sc.ngay), quang: q, xem: bat ? "lop" : "dai"};
  }
  const nen = $("selBase") ? $("selBase").value : "";
  if ((nen === "auto" || nen === "wb") && typeof REL !== "undefined" && REL.length) d.nen = "wayback:" + REL[CORE.releaseForYear(REL, y)][0];
  else if (nen) d.nen = nen;
  d.lop = typeof OVL !== "undefined" ? Object.values(OVL).filter(o => o.on).map(o => o.L0.id) : [];
  d.dai = dai;
  s2oChuoiNguon(d);
  return d;
}
function s2oChuoiNguon(d) {                         // chuỗi gọn: "s2o:ghep:2024-01-10+2024-02-15(mây); wayback:2024-02-21; lop:s2d"
  const s = [];
  if (d.s2o) s.push("s2o:" + d.s2o.kieu + ":" + d.s2o.ngay.map((n, i) => n + (d.s2o.quang[i] === 0 ? "(mây)" : "")).join("+"));
  if (d.nen) s.push(d.nen);
  const lop = (d.lop || []).filter(x => x !== "s2o"); if (lop.length) s.push("lop:" + lop.join("+"));
  d.s = s.join("; ");
}
async function s2oBoSungQuang(p, y) {               // đọc SCL của các cảnh (rẻ) rồi ghi quang đãng / mây tại điểm vào nguồn ảnh của nhãn
  const d = p.anh && p.anh[y]; if (!d || !d.s2o || !d.s2o.quang.some(v => v == null)) return;
  const by = {}; Object.values(s2oKH().nam).forEach(N => (N.ung || []).forEach(s => { by[s.id] = s; }));
  const rs = await s2oDocNhieu(d.s2o.canh.map(id => by[id]).filter(Boolean), p.lon, p.lat, [], 10);
  if (!p.anh || p.anh[y] !== d) return;
  d.s2o.quang = d.s2o.canh.map(id => { const r = rs.find(x => x.sc.id === id); return r && r.scl != null ? (r.quang ? 1 : 0) : null; });
  s2oChuoiNguon(d); save(); if (cur() === p) renderPoint();
}
var _label32 = label;
label = function (ma) {
  const p = cur(), y = ST.nam;
  if (p) { p.anh = p.anh || {}; if (ma == null) delete p.anh[y]; else p.anh[y] = s2oNguonAnh(p, y); }
  const r = _label32.apply(this, arguments);
  if (p && ma != null && p.anh[y] && p.anh[y].s2o) s2oBoSungQuang(p, y).catch(() => { /* để trống */ });
  return r;
};
var _renderPoint32 = renderPoint;
renderPoint = function () {                         // bảng các năm của điểm: thêm cột ảnh đã xem khi gán
  _renderPoint32.apply(this, arguments);
  const p = cur(), t = $("ytab"); if (!p || !t || !t.rows.length) return;
  const ys = years();
  t.rows[0].insertAdjacentHTML("beforeend", `<th>${T("ảnh đã xem khi gán")}</th>`);
  ys.forEach((y, i) => { const r = t.rows[i + 1]; if (!r) return; const a = p.anh && p.anh[y];
    r.insertAdjacentHTML("beforeend", `<td class="mu sm" style="font-size:10px">${a && a.s ? esc(a.s) : ""}</td>`); });
};
