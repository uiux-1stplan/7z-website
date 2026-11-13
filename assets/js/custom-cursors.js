/**
 * 7Z MAGIC — Cinematic Motion: "Dot & Ring" Cursor + "Dot Grid Warp" Background
 * Single unified rAF loop, Vanilla JS, Zero external dependencies.
 *
 * Parameters:
 * Cursor: Follow 0.25, Ring 18px, Dot 4px, Hover scale 1.5x.
 * Grid: Gap 26px, Reach 150px, Push 26px, Dot size 1px.
 * Dark Mode: rgba(255,255,255,0.16) | Light Mode: rgba(15,23,42,0.12)
 * Strictly preserves native system cursor.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  const isEligibleDevice = () => {
    const hasFinePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return hasFinePointer && !reducedMotion;
  };

  class CinematicMotionLayer {
    constructor() {
      this.ring = null;
      this.dot = null;
      this.canvas = null;
      this.ctx = null;
      this.backdrop = null;

      // Pointer state
      this.x = window.innerWidth / 2;
      this.y = window.innerHeight / 2;
      this.rx = this.x;
      this.ry = this.y;
      this.scale = 1.0;
      this.overInteractive = false;
      this.pointerActive = false;

      // Grid config
      this.gap = 26;
      this.reach = 150;
      this.reachSq = this.reach * this.reach;
      this.push = 26;
      this.baseDotRadius = 0.6; // 1.2px diameter (sharp dot)

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.rafId = null;
      this.boundStep = this.step.bind(this);
      this.boundOnPointerMove = this.onPointerMove.bind(this);
      this.boundOnPointerLeave = this.onPointerLeave.bind(this);
      this.boundOnResize = this.onResize.bind(this);

      this.init();
    }

    init() {
      if (!isEligibleDevice()) return;

      this.createCanvas();
      this.createCursorElements();
      this.bindListeners();

      this.rafId = requestAnimationFrame(this.boundStep);
    }

    createCanvas() {
      // Backdrop radial wash
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'z7-warp-backdrop';
      this.backdrop.setAttribute('aria-hidden', 'true');
      document.body.prepend(this.backdrop);

      // Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'z7-canvas-warp';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      document.body.prepend(this.canvas);

      this.updateCanvasDimensions();
    }

    createCursorElements() {
      // Ring appended first
      this.ring = document.createElement('div');
      this.ring.className = 'z7-cursor-ring';
      this.ring.setAttribute('aria-hidden', 'true');

      // Dot appended second
      this.dot = document.createElement('div');
      this.dot.className = 'z7-cursor-dot';
      this.dot.setAttribute('aria-hidden', 'true');

      document.body.appendChild(this.ring);
      document.body.appendChild(this.dot);
    }

    updateCanvasDimensions() {
      if (!this.canvas || !this.ctx) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }

    bindListeners() {
      window.addEventListener('pointermove', this.boundOnPointerMove, { passive: true });
      document.addEventListener('pointerleave', this.boundOnPointerLeave, { passive: true });
      window.addEventListener('resize', this.boundOnResize, { passive: true });

      // Re-evaluate device capabilities on changes
      const finePointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
      const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

      const handleCapabilityChange = () => {
        if (!isEligibleDevice()) {
          this.teardown();
        } else if (!this.canvas) {
          this.init();
        }
      };

      if (finePointerMedia.addEventListener) {
        finePointerMedia.addEventListener('change', handleCapabilityChange);
        reducedMotionMedia.addEventListener('change', handleCapabilityChange);
      }
    }

    onPointerMove(e) {
      this.x = e.clientX;
      this.y = e.clientY;

      if (!this.pointerActive) {
        this.pointerActive = true;
        if (this.ring) this.ring.style.opacity = '1';
        if (this.dot) this.dot.style.opacity = '1';
      }

      // Check hover on interactive elements
      try {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        this.overInteractive = Boolean(
          el &&
            el.closest(
              'a, button, input, select, textarea, [role="button"], [data-clickable], .acad-btn, .acad-nav__item, .acad-copy-btn'
            )
        );
      } catch (err) {
        this.overInteractive = false;
      }
    }

    onPointerLeave() {
      this.pointerActive = false;
      this.overInteractive = false;
      if (this.ring) this.ring.style.opacity = '0';
      if (this.dot) this.dot.style.opacity = '0';
    }

    onResize() {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.updateCanvasDimensions();
      }, 100);
    }

    getDotColor() {
      const isLight =
        document.documentElement.getAttribute('data-theme') === 'light' ||
        document.body.classList.contains('light-theme') ||
        document.documentElement.classList.contains('theme-light');
      return isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.16)';
    }

    step() {
      // 1. Update Dot & Ring Cursor
      if (this.pointerActive) {
        // Ring follow physics (0.25 lerp)
        this.rx += (this.x - this.rx) * 0.25;
        this.ry += (this.y - this.ry) * 0.25;

        // Scale lerp (0.22 factor)
        const targetScale = this.overInteractive ? 1.5 : 1.0;
        this.scale += (targetScale - this.scale) * 0.22;

        if (this.ring) {
          this.ring.style.transform = `translate3d(${(this.rx - 9).toFixed(2)}px, ${(this.ry - 9).toFixed(2)}px, 0) scale(${this.scale.toFixed(3)})`;
        }

        // Dot pinned 1:1 to pointer center (no lerp)
        if (this.dot) {
          this.dot.style.transform = `translate3d(${(this.x - 2).toFixed(2)}px, ${(this.y - 2).toFixed(2)}px, 0)`;
        }
      }

      // 2. Render Dot Grid Warp on Canvas
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = this.getDotColor();

        const gap = this.gap;
        const startX = (this.width % gap) / 2;
        const startY = (this.height % gap) / 2;
        const px = this.x;
        const py = this.y;
        const hasPointer = this.pointerActive;
        const reachSq = this.reachSq;
        const reach = this.reach;
        const push = this.push;
        const baseRadius = this.baseDotRadius;

        this.ctx.beginPath();

        for (let gy = startY; gy <= this.height; gy += gap) {
          for (let gx = startX; gx <= this.width; gx += gap) {
            let finalX = gx;
            let finalY = gy;
            let radius = baseRadius;

            if (hasPointer) {
              const dx = gx - px;
              const dy = gy - py;
              const distSq = dx * dx + dy * dy;

              if (distSq < reachSq && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const factor = 1 - dist / reach; // 1 at center, 0 at border
                const pushAmt = push * factor;
                finalX = gx + (dx / dist) * pushAmt;
                finalY = gy + (dy / dist) * pushAmt;
                radius = baseRadius * (1 + 0.85 * factor); // swells smoothly as it flees
              }
            }

            this.ctx.moveTo(finalX + radius, finalY);
            this.ctx.arc(finalX, finalY, radius, 0, 6.2831853);
          }
        }

        this.ctx.fill();
      }

      this.rafId = requestAnimationFrame(this.boundStep);
    }

    teardown() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener('pointermove', this.boundOnPointerMove);
      document.removeEventListener('pointerleave', this.boundOnPointerLeave);
      window.removeEventListener('resize', this.boundOnResize);

      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      if (this.backdrop && this.backdrop.parentNode) this.backdrop.parentNode.removeChild(this.backdrop);
      if (this.ring && this.ring.parentNode) this.ring.parentNode.removeChild(this.ring);
      if (this.dot && this.dot.parentNode) this.dot.parentNode.removeChild(this.dot);

      this.canvas = null;
      this.ctx = null;
      this.ring = null;
      this.dot = null;
      this.backdrop = null;
    }
  }

  // Auto-mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CinematicMotionLayer());
  } else {
    new CinematicMotionLayer();
  }
})();
