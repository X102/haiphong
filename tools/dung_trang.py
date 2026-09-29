# Dựng index.html (trang geoportal một tệp) từ src/. Chạy: python tools/dung_trang.py
# Muốn sửa bản dịch: sửa src/gen_i18n*.py rồi chạy (trong thư mục src) python trich_khoa.py && python gen_i18n.py trước.
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
S = R / "src"
s = (S / "tpl.html").read_text(encoding="utf-8")
sc = json.loads((S / "he_lop_v1.json").read_text(encoding="utf-8"))
for k, v in [("/*__SCHEME__*/null", json.dumps(sc, ensure_ascii=False)),
             ("/*__REL__*/", (S / "rel.js").read_text(encoding="utf-8").strip()),
             ("/*__WAYBACK__*/", (S / "wayback_core.js").read_text(encoding="utf-8").strip()),
             ("/*__VUNG__*/", (S / "vung_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V21__*/", (S / "v21_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__OSM__*/", (S / "osm_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V22__*/", (S / "v22_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V23__*/", (S / "v23_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V24__*/", (S / "v24_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V25__*/", (S / "v25_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V26__*/", (S / "v26_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__AI__*/", (S / "ai_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__CHISO__*/null", (S / "chiso_s2.json").read_text(encoding="utf-8").strip()),
             ("/*__I18N__*/{}", json.dumps(json.loads((S / "i18n.json").read_text(encoding="utf-8")), ensure_ascii=False))]:
    assert s.count(k) == 1, k
    s = s.replace(k, v)
(R / "index.html").write_text(s, encoding="utf-8")
print("index.html:", len(s), "ký tự")
