/* =============================== CHỌN VÙNG TƯƠNG TỰ (bản 2) =============================== */
/* Công cụ: ① điểm mẫu ② xoá cả mảng ③ giữ mảng đúng ④ sửa ranh giới. Mảng đã xoá được nhớ bằng
   đa giác (chỉnh ngưỡng không làm nó quay lại); "Tìm mảng sai" gợi ý các mảng giống mảng đã xoá. */
const VG = {mode: false, cong: "hat", pos: [], neg: [], data: null, res: null, obj: null, poly: null, daSua: false,
            namTK: null, xa: null, loai: [], giu: [], undo: [], nghiBat: false,
            gHat: L.layerGroup().addTo(map), gVung: L.featureGroup().addTo(map), sua: L.featureGroup().addTo(map),
            gNhan: L.layerGroup().addTo(map), gXa: L.layerGroup(), hien: null, tip: null, maxPx: 1536, tok: 0,
            coPM: !!(window.L && L.PM && map.pm), pmOn: false,
            lop: ls("laymau_hp_vung_lop_v1") || "", kq: null,    // bản 2.1: lớp của điểm mẫu mới, kết quả mọi lớp
            gXaChon: L.layerGroup().addTo(map), nam: null, namY: null, vungVer: 0, chay: null};   // bản 2.3: xã đang dùng, so sánh năm
ST.vung = ST.vung || {};
ST.khu = ST.khu || {};                       // bản 2.3: khu đã chốt {id: {ten, nam, vung: [id], hat, neg, loai, giu, tham_so}}
ST.nhom_xa = ST.nhom_xa || {};               // nhóm xã đặt tên {ten: [tên xã]}
const TEN3 = {1: "thực vật", 2: "nước", 3: "xây dựng"};
const vg$ = id => document.getElementById(id);
const vgKm = () => Math.max(0.05, +vg$("vgBK").value || 2);
const GOI_Y = {
  hat: "Chọn lớp (hàng nút màu) rồi nhấp: điểm mẫu của lớp đó · đổi lớp và nhấp tiếp cho lớp khác · Shift+nhấp: điểm loại trừ · nhấp lại điểm mẫu để bỏ · + / − chỉnh ngưỡng · chuột phải vào mảng: xoá nhanh",
  xoa: "Nhấp vào một mảng để xoá CẢ mảng. Mảng đã xoá được nhớ: chỉnh ngưỡng không làm nó quay lại. Phím S: tìm các mảng giống mảng đã xoá.",
  giu: "Nhấp vào mảng ĐÚNG để giữ (xanh lá): không bị gợi ý xoá và làm mốc cho việc tìm mảng sai. Nhấp lại để bỏ giữ. (Ở mọi công cụ: Shift+chuột phải = giữ.)",
  sua: "Thanh công cụ bên trái bản đồ: sửa đỉnh, cắt bớt, xoá, vẽ thêm. Xong bấm Thống kê theo ranh giới (thẻ Thống kê & lưu)."
};

function vgTrang(t) { vg$("vgTrang").textContent = t ? T(t) : ""; }
function vgLopDT() { return MAN ? MAN.layers.filter(L0 => L0.kieu === "rgb" || L0.kieu === "xam") : []; }
/* bản 2.4: đặc trưng so sánh gồm mọi nguồn trang có: ảnh 8 bit (embedding, PCA, màu), S2 10 băng, chỉ số đang dùng,
   CTX, PC gốc, DEM. Nguồn số thực được co về 1..255 theo khoảng cố định (kéo giãn S2, khoảng hiển thị chỉ số, 0-30° dốc...)
   nên giống nhau giữa các năm; PC lấy phân vị 2-98 % ở năm gốc rồi giữ nguyên khi so sánh các năm. */
const VG_NHOM = [["anh", "Ảnh 8 bit (embedding, PCA, màu)"], ["s2", "S2 10 băng (phản xạ)"], ["cs", "Chỉ số (danh sách đang dùng)"],
                 ["ctx", "CTX (tính trên lưới phân tích)"], ["pc", "PC chuỗi năm (giá trị gốc)"], ["dem", "DEM"]];
function vgNguonDT() {
  const out = []; if (!MAN) return out;
  vgLopDT().forEach(l => out.push({nhom: "anh", id: l.id, ten: lname(l)}));
  if (MAN.s2d) {
    s2Bang().forEach(b => out.push({nhom: "s2", id: "s2:" + b, ten: b}));
    if (typeof csDS === "function") csDS().forEach(c => out.push({nhom: "cs", id: "cs:" + c.id, ten: c.ten}));
    [["m5", "TB 5 × 5"], ["s5", "ĐLC 5 × 5"], ["m15", "TB 15 × 15"], ["s15", "ĐLC 15 × 15"]].forEach(([k, t]) => out.push({nhom: "ctx", id: "ctx:" + k, ten: T("CTX " + t + " (10 băng)")}));
  }
  if (MAN.pc) for (let i = 1; i <= MAN.pc.k; i++) out.push({nhom: "pc", id: "pc:" + i, ten: "PC" + i});
  if (MAN.dem) { out.push({nhom: "dem", id: "dem:cao", ten: T("độ cao")}); out.push({nhom: "dem", id: "dem:doc", ten: T("độ dốc")}); }
  return out;
}
function vgVeDT() {                          // vẽ (lại) danh sách đặc trưng so sánh theo nhóm, giữ lựa chọn
  const box = vg$("vgDT"); if (!MAN || !box) return;
  const ds = vgNguonDT(), co = id => ds.some(d => d.id === id), mo = {};
  box.querySelectorAll("details[data-nh]").forEach(d => { mo[d.dataset.nh] = d.open; });
  const mac = co("g7") ? ["g7", "g7b"] : (co("pca") ? ["pca", "s2tc"] : ds.slice(0, 1).map(d => d.id));
  const nho = ls("laymau_hp_vung_dt_v1"), chon = (nho || mac).filter(co);
  box.innerHTML = VG_NHOM.map(([nh, ten]) => {
    const it = ds.filter(d => d.nhom === nh); if (!it.length) return "";
    const n = it.filter(d => chon.includes(d.id)).length, open = nh in mo ? mo[nh] : (nh === "anh" || n > 0);
    return `<details data-nh="${nh}"${open ? " open" : ""}><summary>${T(ten)} <span class="mu">${n ? "(" + n + ")" : ""}</span>${nh === "cs" ? ` <button type="button" data-cs title="${T("thêm, bớt chỉ số")}">∑</button>` : ""}</summary>` +
      it.map(d => `<label style="display:${nh === "anh" || nh === "ctx" ? "block" : "inline-flex"};margin-right:8px"><input type="checkbox" value="${d.id}" ${chon.includes(d.id) ? "checked" : ""}> ${d.ten}</label>`).join("") + `</details>`;
  }).join("");
  box.querySelectorAll("input").forEach(i => { i.onchange = () => { ls("laymau_hp_vung_dt_v1", vgDT()); vgVeDT(); vgTinh(); }; });
}
function vgCoNam(id, y) {                    // đặc trưng có ở năm y không
  const [nh] = id.split(":");
  if (!id.includes(":")) { const L0 = MAN.layers.find(l => l.id === id); return !!(L0 && L0.nam.includes(y)); }
  if (nh === "s2" || nh === "cs" || nh === "ctx") return !!(MAN.s2d && (MAN.s2d.nam || []).includes(y));
  if (nh === "pc") return !!(MAN.pc && MAN.pc.nam.includes(y));
  return nh === "dem" ? !!MAN.dem : false;
}
function vgDungDT() {
  const box = vg$("vgDT"); if (!MAN || box.dataset.xong) return;
  vgVeDT();
  box.dataset.xong = "1";
  const s = vg$("vgLop"); s.innerHTML = "";
  (SCHEME.lop || []).forEach(c => { const o = document.createElement("option"); o.value = c.ma; o.textContent = `${c.ma} ${cten(c)}`; s.appendChild(o); });
  if (VG.lop && IDX.by[VG.lop]) s.value = VG.lop;
  vgChips();
  if (MAN.ranh_gioi_xa && !VG.xa) vgTaiXaHF();
}
function vgDT() { return [...vg$("vgDT").querySelectorAll("input:checked")].map(i => i.value); }

/* ---------- bản 2.1: điểm mẫu gắn lớp; các lớp cạnh tranh (mỗi điểm ảnh về lớp gần nhất) ---------- */
function vgMau(ma) { const c = ma && IDX.by[ma]; return c ? c.mau : "#d61ea0"; }
function vgRGB(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
function vgTenLop(ma) { return ma ? `${ma} ${cten(IDX.by[ma])}` : T("chưa gán lớp"); }
function vgChips() {
  const box = vg$("vgLopHat"); if (!box) return;
  box.innerHTML = [["", "?"]].concat((SCHEME.lop || []).map(c => [c.ma, c.ma])).map(([ma, t]) =>
    `<button type="button" data-ma="${ma}" class="${(VG.lop || "") === ma ? "on" : ""}" title="${vgTenLop(ma)}"><span class="sw" style="background:${vgMau(ma)}"></span>${t}</button>`).join("");
  box.querySelectorAll("button").forEach(b => { b.onclick = () => vgChonLop(b.dataset.ma); });
}
function vgNhomHat() {                      // các lớp có điểm mẫu, theo thứ tự đặt
  const ds = []; VG.pos.forEach(h => { const m = h.ma || ""; if (!ds.includes(m)) ds.push(m); }); return ds;
}
function vgChonLop(ma) {
  VG.lop = ma || ""; ls("laymau_hp_vung_lop_v1", VG.lop); vgChips();
  if (VG.lop) vg$("vgLop").value = VG.lop;
  if (VG.kq && VG.kq.masks[VG.lop]) vgKichHoat(); else { vgVeHat(); vgBangLop(); vgTomTat(); }
}
function vgLopTai(ll) {                     // lớp (theo kết quả) tại một chỗ trên bản đồ
  const K = VG.kq; if (!K) return null;
  const p = CORE.llToPix(K.g, ll.lng, ll.lat); if (p[0] < 0 || p[1] < 0 || p[0] >= K.g.w || p[1] >= K.g.h) return null;
  const i = Math.floor(p[1]) * K.g.w + Math.floor(p[0]);
  for (const ma of K.lops) if (K.masks[ma][i]) return ma;
  return null;
}
function vgBangLop() {
  const box = vg$("vgBangLop"), K = VG.kq, ds = vgNhomHat(); if (!box) return;
  if (!ds.length) { box.innerHTML = ""; return; }
  const act = VG.res ? VG.res.ma : null;
  box.innerHTML = `<table><tr><th></th><th>${T("lớp")}</th><th>${T("mẫu")}</th><th>${T("ha")}</th><th>${T("mảng")}</th></tr>` + ds.map(ma => {
    const st = K && K.st[ma], n = VG.pos.filter(h => (h.ma || "") === ma).length;
    return `<tr data-ma="${ma}" class="${ma === act ? "on" : ""}"><td><span class="sw" style="background:${vgMau(ma)}"></span></td><td>${vgTenLop(ma)}</td><td>+${n}</td>` +
      `<td>${st ? st.dien_tich_ha.toFixed(2) : ""}</td><td>${st ? st.n_manh : ""}</td></tr>`;
  }).join("") + `</table>` + (ds.length > 1 ? `<div class="mu">${T("mỗi điểm ảnh thuộc lớp có điểm mẫu giống nó nhất; các vùng không chồng nhau. Nhấp một dòng để làm việc với lớp đó.")}</div>` : "");
  box.querySelectorAll("tr[data-ma]").forEach(tr => { tr.onclick = () => vgChonLop(tr.dataset.ma); });
}
function vgNgu() { return VG.data ? VG.data.ids + "|" + VG.data.r : ""; }     // ngữ cảnh: mô tả mảng so được với nhau

/* ---------- ranh giới xã ---------- */
function vgTenXa(pr) {
  for (const k of ["ten", "ten_xa", "TEN_XA", "name", "NAME", "Ten", "TenXa", "NAME_3"]) if (pr && pr[k]) return String(pr[k]);
  const s = pr && Object.values(pr).find(v => typeof v === "string"); return s || "?";
}
function vgMP(geom) { return geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : []; }
function vgBB3857(mp) {
  let bb = [Infinity, Infinity, -Infinity, -Infinity];
  mp.forEach(pg => pg[0].forEach(q => { const m = CORE.to3857(q[0], q[1]); bb = [Math.min(bb[0], m[0]), Math.min(bb[1], m[1]), Math.max(bb[2], m[0]), Math.max(bb[3], m[1])]; }));
  return bb;
}
function vgNapXa(fc) {
  VG.xa = fc.features.filter(f => f.geometry && /Polygon/.test(f.geometry.type)).map((f, i) => {
    const mp = vgMP(f.geometry), bl = [Infinity, Infinity, -Infinity, -Infinity];
    mp.forEach(pg => pg[0].forEach(q => { bl[0] = Math.min(bl[0], q[0]); bl[1] = Math.min(bl[1], q[1]); bl[2] = Math.max(bl[2], q[0]); bl[3] = Math.max(bl[3], q[1]); }));
    return {i: i + 1, ten: vgTenXa(f.properties), mp, bb: vgBB3857(mp), bl, kd: CORE.khongDau(vgTenXa(f.properties))};
  });
  const s = vg$("vgXa"); s.innerHTML = "";
  VG.xa.slice().sort((a, b) => a.ten.localeCompare(b.ten, "vi")).forEach(x => { const o = document.createElement("option"); o.value = x.i; o.textContent = x.ten; o.dataset.kd = x.kd; s.appendChild(o); });
  VG.gXa.clearLayers();
  L.geoJSON(fc, {style: {color: "#475467", weight: 1, fill: false, dashArray: "3 3"}, interactive: false, pmIgnore: true}).addTo(VG.gXa);
  vg$("vgXaTT").textContent = T("{n} xã", {n: VG.xa.length});
  if (vg$("vgXaHien").checked) VG.gXa.addTo(map);
  if (VG.data) { VG.data.xaIdx = vgXaIdx(VG.data.g); VG.data.cache = {}; }   // ranh giới nạp sau khi đã đọc ảnh
  vgXaLoc(); vgNhomDS();
}
function vgXaTai(lon, lat) {                // xã chứa một điểm (lọc nhanh bằng hộp bao)
  return (VG.xa || []).find(x => lon >= x.bl[0] && lon <= x.bl[2] && lat >= x.bl[1] && lat <= x.bl[3] && vgPIP(lon, lat, x.mp)) || null;
}
async function vgTaiXaHF() {
  try { vgNapXa(JSON.parse(await getText(MAN.ranh_gioi_xa))); } catch (e) { vg$("vgXaTT").textContent = T("chưa có ranh giới xã: ") + e.message; }
}
function vgPIP(lon, lat, mp) {
  let tr = false;
  mp.forEach(pg => pg.forEach(r => {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i], b = r[j];
      if ((a[1] > lat) !== (b[1] > lat) && lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) tr = !tr;
    }
  }));
  return tr;
}
/* bản 2.3: hai phạm vi theo xã tách bạch. "xa": các xã CÓ điểm mẫu (đặt một điểm ở xã nào là tìm khắp xã đó, bất kể
   danh sách); "xads": các xã chọn ở danh sách. Trước đây chọn nhầm một dòng trong danh sách là mọi điểm mẫu bị bỏ qua. */
