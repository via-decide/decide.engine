/**
 * ═══════════════════════════════════════════════════════════
 * viadecide.com — UNIVERSAL ROUTER v3.0
 *
 * Features (all new vs v2.4):
 *   ✦ Route parameters  (/blog/:slug → params.slug)
 *   ✦ Wildcard routes   (* catch-all)
 *   ✦ beforeEach / afterEach middleware hooks
 *   ✦ Event bus         (VDRouter.on / off / emit)
 *   ✦ pushState SPA mode (no reload for in-site navigation)
 *   ✦ Scroll restoration per route
 *   ✦ VDRouter.query()  (parsed URLSearchParams)
 *   ✦ VDRouter.params() (current dynamic params)
 *   ✦ VDRouter.prefetch(slug)
 *   ✦ VDRouter.back() / forward()
 *   ✦ Dynamic route registration at runtime
 *   ✦ Smarter 404 with "did you mean?" suggestions
 *   ✦ Full backward-compat with v2.4 public API
 *
 * Preserved from v2.4:
 *   • Pretty URL handler (/pricing → pricing.html)
 *   • Hash routing (#/pricing)
 *   • 404 session-redirect (Netlify / GitHub Pages)
 *   • Nav-safe link interception
 *   • In-app browser detection
 *   • ROUTES / ALIASES maps
 *
 * File: router.js
 * ═══════════════════════════════════════════════════════════
 */
