# Kiểm thử relay AI (ai_relay.py) với máy chủ nhà cung cấp giả, và ô Colab dựng Space (HfApi giả)
import contextlib, io, json, os, pathlib, subprocess, sys, threading, time, types, urllib.error, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

D = pathlib.Path(__file__).resolve().parent.parent
RELAY = next(p for p in [D / "ai_relay" / "ai_relay.py", D / "tools" / "ai_relay" / "ai_relay.py"] if p.exists())
O_COLAB = next(p for p in [D / "HF_AI_RELAY_cell.py", D / "colab" / "HF_AI_RELAY_cell.py"] if p.exists())
loi = []
def ok(dk, t):
    print(("  ok  " if dk else "  LỖI ") + t)
    if not dk: loi.append(t)

NHAN = []
class Gia(BaseHTTPRequestHandler):                # nhà cung cấp giả: ghi lại yêu cầu, trả lời mẫu
    def log_message(self, *a): pass
    def _x(self):
        n = int(self.headers.get("Content-Length") or 0); b = self.rfile.read(n) if n else b""
        NHAN.append({"path": self.path, "m": self.command, "h": {k.lower(): v for k, v in self.headers.items()}, "b": b})
        if "sai" in self.path:
            self.send_response(400); bb = b'{"error":{"message":"bad"}}'
        else:
            self.send_response(200); bb = json.dumps({"choices": [{"message": {"content": "OK"}}], "path": self.path}).encode()
        self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(bb))); self.end_headers(); self.wfile.write(bb)
    do_GET = do_POST = _x
sv = ThreadingHTTPServer(("127.0.0.1", 8791), Gia); threading.Thread(target=sv.serve_forever, daemon=True).start()
goc = "http://127.0.0.1:8791"
env = dict(os.environ, PORT="8790", RELAY_TOKEN="ma-relay-thu-123", ALLOWED_ORIGINS="https://x102.github.io, http://localhost:8765",
           OPENAI_API_KEY="sk-server-openai-SECRET", ANTHROPIC_API_KEY="sk-ant-server-SECRET", YANDEX_API_KEY="AQVN-server-SECRET", YANDEX_FOLDER="b1gthumuc",
           RATE_PER_MIN="12", RELAY_UPSTREAM_JSON=json.dumps({k: goc for k in ["openai", "anthropic", "gemini", "deepseek", "yandex", "xai", "proxyapi"]}))
for k in ["DEEPSEEK_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY", "PROXYAPI_API_KEY"]: env.pop(k, None)
log = open("/tmp/relay_thu.log", "w")
pr = subprocess.Popen([sys.executable, str(RELAY)], env=env, stderr=log, stdout=log)
R = "http://127.0.0.1:8790"
for _ in range(50):
    try: urllib.request.urlopen(R + "/health", timeout=1); break
    except Exception: time.sleep(0.1)

def goi(path, m="POST", h=None, body=None):
    rq = urllib.request.Request(R + path, data=json.dumps(body).encode() if body is not None else None, method=m, headers=h or {})
    try:
        with urllib.request.urlopen(rq, timeout=10) as r: return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e: return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()

