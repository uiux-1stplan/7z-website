(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealNodes = [
    document.querySelector(".hero-copy"),
    document.querySelector(".hero-status"),
    ...document.querySelectorAll(".resource-card"),
    document.querySelector(".scope-note"),
    document.querySelector(".hub-footer")
  ].filter(Boolean);

  revealNodes.forEach((node, index) => {
    node.classList.add("reveal-item");
    node.style.transitionDelay = `${Math.min(index * 55, 330)}ms`;
  });

  requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
  });

  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-resource]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "50%");
      });
    });
  }
})();