(() => {
  const root = document.querySelector(".z7-services-page");
  if (!root) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = document.createElement("div");
  progress.className = "svc-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<span></span>";
  document.body.append(progress);
  const bar = progress.firstElementChild;
  let queued = false;
  const paintProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    queued = false;
  };
  addEventListener("scroll", () => {
    if (!queued) { queued = true; requestAnimationFrame(paintProgress); }
  }, { passive: true });
  paintProgress();

  const reveals = root.querySelectorAll(".svc-section-head,.svc-chapter__head,.svc-architecture__grid,.svc-production__intro,.svc-production__visual,.svc-digital__stage,.svc-identity-card,.svc-method__title,.svc-method__steps li,.svc-cta");
  if (reduced || !("IntersectionObserver" in window)) reveals.forEach(node => node.classList.add("is-visible"));
  else {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }), { threshold: .12, rootMargin: "0px 0px -5% 0px" });
    reveals.forEach((node, index) => {
      node.classList.add("svc-reveal");
      node.style.transitionDelay = `${Math.min(index % 4, 3) * 45}ms`;
      revealObserver.observe(node);
    });
  }

  const links = [...root.querySelectorAll('.svc-index a[href^="#"]')];
  if ("IntersectionObserver" in window) {
    const activeObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        const active = link.hash === `#${entry.target.id}`;
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }), { rootMargin: "-35% 0px -55% 0px" });
    root.querySelectorAll(".svc-chapter[id]").forEach(section => activeObserver.observe(section));
  }

  const studies = {
    interior: ["INTERIOR / LIGHT & MATERIAL", "One place.<br>Many possibilities.", "Explore how light, material and proportion can change the way a space feels before it exists."],
    exterior: ["EXTERIOR / FORM & CONTEXT", "A landmark,<br>in its element.", "Test massing, facade, landscape and daylight together to understand how a project belongs to its setting."],
    transform: ["TRANSFORMATION / BEFORE THE BUILD", "See the shift<br>before it happens.", "Compare design directions early, align the team and make the intended outcome clear to every stakeholder."]
  };
  const blueprint = root.querySelector(".svc-blueprint");
  root.querySelectorAll("[data-space-mode]").forEach(button => button.addEventListener("click", () => {
    const [label, title, copy] = studies[button.dataset.spaceMode];
    blueprint.dataset.spaceScene = button.dataset.spaceMode;
    root.querySelector("[data-space-label]").textContent = label;
    root.querySelector(".svc-blueprint__meta > b").innerHTML = title;
    root.querySelector("[data-space-copy]").textContent = copy;
    root.querySelectorAll("[data-space-mode]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  }));

  const projectList = [
    ["Ercan", "ercan-desktop.mp4", "ercan-desktop.webp", "Desktop experience"],
    ["Ercan", "ercan-mobile.mp4", "ercan-mobile.webp", "Mobile experience"],
    ["SCMC", "scmc-desktop-2.mp4", "scmc-desktop-2.webp", "Desktop experience"],
    ["SCMC", "scmc-mobile.mp4", "scmc-mobile.webp", "Mobile experience"],
    ["Elcon", "elcon-desktop.mp4", "elcon-desktop.webp", "Desktop experience"],
    ["Elcon", "elcon-mobile.mp4", "elcon-mobile.webp", "Mobile experience"]
  ];
  const rail = root.querySelector("#digitalRail");
  if (rail) {
    for (const [project, file, poster, view] of projectList) {
      const tile = document.createElement("article");
      tile.className = "media-tile";
      const video = document.createElement("video");
      video.src = `/media/website-portfolio/${file}`;
      video.poster = `/media/website-portfolio/${poster}`;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("aria-label", `${project} ${view} website showcase`);
      const caption = document.createElement("span");
      caption.textContent = `${project} / ${view}`;
      const toggle = document.createElement("button");
      toggle.className = "svc-media-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-label", `Pause ${project} ${view} preview`);
      toggle.setAttribute("aria-pressed", "false");
      toggle.textContent = "Ⅱ";
      toggle.addEventListener("click", () => {
        if (video.paused) {
          video.play().catch(() => {});
          toggle.textContent = "Ⅱ";
          toggle.setAttribute("aria-label", `Pause ${project} ${view} preview`);
          toggle.setAttribute("aria-pressed", "false");
        } else {
          video.pause();
          toggle.textContent = "▶";
          toggle.setAttribute("aria-label", `Play ${project} ${view} preview`);
          toggle.setAttribute("aria-pressed", "true");
        }
      });
      tile.append(video, caption, toggle);
      rail.append(tile);
    }
    if (!reduced && "IntersectionObserver" in window) {
      const mediaObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && document.visibilityState === "visible") video.play().catch(() => {});
        else video.pause();
      }), { rootMargin: "100px 0px", threshold: .15 });
      rail.querySelectorAll("video").forEach(video => mediaObserver.observe(video));
    }
  }

  if (!reduced && matchMedia("(pointer:fine)").matches) {
    const stage = root.querySelector(".svc-browser");
    stage?.addEventListener("pointermove", event => {
      const box = stage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - .5;
      const y = (event.clientY - box.top) / box.height - .5;
      stage.style.transform = `perspective(1000px) rotateX(${y * -3}deg) rotateY(${x * 4}deg)`;
    }, { passive:true });
    stage?.addEventListener("pointerleave", () => { stage.style.transform = ""; });
  }
})();
