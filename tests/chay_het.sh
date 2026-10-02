#!/bin/bash
# Chạy mọi bài thử của trang lấy mẫu. Cần: node, python (rasterio, geopandas, pymupdf cho bài thử PDF có toạ độ), /tmp/nt/node_modules
# (npm install jsdom@24.1.3 leaflet@1.9.4 proj4@2.9.2 geotiff@2.1.3 @geoman-io/leaflet-geoman-free@2.20.2 flatgeobuf@4.5.0 osmtogeojson@3.0.0-beta.5 polygon-clipping@0.15.7)
cd "$(dirname "$0")"
[ -f /tmp/fx/data/manifest.json ] || python3 mk_fixtures.py
python3 tach_js.py > /dev/null
PV=../phuc_vu_cuc_bo.py; [ -f $PV ] || PV=../tools/phuc_vu_cuc_bo.py
python3 $PV /tmp/fx/data 8765 > /tmp/fx/srv.log 2>&1 & SP=$!
sleep 1.5
F=0
for t in ${@:-t_core t_vung t_sai t_cog t_dom t_vung_dom t_vung2_dom t_geo_dom t_v21_dom t_v22_dom t_v23_dom t_v24_dom t_v25_dom t_v26_dom t_v27_dom t_v271_dom t_v28_dom t_v281_dom t_v282_dom t_v29_dom t_v30_dom t_v31_dom t_v32_dom t_v33_dom t_pwa_dom t_sw t_gas}; do
  KQ="$(NM=${NM:-/tmp/nt/node_modules} timeout 200 node $t.js 2>&1 | grep -v '^   ' | grep 'LỖI\|ĐẠT' | cut -c1-220 | tr '\n' ' ')"
  echo "== $t: $KQ"
  case "$KQ" in *"TẤT CẢ ĐẠT"*) ;; *) F=1;; esac
done
kill $SP 2>/dev/null
if [ -z "$1" ]; then                        # bài thử Python: relay AI (máy chủ giả), OSM
  for t in t_ai_relay t_osm_py t_colab27 t_xh_core; do
    [ -f $t.py ] || continue
    KQ="$(timeout 200 python3 $t.py 2>&1 | grep 'LỖI\|ĐẠT' | cut -c1-220 | tr '\n' ' ')"
    echo "== $t: $KQ"
    case "$KQ" in *"TẤT CẢ ĐẠT"*) ;; *) F=1;; esac
  done
fi
exit $F
