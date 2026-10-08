# Bản 3.14: tên theo ngôn ngữ, phân loại nhiều năm, hậu xử lý phân loại
R314 = [
("hậu xử lý: chia đối tượng…", "постобработка: разбиение на объекты…", "post-processing: segmenting into objects…"),
("đồng nhất trong {n} đối tượng ≈ {s} m", "единый класс в {n} объектах ≈ {s} м", "one class within {n} objects ≈ {s} m"),
("hậu xử lý: lọc đa số…", "постобработка: мажоритарный фильтр…", "post-processing: majority filter…"),
("lọc đa số {k} × {k}", "мажоритарный фильтр {k} × {k}", "majority filter {k} × {k}"),
("hậu xử lý: bỏ mảnh nhỏ…", "постобработка: удаление мелких участков…", "post-processing: removing small patches…"),
("bỏ mảnh nhỏ hơn {a} ha", "удалены участки меньше {a} га", "patches smaller than {a} ha removed"),
("đang chạy năm {y} ({i}/{n})", "выполняется {y} г. ({i}/{n})", "running {y} ({i}/{n})"),
("không năm nào chạy được", "ни один год не обработан", "no year could be processed"),
("xong {n} năm", "обработано лет: {n}", "{n} years done"),
("không chạy được: {y}", "не обработаны: {y}", "not processed: {y}"),
("Diện tích các lớp tính bằng ha.", "Площади классов в гектарах.", "Class areas in hectares."),
("Làm mịn theo năm đã đổi lớp {n} điểm ảnh (bỏ các thay đổi chỉ kéo dài một năm).", "Сглаживание по годам изменило класс {n} пикселей (исключены изменения длительностью в один год).", "Temporal smoothing changed the class of {n} pixels (changes lasting a single year removed)."),
("Hậu xử lý: {b}; đổi lớp {p} % điểm ảnh.", "Постобработка: {b}; класс изменён у {p} % пикселей.", "Post-processing: {b}; class changed for {p} % of pixels."),
("Các năm", "По годам", "By year"),
("đã lưu thành phương án nhiều năm ({y}): dùng được ở Thống kê lớp phủ, Phát hiện thay đổi, Xuất bản đồ", "сохранено как многолетний вариант ({y}): доступен в статистике покрова, выявлении изменений и экспорте карты", "saved as a multi-year variant ({y}): available in land cover statistics, change detection and map export"),
("nhiều năm", "несколько лет", "several years"),
("Hậu xử lý (bỏ điểm ảnh lẻ, đồng nhất theo đối tượng)", "Постобработка (удаление одиночных пикселей, единый класс в объекте)", "Post-processing (removing isolated pixels, one class per object)"),
("đồng nhất trong đối tượng", "единый класс в объекте", "one class per object"),
("lọc đa số", "мажоритарный фильтр", "majority filter"),
("bỏ mảnh nhỏ hơn", "удалять участки меньше", "remove patches smaller than"),
("làm mịn theo năm (khi chạy từ 3 năm)", "сглаживание по годам (от 3 лет)", "temporal smoothing (from 3 years)"),
("chia ảnh thành đối tượng (siêu điểm ảnh) theo đặc trưng, mỗi đối tượng nhận một lớp theo đa số điểm ảnh bên trong: một ao, một đoạn sông không còn bị chia hai lớp",
 "разбиение снимка на объекты (суперпиксели) по признакам; каждому объекту присваивается класс большинства его пикселей, поэтому пруд или участок реки не делится на два класса",
 "split the image into objects (superpixels) by features; each object takes the majority class of its pixels, so a pond or a river reach is no longer split into two classes"),
("mỗi điểm ảnh nhận lớp chiếm nhiều nhất trong cửa sổ quanh nó", "каждому пикселю присваивается преобладающий класс окна вокруг него", "each pixel takes the most frequent class in the window around it"),
("mảnh liền cùng lớp nhỏ hơn diện tích này được gộp vào lớp xung quanh", "связные участки одного класса меньше этой площади присоединяются к окружающему классу", "connected patches of one class smaller than this area are merged into the surrounding class"),
("chạy lần lượt các năm đã chọn với cùng thiết lập; mỗi năm dùng nhãn và ảnh của năm đó", "последовательная обработка выбранных лет с одинаковыми настройками; для каждого года используются его метки и снимки", "process the chosen years one after another with the same settings; each year uses its own labels and imagery"),
]
HELP314 = {
  "ru": ("<li><b>Экспорт, общины, варианты (3.13)</b>", """
    <li><b>Несколько лет, постобработка (3.14)</b>: классификация по эталонам выполняется сразу для нескольких лет (флажок «несколько лет»), с таблицей по годам и сохранением одного многолетнего варианта. Постобработка: единый класс в объекте (суперпиксели), мажоритарный фильтр 3 × 3 или 5 × 5, удаление участков меньше заданной площади, сглаживание по годам. Названия вариантов, заголовки и подзаголовки карт выводятся на выбранном языке; вьетнамские топонимы на русском и английском пишутся без диакритики.</li>"""),
  "en": ("<li><b>Export, communes, variants (3.13)</b>", """
    <li><b>Several years, post-processing (3.14)</b>: classification from samples runs for several years at once (“several years” box), with a table by year and one multi-year variant saved. Post-processing: one class per object (superpixels), majority filter 3 × 3 or 5 × 5, removal of patches below a given area, temporal smoothing. Variant names, map titles and subtitles follow the chosen language; Vietnamese place names are written without diacritics in Russian and English.</li>"""),
}
