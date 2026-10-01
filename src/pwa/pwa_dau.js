/* Bản 2.9.1: cài như ứng dụng (PWA). Chạy sớm trong <head>, không phụ thuộc thư viện bản đồ: đăng ký service worker,
   giữ sự kiện "beforeinstallprompt" để nút "Cài ứng dụng" gọi được hộp cài của trình duyệt, báo khi có bản mới. */
(function () {
  var P = window.PWA = {hoan: null, daCai: false, sw: null, moi: null, standalone: false, nen: "desktop", coTheCai: false, yeuCauTai: false, ve: null};
  try { P.standalone = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: minimal-ui)").matches || navigator.standalone === true; } catch (e) { /* trình duyệt cũ */ }
  var ua = navigator.userAgent || "";
  P.nen = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(ua) ? "android" : /Macintosh/.test(ua) ? "mac" : "desktop";
  P.coTheCai = location.protocol === "https:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); P.hoan = e; if (P.ve) P.ve(); });
  window.addEventListener("appinstalled", function () { P.hoan = null; P.daCai = true; if (P.ve) P.ve(); });
  if ("serviceWorker" in navigator && P.coTheCai) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        P.sw = reg;
        var bao = function (w) { P.moi = w; if (P.ve) P.ve(); };
        if (reg.waiting && navigator.serviceWorker.controller) bao(reg.waiting);
        reg.addEventListener("updatefound", function () {
          var w = reg.installing; if (!w) return;
          w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) bao(w); });
        });
      }).catch(function () { /* không đăng ký được: trang vẫn chạy như web thường */ });
      var dangTai = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () { if (P.yeuCauTai && !dangTai) { dangTai = true; location.reload(); } });
    });
  }
})();
