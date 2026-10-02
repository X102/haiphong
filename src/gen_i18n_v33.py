# Bản 3.3: ranh giới toàn thế giới từ OpenStreetMap
R33 = [
("🌍 Ranh giới thế giới (OpenStreetMap)", "🌍 Границы всего мира (OpenStreetMap)", "🌍 World boundaries (OpenStreetMap)"),
("Đơn vị cấp dưới nạp vào thay ranh giới xã: dùng được cho tìm, tên, gộp vùng, phạm vi phân tích. Dữ liệu © OpenStreetMap contributors (ODbL); tìm: Nominatim; ranh giới: Overpass API.",
 "Загруженные единицы заменяют границы общин: доступны поиск, подписи, объединение, охват анализа. Данные © участники OpenStreetMap (ODbL); поиск: Nominatim; границы: Overpass API.",
 "Loaded units replace the commune boundaries: usable for search, labels, merging and analysis extents. Data © OpenStreetMap contributors (ODbL); search: Nominatim; boundaries: Overpass API."),
("thành phố, quận, phường ở bất kỳ nước nào", "город, район, квартал в любой стране", "city, district, ward in any country"),
("vùng thế giới này không còn được nạp", "эта территория больше не загружена", "this area is no longer loaded"),
("Nominatim ", "Nominatim ", "Nominatim "),
("đang tìm…", "поиск…", "searching…"),
("nơi này là một điểm, không có ranh giới: chọn một kết quả là vùng (thành phố, quận, tỉnh)", "это точка без границы: выберите результат-территорию (город, район, область)", "this is a point without a boundary: choose an area result (city, district, province)"),
("đang đếm các cấp hành chính bên trong…", "подсчёт административных уровней внутри…", "counting administrative levels inside…"),
("chọn một cấp để nạp làm ranh giới xã của trang:", "выберите уровень для загрузки как границы общин:", "choose a level to load as the page's commune boundaries:"),
("OpenStreetMap không có cấp hành chính nào bên dưới nơi này", "в OpenStreetMap нет административных уровней ниже этой территории", "OpenStreetMap has no administrative level below this place"),
("cấp {l}", "уровень {l}", "level {l}"),
("quá nhiều đơn vị ({n}): chọn nơi nhỏ hơn hoặc cấp cao hơn", "слишком много единиц ({n}): выберите меньшую территорию или более высокий уровень", "too many units ({n}): choose a smaller place or a higher level"),
("đang nạp {n} đơn vị cấp {l}…", "загрузка {n} единиц уровня {l}…", "loading {n} units of level {l}…"),
("không có đơn vị nào", "нет ни одной единицы", "no units"),
("đã nạp {n} đơn vị cấp {l} của {t}: dùng cho tìm, tên, gộp vùng, phạm vi", "загружено {n} единиц уровня {l} ({t}): поиск, подписи, объединение, охват", "loaded {n} level-{l} units of {t}: search, labels, merging, extents"),
("tìm “{q}” trên toàn thế giới", "искать «{q}» по всему миру", "search “{q}” worldwide"),
("nạp lại cấp {l}", "загрузить снова уровень {l}", "reload level {l}"),
("mở lại", "открыть снова", "reopen"),
("tìm xã, phường, thành phố…", "община, квартал, город…", "commune, ward, city…"),
]
HELP33 = {
  "ru": ("<li><b>S2 онлайн 3.2</b>", """
    <li><b>Границы всего мира (3.3)</b>: в разделе «Административное деление» найдите любой город, район или квартал любой страны (Nominatim, OpenStreetMap), затем выберите административный уровень внутри него (admin_level, Overpass API) и загрузите его вместо границ общин: работают поиск по названию, подписи, объединение единиц, охват анализа. В поле поиска на карте строка «искать по всему миру» делает то же самое. Глубина уровней зависит от того, что внесено в OpenStreetMap для этой страны.</li>"""),
  "en": ("<li><b>S2 online 3.2</b>", """
    <li><b>World boundaries (3.3)</b>: in the administrative section, search any city, district or ward in any country (Nominatim, OpenStreetMap), then choose an administrative level inside it (admin_level, Overpass API) and load it in place of the commune boundaries: name search, labels, merging units and analysis extents all work. In the map search box, the line "search worldwide" does the same. How deep the levels go depends on what OpenStreetMap holds for that country.</li>"""),
}
