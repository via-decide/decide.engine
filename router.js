/**
 * ═══════════════════════════════════════════════════════════
 * viadecide.com — UNIVERSAL ROUTER v2.4
 * - Pretty URLs (/pricing → pricing.html)
 * - Hash routing (#/pricing)
 * - 404 session redirect (Netlify/GitHub pages friendly)
 * - Nav-safe link interception
 * File: router.js
 * ═══════════════════════════════════════════════════════════
 */
(function ViaDecideRouter() {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // ROUTE MAP (slug → actual file path)
  // ─────────────────────────────────────────────────────────
  var ROUTES = {
    // Core tools
    alchemist: "alchemist.html",
    swipeos: "SwipeOS.html",
    "engine-deals": "engine-deals.html",
    "cashback-claim": "cashback-claim.html",
    "cashback-rules": "cashback-rules.html",
    "engine-license": "engine-license.html",
    "ondc-demo": "ONDC-demo.html",
    "prompt-alchemy": "prompt-alchemy.html",
    promptalchemy: "prompt-alchemy.html",
    "student-research": "student-research.html",
    contact: "contact.html",
    brief: "brief.html",
    "decision-brief": "decision-brief.html",

    // Main pages
    pricing: "pricing.html",
    discounts: "discounts.html",
    memory: "memory.html",
    founder: "founder.html",
    privacy: "privacy.html",
    terms: "terms.html",
    "decision-brief-guide": "decision-brief-guide.html",
    "decide-service": "decide-service.html",
    "app-generator": "app-generator.html",
    "cohort-apply-here": "cohort-apply-here.html",

    // Games / sims (add what you have)
    hexwars: "HexWars.html",
    "mars-rover-simulator-game": "mars-rover-simulator-game.html",
    hivaland: "HivaLand.html",

    // Store
    "printbydd-store": "printbydd-store/index.html",
    printbydd: "printbydd-store/index.html",
    keychain: "printbydd-store/keychain.html",
    numberplate: "printbydd-store/numberplate.html",
    products: "printbydd-store/products.html",
    "gifts-that-mean-more": "printbydd-store/gifts-that-mean-more.html",
    gifts: "printbydd-store/gifts-that-mean-more.html",

    // Blog
    blogs: "Viadecide-blogs.html",
    "viadecide-blogs": "Viadecide-blogs.html",
    "decision-infrastructure-india": "decision-infrastructure-india.html",
    "ondc-for-bharat": "ondc-for-bharat.html",
    "laptops-under-50000": "laptops-under-50000.html",
  };

  // ─────────────────────────────────────────────────────────
  // Aliases (legacy → new slugs)
  // ─────────────────────────────────────────────────────────
  var ALIASES = {
    SwipeOS: "swipeos",
    "swipeos?": "swipeos",
    PromptAlchemy: "prompt-alchemy",
    StudentResearch: "student-research",
    "ONDC-demo": "ondc-demo",
    ondc: "ondc-demo",
    ViaGuide: "viaguide",
    StudyOS: "studyos",
  };

  function isInAppBrowser() {
    var ua = navigator.userAgent || "";
    return /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|Snapchat/i.test(ua);
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

  function resolveRoute(slug) {
    if (!slug) return null;

    if (ROUTES[slug]) return ROUTES[slug];

    var aliasTarget = ALIASES[slug] || ALIASES[String(slug).toLowerCase()];
    if (aliasTarget && ROUTES[aliasTarget]) return ROUTES[aliasTarget];

    var lower = String(slug).toLowerCase();
    for (var key in ROUTES) {
      if (Object.prototype.hasOwnProperty.call(ROUTES, key)) {
        if (String(key).toLowerCase() === lower) return ROUTES[key];
      }
    }
    return null;
  }

  function getBasePath() {
    var host = window.location.host || "";
    var path = window.location.pathname || "/";

    // GitHub Pages: /repo-name/...
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

  function isLikelyExternalHref(href) {
    if (!href) return true;
    if (/^(https?:)?\/\//i.test(href)) return true;
    if (/^(mailto:|tel:|sms:|javascript:|data:)/i.test(href)) return true;
    return false;
  }

  function isAssetHref(href) {
    return /\.(js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf|stl|obj|glb|gltf)$/i.test(
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
  // STEP 0: Pretty URL handler (/pricing → pricing.html)
  // ─────────────────────────────────────────────────────────
  (function handlePrettyURL() {
    var base = getBasePath();
    var pathname = window.location.pathname || "/";

    pathname = stripBasePrefix(pathname, base);

    var clean = pathname.replace(/^\/+/, "");
    if (!clean || clean === "index.html" || clean === "index.htm") return;

    // if it’s a file extension, don’t touch
    if (/\.(html?|js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf|stl)$/i.test(clean)) return;

    var slug = normalizeSlug(clean);
    var file = resolveRoute(slug);
    if (!file) return;

    navigateTo(file, window.location.search || "", window.location.hash || "");
  })();

  // ─────────────────────────────────────────────────────────
  // STEP 1: 404 redirect recovery (sessionStorage)
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
  // STEP 2: Hash routing (#/pricing)
  // ─────────────────────────────────────────────────────────
  var currentHash = window.location.hash || "";
  if (currentHash) {
    var hashPath = currentHash.replace(/^#\/?/, "");
    if (hashPath && !/^p=/.test(hashPath) && hashPath.length < 120) {
      var hashSlug = normalizeSlug(hashPath.split("?")[0]);
      var hashFile = resolveRoute(hashSlug);
      if (hashFile) {
        navigateTo(hashFile, "", "");
        return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // STEP 3: Public API
  // ─────────────────────────────────────────────────────────
  window.VDRouter = {
    go: function (slug, options) {
      options = options || {};

      // external URL? open directly
      if (isLikelyExternalHref(String(slug || ""))) {
        if (!!options.newTab && !isInAppBrowser()) window.open(String(slug), "_blank", "noopener,noreferrer");
        else window.location.href = String(slug);
        return;
      }

      var norm = normalizeSlug(slug);
      var file = resolveRoute(norm);

      // unknown: fall back to pretty route
      if (!file) {
        var fallback = origin() + joinURL(getBasePath(), norm + "/");
        if (options.newTab && !isInAppBrowser()) window.open(fallback, "_blank", "noopener,noreferrer");
        else safeReplace(fallback);
        return;
      }

      var url = origin() + joinURL(getBasePath(), file) + (options.search || "") + (options.hash || "");
      if (options.newTab && !isInAppBrowser()) window.open(url, "_blank", "noopener,noreferrer");
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

          // [data-back] handler
          var backEl = e.target && e.target.closest ? e.target.closest("[data-back]") : null;
          if (backEl) {
            var backHref = backEl.getAttribute("href") || "";
            if (backHref && isLikelyExternalHref(backHref)) return;
            e.preventDefault();
            if (window.history.length > 1) window.history.back();
            else safeReplace(origin() + joinURL(getBasePath(), "index.html"));
            return;
          }

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

          // reduce nested links to last segment
          if (clean.indexOf("/") !== -1) {
            var segs = clean.split("/").filter(Boolean);
            var last = segs[segs.length - 1] || "";
            if (last && (/\.(html?)$/i.test(last) || !/\./.test(last))) clean = last;
          }

          // direct .html navigation
          if (/\.html?$/i.test(clean)) {
            e.preventDefault();
            navigateTo(clean, url.search || "", url.hash || "");
            return;
          }

          // slug
          var slug = normalizeSlug(clean);
          if (!slug) return;

          var file = resolveRoute(slug);
          e.preventDefault();

          if (!file) {
            safeReplace(origin() + joinURL(base, slug + "/") + (url.search || "") + (url.hash || ""));
            return;
          }

          window.VDRouter.go(slug, { newTab: false, search: url.search || "", hash: url.hash || "" });
        },
        true
      );
    },
  };

  // ─────────────────────────────────────────────────────────
  // STEP 4: Rewrite relative nav hrefs (so nav works on subpages)
  // ─────────────────────────────────────────────────────────
  function fixNavHrefs() {
    var base = getBasePath();
    var nodes = [];
    ["nav a[href]", "header a[href]", "footer a[href]"].forEach(function (q) {
      try {
        var list = document.querySelectorAll(q);
        for (var i = 0; i < list.length; i++) nodes.push(list[i]);
      } catch (e) {}
    });

    for (var k = 0; k < nodes.length; k++) {
      var a = nodes[k];
      var href = a.getAttribute("href") || "";
      if (!href) continue;

      if (href.charAt(0) === "#") continue;
      if (isLikelyExternalHref(href)) continue;
      if (href.charAt(0) === "/") continue;
      if (isAssetHref(href)) continue;

      var parts = parsePathParts(href);
      var p = (parts.path || "").replace(/^\.\//, "");
      var s = parts.search || "";
      var h = parts.hash || "";

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
    try {
      fixNavHrefs();
    } catch (e) {}
    try {
      window.VDRouter.bindLinks("a.subpage-card, nav a, header a, footer a, a[data-vd-route]");
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindNow);
  else bindNow();

  // ─────────────────────────────────────────────────────────
  // Inline 404 Page
  // ─────────────────────────────────────────────────────────
  function renderNotFound(slug) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.style.cssText =
        "margin:0;background:#04080f;color:#e8edf5;font-family:Outfit,system-ui,-apple-system,sans-serif;" +
        "display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:14px;" +
        "text-align:center;padding:22px";

      document.body.innerHTML = [
        "<h1 style='font-size:54px;letter-spacing:-.03em;margin:0;'>404</h1>",
        "<p style='margin:0;color:rgba(232,237,245,.75)'>Page not found</p>",
        "<p style='margin:0;color:rgba(232,237,245,.65)'>No subpage registered for: <strong style='color:#fff'>" +
          String(slug) +
          "</strong></p>",
        '<a href="' +
          joinURL(getBasePath(), "") +
          '" style="color:#ff671f;text-decoration:none;margin-top:10px;border:1px solid #ff671f;padding:10px 18px;border-radius:50px;">← Back to Home</a>',
      ].join("");
    });
  }
})();
