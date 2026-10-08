# Từ điển giao diện geoportal: khoá = câu tiếng Việt gốc; ru, en. Thêm ngôn ngữ: thêm một cột và một khoá ở cuối tệp.
import json, pathlib
D = pathlib.Path(__file__).parent

R = [  # (vi, ru, en)
("Geoportal lớp phủ Hải Phòng", "Геопортал земного покрова Хайфона", "Hai Phong Land Cover Geoportal"),
("Tải tệp…", "Открыть файл…", "Open file…"),
("Xuất…", "Экспорт…", "Export…"),
("Cài đặt", "Настройки", "Settings"),
("Trợ giúp", "Справка", "Help"),
("Chọn vùng", "Выбор области", "Region tool"),
("Bộ điểm", "Набор точек", "Point set"),
("Thêm điểm", "Добавить точку", "Add point"),
("mọi điểm", "все точки", "all points"),
("chưa xong", "не завершены", "unfinished"),
("đã xong", "завершены", "finished"),
("có đổi lớp", "со сменой класса", "with class change"),
("cần xem lại", "на проверку", "to review"),
("Năm đang gán", "Год разметки", "Year being labelled"),
("Lớp", "Класс", "Class"),
("(bấm phím để gán cho năm đang chọn)", "(нажмите клавишу, чтобы присвоить выбранному году)", "(press a key to assign to the selected year)"),
("Điểm", "Точка", "Point"),
("Chưa chọn điểm.", "Точка не выбрана.", "No point selected."),
("Chép năm trước", "Как в прошлом году", "Copy previous year"),
("Điền về sau", "Заполнить далее", "Fill forward"),
("Cần xem lại", "На проверку", "Flag for review"),
("Xoá điểm", "Удалить точку", "Delete point"),
("Độ tin cậy năm này:", "Уверенность для этого года:", "Confidence for this year:"),
("thấp", "низкая", "low"),
("vừa", "средняя", "medium"),
("cao", "высокая", "high"),
("Liên kết ngoài cho điểm này", "Внешние ссылки для этой точки", "External links for this point"),
("Dải ảnh theo năm quanh điểm (khoảng 900 m)", "Снимки по годам вокруг точки (около 900 м)", "Yearly image strip around the point (about 900 m)"),
("Đường mùa vụ 6 kỳ (tái dựng từ PCA chuỗi năm)", "Сезонные кривые по 6 периодам (восстановлены из ГК годового ряда)", "Six-period seasonal curves (reconstructed from the annual PCA)"),
("một năm nổi bật", "один год выделен", "one year highlighted"),
("chồng các năm", "наложение лет", "years overlaid"),
("chuỗi liên tục các năm", "непрерывный ряд лет", "continuous multi-year series"),
("⤢ Phóng to", "⤢ Увеличить", "⤢ Enlarge"),
("Thống kê năm đang chọn", "Статистика выбранного года", "Statistics for the selected year"),
("Wayback không có ảnh ở đây cho bản đang chọn: đổi bản phát hành.", "В выбранном выпуске Wayback здесь нет снимка: выберите другой выпуск.", "Wayback has no imagery here for the selected release: pick another release."),
("Ảnh nền", "Подложка", "Basemap"),
("Wayback theo năm đang gán", "Wayback по году разметки", "Wayback for the labelled year"),
("Wayback bản cố định", "Wayback, фиксированный выпуск", "Wayback, fixed release"),
("Esri ảnh mới nhất", "Esri, новейшие снимки", "Esri, latest imagery"),
("không ảnh nền", "без подложки", "no basemap"),
("Lớp đối chiếu (năm đang gán)", "Опорные слои (год разметки)", "Reference layers (labelled year)"),
("nháy:", "мигание:", "blink:"),
("🖱 Thông tin điểm khi bấm lên bản đồ", "🖱 Информация о точке при клике по карте", "🖱 Point info on map click"),
("Chuột phải (giữ lâu trên điện thoại) cũng mở bảng này.", "Правый клик (долгое нажатие на телефоне) тоже открывает эту панель.", "Right-click (long press on a phone) opens it too."),
("⠿ Chọn vùng", "⠿ Выбор области", "⠿ Region tool"),
("Điểm mẫu", "Образцы", "Seeds"),
("Xoá mảng", "Удалить фрагмент", "Delete patch"),
("Giữ mảng", "Оставить фрагмент", "Keep patch"),
("Sửa ranh giới", "Правка границ", "Edit boundaries"),
("giản lược ranh giới", "упрощение границ", "boundary simplification"),
("điểm ảnh", "пикс.", "px"),
("Tìm", "Поиск", "Find"),
("Làm sạch", "Очистка", "Clean-up"),
("Mảng", "Фрагменты", "Patches"),
("Thống kê & lưu", "Статистика и сохранение", "Statistics & save"),
("Xoá điểm mẫu", "Удалить образцы", "Clear seeds"),
("Chọn lại", "Выбрать заново", "Recompute"),
("− Loại trừ", "− Исключение", "− Exclude"),
("Ngưỡng", "Порог", "Threshold"),
("Đặc trưng so sánh", "Признаки для сравнения", "Features compared"),
("Làm mịn", "Сглаживание", "Smoothing"),
("không", "нет", "none"),
('(bắt kiểu "làng xen vườn" thay vì từng mái nhà)', "(ловит тип «деревня среди садов», а не отдельные крыши)", '(captures "village among gardens" rather than single roofs)'),
("Phạm vi", "Область поиска", "Search scope"),
("vùng liền với điểm mẫu", "связная с образцами область", "area connected to the seeds"),
("mọi chỗ trong bán kính", "всё в радиусе", "everything within the radius"),
("mọi chỗ trong xã", "всё в общине", "everything in the commune"),
("mọi chỗ trong khung nhìn", "всё в окне просмотра", "everything in the view"),
("km · tầm", "км · охват", "km · reach"),
("chưa có ranh giới xã", "границы общин не загружены", "no commune boundaries"),
("Nạp ranh giới xã…", "Загрузить границы общин…", "Load commune boundaries…"),
("hiện", "показать", "show"),
("Trong xã: không chọn xã nào thì dùng các xã chứa điểm mẫu. Tầm: giới hạn tìm quanh điểm mẫu ở chế độ vùng liền.",
 "В общине: если общины не выбраны, берутся общины, содержащие образцы. Охват: предел поиска вокруг образцов в режиме связной области.",
 "In commune: if none is selected, the communes containing the seeds are used. Reach: search limit around the seeds in connected mode."),
("bỏ mảng <", "убрать фрагменты <", "drop patches <"),
("đ.ảnh · lấp lỗ ≤", "пикс. · заполнить дыры ≤", "px · fill holes ≤"),
("· nối khe", "· закрыть щели", "· close gaps"),
("Tìm mảng sai giống các mảng đã xoá", "Найти ошибочные фрагменты, похожие на удалённые", "Find wrong patches similar to the deleted ones"),
("phổ / embedding", "спектр / эмбеддинг", "spectrum / embedding"),
("hình dạng", "форма", "shape"),
("lớp bản đồ", "класс карты", "map class"),
("độ giống", "сходство", "similarity"),
("Xoá các mảng đã tick", "Удалить отмеченные", "Delete ticked patches"),
("Bỏ đánh dấu", "Снять отметки", "Clear marks"),
("tự tìm lại sau mỗi lần xoá", "искать заново после каждого удаления", "search again after each deletion"),
("hiện phần đã xoá (xám)", "показывать удалённое (серым)", "show deleted parts (grey)"),
("Bỏ mọi lần xoá", "Отменить все удаления", "Undo all deletions"),
("xếp theo", "сортировать по", "sort by"),
("diện tích", "площади", "area"),
("nghi sai", "подозрению на ошибку", "suspected error"),
("xa điểm mẫu", "удалённости от образцов", "distance from seeds"),
("kéo dài", "вытянутости", "elongation"),
("rê chuột lên dòng để thấy mảng trên bản đồ", "наведите курсор на строку, чтобы увидеть фрагмент на карте", "hover a row to see the patch on the map"),
("Thống kê theo ranh giới", "Статистика по границам", "Statistics by boundary"),
("(sau khi sửa ở công cụ", "(после правки инструментом", "(after editing with tool"),
("năm", "год", "year"),
("Lưu vùng", "Сохранить область", "Save region"),
("So sánh các năm", "Сравнить годы", "Compare years"),
("rải", "разместить", "scatter"),
("điểm", "точек", "points"),
("vào vùng", "в области", "in the region"),
("Vùng đã lưu (", "Сохранённые области (", "Saved regions ("),
("Bộ dữ liệu Hugging Face", "Набор данных Hugging Face", "Hugging Face dataset"),
("Nhánh / phiên bản", "Ветка / версия", "Branch / revision"),
("Hoặc địa chỉ gốc tự chọn", "Или собственный базовый адрес", "Or a custom base URL"),
("Các năm cần gán", "Годы разметки", "Years to label"),
("Tự sang năm sau khi gán", "Переходить к следующему году после разметки", "Advance to next year after labelling"),
("Hệ thống lớp", "Система классов", "Class system"),
("Tải hệ thống lớp JSON…", "Загрузить систему классов JSON…", "Load class system JSON…"),
("Lưu hệ thống lớp", "Сохранить систему классов", "Save class system"),
("Lưu và nạp lại", "Сохранить и перезагрузить", "Save and reload"),
("Đóng", "Закрыть", "Close"),
("Xuất và lưu", "Экспорт и сохранение", "Export and save"),
("CSV dạng dài (điểm × năm)", "CSV длинный (точка × год)", "Long CSV (point × year)"),
("CSV dạng rộng (mỗi điểm một dòng)", "CSV широкий (одна строка на точку)", "Wide CSV (one row per point)"),
("Tệp tiến độ JSON (đầy đủ, nhập lại được)", "Файл прогресса JSON (полный, можно загрузить снова)", "Progress file JSON (complete, re-importable)"),
("Vùng mẫu (GeoJSON)", "Эталонные области (GeoJSON)", "Sample regions (GeoJSON)"),
("Thống kê vùng mẫu (CSV)", "Статистика эталонных областей (CSV)", "Sample region statistics (CSV)"),
("Cách dùng", "Как пользоваться", "How to use"),
("Đường mùa vụ nhiều năm", "Сезонные кривые за несколько лет", "Multi-year seasonal curves"),
("điểm trước (p)", "предыдущая точка (p)", "previous point (p)"),
("điểm sau (n)", "следующая точка (n)", "next point (n)"),
("Ngôn ngữ / Язык / Language", "Ngôn ngữ / Язык / Language", "Ngôn ngữ / Язык / Language"),
("Tải tệp điểm CSV/GeoJSON hoặc tệp tiến độ JSON", "Открыть файл точек CSV/GeoJSON или файл прогресса JSON", "Open a CSV/GeoJSON point file or a JSON progress file"),
("Chọn cả vùng giống các điểm mẫu, thống kê, sửa ranh giới (phím o)", "Выбрать всю область, похожую на образцы, статистика, правка границ (клавиша o)", "Select the whole area similar to the seeds, statistics, boundary editing (key o)"),
("Bật để nhấp lên bản đồ thêm điểm mới (phím m)", "Включите, чтобы добавлять точки кликом по карте (клавиша m)", "Turn on to add new points by clicking the map (key m)"),
("đến mã…", "к коду…", "go to id…"),
("Chép nhãn năm trước sang năm này (c)", "Скопировать метку прошлого года в этот (c)", "Copy last year's label to this year (c)"),
("Điền nhãn năm này cho mọi năm sau chưa có nhãn (v)", "Проставить метку этого года всем следующим годам без метки (v)", "Fill this year's label into all later unlabelled years (v)"),
("Đánh dấu cần xem lại (f)", "Отметить на проверку (f)", "Flag for review (f)"),
("Xoá điểm thêm tay", "Удалить точку, добавленную вручную", "Delete a manually added point"),
("ghi chú cho điểm này", "заметка к этой точке", "note for this point"),
("cách xem các năm", "как показывать годы", "how to show the years"),
("chỉ số", "индекс", "index"),
("xem lớn", "крупно", "large view"),
("Ảnh nền và lớp đối chiếu", "Подложка и опорные слои", "Basemap and reference layers"),
("Thông tin điểm khi bấm lên bản đồ", "Информация о точке при клике по карте", "Point info on map click"),
("Thu gọn / mở rộng bảng", "Свернуть / развернуть панель", "Collapse / expand the panel"),
("kéo thanh này để dời bảng; nhấp đúp để về chỗ cũ", "перетащите эту полосу, чтобы сдвинуть панель; двойной клик возвращает на место", "drag this bar to move the panel; double-click to reset"),
("thu gọn / mở rộng bảng", "свернуть / развернуть панель", "collapse / expand the panel"),
("đóng (o)", "закрыть (o)", "close (o)"),
("nhấp: điểm mẫu cùng loại; Shift+nhấp: điểm loại trừ (phím 1)", "клик: образец того же типа; Shift+клик: исключение (клавиша 1)", "click: seed of the same type; Shift+click: exclusion (key 1)"),
("nhấp một mảng để xoá cả mảng (phím 2)", "клик по фрагменту удаляет его целиком (клавиша 2)", "click a patch to delete the whole patch (key 2)"),
("nhấp một mảng đúng để giữ (phím 3)", "клик по верному фрагменту оставляет его (клавиша 3)", "click a correct patch to keep it (key 3)"),
("đổi thành đa giác để sửa đỉnh, cắt, vẽ thêm (phím 4)", "перевести в полигоны для правки вершин, вырезания, дорисовки (клавиша 4)", "convert to polygons to edit vertices, cut, draw (key 4)"),
("hoàn tác (Z)", "отменить (Z)", "undo (Z)"),
("bật: nhấp đặt điểm khác loại (thay cho Shift+nhấp)", "включено: клик ставит исключающую точку (вместо Shift+клик)", "on: a click places an exclusion point (instead of Shift+click)"),
("siết (−)", "строже (−)", "tighter (−)"),
("nới (+)", "мягче (+)", "looser (+)"),
("ghi chú", "заметка", "note"),
("vd http://localhost:8000/ (để trống = Hugging Face)", "напр. http://localhost:8000/ (пусто = Hugging Face)", "e.g. http://localhost:8000/ (empty = Hugging Face)"),
("ảnh Esri mới nhất", "новейшие снимки Esri", "latest Esri imagery"),
("bản phát hành {d} (ảnh có thể chụp sớm hơn ngày này)", "выпуск {d} (снимок может быть сделан раньше этой даты)", "release {d} (imagery may predate this date)"),
("không đọc được {l}: {e}", "не удалось прочитать {l}: {e}", "cannot read {l}: {e}"),
("chưa nạp manifest", "manifest не загружен", "manifest not loaded"),
("không có năm {y}", "нет {y} года", "no {y}"),
("đã nạp manifest: {a} lớp đối chiếu, {b} bộ điểm", "manifest загружен: опорных слоёв {a}, наборов точек {b}", "manifest loaded: {a} reference layers, {b} point sets"),
("không nạp được manifest.json từ {src} ({e}). Vẫn gán nhãn được trên ảnh Wayback; kiểm tra Cài đặt.",
 "не удалось загрузить manifest.json из {src} ({e}). Размечать по снимкам Wayback можно; проверьте Настройки.",
 "could not load manifest.json from {src} ({e}). You can still label on Wayback imagery; check Settings."),
("không nạp được đường mùa vụ của {id}", "не удалось загрузить сезонные кривые набора {id}", "could not load the seasonal curves of {id}"),
("đã nạp {n} điểm của {id}", "загружено точек набора {id}: {n}", "loaded {n} points of {id}"),
("không nạp được {f}: {e}", "не удалось загрузить {f}: {e}", "could not load {f}: {e}"),
("(bấm để nạp)", "(нажмите, чтобы загрузить)", "(click to load)"),
("điểm thêm tay", "точки, добавленные вручную", "manually added points"),
("(chưa có bộ điểm)", "(нет наборов точек)", "(no point sets)"),
("năm này không nằm trong các năm cần gán (Cài đặt)", "этот год не входит в годы разметки (Настройки)", "this year is not among the years to label (Settings)"),
("mã đất", "код земель", "land-use code"),
("lớp tuỳ chọn, gộp vào {x}", "необязательный класс, объединяется с {x}", "optional class, merged into {x}"),
("thực vật", "растительность", "vegetation"),
("nước", "вода", "water"),
("xây dựng", "застройка", "built-up"),
("đất trống", "открытый грунт", "bare ground"),
("bộ", "набор", "set"),
("tầng", "страта", "stratum"),
("bản đồ CTX 2025", "карта CTX 2025", "CTX map 2025"),
("đổi lớp {n} lần", "смен класса: {n}", "class changes: {n}"),
("nhãn", "метка", "label"),
("tin cậy", "уверенность", "confidence"),
("gợi ý 3 lớp", "подсказка (3 класса)", "3-class hint"),
("chưa có nhãn năm này", "меток за этот год нет", "no labels for this year"),
("lớp chính dưới 50 điểm năm {y}: {l}", "основные классы с числом точек меньше 50 в {y} г.: {l}", "main classes with fewer than 50 points in {y}: {l}"),
("{a}/{b} điểm đủ nhãn {y0}-{y1} · {c} điểm có đổi lớp", "{a}/{b} точек размечены за {y0}-{y1} · со сменой класса: {c}", "{a}/{b} points fully labelled {y0}-{y1} · {c} with class change"),
("năm {y}", "{y} г.", "year {y}"),
("chưa gán", "не размечено", "unlabelled"),
("THÊM ĐIỂM: nhấp lên bản đồ", "ДОБАВЛЕНИЕ ТОЧЕК: кликните по карте", "ADD POINT: click the map"),
("lớp đối chiếu đang tắt (b)", "опорные слои скрыты (b)", "reference layers hidden (b)"),
("(cần manifest)", "(нужен manifest)", "(manifest needed)"),
("không có", "нет", "none"),
("không đọc được: ", "не удалось прочитать: ", "cannot read: "),
("năm {y} có {n} kỳ phải nội suy", "в {y} г. интерполировано периодов: {n}", "{y} has {n} interpolated periods"),
("kỳ", "период", "period"),
("th", "мес.", "mo."),
("trung vị", "медиана", "median"),
("bấm để chọn năm", "нажмите, чтобы выбрать год", "click to select the year"),
("đậm = năm {y}, nhạt = năm khác", "жирная линия = {y} г., бледные = другие годы", "bold = {y}, faint = other years"),
("trung vị các năm, lặp lại", "медиана по годам, повторяется", "median of all years, repeated"),
("năm lệch", "аномальный год", "anomalous year"),
("dải màu dưới trục: nhãn đã gán", "цветная полоса под осью: присвоенные метки", "colour strip under the axis: assigned labels"),
("{y} ({f} kỳ {k} {dir} trung vị {d})", "{y} ({f}, период {k}: {dir} медианы на {d})", "{y} ({f}, period {k}: {d} {dir} the median)"),
("thấp hơn", "ниже", "below"),
("cao hơn", "выше", "above"),
("Năm lệch khỏi quy luật mùa vụ của điểm:", "Годы, отклоняющиеся от сезонного хода точки:", "Years departing from the point's seasonal pattern:"),
("Không có năm nào lệch rõ khỏi quy luật mùa vụ của điểm.", "Явных отклонений от сезонного хода точки нет.", "No year departs clearly from the point's seasonal pattern."),
("tính sẵn, k = {k} PC", "рассчитано заранее, k = {k} ГК", "precomputed, k = {k} PCs"),
("đọc từ ảnh PC, k = {k}", "прочитано из снимков ГК, k = {k}", "read from PC images, k = {k}"),
("{n} năm", "лет: {n}", "{n} years"),
("2017-2018 ảnh S2 thưa, đường kém tin cậy", "в 2017-2018 гг. снимков S2 мало, кривые ненадёжны", "2017-2018 have sparse S2 imagery, curves are unreliable"),
("Đọc hình: nét đứt xám là trung vị các năm, tức quy luật mùa vụ của điểm; năm lệch xa là năm đổi lớp, năm ảnh xấu hoặc năm bất thường.",
 "Как читать: серая пунктирная линия показывает медиану по годам, то есть сезонный ход точки; сильно отклоняющийся год означает смену класса, плохие снимки или аномальный год.",
 "How to read: the grey dashed line is the median over years, i.e. the point's seasonal pattern; a year far from it is a class change, poor imagery or an unusual year."),
("đang đọc…", "чтение…", "reading…"),
('không có đường mùa vụ cho điểm này (chỉ có sẵn cho hai bộ điểm, hoặc khi bộ dữ liệu có lớp "pc").',
 "для этой точки нет сезонных кривых (они есть только для двух наборов точек или при наличии слоя «pc» в наборе данных).",
 'no seasonal curves for this point (available only for the two point sets, or when the dataset has a "pc" layer).'),
("📍 Toạ độ (vĩ độ, kinh độ): bôi đen hoặc bấm Chép", "📍 Координаты (широта, долгота): выделите или нажмите «Копировать»", "📍 Coordinates (latitude, longitude): select or press Copy"),
("Chép", "Копировать", "Copy"),
("Tra địa chỉ ngay tại đây", "Определить адрес здесь", "Look up the address here"),
("Mẹo: Google Earth có thanh lịch sử ảnh; Copernicus xem được ảnh Sentinel theo từng ngày; Wayback mở đúng bản ảnh nền đang xem.",
 "Совет: в Google Earth есть шкала истории снимков; в Copernicus можно смотреть снимки Sentinel по датам; Wayback открывает тот выпуск подложки, который показан сейчас.",
 "Tip: Google Earth has an imagery history slider; Copernicus shows Sentinel images by date; Wayback opens the basemap release now displayed."),
("đã chép toạ độ", "координаты скопированы", "coordinates copied"),
("đang tra…", "поиск…", "looking up…"),
("không tìm thấy địa chỉ", "адрес не найден", "no address found"),
("không tra được địa chỉ: ", "не удалось определить адрес: ", "address lookup failed: "),
("Thông tin điểm", "Информация о точке", "Point information"),
("bật thông tin điểm: chạm lên bản đồ để xem liên kết", "информация о точке включена: коснитесь карты, чтобы увидеть ссылки", "point info on: tap the map to see links"),
("tắt thông tin điểm", "информация о точке выключена", "point info off"),
("chọn một điểm trước", "сначала выберите точку", "select a point first"),
("năm trước chưa có nhãn", "у прошлого года нет метки", "the previous year has no label"),
("đã điền {n} năm", "заполнено лет: {n}", "filled {n} years"),
("chỉ xoá được điểm thêm tay", "удалять можно только точки, добавленные вручную", "only manually added points can be deleted"),
("Xoá điểm {id}?", "Удалить точку {id}?", "Delete point {id}?"),
("đã gộp tiến độ: {n} điểm mới, nhãn mới hơn được giữ", "прогресс объединён: новых точек {n}, сохранены более новые метки", "progress merged: {n} new points, newer labels kept"),
("đã nạp hệ thống lớp", "система классов загружена", "class system loaded"),
("không nhận ra định dạng tệp", "формат файла не распознан", "file format not recognised"),
("lỗi đọc tệp: ", "ошибка чтения файла: ", "file read error: "),
("không có mã {id}", "нет точки с кодом {id}", "no point with id {id}"),
("tuỳ chọn, gộp vào {x}", "необязательный, объединяется с {x}", "optional, merged into {x}"),
("phím", "клавиша", "key"),
("mã", "код", "code"),
("lớp", "класс", "class"),
("dấu hiệu", "дешифровочные признаки", "interpretation cues"),
("Đang mở bằng file://. Nếu lớp đối chiếu không hiện, mở qua máy chủ cục bộ (xem Cài đặt).",
 "Страница открыта через file://. Если опорные слои не отображаются, откройте её через локальный сервер (см. Настройки).",
 "Opened via file://. If reference layers do not appear, open the page through a local server (see Settings)."),
("{n} xã", "общин: {n}", "{n} communes"),
("chưa có ranh giới xã: ", "границ общин нет: ", "no commune boundaries: "),
("chưa có vùng: đặt điểm mẫu trước", "области ещё нет: сначала поставьте образцы", "no region yet: place seeds first"),
("đa giác", "полигонов", "polygons"),
("mảng", "фрагментов", "patches"),
("xoá {n}", "удалено {n}", "deleted {n}"),
("giữ {n}", "оставлено {n}", "kept {n}"),
("mẫu", "образцов", "seeds"),
("điểm mẫu", "образцов", "seeds"),
("Tính lại vùng sẽ bỏ các chỉnh sửa ranh giới chưa lưu. Tiếp tục?", "Пересчёт области отменит несохранённую правку границ. Продолжить?", "Recomputing the region discards unsaved boundary edits. Continue?"),
("không có mảng nào ở chỗ này", "здесь нет фрагмента", "no patch here"),
("giữ", "оставить", "keep"),
("chưa có xã: nạp ranh giới xã, hoặc đặt điểm mẫu trong một xã", "нет общин: загрузите границы общин или поставьте образцы внутри общины", "no commune: load commune boundaries or place seeds inside a commune"),
("lớp {l} không có năm {y}", "в слое {l} нет {y} года", "layer {l} has no {y}"),
("nhấp lên bản đồ để đặt điểm mẫu", "кликните по карте, чтобы поставить образцы", "click the map to place seeds"),
("chọn ít nhất một lớp đặc trưng", "выберите хотя бы один слой признаков", "select at least one feature layer"),
("đang đọc ảnh…", "чтение снимков…", "reading images…"),
("lỗi: ", "ошибка: ", "error: "),
("điểm mẫu rơi vào chỗ không có dữ liệu", "образцы попали туда, где нет данных", "the seeds fall where there are no data"),
("không còn gì để hoàn tác", "отменять больше нечего", "nothing left to undo"),
("đã hoàn tác", "отменено", "undone"),
("chưa có mảng nghi sai", "подозрительных фрагментов нет", "no suspected patches"),
("giống mảng xoá", "сходство с удалёнными", "similar to deleted"),
("đúng", "верно", "correct"),
("và {n} mảng nữa", "и ещё фрагментов: {n}", "and {n} more patches"),
("chưa tick mảng nào", "ни один фрагмент не отмечен", "no patch ticked"),
("xa mẫu", "удал. от образцов", "dist. to seeds"),
("xoá", "удалить", "delete"),
("bỏ giữ", "не оставлять", "unkeep"),
("hiện 80 / {n} mảng", "показано 80 из {n} фрагментов", "showing 80 of {n} patches"),
("{n} điểm ảnh {r} m", "{n} пикселей {r} м", "{n} pixels of {r} m"),
("{n} mảng (lớn nhất {a} ha)", "фрагментов: {n} (крупнейший {a} га)", "{n} patches (largest {a} ha)"),
("diện tích đa giác trên mặt cầu {a} ha", "площадь полигонов на сфере {a} га", "polygon area on the sphere {a} ha"),
("Theo xã", "По общинам", "By commune"),
("chưa có vùng tự động: đặt điểm mẫu trước", "автоматической области нет: сначала поставьте образцы", "no automatic region: place seeds first"),
("{n} đa giác, {v} đỉnh", "полигонов: {n}, вершин: {v}", "{n} polygons, {v} vertices"),
("(nhiều đỉnh: tăng giản lược cho dễ sửa)", "(много вершин: увеличьте упрощение для удобной правки)", "(many vertices: increase simplification for easier editing)"),
("Không nạp được công cụ sửa (Leaflet-Geoman): vẫn xoá, giữ, lưu và xuất được.", "Не удалось загрузить инструмент правки (Leaflet-Geoman): удалять, оставлять, сохранять и экспортировать по-прежнему можно.", "The editing tool (Leaflet-Geoman) did not load: deleting, keeping, saving and exporting still work."),
("chưa có ranh giới: chọn công cụ ④ trước", "границ нет: сначала выберите инструмент ④", "no boundary: choose tool ④ first"),
("đang tính theo ranh giới…", "расчёт по границам…", "computing by boundary…"),
("đã sửa", "исправлено", "edited"),
("sửa", "править", "edit"),
("chưa có", "нет", "none"),
("đang sửa vùng {id}: sửa xong bấm Thống kê theo ranh giới rồi Lưu vùng (ghi đè {id})", "правка области {id}: после правки нажмите «Статистика по границам», затем «Сохранить область» (перезапишет {id})", "editing region {id}: when done press Statistics by boundary, then Save region (overwrites {id})"),
("Xoá vùng {id}?", "Удалить область {id}?", "Delete region {id}?"),
("đã lưu vùng {id}: {ma}, {y}, {a} ha", "область {id} сохранена: {ma}, {y}, {a} га", "region {id} saved: {ma}, {y}, {a} ha"),
("đặt điểm mẫu trước", "сначала поставьте образцы", "place seeds first"),
("đang tính…", "расчёт…", "computing…"),
("so sánh: năm {y}…", "сравнение: {y} г.…", "comparing: {y}…"),
("% xây dựng / thực vật", "% застройки / растительности", "% built-up / vegetation"),
("điểm mẫu lấy đặc trưng ở năm {y}, áp cho mọi năm; mảng đã xoá cũng bị bỏ ở mọi năm. Nhấp một dòng để xem vùng của năm đó.",
 "признаки образцов взяты за {y} г. и применены ко всем годам; удалённые фрагменты исключены во всех годах. Кликните строку, чтобы увидеть область того года.",
 "seed features are taken from {y} and applied to every year; deleted patches are excluded in every year. Click a row to view that year's region."),
("đang xem vùng năm {y} (chọn lại để về năm {z})", "показана область {y} г. (выберите заново, чтобы вернуться к {z} г.)", "viewing the {y} region (recompute to return to {z})"),
("so sánh {n} năm xong", "сравнение {n} лет завершено", "compared {n} years"),
("chưa có vùng", "области нет", "no region"),
("rải từ vùng chọn ({ma})", "размещена из выбранной области ({ma})", "scattered from the selected region ({ma})"),
('đã rải {n} điểm vào vùng, nhãn {ma} cho năm {y} (bộ điểm "vung"); kiểm lại từng điểm', "в области размещено точек: {n}, метка {ma} за {y} г. (набор «vung»); проверьте каждую точку", 'scattered {n} points in the region, label {ma} for {y} (point set "vung"); check each point'),
("đã nạp {n} xã từ {f}", "загружено общин: {n} из {f}", "loaded {n} communes from {f}"),
("đã nạp {n} vùng mẫu", "загружено эталонных областей: {n}", "loaded {n} sample regions"),
("đang ở bước sửa ranh giới: về công cụ ① và Chọn lại trước", "идёт правка границ: сначала вернитесь к инструменту ① и выберите заново", "boundary editing in progress: go back to tool ① and recompute first"),
("Bỏ cả {n} lần xoá mảng?", "Отменить все удаления фрагментов ({n})?", "Undo all {n} patch deletions?"),
("CHỌN VÙNG: 1 mẫu · 2 xoá mảng · 3 giữ · 4 sửa · Z hoàn tác · S tìm mảng sai", "ВЫБОР ОБЛАСТИ: 1 образцы · 2 удалить фрагмент · 3 оставить · 4 правка · Z отмена · S поиск ошибок", "REGION TOOL: 1 seeds · 2 delete patch · 3 keep · 4 edit · Z undo · S find wrong"),
("Nhấp: điểm mẫu cùng loại · Shift+nhấp: điểm khác loại (loại trừ) · nhấp lại điểm mẫu để bỏ · + / − chỉnh ngưỡng · chuột phải vào mảng: xoá nhanh",
 "Клик: образец того же типа · Shift+клик: другой тип (исключение) · повторный клик по образцу убирает его · + / − порог · правый клик по фрагменту: быстрое удаление",
 "Click: seed of the same type · Shift+click: other type (exclusion) · click a seed again to remove it · + / − threshold · right-click a patch: quick delete"),
("Nhấp vào một mảng để xoá CẢ mảng. Mảng đã xoá được nhớ: chỉnh ngưỡng không làm nó quay lại. Phím S: tìm các mảng giống mảng đã xoá.",
 "Клик по фрагменту удаляет ВЕСЬ фрагмент. Удалённое запоминается: изменение порога его не вернёт. Клавиша S: найти фрагменты, похожие на удалённые.",
 "Click a patch to delete the WHOLE patch. Deletions are remembered: changing the threshold will not bring it back. Key S: find patches similar to the deleted ones."),
("Nhấp vào mảng ĐÚNG để giữ (xanh lá): không bị gợi ý xoá và làm mốc cho việc tìm mảng sai. Nhấp lại để bỏ giữ. (Ở mọi công cụ: Shift+chuột phải = giữ.)",
 "Клик по ВЕРНОМУ фрагменту оставляет его (зелёный): он не предлагается к удалению и служит эталоном при поиске ошибок. Повторный клик снимает отметку. (В любом инструменте: Shift+правый клик = оставить.)",
 "Click a CORRECT patch to keep it (green): it is never suggested for deletion and serves as reference when finding wrong patches. Click again to unkeep. (Any tool: Shift+right-click = keep.)"),
("Thanh công cụ bên trái bản đồ: sửa đỉnh, cắt bớt, xoá, vẽ thêm. Xong bấm Thống kê theo ranh giới (thẻ Thống kê & lưu).",
 "Панель инструментов слева на карте: правка вершин, вырезание, удаление, дорисовка. Затем нажмите «Статистика по границам» (вкладка «Статистика и сохранение»).",
 "Toolbar on the left of the map: edit vertices, cut, delete, draw. Then press Statistics by boundary (Statistics & save tab)."),
("🗺 Google Maps (bản đồ)", "🗺 Google Maps (карта)", "🗺 Google Maps (map)"),
("🛰 Google Maps (ảnh vệ tinh)", "🛰 Google Maps (спутниковый снимок)", "🛰 Google Maps (satellite)"),
("🧍 Google Street View 360°", "🧍 Google Street View 360°", "🧍 Google Street View 360°"),
("🌍 Google Earth (3D, lịch sử ảnh)", "🌍 Google Earth (3D, история снимков)", "🌍 Google Earth (3D, imagery history)"),
("🕰 Esri Wayback (bản phát hành đang xem)", "🕰 Esri Wayback (показанный выпуск)", "🕰 Esri Wayback (release on screen)"),
("🛰 Copernicus Browser (Sentinel-2, mùa khô năm {y})", "🛰 Copernicus Browser (Sentinel-2, сухой сезон {y} г.)", "🛰 Copernicus Browser (Sentinel-2, dry season {y})"),
("🅱 Bing Maps (ảnh vệ tinh)", "🅱 Bing Maps (спутниковый снимок)", "🅱 Bing Maps (aerial)"),
("🟡 Yandex Maps (ảnh vệ tinh)", "🟡 Яндекс Карты (спутник)", "🟡 Yandex Maps (satellite)"),
("🗾 OpenStreetMap", "🗾 OpenStreetMap", "🗾 OpenStreetMap"),
("🏠 Tra ĐỊA CHỈ của điểm (OSM)", "🏠 Определить АДРЕС точки (OSM)", "🏠 Look up the ADDRESS (OSM)"),
("📌 Wikimapia (mô tả từ cộng đồng)", "📌 Wikimapia (описания от сообщества)", "📌 Wikimapia (community descriptions)"),
("tự động", "автоматически", "automatic"),
("theo ranh giới đã sửa", "по исправленным границам", "by edited boundary"),
("theo ranh giới", "по границам", "by boundary"),
("Hệ thống lớp", "Система классов", "Class system"),
("chọn ít nhất một nhóm tiêu chí", "выберите хотя бы одну группу критериев", "select at least one criterion group"),
("chưa xoá mảng nào với bộ đặc trưng này: xoá vài mảng sai trước (công cụ ②)", "с этим набором признаков ещё ничего не удалено: сначала удалите несколько ошибочных фрагментов (инструмент ②)", "nothing deleted yet with this feature set: delete a few wrong patches first (tool ②)"),
("không có mảng nào đủ giống các mảng đã xoá", "нет фрагментов, достаточно похожих на удалённые", "no patch is similar enough to the deleted ones"),
]
MADAT = {  # mã đất: giữ mã, dịch phần chú thích
 "N1": ("SON, MNC, каналы DTL", "SON, MNC, DTL canals"),
 "N3": ("прибрежные воды (учитываются отдельно)", "coastal waters (counted separately)"),
 "T3": ("CLN, общественное озеленение", "CLN, public green space"),
 "T4": ("RDD, RPH, RSX (кроме мангровых)", "RDD, RPH, RSX (except mangroves)"),
 "T5": ("RPH прибрежные", "coastal RPH"),
 "X1": ("ODT, TMD, земли общественных объектов и учреждений", "ODT, TMD, public-works and service land"),
 "X3": ("SKK, SKN, SKC; земли портов, складов", "SKK, SKN, SKC; port and warehouse land"),
 "D1": ("земли в застройке, BCS", "land under construction, BCS"),
 "D3": ("BCS прибрежные", "coastal BCS"),
}

