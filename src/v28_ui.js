/* =============================== BẢN 2.8: GEOTIFF CÓ NODATA, ĐỘ TRONG SUỐT CÁC LỚP, KÉO GIÃN BẢNG =============================== */
/* ① GeoTIFF bản đồ lớp: 255 = không có dữ liệu (khoá GDAL_NODATA), 254 = có dữ liệu nhưng không quy đổi được sang chú giải đã chọn,
      mọi lớp giữ đúng mã; bảng màu nhúng trong tệp và tệp kiểu QGIS (.qml) cùng tên để QGIS tự hiện tên lớp. Bản 2.7 ghi 0 cho cả
      "ngoài vùng" lẫn "không quy đổi được" (ví dụ lớp thực vật của bản đồ 3 lớp khi xem theo chú giải chung) và không khai báo nodata.
      Ảnh số (độ lớn thay đổi, hệ số góc...) ghi Float32, nodata NaN. Hệ toạ độ EPSG:3857 như lưới tính trong trang.
   ② Độ trong suốt: mọi lớp đang có trên bản đồ (ảnh nền, nhãn, kết quả, ranh giới, vùng, điểm, OSM), nhớ theo trình duyệt.
   ③ Kéo giãn: cột bảng điều khiển, cột phải hoặc dải dưới bản đồ (kéo mép, nhấp đúp để về mặc định); các bảng nổi kéo góc dưới phải. */
const V28 = {kt: ls("laymau_hp_kt28_v1") || {}, op: ls("laymau_hp_op28_v1") || {}};
const v28Rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function v28Tai(ten, du, kieu) {
  const u = URL.createObjectURL(new Blob([du], {type: kieu})), a = document.createElement("a");
  a.href = u; a.download = ten; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
function v28TenTep(s) { return CORE.khongDau(String(s)).replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 80) || "ban_do"; }

/* ---------- ① GeoTIFF ---------- */
// ma: mã lớp từng điểm ảnh (0 = không lớp); co: có dữ liệu (tuỳ chọn, để tách "không quy đổi được" khỏi "không có dữ liệu");
// lop: [{ma, ten, mau}]; khong: nhãn của mã 0 nếu 0 là một lớp thật (vd "không đổi")
function v28TifLop(ten, g, ma, co, lop, khong) {
  if (lop.some(l => l.ma >= 254)) throw new Error(T("mã lớp 254, 255 dành cho nodata"));
  const N = g.w * g.h, out = new Uint8Array(N).fill(255); let kqd = 0;
  for (let i = 0; i < N; i++) { if (ma[i]) out[i] = ma[i]; else if (khong && (!co || co[i])) out[i] = 0; else if (co && co[i]) { out[i] = 254; kqd++; } }
  const ds = (khong ? [{ma: 0, ten: khong, mau: "#e5e7eb"}] : []).concat(lop, kqd ? [{ma: 254, ten: T("không quy đổi được"), mau: "#bdbdbd"}] : []);
  const mau = []; ds.forEach(l => { mau[l.ma] = v28Rgb(l.mau); });
  const buf = XH.tifGhi({w: g.w, h: g.h, bands: [out], x0: g.x0, y1: g.y1, res: g.res, epsg: 3857, nodata: 255, mau});
  const t = v28TenTep(ten); v28Tai(t + ".tif", buf, "image/tiff");
  setTimeout(() => v28Tai(t + ".qml", XH.qmlLop(ds.map(l => ({ma: l.ma, mau: l.mau, ten: l.ten}))), "text/xml"), 500);
  msg(T("đã xuất {f}.tif (255 = không có dữ liệu) và {f}.qml: để hai tệp cùng thư mục, QGIS tự hiện tên lớp", {f: t}), "ok", 7000);
}
// bands: [Float32Array] (NaN = trống); moc: [[giá trị, màu, nhãn]] cho kiểu QGIS của băng 1
function v28TifSo(ten, g, bands, moc) {
  const buf = XH.tifGhi({w: g.w, h: g.h, bands, x0: g.x0, y1: g.y1, res: g.res, epsg: 3857, nodata: NaN});
  const t = v28TenTep(ten); v28Tai(t + ".tif", buf, "image/tiff");
  if (moc) setTimeout(() => v28Tai(t + ".qml", XH.qmlLienTuc(moc), "text/xml"), 500);
  msg(T("đã xuất {f}.tif (Float32, NaN = không có dữ liệu)", {f: t}), "ok", 6000);
}
function v28CdTif() {                          // bản đồ đang xem của phát hiện thay đổi hai năm
  const K = CD.kq; if (!K) return; if (K.kieu === "xh") { xhTif(); return; }
  const mode = cd$("cdXem").value, N = K.N, ten = `thay_doi_${K.A}_${K.B}_${K.pp || "cva"}_${mode}_${stamp()}`;
  if (mode === "do" || mode === "ndvi") {
    const a = new Float32Array(N).fill(NaN), s = mode === "do" ? K.mag : K.dN; for (let i = 0; i < N; i++) if (K.valid[i]) a[i] = s[i];
    v28TifSo(ten, K.g, [a], mode === "do" ? [[0, "#000004"], [+(K.t).toFixed(3), "#b73779", T("ngưỡng")], [+K.hi.toFixed(3), "#fcfdbf"]] : [[-0.5, "#b2182b"], [0, "#f7f7f7"], [0.5, "#2166ac"]]);
    return;
  }
  const ma = new Uint8Array(N); let lop;
  if (mode === "doi") { for (let i = 0; i < N; i++) if (K.doi[i]) ma[i] = 1; lop = [{ma: 1, ten: T("thay đổi {a} → {b}", {a: K.A, b: K.B}), mau: "#d62728"}]; }
  else if (mode === "tu") { for (let i = 0; i < N; i++) if (K.doi[i] && K.cB[i]) ma[i] = K.cB[i]; lop = K.lop.map((t, k) => ({ma: k + 1, ten: t, mau: K.lopMau[k]})); }
  else { const mm = k => K.pl === "sobo" ? k : (k === 1 ? 1 : 2);
    for (let i = 0; i < N; i++) if (K.doi[i]) ma[i] = mm(K.loai[i]) || 9;
    lop = K.ten_loai.map((t, k) => t && K.dt[k] > 0 ? {ma: mm(k), ten: t, mau: K.pl === "sobo" ? CD_MAU[k] : (k === 1 ? CD_MAU[1] : CD_MAU[9])} : null).filter(Boolean)
      .filter((l, i, a) => a.findIndex(q => q.ma === l.ma) === i); }
  v28TifLop(ten, K.g, ma, K.valid, lop, T("không đổi"));
}

