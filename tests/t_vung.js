const {NM, ok, xong} = require("./kiemtra");
global.proj4 = require(NM + "/proj4");
const {CORE} = require("./_js/core.js");
function rndMask(w, h, seed, p) { let s = seed; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = r() < p ? 1 : 0; return m; }
const g = CORE.gridFor([11870000, 2370000, 11874000, 2373000], 4000, {x0: 11800000, y1: 2400000, res0: 10});
ok(g.res === 10 && g.w === 400 && g.h === 300, "gridFor căn lưới COG");
ok(CORE.gridFor([11800000, 2300000, 11900000, 2400000], 1536, {x0: 11800000, y1: 2400000, res0: 10}).res === 70, "gridFor giới hạn cỡ");
let allOk = true, nr = 0;
for (let t = 0; t < 30; t++) {
  const w = 37 + t, h = 29 + (t % 7), m = rndMask(w, h, 7 + t, 0.3 + 0.02 * t), pg = CORE.traceRings(m, w, h), rings = [];
  pg.forEach(o => { rings.push(o.outer); o.holes.forEach(r => rings.push(r)); nr += 1 + o.holes.length; });
  const back = CORE.rasterizeRings(rings, w, h); for (let i = 0; i < w * h; i++) if (back[i] !== m[i]) { allOk = false; break; }
  if (pg.length !== CORE.labelComp(m, w, h, 4, 1).n) allOk = false;
}
ok(allOk, `mặt nạ -> đa giác -> tô lại khớp tuyệt đối (30 mặt nạ, ${nr} vòng)`);
{ const m = new Uint8Array(100); for (let y = 1; y < 9; y++) for (let x = 1; x < 9; x++) m[y * 10 + x] = 1; m[44] = m[45] = 0;
  const pg = CORE.traceRings(m, 10, 10); ok(pg.length === 1 && pg[0].holes.length === 1, "vòng ngoài và lỗ");
  ok(CORE.fillHoles(m, 10, 10, 5)[44] === 1 && CORE.fillHoles(m, 10, 10, 1)[44] === 0, "lấp lỗ theo ngưỡng"); }
{ const w = 20, h = 10, m = new Uint8Array(w * h); for (let y = 2; y < 8; y++) { for (let x = 2; x < 9; x++) m[y * w + x] = 1; for (let x = 10; x < 17; x++) m[y * w + x] = 1; }
  ok(CORE.morphClose(m, w, h, 1)[4 * w + 9] === 1, "nối khe"); m[0] = 1;
  ok(CORE.removeSmall(m, w, h, 5)[0] === 0 && CORE.keepSeeded(m, w, h, [3 * w + 12])[3 * w + 3] === 0, "bỏ mảng nhỏ, giữ mảng có điểm mẫu"); }
{ const S = CORE.stackFeat([{data: new Uint8Array([10, 10, 10, 200, 200, 200, 12, 12, 12, 0, 0, 0]), n: 3}], 4);
  ok(CORE.distSel(S.F, 3, 4, S.valid, [[10, 10, 10]], [], 0.05).sel.join() === "1,0,1,0", "chọn theo khoảng cách");
  ok(CORE.distSel(S.F, 3, 4, S.valid, [[10, 10, 10]], [[12, 12, 12]], 0.05).sel.join() === "1,0,0,0", "mẫu âm loại trừ"); }
{ const c = CORE.to3857(106.68, 20.86), gg = CORE.gridFor([c[0] - 500, c[1] - 500, c[0] + 500, c[1] + 500], 2000, {x0: 0, y1: 0, res0: 10});
  const m = new Uint8Array(gg.w * gg.h).fill(1), st = CORE.maskStats(m, gg, {});
  const exp = gg.w * gg.h * Math.pow(10 * Math.cos(20.86 * Math.PI / 180), 2) / 1e4;
  ok(Math.abs(st.dien_tich_ha - exp) / exp < 1e-3, "diện tích theo cos φ");
  ok(Math.abs(CORE.geodesicArea(CORE.vectorize(m, gg, 0)) / 1e4 - st.dien_tich_ha) / st.dien_tich_ha < 0.01, "diện tích đa giác trên mặt cầu khớp");
  const m2 = new Uint8Array(gg.w * gg.h); for (let y = 20; y < 60; y++) for (let x = 30; x < 80; x++) if ((x - 55) ** 2 + (y - 40) ** 2 < 300) m2[y * gg.w + x] = 1;
  const back = CORE.rasterizeRings(CORE.polysToPixRings(gg, CORE.vectorize(m2, gg, 0)), gg.w, gg.h);
  let dif = 0; for (let i = 0; i < m2.length; i++) if (back[i] !== m2[i]) dif++;
  ok(dif === 0, "khứ hồi mặt nạ -> lon/lat -> mặt nạ"); }
xong();
