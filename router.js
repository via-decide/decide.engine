/**
 * ViaDecide Router (VDRouter) — v2.0
 *
 * Handles SPA routing, prefetching, GitHub Pages 404 redirects,
 * and history-synced modal overlays.
 *
 * Public API (unchanged from v1):
 *   VDRouter.on(event, cb)          — subscribe to a router event
 *   VDRouter.off(event, cb)         — unsubscribe a listener            [NEW]
 *   VDRouter.emit(event, data)      — fire a router event
 *   VDRouter.routes()               — return the full routes map
 *   VDRouter.resolve(pathOrSlug)    — resolve a slug to a relative file path
 *   VDRouter.prefetch(slug)         — hint the browser to prefetch a page
 *   VDRouter.openOverlay(file, opts)— open a file in the modal overlay
 *   VDRouter.go(slug, opts)         — navigate to a slug (overlay or full-page)
 *   VDRouter.bindLinks()            — wire [data-router] anchor elements
 *   VDRouter.bindBackLinks()        — wire [data-back] elements
 *   VDRouter.bindIframeBridge()     — listen for vd:close-overlay postMessage
 *   VDRouter.init()                 — called automatically on DOMContentLoaded
 *
 * FIX LOG (v1 → v2):
 *   #1  resolve()     — eliminated double-.html-extension on nested paths
 *   #2  routesMap     — removed '#audio.log' hash-prefix key (unreachable);
 *                       added 'audio-log' alias; marked duplicate wof/* aliases
 *   #3  openOverlay() — replaced thin-space + surrogate-only emoji parsing
 *                       with a single Unicode-aware regex covering all emoji
 *   #4  init() 404    — full redirect path is now resolved, not just segment[0]
 *   #5  closeModal    — replaced one-shot DOMContentLoaded patch with a
 *                       defineProperty getter/setter trap so late-defined
 *                       closeModal functions are still intercepted correctly
 *   #6  go()          — switched to window.location.assign() (explicit, testable)
 *   #7  events        — added off() to allow listener removal and prevent leaks
 *   #8  prefetch()    — guards against empty/non-string resolve() results
 *   #9  bindLinks()   — added MutationObserver so dynamically injected
 *                       [data-router] and [data-back] links are auto-wired
 *  #10  popstate      — all DOM element lookups are null-guarded before access
 */
