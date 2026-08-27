/* Z7_FOUNDERS_HERO_MOTION_V7 */

(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_HERO_MOTION_V7__) return;
  window.__Z7_FOUNDERS_HERO_MOTION_V7__ = true;

  const D = document;

  function boot() {
    const hero = D.querySelector('[data-z7-founders-hero="photo-v1"]');
    if (!hero) return;

    const layer = hero.querySelector(".z7-founders-hero-photo-layer");
    if (!layer) return;

    let raf = 0;

    const apply = (event) => {
      if (raf) cancelAnimationFrame(raf);

      raf = requestAnimationFrame(() => {
        const rect = layer.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

        hero.style.setProperty("--z7mx", `${(x * 100).toFixed(2)}%`);
        hero.style.setProperty("--z7my", `${(y * 100).toFixed(2)}%`);
      });
    };

    hero.addEventListener("pointermove", apply, { passive: true });

    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--z7mx", "64%");
      hero.style.setProperty("--z7my", "44%");
    }, { passive: true });
  }

  if (D.readyState === "loading") {
    D.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();