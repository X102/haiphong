# Geoportal 2.8: GeoTIFF có nodata, xuất bản đồ in ấn, hồi quy xu hướng, IR-MAD, độ trong suốt, kéo giãn bảng

## 1. Sửa lỗi GeoTIFF: lớp bị trùng với "không có dữ liệu"

Bản 2.7 ghi mã 0 cho cả hai trường hợp: ngoài vùng (không có dữ liệu) và điểm ảnh có dữ liệu nhưng không quy đổi được sang chú giải
đã chọn, và không khai báo nodata trong tệp. Ví dụ bản đồ CTX 3 lớp xem theo chú giải chung 7 lớp: lớp "thực vật" không ứng với một
lớp chung nào (có thể là cây gỗ, cây trồng hay cỏ) nên bị ghi 0, lẫn với phần ngoài vùng; QGIS lại coi 0 là một giá trị bình thường.

Từ 2.8, mọi GeoTIFF bản đồ lớp (📊 Lớp phủ, 🧭 Phân loại, Δ Thay đổi):

- 255 = không có dữ liệu, khai báo bằng khoá GDAL_NODATA (QGIS tự để trong suốt);
- 254 = có dữ liệu nhưng không quy đổi được sang chú giải đã chọn (chỉ khi có);
- các lớp giữ đúng mã; bảng màu nhúng trong tệp;
- kèm tệp kiểu QGIS `.qml` cùng tên: để hai tệp chung thư mục, QGIS tự hiện đúng màu và tên lớp.

Ảnh số (độ lớn thay đổi, hệ số góc, R², Z) ghi Float32, nodata NaN. Hệ toạ độ EPSG:3857 như lưới tính trong trang.
Bản đồ phát hiện thay đổi dùng 0 cho "không đổi" (có nhãn trong QML) vì nodata đã là 255.

## 2. Δ Thay đổi: ba phương pháp

**Véc tơ thay đổi (CVA)**: như bản 2.6.

**IR-MAD** (Nielsen A.A., 2007, IEEE Transactions on Image Processing 16(2): 463-478, doi 10.1109/TIP.2006.888195): tương quan chính tắc
giữa các đặc trưng của hai năm, biến MAD là hiệu các biến chính tắc, thống kê χ² là tổng bình phương các biến MAD chuẩn hoá, trọng số
lặp là xác suất không đổi; lặp đến khi các hệ số tương quan chính tắc đổi dưới 0.0001 (tối đa 30 vòng). Không nhạy với khác biệt bức xạ
tuyến tính từng băng giữa hai năm nên không cần bước chuẩn hoá bức xạ. Trang dùng độ lớn √(χ²/p) để cùng thang với CVA; ngưỡng Otsu,
theo điểm mẫu, tự đặt, hoặc theo phân phối χ² (95, 99, 99.9 %).

Lưu ý đã kiểm chứng: trên dữ liệu mô phỏng hoàn toàn không đổi, sau khi lặp χ² trung bình ở chỗ không đổi lớn hơn số bậc tự do
(khoảng 13 so với 5), vì trọng số theo xác suất không đổi làm co phương sai ước lượng; ngưỡng χ² 99 % vì vậy báo nhầm nhiều (1900/5600
điểm ảnh không đổi trong bài thử), còn ngưỡng Otsu trên cùng dữ liệu báo nhầm 0/5600 và bắt 397/400 điểm ảnh thay đổi. Trang ghi rõ
điều này trong nhận định; cài đặt được đối chiếu với một bản tham chiếu viết bằng numpy (hệ số tương quan chính tắc khớp đến 4 chữ số).

**Hồi quy tuyến tính chỉ số theo năm (xu hướng)**, theo công cụ GEE ChuyenDoiXanh v6.11 và bài về Thủy Nguyên:

- hệ số góc a (chỉ số/năm) từng điểm ảnh, bằng OLS (kèm R²) hoặc Theil–Sen (kèm Z Mann–Kendall; tuỳ chọn tính điểm ảnh không có ý nghĩa là ổn định);
- 5 cấp: giảm mạnh, giảm nhẹ, ổn định (|a| ≤ ngưỡng nhẹ), tăng nhẹ, tăng mạnh;
- ngưỡng: theo mã GEE v6.11 (0.01 / 0.03), theo bài báo cho cặp năm liền kề (0.1 / 0.2), hoặc tự đặt;
- chỉ số: mọi chỉ số trong danh sách đang dùng (NDVI mặc định, thêm từ thư viện 248 chỉ số hoặc công thức tự nhập);
- bảng từng cặp năm liền kề (như bảng 5 của bài), biểu đồ tăng, giảm theo cặp, theo xã, CSV, GeoJSON, GeoTIFF, HTML, AI nhận định.

Khác với bài báo: bài dùng mọi cảnh Sentinel-2 không mây trong khoảng năm; trang dùng một ảnh tổng hợp mùa khô mỗi năm của bộ dữ liệu.
Với một cặp năm liền kề, hệ số góc là hiệu chỉ số giữa hai năm (R² = 1). Với Mann–Kendall, 3 năm chỉ cho |Z| tối đa 1.04 nên không bao giờ
đạt 95 %; cần nhiều năm hơn (trang báo lỗi khi dưới 3 năm).

## 3. 🖨 Xuất bản đồ

Ảnh JPEG hoặc PNG, 150, 300 hoặc 600 dpi, khổ A4 ngang, dọc, một cột (8.5 cm), hai cột (17.5 cm), trình chiếu 16:9 hoặc tự đặt.
Dựng lại đúng khung nhìn hiện tại (nới theo tỉ lệ khổ) với mọi lớp đang hiện và độ trong suốt của chúng, ở mức phóng hợp với độ phân giải in;
thêm lưới toạ độ (độ phút giây, độ thập phân WGS 84, hoặc UTM 48N mét), chú giải (bên phải hoặc trong khung), thước tỉ lệ kèm tỉ lệ số,
mũi tên bắc, tiêu đề, phụ đề, dòng nguồn (tự điền, sửa được). Tệp ghi sẵn dpi (JFIF, pHYs) nên Word, PowerPoint đặt đúng cỡ.
Ảnh nền phải cho phép tải chéo (CORS); lớp nào không lấy được sẽ bị bỏ và có thông báo.

## 4. Độ trong suốt, kéo giãn

- Bảng ảnh nền có mục "Độ trong suốt các lớp trên bản đồ" cho mọi lớp đang hiện (ảnh nền, nhãn, kết quả phân tích, vùng, ranh giới, điểm, OSM); nhớ theo trình duyệt.
- Kéo mép bảng điều khiển, cột phải, dải dưới bản đồ để đổi cỡ; nhấp đúp để về mặc định.
- Các bảng nổi (Thay đổi, Lớp phủ, Phân loại, Chọn vùng, Ảnh nền, OSM) kéo góc dưới phải để đổi cỡ; nhấp đúp thanh tiêu đề để về cỡ cũ.

## 5. Kiểm thử

`tests/t_xh_core.py` đối chiếu lõi toán với scipy, numpy, rasterio, Pillow (χ², erfc, Jacobi, IR-MAD, OLS, Theil–Sen, Mann–Kendall,
GeoTIFF, QML, dpi); `tests/t_v28_dom.js` chạy các chức năng trên trang với dữ liệu giả (thêm năm 2024 để thử xu hướng và cặp năm).
