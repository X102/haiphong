# Geoportal lớp phủ Hải Phòng

Trang web một tệp (`index.html`) để xem và gán nhãn lớp phủ đa năm (2017-2026) cho thành phố Hải Phòng mới:
ảnh Esri Wayback theo năm, ảnh Sentinel-2 mùa khô, PCA chuỗi năm, embedding, CTX, bản đồ lớp và OpenStreetMap.
Dữ liệu đọc thẳng từ bộ dữ liệu Hugging Face [`lopmaybay/haiphong-lop-tham-chieu`](https://huggingface.co/datasets/lopmaybay/haiphong-lop-tham-chieu)
theo từng đoạn (COG, FlatGeobuf), nên trang không cần máy chủ riêng.

Giao diện tiếng Việt, tiếng Nga, tiếng Anh (`?lang=ru`, `?lang=en`), dùng được trên điện thoại.

## Tính năng chính

- Gán nhãn từng điểm cho từng năm theo hệ 12 + 3 lớp (sang điểm mới thì tự về năm đầu tiên chưa gán); tạo bộ điểm mới (lưới, ngẫu nhiên, phân tầng theo bản đồ, từ OpenStreetMap) với các năm cần gán riêng.
- Ảnh nền Wayback theo năm đang gán; ô thiếu ảnh chi tiết được phóng to có nội suy từ ô cha của cùng bản phát hành, không còn ô trắng.
- Lớp đối chiếu: màu thật, B11-B8-B4, PCA chuỗi năm, PC1-5, embedding g7, bản đồ 3 lớp, và lớp S2 10 băng với tổ hợp màu, chỉ số, CTX tính trong trình duyệt.
- Đường mùa vụ 6 kỳ nhiều năm, đồ thị giá trị điểm ảnh theo năm (PC, embedding, S2, chỉ số, CTX) có đánh dấu năm lệch.
- Tra cứu nhanh: nhấp bất kỳ chỗ nào trên bản đồ để xem dải ảnh theo năm và đường mùa vụ tại đó, không cần tạo điểm.
- Chọn vùng nhiều lớp (điểm mẫu gắn lớp, các lớp cạnh tranh), xoá hoặc giữ mảng, sửa ranh giới; phạm vi theo xã có điểm mẫu hoặc xã chọn ở danh sách (nhóm xã đặt tên); điểm mẫu chỉ có hiệu lực trong xã của nó hoặc trong bán kính R; trừ chỗ đã lưu; chốt khu rồi làm khu khác.
- So sánh các năm: bảng, biểu đồ diện tích từng lớp theo năm, bản đồ vùng từng năm, được / mất, số năm thuộc lớp, năm bắt đầu thuộc lớp.
- Tìm xã, phường theo tên (không dấu cũng được); ẩn bảng điều khiển để rộng bản đồ; ẩn, hiện vùng đã lưu.
- Chỉ số: thư viện 248 chỉ số Sentinel-2 (Index DataBase) và công thức tự nhập, dùng cho lớp S2, đồ thị, đường mùa vụ, giá trị tại điểm, chọn vùng.
- Chuẩn hoá đa giác (làm trơn, vuông góc hoá, bám đường kênh OSM, xoá mảnh vụn), gán lại lớp, sửa vùng đã lưu ngay trên bản đồ; tự lưu điểm mẫu chọn vùng thành bộ điểm, gộp bộ; tệp tiến độ chứa cả phiên làm việc.
- DEM Copernicus GLO-30: độ cao, độ dốc, bóng địa hình; giá trị các lớp tại điểm khi nhấp bản đồ; đặc trưng chọn vùng gồm S2, chỉ số, CTX, PC, DEM.
- Hồi quy xu hướng chỉ số theo năm (OLS kèm R², Theil–Sen kèm Mann–Kendall; 5 cấp như công cụ GEE ChuyenDoiXanh; bảng từng cặp năm liền kề) và IR-MAD (Nielsen 2007) bên cạnh véc tơ thay đổi.
- Phát hiện thay đổi giữa hai năm (khung nhìn, các xã, một vùng đã lưu): chuẩn hoá bức xạ theo điểm ảnh ổn định, độ lớn thay đổi gộp 10 băng, chỉ số, CTX, PC, embedding; ngưỡng Otsu, theo điểm mẫu (tối ưu F1) hoặc tự đặt; loại thay đổi không cần mẫu (lớp sơ bộ từ chỉ số), theo điểm mẫu hoặc theo bản đồ lớp; nhận định, bảng, ma trận từ-đến, biểu đồ, CSV, GeoJSON, rải điểm kiểm tra.
- Trợ lý AI: DeepSeek, Yandex AI Studio, ProxyAPI, ChatGPT, Gemini, Claude, Grok, Ollama, LM Studio hoặc máy chủ tương thích OpenAI; khoá lưu mã hoá trong trình duyệt; gửi số liệu và ảnh của điểm để nhận mô tả, gợi ý nhãn, gán một chạm hoặc hàng loạt; nhận định kết quả phát hiện thay đổi; relay riêng miễn phí trên Google Apps Script (hoặc Hugging Face Space, cần gói PRO) để khỏi dùng VPN (xem `docs/AI_RELAY.md`).
- Tạo bản đồ lớp phủ từ điểm mẫu không cần học máy (cosine hoặc khoảng cách chuẩn hoá như công cụ chọn vùng; mẫu gần nhất, nguyên mẫu, tâm lớp), kiểm định chéo, cảnh báo chỗ cần thêm mẫu, cặp lớp lẫn, lớp nên tách, nhãn nghi sai, xã chưa có mẫu.
- Thống kê và so sánh lớp phủ: bản đồ của bộ dữ liệu, bản đồ toàn cầu (Dynamic World, Esri 10 m, ESA WorldCover, GLC_FCS30D), bản đồ tạo từ điểm mẫu, GeoTIFF của người dùng; chú giải gốc, chung 7 lớp hoặc 3 lớp; diện tích theo năm, theo xã, đồng thuận (kappa), CSV, GeoTIFF.
- Ranh giới 34 tỉnh, 3321 xã (từ 01/07/2025): chọn tỉnh, tìm xã trên cả nước; ảnh nền Google, OpenStreetMap, lớp nhãn; dải ảnh theo năm ở mọi nơi (Sentinel-2 cloudless của EOX, Esri Wayback).
- OpenStreetMap: xem, lọc bằng biểu thức, thống kê, sửa thẻ và hình (lưu trong trình duyệt, xuất GeoJSON), rải điểm mẫu trong đa giác.
- Liên kết ngoài theo điểm (Google Maps, Earth, Street View, Wayback, Copernicus, Bing, Yandex, OSM, Wikimapia, cổng quy hoạch Hải Phòng); nút báo lỗi.
- Tiến độ lưu tự động trong trình duyệt; xuất CSV, GeoJSON, tệp tiến độ JSON (nhập lại, gộp nhiều người).
- Xuất bản đồ thành ảnh JPEG, PNG 150 đến 600 dpi cho bài báo, trình chiếu: lưới toạ độ (độ phút giây, độ thập phân, UTM 48N), chú giải, thước tỉ lệ, mũi tên bắc, tiêu đề, dòng nguồn.
- GeoTIFF bản đồ lớp có nodata 255, bảng màu và tệp kiểu QGIS .qml; độ trong suốt cho mọi lớp đang hiện; kéo giãn cột, dải dưới bản đồ, các bảng nổi.
- Lưu kết quả thành tệp HTML tự chứa (phát hiện thay đổi, thống kê lớp phủ, phân loại, câu trả lời của trợ lý AI): số liệu, bảng, biểu đồ, bản đồ, nhận định.

## Cấu trúc kho

| thư mục, tệp | nội dung |
|---|---|
| `index.html` | trang đã dựng, là thứ được đăng lên web |
| `cau_hinh.json` | cấu hình web (xem dưới) |
| `src/` | mã nguồn trang: `tpl.html` (khung, CSS, lõi), `*_ui.js`, từ điển `i18n.json` và các tệp sinh từ điển |
| `tools/dung_trang.py` | dựng `index.html` từ `src/` |
| `tools/ai_relay/` | relay AI: `ai_relay_gas.gs` (Google Apps Script, miễn phí) và `ai_relay.py` (Python chuẩn, Docker cho Hugging Face Space hoặc VPS); `tools/tao_o_relay.py` sinh ô Colab `colab/HF_AI_RELAY_cell.py` |
| `tools/phuc_vu_cuc_bo.py` | máy chủ tĩnh cục bộ có HTTP Range, để thử trang với dữ liệu trên máy |
| `tests/` | bài thử jsdom trên dữ liệu giả (`mk_fixtures.py` tạo dữ liệu, `chay_het.sh` chạy tất cả) |
| `colab/` | ô và notebook Colab dựng dữ liệu rồi đẩy lên Hugging Face |
| `docs/TRIEN_KHAI.md` | hướng dẫn đưa lên GitHub Pages và cập nhật |
| `docs/DU_LIEU_2_7.md` | ranh giới Việt Nam, bản đồ lớp phủ toàn cầu (ô Colab, dùng lại ảnh GL_* trên Drive không cần GEE), thống kê, phân loại, ảnh nền mới, thay đổi 2.7.1 |
| `docs/BAN_2_8.md` | GeoTIFF có nodata, hồi quy xu hướng, IR-MAD, xuất bản đồ in ấn, độ trong suốt, kéo giãn bảng |
| `docs/AI_RELAY.md` | trợ lý AI: chọn nhà cung cấp, dựng relay không cần VPN, cách lưu khoá, dữ liệu gửi đi |

## Cấu hình web (`cau_hinh.json`)

| khoá | ý nghĩa |
|---|---|
| `hf_repo`, `hf_rev` | bộ dữ liệu **Hugging Face** và nhánh mặc định (không phải kho GitHub; người dùng vẫn đổi được trong Cài đặt) |
| `nam_can_gan` | các năm cần gán mặc định |
| `bao_loi.email` | địa chỉ nhận báo lỗi; để trống thì nút báo lỗi chỉ cho chép nội dung |
| `gioi_thieu` | tác giả (vi, ru, en), email liên hệ, đơn vị, hiện trong hộp Giới thiệu |
| `bao_loi.github` | `tài-khoản/kho` để hiện thêm nút tạo issue trên GitHub (tuỳ chọn) |
| `overpass` | máy chủ Overpass cho OSM trực tiếp |

Địa chỉ email đặt ở đây sẽ công khai trong trang; nên dùng một hộp thư riêng cho báo lỗi.

## Đăng lên GitHub Pages

Xem `docs/TRIEN_KHAI.md`. Tóm tắt: tạo kho, đẩy thư mục này lên nhánh `main`, vào Settings, Pages, chọn
Source: Deploy from a branch, `main`, `/ (root)`. Quy trình `.github/workflows/trang-web.yml` (chỉ đăng `index.html` và
`cau_hinh.json`) là cách thay thế, mặc định chỉ chạy khi bấm tay.

## Phát triển

```bash
python tools/dung_trang.py                    # dựng lại index.html sau khi sửa src/
cd src && python trich_khoa.py && python gen_i18n.py && cd ..   # sau khi thêm câu cần dịch
bash tests/chay_het.sh                        # bài thử; cần node và các gói ghi ở đầu tệp
```

## Nguồn dữ liệu và ghi công

- Ảnh Sentinel-2: Contains modified Copernicus Sentinel data (2017-2026), xử lý trên Google Earth Engine.
- Ảnh nền: Esri World Imagery, Esri Wayback.
- OpenStreetMap: © OpenStreetMap contributors, giấy phép ODbL 1.0.
- Ranh giới hành chính: thanglequoc/vietnamese-provinces-database (MIT), dẫn xuất từ Bản đồ tham khảo đơn vị hành chính Việt Nam (sapnhap.bando.com.vn).
- Lớp phủ toàn cầu (CC BY 4.0): Dynamic World V1 (Google, WRI), Esri / Impact Observatory 10 m Annual LULC, ESA WorldCover 2020, 2021, GLC_FCS30D (Zhang và cs. 2024).
- Sentinel-2 cloudless 2016-2025 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data), CC BY-NC-SA 4.0: chỉ dùng phi thương mại. Ảnh nền Google dùng theo điều khoản của Google.
- DEM: © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.
  The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30.
- Danh sách chỉ số: Index DataBase (IDB), theo tệp tổng hợp của tác giả.
- Hệ thống lớp, điểm kiểm định và các lớp dẫn xuất: luận án của Phạm Đăng Hiển (MIIGAiK).

## Giấy phép

Mã nguồn theo giấy phép MIT (tệp `LICENSE`). Dữ liệu theo giấy phép của từng nguồn ở trên.
