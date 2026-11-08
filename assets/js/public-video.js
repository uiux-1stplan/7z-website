(() => {
  "use strict";
  const root = document.documentElement;
  if (!root.hasAttribute("data-z7-core") || document.querySelector(".z7-home,.z7-services-page")) return;
  const videos = [...document.querySelectorAll("video")];
  const ensureButton = video => {
    video.removeAttribute("controls");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    const host = video.parentElement;
    if (!host || host.querySelector("[data-video-mute]")) return;
    host.classList.add("z7-video-host");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "z7-video-mute";
    button.dataset.videoMute = "";
    button.setAttribute("aria-label", "Unmute video");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"/></svg><span>Sound off</span>';
    host.append(button);
  };
  videos.forEach(ensureButton);
  const source = video => {
    if (!video.src && video.dataset.src) { video.src = video.dataset.src; video.load(); }
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting && !navigator.connection?.saveData) source(entry.target);
    }), { rootMargin: "160px", threshold: .05 });
    videos.forEach(video => observer.observe(video));
    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  } else videos.forEach(source);
  document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-video-mute]");
    if (!button) return;
    const video = button.parentElement?.querySelector("video");
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted) video.volume = .7;
    button.setAttribute("aria-pressed", String(!video.muted));
    button.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
    const text = button.querySelector("span");
    if (text) text.textContent = video.muted ? "Sound off" : "Sound on";
    button.querySelector("svg")?.classList.toggle("is-muted", video.muted);
  });
})();
