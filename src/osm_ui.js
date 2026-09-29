/* =============================== BẢN 2.2: OPENSTREETMAP =============================== */
/* Nguồn: tệp FlatGeobuf tải sẵn trên Hugging Face (đọc từng đoạn theo khung nhìn nhờ chỉ mục không gian), hoặc Overpass
   trực tiếp cho khung nhìn. Xem (tô theo lớp gợi ý), bảng thẻ, lọc bằng biểu thức, thống kê, sửa thẻ và hình (lưu trong
   trình duyệt, xuất GeoJSON, mở iD để đóng góp thật), rải điểm mẫu trong đa giác với lớp gợi ý theo bảng quy đổi. */
const OSM_CD = [
  {id: "sdd", ten: "Sử dụng đất (landuse, leisure)", hinh: "vung", mau: "#b54708", minZ: 12,
   op: ['nwr["landuse"]', 'nwr["leisure"~"^(park|garden|golf_course|pitch|recreation_ground|stadium|nature_reserve)$"]']},
  {id: "tunhien", ten: "Tự nhiên (rừng, cây bụi, đất ngập nước, bãi cát, núi đá)", hinh: "vung", mau: "#2e7d32", minZ: 12,
   op: ['nwr["natural"~"^(wood|scrub|grassland|heath|wetland|beach|sand|bare_rock|rock|mud|shingle)$"]']},
  {id: "nuoc", ten: "Mặt nước (sông, hồ, ao, kênh dạng vùng)", hinh: "vung", mau: "#1f5fbf", minZ: 12,
   op: ['nwr["natural"~"^(water|bay)$"]', 'nwr["water"]', 'nwr["waterway"~"^(riverbank|dock|canal)$"]', 'nwr["landuse"~"^(reservoir|basin|aquaculture)$"]']},
  {id: "kenh", ten: "Sông, kênh, mương (đường)", hinh: "duong", mau: "#3b82f6", minZ: 12, op: ['way["waterway"~"^(river|stream|canal|drain|ditch|tidal_channel)$"]']},
  {id: "duong", ten: "Đường giao thông, đường sắt", hinh: "duong", mau: "#667085", minZ: 13, op: ['way["highway"]', 'way["railway"~"^(rail|light_rail|narrow_gauge)$"]']},
  {id: "nha", ten: "Nhà, công trình (building)", hinh: "vung", mau: "#c2185b", minZ: 15, op: ['nwr["building"]']},
  {id: "diem", ten: "Điểm quan tâm (trường, chợ, cơ quan, địa danh)", hinh: "diem", mau: "#6941c6", minZ: 14,
   op: ['node["amenity"]', 'node["shop"]', 'node["tourism"]', 'node["office"]', 'node["place"]', 'node["historic"]']},
];
const OSM_HINH = {vung: /Polygon/, duong: /LineString/, diem: /Point/}, OSM_O = 0.02, OSM_MAX = 80000;
const OSM = {nguon: ls("laymau_hp_osm_nguon_v1") || "hf", bat: ls("laymau_hp_osm_bat_v1") || {}, lop: {}, loc: null, locStr: "",
             chiKhop: false, chon: null, sua: null, ve: false, hen: 0, tt: {}};
ST.osm_sua = ST.osm_sua || {};
let OSM_QD = ls("laymau_hp_osm_qd_v1") || {};      // bảng quy đổi thẻ chính -> mã lớp người dùng đã chỉnh
const osm$ = id => document.getElementById(id);

