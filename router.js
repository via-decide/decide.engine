/**
 * ViaDecide Router (VDRouter)
 * Handles SPA routing, prefetching, GitHub Pages 404 redirects, and history-synced modal overlays.
 */
(function(global) {
    const events = {};
    const prefetched = new Set();
    let originalCloseModal = null;

    // Comprehensive map of all ViaDecide tools and pages
    const routesMap = {
        'interview-prep': 'interview-prep/index.html',
        'sales-dashboard': 'sales-dashboard/index.html',
        'jalaram-food-court-rajkot': 'Jalaram-food-court-rajkot/index.html',
        'finance-dashboard-msme': 'finance-dashboard-msme/index.html',
        'alchemist': 'alchemist/index.html',
        'app-generator': 'app-generator/index.html',
        'memory': 'memory/index.html',
        'prompt-alchemy': 'prompt-alchemy/index.html',
        'viaguide': 'ViaGuide/index.html',
        'studyos': 'StudyOS/index.html',
        'brief': 'brief/index.html',
        'student-research': 'student-research/index.html',
        'ondc-demo': 'ONDC-demo/index.html',
        'engine-deals': 'engine-deals/index.html',
        'discounts': 'discounts/index.html',
        'cashback-rules': 'cashback-rules/index.html',
        'cashback-claim': 'cashback-claim/index.html',
        'hexwars': 'HexWars/index.html',
        'mars-rover-simulator-game': 'mars-rover-simulator-game/index.html',
        'hivaland': 'HivaLand/index.html',
        'decide-service': 'decide-service/index.html',
        'decide-foodrajkot': 'decide-foodrajkot/index.html',
        'engine-license': 'engine-license/index.html',
        'cohort-apply-here': 'cohort-apply-here/index.html',
        'customswipeengineform': 'CustomSwipeEngineForm/index.html',
        'pricing': 'pricing/index.html',
        'engine-activation-request': 'engine-activation-request/index.html',
        'numberplate': 'printbydd-store/numberplate.html',
        'keychain': 'printbydd-store/keychain.html',
        'gifts-that-mean-more': 'printbydd-store/gifts-that-mean-more.html',
        'viadecide-blogs': 'Viadecide-blogs/index.html',
        'the-decision-stack': 'the-decision-stack/index.html',
        'why-small-businesses-dont-need-saas': 'why-small-businesses-dont-need-saas/index.html',
        'decision-infrastructure-india': 'decision-infrastructure-india/index.html',
        'ondc-for-bharat': 'ondc-for-bharat/index.html',
        'indiaai-mission-2025': 'indiaai-mission-2025/index.html',
        'multi-source-research-explained': 'multi-source-research-explained/index.html',
        'decision-brief-guide': 'decision-brief-guide/index.html',
        'viadecide-public-beta': 'viadecide-public-beta/index.html',
        'decision-brief': 'decision-brief/index.html',
        'dharamdaxini': 'DharamDaxini/index.html',
        'founder': 'founder/index.html',
        'contact': 'contact/index.html',
        'privacy': 'privacy/index.html',
        'terms': 'terms/index.html'
    };

    const VDRouter = {
        on(event, cb) {
            if (!events[event]) events[event] = [];
            events[event].push(cb);
        },

        emit(event, data) {
            if (events[event]) {
                events[event].forEach(cb => cb(data));
            }
        },

        routes() {
            return routesMap;
        },

        resolve(slug) {
            if (!slug) return '';
            const cleanSlug = slug.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
            const lowerSlug = cleanSlug.toLowerCase();
            
            if (routesMap[lowerSlug]) {
                return routesMap[lowerSlug];
            }
            
            // Fallback: assume the slug is a directory containing an index.html
            return `${cleanSlug}/index.html`;
        },

        prefetch(slug) {
            const file = this.resolve(slug);
            if (!file || prefetched.has(file)) return;
            
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = file;
            link.as = 'document';
            document.head.appendChild(link);
            prefetched.add(file);
        },

        openOverlay(file, options = {}) {
            let icon = '🔬';
            let name = 'Tool';
            
            if (options.title) {
                if (options.title.includes('\u2009')) {
                    const parts = options.title.split('\u2009');
                    icon = parts[0];
                    name = parts.slice(1).join('\u2009');
                } else {
                    const match = options.title.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*(.*)/u);
                    if (match) {
                        icon = match[1];
                        name = match[2];
                    } else {
                        name = options.title;
                    }
                }
            }

            // Sync with browser history
            const url = new URL(window.location);
            url.searchParams.set('m', encodeURIComponent(file));
            window.history.pushState({ modalOpen: true, file, icon, name }, '', url);

            if (typeof window._modalSetup === 'function') {
                window._modalSetup(file, icon, name);
            }
            
            this.emit('routechange', { type: 'overlay', file });
        },

        go(slug, options = {}) {
            const file = this.resolve(slug);
            if (options.overlay) {
                this.openOverlay(file, options);
            } else {
                window.location.href = file;
            }
        },

        bindLinks() {
            // Redundancy binding for programmatic calls, primary logic is in index.html
            document.querySelectorAll('a[data-router]').forEach(el => {
                if (!el._routerBound) {
                    el.addEventListener('click', (e) => {
                        e.preventDefault();
                        const slug = el.getAttribute('href').replace(/^\/+/, '');
                        const isOverlay = el.hasAttribute('data-overlay');
                        this.go(slug, { overlay: isOverlay });
                    });
                    el._routerBound = true;
                }
            });
        },

        init() {
            // 1. Intercept GitHub Pages 404 Redirects
            try {
                const redirect = sessionStorage.getItem('__vd_redirect__');
                if (redirect) {
                    sessionStorage.removeItem('__vd_redirect__');
                    const params = new URLSearchParams(window.location.search);
                    
                    // If the redirect already converted to a modal param, skip
                    if (!params.has('m')) {
                        const slug = redirect.replace(/^\/+|\/+$/g, '').split('/')[0];
                        if (slug) {
                            setTimeout(() => {
                                this.go(slug, { overlay: true, title: slug.replace(/-/g, ' ') });
                            }, 200);
                        }
                    }
                }
            } catch (e) {}

            // 2. Handle direct URL visits with `?m=file` parameter
            const url = new URL(window.location);
            const modalParam = url.searchParams.get('m');
            if (modalParam) {
                const decodedFile = decodeURIComponent(modalParam);
                setTimeout(() => {
                    if (typeof window._modalSetup === 'function') {
                        window._modalSetup(decodedFile, '🔬', 'ViaDecide Tool');
                    }
                    window.history.replaceState({ modalOpen: true, file: decodedFile, icon: '🔬', name: 'ViaDecide Tool' }, '', window.location.href);
                }, 300);
            } else {
                window.history.replaceState({ modalOpen: false }, '', window.location.href);
            }

            // 3. Handle Back/Forward Browser Navigation
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.modalOpen) {
                    // Forward navigation into an overlay
                    if (typeof window._modalSetup === 'function') {
                        window._modalSetup(e.state.file, e.state.icon || '🔬', e.state.name || '');
                    }
                } else {
                    // Backward navigation out of an overlay
                    if (originalCloseModal) {
                        originalCloseModal();
                    } else {
                        document.getElementById('modal').classList.remove('open');
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
                }
            });
            
            this.bindLinks();
        }
    };

    global.VDRouter = VDRouter;

    // Initialize once the DOM is ready and inject the history patch onto closeModal
    document.addEventListener('DOMContentLoaded', () => {
        VDRouter.init();

        // Monkey-patch closeModal from index.html so manual clicking of 'X' or 'Esc' correctly rewinds browser history
        if (typeof global.closeModal === 'function' && !global._vdRouterHooked) {
            originalCloseModal = global.closeModal;
            global.closeModal = function() {
                if (global.history.state && global.history.state.modalOpen) {
                    global.history.back(); // This fires popstate, executing the actual close logic
                } else {
                    originalCloseModal();
                    
                    // Clean URL just in case
                    const url = new URL(window.location);
                    if (url.searchParams.has('m')) {
                        url.searchParams.delete('m');
                        window.history.replaceState({ modalOpen: false }, '', url.pathname);
                    }
                }
            };
            global._vdRouterHooked = true;
        }
    });

})(window);
