// Bản 3.17.1: phần đầu các bảng nổi (tiêu đề, thông báo trạng thái/lỗi, nút thu gọn/đóng) ghim lại khi cuộn; Chọn vùng ghim cả hàng
// công cụ và dòng gợi ý; hộp Xuất bản đồ, Gộp tệp ghim hàng nút + trạng thái; Trợ lý AI ghim hàng tiêu đề + trạng thái.
// jsdom không dựng bố cục, nên kiểm cấu trúc + quy tắc CSS; vị trí ghim đo trong Chromium (sticky tính từ mép trong padding → top = −padding).
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
(async () => {
  const {w, $, E, sleep, key, until, errs} = moTrang({geoman: true});
  await until(() => E("MAN") && E("MAN.layers.length") >= 5, 8000, "manifest");
  ok(E("VERSION").localeCompare("3.17.1", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));
  const cs = (el, k) => w.getComputedStyle(el)[k];

  // ---------- 1. mọi bảng nổi: thanh tiêu đề ghim, sát mép trên (top = −padding của bảng), nền đặc
  const bang = ["osmP", "tkP", "plP", "xgP", "s2oP", "cdP"];
  const sai = [];
  bang.forEach(id => { const P = $(id), d = P && P.querySelector(".vg-dau");
    if (!d || d !== P.firstElementChild) return sai.push(id + ": không có .vg-dau đầu bảng");
    if (cs(d, "position") !== "sticky") sai.push(id + ": " + cs(d, "position"));
    if (parseFloat(cs(d, "top")) !== -parseFloat(cs(P, "paddingTop"))) sai.push(`${id}: top ${cs(d, "top")} ≠ −${cs(P, "paddingTop")}`);
    if (!/^#|rgb\(/.test(cs(d, "backgroundColor")) || /rgba\(.*, 0\)/.test(cs(d, "backgroundColor"))) sai.push(id + ": nền trong suốt");
    if (!(+cs(d, "zIndex") >= 10)) sai.push(id + ": z-index " + cs(d, "zIndex")); });
  ok(sai.length === 0, `thanh tiêu đề ${bang.length} bảng nổi ghim sát mép trên (sticky, top = −padding, nền đặc)` + (sai.length ? ": " + sai.join("; ") : ""));
  const pd = $("panel").querySelector(".pn-dau");
  ok(cs(pd, "position") === "sticky" && parseFloat(cs(pd, "top")) === -8 && cs(pd, "backgroundColor") === "rgb(255, 255, 255)", "bảng Ảnh nền: dòng tiêu đề ghim");

  // ---------- 2. Chọn vùng: tiêu đề (có thông báo lỗi) + hàng công cụ + dòng gợi ý ghim chung một khối
  const V = $("vung"), G = V.querySelector(".vg-ghim");
  ok(G && G === V.firstElementChild && G.querySelector(".vg-dau #vgTrang") && G.querySelector(".vg-cong [data-cong=hat]") && G.querySelector("#vgGoiY") && G.querySelector("#vgThu") && G.querySelector("#vgDong"),
    "Chọn vùng: khối ghim gồm tiêu đề + thông báo (#vgTrang), nút thu gọn/đóng, hàng công cụ 1–4, dòng gợi ý");
  ok(cs(G, "position") === "sticky" && parseFloat(cs(G, "top")) === -8 && cs(G, "backgroundColor") === "rgb(255, 255, 255)" && cs(G.querySelector(".vg-dau"), "position") === "static",
    "khối ghim sticky, top −8 px, nền trắng; thanh tiêu đề bên trong không ghim riêng");
  ok(!V.querySelector("#vgBody").closest(".vg-ghim") && !V.querySelector("#vgTom").closest(".vg-ghim"), "phần thân (thẻ Tìm, Làm sạch…) vẫn cuộn bình thường");
  // vẫn mở, đổi công cụ, báo lỗi, thu gọn, kéo được như cũ
  E("setYear(2025)"); key("o"); await sleep(50);
  ok(!V.hidden, "mở Chọn vùng bằng phím o");
  V.querySelector("[data-cong=xoa]").click(); await sleep(5);
  ok(V.querySelector("[data-cong=xoa]").classList.contains("on") && $("vgGoiY").textContent.length > 5, "đổi công cụ: nút sáng, dòng gợi ý đổi theo");
  V.querySelector("[data-cong=hat]").click();
  $("vgThu").click(); ok($("vgBody").hidden && $("vgThu").textContent === "+", "thu gọn: chỉ ẩn phần thân"); $("vgThu").click();
  const d = V.querySelector(".vg-dau"), L0 = V.style.left, T0 = V.style.top;
  d.dispatchEvent(new w.MouseEvent("mousedown", {bubbles: true, clientX: 100, clientY: 20, button: 0}));
  w.document.dispatchEvent(new w.MouseEvent("mousemove", {bubbles: true, clientX: 160, clientY: 60}));
  w.document.dispatchEvent(new w.MouseEvent("mouseup", {bubbles: true, clientX: 160, clientY: 60}));
  ok(V.style.left !== L0 && V.style.top !== T0, `kéo thanh tiêu đề vẫn dời bảng (left ${L0 || "css"} → ${V.style.left}, top ${T0 || "css"} → ${V.style.top})`);

  // ---------- 3. hộp thoại: hàng nút + trạng thái luôn hiện (ghim cả trên lẫn dưới); Trợ lý AI ghim tiêu đề + trạng thái
  const nut = id => { const r = $(id).closest(".dlg-nut"); return r && cs(r, "position") === "sticky" && cs(r, "top") === cs(r, "bottom") && parseFloat(cs(r, "top")) < 0 ? r : null; };
  ok(nut("xbXuatBtn") && nut("xbXuatBtn").contains($("xbTT")) && nut("xbXuatBtn").contains($("xbDong")), "Xuất bản đồ: hàng Xem trước / Xuất / Đóng + trạng thái ghim (trên và dưới)");
  ok(nut("gtOk") && nut("gtOk").contains($("gtpDong")), "Gộp tệp tiến độ: hàng Gộp / Đóng ghim");
  const ad = $("aiTT").closest(".dlg-dau");
  ok(ad && ad === $("dlgAI").firstElementChild && ad.contains($("aiDong")) && cs(ad, "position") === "sticky" && parseFloat(cs(ad, "top")) < 0, "Trợ lý AI: hàng tiêu đề, thẻ, nút đóng và dòng trạng thái ghim");

  // ---------- 4. không trùng id, không lỗi
  const trung = E(`(() => { const c = {}; document.querySelectorAll("[id]").forEach(e => { if (e.tagName !== "SCRIPT") c[e.id] = (c[e.id] || 0) + 1; }); return Object.keys(c).filter(k => c[k] > 1); })()`);
  ok(trung.length === 0, "không có id trùng" + (trung.length ? ": " + trung.join(", ") : ""));
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
