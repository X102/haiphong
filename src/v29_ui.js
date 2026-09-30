/* =============================== BẢN 2.9: XUẤT MỌI SẢN PHẨM, GỘP NHIỀU TỆP TIẾN ĐỘ =============================== */
/* ① Chọn vùng: vùng đang chọn (hoặc một vùng đã lưu) xuất được thành báo cáo HTML (thống kê, bản đồ có khung, lưới, chú giải),
      GeoTIFF mặt nạ (1 = vùng, 255 = ngoài vùng, kèm .qml), GeoJSON (một vùng, đủ thuộc tính), và mở hộp thoại xuất bản đồ đặt sẵn
      khung theo vùng, cắt dữ liệu theo ranh giới.
   ② Biểu đồ: mọi biểu đồ SVG (đường mùa vụ, phát hiện thay đổi, xu hướng, thống kê, so sánh các năm) lưu được thành SVG hoặc PNG 300 dpi.
   ③ Dải ảnh theo năm quanh điểm lưu thành một ảnh PNG có nhãn năm.
   ④ Nhập nhiều tệp tiến độ JSON một lần (của nhiều người hoặc nhiều lần làm): gộp điểm, nhãn, vùng, bộ điểm, chỉ số; nhãn khác nhau
      giữa các tệp được giải theo cách chọn (mới hơn, tệp sau, giữ nhãn đang có), đánh dấu "xem lại" và liệt kê thành bảng tải được. */
const v29$ = id => document.getElementById(id);

