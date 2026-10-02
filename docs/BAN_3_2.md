# Geoportal lớp phủ Hải Phòng: bản 3.2 (01.10.2026): S2 trực tuyến đổi băng, một cảnh, chuỗi tại điểm, ảnh đã xem khi gán

## Sửa lỗi

### "không đọc được: Request failed"
Dòng giá trị tại điểm của lớp S2 trực tuyến báo lỗi này. Nguyên nhân là bảng giá trị chung đã đọc lớp đó như một tệp COG trên Hugging Face, mà lớp này không có tệp như vậy.

Từ bản này, lớp S2 trực tuyến chỉ còn dòng riêng của nó.

### Ô 2017 trắng ở dải ảnh EOX
Em đã kiểm tra trực tiếp máy chủ EOX ngày 01.10.2026, tại Trường Lâm (Thanh Hoá) và tại Hải Phòng:

| lớp | các mức phóng | ô trả về |
|---|---|---|
| `s2cloudless-2017` | 10, 11 | gần như trắng (độ sáng trung bình 228 đến 247 / 255) |
| `s2cloudless-2017` | 12 đến 14 | trắng hẳn (255) |
| `s2cloudless-2016` và `s2cloudless-2018` | mọi mức thử | ảnh bình thường |

Như vậy, ở các chỗ đã thử, bản EOX 2017 không có ảnh. Lỗi không nằm ở trang.

Trang nay xử lý như sau:

- ô trắng được đánh dấu "EOX không có ảnh năm này ở đây", thay vì để trắng;
- khi điểm nằm ngoài vùng có dữ liệu sẵn nhưng trong vùng của kế hoạch S2 trực tuyến, dải ảnh tự dùng S2 trực tuyến. S2 trực tuyến có đủ năm 2017.

## Đổi băng, xem một cảnh
- **Tổ hợp màu** có thêm "tuỳ chọn R-G-B": chọn ba băng bất kỳ trong 10 băng.
- **Nguồn ảnh** của lớp:
  - **ảnh ghép trung vị** các cảnh đã chọn, bỏ mây theo lớp phân loại mây SCL;
  - **một cảnh**: chọn ngày trong danh sách các cảnh của năm. Danh sách ghi ngày, mây cả cảnh, % quang đãng trong phạm vi, và đánh dấu ★ cảnh đã ghép.

  Chế độ một cảnh hiện đúng ảnh của ngày đó, kể cả mây, để biết nhãn được lấy trên ảnh nào.
- **Giá trị tại điểm** (nút "đọc 10 băng"):
  - trung vị 10 băng của các cảnh đã ghép mà quang đãng đúng tại điểm;
  - các chỉ số;
  - danh sách cảnh, mỗi cảnh ghi ✓ quang đãng hoặc ✗ mây, bóng mây, mây ti... theo SCL;
  - cảnh không thuộc ảnh ghép có dấu *.

## Chuỗi tại điểm: theo năm và theo cảnh
Đồ thị "theo năm" có hai nhóm mới: "S2 trực tuyến: chỉ số" và "S2 trực tuyến: 10 băng".

Ở điểm chỉ có ảnh S2 trực tuyến, khung đồ thị có nút chuyển thẳng sang đồ thị này.

**Điểm lớn** của mỗi năm là trung vị các cảnh đã ghép quang đãng tại điểm.

- Nếu mọi cảnh đã ghép đều mây đúng tại điểm, trang đọc lớp SCL của các cảnh ứng viên (rẻ), theo thứ tự quang đãng giảm dần, rồi lấy cảnh quang đãng đầu tiên. Điểm đó vẽ bằng vòng đứt, và chú giải ghi ngày cảnh thay.
- Vì vậy năm nào có ít nhất một cảnh quang đãng tại điểm thì đều có giá trị. Năm không có cảnh nào quang đãng thì được liệt kê riêng.

**Chấm nhỏ** là từng cảnh, đặt theo ngày trong khoảng tháng của năm, để thấy điểm đổi ngay trong một năm:

- chấm đặc: cảnh đã ghép;
- chấm rỗng: cảnh ứng viên (khi bật "đồ thị: cả cảnh ứng viên");
- ×: cảnh mây tại điểm.

**Tải xuống**: "CSV từng cảnh tại điểm" gồm năm, ngày, mã cảnh, đã ghép, quang đãng, SCL và giá trị.

**Dung lượng**:

- Mặc định đồ thị đọc ở 20 m, tức tầng thu nhỏ của ảnh 10 m. Mỗi băng của mỗi cảnh khoảng 0.35 đến 0.4 MB, so với 1.3 đến 1.5 MB ở 10 m.
- Bật "đồ thị đọc 10 m" để đọc đúng điểm ảnh.
- Lần đầu chỉ hiện và đọc NDVI (với nhóm 10 băng là B4, B8, B11). Bấm tên trong chú giải để thêm đường; trang chỉ đọc thêm băng cần cho đường đó.

**Kiểm trên dữ liệu thật** (01.10.2026): điểm gần Trường Lâm (Thanh Hoá), tháng 1 đến 4, các năm 2017 đến 2026:

- năm nào cũng có NDVI tại điểm, không năm nào phải dùng cảnh thay;
- lập kế hoạch cảnh 1.1 đến 3.3 s mỗi năm;
- đọc điểm 0.5 đến 0.8 s mỗi năm;
- cả 10 năm hết 27 s.