function vgXaChon() {
  if (vg$("vgPV").value === "xads") return [...vg$("vgXa").selectedOptions].map(o => +o.value);
  if (!VG.xa) return [];
  const ids = new Set(); VG.pos.forEach(p => { const x = vgXaTai(p.lon, p.lat); if (x) ids.add(x.i); });
  return [...ids];
}
function vgXaLoc() {                         // lọc danh sách xã theo tên (không dấu cũng được); dòng đang chọn luôn hiện
  const k = CORE.khongDau(vg$("vgXaLoc").value);
  [...vg$("vgXa").options].forEach(o => { o.hidden = !!k && !o.selected && !(o.dataset.kd || "").includes(k); });
}
function vgXaChonDat(ids, them) {           // đặt (hoặc thêm vào) các xã chọn ở danh sách
  const s = new Set(them ? [...vg$("vgXa").selectedOptions].map(o => +o.value) : []); ids.forEach(i => s.add(+i));
  [...vg$("vgXa").options].forEach(o => { o.selected = s.has(+o.value); });
  vgXaLoc(); vgVeXaDung();
}
function vgXaDoi(x) {                        // Ctrl + nhấp: thêm / bỏ một xã
  const o = [...vg$("vgXa").options].find(q => +q.value === x.i); if (!o) return;
  o.selected = !o.selected; vgXaLoc(); vgVeXaDung();
  msg(T(o.selected ? "đã thêm xã {x}" : "đã bỏ xã {x}", {x: x.ten}), "ok", 1500);
}
function vgVeXaDung() {                      // tô viền các xã đang dùng làm phạm vi hoặc miền của điểm mẫu
  VG.gXaChon.clearLayers(); if (!VG.xa || !VG.mode) return;
  const pv = vg$("vgPV").value, hl = vg$("vgHL").value;
  const ids = pv === "xa" || pv === "xads" ? vgXaChon() : [];
  const mien = hl === "xa" ? new Set(VG.pos.concat(VG.neg).map(h => { const x = vgXaTai(h.lon, h.lat); return x ? x.i : 0; })) : new Set();
  VG.xa.filter(x => ids.includes(x.i) || mien.has(x.i)).forEach(x => {
    L.polygon(x.mp.map(pg => pg.map(r => r.map(q => [q[1], q[0]]))), {color: ids.includes(x.i) ? "#ca8a04" : "#667085", weight: 2, dashArray: "6 4",
      fill: ids.includes(x.i), fillColor: "#fde047", fillOpacity: 0.05, interactive: false, pmIgnore: true}).addTo(VG.gXaChon);
  });
}
function vgNhomDS() {                        // danh sách nhóm xã đã lưu
  const s = vg$("vgNhom"); if (!s) return;
  const cu = s.value;
  s.innerHTML = `<option value="">${T("(chọn nhóm xã đã lưu)")}</option>` + Object.keys(ST.nhom_xa).sort((a, b) => a.localeCompare(b, "vi"))
    .map(t => `<option value="${t.replace(/"/g, "&quot;")}">${t} (${ST.nhom_xa[t].length})</option>`).join("");
  if (ST.nhom_xa[cu]) s.value = cu;
}
function vgNhomLuu() {
  const ten = vg$("vgNhomTen").value.trim(), ds = [...vg$("vgXa").selectedOptions].map(o => o.textContent);
  if (!ds.length) { msg("chọn ít nhất một xã trong danh sách trước", "wa", 2500); return; }
  if (!ten) { msg("đặt tên nhóm ở ô bên dưới trước", "wa", 2500); vg$("vgNhomTen").focus(); return; }
  ST.nhom_xa[ten] = ds; save(); vgNhomDS(); vg$("vgNhom").value = ten; vg$("vgNhomTen").value = "";
  msg(T("đã lưu nhóm {t}: {n} xã", {t: ten, n: ds.length}), "ok", 2500);
}
function vgNhomChon() {
  const t = vg$("vgNhom").value; if (!t || !ST.nhom_xa[t] || !VG.xa) return;
  const ten = new Set(ST.nhom_xa[t]), ids = VG.xa.filter(x => ten.has(x.ten)).map(x => x.i);
  if (vg$("vgPV").value !== "xads") { vg$("vgPV").value = "xads"; vgPVHien(); }
  vgXaChonDat(ids); vgXaDen(ids); vgTinh();
}
function vgXaDen(ids) {                       // phóng tới các xã
  const xs = (VG.xa || []).filter(x => ids.includes(x.i)); if (!xs.length) { msg("chưa chọn xã nào trong danh sách", "wa", 2000); return; }
  const b = xs.reduce((a, x) => [Math.min(a[0], x.bl[0]), Math.min(a[1], x.bl[1]), Math.max(a[2], x.bl[2]), Math.max(a[3], x.bl[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  map.fitBounds([[b[1], b[0]], [b[3], b[2]]], {padding: [30, 30], maxZoom: 16});
}

/* ---------- công cụ, thẻ, tóm tắt ---------- */
function vgCong(c) {
  if (c === "sua" && !VG.sua.getLayers().length) { if (!VG.res) { msg("chưa có vùng: đặt điểm mẫu trước"); return; } vgVec(); }
  VG.cong = c;
  document.querySelectorAll("#vung [data-cong]").forEach(b => b.classList.toggle("on", b.dataset.cong === c));
  vg$("vgGoiY").textContent = T(GOI_Y[c]);
  vg$("vgGianW").hidden = c !== "sua"; if (vg$("vgChuanW")) vg$("vgChuanW").hidden = c !== "sua";
  vgPM(c === "sua");
  map.getContainer().style.cursor = c === "hat" ? "crosshair" : (c === "sua" ? "" : "pointer");
}
function vgTab(t) {
  document.querySelectorAll("#vung [data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  document.querySelectorAll("#vung [data-pane]").forEach(p => { p.hidden = p.dataset.pane !== t; });
  ls("laymau_hp_vung_tab_v1", t);
}
function vgTomTat() {
  const o = VG.obj, st = VG.res && (VG.res.st_sua || VG.res.st), D = VG.data;
  const nNghi = o && o.nghi ? [...o.nghi].filter(v => v >= vgNguong2()).length : 0;
  vg$("vgTom").innerHTML = !st ? "" :
    `<span class="sw" style="background:${vgMau(VG.res && VG.res.ma)}"></span> <b>${VG.res && VG.res.ma ? VG.res.ma : "?"}</b> · <b>${st.dien_tich_ha.toFixed(2)} ${T("ha")}</b> · ${o ? o.n : st.n_manh} ${o && o.kieu === "da_giac" ? T("đa giác") : T("mảng")} · ` +
    `<span style="color:#b42318">${T("xoá {n}", {n: VG.loai.length})}</span> · <span style="color:#1a7f37">${T("giữ {n}", {n: VG.giu.length})}</span>` +
    (nNghi ? ` · <b style="color:#b54708">${T("nghi sai {n}", {n: nNghi})}</b>` : "") +
    ` <span class="mu">· ${T("năm {y}", {y: D ? D.y : ST.nam})} · ${st.do_phan_giai_m.toFixed(1)} m · +${VG.pos.length}/−${VG.neg.length} ${T("mẫu")}</span>` +
    (VG.lop && VG.res && (VG.res.ma || "") !== VG.lop ? `<div class="mu">${T("lớp {m} chưa có điểm mẫu: nhấp lên bản đồ để đặt", {m: VG.lop})}</div>` : "");
  vg$("vgSoNghi").textContent = nNghi ? `(${nNghi})` : "";
  const bx = document.querySelector('#vung [data-cong="xoa"]'), bg = document.querySelector('#vung [data-cong="giu"]');
  bx.innerHTML = `<kbd>2</kbd> ${T("Xoá mảng")}${VG.loai.length ? ` <b>(${VG.loai.length})</b>` : ""}`;
  bg.innerHTML = `<kbd>3</kbd> ${T("Giữ mảng")}${VG.giu.length ? ` <b>(${VG.giu.length})</b>` : ""}`;
}

/* ---------- điểm mẫu ---------- */
function vgVeHat() {
  VG.gHat.clearLayers();
  const R_ = vg$("vgPV").value === "bk" || vg$("vgHL").value === "r" ? vgKm() * 1000 : 0;
  vgVeXaDung();
  const act = VG.res ? VG.res.ma : (VG.lop || "");
  VG.pos.concat(VG.neg).forEach(h => {
    const am = VG.neg.includes(h), nay = !am && (h.ma || "") === act;
    L.circleMarker([h.lat, h.lon], {radius: nay ? 7 : 5, color: am ? "#111" : "#fff", weight: 2, fillColor: am ? "#b42318" : (h.ma ? vgMau(h.ma) : "#1a7f37"), fillOpacity: 1, pmIgnore: true})
      .bindTooltip(am ? T("điểm loại trừ") : vgTenLop(h.ma), {direction: "top", offset: [0, -6]})
      .on("click", ev => { if (VG.cong !== "hat") return; L.DomEvent.stopPropagation(ev); vgBoHat(h); }).addTo(VG.gHat);
    if (R_ && (!am || vg$("vgHL").value === "r")) L.circle([h.lat, h.lon], {radius: R_, color: am ? "#b42318" : (h.ma ? vgMau(h.ma) : "#1a7f37"), weight: 1, dashArray: "4 4", fill: false, interactive: false, pmIgnore: true}).addTo(VG.gHat);
  });
  vg$("vgHat").innerHTML = `<b style="color:#1a7f37">+${VG.pos.length}</b> / <b style="color:#b42318">−${VG.neg.length}</b> ${T("điểm mẫu")}`;
  vgBangLop();
}
function vgBoHat(h, khongGhi) {
  const am = VG.neg.includes(h);
  VG.pos = VG.pos.filter(x => x !== h); VG.neg = VG.neg.filter(x => x !== h);
  if (typeof mvBo === "function") mvBo(h);
  if (!khongGhi) VG.undo.push({kieu: "bo_hat", h, am});
  vgVeHat(); vgTinh();
}
function vgBoSuaNeuCan() {
  if (VG.obj && VG.obj.kieu === "da_giac" && VG.daSua && !confirm(T("Tính lại vùng sẽ bỏ các chỉnh sửa ranh giới chưa lưu. Tiếp tục?"))) return false;
  return true;
}
map.on("click", e => {
  if (!VG.mode || addMode) return;
  const oe = e.originalEvent || {};
  if ((oe.ctrlKey || oe.metaKey) && VG.xa) {  // bản 2.3: Ctrl + nhấp: thêm / bỏ xã ở chỗ nhấp (phạm vi "các xã chọn ở danh sách")
    const x = vgXaTai(e.latlng.lng, e.latlng.lat); if (!x) { msg("chỗ này không thuộc xã nào", "wa", 1500); return; }
    if (vg$("vgPV").value !== "xads") { vg$("vgPV").value = "xads"; vgPVHien(); }
    vgXaDoi(x); vgLuuPV(); if (VG.pos.length) { VG.data = null; vgTinh(); } return;
  }
  if (VG.cong === "hat") {
    if (!vgBoSuaNeuCan()) return;
    const am = !!oe.shiftKey || !!VG.amBat, h = {lon: e.latlng.lng, lat: e.latlng.lat};
    if (!am && VG.lop) h.ma = VG.lop;
    (am ? VG.neg : VG.pos).push(h); VG.undo.push({kieu: "hat", h, am});
    if (!am && typeof mvThem === "function") mvThem(h);          // bản 2.5: tự lưu vào bộ điểm "Mẫu chọn vùng"
    vgVeHat(); vgTinh();
    if (typeof TRA_ON !== "undefined" && TRA_ON && typeof traDat === "function") traDat(e.latlng, true);   // xem luôn dải ảnh, đường mùa vụ của điểm mẫu
  } else if ((VG.cong === "xoa" || VG.cong === "giu") && VG.obj && VG.obj.kieu === "mang") {
    vgDoiLopTai(e.latlng);
    const k = vgMangTai(e.latlng);
    if (!k) { msg("không có mảng nào ở chỗ này", "wa", 1500); return; }
    if (VG.cong === "xoa") vgXoaDT([k]); else vgGiuDT(k);
  }
});
map.on("contextmenu", e => {
  if (!VG.mode || !VG.obj || VG.obj.kieu !== "mang" || VG.cong === "sua") return;
  vgDoiLopTai(e.latlng);
  const k = vgMangTai(e.latlng); if (!k) return;
  if (e.originalEvent && e.originalEvent.shiftKey) vgGiuDT(k); else vgXoaDT([k]);
});
function vgDoiLopTai(ll) {                  // nhấp vào mảng của lớp khác: chuyển sang làm việc với lớp đó
  if (vgMangTai(ll)) return;
  const ma = vgLopTai(ll); if (ma != null && VG.res && ma !== VG.res.ma) vgChonLop(ma);
}
function vgMangTai(ll) {
  const o = VG.obj, g = VG.res && VG.res.g; if (!o || !g || o.kieu !== "mang") return 0;
  const p = CORE.llToPix(g, ll.lng, ll.lat);
  if (p[0] < 0 || p[1] < 0 || p[0] >= g.w || p[1] >= g.h) return 0;
  return o.lab[Math.floor(p[1]) * g.w + Math.floor(p[0])];
}
let vgTipT = 0;
map.on("mousemove", e => {
  if (!VG.mode || !VG.obj || VG.obj.kieu !== "mang" || VG.cong === "sua") { if (VG.tip) { map.removeLayer(VG.tip); VG.tip = null; } return; }
  const t = Date.now(); if (t - vgTipT < 60) return; vgTipT = t;
  const k = vgMangTai(e.latlng);
  if (!k) { if (VG.tip) { map.removeLayer(VG.tip); VG.tip = null; } return; }
  const d = VG.obj.desc[k - 1], s = VG.obj.nghi ? VG.obj.nghi[k] : 0;
  if (!d) return;
  const txt = `${T("mảng")} #${k} · ${d.dien_tich_ha.toFixed(2)} ${T("ha")}` + (VG.obj.giu[k] ? " · " + T("giữ") : "") + (s ? " · " + T("nghi sai {n}", {n: s.toFixed(2)}) : "");
  if (!VG.tip) VG.tip = L.tooltip({direction: "top", offset: [0, -8], className: "vg-tip"});
  VG.tip.setLatLng(e.latlng).setContent(txt);
  if (!map.hasLayer(VG.tip)) VG.tip.addTo(map);
});

/* ---------- đọc dữ liệu trên lưới phân tích ---------- */
function vgBB() {
  const pv = vg$("vgPV").value, P = VG.pos.concat(VG.neg).map(h => CORE.to3857(h.lon, h.lat));
  let bb = null;
  const gop = b => { bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice(); };
  if (pv === "nhin") {
    const b = map.getBounds(), a = CORE.to3857(b.getWest(), b.getSouth()), c = CORE.to3857(b.getEast(), b.getNorth()); gop([a[0], a[1], c[0], c[1]]);
  } else if (pv === "xa" || pv === "xads") {
    const ids = vgXaChon();
    if (!ids.length) throw new Error(pv === "xads" ? T("chưa chọn xã nào trong danh sách (hoặc Ctrl + nhấp lên bản đồ để chọn xã)") : T("chưa có xã: nạp ranh giới xã, hoặc đặt điểm mẫu trong một xã"));
    VG.xa.filter(x => ids.includes(x.i)).forEach(x => gop(x.bb));
  } else {
    const km = pv === "bk" ? vgKm() : Math.max(0.2, +vg$("vgTam").value || 3);
    VG.pos.forEach(h => { const m = CORE.to3857(h.lon, h.lat), r = km * 1000 / Math.cos(h.lat * Math.PI / 180); gop([m[0] - r, m[1] - r, m[0] + r, m[1] + r]); });
  }
  P.forEach(m => gop([m[0] - 50, m[1] - 50, m[0] + 50, m[1] + 50]));
  return bb;
}
async function vgRef(L0, y) {
  if (!L0) return {x0: 0, y1: 0, res0: 10};    // chỉ có đặc trưng từ ảnh UTM (S2, chỉ số, PC, DEM): lưới 3857 bước 10 m
  const t = await tiffOf(CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)));
  return {x0: t._bb[0], y1: t._bb[3], res0: t._imgs[0].rx};
}
/* bản 2.5: đọc cho phân tích dùng bản COG riêng (không bị lớp bản đồ, dải ảnh đang đọc cùng tệp làm rơi khối đệm, gây
   "Request failed") và thử lại có giãn cách khi mạng hay máy chủ bận */
async function vgThuLai(f, url) {
  for (let k = 0; ; k++) {
    try { return await f(); }
    catch (e) {
      const m = String((e && (e.message || e)) || "");
      if (k >= 3 || !/Request failed|fetch|network|abort|Load failed|429|50[234]/i.test(m)) throw e;
      if (url) TIFF_PT.delete(url);
      await new Promise(r => setTimeout(r, 600 * Math.pow(2, k)));
    }
  }
}
function vgLoiDoc(e) {                       // câu lỗi đọc dữ liệu dễ hiểu
  const m = String((e && (e.message || e)) || "");
  return /Request failed|fetch|network|Load failed|429|50[234]/i.test(m) ? T("không tải được dữ liệu (mạng hoặc máy chủ bận)") + ` (${m})` : m;
}
async function vgDoc(g, y, ids, sc) {
  const lst = [], N = g.w * g.h; sc = sc || {};
  const u8 = (v, lo, hi) => { const o = new Uint8Array(N), d = hi - lo || 1;
    for (let i = 0; i < N; i++) { const x = v[i]; o[i] = x == null || !isFinite(x) ? 0 : 1 + Math.round(254 * Math.max(0, Math.min(1, (x - lo) / d))); }
    return {data: o, n: 1}; };
  let S2 = null;
  const s2 = async () => {                     // S2 10 băng năm y trên lưới g (láng giềng gần nhất), đọc một lần
    if (S2) return S2;
    if (!vgCoNam("s2:B2", y)) throw new Error(T("lớp S2 10 băng không có năm {y}", {y: y}));
    const nb = s2Bang().length, url = CORE.dataUrl(CFG, MAN.s2d.duong_dan.replace("{y}", y));
    const R = await vgThuLai(() => readUTM(url, g.bb, g.w, g.h, 0, Array.from({length: nb}, (_, i) => i), false, true), url);
    if (!R) throw new Error(T("ảnh S2 10 băng không phủ vùng này"));
    const ok = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const j = R.idx[i]; if (j < 0) continue; for (let b = 0; b < nb; b++) if (R.src[j * nb + b]) { ok[i] = 1; break; } }
    return (S2 = {R, nb, ok, dn: (i, b) => R.src[R.idx[i] * nb + b]});
  };
  const pv = (v, key, q) => { let r = sc[key]; if (!r) {              // phân vị (lấy mẫu thưa) cho nguồn không có khoảng cố định
    q = q || 0.02; const st = Math.max(1, Math.floor(N / 200000)), a = []; for (let i = 0; i < N; i += st) if (isFinite(v[i])) a.push(v[i]);
    r = [CORE.phanVi(a, q), CORE.phanVi(a, 1 - q)]; if (r[0] == null || !(r[1] > r[0])) r = [r[0] || 0, (r[0] || 0) + 1]; sc[key] = r; } return r; };
  for (const id of ids) {
    if (id.includes(":")) {
      const [nh, k] = id.split(":"), K = s2Keo(), bs = s2Bang();
      if (!vgCoNam(id, y)) throw new Error(T("đặc trưng {l} không có năm {y}", {l: id, y: y}));
      if (nh === "s2") {
        const S = await s2(), b = bs.indexOf(k), v = new Float32Array(N);
        for (let i = 0; i < N; i++) v[i] = S.ok[i] ? S.dn(i, b) : NaN;
        lst.push(u8(v, K.lo[b], K.hi[b]));
      } else if (nh === "cs") {
        const c = csLay(k); if (!c || !c.f) throw new Error(T("chỉ số {l} không dùng được", {l: k}));
        const S = await s2(), v = new Float32Array(N), buf = new Array(bs.length).fill(0);
        for (let i = 0; i < N; i++) { if (!S.ok[i]) { v[i] = NaN; continue; } for (const b of c.f.chi) buf[b] = S.dn(i, b) / 10000; const x = c.f(buf); v[i] = x == null ? NaN : x; }
        lst.push(u8(v, c.lo, c.hi));
      } else if (nh === "ctx") {                // TB, ĐLC trong cửa sổ quy đổi về bước lưới (đúng như bộ phân loại khi lưới 10 m)
        const S = await s2(), win = +k.slice(1), r = Math.max(1, Math.round((win - 1) / 2 * 10 / g.res)), tb = k[0] === "m";
        for (let b = 0; b < bs.length; b++) {
          const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = S.ok[i] ? S.dn(i, b) : 0;
          const B = CORE.boxImage(a, g.w, g.h, 1, 0, r), src = tb ? B.m : B.s, v = new Float32Array(N);
          for (let i = 0; i < N; i++) v[i] = S.ok[i] ? src[i] : NaN;
          lst.push(u8(v, tb ? K.lo[b] : 0, tb ? K.hi[b] : (win === 5 ? K.s5[b] : K.s15[b])));
        }
      } else if (nh === "pc") {
        const url = CORE.dataUrl(CFG, MAN.pc.duong_dan.replace("{y}", y)), s = (MAN.pc.he_so && MAN.pc.he_so.he_so_nhan) || 100, v = new Float32Array(N).fill(NaN);
        const R = await vgThuLai(() => readUTM(url, g.bb, g.w, g.h, 0, [+k - 1], false, true), url);
        if (R) for (let i = 0; i < N; i++) { const j = R.idx[i]; if (j >= 0 && R.src[j] !== -32768) v[i] = R.src[j] / s; }
        const r = pv(v, id); lst.push(u8(v, r[0], r[1]));
      } else if (nh === "dem") {
        const D = await demLuoi(g);
        if (k === "cao") { const r = pv(D.cao, id, 1e-9); lst.push(u8(D.cao, r[0], r[1])); } else lst.push(u8(D.doc, 0, 30));   // độ cao: thấp nhất .. cao nhất trên lưới (đỉnh đồi không bị cắt)
      }
      continue;
    }
    const L0 = MAN.layers.find(l => l.id === id);
    if (!L0.nam.includes(y)) throw new Error(T("lớp {l} không có năm {y}", {l: lname(L0), y: y}));
    const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), r = await vgThuLai(() => readBox(url, g.bb, g.w, g.h, true), url);
    lst.push(r || {data: new Uint8Array(g.w * g.h * (L0.kieu === "xam" ? 1 : 3)), n: L0.kieu === "xam" ? 1 : 3});
  }
  const lop = [];
  for (const L0 of MAN.layers.filter(l => l.kieu === "lop" && l.nam.includes(y))) {
    const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y)), r = await vgThuLai(() => readBox(url, g.bb, g.w, g.h, true), url);
    if (r) lop.push(Object.assign({}, L0, {ten_lop: L0.ten_lop || TEN3, data: r.data}));   // giữ ten_en, ten_ru để lname() dịch được
  }
  return {lst, lop, sc};
}
function vgXaIdx(g) {
  if (!VG.xa) return null;
  const out = new Int16Array(g.w * g.h);
  VG.xa.forEach(x => { if (CORE.inter(x.bb, g.bb)) CORE.rasterizeRings(CORE.polysToPixRings(g, x.mp), g.w, g.h, out, x.i); });
  return out;
}
function vgRaster(list, g) {               // tô các đa giác (mảng đã xoá / đã giữ) lên lưới g: chỉ số bản ghi + 1
  const out = new Int32Array(g.w * g.h);
  list.forEach((r, i) => { if (!r.bb || CORE.inter(r.bb, g.bb)) CORE.rasterizeRings(CORE.polysToPixRings(g, r.mp), g.w, g.h, out, i + 1); });
  return out;
}

