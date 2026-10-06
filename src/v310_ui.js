/* =============================== BẢN 3.10 =============================== */
/* ① Overture Maps: điểm dịch vụ (POI) và nhà, đọc thẳng trong trình duyệt từ tệp PMTiles của Overture (tiles.overturemaps.org,
   bản mới nhất lấy từ STAC stac.overturemaps.org). Lớp bản đồ: nhà tô màu theo diện tích nền, POI tô màu theo nhóm chức năng.
   Thống kê quanh điểm (bán kính 100/250/500 m): số POI, mật độ, nhóm chức năng, độ đa dạng; số nhà, tỉ lệ phủ xây dựng, diện tích
   nhà, tỉ lệ diện tích của nhà lớn; ghi vào điểm (p.ov) để xuất CSV. Đo 07.10.2026 trong một ô 2.4 km (mức 14): nội thành 5762 POI,
   19 585 nhà; KCN Đình Vũ 15 POI, 1013 nhà; ruộng An Lão 89 POI, 5951 nhà (nhà phần lớn từ Google Open Buildings, Microsoft).
   Bộ đọc PMTiles v3 và vector tile (MVT) viết riêng ở đây, không thêm thư viện; giải nén gzip bằng DecompressionStream.
   ② Nhiệt độ bề mặt Landsat 8/9 (băng nhiệt lwir11 trong landsat-c2-l2 của Planetary Computer, ST × 0.00341802 + 149 K) tại điểm,
   trung vị theo tháng hoặc kỳ 2 tháng, vẽ chung đồ thị mùa vụ (trục °C bên phải). Đo 07.10.2026 tại điểm ruộng 20.89696,
   106.58221: QA_PIXEL bỏ sót mây (cảnh “quang” mà −114 °C, xanh lam 0.75), nên loại thêm cảnh có phản xạ xanh lam > 0.3 và cảnh
   lạnh bất thường (dưới trung vị cùng tháng 8 °C, hoặc dưới trung vị cả chuỗi 20 °C). */

/* ---------------- bộ đọc PMTiles v3 ---------------- */
function pmVarint(b, st) { let v = 0, s = 1, x; do { x = b[st.p++]; v += (x & 0x7f) * s; s *= 128; } while (x & 0x80); return v; }
async function pmGiai(u8, c) {                       // c: 0/1 không nén, 2 gzip
  if (c === 0 || c === 1) return u8;
  if (c !== 2) throw new Error(T("kiểu nén {c} chưa hỗ trợ", {c}));
  if (typeof DecompressionStream === "undefined") throw new Error(T("trình duyệt không giải nén được gzip"));
  const ds = new DecompressionStream("gzip"), w = ds.writable.getWriter(), viet = w.write(u8).then(() => w.close());
  const r = ds.readable.getReader(), ch = []; let n = 0;
  for (;;) { const {done, value} = await r.read(); if (done) break; ch.push(value); n += value.length; }
  await viet;
  const out = new Uint8Array(n); let o = 0; ch.forEach(c2 => { out.set(c2, o); o += c2.length; });
  return out;
}
async function pmDoc(url, a, n) {
  const r = await fetch(url, {headers: {Range: `bytes=${a}-${a + n - 1}`}});
  if (!r.ok) throw new Error("HTTP " + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  return r.status === 200 && b.length > n ? b.subarray(a, a + n) : b;     // máy chủ bỏ qua Range: cắt lấy đoạn cần
}
function pmHeader(b) {
  if (String.fromCharCode.apply(null, b.subarray(0, 7)) !== "PMTiles" || b[7] !== 3) throw new Error(T("không phải tệp PMTiles bản 3"));
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), u = o => dv.getUint32(o, true) + dv.getUint32(o + 4, true) * 4294967296;
  return {rootOff: u(8), rootLen: u(16), leafOff: u(40), leafLen: u(48), dataOff: u(56), dataLen: u(64), ic: b[97], tc: b[98], tt: b[99], minZ: b[100], maxZ: b[101]};
}
function pmDir(b) {                                  // thư mục: id ô (cộng dồn), số ô liền nhau, độ dài, vị trí (0 = nối tiếp ô trước)
  const st = {p: 0}, n = pmVarint(b, st), e = []; let id = 0;
  for (let i = 0; i < n; i++) { id += pmVarint(b, st); e.push({id, rl: 0, len: 0, off: 0}); }
  for (let i = 0; i < n; i++) e[i].rl = pmVarint(b, st);
  for (let i = 0; i < n; i++) e[i].len = pmVarint(b, st);
  for (let i = 0; i < n; i++) { const v = pmVarint(b, st); e[i].off = v === 0 && i > 0 ? e[i - 1].off + e[i - 1].len : v - 1; }
  return e;
}
function pmTim(e, id) {
  let lo = 0, hi = e.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (e[m].id < id) lo = m + 1; else if (e[m].id > id) hi = m - 1; else return e[m]; }
  if (hi >= 0) { const x = e[hi]; if (x.rl === 0 || id - x.id < x.rl) return x; }
  return null;
}
function pmId(z, x, y) {                             // z/x/y -> id ô theo đường cong Hilbert (đặc tả PMTiles v3)
  let acc = 0; for (let t = 0; t < z; t++) acc += Math.pow(4, t);
  const n = Math.pow(2, z); let d = 0, xx = x, yy = y;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (xx & s) > 0 ? 1 : 0, ry = (yy & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { xx = n - 1 - xx; yy = n - 1 - yy; } const t = xx; xx = yy; yy = t; }
  }
  return acc + d;
}

