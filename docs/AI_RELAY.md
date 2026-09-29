# Trợ lý AI của geoportal: kết nối không cần VPN

Trợ lý AI (nút 🤖 AI) gửi số liệu và ảnh của một điểm cho model AI để nhận mô tả và gợi ý nhãn, gán hàng loạt theo ngưỡng
tin cậy, và nhờ AI nhận định kết quả phát hiện thay đổi. Trang gọi thẳng nhà cung cấp từ trình duyệt, hoặc qua một relay riêng.

## 1. Chọn đường kết nối

| đường | cần VPN ở Nga? | ghi chú |
|---|---|---|
| DeepSeek | không | khoá tại platform.deepseek.com; model mặc định `deepseek-chat` chỉ đọc chữ (bỏ chọn "model nhận ảnh"), chọn model nhận ảnh nếu tài khoản có |
| Yandex AI Studio | không | địa chỉ OpenAI-tương thích `https://llm.api.cloud.yandex.net/v1`; điền folder ID, model dạng `yandexgpt/latest` (trang tự đổi thành `gpt://<folder>/...`) |
| ProxyAPI | không | trả bằng rúp, một khoá cho GPT, Claude, Gemini, Grok, DeepSeek; địa chỉ `https://api.proxyapi.ru/v1`, model ghi kèm hãng, ví dụ `anthropic/claude-haiku-4-5` |
| Ollama, LM Studio | không | model chạy trên máy mình; Ollama cần cho phép trang: `OLLAMA_ORIGINS=https://x102.github.io ollama serve`; LM Studio bật CORS trong Server settings |
| OpenAI, Gemini, Claude, Grok gọi thẳng | thường là có | dùng relay riêng (mục 2) |
| relay riêng trên Hugging Face Space | không (chỉ cần tới được `hf.space`) | giữ khoá ở máy chủ, trình duyệt chỉ giữ mã relay |

Nếu trang báo "không kết nối được (mạng, trình duyệt chặn CORS...)" khi gọi thẳng một nhà cung cấp, hãy dùng relay cho nhà cung cấp đó
(relay trả đúng tiêu đề CORS cho trang). Không dùng Cloudflare Worker làm relay vì kết nối tới Cloudflare ở Nga bị giới hạn tốc độ từ năm 2025.

Người dùng tự chịu trách nhiệm tuân thủ điều khoản sử dụng và danh sách vùng được phục vụ của từng nhà cung cấp.

## 2. Dựng relay riêng trên Hugging Face Space

1. Mở Colab, dán ô `colab/HF_AI_RELAY_cell.py`, chạy. Cần token Hugging Face quyền write (Colab Secrets `HF_TOKEN`, hoặc nhập ẩn khi được hỏi).
2. Ô hỏi khoá của từng nhà cung cấp (hoặc lấy từ Colab Secrets cùng tên: `DEEPSEEK_API_KEY`, `YANDEX_API_KEY`, `PROXYAPI_API_KEY`,
   `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`); Enter để bỏ qua. Khoá ghi thẳng vào Secrets của Space, không in ra.
3. Ô tạo Space Docker công khai `<tài-khoản>/ai-relay` (mã nguồn công khai, không chứa khoá), đặt `RELAY_TOKEN` ngẫu nhiên,
   `ALLOWED_ORIGINS=https://x102.github.io`, chờ Space chạy rồi in **địa chỉ relay** và **mã relay**. Nên lưu mã relay vào Colab Secrets
   tên `RELAY_TOKEN` để lần chạy sau (thêm, đổi khoá) giữ nguyên mã.
4. Trong geoportal: 🤖 AI, Kết nối, mở "Relay riêng", dán địa chỉ và mã, đánh dấu "Đi qua relay" cho nhà cung cấp muốn dùng, bấm Lưu,
   rồi "Thử kết nối". Nhà cung cấp đã có khoá trên relay thì ở trang không cần nhập khoá.

Relay (`tools/ai_relay/ai_relay.py`, chỉ thư viện chuẩn Python):

- chỉ nhận yêu cầu có tiêu đề `X-Relay-Token` đúng và đến từ trang trong `ALLOWED_ORIGINS`;
- chỉ chuyển tiếp các đường dẫn trò chuyện và danh sách model của 7 nhà cung cấp đã biết (không phải proxy mở);
- giới hạn `RATE_PER_MIN` yêu cầu mỗi phút cho mỗi IP (mặc định 30), thân yêu cầu tối đa `MAX_BODY_MB` (mặc định 20);
- gắn khoá từ Secrets; không có khoá của một nhà cung cấp thì dùng khoá trình duyệt gửi kèm;
- nhật ký chỉ ghi phương thức, đường dẫn, mã trả về; không ghi tiêu đề, khoá hay nội dung;
- `GET /health` cho biết relay chạy và nhà cung cấp nào đã có khoá.

Space miễn phí ngủ sau một thời gian không dùng; lần gọi đầu sau đó chờ khoảng nửa phút để Space thức dậy.
Chạy trên VPS ở nước ngoài cũng được: `RELAY_TOKEN=... OPENAI_API_KEY=... ALLOWED_ORIGINS=https://x102.github.io python3 ai_relay.py`,
đặt sau một máy chủ HTTPS (Caddy, nginx).

## 3. Khoá API trong trình duyệt

- "mã hoá, gắn với trình duyệt này" (mặc định): AES-GCM bằng một khoá không xuất ra được, nằm trong IndexedDB của trình duyệt; nhập khoá một lần.
- "mã hoá bằng mật khẩu riêng": PBKDF2 (310000 vòng) + AES-GCM; nhập mật khẩu một lần mỗi phiên.
- "chỉ đến khi đóng thẻ", "không lưu".

Khoá lưu dưới tên `laymauAI_...`, không nằm trong tệp tiến độ xuất ra, không hiện lại trên màn hình (chỉ dạng `sk-…abcd`), và mọi thông
báo lỗi đều được che khoá. Nút "Quên mọi khoá trên trình duyệt này" xoá cả khoá mã hoá trong IndexedDB.

## 4. Gửi gì cho AI

Với một điểm: toạ độ, xã, các năm cần gợi ý, nhãn đã gán và gợi ý từ bản đồ của điểm đó, hệ 17 lớp (tên và dấu hiệu nhận biết),
10 băng và 5 chỉ số theo năm, đường mùa vụ 6 kỳ (NDVI, MNDWI...), bảng giá trị tại điểm, bản đồ lớp có sẵn; kèm ảnh (nếu model nhận ảnh):
dải ảnh theo năm quanh điểm (tổ hợp đang xem, dấu thập ở tâm) và đồ thị mùa vụ NDVI, MNDWI. Nút "Xem nội dung sẽ gửi" cho thấy
đúng những gì sẽ đi, không gọi AI.

AI trả lời JSON: mô tả, gợi ý nhãn từng năm kèm độ tin cậy và lý do. Mã ngoài hệ lớp hoặc năm không được hỏi bị bỏ. Nhãn do AI gán
ghi model và độ tin cậy vào điểm (`ai` trong tệp tiến độ), độ tin cậy của người gán đặt thấp hoặc vừa, có thể đánh dấu "cần xem lại".
Gán hàng loạt: mỗi điểm một lần gọi; U, M không tự gán; máy chủ báo bận (429) thì tự chờ rồi thử lại; khoá sai (401, 403) thì dừng.

Tên model đổi thường xuyên: bấm "Lấy danh sách" để chọn model hiện có; với ảnh, chọn model nhận ảnh.
