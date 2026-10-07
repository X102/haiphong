# Bản 3.10.1 (ô đến mã, thang màu, POI chi tiết, đồ thị bấm xem giá trị, chọn đường S1) và 3.11 (lớp mới từ Hugging Face, AlphaEarth)
R311 = [
("mùa vụ theo kỳ", "сезонная кривая по периодам", "seasonal curve by period"),
("{n} mã chứa “{q}”: mở {id}", "кодов, содержащих «{q}»: {n}; открыта {id}", "{n} IDs contain “{q}”: opened {id}"),
("S2 10 băng", "S2, 10 каналов", "S2 10 bands"),
("S2 trực tuyến", "S2 онлайн", "S2 online"),
("thang log", "логарифмическая шкала", "log scale"),
("Thang màu", "Цветовая шкала", "Colour scale"),
("thu gọn / mở thang màu", "свернуть / развернуть шкалу", "collapse / expand the colour scale"),
("loại", "тип", "type"),
("phân loại", "классификация", "taxonomy"),
("địa chỉ", "адрес", "address"),
("điện thoại", "телефон", "phone"),
("mạng xã hội", "соцсети", "social media"),
("thương hiệu", "бренд", "brand"),
("nguồn", "источник", "source"),
("(không tên)", "(без названия)", "(unnamed)"),
("diện tích nền", "площадь застройки", "footprint area"),
("số tầng", "этажность", "floors"),
("chiều cao", "высота", "height"),
("mái", "крыша", "roof"),
("tên", "название", "name"),
("nguồn hình", "источник контура", "geometry source"),
("Nhà", "Здание", "Building"),
("bấm để ẩn / hiện nhóm này trên bản đồ", "щёлкните, чтобы скрыть / показать группу на карте", "click to hide / show this group on the map"),
("chọn đường S1 hiện trên đồ thị (một hoặc nhiều)", "выберите кривые S1 на графике (одну или несколько)", "choose the S1 curves shown on the chart (one or more)"),
("VH−VV: tỉ số phân cực (dB), cao khi thực vật dày", "VH−VV: поляризационное отношение (дБ), выше при густой растительности", "VH−VV: polarisation ratio (dB), higher for dense vegetation"),
("trung vị các năm", "медиана лет", "median of years"),
("cảnh S2 quang đãng", "безоблачные сцены S2", "clear S2 scenes"),
("không có giá trị", "нет значений", "no values"),
("giống năm trước", "сходство с предыдущим годом", "similarity to previous year"),
("giống năm đầu", "сходство с первым годом", "similarity to first year"),
("AlphaEarth Foundations, 64 chiều tại điểm (cos = 1: không đổi)", "AlphaEarth Foundations, 64 измерения в точке (cos = 1: без изменений)", "AlphaEarth Foundations, 64 dimensions at the point (cos = 1: unchanged)"),
("AlphaEarth: độ giống năm trước, năm đầu (cos)", "AlphaEarth: сходство с предыдущим и первым годом (cos)", "AlphaEarth: similarity to previous and first year (cos)"),
("dùng AlphaEarth", "использовать AlphaEarth", "use AlphaEarth"),
("gợi ý lớp bằng 64 chiều AlphaEarth tại điểm (thay cho đặc trưng có sẵn)", "подсказка класса по 64 измерениям AlphaEarth в точке (вместо имеющихся признаков)", "class suggestion from the 64 AlphaEarth dimensions at the point (instead of the existing features)"),
]
HELP311 = {
  "ru": ("<li><b>Overture, температура поверхности (3.10)</b>", """
    <li><b>Шкала, POI, график (3.10.1)</b>: поле «к коду» всегда показывает код текущей точки, ищет и по части кода. В левом нижнем углу карты — <b>цветовая шкала</b> всех слоёв, показанных палитрой (индексы, температура, DEM, одноканальные слои), и легенда классов. POI Overture: щелчок по группе в легенде скрывает / показывает её; с масштаба 17 подписаны названия; щелчок по POI или зданию показывает сведения (тип, адрес, телефон, сайт, достоверность, источник; площадь, этажность). Сезонная кривая: щелчок по графику показывает все значения в этом периоде; список рядом с + S1 выбирает кривые VV, VH, VH−VV.</li>
    <li><b>Новые источники из Hugging Face (3.11)</b>: после запуска ячейки Colab HF_311_NGUON_MOI в списке слоёв появляются: цветное изображение <b>AlphaEarth</b> (3 главные компоненты 64 измерений, 2017-2025), <b>OPERA DIST-ANN</b> (нарушения растительности за год, максимальная потеря), <b>OPERA DSWx-HLS</b> (частота поверхностной воды за год), <b>ночные огни VIIRS</b> (логарифмическая шкала), <b>GlobalBuildingAtlas</b> (высота зданий, доля застройки). Таблица значений и шкала показывают реальные значения с единицами. В графике «значения пикселя по годам» есть группа <b>AlphaEarth: сходство с предыдущим и первым годом</b> (cos 64 измерений; падение означает изменение). Подсказка класса использует 64 измерения AlphaEarth (флажок «использовать AlphaEarth»).</li>"""),
  "en": ("<li><b>Overture, surface temperature (3.10)</b>", """
    <li><b>Colour scale, POI, chart (3.10.1)</b>: the “go to ID” box always shows the current point's ID and also finds by part of an ID. The lower left of the map shows a <b>colour scale</b> for every layer drawn with a palette (indices, temperature, DEM, single-band layers) and a legend for class layers. Overture POI: click a group in the legend to hide / show it; names appear from zoom 17; click a POI or building to see its details (type, address, phone, web, confidence, source; area, floors). Seasonal curve: click the chart to see every value at that period; the list next to + S1 chooses the VV, VH, VH−VV curves.</li>
    <li><b>New sources from Hugging Face (3.11)</b>: after the Colab cell HF_311_NGUON_MOI has run, the layer list gains: the <b>AlphaEarth</b> colour image (3 principal components of the 64 dimensions, 2017-2025), <b>OPERA DIST-ANN</b> (annual vegetation disturbance, maximum loss), <b>OPERA DSWx-HLS</b> (annual surface water frequency), <b>VIIRS night lights</b> (log scale), <b>GlobalBuildingAtlas</b> (building height, building cover). The value table and colour scale show real values with units. The “pixel values by year” chart has the group <b>AlphaEarth: similarity to previous and first year</b> (cosine of the 64 dimensions; a drop means change). Class suggestions use the 64 AlphaEarth dimensions (“use AlphaEarth” box).</li>"""),
}
