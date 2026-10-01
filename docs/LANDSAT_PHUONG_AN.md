# Landsat 1987-2026 cho geoportal Hải Phòng: phương án dữ liệu, PCA, embedding

## 1. Khuyến nghị

Dựng lại ảnh Landsat trên Earth Engine theo **phương án B**, không đẩy thẳng ảnh tổng hợp đang có trên Drive.
Ảnh cũ vẫn dùng được làm **phương án A** (cùng mã, chỉ đổi một tham số), nhưng có bốn vấn đề không sửa được về sau:
trộn mùa, thiếu năm 2012, chỉ phủ Đông Hải Phòng và không ghi lại điểm ảnh lấy từ đâu.

Cả hai phương án đi qua cùng một chuỗi:

1. lưới 30 m trùng khít 3 × 3 điểm ảnh S2;
2. chuẩn hoá tương đối IR-MAD về một ảnh tham chiếu chung;
3. cầu nối với S2;
4. COG;
5. PCA một bộ hệ số;
6. embedding cùng kiến trúc g7.

## 2. Ảnh đang có trên Drive (kiểm kê thật, `ls_landsat.kiem_ke`)

Thư mục `GEE-EXPORT/Dong-HP/1986-2026`, ranh giới `dong-hai-phong.shp`.

| | kết quả |
|---|---|
| số tệp | 39 ảnh năm, 1987 đến 2026; **thiếu 2012** |
| định dạng | EPSG:4326, khoảng 28 m, 8 băng float32 (6 phản xạ, TEMP, Clear_Count) |
| cảm biến (báo cáo GEE) | TM 25 năm, OLI 8 năm, OLI + OLI-2 6 năm; không có ETM+ |
| mùa | 37/39 ảnh gộp cảnh của nhiều mùa; nhiệt độ bề mặt trung vị từ 18.29 °C (2009) đến 41.79 °C (2004) |
| cảnh mùa khô mây < 50 % | chỉ 2 cảnh ở 2002, 2006, 2008, 2010; 1 cảnh ở 2013 |
| một lần quan sát | 17 năm có điểm ảnh chỉ một lần quan sát hợp lệ |
| phản xạ ngoài 0..1 | tối đa 0.25 % điểm ảnh (1992): bão hoà chưa bị che |
| lọc | chỉ bit mây và bóng mây của QA_PIXEL (ứng dụng APP-TONGHOP) |

Hệ quả:

- Ảnh hai năm lấy ở hai mùa khác nhau thì khác nhau vì lúa, nước, nhiệt, không phải vì mặt đất đổi.
- Không so được với ảnh S2 mùa khô của geoportal.

## 3. Phương án B: dựng lại trên Earth Engine (`ls_gee.py`)

### 3.1 Dữ liệu
Dữ liệu là USGS Collection 2 Level-2, Tier 1 (`LANDSAT/LT04|LT05|LE07|LC08|LC09/C02/T1_L2`).

- Phản xạ = DN × 0.0000275 − 0.2.
- Nhiệt độ = DN × 0.00341802 + 149.0 K.
- Lưới điểm khống chế của Collection 2 căn theo ảnh tham chiếu toàn cầu của Sentinel-2, nên Landsat và S2 cùng khung hình học.

**Không** quy đổi ETM+ về OLI bằng hệ số của Roy và cs. (2016). Hướng dẫn của Earth Engine ghi rằng với phản xạ bề mặt Collection 2 việc này đã lỗi thời và không cần. Phần chênh còn lại xử lý bằng IR-MAD trên chính ảnh của Hải Phòng (mục 4).

### 3.2 Chính sách cảm biến theo năm

Mùa khô năm y là từ 1/11 năm y−1 đến 30/4 năm y.