/* ---------- ① xuất vùng ---------- */
function v29Vung(id) {                          // bản ghi vùng (như vùng đã lưu) của vùng đã lưu id hoặc vùng đang chọn
  if (id) return ST.vung[id] || null;
  if (!VG.res || !(VG.res.st || VG.res.st_sua)) return null;
  const mpSua = VG.sua && VG.sua.getLayers().length ? vgMPTuSua() : null;
  const mp = mpSua && mpSua.length ? mpSua : (VG.poly && VG.poly.length ? VG.poly : CORE.vectorize(VG.res.mask, VG.res.g, +vg$("vgGian").value));
  if (!mp.length) return null;
  const ma = vg$("vgLop").value || VG.res.ma || "";
  const v = vgBanGhiVung("chon_" + Date.now().toString(36), ma, mp, VG.res.st_sua || VG.res.st, VG.res.prm, !!VG.daSua, VG.res.ma);
  v.tam = true; return v;
}
function v29TenVung(v) { const c = IDX.by[v.ma_lop]; return `${v.ma_lop || "?"}${c ? " " + cten(c) : ""}, ${v.nam}`; }
function v29TepVung(v) { return v28TenTep(`vung_${v.tam ? "dang_chon" : v.id}_${v.ma_lop || "x"}_${v.nam}`); }
function v29Feature(v) {
  const c = IDX.by[v.ma_lop] || {};
  return {type: "Feature", geometry: v.geom, properties: {id: v.tam ? "" : v.id, loai: "vung_mau", ma_lop: v.ma_lop, id_lop: c.id, ten_lop: c.ma ? cten(c) : "", nhom: c.nhom || "",
    lop3: IDX.lop3(v.ma_lop), nam: v.nam, ghi_chu: v.ghi_chu, dien_tich_ha: v.thong_ke.dien_tich_ha, dien_tich_cau_ha: v.thong_ke.dien_tich_cau_ha,
    n_manh: v.thong_ke.n_manh, do_phan_giai_m: v.thong_ke.do_phan_giai_m, da_sua: v.da_sua, cap_nhat: new Date(v.tg).toISOString(),
    thong_ke: JSON.stringify(v.thong_ke), tham_so: JSON.stringify(v.tham_so), hat: JSON.stringify(v.hat)}};
}
function v29VungGeo(id) {
  const v = v29Vung(id); if (!v) { msg(T("chưa có vùng: đặt điểm mẫu trước"), "wa", 3000); return; }
  download(`${v29TepVung(v)}_${stamp()}.geojson`, JSON.stringify({type: "FeatureCollection", features: [v29Feature(v)]}), "application/geo+json");
}
async function v29VungTif(id) {
  const v = v29Vung(id); if (!v) { msg(T("chưa có vùng: đặt điểm mẫu trước"), "wa", 3000); return; }
  const {m, g} = await vgTKDaGiac(vgMP(v.geom)), c = IDX.by[v.ma_lop] || {};
  v28TifLop(`${v29TepVung(v)}_${stamp()}`, g, m, null, [{ma: 1, ten: v29TenVung(v), mau: c.mau || "#d61ea0"}]);
}
function v29LopVung(v) {                        // lớp véc tơ tạm của vùng để vẽ vào bản đồ xuất
  const c = IDX.by[v.ma_lop] || {}, mau = c.mau || "#d61ea0";
  const g = L.geoJSON({type: "Feature", geometry: v.geom}, {style: {color: mau, weight: 2, fillColor: mau, fillOpacity: 0.28}, interactive: false, pmIgnore: true});
  const mp = vgMP(v.geom), bb = vgBB3857(mp), ten = v29TenVung(v);
  return {d: {k: "vgx", nhom: "vecto", ten: T("vùng") + " " + ten, man: () => false, op0: () => 1, bb, ve: () => ({paths: xbPaths(g)}),
              vec: () => ({mau, ten: T("vùng") + " " + ten + ` (${v.thong_ke.dien_tich_ha.toFixed(2)} ${T("ha")})`, kieu: "vung"})},
          pv: {bb, mp, ten: v.tam ? T("vùng đang chọn") : T("vùng {id}", {id: v.id})}};
}
function v29VungBanDo(id) {                     // mở hộp thoại xuất bản đồ: khung theo vùng, cắt dữ liệu theo ranh giới
  const v = v29Vung(id); if (!v) { msg(T("chưa có vùng: đặt điểm mẫu trước"), "wa", 3000); return; }
  XB.them = v29LopVung(v); xbMo("vgx", "them");
  const cat = v29$("xbCat"); if (cat && !cat.disabled) { cat.checked = true; xbDoc(); }
}
async function v29VungHTML(id) {
  const v = v29Vung(id); if (!v) { msg(T("chưa có vùng: đặt điểm mẫu trước"), "wa", 3000); return; }
  const tk = v.thong_ke, ts = v.tham_so || {}, ha = x => (+x).toFixed(2), luu = XB.them;
  let anh = "";
  try { XB.them = v29LopVung(v); const A = await xbAnhBaoCao("vgx", null); if (A) anh = `<img class="bd2" src="${A.url}" alt=""><p class="mu sm">${esc(T("Phép chiếu Web Mercator (EPSG:3857); lưới kinh độ, vĩ độ WGS 84."))}</p>`; }
  catch (e) { /* không dựng được bản đồ */ } finally { XB.them = luu; }
  const xa = Object.entries(tk.theo_xa_ha || {}).sort((a, b) => b[1] - a[1]);
  const bangXa = xa.length ? `<table><tr><th>${esc(T("xã"))}</th><th>${esc(T("ha"))}</th><th>%</th></tr>` +
    xa.map(([t, a]) => `<tr><td>${esc(t)}</td><td>${ha(a)}</td><td>${(100 * a / Math.max(tk.dien_tich_ha, 1e-9)).toFixed(1)}</td></tr>`).join("") + `</table>` : "";
  const bangTP = Object.entries(tk.thanh_phan_ha || {}).map(([id0, cc]) => { const L0 = (MAN && MAN.layers || []).find(l => l.id === id0), t = Object.values(cc).reduce((s, x) => s + x, 0);
    if (!t) return ""; const ten = L0 ? lname(L0) : id0, tl = (L0 && L0.ten_lop) || TEN3;
    return `<p><b>${esc(ten)}</b></p><table><tr><th>${esc(T("lớp"))}</th><th>${esc(T("ha"))}</th><th>%</th></tr>` +
      Object.entries(cc).sort((a, b) => b[1] - a[1]).map(([k, a]) => `<tr><td>${esc(T(tl[k] || String(k)))}</td><td>${ha(a)}</td><td>${(100 * a / t).toFixed(1)}</td></tr>`).join("") + `</table>`; }).join("");
  const ds = [[T("Lớp"), esc(v29TenVung(v))], [T("Năm"), v.nam], [T("Diện tích"), `${ha(tk.dien_tich_ha)} ${esc(T("ha"))} (${(tk.dien_tich_ha / 100).toFixed(3)} ${esc(T("km²"))})`],
    [T("Diện tích đa giác trên mặt cầu"), tk.dien_tich_cau_ha != null ? `${ha(tk.dien_tich_cau_ha)} ${esc(T("ha"))}` : "-"], [T("Số mảng"), tk.n_manh], [T("Lưới"), `${(+tk.do_phan_giai_m || 0).toFixed(1)} m`],
    [T("Đặc trưng dùng"), esc((ts.dac_trung || []).join(", "))], [T("Ngưỡng độ giống"), ts.tau != null ? ts.tau : "-"], [T("Mảng đã xoá"), ts.so_mang_xoa || 0],
    [T("Đã sửa ranh giới"), v.da_sua ? "✓" : "-"], [T("Ghi chú"), esc(v.ghi_chu || "")]];
  bcTai(v29TepVung(v), T("Vùng chọn: {t}", {t: v29TenVung(v)}), ds, [{h: T("Bản đồ"), html: anh}, {h: T("Theo xã"), html: bangXa}, {h: T("Thành phần lớp phủ trong vùng"), html: bangTP}]);
}
function v29VungXuat(id, k) { return k === "html" ? v29VungHTML(id) : k === "tif" ? v29VungTif(id) : k === "geo" ? v29VungGeo(id) : k === "bd" ? v29VungBanDo(id) : null; }
document.querySelectorAll("#vgXuatW [data-vx]").forEach(b => { b.onclick = () => v29VungXuat(null, b.dataset.vx); });
const _vgVeVung29 = vgVeVung;
vgVeVung = function () {
  _vgVeVung29.apply(this, arguments);
  v29$("vgDS").querySelectorAll("[data-v]").forEach(row => {
    const s = document.createElement("select"); s.title = T("xuất vùng này"); s.dataset.vx = "";
    s.innerHTML = [["", "⤓ " + T("xuất")], ["html", "HTML"], ["tif", "GeoTIFF"], ["geo", "GeoJSON"], ["bd", T("bản đồ…")]].map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("");
    s.onchange = () => { const k = s.value; s.value = ""; if (k) v29VungXuat(row.dataset.v, k); };
    row.appendChild(s);
  });
};
if (typeof ST === "object" && ST.vung) vgVeVung();

