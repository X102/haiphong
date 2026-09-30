# Sinh ô Colab HF_AI_RELAY_cell.py: nhúng nguyên ai_relay/{ai_relay.py, Dockerfile, README.md} để ô chạy độc lập.
# Chạy lại sau khi sửa ai_relay/ai_relay.py: python tao_o_relay.py
import pathlib
D = pathlib.Path(__file__).parent
tep = {t: (D / "ai_relay" / t).read_text(encoding="utf-8") for t in ("ai_relay.py", "Dockerfile", "README.md")}
for t, v in tep.items(): assert "'''" not in v, t
nhung = "TEP = {\n" + "".join(f"    {t!r}: r'''{v}''',\n" for t, v in tep.items()) + "}\n"
o = r'''# ==== Ô Colab: dựng RELAY AI riêng trên Hugging Face Space (geoportal gọi model AI không cần VPN) ====
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

''' + nhung + r'''
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
'''
RA = D.parent / "colab" if D.name == "tools" and (D.parent / "colab").is_dir() else D   # kho GitHub: tools/ -> colab/
(RA / "HF_AI_RELAY_cell.py").write_text(o, encoding="utf-8")
print("ok", len(o))
