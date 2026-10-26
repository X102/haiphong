/* =============================== BẢN 3.19: HỒI QUY CHỈ SỐ THEO ẢNH ĐA THỜI GIAN =============================== */
/* Theo luận án (mục 2.8.2, 3.6.3, bảng 25): với từng điểm ảnh, hệ số góc a của một chỉ số (NDVI hoặc bất kỳ chỉ số nào trong thư viện)
   theo thời gian, tính bằng bình phương nhỏ nhất trên MỌI lần quan sát quang đãng của kỳ, theo bước năm (mỗi cặp năm liền kề một
   lần) và cho cả khoảng; R², p; 5 cấp (giảm mạnh, giảm vừa, ổn định, tăng vừa, tăng mạnh); diện tích từng cấp mỗi kỳ và cân bằng
   (tăng − giảm); theo xã; đối chiếu với bản đồ lớp phủ hằng năm; chuỗi quan sát và đường hồi quy tại một điểm; xuất CSV, GeoTIFF,
   GeoJSON, điểm kiểm tra; đưa vào Xuất bản đồ, Xếp tầng.
   Nguồn: mọi cảnh Sentinel-2 L2A (Earth Search) hoặc Landsat C2 L2 (Planetary Computer) quang đãng theo SCL / QA_PIXEL, đọc ngay
   trong trình duyệt; hoặc ảnh tổng hợp năm của bộ dữ liệu (mỗi năm một giá trị: hệ số góc cặp năm = hiệu chỉ số, không có R², p).
   Đọc ảnh một lượt: mỗi năm giữ 6 tổng cộng dồn trên lưới (hq_core.js), cặp năm và cả khoảng tính từ các tổng đó. */
const hq$ = id => document.getElementById(id);
const HQ_TEN = [null, "giảm mạnh", "giảm vừa", "ổn định", "tăng vừa", "tăng mạnh"];
const HQ_MAU = [null, "#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"];
const HQ_NGUON = [["s2c", "Sentinel-2: mọi cảnh quang đãng (trực tuyến)"], ["s2t", "Sentinel-2: ảnh tổng hợp năm của bộ dữ liệu"],
                  ["lsc", "Landsat: mọi cảnh quang đãng (trực tuyến)"], ["lst", "Landsat: ảnh tổng hợp năm của bộ dữ liệu"]];
const HQ_XEM = [["lop", "cấp biến động"], ["a", "hệ số góc a (chỉ số/năm)"], ["r2", "R²"], ["p", "p của hệ số góc"], ["n", "số lần quan sát"], ["tat", "tắt"]];
const HQ_P = [[0.01, "#08519c", "p < 0.01"], [0.05, "#4292c6", "p < 0.05"], [0.1, "#9ecae1", "p < 0.1"], [Infinity, "#f0f0f0", "p ≥ 0.1"]];
const HQ_MAC = {vung: "nhin", cs: "NDVI", nguon: "s2c", A: 2017, B: 2025, t1: 1, t2: 12, may: 60, toiDa: 60, luoi: 500, c1: 0.1, c2: 0.2,
                ngD: "doi", d1: 0.01, d2: 0.03, yn: false, alpha: 0.05, nMin: 4, xem: "lop", op: 0.85};
const HQ = {o: Object.assign({}, HQ_MAC, ls("laymau_hp_hq_v1") || {}), kq: null, tok: 0, chay: false, hien: null, dau: null, tab: "tom", ky: null, diem: null};
function hqLuu() { ls("laymau_hp_hq_v1", HQ.o); }
function hqCanh(ng) { return ng === "s2c" || ng === "lsc"; }
function hqNg(ng) { return ng === "lsc" || ng === "lst" ? "ls" : "s2"; }
function hqNamDS(nguon) {                              // các năm chọn được theo nguồn
  const nay = new Date().getFullYear();
  if (nguon === "s2c") { const a = []; for (let y = S2OC.NGUON.s2.nam0; y <= nay; y++) a.push(y); return a; }
  if (nguon === "lsc") { const a = []; for (let y = S2OC.NGUON.ls.nam0; y <= nay; y++) a.push(y); return a; }
  if (nguon === "lst") return typeof lsNam === "function" ? lsNam() : [];
  return MAN && MAN.s2d ? (MAN.s2d.nam || []).slice().sort((a, b) => a - b) : [];
}
function hqNguonCo(nguon) { return nguon === "lst" ? typeof coLS === "function" && coLS() : nguon === "s2t" ? !!(MAN && MAN.s2d && (MAN.s2d.nam || []).length) : true; }
/* chỉ số biên dịch theo các băng của nguồn: cảnh trực tuyến theo tên băng của S2OC, ảnh tổng hợp theo băng của bộ dữ liệu */
function hqCS(id, nguon) {
  const d = typeof csDinh === "function" ? csDinh(id) : null; if (!d) return null;
  if (!hqCanh(nguon)) { const c0 = csLay(id), c = c0 && c0.f ? qhNguon(hqNg(nguon)).cs(c0) : null; return c && c.f ? {id, ten: c.ten || d.ten || id, f: c.f} : null; }
  const bangs = S2OC.NGUON[hqNg(nguon)].bang;
  try { const f = CORE.bieuThuc(d.bt, bangs, typeof CHISO_IDB !== "undefined" && CHISO_IDB ? CHISO_IDB.hang : {});
    if (!f || !f.chi || !f.chi.length) return null;
    return {id, ten: d.ten || id, f, idx: f.chi.slice(), bang: f.chi.map(k => bangs[k]), buf: new Array(bangs.length).fill(0)}; }
  catch (e) { return null; }
}
function hqKyTen(ky) { return ky.cap ? `${ky.a}–${ky.b}` : T("cả khoảng {a}–{b}", {a: ky.a, b: ky.b}); }
function hqTT(s) { const e = hq$("hqTT"); if (e) e.textContent = s || ""; }
function hqTien(f) { const e = hq$("hqTien"); if (e) { e.hidden = f == null; e.firstChild.style.width = Math.round(100 * Math.max(0, Math.min(1, f || 0))) + "%"; } }

