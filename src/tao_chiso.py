# Dựng chiso_s2.json (thư viện chỉ số của geoportal) từ tệp GEE 248-INDEX-S2.txt của tác giả
# (danh sách 248 chỉ số Sentinel-2 theo Index DataBase, biểu thức GEE trên phản xạ 0..1, hằng số trong "kihieu").
# Chạy: python tao_chiso.py <đường dẫn tệp 248-INDEX-S2.txt> (tệp gốc không kèm trong kho; chiso_s2.json đã dựng sẵn)
import json, re, sys, pathlib
D = pathlib.Path(__file__).parent
NGUON = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else D / "248-INDEX-S2.txt"
s = NGUON.read_text(encoding="utf-8")

bt = {int(a): b.strip() for a, b in re.findall(r"var index_(\d+)\s*=\s*'([^']*)'", s)}
ten = re.findall(r"'([^']*)'", re.search(r"var full_name\s*=\s*\[(.*?)\]", s, re.S).group(1))
kh = s[s.index("var kihieu"):s.index("};", s.index("var kihieu"))]
hang = {k: float(v) for k, v in re.findall(r"'([A-Za-z_][A-Za-z_0-9]*)'\s*:\s*(-?[\d.]+)\s*,?", kh)}
assert len(bt) == 248 and len(ten) == 248, (len(bt), len(ten))

ds = []
for i in range(1, 249):
    k = s.index(f"var index_{i} ") if f"var index_{i} " in s else s.index(f"var index_{i}=")
    a = s.rfind(f"// {i}\n", 0, k)
    chu = [l.strip()[2:].strip() for l in s[a:k].splitlines()[1:] if l.strip().startswith("//")] if a >= 0 else []
    ten_day = next((l for l in chu if l and not l.startswith("General formula") and not l.startswith("Initialize")), "")
    ct = next((l.split(":", 1)[1].strip() for l in chu if l.startswith("General formula")), "")
    m = re.search(r"\(abbrv\.\s*([^)]*)\)", ten_day)
    ngan = ten[i - 1].split("_", 1)[1] if "_" in ten[i - 1] else ten[i - 1]
    thieu = sorted(set(re.findall(r"\bB(01|09|10)\b", bt[i])))
    ds.append({"so": i, "id": ten[i - 1], "ten": ngan, "ten_day": re.sub(r"\s*\(abbrv\..*?\)\s*", "", ten_day).strip(),
               "viet_tat": m.group(1).strip() if m else ngan, "cong_thuc": ct, "bt": bt[i],
               "thieu": ["B" + x.lstrip("0") for x in thieu]})

out = {"nguon": "Index DataBase (IDB), 248 chỉ số Sentinel-2; biểu thức theo tệp 248-INDEX-S2.txt của tác giả",
       "ghi_chu": "biểu thức trên phản xạ 0..1 (DN / 10000); B1, B9, B10 không có trong ảnh S2 10 băng của trang",
       "hang": hang, "ds": ds}
(D / "chiso_s2.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
dung = [x for x in ds if not x["thieu"]]
print(f"{len(ds)} chỉ số, dùng được {len(dung)}, cần B1/B9/B10: {len(ds) - len(dung)}; {len(hang)} hằng số; "
      f"{sum(1 for x in ds if not x['ten_day'])} không có tên đầy đủ")
