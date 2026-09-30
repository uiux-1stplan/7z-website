/* =========================================================
   7Z MAGIC — FOUNDERS FINAL HERO LOCK V41

   Interaction does NOT depend on event target.
   It checks pointer/touch coordinates against the entire visual rect.
========================================================= */
(() => {
  const visual = document.querySelector(".z7f20__visual");
  if (!visual) return;

  /* Remove stale V41 children if hot-reloaded/re-run. */
  visual.querySelectorAll(".z7f41__image, .z7f41__fade").forEach((node) => node.remove());

  const image = document.createElement("div");
  image.className = "z7f41__image";
  image.setAttribute("aria-hidden", "true");

  const fade = document.createElement("div");
  fade.className = "z7f41__fade";
  fade.setAttribute("aria-hidden", "true");

  visual.prepend(fade);
  visual.prepend(image);

  let inside = false;
  let touchTimer = 0;

  const pointInside = (x, y) => {
    const r = visual.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const setColor = (on) => {
    if (on === inside) return;
    inside = on;
    visual.classList.toggle("is-z7-v41-color", on);
  };

  /* Desktop mouse:
     ANY point inside the full rendered image rectangle activates color,
     regardless of which overlay/child is under the cursor. */
  document.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    setColor(pointInside(event.clientX, event.clientY));
  }, { passive: true, capture: true });

  document.addEventListener("mousemove", (event) => {
    setColor(pointInside(event.clientX, event.clientY));
  }, { passive: true, capture: true });

  /* If mouse leaves the browser window, restore monochrome. */
  window.addEventListener("blur", () => setColor(false));
  document.documentElement.addEventListener("mouseleave", () => setColor(false));

  /* Keyboard focus also reveals color. */
  visual.addEventListener("focus", () => setColor(true));
  visual.addEventListener("blur", () => setColor(false));

  /* Touch/pen:
     tap ANYWHERE inside the whole image rect -> color -> B/W. */
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    if (!pointInside(event.clientX, event.clientY)) return;

    window.clearTimeout(touchTimer);
    inside = true;
    visual.classList.add("is-z7-v41-color");

    touchTimer = window.setTimeout(() => {
      inside = false;
      visual.classList.remove("is-z7-v41-color");
    }, 1400);
  }, { passive: true, capture: true });

  /* Fallback for browsers/devices with incomplete Pointer Events. */
  document.addEventListener("touchstart", (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    if (!pointInside(touch.clientX, touch.clientY)) return;

    window.clearTimeout(touchTimer);
    inside = true;
    visual.classList.add("is-z7-v41-color");

    touchTimer = window.setTimeout(() => {
      inside = false;
      visual.classList.remove("is-z7-v41-color");
    }, 1400);
  }, { passive: true, capture: true });
})();