/* ---------- tính: đọc (nếu cần) rồi chọn ---------- */
let vgHen = null;
function vgTinh() { clearTimeout(vgHen); vgHen = setTimeout(vgTinhNgay, 150); }
async function vgTinhNgay() {
  if (!MAN) { vgTrang("chưa nạp manifest"); return; }
  if (!VG.pos.length) { vgXoaKQ(); vgTrang("nhấp lên bản đồ để đặt điểm mẫu"); return; }
  const ids = vgDT(); if (!ids.length) { vgTrang("chọn ít nhất một lớp đặc trưng"); return; }
  const tok = ++VG.tok, y = ST.nam, r = +vg$("vgMin").value;
  try {
    const bb = vgBB(), L0 = MAN.layers.find(l => ids.includes(l.id)) || null, D = VG.data;
    const dung = D && D.y === y && D.ids === ids.join() && D.r === r && bb[0] >= D.g.bb[0] && bb[1] >= D.g.bb[1] && bb[2] <= D.g.bb[2] && bb[3] <= D.g.bb[3]
      && (bb[2] - bb[0]) * 4 > (D.g.bb[2] - D.g.bb[0]);
    if (!dung) {
      vgTrang("đang đọc ảnh…");
      const g = CORE.gridFor(bb, VG.maxPx, await vgRef(L0, y));
      const {lst, lop, sc} = await vgDoc(g, y, ids);
      if (tok !== VG.tok) return;
      const S = CORE.stackFeat(lst, g.w * g.h);
      VG.data = {y, ids: ids.join(), r, g, nf: S.nf, valid: S.valid, F: CORE.smoothFeat(S.F, S.nf, g.w, g.h, r, S.valid),
                 lop, xaIdx: vgXaIdx(g), cache: {}, sc};
    }
    TIFF_PT.clear();
    if (!VG.data.xaIdx && VG.xa) { VG.data.xaIdx = vgXaIdx(VG.data.g); VG.data.cache = {}; }   // ranh giới xã nạp sau lần đọc ảnh
    vgChon();
  } catch (e) { vgTrang(T("lỗi: ") + vgLoiDoc(e)); }
}
function vgHatV(D, H) {
  return H.map(h => { const p = CORE.llToPix(D.g, h.lon, h.lat), i = Math.floor(p[1]) * D.g.w + Math.floor(p[0]);
    return p[0] >= 0 && p[1] >= 0 && p[0] < D.g.w && p[1] < D.g.h && D.valid[i] ? {v: CORE.featAt(D.F, D.nf, i), i, lon: h.lon, lat: h.lat} : null; }).filter(Boolean);
}
function vgThamSo() {
  return {tau: +vg$("vgTau").value, minPx: +vg$("vgMinPx").value || 0, lo: +vg$("vgLo").value || 0, khe: +vg$("vgKhe").value,
          pv: vg$("vgPV").value, R_km: vgKm(), tam_km: +vg$("vgTam").value, lam_min: +vg$("vgMin").value, dac_trung: vgDT(),
          hieu_luc: vg$("vgHL").value, tru: vg$("vgTru").value};
}
/* ---------- bản 2.3: miền của từng điểm mẫu, chỗ đã có chủ ---------- */
function vgMien(D, s, hl, prm) {             // chỉ số các điểm ảnh mà điểm mẫu s được quyết định; null = mọi nơi
  const C = D.cache || (D.cache = {});
  if (hl === "xa") {
    if (!D.xaIdx) return null;
    if (!C.xa) {                              // một lượt qua lưới: danh sách điểm ảnh của từng xã
      const X = D.xaIdx, N = X.length; let mx = 0; for (let i = 0; i < N; i++) if (X[i] > mx) mx = X[i];
      const cnt = new Int32Array(mx + 1); for (let i = 0; i < N; i++) cnt[X[i]]++;
      const L_ = Array.from(cnt, n => new Int32Array(n)), pos = new Int32Array(mx + 1);
      for (let i = 0; i < N; i++) { const x = X[i]; L_[x][pos[x]++] = i; }
      C.xa = L_;
    }
    return C.xa[D.xaIdx[s.i]] || new Int32Array(0);
  }
  if (hl === "r") {
    const k = "r" + s.i + "|" + prm.R_km; C.r = C.r || {};
    return C.r[k] || (C.r[k] = CORE.circlePix(D.g, s.lon, s.lat, prm.R_km * 1000));
  }
  return null;
}
const vgBBVung = new WeakMap();
function vgKhoa(g, y, cache) {               // mã chủ của từng điểm ảnh: vùng đã lưu năm y (trừ vùng đang sửa); khu đã chốt mang mã ≥ KHOA
  const key = "k" + y + "|" + VG.vungVer + "|" + (VG.suaId || "");
  if (cache && key in cache) return cache[key];
  const ds = Object.values(ST.vung).filter(v => v.nam === y && v.id !== VG.suaId && v.geom);
  let out = null;
  if (ds.length) {
    const ma = {}, code = new Int32Array(g.w * g.h); let k = 0, n = 0;
    ds.forEach(v => { if (!ma[v.ma_lop]) ma[v.ma_lop] = ++k; });
    const chot = v => !!(v.khu && ST.khu[v.khu]);
    ds.slice().sort((a, b) => chot(a) - chot(b)).forEach(v => {  // vùng lẻ trước, khu đã chốt ghi đè sau
      const mp = vgMP(v.geom); let bb = vgBBVung.get(v); if (!bb) { bb = vgBB3857(mp); vgBBVung.set(v, bb); }
      if (!CORE.inter(bb, g.bb)) return;
      CORE.rasterizeRings(CORE.polysToPixRings(g, mp), g.w, g.h, code, ma[v.ma_lop] + (chot(v) ? CORE.KHOA : 0)); n++;
    });
    out = n ? {code, ma, n, nKhu: ds.filter(v => chot(v) && CORE.inter(vgBBVung.get(v) || [], g.bb)).length} : null;
  }
  if (cache) cache[key] = out;
  return out;
}
const vgCuaLop = (r, ma) => r.ma === undefined || (r.ma || "") === (ma || "");
function vgApLoai(m, g, ma) {              // bỏ mảng đã xoá (của lớp này): điểm ảnh trong đa giác xoá, và cả mảng mới chồng ≥ 30 % lên nó
  const LX = VG.loai.filter(r => vgCuaLop(r, ma));
  if (!LX.length) return m;
  const ex = vgRaster(LX, g), Lb = CORE.labelComp(m, g.w, g.h, 8, 1), ov = new Int32Array(Lb.n + 1), out = new Uint8Array(m.length);
  for (let p = 0; p < m.length; p++) if (m[p] && ex[p]) ov[Lb.lab[p]]++;
  for (let p = 0; p < m.length; p++) { const k = Lb.lab[p]; if (m[p] && !ex[p] && ov[k] < 0.3 * Lb.sizes[k]) out[p] = 1; }
  return out;
}
/* cùng quy trình cho năm đang xem và cho mọi năm (so sánh). groups: [{ma, hat: [{v, i}]}]; mỗi điểm ảnh về lớp có
   điểm mẫu gần nhất (CORE.distSelMulti), rồi từng lớp: nối khe, bỏ mảng nhỏ, lấp lỗ, nhưng KHÔNG lấn sang điểm ảnh
   đã thuộc lớp khác, giữ vùng liền với điểm mẫu của chính lớp đó, bỏ mảng đã xoá của lớp đó */
function vgMatNaDa(D, groups, neg, prm, y) {
  const g = D.g, N = g.w * g.h, hl = prm.hieu_luc || "all";
  let scope = null;
  if (prm.pv === "bk") scope = CORE.circleScope(g, VG.pos.map(h => [h.lon, h.lat]), prm.R_km * 1000);
  if ((prm.pv === "xa" || prm.pv === "xads") && D.xaIdx) { const ids = new Set(vgXaChon()); scope = new Uint8Array(N); for (let i = 0; i < N; i++) if (ids.has(D.xaIdx[i])) scope[i] = 1; }
  // bản 2.3: chỗ đã có chủ (vùng lưu cùng năm) và miền của từng điểm mẫu
  const B = prm.tru && prm.tru !== "khong" ? vgKhoa(g, y == null ? D.y : y, D.cache || (D.cache = {})) : null;
  const all = prm.tru === "het", gcode = groups.map(G => !G.ma ? 0 : (B && B.ma[G.ma]) || -1);
  let r;
  if (hl === "all" && !B) r = CORE.distSelMulti(D.F, D.nf, N, D.valid, groups.map(G => G.hat.map(s => s.v)), neg.map(s => s.v), prm.tau, scope);
  else {
    const seeds = [];
    groups.forEach((G, gi) => G.hat.forEach(s => seeds.push({g: gi, v: s.v, dom: vgMien(D, s, hl, prm)})));
    neg.forEach(s => seeds.push({g: -1, v: s.v, dom: vgMien(D, s, hl, prm)}));
    r = CORE.distSelZoned(D.F, D.nf, N, D.valid, seeds, prm.tau, scope, B && B.code, gcode, all);
  }
  const masks = {};
  groups.forEach((G, gi) => {
    let m = new Uint8Array(N); for (let i = 0; i < N; i++) if (r.cls[i] === gi + 1) m[i] = 1;
    m = CORE.morphClose(m, g.w, g.h, prm.khe);
    if (scope) for (let i = 0; i < N; i++) if (!scope[i]) m[i] = 0;
    m = CORE.removeSmall(m, g.w, g.h, prm.minPx);
    m = CORE.fillHoles(m, g.w, g.h, prm.lo);
    for (let i = 0; i < N; i++) if (m[i] && r.cls[i] && r.cls[i] !== gi + 1) m[i] = 0;
    if (B) for (let i = 0; i < N; i++) if (m[i] && CORE.chan(B.code[i], gcode[gi], all)) m[i] = 0;   // nối khe, lấp lỗ không lấn chỗ có chủ
    if (prm.pv === "lien") m = CORE.keepSeeded(m, g.w, g.h, G.hat.map(s => s.i));
    masks[G.ma] = vgApLoai(m, g, G.ma);
  });
  return {masks, d: r.d, cls: r.cls, khoa: B ? {n: B.n, nKhu: B.nKhu} : null};
}
function vgMatNa(D, pos, neg, prm) {       // một lớp (tương thích bản 2.0)
  const R = vgMatNaDa(D, [{ma: "", hat: pos}], neg, prm); return {m: R.masks[""], d: R.d};
}
function vgChon() {
  const D = VG.data; if (!D) return;
  const prm = vgThamSo(); vg$("vgTauV").textContent = prm.tau.toFixed(3);
  const groups = vgNhomHat().map(ma => ({ma, hat: vgHatV(D, VG.pos.filter(h => (h.ma || "") === ma))})).filter(G => G.hat.length);
  const neg = vgHatV(D, VG.neg);
  if (!groups.length) { vgTrang("điểm mẫu rơi vào chỗ không có dữ liệu"); return; }
  VG.seedV = {groups, neg, y: D.y, pos: groups.flatMap(G => G.hat)};
  const R = vgMatNaDa(D, groups, neg, prm);
  VG.kq = {masks: R.masks, d: R.d, g: D.g, prm, lops: groups.map(G => G.ma), st: {}, khoa: R.khoa};
  vgTruTT(R.khoa, prm, D);
  groups.forEach(G => { VG.kq.st[G.ma] = CORE.maskStats(R.masks[G.ma], D.g, {xaIdx: D.xaIdx, lop: D.lop}); });
  vgKichHoat();
}
function vgKichHoat() {                     // công cụ xoá, giữ, sửa, thống kê, lưu làm việc trên lớp đang chọn
  const K = VG.kq, D = VG.data; if (!K || !D) return;
  const ma = K.masks[VG.lop || ""] ? (VG.lop || "") : K.lops[K.lops.length - 1];
  const m = K.masks[ma];
  VG.res = {mask: m, d: K.d, g: K.g, prm: K.prm, tu: "tu_dong", st: K.st[ma], ma};
  VG.poly = null; VG.daSua = false; VG.sua.clearLayers(); vgPM(false); VG.gNhan.clearLayers();
  const Lb = CORE.labelComp(m, D.g.w, D.g.h, 8, 1);
  VG.obj = {kieu: "mang", lab: Lb.lab, n: Lb.n};
  vgMoTa(VG.obj); vgGanGiu(VG.obj);
  if (VG.nghiBat) vgTimSai(true); else { VG.obj.nghi = new Float32Array(VG.obj.n + 1); VG.obj.tick = new Uint8Array(VG.obj.n + 1); }
  vgHienTK(VG.res.st, D.g, D.lop, "tự động");
  if (ma && IDX.by[ma]) vg$("vgLop").value = ma;
  vgVe(); vgVeHat(); vgDanhSach(); vgDSNghi(); vgTomTat();
  if (VG.cong === "sua") vgCong("hat");
  vgTrang(`lưới ${D.g.w}×${D.g.h}`);
}
function vgMoTa(o) {
  const D = VG.data;
  o.desc = CORE.compDesc(o.lab, o.n, D.g, D.F, D.nf, VG.res && VG.res.d, D.lop.length ? D.lop[0].data : null);
}
function vgGanGiu(o) {                     // mảng chồng ≥ 30 % lên mảng đã giữ thì coi là "giữ"
  o.giu = new Uint8Array(o.n + 1); o.giuRec = new Int32Array(o.n + 1);
  const GX = VG.giu.map((r, i) => [r, i]).filter(([r]) => vgCuaLop(r, VG.res && VG.res.ma));
  if (!GX.length) return;
  const gr = new Int32Array(VG.data.g.w * VG.data.g.h), g_ = VG.data.g;
  GX.forEach(([r, i]) => { if (!r.bb || CORE.inter(r.bb, g_.bb)) CORE.rasterizeRings(CORE.polysToPixRings(g_, r.mp), g_.w, g_.h, gr, i + 1); });
  const ov = {}, rec = {};
  for (let p = 0; p < o.lab.length; p++) { const k = o.lab[p]; if (k && gr[p]) { ov[k] = (ov[k] || 0) + 1; rec[k] = gr[p]; } }
  Object.keys(ov).forEach(k => { if (ov[k] >= 0.3 * o.desc[k - 1].n_px) { o.giu[k] = 1; o.giuRec[k] = rec[k]; } });
}

