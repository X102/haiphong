# Geoportal lớp phủ Hải Phòng: bản 2.9 (01.10.2026)

## 1. Lỗi "Cannot read properties of undefined (reading 'offset')" khi phát hiện thay đổi cả tỉnh

- **Nguyên nhân.** Thư viện geotiff.js 2.1.3 (hàm `BlockedSource.readSliceData`) đòi thêm một khối 64 KiB không được tải khi đoạn byte của một ô COG kết thúc đúng biên khối. Với một ô, lỗi rất hiếm. Khi đọc cả tỉnh, trang đọc hàng nghìn ô nên gần như chắc gặp.
- **Bản vá.** Mỗi tệp COG mở ra được vá riêng (`vaGeoTIFF`): khối cuối tính bằng `floor((top - 1) / blockSize)`. Trong bài thử, 6 lát cắt (có lát kết thúc đúng biên khối) trùng từng byte với yêu cầu HTTP Range. Thư viện chưa vá báo đúng lỗi của anh.
- **Cửa sổ lớn.** Cửa sổ lớn đọc theo dải bằng chiều cao ô và cho kết quả trùng khi đọc một lần. Nếu cửa sổ vượt 60 triệu giá trị, trang báo "vùng đọc quá lớn" thay vì treo trình duyệt.
- **PC cả tỉnh.** Lớp PC gốc (pc5d, 10 m) không có overview. Khi ô lưới phân tích thô hơn 30 m (ví dụ cả tỉnh), trang đọc các lớp xám PC1..PCk (có overview) rồi giải mã 8 bit. Trên dữ liệu thử, sai khác trung bình so với PC gốc là 0.012, trong khi bước lượng tử là 0.024.

## 2. Xuất bản đồ (🖨)

- **Chọn bản đồ cần xuất.** Có các lựa chọn: như màn hình, phân loại, thay đổi, xu hướng, bản đồ lớp phủ (thống kê), kết quả chọn vùng, hoặc một lớp dữ liệu (CTX, WorldCover, S2, DEM…). Khi chọn một kết quả, các lớp khác tắt sẵn nên không còn bản đồ "hỗn hợp" như ảnh `ban_do_test_2_300dpi`.
- **Quản lý lớp ngay trong hộp thoại.** Mỗi lớp có bật tắt, độ trong suốt, năm (với lớp dữ liệu), cách xem (với kết quả: loại thay đổi, lớp năm sau, độ lớn…) và thứ tự (▲ ▼). Mọi thay đổi ở đây không đổi bản đồ đang xem.
- **Khung.** Có bốn cách: khung nhìn, vừa phạm vi kết quả, cả tỉnh, hoặc vùng (đang chọn hay đã lưu). Có thể **cắt theo ranh giới**: dữ liệu và kết quả chỉ vẽ trong ranh giới, đường ranh giới được vẽ đậm.
- **Chú giải kèm số liệu.** Có các lựa chọn: không, ha, km², %, ha và %. Diện tích đếm trên đúng các điểm ảnh của kết quả nằm trong khung (hoặc trong ranh giới cắt), kèm dòng ghi tổng diện tích có dữ liệu. Với lớp dữ liệu dạng lớp, trang đọc lại COG trong khung ở khoảng 1/1200 cạnh khung. Khi khung vừa phạm vi kết quả, diện tích trong chú giải bằng đúng bảng kết quả (bài thử so từng loại).
- **Định dạng có toạ độ.**
  - GeoTIFF khung bản đồ: 4 băng RGBA, EPSG:3857.
  - PDF có toạ độ: trang là ảnh, khung bản đồ khai báo theo ISO 32000 (Viewport + Measure GEO, EPSG:3857).
  - JPEG, PNG kèm world file (.jgw, .pgw), .prj, .aux.xml trong một ZIP.
- **Cách đã kiểm các định dạng.**
  - GeoTIFF và ZIP: GDAL (rasterio) đọc ra đúng EPSG:3857 và đúng phép affine.
  - PDF: kiểm theo cách GDAL đọc (bằng `tests/kiem_geopdf.py`, dùng pyproj). Góc khung trùng khung dựng đến dưới 1 mm; MuPDF hiển thị đúng trang.
  - **Chưa kiểm PDF bằng QGIS hay Avenza.** Bản GDAL trong máy thử không có bộ đọc PDF, nên anh mở thử một tệp PDF trong QGIS giúp em.

## 3. Báo cáo HTML