TR = {"Origin": "https://x102.github.io", "Content-Type": "application/json"}
try:
    st, h, b = goi("/health", "GET", {"Origin": "https://x102.github.io"})
    j = json.loads(b)
    ok(st == 200 and j["ok"] and j["providers"] == ["anthropic", "openai", "yandex"] and j["token_set"] and "SECRET" not in b.decode() and h.get("access-control-allow-origin") == "https://x102.github.io",
       "/health: chạy, liệt kê nhà cung cấp có khoá (không lộ khoá), CORS cho trang được phép")
    st, h, b = goi("/p/openai/v1/chat/completions", "OPTIONS", {"Origin": "https://x102.github.io", "Access-Control-Request-Method": "POST",
                   "Access-Control-Request-Headers": "content-type,x-relay-token,authorization,x-evil"})
    ok(st == 204 and h.get("access-control-allow-origin") == "https://x102.github.io" and "x-relay-token" in h.get("access-control-allow-headers", "") and "x-evil" not in h.get("access-control-allow-headers", ""),
       "tiền kiểm CORS: cho trang được phép, chỉ các tiêu đề cần thiết")
    st, h, b = goi("/p/openai/v1/chat/completions", "OPTIONS", {"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    ok(st == 403 and "access-control-allow-origin" not in h, "trang lạ: từ chối tiền kiểm CORS")
    st, h, b = goi("/p/openai/v1/chat/completions", "POST", dict(TR, Origin="https://evil.example", **{"X-Relay-Token": "ma-relay-thu-123"}), {"model": "m"})
    ok(st == 403, "trang lạ có mã relay đúng vẫn bị từ chối")
    n0 = len(NHAN)
    st, h, b = goi("/p/openai/v1/chat/completions", "POST", TR, {"model": "m"})
    st2, _, _ = goi("/p/openai/v1/chat/completions", "POST", dict(TR, **{"X-Relay-Token": "sai"}), {"model": "m"})
    ok(st == 401 and st2 == 401 and len(NHAN) == n0, "thiếu mã relay hoặc sai mã: 401, không chuyển tiếp")
    st, h, b = goi("/p/openai/v1/chat/completions", "POST", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123", "Authorization": "Bearer sk-client-XYZ"}), {"model": "gpt", "messages": []})
    r = NHAN[-1]
    ok(st == 200 and json.loads(b)["choices"][0]["message"]["content"] == "OK" and r["path"] == "/v1/chat/completions" and r["h"]["authorization"] == "Bearer sk-server-openai-SECRET" and
       "x-relay-token" not in r["h"] and "origin" not in r["h"] and h.get("access-control-allow-origin") == "https://x102.github.io",
       "OpenAI: chuyển tiếp đúng đường dẫn, gắn khoá của relay (thay khoá trình duyệt), không chuyển mã relay, trả CORS")
    st, h, b = goi("/p/anthropic/v1/messages", "POST", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123", "anthropic-version": "2023-06-01"}), {"model": "c"})
    r = NHAN[-1]
    ok(st == 200 and r["h"]["x-api-key"] == "sk-ant-server-SECRET" and r["h"]["anthropic-version"] == "2023-06-01" and "authorization" not in r["h"], "Anthropic: khoá ở x-api-key, giữ anthropic-version")
    st, h, b = goi("/p/yandex/v1/chat/completions", "POST", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123"}), {"model": "yandexgpt/latest", "messages": []})
    r = NHAN[-1]
    ok(st == 200 and json.loads(r["b"])["model"] == "gpt://b1gthumuc/yandexgpt/latest" and r["h"]["openai-project"] == "b1gthumuc", "Yandex: model đổi thành gpt://<thư mục>/..., gửi OpenAI-Project")
    st, h, b = goi("/p/gemini/v1beta/models/gemini-2.5-flash:generateContent", "POST", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123", "x-goog-api-key": "AIza-client"}), {"contents": []})
    r = NHAN[-1]
    ok(st == 200 and r["path"] == "/v1beta/models/gemini-2.5-flash:generateContent" and r["h"]["x-goog-api-key"] == "AIza-client", "Gemini: relay không có khoá thì dùng khoá trình duyệt gửi kèm")
    st, h, b = goi("/p/deepseek/v1/chat/completions", "POST", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123"}), {"model": "d"})
    ok(st == 401 and b"DEEPSEEK_API_KEY" in b, "DeepSeek: relay không có khoá, trình duyệt cũng không gửi: 401, nói rõ secret cần đặt")
    n0 = len(NHAN)
    st, h, b = goi("/p/openai/v1/files", "GET", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123"}))
    st2, _, _ = goi("/p/openai/../../etc/passwd", "GET", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123"}))
    st3, _, _ = goi("/p/khac/v1/chat/completions", "POST", dict(TR, **{"X-Relay-Token": "ma-relay-thu-123"}), {})
    ok(st == 404 and st2 == 404 and st3 == 404 and len(NHAN) == n0, "chỉ chuyển tiếp đường dẫn trò chuyện và danh sách model của nhà cung cấp đã biết")
    st, h, b = goi("/p/openai/v1/models?limit=5&key=lo", "GET", {"Origin": "https://x102.github.io", "X-Relay-Token": "ma-relay-thu-123"})
    ok(st == 200 and NHAN[-1]["path"] == "/v1/models?limit=5", "danh sách model: giữ tham số hợp lệ, bỏ tham số lạ")
    # giới hạn tần suất: 12 yêu cầu mỗi phút
    ss = [goi("/p/openai/v1/models", "GET", {"Origin": "https://x102.github.io", "X-Relay-Token": "ma-relay-thu-123"})[0] for _ in range(12)]
    ok(429 in ss, f"giới hạn tần suất: vượt 12 yêu cầu mỗi phút thì 429 ({ss.count(429)} lần)")
    log.flush(); nk = open("/tmp/relay_thu.log").read()
    ok("SECRET" not in nk and "ma-relay-thu-123" not in nk and "sk-client" not in nk and "/v1/chat/completions" in nk, "nhật ký relay không chứa khoá hay mã relay")
finally:
    pr.terminate(); sv.shutdown()

# ---------- ô Colab dựng Space (HfApi, getpass, urlopen giả)
GOI = []
class HfGia:
    def __init__(self, token): GOI.append(("token", token))
    def whoami(self): return {"name": "lopmaybay"}
    def create_repo(self, repo, **k): GOI.append(("create", repo, k))
    def upload_file(self, **k): GOI.append(("upload", k["path_in_repo"], k["path_or_fileobj"]))
    def add_space_secret(self, repo, k, v): GOI.append(("secret", k, v))
    def add_space_variable(self, repo, k, v): GOI.append(("var", k, v))
    def restart_space(self, repo): GOI.append(("restart", repo))
hh = types.ModuleType("huggingface_hub"); hh.HfApi = HfGia; sys.modules["huggingface_hub"] = hh
nhap = {"Token Hugging Face (quyền write): ": "hf_TOKEN_GIA", "Khoá DeepSeek (Enter để bỏ qua): ": "sk-deepseek-GIA"}
import getpass as _gp, builtins as _bi
_gp.getpass = lambda p="": nhap.get(p, "")
_bi.input = lambda p="": ""
subprocess.run = lambda *a, **k: types.SimpleNamespace(returncode=0)
class RGia(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *a): pass
urllib.request.urlopen = lambda u, timeout=0: RGia(json.dumps({"ok": True, "providers": ["deepseek"]}).encode())
out = io.StringIO()
with contextlib.redirect_stdout(out):
    exec(compile(O_COLAB.read_text(encoding="utf-8"), "HF_AI_RELAY_cell.py", "exec"), {"__name__": "__main__"})
s = out.getvalue()
up = {g[1]: g[2] for g in GOI if g[0] == "upload"}
sec = {g[1]: g[2] for g in GOI if g[0] == "secret"}
var = {g[1]: g[2] for g in GOI if g[0] == "var"}
ok(("create", "lopmaybay/ai-relay", {"repo_type": "space", "space_sdk": "docker", "private": False, "exist_ok": True}) in GOI, "ô Colab: tạo Space Docker công khai lopmaybay/ai-relay")
ok(up.get("ai_relay.py", b"").decode() == RELAY.read_text(encoding="utf-8") and b"app_port: 7860" in up.get("README.md", b"") and b"CMD" in up.get("Dockerfile", b""), "tải đúng mã relay, README (app_port 7860), Dockerfile")
ok(set(sec) == {"DEEPSEEK_API_KEY", "RELAY_TOKEN"} and sec["DEEPSEEK_API_KEY"] == "sk-deepseek-GIA" and len(sec["RELAY_TOKEN"]) >= 30, "chỉ đặt secret cho khoá đã nhập, cộng mã relay ngẫu nhiên")
ok(var.get("ALLOWED_ORIGINS") == "https://x102.github.io" and ("restart", "lopmaybay/ai-relay") in GOI, "đặt ALLOWED_ORIGINS, khởi động lại Space")
ok("https://lopmaybay-ai-relay.hf.space" in s and sec["RELAY_TOKEN"] in s and "sk-deepseek-GIA" not in s and "hf_TOKEN_GIA" not in s, "in địa chỉ relay và mã relay (một lần); không in khoá API hay token HF")
print("TẤT CẢ ĐẠT" if not loi else f"{len(loi)} LỖI")
sys.exit(1 if loi else 0)
