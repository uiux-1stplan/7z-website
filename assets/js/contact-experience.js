(() => {
  "use strict";
  const page = document.querySelector(".contact-experience");
  if (!page) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = [...page.querySelectorAll("[data-contact-reveal]")];
  if (!reduceMotion && "IntersectionObserver" in window) {
    page.classList.add("has-contact-motion");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -7% 0px" });
    revealTargets.forEach((target) => observer.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  }

  const form = page.querySelector("#projectInquiryForm");
  const bar = page.querySelector("[data-contact-progress]");
  const progress = bar?.closest('[role="progressbar"]');
  const label = page.querySelector("[data-contact-progress-label]");
  if (form && bar && progress) {
    const requiredFields = [...form.querySelectorAll("input[required],textarea[required]")];
    const updateProgress = () => {
      const complete = requiredFields.filter((field) => field.value.trim() && field.validity.valid).length;
      const percent = Math.round((1 + complete) / (1 + requiredFields.length) * 100);
      bar.style.width = `${percent}%`;
      progress.setAttribute("aria-valuenow", String(percent));
      if (label) label.textContent = percent === 100 ? "Ready to open your draft" : "Brief in progress";
    };
    form.addEventListener("input", updateProgress);
    form.addEventListener("change", updateProgress);
    updateProgress();
  }

  const hero = page.querySelector(".contact-hero");
  if (hero && !reduceMotion && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    let frame = 0;
    hero.addEventListener("pointermove", (event) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
        hero.style.setProperty("--contact-pointer-x", `${x}%`);
        hero.style.setProperty("--contact-pointer-y", `${y}%`);
        frame = 0;
      });
    }, { passive: true });
  }
})();
