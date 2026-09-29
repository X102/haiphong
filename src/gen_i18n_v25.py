# Bản 2.5: chữ không dấu còn sót, dải ảnh phóng to, chuẩn hoá đa giác, sửa vùng trên bản đồ, giới thiệu, tự lưu mẫu,
# gộp bộ, phiên làm việc (vi, ru, en)
R25 = [
# ---- chữ không dấu trước đây bị bỏ sót
("xem", "показать", "view"),
("nghi", "подозр.", "suspect"),
("nghi sai {n}", "подозрительный {n}", "suspected {n}"),
("so theo", "сравнивать по", "compare by"),
("vd (B11 - B12) / (B11 + B12)", "напр. (B11 - B12) / (B11 + B12)", "e.g. (B11 - B12) / (B11 + B12)"),
# ---- dải ảnh
("Dải ảnh theo năm quanh điểm ({k})", "Снимки по годам вокруг точки ({k})", "Yearly images around the point ({k})"),
("khoảng quanh điểm: nhỏ để xem rõ từng điểm ảnh 10 m", "охват вокруг точки: малый, чтобы видеть каждый пиксель 10 м", "extent around the point: small to see each 10 m pixel"),
("cỡ ảnh trong dải", "размер снимков в полосе", "image size in the strip"),
("cỡ vừa", "средний размер", "medium"),
("nhỏ (5 cột)", "мелкие (5 столбцов)", "small (5 columns)"),
("lớn (2 cột)", "крупные (2 столбца)", "large (2 columns)"),
("rất lớn (1 cột)", "очень крупные (1 столбец)", "very large (1 column)"),
# ---- chuẩn hoá đa giác
("Chuẩn hoá đa giác", "Нормализация полигонов", "Polygon clean-up"),
("Làm trơn cạnh", "Сгладить края", "Smooth edges"),
("bỏ bậc thang của cạnh điểm ảnh rồi cắt góc (Chaikin)", "убрать ступеньки пиксельных краёв и срезать углы (Чайкин)", "remove pixel staircase edges, then cut corners (Chaikin)"),
("1 lần", "1 раз", "once"), ("2 lần", "2 раза", "twice"), ("3 lần", "3 раза", "3 times"),
("Vuông góc hoá", "Ортогонализовать", "Square up"),
("mọi cạnh song song hoặc vuông góc với hướng chính: hợp cho nhà, công trình", "все стороны параллельны или перпендикулярны главному направлению: для зданий, сооружений",
 "every side parallel or perpendicular to the main direction: for buildings"),
("Bám đường, kênh OSM", "Прилипание к дорогам, каналам OSM", "Snap to OSM roads, canals"),
("kéo đỉnh về đường, kênh, bờ nước OSM gần nhất", "притянуть вершины к ближайшей дороге, каналу, берегу OSM", "pull vertices to the nearest OSM road, canal, shoreline"),
("trong", "в пределах", "within"),
("Xoá mảnh vụn", "Удалить мелочь", "Remove slivers"),
("xoá đa giác và lỗ nhỏ, dải quá hẹp", "удалить мелкие полигоны, дыры и слишком узкие полосы", "remove small polygons, holes and too-narrow strips"),
("nhỏ hơn", "меньше", "smaller than"),
("ha, hẹp hơn", "га, уже", "ha, narrower than"),
("gán lớp", "класс", "class"),
("Gán cho đa giác chọn", "Присвоить выбранным", "Assign to selected"),
("Xoá đa giác chọn", "Удалить выбранные", "Delete selected"),
("Nhấp đa giác để chọn hoặc bỏ chọn; không chọn gì thì chuẩn hoá mọi đa giác. Đa giác gán lớp khác được lưu thành vùng riêng của lớp đó. Hoàn tác: Z.",
 "Щёлкните полигон, чтобы выбрать или снять выбор; если ничего не выбрано, обрабатываются все полигоны. Полигоны с другим классом сохраняются отдельной областью этого класса. Отмена: Z.",
 "Click a polygon to select or deselect it; with nothing selected, every polygon is processed. Polygons given another class are saved as a separate area of that class. Undo: Z."),
("đang chọn {n} đa giác", "выбрано полигонов: {n}", "{n} polygons selected"),
("chưa chọn: áp cho mọi đa giác", "ничего не выбрано: для всех полигонов", "nothing selected: applies to every polygon"),
("chưa có đa giác: bấm công cụ ④ khi đã có vùng", "полигонов нет: включите инструмент ④, когда область готова", "no polygons: use tool ④ once there is an area"),
("đang nạp đường, kênh OSM…", "загрузка дорог, каналов OSM…", "loading OSM roads, canals…"),
("không có đường, kênh OSM nào quanh các đa giác", "рядом с полигонами нет дорог и каналов OSM", "no OSM roads or canals near the polygons"),
("đã xoá {n} mảnh vụn (Z để hoàn tác)", "удалено мелких фрагментов: {n} (Z: отменить)", "removed {n} slivers (Z to undo)"),
("đã bám {n} đỉnh vào đường, kênh OSM (Z để hoàn tác)", "вершин притянуто к дорогам, каналам OSM: {n} (Z: отменить)", "snapped {n} vertices to OSM roads, canals (Z to undo)"),
("đã chuẩn hoá {n} đa giác (Z để hoàn tác)", "обработано полигонов: {n} (Z: отменить)", "cleaned up {n} polygons (Z to undo)"),
("nhấp chọn đa giác trước", "сначала выберите полигоны щелчком", "click to select polygons first"),
("đã gán lớp {m} cho {n} đa giác: Lưu vùng sẽ lưu chúng thành vùng riêng", "класс {m} присвоен {n} полигонам: «Сохранить область» сохранит их отдельно",
 "class {m} assigned to {n} polygons: Save area will save them as a separate area"),
# ---- vùng đã lưu trên bản đồ
("Vùng mẫu", "Эталонная область", "Sample area"),
("đổi lớp", "сменить класс", "change class"),
("Đổi", "Сменить", "Change"),
("Xoá", "Удалить", "Delete"),
("đã đổi vùng {id} sang lớp {m}", "область {id} переведена в класс {m}", "area {id} changed to class {m}"),
# ---- so sánh các năm
("không tải được dữ liệu (mạng hoặc máy chủ bận)", "не удалось загрузить данные (сеть или сервер занят)", "could not load the data (network or server busy)"),
("so sánh xong, {n} năm lỗi: bấm Thử lại các năm lỗi", "сравнение готово, ошибок по годам: {n}; нажмите «Повторить годы с ошибкой»", "comparison done, {n} years failed: press Retry failed years"),
("Thử lại các năm lỗi ({n})", "Повторить годы с ошибкой ({n})", "Retry failed years ({n})"),
# ---- giới thiệu
("ⓘ Giới thiệu", "ⓘ О портале", "ⓘ About"),
("Giới thiệu", "О портале", "About"),
("Giới thiệu geoportal, tác giả, liên hệ", "О геопортале, авторе, контакты", "About the geoportal, the author, contact"),
("Tác giả", "Автор", "Author"),
("Liên hệ", "Контакты", "Contact"),
("Phiên bản {v}", "Версия {v}", "Version {v}"),
# ---- tự lưu mẫu, gộp bộ
("tự lưu điểm mẫu vào bộ \"Mẫu chọn vùng\"", "сохранять эталоны в набор «Эталоны выбора области»", "save seeds into the \"Region-tool samples\" set"),
("mỗi điểm mẫu có lớp được lưu thành một điểm có nhãn năm đang gán, để sau gộp với các bộ lấy tay",
 "каждый эталон с классом сохраняется точкой с меткой текущего года, чтобы потом объединить с ручными наборами",
 "each seed with a class is saved as a point labelled for the current year, to merge later with manual sets"),
("Mẫu chọn vùng", "Эталоны выбора области", "Region-tool samples"),
("⊕ Gộp", "⊕ Объединить", "⊕ Merge"),
("Gộp nhiều bộ điểm thành một bộ mới (vd các điểm mẫu chọn vùng với bộ lấy tay)", "Объединить несколько наборов точек в новый (напр. эталоны выбора области с ручным набором)",
 "Merge several point sets into a new one (e.g. region-tool samples with a manual set)"),
("Gộp bộ điểm", "Объединение наборов точек", "Merge point sets"),
("Chép các điểm (kèm mọi nhãn đã gán) của các bộ chọn dưới đây vào một bộ mới; các bộ cũ giữ nguyên.", "Точки выбранных ниже наборов (со всеми метками) копируются в новый набор; исходные наборы не меняются.",
 "Points of the sets selected below (with all their labels) are copied into a new set; the original sets stay unchanged."),
("bỏ điểm trùng ô 10 m (giữ điểm có nhiều nhãn hơn)", "убрать точки в одном пикселе 10 м (оставить точку с большим числом меток)", "drop points in the same 10 m pixel (keep the one with more labels)"),
("tên bộ mới, vd mẫu tổng hợp 2025", "имя нового набора, напр. сводная выборка 2025", "new set name, e.g. combined samples 2025"),
("Gộp thành bộ mới", "Объединить в новый набор", "Merge into a new set"),
("chưa có điểm nào", "точек нет", "no points yet"),
("chọn ít nhất một bộ", "выберите хотя бы один набор", "select at least one set"),
("bộ gộp", "объединённый набор", "merged set"),
("đã gộp {n} điểm từ {k} bộ vào bộ \"{t}\"", "объединено точек: {n} из наборов: {k} в набор «{t}»", "merged {n} points from {k} sets into \"{t}\""),
("(bỏ {b} điểm trùng ô)", "(убрано дублей в пикселе: {b})", "({b} same-pixel duplicates dropped)"),
# ---- phiên làm việc
("Tệp có cả phiên làm việc (điểm mẫu chọn vùng, đa giác đang sửa, cài đặt hiển thị, vị trí bản đồ). Khôi phục luôn?",
 "Файл содержит и рабочий сеанс (эталоны выбора области, редактируемые полигоны, настройки отображения, положение карты). Восстановить?",
 "The file also holds the working session (region-tool seeds, polygons being edited, display settings, map position). Restore it too?"),
("đã khôi phục phiên làm việc; một số cài đặt hiển thị có hiệu lực sau khi tải lại trang", "рабочий сеанс восстановлен; часть настроек отображения вступит в силу после перезагрузки страницы",
 "working session restored; some display settings take effect after reloading the page"),
]

