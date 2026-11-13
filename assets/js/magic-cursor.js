(() => {
  "use strict";

  /*
   * 7Z MAGIC — Signature Cinematic Custom Cursor
   * Desktop-only with smooth physics spring/lerp, theme-adaptive styling,
   * and contextual reactive badges (VIEW / EXPLORE / PLAY).
   */

  const finePointer = window.matchMedia("(pointer:fine) and (hover:hover)");
  if (!finePointer.matches) return;

  if (document.getElementById("z7MagicCursorLayer")) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const layer = document.createElement("div");
  layer.id = "z7MagicCursorLayer";
  layer.className = "z7-magic-cursor-layer";
  layer.setAttribute("aria-hidden", "true");

  const halo = document.createElement("span");
  halo.className = "z7-magic-cursor-halo";

  const badge = document.createElement("span");
  badge.className = "z7-magic-cursor-badge";
  badge.textContent = "";
  halo.appendChild(badge);

  const core = document.createElement("span");
  core.className = "z7-magic-cursor-core";

  layer.append(halo, core);
  document.body.appendChild(layer);
  document.documentElement.classList.add("z7-magic-cursor-enabled");

  let mouseX = innerWidth / 2;
  let mouseY = innerHeight / 2;
  let haloX = mouseX;
  let haloY = mouseY;
  let previousX = mouseX;
  let previousY = mouseY;
  let lastDustX = mouseX;
  let lastDustY = mouseY;
  let lastDustTime = 0;

  const ACTIVE_DUST_LIMIT = 48;
  const particles = new Set();

  const standardInteractive = [
    "a:not(.ws-stage a):not(.media-tile)",
    "button",
    "[role='button']",
    "input",
    "textarea",
    "select",
    "summary",
    ".btn",
    ".button",
    ".z7-theme-toggle",
    ".z7-lang-toggle",
    ".z7-menu-toggle",
    ".ws-view-switch button",
    "[data-reel-prev]",
    "[data-reel-next]"
  ].join(",");

  const mediaShowcase = [
    "[data-web-stage]",
    ".ws-stage",
    ".media-tile",
    ".svc-mirror-card",
    ".svc-film-lane--campaign",
    ".svc-mirror-stage",
    "video",
    "a.ws-live-link",
    ".ws-live-link"
  ].join(",");

  /* --------------------------------------------------
     Position loop with smooth spring/lerp
     -------------------------------------------------- */
  const render = () => {
    // Smooth physical lerp follow
    const lerpFactor = 0.22;
    haloX += (mouseX - haloX) * lerpFactor;
    haloY += (mouseY - haloY) * lerpFactor;

    halo.style.transform = `translate3d(${haloX}px,${haloY}px,0)`;
    core.style.transform = `translate3d(${mouseX}px,${mouseY}px,0)`;

    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  /* --------------------------------------------------
     Subtle luminous dust particles
     -------------------------------------------------- */
  const spawnDust = (x, y, dx, dy) => {
    if (reducedMotion || particles.size >= ACTIVE_DUST_LIMIT) return;

    const particle = document.createElement("i");
    particle.className = "z7-magic-dust";
    const size = 2.0 + Math.random() * 2.2;
    particle.style.setProperty("--z7-dust-size", `${size}px`);

    layer.insertBefore(particle, halo);
    particles.add(particle);

    const speed = Math.min(Math.hypot(dx, dy), 24);
    const trailFactor = 0.45 + Math.random() * 0.45;
    const startX = x + (Math.random() - 0.5) * 4;
    const startY = y + (Math.random() - 0.5) * 4;
    const endX = startX - dx * trailFactor + (Math.random() - 0.5) * 8;
    const endY = startY - dy * trailFactor - 3 - Math.random() * 6;
    const duration = 520 + Math.random() * 320 + speed * 2.5;

    const anim = particle.animate(
      [
        { transform: `translate3d(${startX}px,${startY}px,0) scale(0.6)`, opacity: 0.75 },
        { offset: 0.35, transform: `translate3d(${startX - dx * 0.15}px,${startY - 2}px,0) scale(1)`, opacity: 0.55 },
        { transform: `translate3d(${endX}px,${endY}px,0) scale(0.15)`, opacity: 0 }
      ],
      { duration, easing: "cubic-bezier(.16,.78,.28,1)", fill: "forwards" }
    );

    anim.onfinish = () => {
      particles.delete(particle);
      particle.remove();
    };
  };

  /* --------------------------------------------------
     Pointer movement
     -------------------------------------------------- */
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;

    mouseX = event.clientX;
    mouseY = event.clientY;
    layer.classList.add("is-visible");

    const dx = mouseX - previousX;
    const dy = mouseY - previousY;
    const distanceFromDust = Math.hypot(mouseX - lastDustX, mouseY - lastDustY);
    const now = performance.now();

    if (distanceFromDust > 5 && now - lastDustTime > 12) {
      spawnDust(mouseX, mouseY, dx, dy);
      lastDustX = mouseX;
      lastDustY = mouseY;
      lastDustTime = now;
    }

    previousX = mouseX;
    previousY = mouseY;
  }, { passive: true });

  /* --------------------------------------------------
     Smart contextual hover reactions
     -------------------------------------------------- */
  const updateHoverState = (target) => {
    if (!target) {
      layer.classList.remove("is-interactive", "is-media-hover");
      badge.textContent = "";
      return;
    }

    // Check media / showcase target first
    const mediaTarget = target.closest(mediaShowcase);
    if (mediaTarget) {
      layer.classList.add("is-media-hover");
      layer.classList.remove("is-interactive");

      if (mediaTarget.closest(".svc-film-lane") || mediaTarget.closest(".svc-mirror-card") || mediaTarget.tagName === "VIDEO") {
        badge.textContent = "PLAY";
      } else if (mediaTarget.closest("[data-web-stage]") || mediaTarget.classList.contains("ws-stage")) {
        badge.textContent = "EXPLORE";
      } else if (mediaTarget.classList.contains("ws-live-link") || mediaTarget.closest(".ws-live-link")) {
        badge.textContent = "VISIT";
      } else {
        badge.textContent = "VIEW";
      }
      return;
    }

    // Check standard interactive
    const interactiveTarget = target.closest(standardInteractive);
    if (interactiveTarget) {
      layer.classList.add("is-interactive");
      layer.classList.remove("is-media-hover");
      badge.textContent = "";
      return;
    }

    layer.classList.remove("is-interactive", "is-media-hover");
    badge.textContent = "";
  };

  document.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element)) return;
    updateHoverState(event.target);
  }, { passive: true });

  document.addEventListener("pointerout", (event) => {
    if (event.relatedTarget instanceof Element) {
      updateHoverState(event.relatedTarget);
    } else {
      updateHoverState(null);
    }
  }, { passive: true });

  document.addEventListener("pointerdown", () => {
    layer.classList.add("is-pressed");
  }, { passive: true });

  document.addEventListener("pointerup", () => {
    layer.classList.remove("is-pressed");
  }, { passive: true });

  /* --------------------------------------------------
     Viewport Enter / Leave
     -------------------------------------------------- */
  document.documentElement.addEventListener("mouseleave", () => {
    layer.classList.remove("is-visible");
  });
  document.documentElement.addEventListener("mouseenter", () => {
    layer.classList.add("is-visible");
  });
  window.addEventListener("blur", () => {
    layer.classList.remove("is-visible");
  });
})();
