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
  const sectionHead = document.querySelector(".z7pa-section-head");

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "z7pa-logout magnetic";
  logoutButton.id = "z7paLogoutButton";
  logoutButton.hidden = true;
  logoutButton.innerHTML = "<span>LOGOUT / SWITCH USER</span><b aria-hidden=\"true\">↗</b>";
  sectionHead?.appendChild(logoutButton);

  const normalizeAllowed = (payload) => {
    if (!payload || typeof payload !== "object") return [];
    if (payload.admin) return ADMIN_SCOPES;
    if (!Array.isArray(payload.allowed)) return [];
    return payload.allowed.filter((scope) => PUBLIC_SCOPES.includes(scope));
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
    if (logoutButton) logoutButton.hidden = !hasAccess;
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

  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.querySelector("span").textContent = "LOGGING OUT…";

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
      logoutButton.disabled = false;
      logoutButton.querySelector("span").textContent = "LOGOUT / SWITCH USER";
      clientId?.focus();
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
    card.addEventListener("pointerenter", () => { card.dataset.hovered = "true"; });
    card.addEventListener("pointerleave", () => { delete card.dataset.hovered; });
  });

  loadStatus();
})();