| năm | cảm biến chính | dự phòng | lý do |
|---|---|---|---|
| 1987-1994 | TM (Landsat 4, 5) | | |
| 1995-1998 | TM (Landsat 5) | | |
| 1999-2011 | TM + ETM+ | | ETM+ SLC-off từ 31/5/2003, khoảng 22 % mỗi cảnh là khe; hai cảm biến bù nhau |
| 2012 | ETM+ (+ TM tháng 11/2011) | | TM ngừng chụp 11/2011, OLI chưa có |
| 2013 | ETM+ + OLI | | OLI bắt đầu 2013 |
| 2014-2016 | OLI | ETM+ | ETM+ chỉ dùng khi OLI không đủ 2 lần quan sát |
| 2017-2021 | OLI | | quỹ đạo Landsat 7 trôi khỏi giờ chụp danh định từ 2017 |
| 2022-2026 | OLI + OLI-2 | | |

Landsat 7 ngừng chụp khoa học ngày 19/1/2024 và ngừng hoạt động ngày 4/6/2025. Từ 2017 trở đi nó không được dùng.

### 3.3 Lọc từng cảnh

Một quan sát bị loại nếu gặp một trong các trường hợp sau:

- QA_PIXEL bit 0-4: trống, mây nới, mây ti, mây, bóng mây.
- QA_RADSAT khác 0: bão hoà.
- Phản xạ ngoài [−0.05, 1].
- Khói mù:
  - TM, ETM+: SR_ATMOS_OPACITY × 0.001 > 0.3;
  - OLI: SR_QA_AEROSOL bit 6-7 = 11 (aerosol cao).
- TM, ETM+: điểm ảnh cách mép cảnh hoặc khe SLC-off dưới 2 điểm ảnh (mép cảnh TM/ETM+ hay lỗi).

### 3.4 Thứ tự lấy điểm ảnh và các băng truy vết

Mỗi điểm ảnh lấy từ tầng ưu tiên cao nhất có dữ liệu, rồi lấy trung vị các quan sát của tầng đó.

| NGUON | tầng |
|---|---|
| 0 | mùa khô, cảm biến chính, ≥ 2 quan sát (thiếu thì thêm cảm biến dự phòng) |
| 1 | nới tháng 10 đến tháng 5, ≥ 2 quan sát |
| 2 | nới tháng 10 đến tháng 5, đúng 1 quan sát |
| 3 | mượn mùa khô năm trước và năm sau, ≥ 2 quan sát |

Ảnh ra có 10 băng int16:

- BLUE..SWIR2 (× 10000);
- TEMP (°C × 100);
- NOBS (số quan sát của tầng đã dùng);
- NGUON;
- CAMBIEN (bit: TM 1, ETM+ 2, OLI 4, OLI-2 8).

Ảnh xuất trên lưới EPSG:32648, ô 30 m, gốc (615610, 2352020), trùng gốc ảnh S2_HP. Việc xuất chia cho tk1-tk4. Tài khoản đầu tiên xuất thêm ảnh tham chiếu (trung vị OLI mùa khô 2015-2020).

## 4. Chuẩn hoá tương đối (`ls_landsat.he_so_chuan_hoa`)

Mỗi năm được chuẩn hoá về ảnh tham chiếu theo các bước sau.

1. IR-MAD (Canty và Nielsen 2008) tìm điểm ảnh bất biến.
2. Xác suất không đổi tính với thang độ lệch tuyệt đối trung vị của từng biến MAD. Lý do: khi hai ảnh gần giống nhau, trọng số IR-MAD làm phương sai ước lượng sụp và gần như mọi điểm bị coi là "đổi"; lỗi này đã gặp khi kiểm thử và đã sửa.
3. Hồi quy trực giao từng băng, chỉ áp khi r² ≥ 0.85 và hệ số góc trong [0.7, 1.43].
4. Băng không đạt: chỉ sửa độ lợi (tỉ lệ trung bình) nếu r² ≥ 0.5; không đạt nữa thì giữ nguyên.
5. Năm thiếu điểm bất biến: giữ ảnh thô, ghi lý do trong `chuan_hoa.csv`.

