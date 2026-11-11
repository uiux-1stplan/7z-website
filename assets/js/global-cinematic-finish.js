(() => {
  "use strict";

  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const logoPath = "/assets/brand/7Z-LogoT(3).png";
  const routeLabels = [
    ["/services", "Services"], ["/websites", "Websites"], ["/about", "About"],
    ["/founders", "Founders"], ["/partners", "Partners"], ["/contact", "Contact"],
    ["/private-access", "Private Access"], ["/courses/ai-for-engineers", "AI for Engineers"],
    ["/courses/cinematic-filmmaking-with-ai", "Cinematic Filmmaking"], ["/courses", "7Z Academy"],
    ["/admin", "Admin Portal"], ["/", "Home"]
  ];
  const pathOf = url => url.pathname.replace(/\/+$/, "") || "/";
  const labelFor = url => routeLabels.find(([path]) => pathOf(url) === path || (path !== "/" && pathOf(url).startsWith(path + "/")))?.[1] || "7Z Magic";

  function makeLayer(kind, label) {
    const layer = document.createElement("div");
    layer.className = kind === "loader" ? "z7-global-loader" : "z7-global-transition";
    layer.setAttribute("aria-hidden", kind === "loader" ? "false" : "true");
    if (kind === "loader") layer.setAttribute("role", "status");
    layer.innerHTML = `<div class="${kind === "loader" ? "z7-global-loader" : "z7-global-transition"}__content"><img class="${kind === "loader" ? "z7-global-loader" : "z7-global-transition"}__logo" src="${logoPath}" alt="7Z Magic" width="176" height="104" decoding="async">${kind === "loader" ? '<span class="z7-global-loader__percent" data-global-percent>0%</span><span class="z7-global-loader__line" aria-hidden="true"><i data-global-progress></i></span>' : ""}<p class="${kind === "loader" ? "z7-global-loader" : "z7-global-transition"}__label">${label}</p></div>`;
    return layer;
  }

  function addTransitions() {
    if (root.hasAttribute("data-z7-core")) return;
    let loader = document.querySelector(".z7-global-loader");
    let overlay = document.querySelector(".z7-global-transition");
    if (!loader) { loader = makeLayer("loader", "7Z MAGIC / PREPARING THE EXPERIENCE"); document.body.prepend(loader); }
    if (!overlay) { overlay = makeLayer("transition", "7Z Magic"); document.body.append(overlay); }

    const current = pathOf(new URL(location.href));
    let arrival = null;
    try {
      arrival = JSON.parse(sessionStorage.getItem("z7:global-arrival:v1") || "null");
      sessionStorage.removeItem("z7:global-arrival:v1");
      if (!arrival) arrival = JSON.parse(sessionStorage.getItem("z7:core-arrival:v1") || "null");
      sessionStorage.removeItem("z7:core-arrival:v1");
    } catch {}

    const finishArrival = () => {
      overlay.classList.remove("is-active");
      overlay.classList.add("is-leaving");
      root.removeAttribute("data-z7-arriving");
      setTimeout(() => { overlay.hidden = true; overlay.classList.remove("is-leaving"); loader?.remove(); }, reduced.matches ? 0 : 300);
    };
    if (arrival?.path === current && Date.now() - arrival.time < 15000) {
      const label = overlay.querySelector(".z7-global-transition__label");
      if (label) label.textContent = arrival.label || labelFor(new URL(location.href));
      overlay.hidden = false;
      root.setAttribute("data-z7-arriving", "");
      requestAnimationFrame(() => overlay.classList.add("is-active"));
      setTimeout(finishArrival, reduced.matches ? 20 : 220);
    } else if (loader && (() => { try { return !sessionStorage.getItem("z7:global-started:v1"); } catch { return false; } })()) {
      try { sessionStorage.setItem("z7:global-started:v1", "1"); } catch {}
      const logo = loader.querySelector(".z7-global-loader__logo");
      const percent = loader.querySelector("[data-global-percent]");
      const progress = loader.querySelector("[data-global-progress]");
      const started = performance.now();
      let raf = 0;
      const draw = now => {
        const value = Math.min(92, Math.max(0, ((now - started) / 1050) * 92));
        if (percent) percent.textContent = Math.round(value) + "%";
        if (progress) progress.style.transform = "scaleX(" + (value / 100) + ")";
        if (value < 92) raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      const pageReady = document.readyState === "complete"
        ? Promise.resolve()
        : new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
      const cap = new Promise(resolve => setTimeout(resolve, 1600));
      Promise.race([pageReady, cap]).then(() => logo?.decode?.() || Promise.resolve()).then(() => {
        cancelAnimationFrame(raf);
        if (percent) percent.textContent = "100%";
        if (progress) progress.style.transform = "scaleX(1)";
        setTimeout(() => {
          loader.classList.add("is-leaving");
          setTimeout(() => loader?.remove(), reduced.matches ? 0 : 340);
        }, 180);
      });
    } else if (loader) loader.remove();

    if (window.__z7GlobalTransitionsBound) return;
    window.__z7GlobalTransitionsBound = true;
    document.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.hasAttribute("download") || link.hasAttribute("data-z7-no-transition") || (link.target && link.target !== "_self")) return;
      let destination;
      try { destination = new URL(link.href, location.href); } catch { return; }
      if (destination.origin !== location.origin || pathOf(destination) === pathOf(new URL(location.href))) return;
      event.preventDefault();
      if (window.__z7GlobalNavigating) return;
      window.__z7GlobalNavigating = true;
      const label = labelFor(destination);
      const title = overlay.querySelector(".z7-global-transition__label");
      if (title) title.textContent = label;
      overlay.hidden = false;
      overlay.classList.remove("is-leaving");
      root.setAttribute("data-z7-transitioning", "");
      requestAnimationFrame(() => overlay.classList.add("is-active"));
      setTimeout(() => {
        const value = { path: pathOf(destination), time: Date.now(), label };
        try {
          sessionStorage.setItem("z7:global-arrival:v1", JSON.stringify(value));
          sessionStorage.setItem("z7:core-arrival:v1", JSON.stringify(value));
        } catch {}
        location.assign(destination.href);
      }, reduced.matches ? 0 : 240);
    }, { passive: false });
  }

  function addCursor() {
    if (!finePointer.matches || document.getElementById("z7GlobalCursor")) return;
    const layer = document.createElement("div");
    layer.id = "z7GlobalCursor";
    layer.className = "z7-global-cursor";
    layer.setAttribute("aria-hidden", "true");
    const ring = document.createElement("span");
    ring.className = "z7-global-cursor__ring";
    const dot = document.createElement("span");
    dot.className = "z7-global-cursor__dot";
    layer.append(ring, dot);
    document.body.append(layer);

    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    let scale = 1, targetScale = 1, raf = 0;
    const tick = () => {
      rx += (x - rx) * .14;
      ry += (y - ry) * .14;
      scale += (targetScale - scale) * .22;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) scale(${scale})`;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      raf = requestAnimationFrame(tick);
    };
    const move = event => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      x = event.clientX; y = event.clientY; layer.classList.add("is-visible");
      const target = event.target instanceof Element ? event.target.closest("a,button,input,textarea,select,[role='button']") : null;
      targetScale = target ? 1.4 : 1;
      layer.classList.toggle("is-hovering", Boolean(target));
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", () => layer.classList.remove("is-visible"));
    window.addEventListener("blur", () => layer.classList.remove("is-visible"));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) raf = requestAnimationFrame(tick);
    });
    raf = requestAnimationFrame(tick);
  }

  function animateFallback(heading) {
    if (reduced.matches || heading.dataset.z7HeadingReady) return;
    heading.dataset.z7HeadingReady = "fallback";
    if (!window.__z7HeadingObserver) {
      window.__z7HeadingObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        node.classList.add("z7-heading-fallback");
        node.addEventListener("animationend", () => node.classList.remove("z7-heading-fallback"), { once: true });
        window.__z7HeadingObserver.unobserve(node);
      }), { threshold: .12, rootMargin: "0px 0px -8% 0px" });
    }
    window.__z7HeadingObserver.observe(heading);
  }

  async function addSpringHeadings() {
    const allHeadings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(el => el.textContent.trim() && !el.dataset.noHeadingMotion);
    const headings = allHeadings.filter(el => [...el.childNodes].every(node => node.nodeType === Node.TEXT_NODE));
    allHeadings.filter(el => !headings.includes(el)).forEach(animateFallback);
    if (!headings.length || reduced.matches) return;
    const mountAll = (React, createRoot, TextEngine) => {
      headings.forEach(heading => {
        if (heading.dataset.z7HeadingReady) return;
        const text = heading.textContent.trim();
        heading.setAttribute("aria-label", text);
        const className = "z7-heading-motion justify-center";
        const rootNode = createRoot(heading);
        heading.dataset.z7HeadingReady = "spring";
        rootNode.render(React.createElement(TextEngine, {
          tag: "span", className, mode: "once", delayIn: 200, lineStagger: 180,
          lineIn: { y: 0, opacity: 1, filter: "blur(0px)" },
          lineOut: { y: 13, opacity: 0, filter: "blur(10px)" },
          lineConfig: { tension: 180, friction: 48 },
          lineConfigIn: { tension: 180, friction: 48 },
          lineConfigOut: { tension: 180, friction: 48 },
          rootMargin: "0px 0px -8% 0px", seo: false
        }, text));
      });
    };
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 300));
    idle(async () => {
      try {
        const [reactModule, domModule, engineModule] = await Promise.all([
          import("https://esm.sh/react@18.3.1"),
          import("https://esm.sh/react-dom@18.3.1/client?external=react"),
          import("https://esm.sh/spring-text-engine@0.1.5?bundle&external=react")
        ]);
        // TextEngine runs on React and @react-spring/web; the package is pinned to 0.1.5.
        mountAll(reactModule.default || reactModule, domModule.createRoot, engineModule.default || engineModule.TextEngine);
      } catch (error) {
        console.info("7Z heading motion using the lightweight native reveal.", error);
        headings.forEach(animateFallback);
      }
    });
  }

  const install = () => {
    if (!document.querySelector('link[data-z7-global-finish]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = "/assets/css/global-cinematic-finish.css?v=20261111-1"; link.dataset.z7GlobalFinish = "";
      document.head.append(link);
    }
    addTransitions();
    addCursor();
    addSpringHeadings();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
