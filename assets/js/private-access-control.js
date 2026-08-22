(() => {
  "use strict";

  if (window.__z7GlobalAccessControlLoaded) return;
  window.__z7GlobalAccessControlLoaded = true;

  const CONTROL_ID = "z7HeaderAuthChip";
  const PROTECTED_PATHS = [
    "/silla-hall-presentation/",
    "/elcon-arabia-presentation/",
    "/strategic-blueprint/",
    "/api/private-documents/blueprint",
    "/tawjihi-english-quotation/",
    "/oman-market-partnership/"
  ];

  let authenticated = false;
  let busy = false;

  const isPrivateAccessPage = () => location.pathname.replace(/\/+$/, "/") === "/private-access/";
  const isProtectedPath = () => PROTECTED_PATHS.some((path) => location.pathname.startsWith(path));

  const getPrivateAccessLinks = () => {
    const selectors = [
      ".site-header a[href='/private-access/']",
      ".site-header a[href='/private-access']",
      "header a[href='/private-access/']",
      "header a[href='/private-access']",
      ".main-header a[href='/private-access/']",
      ".main-header a[href='/private-access']"
    ];

    return [...new Set(selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))))];
  };

  const findSocialContainer = () => {
    const header = document.querySelector(".site-header, .main-header, header");
    if (!header) return null;

    const socialItems = Array.from(header.querySelectorAll(".social-icon, a[aria-label='Instagram'], a[aria-label='Facebook'], a[aria-label='LinkedIn'], a[aria-label='Email']"));
    if (!socialItems.length) return null;

    const scoredParents = socialItems
      .map((item) => item.parentElement)
      .filter(Boolean)
      .map((parent) => ({
        parent,
        count: parent.querySelectorAll(".social-icon, a[aria-label='Instagram'], a[aria-label='Facebook'], a[aria-label='LinkedIn'], a[aria-label='Email']").length
      }))
      .sort((a, b) => b.count - a.count);

    return scoredParents[0]?.parent || socialItems[0].parentElement;
  };

  const getChip = () => {
    let chip = document.getElementById(CONTROL_ID);
    if (chip) return chip;

    const socialContainer = findSocialContainer();
    if (!socialContainer) return null;

    chip = document.createElement("button");
    chip.type = "button";
    chip.id = CONTROL_ID;
    chip.className = "z7-header-auth-chip";
    chip.innerHTML = '<span>LOGIN</span><b aria-hidden="true">↗</b>';

    socialContainer.appendChild(chip);
    socialContainer.classList.add("z7-socials-with-auth");
    return chip;
  };

  const setChipState = (isAuthenticated) => {
    authenticated = Boolean(isAuthenticated);

    const chip = getChip();
    if (!chip) return;

    chip.classList.toggle("is-authenticated", authenticated);
    chip.setAttribute("aria-label", authenticated ? "Logout from 7Z private access" : "Login to 7Z private access");
    chip.querySelector("span").textContent = authenticated ? "LOGOUT" : "LOGIN";

    getPrivateAccessLinks().forEach((link) => {
      if (!link.dataset.z7OriginalLabel) {
        link.dataset.z7OriginalLabel = link.textContent.trim() || "PRIVATE ACCESS";
      }
      link.textContent = link.dataset.z7OriginalLabel;
    });
  };

  const readStatus = async () => {
    try {
      const response = await fetch("/api/private-auth/hub-status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      const payload = await response.json();
      const hasAccess = Boolean(
        response.ok &&
        payload &&
        (payload.admin || (Array.isArray(payload.allowed) && payload.allowed.length > 0))
      );

      setChipState(hasAccess);
    } catch {
      setChipState(false);
    }
  };

  const goLogin = () => {
    if (isPrivateAccessPage()) {
      window.dispatchEvent(new CustomEvent("z7pa:focus-login"));

      const panel = document.querySelector("[data-z7pa-login-panel]");
      if (panel) {
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      window.setTimeout(() => document.getElementById("z7HubClientId")?.focus(), 350);
      return;
    }

    window.location.href = "/private-access/?login=1";
  };

  const logout = async () => {
    const chip = getChip();
    busy = true;

    if (chip) {
      chip.disabled = true;
      chip.classList.add("is-busy");
      chip.querySelector("span").textContent = "EXIT…";
    }

    try {
      await fetch("/api/private-auth/hub-logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
    } finally {
      busy = false;

      if (chip) {
        chip.disabled = false;
        chip.classList.remove("is-busy");
      }

      setChipState(false);
      window.dispatchEvent(new CustomEvent("z7pa:session-change"));

      if (isProtectedPath() && !isPrivateAccessPage()) {
        window.location.href = "/private-access/?loggedout=1";
      }
    }
  };

  const bind = () => {
    const chip = getChip();
    if (!chip || chip.dataset.z7AccessBound === "true") return;

    chip.dataset.z7AccessBound = "true";

    chip.addEventListener("click", (event) => {
      event.preventDefault();
      if (busy) return;

      if (authenticated) logout();
      else goLogin();
    });
  };


  const cleanHeaderLogo = () => {
    const header = document.querySelector(".site-header, .main-header, header");
    if (!header) return;

    const logoImg = Array.from(header.querySelectorAll("img")).find((img) => {
      const src = String(img.getAttribute("src") || "");
      const alt = String(img.getAttribute("alt") || "");
      return /7ZLogo|7z|logo/i.test(src) || /7Z|7z|Magic/i.test(alt);
    });

    if (!logoImg) return;

    logoImg.classList.add("z7-clean-header-logo__img");

    const logoWrap = logoImg.closest("a, .brand, .logo, .site-logo, .brand-logo, .logo-mark, div, span");
    if (logoWrap) {
      logoWrap.classList.add("z7-clean-header-logo");
    }
  };

  const boot = () => {
    cleanHeaderLogo();
    bind();
    readStatus();

    window.addEventListener("z7pa:session-change", () => {
      bind();
      readStatus();
    });

    window.addEventListener("pageshow", () => {
      cleanHeaderLogo();
      bind();
      readStatus();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
/* Transparent header logo patch */
(() => {
  "use strict";

  const applyTransparentHeaderLogo = () => {
    const header = document.querySelector(".site-header, .main-header, header");
    if (!header) return;

    const logoImg = Array.from(header.querySelectorAll("img")).find((img) => {
      const src = String(img.getAttribute("src") || "");
      const alt = String(img.getAttribute("alt") || "");
      return /7ZLogo|7z|logo/i.test(src) || /7Z|7z|Magic/i.test(alt);
    });

    if (!logoImg) return;

    logoImg.src = "/media/main_logo/7ZLogo-header-transparent.png";
    logoImg.classList.add("z7-clean-header-logo__img");

    let node = logoImg.parentElement;
    let depth = 0;

    while (node && node !== header && depth < 4) {
      node.classList.add("z7-clean-header-logo");
      node = node.parentElement;
      depth += 1;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTransparentHeaderLogo, { once: true });
  } else {
    applyTransparentHeaderLogo();
  }

  window.addEventListener("pageshow", applyTransparentHeaderLogo);
})();
/* End transparent header logo patch */
/* 7Z Arabic transparent header logo */
(() => {
  "use strict";

  const applyArabicHeaderLogo = () => {
    const header = document.querySelector(".site-header, .main-header, header");
    if (!header) return;

    const logoImg = Array.from(header.querySelectorAll("img")).find((img) => {
      const src = String(img.getAttribute("src") || "");
      const alt = String(img.getAttribute("alt") || "");
      return /7ZLogo|7z|logo/i.test(src) || /7Z|7z|Magic/i.test(alt);
    });

    if (!logoImg) return;

    logoImg.src = "/media/main_logo/7ZMagic-header-arabic-transparent.png";
    logoImg.classList.add("z7-arabic-header-logo__img");

    let node = logoImg.parentElement;
    let depth = 0;

    while (node && node !== header && depth < 5) {
      node.classList.add("z7-arabic-header-logo");
      node = node.parentElement;
      depth += 1;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyArabicHeaderLogo, { once: true });
  } else {
    applyArabicHeaderLogo();
  }

  window.addEventListener("pageshow", applyArabicHeaderLogo);
})();
/* End 7Z Arabic transparent header logo */
/* 7Z text visibility rescue */
(() => {
  "use strict";

  if (window.__z7TextVisibilityRescueLoaded) return;
  window.__z7TextVisibilityRescueLoaded = true;

  const selectors = [
    ".manifest__copy > *",
    ".service-loop__intro > *",
    ".chapter__intro > *",
    ".gallery-copy > *",
    ".pin-copy > *",
    ".web-copy > *",
    ".reach-copy > *",
    ".film-copy > *",
    ".ai-heading > *",
    ".studio-suite__intro > *",
    ".footer__brand *",
    ".footer__contact > *",
    ".footer__bottom > *"
  ];

  const isTextElement = (element) => {
    return element && element.textContent && element.textContent.trim().length > 0;
  };

  const shouldSkip = (element) => {
    if (!element || !(element instanceof HTMLElement)) return true;
    if (!isTextElement(element)) return true;
    if (element.closest("#loader, .loader, .preloader")) return true;
    if (element.closest(".site-header, .main-header, header")) return true;
    if (element.closest(".services-panel")) return true;
    if (element.closest(".intro")) return true;
    return false;
  };

  const isInView = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.94 && rect.bottom > window.innerHeight * 0.04;
  };

  const rescue = () => {
    const targets = Array.from(new Set(document.querySelectorAll(selectors.join(", "))));

    targets.forEach((element) => {
      if (shouldSkip(element)) return;
      if (!isInView(element)) return;

      window.setTimeout(() => {
        if (shouldSkip(element)) return;
        if (!isInView(element)) return;

        if (window.gsap && window.gsap.isTweening && window.gsap.isTweening(element)) return;

        const style = window.getComputedStyle(element);
        const opacity = Number.parseFloat(style.opacity || "1");
        const hidden = style.visibility === "hidden" || opacity < 0.08;

        if (!hidden) return;

        element.style.opacity = "1";
        element.style.visibility = "visible";
        element.style.filter = "none";
        element.style.transform = "none";
        element.style.removeProperty("will-change");
      }, 950);
    });
  };

  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(rescue, 180);
  };

  window.addEventListener("load", () => {
    schedule();
    window.setTimeout(rescue, 1200);
    window.setTimeout(rescue, 2600);
  });

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
})();
/* End 7Z text visibility rescue */