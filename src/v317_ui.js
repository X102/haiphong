/* =============================== BẢN 3.17 =============================== */
/* Chọn vùng: biểu đồ diện tích theo ngưỡng. Ngưỡng τ (khoảng cách chuẩn hoá tới điểm mẫu gần nhất) vốn chọn theo cảm nhận; biểu đồ
   cho thấy với MỌI ngưỡng 0..0.4: diện tích vùng chọn (đúng quy tắc của trang: điểm ảnh gần điểm mẫu lớp này nhất, gần hơn điểm
   loại trừ, trong phạm vi, liền với điểm mẫu nếu chọn "vùng liền"), diện tích nếu chỉ xét phổ (không cần liền), độ thuần theo một
   bản đồ lớp tham chiếu, tỉ lệ điểm đã gán cùng lớp được phủ, và các điểm đã gán lớp KHÁC lần lượt bị chọn. Từ đó gợi ý khoảng
   ngưỡng: đủ phủ mẫu cùng lớp, trước khi lấn sang lớp khác (điểm lớp khác đầu tiên, bước nhảy diện tích, độ thuần tụt).
   Tính một lượt: mỗi điểm ảnh nhận "ngưỡng vào vùng" = ngưỡng nhỏ nhất làm nó được chọn. Với vùng liền: thêm điểm ảnh theo thứ tự
   khoảng cách, gộp mảng bằng union-find (8 liên thông), ghi lúc mỗi mảng chạm điểm mẫu (cây gộp). Chưa tính nối khe, bỏ mảnh nhỏ,
   lấp lỗ, mảng đã xoá: diện tích thật sau làm sạch ở ngưỡng hiện tại vẽ thành một chấm để so. */
const NG = {B: 0.002, MAX: 0.4, kq: null, khoa: "", nen: null, gi: null, ref: null};
const ng$ = id => document.getElementById(id);

