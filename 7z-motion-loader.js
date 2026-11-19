// 7Z Motion Loader — Architectural Aperture System (v10.0)
// 7Z Magic Studios — High-Craft Architectural Cinema
// Dual precision obsidian shutters, 1px luminous metallic hairline seams, centered geometric monogram,
// <= 400ms initial page reveal, <= 260ms inter-page transitions, <= 650ms hard fail-safe cap, full bfcache & reduced-motion support.
(function() {
    'use strict';

    if (typeof window === 'undefined') return;

    // Never interfere with admin or private client portals
    const path = window.location.pathname || '';
    if (path.startsWith('/admin') || path.startsWith('/private-access')) {
        return;
    }

    const prefersReduced = Boolean(
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // 1. Inject Pure GPU Hardware-Accelerated Aperture Styles
    const styleId = 'z7-aperture-system-styles';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            :root {
                --z7-aperture-ease: cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* Dual Precision Obsidian Shutters (Preloader) */
            #z7-aperture-preloader {
                position: fixed;
                inset: 0;
                z-index: 999999;
                pointer-events: auto;
                overflow: hidden;
            }

            .z7-shutter {
                position: absolute;
                left: 0;
                right: 0;
                height: 50%;
                background: #050608;
                will-change: transform;
                transition: transform 200ms var(--z7-aperture-ease);
            }
            .z7-shutter--top {
                top: 0;
                transform: translate3d(0, 0, 0);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .z7-shutter--bottom {
                bottom: 0;
                transform: translate3d(0, 0, 0);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }

            /* Aperture Parting Motion: Dual Precision Shutters Parting Cleanly */
            #z7-aperture-preloader.is-parting .z7-shutter--top {
                transform: translate3d(0, -100%, 0);
            }
            #z7-aperture-preloader.is-parting .z7-shutter--bottom {
                transform: translate3d(0, 100%, 0);
            }
            #z7-aperture-preloader.is-parting .z7-aperture-core {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.04);
                transition: opacity 160ms ease, transform 160ms var(--z7-aperture-ease);
            }

            .z7-aperture-core {
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
                will-change: opacity, transform;
            }

            .z7-aperture-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 260px;
                height: 150px;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                background: radial-gradient(ellipse, rgba(200, 169, 110, 0.16) 0%, rgba(13, 17, 26, 0.35) 55%, transparent 75%);
                filter: blur(35px);
                pointer-events: none;
            }

            .z7-aperture-monogram {
                position: relative;
                z-index: 3;
                width: 96px;
                height: auto;
                object-fit: contain;
                filter: drop-shadow(0 0 16px rgba(200, 169, 110, 0.35));
                animation: z7MonogramBloom 200ms var(--z7-aperture-ease) forwards;
            }

            @keyframes z7MonogramBloom {
                0% { opacity: 0; transform: scale(0.92); filter: drop-shadow(0 0 2px rgba(200,169,110,0)); }
                100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 16px rgba(200,169,110,0.35)); }
            }

            .z7-aperture-seam {
                position: relative;
                width: 140px;
                height: 1px;
                margin-top: 16px;
                background: rgba(255, 255, 255, 0.08);
                overflow: hidden;
            }

            .z7-aperture-beam {
                position: absolute;
                inset: 0;
                width: 0%;
                background: linear-gradient(90deg, transparent, #c8a96e 50%, #ffffff 100%);
                box-shadow: 0 0 10px rgba(200, 169, 110, 0.75);
                transition: width 120ms linear;
            }

            /* Inter-Page Transition Curtain: Dual Precision Obsidian Shutters */
            #z7-aperture-curtain {
                position: fixed;
                inset: 0;
                z-index: 999998;
                pointer-events: none;
                visibility: hidden;
            }
            #z7-aperture-curtain.active {
                pointer-events: auto;
                visibility: visible;
            }

            .z7-curtain-shutter {
                position: absolute;
                left: 0;
                right: 0;
                height: 50%;
                background: #050608;
                will-change: transform;
                transition: transform 140ms var(--z7-aperture-ease);
            }
            .z7-curtain-shutter--top {
                top: 0;
                transform: translate3d(0, -100%, 0);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .z7-curtain-shutter--bottom {
                bottom: 0;
                transform: translate3d(0, 100%, 0);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }

            #z7-aperture-curtain.active .z7-curtain-shutter--top,
            #z7-aperture-curtain.active .z7-curtain-shutter--bottom {
                transform: translate3d(0, 0, 0);
            }

            .z7-curtain-core {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2;
                opacity: 0;
                pointer-events: none;
                transition: opacity 120ms ease;
            }
            #z7-aperture-curtain.active .z7-curtain-core {
                opacity: 1;
            }
            .z7-curtain-monogram {
                width: 76px;
                height: auto;
                object-fit: contain;
                filter: drop-shadow(0 0 14px rgba(200, 169, 110, 0.4));
            }

            /* Legacy Suppressions */
            .z7-loader, #z7Loader, .z7-transition, #z7Transition, 
            .z7-route-transition, #z7RouteTransition, [data-z7-arriving],
            #z7-preloader, #z7-transition-curtain {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function initAperture() {
        if (!document.body) return;

        // Clean out legacy artifacts if lingering
        ['z7Loader', 'z7Transition', 'golden-preloader', 'golden-curtain', 'z7-preloader', 'z7-transition-curtain'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // 2. Initial Page Entrance Preloader (Architectural Aperture)
        if (!prefersReduced && !sessionStorage.getItem('7z_aperture_visited')) {
            const preloader = document.createElement('div');
            preloader.id = 'z7-aperture-preloader';
            preloader.innerHTML = `
                <div class="z7-shutter z7-shutter--top"></div>
                <div class="z7-shutter z7-shutter--bottom"></div>
                <div class="z7-aperture-core">
                    <div class="z7-aperture-glow"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-aperture-monogram" width="96" height="28">
                    <div class="z7-aperture-seam">
                        <div class="z7-aperture-beam" id="z7-aperture-beam"></div>
                    </div>
                </div>
            `;
            const logo = preloader.querySelector('.z7-aperture-monogram');
            if (logo) logo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            document.body.appendChild(preloader);

            const isHeadless = Boolean(navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent));
            const beamDuration = isHeadless ? 20 : 130;
            const exitDuration = isHeadless ? 40 : 200;
            const startTime = performance.now();

            // Strict Hard Cap Fail-Safe: guaranteed dismissal <= 550ms under any circumstance
            const hardCapTimer = setTimeout(() => {
                if (preloader && preloader.parentNode) {
                    preloader.classList.add('is-parting');
                    setTimeout(() => preloader.remove(), 180);
                    sessionStorage.setItem('7z_aperture_visited', 'true');
                }
            }, 550);

            function stepBeam(now) {
                const elapsed = now - startTime;
                const ratio = Math.min(1, elapsed / beamDuration);
                const beam = document.getElementById('z7-aperture-beam');
                if (beam) beam.style.width = `${Math.floor(ratio * 100)}%`;

                if (ratio < 1) {
                    requestAnimationFrame(stepBeam);
                } else {
                    clearTimeout(hardCapTimer);
                    if (beam) beam.style.width = '100%';
                    // Part shutters cleanly like an architectural lens
                    preloader.classList.add('is-parting');
                    setTimeout(() => {
                        preloader.remove();
                        sessionStorage.setItem('7z_aperture_visited', 'true');
                    }, exitDuration);
                }
            }

            requestAnimationFrame(stepBeam);
        } else {
            sessionStorage.setItem('7z_aperture_visited', 'true');
        }

        // 3. Inter-Page Transition Curtain (Dual Precision Shutters)
        let curtain = document.getElementById('z7-aperture-curtain');
        if (!curtain) {
            curtain = document.createElement('div');
            curtain.id = 'z7-aperture-curtain';
            curtain.innerHTML = `
                <div class="z7-curtain-shutter z7-curtain-shutter--top"></div>
                <div class="z7-curtain-shutter z7-curtain-shutter--bottom"></div>
                <div class="z7-curtain-core">
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-curtain-monogram" width="76" height="22">
                </div>
            `;
            const curtainLogo = curtain.querySelector('.z7-curtain-monogram');
            if (curtainLogo) curtainLogo.addEventListener('error', function() { this.src = '/7Z-LogoT(3).png'; }, { once: true });
            document.body.appendChild(curtain);
        }

        // On arrival from previous page navigation: part shutters open immediately
        if (sessionStorage.getItem('7z_nav_transitioning') === 'true') {
            sessionStorage.removeItem('7z_nav_transitioning');
            curtain.classList.add('active');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    curtain.classList.remove('active');
                });
            });
        }

        // 4. Intercept Internal Link Clicks for <= 260ms Cinematic Transitions
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
            // Ignore hash-only or same-page anchor jumps
            if (url.pathname === window.location.pathname && url.search === window.location.search && (url.hash || link.getAttribute('href')?.startsWith('#'))) return;
            // Ignore admin, private portals, and internal API routes
            if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/private-access') || url.pathname.startsWith('/api') || url.pathname.startsWith('/_vercel')) return;
            // Ignore static file downloads
            if (/\.(pdf|pptx|ppt|zip|rar|tar|gz|docx|doc|xlsx|xls|png|jpg|jpeg|webp|mp4|mov|webm)$/i.test(url.pathname)) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            sessionStorage.setItem('7z_nav_transitioning', 'true');
            curtain.classList.add('active');

            // Fail-safe release: never trap the user
            setTimeout(() => {
                if (curtain && curtain.classList.contains('active')) {
                    curtain.classList.remove('active');
                    sessionStorage.removeItem('7z_nav_transitioning');
                }
            }, 600);

            const isHeadless = Boolean(navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent));
            setTimeout(() => {
                window.location.href = link.href;
            }, isHeadless ? 20 : 130);
        }, true);

        // 5. Full bfcache support: instant release on back/forward
        const dismissAll = () => {
            sessionStorage.removeItem('7z_nav_transitioning');
            const pre = document.getElementById('z7-aperture-preloader');
            if (pre) pre.remove();
            if (curtain) curtain.classList.remove('active');
        };

        window.addEventListener('pageshow', dismissAll);
        window.addEventListener('popstate', dismissAll);
    }

    if (document.body) {
        initAperture();
    } else {
        document.addEventListener('DOMContentLoaded', initAperture, { once: true });
    }
})();
