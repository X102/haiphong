# Bản 3.15: phân loại theo khối cho phạm vi lớn, gộp phương án
R315 = [
("theo khối, tự chọn bước lưới (phạm vi lớn)", "по блокам, шаг сетки автоматически (большой охват)", "in blocks, automatic grid step (large extent)"),
("theo khối, 10 m", "по блокам, 10 м", "in blocks, 10 m"),
("theo khối, 20 m", "по блокам, 20 м", "in blocks, 20 m"),
("theo khối, 30 m", "по блокам, 30 м", "in blocks, 30 m"),
("theo khối: lấy thống kê chung ({i}/{n})…", "по блокам: общая статистика ({i}/{n})…", "in blocks: common statistics ({i}/{n})…"),
("theo khối: đọc đặc trưng tại {m} điểm mẫu ({i}/{n} khối)…", "по блокам: чтение признаков в {m} эталонных точках ({i}/{n} блоков)…", "in blocks: reading features at {m} sample points ({i}/{n} blocks)…"),
("theo khối: {a}/{b} khối, còn khoảng {m} phút", "по блокам: {a}/{b} блоков, осталось около {m} мин", "in blocks: {a}/{b} blocks, about {m} min left"),
("Phạm vi lớn: lưới đơn không đọc được, tự chuyển sang phân loại theo khối (huấn luyện một lần, phân loại từng khối rồi ghép).",
 "Большой охват: единую сетку прочитать нельзя, выполняется переход к классификации по блокам (одно обучение, классификация каждого блока и сшивка).",
 "Large extent: the single grid cannot be read, switching to classification in blocks (training once, classifying each block, then mosaicking)."),
("Theo khối: {n} khối {b} × {b} điểm ảnh, lưới {r} m, {s} giây{w}.", "По блокам: {n} блоков {b} × {b} пикселей, сетка {r} м, {s} с{w}.", "In blocks: {n} blocks of {b} × {b} pixels, {r} m grid, {s} s{w}."),
("tính song song trên nhiều nhân", "параллельно на нескольких ядрах", "in parallel on several cores"),
("Đã tự chuyển sang theo khối vì phạm vi quá lớn cho lưới đơn.", "Переход к блокам выполнен автоматически: охват слишком велик для единой сетки.", "Switched to blocks automatically because the extent is too large for a single grid."),
("{n} khối không đọc được (ngoài vùng dữ liệu).", "Не прочитано блоков: {n} (вне области данных).", "{n} blocks could not be read (outside the data area)."),
("Bản đồ “độ giống mẫu” không có ở chế độ theo khối (tiết kiệm bộ nhớ).", "Карта «сходство с эталонами» в режиме блоков не формируется (экономия памяти).", "The “similarity to samples” map is not kept in block mode (to save memory)."),
("bản đồ quá lớn để xuất GeoJSON ({m} triệu điểm ảnh): dùng GeoTIFF, hoặc phân loại từng xã", "карта слишком велика для GeoJSON ({m} млн пикселей): используйте GeoTIFF или классифицируйте по общинам", "the map is too large for GeoJSON ({m} million pixels): use GeoTIFF, or classify commune by commune"),
("chọn ít nhất hai phương án tạo trong trang hoặc nhập vào", "выберите не менее двух вариантов, созданных на странице или импортированных", "choose at least two variants created on the page or imported"),
("các phương án đã chọn không có dữ liệu", "у выбранных вариантов нет данных", "the chosen variants have no data"),
("Gộp {n} phương án: {t}", "Объединение {n} вариантов: {t}", "Merge of {n} variants: {t}"),
("Gộp các phương án đã chọn", "Объединить выбранные варианты", "Merge the chosen variants"),
("ghép các bản đồ đã chọn (ví dụ phân loại từng xã) thành một bản đồ trên lưới chung; chỗ chồng nhau lấy bản đồ đứng trước trong danh sách",
 "сшить выбранные карты (например, классификации отдельных общин) в одну карту на общей сетке; в зонах перекрытия берётся карта, стоящая выше в списке",
 "join the chosen maps (for example, per-commune classifications) into one map on a common grid; where they overlap, the map higher in the list is used"),
("đang gộp…", "объединение…", "merging…"),
("đã gộp thành {t} (lưới {r} m)", "объединено в {t} (сетка {r} м)", "merged into {t} ({r} m grid)"),
("có mã lớp trùng nhau giữa các phương án: kiểm tra chú giải", "в вариантах совпадают коды разных классов: проверьте легенду", "variants share codes for different classes: check the legend"),
]
HELP315 = {
  "ru": ("<li><b>Несколько лет, постобработка (3.14)</b>", """
    <li><b>Большой охват, объединение вариантов (3.15)</b>: в поле «Сетка» добавлен режим «по блокам» (10, 20, 30 м или автоматический шаг): обучение выполняется один раз по всем эталонным точкам, затем каждый блок 512 × 512 пикселей классифицируется отдельно и блоки сшиваются в одну карту, что позволяет обрабатывать всю провинцию за несколько лет. При ошибке «слишком большое окно чтения» единой сетки переход к блокам выполняется автоматически. В статистике покрова кнопка «Объединить выбранные варианты» сшивает карты отдельных общин в одну карту.</li>"""),
  "en": ("<li><b>Several years, post-processing (3.14)</b>", """
    <li><b>Large extent, merging variants (3.15)</b>: the Grid box has a new “in blocks” mode (10, 20, 30 m or automatic step): training runs once on all sample points, then each 512 × 512 pixel block is classified separately and the blocks are mosaicked into one map, so the whole province can be processed for several years. When the single grid reports “read window too large”, the switch to blocks is automatic. In land cover statistics, the “Merge the chosen variants” button joins per-commune maps into one map.</li>"""),
}
