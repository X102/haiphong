# Geoportal lớp phủ Hải Phòng: bản 3.4 (02.10.2026): Landsat và Sentinel-1 trực tuyến

## Tóm tắt
Bảng kế hoạch cảnh (🛰) có thêm ô **Nguồn ảnh** với ba lựa chọn:

| nguồn | lấy từ | độ phân giải | từ năm | che mây |
|---|---|---|---|---|
| Sentinel-2 L2A | Element 84 Earth Search (AWS) | 10 m | 2017 | lớp SCL |
| Landsat 4, 5, 7, 8, 9 Collection 2 Level-2 | Microsoft Planetary Computer | 30 m | 1984 | QA_PIXEL |
| Sentinel-1 RTC (radar VV, VH) | Microsoft Planetary Computer | 10 m | 2015 | không cần (radar xuyên mây) |

Landsat và Sentinel-1 chạy giống Sentinel-2 trực tuyến: tìm cảnh, chấm điểm quang đãng trong phạm vi, ghép trung vị theo năm, lớp bản đồ, dải ảnh theo năm, giá trị tại điểm, đồ thị theo năm và theo cảnh, ghi ảnh đã xem khi gán nhãn. Mọi việc đọc và ghép đều diễn ra trong trình duyệt, không cần tài khoản.

## Vì sao lấy từ Planetary Computer
Earth Search cũng có Landsat và Sentinel-1, nhưng hai bộ này nằm trong kho AWS loại "người tải trả phí" (requester pays). Trình duyệt không đọc được kho loại này.

Planetary Computer cho đọc miễn phí. Đổi lại, mỗi bộ dữ liệu cần một "vé" SAS:

- vé xin tự động, không cần đăng ký;
- vé hết hạn sau chưa tới 1 giờ;
- trang tự xin vé mới khi vé cũ còn dưới 10 phút.

## Landsat
- **Tên băng** quy về tên S2 tương ứng: B2 lam, B3 lục, B4 đỏ, B8 NIR, B11 và B12 SWIR. Nhờ vậy các chỉ số trong thư viện dùng chung. Landsat không có B5, B6, B7, B8A, nên danh sách chỉ số chỉ giữ những chỉ số đủ băng.
- **Phản xạ** = DN × 0.0000275 − 0.2 (theo raster:bands của từng cảnh), lưu dạng phản xạ × 10000 như S2, nên giá trị và chỉ số so sánh được với S2.
- **Che mây** theo QA_PIXEL: bỏ điểm ảnh có cờ không dữ liệu, mây giãn, mây ti, mây hoặc bóng mây.
- **Landsat 7 sau 31.05.2003** (hỏng bộ SLC, ảnh có sọc trống) mặc định bị bỏ. Có ô để giữ lại.
- **Cách xem**: màu thật 4-3-2, các tổ hợp màu, chỉ số. Tổ hợp có B8A thì dùng B8.

## Sentinel-1
- Dùng sản phẩm **RTC** (đã hiệu chỉnh địa hình, γ⁰), hai phân cực VV và VH.
- **Ảnh ghép** là trung vị các cảnh đã chọn. Ghép nhiều cảnh làm giảm nhiễu đốm, nên "Số cảnh ghép" 3 đến 5 cho ảnh mịn hơn.
- **Giá trị** tại điểm và trên đồ thị theo năm tính bằng dB.
- **Ảnh màu** mặc định: R = VV, G = VH, B = VV/VH.
- **Chỉ số radar**: VV (dB), VH (dB), VH/VV, RVI = 4·VH/(VV+VH), VV−VH (dB).
- Không có ô mây và che mây (radar không bị mây che).

## Mỗi nguồn một kế hoạch
Kế hoạch cảnh của từng nguồn được giữ riêng. Đổi nguồn trong bảng thì:

- kế hoạch đang dùng được cất lại;
- kế hoạch đã có của nguồn mới được lấy ra, hoặc để trống nếu chưa có;
- lớp bản đồ, dải ảnh, đồ thị theo năm đổi theo.

Ảnh đã xem khi gán nhãn ghi kèm nguồn, ví dụ `landsat:ghep:1995-02-20+1995-01-15` hoặc `s1:ghep:2020-02-10+…`.

## Kiểm trên dữ liệu thật (02.10.2026)
Chạy trong trình duyệt từ trang x102.github.io (khác nguồn với Planetary Computer, tức đúng như khi dùng thật), điểm 105.75° E, 19.93° N (Thanh Hoá), tháng 1 đến 4:

| nguồn, năm | tìm cảnh | số cảnh | ghép một ô 256 × 256 (3 cảnh) |
|---|---|---|---|
| Landsat 1995 | 0.9 s | 2 (Landsat 5) | 1.5 s |
| Landsat 2024 | 0.6 s | 8 (Landsat 8, 9) | 1.1 s |
| Sentinel-1 2020 | 0.8 s | 19 | 10.7 s |

- Vé SAS, đọc COG theo đoạn và CORS đều chạy được.
- Ảnh Sentinel-1 nặng hơn nhiều (số thực 32 bit), nên lớp S1 vẽ chậm hơn, nhất là lần đầu.
- Ở một cảnh Landsat 8 (13.04.2024), QA_PIXEL ghi "quang đãng" nhưng phản xạ đỏ 0.63: đó là mây mà Fmask bỏ sót. Ghép trung vị nhiều cảnh làm giảm ảnh hưởng này. Khi cần chặt chẽ, xem từng cảnh ("một cảnh").

