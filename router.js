/*!
 * Decide Engine — Router v3.0
 * Simple, bulletproof. Works on any host.
 * Drop alongside index.html — no build step needed.
 */

var DE_BASE = 'https://viadecide.com';

/* ─── URL MAP: local → viadecide.com ─── */
var DE_MAP = {
  'compare.html':                      DE_BASE + '/compare',
  'tools.html':                        DE_BASE + '/tools',
  'tools.html#price':                  DE_BASE + '/tools#price',
  'tools.html#redflags':               DE_BASE + '/tools#redflags',
  'tools.html#signals':                DE_BASE + '/tools#signals',
  'tools.html#builder':                DE_BASE + '/tools#builder',
  'guides.html':                       DE_BASE + '/guides',
  'guides.html#digests':               DE_BASE + '/guides#digests',
  'about.html':                        DE_BASE + '/about',
  'about.html#methodology':            DE_BASE + '/about#methodology',
  'disclosure.html':                   DE_BASE + '/disclosure',
  'contact.html':                      DE_BASE + '/contact',
  'privacy.html':                      DE_BASE + '/privacy',
  'terms.html':                        DE_BASE + '/terms',
  'guides/laptops-under-50k.html':     DE_BASE + '/guides/laptops-under-50k',
  'guides/earbuds-under-3k.html':      DE_BASE + '/guides/earbuds-under-3k',
  'guides/mid-range-smartphones.html': DE_BASE + '/guides/mid-range-smartphones'
};

/* ─── SCROLL TO TOP immediately on load ─── */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ─── SCROLL HELPER ─── */
function deScrollTo(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var nav = document.getElementById('site-nav');
  var offset = (nav ? nav.offsetHeight : 72) + 12;
  var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: top, behavior: 'smooth' });
}

/* ─── MAIN navigate() — called by onclick and link interceptor ─── */
window.navigate = function(raw) {
  if (!raw || raw === '#' || raw === '') return false;

  /* Resolve through map */
  var url = DE_MAP[raw] || raw;

  /* Pure anchor on current page */
  if (url.charAt(0) === '#') {
    deScrollTo(url.slice(1));
    try { history.pushState(null, '', url); } catch(e) {}
    return false;
  }

  /* External (YouTube, Instagram, Amazon etc.) → new tab */
  if (/youtube\.com|instagram\.com|amazon\.|amzn\.|github\.com/i.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  }

  /* viadecide.com URL with hash → check if same page */
  if (url.indexOf(DE_BASE) === 0 && url.indexOf('#') !== -1) {
    var parts   = url.split('#');
    var page    = parts[0];
    var section = parts[1];
    var curBase = window.location.href.split('#')[0].replace(/\/$/, '');
    if (page === curBase || page === curBase + '/') {
      deScrollTo(section);
      return false;
    }
    try { sessionStorage.setItem('de-anchor', section); } catch(e) {}
    window.location.href = url;
    return false;
  }

  /* Any other http URL — same tab */
  if (/^https?:\/\//i.test(url)) {
    window.location.href = url;
    return false;
  }

  /* Relative fallback */
  window.location.href = url;
  return false;
};

/* ─── DOM READY: wire up all links + handle pending anchor ─── */
document.addEventListener('DOMContentLoaded', function() {

  /* Apply pending cross-page anchor */
  try {
    var pending = sessionStorage.getItem('de-anchor');
    if (pending) {
      sessionStorage.removeItem('de-anchor');
      setTimeout(function() { deScrollTo(pending); }, 200);
    } else if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  } catch(e) {}

  /* Handle URL hash on arrival */
  if (window.location.hash) {
    setTimeout(function() { deScrollTo(window.location.hash.slice(1)); }, 200);
  }

  /* Intercept ALL anchor clicks */
  document.body.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || el.tagName !== 'A') return;

    var href = el.getAttribute('href');
    if (!href) return;

    /* Skip native behaviors */
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (el.getAttribute('target') === '_blank') return;
    if (el.hasAttribute('download')) return;

    /* Home / logo → scroll to top */
    if (href === 'index.html' || href === '/' || href === './') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    e.preventDefault();
    window.navigate(href);
  });

});

/* ─── POPSTATE: browser back/forward ─── */
window.addEventListener('popstate', function() {
  var h = window.location.hash;
  if (h && h.length > 1) deScrollTo(h.slice(1));
  else window.scrollTo({ top: 0, behavior: 'smooth' });
});
