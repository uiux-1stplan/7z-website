/* 7Z MAGIC — INDIVIDUAL FOUNDER PROFILE COLOR REVEAL V21 */
(() => {
  "use strict";

  if (window.__Z7_FOUNDER_PROFILE_REVEAL_V21__) return;
  window.__Z7_FOUNDER_PROFILE_REVEAL_V21__ = true;

  const mediaItems = Array.from(
    document.querySelectorAll(
      ".z7x-founder-profile__media:has(img[data-z7-founder-profile-photo])"
    )
  );

  if (!mediaItems.length) return;

  const touchMode = () =>
    window.matchMedia(
      "(hover: none), (pointer: coarse), (max-width: 760px)"
    ).matches;

  let observer = null;

  const clear = () => {
    mediaItems.forEach((item) => {
      item.classList.remove("z7-profile-in-view");
    });
  };

  const activateObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    clear();

    if (!touchMode()) return;

    if (!("IntersectionObserver" in window)) {
      /* Conservative fallback for older mobile browsers. */
      mediaItems.forEach((item) => {
        item.classList.add("z7-profile-in-view");
      });
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          /*
            Color arrives when the profile has meaningfully entered
            the viewport, not as soon as one pixel appears.
          */
          const active =
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.32;

          entry.target.classList.toggle(
            "z7-profile-in-view",
            active
          );
        });
      },
      {
        threshold: [0, 0.18, 0.32, 0.46, 0.62],
        rootMargin: "-10% 0px -18% 0px"
      }
    );

    mediaItems.forEach((item) => observer.observe(item));
  };

  activateObserver();

  let resizeTimer = 0;

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(activateObserver, 160);
    },
    { passive: true }
  );

  window.addEventListener(
    "pagehide",
    () => {
      window.clearTimeout(resizeTimer);

      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
    { once: true }
  );
})();