Cầu nối S2 (2017-2026) so Landsat 30 m với S2 gộp 3 × 3 cùng năm. Bước này chỉ để chẩn đoán, không sửa ảnh.

## 5. PCA (`ls_pca.py`)

**PCA phổ chuỗi năm**: mỗi điểm ảnh có 9 đặc trưng (6 băng, NDVI, MNDWI, NDBI) lấy từ ảnh mùa khô đã chuẩn hoá. Một bộ hệ số dùng cho cả 40 năm, như PCA của S2.

- **Khớp**: cùng một bộ điểm ảnh ngẫu nhiên cho mọi năm, chỉ điểm NGUON 0, 1 (hoặc 9 ở phương án A); bỏ 2012 khi khớp.
- **Chọn số PC**: dùng lại đúng các tiêu chí của `pca_ts_py`:
  - Kaiser, gậy gãy, phân tích song song, ổn định giữa các năm;
  - độ chính xác phân loại 3 lớp tại điểm có nhãn, nếu có `diem_nhan.json`.
- **Geoportal**: hiển thị 5 PC; số đề xuất bằng thực nghiệm được in và ghi vào hệ số.
- **Bảng `troi_pc_theo_nam.csv`**: PC trung bình theo năm. Bước nhảy lớn ở 1999, 2013 hay 2022 là dấu hiệu lệch cảm biến còn sót.

Vì sao không làm PCA nhiều kỳ trong năm như S2:

- Trước 2013 chỉ có một hoặc hai cảm biến chu kỳ 16 ngày.
- Mùa mưa ở Hải Phòng gần như luôn có mây.
- Ngay mùa khô một số năm chỉ có 1-2 cảnh dùng được (mục 2).

Nếu làm nhiều kỳ, PC sẽ phản ánh mật độ ảnh của từng thời kỳ nhiều hơn mặt đất. PCA nhiều kỳ Landsat bản cũ vẫn còn trong pcats (cấu hình "LS") cho ai cần đường mùa vụ.

## 6. Embedding (`ls_embed.py`)

- **Kiến trúc** giống g7:
  - dilated_v4, rộng 48, giãn (1, 2, 4), sâu 3, 64 chiều;
  - tái dựng che 60 %, 1500 bước;
  - 6 băng vào.
- **Chuẩn hoá đầu vào**: một bộ trung bình và độ lệch chuẩn chung cho mọi năm, không theo từng ảnh. Như vậy thay đổi thật (đô thị sáng lên) không bị chuẩn hoá mất.
- **Mảnh huấn luyện**: chia đều theo năm, nên thời kỳ TM nặng ngang thời kỳ OLI.
- **Tuỳ chọn `chung_s2`**: thêm đầu ra 1 × 1 học theo 6 thành phần của g7 S2 (2017-2026, đọc từ ảnh g7, g7b trên HF). Khi bật, màu `lsg` cùng thang với `g7`.
- **Đánh giá**:
  - R² đoán lại phổ và chỉ số từ embedding;
  - độ trôi embedding trên điểm có phổ ổn định giữa hai năm liền kề, đánh dấu riêng các bước đổi cảm biến (`on_dinh_theo_nam.csv`).

## 7. Tệp và cách chạy

| tệp | việc |
|---|---|
| `ls_landsat.py` | kiểm kê, phương án A, IR-MAD, cầu nối S2, COG, kế hoạch GEE, gom mảnh, manifest, HF |
| `ls_gee.py` | dựng ảnh mùa khô trên GEE, xuất, theo dõi |
| `ls_pca.py`, `ls_embed.py` | PCA, embedding |
| `ls_HF_LANDSAT.ipynb` | tài khoản chính, Colab A100: kế hoạch, gom, chuẩn hoá, PCA, embedding, đẩy HF, cập nhật manifest (có bản sao manifest cũ) |
| `ls_GEE_tk1..tk4.ipynb` | từng tài khoản GEE phụ: đếm cảnh, chạy thử, gửi việc, theo dõi, CHÉP sang `HP_LS_CHUNG` |

