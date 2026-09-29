const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const RV = require("/tmp/fx/ref_vung.json");
(async () => {
  const {w, $, E, sleep, key, until, errs} = moTrang({geoman: true});
  const click = (lon, lat, shift) => E(`map.fire("click", {latlng: L.latLng(${lat}, ${lon}), originalEvent: {shiftKey: ${!!shift}}})`);
  const phai = (lon, lat, shift) => E(`map.fire("contextmenu", {latlng: L.latLng(${lat}, ${lon}), originalEvent: {shiftKey: ${!!shift}}})`);
  const nObj = () => E("VG.obj ? VG.obj.n : -1");
  const nutClick = el => el.dispatchEvent(new w.MouseEvent("click", {bubbles: true, clientX: 300, clientY: 200}));
  await until(() => E("MAN") && E("MAN.layers.length") >= 5, 8000, "manifest");
  E("setYear(2025)"); key("o"); await sleep(50);
  ok(!$("vung").hidden && E("VG.cong") === "hat" && /Shift/.test($("vgGoiY").textContent), "mở bảng: công cụ ① điểm mẫu, có gợi ý");
  $("vgPV").value = "bk"; $("vgBK").value = "6";
  click(RV.lang[0][0], RV.lang[0][1]);
  await until(() => E("VG.obj && VG.obj.n") >= 8, 8000, "chọn: 2 làng + 6 dải");
  ok(nObj() === 8 && E("VG.data.g.res") === 10, `bán kính 6 km ở 10 m: ${nObj()} mảng (2 làng + 6 dải đường chọn nhầm)`);
  // LỖI CŨ: bấm nút trên bảng (nằm trên bản đồ) thì nhấp lọt xuống bản đồ, thêm một điểm mẫu mới
  E("vg$('vung')._leaflet_disable_click = false; vg$('vung').removeEventListener('click', vg$('vung')._chanNhap)");   // tắt tạm cả hai cách sửa
  nutClick($("vgHat")); await sleep(30); const loi = E("VG.pos.length");
  E("vg$('vung')._leaflet_disable_click = true; vg$('vung').addEventListener('click', vg$('vung')._chanNhap)"); E("VG.pos.splice(1); vgVeHat()");
  ok(loi === 2, "bài thử tái hiện được lỗi cũ khi tắt cách sửa (1 lần bấm thêm 1 điểm mẫu)");
  nutClick($("vgHat")); nutClick($("vgGoiY")); nutClick($("vung").querySelector('[data-tab="mang"]')); await sleep(30);
  ok(E("VG.pos.length") === 1, "nhấp trên bảng không còn lọt xuống bản đồ");
  nutClick($("vgXoaHat")); await sleep(250);
  ok(E("VG.pos.length") === 0 && E("VG.neg.length") === 0, "bấm Xoá điểm mẫu: chỉ xoá, không thêm điểm mới");
  click(RV.lang[0][0], RV.lang[0][1]); await until(() => E("VG.obj && VG.obj.n") === 8, 8000, "chọn lại");
  // ② xoá cả mảng
  key("2"); ok(E("VG.cong") === "xoa", "phím 2: công cụ xoá mảng");
  const t0 = E("VG.res.st.dien_tich_ha");
  click(RV.dai[0][0], RV.dai[0][1]); await sleep(50);
  ok(nObj() === 7 && E("VG.loai.length") === 1 && E("VG.res.st.dien_tich_ha") < t0, `xoá cả dải 0: còn ${nObj()} mảng`);
  ok(/\(1\)/.test($("vung").querySelector('[data-cong="xoa"]').textContent), "nút Xoá mảng hiện số lần xoá (1)");
  key("+"); key("+"); await sleep(50);
  ok(E("VG.loai.length") === 1 && nObj() <= 7, "nới ngưỡng: dải đã xoá không quay lại");
  key("-"); key("-"); await sleep(50);
  // chuột phải: xoá nhanh ở mọi công cụ
  key("1"); phai(RV.dai[1][0], RV.dai[1][1]); await sleep(50);
  ok(nObj() === 6 && E("VG.loai.length") === 2 && E("VG.cong") === "hat", "chuột phải vào dải 1 (đang ở công cụ ①): xoá nhanh");
  // S: các dải còn lại bị nghi, làng không
  key("s"); await sleep(50);
  const nghi = E("(() => { const o = VG.obj, r = []; for (let k = 1; k <= o.n; k++) r.push([o.desc[k-1].elong, o.nghi[k], o.tick[k]]); return r; })()");
  const daiN = nghi.filter(r => r[0] > 5), langN = nghi.filter(r => r[0] <= 5);
  ok(daiN.length === 4 && daiN.every(r => r[1] >= 0.6 && r[2]) && langN.every(r => r[1] < 0.6 && !r[2]),
     `S: 4 dải bị nghi (${daiN.map(r => r[1].toFixed(2)).join(", ")}), 2 làng không (${langN.map(r => r[1].toFixed(2)).join(", ")})`);
  ok(!$("vung").querySelector('[data-pane="sach"]').hidden && $("vgDSNghi").querySelectorAll("tr[data-k]").length === 4, "mở thẻ Làm sạch, danh sách 4 mảng nghi");
  const tr0 = $("vgDSNghi").querySelector("tr[data-k] input"); tr0.checked = false; tr0.onchange({target: tr0});
  key("Enter"); await sleep(50);
  ok(nObj() === 3 && E("VG.loai.length") === 5, `Enter xoá 3 mảng đã tick, còn ${nObj()}`);
  key("z"); await sleep(50); ok(nObj() === 6 && E("VG.loai.length") === 2, "Z hoàn tác lần xoá nhiều");
  key("s"); await sleep(30); key("Enter"); await sleep(50);
  ok(nObj() === 2 && E("VG.loai.length") === 6, "S rồi Enter: chỉ còn 2 làng");
  // ③ giữ; Shift+chuột phải cũng giữ
  key("3"); click(RV.lang[0][0], RV.lang[0][1]); await sleep(50);
  ok(E("VG.giu.length") === 1, "phím 3 + nhấp: giữ làng 0");
  click(RV.lang[0][0], RV.lang[0][1]); await sleep(30); ok(E("VG.giu.length") === 0, "nhấp lại: bỏ giữ");
  key("1"); phai(RV.lang[1][0], RV.lang[1][1], true); await sleep(30);
  ok(E("VG.giu.length") === 1 && nObj() === 2, "Shift+chuột phải: giữ làng 1, không xoá");
  $("vung").querySelector('[data-tab="mang"]').click();
  ok($("vgDSMang").querySelectorAll("tr[data-k]").length === 2, "thẻ Mảng: 2 dòng");
  key("z"); key("z"); key("z"); await sleep(50);
  ok(nObj() === 2 && E("VG.giu.length") === 0, "Z ba lần: hoàn tác giữ, bỏ giữ, giữ"); key("z"); await sleep(80);
  ok(nObj() === 6, `hoàn tác thêm: ${nObj()} mảng`);
  // ④ sửa ranh giới, xoá đa giác, tìm tương tự ở bước đa giác
  key("4"); await sleep(50);
  ok(E("VG.obj.kieu") === "da_giac" && E("VG.pmOn") && !$("vgGianW").hidden, `phím 4: ${nObj()} đa giác, thanh Geoman`);
  key("2");
  const iDai = E(`VG.obj.layers.findIndex(l => l.getBounds().contains(L.latLng(${RV.dai[2][1]}, ${RV.dai[2][0]})))`);
  E(`VG.obj.layers[${iDai}].fire("click", {latlng: L.latLng(${RV.dai[2][1]}, ${RV.dai[2][0]})})`); await sleep(400);
  ok(nObj() === 5 && E("VG.loai.length") === 3, `xoá đa giác dải 2: còn ${nObj()}`);
  key("s"); await sleep(50);
  const nn = E("(() => { const o = VG.obj, r = []; for (let k = 1; k <= o.n; k++) r.push([o.desc[k-1].elong, o.tick[k]]); return r; })()");
  ok(nn.filter(r => r[0] > 5).every(r => r[1]) && nn.filter(r => r[0] <= 5).every(r => !r[1]), "S ở bước đa giác: tick đúng các dải");
  key("Enter"); await sleep(400); ok(nObj() === 2, "Enter: còn 2 đa giác làng");
  key("z"); await sleep(400); ok(nObj() === 5, "Z ở bước đa giác: vẽ lại");
  key("s"); key("Enter"); await sleep(400);
  $("vgLop").value = "X2"; await E("vgLuu()");
  const v = E("Object.values(ST.vung)[0]");
  ok(v && v.geom.coordinates.length === 2 && v.tham_so.so_mang_xoa >= 6, `lưu vùng: 2 đa giác, ${v && v.tham_so.so_mang_xoa} lần xoá`);
  // phím lớp bị chặn; Esc; kéo bảng; thu gọn; đóng
  const p0 = E("ST.cur"); key("q"); ok(!p0 || E(`ST.diem['${p0}'].nhan[2025]`) !== "X1", "phím lớp không gán nhãn điểm khi đang chọn vùng");
  key("Escape"); ok(E("VG.cong") === "hat" && !E("VG.pmOn"), "Esc: về công cụ điểm mẫu");
  const dau = $("vung").querySelector(".vg-dau");
  dau.dispatchEvent(new w.MouseEvent("mousedown", {bubbles: true, clientX: 100, clientY: 20}));
  w.document.dispatchEvent(new w.MouseEvent("mousemove", {bubbles: true, clientX: 250, clientY: 120}));
  w.document.dispatchEvent(new w.MouseEvent("mouseup", {bubbles: true}));
  ok($("vung").style.left === "150px" && $("vung").style.top === "100px" && E("VG.pos.length") === 1, "kéo thanh tiêu đề dời bảng, không thêm điểm mẫu");
  $("vgThu").click(); ok($("vgBody").hidden, "thu gọn bảng"); $("vgThu").click();
  key("o"); ok($("vung").hidden, "phím o đóng");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