/* ---------- vẽ ---------- */
function vgVe() {
  if (VG.hien) { map.removeLayer(VG.hien); VG.hien = null; }
  const o = VG.obj, R0 = VG.res; if (!o || !R0) return;
  if (o.kieu === "da_giac") { o.layers.forEach((l, i) => vgKieuLop(l, i + 1)); return; }
  const g = R0.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h;
  const ctx = c.getContext("2d"); if (!ctx) return;
  const img = ctx.createImageData(g.w, g.h), d = img.data, thr = vgNguong2();
  const ex = vg$("vgHienXoa").checked && VG.loai.length ? vgRaster(VG.loai, g) : null;
  const K = VG.kq, act = R0.ma || "", cA = act ? vgRGB(vgMau(act)) : [214, 30, 160];
  const khac = K && !o.chiXem ? K.lops.filter(ma => ma !== act && K.masks[ma] && K.masks[ma].length === o.lab.length).map(ma => [K.masks[ma], vgRGB(vgMau(ma))]) : [];
  for (let p = 0; p < o.lab.length; p++) {
    const k = o.lab[p]; let c3 = null, a = 150;
    if (k) {
      if (o.giu[k]) { if (act) { const x = p % g.w, y = (p - x) / g.w; c3 = (x + y) % 4 === 0 ? [255, 255, 255] : cA; a = 225; } else c3 = [26, 160, 70]; }
      else if (o.nghi[k] >= thr) { c3 = o.tick[k] ? [247, 144, 9] : [253, 200, 120]; a = 200; }
      else c3 = cA;
    } else if (ex && ex[p]) { c3 = [102, 112, 133]; a = 90; }
    else for (const [mk, cc] of khac) if (mk[p]) { c3 = cc; a = 95; break; }
    if (c3) { d[p * 4] = c3[0]; d[p * 4 + 1] = c3[1]; d[p * 4 + 2] = c3[2]; d[p * 4 + 3] = a; }
  }
  ctx.putImageData(img, 0, 0);
  const A = CORE.m2ll(g.bb[0], g.bb[1]), B = CORE.m2ll(g.bb[2], g.bb[3]);
  VG.hien = L.imageOverlay(c.toDataURL(), [[A[1], A[0]], [B[1], B[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 450}).addTo(map);
  const el = VG.hien.getElement && VG.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
}
function vgKieuLop(l, k) {
  const o = VG.obj, thr = vgNguong2();
  const mc = l._ma ? vgMau(l._ma) : (VG.res && VG.res.ma ? vgMau(VG.res.ma) : "#c2185b");
  const st = o.giu[k] ? {color: "#1a7f37", fillColor: "#1a7f37"} : (o.nghi[k] >= thr ? {color: o.tick[k] ? "#f79009" : "#fdb022", fillColor: "#f79009"} : {color: mc, fillColor: mc});
  l.setStyle(Object.assign({weight: 2, fillOpacity: 0.15, dashArray: null}, st, l._chon ? {weight: 4, dashArray: "6 4", color: "#facc15"} : {}));
}
function vgMangMP(k, tol) {                // đa giác (lon, lat) của mảng k ở giai đoạn ảnh: tính trên khung bao của mảng
  const o = VG.obj, g = VG.res.g, b = o.desc[k - 1].bbox, w = b[2] - b[0], h = b[3] - b[1];
  const sg = {x0: g.x0 + b[0] * g.res, y1: g.y1 - b[1] * g.res, res: g.res, w, h}, m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (o.lab[(y + b[1]) * g.w + x + b[0]] === k) m[y * w + x] = 1;
  return CORE.vectorize(m, sg, tol || 0);
}
function vgDTMP(k) { const o = VG.obj; return o.kieu === "mang" ? vgMangMP(k, 0) : vgMP(o.layers[k - 1].toGeoJSON().geometry); }
function vgNhan(k) {
  VG.gNhan.clearLayers(); if (!VG.obj || !k) return;
  const mp = VG.obj.kieu === "mang" ? vgMangMP(k, 0.7) : vgDTMP(k);
  L.polygon(mp.map(pg => pg.map(r => r.map(q => [q[1], q[0]]))), {color: "#fde047", weight: 3, fill: false, dashArray: "5 4", interactive: false, pmIgnore: true}).addTo(VG.gNhan);
}
function vgXem(k) {
  const d = VG.obj.desc[k - 1];
  if (!d) { if (VG.obj.layers) { map.fitBounds(VG.obj.layers[k - 1].getBounds(), {maxZoom: 17}); vgNhan(k); } return; }
  const g = VG.data ? VG.data.g : VG.res.g, b = d.bbox, a = CORE.pixToLL(g, b[0], b[3]), c = CORE.pixToLL(g, b[2], b[1]);
  map.fitBounds([[a[1], a[0]], [c[1], c[0]]], {maxZoom: 17, padding: [60, 60]}); vgNhan(k);
}

/* ---------- xoá / giữ mảng, hoàn tác ---------- */
function vgBanGhi(k) {
  const mp = vgDTMP(k);
  return {mp, bb: vgBB3857(mp), desc: VG.obj.desc[k - 1] || null, ctx: vgNgu(), tg: Date.now(), ma: VG.res ? VG.res.ma || "" : ""};
}
function vgChiXem() { if (VG.obj && VG.obj.chiXem) { msg(`đang xem vùng năm ${VG.obj.chiXem}: bấm Chọn lại để sửa`, "wa", 3000); return true; } return false; }
function vgXoaDT(ks) {
  const o = VG.obj; if (!o || !ks.length || vgChiXem()) return;
  const recs = ks.filter(k => o.kieu === "da_giac" || o.desc[k - 1]).map(vgBanGhi);
  VG.loai.push(...recs); VG.undo.push({kieu: "xoa", recs});
  if (o.kieu === "mang") vgChon();
  else { ks.sort((a, b) => b - a).forEach(k => VG.sua.removeLayer(o.layers[k - 1])); VG.daSua = true; VG.gNhan.clearLayers(); vgDoiTuongDaGiac(); vgCapNhatHen(); }
  if (vg$("vgTuTim").checked) vgTimSai(true);
  vgTomTat();
  msg(`đã xoá ${recs.length} mảng (Z để hoàn tác)`, "ok", 1800);
}
function vgGiuDT(k) {
  const o = VG.obj; if (!o || vgChiXem()) return;
  if (o.giu[k]) {                          // bỏ giữ
    const i = o.kieu === "mang" ? o.giuRec[k] - 1 : VG.giu.indexOf(o.layers[k - 1]._giuRec);
    if (i >= 0) { const rec = VG.giu.splice(i, 1)[0]; VG.undo.push({kieu: "bo_giu", rec}); }
    o.giu[k] = 0; if (o.kieu === "da_giac") o.layers[k - 1]._giuRec = null;
  } else {
    const rec = vgBanGhi(k); VG.giu.push(rec); VG.undo.push({kieu: "giu", rec});
    o.giu[k] = 1; o.nghi[k] = 0; o.tick[k] = 0;
    if (o.kieu === "da_giac") o.layers[k - 1]._giuRec = rec;
  }
  if (o.kieu === "mang") vgGanGiu(o);
  if (vg$("vgTuTim").checked && VG.nghiBat) vgTimSai(true);
  vgVe(); vgDanhSach(); vgDSNghi(); vgTomTat();
}
function vgThemLai(recs) {                 // hoàn tác xoá ở giai đoạn đa giác: vẽ lại các đa giác
  recs.forEach(r => vgThemDaGiac(r.mp)); vgDoiTuongDaGiac(); vgCapNhatHen();
}
function vgHoanTac() {
  const u = VG.undo.pop(); if (!u) { msg("không còn gì để hoàn tác", "wa", 1500); return; }
  const bo = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); };
  if (u.kieu === "hat") { bo(u.am ? VG.neg : VG.pos, u.h); if (typeof mvBo === "function") mvBo(u.h); vgVeHat(); vgTinh(); }
  else if (u.kieu === "bo_hat") { (u.am ? VG.neg : VG.pos).push(u.h); if (!u.am && typeof mvThem === "function") mvThem(u.h); vgVeHat(); vgTinh(); }
  else if (u.kieu === "xoa") {
    u.recs.forEach(r => bo(VG.loai, r));
    if (VG.obj && VG.obj.kieu === "da_giac") vgThemLai(u.recs); else vgChon();
  } else if (u.kieu === "bo_xoa") { VG.loai.push(...u.recs); if (VG.obj && VG.obj.kieu === "mang") vgChon(); }
  else if (u.kieu === "giu") { bo(VG.giu, u.rec); vgLamMoiGiu(); }
  else if (u.kieu === "chuan") { VG.sua.clearLayers(); u.truoc.forEach(x => vgThemDaGiac(x.mp, x.ma)); VG.daSua = true; vgDoiTuongDaGiac(); vgCapNhatHen(); }
  else if (u.kieu === "bo_giu") { VG.giu.push(u.rec); vgLamMoiGiu(); }
  vgTomTat(); msg("đã hoàn tác", "ok", 1000);
}
function vgLamMoiGiu() {
  const o = VG.obj; if (!o) return;
  if (o.kieu === "mang") vgGanGiu(o);
  else o.layers.forEach((l, i) => { o.giu[i + 1] = l._giuRec && VG.giu.includes(l._giuRec) ? 1 : 0; });
  vgVe(); vgDanhSach(); vgDSNghi();
}

/* ---------- tìm mảng sai giống các mảng đã xoá ---------- */
function vgNguong2() { return +vg$("vgNguong2").value; }
function vgNhom() { return {pho: vg$("vgNPho").checked, hinh: vg$("vgNHinh").checked, lop: vg$("vgNLop").checked}; }
function vgTimSai(im) {
  const o = VG.obj; if (!o || !o.desc) return;
  const ctx = vgNgu(), grp = vgNhom();
  const ma = VG.res ? VG.res.ma : "";
  const del = VG.loai.filter(r => r.ctx === ctx && r.desc && vgCuaLop(r, ma)).map(r => r.desc);
  const keep = VG.giu.filter(r => r.ctx === ctx && r.desc && vgCuaLop(r, ma)).map(r => r.desc);
  o.nghi = new Float32Array(o.n + 1); o.tick = new Uint8Array(o.n + 1);
  if (!del.length || !(grp.pho || grp.hinh || grp.lop)) {
    if (!im) msg(del.length ? "chọn ít nhất một nhóm tiêu chí" : "chưa xoá mảng nào với bộ đặc trưng này: xoá vài mảng sai trước (công cụ ②)", "wa", 4000);
    vgVe(); vgDSNghi(); vgTomTat(); return;
  }
  // mảng chứa điểm mẫu dương là mảng ĐÚNG (người dùng đã chỉ vào nó): làm mốc, không bị nghi
  const hatK = vgMangHat(o);
  hatK.forEach(k => { if (o.desc[k - 1]) keep.push(o.desc[k - 1]); });
  const idx = [], cand = [];
  o.desc.forEach((d, i) => { if (d && !o.giu[i + 1] && !hatK.has(i + 1)) { idx.push(i + 1); cand.push(d); } });
  const S = CORE.similarWrong(cand, del, keep, grp);
  const thr = vgNguong2();
  S.forEach((s, j) => { o.nghi[idx[j]] = s.score; if (s.score >= thr) o.tick[idx[j]] = 1; });
  VG.nghiBat = true;
  vgVe(); vgDanhSach(); vgDSNghi(); vgTomTat();
  if (!im) { vgTab("sach"); const n = [...o.nghi].filter(v => v >= thr).length; msg(n ? `${n} mảng nghi sai (cam): xem lại, bỏ tick mảng đúng, rồi Xoá các mảng đã tick (Enter)` : "không có mảng nào đủ giống các mảng đã xoá", n ? "ok" : "wa", 4000); }
}
function vgMangHat(o) {                     // các mảng / đa giác chứa điểm mẫu dương
  const ks = new Set(), D = VG.data; if (!o || !o.lab || !D) return ks;
  VG.pos.filter(h => !VG.res || (h.ma || "") === (VG.res.ma || "")).forEach(h => { const p = CORE.llToPix(D.g, h.lon, h.lat);
    if (p[0] >= 0 && p[1] >= 0 && p[0] < D.g.w && p[1] < D.g.h) { const k = o.lab[Math.floor(p[1]) * D.g.w + Math.floor(p[0])]; if (k) ks.add(k); } });
  return ks;
}
function vgDSNghi() {
  const o = VG.obj, box = vg$("vgDSNghi");
  if (!o || !o.nghi) { box.innerHTML = ""; return; }
  const thr = vgNguong2(), ks = [];
  for (let k = 1; k <= o.n; k++) if (o.nghi[k] >= thr) ks.push(k);
  ks.sort((a, b) => o.nghi[b] - o.nghi[a]);
  box.innerHTML = !ks.length ? '<span class="mu">' + T("chưa có mảng nghi sai") + '</span>' :
    `<table class="yt"><tr><th></th><th>${T("mảng")}</th><th>${T("ha")}</th><th>${T("giống mảng xoá")}</th><th></th></tr>` +
    ks.slice(0, 100).map(k => `<tr data-k="${k}"><td><input type="checkbox" ${o.tick[k] ? "checked" : ""}></td><td>#${k}</td>` +
      `<td>${o.desc[k - 1].dien_tich_ha.toFixed(2)}</td><td>${o.nghi[k].toFixed(2)}</td><td><button data-a="xem">${T("xem")}</button><button data-a="giu">${T("đúng")}</button></td></tr>`).join("") +
    `</table>` + (ks.length > 100 ? `<div class="mu">${T("và {n} mảng nữa", {n: ks.length - 100})}</div>` : "");
  box.querySelectorAll("tr[data-k]").forEach(tr => {
    const k = +tr.dataset.k;
    tr.querySelector("input").onchange = ev => { o.tick[k] = ev.target.checked ? 1 : 0; vgVe(); vgTomTat(); };
    tr.onmouseenter = () => vgNhan(k);
    tr.querySelectorAll("button").forEach(b => { b.onclick = () => (b.dataset.a === "xem" ? vgXem(k) : vgGiuDT(k)); });
  });
}
function vgXoaTick() {
  const o = VG.obj; if (!o || !o.tick) return;
  const ks = []; for (let k = 1; k <= o.n; k++) if (o.tick[k] && o.nghi[k] >= vgNguong2()) ks.push(k);
  if (!ks.length) { msg("chưa tick mảng nào", "wa", 1500); return; }
  vgXoaDT(ks);
}

