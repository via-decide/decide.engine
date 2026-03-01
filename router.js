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
 * 'my-tool': 'my-tool.html',
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

    // ── PRINTBYDD STORE ROUTES ────────────────────────────
    "printbydd": "printbydd-store/index.html",
    "keychain": "printbydd-store/keychain.html",
    "gifts": "printbydd-store/gifts-that-mean-more.html",
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
    // Catch old blog names if someone bookmarked them
    "keychain-blog": "keychain", 
    "gifts-blog": "gifts"
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
  function getBasePath() {
    var host = window.location.host || "";
    var path = window.location.pathname || "/";

    if (/github\.io$/i.test(host)) {
      var seg = path.replace(/^\/+/, "").split("/")[0];
      if (seg) return "/" + seg + "/";
    }

    return "/";
  }

  function origin() {
    return window.location.protocol + "//" + window.location.host;
  }

  function joinURL(basePath, filePath) {
    return basePath.replace(/\/+$/, "/") + String(filePath || "").replace(/^\/+/, "");
  }

  function parsePathParts(fullPath) {
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
    if (/^(https?:)?\/\//i.test(href)) return true;
    if (/^(mailto:|tel:|sms:|javascript:|data:)/i.test(href)) return true;
    return false;
  }

  function isAssetHref(href) {
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
    if (basePath !== "/" && pathname.indexOf(basePath) === 0) {
      return pathname.slice(basePath.length - 1);
    }
    return pathname;
  }

  // ─────────────────────────────────────────────────────────
  // STEP 0: Handle Pretty URLs
  // ─────────────────────────────────────────────────────────
  (function handlePrettyURL() {
    var base = getBasePath();
    var pathname = window.location.pathname || "/";

    pathname = stripBasePrefix(pathname, base);

    var clean = pathname.replace(/^\/+/, "");
    if (!clean || clean === "index.html" || clean === "index.htm") return;

    if (/\.(html?|js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf)$/i.test(clean))
      return;

    var slug = normalizeSlug(clean);
    var file = resolveRoute(slug);
    if (!file) return;

    navigateTo(file, window.location.search || "", window.location.hash || "");
  })();

  // ─────────────────────────────────────────────────────────
  // STEP 1: Check for stored 404 redirects
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
  // STEP 2: Hash routing
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
    go: function (slug, options) {
      options = options || {};
      var norm = normalizeSlug(slug);
      var file = resolveRoute(norm);

      if (!file) {
        var fallback = origin() + joinURL(getBasePath(), norm + "/");
        if (options.newTab && !isInAppBrowser()) window.open(fallback, "_blank", "noopener,noreferrer");
        else safeReplace(fallback);
        return;
      }

      var wantNewTab = !!options.newTab && !isInAppBrowser();
      var url = origin() + joinURL(getBasePath(), file) + (options.search || "") + (options.hash || "");

      if (wantNewTab) window.open(url, "_blank", "noopener,noreferrer");
      else safeReplace(url);
    },

    url: function (slug) {
      var norm = normalizeSlug(slug);
      return joinURL(getBasePath(), norm + "/");
    },

    routes: function () {
      var out = {};
      for (var k in ROUTES) if (Object.prototype.hasOwnProperty.call(ROUTES, k)) out[k] = ROUTES[k];
      return out;
    },

    register: function (slug, file) {
      ROUTES[normalizeSlug(slug)] = String(file || "");
    },

    bindLinks: function (selector) {
      var sel = selector || "a.subpage-card, nav a, header a, footer a, a[data-vd-route]";
      document.addEventListener(
        "click",
        function (e) {
          if (e.defaultPrevented) return;
          if (e.button && e.button !== 0) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

          var a = e.target && e.target.closest ? e.target.closest(sel) : null;
          if (!a) return;

          var target = (a.getAttribute("target") || "").toLowerCase();
          if (target === "_blank") return;

          var hrefAttr = a.getAttribute("href") || "";
          if (!hrefAttr) return;
          if (isLikelyExternalHref(hrefAttr)) return;
          if (hrefAttr.charAt(0) === "#") return;
          if (isAssetHref(hrefAttr)) return;

          var url = hrefToSameOriginURL(hrefAttr);
          if (!url) return;
          if (url.origin !== window.location.origin) return;

          var base = getBasePath();
          var path = stripBasePrefix(url.pathname || "/", base);
          var clean = String(path || "/").replace(/^\/+/, "");

          if (clean.indexOf("/") !== -1) {
            var segs = clean.split("/").filter(Boolean);
            var last = segs[segs.length - 1] || "";
            if (last && (/\.(html?)$/i.test(last) || !/\./.test(last))) {
              clean = last;
            }
          }

          if (/\.html?$/i.test(clean)) {
            e.preventDefault();
            navigateTo(clean, url.search || "", url.hash || "");
            return;
          }

          var slug = normalizeSlug(clean);
          if (!slug) return;

          var file = resolveRoute(slug);
          if (!file) {
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
  // STEP 4: Rewrite relative nav hrefs
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

      if (href.charAt(0) === "#") continue;
      if (isLikelyExternalHref(href)) continue;
      if (href.charAt(0) === "/") continue;
      if (isAssetHref(href)) continue;

      var parts = parsePathParts(href);
      var p = parts.path || "";
      var s = parts.search || "";
      var h = parts.hash || "";

      p = p.replace(/^\.\//, "");
      if (p.indexOf("/") !== -1) {
        var segs = p.split("/").filter(Boolean);
        p = segs[segs.length - 1] || p;
      }

      if (p && !/\./.test(p)) {
        a.setAttribute("href", joinURL(base, normalizeSlug(p) + "/") + s + h);
        continue;
      }

      if (/\.html?$/i.test(p)) {
        a.setAttribute("href", joinURL(base, p.replace(/^\/+/, "")) + s + h);
        continue;
      }
    }
  }

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
  // INLINE 404 PAGE
  // ─────────────────────────────────────────────────────────
  function renderNotFound(slug) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.style.cssText =
        "margin:0;background:#04080f;color:#e8edf5;font-family:Syne,system-ui,-apple-system,sans-serif;" +
        "display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;" +
        "text-align:center;padding:20px";

      document.body.innerHTML = [
        "<h1>404</h1>",
        "<p>Page not found</p>",
        "<p>No subpage registered for: <strong>" + String(slug) + "</strong></p>",
        '<a href="' + joinURL(getBasePath(), "") + '" style="color:#ff671f;text-decoration:none;margin-top:16px;border:1px solid #ff671f;padding:10px 20px;border-radius:50px;">← Back to Home</a>',
      ].join("");
    });
  }
})();
