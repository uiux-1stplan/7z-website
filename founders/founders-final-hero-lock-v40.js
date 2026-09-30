/* =========================================================
   7Z MAGIC — FOUNDERS FINAL HERO LOCK V40
========================================================= */
(() => {
  const visual = document.querySelector(".z7f20__visual");
  if (!visual) return;

  let touchTimer = 0;

  const colorOn = () => {
    window.clearTimeout(touchTimer);
    visual.classList.add("is-z7-final-color");
  };

  const colorOff = () => {
    window.clearTimeout(touchTimer);
    visual.classList.remove("is-z7-final-color");
  };

  /* Desktop mouse: deterministic, independent of older controllers. */
  visual.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") colorOn();
  });

  visual.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") colorOff();
  });

  visual.addEventListener("focusin", colorOn);
  visual.addEventListener("focusout", colorOff);

  /* Touch/pen: reveal, then return smoothly to monochrome. */
  visual.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;

    colorOn();

    touchTimer = window.setTimeout(() => {
      visual.classList.remove("is-z7-final-color");
    }, 1250);
  }, { passive: true });

  visual.addEventListener("pointercancel", colorOff, { passive: true });
})();