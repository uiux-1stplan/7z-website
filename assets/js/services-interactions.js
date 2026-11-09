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
  const reelTotal = root.querySelector("[data-reel-total]");
  if (campaignRail) {
    let ring = null;
    let cards = [];
    let rotation = 0;
    let velocity = 0;
    let motionEnergy = 0.08;
    let frame = 0;
    let targetFrame = 0;
    let lastCoastTime = 0;
    let activePointer = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let moved = false;

    const modulo = (value, length) => ((value % length) + length) % length;
    const stepAngle = () => 360 / Math.max(cards.length, 1);
    const activeIndex = () => modulo(-Math.round(rotation / stepAngle()), cards.length || 1);
    const paint = () => {
      if (!ring) return;
      ring.style.setProperty("--mirror-rotation", `${rotation}deg`);
      const energy = Math.min(.82, Math.max(.08, motionEnergy, Math.abs(velocity) / 13 * .78));
      campaignRail.style.setProperty("--mirror-water-alpha", (.16 + energy * .18).toFixed(2));
      campaignRail.style.setProperty("--mirror-line-alpha", (.04 + energy * .08).toFixed(2));
      campaignRail.style.setProperty("--mirror-glow", `${34 + energy * 36}px`);
      campaignRail.style.setProperty("--mirror-ripple-shift", `${Math.sin(rotation * Math.PI / 180) * energy * 13}px`);
      const selected = activeIndex();
      cards.forEach((card, index) => {
        if (index === selected) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
      });
      if (current) current.textContent = String(selected + 1).padStart(2, "0");
    };
    const stopMotion = () => {
      if (frame) cancelAnimationFrame(frame);
      if (targetFrame) cancelAnimationFrame(targetFrame);
      frame = targetFrame = 0;
    };
    const nearestRotation = () => Math.round(rotation / stepAngle()) * stepAngle();
    const settle = () => {
      motionEnergy = .08;
      if (reduced) { rotation = nearestRotation(); paint(); return; }
      const start = rotation;
      const end = nearestRotation();
      const began = performance.now();
      const duration = 360;
      const tick = now => {
        const t = Math.min(1, (now - began) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        rotation = start + (end - start) * eased;
        paint();
        if (t < 1) targetFrame = requestAnimationFrame(tick);
        else targetFrame = 0;
      };
      targetFrame = requestAnimationFrame(tick);
    };
    const coast = now => {
      const delta = Math.min(2, Math.max(.5, (now - lastCoastTime) / 16.667));
      lastCoastTime = now;
      rotation += velocity * delta;
      velocity *= Math.pow(.94, delta);
      motionEnergy = Math.max(.08, Math.abs(velocity) / 13 * .78);
      paint();
      if (Math.abs(velocity) > .08) frame = requestAnimationFrame(coast);
      else { frame = 0; settle(); }
    };
    const goTo = target => {
      stopMotion();
      if (reduced) { rotation = target; paint(); return; }
      const start = rotation;
      const began = performance.now();
      const duration = 620;
      motionEnergy = .58;
      const tick = now => {
        const t = Math.min(1, (now - began) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        rotation = start + (target - start) * eased;
        motionEnergy = .58 * (1 - t) + .08;
        paint();
        if (t < 1) targetFrame = requestAnimationFrame(tick);
        else { targetFrame = 0; motionEnergy = .08; paint(); }
      };
      targetFrame = requestAnimationFrame(tick);
    };
    const moveByFilm = direction => {
      const nearest = nearestRotation();
      goTo(nearest - direction * stepAngle());
    };
    const resizeRing = () => {
      if (!ring || !cards.length) return;
      const cardWidth = parseFloat(getComputedStyle(cards[0]).width) || cards[0].getBoundingClientRect().width;
      const radius = Math.max(cardWidth * 1.65, cardWidth / (2 * Math.tan(Math.PI / cards.length)) * 1.15);
      ring.style.setProperty("--mirror-radius", `${radius}px`);
      paint();
    };

    const setupRing = () => {
      if (campaignRail.dataset.mirrorReady === "true") return;
      const pending = [...campaignRail.querySelectorAll(":scope > .media-tile")];
      if (!pending.length) return;

      campaignRail.dataset.mirrorReady = "true";
      ring = document.createElement("div");
      ring.className = "svc-mirror-ring";
      ring.setAttribute("role", "list");
      ring.setAttribute("aria-label", "Campaign film carousel");
      cards = pending;
      const angle = 360 / cards.length;
      cards.forEach((card, index) => {
        card.classList.remove("media-tile", "z7-spatial");
        card.classList.add("svc-mirror-card");
        card.dataset.svcMirrorCard = "true";
        card.setAttribute("role", "listitem");
        card.style.setProperty("--card-angle", `${index * angle}deg`);
        const video = card.querySelector("video");
        if (video) {
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "none";
        }
      });
      if (window.gsap?.killTweensOf) {
        window.gsap.killTweensOf(cards);
        window.gsap.set(cards, { clearProps: "transform,opacity,visibility" });
      }
      window.ScrollTrigger?.getAll?.().forEach(trigger => {
        if (cards.includes(trigger.trigger)) trigger.kill();
      });
      campaignRail.replaceChildren(ring);
      ring.append(...cards);
      if (reelTotal) reelTotal.textContent = String(cards.length).padStart(2, "0");
      resizeRing();
      if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(resizeRing);
        resizeObserver.observe(campaignRail);
      } else addEventListener("resize", resizeRing, { passive: true });
    };

    if ("MutationObserver" in window) {
      const tilesObserver = new MutationObserver(setupRing);
      tilesObserver.observe(campaignRail, { childList: true });
      setupRing();
    } else setupRing();

    campaignRail.addEventListener("pointerdown", event => {
      if (!ring || !event.isPrimary || event.button > 0 || event.target.closest("button")) return;
      stopMotion();
      activePointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastTime = performance.now();
      velocity = 0;
      moved = false;
      campaignRail.setPointerCapture?.(event.pointerId);
    });
    campaignRail.addEventListener("pointermove", event => {
      if (activePointer !== event.pointerId) return;
      const dx = event.clientX - lastX;
      const totalX = event.clientX - startX;
      const totalY = event.clientY - startY;
      const now = performance.now();
      if (!moved && Math.hypot(totalX, totalY) > 6) {
        if (Math.abs(totalY) > Math.abs(totalX) * 1.12) { activePointer = null; return; }
        moved = true;
      }
      if (moved) {
        campaignRail.classList.add("is-dragging");
        rotation += dx * .34;
        velocity = Math.max(-13, Math.min(13, dx / Math.max(1, now - lastTime) * 16 * .34));
        motionEnergy = .2 + Math.min(.58, Math.abs(velocity) / 13 * .58);
        paint();
      }
      lastX = event.clientX;
      lastTime = now;
    });
    const endDrag = event => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      campaignRail.classList.remove("is-dragging");
      if (moved && Math.abs(velocity) > .55 && !reduced) {
        lastCoastTime = performance.now();
        frame = requestAnimationFrame(coast);
      }
      else if (moved) settle();
      moved = false;
    };
    campaignRail.addEventListener("pointerup", endDrag);
    campaignRail.addEventListener("pointercancel", endDrag);
    campaignRail.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); moveByFilm(1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); moveByFilm(-1); }
    });

    root.querySelectorAll("[data-reel-prev],[data-reel-next]").forEach(button => button.addEventListener("click", () => {
      moveByFilm(button.hasAttribute("data-reel-next") ? 1 : -1);
    }));
  }
})();
