# Bản 2.9.1: cài như ứng dụng (PWA)
R291 = [
("⤓ Cài ứng dụng", "⤓ Установить приложение", "⤓ Install app"),
("Cài ứng dụng", "Установка приложения", "Install the app"),
("Cài ngay", "Установить", "Install now"),
("Có bản mới của geoportal.", "Доступна новая версия геопортала.", "A new version of the geoportal is available."),
("Cập nhật", "Обновить", "Update"),
("để sau", "позже", "later"),
("Cài geoportal thành ứng dụng trên điện thoại, máy tính bảng, máy tính: có biểu tượng riêng, mở trong cửa sổ riêng, mở được khi mất mạng",
 "Установить геопортал как приложение на телефон, планшет, компьютер: свой значок, отдельное окно, запуск без сети",
 "Install the geoportal as an app on a phone, tablet or computer: its own icon, its own window, opens without a network"),
("Geoportal đang chạy như ứng dụng đã cài.", "Геопортал работает как установленное приложение.", "The geoportal is running as an installed app."),
("Trang đang mở từ tệp trên máy nên không cài được: mở trang qua địa chỉ web https (ví dụ https://x102.github.io/haiphong) rồi cài.",
 "Страница открыта из локального файла, поэтому установка невозможна: откройте её по адресу https (например, https://x102.github.io/haiphong) и установите.",
 "The page is opened from a local file, so it cannot be installed: open it via an https address (for example https://x102.github.io/haiphong) and install from there."),
("Trình duyệt này cài được ngay: bấm Cài ngay.", "Этот браузер может установить приложение сразу: нажмите «Установить».", "This browser can install it right away: press Install now."),
("Đã cài: tìm biểu tượng HP Geoportal trên màn hình chính hoặc trong danh sách ứng dụng.", "Установлено: значок HP Geoportal на главном экране или в списке приложений.",
 "Installed: look for the HP Geoportal icon on the home screen or in the app list."),
("Làm theo hướng dẫn cho thiết bị của bạn dưới đây (dòng tô đậm).", "Следуйте инструкции для вашего устройства ниже (выделенная строка).", "Follow the instructions for your device below (highlighted line)."),
("đã cài ứng dụng", "приложение установлено", "app installed"),
]
HTML291 = {
  "ru": {"caiHD": """
  <ul class="sm">
    <li data-nen="android"><b>Android (Chrome, Edge, Samsung Internet)</b>: нажмите «Установить» ниже или меню ⋮ → «Установить приложение» (или «Добавить на главный экран»).</li>
    <li data-nen="ios"><b>iPhone, iPad (Safari)</b>: кнопка «Поделиться» (квадрат со стрелкой вверх) → «На экран „Домой“» → «Добавить».</li>
    <li data-nen="desktop"><b>Windows, Linux, ChromeOS (Chrome, Edge)</b>: нажмите «Установить», или значок установки в конце адресной строки, или меню → «Установить…» (Edge: «Приложения» → «Установить этот сайт как приложение»).</li>
    <li data-nen="mac"><b>macOS</b>: Chrome, Edge как выше; Safari 17 и новее: меню «Файл» → «Добавить в Dock».</li>
    <li><b>Firefox</b>: зависит от версии и системы; если пункта установки нет, откройте страницу в Chrome или Edge.</li>
  </ul>
  <p class="sm">Приложение открывает ту же страницу в отдельном окне со своим значком и обновляется вместе с сайтом. Без сети открываются интерфейс, точки и метки, сохранённые на устройстве; подложка и снимки требуют сети.</p>
  <p class="sm">На Android и компьютерах (Chrome, Edge) приложение использует те же сохранённые данные, что и сайт по тому же адресу. На iPhone и iPad у приложения своё хранилище: переносите точки и метки файлом прогресса JSON («Экспорт…» → файл прогресса, затем «Открыть файл…» в приложении).</p>
  <p class="sm">На компьютере (Chrome, Edge) после установки файлы прогресса JSON, CSV, GeoJSON можно открывать приложением (правый щелчок по файлу → «Открыть с помощью»); при выборе нескольких файлов прогресса открывается окно объединения.</p>
  """},
  "en": {"caiHD": """
  <ul class="sm">
    <li data-nen="android"><b>Android (Chrome, Edge, Samsung Internet)</b>: press "Install now" below, or menu ⋮ → "Install app" (or "Add to Home screen").</li>
    <li data-nen="ios"><b>iPhone, iPad (Safari)</b>: Share button (square with an up arrow) → "Add to Home Screen" → "Add".</li>
    <li data-nen="desktop"><b>Windows, Linux, ChromeOS (Chrome, Edge)</b>: press "Install now", or the install icon at the end of the address bar, or menu → "Install…" (Edge: "Apps" → "Install this site as an app").</li>
    <li data-nen="mac"><b>macOS</b>: Chrome, Edge as above; Safari 17 or later: File menu → "Add to Dock".</li>
    <li><b>Firefox</b>: depends on the version and system; if there is no install item, open the page in Chrome or Edge.</li>
  </ul>
  <p class="sm">The app is this same web page in its own window with its own icon, and it updates together with the site. Without a network it opens the interface and the points and labels saved on the device; the basemap and imagery need a network.</p>
  <p class="sm">On Android and computers (Chrome, Edge) the app shares the saved data with the website at the same address. On iPhone and iPad the app has its own storage: move points and labels with a JSON progress file (Export… → progress file, then Open file… in the app).</p>
  <p class="sm">On a computer (Chrome, Edge), once installed, JSON progress files, CSV and GeoJSON can be opened with the app (right-click the file → Open with); selecting several progress files opens the merge dialog.</p>
  """},
}
HELP291 = {
  "ru": ("<li><b>Объединение прогресса</b>", """
    <li><b>⤓ Установить приложение</b>: геопортал устанавливается как приложение на телефон, планшет и компьютер (свой значок, отдельное окно, запуск без сети); кнопка показывает инструкцию для устройства.</li>"""),
  "en": ("<li><b>Merging progress</b>", """
    <li><b>⤓ Install app</b>: the geoportal installs as an app on phones, tablets and computers (own icon, own window, opens offline); the button shows instructions for your device.</li>"""),
}