/* ---------- tính ---------- */
function ngPhanLop(D, groups, neg, prm) {         // như vgMatNaDa nhưng không đặt ngưỡng: mỗi điểm ảnh về lớp có điểm mẫu gần nhất
  const g = D.g, N = g.w * g.h, hl = prm.hieu_luc || "all";
  let scope = null;
  if (prm.pv === "bk") scope = CORE.circleScope(g, VG.pos.map(h => [h.lon, h.lat]), prm.R_km * 1000);
  if ((prm.pv === "xa" || prm.pv === "xads") && D.xaIdx) { const ids = new Set(vgXaChon()); scope = new Uint8Array(N); for (let i = 0; i < N; i++) if (ids.has(D.xaIdx[i])) scope[i] = 1; }
  const B = prm.tru && prm.tru !== "khong" ? vgKhoa(g, D.y, D.cache || (D.cache = {})) : null;
  const all = prm.tru === "het", gcode = groups.map(G => !G.ma ? 0 : (B && B.ma[G.ma]) || -1);
  if (hl === "all" && !B) return CORE.distSelMulti(D.F, D.nf, N, D.valid, groups.map(G => G.hat.map(s => s.v)), neg.map(s => s.v), 99, scope);
  const seeds = [];
  groups.forEach((G, gi) => G.hat.forEach(s => seeds.push({g: gi, v: s.v, dom: vgMien(D, s, hl, prm)})));
  neg.forEach(s => seeds.push({g: -1, v: s.v, dom: vgMien(D, s, hl, prm)}));
  return CORE.distSelZoned(D.F, D.nf, N, D.valid, seeds, 99, scope, B && B.code, gcode, all);
}
function ngVao(w, h, bin, nb, hat, lien) {        // -> Int16Array: ô ngưỡng (bin) lúc điểm ảnh vào vùng, -1 = không vào trong 0..MAX
  const N = w * h, vao = new Int16Array(N).fill(-1);
  if (!lien) { for (let i = 0; i < N; i++) if (bin[i] >= 0) vao[i] = bin[i]; return vao; }
  const dem = new Int32Array(nb + 1); for (let i = 0; i < N; i++) if (bin[i] >= 0) dem[bin[i]]++;
  const off = new Int32Array(nb + 1); for (let b = 0; b < nb; b++) off[b + 1] = off[b] + dem[b];
  const ord = new Int32Array(off[nb]), con = off.slice(0, nb); for (let i = 0; i < N; i++) if (bin[i] >= 0) ord[con[bin[i]]++] = i;
  const par = new Int32Array(N).fill(-1), sz = new Int32Array(N), co = new Uint8Array(N), cha = new Int32Array(N).fill(-1);
  const tim = x => { let r = x; while (par[r] !== r) r = par[r]; while (par[x] !== r) { const n = par[x]; par[x] = r; x = n; } return r; };
  for (let b = 0; b < nb; b++) for (let k = off[b]; k < off[b + 1]; k++) {
    const p = ord[k]; par[p] = p; sz[p] = 1; if (hat[p]) { co[p] = 1; vao[p] = b; }
    const x = p % w, y = (p - x) / w;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if ((!dx && !dy) || xx < 0 || xx >= w) continue; const q = yy * w + xx; if (par[q] < 0) continue;
        let a = tim(p), c = tim(q); if (a === c) continue;
        if (sz[a] < sz[c]) { const t = a; a = c; c = t; }
        if (co[a] && !co[c]) vao[c] = b; else if (!co[a] && co[c]) vao[a] = b;   // mảng chưa chạm điểm mẫu vừa nối vào vùng
        par[c] = a; cha[c] = a; sz[a] += sz[c]; co[a] |= co[c]; } }
  }
  const xong = new Uint8Array(N), chuoi = [];       // ngưỡng vào của mỗi điểm ảnh: mốc gần nhất trên cây gộp
  for (let i = 0; i < N; i++) {
    if (par[i] < 0 || xong[i]) continue; let x = i; chuoi.length = 0;
    while (!xong[x] && vao[x] < 0 && cha[x] >= 0) { chuoi.push(x); x = cha[x]; }
    const v = vao[x]; chuoi.forEach(z => { vao[z] = v; xong[z] = 1; }); xong[x] = 1;
  }
  return vao;
}
function ngTinh(D, groups, neg, prm, gi, refId) {
  const g = D.g, w = g.w, h = g.h, N = w * h, B = NG.B, nb = Math.round(NG.MAX / B), ra = CORE.rowArea(g);
  const r = ngPhanLop(D, groups, neg, prm), bin = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (r.cls[i] === gi + 1) { const b = Math.floor(r.d[i] / B); if (b < nb) bin[i] = b; }
  const hat = new Uint8Array(N); groups[gi].hat.forEach(s => { hat[s.i] = 1; bin[s.i] = 0; });
  const lien = prm.pv === "lien", vao = ngVao(w, h, bin, nb, hat, lien);
  const A = new Float64Array(nb), Ap = new Float64Array(nb);
  const L = (D.lop || []).find(l => l.id === refId) || (D.lop || [])[0] || null;
  let dom = null, Ad = null, Aq = null;
  if (L) {                                         // lớp tham chiếu chiếm nhiều nhất tại các điểm mẫu của lớp này
    const dm = {}; groups[gi].hat.forEach(s => { const v = L.data[s.i]; if (v) dm[v] = (dm[v] || 0) + 1; });
    const k = Object.entries(dm).sort((a, b) => b[1] - a[1])[0]; dom = k ? +k[0] : null; Ad = new Float64Array(nb); Aq = new Float64Array(nb);
  }
  for (let i = 0; i < N; i++) {
    const a = ra[Math.floor(i / w)] / 1e4;
    if (bin[i] >= 0) Ap[bin[i]] += a;
    const e = vao[i]; if (e < 0) continue; A[e] += a;
    if (L && L.data[i]) { Aq[e] += a; if (L.data[i] === dom) Ad[e] += a; }
  }
  for (let b = 1; b < nb; b++) { A[b] += A[b - 1]; Ap[b] += Ap[b - 1]; if (L) { Ad[b] += Ad[b - 1]; Aq[b] += Aq[b - 1]; } }
  // điểm đã gán năm đang tính (mọi bộ): cùng lớp / lớp khác, ngưỡng lúc bị chọn
  const ma = groups[gi].ma, dac = new Set((SCHEME.dac_biet || []).map(c => c.ma)), diem = [];
  if (ma) Object.values(ST.diem).forEach(p => {
    const nh = p.nhan && p.nhan[D.y]; if (!nh || dac.has(nh)) return;
    const q = CORE.llToPix(g, p.lon, p.lat), x = Math.floor(q[0]), y = Math.floor(q[1]); if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x; if (!D.valid[i] || hat[i]) return;
    diem.push({id: p.id, ma: nh, cung: nh === ma, vao: vao[i], i});
  });
  return {nb, B, A, Ap, L: L ? {id: L.id, ten: lname(L), dom, ten_dom: dom != null ? T((L.ten_lop || {})[dom] || String(dom)) : "", Ad, Aq} : null,
          diem, vao, ma, gi, lien, g, y: D.y};
}
function ngGoiY(K) {                               // khoảng ngưỡng gợi ý và các mốc
  const B = K.B, tau = b => +((b + 1) * B).toFixed(3), out = {moc: []};
  const cung = K.diem.filter(p => p.cung), khac = K.diem.filter(p => !p.cung && p.vao >= 0).sort((a, b) => a.vao - b.vao);
  if (khac.length) { out.lan = tau(khac[0].vao); out.lanDiem = khac[0]; out.moc.push(["lan", out.lan]); }
  if (cung.length >= 3) {                          // ngưỡng phủ 80 % điểm đã gán cùng lớp
    const v = cung.map(p => (p.vao < 0 ? Infinity : p.vao)).sort((a, b) => a - b), k = v[Math.ceil(0.8 * v.length) - 1];
    if (isFinite(k)) { out.phu = tau(k); out.moc.push(["phu", out.phu]); }
  }
  const A = K.A;                                   // bước nhảy diện tích: tăng vọt so với nhịp tăng trước đó
  for (let b = 6; b < K.nb; b++) {
    const dA = A[b] - A[b - 1]; if (A[b - 1] <= 0 || dA <= 0) continue;
    const truoc = []; for (let j = Math.max(1, b - 8); j < b; j++) truoc.push(A[j] - A[j - 1]); truoc.sort((p, q) => p - q);
    const med = truoc[Math.floor(truoc.length / 2)] || 0;
    if (dA > Math.max(4 * med, 0.25 * A[b - 1]) && dA > 0.02 * A[K.nb - 1]) { out.nhay = tau(b - 1); out.nhayTu = A[b - 1]; out.nhayDen = A[b]; out.moc.push(["nhay", out.nhay]); break; }
  }
  if (K.L && K.L.dom != null) for (let b = 0; b < K.nb; b++) {
    if (K.L.Aq[b] < 1e-9) continue; const p = K.L.Ad[b] / K.L.Aq[b];
    if (b > 2 && p < 0.8) { out.thuan = tau(b); out.moc.push(["thuan", out.thuan]); break; }
  }
  const tren = [out.lan, out.nhay, out.thuan].filter(v => v != null);
  out.tren = tren.length ? Math.min(...tren) : null;
  out.duoi = out.phu != null ? out.phu : null;
  if (out.duoi == null) {                          // chưa đủ điểm cùng lớp: khuỷu đường (Kneedle) trước mốc lấn — từ đó diện tích ít đổi khi nới ngưỡng
    const bt = out.tren != null ? Math.max(0, Math.round(out.tren / B) - 2) : K.nb - 1, dinh = A[bt];
    if (dinh > 0 && bt >= 4) { let tot = -1, bk = -1;
      for (let b = 0; b <= bt; b++) { const d = A[b] / dinh - (b + 1) / (bt + 1); if (d > tot) { tot = d; bk = b; } }
      if (tot > 0.2 && bk < bt) { out.duoi = tau(bk); out.khuyu = out.duoi; out.moc.unshift(["khuyu", out.duoi]); } }
  }
  out.mauThuan = out.duoi != null && out.tren != null && out.duoi >= out.tren;
  return out;
}

