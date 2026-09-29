const {NM, ok, xong} = require("./kiemtra");
global.proj4 = require(NM + "/proj4");
const {CORE} = require("./_js/core.js");
const w = 400, h = 300, g = CORE.gridFor([11870000, 2370000, 11874000, 2373000], 4000, {x0: 11800000, y1: 2400000, res0: 10});
const nf = 3, F = new Uint8Array(w * h * nf), lab = new Int32Array(w * h), lop = new Uint8Array(w * h).fill(1);
let s0 = 5; const rnd = () => (s0 = (s0 * 1103515245 + 12345) % 2147483648) / 2147483648;
let k = 0; const sai = [];
for (let i = 0; i < 10; i++) { k++; const cx = 20 + (i % 5) * 75, cy = 30 + Math.floor(i / 5) * 90, r = 8 + (i % 3) * 3;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
    const p = y * w + x; lab[p] = k; F[p * 3] = 180 + rnd() * 20; F[p * 3 + 1] = 70 + rnd() * 20; F[p * 3 + 2] = 120 + rnd() * 20; lop[p] = 3; }
  sai.push(0); }
for (let i = 0; i < 6; i++) { k++; const y0 = 230 + i * 10, x0 = 20 + i * 50;
  for (let y = y0; y < y0 + 2; y++) for (let x = x0; x < x0 + 60; x++) { const p = y * w + x; lab[p] = k; F[p * 3] = 165 + rnd() * 20; F[p * 3 + 1] = 95 + rnd() * 20; F[p * 3 + 2] = 110 + rnd() * 20; lop[p] = 1; }
  sai.push(1); }
const D = CORE.compDesc(lab, k, g, F, nf, new Float32Array(w * h).fill(0.05), lop);
ok(D.length === 16 && D[0].compact > 0.5 && D[12].compact < 0.1 && D[12].elong > 10, "mô tả hình dạng: tròn / dải");
const del = [D[10], D[11]], cand = D.filter((x, i) => i !== 10 && i !== 11), la = sai.filter((x, i) => i !== 10 && i !== 11);
for (const grp of [{pho: 1, hinh: 1, lop: 1}, {pho: 1}, {hinh: 1}]) {
  const S = CORE.similarWrong(cand, del, [], grp);
  const lo = Math.min(...S.filter((x, i) => la[i]).map(x => x.score)), hi = Math.max(...S.filter((x, i) => !la[i]).map(x => x.score));
  ok(lo > hi && lo > 0.5, `tách mảng sai (${Object.keys(grp).join("+")}): ${lo.toFixed(2)} > ${hi.toFixed(2)}`);
}
const S2 = CORE.similarWrong(cand, del, [D[0], D[5]], {pho: 1, hinh: 1, lop: 1});
ok(Math.min(...S2.filter((x, i) => la[i]).map(x => x.score)) > Math.max(...S2.filter((x, i) => !la[i]).map(x => x.score)), "có mảng giữ làm mốc");
ok(CORE.similarWrong(cand, [], [], {pho: 1}).every(x => x.score === 0), "chưa xoá mảng nào: không nghi");
xong();
