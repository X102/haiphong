# Bản 3.4: Landsat và Sentinel-1 trực tuyến (Planetary Computer)
R34 = [
("Nguồn ảnh", "Источник снимков", "Imagery source"),
("Sentinel-2 L2A (AWS, 10 m, từ 2017)", "Sentinel-2 L2A (AWS, 10 м, с 2017)", "Sentinel-2 L2A (AWS, 10 m, from 2017)"),
("Landsat 4-9 C2 L2 (Planetary Computer, 30 m, từ 1984)", "Landsat 4-9 C2 L2 (Planetary Computer, 30 м, с 1984)", "Landsat 4-9 C2 L2 (Planetary Computer, 30 m, from 1984)"),
("Sentinel-1 RTC radar (Planetary Computer, 10 m, từ 2015)", "Sentinel-1 RTC радар (Planetary Computer, 10 м, с 2015)", "Sentinel-1 RTC radar (Planetary Computer, 10 m, from 2015)"),
("Landsat 7", "Landsat 7", "Landsat 7"),
("bỏ Landsat 7 sau 31.05.2003 (hỏng SLC, ảnh có sọc trống)", "исключить Landsat 7 после 31.05.2003 (отказ SLC, полосы без данных)", "skip Landsat 7 after 31.05.2003 (SLC failure, striped gaps)"),
("Sentinel-2 trực tuyến", "Sentinel-2 онлайн", "Sentinel-2 online"),
("Landsat trực tuyến", "Landsat онлайн", "Landsat online"),
("Sentinel-1 trực tuyến", "Sentinel-1 онлайн", "Sentinel-1 online"),
("VV, VH, VV/VH (radar)", "VV, VH, VV/VH (радар)", "VV, VH, VV/VH (radar)"),
("màu thật 4-3-2", "естественные цвета 4-3-2", "true colour 4-3-2"),
("tán xạ ngược γ⁰, dB", "обратное рассеяние γ⁰, дБ", "backscatter γ⁰, dB"),
("Sentinel-1 RTC trên Planetary Computer, trung vị các cảnh đã ghép tại điểm ({px} m)", "Sentinel-1 RTC на Planetary Computer, медиана сцен композита в точке ({px} м)", "Sentinel-1 RTC on Planetary Computer, median of the composite scenes at the point ({px} m)"),
("Landsat C2 L2 trên Planetary Computer, trung vị các cảnh đã ghép quang đãng tại điểm ({px} m)", "Landsat C2 L2 на Planetary Computer, медиана ясных в точке сцен композита ({px} м)", "Landsat C2 L2 on Planetary Computer, median of the composite scenes clear at the point ({px} m)"),
("có dữ liệu", "есть данные", "data present"),
("mây (vùng giãn)", "облачность (буфер)", "cloud (dilated)"),
("quang đãng", "ясно", "clear"),
("Landsat trực tuyến: chỉ số theo năm và theo cảnh (tại điểm)", "Landsat онлайн: индексы по годам и по сценам (в точке)", "Landsat online: indices by year and by scene (at the point)"),
("Landsat trực tuyến: 6 băng theo năm và theo cảnh (tại điểm)", "Landsat онлайн: 6 каналов по годам и по сценам (в точке)", "Landsat online: 6 bands by year and by scene (at the point)"),
("Sentinel-1 trực tuyến: chỉ số radar theo năm và theo cảnh (tại điểm)", "Sentinel-1 онлайн: радарные индексы по годам и по сценам (в точке)", "Sentinel-1 online: radar indices by year and by scene (at the point)"),
("Sentinel-1 trực tuyến: VV, VH (dB) theo năm và theo cảnh (tại điểm)", "Sentinel-1 онлайн: VV, VH (дБ) по годам и по сценам (в точке)", "Sentinel-1 online: VV, VH (dB) by year and by scene (at the point)"),
("{t} trực tuyến {y}", "{t} онлайн {y}", "{t} online {y}"),
("đọc các băng tại điểm", "прочитать каналы в точке", "read the bands at the point"),
]
HELP34 = {
  "ru": ("<li><b>Границы всего мира (3.3)</b>", """
    <li><b>Landsat и Sentinel-1 онлайн (3.4)</b>: в плане сцен (🛰) появилось поле «Источник снимков»: Sentinel-2 (AWS, 10 м, с 2017), Landsat 4-9 Collection 2 Level-2 (30 м, с 1984) или радар Sentinel-1 RTC (VV, VH, 10 м, с 2015). Landsat и Sentinel-1 берутся из Microsoft Planetary Computer без учётной записи и читаются и композитируются прямо в браузере, как Sentinel-2. Для Landsat облака маскируются по QA_PIXEL, Landsat 7 после 31.05.2003 по умолчанию исключается; каналы Landsat названы по соответствующим каналам S2, поэтому индексы общие. Sentinel-1 не зависит от облаков, композит — медиана нескольких сцен (подавление спекла), значения в точке и график по годам — в дБ, есть радарные индексы VH/VV, RVI, VV−VH. Для каждого источника хранится свой план; смена источника меняет слой, ленту снимков, график по годам и запись снимка при разметке («landsat:», «s1:» в колонке anh).</li>"""),
  "en": ("<li><b>World boundaries (3.3)</b>", """
    <li><b>Landsat and Sentinel-1 online (3.4)</b>: the scene plan (🛰) has an "Imagery source" field: Sentinel-2 (AWS, 10 m, from 2017), Landsat 4-9 Collection 2 Level-2 (30 m, from 1984) or Sentinel-1 RTC radar (VV, VH, 10 m, from 2015). Landsat and Sentinel-1 come from Microsoft Planetary Computer without an account and are read and composited in the browser like Sentinel-2. Landsat clouds are masked with QA_PIXEL and Landsat 7 after 31.05.2003 is skipped by default; Landsat bands carry the matching S2 band names, so indices are shared. Sentinel-1 is cloud-free, the composite is the median of several scenes (speckle reduction), point values and the yearly chart are in dB, with radar indices VH/VV, RVI, VV−VH. Each source keeps its own plan; switching source switches the layer, the image strip, the yearly chart and the imagery recorded with labels ("landsat:", "s1:" in the anh column).</li>"""),
}
