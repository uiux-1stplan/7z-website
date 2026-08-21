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

  const getChip = () => {
    let chip = document.getElementById(CONTROL_ID);
    if (chip) return chip;

    const privateAccessLink = getPrivateAccessLinks()[0];
    if (!privateAccessLink) return null;

    chip = document.createElement("button");
    chip.type = "button";
    chip.id = CONTROL_ID;
    chip.className = "z7-header-auth-chip";
    chip.innerHTML = '<span>LOGIN</span><b aria-hidden="true">↗</b>';

    privateAccessLink.insertAdjacentElement("afterend", chip);
    return chip;
  };

  const setChipState = (isAuthenticated) => {
    authenticated = Boolean(isAuthenticated);

    const chip = getChip();
    if (!chip) return;

    chip.classList.toggle("is-authenticated", authenticated);
    chip.setAttribute("aria-label", authenticated ? "Logout from 7Z private access" : "Login to 7Z private access");
    chip.querySelector("span").textContent = authenticated ? "LOGOUT" : "LOGIN";

    // Keep the original PRIVATE ACCESS item unchanged.
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

  const boot = () => {
    bind();
    readStatus();

    window.addEventListener("z7pa:session-change", () => {
      bind();
      readStatus();
    });

    window.addEventListener("pageshow", () => {
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