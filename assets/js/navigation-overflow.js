(() => {
  "use strict";

  const nav = document.querySelector(".main-nav");
  if (!nav || nav.dataset.overflowReady === "true") return;

  nav.dataset.overflowReady = "true";

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const originalItems = Array.from(nav.children).filter(
    (item) => !item.classList.contains("nav-overflow")
  );

  const overflow = document.createElement("div");
  overflow.className = "nav-overflow";
  overflow.innerHTML = `
    <button
      class="nav-overflow__trigger"
      type="button"
      aria-expanded="false"
      aria-controls="z7NavOverflowPanel"
      aria-label="Show more pages"
    >
      <span>More</span>
    </button>
    <div
      class="nav-overflow__panel"
      id="z7NavOverflowPanel"
      role="menu"
      aria-hidden="true"
    ></div>
  `;

  nav.appendChild(overflow);

  const trigger = overflow.querySelector(".nav-overflow__trigger");
  const panel = overflow.querySelector(".nav-overflow__panel");
  const triggerLabel = trigger.querySelector("span");
  const servicesMenu = nav.querySelector(".services-menu");
  const servicesTrigger = servicesMenu?.querySelector(".services-trigger");
  let hiddenItems = [];
  let resizeTimer = 0;

  function setOpen(open, { focusFirst = false } = {}) {
    const next = Boolean(open && overflow.classList.contains("is-needed"));
    overflow.classList.toggle("is-open", next);
    document.body.classList.toggle("is-nav-overflow-open", next);
    trigger.setAttribute("aria-expanded", String(next));
    panel.setAttribute("aria-hidden", String(!next));

    if (next) {
      servicesMenu?.classList.remove("is-open");
      servicesTrigger?.setAttribute("aria-expanded", "false");
      servicesMenu
        ?.querySelector(".services-panel")
        ?.setAttribute("aria-hidden", "true");

      if (focusFirst) {
        window.requestAnimationFrame(() => panel.querySelector("a")?.focus());
      }
    }
  }

  function closeOverflow() {
    setOpen(false);
  }

  function getTotalSlots() {
    const usableWidth = Math.max(
      280,
      Math.min(
        window.visualViewport?.width || window.innerWidth,
        document.documentElement.clientWidth
      ) - 20
    );

    return Math.max(3, Math.min(5, Math.floor(usableWidth / 82)));
  }

  function makePanelLink(item) {
    if (item.matches("a[href]")) {
      const link = item.cloneNode(true);
      link.classList.remove("is-nav-overflow-hidden");
      link.setAttribute("role", "menuitem");
      return link;
    }

    const anchor = item.querySelector("a[href]");
    if (anchor) {
      const link = anchor.cloneNode(true);
      link.classList.remove("is-nav-overflow-hidden");
      link.setAttribute("role", "menuitem");
      return link;
    }

    return null;
  }

  function rebuild() {
    closeOverflow();

    originalItems.forEach((item) => {
      item.classList.remove("is-nav-overflow-hidden");
      item.removeAttribute("aria-hidden");
    });

    panel.replaceChildren();
    hiddenItems = [];
    trigger.classList.remove("is-active");
    triggerLabel.textContent = "More";

    if (!mobileQuery.matches) {
      overflow.classList.remove("is-needed");
      nav.style.removeProperty("--z7-mobile-nav-columns");
      return;
    }

    const totalSlots = getTotalSlots();

    if (originalItems.length <= totalSlots) {
      overflow.classList.remove("is-needed");
      nav.style.setProperty(
        "--z7-mobile-nav-columns",
        String(originalItems.length)
      );
      return;
    }

    const visibleOriginalCount = Math.max(2, totalSlots - 1);
    hiddenItems = originalItems.slice(visibleOriginalCount);

    hiddenItems.forEach((item) => {
      item.classList.add("is-nav-overflow-hidden");
      item.setAttribute("aria-hidden", "true");

      const link = makePanelLink(item);
      if (!link) return;

      if (link.classList.contains("is-active")) {
        trigger.classList.add("is-active");
      }

      link.addEventListener("click", closeOverflow);
      panel.appendChild(link);
    });

    overflow.classList.add("is-needed");
    nav.style.setProperty("--z7-mobile-nav-columns", String(totalSlots));
  }

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!overflow.classList.contains("is-open"), { focusFirst: false });
  });

  servicesTrigger?.addEventListener("click", closeOverflow);

  document.addEventListener("click", (event) => {
    if (!overflow.contains(event.target)) closeOverflow();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!overflow.classList.contains("is-open")) return;

    closeOverflow();
    trigger.focus();
  });

  panel.addEventListener("keydown", (event) => {
    const links = Array.from(panel.querySelectorAll("a"));
    const index = links.indexOf(document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      links[(index + 1 + links.length) % links.length]?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      links[(index - 1 + links.length) % links.length]?.focus();
    }
  });

  const scheduleRebuild = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 80);
  };

  mobileQuery.addEventListener?.("change", rebuild);
  window.addEventListener("resize", scheduleRebuild, { passive: true });
  window.addEventListener("orientationchange", scheduleRebuild);
  window.visualViewport?.addEventListener("resize", scheduleRebuild);

  rebuild();
})();
