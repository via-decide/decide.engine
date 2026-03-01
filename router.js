/**
 * ═══════════════════════════════════════════════════════════
 * viadecide.com — UNIVERSAL ROUTER v2.2 (Nav-safe everywhere)
 * File: router.js
 *
 * ✅ Works on:
 * - Custom domains (viadecide.com)
 * - GitHub Pages repo subpaths (username.github.io/repo/)
 * - Nested subpages (e.g., /swipeos/index.html)
 * - Instagram / Facebook in-app browsers (no dead clicks)
 *
 * DROP-IN:
 * - Include BEFORE anything else on every page (including subpages).
 *
 * HOW TO ADD A NEW SUBPAGE:
 * 1) Add file (my-tool.html OR my-tool/index.html)
 * 2) Add one line to ROUTES:
 *    'my-tool': 'my-tool.html',
 *
 * URL PATTERNS SUPPORTED:
 * /my-tool/ → loads my-tool.html (or my-tool/index.html)
 * /my-tool → same (trailing slash optional)
 * /my-tool?foo=bar → preserves query
 * /my-tool#section → preserves hash
 * ═══════════════════════════════════════════════════════════
 */
(function ViaDecideRouter() {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // ROUTE MAP
  // key = URL slug (what appears in the browser address bar)
  // value = actual file path in your site root (or repo root on GH Pages)
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
    // "my-new-tool": "my-new-tool.html",
    // "policy": "policy/index.html",
    // "dashboard": "dashboard.html",
  };

  // ─────────────────────────────────────────────────────────
  // ALIAS MAP (old URLs → new slugs, for backwards compat)
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
  // ENV DETECTION
  // ─────────────────────────────────────────────────────────
  function isInAppBrowser() {
    var ua = navigator.userAgent || "";
    return /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|Snapchat/i.test(ua);
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  function normalizeSlug(raw) {
    return String(raw || "")
      .replace(/^\/+/, "") // leading slashes
      .replace(/\/+$/, "") // trailing slashes
      .replace(/^\.\//, "") // leading ./
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
  // Custom domain: https://viadecide.com/ -> basePath "/"
  // GH Pages repo: https://user.github.io/repo -> basePath "/repo/"
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
    return {
      path: m[1] || "/",
      search: m[2] || "",
      hash: m[3] || "",
    };
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

  function isLikelyExternalHref(href) {
    if (!href) return true;
    // schemes + special
    if (/^(https?:)?\/\//i.test(href)) return true;
    if (/^(mailto:|tel:|sms:|javascript:|data:)/i.test(href)) return true;
    return false;
  }

  function isAssetHref(href) {
    // Avoid rewriting assets if they appear in nav (icons, css, js, images)
    return /\.(js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf)$/i.test(
      href || ""
    );
  }

  function hrefToSameOriginURL(href) {
    try {
      return new URL(href, window.location.href);
    } catch (e) {
      return null;
    }
  }

  function stripBasePrefix(pathname, basePath) {
    // basePath ends with "/"
    if (basePath !== "/" && pathname.indexOf(basePath) === 0) {
      // Keep leading "/" in result
      return pathname.slice(basePath.length - 1);
    }
    return pathname;
  }

  // ─────────────────────────────────────────────────────────
  // STEP 0: If user is currently on /slug/ (pretty URL),
  // redirect to the mapped file quickly.
  // Avoid interfering with root index or real files.
  // ─────────────────────────────────────────────────────────
  (function handlePrettyURL() {
    var base = getBasePath();
    var pathname = window.location.pathname || "/";

    // Remove base path prefix if present
    pathname = stripBasePrefix(pathname, base);

    // "/", "/index.html" -> do nothing
    var clean = pathname.replace(/^\/+/, "");
    if (!clean || clean === "index.html" || clean === "index.htm") return;

    // If it already looks like a real file path (.html etc), do nothing
    if (/\.(html?|js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf)$/i.test(clean))
      return;

    // If it's like "/alchemist/" or "/alchemist"
    var slug = normalizeSlug(clean);
    var file = resolveRoute(slug);
    if (!file) return;

    // Preserve query/hash
    navigateTo(file, window.location.search || "", window.location.hash || "");
  })();

  // ─────────────────────────────────────────────────────────
  // STEP 1: Check for a stored redirect from 404.html
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
  // STEP 2: Hash routing (supports /#/alchemist or /#alchemist)
  // Skip #p=... project payloads.
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
  // STEP 3: Global router API (public)
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

    /** Get all registered routes (copy) */
    routes: function () {
      var out = {};
      for (var k in ROUTES) if (Object.prototype.hasOwnProperty.call(ROUTES, k)) out[k] = ROUTES[k];
      return out;
    },

    /** Register new route dynamically */
    register: function (slug, file) {
      ROUTES[normalizeSlug(slug)] = String(file || "");
    },

    /**
     * Insta-safe + nested-page-safe link binding:
     * - Intercepts internal navigation links in nav/header/footer and "subpage cards"
     * - Ensures links work from nested pages like /swipeos/index.html
     */
    bindLinks: function (selector) {
      var sel = selector || "a.subpage-card, nav a, header a, footer a, a[data-vd-route]";
      document.addEventListener(
        "click",
        function (e) {
          // Only left-click / primary activation
          if (e.defaultPrevented) return;
          if (e.button && e.button !== 0) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

          var a = e.target && e.target.closest ? e.target.closest(sel) : null;
          if (!a) return;

          // respect explicit new tab intent
          var target = (a.getAttribute("target") || "").toLowerCase();
          if (target === "_blank") return;

          var hrefAttr = a.getAttribute("href") || "";
          if (!hrefAttr) return;
          if (isLikelyExternalHref(hrefAttr)) return;
          if (hrefAttr.charAt(0) === "#") return;

          // If it's an asset, don't intercept
          if (isAssetHref(hrefAttr)) return;

          var url = hrefToSameOriginURL(hrefAttr);
          if (!url) return;
          if (url.origin !== window.location.origin) return;

          var base = getBasePath();
          var path = stripBasePrefix(url.pathname || "/", base);

          // Normalize path cases:
          // - "/pricing.html" => pricing.html
          // - "pricing.html" (relative from nested) becomes "/swipeos/pricing.html" in url.pathname
          //   -> we want "pricing.html" at root, not under /swipeos/
          var clean = String(path || "/").replace(/^\/+/, "");

          // If nested like "swipeos/pricing.html", but it's not an actual folder route we want,
          // treat last segment as intended target for site nav.
          // This specifically fixes subpages with relative nav links.
          if (clean.indexOf("/") !== -1) {
            var segs = clean.split("/").filter(Boolean);
            var last = segs[segs.length - 1] || "";
            // If last looks like a page route, prefer it
            if (last && (/\.(html?)$/i.test(last) || !/\./.test(last))) {
              clean = last;
            }
          }

          // Handle explicit .html -> navigate directly to that file at site root
          if (/\.html?$/i.test(clean)) {
            e.preventDefault();
            navigateTo(clean, url.search || "", url.hash || "");
            return;
          }

          // Handle pretty URLs "/alchemist/" etc
          var slug = normalizeSlug(clean);
          if (!slug) return;

          var file = resolveRoute(slug);
          if (!file) {
            // Unknown slug: allow browser default navigation to the pretty URL at base
            // but make it base-safe (no nested)
            e.preventDefault();
            safeReplace(origin() + joinURL(base, slug + "/") + (url.search || "") + (url.hash || ""));
            return;
          }

          e.preventDefault();
          window.VDRouter.go(slug, { newTab: false, search: url.search || "", hash: url.hash || "" });
        },
        true
      );
    },
  };

  // ─────────────────────────────────────────────────────────
  // STEP 4: NAV FIX — rewrite relative nav hrefs so they work
  // from nested paths like /swipeos/index.html
  // ─────────────────────────────────────────────────────────
  function fixNavHrefs() {
    var base = getBasePath();
    var scopeSelectors = ["nav a[href]", "header a[href]", "footer a[href]"];
    var nodes = [];
    for (var i = 0; i < scopeSelectors.length; i++) {
      try {
        var list = document.querySelectorAll(scopeSelectors[i]);
        for (var j = 0; j < list.length; j++) nodes.push(list[j]);
      } catch (e) {}
    }

    for (var k = 0; k < nodes.length; k++) {
      var a = nodes[k];
      var href = a.getAttribute("href") || "";
      if (!href) continue;

      // Leave external, anchors, special schemes untouched
      if (href.charAt(0) === "#") continue;
      if (isLikelyExternalHref(href)) continue;

      // Leave absolute-root links untouched (already safe)
      if (href.charAt(0) === "/") continue;

      // Leave assets untouched
      if (isAssetHref(href)) continue;

      // Split into path/search/hash and normalize to site root
      var parts = parsePathParts(href);
      var p = parts.path || "";
      var s = parts.search || "";
      var h = parts.hash || "";

      // If relative path contains folders, keep only last segment for site navigation
      // (prevents /swipeos/pricing.html kinds of resolutions)
      p = p.replace(/^\.\//, "");
      if (p.indexOf("/") !== -1) {
        var segs = p.split("/").filter(Boolean);
        p = segs[segs.length - 1] || p;
      }

      // If it's a plain word (e.g., "pricing"), convert to pretty URL at base
      if (p && !/\./.test(p)) {
        a.setAttribute("href", joinURL(base, normalizeSlug(p) + "/") + s + h);
        continue;
      }

      // If it looks like a page file, pin it to site root base
      if (/\.html?$/i.test(p)) {
        a.setAttribute("href", joinURL(base, p.replace(/^\/+/, "")) + s + h);
        continue;
      }

      // Otherwise, leave it as-is
    }
  }

  // Auto-bind common UI link patterns + fix nav hrefs
  try {
    var bindNow = function () {
      try {
        fixNavHrefs();
      } catch (e) {}
      try {
        window.VDRouter.bindLinks("a.subpage-card, nav a, header a, footer a, a[data-vd-route]");
      } catch (e) {}
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindNow);
    } else {
      bindNow();
    }
  } catch (e) {}

  // ─────────────────────────────────────────────────────────
  // INLINE 404 PAGE (renders if no route matches)
  // ─────────────────────────────────────────────────────────
  function renderNotFound(slug) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.style.cssText =
        "margin:0;background:#04080f;color:#e8edf5;font-family:Syne,system-ui,-apple-system,sans-serif;" +
        "display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;" +
        "text-align:center;padding:20px";

      document.body.innerHTML = [
        " ",
        " Page not found ",
        " No subpage registered for: " + String(slug) + " ",
        " To add this route, open router.js and add one line to the ROUTES map: ",
        " " + "'" + String(slug).toLowerCase() + "': '" + String(slug).toLowerCase() + ".html'" + " ",
        '<a href="' + joinURL(getBasePath(), "") + '">← Back to Home</a>',
      ].join("");
    });
  }
})();
