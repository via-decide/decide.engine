/**
 * ViaDecide — Universal Nav Fix v1.0
 * ════════════════════════════════════════════════════════════
 * Drop this script into EVERY subpage and blog page:
 *   <script src="../vd-nav-fix.js" defer></script>  (from /blogs/)
 *   <script src="vd-nav-fix.js" defer></script>      (from root)
 *
 * What it does:
 *  1. Injects a sticky top nav bar with working back button
 *  2. Back button: history.back() if history exists, else → index.html
 *  3. Shows current page title + breadcrumb
 *  4. Adds ViaDecide logo mark (SVG, faithful dH mark)
 *  5. Quick links: Home · Research · Brief · Blogs
 *  6. Works on ALL pages: subtools, blog posts, demos
 *  7. Does NOT conflict with existing topbars (checks before injecting)
 * ════════════════════════════════════════════════════════════
 */
(function () {
  "use strict";

  /* ── CONFIG ──────────────────────────────────────────────── */
  var ROOT = (function () {
    var p = location.pathname;
    /* If we're inside /blogs/ or any subfolder, root is ../ */
    var depth = p.split("/").filter(function (s) { return s && s.indexOf(".html") === -1; }).length;
    return depth > 0 ? "../".repeat(depth) : "./";
  })();

  var PAGES = {
    "index":            { label: "Home",            href: ROOT + "index.html" },
    "student-research": { label: "Research Tool",   href: ROOT + "student-research.html" },
    "decision-brief":   { label: "Decision Brief",  href: ROOT + "decision-brief.html" },
    "alchemist":        { label: "Alchemist Quiz",  href: ROOT + "alchemist.html" },
    "brief":            { label: "Brief Builder",   href: ROOT + "brief.html" },
    "swipeos":          { label: "SwipeOS",         href: ROOT + "SwipeOS.html" },
    "prompt-alchemy":   { label: "PromptAlchemy",   href: ROOT + "prompt-alchemy.html" },
    "ondc-demo":        { label: "ONDC Demo",       href: ROOT + "ONDC-demo.html" },
    "engine-license":   { label: "Engine License",  href: ROOT + "engine-license.html" },
  };

  /* ── UTILS ───────────────────────────────────────────────── */
  function currentSlug() {
    return location.pathname.split("/").pop().replace(/\.html?$/i, "").toLowerCase();
  }

  function isBlogPage() {
    var p = location.pathname.toLowerCase();
    return p.indexOf("/blogs/") >= 0 || p.indexOf("/blog/") >= 0 ||
           p.indexOf("/posts/") >= 0 || p.indexOf("/notes/") >= 0;
  }

  function getPageLabel() {
    var slug = currentSlug();
    if (PAGES[slug]) return PAGES[slug].label;
    /* Try to get it from <title> or <h1> */
    var t = document.title || "";
    t = t.split("|")[0].split("—")[0].split("·")[0].trim();
    if (t && t.toLowerCase() !== "viadecide") return t;
    /* Humanize slug */
    return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function getAffTag() {
    try {
      var u = new URL(location.href);
      return u.searchParams.get("tag") || localStorage.getItem("affiliateTag") || "viadecide";
    } catch (e) { return "viadecide"; }
  }

  function tagged(href) {
    try {
      var base = /^https?:\/\//i.test(href) ? href : new URL(href, location.href).href;
      var u = new URL(base);
      if (!u.searchParams.get("tag")) u.searchParams.set("tag", getAffTag());
      return u.href;
    } catch (e) { return href; }
  }

  /* ── SVG MARK (tiny, 28px) ───────────────────────────────── */
  var MARK_SVG = '<img src="data:image/png;base64,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Llq/nve+9728+/TTWbp0KTfddBO+7/O9O77HQw/9B48+9ijr16+nWCpx+eWX88orr7BlyxZuuWUDnuvS19dLsVRi+fLlvPjiC2zZsoXvfOc77N9/gOnpGdavX88TTzzJpk2buO222zCxlUoN18/ly5T2IqaavtJeYRiSyWR46qmnWLJkCQsXLmTVqlUEgc//bNvGhz70IQYXD7Jz504ee+wxHnjgAU4//d2sW7eOqakpjOOwsLeX7u5upqanue/ee1m9ejVXXnEln/7LT7NhwwZ+/atfs3HjRj74gQ9w++13cPPNN3PFF77AW398i0wmw8c++jGO6O/n+9+/k127dnHppZfy9ttv093dzdIlS7j//vtjhd3CX3/uc3z1q9dSKpdxHLeZvZO5GFOV2W3TsYsAiuNQLBZ56aWXuPDCC1m8eDGPP/YYIsLs7CylUok1a9ZwzjnnsGPHDoLAJ5/vwoYhYRAwOjpKIaa9PvHJT7J161ZOXn4y09PTnHLKSvyKz6233sqq1auZmppk48aNALz6m9/Q3dXFyOgInudxwgnL2LDhFrZt28b9P7qf97///SxZsoTe3l4c1+H001fzbz/4Adu3b49iSZJ51Rbd9ogW17YdFBuGeJ7Hgw8+yBVXXMmKFSt47vnnUVXy+TxqlYsuuog//elPPP300yxc2IvruChKb18vd911F3fffTevvvoqxxxzDN+6/noe+tlD5HI5HMelq7uL7UND3HPPPczMFHjkkUe488472bx5M67ncdRRR1GplLn33vu49957ufHGG/nh3T9kcHCQ115/jWefeZZVp62iUvHJ5XI8/PB/YowkiihpOz2VyAKSaHQ0fYnZ2VkmJ8Z56Ze/ZHh4GMcYAt9n957d/Orll3nfunWcsGwZv3n1VV577TWmpibZu2cvkxMTzExP8+QTP+eaa65mcmKM3buHef6551h73nlUyiWee3Yze/fu4Sc/2ciRixbhuS7fu+MOdu3cxd49e3jjjd/x6COPsH//fgYXL+a+++7jySef5M033+SnDz5IX38/xx9/HM8++yzbtm1LocylroCqOxNH5KbBB02pDaosbzabreVo1/MIrUXDMEkL4zgOYaWeFTZicB0XB0spCOru4boeQRACc6brZXP45RLieHgZl0qxWLdeLpfDqlJJsM/VZ+uEE0wgwc7YH8dxIiZWLQZwHINRxTFCxjEYlIwjOFg8A105l4xn6M555DyXLldYuiDDcX15Fg0cQahwYGyc7WNFRgsBhUqAb0OKlZBi2adYCVEMRd8ShIoag0XwbUSq+mEYI08HFSEMbQ0dti0SEojOTeJqSdDjaYtYa3FM1Ak0Jpredgy4oogNcURxMXiiZB3IiaXLFRZkYEFO6M97LF2Y4dhFPRwz2IdroFeKYAOyrmGipMyUQlwUx4KHoVQJEQM+iq8WP1QMgrURpx8qhGGARSL+IBZCROoRpkgNYmti9r7mAhILWK39peo3salonBarqdEPAlzXJQzDqF5wHdQqYWijv5XILazFdQzYyCo8AU8s2fiePlBWoRIq1jgoQhCGGM+LWuSeG++yYIOwVgNU05gAJp5yEIEgCCP3CwJcz605dxhGx4MgqHWlUI0UUB1cyOfz2DBEjCEMA8IgxLfgmAhI9Pb20tfby/DuYQYHFzM2dpAFPT2IGCanJsl4GRYs6OHg6EEAehb00JXLMTY+Ri6bo1ScjQobhIqFjAEjgue65LJZyuUSIkJf/wCjBw/S29fH6OgorudRLlfo7+9nplCgd+FC/CAgDINaLBKJuMn+/n4mJycYGFjEyMhIbT6wr6+PyYkJjhgYYHZ2lomJ8SoMd25wjMEPfC655BP09/dHCND3mSnMctZgBtcYxmYrrFyxkqXHHktPdzdrzljD6MgBlq9YyZ49e+IOUI7Vq05ntjjL0YODHH30IAOLFtHV1c25a9+HqrJjeJi+fIY1i4S3JwN6urpYvGQJy951Eme/51xmiyWWrzyVvfv28ReXfIJdw7v58IfPx6rl6KOOxo1Tp4hwxhlrGBhYRC6XZ3BwkGOOOYZKpcLsbJET33UiQRCw/OTluK7L+R85n1KpxNnn/BkjIweYiLlLx3GcG1Qt2UyW0FrGxg4yPT1NoRCxtsUACj4ECl7GwxiHHTt2YBzDvn37sFYJgpDJiXFmpqfxMlkmJsc5ODZGGEYutX3724yNHaRYKjI1OQVimKooFVtFqZbdu3czPTPDwYOjDA0NUSgUmJicYKYwzfT0FBMTExQKMwDs3j1MoVBgtlhk3759lEolfN9neHiYvr4+Rg4cYHxinMJMgf6BAXbt3MnY2BgHDhzA9yuMj49TKBSipJ9Mg5VKBWMEY5yIyRUh0Ig5NUaiYGNtRIWHNooBNoyRl2IcQxiE8RoGtRZFcYzB2hABPC8DqoQKrhOVzaG1IILv+7iOG+VrY6hUKriuS8X3McaJKfioGgUIAh+RiNfVWvyau7eI4Ac+rusS+HMxy3XduRiSVIBJkJGa0oCPgo3MFRvxp0gjlwgGrfULJaZmhUjgua6zRi30hk50lSMQiRFd/Bl11hMt0YbfClUzmFWbHv3jgkgTVHwUBOftCTczktWOiklMbUk8cmIkIjkdERwB10SfGQN5BxZ60O0JrkApVKZ9mA2gYhXfQqBCYJVAIYwFswqhRlS5JgRWTR+Pq7bh0wapEtOz9YOSqYI3Tm/ErlFthTsS5WPXCBkTCZlzocuBBS4s8JTerKE3DwM9wtELDcsG+1k6eALZTIYD+3exa3yc/ZM+47MVDs5YCiWYKlqmK0rBjwYmZkMoh1C2SqARGApjxWisnEhom+AYtXlWrGFQMnaBFj9Zk9YUrMS7T8POG4mswzWCJ1Fry63lf8gbJe9Clxu5ScUKpVAoWSiFULGRJQQaxZ/QRsKFzAmb5JOTVpBkUzWeiNJ5hl3rYkD7qVhJaYkn+2sJn5dIOCOmTikSu4aR6qxG1NCMhIr9PN5VmzT7ugmvuc1SWz82WGWUay6tOu8PL9xOh5MbuYJqQAKwVUuo9QMFRbAooomhJyAUQSQaUZU64bQmjI2PJ3c8ySCnjUBqwuxrSkr82LLVrLLb2e63mA7TeuaxNsKmjeOsmujjaV1fzyZmn+rmgzWx66qotGN406fI2xY2SQVICw1JWhElNP1gUBvCbe20SurErsRSSMNomzb0qOaGGqv3aBiTbDkeIx0JHytA0RblcNoadX2Quh8MVsfPJDFpnvBJpe63VyLUur/16VxiEZt/yaCq7WbfU61ivj7h/wJkTzoQXFIPlQAAAABJRU5ErkJggg==" width="30" height="30" alt="ViaDecide" style="border-radius:8px;flex-shrink:0;display:block;"/>';

  /* ── CSS ─────────────────────────────────────────────────── */
  var CSS = [
    ':root{--vd-bg:#080808;--vd-surface:rgba(13,13,13,.88);--vd-border:rgba(255,255,255,.08);',
    '--vd-text:#f0f0f0;--vd-muted:rgba(240,240,240,.5);--vd-accent:#ff671f;}',

    '#vd-nav{',
    'position:fixed;top:0;left:0;right:0;z-index:9999;',
    'height:52px;',
    'display:flex;align-items:center;gap:0;',
    'background:rgba(8,8,8,.82);',
    'backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);',
    'border-bottom:1px solid var(--vd-border);',
    'padding:0 16px;',
    'font-family:"DM Sans",-apple-system,BlinkMacSystemFont,sans-serif;',
    '-webkit-font-smoothing:antialiased;',
    'box-shadow:0 4px 24px rgba(0,0,0,.4);',
    '}',

    /* Back button */
    '#vd-back{',
    'display:inline-flex;align-items:center;gap:6px;',
    'padding:7px 12px;border-radius:8px;',
    'border:1px solid var(--vd-border);background:rgba(255,255,255,.05);',
    'color:var(--vd-text);font-size:12px;font-weight:700;letter-spacing:.04em;',
    'text-decoration:none;cursor:pointer;white-space:nowrap;flex-shrink:0;',
    'transition:background 130ms ease,border-color 130ms ease;',
    '}',
    '#vd-back:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.14);}',
    '#vd-back:active{transform:translateY(1px);}',
    '#vd-back .vd-arr{font-size:14px;color:var(--vd-accent);line-height:1;}',

    /* Divider */
    '.vd-div{width:1px;height:22px;background:var(--vd-border);margin:0 12px;flex-shrink:0;}',

    /* Brand */
    '#vd-brand{display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0;}',
    '#vd-brand .vd-name{font-size:13px;font-weight:700;color:var(--vd-text);white-space:nowrap;}',
    '#vd-brand .vd-name span{font-weight:300;color:var(--vd-muted);}',

    /* Breadcrumb */
    '#vd-crumb{',
    'display:flex;align-items:center;gap:6px;flex:1;min-width:0;margin-left:14px;',
    'font-size:11px;color:var(--vd-muted);overflow:hidden;',
    '}',
    '#vd-crumb .vd-sep{opacity:.4;}',
    '#vd-crumb .vd-cur{',
    'color:rgba(240,240,240,.78);font-weight:600;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    '}',
    '#vd-crumb.blog .vd-cur{color:rgba(255,140,60,.88);}',

    /* Quick links (desktop only) */
    '#vd-links{display:none;align-items:center;gap:2px;flex-shrink:0;margin-left:auto;}',
    '@media(min-width:600px){#vd-links{display:flex;}}',
    '.vd-lnk{',
    'display:inline-flex;align-items:center;padding:5px 9px;border-radius:6px;',
    'font-size:11px;font-weight:600;color:var(--vd-muted);',
    'text-decoration:none;white-space:nowrap;',
    'transition:color 120ms ease,background 120ms ease;',
    '}',
    '.vd-lnk:hover{color:var(--vd-text);background:rgba(255,255,255,.06);}',
    '.vd-lnk.primary{',
    'background:rgba(255,103,31,.12);border:1px solid rgba(255,103,31,.3);',
    'color:rgba(255,140,60,.92);font-weight:800;margin-left:6px;',
    '}',
    '.vd-lnk.primary:hover{background:rgba(255,103,31,.2);}',

    /* Push page content down so nav doesn't overlap */
    'body.vd-nav-injected{padding-top:52px!important;}',

    /* Smooth transition on nav appear */
    '@keyframes vdNavIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}',
    '#vd-nav{animation:vdNavIn 280ms cubic-bezier(.22,1,.36,1) both;}',
  ].join("");

  /* ── BUILD NAV ───────────────────────────────────────────── */
  function buildNav() {
    /* Skip if a VD nav already exists */
    if (document.getElementById("vd-nav")) return;

    /* Skip if already in index.html (has its own topbar) */
    var slug = currentSlug();
    if (slug === "index" || slug === "") return;

    /* Inject CSS */
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    /* Back button logic */
    var canGoBack = window.history.length > 1;
    var backHref = tagged(ROOT + "index.html");
    var backLabel = canGoBack ? "Back" : "Home";

    /* If it's a blog post, back goes to blogs slide on index */
    if (isBlogPage()) {
      backHref = tagged(ROOT + "index.html") + "#blogs";
      backLabel = "All Blogs";
    }

    /* Nav element */
    var nav = document.createElement("nav");
    nav.id = "vd-nav";
    nav.setAttribute("role", "navigation");
    nav.setAttribute("aria-label", "ViaDecide navigation");

    /* ── Back button */
    var back = document.createElement("button");
    back.id = "vd-back";
    back.setAttribute("aria-label", backLabel);
    back.innerHTML = '<span class="vd-arr">←</span>' + backLabel;
    back.addEventListener("click", function () {
      if (canGoBack) {
        history.back();
      } else {
        location.href = backHref;
      }
    });

    /* ── Divider */
    var div1 = document.createElement("span");
    div1.className = "vd-div";
    div1.setAttribute("aria-hidden", "true");

    /* ── Brand */
    var brand = document.createElement("a");
    brand.id = "vd-brand";
    brand.href = tagged(ROOT + "index.html");
    brand.setAttribute("aria-label", "ViaDecide home");
    brand.innerHTML = MARK_SVG + '<span class="vd-name"><span>Via</span>Decide</span>';

    /* ── Breadcrumb */
    var crumb = document.createElement("div");
    crumb.id = "vd-crumb";
    if (isBlogPage()) crumb.classList.add("blog");
    var pageLabel = getPageLabel();
    crumb.innerHTML = [
      '<span class="vd-sep" aria-hidden="true">/</span>',
      '<span class="vd-cur" title="' + pageLabel + '">' + pageLabel + '</span>',
    ].join("");

    /* ── Quick links */
    var links = document.createElement("div");
    links.id = "vd-links";
    links.innerHTML = [
      '<a class="vd-lnk" href="' + tagged(ROOT + "index.html") + '">Home</a>',
      '<a class="vd-lnk" href="' + tagged(ROOT + "student-research.html") + '">Research</a>',
      '<a class="vd-lnk" href="' + tagged(ROOT + "decision-brief.html") + '">Brief</a>',
      '<a class="vd-lnk" href="' + tagged(ROOT + "alchemist.html") + '">Quiz</a>',
      '<a class="vd-lnk primary" href="' + tagged(ROOT + "student-research.html") + '">START →</a>',
    ].join("");

    /* Assemble */
    nav.appendChild(back);
    nav.appendChild(div1);
    nav.appendChild(brand);
    nav.appendChild(crumb);
    nav.appendChild(links);

    /* Inject at top of body */
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add("vd-nav-injected");
  }

  /* ── BLOG PAGE SPECIFIC FIXES ────────────────────────────── */
  function fixBlogNavLinks() {
    if (!isBlogPage()) return;

    /* Tag all relative links */
    var aff = getAffTag();
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (a.hasAttribute("data-no-aff")) return;
      try {
        var u = new URL(href, location.href);
        if (!u.searchParams.get("tag")) u.searchParams.set("tag", aff);
        /* Make hrefs relative-friendly (from /blogs/ to root) */
        a.href = u.href;
      } catch (e) {}
    });
  }

  /* ── ALSO FIX EXISTING DISABLED/BROKEN BACK BUTTONS ────────
     Finds any element that looks like a back button and wires it up.
  ─────────────────────────────────────────────────────────── */
  function fixExistingBackButtons() {
    var selectors = [
      '[data-action="back"]',
      '[aria-label*="back" i]',
      '[aria-label*="Back" i]',
      '.back-btn', '.btn-back', '.nav-back',
      '#backBtn', '#back-btn', '#goBack',
    ];

    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          /* Only wire if not already handled */
          if (el.dataset.vdFixed) return;
          el.dataset.vdFixed = "1";
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";
          el.removeAttribute("disabled");
          el.addEventListener("click", function (e) {
            e.preventDefault();
            if (window.history.length > 1) {
              history.back();
            } else {
              location.href = tagged(ROOT + "index.html");
            }
          });
        });
      } catch (e) {}
    });
  }

  /* ── RUN ─────────────────────────────────────────────────── */
  function init() {
    buildNav();
    fixExistingBackButtons();
    fixBlogNavLinks();

    /* Re-run after a short delay in case the page renders late */
    setTimeout(function () {
      fixExistingBackButtons();
    }, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ── EXPOSE ──────────────────────────────────────────────── */
  window.VDNav = { refresh: init, root: ROOT };

})();
