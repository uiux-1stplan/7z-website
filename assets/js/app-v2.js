(() => {
  "use strict";
  const root = document.documentElement;
  const loaded = new Set();
  const themeStorageKey = "z7-theme";
  const themeAttribute = "data-theme";

  function restoreThemePreference() {
    try {
      const savedTheme = localStorage.getItem(themeStorageKey) || localStorage.getItem("7z-course-theme");
      if (!root.hasAttribute(themeAttribute) && (savedTheme === "light" || savedTheme === "dark")) {
        root.setAttribute(themeAttribute, savedTheme);
      }
    } catch {}
  }

  function hasMotionStack() {
    return Boolean(window.Lenis && window.gsap && window.ScrollTrigger);
  }

  function script(src) {
    if (loaded.has(src)) return Promise.resolve();
    loaded.add(src);
    return new Promise((resolve, reject) => {
      const node = document.createElement("script");
      node.src = src;
      node.async = false;
      node.onload = resolve;
      node.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.append(node);
    });
  }

  async function loadPageSystems() {
    if (root.hasAttribute("data-z7-core")) {
      await script("/assets/vendor/gsap.min.js");
      await script("/assets/vendor/ScrollTrigger.min.js");
      await script("/assets/vendor/lenis.min.js");
      if (root.hasAttribute("data-academy-ui")) await script("/assets/js/academy-course.js?v=20261103-4");
      if (root.dataset.z7Visual === "spatial") await script("/assets/js/home-content.js");
      if (root.dataset.z7Visual !== "spatial") await script("/assets/js/public-video.js");
      await script("/assets/js/core-motion.js");
      root.dataset.z7MotionState = hasMotionStack() ? "ready" : "native-fallback";
    }
    await script("/assets/js/site-theme.js");
  }

  function bindSpotlight() {
    document.querySelectorAll("[data-z7-depth-card],.website-work,.media-tile,.service-card,.studio-card,.home-founder,.home-partner,.z7p-partner,.z7pa-card,.z7x-contact-panel,.academy-admin-course").forEach(card => {
      card.addEventListener("pointermove", event => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  }

  restoreThemePreference();
  loadPageSystems().then(bindSpotlight).catch(error => {
    console.error("7Z site systems could not be initialized.", error);
  });
})();
