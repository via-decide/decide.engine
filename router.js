/*!
 * Decide Engine — Universal Router v2.0
 * Handles all internal navigation, anchor scrolling,
 * scroll-to-top on load, and cross-page anchor delivery.
 * Works alongside the inline navigate() stub in index.html.
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
   * 1. ALWAYS START AT TOP ON FIRST LOAD
   * Prevents browser scroll-restoration from dumping users mid-page
   * ══════════════════════════════════════════════════════════════ */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Hard-scroll to top immediately (before paint)
  window.scrollTo(0, 0);

  // Also fire after DOM ready and after window load — belt + braces
  document.addEventListener('DOMContentLoaded', function () {
    // Only scroll to top if no cross-page anchor is waiting
    var pendingAnchor = _getSession('de-anchor');
    if (!pendingAnchor) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  });

  window.addEventListener('load', function () {
    var pendingAnchor = _getSession('de-anchor');
    if (pendingAnchor) {
      _clearSession('de-anchor');
      setTimeout(function () {
        _scrollToId(pendingAnchor);
      }, 120);
    } else {
      // Force top — catches back/forward cache restores
      var url = window.location.href;
      if (url.indexOf('#') === -1) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
  });


  /* ══════════════════════════════════════════════════════════════
   * 2. SITE MAP — canonical page paths
   * All keys are lowercase, values are relative file paths
   * ══════════════════════════════════════════════════════════════ */
  var PAGES = {
    'index':          'index.html',
    'home':           'index.html',
    'compare':        'compare.html',
    'tools':          'tools.html',
    'guides':         'guides.html',
    'about':          'about.html',
    'contact':        'contact.html',
    'disclosure':     'disclosure.html',
    'privacy':        'privacy.html',
    'terms':          'terms.html',
    // Guide sub-pages
    'laptops':        'guides/laptops-under-50k.html',
    'earbuds':        'guides/earbuds-under-3k.html',
    'smartphones':    'guides/mid-range-smartphones.html',
  };

  /* ══════════════════════════════════════════════════════════════
   * 3. OVERRIDE window.navigate() — smarter version
   * Called by onclick="navigate('…')" throughout the page
   * ══════════════════════════════════════════════════════════════ */
  window.navigate = function (url) {
    if (!url || url === '#' || url === '') return false;

    // External links → new tab
    if (/^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return false;
    }

    // Pure same-page anchor  (#section)
    if (url.charAt(0) === '#') {
      _scrollToId(url.slice(1));
      _pushState(url);
      return false;
    }

    // Resolve shorthand keys  ("compare" → "compare.html")
    var key = url.replace(/\.html$/, '').replace(/^.*\//, '').toLowerCase();
    var anchorPart = '';

    // Handle  "page.html#anchor"  or  "page#anchor"
    if (url.indexOf('#') !== -1) {
      var parts = url.split('#');
      url = parts[0];
      anchorPart = parts[1];
      key = url.replace(/\.html$/, '').replace(/^.*\//, '').toLowerCase();
    }

    // Is it the current page?
    var currentFile = _currentFile();
    var resolvedFile = PAGES[key] || url;

    if (_isSamePage(currentFile, resolvedFile)) {
      // Just scroll to anchor on current page
      if (anchorPart) {
        _scrollToId(anchorPart);
        _pushState('#' + anchorPart);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return false;
    }

    // Navigate to different page
    if (anchorPart) {
      _saveSession('de-anchor', anchorPart);
    }

    window.location.href = resolvedFile;
    return false;
  };


  /* ══════════════════════════════════════════════════════════════
   * 4. INTERCEPT ALL <a> CLICKS — universal link capture
   * ══════════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var el = e.target;

    // Walk up to find nearest <a>
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
    }

    if (!el || el.tagName !== 'A') return;

    var href = el.getAttribute('href');
    if (!href) return;

    // Let external, mailto, tel links go natively
    if (/^(https?:\/\/|mailto:|tel:|javascript:)/i.test(href)) return;

    // Let download links go natively
    if (el.hasAttribute('download')) return;

    // Let target="_blank" go natively (we set that on externals already)
    if (el.getAttribute('target') === '_blank') return;

    e.preventDefault();
    window.navigate(href);
  }, true); // capture phase so it fires before other handlers


  /* ══════════════════════════════════════════════════════════════
   * 5. HANDLE POPSTATE (browser back/forward)
   * ══════════════════════════════════════════════════════════════ */
  window.addEventListener('popstate', function (e) {
    var hash = window.location.hash;
    if (hash) {
      _scrollToId(hash.slice(1));
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });


  /* ══════════════════════════════════════════════════════════════
   * 6. ACTIVE NAV LINK HIGHLIGHTING
   * ══════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    _highlightActiveNav();
  });

  function _highlightActiveNav() {
    var currentFile = _currentFile();
    var links = document.querySelectorAll('.nav-links a, .drawer-nav a, .f-col ul a');
    links.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;
      var linkFile = href.split('#')[0].replace(/^.*\//, '').toLowerCase();
      var matches = (linkFile === currentFile) || (currentFile === 'index.html' && (linkFile === '' || linkFile === 'index.html'));
      if (matches) {
        link.style.color = 'var(--gold)';
        link.style.fontWeight = '600';
      }
    });
  }


  /* ══════════════════════════════════════════════════════════════
   * 7. HASH ROUTING on initial load (e.g. arriving at index.html#how)
   * ══════════════════════════════════════════════════════════════ */
  window.addEventListener('load', function () {
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
      setTimeout(function () {
        _scrollToId(hash.slice(1));
      }, 200);
    }
  });


  /* ══════════════════════════════════════════════════════════════
   * UTILITIES
   * ══════════════════════════════════════════════════════════════ */
  function _scrollToId(id) {
    var el = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
    if (!el) return;
    var navH = (document.getElementById('site-nav') || { offsetHeight: 72 }).offsetHeight;
    var top = el.getBoundingClientRect().top + window.pageYOffset - navH - 12;
    window.scrollTo({ top: top, left: 0, behavior: 'smooth' });
  }

  function _pushState(url) {
    try { history.pushState(null, '', url); } catch (e) {}
  }

  function _currentFile() {
    return window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
  }

  function _isSamePage(currentFile, resolvedFile) {
    var rf = resolvedFile.split('/').pop().toLowerCase();
    return rf === currentFile || (rf === '' && currentFile === 'index.html');
  }

  function _saveSession(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) {}
  }

  function _getSession(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function _clearSession(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  /* Expose internals for debugging */
  window._DERouter = {
    pages: PAGES,
    scrollTo: _scrollToId,
    currentFile: _currentFile
  };

})();