/* ---------------- bảng điều khiển ---------------- */
(function hqTao() {
  const st = document.createElement("style");
  st.textContent = `#hqP{width:500px}
    #hqP .hq-h{display:flex;gap:4px;align-items:center;flex-wrap:wrap}#hqP .hq-h select{min-width:0}
    #hqP input[type=number]{width:62px}
    #hqP .vg-dau{flex-wrap:wrap;row-gap:2px}#hqTT{order:9;flex:1 0 100%;font-size:11px;line-height:1.35}#hqTT:empty{display:none}
    #hqTien{order:10;flex:1 0 100%;height:3px;background:#dfe5ec;border-radius:2px;overflow:hidden;margin:1px 0 0}#hqTien i{display:block;height:100%;width:0;background:#0b63ce;transition:width .2s}
    #hqP .leg{display:flex;flex-wrap:wrap;gap:3px 10px;font-size:11px;margin:3px 0}#hqP .leg i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:3px;border:1px solid rgba(0,0,0,.2)}
    #hqP .leg i.ramp28{width:90px;height:10px}
    #hqP td.so,#hqP th.so{text-align:right;font-variant-numeric:tabular-nums}#hqP tr.tong td{border-top:1px solid #d0d5dd;font-weight:600}
    #hqP .hq-sw{display:inline-block;width:10px;height:10px;border:1px solid #98a2b3;vertical-align:-1px;margin-right:2px}
    #hqP .hq-luu{float:right;font-size:11px;padding:0 6px}
    #hqP .hq-tab{flex-wrap:wrap}
    #hqChonP{position:absolute;inset:0;z-index:2500;cursor:crosshair;background:rgba(11,99,206,.06)}
    #hqChonP span{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:#0b63ce;color:#fff;padding:6px 10px;border-radius:6px;font-size:13px}`;
  document.head.appendChild(st);
  const cha = hq$("map") || document.body;
  cha.insertAdjacentHTML("beforeend", `<div id="hqP" class="pn27" hidden data-noi18n>
  <div class="vg-dau"><b data-t="tieu"></b><span style="margin-left:auto"></span><button id="hqThu" type="button">–</button><button id="hqDong" type="button">×</button>
    <span class="mu" id="hqTT"></span><div id="hqTien" hidden><i></i></div></div>
  <div id="hqBody">
    <div class="mu sm" data-t="gt"></div>
    <div class="vg-o">
      <span data-t="vung"></span><select id="hqVung"></select>
      <span data-t="cs"></span><select id="hqCS"></select>
      <span data-t="nguon"></span><select id="hqNguon"></select>
      <span data-t="nam"></span><span class="hq-h"><select id="hqA"></select> – <select id="hqB"></select></span>
      <span data-t="thang" data-canh></span><span class="hq-h" data-canh><select id="hqT1"></select> – <select id="hqT2"></select></span>
      <span data-t="may" data-canh></span><span class="hq-h" data-canh><input id="hqMay" type="number" min="0" max="100" step="5"> %</span>
      <span data-t="toida" data-canh></span><span class="hq-h" data-canh><input id="hqToiDa" type="number" min="5" max="200" step="5"></span>
      <span data-t="luoi"></span><select id="hqLuoi"><option value="300"></option><option value="500"></option><option value="800"></option></select>
    </div>
    <details id="hqNgW"><summary data-t="ngTieu"></summary>
      <div class="vg-o">
        <span data-t="ngCap"></span><span class="hq-h"><input id="hqC1" type="number" step="0.01" min="0"> / <input id="hqC2" type="number" step="0.01" min="0"> <button id="hqCLA" type="button"></button></span>
        <span data-t="ngDai"></span><span class="hq-h"><select id="hqNgD"></select><input id="hqD1" type="number" step="0.005" min="0"> / <input id="hqD2" type="number" step="0.005" min="0"></span>
        <span data-t="nmin" data-canh></span><span data-canh><input id="hqNMin" type="number" min="2" max="60" step="1"></span>
      </div>
      <label><input type="checkbox" id="hqYN"> <span data-t="yn"></span></label> α <select id="hqAlpha"><option value="0.05">0.05</option><option value="0.01">0.01</option><option value="0.1">0.1</option></select>
    </details>
    <div class="row"><button id="hqChay" type="button" class="on"></button><span class="mu sm" id="hqUoc"></span></div>
    <div id="hqKQ" hidden>
      <div class="vg-o"><span data-t="ky"></span><select id="hqKy"></select>
        <span data-t="xem"></span><span class="hq-h"><select id="hqXem"></select><input id="hqOp" type="range" min="0.1" max="1" step="0.05" style="width:80px"></span></div>
      <div id="hqLeg"></div>
      <div class="vg-tab hq-tab"><button data-htab="tom"></button><button data-htab="bang"></button><button data-htab="bd"></button><button data-htab="xa"></button><button data-htab="lp"></button><button data-htab="diem"></button></div>
      <div data-hpane="tom"><div id="hqTom"></div></div>
      <div data-hpane="bang" hidden><div id="hqBang"></div></div>
      <div data-hpane="bd" hidden><div id="hqBD"></div></div>
      <div data-hpane="xa" hidden><div id="hqXa"></div></div>
      <div data-hpane="lp" hidden><div class="mu sm" data-t="lpGT"></div>
        <div class="vg-o"><span data-t="lpBD"></span><select id="hqPA"></select><span data-t="lpNam"></span><span class="hq-h"><select id="hqPANam"></select><button id="hqLPChay" type="button"></button></span></div>
        <div id="hqLP"></div></div>
      <div data-hpane="diem" hidden><div class="row"><button id="hqChonDiem" type="button"></button><span class="mu sm" id="hqDiemTT"></span></div><div id="hqDiem"></div></div>
      <div class="row"><button id="hqCSV" type="button">CSV</button><button id="hqTif" type="button">GeoTIFF</button><button id="hqTifKy" type="button"></button><button id="hqGeo" type="button">GeoJSON</button>
        <button id="hqRai" type="button"></button><input id="hqNDiem" type="number" value="10" min="1" max="500" style="width:52px"></div>
    </div>
  </div>
</div>`);
  const P = hq$("hqP");
  if (window.L && L.DomEvent) { L.DomEvent.disableClickPropagation(P); L.DomEvent.disableScrollPropagation(P); }
  P.addEventListener("click", e => e.stopPropagation());
  { const dau = P.querySelector(".vg-dau"); let s = null;                // kéo bảng bằng thanh tiêu đề
    dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; s = {x: e.clientX, y: e.clientY, l: P.offsetLeft, t: P.offsetTop}; e.preventDefault(); });
    document.addEventListener("mousemove", e => { if (!s) return; P.style.left = Math.max(0, s.l + e.clientX - s.x) + "px"; P.style.top = Math.max(0, s.t + e.clientY - s.y) + "px"; });
    document.addEventListener("mouseup", () => { s = null; }); }
  hq$("hqDong").onclick = () => hqMo(false);
  hq$("hqThu").onclick = () => { const b = hq$("hqBody"); b.hidden = !b.hidden; hq$("hqThu").textContent = b.hidden ? "+" : "–"; };
  const b = hq$("bHQ"); if (b) b.onclick = () => hqMo();
  hq$("hqChay").onclick = hqChay;
  ["hqVung", "hqCS", "hqNguon", "hqA", "hqB", "hqT1", "hqT2", "hqMay", "hqToiDa", "hqLuoi", "hqNMin"].forEach(id => hq$(id).addEventListener("change", () => { hqDoc(); if (id === "hqNguon") hqVeNam(true); hqHien(); }));
  ["hqC1", "hqC2", "hqNgD", "hqD1", "hqD2", "hqYN", "hqAlpha"].forEach(id => hq$(id).addEventListener("change", () => {
    if (id === "hqD1" || id === "hqD2") hq$("hqNgD").value = "tu"; hqDoc(); hqHien(); if (HQ.kq) { hqPhanCap(HQ.kq); hqVeHet(); } }));
  hq$("hqCLA").onclick = () => { hq$("hqC1").value = 0.1; hq$("hqC2").value = 0.2; hq$("hqNgD").value = "doi"; hqDoc(); hqHien(); if (HQ.kq) { hqPhanCap(HQ.kq); hqVeHet(); } };
  hq$("hqKy").onchange = () => { HQ.ky = hq$("hqKy").value; hqVeHet(); };
  hq$("hqXem").onchange = () => { HQ.o.xem = hq$("hqXem").value; hqLuu(); hqVe(); };
  hq$("hqOp").oninput = () => { HQ.o.op = +hq$("hqOp").value; hqLuu(); if (HQ.hien) HQ.hien.setOpacity(HQ.o.op); };
  P.querySelectorAll("[data-htab]").forEach(x => { x.onclick = () => hqTab(x.dataset.htab); });
  hq$("hqCSV").onclick = hqCSV; hq$("hqTif").onclick = () => hqTif(false); hq$("hqTifKy").onclick = () => hqTif(true); hq$("hqGeo").onclick = hqGeo; hq$("hqRai").onclick = hqRai;
  hq$("hqChonDiem").onclick = hqChonDiem;
  hq$("hqPA").onchange = hqVeNamPA; hq$("hqLPChay").onclick = hqLopPhu;
  P.addEventListener("click", e => { const k = e.target.closest("[data-svg]"); if (k) { const s = P.querySelector(`svg[data-ten="${k.dataset.svg}"]`); if (s) download(`hoi_quy_${k.dataset.svg}_${stamp()}.svg`, s.outerHTML, "image/svg+xml"); } });
  const xw = hq$("cdXhW");                                   // lối sang từ khối xu hướng của bảng Thay đổi
  if (xw && !hq$("xhSangHQ")) { xw.insertAdjacentHTML("beforeend", `<div class="row"><button id="xhSangHQ" type="button" data-noi18n></button></div>`);
    hq$("xhSangHQ").onclick = () => { const v = hq$("xhCS") && hq$("xhCS").value; if (v) HQ.o.cs = v; hqMo(true); }; }
  hqChu();
})();
function hqChu() {                                      // chữ theo ngôn ngữ
  const w = hq$("hqP"); if (!w) return; const t = (k, s) => w.querySelectorAll(`[data-t="${k}"]`).forEach(e => { e.textContent = s; });
  t("tieu", "⠿ " + T("Hồi quy chỉ số theo ảnh đa thời gian"));
  t("gt", T("Hệ số góc của chỉ số theo thời gian (bình phương nhỏ nhất trên mọi lần quan sát quang đãng), từng cặp năm liền kề và cả khoảng; 5 cấp biến động, diện tích, cân bằng tăng − giảm."));
  t("vung", T("Phạm vi tính")); t("cs", T("Chỉ số phổ")); t("nguon", T("Nguồn ảnh")); t("nam", T("Năm")); t("thang", T("Tháng")); t("may", T("Mây cảnh ≤")); t("toida", T("Tối đa cảnh/năm"));
  t("luoi", T("Lưới")); t("ngTieu", T("Ngưỡng và kiểm định")); t("ngCap", T("Cặp năm: vừa / mạnh")); t("ngDai", T("Cả khoảng"));
  t("nmin", T("Số lần quan sát tối thiểu")); t("yn", T("điểm ảnh có p ≥ α tính là ổn định (lọc theo ý nghĩa thống kê)"));
  t("ky", T("Kỳ")); t("xem", T("Bản đồ")); t("lpGT", T("Diện tích từng cấp biến động trong từng lớp của bản đồ lớp phủ (luận án: ghép bản đồ lớp phủ hằng năm với bản đồ xu hướng để tách thay đổi bền khỏi dao động mùa vụ, thời tiết)."));
  t("lpBD", T("Bản đồ lớp phủ")); t("lpNam", T("Năm"));
  const op = (id, ds, v) => { const e = hq$(id); if (!e) return; e.innerHTML = ds.map(([x, s]) => `<option value="${esc(String(x))}">${esc(s)}</option>`).join(""); if (v != null) e.value = String(v); };
  hq$("hqNguon").innerHTML = HQ_NGUON.map(([v, s]) => `<option value="${v}"${hqNguonCo(v) ? "" : " disabled"}>${esc(T(s))}</option>`).join(""); hq$("hqNguon").value = HQ.o.nguon;
  op("hqT1", Array.from({length: 12}, (_, k) => [k + 1, T("tháng {m}", {m: k + 1})]), HQ.o.t1); op("hqT2", Array.from({length: 12}, (_, k) => [k + 1, T("tháng {m}", {m: k + 1})]), HQ.o.t2);
  op("hqLuoi", [["300", T("thô (≤ 300 × 300 điểm ảnh)")], ["500", T("vừa (≤ 500 × 500)")], ["800", T("chi tiết (≤ 800 × 800, chậm)")]], HQ.o.luoi);
  op("hqNgD", [["doi", T("quy đổi từ ngưỡng cặp năm theo độ dài khoảng (× 2/số năm)")], ["gee", T("mã GEE ChuyenDoiXanh: 0.01 / 0.03")], ["tu", T("tự đặt")]], HQ.o.ngD);
  op("hqXem", HQ_XEM.map(([v, s]) => [v, T(s)]), HQ.o.xem);
  hq$("hqAlpha").value = String(HQ.o.alpha);
  hq$("hqCLA").textContent = T("theo luận án: 0.1 / 0.2"); hq$("hqCLA").title = T("ngưỡng của luận án cho hồi quy bước năm (bảng 25)");
  hq$("hqThu").title = T("thu gọn / mở rộng bảng"); hq$("hqDong").title = T("đóng");
  const tab = {tom: "Nhận định", bang: "Bảng", bd: "Biểu đồ", xa: "Theo xã", lp: "Lớp phủ", diem: "Tại điểm"};
  w.querySelectorAll("[data-htab]").forEach(x => { x.textContent = T(tab[x.dataset.htab]); x.classList.toggle("on", x.dataset.htab === HQ.tab); });
  hq$("hqTifKy").textContent = T("GeoTIFF mọi kỳ"); hq$("hqTifKy").title = T("mỗi kỳ một băng hệ số góc (Float32)");
  hq$("hqTif").title = T("bản đồ đang xem của kỳ đang chọn: cấp (có bảng màu, QML) hoặc 4 băng a, R², p, n");
  hq$("hqRai").textContent = T("Rải điểm kiểm tra"); hq$("hqRai").title = T("tạo bộ điểm rải đều trong từng cấp của kỳ đang chọn để kiểm tra bằng ảnh");
  hq$("hqChonDiem").textContent = "📍 " + T("Chọn điểm trên bản đồ"); hq$("hqLPChay").textContent = T("Đối chiếu");
  hq$("hqOp").title = T("độ đục lớp"); hq$("hqOp").value = HQ.o.op;
  hqNutChay();
  const b = hq$("bHQ"); if (b) b.title = T("Hồi quy một chỉ số theo ảnh đa thời gian: hệ số góc, R², p từng điểm ảnh theo từng cặp năm và cả khoảng; phát hiện biến động 5 cấp, diện tích, cân bằng, theo xã, chuỗi tại điểm");
  const s = hq$("xhSangHQ"); if (s) { s.textContent = "📈 " + T("Hồi quy theo mọi cảnh quang đãng (theo luận án)…"); s.title = T("mở bảng Hồi quy chỉ số: mọi cảnh Sentinel-2 hoặc Landsat trong từng cặp năm, R², p, chuỗi tại điểm"); }
}
function hqNutChay() { const b = hq$("hqChay"); if (b) b.textContent = HQ.chay ? "■ " + T("Dừng") : "▶ " + T("Tính hồi quy"); }
function hqVeVung() {
  const s = hq$("hqVung"), ds = tgVungDS(), nh = (g, ten) => { const q = ds.filter(x => x[2] === g); return q.length ? `<optgroup label="${esc(ten)}">` + q.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("") + "</optgroup>" : ""; };
  s.innerHTML = nh("v", T("Vùng")) + nh("x", T("Xã, phường"));
  s.value = ds.some(q => q[0] === HQ.o.vung) ? HQ.o.vung : "nhin"; HQ.o.vung = s.value;
}
function hqVeCS() {
  const s = hq$("hqCS"), ds = (typeof csDS === "function" ? csDS() : []).filter(c => hqCS(c.id, HQ.o.nguon));
  s.innerHTML = ds.map(c => `<option value="${esc(c.id)}">${esc(c.ten)}</option>`).join("");
  s.value = ds.some(c => c.id === HQ.o.cs) ? HQ.o.cs : (ds.some(c => c.id === "NDVI") ? "NDVI" : (ds[0] || {}).id || "");
  HQ.o.cs = s.value;
}
function hqVeNam(doiNguon) {
  const ys = hqNamDS(HQ.o.nguon), op = ys.map(y => `<option value="${y}">${y}</option>`).join("");
  hq$("hqA").innerHTML = hq$("hqB").innerHTML = op; if (!ys.length) return;
  let A = HQ.o.A, B = HQ.o.B;
  if (doiNguon || !ys.includes(A) || !ys.includes(B)) {
    const nay = new Date().getFullYear(), cuoi = ys.filter(y => y < nay).pop() || ys[ys.length - 1];
    B = ys.includes(B) ? B : cuoi; A = ys.includes(A) && A < B ? A : ys[Math.max(0, ys.indexOf(B) - (hqCanh(HQ.o.nguon) && HQ.o.nguon === "lsc" ? 6 : 8))];
  }
  hq$("hqA").value = A; hq$("hqB").value = B; HQ.o.A = +hq$("hqA").value; HQ.o.B = +hq$("hqB").value;
}
function hqDoc() {                                       // giao diện -> HQ.o
  const o = HQ.o, v = id => hq$(id).value, so = (id, d) => { const x = +hq$(id).value; return isFinite(x) ? x : d; };
  o.vung = v("hqVung") || "nhin"; o.nguon = v("hqNguon") || o.nguon; o.cs = v("hqCS") || o.cs; o.A = so("hqA", o.A); o.B = so("hqB", o.B); o.t1 = so("hqT1", 1); o.t2 = so("hqT2", 12);
  o.may = Math.max(0, Math.min(100, so("hqMay", 60))); o.toiDa = Math.max(5, Math.min(200, Math.round(so("hqToiDa", 60)))); o.luoi = +v("hqLuoi") || 500;
  o.c1 = Math.abs(so("hqC1", 0.1)); o.c2 = Math.abs(so("hqC2", 0.2)); o.ngD = v("hqNgD") || "doi"; o.d1 = Math.abs(so("hqD1", 0.01)); o.d2 = Math.abs(so("hqD2", 0.03));
  o.nMin = Math.max(2, Math.round(so("hqNMin", 4))); o.yn = hq$("hqYN").checked; o.alpha = +v("hqAlpha") || 0.05;
  hqLuu();
}
function hqNgDai(o, ky) {                                // ngưỡng của kỳ (cặp năm: c1, c2; cả khoảng: theo cách đã chọn)
  if (ky.cap) return [o.c1, o.c2];
  if (o.ngD === "gee") return [0.01, 0.03];
  if (o.ngD === "tu") return [o.d1, o.d2];
  const S = ky.b - ky.a + 1; return [HQC.nguongDai(o.c1, S), HQC.nguongDai(o.c2, S)];
}
function hqHien() {                                      // ô theo nguồn, giá trị vào giao diện, ước lượng lưới
  const o = HQ.o, canh = hqCanh(o.nguon);
  hq$("hqP").querySelectorAll("[data-canh]").forEach(e => { e.hidden = !canh; });
  hq$("hqMay").value = o.may; hq$("hqToiDa").value = o.toiDa; hq$("hqC1").value = o.c1; hq$("hqC2").value = o.c2; hq$("hqNMin").value = o.nMin; hq$("hqYN").checked = !!o.yn;
  hq$("hqNgD").value = o.ngD; const S = o.B - o.A + 1, [d1, d2] = hqNgDai(o, {cap: false, a: o.A, b: o.B});
  hq$("hqD1").value = +d1.toFixed(4); hq$("hqD2").value = +d2.toFixed(4);
  try { const V = tgVung(o.vung), r0 = hqNg(o.nguon) === "ls" ? 30 : 10, g = CORE.gridFor(V.bb, o.luoi, {x0: 0, y1: 0, res0: r0}), lat = CORE.m2ll((g.bb[0] + g.bb[2]) / 2, (g.bb[1] + g.bb[3]) / 2)[1];
    hq$("hqUoc").textContent = T("lưới {w} × {h}, ô ≈ {m} m; {n} năm", {w: g.w, h: g.h, m: Math.round(g.res * Math.cos(lat * Math.PI / 180)), n: Math.max(0, S)}) +
      (canh ? " · " + T("tối đa {k} cảnh/năm", {k: o.toiDa}) : ""); }
  catch (e) { hq$("hqUoc").textContent = ""; }
}
async function hqMo(on) {
  const P = hq$("hqP"); P.hidden = on === false ? true : (on === true ? false : !P.hidden);
  if (P.hidden) { if (HQ.dau) { map.removeLayer(HQ.dau); HQ.dau = null; } return; }
  if (!VG.xa && MAN && MAN.ranh_gioi_xa && typeof vgTaiXaHF === "function") { try { await vgTaiXaHF(); } catch (e) { /* không có */ } }
  hqChu(); if (!hqNguonCo(HQ.o.nguon)) { HQ.o.nguon = "s2c"; hq$("hqNguon").value = "s2c"; }
  hqVeVung(); hqVeNam(false); hqVeCS(); hqHien();
  if (HQ.kq) hqVeHet();
}
function hqTab(t) {
  HQ.tab = t; document.querySelectorAll("#hqP [data-htab]").forEach(b => b.classList.toggle("on", b.dataset.htab === t));
  document.querySelectorAll("#hqP [data-hpane]").forEach(p => { p.hidden = p.dataset.hpane !== t; });
  if (t === "lp") hqVePA();
}

