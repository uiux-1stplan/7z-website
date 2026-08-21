(() => {
  "use strict";

  const PUBLIC_SCOPES = ["silla", "elcon", "tawjihi-quotation", "oman-partnership"];
  const ADMIN_SCOPES = ["silla", "elcon", "blueprint-html", "blueprint-pdf", "tawjihi-quotation", "oman-partnership"];

  const cards = Array.from(document.querySelectorAll("[data-z7pa-resource]"));
  const grid = document.querySelector("[data-z7pa-grid]");
  const loginPanel = document.querySelector("[data-z7pa-login-panel]");
  const form = document.getElementById("z7PrivateAccessLoginForm");
  const clientId = document.getElementById("z7HubClientId");
  const accessKey = document.getElementById("z7HubAccessKey");
  const message = document.getElementById("z7HubLoginMessage");
  const count = document.querySelector("[data-z7pa-count]");
  const label = document.querySelector("[data-z7pa-access-label]");
  const siteHeader = document.querySelector(".site-header");
  const headerSocials = document.querySelector(".header-socials");

  let currentHasAccess = false;

  const accessButton = document.createElement("button");
  accessButton.type = "button";
  accessButton.className = "z7pa-header-access magnetic";
  accessButton.id = "z7paHeaderAccessButton";
  accessButton.innerHTML = '<span>LOGIN</span><b aria-hidden="true">↗</b>';

  if (siteHeader) {
    siteHeader.insertBefore(accessButton, headerSocials || null);
  }

  const normalizeAllowed = (payload) => {
    if (!payload || typeof payload !== "object") return [];
    if (payload.admin) return ADMIN_SCOPES;
    if (!Array.isArray(payload.allowed)) return [];
    return payload.allowed.filter((scope) => PUBLIC_SCOPES.includes(scope));
  };

  const updateAccessButton = (hasAccess) => {
    currentHasAccess = hasAccess;
    accessButton.classList.toggle("is-authenticated", hasAccess);
    accessButton.setAttribute("aria-label", hasAccess ? "Logout from Private Access" : "Login to Private Access");
    accessButton.querySelector("span").textContent = hasAccess ? "LOGOUT" : "LOGIN";
  };

  const focusLogin = () => {
    if (loginPanel) {
      loginPanel.hidden = false;
      loginPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.setTimeout(() => clientId?.focus(), 350);
  };

  const applyAccess = (payload) => {
    const allowed = normalizeAllowed(payload);
    const isAdmin = Boolean(payload && payload.admin);
    const hasAccess = allowed.length > 0;

    document.body.classList.toggle("z7pa-is-locked", !hasAccess);
    document.body.classList.toggle("z7pa-is-admin", isAdmin);

    if (loginPanel) loginPanel.hidden = hasAccess;
    if (grid) grid.hidden = !hasAccess;

    cards.forEach((card) => {
      const scope = card.getAttribute("data-z7pa-resource");
      card.hidden = !allowed.includes(scope);
    });

    if (count) count.textContent = String(allowed.length).padStart(2, "0");
    if (label) label.textContent = isAdmin ? "ADMIN ACCESS" : (hasAccess ? "AUTHORIZED RESOURCE" : "LOGIN REQUIRED");

    updateAccessButton(hasAccess);

    if (message && hasAccess) message.textContent = "";
  };

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/private-auth/hub-status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });
      const payload = await response.json();
      applyAccess(response.ok ? payload : null);
    } catch {
      applyAccess(null);
    }
  };

  accessButton.addEventListener("click", async () => {
    if (!currentHasAccess) {
      if (message) message.textContent = "";
      focusLogin();
      return;
    }

    accessButton.disabled = true;
    accessButton.querySelector("span").textContent = "EXIT…";

    try {
      await fetch("/api/private-auth/hub-logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
    } finally {
      if (clientId) clientId.value = "";
      if (accessKey) accessKey.value = "";
      if (message) message.textContent = "SIGNED OUT";
      applyAccess(null);
      accessButton.disabled = false;
      focusLogin();
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    if (message) message.textContent = "VERIFYING ACCESS…";

    try {
      const response = await fetch("/api/private-auth/hub-login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId?.value || "",
          accessKey: accessKey?.value || ""
        })
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        if (message) message.textContent = "ACCESS NOT RECOGNIZED";
        if (accessKey) {
          accessKey.value = "";
          accessKey.focus();
        }
        applyAccess(null);
        return;
      }

      if (accessKey) accessKey.value = "";
      applyAccess(payload);
    } catch {
      if (message) message.textContent = "ACCESS TEMPORARILY UNAVAILABLE";
      applyAccess(null);
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  cards.forEach((card) => {
    card.addEventListener("pointerenter", () => {
      card.dataset.hovered = "true";
    });
    card.addEventListener("pointerleave", () => {
      delete card.dataset.hovered;
    });
  });

  loadStatus();
})();