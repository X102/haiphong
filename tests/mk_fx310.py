# Bản 3.10: dữ liệu giả Overture (PMTiles v3 + vector tile) quanh điểm E0001, đáp án biết trước.
# places.pmtiles: nén gzip (ô và thư mục), chỉ thư mục gốc. buildings.pmtiles: không nén, thư mục gốc trỏ sang thư mục lá.
# Ghi /tmp/fx/data/ov/catalog.json (STAC giả) và /tmp/fx/data/ov/2026-09-23.1/{places,buildings}.pmtiles; in đáp án ra JSON.
import gzip, json, math, os, struct

OUT = "/tmp/fx/data/ov"
BAN = "2026-09-23.1"
Z, EXT = 14, 4096
N = 2 ** Z
LAT0 = 20.909385410114663                                       # gần E0001, nhưng cách cạnh tây của ô mức 14 đúng 150 m
_tx = int((106.64424531272357 + 180) / 360 * N)
LON0 = _tx / N * 360 - 180 + 150 / (111320.0 * math.cos(math.radians(LAT0)))


def ll(dx, dy):                       # mét đông, mét bắc -> lon, lat
    return LON0 + dx / (111320.0 * math.cos(math.radians(LAT0))), LAT0 + dy / 110574.0


def gxy(lon, lat):                    # lon, lat -> toạ độ toàn cầu theo đơn vị ô * EXT
    la = math.radians(lat)
    return (lon + 180) / 360 * N * EXT, (1 - math.log(math.tan(la) + 1 / math.cos(la)) / math.pi) / 2 * N * EXT


# ---------- protobuf / MVT ----------
def varint(v):
    out = bytearray()
    while True:
        b = v & 0x7F; v >>= 7
        if v: out.append(b | 0x80)
        else: out.append(b); return bytes(out)


def zz(v): return (v << 1) ^ (v >> 31) if v >= 0 else ((-v) << 1) - 1


def fld(f, wt, payload):
    return varint((f << 3) | wt) + payload


def ldel(f, b): return fld(f, 2, varint(len(b)) + b)


def packed(vals): return b"".join(varint(v) for v in vals)


def value(v):
    if isinstance(v, bool): return fld(7, 0, varint(1 if v else 0))
    if isinstance(v, str): return ldel(1, v.encode())
    if isinstance(v, int): return fld(4, 0, varint(v)) if v >= 0 else fld(6, 0, varint(zz(v)))
    return fld(3, 1, struct.pack("<d", float(v)))


def geom(kind, rings):                # rings: danh sách [(x, y), ...] theo toạ độ ô (số nguyên)
    out, cx, cy = [], 0, 0
    for r in rings:
        pts = r if kind == 1 else r
        x, y = pts[0]
        out += [(1 & 7) | (1 << 3), zz(x - cx), zz(y - cy)]; cx, cy = x, y
        if kind == 1: continue
        rest = pts[1:]
        out.append((2 & 7) | (len(rest) << 3))
        for x, y in rest:
            out += [zz(x - cx), zz(y - cy)]; cx, cy = x, y
        out.append((7 & 7) | (1 << 3))
    return out


def layer(name, feats):              # feats: [(kind, rings, props)]
    keys, vals, kd, vd, fb = [], [], {}, {}, b""
    for kind, rings, props in feats:
        tags = []
        for k, v in props.items():
            if k not in kd: kd[k] = len(keys); keys.append(k)
            vk = (type(v).__name__, v)
            if vk not in vd: vd[vk] = len(vals); vals.append(v)
            tags += [kd[k], vd[vk]]
        f = ldel(2, packed(tags)) + fld(3, 0, varint(kind)) + ldel(4, packed(geom(kind, rings)))
        fb += ldel(2, f)
    body = fld(15, 0, varint(2)) + ldel(1, name.encode()) + fb
    body += b"".join(ldel(3, k.encode()) for k in keys) + b"".join(ldel(4, value(v)) for v in vals) + fld(5, 0, varint(EXT))
    return ldel(3, body)