/* ---------------- đọc ảnh ---------------- */
async function hqHang(ds, k, f) {                       // chạy f trên từng phần tử, tối đa k việc cùng lúc
  let i = 0; await Promise.all(Array.from({length: Math.min(k, ds.length)}, async () => { while (i < ds.length) { const x = ds[i++]; await f(x); } }));
}
function hqDung(X) { if (X.tok !== HQ.tok) throw Object.assign(new Error("dừng"), {dung: true}); }
async function hqMotCanh(sc, X, val) {                  // ghi chỉ số của một cảnh vào các điểm ảnh còn trống của ngày -> số điểm ảnh ghi được
  const G = X.luoi[sc.epsg] || (X.luoi[sc.epsg] = S2OC.luoiAnh(sc.epsg, X.g.bb, X.g.w, X.g.h)), N = X.N, ng = X.ng, c = X.c;
  await S2OC.chuanBi([sc]);
  const u = S2OC.url(sc, "SCL"); if (!u) return 0;
  const scl = await vgThuLai(() => S2OC.layMau(u, G, [0]), u); hqDung(X);
  let k = 0; for (let i = 0; i < N; i++) if (val[i] !== val[i] && (!X.vung || X.vung[i]) && S2OC.quang(ng, scl[i])) k++;
  if (k < Math.max(1, 5e-4 * X.nV)) return 0;            // gần như mây hết trong phạm vi: khỏi đọc băng
  const them = S2OC.canThem(sc).filter(b => !c.bang.includes(b)), all = c.bang.concat(them);
  if (all.some(b => !S2OC.url(sc, b))) return 0;
  const vs = await Promise.all(all.map(b => vgThuLai(() => S2OC.layMau(S2OC.url(sc, b), G, [0]), S2OC.url(sc, b)))); hqDung(X);
  const iB2 = all.indexOf("B2"), lsB = ng === "ls" && iB2 >= 0, s = sc.s, off = sc.o, nq = c.bang.length, buf = c.buf, idx = c.idx, f = c.f;
  let co = 0;
  for (let i = 0; i < N; i++) {
    if (val[i] === val[i] || (X.vung && !X.vung[i]) || !S2OC.quang(ng, scl[i])) continue;
    if (lsB) { const d = vs[iB2][i]; if (d > 0 && (d * s + off) * 10000 > S2OC.SANG) continue; }   // Landsat: mây Fmask bỏ sót (lam > 0.25)
    let ok = true; for (let q = 0; q < nq; q++) { const d = vs[q][i]; if (!(d > 0)) { ok = false; break; } buf[idx[q]] = d * s + off; }
    if (!ok) continue; const x = f(buf); if (x != null && isFinite(x)) { val[i] = x; co++; }
  }
  return co;
}
function hqChonDeu(ds, k) {                            // quá số cảnh tối đa: chia đều theo tháng (trong tháng ưu tiên ít mây) để mùa nào cũng có mặt
  if (ds.length <= k) return ds.slice(); const th = {};
  ds.forEach(sc => { (th[sc.ngay.slice(0, 7)] = th[sc.ngay.slice(0, 7)] || []).push(sc); });
  const nh = Object.keys(th).sort().map(m => th[m].sort((a, b) => (a.may || 0) - (b.may || 0))), out = [];
  for (let r = 0; out.length < k; r++) { let co = false; for (const g of nh) if (g[r] && out.length < k) { out.push(g[r]); co = true; } if (!co) break; }
  return out;
}
async function hqDocCanh(y, X, kNam, soNam) {            // mọi cảnh quang đãng của năm y -> tổng cộng dồn (t tính từ đầu năm y)
  const o = X.o, bb = X.bl;
  const ds0 = await vgThuLai(() => S2OC.tim({nguon: X.ng, bbox: bb, datetime: S2OC.cuaSo(y, [o.t1, o.t2]), may: o.may, gioi_han: 100}), "STAC"); hqDung(X);
  const ds = hqChonDeu(ds0, o.toiDa), S = HQC.tong(X.N), st = {tim: ds0.length, doc: ds.length, dung: 0, quan: 0, ds: []};
  const nhom = new Map(); ds.forEach(sc => { const a = nhom.get(sc.ngay) || []; a.push(sc); nhom.set(sc.ngay, a); });
  const ngays = [...nhom.keys()].sort(); let xong = 0;
  hqTT(T("năm {y}: tìm thấy {n} cảnh", {y, n: ds0.length}));
  await hqHang(ngays, 3, async ngay => {               // cùng ngày nhiều ô MGRS (vùng chồng): mỗi điểm ảnh lấy một lần trong ngày
    hqDung(X); const grp = nhom.get(ngay), val = new Float32Array(X.N).fill(NaN), dung = []; let co = 0;
    for (const sc of grp) { try { const k = await hqMotCanh(sc, X, val); if (k) { co += k; dung.push(sc); } } catch (e) { if (e.dung) throw e; X.loi++; } }
    if (co) { const t = HQC.namTP(ngay) - y; for (let i = 0; i < X.N; i++) { const v = val[i]; if (v === v) HQC.them(S, i, t, v); }
      st.dung++; st.quan += co; st.ds.push(...dung); }
    xong++; hqTien((kNam + xong / Math.max(1, ngays.length)) / soNam);
    hqTT(T("năm {y}: cảnh {i}/{n}", {y, i: xong, n: ngays.length}));
  });
  st.ds.sort((a, b) => (a.ngay < b.ngay ? -1 : 1));
  return {S, st};
}
async function hqDocTH(y, X) {                          // ảnh tổng hợp năm của bộ dữ liệu: một giá trị mỗi năm (t = giữa năm)
  const q = qhNguon(X.ng), c = X.c, ch = c.f.chi.slice(), N = X.N, nb = ch.length;
  const url = CORE.dataUrl(CFG, q.man.duong_dan.replace("{y}", y));
  const R = await vgThuLai(() => readUTM(url, X.g.bb, X.g.w, X.g.h, 0, ch, false, true), url); hqDung(X);
  const S = HQC.tong(N), V = new Float32Array(N).fill(NaN); let co = 0;
  if (R) { const buf = new Array(q.nb).fill(0);
    for (let i = 0; i < N; i++) { if (X.vung && !X.vung[i]) continue; const j = R.idx[i]; if (j < 0) continue; let z = true;
      if (q.nd) { z = false; for (let b = 0; b < nb; b++) if (R.src[j * nb + b] === q.nd) { z = true; break; } }
      else for (let b = 0; b < nb; b++) if (R.src[j * nb + b]) { z = false; break; }
      if (z) continue; for (let b = 0; b < nb; b++) buf[ch[b]] = R.src[j * nb + b] / 10000;
      const x = c.f(buf); if (x != null && isFinite(x)) { V[i] = x; HQC.them(S, i, 0.5, x); co++; } } }
  return {S, V, st: {tim: 1, doc: 1, dung: co ? 1 : 0, quan: co, ds: []}};
}
async function hqChay() {
  if (HQ.chay) { HQ.tok++; HQ.chay = false; hqNutChay(); hqTien(null); hqTT(T("đã dừng")); return; }
  hqDoc(); const o = Object.assign({}, HQ.o), tok = ++HQ.tok; HQ.chay = true; hqNutChay();
  try {
    if (!(o.A < o.B)) throw new Error(T("năm đầu phải nhỏ hơn năm cuối"));
    if (!(o.c2 > o.c1)) throw new Error(T("ngưỡng mạnh phải lớn hơn ngưỡng nhẹ"));
    const canh = hqCanh(o.nguon), ng = hqNg(o.nguon);
    if (!canh && !hqNguonCo(o.nguon)) throw new Error(ng === "ls" ? T("cần ảnh Landsat (ls) của bộ dữ liệu") : T("cần ảnh S2 10 băng (s2d) của bộ dữ liệu"));
    const c = hqCS(o.cs, o.nguon); if (!c) throw new Error(T("chỉ số này cần băng mà nguồn ảnh đã chọn không có"));
    const V = tgVung(o.vung), g = CORE.gridFor(V.bb, o.luoi, {x0: 0, y1: 0, res0: ng === "ls" ? 30 : 10}), N = g.w * g.h;
    const vung = V.mp && V.mp.length ? CORE.rasterizeRings(CORE.polysToPixRings(g, V.mp), g.w, g.h) : null;
    let nV = N; if (vung) { nV = 0; for (let i = 0; i < N; i++) if (vung[i]) nV++; }
    if (nV < 4) throw new Error(T("phạm vi quá nhỏ"));
    const nam = hqNamDS(o.nguon).filter(y => y >= o.A && y <= o.B); if (nam.length < 2) throw new Error(T("cần ít nhất hai năm có ảnh trong khoảng"));
    const p0 = CORE.m2ll(g.bb[0], g.bb[1]), p1 = CORE.m2ll(g.bb[2], g.bb[3]);
    const X = {o, g, N, nV, vung, ng, c, tok, luoi: {}, bl: [p0[0], p0[1], p1[0], p1[1]], loi: 0};
    const ky = [], tg = HQC.tong(N), soNam = new Uint8Array(N), st = {}, Vy = {}, nMin = canh ? o.nMin : 2;
    let truoc = null;
    hqTien(0);
    for (let k = 0; k < nam.length; k++) {
      const y = nam[k]; if (!canh) hqTT(T("đang đọc ảnh năm {y}…", {y}));
      const r = canh ? await hqDocCanh(y, X, k, nam.length) : await hqDocTH(y, X); hqDung(X);
      st[y] = r.st; if (r.V) Vy[y] = r.V; if (!canh) hqTien((k + 1) / nam.length);
      if (truoc) { const R = HQC.ky([{S: truoc.S, d: 0}, {S: r.S, d: y - truoc.y}], N, {nMin, dau: true, cuoi: true}, vung);
        ky.push({k: truoc.y + "-" + y, a: truoc.y, b: y, cap: true, R}); }
      HQC.congDich(tg, r.S, y - nam[0]); for (let i = 0; i < N; i++) if (r.S.n[i] && soNam[i] < 255) soNam[i]++;
      truoc = {y, S: r.S}; await new Promise(res => setTimeout(res, 0));
    }
    if (nam.length > 2) { const R = HQC.ky([{S: tg, d: 0}], N, {nMin}, vung);
      for (let i = 0; i < N; i++) if (soNam[i] < 2) { R.a[i] = NaN; R.r2[i] = NaN; R.n[i] = 0; }
      ky.push({k: "all", a: nam[0], b: nam[nam.length - 1], cap: false, R}); }
    const lat = CORE.m2ll((g.bb[0] + g.bb[2]) / 2, (g.bb[1] + g.bb[3]) / 2)[1];
    const K = {o, g, N, nV, vung, ng, canh, cs: {id: c.id, ten: c.ten}, ten: V.ten, mp: V.mp || null, nam, st, V: Vy, ky,
               xaIdx: VG.xa && VG.xa.length && typeof vgXaIdx === "function" ? vgXaIdx(g) : null, res: g.res * Math.cos(lat * Math.PI / 180), loi: X.loi, luc: new Date().toISOString()};
    hqPhanCap(K); HQ.kq = K; HQ.ky = ky.some(q => q.k === HQ.ky) ? HQ.ky : (ky.find(q => !q.cap) || ky[ky.length - 1] || {}).k;
    HQ.diem = null; hq$("hqDiem").innerHTML = ""; hq$("hqDiemTT").textContent = "";
    hq$("hqKQ").hidden = false; hqVeHet();
    const nc = Object.values(st).reduce((s, q) => s + q.dung, 0);
    hqTT(T("xong: {n} năm, {k} kỳ", {n: nam.length, k: ky.length}) + (canh ? " · " + T("{c} cảnh dùng được", {c: nc}) : "") + (X.loi ? " · " + T("{e} cảnh lỗi đọc (bỏ qua)", {e: X.loi}) : ""));
  } catch (e) { if (tok === HQ.tok && !e.dung) hqTT(T("lỗi: ") + (typeof vgLoiDoc === "function" ? vgLoiDoc(e) : (e.message || e))); }
  finally { if (tok === HQ.tok) { HQ.chay = false; hqNutChay(); hqTien(null); } if (typeof TIFF_PT !== "undefined" && TIFF_PT.clear) TIFF_PT.clear(); }
}

