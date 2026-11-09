(() => {
  "use strict";

  const root = document.documentElement;
  const abort = new AbortController();
  const loaded = new Set();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const desktopPointer = matchMedia("(min-width: 768px) and (pointer: fine)");
  const themeStorageKey = "z7-theme";
  let heroFrame = 0;
  let canvasFrame = 0;
  let filmTriggers = [];
  let live = true;

  function restoreThemePreference() {
    try {
      const saved = localStorage.getItem(themeStorageKey) || localStorage.getItem("7z-course-theme");
      if (!root.hasAttribute("data-theme") && (saved === "light" || saved === "dark")) root.setAttribute("data-theme", saved);
      if (!root.hasAttribute("data-theme")) root.setAttribute("data-theme", "dark");
    } catch {
      if (!root.hasAttribute("data-theme")) root.setAttribute("data-theme", "dark");
    }
  }

  function loadScript(src) {
    if (loaded.has(src)) return Promise.resolve();
    loaded.add(src);
    return new Promise((resolve, reject) => {
      const node = document.createElement("script");
      node.src = src;
      node.async = false;
      node.onload = resolve;
      node.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.append(node);
    });
  }

  async function loadPageSystems() {
    if (root.hasAttribute("data-z7-core")) {
      await loadScript("/assets/vendor/gsap.min.js");
      await loadScript("/assets/vendor/ScrollTrigger.min.js");
      await loadScript("/assets/vendor/lenis.min.js");
      if (root.hasAttribute("data-academy-ui")) await loadScript("/assets/js/academy-course.js?v=20261103-4");
      if (root.dataset.z7Visual === "spatial") await loadScript("/assets/js/home-content.js");
      else await loadScript("/assets/js/public-video.js");
      await loadScript("/assets/js/core-motion.js");
      root.dataset.z7MotionState = window.gsap && window.ScrollTrigger && window.Lenis ? "ready" : "native-fallback";
    }
    await loadScript("/assets/js/site-theme.js");
    startVisibleInteractions();
  }

  function startVisibleInteractions() {
    bindThemePersistence();
    bindSpotlights();
    bindVideoPolicy();
    bindHeroStage();
    buildFilmLanes();
    animateFilmLanes();
  }

  function bindThemePersistence() {
    document.querySelectorAll("[data-theme-toggle],#theme").forEach(button => {
      if (button.dataset.z7ThemePersisted) return;
      button.dataset.z7ThemePersisted = "true";
      button.addEventListener("click", () => {
        requestAnimationFrame(() => {
          const theme = root.getAttribute("data-theme");
          if (theme === "light" || theme === "dark") {
            try { localStorage.setItem(themeStorageKey, theme); } catch {}
          }
        });
      }, { signal: abort.signal });
    });
  }

  function bindSpotlights() {
    const selector = [
      "[data-z7-depth-card]", ".website-work", ".media-tile", ".service-card", ".studio-card",
      ".home-founder", ".home-partner", ".z7p-partner", ".z7pa-card", ".z7x-contact-panel",
      ".academy-admin-course", ".z7x-card", ".partner-card", ".founder-card", ".service-preview"
    ].join(",");
    document.querySelectorAll(selector).forEach(surface => {
      surface.classList.add("z7-spotlight-surface");
      surface.addEventListener("pointermove", event => {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        surface.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
      }, { passive: true, signal: abort.signal });
    });
  }

  function bindVideoPolicy() {
    const enforce = video => {
      video.controls = false;
      video.removeAttribute("controls");
      video.autoplay = true;
      video.loop = true;
      video.muted = video.dataset.z7SoundOn !== "true";
      video.playsInline = true;
      video.setAttribute("autoplay", "");
      video.setAttribute("loop", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      if (!video.dataset.z7PlayBound) {
        video.dataset.z7PlayBound = "true";
        const play = () => {
          if (!document.hidden && video.getClientRects().length && !navigator.connection?.saveData) video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
        };
        if ("IntersectionObserver" in window) {
          const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { play(); observer.disconnect(); } }), { rootMargin: "180px", threshold: .04 });
          observer.observe(video);
        } else play();
      }
    };
    document.querySelectorAll("video").forEach(enforce);
    const mutation = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches?.("video")) enforce(node);
      node.querySelectorAll?.("video").forEach(enforce);
    })));
    mutation.observe(document.body, { childList: true, subtree: true });
    abort.signal.addEventListener("abort", () => mutation.disconnect(), { once: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) document.querySelectorAll("video[autoplay]").forEach(video => video.play().catch(() => {}));
    }, { signal: abort.signal });
  }

  function initConstellation() {
    const canvas = document.getElementById("hero-constellation");
    const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    const hero = canvas?.closest(".logo-hero");
    if (!canvas || !context || !hero) return;
    const state = { width: 0, height: 0, ratio: 1, pointerX: .5, pointerY: .42, targetX: .5, targetY: .42, points: [], scroll: 0, lastScroll: scrollY, time: 0, lastPaint: 0 };
    const resize = () => {
      const rect = hero.getBoundingClientRect();
      state.width = rect.width;
      state.height = rect.height;
      state.ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(state.width * state.ratio);
      canvas.height = Math.round(state.height * state.ratio);
      context.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
      const cols = Math.max(8, Math.floor(state.width / 88));
      const rows = Math.max(6, Math.floor(state.height / 82));
      state.points = [];
      for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
        state.points.push({ x: (col / cols) * state.width, y: (row / rows) * state.height, phase: Math.random() * Math.PI * 2, energy: .3 + Math.random() * .7 });
      }
      paint(performance.now(), true);
    };
    const pointer = event => {
      const rect = hero.getBoundingClientRect();
      state.targetX = (event.clientX - rect.left) / Math.max(1, rect.width);
      state.targetY = (event.clientY - rect.top) / Math.max(1, rect.height);
    };
    const onScroll = () => {
      const next = scrollY;
      state.scroll = Math.max(-42, Math.min(42, next - state.lastScroll));
      state.lastScroll = next;
    };
    function paint(now, force = false) {
      canvasFrame = 0;
      if (!live || document.hidden) return;
      if (!force && now - state.lastPaint < 28) { canvasFrame = requestAnimationFrame(paint); return; }
      const delta = Math.min(42, now - (state.lastPaint || now));
      state.lastPaint = now;
      state.time += delta * .00032;
      state.pointerX += (state.targetX - state.pointerX) * .055;
      state.pointerY += (state.targetY - state.pointerY) * .055;
      state.scroll *= .84;
      const { width, height } = state;
      context.clearRect(0, 0, width, height);
      const mx = state.pointerX * width, my = state.pointerY * height - state.scroll * .9;
      const radius = Math.max(230, Math.min(width, height) * .42);
      const glow = context.createRadialGradient(mx, my, 0, mx, my, radius);
      glow.addColorStop(0, "rgba(79,140,255,.18)");
      glow.addColorStop(.45, "rgba(79,140,255,.06)");
      glow.addColorStop(1, "rgba(79,140,255,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      const points = state.points;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const dx = mx - point.x, dy = my - point.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const influence = Math.max(0, 1 - distance / radius);
        const pulse = .5 + Math.sin(state.time + point.phase) * .5;
        const bend = influence * 18;
        const px = point.x + (dx / distance) * bend + Math.sin(state.time + point.phase) * 2;
        const py = point.y + (dy / distance) * bend + Math.cos(state.time * .8 + point.phase) * 2 - state.scroll * influence * .12;
        const alpha = .12 + influence * .55 + pulse * .08;
        context.fillStyle = `rgba(154,190,255,${alpha * point.energy})`;
        context.beginPath();
        context.arc(px, py, 1 + influence * 1.35, 0, Math.PI * 2);
        context.fill();
        if (i % 3 === 0) {
          let nearest = -1, nearestDistance = 120;
          for (let j = i + 1; j < Math.min(points.length, i + 9); j++) {
            const other = points[j];
            const d = Math.hypot(other.x - point.x, other.y - point.y);
            if (d < nearestDistance) { nearestDistance = d; nearest = j; }
          }
          if (nearest >= 0 && (influence > .16 || pulse > .93)) {
            const other = points[nearest];
            context.beginPath();
            context.moveTo(px, py);
            context.lineTo(other.x + Math.sin(state.time + other.phase) * 2, other.y + Math.cos(state.time + other.phase) * 2);
            context.strokeStyle = `rgba(112,164,255,${.025 + influence * .12})`;
            context.lineWidth = .7;
            context.stroke();
          }
        }
      }
      if (!reducedMotion.matches) canvasFrame = requestAnimationFrame(paint);
    }
    hero.addEventListener("pointermove", pointer, { passive: true, signal: abort.signal });
    window.addEventListener("scroll", onScroll, { passive: true, signal: abort.signal });
    window.addEventListener("resize", resize, { passive: true, signal: abort.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && canvasFrame) { cancelAnimationFrame(canvasFrame); canvasFrame = 0; }
      else if (!reducedMotion.matches && !canvasFrame) canvasFrame = requestAnimationFrame(paint);
    }, { signal: abort.signal });
    resize();
    if (reducedMotion.matches) paint(performance.now(), true);
  }

  function bindHeroStage() {
    const hero = document.querySelector(".logo-hero");
    const stage = hero?.querySelector(".logo-hero__stage");
    const reel = hero?.querySelector(".logo-hero__reel");
    if (!hero || !stage || !reel) return;
    initConstellation();
    const cards = [...reel.querySelectorAll("[data-hero-bento]")];
    let tiltX = null, tiltY = null;
    const gsap = window.gsap;
    const pointerFine = desktopPointer.matches && !reducedMotion.matches;
    if (gsap && pointerFine) {
      tiltX = gsap.quickTo(reel, "rotationX", { duration: .55, ease: "power3.out" });
      tiltY = gsap.quickTo(reel, "rotationY", { duration: .55, ease: "power3.out" });
    }
    hero.addEventListener("pointermove", event => {
      if (!desktopPointer.matches || reducedMotion.matches) return;
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
      const y = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
      hero.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      hero.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      hero.style.setProperty("--hero-light-x", `${50 + x * 18}%`);
      hero.style.setProperty("--hero-light-y", `${34 + y * 15}%`);
      if (tiltX) { tiltX(y * -4.2); tiltY(x * 5.2); }
      else {
        reel.style.setProperty("--reel-rx", `${y * -4.2}deg`);
        reel.style.setProperty("--reel-ry", `${x * 5.2}deg`);
      }
      const logo = hero.querySelector(".logo-hero__mark");
      if (logo) { logo.style.setProperty("--logo-x", `${x * -5}px`); logo.style.setProperty("--logo-y", `${y * -4}px`); }
    }, { passive: true, signal: abort.signal });
    hero.addEventListener("pointerleave", () => {
      if (tiltX) { tiltX(0); tiltY(0); }
      reel.style.setProperty("--reel-rx", "0deg");
      reel.style.setProperty("--reel-ry", "0deg");
    }, { signal: abort.signal });
    if (gsap && window.ScrollTrigger && !reducedMotion.matches) {
      gsap.to(reel, { y: -28, scale: .94, rotateX: 0, rotateY: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .72, invalidateOnRefresh: true } });
      cards.forEach((card, index) => {
        gsap.to(card, { y: (index - 1) * -20, x: (index - 1) * 18, scale: .92, rotateY: (index - 1) * -5, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .72, invalidateOnRefresh: true } });
      });
    }
  }

  function buildFilmLanes() {
    const rail = document.getElementById("homeVideoRail");
    if (!rail || rail.dataset.lanesReady === "true") return;
    const tiles = [...rail.querySelectorAll(":scope > .media-tile")];
    if (!tiles.length) return;
    const forward = document.createElement("div");
    const reverse = document.createElement("div");
    forward.className = "home-showcase__lane";
    reverse.className = "home-showcase__lane";
    forward.dataset.filmLane = "forward";
    reverse.dataset.filmLane = "reverse";
    tiles.forEach((tile, index) => (index % 2 ? reverse : forward).append(tile));
    rail.replaceChildren(forward, reverse);
    rail.dataset.lanesReady = "true";
  }

  function animateFilmLanes() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const viewport = document.querySelector(".home-showcase__viewport");
    const lanes = [...document.querySelectorAll("[data-film-lane]")];
    if (!gsap || !ScrollTrigger || !viewport || lanes.length < 2 || reducedMotion.matches || !desktopPointer.matches) return;
    lanes.forEach((lane, index) => {
      const direction = index === 0 ? -18 : 18;
      const tween = gsap.to(lane, { xPercent: direction, ease: "none", scrollTrigger: { trigger: viewport, start: "top bottom", end: "bottom top", scrub: .5, invalidateOnRefresh: true } });
      filmTriggers.push(tween.scrollTrigger);
    });
  }

  function teardown() {
    live = false;
    if (heroFrame) cancelAnimationFrame(heroFrame);
    if (canvasFrame) cancelAnimationFrame(canvasFrame);
    filmTriggers.forEach(trigger => trigger?.kill());
    abort.abort();
  }

  restoreThemePreference();
  loadPageSystems().catch(error => {
    root.dataset.z7MotionState = "native-fallback";
    console.error("7Z Magic interactions initialized with a fallback.", error);
    startVisibleInteractions();
  });
  window.addEventListener("pagehide", teardown, { once: true });
})();
