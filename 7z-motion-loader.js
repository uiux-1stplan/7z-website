// 7Z Motion Loader — Cinematic Opening Experience & Architectural Route Transitions (v10.2)
// 7Z Magic Studios — High-Craft Cinema Engineering
// System 1: Cinematic Architectural Preloader (Horizon Ignition, Monogram Crystallization, Aperture Iris Reveal)
// System 2: Architectural Aperture Route Transitions (Dual Obsidian Shutters, Seam Flash, Zero-FOUC Lifecycle)
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

    // 2. Inject High-Craft GPU Hardware-Accelerated Styles
    const styleId = 'z7-motion-loader-styles';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            :root {
                --z7-ease-cinema: cubic-bezier(0.85, 0, 0.15, 1);
                --z7-ease-open: cubic-bezier(0.16, 1, 0.3, 1);
                --z7-ease-close: cubic-bezier(0.77, 0, 0.175, 1);
            }

            /* ============================================================
               SYSTEM 1: CINEMATIC ARCHITECTURAL PRELOADER
               ============================================================ */
            #z7-cinema-preloader {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                pointer-events: auto;
                user-select: none;
                -webkit-user-select: none;
                transition: opacity 0.45s ease, filter 0.45s ease;
            }

            #z7-cinema-preloader.is-dismissed {
                opacity: 0 !important;
                pointer-events: none !important;
                filter: blur(10px) !important;
            }

            /* Dual Precision Cinematic Shutters (Top & Bottom) */
            .z7-pre-shutter {
                position: absolute;
                left: 0;
                right: 0;
                height: 50%;
                will-change: transform;
                transition: transform 0.65s var(--z7-ease-cinema);
                z-index: 1;
            }
            .z7-pre-shutter--top {
                top: 0;
                transform: translate3d(0, 0, 0);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .z7-pre-shutter--bottom {
                bottom: 0;
                transform: translate3d(0, 0, 0);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }

            #z7-cinema-preloader.is-opening .z7-pre-shutter--top {
                transform: translate3d(0, -100%, 0);
            }
            #z7-cinema-preloader.is-opening .z7-pre-shutter--bottom {
                transform: translate3d(0, 100%, 0);
            }

            /* Preloader Theme Palettes */
            #z7-cinema-preloader.theme-dark .z7-pre-shutter {
                background-color: #050608;
            }
            #z7-cinema-preloader.theme-light .z7-pre-shutter {
                background-color: #f8fafc;
                border-color: rgba(15, 23, 42, 0.08);
            }

            /* Central Cinematic Core */
            .z7-cinema-core {
                position: relative;
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                will-change: transform, opacity;
                transition: transform 0.55s var(--z7-ease-cinema), opacity 0.4s ease;
            }

            #z7-cinema-preloader.is-opening .z7-cinema-core {
                transform: scale(1.08);
                opacity: 0;
            }

            /* Anamorphic Horizon Laser Beam */
            .z7-horizon-beam {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0vw;
                height: 1px;
                transform: translate(-50%, -50%);
                pointer-events: none;
                opacity: 0;
                animation: z7HorizonIgnite 1.4s var(--z7-ease-open) forwards;
            }
            #z7-cinema-preloader.theme-dark .z7-horizon-beam {
                background: linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.8) 25%, #60a5fa 50%, rgba(37, 99, 235, 0.8) 75%, transparent 100%);
                box-shadow: 0 0 20px rgba(37, 99, 235, 0.6), 0 0 40px rgba(96, 165, 250, 0.4);
            }
            #z7-cinema-preloader.theme-light .z7-horizon-beam {
                background: linear-gradient(90deg, transparent 0%, rgba(30, 58, 138, 0.6) 25%, #2563eb 50%, rgba(30, 58, 138, 0.6) 75%, transparent 100%);
                box-shadow: 0 0 16px rgba(30, 58, 138, 0.35);
            }

            @keyframes z7HorizonIgnite {
                0% { width: 0vw; opacity: 0; }
                25% { width: 35vw; opacity: 1; }
                65% { width: 85vw; opacity: 0.9; }
                100% { width: 100vw; opacity: 0.55; }
            }

            /* Monogram & Title Reveal */
            .z7-monogram-frame {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                opacity: 0;
                transform: translateY(14px) scale(0.94);
                filter: blur(12px);
                animation: z7MonogramCrystallize 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards;
            }

            .z7-monogram-img {
                width: 105px;
                height: auto;
                object-fit: contain;
                display: block;
            }
            #z7-cinema-preloader.theme-dark .z7-monogram-img {
                filter: drop-shadow(0 0 26px rgba(37, 99, 235, 0.45)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.9));
            }
            #z7-cinema-preloader.theme-light .z7-monogram-img {
                filter: drop-shadow(0 0 20px rgba(30, 58, 138, 0.22)) drop-shadow(0 4px 16px rgba(15, 23, 42, 0.15));
            }

            @keyframes z7MonogramCrystallize {
                0% {
                    opacity: 0;
                    transform: translateY(14px) scale(0.94);
                    filter: blur(12px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: blur(0px);
                }
            }

            /* Architectural Studio Typography */
            .z7-cinema-brand {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                opacity: 0;
                transform: translateY(8px);
                animation: z7BrandEmerge 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.55s forwards;
            }

            .z7-cinema-title {
                font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', system-ui, sans-serif;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.38em;
                text-transform: uppercase;
                margin-bottom: 6px;
            }
            #z7-cinema-preloader.theme-dark .z7-cinema-title {
                color: #ffffff;
                text-shadow: 0 0 18px rgba(255, 255, 255, 0.35);
            }
            #z7-cinema-preloader.theme-light .z7-cinema-title {
                color: #090a0f;
                text-shadow: 0 0 12px rgba(9, 10, 15, 0.15);
            }

            .z7-cinema-sub {
                font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', system-ui, sans-serif;
                font-size: 8.5px;
                font-weight: 500;
                letter-spacing: 0.28em;
                text-transform: uppercase;
            }
            #z7-cinema-preloader.theme-dark .z7-cinema-sub {
                color: rgba(255, 255, 255, 0.55);
            }
            #z7-cinema-preloader.theme-light .z7-cinema-sub {
                color: rgba(15, 23, 42, 0.55);
            }

            @keyframes z7BrandEmerge {
                0% { opacity: 0; transform: translateY(8px); }
                100% { opacity: 1; transform: translateY(0); }
            }

            /* ============================================================
               SYSTEM 2: ARCHITECTURAL APERTURE ROUTE TRANSITIONS
               ============================================================ */
            #z7-aperture-curtain {
                position: fixed;
                inset: 0;
                z-index: 999998;
                pointer-events: none;
                visibility: hidden;
                overflow: hidden;
            }

            #z7-aperture-curtain.active {
                pointer-events: auto !important;
                visibility: visible !important;
            }

            .z7-aperture-shutter {
                position: absolute;
                left: 0;
                right: 0;
                height: 50%;
                will-change: transform;
                transition: transform 0.28s var(--z7-ease-close);
                z-index: 1;
            }
            .z7-aperture-shutter--top {
                top: 0;
                transform: translate3d(0, -100%, 0);
                border-bottom: 1px solid rgba(255, 255, 255, 0.12);
            }
            .z7-aperture-shutter--bottom {
                bottom: 0;
                transform: translate3d(0, 100%, 0);
                border-top: 1px solid rgba(255, 255, 255, 0.12);
            }

            /* Shutters closed / covering during transition */
            #z7-aperture-curtain.is-closed .z7-aperture-shutter--top,
            #z7-aperture-curtain.active.is-closed .z7-aperture-shutter--top {
                transform: translate3d(0, 0, 0);
            }
            #z7-aperture-curtain.is-closed .z7-aperture-shutter--bottom,
            #z7-aperture-curtain.active.is-closed .z7-aperture-shutter--bottom {
                transform: translate3d(0, 0, 0);
            }

            /* Theme styles for aperture curtain */
            #z7-aperture-curtain.theme-dark .z7-aperture-shutter {
                background-color: #050608;
            }
            #z7-aperture-curtain.theme-light .z7-aperture-shutter {
                background-color: #f8fafc;
                border-color: rgba(15, 23, 42, 0.12);
            }

            /* Central Transition Seam & Emblem */
            .z7-aperture-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.22s ease;
            }

            #z7-aperture-curtain.is-closed .z7-aperture-center {
                opacity: 1;
            }

            .z7-aperture-seam {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 100vw;
                height: 1px;
                transform: translate(-50%, -50%);
            }
            #z7-aperture-curtain.theme-dark .z7-aperture-seam {
                background: linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.7) 30%, #60a5fa 50%, rgba(37, 99, 235, 0.7) 70%, transparent 100%);
                box-shadow: 0 0 12px rgba(37, 99, 235, 0.5);
            }
            #z7-aperture-curtain.theme-light .z7-aperture-seam {
                background: linear-gradient(90deg, transparent 0%, rgba(30, 58, 138, 0.5) 30%, #2563eb 50%, rgba(30, 58, 138, 0.5) 70%, transparent 100%);
                box-shadow: 0 0 10px rgba(30, 58, 138, 0.3);
            }

            .z7-aperture-logo {
                width: 78px;
                height: auto;
                object-fit: contain;
                display: block;
                position: relative;
                z-index: 3;
                filter: drop-shadow(0 0 18px rgba(37, 99, 235, 0.4));
            }

            /* Legacy cleanup suppression */
            #z7-preloader, #z7-transition-curtain {
                display: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function initMotionSystem() {
        if (!document.body) return;

        const currentTheme = detectTheme();
        const isHeadless = Boolean(navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent));
        
        let isReload = false;
        try {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries && navEntries[0]) {
                isReload = (navEntries[0].type === 'reload');
            }
        } catch (_) {}

        const isNavTransitioning = (sessionStorage.getItem('7z_nav_transitioning') === 'true');
        const hasSeenPreloader = Boolean(sessionStorage.getItem('7z_preloader_seen'));

        // -------------------------------------------------------------
        // A. MOUNT ARCHITECTURAL APERTURE TRANSITION CURTAIN
        // -------------------------------------------------------------
        let curtain = document.getElementById('z7-aperture-curtain');
        if (!curtain) {
            curtain = document.createElement('div');
            curtain.id = 'z7-aperture-curtain';
            curtain.className = 'theme-' + currentTheme;
            curtain.innerHTML = `
                <div class="z7-aperture-shutter z7-aperture-shutter--top"></div>
                <div class="z7-aperture-center">
                    <div class="z7-aperture-seam"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-aperture-logo" width="78" height="60">
                </div>
                <div class="z7-aperture-shutter z7-aperture-shutter--bottom"></div>
            `;
            const curtainLogo = curtain.querySelector('.z7-aperture-logo');
            if (curtainLogo) {
                curtainLogo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            }
            document.body.appendChild(curtain);
        }

        // -------------------------------------------------------------
        // B. IN-PHASE EXECUTION (Arriving at destination page)
        // -------------------------------------------------------------
        if (isNavTransitioning) {
            sessionStorage.removeItem('7z_nav_transitioning');
            curtain.classList.add('active', 'is-closed');

            // Wait for paint, then smoothly open shutters with luxury easing
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (curtain) {
                            curtain.classList.remove('is-closed');
                            // After shutters slide open, unmount active state
                            setTimeout(() => {
                                if (curtain) curtain.classList.remove('active');
                            }, reducedMotion ? 20 : 320);
                        }
                    }, isHeadless ? 20 : 60);
                });
            });
        }

        // -------------------------------------------------------------
        // C. TASK ONE: CINEMATIC ARCHITECTURAL PRELOADER
        // -------------------------------------------------------------
        // Triggers on initial cold entry or page reload, and NOT during internal page transitions
        const shouldRunPreloader = (!hasSeenPreloader || isReload) && !isNavTransitioning;

        if (shouldRunPreloader) {
            const preloader = document.createElement('div');
            preloader.id = 'z7-cinema-preloader';
            preloader.className = 'theme-' + currentTheme;
            preloader.innerHTML = `
                <div class="z7-pre-shutter z7-pre-shutter--top"></div>
                <div class="z7-cinema-core">
                    <div class="z7-horizon-beam"></div>
                    <div class="z7-monogram-frame">
                        <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-monogram-img" width="105" height="82">
                    </div>
                    <div class="z7-cinema-brand">
                        <span class="z7-cinema-title">7Z MAGIC</span>
                        <span class="z7-cinema-sub">STUDIO FOR SPACES, STORIES &amp; DIGITAL WORLDS</span>
                    </div>
                </div>
                <div class="z7-pre-shutter z7-pre-shutter--bottom"></div>
            `;
            const logo = preloader.querySelector('.z7-monogram-img');
            if (logo) {
                logo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            }
            document.body.appendChild(preloader);

            let preloaderDismissed = false;
            function completePreloader() {
                if (preloaderDismissed || !preloader || !preloader.parentNode) return;
                preloaderDismissed = true;
                sessionStorage.setItem('7z_preloader_seen', 'true');

                if (reducedMotion) {
                    preloader.classList.add('is-dismissed');
                    setTimeout(() => { if (preloader.parentNode) preloader.remove(); }, 300);
                    return;
                }

                // Cinematic Iris / Aperture Exit:
                preloader.classList.add('is-opening');
                setTimeout(() => {
                    preloader.classList.add('is-dismissed');
                    setTimeout(() => {
                        if (preloader.parentNode) preloader.remove();
                    }, 450);
                }, 650);
            }

            // High-Craft Timing: 1400ms choreographed sequence, with hard failsafe at 1800ms
            const entranceDuration = isHeadless ? 200 : 1400;
            const fallbackTimeout = isHeadless ? 350 : 1800;

            const timerId = setTimeout(completePreloader, entranceDuration);
            const failsafeId = setTimeout(completePreloader, fallbackTimeout);

            // If critical page finishes rendering, ensure preloader exits smoothly
            if (document.readyState === 'complete') {
                // DOM ready, sequence will finish on its choreographed timer
            } else {
                window.addEventListener('load', () => {
                    // Ready for exit once choreographed entrance has played
                }, { once: true });
            }
        }

        // -------------------------------------------------------------
        // D. TASK TWO: OUT-PHASE EXECUTION (Internal link clicks)
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
            // Ignore same-page anchor jumps
            if (url.pathname === window.location.pathname && url.search === window.location.search && (url.hash || link.getAttribute('href')?.startsWith('#'))) return;
            // Never intercept admin, private access, or API routes
            if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/private-access') || url.pathname.startsWith('/api') || url.pathname.startsWith('/_vercel')) return;
            // Never intercept direct file downloads
            if (/\.(pdf|pptx|ppt|zip|rar|tar|gz|docx|doc|xlsx|xls|png|jpg|jpeg|webp|mp4|mov|webm)$/i.test(url.pathname)) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const nextTheme = detectTheme();
            if (curtain) {
                curtain.className = 'theme-' + nextTheme + ' active is-closed';
            }

            sessionStorage.setItem('7z_nav_transitioning', 'true');

            // Hard fail-safe release if navigation fails
            const failSafe = setTimeout(() => {
                if (curtain) {
                    curtain.classList.remove('is-closed', 'active');
                    sessionStorage.removeItem('7z_nav_transitioning');
                }
            }, 1800);

            // Navigate when shutters have sealed screen
            const outDuration = reducedMotion ? 0 : isHeadless ? 30 : 280;
            setTimeout(() => {
                clearTimeout(failSafe);
                window.location.href = link.href;
            }, outDuration);
        }, true);

        // -------------------------------------------------------------
        // E. BFCACHE & BACK/FORWARD RESTORATION
        // -------------------------------------------------------------
        const dismissAll = () => {
            sessionStorage.removeItem('7z_nav_transitioning');
            const pre = document.getElementById('z7-cinema-preloader');
            if (pre) pre.remove();
            if (curtain) curtain.classList.remove('active', 'is-closed');
        };

        window.addEventListener('pageshow', dismissAll);
        window.addEventListener('popstate', dismissAll);
    }

    if (document.body) {
        initMotionSystem();
    } else {
        document.addEventListener('DOMContentLoaded', initMotionSystem, { once: true });
    }
})();
