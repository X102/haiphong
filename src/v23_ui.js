/* =============================== BẢN 2.3 =============================== */
/* ① điểm tra cứu: nhấp bất kỳ chỗ nào trên bản đồ để xem dải ảnh theo năm và đường mùa vụ ở đó, không cần tạo điểm;
   ② ẩn bảng điều khiển chính để rộng bản đồ; ③ tìm xã, phường theo tên (gõ không dấu cũng được) và bay tới đó. */

/* ---------------- ① điểm tra cứu ---------------- */
let TRA_ON = ls("laymau_hp_tra_v1"); if (TRA_ON === null) TRA_ON = true;
let traDau = null;
function traVeDau() {
  if (traDau) { map.removeLayer(traDau); traDau = null; }
  if (!PROBE) return;
  const c = CORE.snap(PROBE.x, PROBE.y);
  traDau = L.layerGroup([
    L.polygon(CORE.squareLL(c[0], c[1], 5), {color: "#c026d3", weight: 2, fill: false, interactive: false, pmIgnore: true}),
    L.circleMarker([PROBE.lat, PROBE.lon], {radius: 12, color: "#c026d3", weight: 2, fill: false, dashArray: "3 3", interactive: false, pmIgnore: true}),
  ]).addTo(map);
}
function traDat(ll, khongMo) {                // đặt điểm tra cứu (bắt vào tâm ô 10 m như điểm thường)
  PROBE = CORE.newPoint("⌖", ll.lng, ll.lat, {bo: ""});
  traVeDau();
  if (!khongMo && isMobile() && document.body.dataset.sheet === "min") sheet("mid");
  renderStrip(); renderCurve();
}
function traBo() { if (!PROBE) return; PROBE = null; traVeDau(); renderStrip(); renderCurve(); }
function vzNguon() {                          // dòng đầu khu dải ảnh + đường mùa vụ: đang xem điểm nào
  const b = $("vzNguon"); if (!b) return;
  const P = PROBE, p = cur();
  b.classList.toggle("tra", !!P);
  if (P) {
    b.innerHTML = `<b>⌖ ${T("Điểm tra cứu")}</b> <span class="mu">${P.lat.toFixed(5)}, ${P.lon.toFixed(5)}</span>` +
      `<button type="button" data-a="lk" title="${T("liên kết ngoài cho chỗ này")}">🔗</button>` +
      `<button type="button" data-a="them" title="${T("tạo điểm thật ở chỗ này để gán nhãn")}">＋ ${T("thêm thành điểm")}</button>` +
      `<button type="button" data-a="ve" title="${T("bỏ điểm tra cứu")}">${p ? "↩ " + T("về điểm {id}", {id: p.id}) : "×"}</button>`;
  } else if (p) {
    b.innerHTML = `<span class="mu">${T("Đang xem điểm")}</span> <b>${p.id}</b>` + (TRA_ON ? ` <span class="mu">· ${T("nhấp chỗ khác trên bản đồ để tra cứu nhanh")}</span>` : "");
  } else b.innerHTML = TRA_ON ? `<span class="mu">${T("Nhấp một chỗ bất kỳ trên bản đồ để xem dải ảnh theo năm và đường mùa vụ tại đó.")}</span>` : "";
  b.querySelectorAll("button").forEach(x => { x.onclick = () => {
    if (x.dataset.a === "ve") traBo();
    else if (x.dataset.a === "lk" && PROBE) showInfo(L.latLng(PROBE.lat, PROBE.lon));
    else if (x.dataset.a === "them" && PROBE) { const q = PROBE; themDiemTai(q.lon, q.lat); msg(T("đã thêm điểm tại chỗ tra cứu: gán nhãn bằng phím lớp"), "ok", 3000); }
  }; });
}
function traBat(on) {
  TRA_ON = !!on; ls("laymau_hp_tra_v1", TRA_ON); $("cTra").checked = TRA_ON;
  if (!TRA_ON) traBo(); else vzNguon();
}
$("cTra").checked = TRA_ON;
$("cTra").onchange = () => traBat($("cTra").checked);
map.on("click", e => {
  if (!TRA_ON || addMode || BO_VE || (typeof VG !== "undefined" && VG.mode) || (typeof OSM !== "undefined" && OSM.ve)) return;
  traDat(e.latlng);
});
const _selectGoc23 = select;
select = function (id, pan) { PROBE = null; traVeDau(); return _selectGoc23(id, pan); };    // chọn điểm thật: bỏ điểm tra cứu

/* ---------------- ② ẩn bảng điều khiển chính ---------------- */
function sideAn(on) {
  document.body.classList.toggle("side-an", !!on); ls("laymau_hp_sidean_v1", !!on);
  const b = $("ctlSide"); if (b) b.hidden = !on;
  setTimeout(() => { map.invalidateSize(); if (vizPt()) renderCurve(); }, 60);
}
$("bSideAn").onclick = () => sideAn(true);
document.addEventListener("keydown", e => {
  const t = e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "[" && !isMobile()) { sideAn(!document.body.classList.contains("side-an")); e.preventDefault(); }
});

