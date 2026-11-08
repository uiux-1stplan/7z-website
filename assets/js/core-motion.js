(() => {
  "use strict";
  const root = document.documentElement;
  if (!root.hasAttribute("data-z7-core")) return;

  const KEY = "z7:core-arrival:v1";
  const ROUTES = new Set(["/", "/services", "/about", "/founders", "/partners", "/contact", "/courses", "/courses/ai-engineering", "/websites"]);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width: 1381px) and (pointer: fine)");
  const compact = matchMedia("(max-width: 1380px)");
  const lowData = Boolean(navigator.connection?.saveData);
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const Lenis = window.Lenis;
  let live = null;
  if (gsap && ST) gsap.registerPlugin(ST);

  const pathOf = url => url.pathname.replace(/\/+$/, "") || "/";
  const labelFor = url => ({
    "/": "Home", "/about": "About", "/founders": "Founders", "/partners": "Partners",
    "/contact": "Contact", "/services": "Services", "/courses": "7Z Academy", "/courses/ai-engineering": "AI Engineering", "/websites": "Websites"
  }[pathOf(url)] || "7Z Magic");
  function timer(state, fn, delay) {
    const id = setTimeout(() => { state.timers.delete(id); fn(); }, delay);
    state.timers.add(id);
    return id;
  }
  function takeArrival() {
    try {
      const arrival = JSON.parse(sessionStorage.getItem(KEY) || "null");
      sessionStorage.removeItem(KEY);
      return arrival && arrival.path === pathOf(new URL(location.href)) && Date.now() - arrival.time < 12000;
    } catch { return false; }
  }
  function initScroll(state) {
    if (!Lenis || reduced.matches || lowData || !desktop.matches) return;
    const lenis = new Lenis({ autoRaf: false, lerp: .1, smoothWheel: true, syncTouch: false });
    state.lenis = lenis;
    if (gsap) {
      state.tick = time => lenis.raf(time * 1000);
      gsap.ticker.add(state.tick);
      gsap.ticker.lagSmoothing(0);
      if (ST) {
        state.update = () => ST.update();
        lenis.on("scroll", state.update);
      }
    } else {
      const frame = time => {
        if (state.destroyed) return;
        lenis.raf(time);
        state.raf = requestAnimationFrame(frame);
      };
      state.raf = requestAnimationFrame(frame);
    }
  }
  function refreshScroll(state) {
    if (state.destroyed) return;
    if (state.lenis && (reduced.matches || lowData || !desktop.matches)) {
      if (gsap && state.tick) gsap.ticker.remove(state.tick);
      if (state.raf) cancelAnimationFrame(state.raf);
      if (state.update) state.lenis.off("scroll", state.update);
      state.lenis.destroy();
      state.lenis = null;
      state.tick = state.update = null;
      state.raf = 0;
    } else if (!state.lenis) initScroll(state);
    ST?.refresh(true);
  }
  function initAmbientCanvas(state) {
    const canvas = document.getElementById("ambient-canvas");
    const ctx = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!canvas || !ctx) return;
    const field = { width: 0, height: 0, ratio: 1, pointerX: .5, pointerY: .42, targetX: .5, targetY: .42, scroll: 0, lastScroll: scrollY, lastTime: 0, time: 0 };
    const resize = () => {
      field.ratio = Math.min(devicePixelRatio || 1, 1.4);
      field.width = innerWidth;
      field.height = innerHeight;
      canvas.width = Math.round(field.width * field.ratio);
      canvas.height = Math.round(field.height * field.ratio);
      canvas.style.width = field.width + "px";
      canvas.style.height = field.height + "px";
      ctx.setTransform(field.ratio, 0, 0, field.ratio, 0, 0);
      draw(performance.now(), true);
    };
    const move = event => {
      field.targetX = event.clientX / Math.max(1, field.width);
      field.targetY = event.clientY / Math.max(1, field.height);
    };
    const scroll = () => {
      const next = scrollY;
      field.scroll = Math.max(-30, Math.min(30, next - field.lastScroll));
      field.lastScroll = next;
    };
    const spacing = () => field.width < 700 ? 44 : 38;
    function draw(now, force = false) {
      state.canvasRaf = 0;
      if (state.destroyed || (document.hidden && !force)) return;
      if (!force && now - field.lastTime < 32) { state.canvasRaf = requestAnimationFrame(draw); return; }
      field.lastTime = now;
      field.time += .002;
      field.pointerX += (field.targetX - field.pointerX) * .045;
      field.pointerY += (field.targetY - field.pointerY) * .045;
      field.scroll *= .88;
      const { width, height } = field;
      ctx.clearRect(0, 0, width, height);
      const cx = field.pointerX * width + Math.sin(field.time) * 14;
      const cy = field.pointerY * height - field.scroll * 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * .52);
      glow.addColorStop(0, "rgba(79,140,255,.065)");
      glow.addColorStop(.45, "rgba(112,133,155,.025)");
      glow.addColorStop(1, "rgba(9,10,12,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      const gap = spacing();
      for (let y = gap * .5; y < height; y += gap) {
        for (let x = gap * .5; x < width; x += gap) {
          const dx = x - cx, dy = y - cy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const pull = Math.max(0, 1 - distance / 230);
          const warpX = x + dx * pull * -.045;
          const warpY = y + dy * pull * -.045 - field.scroll * pull * .12;
          const alpha = .055 + pull * .12;
          ctx.fillStyle = `rgba(184,197,209,${alpha})`;
          ctx.fillRect(warpX, warpY, 1.15 + pull * .35, 1.15 + pull * .35);
        }
      }
      if (!reduced.matches) state.canvasRaf = requestAnimationFrame(draw);
    }
    state.abort.signal.addEventListener("abort", () => { if (state.canvasRaf) cancelAnimationFrame(state.canvasRaf); }, { once: true });
    state.resumeCanvas = () => { if (!reduced.matches && !document.hidden && !state.canvasRaf) state.canvasRaf = requestAnimationFrame(draw); };
    window.addEventListener("resize", resize, { passive: true, signal: state.abort.signal });
    window.addEventListener("pointermove", move, { passive: true, signal: state.abort.signal });
    window.addEventListener("scroll", scroll, { passive: true, signal: state.abort.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.canvasRaf) { cancelAnimationFrame(state.canvasRaf); state.canvasRaf = 0; }
      else if (!document.hidden && !reduced.matches && !state.canvasRaf) state.canvasRaf = requestAnimationFrame(draw);
    }, { signal: state.abort.signal });
    resize();
  }

  function setMenu(state, open) {
    if (!state.menu || !state.nav) return;
    const expanded = compact.matches && open;
    state.menu.setAttribute("aria-expanded", String(expanded));
    state.menu.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
    state.nav.classList.toggle("is-open", expanded);
    if (!expanded) closeServices(state);
  }
  function closeServices(state) {
    if (state.services) state.services.setAttribute("aria-expanded", "false");
    if (state.panel) state.panel.hidden = true;
  }
  function initNavigation(state) {
    state.menu = document.getElementById("z7MenuToggle");
    state.nav = document.getElementById("z7MainNav");
    state.services = document.getElementById("z7ServicesTrigger");
    state.panel = document.getElementById("z7ServicesPanel");
    state.menu?.addEventListener("click", () => setMenu(state, state.menu.getAttribute("aria-expanded") !== "true"), { signal: state.abort.signal });
    state.services?.addEventListener("click", () => {
      const open = state.services.getAttribute("aria-expanded") !== "true";
      state.services.setAttribute("aria-expanded", String(open));
      if (state.panel) state.panel.hidden = !open;
    }, { signal: state.abort.signal });
    document.addEventListener("click", event => {
      if (!event.target.closest(".z7-services")) closeServices(state);
      if (compact.matches && state.nav?.classList.contains("is-open") && !event.target.closest(".z7-header")) setMenu(state, false);
      const target = event.target.closest?.("a[href]");
      if (target && compact.matches && state.nav?.contains(target)) setMenu(state, false);
    }, { signal: state.abort.signal });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      const open = state.menu?.getAttribute("aria-expanded") === "true" || state.services?.getAttribute("aria-expanded") === "true";
      setMenu(state, false);
      if (open) state.menu?.focus();
    }, { signal: state.abort.signal });
    compact.addEventListener("change", () => setMenu(state, false), { signal: state.abort.signal });
  }
  function revealHero(state) {
    if (state.heroDone) return;
    state.heroDone = true;
    const nodes = [...document.querySelectorAll("[data-z7-hero-reveal]")];
    if (!nodes.length) return;
    if (!gsap || reduced.matches) {
      nodes.forEach(node => { node.style.opacity = "1"; node.style.transform = "none"; });
      return;
    }
    state.heroContext = gsap.context(() => gsap.fromTo(nodes, { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: .68, stagger: .07, ease: "power2.out"
    }));
  }
  function clearLoader(state) {
    if (!state.loader || state.loader.hidden) return;
    state.loader.hidden = true;
    state.loader.style.removeProperty("transform");
    state.loader.style.removeProperty("clip-path");
    revealHero(state);
  }
  async function preloader(state) {
    const loader = state.loader;
    if (!loader) { revealHero(state); return; }
    if (reduced.matches) { clearLoader(state); return; }
    const count = loader.querySelector("[data-z7-count]");
    const bar = loader.querySelector("[data-z7-progress]");
    const value = { n: 0 };
    const paint = () => {
      const n = Math.min(100, Math.round(value.n));
      if (count) count.textContent = String(n).padStart(2, "0");
      if (bar) bar.style.width = n + "%";
    };
    const logo = loader.querySelector(".z7-loader__mark");
    const ready = Promise.allSettled([document.fonts?.ready || Promise.resolve(), logo?.decode?.().catch(() => {}) || Promise.resolve()]);
    const cap = new Promise(resolve => timer(state, resolve, 900));
    if (gsap) {
      state.loaderContext = gsap.context(() => gsap.to(value, { n: 92, duration: .8, ease: "power2.out", onUpdate: paint }));
    } else {
      const start = performance.now();
      const frame = now => {
        if (state.destroyed || loader.hidden) return;
        value.n = Math.min(92, (now - start) / 9);
        paint();
        state.loaderRaf = requestAnimationFrame(frame);
      };
      state.loaderRaf = requestAnimationFrame(frame);
    }
    await Promise.race([ready, cap]);
    if (state.destroyed) return;
    if (state.loaderRaf) cancelAnimationFrame(state.loaderRaf);
    state.loaderContext?.revert();
    value.n = 100;
    paint();
    if (gsap) gsap.to(loader, { clipPath: "inset(0 0 100% 0 round 0 0 45% 45%)", yPercent: -6, duration: .7, ease: "power3.inOut", onComplete: () => clearLoader(state) });
    else if (loader.animate) {
      const animation = loader.animate([
        { clipPath: "inset(0 0 0 0 round 0 0 40px 40px)", transform: "translateY(0)" },
        { clipPath: "inset(0 0 100% 0 round 0 0 45% 45%)", transform: "translateY(-6%)" }
      ], { duration: 700, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      animation.finished.catch(() => {}).then(() => clearLoader(state));
    } else clearLoader(state);
    timer(state, () => clearLoader(state), 850);
  }
  function clearOverlay(state) {
    if (!state.overlay) return;
    state.overlay.hidden = true;
    state.overlay.style.removeProperty("transform");
    state.overlay.style.removeProperty("clip-path");
    state.overlay.style.removeProperty("visibility");
    root.removeAttribute("data-z7-arriving");
    revealHero(state);
  }
  function arrivalReveal(state) {
    if (state.loader) state.loader.hidden = true;
    const overlay = state.overlay;
    if (!overlay || reduced.matches) { clearOverlay(state); return; }
    overlay.hidden = false;
    overlay.style.visibility = "visible";
    if (gsap) gsap.fromTo(overlay, { yPercent: 0 }, { yPercent: -105, clipPath: "inset(0 0 100% 0 round 0 0 45% 45%)", duration: .68, ease: "power3.inOut", onComplete: () => clearOverlay(state) });
    else if (overlay.animate) {
      const animation = overlay.animate([{ transform: "translateY(0)" }, { transform: "translateY(-105%)", clipPath: "inset(0 0 100% 0 round 0 0 45% 45%)" }], { duration: 680, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      animation.finished.catch(() => {}).then(() => clearOverlay(state));
    } else clearOverlay(state);
    timer(state, () => clearOverlay(state), 820);
  }
  function navigate(state, destination) {
    if (state.navigating) return;
    state.navigating = true;
    setMenu(state, false);
    const go = () => {
      try { sessionStorage.setItem(KEY, JSON.stringify({ path: pathOf(destination), time: Date.now() })); } catch {}
      location.assign(destination.href);
    };
    const overlay = state.overlay;
    if (!overlay || reduced.matches || lowData) { go(); return; }
    const label = overlay.querySelector("[data-z7-transition-label]");
    if (label) label.textContent = labelFor(destination);
    overlay.hidden = false;
    overlay.style.visibility = "visible";
    if (gsap) gsap.fromTo(overlay, { yPercent: 105, scaleX: .9 }, { yPercent: 0, scaleX: 1, duration: .58, ease: "power3.inOut", onComplete: go });
    else if (overlay.animate) {
      const animation = overlay.animate([{ transform: "translateY(105%) scaleX(.9)" }, { transform: "translateY(0) scaleX(1)" }], { duration: 580, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      animation.finished.catch(() => {}).then(go);
    } else go();
    timer(state, go, 740);
  }
  function initLinks(state) {
    document.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || state.navigating) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self") || link.hasAttribute("data-z7-no-transition")) return;
      let destination;
      try { destination = new URL(link.href, location.href); } catch { return; }
      if (destination.origin !== location.origin || !ROUTES.has(pathOf(destination))) return;
      if (pathOf(destination) === pathOf(new URL(location.href)) && destination.search === location.search) {
        if (destination.hash && destination.hash !== location.hash) {
          const target = document.querySelector(destination.hash);
          if (target) {
            event.preventDefault();
            if (state.lenis) state.lenis.scrollTo(target, { offset: -96, duration: 1 });
            else target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
            history.pushState(null, "", destination.hash);
          }
        }
        return;
      }
      event.preventDefault();
      navigate(state, destination);
    }, { signal: state.abort.signal });
  }
  function initSpatial(state) {
    const selector = ".manifest__media,.service-card,.compare,.media-tile,.web-stage,.reach-metric,.film-player,.studio-card,.website-work,.home-founder,.home-partner";
    const apply = node => {
      if (node.matches?.(selector)) node.classList.add("z7-spatial");
      node.querySelectorAll?.(selector).forEach(el => el.classList.add("z7-spatial"));
    };
    apply(document);
    state.mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) apply(node);
    })));
    state.mutations.observe(document.body, { childList: true, subtree: true });
    const floaters = new WeakMap();
    document.addEventListener("pointermove", event => {
      const surface = event.target.closest?.(".z7-spatial");
      if (surface && desktop.matches) {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--z7-mx", (event.clientX - rect.left) + "px");
        surface.style.setProperty("--z7-my", (event.clientY - rect.top) + "px");
      }
      const row = event.target.closest?.(".service-card");
      if (row) {
        const rect = row.getBoundingClientRect();
        row.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        row.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
        const scope = row.closest(".service-loop__stage,.services-map");
        const preview = scope?.querySelector(".service-preview[data-follow-preview]") || scope?.querySelector(".service-preview");
        if (preview && desktop.matches && gsap && !reduced.matches) {
          preview.classList.add("is-visible", "is-following");
          let move = floaters.get(preview);
          if (!move) {
            preview.style.left = "0px";
            preview.style.top = "0px";
            move = { x: gsap.quickTo(preview, "x", { duration: .42, ease: "power3.out" }), y: gsap.quickTo(preview, "y", { duration: .42, ease: "power3.out" }) };
            floaters.set(preview, move);
          }
          const offset = 18;
          move.x(Math.min(innerWidth - preview.offsetWidth - 12, event.clientX + offset));
          move.y(Math.min(innerHeight - preview.offsetHeight - 12, event.clientY + offset));
        }
      }
      const button = event.target.closest?.(".magnetic,.button,.z7-cinema__cta,.z7-header__contact");
      if (!button || !desktop.matches || reduced.matches || !gsap) return;
      const rect = button.getBoundingClientRect();
      gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * .1, y: (event.clientY - rect.top - rect.height / 2) * .13, duration: .4, ease: "power3.out", overwrite: "auto" });
    }, { passive: true, signal: state.abort.signal });
    document.addEventListener("pointerout", event => {
      const button = event.target.closest?.(".magnetic,.button,.z7-cinema__cta,.z7-header__contact");
      if (button && !button.contains(event.relatedTarget) && gsap) gsap.to(button, { x: 0, y: 0, duration: .5, ease: "power3.out", overwrite: "auto" });
      const row = event.target.closest?.(".service-card");
      if (row && !row.contains(event.relatedTarget)) {
        const scope = row.closest(".service-loop__stage,.services-map");
        const preview = scope?.querySelector(".service-preview[data-follow-preview]") || scope?.querySelector(".service-preview");
        if (preview && !preview.matches(":hover")) preview.classList.remove("is-visible", "is-following");
      }
    }, { passive: true, signal: state.abort.signal });
  }

  function initMotion(state) {
    if (!gsap || !ST || reduced.matches) return;
    state.pageContext = gsap.context(() => {
      document.querySelectorAll("[data-z7-reveal]").forEach(element => gsap.fromTo(element, { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: .72, ease: "power2.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true }
      }));
      const hero = document.querySelector(".hero-depth");
      const heroFrames = hero ? [...hero.querySelectorAll("[data-hero-frame]")] : [];
      if (hero && heroFrames.length && matchMedia("(min-width: 701px) and (pointer:fine)").matches) {
        const heroTimeline = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "+=72%", pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true } });
        const scene = hero.querySelector(".hero-depth__scene");
        heroFrames.forEach((frame, index) => heroTimeline.to(frame, { x: (index % 2 ? -1 : 1) * (18 + index * 5), y: (index < 2 ? 1 : -1) * 13, scale: 1.045, autoAlpha: .94, ease: "none" }, 0));
        if (scene) heroTimeline.to(scene, { y: -12, scale: 1.055, rotationY: -1.5, ease: "none" }, 0);
        heroTimeline.to(hero.querySelector(".hero-depth__copy"), { y: -18, autoAlpha: .48, ease: "none" }, .28);
        heroTimeline.to(hero.querySelector(".hero-depth__field"), { scale: 1.025, opacity: .8, ease: "none" }, 0);
      } else if (hero) {
        gsap.to(hero.querySelector(".hero-depth__copy"), { y: -28, autoAlpha: .35, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .8 } });
      }
      const homeSection = document.querySelector(".home-showcase");
      const homeViewport = homeSection?.querySelector(".home-showcase__viewport");
      const homeRail = homeSection?.querySelector(".home-showcase__track");
      const homeRailCards = homeRail ? [...homeRail.children] : [];
      if (homeSection && homeViewport && homeRail && homeRailCards.length > 1 && matchMedia("(min-width: 761px) and (pointer: fine)").matches) {
        const travel = () => Math.max(0, homeRail.scrollWidth - homeViewport.clientWidth);
        const updateCurve = () => {
          const center = innerWidth / 2;
          homeRailCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const offset = (rect.left + rect.width / 2 - center) / Math.max(1, innerWidth / 2);
            const distance = Math.min(1, Math.abs(offset));
            gsap.set(card, { rotationY: -offset * 10, scale: 1 - distance * .07, z: -distance * 36, transformOrigin: "50% 50%" });
          });
        };
        gsap.to(homeRail, { x: () => -travel(), ease: "none", scrollTrigger: { trigger: homeSection, start: "top top+=80", end: () => "+=" + Math.max(travel(), innerWidth * .7), pin: true, scrub: .8, invalidateOnRefresh: true, onUpdate: updateCurve, onRefresh: updateCurve } });
      }
      const homeFounderImages = [...document.querySelectorAll(".home-founder__image")];
      homeFounderImages.forEach((image, index) => gsap.fromTo(image, { clipPath: index % 2 ? "inset(0 0 0 100% round 16px)" : "inset(0 100% 0 0 round 16px)" }, {
        clipPath: "inset(0 0% 0 0% round 16px)", ease: "none", scrollTrigger: { trigger: image.closest(".home-founder"), start: "top 80%", end: "center 48%", scrub: .8 }
      }));
      const websiteCards = [...document.querySelectorAll(".website-work")];
      if (websiteCards.length && matchMedia("(min-width: 701px) and (pointer: fine)").matches) {
        websiteCards.forEach((card, index) => {
          card.style.zIndex = String(index + 1);
          gsap.fromTo(card, { scale: .975, y: 18 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: card, start: "top bottom-=40", end: "top top+=120", scrub: .7 } });
          if (index < websiteCards.length - 1) gsap.to(card, { scale: .955, autoAlpha: .64, filter: "brightness(.7)", ease: "none", scrollTrigger: { trigger: websiteCards[index + 1], start: "top bottom+=150", end: "top top+=100", scrub: .7 } });
          const media = card.querySelector(".website-work__media");
          if (media) gsap.fromTo(media, { y: 18 }, { y: -14, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: .7 } });
        });
      }
      document.querySelectorAll(".home-founder__image img").forEach(image => gsap.fromTo(image, { yPercent: 5, scale: 1.02 }, { yPercent: -5, scale: 1.09, ease: "none", scrollTrigger: { trigger: image.closest(".home-founder"), start: "top bottom", end: "bottom top", scrub: .7 } }));
      const rail = document.querySelector(".comparison-scroll");
      const stage = rail?.querySelector(".comparison-stage");
      const progress = rail?.querySelector("[data-comparison-progress]");
      if (rail && stage && matchMedia("(min-width: 701px) and (pointer: fine)").matches) {
        const travel = () => Math.max(0, stage.scrollWidth - rail.clientWidth);
        if (travel() > 0) gsap.to(stage, {
          x: () => -travel(), ease: "none",
          scrollTrigger: {
            trigger: rail, start: "top top+=112", end: () => "+=" + travel(), pin: true,
            scrub: .7, invalidateOnRefresh: true,
            onUpdate: self => { if (progress) gsap.set(progress, { scaleX: self.progress }); }
          }
        });
      }
      document.querySelectorAll(".kinetic-strip__track,[data-z7-partner-track]").forEach(track => {
        const reverse = track.dataset.z7PartnerTrack === "reverse";
        const loop = gsap.to(track, { xPercent: reverse ? 50 : -50, duration: reverse ? 32 : 27, ease: "none", repeat: -1 });
        const velocityTrigger = ST.create({ onUpdate: self => {
          const speed = Math.abs(self.getVelocity());
          const direction = self.direction < 0 ? -1 : 1;
          gsap.to(loop, { timeScale: (reverse ? -1 : 1) * direction * Math.min(2.1, .72 + speed / 2200), duration: .3, overwrite: true });
        }});
        state.marqueeTriggers.push(velocityTrigger);
      });
      document.querySelectorAll(".service-card,.studio-card,.media-tile,.services-page .stats-strip > div,.services-page .reach-metric,.services-page .film-player").forEach((node, index) => gsap.fromTo(node, { autoAlpha: 0, y: 14 }, {
        autoAlpha: 1, y: 0, duration: .55, delay: index % 4 * .025, ease: "power2.out",
        scrollTrigger: { trigger: node, start: "top 94%", once: true }
      }));
      document.querySelectorAll(".services-map .service-card,.z7-home .service-card").forEach(card => ST.create({
        trigger: card, start: "top 60%", end: "bottom 40%",
        onEnter: () => window.dispatchEvent(new CustomEvent("z7:activate-service", { detail: { card } })),
        onEnterBack: () => window.dispatchEvent(new CustomEvent("z7:activate-service", { detail: { card } }))
      }));
      const serviceCards = [...document.querySelectorAll(".services-page .service-stack-card")];
      if (serviceCards.length && matchMedia("(min-width: 701px) and (pointer: fine)").matches) {
        serviceCards.forEach((card, index) => {
          const media = card.querySelector(".comparison-scroll,.film-track,.web-stage,.reach-metric,.film-player,.studio-suite__list");
          card.style.zIndex = String(index + 1);
          gsap.fromTo(card, { scale: .975, y: 18 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: card, start: "top bottom-=70", end: "top top+=115", scrub: .7 } });
          if (index < serviceCards.length - 1) gsap.to(card, {
            scale: .965, autoAlpha: .68, filter: "brightness(.72)", transformOrigin: "center top", ease: "none",
            scrollTrigger: { trigger: serviceCards[index + 1], start: "top bottom+=180", end: "top top+=110", scrub: .7 }
          });
          if (media) gsap.fromTo(media, { y: 26 }, { y: -18, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: .7 } });
        });
      }
      const homeServiceRows = [...document.querySelectorAll(".z7-home .service-card")];
      if (homeServiceRows.length && matchMedia("(min-width: 701px) and (pointer: fine)").matches) {
        homeServiceRows.forEach((row, index) => gsap.fromTo(row, { x: 24, autoAlpha: .55 }, {
          x: 0, autoAlpha: 1, ease: "none",
          scrollTrigger: { trigger: row, start: "top bottom-=30", end: "top center+=80", scrub: .7 }
        }));
      }
    }, document.body);
  }
  function destroy(state) {
    if (!state || state.destroyed) return;
    state.destroyed = true;
    state.abort.abort();
    state.timers.forEach(clearTimeout);
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.canvasRaf) cancelAnimationFrame(state.canvasRaf);
    if (state.loaderRaf) cancelAnimationFrame(state.loaderRaf);
    state.loaderContext?.revert();
    state.pageContext?.revert();
    state.heroContext?.revert();
    state.mutations?.disconnect();
    state.marqueeTriggers?.forEach(trigger => trigger.kill());
    if (gsap) {
      if (state.tick) gsap.ticker.remove(state.tick);
      if (state.loader) gsap.killTweensOf(state.loader);
      if (state.overlay) gsap.killTweensOf(state.overlay);
    }
    if (state.lenis) {
      if (state.update) state.lenis.off("scroll", state.update);
      state.lenis.destroy();
    }
    live = null;
  }
  function boot(fromCache = false) {
    if (live) return;
    const state = {
      abort: new AbortController(), timers: new Set(), destroyed: false, navigating: false,
      loader: document.getElementById("z7Loader"), overlay: document.getElementById("z7Transition"),
      lenis: null, tick: null, update: null, raf: 0, canvasRaf: 0, loaderRaf: 0, heroDone: false, marqueeTriggers: []
    };
    live = state;
    initNavigation(state);
    initLinks(state);
    initScroll(state);
    initAmbientCanvas(state);
    initSpatial(state);
    initMotion(state);
    reduced.addEventListener("change", () => { refreshScroll(state); state.resumeCanvas?.(); }, { signal: state.abort.signal });
    desktop.addEventListener("change", () => refreshScroll(state), { signal: state.abort.signal });
    window.addEventListener("pagehide", () => destroy(state), { once: true, signal: state.abort.signal });
    const arriving = takeArrival() || root.hasAttribute("data-z7-arriving");
    if (fromCache) { clearOverlay(state); clearLoader(state); }
    else if (arriving) arrivalReveal(state);
    else preloader(state);
  }
  window.addEventListener("pageshow", event => { if (event.persisted && !live) boot(true); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot(), { once: true });
  else boot();
})();
