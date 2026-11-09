(() => {
  "use strict";
  const page = document.querySelector(".founders-story");
  if (!page) return;

  const targets = [...page.querySelectorAll("[data-founder-reveal]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  page.classList.add("has-reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

  targets.forEach((target) => observer.observe(target));
})();
