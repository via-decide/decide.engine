/**
 * ViaDecide Router (VDRouter) — v3.1
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles SPA routing, prefetching, Cloudflare Pages 404 redirects,
 * and history-synced modal overlays.
 *
 * KEY ARCHITECTURAL FIX (v2 → v3):
 *   Full-page navigation now uses clean /slug URLs, NOT resolved .html file
 *   paths. Cloudflare's _redirects rules are keyed on /slug (200 rewrites).
 *   Navigating to slug.html directly bypasses those rules, falls through to
 *   the /* catch-all, and when combined with a stale Service Worker cache
 *   produces ERR_TOO_MANY_REDIRECTS.
 *
 *   Overlays still receive the resolved .html path (used as iframe src).
 *
 * Public API (unchanged):
 *   VDRouter.on(event, cb)           subscribe to a router event
 *   VDRouter.off(event, cb)          unsubscribe                      [v2]
 *   VDRouter.emit(event, data)       fire a router event
 *   VDRouter.routes()                return the full routes table
 *   VDRouter.resolve(slug)           → relative .html path  (iframe use)
 *   VDRouter.resolveURL(slug)        → /clean-url           (navigation) [NEW v3]
 *   VDRouter.prefetch(slug)          hint browser to prefetch a page
 *   VDRouter.openOverlay(file, opts) open a file in the modal overlay
 *   VDRouter.go(slug, opts)          navigate (overlay or full-page)
 *   VDRouter.bindLinks()             wire [data-router] anchors
 *   VDRouter.bindBackLinks()         wire [data-back] elements
 *   VDRouter.bindIframeBridge()      listen for vd:close-overlay postMessage
 *   VDRouter.init()                  called automatically on DOMContentLoaded
 *
 * FIX LOG:
 *  v2 #1  resolve()       double-.html on nested paths                   ✓
 *  v2 #2  routesMap       '#audio.log' hash-key unreachable              ✓
 *  v2 #3  openOverlay()   thin-space + surrogate-only emoji parsing      ✓
 *  v2 #4  init() 404      only first path segment used for redirect      ✓
 *  v2 #5  closeModal      one-shot DOMContentLoaded patch race           ✓
 *  v2 #6  go()            .href setter → .assign()                       ✓
 *  v2 #7  events          no off() → listener leaks                      ✓
 *  v2 #8  prefetch()      no guard on empty resolve() output             ✓
 *  v2 #9  bindLinks()     no MutationObserver for dynamic links          ✓
 *  v2 #10 popstate        no null guards on DOM element lookups          ✓
 *  v3 #11 go() full-page  navigated to slug.html → bypassed _redirects,
 *                         caused redirect loop with SW cache              ✓
 *  v3 #12 sessionStorage  dual __vd_redirect__ handlers in router.js
 *                         AND index.html — router.js is now sole owner   ✓
 *  v3 #13 resolve()       aliases (wof, wings-of-fire) had no canonical
 *                         URL — resolveURL() returns the Cloudflare slug ✓
 *  v3.1 #14 init()       __vd_redirect__ relied on 404.html which never
 *                         fires with /* 200 rewrite — replaced with direct
 *                         pathname read (window.location.pathname)         ✓
 *  v3.1 #15 _redirects   alias slugs /wings-of-fire /wof /wingsoffire
 *                         /audio-log /numberplate /printbydd-store had no
 *                         _redirects entry — direct visits showed homepage  ✓
 *  v3.2 #16 routes       added skillhex-recruiter (hiring-dashboard.html)
 *                         with aliases skillhex/recruiter, hiring-dashboard ✓
 *  v3.3 #17 index.html   duplicate SkillHex nav chip href with .html suffix
 *                         caused hard 404 — removed duplicate               ✓
 *  v3.3 #18 index.html   WingsOfFire card opened 1KB stub instead of 52KB
 *                         game file wings-of-fire-quiz.html                 ✓
 *  v3.3 #19 routes       data-orbit slugs dharam-daxini, fintrack,
 *                         payroll-register, sales-register had no router
 *                         entry — orb search + deep-links were broken       ✓
 *  v3.3 #20 _redirects   4 missing alias rules added for above slugs        ✓
 */
