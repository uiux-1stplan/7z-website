(() => {
  "use strict";

  /*
   * 7Z MAGIC — Elegant Magic Dust Cursor
   *
   * No GSAP dependency.
   * No ScrollTrigger.
   * No Lenis hooks.
   * No existing DOM mutation beyond its own isolated layer.
   */

  const finePointer = window.matchMedia(
    "(pointer:fine) and (hover:hover)"
  );

  if (!finePointer.matches) return;

  if (document.getElementById("z7MagicCursorLayer")) return;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const layer = document.createElement("div");
  layer.id = "z7MagicCursorLayer";
  layer.className = "z7-magic-cursor-layer";
  layer.setAttribute("aria-hidden", "true");

  const halo = document.createElement("span");
  halo.className = "z7-magic-cursor-halo";

  const core = document.createElement("span");
  core.className = "z7-magic-cursor-core";

  layer.append(halo, core);

  document.body.appendChild(layer);

  document.documentElement.classList.add(
    "z7-magic-cursor-enabled"
  );

  let mouseX = innerWidth / 2;
  let mouseY = innerHeight / 2;

  let haloX = mouseX;
  let haloY = mouseY;

  let previousX = mouseX;
  let previousY = mouseY;

  let lastDustX = mouseX;
  let lastDustY = mouseY;

  let lastDustTime = 0;

  const ACTIVE_DUST_LIMIT = 58;

  const particles = new Set();

  const interactiveSelector = [
    "a",
    "button",
    "[role='button']",
    "input",
    "textarea",
    "select",
    "summary",
    "[data-cursor]",
    ".btn",
    ".button"
  ].join(",");


  /* --------------------------------------------------
     Position loop
     -------------------------------------------------- */

  const render = () => {

    haloX += (mouseX - haloX) * 0.19;
    haloY += (mouseY - haloY) * 0.19;

    halo.style.transform =
      `translate3d(${haloX}px,${haloY}px,0)`;

    core.style.transform =
      `translate3d(${mouseX}px,${mouseY}px,0) rotate(45deg)`;

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);


  /* --------------------------------------------------
     Dust particle
     -------------------------------------------------- */

  const spawnDust = (x, y, dx, dy) => {

    if (reducedMotion) return;

    if (particles.size >= ACTIVE_DUST_LIMIT) return;

    const particle = document.createElement("i");

    particle.className = "z7-magic-dust";

    const size =
      2.10 + Math.random() * 2.20;

    particle.style.setProperty(
      "--z7-dust-size",
      `${size}px`
    );

    layer.insertBefore(
      particle,
      halo
    );

    particles.add(particle);

    const speed =
      Math.min(
        Math.hypot(dx, dy),
        28
      );

    const trailFactor =
      0.45 + Math.random() * 0.55;

    const startX =
      x +
      (Math.random() - .5) * 4;

    const startY =
      y +
      (Math.random() - .5) * 4;

    const endX =
      startX
      - dx * trailFactor
      + (Math.random() - .5) * 9;

    const endY =
      startY
      - dy * trailFactor
      - 4
      - Math.random() * 8;

    const duration =
      610 +
      Math.random() * 390 +
      speed * 3;

    const startOpacity =
      .62 + Math.random() * .32;

    const anim = particle.animate(
      [
        {
          transform:
            `translate3d(${startX}px,${startY}px,0) scale(.65)`,
          opacity: startOpacity
        },
        {
          offset: .36,
          transform:
            `translate3d(${startX - dx * .18}px,${startY - 2}px,0) scale(1)`,
          opacity: startOpacity * .76
        },
        {
          transform:
            `translate3d(${endX}px,${endY}px,0) scale(.15)`,
          opacity: 0
        }
      ],
      {
        duration,
        easing: "cubic-bezier(.16,.78,.28,1)",
        fill: "forwards"
      }
    );

    anim.onfinish = () => {

      particles.delete(particle);

      particle.remove();
    };
  };


  /* --------------------------------------------------
     Pointer movement
     -------------------------------------------------- */

  window.addEventListener(
    "pointermove",
    (event) => {

      if (
        event.pointerType &&
        event.pointerType !== "mouse"
      ) {
        return;
      }

      mouseX = event.clientX;
      mouseY = event.clientY;

      layer.classList.add(
        "is-visible"
      );

      const dx =
        mouseX - previousX;

      const dy =
        mouseY - previousY;

      const distanceFromDust =
        Math.hypot(
          mouseX - lastDustX,
          mouseY - lastDustY
        );

      const now =
        performance.now();

      if (
        distanceFromDust > 4 &&
        now - lastDustTime > 8
      ) {

        /*
         * Mostly 1 particle.
         * Occasionally 2 on faster movement.
         * Keeps the effect elegant instead of glitter-heavy.
         */

        spawnDust(
          mouseX,
          mouseY,
          dx,
          dy
        );

        if (
          Math.hypot(dx,dy) > 10 &&
          Math.random() > .38
        ) {
          spawnDust(
            mouseX,
            mouseY,
            dx * .72,
            dy * .72
          );
        }

        lastDustX = mouseX;
        lastDustY = mouseY;
        lastDustTime = now;
      }

      previousX = mouseX;
      previousY = mouseY;
    },
    {
      passive: true
    }
  );


  /* --------------------------------------------------
     Interaction awareness
     -------------------------------------------------- */

  document.addEventListener(
    "pointerover",
    (event) => {

      const target =
        event.target instanceof Element
          ? event.target.closest(interactiveSelector)
          : null;

      layer.classList.toggle(
        "is-interactive",
        Boolean(target)
      );
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "pointerout",
    (event) => {

      if (
        event.relatedTarget instanceof Element &&
        event.relatedTarget.closest(interactiveSelector)
      ) {
        return;
      }

      const next =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest(interactiveSelector)
          : null;

      if (!next) {
        layer.classList.remove(
          "is-interactive"
        );
      }
    },
    {
      passive: true
    }
  );


  document.addEventListener(
    "pointerdown",
    () => {
      layer.classList.add("is-pressed");
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "pointerup",
    () => {
      layer.classList.remove("is-pressed");
    },
    {
      passive: true
    }
  );


  /* --------------------------------------------------
     Enter / leave viewport
     -------------------------------------------------- */

  document.documentElement.addEventListener(
    "mouseleave",
    () => {
      layer.classList.remove("is-visible");
    }
  );

  document.documentElement.addEventListener(
    "mouseenter",
    () => {
      layer.classList.add("is-visible");
    }
  );


  /* --------------------------------------------------
     Window blur
     -------------------------------------------------- */

  window.addEventListener(
    "blur",
    () => {
      layer.classList.remove("is-visible");
    }
  );

})();