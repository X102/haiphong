/* =============================== BẢN 2.5 =============================== */
/* ① chuẩn hoá đa giác khi sửa ranh giới (làm trơn, vuông góc hoá, bám đường kênh OSM, xoá mảnh vụn), chọn đa giác để gán lớp,
   xoá; ② nhấp vùng đã lưu trên bản đồ để đổi lớp, sửa, xoá; ③ giới thiệu geoportal, tác giả, liên hệ; ④ tự lưu điểm mẫu
   chọn vùng vào bộ "Mẫu chọn vùng", gộp bộ điểm; ⑤ tệp tiến độ gồm cả phiên làm việc và khôi phục được. */

/* ---------------- ① chuẩn hoá đa giác ---------------- */
function vgLopSua() { return VG.sua.getLayers().filter(l => l.toGeoJSON); }
function vgChonDaGiac(lyr) {                 // nhấp đa giác ở công cụ sửa: chọn / bỏ chọn (khi Geoman không ở chế độ vẽ, cắt, xoá)
  try { if (map.pm.globalRemovalModeEnabled() || map.pm.globalDrawModeEnabled() || map.pm.globalCutModeEnabled()) return false; } catch (e) { /* không có */ }
  lyr._chon = !lyr._chon; vgVeChon(); return true;
}
function vgVeChon() {
  const L_ = vgLopSua(), n = L_.filter(l => l._chon).length, o = VG.obj;
  L_.forEach(l => { const k = o && o.layers ? o.layers.indexOf(l) + 1 : 0;
    if (k && o.giu && o.nghi) vgKieuLop(l, k);
    else l.setStyle(Object.assign({weight: 2, fillOpacity: 0.15, dashArray: null, color: l._ma ? vgMau(l._ma) : "#c2185b"}, l._chon ? {weight: 4, dashArray: "6 4", color: "#facc15"} : {})); });
  vg$("vgChonTT").textContent = n ? T("đang chọn {n} đa giác", {n}) : T("chưa chọn: áp cho mọi đa giác");
}
function vgChup() { return vgLopSua().map(l => ({mp: vgMP(l.toGeoJSON().geometry), ma: l._ma || ""})); }
async function osmDuongTrong(bl) {           // đường, kênh, mặt nước OSM trong hộp (lon, lat): tệp trên Hugging Face hoặc Overpass
  const out = [];
  for (const id of ["duong", "kenh", "nuoc"]) {
    const def = osmDef(id); if (!def || !def.op) continue;
    try {
      if (OSM.nguon === "hf" && def.duong_dan) { const url = CORE.dataUrl(CFG, def.duong_dan); for (const o of osmO(bl)) out.push(...await osmNapFgb(id, url, o)); }
      else out.push(...await osmNapOverpass(id, bl));
    } catch (e) { /* chủ đề này không nạp được */ }
    if (OSM.lop[id]) OSM.lop[id].f.forEach(f => out.push(f));
  }
  return out;
}
async function vgChuan(kieu) {
  const L_ = vgLopSua(); if (!L_.length) { msg("chưa có đa giác: bấm công cụ ④ khi đã có vùng", "wa", 3000); return; }
  const dung = L_.some(l => l._chon) ? L_.filter(l => l._chon) : L_, truoc = vgChup(), parts = [];
  dung.forEach(l => vgMP(l.toGeoJSON().geometry).forEach(pg => parts.push({l, pg})));
  const H = CORE.hinhMet(parts.map(p => p.pg));
  const lat = map.getCenter().lat, resM = VG.data ? VG.data.g.res * Math.cos(lat * Math.PI / 180) : 10;
  let doan = null, nBam = 0;
  if (kieu === "osm") {
    const tol = +vg$("vgBamM").value || 12, d = tol / 90000;
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    parts.forEach(p => p.pg[0].forEach(q => { b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])]; }));
    vgTrang("đang nạp đường, kênh OSM…");
    const fs = await osmDuongTrong([b[0] - d, b[1] - d, b[2] + d, b[3] + d]), lines = [];
    fs.forEach(f => { const g = f.geometry; if (!g) return; const add = cs => lines.push(cs.map(H.toMet));
      if (g.type === "LineString") add(g.coordinates); else if (g.type === "MultiLineString") g.coordinates.forEach(add);
      else if (/Polygon/.test(g.type)) vgMP(g).forEach(pg => pg.forEach(add)); });
    vgTrang("");
    if (!lines.length) { msg("không có đường, kênh OSM nào quanh các đa giác", "wa", 3500); return; }
    doan = CORE.doanThang(lines);
  }
  const moi = new Map();
  H.mp.forEach((pg, i) => {
    const l = parts[i].l; let out = pg;
    if (kieu === "tron") out = pg.map(r => CORE.lamTron(r, Math.max(1, 0.6 * resM), +vg$("vgTronN").value || 2));
    else if (kieu === "vuong") out = pg.map(r => CORE.vuongGoc(r, Math.max(1, 0.4 * resM)));
    else if (kieu === "osm") out = pg.map(r => { const k = CORE.bamDuong(r, doan, +vg$("vgBamM").value || 12); nBam += k.n; return k.r; });
    else if (kieu === "vun") out = CORE.manhVun(pg, (+vg$("vgVunHa").value || 0) * 1e4, +vg$("vgVunM").value || 0);
    if (!moi.has(l)) moi.set(l, []);
    if (out && out[0] && out[0].length >= 3) moi.get(l).push(out);
  });
  let nSau = 0;
  moi.forEach((pgs, l) => { VG.sua.removeLayer(l); if (pgs.length) { vgThemDaGiac(H.ve(pgs), l._ma, l._chon); nSau += pgs.length; } });
  VG.undo.push({kieu: "chuan", truoc}); VG.daSua = true;
  vgDoiTuongDaGiac(); vgVeChon(); vgCapNhatHen();
  msg(kieu === "vun" ? T("đã xoá {n} mảnh vụn (Z để hoàn tác)", {n: parts.length - nSau}) :
      kieu === "osm" ? T("đã bám {n} đỉnh vào đường, kênh OSM (Z để hoàn tác)", {n: nBam}) :
      T("đã chuẩn hoá {n} đa giác (Z để hoàn tác)", {n: parts.length}), "ok", 3500);
}
function vgGanLopDS() {
  const s = vg$("vgGanLop"); if (!s) return; const cu = s.value;
  s.innerHTML = (SCHEME.lop || []).map(c => `<option value="${c.ma}">${c.ma} ${cten(c)}</option>`).join("");
  if (cu) s.value = cu;
}
document.querySelectorAll("#vgChuanW [data-ch]").forEach(b => { b.onclick = () => vgChuan(b.dataset.ch); });
vg$("vgBoChon").onclick = () => { vgLopSua().forEach(l => { l._chon = false; }); vgVeChon(); };
vg$("vgGan").onclick = () => {
  const ch = vgLopSua().filter(l => l._chon); if (!ch.length) { msg("nhấp chọn đa giác trước", "wa", 2500); return; }
  const ma = vg$("vgGanLop").value; VG.undo.push({kieu: "chuan", truoc: vgChup()});
  ch.forEach(l => { l._ma = ma; l._chon = false; }); vgVeChon();
  msg(T("đã gán lớp {m} cho {n} đa giác: Lưu vùng sẽ lưu chúng thành vùng riêng", {m: ma, n: ch.length}), "ok", 4000);
};
vg$("vgXoaChon").onclick = () => {
  const ch = vgLopSua().filter(l => l._chon); if (!ch.length) { msg("nhấp chọn đa giác trước", "wa", 2500); return; }
  VG.undo.push({kieu: "chuan", truoc: vgChup()}); ch.forEach(l => VG.sua.removeLayer(l));
  VG.daSua = true; vgDoiTuongDaGiac(); vgVeChon(); vgCapNhatHen();
};