RE = {  # mẫu cho chuỗi động chưa đổi sang T(): [regex, thay]
 "ru": [["^đang xem vùng năm (\\d+): bấm Chọn lại để sửa$", "показана область $1 г.: нажмите «Выбрать заново», чтобы править"],
        ["^đã xoá (\\d+) mảng \\(Z để hoàn tác\\)$", "удалено фрагментов: $1 (Z: отменить)"],
        ["^(\\d+) mảng nghi sai \\(cam\\): xem lại, bỏ tick mảng đúng, rồi Xoá các mảng đã tick \\(Enter\\)$",
         "подозрительных фрагментов: $1 (оранжевые): проверьте, снимите отметку с верных и нажмите «Удалить отмеченные» (Enter)"],
        ["^lưới (\\d+)×(\\d+)$", "сетка $1×$2"],
        ["^ranh giới (\\d+) đa giác$", "границы: полигонов $1"],
        ["^lỗi: (.*)$", "ошибка: $1"],
        ["^(\\d+) điểm ứng viên phân tầng \\(lớp CTX 2025 × cụm PCA\\)$", "$1 точек-кандидатов (страты: класс CTX 2025 × кластер PCA)"]],
 "en": [["^đang xem vùng năm (\\d+): bấm Chọn lại để sửa$", "viewing the $1 region: press Recompute to edit"],
        ["^đã xoá (\\d+) mảng \\(Z để hoàn tác\\)$", "deleted $1 patches (Z to undo)"],
        ["^(\\d+) mảng nghi sai \\(cam\\): xem lại, bỏ tick mảng đúng, rồi Xoá các mảng đã tick \\(Enter\\)$",
         "$1 suspected patches (orange): review, untick the correct ones, then Delete ticked patches (Enter)"],
        ["^lưới (\\d+)×(\\d+)$", "grid $1×$2"],
        ["^ranh giới (\\d+) đa giác$", "boundary: $1 polygons"],
        ["^lỗi: (.*)$", "error: $1"],
        ["^(\\d+) điểm ứng viên phân tầng \\(lớp CTX 2025 × cụm PCA\\)$", "$1 stratified candidate points (CTX 2025 class × PCA cluster)"]],
}
LOP = {  # tên và dấu hiệu tiếng Anh; tiếng Nga lấy tên từ he_lop_v1.json (trường ru), dấu hiệu dịch ở đây
 "N1": ("Rivers, canals, lakes, special-use water", "Water all year: MNDWI high in all 6 periods; linear shape (rivers, canals) or lakes with natural shores.",
        "Вода круглый год: MNDWI высокий во всех 6 периодах; линейная форма (реки, каналы) или озёра с естественными берегами."),
 "N2": ("Aquaculture ponds", "Regular square ponds with dikes; drained in some periods (MNDWI drops in 1-2 periods), common on the Cat Hai, Tien Lang, Kien Thuy coast.",
        "Правильные квадратные пруды с валами; осушаются в отдельные периоды (MNDWI падает в 1-2 периодах), много на побережье Катхай, Тиенланг, Киентхуй."),
 "N3": ("Sea, estuaries, flooded tidal flats", "Saline water, large estuaries; shoreline changes with the tide. Sample only when the map must cover the coast.",
        "Солёная вода, крупные эстуарии; берег меняется с приливом. Брать только если карта должна покрывать побережье."),
 "T1": ("Paddy rice", "Two crops: flooded at crop start (MNDWI up in periods 1-2 and 6-7), NDVI with two peaks; small regular fields.",
        "Два урожая: затопление в начале сезона (MNDWI растёт в периодах 1-2 и 6-7), NDVI с двумя пиками; мелкие правильные поля."),
 "T2": ("Other annual crops, vegetables", "A bare season then green, but not flooded like rice. Small area (about 2 % by the inventory).",
        "Сезон открытой почвы, затем зелень, но без затопления, как у риса. Площадь мала (около 2 % по инвентаризации)."),
 "T3": ("Perennial crops, gardens, urban greenery, shrubs and grass", "Green almost all year, uneven canopy; orchards, parks, grassland, shrubs.",
        "Зелень почти круглый год, неровный полог; сады, парки, луга, кустарники."),
 "T4": ("Forest (terrestrial)", "Closed, dark canopy, green all year; Cat Ba limestone hills, plantations of Thuy Nguyen, Kinh Mon.",
        "Сомкнутый тёмный полог, зелёный круглый год; известняковые массивы Катба, лесопосадки Тхуингуен, Киньмон."),
 "T5": ("Mangroves", "Dark green canopy at the tidal edge and in estuaries (Do Son, Tien Lang, Cat Hai); do not confuse with orchards.",
        "Тёмно-зелёный полог у кромки прилива и в эстуариях (Дошон, Тиенланг, Катхай); не путать с садами."),
 "X1": ("Urban, commercial, public", "Dense roofs, few trees; old urban core and new urban areas. Functions (administrative, tourism) are NOT separable from imagery.",
        "Плотная кровля, мало деревьев; старое ядро и новые городские кварталы. Функции (административная, туристическая) по снимку НЕ разделяются."),
 "X2": ("Rural settlement among gardens", "Houses among orchards and ponds; village strips along roads. This is where the embedding map errs most (vegetation called built-up).",
        "Дома среди садов и прудов; деревни вдоль дорог. Именно здесь карта на эмбеддинге ошибается чаще всего (растительность как застройка)."),
 "X3": ("Industry, ports, warehouses", "Large uniform roofs (blue, white), container yards, piers; Dinh Vu, Nam Cau Kien, Lach Huyen industrial zones.",
        "Крупные однородные крыши (синие, белые), контейнерные площадки, причалы; промзоны Диньву, Намкаукиен, Лачхуен."),
 "X4": ("Transport (major roads, airport)", "Only when the point lies FULLY on a road wider than 20 m (expressways, Cat Bi airport); small roads are mixed pixels.",
        "Только если точка ЦЕЛИКОМ на дороге шире 20 м (скоростные дороги, аэропорт Катби); узкие дороги дают смешанные пиксели."),
 "D1": ("Bare ground, construction sites, land fill", "Bare soil, fill sand, construction sites. A TRANSITIONAL STATE: essential for change detection.",
        "Открытый грунт, намывной песок, стройплощадки. ПЕРЕХОДНОЕ СОСТОЯНИЕ: очень важно для выявления изменений."),
 "D2": ("Rock outcrops, quarries", "Bare limestone, quarry pits (Trang Kenh, Minh Duc, Kinh Mon); bright, almost no vegetation.",
        "Голый известняк, карьеры (Трангкень, Миньдык, Киньмон); яркие, почти без растительности."),
 "D3": ("Beaches, sandbanks, exposed tidal flats", "Beach sand (Do Son, Cat Ba), estuary banks exposed at low tide.",
        "Морской песок (Дошон, Катба), отмели в устьях, обнажающиеся при отливе."),
 "U": ("Unclear (imagery exists but cannot be interpreted)", "", ""),
 "M": ("No clear imagery for this year", "", ""),
}
LOP_RU_TEN = {"U": "Неясно (снимок есть, но не дешифрируется)", "M": "Нет чёткого снимка за этот год"}
LAYER = {
 "ru": {"s2tc": "S2 в естественных цветах (композит сухого сезона)", "s2sw": "S2 B11-B8-B4 (застройка розово-фиолетовая, растительность зелёная, вода чёрная)",
        "pca": "ГК годового ряда PC1-PC3 (цвет = тип сезонности)", "emb": "Эмбеддинг dil_AB, 3 главные компоненты",
        "lulc_ctx": "Карта 3 классов CTX (стабилизированная)", "lulc_ctxts": "Карта 3 классов CTX+TS (E6)",
        "__pc": "PC{n} годового ряда (красный +, синий −, белый 0)", "__emb": "Эмбеддинг {e}, компоненты {t}"},
 "en": {"s2tc": "S2 natural colour (dry-season composite)", "s2sw": "S2 B11-B8-B4 (built-up pink-violet, vegetation green, water black)",
        "pca": "Annual PCA PC1-PC3 (colour = seasonal type)", "emb": "Embedding dil_AB, 3 principal components",
        "lulc_ctx": "3-class CTX map (stabilised)", "lulc_ctxts": "3-class CTX+TS map (E6)",
        "__pc": "PC{n} of the annual series (red +, blue −, white 0)", "__emb": "Embedding {e}, components {t}"},
}
PS = {"900 điểm kiểm định E0 (gợi ý = nhãn 3 lớp cũ)": ("900 контрольных точек E0 (подсказка = прежняя метка 3 классов)", "900 E0 validation points (hint = old 3-class label)")}
SCHEME = {
 "ru": {"ten": "Система классов для многолетней выборки Хайфона, версия 1 (12 основных + 3 необязательных класса)",
        "ghi_chu": "Уровень 2 объединяется в уровень 1 (N, T, X, D). N, T, X совпадают с 3 классами статьи об эмбеддингах (вода 2, растительность 1, застройка 3); D: новый четвёртый класс (открытый грунт, скалы, песок). Необязательный класс объединяется с классом из «gop_vao», если точек меньше 50 в год. Коды земель служат для сверки с инвентаризацией и требуют проверки по действующему регламенту."},
 "en": {"ten": "Hai Phong multi-year sampling class system, version 1 (12 main + 3 optional classes)",
        "ghi_chu": "Level 2 merges into level 1 (N, T, X, D). N, T, X match the 3 classes of the embedding paper (water 2, vegetation 1, built-up 3); D is a new fourth class (bare ground, rock, sand). An optional class is merged into the class in 'gop_vao' if it has fewer than 50 points a year. Land-use codes are for comparison with the inventory and must be checked against the current regulation."},
}
HTML = {
 "ru": {
  "vgKhungMoTa": "Удалите несколько ошибочных фрагментов инструментом <kbd>2</kbd> (лучше также оставить несколько верных инструментом <kbd>3</kbd>), затем нажмите «Поиск»: фрагменты, похожие на удалённые, станут оранжевыми.",
  "setNote": "Страница читает <code>manifest.json</code> набора данных, чтобы узнать опорные слои и наборы точек. Набор данных должен быть открытым. Если браузер блокирует чтение при открытии через <code>file://</code>, запустите <code>python -m http.server</code> в папке со страницей и откройте <code>http://localhost:8000/LAY_MAU_DA_NAM.html</code>.",
  "expNote": "Страница сохраняет работу в браузере после каждого действия, но память браузера может быть очищена. <b>Регулярно экспортируйте файл прогресса JSON.</b> Загрузите его кнопкой «Открыть файл…», чтобы продолжить или объединить прогресс нескольких исполнителей (побеждает более новая метка).",
  "helpBody": """<ol class="sm">
    <li>Выберите набор точек (900 точек E0 или точки-кандидаты) или включите <b>Добавить точку</b> и кликните по карте. Точка ставится точно в центр пикселя 10 м сетки Sentinel-2; красный квадрат показывает этот пиксель, жёлтый: блок 3 × 3.</li>
    <li>Год выбирается клавишами <kbd>←</kbd> <kbd>→</kbd>. Подложка Wayback сама переключается на выпуск, ближайший к этому году (дата выпуска означает дату публикации, снимок может быть старше). Опорные слои включаются на панели справа; <kbd>b</kbd>: мигание.</li>
    <li>Клавиша класса присваивает его выбранному году, после чего страница переходит к следующему году. <kbd>c</kbd>: как в прошлом году, <kbd>v</kbd>: заполнить следующие годы. Если за год нет чёткого снимка, ставьте <b>M</b>; если снимок есть, но не читается, ставьте <b>U</b>. Не угадывайте.</li>
    <li>Полоса снимков по годам и кривые NDVI, MNDWI по 6 периодам показывают момент смены класса и тип сезонности (рис: MNDWI растёт в периодах 1 и 4, у NDVI два пика; пруд: MNDWI высокий, падает при осушении).</li>
    <li>Регулярно экспортируйте файл прогресса JSON.</li>
    <li><b>Выбор области</b> (<kbd>o</kbd>): кликните несколько образцов (например, сельские крыши), Shift+клик по другому типу исключает его. Инструмент находит все пиксели, похожие на образцы, по выбранным слоям признаков (эмбеддинг g7, ГК, снимки S2) в пределах области поиска: связная область, радиус, община или окно просмотра. Порог можно ослабить или ужесточить. Статистика: площадь, число фрагментов, по общинам, состав по карте. Инструмент <kbd>4</kbd> переводит область в полигоны для правки (вершины, вырезание, удаление, дорисовка), затем «Статистика по границам». «Сохранить область» присваивает класс и год; «Сравнить годы» применяет те же образцы ко всем годам; «разместить точки» создаёт в области точки с готовой меткой для проверки.
      В режиме выбора области: <kbd>1</kbd> образцы, <kbd>2</kbd> удалить фрагмент целиком (клик по фрагменту), <kbd>3</kbd> оставить верный фрагмент, <kbd>4</kbd> правка границ,
      <kbd>Z</kbd> отмена, <kbd>S</kbd> найти фрагменты, похожие на удалённые (оранжевые), <kbd>Enter</kbd> удалить отмеченные, <kbd>+</kbd>/<kbd>−</kbd> порог, <kbd>Esc</kbd> к образцам.
      В любом инструменте: правый клик по фрагменту быстро удаляет его, Shift+правый клик оставляет. Панель перетаскивается за заголовок.</li>
    <li><b>Сезонные кривые за несколько лет</b>: режим «наложение лет» рисует каждый год своим цветом; серая пунктирная линия и бледная полоса показывают медиану ± разброс по годам, то есть сезонный ход точки; явно отклоняющиеся годы помечены ⚠. «Непрерывный ряд лет» соединяет 6 периодов всех лет в одну временную ось: цветная полоса под осью показывает присвоенные метки, оранжевый фон отмечает годы с интерполяцией. Клик по году выбирает его; <b>⤢ Увеличить</b> открывает крупный вид.</li>
    <li><b>Внешние ссылки</b>: раздел «Внешние ссылки для этой точки» открывает Google Maps, спутниковый снимок, Street View, Google Earth (с историей снимков), Esri Wayback с показанным выпуском, Copernicus (Sentinel-2 сухого сезона выбранного года), Bing, Яндекс, OpenStreetMap, определение адреса, Wikimapia. Сайты со значком 📍 ставят метку точно в точку; сайты со значком ⌖ метку не принимают: точка в центре экрана, а координаты уже скопированы для вставки в поиск сайта. Включите «Информация о точке при клике по карте» или нажмите правую кнопку, чтобы получить ссылки для любого места.</li>
    <li><b>Новый набор точек</b> (＋ Новый набор): регулярная сетка, стратифицированная сетка, случайные точки с минимальным расстоянием или стратифицированная случайная выборка по карте классов (n точек на класс; класс карты записывается в «страту» и «подсказку 3 классов»); область: вид карты, нарисованный прямоугольник, общины, весь город или сохранённая область. У каждого набора свои годы разметки (включая 2026 или другой год); кнопка ⚙ меняет годы выбранного набора, переименовывает или удаляет свой набор. Точки всегда ставятся в центр пикселя 10 м.</li>
    <li><b>Компоновка</b>: список вверху панели переносит снимки по годам и графики в <b>колонку справа</b> или в <b>полосу под картой</b>, чтобы видеть их вместе с кнопками классов без прокрутки. Кнопка ▾ сворачивает панель подложки.</li>
    <li><b>S2 10 каналов</b> (первый слой в списке, нужен слой <code>s2d</code> в наборе данных): любой цветной синтез, индексы NDVI, NDWI, MNDWI, NDBI, BSI или <b>CTX</b> (среднее, СКО в окне 5 × 5 или 15 × 15), рассчитанные прямо в браузере по исходному 10-канальному снимку; CTX считается при масштабе 13 и крупнее. Растяжка фиксированная, одинаковая для всех лет. Слой можно выбрать и для снимков по годам.</li>
    <li><b>График по годам</b> (вариант «значения пикселя по годам»): по одному значению за год для PC1-5, компонент эмбеддинга, 10 каналов S2, 5 индексов или 40 признаков CTX точно в пикселе; CTX и индексы рассчитаны как в классификаторе. Нажатие на название линии скрывает или показывает её, «z» сравнивает форму; годы, выпадающие из ряда (нужно не менее 4 лет), подсвечены красным, под осью показаны метки и карты классов. Вариант «сезонность, 6 периодов» теперь доступен для всех 10 каналов, а не только NDVI, MNDWI.</li>
    <li><b>Выбор области для нескольких классов</b>: выберите класс в ряду цветных кнопок перед щелчками по образцам; смените класс и продолжайте для другого. Каждый пиксель относится к классу с наиболее похожим образцом (если ниже порога), поэтому области классов не перекрываются. Таблица под кнопками даёт площадь каждого класса; щелчок по строке (или по фрагменту этого класса инструментом удаления, сохранения) переключает работу на этот класс. «Сравнить годы» даёт площади всех классов по годам; «Сохранить все классы» сохраняет по области на класс.</li>
    <li><b>Подложка без белых плиток</b>: если в выбранном выпуске Wayback нет детального снимка на текущем масштабе, страница берёт плитку более мелкого масштаба того же выпуска, вырезает нужную часть и увеличивает с интерполяцией (мутнее, но это снимок того же выпуска); строка под подложкой показывает, с какого уровня идёт увеличение.</li>
    <li><b>OpenStreetMap</b>: в панели подложки включите темы (землепользование, природа, вода, реки и каналы, дороги, здания, точки интереса). Источник «загружено заранее на Hugging Face» читает файлы FlatGeobuf по виду карты (их можно скачать и открыть в QGIS); источник «Overpass напрямую» запрашивает OSM для вида карты. Цвет соответствует предлагаемому классу. Щелчок по объекту показывает теги, ссылки на OSM и редактор iD. «Панель OSM…»: <b>фильтр</b> выражением (напр. <code>landuse=industrial</code>, <code>building</code>, <code>water=pond|fishpond</code>, <code>name~Cát</code>, <code>@lop=X3</code>) с числом и площадью; <b>правка</b> тегов и геометрии (только в браузере, экспорт GeoJSON); <b>выборка</b>: точки раскладываются в полигонах, прошедших фильтр, класс по редактируемой таблице соответствия, можно сразу присвоить метки с низкой уверенностью. Данные © OpenStreetMap contributors, ODbL.</li>
    <li><b>Планирование</b>: во внешних ссылках добавлен портал планирования Хайфона, открывается в точке.</li>
    <li><b>Сообщение об ошибке</b> (🐞): опишите проблему; страница прикладывает техническую информацию (версия, данные, последние ошибки, без ваших меток) и открывает письмо администратору страницы, либо копирует текст.</li>
    <li><b>Телефон</b>: панель управления представляет собой выдвижную шторку внизу экрана; касание верхней полосы сворачивает, открывает наполовину или полностью, её можно тянуть. Кнопка 🗂 открывает подложку и опорные слои, ⓘ включает информацию о точке, ☰ меняет размер шторки. В выборе области кнопка «− Исключение» заменяет Shift+клик; долгое нажатие на фрагмент быстро удаляет его.</li>
    <li><b>Язык</b>: выбирается вверху панели (Tiếng Việt, Русский, English); по умолчанию английский; можно открыть сразу с <code>?lang=vi</code>, <code>?lang=ru</code> или <code>?lang=en</code>.</li>
  </ol>
  <p class="sm"><b>Клавиши:</b> <kbd>n</kbd>/<kbd>p</kbd> следующая/предыдущая точка, <kbd>←</kbd>/<kbd>→</kbd> год, <kbd>c</kbd> как в прошлом году, <kbd>v</kbd> заполнить далее, <kbd>f</kbd> на проверку, <kbd>g</kbd> к точке, <kbd>b</kbd> мигание опорных слоёв, <kbd>m</kbd> режим добавления точек, <kbd>Shift</kbd>+1/2/3 уверенность, <kbd>Backspace</kbd> удалить метку этого года.</p>"""},
 "en": {
  "vgKhungMoTa": "Delete a few wrong patches with tool <kbd>2</kbd> (keeping a few correct ones with <kbd>3</kbd> helps), then press Find: patches similar to the deleted ones turn orange.",
  "setNote": "The page reads the dataset's <code>manifest.json</code> to learn the reference layers and point sets. The dataset must be public. If the browser blocks reading when opened via <code>file://</code>, run <code>python -m http.server</code> in the page's folder and open <code>http://localhost:8000/LAY_MAU_DA_NAM.html</code>.",
  "expNote": "The page saves to the browser after every action, but browser storage can be cleared. <b>Export the JSON progress file regularly.</b> Load it with \"Open file…\" to continue or to merge the progress of several people (the newer label wins).",
  "helpBody": """<ol class="sm">
    <li>Choose a point set (900 E0 points or candidate points), or turn on <b>Add point</b> and click the map. Points snap to the centre of the 10 m Sentinel-2 pixel; the red square is that pixel, the yellow one the 3 × 3 block.</li>
    <li>Change the year with <kbd>←</kbd> <kbd>→</kbd>. The Wayback basemap switches to the release nearest that year (the date is the release date; imagery may be older). Reference layers are in the right-hand panel; <kbd>b</kbd> blinks them.</li>
    <li>Press a class key to assign it to the selected year; the page moves to the next year. <kbd>c</kbd> copies the previous year, <kbd>v</kbd> fills later years. With no clear image use <b>M</b>; with an unreadable image use <b>U</b>. Do not guess.</li>
    <li>The yearly image strip and the 6-period NDVI, MNDWI curves show when the class changed and the seasonal type (rice: MNDWI up in periods 1 and 4, NDVI with two peaks; pond: MNDWI high, dropping when drained).</li>
    <li>Export the JSON progress file regularly.</li>
    <li><b>Region tool</b> (<kbd>o</kbd>): click a few seeds (e.g. rural roofs), Shift+click another type to exclude it. The tool finds every pixel similar to the seeds in the chosen feature layers (g7 embedding, PCs, S2 images) within the scope: connected area, radius, commune or view. Drag the threshold to loosen or tighten. Statistics: area, number of patches, by commune, composition by map. Tool <kbd>4</kbd> turns the region into polygons for editing (vertices, cut, delete, draw), then Statistics by boundary. Save region assigns class and year; Compare years applies the same seeds to every year; scatter points creates labelled points in the region for checking.
      In the region tool: <kbd>1</kbd> seeds, <kbd>2</kbd> delete a whole patch (click it), <kbd>3</kbd> keep a correct patch, <kbd>4</kbd> edit boundaries,
      <kbd>Z</kbd> undo, <kbd>S</kbd> find patches similar to deleted ones (orange), <kbd>Enter</kbd> delete ticked patches, <kbd>+</kbd>/<kbd>−</kbd> threshold, <kbd>Esc</kbd> back to seeds.
      In any tool: right-click a patch to delete it quickly, Shift+right-click to keep it. Drag the title bar to move the panel.</li>
    <li><b>Multi-year seasonal curves</b>: "years overlaid" draws each year in its own colour; the grey dashed line and pale band are the median ± spread over the years, i.e. the point's seasonal pattern; clearly anomalous years are marked ⚠. "Continuous multi-year series" joins the 6 periods of every year into one time axis: the colour strip under the axis shows assigned labels, an orange background marks interpolated years. Click a year to select it; <b>⤢ Enlarge</b> for a large view.</li>
    <li><b>External links</b>: "External links for this point" opens Google Maps, satellite view, Street View, Google Earth (with imagery history), Esri Wayback at the displayed release, Copernicus (Sentinel-2 dry season of the selected year), Bing, Yandex, OpenStreetMap, address lookup and Wikimapia. Sites marked 📍 drop a pin on the point; sites marked ⌖ take no pin: the point is at the screen centre and the coordinates are already copied to paste into the site's search box. Turn on "Point info on map click" or right-click to get links for any place.</li>
    <li><b>New point set</b> (＋ New set): regular grid, jittered grid, random points with a minimum spacing, or stratified random by a class map (n points per class; the map class goes to "stratum" and "3-class hint"); the area is the map view, a drawn rectangle, communes, the whole city or a saved region. Each set has its own years to label (including 2026 or any other year); ⚙ changes the years of the selected set, renames or deletes a user set. Points always snap to the centre of the 10 m pixel.</li>
    <li><b>Layout</b>: the selector at the top of the panel moves the yearly strip and the charts to a <b>right column</b> or a <b>strip below the map</b>, so they are visible together with the class buttons without scrolling. The ▾ button collapses the basemap panel.</li>
    <li><b>S2 10 bands</b> (first entry in the layer list, needs the dataset's <code>s2d</code> layer): any colour composite, the indices NDVI, NDWI, MNDWI, NDBI, BSI, or <b>CTX</b> (mean, standard deviation in a 5 × 5 or 15 × 15 window) computed in the browser from the original 10-band image; CTX is computed at zoom 13 or closer. The stretch is fixed and the same for every year. The layer can also feed the yearly strip.</li>
    <li><b>By-year chart</b> ("pixel values by year"): one value per year of PC1-5, embedding components, the 10 S2 bands, 5 indices or the 40 CTX features at the exact pixel; CTX and indices are computed as in the classifier. Click a line name to hide or show it, "z" to compare shapes; years departing from the others (needs at least 4 years) get a pale red background, and the assigned labels and class maps are drawn under the axis. The "6-period seasonality" chart now offers all 10 bands, not only NDVI, MNDWI.</li>
    <li><b>Multi-class region tool</b>: choose a class in the row of coloured buttons before clicking seeds; switch class and keep clicking for another. Each pixel goes to the class with the most similar seed (if under the threshold), so the class regions never overlap. The table under the buttons gives each class's area; click a row (or click a patch of that class with the delete or keep tool) to work on that class. "Compare years" gives every class's area per year; "Save all classes" saves one region per class.</li>
    <li><b>No more white basemap tiles</b>: when the selected Wayback release has no detailed imagery at the current zoom, the page takes a lower-zoom tile of the same release, crops the matching part and upsamples it with interpolation (blurrier, but the imagery of that release); the note under the basemap says from which level.</li>
    <li><b>OpenStreetMap</b>: in the basemap panel, turn on themes (land use, natural, water areas, rivers and canals, roads, buildings, points of interest). The "pre-downloaded on Hugging Face" source reads FlatGeobuf files for the map view (they can be downloaded and opened in QGIS); "Overpass live" queries OSM for the view. Colours follow the suggested class. Click a feature for its tags and links to OSM and the iD editor. "OSM panel…": <b>filter</b> with an expression (e.g. <code>landuse=industrial</code>, <code>building</code>, <code>water=pond|fishpond</code>, <code>name~Cát</code>, <code>@lop=X3</code>) with counts and areas; <b>edit</b> tags and geometry (browser only, GeoJSON export); <b>sampling</b>: scatter points inside the matching polygons, class from an editable mapping table, optionally pre-assigning low-confidence labels. Data © OpenStreetMap contributors, ODbL.</li>
    <li><b>Planning</b>: the external links include the Hai Phong planning portal, opened at the point.</li>
    <li><b>Report a problem</b> (🐞): describe the problem; the page attaches technical information (version, data, recent errors, not your labels) and opens an email to the page owner, or copies the text.</li>
    <li><b>Phone</b>: the control panel is a bottom sheet; tap its top bar to collapse, half-open or fully open it, or drag it. 🗂 opens basemap and reference layers, ⓘ toggles point info, ☰ changes the sheet size. In the region tool, the "− Exclude" button replaces Shift+click; a long press on a patch deletes it quickly.</li>
    <li><b>Language</b>: choose at the top of the panel (Tiếng Việt, Русский, English); English by default; open directly with <code>?lang=vi</code>, <code>?lang=ru</code> or <code>?lang=en</code>.</li>
  </ol>
  <p class="sm"><b>Keys:</b> <kbd>n</kbd>/<kbd>p</kbd> next/previous point, <kbd>←</kbd>/<kbd>→</kbd> year, <kbd>c</kbd> copy previous year, <kbd>v</kbd> fill forward, <kbd>f</kbd> flag for review, <kbd>g</kbd> go to point, <kbd>b</kbd> blink reference layers, <kbd>m</kbd> add-point mode, <kbd>Shift</kbd>+1/2/3 confidence, <kbd>Backspace</kbd> delete this year's label.</p>"""},
}