HTML25 = {
  "ru": {"gtBody": """
  <p><b>Геопортал земного покрова Хайфона</b> это открытый веб-инструмент для просмотра, разметки и статистики многолетнего земного покрова (2017-2026) нового города Хайфон. Он создан для диссертационного исследования автора и открыт для всех, кого интересуют изменения землепользования, урбанизация, водные объекты и сельское хозяйство Хайфона.</p>
  <p><b>Данные</b>: ежегодные сухосезонные композиты Sentinel-2 (10 каналов), PCA годового ряда и сезонные кривые по 6 периодам, эмбеддинги, контекстные признаки CTX, карты покрова, Copernicus DEM GLO-30, OpenStreetMap, границы общин; подложка Esri Wayback по годам. Данные хранятся на Hugging Face и читаются напрямую по частям, собственный сервер не нужен; метки пользователя хранятся в его браузере и выгружаются в файл.</p>
  <p><b>Основные функции</b>: разметка точек по годам, быстрый просмотр любой точки, выбор областей по эталонам и нормализация границ, сравнение лет, библиотека 248 индексов Sentinel-2 и свои формулы, статистика по общинам, выгрузка CSV, GeoJSON, файла прогресса.</p>
  <p class="mu sm">Исходный код открыт по лицензии MIT. Данные по лицензиям источников: Copernicus Sentinel-2, Copernicus DEM (© DLR e.V., © Airbus Defence and Space, по программе Copernicus), © участники OpenStreetMap (ODbL), Esri World Imagery.</p>
  """},
  "en": {"gtBody": """
  <p><b>Hai Phong land cover geoportal</b> is an open web tool to view, label and summarise multi-year land cover (2017-2026) of the new Hai Phong city. It serves the author's doctoral research and is open to anyone interested in land-use change, urbanisation, water bodies and agriculture in Hai Phong.</p>
  <p><b>Data</b>: yearly dry-season Sentinel-2 composites (10 bands), yearly-series PCA and 6-period seasonal curves, embeddings, CTX context features, land-cover maps, Copernicus DEM GLO-30, OpenStreetMap, commune boundaries; Esri Wayback basemaps by year. The data sit on Hugging Face and are read directly in pieces, so no dedicated server is needed; user labels stay in the user's browser and can be exported to a file.</p>
  <p><b>Main functions</b>: labelling points year by year, a quick look at any spot, selecting areas similar to seed points and cleaning up their boundaries, comparing years, a library of 248 Sentinel-2 indices and your own formulas, statistics by commune, export to CSV, GeoJSON and a progress file.</p>
  <p class="mu sm">Source code under the MIT licence. Data under the licences of their sources: Copernicus Sentinel-2, Copernicus DEM (© DLR e.V., © Airbus Defence and Space, under the Copernicus programme), © OpenStreetMap contributors (ODbL), Esri World Imagery.</p>
  """},
}

