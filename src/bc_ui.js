/* =============================== BẢN 2.7: XUẤT KẾT QUẢ THÀNH TỆP HTML =============================== */
/* Một tệp HTML tự chứa (CSS, bảng, biểu đồ SVG, ảnh bản đồ kết quả dạng PNG nhúng sẵn) cho: phát hiện thay đổi (kèm nhận định
   của AI), thống kê lớp phủ, phân loại từ điểm mẫu, trợ lý AI (một điểm, gán hàng loạt). Mở bằng mọi trình duyệt, in ra PDF được. */
function bcSach(el) {                          // bản sao phần kết quả, bỏ nút bấm, ô nhập, chữ ẩn
  if (!el) return "";
  const c = el.cloneNode(true);
  c.querySelectorAll("button,input,select,textarea,script,[hidden]").forEach(x => x.remove());
  c.querySelectorAll("[data-noi18n],[data-cpane],[data-tpane],[data-ppane],[data-cb],[data-aigan],[data-aidi]").forEach(x => {
    ["data-noi18n", "data-cpane", "data-tpane", "data-ppane", "data-cb", "data-aigan", "data-aidi"].forEach(a => x.removeAttribute(a)); });
  c.querySelectorAll("a[href='#']").forEach(a => a.removeAttribute("href"));
  return c.innerHTML.trim();
}
function bcAnh(cv, max) {                      // canvas kết quả -> PNG (thu nhỏ nếu quá lớn), null nếu không vẽ được
  try {
    if (!cv || !cv.width) return null;
    const s = Math.min(1, (max || 1400) / Math.max(cv.width, cv.height)), c = document.createElement("canvas"), g = c.getContext && c.getContext("2d");
    if (!g) return null;
    c.width = Math.max(1, Math.round(cv.width * s)); c.height = Math.max(1, Math.round(cv.height * s));
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, c.width, c.height);
    const u = c.toDataURL("image/png"); return u.length > 200 ? u : null;
  } catch (e) { return null; }
}
function bcKhung(g) {                          // khung địa lý của lưới (độ)
  const a = CORE.m2ll(g.bb[0], g.bb[1]), b = CORE.m2ll(g.bb[2], g.bb[3]);
  return `${a[1].toFixed(5)}, ${a[0].toFixed(5)} .. ${b[1].toFixed(5)}, ${b[0].toFixed(5)}`;
}
function bcHTML(tieuDe, thongSo, phan) {        // thongSo: [[tên, giá trị]], phan: [{h, html}]
  const gt = Object.assign({}, typeof GT_MAC === "object" ? GT_MAC : {}, (typeof SITE === "object" && SITE && SITE.gioi_thieu) || {});
  const tacGia = gt.tac_gia ? (typeof gt.tac_gia === "string" ? gt.tac_gia : (gt.tac_gia[LANG] || gt.tac_gia.vi || "")) : "";
  const css = `body{font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1d2939;max-width:1100px;margin:24px auto;padding:0 16px;background:#fff}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px;border-bottom:2px solid #e4e7ec;padding-bottom:4px}
.mu,.mu *{color:#667085}.sm{font-size:12px}table{border-collapse:collapse;margin:6px 0 12px;font-size:13px}
td,th{border:1px solid #e4e7ec;padding:3px 7px;text-align:left;vertical-align:top}th{background:#f8fafc}td.dg{background:#f2f4f7;font-weight:600}
i.sw,.leg i{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:-2px;margin-right:4px;border:1px solid rgba(0,0,0,.25)}
.leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin:4px 0}svg{max-width:100%;height:auto;border:1px solid #e4e7ec;border-radius:6px;background:#fbfcfd}
img.bd{max-width:100%;border:1px solid #d0d5dd;image-rendering:pixelated;background:#fff}img.bd2{max-width:100%;border:1px solid #d0d5dd;background:#fff}
.ai-kq,.cb27{border-left:3px solid #7c3aed;background:#faf5ff;border-radius:4px;padding:6px 10px;margin:6px 0}.cb27{border-color:#f59e0b;background:#fffbeb}
.cb27.cb-thieu{border-color:#ec4899;background:#fdf2f8}.cb27.cb-tach{border-color:#7c3aed;background:#f5f3ff}.cb27.cb-sai{border-color:#dc2626;background:#fef2f2}
pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e4e7ec;border-radius:6px;padding:8px;font-size:12px}
.chan{margin-top:28px;border-top:1px solid #e4e7ec;padding-top:8px}@media print{body{margin:0}h2{break-after:avoid}table,img,svg{break-inside:avoid}}`;
  return `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(tieuDe)}</title><style>${css}</style></head><body>` +
    `<h1>${esc(tieuDe)}</h1><div class="mu sm">${esc(T("Geoportal lớp phủ Hải Phòng"))} v${VERSION} · ${esc(new Date().toLocaleString(LANG === "vi" ? "vi-VN" : LANG))}${tacGia ? " · " + esc(tacGia) : ""}</div>` +
    (thongSo && thongSo.length ? `<h2>${esc(T("Thông số"))}</h2><table>` + thongSo.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("") + `</table>` : "") +
    phan.filter(q => q && q.html).map(q => `<h2>${esc(q.h)}</h2>${q.html}`).join("") +
    `<div class="chan mu sm">${esc(T("Số liệu trong tệp này do trang tính từ dữ liệu đang xem, lúc xuất; các nhận định của AI là gợi ý, cần kiểm tra lại."))} ` +
    `${esc(T("Dữ liệu"))}: Copernicus Sentinel-2${MAN && MAN.repo ? " · " + esc(CFG.repo) : ""}.</div></body></html>`;
}
function bcTai(ten, tieuDe, thongSo, phan) { download(`${ten}_${stamp()}.html`, bcHTML(tieuDe, thongSo, phan), "text/html"); }
function bcAnhPhan(cv, leg, g) {
  const u = bcAnh(cv); if (!u) return "";
  return `<img class="bd" src="${u}" alt="">` + (leg ? `<div>${bcSach(leg)}</div>` : "") + (g ? `<p class="mu sm">${esc(T("Khung (vĩ độ, kinh độ)"))}: ${bcKhung(g)}; ${esc(T("bắc ở trên"))}</p>` : "");
}

