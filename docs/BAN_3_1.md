# Geoportal lớp phủ Hải Phòng: bản 3.1 (01.10.2026): ranh giới hành chính, gộp xã, Sentinel-2 trực tuyến

Bản này có ba phần:

- ranh giới hành chính chỉnh được màu, có tên xã;
- gộp nhiều xã thành một vùng;
- lấy ảnh Sentinel-2 thẳng từ AWS cho vùng chưa có dữ liệu sẵn trên Hugging Face, để làm bộ mẫu đa năm ở tỉnh khác.

Các chức năng cũ chạy như bản 3.0.

## 1. Ranh giới hành chính

Mục **"Màu ranh giới, tên xã"** nằm trong khối Hành chính.

- **Kiểu có sẵn**:
  - **sáng** (mặc định): viền xã vàng, viền tỉnh cam, nhìn rõ trên ảnh vệ tinh;
  - **tối**: dùng trên bản đồ nền sáng;
  - **trắng**.
- **Tuỳ chọn riêng**:
  - **viền xã**: màu, độ dày, kiểu nét (liền, đứt, chấm);
  - **nền xã**: màu, độ đậm (0 là không tô);
  - **tên xã**: hiện hoặc tắt, cỡ chữ, màu chữ (tự có viền chữ tương phản), mức phóng bắt đầu hiện (9 đến 14), bỏ chữ "xã, phường";
  - **viền tỉnh**: màu, độ dày, hiện tên tỉnh.

Tên đặt ở điểm nằm sâu nhất trong xã, không đặt ở tâm hộp bao, nên xã hình cong vẫn có tên nằm bên trong. Chỉ vẽ tên của các xã trong khung nhìn. Lựa chọn được nhớ trong trình duyệt.

## 2. Gộp xã thành vùng

Mở bằng nút **⊕ Gộp xã thành vùng…** trong khối Hành chính.

### Thêm xã
Có ba cách:

- **gõ tên**: tìm trên cả nước, gõ không dấu cũng được; xã của tỉnh đang chọn xếp trước;
- **dán danh sách**: mỗi dòng một xã (hoặc ngăn bằng dấu ;). Có thể ghi kèm tỉnh: `Xã A, Tỉnh B`, `Xã A - Tỉnh B`, `Xã A (Tỉnh B)`.
  - Chữ "xã, phường, thị trấn, đặc khu" và dấu đều bỏ qua khi so.
  - Khi trùng tên mà không ghi tỉnh: ưu tiên tỉnh đang chọn; nếu vẫn chưa phân định được thì liệt kê để chọn.
  - Tên không thấy được báo riêng.
- **chọn trên bản đồ**: bật rồi nhấp, nhấp lần nữa để bỏ, Esc để thôi.
  - Nhấp sang tỉnh khác thì trang tự nạp ranh giới tỉnh đó.
  - Một vùng gộp được xã của nhiều tỉnh.

### Lưu và dùng
- **"Gộp và lưu vùng"** hoà tan ranh giới chung (polygon-clipping), tính diện tích, rồi lưu vào trình duyệt và tệp tiến độ.
- Vùng gộp là phạm vi chọn được ở:
  - Phát hiện thay đổi, Thống kê lớp phủ, Phân loại;
  - Tạo bộ điểm, Xuất bản đồ;
  - S2 trực tuyến.
- Có thể sửa lại vùng đã lưu, bay tới, tải GeoJSON (kèm danh sách xã, diện tích), xoá.

## 3. Sentinel-2 trực tuyến

Mở bằng nút **🛰 S2 trực tuyến**. Không cần tài khoản: trình duyệt tự đọc ảnh từ AWS.

### Nguồn dữ liệu
Ảnh lấy từ **Sentinel-2 L2A** (Copernicus, ESA):

- chỉ mục STAC **Element 84 Earth Search**;
- ảnh COG công khai trên **AWS Open Data**.

### Kế hoạch cảnh
1. **Chọn phạm vi**: khung nhìn, cả tỉnh đang chọn, hoặc một vùng gộp. Giới hạn 40000 km².
2. **Chọn tháng**: được phép qua năm. Ví dụ tháng 11 đến 4: năm Y gồm từ 01/11 năm Y−1 đến 30/04 năm Y, như mùa khô.
3. **Chọn các năm**: từ 2017.
4. **Mây cả cảnh**: mặc định ≤ 60 %.
5. **Số cảnh ghép**: 1 đến 5, mặc định 3.

