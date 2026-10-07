/* =============================== BẢN 3.11 =============================== */
/* Đọc các lớp mới do ô Colab HF_311_NGUON_MOI_cell.py đẩy lên Hugging Face (manifest phiên bản 8):
   - lớp một băng có giá trị thật: keo_gian (mã 1..255 -> [thấp, cao]), log (lưu log10(1 + x)), don_vi: hiện đúng giá trị và đơn vị
     ở bảng giá trị tại điểm và thang màu (ánh sáng đêm VIIRS, tần suất nước DSWx, mức suy giảm thực vật DIST, chiều cao nhà GBA);
   - AlphaEarth (MAN.aef): 64 chiều tại điểm, mỗi năm một lần đọc (COG 64 kênh uint8, ô 128 × 128): đường "AlphaEarth: độ giống"
     (cos với năm trước, với năm đầu: tụt xuống là có thay đổi) ở đồ thị giá trị theo năm, và gợi ý lớp kNN bằng 64 chiều.
   - ảnh màu AlphaEarth (lớp rgb "Embedding AlphaEarth, …") tự vào nhóm embedding sẵn có. */
if (CORE.CMAP) Object.assign(CORE.CMAP, {
  nuoc: [[247, 251, 255], [198, 219, 239], [107, 174, 214], [33, 113, 181], [8, 48, 107]],
  den: [[0, 0, 0], [40, 11, 84], [120, 28, 109], [212, 72, 66], [251, 155, 6], [252, 255, 164]],
  nha: [[255, 245, 235], [253, 190, 133], [253, 141, 60], [217, 71, 1], [127, 39, 4]],
});
function xamGT(L0, b) {                              // mã 1..255 của lớp một băng -> chữ giá trị thật kèm đơn vị
  const kg = L0.keo_gian; if (!kg || !b) return String(b);
  const pc_ = /^(ls)?pc\d+$/.test(L0.id);
  let v = kg[0] + (b - 1) / 254 * (kg[1] - kg[0]);
  if (pc_) v /= 100;
  if (L0.log) v = Math.pow(10, v) - 1;
  return gtSo(v) + (L0.don_vi ? " " + L0.don_vi : "") + (pc_ ? "" : ` <span class="mu">(${b})</span>`);
}

/* ---------------- AlphaEarth tại điểm ---------------- */
var AEF = {m: new Map()};
function aefCo() { return !!(MAN && MAN.aef && MAN.aef.nam && MAN.aef.nam.length); }
function aefGiai(u) { const q = u - 128; return u ? Math.sign(q) * (q / 127.5) * (q / 127.5) : NaN; }
async function aefAt(p) {                            // {năm: Float64Array(64) chuẩn hoá độ dài 1}
  const k = (+p.x).toFixed(1) + "," + (+p.y).toFixed(1);
  if (AEF.m.has(k)) return AEF.m.get(k);
  const pr = (async () => {
    const out = {};
    await Promise.all(MAN.aef.nam.map(async y => {
      try {
        const v = await pxAt(CORE.dataUrl(CFG, MAN.aef.duong_dan.replace("{y}", y)), p);
        if (!v || v.length < 64 || v.some(b => !b)) return;
        const e = Float64Array.from(v.slice(0, 64), aefGiai), n = Math.hypot(...e) || 1;
        out[y] = e.map(x => x / n);
      } catch (e) { /* bỏ */ }
    }));
    return out;
  })();
  AEF.m.set(k, pr); if (AEF.m.size > 3000) AEF.m.delete(AEF.m.keys().next().value);
  return pr;
}
function aefCos(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
NHOM_NAM.push({id: "aef", ten: "AlphaEarth: độ giống năm trước, năm đầu (cos)", co: aefCo});
var _annualFor311 = annualFor;
annualFor = async function (p, grp) {
  if (grp !== "aef" && grp !== "aefv") return _annualFor311.apply(this, arguments);
  const E = await aefAt(p), ys = {}, nam = Object.keys(E).map(Number).sort((a, b) => a - b);
  if (grp === "aefv") { nam.forEach(y => { ys[y] = Array.from(E[y], x => +x.toFixed(5)); }); return {names: Array.from({length: 64}, (_, i) => "A" + String(i).padStart(2, "0")), ys, don_vi: "", nguon: "AlphaEarth 64 chiều"}; }
  nam.forEach((y, i) => { ys[y] = [i ? +aefCos(E[y], E[nam[i - 1]]).toFixed(4) : null, i ? +aefCos(E[y], E[nam[0]]).toFixed(4) : null]; });
  return {names: [T("giống năm trước"), T("giống năm đầu")], ys, don_vi: "cos", nguon: T("AlphaEarth Foundations, 64 chiều tại điểm (cos = 1: không đổi)")};
};
/* gợi ý lớp kNN bằng 64 chiều AlphaEarth (khi bộ dữ liệu có; tắt được) */
GY.aef = ls("laymau_hp_gyaef_v1") !== false;
function gyAEF() { return aefCo() && GY.aef !== false; }
var _gyNhomCo311 = gyNhomCo;
gyNhomCo = function () { return gyAEF() ? ["aefv"] : _gyNhomCo311.apply(this, arguments); };
var _gyKhoa311 = gyKhoa;
gyKhoa = function (p) { return _gyKhoa311(p) + (gyAEF() ? "|aef" : ""); };
function gyAefUI() {
  const r = $("gyBat") && $("gyBat").closest(".row"); if (!r) return;
  let lb = $("lbGyAef");
  if (!lb) { r.insertAdjacentHTML("beforeend", `<label id="lbGyAef" title=""><input type="checkbox" id="gyAef"> <span data-t></span></label>`); lb = $("lbGyAef");
    $("gyAef").onchange = () => { GY.aef = $("gyAef").checked; ls("laymau_hp_gyaef_v1", GY.aef); GY.tap = null; GY.cv = null; GY.ver++; gyHop(); }; }
  lb.hidden = !aefCo(); $("gyAef").checked = GY.aef !== false;
  lb.querySelector("[data-t]").textContent = T("dùng AlphaEarth");
  lb.title = T("gợi ý lớp bằng 64 chiều AlphaEarth tại điểm (thay cho đặc trưng có sẵn)");
}
var _buildOverlays311 = buildOverlays;
buildOverlays = function () { const r = _buildOverlays311.apply(this, arguments); gyAefUI(); return r; };
if (typeof setLang === "function") { const _sl = setLang; setLang = function () { const r = _sl.apply(this, arguments); gyAefUI(); return r; }; }
gyAefUI();
