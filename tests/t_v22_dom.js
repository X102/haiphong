// Bản 2.2: ô ảnh nền không còn trắng (phóng to từ ô cha cùng bản), OpenStreetMap (xem, lọc, sửa, lấy mẫu),
// liên kết quy hoạch Hải Phòng, báo lỗi qua email / GitHub, tệp cấu hình web
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json");
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "2.2", "bản 2.2 trở lên");
  ok(E("SITE.bao_loi && SITE.bao_loi.email") === "baoloi@example.org" && E("CFG.repo") === "x/y", "đọc cau_hinh.json; Cài đặt riêng của người dùng vẫn được giữ");

  // ---------- hàm thuần OSM
  ok(E("CORE.osmThe({name: 'A', landuse: 'industrial', building: 'yes'})") === "building=yes" && E("CORE.osmThe({highway: 'primary'})") === "highway=primary", "thẻ chính theo thứ tự ưu tiên");
  const L1 = (ex, t, x) => E(`CORE.osmLoc(${JSON.stringify(ex)})(${JSON.stringify(t)}, ${JSON.stringify(x || {})})`);
  ok(L1("landuse=farmland|paddy", {landuse: "paddy"}) && !L1("landuse=farmland|paddy", {landuse: "forest"}) && L1("building", {building: "house"}) &&
     L1("!building", {landuse: "x"}) && L1('name~"cát bà"', {name: "Đảo Cát Bà"}) && L1("landuse=* landuse!=forest", {landuse: "meadow"}) &&
     !L1("landuse=* landuse!=forest", {landuse: "forest"}) && L1("@lop=X3", {}, {lop: "X3"}), "biểu thức lọc: =, |, !, ~, *, !=, @lop");
  let loi = ""; try { E("CORE.osmLoc('name~(')"); } catch (e) { loi = String(e.message || e); } ok(loi.length > 0, "biểu thức lỗi báo lỗi");
  const M = t => E(`CORE.osmLopMacDinh(${JSON.stringify(t)})`);
  ok(M({landuse: "industrial"}) === "X3" && M({landuse: "farmland", crop: "rice"}) === "T1" && M({landuse: "farmland"}) === "T2" &&
     M({natural: "water", water: "pond"}) === "N2" && M({natural: "water", water: "river"}) === "N1" && M({wetland: "mangrove", natural: "wetland"}) === "T5" &&
     M({building: "yes"}) === "X1" && M({landuse: "aquaculture"}) === "N2" && M({landuse: "quarry"}) === "D2" && M({natural: "beach"}) === "D3" && M({amenity: "cafe"}) === "",
     "quy đổi mặc định thẻ OSM -> lớp");
  ok(E("CORE.osmLop({landuse: 'residential'}, {'landuse=residential': 'X1'})") === "X1", "bảng quy đổi của người dùng thắng mặc định");
  const rp = E(`(() => { const mp = [[[[106.60, 20.80], [106.61, 20.80], [106.61, 20.81], [106.60, 20.81], [106.60, 20.80]]]];
     const P = CORE.rdTrongDaGiac([{mp}], 20, 100, 50, CORE.rnd(3));
     return P.map(q => [q.lon, q.lat, CORE.pip(q.lon, q.lat, mp), CORE.distBien(q.lon, q.lat, mp)]); })()`);
  const dmin = Math.min(...rp.flatMap((a, i) => rp.slice(i + 1).map(b => Math.hypot((a[0] - b[0]) * 104000, (a[1] - b[1]) * 110540))));
  ok(rp.length === 20 && rp.every(q => q[2] && q[3] >= 50) && dmin >= 95, `rải 20 điểm trong đa giác: đều bên trong, cách mép ≥ 50 m, cách nhau ≥ 100 m (nhỏ nhất ${dmin.toFixed(0)})`);
  ok(/^\[out:json\]\[timeout:60\];\(nwr\["building"\]\(20\.800000,106\.600000,20\.810000,106\.610000\);\);out geom;$/.test(E("CORE.overpassQL(['nwr[\"building\"]'], [106.6, 20.8, 106.61, 20.81], 60)")), "câu Overpass đúng thứ tự nam, tây, bắc, đông");

  // ---------- liên kết quy hoạch
  const lk = E("CORE.links(20.93707, 106.73273, {year: 2025, wayback: 1})"), qh = lk.find(x => x.k === "quyhoach");
  ok(lk.length === 12 && qh && qh.url === "https://quyhoach.haiphong.gov.vn/#map=17/20.937070/106.732730&lng=106.732730&lat=20.937070", "liên kết cổng quy hoạch Hải Phòng theo toạ độ điểm");

  // ---------- ảnh nền: không còn ô trắng
  const rel = E("REL[REL.length - 3][1]"), rel17 = E("REL[REL.length - 5][1]");
  E(`(() => { const r = ${JSON.stringify(rel)};
     SEL.set(r + "/19/2000/1001", null); SEL.set(r + "/18/1000/500", null); SEL.set(r + "/17/500/250", ${JSON.stringify(rel17)}); SEL.set(r + "/16/250/125", r);
     window.__src = []; window.__ve = []; window.__hong = /\\/17\\//;
     window.Image = class { set src(v) { window.__src.push(v); this._s = v; setTimeout(() => (window.__hong && window.__hong.test(v) && window.__hongBat ? this.onerror() : this.onload()), 5); } get src() { return this._s; } };
   })()`);
  const cv = E(`(() => { const c = document.createElement("canvas"); c.width = c.height = 256; c.getContext = () => ({drawImage: (...a) => window.__ve.push(a.slice(1))}); return c; })()`);
  w.__cv = cv; const k = await E(`new WaybackLayer(${JSON.stringify(rel)}, {})._ve({x: 1001, y: 2000, z: 19}, window.__cv)`);
  ok(k === 2 && E("window.__src.length") === 1 && E("window.__src[0]").endsWith(`/tile/${rel17}/17/500/250`) && JSON.stringify(E("window.__ve[0]")) === "[64,0,64,64,0,0,256,256]",
     `bản không có ô mức 19, 18: lấy ô mức 17 cùng bản, cắt phần 64 × 64 rồi phóng to (k = ${k})`);
  E("window.__hongBat = true; window.__src = []; window.__ve = []");
  const k2 = await E(`new WaybackLayer(${JSON.stringify(rel)}, {})._ve({x: 1001, y: 2000, z: 19}, window.__cv)`);
  ok(k2 === 3 && E("window.__src").length === 2 && E("window.__src[1]").endsWith(`/tile/${rel}/16/250/125`) && JSON.stringify(E("window.__ve[0]")) === "[32,0,32,32,0,0,256,256]",
     "ảnh ô mức 17 lỗi: lùi tiếp lên mức 16, phần 32 × 32");
  E("baoPhong(3, 16)"); ok(/16/.test($("phongTT").textContent), "ghi chú nhẹ: ô được phóng to từ mức 16 (không che bản đồ)");

  // ---------- OpenStreetMap từ tệp FlatGeobuf
  const P = RV.lang.concat(RV.dai);
  E(`map.fitBounds([[${Math.min(...P.map(q => q[1])) - 0.01}, ${Math.min(...P.map(q => q[0])) - 0.01}], [${Math.max(...P.map(q => q[1])) + 0.01}, ${Math.max(...P.map(q => q[0])) + 0.01}]], {animate: false})`);
  E("map.setZoom(13, {animate: false})"); await sleep(100);
  ok($("osmDS").querySelectorAll("input[data-cd]").length === 7 && /2026-09-29/.test($("osmTT").textContent), "bảng lớp có 7 chủ đề OSM, ngày tải sẵn");
  const cb = $("osmDS").querySelector('input[data-cd="sdd"]'); cb.checked = true; cb.onchange();
  await until(() => E("OSM.lop.sdd && OSM.lop.sdd.f.size") >= 7, 8000, "nạp sử dụng đất");
  ok(E("OSM.lop.sdd.f.size") === 7 && E("map.hasLayer(OSM.lop.sdd.g)") && /OpenStreetMap/.test(w.document.querySelector(".leaflet-control-attribution").textContent),
     "nạp 7 đa giác sử dụng đất từ FlatGeobuf theo khung nhìn; có ghi công ODbL");
  const fr = E("[...OSM.lop.sdd.f.values()].find(f => f.properties.ten === 'Làng 1')");
  ok(fr && fr.properties.tags.landuse === "residential" && fr.id === "way/100", "đối tượng chuẩn hoá: id way/100, thẻ JSON đã giải");
  const cbn = $("osmDS").querySelector('input[data-cd="nha"]'); cbn.checked = true; cbn.onchange(); await sleep(400);
  ok(E("OSM.lop.nha.f.size") === 0 && /15/.test($("osmDS").textContent), "nhà: chưa nạp khi thu nhỏ (cần mức 15)");
  E(`map.setView([${RV.lang[0][1]}, ${RV.lang[0][0]}], 16, {animate: false})`);
  await until(() => E("OSM.lop.nha.f.size") >= 4, 8000, "nạp nhà ở mức 16");
  ok(E("OSM.lop.nha.f.size") >= 4, `nhà quanh làng 1 ở mức 16: ${E("OSM.lop.nha.f.size")}`);
  E(`map.fitBounds([[${Math.min(...P.map(q => q[1])) - 0.01}, ${Math.min(...P.map(q => q[0])) - 0.01}], [${Math.max(...P.map(q => q[1])) + 0.01}, ${Math.max(...P.map(q => q[0])) + 0.01}]], {animate: false})`);
  E("map.setZoom(13, {animate: false})"); await sleep(300);
  // bảng OSM: lọc, thống kê
  $("osmMo").click(); await sleep(50);
  ok(!$("osmP").hidden && $("osmGoiY").querySelectorAll("button").length >= 6, "mở bảng OSM, có gợi ý biểu thức");
  $("osmLoc").value = "landuse=residential"; $("osmApDung").click(); await sleep(50);
  ok(/^4\b/.test($("osmTK").textContent.trim()) && $("osmKQ").querySelectorAll("tr[data-f]").length === 4 && /ha/.test($("osmTK").textContent), `lọc landuse=residential: 4 đối tượng, diện tích (${$("osmTK").textContent.slice(0, 40)})`);
  $("osmLoc").value = "@lop=X3"; $("osmApDung").click(); await sleep(50);
  ok($("osmKQ").querySelectorAll("tr[data-f]").length === 1 && /KCN/.test($("osmKQ").textContent), "lọc theo lớp gợi ý @lop=X3: khu công nghiệp");
  $("osmLoc").value = "name~("; $("osmApDung").click(); ok(/lỗi/.test($("osmTrang").textContent), "biểu thức sai: báo trên bảng");
  $("osmLoc").value = ""; $("osmApDung").click();
  // nhấp đối tượng: bảng thẻ, liên kết
  const lay = E("OSM.lop.sdd.lay.get('way/200')"); void lay;
  E(`OSM.lop.sdd.lay.get("way/200").fire("click", {latlng: L.latLng(${RV.lang[0][1]}, ${RV.lang[0][0]})})`); await sleep(50);
  const pop = w.document.querySelector(".leaflet-popup-content");
  ok(pop && /KCN thử/.test(pop.textContent) && pop.querySelector('a[href="https://www.openstreetmap.org/way/200"]') && pop.querySelector('a[href*="editor=id&way=200"]') && /X3/.test(pop.textContent),
     "nhấp đối tượng: bảng thẻ, lớp gợi ý X3, liên kết OSM và iD");
  pop.querySelector("[data-a=sua]").click(); await sleep(50);
  ok(!$("osmChon").closest("[data-opane]").hidden && $("osmChon").querySelectorAll("input[data-k]").length === 3, "Sửa thẻ: mở thẻ Sửa với bảng khoá/giá trị");
  const vv = [...$("osmChon").querySelectorAll("input[data-v]")]; vv.find(i => i.value === "industrial").value = "commercial";
  $("osmChon").querySelector("[data-a=luu]").click(); await sleep(50);
  ok(E("ST.osm_sua['way/200'].tags.landuse") === "commercial" && E("ST.osm_sua['way/200'].goc_tags.landuse") === "industrial" &&
     E("CORE.osmLop(OSM.lop.sdd.f.get('way/200').properties.tags, OSM_QD)") === "X1" && /\(1\)/.test($("osmSoSua").textContent), "lưu thẻ: ghi sửa đổi (giữ thẻ gốc), lớp gợi ý đổi sang X1");
  $("osmChon").querySelector("[data-a=xoa]").click(); await sleep(30);
  ok(E("ST.osm_sua['way/200'].thao_tac") === "xoa", "đánh dấu xoá");
  const nb = blobs.length; $("osmXuatSua").click(); await sleep(30);
  const gs = JSON.parse(await docBlob(blobs[nb]));
  ok(gs.features.length === 1 && gs.features[0].properties.thao_tac === "xoa" && gs.features[0].properties.landuse === "commercial" && /ODbL/.test(gs.nguon), "xuất các sửa đổi GeoJSON");
  $("osmChon").querySelector("[data-a=goc]").click(); await until(() => E("OSM.lop.sdd.f.has('way/200')"), 5000, "nạp lại bản gốc");
  ok(!E("ST.osm_sua['way/200']") && E("OSM.lop.sdd.f.get('way/200').properties.tags.landuse") === "industrial", "về bản gốc: thẻ gốc, không còn sửa đổi");
  // lấy mẫu từ OSM
  $("osmLoc").value = "landuse"; $("osmApDung").click(); $("osmPV").value = "nap"; $("osmPV").onchange();
  E("osmTab('mau')"); await sleep(50);
  const qd = [...$("osmQD").querySelectorAll("select[data-the]")].map(s => s.dataset.the + ">" + s.value).sort();
  ok(qd.join() === "landuse=farmland>T1,landuse=industrial>X3,landuse=residential>X2" || qd.join() === "landuse=farmland>T2,landuse=industrial>X3,landuse=residential>X2",
     `bảng quy đổi: ${qd.join(", ")}`);
  $("osmN").value = "5"; $("osmDmin").value = "40"; $("osmBien").value = "15"; $("osmNam").value = "2025"; $("osmGanSan").checked = true; $("osmTenBo").value = "Mẫu OSM thử";
  $("osmTaoBo").click(); await sleep(200);
  const id = E("ST.bo"), pp = E(`Object.values(ST.diem).filter(p => p.bo === "${id}")`);
  const lopDem = {}; pp.forEach(p => { lopDem[p.osm.lop] = (lopDem[p.osm.lop] || 0) + 1; });
  const trongDG = E(`Object.values(ST.diem).filter(p => p.bo === "${id}").every(p => { const t = osmTim(p.osm.id); return t && CORE.pip(p.lon, p.lat, CORE.geomMP(t.f.geometry)); })`);
  ok(/^Mau_OSM_thu/.test(id) && pp.length >= 12 && lopDem.X2 === 5 && lopDem.X3 === 5 && trongDG, `tạo bộ từ OSM: ${pp.length} điểm ${JSON.stringify(lopDem)}, đều nằm trong đa giác nguồn`);
  ok(pp.every(p => p.nhan[2025] === p.osm.lop && p.tin[2025] === 1) && E(`ST.bo_cfg["${id}"].cach`) === "osm" && E("years()").includes(2025), "gán sẵn nhãn gợi ý năm 2025, tin cậy thấp; bộ ghi cách tạo osm");
  E(`select("${pp[0].id}", false)`); ok(/OSM:/.test($("pinfo").textContent) && $("pinfo").querySelector('a[href^="https://www.openstreetmap.org/"]'), "thông tin điểm có đối tượng OSM nguồn");
  E("ST.bo = 'E0'; buildSetSelect(); render()");
  // Overpass trực tiếp (máy chủ giả)
  const ov = {elements: [{type: "node", id: 9001, lat: RV.lang[1][1], lon: RV.lang[1][0], tags: {amenity: "school", name: "Trường Overpass"}},
                         {type: "way", id: 9002, tags: {highway: "primary"}, geometry: [{lat: RV.lang[1][1], lon: RV.lang[1][0]}, {lat: RV.lang[1][1] + 0.002, lon: RV.lang[1][0] + 0.002}]}]};
  const fetch0 = w.fetch; let qOv = "";
  w.fetch = (u, o) => /overpass/.test(String(u)) ? (qOv = decodeURIComponent(String(o.body)), Promise.resolve({ok: true, json: async () => ov})) : fetch0(u, o);
  $("osmNguon").value = "op"; $("osmNguon").onchange();
  E(`map.setView([${RV.lang[1][1]}, ${RV.lang[1][0]}], 15, {animate: false})`);
  const cbd = $("osmDS").querySelector('input[data-cd="diem"]'); cbd.checked = true; cbd.onchange();
  await until(() => E("OSM.lop.diem && OSM.lop.diem.f.size") >= 1, 5000, "Overpass điểm");
  ok(E("OSM.lop.diem.f.has('node/9001')") && /node\["amenity"\]\(/.test(qOv) && /out geom/.test(qOv) && E("OSM.lop.sdd.f.size") === 0, "nguồn Overpass: truy vấn khung nhìn, đổi nguồn thì nạp lại từ đầu");
  w.fetch = fetch0; $("osmNguon").value = "hf"; $("osmNguon").onchange();
  ["sdd", "nha", "diem"].forEach(c => { const i = $("osmDS").querySelector(`input[data-cd="${c}"]`); i.checked = false; i.onchange(); });
  ok(!E("map.hasLayer(OSM.lop.sdd.g)") && !/OpenStreetMap contributors/.test(w.document.querySelector(".leaflet-control-attribution").textContent), "tắt mọi chủ đề: gỡ lớp và ghi công");
  $("osmDong").click();

  // ---------- báo lỗi
  w.dispatchEvent(new w.ErrorEvent("error", {message: "loi thu nghiem", filename: "http://x/a.js", lineno: 7}));
  $("bBaoLoi").click(); await sleep(30);
  ok($("dlgLoi").open && /v\d+\.\d/.test($("loiCT").textContent) && /loi thu nghiem \(a\.js:7\)/.test($("loiCT").textContent) && /manifest phiên bản/.test($("loiCT").textContent),
     "hộp báo lỗi: thông tin kỹ thuật có phiên bản, manifest, lỗi JavaScript gần đây");
  $("loiMoTa").value = "Bảng chọn vùng không hiện\nchi tiết thêm"; $("loiLienHe").value = "nguoi@vi.du";
  const mail = E("guiEmail()");
  ok(/^mailto:baoloi@example\.org\?subject=/.test(mail) && decodeURIComponent(mail).includes(`[Geoportal HP v${E("VERSION")}] Bảng chọn vùng không hiện`) &&
     decodeURIComponent(mail).includes("liên hệ: nguoi@vi.du") && mail.length < 2000, `gửi email: đúng địa chỉ, tiêu đề, nội dung gọn (${mail.length} ký tự)`);
  let moRa = ""; w.open = u => { moRa = u; };
  ok(!$("loiGH").hidden, "có nút tạo issue GitHub khi cấu hình có kho"); $("loiGH").click();
  ok(/^https:\/\/github\.com\/nguoidung\/haiphong-geoportal\/issues\/new\?title=/.test(moRa) && /labels=bug/.test(moRa), "tạo issue GitHub với nội dung điền sẵn");
  E("SITE.bao_loi.email = ''"); ok(E("guiEmail()") === null && /Chép nội dung/.test($("loiTT").textContent), "chưa đặt email: hướng dẫn chép nội dung");
  $("loiDong").click();

  // ---------- ngôn ngữ: không sót chữ tiếng Việt ở phần mới
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100);
    const cb2 = $("osmDS").querySelector('input[data-cd="sdd"]'); cb2.checked = true; cb2.onchange();
    await until(() => E("OSM.lop.sdd.f.size") >= 1, 5000, "nạp lại sdd");
    $("osmMo").click(); E("osmTab('mau')"); await sleep(50); $("bBaoLoi").click(); await sleep(30);
    const sot = new Set(), wk = w.document.createTreeWalker(w.document.body, 4); let m;
    while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#msgs,#loiCT,#osmQD,#osmKQ,#osmTK,#osmChon,#osmGoiY")) continue;
      const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|E0 thử|Tiếng Việt|Làng|KCN|Mẫu OSM|name~Cát/.test(t)) sot.add(t.slice(0, 70)); }
    [...w.document.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Ngôn ngữ|: X\d|Tây|Đông|name~Cát/.test(v)) sot.add("@" + v.slice(0, 60)); }));
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở OSM, báo lỗi (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 25).join("\n      ") : ""));
    $("loiDong").click(); $("osmDong").click(); cb2.checked = false; cb2.onchange();
  }
  E("setLang('vi')"); await sleep(50);
  const loiThat = errs.filter(e => !/loi thu nghiem/.test(e));
  ok(!loiThat.length, loiJS(loiThat));
  xong();
})().catch(e => { console.log("  LỖI ngoại lệ:", e.stack || e); process.exit(1); });