(function (global) {
    'use strict';

    // ─── Event Bus ────────────────────────────────────────────────────────────

    /** @type {Record<string, Function[]>} */
    const _events = {};

    // ─── State ────────────────────────────────────────────────────────────────

    /** Files already handed to <link rel=prefetch> */
    const _prefetched = new Set();

    /** The original closeModal before we intercept it */
    let _originalCloseModal = null;

    /** True once the closeModal trap has been installed */
    let _closeModalTrapped = false;

    // ─── Routes Map ───────────────────────────────────────────────────────────
    //
    //  Keys   — lowercase slugs, NO leading slash, NO hash prefix.
    //  Values — relative file paths exactly as they exist on disk.
    //
    //  FIX #2: Removed '#audio.log' (hash prefix made it unreachable).
    //          Added 'audio-log' as the canonical alias.
    //          Retained existing wof/* aliases; one canonical per target.

    const _routes = {
        // ── Tools ──────────────────────────────────────────────────────────
        'interview-prep':               'interview-prep.html',
        'sales-dashboard':              'sales-dashboard.html',
        'app-generator':                'app-generator.html',
        'memory':                       'memory.html',
        'prompt-alchemy':               'prompt-alchemy.html',
        'viaguide':                     'ViaGuide.html',
        'studyos':                      'StudyOS.html',
        'brief':                        'brief.html',
        'student-research':             'student-research.html',
        'agent':                        'agent.html',
        'laptops-under-50000':          'laptops-under-50000.html',
        'decision-brief':               'decision-brief.html',

        // ── Commerce ───────────────────────────────────────────────────────
        'jalaram-food-court-rajkot':    'Jalaram-food-court-rajkot.html',
        'ondc-demo':                    'ONDC-demo.html',
        'engine-deals':                 'engine-deals.html',
        'discounts':                    'discounts.html',
        'cashback-rules':               'cashback-rules.html',
        'cashback-claim':               'cashback-claim.html',
        'decide-service':               'decide-service.html',
        'decide-foodrajkot':            'decide-foodrajkot.html',
        'swipeos':                      'SwipeOS.html',
        'swipeos-gandhidham':           'SwipeOS-gandhidham.html',
        'customswipeengineform':        'CustomSwipeEngineForm.html',

        // ── Finance ────────────────────────────────────────────────────────
        'finance-dashboard-msme':       'finance-dashboard-msme.html',

        // ── EdTech / Alchemist ─────────────────────────────────────────────
        'alchemist':                    'alchemist.html',
        'cohort-apply-here':            'cohort-apply-here.html',

        // ── Games ──────────────────────────────────────────────────────────
        'hexwars':                      'HexWars.html',
        'mars-rover-simulator-game':    'mars-rover-simulator-game.html',
        'hivaland':                     'HivaLand.html',
        // Canonical: wings-of-fire-quiz (aliases kept for back-compat)
        'wings-of-fire-quiz':           'wings-of-fire-quiz.html',
        'wings-of-fire':                'wings-of-fire-quiz.html',
        'wingsoffire':                  'wings-of-fire-quiz.html',
        'wof':                          'wings-of-fire-quiz.html',

        // ── Store / 3D Print ───────────────────────────────────────────────
        'printbydd-store':              'printbydd-store/index.html',
        'numberplate':                  'printbydd-store/numberplate.html',
        'keychain':                     'printbydd-store/keychain.html',
        'gifts-that-mean-more':         'printbydd-store/gifts-that-mean-more.html',
        'dharamdaxini':                 'DharamDaxini/index.html',
        'dharamdaxini-legacy':          'DharamDaxini.html',

        // ── Licensing / Payments ───────────────────────────────────────────
        'engine-license':               'engine-license.html',
        'engine-activation-request':    'Engine Activation Request.html',
        'payment-register':             'payment-register.html',
        'pricing':                      'pricing.html',

        // ── Blog / Content ─────────────────────────────────────────────────
        'viadecide-blogs':              'Viadecide-blogs.html',
        'the-decision-stack':           'The Decision Stack.html',
        'why-small-businesses-dont-need-saas': 'not-a-saas/index.html',
        'why-smbs-dont-need-saas':      'not-a-saas/index.html',
        'not-a-saas':                   'not-a-saas/index.html',
        'decision-infrastructure-india':'decision-infrastructure-india.html',
        'ondc-for-bharat':              'ondc-for-bharat.html',
        'indiaai-mission-2025':         'indiaai-mission-2025.html',
        'multi-source-research-explained': 'multi-source-research-explained.html',
        'decision-brief-guide':         'decision-brief-guide.html',
        'viadecide-public-beta':        'viadecide-public-beta.html',

        // ── Meta ───────────────────────────────────────────────────────────
        'founder':                      'founder.html',
        'contact':                      'contact.html',
        'privacy':                      'privacy.html',
        'terms':                        'terms.html',

        // ── Audio / Media ──────────────────────────────────────────────────
        // FIX #2: 'audio.log' and 'audiolog' kept; '#audio.log' removed.
        //         'audio-log' added as the hyphenated canonical form.
        'audio.log':                    'audio.log.html',
        'audiolog':                     'audio.log.html',
        'audio-log':                    'audio.log.html',
    };

    // ─── Emoji Parsing Helper ─────────────────────────────────────────────────
    //
    //  FIX #3: Replaced thin-space (U+2009) contract + surrogate-pair-only
    //  regex with a single Unicode-aware pattern that covers:
    //    • Surrogate pairs (U+1F000–U+1FFFF, e.g. 🔬)
    //    • BMP emoji (U+2000–U+2FFF, e.g. ✅ ™ ©)
    //    • Dingbats / misc symbols
    //    • Emoji with variation selector (U+FE0F)
    //    • ZWJ sequences (👨‍💻)

    const _EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;

    /**
     * Split a title string into { icon, name }.
     * Accepts either "🔬 Tool Name" or the legacy thin-space format.
     *
     * @param {string} title
     * @returns {{ icon: string, name: string }}
     */
    function _parseTitle(title) {
        if (!title) return { icon: '🔬', name: 'Tool' };

        // Legacy thin-space contract (U+2009) — preserved for callers that
        // still use the old format so nothing breaks during migration.
        const THIN = '\u2009';
        if (title.includes(THIN)) {
            const parts = title.split(THIN);
            return { icon: parts[0] || '🔬', name: parts.slice(1).join(THIN) || 'Tool' };
        }

        // Unicode emoji at the start of the string
        const match = title.match(_EMOJI_RE);
        if (match) {
            const icon = match[0];
            const name = title.slice(icon.length).trimStart();
            return { icon, name: name || 'Tool' };
        }

        return { icon: '🔬', name: title };
    }

    // ─── closeModal Trap ──────────────────────────────────────────────────────
    //
    //  FIX #5: The v1 approach patched global.closeModal once at
    //  DOMContentLoaded. If index.html defined closeModal in a script tag
    //  *after* that event (or asynchronously), the patch was silently skipped.
    //
    //  New approach: defineProperty a getter/setter on `window` for
    //  'closeModal'. Whenever *any* script assigns window.closeModal, we
    //  immediately wrap it. The setter fires regardless of when the assignment
    //  happens — no race condition.

    function _installCloseModalTrap() {
        if (_closeModalTrapped) return;
        _closeModalTrapped = true;

        let _stored = global.closeModal; // capture any value already present

        Object.defineProperty(global, 'closeModal', {
            configurable: true,
            enumerable:   true,
            get() {
                return _stored;
            },
            set(fn) {
                if (typeof fn !== 'function') { _stored = fn; return; }
                if (fn._vdWrapped) { _stored = fn; return; } // avoid double-wrapping

                _originalCloseModal = fn;

                const wrapped = function vdCloseModal() {
                    if (global.history.state && global.history.state.modalOpen) {
                        // Popstate handler will do the actual DOM teardown.
                        global.history.back();
                    } else {
                        _originalCloseModal();
                        // Clean up any stale ?m= query param.
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

        // Trigger the setter for any closeModal already defined at install time.
        if (typeof _stored === 'function' && !_stored._vdWrapped) {
            global.closeModal = _stored; // triggers the setter above
        }
    }

    // ─── Modal DOM Helper ─────────────────────────────────────────────────────
    //
    //  FIX #10: All getElementById calls are null-guarded.

    function _closeModalDOM() {
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('open');
        document.body.style.overflow = '';

        setTimeout(() => {
            const frame = document.getElementById('modal-frame');
            if (frame) {
                frame.src = 'about:blank';
                frame.style.display = 'block';
            }
            const err = document.getElementById('modal-err');
            if (err) err.classList.remove('show');
        }, 400);
    }

    // ─── MutationObserver for dynamic links ───────────────────────────────────
    //
    //  FIX #9: Watches the document body for newly inserted [data-router] and
    //  [data-back] elements and wires them automatically.

    function _observeDynamicLinks() {
        if (!('MutationObserver' in global)) return;
        const observer = new MutationObserver(() => {
            VDRouter.bindLinks();
            VDRouter.bindBackLinks();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  VDRouter — Public Interface
    // ═════════════════════════════════════════════════════════════════════════

    const VDRouter = {

        // ── Event Bus ─────────────────────────────────────────────────────────

        /**
         * Subscribe to a router event.
         * @param {string}   event
         * @param {Function} cb
         */
        on(event, cb) {
            if (!_events[event]) _events[event] = [];
            if (!_events[event].includes(cb)) _events[event].push(cb);
        },

        /**
         * Unsubscribe a listener.  FIX #7 — prevents memory leaks.
         * @param {string}   event
         * @param {Function} cb
         */
        off(event, cb) {
            if (!_events[event]) return;
            _events[event] = _events[event].filter(fn => fn !== cb);
        },

        /**
         * Fire all listeners for an event.
         * @param {string} event
         * @param {*}      data
         */
        emit(event, data) {
            (_events[event] || []).slice().forEach(cb => {
                try { cb(data); } catch (e) { console.error('[VDRouter] emit error:', e); }
            });
        },

        // ── Routes ────────────────────────────────────────────────────────────

        /** Returns the full routes map (read-only reference). */
        routes() {
            return _routes;
        },

        /**
         * Resolve a slug or path to a relative file path.
         *
         * FIX #1: v1 could double-append .html on nested paths and risked
         * returning paths like "folder/index/index.html". The new logic:
         *   1. Strip leading/trailing slashes and hashes.
         *   2. Normalise slug for map lookup (lowercase, strip .html, /index).
         *   3. Return map value if found.
         *   4. If the input already ends in .html, return it as-is.
         *   5. Fallback: single-segment → slug.html,
         *                multi-segment  → path as-is + .html (NOT /index.html,
         *                because nested pages in this project are flat .html
         *                files, not directories — printbydd-store is the
         *                exception and is already in the map).
         *
         * @param  {string} pathOrSlug
         * @returns {string} Relative file path
         */
        resolve(pathOrSlug) {
            if (!pathOrSlug || typeof pathOrSlug !== 'string') return '';

            // Strip leading slashes AND hash characters (fixes '#audio.log' style input)
            const clean = pathOrSlug.replace(/^[/#]+|[/]+$/g, '');
            if (!clean) return '';

            // Normalise for map lookup
            const slug = clean
                .toLowerCase()
                .replace(/\.html$/i, '')
                .replace(/\/index$/i, '');

            // 1. Known route
            if (_routes[slug]) return _routes[slug];

            // 2. Already has extension — trust it
            if (/\.html$/i.test(clean)) return clean;

            // 3. Ends with /index without extension
            if (clean.endsWith('/index')) return clean + '.html';

            // 4. Flat fallback — append .html regardless of depth.
            //    Folder-based routes (printbydd-store, dharamdaxini, not-a-saas)
            //    are all registered in the map above, so they never reach here.
            return clean + '.html';
        },

        // ── Prefetch ──────────────────────────────────────────────────────────

        /**
         * Hint the browser to prefetch a page.
         * FIX #8: Guards against empty or non-string resolve() output.
         * @param {string} slug
         */
        prefetch(slug) {
            const file = this.resolve(slug);
            if (!file || _prefetched.has(file)) return;

            const link = document.createElement('link');
            link.rel  = 'prefetch';
            link.href = file;
            link.as   = 'document';
            document.head.appendChild(link);
            _prefetched.add(file);
        },

        // ── Overlay ───────────────────────────────────────────────────────────

        /**
         * Open a file in the modal overlay and push a history entry.
         *
         * FIX #3: Title parsing uses Unicode-aware _parseTitle() instead of
         *         thin-space split + surrogate-pair-only regex.
         *
         * @param {string} file             Relative file path to load in the iframe
         * @param {{ title?: string }} opts
         */
        openOverlay(file, opts = {}) {
            const { icon, name } = _parseTitle(opts.title || '');

            // Build the new URL — keep all existing params except ?m=
            const url = new URL(global.location.href);
            url.searchParams.set('m', encodeURIComponent(file));

            // Only push a new history entry if this is a different overlay.
            const currentState = global.history.state;
            if (!currentState || currentState.file !== file) {
                global.history.pushState({ modalOpen: true, file, icon, name }, '', url);
            }

            if (typeof global._modalSetup === 'function') {
                global._modalSetup(file, icon, name);
            }

            this.emit('routechange', { type: 'overlay', file, icon, name });
        },

        // ── Navigation ────────────────────────────────────────────────────────

        /**
         * Navigate to a slug — either as an overlay or a full-page load.
         * FIX #6: Uses window.location.assign() instead of .href setter.
         *
         * @param {string}  slug
         * @param {{ overlay?: boolean, title?: string }} opts
         */
        go(slug, opts = {}) {
            const file = this.resolve(slug);
            if (!file) {
                console.warn('[VDRouter] go(): could not resolve slug:', slug);
                return;
            }

            if (opts.overlay) {
                this.openOverlay(file, opts);
            } else {
                this.emit('routechange', { type: 'navigate', file });
                global.location.assign(file);
            }
        },

        // ── Link Binding ──────────────────────────────────────────────────────

        /**
         * Wire all [data-router] anchors that have not yet been bound.
         * Called on init and automatically by MutationObserver (FIX #9).
         */
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

        /**
         * Wire all [data-back] elements that have not yet been bound.
         */
        bindBackLinks() {
            document.querySelectorAll('[data-back]:not([data-back-bound])').forEach(el => {
                el.setAttribute('data-back-bound', '');
                el.addEventListener('click', e => {
                    e.preventDefault();

                    // Inside a modal iframe → ask the parent to close.
                    if (global.self !== global.top) {
                        try {
                            global.parent.postMessage(
                                { type: 'vd:close-overlay' },
                                global.location.origin
                            );
                            return;
                        } catch (_) {}
                    }

                    if (global.history.length > 1) {
                        global.history.back();
                    } else {
                        global.location.assign('index.html');
                    }
                });
            });
        },

        /**
         * Listen for vd:close-overlay postMessage from iframe children.
         * Idempotent — safe to call multiple times.
         */
        bindIframeBridge() {
            if (global._vdIframeBridgeBound) return;
            global._vdIframeBridgeBound = true;

            global.addEventListener('message', event => {
                if (event.origin !== global.location.origin) return;
                if ((event.data || {}).type !== 'vd:close-overlay') return;

                if (typeof global.closeModal === 'function') {
                    global.closeModal();
                } else if (global.history.state && global.history.state.modalOpen) {
                    global.history.back();
                }
            });
        },

        // ── Init ─────────────────────────────────────────────────────────────

        /**
         * Initialise the router. Called automatically on DOMContentLoaded.
         *
         * FIX #4: GitHub Pages 404 redirect now resolves the *full* stored
         *         path rather than just the first path segment, so deep routes
         *         like 'printbydd-store/keychain' open the correct overlay.
         *
         * FIX #5: closeModal trap is installed here via defineProperty so it
         *         catches assignments made at any point in the page lifecycle.
         */
        init() {
            // Install the closeModal interceptor as early as possible.
            _installCloseModalTrap();

            // 1. GitHub Pages 404 redirect
            //    The 404.html page stores the original pathname in sessionStorage
            //    as '__vd_redirect__'. We pick it up here and open the overlay.
            try {
                const redirect = sessionStorage.getItem('__vd_redirect__');
                if (redirect) {
                    sessionStorage.removeItem('__vd_redirect__');

                    const params = new URLSearchParams(global.location.search);
                    if (!params.has('m')) {
                        // FIX #4: resolve the full redirect path, not just segment[0]
                        const slug = redirect.replace(/^\/+|\/+$/g, '');
                        if (slug) {
                            const file  = this.resolve(slug);
                            const title = slug.replace(/-/g, ' ');
                            setTimeout(() => this.openOverlay(file, { title }), 200);
                        }
                    }
                }
            } catch (_) {}

            // 2. Direct URL visits with ?m=file
            const url         = new URL(global.location.href);
            const modalParam  = url.searchParams.get('m');

            if (modalParam) {
                const file = decodeURIComponent(modalParam);
                setTimeout(() => {
                    if (typeof global._modalSetup === 'function') {
                        global._modalSetup(file, '🔬', 'ViaDecide Tool');
                    }
                    global.history.replaceState(
                        { modalOpen: true, file, icon: '🔬', name: 'ViaDecide Tool' },
                        '',
                        global.location.href
                    );
                }, 300);
            } else {
                global.history.replaceState({ modalOpen: false }, '', global.location.href);
            }

            // 3. Back / Forward navigation (popstate)
            global.addEventListener('popstate', e => {
                if (e.state && e.state.modalOpen) {
                    // Forward into an overlay
                    if (typeof global._modalSetup === 'function') {
                        global._modalSetup(
                            e.state.file,
                            e.state.icon || '🔬',
                            e.state.name || ''
                        );
                    }
                } else {
                    // Back out of an overlay — FIX #10: null-guarded DOM access
                    if (typeof _originalCloseModal === 'function') {
                        _originalCloseModal();
                    } else {
                        _closeModalDOM();
                    }
                }
            });

            this.bindLinks();
            this.bindBackLinks();
            this.bindIframeBridge();
            _observeDynamicLinks();
        }
    };

    // ─── Expose & Auto-Init ───────────────────────────────────────────────────

    global.VDRouter = VDRouter;

    document.addEventListener('DOMContentLoaded', () => VDRouter.init());

})(window);
