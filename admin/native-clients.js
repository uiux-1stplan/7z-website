(() => {

  "use strict";

  const API =
    "/api/admin/clients";

  const LIST_API =
    "/api/admin/all-clients";


  function esc(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  async function authFetch(
    url,
    options = {}
  ) {

    let token = null;

    try {

      token =
        await window
          .Clerk
          ?.session
          ?.getToken?.();

    } catch {}


    const headers = {
      ...(options.headers || {})
    };


    if (token) {

      headers.Authorization =
        `Bearer ${token}`;
    }


    return fetch(
      url,
      {
        ...options,
        headers,

        credentials:
          "same-origin",

        cache:
          "no-store"
      }
    );
  }


  function target() {

    return (
      document.querySelector(
        "#z7-native-clients-mount"
      ) ||

      document.querySelector(
        "#z7-private-upload-panel"
      )?.parentElement ||

      document.querySelector(
        "#legacy-file-access-panel"
      )?.parentElement ||

      document.querySelector(
        "#app main"
      ) ||

      document.querySelector(
        "#app"
      )
    );
  }


  function removeOldCreateForm() {

    const oldForm =
      document.getElementById(
        "create-form"
      );

    if (oldForm) {

      oldForm.hidden = true;

      oldForm.style.display =
        "none";
    }
  }


  function ensurePanel() {

    removeOldCreateForm();


    if (
      document.getElementById(
        "z7-native-clients"
      )
    ) {
      return;
    }


    const container =
      target();


    if (!container) {
      return;
    }


    const panel =
      document.createElement(
        "section"
      );


    panel.id =
      "z7-native-clients";

    panel.className =
      "panel z7-native-clients";


    panel.innerHTML = `
      <div class="z7nc-head">
        <div>
          <div class="page-kicker">CLIENT DIRECTORY / VIP PROFILES</div>
          <h2>Client Directory</h2>
          <p>Govern VIP identities, portal credentials, and project spaces.</p>
        </div>
        <div class="z7nc-header-actions">
          <div class="z7nc-search-box">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="search" id="z7nc-search-input" class="z7nc-search-input" placeholder="Search clients by name, ID, or company…" aria-label="Search clients">
          </div>
          <span class="z7nc-badge z7nc-client-count" id="z7nc-client-count" aria-live="polite">0 CLIENTS</span>
          <button type="button" id="z7nc-toggle-create-btn" class="button button-primary z7nc-new-account-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span>+ New Client Account</span>
          </button>
        </div>
      </div>

      <div class="z7nc-drawer-overlay hidden" id="z7nc-drawer-overlay">
        <div class="z7nc-drawer-backdrop" id="z7nc-drawer-backdrop"></div>
        <div class="z7nc-create-box z7nc-create-drawer" id="z7nc-create-drawer" role="dialog" aria-modal="true" aria-labelledby="z7nc-drawer-title">
          <div class="z7nc-create-box__head">
            <div>
              <span class="eyebrow">NEW CLIENT PROFILE</span>
              <h3 id="z7nc-drawer-title">Register VIP Client Account</h3>
              <p>Provision credentials for the private deliverables portal.</p>
            </div>
            <button type="button" class="z7nc-drawer-close" id="z7nc-close-drawer" aria-label="Close form">×</button>
          </div>
          <div class="z7nc-form">
            <div class="z7nc-form-fields">
              <label class="z7nc-field">
                <span>Display Name</span>
                <input id="z7nc-name" type="text" autocomplete="off" placeholder="e.g. Acme Corporation" required>
              </label>
              <label class="z7nc-field">
                <span>Client ID / Username</span>
                <input id="z7nc-client-id" type="text" autocomplete="off" placeholder="e.g. acme-client" required>
              </label>
              <label class="z7nc-field">
                <span>Company / Organization</span>
                <input id="z7nc-company" type="text" autocomplete="off" placeholder="e.g. Acme Studios">
              </label>
              <label class="z7nc-field">
                <span>Password (12+ chars)</span>
                <input id="z7nc-password" type="password" autocomplete="new-password" placeholder="Minimum 12 characters" required>
              </label>
            </div>
            <div class="z7nc-drawer-actions">
              <button type="button" id="z7nc-create" class="button button-primary">CREATE CLIENT ACCOUNT ↗</button>
              <button type="button" id="z7nc-cancel-drawer" class="button button-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <div id="z7nc-message" class="z7nc-message"></div>
      <div id="z7nc-list" class="z7nc-list"></div>

      <div id="z7nc-password-modal" class="z7nc-modal" hidden>
        <div class="z7nc-modal-backdrop"></div>
        <div class="z7nc-modal-card">
          <div class="z7nc-modal-head">
            <div>
              <div class="page-kicker">SECURITY</div>
              <h3>Change Client Password</h3>
              <p id="z7nc-password-client"></p>
            </div>
            <button type="button" id="z7nc-modal-close" class="z7nc-modal-close">×</button>
          </div>
          <input id="z7nc-new-password" type="password" autocomplete="new-password" placeholder="New password — minimum 12 characters">
          <input id="z7nc-confirm-password" type="password" autocomplete="new-password" placeholder="Confirm new password">
          <div id="z7nc-modal-message" class="z7nc-message"></div>
          <button type="button" id="z7nc-password-save" class="z7nc-password-save">UPDATE PASSWORD</button>
        </div>
      </div>
    `;

    // Wire drawer overlay & toggle
    const toggleBtn = panel.querySelector("#z7nc-toggle-create-btn");
    const overlay = panel.querySelector("#z7nc-drawer-overlay");
    const drawer = panel.querySelector("#z7nc-create-drawer");
    const backdrop = panel.querySelector("#z7nc-drawer-backdrop");
    const closeBtn = panel.querySelector("#z7nc-close-drawer");
    const cancelBtn = panel.querySelector("#z7nc-cancel-drawer");

    function openDrawer() {
      if (overlay) {
        overlay.classList.remove("hidden");
        panel.querySelector("#z7nc-name")?.focus();
      }
    }
    function closeDrawer() {
      if (overlay) {
        overlay.classList.add("hidden");
      }
    }

    toggleBtn?.addEventListener("click", openDrawer);
    backdrop?.addEventListener("click", closeDrawer);
    closeBtn?.addEventListener("click", closeDrawer);
    cancelBtn?.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
        closeDrawer();
      }
    });

    panel.insertAdjacentHTML("beforeend", `
      <div id="z7nc-edit-modal" class="z7nc-modal" hidden>
        <div class="z7nc-modal-backdrop" data-edit-close></div>
        <form class="z7nc-modal-card" id="z7nc-edit-form">
          <div class="z7nc-modal-head"><div><div class="page-kicker">CLIENT ACCOUNT</div><h3>Edit Client</h3></div><button type="button" class="z7nc-modal-close" data-edit-close aria-label="Close">×</button></div>
          <label class="z7nc-edit-field">Display Name<input id="z7nc-edit-name" maxlength="120" required></label>
          <label class="z7nc-edit-field">Company<input id="z7nc-edit-company" maxlength="160"></label>
          <div id="z7nc-edit-message" class="z7nc-message" role="status"></div>
          <div class="z7nc-modal-actions"><button type="button" class="z7nc-action" data-edit-close>Cancel</button><button type="submit" class="z7nc-password-save" id="z7nc-edit-save">SAVE CHANGES</button></div>
        </form>
      </div>`);
    panel.querySelector("#z7nc-edit-form")?.addEventListener("submit", saveClientEdit);
    panel.querySelectorAll("[data-edit-close]").forEach(button => button.addEventListener("click", closeClientEdit));

    const upload =
      document.getElementById(
        "z7-private-upload-panel"
      );


    const access =
      document.getElementById(
        "legacy-file-access-panel"
      );


    if (
      upload &&
      upload.parentElement ===
      container
    ) {

      container.insertBefore(
        panel,
        upload
      );

    } else if (
      access &&
      access.parentElement ===
      container
    ) {

      container.insertBefore(
        panel,
        access
      );

    } else {

      container.appendChild(
        panel
      );
    }


    document
      .getElementById(
        "z7nc-create"
      )
      ?.addEventListener(
        "click",
        createClient
      );


    document
      .getElementById(
        "z7nc-modal-close"
      )
      ?.addEventListener(
        "click",
        closePasswordModal
      );


    document
      .querySelector(
        "#z7nc-password-modal .z7nc-modal-backdrop"
      )
      ?.addEventListener(
        "click",
        closePasswordModal
      );


    document
      .getElementById(
        "z7nc-password-save"
      )
      ?.addEventListener(
        "click",
        savePassword
      );
  }


  async function createClient() {

    const button =
      document.getElementById(
        "z7nc-create"
      );


    const message =
      document.getElementById(
        "z7nc-message"
      );


    const payload = {

      displayName:
        document
          .getElementById(
            "z7nc-name"
          )
          ?.value
          .trim(),

      username:
        document
          .getElementById(
            "z7nc-client-id"
          )
          ?.value
          .trim(),

      company:
        document
          .getElementById(
            "z7nc-company"
          )
          ?.value
          .trim(),

      password:
        document
          .getElementById(
            "z7nc-password"
          )
          ?.value || ""
    };


    if (
      !payload.displayName ||
      !payload.username ||
      payload.password.length < 12
    ) {

      message.textContent =
        "Display Name, Client ID and a 12+ character password are required.";

      message.className =
        "z7nc-message is-error";

      return;
    }


    button.disabled = true;

    button.textContent =
      "CREATING...";


    try {

      const response =
        await authFetch(
          API,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );


      const result =
        await response.json();


      if (!response.ok) {

        throw new Error(
          result.error ||
          "Could not create client."
        );
      }


      [
        "z7nc-name",
        "z7nc-client-id",
        "z7nc-company",
        "z7nc-password"
      ].forEach(
        id => {

          const field =
            document.getElementById(
              id
            );

          if (field) {
            field.value = "";
          }
        }
      );


      message.textContent =
        "Client account created successfully.";

      message.className =
        "z7nc-message is-success";


      await loadClients();


      document
        .getElementById(
          "z7-cap-refresh"
        )
        ?.click();


    } catch (error) {

      message.textContent =
        error.message ||
        "Could not create client.";

      message.className =
        "z7nc-message is-error";


    } finally {

      button.disabled = false;

      button.textContent =
        "CREATE CLIENT";
    }
  }


  async function loadClients() {

    try {

      const response =
        await authFetch(
          LIST_API
        );


      const payload =
        await response.json();


      if (!response.ok) {

        throw new Error(
          payload.error ||
          "Could not load clients."
        );
      }


      const clients = payload.clients || [];
      render(clients);
      window.dispatchEvent(new CustomEvent("z7:client-accounts-updated", { detail: { clients } }));


    } catch (error) {

      console.warn(
        "Unified client list:",
        error
      );
    }
  }


  let cachedClients = [];

  function filterClients(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) {
      render(cachedClients, true);
      return;
    }
    const filtered = cachedClients.filter(c => {
      const name = String(c.display_name || "").toLowerCase();
      const username = String(c.username || c.legacy_scope || "").toLowerCase();
      const company = String(c.company || "").toLowerCase();
      return name.includes(q) || username.includes(q) || company.includes(q);
    });
    render(filtered, true);
  }

  function render(clients, isFiltered = false) {
    if (!isFiltered) {
      cachedClients = clients;
      const searchInput = document.getElementById("z7nc-search-input");
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", (e) => filterClients(e.target.value));
      }
    }

    const root = document.getElementById("z7nc-list");
    if (!root) return;

    const countBadge = document.getElementById("z7nc-client-count");
    if (countBadge) countBadge.textContent = `${clients.length} ${clients.length === 1 ? "CLIENT" : "CLIENTS"}`;
    const sidebarClientCount = document.getElementById("sidebar-client-count");
    if (sidebarClientCount) sidebarClientCount.textContent = String(clients.length);
    const overviewClientCount = document.getElementById("overview-client-total");
    if (overviewClientCount) overviewClientCount.textContent = String(clients.length);
    const usersClientCount = document.getElementById("users-client-count");
    if (usersClientCount) usersClientCount.textContent = `${clients.length} ${clients.length === 1 ? "client" : "clients"}`;

    if (!clients.length) {
      root.innerHTML = `<div class="z7nc-empty">${isFiltered ? "No matching client accounts found." : "No client accounts found."}</div>`;
      return;
    }

    root.innerHTML = clients.map(client => {
      const isNative = client.auth_type === "native";
      const active = client.status === "active";
      const identifier = isNative ? client.username : client.legacy_scope;
      const initials = (client.display_name || client.username || "CL").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

      return `
        <article class="z7nc-client vip-client-card" data-client-key="${esc(client.client_key)}">
          <div class="vip-client-card__top">
            <div class="vip-client-avatar" aria-hidden="true">${esc(initials)}</div>
            <div class="vip-client-identity">
              <div class="vip-client-name-row">
                <strong class="vip-client-name" title="${esc(client.display_name || "Private Client")}">${esc(client.display_name || "Private Client")}</strong>
                <span class="z7nc-type ${isNative ? "is-native" : "is-legacy"}">${isNative ? "VIP" : "LEGACY"}</span>
              </div>
              <span class="vip-client-id">${esc(identifier || "—")}</span>
              <small class="vip-client-org">${esc(client.company || "Private Client Organization")}</small>
            </div>
            <div class="vip-client-status">
              <span class="vip-status-pill ${active ? "is-active" : "is-disabled"}">
                <i class="vip-status-dot"></i> ${active ? "ACTIVE" : "DISABLED"}
              </span>
            </div>
          </div>
          <div class="vip-client-meta-strip">
            <span class="vip-meta-badge"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> 256-bit Secure Vault</span>
            <span class="vip-meta-scope">${isNative ? "Direct Portal Access" : "Legacy Resource Scope"}</span>
          </div>
          <div class="vip-client-card__actions">
            <button type="button" class="vip-btn vip-btn--access" data-action="manage-access" data-client-key="${esc(client.client_key)}" data-display-name="${esc(client.display_name || "")}" title="Configure per-asset permissions">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Permissions ↗</span>
            </button>
            <button type="button" class="vip-btn" data-action="password" data-client-key="${esc(client.client_key)}" data-username="${esc(client.username || "")}" title="Reset client password">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-2-2l2 2m-8 6h.01M16 12a4 4 0 11-8 0 4 4 0 018 0z"/><path d="M12 16v4"/></svg>
              <span>Password</span>
            </button>
            ${isNative ? `
              <button type="button" class="vip-btn" data-action="edit" data-client-key="${esc(client.client_key)}" data-display-name="${esc(client.display_name)}" data-company="${esc(client.company || "")}" title="Edit client details">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="vip-btn vip-btn--danger" data-action="delete" data-client-key="${esc(client.client_key)}" data-display-name="${esc(client.display_name)}" title="Delete client account">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Delete</span>
              </button>
            ` : `<span class="z7nc-legacy-note">LEGACY SCOPE</span>`}
          </div>
        </article>
      `;
    }).join("");

    root.querySelectorAll('[data-action="manage-access"]').forEach(button => {
      button.addEventListener("click", () => {
        const clientKey = button.dataset.clientKey;
        if (window.z7SelectClientsSubtab) {
          window.z7SelectClientsSubtab("matrix", true);
        }
        const select = document.getElementById("access-client-select");
        if (select) {
          select.value = clientKey;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    root.querySelectorAll('[data-action="edit"]').forEach(button => button.addEventListener("click", () => openClientEdit(button)));
    root.querySelectorAll('[data-action="delete"]').forEach(button => button.addEventListener("click", () => deleteClient(button)));

    root
      .querySelectorAll(
        '[data-action="password"]'
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              openPasswordModal(
                button.dataset.clientKey,
                button.dataset.username
              );
            }
          );
        }
      );


    root
      .querySelectorAll(
        '[data-action="status"]'
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              toggleStatus(
                button.dataset.clientKey,
                button.dataset.currentStatus,
                button
              );
            }
          );
        }
      );
  }


  function openClientEdit(button) {
    const modal = document.getElementById("z7nc-edit-modal");
    modal.dataset.clientKey = button.dataset.clientKey;
    document.getElementById("z7nc-edit-name").value = button.dataset.displayName || "";
    document.getElementById("z7nc-edit-company").value = button.dataset.company || "";
    document.getElementById("z7nc-edit-message").textContent = "";
    modal.hidden = false;
    document.getElementById("z7nc-edit-name").focus();
  }

  function closeClientEdit() {
    const modal = document.getElementById("z7nc-edit-modal");
    if (modal) modal.hidden = true;
  }

  async function saveClientEdit(event) {
    event.preventDefault();
    const modal = document.getElementById("z7nc-edit-modal");
    const button = document.getElementById("z7nc-edit-save");
    const message = document.getElementById("z7nc-edit-message");
    const payload = { action: "profile", clientKey: modal.dataset.clientKey, displayName: document.getElementById("z7nc-edit-name").value.trim(), company: document.getElementById("z7nc-edit-company").value.trim() };
    if (!payload.displayName) return;
    button.disabled = true;
    try {
      const response = await authFetch(API, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update client.");
      message.textContent = "Client profile updated.";
      await loadClients();
      setTimeout(closeClientEdit, 450);
    } catch (error) {
      message.textContent = error.message || "Could not update client.";
    } finally {
      button.disabled = false;
    }
  }

  async function deleteClient(button) {
    const clientKey = button.dataset.clientKey;
    const clientName = button.dataset.displayName || "this client";
    if (!window.confirm(`Permanently delete ${clientName} and revoke all file permissions?`)) return;
    button.disabled = true;
    try {
      const response = await authFetch(API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete client.");
      button.closest(".z7nc-client")?.remove();
      window.dispatchEvent(new CustomEvent("z7:admin-audit", { detail: { action: "Native client account deleted" } }));
      await loadClients();
      document.getElementById("z7-cap-refresh")?.click();
    } catch (error) {
      window.alert(error.message || "Could not delete client.");
      button.disabled = false;
    }
  }

  function openPasswordModal(
    clientKey,
    username
  ) {

    const modal =
      document.getElementById(
        "z7nc-password-modal"
      );


    modal.dataset.clientKey =
      clientKey;


    document
      .getElementById(
        "z7nc-password-client"
      )
      .textContent =
        `Client ID: ${username || "—"}`;


    document
      .getElementById(
        "z7nc-new-password"
      )
      .value = "";


    document
      .getElementById(
        "z7nc-confirm-password"
      )
      .value = "";


    document
      .getElementById(
        "z7nc-modal-message"
      )
      .textContent = "";


    modal.hidden = false;
  }


  function closePasswordModal() {

    const modal =
      document.getElementById(
        "z7nc-password-modal"
      );


    if (modal) {
      modal.hidden = true;
    }
  }


  async function savePassword() {

    const modal =
      document.getElementById(
        "z7nc-password-modal"
      );


    const button =
      document.getElementById(
        "z7nc-password-save"
      );


    const message =
      document.getElementById(
        "z7nc-modal-message"
      );


    const password =
      document
        .getElementById(
          "z7nc-new-password"
        )
        ?.value || "";


    const confirmPassword =
      document
        .getElementById(
          "z7nc-confirm-password"
        )
        ?.value || "";


    if (password.length < 12) {

      message.textContent =
        "Password must contain at least 12 characters.";

      message.className =
        "z7nc-message is-error";

      return;
    }


    if (
      password !==
      confirmPassword
    ) {

      message.textContent =
        "Passwords do not match.";

      message.className =
        "z7nc-message is-error";

      return;
    }


    button.disabled = true;

    button.textContent =
      "UPDATING...";


    try {

      const response =
        await authFetch(
          API,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                action:
                  "password",

                clientKey:
                  modal.dataset.clientKey,

                password
              })
          }
        );


      const payload =
        await response.json();


      if (!response.ok) {

        throw new Error(
          payload.error ||
          "Password update failed."
        );
      }


      message.textContent =
        "Password updated successfully.";

      message.className =
        "z7nc-message is-success";


      setTimeout(
        closePasswordModal,
        650
      );


    } catch (error) {

      message.textContent =
        error.message ||
        "Password update failed.";

      message.className =
        "z7nc-message is-error";


    } finally {

      button.disabled = false;

      button.textContent =
        "UPDATE PASSWORD";
    }
  }


  async function toggleStatus(
    clientKey,
    currentStatus,
    button
  ) {

    const nextStatus =
      currentStatus ===
      "active"
        ? "disabled"
        : "active";


    const approved =
      window.confirm(
        `Are you sure you want to ${
          nextStatus === "active"
            ? "enable"
            : "disable"
        } this client?`
      );


    if (!approved) {
      return;
    }


    const original =
      button.textContent;


    button.disabled = true;

    button.textContent =
      "UPDATING...";


    try {

      const response =
        await authFetch(
          API,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                action:
                  "status",

                clientKey,

                status:
                  nextStatus
              })
          }
        );


      const payload =
        await response.json();


      if (!response.ok) {

        throw new Error(
          payload.error ||
          "Client status update failed."
        );
      }


      await loadClients();


      document
        .getElementById(
          "z7-cap-refresh"
        )
        ?.click();


    } catch (error) {

      window.alert(
        error.message ||
        "Client status update failed."
      );


      button.disabled = false;

      button.textContent =
        original;
    }
  }


  async function boot() {

    for (
      let i = 0;
      i < 60;
      i++
    ) {

      if (
        (window.Clerk?.user || !document.querySelector('#app')?.classList.contains('hidden')) &&
        target()
      ) {

        ensurePanel();

        await loadClients();

        return;
      }


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            500
          )
      );
    }
  }


  document.addEventListener("z7:admin-ready", () => { ensurePanel(); loadClients(); });
  window.z7EnsureNativeClientsPanel = () => { ensurePanel(); return loadClients(); };

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();
  }

})();