/* ---------------- ③ tìm xã theo tên ---------------- */
const XT = {hl: null, ds: [], i: -1, t: 0};
const Ctl23 = L.Control.extend({
  options: {position: "topleft"},
  onAdd() {
    const d = L.DomUtil.create("div", "ctl23");
    d.innerHTML = `<button type="button" id="ctlSide" title="Mở bảng điều khiển (phím [ )" hidden>☰</button>
      <div class="tx"><button type="button" id="xaTimB" title="Tìm xã, phường theo tên">🔎</button>
        <input id="xaTim" type="text" placeholder="tìm xã, phường…" autocomplete="off" hidden><ul id="xaGoiY" hidden></ul></div>`;
    L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
    return d;
  },
});
new Ctl23().addTo(map);
applyStatic(document.querySelector(".ctl23"));
$("ctlSide").hidden = !document.body.classList.contains("side-an");
$("ctlSide").onclick = () => sideAn(false);
async function xaSan() {                       // nạp ranh giới xã khi cần (nút tìm có thể dùng khi chưa mở Chọn vùng)
  if (!VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  return VG.xa || [];
}
function xaGoiY(q) {                           // xã bắt đầu bằng chuỗi gõ trước, rồi xã chứa chuỗi đó
  const k = CORE.khongDau(q), all = VG.xa || []; if (!k) return [];
  const dau = all.filter(x => x.kd.startsWith(k) || x.kd.split(/\s+/).some(w => w.startsWith(k)));
  const chua = all.filter(x => !dau.includes(x) && x.kd.includes(k));
  return dau.sort((a, b) => a.ten.localeCompare(b.ten, "vi")).concat(chua).slice(0, 12);
}
function xaVeGoiY() {
  const u = $("xaGoiY"), q = $("xaTim").value;
  XT.ds = xaGoiY(q); XT.i = XT.ds.length ? 0 : -1;
  if (!q.trim()) { u.hidden = true; return; }
  u.innerHTML = XT.ds.length ? XT.ds.map((x, i) => `<li data-i="${i}" class="${i === XT.i ? "on" : ""}">${x.ten}</li>`).join("") :
    `<li class="mu">${VG.xa ? T("không có xã nào khớp") : T("chưa có ranh giới xã")}</li>`;
  u.hidden = false;
  u.querySelectorAll("li[data-i]").forEach(li => { li.onmousedown = ev => { ev.preventDefault(); xaChonTim(XT.ds[+li.dataset.i]); }; });
}
function xaToSang(xs, giu) {                  // tô sáng và phóng tới một hoặc nhiều xã
  if (XT.hl) { map.removeLayer(XT.hl); XT.hl = null; } clearTimeout(XT.t);
  if (!xs.length) return;
  XT.hl = L.featureGroup(xs.map(x => L.polygon(x.mp.map(pg => pg.map(r => r.map(q => [q[1], q[0]]))),
    {color: "#facc15", weight: 3, fillColor: "#fde047", fillOpacity: 0.08, interactive: false, pmIgnore: true})
    .bindTooltip(x.ten, {permanent: true, direction: "center", className: "vg-tip"}))).addTo(map);
  map.fitBounds(XT.hl.getBounds(), {padding: [30, 30], maxZoom: 16});
  if (!giu) XT.t = setTimeout(() => { if (XT.hl) { map.removeLayer(XT.hl); XT.hl = null; } }, 9000);
}
function xaChonTim(x) {
  if (!x) return;
  $("xaTim").value = x.ten; $("xaGoiY").hidden = true;
  xaToSang([x]);
  if (VG.mode && vg$("vgPV").value === "xads") { vgXaChonDat([x.i], true); vgLuuPV(); if (VG.pos.length) { VG.data = null; vgTinh(); } msg(T("đã thêm xã {x} vào phạm vi", {x: x.ten}), "ok", 2000); }
}
$("xaTimB").onclick = async () => {
  const inp = $("xaTim"); inp.hidden = !inp.hidden;
  if (!inp.hidden) { inp.focus(); await xaSan(); xaVeGoiY(); } else { $("xaGoiY").hidden = true; }
};
$("xaTim").oninput = async () => { await xaSan(); xaVeGoiY(); };
$("xaTim").onkeydown = e => {
  const u = $("xaGoiY");
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!XT.ds.length) return; XT.i = (XT.i + (e.key === "ArrowDown" ? 1 : -1) + XT.ds.length) % XT.ds.length;
    u.querySelectorAll("li[data-i]").forEach(li => li.classList.toggle("on", +li.dataset.i === XT.i)); e.preventDefault();
  } else if (e.key === "Enter") { xaChonTim(XT.ds[XT.i]); e.preventDefault(); }
  else if (e.key === "Escape") { u.hidden = true; $("xaTim").hidden = true; }
  e.stopPropagation();                          // không để phím gõ lọt xuống phím tắt của trang
};
$("xaTim").onblur = () => setTimeout(() => { $("xaGoiY").hidden = true; }, 150);

/* ---------------- khởi động ---------------- */
sideAn(!!ls("laymau_hp_sidean_v1") && !isMobile());
vzNguon();
