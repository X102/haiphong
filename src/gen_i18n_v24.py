# Bản 2.4: thư viện chỉ số, công thức tự nhập, DEM, giá trị tại điểm, đặc trưng so sánh mở rộng (vi, ru, en)
R24 = [
# ---- hộp chỉ số
("Chỉ số", "Индексы", "Indices"),
("∑ Chỉ số…", "∑ Индексы…", "∑ Indices…"),
("thêm, bớt chỉ số (248 chỉ số Sentinel-2 hoặc công thức tự nhập)", "добавить или убрать индексы (248 индексов Sentinel-2 или своя формула)", "add or remove indices (248 Sentinel-2 indices or your own formula)"),
("thêm, bớt chỉ số", "добавить или убрать индексы", "add or remove indices"),
("Danh sách đang dùng áp cho lớp S2 (chế độ chỉ số), đồ thị theo năm, đường mùa vụ 6 kỳ, giá trị tại điểm và đặc trưng chọn vùng. Chỉ số tính từ ảnh S2 10 băng (phản xạ 0..1); chỉ số cần B1, B9, B10 không tính được.",
 "Текущий список используется в слое S2 (режим индексов), графике по годам, сезонной кривой по 6 периодам, значениях в точке и признаках выбора области. Индексы считаются по 10 каналам S2 (отражение 0..1); индексы, требующие B1, B9, B10, недоступны.",
 "The list in use applies to the S2 layer (index mode), the yearly chart, the 6-period seasonal curve, values at a point and the region-tool features. Indices are computed from the 10-band S2 image (reflectance 0..1); indices needing B1, B9, B10 are unavailable."),
("Đang dùng", "Используются", "In use"),
("(khoảng hiển thị: màu và đặc trưng chọn vùng)", "(диапазон: цвет и признак выбора области)", "(range: colours and region-tool feature)"),
("Thư viện 248 chỉ số Sentinel-2 (Index DataBase)", "Библиотека 248 индексов Sentinel-2 (Index DataBase)", "Library of 248 Sentinel-2 indices (Index DataBase)"),
("tìm theo tên, tên đầy đủ, công thức: vd NDWI, red edge, B11", "поиск по имени, полному названию, формуле: напр. NDWI, red edge, B11", "search by name, full name, formula: e.g. NDWI, red edge, B11"),
("Công thức tự nhập", "Своя формула", "Your own formula"),
("tên (tuỳ chọn), vd NDTI", "имя (необязательно), напр. NDTI", "name (optional), e.g. NDTI"),
("Băng B2 B3 B4 B5 B6 B7 B8 B8A B11 B12 (viết B04, B8A hay BLUE, GREEN, RED, RE1, RE2, RE3, NIR, NIR2, SWIR1, SWIR2 đều được), phản xạ 0..1; phép + − * / và ** hoặc ^ (luỹ thừa); hàm sqrt, abs, log, exp, atan, min, max, pow.",
 "Каналы B2 B3 B4 B5 B6 B7 B8 B8A B11 B12 (можно B04, B8A или BLUE, GREEN, RED, RE1, RE2, RE3, NIR, NIR2, SWIR1, SWIR2), отражение 0..1; операции + − * / и ** или ^ (степень); функции sqrt, abs, log, exp, atan, min, max, pow.",
 "Bands B2 B3 B4 B5 B6 B7 B8 B8A B11 B12 (B04, B8A or BLUE, GREEN, RED, RE1, RE2, RE3, NIR, NIR2, SWIR1, SWIR2 also work), reflectance 0..1; operators + − * / and ** or ^ (power); functions sqrt, abs, log, exp, atan, min, max, pow."),
("Kiểm tra", "Проверить", "Check"),
("＋ Thêm vào danh sách", "＋ Добавить в список", "＋ Add to the list"),
("Tự căn khoảng theo khung nhìn", "Подобрать диапазоны по виду карты", "Fit ranges to the map view"),
("đặt khoảng hiển thị mọi chỉ số đang dùng theo phân vị 2-98 % trong khung nhìn, năm đang gán", "задать диапазоны всех используемых индексов по процентилям 2-98 % в виде карты, текущий год",
 "set the range of every index in use to the 2-98 % percentiles in the map view, current year"),
("Về danh sách mặc định", "Вернуть список по умолчанию", "Back to the default list"),
("＋ chỉ số khác…", "＋ другой индекс…", "＋ another index…"),
("đầu thấp của thang màu", "нижний край шкалы", "low end of the colour scale"),
("đầu cao của thang màu", "верхний край шкалы", "high end of the colour scale"),
("đưa lên trên", "переместить вверх", "move up"),
("bỏ khỏi danh sách đang dùng", "убрать из используемых", "remove from the list in use"),
("chưa có chỉ số nào", "индексов нет", "no indices"),
("{n} / {m} chỉ số", "{n} из {m} индексов", "{n} / {m} indices"),
("xoá công thức tự nhập", "удалить свою формулу", "delete your formula"),
("công thức tự nhập", "своя формула", "your own formula"),
("cần {b}, ảnh của trang không có", "нужны {b}, их нет в снимке страницы", "needs {b}, not in the page's image"),
("hiện {a} / {n}: gõ thêm để lọc", "показано {a} из {n}: уточните поиск", "showing {a} / {n}: type more to filter"),
("Xoá công thức {t}?", "Удалить формулу {t}?", "Delete formula {t}?"),
("công thức hợp lệ, dùng {b}", "формула корректна, использует {b}", "formula is valid, uses {b}"),
("trên các phổ mẫu: {a} .. {c}", "на эталонных спектрах: {a} .. {c}", "on sample spectra: {a} .. {c}"),
("tại điểm đang xem, năm {y}: {v}", "в текущей точке, {y} г.: {v}", "at the current point, {y}: {v}"),
("lỗi công thức: ", "ошибка в формуле: ", "formula error: "),
("đã thêm chỉ số {t}", "индекс {t} добавлен", "index {t} added"),
("chưa có ảnh S2 10 băng năm {y}", "нет 10-канального снимка S2 за {y} г.", "no 10-band S2 image for {y}"),
("đã căn khoảng {n} chỉ số theo khung nhìn, năm {y}", "диапазоны {n} индексов подобраны по виду карты, {y} г.", "fitted the ranges of {n} indices to the map view, {y}"),
("công thức kết thúc sớm", "формула оборвана", "the formula ends too early"),
("công thức trống", "пустая формула", "empty formula"),
("Chỉ số (danh sách đang dùng, ∑ để thêm)", "Индексы (используемые, ∑ чтобы добавить)", "Indices (list in use, ∑ to add)"),
# ---- DEM
("không đổi theo năm", "не зависит от года", "same for every year"),
("độ cao + bóng địa hình", "высота + отмывка", "elevation + hillshade"),
("độ cao", "высота", "elevation"),
("độ dốc", "уклон", "slope"),
("độ dốc (0-30°)", "уклон (0-30°)", "slope (0-30°)"),
("bóng địa hình", "отмывка рельефа", "hillshade"),
("thang", "шкала", "scale"),
("Mô hình bề mặt: gồm cả nhà và cây, không phải mặt đất trần.", "Модель поверхности: включает здания и деревья, это не голая земля.", "Surface model: includes buildings and trees, not bare ground."),
# ---- giá trị tại điểm
("đang đọc giá trị tại điểm…", "чтение значений в точке…", "reading values at the point…"),
("giá trị tại điểm", "значения в точке", "values at the point"),
("xã, phường", "община, квартал", "commune, ward"),
("không có dữ liệu", "нет данных", "no data"),
("chỉ số {y}", "индексы {y}", "indices {y}"),
("vùng mẫu {y}", "эталонные области {y}", "sample areas {y}"),
("không có lớp nào đang bật", "нет включённых слоёв", "no layers switched on"),
# ---- đặc trưng so sánh
("Ảnh 8 bit (embedding, PCA, màu)", "8-битные снимки (эмбеддинг, PCA, цвет)", "8-bit images (embedding, PCA, colour)"),
("S2 10 băng (phản xạ)", "S2 10 каналов (отражение)", "S2 10 bands (reflectance)"),
("Chỉ số (danh sách đang dùng)", "Индексы (используемые)", "Indices (list in use)"),
("CTX (tính trên lưới phân tích)", "CTX (на сетке анализа)", "CTX (on the analysis grid)"),
("PC chuỗi năm (giá trị gốc)", "ГК годового ряда (исходные значения)", "Yearly-series PCs (raw values)"),
("CTX TB 5 × 5 (10 băng)", "CTX среднее 5 × 5 (10 каналов)", "CTX mean 5 × 5 (10 bands)"),
("CTX ĐLC 5 × 5 (10 băng)", "CTX СКО 5 × 5 (10 каналов)", "CTX std 5 × 5 (10 bands)"),
("CTX TB 15 × 15 (10 băng)", "CTX среднее 15 × 15 (10 каналов)", "CTX mean 15 × 15 (10 bands)"),
("CTX ĐLC 15 × 15 (10 băng)", "CTX СКО 15 × 15 (10 каналов)", "CTX std 15 × 15 (10 bands)"),
("lớp S2 10 băng không có năm {y}", "в слое S2 10 каналов нет {y} г.", "the 10-band S2 layer has no {y}"),
("ảnh S2 10 băng không phủ vùng này", "10-канальный снимок S2 не покрывает это место", "the 10-band S2 image does not cover this area"),
("đặc trưng {l} không có năm {y}", "признака {l} нет за {y} г.", "feature {l} has no {y}"),
("chỉ số {l} không dùng được", "индекс {l} недоступен", "index {l} is unavailable"),
# ---- báo lỗi cấu hình
("bộ dữ liệu Hugging Face {r} không có hoặc chưa công khai. Mục hf_repo trong cau_hinh.json là tên bộ dữ liệu trên Hugging Face (mặc định lopmaybay/haiphong-lop-tham-chieu), không phải tên kho GitHub; tên kho GitHub đặt ở bao_loi.github.",
 "набор данных Hugging Face {r} не существует или не публичный. Поле hf_repo в cau_hinh.json это имя набора на Hugging Face (по умолчанию lopmaybay/haiphong-lop-tham-chieu), а не репозитория GitHub; репозиторий GitHub указывается в bao_loi.github.",
 "the Hugging Face dataset {r} does not exist or is not public. hf_repo in cau_hinh.json is the dataset name on Hugging Face (default lopmaybay/haiphong-lop-tham-chieu), not the GitHub repository; the GitHub repository goes in bao_loi.github."),
]