/* ---------- danh sách mảng ---------- */
function vgDanhSach() {
  const o = VG.obj, box = vg$("vgDSMang");
  if (!o || !o.desc || o.chiXem) { box.innerHTML = ""; return; }
  const kieu = vg$("vgSapXep").value, ks = [];
  for (let k = 1; k <= o.n; k++) if (o.desc[k - 1]) ks.push(k);
  const key = {dt: k => -o.desc[k - 1].dien_tich_ha, nghi: k => -(o.nghi ? o.nghi[k] : 0), xa: k => -o.desc[k - 1].d_mean,
               dai: k => -o.desc[k - 1].elong}[kieu];
  ks.sort((a, b) => key(a) - key(b));
  box.innerHTML = `<table class="yt"><tr><th>${T("mảng")}</th><th>${T("ha")}</th><th>${T("kéo dài")}</th><th>${T("xa mẫu")}</th><th>${T("nghi")}</th><th></th></tr>` +
    ks.slice(0, 80).map(k => { const d = o.desc[k - 1];
      return `<tr data-k="${k}"${o.giu[k] ? ' style="color:#1a7f37"' : ""}><td>#${k}</td><td>${d.dien_tich_ha.toFixed(2)}</td><td>${d.elong.toFixed(1)}</td>` +
        `<td>${d.d_mean.toFixed(3)}</td><td>${o.nghi && o.nghi[k] ? o.nghi[k].toFixed(2) : ""}</td>` +
        `<td><button data-a="xem">${T("xem")}</button><button data-a="xoa">${T("xoá")}</button><button data-a="giu">${o.giu[k] ? T("bỏ giữ") : T("giữ")}</button></td></tr>`; }).join("") +
    `</table>` + (ks.length > 80 ? `<div class="mu">${T("hiện 80 / {n} mảng", {n: ks.length})}</div>` : "");
  box.querySelectorAll("tr[data-k]").forEach(tr => {
    const k = +tr.dataset.k; tr.onmouseenter = () => vgNhan(k);
    tr.querySelectorAll("button").forEach(b => { b.onclick = () => (b.dataset.a === "xem" ? vgXem(k) : b.dataset.a === "xoa" ? vgXoaDT([k]) : vgGiuDT(k)); });
  });
}
function vgXoaKQ() {
  VG.res = null; VG.obj = null; VG.kq = null; vgBangLop(); VG.poly = null; VG.sua.clearLayers(); vgPM(false); VG.gNhan.clearLayers();
  if (VG.hien) { map.removeLayer(VG.hien); VG.hien = null; }
  ["vgTK", "vgNamTK", "vgDSMang", "vgDSNghi", "vgTom"].forEach(id => { vg$(id).innerHTML = ""; });
  vgNamDung(); VG.nam = null; VG.namTK = null; vg$("vgNamViz").hidden = true; vg$("vgNamBD").innerHTML = ""; vg$("vgNamLeg").innerHTML = ""; vg$("vgNamLop").innerHTML = "";
}

/* ---------- thống kê ---------- */
function vgHienTK(st, g, lop, nguon, dtCau) {
  const pct = (a, t) => t ? (100 * a / t).toFixed(1) : "0", A = st.dien_tich_ha * 1e4;
  let h = `<div style="margin:4px 0"><b>${st.dien_tich_ha.toFixed(2)} ${T("ha")}</b> (${(st.dien_tich_ha / 100).toFixed(3)} ${T("km²")}) · ${T("{n} điểm ảnh {r} m", {n: st.n_px.toLocaleString(LOCALE[LANG] || "vi"), r: st.do_phan_giai_m.toFixed(1)})} · ` +
          `${T("{n} mảng (lớn nhất {a} ha)", {n: st.n_manh, a: st.manh_lon_nhat_ha.toFixed(2)})} · <span class="mu">${T(nguon)}</span>` +
          (dtCau != null ? " · " + T("diện tích đa giác trên mặt cầu {a} ha", {a: (dtCau / 1e4).toFixed(2)}) : "") + `</div>`;
  const xa = Object.entries(st.theo_xa || {}).filter(([k]) => +k > 0).sort((a, b) => b[1] - a[1]);
  if (xa.length && VG.xa) {
    const ten = i => (VG.xa.find(x => x.i === +i) || {}).ten || i;
    h += `<div><b>${T("Theo xã")}</b> (${xa.length}): ` + xa.slice(0, 8).map(([i, a]) => `${ten(i)} ${(a / 1e4).toFixed(1)} ${T("ha")} (${pct(a, A)} %)`).join(" · ") + (xa.length > 8 ? " · …" : "") + `</div>`;
  }
  (lop || []).forEach(L0 => {
    const c = st.thanh_phan[L0.id] || {}, t = Object.values(c).reduce((s, v) => s + v, 0);
    h += `<div><b>${lname(L0)}</b>: ` + Object.entries(c).filter(([k]) => +k > 0).sort((a, b) => b[1] - a[1]).map(([k, a]) => `${T((L0.ten_lop || TEN3)[k] || String(k))} ${pct(a, t)} %`).join(" · ") + `</div>`;
  });
  vg$("vgTK").innerHTML = h;
}

/* ---------- đa giác, sửa, thống kê lại ---------- */
function vgPM(bat) {
  if (!VG.coPM) return;
  if (bat) {
    if (VG.pmOn) return; VG.pmOn = true;
    map.pm.addControls({position: "topleft", drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: true,
                        drawPolygon: true, drawCircle: false, drawText: false, editMode: true, dragMode: false, cutPolygon: true,
                        removalMode: true, rotateMode: false});
  } else {
    if (!VG.pmOn) return; VG.pmOn = false;
    try { map.pm.disableGlobalEditMode(); map.pm.disableGlobalRemovalMode(); map.pm.disableDraw(); map.pm.removeControls(); } catch (e) { /* chưa bật */ }
  }
}
function vgThemDaGiac(mp, ma, chon) {        // ma: lớp riêng của đa giác (bản 2.5), chon: đang được chọn
  mp.forEach(pg => {
    const lyr = L.polygon(pg.map(r => r.map(q => [q[1], q[0]])), {color: "#c2185b", weight: 2, fillOpacity: 0.15, pmIgnore: false});
    if (ma) lyr._ma = ma; if (chon) lyr._chon = true;
    lyr.on("pm:edit", () => { VG.daSua = true; vgDoiTuongDaGiacHen(); });
    lyr.on("click", ev => {
      if (VG.mode && VG.cong === "sua" && typeof vgChonDaGiac === "function" && vgChonDaGiac(lyr, ev)) { L.DomEvent.stopPropagation(ev); return; }
      if (!VG.mode || (VG.cong !== "xoa" && VG.cong !== "giu")) return;
      L.DomEvent.stopPropagation(ev);
      const k = VG.obj && VG.obj.layers ? VG.obj.layers.indexOf(lyr) + 1 : 0; if (!k) return;
      if (VG.cong === "xoa") vgXoaDT([k]); else vgGiuDT(k);
    });
    lyr.on("contextmenu", ev => {
      if (!VG.mode || VG.cong === "sua") return;
      L.DomEvent.stopPropagation(ev);
      const k = VG.obj && VG.obj.layers ? VG.obj.layers.indexOf(lyr) + 1 : 0; if (!k) return;
      if (ev.originalEvent && ev.originalEvent.shiftKey) vgGiuDT(k); else vgXoaDT([k]);
    });
    lyr.on("mouseover", () => { if (VG.obj && VG.obj.layers) { const k = VG.obj.layers.indexOf(lyr) + 1, d = k && VG.obj.desc[k - 1];
      if (d) lyr.bindTooltip(`${T("đa giác")} #${k} · ${d.dien_tich_ha.toFixed(2)} ${T("ha")}` + (VG.obj.nghi[k] ? " · " + T("nghi sai {n}", {n: VG.obj.nghi[k].toFixed(2)}) : ""), {sticky: true}).openTooltip(); } });
    VG.sua.addLayer(lyr);
    if (VG.coPM) L.PM.reInitLayer(lyr);
  });
}
function vgDoiTuongDaGiac() {              // đối tượng = từng đa giác đang sửa, mô tả trên lưới phân tích
  const D = VG.data, layers = VG.sua.getLayers().filter(l => l.toGeoJSON);
  if (!D) {                                 // chưa có ảnh phân tích (vd sửa vùng đã lưu): vẫn xoá, giữ được, không mô tả
    const n = layers.length;
    VG.obj = {kieu: "da_giac", n, layers, lab: null, desc: layers.map(() => null), giu: new Uint8Array(n + 1), nghi: new Float32Array(n + 1), tick: new Uint8Array(n + 1)};
    layers.forEach((l, i) => { if (l._giuRec && VG.giu.includes(l._giuRec)) VG.obj.giu[i + 1] = 1; });
    vgVe(); vgDanhSach(); vgDSNghi(); vgTomTat(); return;
  }
  const lab = new Int32Array(D.g.w * D.g.h);
  layers.forEach((l, i) => CORE.rasterizeRings(CORE.polysToPixRings(D.g, vgMP(l.toGeoJSON().geometry)), D.g.w, D.g.h, lab, i + 1));
  const old = VG.obj && VG.obj.kieu === "da_giac" ? VG.obj : null;
  VG.obj = {kieu: "da_giac", lab, n: layers.length, layers};
  vgMoTa(VG.obj);
  VG.obj.giu = new Uint8Array(VG.obj.n + 1); VG.obj.nghi = new Float32Array(VG.obj.n + 1); VG.obj.tick = new Uint8Array(VG.obj.n + 1);
  layers.forEach((l, i) => { if (l._giuRec && VG.giu.includes(l._giuRec)) VG.obj.giu[i + 1] = 1; });
  if (VG.nghiBat) vgTimSai(true); else { vgVe(); vgDanhSach(); vgDSNghi(); }
  vgTomTat(); void old;
}
let vgHenDG = null;
function vgDoiTuongDaGiacHen() { clearTimeout(vgHenDG); vgHenDG = setTimeout(vgDoiTuongDaGiac, 250); }
let vgHenTK = null;
function vgCapNhatHen() { clearTimeout(vgHenTK); vgHenTK = setTimeout(vgCapNhat, 300); }
function vgVec() {
  if (!VG.res) { msg("chưa có vùng tự động: đặt điểm mẫu trước"); return; }
  const mp = CORE.vectorize(VG.res.mask, VG.res.g, +vg$("vgGian").value);
  const nv = mp.reduce((s, pg) => s + pg.reduce((t, r) => t + r.length, 0), 0);
  VG.sua.clearLayers(); vgThemDaGiac(mp); VG.poly = mp; VG.daSua = false;
  if (VG.hien) { map.removeLayer(VG.hien); VG.hien = null; }
  vgDoiTuongDaGiac();
  msg(T("{n} đa giác, {v} đỉnh", {n: mp.length, v: nv.toLocaleString(LOCALE[LANG] || "vi")}) + (nv > 20000 ? " " + T("(nhiều đỉnh: tăng giản lược cho dễ sửa)") : "") +
      (VG.coPM ? "" : ". " + T("Không nạp được công cụ sửa (Leaflet-Geoman): vẫn xoá, giữ, lưu và xuất được.")), "ok", 4000);
}
map.on("pm:create", e => { if (!VG.mode) return; e.layer.options.pmIgnore = false; if (VG.coPM) L.PM.reInitLayer(e.layer); VG.sua.addLayer(e.layer); VG.daSua = true; vgDoiTuongDaGiacHen(); });
map.on("pm:cut", e => { if (VG.sua.hasLayer(e.originalLayer)) VG.sua.removeLayer(e.originalLayer); if (e.layer) VG.sua.addLayer(e.layer); VG.daSua = true; vgDoiTuongDaGiacHen(); });
map.on("pm:remove", e => { if (VG.sua.hasLayer(e.layer)) { VG.sua.removeLayer(e.layer); VG.daSua = true; vgDoiTuongDaGiacHen(); } });
function vgMPTuSua() {
  const mp = [];
  VG.sua.eachLayer(l => { if (!l.toGeoJSON) return; const gj = l.toGeoJSON(); (gj.type === "FeatureCollection" ? gj.features : [gj]).forEach(f => vgMP(f.geometry).forEach(pg => mp.push(pg))); });
  return mp;
}
async function vgTKDaGiac(mp) {             // thống kê một tập đa giác (lon, lat) trên lưới vừa khít
  const bb = vgBB3857(mp), ids = vgDT(), y = ST.nam, L0 = MAN.layers.find(l => ids.includes(l.id) && l.nam.includes(y)) || null;
  const g = CORE.gridFor([bb[0] - 30, bb[1] - 30, bb[2] + 30, bb[3] + 30], VG.maxPx, await vgRef(L0, y));
  const {lop} = await vgDoc(g, y, []);
  const m = CORE.rasterizeRings(CORE.polysToPixRings(g, mp), g.w, g.h);
  return {m, g, lop, st: CORE.maskStats(m, g, {xaIdx: vgXaIdx(g), lop})};
}
async function vgCapNhat() {
  const mp = vgMPTuSua(); if (!mp.length) { msg("chưa có ranh giới: chọn công cụ ④ trước"); return; }
  try {
    vgTrang("đang tính theo ranh giới…");
    const {m, g, lop, st} = await vgTKDaGiac(mp);
    VG.poly = mp; VG.res = Object.assign(VG.res || {}, {mask_sua: m, g_sua: g, st_sua: st});
    vgHienTK(st, g, lop, VG.daSua ? "theo ranh giới đã sửa" : "theo ranh giới", CORE.geodesicArea(mp));
    vgTomTat(); vgTrang(`ranh giới ${mp.length} đa giác`);
  } catch (e) { vgTrang("lỗi: " + (e.message || e)); }
}

