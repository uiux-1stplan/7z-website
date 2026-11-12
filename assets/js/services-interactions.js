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
  const campaignStage = campaignRail?.closest(".svc-mirror-stage");
  const current = root.querySelector("[data-reel-current]");
  const reelTotal = root.querySelector("[data-reel-total]");

  if (campaignRail) {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cards = [];
    let wheelTarget = campaignRail.scrollLeft;
    let wheelFrame = 0;
    let activePointer = null;
    let dragStart = 0;
    let dragScrollStart = 0;
    let dragged = false;

    const prepareCards = () => {
      cards = [...campaignRail.querySelectorAll(":scope > .media-tile, :scope > .svc-campaign-card")];
      cards.forEach(card => {
        card.classList.add("svc-campaign-card");
        card.setAttribute("role", "listitem");
        const video = card.querySelector("video");
        if (video) {
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "none";
        }
      });
      campaignRail.setAttribute("role", "list");
      campaignRail.setAttribute("aria-label", "Campaign film showcase");
      campaignRail.dataset.horizontalShowcase = "true";
      if (reelTotal) reelTotal.textContent = String(cards.length).padStart(2, "0");
      updateCounter();
    };
    const maxScroll = () => Math.max(0, campaignRail.scrollWidth - campaignRail.clientWidth);
    const updateCounter = () => {
      if (!cards.length || !current) return;
      const center = campaignRail.scrollLeft + campaignRail.clientWidth / 2;
      let nearest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const nextDistance = Math.abs(cardCenter - center);
        if (nextDistance < distance) { nearest = index; distance = nextDistance; }
      });
      current.textContent = String(nearest + 1).padStart(2, "0");
      cards.forEach((card, index) => {
        if (index === nearest) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
      });
    };
    const cardsObserver = new MutationObserver(prepareCards);
    cardsObserver.observe(campaignRail, { childList: true });
    prepareCards();

    const smoothTo = target => {
      wheelTarget = Math.max(0, Math.min(maxScroll(), target));
      if (reducedMotion) {
        campaignRail.scrollLeft = wheelTarget;
        updateCounter();
        return;
      }
      if (wheelFrame) return;
      const tick = () => {
        const remaining = wheelTarget - campaignRail.scrollLeft;
        if (Math.abs(remaining) < 1) {
          campaignRail.scrollLeft = wheelTarget;
          wheelFrame = 0;
          updateCounter();
          return;
        }
        campaignRail.scrollLeft += remaining * .24;
        updateCounter();
        wheelFrame = requestAnimationFrame(tick);
      };
      wheelFrame = requestAnimationFrame(tick);
    };
    const scrollToCard = direction => {
      const center = campaignRail.scrollLeft + campaignRail.clientWidth / 2;
      let nearest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const nextDistance = Math.abs(cardCenter - center);
        if (nextDistance < distance) { nearest = index; distance = nextDistance; }
      });
      const next = Math.max(0, Math.min(cards.length - 1, nearest + direction));
      const card = cards[next];
      if (card) smoothTo(card.offsetLeft - (campaignRail.clientWidth - card.offsetWidth) / 2);
    };

    campaignRail.addEventListener("scroll", updateCounter, { passive: true });
    updateCounter();

    if (campaignStage && matchMedia("(min-width: 768px) and (pointer: fine)").matches) {
      let lastWheel = 0;
      campaignStage.addEventListener("wheel", event => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || Math.abs(event.deltaY) < 2) return;
        const max = maxScroll();
        const position = wheelFrame ? wheelTarget : campaignRail.scrollLeft;
        const next = Math.max(0, Math.min(max, position + event.deltaY * .9));
        if (Math.abs(next - position) < 1) return;
        event.preventDefault();
        const now = performance.now();
        if (now - lastWheel < 10) return;
        lastWheel = now;
        smoothTo(next);
      }, { passive: false });
    }

    campaignRail.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button > 0 || event.target.closest("button,a")) return;
      activePointer = event.pointerId;
      dragStart = event.clientX;
      dragScrollStart = campaignRail.scrollLeft;
      dragged = false;
      campaignRail.setPointerCapture?.(event.pointerId);
    });
    campaignRail.addEventListener("pointermove", event => {
      if (activePointer !== event.pointerId) return;
      const delta = event.clientX - dragStart;
      if (Math.abs(delta) > 5) dragged = true;
      if (dragged) {
        campaignRail.classList.add("is-dragging");
        campaignRail.scrollLeft = dragScrollStart - delta;
        wheelTarget = campaignRail.scrollLeft;
        updateCounter();
      }
    });
    const endDrag = event => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      campaignRail.classList.remove("is-dragging");
      if (dragged) {
        const center = campaignRail.scrollLeft + campaignRail.clientWidth / 2;
        const card = cards.reduce((best, candidate) =>
          Math.abs(candidate.offsetLeft + candidate.offsetWidth / 2 - center) <
          Math.abs(best.offsetLeft + best.offsetWidth / 2 - center) ? candidate : best, cards[0]);
        if (card) smoothTo(card.offsetLeft - (campaignRail.clientWidth - card.offsetWidth) / 2);
      }
      dragged = false;
    };
    campaignRail.addEventListener("pointerup", endDrag);
    campaignRail.addEventListener("pointercancel", endDrag);
    campaignRail.addEventListener("keydown", event => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault(); scrollToCard(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault(); scrollToCard(-1);
      } else if (event.key === "Home") {
        event.preventDefault(); smoothTo(0);
      } else if (event.key === "End") {
        event.preventDefault(); smoothTo(maxScroll());
      }
    });
    root.querySelectorAll("[data-reel-prev],[data-reel-next]").forEach(button => {
      button.addEventListener("click", () => scrollToCard(button.hasAttribute("data-reel-next") ? 1 : -1));
    });
    addEventListener("resize", () => {
      wheelTarget = Math.max(0, Math.min(maxScroll(), campaignRail.scrollLeft));
      updateCounter();
    }, { passive: true });
  }
})();
