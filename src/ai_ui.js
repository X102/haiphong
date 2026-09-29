/* =============================== BẢN 2.6: TRỢ LÝ AI =============================== */
/* Gửi số liệu của một điểm (10 băng và chỉ số theo năm, đường mùa vụ 6 kỳ, giá trị tại điểm, bản đồ lớp) kèm ảnh (dải ảnh
   theo năm, đồ thị mùa vụ) cho model AI để nhận mô tả và gợi ý nhãn; gán hàng loạt theo ngưỡng tin cậy; nhận định kết quả
   phát hiện thay đổi. Không cần VPN: nhà cung cấp phục vụ ở Nga (DeepSeek, Yandex AI Studio, ProxyAPI), model chạy trên
   máy mình (Ollama, LM Studio), hoặc relay riêng trên Hugging Face Space giữ khoá ở máy chủ.
   Khoá API: mã hoá AES-GCM bằng khoá không xuất được nằm trong IndexedDB của trình duyệt này (hoặc bằng mật khẩu riêng),
   lưu dưới tên "laymauAI_…" nên KHÔNG nằm trong tệp tiến độ xuất ra; mọi thông báo lỗi đều được che khoá. */
const AI_NCC = {
  deepseek:  {ten: "DeepSeek", kieu: "oai", url: "https://api.deepseek.com/v1", model: "deepseek-chat", anh: false, nga: true, relay: true},
  yandex:    {ten: "Yandex AI Studio", kieu: "oai", url: "https://llm.api.cloud.yandex.net/v1", model: "yandexgpt/latest", anh: false, nga: true, relay: true, thuMuc: true},
  proxyapi:  {ten: "ProxyAPI (GPT, Claude, Gemini, Grok, DeepSeek; trả bằng rúp)", kieu: "oai", url: "https://api.proxyapi.ru/v1", model: "anthropic/claude-haiku-4-5", anh: true, nga: true, relay: true},
  openai:    {ten: "OpenAI (ChatGPT)", kieu: "oai", url: "https://api.openai.com/v1", model: "gpt-4.1-mini", anh: true, relay: true},
  gemini:    {ten: "Google Gemini", kieu: "gem", url: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash", anh: true, relay: true},
  anthropic: {ten: "Anthropic Claude", kieu: "ant", url: "https://api.anthropic.com/v1", model: "claude-sonnet-5-5", anh: true, relay: true},
  xai:       {ten: "xAI Grok", kieu: "oai", url: "https://api.x.ai/v1", model: "grok-4", anh: true, relay: true},
  ollama:    {ten: "Ollama (chạy trên máy mình)", kieu: "oai", url: "http://localhost:11434/v1", model: "qwen2.5vl", anh: true, nga: true, khongKhoa: true},
  lmstudio:  {ten: "LM Studio (chạy trên máy mình)", kieu: "oai", url: "http://localhost:1234/v1", model: "", anh: true, nga: true, khongKhoa: true},
  tuy:       {ten: "Tuỳ chọn (tương thích OpenAI)", kieu: "oai", url: "", model: "", anh: true},
};
const AI_KCFG = "laymauAI_cfg_v1", AI_KKHO = "laymauAI_kho_v1";      // không bắt đầu bằng laymau_hp_: không vào tệp tiến độ
function aiLS(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
const AI = {cfg: Object.assign({ncc: "deepseek", m: {}, u: {}, qr: {}, anh: {}, tm: "", relay: "", luu: "thiet_bi"}, aiLS(AI_KCFG) || {}),
            kho: null, mk: null, salt: null, chay: false, dung: false, kqL: [], diem: null};
const ai$ = id => document.getElementById(id);
function aiLuuCfg() { aiLS(AI_KCFG, AI.cfg); }

/* ---------- che khoá trong mọi chuỗi hiện ra (lỗi, nhật ký) ---------- */
function aiAn(s) {
  let t = String(s == null ? "" : s);
  Object.values(AI.kho || {}).forEach(k => { if (k && String(k).length >= 6) t = t.split(String(k)).join("***"); });
  return t.replace(/\b(sk|xai|gsk|AIza|AQVN|y0_|t1\.)[A-Za-z0-9_\-.]{10,}/g, "***").replace(/(Bearer|Api-Key)\s+[A-Za-z0-9._\-]+/gi, "$1 ***");
}
function aiChe(k) { k = String(k || ""); return k.length > 10 ? k.slice(0, 3) + "…" + k.slice(-4) : k ? "***" : ""; }

/* ---------- kho khoá mã hoá ---------- */
const aiEnc = new TextEncoder(), aiDec = new TextDecoder();
function aiB64(buf) { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function aiUnB64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function aiCoMaHoa() { return !!(window.crypto && crypto.subtle && window.isSecureContext !== false); }
function aiIDB() {
  return new Promise((ok, loi) => {
    if (!window.indexedDB) { loi(new Error(T("trình duyệt không cho lưu vào IndexedDB: chọn cách lưu khác"))); return; }
    const r = indexedDB.open("laymauAI", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("k"); r.onsuccess = () => ok(r.result); r.onerror = () => loi(r.error);
  });
}
async function aiKhoaTB(tao) {                 // khoá AES không xuất được, gắn với trình duyệt này
  const db = await aiIDB();
  const lay = () => new Promise((ok, loi) => { const q = db.transaction("k").objectStore("k").get("aes"); q.onsuccess = () => ok(q.result); q.onerror = () => loi(q.error); });
  let k = await lay();
  if (!k && tao) {
    k = await crypto.subtle.generateKey({name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
    await new Promise((ok, loi) => { const t = db.transaction("k", "readwrite"); t.objectStore("k").put(k, "aes"); t.oncomplete = ok; t.onerror = () => loi(t.error); });
  }
  return k || null;
}
async function aiKhoaMK(mk, salt) {
  const b = await crypto.subtle.importKey("raw", aiEnc.encode(mk), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256"}, b, {name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
}
async function aiGhiKho() {
  const che = AI.cfg.luu, obj = AI.kho || {};
  aiLS(AI_KKHO, null); try { sessionStorage.removeItem(AI_KKHO); } catch (e) { /* bỏ */ }
  if (che === "khong" || !Object.keys(obj).length) return;
  if (che === "phien") { try { sessionStorage.setItem(AI_KKHO, JSON.stringify(obj)); } catch (e) { /* bỏ */ } return; }
  if (!aiCoMaHoa()) throw new Error(T("trình duyệt không mã hoá được (cần mở trang qua https): chọn cách lưu \"chỉ đến khi đóng thẻ\""));
  let key, salt = null;
  if (che === "mat_khau") {
    if (!AI.mk) { const mk = ai$("aiMK").value; if (mk.length < 6) throw new Error(T("mật khẩu cần ít nhất 6 ký tự")); AI.salt = crypto.getRandomValues(new Uint8Array(16)); AI.mk = await aiKhoaMK(mk, AI.salt); }
    key = AI.mk; salt = AI.salt;
  } else key = await aiKhoaTB(true);
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = await crypto.subtle.encrypt({name: "AES-GCM", iv}, key, aiEnc.encode(JSON.stringify(obj)));
  aiLS(AI_KKHO, {v: 1, che, iv: aiB64(iv), ct: aiB64(ct), salt: salt ? aiB64(salt) : null});
}
async function aiMoKho() {                     // giải mã khi cần (một lần mỗi phiên)
  if (AI.kho) return AI.kho;
  try { const s = sessionStorage.getItem(AI_KKHO); if (s) return (AI.kho = JSON.parse(s)); } catch (e) { /* bỏ */ }
  const r = aiLS(AI_KKHO);
  if (!r) return (AI.kho = {});
  if (!aiCoMaHoa()) return {};
  try {
    let key;
    if (r.che === "mat_khau") {
      const mk = ai$("aiMK").value;
      if (!mk) throw Object.assign(new Error(T("khoá API đã lưu bằng mật khẩu: nhập mật khẩu ở thẻ Kết nối rồi thử lại")), {mk: true});
      AI.salt = aiUnB64(r.salt); key = AI.mk = await aiKhoaMK(mk, AI.salt);
    } else key = await aiKhoaTB(false);
    if (!key) throw new Error("no key");
    const pt = await crypto.subtle.decrypt({name: "AES-GCM", iv: aiUnB64(r.iv)}, key, aiUnB64(r.ct));
    return (AI.kho = JSON.parse(aiDec.decode(pt)));
  } catch (e) {
    AI.mk = null;
    if (e.mk) throw e;
    throw new Error(T("không mở được khoá đã lưu (sai mật khẩu, hoặc dữ liệu trình duyệt đã bị xoá): nhập lại khoá"));
  }
}
async function aiQuen() {
  if (!confirm(T("Xoá mọi khoá API và mã relay đã lưu trên trình duyệt này?"))) return;
  AI.kho = {}; AI.mk = null; aiLS(AI_KKHO, null); try { sessionStorage.removeItem(AI_KKHO); } catch (e) { /* bỏ */ }
  try { const db = await aiIDB(); db.transaction("k", "readwrite").objectStore("k").delete("aes"); } catch (e) { /* bỏ */ }
  aiHienCfg(); aiTT(T("đã xoá mọi khoá"));
}

/* ---------- gọi API ---------- */
function aiModel(ncc) { ncc = ncc || AI.cfg.ncc; return (AI.cfg.m[ncc] != null ? AI.cfg.m[ncc] : AI_NCC[ncc].model) || ""; }
function aiAnhBat(ncc) { ncc = ncc || AI.cfg.ncc; return AI.cfg.anh[ncc] != null ? !!AI.cfg.anh[ncc] : !!AI_NCC[ncc].anh; }
function aiDiaChi(ncc, duong) {
  const N = AI_NCC[ncc], base = String(AI.cfg.u[ncc] || N.url || "").replace(/\/+$/, "");
  if (AI.cfg.qr[ncc] && N.relay && AI.cfg.relay) {
    const pth = base ? new URL(base).pathname.replace(/\/+$/, "") : "";
    return {url: AI.cfg.relay.replace(/\/+$/, "") + "/p/" + ncc + pth + duong, qua: true};
  }
  if (!base) throw new Error(T("chưa có địa chỉ API"));
  return {url: base + duong, qua: false};
}
async function aiTieuDe(ncc, qua, get) {
  const N = AI_NCC[ncc], kho = await aiMoKho(), k = kho[ncc], h = get ? {} : {"Content-Type": "application/json"};
  if (qua && kho._relay) h["X-Relay-Token"] = kho._relay;
  if (k) { if (N.kieu === "ant") h["x-api-key"] = k; else if (N.kieu === "gem") h["x-goog-api-key"] = k; else h.Authorization = "Bearer " + k; }
  else if (!qua && !N.khongKhoa && ncc !== "tuy") throw new Error(T("chưa có khoá API cho {n}", {n: N.ten}));
  if (N.kieu === "ant") { h["anthropic-version"] = "2023-06-01"; if (!qua) h["anthropic-dangerous-direct-browser-access"] = "true"; }
  if (ncc === "yandex" && AI.cfg.tm) h["OpenAI-Project"] = AI.cfg.tm;
  return h;
}
async function aiFetch(url, init, ms) {
  const ac = typeof AbortController === "function" ? new AbortController() : null, t = ac ? setTimeout(() => ac.abort(), ms || 120000) : 0;
  let r;
  try { r = await fetch(url, Object.assign({credentials: "omit", referrerPolicy: "no-referrer"}, ac ? {signal: ac.signal} : {}, init)); }
  catch (e) { throw new Error(e && e.name === "AbortError" ? T("quá thời gian chờ trả lời") : T("không kết nối được (mạng, trình duyệt chặn CORS, hoặc nhà cung cấp chặn theo vùng): thử relay hoặc nhà cung cấp khác")); }
  finally { if (t) clearTimeout(t); }
  const s = await r.text(); let j = null; try { j = JSON.parse(s); } catch (e) { /* không phải JSON */ }
  if (!r.ok) {
    let m = j && ((j.error && (j.error.message || j.error)) || j.message || j.detail); m = m ? (typeof m === "string" ? m : JSON.stringify(m)) : s.slice(0, 300);
    const er = new Error(`HTTP ${r.status}: ${aiAn(m)}`); er.status = r.status; er.raw = aiAn(m); throw er;
  }
  return j || {};
}
function aiChuTraVe(N, j) {
  if (N.kieu === "ant") return (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  if (N.kieu === "gem") { const c = (j.candidates || [])[0]; return c && c.content ? (c.content.parts || []).map(p => p.text || "").join("") : ""; }
  const c = (j.choices || [])[0], m = c && c.message; if (!m) return "";
  return typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map(x => x.text || "").join("") : "";
}
/* he: chỉ dẫn hệ thống; nd: nội dung; anh: [{mime, data(base64)}]. Tự thử lại khi model không nhận ảnh, không nhận
   temperature hoặc đòi max_completion_tokens (model suy luận). */
async function aiGoi(he, nd, anh, opt) {
  opt = opt || {};
  const ncc = AI.cfg.ncc, N = AI_NCC[ncc], model0 = aiModel(ncc), t0 = Date.now();
  if (!model0) throw new Error(T("chưa chọn model"));
  const model = ncc === "yandex" && AI.cfg.tm && !/^(gpt|emb|ds):\/\//.test(model0) ? `gpt://${AI.cfg.tm}/${model0}` : model0;
  let imgs = anh && aiAnhBat(ncc) ? anh.filter(Boolean) : [], boAnh = !!(anh && anh.length && !imgs.length), nhiet = true, maxKey = "max_tokens";
  const MAX = opt.max || 2000;
  for (let lan = 0; lan < 4; lan++) {
    let duong, body;
    if (N.kieu === "ant") {
      duong = "/messages";
      body = {model, max_tokens: MAX, system: he, messages: [{role: "user", content: imgs.map(a => ({type: "image", source: {type: "base64", media_type: a.mime, data: a.data}})).concat([{type: "text", text: nd}])}]};
      if (nhiet) body.temperature = 0.2;
    } else if (N.kieu === "gem") {
      duong = `/models/${encodeURIComponent(model)}:generateContent`;
      body = {systemInstruction: {parts: [{text: he}]}, contents: [{role: "user", parts: [{text: nd}].concat(imgs.map(a => ({inline_data: {mime_type: a.mime, data: a.data}})))}],
              generationConfig: Object.assign({maxOutputTokens: Math.max(MAX, 8192)}, nhiet ? {temperature: 0.2} : {})};
    } else {
      duong = "/chat/completions";
      body = {model, messages: [{role: "system", content: he}, {role: "user", content: imgs.length ? [{type: "text", text: nd}].concat(imgs.map(a => ({type: "image_url", image_url: {url: `data:${a.mime};base64,${a.data}`}}))) : nd}]};
      body[maxKey] = MAX; if (nhiet) body.temperature = 0.2;
    }
    const {url, qua} = aiDiaChi(ncc, duong);
    try {
      const j = await aiFetch(url, {method: "POST", headers: await aiTieuDe(ncc, qua), body: JSON.stringify(body)}, opt.tg || 150000);
      return {text: aiChuTraVe(N, j), model: model0, ms: Date.now() - t0, boAnh};
    } catch (e) {
      const m = String(e.raw || e.message || "");
      if (e.status === 400 && /max_completion_tokens/.test(m) && maxKey === "max_tokens") { maxKey = "max_completion_tokens"; continue; }
      if (e.status === 400 && /temperature/i.test(m) && nhiet) { nhiet = false; continue; }
      if ((e.status === 400 || e.status === 415 || e.status === 422) && imgs.length && /image|vision|multimodal|image_url|inline_data|content.{0,40}(type|array|list|string)/i.test(m)) { imgs = []; boAnh = true; continue; }
      throw e;
    }
  }
  throw new Error(T("model không nhận yêu cầu"));
}
async function aiLayDS() {
  const ncc = AI.cfg.ncc, N = AI_NCC[ncc];
  const duong = N.kieu === "gem" ? "/models?pageSize=200" : N.kieu === "ant" ? "/models?limit=100" : "/models";
  const {url, qua} = aiDiaChi(ncc, duong), j = await aiFetch(url, {method: "GET", headers: await aiTieuDe(ncc, qua, true)}, 30000);
  const ds = N.kieu === "gem" ? (j.models || []).filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent")).map(m => String(m.name).replace(/^models\//, ""))
    : (j.data || j.models || []).map(m => m.id || m.name).filter(Boolean);
  ds.sort();
  ai$("aiModelDS").innerHTML = ds.map(x => `<option value="${esc(x)}">`).join("");
  return ds;
}

/* ---------- ngữ cảnh của một điểm: số liệu + ảnh ---------- */
const aiR3 = v => v == null || !isFinite(v) ? null : +(+v).toFixed(3);
function aiChu(html) { const d = document.createElement("div"); d.innerHTML = String(html); return (d.textContent || "").replace(/\s+/g, " ").trim(); }
function aiNN() { return {vi: "Vietnamese", ru: "Russian", en: "English"}[LANG] || "Vietnamese"; }
async function aiAnhCanvas(cv, mime, q) {       // canvas -> {mime, data}; null nếu không vẽ được (jsdom)
  try { const u = cv.toDataURL(mime || "image/png", q || 0.85); const i = u.indexOf(","); return i > 0 && u.length > 200 ? {mime: u.slice(5, u.indexOf(";")), data: u.slice(i + 1)} : null; } catch (e) { return null; }
}
async function aiDaiAnh(p, ys) {               // dải ảnh theo năm quanh điểm, ghép một ảnh (tâm có dấu thập)
  if (!MAN || !ys.length) return null;
  const cv0 = document.createElement("canvas"), g0 = cv0.getContext && cv0.getContext("2d"); if (!g0) return null;
  const L0 = MAN.s2d ? s2dL0() : MAN.layers.find(l => l.id === ai$("selStrip").value) || MAN.layers.find(l => l.kieu === "rgb");
  if (!L0) return null;
  const c = CORE.to3857(p.lon, p.lat), half = typeof stripNua === "function" ? stripNua() : 485, bb = [c[0] - half, c[1] - half, c[0] + half, c[1] + half];
  const WS = 160, cot = Math.min(5, ys.length), hang = Math.ceil(ys.length / cot), HD = 16;
  cv0.width = cot * WS + (cot - 1) * 4; cv0.height = hang * (WS + HD) + (hang - 1) * 4;
  g0.fillStyle = "#fff"; g0.fillRect(0, 0, cv0.width, cv0.height);
  for (let k = 0; k < ys.length; k++) {
    const y = ys[k], x0 = (k % cot) * (WS + 4), y0 = Math.floor(k / cot) * (WS + HD + 4), cv = document.createElement("canvas"); cv.width = cv.height = WS;
    g0.fillStyle = "#111"; g0.font = "bold 12px sans-serif"; g0.fillText(String(y) + (p.nhan && p.nhan[y] ? "  [" + p.nhan[y] + "]" : ""), x0 + 2, y0 + 12);
    if (!L0.nam.includes(y)) { g0.fillStyle = "#ddd"; g0.fillRect(x0, y0 + HD, WS, WS); continue; }
    try {
      const url = CORE.dataUrl(CFG, L0.duong_dan.replace("{y}", y));
      if (L0.kieu === "s2d") await s2dVe(url, bb, WS, WS, 18, cv);
      else { const r = await readBox(url, bb, WS, WS); if (r) paint(cv, r.data, r.n, L0); }
      g0.drawImage(cv, x0, y0 + HD);
    } catch (e) { g0.fillStyle = "#fdd"; g0.fillRect(x0, y0 + HD, WS, WS); }
    g0.strokeStyle = "#ff0"; g0.lineWidth = 1.5; const cx = x0 + WS / 2, cy = y0 + HD + WS / 2;
    g0.beginPath(); g0.moveTo(cx - 9, cy); g0.lineTo(cx - 3, cy); g0.moveTo(cx + 3, cy); g0.lineTo(cx + 9, cy); g0.moveTo(cx, cy - 9); g0.lineTo(cx, cy - 3); g0.moveTo(cx, cy + 3); g0.lineTo(cx, cy + 9); g0.stroke();
  }
  const a = await aiAnhCanvas(cv0, "image/jpeg", 0.85); if (!a) return null;
  const kieu = L0.kieu === "s2d" ? (S2V.mode === "rgb" ? (S2_PRE_TEN[S2V.pre] || S2V.pre) : S2V.mode === "idx" ? S2V.chi : S2V.mode) : L0.ten;
  a.mo_ta = `yearly Sentinel-2 dry-season composites around the point (${kieu}); each tile ${Math.round(2 * half)} m wide, point at the yellow cross, [code] = label already assigned`;
  return a;
}
function aiSvgAnh(svg, W, H) {                  // SVG -> PNG
  return new Promise(ok => {
    try {
      const c = document.createElement("canvas"), g = c.getContext && c.getContext("2d"); if (!g || typeof Image === "undefined") { ok(null); return; }
      c.width = W; c.height = H;
      const s = /xmlns=/.test(svg) ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      const im = new Image(), t = setTimeout(() => ok(null), 3000);
      im.onload = () => { clearTimeout(t); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(im, 0, 0, W, H); aiAnhCanvas(c, "image/png").then(ok); };
      im.onerror = () => { clearTimeout(t); ok(null); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/<svg([^>]*)viewBox/, `<svg width="${W}" height="${H}"$1viewBox`));
    } catch (e) { ok(null); }
  });
}
async function aiNguCanh(p, o) {               // -> {J (số liệu), anh: [...]}
  const J = {diem: {id: p.id, lon: +(+p.lon).toFixed(6), lat: +(+p.lat).toFixed(6)}, nam_can_goi_y: o.nam}, anh = [];
  if (!VG.xa && MAN && MAN.ranh_gioi_xa) { try { await vgTaiXaHF(); } catch (e) { /* bỏ */ } }
  const x = VG.xa ? vgXaTai(p.lon, p.lat) : null; if (x) J.diem.xa_phuong = x.ten;
  J.nhan_da_gan = p.nhan || {};
  if (p.goi_y && Object.keys(p.goi_y).length) J.goi_y_tu_ban_do = p.goi_y;
  J.he_lop = SCHEME.lop.map(c => ({ma: c.ma, ten: cten(c), nhom: c.nhom, dau_hieu: cdau(c) || undefined})).concat((SCHEME.dac_biet || []).map(c => ({ma: c.ma, ten: cten(c)})));
  if (o.s2 && MAN && MAN.s2d) {
    const s = await s2dAt(p), bs = s2Bang(), out = {};
    Object.entries(s).forEach(([y, d]) => { const r = {}; bs.forEach((b, i) => { r[b] = d.v[i]; }); CORE.IDX_NAMES.forEach((n, i) => { r[n] = aiR3(d.idx[i]); });
      out[y] = r; });
    if (Object.keys(out).length) J.s2_theo_nam = {don_vi: "10 bands: surface reflectance x 10000 (DN); indices unitless", nam: out};
  }
  let cv = null;
  if (o.mua) {
    cv = await curvesFor(p);
    if (cv && Object.keys(cv.ys).length) {
      const nam = {};
      Object.entries(cv.ys).forEach(([y, d]) => { const r = {}; Object.keys(d).forEach(f => { if (Array.isArray(d[f]) && (f === "NDVI" || f === "MNDWI" || /^B(4|8|11)$/.test(f) || !/^B\d/.test(f))) r[f] = d[f].map(aiR3); });
        if (d.NFILL != null) r.so_ky_phai_dien = d.NFILL; nam[y] = r; });
      J.mua_vu_6_ky = {ky_thang: KY, nguon: cv.src && cv.src.kieu === "pc" ? "reconstructed from yearly PCA" : "precomputed", nam};
    }
  }
  if (o.gt && typeof giaTriTai === "function") { try { J.gia_tri_tai_diem = (await giaTriTai({lat: p.lat, lng: p.lon})).map(r => [aiChu(r[0]), aiChu(r[1])]).filter(r => !/^Δ /.test(r[0])); } catch (e) { /* bỏ */ } }
  if (MAN && MAN.layers.some(l => l.kieu === "lop")) {
    try { const lp = await lopAt(p), o2 = {}; Object.values(lp).forEach(({L0, map: mp}) => { const t = {}; Object.entries(mp).forEach(([y, v]) => { t[y] = T(((L0.ten_lop || TEN3)[v]) || String(v)); }); if (Object.keys(t).length) o2[lname(L0)] = t; });
      if (Object.keys(o2).length) J.ban_do_lop_co_san = o2; } catch (e) { /* bỏ */ }
  }
  if (o.dai && o.anh !== false) { const a = await aiDaiAnh(p, Array.from(new Set((MAN && MAN.s2d ? MAN.s2d.nam : []).concat(o.nam))).sort((a, b) => a - b)); if (a) anh.push(a); }
  if (o.mua && o.anh !== false && cv && Object.keys(cv.ys).length) {
    for (const f of ["NDVI", "MNDWI"]) { if (!Object.values(cv.ys).some(d => d[f])) continue;
      const a = await aiSvgAnh(curveSVG(cv, p, "chuoi", f, 900, 240), 900, 240); if (a) { a.mo_ta = `${f} seasonal curve, 6 two-month periods per year, all years in sequence`; anh.push(a); } }
  }
  return {J, anh};
}
function aiHeDiem() {
  return "You are an expert in Sentinel-2 image interpretation and land cover mapping of Hai Phong, Vietnam (coastal delta: paddy rice, " +
    "aquaculture ponds, salt fields, mangroves, sand, urban and industrial land, reclamation). From the point data (JSON) and the images, " +
    "describe the point and suggest a land cover code for each requested year. Use ONLY codes from \"he_lop\"; use \"U\" when the evidence " +
    "is insufficient and \"M\" when there is no usable image for that year. Rely on the numbers (seasonal NDVI/MNDWI dynamics, band values, " +
    "indices, existing maps) as much as on the pictures, and be conservative: lower the confidence when sources disagree. " +
    "Answer with ONE JSON object only, no other text: {\"mo_ta\": string, \"goi_y\": [{\"nam\": year, \"ma\": code, \"tin_cay\": 0..1, \"ly_do\": string}], " +
    "\"thay_doi\": string, \"can_xem_lai\": boolean}. Write mo_ta, ly_do and thay_doi in " + aiNN() + ", concise.";
}
function aiNoiDung(J, anh, ghi) {
  return "Point data (JSON):\n" + JSON.stringify(J) + (anh.length ? "\nAttached images: " + anh.map((a, i) => `(${i + 1}) ${a.mo_ta || ""}`).join("; ") : "") +
    (ghi ? "\nAnalyst note: " + ghi : "");
}
function aiJSON(s) {
  s = String(s || ""); const m = s.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) s = m[1];
  const a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}
function aiLocGoiY(j, nam) {                  // chuẩn hoá gợi ý: mã có trong hệ lớp, năm được hỏi, tin cậy 0..1
  const hop = SCHEME.lop.map(c => c.ma).concat((SCHEME.dac_biet || []).map(c => c.ma)), hoa = {}; hop.forEach(m => { hoa[m.toUpperCase()] = m; });
  return (j && Array.isArray(j.goi_y) ? j.goi_y : []).map(g => ({nam: +g.nam, ma: hoa[String(g.ma || "").trim().toUpperCase()] || null, tc: Math.max(0, Math.min(1, +g.tin_cay || 0)), ly_do: String(g.ly_do || "")}))
    .filter(g => g.ma && (!nam || nam.includes(g.nam)));
}
function aiGan(p, g, model, xl) {
  CORE.setLabel(p, g.nam, g.ma, Date.now()); p.tin[g.nam] = g.tc >= 0.8 ? 2 : 1;
  p.ai = p.ai || {}; p.ai[g.nam] = {ma: g.ma, tin_cay: +g.tc.toFixed(2), model, luc: new Date().toISOString()};
  if (xl) p.xem_lai = true;
}
function aiNamCan(p, che) {
  const ys = years();
  return che === "nay" ? [ST.nam] : che === "het" ? ys.slice() : ys.filter(y => !(p.nhan && p.nhan[y]));
}
function aiTuyChon() {
  const o = {anh: aiAnhBat()}; document.querySelectorAll("#dlgAI [data-ag]").forEach(c => { o[c.dataset.ag] = c.checked; }); return o;
}

/* ---------- giao diện: kết nối ---------- */
function aiTT(t) { ai$("aiTT").textContent = aiAn(t || ""); }
function aiHienCfg() {
  const c = AI.cfg, N = AI_NCC[c.ncc];
  ai$("aiNCC").innerHTML = Object.entries(AI_NCC).map(([k, v]) => `<option value="${k}">${esc(T(v.ten))}${v.nga ? " ✓" : ""}</option>`).join("");
  ai$("aiNCC").value = c.ncc;
  ai$("aiURL").value = c.u[c.ncc] || N.url; ai$("aiModel").value = aiModel(); ai$("aiAnh").checked = aiAnhBat();
  ai$("aiThuMuc").value = c.tm || ""; ai$("aiThuMucL").hidden = ai$("aiThuMuc").hidden = !N.thuMuc;
  ai$("aiRelay").value = c.relay || ""; ai$("aiQuaRelay").checked = !!c.qr[c.ncc]; ai$("aiQuaRelay").disabled = !N.relay;
  ai$("aiLuu").value = c.luu; ai$("aiMKW").hidden = c.luu !== "mat_khau";
  ai$("aiKhoa").value = ""; ai$("aiRelayMa").value = "";
  const k = AI.kho || {}, r = aiLS(AI_KKHO);
  ai$("aiKhoa").placeholder = k[c.ncc] ? T("đã lưu: {k} (để trống để giữ)", {k: aiChe(k[c.ncc])}) : N.khongKhoa ? T("không cần khoá") : (r && !AI.kho ? T("có khoá đã lưu, chưa mở") : T("dán khoá API"));
  ai$("aiRelayMa").placeholder = k._relay ? T("đã lưu: {k} (để trống để giữ)", {k: aiChe(k._relay)}) : T("mã relay (RELAY_TOKEN)");
  const lg = {thiet_bi: T("Khoá được mã hoá AES-GCM bằng một khoá không xuất ra được, nằm trong trình duyệt này: chỉ trình duyệt này mở được, không phải nhập lại."),
    mat_khau: T("Khoá được mã hoá bằng mật khẩu của bạn (PBKDF2, 310000 vòng): nhập mật khẩu một lần mỗi phiên."),
    phien: T("Khoá chỉ nằm trong thẻ này, mất khi đóng thẻ."), khong: T("Khoá chỉ nằm trong bộ nhớ, mất khi tải lại trang.")}[c.luu] || "";
  ai$("aiLuuTT").textContent = lg + " " + T("Khoá không nằm trong tệp tiến độ xuất ra và chỉ gửi tới nhà cung cấp (hoặc relay) đã chọn.");
}
async function aiLuuTuForm() {
  const c = AI.cfg, ncc = ai$("aiNCC").value; c.ncc = ncc;
  const u = ai$("aiURL").value.trim(); if (u && u !== AI_NCC[ncc].url) c.u[ncc] = u; else delete c.u[ncc];
  c.m[ncc] = ai$("aiModel").value.trim(); c.anh[ncc] = ai$("aiAnh").checked; c.tm = ai$("aiThuMuc").value.trim();
  c.relay = ai$("aiRelay").value.trim().replace(/\/+$/, ""); c.qr[ncc] = ai$("aiQuaRelay").checked; c.luu = ai$("aiLuu").value;
  if (c.relay && !/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(c.relay)) throw new Error(T("địa chỉ relay phải bắt đầu bằng https://"));
  aiLuuCfg();
  const k = ai$("aiKhoa").value.trim(), rm = ai$("aiRelayMa").value.trim();
  if (k || rm || aiLS(AI_KKHO) || c.luu) {
    let kho = {}; try { kho = await aiMoKho(); } catch (e) { if (!k && !rm) throw e; }
    AI.kho = Object.assign({}, kho); if (k) AI.kho[ncc] = k; if (rm) AI.kho._relay = rm;
    await aiGhiKho();
  }
  aiHienCfg();
}
async function aiThu() {
  aiTT(T("đang thử…"));
  try {
    await aiLuuTuForm();
    const r = await aiGoi("Reply with exactly one word.", "Say OK.", null, {max: 200, tg: 60000});
    aiTT(T("kết nối được: {m} trả lời \"{t}\" sau {s} s", {m: r.model, t: r.text.trim().slice(0, 40), s: (r.ms / 1000).toFixed(1)}));
  } catch (e) { aiTT(T("lỗi: ") + aiAn(e.message || e)); }
}
function aiTab(t) { document.querySelectorAll("#dlgAI [data-atab]").forEach(b => b.classList.toggle("on", b.dataset.atab === t)); document.querySelectorAll("#dlgAI [data-apane]").forEach(p => { p.hidden = p.dataset.apane !== t; }); if (t === "diem") aiCapNhatDiem(); if (t === "loat") aiLoatHien(); }
async function aiMo(tab) {
  const d = ai$("dlgAI"); if (!d.open) { if (d.show) d.show(); else d.setAttribute("open", ""); }
  try { await aiMoKho(); } catch (e) { /* mật khẩu: hỏi sau */ }
  aiHienCfg(); aiTab(tab || (aiModel() && (AI.kho && (AI.kho[AI.cfg.ncc] || AI.kho._relay) || AI_NCC[AI.cfg.ncc].khongKhoa) ? "diem" : "kn"));
}

/* ---------- giao diện: hỏi về một điểm ---------- */
function aiCapNhatDiem() {
  if (!ai$("dlgAI").open) return;
  const p = vizPt();
  ai$("aiDiemTT").textContent = p ? T("Điểm {id} ({lat}, {lon}); các năm cần gán: {y}", {id: p.id === "⌖" ? T("tra cứu") : p.id, lat: p.lat.toFixed(5), lon: p.lon.toFixed(5), y: years().join(", ")}) :
    T("chọn một điểm, hoặc nhấp lên bản đồ để tra cứu một chỗ bất kỳ");
  ai$("aiHoi").disabled = !p;
}
async function aiHoiDiem(chiXem) {
  const p = vizPt(); if (!p) return;
  const o = aiTuyChon(), nam = aiNamCan(p, ai$("aiNamPV").value), box = ai$("aiKQ");
  if (!nam.length) { box.innerHTML = `<div class="mu sm">${T("điểm này đã gán đủ các năm: chọn \"mọi năm\" để AI xem lại")}</div>`; return; }
  box.innerHTML = `<div class="mu sm">${T("đang gom số liệu và ảnh…")}</div>`;
  try {
    const {J, anh} = await aiNguCanh(p, Object.assign({nam}, o)), he = aiHeDiem(), nd = aiNoiDung(J, anh, ai$("aiGhi").value.trim());
    if (chiXem) {
      box.innerHTML = `<details open><summary>${T("chỉ dẫn hệ thống")}</summary><pre class="sm" style="white-space:pre-wrap">${esc(he)}</pre></details>` +
        `<details open><summary>${T("nội dung")} (${(nd.length / 1024).toFixed(1)} kB)</summary><pre class="sm" style="white-space:pre-wrap;max-height:30vh;overflow:auto">${esc(nd)}</pre></details>` +
        `<div class="row">${anh.map(a => `<img src="data:${a.mime};base64,${a.data}" style="max-width:100%;border:1px solid #ddd" title="${esc(a.mo_ta || "")}">`).join("")}</div>` +
        `<div class="mu sm">${T("{n} ảnh", {n: anh.length})}${aiAnhBat() ? "" : " · " + T("model này đặt là không nhận ảnh: ảnh sẽ không được gửi")}</div>`;
      return;
    }
    box.innerHTML = `<div class="mu sm">${T("đang hỏi {m}…", {m: aiModel()})}</div>`;
    const r = await aiGoi(he, nd, anh), j = aiJSON(r.text), gy = aiLocGoiY(j, nam);
    AI.diem = {p, gy, j, r, nam};
    aiVeKQ();
  } catch (e) { box.innerHTML = `<div class="ai-kq">${T("lỗi: ")}${esc(aiAn(e.message || e))}</div>`; if (/mật khẩu/.test(e.message || "")) aiTab("kn"); }
}
function aiVeKQ() {
  const D = AI.diem; if (!D) return; const {p, gy, j, r} = D, box = ai$("aiKQ"), ng = +ai$("aiLNg").value || 0.8;
  let h = `<div class="ai-kq"><b>${esc(r.model)}</b> <span class="mu">${(r.ms / 1000).toFixed(1)} s${r.boAnh ? " · " + T("model không nhận ảnh: chỉ gửi số liệu") : ""}</span>`;
  if (!j) { box.innerHTML = h + `<p>${T("AI không trả về JSON, nguyên văn:")}</p><pre class="sm" style="white-space:pre-wrap">${esc(r.text)}</pre></div>`; return; }
  if (j.mo_ta) h += `<p>${esc(j.mo_ta)}</p>`;
  if (j.thay_doi) h += `<p><b>${T("Thay đổi")}:</b> ${esc(j.thay_doi)}</p>`;
  if (j.can_xem_lai) h += `<p class="mu">${T("AI khuyên người xem lại điểm này.")}</p>`;
  if (gy.length) {
    h += `<table><tr><th>${T("năm")}</th><th>${T("gợi ý")}</th><th>${T("tin cậy")}</th><th>${T("lý do")}</th><th></th></tr>` + gy.map((g, i) => {
      const c = IDX.by[g.ma]; return `<tr><td>${g.nam}</td><td><span class="lc" style="display:inline-block;width:10px;height:10px;background:${c ? c.mau : "#999"}"></span> <b>${esc(g.ma)}</b> ${esc(cten(c) || "")}</td>` +
        `<td>${(100 * g.tc).toFixed(0)} %</td><td class="sm">${esc(g.ly_do)}</td><td><button type="button" data-aigan="${i}">${p.nhan && p.nhan[g.nam] === g.ma ? "✓" : T("Gán")}</button></td></tr>`; }).join("") + `</table>`;
    h += `<div class="row"><button type="button" id="aiGanHet">${T("Gán mọi gợi ý tin cậy ≥ {n} %", {n: (100 * ng).toFixed(0)})}</button></div>`;
  } else h += `<p class="mu">${T("không có gợi ý hợp lệ (mã ngoài hệ lớp hoặc năm không được hỏi)")}</p>`;
  box.innerHTML = h + "</div>";
  box.querySelectorAll("[data-aigan]").forEach(b => { b.onclick = () => aiGanDiem([gy[+b.dataset.aigan]]); });
  const gh = ai$("aiGanHet"); if (gh) gh.onclick = () => aiGanDiem(gy.filter(g => g.tc >= ng));
}
function aiGanDiem(ds) {
  const D = AI.diem; if (!D || !ds.length) return;
  let p = D.p;
  if (p === PROBE || !ST.diem[p.id]) { p = themDiemTai(p.lon, p.lat); D.p = p; }     // điểm tra cứu: thành điểm thêm tay
  ds.forEach(g => aiGan(p, g, D.r.model, ai$("aiLXL").checked));
  save(); render(); aiVeKQ(); msg(T("đã gán {n} nhãn do AI gợi ý cho điểm {id}", {n: ds.length, id: p.id}), "ok", 3000);
}

/* ---------- giao diện: gán hàng loạt ---------- */
function aiLoatHien() {
  const c = boCfg(), P = aiLoatDS();
  ai$("aiBoTT").textContent = T("Bộ {b}: {n} điểm sẽ được xét (tối đa {m})", {b: typeof boTen === "function" ? boTen(ST.bo) : ST.bo, n: P.length, m: +ai$("aiLN").value || 0}) + (c ? "" : "");
}
function aiLoatDS() {
  const che = ai$("aiLNam").value, src = ai$("aiLPham").value === "hien" && typeof visible === "function" ? visible() : Object.values(ST.diem).filter(p => p.bo === ST.bo);
  return src.filter(p => aiNamCan(p, che === "nay" ? "nay" : "chua").some(y => !(p.nhan && p.nhan[y])));
}
function aiLoatVe() {
  const L = AI.kqL.slice(-300).reverse();
  ai$("aiLKQ").innerHTML = L.length ? `<table><tr><th>${T("điểm")}</th><th>${T("năm")}</th><th>${T("gợi ý")}</th><th>${T("tin cậy")}</th><th>${T("đã gán")}</th><th>${T("lý do")}</th></tr>` +
    L.map(r => `<tr${r.loi ? ' style="color:#b42318"' : ""}><td><a href="#" data-aidi="${esc(r.id)}">${esc(r.id)}</a></td><td>${r.nam || ""}</td><td>${esc(r.ma || "")}</td><td>${r.tc != null ? (100 * r.tc).toFixed(0) + " %" : ""}</td>` +
      `<td>${r.gan ? "✓" : ""}</td><td class="sm">${esc(r.loi || r.ly_do || "")}</td></tr>`).join("") + "</table>" : "";
  ai$("aiLKQ").querySelectorAll("[data-aidi]").forEach(a => { a.onclick = e => { e.preventDefault(); if (ST.diem[a.dataset.aidi]) select(a.dataset.aidi, true); }; });
}
async function aiLoat() {
  if (AI.chay) return;
  const P = aiLoatDS().slice(0, Math.max(1, +ai$("aiLN").value || 20)), ng = Math.max(0, Math.min(1, +ai$("aiLNg").value || 0.8)), chiGY = ai$("aiLChiGoiY").checked,
        xl = ai$("aiLXL").checked, nghi = Math.max(0, +ai$("aiLNghi").value || 0) * 1000, o = aiTuyChon(), che = ai$("aiLNam").value;
  if (!P.length) { ai$("aiLTT").textContent = T("không còn điểm nào cần gán"); return; }
  if (!confirm(T("Gửi {n} điểm cho {m} (mỗi điểm một lần gọi, có thể mất phí theo nhà cung cấp)?", {n: P.length, m: aiModel()}))) return;
  AI.chay = true; AI.dung = false; ai$("aiLChay").disabled = true; ai$("aiLDung").disabled = false;
  let xong = 0, gan = 0, loi = 0, cho = nghi;
  try {
    for (const p of P) {
      if (AI.dung) break;
      const nam = aiNamCan(p, che === "nay" ? "nay" : "chua").filter(y => !(p.nhan && p.nhan[y]));
      ai$("aiLTT").textContent = T("đang xử lý {i}/{n}: {id} · đã gán {g} nhãn · lỗi {l}", {i: xong + 1, n: P.length, id: p.id, g: gan, l: loi});
      for (let thu = 0; thu < 3; thu++) {
        try {
          const {J, anh} = await aiNguCanh(p, Object.assign({nam}, o)), r = await aiGoi(aiHeDiem(), aiNoiDung(J, anh, ""), anh), j = aiJSON(r.text), gy = aiLocGoiY(j, nam);
          if (!gy.length) AI.kqL.push({id: p.id, loi: j ? T("không có gợi ý hợp lệ") : T("AI không trả về JSON")});
          gy.forEach(g => { const ok = !chiGY && g.tc >= ng && g.ma !== "M" && g.ma !== "U"; if (ok) { aiGan(p, g, r.model, xl); gan++; }
            AI.kqL.push({id: p.id, nam: g.nam, ma: g.ma, tc: g.tc, ly_do: g.ly_do, gan: ok, model: r.model}); });
          if (j && j.mo_ta) { p.ai = p.ai || {}; p.ai.mo_ta = String(j.mo_ta).slice(0, 600); }
          cho = nghi; break;
        } catch (e) {
          if ((e.status === 429 || e.status >= 500) && thu < 2) { cho = Math.max(cho * 2, 5000); ai$("aiLTT").textContent = T("máy chủ bận, chờ {s} s rồi thử lại…", {s: (cho / 1000).toFixed(0)}); await new Promise(r => setTimeout(r, cho)); continue; }
          loi++; AI.kqL.push({id: p.id, loi: aiAn(e.message || e)});
          if (e.status === 401 || e.status === 403 || /mật khẩu|chưa có khoá|chưa chọn model/.test(e.message || "")) AI.dung = true;
          break;
        }
      }
      xong++; save(); aiLoatVe();
      if (nghi && !AI.dung) await new Promise(r => setTimeout(r, cho));
    }
  } finally {
    AI.chay = false; ai$("aiLChay").disabled = false; ai$("aiLDung").disabled = true; render();
    ai$("aiLTT").textContent = T("xong {i}/{n} điểm: gán {g} nhãn, lỗi {l}", {i: xong, n: P.length, g: gan, l: loi}) + (AI.dung && xong < P.length ? " · " + T("đã dừng") : "");
  }
}
function aiLoatCSV() {
  if (!AI.kqL.length) return;
  download(`ai_goi_y_${stamp()}.csv`, CORE.toCSV(AI.kqL.map(r => ({id: r.id, nam: r.nam || "", ma_lop: r.ma || "", tin_cay: r.tc != null ? +r.tc.toFixed(2) : "", da_gan: r.gan ? 1 : 0,
    model: r.model || "", ly_do: r.ly_do || "", loi: r.loi || ""})), ["id", "nam", "ma_lop", "tin_cay", "da_gan", "model", "ly_do", "loi"]), "text/csv");
}

/* ---------- AI nhận định kết quả phát hiện thay đổi ---------- */
async function aiThayDoi() {
  const K = CD.kq, box = ai$("cdAIKQ"); if (!K) { msg(T("chạy phát hiện thay đổi trước"), "wa", 3000); return; }
  const pct = v => +(100 * v / Math.max(K.tong, 1e-9)).toFixed(2);
  const J = {pham_vi: cdTenPV(K.PV), nam_truoc: K.A, nam_sau: K.B, dien_tich_co_du_lieu_ha: +K.tong.toFixed(1), nguong_do_lon: +K.t.toFixed(3), cach_dat_nguong: K.tCach,
    dien_tich_thay_doi_ha: +K.tongDoi.toFixed(1), ty_le_thay_doi_pct: pct(K.tongDoi), dac_trung_so_sanh: K.ten,
    cach_xac_dinh_loai: K.pl === "sobo" ? "rule-based preliminary classes from NDVI/MNDWI (water, vegetation, built-up or bare)" : K.pl === "mau" ? "k-means prototypes of labelled samples" : "existing class maps",
    cac_loai: K.ten_loai.map((t, k) => t && K.dt[k] ? {loai: t, mau_tren_ban_do: K.pl === "sobo" ? CD_MAU[k] : (k === 1 ? CD_MAU[1] : CD_MAU[9]), ha: +K.dt[k].toFixed(2), pct: pct(K.dt[k]),
      dNDVI_tb: +(K.tb[k].dN / K.tb[k].n).toFixed(3), dMNDWI_tb: +(K.tb[k].dW / K.tb[k].n).toFixed(3), dNDBI_tb: +(K.tb[k].dB / K.tb[k].n).toFixed(3)} : null).filter(Boolean),
    ma_tran_tu_den_ha: {lop: K.lop, ha: K.mt.map(r => Array.from(r).map(v => +v.toFixed(1)))}};
  const xa = Object.entries(K.theoXa).sort((a, b) => b[1] - a[1]).slice(0, 10); if (xa.length) J.xa_thay_doi_nhieu_nhat_ha = xa.map(([i, a]) => [(VG.xa.find(x => x.i === +i) || {}).ten || i, +a.toFixed(1)]);
  if (K.danhGia && K.danhGia.n) J.danh_gia_tren_diem_mau = {n: K.danhGia.n, dung_pct: +(100 * K.danhGia.oa).toFixed(1), do_chinh_xac_pct: +(100 * K.danhGia.pr).toFixed(1), do_phu_pct: +(100 * K.danhGia.rc).toFixed(1), F1: +K.danhGia.f1.toFixed(3)};
  const anh = [];
  if (CD.canvas && CD.canvas.width) {
    const s = Math.min(1, 900 / Math.max(CD.canvas.width, CD.canvas.height)), c = document.createElement("canvas"), g = c.getContext && c.getContext("2d");
    if (g) { c.width = Math.round(CD.canvas.width * s); c.height = Math.round(CD.canvas.height * s); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(CD.canvas, 0, 0, c.width, c.height);
      const a = await aiAnhCanvas(c, "image/png"); if (a) { a.mo_ta = `change map (${ai$("cdXem").value}), north up, colours as in "cac_loai"`; anh.push(a); } }
  }
  const he = "You are a remote sensing analyst of land cover change in Hai Phong, Vietnam. Interpret the change-detection result between two yearly Sentinel-2 dry-season composites " +
    "using ONLY the statistics given (never invent numbers): the main change processes and where (urbanisation, industrial parks, reclamation, aquaculture ponds, " +
    "rice fields, mangroves), how plausible each change type is given its mean index differences, likely false alarms (clouds, haze, seasonal or tidal differences, " +
    "composite artefacts, threshold choice), and what to verify on the ground or with the yearly image strip. Write in " + aiNN() + ", plain text, short paragraphs, at most 300 words.";
  box.innerHTML = `<div class="mu sm">${T("đang hỏi {m}…", {m: aiModel()})}</div>`;
  try {
    const r = await aiGoi(he, "Change detection result (JSON):\n" + JSON.stringify(J) + (anh.length ? "\nAttached: " + anh[0].mo_ta : ""), anh, {max: 2500});
    box.innerHTML = `<div class="ai-kq"><b>${esc(r.model)}</b> <span class="mu">${(r.ms / 1000).toFixed(1)} s</span>` +
      r.text.trim().split(/\n{2,}/).map(t => `<p>${esc(t).replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`).join("") +
      `<p class="mu">${T("Nhận định do AI viết từ bảng số liệu trên; cần kiểm tra lại.")}</p></div>`;
  } catch (e) { box.innerHTML = `<div class="ai-kq">${T("lỗi: ")}${esc(aiAn(e.message || e))}</div>`; if (/khoá|model|mật khẩu/.test(e.message || "")) aiMo("kn"); }
}

/* ---------- gắn sự kiện ---------- */
$("bAI").onclick = () => { const d = ai$("dlgAI"); if (d.open) d.close(); else aiMo(); };
ai$("aiDong").onclick = () => ai$("dlgAI").close();
document.querySelectorAll("#dlgAI [data-atab]").forEach(b => { b.onclick = () => aiTab(b.dataset.atab); });
ai$("aiNCC").onchange = () => { AI.cfg.ncc = ai$("aiNCC").value; aiLuuCfg(); aiHienCfg(); ai$("aiModelDS").innerHTML = ""; };
ai$("aiLuu").onchange = () => { ai$("aiMKW").hidden = ai$("aiLuu").value !== "mat_khau"; };
ai$("aiLuuB").onclick = async () => { try { await aiLuuTuForm(); aiTT(T("đã lưu")); } catch (e) { aiTT(T("lỗi: ") + aiAn(e.message || e)); } };
ai$("aiThu").onclick = aiThu;
ai$("aiLayDS").onclick = async () => { aiTT(T("đang lấy danh sách model…")); try { await aiLuuTuForm(); const ds = await aiLayDS(); aiTT(T("{n} model: bấm vào ô Model để chọn", {n: ds.length})); } catch (e) { aiTT(T("lỗi: ") + aiAn(e.message || e)); } };
ai$("aiKhoaXoa").onclick = async () => { try { await aiMoKho(); } catch (e) { /* bỏ */ } if (AI.kho) { delete AI.kho[AI.cfg.ncc]; await aiGhiKho().catch(() => {}); } aiHienCfg(); };
ai$("aiQuen").onclick = aiQuen;
ai$("aiHoi").onclick = () => aiHoiDiem(false);
ai$("aiXemGui").onclick = () => aiHoiDiem(true);
ai$("aiLChay").onclick = aiLoat;
ai$("aiLDung").onclick = () => { AI.dung = true; };
ai$("aiLCSV").onclick = aiLoatCSV;
["aiLNam", "aiLPham", "aiLN"].forEach(id => { ai$(id).addEventListener("change", aiLoatHien); });
cd$("cdAI").onclick = aiThayDoi;
{ const el = ai$("dlgAI"); L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); }
const _render26ai = render;
render = function () { const r = _render26ai.apply(this, arguments); try { aiCapNhatDiem(); } catch (e) { /* bỏ */ } return r; };
if (typeof traBo === "function") { const _tb = traBo; traBo = function () { const r = _tb.apply(this, arguments); aiCapNhatDiem(); return r; }; }
const _renderStrip26 = renderStrip;
renderStrip = function () { const r = _renderStrip26.apply(this, arguments); try { aiCapNhatDiem(); } catch (e) { /* bỏ */ } return r; };
const _setLang26ai = setLang;
setLang = function (l) { _setLang26ai(l); aiTT(""); if (!AI.chay) ai$("aiLTT").textContent = ""; if (ai$("dlgAI").open) { aiHienCfg(); aiCapNhatDiem(); if (AI.diem) aiVeKQ(); aiLoatVe(); } };
