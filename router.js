
/**
 * ═══════════════════════════════════════════════════════════
 *  viadecide.com — UNIVERSAL ROUTER  v2.1 (Insta-safe + GH Pages-safe)
 *  File: router.js
 *
 *  ✅ Works on:
 *   - Custom domains (viadecide.com)
 *   - GitHub Pages repo subpaths (username.github.io/repo/)
 *   - Instagram / Facebook in-app browsers (no dead clicks)
 *
 *  DROP-IN:
 *    <script src="./router.js"></script>
 *  Put it in <head> BEFORE anything else.
 *
 *  HOW TO ADD A NEW SUBPAGE:
 *    1) Add file (my-tool.html OR my-tool/index.html)
 *    2) Add one line to ROUTES:
 *       'my-tool': 'my-tool.html',
 *
 *  URL PATTERNS SUPPORTED:
 *    /my-tool/          → loads my-tool.html (or my-tool/index.html)
 *    /my-tool           → same (trailing slash optional)
 *    /my-tool?foo=bar   → preserves query
 *    /my-tool#section   → preserves hash
 * ═══════════════════════════════════════════════════════════
 */

(function ViaDecideRouter() {
  "use strict";

  // ─────────────────────────────────────────────────────────
  //  ROUTE MAP
  //  key   = URL slug (what appears in the browser address bar)
  //  value = actual file path in your site root (or repo root on GH Pages)
  // ─────────────────────────────────────────────────────────
  var ROUTES = {
    // Core tools
    alchemist: "alchemist.html",
    swipeos: "swipeos/index.html",
    "engine-deals": "engine-deals.html",
    "cashback-claim": "cashback-claim.html",
    "cashback-rules": "cashback-rules.html",
    "engine-license": "engine-license.html",
    "ondc-demo": "ONDC-demo.html",
    promptalchemy: "PromptAlchemy.html",
    "student-research": "StudentResearch.html",
    contact: "contact.html",
    brief: "brief.html",
    "decision-brief": "decision-brief.html",

    // ── ADD NEW SUBPAGES BELOW THIS LINE ──────────────────
    // 'my-new-tool':   'my-new-tool.html',
    // 'policy':        'policy/index.html',
    // 'dashboard':     'dashboard.html',
  };

  // ─────────────────────────────────────────────────────────
  //  ALIAS MAP  (old URLs → new slugs, for backwards compat)
  // ─────────────────────────────────────────────────────────
  var ALIASES = {
    SwipeOS: "swipeos",
    "swipeos?": "swipeos",
    PromptAlchemy: "promptalchemy",
    StudentResearch: "student-research",
    "ONDC-demo": "ondc-demo",
    ondc: "ondc-demo",
  };

  // ─────────────────────────────────────────────────────────
  //  ENV DETECTION
  // ─────────────────────────────────────────────────────────
  function isInAppBrowser() {
    var ua = navigator.userAgent || "";
    return /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|Snapchat/i.test(ua);
  }

  // ─────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────
  function normalizeSlug(raw) {
    return String(raw || "")
      .replace(/^\/+/, "") // leading slashes
      .replace(/\/+$/, "") // trailing slashes
      .replace(/\.html?$/i, "") // .html / .htm
      .trim()
      .toLowerCase()
      .split("/")[0]; // first segment only
  }

  function resolveRoute(slug) {
    if (!slug) return null;

    // 1) Direct match
    if (ROUTES[slug]) return ROUTES[slug];

    // 2) Alias match
    var aliasTarget = ALIASES[slug] || ALIASES[String(slug).toLowerCase()];
    if (aliasTarget && ROUTES[aliasTarget]) return ROUTES[aliasTarget];

    // 3) Case-insensitive match
    var lower = String(slug).toLowerCase();
    for (var key in ROUTES) {
      if (Object.prototype.hasOwnProperty.call(ROUTES, key)) {
        if (String(key).toLowerCase() === lower) return ROUTES[key];
      }
    }
    return null;
  }

  // ✅ Detect base path automatically (important for GitHub Pages repo sites)
  // Examples:
  //   Custom domain:  https://viadecide.com/      -> basePath "/"
  //   GH Pages repo:  https://user.github.io/repo -> basePath "/repo/"
  function getBasePath() {
    var host = window.location.host || "";
    var path = window.location.pathname || "/";

    // If GitHub Pages (username.github.io), the first path segment is usually repo name
    if (/github\.io$/i.test(host)) {
      var seg = path.replace(/^\/+/, "").split("/")[0];
      if (seg) return "/" + seg + "/";
    }

    // Custom domain or normal hosting
    return "/";
  }

  function origin() {
    // location.origin not supported in some older browsers
    return window.location.protocol + "//" + window.location.host;
  }

  function joinURL(basePath, filePath) {
    // basePath always ends with "/"
    // filePath may include folders
    return basePath.replace(/\/+$/, "/") + String(filePath || "").replace(/^\/+/, "");
  }

  function parsePathParts(fullPath) {
    // returns { path, search, hash }
    var m = String(fullPath || "/").match(/^([^?#]*)(\?[^#]*)?(#.*)?$/) || [];
    return { path: m[1] || "/", search: m[2] || "", hash: m[3] || "" };
  }

  function safeReplace(url) {
    try {
      window.location.replace(url);
    } catch (e) {
      window.location.href = url;
    }
  }

  function navigateTo(filePath, search, hash) {
    var base = getBasePath();
    var url = origin() + joinURL(base, filePath) + (search || "") + (hash || "");
    safeReplace(url);
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 0: If user is currently on /slug/ (pretty URL),
  //  we want to redirect to the mapped file quickly.
  //  BUT: Avoid interfering with root index or real .html files.
  // ─────────────────────────────────────────────────────────
  (function handlePrettyURL() {
    var base = getBasePath();
    var pathname = window.location.pathname || "/";
    // Remove base path prefix if present
    if (base !== "/" && pathname.indexOf(base) === 0) pathname = pathname.slice(base.length - 1);

    // e.g. "/", "/index.html" -> do nothing
    var clean = pathname.replace(/^\/+/, "");
    if (!clean || clean === "index.html" || clean === "index.htm") return;

    // If it already looks like a real file path (.html etc), do nothing
    if (/\.(html?|js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml)$/i.test(clean)) return;

    // If it's like "/alchemist/" or "/alchemist"
    var slug = normalizeSlug(clean);
    var file = resolveRoute(slug);
    if (!file) return;

    // Preserve query/hash
    navigateTo(file, window.location.search || "", window.location.hash || "");
  })();

  // ─────────────────────────────────────────────────────────
  //  STEP 1: Check for a stored redirect from 404.html
  // ─────────────────────────────────────────────────────────
  var stored = null;
  try {
    stored = sessionStorage.getItem("__vd_redirect__");
  } catch (e) {}

  if (stored) {
    try {
      sessionStorage.removeItem("__vd_redirect__");
    } catch (e) {}

    var parts = parsePathParts(stored);
    var path = parts.path || "/";
    var search = parts.search || "";
    var hash = parts.hash || "";

    var rawSlug = path.replace(/^\//, "").split("/")[0];

    if (rawSlug) {
      var slug = normalizeSlug(rawSlug);
      var file = resolveRoute(slug);

      if (file) {
        navigateTo(file, search, hash);
        return;
      } else {
        renderNotFound(rawSlug);
        return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 2: Hash routing (supports /#/alchemist or /#alchemist)
  //  Skip #p=... project payloads.
  // ─────────────────────────────────────────────────────────
  var currentHash = window.location.hash || "";
  if (currentHash) {
    var hashPath = currentHash.replace(/^#\/?/, "");
    if (hashPath && !/^p=/.test(hashPath) && hashPath.length < 80) {
      var hashSlug = normalizeSlug(hashPath.split("?")[0]);
      var hashFile = resolveRoute(hashSlug);
      if (hashFile) {
        navigateTo(hashFile, "", "");
        return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 3: Expose global router for UI buttons
  // ─────────────────────────────────────────────────────────
  window.VDRouter = {
    /**
     * Navigate to a subpage by slug.
     * Usage:
     *   VDRouter.go('alchemist')
     *   VDRouter.go('alchemist', { newTab:true })
     */
    go: function (slug, options) {
      options = options || {};
      var norm = normalizeSlug(slug);
      var file = resolveRoute(norm);

      if (!file) {
        console.warn("[VDRouter] Unknown route:", slug);
        // Fall back to pretty URL if unknown
        var fallback = origin() + joinURL(getBasePath(), norm + "/");
        if (options.newTab && !isInAppBrowser()) window.open(fallback, "_blank", "noopener,noreferrer");
        else safeReplace(fallback);
        return;
      }

      // Instagram/FB often blocks new tabs => force same-tab when in-app
      var wantNewTab = !!options.newTab && !isInAppBrowser();

      var url = origin() + joinURL(getBasePath(), file) + (options.search || "") + (options.hash || "");
      if (wantNewTab) window.open(url, "_blank", "noopener,noreferrer");
      else safeReplace(url);
    },

    /**
     * Get a nice pretty URL for use in href attributes:
     *   VDRouter.url('alchemist') -> '/alchemist/'
     */
    url: function (slug) {
      var norm = normalizeSlug(slug);
      return joinURL(getBasePath(), norm + "/");
    },

    /**
     * Get all registered routes (copy)
     */
    routes: function () {
      var out = {};
      for (var k in ROUTES) if (Object.prototype.hasOwnProperty.call(ROUTES, k)) out[k] = ROUTES[k];
      return out;
    },

    /**
     * Register new route dynamically
     */
    register: function (slug, file) {
      ROUTES[normalizeSlug(slug)] = String(file || "");
    },

    /**
     * Insta-safe link binding:
     * - Intercepts <a class="subpage-card" href="/slug/"> clicks
     * - Uses router to open in SAME TAB (reliable in in-app browsers)
     */
    bindLinks: function (selector) {
      var sel = selector || "a.subpage-card";
      document.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest(sel) : null;
        if (!a) return;

        var href = a.getAttribute("href") || "";
        if (!href || href.indexOf("/") !== 0) return;

        // Only intercept internal pretty URLs like "/alchemist/"
        var slug = normalizeSlug(href);
        if (!slug) return;

        var file = resolveRoute(slug);
        if (!file) return; // let browser handle unknown

        e.preventDefault();
        // Always same-tab for reliability
        window.VDRouter.go(slug, { newTab: false });
      });
    },
  };

  // Auto-bind common UI link pattern (safe even if no links exist yet)
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.VDRouter.bindLinks("a.subpage-card");
      });
    } else {
      window.VDRouter.bindLinks("a.subpage-card");
    }
  } catch (e) {}

  // ─────────────────────────────────────────────────────────
  //  INLINE 404 PAGE (renders if no route matches)
  // ─────────────────────────────────────────────────────────
  function renderNotFound(slug) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.style.cssText =
        "margin:0;background:#04080f;color:#e8edf5;font-family:Syne,system-ui,-apple-system,sans-serif;" +
        "display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;" +
        "text-align:center;padding:20px";
      document.body.innerHTML = [
        '<div style="font-size:4rem;margin-bottom:8px">🧭</div>',
        '<h1 style="font-size:2rem;color:#FF9933;margin:0;letter-spacing:-.03em">Page not found</h1>',
        '<p style="color:#7a90a8;margin:0;font-size:.95rem">No subpage registered for: <code style="color:#FF9933;background:rgba(255,153,51,.1);padding:2px 8px;border-radius:6px">' +
          String(slug) +
          "</code></p>",
        '<p style="color:#7a90a8;font-size:.82rem;max-width:520px;line-height:1.6;margin:0">To add this route, open <code>router.js</code> and add one line to the ROUTES map:</p>',
        '<div style="font-family:Space Mono,monospace;font-size:.78rem;color:#00d68f;background:rgba(0,214,143,.08);border:1px solid rgba(0,214,143,.25);padding:10px 12px;border-radius:12px;max-width:620px;word-break:break-all;">' +
          "'" +
          String(slug).toLowerCase() +
          "': '" +
          String(slug).toLowerCase() +
          ".html'" +
          "</div>",
        '<a href="' +
          joinURL(getBasePath(), "") +
          '" style="margin-top:8px;background:rgba(255,153,51,.15);border:1px solid rgba(255,153,51,.4);color:#FF9933;padding:12px 28px;border-radius:999px;text-decoration:none;font-family:Space Mono,monospace;font-size:.75rem;letter-spacing:1.5px">← Back to Home</a>',
      ].join("");
    });
  }
})();
