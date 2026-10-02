# Geoportal lớp phủ Hải Phòng: bản 3.3 (02.10.2026): ranh giới toàn thế giới, đồ thị theo năm nhanh hơn

## Ranh giới toàn thế giới (OpenStreetMap)
Trong khối Hành chính có thêm mục **🌍 Ranh giới thế giới**. Cách dùng:

1. **Tìm nơi cần làm:** gõ tên một nơi ở bất kỳ nước nào (thành phố, quận, phường...) rồi bấm Tìm hoặc Enter. Trang tìm qua Nominatim của OpenStreetMap.
2. **Chọn kết quả:** trang vẽ ranh giới nơi đó và bay tới.
3. **Chọn cấp:** trang đếm các cấp hành chính (`admin_level`) nằm bên trong nơi đó, qua Overpass API.
   - Nút mỗi cấp ghi số đơn vị và vài tên ví dụ.
   - Đơn vị láng giềng chỉ chạm ranh giới bị bỏ.
4. **Nạp cấp:** bấm một cấp để nạp các đơn vị đó **thay cho ranh giới xã**. Sau đó các chức năng đã có dùng được như với xã Việt Nam:
   - tìm theo tên, tên hiện trên bản đồ, màu ranh giới;
   - gộp vùng (dán danh sách tên, nhấp bản đồ, cả vùng);
   - phạm vi "cả tỉnh đang chọn" của Thay đổi, Lớp phủ, Phân loại, Tạo bộ điểm.

Ô tìm trên bản đồ (🔎) có thêm dòng **"tìm … trên toàn thế giới"**: chọn kết quả ở đó là mở đúng nơi ấy. Chọn lại một tỉnh Việt Nam thì trang trở về ranh giới Việt Nam. Lần sau mở trang, nơi đã chọn có nút "nạp lại cấp …"; trang không tự tải để đỡ tốn mạng.

**Giới hạn:**
- Cấp thấp nhất có được là tuỳ dữ liệu OpenStreetMap của từng nước. Ví dụ Kazan có quận (cấp 9).
- Trang chỉ gửi yêu cầu khi người dùng bấm, theo quy định dùng Nominatim, và tối đa 1 yêu cầu mỗi giây.
- Overpass có lúc bận (lỗi 504). Khi đó trang tự thử lần lượt overpass-api.de, overpass.kumi.systems, maps.mail.ru.
- Đo ngày 02.10.2026 với 7 quận của Kazan: máy chủ đầu báo 504, máy chủ maps.mail.ru trả về sau 36 s.
- Một lần nạp tối đa 3000 đơn vị.

## Đồ thị "Giá trị điểm ảnh theo năm" nhanh hơn
Nguyên nhân chậm không phải ở NDVI. Dải "nhãn / ctx / dw / esri / wc" dưới đồ thị mở lần lượt hàng chục bản đồ lớp phủ của bộ dữ liệu Hải Phòng, kể cả khi điểm nằm ở Thanh Hoá. Đo trên trang thật, riêng phần này mất 38 s cho một điểm.

Đã sửa ba chỗ:

- **Bỏ lớp không phủ điểm:** mỗi lớp chỉ mở ảnh năm đầu để kiểm tra phạm vi; không phủ điểm thì bỏ qua cả lớp. Các năm còn lại đọc song song.
  - Đo lại cùng điểm ở Thanh Hoá: 1.6 s.
  - Đo một điểm ở Hải Phòng: 2.1 s.
- **Đọc song song với ảnh S2:** dải bản đồ lớp được đọc cùng lúc với ảnh S2, không đợi nhau.
- **Kho riêng cho đọc tại điểm:** đọc ảnh S2 tại điểm dùng kho riêng, giữ tới 160 tệp, mỗi tệp đệm 2 MB. Sang điểm bên cạnh không phải mở lại tệp.

Dữ liệu: © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). Nominatim: https://nominatim.org. Overpass API: https://overpass-api.de.