Thứ tự chạy:

1. Notebook chính, ô 0-1: ghi kế hoạch, chia sẻ `HP_LS_CHUNG` cho các tài khoản phụ.
2. Mỗi tài khoản phụ: gửi việc, chờ xong, chạy ô CHÉP.
3. Notebook chính: chạy từ ô 3. Bước nào có kết quả hợp lệ thì tự bỏ qua.

Lớp lên HF: `ls/ls_{năm}.tif` (10 băng, giá trị tại điểm), `lstc`, `lspc1..5`, `lsg`, `lsgb`; mục `ls`, `lspc` trong manifest. Dữ liệu chỉ vào kho `lopmaybay/haiphong-lop-tham-chieu`.

## 8. Đã kiểm thử, chưa kiểm được

**Đã kiểm thử trong máy ảo** (đều đạt):

- `t_ls_landsat.py`: kiểm kê, nắn lưới, IR-MAD tìm lại hệ số biết trước, cổng chặn ảnh không liên quan, cầu nối S2, COG, manifest.
- `t_ls_gee.py`: Earth Engine giả tính thật bằng numpy:
  - cả 5 tầng NGUON;
  - từng mặt nạ (bóng mây, mây ti, mây nới, bão hoà, aerosol, độ mờ khí quyển TM, phản xạ ngoài khoảng, khe SLC-off);
  - Landsat 7 bị loại từ 2017;
  - đúng lưới xuất, gom mảnh.
- `t_ls_pca_emb.py`: PCA khớp với ảnh, phát hiện bước nhảy cảm biến giả, đọc điểm có nhãn, mảnh embedding, đổi đầu ra 1 × 1 thành phép chiếu, giải lượng tử g7.
- `harness_ls.py`: chạy hết notebook chính với phương án B rồi A (Drive, HF, torch giả) và notebook tk1 (GEE giả).
  - Ảnh TM có độ lợi giả 1.10: sau chuẩn hoá, sai số NIR so với mặt đất thật giảm từ 0.0354 xuống 0.0005.
  - Chạy lại thì không ghi lại tệp nào.

**Chưa kiểm được ở đây**:

- chạy GEE thật (chi phí EECU, số cảnh thật mỗi năm: ô 2 của notebook tài khoản phụ in ra);
- huấn luyện torch thật: `ls_embed.self_test()` tự chạy trên Colab trước khi huấn luyện.

## Nguồn
- Earth Engine, Landsat ETM+ to OLI harmonization: https://developers.google.com/earth-engine/tutorials/community/landsat-etm-to-oli-harmonization
- Roy và cs. 2016, hệ số quy đổi ETM+/OLI: https://openprairie.sdstate.edu/gsce_pubs/34/
- USGS, Landsat Collection 2: https://www.usgs.gov/landsat-missions/landsat-collection-2
- USGS, Collection 2 Quality Assessment Bands: https://www.usgs.gov/landsat-missions/landsat-collection-2-quality-assessment-bands
- Digital Earth Africa, Landsat C2 SR (thang, độ mờ khí quyển, aerosol): https://docs.digitalearthafrica.org/en/latest/data_specs/Landsat_C2_SR_specs.html
- USGS, Landsat 7: https://www.usgs.gov/landsat-missions/landsat-7
- USGS, Landsat 7 imaging suspended: https://www.usgs.gov/landsat-missions/landsat-7-imaging-suspended
- USGS, SLC failure image impact: https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/atoms/files/SLC%20Failure%20Image%20Impact%20Paper%20V1.1.pdf
- USGS, Landsat 5: https://www.usgs.gov/landsat-missions/landsat-5
- Canty và Nielsen 2008, IR-MAD: https://www2.fct.unesp.br/docentes/carto/enner/IR-MAD/Canty-Nielsen-RSE-2008.pdf
