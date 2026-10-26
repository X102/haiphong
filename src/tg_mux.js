/* =============================== BẢN 3.18.1: GHÉP VIDEO (MP4 H.264, WebM VP9) =============================== */
/* Các khung đã mã hoá bằng WebCodecs (VideoEncoder) được ghép thành tệp có đủ thời lượng, mốc thời gian chính xác từng khung, tua được:
   · MP4 (ISO BMFF, H.264/AVC): ftyp + moov (đặt trước dữ liệu để mở ngay) + mdat; avcC lấy từ decoderConfig.description;
     có B-frame (thứ tự giải mã khác thứ tự hiển thị) thì ghi ctts + danh sách sửa (elst) để khung đầu hiện ở thời điểm 0.
   · WebM (Matroska, VP9/VP8): Info có Duration, mỗi khung khoá mở một Cluster, Cues trỏ tới các Cluster để tua.
   Thuần tính toán (không dùng DOM): kiểm bằng ffmpeg trong tests/t_tgmux.js. Mẫu: {b: Uint8Array, ts: µs (thời điểm hiển thị), key: bool}
   theo thứ tự ra khỏi bộ mã hoá (= thứ tự giải mã). */
var TGM = (function () {
  function noi(ps) { let n = 0; ps.forEach(p => { n += p.length; }); const o = new Uint8Array(n); let k = 0; ps.forEach(p => { o.set(p, k); k += p.length; }); return o; }
  const u8 = v => new Uint8Array([v & 255]), u16 = v => new Uint8Array([(v >>> 8) & 255, v & 255]);
  const u32 = v => new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
  const i32 = v => u32(v < 0 ? (v + 4294967296) : v), chu = s => new Uint8Array([...s].map(c => c.charCodeAt(0) & 255));
  function hop(loai, ...ps) { const d = noi(ps); return noi([u32(d.length + 8), chu(loai), d]); }
  function hopDu(loai, ver, co, ...ps) { return hop(loai, u8(ver), u8((co >>> 16) & 255), u16(co & 65535), ...ps); }
  const MT = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];

  function mp4(mau, avcC, W, H, fps) {               // -> Uint8Array tệp MP4
    if (!mau.length) throw new Error("no frames");
    if (!avcC || !avcC.length) throw new Error("no avcC");
    const ts = Math.round(fps) * 1000, dt = 1000, n = mau.length;
    const pts = mau.map(m => Math.round(m.ts * ts / 1e6));
    let dong = true; for (let i = 1; i < n; i++) if (pts[i] <= pts[i - 1]) { dong = false; break; }
    const xep = pts.slice().sort((a, b) => a - b), goc = xep[0];
    let D = 0; if (!dong) for (let i = 0; i < n; i++) D = Math.max(D, xep[i] - pts[i]);
    const dts = xep.map(p => p - goc), cts = pts.map((p, i) => p - goc - dts[i] + D);   // thứ tự giải mã đều nhau; lệch hiển thị ≥ 0
    const thoi = n * dt;
    const stbl = off => hop("stbl",
      hopDu("stsd", 0, 0, u32(1), hop("avc1", new Uint8Array(6), u16(1), u16(0), u16(0), u32(0), u32(0), u32(0), u16(W), u16(H),
        u32(0x00480000), u32(0x00480000), u32(0), u16(1), noi([u8(12), chu("Geoportal HP"), new Uint8Array(19)]), u16(0x0018), u16(0xFFFF),
        hop("avcC", avcC), hop("pasp", u32(1), u32(1)))),
      hopDu("stts", 0, 0, u32(1), u32(n), u32(dt)),
      ...(dong ? [] : [hopDu("ctts", 0, 0, u32(n), ...cts.map(c => noi([u32(1), u32(c)])))]),
      hopDu("stss", 0, 0, u32(mau.filter(m => m.key).length), ...mau.map((m, i) => m.key ? u32(i + 1) : null).filter(Boolean)),
      hopDu("stsc", 0, 0, u32(1), u32(1), u32(n), u32(1)),
      hopDu("stsz", 0, 0, u32(0), u32(n), ...mau.map(m => u32(m.b.length))),
      hopDu("stco", 0, 0, u32(1), u32(off)));
    const moov = off => hop("moov",
      hopDu("mvhd", 0, 0, u32(0), u32(0), u32(ts), u32(thoi), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), ...MT.map(u32), ...new Array(6).fill(0).map(u32), u32(2)),
      hop("trak",
        hopDu("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(thoi), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), ...MT.map(u32), u32(W * 65536), u32(H * 65536)),
        ...(dong ? [] : [hop("edts", hopDu("elst", 0, 0, u32(1), u32(thoi), i32(D), u16(1), u16(0)))]),
        hop("mdia",
          hopDu("mdhd", 0, 0, u32(0), u32(0), u32(ts), u32(thoi), u16(0x55C4), u16(0)),
          hopDu("hdlr", 0, 0, u32(0), chu("vide"), u32(0), u32(0), u32(0), chu("VideoHandler\0")),
          hop("minf", hopDu("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0)), hop("dinf", hopDu("dref", 0, 0, u32(1), hopDu("url ", 0, 1))), stbl(off)))));
    const ftyp = hop("ftyp", chu("isom"), u32(512), chu("isom"), chu("iso2"), chu("avc1"), chu("mp41"));
    const m0 = moov(0), off = ftyp.length + m0.length + 8, data = noi(mau.map(m => m.b));
    return noi([ftyp, moov(off), u32(data.length + 8), chu("mdat"), data]);
  }

  /* ---- EBML (Matroska / WebM) ---- */
  function id(v) { const b = []; while (v > 0) { b.unshift(v & 255); v = Math.floor(v / 256); } return new Uint8Array(b); }
  function co(n) {                                   // độ dài kiểu vint (1..8 byte)
    let L = 1; while (L < 8 && n >= Math.pow(2, 7 * L) - 1) L++;
    const b = new Uint8Array(L); let v = n; for (let i = L - 1; i >= 0; i--) { b[i] = v % 256; v = Math.floor(v / 256); } b[0] |= 1 << (8 - L); return b;
  }
  function phan(ma, ...ps) { const d = noi(ps); return noi([id(ma), co(d.length), d]); }
  function so(ma, v) { const b = []; do { b.unshift(v % 256); v = Math.floor(v / 256); } while (v > 0); return phan(ma, new Uint8Array(b)); }
  function thuc(ma, v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v); return phan(ma, b); }
  const chuoi = (ma, s) => phan(ma, chu(s));

  function webm(mau, W, H, fps, codecId) {           // -> Uint8Array tệp WebM
    if (!mau.length) throw new Error("no frames");
    const ms = mau.map(m => Math.round(m.ts / 1000)), dai = Math.max(...ms) + 1000 / fps;
    const dau = phan(0x1A45DFA3, so(0x4286, 1), so(0x42F7, 1), so(0x42F2, 4), so(0x42F3, 8), chuoi(0x4282, "webm"), so(0x4287, 4), so(0x4285, 2));
    const info = phan(0x1549A966, so(0x2AD7B1, 1000000), thuc(0x4489, dai), chuoi(0x4D80, "Geoportal lop phu Hai Phong"), chuoi(0x5741, "Geoportal lop phu Hai Phong"));
    const tracks = phan(0x1654AE6B, phan(0xAE, so(0xD7, 1), so(0x73C5, 1), so(0x83, 1), so(0x9C, 0), chuoi(0x86, codecId || "V_VP9"),
      so(0x23E383, Math.round(1e9 / fps)), phan(0xE0, so(0xB0, W), so(0xBA, H))));
    const cum = []; let cur = null;
    mau.forEach((m, i) => { if (!cur || m.key || ms[i] - cur.t >= 30000) { cur = {t: ms[i], k: []}; cum.push(cur); } cur.k.push(i); });
    let vt = info.length + tracks.length; const vitri = [], parts = [];
    cum.forEach(c => {
      const kh = c.k.map(i => { const r = ms[i] - c.t, f = new Uint8Array(4); f[0] = 0x81; f[1] = (r >> 8) & 255; f[2] = r & 255; f[3] = mau[i].key ? 0x80 : 0;
        return phan(0xA3, f, mau[i].b); });
      const cl = phan(0x1F43B675, so(0xE7, c.t), ...kh); vitri.push({t: c.t, p: vt, key: mau[c.k[0]].key}); vt += cl.length; parts.push(cl);
    });
    const cues = phan(0x1C53BB6B, ...vitri.filter(v => v.key).map(v => phan(0xBB, so(0xB3, v.t), phan(0xB7, so(0xF7, 1), so(0xF1, v.p)))));
    return noi([dau, phan(0x18538067, info, tracks, ...parts, cues)]);
  }
  function avcCodec(W, H) {                           // chuỗi codec H.264 High theo cỡ khung (mức 4.0 / 5.0 / 5.1)
    const mb = Math.ceil(W / 16) * Math.ceil(H / 16); return mb <= 8192 ? "avc1.640028" : mb <= 22080 ? "avc1.640032" : "avc1.640033";
  }
  function vp9Codec(W, H) { return W * H <= 2228224 ? "vp09.00.40.08" : "vp09.00.50.08"; }
  return {mp4, webm, avcCodec, vp9Codec, noi};
})();
if (typeof module !== "undefined" && module.exports) module.exports = TGM;
