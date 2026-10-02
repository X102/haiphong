/* Service worker của Geoportal lớp phủ Hải Phòng (ứng dụng cài được, PWA). Bản 3.2.1.
   - Trang (index.html), manifest, biểu tượng, cấu hình: lấy mạng trước, mất mạng thì dùng bản đã lưu -> mở được khi không có mạng.
   - Thư viện từ CDN (địa chỉ có số phiên bản): lưu một lần, dùng lại.
   - Dữ liệu (COG đọc theo đoạn, ảnh nền, Hugging Face, API AI...): không đụng tới, luôn đi thẳng ra mạng. */
const CACHE = "hp-geoportal-3.2.1", LOI = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/maskable-192.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png", "./icons/icon.svg"];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)\//;
const VO = /\/(index\.html|manifest\.webmanifest|cau_hinh\.json)?$|\/icons\/[^/]+$|\.(js|css)$/;   // vỏ ứng dụng cùng nguồn (không gồm dữ liệu)
async function luu(c, url) { try { const r = await fetch(url, {cache: "no-cache"}); if (r.ok) await c.put(url, r.clone()); return r; } catch (e) { return null; } }
self.addEventListener("install", e => { e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  await Promise.all(LOI.map(u => luu(c, u)));
  try {                                          // thư viện mà trang khai báo (script, stylesheet)
    const r = await c.match("./"); const html = r ? await r.text() : "";
    const ds = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m => new URL(m[1], self.registration.scope).href)
      .filter(u => CDN.test(u) || (u.startsWith(self.registration.scope) && /\.(js|css)$/.test(new URL(u).pathname)));
    await Promise.all([...new Set(ds)].map(u => luu(c, u)));
  } catch (e) { /* thiếu mạng: lưu dần khi dùng */ }
})()); });
self.addEventListener("activate", e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("hp-geoportal-") && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()); });
self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });
async function mangTruoc(req, duPhong) {
  const c = await caches.open(CACHE);
  try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
  catch (e) { return (await c.match(req, {ignoreSearch: req.mode === "navigate"})) || (duPhong && await c.match(duPhong)) || Response.error(); }
}
async function luuTruoc(req) {
  const c = await caches.open(CACHE), co = await c.match(req); if (co) return co;
  const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r;
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;          // COG đọc theo đoạn, gửi dữ liệu: đi thẳng ra mạng
  const url = new URL(req.url), cung = url.origin === self.location.origin;
  if (req.mode === "navigate" && cung) { e.respondWith(mangTruoc(req, "./")); return; }
  if (cung && VO.test(url.pathname) && url.pathname.startsWith(new URL(self.registration.scope).pathname)) { e.respondWith(mangTruoc(req)); return; }
  if (CDN.test(req.url)) { e.respondWith(luuTruoc(req)); return; }
});
