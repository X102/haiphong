// Bản 3.16.1: hộp gộp tệp tiến độ đóng được (trước trùng id nút Đóng); tiến độ lớn hơn localStorage lưu trong IndexedDB và nạp lại khi mở
// trang; sau khi gộp báo số điểm từng bộ, bộ đang chọn trống thì chuyển sang bộ có dữ liệu.
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
const NM = process.env.NM || "/tmp/nt/node_modules", FDB = require(NM + "/fake-indexeddb");
(async () => {
  const idb = new FDB.IDBFactory();               // "đĩa" IndexedDB dùng chung cho hai lần mở trang
  const caiIDB = w => { w.indexedDB = idb; w.IDBKeyRange = FDB.IDBKeyRange; };
  const A = moTrang({geoman: true, truoc: caiIDB});
  let {w, $, E, sleep, until, errs} = A;
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4 && E("TT_DB.san"), 8000, "manifest + E0");
  ok(E("VERSION").localeCompare("3.16.1", undefined, {numeric: true}) >= 0, "bản " + E("VERSION"));

  // ---------- 1. id không trùng; hai nút Đóng đóng đúng hộp của mình
  const trung = E(`(() => { const c = {}; document.querySelectorAll("[id]").forEach(e => { if (e.tagName !== "SCRIPT") c[e.id] = (c[e.id] || 0) + 1; }); return Object.keys(c).filter(k => c[k] > 1); })()`);
  ok(trung.length === 0, "không còn id trùng trong trang" + (trung.length ? ": " + trung.join(", ") : ""));
  await E("v29GopMo([])"); await sleep(30);
  ok($("dlgGopTep").open, "mở hộp gộp tệp tiến độ"); $("gtpDong").click(); await sleep(10);
  ok(!$("dlgGopTep").open, "nút Đóng của hộp gộp tệp đóng được hộp");
  $("bGT").click(); await sleep(30); const moGT = $("dlgGT").open; $("gtDong").click(); await sleep(10);
  ok(moGT && !$("dlgGT").open, "nút Đóng của Giới thiệu đóng đúng hộp Giới thiệu");

  // ---------- 2. tiến độ lớn hơn localStorage (jsdom: 5 triệu ký tự): lưu vào IndexedDB, localStorage giữ bản tóm tắt
  E(`(() => { const ghi = "x".repeat(900); for (let i = 0; i < 6000; i++) { const id = "L" + String(i).padStart(5, "0");
      ST.diem[id] = {id, bo: "lon", lon: 106.6 + i * 1e-5, lat: 20.9, nhan: {2025: i % 2 ? "N1" : "X1"}, tg: {2025: 1}, tin: {}, ghi_chu: ghi}; }
    ST.bo_cfg.lon = {ten: "Bộ lớn", nam: [2025], tu_tao: true}; ST.bo = "lon"; save(); })()`);
  await until(() => { const s = E(`localStorage.getItem("laymau_hp_state_v1")`); return s && JSON.parse(s).chi_tom_tat; }, 8000, "lưu bản tóm tắt");
  const tt = JSON.parse(E(`localStorage.getItem("laymau_hp_state_v1")`));
  ok(tt.chi_tom_tat && Object.keys(tt.diem).length === 0 && tt.bo === "lon" && tt.bo_cfg.lon, "localStorage đầy: giữ bản tóm tắt (bộ đang chọn, cấu hình bộ), không có điểm");
  await until(() => /lớn hơn bộ nhớ thường của trình duyệt/.test($("msgs").textContent), 8000, "báo chuyển sang IndexedDB");
  const trongDB = await E(`ttIDB("doc").then(s => { const j = JSON.parse(s); return {n: Object.keys(j.diem).length, lon: Object.values(j.diem).filter(p => p.bo === "lon").length}; })`);
  ok(trongDB.n === 6004 && trongDB.lon === 6000, `IndexedDB giữ đủ tiến độ: ${trongDB.n} điểm`);
  const lsCopy = E(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))`);
  w.close();

  // ---------- 3. mở lại trang: nạp lại tiến độ từ IndexedDB trước khi nạp bộ điểm
  const B = moTrang({geoman: true, truoc: w2 => { caiIDB(w2); const o = JSON.parse(lsCopy); Object.entries(o).forEach(([k, v]) => { try { w2.localStorage.setItem(k, v); } catch (e) { /* bỏ */ } }); }});
  ({w, $, E, sleep, until, errs} = B);
  await until(() => E("MAN") && E("TT_DB.san") && Object.keys(E("ST.diem")).length >= 6000, 15000, "nạp lại từ IndexedDB");
  const sau = E(`({n: Object.keys(ST.diem).length, bo: ST.bo, lon: Object.values(ST.diem).filter(p => p.bo === "lon").length, nhan: ST.diem.L00001.nhan[2025], khoi: TT_DB.khoiPhuc})`);
  ok(sau.lon === 6000 && sau.bo === "lon" && sau.nhan === "N1" && sau.khoi, `mở lại trang: ${sau.n} điểm, bộ đang chọn «lon» (${sau.lon} điểm), nhãn còn nguyên`);
  ok([...$("selSet").options].some(o => /Bộ lớn \(6000\)/.test(o.textContent)) && /đã nạp tiến độ lưu trong IndexedDB: \d+ điểm/.test($("msgs").textContent), "ô chọn bộ hiện «Bộ lớn (6000)»; báo đã nạp từ IndexedDB");

  // ---------- 4. gộp tệp: báo số điểm từng bộ; bộ đang chọn trống thì chuyển sang bộ có dữ liệu; gộp lại lần hai: giải thích "0 mới"
  E(`(() => { for (const id of Object.keys(ST.diem)) if (ST.diem[id].bo === "lon" && +id.slice(1) >= 50) delete ST.diem[id];
    ST.bo_cfg.trong = {ten: "Bộ trống", nam: [2025], tu_tao: true}; ST.bo = "trong"; buildSetSelect(); render(); })()`);
  const tep = E(`JSON.stringify({loai: "laymau_hp", phien_ban: 1, xuat_luc: new Date().toISOString(), st: {diem: Object.fromEntries(Object.entries(ST.diem).filter(([k, p]) => p.bo === "lon").map(([k, p]) => [k, Object.assign({}, p, {nhan: {2025: "T1"}, tg: {2025: Date.now()}})])), bo_cfg: ST.bo_cfg}})`);
  const f = new w.File([tep], "laymau_tien_do_thu.json", {type: "application/json"});
  await E("v29GopMo")([f]); await sleep(50); $("gtOk").click(); await sleep(100);
  const kq = $("gtKQ").textContent;
  ok(/Trang hiện có \d+ điểm trong \d+ bộ: .*Bộ lớn 50 điểm \(50 nhãn\)/.test(kq) && /Bộ đang chọn \(trong\) không có điểm nào: đã chuyển sang bộ lon/.test(kq) && E("ST.bo") === "lon",
     "sau khi gộp: báo số điểm, số nhãn từng bộ; bộ đang chọn trống thì chuyển sang bộ có dữ liệu");
  await E("v29GopMo")([f]); await sleep(50); $("gtOk").click(); await sleep(100);
  ok(/Đã gộp 1 tệp: 0 điểm mới, 0 nhãn mới, 0 nhãn đổi/.test($("gtKQ").textContent) && /dữ liệu vẫn còn nguyên/.test($("gtKQ").textContent), "gộp lại cùng tệp: giải thích «0 mới» là dữ liệu đã có sẵn");
  $("gtpDong").click(); await sleep(10); ok(!$("dlgGopTep").open, "đóng hộp gộp");

  // ---------- 5. Tải tệp… một tệp tiến độ: bộ đang chọn trống thì chuyển, báo số điểm của trang
  E(`ST.bo = "trong"; buildSetSelect()`);
  await $("fileIn").onchange({target: {files: [{name: "laymau_tien_do_thu.json", text: async () => tep}], value: ""}}); await sleep(100);
  ok(E("ST.bo") === "lon" && /trang có \d+ điểm; đã chuyển sang bộ lon/.test($("msgs").textContent), "tải một tệp tiến độ: báo số điểm của trang, chuyển sang bộ có dữ liệu");

  // ---------- 6. tiếng Nga
  E("setLang('ru')"); await sleep(50);
  ok(E(`T("Trang hiện có {n} điểm trong {k} bộ: {ds}.", {n: 1, k: 1, ds: "x"})`) === "Сейчас на странице 1 точек в 1 наборах: x.", "dịch tiếng Nga các câu mới");
  E("setLang('vi')");
  ok(errs.length === 0, loiJS(errs));
  xong();
})();
