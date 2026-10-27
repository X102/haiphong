/* =============================== BẢN 3.19.1: XUẤT ĐIỂM MẪU THEO TỪNG BỘ =============================== */
/* Trước đây CSV dài, CSV rộng, GeoJSON xuất mọi điểm của mọi bộ vào một tệp; Shapefile thì gộp các bộ đã chọn. Bản này: chọn các bộ
   cần xuất (mặc định bộ đang làm), xuất mỗi bộ một tệp (nhiều bộ thì gói trong một ZIP) hoặc gộp vào một tệp; cột năm theo các năm cần
   gán của từng bộ (cộng các năm đã có nhãn, không mất nhãn nào); tuỳ chọn chỉ điểm đã có nhãn; thêm tệp tiến độ riêng của bộ (nhập lại
   được bằng Tải tệp…); CSV dạng dài ghi đủ các cột đã lưu (gợi ý kNN, nguồn ảnh mẫu, Street View...), trước đây bị bỏ sót. */
const XM = Object.assign({bo: null, cach: "rieng", nhan: false, namBo: true}, ls("laymau_hp_xm_v1") || {});
const XM_COT_DAI = ["id", "bo_diem", "lon", "lat", "x_utm", "y_utm", "tang", "nam", "ma_lop", "id_lop", "nhom", "lop3", "tin_cay", "goi_y_3lop", "xem_lai", "ghi_chu", "cap_nhat", "anh"];
const XM_DD = {dai: ["csv", "laymau_dai", "laymau_dai"], rong: ["csv", "laymau_rong", "laymau_rong"], geo: ["geojson", "laymau", "laymau_geojson"], shp: ["zip", "diem_mau", "diem_mau"], json: ["json", "laymau_tien_do", "laymau_tien_do"]};
function xmLuu() { ls("laymau_hp_xm_v1", {bo: XM.bo, cach: XM.cach, nhan: XM.nhan, namBo: XM.namBo}); }
function xmTenBo(b) { return typeof boTen === "function" ? boTen(b) : b; }
function xmCoNhan(p) { return Object.keys(p.nhan || {}).some(y => p.nhan[y]); }
function xmBoDS() {                                   // [{id, ten, n, nn (có nhãn), nam}] các bộ có điểm trên trang
  const by = {}; Object.values(ST.diem).forEach(p => { const o = by[p.bo] || (by[p.bo] = {id: p.bo, n: 0, nn: 0}); o.n++; if (xmCoNhan(p)) o.nn++; });
  return Object.values(by).map(o => Object.assign(o, {ten: xmTenBo(o.id), nam: xmNamBo([o.id])})).sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
}
function xmNamBo(bos) {                               // các năm của các bộ: năm cần gán + năm đã có nhãn
  const s = new Set(), set = new Set(bos);
  bos.forEach(b => { const c = typeof boCfg === "function" ? boCfg(b) : null; ((c && c.nam && c.nam.length) ? c.nam : CFG.years).forEach(y => s.add(+y)); });
  Object.values(ST.diem).forEach(p => { if (set.has(p.bo)) Object.keys(p.nhan || {}).forEach(y => { if (p.nhan[y]) s.add(+y); }); });
  return [...s].sort((a, b) => a - b);
}
function xmNam(bos) {
  if (XM.namBo) return xmNamBo(bos);
  const s = new Set(allYears()); Object.values(ST.diem).forEach(p => Object.keys(p.nhan || {}).forEach(y => { if (p.nhan[y]) s.add(+y); }));
  return [...s].sort((a, b) => a - b);
}
function xmDiem(bos) { const set = new Set(bos); return Object.values(ST.diem).filter(p => set.has(p.bo) && (!XM.nhan || xmCoNhan(p))); }
function xmNamTxt(ys) { return !ys.length ? "" : ys.length === 1 ? String(ys[0]) : ys.length === ys[ys.length - 1] - ys[0] + 1 ? `${ys[0]}–${ys[ys.length - 1]}` : ys.join(", "); }

