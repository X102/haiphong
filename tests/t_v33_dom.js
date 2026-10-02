// Bản 3.3: ranh giới toàn thế giới (Nominatim + Overpass giả, đúng định dạng thật): tìm, đếm cấp, nạp cấp làm ranh giới xã,
// tìm trên bản đồ có dòng "toàn thế giới", gộp vùng với đơn vị thế giới; đồ thị theo năm không đọc các bản đồ lớp ngoài vùng dữ liệu.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
(async () => {
  const {w, $, E, sleep, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest");
  ok(E("VERSION") >= "3.3", "bản " + E("VERSION"));
  await until(() => !$("vnW").hidden && E("V27.tinh === '31' && VG.xa && VG.xa.length === 2"), 6000, "hành chính");
  // vùng thử: hộp 0.2° × 0.1°, hai đơn vị con bên trong và một đơn vị láng giềng bên ngoài
  E(`window.HOP = (w, s, e, n) => [[w, s], [e, s], [e, n], [w, n], [w, s]];
     window.REQ = []; window.F0 = window.fetch;
     const relGeom = (id, ten, lv, ring) => ({type: "relation", id, tags: {boundary: "administrative", admin_level: String(lv), name: ten, type: "boundary"},
       bounds: {minlon: ring[0][0], minlat: ring[0][1], maxlon: ring[2][0], maxlat: ring[2][1]},
       members: [{type: "way", ref: id * 10, role: "outer", geometry: ring.map(q => ({lon: q[0], lat: q[1]}))}]});
     const A = HOP(30.0, 50.0, 30.1, 50.05), B = HOP(30.1, 50.0, 30.2, 50.05), X = HOP(30.3, 50.0, 30.4, 50.05);
     window.fetch = async (u, o) => {
       u = String(u);
       if (/nominatim/.test(u)) { REQ.push(u); return {ok: true, json: async () => [
         {display_name: "Thành phố Thử, Vùng Thử, Nước Thử", name: "Thành phố Thử", addresstype: "city", osm_type: "relation", osm_id: 77, place_rank: 16,
          boundingbox: ["50.0", "50.05", "30.0", "30.2"], geojson: {type: "Polygon", coordinates: [HOP(30.0, 50.0, 30.2, 50.05)]}},
         {display_name: "Điểm Thử, Nước Thử", name: "Điểm Thử", addresstype: "village", osm_type: "node", osm_id: 5, place_rank: 19, boundingbox: ["50", "50.01", "30", "30.01"], geojson: {type: "Point", coordinates: [30, 50]}}]}; }
       if (/interpreter/.test(u)) { const q = decodeURIComponent(o.body.slice(5)); REQ.push(q);
         if (/out tags bb/.test(q)) return {ok: true, json: async () => ({elements: [{type: "relation", id: 77, tags: {admin_level: "6", name: "Thành phố Thử"}},
           relGeom(1, "Quận Một", 8, A), relGeom(2, "Quận Hai", 8, B), relGeom(3, "Quận Láng Giềng", 8, X), {type: "relation", id: 9, tags: {admin_level: "4", name: "Vùng Thử"}}]})};
         if (/out geom/.test(q)) return {ok: true, json: async () => ({elements: [relGeom(1, "Quận Một", 8, A), relGeom(2, "Quận Hai", 8, B), relGeom(3, "Quận Láng Giềng", 8, X)]})};
       }
       return F0(u, o);
     };`);
  $("thgW").open = true; $("thgTim").value = "Thành phố Thử"; $("thgTimB").click();
  await until(() => $("thgKQ").querySelectorAll("button").length === 2, 4000, "kết quả Nominatim");
  ok(/polygon_geojson=1/.test(E("REQ[0]")) && /accept-language=vi/.test(E("REQ[0]")), "Nominatim: có ranh giới, đúng ngôn ngữ trang");
  $("thgKQ").querySelector("button").click();
  await until(() => $("thgCap").querySelectorAll("button").length >= 1, 4000, "các cấp");
  const cap = [...$("thgCap").querySelectorAll("button")].map(b => b.textContent);
  ok(cap.length === 1 && /cấp 8 · 2/.test(cap[0]) && E("map.hasLayer(THG.lop)"), "đếm cấp: chỉ cấp sâu hơn nơi cha (6), bỏ đơn vị láng giềng nằm ngoài: " + cap.join(" | "));
  $("thgCap").querySelector("button").click();
  await until(() => E("THG.dangDung"), 4000, "nạp cấp");
  ok(E("VG.xa.map(x => x.ten).sort().join()") === "Quận Hai,Quận Một" && E("THG.ma") === "wr77" && $("cVnXa").checked, "nạp cấp 8: 2 quận thay ranh giới xã, bật hiện ranh giới");
  ok(E("v27TinhTen()") === "Thành phố Thử" && E("v27PhamVi('tinh').mp.length") === 2, "phạm vi 'cả tỉnh đang chọn' là cả thành phố vừa nạp");
  // gộp vùng với đơn vị thế giới
  E(`XG.chon = []; xgMo(true)`); $("xgDan").value = "Quận Một\nQuận Hai"; $("xgKhop").click();
  await until(() => E("XG.chon.length") === 2, 3000, "khớp tên thế giới");
  ok(E("XG.chon.every(c => c.tinh === 'wr77')"), "gộp vùng: dán tên quận khớp với các đơn vị thế giới đã nạp");
  E(`xgMo(false)`);
  // ô tìm trên bản đồ
  E(`$("xaTimB").onclick()`); await sleep(30); $("xaTim").value = "Hai"; $("xaTim").oninput(); await sleep(30);
  const li = [...$("xaGoiY").querySelectorAll("li")].map(l => l.textContent);
  ok(li[0] === "Quận Hai" && /tìm “Hai” trên toàn thế giới/.test(li[li.length - 1]), "ô tìm trên bản đồ: đơn vị đã nạp trước, dòng tìm toàn thế giới cuối: " + li.join(" | "));
  E(`xaChonTim(XT.ds[XT.ds.length - 1])`); await until(() => /Thành phố Thử/.test($("xaGoiY").textContent), 4000, "kết quả thế giới trong ô tìm");
  ok(/🌍 Thành phố Thử/.test($("xaGoiY").textContent), "chọn dòng toàn thế giới: hiện kết quả Nominatim ngay trong ô tìm");
  // lopAt: điểm ngoài vùng dữ liệu không mở mọi năm của các bản đồ lớp
  E(`window.SO_PX = 0; const _p = pxAt; pxAt = function () { SO_PX++; return _p.apply(this, arguments); }`);
  await E(`lopAt(CORE.newPoint("⌖", 30.05, 50.02, {bo: ""}))`);
  ok(E("SO_PX") === 0, "dải bản đồ lớp dưới đồ thị: điểm ngoài vùng dữ liệu không đọc ảnh nào (" + E("SO_PX") + ")");
  // về lại Việt Nam
  await E(`v27ChonTinh("31", false)`);
  ok(!E("THG.dangDung") && E("VG.xa.length") === 2 && E("v27TinhTen()") === "Tinh Thu A", "chọn lại tỉnh Việt Nam: thôi dùng đơn vị thế giới");
  E("setLang('ru')"); await sleep(40);
  ok(/Границы всего мира/.test($("thgW").textContent), "tiếng Nga: mục ranh giới thế giới");
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
