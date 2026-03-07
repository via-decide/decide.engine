/**
 * ViaDecide Router — VDRouter v3.0
 * ════════════════════════════════════════════════════════════
 * SPA router for the ViaDecide modular platform.
 *
 * Features:
 *  · pushState routing  — URL updates on every navigation
 *  · popstate handler   — browser back/forward works correctly
 *  · Modal overlay nav  — tools open in iframe modal, URL synced
 *  · Dynamic module load — fetches /modules/*.html into #app
 *  · GitHub Pages 404   — sessionStorage redirect restore
 *  · Prefetch on hover  — <link rel="prefetch"> for speed
 *  · Event bus          — VDRouter.on() / VDRouter.emit()
 *  · Full routesMap     — all ViaDecide slugs registered
 *
 * Backward-compatible API surface (same as v2):
 *  VDRouter.go(slug, options)
 *  VDRouter.openOverlay(file, options)
 *  VDRouter.resolve(slugOrPath)
 *  VDRouter.prefetch(slug)
 *  VDRouter.routes()
 *  VDRouter.on(event, cb)
 *  VDRouter.emit(event, data)
 *  VDRouter.bindLinks()
 *  VDRouter.init()
 *
 * New in v3:
 *  VDRouter.navigate(path, push)   — raw SPA navigate
 *  VDRouter.back()                 — history.back() w/ fallback
 *  VDRouter.current()              — current route string
 * ════════════════════════════════════════════════════════════
 */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════
   * ROUTE REGISTRY
   * Maps slug → HTML file (relative to site root, no leading /)
   * ══════════════════════════════════════════════════════════ */
  var routesMap = {
    // Decision Tools
    'alchemist':                      'alchemist.html',
    'memory':                         'memory.html',
    'prompt-alchemy':                 'prompt-alchemy.html',
    'viaguide':                       'ViaGuide.html',
    'studyos':                        'StudyOS.html',
    'brief':                          'brief.html',
    'student-research':               'student-research.html',
    'app-generator':                  'app-generator.html',
    'agent':                          'agent.html',
    'swipeos':                        'SwipeOS.html',
    'swipeos-gandhidham':             'SwipeOS-gandhidham.html',
    'interview-prep':                 'interview-prep.html',
    'sales-dashboard':                'sales-dashboard.html',
    'finance-dashboard-msme':         'finance-dashboard-msme.html',
    'payment-register':               'payment-register.html',
    'laptops-under-50000':            'laptops-under-50000.html',
    // Commerce
    'ondc-demo':                      'ONDC-demo.html',
    'engine-deals':                   'engine-deals.html',
    'discounts':                      'discounts.html',
    'cashback-rules':                 'cashback-rules.html',
    'cashback-claim':                 'cashback-claim.html',
    // Games & Sims
    'hexwars':                        'HexWars.html',
    'mars-rover-simulator-game':      'mars-rover-simulator-game.html',
    'hivaland':                       'HivaLand.html',
    // Services
    'decide-service':                 'decide-service.html',
    'decide-foodrajkot':              'decide-foodrajkot.html',
    'engine-license':                 'engine-license.html',
    'cohort-apply-here':              'cohort-apply-here.html',
    'customswipeengineform':          'CustomSwipeEngineForm.html',
    'pricing':                        'pricing.html',
    'engine-activation-request':      'Engine Activation Request.html',
    // Store
    'printbydd-store':                'printbydd-store/index.html',
    'numberplate':                    'printbydd-store/numberplate.html',
    'keychain':                       'printbydd-store/keychain.html',
    'gifts-that-mean-more':           'printbydd-store/gifts-that-mean-more.html',
    'smarttag-lite':                  'printbydd-store/smarttag-lite.html',
    'products':                       'printbydd-store/products.html',
    'gift-psychology':                'printbydd-store/gift-psychology.html',
    // Blog & Content
    'viadecide-blogs':                'Viadecide-blogs.html',
    'the-decision-stack':             'The Decision Stack.html',
    'decision-infrastructure-india':  'decision-infrastructure-india.html',
    'ondc-for-bharat':                'ondc-for-bharat.html',
    'indiaai-mission-2025':           'indiaai-mission-2025.html',
    'multi-source-research-explained':'multi-source-research-explained.html',
    'decision-brief-guide':           'decision-brief-guide.html',
    'viadecide-public-beta':          'viadecide-public-beta.html',
    'decision-brief':                 'decision-brief.html',
    // Finance
    'jalaram-food-court-rajkot':      'Jalaram-food-court-rajkot.html',
    // Personal
    'dharamdaxini':                   'DharamDaxini/index.html',
    'dharamdaxini-legacy':            'DharamDaxini.html',
    'founder':                        'founder.html',
    // Utility
    'contact':                        'contact.html',
    'privacy':                        'privacy.html',
    'terms':                          'terms.html',
  };

  /* Module metadata — icon + display name per slug */
  var moduleMetaMap = {
    'alchemist':                      { icon: '✨', name: 'Alchemist' },
    'memory':                         { icon: '🧠', name: 'Memory Engine' },
    'prompt-alchemy':                 { icon: '⚗️', name: 'Prompt Alchemy' },
    'viaguide':                       { icon: '📚', name: 'ViaGuide' },
    'studyos':                        { icon: '📖', name: 'StudyOS' },
    'brief':                          { icon: '📋', name: 'Decision Brief' },
    'student-research':               { icon: '🔬', name: 'Student Research' },
    'app-generator':                  { icon: '🔧', name: 'App Generator' },
    'agent':                          { icon: '✦',  name: 'ViaDecide Agent' },
    'swipeos':                        { icon: '👆', name: 'SwipeOS' },
    'ondc-demo':                      { icon: '🛒', name: 'ONDC Demo' },
    'engine-deals':                   { icon: '🤝', name: 'Engine Deals' },
    'discounts':                      { icon: '🏷️', name: 'Discounts Hub' },
    'cashback-rules':                 { icon: '💸', name: 'Cashback Rules' },
    'cashback-claim':                 { icon: '🧾', name: 'Cashback Claim' },
    'hexwars':                        { icon: '⬡',  name: 'HexWars' },
    'mars-rover-simulator-game':      { icon: '🚀', name: 'Mars Rover' },
    'hivaland':                       { icon: '🌍', name: 'HivaLand' },
    'decide-service':                 { icon: '🎯', name: 'Decide.Service' },
    'decide-foodrajkot':              { icon: '🍽️', name: 'Decide Food · Rajkot' },
    'engine-license':                 { icon: '⚙️', name: 'Engine License' },
    'cohort-apply-here':              { icon: '🧪', name: 'Cohort Program' },
    'pricing':                        { icon: '💰', name: 'Pricing' },
    'engine-activation-request':      { icon: '⚡', name: 'Engine Activation' },
    'printbydd-store':                { icon: '🛍️', name: 'PrintByDD Store' },
    'numberplate':                    { icon: '🚗', name: 'Numberplates' },
    'keychain':                       { icon: '🔑', name: 'NFC Keychains' },
    'gifts-that-mean-more':           { icon: '🎁', name: 'Gifts That Mean More' },
    'smarttag-lite':                  { icon: '📲', name: 'SmartTag Lite' },
    'products':                       { icon: '🛍️', name: 'All Products' },
    'viadecide-blogs':                { icon: '✍️', name: 'ViaDecide Blogs' },
    'the-decision-stack':             { icon: '📚', name: 'The Decision Stack' },
    'decision-infrastructure-india':  { icon: '🏛️', name: 'Decision Infrastructure' },
    'ondc-for-bharat':                { icon: '🇮🇳', name: 'ONDC for Bharat' },
    'indiaai-mission-2025':           { icon: '🤖', name: 'IndiaAI Mission 2025' },
    'multi-source-research-explained':{ icon: '🔍', name: 'Multi-Source Research' },
    'decision-brief-guide':           { icon: '📋', name: 'Build a Policy Brief' },
    'viadecide-public-beta':          { icon: '🚀', name: 'Public Beta' },
    'decision-brief':                 { icon: '🏗️', name: 'Decision Architecture' },
    'finance-dashboard-msme':         { icon: '💰', name: 'FinTrack Dashboard' },
    'sales-dashboard':                { icon: '📊', name: 'MSME Sales Dashboard' },
    'payment-register':               { icon: '👥', name: 'Payroll Register' },
    'interview-prep':                 { icon: '🎤', name: 'Interview Simulator' },
    'jalaram-food-court-rajkot':      { icon: '🍽️', name: 'Jalaram Food Court' },
    'dharamdaxini':                   { icon: '🧭', name: 'Dharam Daxini · 1:1' },
    'founder':                        { icon: '👤', name: 'Founder' },
    'contact':                        { icon: '✉️', name: 'Contact' },
    'privacy':                        { icon: '🔒', name: 'Privacy' },
    'terms':                          { icon: '📄', name: 'Terms' },
    'laptops-under-50000':            { icon: '💻', name: 'Laptops Under ₹50,000' },
    'customswipeengineform':          { icon: '👆', name: 'Custom Swipe Engine' },
    'hivaland':                       { icon: '🌍', name: 'HivaLand' },
  };

  /* ══════════════════════════════════════════════════════════
   * INTERNAL STATE
   * ══════════════════════════════════════════════════════════ */
  var _events           = {};
  var _prefetched       = {};
  var _currentRoute     = null;
  var _originalCloseModal = null;
  var _isNavigating     = false;

  /* ══════════════════════════════════════════════════════════
   * EVENT BUS
   * ══════════════════════════════════════════════════════════ */
  function on(event, cb) {
    if (!_events[event]) _events[event] = [];
    _events[event].push(cb);
  }

  function emit(event, data) {
    var handlers = _events[event];
    if (handlers) handlers.forEach(function (cb) { cb(data); });
  }

  /* ══════════════════════════════════════════════════════════
   * ROUTE RESOLUTION
   * ══════════════════════════════════════════════════════════ */
  function resolve(pathOrSlug) {
    if (!pathOrSlug) return '';
    var clean = pathOrSlug.replace(/^\/+|\/+$/g, '');
    var lowerSlug = clean.toLowerCase()
      .replace(/\.html?$/i, '')
      .replace(/\/index$/i, '');
    if (routesMap[lowerSlug]) return routesMap[lowerSlug];
    if (clean.endsWith('.html') || clean.endsWith('.htm')) return clean;
    if (clean.endsWith('/index')) return clean + '.html';
    if (clean.indexOf('/') === -1) return clean + '.html';
    return clean + '/index.html';
  }

  /* ══════════════════════════════════════════════════════════
   * PREFETCH
   * ══════════════════════════════════════════════════════════ */
  function prefetch(slug) {
    var file = resolve(slug);
    if (!file || _prefetched[file]) return;
    _prefetched[file] = true;
    var link = document.createElement('link');
    link.rel  = 'prefetch';
    link.href = file;
    link.as   = 'document';
    document.head.appendChild(link);
  }

  /* ══════════════════════════════════════════════════════════
   * openOverlay() — open a file in the iframe modal
   * ══════════════════════════════════════════════════════════ */
  function openOverlay(file, options) {
    options = options || {};
    var icon = '🔬';
    var name = 'Tool';

    if (options.title) {
      var t = options.title;
      var thinIdx = t.indexOf('\u2009');
      if (thinIdx !== -1) {
        icon = t.slice(0, thinIdx);
        name = t.slice(thinIdx + 1);
      } else {
        var match = t.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\S)\s*(.*)/);
        if (match) { icon = match[1]; name = match[2]; }
        else        { name = t; }
      }
    }

    // Sync URL
    var url = new URL(window.location.href);
    url.searchParams.delete('m');
    url.searchParams.set('m', encodeURIComponent(file));

    var curState = window.history.state;
    if (!curState || curState.file !== file) {
      window.history.pushState({ modalOpen: true, file: file, icon: icon, name: name }, '', url.toString());
    }

    _currentRoute = file;

    if (typeof window._modalSetup === 'function') {
      window._modalSetup(file, icon, name);
    }

    emit('routechange', { type: 'overlay', file: file, icon: icon, name: name });
  }

  /* ══════════════════════════════════════════════════════════
   * go() — primary public navigation function
   * ══════════════════════════════════════════════════════════ */
  function go(slug, options) {
    options = options || {};
    var file = resolve(slug);

    if (options.overlay) {
      if (!options.title) {
        var meta = moduleMetaMap[slug.toLowerCase()];
        if (meta) options.title = meta.icon + '\u2009' + meta.name;
        else       options.title = slug.replace(/-/g, ' ');
      }
      openOverlay(file, options);
    } else {
      window.location.href = file;
    }
  }

  /* ══════════════════════════════════════════════════════════
   * navigate() — SPA pushState navigation (v3 new)
   * Loads /modules/<slug>.html into #app if available,
   * otherwise opens as overlay modal.
   * ══════════════════════════════════════════════════════════ */
  function navigate(path, push) {
    if (push === undefined) push = true;
    if (_isNavigating) return;

    var slug = (path || '').replace(/^\/+/, '').toLowerCase();
    if (!slug) return;

    _isNavigating = true;
    _currentRoute = '/' + slug;

    if (push) {
      window.history.pushState({ route: slug }, '', '/' + slug);
    }

    var moduleFile = 'modules/' + slug + '.html';

    _fetchModule(moduleFile, function (html) {
      if (html !== null) {
        var mount = document.getElementById('app');
        if (mount) _mountHTML(mount, html);
      } else {
        // No static module file — fall back to overlay modal
        var meta = moduleMetaMap[slug] || {};
        var file = resolve(slug);
        openOverlay(file, {
          title: (meta.icon || '🔬') + '\u2009' + (meta.name || slug.replace(/-/g, ' '))
        });
      }
      emit('routechange', { type: 'navigate', path: '/' + slug, slug: slug });
      _isNavigating = false;
    });
  }

  function _fetchModule(url, cb) {
    if (typeof fetch === 'undefined') { cb(null); return; }
    fetch(url)
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (html) { cb(html); })
      .catch(function () { cb(null); });
  }

  function _mountHTML(el, html) {
    el.style.transition = 'opacity 100ms ease, transform 100ms ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(6px)';
    setTimeout(function () {
      el.innerHTML = html;
      _executeScripts(el);
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }, 110);
  }

  function _executeScripts(container) {
    var scripts = Array.prototype.slice.call(container.querySelectorAll('script'));
    scripts.forEach(function (old) {
      var n = document.createElement('script');
      var attrs = Array.prototype.slice.call(old.attributes);
      attrs.forEach(function (a) { n.setAttribute(a.name, a.value); });
      n.textContent = old.textContent;
      old.parentNode.replaceChild(n, old);
    });
  }

  /* ══════════════════════════════════════════════════════════
   * back() / current() / routes()
   * ══════════════════════════════════════════════════════════ */
  function back() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'index.html';
  }

  function current() { return _currentRoute; }
  function routes()  { return routesMap; }

  /* ══════════════════════════════════════════════════════════
   * bindLinks() — wire <a data-router> elements
   * ══════════════════════════════════════════════════════════ */
  function bindLinks() {
    document.querySelectorAll('a[data-router]').forEach(function (el) {
      if (el._routerBound) return;
      el._routerBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var slug = el.getAttribute('href').replace(/^\/+/, '');
        var isOverlay = el.hasAttribute('data-overlay');
        go(slug, { overlay: isOverlay });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
   * POPSTATE — back/forward button handler
   * ══════════════════════════════════════════════════════════ */
  function _handlePopState() {
    window.addEventListener('popstate', function (e) {
      var state = e.state || {};

      if (state.modalOpen) {
        // Forward nav: re-open the modal
        if (typeof window._modalSetup === 'function') {
          window._modalSetup(state.file, state.icon || '🔬', state.name || '');
        }
      } else if (state.route) {
        // SPA navigate forward
        navigate(state.route, false);
      } else {
        // Back out of modal: close it
        var closeFn = _originalCloseModal || global.closeModal;
        if (typeof closeFn === 'function') {
          closeFn();
        } else {
          var modal = document.getElementById('modal');
          if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            setTimeout(function () {
              var frame = document.getElementById('modal-frame');
              if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; }
              var err = document.getElementById('modal-err');
              if (err) err.classList.remove('show');
            }, 400);
          }
        }
        // Clean ?m= from URL
        var url = new URL(window.location.href);
        if (url.searchParams.has('m')) {
          url.searchParams.delete('m');
          var search = url.search && url.search !== '?' ? url.search : '';
          window.history.replaceState({ modalOpen: false }, '', url.pathname + search);
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
   * GitHub Pages 404 redirect restore
   * ══════════════════════════════════════════════════════════ */
  function _handle404Redirect() {
    try {
      var rp = sessionStorage.getItem('__vd_redirect__');
      if (!rp) return;
      sessionStorage.removeItem('__vd_redirect__');

      var params = new URLSearchParams(window.location.search);
      if (params.has('m')) return;

      var slug = rp.replace(/^\/+|\/+$/g, '').split('/')[0];
      if (!slug) return;

      var meta  = moduleMetaMap[slug] || {};
      var title = (meta.icon || '🔬') + '\u2009' + (meta.name || slug.replace(/-/g, ' '));

      setTimeout(function () { go(slug, { overlay: true, title: title }); }, 200);
    } catch (e) {}
  }

  /* Handle ?m= direct URL visits (bookmarks, shared links) */
  function _handleModalParam() {
    var url    = new URL(window.location.href);
    var mParam = url.searchParams.get('m');

    if (!mParam) {
      window.history.replaceState({ modalOpen: false }, '', window.location.href);
      return;
    }

    var decodedFile = decodeURIComponent(mParam);
    var slug  = decodedFile.replace(/\.html?$/i, '').replace(/^\/+/, '').split('/')[0];
    var meta  = moduleMetaMap[slug] || {};

    setTimeout(function () {
      if (typeof window._modalSetup === 'function') {
        window._modalSetup(decodedFile, meta.icon || '🔬', meta.name || 'ViaDecide Tool');
      }
      window.history.replaceState(
        { modalOpen: true, file: decodedFile, icon: meta.icon || '🔬', name: meta.name || 'ViaDecide Tool' },
        '',
        window.location.href
      );
    }, 300);
  }

  /* ══════════════════════════════════════════════════════════
   * Prefetch wiring — hover over cards
   * ══════════════════════════════════════════════════════════ */
  function _wirePrefetch() {
    function _prefetchFromEl(el) {
      var oc   = el.getAttribute('onclick') || '';
      var href = el.getAttribute('href')    || '';

      var m1 = oc.match(/openModal\('([^']+)'/);
      if (m1) prefetch(m1[1].replace(/\.html?$/i, '').replace(/^\.?\//,''));

      var m2 = oc.match(/VDRouter\.go\('([^']+)'/);
      if (m2) prefetch(m2[1]);

      if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto:')) {
        prefetch(href.replace(/^\/+/, '').replace(/\.html?$/i, ''));
      }
    }

    var sel = '.tc[onclick],.pt-card[onclick],.build-card[onclick],.nav-chip,.orb-chip[onclick]';
    document.querySelectorAll(sel).forEach(function (el) {
      el.addEventListener('mouseenter', function () { _prefetchFromEl(el); }, { once: true, passive: true });
      el.addEventListener('touchstart', function () { _prefetchFromEl(el); }, { once: true, passive: true });
    });
  }

  /* ══════════════════════════════════════════════════════════
   * Monkey-patch closeModal from index.html so ✕ / Escape
   * also pushes a history.back() to keep URL in sync.
   * ══════════════════════════════════════════════════════════ */
  function _patchCloseModal() {
    if (typeof global.closeModal !== 'function' || global._vdRouterHooked) return;

    _originalCloseModal = global.closeModal;
    global.closeModal = function () {
      if (window.history.state && window.history.state.modalOpen) {
        window.history.back();
      } else {
        _originalCloseModal();
        var url = new URL(window.location.href);
        if (url.searchParams.has('m')) {
          url.searchParams.delete('m');
          var search = url.search && url.search !== '?' ? url.search : '';
          window.history.replaceState({ modalOpen: false }, '', url.pathname + search);
        }
      }
    };
    global._vdRouterHooked = true;
  }

  /* ══════════════════════════════════════════════════════════
   * INIT
   * ══════════════════════════════════════════════════════════ */
  function init() {
    _handle404Redirect();
    _handleModalParam();
    _handlePopState();
    bindLinks();
    on('routechange', bindLinks);
    _wirePrefetch();
    setTimeout(_patchCloseModal, 100);

    try {
      console.info('[VDRouter v3] Ready — ' + Object.keys(routesMap).length + ' routes registered.');
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    init();
    setTimeout(_patchCloseModal, 200);
  });

  /* ══════════════════════════════════════════════════════════
   * EXPOSE
   * ══════════════════════════════════════════════════════════ */
  global.VDRouter = {
    // v2 API (backward-compatible — index.html calls all of these)
    on:          on,
    emit:        emit,
    routes:      routes,
    resolve:     resolve,
    prefetch:    prefetch,
    openOverlay: openOverlay,
    go:          go,
    bindLinks:   bindLinks,
    init:        init,
    // v3 additions
    navigate:    navigate,
    back:        back,
    current:     current,
  };

})(window);
