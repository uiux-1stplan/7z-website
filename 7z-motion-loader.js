// 7Z Motion Loader - Adaptive Cinematic Preloader & Transitions
// 7Z Magic Studios (Dark #06070d & Light #f8fafc Adaptive System)
// Calm Luxury Edition: 2.0s Logo Reveal, 2.5s Steady Progress, 0.9s Exit, 750ms Balanced Transitions
(function() {
    // 1. فحص وضع الثيم التكيفي (Dark / Light)
    function detectTheme() {
        try {
            const stored = localStorage.getItem("z7-theme") || 
                           localStorage.getItem("7z-course-theme") || 
                           localStorage.getItem("theme");
            if (stored === "light") return "light";
            if (stored === "dark") return "dark";
        } catch(e) {}

        const docEl = document.documentElement;
        const body = document.body;
        const attr = docEl.getAttribute("data-theme") || (body && body.getAttribute("data-theme"));
        if (attr === "light") return "light";
        if (attr === "dark") return "dark";

        if (docEl.classList.contains("light") || (body && body.classList.contains("light"))) return "light";
        if (docEl.classList.contains("dark") || (body && body.classList.contains("dark"))) return "dark";

        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
        return "dark";
    }

    // 2. حقن ستايلات الـ CSS المتكيفة مع التوقيت السينمائي الهادئ
    const style = document.createElement('style');
    style.id = 'z7-motion-loader-styles';
    style.innerHTML = `
        :root {
            --z7-ease-cinema: cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* -------------------------------------------------------------
           البريلودر السينمائي الفخم (Atmospheric Ambient Blur Glow Preloader)
        ------------------------------------------------------------- */
        #z7-preloader {
            position: fixed; inset: 0; z-index: 999999;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            overflow: hidden;
            transition: opacity 0.9s ease, filter 0.9s ease, transform 0.9s var(--z7-ease-cinema);
            will-change: opacity, filter, transform;
        }

        /* الوضع الليلي للبريلودر */
        #z7-preloader.theme-dark {
            background-color: #06070d;
        }
        #z7-preloader.theme-dark .z7-ambient-glow {
            background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(30, 58, 138, 0.26) 45%, transparent 72%);
        }
        #z7-preloader.theme-dark .z7-logo-img {
            filter: drop-shadow(0 0 28px rgba(37, 99, 235, 0.35)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.85));
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

        /* الوضع النهاري للبريلودر */
        #z7-preloader.theme-light {
            background-color: #f8fafc;
        }
        #z7-preloader.theme-light .z7-ambient-glow {
            background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(30, 58, 138, 0.10) 45%, transparent 72%);
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

        /* عناصر البريلودر الداخلية */
        .z7-preloader-center {
            position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .z7-ambient-glow {
            position: absolute; top: 50%; left: 50%;
            width: 380px; height: 280px;
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

        /* تجلي الشعار السينمائي الفاخر خلال 2.0s بنعومة تامة */
        .z7-logo-img {
            position: relative; z-index: 2;
            width: 110px; height: auto; object-fit: contain; margin-bottom: 24px;
            animation: z7CinemaLogoReveal 2.0s var(--z7-ease-cinema) forwards;
        }
        @keyframes z7CinemaLogoReveal {
            0% {
                opacity: 0;
                filter: blur(22px);
                transform: scale(0.92);
            }
            100% {
                opacity: 1;
                filter: blur(0px);
                transform: scale(1);
            }
        }

        .z7-track {
            position: relative; z-index: 2;
            width: 150px; height: 2px; border-radius: 4px;
            overflow: hidden;
        }
        .z7-bar {
            position: absolute; top: 0; left: 0; height: 100%; width: 0%;
            border-radius: 4px;
            transition: width 0.05s linear;
        }
        .z7-counter {
            position: relative; z-index: 2;
            margin-top: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            letter-spacing: 0.22em;
        }

        /* -------------------------------------------------------------
           طبقة الانتقالات المتوازنة والمهدأة (750ms Fade + 150ms Hold)
        ------------------------------------------------------------- */
        #z7-transition-curtain {
            position: fixed; inset: 0; z-index: 999998;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            transition: opacity 750ms ease-in-out, visibility 750ms;
            will-change: opacity, backdrop-filter;
        }

        #z7-transition-curtain.active {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }

        /* وضع الثيم للانتقال */
        #z7-transition-curtain.theme-dark {
            background-color: rgba(6, 7, 13, 0.82);
        }
        #z7-transition-curtain.theme-dark .z7-trans-glow {
            background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(30, 58, 138, 0.20) 50%, transparent 72%);
        }
        #z7-transition-curtain.theme-dark .z7-trans-logo {
            filter: drop-shadow(0 0 24px rgba(37, 99, 235, 0.45));
        }

        #z7-transition-curtain.theme-light {
            background-color: rgba(248, 250, 252, 0.82);
        }
        #z7-transition-curtain.theme-light .z7-trans-glow {
            background: radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(30, 58, 138, 0.10) 50%, transparent 72%);
        }
        #z7-transition-curtain.theme-light .z7-trans-logo {
            filter: drop-shadow(0 0 18px rgba(30, 58, 138, 0.25));
        }

        .z7-trans-center {
            position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .z7-trans-glow {
            position: absolute; top: 50%; left: 50%;
            width: 220px; height: 160px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            filter: blur(35px);
            pointer-events: none;
        }
        .z7-trans-logo {
            position: relative; z-index: 2;
            width: 85px; height: auto; object-fit: contain;
            opacity: 0.95;
            animation: z7TransLogoClarify 750ms ease-in-out forwards;
        }
        @keyframes z7TransLogoClarify {
            0% {
                opacity: 0.4;
                filter: blur(8px);
                transform: scale(0.96);
            }
            100% {
                opacity: 1;
                filter: blur(0px);
                transform: scale(1);
            }
        }

        /* حجب أي عناصر قديمة لضمان عدم التداخل */
        .z7-loader, #z7Loader, .z7-transition, #z7Transition, 
        .z7-route-transition, #z7RouteTransition, [data-z7-arriving] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    function initMotionLoader() {
        if (!document.body) return;

        // إزالة بقايا قديمة فوراً إن وجدت
        const oldL = document.getElementById('z7Loader');
        if (oldL) oldL.remove();
        const oldT = document.getElementById('z7Transition');
        if (oldT) oldT.remove();
        const oldG = document.getElementById('golden-preloader');
        if (oldG) oldG.remove();
        const oldC = document.getElementById('golden-curtain');
        if (oldC) oldC.remove();

        const currentTheme = detectTheme();

        // 3. بناء البريلودر السينمائي الفخم (يعمل مرة واحدة لكل جلسة sessionStorage)
        if (!sessionStorage.getItem('7z_motion_visited')) {
            const preloader = document.createElement('div');
            preloader.id = 'z7-preloader';
            preloader.className = 'theme-' + currentTheme;
            preloader.innerHTML = `
                <div class="z7-preloader-center">
                    <div class="z7-ambient-glow"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-logo-img" onerror="this.onerror=null;this.src='/7Z-LogoT(3).png';">
                    <div class="z7-track">
                        <div class="z7-bar" id="z7-progress-bar"></div>
                    </div>
                    <div class="z7-counter" id="z7-counter-text">0%</div>
                </div>
            `;
            document.body.appendChild(preloader);

            // تقدم العداد بسلاسة تامة وهدوء فخم يستغرق حوالي 2.5 ثانية
            const startTime = performance.now();
            const duration = 2500; // 2.5 ثانية بالضبط

            function updateProgress(currentTime) {
                const elapsed = currentTime - startTime;
                const progressRatio = Math.min(1, elapsed / duration);

                // منحنى حركة انسيابي ناعم ومريح (easeOutQuad)
                const eased = 1 - Math.pow(1 - progressRatio, 2);
                const percent = Math.min(100, Math.floor(eased * 100));

                const bar = document.getElementById('z7-progress-bar');
                const text = document.getElementById('z7-counter-text');
                if (bar) bar.style.width = percent + '%';
                if (text) text.textContent = percent + '%';

                if (progressRatio < 1) {
                    requestAnimationFrame(updateProgress);
                } else {
                    // وصول العداد إلى 100%
                    if (bar) bar.style.width = '100%';
                    if (text) text.textContent = '100%';

                    // خروج ضبابي فائق النعومة يستغرق 0.9s
                    setTimeout(() => {
                        preloader.style.filter = 'blur(16px)';
                        preloader.style.opacity = '0';
                        preloader.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            preloader.remove();
                            sessionStorage.setItem('7z_motion_visited', 'true');
                        }, 900); // 0.9 ثانية
                    }, 140);
                }
            }

            requestAnimationFrame(updateProgress);
        }

        // 4. بناء طبقة الانتقال بين الصفحات (750ms Fade متوازن)
        let overlay = document.getElementById('z7-transition-curtain');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'z7-transition-curtain';
            overlay.className = 'theme-' + currentTheme;
            overlay.innerHTML = `
                <div class="z7-trans-center">
                    <div class="z7-trans-glow"></div>
                    <img src="/assets/brand/7Z-LogoT(3).png" alt="7Z Magic" class="z7-trans-logo" onerror="this.onerror=null;this.src='/7Z-LogoT(3).png';">
                </div>
            `;
            document.body.appendChild(overlay);
        }

        // إذا كانت الصفحة ناتجة عن انتقال حديث، أكمل الخروج (Fade out خلال 750ms)
        if (sessionStorage.getItem('7z_nav_transitioning') === 'true') {
            sessionStorage.removeItem('7z_nav_transitioning');
            overlay.className = 'theme-' + currentTheme + ' active';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.remove('active');
                });
            });
        }

        // تحديث الثيم ديناميكياً على البريلودر وطبقة الانتقال عند تبديل المستخدم للثيم
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

        // 5. ربط الانتقالات الموزونة الهادئة بالروابط الداخلية (750ms Fade in + 150ms Hold)
        window.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link || !link.href) return;
            if (link.origin !== window.location.origin) return;
            if (link.getAttribute('target') && link.getAttribute('target') !== '_self') return;
            if (link.hasAttribute('download')) return;

            const url = new URL(link.href, window.location.href);
            // تجاهل روابط نفس الصفحة أو التمرير للهاش الداخلي
            if (url.pathname === window.location.pathname && url.search === window.location.search && (url.hash || link.getAttribute('href')?.startsWith('#'))) return;
            // حماية واستثناء لوحة تحكم الآدمن المقفلة
            if (url.pathname.startsWith('/admin')) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            updateThemesOnFly();
            sessionStorage.setItem('7z_nav_transitioning', 'true');
            overlay.classList.add('active');

            // مهلة 750ms للدخول + 150ms ثبات سينمائي للشعار = 900ms قبل التوجيه
            setTimeout(() => {
                window.location.href = link.href;
            }, 900);
        }, true);

        window.addEventListener('pageshow', () => {
            if (overlay) overlay.classList.remove('active');
        });
    }

    if (document.body) {
        initMotionLoader();
    } else {
        document.addEventListener('DOMContentLoaded', initMotionLoader, { once: true });
    }
})();