/* ---------- lưu vùng mẫu ---------- */
const VG_HIEN = Object.assign({hien: true, nam: false}, ls("laymau_hp_vung_hien_v1") || {});   // bản 2.3: hiện / ẩn vùng đã lưu
function vgVungThay(v) {
  if (!VG_HIEN.hien) return false;
  if (VG_HIEN.nam && v.nam !== ST.nam) return false;
  if (v.khu && ST.khu[v.khu] && ST.khu[v.khu].an) return false;
  return true;
}
function vgVeVung() {
  VG.vungVer++; VG.gVung.clearLayers();
  Object.values(ST.vung).filter(vgVungThay).forEach(v => {
    const c = IDX.by[v.ma_lop] || {}, k = v.khu && ST.khu[v.khu];
    L.geoJSON({type: "Feature", geometry: v.geom, properties: {}}, {pmIgnore: true,
      style: {color: c.mau || "#555", weight: k ? 2.5 : 2, fillOpacity: k ? 0.24 : 0.18, dashArray: v.nam === ST.nam ? null : "5 4"}})
      .bindTooltip(`${v.id} · ${v.ma_lop} ${cten(c)} · ${v.nam} · ${v.thong_ke.dien_tich_ha.toFixed(2)} ${T("ha")}` + (k ? ` · 🔒 ${k.ten}` : ""))
      .on("click", e => { if (!VG.mode && typeof vgPopupVung === "function") vgPopupVung(v.id, e.latlng); }).addTo(VG.gVung);
  });
  const ds = Object.values(ST.vung).sort((a, b) => b.tg - a.tg);
  vg$("vgSoVung").textContent = ds.length;
  vg$("vgDS").innerHTML = ds.map(v => `<div class="row${vgVungThay(v) ? "" : " vg-an"}" data-v="${v.id}"><span class="sw" style="background:${(IDX.by[v.ma_lop] || {}).mau || "#555"}"></span>` +
    `<b>${v.ma_lop}</b> ${v.nam} · ${v.thong_ke.dien_tich_ha.toFixed(2)} ha${v.da_sua ? " · " + T("đã sửa") : ""}${v.khu && ST.khu[v.khu] ? " · 🔒" : ""} <span class="mu">${v.ghi_chu || ""}</span>` +
    `<button data-a="xem">${T("xem")}</button><button data-a="lop">${T("đổi lớp")}</button><button data-a="sua">${T("sửa")}</button><button data-a="xoa">${T("xoá")}</button></div>`).join("") || '<span class="mu">' + T("chưa có") + '</span>';
  vg$("vgDS").querySelectorAll("button").forEach(b => { b.onclick = () => vgThaoTac(b.closest("[data-v]").dataset.v, b.dataset.a); });
  vg$("vgVungHien").checked = VG_HIEN.hien; vg$("vgVungNam").checked = VG_HIEN.nam; if ($("cVung")) $("cVung").checked = VG_HIEN.hien;
  vgVeKhu();
}
function vgThaoTac(id, a) {
  const v = ST.vung[id]; if (!v) return;
  const lyr = L.geoJSON({type: "Feature", geometry: v.geom});
  if (a === "xem") map.fitBounds(lyr.getBounds(), {maxZoom: 17});
  if (a === "lop" && typeof vgPopupVung === "function") { map.fitBounds(lyr.getBounds(), {maxZoom: 17}); vgPopupVung(id, lyr.getBounds().getCenter()); }
  if (a === "sua") {
    if (!VG.mode) vgBat(true);
    VG.sua.clearLayers(); vgThemDaGiac(vgMP(v.geom)); VG.poly = vgMP(v.geom); VG.suaId = id;
    if (VG.data) vgDoiTuongDaGiac();
    vg$("vgLop").value = v.ma_lop; vg$("vgTen").value = v.ghi_chu || ""; vgCong("sua"); map.fitBounds(lyr.getBounds(), {maxZoom: 17});
    msg(T("đang sửa vùng {id}: sửa xong bấm Thống kê theo ranh giới rồi Lưu vùng (ghi đè {id})", {id: id}), "ok", 6000);
  }
  if (a === "xoa" && confirm(T("Xoá vùng {id}?", {id: id}))) {
    const k = v.khu && ST.khu[v.khu]; if (k) { k.vung = k.vung.filter(x => x !== id); if (!k.vung.length) delete ST.khu[v.khu]; }
    delete ST.vung[id]; save(); vgVeVung();
  }
}
async function vgLuu() {
  if (!VG.sua.getLayers().length) vgVec();
  if (!VG.sua.getLayers().length) return;
  const nhom = {}; VG.sua.eachLayer(l => { if (l.toGeoJSON && l._ma && l._ma !== vg$("vgLop").value) (nhom[l._ma] = nhom[l._ma] || []).push(...vgMP(l.toGeoJSON().geometry)); });
  for (const [maK, mpK] of Object.entries(nhom)) {                 // bản 2.5: đa giác đã gán lớp khác -> vùng riêng
    const {st: stK} = await vgTKDaGiac(mpK), idK = "V" + Date.now().toString(36) + "_" + maK;
    ST.vung[idK] = vgBanGhiVung(idK, maK, mpK, stK, VG.res && VG.res.prm, true, VG.res ? VG.res.ma : "");
    VG.sua.eachLayer(l => { if (l._ma === maK) VG.sua.removeLayer(l); });
    msg(T("đã lưu vùng {id}: {ma}, {y}, {a} ha", {id: idK, ma: maK, y: ST.nam, a: stK.dien_tich_ha.toFixed(2)}), "ok", 4000);
  }
  if (!VG.sua.getLayers().length) { VG.suaId = null; save(); vgVeVung(); return; }
  await vgCapNhat();
  const st = (VG.res && VG.res.st_sua) || (VG.res && VG.res.st); if (!st) return;
  const ma = vg$("vgLop").value, id = VG.suaId || ("V" + Date.now().toString(36));
  ST.vung[id] = vgBanGhiVung(id, ma, VG.poly, st, VG.res && VG.res.prm, !!VG.daSua || !!VG.suaId || VG.loai.length > 0, VG.res ? VG.res.ma : "");
  VG.suaId = null; save(); vgVeVung();
  msg(T("đã lưu vùng {id}: {ma}, {y}, {a} ha", {id: id, ma: ma, y: ST.nam, a: st.dien_tich_ha.toFixed(2)}), "ok", 4000);
}
function vgBanGhiVung(id, ma, mp, st, prm, daSua, maKQ) {   // maKQ: lớp của kết quả tự động (có thể khác mã lưu)
  return {id, loai: "vung_mau", ma_lop: ma, nam: ST.nam, ghi_chu: vg$("vgTen").value.trim(),
    geom: {type: "MultiPolygon", coordinates: mp},
    thong_ke: {dien_tich_ha: +st.dien_tich_ha.toFixed(4), n_px: st.n_px, n_manh: st.n_manh, do_phan_giai_m: +st.do_phan_giai_m.toFixed(2),
               dien_tich_cau_ha: +(CORE.geodesicArea(mp) / 1e4).toFixed(4),
               theo_xa_ha: Object.fromEntries(Object.entries(st.theo_xa || {}).filter(([k]) => +k > 0 && VG.xa)
                 .map(([k, a]) => [(VG.xa.find(x => x.i === +k) || {}).ten || k, +(a / 1e4).toFixed(3)])),
               thanh_phan_ha: Object.fromEntries(Object.entries(st.thanh_phan || {}).map(([L0, c]) => [L0, Object.fromEntries(Object.entries(c).filter(([k]) => +k > 0).map(([k, a]) => [k, +(a / 1e4).toFixed(3)]))]))},
    tham_so: Object.assign({}, prm || vgThamSo(), {so_mang_xoa: VG.loai.filter(r => vgCuaLop(r, maKQ)).length, so_mang_giu: VG.giu.filter(r => vgCuaLop(r, maKQ)).length,
                                                  cac_lop: VG.kq ? VG.kq.lops.filter(Boolean) : []}),
    hat: {pos: VG.pos.filter(h => !VG.kq || VG.kq.lops.length < 2 || (h.ma || "") === (maKQ || "")).map(h => [+h.lon.toFixed(7), +h.lat.toFixed(7)]),
          neg: VG.neg.map(h => [+h.lon.toFixed(7), +h.lat.toFixed(7)])},
    da_sua: daSua, nam_tk: VG.namTK || null, tg: Date.now()};
}
function vgLuuHet(khu) {                    // mỗi lớp có điểm mẫu một vùng, lấy thẳng từ kết quả tự động; khu: mã khu khi chốt
  const K = VG.kq; if (!K) { msg("chưa có vùng: đặt điểm mẫu trước"); return []; }
  const tol = +vg$("vgGian").value, ids = [], mo = [];
  K.lops.forEach((ma, i) => {
    if (!ma) { msg("điểm mẫu chưa gán lớp (?) không lưu được ở đây: chọn lớp cho chúng", "wa", 4000); return; }
    const mp = CORE.vectorize(K.masks[ma], K.g, tol), st = K.st[ma]; if (!mp.length) return;
    const id = "V" + Date.now().toString(36) + "_" + i;
    ST.vung[id] = vgBanGhiVung(id, ma, mp, st, K.prm, VG.loai.some(r => vgCuaLop(r, ma)), ma);
    if (khu) ST.vung[id].khu = khu;
    ids.push(id); mo.push(`${ma} ${st.dien_tich_ha.toFixed(1)} ${T("ha")}`);
  });
  save(); if (!khu) vgVeVung();
  if (ids.length && !khu) msg(T("đã lưu {n} vùng: {l}", {n: ids.length, l: mo.join(", ")}), "ok", 5000);
  return ids;
}

/* ---------- so sánh các năm ---------- */
/* bản 2.3: giữ bản đồ lớp của từng năm (mỗi điểm ảnh: chỉ số lớp + 1) để vẽ vùng từng năm, được / mất so với năm gốc,
   số năm thuộc lớp, năm bắt đầu thuộc lớp; biểu đồ diện tích theo năm; tuỳ chọn lấy đặc trưng mẫu tại chỗ ở từng năm */
