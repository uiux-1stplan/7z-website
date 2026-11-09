(() => {
  const root = document.querySelector(".z7-services-page");
  if (!root) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const progress = document.createElement("div");
  progress.className = "svc-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<span></span>";
  document.body.append(progress);
  const progressLine = progress.firstElementChild;
  let progressQueued = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressLine.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    progressQueued = false;
  };
  addEventListener("scroll", () => {
    if (!progressQueued) { progressQueued = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  const revealItems = root.querySelectorAll(".svc-index,.svc-chapter__head,.svc-service-list,.svc-gallery-head,.svc-film-lane,.svc-brand-grid,.svc-method__intro,.svc-method ol,.svc-cta");
  if (reduced || !("IntersectionObserver" in window)) revealItems.forEach(item => item.classList.add("is-visible"));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }), { threshold: .1, rootMargin: "0px 0px -5% 0px" });
    revealItems.forEach((item, index) => {
      item.classList.add("svc-reveal");
      item.style.transitionDelay = `${(index % 3) * 45}ms`;
      observer.observe(item);
    });
  }

  const indexLinks = [...root.querySelectorAll('.svc-index a[href^="#"]')];
  if ("IntersectionObserver" in window) {
    const activeObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      indexLinks.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }), { rootMargin: "-34% 0px -56% 0px" });
    root.querySelectorAll(".svc-chapter[id]").forEach(section => activeObserver.observe(section));
  }

  const projects = [
    ["Ercan", "ercan-desktop.mp4", "ercan-desktop.webp"],
    ["SCMC", "scmc-desktop-2.mp4", "scmc-desktop-2.webp"],
    ["Elcon", "elcon-desktop.mp4", "elcon-desktop.webp"]
  ];
  const digitalRail = root.querySelector("#digitalRail");
  if (digitalRail) projects.forEach(([name, videoFile, posterFile]) => {
    const tile = document.createElement("article");
    tile.className = "media-tile";
    const video = document.createElement("video");
    video.src = `/media/website-portfolio/${videoFile}`;
    video.poster = `/media/website-portfolio/${posterFile}`;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-label", `${name} digital experience preview`);
    const title = document.createElement("span");
    title.textContent = `${name} / DIGITAL EXPERIENCE`;
    tile.append(video, title);
    digitalRail.append(tile);
  });

  const campaignRail = root.querySelector("#mediaRail");
  const current = root.querySelector("[data-reel-current]");
  const updateReelIndex = () => {
    if (!campaignRail || !current) return;
    const first = campaignRail.querySelector(":scope > .media-tile");
    if (!first) return;
    const gap = parseFloat(getComputedStyle(campaignRail).gap) || 0;
    const step = first.getBoundingClientRect().width + gap;
    current.textContent = String(Math.min(12, Math.floor(campaignRail.scrollLeft / step) + 1)).padStart(2, "0");
  };
  campaignRail?.addEventListener("scroll", updateReelIndex, { passive: true });
  if (campaignRail && "MutationObserver" in window) {
    new MutationObserver(updateReelIndex).observe(campaignRail, { childList: true });
  }
  root.querySelectorAll("[data-reel-prev],[data-reel-next]").forEach(button => button.addEventListener("click", () => {
    const rail = root.querySelector(`#${button.dataset.reelPrev || button.dataset.reelNext}`);
    if (!rail) return;
    const direction = button.hasAttribute("data-reel-next") ? 1 : -1;
    rail.scrollBy({ left: direction * rail.clientWidth * .78, behavior: reduced ? "auto" : "smooth" });
  }));
})();