function osmDef(id) {
  const d = OSM_CD.find(x => x.id === id), m = MAN && MAN.osm && (MAN.osm.lop || []).find(x => x.id === id);
  return Object.assign({}, d, m ? {duong_dan: m.duong_dan, n: m.n} : {});
}
function osmCo(id) { const d = osmDef(id); return OSM.nguon === "op" || !!d.duong_dan; }
function osmLopGL(id) {                      // lớp Leaflet + bộ đối tượng của một chủ đề
  if (OSM.lop[id]) return OSM.lop[id];
  const L_ = {id, f: new Map(), lay: new Map(), o: new Set(), dang: 0};
  L_.g = L.geoJSON(null, {
    style: f => osmKieu(f), pmIgnore: true, bubblingMouseEvents: false,
    pointToLayer: (f, ll) => L.circleMarker(ll, {radius: 4, bubblingMouseEvents: false, pmIgnore: true}),
    onEachFeature: (f, lay) => { L_.lay.set(f.id, lay); lay.on("click", e => osmNhap(id, f.id, e)); },
  });
  return (OSM.lop[id] = L_);
}
function osmEx(f) { const t = f.properties.tags; return {lop: CORE.osmLop(t, OSM_QD), the: f.properties.the, hinh: (f.geometry || {}).type}; }
function osmKhop(f) { return !OSM.loc || OSM.loc(f.properties.tags, osmEx(f)); }
function osmKieu(f) {
  const cd = OSM_CD.find(x => x.id === f.properties.cd) || OSM_CD[0], lop = CORE.osmLop(f.properties.tags, OSM_QD);
  const mau = (lop && IDX.by[lop] && IDX.by[lop].mau) || cd.mau, sua = ST.osm_sua[f.id], khop = osmKhop(f);
  const k = {color: mau, weight: cd.hinh === "duong" ? 2 : 1, opacity: 0.9, fillColor: mau, fillOpacity: cd.hinh === "diem" ? 0.9 : 0.22, dashArray: null};
  if (sua) { k.dashArray = "4 3"; k.weight = 2; if (sua.thao_tac === "xoa") { k.color = "#d92d20"; k.fillOpacity = 0.05; } }
  if (OSM.chon && OSM.chon.fid === f.id) { k.color = "#fde047"; k.weight = 3; k.opacity = 1; }
  if (!khop) { if (OSM.chiKhop) { k.opacity = 0; k.fillOpacity = 0; } else { k.opacity = 0.15; k.fillOpacity = 0.03; } }
  return k;
}
function osmToLai() { Object.values(OSM.lop).forEach(L_ => L_.g.setStyle(f => osmKieu(f))); }
/* chuẩn hoá đối tượng về một dạng: id "way/123", properties {cd, osm_type, osm_id, the, ten, tags} */
function osmChuan(f, cd, tuOverpass) {
  let tags, ot, oi;
  if (tuOverpass) {
    const p = Object.assign({}, f.properties); delete p.id; delete p["@id"];
    tags = p; [ot, oi] = String(f.id).split("/");
  } else {
    const p = f.properties || {};
    try { tags = typeof p.tags === "string" ? JSON.parse(p.tags || "{}") : (p.tags || {}); } catch (e) { tags = {}; }
    ot = p.osm_type; oi = p.osm_id;
  }
  return {type: "Feature", id: `${ot}/${oi}`, geometry: f.geometry,
          properties: {cd, osm_type: ot, osm_id: +oi, the: CORE.osmThe(tags), ten: tags.name || "", tags}};
}
function osmThem(id, feats) {
  const L_ = osmLopGL(id), them = [];
  for (const f0 of feats) {
    if (L_.f.size >= OSM_MAX) { OSM.tt[id] = T("đã đủ {n} đối tượng: thu hẹp khung nhìn", {n: OSM_MAX}); break; }
    if (L_.f.has(f0.id) || !f0.geometry) continue;
    const f = JSON.parse(JSON.stringify(f0)), s = ST.osm_sua[f.id];
    if (s && s.tags) f.properties.tags = s.tags;
    if (s && s.geom) f.geometry = s.geom;
    f.properties.the = CORE.osmThe(f.properties.tags); f.properties.ten = f.properties.tags.name || "";
    L_.f.set(f.id, f); them.push(f);
  }
  if (them.length) L_.g.addData({type: "FeatureCollection", features: them});
  return them.length;
}
function osmO(bb) {                          // các ô 0.02° phủ khung (tây, nam, đông, bắc)
  const out = [];
  for (let x = Math.floor(bb[0] / OSM_O); x * OSM_O < bb[2]; x++) for (let y = Math.floor(bb[1] / OSM_O); y * OSM_O < bb[3]; y++) out.push([x, y]);
  return out;
}
async function osmNapFgb(id, url, o) {
  const rect = {minX: o[0] * OSM_O, minY: o[1] * OSM_O, maxX: (o[0] + 1) * OSM_O, maxY: (o[1] + 1) * OSM_O}, fs = [], def = osmDef(id);
  for await (const f of flatgeobuf.deserialize(url, {rect})) { if (OSM_HINH[def.hinh].test((f.geometry || {}).type)) fs.push(osmChuan(f, id, false)); }
  return fs;
}
const OVERPASS_DP = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
                     "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
