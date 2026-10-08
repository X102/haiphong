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
             ("/*__V27__*/", (S / "v27_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__TK__*/", (S / "tk_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__PL__*/", (S / "pl_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__BC__*/", (S / "bc_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__XHCORE__*/", (S / "xh_core.js").read_text(encoding="utf-8").strip()),
             ("/*__V28__*/", (S / "v28_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__XH__*/", (S / "xh_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__XB__*/", (S / "xb_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V29__*/", (S / "v29_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V30__*/", (S / "v30_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__S2OCORE__*/", (S / "s2o_core.js").read_text(encoding="utf-8").strip()),
             ("/*__V31__*/", (S / "v31_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V32__*/", (S / "v32_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V33__*/", (S / "v33_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V34__*/", (S / "v34_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V35__*/", (S / "v35_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V36__*/", (S / "v36_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V37__*/", (S / "v37_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V39__*/", (S / "v39_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V310__*/", (S / "v310_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V3101__*/", (S / "v3101_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V311__*/", (S / "v311_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V313__*/", (S / "v313_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__V314__*/", (S / "v314_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__PWA__*/", (S / "pwa_ui.js").read_text(encoding="utf-8").strip()),
             ("/*__PWA_DAU__*/", (S / "pwa" / "pwa_dau.js").read_text(encoding="utf-8").strip()),
             ("/*__CHISO__*/null", (S / "chiso_s2.json").read_text(encoding="utf-8").strip()),
             ("/*__I18N__*/{}", json.dumps(json.loads((S / "i18n.json").read_text(encoding="utf-8")), ensure_ascii=False))]:
    assert s.count(k) == 1, k
    s = s.replace(k, v)
(R / "index.html").write_text(s, encoding="utf-8")
print("index.html:", len(s), "ký tự")
# bản 2.9.1: các tệp của ứng dụng cài được (PWA) đặt cạnh index.html: manifest, service worker có số phiên bản, biểu tượng
import re, shutil
V = re.search(r'const VERSION = "([^"]+)"', s).group(1)
shutil.copyfile(S / "pwa" / "manifest.webmanifest", R / "manifest.webmanifest")
(R / "sw.js").write_text((S / "pwa" / "sw_tpl.js").read_text(encoding="utf-8").replace("__VERSION__", V), encoding="utf-8")
(R / "icons").mkdir(exist_ok=True)
for f in (S / "pwa" / "icons").iterdir(): shutil.copyfile(f, R / "icons" / f.name)
print("ứng dụng cài được: manifest.webmanifest, sw.js (bản " + V + "), icons/")
