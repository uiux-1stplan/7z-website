/* 7Z FOUNDERS STUDIO V20 — HERO ONLY */
(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_STUDIO_V20__) return;
  window.__Z7_FOUNDERS_STUDIO_V20__ = true;

  const hero = document.querySelector('[data-z7-founders-hero="studio-v20"]');
  if (!hero) return;

  const visual = hero.querySelector(".z7f20__visual");
  if (!visual) return;

  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let colorTimer = 0;

  const revealColorForTouch = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    visual.classList.add("is-color");

    window.clearTimeout(colorTimer);
    colorTimer = window.setTimeout(() => {
      visual.classList.remove("is-color");
    }, 2200);
  };

  visual.addEventListener("touchstart", revealColorForTouch, { passive: true });

  visual.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") revealColorForTouch();
  }, { passive: true });

  visual.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      visual.classList.toggle("is-color");
    }
  });

  if (reduced) return;

  let raf = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const render = () => {
    cx += (tx - cx) * 0.065;
    cy += (ty - cy) * 0.065;

    hero.style.setProperty("--z7f20-shift-x", `${cx.toFixed(2)}px`);
    hero.style.setProperty("--z7f20-shift-y", `${cy.toFixed(2)}px`);

    raf = requestAnimationFrame(render);
  };

  visual.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;

    const rect = visual.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    tx = (x - .5) * 5;
    ty = (y - .5) * 2.4;

    hero.style.setProperty("--z7f20-mx", `${(x * 100).toFixed(1)}%`);
    hero.style.setProperty("--z7f20-my", `${(y * 100).toFixed(1)}%`);
  }, { passive: true });

  visual.addEventListener("pointerleave", () => {
    tx = 0;
    ty = 0;

    hero.style.setProperty("--z7f20-mx", "72%");
    hero.style.setProperty("--z7f20-my", "35%");
  }, { passive: true });

  raf = requestAnimationFrame(render);

  window.addEventListener("pagehide", () => {
    window.clearTimeout(colorTimer);
    cancelAnimationFrame(raf);
  }, { once: true });
})();
/* =========================================================
   Z7_FOUNDERS_APPROVED_VISUAL_LOCK_V3
   Exact touch interaction for .z7f20__visual.
========================================================= */
(() => {
  const hero = document.querySelector(".z7f20");
  const visual = hero?.querySelector(".z7f20__visual");

  if (!hero || !visual) return;

  let returnTimer = 0;

  const showColor = () => {
    window.clearTimeout(returnTimer);
    hero.classList.add("is-z7-approved-color");
  };

  const returnToMono = (delay = 0) => {
    window.clearTimeout(returnTimer);

    if (delay > 0) {
      returnTimer = window.setTimeout(() => {
        hero.classList.remove("is-z7-approved-color");
      }, delay);
      return;
    }

    hero.classList.remove("is-z7-approved-color");
  };

  visual.addEventListener("pointerdown", () => {
    showColor();
    returnToMono(1150);
  }, { passive: true });

  visual.addEventListener("pointercancel", () => returnToMono(), { passive: true });

  visual.addEventListener("blur", () => returnToMono(), true);
})();
/* =========================================================
   Z7_FOUNDERS_SAME_IMAGE_MONO_V5
   Uses the CURRENT visible V37 image only.
========================================================= */
(() => {
  const visual = document.querySelector(".z7f20__visual");
  if (!visual) return;

  if (!visual.querySelector(".z7f20__mono-same-image")) {
    const mono = document.createElement("div");
    mono.className = "z7f20__mono-same-image";
    mono.setAttribute("aria-hidden", "true");
    visual.prepend(mono);
  }

  let timer = 0;

  const showColor = () => {
    window.clearTimeout(timer);
    visual.classList.add("is-z7-same-image-color");
  };

  const backToMono = (delay = 0) => {
    window.clearTimeout(timer);

    if (delay > 0) {
      timer = window.setTimeout(() => {
        visual.classList.remove("is-z7-same-image-color");
      }, delay);
      return;
    }

    visual.classList.remove("is-z7-same-image-color");
  };

  visual.addEventListener("pointerdown", () => {
    showColor();
    backToMono(1150);
  }, { passive: true });

  visual.addEventListener("pointercancel", () => backToMono(), { passive: true });
})();
