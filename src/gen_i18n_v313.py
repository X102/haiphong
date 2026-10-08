# Bản 3.13: xuất bản đồ (ngôn ngữ, tên tệp, nhãn dự phòng), chọn xã bằng ô tích, Shapefile điểm mẫu, quản lý phương án
R313 = [
("chưa nạp các xã", "общины ещё не загружены", "communes not loaded yet"),
("đã chọn {n} xã, {a} ha", "выбрано общин: {n}, {a} га", "{n} communes selected, {a} ha"),
("đã lưu vùng gộp {t} ({n} xã): chọn lại được ở mọi ô Phạm vi", "объединённая область «{t}» сохранена ({n} общин): её можно выбрать в любом поле «Область»", "merged area {t} saved ({n} communes): it can be chosen again in every Extent box"),
("tìm xã…", "поиск общины…", "find a commune…"),
("chọn hết", "выбрать все", "select all"),
("tên vùng (tuỳ chọn)", "название области (необязательно)", "area name (optional)"),
("lưu thành vùng gộp", "сохранить как объединённую область", "save as merged area"),
("lưu các xã đang chọn thành một vùng gộp để lần sau chọn lại ở mọi ô Phạm vi", "сохранить выбранные общины как объединённую область, чтобы потом выбрать её в любом поле «Область»", "save the selected communes as a merged area to choose it later in every Extent box"),
("không có điểm nào trong các bộ đã chọn", "в выбранных наборах нет точек", "the chosen sets have no points"),
("chọn ít nhất một bộ điểm", "выберите хотя бы один набор точек", "choose at least one point set"),
("đã xuất {f}: {n} điểm", "экспортировано {f}: {n} точек", "exported {f}: {n} points"),
("Shapefile (SHP)…", "Shapefile (SHP)…", "Shapefile (SHP)…"),
("xuất điểm mẫu thành Shapefile (ZIP), chọn các bộ điểm để gộp", "экспорт образцов в Shapefile (ZIP), с выбором объединяемых наборов точек", "export samples as a Shapefile (ZIP), choosing the point sets to merge"),
("Các bộ điểm gộp vào một Shapefile (toạ độ WGS 84, trường chữ UTF-8):", "Наборы точек, объединяемые в один Shapefile (координаты WGS 84, текстовые поля UTF-8):", "Point sets merged into one Shapefile (WGS 84 coordinates, UTF-8 text fields):"),
("chỉ điểm đã có nhãn", "только размеченные точки", "labelled points only"),
("Tải Shapefile (ZIP)", "Скачать Shapefile (ZIP)", "Download Shapefile (ZIP)"),
("Tên mới của phương án", "Новое название варианта", "New name of the variant"),
("phạm vi: {v}", "область: {v}", "extent: {v}"),
("{n} mẫu", "образцов: {n}", "{n} samples"),
("({n} ngoài phạm vi)", "({n} за пределами области)", "({n} outside the extent)"),
("mẫu: {s}", "образцы: {s}", "samples: {s}"),
("hiện / ẩn trên bản đồ", "показать / скрыть на карте", "show / hide on the map"),
("đến phạm vi của phương án", "перейти к охвату варианта", "zoom to the variant's extent"),
("đổi tên", "переименовать", "rename"),
("xuất bản đồ của phương án này", "экспорт карты этого варианта", "export the map of this variant"),
("tải GeoTIFF bản đồ lớp", "скачать GeoTIFF карты классов", "download the class map as GeoTIFF"),
("phương án: {t}", "вариант: {t}", "variant: {t}"),
("Nhãn địa danh lấy từ {s} vì {n} không cho tải chéo.", "Подписи взяты из {s}, так как {n} не разрешает кросс-доменную загрузку.", "Place labels taken from {s} because {n} does not allow cross-origin loading."),
("CARTO (OSM)", "CARTO (OSM)", "CARTO (OSM)"),
]
HELP313 = {
  "ru": ("<li><b>Образцы извне (3.12)</b>", """
    <li><b>Экспорт, общины, варианты (3.13)</b>: экспорт карты показывает названия классов на выбранном языке, имя файла содержит содержание, год, область, формат, dpi и время; если подписи Esri нельзя загрузить для экспорта, берутся подписи Google или CARTO. Списки общин в окнах — флажки с поиском и кнопкой «сохранить как объединённую область»; в экспорте карты есть рамка «выбранные ниже общины». Экспорт образцов в Shapefile (ZIP) с выбором наборов точек. В «Статистике» у каждого созданного варианта: область, время создания, число образцов, кнопки показать на карте, перейти, переименовать, экспорт карты, GeoTIFF; одинаковые названия нумеруются.</li>"""),
  "en": ("<li><b>Samples from outside (3.12)</b>", """
    <li><b>Export, communes, variants (3.13)</b>: map export shows class names in the chosen language; the file name carries the content, year, extent, size, dpi and time; when Esri labels cannot be loaded for export, Google or CARTO labels are used. Commune lists in the panels are checkboxes with search and a “save as merged area” button; map export has the frame “communes selected below”. Samples export as a Shapefile (ZIP) with a choice of point sets. In “Statistics” every created variant shows its extent, creation time, sample count, and buttons to show on the map, zoom to, rename, export the map, GeoTIFF; identical names are numbered.</li>"""),
}