/* ---------- ② biểu đồ: SVG hoặc PNG ---------- */
const V29_BD = "#curve, #cdBD, #cdMT, #tkBD, #vgNamTK, #plKQ, #cdKQ, #tkKQ";
function v29SVGChu(svg) {                        // SVG độc lập: có xmlns, cỡ, phông, nền trắng
  const c = svg.cloneNode(true), vb = (svg.getAttribute("viewBox") || "").split(/[ ,]+/).map(Number);
  const W = vb.length === 4 && vb[2] ? vb[2] : (svg.clientWidth || 600), H = vb.length === 4 && vb[3] ? vb[3] : (svg.clientHeight || 300);
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", W); c.setAttribute("height", H);
  if (!c.getAttribute("font-family")) c.setAttribute("font-family", "Segoe UI, Helvetica, Arial, sans-serif");
  const nen = document.createElementNS("http://www.w3.org/2000/svg", "rect"); nen.setAttribute("x", vb[0] || 0); nen.setAttribute("y", vb[1] || 0);
  nen.setAttribute("width", W); nen.setAttribute("height", H); nen.setAttribute("fill", "#fff"); c.insertBefore(nen, c.firstChild);
  return {chu: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(c), W, H};
}
function v29TenBD(svg) { const o = svg.closest("[id]"); return `bieu_do_${o ? v28TenTep(o.id) : "x"}_${stamp()}`; }
function v29BDSVG(svg) { const S = v29SVGChu(svg); download(v29TenBD(svg) + ".svg", S.chu, "image/svg+xml"); return S; }
async function v29BDPNG(svg, dpi) {              // vẽ lại SVG lên canvas cỡ in (mặc định 300 dpi cho bề rộng 16 cm)
  const S = v29SVGChu(svg), k = Math.max(1, (16 / 2.54 * (dpi || 300)) / S.W), c = document.createElement("canvas");
  c.width = Math.round(S.W * k); c.height = Math.round(S.H * k);
  const im = new Image(); await new Promise((ok, no) => { im.onload = ok; im.onerror = () => no(new Error(T("không tạo được ảnh"))); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(S.chu); });
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
  const u8 = await xbBlob(c, "image/png"); v28Tai(v29TenBD(svg) + ".png", XH.pngDpi(u8, dpi || 300), "image/png");
}
(function () {                                   // nút nổi khi rê chuột lên một biểu đồ
  const b = document.createElement("div"); b.id = "bdTai"; b.hidden = true; b.setAttribute("data-noi18n", "");
  b.innerHTML = `<button type="button" data-k="svg" title="${esc(T("lưu biểu đồ thành SVG (sửa tiếp được trong Inkscape, Illustrator)"))}">SVG</button><button type="button" data-k="png" title="${esc(T("lưu biểu đồ thành PNG 300 dpi"))}">PNG</button>`;
  document.body.appendChild(b); let cur = null, hen = null;
  document.addEventListener("mouseover", e => {
    const s = e.target && e.target.closest && e.target.closest("svg"); if (!s || !s.closest(V29_BD) || !s.getAttribute("viewBox") || s.getAttribute("width") === "22") return;
    cur = s; clearTimeout(hen); const r = s.getBoundingClientRect(); b.style.left = Math.max(0, r.right - 86) + "px"; b.style.top = Math.max(0, r.top + 2) + "px"; b.hidden = false;
  });
  document.addEventListener("mouseout", e => { if (!cur) return; const t = e.relatedTarget; if (t && (b.contains(t) || cur.contains(t))) return; clearTimeout(hen); hen = setTimeout(() => { b.hidden = true; }, 600); });
  b.addEventListener("mouseover", () => clearTimeout(hen));
  b.querySelectorAll("button").forEach(x => { x.onclick = () => { if (!cur) return; if (x.dataset.k === "svg") v29BDSVG(cur); else v29BDPNG(cur).catch(e => msg(T("lỗi: ") + (e.message || e), "er", 5000)); }; });
})();

