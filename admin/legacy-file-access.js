(() => {

  "use strict";


  const API =
    "/api/admin/client-file-access";

  const CLIENT_API =
    "/api/admin/clients";

  const USERS_API =
    "/api/admin/users";


  let model = {

    clients: [],
    resources: [],
    permissions: [],

    selectedClient:
      null
  };


  function esc(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function permissionFor(
    clientKey,
    resourceKey
  ) {

    return model
      .permissions
      .find(
        permission =>
          permission.client_key ===
            clientKey &&
          permission.resource_key ===
            resourceKey
      );
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


  function dashboardTarget() {

    return (
      document.querySelector("#files-view") ||
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
    ) {
      return;
    }


    const target =
      dashboardTarget();


    if (!target) {
      return;
    }


    const section =
      document.createElement(
        "section"
      );


    section.id =
      "legacy-file-access-panel";


    section.className =
      "glass-panel z7-client-access-panel";


    section.innerHTML = `
      <div class="z7-cap-head">

        <div>

          <div class="page-kicker">
            UNIFIED ACCESS CONTROL
          </div>

          <h2>
            Clients × All Media
          </h2>

          <p>
            Control every old protected experience
            and every newly uploaded private file
            for every Legacy or Native client.
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
        id="z7-cap-selected-tools"
        class="z7-cap-selected-tools">
      </div>


      <div
        class="z7-cap-files"
        id="z7-cap-files">
      </div>
    `;


    target.appendChild(
      section
    );


    document
      .getElementById(
        "z7-cap-refresh"
      )
      ?.addEventListener(
        "click",
        load
      );
  }


  function selectedClient() {

    return model
      .clients
      .find(
        client =>
          client.client_key ===
          model.selectedClient
      ) || null;
  }


  function renderClients() {

    const root =
      document.getElementById(
        "z7-cap-client-list"
      );


    if (!root) {
      return;
    }


    if (!model.clients.length) {

      root.innerHTML = `
        <div class="z7-cap-empty">
          No clients found.
        </div>
      `;

      return;
    }


    if (
      !model
        .clients
        .some(
          client =>
            client.client_key ===
            model.selectedClient
        )
    ) {

      model.selectedClient =
        model
          .clients[0]
          .client_key;
    }


    root.innerHTML =
      model.clients
      .map(
        client => {

          const selected =
            client.client_key ===
            model.selectedClient;


          const native =
            client.auth_type ===
            "native";


          const identifier =
            native
              ? client.username
              : client.legacy_scope;


          return `
            <button
              type="button"
              class="z7-cap-client ${
                selected
                  ? "is-active"
                  : ""
              }"
              data-client-key="${esc(
                client.client_key
              )}">

              <strong>
                ${esc(
                  client.display_name
                )}
              </strong>

              <span>
                ${esc(
                  identifier ||
                  "—"
                )}
              </span>

              <small class="${
                native
                  ? "is-native"
                  : "is-legacy"
              }">
                ${
                  native
                    ? "NATIVE"
                    : "LEGACY"
                }
                ·
                ${esc(
                  String(
                    client.status ||
                    ""
                  ).toUpperCase()
                )}
              </small>

            </button>
          `;
        }
      )
      .join("");


    root
      .querySelectorAll(
        "[data-client-key]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              model.selectedClient =
                button.dataset.clientKey;

              renderClients();

              renderSelectedTools();

              renderResources();
            }
          );
        }
      );
  }


  function renderSelectedTools() {

    const root =
      document.getElementById(
        "z7-cap-selected-tools"
      );


    const client =
      selectedClient();


    if (
      !root ||
      !client
    ) {
      return;
    }


    const active =
      client.status ===
      "active";


    root.innerHTML = `
      <div>

        <strong>
          ${esc(
            client.display_name
          )}
        </strong>

        <span>
          ${
            client.auth_type ===
            "native"
              ? "Native Client"
              : "Legacy Client"
          }
          ·
          ${active
            ? "ACTIVE"
            : "DISABLED"}
        </span>

      </div>


      <button
        type="button"
        id="z7-cap-status"
        data-next-status="${
          active
            ? "disabled"
            : "active"
        }">

        ${
          active
            ? "DISABLE CLIENT"
            : "ENABLE CLIENT"
        }

      </button>
    `;


    document
      .getElementById(
        "z7-cap-status"
      )
      ?.addEventListener(
        "click",
        toggleClientStatus
      );
  }


  async function toggleClientStatus() {

    const client =
      selectedClient();


    const button =
      document.getElementById(
        "z7-cap-status"
      );


    if (
      !client ||
      !button
    ) {
      return;
    }


    const nextStatus =
      button.dataset.nextStatus;


    if (
      !window.confirm(
        `${
          nextStatus ===
          "active"
            ? "Enable"
            : "Disable"
        } ${client.display_name}?`
      )
    ) {
      return;
    }


    button.disabled = true;


    try {

      const response =
        await authFetch(
          CLIENT_API,
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

                clientKey:
                  client.client_key,

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
          "Status update failed."
        );
      }


      await load();


    } catch (error) {

      alert(
        error.message ||
        "Status update failed."
      );


    } finally {

      button.disabled = false;
    }
  }


  async function openUploadedFile(
    resource
  ) {

    const tab =
      window.open(
        "",
        "_blank"
      );


    if (!tab) {

      alert(
        "Please allow pop-ups."
      );

      return;
    }


    tab.opener = null;


    try {

      const response =
        await authFetch(
          `/api/admin/files?id=${
            encodeURIComponent(
              resource.fileId
            )
          }&mode=view`
        );


      if (!response.ok) {

        throw new Error(
          await response.text()
        );
      }


      const blob =
        await response.blob();


      const url =
        URL.createObjectURL(
          blob
        );


      tab.location.replace(
        url
      );


      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        10 * 60 * 1000
      );


    } catch (error) {

      tab.close();

      alert(
        error.message ||
        "Unable to open file."
      );
    }
  }


  function renderResources() {

    const root =
      document.getElementById(
        "z7-cap-files"
      );


    if (!root) {
      return;
    }


    if (
      !model.selectedClient
    ) {

      root.innerHTML = "";
      return;
    }


    if (
      !model.resources.length
    ) {

      root.innerHTML = `
        <div class="z7-cap-empty">
          No resources found.
        </div>
      `;

      return;
    }


    root.innerHTML = model.resources.map(resource => {
      const permission = permissionFor(model.selectedClient, resource.key);
      const canView = Boolean(permission?.can_view);
      const canDownload = Boolean(permission?.can_download);
      const legacy = resource.type === "legacy";
      const resourceId = legacy ? resource.scope : resource.fileId;
      return `
        <article class="z7-cap-file" data-resource-key="${esc(resource.key)}" data-resource-type="${esc(resource.type)}" data-resource-id="${esc(resourceId)}">
          <div class="z7-cap-file-info">
            <span class="z7-cap-file-type">${legacy ? "PROTECTED EXPERIENCE" : "PRIVATE UPLOAD"}</span>
            <strong>${esc(resource.name)}</strong>
            <span>${legacy ? "Legacy media route" : "Secure client library file"}</span>
          </div>
          <div class="z7-cap-file-actions">
            <button type="button" class="z7-cap-open">Open</button>
            <button type="button" class="z7-cap-toggle ${canView ? "is-enabled" : ""}" data-permission-toggle="view" data-enabled="${canView}" aria-pressed="${canView}">
              <span>View</span><strong>${canView ? "Revoke access" : "Grant access"}</strong>
            </button>
            ${legacy ? "" : `<button type="button" class="z7-cap-toggle ${canDownload ? "is-enabled" : ""}" data-permission-toggle="download" data-enabled="${canDownload}" aria-pressed="${canDownload}">
              <span>Download</span><strong>${canDownload ? "Revoke access" : "Grant access"}</strong>
            </button>`}
          </div>
        </article>`;
    }).join("");

    root.querySelectorAll(".z7-cap-file").forEach(row => {
      const resource = model.resources.find(item => item.key === row.dataset.resourceKey);
      row.querySelector(".z7-cap-open")?.addEventListener("click", () => {
        if (!resource) return;
        if (resource.type === "legacy") window.open(resource.openPath, "_blank", "noopener");
        else openUploadedFile(resource);
      });
      row.querySelectorAll("[data-permission-toggle]").forEach(button => {
        button.addEventListener("click", async () => {
          const viewButton = row.querySelector('[data-permission-toggle="view"]');
          const downloadButton = row.querySelector('[data-permission-toggle="download"]');
          const next = button.dataset.enabled !== "true";
          const view = { checked: button.dataset.permissionToggle === "view" ? next : viewButton?.dataset.enabled === "true" };
          const download = { checked: button.dataset.permissionToggle === "download" ? next : downloadButton?.dataset.enabled === "true" };
          if (download.checked) view.checked = true;
          if (!view.checked) download.checked = false;
          await saveRow(row, view, download, button);
        });
      });
    });
  }

  async function saveRow(
    row,
    view,
    download,
    actionButton
  ) {

    const button = actionButton || row.querySelector(".z7-cap-save");
    if (!button) return;

    const original = button.textContent;


    button.disabled = true;

    button.textContent =
      "Saving...";


    try {

      const response =
        await authFetch(
          API,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                clientKey:
                  model.selectedClient,

                resourceType:
                  row.dataset
                    .resourceType,

                resourceId:
                  row.dataset
                    .resourceId,

                canView:
                  Boolean(
                    view.checked
                  ),

                canDownload:
                  Boolean(
                    download?.checked
                  )
              })
          }
        );


      const payload =
        await response.json();


      if (!response.ok) {

        throw new Error(
          payload.error ||
          "Permission update failed."
        );
      }


      button.textContent = "Saved";
      window.dispatchEvent(new CustomEvent("z7:admin-audit", { detail: { action: (view.checked ? "Granted" : "Revoked") + " client media access" } }));
      await load(false);
      renderClients();
      renderSelectedTools();
      renderResources();


      setTimeout(
        () => {

          button.textContent =
            original;
        },
        900
      );


    } catch (error) {

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


  async function load(
    render = true
  ) {

    ensurePanel();


    try {

      const [response, usersResponse] = await Promise.all([authFetch(API), authFetch(USERS_API)]);
      if ([response, usersResponse].some(item => item.status === 401 || item.status === 403)) return;
      const [payload, usersPayload] = await Promise.all([response.json(), usersResponse.json()]);
      if (!response.ok) throw new Error(payload.error || "Could not load unified access control.");
      if (!usersResponse.ok) throw new Error(usersPayload.error || "Could not load clients from Users.");

      model.clients = (Array.isArray(usersPayload.users) ? usersPayload.users : [])
        .filter(user => String(user.role || "").toLowerCase() !== "admin")
        .map(user => ({
          ...user,
          client_key: String(user.client_key || user.clientKey || user.id || user.userId || ""),
          display_name: user.display_name || user.displayName || user.name || user.email || "Client",
          username: user.username || user.email || user.id,
          auth_type: user.auth_type || "native",
          status: user.status || "active"
        }))
        .filter(user => user.client_key);

      model.resources = payload.resources || [];
      model.permissions = payload.permissions || [];


      if (render) {

        renderClients();

        renderSelectedTools();

        renderResources();
      }


    } catch (error) {

      console.warn(
        "Unified client access:",
        error
      );
    }
  }


  window.addEventListener("z7:users-updated", event => {
    const users = Array.isArray(event.detail?.users) ? event.detail.users : [];
    model.clients = users.filter(user => String(user.role || "").toLowerCase() !== "admin").map(user => ({ ...user, client_key: String(user.client_key || user.clientKey || user.id || user.userId || ""), display_name: user.display_name || user.displayName || user.name || user.email || "Client", username: user.username || user.email || user.id, auth_type: user.auth_type || "native", status: user.status || "active" })).filter(user => user.client_key);
    if (!model.clients.some(client => client.client_key === model.selectedClient)) model.selectedClient = model.clients[0]?.client_key || null;
    renderClients(); renderSelectedTools(); renderResources();
  });

  async function boot() {

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
