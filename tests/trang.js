// Mở LAY_MAU_DA_NAM.html trong jsdom (thư viện nạp tại chỗ, canvas và vài API giả), dữ liệu qua http://127.0.0.1:8765/
const fs = require("fs"), path = require("path");
const {NM, ok} = require("./kiemtra");
const {JSDOM, VirtualConsole} = require(NM + "/jsdom");
function moTrang(opt = {}) {
  const trangP = ["LAY_MAU_DA_NAM.html", "index.html"].map(f => path.join(__dirname, "..", f)).find(f => fs.existsSync(f));   // thư mục dựng hoặc kho GitHub
  let html = fs.readFileSync(trangP, "utf8");
  const inl = f => "<script>" + fs.readFileSync(f, "utf8").replace(/<\/script/g, "<\\/script") + "</script>";
  html = html.replace(/<script src="[^"]*\/leaflet\/1\.9\.4\/leaflet\.min\.js"><\/script>/, () => inl(NM + "/leaflet/dist/leaflet.js"))
             .replace(/<script src="[^"]*proj4[^"]*"><\/script>/, () => inl(NM + "/proj4/dist/proj4.js"))
             .replace(/<script src="[^"]*geotiff[^"]*"><\/script>/, () => inl(NM + "/geotiff/dist-browser/geotiff.js"))
             .replace(/<script src="[^"]*flatgeobuf[^"]*"><\/script>/, "")   // jsdom: dùng bản ESM của node (xem beforeParse)
             .replace(/<script src="[^"]*polygon-clipping[^"]*"><\/script>/, () => fs.existsSync(NM + "/polygon-clipping/dist/polygon-clipping.umd.min.js") ? inl(NM + "/polygon-clipping/dist/polygon-clipping.umd.min.js") : "")   // bản 3.1
             .replace(/<script src="[^"]*osmtogeojson[^"]*"><\/script>/, () => inl(NM + "/osmtogeojson/osmtogeojson.js"))
             .replace(/<script src="[^"]*leaflet-geoman[^"]*"><\/script>/, () => opt.geoman ? inl(NM + "/@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.min.js") : "")
             .replace(/<link[^>]*(leaflet|geoman)[^>]*>/g, "");
  const errs = [], puts = [], blobs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { if (!/Not implemented/.test(e.message)) errs.push("jsdom: " + e.message + (e.detail ? " " + (e.detail.stack || e.detail) : "")); });
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));
  const dom = new JSDOM(html, {url: "http://localhost:8765/LAY_MAU_DA_NAM.html", runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      // trả ArrayBuffer thuộc "cõi" của cửa sổ jsdom (flatgeobuf kiểm tra kiểu theo cõi; trình duyệt thật không có vấn đề này)
      w.fetch = (u, o) => fetch(new URL(u, w.location.href).href, o).then(r => new Proxy(r, {get(t, k) {
        if (k === "arrayBuffer") return async () => { const b = await t.arrayBuffer(), a = new w.ArrayBuffer(b.byteLength); new w.Uint8Array(a).set(new Uint8Array(b)); return a; };
        const v = t[k]; return typeof v === "function" ? v.bind(t) : v; }}));
      w.localStorage.setItem("laymau_hp_cfg_v1", JSON.stringify({repo: "x/y", rev: "main", base: "http://127.0.0.1:8765/", years: [2023, 2024, 2025], auto: true, dau_nam: !!opt.dauNam}));
      w.localStorage.setItem("laymau_hp_ol_v1", JSON.stringify(opt.olPref || {}));
      if (opt.lang !== null) w.localStorage.setItem("laymau_hp_lang_v2", JSON.stringify(opt.lang || "vi"));   // bài thử viết theo chữ tiếng Việt; lang: null = để trang tự chọn (mặc định tiếng Anh)
      const noop = () => {};
      w.Worker = class { postMessage() {} terminate() {} addEventListener() {} };
      w.TextDecoder = require("util").TextDecoder; w.TextEncoder = require("util").TextEncoder;
      // bản UMD của flatgeobuf chạy đúng trong Chromium (kiểm bằng ảnh chụp) nhưng vấp lỗi "cõi" của jsdom khi giải hình học;
      // trong jsdom dùng cùng thư viện bản ESM chạy bằng node, đọc cùng tệp qua HTTP Range
      console.debug = () => {};              // thư viện in rất nhiều dòng gỡ lỗi
      w.flatgeobuf = {deserialize: async function* (u, o) {
        const m = await import(NM + "/flatgeobuf/lib/mjs/geojson.js");
        for await (const f of m.deserialize(new URL(u, w.location.href).href, o)) yield f;
      }};
      if (!w.ReadableStream) w.ReadableStream = require("stream/web").ReadableStream;
      w.HTMLCanvasElement.prototype.getContext = function () {
        return new Proxy({canvas: this}, {get(t, k) {
          if (k in t) return t[k];
          if (k === "createImageData") return (a, b) => ({width: a, height: b, data: new Uint8ClampedArray(a * b * 4)});
          if (k === "putImageData") return img => puts.push({w: img.width, h: img.height, op: img.data.filter((v, i) => i % 4 === 3 && v > 0).length});
          if (k === "measureText") return () => ({width: 10});
          if (k === "getImageData") return (x, y, a, b) => ({data: new Uint8ClampedArray(a * b * 4)});
          return noop;
        }, set(t, k, v) { t[k] = v; return true; }});
      };
      w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
      Object.defineProperty(w.HTMLElement.prototype, "clientWidth", {get() { return 900; }});
      Object.defineProperty(w.HTMLElement.prototype, "clientHeight", {get() { return 700; }});
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.show = function () { this.open = true; };
      // bản 2.6: WebCrypto của node cho phần mã hoá khoá API (jsdom chưa có crypto.subtle); trang thử chạy như trang https
      if (!w.crypto.subtle) Object.defineProperty(w.crypto, "subtle", {value: require("crypto").webcrypto.subtle});
      Object.defineProperty(w, "isSecureContext", {value: true});
      if (!w.AbortController) w.AbortController = AbortController;
      w.HTMLDialogElement.prototype.close = function () { this.open = false; };
      w.URL.createObjectURL = b => { blobs.push(b); return "blob:x"; }; w.URL.revokeObjectURL = noop;
      w.confirm = () => true;
      w.addEventListener("error", e => errs.push("window: " + (e.error && e.error.stack || e.message)));
      w.addEventListener("unhandledrejection", e => errs.push("reject: " + (e.reason && e.reason.stack || e.reason)));
      if (opt.truoc) opt.truoc(w);              // bản 2.9.1: bài thử cài thêm API giả (launchQueue...) trước khi trang chạy
    }});
  const w = dom.window, $ = id => w.document.getElementById(id), E = s => w.eval(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = (k, extra) => w.document.dispatchEvent(new w.KeyboardEvent("keydown", Object.assign({key: k, bubbles: true}, extra || {})));
  async function until(f, ms, what) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (e) { /* chưa sẵn */ } await sleep(50); } ok(false, "hết giờ chờ: " + what); return false; }
  const docBlob = b => new Promise(res => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.readAsText(b); });
  return {w, $, E, sleep, key, until, errs, puts, blobs, docBlob};
}
const loiJS = errs => "không có lỗi JS" + (errs.length ? ":\n    " + errs.slice(0, 6).map(s => s.slice(0, 400)).join("\n    ") : "");
module.exports = {moTrang, loiJS};
