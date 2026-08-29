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
    "/oman-market-partnership/",
    "/private-access/scmc-7z-proposal/"
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

    logoImg.src = "/media/main_logo/7ZMagic-brand-canonical.png?v=20260829-v34-single-source";
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

    logoImg.src = "/media/main_logo/7ZMagic-brand-canonical.png?v=20260829-v34-single-source";
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