# ---------- PMTiles ----------
def tile_id(z, x, y):
    acc = sum(4 ** t for t in range(z)); n = 2 ** z; d = 0; s = n // 2
    while s >= 1:
        rx = 1 if x & s else 0; ry = 1 if y & s else 0
        d += s * s * ((3 * rx) ^ ry)
        if ry == 0:
            if rx == 1: x, y = n - 1 - x, n - 1 - y
            x, y = y, x
        s //= 2
    return acc + d


def directory(entries):              # [(id, off, len, rl)]
    b = varint(len(entries)); last = 0
    for e in entries: b += varint(e[0] - last); last = e[0]
    for e in entries: b += varint(e[3])
    for e in entries: b += varint(e[2])
    for i, e in enumerate(entries):
        b += varint(0) if i > 0 and e[1] == entries[i - 1][1] + entries[i - 1][2] else varint(e[1] + 1)
    return b


def pmtiles(path, tiles, nen, la):   # tiles: {(z,x,y): mvt bytes}; nen: 1 không nén / 2 gzip; la: dùng thư mục lá
    cz = (lambda b: gzip.compress(b, mtime=0)) if nen == 2 else (lambda b: b)
    data, ents = b"", []
    for (z, x, y), t in sorted(tiles.items(), key=lambda kv: tile_id(*kv[0])):
        c = cz(t); ents.append((tile_id(z, x, y), len(data), len(c), 1)); data += c
    if la:
        leaf = cz(directory(ents)); root = cz(directory([(ents[0][0], 0, len(leaf), 0)]))
    else:
        leaf = b""; root = cz(directory(ents))
    meta = cz(b"{}")
    ro = 127; mo = ro + len(root); lo = mo + len(meta); do = lo + len(leaf)
    h = b"PMTiles" + bytes([3]) + struct.pack("<QQQQQQQQQQQ", ro, len(root), mo, len(meta), lo, len(leaf), do, len(data), len(ents), len(ents), len(ents))
    h += bytes([1, nen, nen, 1, 0, Z]) + struct.pack("<iiii", -1800000000, -850000000, 1800000000, 850000000) + bytes([Z]) + struct.pack("<ii", 0, 0)
    assert len(h) == 127, len(h)
    with open(path, "wb") as f: f.write(h + root + meta + leaf + data)


