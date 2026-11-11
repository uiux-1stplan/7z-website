(() => {
  "use strict";

  const state = {
    clerk: null,
    me: null,
    users: [],
  };

  const $ = (selector) => document.querySelector(selector);

  function show(element) {
    if (typeof element === "string") {
      element = $(element);
    }

    element?.classList.remove("hidden");
  }

  function hide(element) {
    if (typeof element === "string") {
      element = $(element);
    }

    element?.classList.add("hidden");
  }

  function applySpringText(element) {
    if (!element || element.dataset.springTextReady) return;
    element.dataset.springTextReady = "true";
    const label = element.textContent.trim();
    if (!label || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.setAttribute("aria-label", label);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    let index = 0;
    textNodes.forEach((node) => {
      const pieces = node.nodeValue.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      pieces.forEach((piece) => {
        if (!piece) return;
        if (/^\s+$/.test(piece)) {
          fragment.append(document.createTextNode(piece));
          return;
        }
        const word = document.createElement("span");
        word.className = "spring-word";
        word.setAttribute("aria-hidden", "true");
        word.style.setProperty("--spring-index", String(index++));
        word.textContent = piece;
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
  }

  function startSpringTextEngine() {
    const slot = $("#clerk-signin");
    const animateHeadings = () => {
      document.querySelectorAll("[data-spring-text], #clerk-signin .cl-headerTitle").forEach(applySpringText);
    };
    animateHeadings();
    if (slot) new MutationObserver(animateHeadings).observe(slot, { childList: true, subtree: true });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(message, type = "success") {
    const element = document.createElement("div");

    element.className = `toast ${type}`;
    element.textContent = message;

    $("#toast-stack").appendChild(element);

    setTimeout(() => {
      element.remove();
    }, 4200);
  }

  const AUDIT_STORAGE_KEY = "z7-admin-audit-v1";

  function readSystemAuditLogs() {
    try {
      const value = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function renderSystemAuditLogs() {
    const root = $("#system-audit-logs");
    if (!root) return;
    const entries = readSystemAuditLogs();
    root.innerHTML = entries.length
      ? entries.slice(0, 30).map((entry) => `<li class="audit-log-row"><span class="audit-log-dot" aria-hidden="true"></span><span class="audit-log-action">${escapeHtml(entry.action)}</span><time datetime="${escapeHtml(entry.time)}">${new Date(entry.time).toLocaleString("en-US", { timeZone: "Asia/Amman", dateStyle: "medium", timeStyle: "short" })}</time></li>`).join("")
      : '<li class="audit-log-empty">No system activity has been recorded.</li>';
  }

  function recordSystemAudit(action) {
    const entries = readSystemAuditLogs();
    entries.unshift({ action: String(action || "Admin action").slice(0, 100), time: new Date().toISOString() });
    try { localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries.slice(0, 100))); } catch { /* Private browsing can disable local storage. */ }
    renderSystemAuditLogs();
  }

  function clearSystemAuditLogs() {
    if (!window.confirm("Clear all local system audit logs?")) return;
    try { localStorage.removeItem(AUDIT_STORAGE_KEY); } catch { /* The view still clears when storage is unavailable. */ }
    renderSystemAuditLogs();
    toast("System audit logs cleared.");
  }

  function syncThemePills() {
    const light = document.documentElement.dataset.theme === "light";
    document.querySelectorAll(".theme-pill").forEach(button => {
      button.setAttribute("aria-pressed", String(light));
      const label = button.querySelector(".theme-pill__label");
      if (label) label.textContent = light ? "Light" : "Dark";
      button.title = "Current theme: " + (light ? "Light" : "Dark") + ". Activate to switch.";
    });
  }

  async function loadExternalScript(src, attributes = {}) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";

      for (const [key, value] of Object.entries(attributes)) {
        script.setAttribute(key, value);
      }

      script.onload = resolve;

      script.onerror = () => {
        reject(new Error(`Could not load ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  async function getPublicConfig() {
    const response = await fetch("/api/portal/config", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        "Portal authentication configuration is unavailable."
      );
    }

    return response.json();
  }

  function clerkFrontendDomain(publishableKey) {
    const pieces = publishableKey.split("_");

    if (pieces.length < 3) {
      throw new Error("Invalid Clerk publishable key.");
    }

    return atob(pieces[2]).slice(0, -1);
  }

  async function initializeClerk() {
    const { publishableKey } = await getPublicConfig();

    if (!publishableKey) {
      throw new Error("Missing Clerk publishable key.");
    }

    const domain = clerkFrontendDomain(publishableKey);

    await loadExternalScript(
      `https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`
    );

    await loadExternalScript(
      `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
      {
        "data-clerk-publishable-key": publishableKey,
      }
    );

    if (!window.Clerk) {
      throw new Error("ClerkJS failed to initialize.");
    }

    await window.Clerk.load({
      ui: {
        ClerkUI: window.__internal_ClerkUICtor,
      },

      signInFallbackRedirectUrl: "/admin/",
    });

    state.clerk = window.Clerk;
  }

  async function authHeaders() {
    const token =
      await state.clerk?.session?.getToken();

    if (!token) {
      throw new Error("Authentication session is unavailable.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function portalFetch(url, options = {}) {
    const headers = {
      ...(await authHeaders()),
      ...(options.headers || {}),
    };

    if (
      options.body &&
      typeof options.body !== "string"
    ) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const error = new Error(
        data.error || `Request failed (${response.status})`
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  async function mountSignIn() {
    hide("#boot-screen");
    show("#auth-screen");
    startSpringTextEngine();

    const slot = $("#clerk-signin");

    state.clerk.mountSignIn(slot, {
      routing: "hash",

      /* Keep Sign Up available */
      withSignUp: true,

      transferable: false,

      signInFallbackRedirectUrl: "/admin/",

      appearance: {

        variables: {
          colorPrimary: "var(--accent)",
          colorBackground: "var(--panel)",
          colorForeground: "var(--text)",
          colorMutedForeground: "var(--muted)",

          colorInputBackground: "var(--bg-raised)",
          colorInputForeground: "var(--text)",

          colorNeutral: "var(--text)",

          borderRadius: "10px",

          fontFamily: "inherit",
          fontSize: "12px"
        },

        elements: {

          rootBox: {
            width: "100%",
            maxWidth: "330px",
            margin: "0 auto"
          },

          cardBox: {
            width: "100%",
            maxWidth: "330px",
            boxShadow: "none"
          },

          card: {
            width: "100%",
            maxWidth: "330px",
            padding: "22px",
            background: "var(--panel)",
            border:
              "1px solid rgba(214,178,94,.16)",
            boxShadow:
              "0 22px 60px rgba(0,0,0,.32)"
          },

          header: {
            gap: "5px"
          },

          headerTitle: {
            color: "var(--text)",
            fontSize: "18px",
            fontWeight: "650"
          },

          headerSubtitle: {
            color: "var(--muted)",
            fontSize: "10px"
          },

          socialButtonsBlockButton: {
            minHeight: "38px",
            background: "var(--bg-raised)",
            border:
              "1px solid rgba(255,255,255,.10)",
            color: "var(--text)",
            boxShadow: "none"
          },

          socialButtonsBlockButtonText: {
            fontSize: "10px",
            fontWeight: "550"
          },

          dividerLine: {
            background:
              "rgba(255,255,255,.08)"
          },

          dividerText: {
            color: "#666666",
            fontSize: "9px"
          },

          formFieldLabel: {
            color: "var(--text)",
            fontSize: "9px"
          },

          formFieldInput: {
            minHeight: "40px",
            background: "var(--bg-raised)",
            color: "var(--text)",
            border:
              "1px solid rgba(255,255,255,.11)",
            boxShadow: "none"
          },

          formButtonPrimary: {
            minHeight: "40px",
            background: "#d6b25e",
            color: "#090909",
            fontSize: "10px",
            fontWeight: "700",
            boxShadow: "none"
          },

          footer: {
            background: "var(--panel)"
          },

          footerActionText: {
            color: "#747474",
            fontSize: "9px"
          },

          footerActionLink: {
            color: "#d6b25e",
            fontSize: "9px",
            fontWeight: "650"
          },

          footerPages: {
            background: "var(--panel)"
          }
        }
      }
    });
  }

  async function loadMe() {
    const data =
      await portalFetch("/api/portal/me");

    state.me = data.user;

    return data.user;
  }

  async function enterApplication() {
    const me = await loadMe();

    hide("#boot-screen");
    hide("#auth-screen");

    if (me.role !== "admin") {
      show("#denied-screen");
      return;
    }

    $("#admin-name").textContent =
      me.name || "Administrator";

    $("#admin-email").textContent =
      me.email || "";

    show("#app");

    state.clerk.mountUserButton(
      $("#clerk-user-button"),
      {
        afterSignOutUrl: "/admin/",
      }
    );

    await loadUsers();
    document.dispatchEvent(new Event("z7:admin-ready"));
  }

  function updateStats() {
    const users = state.users;

    $("#stat-users").textContent =
      users.length;

    $("#stat-active").textContent =
      users.filter(
        (user) => user.status === "active"
      ).length;

    $("#stat-admins").textContent =
      users.filter(
        (user) => user.role === "admin"
      ).length;
  }

  function renderUsers() {
    const body = $("#users-body");

    body.innerHTML = "";

    updateStats();

    hide("#users-loading");

    if (!state.users.length) {
      hide("#users-table-wrap");
      show("#users-empty");
      return;
    }

    hide("#users-empty");
    show("#users-table-wrap");

    for (const user of state.users) {
      const isSelf =
        user.id === state.me.id;

      const row =
        document.createElement("tr");

      const safeName =
        escapeHtml(user.name || "Unnamed user");

      const safeEmail =
        escapeHtml(user.email);

      const safeCompany =
        escapeHtml(user.company || "—");

      row.innerHTML = `
        <td>
          <div class="user-cell">
            <strong>${safeName}${isSelf ? " · You" : ""}</strong>
            <span>${safeEmail}</span>
          </div>
        </td>

        <td>${safeCompany}</td>

        <td>
          <span class="role-badge ${escapeHtml(user.role)}">
            ${escapeHtml(user.role.toUpperCase())}
          </span>
        </td>

        <td>
          <span class="status-badge ${escapeHtml(user.status)}">
            ${escapeHtml(user.status.toUpperCase())}
          </span>
        </td>

        <td>
          <div class="row-actions">
            <button type="button" class="small-button edit-action" data-user-id="${escapeHtml(user.id)}" aria-label="Edit user ${safeEmail}">EDIT</button>



            <button
              type="button"
              class="small-button password-action"
              data-user-id="${escapeHtml(user.id)}"
              data-user-email="${safeEmail}">
              PASSWORD
            </button>

            <button
              type="button"
              class="small-button role-action"
              data-user-id="${escapeHtml(user.id)}"
              data-role="${escapeHtml(user.role)}"
              ${isSelf ? "disabled" : ""}>
              ${user.role === "admin" ? "MAKE USER" : "MAKE ADMIN"}
            </button>

            <button
              type="button"
              class="small-button status-action ${user.status === "active" ? "danger" : ""}"
              data-user-id="${escapeHtml(user.id)}"
              data-status="${escapeHtml(user.status)}"
              ${isSelf ? "disabled" : ""}>
              ${user.status === "active" ? "DISABLE" : "ENABLE"}
            </button>

            <button
              type="button"
              class="small-button danger delete-action"
              data-user-id="${escapeHtml(user.id)}"
              data-user-email="${safeEmail}"
              ${isSelf ? "disabled" : ""}
              aria-label="Delete user ${safeEmail}">
              DELETE
            </button>

          </div>
        </td>
      `;

      body.appendChild(row);
    }
  }

  async function loadUsers() {
    show("#users-loading");
    hide("#users-table-wrap");
    hide("#users-empty");

    try {
      const data =
        await portalFetch("/api/admin/users");

      state.users =
        Array.isArray(data.users)
          ? data.users
          : [];

      renderUsers();
      window.dispatchEvent(new CustomEvent("z7:users-updated", { detail: { users: state.users } }));

    } catch (error) {
      hide("#users-loading");

      toast(
        error.message || "Could not load users.",
        "error"
      );
    }
  }

  function openUserEditModal(userId) {
    const user = state.users.find((item) => String(item.id) === String(userId));
    if (!user) return;
    $("#user-edit-id").value = String(user.id);
    $("#user-edit-name").value = user.name || "";
    $("#user-edit-company").value = user.company || "";
    show("#user-edit-modal");
    setTimeout(() => $("#user-edit-name")?.focus(), 40);
  }

  function closeUserEditModal() {
    hide("#user-edit-modal");
    $("#user-edit-id").value = "";
    $("#user-edit-form")?.reset();
  }

  async function saveUserEdit(event) {
    event.preventDefault();
    const id = $("#user-edit-id").value;
    const button = $("#user-edit-submit");
    const payload = { userId: id, displayName: $("#user-edit-name").value.trim(), company: $("#user-edit-company").value.trim() };
    if (!payload.displayName) return toast("Display name is required.", "error");
    button.disabled = true; button.textContent = "Saving…";
    try {
      const result = await portalFetch("/api/admin/users", { method: "PATCH", body: payload });
      const updated = result.user || {};
      state.users = state.users.map((item) => String(item.id) === String(id) ? { ...item, ...updated, name: updated.name || payload.displayName, company: updated.company ?? payload.company } : item);
      renderUsers();
      window.dispatchEvent(new CustomEvent("z7:users-updated", { detail: { users: state.users } }));
      window.dispatchEvent(new CustomEvent("z7:admin-audit", { detail: { action: "User profile updated" } }));
      closeUserEditModal();
      toast("User profile updated.");
    } catch (error) {
      toast(error.message || "Could not update user.", "error");
    } finally {
      button.disabled = false; button.textContent = "Save changes";
    }
  }

  async function deleteUser(userId, email, button) {
    const user = state.users.find((item) => String(item.id) === String(userId));
    if (!user || String(userId) === String(state.me?.id)) return;
    if (!window.confirm("Permanently delete " + (email || user.name || "this user") + "? This removes the account and its access.")) return;

    if (button) button.disabled = true;
    try {
      await portalFetch("/api/admin/users", {
        method: "DELETE",
        body: { id: userId, userId },
      });
      state.users = state.users.filter((item) => String(item.id) !== String(userId));
      renderUsers();
      window.dispatchEvent(new CustomEvent("z7:users-updated", { detail: { users: state.users } }));
      window.dispatchEvent(new CustomEvent("z7:admin-audit", { detail: { action: "User account deleted" } }));
      toast("User deleted successfully.");
    } catch (error) {
      toast(error.message || "Could not delete user.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function createUser(event) {
    event.preventDefault();

    const button =
      $("#create-submit");

    const payload = {
      displayName:
        $("#create-name").value.trim(),

      email:
        $("#create-email").value.trim(),

      company:
        $("#create-company").value.trim(),

      password:
        $("#create-password").value,

      role:
        $("#create-role").value,
    };

    button.disabled = true;
    button.textContent = "Creating…";

    try {
      await portalFetch(
        "/api/admin/users",
        {
          method: "POST",
          body: payload,
        }
      );

      event.currentTarget.reset();

      toast(
        `Account created for ${payload.email}.`
      );

      await loadUsers();

    } catch (error) {
      toast(
        error.message || "User creation failed.",
        "error"
      );

    } finally {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  }

  function openPasswordModal(userId, email) {
    $("#password-user-id").value =
      userId;

    $("#password-user-label").textContent =
      `Set a new password for ${email}.`;

    $("#new-password").value = "";

    show("#password-modal");

    setTimeout(() => {
      $("#new-password").focus();
    }, 50);
  }

  function closePasswordModal() {
    hide("#password-modal");

    $("#password-user-id").value = "";
    $("#new-password").value = "";
  }

  async function changePassword(event) {
    event.preventDefault();

    const userId =
      $("#password-user-id").value;

    const password =
      $("#new-password").value;

    const button =
      $("#password-submit");

    button.disabled = true;
    button.textContent = "Updating…";

    try {
      await portalFetch(
        "/api/admin/user-password",
        {
          method: "POST",

          body: {
            userId,
            password,
          },
        }
      );

      closePasswordModal();

      toast(
        "Password updated successfully."
      );

    } catch (error) {
      toast(
        error.message ||
          "Password update failed.",
        "error"
      );

    } finally {
      button.disabled = false;
      button.textContent = "Update Password";
    }
  }

  async function changeRole(userId, currentRole) {
    const role =
      currentRole === "admin"
        ? "user"
        : "admin";

    const message =
      role === "admin"
        ? "Give this user administrator access?"
        : "Remove administrator access from this user?";

    if (!window.confirm(message)) {
      return;
    }

    try {
      await portalFetch(
        "/api/admin/user-role",
        {
          method: "POST",

          body: {
            userId,
            role,
          },
        }
      );

      toast(
        role === "admin"
          ? "Administrator access granted."
          : "Administrator access removed."
      );

      await loadUsers();

    } catch (error) {
      toast(
        error.message ||
          "Role update failed.",
        "error"
      );
    }
  }

  async function changeStatus(
    userId,
    currentStatus
  ) {
    const status =
      currentStatus === "active"
        ? "disabled"
        : "active";

    const message =
      status === "disabled"
        ? "Disable this user account?"
        : "Enable this user account?";

    if (!window.confirm(message)) {
      return;
    }

    try {
      await portalFetch(
        "/api/admin/user-status",
        {
          method: "POST",

          body: {
            userId,
            status,
          },
        }
      );

      toast(
        status === "active"
          ? "User account enabled."
          : "User account disabled."
      );

      await loadUsers();

    } catch (error) {
      toast(
        error.message ||
          "Status update failed.",
        "error"
      );
    }
  }

  function bindEvents() {
    document.addEventListener("z7:admin-audit", (event) => recordSystemAudit(event.detail?.action));
    $("#clear-system-logs")?.addEventListener("click", clearSystemAuditLogs);
    renderSystemAuditLogs();

    syncThemePills();
    new MutationObserver(syncThemePills).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    $("#user-edit-form")?.addEventListener("submit", saveUserEdit);
    document.querySelectorAll("[data-close-user-edit]").forEach((element) => element.addEventListener("click", closeUserEditModal));

    $("#create-user-form")
      .addEventListener(
        "submit",
        createUser
      );

    $("#password-form")
      .addEventListener(
        "submit",
        changePassword
      );

    $("#refresh-users")
      .addEventListener(
        "click",
        loadUsers
      );

    $("#users-body")
      .addEventListener(
        "click",
        (event) => {

          const edit = event.target.closest(".edit-action");
          if (edit) { openUserEditModal(edit.dataset.userId); return; }

          const password =
            event.target.closest(
              ".password-action"
            );

          if (password) {
            openPasswordModal(
              password.dataset.userId,
              password.dataset.userEmail
            );

            return;
          }

          const role =
            event.target.closest(
              ".role-action"
            );

          if (
            role &&
            !role.disabled
          ) {
            changeRole(
              role.dataset.userId,
              role.dataset.role
            );

            return;
          }

          const status =
            event.target.closest(
              ".status-action"
            );

          if (
            status &&
            !status.disabled
          ) {
            changeStatus(
              status.dataset.userId,
              status.dataset.status
            );
            return;
          }

          const remove = event.target.closest(".delete-action");
          if (remove && !remove.disabled) {
            deleteUser(remove.dataset.userId, remove.dataset.userEmail, remove);
          }
        }
      );

    document
      .querySelectorAll(
        "[data-close-modal]"
      )
      .forEach((element) => {
        element.addEventListener(
          "click",
          closePasswordModal
        );
      });

    document
      .querySelectorAll(
        ".toggle-password"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            const input =
              document.getElementById(
                button.dataset.target
              );

            const show =
              input.type === "password";

            input.type =
              show
                ? "text"
                : "password";

            button.textContent =
              show
                ? "HIDE"
                : "SHOW";
          }
        );
      });

    $("#denied-signout")
      .addEventListener(
        "click",
        async () => {
          await state.clerk.signOut();
          location.href = "/admin/";
        }
      );
  }

  async function boot() {
    bindEvents();

    try {
      await initializeClerk();

      if (!state.clerk.isSignedIn) {
        await mountSignIn();
        return;
      }

      try {
        await enterApplication();

      } catch (error) {

        if (
          error.status === 401 ||
          error.status === 403
        ) {
          hide("#boot-screen");
          hide("#auth-screen");
          show("#denied-screen");
          return;
        }

        throw error;
      }

    } catch (error) {
      console.error(error);

      hide("#boot-screen");

      toast(
        error.message ||
          "Portal initialization failed.",
        "error"
      );

      const stateCard =
        document.createElement("div");

      stateCard.className =
        "center-state";

      stateCard.innerHTML = `
        <div class="state-card">
          <span class="eyebrow">PORTAL ERROR</span>
          <h1>Unable to initialize.</h1>
          <p>
            ${escapeHtml(
              error.message ||
              "Please try again."
            )}
          </p>
          <button
            class="button button-primary"
            onclick="location.reload()">
            Retry
          </button>
        </div>
      `;

      document.body.appendChild(
        stateCard
      );
    }
  }

  boot();
})();


