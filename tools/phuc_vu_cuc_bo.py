# -*- coding: utf-8 -*-
"""
Máy chủ tĩnh cục bộ cho LAY_MAU_DA_NAM.html, có hỗ trợ đọc từng đoạn (HTTP Range) và CORS.

`python -m http.server` KHÔNG trả lời yêu cầu Range, nên geotiff.js không đọc được ảnh COG
qua nó. Dùng tệp này thay thế:

    python phuc_vu_cuc_bo.py                 # phục vụ thư mục hiện tại ở cổng 8000
    python phuc_vu_cuc_bo.py D:/HP_HF 8001   # thư mục và cổng tự chọn

Rồi mở http://localhost:8000/LAY_MAU_DA_NAM.html. Nếu thư mục phục vụ chứa luôn dữ liệu
(manifest.json, s2tc/, pca/, diem/, ...), trong Cài đặt của trang đặt "địa chỉ gốc tự chọn"
là http://localhost:8000/ để đọc dữ liệu cục bộ thay cho Hugging Face.
Chỉ lắng nghe trên 127.0.0.1.
"""
import functools
import http.server
import os
import re
import sys


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".tif": "image/tiff", ".json": "application/json", ".csv": "text/csv",
                      ".js": "text/javascript", ".html": "text/html; charset=utf-8"}

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Range")
        self.send_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_head(self):
        self._remain = None
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", (rng or "").strip())
        if not m or os.path.isdir(path) or not os.path.isfile(path) or (m.group(1) == m.group(2) == ""):
            return super().send_head()
        f = open(path, "rb")
        size = os.fstat(f.fileno()).st_size
        if m.group(1) == "":                       # bytes=-N: N byte cuối
            start, end = max(0, size - int(m.group(2))), size - 1
        else:
            start = int(m.group(1))
            end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
        if start >= size or start > end:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        f.seek(start)
        self._remain = end - start + 1
        return f

    def copyfile(self, src, dst):
        n = getattr(self, "_remain", None)
        if n is None:
            return super().copyfile(src, dst)
        while n > 0:
            buf = src.read(min(1 << 16, n))
            if not buf:
                break
            dst.write(buf)
            n -= len(buf)

    def log_message(self, fmt, *args):
        if os.environ.get("PV_LOG"):
            super().log_message(fmt, *args)


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    h = functools.partial(RangeHandler, directory=os.path.abspath(root))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), h)
    print(f"phục vụ {os.path.abspath(root)} tại http://localhost:{port}/  (Ctrl+C để dừng)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
