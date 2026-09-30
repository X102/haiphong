/**
 * Relay AI riêng trên Google Apps Script cho Geoportal lớp phủ Hải Phòng. Miễn phí, chỉ cần tài khoản Google, không cần thẻ.
 *
 * Cài (một lần, khoảng 5 phút):
 *  1. Mở https://script.new (đăng nhập tài khoản Google của bạn), xoá mã mẫu, dán toàn bộ tệp này, bấm Lưu.
 *  2. Cài đặt dự án (biểu tượng bánh răng) > Thuộc tính tập lệnh > Thêm thuộc tính:
 *       RELAY_TOKEN   mã relay (bấm "Tạo mã" trong trang, 🤖 AI > Kết nối > Relay riêng, rồi chép sang đây)
 *       DEEPSEEK_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY, YANDEX_API_KEY, PROXYAPI_API_KEY
 *                     khoá của nhà cung cấp muốn dùng (không cần đủ cả)
 *       YANDEX_FOLDER thư mục Yandex Cloud (nếu dùng Yandex)
 *       RATE_PER_MIN  số yêu cầu tối đa mỗi phút (mặc định 30)
 *  3. Triển khai > Tuỳ chọn triển khai mới > Loại: Ứng dụng web; Thực thi với tư cách: Tôi; Người có quyền truy cập: Bất kỳ ai.
 *     Triển khai, cho phép quyền (UrlFetch), chép "URL ứng dụng web" (kết thúc bằng /exec).
 *  4. Trong trang: 🤖 AI > Kết nối > Relay riêng: dán URL và mã relay, đánh dấu "Đi qua relay", Lưu, Thử kết nối.
 *
 * Trang gửi một phong bì JSON (text/plain, không cần CORS preflight): {token, ncc, path, method, headers, body}; relay kiểm tra mã,
 * chỉ cho các đường dẫn trò chuyện và danh sách model của 7 nhà cung cấp đã biết, gắn khoá lấy từ Thuộc tính tập lệnh, gọi nhà cung
 * cấp từ máy chủ của Google rồi trả {status, body}. Khoá không bao giờ về trình duyệt. Mở URL /exec bằng trình duyệt để xem relay chạy.
 * Hạn mức của Apps Script (tài khoản Gmail thường, theo developers.google.com/apps-script/guides/services/quotas): 20000 lần
 * UrlFetch mỗi ngày, thân yêu cầu tối đa 50 MB, mỗi lần chạy tối đa 6 phút.
 * Sửa mã xong phải "Quản lý triển khai > Chỉnh sửa > Phiên bản mới" thì URL cũ mới chạy mã mới.
 */
var PHIEN_BAN = "gas-1.0";
var NCC = {
  deepseek:  ["https://api.deepseek.com", "DEEPSEEK_API_KEY", "bearer", /^\/(v1\/)?(chat\/completions|models)$/],
  openai:    ["https://api.openai.com", "OPENAI_API_KEY", "bearer", /^\/v1\/(chat\/completions|models)$/],
  anthropic: ["https://api.anthropic.com", "ANTHROPIC_API_KEY", "x-api-key", /^\/v1\/(messages|models)$/],
  gemini:    ["https://generativelanguage.googleapis.com", "GEMINI_API_KEY", "x-goog-api-key", /^\/v1beta\/models(\/[A-Za-z0-9._-]+:generateContent)?$/],
  xai:       ["https://api.x.ai", "XAI_API_KEY", "bearer", /^\/v1\/(chat\/completions|models)$/],
  yandex:    ["https://llm.api.cloud.yandex.net", "YANDEX_API_KEY", "bearer", /^\/v1\/(chat\/completions|models)$/],
  proxyapi:  ["https://api.proxyapi.ru", "PROXYAPI_API_KEY", "bearer", /^\/v1\/(chat\/completions|models)$/]
};
var QUERY_OK = ["limit", "pageSize", "pageToken", "after_id", "before_id"];
var TIEU_DE_OK = ["anthropic-version", "anthropic-beta", "openai-project"];