/* ---------------- phân cấp, diện tích ---------------- */
function hqPhanCap(K) {
  const o = HQ.o, g = K.g, ra = CORE.rowArea(g);
  K.ky.forEach(ky => {
    const [t1, t2] = hqNgDai(o, ky); ky.t1 = t1; ky.t2 = t2;
    if (o.yn && !ky.P) ky.P = HQC.pMang(ky.R);
    ky.cls = HQC.phanCap(ky.R, t1, t2, o.yn ? ky.P : null, o.alpha); ky.yn = o.yn; ky.alpha = o.alpha;
    const dt = new Float64Array(6), tbA = new Float64Array(6), dem = new Float64Array(6), xa = {}; let sR = 0, nR = 0, sN = 0, nN = 0;
    for (let j = 0; j < g.h; j++) { const a = ra[j] / 1e4;
      for (let x = 0; x < g.w; x++) { const i = j * g.w + x, k = ky.cls[i]; if (!k) continue;
        dt[k] += a; tbA[k] += ky.R.a[i]; dem[k]++; sN += ky.R.n[i]; nN++; const r2 = ky.R.r2[i]; if (r2 === r2) { sR += r2; nR++; }
        if (K.xaIdx && K.xaIdx[i]) { const q = xa[K.xaIdx[i]] || (xa[K.xaIdx[i]] = new Float64Array(6)); q[k] += a; } } }
    ky.dt = dt; ky.tbA = Array.from(tbA, (s, k) => (dem[k] ? s / dem[k] : NaN)); ky.xa = xa; ky.r2tb = nR ? sR / nR : NaN; ky.ntb = nN ? sN / nN : NaN;
    ky.tong = dt[1] + dt[2] + dt[3] + dt[4] + dt[5]; ky.giam = dt[1] + dt[2]; ky.tang = dt[4] + dt[5];
  });
}
function hqKyDang() { const K = HQ.kq; return K ? K.ky.find(q => q.k === HQ.ky) || K.ky[K.ky.length - 1] : null; }
function hqPCua(ky) { return ky.P || (ky.P = HQC.pMang(ky.R)); }
function hqVeHet() {
  const K = HQ.kq; if (!K) return;
  hq$("hqKy").innerHTML = K.ky.map(q => `<option value="${esc(q.k)}">${esc(hqKyTen(q))}</option>`).join(""); hq$("hqKy").value = (hqKyDang() || {}).k;
  hq$("hqXem").value = HQ.o.xem; hq$("hqOp").value = HQ.o.op;
  hqVe(); hqTom(); hqBang(); hqBieuDo(); hqTheoXa(); if (HQ.tab === "lp") hqVePA(); if (HQ.diem) hqVeDiem();
}

/* ---------------- bản đồ ---------------- */
function hqMauDoc(v, lo, hi, mau) {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))) * (mau.length - 1), k = Math.min(mau.length - 2, Math.floor(t)), f = t - k;
  const a = v28Rgb(mau[k]), b = v28Rgb(mau[k + 1]); return [0, 1, 2].map(q => Math.round(a[q] + (b[q] - a[q]) * f));
}
function hqNMax(ky) { let m = 1; for (let i = 0; i < ky.R.n.length; i++) if (ky.cls[i] && ky.R.n[i] > m) m = ky.R.n[i]; return m; }
function hqCanvas(K, ky, mode) {
  const g = K.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return null;
  const img = ctx.createImageData(g.w, g.h), d = img.data, lm = HQ_MAU.map(h => h && v28Rgb(h)), pal = HQ_MAU.slice(1), lo = -1.5 * ky.t2, hi = 1.5 * ky.t2;
  const P = mode === "p" ? hqPCua(ky) : null, pm = HQ_P.map(q => v28Rgb(q[1])), nMax = mode === "n" ? hqNMax(ky) : 1;
  for (let i = 0; i < K.N; i++) { const k = ky.cls[i]; if (!k) continue; let o = null;
    if (mode === "lop") o = lm[k];
    else if (mode === "a") o = hqMauDoc(ky.R.a[i], lo, hi, pal);
    else if (mode === "r2") { const r = ky.R.r2[i]; o = r === r ? hqMauDoc(r, 0, 1, ["#ffffff", "#8e44ad"]) : [200, 200, 200]; }
    else if (mode === "p") { const p = P[i]; if (p === p) { let q = 0; while (!(p < HQ_P[q][0])) q++; o = pm[q]; } else o = [200, 200, 200]; }
    else if (mode === "n") { const v = Math.round(255 * Math.min(1, ky.R.n[i] / nMax)); o = [v, v, v]; }
    if (o) { d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 255; } }
  ctx.putImageData(img, 0, 0); return c;
}
function hqCGMuc(K, ky, mode) {                          // [{mau | ramp, ten}] cho chú giải trên trang và bản đồ in
  if (mode === "lop") return [1, 2, 3, 4, 5].map(k => ({mau: HQ_MAU[k], ten: T(HQ_TEN[k]), kieu: "o"}));
  if (mode === "a") return [Object.assign(xbRamp("", HQ_MAU.slice(1), (-1.5 * ky.t2).toFixed(3), "+" + (1.5 * ky.t2).toFixed(3)), {ten: T("hệ số góc {c}/năm", {c: K.cs.ten}) + `: ${(-1.5 * ky.t2).toFixed(3)} .. +${(1.5 * ky.t2).toFixed(3)}`})];
  if (mode === "r2") return [Object.assign(xbRamp("", ["#ffffff", "#8e44ad"], "0", "1"), {ten: "R²: 0 .. 1"})];
  if (mode === "p") return HQ_P.map(q => ({mau: q[1], ten: q[2], kieu: "o"}));
  return [Object.assign(xbRamp("", ["#000000", "#ffffff"], "0", String(hqNMax(ky))), {ten: T("số lần quan sát") + `: 0 .. ${hqNMax(ky)}`})];
}
function hqVe() {
  const K = HQ.kq, ky = hqKyDang(); if (HQ.hien) { map.removeLayer(HQ.hien); HQ.hien = null; }
  const leg = hq$("hqLeg"); if (!K || !ky) { leg.innerHTML = ""; return; }
  const mode = HQ.o.xem; if (mode === "tat") { leg.innerHTML = ""; return; }
  const c = hqCanvas(K, ky, mode); if (!c) return; const g = K.g, A0 = CORE.m2ll(g.bb[0], g.bb[1]), B0 = CORE.m2ll(g.bb[2], g.bb[3]);
  HQ.hien = L.imageOverlay(c.toDataURL(), [[A0[1], A0[0]], [B0[1], B0[0]]], {opacity: HQ.o.op, interactive: false, pmIgnore: true, zIndex: 460}).addTo(map);
  const el = HQ.hien.getElement && HQ.hien.getElement(); if (el) el.style.imageRendering = "pixelated";
  HQ.canvas = c;
  const muc = hqCGMuc(K, ky, mode), tieu = mode === "lop" ? `<span><b>${esc(hqKyTen(ky))}</b> · ${T("ngưỡng")} ${+ky.t1.toFixed(4)} / ${+ky.t2.toFixed(4)}${ky.yn ? ` · p < ${ky.alpha}` : ""}</span>` : `<span><b>${esc(hqKyTen(ky))}</b></span>`;
  leg.innerHTML = `<div class="leg">${tieu}` + muc.map(m => m.ramp ? `<span><i class="ramp28" style="background:linear-gradient(90deg,${m.ramp.join(",")})"></i> ${esc(m.ten)}</span>`
    : `<span><i style="background:${m.mau}"></i>${esc(m.ten)}${mode === "lop" ? ` <span class="mu">${ky.dt[HQ_MAU.indexOf(m.mau)].toFixed(1)} ${T("ha")}</span>` : ""}</span>`).join("") + "</div>";
}