/* ---------- giao diện ---------- */
(function () {
  const v = vg$("vgTauV"); if (!v || ng$("ngMo")) return;
  v.insertAdjacentHTML("afterend", ` <button type="button" id="ngMo">📈</button>`);
  document.body.insertAdjacentHTML("beforeend", `<div id="ngP" class="ng-p" hidden data-noi18n><div class="vg-dau"><b data-t="tieu"></b><button type="button" id="ngDong">×</button></div>
    <div class="row sm"><span data-t="lop"></span><select id="ngLop"></select><span data-t="ref"></span><select id="ngRef"></select>
      <span data-t="truc"></span><select id="ngTruc"></select><label><input type="checkbox" id="ngBD"> <span data-t="bd"></span></label></div>
    <div id="ngVe"></div><div id="ngTom" class="sm"></div><div id="ngDS" class="sm"></div>
    <div class="row"><button type="button" id="ngCSV">CSV</button><span class="mu sm" id="ngTT"></span></div></div>`);
  const st = document.createElement("style");
  st.textContent = `.ng-p{position:fixed;left:8px;bottom:8px;z-index:1200;width:min(700px,96vw);max-height:80vh;overflow:auto;background:#fff;border:1px solid #d0d5dd;border-radius:8px;padding:8px;box-shadow:0 4px 18px rgba(0,0,0,.18)}
    .ng-p .vg-dau{display:flex;justify-content:space-between;align-items:center;cursor:move}.ng-p svg{width:100%;height:auto;display:block;cursor:crosshair}
    .ng-p table{border-collapse:collapse;font-size:12px}.ng-p td,.ng-p th{border:1px solid #e4e7ec;padding:1px 6px}.ng-goiy{background:#ecfdf3;border:1px solid #abefc6;border-radius:6px;padding:4px 8px;margin:4px 0}
    .ng-canh{background:#fef3f2;border:1px solid #fecdca;border-radius:6px;padding:4px 8px;margin:4px 0}`;
  document.head.appendChild(st);
  ng$("ngMo").onclick = () => ngMo(ng$("ngP").hidden);
  ng$("ngDong").onclick = () => ngMo(false);
  ng$("ngLop").onchange = () => { NG.gi = +ng$("ngLop").value; ngCapNhat(true); };
  ng$("ngRef").onchange = () => { NG.ref = ng$("ngRef").value; ls("laymau_hp_ng_ref_v1", NG.ref); ngCapNhat(true); };
  ng$("ngTruc").onchange = () => { ls("laymau_hp_ng_truc_v1", ng$("ngTruc").value); ngVe(); };
  ng$("ngBD").onchange = () => { ls("laymau_hp_ng_bd_v1", ng$("ngBD").checked); ngNen(); };
  ng$("ngBD").checked = !!ls("laymau_hp_ng_bd_v1"); NG.ref = ls("laymau_hp_ng_ref_v1") || null;
  ng$("ngCSV").onclick = ngCSV;
  { const el = ng$("ngP"), dau = el.querySelector(".vg-dau"); let s = null;   // kéo bảng
    dau.addEventListener("mousedown", e => { if (e.target.closest("button")) return; const r = el.getBoundingClientRect(); s = {x: e.clientX, y: e.clientY, l: r.left, t: r.top}; e.preventDefault(); });
    document.addEventListener("mousemove", e => { if (!s) return; el.style.left = Math.max(0, s.l + e.clientX - s.x) + "px"; el.style.top = Math.max(0, s.t + e.clientY - s.y) + "px"; el.style.bottom = "auto"; });
    document.addEventListener("mouseup", () => { s = null; }); }
  if (window.L && L.DomEvent) { L.DomEvent.disableClickPropagation(ng$("ngP")); L.DomEvent.disableScrollPropagation(ng$("ngP")); }
  ngChu();
})();
function ngChu() {
  const p = ng$("ngP"); if (!p) return; const t = (k, s) => { const e = p.querySelector(`[data-t="${k}"]`); if (e) e.textContent = s; };
  t("tieu", T("Diện tích theo ngưỡng")); t("lop", T("Lớp")); t("ref", T("Bản đồ tham chiếu")); t("bd", T("tô bản đồ theo ngưỡng vào vùng")); t("truc", T("Trục"));
  const tr = ng$("ngTruc"), cu = tr.value || ls("laymau_hp_ng_truc_v1") || "tu";
  tr.innerHTML = [["tu", T("tự động (cắt phần nhảy vọt)")], ["du", T("đầy đủ")], ["log", T("thang log")]].map(([v, x]) => `<option value="${v}">${esc(x)}</option>`).join(""); tr.value = cu;
  ng$("ngMo").title = T("biểu đồ diện tích theo ngưỡng: ngưỡng nào hợp lý, từ ngưỡng nào bắt đầu lấn sang lớp khác");
  ng$("ngBD").parentElement.title = T("mỗi điểm ảnh tô theo ngưỡng nhỏ nhất làm nó được chọn: chỗ vào sớm (tím) giống điểm mẫu nhất, chỗ vào muộn (vàng) là chỗ bị kéo theo khi nới ngưỡng");
  if (NG.kq) ngVe();
}
function ngMo(on) {
  ng$("ngP").hidden = !on;
  if (!on) { if (NG.nen) { map.removeLayer(NG.nen); NG.nen = null; } return; }
  ngCapNhat(true);
}
function ngKhoa(D, groups, neg, prm) {            // khoá: đổi thì tính lại (ngưỡng và làm sạch không ảnh hưởng đường)
  const p = Object.assign({}, prm); ["tau", "minPx", "lo", "khe"].forEach(k => delete p[k]);
  return [D.y, D.ids, D.r, D.g.bb.join(), JSON.stringify(p), groups.map(G => G.ma + ":" + G.hat.map(s => s.i).join(",")).join("|"), neg.map(s => s.i).join(","),
    NG.gi, NG.ref, VG.vungVer, (vg$("vgPV").value === "xa" || vg$("vgPV").value === "xads") ? vgXaChon().join() : ""].join("#");
}
function ngCapNhat(ep) {
  const P = ng$("ngP"); if (!P || P.hidden) return;
  const D = VG.data, S = VG.seedV;
  if (!D || !S || !S.groups || !S.groups.length || S.y !== D.y) { NG.kq = null; ng$("ngVe").innerHTML = ""; ng$("ngTom").textContent = T("đặt điểm mẫu và chọn vùng trước, rồi mở lại biểu đồ"); ng$("ngDS").innerHTML = ""; return; }
  const groups = S.groups, prm = vgThamSo();
  if (NG.gi == null || NG.gi >= groups.length) { const k = groups.findIndex(G => G.ma === (VG.res && VG.res.ma)); NG.gi = k >= 0 ? k : groups.length - 1; }
  ng$("ngLop").innerHTML = groups.map((G, k) => `<option value="${k}">${esc(G.ma ? vgTenLop(G.ma) : T("chưa gán lớp"))}</option>`).join(""); ng$("ngLop").value = String(NG.gi);
  ng$("ngRef").innerHTML = `<option value="">${T("không")}</option>` + (D.lop || []).map(l => `<option value="${esc(l.id)}">${esc(lname(l))}</option>`).join("");
  if (NG.ref == null || !(D.lop || []).some(l => l.id === NG.ref)) NG.ref = NG.ref === "" ? "" : ((D.lop || [])[0] || {}).id || ""; ng$("ngRef").value = NG.ref;
  const khoa = ngKhoa(D, groups, S.neg || [], prm);
  if (ep || khoa !== NG.khoa || !NG.kq) {
    const t0 = Date.now();
    NG.kq = ngTinh(D, groups, S.neg || [], prm, NG.gi, NG.ref || "__khong__"); NG.khoa = khoa;
    if (!NG.ref) NG.kq.L = null;
    NG.kq.giay = (Date.now() - t0) / 1000; NG.goiy = ngGoiY(NG.kq);
  }
  ngVe(); ngNen();
}
var _vgChon317 = vgChon;
vgChon = function () { const r = _vgChon317.apply(this, arguments); try { ngCapNhat(false); } catch (e) { /* bảng ngưỡng */ } return r; };

