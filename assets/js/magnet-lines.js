/**
 * 7Z Magic — Selective Magnet Lines Interactive Field (v10.2.4)
 * High-Craft Cinema Engineering
 * 
 * Strict Section-Local Alternating Placement:
 * - NEVER in Hero, header, footer, or fixed viewport overlay
 * - Exclusively in alternating content sections below the Hero (1st ON, 2nd OFF, 3rd ON, etc.)
 * - Strict section containment (clipped within section bounds, sitting behind content)
 * - Parameters: Gap 34px, Reach 180px, Line Length 9px, Easing 0.13, DPR capped at 2
 * - Dark: #FFFFFF | Light: #0F172A | Battery-efficient sleeping loops
 * - Preserves native cursor, disabled on touch/coarse pointers, respects reduced motion
 */
(() => {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Never interfere with admin or private access backend views
    const path = window.location.pathname || '';
    if (path.startsWith('/admin') || path.startsWith('/private-access') || path.startsWith('/api')) {
        return;
    }

    // 1. Accessibility & Hardware Constraints
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!finePointerQuery.matches) {
        // Disabled on touch/coarse devices
        return;
    }

    // 2. Constants & Configuration
    const GAP = 34;
    const REACH = 180;
    const REACH_HOVER = 230;
    const LINE_LEN = 9;
    const HALF_LEN = 4.5;
    const FIELD_EASE = 0.13;
    const LINE_WIDTH = 1.35;

    // 3. Theme Detection
    function isLightTheme() {
        const docEl = document.documentElement;
        const body = document.body;
        const attr = docEl.getAttribute('data-theme') || (body && body.getAttribute('data-theme'));
        if (attr === 'light') return true;
        if (attr === 'dark') return false;

        if (docEl.classList.contains('light') || (body && body.classList.contains('light'))) return true;
        try {
            const saved = localStorage.getItem('z7-theme') || localStorage.getItem('7z-course-theme') || localStorage.getItem('theme');
            if (saved === 'light') return true;
        } catch (_) {}

        return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    }

    let lightMode = isLightTheme();

    // 4. Inject Section Layer Styles
    const styleId = 'z7-magnet-section-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .z7-magnet-section-layer {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
                pointer-events: none !important;
                z-index: 0 !important;
            }
            .z7-magnet-canvas {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                display: block !important;
                background: transparent !important;
            }
            /* Ensure section content sits safely above the canvas without shifting layout */
            .z7-magnet-contained {
                position: relative !important;
            }
            .z7-magnet-contained > *:not(.z7-magnet-section-layer) {
                position: relative;
                z-index: 1;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // 5. Global Pointer State
    let clientX = -9999;
    let clientY = -9999;
    let isHoveringInteractive = false;

    window.addEventListener('pointermove', (e) => {
        clientX = e.clientX;
        clientY = e.clientY;
        instances.forEach(inst => inst.wake());
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
        const interactive = e.target.closest && e.target.closest('a, button, input, textarea, select, [role="button"], .magnetic');
        const nextHover = Boolean(interactive);
        if (nextHover !== isHoveringInteractive) {
            isHoveringInteractive = nextHover;
            instances.forEach(inst => inst.wake());
        }
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
        const interactive = e.relatedTarget?.closest?.('a, button, input, textarea, select, [role="button"], .magnetic');
        if (!interactive && isHoveringInteractive) {
            isHoveringInteractive = false;
            instances.forEach(inst => inst.wake());
        }
    }, { passive: true });

    // 6. Section Magnet Instance Class
    class SectionMagnetInstance {
        constructor(section) {
            this.section = section;
            this.section.classList.add('z7-magnet-contained');

            // Layer & Canvas setup
            this.layer = document.createElement('div');
            this.layer.className = 'z7-magnet-section-layer';
            this.layer.setAttribute('aria-hidden', 'true');

            this.canvas = document.createElement('canvas');
            this.canvas.className = 'z7-magnet-canvas';
            this.layer.appendChild(this.canvas);

            this.section.prepend(this.layer);
            this.ctx = this.canvas.getContext('2d', { alpha: true });

            this.width = 0;
            this.height = 0;
            this.dpr = 1;
            this.isVisible = false;
            this.isRunning = false;
            this.rafId = 0;

            this.easedX = 0;
            this.easedY = 0;
            this.targetX = 0;
            this.targetY = 0;
            this.isStationary = false;

            // Resize handling
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(this.section);

            // Intersection handling (only active when in viewport)
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.isVisible = entry.isIntersecting;
                    if (this.isVisible) {
                        this.wake();
                    } else {
                        this.sleep();
                    }
                });
            }, { rootMargin: '100px' });
            this.intersectionObserver.observe(this.section);

            this.resize();
        }

        resize() {
            const rect = this.section.getBoundingClientRect();
            this.width = Math.round(rect.width);
            this.height = Math.round(rect.height);
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            if (this.width <= 0 || this.height <= 0) return;

            this.canvas.width = Math.round(this.width * this.dpr);
            this.canvas.height = Math.round(this.height * this.dpr);
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';

            if (this.ctx) {
                this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            }

            this.wake();
        }

        render() {
            if (!this.isRunning || !this.isVisible || !this.ctx) return;

            const rect = this.section.getBoundingClientRect();
            // Local pointer coordinates inside section
            const localX = clientX - rect.left;
            const localY = clientY - rect.top;

            // Is pointer anywhere near this section?
            const isPointerNear = (
                localX >= -REACH_HOVER &&
                localX <= this.width + REACH_HOVER &&
                localY >= -REACH_HOVER &&
                localY <= this.height + REACH_HOVER
            );

            this.targetX = isPointerNear ? localX : this.width * 0.5;
            this.targetY = isPointerNear ? localY : this.height * 0.5;

            // Ease pointer towards target
            const dx = this.targetX - this.easedX;
            const dy = this.targetY - this.easedY;
            const moveDist = Math.hypot(dx, dy);

            if (moveDist < 0.05) {
                this.easedX = this.targetX;
                this.easedY = this.targetY;
                this.isStationary = true;
            } else {
                this.easedX += dx * FIELD_EASE;
                this.easedY += dy * FIELD_EASE;
                this.isStationary = false;
            }

            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.lineWidth = LINE_WIDTH;
            ctx.lineCap = 'round';

            const effectiveReach = isHoveringInteractive ? REACH_HOVER : REACH;
            const baseAlpha = lightMode ? 0.07 : 0.08;
            const maxAlpha = lightMode ? (isHoveringInteractive ? 0.65 : 0.55) : (isHoveringInteractive ? 0.78 : 0.68);
            const rgbPrefix = lightMode ? '15, 23, 42, ' : '255, 255, 255, ';

            const isStaticMode = reducedMotionQuery.matches;

            // Grid calculation centered inside the section
            const startX = (this.width % GAP) * 0.5 + (GAP * 0.5);
            const startY = (this.height % GAP) * 0.5 + (GAP * 0.5);

            for (let y = startY; y < this.height; y += GAP) {
                for (let x = startX; x < this.width; x += GAP) {
                    const diffX = this.easedX - x;
                    const diffY = this.easedY - y;
                    const dist = Math.hypot(diffX, diffY);

                    let angle = 0;
                    let alpha = baseAlpha;

                    if (!isStaticMode && isPointerNear) {
                        angle = Math.atan2(diffY, diffX);
                        if (dist < effectiveReach) {
                            const proximity = 1 - (dist / effectiveReach);
                            const curve = proximity * proximity * (3 - 2 * proximity);
                            alpha = baseAlpha + (maxAlpha - baseAlpha) * curve;
                        }
                    }

                    const cos = isStaticMode || !isPointerNear ? 1 : Math.cos(angle);
                    const sin = isStaticMode || !isPointerNear ? 0 : Math.sin(angle);

                    const x1 = x - HALF_LEN * cos;
                    const y1 = y - HALF_LEN * sin;
                    const x2 = x + HALF_LEN * cos;
                    const y2 = y + HALF_LEN * sin;

                    ctx.strokeStyle = `rgba(${rgbPrefix}${alpha.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }

            if (this.isStationary && (!isPointerNear || isStaticMode)) {
                this.sleep();
            } else {
                this.rafId = requestAnimationFrame(() => this.render());
            }
        }

        wake() {
            if (!this.isRunning && this.isVisible && !document.hidden) {
                this.isRunning = true;
                this.rafId = requestAnimationFrame(() => this.render());
            }
        }

        sleep() {
            this.isRunning = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = 0;
            }
        }

        destroy() {
            this.sleep();
            this.resizeObserver.disconnect();
            this.intersectionObserver.disconnect();
            if (this.layer.parentNode) {
                this.layer.parentNode.removeChild(this.layer);
            }
        }
    }

    const instances = [];

    // 7. Mount Alternating Instances Below Hero
    function initSelectiveMagnetLines() {
        const main = document.querySelector('main');
        if (!main) return;

        // Clean up any stale instances
        instances.forEach(inst => inst.destroy());
        instances.length = 0;

        // Collect top-level content sections in main
        const allSections = Array.from(main.querySelectorAll('section, article, .ws-project, .acad-section, .acad-grid'))
            .filter(el => {
                // Keep only top-level sections relative to main (not deeply nested inside other sections)
                let parent = el.parentElement;
                while (parent && parent !== main) {
                    if (parent.tagName === 'SECTION' || parent.tagName === 'ARTICLE') return false;
                    parent = parent.parentElement;
                }
                return true;
            });

        if (allSections.length === 0) return;

        // Identify Hero (Hero is NEVER enabled)
        let heroIndex = allSections.findIndex(s => {
            const cls = (s.className || '').toString();
            const id = (s.id || '').toString();
            return cls.includes('hero') || id.includes('hero') || cls.includes('intro') || id.includes('intro');
        });
        if (heroIndex === -1) heroIndex = 0;

        // Post-hero sections: alternate 1st ON, 2nd OFF, 3rd ON, etc.
        const postHeroSections = allSections.slice(heroIndex + 1);

        postHeroSections.forEach((section, index) => {
            const isEnabled = (index % 2 === 0); // 0 -> 1st (ON), 1 -> 2nd (OFF), 2 -> 3rd (ON)...
            if (isEnabled) {
                const inst = new SectionMagnetInstance(section);
                instances.push(inst);
            }
        });
    }

    // 8. Reactive Theme & Lifecycle Observers
    const themeObserver = new MutationObserver(() => {
        const nextLight = isLightTheme();
        if (nextLight !== lightMode) {
            lightMode = nextLight;
            instances.forEach(inst => inst.wake());
        }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    if (document.body) {
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            instances.forEach(inst => inst.sleep());
        } else {
            instances.forEach(inst => inst.wake());
        }
    });

    if (finePointerQuery.addEventListener) {
        finePointerQuery.addEventListener('change', (e) => {
            if (!e.matches) {
                instances.forEach(inst => inst.destroy());
                instances.length = 0;
            } else {
                initSelectiveMagnetLines();
            }
        });
    }

    // Mount on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelectiveMagnetLines, { once: true });
    } else {
        initSelectiveMagnetLines();
    }

    // Global controller for automated verification
    window.__7zMagnetLines = {
        getInstances: () => instances,
        reinit: initSelectiveMagnetLines
    };
})();
