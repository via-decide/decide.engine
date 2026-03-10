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
        'interview-prep': 'interview-prep.html',
        'sales-dashboard': 'sales-dashboard.html',
        'jalaram-food-court-rajkot': 'Jalaram-food-court-rajkot.html',
        'finance-dashboard-msme': 'finance-dashboard-msme.html',
        'alchemist': 'alchemist.html',
        'app-generator': 'app-generator.html',
        'memory': 'memory.html',
        'prompt-alchemy': 'prompt-alchemy.html',
        'viaguide': 'ViaGuide.html',
        'studyos': 'StudyOS.html',
        'brief': 'brief.html',
        'student-research': 'student-research.html',
        'ondc-demo': 'ONDC-demo.html',
        'engine-deals': 'engine-deals.html',
        'discounts': 'discounts.html',
        'cashback-rules': 'cashback-rules.html',
        'cashback-claim': 'cashback-claim.html',
        'hexwars': 'HexWars.html',
        'mars-rover-simulator-game': 'mars-rover-simulator-game.html',
        'hivaland': 'HivaLand.html',
        'wings-of-fire': 'WingsOfFire.html',
        'wingsoffire': 'WingsOfFire.html',
        'decide-service': 'decide-service.html',
        'decide-foodrajkot': 'decide-foodrajkot.html',
        'engine-license': 'engine-license.html',
        'cohort-apply-here': 'cohort-apply-here.html',
        'customswipeengineform': 'CustomSwipeEngineForm.html',
        'pricing': 'pricing.html',
        'engine-activation-request': 'engine-license.html',
        'payment-register': 'payment-register.html',
        'printbydd-store': 'printbydd-store/index.html',
        'numberplate': 'printbydd-store/numberplate.html',
        'keychain': 'printbydd-store/keychain.html',
        'gifts-that-mean-more': 'printbydd-store/gifts-that-mean-more.html',
        'viadecide-blogs': 'Viadecide-blogs.html',
        'the-decision-stack': 'Viadecide-blogs.html',
        'why-small-businesses-dont-need-saas': 'Viadecide-blogs.html',
        'not-a-saas': 'not-a-saas/index.html',
        'decision-infrastructure-india': 'decision-infrastructure-india.html',
        'ondc-for-bharat': 'ondc-for-bharat.html',
        'indiaai-mission-2025': 'indiaai-mission-2025.html',
        'multi-source-research-explained': 'multi-source-research-explained.html',
        'decision-brief-guide': 'decision-brief-guide.html',
        'viadecide-public-beta': 'viadecide-public-beta.html',
        'decision-brief': 'decision-brief.html',
        'dharamdaxini': 'DharamDaxini.html',
        'dharamdaxini-legacy': 'DharamDaxini.html',
        'swipeos': 'SwipeOS.html',
        'swipeos-gandhidham': 'SwipeOS-gandhidham.html',
        'agent': 'agent.html',
        'laptops-under-50000': 'laptops-under-50000.html',
        'founder': 'founder.html',
        'audio.log': 'audio.log.html',
        'audiolog': 'audio.log.html',
        '#audio.log': 'audio.log.html',
        'contact': 'contact.html',
        'privacy': 'privacy.html',
        'terms': 'terms.html'
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

        resolve(pathOrSlug) {
            if (!pathOrSlug) return '';
            
            // 1. Clean input: remove leading/trailing slashes to ensure paths are strictly relative
            let cleanPath = pathOrSlug.replace(/^\/+|\/+$/g, '');
            
            // 2. Normalize for dictionary lookup: strip .html and /index to match raw slug names
            const lowerSlug = cleanPath.toLowerCase().replace(/\.html$/i, '').replace(/\/index$/i, '');
            
            // 3. Look up in our known routes dictionary
            if (routesMap[lowerSlug]) {
                return routesMap[lowerSlug];
            }
            
            // 4. If it already has an HTML extension, trust it and return the relative path
            if (cleanPath.endsWith('.html')) {
                return cleanPath;
            }
            
            // 5. If it ends in /index but is missing the extension, correct it
            if (cleanPath.endsWith('/index')) {
                return cleanPath + '.html';
            }
            
            // 6. Default fallback:
            //    - single segment slugs are usually flat *.html pages
            //    - nested paths keep folder/index.html behavior
            if (!cleanPath.includes('/')) {
                return `${cleanPath}.html`;
            }
            return `${cleanPath}/index.html`;
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
                    // Safe regex fallback to extract emoji if present
                    const match = options.title.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\S)\s*(.*)/);
                    if (match) {
                        icon = match[1];
                        name = match[2];
                    } else {
                        name = options.title;
                    }
                }
            }

            // Sync with browser history without breaking GitHub Pages paths
            const url = new URL(window.location);
            url.searchParams.delete('m');
            url.searchParams.set('m', encodeURIComponent(file));
            
            // Avoid duplicate state pushes if clicking the same tool twice
            const currentState = window.history.state;
            if (!currentState || currentState.file !== file) {
                window.history.pushState({ modalOpen: true, file, icon, name }, '', url);
            }

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
            // Secondary catch-all for programmatic anchor links
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
            // 1. Intercept GitHub Pages 404 Redirects
            try {
                const redirect = sessionStorage.getItem('__vd_redirect__');
                if (redirect) {
                    sessionStorage.removeItem('__vd_redirect__');
                    const params = new URLSearchParams(window.location.search);
                    
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

            // 3. Handle Back/Forward Browser Navigation (Popstate)
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.modalOpen) {
                    // Forward navigation into an overlay
                    if (typeof window._modalSetup === 'function') {
                        window._modalSetup(e.state.file, e.state.icon || '🔬', e.state.name || '');
                    }
                } else {
                    // Backward navigation out of an overlay
                    if (typeof global.closeModal === 'function') {
                        global.closeModal();
                    } else if (originalCloseModal) {
                        originalCloseModal();
                    } else {
                        const modal = document.getElementById('modal');
                        if(modal) modal.classList.remove('open');
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
            this.bindBackLinks();
            this.bindIframeBridge();
        }
    };

    global.VDRouter = VDRouter;

    // Initialize once the DOM is ready and securely inject the history patch onto closeModal
    document.addEventListener('DOMContentLoaded', () => {
        VDRouter.init();

        // Monkey-patch closeModal from index.html so manual clicking of 'X' or 'Esc' rewinds browser history
        if (typeof global.closeModal === 'function' && !global._vdRouterHooked) {
            originalCloseModal = global.closeModal;
            global.closeModal = function() {
                if (global.history.state && global.history.state.modalOpen) {
                    global.history.back(); // This fires popstate, executing the actual close logic seamlessly
                } else {
                    originalCloseModal();
                    
                    // Cleanup URL query params if fallback is hit
                    const url = new URL(window.location);
                    if (url.searchParams.has('m')) {
                        url.searchParams.delete('m');
                        window.history.replaceState({ modalOpen: false }, '', url.pathname + url.search);
                    }
                }
            };
            global._vdRouterHooked = true;
        }
    });

})(window);
