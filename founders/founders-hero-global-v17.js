/* 7Z FOUNDERS GLOBAL HERO V17 — HERO ONLY */
(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_GLOBAL_V17__) return;
  window.__Z7_FOUNDERS_GLOBAL_V17__ = true;

  const hero = document.querySelector('[data-z7-founders-hero="global-v17"]');
  if (!hero) return;

  const desktopMedia = hero.querySelector(".z7f17__media--desktop");
  if (!desktopMedia) return;

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
    cx += (tx - cx) * 0.07;
    cy += (ty - cy) * 0.07;

    hero.style.setProperty("--z7f17-x", `${cx.toFixed(2)}px`);
    hero.style.setProperty("--z7f17-y", `${cy.toFixed(2)}px`);

    frame = requestAnimationFrame(render);
  };

  const onMove = (event) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;

    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    tx = (x - 0.5) * 7;
    ty = (y - 0.5) * 3;

    hero.style.setProperty("--z7f17-glow-x", `${(x * 100).toFixed(1)}%`);
    hero.style.setProperty("--z7f17-glow-y", `${(y * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    tx = 0;
    ty = 0;
    hero.style.setProperty("--z7f17-glow-x", "72%");
    hero.style.setProperty("--z7f17-glow-y", "34%");
  };

  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerleave", onLeave, { passive: true });

  frame = requestAnimationFrame(render);

  window.addEventListener(
    "pagehide",
    () => cancelAnimationFrame(frame),
    { once: true }
  );
})();