/* ---------------- nhận định, bảng, biểu đồ ---------------- */
function hqSo(v, k) { if (!isFinite(v)) return "–"; const s = v.toFixed(k == null ? 1 : k); return /^-0(\.0*)?$/.test(s) ? s.slice(1) : s; }
function hqDau(v) { return (v >= 0 ? "+" : "") + v.toFixed(1); }
function hqNguonTen(K) { return T((HQ_NGUON.find(q => q[0] === K.o.nguon) || [0, ""])[1]); }
function hqTom() {
  const K = HQ.kq; if (!K) return; const o = K.o, cap = K.ky.filter(q => q.cap), ca = K.ky.find(q => !q.cap), pct = (v, t) => (100 * v / Math.max(t, 1e-9)).toFixed(1);
  let h = `<p>${T("Phạm vi: {v}; chỉ số {c}; {ng}; {a}–{b}.", {v: esc(K.ten || ""), c: esc(K.cs.ten), ng: esc(hqNguonTen(K)), a: K.nam[0], b: K.nam[K.nam.length - 1]})} `;
  if (K.canh) { const tim = K.nam.reduce((s, y) => s + K.st[y].tim, 0), dung = K.nam.reduce((s, y) => s + K.st[y].dung, 0), q = K.nam.reduce((s, y) => s + K.st[y].quan, 0) / Math.max(1, K.nV) / K.nam.length;
    h += T("Tháng {t1}–{t2}, mây cảnh ≤ {m} %: {d} ngày chụp có điểm ảnh quang đãng trong phạm vi (trong {n} cảnh tìm thấy); trung bình {q} lần quan sát quang đãng mỗi điểm ảnh mỗi năm.",
      {t1: o.t1, t2: o.t2, m: o.may, d: dung, n: tim, q: q.toFixed(1)}); }
  else h += T("Mỗi năm một ảnh tổng hợp của bộ dữ liệu: với cặp năm liền kề, hệ số góc là hiệu chỉ số giữa hai năm, R² = 1 và không có p.");
  h += `</p><p>${T("Hệ số góc a: bình phương nhỏ nhất của {c} theo thời gian (năm thập phân) trên mọi lần quan sát của kỳ, đơn vị {c}/năm (công thức 18, 19 của luận án). Cặp năm liền kề: |a| ≤ {c1} ổn định, {c1} < |a| ≤ {c2} vừa, |a| > {c2} mạnh.", {c: esc(K.cs.ten), c1: o.c1, c2: o.c2})}`;
  if (ca) h += " " + T("Cả khoảng: {t1} / {t2} ({ng}).", {t1: +ca.t1.toFixed(4), t2: +ca.t2.toFixed(4), ng: esc(T(o.ngD === "gee" ? "mã GEE ChuyenDoiXanh" : o.ngD === "tu" ? "tự đặt" : "quy đổi theo độ dài khoảng"))});
  if (o.yn) h += " " + T("Điểm ảnh có p ≥ {a} tính là ổn định.", {a: o.alpha});
  h += "</p>";
  if (cap.length) {
    const mg = cap.reduce((a, b) => (b.giam > a.giam ? b : a)), mt = cap.reduce((a, b) => (b.tang > a.tang ? b : a)), mb = cap.reduce((a, b) => (b.tang - b.giam < a.tang - a.giam ? b : a));
    const G = cap.reduce((s, q) => s + q.giam, 0), Tg = cap.reduce((s, q) => s + q.tang, 0);
    h += `<p>${T("Theo cặp năm liền kề: giảm nhiều nhất {a} ({g} ha, trong đó giảm mạnh {gm} ha); tăng nhiều nhất {b} ({t} ha); cân bằng âm nhất {c} ({cb} ha). Cộng qua {n} cặp: giảm {G} ha, tăng {Tt} ha, cân bằng {B} ha.",
      {a: hqKyTen(mg), g: mg.giam.toFixed(1), gm: mg.dt[1].toFixed(1), b: hqKyTen(mt), t: mt.tang.toFixed(1), c: hqKyTen(mb), cb: hqDau(mb.tang - mb.giam), n: cap.length, G: G.toFixed(1), Tt: Tg.toFixed(1), B: hqDau(Tg - G)})}</p>`;
  }
  if (ca) { const P = K.canh ? hqPCua(ca) : null; let ns = 0, nc = 0; if (P) for (let i = 0; i < K.N; i++) if (ca.cls[i]) { nc++; if (P[i] < 0.05) ns++; }
    h += `<p>${T("Cả khoảng {a}–{b}: giảm {g} ha ({pg} %), ổn định {o} ha ({po} %), tăng {t} ha ({pt} %); R² trung bình {r}.",
      {a: ca.a, b: ca.b, g: ca.giam.toFixed(1), pg: pct(ca.giam, ca.tong), o: ca.dt[3].toFixed(1), po: pct(ca.dt[3], ca.tong), t: ca.tang.toFixed(1), pt: pct(ca.tang, ca.tong), r: hqSo(ca.r2tb, 3)})}` +
      (P && nc ? " " + T("{p} % điểm ảnh có hệ số góc khác 0 có ý nghĩa (p < 0.05).", {p: (100 * ns / nc).toFixed(1)}) : "") + "</p>"; }
  h += `<p class="mu sm">${T("Theo luận án, ngưỡng 0.1 / 0.2 ứng với hồi quy bước năm; khoảng nhiều năm cho hệ số góc nhỏ hơn nên trang quy đổi ngưỡng (một bước nhảy Δ ở giữa khoảng S năm cho a = 1.5·Δ/S). Ghép với bản đồ lớp phủ hằng năm (thẻ «Lớp phủ») để tách thay đổi bền, vd. đất nông nghiệp thành xây dựng, khỏi dao động mùa vụ và thời tiết. p là danh nghĩa: chưa tính tự tương quan và chu kỳ mùa của chuỗi.")}</p>`;
  hq$("hqTom").innerHTML = h;
}
function hqSw(k) { return `<i class="hq-sw" style="background:${HQ_MAU[k]}"></i>`; }
function hqBang() {
  const K = HQ.kq; if (!K) return; const cap = K.ky.filter(q => q.cap), ca = K.ky.find(q => !q.cap);
  const dong = (q, ten, cls) => `<tr${cls ? ` class="${cls}"` : ""}><td>${ten}</td>` + [1, 2, 3, 4, 5].map(k => `<td class="so">${q.dt ? q.dt[k].toFixed(1) : (q[k] != null ? q[k].toFixed(1) : "–")}</td>`).join("") +
    `<td class="so"><b>${hqDau(q.dt ? q.tang - q.giam : q.cb)}</b></td><td class="so">${q.dt ? hqSo(q.r2tb, 3) : ""}</td><td class="so">${q.dt ? hqSo(q.ntb, 1) : ""}</td></tr>`;
  let h = `<p class="mu sm">${T("Diện tích (ha) từng cấp hệ số góc {c} theo kỳ; cân bằng = (tăng vừa + tăng mạnh) − (giảm vừa + giảm mạnh), như bảng 25 của luận án.", {c: esc(K.cs.ten)})}<button class="hq-luu" type="button" data-csv="ky">CSV</button></p>`;
  h += `<table><tr><th>${T("Kỳ")}</th>` + [1, 2, 3, 4, 5].map(k => `<th class="so">${hqSw(k)}${esc(T(HQ_TEN[k]))}</th>`).join("") + `<th class="so">${T("cân bằng")}</th><th class="so">R²</th><th class="so">n</th></tr>`;
  cap.forEach(q => { h += dong(q, `${q.a}–${q.b}`); });
  if (cap.length > 1) { const s = {1: 0, 2: 0, 4: 0, 5: 0}; cap.forEach(q => [1, 2, 4, 5].forEach(k => { s[k] += q.dt[k]; })); s.cb = s[4] + s[5] - s[1] - s[2]; h += dong(s, T("cộng các cặp"), "tong"); }
  if (ca) h += dong(ca, esc(hqKyTen(ca)), "tong");
  h += "</table>";
  if (ca) h += `<p class="mu sm">${T("Cả khoảng: {t1} / {t2} ({ng}).", {t1: +ca.t1.toFixed(4), t2: +ca.t2.toFixed(4), ng: esc(T(K.o.ngD === "gee" ? "mã GEE ChuyenDoiXanh" : K.o.ngD === "tu" ? "tự đặt" : "quy đổi theo độ dài khoảng"))})}</p>`;
  h += `<p class="mu sm" style="margin-top:8px">${T("Ảnh dùng theo năm")}</p><table><tr><th>${T("Năm")}</th>` +
    (K.canh ? `<th class="so">${T("cảnh tìm thấy")}</th><th class="so">${T("đã đọc")}</th><th class="so">${T("ngày chụp dùng được")}</th>` : "") + `<th class="so">${T("quan sát TB / điểm ảnh")}</th></tr>` +
    K.nam.map(y => { const s = K.st[y]; return `<tr><td>${y}</td>` + (K.canh ? `<td class="so">${s.tim}</td><td class="so">${s.doc}</td><td class="so">${s.dung}</td>` : "") + `<td class="so">${(s.quan / Math.max(1, K.nV)).toFixed(1)}</td></tr>`; }).join("") + "</table>";
  hq$("hqBang").innerHTML = h;
  hq$("hqBang").querySelector("[data-csv]").onclick = hqCSV;
}
function hqBieuDo() {
  const K = HQ.kq, ky = hqKyDang(); if (!K || !ky) return; const cap = K.ky.filter(q => q.cap); let h = "";
  const luu = ten => `<button class="hq-luu" type="button" data-svg="${ten}">SVG</button>`;
  if (cap.length) {                                     // cột chồng: tăng trên, giảm dưới; chấm là cân bằng
    const W = 420, H = 190, m = Math.max(...cap.map(c => Math.max(c.giam, c.tang)), 1e-9), y0 = 92, sc = 72 / m, cw = (W - 56) / cap.length;
    let s = `<svg data-ten="cap_nam" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif"><line x1="44" x2="${W}" y1="${y0}" y2="${y0}" stroke="#667085"/>` +
      `<text x="2" y="12" font-size="9" fill="#667085">${T("ha")}</text><text x="2" y="${y0 - 66}" font-size="9" fill="#667085">+${m.toFixed(0)}</text><text x="2" y="${y0 + 74}" font-size="9" fill="#667085">-${m.toFixed(0)}</text>`;
    const cb = [];
    cap.forEach((c, k) => { const w = Math.min(cw * 0.66, 34), x = 50 + k * cw + (cw * 0.66 - w) / 2; let yu = y0, yd = y0;
      [4, 5].forEach(q => { const hq = c.dt[q] * sc; yu -= hq; s += `<rect x="${x.toFixed(1)}" y="${yu.toFixed(1)}" width="${w.toFixed(1)}" height="${hq.toFixed(1)}" fill="${HQ_MAU[q]}" stroke="#98a2b3" stroke-width="0.3"><title>${c.a}–${c.b} ${esc(T(HQ_TEN[q]))}: ${c.dt[q].toFixed(1)} ${T("ha")}</title></rect>`; });
      [2, 1].forEach(q => { const hq = c.dt[q] * sc; s += `<rect x="${x.toFixed(1)}" y="${yd.toFixed(1)}" width="${w.toFixed(1)}" height="${hq.toFixed(1)}" fill="${HQ_MAU[q]}" stroke="#98a2b3" stroke-width="0.3"><title>${c.a}–${c.b} ${esc(T(HQ_TEN[q]))}: ${c.dt[q].toFixed(1)} ${T("ha")}</title></rect>`; yd += hq; });
      cb.push([x + w / 2, y0 - (c.tang - c.giam) * sc, c]);
      s += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 4}" font-size="9" text-anchor="middle" fill="#344054">${String(c.a).slice(2)}–${String(c.b).slice(2)}</text>`; });
    s += `<polyline points="${cb.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ")}" fill="none" stroke="#111" stroke-width="1" stroke-dasharray="3 2"/>` +
      cb.map(q => `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="2.6" fill="#111"><title>${q[2].a}–${q[2].b} ${T("cân bằng")}: ${hqDau(q[2].tang - q[2].giam)} ${T("ha")}</title></circle>`).join("") + "</svg>";
    h += `<p class="mu sm">${T("Tăng (trên) và giảm (dưới) theo cặp năm liền kề; chấm đen: cân bằng")}${luu("cap_nam")}</p>` + s;
  }
  {                                                     // tần suất hệ số góc của kỳ đang chọn
    const lo = -2.5 * ky.t2, hi = 2.5 * ky.t2, nb = 60, hh = new Array(nb).fill(0), W = 420, H = 140, buoc = Math.max(1, Math.floor(K.N / 200000));
    for (let i = 0; i < K.N; i += buoc) { if (!ky.cls[i]) continue; const k = Math.max(0, Math.min(nb - 1, Math.floor((ky.R.a[i] - lo) / (hi - lo) * nb))); hh[k]++; }
    const mx = Math.max(...hh.map(x => Math.log10(1 + x)), 1), bw = (W - 40) / nb, X = v => 34 + (v - lo) / (hi - lo) * (W - 40);
    let s = `<svg data-ten="tan_suat" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`;
    hh.forEach((c, k) => { const y = (H - 24) * Math.log10(1 + c) / mx, v = lo + (k + 0.5) / nb * (hi - lo); s += `<rect x="${(34 + k * bw).toFixed(1)}" y="${(H - 18 - y).toFixed(1)}" width="${(bw - 0.4).toFixed(1)}" height="${y.toFixed(1)}" fill="${HQ_MAU[HQC.lop(v, ky.t1, ky.t2)]}" stroke="#98a2b3" stroke-width="0.3"/>`; });
    [-ky.t2, -ky.t1, ky.t1, ky.t2].forEach(t => { s += `<line x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="4" y2="${H - 18}" stroke="#111" stroke-dasharray="3 3"/>`; });
    [lo, -ky.t2, 0, ky.t2, hi].forEach((v, q) => { s += `<text x="${X(v).toFixed(1)}" y="${H - 5}" font-size="8.5" text-anchor="${q === 0 ? "start" : q === 4 ? "end" : "middle"}" fill="#667085">${v === 0 ? 0 : +v.toFixed(3)}</text>`; });
    s += `<text x="2" y="10" font-size="9" fill="#667085">log</text></svg>`;
    h += `<p class="mu sm">${T("Tần suất hệ số góc {k} (thang log, màu theo cấp, vạch là ngưỡng)", {k: esc(hqKyTen(ky))})}${luu("tan_suat")}</p>` + s;
  }
  {                                                     // số lần quan sát theo năm
    const W = 420, H = 120, n = K.nam.length, v = K.nam.map(y => K.st[y].quan / Math.max(1, K.nV)), m = Math.max(...v, 1e-9), cw = (W - 40) / n;
    let s = `<svg data-ten="quan_sat" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif"><line x1="34" x2="${W}" y1="${H - 18}" y2="${H - 18}" stroke="#667085"/>`;
    K.nam.forEach((y, k) => { const hgt = (H - 34) * v[k] / m, x = 38 + k * cw;
      s += `<rect x="${x.toFixed(1)}" y="${(H - 18 - hgt).toFixed(1)}" width="${(cw * 0.7).toFixed(1)}" height="${hgt.toFixed(1)}" fill="#0b63ce" opacity="0.75"><title>${y}: ${v[k].toFixed(1)}${K.canh ? ` · ${K.st[y].dung} ${T("ngày chụp")}` : ""}</title></rect>` +
        `<text x="${(x + cw * 0.35).toFixed(1)}" y="${(H - 21 - hgt).toFixed(1)}" font-size="8.5" text-anchor="middle" fill="#344054">${v[k].toFixed(v[k] < 10 ? 1 : 0)}</text>` +
        `<text x="${(x + cw * 0.35).toFixed(1)}" y="${H - 5}" font-size="8.5" text-anchor="middle" fill="#344054">${n > 12 ? String(y).slice(2) : y}</text>`; });
    s += "</svg>";
    h += `<p class="mu sm">${T("Số lần quan sát quang đãng trung bình mỗi điểm ảnh theo năm")}${luu("quan_sat")}</p>` + s;
  }
  hq$("hqBD").innerHTML = h;
}
function hqTenXa(i) { return ((VG.xa || []).find(x => x.i === +i) || {}).ten || String(i); }
function hqTheoXa() {
  const K = HQ.kq, ky = hqKyDang(); if (!K || !ky) return;
  if (!K.xaIdx) { hq$("hqXa").innerHTML = `<p class="mu sm">${T("Chưa có ranh giới xã của tỉnh đang chọn.")}</p>`; return; }
  const ds = Object.entries(ky.xa).map(([i, o]) => ({ten: hqTenXa(i), o, g: o[1] + o[2], t: o[4] + o[5], s: o[1] + o[2] + o[3] + o[4] + o[5]})).filter(r => r.s > 0).sort((a, b) => b.g - a.g);
  let h = `<p class="mu sm">${T("Kỳ {k}: diện tích (ha) theo xã, phường, xếp theo diện tích giảm.", {k: esc(hqKyTen(ky))})}</p><table><tr><th>${T("xã, phường")}</th>` +
    [1, 2, 4, 5].map(k => `<th class="so">${hqSw(k)}${esc(T(HQ_TEN[k]))}</th>`).join("") + `<th class="so">${T("cân bằng")}</th><th class="so">${T("% giảm")}</th></tr>`;
  h += ds.slice(0, 40).map(r => `<tr><td>${esc(r.ten)}</td>` + [1, 2, 4, 5].map(k => `<td class="so">${r.o[k].toFixed(1)}</td>`).join("") + `<td class="so">${hqDau(r.t - r.g)}</td><td class="so">${(100 * r.g / r.s).toFixed(1)}</td></tr>`).join("") + "</table>";
  if (ds.length > 40) h += `<p class="mu sm">${T("… và {n} xã khác (đủ trong CSV)", {n: ds.length - 40})}</p>`;
  hq$("hqXa").innerHTML = h;
}

/* ---------------- đối chiếu bản đồ lớp phủ ---------------- */
function hqVePA() {
  const s = hq$("hqPA"), ds = typeof paDS === "function" ? paDS() : [], cu = s.value;
  s.innerHTML = ds.map(pa => `<option value="${esc(pa.id)}">${esc(paTen(pa))}</option>`).join("") || `<option value="">${esc(T("(chưa có bản đồ lớp phủ)"))}</option>`;
  if (ds.some(pa => pa.id === cu)) s.value = cu; hqVeNamPA();
}
function hqVeNamPA() {
  const pa = (typeof paDS === "function" ? paDS() : []).find(q => q.id === hq$("hqPA").value), s = hq$("hqPANam"), ky = hqKyDang();
  const ys = pa ? (pa.nam && pa.nam.length ? pa.nam.slice().sort((a, b) => a - b) : [""]) : [];
  s.innerHTML = ys.map(y => `<option value="${y}">${y === "" ? esc(T("(một lớp)")) : y}</option>`).join("");
  if (ky && ys.length && ys[0] !== "") { const t = ys.reduce((a, b) => (Math.abs(b - ky.a) < Math.abs(a - ky.a) ? b : a)); s.value = t; }
}
async function hqLopPhu() {
  const K = HQ.kq, ky = hqKyDang(), pa = (typeof paDS === "function" ? paDS() : []).find(q => q.id === hq$("hqPA").value); if (!K || !ky || !pa) return;
  const y = hq$("hqPANam").value === "" ? null : +hq$("hqPANam").value, out = hq$("hqLP"); out.textContent = T("đang đọc bản đồ lớp phủ…");
  try {
    const ma = await paDoc(pa, K.g, y); if (!ma) throw new Error(T("bản đồ không có năm này"));
    const ra = CORE.rowArea(K.g), M = {};
    for (let j = 0; j < K.g.h; j++) { const a = ra[j] / 1e4; for (let x = 0; x < K.g.w; x++) { const i = j * K.g.w + x, k = ky.cls[i]; if (!k) continue; const v = ma[i]; if (!v) continue;
      const o = M[v] || (M[v] = new Float64Array(6)); o[k] += a; } }
    const ds = Object.entries(M).map(([v, o]) => ({v: +v, o, s: o[1] + o[2] + o[3] + o[4] + o[5], g: o[1] + o[2], t: o[4] + o[5]})).sort((a, b) => b.s - a.s);
    if (!ds.length) throw new Error(T("bản đồ lớp phủ không phủ phạm vi kết quả"));
    const G = ds.reduce((s, r) => s + r.g, 0), Tt = ds.reduce((s, r) => s + r.t, 0), mau = v => (pa.lop[v] || {}).mau || "#999";
    let h = `<p class="mu sm">${T("Kỳ {k} × {pa} năm {y} (ha).", {k: esc(hqKyTen(ky)), pa: esc(paTen(pa)), y: y == null ? "" : y})}<button class="hq-luu" type="button" data-lpcsv>CSV</button></p><table><tr><th>${T("lớp phủ")}</th>` +
      [1, 2, 3, 4, 5].map(k => `<th class="so">${hqSw(k)}${esc(T(HQ_TEN[k]))}</th>`).join("") + `<th class="so">${T("cân bằng")}</th><th class="so">${T("% giảm")}</th></tr>`;
    h += ds.map(r => `<tr><td><i class="hq-sw" style="background:${mau(r.v)}"></i>${esc(paLopTen(pa, r.v))}</td>` + [1, 2, 3, 4, 5].map(k => `<td class="so">${r.o[k].toFixed(1)}</td>`).join("") +
      `<td class="so">${hqDau(r.t - r.g)}</td><td class="so">${(100 * r.g / Math.max(r.s, 1e-9)).toFixed(1)}</td></tr>`).join("") + "</table>";
    const top = ds.filter(r => r.g > 0).sort((a, b) => b.g - a.g).slice(0, 3);
    if (top.length && G > 0) h += `<p>${T("Giảm (vừa + mạnh) {G} ha, tập trung ở: {ds}.", {G: G.toFixed(1), ds: top.map(r => `${esc(paLopTen(pa, r.v))} ${r.g.toFixed(1)} ${T("ha")} (${(100 * r.g / G).toFixed(0)} %)`).join("; ")})}` +
      (Tt > 0 ? " " + T("Tăng (vừa + mạnh) {t} ha, nhiều nhất ở {l}.", {t: Tt.toFixed(1), l: esc(paLopTen(pa, ds.slice().sort((a, b) => b.t - a.t)[0].v))}) : "") + "</p>";
    out.innerHTML = h;
    out.querySelector("[data-lpcsv]").onclick = () => download(`hoi_quy_lop_phu_${v28TenTep(K.cs.ten)}_${ky.k}_${v28TenTep(paTen(pa))}_${stamp()}.csv`,
      CORE.toCSV([].concat(...ds.map(r => [1, 2, 3, 4, 5].map(k => ({ky: hqKyTen(ky), lop_phu: paLopTen(pa, r.v), ma_lop: r.v, cap: k, ten_cap: T(HQ_TEN[k]), dien_tich_ha: +r.o[k].toFixed(3)})))), ["ky", "lop_phu", "ma_lop", "cap", "ten_cap", "dien_tich_ha"]), "text/csv");
  } catch (e) { out.textContent = T("lỗi: ") + (e.message || e); }
}

/* ---------------- chuỗi tại điểm ---------------- */
function hqChonDiem() {
  const K = HQ.kq; if (!K) return; const box = map.getContainer(), p = document.createElement("div"); p.id = "hqChonP";
  p.innerHTML = `<span>${esc(T("Nhấp lên bản đồ trong phạm vi kết quả để xem chuỗi quan sát (Esc: thôi)"))}</span>`;
  const xong = ll => { p.remove(); document.removeEventListener("keydown", phim, true); if (ll) hqDiemChay(ll); };
  const phim = e => { if (e.key === "Escape") { e.preventDefault(); xong(null); } };
  p.addEventListener("click", e => { e.stopPropagation(); xong(map.mouseEventToLatLng(e)); });
  document.addEventListener("keydown", phim, true); box.appendChild(p);
}
function hqDiemPix(K, ll) { const q = CORE.llToPix(K.g, ll.lng, ll.lat), x = Math.floor(q[0]), y = Math.floor(q[1]); return x < 0 || y < 0 || x >= K.g.w || y >= K.g.h ? -1 : y * K.g.w + x; }
async function hqDiemChay(ll) {
  const K = HQ.kq; if (!K) return; const i = hqDiemPix(K, ll), tt = hq$("hqDiemTT"); hqTab("diem");
  if (i < 0) { tt.textContent = T("điểm nằm ngoài phạm vi kết quả"); return; }
  if (HQ.dau) map.removeLayer(HQ.dau); HQ.dau = L.circleMarker([ll.lat, ll.lng], {radius: 7, color: "#111", weight: 2, fillColor: "#fff", fillOpacity: 0.6, pmIgnore: true, interactive: false}).addTo(map);
  const D = {ll, i, obs: []}, tok = HQ.diemTok = (HQ.diemTok || 0) + 1; HQ.diem = D;
  if (!K.canh) { K.nam.forEach(y => { const v = K.V[y] && K.V[y][i]; if (v === v && v != null) D.obs.push({t: y + 0.5, v, ngay: String(y)}); }); hqVeDiem(); return; }
  const c = hqCS(K.cs.id, K.o.nguon); if (!c) return; const px = K.ng === "ls" ? 30 : 10, ds = [].concat(...K.nam.map(y => K.st[y].ds));
  let xong = 0; const theoNgay = {};
  tt.textContent = T("đang đọc {n} cảnh tại điểm…", {n: ds.length});
  await hqHang(ds, 6, async sc => { if (tok !== HQ.diemTok) return;
    try { const r = await s2oDocCanh(sc, ll.lng, ll.lat, c.bang, px);
      if (r.quang && !theoNgay[sc.ngay]) { let ok = true; for (let q = 0; q < c.bang.length; q++) { const v = r.v[c.bang[q]]; if (!(v > 0)) { ok = false; break; } c.buf[c.idx[q]] = v / 10000; }
        const x = ok ? c.f(c.buf) : null; if (x != null && isFinite(x)) theoNgay[sc.ngay] = {t: HQC.namTP(sc.ngay), v: x, ngay: sc.ngay}; } }
    catch (e) { /* cảnh lỗi: bỏ */ }
    xong++; if (xong % 10 === 0 && tok === HQ.diemTok) tt.textContent = T("đang đọc cảnh tại điểm: {i}/{n}", {i: xong, n: ds.length}); });
  if (tok !== HQ.diemTok) return;
  D.obs = Object.values(theoNgay).sort((a, b) => a.t - b.t); hqVeDiem();
}
function hqVeDiem() {
  const K = HQ.kq, D = HQ.diem; if (!K || !D) return; const o = K.o, i = D.i, obs = D.obs;
  hq$("hqDiemTT").textContent = `${D.ll.lat.toFixed(5)}° N, ${D.ll.lng.toFixed(5)}° E · ${T("{n} lần quan sát", {n: obs.length})}`;
  const fit = K.ky.map(ky => { const q = obs.filter(b => { const y = hqNamMua(K, b); return y >= ky.a && y <= ky.b; });
    return {ky, f: HQC.olsDiem(q.map(b => b.t), q.map(b => b.v)), t0: q.length ? Math.min(...q.map(b => b.t)) : ky.a, t1: q.length ? Math.max(...q.map(b => b.t)) : ky.b + 1}; });
  const W = 440, H = 220, l = 40, r = 10, tp = 10, bt = 26, ts = obs.map(b => b.t), vs = obs.map(b => b.v);
  const tA = K.nam[0], tB = K.nam[K.nam.length - 1] + 1, vMin = vs.length ? Math.min(...vs) : -1, vMax = vs.length ? Math.max(...vs) : 1, pad = Math.max(0.02, (vMax - vMin) * 0.08);
  const v0 = vMin - pad, v1 = vMax + pad, X = t => l + (t - tA) / (tB - tA) * (W - l - r), Y = v => tp + (v1 - v) / (v1 - v0 || 1) * (H - tp - bt);
  const cid = "hqCat" + (HQ.svgId = (HQ.svgId || 0) + 1);
  let s = `<svg data-ten="chuoi_diem" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif"><defs><clipPath id="${cid}"><rect x="${l}" y="${tp}" width="${W - l - r}" height="${H - tp - bt}"/></clipPath></defs>`;
  K.nam.forEach((y, k) => { if (k % 2) s += `<rect x="${X(y).toFixed(1)}" y="${tp}" width="${(X(y + 1) - X(y)).toFixed(1)}" height="${H - tp - bt}" fill="#f2f4f7"/>`;
    s += `<text x="${X(y + 0.5).toFixed(1)}" y="${H - 8}" font-size="9" text-anchor="middle" fill="#344054">${K.nam.length > 12 ? String(y).slice(2) : y}</text>`; });
  [v0 + pad, (v0 + v1) / 2, v1 - pad].forEach(v => { s += `<text x="${l - 3}" y="${(Y(v) + 3).toFixed(1)}" font-size="8.5" text-anchor="end" fill="#667085">${v.toFixed(2)}</text><line x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#e4e7ec"/>`; });
  fit.forEach(q => { const f = q.f; if (!isFinite(f.a)) return; const k = q.ky.cap ? HQC.lop(f.a, q.ky.t1, q.ky.t2) : 0, x0 = q.t0, x1 = q.t1;
    s += `<line x1="${X(x0).toFixed(1)}" y1="${Y(f.a * x0 + f.b).toFixed(1)}" x2="${X(x1).toFixed(1)}" y2="${Y(f.a * x1 + f.b).toFixed(1)}" stroke="${q.ky.cap ? HQ_MAU[k] === "#ffffbf" ? "#b8a100" : HQ_MAU[k] : "#111"}" stroke-width="${q.ky.cap ? 2.2 : 1.4}" clip-path="url(#${cid})"${q.ky.cap ? "" : ' stroke-dasharray="5 3"'}><title>${esc(hqKyTen(q.ky))}: a = ${f.a.toFixed(4)}</title></line>`; });
  obs.forEach(b => { s += `<circle cx="${X(b.t).toFixed(1)}" cy="${Y(b.v).toFixed(1)}" r="2.3" fill="#0b63ce" fill-opacity="0.7"><title>${esc(b.ngay)}: ${b.v.toFixed(3)}</title></circle>`; });
  s += `<text x="4" y="${tp + 2}" font-size="9" fill="#667085">${esc(K.cs.ten)}</text></svg>`;
  let h = `<p class="mu sm">${T("Chấm: từng lần quan sát quang đãng; đoạn màu: hồi quy từng cặp năm (màu theo cấp); nét đứt: cả khoảng.")}<button class="hq-luu" type="button" data-svg="chuoi_diem">SVG</button><button class="hq-luu" type="button" data-dcsv>CSV</button></p>` + s;
  h += `<table><tr><th>${T("Kỳ")}</th><th class="so">a</th><th class="so">R²</th><th class="so">n</th><th class="so">p</th><th>${T("cấp")}</th><th class="so">${T("trên lưới")}</th></tr>` +
    fit.map(q => { const f = q.f, k = isFinite(f.a) ? HQC.lop(f.a, q.ky.t1, q.ky.t2) : 0, kk = q.ky.cls[i];
      const k2 = k && o.yn && k !== 3 && !(f.p < o.alpha) ? 3 : k;
      return `<tr><td>${esc(hqKyTen(q.ky))}</td><td class="so">${hqSo(f.a, 4)}</td><td class="so">${hqSo(f.r2, 3)}</td><td class="so">${f.n}</td><td class="so">${isFinite(f.p) ? (f.p < 0.001 ? "<0.001" : f.p.toFixed(3)) : "–"}</td>` +
        `<td>${k2 ? hqSw(k2) + esc(T(HQ_TEN[k2])) : "–"}</td><td class="so">${kk ? hqSw(kk) + hqSo(q.ky.R.a[i], 4) : "–"}</td></tr>`; }).join("") + "</table>";
  h += `<p class="mu sm">${T("«Trên lưới»: giá trị ô lưới chứa điểm (ô ≈ {m} m); có thể lệch đôi chút với chuỗi đọc đúng tại điểm.", {m: Math.round(K.res)})}</p>`;
  hq$("hqDiem").innerHTML = h;
  hq$("hqDiem").querySelector("[data-dcsv]").onclick = () => download(`hoi_quy_diem_${v28TenTep(K.cs.ten)}_${D.ll.lat.toFixed(5)}_${D.ll.lng.toFixed(5)}_${stamp()}.csv`,
    CORE.toCSV(obs.map(b => ({ngay: b.ngay, nam_thap_phan: +b.t.toFixed(5), gia_tri: +b.v.toFixed(5)})), ["ngay", "nam_thap_phan", "gia_tri"]), "text/csv");
}
function hqNamMua(K, b) {                                // năm của mùa: mùa vắt qua năm (tháng đầu > tháng cuối) thì cảnh cuối năm trước thuộc năm sau
  const y = +String(b.ngay).slice(0, 4), m = +String(b.ngay).slice(5, 7);
  return K.canh && K.o.t1 > K.o.t2 && m >= K.o.t1 ? y + 1 : y;
}
function hqTaiDiem(ll) {                                 // một dòng cho bảng giá trị tại điểm
  const K = HQ.kq, ky = hqKyDang(); if (!K || !ky) return null; const i = hqDiemPix(K, ll); if (i < 0 || !ky.cls[i]) return null;
  const P = K.canh ? hqPCua(ky) : null;
  return [`📈 ${K.cs.ten} ${hqKyTen(ky)}`, `<b>${esc(T(HQ_TEN[ky.cls[i]]))}</b> · ${T("hệ số góc")} ${ky.R.a[i].toFixed(4)}/${T("năm")} · R² ${hqSo(ky.R.r2[i], 3)} · n ${ky.R.n[i]}` + (P && P[i] === P[i] ? ` · p ${P[i] < 0.001 ? "<0.001" : P[i].toFixed(3)}` : "")];
}

/* ---------------- xuất ---------------- */
function hqTenTep(K, them) { return `hoi_quy_${v28TenTep(K.cs.ten)}_${v28TenTep(K.ten || "vung")}_${K.nam[0]}_${K.nam[K.nam.length - 1]}${them ? "_" + them : ""}_${stamp()}`; }
function hqCSV() {
  const K = HQ.kq; if (!K) return; const rows = [];
  K.ky.forEach(ky => [1, 2, 3, 4, 5].forEach(k => rows.push({bang: "ky", ky: hqKyTen(ky), tu_nam: ky.a, den_nam: ky.b, cap_nam: ky.cap ? 1 : 0, nguong_vua: +ky.t1.toFixed(5), nguong_manh: +ky.t2.toFixed(5),
    cap: k, ten_cap: T(HQ_TEN[k]), dien_tich_ha: +ky.dt[k].toFixed(3), ty_le_pct: +(100 * ky.dt[k] / Math.max(ky.tong, 1e-9)).toFixed(3), he_so_goc_tb: isFinite(ky.tbA[k]) ? +ky.tbA[k].toFixed(5) : "",
    can_bang_ha: +(ky.tang - ky.giam).toFixed(3), r2_tb: isFinite(ky.r2tb) ? +ky.r2tb.toFixed(4) : "", n_tb: isFinite(ky.ntb) ? +ky.ntb.toFixed(2) : ""})));
  K.ky.forEach(ky => Object.entries(ky.xa).forEach(([i, o]) => [1, 2, 3, 4, 5].forEach(k => { if (o[k]) rows.push({bang: "xa", ky: hqKyTen(ky), tu_nam: ky.a, den_nam: ky.b, xa: hqTenXa(i), cap: k, ten_cap: T(HQ_TEN[k]), dien_tich_ha: +o[k].toFixed(3)}); })));
  K.nam.forEach(y => { const s = K.st[y]; rows.push({bang: "nam", tu_nam: y, den_nam: y, canh_tim_thay: s.tim, canh_doc: s.doc, ngay_dung: s.dung, quan_sat_tb: +(s.quan / Math.max(1, K.nV)).toFixed(3)}); });
  download(hqTenTep(K) + ".csv", CORE.toCSV(rows, ["bang", "ky", "tu_nam", "den_nam", "cap_nam", "nguong_vua", "nguong_manh", "xa", "cap", "ten_cap", "dien_tich_ha", "ty_le_pct", "he_so_goc_tb", "can_bang_ha", "r2_tb", "n_tb",
    "canh_tim_thay", "canh_doc", "ngay_dung", "quan_sat_tb"]), "text/csv");
}
function hqTif(moiKy) {
  const K = HQ.kq, ky = hqKyDang(); if (!K || !ky) return;
  if (moiKy) { const bs = K.ky.map(q => { const a = new Float32Array(K.N).fill(NaN); for (let i = 0; i < K.N; i++) if (q.cls[i]) a[i] = q.R.a[i]; return a; });
    v28TifSo(hqTenTep(K, "he_so_goc_" + K.ky.map(q => q.cap ? String(q.a).slice(2) + String(q.b).slice(2) : "all").join("-")), K.g, bs,
      [[-ky.t2, HQ_MAU[1], (-ky.t2) + ""], [-ky.t1, HQ_MAU[2], (-ky.t1) + ""], [0, HQ_MAU[3], "0"], [ky.t1, HQ_MAU[4], ky.t1 + ""], [ky.t2, HQ_MAU[5], ky.t2 + ""]]); return; }
  const mode = HQ.o.xem;
  if (mode === "lop" || mode === "tat") { v28TifLop(hqTenTep(K, ky.k + "_cap"), K.g, ky.cls, null, [1, 2, 3, 4, 5].map(k => ({ma: k, ten: T(HQ_TEN[k]), mau: HQ_MAU[k]}))); return; }
  const P = hqPCua(ky), f = a => { const o = new Float32Array(K.N).fill(NaN); for (let i = 0; i < K.N; i++) if (ky.cls[i]) o[i] = a[i]; return o; };
  v28TifSo(hqTenTep(K, ky.k + "_a_r2_p_n"), K.g, [f(ky.R.a), f(ky.R.r2), f(P), f(Float32Array.from(ky.R.n))],
    [[-ky.t2, HQ_MAU[1], (-ky.t2) + ""], [-ky.t1, HQ_MAU[2], (-ky.t1) + ""], [0, HQ_MAU[3], "0"], [ky.t1, HQ_MAU[4], ky.t1 + ""], [ky.t2, HQ_MAU[5], ky.t2 + ""]]);
}
function hqGeo() {
  const K = HQ.kq, ky = hqKyDang(); if (!K || !ky) return; const fs = [];
  [1, 2, 4, 5].forEach(k => { if (!ky.dt[k]) return; const m = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (ky.cls[i] === k) m[i] = 1;
    CORE.vectorize(m, K.g, 1).forEach(pg => fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: pg},
      properties: {cap: k, ten_cap: T(HQ_TEN[k]), chi_so: K.cs.ten, ky: hqKyTen(ky), tu_nam: ky.a, den_nam: ky.b, dien_tich_ha: +(CORE.geodesicArea([pg]) / 1e4).toFixed(4)}})); });
  download(hqTenTep(K, ky.k) + ".geojson", JSON.stringify({type: "FeatureCollection", features: fs}), "application/geo+json");
}
function hqRai() {
  const K = HQ.kq, ky = hqKyDang(); if (!K || !ky) return; const n = Math.max(1, +hq$("hqNDiem").value || 10), pts = [];
  [1, 2, 3, 4, 5].forEach(k => { if (!ky.dt[k]) return; const m = new Uint8Array(K.N); for (let i = 0; i < K.N; i++) if (ky.cls[i] === k) m[i] = 1;
    CORE.samplePixels(m, n, 3190 + k).forEach(i => { const x = i % K.g.w, y = (i - x) / K.g.w, ll = CORE.pixToLL(K.g, x + 0.5, y + 0.5); pts.push({lon: ll[0], lat: ll[1], tang: k}); }); });
  const nam = []; for (let y = ky.a; y <= ky.b; y++) nam.push(y);
  taoBoTuDiem(T("kiểm tra hồi quy {c} {k}", {c: K.cs.ten, k: hqKyTen(ky)}), nam, pts, {cach: "kiem_tra_hoi_quy", tham_so: {chi_so: K.cs.ten, tu_nam: ky.a, den_nam: ky.b, nguong: [ky.t1, ky.t2], nguon: K.o.nguon}});
}

