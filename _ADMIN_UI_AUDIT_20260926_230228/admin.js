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

    const slot = $("#clerk-signin");

    state.clerk.mountSignIn(slot, {
      routing: "hash",

      /* Keep Sign Up available */
      withSignUp: true,

      transferable: false,

      signInFallbackRedirectUrl: "/admin/",

      appearance: {

        variables: {
          colorPrimary: "#d6b25e",
          colorBackground: "#080808",
          colorForeground: "#f4f4f4",
          colorMutedForeground: "#8a8a8a",

          colorInputBackground: "#0d0d0d",
          colorInputForeground: "#f4f4f4",

          colorNeutral: "#ffffff",

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
            background: "#080808",
            border:
              "1px solid rgba(214,178,94,.16)",
            boxShadow:
              "0 22px 60px rgba(0,0,0,.32)"
          },

          header: {
            gap: "5px"
          },

          headerTitle: {
            color: "#f4f4f4",
            fontSize: "18px",
            fontWeight: "650"
          },

          headerSubtitle: {
            color: "#7f7f7f",
            fontSize: "10px"
          },

          socialButtonsBlockButton: {
            minHeight: "38px",
            background: "#0d0d0d",
            border:
              "1px solid rgba(255,255,255,.10)",
            color: "#dddddd",
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
            color: "#bcbcbc",
            fontSize: "9px"
          },

          formFieldInput: {
            minHeight: "40px",
            background: "#0d0d0d",
            color: "#f4f4f4",
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
            background: "#080808"
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
            background: "#080808"
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

    } catch (error) {
      hide("#users-loading");

      toast(
        error.message || "Could not load users.",
        "error"
      );
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