/* ---------- ③ dải ảnh theo năm thành một ảnh PNG ---------- */
async function v29DaiPNG() {
  const its = [...v29$("strip").querySelectorAll(".it")].filter(it => it.querySelector("canvas,img")); if (!its.length) { msg(T("chưa có dải ảnh: chọn một điểm"), "wa", 3000); return; }
  const p = vizPt(), s0 = its[0].querySelector("canvas,img"), WS = s0.width || s0.naturalWidth || 256, n = its.length, cot = Math.min(n, 5), hang = Math.ceil(n / cot), gap = 8, top = 34, lb = 22;
  const c = document.createElement("canvas"); c.width = cot * (WS + gap) + gap; c.height = top + hang * (WS + lb + gap) + 18; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  xbChu(g, `${v29$("stripH").textContent}${p ? ` · ${p.id === "⌖" ? T("tra cứu") : p.id} · ${(+p.lat).toFixed(5)}, ${(+p.lon).toFixed(5)}` : ""}`, gap, 16, 14, "left", true);
  its.forEach((it, i) => { const el = it.querySelector("canvas,img"), x = gap + (i % cot) * (WS + gap), y = top + Math.floor(i / cot) * (WS + lb + gap);
    try { g.drawImage(el, x, y, WS, WS); } catch (e) { /* ảnh chưa tải */ }
    g.strokeStyle = it.classList.contains("cur") ? "#d92d20" : "#98a2b3"; g.lineWidth = it.classList.contains("cur") ? 3 : 1; g.strokeRect(x, y, WS, WS);
    xbChu(g, (it.querySelector(".lb") || {}).textContent || "", x + WS / 2, y + WS + 12, 13, "center", true); });
  xbChu(g, `${T("Geoportal lớp phủ Hải Phòng")} v${VERSION} · ${new Date().toLocaleDateString(LANG === "vi" ? "vi-VN" : LANG)}`, gap, c.height - 8, 10, "left", false, "#667085");
  try { const u8 = await xbBlob(c, "image/png"); v28Tai(`dai_anh_${p ? v28TenTep(String(p.id)) : "x"}_${stamp()}.png`, XH.pngDpi(u8, 150), "image/png"); }
  catch (e) { msg(T("lỗi: ") + (/tainted|insecure|SecurityError/i.test(String(e && (e.name + e.message))) ? T("một lớp ảnh không cho tải chéo nên trình duyệt chặn xuất: tắt lớp đó hoặc đổi ảnh nền rồi thử lại") : (e.message || e)), "er", 6000); }
}
v29$("stripPNG").onclick = v29DaiPNG;

