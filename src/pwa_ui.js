/* =============================== BẢN 2.9.1: CÀI NHƯ ỨNG DỤNG (PWA) =============================== */
/* Nút "Cài ứng dụng": trình duyệt cho cài ngay (Chrome, Edge, Samsung Internet...) thì mở hộp cài của trình duyệt; nếu không
   (Safari trên iPhone, iPad, macOS; Firefox; trang mở từ tệp) thì hiện hướng dẫn cho đúng thiết bị. Báo khi có bản mới.
   Mở tệp bằng ứng dụng (Chrome, Edge trên máy tính): tệp tiến độ JSON, CSV, GeoJSON đi vào đúng đường nhập như nút "Tải tệp…". */
function pwaTT() {
  const P = window.PWA || {}, tt = $("caiTT"); if (!tt) return;
  tt.textContent = P.standalone ? T("Geoportal đang chạy như ứng dụng đã cài.")
    : !P.coTheCai ? T("Trang đang mở từ tệp trên máy nên không cài được: mở trang qua địa chỉ web https (ví dụ https://x102.github.io/haiphong) rồi cài.")
    : P.hoan ? T("Trình duyệt này cài được ngay: bấm Cài ngay.") : P.daCai ? T("Đã cài: tìm biểu tượng HP Geoportal trên màn hình chính hoặc trong danh sách ứng dụng.")
    : T("Làm theo hướng dẫn cho thiết bị của bạn dưới đây (dòng tô đậm).");
  $("caiNgay").hidden = !P.hoan;
  document.querySelectorAll("#dlgCai [data-nen]").forEach(li => li.classList.toggle("on", li.dataset.nen === P.nen));
}
function pwaVe() {
  const P = window.PWA || {}, b = $("bCai"), m = $("pwaMoi");
  if (b) b.hidden = !!P.standalone;
  if (m) m.hidden = !P.moi;
  if ($("dlgCai").open) pwaTT();
}
function pwaMo() { pwaTT(); const d = $("dlgCai"); if (!d.open) d.showModal ? d.showModal() : d.show(); }
async function pwaCai() {
  const P = window.PWA; if (!P || !P.hoan) { pwaMo(); return; }
  const e = P.hoan; P.hoan = null;
  try { e.prompt(); const r = await e.userChoice; if (r && r.outcome === "accepted") { P.daCai = true; msg(T("đã cài ứng dụng"), "ok", 5000); } } catch (er) { pwaMo(); }
  pwaVe();
}
$("bCai").onclick = () => { const P = window.PWA || {}; if (P.hoan) pwaCai(); else pwaMo(); };
$("caiNgay").onclick = pwaCai; $("caiDong").onclick = () => $("dlgCai").close();
$("pwaCapNhat").onclick = () => { const P = window.PWA; if (P && P.moi) { P.yeuCauTai = true; P.moi.postMessage("SKIP_WAITING"); } };
$("pwaBo").onclick = () => { $("pwaMoi").hidden = true; };
if (window.PWA) window.PWA.ve = pwaVe;
pwaVe();
const _setLangPwa = setLang;
setLang = function (l) { _setLangPwa(l); pwaVe(); };
if (window.launchQueue && typeof window.launchQueue.setConsumer === "function") {
  window.launchQueue.setConsumer(async lp => {
    if (!lp || !lp.files || !lp.files.length) return;
    const fs = []; for (const h of lp.files) { try { fs.push(await h.getFile()); } catch (e) { /* không đọc được */ } }
    if (!fs.length) return;
    const t0 = Date.now(); while (!MAN && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 200));   // chờ nạp dữ liệu như khi bấm "Tải tệp…"
    const fi = $("fileIn"); if (fi && fi.onchange) await fi.onchange({target: {files: fs, value: ""}});
  });
}