from gen_i18n_v21 import R21, LAYER21
from gen_i18n_v22 import R22
from gen_i18n_v23 import R23, HTML23, HELP23
from gen_i18n_v24 import R24, LAYER24, RE24, HELP24
from gen_i18n_v25 import R25, HTML25, HELP25
R = R + R21 + R22 + R23 + R24 + R25
from gen_i18n_v26 import R26, HTML26, GT26, HELP26
_co = {r[0] for r in R}
R = R + [r for r in R26 if r[0] not in _co]                # bản 2.6: không ghi đè bản dịch cũ của cùng một câu
from gen_i18n_v27 import R27, GT27, HELP27
_co = {r[0] for r in R}
R = R + [r for r in R27 if r[0] not in _co]                # bản 2.7
for L_ in LAYER21: LAYER[L_].update(LAYER21[L_])
for L_ in LAYER24: LAYER[L_].update(LAYER24[L_])
for L_ in RE24: RE[L_] = RE[L_] + RE24[L_]
for L_ in HTML23: HTML[L_].update(HTML23[L_])
for L_, (moc, them, phim, phim_them) in HELP23.items():     # bản 2.3: mục Trợ giúp mới sau mục báo lỗi, phím [
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5
    h = h[:j] + them + h[j:]; assert h.count(phim) == 1; HTML[L_]["helpBody"] = h.replace(phim, phim + phim_them)