## Ghi ảnh đã xem khi gán nhãn
Mỗi lần gán nhãn cho một điểm, trong một năm, trang ghi lại ảnh đang xem:

- **S2 trực tuyến**:
  - kiểu ảnh: ảnh ghép hay một cảnh;
  - mã và ngày từng cảnh;
  - bộ dữ liệu, che mây;
  - từng cảnh quang đãng hay mây đúng tại điểm. Trang đọc lớp SCL ngay sau khi gán nên điểm mây được đánh dấu "(mây)".
- **Ảnh nền**: bản phát hành Wayback của năm, hoặc tên ảnh nền.
- **Các lớp đang bật**.

Thông tin này nằm ở những chỗ sau:

- cột "ảnh đã xem khi gán" trong bảng các năm của điểm;
- cột `anh` (CSV dạng dài) và `anh_<năm>` (CSV dạng rộng), ví dụ `s2o:ghep:2024-01-10+2024-02-15(mây); wayback:2024-08-15`;
- tệp tiến độ JSON (đầy đủ).

Khi gộp tiến độ, ảnh đã xem đi cùng nhãn được giữ. Xoá nhãn thì xoá luôn thông tin này.

Vì một điểm có thể đổi ngay trong năm, nên gán trên **một cảnh** khi cần chặt chẽ. Cách này ghi đúng ngày của ảnh làm căn cứ. Đồ thị theo cảnh cho biết ngày nào điểm bắt đầu đổi.

## Mã nguồn

| tệp | thay đổi |
|---|---|
| `src/v32_ui.js` (mới) | R-G-B tuỳ chọn, một cảnh; đọc từng cảnh tại điểm; nhóm đồ thị S2 trực tuyến; ghi ảnh đã xem |
| `src/v24_ui.js` | bảng giá trị tại điểm bỏ qua lớp `s2o` (sửa "Request failed") |
| `src/v27_ui.js` | dải ảnh: ô trắng EOX, tự dùng S2 trực tuyến trong vùng kế hoạch |
| `src/v31_ui.js` | nút "đọc 10 băng" dùng bộ đọc theo cảnh |
| `src/tpl.html` | bản 3.2; cột `anh` trong CSV và khi gộp tiến độ; mục trợ giúp |
| `src/gen_i18n_v32.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `v32_ui.js` |

## Kiểm thử
`tests/t_v32_dom.js` (jsdom) chạy trên dữ liệu giả `tests/mk_fx31.py`. Bài thử kiểm:

- **Lỗi đã sửa**:
  - không còn dòng "Request failed";
  - nhận ra ô EOX trắng;
  - dải ảnh tự dùng S2 trực tuyến trong vùng kế hoạch, ngoài vùng vẫn dùng EOX.
- **Đổi băng và một cảnh**:
  - R-G-B tuỳ chọn đúng kéo giãn;
  - một cảnh hiện đúng ảnh ngày chọn, kể cả mây;
  - danh sách cảnh theo ngày.
- **Giá trị tại điểm**: ghi đúng cảnh mây, cảnh quang đãng.
- **Đồ thị**:
  - NDVI theo năm đúng công thức;
  - năm có cảnh đã ghép bị mây vẫn có giá trị nhờ cảnh thay;
  - cảnh ứng viên mây hiện ×;
  - nút sang đồ thị; CSV từng cảnh.
- **Ảnh đã xem khi gán**:
  - ghi đúng cảnh, ngày, Wayback, quang đãng;
  - CSV dài và rộng; gộp tiến độ; xoá nhãn.
- **Dịch**: tiếng Nga.

Toàn bộ bài thử cũ vẫn đạt. Chromium: chụp lớp một cảnh với R-G-B tuỳ chọn.

## Bản 3.2.1 (02.10.2026): nhẹ và mượt hơn
Đo trên trang thật (x102.github.io/haiphong), vẽ 12 ô CTX 15 × 15 ở mức 14:

| | trước | sau |
|---|---|---|
| tác vụ dài làm đứng trang | 1 lần, 1 443 ms | không có |
| thời gian vẽ xong 12 ô | 5.5 s | 4.4 s |

Thay đổi:

- **Giải nén ô ảnh trong luồng phụ.** Ô COG (deflate) được giải nén bằng Web Worker (GeoTIFF Pool, tối đa 4 luồng), không còn làm đứng luồng chính khi kéo, phóng bản đồ. Không tạo được luồng phụ thì trang tự quay về cách cũ.
- **Giới hạn bộ nhớ đệm:**
  - lớp bản đồ giữ tối đa 32 tệp COG mở, bộ đệm mỗi tệp 240 khối (khoảng 15 MB);
  - phân tích giữ tối đa 12 tệp;
  - S2 trực tuyến giữ tối đa 40 tệp, mỗi tệp 96 khối.

  Tệp dùng lâu nhất bị bỏ trước, nên bộ nhớ không phình mãi khi xem nhiều năm, nhiều lớp.
- **Các lớp tính trong trình duyệt** (S2 10 băng, CTX, chỉ số, Landsat, DEM, S2 trực tuyến, COG) không tính ô trong lúc đang phóng, và chỉ giữ 1 hàng ô ngoài khung nhìn.
- **Tô chỉ số không tạo mảng mới cho từng điểm ảnh**, đỡ việc dọn bộ nhớ.
