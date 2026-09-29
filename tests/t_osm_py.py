# Bài thử phần đọc OSM của ô HF_OSM_cell.py (pyosmium): đa giác từ way và từ quan hệ multipolygon có lỗ,
# đường, điểm, lọc theo ranh giới, ghi FlatGeobuf. Cần: pip install osmium geopandas pyogrio
import os, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
GOC = next(d for d in (os.path.dirname(HERE), os.path.join(os.path.dirname(HERE), "colab")) if os.path.exists(os.path.join(d, "HF_OSM_cell.py")))
ns = {}; exec(open(os.path.join(GOC, "HF_OSM_cell.py"), encoding="utf-8").read().split("# ---------------- CHẠY (Colab)")[0], ns)
from shapely.geometry import box
import geopandas as gpd
XML = """<?xml version="1.0" encoding="UTF-8"?><osm version="0.6">
<node id="1" lat="20.80" lon="106.60" version="1"/><node id="2" lat="20.80" lon="106.61" version="1"/>
<node id="3" lat="20.81" lon="106.61" version="1"/><node id="4" lat="20.81" lon="106.60" version="1"/>
<node id="5" lat="20.82" lon="106.62" version="1"/><node id="6" lat="20.82" lon="106.63" version="1"/>
<node id="7" lat="20.83" lon="106.63" version="1"/><node id="8" lat="20.83" lon="106.62" version="1"/>
<node id="9" lat="20.805" lon="106.605" version="1"><tag k="amenity" v="school"/><tag k="name" v="Trường A"/></node>
<node id="10" lat="20.79" lon="106.59" version="1"/><node id="11" lat="20.84" lon="106.64" version="1"/>
<node id="20" lat="20.821" lon="106.621" version="1"/><node id="21" lat="20.821" lon="106.622" version="1"/>
<node id="22" lat="20.822" lon="106.622" version="1"/><node id="23" lat="20.822" lon="106.621" version="1"/>
<node id="30" lat="25.0" lon="110.0" version="1"/><node id="31" lat="25.0" lon="110.01" version="1"/><node id="32" lat="25.01" lon="110.01" version="1"/>
<way id="100" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="landuse" v="industrial"/><tag k="name" v="KCN"/></way>
<way id="101" version="1"><nd ref="5"/><nd ref="6"/><nd ref="7"/><nd ref="8"/><nd ref="5"/></way>
<way id="102" version="1"><nd ref="20"/><nd ref="21"/><nd ref="22"/><nd ref="23"/><nd ref="20"/></way>
<way id="103" version="1"><nd ref="10"/><nd ref="11"/><tag k="highway" v="primary"/></way>
<way id="104" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="building" v="yes"/></way>
<way id="105" version="1"><nd ref="30"/><nd ref="31"/><nd ref="32"/><nd ref="30"/><tag k="landuse" v="farmland"/></way>
<relation id="200" version="1"><member type="way" ref="101" role="outer"/><member type="way" ref="102" role="inner"/>
<tag k="type" v="multipolygon"/><tag k="natural" v="water"/><tag k="water" v="pond"/></relation></osm>"""
loi = 0
def ok(c, m):
    global loi
    print(("  ok  " if c else "  LỖI ") + m); loi += 0 if c else 1
d = tempfile.mkdtemp(); p = os.path.join(d, "t.osm"); open(p, "w", encoding="utf-8").write(XML)
kq = ns["doc_pbf"](p, ["sdd", "nuoc", "nha", "duong", "diem"], box(106.5, 20.7, 106.7, 20.9))
ok(kq["sdd"].the.tolist() == ["landuse=industrial"] and kq["sdd"].osm_id.tolist() == [100], "đa giác từ way khép kín; bỏ đối tượng ngoài ranh giới")
w = kq["nuoc"]
ok(len(w) == 1 and w.osm_type[0] == "relation" and w.osm_id[0] == 200 and abs(w.geometry[0].area / 1e-4 - 0.99) < 1e-6, "quan hệ multipolygon: vòng ngoài trừ lỗ (way thành phần không có thẻ)")
ok(kq["nha"].the.tolist() == ["building=yes"] and kq["duong"].geom_type.tolist() == ["MultiLineString"] and kq["diem"].ten.tolist() == ["Trường A"], "nhà, đường, điểm")
f = os.path.join(d, "n.fgb"); ns["ghi_fgb"](w, f); r = gpd.read_file(f)
ok(r.geom_type.tolist() == ["MultiPolygon"] and '"water": "pond"' in r.tags[0], "ghi FlatGeobuf, thẻ JSON")
print("TẤT CẢ ĐẠT" if not loi else f"{loi} LỖI"); sys.exit(1 if loi else 0)