Sau đó bấm **"Tìm cảnh"**. Với mỗi năm, trang làm như sau:

- **Tìm cảnh**: hỏi STAC; cùng ngày, cùng ô MGRS (bản xử lý lại) chỉ giữ bản ít mây nhất.
- **Chấm điểm cảnh**: tính tỉ lệ điểm ảnh quang đãng **trong phạm vi**, theo lớp SCL ở mức ảnh thu nhỏ.
  - Lưới 40 × 40 ô trên phạm vi, đọc rất ít dữ liệu.
  - SCL quang đãng là 4, 5, 6, 7, 11.
- **Chọn cảnh tham lam**: chọn ít cảnh nhất sao cho mỗi ô có đủ số lần quang đãng.
  - Tối đa (số cảnh + 3) × số ô MGRS.
  - Ghi độ phủ và số lần quang đãng trung bình.

**Bảng kế hoạch** cho từng năm:

- số cảnh tìm thấy;
- các cảnh đã chọn (ngày, % quang đãng);
- độ phủ;
- chọn lại cảnh bằng tay.

Kế hoạch lưu trong trình duyệt và trong tệp tiến độ; tải được **CSV** và **JSON** (nạp lại được).

### Hiệu chỉnh phản xạ
Phản xạ = DN × scale + offset theo `raster:bands` của từng cảnh.

- Khi cảnh có cờ `earthsearch:boa_offset_applied = true`, ảnh COG đã trừ sẵn offset nên trang dùng offset 0.
- Đã kiểm trên cùng một cảnh thật (48QWJ, 12/02/2024):
  - DN rừng khoảng 480 ở bộ `sentinel-2-l2a`;
  - khoảng 1460 ở bộ `sentinel-2-c1-l2a`, bộ này không có cờ, nên phải trừ 1000.
- Vì vậy các năm trước và sau 25/01/2022 (baseline 04.00) cùng thang.
- Bộ `sentinel-2-l2a` đủ các năm từ 2017. Bộ `sentinel-2-c1-l2a` còn thiếu một số năm, chỉ để lựa chọn.

### Dùng ảnh
- **Lớp "Sentinel-2 trực tuyến (AWS)"** trong bảng lớp, từ mức phóng 9. Ảnh ghép **trung vị** các cảnh đã chọn, có che mây theo SCL, tính ngay trong trình duyệt. Cách xem:
  - màu thật của ESA (TCI, nhanh nhất);
  - tổ hợp màu 4-3-2, 8-4-3, 11-8-4, 12-8A-4, 11-8-2, kéo giãn cố định, giống nhau mọi năm;
  - mọi chỉ số trong danh sách đang dùng.

  Mỗi ô bản đồ chỉ đọc các cảnh có hộp bao chạm ô đó.
- **Dải ảnh theo năm**: chọn nguồn "Sentinel-2 trực tuyến". Có hai cách:
  - cảnh quang đãng tại điểm (nhanh);
  - ảnh ghép như lớp (chậm).
- **Giá trị tại điểm**: nút "đọc 10 băng tại điểm" cho phản xạ × 10000 của năm đang xem và các chỉ số.
- **Lấy mẫu**: gán nhãn trên lớp này giống như với lớp có sẵn. Bộ điểm mới tạo được trong khung nhìn hoặc trong vùng gộp.

### Đo trên dữ liệu thật
Đo trong trình duyệt, ngày 01.10.2026, vùng 0.25° × 0.20° ở phía nam Hải Phòng (ô 48QXH), tháng 11 đến 4, 3 cảnh ghép:

| bước | 2019 | 2024 |
|---|---|---|
| tìm cảnh STAC | 2.1 s | 1.2 s |
| chấm 14 cảnh theo SCL | 2.9 s | 2.5 s |
| ghép 5 băng tại một ô 4 × 4 | 4.9 s | 5.8 s |
| ghép một ô bản đồ 256 × 256 (TCI) | 5.4 s | 10.3 s |
| độ phủ quang đãng của 3 cảnh chọn | 100 % | 100 % |

