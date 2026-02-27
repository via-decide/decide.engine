(function () {
  "use strict";

  // ----------------------------
  // ROUTES MAP (ALL SUBPAGES)
  // slug -> html file (CASE-SENSITIVE filenames must match your repo)
  // ----------------------------
  var ROUTES = {
    // Core
    home: "index.html", // optional alias
    index: "index.html", // optional alias

    // Modules / pages (based on your site links)
    "student-research": "student-research.html",
    swipeos: "SwipeOS.html",
    brief: "brief.html",
    "decision-brief": "decision-brief.html",
    "brief-received": "brief-received.html",

    promptalchemy: "prompt-alchemy.html",   // alias
    "prompt-alchemy": "prompt-alchemy.html",

    alchemist: "alchemist.html",
    "ondc-demo": "ONDC-demo.html",

    "engine-license": "engine-license.html",
    "engine-deals": "engine-deals.html",
    "cashback-claim": "cashback-claim.html",
    "cashback-rules": "cashback-rules.html",

    contact: "contact.html"
  };

  // ----------------------------
  // Helpers
  // ----------------------------
  function stripSlashes(s) {
    return String(s || "").replace(/^\/+/, "").replace(/\/+$/, "");
  }

  function normalizeSlug(s) {
    s = stripSlashes(s);
    if (!s) return "";
    // remove .html
    s = s.replace(/\.html?$/i, "");
    // only first segment
    s = s.split("/")[0];
    return s.toLowerCase();
  }

  function isHtmlPathname(pathname) {
    return /\.html?$/i.test(String(pathname || ""));
  }

  function getSlugFromLocation() {
    var path = stripSlashes(window.location.pathname || "");
    if (!path) return ""; // root

    // If visiting /something.html, no slug routing needed
    if (isHtmlPathname(path)) return "";

    // If visiting /slug or /slug/ => slug = first segment
    return normalizeSlug(path);
  }

  function showRouteError(slug) {
    var safe = String(slug || "").replace(/[<>&"'`]/g, "");
    document.documentElement.style.background = "#0a0a0a";
    document.body.style.margin = "0";
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0a0a;color:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;">' +
        '<div style="max-width:820px;width:100%;border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(16,16,16,.78);box-shadow:0 18px 55px rgba(0,0,0,.55);padding:18px 18px 16px;">' +
          '<div style="font-size:28px;font-weight:900;letter-spacing:-.02em;margin:0 0 10px;color:#ff671f;">Page not found</div>' +
          '<div style="color:rgba(242,242,242,.72);font-size:14px;line-height:1.45;margin-bottom:12px;">No subpage registered for: <span style="color:#fff;font-weight:800;">' + safe + "</span></div>" +
          '<div style="color:rgba(242,242,242,.55);font-size:12px;margin-bottom:8px;">Add this route to <b>router.js</b>:</div>' +
          '<pre style="margin:0;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;color:#00e676;overflow:auto;">' +
"'" + safe + "': '" + safe + ".html'," +
          "</pre>" +
          '<a href="index.html" style="display:inline-flex;align-items:center;gap:10px;margin-top:14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);color:#f2f2f2;text-decoration:none;font-weight:900;">← Back to Home</a>' +
        "</div>" +
      "</div>";
  }

  function redirectToFile(file) {
    var search = window.location.search || "";
    var hash = window.location.hash || "";
    // Preserve query/hash
    window.location.replace(file + search + hash);
  }

  // ----------------------------
  // Public API
  // ----------------------------
  function go(slug, opts) {
    opts = opts || {};
    var s = normalizeSlug(slug);
    if (!s) return redirectToFile("index.html");

    var file = ROUTES[s];
    if (!file) return showRouteError(s);

    var url = file + (opts.search || "") + (opts.hash || "");
    if (opts.newTab) window.open(url, "_blank", "noopener");
    else window.location.href = url;
  }

  function routes() {
    return ROUTES;
  }

  // ----------------------------
  // Boot: recover redirect from 404 shim, then handle pretty URL slug
  // ----------------------------
  document.addEventListener("DOMContentLoaded", function () {
    // 1) Recover stored redirect from 404.html (GitHub Pages / fallback)
    try {
      var stored = sessionStorage.getItem("__vd_redirect__");
      if (stored) {
        sessionStorage.removeItem("__vd_redirect__");
        // If stored looks like /slug or /slug/?q=... => route it
        var tmp = String(stored);
        var tmpPath = tmp.split("?")[0].split("#")[0];
        var storedSlug = normalizeSlug(tmpPath);
        if (storedSlug && ROUTES[storedSlug]) {
          // keep original query/hash
          var q = tmp.includes("?") ? "?" + tmp.split("?")[1].split("#")[0] : "";
          var h = tmp.includes("#") ? "#" + tmp.split("#")[1] : "";
          go(storedSlug, { newTab: false, search: q, hash: h });
          return;
        }
      }
    } catch (e) {}

    // 2) Handle direct visit to /slug or /slug/
    var slug = getSlugFromLocation();
    if (!slug) return;

    var file = ROUTES[slug];
    if (!file) return showRouteError(slug);

    // Redirect /slug -> file.html
    redirectToFile(file);
  });

  window.VDRouter = { go: go, routes: routes };
})();
