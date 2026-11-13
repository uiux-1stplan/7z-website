/**
 * 7Z MAGIC — Spring Physics Text Engine (v0.1.5 Equivalent)
 * Unblur Lines heading animator using harmonic oscillator physics.
 * tension: 190, friction: 26, delayIn: 150ms, lineStagger: 90ms.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  const CONFIG = {
    tension: 190,
    friction: 26,
    delayIn: 150,
    lineStagger: 90,
    blurMax: 10,
    selector: 'h1, h2, h3, h4, h5, h6'
  };

  const isReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class SpringTextEngine {
    constructor() {
      this.activeAnimations = new Set();
      this.rafId = null;
      this.lastTime = null;
      this.observer = null;
      this.init();
    }

    init() {
      if (isReducedMotion()) return;
      this.setupObserver();
      this.bindEvents();
    }

    setupObserver() {
      if (this.observer) this.observer.disconnect();

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              this.observer.unobserve(el);
              this.animateHeading(el);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
      );

      this.scanHeadings();
    }

    scanHeadings() {
      if (isReducedMotion()) return;
      const headings = document.querySelectorAll(CONFIG.selector);
      headings.forEach((h) => {
        // Skip headings inside admin or explicitly excluded
        if (h.closest('.admin-wrap') || h.closest('#adminRoot') || h.dataset.noSpring !== undefined) {
          return;
        }
        if (!h.__z7SpringInitialText) {
          h.__z7SpringInitialText = h.innerHTML;
        }
        this.splitHeadingLines(h);
        this.observer.observe(h);
      });
    }

    splitHeadingLines(heading) {
      // Determine computed alignment
      const style = window.getComputedStyle(heading);
      const align = style.textAlign || 'start';
      let alignClass = 'z7-spring-line-wrap--start';
      if (align === 'center') alignClass = 'z7-spring-line-wrap--center';
      else if (align === 'right' || (style.direction === 'rtl' && align === 'start')) {
        alignClass = style.direction === 'rtl' ? 'z7-spring-line-wrap--start' : 'z7-spring-line-wrap--end';
      }

      // Read text content words (or child spans if marked)
      const rawText = heading.textContent || '';
      const words = rawText.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return;

      // Temporary span wrap to measure line breaks based on offsetTop
      heading.innerHTML = '';
      const wrap = document.createElement('span');
      wrap.className = `z7-spring-line-wrap ${alignClass}`;
      wrap.setAttribute('aria-hidden', 'true');

      const tempSpans = words.map((w) => {
        const s = document.createElement('span');
        s.textContent = w + ' ';
        s.style.display = 'inline-block';
        wrap.appendChild(s);
        return s;
      });

      // Accessible screen-reader text
      const srText = document.createElement('span');
      srText.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      srText.textContent = rawText;
      heading.appendChild(srText);
      heading.appendChild(wrap);

      // Measure lines by offsetTop
      const lineGroups = [];
      let currentTop = null;
      let currentWords = [];

      tempSpans.forEach((span, idx) => {
        const top = span.offsetTop;
        if (currentTop === null || Math.abs(top - currentTop) > 6) {
          if (currentWords.length > 0) {
            lineGroups.push(currentWords.join(' '));
          }
          currentTop = top;
          currentWords = [words[idx]];
        } else {
          currentWords.push(words[idx]);
        }
      });
      if (currentWords.length > 0) {
        lineGroups.push(currentWords.join(' '));
      }

      // Rebuild wrap with .z7-spring-line spans
      wrap.innerHTML = '';
      const lineElements = lineGroups.map((lineText) => {
        const lineSpan = document.createElement('span');
        lineSpan.className = 'z7-spring-line';
        lineSpan.textContent = lineText;
        lineSpan.style.opacity = '0';
        lineSpan.style.filter = `blur(${CONFIG.blurMax}px)`;
        lineSpan.style.marginRight = '0.28em';
        wrap.appendChild(lineSpan);
        return lineSpan;
      });

      heading.__z7LineElements = lineElements;
      heading.__z7Wrap = wrap;
    }

    animateHeading(heading) {
      if (isReducedMotion()) {
        if (heading.__z7LineElements) {
          heading.__z7LineElements.forEach((el) => {
            el.style.opacity = '1';
            el.style.filter = 'none';
          });
        }
        return;
      }

      const lines = heading.__z7LineElements;
      if (!lines || lines.length === 0) return;

      const startTime = performance.now();
      const springs = lines.map((el, i) => ({
        el,
        pos: 0,
        vel: 0,
        target: 1,
        delay: CONFIG.delayIn + i * CONFIG.lineStagger,
        done: false
      }));

      const animation = {
        startTime,
        springs,
        heading
      };

      this.activeAnimations.add(animation);
      if (!this.rafId) {
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame(this.step.bind(this));
      }
    }

    step(now) {
      const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.033) || (1 / 60);
      this.lastTime = now;

      const finishedAnimations = [];

      this.activeAnimations.forEach((anim) => {
        const elapsed = now - anim.startTime;
        let allDone = true;

        for (let i = 0; i < anim.springs.length; i++) {
          const s = anim.springs[i];
          if (s.done) continue;

          if (elapsed < s.delay) {
            allDone = false;
            continue;
          }

          // Harmonic Oscillator Solver: F = -tension*(pos - target) - friction*vel
          const force = -CONFIG.tension * (s.pos - s.target) - CONFIG.friction * s.vel;
          s.vel += force * dt;
          s.pos += s.vel * dt;

          // Check resting condition
          if (Math.abs(s.pos - s.target) < 0.002 && Math.abs(s.vel) < 0.005) {
            s.pos = s.target;
            s.vel = 0;
            s.done = true;
          } else {
            allDone = false;
          }

          const op = Math.max(0, Math.min(1, s.pos));
          const blur = Math.max(0, CONFIG.blurMax * (1 - s.pos));

          s.el.style.opacity = op >= 0.999 ? '1' : op.toFixed(4);
          s.el.style.filter = blur > 0.04 ? `blur(${blur.toFixed(2)}px)` : 'none';
        }

        if (allDone) {
          finishedAnimations.push(anim);
        }
      });

      finishedAnimations.forEach((anim) => {
        this.activeAnimations.delete(anim);
      });

      if (this.activeAnimations.size > 0) {
        this.rafId = requestAnimationFrame(this.step.bind(this));
      } else {
        this.rafId = null;
        this.lastTime = null;
      }
    }

    reinit() {
      // Clean re-init on language change or layout reflow
      const headings = document.querySelectorAll(CONFIG.selector);
      headings.forEach((h) => {
        if (h.__z7SpringInitialText) {
          h.innerHTML = h.__z7SpringInitialText;
          delete h.__z7LineElements;
          delete h.__z7Wrap;
        }
      });
      setTimeout(() => {
        this.scanHeadings();
      }, 60);
    }

    bindEvents() {
      // Re-trigger on language toggle
      const handleLangSwitch = () => {
        setTimeout(() => this.reinit(), 100);
      };

      document.addEventListener('click', (e) => {
        if (
          e.target.closest('#lang') ||
          e.target.closest('.z7-lang-toggle') ||
          e.target.closest('[data-lang-toggle]')
        ) {
          handleLangSwitch();
        }
      });

      window.addEventListener('z7:language-change', handleLangSwitch);
      window.addEventListener('resize', () => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => this.reinit(), 200);
      });

      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', () => {
          if (isReducedMotion()) {
            this.reinit();
          }
        });
      }
    }
  }

  // Auto-boot when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SpringTextEngine());
  } else {
    new SpringTextEngine();
  }
})();
