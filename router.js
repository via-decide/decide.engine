/**
 * ═══════════════════════════════════════════════════════════
 *  viadecide.com — UNIVERSAL ROUTER  v2.0
 *  File: router.js
 *  Drop this <script> into your index.html <head> (before anything else)
 *
 *  ZERO CONFIGURATION — just add new subpages to the ROUTES
 *  map below. The router handles everything automatically.
 *
 *  HOW TO ADD A NEW SUBPAGE:
 *    1. Add your file to the repo (e.g. my-tool.html or my-tool/index.html)
 *    2. Add one line to ROUTES:
 *         'my-tool': 'my-tool.html',
 *    That's it. GitHub Pages + this router handle the rest.
 *
 *  URL PATTERNS SUPPORTED:
 *    /my-tool/          → loads my-tool.html (or my-tool/index.html)
 *    /my-tool           → same (trailing slash optional)
 *    /my-tool?foo=bar   → passes query params through
 *    /my-tool#section   → passes hash through
 * ═══════════════════════════════════════════════════════════
 */

(function ViaDecideRouter() {
  'use strict';

  // ─────────────────────────────────────────────────────────
  //  ROUTE MAP
  //  key   = URL slug (what appears in the browser address bar)
  //  value = actual file path in your GitHub repo
  //
  //  ADD NEW ROUTES HERE — one line per subpage:
  // ─────────────────────────────────────────────────────────
  var ROUTES = {
    // Core tools
    'alchemist':        'alchemist.html',
    'swipeos':          'swipeos/index.html',
    'engine-deals':     'engine-deals.html',
    'cashback-claim':   'cashback-claim.html',
    'cashback-rules':   'cashback-rules.html',
    'engine-license':   'engine-license.html',
    'ondc-demo':        'ONDC-demo.html',
    'promptalchemy':    'PromptAlchemy.html',
    'student-research': 'StudentResearch.html',
    'contact':          'contact.html',
    'brief':            'brief.html',
    'decision-brief':   'decision-brief.html',

    // ── ADD NEW SUBPAGES BELOW THIS LINE ──────────────────
    // 'my-new-tool':   'my-new-tool.html',
    // 'policy':        'policy/index.html',
    // 'dashboard':     'dashboard.html',
    // ──────────────────────────────────────────────────────
  };

  // ─────────────────────────────────────────────────────────
  //  ALIAS MAP  (old URLs → new slugs, for backwards compat)
  // ─────────────────────────────────────────────────────────
  var ALIASES = {
    'SwipeOS':          'swipeos',
    'swipeos?':         'swipeos',   // handles the broken "SwipeOS?" name
    'PromptAlchemy':    'promptalchemy',
    'StudentResearch':  'student-research',
    'ONDC-demo':        'ondc-demo',
    'ondc':             'ondc-demo',
  };

  // ─────────────────────────────────────────────────────────
  //  INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────

  function normalizeSlug(raw) {
    return raw
      .replace(/^\/+/, '')   // strip leading slashes
      .replace(/\/+$/, '')   // strip trailing slashes
      .replace(/\.html?$/, '') // strip .html extension
      .toLowerCase()
      .split('/')[0];         // take first segment only
  }

  function resolveRoute(slug) {
    // 1. Direct match
    if (ROUTES[slug]) return ROUTES[slug];
    // 2. Alias match
    var aliasTarget = ALIASES[slug] || ALIASES[slug.toLowerCase()];
    if (aliasTarget && ROUTES[aliasTarget]) return ROUTES[aliasTarget];
    // 3. Case-insensitive match
    var lower = slug.toLowerCase();
    for (var key in ROUTES) {
      if (key.toLowerCase() === lower) return ROUTES[key];
    }
    return null;
  }

  function getBaseURL() {
    return window.location.protocol + '//' + window.location.host;
  }

  function navigateTo(filePath, search, hash) {
    var url = getBaseURL() + '/' + filePath + (search || '') + (hash || '');
    window.location.replace(url);
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 1: Check for a stored redirect from 404.html
  // ─────────────────────────────────────────────────────────
  var stored = null;
  try { stored = sessionStorage.getItem('__vd_redirect__'); } catch(e) {}

  if (stored) {
    try { sessionStorage.removeItem('__vd_redirect__'); } catch(e) {}

    // Parse the stored path
    var parts  = stored.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/) || [];
    var path   = parts[1] || '/';
    var search = parts[2] || '';
    var hash   = parts[3] || '';

    var rawSlug = path.replace(/^\//, '').split('/')[0];

    if (!rawSlug || rawSlug === '') {
      // It was the root — do nothing, let index.html load normally
    } else {
      var slug  = normalizeSlug(rawSlug);
      var file  = resolveRoute(slug);

      if (file) {
        navigateTo(file, search, hash);
        return; // stop execution
      } else {
        // Unknown route — render a helpful 404 page inline
        renderNotFound(rawSlug);
        return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 2: Also handle direct hash-based routing
  //  Supports: /#/alchemist  or  /#alchemist
  // ─────────────────────────────────────────────────────────
  var currentHash = window.location.hash;
  if (currentHash) {
    var hashPath = currentHash.replace(/^#\/?/, '');
    if (hashPath && hashPath !== 'p=') {
      // Only if it looks like a route slug, not a project payload
      if (!/^p=/.test(hashPath) && hashPath.length < 60) {
        var hashSlug = normalizeSlug(hashPath.split('?')[0]);
        var hashFile = resolveRoute(hashSlug);
        if (hashFile) {
          navigateTo(hashFile, '', '');
          return;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  STEP 3: Expose a global helper so index.html buttons
  //  can use clean /slug/ URLs instead of raw .html paths
  // ─────────────────────────────────────────────────────────
  window.VDRouter = {
    /**
     * Navigate to a subpage by slug.
     * Usage: VDRouter.go('alchemist')
     */
    go: function(slug, options) {
      options = options || {};
      var file = resolveRoute(normalizeSlug(slug));
      if (file) {
        if (options.newTab) { window.open('/' + file, '_blank'); }
        else { navigateTo(file, options.search || '', options.hash || ''); }
      } else {
        console.warn('[VDRouter] Unknown route:', slug);
        if (options.newTab) { window.open('/' + slug + '/', '_blank'); }
      }
    },

    /**
     * Get the URL for a slug (for use in href attributes).
     * Usage: VDRouter.url('alchemist') → '/alchemist/'
     */
    url: function(slug) {
      return '/' + normalizeSlug(slug) + '/';
    },

    /**
     * Get all registered routes.
     */
    routes: function() { return Object.assign({}, ROUTES); },

    /**
     * Register a new route at runtime (for dynamically added pages).
     * Usage: VDRouter.register('my-tool', 'my-tool.html')
     */
    register: function(slug, file) {
      ROUTES[normalizeSlug(slug)] = file;
    }
  };

  // ─────────────────────────────────────────────────────────
  //  INLINE 404 PAGE (renders if no route matches)
  // ─────────────────────────────────────────────────────────
  function renderNotFound(slug) {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.style.cssText = 'margin:0;background:#04080f;color:#e8edf5;font-family:Syne,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;text-align:center;padding:20px';
      document.body.innerHTML = [
        '<div style="font-size:4rem;margin-bottom:8px">🧭</div>',
        '<h1 style="font-size:2rem;color:#FF9933;margin:0;letter-spacing:-.03em">Route not found</h1>',
        '<p style="color:#7a90a8;margin:0;font-size:.9rem">No subpage registered for: <code style="color:#FF9933;background:rgba(255,153,51,.1);padding:2px 8px;border-radius:6px">' + slug + '</code></p>',
        '<p style="color:#7a90a8;font-size:.8rem;max-width:420px;line-height:1.6">To add this route, open <code>router.js</code> and add one line to the ROUTES map:<br><code style="color:#00d68f">\'' + slug + '\': \'' + slug + '.html\'</code></p>',
        '<a href="/" style="margin-top:8px;background:rgba(255,153,51,.15);border:1px solid rgba(255,153,51,.4);color:#FF9933;padding:12px 28px;border-radius:999px;text-decoration:none;font-family:Space Mono,monospace;font-size:.75rem;letter-spacing:1.5px">← BACK TO DECIDE.ENGINE</a>',
      ].join('');
    });
  }

})();
