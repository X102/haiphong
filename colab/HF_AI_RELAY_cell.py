# ==== Ô Colab: dựng RELAY AI riêng trên Hugging Face Space (geoportal gọi model AI không cần VPN) ====
# LƯU Ý: Hugging Face nay yêu cầu gói PRO cho Space Docker; không có PRO thì dùng relay Google Apps Script (ai_relay_gas.gs), miễn phí.
# Chạy một lần (chạy lại để thêm, đổi khoá: Space cũ được cập nhật, mã relay giữ nguyên nếu đã lưu trong Colab Secrets).
# Cần token Hugging Face quyền "write": đặt trong Colab Secrets tên HF_TOKEN, hoặc nhập khi được hỏi (không in ra).
# Khoá API của nhà cung cấp: lấy từ Colab Secrets cùng tên (DEEPSEEK_API_KEY, OPENAI_API_KEY...) hoặc nhập ẩn bằng getpass;
# để trống là bỏ qua. Khoá được ghi thẳng vào Secrets của Space, không ghi ra tệp, không in ra.
# Space phải để công khai để trình duyệt gọi được; mã nguồn công khai nhưng không chứa khoá.
# Lưu ý: tự chịu trách nhiệm tuân thủ điều khoản của từng nhà cung cấp về vùng được phục vụ.
import subprocess, sys
subprocess.run([sys.executable, "-m", "pip", "-q", "install", "-U", "huggingface_hub"], check=True)
import getpass, json, secrets, time, urllib.request
from huggingface_hub import HfApi

TEN_SPACE = "ai-relay"                         # tên Space
TRANG = "https://x102.github.io"               # trang geoportal được gọi relay; thêm trang khác cách nhau dấu phẩy
RATE_PER_MIN = "30"                            # số yêu cầu mỗi phút mỗi IP

def bi_mat(ten):
    try:
        from google.colab import userdata
        return userdata.get(ten) or ""
    except Exception:
        return ""

hf = bi_mat("HF_TOKEN") or getpass.getpass("Token Hugging Face (quyền write): ").strip()
api = HfApi(token=hf)
chu = api.whoami()["name"]
repo = f"{chu}/{TEN_SPACE}"
try:
    api.create_repo(repo, repo_type="space", space_sdk="docker", private=False, exist_ok=True)
except Exception as e:                         # từ 2026 Space Docker trên CPU miễn phí cần gói PRO (lỗi 402)
    if "402" in str(e) or "PRO" in str(e):
        print("Hugging Face báo: Space Docker trên CPU miễn phí cần gói PRO (402), không tạo được relay ở đây.")
        print("Cách miễn phí thay thế: relay Google Apps Script (tệp ai_relay_gas.gs, hướng dẫn ở đầu tệp và trong AI_RELAY.md):")
        print("  1. mở https://script.new, dán ai_relay_gas.gs, Lưu;")
        print("  2. Cài đặt dự án > Thuộc tính tập lệnh: RELAY_TOKEN và các khoá API;")
        print("  3. Triển khai > Ứng dụng web, thực thi với tư cách Tôi, quyền truy cập Bất kỳ ai; chép URL /exec vào trang.")
        raise SystemExit(0)
    raise

