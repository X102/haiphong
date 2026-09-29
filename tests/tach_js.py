# Tách các khối <script id=...> của LAY_MAU_DA_NAM.html ra _js/ để kiểm thử bằng node
import re, os
D = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{D}/_js", exist_ok=True)
TRANG = next(f for f in (f"{os.path.dirname(D)}/LAY_MAU_DA_NAM.html", f"{os.path.dirname(D)}/index.html") if os.path.exists(f))
s = open(TRANG, encoding="utf-8").read()
for n, b in re.findall(r'<script id="(\w+)">(.*?)</script>', s, re.S):
    open(f"{D}/_js/{n}.js", "w", encoding="utf-8").write(b)
print("tách:", [n for n, _ in re.findall(r'<script id="(\w+)">(.*?)</script>', s, re.S)])
