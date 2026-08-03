(() => {
  "use strict";

  if (!document.body.classList.contains("subpage")) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = [
    ...document.querySelectorAll("[data-z7-reveal]"),
    ...document.querySelectorAll("[data-z7-stagger] > *")
  ];

  function showAll() {
    revealItems.forEach((element) => element.classList.add("is-visible"));
  }

  if (!revealItems.length || reducedMotion || !("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  root.classList.add("z7x-motion-ready");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08
    }
  );

  revealItems.forEach((element) => observer.observe(element));

  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) showAll();
    },
    { passive: true }
  );

  window.setTimeout(() => {
    document.querySelectorAll("[data-z7-reveal]:not(.is-visible)").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.08) element.classList.add("is-visible");
    });
  }, 650);
})();
