(() => {
  "use strict";

  const root = document.documentElement;
  if (!root.hasAttribute("data-z7-core")) return;

  const STORAGE_KEY = "z7:core-arrival:v1";
  const PUBLIC_ROUTES = new Set([
    "/", "/about", "/founders", "/partners", "/contact",
    "/courses", "/courses/ai-engineering"
  ]);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopPointer = window.matchMedia("(min-width: 1181px) and (pointer: fine)");
  const smallViewport = window.matchMedia("(max-width: 1180px)");
  const prefersLessData = Boolean(navigator.connection?.saveData);
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;
  let active = null;

  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function pathOf(url) {
    return url.pathname.replace(/\/+$/, "") || "/";
  }

  function readArrival() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      sessionStorage.removeItem(STORAGE_KEY);
      return data?.path === pathOf(new URL(location.href)) &&
        Date.now() - data.time < 12000 ? data : null;
    } catch {
      return null;
    }
  }

  function scheduleTimeout(state, callback, milliseconds) {
    const id = window.setTimeout(() => {
      state.timers.delete(id);
      callback();
    }, milliseconds);
    state.timers.add(id);
    return id;
  }

  function navigationLabel(url) {
    const names = {
      "/": "Home", "/about": "About", "/founders": "Founders",
      "/partners": "Partners", "/contact": "Contact",
      "/courses": "7Z Academy", "/courses/ai-engineering": "AI Engineering"
    };
    return names[pathOf(url)] || "7Z Magic";
  }

  function initScrolling(state) {
    if (!Lenis || reducedMotion.matches || prefersLessData || !desktopPointer.matches) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false });
    state.lenis = lenis;
    if (gsap) {
      const tick = time => lenis.raf(time * 1000);
      state.tick = tick;
      gsap.ticker.add(tick);
      if (ScrollTrigger) {
        state.scrollUpdate = () => ScrollTrigger.update();
        lenis.on("scroll", state.scrollUpdate);
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

  function refreshScrolling(state) {
    if (state.destroyed) return;
    if (state.lenis && (reducedMotion.matches || prefersLessData || !desktopPointer.matches)) {
      if (gsap && state.tick) gsap.ticker.remove(state.tick);
      if (state.raf) cancelAnimationFrame(state.raf);
      if (state.scrollUpdate) state.lenis.off("scroll", state.scrollUpdate);
      state.lenis.destroy();
      state.lenis = null;
      state.tick = null;
      state.scrollUpdate = null;
      state.raf = 0;
    } else if (!state.lenis) {
      initScrolling(state);
    }
    ScrollTrigger?.refresh(true);
  }

  function scrollToLocal(state, hash) {
    let target;
    try { target = document.querySelector(hash); } catch { return false; }
    if (!target) return false;
    if (state.lenis) state.lenis.scrollTo(target, { offset: -96, duration: 1.15 });
    else target.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
    history.pushState(null, "", hash);
    return true;
  }

  function setMenu(state, open) {
    const { menu, nav, services, servicesPanel } = state;
    if (!menu || !nav) return;
    const mobile = smallViewport.matches;
    const expanded = mobile && open;
    menu.setAttribute("aria-expanded", String(expanded));
    menu.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
    nav.classList.toggle("is-open", expanded);
    if (!mobile) nav.classList.remove("is-open");
    if (!expanded && services && servicesPanel) {
      services.setAttribute("aria-expanded", "false");
      servicesPanel.hidden = true;
    }
  }

  function initNavigation(state) {
    state.menu = document.getElementById("z7MenuToggle");
    state.nav = document.getElementById("z7MainNav");
    state.services = document.getElementById("z7ServicesTrigger");
    state.servicesPanel = document.getElementById("z7ServicesPanel");
    if (state.menu) {
      state.menu.addEventListener("click", () => {
        setMenu(state, state.menu.getAttribute("aria-expanded") !== "true");
      }, { signal: state.abort.signal });
    }
    if (state.services && state.servicesPanel) {
      state.services.addEventListener("click", () => {
        const open = state.services.getAttribute("aria-expanded") !== "true";
        state.services.setAttribute("aria-expanded", String(open));
        state.servicesPanel.hidden = !open;
      }, { signal: state.abort.signal });
    }
    document.addEventListener("click", event => {
      if (state.services && !event.target.closest(".z7-services")) {
        state.services.setAttribute("aria-expanded", "false");
        if (state.servicesPanel) state.servicesPanel.hidden = true;
      }
      if (smallViewport.matches && state.nav?.classList.contains("is-open") &&
          !event.target.closest(".z7-header")) setMenu(state, false);
    }, { signal: state.abort.signal });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      const hadMenu = state.menu?.getAttribute("aria-expanded") === "true";
      const hadServices = state.services?.getAttribute("aria-expanded") === "true";
      setMenu(state, false);
      if (hadMenu || hadServices) (hadServices ? state.services : state.menu)?.focus();
    }, { signal: state.abort.signal });
    smallViewport.addEventListener("change", () => setMenu(state, false), { signal: state.abort.signal });
  }

  function clearLoader(state) {
    if (!state.loader || state.loader.hidden) return;
    state.loader.hidden = true;
    state.loader.style.removeProperty("transform");
    state.loader.style.removeProperty("opacity");
    revealHero(state);
  }

  function revealHero(state) {
    if (state.heroRevealed) return;
    state.heroRevealed = true;
    const elements = Array.from(document.querySelectorAll("[data-z7-hero-reveal]"));
    if (!elements.length) return;
    if (reducedMotion.matches || !gsap) {
      elements.forEach(element => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      return;
    }
    state.heroContext = gsap.context(() => {
      gsap.fromTo(elements, { autoAlpha: 0, y: 20 }, {
        autoAlpha: 1, y: 0, duration: .7, stagger: .08, ease: "power2.out"
      });
    });
  }

  async function showPreloader(state) {
    const loader = state.loader;
    if (!loader) return;
    if (reducedMotion.matches) { clearLoader(state); return; }
    const count = loader.querySelector("[data-z7-count]");
    const progress = loader.querySelector("[data-z7-progress]");
    const value = { n: 0 };
    const paint = () => {
      const n = Math.min(100, Math.round(value.n));
      if (count) count.textContent = String(n).padStart(2, "0");
      if (progress) progress.style.width = `${n}%`;
    };
    const mark = loader.querySelector(".z7-loader__mark");
    const ready = Promise.allSettled([
      document.fonts?.ready || Promise.resolve(),
      mark?.decode?.().catch(() => {}) || Promise.resolve()
    ]);
    const cap = new Promise(resolve => scheduleTimeout(state, resolve, 1100));
    if (gsap) {
      state.context = gsap.context(() => {
        gsap.to(value, { n: 90, duration: .85, ease: "power2.out", onUpdate: paint });
      });
    } else {
      const started = performance.now();
      const frame = now => {
        if (state.destroyed || loader.hidden) return;
        value.n = Math.min(90, (now - started) / 10);
        paint();
        state.loaderRaf = requestAnimationFrame(frame);
      };
      state.loaderRaf = requestAnimationFrame(frame);
    }
    await Promise.race([ready, cap]);
    if (state.destroyed) return;
    if (state.loaderRaf) cancelAnimationFrame(state.loaderRaf);
    state.context?.revert();
    state.context = null;
    value.n = 100;
    paint();
    if (gsap) {
      gsap.to(loader, {
        yPercent: -101, duration: .58, ease: "power3.inOut",
        onComplete: () => clearLoader(state)
      });
    } else if (loader.animate) {
      const animation = loader.animate([
        { transform: "translateY(0)" }, { transform: "translateY(-101%)" }
      ], { duration: 580, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      animation.finished.catch(() => {}).then(() => clearLoader(state));
    } else clearLoader(state);
    scheduleTimeout(state, () => clearLoader(state), 750);
  }

  function clearOverlay(state) {
    const overlay = state.overlay;
    if (!overlay) return;
    overlay.hidden = true;
    overlay.style.removeProperty("transform");
    overlay.style.removeProperty("visibility");
    root.removeAttribute("data-z7-arriving");
    revealHero(state);
  }

  function revealArrival(state) {
    if (state.loader) state.loader.hidden = true;
    const overlay = state.overlay;
    if (!overlay || reducedMotion.matches) { clearOverlay(state); return; }
    overlay.hidden = false;
    overlay.style.visibility = "visible";
    overlay.style.transform = "translateY(0)";
    if (gsap) {
      gsap.to(overlay, { yPercent: -101, duration: .55, ease: "power3.inOut", onComplete: () => clearOverlay(state) });
    } else if (overlay.animate) {
      const animation = overlay.animate([
        { transform: "translateY(0)" }, { transform: "translateY(-101%)" }
      ], { duration: 550, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      animation.finished.catch(() => {}).then(() => clearOverlay(state));
    } else clearOverlay(state);
    scheduleTimeout(state, () => clearOverlay(state), 700);
  }

  function beginNavigation(state, destination) {
    if (state.navigating) return;
    state.navigating = true;
    setMenu(state, false);
    const navigate = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path: pathOf(destination), time: Date.now() }));
      } catch { /* Navigation works without session storage. */ }
      location.assign(destination.href);
    };
    const overlay = state.overlay;
    if (!overlay || reducedMotion.matches || prefersLessData) { navigate(); return; }
    const label = overlay.querySelector("[data-z7-transition-label]");
    if (label) label.textContent = navigationLabel(destination);
    overlay.hidden = false;
    overlay.style.visibility = "visible";
    overlay.style.transform = "translateY(101%)";
    let finished = false;
    const finish = () => { if (finished) return; finished = true; navigate(); };
    if (gsap) {
      gsap.fromTo(overlay, { yPercent: 101 }, {
        yPercent: 0, duration: .46, ease: "power3.inOut", onComplete: finish
      });
    } else if (overlay.animate) {
      const animation = overlay.animate([
        { transform: "translateY(101%)" }, { transform: "translateY(0)" }
      ], { duration: 460, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      animation.finished.catch(() => {}).then(finish);
    } else finish();
    scheduleTimeout(state, finish, 600);
  }

  function initLinks(state) {
    document.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || state.navigating) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.hasAttribute("download") || link.target && link.target !== "_self" ||
          link.dataset.z7NoTransition !== undefined) return;
      let destination;
      try { destination = new URL(link.href, location.href); } catch { return; }
      if (destination.origin !== location.origin || !PUBLIC_ROUTES.has(pathOf(destination))) return;
      const samePath = pathOf(destination) === pathOf(new URL(location.href));
      if (samePath && destination.search === location.search) {
        if (destination.hash && destination.hash !== location.hash) {
          if (scrollToLocal(state, destination.hash)) event.preventDefault();
        }
        return;
      }
      event.preventDefault();
      beginNavigation(state, destination);
    }, { signal: state.abort.signal });
  }

  function initMotion(state) {
    if (!gsap || !ScrollTrigger || reducedMotion.matches) return;
    state.pageContext = gsap.context(() => {
      document.querySelectorAll("[data-z7-reveal]").forEach(element => {
        gsap.fromTo(element, { autoAlpha: 0, y: 22 }, {
          autoAlpha: 1, y: 0, duration: .8, ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 88%", once: true }
        });
      });
    }, document.body);
  }

  function destroy(state) {
    if (!state || state.destroyed) return;
    state.destroyed = true;
    state.abort.abort();
    state.timers.forEach(clearTimeout);
    state.timers.clear();
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.loaderRaf) cancelAnimationFrame(state.loaderRaf);
    state.context?.revert();
    state.pageContext?.revert();
    state.heroContext?.revert();
    if (gsap) {
      if (state.tick) gsap.ticker.remove(state.tick);
      if (state.loader) gsap.killTweensOf(state.loader);
      if (state.overlay) gsap.killTweensOf(state.overlay);
    }
    if (state.lenis) {
      if (state.scrollUpdate) state.lenis.off("scroll", state.scrollUpdate);
      state.lenis.destroy();
    }
    active = null;
  }

  function boot(fromCache = false) {
    if (active) return;
    const state = {
      abort: new AbortController(), timers: new Set(), destroyed: false,
      navigating: false, loader: document.getElementById("z7Loader"),
      overlay: document.getElementById("z7Transition"), raf: 0, loaderRaf: 0,
      lenis: null, tick: null, scrollUpdate: null, context: null, pageContext: null,
      heroContext: null, heroRevealed: false
    };
    active = state;
    initNavigation(state);
    initLinks(state);
    initScrolling(state);
    initMotion(state);
    reducedMotion.addEventListener("change", () => refreshScrolling(state), { signal: state.abort.signal });
    desktopPointer.addEventListener("change", () => refreshScrolling(state), { signal: state.abort.signal });
    window.addEventListener("pagehide", () => destroy(state), { once: true, signal: state.abort.signal });
    const arrival = readArrival();
    if (fromCache) { clearOverlay(state); clearLoader(state); revealHero(state); }
    else if (arrival || root.hasAttribute("data-z7-arriving")) revealArrival(state);
    else showPreloader(state);
  }

  window.addEventListener("pageshow", event => { if (event.persisted && !active) boot(true); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
