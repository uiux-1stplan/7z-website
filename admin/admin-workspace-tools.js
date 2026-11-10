(() => {
  "use strict";

  const API = "/api/admin/client-file-access";
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = { clients: [], files: [], permissions: [], loading: false };

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  async function request(options = {}) {
    const token = await window.Clerk?.session?.getToken?.();
    if (!token) throw new Error("Your secure admin session has expired. Sign in again.");
    const response = await fetch(API, { method: options.body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined, credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Client permissions could not be loaded.");
    return data;
  }

  function selectedClient() { return $("#access-client-select")?.value || ""; }

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
      root.innerHTML = '<div class="access-empty">Upload a private file in Client files to manage access here.</div>';
      return;
    }
    root.innerHTML = state.files.map(file => {
      const permission = state.permissions.find(item => item.client_key === clientKey && item.resource_key === `file:${file.fileId}`);
      const canView = Boolean(permission?.can_view || permission?.can_download);
      const canDownload = Boolean(permission?.can_download);
      return `<article class="access-file-row"><span class="access-file-icon" aria-hidden="true">↗</span><div class="access-file-name"><strong>${escape(file.name)}</strong><small>${escape(file.contentType || "Private file")} · ${escape(formatBytes(file.sizeBytes))}</small></div><label class="access-toggle"><input type="checkbox" data-access="view" data-file-id="${escape(file.fileId)}" ${canView ? "checked" : ""}><span>View</span></label><label class="access-toggle"><input type="checkbox" data-access="download" data-file-id="${escape(file.fileId)}" ${canDownload ? "checked" : ""}><span>Download</span></label></article>`;
    }).join("");
    if (message) message.textContent = `${state.files.length} private ${state.files.length === 1 ? "file" : "files"} · changes save immediately`;
  }

  function formatBytes(value) {
    const size = Number(value || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const message = $("#access-matrix-status");
    if (message) message.textContent = "Syncing private access…";
    try {
      const data = await request();
      state.clients = data.clients || [];
      state.files = (data.resources || []).filter(item => item.type === "file");
      state.permissions = data.permissions || [];
      renderSelect();
      renderFiles();
    } catch (error) {
      if (message) message.textContent = error.message;
      const list = $("#access-matrix-list");
      if (list) list.innerHTML = '<div class="access-empty is-error">Permissions could not be loaded. Try refreshing.</div>';
    } finally { state.loading = false; }
  }

  document.addEventListener("change", async event => {
    if (event.target.matches("#access-client-select")) { renderFiles(); return; }
    const control = event.target.closest("[data-access]");
    if (!control) return;
    const row = control.closest(".access-file-row");
    const controls = [...row.querySelectorAll("[data-access]")];
    const view = controls.find(item => item.dataset.access === "view");
    const download = controls.find(item => item.dataset.access === "download");
    if (control === download && download.checked) view.checked = true;
    if (control === view && !view.checked) download.checked = false;
    controls.forEach(item => item.disabled = true);
    const message = $("#access-matrix-status");
    try {
      await request({ body: { clientKey: selectedClient(), resourceType: "file", resourceId: control.dataset.fileId, canView: view.checked, canDownload: download.checked } });
      state.permissions = state.permissions.filter(item => !(item.client_key === selectedClient() && item.resource_key === `file:${control.dataset.fileId}`));
      if (view.checked || download.checked) state.permissions.push({ client_key: selectedClient(), resource_key: `file:${control.dataset.fileId}`, can_view: view.checked, can_download: download.checked });
      if (message) message.textContent = "Access saved securely.";
    } catch (error) {
      if (message) message.textContent = error.message;
      await load();
    } finally { controls.forEach(item => item.disabled = false); }
  });

  $("#access-matrix-refresh")?.addEventListener("click", load);
  document.addEventListener("z7:admin-ready", load);
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