LAYER24 = {"ru": {"dem": "ЦМР: высота, уклон, отмывка рельефа"}, "en": {"dem": "DEM: elevation, slope, hillshade"}}

RE24 = {
  "ru": [["^ký tự không hợp lệ ở vị trí (\\d+): (.*)$", "недопустимый символ в позиции $1: $2"], ["^thiếu '(.*)'$", "не хватает '$1'"],
         ["^không biết hàm '(.*)'$", "неизвестная функция '$1'"], ["^hàm (\\w+) cần (\\d+) đối số$", "функции $1 нужно аргументов: $2"],
         ["^ảnh không có băng (.*)$", "в снимке нет канала $1"], ["^không biết '(.*)'$", "неизвестно '$1'"],
         ["^không chờ '(.*)'$", "неожиданный '$1'"], ["^thừa '(.*)'$", "лишний '$1'"]],
  "en": [["^ký tự không hợp lệ ở vị trí (\\d+): (.*)$", "invalid character at position $1: $2"], ["^thiếu '(.*)'$", "missing '$1'"],
         ["^không biết hàm '(.*)'$", "unknown function '$1'"], ["^hàm (\\w+) cần (\\d+) đối số$", "function $1 needs $2 arguments"],
         ["^ảnh không có băng (.*)$", "the image has no band $1"], ["^không biết '(.*)'$", "unknown '$1'"],
         ["^không chờ '(.*)'$", "unexpected '$1'"], ["^thừa '(.*)'$", "extra '$1'"]],
}

