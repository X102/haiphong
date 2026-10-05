# Geoportal lớp phủ Hải Phòng: bản 3.5 (06.10.2026): lấy mẫu nhanh

Bản này có ba thay đổi để gán được nhiều điểm hơn mỗi ngày:

1. ít phải chờ tải hơn (nạp trước, giữ lại ảnh đã vẽ);
2. gợi ý lớp ngay tại điểm;
3. chế độ lưới để gán nhiều điểm một lúc.

## 1. Nạp trước và giữ ảnh đã vẽ

**Giữ ảnh dải đã vẽ.** Trước đây, mỗi lần gán nhãn (trang tự sang năm sau) thì dải ảnh 10 năm được vẽ lại và đọc lại ảnh.

Nay khung ảnh nào đã vẽ thì được giữ, vẽ lại ngay, không đọc lại. Điều này áp dụng cho:

- S2 10 băng có sẵn;
- Landsat có sẵn;
- EOX, Wayback;
- ảnh trực tuyến (S2, Landsat, Sentinel-1).

Đổi cách xem (tổ hợp màu, chỉ số, kế hoạch cảnh) thì vẽ mới. Bộ nhớ tối đa khoảng 48 MB; khung dùng lâu nhất bị bỏ trước.

**Nạp trước** (ô cạnh nút ‹ ›; tắt, 1, 2 hoặc 3 điểm; mặc định 2). Khoảng 1.5 giây sau khi mở một điểm, trang đọc sẵn cho các điểm kế tiếp (theo chiều anh đang đi, `n` hay `p`):

- dải ảnh mọi năm, đúng nguồn, khung và cỡ đang chọn;
- đồ thị theo năm đang xem, hoặc dữ liệu đường mùa vụ;
- dải bản đồ lớp dưới đồ thị;
- đặc trưng để gợi ý lớp;
- ô ảnh nền Wayback quanh điểm, ở mức phóng sẽ dùng.

Dấu ⚡2/2 cho biết đã nạp xong bao nhiêu điểm. Đổi điểm giữa chừng thì việc dở được dùng lại, không đọc lại.

## 2. Gợi ý lớp tại chỗ

**Cách làm.** Dưới các nút lớp có dòng **Gợi ý**. Đó là lớp của 7 láng giềng gần nhất trong các mẫu đã gán (điểm × năm), có trọng số theo khoảng cách, kèm độ tin. Nút lớp được gợi ý có viền đứt. **Enter** để nhận.

**Đặc trưng theo năm tại điểm**, tự chọn theo dữ liệu có ở điểm đó:

- trong vùng có dữ liệu sẵn: embedding, PC, S2 10 băng, Landsat có sẵn (chuẩn hoá z từng chiều);
- ngoài vùng đó, theo kế hoạch cảnh trực tuyến đang dùng:
  - S2 hoặc Landsat: 6 băng + NDVI, MNDWI, NDBI, trung vị các cảnh quang đãng tại điểm;
  - Sentinel-1: VV, VH, VV−VH (dB).

Đặc trưng lưu trong trình duyệt (IndexedDB), giữ qua các lần mở trang.

**Nguyên tắc** để gợi ý không làm sai số liệu:

- **Không dùng chính điểm đang xem** (kể cả các năm khác của nó). Gợi ý là bằng chứng độc lập, không phải chép năm trước.
- Lớp U, M không vào tập mẫu.
- Chỉ so các điểm cùng loại đặc trưng.
- Cần ít nhất 10 mẫu mới hiện gợi ý.
- Các điểm đã gán trước bản này chưa có đặc trưng. Nút "thêm N điểm đã gán vào mẫu" đọc đặc trưng cho chúng (chạy nền).

**Độ đúng của gợi ý**:

- **Kiểm chéo bỏ điểm**: đoán lại các mẫu đã gán mà không dùng điểm của chính mẫu đó. Kết quả hiện ngay dưới gợi ý.
- **Gán mù**: 10 % điểm (chỉnh được, cố định theo mã điểm) không hiện gợi ý. Gợi ý vẫn được tính ngầm. Độ đúng trên các điểm này là ước lượng không bị gợi ý dẫn dắt người gán. Nên báo con số này khi viết về quy trình lấy mẫu.