def gan(feats_ll):                   # [(kind, [vòng lon/lat], props)] -> {(z,x,y): [(kind, vòng ô, props)]}
    out = {}
    for kind, rings, props in feats_ll:
        g = [[gxy(*p) for p in r] for r in rings]
        cx = sum(p[0] for p in g[0]) / len(g[0]); cy = sum(p[1] for p in g[0]) / len(g[0])
        tx, ty = int(cx // EXT), int(cy // EXT)
        hai = props.pop("_hai", False)
        for t2 in ([tx, tx + 1] if hai else [tx]):          # _hai: đối tượng sát cạnh ô, có mặt ở cả hai ô (như ô vector thật)
            out.setdefault((Z, t2, ty), []).append((kind, [[(round(x - t2 * EXT), round(y - ty * EXT)) for x, y in r] for r in g], dict(props)))
    return out


def tax(*h): return json.dumps({"primary": h[-1], "hierarchy": list(h)})


def hv(dx, dy, w, h):                # hình chữ nhật w x h mét, tâm (dx, dy); vòng ngoài thuận chiều kim đồng hồ trên màn hình (y xuống)
    return [ll(dx - w / 2, dy + h / 2), ll(dx + w / 2, dy + h / 2), ll(dx + w / 2, dy - h / 2), ll(dx - w / 2, dy - h / 2)]


def main():
    os.makedirs(f"{OUT}/{BAN}", exist_ok=True)
    P = []
    for i in range(8):                      # 8 cửa hàng trong 80 m
        a = i * math.pi / 4; d = 20 + 8 * i
        P.append((1, [[ll(d * math.cos(a), d * math.sin(a))]], {"id": f"tm{i}", "@name": f"Cửa hàng {i}", "basic_category": "clothing_store", "taxonomy": tax("shopping", "fashion_and_apparel_store"), "confidence": 0.9}))
    for i in range(4):                      # 4 quán ăn 150-200 m
        a = 0.3 + i * 1.5; d = 150 + 15 * i
        P.append((1, [[ll(d * math.cos(a), d * math.sin(a))]], {"id": f"au{i}", "@name": f"Quán {i}", "basic_category": "restaurant", "taxonomy": tax("food_and_drink", "restaurant"), "confidence": 0.8}))
    P.append((1, [[ll(0, 120)]], {"id": "gd0", "@name": "Trường A", "basic_category": "school", "taxonomy": tax("education", "school"), "confidence": 0.95}))
    P.append((1, [[ll(50, 0)]], {"id": "kem", "@name": "Tin cậy thấp", "basic_category": "clothing_store", "taxonomy": tax("shopping", "clothing_store"), "confidence": 0.1}))
    P.append((1, [[ll(-60, 0)]], {"id": "kh0", "@name": "Mốc", "basic_category": "landmark", "confidence": 0.7}))     # không có taxonomy
    P.append((1, [[ll(300, 0)]], {"id": "cn0", "@name": "Nhà máy B", "basic_category": "manufacturer", "taxonomy": tax("services_and_business", "b2b_service", "manufacturer"), "confidence": 0.9}))
    P.append((1, [[ll(-150 - 3, 20)]], {"id": "dup", "@name": "Sát cạnh ô", "basic_category": "hospital", "taxonomy": tax("health_care", "hospital"), "confidence": 0.9, "_hai": True}))
    P.append((1, [[ll(-400, 0)]], {"id": "cn1", "@name": "Kho C", "basic_category": "warehouse", "taxonomy": tax("services_and_business", "b2b_transportation_and_storage_service", "warehouse"), "confidence": 0.9}))
    P.append((1, [[ll(0, -900)]], {"id": "xa", "@name": "Xa", "basic_category": "restaurant", "taxonomy": tax("food_and_drink", "restaurant"), "confidence": 0.9}))
    B = []
    for i in range(10):                     # 10 nhà 10 x 10 m trong 40-200 m
        a = i * 0.63; d = 40 + 16 * i
        B.append((3, [hv(d * math.cos(a), d * math.sin(a), 10, 10)], {"id": f"n{i}", "@geometry_source": "Google Open Buildings", "is_underground": False}))
    B.append((3, [hv(-150 / math.sqrt(2), -150 / math.sqrt(2), 60, 50)], {"id": "xuong", "@geometry_source": "Microsoft ML Buildings", "is_underground": False}))
    B.append((3, [hv(0, 60, 20, 20)], {"id": "cc", "@geometry_source": "OpenStreetMap", "num_floors": 5, "height": 16.0, "class": "apartments", "is_underground": False}))
    o = hv(220, 0, 30, 30); lo_ = hv(220, 0, 10, 10)[::-1]                        # vòng trong ngược chiều: lỗ
    B.append((3, [o, lo_], {"id": "lo", "@geometry_source": "OpenStreetMap", "is_underground": False}))
    B.append((3, [hv(0, -30, 12, 12)], {"id": "ham", "@geometry_source": "OpenStreetMap", "is_underground": True}))
    B.append((3, [hv(-200, 30, 10, 10)], {"id": "ben", "@geometry_source": "Google Open Buildings", "is_underground": False}))    # ở ô bên tây
    B.append((3, [hv(0, 700, 10, 10)], {"id": "xa", "@geometry_source": "Google Open Buildings", "is_underground": False}))
    tp = {k: layer("place", f) for k, f in gan(P).items()}
    tb = {k: layer("building", f) for k, f in gan(B).items()}
    pmtiles(f"{OUT}/{BAN}/places.pmtiles", tp, 2, False)
    pmtiles(f"{OUT}/{BAN}/buildings.pmtiles", tb, 1, True)
    json.dump({"type": "Catalog", "id": "overture", "links": [{"rel": "child", "href": "./2026-08-19.0/catalog.json"}, {"rel": "child", "href": f"./{BAN}/catalog.json"}]}, open(f"{OUT}/catalog.json", "w"))
    kq = {"lon": LON0, "lat": LAT0, "o_poi": sorted(tp), "o_nha": sorted(tb)}
    json.dump(kq, open(f"{OUT}/dap_an.json", "w")); print(json.dumps(kq))


if __name__ == "__main__":
    main()
