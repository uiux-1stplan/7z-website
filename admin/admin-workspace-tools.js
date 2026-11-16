(() => {
  "use strict";

  const API = "/api/admin/client-file-access";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { clients: [], files: [], permissions: [], loading: false, searchQuery: "" };

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  async function request(options = {}) {
    let token = null;
    try {
      token = await window.Clerk?.session?.getToken?.();
    } catch (_) {}
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    };
    const response = await fetch(API, {
      method: options.body ? "POST" : "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      cache: "no-store"
    });
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await response.json().catch(() => ({})) : {};
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Your secure admin session has expired. Sign in again.");
      }
      throw new Error(data.error || "Client permissions could not be loaded.");
    }
    return data;
  }

  function selectedClient() {
    return $("#access-client-select")?.value || "";
  }

  function getCategory(name = "", type = "") {
    const combined = (name + " " + type).toLowerCase();
    if (combined.includes("video") || combined.includes(".mp4") || combined.includes(".mov")) return "VIDEO";
    if (combined.includes(".zip") || combined.includes(".html") || combined.includes("3d")) return "3D / WEB";
    if (combined.includes("pdf") || combined.includes("doc")) return "PDF";
    if (combined.includes("image") || combined.includes(".png") || combined.includes(".jpg")) return "IMAGE";
    return "ASSET";
  }

  function renderSelect() {
    const select = $("#access-client-select");
    if (!select) return;
    const current = selectedClient();
    select.innerHTML = state.clients.length
      ? state.clients.map(client => `<option value="${escape(client.client_key)}">${escape(client.display_name || client.username || "Client")} · ${escape(client.company || client.username || client.auth_type || "Client account")}</option>`).join("")
      : '<option value="">No client accounts yet</option>';
    if (state.clients.some(client => client.client_key === current)) select.value = current;
  }

  function renderFiles() {
    const root = $("#access-matrix-list");
    const message = $("#access-matrix-status");
    if (!root) return;
    const clientKey = selectedClient();
    if (!clientKey) {
      root.innerHTML = '<div class="access-empty">Create a client account above, then select it here to assign file access.</div>';
      return;
    }
    if (!state.files.length) {
      root.innerHTML = '<div class="access-empty">Upload a private deliverable in Media Vault to manage access here.</div>';
      return;
    }

    let filesToRender = state.files;
    if (state.searchQuery) {
      filesToRender = filesToRender.filter(f => String(f.name || "").toLowerCase().includes(state.searchQuery));
    }

    if (!filesToRender.length) {
      root.innerHTML = '<div class="access-empty">No files match your search.</div>';
      return;
    }

    root.innerHTML = filesToRender.map(file => {
      const permission = state.permissions.find(item => item.client_key === clientKey && item.resource_key === `file:${file.fileId}`);
      const canView = Boolean(permission?.can_view || permission?.can_download);
      const canDownload = Boolean(permission?.can_download);
      const cat = getCategory(file.name, file.contentType);

      return `
        <article class="access-file-row">
          <div class="access-file-col1">
            <span class="access-file-icon" aria-hidden="true">↗</span>
            <div class="access-file-info">
              <strong>${escape(file.name)}</strong>
              <small>${escape(file.fileId || file.name.split('.').pop()?.toUpperCase() || "MASTER")}</small>
            </div>
          </div>
          <div class="access-file-col2">
            <span class="badge-tag">${cat}</span>
            <span class="access-file-size">${escape(formatBytes(file.sizeBytes))}</span>
          </div>
          <div class="access-file-col3">
            <label class="access-toggle-pod" title="Toggle view permission">
              <span class="access-toggle-label">View Access</span>
              <input type="checkbox" class="access-pill-switch" data-access="view" data-file-id="${escape(file.fileId)}" ${canView ? "checked" : ""}>
            </label>
          </div>
          <div class="access-file-col4">
            <label class="access-toggle-pod" title="Toggle download permission">
              <span class="access-toggle-label">Download Access</span>
              <input type="checkbox" class="access-pill-switch" data-access="download" data-file-id="${escape(file.fileId)}" ${canDownload ? "checked" : ""}>
            </label>
          </div>
        </article>
      `;
    }).join("");

    if (message) {
      message.textContent = `${state.files.length} private ${state.files.length === 1 ? "deliverable" : "deliverables"} in vault · Changes save in real-time`;
    }
  }

  function formatBytes(value) {
    const size = Number(value || 0);
    if (!size) return "0 B";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const message = $("#access-matrix-status");
    if (message) message.textContent = "Syncing vault permissions…";
    try {
      const data = await request();
      state.clients = data.clients || [];
      state.files = (data.resources || []).filter(item => item.type === "file");
      state.permissions = data.permissions || [];
      renderSelect();
      renderFiles();
      if (message) message.textContent = "All permissions synchronized.";
    } catch (error) {
      if (message) message.textContent = error.message;
      const list = $("#access-matrix-list");
      if (list) list.innerHTML = '<div class="access-empty is-error">Permissions could not be loaded. Try refreshing.</div>';
    } finally {
      state.loading = false;
    }
  }

  async function updatePermission(fileId, canView, canDownload) {
    const clientKey = selectedClient();
    if (!clientKey) return;
    const message = $("#access-matrix-status");
    if (message) message.textContent = "Saving access permissions…";

    try {
      await request({
        body: {
          clientKey,
          resourceType: "file",
          resourceId: fileId,
          canView,
          canDownload
        }
      });
      state.permissions = state.permissions.filter(item => !(item.client_key === clientKey && item.resource_key === `file:${fileId}`));
      if (canView || canDownload) {
        state.permissions.push({
          client_key: clientKey,
          resource_key: `file:${fileId}`,
          can_view: canView,
          can_download: canDownload
        });
      }
      if (message) message.textContent = "Access saved securely ✓";
    } catch (error) {
      if (message) message.textContent = error.message || "Failed to update permissions.";
      await load();
    }
  }

  async function bulkAction(mode) {
    const clientKey = selectedClient();
    if (!clientKey) return;
    const message = $("#access-matrix-status");
    if (message) message.textContent = mode === "grant" ? "Granting all view rights…" : "Revoking all rights…";

    try {
      for (const file of state.files) {
        const canView = mode === "grant";
        const canDownload = false;
        await request({
          body: {
            clientKey,
            resourceType: "file",
            resourceId: file.fileId,
            canView,
            canDownload
          }
        });
        state.permissions = state.permissions.filter(item => !(item.client_key === clientKey && item.resource_key === `file:${file.fileId}`));
        if (canView) {
          state.permissions.push({
            client_key: clientKey,
            resource_key: `file:${file.fileId}`,
            can_view: true,
            can_download: false
          });
        }
      }
      renderFiles();
      if (message) message.textContent = mode === "grant" ? "All view access granted ✓" : "All access revoked ✓";
    } catch (error) {
      if (message) message.textContent = error.message || "Bulk action failed.";
      await load();
    }
  }

  document.addEventListener("change", async event => {
    if (event.target.matches("#access-client-select")) {
      renderFiles();
      return;
    }
    const control = event.target.closest("[data-access]");
    if (!control) return;
    const row = control.closest(".access-file-row");
    const controls = [...row.querySelectorAll("[data-access]")];
    const view = controls.find(item => item.dataset.access === "view");
    const download = controls.find(item => item.dataset.access === "download");
    if (control === download && download.checked) view.checked = true;
    if (control === view && !view.checked) download.checked = false;
    controls.forEach(item => item.disabled = true);

    try {
      await updatePermission(control.dataset.fileId, view.checked, download.checked);
    } finally {
      controls.forEach(item => item.disabled = false);
    }
  });

  // Search input in Room 3
  const searchInput = $("#access-file-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderFiles();
    });
  }

  $("#access-grant-all")?.addEventListener("click", () => bulkAction("grant"));
  $("#access-revoke-all")?.addEventListener("click", () => bulkAction("revoke"));
  $("#access-matrix-refresh")?.addEventListener("click", load);
  document.addEventListener("z7:admin-ready", load);
  window.z7EnsureMatrixLoaded = load;
  if (window.Clerk?.user) load();

  const clientsMount = $("#z7-native-clients-mount");
  if (clientsMount) {
    let timer;
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(load, 500); }).observe(clientsMount, { childList: true, subtree: true });
  }
  const filesMount = $("#client-files-mount");
  if (filesMount) {
    let timer;
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(load, 900); }).observe(filesMount, { childList: true, subtree: true });
  }
})();