/* ---------------- nối vào phần còn lại của trang ---------------- */
const _giaTriTai319 = giaTriTai;
giaTriTai = async function (ll) { const r = await _giaTriTai319(ll), d = hqTaiDiem(ll); return d ? [d].concat(r.filter(x => !/^📈 /.test(x[0]))) : r; };
const _xbDS319 = xbDS;
xbDS = function () {                                    // kết quả hồi quy có trong Xuất bản đồ, Xếp tầng
  const ds = _xbDS319.apply(this, arguments), K = HQ.kq; if (!K || !K.ky.length) return ds;
  const md = [].concat(...["lop", "a", "r2", "p", "n"].map(m => K.ky.map(q => [m + "|" + q.k, `${T(HQ_XEM.find(x => x[0] === m)[1])} · ${hqKyTen(q)}`])));
  const m0 = (HQ.o.xem === "tat" ? "lop" : HQ.o.xem) + "|" + (hqKyDang() || K.ky[0]).k;
  ds.push({k: "hq", nhom: "ket_qua", ten: T("Hồi quy {c} {a}-{b}", {c: K.cs.ten, a: K.nam[0], b: K.nam[K.nam.length - 1]}), md, md0: md.some(q => q[0] === m0) ? m0 : md[0][0],
    man: () => !!(HQ.hien && map.hasLayer(HQ.hien)), op0: () => HQ.o.op, bb: K.g.bb,
    ve: s => { const [m, k] = String(s.md || m0).split("|"), ky = K.ky.find(q => q.k === k) || K.ky[0]; return {anh: hqCanvas(K, ky, m), bb: K.g.bb}; },
    cg: s => { const [m, k] = String(s.md || m0).split("|"), ky = K.ky.find(q => q.k === k) || K.ky[0];
      const gr = {k: "hq", tieuDe: `${K.cs.ten} · ${hqKyTen(ky)}`, muc: hqCGMuc(K, ky, m)};
      if (m === "lop") gr.dem = (E, mp) => xbDem(K.g, i => (ky.cls[i] ? ky.cls[i] - 1 : undefined), 5, E, mp);
      return gr; }});
  return ds;
};
document.addEventListener("xa27", () => { if (!hq$("hqP").hidden) hqVeVung(); });
const _setLang319 = setLang;
setLang = function (l) { _setLang319(l); hqChu(); if (!hq$("hqP").hidden) { hqVeVung(); hqVeCS(); hqHien(); } if (HQ.kq) hqVeHet(); };
