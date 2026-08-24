(() => {
  "use strict";

  const API =
    "/api/admin/client-file-access";

  let model = {
    clients: [],
    files: [],
    permissions: [],
    selectedClient: null
  };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function fileId(file) {
    return file?._portalFileId;
  }

  function fileName(file) {
    return (
      file.original_name ||
      file.original_filename ||
      file.file_name ||
      file.filename ||
      file.name ||
      file.pathname ||
      file.blob_pathname ||
      String(fileId(file) || "Untitled file")
    );
  }

  function permissionFor(clientKey, id) {
    return model.permissions.find(p =>
      p.client_key === clientKey &&
      String(p.file_id) === String(id)
    );
  }

  async function authFetch(url, options = {}) {

    let token = null;

    try {
      token =
        await window.Clerk?.session?.getToken?.();
    } catch {}

    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "same-origin"
    });
  }

  function dashboardTarget() {

    return (
      document.querySelector(
        "#app main"
      ) ||
      document.querySelector(
        "#app .main-content"
      ) ||
      document.querySelector(
        "#app .dashboard-content"
      ) ||
      document.querySelector(
        "#app"
      )
    );
  }

  function ensurePanel() {

    if (
      document.getElementById(
        "legacy-file-access-panel"
      )
    ) return;

    const target =
      dashboardTarget();

    if (!target) return;

    const section =
      document.createElement("section");

    section.id =
      "legacy-file-access-panel";

    section.className =
      "panel z7-client-access-panel";

    section.innerHTML = `
      <div class="z7-cap-head">
        <div>
          <div class="page-kicker">
            CLIENT ACCESS CONTROL
          </div>

          <h2>
            Client Access Control
          </h2>

          <p>
            Manage which private files each
            existing client can view or download.
          </p>
        </div>

        <button
          type="button"
          class="z7-cap-refresh"
          id="z7-cap-refresh">
          Refresh
        </button>
      </div>

      <div
        class="z7-cap-client-list"
        id="z7-cap-client-list">
      </div>

      <div
        class="z7-cap-files"
        id="z7-cap-files">
      </div>
    `;

    target.appendChild(section);

    document
      .getElementById(
        "z7-cap-refresh"
      )
      ?.addEventListener(
        "click",
        load
      );
  }

  function renderClients() {

    const root =
      document.getElementById(
        "z7-cap-client-list"
      );

    if (!root) return;

    const clients =
      model.clients || [];

    if (!clients.length) {

      root.innerHTML = `
        <div class="z7-cap-empty">
          No clients found.
        </div>
      `;

      return;
    }

    const selectedStillExists =
      clients.some(
        client =>
          client.client_key ===
          model.selectedClient
      );

    if (!selectedStillExists) {
      model.selectedClient =
        clients[0].client_key;
    }

    root.innerHTML =
      clients.map(client => {

        const active =
          model.selectedClient ===
          client.client_key;

        const isNative =
          client.auth_type ===
          "native";

        const identifier =
          isNative
            ? client.username
            : client.legacy_scope;

        const badge =
          isNative
            ? "NATIVE"
            : "LEGACY";

        return `
          <button
            type="button"
            class="z7-cap-client ${
              active ? "is-active" : ""
            }"
            data-client-key="${
              esc(client.client_key)
            }">

            <strong>
              ${esc(client.display_name)}
            </strong>

            <span>
              ${esc(identifier || "—")}
            </span>

            <small class="${
              isNative
                ? "is-native"
                : "is-legacy"
            }">
              ${badge}
            </small>

          </button>
        `;
      }).join("");

    root
      .querySelectorAll(
        "[data-client-key]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            model.selectedClient =
              button.dataset.clientKey;

            renderClients();
            renderFiles();
          }
        );
      });
  }

  function renderFiles() {

    const root =
      document.getElementById(
        "z7-cap-files"
      );

    if (!root) return;

    if (!model.selectedClient) {

      root.innerHTML = "";
      return;
    }

    if (!model.files.length) {

      root.innerHTML = `
        <div class="z7-cap-empty">
          <strong>No portal files yet.</strong>
          <span>
            File upload will be added in the
            next step.
          </span>
        </div>
      `;

      return;
    }

    root.innerHTML =
      model.files.map(file => {

        const id =
          fileId(file);

        if (id == null) {
          return "";
        }

        const permission =
          permissionFor(
            model.selectedClient,
            id
          );

        const canView =
          Boolean(
            permission?.can_view
          );

        const canDownload =
          Boolean(
            permission?.can_download
          );

        return `
          <div
            class="z7-cap-file"
            data-file-id="${esc(id)}">

            <div class="z7-cap-file-info">
              <strong>
                ${esc(fileName(file))}
              </strong>

              <span>
                Private Portal File
              </span>
            </div>

            <label>
              <input
                type="checkbox"
                data-permission="view"
                ${canView ? "checked" : ""}>
              <span>View</span>
            </label>

            <label>
              <input
                type="checkbox"
                data-permission="download"
                ${canDownload ? "checked" : ""}>
              <span>Download</span>
            </label>

            <button
              type="button"
              class="z7-cap-save">
              Save
            </button>
          </div>
        `;
      }).join("");

    root
      .querySelectorAll(
        ".z7-cap-file"
      )
      .forEach(row => {

        const view =
          row.querySelector(
            '[data-permission="view"]'
          );

        const download =
          row.querySelector(
            '[data-permission="download"]'
          );

        download?.addEventListener(
          "change",
          () => {

            if (download.checked) {
              view.checked = true;
            }
          }
        );

        view?.addEventListener(
          "change",
          () => {

            if (!view.checked) {
              download.checked = false;
            }
          }
        );

        row
          .querySelector(
            ".z7-cap-save"
          )
          ?.addEventListener(
            "click",
            () => saveRow(
              row,
              view,
              download
            )
          );
      });
  }

  async function saveRow(
    row,
    view,
    download
  ) {

    const button =
      row.querySelector(
        ".z7-cap-save"
      );

    const original =
      button.textContent;

    button.disabled = true;
    button.textContent = "Saving...";

    try {

      const response =
        await authFetch(API, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            clientKey:
              model.selectedClient,

            fileId:
              row.dataset.fileId,

            canView:
              Boolean(view.checked),

            canDownload:
              Boolean(download.checked)
          })
        });

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ||
          "Permission update failed."
        );
      }

      button.textContent = "Saved";

      await load(false);

      setTimeout(() => {
        button.textContent =
          original;
      }, 900);

    } catch (error) {

      console.error(error);

      button.textContent =
        "Error";

      alert(
        error.message ||
        "Could not update permission."
      );

    } finally {

      button.disabled = false;
    }
  }

  async function load(render = true) {

    ensurePanel();

    try {

      const response =
        await authFetch(API);

      if (response.status === 401 ||
          response.status === 403) {
        return;
      }

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ||
          "Could not load client access."
        );
      }

      model.clients =
        payload.clients || [];

      model.files =
        payload.files || [];

      model.permissions =
        payload.permissions || [];

      if (render) {
        renderClients();
        renderFiles();
      }

    } catch (error) {

      console.warn(
        "Legacy file access:",
        error
      );
    }
  }

  async function boot() {

    /*
     * Wait for Clerk + signed-in admin.
     */
    for (
      let attempt = 0;
      attempt < 60;
      attempt++
    ) {

      if (
        window.Clerk?.user &&
        dashboardTarget()
      ) {

        ensurePanel();
        await load();
        return;
      }

      await new Promise(
        resolve =>
          setTimeout(resolve, 500)
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


