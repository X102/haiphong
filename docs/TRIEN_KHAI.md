# Đưa geoportal lên GitHub Pages

## 1. Tạo kho và đẩy mã

1. Trên GitHub, tạo kho mới (công khai), ví dụ `haiphong-geoportal`, không tạo README sẵn.
2. Trên máy, trong thư mục này:

```bash
git init
git add .
git commit -m "Geoportal lớp phủ Hải Phòng 2.2"
git branch -M main
git remote add origin https://github.com/<tài-khoản>/<kho>.git
git push -u origin main
```

3. Vào kho, Settings, Pages, mục Build and deployment, Source: chọn **GitHub Actions**.
4. Thẻ Actions sẽ chạy quy trình "Trang web"; xong, trang ở `https://<tài-khoản>.github.io/<kho>/`.

## 2. Cấu hình

Sửa `cau_hinh.json` (có thể sửa ngay trên GitHub), đẩy lên là trang cập nhật:

- `bao_loi.email`: địa chỉ nhận báo lỗi (công khai trong trang).
- `bao_loi.github`: `<tài-khoản>/<kho>` nếu muốn nút tạo issue.
- `hf_repo`: đổi nếu dùng bộ dữ liệu khác.

## 3. Dữ liệu trên Hugging Face

Trang đọc `manifest.json` của bộ dữ liệu. Các ô trong `colab/` dựng và đẩy dữ liệu (chạy trên Colab, token qua Colab Secrets tên `HF_TOKEN`):

| ô | thêm gì |
|---|---|
| `s2_HF_LOP_THAM_CHIEU.ipynb` | lớp đối chiếu cơ bản, hai bộ điểm |
| `s2_HF_BO_SUNG_PC_EMB.ipynb` | PC1-5, ảnh dữ liệu PC, embedding g7 |
| `HF_RANH_GIOI_XA_cell.py` | ranh giới xã |
| `HF_S2D_CTX_cell.py` | ảnh S2 10 băng (CTX, tổ hợp màu, chỉ số) |
| `HF_OSM_cell.py` | OpenStreetMap (7 chủ đề, FlatGeobuf, GeoPackage) |

Các ô cần `LAY_MAU_DA_NAM.html` trong thư mục `HP_modules` trên Drive: chép `index.html` thành tên đó.

## 4. Cập nhật trang

Sửa trong `src/`, chạy `python tools/dung_trang.py`, kiểm tra bằng `bash tests/chay_het.sh`, rồi `git commit` và `git push`.
Muốn chạy bài thử trên GitHub: thẻ Actions, quy trình "Kiểm thử", Run workflow (chưa chạy thử trên máy chủ GitHub).

## 5. Lưu ý

- Trang tĩnh, không có máy chủ riêng: nhãn người dùng lưu trong trình duyệt của họ; nhắc họ xuất tệp tiến độ JSON.
- Bộ dữ liệu Hugging Face phải công khai để trình duyệt đọc được.
- Thư viện nạp từ cdnjs và jsdelivr (Leaflet, proj4, geotiff.js, Leaflet-Geoman, flatgeobuf, osmtogeojson).
