# Geoportal lớp phủ Hải Phòng: bản 3.6 (06.10.2026): S2 trực tuyến ở Hải Phòng, nạp trước nhiều điểm, đường mùa vụ S2 + S1

## 1. Vì sao S2 trực tuyến chậm ở Hải Phòng

### Đo trên trang thật (06.10.2026)
Trang x102.github.io/haiphong bản 3.5, kế hoạch cảnh tháng 1 đến 4 năm 2024, khung 106.60–106.76° E, 20.80–20.92° N.

**Kế hoạch cảnh**: 6 cảnh ứng viên (ô MGRS 48QXJ), và cả 6 đều được chọn.

Lý do là mùa xuân Hải Phòng nhiều mây: muốn mỗi điểm ảnh có đủ 3 lần quang đãng thì phải ghép nhiều cảnh. Có những ô bản đồ mà 3 trong 6 cảnh là mây kín.

**Một ô bản đồ 256 × 256**, lần đầu (chưa có gì trong bộ nhớ):

| mức phóng | S2 trực tuyến, màu thật ESA | S2 trực tuyến, 8-4-3 | lớp S2 10 băng có sẵn |
|---|---|---|---|
| 12 | 7.1 s | 6.7 s | (đã có trong bộ nhớ) |
| 14 | 1.3 s | **23.7 s** | 0.12 s |
| 16 | 0.8 s | 1.4 s | 0.08 s |

Ở một ô mức 14, chỉ riêng tổ hợp 8-4-3 đã tải về khoảng **10–15 MB** qua khoảng 20 yêu cầu tới kho AWS ở Mỹ (us-west-2).

### Nguyên nhân
Với tổ hợp băng, mỗi cảnh cần 4 tệp: 3 băng và lớp mây SCL. 6 cảnh là 24 tệp.

Mỗi tệp COG chia khối 1024 × 1024 điểm ảnh, nên muốn có một ô bản đồ thì phải tải nguyên các khối đó. Trình duyệt chỉ mở tối đa 6 kết nối cùng lúc tới một máy chủ.

Màu thật ESA (TCI) nhanh hơn nhiều vì mỗi cảnh chỉ có 1 tệp 8 bit.

Lớp **S2 10 băng có sẵn** đã được ghép sẵn và nằm trên máy chủ gần (Hugging Face), nên nhanh hơn S2 trực tuyến 10 đến 100 lần.

### Đã làm

- **Không đọc băng của cảnh vô ích ở ô đang vẽ.** Khi có che mây, trang đọc lớp mây của mọi cảnh trước (lớp này nhỏ, 20 m). Sau đó chỉ đọc băng của những cảnh còn góp điểm ảnh quang đãng cho ô:
  - cảnh mây kín ở ô thì bỏ;
  - cảnh chỉ góp cho những điểm ảnh đã đủ số lần quang đãng thì cũng bỏ.

  Trên trang thật, ở ô gần 106.68° E, mức 14, trang chỉ đọc băng của 3 trong 6 cảnh. Ở ô khác là 4 trong 6. Ảnh ghép tại các điểm ảnh còn thiếu lần quang đãng không đổi.

  Thời gian đo được dao động theo các khối đã có sẵn trong bộ nhớ, nên em không đưa ra một con số "nhanh hơn bao nhiêu lần".
- **Nhắc trong bảng lớp**: khi kế hoạch cảnh nằm trong vùng có ảnh S2 10 băng sẵn, dưới lớp S2 trực tuyến có dòng nhắc dùng lớp "S2 10 băng".
- **Nạp trước nhường bản đồ** (xem mục 2), để không tranh băng thông với các ô bản đồ.

### Khuyên dùng ở Hải Phòng
- Dùng lớp **S2 10 băng** có sẵn.
- Nếu cần S2 trực tuyến:
  - chọn **màu thật ESA** khi chỉ cần nhìn;
  - đặt "Số cảnh ghép" 1 hoặc 2;
  - xem ở mức phóng 15–16. Trong các mức đã đo (12, 14, 16), mức 14 chậm nhất.

## 2. Nạp trước 5, 10, 20 điểm
Ô nạp trước có thêm các lựa chọn 5, 10 và 20 điểm.

- Bộ nhớ ảnh đã vẽ tăng lên 64 MB. Đủ cho 20 điểm × 10 năm, kể cả khi khung ảnh lớn.
- Khi nạp từ 5 điểm trở lên, mỗi điểm chỉ đọc 2 năm cùng lúc.
- **Nhường bản đồ**: khi lớp bản đồ nào đang tải ô, việc nạp trước tạm dừng, để ô của khung nhìn hiện ra trước.
  - Mỗi lần dừng tối đa 4 giây.
  - Nếu một lớp tải mãi không xong, lượt nạp đó thôi chờ, để không đứng hẳn.
- Ô ảnh nền Wayback chỉ nạp trước cho 3 điểm gần nhất.
- Đường S1 (mục 3) chỉ nạp trước cho 5 điểm gần nhất.

