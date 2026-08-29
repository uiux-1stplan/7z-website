/* 7Z FOUNDERS APPROVED IMMERSIVE V19 — HERO ONLY */
(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_APPROVED_V19__) return;
  window.__Z7_FOUNDERS_APPROVED_V19__ = true;

  const hero = document.querySelector('[data-z7-founders-hero="approved-v19"]');
  if (!hero) return;

  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) return;

  let raf = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const render = () => {
    cx += (tx - cx) * 0.065;
    cy += (ty - cy) * 0.065;

    hero.style.setProperty("--z7f19-x", `${cx.toFixed(2)}px`);
    hero.style.setProperty("--z7f19-y", `${cy.toFixed(2)}px`);

    raf = requestAnimationFrame(render);
  };

  hero.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;

    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    tx = (x - .5) * 6;
    ty = (y - .5) * 2.5;

    hero.style.setProperty("--z7f19-gx", `${(x * 100).toFixed(1)}%`);
    hero.style.setProperty("--z7f19-gy", `${(y * 100).toFixed(1)}%`);
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    tx = 0;
    ty = 0;

    hero.style.setProperty("--z7f19-gx", "73%");
    hero.style.setProperty("--z7f19-gy", "35%");
  }, { passive: true });

  raf = requestAnimationFrame(render);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(raf);
  }, { once: true });
})();