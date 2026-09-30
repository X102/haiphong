// Kiểm thử relay Google Apps Script (ai_relay_gas.gs) bằng các dịch vụ Apps Script giả: mã relay, đường dẫn được phép, gắn khoá,
// Yandex, giới hạn tần suất, khoá không lộ ra phản hồi
const fs = require("fs"), path = require("path"), vm = require("vm");
const {ok, xong} = require("./kiemtra");
const D = path.resolve(__dirname, "..");
const tep = [path.join(D, "ai_relay", "ai_relay_gas.gs"), path.join(D, "tools", "ai_relay", "ai_relay_gas.gs")].find(f => fs.existsSync(f));
const PROP = {RELAY_TOKEN: "ma-gas-thu-1234567890", OPENAI_API_KEY: "sk-server-GAS-SECRET", ANTHROPIC_API_KEY: "sk-ant-GAS-SECRET", YANDEX_FOLDER: "b1gtm", YANDEX_API_KEY: "AQVN-GAS", RATE_PER_MIN: "6"};
const GOI = [], cache = {};
let tra = () => ({code: 200, text: JSON.stringify({choices: [{message: {content: "OK"}}]})});
const ctx = {
  PropertiesService: {getScriptProperties: () => ({getProperty: k => PROP[k] || null})},
  ContentService: {MimeType: {JSON: "json"}, createTextOutput: s => ({s, setMimeType() { return this; }})},
  CacheService: {getScriptCache: () => ({get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }})},
  LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
  UrlFetchApp: {fetch: (u, o) => { GOI.push({u, o}); const r = tra(u, o); return {getResponseCode: () => r.code, getContentText: () => r.text}; }},
};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(tep, "utf8"), ctx);
const goi = q => JSON.parse(ctx.doPost({postData: {contents: JSON.stringify(q)}}).s);
const T0 = "ma-gas-thu-1234567890";

const h = JSON.parse(ctx.doGet().s);
ok(h.ok && h.providers.join() === "openai,anthropic,yandex" && h.token_set && !JSON.stringify(h).includes("SECRET"), "doGet: relay chạy, liệt kê nhà cung cấp có khoá, không lộ khoá");
let r = goi({token: "sai", ncc: "openai", path: "/v1/chat/completions", method: "POST", body: {}});
ok(r.status === 401 && GOI.length === 0, "sai mã relay: 401, không gọi nhà cung cấp");
r = goi({token: T0, ncc: "openai", path: "/v1/files", method: "GET"});
const r2 = goi({token: T0, ncc: "khac", path: "/v1/chat/completions"});
ok(r.status === 404 && r2.status === 404 && GOI.length === 0, "đường dẫn hoặc nhà cung cấp lạ: 404");
r = goi({token: T0, ncc: "openai", path: "/v1/chat/completions", method: "POST", headers: {Authorization: "Bearer sk-client", "X-Evil": "1"}, body: {model: "gpt", messages: []}});
const g1 = GOI[GOI.length - 1];
ok(r.status === 200 && JSON.parse(r.body).choices[0].message.content === "OK" && g1.u === "https://api.openai.com/v1/chat/completions" && g1.o.headers.Authorization === "Bearer sk-server-GAS-SECRET" &&
   !("X-Evil" in g1.o.headers) && g1.o.method === "post" && JSON.parse(g1.o.payload).model === "gpt" && g1.o.muteHttpExceptions, "OpenAI: gắn khoá của relay thay khoá trình duyệt, bỏ tiêu đề lạ, chuyển thân yêu cầu");
goi({token: T0, ncc: "anthropic", path: "/v1/messages", method: "POST", headers: {"anthropic-version": "2023-06-01"}, body: {model: "c"}});
const g2 = GOI[GOI.length - 1];
ok(g2.o.headers["x-api-key"] === "sk-ant-GAS-SECRET" && g2.o.headers["anthropic-version"] === "2023-06-01", "Anthropic: khoá ở x-api-key");
goi({token: T0, ncc: "yandex", path: "/v1/chat/completions", method: "POST", body: {model: "yandexgpt/latest"}});
const g3 = GOI[GOI.length - 1];
ok(JSON.parse(g3.o.payload).model === "gpt://b1gtm/yandexgpt/latest" && g3.o.headers["OpenAI-Project"] === "b1gtm", "Yandex: model gpt://<thư mục>/..., OpenAI-Project");
r = goi({token: T0, ncc: "gemini", path: "/v1beta/models/gemini-2.5-flash:generateContent", method: "POST", headers: {"x-goog-api-key": "AIza-client"}, body: {}});
const g4 = GOI[GOI.length - 1];
ok(g4.u.endsWith(":generateContent") && g4.o.headers["x-goog-api-key"] === "AIza-client", "Gemini: relay không có khoá thì dùng khoá trình duyệt");
r = goi({token: T0, ncc: "deepseek", path: "/v1/chat/completions", method: "POST", body: {}});
ok(r.status === 401 && /DEEPSEEK_API_KEY/.test(r.body), "DeepSeek không có khoá ở đâu: 401, nói rõ thuộc tính cần đặt");
tra = () => ({code: 401, text: JSON.stringify({error: {message: "invalid key"}})});
Object.keys(cache).forEach(k => delete cache[k]);
r = goi({token: T0, ncc: "openai", path: "/v1/models?limit=5&key=lo", method: "GET"});
const g5 = GOI[GOI.length - 1];
ok(r.status === 401 && g5.u === "https://api.openai.com/v1/models?limit=5" && g5.o.method === "get" && !g5.o.payload, "GET danh sách model: giữ tham số hợp lệ; lỗi của nhà cung cấp chuyển nguyên mã");
Object.keys(cache).forEach(k => delete cache[k]);
const ss = []; for (let i = 0; i < 8; i++) ss.push(goi({token: T0, ncc: "openai", path: "/v1/models", method: "GET"}).status);
ok(ss.filter(s => s === 429).length === 2, `giới hạn 6 yêu cầu mỗi phút (${ss.join(",")})`);
ok(!GOI.some(g => JSON.stringify(g.o).includes(T0)), "mã relay không bị chuyển tới nhà cung cấp");
xong();
