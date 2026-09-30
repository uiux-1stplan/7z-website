(() => {
  "use strict";

  const SECTION_ID = "media";
  const RAIL_ID = "mediaRail";
  const CARD_SELECTOR = ".media-tile";

  const section = document.getElementById(SECTION_ID);
  const rail = document.getElementById(RAIL_ID);

  if (!section || !rail) return;

  let started = false;

  function startFanDeck() {
    if (started) return true;

    const cards = Array.from(
      rail.querySelectorAll(CARD_SELECTOR)
    );

    if (cards.length < 2) return false;

    started = true;

    const gsapRef = window.gsap || null;
    const scrollTriggerRef = window.ScrollTrigger || null;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let activeIndex = Math.floor(
      Math.min(cards.length - 1, cards.length / 2)
    );

    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerId = null;
    let dragging = false;
    let moved = false;
    let lastWheelAt = 0;
    let resizeTimer = null;

    rail.classList.add("z7-fandeck");

    rail.setAttribute(
      "aria-label",
      "Marketing media projects"
    );

    rail.setAttribute("tabindex", "0");

    /*
      Remove ONLY legacy GSAP animations whose actual targets
      are #mediaRail or .media-tile elements inside this section.

      No global ScrollTrigger, Lenis, header, section reveal,
      or any other site's animation is touched.
    */
    function removeLegacyMediaMotion() {
      if (!gsapRef) return;

      try {
        gsapRef.killTweensOf([rail, ...cards]);
      } catch (_) {}

      if (
        scrollTriggerRef &&
        typeof scrollTriggerRef.getAll === "function"
      ) {
        scrollTriggerRef.getAll().forEach((trigger) => {
          try {
            const animation = trigger.animation;

            const targets =
              animation &&
              typeof animation.targets === "function"
                ? animation.targets()
                : [];

            const affectsFan =
              Array.isArray(targets) &&
              targets.some((target) => {
                return (
                  target === rail ||
                  cards.includes(target)
                );
              });

            if (affectsFan) {
              trigger.kill(true);
            }
          } catch (_) {}
        });
      }

      try {
        gsapRef.set(rail, {
          clearProps: "transform"
        });

        gsapRef.set(cards, {
          clearProps:
            "transform,opacity,filter,zIndex"
        });
      } catch (_) {}
    }

    removeLegacyMediaMotion();

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function isCompact() {
      return window.matchMedia(
        "(max-width: 899px)"
      ).matches;
    }

    function calculateState(index) {
      const compact = isCompact();

      const delta = index - activeIndex;
      const distance = Math.abs(delta);

      const width =
        rail.getBoundingClientRect().width ||
        window.innerWidth;

      const spacing = compact
        ? clamp(width * 0.235, 58, 88)
        : clamp(width * 0.155, 78, 128);

      const rotationStep = compact ? 5.2 : 7.2;

      const rotation = clamp(
        delta * rotationStep,
        compact ? -15 : -20,
        compact ? 15 : 20
      );

      const x = delta * spacing;

      const baseDrop = compact ? 13 : 18;
      const curve = compact ? 2.2 : 3.1;

      let y =
        distance * baseDrop +
        distance * distance * curve;

      if (distance === 0) {
        y = compact ? -12 : -24;
      }

      const scaleLoss = compact ? 0.052 : 0.061;

      const scale = Math.max(
        compact ? 0.79 : 0.75,
        1.025 - distance * scaleLoss
      );

      const brightness =
        distance === 0
          ? 1
          : Math.max(
              0.62,
              0.89 - distance * 0.065
            );

      const saturation =
        distance === 0
          ? 1
          : Math.max(
              0.72,
              0.94 - distance * 0.035
            );

      const maxVisible = compact ? 4 : 5;

      const opacity =
        distance > maxVisible ? 0 : 1;

      const zIndex =
        distance === 0
          ? 200
          : 120 - distance;

      return {
        x,
        y,
        rotation,
        scale,
        brightness,
        saturation,
        opacity,
        zIndex
      };
    }

    function layout(animate = true) {
      cards.forEach((card, index) => {
        const state = calculateState(index);
        const active = index === activeIndex;

        card.dataset.fanActive =
          active ? "true" : "false";

        card.setAttribute(
          "aria-current",
          active ? "true" : "false"
        );

        card.style.pointerEvents =
          state.opacity === 0
            ? "none"
            : "auto";

        if (gsapRef) {
          gsapRef.to(card, {
            xPercent: -50,
            yPercent: -50,

            x: state.x,
            y: state.y,

            rotation: state.rotation,
            scale: state.scale,

            opacity: state.opacity,

            filter:
              `brightness(${state.brightness}) ` +
              `saturate(${state.saturation})`,

            zIndex: state.zIndex,

            transformOrigin: "50% 118%",

            duration:
              !animate || reducedMotion
                ? 0
                : 0.72,

            ease: "power3.out",

            overwrite: true
          });
        } else {
          card.style.zIndex =
            String(state.zIndex);

          card.style.opacity =
            String(state.opacity);

          card.style.filter =
            `brightness(${state.brightness}) ` +
            `saturate(${state.saturation})`;

          card.style.transition =
            reducedMotion || !animate
              ? "none"
              : "transform .72s cubic-bezier(.22,.61,.36,1), opacity .5s ease, filter .5s ease";

          card.style.transform =
            `translate(-50%, -50%) ` +
            `translate3d(${state.x}px, ${state.y}px, 0) ` +
            `rotate(${state.rotation}deg) ` +
            `scale(${state.scale})`;
        }
      });
    }

    function setActive(index, animate = true) {
      const next = clamp(
        index,
        0,
        cards.length - 1
      );

      if (
        next === activeIndex &&
        animate
      ) {
        return;
      }

      activeIndex = next;

      layout(animate);
    }

    cards.forEach((card, index) => {
      card.dataset.fanIndex = String(index);

      card.addEventListener(
        "click",
        (event) => {
          if (moved) return;

          if (
            event.target.closest(
              "button, a, input, select, textarea, video"
            )
          ) {
            return;
          }

          if (index !== activeIndex) {
            setActive(index);
          }
        }
      );
    });

    rail.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.target.closest(
            "button, a, input, select, textarea"
          )
        ) {
          return;
        }

        pointerId = event.pointerId;

        pointerStartX = event.clientX;
        pointerStartY = event.clientY;

        dragging = true;
        moved = false;

        rail.classList.add("is-dragging");

        try {
          rail.setPointerCapture(pointerId);
        } catch (_) {}
      }
    );

    rail.addEventListener(
      "pointermove",
      (event) => {
        if (
          !dragging ||
          event.pointerId !== pointerId
        ) {
          return;
        }

        const dx =
          event.clientX - pointerStartX;

        const dy =
          event.clientY - pointerStartY;

        if (
          Math.abs(dx) > 10 &&
          Math.abs(dx) > Math.abs(dy)
        ) {
          moved = true;
        }
      }
    );

    function endPointer(event) {
      if (
        !dragging ||
        (
          event.pointerId !== undefined &&
          pointerId !== null &&
          event.pointerId !== pointerId
        )
      ) {
        return;
      }

      const dx =
        event.clientX - pointerStartX;

      const dy =
        event.clientY - pointerStartY;

      dragging = false;

      rail.classList.remove("is-dragging");

      try {
        if (pointerId !== null) {
          rail.releasePointerCapture(pointerId);
        }
      } catch (_) {}

      pointerId = null;

      if (
        Math.abs(dx) > 52 &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        if (dx < 0) {
          setActive(activeIndex + 1);
        } else {
          setActive(activeIndex - 1);
        }
      }

      window.setTimeout(() => {
        moved = false;
      }, 40);
    }

    rail.addEventListener(
      "pointerup",
      endPointer
    );

    rail.addEventListener(
      "pointercancel",
      endPointer
    );

    /*
      Wheel navigation:
      - while there is another card, wheel moves through cards
      - at the first/last card, normal page scroll is released
      - therefore the user never gets trapped inside the section
    */
    rail.addEventListener(
      "wheel",
      (event) => {
        const now = performance.now();

        if (now - lastWheelAt < 430) {
          return;
        }

        const horizontal =
          Math.abs(event.deltaX) >
          Math.abs(event.deltaY);

        const delta = horizontal
          ? event.deltaX
          : event.deltaY;

        if (Math.abs(delta) < 12) return;

        const direction =
          delta > 0 ? 1 : -1;

        const next =
          activeIndex + direction;

        const canMove =
          next >= 0 &&
          next < cards.length;

        if (!canMove) {
          return;
        }

        event.preventDefault();

        lastWheelAt = now;

        setActive(next);
      },
      {
        passive: false
      }
    );

    rail.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "ArrowRight"
        ) {
          event.preventDefault();

          setActive(
            activeIndex + 1
          );
        }

        if (
          event.key === "ArrowLeft"
        ) {
          event.preventDefault();

          setActive(
            activeIndex - 1
          );
        }
      }
    );

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(
          resizeTimer
        );

        resizeTimer =
          window.setTimeout(() => {
            layout(false);

            if (
              scrollTriggerRef &&
              typeof scrollTriggerRef.refresh ===
                "function"
            ) {
              scrollTriggerRef.refresh();
            }
          }, 120);
      },
      {
        passive: true
      }
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        layout(false);

        if (
          scrollTriggerRef &&
          typeof scrollTriggerRef.refresh ===
            "function"
        ) {
          scrollTriggerRef.refresh();
        }
      });
    });

    return true;
  }

  function boot() {
    if (startFanDeck()) return;

    const observer =
      new MutationObserver(() => {
        if (startFanDeck()) {
          observer.disconnect();
        }
      });

    observer.observe(rail, {
      childList: true,
      subtree: true
    });

    window.setTimeout(() => {
      observer.disconnect();
    }, 12000);
  }

  if (
    document.readyState === "complete"
  ) {
    window.setTimeout(boot, 0);
  } else {
    window.addEventListener(
      "load",
      boot,
      {
        once: true
      }
    );
  }
})();