TEP = {
    'ai_relay.py': r'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Relay AI riêng cho Geoportal lớp phủ Hải Phòng (chỉ thư viện chuẩn của Python).

Trình duyệt gọi  https://<relay>/p/<nhà cung cấp>/<đường dẫn API>  kèm tiêu đề X-Relay-Token;
relay kiểm tra nguồn gọi (Origin), mã relay, giới hạn tần suất, rồi chuyển tiếp tới nhà cung cấp,
gắn khoá API lấy từ biến môi trường (Secrets của Hugging Face Space). Khoá không bao giờ về trình duyệt,
không được ghi vào nhật ký.

Biến môi trường
  RELAY_TOKEN       bắt buộc; trình duyệt gửi ở tiêu đề X-Relay-Token
  ALLOWED_ORIGINS   các trang được gọi, cách nhau dấu phẩy (mặc định https://x102.github.io)
  DEEPSEEK_API_KEY  OPENAI_API_KEY  ANTHROPIC_API_KEY  GEMINI_API_KEY  XAI_API_KEY  YANDEX_API_KEY  PROXYAPI_API_KEY
  YANDEX_FOLDER     thư mục Yandex Cloud (model "yandexgpt/latest" được đổi thành "gpt://<thư mục>/yandexgpt/latest")
  RATE_PER_MIN      số yêu cầu mỗi phút cho mỗi địa chỉ IP (mặc định 30)
  MAX_BODY_MB       cỡ thân yêu cầu lớn nhất (mặc định 20)
  PORT              cổng (mặc định 7860, như Hugging Face Space)
Không có khoá của một nhà cung cấp trên relay thì relay dùng khoá trình duyệt gửi kèm (nếu có).
"""
import hmac, json, os, re, sys, threading, time, urllib.error, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PHIEN_BAN = "1.0"
NCC = {   # tên: (gốc API, biến khoá, kiểu gắn khoá, các đường dẫn được phép)
    "deepseek":  ("https://api.deepseek.com", "DEEPSEEK_API_KEY", "bearer", r"/(v1/)?(chat/completions|models)"),
    "openai":    ("https://api.openai.com", "OPENAI_API_KEY", "bearer", r"/v1/(chat/completions|models)"),
    "anthropic": ("https://api.anthropic.com", "ANTHROPIC_API_KEY", "x-api-key", r"/v1/(messages|models)"),
    "gemini":    ("https://generativelanguage.googleapis.com", "GEMINI_API_KEY", "x-goog-api-key", r"/v1beta/models(/[A-Za-z0-9._-]+:generateContent)?"),
    "xai":       ("https://api.x.ai", "XAI_API_KEY", "bearer", r"/v1/(chat/completions|models)"),
    "yandex":    ("https://llm.api.cloud.yandex.net", "YANDEX_API_KEY", "bearer", r"/v1/(chat/completions|models)"),
    "proxyapi":  ("https://api.proxyapi.ru", "PROXYAPI_API_KEY", "bearer", r"/v1/(chat/completions|models)"),
}
if os.environ.get("RELAY_UPSTREAM_JSON"):          # chỉ để kiểm thử: đổi gốc API sang máy chủ giả
    for k, v in json.loads(os.environ["RELAY_UPSTREAM_JSON"]).items():
        NCC[k] = (v,) + NCC[k][1:]
CHO_PHEP_TIEU_DE = {"content-type", "authorization", "x-api-key", "x-goog-api-key", "anthropic-version", "anthropic-beta",
                    "anthropic-dangerous-direct-browser-access", "openai-project", "x-relay-token"}
QUERY_OK = {"limit", "pageSize", "pageToken", "after_id", "before_id"}


def cfg():
    return {"token": os.environ.get("RELAY_TOKEN", ""),
            "origins": [o.strip().rstrip("/") for o in os.environ.get("ALLOWED_ORIGINS", "https://x102.github.io").split(",") if o.strip()],
            "rate": int(os.environ.get("RATE_PER_MIN", "30")), "max_body": int(float(os.environ.get("MAX_BODY_MB", "20")) * 1024 * 1024)}


class Han:                                          # giới hạn tần suất: cửa sổ trượt 60 s cho mỗi IP
    def __init__(self):
        self.d, self.k = {}, threading.Lock()

    def cho(self, ip, n):
        now = time.time()
        with self.k:
            q = [t for t in self.d.get(ip, []) if now - t < 60]
            if len(q) >= n:
                self.d[ip] = q
                return False
            q.append(now); self.d[ip] = q
            if len(self.d) > 5000:
                self.d = {a: b for a, b in self.d.items() if b and now - b[-1] < 60}
            return True


HAN = Han()


class Relay(BaseHTTPRequestHandler):
    server_version = "ai-relay/" + PHIEN_BAN
    sys_version = ""

    def log_message(self, fmt, *args):              # chỉ phương thức, đường dẫn (không query), mã trả về; không tiêu đề, không thân
        try:
            sys.stderr.write("%s %s %s %s\n" % (time.strftime("%H:%M:%S"), self.command, self.path.split("?")[0][:120], args[1] if len(args) > 1 else ""))
        except Exception:
            pass

    # ---------- tiện ích
    def _origin_ok(self):
        o = (self.headers.get("Origin") or "").rstrip("/")
        return (not o) or o in cfg()["origins"], o

    def _cors(self, o):
        if o and o in cfg()["origins"]:
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Expose-Headers", "Content-Type")

    def _tra(self, st, obj, o="", ctype="application/json; charset=utf-8", raw=None):
        b = raw if raw is not None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(st)
        self._cors(o)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(b)

    def _loi(self, st, m, o=""):
        self._tra(st, {"error": {"message": m, "relay": True}}, o)

    def _ip(self):
        x = self.headers.get("X-Forwarded-For")
        return x.split(",")[0].strip() if x else self.client_address[0]

    # ---------- CORS
    def do_OPTIONS(self):
        ok, o = self._origin_ok()
        if not ok or not o:
            self._loi(403, "origin not allowed", "")
            return
        xin = [h.strip() for h in (self.headers.get("Access-Control-Request-Headers") or "").split(",") if h.strip()]
        self.send_response(204)
        self._cors(o)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", ", ".join(h for h in xin if h.lower() in CHO_PHEP_TIEU_DE) or "content-type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self._xu_ly()

    def do_POST(self):
        self._xu_ly()

    # ---------- chuyển tiếp
    def _xu_ly(self):
        ok, o = self._origin_ok()
        if not ok:
            self._loi(403, "origin not allowed")
            return
        duong = self.path.split("?")[0]
        if duong in ("/", "/health") and self.command == "GET":
            self._tra(200, {"ok": True, "relay": PHIEN_BAN, "providers": sorted(k for k, v in NCC.items() if os.environ.get(v[1])),
                            "token_set": bool(cfg()["token"])}, o)
            return
        m = re.match(r"^/p/([a-z]+)(/.*)$", duong)
        if not m or m.group(1) not in NCC:
            self._loi(404, "unknown path", o)
            return
        ncc, sau = m.group(1), m.group(2)
        goc, bien, kieu, mau = NCC[ncc]
        if not re.fullmatch(mau, sau):
            self._loi(404, "path not allowed for " + ncc, o)
            return
        C = cfg()
        if not C["token"]:
            self._loi(500, "RELAY_TOKEN is not set on the relay", o)
            return
        if not hmac.compare_digest((self.headers.get("X-Relay-Token") or "").encode(), C["token"].encode()):
            self._loi(401, "wrong or missing relay token", o)
            return
        if not HAN.cho(self._ip(), C["rate"]):
            self._loi(429, "too many requests to the relay, wait a minute", o)
            return
        n = int(self.headers.get("Content-Length") or 0)
        if n > C["max_body"]:
            self._loi(413, "request too large", o)
            return
        body = self.rfile.read(n) if n else None
        h = {"Content-Type": self.headers.get("Content-Type") or "application/json", "User-Agent": "ai-relay/" + PHIEN_BAN}
        khoa = os.environ.get(bien, "")
        if khoa:
            h[{"bearer": "Authorization", "x-api-key": "x-api-key", "x-goog-api-key": "x-goog-api-key"}[kieu]] = ("Bearer " + khoa) if kieu == "bearer" else khoa
        else:                                        # relay không có khoá: dùng khoá trình duyệt gửi kèm
            for t in ("Authorization", "x-api-key", "x-goog-api-key"):
                if self.headers.get(t):
                    h[t] = self.headers.get(t)
            if not any(t in h for t in ("Authorization", "x-api-key", "x-goog-api-key")):
                self._loi(401, "the relay has no key for " + ncc + " (set " + bien + " in the Space secrets)", o)
                return
        if ncc == "anthropic":
            h["anthropic-version"] = self.headers.get("anthropic-version") or "2023-06-01"
            if self.headers.get("anthropic-beta"):
                h["anthropic-beta"] = self.headers.get("anthropic-beta")
        if ncc == "yandex":
            thu_muc = os.environ.get("YANDEX_FOLDER") or self.headers.get("OpenAI-Project") or ""
            if thu_muc:
                h["OpenAI-Project"] = thu_muc
                if body and self.command == "POST":
                    try:
                        j = json.loads(body)
                        if isinstance(j.get("model"), str) and not re.match(r"^(gpt|emb|ds)://", j["model"]):
                            j["model"] = "gpt://%s/%s" % (thu_muc, j["model"]); body = json.dumps(j).encode("utf-8")
                    except ValueError:
                        pass
        q = ""
        if "?" in self.path:
            cap = [p for p in self.path.split("?", 1)[1].split("&") if p.split("=")[0] in QUERY_OK]
            q = ("?" + "&".join(cap)) if cap else ""
        if body is not None:
            h["Content-Length"] = str(len(body))
        rq = urllib.request.Request(goc + sau + q, data=body, headers=h, method=self.command)
        try:
            with urllib.request.urlopen(rq, timeout=180) as r:
                self._tra(r.status, None, o, r.headers.get("Content-Type") or "application/json", r.read())
        except urllib.error.HTTPError as e:
            self._tra(e.code, None, o, e.headers.get("Content-Type") or "application/json", e.read())
        except Exception as e:                       # mạng, DNS, hết giờ: không lộ tiêu đề, không lộ khoá
            self._loi(502, "upstream unreachable: " + type(e).__name__, o)


def main():
    cong = int(os.environ.get("PORT", "7860"))
    if not cfg()["token"]:
        sys.stderr.write("CANH BAO: RELAY_TOKEN chua dat, moi yeu cau se bi tu choi\n")
    sys.stderr.write("ai-relay %s cong %d, nguon duoc phep: %s, nha cung cap co khoa: %s\n" % (
        PHIEN_BAN, cong, ",".join(cfg()["origins"]), ",".join(k for k, v in NCC.items() if os.environ.get(v[1])) or "(chua co)"))
    ThreadingHTTPServer(("0.0.0.0", cong), Relay).serve_forever()


if __name__ == "__main__":
    main()
''',
    'Dockerfile': r'''FROM python:3.12-slim
WORKDIR /app
COPY ai_relay.py /app/ai_relay.py
ENV PORT=7860 PYTHONUNBUFFERED=1
EXPOSE 7860
USER 1000
CMD ["python", "ai_relay.py"]
''',
    'README.md': r'''---
title: AI relay (Hai Phong geoportal)
emoji: 🔁
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Relay AI riêng cho Geoportal lớp phủ Hải Phòng

Máy chủ nhỏ (chỉ thư viện chuẩn Python) nhận yêu cầu từ trang geoportal và chuyển tiếp tới nhà cung cấp AI
(DeepSeek, OpenAI, Anthropic, Google Gemini, xAI, Yandex AI Studio, ProxyAPI), gắn khoá API lưu trong **Secrets** của Space.

- Chỉ nhận yêu cầu có tiêu đề `X-Relay-Token` đúng bằng secret `RELAY_TOKEN`, và đến từ các trang trong `ALLOWED_ORIGINS`.
- Chỉ chuyển tiếp các đường dẫn cần cho trò chuyện và danh sách model; giới hạn tần suất theo IP (`RATE_PER_MIN`, mặc định 30).
- Khoá API không bao giờ trả về trình duyệt và không ghi vào nhật ký.
- `GET /health` cho biết relay chạy và nhà cung cấp nào đã có khoá (không lộ khoá).

Người dùng tự chịu trách nhiệm tuân thủ điều khoản sử dụng và danh sách vùng được phục vụ của từng nhà cung cấp.
Space miễn phí ngủ sau một thời gian không dùng; yêu cầu đầu tiên sau đó đánh thức nó (chờ khoảng nửa phút).
''',
}

for ten, noi_dung in TEP.items():
    api.upload_file(path_or_fileobj=noi_dung.encode("utf-8"), path_in_repo=ten, repo_id=repo, repo_type="space",
                    commit_message=f"relay AI: {ten}")

KHOA = [("DEEPSEEK_API_KEY", "DeepSeek"), ("YANDEX_API_KEY", "Yandex AI Studio"), ("PROXYAPI_API_KEY", "ProxyAPI"),
        ("OPENAI_API_KEY", "OpenAI"), ("ANTHROPIC_API_KEY", "Anthropic"), ("GEMINI_API_KEY", "Google Gemini"), ("XAI_API_KEY", "xAI Grok")]
co = []
for bien, ten in KHOA:
    v = bi_mat(bien) or getpass.getpass(f"Khoá {ten} (Enter để bỏ qua): ").strip()
    if v:
        api.add_space_secret(repo, bien, v); co.append(ten)
thu_muc = bi_mat("YANDEX_FOLDER") or (input("Yandex Cloud folder ID (Enter để bỏ qua): ").strip() if "Yandex AI Studio" in co else "")
if thu_muc:
    api.add_space_variable(repo, "YANDEX_FOLDER", thu_muc)
ma = bi_mat("RELAY_TOKEN")
moi = not ma
if moi:
    ma = secrets.token_urlsafe(24)
api.add_space_secret(repo, "RELAY_TOKEN", ma)
api.add_space_variable(repo, "ALLOWED_ORIGINS", TRANG)
api.add_space_variable(repo, "RATE_PER_MIN", RATE_PER_MIN)
api.restart_space(repo)

url = "https://" + repo.replace("/", "-").replace("_", "-").replace(".", "-").lower() + ".hf.space"
print("Space:", f"https://huggingface.co/spaces/{repo}", "| địa chỉ relay:", url)
print("Nhà cung cấp đã có khoá trên relay:", ", ".join(co) or "(chưa có: trình duyệt sẽ phải gửi khoá của mình qua relay)")
print("Đang chờ Space dựng xong (thường 1 đến 3 phút)…")
t0 = time.time()
while time.time() - t0 < 600:
    try:
        with urllib.request.urlopen(url + "/health", timeout=20) as r:
            j = json.loads(r.read())
            if j.get("ok"):
                print("Relay chạy:", j); break
    except Exception:
        pass
    time.sleep(10)
else:
    print("Chưa thấy relay trả lời sau 10 phút: xem thẻ Logs của Space.")
print()
print("Trong geoportal: 🤖 AI > Kết nối > Relay riêng: dán địa chỉ relay ở trên và mã relay bên dưới, đánh dấu 'Đi qua relay', bấm Lưu.")
if moi:
    print("Mã relay (chỉ in lần này; nên lưu vào Colab Secrets tên RELAY_TOKEN để lần chạy sau giữ nguyên, không chia sẻ ô này):")
    print(ma)
else:
    print("Mã relay: giữ nguyên như trong Colab Secrets RELAY_TOKEN.")