async function osmNapOverpass(id, bb) {         // thử máy chủ trong cau_hinh.json rồi lần lượt các máy chủ dự phòng
  const def = osmDef(id), ql = CORE.overpassQL(def.op, bb, 60);
  const ds = [...new Set([(SITE && SITE.overpass) || OVERPASS_DP[0]].concat(OVERPASS_DP))];
  let loi = null;
  for (const url of ds) {
    try {
      const r = await fetch(url, {method: "POST", body: "data=" + encodeURIComponent(ql), headers: {"Content-Type": "application/x-www-form-urlencoded"}});
      if (!r.ok) throw new Error("Overpass " + r.status);
      const gj = osmtogeojson(await r.json());
      return gj.features.filter(f => OSM_HINH[def.hinh].test((f.geometry || {}).type)).map(f => osmChuan(f, id, true));
    } catch (e) { loi = e; }
  }
  throw loi || new Error("Overpass");
}
async function osmNap() {
  const b = map.getBounds(), z = map.getZoom(), pad = 0.15;
  const bb = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], dx = (bb[2] - bb[0]) * pad, dy = (bb[3] - bb[1]) * pad;
  const bbp = [bb[0] - dx, bb[1] - dy, bb[2] + dx, bb[3] + dy];
  for (const def0 of OSM_CD) {
    const id = def0.id, def = osmDef(id); if (!OSM.bat[id]) continue;
    const L_ = osmLopGL(id);
    if (!map.hasLayer(L_.g)) L_.g.addTo(map);
    if (z < def.minZ) { OSM.tt[id] = T("phóng tới mức {z} để nạp", {z: def.minZ}); continue; }
    if (!osmCo(id)) { OSM.tt[id] = T("bộ dữ liệu chưa có tệp này: chọn nguồn Overpass"); continue; }
    const thieu = osmO(bbp).filter(o => !L_.o.has(OSM.nguon + ":" + o.join(",")));
    if (!thieu.length || L_.dang) continue;
    L_.dang++; OSM.tt[id] = T("đang nạp…"); osmDungDS();
    try {
      let n = 0;
      if (OSM.nguon === "hf") {
        const url = CORE.dataUrl(CFG, def.duong_dan);
        for (let i = 0; i < thieu.length; i += 4) {
          const lo = thieu.slice(i, i + 4), kq = await Promise.all(lo.map(o => osmNapFgb(id, url, o)));
          kq.forEach((fs, j) => { n += osmThem(id, fs); L_.o.add("hf:" + lo[j].join(",")); });
        }
      } else {
        const xs = thieu.map(o => o[0]), ys = thieu.map(o => o[1]);
        const q = [Math.min(...xs) * OSM_O, Math.min(...ys) * OSM_O, (Math.max(...xs) + 1) * OSM_O, (Math.max(...ys) + 1) * OSM_O];
        if ((q[2] - q[0]) * (q[3] - q[1]) > 0.02) { OSM.tt[id] = T("khung quá rộng cho Overpass: phóng to thêm"); L_.dang--; continue; }
        n = osmThem(id, await osmNapOverpass(id, q));
        thieu.forEach(o => L_.o.add("op:" + o.join(",")));
      }
      OSM.tt[id] = OSM.tt[id] && /đủ/.test(OSM.tt[id]) ? OSM.tt[id] : "";
      void n;
    } catch (e) { OSM.tt[id] = T("lỗi: ") + (e.message || e); }
    L_.dang--;
  }
  osmDungDS(); osmGhiCong();
  if (!osm$("osmP").hidden) osmThongKeHen();
}
function osmNapHen() { clearTimeout(OSM.hen); OSM.hen = setTimeout(osmNap, 350); }
map.on("moveend", () => { if (Object.values(OSM.bat).some(Boolean)) osmNapHen(); });
function osmGhiCong() {                      // ghi công ODbL khi có lớp OSM trên bản đồ
  const co = Object.values(OSM.lop).some(L_ => map.hasLayer(L_.g)), a = "© OpenStreetMap contributors (ODbL)";
  if (co && !OSM.cong) { map.attributionControl.addAttribution(a); OSM.cong = true; }
  if (!co && OSM.cong) { map.attributionControl.removeAttribution(a); OSM.cong = false; }
}
function osmDungDS() {
  const box = osm$("osmDS"); if (!box) return;
  box.innerHTML = OSM_CD.map(d0 => {
    const d = osmDef(d0.id), L_ = OSM.lop[d0.id], n = L_ ? L_.f.size : 0;
    return `<label title="${T("nạp từ mức phóng {z}", {z: d.minZ})}"><input type="checkbox" data-cd="${d.id}"${OSM.bat[d.id] ? " checked" : ""}>` +
      `<span class="sw" style="background:${d.mau}"></span>${T(d.ten)} <span class="mu">${n ? "(" + n.toLocaleString(LOCALE[LANG] || "vi") + ")" : ""}` +
      `${d.n != null && OSM.nguon === "hf" ? " / " + d.n.toLocaleString(LOCALE[LANG] || "vi") : ""}</span></label>` +
      (OSM.bat[d.id] && OSM.tt[d.id] ? `<div class="mu sm" style="margin-left:22px">${OSM.tt[d.id]}</div>` : "");
  }).join("");
  box.querySelectorAll("input[data-cd]").forEach(i => { i.onchange = () => osmBat(i.dataset.cd, i.checked); });
  const m = MAN && MAN.osm;
  osm$("osmTT").textContent = OSM.nguon === "hf" ? (m ? T("tải sẵn ngày {d}; © OpenStreetMap contributors (ODbL)", {d: m.ngay}) :
    T("bộ dữ liệu chưa có OSM tải sẵn (chạy ô HF_OSM_cell.py) hoặc chọn nguồn Overpass")) : T("Overpass: nạp khung nhìn khi di chuyển bản đồ; © OpenStreetMap contributors (ODbL)");
}
function osmBat(id, on) {
  OSM.bat[id] = !!on; ls("laymau_hp_osm_bat_v1", OSM.bat);
  const L_ = osmLopGL(id);
  if (on) { L_.g.addTo(map); osmNap(); } else { map.removeLayer(L_.g); }
  osmDungDS(); osmGhiCong();
}
function osmDoiNguon(v) {
  OSM.nguon = v === "op" ? "op" : "hf"; ls("laymau_hp_osm_nguon_v1", OSM.nguon);
  Object.values(OSM.lop).forEach(L_ => { L_.g.clearLayers(); L_.f.clear(); L_.lay.clear(); L_.o.clear(); });
  OSM.tt = {}; osmNap();
}

