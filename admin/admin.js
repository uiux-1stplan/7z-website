(() => {
  "use strict";

  const loginView = document.querySelector("[data-admin-login-view]");
  const panelView = document.querySelector("[data-admin-panel-view]");
  const indicator = document.querySelector("[data-admin-indicator]");
  const form = document.getElementById("adminLoginForm");
  const clientId = document.getElementById("adminClientId");
  const accessKey = document.getElementById("adminAccessKey");
  const message = document.getElementById("adminMessage");
  const logout = document.querySelector("[data-admin-logout]");

  const setAuthenticated = (authenticated) => {
    if (loginView) loginView.hidden = authenticated;
    if (panelView) panelView.hidden = !authenticated;
    if (indicator) {
      indicator.textContent = authenticated ? "ACTIVE" : "LOCKED";
      indicator.classList.toggle("is-active", authenticated);
    }
  };

  const readStatus = async () => {
    try {
      const response = await fetch("/api/private-auth/admin-status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });
      const data = await response.json();
      setAuthenticated(Boolean(response.ok && data.authenticated));
    } catch {
      setAuthenticated(false);
    }
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    if (message) message.textContent = "VERIFYING ADMIN ACCESS…";

    try {
      const response = await fetch("/api/private-auth/admin-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId?.value || "",
          accessKey: accessKey?.value || ""
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (message) message.textContent = "ADMIN ACCESS NOT RECOGNIZED";
        if (accessKey) {
          accessKey.value = "";
          accessKey.focus();
        }
        return;
      }

      if (accessKey) accessKey.value = "";
      if (message) message.textContent = "";
      setAuthenticated(true);
    } catch {
      if (message) message.textContent = "ADMIN ACCESS TEMPORARILY UNAVAILABLE";
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  logout?.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      await fetch("/api/private-auth/admin-logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
    } finally {
      setAuthenticated(false);
      logout.disabled = false;
      if (clientId) clientId.focus();
    }
  });

  readStatus();
})();