# Geoportal lớp phủ Hải Phòng: bản 3.9 (06.10.2026): đường mùa vụ 12 tháng

## Cách dùng
Ở đường mùa vụ, ô mới **6 kỳ / 12 tháng** nằm cạnh ô đặc trưng.

- **6 kỳ (2 tháng)**: như trước, đường tái dựng từ PCA chuỗi năm.
- **12 tháng**: mỗi tháng một giá trị. Trang đọc Sentinel-2 trực tuyến tại đúng điểm ảnh của điểm đang xem.

Lựa chọn được nhớ trong trình duyệt. Cả ba cách xem (một năm, chồng các năm, chuỗi liên tục) đều dùng được với 12 tháng.

## Vì sao 12 tháng phải đọc trực tuyến
Đường 6 kỳ dựng lại từ các thành phần chính (PC) đã tính sẵn cho từng kỳ 2 tháng. Từ đó không tách được ra từng tháng.

Vì vậy 12 tháng lấy thẳng ảnh gốc: Sentinel-2 L2A (`sentinel-2-l2a`) trên Microsoft Planetary Computer, qua API điểm của máy chủ. Máy chủ đọc giá trị tại điểm, nên trình duyệt không phải tải khối ảnh về.

Hệ quả: 12 tháng **dùng được ở mọi nơi**, kể cả ngoài vùng có ảnh chuẩn bị sẵn.

## Cách tính
1. **Tìm cảnh** tại điểm, cho các năm cần gán (từ 2016):
   - bỏ cảnh có mây cả cảnh > 80 %;
   - cùng một ngày có hai ô MGRS thì giữ cảnh ít mây hơn.
2. **Đọc mỗi cảnh một yêu cầu**: 10 băng (B2…B12) và lớp SCL tại điểm.
3. **Chỉ giữ cảnh quang đãng tại điểm** theo SCL: thực vật, không thực vật, nước, chưa phân loại, tuyết (4, 5, 6, 7, 11). Cảnh mây, bóng mây, mây ti, không có dữ liệu bị bỏ.
4. **Phản xạ**: với baseline xử lý từ 04.00 trừ 1000 (BOA_ADD_OFFSET) rồi chia 10000; baseline cũ chỉ chia 10000.
5. Mỗi cảnh tính đủ đặc trưng: 10 băng (ghi bằng phản xạ 0..1), NDVI, MNDWI và các chỉ số đang dùng trong thư viện chỉ số.
6. **Mỗi tháng lấy trung vị** các cảnh quang đãng. Tháng không có cảnh quang đãng thì để trống, đường nối qua chỗ trống.

## Đọc đồ thị
- Chế độ **một năm**:
  - đường đậm là trung vị tháng của năm đang gán;
  - **chấm nhỏ** là từng cảnh quang đãng (rê chuột xem ngày, giá trị, SCL);
  - **vạch xám dưới trục** là cảnh bị mây tại điểm.

  Nhìn vào đó biết tháng nào chỉ dựa trên một cảnh.
- Chú giải ghi: số cảnh, số cảnh quang đãng của năm đang gán, các tháng không có ảnh quang đãng.
- Bật **+ S1** thì đường Sentinel-1 (VV, VH) cũng chuyển sang trung vị theo tháng.

## Đo trên dữ liệu thật (06.10.2026)
Điểm ruộng lúa 20.89696, 106.58221, năm 2024:

- 52 ngày có cảnh sau lọc mây; 26 cảnh quang đãng tại điểm; tháng 7 không có cảnh nào quang đãng.
- NDVI theo tháng:

  | tháng | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | NDVI | 0.56 | 0.54 | 0.49 | 0.40 | 0.58 | 0.68 | – | 0.43 | 0.66 | 0.56 | 0.56 | 0.58 |

  Thấp ở tháng 4 và tháng 8, cao ở tháng 6 và tháng 9: đúng hai vụ lúa.

**Tốc độ**:

| | |
|---|---|
| tìm cảnh 3 năm | khoảng 1 s |
| mỗi yêu cầu điểm | 0.7–0.9 s (trung vị) |
| 6 yêu cầu cùng lúc | 8–21 s cho một năm |
| 12 yêu cầu cùng lúc | 2–6 s cho một năm, không lỗi |

Vì vậy hàng đợi chung của S1 và S2 tháng nâng từ 6 lên 12 yêu cầu cùng lúc.

- Năm đang gán đọc trước, đồ thị vẽ lại dần khi có thêm cảnh.
- Điểm đang xem luôn được ưu tiên trước điểm nạp trước.
- Kết quả giữ trong trình duyệt (IndexedDB), mở lại điểm không phải đọc lại. Nếu lỗi mạng quá 5 % số cảnh thì không lưu, lần sau đọc lại.

## Nạp trước
Khi đang ở 12 tháng, nạp trước đọc luôn đường 12 tháng của 5 điểm kế tiếp gần nhất. Đổi 6 / 12 thì nạp trước chạy lại.

## Kiểm thử
`tests/t_v39_dom.js` dùng STAC và API điểm giả:

- mỗi tháng 3 cảnh: ngày 3 và 13 quang đãng, ngày 23 có mây;
- tháng 7 mây cả tháng;
- tháng 1 có một cảnh không có dữ liệu;
- mỗi ngày có thêm cảnh ô MGRS thứ hai, nhiều mây hơn;
- baseline 03.01 cho tháng 1–3, 05.11 cho các tháng khác.

Kiểm:

- **tìm cảnh**: đúng bộ sưu tập, lọc mây ≤ 80 %; chỉ đọc cảnh ít mây hơn, mỗi cảnh một lần; năm đang gán đọc trước;
- **giá trị**: NDVI tháng đúng trung vị (sai < 0.001); bỏ cảnh mây và cảnh không có dữ liệu; tháng 7 để trống; phản xạ đúng với cả hai baseline;
- **đồ thị**: trục 12 tháng; 22 chấm cảnh quang đãng, 14 vạch cảnh mây; chú giải; chọn B5 giữ được khi vẽ lại; ba cách xem; vẽ lại không đọc lại;
- **S1 theo tháng**: đúng 12 giá trị; hàng đợi 12;
- **dữ liệu thật đã ghi** (`tests/s2m_that_20.89696_106.58221.txt`: 103 cảnh 2024–2025 đọc từ Planetary Computer): tái lập 52 cảnh, 26 cảnh quang đãng và bảng NDVI tháng ở trên;
- **khác**: điểm ngoài vùng có ảnh sẵn; nạp trước; về 6 kỳ như cũ; ẩn ô khi xem giá trị theo năm; bản dịch tiếng Nga.

Các bài thử cũ vẫn đạt.

## Mã nguồn
| tệp | thay đổi |
|---|---|
| `src/v39_ui.js` (mới) | đọc S2 tại điểm theo cảnh, trung vị theo tháng, chấm từng cảnh, chú giải, ô 6 / 12, nạp trước, hàng đợi 12 |
| `src/v36_ui.js` | S1 tính cả trung vị theo tháng; đồ thị S1 theo 6 hoặc 12 kỳ |
| `src/tpl.html` | bản 3.9; ô 6 kỳ / 12 tháng; đồ thị theo số kỳ; tên kỳ / tháng; trợ giúp |
| `src/gen_i18n_v39.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `v39_ui.js` |