/* ---------- ④ gộp nhiều tệp tiến độ ---------- */
async function v29DocTep(f) { if (f.text) return f.text(); return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsText(f); }); }
function v29GopTienDo(ds, kieu, danhDau) {       // ds: [{ten, j}] theo thứ tự chọn; kieu: moi | sau | giu -> báo cáo
  const bc = {tep: [], xung: [], moiDiem: 0, moiNhan: 0, doiNhan: 0, kieu}, ung = {};
  const them = (id, y, c) => { const k = id + "\u0001" + y; (ung[k] = ung[k] || []).push(c); };
  Object.values(ST.diem).forEach(p => Object.keys(p.nhan || {}).forEach(y => { if (p.nhan[y] != null) them(p.id, y, {src: -1, ma: p.nhan[y], tg: (p.tg || {})[y] || 0, tin: (p.tin || {})[y], ai: (p.ai || {})[y]}); }));
  ds.forEach(({ten, j}, i) => {
    const st = j.st || {}, D = st.diem || {}; let nMoi = 0, nNhan = 0;
    Object.values(D).forEach(q => {
      if (!q || !q.id) return;
      if (!ST.diem[q.id]) { const p = JSON.parse(JSON.stringify(q)); p.nhan = {}; p.tg = {}; p.tin = {}; if (p.ai) p.ai = {}; ST.diem[q.id] = p; nMoi++; }
      else { const p = ST.diem[q.id]; if (q.ghi_chu && !(p.ghi_chu || "").split(" | ").includes(q.ghi_chu)) p.ghi_chu = p.ghi_chu ? p.ghi_chu + " | " + q.ghi_chu : q.ghi_chu; p.xem_lai = !!(p.xem_lai || q.xem_lai); }
      Object.keys(q.nhan || {}).forEach(y => { if (q.nhan[y] == null) return; them(q.id, y, {src: i, ma: q.nhan[y], tg: (q.tg || {})[y] || 0, tin: (q.tin || {})[y], ai: (q.ai || {})[y]}); nNhan++; });
    });
    const nv = Object.keys(st.vung || {}).length;
    if (st.vung && typeof vungGop === "function") vungGop(st.vung);
    if (st.chiso && typeof csGop === "function") csGop(st.chiso);
    Object.entries(st.bo_cfg || {}).forEach(([k, c]) => { if (!ST.bo_cfg[k]) ST.bo_cfg[k] = c; });
    Object.entries(st.khu || {}).forEach(([k, v]) => { if (!ST.khu[k]) ST.khu[k] = v; });
    Object.entries(st.nhom_xa || {}).forEach(([k, v]) => { if (!ST.nhom_xa[k]) ST.nhom_xa[k] = v; });
    Object.entries(st.osm_sua || {}).forEach(([k, v]) => { const o = ST.osm_sua[k]; if (!o || (v.tg || 0) > (o.tg || 0)) ST.osm_sua[k] = v; });
    bc.tep.push({ten, diem: Object.keys(D).length, nhan: nNhan, moi: nMoi, vung: nv, xuat_luc: j.xuat_luc || "", trang: j.trang || "", he_lop_khac: !!(st.scheme && JSON.stringify(st.scheme.lop) !== JSON.stringify(SCHEME.lop))});
    bc.moiDiem += nMoi;
  });
  Object.entries(ung).forEach(([k, cs]) => {
    const [id, y] = k.split("\u0001"), p = ST.diem[id]; if (!p) return;
    p.nhan = p.nhan || {}; p.tg = p.tg || {}; p.tin = p.tin || {};
    const chon = kieu === "giu" ? cs[0] : kieu === "sau" ? cs[cs.length - 1] : cs.reduce((a, c) => (c.tg >= a.tg ? c : a));
    const cu = p.nhan[y];
    if (cu == null) bc.moiNhan++; else if (cu !== chon.ma) bc.doiNhan++;
    p.nhan[y] = chon.ma; p.tg[y] = chon.tg || Date.now(); if (chon.tin != null) p.tin[y] = chon.tin; else delete p.tin[y];
    if (chon.ai) (p.ai = p.ai || {})[y] = chon.ai;
    const khac = [...new Set(cs.map(c => c.ma))];
    if (khac.length > 1) {
      bc.xung.push({id, nam: +y, bo: p.bo, chon: chon.ma, cac: cs.map(c => ({tep: c.src < 0 ? T("đang có") : ds[c.src].ten, ma: c.ma, tg: c.tg}))});
      if (danhDau) p.xem_lai = true;
    }
  });
  bc.xung.sort((a, b) => (a.bo + a.id).localeCompare(b.bo + b.id) || a.nam - b.nam);
  save(); buildSetSelect(); render(); if (typeof vgVeVung === "function") vgVeVung();
  return bc;
}
const V29 = {tep: [], bc: null};
async function v29GopMo(files) {                // mở hộp thoại gộp với danh sách tệp (FileList hoặc mảng File)
  V29.tep = []; V29.bc = null; const loi = [];
  for (const f of [...(files || [])]) {
    try { const j = JSON.parse(await v29DocTep(f)); if (j.loai !== "laymau_hp" || !j.st) throw new Error(T("không phải tệp tiến độ")); V29.tep.push({ten: f.name, j}); }
    catch (e) { loi.push(`${f.name}: ${e.message || e}`); }
  }
  v29GopVe(loi); const d = v29$("dlgGopTep"); if (!d.open) d.showModal ? d.showModal() : d.show();
}
function v29GopVe(loi) {
  const n = o => Object.keys(o || {}).length, nh = j => Object.values((j.st || {}).diem || {}).reduce((s, p) => s + Object.values(p.nhan || {}).filter(v => v != null).length, 0);
  v29$("gtDS").innerHTML = (V29.tep.length ? `<table><tr><th>#</th><th>${T("tệp")}</th><th>${T("xuất lúc")}</th><th>${T("điểm")}</th><th>${T("nhãn")}</th><th>${T("vùng")}</th></tr>` +
    V29.tep.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.ten)}</td><td>${esc((t.j.xuat_luc || "").slice(0, 16).replace("T", " "))}</td><td>${n(t.j.st.diem)}</td><td>${nh(t.j)}</td><td>${n(t.j.st.vung)}</td></tr>`).join("") + `</table>` :
    `<span class="mu">${T("chưa chọn tệp nào")}</span>`) + (loi && loi.length ? `<div class="cb27">${loi.map(esc).join("<br>")}</div>` : "");
  v29$("gtOk").disabled = !V29.tep.length; v29$("gtKQ").innerHTML = ""; v29$("gtCSV").hidden = true;
}
function v29GopChay() {
  if (!V29.tep.length) return;
  const bc = V29.bc = v29GopTienDo(V29.tep, v29$("gtKieu").value, v29$("gtDanh").checked);
  const kieuT = {moi: T("nhãn gán sau cùng (theo thời điểm gán)"), sau: T("tệp chọn sau thắng"), giu: T("giữ nhãn đang có, chỉ điền chỗ trống")}[bc.kieu];
  v29$("gtKQ").innerHTML = `<p>${T("Đã gộp {n} tệp: {d} điểm mới, {a} nhãn mới, {b} nhãn đổi; {x} chỗ các tệp gán khác nhau (giải theo: {k}).", {n: bc.tep.length, d: bc.moiDiem, a: bc.moiNhan, b: bc.doiNhan, x: bc.xung.length, k: kieuT})}</p>` +
    (bc.tep.some(t => t.he_lop_khac) ? `<div class="cb27">${T("Có tệp dùng hệ thống lớp khác với trang: kiểm tra mã lớp trước khi dùng kết quả.")}</div>` : "") +
    (bc.xung.length ? `<table><tr><th>${T("điểm")}</th><th>${T("năm")}</th><th>${T("các nhãn")}</th><th>${T("chọn")}</th></tr>` +
      bc.xung.slice(0, 60).map(x => `<tr><td>${esc(x.id)}</td><td>${x.nam}</td><td>${x.cac.map(c => `${esc(c.ma)} <span class="mu">(${esc(c.tep)})</span>`).join("; ")}</td><td><b>${esc(x.chon)}</b></td></tr>`).join("") +
      `</table>` + (bc.xung.length > 60 ? `<p class="mu sm">${T("… và {n} chỗ nữa: tải CSV để xem đủ", {n: bc.xung.length - 60})}</p>` : "") : "");
  v29$("gtCSV").hidden = !bc.xung.length; v29$("gtOk").disabled = true;
  msg(T("đã gộp {n} tệp tiến độ", {n: bc.tep.length}), "ok", 4000);
}
function v29GopCSV() {
  const bc = V29.bc; if (!bc) return; const rows = [];
  bc.xung.forEach(x => x.cac.forEach(c => rows.push({id: x.id, bo_diem: x.bo, nam: x.nam, tep: c.tep, ma_lop: c.ma, gan_luc: c.tg ? new Date(c.tg).toISOString() : "", da_chon: c.ma === x.chon ? 1 : 0})));
  download(`xung_dot_nhan_${stamp()}.csv`, CORE.toCSV(rows, ["id", "bo_diem", "nam", "tep", "ma_lop", "gan_luc", "da_chon"]), "text/csv");
}
(function () {
  const d = v29$("dlgGopTep");
  v29$("gtTep").onchange = e => { const fs = [...e.target.files]; e.target.value = ""; v29GopMo(fs); };
  v29$("gtOk").onclick = v29GopChay; v29$("gtCSV").onclick = v29GopCSV; v29$("gtDong").onclick = () => d.close();
  v29$("eGopTep").onclick = () => { const e = v29$("dlgExp"); if (e && e.open) e.close(); v29GopMo([]); };
  const fi = v29$("fileIn");                     // "Tải tệp…" chọn được nhiều tệp: nhiều tệp tiến độ -> hộp thoại gộp
  if (fi) { fi.multiple = true; const cu = fi.onchange;
    fi.onchange = async e => { const fs = [...e.target.files];
      if (fs.length > 1) { e.target.value = ""; if (fs.every(f => /\.json$/i.test(f.name))) { v29GopMo(fs); return; }
        for (const f of fs) await cu({target: {files: [f], value: ""}}); return; }
      return cu(e); }; }
})();