/* ---------- chọn đối tượng, bảng thẻ ---------- */
function osmTim(fid) { for (const L_ of Object.values(OSM.lop)) if (L_.f.has(fid)) return {L_, f: L_.f.get(fid)}; return null; }
function osmNhap(cd, fid, e) {
  const t = osmTim(fid);
  if ((typeof VG !== "undefined" && VG.mode) || addMode || BO_VE || (t && OSM.chiKhop && !osmKhop(t.f))) {   // nhường cho công cụ khác
    map.fire("click", {latlng: e.latlng, originalEvent: e.originalEvent}); return;
  }
  if (!t) return;
  osmChon(fid);
  const div = document.createElement("div"); div.innerHTML = osmPopup(t.f);
  div.querySelector("[data-a=sua]").onclick = () => { osmMo(true); osmTab("sua"); map.closePopup(); };
  L.popup({maxWidth: 330}).setLatLng(e.latlng).setContent(div).openOn(map);
}
function osmPopup(f) {
  const p = f.properties, tags = p.tags, lop = CORE.osmLop(tags, OSM_QD), c = IDX.by[lop];
  const rows = Object.entries(tags).slice(0, 30).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  const moi = /^moi\//.test(f.id), s = ST.osm_sua[f.id];
  return `<b>${esc(p.ten || p.the || f.id)}</b> <span class="mu sm">${esc(f.id)}${s ? " · " + T(s.thao_tac === "xoa" ? "đã đánh dấu xoá" : "đã sửa") : ""}</span>` +
    (lop ? `<div class="sm">${T("lớp gợi ý")}: <span class="sw" style="background:${c ? c.mau : "#999"}"></span> <b>${lop}</b> ${c ? cten(c) : ""}</div>` : "") +
    `<table class="osm-pop">${rows || `<tr><td class="mu">${T("chưa có thẻ")}</td></tr>`}</table>` +
    (moi ? "" : `<div class="row sm"><a href="https://www.openstreetmap.org/${f.id}" target="_blank" rel="noopener noreferrer">${T("Xem trên OSM")}</a>` +
     ` · <a href="https://www.openstreetmap.org/edit?editor=id&${p.osm_type}=${p.osm_id}" target="_blank" rel="noopener noreferrer">${T("Sửa trên OSM (iD)")}</a></div>`) +
    `<div class="row"><button type="button" data-a="sua">${T("Sửa thẻ, hình trong trang")}</button></div>`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c])); }
