const {NM, ok, xong} = require("./kiemtra");
global.proj4 = require(NM + "/proj4");
const GeoTIFF = require(NM + "/geotiff");
const {CORE} = require("./_js/core.js");
const ref = require("/tmp/fx/ref.json"), fs = require("fs");
const UI = fs.readFileSync(__dirname + "/_js/ui.js", "utf8");
eval(UI.slice(UI.indexOf("const TIFF = new Map();"), UI.indexOf("const COGLayer")).replace("const TIFF", "var TIFF").replace("const LUTS", "var LUTS")
  .replace(/^function (\w+)/gm, "global.$1 = function $1").replace(/^async function (\w+)/gm, "global.$1 = async function $1"));
function tileOf(mx, my, z) { const S = 2 * Math.PI * 6378137, n = 2 ** z; return [Math.floor((mx + S / 2) / (S / n)), Math.floor((S / 2 - my) / (S / n))]; }
(async () => {
  const cfg = {base: "http://127.0.0.1:8765/"};
  const man = await (await fetch(CORE.dataUrl(cfg, "manifest.json"))).json();
  ok(man.layers.length === 5 && man.pc.k === 3, "manifest qua máy chủ cục bộ (có Range)");
  const url = CORE.dataUrl(cfg, "s2tc/s2tc_2025.tif"), urlC = CORE.dataUrl(cfg, "lulc_ctx/lulc_ctx_2025.tif");
  for (let i = 0; i < 3; i++) {
    const P = ref.pts[i], [tx, ty] = tileOf(P.mx, P.my, 17), bb = CORE.tileBbox(17, tx, ty);
    const px = Math.floor((P.mx - bb[0]) / (bb[2] - bb[0]) * 256), py = Math.floor((bb[3] - P.my) / (bb[3] - bb[1]) * 256);
    const r = await readBox(url, bb, 256, 256), j = (py * 256 + px) * r.n;
    const T = await tiffOf(url), I0 = T._imgs[0].im, oo = I0.getOrigin(), rr = I0.getResolution();
    const cc = Math.floor((P.mx - oo[0]) / rr[0]), ro = Math.floor((P.my - oo[1]) / rr[1]);
    const ex = await I0.readRasters({window: [cc, ro, cc + 1, ro + 1], interleave: true});
    ok([r.data[j], r.data[j + 1], r.data[j + 2]].join() === Array.from(ex).join(), `ô z17 điểm ${i}: đúng điểm ảnh gốc`);
    const c = await readBox(urlC, bb, 256, 256); ok(c.data[py * 256 + px] === ref.cls[i], `lớp z17 điểm ${i}`);
  }
  ok((await readBox(url, CORE.tileBbox(17, 0, 0), 256, 256)) === null, "ô ngoài vùng: không đọc");
  ok((await tiffOf(url))._imgs.length > 2, "COG có overview");
  const Q = ref.pts[1], [tx, ty] = tileOf(Q.mx, Q.my, 10), r10 = await readBox(url, CORE.tileBbox(10, tx, ty), 256, 256);
  ok(Array.from(r10.data).filter(v => v > 0).length > 1000, "z10 đọc từ overview");
  { const [a, b] = tileOf(Q.mx, Q.my, 17), g1 = await readBox(CORE.dataUrl(cfg, "pc1/pc1_2025.tif"), CORE.tileBbox(17, a, b), 256, 256);
    ok(g1.n === 1 && Array.from(g1.data).filter(v => v > 0).length > 60000, "lớp xám một băng"); }
  const he = man.pc.he_so, k = man.pc.k, bang = he.bang, nky = new Set(bang.map(b => b.slice(b.lastIndexOf("_p") + 2))).size;
  const t = await tiffOf(CORE.dataUrl(cfg, "pc/pc_2025.tif")), im = t._imgs[0].im, o = im.getOrigin(), rs = im.getResolution();
  for (let i = 0; i < 4; i++) {
    const P = ref.pts[i], col = Math.floor((P.x - o[0]) / rs[0]), row = Math.floor((P.y - o[1]) / rs[1]);
    const v = await im.readRasters({window: [col, row, col + 1, row + 1], interleave: true});
    if (v[0] === -32768) { ok(ref.curves.NDVI[i] === null, `PC điểm ${i}: nodata ở cả JS và Python`); continue; }
    const nd = CORE.curveOf(CORE.reconstruct(Array.from(v).slice(0, k), he, k), bang, "NDVI", nky);
    ok(nd.every((a, q) => Math.abs(a - ref.curves.NDVI[i][q]) < 1.5e-3), `đường NDVI điểm ${i} = Python`);
  }
  xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
