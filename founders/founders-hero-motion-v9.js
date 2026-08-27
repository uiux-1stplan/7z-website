/* Z7_FOUNDERS_HERO_MOTION_V9 */

(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_HERO_MOTION_V9__) return;
  window.__Z7_FOUNDERS_HERO_MOTION_V9__ = true;

  const D = document;

  function boot() {
    const hero = D.querySelector('[data-z7-founders-hero="photo-v1"]');
    if (!hero) return;

    const layer = hero.querySelector(".z7-founders-hero-photo-layer");
    const image = hero.querySelector(".z7-founders-hero-photo__image");

    if (!layer || !image) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      currentX += (targetX - currentX) * .08;
      currentY += (targetY - currentY) * .08;

      image.style.transform =
        `translate3d(${currentX.toFixed(2)}px,${currentY.toFixed(2)}px,0) scale(1.012)`;

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    hero.addEventListener("pointermove", (event) => {
      const rect = layer.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      hero.style.setProperty("--z7mx", `${(x * 100).toFixed(2)}%`);
      hero.style.setProperty("--z7my", `${(y * 100).toFixed(2)}%`);

      targetX = (x - .5) * 7;
      targetY = (y - .5) * 4;
    }, { passive:true });

    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--z7mx", "70%");
      hero.style.setProperty("--z7my", "40%");
      targetX = 0;
      targetY = 0;
    }, { passive:true });
  }

  if (D.readyState === "loading") {
    D.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }
})();