HELP24 = {
  "ru": ("<li><b>Сравнение лет</b>",
         """
    <li><b>Индексы</b> (∑): библиотека из 248 индексов Sentinel-2 (Index DataBase, по файлу автора; 228 считаются по 10 каналам страницы) и свои формулы с именем. Выбранный список используется в слое S2 (режим индексов), графике по годам, сезонной кривой по 6 периодам (если восстановленные каналы достаточны), значениях в точке и признаках выбора области. Диапазон каждого индекса можно задать вручную или подобрать по виду карты.</li>
    <li><b>ЦМР</b>: Copernicus DEM GLO-30 (модель поверхности 30 м, включает здания и деревья): высота, уклон, отмывка; значения в точке; высота и уклон как признаки выбора области.</li>
    <li><b>Значения в точке</b>: при щелчке по карте (строка точки просмотра и окно информации о точке) показываются значения включённых слоёв, индексы, высота и уклон, община, эталонные области и объекты OSM в этом месте.</li>
    <li><b>Признаки выбора области</b>: кроме 8-битных снимков, теперь каналы S2, используемые индексы, CTX (среднее, СКО 5 × 5, 15 × 15), ГК годового ряда и ЦМР.</li>""",
         None, None),
  "en": ("<li><b>Compare years</b>",
         """
    <li><b>Indices</b> (∑): a library of 248 Sentinel-2 indices (Index DataBase, from the author's file; 228 computable from the page's 10 bands) and your own named formulas. The chosen list applies to the S2 layer (index mode), the yearly chart, the 6-period seasonal curve (when the reconstructed bands suffice), values at a point and the region-tool features. Each index range can be set by hand or fitted to the map view.</li>
    <li><b>DEM</b>: Copernicus DEM GLO-30 (30 m surface model, includes buildings and trees): elevation, slope, hillshade; values at a point; elevation and slope as region-tool features.</li>
    <li><b>Values at a point</b>: clicking the map (probe line and point-info window) shows the values of the layers switched on, the indices, elevation and slope, the commune, sample areas and OSM features there.</li>
    <li><b>Region-tool features</b>: besides the 8-bit images, now S2 bands, the indices in use, CTX (mean, std 5 × 5, 15 × 15), yearly-series PCs and the DEM.</li>""",
         None, None),
}
