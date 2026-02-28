/* router.js — ViaDecide Universal Static Router (multi-page + hash deep-links)
   Goals:
   ✅ Works on root domains, subfolders, GitHub Pages, Vercel, and PWA standalone
   ✅ Compatible with existing index.html expecting window.VDRouter.go(...)
   ✅ Handles internal links: "page.html", "page.html?tag=x", "/page", "page", "#/page"
   ✅ Preserves query strings (affiliate tags) reliably
*/

(function () {
  "use strict";

  // ========= CONFIG =========
  // If you want the back button to ALWAYS go to your main site:
  // set window.__MAIN_WEBSITE__ = "https://viadecide.com/" before loading router.js
  var MAIN_WEBSITE = window.__MAIN_WEBSITE__ || "/";

  // Default route if nothing matches
  var DEFAULT_ROUTE = "index";

  // For deployments in subfolders (e.g., GitHub Pages /repo/),
  // this detects base path automatically.
  var BASE_PATH = detectBasePath();

  // ========= PUBLIC API =========
  // Asset URL helper that works in subfolders + hash routes
  function assetUrl(relPath) {
    var clean = String(relPath || "").replace(/^\/+/, "");
    var baseHref = null;
    try {
      var baseEl = document.querySelector("base");
      baseHref = baseEl && baseEl.href ? baseEl.href : null;
    } catch (e) {}

    var base = baseHref || (location.origin + BASE_PATH);
    try {
      return new URL(clean, base).href;
    } catch (e2) {
      return (BASE_PATH + clean).replace(/\/{2,}/g, "/");
    }
  }

  // Back button helper
  function backToMain() {
    // If we have history inside site, go back.
    try {
      if (history.length > 1 && document.referrer && sameOrigin(document.referrer)) {
        history.back();
        return;
      }
    } catch (e) {}
    // Otherwise go to main website/home
    location.href = MAIN_WEBSITE;
  }

  // Programmatic navigation (index.html uses this via window.VDRouter.go)
  // route examples:
  // - "pricing" -> pricing.html
  // - "pricing.html" -> pricing.html
  // - "/pricing" -> pricing.html
  // options:
  // - newTab: boolean (open in new tab)
  // - search: "?tag=viadecide" (query string)
  // - hash: "#section" (page fragment, NOT routing hash)
  function go(route, options) {
    options = options || {};
    var parsed = parseRouteAndQuery(route);
    var r = normalizeRoute(parsed.route);
    var search = normalizeSearch(options.search || parsed.search || "");
    var pageHash = normalizePageHash(options.hash || parsed.hash || "");

    var file = routeToFile(r);
    var href = buildHrefToFile(file, search, pageHash);

    if (options.newTab) {
      try {
        window.open(href, "_blank", "noopener");
      } catch (e) {
        location.href = href;
      }
      return;
    }

    location.href = href;
  }

  // Expose globals expected by your site
  window.assetUrl = assetUrl;
  window.backToMain = backToMain;

  // Compatibility with existing index.html getRouter():
  // it checks: window.VDRouter && typeof window.VDRouter.go === "function"
  window.VDRouter = {
    basePath: BASE_PATH,
    assetUrl: assetUrl,
    backToMain: backToMain,
    go: go,
    // Hash-only navigation (keeps you on same page until render() redirects)
    hashGo: function hashGo(route, options) {
      options = options || {};
      var parsed = parseRouteAndQuery(route);
      var r = normalizeRoute(parsed.route);
      var search = normalizeSearch(options.search || parsed.search || "");
      // keep query inside hash so 404/index can pick it up
      location.hash = "#/" + r + (search || "");
    },
  };

  // Optional alias
  window.go = function (route) {
    window.VDRouter.hashGo(route);
  };

  // ========= CLICK INTERCEPT =========
  // Intercept internal links so they work as routes and preserve ?tag=
  document.addEventListener("click", function (e) {
    var a = closestAnchor(e.target);
    if (!a) return;

    // Respect downloads
    if (a.hasAttribute("download")) return;

    // Back button behavior: <a href="#" class="back" data-back>
    if (matchesBack(a)) {
      var href0 = (a.getAttribute("href") || "").trim();
      if (href0 === "" || href0 === "#") {
        e.preventDefault();
        backToMain();
        return;
      }
    }

    // Ignore external/new-tab
    if ((a.getAttribute("target") || "").toLowerCase() === "_blank") return;

    var href = (a.getAttribute("href") || "").trim();
    if (!href) return;

    // Ignore in-page anchors
    if (href === "#" || href.startsWith("#") && !href.startsWith("#/")) return;

    // Ignore mail/tel/javascript
    if (/^mailto:/i.test(href) || /^tel:/i.test(href) || /^javascript:/i.test(href)) return;

    // Absolute external URLs: do not intercept
    if (/^https?:\/\//i.test(href)) {
      // If it's same-origin absolute, we may still want to route; but safer: allow browser.
      // You can force route by using relative links in your HTML.
      return;
    }

    // Parse relative/internal href
    var u = safeParseUrl(href);
    if (!u) return;

    // If it points to a non-html asset, don't intercept
    if (looksLikeAsset(u.pathname)) return;

    // If it's explicitly a .html page (with or without query/hash), route it
    if (endsWithHtml(u.pathname) || endsWithHtml(href)) {
      e.preventDefault();
      var route = hrefPathToRoute(u.pathname);
      var q = normalizeSearch(u.search || extractSearchFromString(href) || "");
      var pageHash = normalizePageHash(u.hash || "");
      // Navigate to real file, preserving query + fragment
      go(route, { search: q, hash: pageHash, newTab: false });
      return;
    }

    // If it's a hash route like "#/pricing?tag=..."
    if (href.startsWith("#/")) {
      e.preventDefault();
      location.hash = href;
      return;
    }

    // Otherwise treat "/pricing" or "pricing" as a route
    // Preserve query if present
    e.preventDefault();
    var route2 = hrefPathToRoute(u.pathname || href);
    var q2 = normalizeSearch(u.search || extractSearchFromString(href) || "");
    var pageHash2 = normalizePageHash(u.hash || "");
    // Prefer hashGo to support deep-link style; render() will redirect on load/404
    window.VDRouter.hashGo(route2, { search: q2 });
    // If there's a fragment, apply it after redirect by navigating directly
    // (Fragments are page-specific; safest is direct go if fragment exists)
    if (pageHash2) {
      go(route2, { search: q2, hash: pageHash2 });
    }
  });

  // ========= INIT / RENDER =========
  window.addEventListener("hashchange", render);
  window.addEventListener("load", function () {
    wireBackButtons();
    render();
  });

  function render() {
    // If we have a hash route (#/somepage?tag=...), redirect to the corresponding .html file.
    var parts = getCurrentRouteParts();
    var r = normalizeRoute(parts.route);
    var q = normalizeSearch(parts.search || "");

    // No route in hash: nothing to do
    if (!parts.hasHashRoute) return;

    var file = routeToFile(r);

    // If already on the correct file, keep the hash clean (optional)
    // But do NOT force remove it; hash can be used for state.
    if (isSamePage(file)) return;

    // Redirect to the multi-page file, preserving query (affiliate tags)
    var href = buildHrefToFile(file, q, "");
    location.replace(href + location.hashSuffixForRoute(r, q));
  }

  // ========= HELPERS =========
  function detectBasePath() {
    // If deployed in subfolder, grab it from current path up to last "/"
    // Example: /repo/discounts.html -> /repo/
    var path = location.pathname || "/";
    if (path.toLowerCase().endsWith(".html")) {
      return path.replace(/[^/]+\.html$/i, "");
    }
    return path.endsWith("/") ? path : path + "/";
  }

  function sameOrigin(url) {
    try {
      return new URL(url).origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  function closestAnchor(el) {
    while (el && el !== document.documentElement) {
      if (el.tagName && el.tagName.toLowerCase() === "a") return el;
      el = el.parentNode;
    }
    return null;
  }

  function matchesBack(a) {
    try {
      return a.matches("[data-back], .back");
    } catch (e) {
      var cls = " " + (a.className || "") + " ";
      return a.hasAttribute("data-back") || cls.indexOf(" back ") !== -1;
    }
  }

  function wireBackButtons() {
    var nodes = document.querySelectorAll(".back,[data-back]");
    for (var i = 0; i < nodes.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function (e) {
          var href = (btn.getAttribute("href") || "").trim();
          if (href === "" || href === "#") {
            e.preventDefault();
            backToMain();
          }
        });
      })(nodes[i]);
    }
  }

  function safeParseUrl(href) {
    try {
      return new URL(href, location.href);
    } catch (e) {
      return null;
    }
  }

  function looksLikeAsset(pathname) {
    // treat common static assets as non-routable
    var p = String(pathname || "").toLowerCase();
    return /\.(png|jpe?g|webp|gif|svg|ico|css|js|mjs|map|json|txt|xml|mp4|webm|mp3|wav|woff2?|ttf|otf|gltf|glb|bin|stl)$/i.test(p);
  }

  function endsWithHtml(s) {
    return /\.html$/i.test(String(s || "").split("?")[0].split("#")[0]);
  }

  function normalizeRoute(route) {
    var r = String(route || "").trim();

    // Remove leading hash route markers
    r = r.replace(/^#\/?/, "");

    // Strip query/hash
    r = r.split("?")[0].split("#")[0];

    // Remove base path if passed like "/repo/page"
    if (BASE_PATH && BASE_PATH !== "/" && r.indexOf(BASE_PATH) === 0) {
      r = r.slice(BASE_PATH.length);
    }

    // Remove leading slashes
    r = r.replace(/^\/+/, "");

    // Convert "pricing.html" -> "pricing"
    r = r.replace(/\.html$/i, "");

    // Empty -> default
    return r || DEFAULT_ROUTE;
  }

  function normalizeSearch(search) {
    var s = String(search || "").trim();
    if (!s) return "";
    if (s === "?") return "";
    return s.startsWith("?") ? s : ("?" + s.replace(/^\?+/, ""));
  }

  function normalizePageHash(h) {
    var s = String(h || "").trim();
    if (!s) return "";
    // routing hash is handled separately; this is page fragment like "#section"
    if (s.startsWith("#/")) return "";
    return s.startsWith("#") ? s : ("#" + s.replace(/^#+/, ""));
  }

  function extractSearchFromString(s) {
    s = String(s || "");
    var i = s.indexOf("?");
    if (i === -1) return "";
    var tail = s.slice(i);
    // stop at hash
    var j = tail.indexOf("#");
    return j === -1 ? tail : tail.slice(0, j);
  }

  function parseRouteAndQuery(routeLike) {
    var s = String(routeLike || "").trim();
    // Accept "pricing?tag=x" etc.
    var hash = "";
    var hashIdx = s.indexOf("#");
    if (hashIdx !== -1) {
      hash = s.slice(hashIdx);
      s = s.slice(0, hashIdx);
    }
    var search = "";
    var qIdx = s.indexOf("?");
    if (qIdx !== -1) {
      search = s.slice(qIdx);
      s = s.slice(0, qIdx);
    }
    return { route: s, search: search, hash: hash };
  }

  function hrefPathToRoute(pathname) {
    var p = String(pathname || "").trim();
    // "/repo/pricing.html" -> "pricing"
    p = p.split("?")[0].split("#")[0];
    // Keep only last segment for route names
    var segs = p.split("/").filter(Boolean);
    var last = segs.length ? segs[segs.length - 1] : "";
    if (!last) return DEFAULT_ROUTE;
    return normalizeRoute(last);
  }

  function routeToFile(route) {
    var r = normalizeRoute(route);
    if (!r || r === DEFAULT_ROUTE) return "index.html";
    // If route already contains ".html" (after normalize it won't), but just in case:
    if (/\.html$/i.test(r)) return r;
    return r + ".html";
  }

  function buildHrefToFile(file, search, pageHash) {
    var f = String(file || "index.html").replace(/^\/+/, "");
    var q = normalizeSearch(search);
    var h = normalizePageHash(pageHash);

    // Always navigate with BASE_PATH for subfolder deployments
    // Ensure single slashes
    var base = BASE_PATH || "/";
    if (!base.endsWith("/")) base += "/";
    var href = base + f;

    // Avoid double slashes except after protocol (not present here)
    href = href.replace(/\/{2,}/g, "/");

    return href + (q || "") + (h || "");
  }

  function getCurrentRouteParts() {
    var h = location.hash || "";
    if (h.startsWith("#/")) {
      // Support "#/pricing?tag=x"
      var raw = h.slice(2);
      var q = extractSearchFromString(raw);
      var r = normalizeRoute(raw);
      return { hasHashRoute: true, route: r, search: q };
    }
    // No hash route
    return { hasHashRoute: false, route: "", search: "" };
  }

  function isSamePage(file) {
    var current = (location.pathname.split("/").pop() || "").toLowerCase();
    return current === String(file || "").toLowerCase();
  }

  // Keep route in hash after redirect (optional; helps deep-link traceability)
  location.hashSuffixForRoute = function (route, search) {
    var r = normalizeRoute(route);
    if (!r || r === DEFAULT_ROUTE) return "";
    var q = normalizeSearch(search || "");
    return "#/" + r + (q || "");
  };
})();
```0
