// 7Z Motion Loader — Unified Preloader & Bidirectional Cinematic Route Transitions (v10.1)
// 7Z Magic Studios — Zero-Regression Architecture
// System 1: Original Atmospheric Ambient Blur Glow Preloader (Initial Entry / Reload)
// System 2: Bidirectional Coordinated Route Transitions (OUT Phase on click -> IN Phase on arrival)
(function() {
    'use strict';

    if (typeof window === 'undefined') return;

    // Never interfere with admin or private client portals
    const path = window.location.pathname || '';
    if (path.startsWith('/admin') || path.startsWith('/private-access')) {
        return;
    }

    const reducedMotion = Boolean(
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // 1. Detect Adaptive Theme (Dark / Light)
    function detectTheme() {
        try {
            const stored = localStorage.getItem('z7-theme') || 
                           localStorage.getItem('7z-course-theme') || 
                           localStorage.getItem('theme');
            if (stored === 'light') return 'light';
            if (stored === 'dark') return 'dark';
        } catch (_) {}

        const docEl = document.documentElement;
        const body = document.body;
        const attr = docEl.getAttribute('data-theme') || (body && body.getAttribute('data-theme'));
        if (attr === 'light') return 'light';
        if (attr === 'dark') return 'dark';

        if (docEl.classList.contains('light') || (body && body.classList.contains('light'))) return 'light';
        if (docEl.classList.contains('dark') || (body && body.classList.contains('dark'))) return 'dark';

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
        return 'dark';
    }

    // 2. Inject CSS Styles for Preloader & Bidirectional Transition Curtain
    const styleId = 'z7-motion-loader-styles';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            :root {
                --z7-ease-cinema: cubic-bezier(0.22, 1, 0.36, 1);
            }

            /* ============================================================
               1. ATMOSPHERIC AMBIENT BLUR GLOW PRELOADER (Original 7Z Component)
               ============================================================ */
            #z7-preloader {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                pointer-events: auto;
                transition: opacity 0.35s ease, filter 0.35s ease, transform 0.35s var(--z7-ease-cinema);
                will-change: opacity, filter, transform;
            }

            #z7-preloader.is-dismissed {
                opacity: 0 !important;
                pointer-events: none !important;
                filter: blur(12px) !important;
                transform: scale(1.03) !important;
            }

            #z7-preloader.theme-dark {
                background-color: #06070d;
            }
            #z7-preloader.theme-dark .z7-ambient-glow {
                background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(30, 58, 138, 0.24) 45%, transparent 72%);
            }
            #z7-preloader.theme-dark .z7-logo-img {
                filter: drop-shadow(0 0 28px rgba(37, 99, 235, 0.40)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.85));
            }
            #z7-preloader.theme-dark .z7-track {
                background: rgba(255, 255, 255, 0.08);
            }
            #z7-preloader.theme-dark .z7-bar {
                background: linear-gradient(90deg, #1e3a8a, #2563eb, #60a5fa);
                box-shadow: 0 0 12px rgba(37, 99, 235, 0.65), 0 0 24px rgba(96, 165, 250, 0.4);
            }
            #z7-preloader.theme-dark .z7-counter {
                color: rgba(255, 255, 255, 0.75);
            }

            #z7-preloader.theme-light {
                background-color: #f8fafc;
            }
            #z7-preloader.theme-light .z7-ambient-glow {
                background: radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(30, 58, 138, 0.10) 45%, transparent 72%);
            }
            #z7-preloader.theme-light .z7-logo-img {
                filter: drop-shadow(0 0 22px rgba(30, 58, 138, 0.20)) drop-shadow(0 4px 14px rgba(15, 23, 42, 0.15));
            }
            #z7-preloader.theme-light .z7-track {
                background: rgba(15, 23, 42, 0.08);
            }
            #z7-preloader.theme-light .z7-bar {
                background: linear-gradient(90deg, #0f172a, #1e3a8a, #2563eb);
                box-shadow: 0 0 10px rgba(30, 58, 138, 0.45);
            }
            #z7-preloader.theme-light .z7-counter {
                color: #1e3a8a;
                font-weight: 600;
            }

            .z7-preloader-center {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .z7-ambient-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 380px;
                height: 280px;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                filter: blur(55px);
                pointer-events: none;
                animation: z7AtmosphericBreathe 5.8s ease-in-out infinite alternate;
            }
            @keyframes z7AtmosphericBreathe {
                0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.75; }
                50% { transform: translate(-50%, -50%) scale(1.18); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.75; }
            }

            .z7-logo-img {
                position: relative;
                z-index: 2;
                width: 110px;
                height: auto;
                object-fit: contain;
                margin-bottom: 24px;
                animation: z7CinemaLogoReveal 1.6s var(--z7-ease-cinema) forwards;
            }
            @keyframes z7CinemaLogoReveal {
                0% {
                    opacity: 0;
                    filter: blur(20px);
                    transform: scale(0.92);
                }
                100% {
                    opacity: 1;
                    filter: blur(0px);
                    transform: scale(1);
                }
            }

            .z7-track {
                position: relative;
                z-index: 2;
                width: 150px;
                height: 2px;
                border-radius: 4px;
                overflow: hidden;
            }
            .z7-bar {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0%;
                border-radius: 4px;
                transition: width 0.05s linear;
            }
            .z7-counter {
                position: relative;
                z-index: 2;
                margin-top: 10px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 11px;
                letter-spacing: 0.22em;
            }

            /* ============================================================
               2. BIDIRECTIONAL ROUTE TRANSITION CURTAIN (OUT & IN PHASES)
               ============================================================ */
            #z7-transition-curtain {
                position: fixed;
                inset: 0;
                z-index: 999998;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                opacity: 0;
                visibility: hidden;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                transition: opacity 260ms var(--z7-ease-cinema), visibility 260ms;
                will-change: opacity, backdrop-filter;
            }

            /* OUT PHASE: Curtain active & covering screen */
            #z7-transition-curtain.active {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
            }

            #z7-transition-curtain.theme-dark {
                background-color: rgba(6, 7, 13, 0.92);
            }
            #z7-transition-curtain.theme-dark .z7-trans-glow {
                background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(30, 58, 138, 0.20) 50%, transparent 72%);
            }
            #z7-transition-curtain.theme-dark .z7-trans-logo {
                filter: drop-shadow(0 0 24px rgba(37, 99, 235, 0.45));
            }

            #z7-transition-curtain.theme-light {
                background-color: rgba(248, 250, 252, 0.92);
            }
            #z7-transition-curtain.theme-light .z7-trans-glow {
                background: radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(30, 58, 138, 0.10) 50%, transparent 72%);
            }
            #z7-transition-curtain.theme-light .z7-trans-logo {
                filter: drop-shadow(0 0 18px rgba(30, 58, 138, 0.25));
            }

            .z7-trans-center {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .z7-trans-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 220px;
                height: 160px;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                filter: blur(35px);
                pointer-events: none;
            }
            .z7-trans-logo {
                position: relative;
                z-index: 2;
                width: 85px;
                height: auto;
                object-fit: contain;
                opacity: 0.95;
                animation: z7TransLogoClarify 240ms ease-in-out forwards;
            }
            @keyframes z7TransLogoClarify {
                0% {
                    opacity: 0.3;
                    filter: blur(8px);
                    transform: scale(0.95);
                }
                100% {
                    opacity: 1;
                    filter: blur(0px);
                    transform: scale(1);
                }
            }

            /* Legacy cleanup suppression */
            #z7-aperture-preloader, #z7-aperture-curtain {
                display: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function initMotionLoader() {
        if (!document.body) return;

        const currentTheme = detectTheme();
        const isHeadless = Boolean(navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent));
        const isMobile = Boolean(window.innerWidth <= 768 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
        
        // Detect navigation type (reload vs direct entry vs internal transition)
        let isReload = false;
        try {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries && navEntries[0]) {
                isReload = (navEntries[0].type === 'reload');
            }
        } catch (_) {}

        const isNavTransitioning = (sessionStorage.getItem('7z_nav_transitioning') === 'true');
        const hasVisitedBefore = Boolean(sessionStorage.getItem('7z_motion_visited'));

        // -------------------------------------------------------------
        // A. MOUNT TRANSITION CURTAIN (Pre-allocated for OUT & IN)
        // -------------------------------------------------------------
        let overlay = document.getElementById('z7-transition-curtain');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'z7-transition-curtain';
            overlay.className = 'theme-' + currentTheme;
            overlay.innerHTML = `
                <div class="z7-trans-center">
                    <div class="z7-trans-glow"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-trans-logo" width="85" height="94">
                </div>
            `;
            const overlayLogo = overlay.querySelector('.z7-trans-logo');
            if (overlayLogo) {
                overlayLogo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            }
            document.body.appendChild(overlay);
        }

        // -------------------------------------------------------------
        // B. IN-PHASE EXECUTION (If arriving from internal page transition)
        // -------------------------------------------------------------
        if (isNavTransitioning) {
            sessionStorage.removeItem('7z_nav_transitioning');
            // Curtain starts in active/covering state
            overlay.className = 'theme-' + currentTheme + ' active';

            // Reveal the incoming destination page smoothly after render
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (overlay) {
                            overlay.classList.remove('active');
                        }
                    }, isHeadless ? 20 : 60);
                });
            });
        }

        // -------------------------------------------------------------
        // C. INITIAL PRELOADER EXECUTION (On first visit or page reload)
        // -------------------------------------------------------------
        const shouldShowPreloader = (!hasVisitedBefore || isReload) && !isNavTransitioning;

        if (shouldShowPreloader) {
            const preloader = document.createElement('div');
            preloader.id = 'z7-preloader';
            preloader.className = 'theme-' + currentTheme;
            preloader.innerHTML = `
                <div class="z7-preloader-center">
                    <div class="z7-ambient-glow"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-logo-img" width="110" height="85">
                    <div class="z7-track">
                        <div class="z7-bar" id="z7-progress-bar"></div>
                    </div>
                    <div class="z7-counter" id="z7-counter-text">0%</div>
                </div>
            `;
            const preloaderLogo = preloader.querySelector('.z7-logo-img');
            if (preloaderLogo) {
                preloaderLogo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            }
            document.body.appendChild(preloader);

            const startTime = performance.now();
            const duration = isHeadless ? 100 : isMobile ? 320 : 420;
            const bar = preloader.querySelector('#z7-progress-bar');
            const counter = preloader.querySelector('#z7-counter-text');

            // Hard fail-safe timer (never stick beyond 1200ms)
            const failSafeId = setTimeout(() => {
                dismissPreloader(preloader);
            }, isHeadless ? 300 : 1200);

            function dismissPreloader(node) {
                if (!node || !node.parentNode) return;
                clearTimeout(failSafeId);
                node.classList.add('is-dismissed');
                node.style.setProperty('pointer-events', 'none', 'important');
                node.style.setProperty('opacity', '0', 'important');
                node.style.setProperty('filter', 'blur(12px)', 'important');
                node.style.setProperty('transform', 'scale(1.03)', 'important');
                setTimeout(() => {
                    if (node && node.parentNode) node.remove();
                }, 350);
                sessionStorage.setItem('7z_motion_visited', 'true');
            }

            function updateProgress(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(1, elapsed / duration);
                const percent = Math.floor(progress * 100);

                if (bar) bar.style.width = percent + '%';
                if (counter) counter.textContent = percent + '%';

                if (progress < 1) {
                    requestAnimationFrame(updateProgress);
                } else {
                    dismissPreloader(preloader);
                }
            }

            requestAnimationFrame(updateProgress);
        }

        // -------------------------------------------------------------
        // D. DYNAMIC THEME OBSERVER
        // -------------------------------------------------------------
        const updateThemesOnFly = () => {
            const nextTheme = detectTheme();
            if (overlay) {
                overlay.classList.remove('theme-dark', 'theme-light');
                overlay.classList.add('theme-' + nextTheme);
            }
            const p = document.getElementById('z7-preloader');
            if (p) {
                p.classList.remove('theme-dark', 'theme-light');
                p.classList.add('theme-' + nextTheme);
            }
        };

        const themeObserver = new MutationObserver(updateThemesOnFly);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
        if (document.body) {
            themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
        }

        // -------------------------------------------------------------
        // E. OUT-PHASE EXECUTION (Intercept internal link clicks)
        // -------------------------------------------------------------
        window.addEventListener('click', (e) => {
            if (e.defaultPrevented || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const link = e.target.closest('a');
            if (!link || !link.href) return;
            if (link.origin !== window.location.origin) return;
            if (link.getAttribute('target') && link.getAttribute('target') !== '_self') return;
            if (link.hasAttribute('download')) return;
            if (link.protocol === 'mailto:' || link.protocol === 'tel:' || link.protocol === 'javascript:') return;

            const url = new URL(link.href, window.location.href);
            // Ignore same-page hash jumps
            if (url.pathname === window.location.pathname && url.search === window.location.search && (url.hash || link.getAttribute('href')?.startsWith('#'))) return;
            // Never intercept admin, private access, or API routes
            if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/private-access') || url.pathname.startsWith('/api') || url.pathname.startsWith('/_vercel')) return;
            // Never intercept direct file downloads
            if (/\.(pdf|pptx|ppt|zip|rar|tar|gz|docx|doc|xlsx|xls|png|jpg|jpeg|webp|mp4|mov|webm)$/i.test(url.pathname)) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            updateThemesOnFly();
            sessionStorage.setItem('7z_nav_transitioning', 'true');

            // Trigger OUT phase animation
            overlay.classList.add('active');

            // Fail-safe release if navigation fails
            setTimeout(() => {
                if (overlay && overlay.classList.contains('active')) {
                    overlay.classList.remove('active');
                    sessionStorage.removeItem('7z_nav_transitioning');
                }
            }, 1800);

            // Navigate when OUT animation has covered screen
            const outDuration = reducedMotion ? 0 : isHeadless ? 30 : 250;
            setTimeout(() => {
                window.location.href = link.href;
            }, outDuration);
        }, true);

        // -------------------------------------------------------------
        // F. BFCACHE & BACK/FORWARD RESTORATION
        // -------------------------------------------------------------
        const dismissAllOverlays = () => {
            sessionStorage.removeItem('7z_nav_transitioning');
            const p = document.getElementById('z7-preloader');
            if (p) p.remove();
            if (overlay) overlay.classList.remove('active');
        };

        window.addEventListener('pageshow', dismissAllOverlays);
        window.addEventListener('popstate', dismissAllOverlays);
    }

    if (document.body) {
        initMotionLoader();
    } else {
        document.addEventListener('DOMContentLoaded', initMotionLoader, { once: true });
    }
})();