async function vgNam9(chiNam) {              // chiNam: chỉ tính lại các năm này (nút thử lại năm lỗi), giữ kết quả các năm khác
  if (!VG.data || !VG.seedV) { msg("đặt điểm mẫu trước"); return; }
  vgNamDung();
  const D0 = VG.data, prm = vgThamSo(), ids = D0.ids.split(","), g = D0.g, N = g.w * g.h, lops = VG.seedV.groups.map(G => G.ma);
  const act = VG.res ? VG.res.ma : lops[0], vec = vg$("vgNamVec").value;
  const cu = chiNam && VG.namTK && VG.nam && VG.nam.g === g ? {rows: VG.namTK.bang.filter(r => !chiNam.includes(r.nam)), CL: Object.assign({}, VG.nam.cls)} : null;
  let ys = years().filter(y => ids.every(id => vgCoNam(id, y)));
  if (!ys.includes(D0.y)) ys.push(D0.y), ys.sort((a, b) => a - b);
  if (cu) ys = ys.filter(y => chiNam.includes(y));
  const rows = cu ? cu.rows : [], box = vg$("vgNamTK"), CL = cu ? cu.CL : {}; if (!cu) box.innerHTML = '<span class="mu">' + T("đang tính…") + '</span>';
  const tai = (D, H) => H.map(s => D.valid[s.i] ? Object.assign({}, s, {v: CORE.featAt(D.F, D.nf, s.i)}) : null).filter(Boolean);
  for (const y of ys) {
    try {
      vgTrang(T("so sánh: năm {y}…", {y: y}));
      let D = D0, lop = D0.lop;
      if (y !== D0.y) {
        const r_ = await vgDoc(g, y, ids, D0.sc), S = CORE.stackFeat(r_.lst, N); lop = r_.lop;
        D = {y, g, nf: S.nf, valid: S.valid, F: CORE.smoothFeat(S.F, S.nf, g.w, g.h, D0.r, S.valid), xaIdx: D0.xaIdx, cache: D0.cache};
      }
      let groups = VG.seedV.groups, neg = VG.seedV.neg;
      if (vec === "tung" && y !== D0.y) { groups = groups.map(G => ({ma: G.ma, hat: tai(D, G.hat)})).filter(G => G.hat.length); neg = tai(D, neg); }
      const RM = vgMatNaDa(D, groups, neg, prm, y), c = new Uint8Array(N), r = {nam: y, lop: {}};
      lops.forEach((ma, gi) => {
        const m = RM.masks[ma];
        if (!m) { r.lop[ma] = {ha: 0, manh: 0}; return; }
        for (let i = 0; i < N; i++) if (m[i]) c[i] = gi + 1;
        const st = CORE.maskStats(m, g, {lop}); r.lop[ma] = {ha: +st.dien_tich_ha.toFixed(3), manh: st.n_manh};
      });
      CL[y] = c; r.ha = r.lop[act].ha; r.manh = r.lop[act].manh; rows.push(r);
    } catch (e) { rows.push({nam: y, loi: vgLoiDoc(e)}); }
    TIFF_PT.clear();                          // mỗi năm mở riêng, không giữ bộ đệm các năm trước
  }
  rows.sort((a, b) => a.nam - b.nam);
  VG.namTK = {nam_goc: D0.y, bang: rows, so_mang_xoa: VG.loai.length, lops, act, vec};
  VG.nam = {g, cls: CL, lops, ys: rows.filter(r => !r.loi).map(r => r.nam), y0: D0.y};
  VG.namY = D0.y;
  vgVeNamTK(); vgNamVizMo();
  const loi = rows.filter(r => r.loi).length;
  vgTrang(loi ? T("so sánh xong, {n} năm lỗi: bấm Thử lại các năm lỗi", {n: loi}) : T("so sánh {n} năm xong", {n: ys.length}));
}
function vgVeNamTK() {                      // vẽ (lại) bảng so sánh các năm, cả khi đổi ngôn ngữ
  const N = VG.namTK, box = vg$("vgNamTK"); if (!N || !N.lops) return;
  const rows = N.bang, lops = N.lops, act = N.act;
  box.innerHTML = `<table class="yt"><tr><th>${T("năm")}</th>` + lops.map(ma => `<th><span class="sw" style="background:${vgMau(ma)}"></span> ${ma || "?"} ${T("ha")}</th>`).join("") +
    `<th>Δ ${act || "?"}</th><th>${T("mảng")} ${act || "?"}</th></tr>` +
    rows.map((r, k) => r.loi ? `<tr><td>${r.nam}</td><td colspan="${lops.length + 2}" class="mu">${r.loi}</td></tr>` :
      `<tr data-y="${r.nam}"${r.nam === VG.namY ? ' class="cur"' : ""}><td>${r.nam}${r.nam === N.nam_goc ? " ●" : ""}</td>` + lops.map(ma => `<td>${r.lop[ma].ha.toFixed(1)}</td>`).join("") +
      `<td>${k && rows[k - 1].ha != null ? (r.ha - rows[k - 1].ha).toFixed(1) : ""}</td><td>${r.manh}</td></tr>`).join("") +
    `</table><div class="mu">${T(N.vec === "tung" ? "đặc trưng mẫu lấy tại chỗ ở từng năm; mảng đã xoá bị bỏ ở mọi năm. ● năm gốc. Nhấp một dòng để xem năm đó." :
      "điểm mẫu lấy đặc trưng ở năm {y}, áp cho mọi năm; mảng đã xoá cũng bị bỏ ở mọi năm. Nhấp một dòng để xem vùng của năm đó.", {y: N.nam_goc})}</div>`;
  box.querySelectorAll("tr[data-y]").forEach(tr => { tr.onclick = () => vgNamChonNam(+tr.dataset.y); });
  const loi = rows.filter(r => r.loi).map(r => r.nam);
  if (loi.length) {
    const b = document.createElement("button"); b.type = "button"; b.className = "on"; b.textContent = "↻ " + T("Thử lại các năm lỗi ({n})", {n: loi.length});
    b.onclick = () => vgNam9(loi); box.appendChild(b);
  }
}
function vgNamChonNam(y) {
  if (!VG.nam || !VG.nam.cls[y]) return;
  VG.namY = y; const i = VG.nam.ys.indexOf(y); vg$("vgNamY").value = i;
  vgNamVe(); vgVeNamTK(); vgNamBD();
}
function vgNamVizMo() {                      // bảng điều khiển bản đồ, biểu đồ so sánh
  const N0 = VG.nam; if (!N0) { vg$("vgNamViz").hidden = true; return; }
  vg$("vgNamViz").hidden = false;
  const sl = vg$("vgNamLop"), cu = sl.value;
  sl.innerHTML = N0.lops.map(ma => `<option value="${ma}">${ma ? vgTenLop(ma) : "?"}</option>`).join("");
  sl.value = N0.lops.includes(cu) ? cu : (VG.namTK && VG.namTK.act != null ? VG.namTK.act : N0.lops[0]);
  const r = vg$("vgNamY"); r.max = Math.max(0, N0.ys.length - 1); r.value = Math.max(0, N0.ys.indexOf(VG.namY));
  vgNamVe(); vgNamBD();
}
function vgNamDung() { if (VG.chay) { clearInterval(VG.chay); VG.chay = null; } const b = vg$("vgNamChay"); if (b) b.textContent = "▶"; }
function vgNamThoat() { vgNamDung(); if (VG.kq) vgKichHoat(); }
const NAM_MAU = {duoc: [31, 111, 235], mat: [217, 45, 32]};
function vgNamVe() {                         // vẽ bản đồ so sánh lên bản đồ (khoá công cụ sửa như khi xem năm khác)
  const N0 = VG.nam; if (!N0 || !N0.cls[VG.namY]) return;
  const mode = vg$("vgNamXem").value, ma = vg$("vgNamLop").value, gi = N0.lops.indexOf(ma) + 1, g = N0.g, n = g.w * g.h, y = VG.namY;
  const c = document.createElement("canvas"); c.width = g.w; c.height = g.h;
  const ctx = c.getContext("2d"); if (!ctx) return;
  const img = ctx.createImageData(g.w, g.h), d = img.data, C = N0.cls[y], C0 = N0.cls[N0.y0], ys = N0.ys, nY = ys.length;
  const cL = N0.lops.map(m => vgRGB(vgMau(m))), vir = CORE.CMAP.viridis;
  const ramp = t => { const a = Math.min(vir.length - 2, Math.floor(t * (vir.length - 1))), f = t * (vir.length - 1) - a; return [0, 1, 2].map(q => Math.round(vir[a][q] + (vir[a + 1][q] - vir[a][q]) * f)); };
  const put = (p, c3, a) => { d[p * 4] = c3[0]; d[p * 4 + 1] = c3[1]; d[p * 4 + 2] = c3[2]; d[p * 4 + 3] = a; };
  const lab = new Int32Array(n);
  for (let p = 0; p < n; p++) {
    if (mode === "nam") { const k = C[p]; if (k) { put(p, cL[k - 1], k === gi ? 175 : 90); if (k === gi) lab[p] = 1; } }
    else if (mode === "bd") {
      const a = C0[p] === gi, b = C[p] === gi;
      if (a && b) put(p, cL[gi - 1], 110); else if (b) put(p, NAM_MAU.duoc, 210); else if (a) put(p, NAM_MAU.mat, 210);
    } else if (mode === "ts") {
      let k = 0; for (const yy of ys) if (N0.cls[yy][p] === gi) k++;
      if (k) put(p, ramp(nY > 1 ? (k - 1) / (nY - 1) : 1), 200);
    } else {                                  // năm bắt đầu thuộc lớp và giữ đến năm cuối
      if (N0.cls[ys[nY - 1]][p] !== gi) continue;
      let j = nY - 1; while (j > 0 && N0.cls[ys[j - 1]][p] === gi) j--;
      if (j === 0) put(p, [152, 162, 179], 110); else put(p, ramp(nY > 2 ? (j - 1) / (nY - 2) : 1), 215);
    }
  }
  ctx.putImageData(img, 0, 0);
  if (VG.hien) { map.removeLayer(VG.hien); VG.hien = null; }
  const A = CORE.m2ll(g.bb[0], g.bb[1]), B = CORE.m2ll(g.bb[2], g.bb[3]);
  VG.hien = L.imageOverlay(c.toDataURL(), [[A[1], A[0]], [B[1], B[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 450}).addTo(map);
  const el = VG.hien.getElement && VG.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
  VG.obj = {kieu: "mang", chiXem: y, lab, n: 0, giu: new Uint8Array(1), nghi: new Float32Array(1), tick: new Uint8Array(1), desc: []};
  vg$("vgNamYV").textContent = mode === "ts" || mode === "dau" ? `${ys[0]}-${ys[nY - 1]}` : (mode === "bd" ? `${N0.y0} → ${y}` : String(y));
  vg$("vgNamY").disabled = mode === "ts" || mode === "dau"; vg$("vgNamChay").disabled = mode === "ts" || mode === "dau";
  vgNamLeg(mode, ma, ramp);
}
function vgNamLeg(mode, ma, ramp) {
  const N0 = VG.nam, ys = N0.ys, sw = c => `<i style="background:rgb(${c.join(",")})"></i>`, grad = [0, 0.25, 0.5, 0.75, 1].map(t => `rgb(${ramp(t).join(",")})`).join(",");
  const rampH = (a, b) => `<div class="ramp" style="background:linear-gradient(90deg,${grad})"></div><div class="leg"><span>${a}</span><span style="margin-left:auto">${b}</span></div>`;
  let h = "";
  if (mode === "nam") h = `<div class="leg">` + N0.lops.map(m => `<span>${sw(vgRGB(vgMau(m)))}${m || "?"}${m === ma ? " ●" : ""}</span>`).join("") + `<span class="mu">${T("năm {y}", {y: VG.namY})}</span></div>`;
  else if (mode === "bd") h = `<div class="leg"><span>${sw(vgRGB(vgMau(ma)))}${T("giữ nguyên")}</span><span>${sw(NAM_MAU.duoc)}${T("được (năm {y} có, năm gốc không)", {y: VG.namY})}</span><span>${sw(NAM_MAU.mat)}${T("mất (năm gốc có, năm {y} không)", {y: VG.namY})}</span></div>`;
  else if (mode === "ts") h = rampH(T("1 năm"), T("cả {n} năm", {n: ys.length})) + `<div class="mu sm">${T("đậm: ổn định qua các năm; nhạt: chập chờn, nên xem lại bằng dải ảnh")}</div>`;
  else h = rampH(ys[1], ys[ys.length - 1]) + `<div class="leg"><span>${sw([152, 162, 179])}${T("đã thuộc lớp từ {y}", {y: ys[0]})}</span></div><div class="mu sm">${T("chỉ tô chỗ thuộc lớp ở năm cuối và giữ liên tục từ năm bắt đầu")}</div>`;
  vg$("vgNamLeg").innerHTML = h;
}
function vgNamBD() {                         // biểu đồ diện tích theo năm, mỗi lớp một đường; nhấp chấm để xem năm đó
  const N = VG.namTK, box = vg$("vgNamBD"); if (!N) { box.innerHTML = ""; return; }
  const rows = N.bang.filter(r => !r.loi), lops = N.lops; if (!rows.length) { box.innerHTML = ""; return; }
  const W = 380, H = 150, L0 = 40, R0 = 8, T0 = 8, B0 = 20, n = rows.length;
  let hi = 0; rows.forEach(r => lops.forEach(ma => { hi = Math.max(hi, r.lop[ma].ha); })); hi = hi > 0 ? hi * 1.08 : 1;
  const X = k => L0 + 16 + (n > 1 ? k * (W - L0 - R0 - 32) / (n - 1) : (W - L0 - R0 - 32) / 2), Y = v => T0 + (1 - v / hi) * (H - T0 - B0);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  niceTicks(0, hi, 4).forEach(t => { s += `<line x1="${L0}" x2="${W - R0}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="#e9ecf0"/><text x="${L0 - 3}" y="${(Y(t) + 3).toFixed(1)}" font-size="9" fill="#98a2b3" text-anchor="end">${Number.isInteger(t) ? t : t.toFixed(1)}</text>`; });
  s += `<text x="3" y="10" font-size="9" fill="#98a2b3">${T("ha")}</text>`;
  rows.forEach((r, k) => {
    if (r.nam === VG.namY) s += `<rect x="${(X(k) - 9).toFixed(1)}" y="${T0}" width="18" height="${H - T0 - B0}" fill="#0b63ce" opacity=".08"/>`;
    s += `<text x="${X(k).toFixed(1)}" y="${H - 6}" font-size="9" text-anchor="middle" fill="${r.nam === VG.namY ? "#0b63ce" : "#667085"}" font-weight="${r.nam === N.nam_goc ? 700 : 400}">${r.nam}</text>`;
  });
  lops.forEach(ma => {
    const c = vgMau(ma), pts = rows.map((r, k) => [X(k), Y(r.lop[ma].ha)]);
    if (pts.length > 1) s += `<polyline points="${pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ")}" fill="none" stroke="${c}" stroke-width="2"/>`;
    rows.forEach((r, k) => { s += `<circle data-y="${r.nam}" cx="${pts[k][0].toFixed(1)}" cy="${pts[k][1].toFixed(1)}" r="${r.nam === VG.namY ? 4.5 : 3}" fill="${c}" stroke="#fff" stroke-width="1" style="cursor:pointer"><title>${ma || "?"} ${r.nam}: ${r.lop[ma].ha.toFixed(1)} ${T("ha")}, ${r.lop[ma].manh} ${T("mảng")}</title></circle>`; });
  });
  box.innerHTML = s + "</svg>";
  box.querySelectorAll("circle[data-y]").forEach(e => { e.addEventListener("click", () => vgNamChonNam(+e.dataset.y)); });
}
function vgNamCSV() {
  const N = VG.namTK; if (!N) return;
  const rows = []; N.bang.filter(r => !r.loi).forEach(r => N.lops.forEach(ma => rows.push({nam: r.nam, ma_lop: ma, dien_tich_ha: r.lop[ma].ha, so_manh: r.lop[ma].manh, nam_goc: N.nam_goc, dac_trung_mau: N.vec})));
  download(`so_sanh_nam_${stamp()}.csv`, CORE.toCSV(rows, ["nam", "ma_lop", "dien_tich_ha", "so_manh", "nam_goc", "dac_trung_mau"]), "text/csv");
}

/* ---------- rải điểm vào vùng ---------- */
function vgRai() {
  const R0 = VG.res; if (!R0) { msg("chưa có vùng"); return; }
  const m = R0.mask_sua || R0.mask, g = R0.g_sua || R0.g, n = Math.max(1, +vg$("vgNDiem").value || 20);
  const ma = vg$("vgLop").value, bo = "vung", now = Date.now();
  const idx = CORE.samplePixels(m, n, now % 100000 + 1);
  idx.forEach((i, k) => {
    const x = i % g.w, y = (i - x) / g.w, ll = CORE.pixToLL(g, x + 0.5, y + 0.5), id = "R" + now.toString(36) + "_" + k;
    const p = CORE.newPoint(id, ll[0], ll[1], {bo});
    CORE.setLabel(p, ST.nam, ma, now); p.tin[ST.nam] = 2; p.ghi_chu = T("rải từ vùng chọn ({ma})", {ma: ma});
    ST.diem[id] = p;
  });
  ST.bo = bo; save(); buildSetSelect(); render();
  msg(T('đã rải {n} điểm vào vùng, nhãn {ma} cho năm {y} (bộ điểm "vung"); kiểm lại từng điểm', {n: idx.length, ma: ma, y: ST.nam}), "ok", 6000);
}

/* ---------- xuất, nhập, gộp ---------- */
function vgFC() {
  return {type: "FeatureCollection", features: Object.values(ST.vung).map(v => {
    const c = IDX.by[v.ma_lop] || {};
    return {type: "Feature", geometry: v.geom, properties: {id: v.id, loai: "vung_mau", ma_lop: v.ma_lop, id_lop: c.id, nhom: c.nhom || "",
      lop3: IDX.lop3(v.ma_lop), nam: v.nam, ghi_chu: v.ghi_chu, dien_tich_ha: v.thong_ke.dien_tich_ha, n_manh: v.thong_ke.n_manh,
      do_phan_giai_m: v.thong_ke.do_phan_giai_m, da_sua: v.da_sua, cap_nhat: new Date(v.tg).toISOString(),
      thong_ke: JSON.stringify(v.thong_ke), tham_so: JSON.stringify(v.tham_so), hat: JSON.stringify(v.hat),
      nam_tk: v.nam_tk ? JSON.stringify(v.nam_tk) : ""}};
  })};
}
function vungNhapGeo(fc, ten) {
  const vung = fc.features.filter(f => f.properties && f.properties.loai === "vung_mau");
  if (!vung.length) { vgNapXa(fc); msg(T("đã nạp {n} xã từ {f}", {n: VG.xa.length, f: ten}), "ok"); return; }
  let n = 0;
  vung.forEach(f => {
    const p = f.properties, J = s => { try { return JSON.parse(s); } catch (e) { return null; } };
    const v = {id: p.id, loai: "vung_mau", ma_lop: p.ma_lop, nam: +p.nam, ghi_chu: p.ghi_chu || "", geom: {type: "MultiPolygon", coordinates: vgMP(f.geometry)},
               thong_ke: J(p.thong_ke) || {dien_tich_ha: +p.dien_tich_ha || 0}, tham_so: J(p.tham_so) || {}, hat: J(p.hat) || {}, da_sua: !!p.da_sua,
               nam_tk: J(p.nam_tk), tg: Date.parse(p.cap_nhat) || Date.now()};
    if (!ST.vung[v.id] || ST.vung[v.id].tg < v.tg) { ST.vung[v.id] = v; n++; }
  });
  save(); vgVeVung(); msg(T("đã nạp {n} vùng mẫu", {n: n}), "ok");
}
function vungGop(obj) {
  Object.values(obj || {}).forEach(v => { if (!ST.vung[v.id] || ST.vung[v.id].tg < v.tg) ST.vung[v.id] = v; });
  vgVeVung();
}
vg$("eVung").onclick = () => download(`vung_mau_${stamp()}.geojson`, JSON.stringify(vgFC()), "application/geo+json");
vg$("eVungCSV").onclick = () => {
  const rows = Object.values(ST.vung).map(v => {
    const c = IDX.by[v.ma_lop] || {}, tp = (v.thong_ke.thanh_phan_ha || {}), xa = v.thong_ke.theo_xa_ha || {};
    const r = {id: v.id, ma_lop: v.ma_lop, id_lop: c.id, lop3: IDX.lop3(v.ma_lop), nam: v.nam, dien_tich_ha: v.thong_ke.dien_tich_ha,
               dien_tich_cau_ha: v.thong_ke.dien_tich_cau_ha, n_manh: v.thong_ke.n_manh, do_phan_giai_m: v.thong_ke.do_phan_giai_m,
               xa_chinh: Object.entries(xa).sort((a, b) => b[1] - a[1]).map(e => e[0])[0] || "", so_xa: Object.keys(xa).length,
               so_mang_xoa: (v.tham_so || {}).so_mang_xoa || 0, da_sua: v.da_sua ? 1 : 0, ghi_chu: v.ghi_chu, cap_nhat: new Date(v.tg).toISOString()};
    Object.entries(tp).forEach(([L0, cc]) => { const t = Object.values(cc).reduce((s, x) => s + x, 0);
      [1, 2, 3].forEach(k => { r[`${L0}_${k}_pct`] = t ? +(100 * (cc[k] || 0) / t).toFixed(1) : ""; }); });
    return r;
  });
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
  download(`vung_mau_thong_ke_${stamp()}.csv`, CORE.toCSV(rows, cols), "text/csv");
};

/* ---------- bật / tắt, phím, gắn vào năm ---------- */
function vgBat(on) {
  VG.mode = on == null ? !VG.mode : on;
  vg$("vung").hidden = !VG.mode;
  vg$("bVung").classList.toggle("on", VG.mode);
  if (VG.mode) {
    if (addMode) $("bMode").click();
    vgDungDT(); vg$("vgNam").textContent = ST.nam; vgCong(VG.cong); vgTab(ls("laymau_hp_vung_tab_v1") || "tim");
    vgPVHien(); vgVeXaDung();
  } else {
    vgPM(false); map.getContainer().style.cursor = addMode ? "crosshair" : "";
    if (VG.tip) { map.removeLayer(VG.tip); VG.tip = null; }
    VG.gXaChon.clearLayers(); vgNamDung();
  }
  hud();
}
function vgTau(dv) { const e = vg$("vgTau"); e.value = Math.max(+e.min, Math.min(+e.max, +e.value + dv)).toFixed(3); if (VG.data) vgChon(); }
function vgPhim(e) {                        // gọi từ bộ bắt phím của trang; true = phím đã dùng
  const k = e.key || "";
  if (k.toLowerCase() === "o") { vgBat(); e.preventDefault(); return true; }
  if (!VG.mode) return false;
  const map_ = {"1": "hat", "2": "xoa", "3": "giu", "4": "sua"};
  if (map_[k]) { vgCong(map_[k]); e.preventDefault(); return true; }
  if (k === "z" || k === "Z") { vgHoanTac(); e.preventDefault(); return true; }
  if (k === "s" || k === "S") { vgTimSai(false); e.preventDefault(); return true; }
  if (k === "Enter") { vgXoaTick(); e.preventDefault(); return true; }
  if (k === "+" || k === "=") { vgTau(+0.005); e.preventDefault(); return true; }
  if (k === "-" || k === "_") { vgTau(-0.005); e.preventDefault(); return true; }
  if (k === "Escape") { vgCong("hat"); VG.gNhan.clearLayers(); e.preventDefault(); return true; }
  if (/^Arrow/.test(k) || ["b", "h", "g"].includes(k.toLowerCase())) return false;
  if (k.length === 1) { e.preventDefault(); return true; }        // chặn phím gán nhãn điểm khi đang chọn vùng
  return false;
}
// Bảng nổi nằm TRÊN bản đồ: nhấp, cuộn, kéo trong bảng không được lọt xuống bản đồ (trước đây bấm
// "Xoá điểm mẫu" thì vừa xoá vừa thêm một điểm mẫu mới đúng chỗ nút bấm).
["vung", "panel", "tilewarn"].forEach(id => { const el = document.getElementById(id);
  if (el) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
    // bản 2.1: nút bị vẽ lại ngay trong lúc nhấp (hàng lớp, danh sách mảng...) đã rời khỏi cây DOM, nên Leaflet không còn
    // thấy dấu "không truyền nhấp" và coi đó là một cú nhấp bản đồ (đặt thêm điểm mẫu). Chặn nhấp ngay tại bảng.
    el._chanNhap = ev => ev.stopPropagation(); el.addEventListener("click", el._chanNhap); } });
// kéo bảng bằng thanh tiêu đề; nhấp đúp tiêu đề để về chỗ cũ
(function keoBang() {
  const el = vg$("vung"), dau = el.querySelector(".vg-dau"); let st = null;
  const vt = ls("laymau_hp_vung_vt_v1"); if (vt) { el.style.left = vt[0] + "px"; el.style.top = vt[1] + "px"; }
  dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; st = {x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop}; e.preventDefault(); });
  document.addEventListener("mousemove", e => { if (!st) return; const pa = el.parentElement;
    el.style.left = Math.max(0, Math.min(pa.clientWidth - 80, st.l + e.clientX - st.x)) + "px";
    el.style.top = Math.max(0, Math.min(pa.clientHeight - 40, st.t + e.clientY - st.y)) + "px"; });
  document.addEventListener("mouseup", () => { if (st) { ls("laymau_hp_vung_vt_v1", [parseInt(el.style.left) || 56, parseInt(el.style.top) || 10]); st = null; } });
  dau.addEventListener("dblclick", () => { el.style.left = "56px"; el.style.top = "10px"; ls("laymau_hp_vung_vt_v1", null); });
})();
vg$("bVung").onclick = () => vgBat();
vg$("vgDong").onclick = () => vgBat(false);
vg$("vgThu").onclick = () => { const b = vg$("vgBody"); b.hidden = !b.hidden; vg$("vgThu").textContent = b.hidden ? "+" : "–"; };
document.querySelectorAll("#vung [data-cong]").forEach(b => { b.onclick = () => vgCong(b.dataset.cong); });
document.querySelectorAll("#vung [data-tab]").forEach(b => { b.onclick = () => vgTab(b.dataset.tab); });
vg$("vgHoan").onclick = vgHoanTac;
vg$("vgXoaHat").onclick = () => {
  const ds = vgNhomHat(), ma = VG.res ? VG.res.ma : (VG.lop || "");
  if (ds.length > 1 && ds.includes(ma)) { VG.pos = VG.pos.filter(h => (h.ma || "") !== ma); vgVeHat(); vgTinh(); msg(T("đã xoá điểm mẫu của lớp {m}", {m: ma || "?"}), "ok", 2000); return; }
  VG.pos = []; VG.neg = []; vgVeHat(); vgXoaKQ(); vgTrang("");
};
vg$("vgLuuHet").onclick = () => vgLuuHet();
vg$("vgTinh").onclick = () => { VG.data = null; vgTinh(); };
vg$("vgTauTru").onclick = () => vgTau(-0.005); vg$("vgTauCong").onclick = () => vgTau(+0.005);
["vgTau", "vgMinPx", "vgLo", "vgKhe"].forEach(id => { vg$(id).oninput = () => { if (VG.data) { cancelAnimationFrame(VG.raf); VG.raf = requestAnimationFrame(vgChon); } }; });
["vgMin", "vgPV", "vgBK", "vgTam", "vgXa", "vgHL", "vgTru"].forEach(id => { vg$(id).onchange = () => { vgPVHien(); vgLuuPV(); vgXaLoc(); vgVeHat(); vgTinh(); }; });
vg$("vgGian").onchange = () => { if (VG.obj && VG.obj.kieu === "da_giac" && !VG.daSua) vgVec(); };
vg$("vgCapNhat").onclick = vgCapNhat;
vg$("vgLuu").onclick = vgLuu;
vg$("vgNam9").onclick = vgNam9;
vg$("vgRai").onclick = vgRai;
vg$("vgTimSai").onclick = () => vgTimSai(false);
vg$("vgXoaTick").onclick = vgXoaTick;
vg$("vgBoNghi").onclick = () => { VG.nghiBat = false; if (VG.obj) { VG.obj.nghi = new Float32Array(VG.obj.n + 1); VG.obj.tick = new Uint8Array(VG.obj.n + 1); } vgVe(); vgDSNghi(); vgDanhSach(); vgTomTat(); };
vg$("vgNguong2").oninput = () => { vg$("vgNguong2V").textContent = vgNguong2().toFixed(2); const o = VG.obj;
  if (o && o.nghi) { for (let k = 1; k <= o.n; k++) o.tick[k] = o.nghi[k] >= vgNguong2() ? 1 : 0; vgVe(); vgDSNghi(); vgTomTat(); } };
