/* 7Z FOUNDERS IMMERSIVE AGENCY V18 — HERO ONLY */
(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_IMMERSIVE_V18__) return;
  window.__Z7_FOUNDERS_IMMERSIVE_V18__ = true;

  const hero = document.querySelector('[data-z7-founders-hero="immersive-v18"]');
  if (!hero) return;

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) return;

  let frame = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const render = () => {
    cx += (tx - cx) * 0.065;
    cy += (ty - cy) * 0.065;

    hero.style.setProperty("--z7f18-px", `${cx.toFixed(2)}px`);
    hero.style.setProperty("--z7f18-py", `${cy.toFixed(2)}px`);

    frame = requestAnimationFrame(render);
  };

  hero.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;

    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    tx = (x - .5) * 7;
    ty = (y - .5) * 3;

    hero.style.setProperty("--z7f18-gx", `${(x * 100).toFixed(1)}%`);
    hero.style.setProperty("--z7f18-gy", `${(y * 100).toFixed(1)}%`);
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    tx = 0;
    ty = 0;

    hero.style.setProperty("--z7f18-gx", "74%");
    hero.style.setProperty("--z7f18-gy", "38%");
  }, { passive: true });

  frame = requestAnimationFrame(render);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
  }, { once: true });
})();