for L_, (moc, them, _a, _b) in HELP24.items():            # bản 2.4: chỉ số, DEM, giá trị tại điểm, đặc trưng
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
for L_ in HTML25: HTML[L_].update(HTML25[L_])
for L_, (moc, them, _a, _b) in HELP25.items():            # bản 2.5: dải ảnh, chuẩn hoá đa giác, tự lưu mẫu, phiên làm việc
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
for L_ in HTML26: HTML[L_].update(HTML26[L_])
for L_, (cu, moi) in GT26.items():                       # bản 2.6: giới thiệu nêu hai chức năng mới
    assert HTML[L_]["gtBody"].count(cu) == 1; HTML[L_]["gtBody"] = HTML[L_]["gtBody"].replace(cu, moi)
for L_, (moc, them, _a, _b) in HELP26.items():            # bản 2.6: phát hiện thay đổi, trợ lý AI
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v28 import R28, GT28, GT28_2, HELP28
_co = {r[0] for r in R}
R = R + [r for r in R28 if r[0] not in _co]                # bản 2.8
from gen_i18n_v281 import R281, LAYER281
_co = {r[0] for r in R}
R = R + [r for r in R281 if r[0] not in _co]              # bản 2.8.1
for _L, _d in LAYER281.items(): LAYER[_L].update(_d)
for L_, (cu, moi) in GT27.items():                       # bản 2.7
    assert HTML[L_]["gtBody"].count(cu) == 1; HTML[L_]["gtBody"] = HTML[L_]["gtBody"].replace(cu, moi)
