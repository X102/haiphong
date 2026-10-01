# Geoportal lớp phủ Hải Phòng: bản 3.0 (01.10.2026): Landsat 1987-2026

Bản này thêm Landsat thành **nguồn ảnh quang học thứ hai**, bên cạnh Sentinel-2.

Dữ liệu được dựng và đẩy lên Hugging Face bằng notebook `colab/ls_HF_LANDSAT.ipynb` (phương án, cách lọc và chuẩn hoá: `docs/LANDSAT_PHUONG_AN.md`).

Khi manifest chưa có mục `ls`, trang chạy y như bản 2.9.1.

## Người dùng thấy gì

### Nhóm "Landsat 1987-2026"
Nhóm này nằm cuối bảng lớp và có các lớp sau.

- **Landsat 6 băng** (tính trong trình duyệt từ ảnh 10 băng `ls/ls_{năm}.tif`). Có các cách xem:
  - **tổ hợp màu theo tên băng**: màu thật; NIR, đỏ, lục; SWIR1, NIR, đỏ; SWIR2, SWIR1, đỏ; SWIR2, NIR, lục; hoặc tuỳ chọn R-G-B. Kéo giãn cố định, giống nhau mọi năm;
  - **chỉ số**: danh sách chỉ số đang dùng, biên dịch theo 6 băng BLUE, GREEN, RED, NIR, SWIR1, SWIR2. Chỉ số cần B5, B6, B7, B8A thì báo "Landsat không có băng";
  - **nhiệt độ bề mặt** mùa khô (°C);
  - **nguồn điểm ảnh**: mùa khô ≥ 2 quan sát; nới tháng 10 đến 5; một quan sát; mượn năm lân cận; ảnh có sẵn;
  - **cảm biến**: TM, ETM+, OLI, OLI-2 và các tổ hợp.
- **Chọn năm 1987-2026** ngay trong lớp. Khi chọn năm không có ảnh S2, lớp S2 báo "không có năm".
- **Màu thật** (`lstc`), **PC1-5** của PCA phổ chuỗi năm (`lspc1..5`, đỏ +, xanh −), **embedding Landsat** (`lsg`, `lsgb`).

### Dải ảnh, giá trị tại điểm, đồ thị
- **Dải ảnh theo năm**: chọn "Landsat 6 băng" để xem 1987-2026 theo đúng cách xem đang đặt.
- **Giá trị tại điểm** có các dòng Landsat của năm đang xem:
  - 6 băng, nhiệt độ;
  - nguồn điểm ảnh, cảm biến, số quan sát;
  - các chỉ số dùng được, PC1-5.
- **Đồ thị theo năm** có 5 nhóm mới: Landsat 6 băng, chỉ số, PC, embedding, nhiệt độ.
  - PC tính đúng từ phản xạ theo hệ số chung trong manifest, không đọc ngược từ ảnh 8 bit.

### Phát hiện thay đổi, IR-MAD, xu hướng
- Có ô **Nguồn ảnh**: Sentinel-2 (2017-2026, 10 m) hoặc Landsat (1987-2026, 30 m).
- Với Landsat:
  - danh sách năm, nhóm dữ liệu (6 băng, chỉ số, CTX, PC, embedding Landsat) và lưới 30 m đổi theo;
  - nhận định ghi rõ nguồn ảnh;
  - so được hai năm bất kỳ từ 1987, tính xu hướng nhiều thập kỷ.
- **Xuất bản đồ**: lớp Landsat 6 băng xuất được như mọi lớp. Dòng nguồn thêm "USGS Landsat Collection 2".

## Mã nguồn

| tệp | thay đổi |
|---|---|
| `src/v30_ui.js` (mới) | lớp `lsd`, `lsAt`, `lsPC`, nhóm đồ thị, dòng giá trị tại điểm, `qhNguon` (nguồn ảnh cho thay đổi, xu hướng) |
| `src/tpl.html` | bản 3.0; nhóm Landsat trong bảng lớp; lớp `lsd` trong bảng lớp, dải ảnh; ô Nguồn ảnh; mục trợ giúp |
| `src/v26_ui.js`, `src/xh_ui.js` | đọc ảnh, chỉ số, PC, embedding theo nguồn đang chọn |
| `src/v21_ui.js`, `src/v24_ui.js`, `src/v27_ui.js`, `src/xb_ui.js` | embedding S2 không lẫn Landsat; giá trị tại điểm; dải ảnh; xuất bản đồ |
| `src/gen_i18n_v30.py` | bản dịch tiếng Nga, tiếng Anh |
| `colab/ls_*.py`, `colab/ls_*.ipynb` | dựng dữ liệu Landsat (xem `docs/LANDSAT_PHUONG_AN.md`) |

## Kiểm thử

**Dữ liệu giả**: `tests/mk_fx30.py` dựng dữ liệu bằng đúng các hàm của notebook (`ls_landsat`, `ls_pca`, `s2_hf_lop`):

- 5 năm Landsat (1990, 2000, 2010, 2023, 2025);
- một dải bị đô thị hoá sau 2010;
- các vùng nguồn điểm ảnh 2 và 3;
- cảm biến theo năm.

**`tests/t_v30_dom.js`** (jsdom) kiểm:

- **Bảng lớp và hiển thị**:
  - nhóm Landsat trong bảng lớp;
  - màu tổ hợp đúng kéo giãn chung;
  - màu nguồn điểm ảnh và cảm biến;
  - NDVI theo 6 băng;
  - chỉ số cần B5 bị từ chối;
  - nodata để trống.
- **Năm và dải ảnh**:
  - chọn năm 1990;
  - dải ảnh 1990-2025.
- **Giá trị và đồ thị**:
  - giá trị tại điểm đúng từng số ở 5 năm;
  - **PC trong trang trùng PC của `ls_pca` (Python)** và khớp ảnh `lspc` trong sai số làm tròn;
  - đồ thị 5 nhóm;
  - bảng giá trị tại điểm.
- **Phát hiện thay đổi trên Landsat**: CVA, IR-MAD và xu hướng 1990-2025 đều tìm ra dải đô thị hoá (trên 90 % điểm của dải), ngoài dải gần như không báo.
- **Chuyển nguồn và ngôn ngữ**:
  - trở về Sentinel-2;
  - tiếng Nga, tiếng Anh, không còn chữ chưa dịch.

**Toàn bộ 24 bộ jsdom/node và 4 bộ Python đều đạt.**

- Hai bài thử cũ đọc số phiên bản cứng (2.x) đã được sửa để đọc từ trang.

**Chromium thật** (`/tmp/pp/chup30.js`) vẽ được:

- lớp 6 băng (màu thật, hồng ngoại, nguồn điểm ảnh, cảm biến, NDVI);
- phát hiện thay đổi Landsat 2010 → 2023: thực vật → xây dựng 1549.9 ha trên dữ liệu giả;
- xu hướng 1990-2025;
- giao diện tiếng Nga.

**Lưu ý đã biết**: ở IR-MAD, ngưỡng χ² vẫn báo thừa thay đổi như ghi chú trong nhận định của trang (trọng số lặp làm phương sai MAD ước lượng nhỏ). Nên dùng Otsu hoặc theo điểm mẫu.
