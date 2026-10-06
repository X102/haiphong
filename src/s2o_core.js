/* =============================== BẢN 3.1: LÕI SENTINEL-2 TRỰC TUYẾN (AWS) =============================== */
/* Tìm cảnh Sentinel-2 L2A trên Element 84 Earth Search (STAC, không cần tài khoản), chấm điểm từng cảnh theo tỉ lệ điểm ảnh
   quang đãng TRONG phạm vi (lớp SCL ở overview, đọc rất ít), chọn tham lam các cảnh để mỗi ô của phạm vi có đủ số lần quan sát
   quang đãng, rồi ghép ảnh trung vị ngay trong trình duyệt từ COG công khai trên AWS (đọc theo đoạn HTTP Range).
   Phản xạ = DN × scale + offset theo raster:bands của từng cảnh (offset −0.1 cho baseline 04.00 trở đi), nên các năm trước và sau
   01/2022 cùng thang. Chỉ phụ thuộc fetch, GeoTIFF (geotiff.js), proj4: chạy được ngoài trang để thử trên dữ liệu thật. */
var S2OC = (function () {
  var API = "https://earth-search.aws.element84.com/v1/search";
  var TAI = {blue: "B2", green: "B3", red: "B4", rededge1: "B5", rededge2: "B6", rededge3: "B7", nir: "B8", nir08: "B8A",
             swir16: "B11", swir22: "B12", scl: "SCL", visual: "TCI"};
  var BANG = ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"];
  var TRONG = {4: 1, 5: 1, 6: 1, 7: 1, 11: 1};          // SCL quang đãng: thực vật, không thực vật, nước, chưa phân loại, tuyết
  var R = 6378137;
  /* bản 3.4: ba nguồn. Landsat C2 L2 và Sentinel-1 RTC lấy từ Microsoft Planetary Computer (STAC công khai, ảnh COG đọc được từ
     trình duyệt bằng "vé" SAS miễn phí theo bộ dữ liệu, hết hạn sau chưa tới 1 giờ nên tự xin lại); Earth Search để ảnh Landsat,
     Sentinel-1 trong kho AWS trả phí theo người tải nên trình duyệt không đọc được. Tên băng Landsat quy về tên S2 tương ứng để dùng
     chung các chỉ số (B2 lam, B3 lục, B4 đỏ, B8 NIR, B11, B12 SWIR; không có B5, B6, B7, B8A). "SCL" là băng mặt nạ của mỗi nguồn. */
  var PC = "https://planetarycomputer.microsoft.com/api";
  var NGUON = {
    s2: {api: API, coll: function (o) { return o.bo || "sentinel-2-l2a"; }, tai: TAI, bang: BANG, nam0: 2017, may: true, tci: true},
    ls: {api: PC + "/stac/v1/search", coll: function () { return "landsat-c2-l2"; }, ky: true, nam0: 1984, may: true,
         tai: {blue: "B2", green: "B3", red: "B4", nir08: "B8", swir16: "B11", swir22: "B12", qa_pixel: "SCL"}, bang: ["B2", "B3", "B4", "B8", "B11", "B12"]},
    s1: {api: PC + "/stac/v1/search", coll: function () { return "sentinel-1-rtc"; }, ky: true, nam0: 2015, may: false,
         tai: {vv: "VV", vh: "VH"}, bang: ["VV", "VH"]}};
  var VE = {};                                          // vé SAS theo bộ dữ liệu: {token, het (ms)}
  async function kyPC(coll, ep) {
    var v = VE[coll]; if (v && !ep && v.het - Date.now() > 10 * 60e3) return v.token;
    var r = await fetch(PC + "/sas/v1/token/" + coll); if (!r.ok) throw new Error("SAS " + r.status);
    var j = await r.json(); VE[coll] = {token: j.token, het: Date.parse(j["msft:expiry"]) || Date.now() + 30 * 60e3}; return j.token;
  }
  function quang(ng, v) {                               // giá trị băng mặt nạ -> quang đãng?
    if (ng === "ls") return v > 0 && (v & 31) === 0;   // QA_PIXEL: bit 0 không dữ liệu, 1 mây giãn, 2 ti, 3 mây, 4 bóng mây
    if (ng === "s1") return v > 0;                     // radar: có dữ liệu là dùng được
    return !!TRONG[v];
  }
  function nguonCua(sc) { return sc.ng || "s2"; }
  /* bản 3.4.1: Fmask (QA_PIXEL) bỏ sót mây mỏng, mây nhỏ khá thường gặp ở Landsat 5, 7 vùng nhiệt đới; thêm phép thử độ sáng:
     phản xạ lam (B2) > 0.25 thì coi là mây (mặt đất, nước, thực vật, mái nhà hầu như đều dưới mức này; mây thì trên 0.3). */
  var SANG = 2500;
  function canThem(sc) { return nguonCua(sc) === "ls" ? ["B2"] : []; }
  function sangMay(sc, dn) { return nguonCua(sc) === "ls" && dn > 0 && (dn * sc.s + sc.o) * 10000 > SANG; }
  function quangDiem(sc, scl, v) { return quang(nguonCua(sc), scl) && !(nguonCua(sc) === "ls" && v && v.B2 > SANG); }
  async function chuanBi(ds) {                          // có vé SAS còn hạn cho mọi cảnh Planetary Computer trước khi đọc
    var cs = {}; (ds || []).forEach(function (sc) { if (sc && sc.ky) cs[sc.ky] = 1; });
    await Promise.all(Object.keys(cs).map(function (c) { return kyPC(c); }));
  }
  function m2ll(x, y) { return [x / R * 180 / Math.PI, (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI]; }
  function ll2m(lon, lat) { return [lon * Math.PI / 180 * R, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * R]; }
  function projUTM(epsg) {
    var z = epsg % 100, nam = epsg >= 32701;
    return "+proj=utm +zone=" + z + (nam ? " +south" : "") + " +datum=WGS84 +units=m +no_defs";
  }
  function epsgCua(p) {                                 // proj:epsg (STAC proj v1) hoặc proj:code (v2) hoặc từ ô MGRS
    if (p["proj:epsg"]) return +p["proj:epsg"];
    var c = /EPSG:(\d+)/.exec(p["proj:code"] || ""); if (c) return +c[1];
    var g = /MGRS-(\d{1,2})([C-X])/.exec(p["grid:code"] || ""); if (g) return (g[2] >= "N" ? 32600 : 32700) + (+g[1]);
    return 0;
  }
  function cuaSo(y, thang) {                            // năm y = từ tháng t1 (năm y − 1 nếu t1 > t2) đến hết tháng t2 năm y
    var t1 = +thang[0], t2 = +thang[1], y0 = t1 > t2 ? y - 1 : y, cuoi = new Date(Date.UTC(y, t2, 0)).getUTCDate();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return y0 + "-" + p(t1) + "-01T00:00:00Z/" + y + "-" + p(t2) + "-" + p(cuoi) + "T23:59:59Z";
  }
  function thuGon(item, ng) {                           // bản ghi gọn của một cảnh: thư mục chung + tên tệp từng băng
    ng = NGUON[ng] ? ng : "s2"; var TA = NGUON[ng].tai;
    var p = item.properties || {}, a = item.assets || {}, f = {}, hr = [];
    Object.keys(TA).forEach(function (k) { if (a[k] && a[k].href && /^https?:/.test(a[k].href)) { f[TA[k]] = a[k].href; hr.push(a[k].href); } });
    var dir = hr.length ? hr[0].slice(0, hr[0].lastIndexOf("/") + 1) : "";
    hr.forEach(function (h) { while (dir && h.indexOf(dir) !== 0) dir = dir.slice(0, dir.slice(0, -1).lastIndexOf("/") + 1); });
    Object.keys(f).forEach(function (b) { f[b] = f[b].slice(dir.length); });
    if (ng === "s1" && f.VV != null) f.SCL = f.VV;          // radar: băng VV làm mặt nạ (có dữ liệu hay không)
    var rb = ng === "s1" ? {scale: 1, offset: 0} : (a.red && a.red["raster:bands"] && a.red["raster:bands"][0]) || {};
    /* earthsearch:boa_offset_applied = true: COG đã trừ sẵn offset (DN = phản xạ × 10000) dù raster:bands vẫn ghi −0.1 (đã kiểm
       trên ảnh thật 48QWJ 12/02/2024: DN rừng ~480 ở sentinel-2-l2a, ~1460 ở sentinel-2-c1-l2a cùng cảnh); không có cờ: theo raster:bands */
    var ap = p["earthsearch:boa_offset_applied"] === true;
    return {id: item.id, ngay: String(p.datetime || "").slice(0, 10), may: p["eo:cloud_cover"] != null ? Math.round(p["eo:cloud_cover"] * 10) / 10 : null,
            epsg: epsgCua(p), bb: Array.isArray(item.bbox) && item.bbox.length === 4 ? item.bbox.map(function (v) { return Math.round(v * 1e5) / 1e5; }) : null, o_mgrs: ng === "ls" ? "WRS" + (p["landsat:wrs_path"] || "") + "/" + (p["landsat:wrs_row"] || "") : ng === "s1" ? String(item.id) : String(p["grid:code"] || "").replace("MGRS-", ""), dir: dir, f: f,
            ng: ng, nen: p.platform || "", quy: p["sat:orbit_state"] || "", ky: NGUON[ng].ky ? NGUON[ng].coll({}) : null,
            s: rb.scale != null ? rb.scale : 0.0001, o: ap ? 0 : (rb.offset != null ? rb.offset : 0)};
  }
  function url(sc, b) {
    var f = sc.f[b]; if (f == null) return null;
    var u = /^https?:/.test(f) ? f : sc.dir + f;
    if (sc.ky) { var v = VE[sc.ky]; if (!v || v.het - Date.now() < 10 * 60e3) kyPC(sc.ky, true).catch(function () {}); if (v) u += (u.indexOf("?") < 0 ? "?" : "&") + v.token; }
    return u;
  }
  async function tim(opt) {                            // opt: {nguon, bo, bbox [w,s,e,n], datetime, may, gioi_han, api, boL7}
    var ng = opt.nguon || "s2", N = NGUON[ng];
    if (ng !== "s2") return timPC(opt, ng, N);
    var body = {collections: [opt.bo || "sentinel-2-l2a"], bbox: opt.bbox, datetime: opt.datetime, limit: opt.gioi_han || 100,
                query: {"eo:cloud_cover": {lte: opt.may != null ? +opt.may : 60}}, sortby: [{field: "properties.eo:cloud_cover", direction: "asc"}],
                fields: {include: ["id", "bbox", "properties.datetime", "properties.eo:cloud_cover", "properties.proj:epsg", "properties.proj:code", "properties.grid:code", "properties.earthsearch:boa_offset_applied",
                                   "assets.red.raster:bands"].concat(Object.keys(TAI).map(function (k) { return "assets." + k + ".href"; }))}};
    var r = await fetch(opt.api || API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
    if (!r.ok) throw new Error("STAC " + r.status);
    var j = await r.json(), ds = (j.features || []).map(function (it) { return thuGon(it, "s2"); }).filter(function (s) { return s.epsg && s.f.B4 && s.f.SCL; });
    var gap = {};                                       // cùng ngày, cùng ô MGRS (xử lý lại nhiều lần): giữ bản ít mây nhất
    ds.forEach(function (s) { var k = s.ngay + "|" + (s.o_mgrs || s.epsg); if (!gap[k] || (s.may || 0) < (gap[k].may || 0)) gap[k] = s; });
    return Object.keys(gap).map(function (k) { return gap[k]; }).sort(function (a, b) { return (a.may || 0) - (b.may || 0); });
  }
  async function timPC(opt, ng, N) {                    // Planetary Computer: Landsat (lọc mây cả cảnh), Sentinel-1 (không có mây)
    var coll = N.coll(opt); await kyPC(coll);
    var body = {collections: [coll], bbox: opt.bbox, datetime: opt.datetime, limit: opt.gioi_han || 100};
    if (N.may) { body.query = {"eo:cloud_cover": {lte: opt.may != null ? +opt.may : 60}}; body.sortby = [{field: "eo:cloud_cover", direction: "asc"}]; }
    var r = await fetch(opt.api || N.api, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
    if (!r.ok) throw new Error("STAC " + r.status);
    var ds = ((await r.json()).features || []).map(function (it) { return thuGon(it, ng); }).filter(function (s) {
      if (!s.epsg || !s.f.SCL) return false;
      if (ng === "ls" && !s.f.B4) return false;
      if (ng === "ls" && opt.boL7 !== false && /landsat-7/.test(s.nen) && s.ngay > "2003-05-31") return false;     // Landsat 7 sau hỏng SLC: sọc mất dữ liệu
      return true; });
    var gap = {};
    ds.forEach(function (s) { var k = s.ngay + "|" + s.o_mgrs; if (!gap[k] || (s.may || 0) < (gap[k].may || 0)) gap[k] = s; });
    return Object.keys(gap).map(function (k) { return gap[k]; }).sort(function (a, b) { return (a.may || 0) - (b.may || 0) || (a.ngay < b.ngay ? -1 : 1); });
  }
  /* ---------- đọc COG ---------- */
  var MO = new Map(), DUNG = [];
  function tiff(u, nho) {                               // mở COG một lần, bỏ tệp dùng lâu nhất; nho: kho riêng cho đọc tại điểm (nhiều tệp, bộ đệm nhỏ)
    if (nho) return tiffNho(u);
    if (!MO.has(u)) {
      var pr = GeoTIFF.fromUrl(u, {allowFullFile: false, cacheSize: 96}).then(function (t) {
        return t.getImage().then(async function (im0) {
          var bb = im0.getBoundingBox(), n = await t.getImageCount(), L1 = [];
          for (var i = 0; i < n; i++) {
            var im = i ? await t.getImage(i) : im0, fd = im.fileDirectory;
            if (i && !((fd.NewSubfileType || 0) & 1)) continue;
            L1.push({im: im, w: im.getWidth(), h: im.getHeight(), rx: (bb[2] - bb[0]) / im.getWidth(), ry: (bb[3] - bb[1]) / im.getHeight()});
          }
          L1.sort(function (a, b) { return a.rx - b.rx; });
          t._bb = bb; t._imgs = L1; t._n = im0.getSamplesPerPixel(); return t;
        });
      });
      pr.catch(function () { MO.delete(u); });
      MO.set(u, pr);
    }
    DUNG = DUNG.filter(function (x) { return x !== u; }); DUNG.push(u);
    while (DUNG.length > 40) MO.delete(DUNG.shift());
    return MO.get(u);
  }
  var MO2 = new Map();                                  // bản 3.3: đọc tại điểm giữ tới 160 tệp, mỗi tệp đệm 32 khối (2 MB): chuyển điểm không phải mở lại tệp
  function tiffNho(u) {
    if (MO2.has(u)) { var p0 = MO2.get(u); MO2.delete(u); MO2.set(u, p0); return p0; }
    while (MO2.size >= 160) MO2.delete(MO2.keys().next().value);
    var pr = GeoTIFF.fromUrl(u, {allowFullFile: false, cacheSize: 32}).then(function (t) {
      return t.getImage().then(async function (im0) {
        var bb = im0.getBoundingBox(), n = await t.getImageCount(), L1 = [];
        for (var i = 0; i < n; i++) { var im = i ? await t.getImage(i) : im0, fd = im.fileDirectory; if (i && !((fd.NewSubfileType || 0) & 1)) continue;
          L1.push({im: im, w: im.getWidth(), h: im.getHeight(), rx: (bb[2] - bb[0]) / im.getWidth(), ry: (bb[3] - bb[1]) / im.getHeight()}); }
        L1.sort(function (a, b) { return a.rx - b.rx; }); t._bb = bb; t._imgs = L1; t._n = im0.getSamplesPerPixel(); return t;
      });
    });
    pr.catch(function () { MO2.delete(u); }); MO2.set(u, pr); return pr;
  }
  function chonAnh(list, want) { var use = list[0]; for (var i = 1; i < list.length; i++) if (list[i].rx <= want * 1.0001) use = list[i]; return use; }
  async function docCuaSo(I, win, samples) {            // đọc theo dải hàng ô khi cửa sổ lớn (tránh lỗi bộ đệm của geotiff.js)
    var W = win[2] - win[0], H = win[3] - win[1], nb = samples.length;
    if (W * H * nb > 40e6) throw new Error("vùng đọc quá lớn: phóng to thêm");
    var th = (I.im.getTileHeight && I.im.getTileHeight()) || 256;
    if (W * H <= 4e6) return I.im.readRasters({window: win, samples: samples, interleave: true});
    var out = null;
    for (var r = win[1]; r < win[3]; r += th) {
      var rr = Math.min(win[3], r + th), a = await I.im.readRasters({window: [win[0], r, win[2], rr], samples: samples, interleave: true});
      if (!out) out = new a.constructor(W * H * nb);
      out.set(a, (r - win[1]) * W * nb);
    }
    return out;
  }
  function toaDo(epsg, pts) {                           // [[lon, lat]] -> toạ độ của cảnh
    var d = projUTM(epsg); return pts.map(function (q) { return proj4("EPSG:4326", d, q); });
  }
  function luoiAnh(epsg, bb, w, h) {                    // toạ độ cảnh của tâm từng điểm ảnh đích (song tuyến từ 4 góc của ô 3857)
    var c = toaDo(epsg, [m2ll(bb[0], bb[3]), m2ll(bb[2], bb[3]), m2ll(bb[0], bb[1]), m2ll(bb[2], bb[1])]);
    var X = new Float64Array(w * h), Y = new Float64Array(w * h);
    for (var j = 0; j < h; j++) { var v = (j + 0.5) / h;
      for (var i = 0; i < w; i++) { var u = (i + 0.5) / w, a = (1 - u) * (1 - v), b = u * (1 - v), cc = (1 - u) * v, d = u * v, k = j * w + i;
        X[k] = a * c[0][0] + b * c[1][0] + cc * c[2][0] + d * c[3][0]; Y[k] = a * c[0][1] + b * c[1][1] + cc * c[2][1] + d * c[3][1]; } }
    return {X: X, Y: Y, px: Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]) / w};
  }
  async function layMau(u, G, samples, nho) {           // giá trị (nearest) tại các điểm G = {X, Y, px} -> mảng (n × số băng), 0 = trống
    var t = await tiff(u, nho), I = chonAnh(t._imgs, G.px), ox = t._bb[0], oy = t._bb[3], n = G.X.length, nb = samples.length;
    var c0 = Infinity, c1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    for (var k = 0; k < n; k++) { var cx = Math.floor((G.X[k] - ox) / I.rx), ry = Math.floor((oy - G.Y[k]) / I.ry);
      if (cx < c0) c0 = cx; if (cx > c1) c1 = cx; if (ry < r0) r0 = ry; if (ry > r1) r1 = ry; }
    c0 = Math.max(0, c0); r0 = Math.max(0, r0); c1 = Math.min(I.w - 1, c1); r1 = Math.min(I.h - 1, r1);
    var out = new Float32Array(n * nb);
    if (c1 < c0 || r1 < r0) return out;
    var a = await docCuaSo(I, [c0, r0, c1 + 1, r1 + 1], samples), sw = c1 - c0 + 1;
    for (k = 0; k < n; k++) { var col = Math.floor((G.X[k] - ox) / I.rx) - c0, row = Math.floor((oy - G.Y[k]) / I.ry) - r0;
      if (col < 0 || row < 0 || col >= sw || row > r1 - r0) continue;
      for (var q = 0; q < nb; q++) out[k * nb + q] = a[(row * sw + col) * nb + q]; }
    return out;
  }
  /* ---------- chấm điểm cảnh theo phạm vi, chọn cảnh ---------- */
  function luoiPhamVi(bl, mp, n) {                      // tâm các ô (lon, lat) của phạm vi, chỉ ô nằm trong đa giác nếu có
    n = n || 48; var pts = [];
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var lon = bl[0] + (i + 0.5) / n * (bl[2] - bl[0]), lat = bl[3] - (j + 0.5) / n * (bl[3] - bl[1]);
      if (!mp || trongDaGiac(lon, lat, mp)) pts.push([lon, lat]);
    }
    var o = (bl[2] - bl[0]) * 111320 * Math.cos((bl[1] + bl[3]) / 2 * Math.PI / 180) / n;
    return {pts: pts, o: o};
  }
  function trongDaGiac(lon, lat, mp) {
    var tr = false;
    mp.forEach(function (pg) { pg.forEach(function (r) {
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) { var a = r[i], b = r[j];
        if ((a[1] > lat) !== (b[1] > lat) && lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) tr = !tr; } }); });
    return tr;
  }
  async function matNa(sc, luoi) {                      // 0 ngoài cảnh, 1 mây, bóng mây, bão hoà..., 2 quang đãng (theo SCL)
    await chuanBi([sc]);
    var c = toaDo(sc.epsg, luoi.pts), G = {X: Float64Array.from(c, function (q) { return q[0]; }), Y: Float64Array.from(c, function (q) { return q[1]; }), px: Math.max(20, luoi.o / 2)};
    var v = await layMau(url(sc, "SCL"), G, [0]), m = new Uint8Array(v.length);
    var lam = canThem(sc).length && url(sc, "B2") ? await layMau(url(sc, "B2"), G, [0]) : null;
    for (var k = 0; k < v.length; k++) m[k] = !(v[k] > 0) ? 0 : quang(nguonCua(sc), v[k]) && !(lam && sangMay(sc, lam[k])) ? 2 : 1;
    return m;
  }
  function chon(ds, N, tran) {                          // ds: [{m}] -> chỉ số cảnh chọn: mỗi ô tới N lần quang đãng, tối đa `tran` cảnh
    var n = ds.length ? ds[0].m.length : 0, dem = new Uint8Array(n), kq = [];
    while (kq.length < tran) {
      var tot = -1, lai = 0;
      ds.forEach(function (s, i) { if (kq.indexOf(i) >= 0) return; var g = 0; for (var k = 0; k < n; k++) if (s.m[k] === 2 && dem[k] < N) g++; if (g > lai) { lai = g; tot = i; } });
      if (tot < 0 || lai < Math.max(1, 0.01 * n)) break;
      kq.push(tot); for (var k = 0; k < n; k++) if (ds[tot].m[k] === 2) dem[k]++;
    }
    var phu = 0, tb = 0; for (var k2 = 0; k2 < n; k2++) { if (dem[k2]) phu++; tb += dem[k2]; }
    return {chon: kq, phu: n ? phu / n : 0, tb: n ? tb / n : 0};
  }
  /* ---------- ghép ảnh ---------- */
  function trungVi(a, n) { if (!n) return NaN; var b = a.slice(0, n).sort(function (x, y) { return x - y; }); return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  /* cảnh ds, các băng `bang` (tên S2 hoặc "TCI") trên lưới đích bb 3857 × w × h. Trả về Float32Array (w·h·số băng): phản xạ × 10000
     (TCI: 0..255), NaN = không có. che: chỉ lấy điểm ảnh quang đãng theo SCL. */
  /* bản 3.6: có che mây thì đọc lớp mặt nạ (SCL, QA_PIXEL: rẻ) của mọi cảnh trước, rồi chỉ đọc băng của những cảnh còn góp điểm ảnh
     quang đãng cho khung đang vẽ: đi theo thứ tự cảnh (quang đãng nhất trước), bỏ cảnh không có điểm ảnh quang đãng nào ở khung, hoặc
     chỉ góp cho các điểm ảnh đã đủ `du` lần quang đãng. Đo ở Hải Phòng 01-04/2024: 3/6 cảnh đã chọn hoàn toàn mây ở một ô bản đồ
     mức 14, trước vẫn đọc 3 băng của chúng. Trung vị không đổi ở những điểm ảnh còn thiếu lần quang đãng. */
  async function ghep(ds, bang, bb, w, h, che, du) {
    var tci = bang.length === 1 && bang[0] === "TCI", nb = tci ? 3 : bang.length, n = w * h, luoi = {};
    var Gc = function (sc) { return luoi[sc.epsg] || (luoi[sc.epsg] = luoiAnh(sc.epsg, bb, w, h)); };
    await chuanBi(ds);
    var scls = che ? await Promise.all(ds.map(function (sc) { return layMau(url(sc, "SCL"), Gc(sc), [0]); })) : null;
    var giu = ds.map(function (_, i) { return i; });
    if (che && ds.length > 1) {
      du = du || 3; var dem = new Uint8Array(n), nho = Math.max(1, Math.floor(0.002 * n)); giu = [];
      ds.forEach(function (sc, s) {
        var g = 0, sv = scls[s], ng = nguonCua(sc);
        for (var k = 0; k < n; k++) if (dem[k] < du && quang(ng, sv[k])) g++;
        if (g < nho) return;
        giu.push(s); for (var k2 = 0; k2 < n; k2++) if (quang(ng, sv[k2])) dem[k2]++;
      });
      if (!giu.length) giu = [0];
    }
    var K = giu.length, gom = new Float32Array(K * n * nb).fill(NaN);
    await Promise.all(giu.map(async function (si, s) {
      var sc = ds[si], G = Gc(sc), scl = scls ? scls[si] : null;
      var lay = tci ? [layMau(url(sc, "TCI"), G, [0, 1, 2])] : bang.map(function (b) { return url(sc, b) ? layMau(url(sc, b), G, [0]) : Promise.resolve(null); });
      var vs = await Promise.all(lay);
      var iL = bang.indexOf("B2"), lam = che && canThem(sc).length ? (iL >= 0 ? vs[iL] : url(sc, "B2") ? await layMau(url(sc, "B2"), G, [0]) : null) : null;
      for (var k = 0; k < n; k++) {
        if (scl && !quang(nguonCua(sc), scl[k])) continue;
        if (lam && sangMay(sc, lam[k])) continue;
        for (var q = 0; q < nb; q++) {
          var v = tci ? vs[0][k * 3 + q] : (vs[q] ? vs[q][k] : 0); if (!(v > 0)) continue;           // 0, −32768 (S1), NaN: không có dữ liệu
          gom[(s * n + k) * nb + q] = tci ? v : (v * sc.s + sc.o) * 10000;
        }
      }
    }));
    ghep.lanCuoi = {canh: ds.length, doc: K};
    var out = new Float32Array(n * nb).fill(NaN), buf = new Float64Array(K);
    for (var k = 0; k < n; k++) for (var q = 0; q < nb; q++) {
      var c = 0; for (var s = 0; s < K; s++) { var v = gom[(s * n + k) * nb + q]; if (v === v) buf[c++] = v; }
      if (c) out[k * nb + q] = trungVi(buf, c);
    }
    return out;
  }
  async function trongTaiDiem(sc, lon, lat) {           // cảnh có quang đãng tại điểm không (SCL)
    var m = await matNa(sc, {pts: [[lon, lat]], o: 40}); return m[0] === 2;
  }
  return {API: API, TAI: TAI, BANG: BANG, TRONG: TRONG, NGUON: NGUON, kyPC: kyPC, quang: quang, VE: VE, chuanBi: chuanBi, nguonCua: nguonCua, canThem: canThem, quangDiem: quangDiem, SANG: SANG, m2ll: m2ll, ll2m: ll2m, projUTM: projUTM, epsgCua: epsgCua, cuaSo: cuaSo,
          thuGon: thuGon, url: url, tim: tim, tiff: tiff, luoiAnh: luoiAnh, layMau: layMau, luoiPhamVi: luoiPhamVi, trongDaGiac: trongDaGiac,
          matNa: matNa, chon: chon, trungVi: trungVi, ghep: ghep, trongTaiDiem: trongTaiDiem};
})();
