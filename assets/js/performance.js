(() => {
  "use strict";

  if (window.__Z7_ROOT_PERF_V6__) return;
  window.__Z7_ROOT_PERF_V6__ = true;

  const hardReveal = () => {
    const loader = document.querySelector("#loader");
    const progressBar = document.querySelector("#loaderProgress");
    const count = document.querySelector("#loaderCount");

    if (progressBar) progressBar.style.width = "100%";
    if (count) count.textContent = "100";

    if (loader) {
      loader.style.transition = "opacity 0.32s ease, visibility 0.32s ease";
      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
      loader.style.pointerEvents = "none";
      window.setTimeout(() => {
        loader.style.display = "none";
      }, 360);
    }

    document.body.classList.remove("is-loading");

    document.querySelectorAll(".reveal").forEach((element) => {
      element.style.opacity = "1";
      element.style.visibility = "visible";
      element.style.transform = "none";
      element.style.filter = "none";
    });

    const introVideo = document.querySelector("#introVideo");
    if (introVideo && introVideo.paused) {
      introVideo.muted = true;
      introVideo.play().catch(() => {});
    }
  };

  // Absolute UX safety net. A visitor must never be trapped on the loader.
  window.setTimeout(() => {
    const loader = document.querySelector("#loader");
    if (!loader) return;

    const style = getComputedStyle(loader);
    const stillVisible =
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number.parseFloat(style.opacity || "1") > 0.01;

    if (stillVisible) hardReveal();
  }, 2600);

  const tuneImages = () => {
    document.querySelectorAll("main img").forEach((image) => {
      const rect = image.getBoundingClientRect();
      if (rect.top > window.innerHeight * 1.25) {
        if (!image.hasAttribute("loading")) image.loading = "lazy";
        if (!image.hasAttribute("decoding")) image.decoding = "async";
      }
    });
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(tuneImages, { timeout: 1600 });
  } else {
    window.setTimeout(tuneImages, 700);
  }
})();