/* ---------------- bộ đọc vector tile (MVT 2.1) ---------------- */
function mvtDoc(b) {                                 // -> {tên lớp: {ten, ext, keys, vals, f: [[đầu, cuối]], buf}}; đối tượng giải sau (mvtGiai)
  const st = {p: 0}, vi = () => pmVarint(b, st), td = new TextDecoder(), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), out = {};
  const bo = wt => { if (wt === 0) vi(); else if (wt === 1) st.p += 8; else if (wt === 2) { const n = vi(); st.p += n; } else if (wt === 5) st.p += 4; else throw new Error(["MVT", "wire", wt].join(" ")); };
  const chu = () => { const n = vi(), s = td.decode(b.subarray(st.p, st.p + n)); st.p += n; return s; };
  while (st.p < b.length) {
    const tag = vi(), f = Math.floor(tag / 8), wt = tag & 7;
    if (f !== 3 || wt !== 2) { bo(wt); continue; }
    const end = vi() + st.p, L = {ten: "", ext: 4096, keys: [], vals: [], f: [], buf: b};
    while (st.p < end) {
      const t2 = vi(), f2 = Math.floor(t2 / 8), w2 = t2 & 7;
      if (f2 === 1) L.ten = chu();
      else if (f2 === 2) { const n = vi(); L.f.push([st.p, st.p + n]); st.p += n; }
      else if (f2 === 3) L.keys.push(chu());
      else if (f2 === 4) {
        const e2 = vi() + st.p; let v = null;
        while (st.p < e2) {
          const t3 = vi(), f3 = Math.floor(t3 / 8);
          if (f3 === 1) v = chu();
          else if (f3 === 2) { v = dv.getFloat32(st.p, true); st.p += 4; }
          else if (f3 === 3) { v = dv.getFloat64(st.p, true); st.p += 8; }
          else if (f3 === 4 || f3 === 5) v = vi();
          else if (f3 === 6) { const z = vi(); v = z % 2 ? -(z + 1) / 2 : z / 2; }
          else if (f3 === 7) v = !!vi();
          else bo(t3 & 7);
        }
        L.vals.push(v);
      } else if (f2 === 5) L.ext = vi();
      else bo(w2);
    }
    st.p = end; out[L.ten] = L;
  }
  return out;
}
function mvtGiai(L) {                                // -> [{t, p, g (vòng/điểm), x0, y0, x1, y1, cx, cy, dt}] (toạ độ, diện tích theo đơn vị ô)
  if (L.dec) return L.dec;
  const b = L.buf, st = {p: 0}, vi = () => pmVarint(b, st), out = [];
  for (const [a, e] of L.f) {
    st.p = a; const F = {t: 0, p: {}, g: []}; let tags = [], geo = [];
    while (st.p < e) {
      const tag = vi(), f = Math.floor(tag / 8), wt = tag & 7;
      if (f === 1) F.id = vi();
      else if (f === 2 || f === 4) { const n = vi() + st.p, ds = []; while (st.p < n) ds.push(vi()); if (f === 2) tags = ds; else geo = ds; }
      else if (f === 3) F.t = vi();
      else if (wt === 0) vi(); else if (wt === 2) { const n = vi(); st.p += n; } else if (wt === 1) st.p += 8; else st.p += 4;
    }
    for (let i = 0; i + 1 < tags.length; i += 2) F.p[L.keys[tags[i]]] = L.vals[tags[i + 1]];
    let x = 0, y = 0, i = 0, cur = null;
    while (i < geo.length) {
      const c = geo[i++], id = c & 7, n = c >> 3;
      if (id === 7) { continue; }
      for (let k = 0; k < n; k++) {
        const dx = geo[i++], dy = geo[i++]; x += dx % 2 ? -(dx + 1) / 2 : dx / 2; y += dy % 2 ? -(dy + 1) / 2 : dy / 2;
        if (id === 1) { cur = [x, y]; F.g.push(cur); } else if (cur) cur.push(x, y);
      }
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    F.g.forEach(r => { for (let k = 0; k < r.length; k += 2) { if (r[k] < x0) x0 = r[k]; if (r[k] > x1) x1 = r[k]; if (r[k + 1] < y0) y0 = r[k + 1]; if (r[k + 1] > y1) y1 = r[k + 1]; } });
    Object.assign(F, {x0, y0, x1, y1});
    if (F.t === 3) {                                  // vùng: vòng cùng chiều vòng đầu là vòng ngoài, ngược chiều là lỗ
      let s0 = 0, dt = 0, sx = 0, sy = 0, sa = 0;
      F.g.forEach((r, j) => {
        let A = 0, cx = 0, cy = 0; const m = r.length / 2;
        for (let k = 0; k < m; k++) { const xa = r[2 * k], ya = r[2 * k + 1], xb = r[(2 * k + 2) % r.length], yb = r[(2 * k + 3) % r.length], q = xa * yb - xb * ya; A += q; cx += (xa + xb) * q; cy += (ya + yb) * q; }
        A /= 2; if (j === 0) s0 = Math.sign(A) || 1;
        if (Math.sign(A) === s0 || A === 0) { dt += Math.abs(A); if (A) { sx += cx / 6; sy += cy / 6; sa += A; } } else dt -= Math.abs(A);
      });
      F.dt = Math.max(0, dt);
      if (sa) { F.cx = sx / sa; F.cy = sy / sa; } else { F.cx = (x0 + x1) / 2; F.cy = (y0 + y1) / 2; }
    } else if (F.g.length) { F.cx = F.g[0][0]; F.cy = F.g[0][1]; F.dt = 0; }
    out.push(F);
  }
  L.dec = out; L.f = null;
  return out;
}

/* ---------------- Overture: phiên bản, tệp, ô ---------------- */
var OV = Object.assign({ban: "", banT: 0, r: 250, tc: 0.3, tk: true, nha: false, poi: false}, ls("laymau_hp_ov_v1") || {});
OV.STAC = "https://stac.overturemaps.org/catalog.json";
OV.TILE = "https://tiles.overturemaps.org/{ban}/{kieu}.pmtiles";
OV.BAN0 = "2026-09-23.1";                            // bản đã kiểm 07.10.2026; dùng khi không đọc được STAC
OV.K = new Map(); OV.O = new Map(); OV.LA = new Map(); OV.TK = new Map(); OV.tokB = 0;
function ovLuu() { ls("laymau_hp_ov_v1", {ban: OV.ban, banT: OV.banT, r: OV.r, tc: OV.tc, tk: OV.tk, nha: OV.nha, poi: OV.poi}); }
async function ovBan(moi) {                          // bản phát hành mới nhất của Overture (tra STAC, nhớ 7 ngày)
  if (!moi && OV.ban && Date.now() - (OV.banT || 0) < 7 * 864e5) return OV.ban;
  if (OV._bp) return OV._bp;
  OV._bp = (async () => {
    try {
      const r = await fetch(OV.STAC); if (!r.ok) throw new Error("HTTP " + r.status);
      const c = await r.json(), ids = (c.links || []).filter(l => l.rel === "child").map(l => (String(l.href).match(/(\d{4}-\d{2}-\d{2}\.\d+)/) || [])[1]).filter(Boolean).sort();
      if (ids.length) { if (ids[ids.length - 1] !== OV.ban) { OV.K.clear(); OV.O.clear(); OV.TK.clear(); } OV.ban = ids[ids.length - 1]; OV.banT = Date.now(); ovLuu(); }
    } catch (e) { /* không đọc được STAC: dùng bản đã biết */ }
    if (!OV.ban) OV.ban = OV.BAN0;
    OV._bp = null; ovBanUI(); return OV.ban;
  })();
  return OV._bp;
}
async function ovKho(kieu) {                         // mở tệp PMTiles: đầu tệp + thư mục gốc
  const ban = await ovBan(), url = OV.TILE.replace("{ban}", ban).replace("{kieu}", kieu);
  if (!OV.K.has(url)) OV.K.set(url, (async () => {
    const b = await pmDoc(url, 0, 16384), h = pmHeader(b);
    const rb = h.rootOff + h.rootLen <= b.length ? b.subarray(h.rootOff, h.rootOff + h.rootLen) : await pmDoc(url, h.rootOff, h.rootLen);
    return {url, h, root: pmDir(await pmGiai(rb, h.ic))};
  })().catch(e => { OV.K.delete(url); if (/HTTP 40[34]/.test(e.message)) OV.banT = 0; throw e; }));
  return OV.K.get(url);
}
async function ovO(kieu, z, x, y) {                  // ô vector đã đọc (giữ 24 ô gần nhất)
  const K = await ovKho(kieu), k = K.url + "/" + z + "/" + x + "/" + y;
  if (OV.O.has(k)) { const v = OV.O.get(k); OV.O.delete(k); OV.O.set(k, v); return v; }
  const pr = (async () => {
    let dir = K.root; const id = pmId(z, x, y);
    for (let d = 0; d < 4; d++) {
      const e = pmTim(dir, id); if (!e) return null;
      if (e.rl > 0) return mvtDoc(await pmGiai(await pmDoc(K.url, K.h.dataOff + e.off, e.len), K.h.tc));
      const lk = K.url + "|" + e.off;
      if (!OV.LA.has(lk)) { if (OV.LA.size > 300) OV.LA.clear(); OV.LA.set(lk, pmDoc(K.url, K.h.leafOff + e.off, e.len).then(b => pmGiai(b, K.h.ic)).then(pmDir)); }
      dir = await OV.LA.get(lk);
    }
    return null;
  })();
  pr.catch(() => OV.O.delete(k));
  OV.O.set(k, pr); while (OV.O.size > 24) OV.O.delete(OV.O.keys().next().value);
  return pr;
}

/* ---------------- nhóm chức năng của POI, cỡ nhà ---------------- */
var OVN = [{k: "tm", ten: "thương mại", mau: "#e8590c"}, {k: "au", ten: "ăn uống", mau: "#f59f00"}, {k: "dv", ten: "dịch vụ, văn phòng", mau: "#7048e8"},
  {k: "cn", ten: "công nghiệp, kho vận", mau: "#495057"}, {k: "gd", ten: "giáo dục", mau: "#1c7ed6"}, {k: "yt", ten: "y tế", mau: "#e03131"},
  {k: "hc", ten: "hành chính, cộng đồng", mau: "#0c8599"}, {k: "vh", ten: "văn hoá, giải trí, thể thao", mau: "#d6336c"}, {k: "lt", ten: "lưu trú", mau: "#ae3ec9"},
  {k: "gt", ten: "giao thông", mau: "#2f9e44"}, {k: "kh", ten: "khác", mau: "#adb5bd"}];
var OVN_MAU = {}; OVN.forEach(g => { OVN_MAU[g.k] = g.mau; });
var OV_NHA = [{max: 100, mau: "#ffe066", ten: "< 100 m²"}, {max: 300, mau: "#ffa94d", ten: "100–300 m²"}, {max: 1000, mau: "#f76707", ten: "300–1000 m²"},
  {max: 5000, mau: "#d6336c", ten: "1000–5000 m²"}, {max: Infinity, mau: "#862e9c", ten: "≥ 5000 m²"}];
function ovNhom(pr) {                                // nhóm theo cây phân loại Overture (taxonomy.hierarchy), công nghiệp nhận theo tên loại
  let h = null, c = pr.basic_category || "";
  try { const t = typeof pr.taxonomy === "string" ? JSON.parse(pr.taxonomy) : pr.taxonomy; if (t) { h = t.hierarchy || null; if (!c) c = t.primary || ""; } } catch (e) { /* bỏ */ }
  const s = (h ? h.join(" ") : "") + " " + c;
  if (/manufactur|industr|factory|wholesale|warehous|storage|logistic|freight|b2b/.test(s)) return "cn";
  const t0 = h && h[0] ? h[0] : (pr.categories && pr.categories.primary) || "";
  return {shopping: "tm", food_and_drink: "au", services_and_business: "dv", lifestyle_services: "dv", education: "gd", health_care: "yt",
    community_and_government: "hc", arts_and_entertainment: "vh", cultural_and_historic: "vh", sports_and_recreation: "vh", lodging: "lt",
    travel_and_transportation: "gt"}[t0] || "kh";
}
function ovCoNha(m2) { return OV_NHA.find(c => m2 < c.max); }

/* ---------------- thống kê quanh điểm ---------------- */
async function ovThongKe(q, r, tc) {
  r = r || OV.r; tc = tc == null ? OV.tc : tc;
  const ban = await ovBan(), key = s1Khoa(q) + "|" + r + "|" + tc + "|" + ban;
  if (OV.TK.has(key)) return OV.TK.get(key);
  const pr = (async () => {
    const la = q.lat * Math.PI / 180, out = {ban, r, tc, poi: 0, nhom: {}, gan: [], nha: 0, dt: 0, dts: [], dt_max: 0, lon: 0, tang: [], cao: [], nguon: {}};
    OVN.forEach(g => { out.nhom[g.k] = 0; });
    for (const [kieu, lop] of [["places", "place"], ["buildings", "building"]]) {
      const K = await ovKho(kieu), z = Math.min(14, K.h.maxZ || 14), n = Math.pow(2, z);
      const gx = (q.lon + 180) / 360 * n, gy = (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n;
      const mo = 40075016.686 * Math.cos(la) / n, dT = r / mo, seen = new Set(), os = [];
      for (let tx = Math.floor(gx - dT); tx <= Math.floor(gx + dT); tx++) for (let ty = Math.floor(gy - dT); ty <= Math.floor(gy + dT); ty++) os.push([tx, ty]);
      const ts = await Promise.all(os.map(([tx, ty]) => ovO(kieu, z, tx, ty).then(t => [tx, ty, t])));
      for (const [tx, ty, t] of ts) {
        const L = t && t[lop]; if (!L) continue;
        const ext = L.ext, mu = mo / ext;
        for (const F of mvtGiai(L)) {
          if (F.cx == null) continue;
          const dx = (tx + F.cx / ext - gx) * mo, dy = (ty + F.cy / ext - gy) * mo, d = Math.hypot(dx, dy);
          if (d > r) continue;
          const id = F.p.id || F.id; if (id != null) { if (seen.has(id)) continue; seen.add(id); }
          if (lop === "place") {
            if (F.p.confidence != null && F.p.confidence < tc) continue;
            const g = ovNhom(F.p); out.poi++; out.nhom[g]++;
            out.gan.push({n: F.p["@name"] || F.p.name || "", g, c: F.p.basic_category || "", d: Math.round(d)});
          } else {
            if (F.p.is_underground === true || F.p.is_underground === "true") continue;
            const m2 = F.dt * mu * mu; out.nha++; out.dt += m2; out.dts.push(m2); if (m2 > out.dt_max) out.dt_max = m2; if (m2 >= 1000) out.lon += m2;
            const nf = +F.p.num_floors, h = +F.p.height; if (nf > 0) out.tang.push(nf); if (h > 0) out.cao.push(h);
            const src = F.p["@geometry_source"] || "?"; out.nguon[src] = (out.nguon[src] || 0) + 1;
          }
        }
      }
    }
    const S = Math.PI * r * r, tv = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
    out.km2 = out.poi / (S / 1e6);
    let H = 0; OVN.forEach(g => { const pp = out.poi ? out.nhom[g.k] / out.poi : 0; if (pp > 0) H -= pp * Math.log(pp); });
    out.dd = out.poi ? H / Math.log(OVN.length) : null;
    out.gan.sort((a, b) => a.d - b.d); out.gan = out.gan.slice(0, 5);
    out.phu = out.dt / S; out.dt_tb = out.nha ? out.dt / out.nha : null; out.dt_tv = tv(out.dts); out.ty_lon = out.dt ? out.lon / out.dt : null;
    out.tang_tb = out.tang.length ? out.tang.reduce((a, b) => a + b, 0) / out.tang.length : null; out.tang_n = out.tang.length;
    out.cao_tb = out.cao.length ? out.cao.reduce((a, b) => a + b, 0) / out.cao.length : null; out.cao_n = out.cao.length;
    delete out.dts; delete out.tang; delete out.cao;
    return out;
  })();
  OV.TK.set(key, pr); pr.catch(() => OV.TK.delete(key));
  if (OV.TK.size > 3000) OV.TK.delete(OV.TK.keys().next().value);
  return pr;
}
function ovGon(s) {                                  // phần ghi vào điểm (p.ov), xuất được ra CSV
  const r1 = (v, k) => v == null ? null : +v.toFixed(k);
  return {ban: s.ban, r: s.r, tc: s.tc, poi: s.poi, km2: r1(s.km2, 1), dd: r1(s.dd, 3), nhom: Object.assign({}, s.nhom), nha: s.nha, phu: r1(s.phu, 4),
    dt_tb: r1(s.dt_tb, 1), dt_tv: r1(s.dt_tv, 1), dt_max: r1(s.dt_max, 1), ty_lon: r1(s.ty_lon, 4), tang_tb: r1(s.tang_tb, 2), tang_n: s.tang_n, cao_tb: r1(s.cao_tb, 2), cao_n: s.cao_n, t: Date.now()};
}
function ovHTML(s, laDiem) {
  const pc = k => s.poi ? Math.round(100 * s.nhom[k] / s.poi) : 0;
  const top = OVN.filter(g => s.nhom[g.k]).sort((a, b) => s.nhom[b.k] - s.nhom[a.k]).slice(0, 3).map(g => `${T(g.ten)} ${pc(g.k)}%`).join(", ");
  const thanh = s.poi ? `<div class="ov-thanh" title="${esc(OVN.filter(g => s.nhom[g.k]).map(g => T(g.ten) + ": " + s.nhom[g.k]).join("; "))}">` +
    OVN.filter(g => s.nhom[g.k]).map(g => `<i style="width:${(100 * s.nhom[g.k] / s.poi).toFixed(1)}%;background:${g.mau}"></i>`).join("") + "</div>" : "";
  const nguon = Object.entries(s.nguon || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
  return `<div class="ov-box"><b>🏙 ${laDiem ? T("Quanh điểm {r} m", {r: s.r}) : T("Quanh chỗ nhấp {r} m", {r: s.r})}</b> <span class="mu">(Overture ${esc(s.ban)})</span><br>` +
    `📍 <b>${s.poi}</b> POI (${Math.round(s.km2)}/km²)${s.dd != null ? ` · ${T("đa dạng chức năng")} ${s.dd.toFixed(2)}` : ""}${top ? " · " + top : ""}${thanh}` +
    `🏠 <b>${s.nha}</b> ${T("nhà")} · ${T("phủ xây dựng")} ${Math.round(100 * s.phu)}%` +
    (s.nha ? ` · ${T("nhà trung bình {a} m², lớn nhất {b} m²", {a: Math.round(s.dt_tb), b: Math.round(s.dt_max)})} · ${T("nhà ≥ 1000 m² chiếm {p}% diện tích xây dựng", {p: Math.round(100 * (s.ty_lon || 0))})}` : "") +
    (s.tang_n ? ` · ${T("{n} nhà có số tầng (TB {t})", {n: s.tang_n, t: s.tang_tb.toFixed(1)})}` : "") +
    (nguon ? `<br><span class="mu">${T("nguồn hình nhà")}: ${esc(nguon)}</span>` : "") +
    (s.gan.length ? `<br><span class="mu">${T("gần nhất")}: ${s.gan.map(g => `${esc(g.n || "?")} (${T(OVN.find(x => x.k === g.g).ten)}, ${g.d} m)`).join("; ")}</span>` : "") + "</div>";
}
async function ovHienDiem() {
  const box = $("ovBox"); if (!box) return;
  const q = vizPt();
  if (!q || !OV.tk) { box.innerHTML = ""; return; }
  const tok = ++OV.tokB, laDiem = !PROBE && q.id && ST.diem[q.id] === q;
  if (!box.innerHTML || box.dataset.k !== s1Khoa(q)) box.innerHTML = `<span class="mu">🏙 ${T("Overture: đang đọc quanh điểm…")}</span>`;
  box.dataset.k = s1Khoa(q);
  try {
    const s = await ovThongKe(q);
    if (tok !== OV.tokB) return;
    if (laDiem) { const g = ovGon(s), cu = q.ov; if (!cu || cu.ban !== g.ban || cu.r !== g.r || cu.tc !== g.tc || cu.poi !== g.poi || cu.nha !== g.nha) { q.ov = g; save(); } }
    box.innerHTML = ovHTML(s, laDiem);
  } catch (e) { if (tok === OV.tokB) box.innerHTML = `<span class="mu">🏙 Overture: ${esc(e.message || String(e))}</span>`; }
}
var _renderCurve310 = renderCurve;
renderCurve = function () { const r = _renderCurve310.apply(this, arguments); clearTimeout(OV.henB); OV.henB = setTimeout(ovHienDiem, 80); return r; };

/* ---------------- lớp bản đồ ---------------- */
var OvLop = L.GridLayer.extend({
  initialize(kieu, o) { this._kieu = kieu; L.GridLayer.prototype.initialize.call(this, o); },
  createTile(c, done) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    ovKho(this._kieu).then(K => {
      const zt = Math.min(c.z, K.h.maxZ || 14), s = Math.pow(2, c.z - zt), tx = Math.floor(c.x / s), ty = Math.floor(c.y / s);
      return ovO(this._kieu, zt, tx, ty).then(t => { if (t) ovVe(cv, t, this._kieu, s, c.x - tx * s, c.y - ty * s, c.z); done(null, cv); });
    }).catch(e => { $("ovTT").textContent = "Overture: " + (e.message || e); done(null, cv); });
    return cv;
  },
});
function ovVe(cv, t, kieu, s, ox, oy, z) {
  const ctx = cv.getContext("2d"), L = t[kieu === "places" ? "place" : "building"]; if (!L) return;
  const ext = L.ext, k = 256 * s / ext, bx0 = ox * ext / s, by0 = oy * ext / s, bx1 = (ox + 1) * ext / s, by1 = (oy + 1) * ext / s;
  const tx = v => (v - bx0) * k, ty = v => (v - by0) * k;
  if (kieu === "buildings") {
    const la = map.getCenter().lat * Math.PI / 180, mu = 40075016.686 * Math.cos(la) / Math.pow(2, z - Math.log2(s)) / ext;
    ctx.globalAlpha = 0.62; ctx.lineWidth = z >= 17 ? 0.8 : 0.4; ctx.strokeStyle = "rgba(0,0,0,.45)";
    for (const F of mvtGiai(L)) {
      if (F.t !== 3 || F.x1 < bx0 || F.x0 > bx1 || F.y1 < by0 || F.y0 > by1) continue;
      ctx.fillStyle = ovCoNha(F.dt * mu * mu).mau; ctx.beginPath();
      F.g.forEach(r => { ctx.moveTo(tx(r[0]), ty(r[1])); for (let i = 2; i < r.length; i += 2) ctx.lineTo(tx(r[i]), ty(r[i + 1])); ctx.closePath(); });
      ctx.fill("evenodd"); if (z >= 16) ctx.stroke();
    }
  } else {
    const R = z >= 17 ? 4 : z >= 16 ? 3 : 2.2; ctx.lineWidth = 0.8; ctx.strokeStyle = "#fff";
    for (const F of mvtGiai(L)) {
      if (F.t !== 1 || F.cx < bx0 - 8 || F.cx > bx1 + 8 || F.cy < by0 - 8 || F.cy > by1 + 8) continue;
      if (F.p.confidence != null && F.p.confidence < OV.tc) continue;
      F.g.forEach(g => { ctx.beginPath(); ctx.arc(tx(g[0]), ty(g[1]), R, 0, 2 * Math.PI); ctx.fillStyle = OVN_MAU[ovNhom(F.p)]; ctx.fill(); ctx.stroke(); });
    }
  }
}
function ovLop() {                                    // bật / tắt hai lớp theo ô chọn
  const att = "© Overture Maps Foundation";
  [["nha", "buildings", "lopNha", 7], ["poi", "places", "lopPoi", 8]].forEach(([k, kieu, ten, zi]) => {
    if (OV[k] && !OV[ten]) { OV[ten] = new OvLop(kieu, {minZoom: 14, maxZoom: 21, zIndex: zi, keepBuffer: 1, updateWhenZooming: false, attribution: att}); OV[ten].addTo(map); }
    if (!OV[k] && OV[ten]) { map.removeLayer(OV[ten]); OV[ten] = null; }
  });
  ovGoiY();
}
function ovGoiY() {
  const tt = $("ovTT"); if (!tt || OV.chay) return;
  tt.textContent = (OV.nha || OV.poi) && map.getZoom() < 14 ? T("phóng tới mức 14 trở lên để thấy nhà và POI") : "";
}
map.on("zoomend", ovGoiY);
function ovBanUI() { const e = $("ovBan"); if (e) e.textContent = OV.ban ? T("bản {b}", {b: OV.ban}) : ""; }
function ovChuGiai() {
  const e = $("ovCG"); if (!e) return;
  e.innerHTML = (OV.nha ? `<div class="ov-cg">🏠 ${OV_NHA.map(c => `<span><i style="background:${c.mau}"></i>${c.ten}</span>`).join("")}</div>` : "") +
    (OV.poi ? `<div class="ov-cg">📍 ${OVN.map(g => `<span><i style="background:${g.mau};border-radius:50%"></i>${T(g.ten)}</span>`).join("")}</div>` : "");
}
var _v28DS310 = v28DS;
v28DS = function () { return _v28DS310().concat([{k: "ovnha", ten: T("nhà (Overture)"), lay: () => OV.lopNha}, {k: "ovpoi", ten: T("POI (Overture)"), lay: () => OV.lopPoi}]); };

/* ---------------- tính cho mọi điểm ---------------- */
async function ovTatCa() {
  if (OV.chay) { OV.dung = true; return; }
  const ds = pts().slice(), n = Math.pow(2, 14), o = p => { const la = p.lat * Math.PI / 180; return [Math.floor((p.lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n)]; };
  ds.sort((a, b) => { const A = o(a), B = o(b); return A[0] - B[0] || A[1] - B[1]; });    // điểm cùng ô đi liền nhau: dùng lại ô đã đọc
  OV.chay = true; OV.dung = false; let xong = 0, loi = 0; const t0 = Date.now();
  $("ovTatCa").textContent = T("Dừng"); const tt = $("ovTT");
  await hangDoi(ds, 4, async p => {
    try { p.ov = ovGon(await ovThongKe(p)); } catch (e) { loi++; }
    xong++; if (xong % 10 === 0 || xong === ds.length) tt.textContent = T("Overture: {a}/{b} điểm…", {a: xong, b: ds.length});
  }, () => OV.dung);
  OV.chay = false; save();
  $("ovTatCa").textContent = T("Tính cho mọi điểm");
  tt.textContent = T("đã tính Overture cho {a}/{b} điểm trong {s} s", {a: xong - loi, b: ds.length, s: Math.round((Date.now() - t0) / 1000)}) + (loi ? " · " + T("{n} điểm lỗi", {n: loi}) : "") + (OV.dung ? " · " + T("đã dừng") : "");
  ovHienDiem();
}

/* ---------------- giao diện ---------------- */
(function () {
  const pi = $("pinfo"); if (pi && !$("ovBox")) pi.insertAdjacentHTML("afterend", '<div id="ovBox" class="sm" data-noi18n></div>');
  const cb = (id, k, f) => { const e = $(id); if (!e) return; e.checked = !!OV[k]; e.onchange = () => { OV[k] = e.checked; ovLuu(); f(); }; };
  cb("cOvNha", "nha", () => { ovLop(); ovChuGiai(); });
  cb("cOvPoi", "poi", () => { ovLop(); ovChuGiai(); if (OV.lopPoi) OV.lopPoi.redraw(); });
  cb("cOvTK", "tk", ovHienDiem);
  const sr = $("ovR"); if (sr) { sr.value = String(OV.r); sr.onchange = () => { OV.r = +sr.value; ovLuu(); ovHienDiem(); }; }
  const st = $("ovTc"); if (st) { st.value = String(OV.tc); st.onchange = () => { OV.tc = +st.value; ovLuu(); if (OV.lopPoi) OV.lopPoi.redraw(); ovHienDiem(); }; }
  const bt = $("ovTatCa"); if (bt) bt.onclick = ovTatCa;
  ovBanUI(); ovChuGiai();
  if (OV.nha || OV.poi) setTimeout(ovLop, 0);
})();

/* ---------------- ② nhiệt độ bề mặt Landsat tại điểm ---------------- */
var LST = {m: new Map(), dang: new Map(), db: null, MAU: "#c92a2a"};
if (CVS.lst == null) CVS.lst = false;
LST.san = (async () => {
  if (typeof indexedDB === "undefined") return;
  try { LST.db = await new Promise((ok, loi) => { const r = indexedDB.open("laymau_hp_lst", 1); r.onupgradeneeded = () => r.result.createObjectStore("d"); r.onsuccess = () => ok(r.result); r.onerror = () => loi(r.error); }); }
  catch (e) { LST.db = null; }
})();
async function lstDocKho(k) {
  await LST.san; if (!LST.db) return null;
  try { return await new Promise(ok => { const r = LST.db.transaction("d", "readonly").objectStore("d").get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); } catch (e) { return null; }
}
function lstGhiKho(k, v) { if (!LST.db) return; try { LST.db.transaction("d", "readwrite").objectStore("d").put(v, k); } catch (e) { /* bỏ */ } }
function lstLoc(e) {                                 // QA sạch nhưng xanh lam sáng, hoặc lạnh bất thường so với cùng tháng / cả chuỗi: nghi mây
  const tv = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const qa = e.canh.filter(c => c.qa_sach && !c.sang), thang = {};
  qa.forEach(c => { const m = +c.d.slice(5, 7); (thang[m] = thang[m] || []).push(c.t); });
  const tvAll = tv(qa.map(c => c.t)), tvM = {}; Object.keys(thang).forEach(m => { if (thang[m].length >= 3) tvM[m] = tv(thang[m]); });
  e.canh.forEach(c => {
    c.lanh = c.qa_sach && !c.sang && ((tvM[+c.d.slice(5, 7)] != null && c.t < tvM[+c.d.slice(5, 7)] - 8) || (tvAll != null && c.t < tvAll - 20));
    c.quang = c.qa_sach && !c.sang && !c.lanh;
  });
}
function lstTong(e) {                                // trung vị theo kỳ 2 tháng (nam), theo tháng (nam12), cả năm (nam1: [trung vị, số cảnh])
  lstLoc(e);
  const tv = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  [6, 12].forEach(nky => {
    const nam = {};
    e.canh.forEach(c => { if (!c.quang) return; const y = +c.d.slice(0, 4), k = s1Ky(c.d, nky), N = nam[y] = nam[y] || {T: Array.from({length: nky}, () => [])}; N.T[k].push(c.t); });
    Object.values(nam).forEach(N => { N.n = N.T.map(a => a.length); N.T = N.T.map(tv); });
    if (nky === 12) e.nam12 = nam; else e.nam = nam;
  });
  const n1 = {}; e.canh.forEach(c => { if (c.quang) (n1[c.d.slice(0, 4)] = n1[c.d.slice(0, 4)] || []).push(c.t); });
  e.nam1 = {}; Object.entries(n1).forEach(([y, a]) => { e.nam1[y] = [+tv(a).toFixed(2), a.length]; });
}
function lstVeLai(k) {
  const q = vizPt(); if (!q || s1Khoa(q) !== k || CVS.kind === "nam" || !CVS.lst) return;
  clearTimeout(LST.henVe); LST.henVe = setTimeout(() => { renderCurve(); if ($("dlgCurve") && $("dlgCurve").open) renderCurveBig(); }, 60);
}
function lstGhiDiem(k, e) {                          // trung vị từng năm vào điểm mẫu (p.lst) để xuất CSV
  if (!e.nam1) return;
  Object.values(ST.diem).forEach(p => { if (s1Khoa(p) === k) { p.lst = Object.assign({}, p.lst || {}, e.nam1); } });
  save();
}
async function lstDiem(p) {                          // -> {canh: [{d, id, t (°C), qa_sach, sang, lanh, quang}], nam, nam12, nam1, xong, loi}
  const k = s1Khoa(p);
  if (LST.m.has(k) && LST.m.get(k).xong) return LST.m.get(k);
  if (LST.dang.has(k)) return LST.dang.get(k);
  const e = {canh: [], nam: {}, nam12: {}, xong: false, doc: 0, tong: 0};
  LST.m.set(k, e);
  const bao = () => { lstTong(e); lstVeLai(k); };
  const pr = (async () => {
    const cu = await lstDocKho(k), ys = s1Nam();
    if (cu && cu.xong && ys.every(y => (cu.nam_doc || []).includes(y))) { Object.assign(e, cu); bao(); lstGhiDiem(k, e); return e; }
    try {
      const body = {collections: ["landsat-c2-l2"], intersects: {type: "Point", coordinates: [p.lon, p.lat]}, datetime: `${ys[0]}-01-01T00:00:00Z/${ys[ys.length - 1]}-12-31T23:59:59Z`,
                    limit: 1000, query: {"eo:cloud_cover": {lte: 80}, platform: {in: ["landsat-8", "landsat-9"]}},
                    fields: {include: ["id", "properties.datetime", "properties.eo:cloud_cover", "properties.platform"], exclude: ["assets", "links", "geometry", "bbox"]}};
      let feats = [], j = await s1Lay(S1C.API + "/stac/v1/search", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
      for (let trang = 0; trang < 10; trang++) {
        feats = feats.concat(j.features || []);
        const nx = (j.links || []).find(l => l.rel === "next"); if (!nx) break;
        j = await s1Lay(nx.href, nx.method === "POST" ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(Object.assign({}, body, nx.body || {}))} : undefined);
      }
      const theoNgay = {};                            // cùng ngày ở hai cảnh chồng nhau (hàng WRS kề nhau): giữ cảnh ít mây hơn
      feats.forEach(f => { const d = String(f.properties.datetime).slice(0, 10), c = theoNgay[d]; if (!c || (f.properties["eo:cloud_cover"] || 0) < (c.properties["eo:cloud_cover"] || 0)) theoNgay[d] = f; });
      const nam0 = ST.nam, ds = Object.entries(theoNgay).map(([d, f]) => ({d, id: f.id, pl: f.properties.platform}))
        .sort((a, b) => Math.abs(+a.d.slice(0, 4) - nam0) - Math.abs(+b.d.slice(0, 4) - nam0) || (a.d < b.d ? -1 : 1));
      if (!ds.length) { e.xong = true; e.loi = "khong_canh"; bao(); return e; }
      e.tong = ds.length; e.doc = 0;
      let hen = null;
      await Promise.all(ds.map(async c => {
        await s1Giu(k);
        try {
          const r = await s1Lay(`${S1C.API}/data/v1/item/point/${p.lon},${p.lat}?collection=landsat-c2-l2&item=${encodeURIComponent(c.id)}&assets=lwir11&assets=qa_pixel&assets=blue`);
          const [st, qa, bl] = r.values || [];
          const ok = st > 0 && isFinite(st), t = ok ? +(st * 0.00341802 + 149 - 273.15).toFixed(2) : null, xanh = bl > 0 ? bl * 0.0000275 - 0.2 : null;
          e.canh.push({d: c.d, id: c.id, pl: c.pl, t, qa, xanh: xanh == null ? null : +xanh.toFixed(3), qa_sach: ok && qa != null && !(qa & 31), sang: xanh != null && xanh > 0.3});
        } catch (er) { e.canh.push({d: c.d, id: c.id, t: null, qa_sach: false, loi: 1}); }
        finally { s1Nha(); }
        e.doc++;
        if (!hen) hen = setTimeout(() => { hen = null; bao(); }, 700);
      }));
      clearTimeout(hen);
      e.canh.sort((a, b) => a.d < b.d ? -1 : 1);
      e.xong = true; e.nam_doc = ys; bao(); lstGhiDiem(k, e);
      const hong = e.canh.filter(c => c.loi).length;
      if (hong <= 0.05 * e.canh.length) lstGhiKho(k, {canh: e.canh.map(({quang, lanh, ...c}) => c), xong: true, nam_doc: ys, tong: e.tong, doc: e.doc});
      else e.hong = hong;
    } catch (er) { e.loi = String(er.message || er); e.xong = true; bao(); }
    return e;
  })();
  LST.dang.set(k, pr); pr.finally(() => LST.dang.delete(k));
  return pr;
}
function lstGop(cv, p) {                             // gắn dữ liệu nhiệt độ (có thể đang đọc dở) vào đường mùa vụ
  const k = s1Khoa(p), e0 = LST.m.get(k);
  if (!e0 || !e0.xong) lstDiem(p).catch(() => {});
  const e = LST.m.get(k) || {canh: [], nam: {}, nam12: {}, xong: false, doc: 0, tong: 0};
  const out = cv ? Object.assign({}, cv, {ys: Object.assign({}, cv.ys)}) : {src: {kieu: "lst"}, ys: {}};
  if (!cv || !Object.keys(cv.ys).length) { out.src = {kieu: "lst"}; s1Nam().forEach(y => { if (!out.ys[y]) out.ys[y] = {}; }); }
  out.lst = e;
  return out;
}
function lstSVG(cv, g) {                             // trục °C bên phải (bên ngoài trục dB của S1 nếu có), đường đỏ
  const {mode, yrs, X, W, H, R0, T0, B0, nky} = g, e = cv.lst, nam = (nky === 12 ? e.nam12 : e.nam) || {}, xL = W - R0 + 3 + (cv.s1 ? 26 : 0);
  const vals = [];
  Object.values(nam).forEach(N => N.T.forEach(v => { if (v != null) vals.push(v); }));
  if (mode === "mot") e.canh.forEach(c => { if (c.quang && +c.d.slice(0, 4) === ST.nam) vals.push(c.t); });
  if (!vals.length) return `<text x="${W - R0 - 4}" y="${T0 + 22}" font-size="9" text-anchor="end" fill="${LST.MAU}">LST: ${e.xong ? T("không có dữ liệu") : T("đang đọc…")}</text>`;
  vals.sort((a, b) => a - b);
  let lo = Math.floor(vals[0] / 5) * 5, hi = Math.ceil(vals[vals.length - 1] / 5) * 5; if (hi - lo < 10) { lo -= 5; hi += 5; }
  const Y = v => T0 + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - T0 - B0);
  let s = "";
  for (let v = lo; v <= hi + 1e-9; v += 5) s += `<text x="${xL}" y="${(Y(v) + 3).toFixed(1)}" font-size="8.5" fill="#c46a6a">${v}</text>`;
  s += `<text x="${W - 2}" y="${T0 + 2}" font-size="8" fill="#c46a6a" text-anchor="end">°C</text>`;
  const duong = (pts, w, op, dash) => { const q = pts.filter(t => t[1] != null && isFinite(t[1])); if (q.length < 2) return "";
    return `<polyline points="${q.map(t => X(t[0]).toFixed(1) + "," + Y(t[1]).toFixed(1)).join(" ")}" fill="none" stroke="${LST.MAU}" stroke-width="${w}" opacity="${op}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linejoin="round"/>`; };
  const tv = i => { const a = Object.values(nam).map(N => N.T[i]).filter(v => v != null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const viTri = d => { const m = +d.slice(5, 7) - 1, dd = +d.slice(8, 10) - 1; return Math.max(0, Math.min(nky - 1, nky === 12 ? m + dd / 31 - 0.5 : (m + dd / 31) / 2 - 0.5)); };
  if (mode === "chuoi") {
    s += duong(yrs.flatMap((y, k) => nam[y] ? nam[y].T.map((v, i) => [k * nky + i, v]) : []), 1.5, 0.95);
    yrs.forEach((y, k) => { if (!nam[y]) return; nam[y].T.forEach((v, i) => { if (v == null) return;
      s += `<rect x="${(X(k * nky + i) - 1.8).toFixed(1)}" y="${(Y(v) - 1.8).toFixed(1)}" width="3.6" height="3.6" fill="${LST.MAU}"><title>LST ${y}, ${kyTen(i)}: ${v.toFixed(1)} °C (${nam[y].n[i]} ${T("cảnh")})</title></rect>`; }); });
    return s;
  }
  if (mode === "mot") Object.entries(nam).forEach(([y, N]) => { if (+y !== ST.nam) s += duong(N.T.map((v, i) => [i, v]), 1, 0.22); });
  else s += duong(KY.map((t, i) => [i, tv(i)]), 1.2, 0.7, "2 2");
  const N = nam[ST.nam];
  if (N) { s += duong(N.T.map((v, i) => [i, v]), 2.4, 1);
    N.T.forEach((v, i) => { if (v != null) s += `<rect x="${(X(i) - 2.6).toFixed(1)}" y="${(Y(v) - 2.6).toFixed(1)}" width="5.2" height="5.2" fill="#fff" stroke="${LST.MAU}" stroke-width="1.6"><title>LST ${ST.nam}, ${kyTen(i)}: ${v.toFixed(1)} °C (${T("trung vị")} ${N.n[i]} ${T("cảnh")})</title></rect>`; }); }
  if (mode === "mot") e.canh.forEach(c => { if (+c.d.slice(0, 4) !== ST.nam || c.t == null) return; const x = X(viTri(c.d)).toFixed(1);
    if (c.quang) s += `<rect x="${(+x - 1.5).toFixed(1)}" y="${(Y(c.t) - 1.5).toFixed(1)}" width="3" height="3" fill="${LST.MAU}" opacity=".55"><title>LST ${c.d}: ${c.t.toFixed(1)} °C</title></rect>`;
    else if (c.qa_sach) s += `<line x1="${x}" x2="${x}" y1="${T0}" y2="${T0 + 5}" stroke="${LST.MAU}" stroke-width="1.2" opacity=".6"><title>${c.d}: ${c.t.toFixed(1)} °C — ${c.sang ? T("xanh lam sáng {b}, nghi mây QA bỏ sót", {b: c.xanh}) : T("lạnh bất thường, nghi mây")}</title></line>`; });
  return s;
}
function lstChuGiai(cv, mode) {
  const e = cv.lst, q = e.canh.filter(c => c.quang).length, bo = e.canh.filter(c => c.qa_sach && !c.quang).length;
  let h = `<div class="cvleg"><span><i style="background:${LST.MAU}"></i>${T("nhiệt độ bề mặt Landsat (°C, trục phải)")}</span>` +
    `<span>${mode === "mot" ? T("đậm: năm {y}; ô nhỏ: từng cảnh; vạch trên cùng: cảnh bị loại", {y: ST.nam}) : mode === "chong" ? T("đậm: năm {y}; chấm: trung vị các năm", {y: ST.nam}) : T("đường đỏ: nhiệt độ theo kỳ")}</span></div>`;
  h += `<div class="cvnote">${KY.length === 12 ? T("Landsat 8/9 Collection 2 L2 (Planetary Computer), nhiệt độ bề mặt, trung vị theo tháng các cảnh quang đãng tại điểm (băng nhiệt 100 m, lưới 30 m), chụp khoảng 10 giờ 30") : T("Landsat 8/9 Collection 2 L2 (Planetary Computer), nhiệt độ bề mặt, trung vị theo kỳ 2 tháng các cảnh quang đãng tại điểm (băng nhiệt 100 m, lưới 30 m), chụp khoảng 10 giờ 30")}` +
    (e.xong ? (e.loi ? ` · <b style="color:#b42318">${e.loi === "khong_canh" ? T("không có cảnh Landsat tại điểm") : T("lỗi đọc Landsat: ") + esc(e.loi)}</b>` : ` · ${T("{a} cảnh, {b} cảnh quang đãng, loại thêm {c} cảnh nghi mây", {a: e.canh.length, b: q, c: bo})}`)
      : ` · <b>${T("đang đọc Landsat {a}/{b} cảnh…", {a: e.doc || 0, b: e.tong || "?"})}</b>`) + `</div>`;
  const n1 = e.nam1 && e.nam1[ST.nam];
  h += `<div class="cvnote">${n1 ? T("Năm {y}: trung vị {t} °C ({n} cảnh).", {y: ST.nam, t: n1[0].toFixed(1), n: n1[1]}) + " " : ""}${T("Đọc nhanh: mái tôn, bê tông khu công nghiệp nóng nhất; khu dân cư dày nóng; nước, ruộng ngập, cây xanh mát hơn.")}</div>`;
  return h;
}
var _cvCtl310 = cvCtl;
cvCtl = function () {
  _cvCtl310.apply(this, arguments);
  const lb = $("lbCurveLST"); if (lb) lb.hidden = CVS.kind === "nam";
  const cb = $("cbCurveLST"); if (cb) cb.checked = !!CVS.lst;
};
(function () {
  const cb = $("cbCurveLST"); if (!cb) return;
  cb.checked = !!CVS.lst;
  cb.onchange = () => { CVS.lst = cb.checked; ls("laymau_hp_curve_v1", CVS); renderCurve(); if (typeof NT !== "undefined") { NT.xong.clear(); ntBatDau(); } };
})();

/* ---------------- nạp trước, xuất, gộp ---------------- */
var _ntNap310 = ntNap;
ntNap = async function (p, tok, thu) {
  await _ntNap310.apply(this, arguments);
  if (tok !== NT.tok) return;
  if (OV.tk && !(thu > 9)) { try { const s = await ovThongKe(p); if (ST.diem[p.id] === p) p.ov = ovGon(s); } catch (e) { /* bỏ */ } }
  if (CVS.kind !== "nam" && CVS.lst && !(thu > 4)) { try { await lstDiem(p); } catch (e) { /* bỏ */ } }
};
var _ntKhoa310 = ntKhoa;
ntKhoa = function (p) { return _ntKhoa310(p) + "|" + (CVS.lst ? "t" : "") + (OV.tk ? "o" + OV.r + "_" + OV.tc : ""); };
var _exportLong310 = CORE.exportLong;
CORE.exportLong = function (points, years, idx) {
  const rows = _exportLong310.apply(this, arguments), by = {};
  points.forEach(p => { by[p.id] = p; });
  rows.forEach(r => {
    const p = by[r.id] || {}, o = p.ov, l = p.lst && p.lst[r.nam];
    Object.assign(r, {ov_ban: o ? o.ban : "", ov_r_m: o ? o.r : "", ov_poi: o ? o.poi : "", ov_poi_km2: o ? o.km2 : "", ov_da_dang: o && o.dd != null ? o.dd : ""});
    OVN.forEach(g => { r["ov_poi_" + g.k] = o && o.nhom ? o.nhom[g.k] || 0 : ""; });
    Object.assign(r, {ov_nha: o ? o.nha : "", ov_phu_xd: o ? o.phu : "", ov_dt_nha_tb_m2: o && o.dt_tb != null ? o.dt_tb : "", ov_dt_nha_max_m2: o ? o.dt_max : "",
      ov_ty_le_nha_lon: o && o.ty_lon != null ? o.ty_lon : "", ov_so_tang_tb: o && o.tang_tb != null ? o.tang_tb : "",
      lst_tv_c: l ? l[0] : "", lst_so_canh: l ? l[1] : ""});
  });
  return rows;
};
var _merge310 = CORE.merge;
CORE.merge = function (a, b) {
  const r = _merge310.apply(this, arguments);
  Object.keys(b || {}).forEach(id => { const q = b[id], p = r[id]; if (!p || !q || p === q) return;
    if (q.ov && (!p.ov || (q.ov.t || 0) > (p.ov.t || 0))) p.ov = q.ov;
    if (q.lst) p.lst = Object.assign({}, q.lst, p.lst || {}); });
  return r;
};
