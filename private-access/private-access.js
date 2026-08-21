(() => {
  "use strict";

  // Hub-specific behavior only.
  // Header, footer, route transition, responsive navigation, magnetic effects,
  // content protection and blueprint access remain owned by the shared site JS.

  document.querySelectorAll(".z7pa-card").forEach((card) => {
    card.addEventListener("pointerenter", () => {
      card.dataset.hovered = "true";
    });
    card.addEventListener("pointerleave", () => {
      delete card.dataset.hovered;
    });
  });
})();