// tiện ích chung cho các bài thử
const NM = process.env.NM || "/tmp/nt/node_modules";
let fail = 0;
const ok = (c, m) => { console.log((c ? "  ok  " : "  LỖI ") + m); if (!c) fail++; };
const xong = () => { console.log(fail ? `${fail} LỖI` : "TẤT CẢ ĐẠT"); process.exit(fail ? 1 : 0); };
module.exports = {NM, ok, xong};