function osmChon(fid) {
  const cu = OSM.chon; OSM.chon = fid ? {fid} : null;
  [cu && cu.fid, fid].forEach(x => { const t = x && osmTim(x); if (t) { const lay = t.L_.lay.get(x); if (lay && lay.setStyle) lay.setStyle(osmKieu(t.f)); } });
  osmVeChon();
}
function osmVeChon() {
  const box = osm$("osmChon"); if (!box) return;
  const t = OSM.chon && osmTim(OSM.chon.fid);
  if (!t) { box.innerHTML = `<span class="mu">${T("Nhấp một đối tượng OSM trên bản đồ để xem và sửa thẻ.")}</span>`; osmSoSua(); return; }
  const f = t.f, s = ST.osm_sua[f.id], moi = /^moi\//.test(f.id);
  box.innerHTML = `<div><b>${esc(f.properties.ten || f.properties.the || f.id)}</b> <span class="mu">${esc(f.id)}</span></div>` +
    `<table><tr><th>${T("khoá")}</th><th>${T("giá trị")}</th><th></th></tr>` +
    Object.entries(f.properties.tags).map(([k, v]) => `<tr><td><input type="text" data-k value="${esc(k)}"></td><td><input type="text" data-v value="${esc(v)}"></td><td><button type="button" data-x title="${T("bỏ thẻ")}">×</button></td></tr>`).join("") +
    `<tr><td><input type="text" data-k placeholder="${T("khoá mới")}"></td><td><input type="text" data-v></td><td></td></tr></table>` +
    `<div class="row"><button type="button" data-a="luu" class="on">${T("Lưu thẻ")}</button><button type="button" data-a="hinh">${OSM.sua ? T("Xong sửa hình") : T("Sửa hình")}</button>` +
    `<button type="button" data-a="xoa">${s && s.thao_tac === "xoa" ? T("Bỏ đánh dấu xoá") : T("Đánh dấu xoá")}</button>` +
    (s ? `<button type="button" data-a="goc">${moi ? T("Xoá đối tượng mới") : T("Về bản gốc")}</button>` : "") + `</div>` +
    (moi ? "" : `<div class="row sm"><a href="https://www.openstreetmap.org/edit?editor=id&${f.properties.osm_type}=${f.properties.osm_id}" target="_blank" rel="noopener noreferrer">${T("Sửa trên OSM (iD)")}</a></div>`);
  box.querySelectorAll("[data-x]").forEach(b => { b.onclick = () => { b.closest("tr").remove(); }; });
  box.querySelector("[data-a=luu]").onclick = () => osmLuuThe(f.id);
  box.querySelector("[data-a=hinh]").onclick = () => osmSuaHinh(f.id);
  box.querySelector("[data-a=xoa]").onclick = () => osmDanhXoa(f.id);
  const bg = box.querySelector("[data-a=goc]"); if (bg) bg.onclick = () => osmVeGoc(f.id);
  osmSoSua();
}
function osmGhiSua(fid, doi) {
  const t = osmTim(fid); if (!t) return;
  const f = t.f, cu = ST.osm_sua[fid];
  ST.osm_sua[fid] = Object.assign({thao_tac: /^moi\//.test(fid) ? "moi" : "sua", cd: f.properties.cd, goc_tags: cu ? cu.goc_tags : Object.assign({}, f.properties.tags)},
                                  cu || {}, doi, {tg: Date.now()});
  save(); osmVeLai(fid);
}
function osmVeLai(fid) {                     // vẽ lại một đối tượng sau khi sửa thẻ / hình
  const t = osmTim(fid); if (!t) return;
  const s = ST.osm_sua[fid];
  if (s && s.tags) t.f.properties.tags = s.tags;
  if (s && s.geom) t.f.geometry = s.geom;
  t.f.properties.the = CORE.osmThe(t.f.properties.tags); t.f.properties.ten = t.f.properties.tags.name || "";
  const lay = t.L_.lay.get(fid); if (lay) t.L_.g.removeLayer(lay);
  t.L_.lay.delete(fid); t.L_.g.addData(t.f);
  osmVeChon(); if (!osm$("osmP").hidden) osmThongKeHen();
}
function osmLuuThe(fid) {
  const box = osm$("osmChon"), tags = {};
  box.querySelectorAll("tr").forEach(tr => { const k = tr.querySelector("[data-k]"), v = tr.querySelector("[data-v]");
    if (k && v && k.value.trim() && v.value.trim()) tags[k.value.trim()] = v.value.trim(); });
  osmGhiSua(fid, {tags}); msg(T("đã lưu thẻ (chỉ trong trình duyệt)"), "ok", 2000);
}
function osmSuaHinh(fid) {
  const t = osmTim(fid); if (!t) return;
  const lay = t.L_.lay.get(fid);
  if (!(lay && lay.pm && window.L && L.PM)) { msg("không nạp được công cụ sửa hình (Leaflet-Geoman)", "wa", 3000); return; }
  if (OSM.sua === fid) {
    lay.pm.disable(); OSM.sua = null;
    osmGhiSua(fid, {geom: lay.toGeoJSON().geometry}); msg(T("đã lưu hình (chỉ trong trình duyệt)"), "ok", 2000); return;
  }
  lay.options.pmIgnore = false; L.PM.reInitLayer(lay); lay.pm.enable({allowSelfIntersection: false}); OSM.sua = fid; osmVeChon();
}
function osmDanhXoa(fid) { const s = ST.osm_sua[fid]; osmGhiSua(fid, {thao_tac: s && s.thao_tac === "xoa" ? (/^moi\//.test(fid) ? "moi" : "sua") : "xoa"}); }
function osmVeGoc(fid) {
  const s = ST.osm_sua[fid], t = osmTim(fid); if (!s || !t) return;
  delete ST.osm_sua[fid]; save();
  const lay = t.L_.lay.get(fid); if (lay) t.L_.g.removeLayer(lay); t.L_.lay.delete(fid); t.L_.f.delete(fid);
  if (/^moi\//.test(fid)) { OSM.chon = null; osmVeChon(); return; }
  if (s.goc_tags) { t.f.properties.tags = s.goc_tags; }
  t.L_.o.clear(); osmNap();                  // nạp lại hình gốc
  osmVeChon();
}
function osmSoSua() { const n = Object.keys(ST.osm_sua).length; const e = osm$("osmSoSua"); if (e) e.textContent = n ? `(${n})` : ""; }
map.on("pm:create", e => {                   // vẽ đối tượng mới (nút "+ Vẽ đối tượng mới")
  if (!OSM.ve) return;
  OSM.ve = false; try { map.pm.disableDraw(); } catch (x) { /* chưa bật */ }
  const fid = "moi/" + Date.now().toString(36), geom = e.layer.toGeoJSON().geometry; map.removeLayer(e.layer);
  const f = {type: "Feature", id: fid, geometry: geom, properties: {cd: "sdd", osm_type: "moi", osm_id: 0, the: "", ten: "", tags: {}}};
  if (!OSM.bat.sdd) { OSM.bat.sdd = true; ls("laymau_hp_osm_bat_v1", OSM.bat); osmLopGL("sdd").g.addTo(map); }
  osmThem("sdd", [f]); ST.osm_sua[fid] = {thao_tac: "moi", cd: "sdd", tags: {}, geom, tg: Date.now()}; save();
  osmChon(fid); osmMo(true); osmTab("sua"); msg(T("đã vẽ đối tượng mới: thêm thẻ rồi Lưu thẻ"), "ok", 3000);
});

/* ---------- bảng OSM: lọc, thống kê, xuất ---------- */
function osmMo(on) {
  const p = osm$("osmP"); p.hidden = on == null ? !p.hidden : !on;
  osm$("osmMo").classList.toggle("on", !p.hidden);
  if (!p.hidden) { osmGoiY(); osmVeChon(); osmThongKe(); osmNamSel(); }
}
function osmTab(t) {
  document.querySelectorAll("#osmP [data-otab]").forEach(b => b.classList.toggle("on", b.dataset.otab === t));
  document.querySelectorAll("#osmP [data-opane]").forEach(x => { x.hidden = x.dataset.opane !== t; });
  if (t === "mau") osmQuyDoi();
}
function osmGoiY() {
  const vd = ["landuse=industrial", "landuse=residential", "landuse=farmland|paddy", "natural=water", "water=pond|fishpond", "building", "@lop=X3", "name~Cát"];
  osm$("osmGoiY").innerHTML = vd.map(v => `<button type="button" data-v="${esc(v)}">${esc(v)}</button>`).join("");
  osm$("osmGoiY").querySelectorAll("button").forEach(b => { b.onclick = () => { osm$("osmLoc").value = b.dataset.v; osmApDung(); }; });
}
function osmApDung() {
  const s = osm$("osmLoc").value.trim();
  try { OSM.loc = s ? CORE.osmLoc(s) : null; OSM.locStr = s; osm$("osmTrang").textContent = ""; }
  catch (e) { osm$("osmTrang").textContent = T("biểu thức lọc lỗi: ") + e.message; return; }
  osmToLai(); osmThongKe(); if (!osm$("osmQD").closest("[data-opane]").hidden) osmQuyDoi();
}
function osmPhamVi() {                       // đối tượng khớp lọc trong phạm vi (khung nhìn hoặc mọi đối tượng đã nạp)
  const nhin = osm$("osmPV").value !== "nap", b = map.getBounds(), out = [];
  Object.values(OSM.lop).forEach(L_ => {
    if (!map.hasLayer(L_.g)) return;
    L_.f.forEach(f => {
      if (!osmKhop(f)) return;
      if (nhin) { const lay = L_.lay.get(f.id); if (!lay) return; const bb = lay.getBounds ? lay.getBounds() : L.latLngBounds([lay.getLatLng()]); if (!b.intersects(bb)) return; }
      out.push(f);
    });
  });
  return out;
}
function osmDo(f) {                          // diện tích (ha) cho đa giác, chiều dài (km) cho đường
  const g = f.geometry, mp = CORE.geomMP(g);
  if (mp) return {ha: CORE.geodesicArea(mp) / 1e4};
  if (/LineString/.test(g.type)) {
    const ls_ = g.type === "LineString" ? [g.coordinates] : g.coordinates; let d = 0;
    ls_.forEach(l => { for (let i = 1; i < l.length; i++) d += L.latLng(l[i - 1][1], l[i - 1][0]).distanceTo(L.latLng(l[i][1], l[i][0])); });
    return {km: d / 1000};
  }
  return {};
}
let osmTKHen = 0;
function osmThongKeHen() { clearTimeout(osmTKHen); osmTKHen = setTimeout(osmThongKe, 300); }
function osmThongKe() {
  const fs = osmPhamVi(), nhom = {};
  let ha = 0, km = 0;
  fs.forEach(f => { const d = osmDo(f), k = f.properties.the || T("(không thẻ chính)"); const g = nhom[k] = nhom[k] || {n: 0, ha: 0, km: 0};
    g.n++; if (d.ha) { g.ha += d.ha; ha += d.ha; } if (d.km) { g.km += d.km; km += d.km; } });
  const ds = Object.entries(nhom).sort((a, b) => b[1].n - a[1].n);
  osm$("osmTK").innerHTML = `<div><b>${fs.length.toLocaleString(LOCALE[LANG] || "vi")}</b> ${T("đối tượng")}` + (ha ? ` · ${ha.toFixed(1)} ha` : "") + (km ? ` · ${km.toFixed(1)} km` : "") +
    (OSM.locStr ? ` · <span class="mu">${esc(OSM.locStr)}</span>` : "") + `</div>` +
    (ds.length ? `<table>` + ds.slice(0, 12).map(([k, g]) => `<tr><td>${esc(k)}</td><td>${g.n}</td><td>${g.ha ? g.ha.toFixed(1) + " ha" : g.km ? g.km.toFixed(1) + " km" : ""}</td></tr>`).join("") +
      (ds.length > 12 ? `<tr><td colspan="3" class="mu">${T("và {n} loại khác", {n: ds.length - 12})}</td></tr>` : "") + `</table>` : "");
  osm$("osmKQ").innerHTML = fs.length ? `<table>` + fs.slice(0, 100).map(f => `<tr data-f="${esc(f.id)}"><td>${esc(f.properties.ten || f.properties.the || f.id)}</td>` +
    `<td class="mu">${esc(CORE.osmLop(f.properties.tags, OSM_QD) || "")}</td><td><button type="button">${T("xem")}</button></td></tr>`).join("") + `</table>` +
    (fs.length > 100 ? `<div class="mu">${T("hiện 100 / {n}", {n: fs.length})}</div>` : "") : "";
  osm$("osmKQ").querySelectorAll("tr[data-f]").forEach(tr => { tr.querySelector("button").onclick = () => {
    const t = osmTim(tr.dataset.f); if (!t) return; const lay = t.L_.lay.get(t.f.id);
    if (lay.getBounds) map.fitBounds(lay.getBounds(), {maxZoom: 18, padding: [40, 40]}); else map.setView(lay.getLatLng(), 18);
    osmChon(t.f.id); }; });
}
function osmXuat(fs, ten) {
  const fc = {type: "FeatureCollection", nguon: "© OpenStreetMap contributors, ODbL 1.0", features: fs.map(f => ({type: "Feature", geometry: f.geometry,
    properties: Object.assign({osm_id: f.id, the: f.properties.the, ten: f.properties.ten, lop_goi_y: CORE.osmLop(f.properties.tags, OSM_QD) || ""},
                              ST.osm_sua[f.id] ? {thao_tac: ST.osm_sua[f.id].thao_tac} : {}, f.properties.tags)}))};
  download(`${ten}_${stamp()}.geojson`, JSON.stringify(fc), "application/geo+json");
}
function osmXuatSua() {
  const fs = Object.entries(ST.osm_sua).map(([fid, s]) => ({type: "Feature", geometry: s.geom || ((osmTim(fid) || {}).f || {}).geometry || null,
    properties: Object.assign({osm_id: fid, thao_tac: s.thao_tac, cap_nhat: new Date(s.tg).toISOString()}, s.tags || ((osmTim(fid) || {}).f || {properties: {}}).properties.tags || {})}));
  download(`osm_sua_doi_${stamp()}.geojson`, JSON.stringify({type: "FeatureCollection", nguon: "© OpenStreetMap contributors, ODbL 1.0", features: fs}), "application/geo+json");
}

/* ---------- lấy mẫu từ OSM ---------- */
function osmNamSel() {
  const s = osm$("osmNam"), ys = boMoiNam();
  s.innerHTML = ys.map(y => `<option${y === ST.nam ? " selected" : ""}>${y}</option>`).join("");
}
function osmQuyDoi() {                       // bảng quy đổi các thẻ chính đang có (đa giác khớp lọc trong phạm vi)
  const fs = osmPhamVi().filter(f => CORE.geomMP(f.geometry)), nhom = {};
  fs.forEach(f => { const k = f.properties.the; if (!k) return; const g = nhom[k] = nhom[k] || {n: 0, t: f.properties.tags}; g.n++; });
  const ds = Object.entries(nhom).sort((a, b) => b[1].n - a[1].n).slice(0, 60);
  const opt = sel => [["", T("(bỏ qua)")]].concat((SCHEME.lop || []).map(c => [c.ma, `${c.ma} ${cten(c)}`])).map(([v, t]) => `<option value="${v}"${v === sel ? " selected" : ""}>${esc(t)}</option>`).join("");
  osm$("osmQD").innerHTML = ds.length ? `<table><tr><th>${T("thẻ chính")}</th><th>${T("số")}</th><th>${T("lớp")}</th></tr>` +
    ds.map(([k, g]) => `<tr><td>${esc(k)}</td><td>${g.n}</td><td><select data-the="${esc(k)}">${opt(CORE.osmLop(g.t, OSM_QD))}</select></td></tr>`).join("") + `</table>` :
    `<span class="mu">${T("chưa có đa giác OSM nào khớp: bật chủ đề (sử dụng đất, mặt nước, nhà) và lọc")}</span>`;
  osm$("osmQD").querySelectorAll("select[data-the]").forEach(s => { s.onchange = () => { OSM_QD[s.dataset.the] = s.value; ls("laymau_hp_osm_qd_v1", OSM_QD); osmToLai(); }; });
}
function osmTaoBo() {
  const fs = osmPhamVi().filter(f => CORE.geomMP(f.geometry) && !(ST.osm_sua[f.id] && ST.osm_sua[f.id].thao_tac === "xoa"));
  const n = Math.max(1, +osm$("osmN").value || 30), dmin = Math.max(0, +osm$("osmDmin").value || 0), bien = Math.max(0, +osm$("osmBien").value || 0);
  const y = +osm$("osmNam").value || ST.nam, ganSan = osm$("osmGanSan").checked, rf = CORE.rnd(Date.now() % 2147483647);
  const theoLop = {};
  fs.forEach(f => { const lop = CORE.osmLop(f.properties.tags, OSM_QD); if (lop) (theoLop[lop] = theoLop[lop] || []).push(f); });
  const pts = [], dem = {};
  Object.entries(theoLop).forEach(([lop, ds]) => {
    const P = ds.map(f => ({mp: CORE.geomMP(f.geometry), f}));
    CORE.rdTrongDaGiac(P, n, dmin, bien, rf).forEach(q => {
      const f = P[q.i].f; dem[lop] = (dem[lop] || 0) + 1;
      pts.push({lon: q.lon, lat: q.lat, osm: {id: f.id, the: f.properties.the, lop}, nhan: ganSan ? {[y]: lop} : undefined});
    });
  });
  if (!pts.length) { osm$("osmMauTT").textContent = T("không rải được điểm nào: cần đa giác OSM khớp lọc và có lớp trong bảng quy đổi"); return; }
  const ten = osm$("osmTenBo").value.trim() || T("mẫu OSM {d}", {d: new Date().toISOString().slice(0, 10)});
  const nam = [...new Set(CFG.years.concat([y]))].sort((a, b) => a - b);
  taoBoTuDiem(ten, nam, pts, {cach: "osm", tham_so: {loc: OSM.locStr, n_moi_lop: n, cach_nhau_m: dmin, cach_mep_m: bien, nam_goi_y: y, gan_san: ganSan,
    quy_doi: Object.fromEntries(Object.entries(theoLop).map(([l, ds]) => [l, [...new Set(ds.map(f => f.properties.the))]])), nguon_osm: OSM.nguon}});
  osm$("osmMauTT").textContent = T("đã rải {n} điểm: {d}", {n: pts.length, d: Object.entries(dem).map(([l, k]) => `${l} ${k}`).join(", ")});
}

/* ---------- gắn sự kiện ---------- */
osm$("osmNguon").value = OSM.nguon;
osm$("osmNguon").onchange = () => osmDoiNguon(osm$("osmNguon").value);
osm$("osmMo").onclick = () => osmMo();
osm$("osmDong").onclick = () => osmMo(false);
osm$("osmThu").onclick = () => { const b = osm$("osmBody"); b.hidden = !b.hidden; osm$("osmThu").textContent = b.hidden ? "+" : "–"; };
document.querySelectorAll("#osmP [data-otab]").forEach(b => { b.onclick = () => osmTab(b.dataset.otab); });
osm$("osmApDung").onclick = osmApDung;
osm$("osmLoc").addEventListener("keydown", e => { if (e.key === "Enter") osmApDung(); });
osm$("osmChiKhop").onchange = () => { OSM.chiKhop = osm$("osmChiKhop").checked; osmToLai(); };
osm$("osmPV").onchange = () => { osmThongKe(); osmQuyDoi(); };
osm$("osmXuatLoc").onclick = () => osmXuat(osmPhamVi(), "osm_loc");
osm$("osmXuatSua").onclick = osmXuatSua;
osm$("osmBoHet").onclick = () => { if (!Object.keys(ST.osm_sua).length || !confirm(T("Bỏ mọi sửa đổi OSM trong trình duyệt?"))) return;
  ST.osm_sua = {}; save(); Object.values(OSM.lop).forEach(L_ => { L_.g.clearLayers(); L_.f.clear(); L_.lay.clear(); L_.o.clear(); }); OSM.chon = null; osmNap(); osmVeChon(); };
osm$("osmVe").onclick = () => {
  if (!(map.pm && window.L && L.PM)) { msg("không nạp được công cụ vẽ (Leaflet-Geoman)", "wa", 3000); return; }
  OSM.ve = true; map.pm.enableDraw("Polygon", {snappable: true}); msg(T("vẽ đa giác trên bản đồ, nhấp điểm đầu để khép"), "ok", 4000);
};
osm$("osmTaoBo").onclick = osmTaoBo;
map.on("zoomend", () => { if (!osm$("osmP").hidden) osmThongKeHen(); });
["osmP"].forEach(id => { const el = osm$(id); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
  el._chanNhap = ev => ev.stopPropagation(); el.addEventListener("click", el._chanNhap); });
(function keoOSM() {                         // kéo bảng OSM bằng thanh tiêu đề
  const el = osm$("osmP"), dau = el.querySelector(".vg-dau"); let st = null;
  const vt = ls("laymau_hp_osm_vt_v1"); if (vt) { el.style.left = vt[0] + "px"; el.style.top = vt[1] + "px"; }
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; const pa = el.parentElement;
    el.style.left = Math.max(0, Math.min(pa.clientWidth - 80, st.l + e.clientX - st.x)) + "px";
    el.style.top = Math.max(0, Math.min(pa.clientHeight - 40, st.t + e.clientY - st.y)) + "px"; });
  document.addEventListener("mouseup", () => { if (st) { ls("laymau_hp_osm_vt_v1", [parseInt(el.style.left) || 470, parseInt(el.style.top) || 10]); st = null; } });
  dau.addEventListener("dblclick", () => { el.style.left = "470px"; el.style.top = "10px"; ls("laymau_hp_osm_vt_v1", null); });
})();
function osmDoiNgonNgu() { osm$("osmMauTT").textContent = ""; osmDungDS(); if (!osm$("osmP").hidden) { osmGoiY(); osmVeChon(); osmThongKe(); if (!osm$("osmQD").closest("[data-opane]").hidden) osmQuyDoi(); } }