for L_, (moc, them, _a, _b) in HELP27.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
for G_ in (GT28, GT28_2):                                  # bản 2.8
    for L_, (cu, moi) in G_.items():
        assert HTML[L_]["gtBody"].count(cu) == 1, (L_, cu); HTML[L_]["gtBody"] = HTML[L_]["gtBody"].replace(cu, moi)
for L_, (moc, them, _a, _b) in HELP28.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v29 import R29, HELP29
_co = {r[0] for r in R}
R = R + [r for r in R29 if r[0] not in _co]              # bản 2.9
for L_, (moc, moi) in HELP29.items():                    # bản 2.9: thay mục xuất bản đồ
    h = HTML[L_]["helpBody"]; i = h.index(moc); j = h.index("</li>", i) + 5; HTML[L_]["helpBody"] = h[:i] + moi + h[j:]
from gen_i18n_v291 import R291, HTML291, HELP291
_co = {r[0] for r in R}
R = R + [r for r in R291 if r[0] not in _co]            # bản 2.9.1: ứng dụng cài được
for L_ in HTML291: HTML[L_].update(HTML291[L_])
for L_, (moc, them) in HELP291.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v30 import R30, HELP30
_co = {r[0] for r in R}
R = R + [r for r in R30 if r[0] not in _co]              # bản 3.0: Landsat
for L_, (moc, them) in HELP30.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v31 import R31, HELP31
_co = {r[0] for r in R}
R = R + [r for r in R31 if r[0] not in _co]              # bản 3.1: ranh giới, vùng gộp, S2 trực tuyến
for L_, (moc, them) in HELP31.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v32 import R32, HELP32
_co = {r[0] for r in R}
R = R + [r for r in R32 if r[0] not in _co]              # bản 3.2: đổi băng, một cảnh, chuỗi tại điểm, ảnh đã xem khi gán
for L_, (moc, them) in HELP32.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v33 import R33, HELP33
_co = {r[0] for r in R}
R = R + [r for r in R33 if r[0] not in _co]              # bản 3.3: ranh giới toàn thế giới
for L_, (moc, them) in HELP33.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v34 import R34, HELP34
_co = {r[0] for r in R}
R = R + [r for r in R34 if r[0] not in _co]              # bản 3.4: Landsat, Sentinel-1 trực tuyến
for L_, (moc, them) in HELP34.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v35 import R35, HELP35
_co = {r[0] for r in R}
R = R + [r for r in R35 if r[0] not in _co]              # bản 3.5: nạp trước, gợi ý lớp, chế độ lưới
for L_, (moc, them) in HELP35.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v36 import R36, HELP36
_co = {r[0] for r in R}
R = R + [r for r in R36 if r[0] not in _co]              # bản 3.6: nạp trước nhiều điểm, đường S1
for L_, (moc, them) in HELP36.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v37 import R37, HELP37
_co = {r[0] for r in R}
R = R + [r for r in R37 if r[0] not in _co]              # bản 3.7: lấy điểm từ Google Earth
for L_, (moc, them) in HELP37.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v38 import R38, HELP38
_co = {r[0] for r in R}
R = R + [r for r in R38 if r[0] not in _co]              # bản 3.8: giao nhiều tia nhìn
for L_, (moc, them) in HELP38.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v39 import R39, HELP39
_co = {r[0] for r in R}
R = R + [r for r in R39 if r[0] not in _co]              # bản 3.9: mùa vụ 12 tháng
for L_, (moc, them) in HELP39.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v310 import R310, HELP310
_co = {r[0] for r in R}
R = R + [r for r in R310 if r[0] not in _co]             # bản 3.10: Overture, nhiệt độ bề mặt Landsat
for L_, (moc, them) in HELP310.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v311 import R311, HELP311
_co = {r[0] for r in R}
R = R + [r for r in R311 if r[0] not in _co]             # bản 3.10.1, 3.11: thang màu, POI, đồ thị; lớp mới, AlphaEarth
for L_, (moc, them) in HELP311.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v312 import R312, HELP312
_co = {r[0] for r in R}
R = R + [r for r in R312 if r[0] not in _co]             # bản 3.12: mẫu huấn luyện ngoài phạm vi
for L_, (moc, them) in HELP312.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
from gen_i18n_v313 import R313, HELP313
_co = {r[0] for r in R}
R = R + [r for r in R313 if r[0] not in _co]             # bản 3.13: xuất bản đồ, chọn xã, Shapefile, quản lý phương án
for L_, (moc, them) in HELP313.items():
    h = HTML[L_]["helpBody"]; j = h.index("</li>", h.index(moc)) + 5; HTML[L_]["helpBody"] = h[:j] + them + h[j:]
