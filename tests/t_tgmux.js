// Bản 3.18.1: bộ ghép video của trang (tg_mux.js) kiểm bằng ffmpeg: khung VP9 (libvpx) và H.264 (libx264, có và không có B-frame) mã hoá
// sẵn được ghép thành WebM / MP4; tệp ra phải có đủ số khung, đúng thời lượng, tua được, và giải mã ra ĐÚNG từng khung như tệp gốc (framemd5).
const {ok, xong} = require("./kiemtra"), fs = require("fs"), path = require("path"), {execFileSync, spawnSync} = require("child_process");
const canhBao = f => spawnSync("ffmpeg", ["-v", "warning", "-i", f, "-f", "null", "-"]).stderr.toString().trim();
const TGM = require(path.join(__dirname, "..", fs.existsSync(path.join(__dirname, "..", "tg_mux.js")) ? "tg_mux.js" : "src/tg_mux.js"));
const D = fs.mkdtempSync("/tmp/tgmux-"), chay = (cmd, a) => execFileSync(cmd, a, {maxBuffer: 1 << 28}).toString();
let coFF = true; try { chay("ffmpeg", ["-version"]); } catch (e) { coFF = false; }
if (!coFF) { console.log("  ok  bỏ qua: máy không có ffmpeg"); xong(); return; }
const md5 = f => chay("ffmpeg", ["-v", "error", "-i", f, "-f", "framemd5", "-"]).split("\n").filter(l => l && l[0] !== "#").map(l => l.split(",").pop().trim());
const thoiLuong = f => +chay("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim();
const demKhung = f => +chay("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", f]).trim();
const FPS = 30, N = 90, W = 320, H = 240, src = ["-f", "lavfi", "-i", `testsrc2=size=${W}x${H}:rate=${FPS}`, "-frames:v", String(N), "-pix_fmt", "yuv420p"];

// ---------- 1. VP9 -> WebM
chay("ffmpeg", ["-v", "error", "-y", ...src, "-c:v", "libvpx-vp9", "-b:v", "600k", "-g", "60", "-f", "ivf", D + "/a.ivf"]);
const ivf = fs.readFileSync(D + "/a.ivf"), mauV = []; let p = ivf.readUInt16LE(6);
while (p + 12 <= ivf.length) { const n = ivf.readUInt32LE(p), pts = Number(ivf.readBigUInt64LE(p + 4)), b = new Uint8Array(ivf.subarray(p + 12, p + 12 + n));
  mauV.push({b, ts: Math.round(pts * 1e6 / FPS), key: ((b[0] >> 2) & 1) === 0 && (b[0] >> 6) === 2}); p += 12 + n; }
fs.writeFileSync(D + "/a.webm", TGM.webm(mauV, W, H, FPS, "V_VP9"));
ok(mauV.length === N && mauV[0].key, `VP9: ${mauV.length} khung mã hoá sẵn, khung đầu là khung khoá`);
ok(demKhung(D + "/a.webm") === N && Math.abs(thoiLuong(D + "/a.webm") - N / FPS) < 0.05, `WebM: ${demKhung(D + "/a.webm")} khung, thời lượng ${thoiLuong(D + "/a.webm")} s (cần ${N / FPS} s)`);
const mA = md5(D + "/a.ivf"), mB = md5(D + "/a.webm");
ok(mA.length === N && mA.join() === mB.join(), "WebM giải mã ra đúng từng khung như dòng VP9 gốc (framemd5)");
const tua = chay("ffmpeg", ["-v", "error", "-ss", "2.1", "-i", D + "/a.webm", "-frames:v", "1", "-f", "framemd5", "-"]).split("\n").filter(l => l && l[0] !== "#");
ok(tua.length === 1, "WebM tua được tới 2.1 s (Cues)");
ok(canhBao(D + "/a.webm") === "", "WebM giải mã không có cảnh báo" + (canhBao(D + "/a.webm") ? ": " + canhBao(D + "/a.webm").slice(0, 200) : ""));

