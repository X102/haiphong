# Geoportal lớp phủ Hải Phòng: bản 3.8 (06.10.2026): toạ độ từ nhiều góc nhìn Street View, nút Dán điểm

## 1. Giao nhiều tia nhìn

### Cách dùng trong Google Earth
Bật dấu trang 📌 (cài như ở bản 3.7), rồi:

1. Ở một ảnh Street View, nhắm dấu tâm vào **một chỗ dễ nhận**: bờ ruộng, gốc cây, góc ao, cọc. Bấm **➕ Góc nhìn**.
2. Bấm mũi tên trên đường để sang ảnh khác cách đó **15–30 m**. Nhắm lại **đúng chỗ đó**.

   Hộp thông tin hiện ngay toạ độ giao các tia, sai số và góc giao, cập nhật liên tục khi anh xoay.
3. Có thể thêm góc thứ ba. Với ba góc nhìn, trang tự kiểm được các tia có thật sự gặp nhau không.
4. Bấm **📋 Chép điểm**. Góc nhìn đang xem được tính vào, nếu nó khác các góc đã thêm.
5. Sang geoportal bấm **Ctrl+V**, hoặc nút **📥 Dán điểm**.

### Cách tính
Mỗi góc nhìn cho một tia nằm ngang: gốc là vị trí máy ảnh, hướng là hướng nhìn. Toạ độ cần tìm là điểm gần mọi tia nhất, tính bằng bình phương tối thiểu có trọng số.

- **Trọng số** = 1 / ((σθ·d)² + σc²), với:
  - σθ = 0.5° (nhắm tâm, hướng máy ảnh);
  - σc = 1 m (vị trí tương đối giữa các ảnh);
  - d = khoảng cách máy ảnh tới điểm; vì d phụ thuộc kết quả nên trang tính lặp vài lần.
- **Không cần chiều cao máy ảnh.** Kết quả vẫn đúng khi ruộng thấp hơn mặt đường. Trong bài thử, chiều cao đặt sai làm một góc nhìn lệch hơn 5 m, còn giao hai tia thì lệch dưới 5 cm.
- **Elip sai số** (1σ) lấy từ ma trận hiệp phương sai. Sai số ghi là căn của tổng hai phương sai.
- **Góc giao** dưới 10° là hình học yếu. Khi đó trang thêm ước lượng theo góc cúi của từng ảnh, và nhắc anh đứng xa nhau hơn.
- **Cảnh báo "các tia không gặp nhau"** khi độ lệch chuẩn hoá trung bình > 1.5, hoặc có tia chỉ ngược hướng. Chỉ kiểm được từ 3 góc nhìn trở lên, vì 2 tia lúc nào cũng gặp nhau.

  Trong bài thử: nhắm lệch 15° ở một trong ba góc thì bị báo; nhắm lệch ±0.4° (bình thường) thì không báo, và sai dưới 1 m.

### Sai số ước tính
Mỗi ô ghi sai số với 2 góc nhìn / 3 góc nhìn, kèm góc giao của 2 góc nhìn. Mục tiêu ở giữa, các chỗ đứng trên đường.

| khoảng cách tới mục tiêu | 1 góc nhìn (theo góc cúi) | 2 chỗ đứng cách nhau 15 m | 2 chỗ đứng cách nhau 30 m |
|---|---|---|---|
| 20 m | ±3.2 m | ±2.2 / ±2.1 m (41°) | ±1.5 / ±1.4 m (74°) |
| 40 m | ±6.2 m | ±4.1 / ±4.1 m (21°) | ±2.3 / ±2.2 m (41°) |
| 60 m | ±10.6 m | ±6.5 / ±6.5 m (14°) | ±3.4 / ±3.4 m (28°) |

Đứng **xa nhau hơn** thì chính xác hơn. Góc thứ ba nằm giữa hai góc kia hầu như không làm sai số nhỏ đi; giá trị của nó là để tự kiểm. Mục tiêu càng xa thì càng có lợi so với một góc nhìn.

Các con số này là mô hình sai số, chưa đối chiếu với điểm đo thực địa.

