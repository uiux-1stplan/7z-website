(() => {
  "use strict";

  const STORAGE_KEY = "z7:route-transition-v11";
  const LEGACY_KEY = "z7:route-transition";
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COVER_MS = reducedMotion ? 190 : 820;
  const REVEAL_MS = reducedMotion ? 220 : 930;
  let navigating = false;
  let overlay = null;
  let labelNode = null;

  function readStoredTransition() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      const fresh =
        data &&
        Number.isFinite(data.time) &&
        Date.now() - data.time < 15000;

      return fresh ? data : null;
    } catch {
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

    if (url.hash) {
      return url.hash
        .slice(1)
        .replace(/[-_]+/g, " ")
        .trim() || "7Z Magic";
    }

    return (
      path
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/[-_]+/g, " ") || "7Z Magic"
    );
  }

  function buildOverlay() {
    const existing = document.getElementById("z7RouteTransition");
    overlay = existing || document.createElement("div");

    overlay.id = "z7RouteTransition";
    overlay.className = "z7-route-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="z7-route-transition__panel z7-route-transition__panel--left"></div>
      <div class="z7-route-transition__panel z7-route-transition__panel--right"></div>
      <div class="z7-route-transition__stage">
        <p class="z7-route-transition__eyebrow">7Z Magic / Scene Change</p>
        <div class="z7-route-transition__mark" aria-hidden="true">
          <img src="/assets/brand/7z-20260902_203523_038/compat/media/main_logo/7ZMagic-signature-logo-20260828.png" alt="" />
        </div>
        <span class="z7-route-transition__line" aria-hidden="true"></span>
        <p class="z7-route-transition__label" data-z7-route-label>7Z Magic</p>
      </div>
    `;

    if (!existing) {
      document.body.prepend(overlay);
    }

    labelNode = overlay.querySelector("[data-z7-route-label]");
  }

  function setLabel(value) {
    if (labelNode) labelNode.textContent = String(value || "7Z Magic");
  }

  function clearOverlay() {
    if (!overlay) return;
    overlay.classList.remove(
      "is-active",
      "is-covering",
      "is-covered",
      "is-revealing"
    );
    overlay.setAttribute("aria-hidden", "true");
    root.classList.remove(
      "z7-route-pending",
      "z7-route-running",
      "z7-transition-arrival",
      "z7-transition-running"
    );
    navigating = false;
  }

  function showArrival(arrival) {
    const loader = document.getElementById("loader");
    loader?.remove();

    setLabel(arrival?.label || routeLabel(new URL(window.location.href)));
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-active", "is-covered");
    root.classList.add("z7-route-running");
    root.classList.remove("z7-route-pending");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.remove("is-covered");
        overlay.classList.add("is-revealing");
        window.setTimeout(clearOverlay, REVEAL_MS);
      });
    });
  }

  function eligibleDestination(event, link) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !link ||
      link.hasAttribute("download") ||
      link.target === "_blank"
    ) {
      return null;
    }

    const href = link.getAttribute("href");
    if (
      !href ||
      href === "#" ||
      /^(mailto:|tel:|javascript:)/i.test(href)
    ) {
      return null;
    }

    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch {
      return null;
    }

    if (destination.origin !== window.location.origin) return null;

    const current = new URL(window.location.href);
    const sameDocument =
      destination.pathname === current.pathname &&
      destination.search === current.search;

    if (sameDocument) return null;

    return destination;
  }

  function beginNavigation(destination) {
    navigating = true;
    setLabel(routeLabel(destination));

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          label: routeLabel(destination),
          time: Date.now()
        })
      );
      sessionStorage.removeItem(LEGACY_KEY);
    } catch {
      // Navigation still works without storage.
    }

    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.remove("is-covered", "is-revealing");
    overlay.classList.add("is-active");

    // Force a clean starting frame before the panels move in.
    void overlay.offsetWidth;

    overlay.classList.add("is-covering");
    root.classList.add("z7-route-running");

    window.setTimeout(() => {
      window.location.assign(destination.href);
    }, COVER_MS);
  }

  function onCapturedClick(event) {
    if (navigating) return;

    const target = event.target;
    const link =
      target instanceof Element
        ? target.closest("a[href]")
        : null;

    const destination = eligibleDestination(event, link);
    if (!destination) return;

    event.preventDefault();
    event.stopPropagation();
    beginNavigation(destination);
  }

  function init() {
    root.classList.remove("z7-transition-arrival", "z7-transition-running");
    buildOverlay();

    const arrival = readStoredTransition();

    if (arrival || root.classList.contains("z7-route-pending")) {
      showArrival(arrival);
    } else {
      root.classList.remove("z7-route-pending");
      clearOverlay();
    }

    // Capture phase makes the transition independent from app/menu click handlers.
    window.addEventListener("click", onCapturedClick, true);

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) clearOverlay();
    });

    window.__z7RouteTransitionReady = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