/* ---------------- ② nhấp vùng đã lưu: đổi lớp, sửa, xoá ---------------- */
function vgPopupVung(id, ll) {
  const v = ST.vung[id]; if (!v) return;
  const c = IDX.by[v.ma_lop] || {}, k = v.khu && ST.khu[v.khu], div = document.createElement("div"); div.className = "gt-tai";
  div.innerHTML = `<b>${T("Vùng mẫu")} ${esc(v.id)}</b><div class="sm"><span class="sw" style="background:${c.mau || "#555"}"></span> ${esc(v.ma_lop)} ${esc(cten(c))} · ${v.nam} · ${v.thong_ke.dien_tich_ha.toFixed(2)} ha` +
    (k ? ` · 🔒 ${esc(k.ten)}` : "") + (v.ghi_chu ? ` · ${esc(v.ghi_chu)}` : "") + `</div>` +
    `<div class="row">${T("đổi lớp")} <select data-k="lop" style="max-width:170px">${(SCHEME.lop || []).map(q => `<option value="${q.ma}"${q.ma === v.ma_lop ? " selected" : ""}>${q.ma} ${esc(cten(q))}</option>`).join("")}</select>` +
    `<button type="button" data-a="lop">${T("Đổi")}</button></div>` +
    `<div class="row"><button type="button" data-a="sua">${T("Sửa ranh giới")}</button><button type="button" data-a="xem">${T("xem")}</button><button type="button" data-a="xoa">${T("Xoá")}</button></div>`;
  div.querySelectorAll("button").forEach(b => { b.onclick = () => {
    const a = b.dataset.a;
    if (a === "lop") { const m = div.querySelector('[data-k="lop"]').value; if (m !== v.ma_lop) { v.ma_lop = m; v.tg = Date.now(); v.da_sua = true; save(); vgVeVung(); msg(T("đã đổi vùng {id} sang lớp {m}", {id: v.id, m}), "ok", 3000); } map.closePopup(); }
    else { map.closePopup(); vgThaoTac(id, a); }
  }; });
  L.DomEvent.disableClickPropagation(div);
  L.popup({maxWidth: 330}).setLatLng(ll).setContent(div).openOn(map);
}

