# Trích mọi câu tiếng Việt cần dịch: chữ tĩnh trong <body>, thuộc tính title/placeholder, và đối số chuỗi của T()/msg()/vgTrang()/confirm()
import re, json, html as H
VI = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", re.I)
t = open("tpl.html", encoding="utf-8").read()
body = t[t.index("<body>"):t.index('<script id="core">')]
# bỏ các khối data-i18n-html (dịch nguyên khối, xử lý riêng)
khoi = {}
for m in re.finditer(r'<(\w+)([^>]*?)data-i18n-html="(\w+)"([^>]*)>', body):
    tag, k = m.group(1), m.group(3)
    depth, i = 1, m.end()
    while depth:
        a = re.compile(rf"<{tag}\b|</{tag}>").search(body, i)
        depth += 1 if a.group(0).startswith(f"<{tag}") and not a.group(0).startswith("</") else -1
        i = a.end()
    khoi[k] = body[m.end():a.start()]
body2 = body
for k, v in khoi.items(): body2 = body2.replace(v, "")
static = []
for x in re.findall(r">([^<>]+)<", body2):
    k = re.sub(r"\s+", " ", H.unescape(x)).strip()
    if k and VI.search(k): static.append(k)
attrs = [H.unescape(a) for a in re.findall(r'(?:title|placeholder)="([^"]+)"', body2) if VI.search(a)]
src = t[t.index('<script id="ui">'):] + open("vung_ui.js", encoding="utf-8").read() + open("v21_ui.js", encoding="utf-8").read() + open("osm_ui.js", encoding="utf-8").read() + open("v22_ui.js", encoding="utf-8").read() + open("v23_ui.js", encoding="utf-8").read() + open("wayback_core.js", encoding="utf-8").read()
dyn = []
for m in re.finditer(r'\b(?:T|msg|vgTrang|confirm|Error)\(\s*(["\'])((?:\\.|(?!\1).)*)\1', src):
    k = m.group(2).replace('\\"', '"').replace("\\'", "'")
    if VI.search(k): dyn.append(k)
# giá trị của các bảng chữ
for name in ["GOI_Y", "LINK_LBL", "S2_PRE_TEN", "PV_GIAI", "HL_GIAI"]:
    m = re.search(name + r" = \{(.*?)\};", src, re.S)
    dyn += [v for v in re.findall(r':\s*"([^"]+)"', m.group(1)) if VI.search(v)]
dyn += [v for f in ("v21_ui.js", "osm_ui.js") for v in re.findall(r'ten: "([^"]+)"', open(f, encoding="utf-8").read()) if VI.search(v)]
dyn += ["thực vật", "nước", "xây dựng", "đất trống", "thấp", "vừa", "cao", "tự động", "theo ranh giới đã sửa", "theo ranh giới",
        "đã thêm xã {x}", "đã bỏ xã {x}", "đặc trưng mẫu lấy tại chỗ ở từng năm; mảng đã xoá bị bỏ ở mọi năm. ● năm gốc. Nhấp một dòng để xem năm đó.",
        "điểm mẫu lấy đặc trưng ở năm {y}, áp cho mọi năm; mảng đã xoá cũng bị bỏ ở mọi năm. Nhấp một dòng để xem vùng của năm đó.",
        "chưa chọn xã nào trong danh sách (hoặc Ctrl + nhấp lên bản đồ để chọn xã)"]
out = []
for k in static + attrs + dyn:
    if k not in out: out.append(k)
json.dump({"keys": out, "html": khoi}, open("khoa_can_dich.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(static), "tĩnh,", len(attrs), "thuộc tính,", len(dyn), "động ->", len(out), "khoá duy nhất;", len(khoi), "khối html:", list(khoi))
