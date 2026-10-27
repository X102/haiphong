# Bản 3.19.1: xuất điểm mẫu theo từng bộ (mỗi bộ một tệp hoặc gộp), tệp tiến độ riêng của bộ
R3191 = [
("Điểm mẫu theo bộ", "Эталонные точки по наборам", "Sample points by set"),
("Bộ đang làm", "Текущий набор", "Current set"),
("Chọn tất cả", "Выбрать все", "Select all"),
("Bỏ chọn", "Снять выбор", "Clear"),
("Cách xuất", "Способ экспорта", "Export as"),
("mỗi bộ một tệp", "каждый набор отдельным файлом", "one file per set"),
("gộp các bộ đã chọn vào một tệp", "объединить выбранные наборы в один файл", "merge the selected sets into one file"),
("cột năm theo năm của bộ", "столбцы лет по годам набора", "year columns from the set's years"),
("Shapefile (SHP)", "Shapefile (SHP)", "Shapefile (SHP)"),
("Tệp tiến độ của bộ (JSON)", "Файл прогресса набора (JSON)", "Set progress file (JSON)"),
("Cả phiên làm việc", "Весь сеанс работы", "Whole session"),
("chỉ chọn bộ điểm đang làm", "выбрать только текущий набор точек", "select only the current point set"),
("mỗi bộ điểm thành một tệp riêng; chọn nhiều bộ thì các tệp được gói trong một ZIP", "каждый набор точек отдельным файлом; при нескольких наборах файлы упаковываются в один ZIP", "each point set as its own file; with several sets the files are packed into one ZIP"),
("mọi điểm của các bộ đã chọn vào chung một tệp (cột bo_diem, ten_bo cho biết điểm thuộc bộ nào)", "все точки выбранных наборов в одном файле (столбцы bo_diem, ten_bo указывают набор)", "all points of the selected sets in one file (columns bo_diem, ten_bo show the set)"),
("cột năm theo các năm cần gán của từng bộ (cộng năm đã có nhãn); bỏ chọn thì dùng mọi năm của mọi bộ", "столбцы лет по годам разметки каждого набора (плюс годы с метками); без отметки используются все годы всех наборов", "year columns from each set's years to label (plus years already labelled); unchecked uses all years of all sets"),
("Shapefile điểm (toạ độ WGS 84, trường chữ UTF-8), nén ZIP", "точечный Shapefile (координаты WGS 84, текстовые поля UTF-8) в ZIP", "point Shapefile (WGS 84 coordinates, UTF-8 text fields), zipped"),
("tệp tiến độ chỉ gồm các bộ đã chọn (điểm, nhãn, các năm cần gán): gửi cho người khác hoặc nhập lại bằng Tải tệp…", "файл прогресса только с выбранными наборами (точки, метки, годы разметки): для передачи другим или повторной загрузки через «Открыть файл…»", "progress file with only the selected sets (points, labels, years to label): share it or load it back with Open file…"),
("các bộ đã chọn chưa có điểm nào có nhãn", "в выбранных наборах нет размеченных точек", "the selected sets have no labelled points yet"),
("{n} điểm · {k} có nhãn", "{n} точек · {k} с метками", "{n} points · {k} labelled"),
("chưa chọn bộ nào", "наборы не выбраны", "no set selected"),
("{b} bộ, {n} điểm sẽ xuất", "наборов: {b}, точек к экспорту: {n}", "{b} sets, {n} points to export"),
("gộp vào một tệp", "в один файл", "merged into one file"),
("{b} tệp trong một ZIP", "{b} файлов в одном ZIP", "{b} files in one ZIP"),
("đã xuất {f}: {b} bộ, {n} điểm", "экспортировано {f}: наборов {b}, точек {n}", "exported {f}: {b} sets, {n} points"),
("Xuất riêng bộ điểm đang làm (CSV, GeoJSON, Shapefile, tệp tiến độ của bộ)", "Экспорт только текущего набора точек (CSV, GeoJSON, Shapefile, файл прогресса набора)", "Export only the current point set (CSV, GeoJSON, Shapefile, set progress file)"),
]
HELP3191 = {
  "ru": ("<li><b>Регрессия индекса (3.19)</b>", """
    <li><b>Экспорт по наборам (3.19.1)</b>: в окне «Экспорт…» отмечаются нужные наборы точек (по умолчанию текущий); каждый набор экспортируется отдельным файлом (несколько наборов упаковываются в ZIP) или выбранные наборы объединяются в один файл; форматы CSV (длинный, широкий), GeoJSON, Shapefile и файл прогресса набора, который можно загрузить обратно; столбцы лет берутся из годов набора; можно оставить только размеченные точки. Кнопка ⤓ рядом с выбором набора экспортирует текущий набор.</li>"""),
  "en": ("<li><b>Index regression (3.19)</b>", """
    <li><b>Export by set (3.19.1)</b>: in the Export… dialog tick the point sets you need (the current set by default); each set is exported as its own file (several sets are packed into a ZIP) or the selected sets are merged into one file; formats CSV (long, wide), GeoJSON, Shapefile and a set progress file that can be loaded back; year columns follow the set's years; optionally only labelled points. The ⤓ button next to the set selector exports the current set.</li>"""),
}
