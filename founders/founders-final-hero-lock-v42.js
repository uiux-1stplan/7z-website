/* =========================================================
   7Z MAGIC — FOUNDERS FINAL HERO V42
========================================================= */
(() => {
  const hero = document.querySelector(".z7f20");
  const visual = hero?.querySelector(".z7f20__visual");
  if (!hero || !visual) return;

  /* Remove stale final-stage layers if present. */
  visual.querySelectorAll(".z7f41__image, .z7f41__fade, .z7f42__image, .z7f42__fade")
    .forEach((node) => node.remove());

  const image = document.createElement("div");
  image.className = "z7f42__image";
  image.setAttribute("aria-hidden", "true");

  const fade = document.createElement("div");
  fade.className = "z7f42__fade";
  fade.setAttribute("aria-hidden", "true");

  visual.prepend(fade);
  visual.prepend(image);

  let touchTimer = 0;
  let currentColor = false;

  const setFilterDirectly = (color) => {
    currentColor = color;
    visual.classList.toggle("is-z7-v42-color", color);

    /* Direct !important inline fallback.
       This makes the interaction independent of every old stylesheet. */
    image.style.setProperty(
      "filter",
      color
        ? "grayscale(0) saturate(.98) contrast(1.02) brightness(.98)"
        : "grayscale(1) saturate(0) contrast(1.07) brightness(.86)",
      "important"
    );
  };

  const pointInside = (x, y) => {
    const r = visual.getBoundingClientRect();
    return (
      x >= r.left &&
      x <= r.right &&
      y >= r.top &&
      y <= r.bottom
    );
  };

  /* Desktop: any pixel inside the complete visible image rectangle. */
  const followMouse = (event) => {
    const inside = pointInside(event.clientX, event.clientY);
    if (inside !== currentColor) setFilterDirectly(inside);
  };

  document.addEventListener("mousemove", followMouse, {
    passive: true,
    capture: true
  });

  document.addEventListener("pointermove", (event) => {
    if (!event.pointerType || event.pointerType === "mouse") {
      followMouse(event);
    }
  }, {
    passive: true,
    capture: true
  });

  visual.addEventListener("mouseenter", () => setFilterDirectly(true));
  visual.addEventListener("mouseleave", () => setFilterDirectly(false));

  window.addEventListener("blur", () => setFilterDirectly(false));

  /* Touch / pen: any tap anywhere inside the image keeps color long
     enough to be visibly obvious, then returns smoothly to B/W. */
  const revealFromPoint = (x, y) => {
    if (!pointInside(x, y)) return;

    window.clearTimeout(touchTimer);
    setFilterDirectly(true);

    touchTimer = window.setTimeout(() => {
      setFilterDirectly(false);
    }, 3200);
  };

  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    revealFromPoint(event.clientX, event.clientY);
  }, {
    passive: true,
    capture: true
  });

  document.addEventListener("touchstart", (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    revealFromPoint(touch.clientX, touch.clientY);
  }, {
    passive: true,
    capture: true
  });

  /* Click fallback also covers DevTools device emulation. */
  document.addEventListener("click", (event) => {
    if (window.matchMedia("(max-width: 1100px)").matches) {
      revealFromPoint(event.clientX, event.clientY);
    }
  }, {
    passive: true,
    capture: true
  });

  /* Dynamically keep desktop photo below the floating header. */
  const updateSafeTop = () => {
    if (!window.matchMedia("(min-width: 1101px)").matches) return;

    const header =
      document.querySelector("header") ||
      document.querySelector(".site-header") ||
      document.querySelector(".topbar");

    const heroRect = hero.getBoundingClientRect();

    if (!header) {
      hero.style.setProperty("--z7f42-safe-top", "176px");
      return;
    }

    const headerRect = header.getBoundingClientRect();

    /* Header bottom relative to hero top + visual breathing room. */
    const safeTop = Math.max(
      138,
      Math.round(headerRect.bottom - heroRect.top + 12)
    );

    hero.style.setProperty("--z7f42-safe-top", `${safeTop}px`);
  };

  updateSafeTop();

  window.addEventListener("resize", () => {
    window.requestAnimationFrame(updateSafeTop);
  }, { passive: true });

  window.setTimeout(updateSafeTop, 120);
  window.setTimeout(updateSafeTop, 500);

  setFilterDirectly(false);
})();