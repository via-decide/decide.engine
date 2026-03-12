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
            _observeDynamicLinks();
        }
    };

    global.VDRouter = VDRouter;
    document.addEventListener('DOMContentLoaded', () => VDRouter.init());

})(window);