/* ---------------- dựng nội dung từng định dạng ---------------- */
function xmCSVDai(pts, ys) {
  const rows = CORE.exportLong(pts, ys, IDX), cot = XM_COT_DAI.slice();
  rows.forEach(r => { r.ten_bo = xmTenBo(r.bo_diem); Object.keys(r).forEach(k => { if (!cot.includes(k)) cot.push(k); }); });
  if (!cot.includes("ten_bo")) cot.push("ten_bo");
  return {du: CORE.toCSV(rows, cot), n: rows.length};
}
function xmCSVRong(pts, ys) {
  const rows = CORE.exportWide(pts, ys, IDX); rows.forEach(r => { r.ten_bo = xmTenBo(r.bo_diem); });
  const cot = ["id", "bo_diem", "lon", "lat", "x_utm", "y_utm", "tang", "so_nam_co_nhan", "so_lan_doi", "xem_lai", "ghi_chu"]
    .concat(ys.map(y => "ma_" + y), ys.map(y => "lop3_" + y), ys.map(y => "anh_" + y), ["ten_bo"]);
  return {du: CORE.toCSV(rows, cot), n: rows.length};
}
function xmGeo(pts, ys) {
  const fc = {type: "FeatureCollection", features: CORE.exportWide(pts, ys, IDX).map(r => ({type: "Feature",
    geometry: {type: "Point", coordinates: [r.lon, r.lat]}, properties: Object.assign(r, {ten_bo: xmTenBo(r.bo_diem)})}))};
  return {du: JSON.stringify(fc), n: pts.length};
}
function xmShp(pts, ys, goc) {                        // -> [{ten, du}] 5 tệp của một Shapefile điểm
  const rows = CORE.exportWide(pts, ys, IDX).map((r, i) => { const p = pts[i]; r.ten_bo = xmTenBo(p.bo);
    ys.forEach(y => { const m = p.nhan[y]; r["lop_" + y] = m && IDX.by[m] ? cten(IDX.by[m]) : ""; }); return r; });
  const tr = [["id", "id", "C"], ["bo_diem", "bo_diem", "C"], ["ten_bo", "ten_bo", "C"], ["lon", "lon", "N", 7], ["lat", "lat", "N", 7], ["x_utm", "x_utm", "N", 1], ["y_utm", "y_utm", "N", 1],
    ["tang", "tang", "C"], ["so_nam", "so_nam_co_nhan", "N", 0], ["so_doi", "so_lan_doi", "N", 0], ["xem_lai", "xem_lai", "N", 0], ["ghi_chu", "ghi_chu", "C"]]
    .concat(...ys.map(y => [["ma_" + y, "ma_" + y, "C"], ["lop_" + y, "lop_" + y, "C"], ["l3_" + y, "lop3_" + y, "C"], ["anh_" + y, "anh_" + y, "C"]]))
    .map(([ten, khoa, kieu, tp]) => ({ten, khoa, kieu, tp}));
  const F = shpDiem(rows, tr);
  return [{ten: goc + ".shp", du: F.shp}, {ten: goc + ".shx", du: F.shx}, {ten: goc + ".dbf", du: F.dbf}, {ten: goc + ".prj", du: WKT_4326}, {ten: goc + ".cpg", du: "UTF-8"}];
}
function xmJson(bos, pts) {                           // tệp tiến độ riêng của các bộ: nhập lại bằng Tải tệp… (gộp điểm, nhãn mới hơn thắng)
  const diem = {}, cfg = {}; pts.forEach(p => { diem[p.id] = p; });
  bos.forEach(b => { if (ST.bo_cfg[b]) cfg[b] = ST.bo_cfg[b]; });
  return {du: JSON.stringify({loai: "laymau_hp", phien_ban: 2, trang: VERSION, xuat_luc: new Date().toISOString(), chi_bo: bos, cfg: CFG,
                             st: {diem, bo_cfg: cfg, scheme: ST.scheme}}), n: pts.length};
}
function xmTenGoc(bos) { return bos.length === 1 ? (tenTep313(xmTenBo(bos[0])) || tenTep313(bos[0]) || "bo") : bos.length + "_bo"; }
/* xuất: dd = dai | rong | geo | shp | json -> {ten, kieu tệp, so bộ, so điểm} */
function xmXuat(dd, bos) {
  bos = bos || xmChon(); if (!bos.length) throw new Error(T("chọn ít nhất một bộ điểm"));
  const [duoi, dau, dauZip] = XM_DD[dd], gio = gioTep313(), mime = {csv: "text/csv", geojson: "application/geo+json", json: "application/json", zip: "application/zip"};
  const nhom = XM.cach === "gop" || bos.length === 1 ? [bos] : bos.map(b => [b]);
  const tep = []; let nDiem = 0, nBo = 0;
  nhom.forEach(g => {
    const pts = xmDiem(g); if (!pts.length) return; const ys = xmNam(g), goc = xmTenGoc(g); nDiem += pts.length; nBo += g.length;
    if (dd === "shp") { tep.push({goc, ds: xmShp(pts, ys, `${dau}_${goc}`)}); return; }
    const r = dd === "dai" ? xmCSVDai(pts, ys) : dd === "rong" ? xmCSVRong(pts, ys) : dd === "geo" ? xmGeo(pts, ys) : xmJson(g, pts);
    tep.push({goc, ten: `${dau}_${goc}.${duoi}`, du: r.du});
  });
  if (!tep.length) throw new Error(XM.nhan ? T("các bộ đã chọn chưa có điểm nào có nhãn") : T("không có điểm nào trong các bộ đã chọn"));
  const dung = new Set(), khongTrung = t => { let x = t, k = 2; while (dung.has(x)) x = t.replace(/(\.[a-z]+)$/, `_${k++}$1`); dung.add(x); return x; };
  if (tep.length === 1 && dd !== "shp") {             // một tệp: tải thẳng
    const ten = tep[0].ten.replace(/(\.[a-z]+)$/, `_${gio}$1`); download(ten, tep[0].du, mime[duoi]); return {ten, so: nBo, tep: 1, n: nDiem};
  }
  const vao = [];                                     // nhiều tệp, hoặc Shapefile: một ZIP
  tep.forEach(t => { if (t.ds) t.ds.forEach(f => vao.push({ten: khongTrung(f.ten), du: f.du})); else vao.push({ten: khongTrung(t.ten), du: t.du}); });
  const ten = `${dauZip}_${tep.length === 1 ? tep[0].goc : tep.length + "_bo"}_${gio}.zip`;
  v28Tai(ten, XH.zip(vao), "application/zip"); return {ten, so: nBo, tep: tep.length, n: nDiem, vao: vao.map(f => f.ten)};
}

