# Bản 3.9: đường mùa vụ 12 tháng (Sentinel-2 L2A tại điểm, trực tuyến)
R39 = [
("số kỳ trong năm: 6 kỳ 2 tháng (tái dựng từ PCA chuỗi năm) hoặc 12 tháng (Sentinel-2 đọc trực tuyến tại điểm, trung vị các cảnh quang đãng trong tháng)",
 "число периодов в году: 6 периодов по 2 месяца (восстановление из многовременного PCA) или 12 месяцев (Sentinel-2 онлайн в точке, медиана безоблачных сцен месяца)",
 "periods per year: 6 two-month periods (reconstructed from the multi-year PCA) or 12 months (Sentinel-2 read online at the point, median of the clear scenes of each month)"),
("6 kỳ (2 tháng)", "6 периодов (2 мес.)", "6 periods (2 months)"),
("12 tháng", "12 месяцев", "12 months"),
("tháng", "месяц", "month"),
("Đường mùa vụ 12 tháng (Sentinel-2 tại điểm, trực tuyến)", "Сезонная кривая по 12 месяцам (Sentinel-2 в точке, онлайн)", "12-month seasonal curve (Sentinel-2 at the point, online)"),
("Sentinel-2 L2A (Planetary Computer), trung vị theo tháng các cảnh quang đãng tại điểm (SCL), đúng điểm ảnh",
 "Sentinel-2 L2A (Planetary Computer), медиана по месяцам безоблачных в точке сцен (SCL), ровно в пикселе",
 "Sentinel-2 L2A (Planetary Computer), monthly median of the scenes clear at the point (SCL), exact pixel"),
("đang đọc S2 {a}/{b} cảnh…", "чтение S2: {a}/{b} сцен…", "reading S2 {a}/{b} scenes…"),
("không có cảnh S2 tại điểm", "нет сцен S2 в точке", "no S2 scenes at the point"),
("lỗi đọc S2: ", "ошибка чтения S2: ", "S2 read error: "),
("{a} cảnh, {b} cảnh quang đãng tại điểm", "{a} сцен, безоблачных в точке: {b}", "{a} scenes, {b} clear at the point"),
("năm {y}: {n} cảnh quang đãng", "{y} год: безоблачных сцен {n}", "year {y}: {n} clear scenes"),
("tháng không có ảnh quang đãng: {t}", "месяцы без безоблачных снимков: {t}", "months without a clear image: {t}"),
("mây/bóng mây tại điểm", "облако/тень облака в точке", "cloud/cloud shadow at the point"),
("Sentinel-1 RTC (Planetary Computer), trung vị dB theo tháng, đúng điểm ảnh 10 m", "Sentinel-1 RTC (Planetary Computer), медиана дБ по месяцам, ровно в пикселе 10 м", "Sentinel-1 RTC (Planetary Computer), monthly median dB, exact 10 m pixel"),
]
HELP39 = {
  "ru": ("<li><b>Пересечение нескольких лучей (3.8)</b>", """
    <li><b>Сезонная кривая по 12 месяцам (3.9)</b>: переключатель <b>6 периодов / 12 месяцев</b> у сезонной кривой. 12 месяцев: одно значение на месяц — медиана безоблачных в точке сцен Sentinel-2 L2A за месяц (по слою SCL), читается онлайн ровно в пикселе через точечный API Microsoft Planetary Computer (10 каналов, NDVI, MNDWI и используемые индексы); месяц без безоблачных сцен остаётся пустым. Сначала читается год разметки, остальные годы — постепенно, результат хранится в браузере; работает в любом месте, готовые снимки не нужны. В режиме одного года мелкие точки — отдельные безоблачные сцены, серые штрихи под осью — сцены с облаком в точке. С включённым + S1 кривая Sentinel-1 тоже строится по месяцам. 6 периодов — как прежде, восстановление из многовременного PCA.</li>"""),
  "en": ("<li><b>Multi-ray intersection (3.8)</b>", """
    <li><b>12-month seasonal curve (3.9)</b>: the <b>6 periods / 12 months</b> selector of the seasonal curve. 12 months: one value per month, the median of the Sentinel-2 L2A scenes clear at the point in that month (SCL layer), read online at the exact pixel through the Microsoft Planetary Computer point API (10 bands, NDVI, MNDWI and the indices in use); a month without a clear scene stays empty. The labelling year is read first, the other years gradually, and results are kept in the browser; it works anywhere, no prepared imagery needed. In single-year mode the small dots are individual clear scenes and the grey ticks under the axis are scenes clouded at the point. With + S1 on, the Sentinel-1 curve is monthly too. 6 periods is still the curve reconstructed from the multi-year PCA.</li>"""),
}