## Mã nguồn
| tệp | thay đổi |
|---|---|
| `src/s2o_core.js` | ba nguồn (`NGUON`), vé SAS (`kyPC`, `chuanBi`), tìm cảnh trên Planetary Computer, mặt nạ theo nguồn (`quang`), đọc số thực |
| `src/v34_ui.js` (mới) | chọn nguồn, kế hoạch riêng từng nguồn, băng và chỉ số theo nguồn, chỉ số radar, ảnh màu S1, dB |
| `src/v31_ui.js`, `src/v32_ui.js` | gọi tìm cảnh theo nguồn, giá trị và chỉ số theo nguồn, ghi nguồn khi gán |
| `src/tpl.html` | bản 3.4; ô nguồn ảnh, ô Landsat 7; mục trợ giúp |
| `src/gen_i18n_v34.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `v34_ui.js` |

## Kiểm thử
`tests/t_v34_dom.js` (jsdom) chạy trên máy chủ STAC và vé SAS giả, với ảnh giả `tests/mk_fx34.py` (Landsat có mây phía tây, một cảnh Landsat 7 sau 2003; Sentinel-1 số thực có vùng không dữ liệu). Bài thử kiểm:

- mặt nạ QA_PIXEL và S1;
- yêu cầu STAC đúng bộ, vé gắn vào đường dẫn;
- bỏ Landsat 7, thang phản xạ, trung vị bỏ điểm mây;
- NDVI theo năm Landsat;
- S1 bằng dB, chỉ số RVI, ảnh màu VV/VH;
- đổi qua lại giữa ba nguồn mà không mất kế hoạch;
- ghi ảnh đã xem; bản dịch tiếng Nga.

Toàn bộ bài thử cũ vẫn đạt. `t_v28_dom.js` chờ ranh giới xã nạp xong trước khi dùng (trước đây đôi khi chạy trước).

## Bản 3.4.1 (02.10.2026): bỏ mây Landsat mà QA_PIXEL sót; đồ thị nhiều năm thưa ra

### Vì sao vẫn lọt ô trắng vì mây
Hai nguyên nhân:

1. **QA_PIXEL (Fmask) bỏ sót cả mảng mây.** Em đo trên dữ liệu thật quanh 105.75° E, 19.93° N, khung khoảng 10 × 10 km, so phần QA_PIXEL ghi "quang đãng" với phản xạ lam B2:

   | cảnh | mây cả cảnh (siêu dữ liệu) | QA ghi quang đãng | trong đó lam > 0.25 (thực ra là mây) |
   |---|---|---|---|
   | Landsat 5, 11.02.1990 | 2 % | 99 % | 99 % |
   | Landsat 8, 13.04.2024 | 7.8 % | 92 % | 90 % |
   | Landsat 8, 04.04.2024 | 22 % | 100 % | 0 % |
   | Landsat 8, 20.04.2024 | 8.9 % | 82 % | 0 % |

   Như vậy có cảnh phủ mây gần kín vùng mà cả siêu dữ liệu lẫn QA_PIXEL đều ghi là quang đãng. Các cảnh quang đãng thật thì không có điểm nào vượt ngưỡng.
2. **Dải ảnh nhanh chỉ xét đúng một điểm.** Trước đây trang lấy cảnh đầu tiên quang đãng tại điểm rồi vẽ nguyên cảnh, không che mây. Khung quanh điểm vì thế vẫn có thể trắng. Cảnh Landsat lại xoay, hộp bao rộng hơn phần có dữ liệu, nên có khi chọn phải cảnh không phủ điểm và vẽ ra ô trống.

### Đã sửa
- **Phép thử độ sáng cho Landsat**: phản xạ lam > 0.25 thì coi là mây. Áp dụng ở mọi chỗ: chấm điểm cảnh khi lập kế hoạch, ghép ảnh, đọc tại điểm, đồ thị theo năm. Tại điểm, cảnh bị loại theo cách này ghi "mây sáng (QA_PIXEL bỏ sót)".
- **Dải ảnh nhanh**:
  - chấm 7 × 7 điểm trong cả khung (mặt nạ + độ sáng), xét cảnh đã ghép trước, thiếu thì xét thêm cảnh ứng viên;
  - cảnh tốt nhất quang đãng ≥ 85 % khung thì vẽ đúng cảnh đó;
  - không thì ghép trung vị có che mây tối đa 4 cảnh tốt nhất, góc ô ghi "∑n";
  - không cảnh nào phủ khung thì ghi "không có cảnh phủ" thay vì để ô trắng.
- **Đồ thị theo năm nhiều năm** (như Landsat 1984-2026):
  - nhãn năm thưa ra (mỗi 2, 5 hoặc 10 năm tuỳ bề rộng), năm đang xem luôn hiện;
  - chấm từng cảnh nhỏ hơn, nét nối mờ hơn, dấu × nhỏ hơn.

  Nút "Phóng to" cho đồ thị rộng hơn khi cần xem kỹ.

Kế hoạch Landsat đã lập ở bản 3.4 nên bấm **Tìm cảnh** lại để chấm điểm cảnh bằng mặt nạ mới. Dải ảnh và đồ thị thì dùng phép thử mới ngay.
