(() => {
  "use strict";
  const FILES = "/api/admin/files";
  const ACTIONS = "/api/admin/file-mutations";
  const ACCESS = "/api/admin/client-file-access";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const bytes = (value) => { const n = Number(value || 0); if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(1) + " KB"; if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB"; return (n / 1073741824).toFixed(1) + " GB"; };
  const date = (value) => value ? new Intl.DateTimeFormat("en", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value)) : "—";
  async function authFetch(url, options = {}) {
    const token = await window.Clerk?.session?.getToken?.();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(url, { ...options, headers, credentials:"same-origin", cache:"no-store" });
  }
  async function json(url, options) {
    const response = await authFetch(url, options);
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
    return payload;
  }
  function toast(message, error = false) {
    let stack = $("#toast-stack");
    if (!stack) { stack = document.createElement("div"); stack.id = "toast-stack"; stack.className = "toast-stack"; document.body.append(stack); }
    const item = document.createElement("div");
    item.className = "admin-quality-toast" + (error ? " is-error" : "");
    item.setAttribute("role", "status");
    item.textContent = message;
    stack.append(item);
    setTimeout(() => item.remove(), 4200);
  }
  let directory = { clients:[], resources:[], permissions:[] };
  let loadingFiles = false;
  let uploadObserver = null;
  const accessKey = (clientKey, resourceKey) => clientKey + "|" + resourceKey;

  function ensureAccessDialog() {
    if ($("#z7q-access-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "z7q-access-dialog";
    dialog.className = "z7q-dialog";
    dialog.innerHTML = '<form method="dialog" class="z7q-dialog__card"><div class="z7q-dialog__head"><div><span class="eyebrow">PRIVATE DELIVERY / PERMISSIONS</span><h2>Client file access</h2><p data-access-file-name></p></div><button class="z7q-icon-button" type="button" data-access-close aria-label="Close">×</button></div><div class="z7q-access-list" data-access-list></div><div class="z7q-dialog__actions"><span class="z7q-dialog-message" data-access-message></span><button class="z7q-glass-button" type="button" data-access-cancel>Cancel</button><button class="z7q-glow-button" type="button" data-access-save>Save access</button></div></form>';
    document.body.append(dialog);
    dialog.querySelectorAll("[data-access-close],[data-access-cancel]").forEach((button) => button.addEventListener("click", () => dialog.close()));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector("[data-access-save]").addEventListener("click", saveAccess);
  }
  function ensureRenameDialog() {
    if ($("#z7q-rename-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "z7q-rename-dialog";
    dialog.className = "z7q-dialog";
    dialog.innerHTML = '<form class="z7q-dialog__card" data-rename-form><div class="z7q-dialog__head"><div><span class="eyebrow">PRIVATE DELIVERY / FILE LIBRARY</span><h2>Rename file</h2><p>Update the display name used in the client vault.</p></div><button class="z7q-icon-button" type="button" data-rename-close aria-label="Close">×</button></div><label class="z7q-field">File name<input name="name" maxlength="500" required autocomplete="off"></label><div class="z7q-dialog__actions"><span class="z7q-dialog-message" data-rename-message></span><button class="z7q-glass-button" type="button" data-rename-cancel>Cancel</button><button class="z7q-glow-button" type="submit">Save name</button></div></form>';
    document.body.append(dialog);
    const close = () => dialog.close();
    dialog.querySelectorAll("[data-rename-close],[data-rename-cancel]").forEach((button) => button.addEventListener("click", close));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    dialog.querySelector("[data-rename-form]").addEventListener("submit", renameFile);
  }
  function ensureUploadClientSelector() {
    const panel = $("#z7-private-upload-panel");
    const drop = $(".z7-upload-drop", panel || document);
    if (!panel || !drop) return false;
    panel.classList.add("z7q-upload-ready");
    let field = $(".z7q-upload-client", drop);
    if (!field) {
      field = document.createElement("label");
      field.className = "z7q-field z7q-upload-client";
      field.innerHTML = '<span>Assign to client <small>Optional · access can be changed later</small></span><select id="z7-upload-client-select"><option value="">Keep private — assign later</option></select>';
      const picker = $("#z7-upload-picker", drop);
      drop.insertBefore(field, picker || drop.firstChild);
    }
    const select = $("#z7-upload-client-select", field);
    const selectedValue = select.value;
    select.innerHTML = '<option value="">Keep private — assign later</option>' + directory.clients.map((client) => '<option value="' + esc(client.client_key) + '">' + esc(client.display_name) + (client.company ? " · " + esc(client.company) : "") + "</option>").join("");
    if (directory.clients.some((client) => client.client_key === selectedValue)) select.value = selectedValue;
    drop.setAttribute("role", "group");
    drop.setAttribute("aria-label", "Upload a private file and optionally assign client access");
    if (!drop.dataset.z7qDragBound) {
      drop.dataset.z7qDragBound = "true";
      ["dragenter","dragover"].forEach((name) => drop.addEventListener(name, (event) => { event.preventDefault(); drop.classList.add("is-dragging"); }));
      ["dragleave","dragend"].forEach((name) => drop.addEventListener(name, () => drop.classList.remove("is-dragging")));
      drop.addEventListener("drop", (event) => {
        event.preventDefault(); drop.classList.remove("is-dragging");
        const input = $("#z7-upload-input");
        const file = event.dataTransfer?.files?.[0];
        if (!input || !file) return;
        try { const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles:true })); }
        catch { toast("Use Select file to choose this item on your browser.", true); }
      });
    }
    return true;
  }
  function installUploadAssignment() {
    if (window.__z7qFetchWrapped) return;
    window.__z7qFetchWrapped = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      const response = await originalFetch(input, init);
      let path = "";
      try { path = new URL(typeof input === "string" ? input : input.url, location.href).pathname; } catch {}
      if (path.endsWith("/api/admin/blob-finalize") && response.ok) {
        try {
          const clientKey = $("#z7-upload-client-select")?.value || "";
          const payload = await response.clone().json();
          const fileId = payload?.file?.id;
          if (clientKey && fileId) {
            await json(ACCESS, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ clientKey, resourceType:"file", resourceId:String(fileId), canView:true, canDownload:true }) });
          }
          await loadLibrary();
        } catch (error) { toast("File uploaded, but access could not be assigned: " + error.message, true); }
      }
      return response;
    };
  }
  function watchUploadPanel() {
    if (ensureUploadClientSelector()) return;
    const app = $("#app");
    if (!app || uploadObserver) return;
    uploadObserver = new MutationObserver(() => {
      if (ensureUploadClientSelector()) { uploadObserver.disconnect(); uploadObserver = null; }
    });
    uploadObserver.observe(app, { childList:true, subtree:true });
    setTimeout(() => { if (uploadObserver) { uploadObserver.disconnect(); uploadObserver = null; } }, 60000);
  }
  async function loadDirectory() {
    const data = await json(ACCESS);
    directory = { clients:data.clients || [], resources:data.resources || [], permissions:data.permissions || [] };
    ensureUploadClientSelector();
    return directory;
  }
  function fileClients(fileId) {
    const key = "file:" + fileId;
    const assigned = new Set(directory.permissions.filter((p) => p.resource_key === key && p.can_view).map((p) => p.client_key));
    return directory.clients.filter((client) => assigned.has(client.client_key));
  }
  async function loadLibrary() {
    if (loadingFiles) return;
    loadingFiles = true;
    const panel = $("#z7-admin-file-library");
    if (!panel) { loadingFiles = false; return; }
    const list = $("#z7af-list", panel);
    const message = $("#z7af-message", panel);
    if (!list) { loadingFiles = false; return; }
    message.textContent = "Syncing secure library…";
    message.className = "z7af-message";
    try {
      const [fileData] = await Promise.all([json(FILES), loadDirectory()]);
      const files = fileData.files || [];
      if (!files.length) {
        list.innerHTML = '<div class="z7q-empty"><span class="z7q-empty__mark">7Z</span><strong>Your private library is clear.</strong><span>Upload a delivery above to begin a new handoff.</span></div>';
      } else {
        list.innerHTML = '<div class="z7q-table-wrap"><table class="z7q-file-table"><thead><tr><th>DELIVERABLE</th><th>FORMAT</th><th>SIZE</th><th>CLIENT ACCESS</th><th>UPLOADED</th><th>ACTIONS</th></tr></thead><tbody>' + files.map((file) => {
          const clients = fileClients(file.id);
          const clientText = clients.length ? clients.map((c) => c.display_name).join(", ") : "Private / unassigned";
          return '<tr><td><div class="z7q-file-name"><span class="z7q-file-type">' + esc((file.name.split(".").pop() || "FILE").slice(0,4).toUpperCase()) + '</span><strong>' + esc(file.name) + '</strong></div></td><td>' + esc(file.contentType || "Private file") + '</td><td>' + bytes(file.sizeBytes) + '</td><td><span class="z7q-client-chip ' + (clients.length ? "is-assigned" : "") + '">' + esc(clientText) + '</span></td><td>' + date(file.createdAt) + '</td><td><div class="z7q-row-actions"><button type="button" data-vault-action="download" data-id="' + esc(file.id) + '" data-name="' + esc(file.name) + '">Download</button><button type="button" data-vault-action="access" data-id="' + esc(file.id) + '" data-name="' + esc(file.name) + '">Access</button><button type="button" data-vault-action="rename" data-id="' + esc(file.id) + '" data-name="' + esc(file.name) + '">Rename</button><button type="button" class="is-danger" data-vault-action="delete" data-id="' + esc(file.id) + '" data-name="' + esc(file.name) + '">Delete</button></div></td></tr>';
        }).join("") + '</tbody></table></div>';
      }
      message.textContent = files.length + (files.length === 1 ? " secure asset" : " secure assets") + " · private by default";
      watchUploadPanel();
    } catch (error) {
      message.textContent = error.message || "Private library could not be loaded.";
      message.className = "z7af-message is-error";
    } finally { loadingFiles = false; }
  }
  function openAccessDialog(fileId, fileName) {
    ensureAccessDialog();
    const dialog = $("#z7q-access-dialog");
    dialog.dataset.fileId = fileId;
    $("[data-access-file-name]", dialog).textContent = fileName;
    $("[data-access-message]", dialog).textContent = "";
    const existing = new Set(directory.permissions.filter((p) => p.resource_key === "file:" + fileId && p.can_view).map((p) => p.client_key));
    const root = $("[data-access-list]", dialog);
    if (!directory.clients.length) root.innerHTML = '<p class="z7q-empty-inline">No client accounts yet. Create a client first in Users.</p>';
    else root.innerHTML = directory.clients.map((client) => '<label class="z7q-access-option"><span><strong>' + esc(client.display_name) + '</strong><small>' + esc(client.company || client.username || "Client account") + '</small></span><input type="checkbox" value="' + esc(client.client_key) + '" ' + (existing.has(client.client_key) ? "checked" : "") + '><i></i></label>').join("");
    dialog.showModal();
  }
  async function saveAccess() {
    const dialog = $("#z7q-access-dialog");
    const button = $("[data-access-save]", dialog);
    const message = $("[data-access-message]", dialog);
    const fileId = dialog.dataset.fileId;
    const selected = new Set($$("[data-access-list] input:checked", dialog).map((input) => input.value));
    const before = new Set(directory.permissions.filter((p) => p.resource_key === "file:" + fileId && p.can_view).map((p) => p.client_key));
    const changes = directory.clients.filter((client) => selected.has(client.client_key) !== before.has(client.client_key));
    button.disabled = true;
    message.textContent = "Saving permissions…";
    try {
      for (const client of changes) await json(ACCESS, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ clientKey:client.client_key, resourceType:"file", resourceId:String(fileId), canView:selected.has(client.client_key), canDownload:selected.has(client.client_key) }) });
      message.textContent = "Access saved.";
      await loadLibrary();
      setTimeout(() => dialog.close(), 250);
      toast("Client file access updated.");
    } catch (error) { message.textContent = error.message || "Access could not be saved."; }
    finally { button.disabled = false; }
  }
  async function downloadFile(button) {
    button.disabled = true; button.textContent = "Preparing…";
    try {
      const response = await authFetch(FILES + "?id=" + encodeURIComponent(button.dataset.id) + "&mode=download");
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Download failed."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = button.dataset.name || "private-file"; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast("Download started.");
    } catch (error) { toast(error.message, true); }
    finally { button.disabled = false; button.textContent = "Download"; }
  }
  function showRename(button) {
    ensureRenameDialog();
    const dialog = $("#z7q-rename-dialog");
    dialog.dataset.fileId = button.dataset.id;
    const input = $('input[name="name"]', dialog);
    input.value = button.dataset.name || "";
    $("[data-rename-message]", dialog).textContent = "";
    dialog.showModal(); input.focus(); input.select();
  }
  async function renameFile(event) {
    event.preventDefault();
    const dialog = $("#z7q-rename-dialog");
    const button = $('button[type="submit"]', dialog);
    const message = $("[data-rename-message]", dialog);
    const name = $('input[name="name"]', dialog).value.trim();
    if (!name) { message.textContent = "Enter a file name."; return; }
    button.disabled = true; message.textContent = "Saving…";
    try {
      await json(ACTIONS, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ id:dialog.dataset.fileId, name }) });
      dialog.close(); await loadLibrary(); toast("File renamed.");
    } catch (error) { message.textContent = error.message || "Rename failed."; }
    finally { button.disabled = false; }
  }
  async function deleteFile(button) {
    if (!window.confirm('Permanently delete "' + button.dataset.name + '" from secure storage? Client access will be revoked.')) return;
    button.disabled = true; button.textContent = "Deleting…";
    try {
      await json(ACTIONS, { method:"DELETE", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ id:button.dataset.id }) });
      await loadLibrary(); toast("File deleted from secure storage.");
    } catch (error) { toast(error.message || "Delete failed.", true); button.disabled = false; button.textContent = "Delete"; }
  }
  document.addEventListener("click", (event) => {
    const refresh = event.target.closest("#z7af-refresh");
    if (refresh) { event.preventDefault(); event.stopImmediatePropagation(); loadLibrary(); return; }
    const button = event.target.closest("[data-vault-action]");
    if (!button) return;
    event.preventDefault();
    if (button.dataset.vaultAction === "download") downloadFile(button);
    else if (button.dataset.vaultAction === "access") openAccessDialog(button.dataset.id, button.dataset.name);
    else if (button.dataset.vaultAction === "rename") showRename(button);
    else if (button.dataset.vaultAction === "delete") deleteFile(button);
  }, true);

  async function renderFinancialBreakdown() {
    const host = $("#analytics-view .analytics-grid");
    if (!host) return;
    let panel = $("#z7q-financial-breakdown");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "z7q-financial-breakdown";
      panel.className = "glass-panel z7q-breakdown";
      panel.innerHTML = '<div class="glass-panel__head"><div><span class="eyebrow">FINANCIAL DETAIL / PROMO ECONOMICS</span><h3>Code performance &amp; academy net</h3></div><span class="z7q-breakdown-caption">Verified payments · JOD</span></div><div class="z7q-table-wrap"><table class="z7q-breakdown-table"><thead><tr><th>CODE / PARTNER</th><th>USES</th><th>STUDENT DISCOUNTS</th><th>PARTNER COMMISSION</th><th>ACADEMY NET</th></tr></thead><tbody id="z7q-breakdown-body"></tbody></table></div><p class="z7q-empty-inline" id="z7q-breakdown-empty" hidden>No promo code activity is available yet.</p>';
      host.insertAdjacentElement("afterend", panel);
    }
    try {
      const [programs, accounting] = await Promise.all([json("/api/admin/course-engine"), json("/api/admin/course-engine?view=accounting")]);
      const rows = accounting.registrations || [];
      const paidRows = rows.filter((r) => ["PAID","APPROVED","VERIFIED"].includes(String(r.payment_status || "").toUpperCase()));
      const affiliatesById = new Map((programs.affiliates || []).map((a) => [String(a.id),a]));
      const allCodes = programs.codes || [];
      const entries = allCodes.map((code) => {
        const uses = rows.filter((r) => String(r.coupon_code || "").toUpperCase() === String(code.code || "").toUpperCase());
        const paid = paidRows.filter((r) => String(r.coupon_code || "").toUpperCase() === String(code.code || "").toUpperCase());
        const discount = paid.reduce((sum,r)=>sum+Number(r.discount_jod || 0),0);
        const commission = paid.reduce((sum,r)=>sum+Number(r.commission_jod || 0),0);
        const gross = paid.reduce((sum,r)=>sum+Number(r.price_jod || 0),0);
        return { code:code.code, partner:code.affiliate_name || "Studio / general", kind:code.affiliate_id ? "Affiliate code" : "General code", uses:uses.length, discount, commission, net:Math.max(0,gross-discount-commission) };
      });
      allCodes.forEach((code) => { if (code.affiliate_id && !affiliatesById.has(String(code.affiliate_id))) return; });
      const body = $("#z7q-breakdown-body");
      body.innerHTML = entries.map((item) => '<tr><td><strong>' + esc(item.code) + '</strong><small>' + esc(item.partner) + ' · ' + esc(item.kind) + '</small></td><td>' + item.uses + '</td><td>' + item.discount.toFixed(3) + ' JOD</td><td>' + item.commission.toFixed(3) + ' JOD</td><td><strong>' + item.net.toFixed(3) + ' JOD</strong></td></tr>').join("");
      $("#z7q-breakdown-empty").hidden = entries.length > 0;
    } catch (error) { toast(error.message || "Financial breakdown could not be loaded.", true); }
  }

  function installSettingsFix() {
    document.addEventListener("click", (event) => {
      const analytics = event.target.closest('[data-dashboard-nav="analytics"]');
      if (analytics) setTimeout(renderFinancialBreakdown, 80);
      const nav = event.target.closest('[data-dashboard-nav="settings"]');
      if (!nav) return;
      requestAnimationFrame(() => {
        const panel = $("#settings-view");
        if (!panel) return;
        panel.hidden = false;
        panel.setAttribute("aria-hidden", "false");
        panel.classList.add("is-active");
        $$("[data-dashboard-nav]").forEach((item) => { const active = item.dataset.dashboardNav === "settings"; item.classList.toggle("active", active); if (active) item.setAttribute("aria-current","page"); else item.removeAttribute("aria-current"); });
      });
    });
    document.addEventListener("click", (event) => {
      const refresh = event.target.closest("#settings-view [data-engine-refresh]");
      if (refresh) refresh.blur();
    }, true);
  }
  async function init() {
    if (window.__z7qInitialized || !window.Clerk?.session) return;
    window.__z7qInitialized = true;
    installUploadAssignment();
    installSettingsFix();
    try { await loadDirectory(); } catch (error) { console.warn("Admin client directory:", error); }
    ensureUploadClientSelector();
    watchUploadPanel();
    await loadLibrary();
    setTimeout(renderFinancialBreakdown, 180);
  }
  const app = $("#app");
  if (app) {
    const bootObserver = new MutationObserver(() => {
      if (!app.classList.contains("hidden")) { bootObserver.disconnect(); init(); }
    });
    bootObserver.observe(app, { attributes:true, attributeFilter:["class"] });
    if (!app.classList.contains("hidden")) init();
  }
})();