["vgNPho", "vgNHinh", "vgNLop"].forEach(id => { vg$(id).onchange = () => { if (VG.nghiBat) vgTimSai(true); }; });
vg$("vgHienXoa").onchange = vgVe;
vg$("vgBoXoa").onclick = () => {
  if (!VG.loai.length) return;
  if (VG.obj && VG.obj.kieu === "da_giac") { msg("đang ở bước sửa ranh giới: về công cụ ① và Chọn lại trước", "wa", 3000); return; }
  if (!confirm(T("Bỏ cả {n} lần xoá mảng?", {n: VG.loai.length}))) return;
  VG.undo.push({kieu: "bo_xoa", recs: VG.loai.slice()}); VG.loai = []; if (VG.data) vgChon(); vgTomTat(); };
vg$("vgSapXep").onchange = vgDanhSach;
vg$("vgNapXa").onclick = () => $("fileIn").click();
vg$("vgXaHien").onchange = () => { if (vg$("vgXaHien").checked) VG.gXa.addTo(map); else map.removeLayer(VG.gXa); };
const _setYearGoc = setYear;
setYear = function (y) { _setYearGoc(y); vg$("vgNam").textContent = ST.nam; vgVeVung(); vgNamDung(); if (VG.mode && VG.pos.length) { VG.data = null; vgTinh(); } };
const _hudGoc = hud;
hud = function () { _hudGoc(); if (VG.mode) $("hud").textContent += " · " + T("CHỌN VÙNG: 1 mẫu · 2 xoá mảng · 3 giữ · 4 sửa · Z hoàn tác · S tìm mảng sai"); };
vgVeVung();

/* ---------------- bản 2.0: đổi ngôn ngữ, điểm loại trừ trên màn hình cảm ứng ---------------- */
function vgDoiNgonNgu() {
  const b = vg$("vgDT"); if (b) { delete b.dataset.xong; b.innerHTML = ""; }
  if (MAN) vgDungDT();
  try { vgChips(); vgTomTat(); vgVeHat(); vgVeVung(); if (VG.mode) vgCong(VG.cong); if (VG.obj) { vgDSNghi(); vgDanhSach(); } } catch (e) { /* chưa có vùng */ }
  try { if (VG.res && VG.res.st && VG.data) vgHienTK(VG.res.st_sua || VG.res.st, VG.res.g_sua || VG.data.g, VG.data.lop, VG.res.st_sua ? (VG.daSua ? "theo ranh giới đã sửa" : "theo ranh giới") : "tự động"); vgVeNamTK(); } catch (e) { /* chưa có thống kê */ }
  if (VG.xa) vg$("vgXaTT").textContent = T("{n} xã", {n: VG.xa.length});
  vgTrang("");                                // dòng trạng thái cũ viết bằng ngôn ngữ trước
}
vg$("vgAm").onclick = () => { VG.amBat = !VG.amBat; vg$("vgAm").classList.toggle("on", VG.amBat); };

/* ---------------- bản 2.3: phạm vi rõ ràng, điểm mẫu có hiệu lực theo khu, trừ chỗ đã lưu, chốt khu ---------------- */
const PV_GIAI = {
  lien: "Tìm các mảng liền với điểm mẫu, trong tầm quanh chúng.",
  bk: "Tìm mọi chỗ giống mẫu trong bán kính R quanh từng điểm mẫu.",
  xa: "Tìm mọi chỗ giống mẫu trong toàn bộ các xã có điểm mẫu: đặt một điểm ở xã nào là tìm khắp xã đó.",
  xads: "Tìm mọi chỗ giống mẫu trong các xã chọn ở danh sách dưới (Ctrl + nhấp bản đồ để thêm, bỏ xã).",
  nhin: "Tìm mọi chỗ giống mẫu trong khung nhìn hiện tại."};
const HL_GIAI = {
  all: "",
  xa: "Mỗi điểm ảnh chỉ so với các điểm mẫu cùng xã: mẫu ở xã này không kéo nhầm chỗ ở xã khác.",
  r: "Mỗi điểm ảnh chỉ so với các điểm mẫu cách nó không quá R."};
function vgPVHien() {                        // hiện đúng ô nhập theo phạm vi, và câu giải thích
  const pv = vg$("vgPV").value, hl = vg$("vgHL").value;
  vg$("vung").querySelector("[data-vgr]").hidden = !(pv === "bk" || hl === "r");
  vg$("vung").querySelector("[data-vgt]").hidden = pv !== "lien";
  vg$("vgXaW").hidden = pv !== "xads";
  vg$("vgPVGiai").textContent = T(PV_GIAI[pv] || "") + (HL_GIAI[hl] ? " " + T(HL_GIAI[hl]) : "");
  if ((pv === "xa" || pv === "xads" || hl === "xa") && !VG.xa && MAN && MAN.ranh_gioi_xa) vgTaiXaHF();
  vgVeXaDung();
}
function vgLuuPV() { ls("laymau_hp_vung_pv_v1", {pv: vg$("vgPV").value, hl: vg$("vgHL").value, tru: vg$("vgTru").value}); }
(function napPV() {
  const c = ls("laymau_hp_vung_pv_v1") || {};
  [["vgPV", c.pv], ["vgHL", c.hl], ["vgTru", c.tru]].forEach(([id, v]) => { if (v && [...vg$(id).options].some(o => o.value === v)) vg$(id).value = v; });
})();
function vgTruTT(K, prm, D) {                // cho người dùng thấy chỗ nào đang bị trừ
  const e = vg$("vgTruTT"); if (!e) return;
  const t = [];
  if (K && K.n) t.push(T("đang trừ chỗ của {n} vùng đã lưu năm {y}", {n: K.n, y: D ? D.y : ST.nam}) + (K.nKhu ? " " + T("(trong đó {k} vùng của khu đã chốt)", {k: K.nKhu}) : ""));
  if (prm && prm.hieu_luc === "xa" && D && !D.xaIdx) t.push(T("chưa có ranh giới xã: điểm mẫu đang có hiệu lực ở mọi nơi"));
  e.textContent = t.join(" · ");
}
function vgTenKhuTuDong() {
  const xs = VG.xa ? [...new Set(VG.pos.map(h => { const x = vgXaTai(h.lon, h.lat); return x ? x.ten : ""; }).filter(Boolean))] : [];
  return xs.length ? xs.slice(0, 3).join(", ") + (xs.length > 3 ? " …" : "") : T("khu {n}", {n: Object.keys(ST.khu).length + 1});
}
function vgChot() {                          // lưu vùng của mọi lớp ở khu này, khoá lại, rồi dọn điểm mẫu để làm khu khác
  const K = VG.kq; if (!K) { msg("chưa có vùng: đặt điểm mẫu trước"); return; }
  if (VG.obj && VG.obj.chiXem) vgNamThoat();
  const id = "K" + Date.now().toString(36), ten = vg$("vgKhuTen").value.trim() || vgTenKhuTuDong();
  const ids = vgLuuHet(id); if (!ids.length) { vgVeVung(); return; }
  const tomTat = ids.map(v => `${ST.vung[v].ma_lop} ${ST.vung[v].thong_ke.dien_tich_ha.toFixed(1)} ${T("ha")}`);
  ST.khu[id] = {id, ten, nam: ST.nam, tg: Date.now(), vung: ids, hat: VG.pos.map(h => ({lon: h.lon, lat: h.lat, ma: h.ma || ""})),
                neg: VG.neg.map(h => ({lon: h.lon, lat: h.lat})), loai: VG.loai.slice(), giu: VG.giu.slice(), tham_so: Object.assign({}, K.prm)};
  ids.forEach(v => { if (!ST.vung[v].ghi_chu) ST.vung[v].ghi_chu = ten; });
  VG.pos = []; VG.neg = []; VG.loai = []; VG.giu = []; VG.undo = []; VG.nam = null; VG.namTK = null; vgNamDung();
  vg$("vgKhuTen").value = ""; vg$("vgNamTK").innerHTML = ""; vg$("vgNamViz").hidden = true;
  vgXoaKQ(); vgVeHat(); vgTomTat(); vgTrang(""); save(); vgVeVung(); vgTruTT(null);
  msg(T('đã chốt khu "{t}": {l}. Tìm tiếp ở khu khác: chỗ đã chốt được trừ ra (mục "Trừ chỗ").', {t: ten, l: tomTat.join(", ")}), "ok", 8000);
}
function vgVeKhu() {
  const box = vg$("vgKhuDS"); if (!box) return;
  const ds = Object.values(ST.khu).sort((a, b) => b.tg - a.tg);
  vg$("vgSoKhu").textContent = ds.length;
  box.innerHTML = ds.map(k => {
    const vs = k.vung.map(v => ST.vung[v]).filter(Boolean);
    return `<div class="row${k.an ? " vg-an" : ""}" data-k="${k.id}">🔒 <b>${k.ten}</b> ${k.nam} · ` +
      vs.map(v => `<span class="sw" style="background:${(IDX.by[v.ma_lop] || {}).mau || "#555"}"></span>${v.ma_lop} ${v.thong_ke.dien_tich_ha.toFixed(1)} ${T("ha")}`).join(" ") +
      ` <button data-a="xem">${T("xem")}</button><button data-a="an">${k.an ? T("hiện") : T("ẩn")}</button><button data-a="mo" title="${T("xoá các vùng của khu, đưa điểm mẫu về để sửa tiếp")}">${T("mở lại")}</button><button data-a="xoa">${T("xoá")}</button></div>`;
  }).join("") || `<span class="mu">${T("chưa chốt khu nào: làm xong một khu thì bấm 🔒 Chốt khu")}</span>`;
  box.querySelectorAll("button").forEach(b => { b.onclick = () => vgKhuThaoTac(b.closest("[data-k]").dataset.k, b.dataset.a); });
}
function vgKhuThaoTac(id, a) {
  const k = ST.khu[id]; if (!k) return;
  const vs = k.vung.map(v => ST.vung[v]).filter(Boolean);
  if (a === "xem") {
    const b = L.featureGroup(vs.map(v => L.geoJSON({type: "Feature", geometry: v.geom})));
    if (b.getLayers().length) map.fitBounds(b.getBounds(), {maxZoom: 16, padding: [30, 30]});
    if (k.an) { k.an = false; save(); vgVeVung(); }
  } else if (a === "an") { k.an = !k.an; save(); vgVeVung(); }
  else if (a === "xoa") {
    if (!confirm(T("Xoá khu {t} và {n} vùng đã lưu của nó?", {t: k.ten, n: vs.length}))) return;
    k.vung.forEach(v => { delete ST.vung[v]; }); delete ST.khu[id]; save(); vgVeVung();
  } else if (a === "mo") {
    if ((VG.pos.length || VG.neg.length) && !confirm(T("Đang có điểm mẫu chưa chốt: bỏ chúng để mở lại khu {t}?", {t: k.ten}))) return;
    if (!confirm(T("Mở lại khu {t}: xoá {n} vùng đã lưu của khu và đưa điểm mẫu về để sửa tiếp?", {t: k.ten, n: vs.length}))) return;
    k.vung.forEach(v => { delete ST.vung[v]; }); delete ST.khu[id];
    if (!VG.mode) vgBat(true);
    VG.pos = k.hat.map(h => h.ma ? {lon: h.lon, lat: h.lat, ma: h.ma} : {lon: h.lon, lat: h.lat});
    VG.neg = (k.neg || []).map(h => ({lon: h.lon, lat: h.lat})); VG.loai = k.loai || []; VG.giu = k.giu || []; VG.undo = [];
    vg$("vgKhuTen").value = k.ten; save(); vgVeVung(); vgVeHat();
    const b = L.latLngBounds(VG.pos.concat(VG.neg).map(h => [h.lat, h.lon])); if (b.isValid()) map.fitBounds(b.pad(0.3), {maxZoom: 16});
    if (ST.nam !== k.nam) setYear(k.nam); else { VG.data = null; vgTinh(); }
    msg(T("đã mở lại khu {t}: sửa xong bấm 🔒 Chốt khu lần nữa", {t: k.ten}), "ok", 5000);
  }
}
function vgVungHienDat(o) { Object.assign(VG_HIEN, o); ls("laymau_hp_vung_hien_v1", VG_HIEN); vgVeVung(); }
vg$("vgChot").onclick = vgChot; vg$("vgChot2").onclick = vgChot;
vg$("vgXaLoc").oninput = vgXaLoc;
vg$("vgXaLoc").onkeydown = e => { if (e.key === "Enter") { const o = [...vg$("vgXa").options].find(q => !q.hidden && !q.selected); if (o) { o.selected = true; vgXaLoc(); vgVeXaDung(); vgTinh(); } e.preventDefault(); } };
vg$("vgXaDen").onclick = () => vgXaDen([...vg$("vgXa").selectedOptions].map(o => +o.value));
vg$("vgXaBo").onclick = () => { vgXaChonDat([]); vgTinh(); };
vg$("vgNhom").onchange = vgNhomChon;
vg$("vgNhomLuu").onclick = vgNhomLuu;
vg$("vgNhomXoa").onclick = () => { const t = vg$("vgNhom").value; if (!t) return; if (!confirm(T("Xoá nhóm xã {t}?", {t: t}))) return; delete ST.nhom_xa[t]; save(); vgNhomDS(); };
vg$("vgVungHien").onchange = () => vgVungHienDat({hien: vg$("vgVungHien").checked});
vg$("vgVungNam").onchange = () => vgVungHienDat({nam: vg$("vgVungNam").checked});
if ($("cVung")) $("cVung").onchange = () => vgVungHienDat({hien: $("cVung").checked});
vg$("vgNamXem").onchange = () => { vgNamDung(); vgNamVe(); };
vg$("vgNamLop").onchange = () => { vgNamVe(); };
vg$("vgNamY").oninput = () => { const N0 = VG.nam; if (!N0) return; VG.namY = N0.ys[+vg$("vgNamY").value]; vgNamVe(); vgVeNamTK(); vgNamBD(); };
vg$("vgNamChay").onclick = () => {
  if (VG.chay) { vgNamDung(); return; }
  const N0 = VG.nam; if (!N0 || N0.ys.length < 2) return;
  vg$("vgNamChay").textContent = "⏸";
  VG.chay = setInterval(() => { const i = (N0.ys.indexOf(VG.namY) + 1) % N0.ys.length; vgNamChonNam(N0.ys[i]); }, 1100);
};
vg$("vgNamThoat").onclick = vgNamThoat;
vg$("vgNamCSV").onclick = vgNamCSV;
const _vgDoiNNGoc = vgDoiNgonNgu;
vgDoiNgonNgu = function () {
  _vgDoiNNGoc();
  try { vgNhomDS(); vgPVHien(); vgVeKhu(); if (VG.kq) vgTruTT(VG.kq.khoa, VG.kq.prm, VG.data); if (VG.nam && !vg$("vgNamViz").hidden) vgNamVizMo(); } catch (e) { /* chưa có */ }
};
vgNhomDS(); vgPVHien(); vgVeKhu();
