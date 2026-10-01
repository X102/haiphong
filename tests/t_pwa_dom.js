// Bản 2.9.1: cài như ứng dụng (PWA): thẻ trong <head>, manifest, biểu tượng, nút Cài ứng dụng (hộp cài của trình duyệt hoặc hướng dẫn
// theo thiết bị), báo bản mới, mở tệp bằng ứng dụng (launchQueue: một tệp CSV, nhiều tệp tiến độ), tiếng Nga, tiếng Anh.
const fs = require("fs"), path = require("path");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const GOC = path.join(__dirname, "..");
const WEB = ["web", "."].map(d => path.join(GOC, d)).find(d => fs.existsSync(path.join(d, "manifest.webmanifest")));
(async () => {
  // ---------- tệp của ứng dụng: manifest, biểu tượng, service worker
  ok(!!WEB, "có manifest.webmanifest bên cạnh trang (" + WEB + ")");
  const M = JSON.parse(fs.readFileSync(path.join(WEB, "manifest.webmanifest"), "utf8"));
  ok(M.name && M.short_name && M.start_url === "./" && M.scope === "./" && M.display === "standalone" && /^#[0-9a-f]{6}$/i.test(M.theme_color),
     `manifest: ${M.short_name}, mở từ ./, cửa sổ riêng, màu ${M.theme_color}`);
  const kt = f => { const b = fs.readFileSync(path.join(WEB, f)); return b.slice(1, 4).toString() === "PNG" ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
  const ic = M.icons.filter(i => i.type === "image/png").map(i => ({i, k: kt(i.src)}));
  ok(ic.every(q => q.k && q.i.sizes === q.k.join("x")) && ic.some(q => q.i.sizes === "512x512" && q.i.purpose === "maskable") && ic.some(q => q.i.sizes === "192x192" && q.i.purpose === "any"),
     "biểu tượng PNG đúng cỡ khai báo (192, 512, có bản maskable)");
  ok(fs.existsSync(path.join(WEB, "sw.js")) && /hp-geoportal-2\.9\.\d/.test(fs.readFileSync(path.join(WEB, "sw.js"), "utf8")) && kt("icons/apple-touch-icon.png").join() === "180,180",
     "service worker có số phiên bản; biểu tượng iPhone 180 × 180");
  ok(M.file_handlers && M.file_handlers[0].accept["application/json"].includes(".json") && M.shortcuts.length === 3, "mở tệp .json, .csv, .geojson bằng ứng dụng; lối tắt ba ngôn ngữ");

  // ---------- trang
  let LQ = null;
  const {w, $, E, sleep, until, errs} = moTrang({truoc: w => { w.launchQueue = {setConsumer: f => { LQ = f; }};
    if (!w.Blob.prototype.text) w.Blob.prototype.text = function () { return new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(this); }); };   // jsdom chưa có Blob.text
  }});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  const hd = w.document.head;
  ok(E("VERSION") === "2.9.1" && hd.querySelector('link[rel="manifest"]').getAttribute("href") === "manifest.webmanifest" && hd.querySelector('meta[name="theme-color"]') &&
     hd.querySelector('link[rel="apple-touch-icon"]') && hd.querySelector('meta[name="apple-mobile-web-app-capable"]'), "thẻ <head>: manifest, màu, biểu tượng iPhone, chế độ ứng dụng");
  ok(E("!!window.PWA && PWA.coTheCai === true && PWA.standalone === false") && !$("bCai").hidden, "trang mở qua http://localhost: cài được; nút Cài ứng dụng hiện");
  // chưa có hộp cài của trình duyệt: hiện hướng dẫn, tô dòng của thiết bị
  $("bCai").click(); await sleep(30);
  ok($("dlgCai").open && $("caiNgay").hidden && /hướng dẫn/.test($("caiTT").textContent) && w.document.querySelector('#dlgCai li.on') &&
     w.document.querySelector('#dlgCai li.on').dataset.nen === E("PWA.nen"), "không có hộp cài: hiện hướng dẫn, tô dòng của thiết bị (" + E("PWA.nen") + ")");
  $("caiDong").click();
  // trình duyệt báo cài được (beforeinstallprompt)
  let goi = 0;
  const ev = new w.Event("beforeinstallprompt", {cancelable: true}); ev.prompt = () => { goi++; }; ev.userChoice = Promise.resolve({outcome: "accepted"});
  w.dispatchEvent(ev); await sleep(10);
  ok(ev.defaultPrevented && E("!!PWA.hoan"), "giữ sự kiện beforeinstallprompt (không để trình duyệt tự hiện)");
  $("bCai").click(); await sleep(30);
  ok(goi === 1 && E("PWA.daCai") && !E("PWA.hoan") && /đã cài ứng dụng/.test($("msgs").textContent), "bấm Cài ứng dụng: mở hộp cài của trình duyệt, chấp nhận thì báo đã cài");
  // bản mới
  let gui = null; E("PWA.moi = {postMessage: m => { window.__gui = m; }}; PWA.ve()"); await sleep(10);
  ok(!$("pwaMoi").hidden, "có bản mới: hiện dải báo Cập nhật");
  $("pwaCapNhat").click(); gui = E("window.__gui");
  ok(gui === "SKIP_WAITING" && E("PWA.yeuCauTai"), "bấm Cập nhật: báo service worker mới thay bản cũ, trang tải lại khi đổi");
  $("pwaBo").click(); ok($("pwaMoi").hidden, "✕: ẩn dải báo");
  // chạy như ứng dụng đã cài: ẩn nút
  E("PWA.standalone = true; PWA.ve()"); ok($("bCai").hidden, "đang chạy như ứng dụng: ẩn nút cài"); E("PWA.standalone = false; PWA.ve()");
  // mở từ tệp trên máy
  E("PWA.coTheCai = false; PWA.hoan = null; PWA.daCai = false"); $("bCai").click(); await sleep(20);
  ok(/từ tệp trên máy/.test($("caiTT").textContent) && /https/.test($("caiTT").textContent), "mở từ tệp: giải thích cần địa chỉ https"); $("caiDong").click(); E("PWA.coTheCai = true");

  // ---------- mở tệp bằng ứng dụng (launchQueue)
  ok(typeof LQ === "function", "đăng ký nhận tệp mở bằng ứng dụng (launchQueue)");
  const n0 = E("Object.keys(ST.diem).length");
  await LQ({files: [{getFile: async () => new w.File(["id,lon,lat\nA1,106.66,20.86\nA2,106.67,20.87\n"], "diem_moi.csv", {type: "text/csv"})}]}); await sleep(100);
  ok(E("Object.keys(ST.diem).length") === n0 + 2, "mở một tệp CSV bằng ứng dụng: thêm 2 điểm như nút Tải tệp…");
  const goc = E("JSON.stringify(phienXuat())");
  await LQ({files: [{getFile: async () => new w.File([goc], "a.json")}, {getFile: async () => new w.File([goc], "b.json")}]}); await sleep(100);
  ok($("dlgGopTep").open && $("gtDS").querySelectorAll("tr").length === 3, "mở nhiều tệp tiến độ bằng ứng dụng: vào hộp thoại gộp"); $("gtDong").click();

  // ---------- tiếng Nga, tiếng Anh
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const L_ of ["ru", "en"]) {
    E("T_MISS.clear()"); E(`setLang('${L_}')`); await sleep(50); $("bCai").click(); await sleep(20); E("PWA.moi = {postMessage() {}}; PWA.ve()");
    const sot = [];
    for (const goc2 of [$("dlgCai"), $("pwaMoi"), $("bCai")]) {
      const wk = w.document.createTreeWalker(goc2, 4); let m; while ((m = wk.nextNode())) { const t = m.nodeValue.trim(); if (t && VI.test(t)) sot.push(t.slice(0, 60)); }
      [goc2, ...goc2.querySelectorAll("[title]")].forEach(e => { const v = e.getAttribute("title"); if (v && VI.test(v)) sot.push("@" + v.slice(0, 60)); });
    }
    const miss = E("[...T_MISS]").filter(x => !/thử/.test(x));
    ok(!sot.length && !miss.length, `${L_}: hướng dẫn cài, nút, dải báo đã dịch` + (sot.length + miss.length ? ": " + sot.concat(miss).slice(0, 8).join(" | ") : ""));
    $("caiDong").click(); E("PWA.moi = null; PWA.ve()");
  }
  E("setLang('vi')");
  ok(!errs.length, loiJS(errs));
  xong();
})().catch(e => { console.error("LỖI", e); process.exit(1); });