HELP25 = {
  "ru": ("<li><b>Признаки выбора области</b>",
         """
    <li><b>Полоса снимков</b>: охват вокруг точки от 100 м до 2 км (малый, чтобы видеть каждый пиксель 10 м) и размер снимков.</li>
    <li><b>Нормализация полигонов</b> (инструмент ④): сгладить края, ортогонализовать контуры зданий, притянуть к дорогам и каналам OSM, удалить мелочь; щелчком выбираются полигоны, им можно присвоить другой класс или удалить их; Z отменяет. Щелчок по сохранённой области на карте (вне режима выбора области): сменить класс, править границы, удалить.</li>
    <li><b>Эталоны в набор</b>: эталоны с классом автоматически сохраняются в набор «Эталоны выбора области»; «⊕ Объединить» сливает наборы в новый. Файл прогресса JSON содержит всё: все наборы, области, участки, формулы индексов, правки OSM и рабочий сеанс (эталоны, редактируемые полигоны, настройки, положение карты), и восстанавливается при загрузке.</li>""", None, None),
  "en": ("<li><b>Region-tool features</b>",
         """
    <li><b>Image strip</b>: the extent around the point from 100 m to 2 km (small to see each 10 m pixel) and the image size.</li>
    <li><b>Polygon clean-up</b> (tool ④): smooth edges, square up building outlines, snap to OSM roads and canals, remove slivers; click polygons to select them, give them another class or delete them; Z undoes. Clicking a saved area on the map (outside the region tool): change its class, edit its boundary, delete it.</li>
    <li><b>Seeds into a set</b>: seeds with a class are saved automatically into the "Region-tool samples" set; "⊕ Merge" combines sets into a new one. The JSON progress file holds everything: every point set, area, locked area, index formula, OSM edit and the working session (seeds, polygons being edited, settings, map position), and restores it on load.</li>""", None, None),
}
