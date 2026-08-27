/* Z7_FOUNDERS_HERO_MOTION_V8 */

(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_HERO_MOTION_V8__) return;
  window.__Z7_FOUNDERS_HERO_MOTION_V8__ = true;

  const D = document;

  function boot() {
    const hero = D.querySelector('[data-z7-founders-hero="photo-v1"]');
    if (!hero) return;

    const layer = hero.querySelector(".z7-founders-hero-photo-layer");
    const image = hero.querySelector(".z7-founders-hero-photo__image");

    if (!layer || !image) return;

    let raf = 0;

    hero.addEventListener("pointermove", (event) => {
      if (raf) cancelAnimationFrame(raf);

      raf = requestAnimationFrame(() => {
        const rect = layer.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

        hero.style.setProperty("--z7mx", `${(x * 100).toFixed(2)}%`);
        hero.style.setProperty("--z7my", `${(y * 100).toFixed(2)}%`);

        const dx = (x - .5) * 5;
        const dy = (y - .5) * 3;

        image.style.transform =
          `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(1.012)`;
      });
    }, { passive:true });

    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--z7mx", "68%");
      hero.style.setProperty("--z7my", "42%");
      image.style.transform = "translate3d(0,0,0) scale(1.006)";
    }, { passive:true });
  }

  if (D.readyState === "loading") {
    D.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }
})();