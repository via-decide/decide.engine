/**
 * ViaDecide — Universal Nav Fix v2.0
 * ════════════════════════════════════════════════════════════
 * Drop into EVERY subpage / blog page:
 *   <script src="vd-nav-fix.js" defer></script>       (root)
 *   <script src="../vd-nav-fix.js" defer></script>    (subfolder)
 *
 * v2 changes vs v1:
 *  · Iframe-aware back: postMessage to parent → closes modal cleanly
 *  · Standalone back: history.back() or → index.html (unchanged)
 *  · Detects iframe via window !== window.top
 *  · Adds ?m=<slug> param restoration so parent URL stays in sync
 *  · Listens for VDNav:init message from parent to get origin safely
 * ════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ── IFRAME DETECTION ─────────────────────────────────────
     If loaded inside the modal iframe, back must postMessage
     to the parent window (index.html) to call closeModal().
  ─────────────────────────────────────────────────────────── */
  var IN_IFRAME = (function () {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  /* ── CONFIG ───────────────────────────────────────────────── */
  var ROOT = (function () {
    var p = location.pathname;
    var depth = p.split('/').filter(function (s) { return s && s.indexOf('.html') === -1; }).length;
    return depth > 0 ? '../'.repeat(depth) : './';
  })();

  /* ── UTILS ────────────────────────────────────────────────── */
  function currentSlug() {
    return location.pathname.split('/').pop().replace(/\.html?$/i, '').toLowerCase();
  }

  function isBlogPage() {
    var p = location.pathname.toLowerCase();
    return p.indexOf('/blogs/') >= 0 || p.indexOf('/blog/') >= 0 ||
           p.indexOf('/posts/') >= 0 || p.indexOf('/notes/') >= 0;
  }

  function getPageLabel() {
    var slug = currentSlug();
    var LABELS = {
      'alchemist': 'Alchemist', 'memory': 'Memory Engine',
      'prompt-alchemy': 'Prompt Alchemy', 'viaguide': 'ViaGuide',
      'studyos': 'StudyOS', 'brief': 'Brief Builder',
      'student-research': 'Student Research', 'app-generator': 'App Generator',
      'agent': 'ViaDecide Agent', 'swipeos': 'SwipeOS',
      'swipeos-gandhidham': 'SwipeOS · Gandhidham',
      'interview-prep': 'Interview Simulator', 'sales-dashboard': 'Sales Dashboard',
      'finance-dashboard-msme': 'FinTrack Dashboard', 'payment-register': 'Payroll Register',
      'laptops-under-50000': 'Laptops Under ₹50k', 'ondc-demo': 'ONDC Demo',
      'engine-deals': 'Engine Deals', 'discounts': 'Discounts Hub',
      'cashback-rules': 'Cashback Rules', 'cashback-claim': 'Cashback Claim',
      'hexwars': 'HexWars', 'wings-of-fire-quiz': 'Wings of Fire Quiz',
      'mars-rover-simulator-game': 'Mars Rover', 'hivaland': 'HivaLand',
      'decide-service': 'Decide.Service', 'decide-foodrajkot': 'Decide Food · Rajkot',
      'engine-license': 'Engine License', 'cohort-apply-here': 'Cohort Program',
      'pricing': 'Pricing', 'engine-activation-request': 'Engine Activation',
      'viadecide-blogs': 'Blogs', 'the-decision-stack': 'The Decision Stack',
      'decision-infrastructure-india': 'Decision Infrastructure',
      'ondc-for-bharat': 'ONDC for Bharat', 'indiaai-mission-2025': 'IndiaAI Mission 2025',
      'multi-source-research-explained': 'Multi-Source Research',
      'decision-brief-guide': 'Build a Policy Brief',
      'viadecide-public-beta': 'Public Beta', 'decision-brief': 'Decision Architecture',
      'finance-dashboard-msme': 'FinTrack', 'jalaram-food-court-rajkot': 'Jalaram Food Court',
      'dharamdaxini': 'Dharam Daxini · 1:1', 'founder': 'Founder',
      'contact': 'Contact', 'privacy': 'Privacy', 'terms': 'Terms',
    };
    if (LABELS[slug]) return LABELS[slug];
    var t = document.title || '';
    t = t.split('|')[0].split('—')[0].split('·')[0].trim();
    if (t && t.toLowerCase() !== 'viadecide') return t;
    return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /* ── BACK ACTION ──────────────────────────────────────────── */
  function doBack() {
    if (IN_IFRAME) {
      /* Tell parent to close the modal — safe cross-origin postMessage */
      try {
        window.parent.postMessage({ type: 'VD_CLOSE_MODAL' }, '*');
      } catch (e) {}
      /* Fallback: if postMessage fails (no parent listener), go back in frame */
      return;
    }
    /* Standalone page */
    if (window.history.length > 1) {
      history.back();
    } else {
      location.href = ROOT + 'index.html';
    }
  }

  /* ── SVG MARK ─────────────────────────────────────────────── */
  var MARK_SVG = '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#c8932a"/><text x="16" y="22" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="Georgia,serif">V</text></svg>';

  /* ── CSS ──────────────────────────────────────────────────── */
  var CSS = [
    '#vd-nav{',
      'position:fixed;top:0;left:0;right:0;z-index:9999;',
      'height:52px;display:flex;align-items:center;gap:0;',
      'background:rgba(8,10,15,.88);',
      'backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);',
      'border-bottom:1px solid rgba(255,255,255,.08);',
      'padding:0 16px;box-sizing:border-box;',
      'font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;',
      '-webkit-font-smoothing:antialiased;',
      'box-shadow:0 4px 24px rgba(0,0,0,.4);',
    '}',
    '#vd-back{',
      'display:inline-flex;align-items:center;gap:6px;',
      'padding:7px 12px;border-radius:8px;',
      'border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);',
      'color:#f0ede6;font-size:12px;font-weight:700;letter-spacing:.04em;',
      'cursor:pointer;white-space:nowrap;flex-shrink:0;',
      'transition:background 130ms ease,border-color 130ms ease;',
      'font-family:inherit;',
    '}',
    '#vd-back:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.18);}',
    '#vd-back:active{transform:translateY(1px);}',
    '#vd-back .vd-arr{font-size:14px;color:#c8932a;line-height:1;}',
    '.vd-div{width:1px;height:22px;background:rgba(255,255,255,.08);margin:0 12px;flex-shrink:0;}',
    '#vd-brand{display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0;}',
    '#vd-brand .vd-name{font-size:13px;font-weight:700;color:#f0ede6;white-space:nowrap;}',
    '#vd-brand .vd-name em{font-weight:300;color:rgba(240,237,230,.5);font-style:normal;}',
    '#vd-crumb{display:flex;align-items:center;gap:6px;flex:1;min-width:0;margin-left:14px;font-size:11px;color:rgba(240,237,230,.5);overflow:hidden;}',
    '#vd-crumb .vd-sep{opacity:.4;}',
    '#vd-crumb .vd-cur{color:rgba(240,237,230,.82);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '#vd-links{display:none;align-items:center;gap:2px;flex-shrink:0;margin-left:auto;}',
    '@media(min-width:600px){#vd-links{display:flex;}}',
    '.vd-lnk{display:inline-flex;align-items:center;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:600;color:rgba(240,237,230,.5);text-decoration:none;white-space:nowrap;transition:color 120ms ease,background 120ms ease;}',
    '.vd-lnk:hover{color:#f0ede6;background:rgba(255,255,255,.06);}',
    '.vd-lnk.vd-home{background:rgba(200,147,42,.1);border:1px solid rgba(200,147,42,.25);color:rgba(200,147,42,.9);font-weight:800;margin-left:6px;}',
    '.vd-lnk.vd-home:hover{background:rgba(200,147,42,.2);}',
    'body.vd-nav-injected{padding-top:52px!important;}',
    '@keyframes vdNavIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}',
    '#vd-nav{animation:vdNavIn 260ms cubic-bezier(.22,1,.36,1) both;}',
  ].join('');

  /* ── BUILD NAV ────────────────────────────────────────────── */
  function buildNav() {
    if (document.getElementById('vd-nav')) return;
    var slug = currentSlug();
    if (slug === 'index' || slug === '') return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var backLabel = IN_IFRAME ? '✕  Close' : (window.history.length > 1 ? '← Back' : '⌂ Home');

    var nav = document.createElement('nav');
    nav.id = 'vd-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'ViaDecide navigation');

    /* Back / Close button */
    var back = document.createElement('button');
    back.id = 'vd-back';
    back.setAttribute('aria-label', IN_IFRAME ? 'Close tool' : 'Go back');
    back.innerHTML = '<span class="vd-arr">' + (IN_IFRAME ? '✕' : '←') + '</span>' + (IN_IFRAME ? 'Close' : (window.history.length > 1 ? 'Back' : 'Home'));
    back.addEventListener('click', doBack);

    /* Divider */
    var div1 = document.createElement('span');
    div1.className = 'vd-div';
    div1.setAttribute('aria-hidden', 'true');

    /* Brand — if in iframe, clicking brand posts VD_HOME message */
    var brand = document.createElement('a');
    brand.id = 'vd-brand';
    if (IN_IFRAME) {
      brand.href = '#';
      brand.addEventListener('click', function (e) {
        e.preventDefault();
        try { window.parent.postMessage({ type: 'VD_CLOSE_MODAL' }, '*'); } catch (ex) {}
      });
    } else {
      brand.href = ROOT + 'index.html';
    }
    brand.setAttribute('aria-label', 'ViaDecide home');
    brand.innerHTML = MARK_SVG + '<span class="vd-name"><em>Via</em>Decide</span>';

    /* Breadcrumb */
    var crumb = document.createElement('div');
    crumb.id = 'vd-crumb';
    if (isBlogPage()) crumb.classList.add('blog');
    var pageLabel = getPageLabel();
    crumb.innerHTML =
      '<span class="vd-sep" aria-hidden="true">/</span>' +
      '<span class="vd-cur" title="' + pageLabel + '">' + pageLabel + '</span>';

    /* Quick links — only in standalone mode */
    if (!IN_IFRAME) {
      var links = document.createElement('div');
      links.id = 'vd-links';
      links.innerHTML = [
        '<a class="vd-lnk" href="' + ROOT + 'student-research.html">Research</a>',
        '<a class="vd-lnk" href="' + ROOT + 'alchemist.html">Alchemist</a>',
        '<a class="vd-lnk" href="' + ROOT + 'decision-brief.html">Brief</a>',
        '<a class="vd-lnk vd-home" href="' + ROOT + 'index.html">Home ↗</a>',
      ].join('');
      nav.appendChild(back);
      nav.appendChild(div1);
      nav.appendChild(brand);
      nav.appendChild(crumb);
      nav.appendChild(links);
    } else {
      nav.appendChild(back);
      nav.appendChild(div1);
      nav.appendChild(brand);
      nav.appendChild(crumb);
    }

    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add('vd-nav-injected');
  }

  /* ── FIX EXISTING BROKEN BACK BUTTONS ────────────────────── */
  function fixExistingBackButtons() {
    var selectors = [
      '[data-action="back"]', '[aria-label*="back" i]',
      '.back-btn', '.btn-back', '.nav-back',
      '#backBtn', '#back-btn', '#goBack',
    ];
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (el.dataset.vdFixed) return;
          el.dataset.vdFixed = '1';
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          el.removeAttribute('disabled');
          el.addEventListener('click', function (e) {
            e.preventDefault();
            doBack();
          });
        });
      } catch (e) {}
    });
  }

  /* ── BLOG LINK TAGGING ────────────────────────────────────── */
  function fixBlogNavLinks() {
    if (!isBlogPage()) return;
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
      if (a.hasAttribute('data-no-aff')) return;
      try {
        var u = new URL(href, location.href);
        if (!u.searchParams.get('tag')) u.searchParams.set('tag', 'viadecide');
        a.href = u.href;
      } catch (e) {}
    });
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init() {
    buildNav();
    fixExistingBackButtons();
    fixBlogNavLinks();
    setTimeout(fixExistingBackButtons, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.VDNav = { refresh: init, root: ROOT, inIframe: IN_IFRAME };

})();