Bản đồ trong báo cáo (thay đổi, xu hướng, thống kê lớp phủ, phân loại, vùng) nay dựng như bản in:
- có khung, lưới kinh vĩ độ, mũi tên bắc, thước tỉ lệ và tỉ lệ số;
- có chú giải kèm ha và % và dòng nguồn;
- là bản đồ chuyên đề: kết quả và ranh giới, không có ảnh nền.

## 4. Xuất mọi sản phẩm

- **Chọn vùng.** Thẻ "Lưu" có dòng "Xuất vùng này". Danh sách vùng đã lưu có ô "⤓ xuất" cho từng vùng. Các định dạng:
  - HTML: thông số, diện tích, theo xã, thành phần lớp phủ, bản đồ;
  - GeoTIFF mặt nạ: 1 = vùng, 255 = ngoài vùng, kèm .qml;
  - GeoJSON: một vùng, đủ thuộc tính;
  - Bản đồ…: mở hộp thoại xuất với khung theo vùng và cắt theo ranh giới.
- **Biểu đồ.** Rê chuột lên một biểu đồ (đường mùa vụ, thay đổi, xu hướng, thống kê, so sánh các năm) sẽ hiện nút SVG và PNG 300 dpi.
- **Dải ảnh theo năm.** Nút PNG gộp cả dải thành một ảnh có nhãn năm, mã điểm và toạ độ.

**Rà soát sản phẩm và định dạng xuất:**

| Sản phẩm | Định dạng |
|---|---|
| điểm, nhãn | CSV dài, CSV rộng, GeoJSON, tệp tiến độ |
| chọn vùng | HTML, GeoTIFF, GeoJSON, bản đồ (mới); vùng đã lưu GeoJSON, CSV |
| so sánh các năm | CSV, biểu đồ SVG/PNG (mới), bản đồ |
| phát hiện thay đổi, xu hướng | HTML, CSV, GeoJSON, GeoTIFF, bản đồ, biểu đồ |
| thống kê lớp phủ | HTML, CSV, GeoTIFF, bản đồ, biểu đồ |
| phân loại | HTML, CSV, GeoJSON, GeoTIFF, bản đồ; lưu thành phương án |
| trợ lý AI | HTML, CSV |
| OSM đã sửa | GeoJSON |
| đường mùa vụ | SVG/PNG (mới) |
| dải ảnh | PNG (mới) |

## 5. Gộp nhiều tệp tiến độ

- **Mở hộp thoại gộp.** Có hai cách:
  - "Tải tệp…" chọn được nhiều tệp cùng lúc; nếu đều là JSON, trang mở hộp thoại gộp;
  - "Xuất… → Gộp nhiều tệp tiến độ…".
- **Hộp thoại.** Hộp thoại liệt kê từng tệp (thời điểm xuất, số điểm, nhãn, vùng); tệp hỏng được báo riêng.
- **Phần được gộp.** Điểm, nhãn, vùng mẫu, bộ điểm, chỉ số tự nhập, khu, nhóm xã, sửa OSM. Điểm trùng mã được coi là một điểm.
- **Nhãn khác nhau** giữa các tệp (cùng điểm, cùng năm) giải theo một trong ba cách:
  - nhãn gán sau cùng (theo thời điểm gán ghi trong tệp);
  - tệp chọn sau thắng;
  - giữ nhãn đang có.
- **Sau khi gộp.** Các điểm có nhãn khác nhau được đánh dấu "xem lại" và liệt kê trong bảng. Bảng tải được thành CSV, mỗi tệp một dòng, có cột "đã chọn".

## 6. Kiểm thử

- **Bài thử mới** `tests/t_v29_dom.js` gồm các phần:
  - bản vá geotiff.js và đọc theo dải;
  - PC lưới thô;
  - thay đổi cả tỉnh đủ bốn nhóm đặc trưng;
  - xuất bản đồ (chọn nội dung, quản lý lớp, diện tích, ZIP, GeoTIFF, PDF);
  - xuất vùng, biểu đồ, dải ảnh;
  - gộp tệp (ba cách giải);
  - tiếng Nga, tiếng Anh.
- **Kết quả.** 25 bộ kiểm thử đều đạt: 21 bộ node, jsdom và 4 bộ Python.
- **Kiểm trong Chromium** (canvas thật): hộp thoại, bản đồ 300 dpi, PDF, GeoTIFF, báo cáo HTML, xuất vùng.
- **Tệp mới trong thư mục thử:** `tests/mk_fx29.py` (dữ liệu thử PC trơn) và `tests/kiem_geopdf.py` (cần `pip install pymupdf`).
