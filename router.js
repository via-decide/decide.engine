(function () {
  "use strict";

  const ROUTES_URL = "/routes.json";
  const appRoot = () => document.getElementById("app");
  const homeView = () => document.getElementById("homeView");
  const pageView = () => document.getElementById("pageView");

  let routesCache = null;

  async function loadRoutes() {
    if (routesCache) return routesCache;
    try {
      const res = await fetch(ROUTES_URL, { cache: "no-cache" });
      routesCache = await res.json();
      return routesCache;
    } catch (e) {
      // fallback if routes.json missing
      routesCache = {
        "/": "/index.html",
        "/discounts": "/pages/discounts.html",
        "/calibration-cube-20mm": "/pages/calibration-cube-20mm.html"
      };
      return routesCache;
    }
  }

  function normalizePath(pathname) {
    if (!pathname) return "/";
    // remove trailing slash except root
    if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
    return pathname;
  }

  function isModifiedClick(e) {
    return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
  }

  function sameOrigin(url) {
    try {
      const u = new URL(url, window.location.origin);
      return u.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function shouldHandleLink(a) {
    if (!a) return false;
    if (!a.hasAttribute("data-link")) return false;

    const href = a.getAttribute("href") || "";
    if (!href) return false;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;

    // external links should not be SPA-handled
    if (/^https?:\/\//i.test(href) && !sameOrigin(href)) return false;

    return true;
  }

  function setHomeVisible(isHome) {
    const hv = homeView();
    const pv = pageView();
    if (!hv || !pv) return;

    hv.classList.toggle("hidden", !isHome);
    pv.classList.toggle("hidden", isHome);
  }

  function hardScrollTop() {
    // If pageView contains its own scroll container, it should manage itself.
    // But we still reset the pageView scroll position to avoid carrying scroll between routes.
    const pv = pageView();
    if (pv) pv.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function clearPageView() {
    const pv = pageView();
    if (pv) pv.innerHTML = "";
  }

  // Execute scripts from injected HTML (including module scripts)
  function runInjectedScripts(container) {
    if (!container) return;

    const scripts = Array.from(container.querySelectorAll("script"));
    scripts.forEach((old) => {
      const s = document.createElement("script");

      // copy attributes
      for (const attr of old.attributes) {
        s.setAttribute(attr.name, attr.value);
      }

      // inline code
      if (!old.src) {
        s.textContent = old.textContent || "";
      }

      // replace old with new to execute
      old.parentNode.replaceChild(s, old);
    });
  }

  async function renderRoute(pathname) {
    pathname = normalizePath(pathname);

    const routes = await loadRoutes();
    const pv = pageView();

    // Home route => show home view (no DOM replacement, so your home JS remains alive)
    if (pathname === "/") {
      setHomeVisible(true);
      clearPageView();
      hardScrollTop();
      document.title = "viadecide.com | India's Decision Engine";
      return;
    }

    // resolve route
    const file = routes[pathname];
    if (!file) {
      // unknown => go home
      navigate("/", { replace: true });
      return;
    }

    // show page view
    setHomeVisible(false);
    if (!pv) return;

    try {
      const res = await fetch(file, { cache: "no-cache" });
      if (!res.ok) throw new Error("Failed to load " + file);
      const html = await res.text();

      pv.innerHTML = html;

      // Execute scripts inside the partial (needed for calibration cube page)
      runInjectedScripts(pv);

      // Update title if partial contains <title data-title> or data-page-title
      const titleEl = pv.querySelector("[data-page-title]");
      if (titleEl) document.title = titleEl.getAttribute("data-page-title") || document.title;

      hardScrollTop();
      // notify
      document.dispatchEvent(new CustomEvent("vd:route", { detail: { pathname } }));
    } catch (e) {
      pv.innerHTML = `
        <div style="height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;">
          <div style="max-width:720px;width:100%;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(15,15,15,.8);padding:18px;">
            <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto; font-weight:800; font-size:18px; margin-bottom:6px;">Page failed to load</div>
            <div style="color:rgba(240,240,240,.65);line-height:1.5;margin-bottom:14px;">${String(e.message || e)}</div>
            <a href="/" data-link style="display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2);color:#fff;text-decoration:none;font-weight:700;">← Back to Home</a>
          </div>
        </div>
      `;
      runInjectedScripts(pv);
    }
  }

  function navigate(to, opts = {}) {
    const url = new URL(to, window.location.origin);

    // keep any existing ?tag= or query if you want; here we preserve current query if missing
    // but do NOT force it, to keep router generic.
    const nextPath = normalizePath(url.pathname);

    if (opts.replace) history.replaceState({}, "", nextPath + url.search + url.hash);
    else history.pushState({}, "", nextPath + url.search + url.hash);

    renderRoute(nextPath);
  }

  // Intercept SPA links
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    if (!shouldHandleLink(a)) return;
    if (isModifiedClick(e)) return;

    e.preventDefault();
    const href = a.getAttribute("href");
    if (!href) return;

    navigate(href);
  });

  // popstate (browser back/forward)
  window.addEventListener("popstate", () => {
    renderRoute(window.location.pathname);
  });

  // expose minimal API
  window.VDRouter = {
    go: (path, options = {}) => navigate(path, options),
    render: () => renderRoute(window.location.pathname)
  };

  // Initial load
  document.addEventListener("DOMContentLoaded", () => {
    renderRoute(window.location.pathname);
  });
})();
