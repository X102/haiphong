// Bản 2.6: phát hiện thay đổi giữa hai năm (không mẫu, có mẫu, theo bản đồ lớp) và trợ lý AI (nhà cung cấp, khoá mã hoá,
// gợi ý nhãn, gán hàng loạt, relay). Mọi lời gọi AI được giả lập: kiểm tra đúng địa chỉ, tiêu đề, thân yêu cầu, và khoá
// không lọt vào lỗi, bộ nhớ trình duyệt dạng rõ hay tệp tiến độ.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const gan = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("2.6", undefined, {numeric: true}) >= 0, "bản 2.6");

  // ---------- hàm lõi
  const C = E(`(() => {
    const v = []; for (let i = 0; i < 900; i++) v.push(1 + (i % 7) * 0.05); for (let i = 0; i < 100; i++) v.push(6 + (i % 5) * 0.1);
    const t = CORE.otsu(v, 0, 8, 256), sd = CORE.lechBen(Array.from({length: 1001}, (_, i) => (i - 500) / 100)), h = CORE.hoiQuy([1, 2, 3, 4], [3.5, 5.5, 7.5, 9.5]);
    const X = []; for (let i = 0; i < 30; i++) X.push([i % 2 ? 10 + i * 0.01 : -10 - i * 0.01, 0]);
    const km = CORE.kMeans(X, 2, 2, 10, 3).map(c => Math.round(c[0])).sort((a, b) => a - b);
    const F = new Float32Array([-9, 0, 11, 0, 0.5, 0]), pl = Array.from(CORE.phanLoaiNguyenMau(F, 2, 3, [1, 1, 0], [{lop: 0, v: [-10, 0]}, {lop: 1, v: [10, 0]}]));
    return {t, sd, h, km, pl, sb: [CORE.lopSoBo(0.1, 0.4), CORE.lopSoBo(0.6, -0.3), CORE.lopSoBo(0.1, -0.1), CORE.lopSoBo(NaN, 0)],
      ltd: [CORE.loaiThayDoi(2, 3, -0.4, 1), CORE.loaiThayDoi(3, 1, 0, 1), CORE.loaiThayDoi(2, 2, -0.3, 1), CORE.loaiThayDoi(2, 2, 0.3, 1), CORE.loaiThayDoi(3, 3, 0, 1), CORE.loaiThayDoi(2, 3, 0, 0)]}; })()`);
  ok(C.t > 1.3 && C.t < 6, `Otsu tách hai cụm 1..1.3 và 6..6.4: ngưỡng ${C.t.toFixed(2)}`);
  ok(gan(C.sd, 1.4826 * 2.5, 0.02), `độ lệch chuẩn bền (1.4826 × MAD) của dãy đều -5..5: ${C.sd.toFixed(3)}`);
  ok(gan(C.h.a, 2, 1e-12) && gan(C.h.b, 1.5, 1e-12), "hồi quy y = 2x + 1.5 đúng");
  ok(C.km[0] === -10 && C.km[1] === 10, "k-means tìm đúng hai tâm -10, 10");
  ok(JSON.stringify(C.pl) === "[1,2,0]", "gán theo nguyên mẫu gần nhất, bỏ điểm ảnh không hợp lệ");
  ok(JSON.stringify(C.sb) === "[1,2,3,0]" && JSON.stringify(C.ltd) === "[1,6,7,8,9,0]", "lớp sơ bộ và loại thay đổi đúng bảng");

  // ---------- phát hiện thay đổi: mảng sáng 60 × 30 điểm ảnh (18 ha) năm 2023, cả ảnh 2023 lệch -200 DN
  const TAM = E("CORE.toLL(660000 + 730 * 10, 2320000 - 315 * 10)");
  E(`map.setView([${TAM[1]}, ${TAM[0]}], 15, {animate: false})`); await sleep(100);
  $("bCD").click(); await sleep(300);
  ok(!$("cdP").hidden && $("cdA").value === "2023" && $("cdB").value === "2025", "mở bảng phát hiện thay đổi: năm trước 2023, năm sau 2025");
  $("cdPV").value = "nhin"; $("cdNguong").value = "otsu"; $("cdPL").value = "sobo"; $("cdMin").value = "0.05"; $("cdChuan").checked = true;
  w.document.querySelectorAll('#cdP [data-cd]').forEach(c => { c.checked = ["s2", "cs"].includes(c.dataset.cd); });
  $("cdChay").click();
  await until(() => E("CD.kq") && /xong/.test($("cdTrang").textContent), 30000, "phát hiện thay đổi (sơ bộ)");
  const K1 = E("({tong: CD.kq.tong, doi: CD.kq.tongDoi, dt: Array.from(CD.kq.dt), a: CD.kq.heSo[6].a, b: CD.kq.heSo[6].b, mt: CD.kq.mt.map(r => Array.from(r)), t: CD.kq.t})");
  ok(gan(K1.doi, 18, 2.5), `chuẩn hoá bức xạ khử lệch -200 DN, chỉ còn mảng sáng: ${K1.doi.toFixed(2)} ha thay đổi (đúng 18 ha)`);
  ok(gan(K1.a, 1, 0.02) && gan(K1.b, 0.02, 0.003), `hệ số chuẩn hoá băng B8: a = ${K1.a.toFixed(4)}, b = ${K1.b.toFixed(4)} (đúng 1 và 0.02)`);
  ok(K1.dt[9] > 0.9 * K1.doi, "mảng sáng xếp vào 'thay đổi phổ khác' (cả hai năm đều là lớp xây dựng, đất trống theo chỉ số)");
  ok(gan(K1.mt.flat().reduce((s, v) => s + v, 0), K1.tong, 0.01), `ma trận từ-đến cộng lại đúng tổng diện tích có dữ liệu (${K1.tong.toFixed(1)} ha)`);
  ok(/18|17|19/.test($("cdTom").textContent) && /Otsu/.test($("cdTom").textContent) && $("cdBang").querySelector("table") && $("cdMT").querySelectorAll("tr").length === 5 &&
     $("cdBD").querySelectorAll("svg").length === 2, "nhận định ghi đúng số ha và cách đặt ngưỡng; có bảng loại, ma trận 3 lớp, hai biểu đồ");
  // tắt chuẩn hoá: lệch đều -200 DN làm mọi điểm ảnh ổn định có độ lớn thay đổi rất lớn
  const tv1 = E("CORE.phanVi(CD.kq.vm, 0.5)");
  $("cdChuan").checked = false; $("cdChay").click(); await sleep(200);
  await until(() => /xong/.test($("cdTrang").textContent), 30000, "không chuẩn hoá");
  const tv0 = E("CORE.phanVi(CD.kq.vm, 0.5)");
  ok(tv1 < 1 && tv0 > 1000, `độ lớn thay đổi trung vị: có chuẩn hoá ${tv1.toFixed(3)}, không chuẩn hoá ${tv0.toFixed(0)} (lệch đều -200 DN lấn át): chuẩn hoá là cần`);
  $("cdChuan").checked = true;

  // có mẫu: 4 điểm trong mảng (đổi lớp), 4 điểm ngoài (không đổi) -> ngưỡng theo F1, loại theo nguyên mẫu
  const pts = E(`(() => { const o = []; [[-20, -10], [20, -10], [-20, 10], [20, 10]].forEach(([dx, dy]) => {
      const ll = CORE.toLL(660000 + 730 * 10 + dx * 10, 2320000 - 315 * 10 - dy * 10); o.push({lon: ll[0], lat: ll[1], nhan: {2023: "X1", 2025: "T1"}}); });
    [[-120, 0], [120, 0], [0, -80], [0, 80]].forEach(([dx, dy]) => { const ll = CORE.toLL(660000 + 730 * 10 + dx * 10, 2320000 - 315 * 10 - dy * 10); o.push({lon: ll[0], lat: ll[1], nhan: {2023: "T1", 2025: "T1"}}); });
    return o; })()`);
  E(`taoBoTuDiem("mẫu thay đổi thử", [2023, 2025], ${JSON.stringify(pts)}, {})`); await sleep(100);
  E(`map.setView([${TAM[1]}, ${TAM[0]}], 15, {animate: false})`); await sleep(50);
  E("cdMo(true)"); await sleep(200);
  $("cdBo").value = E("ST.bo"); $("cdNguong").value = "mau"; $("cdPL").value = "mau"; $("cdChay").click(); await sleep(200);
  await until(() => /xong|lỗi/.test($("cdTrang").textContent), 30000, "có mẫu");
  const K2 = E("({f1: CD.kq.danhGia.f1, n: CD.kq.danhGia.n, cach: CD.kq.tCach, lop: CD.kq.lop, doi: CD.kq.tongDoi, hc: !!CD.kq.hieuChinh, mt: CD.kq.mt.map(r => Array.from(r))})");
  ok(K2.cach === "mau" && K2.hc && K2.n === 8 && K2.f1 === 1, `ngưỡng tối ưu F1 trên 8 điểm mẫu hai năm: F1 = ${K2.f1}`);
  ok(K2.lop.length === 2 && /X1/.test(K2.lop.join()) && K2.mt[K2.lop.findIndex(l => /X1/.test(l))][K2.lop.findIndex(l => /T1/.test(l))] > 5,
     `loại theo điểm mẫu: ma trận ${K2.lop.join(" / ")}, X1 → T1 có ${K2.mt.flat().sort((a, b) => b - a)[0].toFixed(1)} ha`);
  ok(/8 điểm/.test($("cdTom").textContent) && /F1 1\.00/.test($("cdTom").textContent) && /nhãn: đổi lớp/.test($("cdBang").textContent), "nhận định và bảng có đánh giá trên điểm mẫu");
  // theo bản đồ lớp có sẵn (hai năm giống nhau) -> ma trận chỉ có đường chéo
  $("cdPL").value = "bando"; $("cdNguong").value = "otsu"; $("cdChay").click(); await sleep(200);
  await until(() => /xong|lỗi/.test($("cdTrang").textContent), 30000, "bản đồ lớp");
  const K3 = E("({mt: CD.kq.mt.map(r => Array.from(r)), lop: CD.kq.lop})");
  const cheo = K3.mt.reduce((s, r, i) => s + r[i], 0), ngoai = K3.mt.flat().reduce((s, v) => s + v, 0) - cheo;
  ok(K3.lop.length === 3 && cheo > 100 && ngoai === 0, `theo bản đồ lớp CTX (2023 = 2025): ma trận ${K3.lop.join(", ")} chỉ có đường chéo (${cheo.toFixed(0)} ha)`);
  // bản đồ, chú giải, xuất, rải điểm kiểm tra, giá trị tại điểm
  $("cdPL").value = "sobo"; $("cdChay").click(); await sleep(200); await until(() => /xong/.test($("cdTrang").textContent), 30000, "sơ bộ lại");
  for (const v of ["loai", "doi", "do", "ndvi"]) { $("cdXem").value = v; $("cdXem").onchange(); }
  ok(E("!!CD.hien && map.hasLayer(CD.hien)") && $("cdLeg").querySelectorAll("i").length === 2, "bốn kiểu bản đồ kết quả, chú giải theo kiểu");
  const nb = blobs.length; $("cdCSV").click(); $("cdGeo").click(); await sleep(100);
  const csv = await docBlob(blobs[nb]), gj = JSON.parse(await docBlob(blobs[nb + 1]));
  ok(/ma_tran/.test(csv) && /thay đổi phổ khác/.test(csv) && gj.features.length >= 1 && gj.features[0].properties.loai === 9 && gan(gj.features.reduce((s, f) => s + f.properties.dien_tich_ha, 0), K1.doi, 2),
     `xuất CSV (loại + ma trận) và GeoJSON mảng thay đổi (${gj.features.length} mảng, loại 9)`);
  const boTruoc = E("ST.bo"); $("cdNDiem").value = "5"; $("cdRai").click(); await sleep(100);
  ok(E("ST.bo") !== boTruoc && E("Object.values(ST.diem).filter(p => p.bo === ST.bo).length") === 10 && JSON.stringify(E("boCfg().nam")) === "[2023,2025]",
     "rải điểm kiểm tra: 5 điểm trong loại thay đổi + 5 điểm không đổi, bộ mới gán hai năm");
  const gt = E(`(async () => (await giaTriTai(L.latLng(${TAM[1]}, ${TAM[0]}))).map(r => r[0] + ": " + r[1]).join(" | "))()`);
  await sleep(10); const gtv = await gt;
  ok(/Δ 2023 → 2025/.test(gtv) && /thay đổi phổ khác/.test(gtv), "giá trị tại điểm có dòng Δ: loại thay đổi, độ lớn, ΔNDVI");

  // ---------- trợ lý AI: giả lập nhà cung cấp
  const REQ = []; let TRA = null;
  const f0 = w.fetch;
  w.fetch = (u, o) => {
    if (!/deepseek|anthropic|generativelanguage|hf\.space|api\.openai|localhost:11434/.test(String(u))) return f0(u, o);
    const h = Object.assign({}, (o && o.headers) || {}), b = o && o.body ? JSON.parse(o.body) : null; REQ.push({u: String(u), h, b, m: (o && o.method) || "GET"});
    const [st, j] = TRA ? TRA(String(u), h, b) : [200, {choices: [{message: {content: "OK"}}]}];
    return Promise.resolve({ok: st < 300, status: st, text: async () => typeof j === "string" ? j : JSON.stringify(j)});
  };
  const KHOA = "sk-test1234567890abcdefXYZ";
  $("bAI").click(); await sleep(200);
  ok($("dlgAI").open && !w.document.querySelector('#dlgAI [data-apane="kn"]').hidden && $("aiNCC").options.length === 10, "mở trợ lý AI: chưa có khoá thì vào thẻ Kết nối, 10 nhà cung cấp");
  $("aiNCC").value = "deepseek"; $("aiNCC").onchange(); $("aiLuu").value = "mat_khau"; $("aiLuu").onchange(); $("aiMK").value = "matkhau-thu";
  $("aiKhoa").value = KHOA; $("aiThu").click();
  await until(() => /kết nối được/.test($("aiTT").textContent), 8000, "thử kết nối");
  const r0 = REQ[REQ.length - 1];
  ok(r0.u === "https://api.deepseek.com/v1/chat/completions" && r0.h.Authorization === "Bearer " + KHOA && r0.b.model === "deepseek-chat" && typeof r0.b.messages[1].content === "string",
     "DeepSeek: đúng địa chỉ, khoá ở tiêu đề Authorization, model mặc định, nội dung chữ");
  const kho = w.localStorage.getItem("laymauAI_kho_v1"), moi = Object.keys(w.localStorage).map(k => w.localStorage.getItem(k)).join("|");
  ok(kho && JSON.parse(kho).che === "mat_khau" && !moi.includes(KHOA) && !moi.includes("1234567890abcdef"), "khoá lưu mã hoá (mật khẩu), không có dạng rõ trong localStorage");
  ok(!$("aiKhoa").value && $("aiKhoa").placeholder.includes("…") && !$("aiKhoa").placeholder.includes("1234567890"), "ô khoá không hiện lại khoá, chỉ hiện dạng che");
  const phien = E("JSON.stringify(phienXuat ? phienXuat() : {})");
  ok(!phien.includes(KHOA) && !phien.includes("laymauAI"), "tệp tiến độ (phiên làm việc) không chứa khoá hay cấu hình AI");
  // mở lại sau khi tải trang: cần mật khẩu, sai mật khẩu thì báo, đúng thì mở được
  E("AI.kho = null; AI.mk = null"); $("aiMK").value = "";
  const e1 = await E("aiMoKho().then(() => 'mo', e => e.message)");
  $("aiMK").value = "sai-mat-khau"; const e2 = await E("aiMoKho().then(() => 'mo', e => e.message)");
  $("aiMK").value = "matkhau-thu"; const e3 = await E("aiMoKho().then(k => k.deepseek)");
  ok(/mật khẩu/.test(e1) && /không mở được/.test(e2) && e3 === KHOA, "khoá mã hoá bằng mật khẩu: thiếu mật khẩu hoặc sai thì không mở, đúng thì mở");
  // lỗi có chứa khoá: phải bị che
  TRA = () => [401, {error: {message: "Incorrect API key provided: " + KHOA + " (Bearer " + KHOA + ")"}}];
  $("aiThu").click(); await until(() => /lỗi/.test($("aiTT").textContent), 5000, "lỗi 401");
  ok(/401/.test($("aiTT").textContent) && !$("aiTT").textContent.includes("1234567890"), "lỗi 401 hiện ra nhưng khoá bị che");

  // Anthropic, Gemini, relay
  TRA = u => /anthropic/.test(u) ? [200, {content: [{type: "text", text: "OK"}]}] : /generativelanguage/.test(u) ? [200, {candidates: [{content: {parts: [{text: "OK"}]}}]}] : [200, {choices: [{message: {content: "OK"}}]}];
  $("aiNCC").value = "anthropic"; $("aiNCC").onchange(); $("aiKhoa").value = "sk-ant-test-abcdefghijklmnop"; $("aiThu").click();
  await until(() => /kết nối được/.test($("aiTT").textContent), 5000, "Anthropic");
  const ra = REQ[REQ.length - 1];
  ok(ra.u === "https://api.anthropic.com/v1/messages" && ra.h["x-api-key"] === "sk-ant-test-abcdefghijklmnop" && ra.h["anthropic-version"] && ra.h["anthropic-dangerous-direct-browser-access"] === "true" &&
     ra.b.system && ra.b.model === "claude-sonnet-5-5", "Claude: /v1/messages, x-api-key, anthropic-version, cho phép gọi từ trình duyệt, chỉ dẫn ở system");
  $("aiNCC").value = "gemini"; $("aiNCC").onchange(); $("aiKhoa").value = "AIzaTESTabcdefghijklmnopqrstu"; $("aiThu").click();
  await until(() => /kết nối được/.test($("aiTT").textContent), 5000, "Gemini");
  const rg = REQ[REQ.length - 1];
  ok(/\/v1beta\/models\/gemini-2\.5-flash:generateContent$/.test(rg.u) && !/key=/.test(rg.u) && rg.h["x-goog-api-key"] && rg.b.systemInstruction, "Gemini: generateContent, khoá ở tiêu đề (không nằm trong địa chỉ)");
  $("aiNCC").value = "openai"; $("aiNCC").onchange(); $("aiRelay").value = "https://toi-ai-relay.hf.space/"; $("aiRelayMa").value = "ma-relay-bi-mat-123456"; $("aiQuaRelay").checked = true; $("aiThu").click();
  await until(() => /kết nối được/.test($("aiTT").textContent), 5000, "relay");
  const rr = REQ[REQ.length - 1];
  ok(rr.u === "https://toi-ai-relay.hf.space/p/openai/v1/chat/completions" && rr.h["X-Relay-Token"] === "ma-relay-bi-mat-123456" && !rr.h.Authorization, "qua relay: /p/openai/v1/..., mã relay ở tiêu đề, không cần khoá OpenAI trong trình duyệt");
  // lấy danh sách model
  TRA = () => [200, {data: [{id: "gpt-b"}, {id: "gpt-a"}]}]; $("aiLayDS").click(); await sleep(200);
  ok(REQ[REQ.length - 1].m === "GET" && /\/p\/openai\/v1\/models$/.test(REQ[REQ.length - 1].u) && $("aiModelDS").querySelectorAll("option").length === 2, "lấy danh sách model qua relay");
  // thử lại tự động: model không nhận ảnh, model suy luận đòi max_completion_tokens
  let lan = 0;
  TRA = (u, h, b) => { lan++; if (b.max_tokens) return [400, {error: {message: "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens' instead."}}];
    if (Array.isArray(b.messages[1].content)) return [400, {error: {message: "Invalid content type. image_url is only supported by certain models."}}]; return [200, {choices: [{message: {content: "chỉ chữ"}}]}]; };
  const rt = await E(`aiGoi("he", "nd", [{mime: "image/png", data: "iVBORw0KGgo="}]).then(r => r, e => ({loi: e.message}))`);
  ok(rt.text === "chỉ chữ" && rt.boAnh && lan === 3, "tự thử lại: đổi sang max_completion_tokens, rồi bỏ ảnh khi model không nhận ảnh");

  // ---------- hỏi về một điểm, gán gợi ý
  $("aiQuaRelay").checked = false; $("aiNCC").value = "deepseek"; $("aiNCC").onchange(); $("aiQuaRelay").checked = false; await E("aiLuuTuForm()");
  E("ST.bo = 'E0'; buildSetSelect(); select('E0001', false)"); await sleep(200);
  E("aiTab('diem')"); await sleep(50);
  ok(/E0001/.test($("aiDiemTT").textContent) && !$("aiHoi").disabled, "thẻ Hỏi về điểm theo điểm đang chọn");
  let GUI = null;
  TRA = (u, h, b) => { GUI = b; return [200, {choices: [{message: {content: "```json\n" + JSON.stringify({mo_ta: "Ruộng lúa hai vụ, NDVI cao kỳ 5-6 và 9-10.",
    goi_y: [{nam: 2023, ma: "t1", tin_cay: 0.92, ly_do: "hai đỉnh NDVI"}, {nam: 2024, ma: "ZZ", tin_cay: 0.9, ly_do: "mã sai"}, {nam: 2025, ma: "X2", tin_cay: 0.55, ly_do: "không chắc"}],
    thay_doi: "không đổi", can_xem_lai: false}) + "\n```"}}]}]; };
  E("ST.diem.E0001.nhan = {}"); $("aiNamPV").value = "chua"; $("aiHoi").click();
  await until(() => $("aiKQ").querySelector("table"), 15000, "gợi ý nhãn");
  const nd = GUI.messages[1].content, J = JSON.parse(nd.slice(nd.indexOf("{"), nd.lastIndexOf("}") + 1));
  ok(JSON.stringify(J.nam_can_goi_y) === "[2023,2024,2025]" && J.he_lop.length === 17 && J.s2_theo_nam && J.s2_theo_nam.nam["2025"] && J.s2_theo_nam.nam["2025"].NDVI != null &&
     J.mua_vu_6_ky && J.mua_vu_6_ky.nam["2025"].NDVI.length === 6 && Array.isArray(J.gia_tri_tai_diem) && J.ban_do_lop_co_san,
     "gửi đủ: năm cần gợi ý, hệ 17 lớp, 10 băng + chỉ số theo năm, đường mùa vụ 6 kỳ, giá trị tại điểm, bản đồ lớp có sẵn");
  ok(/tr|X1|T1/.test(GUI.messages[0].content) && /Vietnamese/.test(GUI.messages[0].content) && /JSON/.test(GUI.messages[0].content), "chỉ dẫn hệ thống: trả JSON, viết bằng tiếng Việt");
  const hang = $("aiKQ").querySelectorAll("tr");
  ok(hang.length === 3 && /T1/.test(hang[1].textContent) && /92 %/.test(hang[1].textContent) && !/ZZ/.test($("aiKQ").textContent) && /Ruộng lúa/.test($("aiKQ").textContent),
     "hiện mô tả và 2 gợi ý hợp lệ (mã viết thường được chuẩn hoá, mã ngoài hệ lớp bị bỏ)");
  $("aiLNg").value = "0.8"; $("aiLXL").checked = true; $("aiGanHet").click(); await sleep(100);
  const p1 = E("ST.diem.E0001");
  ok(p1.nhan[2023] === "T1" && !p1.nhan[2025] && p1.ai[2023].model === "deepseek-chat" && p1.ai[2023].tin_cay === 0.92 && p1.tin[2023] === 2 && p1.xem_lai,
     "gán mọi gợi ý ≥ 80 %: chỉ 2023 = T1, ghi model và độ tin cậy, đánh dấu cần xem lại");
  $("aiXemGui").click(); await until(() => /chỉ dẫn hệ thống/.test($("aiKQ").textContent), 8000, "xem nội dung");
  ok(/nam_can_goi_y/.test($("aiKQ").textContent) && /kB/.test($("aiKQ").textContent), "xem trước đúng nội dung sẽ gửi, không gọi AI");

  // ---------- gán hàng loạt
  E("Object.values(ST.diem).filter(p => p.bo === 'E0').forEach(p => { p.nhan = {}; p.xem_lai = false; delete p.ai; })"); E("render()");
  TRA = (u, h, b) => { const c = b.messages[1].content, j = JSON.parse(c.slice(c.indexOf("{"), c.lastIndexOf("}") + 1));
    return [200, {choices: [{message: {content: JSON.stringify({mo_ta: "m", goi_y: j.nam_can_goi_y.map(y => ({nam: y, ma: y === 2023 ? "N2" : y === 2024 ? "U" : "N1", tin_cay: y === 2025 ? 0.6 : 0.9, ly_do: "r"}))})}}]}]; };
  E("aiTab('loat')"); $("aiLPham").value = "bo"; $("aiLNam").value = "chua"; $("aiLN").value = "3"; $("aiLNghi").value = "0"; $("aiLChiGoiY").checked = false; E("aiLoatHien()");
  ok(/4 điểm/.test($("aiBoTT").textContent), "gán hàng loạt: 4 điểm cần xét trong bộ E0");
  $("aiLChay").click(); await until(() => /^xong 3\/3/.test($("aiLTT").textContent), 20000, "hàng loạt");
  const PL = E("Object.values(ST.diem).filter(p => p.bo === 'E0').map(p => [p.nhan[2023] || '', p.nhan[2024] || '', p.nhan[2025] || '', p.xem_lai])");
  ok(PL.filter(r => r[0] === "N2" && !r[1] && !r[2] && r[3]).length === 3 && PL.filter(r => !r[0]).length === 1 && E("AI.kqL.length") === 9,
     "3 điểm: gán N2 cho 2023 (tin cậy 90 %), không tự gán U, không gán 2025 (60 % dưới ngưỡng); điểm thứ tư chưa xét");
  const n2 = blobs.length; $("aiLCSV").click(); await sleep(50);
  ok(/id,nam,ma_lop,tin_cay,da_gan/.test(await docBlob(blobs[n2])), "CSV kết quả gán hàng loạt");
  TRA = () => [429, {error: {message: "rate limit"}}];
  E("AI.kqL = []"); $("aiLN").value = "1"; E("aiLoatHien()");
  const t0 = Date.now(); $("aiLChay").click(); await until(() => /^xong/.test($("aiLTT").textContent), 30000, "429");
  ok(E("AI.kqL.length") === 1 && /429/.test(E("AI.kqL[0].loi")) && Date.now() - t0 > 9000, "máy chủ báo 429: chờ rồi thử lại hai lần, sau đó ghi lỗi");

  // ---------- AI nhận định kết quả phát hiện thay đổi
  TRA = () => [200, {choices: [{message: {content: "Đoạn một **quan trọng**.\n\nĐoạn hai."}}]}];
  E("cdMo(true)"); $("cdAI").click(); await until(() => $("cdAIKQ").querySelectorAll("p").length >= 3, 8000, "AI nhận định thay đổi");
  const JC = REQ[REQ.length - 1].b.messages[1].content;
  ok(/"nam_truoc":2023/.test(JC) && /ma_tran_tu_den_ha/.test(JC) && /thay đổi phổ khác/.test(JC) && $("cdAIKQ").querySelector("b"), "gửi bảng số liệu thay đổi cho AI, hiện nhận định từng đoạn");

  // ---------- quên khoá
  E("aiTab('kn')"); $("aiQuen").click(); await sleep(100);
  ok(!w.localStorage.getItem("laymauAI_kho_v1") && JSON.stringify(E("AI.kho")) === "{}", "quên mọi khoá: xoá khỏi trình duyệt");

  // ---------- tiếng Nga, tiếng Anh
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|\b(xem|nghi|so theo)\b/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(150);
    E("cdMo(true)"); for (const t of ["tom", "bang", "mt", "bd"]) E(`cdTab('${t}')`); E("cdTab('tom')");
    E("aiMo('kn')"); await sleep(100); E("aiTab('diem')"); E("aiTab('loat')"); E("aiTab('kn')");
    const sot = new Set();
    for (const goc of [$("cdP"), $("dlgAI")]) {
      const wk = w.document.createTreeWalker(goc, 4); let m;
      while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#aiKQ,#cdAIKQ,#aiLKQ")) continue;
        const t = m.nodeValue.trim(); if (t && VI.test(t) && !/Tây|Đông|mẫu thay đổi thử|kiểm tra thay đổi|Phạm Đăng Hiển|Ruộng lúa|E0 thử/.test(t)) sot.add(t.slice(0, 60) + " <" + p.tagName + "#" + (p.id || (p.parentElement && p.parentElement.id) || "") + ">"); }
      [...goc.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v)) sot.add("@" + v.slice(0, 60)); }));
    }
    const miss = E("[...T_MISS]").filter(x => !/thử|Tây|Đông/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở phát hiện thay đổi và trợ lý AI (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size || miss.length ? "\n      " + [...sot].concat(miss.map(x => "T: " + x)).slice(0, 40).join("\n      ") : ""));
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
