/* ============================================================================
   ViaDecide — Deterministic Modal Router (Unified Subpage Routing)

   Goals:
   - Make ALL subpages behave like /printbydd-store (pretty URL -> content loads)
   - Support:
     • Direct URL entry
     • Modal loading (openModal)
     • Back button closes modal / navigates routes
     • Page refresh restores correct modal state
   - Static hosting safe (incl. GitHub Pages base path handling)
   ========================================================================== */

(function ViaDecideDeterministicRouter() {
  "use strict";

  // ---------------------------
  // 0) BASE PATH (GitHub Pages)
  // ---------------------------
  function getBasePath() {
    var host = String(window.location.host || "");
    var pathname = String(window.location.pathname || "/");
    // If served from <user>.github.io/<repo>/..., base is "/<repo>/"
    if (/github\.io$/i.test(host)) {
      var seg = pathname.replace(/^\/+/, "").split("/")[0];
      if (seg) return "/" + seg + "/";
    }
    return "/";
  }

  function joinURL(base, path) {
    return String(base || "/").replace(/\/+$/, "/") + String(path || "").replace(/^\/+/, "");
  }

  function stripBase(pathname, base) {
    pathname = String(pathname || "/");
    base = String(base || "/");
    if (base !== "/" && pathname.indexOf(base) === 0) return pathname.slice(base.length - 1);
    return pathname;
  }

  function normalizePathnameToKey(pathname) {
    // Requirement:
    // const path = location.pathname.replace(/^\/+|\/+$/g,'')
    // With base path support + ignore query/hash (handled by browser separately).
    var base = getBasePath();
    var p = stripBase(pathname, base);
    p = String(p || "/").replace(/^\/+|\/+$/g, "");
    return p;
  }

  function decodeSafe(s) {
    try { return decodeURIComponent(String(s || "")); } catch (e) { return String(s || ""); }
  }

  // ---------------------------
  // 1) ROUTE MAP (explicit)
  // ---------------------------
  // Required URLs:
  // /HexWars
  // /app-generator
  // /viadecide-decision-matrix
  // /personal-brand-session
  // /founder
  // /printbydd-store
  //
  // Note: repo contains a mixture of:
  // - folder pages: /printbydd-store/index.html
  // - root pages:   HexWars.html, app-generator.html, founder.html, etc.
  //
  // Router resolves deterministically using:
  // - explicit mapping
  // - wildcard sections (tools/games/stores/blogs)
  // - fallback probing: "/<slug>/index.html" then "/<slug>.html"
  var ROUTES = {
    "printbydd-store": "/printbydd-store/index.html",
    "HexWars": "/HexWars/index.html",
    "app-generator": "/app-generator/index.html",
    "viadecide-decision-matrix": "/viadecide-decision-matrix/index.html",
    "personal-brand-session": "/personal-brand-session/index.html",
    "founder": "/founder/index.html"
  };

  // ---------------------------
  // 2) WILDCARD SECTIONS
  // ---------------------------
  // These behave as pretty URLs where content is expected under /<section>/<slug>/index.html
  // and if missing, fallback will attempt /<section>/<slug>.html or /<slug>.html.
  var SECTION_PREFIXES = [
    "tools",
    "games",
    "stores",
    "blogs"
  ];

  function isSectionRoute(key) {
    // key like "tools/something" or "tools/something/else"
    var parts = String(key || "").split("/").filter(Boolean);
    if (!parts.length) return false;
    var head = parts[0];
    for (var i = 0; i < SECTION_PREFIXES.length; i++) {
      if (head === SECTION_PREFIXES[i]) return true;
    }
    return false;
  }

  // ---------------------------
  // 3) RESOLUTION (deterministic)
  // ---------------------------
  function stripIndexHtml(pathOrKey) {
    var s = String(pathOrKey || "");
    s = s.replace(/\/index\.html$/i, "");
    s = s.replace(/\.html$/i, "");
    s = s.replace(/^\/+/, "");
    s = s.replace(/\/+$/g, "");
    return s;
  }

  function keyFromOpenModalUrl(url) {
    // Accepts forms like:
    //  - "/HexWars/index.html"
    //  - "HexWars/index.html"
    //  - "/app-generator.html"
    //  - "/printbydd-store/"
    //  - "/tools/xyz/index.html"
    if (!url) return "";
    var u = String(url);
    // ignore absolute URLs
    if (/^(https?:)?\/\//i.test(u)) return "";
    // remove query/hash
    u = u.split("#")[0].split("?")[0];
    u = u.replace(/\\/g, "/");
    u = u.replace(/^\/+/, "");
    u = stripIndexHtml(u);
    return u;
  }

  function routeCandidatesForKey(key) {
    // Deterministic candidate list in priority order.
    // 1) Explicit map (exact + case-sensitive first)
    // 2) Explicit map case-insensitive match
    // 3) If section route -> try "/<key>/index.html" then "/<key>.html"
    // 4) Fallback -> "/<key>/index.html" then "/<key>.html"
    var candidates = [];
    if (!key) return candidates;

    // Explicit (exact)
    if (Object.prototype.hasOwnProperty.call(ROUTES, key)) {
      candidates.push(ROUTES[key]);
      return candidates;
    }

    // Explicit (case-insensitive)
    var kLower = String(key).toLowerCase();
    var found = null;
    for (var rk in ROUTES) {
      if (!Object.prototype.hasOwnProperty.call(ROUTES, rk)) continue;
      if (String(rk).toLowerCase() === kLower) { found = ROUTES[rk]; break; }
    }
    if (found) {
      candidates.push(found);
      return candidates;
    }

    // If section route, try section-first resolution
    if (isSectionRoute(key)) {
      candidates.push("/" + key.replace(/^\/+/, "").replace(/\/+$/,"") + "/index.html");
      candidates.push("/" + key.replace(/^\/+/, "").replace(/\/+$/,"") + ".html");
      // also allow resolving "tools/x" to "/x/index.html" etc via fallback below
    }

    // Fallback resolution
    candidates.push("/" + key.replace(/^\/+/, "").replace(/\/+$/,"") + "/index.html");
    candidates.push("/" + key.replace(/^\/+/, "").replace(/\/+$/,"") + ".html");

    // If nested (e.g. "printbydd-store/keychain") also try direct ".html" under folder
    if (key.indexOf("/") !== -1) {
      candidates.push("/" + key.replace(/^\/+/, "").replace(/\/+$/,"") + ".html");
    }

    return candidates;
  }

  function fetchFirstOk(candidates) {
    // Deterministic probing in order; returns { url, html } or throws.
    var base = getBasePath();
    var i = 0;

    function tryNext() {
      if (i >= candidates.length) {
        return Promise.reject(new Error("No route candidates found"));
      }
      var c = candidates[i++];
      var abs = joinURL(base, c);
      return fetch(abs, { credentials: "same-origin" }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text().then(function (html) {
          return { url: abs, html: html };
        });
      }).catch(function () {
        return tryNext();
      });
    }

    return tryNext();
  }

  // ---------------------------
  // 4) MODAL INJECTION
  // ---------------------------
  function getEl(id) { return document.getElementById(id); }

  function setModalHeader(icon, title, urlForTab) {
    // Works with existing ViaDecide modal header ids (best-effort).
    var iconEl = getEl("m-icon");
    var nameEl = getEl("m-name");
    var tabEl = getEl("m-tab");
    if (iconEl && typeof icon === "string") iconEl.textContent = icon;
    if (nameEl && typeof title === "string") nameEl.textContent = title;
    if (tabEl && urlForTab) {
      tabEl.setAttribute("href", urlForTab);
      tabEl.setAttribute("target", "_blank");
      tabEl.setAttribute("rel", "noopener noreferrer");
    }
  }

  function injectHtmlIntoModal(html) {
    var body = getEl("modal-body");
    if (!body) return;
    body.innerHTML = html;
  }

  function extractMeaningfulBody(htmlText) {
    // Inject only the page body content when possible to avoid nested html/head/body conflicts.
    // Deterministic: try <main>, then <body>, else raw html.
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(String(htmlText || ""), "text/html");
      var main = doc.querySelector("main");
      if (main) return main.innerHTML;
      var body = doc.body;
      if (body) return body.innerHTML;
    } catch (e) {}
    return String(htmlText || "");
  }

  // ---------------------------
  // 5) HISTORY STATE
  // ---------------------------
  function makeModalState(key) {
    return { vd: { modal: true, path: key } };
  }

  function isModalState(st) {
    return !!(st && st.vd && st.vd.modal);
  }

  function pushUrlForKey(key) {
    var base = getBasePath();
    if (!key) return joinURL(base, "index.html");
    // pretty URL: "/<key>" (no .html)
    return joinURL(base, key.replace(/^\/+/, "").replace(/\/+$/, ""));
  }

  function openRouteInModal(key, opts) {
    opts = opts || {};
    key = String(key || "").replace(/^\/+|\/+$/g, "");
    key = decodeSafe(key);

    if (!key) return Promise.resolve(false);

    var candidates = routeCandidatesForKey(key);

    return fetchFirstOk(candidates).then(function (res) {
      var html = extractMeaningfulBody(res.html);
      injectHtmlIntoModal(html);

      // Ensure modal is open (delegated to modal.js controller if present)
      if (typeof window.VDModalOpen === "function") window.VDModalOpen();
      if (typeof window.openModalShell === "function") window.openModalShell(); // optional legacy hook

      // Update header + tab href
      var title = (opts.title != null) ? String(opts.title) : key;
      var icon = (opts.icon != null) ? String(opts.icon) : "↗";
      setModalHeader(icon, title, res.url);

      // History
      var pretty = pushUrlForKey(key);
      if (opts.replace) {
        history.replaceState(makeModalState(key), "", pretty);
      } else if (opts.push !== false) {
        history.pushState(makeModalState(key), "", pretty);
      }

      return true;
    });
  }

  function closeModalToHome(opts) {
    opts = opts || {};
    if (typeof window.VDModalClose === "function") window.VDModalClose();
    if (typeof window.closeModalShell === "function") window.closeModalShell(); // optional legacy hook

    var base = getBasePath();
    var home = joinURL(base, "index.html");

    // Use replaceState when reacting to popstate to avoid loops.
    if (opts.replace) history.replaceState({}, "", home);
    else history.pushState({}, "", home);
  }

  // ---------------------------
  // 6) PUBLIC API + openModal()
  // ---------------------------
  function routerOpen(urlOrKey, icon, title, options) {
    var opts = options || {};
    // Backwards compatible signature: openModal(url, icon, title)
    var key = "";

    if (typeof urlOrKey === "string") {
      // If it looks like a path (/x/index.html), derive key; else treat as key.
      if (urlOrKey.indexOf("/") !== -1 || /\.html(\?|#|$)/i.test(urlOrKey)) {
        key = keyFromOpenModalUrl(urlOrKey);
      } else {
        key = urlOrKey;
      }
    }

    if (!key) return Promise.resolve(false);
    return openRouteInModal(key, {
      icon: icon,
      title: title,
      push: (opts.push !== false),
      replace: !!opts.replace
    });
  }

  // Global compatibility: openModal(url, icon, title)
  window.openModal = function openModal(url, icon, title) {
    return routerOpen(url, icon, title, { push: true, replace: false });
  };

  // Optional global close API used by existing UI
  window.closeModal = function closeModal() {
    // Close without pushing a new history entry; go back if modal state exists.
    // Deterministic behavior:
    // - If current history state is modal -> go back (popstate will close).
    // - Else close + replace to home.
    if (isModalState(history.state)) {
      history.back();
      return;
    }
    closeModalToHome({ replace: true });
  };

  window.VDRouter = window.VDRouter || {};
  window.VDRouter.routes = function () {
    // Return registered routes list
    var out = {};
    for (var k in ROUTES) if (Object.prototype.hasOwnProperty.call(ROUTES, k)) out[k] = ROUTES[k];
    return out;
  };
  window.VDRouter.open = routerOpen;
  window.VDRouter.go = function (key, opts) {
    opts = opts || {};
    return openRouteInModal(key, { icon: opts.icon, title: opts.title, push: opts.push !== false, replace: !!opts.replace });
  };

  // ---------------------------
  // 7) DIRECT URL ENTRY + REFRESH
  // ---------------------------
  function bootFromLocation() {
    var key = normalizePathnameToKey(window.location.pathname);
    // On home (""), ensure modal closed.
    if (!key || key === "index.html") return;

    // If it is an asset request, do nothing (safety)
    if (/\.(js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf)$/i.test(key)) return;

    // If someone lands directly on /printbydd-store or /HexWars etc:
    // open modal and replace state to modal (no extra history entry)
    openRouteInModal(key, { replace: true, push: false, title: key, icon: "↗" }).catch(function () {
      // If route cannot be loaded, do nothing (allow server/static 404 behavior)
    });
  }

  // ---------------------------
  // 8) BACK BUTTON SUPPORT
  // ---------------------------
  window.addEventListener("popstate", function (e) {
    var st = e.state;

    if (isModalState(st)) {
      // Load modal route for this state
      var key = String(st.vd.path || "");
      if (!key) return;
      openRouteInModal(key, { replace: true, push: false, title: key, icon: "↗" }).catch(function () {});
      return;
    }

    // Non-modal state: close modal if open
    if (typeof window.VDModalIsOpen === "function" && window.VDModalIsOpen()) {
      if (typeof window.VDModalClose === "function") window.VDModalClose();
      return;
    }

    // If URL indicates a route (user navigated within history), attempt to open
    var keyFromUrl = normalizePathnameToKey(window.location.pathname);
    if (keyFromUrl && keyFromUrl !== "index.html") {
      openRouteInModal(keyFromUrl, { replace: true, push: false, title: keyFromUrl, icon: "↗" }).catch(function () {});
    }
  });

  // ---------------------------
  // 9) CLICK INTERCEPT (optional)
  // ---------------------------
  function isExternal(href) {
    if (!href) return true;
    if (/^(https?:)?\/\//i.test(href)) return true;
    if (/^(mailto:|tel:|sms:|javascript:|data:)/i.test(href)) return true;
    return false;
  }

  function isAsset(href) {
    return /\.(js|css|png|jpg|jpeg|webp|svg|ico|json|txt|xml|pdf|mp4|webm|woff2?|ttf)$/i.test(href || "");
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    if (e.button && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;

    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return;
    if (isExternal(href) || isAsset(href)) return;

    // If the link is explicitly meant to open modal, route it.
    // Supported markers:
    // - data-modal="true"
    // - data-vd-route="<key>"
    // - href looks like "/something/" (pretty route)
    var routeKey = a.getAttribute("data-vd-route") || "";
    var wantsModal = (String(a.getAttribute("data-modal") || "").toLowerCase() === "true");
    if (!routeKey) {
      // Derive key from href
      var base = getBasePath();
      var u;
      try { u = new URL(href, window.location.href); } catch (err) { return; }
      if (!u) return;
      var clean = stripBase(u.pathname, base);
      clean = String(clean || "/").replace(/^\/+|\/+$/g, "");
      if (!clean || clean === "index.html") return;
      routeKey = stripIndexHtml(clean);
      wantsModal = true; // default: internal pretty links open in modal
    }

    if (!wantsModal) return;

    e.preventDefault();
    var icon = a.getAttribute("data-icon") || "↗";
    var title = a.getAttribute("data-title") || a.getAttribute("title") || routeKey;
    routerOpen(routeKey, icon, title, { push: true, replace: false });
  }, true);

  // ---------------------------
  // 10) INIT
  // ---------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootFromLocation);
  } else {
    bootFromLocation();
  }

  // ---------------------------
  // 11) UI TEXT REPLACEMENTS (in modified files)
  // ---------------------------
  // (Router-level header fallbacks only; full repo-wide replacement should be done
  //  by applying the same substitutions across all HTML assets in the repo.)
})();
