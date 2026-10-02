/* =============================== BẢN 3.3: RANH GIỚI TOÀN THẾ GIỚI (OpenStreetMap) =============================== */
/* Tìm một nơi bất kỳ (thành phố, quận, phường...) bằng Nominatim; liệt kê các cấp hành chính (admin_level) nằm trong nơi đó bằng
   Overpass API; nạp một cấp làm "ranh giới xã" của trang: tìm theo tên, tên trên bản đồ, gộp vùng, phạm vi phân tích dùng được như
   với xã Việt Nam. Chỉ gửi yêu cầu khi người dùng bấm tìm hoặc chọn (theo quy định dùng Nominatim: không tự gợi ý khi gõ). */
var THG = {cha: null, cap: null, dangDung: false, ma: "", ten: "", lop: L.layerGroup(), dsCap: [], tNomi: 0, OVP: ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]};
var thg$ = id => document.getElementById(id);
async function thgTim(q) {                          // -> [{ten, ngan, kieu, osmType, osmId, bl, gj, hang}]
  const cho = 1100 - (Date.now() - THG.tNomi); if (cho > 0) await new Promise(r => setTimeout(r, cho));     // tối đa 1 yêu cầu mỗi giây
  THG.tNomi = Date.now();
  const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&polygon_threshold=0.0005&limit=10&q=" + encodeURIComponent(q) +
            "&accept-language=" + encodeURIComponent(LANG || "en");
  const r = await fetch(u); if (!r.ok) throw new Error("Nominatim " + r.status);
  return (await r.json()).map(x => ({ten: x.display_name, ngan: x.name || x.display_name.split(",")[0], kieu: x.addresstype || x.type, osmType: x.osm_type, osmId: x.osm_id,
    hang: x.place_rank, bl: [+x.boundingbox[2], +x.boundingbox[0], +x.boundingbox[3], +x.boundingbox[1]], gj: x.geojson}));
}
async function thgOvp(q) {                          // Overpass: thử máy chủ thứ hai khi máy thứ nhất bận
  let loi = null;
  for (const u of THG.OVP) {
    try { const r = await fetch(u, {method: "POST", body: "data=" + encodeURIComponent(q)}); if (r.ok) return await r.json(); loi = new Error("Overpass " + r.status); }
    catch (e) { loi = e; }
  }
  throw loi;
}
function thgKQ(ds, box, chon) {
  box.innerHTML = ds.length ? ds.map((r, i) => `<button type="button" data-i="${i}" title="${esc(r.ten)}">${esc(r.ngan)} <span class="mu">· ${esc(r.kieu || "")} · ${esc(r.ten.split(",").slice(-1)[0].trim())}</span></button>`).join("")
    : `<span class="mu sm">${T("không thấy")}</span>`;
  box.querySelectorAll("[data-i]").forEach(b => { b.onclick = () => chon(ds[+b.dataset.i]); });
}
async function thgTimUI() {
  const q = thg$("thgTim").value.trim(); if (q.length < 2) return;
  thg$("thgTT").textContent = T("đang tìm…");
  try { const ds = await thgTim(q); thg$("thgTT").textContent = ""; thgKQ(ds, thg$("thgKQ"), thgChonCha); }
  catch (e) { thg$("thgTT").textContent = T("lỗi: ") + (e.message || e); }
}
function thgVeCha() {
  THG.lop.clearLayers(); const c = THG.cha; if (!c) { map.removeLayer(THG.lop); return; }
  if (c.mp) L.polygon(c.mp.map(pg => pg.map(r => r.map(q => [q[1], q[0]]))), {color: "#f97316", weight: 3, fill: false, dashArray: "8 5", interactive: false, pmIgnore: true}).addTo(THG.lop);
  THG.lop.addTo(map);
}
async function thgChonCha(r) {                      // chọn nơi cha: vẽ ranh giới, bay tới, đếm các cấp hành chính bên trong
  const mp = r.gj && /Polygon/.test(r.gj.type) ? vgMP(r.gj) : null;
  THG.cha = {osmType: r.osmType, osmId: r.osmId, ten: r.ngan, ten_day_du: r.ten, bl: r.bl, mp};
  ls("laymau_hp_thg_v1", {cha: Object.assign({}, THG.cha, {mp: null}), cap: null});
  map.fitBounds([[r.bl[1], r.bl[0]], [r.bl[3], r.bl[2]]]);
  thgVeCha(); thg$("thgKQ").innerHTML = "";
  thg$("thgCha").innerHTML = `<b>${esc(r.ngan)}</b> <span class="mu">· ${esc(r.ten)}</span>`;
  await thgDemCap();
}
function thgVung() {                                // đoạn Overpass tạo vùng từ nơi cha
  const c = THG.cha; return c.osmType === "relation" ? `rel(${c.osmId})` : c.osmType === "way" ? `way(${c.osmId})` : null;
}
async function thgDemCap() {
  const box = thg$("thgCap"); box.innerHTML = ""; const v = thgVung();
  if (!v) { thg$("thgTT").textContent = T("nơi này là một điểm, không có ranh giới: chọn một kết quả là vùng (thành phố, quận, tỉnh)"); return; }
  thg$("thgTT").textContent = T("đang đếm các cấp hành chính bên trong…");
  try {
    const j = await thgOvp(`[out:json][timeout:90];${v};out tags;${v};map_to_area->.a;rel(area.a)["boundary"="administrative"]["admin_level"];out tags bb;`);
    const goc = j.elements[0], lvCha = goc && goc.tags && +goc.tags.admin_level || 0, dem = {};
    j.elements.slice(1).forEach(e => { const l = +e.tags.admin_level; if (!(l > lvCha)) return;
      const b = e.bounds, cx = b ? (b.minlon + b.maxlon) / 2 : null, cy = b ? (b.minlat + b.maxlat) / 2 : null;
      if (THG.cha.mp && cx != null && !vgPIP(cx, cy, THG.cha.mp)) return;            // đơn vị láng giềng chỉ chạm ranh giới: bỏ
      (dem[l] = dem[l] || []).push(e.tags["name:" + LANG] || e.tags.name || "?"); });
    THG.dsCap = Object.keys(dem).map(Number).sort((a, b) => a - b);
    thg$("thgTT").textContent = THG.dsCap.length ? T("chọn một cấp để nạp làm ranh giới xã của trang:") : T("OpenStreetMap không có cấp hành chính nào bên dưới nơi này");
    box.innerHTML = THG.dsCap.map(l => `<button type="button" data-l="${l}" title="${esc(dem[l].slice(0, 8).join(", "))}">${T("cấp {l}", {l})} · ${dem[l].length} <span class="mu">(${esc(dem[l].slice(0, 2).join(", "))}${dem[l].length > 2 ? "…" : ""})</span></button>`).join("");
    box.querySelectorAll("[data-l]").forEach(b => { b.onclick = () => thgNapCap(+b.dataset.l, dem[+b.dataset.l].length); });
  } catch (e) { thg$("thgTT").textContent = T("lỗi: ") + (e.message || e); }
}
async function thgNapCap(l, n) {
  if (n > 3000) { thg$("thgTT").textContent = T("quá nhiều đơn vị ({n}): chọn nơi nhỏ hơn hoặc cấp cao hơn", {n}); return; }
  thg$("thgTT").textContent = T("đang nạp {n} đơn vị cấp {l}…", {n, l});
  try {
    const j = await thgOvp(`[out:json][timeout:180];${thgVung()};map_to_area->.a;rel(area.a)["boundary"="administrative"]["admin_level"="${l}"];out geom;`);
    const gj = osmtogeojson(j), feats = [];
    gj.features.forEach(f => {
      if (!f.geometry || !/Polygon/.test(f.geometry.type)) return;
      const mp = vgMP(f.geometry), r0 = mp[0][0]; let sx = 0, sy = 0; r0.forEach(q => { sx += q[0]; sy += q[1]; });
      const p0 = [sx / r0.length, sy / r0.length];
      if (THG.cha.mp && !vgPIP(p0[0], p0[1], THG.cha.mp) && !vgPIP(r0[0][0], r0[0][1], THG.cha.mp)) return;
      const tg = f.properties.tags || f.properties;
      feats.push({type: "Feature", properties: {ten: tg["name:" + LANG] || tg.name || "?", osm: f.id, admin_level: l}, geometry: f.geometry});
    });
    if (!feats.length) throw new Error(T("không có đơn vị nào"));
    THG.cap = l; THG.dangDung = true; THG.ma = "w" + THG.cha.osmType[0] + THG.cha.osmId; THG.ten = THG.cha.ten;
    vgNapXa({type: "FeatureCollection", features: feats});
    $("cVnXa").checked = true; $("cVnXa").dispatchEvent(new Event("change")); if ($("cVnXa").onchange) $("cVnXa").onchange();
    ls("laymau_hp_thg_v1", {cha: Object.assign({}, THG.cha, {mp: null}), cap: l});
    thg$("thgTT").textContent = T("đã nạp {n} đơn vị cấp {l} của {t}: dùng cho tìm, tên, gộp vùng, phạm vi", {n: feats.length, l, t: THG.cha.ten});
    if (typeof xgNapPV === "function") xgNapPV();
    document.dispatchEvent(new CustomEvent("xa27"));
  } catch (e) { thg$("thgTT").textContent = T("lỗi: ") + (e.message || e); }
}
/* nơi đang nạp là "tỉnh" của trang khi đặt tên phạm vi */
if (typeof v27TinhTen === "function") { const _tt33 = v27TinhTen; v27TinhTen = function (ma) { return !ma && THG.dangDung ? THG.ten : _tt33.apply(this, arguments); }; }
if (typeof v27ChonTinh === "function") { const _ct33 = v27ChonTinh; v27ChonTinh = async function () { THG.dangDung = false; THG.lop.clearLayers(); return _ct33.apply(this, arguments); }; }
/* ô tìm trên bản đồ: thêm dòng tìm trên toàn thế giới */
if (typeof xaVeGoiY === "function") {
  const _vgy33 = xaVeGoiY;
  xaVeGoiY = function () {
    _vgy33.apply(this, arguments);
    const u = $("xaGoiY"), q = $("xaTim").value.trim(); if (q.length < 2) return;
    const i = XT.ds.length; XT.ds.push({theGioi: q}); if (XT.i < 0) XT.i = i;
    u.querySelectorAll("li.mu").forEach(li => li.remove());
    u.insertAdjacentHTML("beforeend", `<li data-i="${i}" data-w class="${XT.i === i ? "on" : ""}">🌍 ${esc(T("tìm “{q}” trên toàn thế giới", {q}))}</li>`);
    u.querySelector(`li[data-i="${i}"]`).onmousedown = ev => { ev.preventDefault(); xaChonTim(XT.ds[i]); };
    u.hidden = false;
  };
  const _xct33 = xaChonTim;
  xaChonTim = async function (x) {
    if (x && x.theGioi) {
      const u = $("xaGoiY"); u.innerHTML = `<li class="mu">${T("đang tìm…")}</li>`; u.hidden = false;
      try { const ds = await thgTim(x.theGioi); XT.ds = ds.map(r => ({thgR: r})); XT.i = ds.length ? 0 : -1;
        u.innerHTML = ds.length ? ds.map((r, i) => `<li data-i="${i}" class="${i === 0 ? "on" : ""}" title="${esc(r.ten)}">🌍 ${esc(r.ngan)} <span class="mu">· ${esc(r.kieu || "")} · ${esc(r.ten.split(",").slice(-1)[0].trim())}</span></li>`).join("") : `<li class="mu">${T("không thấy")}</li>`;
        u.querySelectorAll("li[data-i]").forEach(li => { li.onmousedown = ev => { ev.preventDefault(); xaChonTim(XT.ds[+li.dataset.i]); }; });
      } catch (e) { u.innerHTML = `<li class="mu">${T("lỗi: ")}${esc(e.message || e)}</li>`; }
      return;
    }
    if (x && x.thgR) { $("xaGoiY").hidden = true; $("xaTim").value = x.thgR.ngan; if (thg$("thgW")) thg$("thgW").open = true; await thgChonCha(x.thgR); return; }
    return _xct33.apply(this, arguments);
  };
}
(function () {
  if (!thg$("thgW")) return;
  thg$("thgTimB").onclick = thgTimUI;
  thg$("thgTim").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); thgTimUI(); } e.stopPropagation(); });
  const cu = ls("laymau_hp_thg_v1");
  if (cu && cu.cha) {                                // lần trước đã chọn: không tự tải lại (đỡ mạng), cho một nút nạp lại
    thg$("thgCha").innerHTML = `<b>${esc(cu.cha.ten)}</b> <button type="button" data-lai>${cu.cap ? T("nạp lại cấp {l}", {l: cu.cap}) : T("mở lại")}</button>`;
    thg$("thgCha").querySelector("[data-lai]").onclick = async () => {
      THG.cha = cu.cha; map.fitBounds([[cu.cha.bl[1], cu.cha.bl[0]], [cu.cha.bl[3], cu.cha.bl[2]]]);
      try { const ds = await thgTim(cu.cha.ten_day_du || cu.cha.ten); const r = ds.find(z => z.osmId === cu.cha.osmId && z.osmType === cu.cha.osmType); if (r && r.gj) THG.cha.mp = /Polygon/.test(r.gj.type) ? vgMP(r.gj) : null; } catch (e) { /* vẽ không được thì thôi */ }
      thgVeCha(); thg$("thgCha").innerHTML = `<b>${esc(cu.cha.ten)}</b>`;
      if (cu.cap) await thgNapCap(cu.cap, 0); else await thgDemCap();
    };
  }
})();

if (typeof setLang === "function") {               // đổi ngôn ngữ: bỏ danh sách gợi ý cũ (chữ theo ngôn ngữ trước)
  const _sl33 = setLang; setLang = function () { const r = _sl33.apply(this, arguments); const u = $("xaGoiY"); if (u) { u.innerHTML = ""; u.hidden = true; } return r; };
}
