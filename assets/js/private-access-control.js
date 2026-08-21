(() => {
  "use strict";

  if (window.__z7GlobalAccessControlLoaded) return;
  window.__z7GlobalAccessControlLoaded = true;

  const CONTROL_ID = "z7GlobalAccessControl";
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

  const makeButton = () => {
    let button = document.getElementById(CONTROL_ID);
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.id = CONTROL_ID;
    button.className = "z7-global-access-control";
    button.innerHTML = '<span>LOGIN</span><b aria-hidden="true">↗</b>';
    document.body.appendChild(button);
    return button;
  };

  const setButtonState = (isAuthenticated) => {
    authenticated = Boolean(isAuthenticated);
    const button = makeButton();
    button.classList.toggle("is-authenticated", authenticated);
    button.setAttribute("aria-label", authenticated ? "Logout from 7Z private access" : "Login to 7Z private access");
    button.querySelector("span").textContent = authenticated ? "LOGOUT" : "LOGIN";
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

      setButtonState(hasAccess);
    } catch {
      setButtonState(false);
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
    const button = makeButton();
    busy = true;
    button.disabled = true;
    button.querySelector("span").textContent = "EXIT…";

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
      button.disabled = false;
      setButtonState(false);
      window.dispatchEvent(new CustomEvent("z7pa:session-change"));

      if (isProtectedPath() && !isPrivateAccessPage()) {
        window.location.href = "/private-access/?loggedout=1";
      }
    }
  };

  const boot = () => {
    const button = makeButton();

    button.addEventListener("click", () => {
      if (busy) return;
      if (authenticated) logout();
      else goLogin();
    });

    readStatus();

    window.addEventListener("z7pa:session-change", readStatus);
    window.addEventListener("pageshow", readStatus);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();