Lần xem sau nhanh hơn nhờ bộ đệm. Mỗi năm xem lần đầu tốn vài chục MB.

### Giới hạn
- Ảnh ghép tính tại chỗ, chưa có PCA, embedding hay CTX cho vùng mới: những lớp đó vẫn cần dựng trên Colab hoặc GEE rồi đẩy lên Hugging Face như với Hải Phòng.
- Cần mạng ổn định. Trình duyệt chặn truy cập AWS hoặc Earth Search thì chức năng này không chạy.

## Mã nguồn

| tệp | thay đổi |
|---|---|
| `src/s2o_core.js` (mới) | lõi S2 trực tuyến: STAC, cửa sổ tháng, offset, đọc COG theo đoạn, chấm SCL, chọn cảnh, ghép trung vị |
| `src/v31_ui.js` (mới) | kiểu ranh giới, tên xã; gộp xã; bảng S2 trực tuyến, lớp `S2OLayer`, dải ảnh, giá trị tại điểm, tệp tiến độ |
| `src/tpl.html` | bản 3.1; nút, bảng, mục Hành chính; thư viện polygon-clipping; lớp `s2o` trong bảng lớp và dải ảnh; mục trợ giúp |
| `src/v21_ui.js`, `src/v27_ui.js`, `src/xb_ui.js` | vùng gộp là phạm vi của Tạo bộ điểm, Thay đổi, Thống kê, Phân loại, Xuất bản đồ; lớp `s2o` trong xuất bản đồ |
| `src/gen_i18n_v31.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `s2o_core.js`, `v31_ui.js` |

## Kiểm thử

**Dữ liệu giả**: `tests/mk_fx31.py` dựng các cảnh L2A kiểu Earth Search (COG UTM 48N, B02..B12, SCL, TCI) và các item STAC:

- một cảnh có cờ offset, mây phía tây;
- một cảnh không cờ, offset −0.1, bóng mây phía đông;
- một cảnh mây kín thuộc năm sau khi qua năm;
- một bản xử lý lại trùng ngày;
- một cảnh nhiều mây;
- một cảnh ngoài tháng.

**`tests/t_v31_dom.js`** (jsdom) kiểm:

- **Ranh giới hành chính**: kiểu sáng, tối, tuỳ chọn; tên xã theo mức phóng; tên tỉnh; nhớ lựa chọn.
- **Gộp xã**:
  - tìm không dấu;
  - dán danh sách có tỉnh, trùng tên, tên không thấy;
  - nhấp chọn xã tỉnh khác;
  - hoà tan (diện tích không đổi);
  - 5 ô phạm vi và xuất bản đồ;
  - GeoJSON, sửa lại, tệp tiến độ.
- **S2 trực tuyến**:
  - yêu cầu STAC đúng cửa sổ qua năm và hộp bao;
  - bỏ bản trùng; chọn đúng cảnh, độ phủ 100 %;
  - offset theo cờ: phản xạ hai cảnh như nhau;
  - che mây đổi đúng trung vị;
  - TCI, tổ hợp màu, NDVI;
  - dải ảnh, giá trị tại điểm;
  - chọn lại cảnh, CSV, lưu và nạp kế hoạch, tệp tiến độ;
  - báo phạm vi quá rộng.
- **Dịch**: tiếng Nga, tiếng Anh, không sót chữ Việt.

Toàn bộ bài thử cũ vẫn đạt. Chromium: chụp màn hình ranh giới, gộp xã, ảnh ghép, dải ảnh, giao diện tiếng Nga.

## Nguồn
- Element 84 Earth Search: https://github.com/Element84/earth-search
- Sentinel-2 L2A COGs trên AWS Open Data: https://registry.opendata.aws/sentinel-2-l2a-cogs/
- Offset và cờ `boa_offset_applied`: https://github.com/Element84/earth-search/discussions/26
- Earth Search v1: https://element84.com/geospatial/introducing-earth-search-v1-new-datasets-now-available/
- polygon-clipping 0.15.7: https://github.com/mfogel/polygon-clipping
