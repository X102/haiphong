// Bản 3.19.1: xuất điểm mẫu theo từng bộ: danh sách bộ trong hộp Xuất (mặc định bộ đang làm), mỗi bộ một tệp (một bộ: tải thẳng; nhiều
// bộ: một ZIP) hoặc gộp; cột năm theo năm của bộ; chỉ điểm có nhãn; CSV dài đủ cột (nguồn ảnh mẫu...); Shapefile từng bộ đọc lại bằng
// geopandas; tệp tiến độ của bộ nhập lại được; nút ⤓ cạnh ô chọn bộ; tiếng Nga.
const fs = require("fs"), {execSync} = require("child_process");
const {ok, xong} = require("./kiemtra"), {moTrang, loiJS} = require("./trang");
(async () => {
  const {w, $, E, sleep, until, errs, blobs, docBlob} = moTrang({geoman: true});
  await until(() => E("MAN") && Object.keys(E("ST.diem")).length === 4, 8000, "manifest");
  const abBlob = b => new Promise(res => { const fr = new w.FileReader(); fr.onload = () => res(Buffer.from(fr.result)); fr.readAsArrayBuffer(b); });
  const zipDS = async b => { fs.writeFileSync("/tmp/fx/xm.zip", await abBlob(b));
    return JSON.parse(execSync(`python3 -c "import zipfile, json; z = zipfile.ZipFile('/tmp/fx/xm.zip'); print(json.dumps({n: z.read(n).decode('utf-8', 'replace') for n in z.namelist()}, ensure_ascii=False))"`).toString()); };
  const csv = t => E("CORE.parseCSV")(t.replace(/^﻿/, ""));

  // ---------- 1. hai bộ tự tạo: A (2023, 2025; 3 điểm, 2 có nhãn, một điểm có nguồn ảnh mẫu), B (2024; 2 điểm, 1 có nhãn, nhãn lạc năm 2019)
  E(`taoBoTuDiem("Bộ A thử", [2023, 2025], [{lon: 106.68, lat: 20.86, nhan: {2023: "X1", 2025: "T1"}}, {lon: 106.681, lat: 20.861, nhan: {2025: "X1"}}, {lon: 106.682, lat: 20.862}], {})`);
  const A = E("ST.bo"); E(`(() => { const p = Object.values(ST.diem).find(q => q.bo === "${A}" && q.nhan[2023]); p.sv = {nguon: "streetview", kieu: "pano", ngay: "2024-05-01", kc: 12.5}; p.ghi_chu = "Ghi chú: Đông, Тест"; })()`);
  E(`taoBoTuDiem("Bộ B thử", [2024], [{lon: 106.69, lat: 20.87, nhan: {2024: "T1", 2019: "X1"}}, {lon: 106.691, lat: 20.871}], {})`);
  const B = E("ST.bo"); E(`ST.bo = "${A}"; buildSetSelect(); render()`); await sleep(30);

  // ---------- 2. hộp Xuất: danh sách bộ, mặc định bộ đang làm
  ok(!!$("bBoXuat"), "nút ⤓ xuất nhanh cạnh ô chọn bộ");
  $("bExport").click(); await sleep(30);
  const ds = E(`[...$("xmBo").querySelectorAll("label")].map(l => l.textContent.replace(/\\s+/g, " ").trim() + (l.querySelector("input").checked ? " [x]" : ""))`);
  ok($("dlgExp").open && ds.length === 3 && ds.some(t => /^Bộ A thử ?3 điểm · 2 có nhãn · 2023, 2025 \[x\]$/.test(t)) && ds.some(t => /^Bộ B thử ?2 điểm · 1 có nhãn · 2019, 2024$/.test(t)),
     "danh sách bộ: số điểm, số có nhãn, các năm; mặc định chọn bộ đang làm: " + ds.join(" | "));
  ok(/1 bộ, 3 điểm sẽ xuất/.test($("xmDem").textContent), "đếm: " + $("xmDem").textContent);

  // ---------- 3. một bộ: tải thẳng CSV dài, chỉ điểm của bộ, năm của bộ, đủ cột
  let nb = blobs.length; $("eLong").click(); await sleep(30);
  let L = csv(await docBlob(blobs[nb]));
  ok(blobs.length === nb + 1 && blobs[nb].type === "text/csv" && /đã xuất laymau_dai_Bo_A_thu_\d{4}-\d{2}-\d{2}_\d{4}\.csv: 1 bộ, 3 điểm/.test($("xmTT").textContent) && L.length === 3 && L.every(r => r.bo_diem === A),
     `một bộ: tải thẳng (${$("xmTT").textContent}), 3 dòng (điểm × năm có nhãn) chỉ của bộ A`);
  const r0 = L.find(r => r.nam === "2023");
  ok(r0 && r0.ten_bo === "Bộ A thử" && r0.nguon_mau === "streetview:pano" && r0.ngay_anh_mau === "2024-05-01" && r0.kc_may_anh_m === "12.5" && r0.ghi_chu === "Ghi chú: Đông, Тест",
     "CSV dài có tên bộ và các cột trước đây bị bỏ sót (nguồn ảnh mẫu, ngày ảnh, khoảng cách máy ảnh)");
  nb = blobs.length; $("eWide").click(); await sleep(30);
  const W = csv(await docBlob(blobs[nb])), cot = Object.keys(W[0]);
  ok(W.length === 3 && cot.includes("ma_2023") && cot.includes("ma_2025") && !cot.includes("ma_2024") && !cot.includes("ma_2017"), "CSV rộng: cột năm theo năm của bộ (2023, 2025)");

  // ---------- 4. hai bộ, mỗi bộ một tệp: một ZIP, mỗi CSV chỉ một bộ với năm của bộ đó
  $("xmTatCa").click(); $("xmBo").querySelectorAll("input").forEach(i => { i.checked = i.value === A || i.value === B; }); $("xmBo").dispatchEvent(new w.Event("change"));
  ok(/2 bộ, 5 điểm sẽ xuất · 2 tệp trong một ZIP/.test($("xmDem").textContent), "đếm: " + $("xmDem").textContent);
  nb = blobs.length; $("eWide").click(); await sleep(50);
  let Z = await zipDS(blobs[nb]); let ten = Object.keys(Z).sort();
  const ZA = csv(Z[ten.find(n => /Bo_A/.test(n))]), ZB = csv(Z[ten.find(n => /Bo_B/.test(n))]);
  ok(blobs[nb].type === "application/zip" && /laymau_rong_2_bo_.*\.zip/.test($("xmTT").textContent) && ten.length === 2 && ten.every(n => /^laymau_rong_Bo_[AB]_thu\.csv$/.test(n)),
     "mỗi bộ một tệp: ZIP gồm " + ten.join(", "));
  ok(ZA.length === 3 && ZA.every(r => r.bo_diem === A) && ZB.length === 2 && ZB.every(r => r.bo_diem === B) && "ma_2019" in ZB[0] && "ma_2024" in ZB[0] && !("ma_2023" in ZB[0]) && ZB.find(r => r.ma_2019 === "X1"),
     "mỗi tệp chỉ có điểm của một bộ; bộ B có cột 2024 và cả năm 2019 đã có nhãn (không mất nhãn lạc năm)");

  // ---------- 5. gộp vào một tệp; chỉ điểm có nhãn
  w.document.querySelector('#dlgExp input[name="xmCach"][value="gop"]').click(); $("xmNhan").checked = true; $("xmNhan").onchange();
  ok(/2 bộ, 3 điểm sẽ xuất · gộp vào một tệp/.test($("xmDem").textContent), "đếm khi gộp, chỉ điểm có nhãn: " + $("xmDem").textContent);
  nb = blobs.length; $("eGeo").click(); await sleep(30);
  const G = JSON.parse(await docBlob(blobs[nb]));
  ok(G.features.length === 3 && new Set(G.features.map(f => f.properties.bo_diem)).size === 2 && G.features.every(f => f.properties.ten_bo) && "ma_2024" in G.features[0].properties && "ma_2023" in G.features[0].properties,
     "gộp: một GeoJSON 3 điểm có nhãn của 2 bộ, cột năm là hợp các năm, có tên bộ");

  // ---------- 6. Shapefile từng bộ trong một ZIP, đọc lại bằng geopandas
  w.document.querySelector('#dlgExp input[name="xmCach"][value="rieng"]').click(); $("xmNhan").checked = false; $("xmNhan").onchange();
  nb = blobs.length; $("eShp").click(); await sleep(80);
  fs.writeFileSync("/tmp/fx/xm_shp.zip", await abBlob(blobs[nb]));
  const py = JSON.parse(execSync(`python3 -c "
import geopandas as gpd, zipfile, json
z = zipfile.ZipFile('/tmp/fx/xm_shp.zip'); shp = sorted(n for n in z.namelist() if n.endswith('.shp')); o = {'tep': sorted(z.namelist())}
for n in shp:
    g = gpd.read_file('zip:///tmp/fx/xm_shp.zip!' + n); o[n] = {'n': len(g), 'crs': g.crs.to_epsg(), 'bo': sorted(set(g['bo_diem'])), 'cot': [c for c in g.columns if c.startswith('ma_')], 'ghi': [x for x in g['ghi_chu'] if x]}
print(json.dumps(o, ensure_ascii=False))"`).toString());
  const sA = py["diem_mau_Bo_A_thu.shp"], sB = py["diem_mau_Bo_B_thu.shp"];
  ok(py.tep.length === 10 && sA && sB && sA.n === 3 && sB.n === 2 && sA.crs === 4326 && sA.bo.length === 1 && sB.bo.length === 1 && sA.cot.join() === "ma_2023,ma_2025" && sB.cot.join() === "ma_2019,ma_2024" && sA.ghi[0] === "Ghi chú: Đông, Тест",
     "Shapefile: mỗi bộ một bộ 5 tệp trong ZIP, đọc lại bằng geopandas (WGS 84, đúng số điểm, cột năm của bộ, chữ UTF-8)");

  // ---------- 7. tệp tiến độ của bộ: chỉ bộ đó, nhập lại được
  $("xmBo").querySelectorAll("input").forEach(i => { i.checked = i.value === B; }); $("xmBo").dispatchEvent(new w.Event("change"));
  nb = blobs.length; $("eBoJson").click(); await sleep(30);
  const J = await docBlob(blobs[nb]), j = JSON.parse(J);
  ok(j.loai === "laymau_hp" && Object.keys(j.st.diem).length === 2 && Object.values(j.st.diem).every(p => p.bo === B) && j.st.bo_cfg[B] && !j.st.bo_cfg[A] && !j.phien,
     "tệp tiến độ của bộ B: 2 điểm, cấu hình bộ (các năm), không kèm phiên làm việc");
  E(`Object.keys(ST.diem).filter(k => ST.diem[k].bo === "${B}").forEach(k => delete ST.diem[k]); delete ST.bo_cfg["${B}"]`);
  await $("fileIn").onchange({target: {files: [{name: "laymau_tien_do_Bo_B_thu.json", text: async () => J}], value: ""}}); await sleep(100);
  ok(E(`Object.values(ST.diem).filter(p => p.bo === "${B}").length`) === 2 && E(`ST.bo_cfg["${B}"].nam.join()`) === "2024" && E(`Object.values(ST.diem).find(p => p.bo === "${B}" && p.nhan[2024]).nhan[2024]`) === "T1",
     "nhập lại tệp tiến độ của bộ bằng Tải tệp…: đủ điểm, nhãn, các năm cần gán");

  // ---------- 8. nút ⤓ chọn sẵn bộ đang làm; nhớ lựa chọn; báo lỗi khi không chọn bộ
  $("eClose").click(); E(`ST.bo = "${A}"`); $("bBoXuat").click(); await sleep(20);
  ok($("dlgExp").open && E(`[...$("xmBo").querySelectorAll("input:checked")].map(i => i.value).join()`) === A, "nút ⤓: mở hộp, chỉ chọn bộ đang làm");
  $("xmBoChon").click(); ok($("eLong").disabled && /chưa chọn bộ nào/.test($("xmDem").textContent), "bỏ chọn hết: nút xuất tắt");
  $("xmBoDang").click(); ok(!$("eLong").disabled && JSON.parse(w.localStorage.getItem("laymau_hp_xm_v1")).bo.join() === A, "nút «Bộ đang làm», lựa chọn được nhớ");

  // ---------- 9. tiếng Nga
  E("setLang('ru')"); await sleep(50);
  ok(/Эталонные точки по наборам/.test($("dlgExp").textContent) && /каждый набор отдельным файлом/.test($("dlgExp").textContent) && /точек · \d+ с метками/.test($("xmBo").textContent) && /Файл прогресса набора/.test($("eBoJson").textContent),
     "tiếng Nga: hộp Xuất theo bộ");
  const miss = E("[...T_MISS]").filter(x => /bộ|tệp|điểm|xuất/i.test(x));
  ok(miss.length === 0, "không sót khoá dịch mới" + (miss.length ? ": " + miss.slice(0, 6).join(" | ") : ""));
  E("setLang('vi')"); await sleep(30); $("eClose").click();
  ok(!errs.length, loiJS(errs)); xong();
})().catch(e => { console.error("LỖI", e); process.exit(2); });