## 2. Nút Dán điểm (thay cho Ctrl+V)
- Nút **📥 Dán điểm** trên thanh công cụ đọc bộ nhớ tạm và tạo điểm ngay. Lần đầu, trình duyệt có thể hỏi quyền đọc bộ nhớ tạm.
- Nếu trình duyệt không cho đọc, hoặc bộ nhớ tạm không có điểm, trang mở **ô dán tay**. Anh dán vào bằng chuột phải → Dán, rồi bấm "Tạo điểm".

  Ô này nhận được:
  - dòng đã chép bằng nút "Chép điểm";
  - đường dẫn Google Earth;
  - toạ độ "vĩ độ, kinh độ";
  - **nhiều dòng**, mỗi dòng một góc nhìn: trang giao các tia.
- Nút "Dán từ bộ nhớ tạm" trong hộp 📌 GE cũng dùng cách này.

## 3. Thêm góc nhìn cho điểm đã tạo
Điểm lấy từ Google Earth có nút **➕ thêm góc nhìn** ở khung điểm:

1. chép góc nhìn khác của đúng chỗ đó;
2. bấm nút: trang giao lại các tia, dời điểm sang toạ độ mới, ghi đã dời bao nhiêu mét.

Điểm vẫn giữ mã và nhãn đã gán. Nếu toạ độ mới rơi vào điểm ảnh của một điểm khác thì trang không dời.

## Ghi lại
`p.sv` của điểm giao tia gồm:

- kiểu `giao_tia`;
- số góc nhìn, sai số, góc giao, elip sai số, độ lệch chuẩn hoá;
- từng góc nhìn: đường dẫn, ngày ảnh, vị trí máy ảnh, hướng, khoảng cách.

Nếu các góc nhìn chụp khác ngày nhau, trang cảnh báo.

Khung điểm có liên kết 1, 2, 3… để mở lại từng góc nhìn.

Trên bản đồ: các tia nhìn, các máy ảnh (rê chuột để xem ngày và khoảng cách) và elip sai số.

CSV dạng dài:

- `nguon_mau` là `gearth:giao_tia`;
- thêm cột `so_goc_nhin` và `goc_giao_do`.

## Kiểm thử
`tests/t_v38_dom.js` dùng các góc nhìn giả nhắm đúng một mục tiêu đã biết. Máy ảnh thật cao 3.5 m, nhưng geoportal đặt 2.5 m.

- **Toán**:
  - một góc nhìn lệch > 5 m; giao 2 góc lệch < 5 cm, góc giao > 40°;
  - 3 góc cho sai số nhỏ hơn;
  - nhắm lệch ±0.4° vẫn trong 1 m;
  - một góc nhắm sai 15° thì bị báo;
  - hai chỗ đứng quá gần thì dùng thêm góc cúi.
- **Dấu trang** trong trang Google Earth giả:
  - thêm góc nhìn; thêm trùng thì báo;
  - sang ảnh thứ hai thì hộp hiện ngay "Giao 2 tia: 20.90000…, 106.60000…";
  - chép ra dòng LMGE2.
- **Geoportal**:
  - Ctrl+V tạo điểm giao tia; trên bản đồ có 2 tia, 2 máy ảnh và elip; có các cột CSV;
  - nút 📥 Dán điểm: không đọc được bộ nhớ tạm thì mở ô dán tay hai dòng; đọc được thì tạo điểm ngay;
  - ➕ thêm góc nhìn cho điểm một góc: giữ điểm, giao lại đúng mục tiêu;
  - bản dịch tiếng Nga.

Các bài thử cũ vẫn đạt.

## Mã nguồn
| tệp | thay đổi |
|---|---|
| `src/v37_ui.js` | `geTamGiac`; dấu trang có thêm góc nhìn, giao tia trực tiếp, LMGE2; dán nhiều dòng; nút Dán điểm, ô dán tay; thêm góc nhìn cho điểm đã có; vẽ tia, elip |
| `src/tpl.html` | bản 3.8; nút 📥 Dán điểm, ô dán tay; hướng dẫn nhiều góc nhìn; cột `so_goc_nhin`, `goc_giao_do`; trợ giúp |
| `src/gen_i18n_v38.py` | bản dịch tiếng Nga, tiếng Anh |