/* ---------------- hộp Xuất ---------------- */
function xmChon() { if (!$("xmBo").querySelector("input")) xmVe(); return [...$("xmBo").querySelectorAll("input:checked")].map(i => i.value); }   // chưa mở hộp: lựa chọn đã nhớ, không thì bộ đang làm
function xmVe() {
  const ds = xmBoDS(), chon = new Set(Array.isArray(XM.bo) && XM.bo.length ? XM.bo.filter(b => ds.some(o => o.id === b)) : []);
  if (!chon.size && ds.some(o => o.id === ST.bo)) chon.add(ST.bo);
  if (!chon.size && ds.length) chon.add(ds[0].id);
  $("xmBo").innerHTML = ds.map(o => `<label class="${o.id === ST.bo ? "dang" : ""}"><input type="checkbox" value="${esc(o.id)}"${chon.has(o.id) ? " checked" : ""}> <span>${esc(o.ten)}</span>` +
    `<span class="mu">${T("{n} điểm · {k} có nhãn", {n: o.n, k: o.nn})}${o.nam.length ? " · " + xmNamTxt(o.nam) : ""}</span></label>`).join("") || `<span class="mu sm">${esc(T("chưa có điểm nào"))}</span>`;
  document.querySelectorAll('#dlgExp input[name="xmCach"]').forEach(r => { r.checked = r.value === XM.cach; });
  $("xmNhan").checked = !!XM.nhan; $("xmNamBo").checked = !!XM.namBo;
  xmDem();
}
function xmDem() {
  const bos = [...$("xmBo").querySelectorAll("input:checked")].map(i => i.value); XM.bo = bos; xmLuu();
  const pts = xmDiem(bos), nb = bos.length;
  $("xmDem").textContent = !nb ? T("chưa chọn bộ nào") : T("{b} bộ, {n} điểm sẽ xuất", {b: nb, n: pts.length}) +
    (nb > 1 ? " · " + (XM.cach === "gop" ? T("gộp vào một tệp") : T("{b} tệp trong một ZIP", {b: nb})) : "");
  ["eLong", "eWide", "eGeo", "eShp", "eBoJson"].forEach(id => { $(id).disabled = !nb; });
}
function xmBam(dd) {
  try { const r = xmXuat(dd); $("xmTT").textContent = T("đã xuất {f}: {b} bộ, {n} điểm", {f: r.ten, b: r.so, n: r.n}); }
  catch (e) { $("xmTT").textContent = T("lỗi: ") + (e.message || e); }
}
function xmMo(chiBo) {                                // mở hộp Xuất; chiBo: chọn sẵn đúng một bộ
  if (chiBo) XM.bo = [chiBo];
  xmVe(); $("xmTT").textContent = ""; const d = $("dlgExp"); if (!d.open) d.showModal ? d.showModal() : d.show();
}
(function xmTao() {
  $("bExport").onclick = () => xmMo();
  $("eLong").onclick = () => xmBam("dai"); $("eWide").onclick = () => xmBam("rong"); $("eGeo").onclick = () => xmBam("geo");
  $("eShp").onclick = () => xmBam("shp"); $("eBoJson").onclick = () => xmBam("json");
  $("xmBo").addEventListener("change", xmDem);
  document.querySelectorAll('#dlgExp input[name="xmCach"]').forEach(r => r.addEventListener("change", () => { XM.cach = r.value; xmDem(); }));
  $("xmNhan").onchange = () => { XM.nhan = $("xmNhan").checked; xmDem(); };
  $("xmNamBo").onchange = () => { XM.namBo = $("xmNamBo").checked; xmLuu(); };
  $("xmBoDang").onclick = () => { $("xmBo").querySelectorAll("input").forEach(i => { i.checked = i.value === ST.bo; }); xmDem(); };
  $("xmTatCa").onclick = () => { $("xmBo").querySelectorAll("input").forEach(i => { i.checked = true; }); xmDem(); };
  $("xmBoChon").onclick = () => { $("xmBo").querySelectorAll("input").forEach(i => { i.checked = false; }); xmDem(); };
  const sua = $("bBoSua");                            // nút xuất nhanh bộ đang làm, cạnh ô chọn bộ
  if (sua && !$("bBoXuat")) { sua.insertAdjacentHTML("afterend", `<button id="bBoXuat" type="button" data-noi18n>⤓</button>`); $("bBoXuat").onclick = () => xmMo(ST.bo); }
  xmChu();
})();
function xmChu() { const b = $("bBoXuat"); if (b) b.title = T("Xuất riêng bộ điểm đang làm (CSV, GeoJSON, Shapefile, tệp tiến độ của bộ)"); if ($("dlgExp") && $("dlgExp").open) xmVe(); }
const _setLang3191 = setLang;
setLang = function (l) { _setLang3191(l); xmChu(); };
