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

          <div class="page-kicker">
            CLIENT ACCOUNTS
          </div>

          <h2>
            Client Accounts
          </h2>

          <p>
            All legacy and native client
            identities in one place.
          </p>

        </div>

        <span class="z7nc-badge">
          UNIFIED
        </span>

      </div>


      <div class="z7nc-create-caption">
        CREATE NEW NATIVE CLIENT
      </div>


      <div class="z7nc-form">

        <input
          id="z7nc-name"
          type="text"
          autocomplete="off"
          placeholder="Display Name">

        <input
          id="z7nc-client-id"
          type="text"
          autocomplete="off"
          placeholder="Client ID">

        <input
          id="z7nc-company"
          type="text"
          autocomplete="off"
          placeholder="Company">

        <input
          id="z7nc-password"
          type="password"
          autocomplete="new-password"
          placeholder="Password — minimum 12 characters">

        <button
          type="button"
          id="z7nc-create">
          CREATE CLIENT
        </button>

      </div>


      <div
        id="z7nc-message"
        class="z7nc-message">
      </div>


      <div
        id="z7nc-list"
        class="z7nc-list">
      </div>


      <div
        id="z7nc-password-modal"
        class="z7nc-modal"
        hidden>

        <div class="z7nc-modal-backdrop"></div>

        <div class="z7nc-modal-card">

          <div class="z7nc-modal-head">

            <div>

              <div class="page-kicker">
                SECURITY
              </div>

              <h3>
                Change Client Password
              </h3>

              <p id="z7nc-password-client">
              </p>

            </div>

            <button
              type="button"
              id="z7nc-modal-close"
              class="z7nc-modal-close">
              ×
            </button>

          </div>


          <input
            id="z7nc-new-password"
            type="password"
            autocomplete="new-password"
            placeholder="New password — minimum 12 characters">


          <input
            id="z7nc-confirm-password"
            type="password"
            autocomplete="new-password"
            placeholder="Confirm new password">


          <div
            id="z7nc-modal-message"
            class="z7nc-message">
          </div>


          <button
            type="button"
            id="z7nc-password-save"
            class="z7nc-password-save">
            UPDATE PASSWORD
          </button>

        </div>

      </div>
    `;


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


      render(
        payload.clients || []
      );


    } catch (error) {

      console.warn(
        "Unified client list:",
        error
      );
    }
  }


  function render(clients) {

    const root =
      document.getElementById(
        "z7nc-list"
      );


    if (!root) {
      return;
    }


    if (!clients.length) {

      root.innerHTML = `
        <div class="z7nc-empty">
          No client accounts found.
        </div>
      `;

      return;
    }


    root.innerHTML =
      clients.map(
        client => {

          const isNative =
            client.auth_type ===
            "native";


          const active =
            client.status ===
            "active";


          const identifier =
            isNative
              ? client.username
              : client.legacy_scope;


          return `
            <article
              class="z7nc-client"
              data-client-key="${esc(
                client.client_key
              )}">

              <div class="z7nc-client-info">

                <div class="z7nc-client-title">

                  <strong>
                    ${esc(
                      client.display_name
                    )}
                  </strong>

                  <span class="z7nc-type ${
                    isNative
                      ? "is-native"
                      : "is-legacy"
                  }">
                    ${
                      isNative
                        ? "NATIVE"
                        : "LEGACY"
                    }
                  </span>

                </div>

                <span>
                  ${esc(
                    identifier || "—"
                  )}
                </span>

                <small>
                  ${esc(
                    client.company || "—"
                  )}
                </small>

              </div>


              <div class="z7nc-client-right">

                <div class="z7nc-status ${
                  active
                    ? "is-active"
                    : "is-disabled"
                }">

                  ${
                    active
                      ? "ACTIVE"
                      : "DISABLED"
                  }

                </div>


                ${
                  isNative
                    ? `
                      <button
                        type="button"
                        class="z7nc-action"
                        data-action="password"
                        data-client-key="${esc(
                          client.client_key
                        )}"
                        data-username="${esc(
                          client.username
                        )}">
                        CHANGE PASSWORD
                      </button>

                      <button
                        type="button"
                        class="z7nc-action ${
                          active
                            ? "is-danger"
                            : "is-success"
                        }"
                        data-action="status"
                        data-client-key="${esc(
                          client.client_key
                        )}"
                        data-current-status="${esc(
                          client.status
                        )}">

                        ${
                          active
                            ? "DISABLE"
                            : "ENABLE"
                        }

                      </button>
                    `
                    : `
                      <span class="z7nc-legacy-note">
                        LEGACY ACCESS
                      </span>
                    `
                }

              </div>

            </article>
          `;
        }
      ).join("");


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
        window.Clerk?.user &&
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
