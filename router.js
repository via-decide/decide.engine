/**
 * router.js — Universal Router (Hash + Path)
 * Supports: hash mode (#/page), path mode (/page), bare slugs (page)
 * Features: back/forward history, data-back attribute, link interception
 */
(function () {
  "use strict";

  /* ─── Config ─────────────────────────────────────────── */
  const HASH_MODE = true;          // true = use #/slug; false = push path
  const DEFAULT_PAGE = "index";
  const PAGE_EXT = ".html";        // extension for path mode fetches

  /* ─── State ──────────────────────────────────────────── */
  const history_stack = [];
  let current_page = null;

  /* ─── Helpers ────────────────────────────────────────── */
  function normalise(raw) {
    if (!raw || raw === "#" || raw === "/") return DEFAULT_PAGE;

    // Strip leading #, #/, /
    let slug = raw.replace(/^[#\/]+/, "").replace(/\.html$/, "").trim();

    // Handle hash-mode URLs like #/memory → memory
    slug = slug.replace(/^\//, "");

    return slug || DEFAULT_PAGE;
  }

  function currentSlug() {
    if (HASH_MODE) {
      return normalise(window.location.hash);
    } else {
      return normalise(window.location.pathname);
    }
  }

  function buildHref(slug) {
    if (HASH_MODE) return "#/" + slug;
    return "/" + slug;
  }

  /* ─── Navigation ─────────────────────────────────────── */
  function navigate(target, pushState) {
    const slug = normalise(target);

    if (slug === current_page && pushState) return; // no-op

    if (pushState !== false) {
      history_stack.push(current_page);
    }

    current_page = slug;

    if (HASH_MODE) {
      if (window.location.hash !== "#/" + slug) {
        window.location.hash = "/" + slug;
      }
    } else {
      if (window.location.pathname !== "/" + slug) {
        window.history.pushState({ slug }, "", "/" + slug);
      }
    }

    dispatch(slug);
  }

  function goBack() {
    if (history_stack.length > 0) {
      const prev = history_stack.pop();
      navigate(prev, false);
      if (HASH_MODE) {
        window.location.hash = "/" + normalise(prev);
      } else {
        window.history.back();
      }
    } else {
      navigate(DEFAULT_PAGE, false);
    }
  }

  /* ─── Event dispatching ──────────────────────────────── */
  function dispatch(slug) {
    const event = new CustomEvent("router:navigate", {
      detail: { slug, page: slug, href: buildHref(slug) },
      bubbles: true
    });
    document.dispatchEvent(event);

    // Update all [data-router-page] visibility if used
    document.querySelectorAll("[data-router-page]").forEach(el => {
      const match = el.getAttribute("data-router-page");
      el.style.display = (match === slug) ? "" : "none";
    });

    // Update active link states
    document.querySelectorAll("a[data-nav]").forEach(a => {
      const s = normalise(a.getAttribute("href") || "");
      a.classList.toggle("is-active", s === slug);
    });
  }

  /* ─── Link interception ──────────────────────────────── */
  function isInternalHref(href) {
    if (!href) return false;
    if (href.startsWith("http://") || href.startsWith("https://")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (href.startsWith("javascript:")) return false;
    return true;
  }

  document.addEventListener("click", function (e) {
    const anchor = e.target.closest("a");
    if (!anchor) return;

    // data-back → go back
    if (anchor.hasAttribute("data-back")) {
      e.preventDefault();
      goBack();
      return;
    }

    // data-nav or internal links
    const href = anchor.getAttribute("href");
    if (!isInternalHref(href)) return;

    const slug = normalise(href);

    // Blank / hash-only links that map to default
    if (!slug || slug === "#") return;

    e.preventDefault();
    navigate(slug, true);
  }, true); // capture phase so it fires before any child handler

  /* ─── Hash change (browser back/forward) ────────────── */
  window.addEventListener("hashchange", function () {
    const slug = currentSlug();
    if (slug !== current_page) {
      current_page = slug;
      dispatch(slug);
    }
  });

  /* ─── popstate (path mode) ───────────────────────────── */
  window.addEventListener("popstate", function (e) {
    const slug = e.state && e.state.slug ? e.state.slug : currentSlug();
    if (slug !== current_page) {
      current_page = slug;
      dispatch(slug);
    }
  });

  /* ─── Public API ─────────────────────────────────────── */
  window.Router = {
    navigate: function (target) { navigate(target, true); },
    back: goBack,
    current: function () { return current_page; },
    href: buildHref,
    on: function (slug, callback) {
      document.addEventListener("router:navigate", function (e) {
        if (!slug || e.detail.slug === slug) callback(e.detail);
      });
    }
  };

  /* ─── Boot ───────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    const initial = currentSlug();
    current_page = initial;
    dispatch(initial);
  });

})();