## 3. Đường mùa vụ 6 kỳ: S2 và S1 cùng lúc
Ở "Đường mùa vụ 6 kỳ" có ô **+ S1**. Bật lên thì cùng một đồ thị có:

- các đường **Sentinel-2** như trước (NDVI, MNDWI, băng, chỉ số; tái dựng từ PCA), trục trái;
- đường **Sentinel-1 VV** (cam) và **VH** (tím), đơn vị dB, nét đứt, **trục phải**.

**Ba cách xem**:

| cách xem | đường S1 |
|---|---|
| một năm nổi bật | năm đang gán nét đậm, các năm khác nét mờ, chấm nhỏ là từng cảnh theo ngày |
| chồng các năm | năm đang gán nét đậm, nét chấm là trung vị các năm |
| chuỗi liên tục | VV, VH theo kỳ qua mọi năm |

**Dữ liệu S1**:

- sentinel-1-rtc trên Microsoft Planetary Computer (đã hiệu chỉnh địa hình, γ⁰, 10 m).
- Đọc bằng **API điểm của máy chủ**: mỗi cảnh một yêu cầu, trả về cả VV và VH tại điểm. Máy chủ tự đọc ảnh, trình duyệt không phải tải khối ảnh về.
- Chỉ dùng một quỹ đạo cho mọi năm (quỹ đạo có nhiều cảnh nhất tại điểm), để góc nhìn đồng nhất.
- Mỗi kỳ 2 tháng lấy trung vị dB các cảnh.
- Năm đang gán đọc trước, các năm khác đọc dần; đồ thị vẽ lại khi có thêm dữ liệu.
- Khi đổi điểm giữa chừng, điểm mới được ưu tiên.
- Kết quả giữ trong trình duyệt (IndexedDB), mở lại không phải đọc lại.
- Điểm ngoài vùng có đường S2 thì vẫn vẽ được đường S1.

**Đo trên dữ liệu thật** (06.10.2026), điểm 106.605° E, 20.846° N, năm 2017–2026:

- 589 cảnh S1 tại điểm, trên 3 quỹ đạo; chọn quỹ đạo giảm 91 với 282 cảnh (28–33 cảnh mỗi năm);
- tìm cảnh 0.75 s;
- năm đang gán xong sau **3.0 s**; cả 10 năm xong sau **22 s**;
- không có yêu cầu nào lỗi.

**Đọc nhanh** (dòng này cũng có trong chú giải):

- nước có VV thấp (dưới −18 dB);
- lúa ngập đầu vụ có VV thấp, rồi tăng dần khi lúa lớn;
- đô thị có VV cao, ít đổi theo mùa;
- rừng có VH cao, ổn định.

## Kiểm thử
`tests/t_v36_dom.js` (jsdom, máy chủ STAC và API điểm giả) kiểm:

- có các lựa chọn 5, 10, 20 điểm; 10 điểm kế tiếp đúng;
- nạp trước đứng chờ khi bản đồ đang tải ô, chạy tiếp khi tải xong;
- chọn một quỹ đạo, không trộn quỹ đạo khác;
- trung vị dB theo kỳ đúng giá trị (−13.5 dB kỳ 1-2, −3.5 dB kỳ 11-12);
- năm đang gán đọc trước;
- đồ thị có cả NDVI và VV, VH với trục dB, ở cả ba cách xem; chú giải;
- vẽ lại không đọc lại;
- điểm không có đường S2 vẫn có đường S1; nạp trước có đường S1; tắt thì bỏ đường S1;
- S2 trực tuyến: cảnh mây kín ở khung bị bỏ (đọc băng 2/3 cảnh) mà ảnh ghép không đổi; không che mây thì vẫn đọc mọi cảnh;
- dòng nhắc dùng lớp có sẵn;
- bản dịch tiếng Nga.

Toàn bộ bài thử cũ vẫn đạt. Hai bài thử cũ được sửa cho hợp với bộ nhớ ảnh của bản 3.5:

- `t_v21`: khung lấy từ bộ nhớ cũng được tính là đã vẽ;
- `t_v35`: chờ nạp trước lâu hơn khi ảnh nền thử không tải được.

## Mã nguồn
| tệp | thay đổi |
|---|---|
| `src/s2o_core.js` | `ghep`: đọc lớp mây trước, chỉ đọc băng của cảnh còn góp điểm ảnh quang đãng |
| `src/v32_ui.js` | truyền số lần quang đãng cần (số cảnh ghép) cho `ghep` |
| `src/v35_ui.js` | nạp trước tới 20 điểm, nhường bản đồ, bộ nhớ 64 MB, nạp trước đường S1 |
| `src/v36_ui.js` (mới) | đường S1 trong đồ thị mùa vụ, nhắc dùng lớp S2 có sẵn |
| `src/tpl.html` | bản 3.6; ô nạp trước 5/10/20, ô + S1, lề phải và lớp S1 trong đồ thị mùa vụ; trợ giúp |
| `src/gen_i18n_v36.py` | bản dịch tiếng Nga, tiếng Anh |
| `tools/dung_trang.py` | thêm `v36_ui.js` |
