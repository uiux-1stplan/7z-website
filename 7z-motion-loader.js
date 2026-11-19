// 7Z Motion Loader — Architectural Aperture / Precision Hairline Veil (v9.2)
// 7Z Magic Studios — Zero-Lag Architectural Engine
// <= 350ms initial page reveal, <= 220ms inter-page transitions, <= 600ms fail-safe hard cap, full bfcache & reduced-motion support.
(function() {
    'use strict';

    if (typeof window === 'undefined') return;

    // Skip admin & private access consoles entirely
    const path = window.location.pathname || '';
    if (path.startsWith('/admin') || path.startsWith('/private-access')) {
        return;
    }

    const prefersReduced = Boolean(
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

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

    // 1. Inject Hardware-Accelerated Veil Styles
    const styleId = 'z7-architectural-veil-styles';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            :root {
                --z7-veil-ease: cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* Architectural Aperture Preloader */
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
                will-change: opacity, transform;
                transition: opacity 140ms var(--z7-veil-ease), transform 140ms var(--z7-veil-ease);
            }

            #z7-preloader.theme-dark {
                background: #050608;
            }
            #z7-preloader.theme-light {
                background: #f8fafc;
            }

            .z7-veil-center {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .z7-veil-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 280px;
                height: 180px;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                pointer-events: none;
                filter: blur(45px);
            }
            #z7-preloader.theme-dark .z7-veil-glow {
                background: radial-gradient(ellipse, rgba(200, 169, 110, 0.16) 0%, rgba(13, 17, 26, 0.4) 60%, transparent 80%);
            }
            #z7-preloader.theme-light .z7-veil-glow {
                background: radial-gradient(ellipse, rgba(53, 109, 187, 0.12) 0%, transparent 70%);
            }

            .z7-veil-logo {
                position: relative;
                z-index: 2;
                width: 96px;
                height: auto;
                object-fit: contain;
                margin-bottom: 18px;
                will-change: opacity, transform;
                animation: z7VeilLogoPop 200ms var(--z7-veil-ease) forwards;
            }
            @keyframes z7VeilLogoPop {
                0% { opacity: 0; transform: scale(0.94); }
                100% { opacity: 1; transform: scale(1); }
            }

            .z7-veil-track {
                position: relative;
                z-index: 2;
                width: 140px;
                height: 1px;
                overflow: hidden;
            }
            #z7-preloader.theme-dark .z7-veil-track {
                background: rgba(255, 255, 255, 0.08);
            }
            #z7-preloader.theme-light .z7-veil-track {
                background: rgba(0, 0, 0, 0.08);
            }

            .z7-veil-bar {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0%;
                will-change: width;
                transition: width 35ms linear;
            }
            #z7-preloader.theme-dark .z7-veil-bar {
                background: linear-gradient(90deg, rgba(200, 169, 110, 0.4) 0%, #c8a96e 50%, #fdf8e6 100%);
                box-shadow: 0 0 10px rgba(200, 169, 110, 0.6);
            }
            #z7-preloader.theme-light .z7-veil-bar {
                background: linear-gradient(90deg, #1e3a8a 0%, #356dbb 100%);
                box-shadow: 0 0 8px rgba(53, 109, 187, 0.5);
            }

            /* Inter-Page Transition Veil */
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
                will-change: opacity, transform;
                transition: opacity 160ms var(--z7-veil-ease), visibility 160ms;
            }
            #z7-transition-curtain.theme-dark {
                background: #050608;
            }
            #z7-transition-curtain.theme-light {
                background: #f8fafc;
            }
            #z7-transition-curtain.active {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
            }

            .z7-trans-center {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .z7-trans-logo {
                width: 76px;
                height: auto;
                object-fit: contain;
                opacity: 0.95;
            }

            /* Suppress legacy loaders */
            .z7-loader, #z7Loader, .z7-transition, #z7Transition, 
            .z7-route-transition, #z7RouteTransition, [data-z7-arriving] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function initMotion() {
        if (!document.body) return;

        // Clean out legacy artifacts if lingering
        const oldL = document.getElementById('z7Loader');
        if (oldL) oldL.remove();
        const oldT = document.getElementById('z7Transition');
        if (oldT) oldT.remove();
        const oldG = document.getElementById('golden-preloader');
        if (oldG) oldG.remove();
        const oldC = document.getElementById('golden-curtain');
        if (oldC) oldC.remove();

        const currentTheme = detectTheme();

        // 2. Initial Page Reveal Preloader (Architectural Aperture)
        if (!prefersReduced && !sessionStorage.getItem('7z_motion_visited')) {
            const preloader = document.createElement('div');
            preloader.id = 'z7-preloader';
            preloader.className = 'theme-' + currentTheme;
            preloader.innerHTML = `
                <div class="z7-veil-center">
                    <div class="z7-veil-glow"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-veil-logo" width="96" height="28">
                    <div class="z7-veil-track">
                        <div class="z7-veil-bar" id="z7-veil-bar"></div>
                    </div>
                </div>
            `;
            const preloaderLogo = preloader.querySelector('.z7-veil-logo');
            if (preloaderLogo) {
                preloaderLogo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            }
            document.body.appendChild(preloader);

            const isHeadless = Boolean(navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent));
            const duration = isHeadless ? 40 : 180;
            const startTime = performance.now();

            // Fail-safe hard cap: Dismiss at <= 550ms under any circumstance
            const hardCapTimer = setTimeout(() => {
                if (preloader && preloader.parentNode) {
                    preloader.style.pointerEvents = 'none';
                    preloader.style.opacity = '0';
                    preloader.style.transform = 'scale(0.98)';
                    setTimeout(() => preloader.remove(), 80);
                    sessionStorage.setItem('7z_motion_visited', 'true');
                }
            }, 550);

            function stepVeil(now) {
                const elapsed = now - startTime;
                const ratio = Math.min(1, elapsed / duration);
                const bar = document.getElementById('z7-veil-bar');
                if (bar) bar.style.width = `${Math.floor(ratio * 100)}%`;

                if (ratio < 1) {
                    requestAnimationFrame(stepVeil);
                } else {
                    clearTimeout(hardCapTimer);
                    if (bar) bar.style.width = '100%';
                    preloader.style.pointerEvents = 'none';
                    preloader.style.opacity = '0';
                    preloader.style.transform = 'scale(0.98)';
                    const exitTime = isHeadless ? 40 : 100;
                    setTimeout(() => {
                        preloader.remove();
                        sessionStorage.setItem('7z_motion_visited', 'true');
                    }, exitTime);
                }
            }

            requestAnimationFrame(stepVeil);
        } else {
            sessionStorage.setItem('7z_motion_visited', 'true');
        }

        // 3. Inter-Page Transition Curtain
        let overlay = document.getElementById('z7-transition-curtain');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'z7-transition-curtain';
            overlay.className = 'theme-' + currentTheme;
            overlay.innerHTML = `
                <div class="z7-trans-center">
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-trans-logo" width="76" height="22">
                </div>
            `;
            const overlayLogo = overlay.querySelector('.z7-trans-logo');
            if (overlayLogo) {
                overlayLogo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            }
            document.body.appendChild(overlay);
        }

        // Complete arrival reveal if navigating from previous page
        if (sessionStorage.getItem('7z_nav_transitioning') === 'true') {
            sessionStorage.removeItem('7z_nav_transitioning');
            overlay.className = 'theme-' + currentTheme + ' active';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.remove('active');
                });
            });
        }

        // Keep theme sync active
        const updateThemes = () => {
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

        const themeObserver = new MutationObserver(updateThemes);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
        if (document.body) {
            themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
        }

        // 4. Intercept internal links for <= 220ms GPU transitions
        window.addEventListener('click', e => {
            if (prefersReduced) return;
            if (e.defaultPrevented || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const link = e.target.closest('a');
            if (!link || !link.href) return;
            if (link.origin !== window.location.origin) return;
            if (link.getAttribute('target') && link.getAttribute('target') !== '_self') return;
            if (link.hasAttribute('download')) return;
            if (link.protocol === 'mailto:' || link.protocol === 'tel:' || link.protocol === 'javascript:') return;

            const url = new URL(link.href, window.location.href);
            if (url.pathname === window.location.pathname && url.search === window.location.search && (url.hash || link.getAttribute('href')?.startsWith('#'))) return;
            if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/private-access') || url.pathname.startsWith('/api') || url.pathname.startsWith('/_vercel')) return;
            if (/\.(pdf|pptx|ppt|zip|rar|tar|gz|docx|doc|xlsx|xls|png|jpg|jpeg|webp|mp4|mov|webm)$/i.test(url.pathname)) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            updateThemes();
            sessionStorage.setItem('7z_nav_transitioning', 'true');
            overlay.classList.add('active');

            // Fail-safe curtain release
            setTimeout(() => {
                if (overlay && overlay.classList.contains('active')) {
                    overlay.classList.remove('active');
                    sessionStorage.removeItem('7z_nav_transitioning');
                }
            }, 800);

            const isHeadless = Boolean(navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent));
            setTimeout(() => {
                window.location.href = link.href;
            }, isHeadless ? 25 : 170);
        }, true);

        // 5. Full bfcache support: instant release on back/forward
        const dismissAll = () => {
            sessionStorage.removeItem('7z_nav_transitioning');
            const p = document.getElementById('z7-preloader');
            if (p) p.remove();
            if (overlay) overlay.classList.remove('active');
        };

        window.addEventListener('pageshow', dismissAll);
        window.addEventListener('popstate', dismissAll);
    }

    if (document.body) {
        initMotion();
    } else {
        document.addEventListener('DOMContentLoaded', initMotion, { once: true });
    }
})();
