/* 7Z MAGIC — TRUE GLOBAL HEADER LOGO LOCK V22.6 */
(() => {
  "use strict";

  if (window.__Z7_HEADER_LOGO_V22_6__) return;
  window.__Z7_HEADER_LOGO_V22_6__ = true;

  const LOGO = "/media/main_logo/7ZMagic-signature-logo-20260828.png";
  const STYLE_ID = "z7-header-logo-v22-6-style";

  const CSS = `
    header a.brand,
    header .brand,
    .site-header a.brand,
    .site-header .brand {
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      outline: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    header a.brand img,
    header .brand img,
    .site-header a.brand img,
    .site-header .brand img,
    header img[data-z7-header-logo="true"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      object-position: center !important;
      border: 0 !important;
      border-radius: 0 !important;
      outline: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      transform: none !important;
      mix-blend-mode: screen !important;
    }

    header a.brand::before,
    header a.brand::after,
    header .brand::before,
    header .brand::after,
    .site-header a.brand::before,
    .site-header a.brand::after,
    .site-header .brand::before,
    .site-header .brand::after {
      display: none !important;
      content: none !important;
    }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;

    (document.head || document.documentElement).appendChild(style);
  }

  function candidateImages(root = document) {
    const selectors = [
      ".site-header .brand img",
      "header .brand img",
      "header a.brand img",
      "header img[data-logo]",
      "header img[class*='logo' i]",
      "header img[id*='logo' i]",
      "header img[alt*='7Z' i]",
      "header img[alt*='Magic' i]",
      "header a[href='/'] img",
      "header a[href='./'] img"
    ];

    const found = new Set();

    for (const selector of selectors) {
      try {
        root.querySelectorAll(selector).forEach((img) => found.add(img));
      } catch (_) {}
    }

    /*
      Fallback for header templates that have none of the usual class names:
      choose images whose current URL clearly looks like a brand asset.
    */
    try {
      root.querySelectorAll("header img").forEach((img) => {
        const src = String(
          img.currentSrc ||
          img.getAttribute("src") ||
          ""
        );

        if (/(?:7z|magic|logo|brand|main_logo)/i.test(src)) {
          found.add(img);
        }
      });
    } catch (_) {}

    return Array.from(found);
  }

  function enforce(root = document) {
    ensureStyle();

    for (const img of candidateImages(root)) {
      if (!(img instanceof HTMLImageElement)) continue;

      img.setAttribute("data-z7-header-logo", "true");

      if (img.getAttribute("src") !== LOGO) {
        img.setAttribute("src", LOGO);
      }

      if (img.hasAttribute("srcset")) {
        img.removeAttribute("srcset");
      }

      if (img.hasAttribute("sizes")) {
        img.removeAttribute("sizes");
      }

      img.loading = "eager";
      img.decoding = "async";
    }
  }

  let scheduled = false;

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      enforce(document);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => enforce(document),
      { once: true }
    );
  } else {
    enforce(document);
  }

  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("popstate", schedule, { passive: true });

  /*
    This is the key difference from previous attempts:
    if page JS swaps the header, changes src, or re-renders navigation,
    the real IMG gets corrected again.
  */
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" ||
        mutation.type === "attributes"
      ) {
        schedule();
        break;
      }
    }
  });

  const observe = () => {
    if (!document.documentElement) return;

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "class"]
    });
  };

  observe();
  setTimeout(() => enforce(document), 150);
  setTimeout(() => enforce(document), 650);
  setTimeout(() => enforce(document), 1600);
})();