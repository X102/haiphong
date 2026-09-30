// Bản 2.8.2: tiếng Anh là ngôn ngữ mặc định khi người dùng chưa chọn; lựa chọn được nhớ (khoá v2)
const {ok, xong} = require("./kiemtra"), {moTrang} = require("./trang");
(async () => {
  const {w, $, E, sleep, until} = moTrang({lang: null});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest + E0");
  ok(E("LANG") === "en", "chưa chọn ngôn ngữ: mặc định tiếng Anh (" + E("LANG") + ")");
  ok(w.document.documentElement.lang === "en" && $("selLang").value === "en", "thẻ html và ô chọn ngôn ngữ là en");
  ok(w.document.title === "Hai Phong Land Cover Geoportal", "tiêu đề trang tiếng Anh: " + w.document.title);
  const chu = () => { const tw = w.document.createTreeWalker(w.document.body, w.NodeFilter.SHOW_TEXT); let n, o = ""; while ((n = tw.nextNode())) if (!/SCRIPT|STYLE/.test(n.parentElement.tagName)) o += n.textContent + " "; return o; };
  const txt = chu();
  ok(/Open file…/.test(txt) && !/Tải tệp…/.test(txt), "chữ tĩnh đã dịch sang tiếng Anh ngay khi mở");
  ok(E("T_MISS.size") === 0 || E("Array.from(T_MISS).every(k => /thử/.test(k))"), "không có câu thiếu bản dịch (trừ tên dữ liệu thử): " + E("Array.from(T_MISS).join(' | ')"));
  E("setLang('vi')"); await sleep(50);
  ok(w.localStorage.getItem("laymau_hp_lang_v2") === '"vi"' && /Tải tệp…/.test(chu()), "chọn tiếng Việt: lưu khoá v2 và giao diện đổi sang tiếng Việt");
  E("setLang('xx')"); await sleep(50);
  ok(E("LANG") === "en", "mã ngôn ngữ lạ thì về tiếng Anh");
  xong();
})().catch(e => { console.error("LỖI", e); process.exit(1); });
