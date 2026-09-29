---
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
