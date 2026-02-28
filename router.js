
/* router.js — Universal static router (hash + path support)
   Works on:
   - Root domains
   - Subfolder deployments
   - GitHub Pages repo sites
   - Direct file navigation
*/

(function () {
  "use strict";

  // ========= CONFIG =========
  // If you want the back button to ALWAYS go to your main site:
  // set MAIN_WEBSITE to your real home URL (recommended).
  // Example: "https://viadecide.com/"
  const MAIN_WEBSITE = window.__MAIN_WEBSITE__ || "/";

  // Default route if nothing matches
  const DEFAULT_ROUTE = "index";

  // If you use GitHub Pages repo site (username.github.io/repo/),
  // this detects base path automatically.
  const BASE_PATH = detectBasePath();

  // ========= PUBLIC HELPERS =========
  // Build a URL to assets that works everywhere (subfolders, hash routes, etc.)
  // Usage: assetUrl("assets/stl/file.stl")
  window.assetUrl = function assetUrl(relPath) {
    // relPath should NOT start with "/" for best portability
    const clean = String(relPath || "").replace(/^\/+/, "");
    // Use <base> URL if present, else BASE_PATH
    const base = document.querySelector("base")?.href || (location.origin + BASE_PATH);
    return new URL(clean, base).href;
  };

  // Programmatic navigation
  window.go = function go(route) {
    // route: "discounts", "pricing", "products/123", etc.
    const clean = normalizeRoute(route);
    // Use hash routing for static hosting reliability
    location.hash = "#/" + clean;
  };

  // Back button handler you can attach to: <a class="back" href="#" data-back>
  window.backToMain = function backToMain() {
    // If we have history inside site, go back.
    if (history.length > 1 && document.referrer && sameOrigin(document.referrer)) {
      history.back();
      return;
    }
    // Otherwise go to main website/home
    location.href = MAIN_WEBSITE;
  };

  // ========= ROUTE MAP =========
  // Map "route" -> html file in your repo.
  // Add your 7 blogs here.
  const ROUTES = {
    index: "index.html",
    discounts: "discounts.html",
    pricing: "pricing.html",
    inventory: "inventory.html",
    memory: "memory.html",
    founder: "founder.html",
    weekly-decision-reviews: "weekly-decision-reviews.html",
    // example: product UI pages
    product: "product.html",
  };

  // ========= INIT =========
  // Intercept clicks on internal links so they work as routes
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    // Back button behaviour
    if (a.matches("[data-back], .back")) {
      // only intercept if it is "#" or empty href
      const href = (a.getAttribute("href") || "").trim();
      if (href === "" || href === "#") {
        e.preventDefault();
        window.backToMain();
        return;
      }
    }

    // Ignore external links / new tabs
    if (a.target === "_blank") return;
    const href = (a.getAttribute("href") || "").trim();
    if (!href) return;

    // Allow normal navigation for absolute external URLs
    if (/^https?:\/\//i.test(href)) return;
    if (/^mailto:/i.test(href) || /^tel:/i.test(href)) return;

    // If user links directly to an html file like "pricing.html", route it
    if (href.endsWith(".html")) {
      e.preventDefault();
      const route = hrefToRoute(href);
      window.go(route);
      return;
    }

    // If link is like "/pricing" or "pricing" treat as route
    if (!href.startsWith("#") && !href.startsWith("javascript:")) {
      e.preventDefault();
      window.go(href);
      return;
    }
  });

  // When hash changes, load page
  window.addEventListener("hashchange", render);
  window.addEventListener("load", () => {
    wireBackButton();
    render();
  });

  // ========= RENDER =========
  function render() {
    const route = getCurrentRoute();
    const file = resolveRouteToFile(route);

    // If this site is multi-page (each blog is its own html),
    // we simply redirect to the correct file.
    // This is the most reliable for static hosting.
    if (!isSamePage(file)) {
      location.href = BASE_PATH + file + location.hashSuffixForRoute(route);
      return;
    }

    // If you want SPA-style injection later, you can add it here.
    // For now, keeping it simple and bulletproof.
  }

  // ========= HELPERS =========
  function detectBasePath() {
    // If deployed in subfolder, grab it from current path up to last "/"
    // Example: /repo/discounts.html -> /repo/
    const path = location.pathname;
    // if visiting /repo/discounts.html return /repo/
    if (path.endsWith(".html")) return path.replace(/[^/]+\.html$/, "");
    // if visiting /repo/ or / return itself
    return path.endsWith("/") ? path : path + "/";
  }

  function sameOrigin(url) {
    try {
      return new URL(url).origin === location.origin;
    } catch {
      return false;
    }
  }

  function wireBackButton() {
    // If you have: <a class="back" href="#">← Back</a>
    // this makes it reliably go to main site if no history.
    document.querySelectorAll(".back").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const href = (btn.getAttribute("href") || "").trim();
        if (href === "" || href === "#") {
          e.preventDefault();
          window.backToMain();
        }
      });
    });
  }

  function normalizeRoute(route) {
    let r = String(route || "").trim();

    // Convert "pricing.html" -> "pricing"
    r = r.replace(/\.html$/i, "");

    // Remove leading base path if someone passed "/repo/pricing"
    r = r.replace(BASE_PATH, "");

    // Remove leading slashes and hashes
    r = r.replace(/^#\/?/, "");
    r = r.replace(/^\/+/, "");

    return r || DEFAULT_ROUTE;
  }

  function getCurrentRoute() {
    // Prefer hash route: #/pricing
    const h = location.hash || "";
    if (h.startsWith("#/")) return normalizeRoute(h.slice(2));
    if (h.startsWith("#")) return normalizeRoute(h.slice(1));

    // Else fall back to pathname: /pricing or /pricing.html
    const p = location.pathname || "";
    const last = p.split("/").filter(Boolean).pop() || "";
    if (last.endsWith(".html")) return normalizeRoute(last);
    return normalizeRoute(last || DEFAULT_ROUTE);
  }

  function resolveRouteToFile(route) {
    const r = normalizeRoute(route);
    // Direct match
    if (ROUTES[r]) return ROUTES[r];

    // Support nested like "product/123" -> product.html
    const head = r.split("/")[0];
    if (ROUTES[head]) return ROUTES[head];

    return ROUTES[DEFAULT_ROUTE] || "index.html";
  }

  function hrefToRoute(href) {
    // "pricing.html" -> "pricing"
    const clean = href.split("?")[0].split("#")[0];
    return normalizeRoute(clean.replace(/\.html$/i, ""));
  }

  function isSamePage(file) {
    const current = (location.pathname.split("/").pop() || "").toLowerCase();
    return current === file.toLowerCase();
  }

  // Keep route in hash even after redirect (optional)
  location.hashSuffixForRoute = function (route) {
    // preserve deeper route if needed (e.g., product/123)
    const r = normalizeRoute(route);
    if (!r || r === DEFAULT_ROUTE) return "";
    return "#/" + r;
  };
})();