/* ---------------- ③ giới thiệu ---------------- */
const GT_MAC = {tac_gia: {vi: "Phạm Đăng Hiển", ru: "Фам Данг Хиен", en: "Pham Dang Hien"}, email: "lopmaybay@gmail.com", don_vi: ""};
function gtMo() {
  const g = Object.assign({}, GT_MAC, (SITE && SITE.gioi_thieu) || {}), tg = g.tac_gia, gh = ((SITE && SITE.bao_loi) || {}).github;
  const ten = typeof tg === "string" ? tg : (tg[LANG] || tg.vi), khac = typeof tg === "object" ? [...new Set(Object.values(tg))].filter(t => t !== ten) : [];
  const dv = typeof g.don_vi === "string" ? g.don_vi : (g.don_vi && (g.don_vi[LANG] || g.don_vi.vi)) || "";
  $("gtTacGia").innerHTML = `<p><b>${T("Tác giả")}</b>: ${esc(ten)}${khac.length ? ` (${khac.map(esc).join(", ")})` : ""}${dv ? ", " + esc(dv) : ""}</p>` +
    `<p><b>${T("Liên hệ")}</b>: <a href="mailto:${esc(g.email)}">${esc(g.email)}</a>` +
    (gh ? ` · GitHub <a href="https://github.com/${esc(gh)}" target="_blank" rel="noopener noreferrer">${esc(gh)}</a>` : "") +
    ` · <button type="button" data-a="loi">${T("🐞 Báo lỗi")}</button></p><p class="mu sm">${T("Phiên bản {v}", {v: VERSION})}</p>`;
  $("gtTacGia").querySelector('[data-a="loi"]').onclick = () => { $("dlgGT").close(); moBaoLoi(); };
  if (!$("dlgGT").open) $("dlgGT").showModal();
}
$("bGT").onclick = gtMo; $("gtDong").onclick = () => $("dlgGT").close();

