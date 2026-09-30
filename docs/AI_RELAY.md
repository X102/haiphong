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
| relay riêng trên Google Apps Script | không (chỉ cần mở được `script.google.com`, cùng hệ với Colab, Drive) | miễn phí, chỉ cần tài khoản Google; giữ khoá ở máy chủ của Google, trình duyệt chỉ giữ mã relay |
| relay riêng trên Hugging Face Space hoặc VPS | không | Space Docker nay cần gói HF PRO (tài khoản miễn phí báo lỗi 402); VPS tự trả tiền |

Nếu trang báo "không kết nối được (mạng, trình duyệt chặn CORS...)" khi gọi thẳng một nhà cung cấp, hãy dùng relay cho nhà cung cấp đó. Không dùng Cloudflare Worker làm relay vì kết nối tới Cloudflare ở Nga bị giới hạn tốc độ từ năm 2025.

Người dùng tự chịu trách nhiệm tuân thủ điều khoản sử dụng và danh sách vùng được phục vụ của từng nhà cung cấp.

## 2. Dựng relay riêng trên Google Apps Script (miễn phí, cách chính)

Hugging Face hiện chỉ cho tài khoản miễn phí dựng Space tĩnh (theo chính thông báo lỗi 402 của HF); Space Gradio, Docker trên cpu-basic cần gói PRO, nên ô
`HF_AI_RELAY_cell.py` với tài khoản miễn phí dừng ở lỗi `402 Payment Required` (ô nay bắt lỗi này và in hướng dẫn dưới đây).
Relay thay thế chạy trên Google Apps Script, không cần thẻ, không cần máy chủ:

1. Trong geoportal: 🤖 AI, Kết nối, mở "Relay riêng", bấm **Tạo mã**. Trang sinh một mã ngẫu nhiên 32 ký tự và hiện ra để chép.
2. Mở https://script.new (đăng nhập tài khoản Google), xoá mã mẫu, dán toàn bộ `tools/ai_relay/ai_relay_gas.gs`, bấm Lưu.
3. Cài đặt dự án (bánh răng) > Thuộc tính tập lệnh > Thêm thuộc tính:
   - `RELAY_TOKEN`: mã vừa tạo ở bước 1;
   - khoá của nhà cung cấp muốn dùng (không cần đủ): `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
     `XAI_API_KEY`, `YANDEX_API_KEY`, `PROXYAPI_API_KEY`; `YANDEX_FOLDER` nếu dùng Yandex;
   - `RATE_PER_MIN` (không bắt buộc, mặc định 30 yêu cầu mỗi phút cho cả relay).
4. Triển khai > Tuỳ chọn triển khai mới > Loại: **Ứng dụng web**; Thực thi với tư cách: **Tôi**; Người có quyền truy cập: **Bất kỳ ai**.
   Cho phép quyền (gọi URL bên ngoài), chép "URL ứng dụng web" (dạng `https://script.google.com/macros/s/.../exec`).
   Mở URL đó bằng trình duyệt: thấy `{"ok":true,...,"token_set":true}` là relay chạy, `providers` liệt kê nhà cung cấp đã có khoá.
5. Trong geoportal: dán URL `/exec` vào ô địa chỉ relay (mã relay đã có sẵn từ bước 1), đánh dấu "Đi qua relay" cho nhà cung cấp muốn dùng,
   bấm Lưu, rồi "Thử kết nối". Nhà cung cấp đã có khoá trên relay thì ở trang không cần nhập khoá.

Cách relay Apps Script làm việc (`ai_relay_gas.gs`):

- trang nhận ra địa chỉ `script.google.com/macros/s/.../exec` và gửi một phong bì JSON `{token, ncc, path, method, headers, body}` dạng
  `text/plain` (yêu cầu "đơn giản", không cần CORS preflight, điều Apps Script không hỗ trợ); relay trả `{status, body}`;
- mã relay đi trong thân yêu cầu, so sánh không lộ thời gian; sai mã trả 401 và không gọi nhà cung cấp;
- chỉ chuyển tiếp đường dẫn trò chuyện và danh sách model của 7 nhà cung cấp đã biết, chỉ giữ vài tiêu đề cần thiết;
- gắn khoá từ Thuộc tính tập lệnh; không có khoá của một nhà cung cấp thì dùng khoá trình duyệt gửi kèm; khoá không bao giờ về trình duyệt;
- Yandex: tự thêm `gpt://<thư mục>/` vào tên model.

Hạn mức Apps Script cho tài khoản Gmail thường: 20000 lần gọi URL mỗi ngày, thân yêu cầu tối đa 50 MB, mỗi lần chạy tối đa 6 phút
(developers.google.com/apps-script/guides/services/quotas). Sửa mã relay xong phải vào "Quản lý triển khai > Chỉnh sửa > Phiên bản mới"
thì URL cũ mới chạy mã mới. Đổi mã relay: sửa `RELAY_TOKEN` trong Thuộc tính tập lệnh (không cần triển khai lại) và dán mã mới vào trang.

## 2b. Relay trên Hugging Face Space (cần HF PRO) hoặc VPS

1. Mở Colab, dán ô `colab/HF_AI_RELAY_cell.py`, chạy. Cần token Hugging Face quyền write (Colab Secrets `HF_TOKEN`, hoặc nhập ẩn khi được hỏi)
   và tài khoản có gói PRO; tài khoản miễn phí nhận lỗi 402 và ô in hướng dẫn Apps Script ở mục 2.
2. Ô hỏi khoá của từng nhà cung cấp (hoặc lấy từ Colab Secrets cùng tên); Enter để bỏ qua. Khoá ghi thẳng vào Secrets của Space, không in ra.
3. Ô tạo Space Docker `<tài-khoản>/ai-relay` (mã nguồn công khai, không chứa khoá), đặt `RELAY_TOKEN` ngẫu nhiên,
   `ALLOWED_ORIGINS=https://x102.github.io`, chờ Space chạy rồi in địa chỉ relay và mã relay.
4. Trong geoportal: dán địa chỉ và mã như mục 2.

Relay Python (`tools/ai_relay/ai_relay.py`, chỉ thư viện chuẩn) nhận tiêu đề `X-Relay-Token`, kiểm tra nguồn trang theo `ALLOWED_ORIGINS`,
giới hạn `RATE_PER_MIN` mỗi IP và `MAX_BODY_MB`, nhật ký không ghi tiêu đề, khoá hay nội dung; `GET /health` cho biết relay chạy.
Chạy trên VPS ở nước ngoài: `RELAY_TOKEN=... OPENAI_API_KEY=... ALLOWED_ORIGINS=https://x102.github.io python3 ai_relay.py`,
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

## 5. Lưu câu trả lời của AI thành HTML

Ô kết quả của một điểm có nút **Lưu HTML**: tệp HTML tự chứa gồm nhận định của AI (model, thời gian trả lời), ảnh đã gửi và toàn bộ số liệu đã gửi
(JSON). Gán hàng loạt cũng có nút Lưu HTML cho bảng kết quả (điểm, năm, nhãn, độ tin cậy, lý do, lỗi). Tệp không chứa khoá hay mã relay.
