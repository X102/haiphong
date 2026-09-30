// Bản 2.7.1: sang điểm mới thì về năm đầu tiên chưa gán; xuất kết quả thành HTML; relay Google Apps Script (phong bì JSON, không
// cần CORS preflight); tạo mã relay ngẫu nhiên
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true, dauNam: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");

  // ---------- về năm đầu tiên chưa gán
  E("ST.bo = 'E0'; buildSetSelect(); setYear(2025); ST.cur = null");
  E("select('E0001', false)"); await sleep(50);
  ok(E("ST.nam") === 2023, "sang điểm mới (chưa gán năm nào): về năm đầu tiên 2023");
  E("label('T1')"); await sleep(30);
  ok(E("ST.diem.E0001.nhan[2023]") === "T1" && E("ST.nam") === 2024, "gán 2023, tự sang 2024 như cũ");
  E("ST.diem.E0002.nhan = {2023: 'N1', 2024: 'N1'}"); E("select('E0002', false)"); await sleep(30);
  ok(E("ST.nam") === 2025, "điểm đã gán 2023, 2024: về năm đầu tiên chưa gán là 2025");
  E("ST.diem.E0003.nhan = {2023: 'X1', 2024: 'X1', 2025: 'X1'}"); E("select('E0003', false)"); await sleep(30);
  ok(E("ST.nam") === 2023, "điểm đã gán đủ: về năm đầu tiên");
  E("setYear(2024)"); E("select('E0003', false)"); await sleep(30);
  ok(E("ST.nam") === 2024, "chọn lại đúng điểm đang xem: giữ năm");
  $("bSet").click(); await sleep(30);
  ok($("cDauNam").checked, "Cài đặt có ô \"về năm đầu tiên chưa gán\", đang bật");
  $("cDauNam").checked = false; $("cOk").click(); await sleep(300);
  E("setYear(2025)"); E("select('E0004', false)"); await sleep(30);
  ok(E("ST.nam") === 2025 && E("CFG.dau_nam") === false, "tắt trong Cài đặt: giữ năm đang gán");

  // ---------- xuất HTML: thống kê, phát hiện thay đổi, trợ lý AI
  E(`map.fitBounds(L.latLngBounds(VG.xa.flatMap(x => [[x.bl[1], x.bl[0]], [x.bl[3], x.bl[2]]])), {animate: false})`);
  await E("tkMo(true)"); await sleep(200);
  $("tkPA").querySelectorAll("input").forEach(i => { i.checked = ["man:lulc_ctx", "man:wc"].includes(i.value); i.onchange(); }); await sleep(20);
  $("tkPV").value = "tinh"; $("tkPV").onchange(); $("tkCG").value = "3"; $("tkChay").click();
  await until(() => /xong/.test($("tkTT").textContent), 30000, "thống kê");
  E("tkVe(0, 'dt')");
  let nb = blobs.length; $("tkHTML").click(); await until(() => blobs.length > nb, 30000, "HTML thống kê");
  const h1 = await docBlob(blobs[nb]);
  ok(blobs[nb].type === "text/html" && /^<!doctype html>/.test(h1) && /<title>Thống kê lớp phủ<\/title>/.test(h1) && /<h2>Diện tích<\/h2>/.test(h1) && /<h2>Đồng thuận<\/h2>/.test(h1) &&
     /<svg/.test(h1) && /kappa/.test(h1) && !/<button/.test(h1) && !/<select/.test(h1) && /Phạm Đăng Hiển/.test(h1) && h1.includes("v" + E("VERSION")),
     "HTML thống kê: tự chứa, đủ các mục, biểu đồ SVG, kappa, không còn nút bấm, có tác giả và phiên bản");
  E("tkMo(false)");
  E("cdMo(true)"); await sleep(200); $("cdPV").value = "tinh"; $("cdNguong").value = "otsu"; $("cdPL").value = "sobo";
  w.document.querySelectorAll('#cdP [data-cd]').forEach(c => { c.checked = ["s2", "cs"].includes(c.dataset.cd); });
  $("cdChay").click(); await until(() => E("CD.kq") && /xong/.test($("cdTrang").textContent), 30000, "phát hiện thay đổi");
  $("cdAIKQ").innerHTML = `<div class="ai-kq"><b>model-thu</b><p>Nhận định thử của AI.</p></div>`;
  nb = blobs.length; $("cdHTML").click(); await until(() => blobs.length > nb, 30000, "HTML thay đổi");
  const h2 = await docBlob(blobs[nb]);
  ok(/Phát hiện thay đổi 2023 → 2025/.test(h2) && /Nhận định thử của AI/.test(h2) && /<h2>Ma trận<\/h2>/.test(h2) && /Ngưỡng độ lớn/.test(h2) && /thay đổi phổ khác/.test(h2),
     "HTML phát hiện thay đổi: nhận định, nhận định của AI, bảng, ma trận, thông số");
  ok(/<img class="bd2" src="data:image\/(png|jpeg);base64,/.test(h2) && /EPSG:3857/.test(h2) && /<img class="bd2"/.test(h1), "bản 2.9: bản đồ trong HTML dựng như bản in (khung, lưới toạ độ, mũi tên bắc, thước tỉ lệ, chú giải kèm diện tích)");
  E("cdMo(false)");
  E(`AI.diem = {p: ST.diem.E0001, gy: [], j: {mo_ta: "x"}, r: {model: "gpt-thu", ms: 1200, text: "{}"}, nam: [2024, 2025], J: {diem: {id: "E0001"}, he_lop: []}, anh: []};
     ai$("aiKQ").innerHTML = '<div class="ai-kq"><b>gpt-thu</b><p>Ruộng lúa thử.</p></div>'`);
  nb = blobs.length; E("bcAIDiem()"); await sleep(30);
  const h3 = await docBlob(blobs[nb]);
  ok(/Trợ lý AI: điểm E0001/.test(h3) && /Ruộng lúa thử/.test(h3) && /&quot;id&quot;: &quot;E0001&quot;|"id": "E0001"/.test(h3) && /gpt-thu/.test(h3), "HTML câu trả lời AI cho một điểm: nhận định, số liệu đã gửi, model");
  E(`AI.kqL = [{id: "E0001", nam: 2023, ma: "T1", tc: 0.9, ly_do: "r", gan: true, model: "m"}, {id: "E0002", loi: "HTTP 429"}]`);
  nb = blobs.length; E("bcAILoat()"); await sleep(30);
  const h4 = await docBlob(blobs[nb]);
  ok(/gán hàng loạt/.test(h4) && /T1 Lúa nước/.test(h4) && /HTTP 429/.test(h4) && /90 %/.test(h4), "HTML gán hàng loạt: bảng kết quả, lỗi");

  // ---------- relay Google Apps Script
  const REQ = []; let TRA = null; const f0 = w.fetch;
  w.fetch = (u, o) => {
    if (!/script\.google\.com/.test(String(u))) return f0(u, o);
    REQ.push({u: String(u), o}); const [st, j] = TRA ? TRA(JSON.parse(o.body)) : [200, {status: 200, body: JSON.stringify({choices: [{message: {content: "OK"}}]})}];
    return Promise.resolve({ok: st < 300, status: st, text: async () => JSON.stringify(j)});
  };
  const URL_GAS = "https://script.google.com/macros/s/AKfyTHU123/exec";
  await E("aiMo('kn')"); $("aiNCC").value = "openai"; $("aiNCC").onchange(); $("aiLuu").value = "phien";
  $("aiTaoMa").click();
  const ma = $("aiRelayMa").value;
  ok($("aiRelayMa").type === "text" && /^[A-Za-z0-9_-]{32}$/.test(ma) && /RELAY_TOKEN/.test($("aiTT").textContent), "tạo mã relay ngẫu nhiên 32 ký tự, hiện ra để chép");
  $("aiRelay").value = URL_GAS; $("aiQuaRelay").checked = true; $("aiThu").click();
  await until(() => /kết nối được/.test($("aiTT").textContent), 5000, "thử qua Apps Script");
  const q = REQ[REQ.length - 1], env = JSON.parse(q.o.body);
  ok(q.u === URL_GAS && q.o.method === "POST" && Object.keys(q.o.headers).join() === "Content-Type" && /^text\/plain/.test(q.o.headers["Content-Type"]) && q.o.redirect === "follow",
     "Apps Script: POST text/plain tới /exec (không tiêu đề riêng nên không cần CORS preflight)");
  ok(env.token === ma && env.ncc === "openai" && env.path === "/v1/chat/completions" && env.method === "POST" && env.body.model && !("X-Relay-Token" in env.headers) && !("Authorization" in env.headers),
     "phong bì: mã relay, nhà cung cấp, đường dẫn, thân yêu cầu; không có khoá trong trình duyệt");
  ok($("aiRelayMa").type === "password", "sau khi lưu, ô mã relay trở lại dạng ẩn");
  TRA = e => e.method === "GET" ? [200, {status: 200, body: JSON.stringify({data: [{id: "gpt-b"}, {id: "gpt-a"}]})}] : [200, {status: 401, body: JSON.stringify({error: {message: "wrong or missing relay token", relay: true}})}];
  $("aiLayDS").click(); await sleep(200);
  const e2 = JSON.parse(REQ[REQ.length - 1].o.body);
  ok(e2.method === "GET" && e2.path === "/v1/models" && e2.body === null && $("aiModelDS").querySelectorAll("option").length === 2, "lấy danh sách model qua Apps Script");
  $("aiThu").click(); await until(() => /lỗi/.test($("aiTT").textContent), 5000, "lỗi 401");
  ok(/401/.test($("aiTT").textContent) && /relay token/.test($("aiTT").textContent), "lỗi relay (sai mã) hiện rõ mã 401");
  TRA = () => [200, "<html>not json</html>"];
  $("aiThu").click(); await until(() => /lỗi/.test($("aiTT").textContent) && /exec/.test($("aiTT").textContent), 5000, "trả lời sai dạng");
  ok(/Bất kỳ ai/.test($("aiTT").textContent), "Apps Script trả lời sai dạng: nhắc kiểm tra /exec và quyền \"Bất kỳ ai\"");
  w.fetch = f0;

  // ---------- tiếng Nga, tiếng Anh
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|\b(xem|nghi|so theo)\b/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(100); await E("aiMo('kn')"); E("tkMo(true)"); E("plMo(true)"); $("bSet").click(); await sleep(100);
    const sot = new Set();
    for (const goc of [$("dlgAI"), $("dlgSet"), $("tkP"), $("plP")]) {
      const wk = w.document.createTreeWalker(goc, 4); let m;
      while ((m = wk.nextNode())) { const p = m.parentElement; if (!p || p.closest("script,style,#aiKQ,#aiLKQ")) continue; const t = m.nodeValue.trim();
        if (t && VI.test(t) && !/Tây|Đông|Thu|thử|Phạm Đăng Hiển/.test(t)) sot.add(t.slice(0, 60)); }
      [...goc.querySelectorAll("[title],[placeholder]")].forEach(e => ["title", "placeholder"].forEach(k => { const v = e.getAttribute(k); if (v && VI.test(v)) sot.add("@" + v.slice(0, 60)); }));
    }
    const miss = E("[...T_MISS]").filter(x => !/E0 thử/.test(x));
    ok(sot.size === 0 && miss.length === 0, `${L_}: không sót chữ tiếng Việt ở Cài đặt, AI, Lớp phủ, Phân loại (sót ${sot.size}, T_MISS ${miss.length})` +
       (sot.size + miss.length ? "\n      " + [...sot, ...miss].slice(0, 20).join("\n      ") : ""));
    $("dlgSet").close(); E("tkMo(false)"); E("plMo(false)");
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
