# Geoportal 2.7: dữ liệu mới và cách dùng

## 1. Ranh giới hành chính Việt Nam (34 tỉnh, 3321 xã)

Ô Colab `colab/HF_VN_RANH_GIOI_cell.py` (CPU, 3 đến 5 phút):

- lấy riêng thư mục `json/geojson` của kho [thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database)
  (giấy phép MIT; ranh giới dẫn xuất từ Bản đồ tham khảo đơn vị hành chính Việt Nam, sapnhap.bando.com.vn; mã tỉnh, mã xã chính thức);
- giản lược (tỉnh 30 m, xã 5 m) rồi ghi lên bộ dữ liệu Hugging Face: `vn/tinh.geojson` (khoảng 1.2 MB), `vn/xa/<mã tỉnh>.geojson`
  (mỗi tỉnh 0.2 đến 3 MB, tổng khoảng 50 MB), `vn/danh_muc.json` (tên, mã, hộp bao để tìm kiếm, khoảng 0.2 MB) và mục `vn` trong manifest.

Trong trang, bảng ảnh nền có mục **Hành chính**: chọn tỉnh là nạp các xã của tỉnh đó cho tìm xã, chọn vùng, phát hiện thay đổi,
thống kê, phân loại; tìm xã, phường, tỉnh trên cả nước (gõ không dấu cũng được). Tỉnh của bộ dữ liệu ảnh (Hải Phòng, mã 31)
vẫn dùng ranh giới xã sẵn có (`ranh_gioi/xa.geojson`).

## 2. Bản đồ lớp phủ toàn cầu

Ô Colab `colab/HF_LULC_TG_cell.py` (cần dự án Google Earth Engine, điền `GEE_PROJECT`):

| sản phẩm | độ phân giải | năm | giấy phép |
|---|---|---|---|
| Dynamic World V1 (Google, WRI): nhãn trội mùa khô (tháng 11 năm trước đến tháng 4) | 10 m | 2016 trở đi | CC BY 4.0 |
| Esri / Impact Observatory 10 m Annual LULC | 10 m | 2017-2025 | CC BY 4.0 |
| ESA WorldCover v100, v200 | 10 m | 2020, 2021 | CC BY 4.0 |
| GLC_FCS30D (35 lớp) | 30 m | 2000-2022 | CC BY 4.0 |

Ảnh xuất theo đúng lưới UTM 48N của bộ dữ liệu, cắt theo ranh giới xã, đổi sang COG EPSG:3857, giữ **mã lớp gốc**
(Dynamic World lưu mã + 1). Manifest ghi tên lớp, màu, bảng quy đổi về chú giải chung 7 lớp (nước, cây gỗ, cây trồng, cỏ và cây bụi,
ngập nước có thực vật, xây dựng, đất trống) và hệ 3 lớp (thực vật, nước, xây dựng; như s2_globallc: thực vật ngập nước, rừng ngập
mặn, đất trống không gán vào ba lớp). Chạy lại ô thì chỉ xuất những năm còn thiếu.

## 3. Trong trang

- **📊 Lớp phủ**: chọn phương án (bản đồ của bộ dữ liệu, bản đồ toàn cầu, bản đồ tạo từ điểm mẫu, GeoTIFF của bạn), năm, phạm vi
  (khung nhìn, các xã, cả tỉnh, một vùng đã lưu), chú giải (gốc, chung 7 lớp, 3 lớp). Ra: diện tích theo năm, biểu đồ, theo xã, đồng
  thuận của hai bản đồ (tỉ lệ trùng khớp, kappa, bảng chéo, bản đồ trùng / khác), bảng quy đổi, CSV, GeoTIFF.
- **Nhập GeoTIFF bản đồ lớp**: WGS84, UTM (mọi múi), VN-2000 (UTM 48N, 49N: EPSG 3405, 3406; bản đồ theo múi 3° địa phương cần lưu lại sang một trong các hệ này)
  hoặc EPSG:3857; mỗi giá trị một lớp; đặt tên, màu, quy đổi (theo hệ lớp của trang, chú giải chung, 3 lớp) rồi lưu. Bản đồ tạo và nhập
  lưu trong trình duyệt và đi kèm tệp tiến độ.
- **🧭 Phân loại**: bản đồ lớp phủ từ điểm mẫu không cần học máy, trên các đặc trưng của công cụ chọn vùng. Phương pháp: cosine
  (trên đặc trưng đã trừ trung bình, chia độ lệch chuẩn trong phạm vi) với k mẫu gần nhất bỏ phiếu hoặc nguyên mẫu k-means từng lớp;
  khoảng cách chuẩn hoá 0..1 (đúng như công cụ chọn vùng hiện dùng) với mẫu gần nhất hoặc tâm lớp. Kèm kiểm định chéo và cảnh báo:
  vùng xa mọi mẫu (cần thêm mẫu, có nút thêm điểm tại chỗ), cặp lớp khó phân biệt, lớp có hai nhóm mẫu khác hẳn nhau (nên tách),
  mẫu nghi gán nhầm, lớp ít mẫu, lớp chiếm nhiều diện tích mà ít mẫu, xã chưa có mẫu, lớp bắt buộc chưa có mẫu.
- **Ảnh nền**: thêm Google (vệ tinh, vệ tinh có nhãn, bản đồ, địa hình) và OpenStreetMap; ô **nhãn** phủ tên địa danh, đường
  (Google hoặc Esri) lên mọi ảnh nền. Ảnh nền Google dùng theo điều khoản của Google.
- **Dải ảnh theo năm ở mọi nơi**: nguồn Sentinel-2 cloudless của EOX (ảnh tổng hợp năm 10 m, 2016-2025,
  CC BY-NC-SA 4.0, chỉ dùng phi thương mại) hoặc Esri Wayback; điểm ngoài vùng có ảnh của bộ dữ liệu thì dải tự chuyển sang EOX.
