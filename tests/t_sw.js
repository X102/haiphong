// Bản 2.9.1: service worker của ứng dụng cài được, chạy trong node với self, caches, fetch giả:
// lưu vỏ ứng dụng và thư viện CDN khi cài; trang lấy mạng trước, mất mạng dùng bản đã lưu; dữ liệu (đọc theo đoạn, Hugging Face,
// ảnh nền, gửi dữ liệu) không bị chặn hay lưu; xoá bộ nhớ của bản cũ; nhận lệnh cập nhật.
const fs = require("fs"), path = require("path"), vm = require("vm");
const {ok, xong} = require("./kiemtra");
const GOC = path.join(__dirname, "..");
const SWF = ["web/sw.js", "sw.js"].map(f => path.join(GOC, f)).find(f => fs.existsSync(f));
const SCOPE = "https://x102.github.io/haiphong/";
const HTML = `<html><head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script><script src="https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js"></script>
<link rel="manifest" href="manifest.webmanifest"></head><body>trang v1</body></html>`;
let mang = true; const goi = [];
const tra = (u) => {                          // máy chủ giả
  if (u.startsWith(SCOPE) && /\/(index\.html)?(\?.*)?$/.test(new URL(u).pathname + new URL(u).search)) return new Response(HTML, {status: 200, headers: {"content-type": "text/html"}});
  if (u.startsWith(SCOPE)) return new Response("tệp " + u, {status: 200});
  if (/cdnjs|jsdelivr|unpkg/.test(u)) return new Response("thư viện " + u, {status: 200});
  return new Response("dữ liệu " + u, {status: 200});
};
const hoa = r => (typeof r === "string" ? new URL(r, SCOPE).href : r.url);
const fetchGia = async (r) => { const u = hoa(r); goi.push(u); if (!mang) throw new TypeError("Failed to fetch"); return tra(u); };
const KHO = new Map();
const moKho = n => { if (!KHO.has(n)) { const m = new Map(); KHO.set(n, {
  m, put: async (r, res) => { m.set(hoa(r), await res.clone().text()); },
  match: async (r, o) => { let u = hoa(r); if (o && o.ignoreSearch) { const x = new URL(u); x.search = ""; u = x.href; if (!m.has(u)) for (const k of m.keys()) if (k.split("?")[0] === u) { u = k; break; } } return m.has(u) ? new Response(m.get(u), {status: 200}) : undefined; }}); }
  return KHO.get(n); };
const caches = {open: async n => moKho(n), keys: async () => [...KHO.keys()], delete: async n => KHO.delete(n), match: async r => { for (const c of KHO.values()) { const x = await c.match(r); if (x) return x; } }};
const H = {}; let boQua = 0, nhan = 0;
const self = {addEventListener: (t, f) => { H[t] = f; }, registration: {scope: SCOPE}, location: new URL(SCOPE + "sw.js"), skipWaiting: () => { boQua++; }, clients: {claim: async () => { nhan++; }}};
const ctx = {self, caches, fetch: fetchGia, URL, Response, Headers, Request, console, Promise, Set, Map};
const ma = fs.readFileSync(SWF, "utf8");
vm.runInNewContext(ma, ctx);
const CACHE = /const CACHE = "([^"]+)"/.exec(ma)[1];
const chay = async (t, e) => { let w = null; e.waitUntil = p => { w = p; }; H[t](e); if (w) await w; };
const yc = (url, o = {}) => ({url: new URL(url, SCOPE).href, method: o.method || "GET", mode: o.mode || "cors", headers: new Headers(o.headers || {})});
async function den(req) { let p = null; H.fetch({request: req, respondWith: x => { p = x; }}); return p ? {r: await p} : null; }
(async () => {
  ok(!!SWF && /^hp-geoportal-\d/.test(CACHE), "service worker " + path.relative(GOC, SWF) + ", bộ nhớ " + CACHE);
  KHO.set("hp-geoportal-2.9", moKho("hp-geoportal-2.9")); KHO.set("kho-khac", moKho("kho-khac"));
  await chay("install", {});
  const c = KHO.get(CACHE).m;
  ok([SCOPE, SCOPE + "index.html", SCOPE + "manifest.webmanifest", SCOPE + "icons/icon-192.png", SCOPE + "icons/maskable-512.png"].every(u => c.has(u)), "cài: lưu trang, manifest, biểu tượng");
  ok(c.has("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js") && c.has("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css") &&
     c.has("https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js"), "cài: lưu các thư viện CDN mà trang khai báo");
  await chay("activate", {});
  ok(!KHO.has("hp-geoportal-2.9") && KHO.has("kho-khac") && nhan === 1, "kích hoạt: xoá bộ nhớ của bản cũ, không đụng bộ nhớ khác, nhận quyền các trang đang mở");
  // dữ liệu: không chặn
  const d1 = await den(yc("https://huggingface.co/datasets/lopmaybay/haiphong-lop-tham-chieu/resolve/main/s2d/s2d_2025.tif", {headers: {Range: "bytes=0-65535"}}));
  const d2 = await den(yc(SCOPE + "s2d/s2d_2025.tif", {headers: {Range: "bytes=0-100"}}));
  const d3 = await den(yc("https://huggingface.co/datasets/x/resolve/main/manifest.json"));
  const d4 = await den(yc("https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/1/2/3"));
  const d5 = await den(yc("https://api.deepseek.com/v1/chat/completions", {method: "POST"}));
  const d6 = await den(yc(SCOPE + "du_lieu/manifest.json"));
  ok([d1, d2, d3, d4, d5, d6].every(x => x === null), "đọc COG theo đoạn, Hugging Face, ảnh nền, gửi API, dữ liệu cùng nguồn: đi thẳng ra mạng, không lưu");
  // trang: mạng trước
  goi.length = 0; const t1 = await den(yc(SCOPE + "?lang=ru", {mode: "navigate"}));
  ok(t1 && /trang v1/.test(await t1.r.text()) && goi.length === 1, "mở trang khi có mạng: lấy bản mới từ mạng");
  mang = false;
  const t2 = await den(yc(SCOPE + "?lang=en", {mode: "navigate"}));
  ok(t2 && t2.r.status === 200 && /trang v1/.test(await t2.r.text()), "mất mạng: mở trang từ bản đã lưu (kể cả địa chỉ có ?lang)");
  const l1 = await den(yc("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js", {mode: "no-cors"}));
  ok(l1 && /thư viện/.test(await l1.r.text()), "mất mạng: thư viện Leaflet lấy từ bộ nhớ");
  const m1 = await den(yc(SCOPE + "manifest.webmanifest"));
  ok(m1 && m1.r.status === 200, "mất mạng: manifest, biểu tượng lấy từ bộ nhớ");
  mang = true; goi.length = 0;
  await den(yc("https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js", {mode: "no-cors"}));
  ok(goi.length === 0, "thư viện CDN (có số phiên bản) đã lưu: không tải lại");
  H.message({data: "SKIP_WAITING"}); ok(boQua === 1, "nhận lệnh cập nhật từ trang (SKIP_WAITING)");
  xong();
})().catch(e => { console.error("LỖI", e); process.exit(1); });