/* ---------- ② độ trong suốt các lớp đang có trên bản đồ ---------- */
function v28DS() {                             // [{k, ten, lay}] các lớp có thể có trên bản đồ
  const ds = [
    {k: "nen", ten: T("ảnh nền"), lay: () => (typeof base !== "undefined" ? base : null)},
    {k: "nhan", ten: T("nhãn địa danh"), lay: () => (typeof V27 !== "undefined" ? V27.nhan : null)},
    {k: "cd", ten: T("kết quả phát hiện thay đổi"), lay: () => CD.hien},
    {k: "tk", ten: T("bản đồ lớp phủ (thống kê)"), lay: () => TK.hien},
    {k: "pl", ten: T("bản đồ phân loại"), lay: () => PL.hien},
    {k: "vg", ten: T("kết quả chọn vùng"), lay: () => VG.hien},
    {k: "vung", ten: T("vùng mẫu đã lưu"), lay: () => VG.gVung},
    {k: "xa", ten: T("ranh giới xã"), lay: () => VG.gXa},
    {k: "tinh", ten: T("ranh giới tỉnh"), lay: () => (typeof V27 !== "undefined" ? V27.tinhL : null)},
    {k: "diem", ten: T("điểm mẫu"), lay: () => gPts},
    {k: "bo", ten: T("bộ điểm đang tạo"), lay: () => (typeof BO !== "undefined" ? BO.xem : null)}];
  if (typeof OSM !== "undefined" && typeof osmLopGL === "function" && MAN && MAN.osm) (MAN.osm.lop || []).forEach(l => {
    ds.push({k: "osm:" + l.id, ten: "OSM · " + T(l.ten), lay: () => { try { const q = osmLopGL(l.id); return q && q.g; } catch (e) { return null; } }}); });
  return ds;
}
function v28Chua(g, l, sau) {                   // lớp l có nằm trong nhóm g (lồng tối đa 3 mức)
  if (!g || !l) return false; if (g === l) return true;
  if (!g.hasLayer) return false; if (g.hasLayer(l)) return true;
  if ((sau || 0) >= 2) return false;
  return g.getLayers().some(x => x.getLayers && v28Chua(x, l, (sau || 0) + 1));
}
function v28Dat(L_, a) {
  if (!L_) return;
  if (!L_.getLayers && L_.setOpacity) { L_.setOpacity(a); return; }
  const ap = l => {
    if (l.getLayers) { l.eachLayer(ap); return; }
    if (l.setStyle && l.options) {
      if (!l._op28) l._op28 = {o: l.options.opacity != null ? l.options.opacity : 1, f: l.options.fillOpacity != null ? l.options.fillOpacity : 0.2};
      l.setStyle({opacity: l._op28.o * a, fillOpacity: l._op28.f * a});
    } else if (l.setOpacity) l.setOpacity(a);
  };
  ap(L_);
}
function v28Ve() {                             // danh sách lớp đang hiện kèm thanh độ mờ
  const box = $("opDS"); if (!box) return;
  const ds = v28DS().filter(d => { const l = d.lay(); return l && map.hasLayer(l); });
  box.innerHTML = ds.map(d => { const a = V28.op[d.k] != null ? V28.op[d.k] : 1;
    return `<div class="op28"><span title="${esc(d.ten)}">${esc(d.ten)}</span><input type="range" min="0" max="1" step="0.05" value="${a}" data-op="${esc(d.k)}"><small>${Math.round(a * 100)}%</small></div>`; }).join("") ||
    `<div class="mu sm">${T("chưa có lớp nào ngoài các lớp đối chiếu ở trên")}</div>`;
  box.querySelectorAll("[data-op]").forEach(r => { r.oninput = () => {
    const k = r.dataset.op, d = v28DS().find(q => q.k === k), a = +r.value; V28.op[k] = a; r.nextElementSibling.textContent = Math.round(a * 100) + "%";
    if (d) v28Dat(d.lay(), a); ls("laymau_hp_op28_v1", V28.op); }; });
}
let v28Hen = null;
function v28VeSau() { clearTimeout(v28Hen); v28Hen = setTimeout(v28Ve, 250); }
map.on("layeradd", e => {                    // chờ một nhịp: các mô-đun gán biến (CD.hien = ...addTo(map)) sau khi lớp đã vào bản đồ
  const ks = Object.keys(V28.op).filter(k => V28.op[k] !== 1);
  if (ks.length) setTimeout(() => { if (!map.hasLayer(e.layer)) return; const ds = v28DS();
    for (const k of ks) { const d = ds.find(q => q.k === k), L_ = d && d.lay(); if (L_ && v28Chua(L_, e.layer)) { v28Dat(L_ === e.layer ? L_ : e.layer, V28.op[k]); break; } } }, 0);
  v28VeSau();
});
map.on("layerremove", v28VeSau);