/* ---------- biểu đồ ---------- */
function ngTron(v) { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function ngSo(a) { return a >= 100 ? xbSoChu(a, 0) : a >= 10 ? xbSoChu(a, Math.abs(a - Math.round(a)) > 1e-9 ? 1 : 0) : a >= 1 ? xbSoChu(a, a % 1 ? 1 : 0) : String(+a.toPrecision(2)); }
function ngVe() {
  const K = NG.kq, G = NG.goiy; if (!K) return;
  const W = 680, H = 300, ml = 56, mr = 46, mt = 14, mb = 34, pw = W - ml - mr, ph = H - mt - mb, nb = K.nb, B = K.B;
  const tauNow = +vg$("vgTau").value, bNow = Math.min(nb - 1, Math.max(0, Math.round(tauNow / B) - 1)), Afull = Math.max(1e-6, K.Ap[nb - 1], K.A[nb - 1]);
  const truc = ng$("ngTruc").value || "tu";
  let Amax = Afull;
  if (truc === "tu") { const bt = G.tren != null ? Math.max(0, Math.round(G.tren / B) - 2) : null, nen = Math.max(bt != null ? K.A[bt] : 0, K.A[bNow]);
    if (nen > 0 && Afull > 3 * nen) Amax = 1.6 * nen; }
  const buoc = ngTron(Amax / 4); Amax = buoc * Math.max(1, Math.ceil(Amax / buoc - 1e-9)); const cat = Amax < Afull * 0.999;
  const lg = truc === "log", a0 = Math.max(1e-3, Math.min(...Array.from(K.A).filter(v => v > 0).concat([Afull])) / 2), L0 = Math.log10(a0), L1 = Math.log10(Math.max(Afull, a0 * 10));
  const X = t => ml + pw * t / NG.MAX, Y = a => lg ? mt + ph * (1 - (Math.log10(Math.max(a, a0)) - L0) / (L1 - L0)) : mt + ph * (1 - Math.min(a, Amax * 1.02) / Amax), Yp = p => mt + ph * (1 - p);
  const pts = (arr, f) => Array.from(arr, (a, b) => `${X((b + 1) * B).toFixed(1)},${f(a).toFixed(1)}`).join(" ");
  const mau = K.ma ? vgMau(K.ma) : "#d61ea0", s = [];
  s.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" font-size="11">`);
  if (G.duoi != null || G.tren != null) {         // khoảng gợi ý
    const a = G.duoi != null ? G.duoi : 0, b = G.tren != null ? G.tren : NG.MAX;
    if (b > a) s.push(`<rect x="${X(a)}" y="${mt}" width="${X(b) - X(a)}" height="${ph}" fill="#12b76a" opacity=".12"/>`);
  }
  const vachY = lg ? Array.from({length: Math.floor(L1) - Math.ceil(L0) + 1}, (_, k) => Math.pow(10, Math.ceil(L0) + k)) : Array.from({length: Math.round(Amax / buoc) + 1}, (_, k) => k * buoc);
  vachY.forEach(a => { const y = Y(a); s.push(`<line x1="${ml}" x2="${ml + pw}" y1="${y}" y2="${y}" stroke="#eaecf0"/><text x="${ml - 4}" y="${y + 4}" text-anchor="end" fill="#475467">${ngSo(a)}</text>`); });
  [0, 25, 50, 75, 100].forEach(k => s.push(`<text x="${ml + pw + 4}" y="${Yp(k / 100) + 4}" fill="#475467">${k}%</text>`));
  s.push(`<clipPath id="ngKhung"><rect x="${ml}" y="${mt}" width="${pw}" height="${ph}"/></clipPath>`);
  for (let t = 0; t <= NG.MAX + 1e-9; t += 0.05) s.push(`<line x1="${X(t)}" x2="${X(t)}" y1="${mt + ph}" y2="${mt + ph + 4}" stroke="#667085"/><text x="${X(t)}" y="${mt + ph + 16}" text-anchor="middle" fill="#475467">${t.toFixed(2)}</text>`);
  s.push(`<text x="${ml + pw / 2}" y="${H - 3}" text-anchor="middle" fill="#344054">${esc(T("ngưỡng τ"))}</text><text x="12" y="${mt + ph / 2}" transform="rotate(-90 12 ${mt + ph / 2})" text-anchor="middle" fill="#344054">${esc(T("diện tích, ha"))}</text>`);
  s.push(`<rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="none" stroke="#98a2b3"/>`);
  s.push(`<g clip-path="url(#ngKhung)">`);
  if (K.lien) s.push(`<polyline fill="none" stroke="#98a2b3" stroke-dasharray="4 3" stroke-width="1.5" points="${pts(K.Ap, Y)}"/>`);
  s.push(`<polyline fill="none" stroke="${mau}" stroke-width="2.4" points="${pts(K.A, Y)}"/></g>`);
  if (K.L && K.L.dom != null) s.push(`<polyline fill="none" stroke="#2e90fa" stroke-width="1.6" stroke-dasharray="6 2" points="${Array.from(K.L.Aq, (q, b) => q > 0 ? `${X((b + 1) * B).toFixed(1)},${Yp(K.L.Ad[b] / q).toFixed(1)}` : "").filter(Boolean).join(" ")}"/>`);
  const cung = K.diem.filter(p => p.cung);
  if (cung.length) { const n = cung.length, v = new Float64Array(nb); cung.forEach(p => { if (p.vao >= 0) v[p.vao]++; }); for (let b = 1; b < nb; b++) v[b] += v[b - 1];
    s.push(`<polyline fill="none" stroke="#039855" stroke-width="1.6" points="${Array.from(v, (c, b) => `${X((b + 1) * B).toFixed(1)},${Yp(c / n).toFixed(1)}`).join(" ")}"/>`); }
  K.diem.filter(p => !p.cung && p.vao >= 0).forEach(p => { const x = X((p.vao + 1) * B); s.push(`<line x1="${x}" x2="${x}" y1="${mt + ph - 10}" y2="${mt + ph}" stroke="#d92d20" stroke-width="1.5"><title>${esc(p.id)} · ${esc(p.ma)} · τ ${((p.vao + 1) * B).toFixed(3)}</title></line>`); });
  let tang = 0; const nhan = [], vach = (t, c, chu) => { if (t == null) return; const x = X(t), y = mt + 26 + 14 * tang++, ben = x > ml + pw - 70;
    s.push(`<line x1="${x}" x2="${x}" y1="${mt}" y2="${mt + ph}" stroke="${c}" stroke-dasharray="5 3" stroke-width="1.4"/>`);
    const tt = `x="${ben ? x - 5 : x + 5}" y="${y}" text-anchor="${ben ? "end" : "start"}" font-weight="600"`;   // viền trắng là bản chữ riêng nằm dưới
    nhan.push(`<text ${tt} fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round">${esc(chu)}</text><text ${tt} fill="${c}">${esc(chu)}</text>`); };
  vach(G.lan, "#d92d20", T("lớp khác")); vach(G.nhay, "#dc6803", T("nhảy")); vach(G.thuan, "#2e90fa", "< 80 %"); s.push(...nhan);
  const xN = X(tauNow); s.push(`<line id="ngNow" x1="${xN}" x2="${xN}" y1="${mt}" y2="${mt + ph}" stroke="#101828" stroke-width="1.8"/>`);
  const st = VG.res && VG.res.st && VG.kq && VG.kq.lops[NG.gi] === VG.res.ma ? VG.res.st.dien_tich_ha : null;
  if (st != null && (lg || st <= Amax * 1.05)) s.push(`<circle cx="${xN}" cy="${Y(st)}" r="4" fill="#101828"><title>${esc(T("diện tích sau làm sạch: {a} ha", {a: xbHa(st)}))}</title></circle>`);
  s.push(`<g id="ngHov" visibility="hidden"><line x1="0" x2="0" y1="${mt}" y2="${mt + ph}" stroke="#667085" stroke-width="1"/><rect x="0" y="${mt + 2}" width="150" height="58" rx="4" fill="#fff" stroke="#98a2b3" opacity=".95"/><text x="0" y="${mt + 16}" fill="#101828"></text><text x="0" y="${mt + 30}" fill="#101828"></text><text x="0" y="${mt + 44}" fill="#101828"></text><text x="0" y="${mt + 58}" fill="#101828"></text></g>`);
  s.push(`</svg>`);
  const leg = [`<span style="color:${mau}">━</span> ${esc(K.lien ? T("vùng chọn (liền với điểm mẫu)") : T("vùng chọn"))}`]
    .concat(K.lien ? [`<span style="color:#98a2b3">┅</span> ${esc(T("chỉ xét phổ (không cần liền)"))}`] : [],
      K.L && K.L.dom != null ? [`<span style="color:#2e90fa">╍</span> ${esc(T("độ thuần: % diện tích là «{l}» theo {m}", {l: K.L.ten_dom, m: K.L.ten}))}`] : [],
      cung.length ? [`<span style="color:#039855">━</span> ${esc(T("% điểm đã gán cùng lớp được chọn ({n} điểm)", {n: cung.length}))}`] : [],
      K.diem.some(p => !p.cung) ? [`<span style="color:#d92d20">┃</span> ${esc(T("điểm đã gán lớp khác bị chọn"))}`] : [],
      [`<span style="color:#12b76a">▇</span> ${esc(T("khoảng gợi ý"))}`, `● ${esc(T("diện tích thật sau làm sạch"))}`],
      cat ? [`<i>${esc(T("trục cắt ở {a} ha; đầy đủ tới {b} ha", {a: ngSo(Amax), b: ngSo(Afull)}))}</i>`] : []);
  ng$("ngVe").innerHTML = s.join("") + `<div class="mu sm">${leg.join(" · ")}</div>`;
  const svg = ng$("ngVe").querySelector("svg"), hov = svg.querySelector("#ngHov");
  const tauTai = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * W / (r.width || W); return Math.max(NG.B, Math.min(NG.MAX, (x - ml) / pw * NG.MAX)); };
  svg.addEventListener("mousemove", e => { const t = tauTai(e), b = Math.min(nb - 1, Math.max(0, Math.round(t / B) - 1)), x = X((b + 1) * B);
    const tx = hov.querySelectorAll("text"), bx = x + 156 > ml + pw ? x - 154 : x + 4;
    hov.setAttribute("visibility", "visible"); hov.querySelector("line").setAttribute("x1", x); hov.querySelector("line").setAttribute("x2", x); hov.querySelector("rect").setAttribute("x", bx);
    const ns = K.diem.filter(p => !p.cung && p.vao >= 0 && p.vao <= b).length, nc = cung.filter(p => p.vao >= 0 && p.vao <= b).length;
    const dong = [`τ = ${((b + 1) * B).toFixed(3)}: ${xbHa(K.A[b])} ${T("ha")}`, K.lien ? `${T("chỉ phổ")}: ${xbHa(K.Ap[b])} ${T("ha")}` : "",
      K.L && K.L.Aq[b] > 0 ? `${T("độ thuần")}: ${(100 * K.L.Ad[b] / K.L.Aq[b]).toFixed(0)} %` : "", (cung.length ? `${T("cùng lớp")}: ${nc}/${cung.length}` : "") + (K.diem.some(p => !p.cung) ? ` · ${T("lớp khác")}: ${ns}` : "")].filter(Boolean);
    tx.forEach((el, k) => { el.setAttribute("x", bx + 5); el.textContent = dong[k] || ""; }); });
  svg.addEventListener("mouseleave", () => hov.setAttribute("visibility", "hidden"));
  svg.addEventListener("click", e => { const t = tauTai(e); const el = vg$("vgTau"); el.value = (Math.round(t / 0.002) * 0.002).toFixed(3); vgChon(); });
  ngTom();
}
function ngTom() {
  const K = NG.kq, G = NG.goiy, tau = +vg$("vgTau").value, b = Math.min(K.nb - 1, Math.max(0, Math.round(tau / K.B) - 1)), p = [];
  p.push(`<p>${T("Ngưỡng hiện tại {t}: {a} ha theo đường (chưa làm sạch).", {t: tau.toFixed(3), a: xbHa(K.A[b])})} ${K.giay != null ? `<span class="mu">(${T("tính trong {s} giây", {s: K.giay.toFixed(1)})})</span>` : ""}</p>`);
  if (G.mauThuan) p.push(`<div class="ng-canh">${T("Chưa có ngưỡng nào vừa phủ 80 % điểm đã gán cùng lớp (từ {a}) vừa chưa chọn điểm lớp khác (từ {b}): thêm điểm loại trừ ở chỗ bị lấn, thêm điểm mẫu ở chỗ bị sót, hoặc đổi đặc trưng so sánh.", {a: G.duoi.toFixed(3), b: G.tren.toFixed(3)})}</div>`);
  else if (G.duoi != null || G.tren != null) p.push(`<div class="ng-goiy">${T("Khoảng ngưỡng gợi ý: {a} – {b}.", {a: (G.duoi != null ? G.duoi : NG.B).toFixed(3), b: G.tren != null ? (G.tren - NG.B).toFixed(3) : NG.MAX.toFixed(3)})}` +
    (tau > (G.tren || 9) ? " " + T("Ngưỡng hiện tại đã vượt mốc lấn sang lớp khác.") : (G.duoi != null && tau < G.duoi) ? " " + T("Ngưỡng hiện tại còn sót nhiều điểm cùng lớp.") : "") + `</div>`);
  else p.push(`<p class="mu">${T("Chưa đủ căn cứ để gợi ý: không có điểm đã gán năm này quanh vùng, không có bước nhảy diện tích rõ, không có bản đồ tham chiếu. Xem dáng đường: đoạn thoải là đang chọn đúng lớp, chỗ dốc đứng là bắt đầu lan sang vùng rộng khác.")}</p>`);
  const moc = [];
  if (G.phu != null) moc.push(T("phủ 80 % điểm đã gán cùng lớp từ τ = {t}", {t: G.phu.toFixed(3)}));
  if (G.khuyu != null) moc.push(T("đường bắt đầu thoải (diện tích ít đổi khi nới tiếp) từ τ = {t}", {t: G.khuyu.toFixed(3)}));
  if (G.lan != null) moc.push(T("điểm lớp khác đầu tiên bị chọn ở τ = {t} ({id}, {l})", {t: G.lan.toFixed(3), id: G.lanDiem.id, l: G.lanDiem.ma}));
  if (G.nhay != null) moc.push(T("diện tích nhảy từ {a} lên {b} ha sau τ = {t}", {a: xbHa(G.nhayTu), b: xbHa(G.nhayDen), t: G.nhay.toFixed(3)}));
  if (G.thuan != null) moc.push(T("độ thuần theo {m} xuống dưới 80 % từ τ = {t}", {m: K.L.ten, t: G.thuan.toFixed(3)}));
  if (moc.length) p.push(`<p>${T("Mốc")}: ${moc.map(esc).join("; ")}.</p>`);
  p.push(`<p class="mu">${T("Đường tính đúng quy tắc chọn của trang (gần điểm mẫu lớp này nhất, gần hơn điểm loại trừ, trong phạm vi, liền với điểm mẫu nếu chọn) nhưng chưa nối khe, bỏ mảnh nhỏ, lấp lỗ: chấm đen là diện tích thật sau làm sạch ở ngưỡng hiện tại.")}</p>`);
  ng$("ngTom").innerHTML = p.join("");
  const khac = K.diem.filter(q => !q.cung && q.vao >= 0).sort((a, c) => a.vao - c.vao).slice(0, 12);
  ng$("ngDS").innerHTML = khac.length ? `<table><tr><th>${T("điểm lớp khác")}</th><th>${T("lớp")}</th><th>τ</th><th></th></tr>` +
    khac.map((q, k) => `<tr><td>${esc(q.id)}</td><td>${esc(q.ma)}</td><td>${((q.vao + 1) * K.B).toFixed(3)}</td><td><button type="button" data-k="${k}">${T("xem")}</button></td></tr>`).join("") + `</table>` : "";
  ng$("ngDS").querySelectorAll("[data-k]").forEach(bt => { bt.onclick = () => { const q = khac[+bt.dataset.k], P = ST.diem[q.id]; if (P) map.setView([P.lat, P.lon], Math.max(map.getZoom(), 16)); }; });
  ng$("ngTT").textContent = "";
}
function ngNen() {                                 // tô bản đồ theo ngưỡng vào vùng (tím: vào sớm, vàng: vào muộn)
  if (NG.nen) { map.removeLayer(NG.nen); NG.nen = null; }
  const K = NG.kq; if (!K || ng$("ngP").hidden || !ng$("ngBD").checked) return;
  const g = K.g, c = document.createElement("canvas"); c.width = g.w; c.height = g.h; const ctx = c.getContext && c.getContext("2d"); if (!ctx) return;
  const lut = CORE.lut("viridis") || null, img = ctx.createImageData(g.w, g.h), d = img.data;
  for (let i = 0; i < K.vao.length; i++) { const e = K.vao[i]; if (e < 0) continue; const v = Math.round(1 + 254 * e / (K.nb - 1)), q = lut ? lut[v] : [v, v, 255 - v];
    d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 170; }
  ctx.putImageData(img, 0, 0);
  const A = CORE.m2ll(g.bb[0], g.bb[1]), Bm = CORE.m2ll(g.bb[2], g.bb[3]);
  NG.nen = L.imageOverlay(c.toDataURL(), [[A[1], A[0]], [Bm[1], Bm[0]]], {opacity: 1, interactive: false, pmIgnore: true, zIndex: 449}).addTo(map);
  const el = NG.nen.getElement && NG.nen.getElement(); if (el) el.style.imageRendering = "pixelated";
}
function ngCSV() {
  const K = NG.kq; if (!K) return; const rows = [], cung = K.diem.filter(p => p.cung);
  for (let b = 0; b < K.nb; b++) rows.push({tau: +((b + 1) * K.B).toFixed(3), dien_tich_ha: +K.A[b].toFixed(4), chi_pho_ha: +K.Ap[b].toFixed(4),
    do_thuan_pct: K.L && K.L.Aq[b] > 0 ? +(100 * K.L.Ad[b] / K.L.Aq[b]).toFixed(2) : "",
    phu_cung_lop_pct: cung.length ? +(100 * cung.filter(p => p.vao >= 0 && p.vao <= b).length / cung.length).toFixed(1) : "",
    so_diem_lop_khac: K.diem.filter(p => !p.cung && p.vao >= 0 && p.vao <= b).length});
  download(`dien_tich_theo_nguong_${K.ma || "lop"}_${K.y}_${stamp()}.csv`, CORE.toCSV(rows, ["tau", "dien_tich_ha", "chi_pho_ha", "do_thuan_pct", "phu_cung_lop_pct", "so_diem_lop_khac"]), "text/csv");
}
if (typeof setLang === "function") { const _sl317 = setLang; setLang = function () { const r = _sl317.apply(this, arguments); ngChu(); return r; }; }
var _vgBat317 = typeof vgBat === "function" ? vgBat : null;
if (_vgBat317) vgBat = function (on) { const r = _vgBat317.apply(this, arguments); if (!on && ng$("ngP") && !ng$("ngP").hidden) ngMo(false); return r; };