/* ---------------- ④ tự lưu điểm mẫu chọn vùng, gộp bộ điểm ---------------- */
const MV_BO = "mau_vung";
let MV_ON = ls("laymau_hp_mv_v1"); if (MV_ON === null) MV_ON = true;
vg$("vgTuLuu").checked = MV_ON;
vg$("vgTuLuu").onchange = () => { MV_ON = vg$("vgTuLuu").checked; ls("laymau_hp_mv_v1", MV_ON); };
function mvThem(h) {                         // điểm mẫu có lớp -> một điểm của bộ "Mẫu chọn vùng", nhãn năm đang gán
  if (!MV_ON || !h.ma) return;
  if (!ST.bo_cfg[MV_BO]) ST.bo_cfg[MV_BO] = {ten: "Mẫu chọn vùng", nam: CFG.years.slice(), tu_tao: true, cach: "mau_vung", tao_luc: new Date().toISOString()};
  const nam = ST.bo_cfg[MV_BO].nam; if (!nam.includes(ST.nam)) { nam.push(ST.nam); nam.sort((a, b) => a - b); }
  const id = "MV-" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), p = CORE.newPoint(id, h.lon, h.lat, {bo: MV_BO});
  CORE.setLabel(p, ST.nam, h.ma); p.tin[ST.nam] = 2; p.ghi_chu = "điểm mẫu chọn vùng";
  ST.diem[id] = p; h.pid = id; h.pnam = ST.nam; save(); buildSetSelect();
  if (ST.bo === MV_BO) drawPoints();
}
function mvBo(h) {                           // bỏ một điểm mẫu: bỏ nhãn năm đó; điểm không còn nhãn thì xoá
  const p = h.pid && ST.diem[h.pid]; h.pid = null; if (!p || p.bo !== MV_BO) return;
  CORE.setLabel(p, h.pnam || ST.nam, null);
  if (!Object.keys(p.nhan).length) { delete ST.diem[p.id]; if (ST.cur === p.id) ST.cur = null; }
  save(); buildSetSelect(); if (ST.bo === MV_BO) drawPoints();
}
const _buildSetSelect25 = buildSetSelect;
buildSetSelect = function () {               // tên bộ tự lưu theo ngôn ngữ đang dùng
  _buildSetSelect25();
  const o = [...$("selSet").options].find(x => x.value === MV_BO);
  if (o) o.textContent = `${T("Mẫu chọn vùng")} (${Object.values(ST.diem).filter(p => p.bo === MV_BO).length})`;
};
function boTen(b) {
  const c = ST.bo_cfg[b], ps = MAN && MAN.point_sets.find(x => x.id === b);
  return b === MV_BO ? T("Mẫu chọn vùng") : b === "tay" ? T("điểm thêm tay") : c && c.ten ? c.ten : ps ? psname(ps) : b;
}
function gopMo() {
  const dem = {}; Object.values(ST.diem).forEach(p => { dem[p.bo] = (dem[p.bo] || 0) + 1; });
  $("gopDS").innerHTML = Object.keys(dem).sort().map(b => `<label style="display:block"><input type="checkbox" value="${esc(b)}"${b === MV_BO || b === "tay" ? " checked" : ""}> ${esc(boTen(b))} <span class="mu">(${dem[b]})</span></label>`).join("") ||
    `<span class="mu">${T("chưa có điểm nào")}</span>`;
  $("gopTT").textContent = ""; $("dlgGop").showModal();
}
function gopOk() {
  const chon = [...$("gopDS").querySelectorAll("input:checked")].map(i => i.value);
  if (!chon.length) { $("gopTT").textContent = T("chọn ít nhất một bộ"); return; }
  let P = Object.values(ST.diem).filter(p => chon.includes(p.bo)), bo = 0;
  if ($("gopTrung").checked) {
    const m = new Map(); P.forEach(p => { const k = p.x + "," + p.y, q = m.get(k); if (!q || Object.keys(p.nhan).length > Object.keys(q.nhan).length) m.set(k, p); });
    bo = P.length - m.size; P = [...m.values()];
  }
  const nam = new Set(); chon.forEach(b => ((boCfg(b) && boCfg(b).nam) || CFG.years).forEach(y => nam.add(y))); P.forEach(p => Object.keys(p.nhan).forEach(y => nam.add(+y)));
  const ten = $("gopTen").value.trim() || T("bộ gộp"), goc = boSlug(ten) || "gop"; let id = goc, k = 2;
  while (ST.bo_cfg[id] || (MAN && MAN.point_sets.some(x => x.id === id)) || id === "tay" || id === MV_BO) id = goc + "_" + k++;
  ST.bo_cfg[id] = {ten, nam: [...nam].sort((a, b) => a - b), tu_tao: true, cach: "gop", tu_bo: chon, tao_luc: new Date().toISOString()};
  const w = Math.max(4, String(P.length).length);
  P.forEach((p, i) => { const q = JSON.parse(JSON.stringify(p)); q.id = `${id}-${String(i + 1).padStart(w, "0")}`; q.bo = id; q.goc = {id: p.id, bo: p.bo}; ST.diem[q.id] = q; });
  ST.bo = id; ST.cur = null; save(); buildSetSelect(); render(); $("dlgGop").close();
  msg(T('đã gộp {n} điểm từ {k} bộ vào bộ "{t}"', {n: P.length, k: chon.length, t: ten}) + (bo ? " " + T("(bỏ {b} điểm trùng ô)", {b: bo}) : ""), "ok", 5000);
}
$("bBoGop").onclick = gopMo; $("gopOk").onclick = gopOk; $("gopDong").onclick = () => $("dlgGop").close();