function traVe_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function loi_(st, m) { return traVe_({status: st, body: JSON.stringify({error: {message: m, relay: true}})}); }
function giongNhau_(a, b) {                        // so sánh không lộ thời gian
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
function trongHanMuc_(P) {                         // giới hạn số yêu cầu mỗi phút cho cả relay
  var C = CacheService.getScriptCache(), k = "n_" + Math.floor(Date.now() / 60000), gh = +(P.getProperty("RATE_PER_MIN") || 30);
  var L = LockService.getScriptLock(); try { L.waitLock(5000); } catch (e) { return false; }
  try { var n = +(C.get(k) || 0); if (n >= gh) return false; C.put(k, String(n + 1), 120); return true; } finally { L.releaseLock(); }
}

function doGet() {
  var P = PropertiesService.getScriptProperties();
  return traVe_({ok: true, relay: PHIEN_BAN, providers: Object.keys(NCC).filter(function (k) { return !!P.getProperty(NCC[k][1]); }),
                 token_set: !!P.getProperty("RELAY_TOKEN")});
}

function doPost(e) {
  var P = PropertiesService.getScriptProperties(), ma = P.getProperty("RELAY_TOKEN"), q;
  try { q = JSON.parse(e.postData.contents); } catch (x) { return loi_(400, "bad request"); }
  if (!ma) return loi_(500, "RELAY_TOKEN is not set in the script properties");
  if (!q || !giongNhau_(q.token, ma)) return loi_(401, "wrong or missing relay token");
  var N = NCC[q.ncc]; if (!N) return loi_(404, "unknown provider");
  var phan = String(q.path || "").split("?"), duong = phan[0];
  if (!N[3].test(duong)) return loi_(404, "path not allowed for " + q.ncc);
  if (!trongHanMuc_(P)) return loi_(429, "too many requests to the relay, wait a minute");
  var qs = (phan[1] || "").split("&").filter(function (p) { return QUERY_OK.indexOf(p.split("=")[0]) >= 0; }).join("&");
  var vao = q.headers || {}, h = {};
  Object.keys(vao).forEach(function (k) { if (TIEU_DE_OK.indexOf(k.toLowerCase()) >= 0) h[k] = String(vao[k]); });
  var khoa = P.getProperty(N[1]);
  if (khoa) { if (N[2] === "bearer") h.Authorization = "Bearer " + khoa; else h[N[2]] = khoa; }
  else {                                           // relay không có khoá: dùng khoá trình duyệt gửi kèm
    ["Authorization", "authorization", "x-api-key", "x-goog-api-key"].forEach(function (k) { if (vao[k]) h[k] = String(vao[k]); });
    if (!h.Authorization && !h.authorization && !h["x-api-key"] && !h["x-goog-api-key"])
      return loi_(401, "the relay has no key for " + q.ncc + " (set " + N[1] + " in the script properties)");
  }
  if (q.ncc === "anthropic" && !h["anthropic-version"]) h["anthropic-version"] = "2023-06-01";
  var than = q.body;
  if (q.ncc === "yandex") {
    var tm = P.getProperty("YANDEX_FOLDER") || vao["OpenAI-Project"] || "";
    if (tm) { h["OpenAI-Project"] = tm; if (than && typeof than.model === "string" && !/^(gpt|emb|ds):\/\//.test(than.model)) than.model = "gpt://" + tm + "/" + than.model; }
  }
  var cach = String(q.method || "POST").toUpperCase() === "GET" ? "get" : "post";
  var tuy = {method: cach, headers: h, muteHttpExceptions: true, followRedirects: true};
  if (cach === "post") { tuy.contentType = "application/json"; tuy.payload = JSON.stringify(than || {}); }
  var r;
  try { r = UrlFetchApp.fetch(N[0] + duong + (qs ? "?" + qs : ""), tuy); }
  catch (x) { return loi_(502, "upstream unreachable: " + String(x && x.message || x).slice(0, 120)); }
  return traVe_({status: r.getResponseCode(), body: r.getContentText()});
}