**Ghi lại cho từng nhãn**: gợi ý lúc gán, độ tin, điểm mù hay không, có nhận gợi ý không. Trong CSV dạng dài là các cột:

| cột | nội dung |
|---|---|
| `goi_y_knn` | lớp được gợi ý lúc gán |
| `tin_goi_y` | độ tin của gợi ý |
| `gan_mu` | 1 nếu là điểm gán mù |
| `nhan_tu_goi_y` | 1 nếu nhận gợi ý |

Nếu nhãn sau đó bị đổi bằng cách khác (điền về sau, xoá) thì các cột này để trống. Khi gộp tiến độ, thông tin này đi cùng nhãn.

## 3. Chế độ lưới

Mở bằng nút **▦ Lưới** hoặc phím **l**.

**Hiển thị**:

- nhiều điểm cùng năm trên một màn (24 đến 96 ô một trang), ảnh theo nguồn dải ảnh đang chọn;
- khung 100 m đến 1 km, ô nhỏ, vừa hoặc lớn;
- mỗi ô ghi mã điểm, nhãn đã gán, gợi ý và độ tin (🙈 là điểm gán mù);
- lọc "chưa gán năm này" hoặc mọi điểm; xếp theo lớp gợi ý để các ô cùng loại nằm cạnh nhau.

**Thao tác**:

| thao tác | tác dụng |
|---|---|
| nhấp | chọn ô |
| Shift + nhấp | chọn một dải ô |
| Ctrl + A | chọn cả trang |
| Esc | bỏ chọn; bấm lần nữa để đóng |
| phím lớp | gán cho các ô đã chọn |
| Enter | nhận gợi ý: cho các ô đã chọn, hoặc nếu không chọn ô nào thì cho mọi ô chưa gán có độ tin ≥ ngưỡng (mặc định 0.6); điểm gán mù không bao giờ được nhận tự động |
| Backspace | xoá nhãn ô đã chọn |
| nhấp đúp | mở điểm ở chế độ thường |
| `n`, `p` | sang trang (với lọc "chưa gán", các điểm vừa gán rời khỏi danh sách) |
| ←, → | đổi năm |

Tuỳ chọn **điền các năm sau**: gán xong thì điền nhãn đó cho các năm sau còn trống của điểm.

Nhãn gán trên lưới ghi nguồn ảnh như khi gán thường, thêm chữ `luoi`. Trang tự nạp trước ảnh và đặc trưng của trang sau.

**Cách dùng gợi ý**: xem lưới đã xếp theo gợi ý; chọn các ô sai, sửa bằng phím lớp; rồi Enter để nhận phần còn lại.

## Kiểm thử

`tests/t_v35_dom.js` (jsdom) kiểm:

- vẽ lại dải không đọc lại ảnh; bộ nhớ có giới hạn;
- nạp trước 2 điểm theo cả chiều tới và chiều lùi; sang điểm sau thì dùng bản đã nạp;
- đặc trưng thật từ dữ liệu có sẵn (19 chiều);
- kNN trên hai cụm, không dùng chính điểm, thiếu chiều vẫn đoán;
- dòng gợi ý; Enter nhận; gán khác gợi ý;
- gán mù: ẩn gợi ý, vẫn ghi, đếm độ đúng;
- cột xuất; gộp; bỏ U, M;
- lưới: mở bằng `l`, chọn ô, phím lớp, Enter theo ngưỡng, Ctrl+A, Esc, Backspace, đổi năm, sang trang, nhấp đúp, đóng;
- bản dịch tiếng Nga.

Toàn bộ bài thử cũ vẫn đạt.

Chưa đo được trên trang thật: sandbox không tải được Chromium, nên chưa có số đo thời gian sang điểm có và không có nạp trước. Bố cục lưới đã xem bằng ảnh chụp bản dựng thử.

## Mã nguồn

| tệp | thay đổi |
|---|---|
| `src/v35_ui.js` (mới) | bộ nhớ ảnh dải, nạp trước, gợi ý kNN, gán mù, chế độ lưới |
| `src/tpl.html` | bản 3.5; ô nạp trước, nút lưới, dòng gợi ý, bảng lưới, CSS; CORE: cột gợi ý trong CSV dài, gộp mang theo gợi ý; trợ giúp |
| `src/gen_i18n_v35.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `v35_ui.js` |
