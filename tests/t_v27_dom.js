// Bản 2.7: ảnh nền Google, OSM, nhãn; dải ảnh theo năm từ EOX s2cloudless, Esri Wayback (kể cả khi điểm ngoài vùng dữ liệu);
// hành chính Việt Nam (chọn tỉnh, tìm xã toàn quốc); phương án lớp phủ, thống kê, đồng thuận, nhập và xuất GeoTIFF;
// tạo bản đồ lớp phủ từ điểm mẫu với kiểm định và cảnh báo.
const fs = require("fs");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const R27 = require("/tmp/fx/ref27.json");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION") >= "2.7", "bản 2.7");
  const docAB = b => new Promise(res => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.readAsArrayBuffer(b); });

  // ---------- ảnh nền, nhãn
  $("selBase").value = "gs"; $("selBase").onchange(); await sleep(50);
  ok(/lyrs=s&/.test(E("base._url")) && /hl=vi/.test(E("base._url")) && $("selRel").parentElement.hidden && /Google/.test($("relnote").textContent), "Google vệ tinh: đúng lớp, nhãn tiếng Việt, ẩn chọn bản Wayback");
  $("cNhan").checked = true; $("cNhan").onchange(); await sleep(30);
  ok(E("!!map.getPane('nhan27') && map.hasLayer(V27.nhan) && /lyrs=h/.test(V27.nhan._url)"), "lớp nhãn Google trên một ngăn riêng");
  $("selNhan").value = "esri"; $("selNhan").onchange(); await sleep(30);
  ok(/World_Boundaries_and_Places/.test(E("V27.nhan._url")) && JSON.parse(w.localStorage.getItem("laymau_hp_nhan_v1")).ng === "esri", "đổi nguồn nhãn sang Esri, nhớ lựa chọn");
  E("setLang('ru')"); await sleep(50);
  ok(/hl=ru/.test(E("base._url")), "đổi ngôn ngữ: nhãn Google theo tiếng Nga");
  E("setLang('vi')");
  $("selBase").value = "osm"; $("selBase").onchange(); await sleep(20);
  ok(/tile\.openstreetmap\.org/.test(E("base._url")), "OpenStreetMap");
  $("selBase").value = "auto"; $("selBase").onchange(); await sleep(20);
  ok(E("base instanceof WaybackLayer") && !$("selRel").parentElement.hidden, "trở lại Wayback theo năm");
  $("cNhan").checked = false; $("cNhan").onchange();

  // ---------- dải ảnh theo năm: EOX, Wayback, tự chuyển khi ngoài vùng
  E(`window.URLS = []; v27Tai = async src => { URLS.push(src); const c = document.createElement("canvas"); c.width = c.height = 256; return {im: c, sach: true}; };
     timCha = async (rel, c) => ({r: 99999, o: oCha(c, 0), k: 0});`);
  ok([...$("selStrip").options].some(o => o.value === "eox") && [...$("selStrip").options].some(o => o.value === "wb"), "dải ảnh có nguồn EOX và Wayback");
  E("select('E0001', false)"); $("selStrip").value = "eox"; $("selStrip").onchange(); await sleep(400);
  const p1 = E("ST.diem.E0001"), mx = E(`CORE.to3857(${p1.lon}, ${p1.lat})`), W3 = 20037508.342789244, ts = 2 * W3 / (1 << 14);
  const u1 = E("URLS"), tx = Math.floor((mx[0] + W3) / ts), ty = Math.floor((W3 - mx[1]) / ts);
  ok($("strip").querySelectorAll("canvas").length === 10 && u1.some(u => u === `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/14/${ty}/${tx}.jpg`) &&
     u1.some(u => /s2cloudless_3857\//.test(u)) && /Sentinel-2 cloudless/.test($("stripmsg").textContent), `EOX: 10 năm 2016-2025, ô mức 14 phủ điểm (${u1.length} ô)`);
  E("URLS = []"); $("selStrip").value = "wb"; $("selStrip").onchange(); await sleep(400);
  const u2 = E("URLS");
  ok(u2.length > 0 && u2.every(u => /\/tile\/99999\/14\//.test(u)) && /20\d\d · \d\d-\d\d-\d\d/.test($("strip").querySelector(".lb").textContent), "Wayback: ô của bản phát hành theo năm, nhãn ghi ngày phát hành");
  E("URLS = []"); $("selStrip").value = "s2d"; $("selStrip").onchange();
  E("traDat(L.latLng(21.03, 105.85), true)"); await until(() => /ngoài vùng/.test($("stripmsg").textContent), 5000, "tự chuyển EOX");
  await sleep(200);
  ok(E("URLS").some(u => /s2cloudless/.test(u)) && E("PROBE") && gan(E("PROBE.lon"), 105.85, 1e-3), "điểm ngoài vùng có dữ liệu (Hà Nội): dải ảnh tự dùng EOX");
  E("traBo()"); E("select('E0001', false)"); await sleep(300);
  ok(!/ngoài vùng/.test($("stripmsg").textContent) && $("strip").querySelectorAll("canvas").length >= 2 && !/EOX/.test($("stripmsg").textContent), "điểm trong vùng: dải ảnh S2 10 băng như cũ");

  // ---------- hành chính Việt Nam
  await until(() => !$("vnW").hidden && $("vnTinh").options.length === 2, 6000, "danh mục tỉnh");
  ok($("vnTinh").value === "31" && /Thu A/.test($("vnTinh").selectedOptions[0].textContent) && E("VG.xa.length") === 2, "hai tỉnh; mặc định tỉnh của bộ dữ liệu, xã từ ranh giới sẵn có");
  $("vnTinh").value = "22"; $("vnTinh").onchange(); await until(() => E("V27.tinh === '22' && VG.xa.some(x => x.ten === 'Xa Nam')"), 5000, "nạp xã tỉnh 22");
  ok(E("VG.xa.map(x => x.ten).sort().join()") === "Xa Bac,Xa Nam" && /Tinh Thu B: 2/.test($("vnTT").textContent), "chọn tỉnh B: nạp 2 xã của tỉnh đó");
  $("vnTinh").value = "31"; $("vnTinh").onchange(); await until(() => E("V27.tinh === '31' && VG.xa.length === 2 && VG.xa.some(x => x.ten === 'Tây')"), 5000, "về tỉnh A");
  $("vnTim").value = "nam"; $("vnTim").dispatchEvent(new w.Event("input")); await sleep(30);
  const bt = [...$("vnKQ").querySelectorAll("button")].find(b => /Xa Nam/.test(b.textContent));
  ok(!!bt && /Tinh Thu B/.test(bt.textContent), "tìm \"nam\" ra xã Nam của tỉnh B");
  bt.click(); await until(() => E("V27.tinh === '22'"), 5000, "bay tới xã");
  await sleep(100);
  const xN = E("VG.xa.find(x => x.ten === 'Xa Nam').bl"), c0 = E("[map.getCenter().lng, map.getCenter().lat]");
  ok(c0[0] > xN[0] && c0[0] < xN[2] && c0[1] > xN[1] && c0[1] < xN[3] && E("!!V27.sang"), "bấm kết quả: chuyển tỉnh, bay tới xã, tô sáng");
  $("cVnTinh").checked = true; $("cVnTinh").onchange(); await until(() => E("!!V27.tinhL && map.hasLayer(V27.tinhL)"), 4000, "ranh giới tỉnh");
  const gt = await E(`giaTriTai(L.latLng(${p1.lat}, ${p1.lon})).then(r => r.map(x => x[0] + ": " + x[1]).join(" | "))`);
  ok(/tỉnh, thành phố: Tinh Thu A/.test(gt), "giá trị tại điểm có tỉnh");
  $("vnTinh").value = "31"; $("vnTinh").onchange(); await until(() => E("V27.tinh === '31' && VG.xa.some(x => x.ten === 'Tây')"), 5000, "về tỉnh A");
  E("cdMo(true)"); await sleep(200); $("cdPV").value = "tinh";
  const pv = E("(() => { const P = cdPhamVi(); return {k: P.kieu, n: P.mp.length, t: P.ten}; })()");
  ok(pv.k === "tinh" && pv.n === 2 && /Thu A/.test(pv.t), "phát hiện thay đổi: phạm vi cả tỉnh đang chọn");
  E("cdMo(false)");

  // ---------- phương án, thống kê lớp phủ
  E(`map.fitBounds(L.latLngBounds(VG.xa.flatMap(x => [[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]])), {animate: false})`);
  $("bTK").click(); await sleep(300);
  const pas = [...$("tkPA").querySelectorAll("input")].map(i => i.value);
  ok(pas.includes("man:lulc_ctx") && pas.includes("man:wc") && /toàn cầu/.test($("tkPA").textContent), "phương án: bản đồ bộ dữ liệu và lớp phủ toàn cầu");
  $("tkPA").querySelectorAll("input").forEach(i => { i.checked = ["man:lulc_ctx", "man:wc"].includes(i.value); i.onchange(); });
  await sleep(30);
  ok([...$("tkNam").querySelectorAll("input")].map(i => i.value).join() === "2023,2025", "năm theo các phương án đã chọn");
  $("tkPV").value = "tinh"; $("tkPV").onchange(); $("tkCG").value = "3"; $("tkChay").click();
  await until(() => /xong/.test($("tkTT").textContent), 30000, "thống kê 3 lớp");
  const K1 = E("TK.kq.cot.map(c => ({id: c.pa.id, y: c.y, dt: c.dt, tong: c.tong, loai: c.loai}))");
  const ctx25 = K1.find(c => c.id === "man:lulc_ctx" && c.y === 2025), wc23 = K1.find(c => c.id === "man:wc" && c.y === 2023);
  ok(K1.length === 4 && [1, 2, 3].every(k => gan(ctx25.dt[k], R27.ha_lop[k], 0.03 * R27.ha_lop[k])), `diện tích 3 lớp của bản đồ CTX khớp dữ liệu gốc (${[1, 2, 3].map(k => ctx25.dt[k].toFixed(0)).join(", ")} ha)`);
  ok(gan(wc23.loai, R27.ha_60, 3), `WorldCover 2023: ô "đất trống" (${wc23.loai.toFixed(1)} ha) không quy đổi vào 3 lớp`);
  $("tkCotA").value = String(K1.findIndex(c => c.id === "man:lulc_ctx" && c.y === 2025)); $("tkCotB").value = String(K1.findIndex(c => c.id === "man:wc" && c.y === 2025)); $("tkCotA").onchange();
  ok(E("TK.dt.oa") > 0.995 && E("TK.dt.kappa") > 0.99 && /kappa/.test($("tkDT").textContent), `đồng thuận CTX và WorldCover 2025 theo 3 lớp: ${(100 * E("TK.dt.oa")).toFixed(2)} %, kappa ${E("TK.dt.kappa").toFixed(3)}`);
  ok($("tkXaBang").querySelectorAll("tr").length === 3 && $("tkBD").querySelectorAll("svg").length === 2 && /nước|xây dựng/.test($("tkCGBang").textContent), "theo xã (2 xã), biểu đồ cơ cấu và theo năm, bảng quy đổi");
  $("tkCG").value = "goc"; $("tkChay").click(); await until(() => /xong/.test($("tkTT").textContent) && E("TK.kq.che") === "goc", 30000, "gốc");
  const wcG = E("TK.kq.cot.find(c => c.pa.id === 'man:wc' && c.y === 2023)");
  ok(Object.keys(wcG.dt).sort().join() === "40,50,60,80" && /đất canh tác/.test($("tkBang").textContent), "chú giải gốc: WorldCover có 4 lớp 40, 50, 60, 80 với tên lớp");
  $("tkCG").value = "chung"; $("tkChay").click(); await until(() => /xong/.test($("tkTT").textContent) && E("TK.kq.che") === "chung", 30000, "chung");
  const ctxC = E("TK.kq.cot.find(c => c.pa.id === 'man:lulc_ctx' && c.y === 2025)");
  ok(!ctxC.dt[3] && ctxC.dt[1] > 0 && ctxC.dt[6] > 0 && gan(ctxC.loai, R27.ha_lop[1], 0.03 * R27.ha_lop[1]), "chú giải chung: \"thực vật\" của bản đồ 3 lớp không quy đổi được, nước và xây dựng thì được");
  const nb = blobs.length; $("tkCSV").click(); $("tkCotXem").value = "0"; $("tkTif").click(); await sleep(650);
  const csv = await docBlob(blobs[nb]);
  ok(/phuong_an,nam,chu_giai/.test(csv), "CSV thống kê");
  // đọc GeoTIFF vừa xuất bằng chính geotiff.js
  w.__tif = blobs[nb + 1];
  const tf2 = await E(`(async () => { const t = await GeoTIFF.fromArrayBuffer(await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsArrayBuffer(window.__tif); })); const im = await t.getImage();
      const d = await im.readRasters({interleave: true}); const g = TK.kq.g; return {w: im.getWidth(), h: im.getHeight(), bb: im.getBoundingBox(), gb: [g.x0, g.y1 - g.h * g.res, g.x0 + g.w * g.res, g.y1], gw: g.w, gh: g.h, e: im.getGeoKeys().ProjectedCSTypeGeoKey, n: d.filter(v => v && v < 254).length, m: TK.kq.cot[0].ma.filter(v => v).length, nd: im.getGDALNoData(), n254: d.filter(v => v === 254).length, k254: TK.kq.cot[0].co.filter((v, i) => v && !TK.kq.cot[0].ma[i]).length}; })()`);
  ok(tf2.w === tf2.gw && tf2.h === tf2.gh && tf2.e === 3857 && tf2.bb.every((v, i) => gan(v, tf2.gb[i], 1e-3)) && tf2.n === tf2.m && tf2.nd === 255 && tf2.n254 === tf2.k254, `xuất GeoTIFF EPSG:3857 đúng lưới, đúng giá trị, nodata 255, "không quy đổi được" 254 (${tf2.w} × ${tf2.h}, ${tf2.n254} điểm ảnh 254)`);

  // ---------- nhập GeoTIFF bản đồ riêng (UTM 48N, bảng màu)
  const buf = fs.readFileSync("/tmp/fx/nhap_utm.tif"), f = new w.File([new w.Uint8Array(buf)], "ban_do_rieng_2024.tif", {type: "image/tiff"});
  w.__f = f; await E("tkNhapTep(window.__f)");
  ok(E("TK.nhap && Object.keys(TK.nhap.lop).join()") === "1,2,3" && E("TK.nhap.epsg") === 32648 && E("TK.nhap.nam") === 2024 && E("TK.nhap.lop[2].n3") === 2 && E("TK.nhap.lop[1].mau") === "#2e9d3a",
     "nhập GeoTIFF UTM 48N: 3 lớp, đoán hệ 3 lớp, lấy màu từ bảng màu, năm từ tên tệp");
  $("tkNhapLuu").click(); await sleep(50);
  ok(E("PA.rieng.length") === 1 && [...$("tkPA").querySelectorAll("input")].some(i => /^nhap_/.test(i.value)), "lưu thành phương án riêng");
  $("tkPA").querySelectorAll("input").forEach(i => { i.checked = /^nhap_/.test(i.value); i.onchange(); }); await sleep(20);
  $("tkCG").value = "3"; $("tkChay").click(); await until(() => /xong/.test($("tkTT").textContent) && E("TK.kq.che") === "3" && E("TK.kq.cot.length") === 1, 30000, "thống kê bản đồ nhập");
  const nh = E("TK.kq.cot[0].dt");
  ok([1, 2, 3].every(k => gan(nh[k], R27.ha_nhap[k], 0.03 * R27.ha_nhap[k])), `diện tích bản đồ nhập (chiếu UTM -> 3857) khớp gốc: ${[1, 2, 3].map(k => nh[k].toFixed(0)).join(", ")} ha`);
  const ph = E("JSON.stringify(phienXuat())");
  ok(/"pa_rieng":\[/.test(ph) && /"rle":\[/.test(ph), "tệp tiến độ mang theo bản đồ riêng (mã hoá loạt chạy)");
  E("PA.rieng = []; tkVeDS()"); await E(`phienNhap(JSON.parse(${JSON.stringify(ph)}))`); await sleep(50);
  const pr = E("PA.rieng[0] && Array.from(PA.rieng[0].du[2024].data.slice(0, 5)).length"), same = E("PA.rieng.length");
  ok(same === 1 && pr === 5, "nhập lại tệp tiến độ: khôi phục bản đồ riêng");
  E("tkMo(false)");

  // ---------- phân loại từ điểm mẫu
  const mkPts = (dsach) => E(`(() => { const o = []; ${JSON.stringify(dsach)}.forEach(([r, c, ma]) => { const ll = CORE.toLL(660000 + c * 10 + 5, 2320000 - r * 10 - 5); o.push({lon: ll[0], lat: ll[1], nhan: {2025: ma}}); }); return o; })()`);
  const P1 = mkPts([[200, 150, "T1"], [600, 250, "T1"], [1000, 400, "T1"], [300, 300, "T1"], [800, 200, "T1"],
                    [200, 600, "N1"], [600, 750, "N1"], [1000, 900, "N1"], [300, 700, "N1"], [800, 850, "N1"],
                    [200, 1100, "X1"], [600, 1250, "X1"], [1000, 1400, "X1"], [300, 1200, "X1"], [800, 1350, "X1"]]);
  E(`taoBoTuDiem("mẫu phân loại thử", [2025], ${JSON.stringify(P1)}, {})`); await sleep(100);
  const boP = E("ST.bo");
  E(`map.fitBounds(L.latLngBounds(VG.xa.flatMap(x => [[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]])), {animate: false})`);
  $("bPL").click(); await sleep(300);
  ok(E(`plBoTot(2025, "day")`) === boP && /mẫu phân loại thử/.test($("plBo").options[0].textContent), "tự chọn bộ mẫu đủ lớp nhất cho năm 2025");
  $("plNam").value = "2025"; $("plPV").value = "tinh"; $("plPV").onchange(); $("plPP").value = "ecl_mau"; $("plPP").onchange(); $("plK").value = "1";
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:/.test(i.value); });
  $("plChay").click(); await until(() => /xong|lỗi/.test($("plTT").textContent), 60000, "phân loại 1");
  const Q1 = E("({dt: Array.from(PL.kq.dt), keys: PL.kq.keys, M: PL.kq.KD.M.map(r => Array.from(r)), nMau: PL.kq.nMau, sai: PL.kq.sai.length})");
  const ref1 = {N1: R27.ha_lop[2], T1: R27.ha_lop[1], X1: R27.ha_lop[3]};
  ok(Q1.keys.join() === "N1,T1,X1" && Q1.nMau === 15 && Q1.keys.every((k, i) => gan(Q1.dt[i], ref1[k], 0.04 * ref1[k])),
     `khoảng cách chuẩn hoá, mẫu gần nhất: ba dải đúng lớp (${Q1.dt.map(v => v.toFixed(0)).join(", ")} ha)`);
  ok(Q1.M.every((r, i) => r[i] === 5) && Q1.sai === 0 && /đúng 100.0 %/.test($("plTom").textContent), "kiểm định chéo bỏ-một-ra: 15/15 đúng");
  $("plXem").value = "cb"; $("plXem").onchange(); $("plXem").value = "tin"; $("plXem").onchange(); $("plXem").value = "lop"; $("plXem").onchange();
  ok(E("!!PL.hien && map.hasLayer(PL.hien)") && $("plLeg").querySelectorAll("i").length === 3, "bản đồ lớp và chú giải");
  $("plTen").value = "Phân loại thử 2025"; $("plLuu").click(); await sleep(50);
  ok(E("PA.rieng.some(p => p.ten === 'Phân loại thử 2025' && p.nam[0] === 2025 && p.lop[11].chung === 1 && p.lop[31].n3 === 3)"), "lưu thành phương án (giá trị = mã số của lớp, có quy đổi chung và 3 lớp)");
  const nb2 = blobs.length; $("plGeo").click(); $("plCSV").click(); $("plTif").click(); await sleep(650);
  const gj = JSON.parse(await docBlob(blobs[nb2]));
  ok(gj.features.length >= 3 && new Set(gj.features.map(f => f.properties.lop)).size === 3 && /dien_tich/.test(await docBlob(blobs[nb2 + 1])) && blobs[nb2 + 2].type === "image/tiff", "xuất GeoJSON, CSV, GeoTIFF");

  // tình huống 2: thiếu mẫu phía đông, một mẫu gán nhầm, một lớp hai nhóm khác hẳn nhau
  const P2 = mkPts([[200, 150, "T1"], [600, 250, "T1"], [1000, 400, "T1"], [300, 300, "T1"], [800, 200, "T1"], [900, 120, "N1"],
                    [200, 600, "N1"], [600, 700, "N1"], [1000, 650, "N1"], [300, 720, "N1"], [800, 680, "N1"],
                    [150, 60, "D1"], [450, 70, "D1"], [750, 80, "D1"], [150, 520, "D1"], [450, 530, "D1"], [750, 540, "D1"]]);
  E(`taoBoTuDiem("mẫu thiếu thử", [2025], ${JSON.stringify(P2)}, {})`); await sleep(100);
  E(`map.fitBounds(L.latLngBounds(VG.xa.flatMap(x => [[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]])), {animate: false})`);
  E("plMo(true)"); await sleep(200); $("plBo").value = E("ST.bo"); $("plPV").value = "tinh"; $("plPP").value = "ecl_mau"; $("plK").value = "1";
  $("plDT").querySelectorAll("input").forEach(i => { i.checked = /^s2:/.test(i.value); });
  $("plChay").click(); await until(() => /xong|lỗi/.test($("plTT").textContent) && E("PL.kq && PL.kq.nMau === 17"), 60000, "phân loại 2");
  const Q2 = E("({haXa: PL.kq.haXa, manh: PL.kq.manh.slice(0, 3), sai: PL.kq.sai.map(o => o.id), tach: PL.kq.tach.map(o => PL.kq.keys[o.k]), xaTrong: PL.kq.xaTrong.map(x => x.ten), muc: PL.cb.map(c => c.muc)})");
  const idNham = E(`Object.values(ST.diem).filter(p => p.bo === ST.bo && p.nhan[2025] === "N1").map(p => [p.id, p.lon])`).sort((a, b) => a[1] - b[1])[0][0];
  const ranhDong = E("VG.xa.find(x => x.ten === 'Đông').bl[0]");
  ok(Q2.haXa > 1000 && Q2.manh.length && Q2.manh[0].lon > ranhDong, `vùng xa mọi mẫu ở phía đông (không có mẫu): ${Q2.haXa.toFixed(0)} ha, mảng lớn nhất ở kinh độ ${Q2.manh[0].lon.toFixed(3)}`);
  ok(Q2.sai.includes(idNham), `mẫu gán nhầm (N1 giữa dải thực vật) bị kiểm định chéo chỉ ra: ${idNham}`);
  ok(Q2.tach.includes("D1"), "lớp D1 có hai nhóm mẫu khác hẳn nhau: gợi ý tách lớp");
  ok(Q2.xaTrong.includes("Đông") && ["thieu", "sai", "tach", "xa"].every(m => Q2.muc.includes(m)), "xã Đông chưa có điểm mẫu; đủ các loại cảnh báo");
  const nDiem = E("Object.keys(ST.diem).length");
  $("plCB").querySelector('[data-cb$=",them"]').click(); await sleep(50);
  ok(E("Object.keys(ST.diem).length") === nDiem + 1, "nút \"thêm điểm\" ở vùng thiếu mẫu tạo điểm mới để gán nhãn");

  // tình huống 3: các phương pháp khác, hệ 3 lớp; cosine trên dữ liệu có hướng rõ
  E(`ST.bo = "${boP}"; buildSetSelect()`); E("plMo(true)"); await sleep(200); $("plBo").value = boP;
  for (const pp of ["cos_mau", "cos_nm", "ecl_tam"]) {
    $("plPP").value = pp; $("plHe").value = pp === "ecl_tam" ? "3" : "day"; $("plChay").click();
    await until(() => /xong|lỗi/.test($("plTT").textContent) && E(`PL.kq && PL.kq.pp === "${pp}"`), 60000, pp);
  }
  ok(E("PL.kq.keys.join()") === "1,2,3" && E("PL.kq.lop.map(l => l.v).join()") === "1,2,3" && E("PL.kq.dt.every(v => v > 0)"), "hệ 3 lớp (thực vật, nước, xây dựng) từ nhãn chi tiết, tâm lớp");
  const C = E(`(() => { const r = plThamChieu([[1, 0, 0], [0.9, 0.1, 0], [0, 1, 0], [0, 0.95, 0.05]].map(v => Float32Array.from(v)), [0, 0, 1, 1], 2, "cos_mau", 300);
    const n = v => { const s = Math.hypot(...v); return Float32Array.from(v.map(x => x / s)); };
    return [plXep(n([5, 0.2, 0]), r, 2, true, 0, 1).k, plXep(n([0.1, 3, 0]), r, 2, true, 0, 3).k, +plXep(n([1, 1, 0]), r, 2, true, 0, 1).m.toFixed(3)]; })()`);
  ok(C[0] === 0 && C[1] === 1 && C[2] < 0.1, "cosine: chỉ theo hướng, không theo độ lớn; điểm giữa hai lớp có chênh nhỏ");

  // ---------- tiếng Nga, tiếng Anh
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|\b(xem|nghi|so theo)\b/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(150);
    E("tkMo(true)"); await sleep(100); for (const t of ["dt", "bd", "xa", "dong", "cg"]) E(`tkTab('${t}')`);
    E("plMo(true)"); await sleep(100); for (const t of ["tom", "cb", "dt", "kd"]) E(`plTab('${t}')`);
    $("vnTim").value = "nam"; $("vnTim").dispatchEvent(new w.Event("input"));
    const sot = new Set();
    for (const goc of [$("tkP"), $("plP"), $("vnW"), $("panel"), $("stripmsg")]) {
      const wk = w.document.createTreeWalker(goc, 4); let m;
      while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style")) continue;
        const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|Thử|thử|Bắc|Nam|Phân loại thử|Làng|Đường thử|KCN|Thôn|Trường/.test(t)) sot.add(t.slice(0, 60) + " <" + p.tagName + "#" + (p.id || (p.parentElement && p.parentElement.id) || "") + ">"); }
      [...goc.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v) && !/Thử/.test(v)) sot.add("@" + v.slice(0, 60)); }));
    }
    const miss = E("[...T_MISS]").filter(x => !/thử|Tây|Đông|Thử|Bắc|Nam/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở phần 2.7 (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 40).join("\n      ") : ""));
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
