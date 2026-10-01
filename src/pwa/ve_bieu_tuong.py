# Biểu tượng ứng dụng (PWA) của geoportal: ba lớp phủ xếp chồng (thực vật, nước, xây dựng) trên nền xanh đậm, ghim vị trí.
# Chạy: python ve_bieu_tuong.py  ->  icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png, favicon-32.png, icon.svg
import cairosvg, pathlib
D = pathlib.Path(__file__).parent / "icons"; D.mkdir(exist_ok=True)
def lop(cx, cy, w, h, mau, vien="#ffffff"):          # một lớp hình thoi (bản đồ nhìn nghiêng)
    return (f'<path d="M {cx} {cy - h} L {cx + w} {cy} L {cx} {cy + h} L {cx - w} {cy} Z" fill="{mau}" stroke="{vien}" '
            f'stroke-width="10" stroke-linejoin="round"/>')
def svg(nen_tron=True, ty=1.0):
    s = 512; k = ty; cx = 256
    nd = (f'<rect width="{s}" height="{s}" rx="{110 if nen_tron else 0}" fill="url(#g)"/>')
    w, h = 150 * k, 78 * k
    y0 = 256 + 70 * k
    body = lop(cx, y0, w, h, "#d62728") + lop(cx, y0 - 62 * k, w, h, "#1f77b4") + lop(cx, y0 - 124 * k, w, h, "#2ca02c")
    ghim = (f'<g transform="translate({cx + 70 * k},{y0 - 205 * k}) scale({k})"><path d="M0 -58 C 34 -58 52 -32 52 -8 C 52 22 18 50 0 78 C -18 50 -52 22 -52 -8 C -52 -32 -34 -58 0 -58 Z" '
            f'fill="#ffd166" stroke="#ffffff" stroke-width="9"/><circle cx="0" cy="-8" r="17" fill="#0f4c5c"/></g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
            f'<stop offset="0" stop-color="#13606f"/><stop offset="1" stop-color="#0a3540"/></linearGradient></defs>{nd}{body}{ghim}</svg>')
thuong, che = svg(True, 1.0), svg(False, 0.78)       # "maskable": nền tràn, hình gọn trong vòng an toàn 80 %
(D / "icon.svg").write_text(thuong, encoding="utf-8")
for ten, s, src in [("icon-192.png", 192, thuong), ("icon-512.png", 512, thuong), ("maskable-512.png", 512, che), ("maskable-192.png", 192, che),
                    ("apple-touch-icon.png", 180, che), ("favicon-32.png", 32, thuong)]:
    cairosvg.svg2png(bytestring=src.encode(), write_to=str(D / ten), output_width=s, output_height=s)
print("ok", sorted(p.name for p in D.iterdir()))
