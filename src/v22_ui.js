/* =============================== BẢN 2.2: CẤU HÌNH WEB, BÁO LỖI =============================== */
/* cau_hinh.json đặt cạnh trang (GitHub Pages): tên web, bộ dữ liệu Hugging Face mặc định, địa chỉ nhận báo lỗi,
   kho GitHub, máy chủ Overpass. Không có tệp (mở từ Hugging Face, file://) thì dùng giá trị sẵn trong trang. */
let SITE = {};
async function napCauHinh() {
  if (location.protocol === "file:") return SITE;
  try {
    const r = await fetch("cau_hinh.json", {cache: "no-store"});
    if (r.ok) SITE = await r.json();
  } catch (e) { /* không có tệp cấu hình: dùng mặc định */ }
  if (!ls(KEY_CFG)) {                        // người dùng chưa tự đặt trong Cài đặt: lấy theo cấu hình web
    if (SITE.hf_repo) CFG.repo = SITE.hf_repo;
    if (SITE.hf_rev) CFG.rev = SITE.hf_rev;
    if (SITE.du_lieu_goc) CFG.base = SITE.du_lieu_goc;
    if (Array.isArray(SITE.nam_can_gan) && SITE.nam_can_gan.length) CFG.years = SITE.nam_can_gan.map(Number);
  }
  const bl = SITE.bao_loi || {};
  $("loiGH").hidden = !bl.github;
  return SITE;
}
/* lỗi gần đây: giữ 15 lỗi JavaScript và 8 thông báo lỗi cuối để đính kèm báo cáo */
const LOI_GAN = [], TB_GAN = [];
window.addEventListener("error", e => { LOI_GAN.push(`${new Date().toISOString().slice(11, 19)} ${e.message || e.error || "?"}` +
  (e.filename ? ` (${String(e.filename).split("/").pop()}:${e.lineno || ""})` : "")); if (LOI_GAN.length > 15) LOI_GAN.shift(); });
window.addEventListener("unhandledrejection", e => { LOI_GAN.push(`${new Date().toISOString().slice(11, 19)} promise: ${(e.reason && (e.reason.message || e.reason)) || "?"}`);
  if (LOI_GAN.length > 15) LOI_GAN.shift(); });
const _msgGoc = msg;
msg = function (txt, kind, ms) { if (kind === "er" || kind === "wa") { TB_GAN.push(`${kind}: ${T(txt)}`.slice(0, 200)); if (TB_GAN.length > 8) TB_GAN.shift(); } return _msgGoc(txt, kind, ms); };
function chanDoan() {
  const man = MAN || {}, p = cur(), on = Object.values(OVL).filter(o => o.on).map(o => o.L0.id), osmOn = Object.keys(OSM.bat).filter(k => OSM.bat[k]);
  return [
    `Geoportal lớp phủ Hải Phòng v${VERSION}`,
    `thời gian: ${new Date().toISOString()}`,
    `địa chỉ: ${location.origin}${location.pathname}`,
    `ngôn ngữ: ${LANG} · màn hình: ${innerWidth}×${innerHeight} · điện thoại: ${isMobile() ? "có" : "không"} · bố cục: ${DOCK}`,
    `trình duyệt: ${navigator.userAgent}`,
    `dữ liệu: ${CFG.base || CFG.repo}@${CFG.rev} · manifest phiên bản ${man.phien_ban || "?"}, cập nhật ${man.cap_nhat || man.tao_luc || "?"}${MAN ? "" : " (CHƯA NẠP)"}`,
    `bộ điểm: ${ST.bo || "?"} (${pts().length} điểm) · điểm: ${p ? p.id : "-"} · năm: ${ST.nam} · năm cần gán: ${years().join(",")}`,
    `ảnh nền: ${$("selBase").value}${$("selBase").value === "none" ? "" : " " + (REL[relIdx] ? REL[relIdx][0] : "")} · lớp bật: ${on.join(",") || "-"} · OSM: ${osmOn.join(",") || "-"} (${OSM.nguon})`,
    `chọn vùng: ${typeof VG !== "undefined" && VG.mode ? "bật, " + VG.pos.length + " mẫu" : "tắt"} · vị trí bản đồ: ${map.getCenter().lat.toFixed(5)},${map.getCenter().lng.toFixed(5)} z${map.getZoom()}`,
    `lỗi JavaScript gần đây (${LOI_GAN.length}):`, ...LOI_GAN.map(s => "  " + s),
    `thông báo gần đây (${TB_GAN.length}):`, ...TB_GAN.map(s => "  " + s),
  ].join("\n");
}
function loiNoiDung(gioiHan) {
  const mo = $("loiMoTa").value.trim(), lh = $("loiLienHe").value.trim();
  let ct = chanDoan();
  const dung = () => `${mo || "(không mô tả)"}\n\n${lh ? "liên hệ: " + lh + "\n\n" : ""}--- thông tin kỹ thuật ---\n${ct}`;
  if (gioiHan) while (encodeURIComponent(dung()).length > gioiHan && ct.length > 200) ct = ct.split("\n").slice(0, -1).join("\n");
  return dung();
}
function loiTieuDe() { const mo = $("loiMoTa").value.trim().split("\n")[0].slice(0, 70); return `[Geoportal HP v${VERSION}] ${mo || "báo lỗi"}`; }
function moBaoLoi() {
  $("loiCT").textContent = chanDoan(); $("loiTT").textContent = "";
  $("loiGH").hidden = !((SITE.bao_loi || {}).github);
  $("dlgLoi").showModal(); setTimeout(() => $("loiMoTa").focus(), 50);
}
function guiEmail() {
  const em = (SITE.bao_loi || {}).email;
  if (!em) { $("loiTT").textContent = T("trang chưa đặt địa chỉ nhận báo lỗi (cau_hinh.json, mục bao_loi.email): bấm Chép nội dung rồi gửi cho người quản lý trang"); return null; }
  const url = `mailto:${em}?subject=${encodeURIComponent(loiTieuDe())}&body=${encodeURIComponent(loiNoiDung(1700))}`;
  window.location.href = url;
  $("loiTT").textContent = T("đã mở chương trình thư: kiểm tra rồi bấm Gửi. Nếu nội dung bị cắt, bấm Chép nội dung và dán vào thư.");
  return url;
}
function guiGitHub() {
  const repo = (SITE.bao_loi || {}).github; if (!repo) return null;
  const url = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(loiTieuDe())}&labels=bug&body=${encodeURIComponent(loiNoiDung(6000))}`;
  window.open(url, "_blank", "noopener");
  return url;
}
$("bBaoLoi").onclick = moBaoLoi;
$("loiGui").onclick = guiEmail;
$("loiGH").onclick = guiGitHub;
$("loiChep").onclick = () => {
  const t = loiTieuDe() + "\n\n" + loiNoiDung(0);
  const pr = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject(new Error("x"));
  pr.then(() => { $("loiTT").textContent = T("đã chép nội dung báo lỗi"); }).catch(() => { $("loiCT").textContent = t; $("loiTT").textContent = T("không chép tự động được: bôi đen phần thông tin kỹ thuật để chép"); });
};
$("loiDong").onclick = () => $("dlgLoi").close();

/* nối OSM vào vòng đời trang: sau khi nạp manifest, khi đổi ngôn ngữ */
const _napManGoc = loadManifest;
loadManifest = async function () { await _napManGoc(); osmDungDS(); if (Object.values(OSM.bat).some(Boolean)) osmNap(); };
const _setLangGoc = setLang;
setLang = function (l) { _setLangGoc(l); osmDoiNgonNgu(); };
osmDungDS();
