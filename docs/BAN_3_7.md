# Geoportal lớp phủ Hải Phòng: bản 3.7 (06.10.2026): lấy điểm mẫu từ Google Earth / Street View

## Cách dùng
1. Bấm nút **📌 GE** (cạnh ô "tự mở khi sang điểm"). **Kéo** nút "📌 Lấy điểm GE" lên thanh dấu trang của trình duyệt. Nếu thanh đang ẩn thì bấm Ctrl+Shift+B. Chỉ cần làm một lần.
2. Trong tab Google Earth, ở Street View hoặc nhìn từ trên, bấm dấu trang đó. Bấm lần nữa để tắt.
   - **Giữa khung ảnh 3D** hiện dấu tâm đỏ.
   - **Góc trên** hiện:
     - toạ độ của tâm;
     - khoảng cách tới máy ảnh, kèm sai số;
     - ngày ảnh, đọc từ thanh dưới của Google Earth (ví dụ "thg 10 2024").
   - Dấu tâm chuyển màu cam khi tâm xa máy ảnh quá 40 m (đổi được ngưỡng này).
3. Xoay, cúi góc nhìn cho dấu tâm nằm **giữa vùng đồng nhất** cần lấy mẫu, ở chỗ gần. Bấm **📋 Chép điểm**.
4. Sang geoportal, bấm **Ctrl+V** trên bản đồ. Trang sẽ:
   - tạo điểm mẫu, chuyển sang năm của ngày ảnh;
   - vẽ trên bản đồ vị trí máy ảnh, tia nhìn và vòng sai số.

   Bấm phím lớp để gán.

Geoportal cũng nhận được hai thứ khác khi dán:

- **đường dẫn Google Earth**: trong tab đó bấm Ctrl+L rồi Ctrl+C;
- **toạ độ** dạng "vĩ độ, kinh độ".

Nếu không có ngày ảnh, khung điểm có ô nhập tháng/năm ảnh. Nhập vào thì trang chuyển sang năm đó.

## Toạ độ tâm tính thế nào
Đường dẫn Google Earth ghi đủ vị trí và hướng máy ảnh:

`@vĩ độ,kinh độ,độ cao a,khoảng cách d,góc nhìn y,hướng h,độ nghiêng t`

- **Nhìn từ trên** (khoảng cách d > 0): vĩ độ, kinh độ trong đường dẫn chính là điểm ở giữa màn hình. Toạ độ đúng tuyệt đối.
- **Street View** (d = 0): vĩ độ, kinh độ là vị trí máy ảnh. Tâm màn hình là chỗ tia nhìn gặp mặt đất phẳng:
  - khoảng cách = H / tan(90° − t);
  - H là chiều cao máy ảnh so với mặt đất ở chỗ nhìn. Mặc định 2.5 m (xe Street View). Ruộng thấp hơn mặt đường thì tăng H, ví dụ thấp 1 m thì đặt 3.5 m.

  Sai số ước tính gồm góc ±0.3°, chiều cao ±0.3 m, vị trí ảnh ±2 m:

  | khoảng cách tới máy ảnh | sai số |
  |---|---|
  | 15 m | ±3 m |
  | 25 m | ±4 m |
  | 40 m | ±6 m |
  | xa hơn | tăng nhanh |

  Nên chọn chỗ gần, ở giữa thửa đồng nhất, để vòng sai số nằm gọn trong thửa.

**Điểm mẫu đặt ở tâm điểm ảnh 10 m chứa toạ độ đó**, giống điểm thêm tay. Toạ độ tâm gốc vẫn được ghi lại.

Dán thêm một điểm rơi vào cùng điểm ảnh 10 m thì trang mở điểm đã có, không tạo trùng.

## Ghi lại cho mỗi điểm
Thông tin lưu trong `p.sv`, có trong tệp tiến độ và đi theo khi gộp:

- nguồn;
- toạ độ tâm gốc;
- ngày ảnh, và chữ gốc của ngày ảnh;
- kiểu nhìn (Street View hay từ trên);
- khoảng cách, sai số, chiều cao H;
- vị trí máy ảnh, hướng, độ nghiêng;
- đường dẫn để **mở lại đúng góc nhìn**.

CSV dạng dài có thêm các cột:

| cột | nội dung |
|---|---|
| `nguon_mau` | `gearth:sv`, `gearth:tren` hoặc `toado` |
| `ngay_anh_mau` | ngày ảnh |
| `kc_may_anh_m` | khoảng cách tới máy ảnh (m) |
| `sai_so_m` | sai số ước tính (m) |

Khi tạo điểm từ Google Earth, trang không tự mở lại Google Earth (chức năng tự mở của bản 3.6.1).

## Dự phòng
Đã kiểm trên trang Google Earth thật: dấu tâm và hộp thông tin dựng được dưới chính sách bảo mật của trang đó.

Chưa kiểm được việc **bấm dấu trang thật**, vì trình duyệt của công cụ kiểm không có thanh dấu trang. Nếu trình duyệt chặn dấu trang trên Google Earth, hộp hướng dẫn có nút **tải userscript**:

- cài tiện ích Tampermonkey rồi mở tệp đó;
- Google Earth sẽ có nút 📌 nổi ở góc dưới, chạy cùng mã.

## Khoá API Google Maps (nếu sau này muốn đặt Street View ngay trong geoportal)
- Hướng dẫn: https://developers.google.com/maps/documentation/javascript/get-api-key
- Tạo khoá: https://console.cloud.google.com/google/maps-apis/credentials

Khoá thường cần tài khoản thanh toán. Google có **Maps Demo Key** không cần thanh toán, nhưng chỉ để thử nghiệm.

## Kiểm thử
`tests/t_v37_dom.js` kiểm:

- **tính toạ độ**: Street View 20 m về hướng đông, sai số ±3.2 m; nhìn từ trên đúng toạ độ; nhìn lên trời bị từ chối; chiều cao 3.5 m cho 28 m;
- **dấu trang** chạy trong một trang Google Earth giả: dấu tâm, toạ độ, khoảng cách, ngày "thg 10 2024 (2024-10)", chép dòng LMGE1, tắt;
- **Ctrl+V**:
  - tạo điểm ở tâm điểm ảnh, giữ toạ độ gốc;
  - chuyển năm 2024, không tự mở Google Earth;
  - có lớp vòng sai số, tia nhìn, máy ảnh;
  - phím lớp gán nhãn; các cột CSV;
  - không tạo trùng;
  - dán đường dẫn rồi nhập ngày ảnh; dán toạ độ; bỏ qua chữ khác;
  - gộp tiến độ giữ thông tin;
- **hộp hướng dẫn, dịch**: hộp hướng dẫn, đổi chiều cao, userscript, bản dịch tiếng Nga.

Các bài thử cũ vẫn đạt.

## Mã nguồn
| tệp | thay đổi |
|---|---|
| `src/v37_ui.js` (mới) | hàm tính toạ độ tâm, dấu trang, userscript, dán tạo điểm, vẽ vòng sai số, ô ngày ảnh |
| `src/tpl.html` | bản 3.7; nút 📌 GE, hộp hướng dẫn; CORE: cột nguồn mẫu trong CSV dài, gộp mang theo `sv`; trợ giúp |
| `src/gen_i18n_v37.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `v37_ui.js` |