out = {"ru": {}, "en": {}}
for vi, ru, en in R:
    out["ru"][vi] = ru; out["en"][vi] = en
for vi, (ru, en) in PS.items():
    out["ru"][vi] = ru; out["en"][vi] = en
sc = json.loads((D / "he_lop_v1.json").read_text(encoding="utf-8"))
ru_ten = {c["ma"]: c.get("ru") for c in sc["lop"] + sc.get("dac_biet", [])}
out["ru"]["__lop"] = {k: {"ten": ru_ten.get(k) or LOP_RU_TEN.get(k, ""), "dau_hieu": v[2]} for k, v in LOP.items()}
out["en"]["__lop"] = {k: {"ten": v[0], "dau_hieu": v[1]} for k, v in LOP.items()}
for k, (ru, en) in MADAT.items():
    out["ru"]["__lop"][k]["ma_dat"] = ru; out["en"]["__lop"][k]["ma_dat"] = en
for L in ("ru", "en"):
    out[L]["__re"] = RE[L]; out[L]["__layer"] = LAYER[L]; out[L]["__scheme"] = SCHEME[L]; out[L]["__html"] = HTML[L]
# kiểm tra: không có gạch dài trong bản dịch
for L in out:
    for k, v in out[L].items():
        if isinstance(v, str) and "—" in v:
            print("gạch dài:", L, k[:40])
(D / "i18n.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
keys = json.load(open(D / "khoa_can_dich.json", encoding="utf-8"))["keys"]
thieu = [k for k in keys if k not in out["ru"] and k != "Tiếng Việt"]
print("khoá:", len(out["ru"]), "| còn thiếu so với danh sách trích:", thieu)