/* ---------------- ⑤ tệp tiến độ: toàn bộ phiên làm việc ---------------- */
function phienXuat() {
  const prefs = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^laymau_hp_/.test(k) && k !== KEY_STATE && k !== KEY_CFG) prefs[k] = localStorage.getItem(k); } } catch (e) { /* không đọc được */ }
  const vg = {pos: VG.pos, neg: VG.neg, loai: VG.loai, giu: VG.giu, lop: VG.lop, tham_so: MAN ? vgThamSo() : null,
              sua: vgChup(), sua_id: VG.suaId || null};
  if (VG.kq) vg.ket_qua = VG.kq.lops.map(ma => ({ma, mp: CORE.vectorize(VG.kq.masks[ma], VG.kq.g, 1)}));
  const c = map.getCenter();
  return {loai: "laymau_hp", phien_ban: 2, trang: VERSION, xuat_luc: new Date().toISOString(), cfg: CFG, st: ST,
          phien: {vg, prefs, ban_do: {c: [c.lat, c.lng], z: map.getZoom()}, nam: ST.nam, bo: ST.bo, cur: ST.cur}};
}
$("eJson").onclick = () => download(`laymau_tien_do_${stamp()}.json`, JSON.stringify(phienXuat()), "application/json");
async function phienNhap(j) {                // gọi sau khi trang đã gộp điểm, vùng, bộ, chỉ số
  const st = j.st || {};
  Object.entries(st.khu || {}).forEach(([k, v]) => { if (!ST.khu[k]) ST.khu[k] = v; });
  Object.entries(st.nhom_xa || {}).forEach(([k, v]) => { if (!ST.nhom_xa[k]) ST.nhom_xa[k] = v; });
  Object.entries(st.osm_sua || {}).forEach(([k, v]) => { const o = ST.osm_sua[k]; if (!o || (v.tg || 0) > (o.tg || 0)) ST.osm_sua[k] = v; });
  save(); vgVeVung(); vgNhomDS();
  const P = j.phien; if (!P) return;
  if (!confirm(T("Tệp có cả phiên làm việc (điểm mẫu chọn vùng, đa giác đang sửa, cài đặt hiển thị, vị trí bản đồ). Khôi phục luôn?"))) return;
  Object.entries(P.prefs || {}).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) { /* đầy */ } });
  if (P.bo && Object.values(ST.diem).some(p => p.bo === P.bo)) { ST.bo = P.bo; ST.cur = P.cur && ST.diem[P.cur] ? P.cur : null; buildSetSelect(); }
  if (P.nam && P.nam !== ST.nam) setYear(P.nam); else render();
  if (P.ban_do) map.setView(P.ban_do.c, P.ban_do.z, {animate: false});
  const V = P.vg || {};
  if ((V.pos || []).length || (V.sua || []).length) {
    if (!VG.mode) vgBat(true);
    VG.pos = V.pos || []; VG.neg = V.neg || []; VG.loai = V.loai || []; VG.giu = V.giu || []; VG.undo = [];
    if (V.lop != null) vgChonLop(V.lop);
    vgVeHat(); VG.data = null;
    if (VG.pos.length) { vgTinh(); const t0 = Date.now(); while (!VG.kq && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 200)); }
    if ((V.sua || []).length) { VG.sua.clearLayers(); V.sua.forEach(x => vgThemDaGiac(x.mp, x.ma)); VG.suaId = V.sua_id || null; vgCong("sua"); vgDoiTuongDaGiac(); vgVeChon(); }
  }
  msg("đã khôi phục phiên làm việc; một số cài đặt hiển thị có hiệu lực sau khi tải lại trang", "ok", 6000);
}
const _vgDoiNN25 = vgDoiNgonNgu;
vgDoiNgonNgu = function () { _vgDoiNN25(); try { vgGanLopDS(); vgVeChon(); } catch (e) { /* chưa có */ } };
vgGanLopDS(); vgVeChon();
