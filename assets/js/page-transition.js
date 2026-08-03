(() => {
  "use strict";

  const STORAGE_KEY = "z7:route-transition";
  const root = document.documentElement;
  const overlay = document.getElementById("z7RouteTransition");

  if (!overlay) {
    root.classList.remove("z7-transition-arrival");
    return;
  }

  const labelNode = overlay.querySelector("[data-z7-route-label]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COVER_MS = prefersReducedMotion ? 180 : 860;
  const REVEAL_MS = prefersReducedMotion ? 220 : 980;
  let navigating = false;

  function readArrival() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      const fresh = data && Number.isFinite(data.time) && Date.now() - data.time < 15000;
      sessionStorage.removeItem(STORAGE_KEY);
      return fresh ? data : null;
    } catch {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage may be unavailable in restrictive browser modes.
      }
      return null;
    }
  }

  function routeLabel(url) {
    const path = url.pathname.replace(/\/+$/, "") || "/";

    const labels = {
      "/": "Home",
      "/about": "About",
      "/founders": "Founders",
      "/contact": "Contact"
    };

    if (labels[path]) return labels[path];

    if (path === "/" && url.hash) {
      return url.hash.slice(1).replace(/[-_]+/g, " ");
    }

    return path
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/[-_]+/g, " ") || "7Z Magic";
  }

  function setLabel(value) {
    if (!labelNode) return;
    labelNode.textContent = String(value || "7Z Magic");
  }

  function revealHero() {
    const items = Array.from(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    if (window.gsap && !prefersReducedMotion) {
      window.gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: 0.86,
        stagger: 0.075,
        ease: "power3.out",
        overwrite: "auto"
      });
      return;
    }

    items.forEach((item) => {
      item.style.opacity = "1";
      item.style.transform = "none";
    });
  }

  function finishReveal() {
    overlay.classList.remove("is-covered", "is-revealing", "is-covering");
    overlay.setAttribute("aria-hidden", "true");
    root.classList.remove("z7-transition-arrival", "z7-transition-running");
  }

  const arrival = readArrival();

  if (arrival || root.classList.contains("z7-transition-arrival")) {
    const loader = document.getElementById("loader");
    loader?.remove();

    setLabel(arrival?.label || routeLabel(new URL(window.location.href)));
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-covered");
    root.classList.add("z7-transition-running");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        overlay.classList.remove("is-covered");
        overlay.classList.add("is-revealing");
        window.setTimeout(revealHero, prefersReducedMotion ? 10 : 180);
        window.setTimeout(finishReveal, REVEAL_MS);
      });
    });
  } else {
    root.classList.remove("z7-transition-arrival");
    window.requestAnimationFrame(revealHero);
  }

  function isEligibleLink(event, link) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return false;
    }

    if (
      !link ||
      link.hasAttribute("download") ||
      link.target === "_blank" ||
      link.getAttribute("rel")?.split(/\s+/).includes("external")
    ) {
      return false;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) {
      return false;
    }

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return false;
    }

    if (url.origin !== window.location.origin) return false;

    const current = new URL(window.location.href);
    const sameDocument =
      url.pathname === current.pathname &&
      url.search === current.search;

    if (sameDocument) return false;

    return url;
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    const destination = isEligibleLink(event, link);

    if (!destination || navigating) return;

    event.preventDefault();
    navigating = true;

    const label = routeLabel(destination);
    setLabel(label);

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          label,
          time: Date.now()
        })
      );
    } catch {
      // Navigation still works when storage is unavailable.
    }

    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.remove("is-revealing", "is-covered");
    overlay.classList.add("is-covering");
    root.classList.add("z7-transition-running");

    window.setTimeout(() => {
      window.location.assign(destination.href);
    }, COVER_MS);
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    navigating = false;
    finishReveal();
    revealHero();
  });
})();