/* ---------- ③ kéo giãn ---------- */
function v28ApDung() {
  const b = document.body, app = $("app"), side = $("side"), kt = V28.kt, an = b.classList.contains("side-an");
  const nho = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  app.style.gridTemplateColumns = ""; app.style.gridTemplateRows = ""; side.style.width = ""; side.style.minWidth = "";
  if (!nho) {
    const S = kt.side ? kt.side + "px" : "minmax(330px,390px)";
    if (b.classList.contains("dk-phai")) {
      if (kt.side || kt.phai) app.style.gridTemplateColumns = (an ? "" : S + " ") + "minmax(0,1fr) " + (kt.phai ? kt.phai + "px" : "minmax(340px,30vw)");
    } else if (b.classList.contains("dk-duoi")) {
      if (kt.side && !an) app.style.gridTemplateColumns = S + " minmax(0,1fr)";
      if (kt.duoi) app.style.gridTemplateRows = "minmax(0,1fr) " + kt.duoi + "px";
    } else if (kt.side) { side.style.width = kt.side + "px"; side.style.minWidth = "0"; }
  }
  const tr = $("keoTrai"), ph = $("keoPhai"), du = $("keoDuoi");
  if (tr) tr.hidden = nho || an;
  if (ph) ph.hidden = nho || !b.classList.contains("dk-phai");
  if (du) du.hidden = nho || !b.classList.contains("dk-duoi");
  setTimeout(() => map.invalidateSize(), 60);
}
function v28Keo(id, khoa, tinh) {              // tinh(ev, rectApp) -> kích thước mới (px)
  const el = $(id); if (!el) return; let dang = false;
  el.addEventListener("pointerdown", e => { dang = true; el.setPointerCapture(e.pointerId); document.body.classList.add("keo28"); e.preventDefault(); e.stopPropagation(); });
  el.addEventListener("pointermove", e => { if (!dang) return; const r = $("app").getBoundingClientRect(); V28.kt[khoa] = Math.round(tinh(e, r)); v28ApDung(); });
  const xong = () => { if (!dang) return; dang = false; document.body.classList.remove("keo28"); ls("laymau_hp_kt28_v1", V28.kt); map.invalidateSize(); };
  el.addEventListener("pointerup", xong); el.addEventListener("pointercancel", xong);
  el.addEventListener("dblclick", e => { delete V28.kt[khoa]; ls("laymau_hp_kt28_v1", V28.kt); v28ApDung(); e.stopPropagation(); });
  ["mousedown", "click", "dblclick", "wheel", "touchstart"].forEach(t => el.addEventListener(t, ev => ev.stopPropagation()));
}
const V28_KEO = [["keoTrai", "keo28-doc keo28-trai", "kéo để đổi độ rộng bảng điều khiển; nhấp đúp để về mặc định"],
  ["keoPhai", "keo28-doc keo28-phai", "kéo để đổi độ rộng cột bên phải; nhấp đúp để về mặc định"],
  ["keoDuoi", "keo28-ngang", "kéo để đổi chiều cao dải dưới bản đồ; nhấp đúp để về mặc định"]];
{ const m = $("map");
  V28_KEO.forEach(([id, cl, t]) => {
    const d = document.createElement("div"); d.id = id; d.className = cl; d.title = T(t); d.dataset.t28 = t; m.appendChild(d); });
  const vw = () => window.innerWidth;
  v28Keo("keoTrai", "side", (e, r) => Math.max(260, Math.min(0.6 * vw(), e.clientX - r.left)));
  v28Keo("keoPhai", "phai", (e, r) => Math.max(240, Math.min(0.6 * vw(), r.right - e.clientX)));
  v28Keo("keoDuoi", "duoi", (e, r) => Math.max(120, Math.min(0.75 * window.innerHeight, r.bottom - e.clientY)));
  new MutationObserver(v28ApDung).observe(document.body, {attributes: true, attributeFilter: ["class"]});
  window.addEventListener("resize", () => v28ApDung());
  v28ApDung();
}
// bảng nổi: kéo góc dưới phải (CSS resize), nhớ kích thước; thu gọn thì bỏ chiều cao đã đặt
const V28_BANG = ["panel", "vung", "cdP", "tkP", "plP", "osmP"];
{ const ro = typeof ResizeObserver === "function" ? new ResizeObserver(es => { let doi = false;
    es.forEach(e => { const el = e.target; if (!el.offsetWidth || el.classList.contains("thu") || el.dataset.thu28) return;
      if (el.style.width || el.style.height) { V28.kt["b:" + el.id] = {w: el.style.width, h: el.style.height}; doi = true; } });
    if (doi) ls("laymau_hp_kt28_v1", V28.kt); }) : null;
  V28_BANG.forEach(id => { const el = $(id); if (!el) return; el.classList.add("rz28");
    const s = V28.kt["b:" + id]; if (s) { if (s.w) el.style.width = s.w; if (s.h) el.style.height = s.h; }
    if (ro) ro.observe(el);
    el.addEventListener("dblclick", e => { if (!e.target.closest(".vg-dau,.pn-dau") || e.target.closest("button")) return;
      el.style.width = ""; el.style.height = ""; delete V28.kt["b:" + id]; ls("laymau_hp_kt28_v1", V28.kt); }); });
  document.addEventListener("click", e => {    // nút thu gọn "–" của các bảng: bỏ chiều cao cố định khi thu, trả lại khi mở
    const b = e.target.closest && e.target.closest("#cdThu,#tkThu,#plThu,#vgThu,#pnThu"); if (!b) return;
    const el = b.closest(".rz28"); if (!el) return;
    setTimeout(() => { const thu = /\+|▸/.test(b.textContent) || el.classList.contains("thu");
      if (thu && !el.dataset.thu28) { el.dataset.thu28 = JSON.stringify({w: el.style.width, h: el.style.height}); el.style.height = ""; if (el.id === "panel") el.style.width = ""; }
      else if (!thu && el.dataset.thu28) { const s = JSON.parse(el.dataset.thu28); delete el.dataset.thu28; if (s.h) el.style.height = s.h; if (s.w) el.style.width = s.w; } }, 0);
  });
}

/* ---------- gắn nút, dịch ---------- */
{ const b = document.getElementById("cdTif"); if (b) b.onclick = () => { try { v28CdTif(); } catch (e) { msg(T("lỗi: ") + (e.message || e), "er", 6000); } }; }
v28Ve();
const _setLang28 = setLang;
setLang = function (l) { _setLang28(l); v28Ve(); ["keoTrai", "keoPhai", "keoDuoi"].forEach(id => { const d = $(id); if (d) d.title = T(d.dataset.t28); }); };
