# Bản 2.8.1: chuỗi tiếng Việt còn sót trong giao diện ru/en (tên lớp lấy từ manifest, bộ điểm ứng viên, DEM)
R281 = [
("1371 điểm ứng viên phân tầng (lớp CTX 2025 × cụm PCA)",
 "1371 точка-кандидат, стратифицированная по классам CTX 2025 г. и кластерам ГК",
 "1371 stratified candidate points (CTX 2025 class × PCA cluster)"),
("km", "км", "km"), ("m", "м", "m"), ("km²", "км²", "km²"),
("DEM: độ cao, độ dốc, bóng địa hình", "ЦМР: высота, уклон, отмывка рельефа", "DEM: elevation, slope, hillshade"),
("Dynamic World V1: quy về 3 lớp (mùa khô)", "Dynamic World V1: 3 класса (сухой сезон)", "Dynamic World V1: 3 classes (dry season)"),
("Esri 10 m Annual LULC: quy về 3 lớp", "Esri 10 m Annual LULC: 3 класса", "Esri 10 m Annual LULC: 3 classes"),
("ESA WorldCover 10 m: quy về 3 lớp", "ESA WorldCover 10 м: 3 класса", "ESA WorldCover 10 m: 3 classes"),
("S2 màu thật (tổng hợp mùa khô)", "S2 в естественных цветах (композит сухого сезона)", "S2 natural colour (dry-season composite)"),
("S2 B11-B8-B4 (xây dựng hồng tím, thực vật xanh, nước đen)", "S2 B11-B8-B4 (застройка розово-фиолетовая, растительность зелёная, вода чёрная)",
 "S2 B11-B8-B4 (built-up pink-violet, vegetation green, water black)"),
("PCA chuỗi năm PC1-PC3 (màu = kiểu mùa vụ)", "ГК годового ряда PC1-PC3 (цвет = тип сезонности)", "Annual PCA PC1-PC3 (colour = seasonal type)"),
("Bản đồ 3 lớp CTX (làm mịn)", "Карта 3 классов CTX (стабилизированная)", "3-class CTX map (stabilised)"),
("Bản đồ 3 lớp CTX+TS11 (E6)", "Карта 3 классов по CTX и ГК годового ряда", "3-class map from CTX and annual-series PCs"),
("Embedding g7, thành phần 1-2-3", "Эмбеддинг g7, компоненты 1-2-3", "Embedding g7, components 1-2-3"),
("Embedding g7, thành phần 4-5-6", "Эмбеддинг g7, компоненты 4-5-6", "Embedding g7, components 4-5-6"),
] + [(f"PC{n} chuỗi năm (đỏ +, xanh −, trắng 0)", f"PC{n} годового ряда (красный +, синий −, белый 0)", f"PC{n} of the annual series (red +, blue −, white 0)") for n in range(1, 12)]
# tên lớp lulc_ctxts: bỏ mã nội bộ «E6»
LAYER281 = {"ru": {"lulc_ctxts": "Карта 3 классов по CTX и ГК годового ряда"}, "en": {"lulc_ctxts": "3-class map from CTX and annual-series PCs"}}