// ---------- 2. H.264 -> MP4 (không B-frame, rồi có B-frame)
function h264(bf) {
  const ten = D + `/b${bf}`;
  chay("ffmpeg", ["-v", "error", "-y", ...src, "-c:v", "libx264", "-profile:v", "high", "-bf", String(bf), "-g", "60", "-x264-params", "aud=1", ten + ".mkv"]);
  const pk = chay("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", ten + ".mkv"]).trim().split("\n").map(Number);
  chay("ffmpeg", ["-v", "error", "-y", "-i", ten + ".mkv", "-c", "copy", "-bsf:v", "h264_mp4toannexb", "-f", "h264", ten + ".h264"]);
  const a = fs.readFileSync(ten + ".h264"), nal = []; let i = 0, s = -1;
  while (i + 3 <= a.length) { const sc4 = a[i] === 0 && a[i + 1] === 0 && a[i + 2] === 0 && a[i + 3] === 1, sc3 = a[i] === 0 && a[i + 1] === 0 && a[i + 2] === 1;
    if (sc3 || sc4) { if (s >= 0) nal.push(a.subarray(s, i)); i += sc4 ? 4 : 3; s = i; } else i++; }
  nal.push(a.subarray(s));
  const au = []; let sps = null, pps = null;
  nal.forEach(n => { const t = n[0] & 31; if (t === 9) { au.push([]); return; } if (t === 7) { sps = sps || n; return; } if (t === 8) { pps = pps || n; return; } if (au.length) au[au.length - 1].push(n); });
  const len = n => [(n.length >>> 24) & 255, (n.length >>> 16) & 255, (n.length >>> 8) & 255, n.length & 255];
  const avcC = new Uint8Array([1, sps[1], sps[2], sps[3], 0xFF, 0xE1, sps.length >> 8, sps.length & 255, ...sps, 1, pps.length >> 8, pps.length & 255, ...pps, 0xFD, 0xF8, 0xF8, 0]);
  const mau = au.map((ns, k) => ({b: new Uint8Array(ns.flatMap(n => [...len(n), ...n])), ts: Math.round(pk[k] * 1e6), key: ns.some(n => (n[0] & 31) === 5)}));
  fs.writeFileSync(ten + ".mp4", TGM.mp4(mau, avcC, W, H, FPS));
  return {ten, mau, dao: pk.some((v, k) => k && v < pk[k - 1])};
}
for (const bf of [0, 2]) {
  const r = h264(bf), f = r.ten + ".mp4";
  ok(r.mau.length === N && r.mau[0].key && r.dao === (bf > 0), `H.264 ${bf ? "có" : "không"} B-frame: ${r.mau.length} khung` + (bf ? ", thứ tự giải mã khác thứ tự hiển thị" : ""));
  ok(demKhung(f) === N && Math.abs(thoiLuong(f) - N / FPS) < 0.05, `MP4: ${demKhung(f)} khung, thời lượng ${thoiLuong(f)} s`);
  const g = md5(r.ten + ".mkv"), m = md5(f);
  ok(g.length === N && g.join() === m.join(), "MP4 giải mã ra đúng từng khung, đúng thứ tự hiển thị như tệp gốc (framemd5)" + (bf ? " (ctts + elst)" : ""));
  const st = chay("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=format_name", "-of", "csv=p=0", f]).replace(/\s+/g, " ");
  ok(/h264,320,240,30\/1/.test(st) && /mp4/.test(st), "MP4 nhận đúng: " + st.trim());
  const cb = canhBao(f); ok(cb === "", "MP4 giải mã không có cảnh báo" + (cb ? ": " + cb.slice(0, 200) : ""));
  const b = fs.readFileSync(f); ok(b.toString("latin1", 4, 8) === "ftyp" && b.toString("latin1").indexOf("moov") < b.toString("latin1").indexOf("mdat"), "moov đặt trước mdat (mở được ngay, phát trên web)");
}
// ---------- 3. chuỗi codec theo cỡ khung
ok(TGM.avcCodec(1920, 1080) === "avc1.640028" && TGM.avcCodec(2560, 1440) === "avc1.640032" && TGM.avcCodec(3840, 2160) === "avc1.640033", "chuỗi codec H.264 theo cỡ khung (mức 4.0 / 5.0 / 5.1)");
fs.rmSync(D, {recursive: true, force: true});
xong();
