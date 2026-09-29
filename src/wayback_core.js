const SEL = new Map();                       // "rel/z/y/x" -> mã bản phát hành thực

// Trang mở bằng file:// bị Chrome coi là "origin duy nhất" nên fetch() sang máy chủ
// khác bị chặn. Dịch vụ của Esri hỗ trợ JSONP, tức trả về JSON bọc trong lời gọi hàm
// và nạp bằng thẻ script: cách này không bị chặn, nên trang chạy được cả khi mở
// thẳng từ ổ đĩa lẫn khi đặt trên máy chủ.
let jsonpN = 0;
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "__wb" + (++jsonpN);
    const sc = document.createElement("script");
    let xong = false;
    const ket = (ok, v) => {
      if (xong) return;
      xong = true;
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      sc.remove();
      ok ? resolve(v) : reject(new Error("không hỏi được tilemap"));
    };
    window[cb] = v => ket(true, v);
    sc.onerror = () => ket(false);
    setTimeout(() => ket(false), 8000);
    sc.src = url + (url.includes("?") ? "&" : "?") + "f=json&callback=" + cb;
    document.head.appendChild(sc);
  });
}

async function selectRelease(rel, c) {
  const k = `${rel}/${c.z}/${c.y}/${c.x}`;
  if (SEL.has(k)) return SEL.get(k);
  const r0 = c.y & ~3, c0 = c.x & ~3;        // hỏi cả khối 4×4 rồi nhớ luôn 16 ô
  const j = await jsonp(`${WB}/tilemap/${rel}/${c.z}/${r0}/${c0}/4/4`);
  for (let dy = 0; dy < 4; dy++)
    for (let dx = 0; dx < 4; dx++) {
      const n = dy * 4 + dx;
      SEL.set(`${rel}/${c.z}/${r0 + dy}/${c0 + dx}`,
              (j.data && j.data[n]) ? (j.select ? j.select[n] : rel) : null);
    }
  return SEL.get(k);
}

/* Bản 2.2: KHÔNG còn ô trắng. Khi bản đang chọn không có ô ở mức z (tilemap báo trống, thường vì vùng đó
   chỉ có ảnh độ phân giải thấp hơn) hoặc ảnh ô bị lỗi, lấy ô cha gần nhất CỦA CHÍNH BẢN ĐÓ (mức z-1, z-2, ...),
   cắt đúng phần phủ ô cần vẽ và phóng to có nội suy. Ảnh vẫn là ảnh của bản phát hành đang xem, chỉ mờ hơn. */
const MAX_LEN = 8;
function oCha(c, k) {                        // ô tổ tiên cách k mức và phần (điểm ảnh trên ô 256) phủ ô c
  const n = 1 << k, sub = 256 / n;
  return {z: c.z - k, x: c.x >> k, y: c.y >> k, ox: (c.x & (n - 1)) * sub, oy: (c.y & (n - 1)) * sub, sub};
}
async function timCha(rel, c) {              // mức gần nhất (từ z trở lên) mà bản rel có ô
  for (let k = 0; k <= MAX_LEN && c.z - k >= 0; k++) {
    const o = oCha(c, k), r = await selectRelease(rel, o);
    if (r) return {r, o, k};
  }
  return null;
}
function taiAnh(src) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error("ảnh")); im.src = src; });
}
function veO(cv, im, o) {
  const g = cv.getContext && cv.getContext("2d"); if (!g) return;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(im, o.ox, o.oy, o.sub, o.sub, 0, 0, cv.width, cv.height);
}
const PHONG = {n: 0, z: null};              // số ô đang phóng to từ mức thấp hơn (báo nhẹ, không che bản đồ)
function baoPhong(k, z) {
  if (k <= 0) return;
  PHONG.n++; PHONG.z = PHONG.z == null ? z : Math.min(PHONG.z, z);
  if (typeof phongNote === "function") phongNote();
}
const WaybackLayer = L.GridLayer.extend({
  initialize: function (rel, opts) {
    this._rel = rel;
    L.GridLayer.prototype.initialize.call(this, opts);
  },
  createTile: function (coords, done) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    this._ve(coords, cv).then(k => { tileWarn(false); baoPhong(k, coords.z - k); done(null, cv); },
                              e => { tileWarn(true); done(e, cv); });
    return cv;
  },
  _url: function (r, o) { return this._rel === "now" ? L.Util.template(NOW, o) : `${WB}/tile/${r}/${o.z}/${o.y}/${o.x}`; },
  _ve: async function (c, cv) {
    const rel = this._rel === "now" ? REL[REL.length - 1][1] : this._rel;   // "mới nhất": dùng tilemap của bản Wayback mới nhất
    let tim;
    try { tim = await timCha(rel, c); } catch (e) { tim = "chan"; }
    if (tim !== "chan") {
      if (!tim) throw new Error("không có ô ảnh");
      for (let k = tim.k; k <= MAX_LEN && c.z - k >= 0; k++) {          // ảnh lỗi: lùi tiếp lên mức trên, vẫn cùng bản
        const o = oCha(c, k), r = k === tim.k ? tim.r : await selectRelease(rel, o).catch(() => null);
        if (!r) continue;
        try { veO(cv, await taiAnh(this._url(r, o)), o); return k; } catch (e) { /* thử mức trên */ }
      }
      throw new Error("không có ô ảnh");
    }
    // Không hỏi được tilemap (thường do trình duyệt chặn khi mở bằng file://): thử thẳng ảnh bản đang chọn,
    // lỗi thì lùi mức; hết mức thì lùi dần về các bản cũ hơn ở mức z như trước đây.
    for (let k = 0; k <= MAX_LEN && c.z - k >= 0; k++) {
      const o = oCha(c, k);
      try { veO(cv, await taiAnh(this._url(this._rel, o)), o); return k; } catch (e) { /* thử mức trên */ }
    }
    let j = REL.findIndex(r => r[1] === this._rel);
    for (let n = 0; j >= 0 && n < 12; n++, j--) {
      try { const o = oCha(c, 0); veO(cv, await taiAnh(`${WB}/tile/${REL[j][1]}/${o.z}/${o.y}/${o.x}`), o); return 0; } catch (e) { /* bản cũ hơn */ }
    }
    throw new Error("không có ô ảnh");
  },
});