async function bcBanDo(k, cv, leg, g) {        // bản 2.9: bản đồ đầy đủ như bản in (khung, lưới toạ độ, mũi tên bắc, thước tỉ lệ, chú giải kèm diện tích)
  try {
    if (typeof xbAnhBaoCao === "function") { const A = await xbAnhBaoCao(k, g);
      if (A) return `<img class="bd2" src="${A.url}" alt="">` + `<p class="mu sm">${esc(T("Phép chiếu Web Mercator (EPSG:3857); lưới kinh độ, vĩ độ WGS 84; diện tích trong chú giải đếm trên các điểm ảnh nằm trong khung bản đồ."))}` +
        (A.thieu.length ? " " + esc(T("Không lấy được: {l} (máy chủ không cho tải chéo hoặc không có ô ảnh).", {l: A.thieu.join(", ")})) : "") + `</p>`; }
  } catch (e) { /* dùng ảnh kết quả đơn như bản 2.7 */ }
  return bcAnhPhan(cv, leg, g);
}

/* ---------- từng bảng ---------- */
async function bcThayDoi() {
  const K = CD.kq; if (!K) { msg(T("chạy phát hiện thay đổi trước"), "wa", 3000); return; }
  if (K.kieu === "xh") {                       // bản 2.8: hồi quy xu hướng
    const ts = [[T("Phương pháp"), esc(T("hồi quy tuyến tính chỉ số theo năm (xu hướng)"))], [T("Chỉ số"), esc(K.cs.ten)], [T("Năm"), K.nam.join(", ")],
      [T("Phạm vi"), esc(cdTenPV(K.PV))], [T("Lưới"), `${K.g.w} × ${K.g.h}, ${K.res.toFixed(1)} m`], [T("Cách tính"), esc(xhTenCach(K))],
      [T("Ngưỡng"), `${K.t1} / ${K.t2} ${esc(T("mỗi năm"))} (${esc(xhTenNg(K))})`]];
    bcTai(`xu_huong_${v28TenTep(K.cs.ten)}_${K.A}_${K.B}`, T("Xu hướng {c} {a}-{b}", {c: K.cs.ten, a: K.A, b: K.B}), ts, [
      {h: T("Nhận định"), html: bcSach(cd$("cdTom"))}, {h: T("Nhận định của AI"), html: bcSach(cd$("cdAIKQ"))},
      {h: T("Bản đồ"), html: await bcBanDo("cd", CD.canvas, cd$("cdLeg"), K.g)}, {h: T("Bảng"), html: bcSach(cd$("cdBang"))},
      {h: T("Cặp năm"), html: bcSach(cd$("cdMT"))}, {h: T("Biểu đồ"), html: bcSach(cd$("cdBD"))}]);
    return;
  }
  const ts = [[T("Phương pháp"), K.pp === "irmad" ? "IR-MAD (Nielsen 2007)" : T("véc tơ thay đổi (CVA)")], [T("Năm"), `${K.A} → ${K.B}`], [T("Phạm vi"), esc(cdTenPV(K.PV))], [T("Lưới"), `${K.g.w} × ${K.g.h}, ${K.res.toFixed(1)} m`],
    [T("Ngưỡng độ lớn"), `${K.t.toFixed(3)} (${esc(K.tCach)})`], [T("Loại thay đổi"), esc(cd$("cdPL").selectedOptions[0].textContent)], [T("Đặc trưng dùng"), esc(K.ten.join(", "))]];
  bcTai("thay_doi_" + K.A + "_" + K.B, T("Phát hiện thay đổi {a} → {b}", {a: K.A, b: K.B}), ts, [
    {h: T("Nhận định"), html: bcSach(cd$("cdTom"))}, {h: T("Nhận định của AI"), html: bcSach(cd$("cdAIKQ"))},
    {h: T("Bản đồ"), html: await bcBanDo("cd", CD.canvas, cd$("cdLeg"), K.g)}, {h: T("Bảng"), html: bcSach(cd$("cdBang"))},
    {h: T("Ma trận"), html: bcSach(cd$("cdMT"))}, {h: T("Biểu đồ"), html: bcSach(cd$("cdBD"))}]);
}
async function bcThongKe() {
  const K = TK.kq; if (!K) { msg(T("chạy thống kê trước"), "wa", 3000); return; }
  const ts = [[T("Phương án"), esc([...new Set(K.cot.map(c => paTen(c.pa)))].join("; "))], [T("Năm"), [...new Set(K.cot.map(c => c.y).filter(Boolean))].join(", ")],
    [T("Phạm vi"), esc(v27TenPV(K.PV))], [T("Chú giải"), esc(tk$("tkCG").selectedOptions[0].textContent)], [T("Lưới"), `${K.g.w} × ${K.g.h}`]];
  bcTai("thong_ke_lop_phu", T("Thống kê lớp phủ"), ts, [
    {h: T("Diện tích"), html: bcSach(tk$("tkBang"))}, {h: T("Biểu đồ"), html: bcSach(tk$("tkBD"))}, {h: T("Theo xã"), html: bcSach(tk$("tkXaBang"))},
    {h: T("Đồng thuận"), html: bcSach(tk$("tkDT"))}, {h: T("Bản đồ"), html: TK.canvas ? await bcBanDo("tk", TK.canvas, null, K.g) : ""}, {h: T("Quy đổi"), html: bcSach(tk$("tkCGBang"))}]);
}
async function bcPhanLoai() {
  const K = PL.kq; if (!K) { msg(T("tạo bản đồ trước"), "wa", 3000); return; }
  const ts = [[T("Năm"), K.y], [T("Phạm vi"), esc(v27TenPV(K.PV))], [T("Bộ mẫu"), esc(K.bo === "*" ? T("mọi bộ điểm (gộp)") : (typeof boTen === "function" ? boTen(K.bo) : K.bo))],
    [T("Phương pháp"), esc(pl$("plPP").selectedOptions[0].textContent) + (/_mau$/.test(K.pp) ? `, k = ${K.kv}` : "")], [T("Đặc trưng"), esc(K.ids.join(", "))], [T("Lưới"), `${K.g.w} × ${K.g.h}`],
    [T("Mẫu huấn luyện"), esc(typeof plNguonTen === "function" ? plNguonTen(K) : "") + (K.nNgoai ? ` (${K.nMau - K.nNgoai} + ${K.nNgoai})` : "")]];
  bcTai("phan_loai_" + K.y, T("Phân loại từ điểm mẫu, năm {y}", {y: K.y}), ts, [
    {h: T("Tóm tắt"), html: bcSach(pl$("plTom"))}, {h: T("Bản đồ"), html: await bcBanDo("pl", PL.canvas, pl$("plLeg"), K.g)},
    {h: T("Cảnh báo, gợi ý"), html: bcSach(pl$("plCB"))}, {h: T("Diện tích"), html: bcSach(pl$("plDTBang"))}, {h: T("Kiểm định"), html: bcSach(pl$("plKDBang"))}]);
}
function bcAIDiem() {
  const D = AI.diem; if (!D) { msg(T("chưa có câu trả lời của AI"), "wa", 3000); return; }
  const p = D.p, ts = [[T("Điểm"), esc(p.id === "⌖" ? T("tra cứu") : p.id)], [T("Toạ độ"), `${(+p.lat).toFixed(6)}, ${(+p.lon).toFixed(6)}`], [T("Model"), esc(D.r.model)],
    [T("Năm cần gợi ý"), (D.nam || []).join(", ")], [T("Thời gian trả lời"), (D.r.ms / 1000).toFixed(1) + " s"]];
  const anh = (D.anh || []).map(a => `<figure><img class="bd" src="data:${a.mime};base64,${a.data}" alt=""><figcaption class="mu sm">${esc(a.mo_ta || "")}</figcaption></figure>`).join("");
  bcTai("ai_diem_" + String(p.id).replace(/[^\w-]/g, ""), T("Trợ lý AI: điểm {id}", {id: p.id === "⌖" ? T("tra cứu") : p.id}), ts, [
    {h: T("Nhận định của AI"), html: bcSach(ai$("aiKQ"))}, {h: T("Ảnh đã gửi"), html: anh},
    {h: T("Số liệu đã gửi"), html: D.J ? `<pre>${esc(JSON.stringify(D.J, null, 1))}</pre>` : ""}]);
}
function bcAILoat() {
  if (!AI.kqL.length) { msg(T("chưa có kết quả gán hàng loạt"), "wa", 3000); return; }
  const n = new Set(AI.kqL.map(r => r.id)).size, g = AI.kqL.filter(r => r.gan).length, l = AI.kqL.filter(r => r.loi).length;
  bcTai("ai_hang_loat", T("Trợ lý AI: gán hàng loạt"), [[T("Model"), esc(aiModel())], [T("Số điểm"), n], [T("Nhãn đã gán"), g], [T("Lỗi"), l]], [
    {h: T("Kết quả"), html: `<table><tr><th>${T("điểm")}</th><th>${T("năm")}</th><th>${T("gợi ý")}</th><th>${T("tin cậy")}</th><th>${T("đã gán")}</th><th>${T("lý do")}</th></tr>` +
      AI.kqL.map(r => `<tr><td>${esc(r.id)}</td><td>${r.nam || ""}</td><td>${esc(r.ma || "")}${r.ma && IDX.by[r.ma] ? " " + esc(cten(IDX.by[r.ma])) : ""}</td><td>${r.tc != null ? (100 * r.tc).toFixed(0) + " %" : ""}</td>` +
        `<td>${r.gan ? "✓" : ""}</td><td>${esc(r.loi || r.ly_do || "")}</td></tr>`).join("") + `</table>`}]);
}
[["cdHTML", bcThayDoi], ["tkHTML", bcThongKe], ["plHTML", bcPhanLoai], ["aiHTML", bcAIDiem], ["aiLHTML", bcAILoat]].forEach(([id, f]) => { const b = document.getElementById(id);
  if (b) b.onclick = async () => { if (b.disabled) return; b.disabled = true; const t0 = b.textContent; b.textContent = "…";
    try { await f(); } catch (e) { msg(T("lỗi: ") + (e.message || e), "er", 6000); } finally { b.disabled = false; b.textContent = t0; } }; });