(function ViaDecideRouter() {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // ROUTE MAP  (slug → file path)
  // Add new slugs here; dynamic segments use :param notation.
  // ─────────────────────────────────────────────────────────
  var ROUTES = {
    // Core tools
    alchemist:          "alchemist.html",
    swipeos:            "SwipeOS.html",
    "engine-deals":     "engine-deals.html",
    "cashback-claim":   "cashback-claim.html",
    "cashback-rules":   "cashback-rules.html",
    "engine-license":   "engine-license.html",
    "ondc-demo":        "ONDC-demo.html",
    "prompt-alchemy":   "prompt-alchemy.html",
    promptalchemy:      "prompt-alchemy.html",
    "student-research": "student-research.html",
    contact:            "contact.html",
    brief:              "brief.html",
    "decision-brief":   "decision-brief.html",

    // Main pages
    pricing:                 "pricing.html",
    discounts:               "discounts.html",
    memory:                  "memory.html",
    founder:                 "founder.html",
    privacy:                 "privacy.html",
    terms:                   "terms.html",
    "decision-brief-guide":  "decision-brief-guide.html",
    "decide-service":        "decide-service.html",
    "app-generator":         "app-generator.html",
    "cohort-apply-here":     "cohort-apply-here.html",

    // Games / sims
    hexwars:                      "HexWars.html",
    "mars-rover-simulator-game":  "mars-rover-simulator-game.html",
    hivaland:                     "HivaLand.html",

    // Store
    "printbydd-store":      "printbydd-store/index.html",
    printbydd:              "printbydd-store/index.html",
    keychain:               "printbydd-store/keychain.html",
    numberplate:            "printbydd-store/numberplate.html",
    products:               "printbydd-store/products.html",
    "gifts-that-mean-more": "printbydd-store/gifts-that-mean-more.html",
    gifts:                  "printbydd-store/gifts-that-mean-more.html",

    // Blog
    blogs:                           "Viadecide-blogs.html",
    "viadecide-blogs":               "Viadecide-blogs.html",
    "decision-infrastructure-india": "decision-infrastructure-india.html",
    "ondc-for-bharat":               "ondc-for-bharat.html",
    "laptops-under-50000":           "laptops-under-50000.html",
  };

  // ─────────────────────────────────────────────────────────
  // ALIASES  (legacy slug / case variant → canonical slug)
  // ─────────────────────────────────────────────────────────
  var ALIASES = {
    SwipeOS:        "swipeos",
    "swipeos?":     "swipeos",
    PromptAlchemy:  "prompt-alchemy",
    StudentResearch:"student-research",
    "ONDC-demo":    "ondc-demo",
    ondc:           "ondc-demo",
    ViaGuide:       "viaguide",
    StudyOS:        "studyos",
  };

  // ─────────────────────────────────────────────────────────
  // DYNAMIC PARAM ROUTES  (pattern → file template)
  // Pattern:  "blog/:slug"  →  file: "blog-post.html"
  // Matched params injected into VDRouter.params()
  // ─────────────────────────────────────────────────────────
  var PARAM_ROUTES = [
    // { pattern: "blog/:slug", file: "blog-post.html" },
  ];

  // ─────────────────────────────────────────────────────────
  // WILDCARD / CATCH-ALL
  // Set to a file path to catch unrecognised slugs instead of
  // showing the built-in 404. Leave null to use built-in 404.
  // ─────────────────────────────────────────────────────────
  var WILDCARD_FILE = null; // e.g. "404.html"

  // ─────────────────────────────────────────────────────────
  // SPA MODE
  // true  → use pushState; navigate without full reload
  //         (requires server to serve index.html for all paths)
  // false → classic full-page navigation (default, safe)
  // ─────────────────────────────────────────────────────────
  var SPA_MODE = false;

  // ─────────────────────────────────────────────────────────
  // Internal state
  // ─────────────────────────────────────────────────────────
  var _currentParams  = {};
  var _scrollMap      = {};           // path → scrollY for restoration
  var _hooks          = { before: [], after: [] };
  var _listeners      = {};           // event → [fn, ...]
  var _prefetchCache  = {};


  // ══════════════════════════════════════════════════════════
  // ①  UTILITIES
  // ══════════════════════════════════════════════════════════

  function isInAppBrowser() {
    return /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|Snapchat/i.test(
      navigator.userAgent || ""
    );
  }

  function normalizeSlug(raw) {
    return String(raw || "")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/^\.\//, "")
      .replace(/\.html?$/i, "")
      .trim()
      .toLowerCase()
      .split("/")[0];
  }

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
    return basePath.replace(/\/+$/, "/") +
      String(filePath || "").replace(/^\/+/, "");
  }

  function parsePathParts(fullPath) {
    var m = String(fullPath || "/")
      .match(/^([^?#]*)(\?[^#]*)?(#.*)?$/) || [];
    return { path: m[1] || "/", search: m[2] || "", hash: m[3] || "" };
  }

  function safeReplace(url) {
    try { window.location.replace(url); }
    catch (e) { window.location.href = url; }
  }

  function isLikelyExternalHref(href) {
    if (!href) return true;
    if (/^(https?:)?\/\//i.test(href)) return true;
    if (/^(mailto:|tel:|sms:|javascript:|data:)/i.test(href)) return true;
    return false;
  }

  function isAssetHref(href) {
    return /\.(js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf|stl|obj|glb|gltf)$/i
      .test(href || "");
  }

  function hrefToSameOriginURL(href) {
    try { return new URL(href, window.location.href); }
    catch (e) { return null; }
  }

  function stripBasePrefix(pathname, basePath) {
    if (basePath !== "/" && pathname.indexOf(basePath) === 0)
      return pathname.slice(basePath.length - 1);
    return pathname;
  }

  // Levenshtein distance — used for "did you mean?" suggestions
  function levenshtein(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (j = 1; j <= n; j++)
      for (i = 1; i <= m; i++)
        d[i][j] = a[i-1] === b[j-1]
          ? d[i-1][j-1]
          : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
    return d[m][n];
  }

  function suggest(slug) {
    var all = Object.keys(ROUTES);
    var scored = all
      .map(function(k) { return { k: k, d: levenshtein(slug, k) }; })
      .filter(function(o) { return o.d <= 3; })
      .sort(function(a, b) { return a.d - b.d; })
      .slice(0, 3)
      .map(function(o) { return o.k; });
    return scored;
  }


  // ══════════════════════════════════════════════════════════
  // ②  ROUTE RESOLVER
  // ══════════════════════════════════════════════════════════

  /** Try static ROUTES + ALIASES first, then dynamic :param patterns. */
  function resolveRoute(slug) {
    if (!slug) return null;

    // Static exact match
    if (ROUTES[slug]) return { file: ROUTES[slug], params: {} };

    // Alias
    var aliasTarget = ALIASES[slug] || ALIASES[String(slug).toLowerCase()];
    if (aliasTarget && ROUTES[aliasTarget])
      return { file: ROUTES[aliasTarget], params: {} };

    // Case-insensitive static match
    var lower = String(slug).toLowerCase();
    for (var key in ROUTES) {
      if (Object.prototype.hasOwnProperty.call(ROUTES, key) &&
          String(key).toLowerCase() === lower)
        return { file: ROUTES[key], params: {} };
    }

    // Dynamic :param patterns (full path, not just first segment)
    var fullPath = String(slug);
    for (var i = 0; i < PARAM_ROUTES.length; i++) {
      var pr = PARAM_ROUTES[i];
      var result = matchPattern(pr.pattern, fullPath);
      if (result) return { file: pr.file, params: result };
    }

    // Wildcard catch-all
    if (WILDCARD_FILE) return { file: WILDCARD_FILE, params: {} };

    return null;
  }

  /** Match a :param pattern against a path string.
   *  Returns params object on match, null otherwise. */
  function matchPattern(pattern, path) {
    var pParts = pattern.split("/");
    var uParts = path.split("/");
    if (pParts.length !== uParts.length) return null;
    var params = {};
    for (var i = 0; i < pParts.length; i++) {
      if (pParts[i].charAt(0) === ":") {
        params[pParts[i].slice(1)] = decodeURIComponent(uParts[i] || "");
      } else if (pParts[i] !== uParts[i]) {
        return null;
      }
    }
    return params;
  }


  // ══════════════════════════════════════════════════════════
  // ③  NAVIGATION CORE
  // ══════════════════════════════════════════════════════════

  function navigateTo(filePath, search, hash, replaceState) {
    var base = getBasePath();
    var url = origin() + joinURL(base, filePath) + (search || "") + (hash || "");

    if (SPA_MODE) {
      _spaNavigate(url, filePath, search, hash, replaceState);
    } else {
      if (replaceState) safeReplace(url);
      else window.location.href = url;
    }
  }

  // ── SPA navigation (pushState, no reload) ────────────────
  var _spaContainer = null;

  function _spaNavigate(url, filePath, search, hash, replace) {
    var from = window.location.href;

    _runHooks("before", { from: from, to: url, file: filePath }, function(allowed) {
      if (!allowed) return;

      // Save current scroll
      _scrollMap[window.location.pathname] = window.scrollY || 0;

      if (replace) window.history.replaceState({ vd: true }, "", url);
      else         window.history.pushState({ vd: true }, "", url);

      _loadPage(filePath, function() {
        if (hash) {
          try {
            var el = document.querySelector(hash);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          } catch(e) {}
        } else {
          var saved = _scrollMap[window.location.pathname] || 0;
          window.scrollTo(0, saved);
        }
        _runHooks("after", { from: from, to: url });
        _emit("routechange", { from: from, to: url, file: filePath });
      });
    });
  }

  function _loadPage(filePath, done) {
    var base = getBasePath();
    var pageUrl = origin() + joinURL(base, filePath);

    fetch(pageUrl)
      .then(function(res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");

        // Swap <title>
        if (doc.title) document.title = doc.title;

        // Swap <main> or <body> content
        var newMain = doc.querySelector("main") || doc.body;
        var curMain = document.querySelector("main") || document.body;
        if (newMain && curMain) {
          curMain.innerHTML = newMain.innerHTML;
          bindNow(); // re-bind router links in new content
        }

        if (typeof done === "function") done();
      })
      .catch(function() {
        // Fallback: hard navigate
        window.location.href = pageUrl;
      });
  }


  // ══════════════════════════════════════════════════════════
  // ④  MIDDLEWARE & EVENT BUS
  // ══════════════════════════════════════════════════════════

  /** Run all "before" hooks in sequence. Calls cb(true) if navigation
   *  should proceed, cb(false) if any hook returned false. */
  function _runHooks(type, ctx, cb) {
    var hooks = _hooks[type] || [];
    var i = 0;

    function next() {
      if (i >= hooks.length) { if (cb) cb(true); return; }
      var hook = hooks[i++];
      try {
        var result = hook(ctx, next);
        // If hook returns false synchronously, cancel
        if (result === false) { if (cb) cb(false); }
        // If hook accepts (ctx, next) and calls next() → async flow
        // If it returns a promise, wait for it
        else if (result && typeof result.then === "function") {
          result.then(function(v) {
            if (v === false) { if (cb) cb(false); }
            else next();
          }).catch(function() { if (cb) cb(false); });
        }
      } catch(e) { next(); }
    }
    next();
  }

  function _emit(event, data) {
    var fns = _listeners[event] || [];
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](data); } catch(e) {}
    }
    // Also dispatch as DOM CustomEvent
    try {
      window.dispatchEvent(new CustomEvent("vd:" + event, { detail: data }));
    } catch(e) {}
  }


  // ══════════════════════════════════════════════════════════
  // ⑤  BOOT SEQUENCE
  // ══════════════════════════════════════════════════════════

  // STEP A: Pretty URL handler  (/pricing → pricing.html)
  (function handlePrettyURL() {
    var base     = getBasePath();
    var pathname = window.location.pathname || "/";
    pathname = stripBasePrefix(pathname, base);

    var clean = pathname.replace(/^\/+/, "");
    if (!clean || clean === "index.html" || clean === "index.htm") return;

    if (/\.(html?|js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf|stl)$/i
        .test(clean)) return;

    // Support multi-segment slugs for :param routes
    var fullSlug = clean.replace(/\/+$/, "");
    var firstSeg = normalizeSlug(fullSlug.split("/")[0]);

    var match = resolveRoute(fullSlug) || resolveRoute(firstSeg);
    if (!match) return;

    _currentParams = match.params || {};
    navigateTo(
      match.file,
      window.location.search || "",
      window.location.hash  || "",
      true  // replaceState so back-button works cleanly
    );
  })();

  // STEP B: 404 session-redirect recovery (Netlify / GitHub Pages)
  var _stored = null;
  try { _stored = sessionStorage.getItem("__vd_redirect__"); } catch(e) {}

  if (_stored) {
    try { sessionStorage.removeItem("__vd_redirect__"); } catch(e) {}

    var _parts   = parsePathParts(_stored);
    var _rawSlug = (_parts.path || "/").replace(/^\//, "").split("/")[0];

    if (_rawSlug) {
      var _norm  = normalizeSlug(_rawSlug);
      var _match = resolveRoute(_norm);
      if (_match) {
        _currentParams = _match.params || {};
        navigateTo(_match.file, _parts.search, _parts.hash, true);
      } else {
        renderNotFound(_rawSlug);
      }
    }
  }

  // STEP C: Hash routing  (#/pricing)
  var _hash = window.location.hash || "";
  if (_hash) {
    var _hashPath = _hash.replace(/^#\/?/, "");
    if (_hashPath && !/^p=/.test(_hashPath) && _hashPath.length < 120) {
      var _hashSlug  = normalizeSlug(_hashPath.split("?")[0]);
      var _hashMatch = resolveRoute(_hashSlug);
      if (_hashMatch) {
        _currentParams = _hashMatch.params || {};
        navigateTo(_hashMatch.file, "", "", false);
      }
    }
  }

  // STEP D: popstate (browser back/forward in SPA mode)
  if (SPA_MODE) {
    window.addEventListener("popstate", function(e) {
      var pathname = window.location.pathname;
      var base     = getBasePath();
      var clean    = stripBasePrefix(pathname, base).replace(/^\/+/, "");
      if (!clean) return;

      var slug  = normalizeSlug(clean);
      var match = resolveRoute(slug);
      if (match) {
        _currentParams = match.params || {};
        _loadPage(match.file, function() {
          _emit("routechange", { to: window.location.href });
        });
      }
    });
  }


  // ══════════════════════════════════════════════════════════
  // ⑥  PUBLIC API   window.VDRouter
  // ══════════════════════════════════════════════════════════
  window.VDRouter = {

    // ── Navigate to a slug or full URL ───────────────────
    go: function(slug, options) {
      options = options || {};

      if (isLikelyExternalHref(String(slug || ""))) {
        if (options.newTab && !isInAppBrowser())
          window.open(String(slug), "_blank", "noopener,noreferrer");
        else window.location.href = String(slug);
        return;
      }

      var norm  = normalizeSlug(slug);
      var match = resolveRoute(norm);

      if (!match) {
        var fallback = origin() + joinURL(getBasePath(), norm + "/");
        if (options.newTab && !isInAppBrowser())
          window.open(fallback, "_blank", "noopener,noreferrer");
        else safeReplace(fallback);
        return;
      }

      _currentParams = match.params || {};
      var url = origin() + joinURL(getBasePath(), match.file) +
                (options.search || "") + (options.hash || "");

      if (options.newTab && !isInAppBrowser())
        window.open(url, "_blank", "noopener,noreferrer");
      else
        navigateTo(match.file, options.search || "", options.hash || "", false);
    },

    // ── Pretty URL for a slug ────────────────────────────
    url: function(slug) {
      return joinURL(getBasePath(), normalizeSlug(slug) + "/");
    },

    // ── Resolved file path for a slug ───────────────────
    resolve: function(slug) {
      var match = resolveRoute(normalizeSlug(slug));
      return match ? match.file : null;
    },

    // ── Dump registered routes ───────────────────────────
    routes: function() {
      var out = {};
      for (var k in ROUTES)
        if (Object.prototype.hasOwnProperty.call(ROUTES, k)) out[k] = ROUTES[k];
      return out;
    },

    // ── Register a new static route at runtime ───────────
    register: function(slug, file) {
      ROUTES[normalizeSlug(slug)] = String(file || "");
    },

    // ── Register a dynamic :param route ─────────────────
    registerParam: function(pattern, file) {
      PARAM_ROUTES.push({ pattern: String(pattern), file: String(file) });
    },

    // ── Set wildcard / catch-all ─────────────────────────
    setWildcard: function(file) {
      WILDCARD_FILE = file || null;
    },

    // ── Current dynamic params (:param routes) ───────────
    params: function() {
      return Object.assign({}, _currentParams);
    },

    // ── Parsed query string ──────────────────────────────
    query: function() {
      var out = {};
      try {
        new URLSearchParams(window.location.search).forEach(function(v, k) {
          out[k] = v;
        });
      } catch(e) {}
      return out;
    },

    // ── Navigation history helpers ───────────────────────
    back: function()    { window.history.back(); },
    forward: function() { window.history.forward(); },

    // ── Prefetch a route (SPA mode hint) ─────────────────
    prefetch: function(slug) {
      var match = resolveRoute(normalizeSlug(slug));
      if (!match || _prefetchCache[match.file]) return;
      _prefetchCache[match.file] = true;
      try {
        var link = document.createElement("link");
        link.rel  = "prefetch";
        link.href = joinURL(getBasePath(), match.file);
        document.head.appendChild(link);
      } catch(e) {}
    },

    // ── Middleware / lifecycle hooks ─────────────────────
    /**
     * beforeEach(fn)
     * fn receives (context, next) where context = { from, to, file }
     * Call next() to allow, return false / don't call next() to cancel.
     */
    beforeEach: function(fn) {
      if (typeof fn === "function") _hooks.before.push(fn);
      return window.VDRouter; // chainable
    },

    /** afterEach(fn) — fn receives { from, to, file } */
    afterEach: function(fn) {
      if (typeof fn === "function") _hooks.after.push(fn);
      return window.VDRouter;
    },

    // ── Event bus ────────────────────────────────────────
    /**
     * VDRouter.on("routechange", fn)
     * Events: routechange
     * Also dispatched on window as CustomEvent "vd:routechange"
     */
    on: function(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
      return window.VDRouter;
    },

    off: function(event, fn) {
      if (!_listeners[event]) return window.VDRouter;
      _listeners[event] = _listeners[event].filter(function(f) { return f !== fn; });
      return window.VDRouter;
    },

    emit: function(event, data) {
      _emit(event, data);
      return window.VDRouter;
    },

    // ── Enable / disable SPA mode ────────────────────────
    setSPAMode: function(enabled) {
      SPA_MODE = !!enabled;
    },

    // ── Link interception ────────────────────────────────
    bindLinks: function(selector) {
      var sel = selector ||
        "a.subpage-card, nav a, header a, footer a, a[data-vd-route]";

      document.addEventListener("click", function(e) {
        if (e.defaultPrevented) return;
        if (e.button && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        // [data-back] handler
        var backEl = e.target && e.target.closest
          ? e.target.closest("[data-back]") : null;
        if (backEl) {
          var backHref = backEl.getAttribute("href") || "";
          if (backHref && isLikelyExternalHref(backHref)) return;
          e.preventDefault();
          if (window.history.length > 1) window.history.back();
          else safeReplace(origin() + joinURL(getBasePath(), "index.html"));
          return;
        }

        var a = e.target && e.target.closest
          ? e.target.closest(sel) : null;
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

        // reduce nested links to last segment
        if (clean.indexOf("/") !== -1) {
          var segs = clean.split("/").filter(Boolean);
          var last = segs[segs.length - 1] || "";
          if (last && (/\.(html?)$/i.test(last) || !/\./.test(last)))
            clean = last;
        }

        // direct .html navigation
        if (/\.html?$/i.test(clean)) {
          e.preventDefault();
          navigateTo(clean, url.search || "", url.hash || "", false);
          return;
        }

        var slug  = normalizeSlug(clean);
        if (!slug) return;

        var match = resolveRoute(slug);
        e.preventDefault();

        if (!match) {
          safeReplace(
            origin() + joinURL(base, slug + "/") +
            (url.search || "") + (url.hash || "")
          );
          return;
        }

        _currentParams = match.params || {};
        window.VDRouter.go(slug, {
          newTab: false,
          search: url.search || "",
          hash:   url.hash   || "",
        });
      }, true);
    },
  };


  // ══════════════════════════════════════════════════════════
  // ⑦  NAV HREF FIXER  (makes relative nav hrefs work on subpages)
  // ══════════════════════════════════════════════════════════
  function fixNavHrefs() {
    var base  = getBasePath();
    var nodes = [];
    ["nav a[href]", "header a[href]", "footer a[href]"].forEach(function(q) {
      try {
        var list = document.querySelectorAll(q);
        for (var i = 0; i < list.length; i++) nodes.push(list[i]);
      } catch(e) {}
    });

    for (var k = 0; k < nodes.length; k++) {
      var a    = nodes[k];
      var href = a.getAttribute("href") || "";
      if (!href) continue;
      if (href.charAt(0) === "#") continue;
      if (isLikelyExternalHref(href)) continue;
      if (href.charAt(0) === "/") continue;
      if (isAssetHref(href)) continue;

      var parts = parsePathParts(href);
      var p = (parts.path || "").replace(/^\.\//, "");
      var s = parts.search || "";
      var h = parts.hash   || "";

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

  function bindNow() {
    try { fixNavHrefs(); }    catch(e) {}
    try {
      window.VDRouter.bindLinks(
        "a.subpage-card, nav a, header a, footer a, a[data-vd-route]"
      );
    } catch(e) {}
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bindNow);
  else
    bindNow();


  // ══════════════════════════════════════════════════════════
  // ⑧  BUILT-IN 404 PAGE  (with "did you mean?" suggestions)
  // ══════════════════════════════════════════════════════════
  function renderNotFound(slug) {
    var hints = suggest(String(slug));

    function render() {
      document.body.style.cssText =
        "margin:0;background:#04080f;color:#e8edf5;" +
        "font-family:Outfit,system-ui,-apple-system,sans-serif;" +
        "display:flex;align-items:center;justify-content:center;" +
        "min-height:100vh;flex-direction:column;gap:14px;" +
        "text-align:center;padding:22px";

      var suggestHtml = "";
      if (hints.length) {
        suggestHtml =
          "<p style='margin:0;color:rgba(232,237,245,.55);font-size:14px'>" +
          "Did you mean: " +
          hints.map(function(s) {
            return "<a href='" + joinURL(getBasePath(), s + "/") + "'" +
              " style='color:#ff671f;text-decoration:none'>" + s + "</a>";
          }).join(" &bull; ") +
          "</p>";
      }

      document.body.innerHTML =
        "<h1 style='font-size:54px;letter-spacing:-.03em;margin:0'>404</h1>" +
        "<p style='margin:0;color:rgba(232,237,245,.75)'>Page not found</p>" +
        "<p style='margin:0;color:rgba(232,237,245,.65)'>" +
          "No route registered for: " +
          "<strong style='color:#fff'>" + String(slug) + "</strong>" +
        "</p>" +
        suggestHtml +
        "<a href='" + joinURL(getBasePath(), "") + "'" +
          " style='color:#ff671f;text-decoration:none;margin-top:10px;" +
          "border:1px solid #ff671f;padding:10px 18px;border-radius:50px'>" +
          "← Back to Home" +
        "</a>";
    }

    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", render);
    else
      render();
  }

})();
