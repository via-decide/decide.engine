(function () {
  "use strict";

  /*
    Decide Engine Router
    - Supports real .html navigation
    - Supports pretty URLs (/slug/)
    - Preserves search + hash
    - Cloudflare Pages compatible
  */

  // ----------------------------
  // ROUTE MAP (REGISTER PAGES HERE)
  // ----------------------------
  var ROUTES = {
    alchemist: "alchemist.html",
    swipeos: "SwipeOS.html",
    brief: "brief.html",
    "decision-brief": "decision-brief.html",
    "brief-received": "brief-received.html", // ✅ FIX ADDED
    "student-research": "student-research.html",
    "engine-license": "engine-license.html",
    "engine-deals": "engine-deals.html",
    "cashback-claim": "cashback-claim.html",
    "cashback-rules": "cashback-rules.html",
    "ondc-demo": "ONDC-demo.html",
    "prompt-alchemy": "prompt-alchemy.html",
    contact: "contact.html"
  };

  // ----------------------------
  // HELPERS
  // ----------------------------

  function cleanPath(path) {
    if (!path) return "";
    path = path.replace(/^\/+/, "").replace(/\/+$/, "");
    path = path.replace(/\.html$/i, "");
    return path.toLowerCase();
  }

  function getCurrentSlug() {
    var path = window.location.pathname;
    if (!path || path === "/") return "";
    return cleanPath(path.split("/")[1]);
  }

  function buildUrl(slug, opts) {
    opts = opts || {};
    var file = ROUTES[slug];
    if (!file) return null;

    var url = file;

    if (opts.search) url += opts.search;
    if (opts.hash) url += opts.hash;

    return url;
  }

  function showRouteError(slug) {
    document.body.innerHTML = `
      <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0a0a0a;color:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;padding:24px;">
        <div style="max-width:720px;width:100%;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(16,16,16,.75);padding:20px;">
          <h1 style="margin:0 0 10px;">Page not found</h1>
          <p style="color:rgba(242,242,242,.7)">
            No subpage registered for:
            <strong>${slug}</strong>
          </p>
          <p style="color:rgba(242,242,242,.6);font-size:14px;margin-top:10px;">
            Add this to ROUTES:
          </p>
          <pre style="background:#111;padding:10px;border-radius:10px;color:#00e676;">
'${slug}': '${slug}.html'
          </pre>
          <a href="index.html" style="display:inline-block;margin-top:16px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.15);color:#f2f2f2;text-decoration:none;">
            ← Back to Home
          </a>
        </div>
      </div>
    `;
  }

  // ----------------------------
  // NAVIGATION
  // ----------------------------

  function go(slug, opts) {
    slug = cleanPath(slug);
    var url = buildUrl(slug, opts);
    if (!url) {
      showRouteError(slug);
      return;
    }

    if (opts && opts.newTab) {
      window.open(url, "_blank");
    } else {
      window.location.href = url;
    }
  }

  // ----------------------------
  // AUTO HANDLE DIRECT SLUG LOAD
  // ----------------------------

  document.addEventListener("DOMContentLoaded", function () {
    var slug = getCurrentSlug();

    if (!slug) return; // index

    if (!ROUTES[slug]) {
      showRouteError(slug);
      return;
    }

    // If visiting /slug directly (pretty URL)
    var file = ROUTES[slug];
    var search = window.location.search || "";
    var hash = window.location.hash || "";

    // Avoid redirect loop
    if (!window.location.pathname.endsWith(file)) {
      window.location.replace(file + search + hash);
    }
  });

  // ----------------------------
  // PUBLIC API
  // ----------------------------

  window.VDRouter = {
    go: go,
    routes: function () {
      return ROUTES;
    }
  };

})();
