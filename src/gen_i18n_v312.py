# Bản 3.12: phân loại từ điểm mẫu, mẫu huấn luyện ngoài phạm vi (vùng xung quanh, mọi điểm đã gán)
R312 = [
("Mẫu huấn luyện", "Обучающие образцы", "Training samples"),
("Phạm vi thiếu mẫu (xã ít điểm, thiếu lớp): lấy thêm mẫu ở vùng xung quanh hoặc ở mọi nơi đã gán, rồi phân loại riêng phạm vi đã chọn",
 "Если в области мало образцов (мало точек в общине, не хватает классов): взять дополнительные образцы из окрестности или из всех размеченных мест и классифицировать только выбранную область",
 "When the extent lacks samples (few points in the commune, missing classes): take extra samples from the surroundings or from every labelled place, then classify only the chosen extent"),
("trong phạm vi", "в пределах области", "within the extent"),
("thêm vùng xung quanh 2 km", "плюс окрестность 2 км", "plus surroundings 2 km"),
("thêm vùng xung quanh 5 km", "плюс окрестность 5 км", "plus surroundings 5 km"),
("thêm vùng xung quanh 10 km", "плюс окрестность 10 км", "plus surroundings 10 km"),
("mọi điểm đã gán (gần phạm vi nhất trước)", "все размеченные точки (сначала ближайшие к области)", "every labelled point (nearest to the extent first)"),
("phạm vi và vùng xung quanh {d} km", "область и окрестность {d} км", "extent and surroundings {d} km"),
("đang đọc đặc trưng tại {m} mẫu ngoài phạm vi ({i}/{n} khối)…", "чтение признаков в {m} образцах за пределами области (блок {i}/{n})…", "reading features at {m} samples outside the extent (block {i}/{n})…"),
("hoặc chọn Mẫu huấn luyện: thêm vùng xung quanh, mọi điểm đã gán", "или выберите «Обучающие образцы»: окрестность, все размеченные точки", "or choose Training samples: surroundings, every labelled point"),
("{l} chỉ có mẫu ngoài phạm vi ({n} điểm): bản đồ dựa vào mẫu nơi khác; nên lấy vài mẫu của lớp này ngay trong phạm vi để kiểm tra",
 "{l}: только образцы за пределами области ({n} точек): карта опирается на образцы из других мест; возьмите несколько образцов этого класса внутри области для проверки",
 "{l} has samples only outside the extent ({n} points): the map relies on samples from elsewhere; take a few samples of this class inside the extent to check"),
("Mẫu huấn luyện: {a} trong phạm vi, {b} ngoài phạm vi (xa nhất {d} km; nguồn: {s}).", "Обучающие образцы: {a} в пределах области, {b} за её пределами (до {d} км; источник: {s}).", "Training samples: {a} within the extent, {b} outside (up to {d} km away; source: {s})."),
("Bỏ {n} mẫu xa hơn (tối đa {m} mẫu ngoài phạm vi).", "Отброшено {n} более далёких образцов (не более {m} за пределами области).", "{n} more distant samples dropped (at most {m} outside the extent)."),
("Riêng {n} mẫu trong phạm vi: đúng {oa} %.", "Только {n} образцов внутри области: верно {oa} %.", "The {n} samples within the extent alone: {oa} % correct."),
("Không có mẫu nào trong phạm vi để kiểm tra riêng.", "Внутри области нет образцов для отдельной проверки.", "No samples within the extent to check separately."),
("Mẫu ngoài phạm vi giúp đủ lớp, nhưng nơi khác có thể khác điều kiện (đất, mùa vụ, ảnh): so độ đúng riêng của mẫu trong phạm vi, thấp thì lấy thêm mẫu tại chỗ.",
 "Образцы извне дополняют классы, но в других местах условия могут отличаться (почва, сезон, снимок): сравните точность только по образцам внутри области; если она низкая, возьмите образцы на месте.",
 "Samples from outside complete the classes, but conditions elsewhere may differ (soil, season, image): compare the accuracy of the samples within the extent alone; if it is low, take more samples on site."),
("ngoài", "вне", "outside"),
]
HELP312 = {
  "ru": ("<li><b>Новые источники из Hugging Face (3.11)</b>", """
    <li><b>Образцы извне (3.12)</b>: в окне «Классификация по образцам» список «Обучающие образцы» позволяет взять образцы из окрестности (2, 5, 10 км) или из всех размеченных точек (сначала ближайшие, до 1500), а классифицировать только выбранную область. Признаки в этих точках читаются на той же сетке и в той же шкале, что и в области. Сводка показывает число образцов внутри и вне области и точность только по образцам внутри.</li>"""),
  "en": ("<li><b>New sources from Hugging Face (3.11)</b>", """
    <li><b>Samples from outside (3.12)</b>: in the “Classification from samples” panel the “Training samples” list takes samples from the surroundings (2, 5, 10 km) or from every labelled point (nearest first, up to 1500), and classifies only the chosen extent. Features at those points are read on the same grid and the same scale as the extent. The summary gives the number of samples within and outside the extent and the accuracy of the samples within the extent alone.</li>"""),
}
