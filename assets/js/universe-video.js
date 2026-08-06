(() => {
  "use strict";

  const card = document.querySelector("#universe .manifest__media--cinema");
  if (!card || card.dataset.cinemaReady === "true") return;

  card.dataset.cinemaReady = "true";

  const button = card.querySelector("[data-inline-video]");
  const video = card.querySelector("video");

  if (!button || !video) return;

  // The poster behaves like a real video surface: clicking anywhere starts it.
  card.addEventListener("click", (event) => {
    if (event.target.closest("[data-inline-video]")) return;
    if (card.classList.contains("is-playing")) return;
    button.click();
  });

  video.addEventListener("play", () => {
    card.classList.add("is-playing");
  });

  video.addEventListener("ended", () => {
    card.classList.remove("is-playing");
  });

  video.addEventListener("pause", () => {
    if (video.ended) return;

    window.setTimeout(() => {
      if (video.paused) {
        card.classList.remove("is-playing");
        const label = button.querySelector("span");
        if (label) label.textContent = "Play Film";
        button.setAttribute("aria-label", "Play featured film");
      }
    }, 0);
  });
})();