(function (global) {
    'use strict';

    // ─── Event Bus ────────────────────────────────────────────────────────────

    /** @type {Record<string, Function[]>} */
    const _events = {};

    // ─── State ────────────────────────────────────────────────────────────────

    const _prefetched = new Set();
    let _originalCloseModal  = null;
    let _closeModalTrapped   = false;

    // ─── Routes Table ─────────────────────────────────────────────────────────
    //
    //  Each entry: slug → { file, url }
    //
    //    file  — relative path to the actual .html file on disk.
    //            Used as iframe src in openOverlay().
    //
    //    url   — the canonical Cloudflare _redirects slug (no leading slash).
    //            Used for full-page navigation so _redirects 200-rewrites fire.
    //            Aliases share the file but point to the canonical url.
    //
    //  RULE: every `url` value MUST have a matching entry in _redirects.
    //        If you add a new page, add it to BOTH _redirects AND here.

    const _table = {
        // ── Tools ──────────────────────────────────────────────────────────
        'interview-prep':            { file: 'interview-prep.html',            url: 'interview-prep'            },
        'sales-dashboard':           { file: 'sales-dashboard.html',           url: 'sales-dashboard'           },
        'sales-register':            { file: 'sales-dashboard.html',           url: 'sales-dashboard'           },
        'app-generator':             { file: 'app-generator.html',             url: 'app-generator'             },
        'memory':                    { file: 'memory.html',                    url: 'memory'                    },
        'prompt-alchemy':            { file: 'prompt-alchemy.html',            url: 'prompt-alchemy'            },
        'viaguide':                  { file: 'ViaGuide.html',                  url: 'viaguide'                  },
        'studyos':                   { file: 'StudyOS.html',                   url: 'studyos'                   },
        'brief':                     { file: 'brief.html',                     url: 'brief'                     },
        'student-research':          { file: 'student-research.html',          url: 'student-research'          },
        'agent':                     { file: 'agent.html',                     url: 'agent'                     },
        'laptops-under-50000':       { file: 'laptops-under-50000.html',       url: 'laptops-under-50000'       },
        'decision-brief':            { file: 'decision-brief.html',            url: 'decision-brief'            },

        // ── Commerce ───────────────────────────────────────────────────────
        'jalaram-food-court-rajkot': { file: 'Jalaram-food-court-rajkot.html', url: 'jalaram-food-court-rajkot' },
        'ondc-demo':                 { file: 'ONDC-demo.html',                 url: 'ondc-demo'                 },
        'engine-deals':              { file: 'engine-deals.html',              url: 'engine-deals'              },
        'discounts':                 { file: 'discounts.html',                 url: 'discounts'                 },
        'cashback-rules':            { file: 'cashback-rules.html',            url: 'cashback-rules'            },
        'cashback-claim':            { file: 'cashback-claim.html',            url: 'cashback-claim'            },
        'decide-service':            { file: 'decide-service.html',            url: 'decide-service'            },
        'decide-foodrajkot':         { file: 'decide-foodrajkot.html',         url: 'decide-foodrajkot'         },
        'swipeos':                   { file: 'SwipeOS.html',                   url: 'swipeos'                   },
        'swipeos-gandhidham':        { file: 'SwipeOS-gandhidham.html',        url: 'swipeos-gandhidham'        },
        'customswipeengineform':     { file: 'CustomSwipeEngineForm.html',     url: 'customswipeengineform'     },

        // ── Finance ────────────────────────────────────────────────────────
        'finance-dashboard-msme':    { file: 'finance-dashboard-msme.html',    url: 'finance-dashboard-msme'    },
        'fintrack':                  { file: 'finance-dashboard-msme.html',    url: 'finance-dashboard-msme'    },

        // ── EdTech ─────────────────────────────────────────────────────────
        'alchemist':                 { file: 'alchemist.html',                 url: 'alchemist'                 },
        'cohort-apply-here':         { file: 'cohort-apply-here.html',         url: 'cohort-apply-here'         },

        // ── Games ──────────────────────────────────────────────────────────
        'hexwars':                   { file: 'HexWars.html',                   url: 'hexwars'                   },
        'mars-rover-simulator-game': { file: 'mars-rover-simulator-game.html', url: 'mars-rover-simulator-game' },
        'hivaland':                  { file: 'HivaLand.html',                  url: 'hivaland'                  },
        'skillhex-mission-control': { file: 'apps/skillhex/index.html',              url: 'skillhex-mission-control'   },
        'skillhex':                 { file: 'apps/skillhex/index.html',              url: 'skillhex-mission-control'   },
        'apps/skillhex':            { file: 'apps/skillhex/index.html',              url: 'skillhex-mission-control'   },
        'skillhex-recruiter':       { file: 'apps/skillhex/hiring-dashboard.html',   url: 'skillhex-recruiter'         },
        'skillhex/recruiter':       { file: 'apps/skillhex/hiring-dashboard.html',   url: 'skillhex-recruiter'         },
        'hiring-dashboard':         { file: 'apps/skillhex/hiring-dashboard.html',   url: 'skillhex-recruiter'         },
        'wings-of-fire-quiz':        { file: 'wings-of-fire-quiz.html',        url: 'wings-of-fire-quiz'        },
        'wings-of-fire':             { file: 'wings-of-fire-quiz.html',        url: 'wings-of-fire-quiz'        },
        'wingsoffire':               { file: 'wings-of-fire-quiz.html',        url: 'wings-of-fire-quiz'        },
        'wof':                       { file: 'wings-of-fire-quiz.html',        url: 'wings-of-fire-quiz'        },

        // ── Store / 3D Print ───────────────────────────────────────────────
        'printbydd-store':           { file: 'printbydd-store/index.html',     url: 'printbydd'                 },
        'printbydd':                 { file: 'printbydd-store/index.html',     url: 'printbydd'                 },
        'numberplate':               { file: 'printbydd-store/numberplate.html',url: 'printbydd/numberplate'    },
        'keychain':                  { file: 'printbydd-store/keychain.html',  url: 'keychain'                  },
        'printbydd/':                { file: 'printbydd-store/index.html',     url: 'printbydd/'                },
        'printbydd/keychain':        { file: 'printbydd-store/keychain.html',  url: 'printbydd/keychain'        },
        'printbydd/numberplate':     { file: 'printbydd-store/numberplate.html',url: 'printbydd/numberplate'    },
        'printbydd/products':        { file: 'printbydd-store/products.html',  url: 'printbydd/products'        },
        'printbydd/gifts':           { file: 'printbydd-store/gifts-that-mean-more.html', url: 'printbydd/gifts' },
        'gifts-that-mean-more':      { file: 'printbydd-store/gifts-that-mean-more.html', url: 'gifts-that-mean-more' },
        'smarttag-lite':             { file: 'printbydd-store/smarttag-lite.html', url: 'smarttag-lite'         },
        'products':                  { file: 'printbydd-store/products.html',  url: 'products'                  },
        'gift-psychology':           { file: 'printbydd-store/gift-psychology.html', url: 'gift-psychology'     },
        'dharamdaxini':              { file: 'DharamDaxini/index.html',        url: 'dharamdaxini'              },
        'dharamdaxini-legacy':       { file: 'DharamDaxini.html',              url: 'dharamdaxini-legacy'       },
        'dharam-daxini':             { file: 'DharamDaxini/index.html',        url: 'dharamdaxini'              },

        // ── Licensing / Payments ───────────────────────────────────────────
        'engine-license':            { file: 'engine-license.html',            url: 'engine-license'            },
        'engine-activation-request': { file: 'Engine Activation Request.html', url: 'engine-activation-request'},
        'payment-register':          { file: 'payment-register.html',          url: 'payment-register'          },
        'payroll-register':          { file: 'payment-register.html',          url: 'payment-register'          },
        'pricing':                   { file: 'pricing.html',                   url: 'pricing'                   },

        // ── Blog / Content ─────────────────────────────────────────────────
        'viadecide-blogs':           { file: 'Viadecide-blogs.html',           url: 'viadecide-blogs'           },
        'the-decision-stack':        { file: 'The Decision Stack.html',        url: 'the-decision-stack'        },
        'the-decision-stack.html':   { file: 'The Decision Stack.html',             url: 'the-decision-stack.html'   },
        'not-a-saas':                { file: 'not-a-saas/index.html',          url: 'not-a-saas'                },
        'why-small-businesses-dont-need-saas': { file: 'not-a-saas/index.html', url: 'why-small-businesses-dont-need-saas' },
        'why-smbs-dont-need-saas':   { file: 'not-a-saas/index.html',          url: 'why-smbs-dont-need-saas'   },
        'why-smbs-dont-need-saas.html': { file: 'not-a-saas/index.html',         url: 'why-smbs-dont-need-saas.html' },
        'decision-infrastructure-india': { file: 'decision-infrastructure-india.html', url: 'decision-infrastructure-india' },
        'ondc-for-bharat':           { file: 'ondc-for-bharat.html',           url: 'ondc-for-bharat'           },
        'indiaai-mission-2025':      { file: 'indiaai-mission-2025.html',      url: 'indiaai-mission-2025'      },
        'multi-source-research-explained': { file: 'multi-source-research-explained.html', url: 'multi-source-research-explained' },
        'decision-brief-guide':      { file: 'decision-brief-guide.html',      url: 'decision-brief-guide'      },
        'viadecide-public-beta':     { file: 'viadecide-public-beta.html',     url: 'viadecide-public-beta'     },

        // ── Meta ───────────────────────────────────────────────────────────
        'founder':                   { file: 'founder.html',                   url: 'founder'                   },
        'contact':                   { file: 'contact.html',                   url: 'contact'                   },
        'privacy':                   { file: 'privacy.html',                   url: 'privacy'                   },
        'terms':                     { file: 'terms.html',                     url: 'terms'                     },

        // ── Audio / Media ──────────────────────────────────────────────────
        'audio.log':                 { file: 'audio.log.html',                 url: 'audio.log'                 },
        'audiolog':                  { file: 'audio.log.html',                 url: 'audiolog'                  },
        'audio-log':                 { file: 'audio.log.html',                 url: 'audio.log'                 },
    };

    // ─── Normalise input slug ─────────────────────────────────────────────────

    function _normalise(raw) {
        if (!raw || typeof raw !== 'string') return '';
        return raw
            .replace(/^[/#\s]+|[\s/]+$/g, '')
            .toLowerCase()
            .replace(/\.html$/i, '')
            .replace(/\/index$/i, '');
    }

    // ─── Emoji Parsing ────────────────────────────────────────────────────────

    const _EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;

    function _parseTitle(title) {
        if (!title) return { icon: '🔬', name: 'Tool' };
        const THIN = '\u2009';
        if (title.includes(THIN)) {
            const parts = title.split(THIN);
            return { icon: parts[0] || '🔬', name: parts.slice(1).join(THIN) || 'Tool' };
        }
        const m = title.match(_EMOJI_RE);
        if (m) {
            const icon = m[0];
            return { icon, name: title.slice(icon.length).trimStart() || 'Tool' };
        }
        return { icon: '🔬', name: title };
    }

    // ─── closeModal Trap ──────────────────────────────────────────────────────

    function _installCloseModalTrap() {
        if (_closeModalTrapped) return;
        _closeModalTrapped = true;

        let _stored = global.closeModal;

        Object.defineProperty(global, 'closeModal', {
            configurable: true,
            enumerable: true,
            get() { return _stored; },
            set(fn) {
                if (typeof fn !== 'function') { _stored = fn; return; }
                if (fn._vdWrapped) { _stored = fn; return; }

                _originalCloseModal = fn;

                const wrapped = function vdCloseModal() {
                    if (global.history.state && global.history.state.modalOpen) {
                        global.history.back();
                    } else {
                        _originalCloseModal();
                        const url = new URL(global.location.href);
                        if (url.searchParams.has('m')) {
                            url.searchParams.delete('m');
                            global.history.replaceState(
                                { modalOpen: false }, '',
                                url.pathname + (url.search === '?' ? '' : url.search)
                            );
                        }
                    }
                };
                wrapped._vdWrapped = true;
                _stored = wrapped;
            }
        });

        if (typeof _stored === 'function' && !_stored._vdWrapped) {
            global.closeModal = _stored;
        }
    }

    // ─── Modal DOM fallback ───────────────────────────────────────────────────

    function _closeModalDOM() {
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => {
            const frame = document.getElementById('modal-frame');
            if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; }
            const err = document.getElementById('modal-err');
            if (err) err.classList.remove('show');
        }, 400);
    }

    // ─── MutationObserver ─────────────────────────────────────────────────────

    function _observeDynamicLinks() {
        if (!('MutationObserver' in global)) return;
        const obs = new MutationObserver(() => {
            VDRouter.bindLinks();
            VDRouter.bindBackLinks();
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  VDRouter
    // ═════════════════════════════════════════════════════════════════════════

    const VDRouter = {

        on(event, cb) {
            if (!_events[event]) _events[event] = [];
            if (!_events[event].includes(cb)) _events[event].push(cb);
        },

        off(event, cb) {
            if (!_events[event]) return;
            _events[event] = _events[event].filter(fn => fn !== cb);
        },

        emit(event, data) {
            (_events[event] || []).slice().forEach(cb => {
                try { cb(data); } catch (e) { console.error('[VDRouter] emit error:', e); }
            });
        },

        routes() {
            return _table;
        },

        resolve(pathOrSlug) {
            const slug = _normalise(pathOrSlug);
            if (!slug) return '';
            if (_table[slug]) return _table[slug].file;

            const clean = (pathOrSlug || '').replace(/^[/#\s]+|[\s/]+$/g, '');
            if (/\.html$/i.test(clean)) return clean;
            if (clean.endsWith('/index')) return clean + '.html';
            return slug + '.html';
        },

        resolveURL(pathOrSlug) {
            const slug = _normalise(pathOrSlug);
            if (!slug) return '/';
            if (_table[slug]) return '/' + _table[slug].url;
            return '/' + slug;
        },

        prefetch(slug) {
            const url = this.resolveURL(slug);
            if (!url || url === '/' || _prefetched.has(url)) return;
            const link = document.createElement('link');
            link.rel  = 'prefetch';
            link.href = url;
            link.as   = 'document';
            document.head.appendChild(link);
            _prefetched.add(url);
        },

        openOverlay(file, opts = {}) {
            const { icon, name } = _parseTitle(opts.title || '');

            const url = new URL(global.location.href);
            url.searchParams.set('m', encodeURIComponent(file));

            const cur = global.history.state;
            if (!cur || cur.file !== file) {
                global.history.pushState({ modalOpen: true, file, icon, name }, '', url);
            }

            if (typeof global._modalSetup === 'function') {
                global._modalSetup(file, icon, name);
            }

            this.emit('routechange', { type: 'overlay', file, icon, name });
        },

        go(slug, opts = {}) {
            if (!slug) return;
            if (opts.overlay) {
                const file = this.resolve(slug);
                if (!file) { console.warn('[VDRouter] cannot resolve file for:', slug); return; }
                this.openOverlay(file, opts);
            } else {
                const navURL = this.resolveURL(slug);
                this.emit('routechange', { type: 'navigate', slug, url: navURL });
                global.location.assign(navURL);
            }
        },

        bindLinks() {
            document.querySelectorAll('a[data-router]:not([data-router-bound])').forEach(el => {
                el.setAttribute('data-router-bound', '');
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const slug    = (el.getAttribute('href') || '').replace(/^\/+/, '');
                    const overlay = el.hasAttribute('data-overlay');
                    const title   = el.getAttribute('data-title') || '';
                    this.go(slug, { overlay, title });
                });
            });
        },

        bindBackLinks() {
            document.querySelectorAll('[data-back]:not([data-back-bound])').forEach(el => {
                el.setAttribute('data-back-bound', '');
                el.addEventListener('click', e => {
                    e.preventDefault();
                    if (global.self !== global.top) {
                        try {
                            global.parent.postMessage({ type: 'vd:close-overlay' }, global.location.origin);
                            return;
                        } catch (_) {}
                    }
                    global.history.length > 1 ? global.history.back() : global.location.assign('/');
                });
            });
        },

        bindIframeBridge() {
            if (global._vdIframeBridgeBound) return;
            global._vdIframeBridgeBound = true;
            global.addEventListener('message', event => {
                if (event.origin !== global.location.origin) return;
                if ((event.data || {}).type !== 'vd:close-overlay') return;
                typeof global.closeModal === 'function'
                    ? global.closeModal()
                    : global.history.state?.modalOpen && global.history.back();
            });
        },

        bindBackLinks() {
            document.querySelectorAll('[data-back]').forEach(el => {
                if (el._routerBackBound) return;
                el.addEventListener('click', (e) => {
                    e.preventDefault();

                    // If opened inside modal iframe, ask parent to close modal.
                    if (window.self !== window.top) {
                        try {
                            window.parent.postMessage({ type: 'vd:close-overlay' }, window.location.origin);
                            return;
                        } catch (_) {}
                    }

                    // Standard back behavior for normal page visits.
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = 'index.html';
                    }
                });
                el._routerBackBound = true;
            });
        },

        bindIframeBridge() {
            if (window._vdMessageBound) return;
            window.addEventListener('message', (event) => {
                if (event.origin !== window.location.origin) return;
                const data = event.data || {};
                if (data.type === 'vd:close-overlay') {
                    if (typeof global.closeModal === 'function') {
                        global.closeModal();
                    } else if (window.history.state && window.history.state.modalOpen) {
                        window.history.back();
                    }
                }
            });
            window._vdMessageBound = true;
        },

        init() {
            _installCloseModalTrap();

            // 1. Cloudflare 404 restore — router.js is sole __vd_redirect__ owner
            let redirect = null;
            try {
                redirect = sessionStorage.getItem('__vd_redirect__');
                if (redirect) {
                    sessionStorage.removeItem('__vd_redirect__');
                    if (!new URLSearchParams(global.location.search).has('m')) {
                        const slug = redirect.replace(/^\/+|\/+$/g, '');
                        if (slug) {
                            const file  = this.resolve(slug);
                            const title = slug.replace(/-/g, ' ');
                            setTimeout(() => this.openOverlay(file, { title }), 200);
                        }
                    }
                }
            } catch (_) {}

            // 1b. Pathname-based SPA fallback (v3.1 fix #14)
            if (!redirect && typeof global._modalSetup === 'function') {
                const raw      = global.location.pathname;
                const pathSlug = raw.replace(/^\/+|\/+$/g, '');
                const normKey  = _normalise(pathSlug);
                if (normKey && _table[normKey]) {
                    const entry = _table[normKey];
                    const title = normKey.replace(/-/g, ' ');
                    global.history.replaceState(
                        { modalOpen: false },
                        '',
                        '/' + entry.url
                    );
                    if (!new URLSearchParams(global.location.search).has('m')) {
                        setTimeout(() => this.openOverlay(entry.file, { title }), 200);
                    }
                }
            }

            // 2. Direct ?m=file visits
            const modalParam = new URLSearchParams(global.location.search).get('m');
            if (modalParam) {
                const file = decodeURIComponent(modalParam);
                setTimeout(() => {
                    if (typeof global._modalSetup === 'function') {
                        global._modalSetup(file, '🔬', 'ViaDecide Tool');
                    }
                    global.history.replaceState(
                        { modalOpen: true, file, icon: '🔬', name: 'ViaDecide Tool' },
                        '', global.location.href
                    );
                }, 300);
            } else {
                global.history.replaceState({ modalOpen: false }, '', global.location.href);
            }

            // 3. Back / Forward
            global.addEventListener('popstate', e => {
                if (e.state?.modalOpen) {
                    typeof global._modalSetup === 'function' &&
                        global._modalSetup(e.state.file, e.state.icon || '🔬', e.state.name || '');
                } else {
                    typeof _originalCloseModal === 'function' ? _originalCloseModal() : _closeModalDOM();
                }
            });
            
            this.bindLinks();
            this.bindBackLinks();
            this.bindIframeBridge();

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
    'wings-of-fire-quiz':             'wings-of-fire-quiz.html',
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
    'printbydd':                      'printbydd-store/index.html',
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
    'wings-of-fire-quiz':             { icon: '🔥', name: 'Wings of Fire Quiz' },
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

            this.bindLinks();
            this.bindBackLinks();
            this.bindIframeBridge();
            _observeDynamicLinks();
        }
    };

    global.VDRouter = VDRouter;
    document.addEventListener('DOMContentLoaded', () => VDRouter.init());

})(window);
