# Bản 3.6: nạp trước nhiều điểm, đường mùa vụ S2 + S1, S2 trực tuyến đọc ít cảnh hơn
R36 = [
("nạp trước 5 điểm", "предзагрузка 5 точек", "prefetch 5 points"),
("nạp trước 10 điểm", "предзагрузка 10 точек", "prefetch 10 points"),
("nạp trước 20 điểm", "предзагрузка 20 точек", "prefetch 20 points"),
("thêm đường Sentinel-1 VV, VH (dB, trục phải) cùng lúc với đường Sentinel-2; đọc trực tuyến từ Planetary Computer, mỗi cảnh một giá trị tại điểm",
 "добавить кривые Sentinel-1 VV, VH (дБ, правая ось) вместе с кривыми Sentinel-2; читаются онлайн из Planetary Computer, одно значение в точке на сцену",
 "add Sentinel-1 VV, VH curves (dB, right axis) together with the Sentinel-2 curves; read online from Planetary Computer, one value at the point per scene"),
("máy chủ bận", "сервер занят", "server busy"),
("trục phải", "правая ось", "right axis"),
("nét đứt đậm: năm {y}; chấm nhỏ: từng cảnh", "жирный пунктир: {y} год; малые точки: отдельные сцены", "bold dashed: year {y}; small dots: individual scenes"),
("nét đứt đậm: năm {y}; nét chấm: trung vị các năm", "жирный пунктир: {y} год; точечная линия: медиана по годам", "bold dashed: year {y}; dotted: median over years"),
("nét đứt: S1 theo kỳ", "пунктир: S1 по периодам", "dashed: S1 by period"),
("quỹ đạo giảm", "нисходящая орбита", "descending orbit"),
("quỹ đạo tăng", "восходящая орбита", "ascending orbit"),
("Sentinel-1 RTC (Planetary Computer), trung vị dB theo kỳ 2 tháng, đúng điểm ảnh 10 m", "Sentinel-1 RTC (Planetary Computer), медиана дБ по двухмесячным периодам, точный пиксель 10 м", "Sentinel-1 RTC (Planetary Computer), median dB per 2-month period, exact 10 m pixel"),
("không có cảnh S1 tại điểm", "нет сцен S1 в точке", "no S1 scenes at the point"),
("lỗi đọc S1: ", "ошибка чтения S1: ", "S1 read error: "),
("{n} cảnh", "{n} сцен", "{n} scenes"),
("đang đọc S1 {a}/{b} cảnh…", "читается S1: {a}/{b} сцен…", "reading S1 {a}/{b} scenes…"),
("Đọc nhanh: nước VV thấp (dưới −18 dB); lúa ngập đầu vụ VV thấp rồi tăng dần khi lúa lớn; đô thị VV cao, ít đổi theo mùa; rừng VH cao, ổn định.",
 "Быстрое чтение: вода — низкий VV (ниже −18 дБ); затопленный рис в начале сезона — низкий VV, затем растёт по мере роста; город — высокий VV, слабо меняется по сезонам; лес — высокий, стабильный VH.",
 "Quick reading: water has low VV (below −18 dB); flooded rice starts low in VV and rises as the crop grows; urban areas have high VV with little seasonal change; forest has high, stable VH."),
("Vùng này có sẵn ảnh S2 10 băng đã ghép (lớp “S2 10 băng”): nhanh hơn nhiều, vì S2 trực tuyến phải đọc từng cảnh từ AWS ở Mỹ (mỗi ô bản đồ 3 băng + lớp mây của mỗi cảnh).",
 "Для этой области есть готовый композит S2 из 10 каналов (слой «S2 10 каналов»): он намного быстрее, так как S2 онлайн читает каждую сцену с AWS в США (на каждую плитку 3 канала + маска облаков каждой сцены).",
 "This area has a prepared 10-band S2 composite (the “S2 10 bands” layer): much faster, since S2 online reads every scene from AWS in the USA (3 bands + cloud mask of each scene per map tile)."),
]
R36 += [
("tự mở khi sang điểm: tắt", "автооткрытие при смене точки: выкл.", "auto-open on point change: off"),
("tự mở: 🌍 Google Earth", "автооткрытие: 🌍 Google Earth", "auto-open: 🌍 Google Earth"),
("tự mở: 🛰 Google Maps vệ tinh", "автооткрытие: 🛰 спутник Google Maps", "auto-open: 🛰 Google Maps satellite"),
("tự mở: 🛰 Copernicus Browser", "автооткрытие: 🛰 Copernicus Browser", "auto-open: 🛰 Copernicus Browser"),
("tự mở: 🕰 Esri Wayback", "автооткрытие: 🕰 Esri Wayback", "auto-open: 🕰 Esri Wayback"),
("tự mở: 🅱 Bing Maps", "автооткрытие: 🅱 Bing Maps", "auto-open: 🅱 Bing Maps"),
("tự mở: 🟡 Yandex Maps", "автооткрытие: 🟡 Яндекс Карты", "auto-open: 🟡 Yandex Maps"),
("Mỗi khi sang điểm mới (phím n, p, nhấp), tự mở trang này ở tab mới đúng toạ độ điểm. Phím t: mở cho điểm đang xem. Xem xong bấm Ctrl+W để đóng tab và quay lại.",
 "При каждом переходе к новой точке (клавиши n, p, щелчок) эта страница открывается в новой вкладке точно по координатам точки. Клавиша t: открыть для текущей точки. После просмотра Ctrl+W закрывает вкладку и возвращает назад.",
 "Each time you move to a new point (keys n, p, click), this page opens in a new tab at the point's coordinates. Key t: open for the current point. When done, Ctrl+W closes the tab and returns here."),
("Đã mở {s} ở tab mới. Xem xong bấm Ctrl+W để đóng tab và quay lại geoportal.", "{s} открыт в новой вкладке. После просмотра нажмите Ctrl+W, чтобы закрыть вкладку и вернуться в геопортал.", "{s} opened in a new tab. When done, press Ctrl+W to close it and return to the geoportal."),
]
HELP36 = {
  "ru": ("<li><b>Быстрая разметка (3.5)</b>", """
    <li><b>3.6</b>: предзагрузка до 5, 10 или 20 следующих точек; предзагрузка уступает очередь карте, пока грузятся её плитки. В «сезонной кривой 6 периодов» флажок <b>+ S1</b> добавляет кривые Sentinel-1 VV и VH (дБ, правая ось) к кривым Sentinel-2: значения в точке по каждой сцене одной орбиты (sentinel-1-rtc, Planetary Computer), медиана по двухмесячным периодам; текущий год читается первым, остальные — постепенно, результат сохраняется в браузере. S2 онлайн с маской облаков теперь читает каналы только тех сцен, которые дают ясные пиксели в данной плитке (облачные целиком сцены пропускаются).</li>
    <li><b>3.6.1</b>: поле <b>автооткрытие при смене точки</b> (рядом с кнопкой ▦ Сетка): при выборе Google Earth (или спутника Google Maps, Copernicus, Wayback, Bing, Яндекс) при каждом переходе к новой точке клавишами <kbd>n</kbd>, <kbd>p</kbd> или щелчком эта страница открывается в новой вкладке по координатам точки; клавиша <kbd>t</kbd> открывает её для текущей точки. Google Earth не позволяет другим страницам управлять своей вкладкой, поэтому для каждой точки открывается новая вкладка: после просмотра <kbd>Ctrl</kbd>+<kbd>W</kbd> закрывает её, и браузер возвращается в геопортал.</li>"""),
  "en": ("<li><b>Fast labelling (3.5)</b>", """
    <li><b>3.6</b>: prefetch up to 5, 10 or 20 next points; prefetch yields to the map while its tiles are loading. In the 6-period seasonal curve, the <b>+ S1</b> box adds Sentinel-1 VV and VH curves (dB, right axis) to the Sentinel-2 curves: point values of every scene of one orbit (sentinel-1-rtc, Planetary Computer), median per 2-month period; the current year is read first, the others gradually, and results are kept in the browser. S2 online with cloud masking now reads bands only of the scenes that contribute clear pixels to the tile (fully cloudy scenes are skipped).</li>
    <li><b>3.6.1</b>: the <b>auto-open on point change</b> field (next to the ▦ Grid button): choose Google Earth (or Google Maps satellite, Copernicus, Wayback, Bing, Yandex) and each time you move to a new point with <kbd>n</kbd>, <kbd>p</kbd> or a click, that page opens in a new tab at the point's coordinates; key <kbd>t</kbd> opens it for the current point. Google Earth does not let other pages control its tab, so every point opens a new tab: when done, <kbd>Ctrl</kbd>+<kbd>W</kbd> closes it and the browser returns to the geoportal.</li>"""),
}
