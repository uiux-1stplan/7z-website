(() => {

  "use strict";


  const API =
    "/api/admin/files";
  const MANAGE_API =
    "/api/admin/file-manage";


  function esc(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function bytes(value) {

    const size =
      Number(value || 0);


    if (!size) {
      return "—";
    }


    if (size < 1024) {
      return `${size} B`;
    }


    if (size < 1024 * 1024) {

      return `${
        (
          size / 1024
        ).toFixed(1)
      } KB`;
    }


    if (
      size <
      1024 * 1024 * 1024
    ) {

      return `${
        (
          size /
          1024 /
          1024
        ).toFixed(1)
      } MB`;
    }


    return `${
      (
        size /
        1024 /
        1024 /
        1024
      ).toFixed(1)
    } GB`;
  }


  async function authFetch(
    url,
    options = {}
  ) {

    const token =
      await window
        .Clerk
        ?.session
        ?.getToken?.();


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


  function findHost() {
    const mediaMount = document.getElementById("client-files-mount");
    if (mediaMount) {
      const upload = mediaMount.querySelector("#z7-private-upload-panel");
      return upload ? { mode: "after", element: upload } : { mode: "append", element: mediaMount };
    }
    const mediaPanel = document.querySelector('[data-dashboard-panel="media"]');
    if (!mediaPanel) return null;
    const upload = mediaPanel.querySelector("#z7-private-upload-panel");
    if (upload) return { mode: "after", element: upload };
    const access = mediaPanel.querySelector("#legacy-file-access-panel");
    if (access) return { mode: "before", element: access };
    return { mode: "append", element: mediaPanel };
  }


  function ensurePanel() {

    let panel =
      document.getElementById(
        "z7-admin-file-library"
      );


    if (!panel) {

      panel =
        document.createElement(
          "section"
        );


      panel.id =
        "z7-admin-file-library";


      panel.className =
        "panel z7-admin-file-library";


      panel.innerHTML = `
        <div class="z7af-head">
          <div>
            <div class="page-kicker">CINEMATIC MEDIA VAULT / DELIVERABLES</div>
            <h2>Media &amp; Deliverables Library</h2>
            <p>Govern 4K video cuts, 3D Web bundles, interactive PDFs, and master exports.</p>
          </div>
          <button type="button" id="z7af-refresh" class="button button-secondary z7af-refresh">Refresh vault</button>
        </div>

        <div class="z7af-filter-strip" role="toolbar" aria-label="Media vault filters">
          <div class="z7af-pills">
            <button type="button" class="z7af-pill active" data-z7af-filter="all">All</button>
            <button type="button" class="z7af-pill" data-z7af-filter="video">Video</button>
            <button type="button" class="z7af-pill" data-z7af-filter="web">3D / Web</button>
            <button type="button" class="z7af-pill" data-z7af-filter="pdf">Executive PDF</button>
            <button type="button" class="z7af-pill" data-z7af-filter="image">Images</button>
          </div>
          <div class="z7af-search-box">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="search" id="z7af-search-input" class="z7af-search-input" placeholder="Search deliverables by filename or extension…" aria-label="Search files">
          </div>
        </div>

        <div id="z7af-message" class="z7af-message"></div>


        <div
          id="z7af-list"
          class="z7af-list">
        </div>
      `;


      document
        .getElementById(
          "z7af-refresh"
        )
        ?.addEventListener(
          "click",
          loadFiles
        );
    }


    const host =
      findHost();


    if (host) {
      if (host.mode === "after" && host.element.nextElementSibling !== panel) {
        host.element.insertAdjacentElement("afterend", panel);
      } else if (host.mode === "before" && host.element.previousElementSibling !== panel) {
        host.element.insertAdjacentElement("beforebegin", panel);
      } else if (host.mode === "append" && panel.parentElement !== host.element) {
        host.element.appendChild(panel);
      }
    }

    return panel;
  }


  
  function getFileCategory(name = "", type = "") {
    const combined = (name + " " + type).toLowerCase();
    if (combined.includes("video") || combined.includes(".mp4") || combined.includes(".mov") || combined.includes(".webm") || combined.includes(".mkv")) {
      return { label: "4K VIDEO", tone: "video", icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>' };
    }
    if (combined.includes(".zip") || combined.includes(".rar") || combined.includes(".tar") || combined.includes(".gz") || combined.includes(".html") || combined.includes(".gltf") || combined.includes(".glb") || combined.includes("spline") || combined.includes("3d")) {
      return { label: "3D/WEB", tone: "web", icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' };
    }
    if (combined.includes("pdf") || combined.includes("document") || combined.includes(".doc")) {
      return { label: "PDF DECK", tone: "doc", icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' };
    }
    if (combined.includes("image") || combined.includes(".png") || combined.includes(".jpg") || combined.includes(".jpeg") || combined.includes(".webp") || combined.includes(".svg")) {
      return { label: "IMAGE", tone: "image", icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' };
    }
    return { label: "PROTECTED ASSET", tone: "default", icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>' };
  }

  async function loadFiles() {

    ensurePanel();


    const message =
      document.getElementById(
        "z7af-message"
      );


    const list =
      document.getElementById(
        "z7af-list"
      );


    if (!list) {
      return;
    }


    message.textContent =
      "Loading private files...";


    try {
      const response = await authFetch(API);
      const isJson = (response.headers.get("content-type") || "").includes("application/json");
      if (!response.ok || !isJson) {
        let errMsg = "Media deliverables library synchronized.";
        try {
          if (isJson) {
            const errPayload = await response.json();
            errMsg = errPayload.error || errMsg;
          }
        } catch (_) {}
        if (!response.ok && response.status === 401) {
          throw new Error("Admin session required to load vault files.");
        }
      }
      const payload = isJson ? await response.json().catch(() => ({})) : {};


      message.textContent = "";

      message.className =
        "z7af-message";


      const files =
        payload.files || [];


      if (!files.length) {

        list.innerHTML = `
          <div class="z7af-empty">
            No private files uploaded yet.
          </div>
        `;

        return;
      }


      let cachedFiles = files;

      function renderFilteredFiles(items) {
        if (!items.length) {
          list.innerHTML = `<div class="z7af-empty">No matching deliverables found.</div>`;
          return;
        }

        list.innerHTML = items.map(file => {
          const cat = getFileCategory(file.name, file.contentType);
          const rawDate = file.uploadedAt || file.created_at || file.createdAt;
          const dateStr = rawDate && !isNaN(Date.parse(rawDate))
            ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(rawDate))
            : "Vault Deliverable";
          const ext = String(file.name || "").split(".").pop().toUpperCase().slice(0, 5) || "FILE";

          return `
            <article class="z7af-file bento-file-card" data-tone="${cat.tone}">
              <div class="bento-file-preview-header">
                <div class="bento-file-preview-plate ${cat.tone}">
                  <span class="preview-cut-accent" aria-hidden="true"></span>
                  <span class="preview-type-badge">${cat.label}</span>
                  <span class="preview-ext-tag">${ext}</span>
                  <div class="preview-icon-center" aria-hidden="true">${cat.icon}</div>
                </div>
              </div>

              <div class="bento-file-card__body">
                <strong class="bento-file-title" title="${esc(file.name)}">${esc(file.name)}</strong>
                <div class="bento-file-meta">
                  <span class="meta-size">${esc(bytes(file.sizeBytes))}</span>
                  <span class="meta-dot">·</span>
                  <span class="meta-date">${esc(dateStr)}</span>
                </div>
              </div>

              <div class="z7af-actions bento-file-actions">
                <button type="button" class="z7af-open bento-action-btn bento-action-btn--primary" data-open="${esc(file.id)}" data-name="${esc(file.name)}" data-type="${esc(file.contentType || "")}" title="Preview file">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  <span>Preview ↗</span>
                </button>
                <button type="button" class="z7af-download bento-action-btn" data-download="${esc(file.id)}" data-name="${esc(file.name)}" title="Download file">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download ⤓</span>
                </button>
                <button type="button" class="z7af-manage bento-action-btn" data-rename="${esc(file.id)}" data-name="${esc(file.name)}" title="Rename file">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  <span>Rename</span>
                </button>
                <button type="button" class="z7af-manage is-danger bento-action-btn bento-action-btn--danger" data-remove="${esc(file.id)}" data-name="${esc(file.name)}" title="Delete file">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete</span>
                </button>
              </div>
            </article>
          `;
        }).join("");

        wireActionButtons();
      }

      function wireActionButtons() {
        list.querySelectorAll("[data-open]").forEach(button => {
          button.addEventListener("click", () => openFile(button.dataset.open, button.dataset.name, button.dataset.type));
        });
        list.querySelectorAll("[data-download]").forEach(button => {
          button.addEventListener("click", () => downloadFile(button.dataset.download, button.dataset.name, button));
        });
        list.querySelectorAll("[data-rename]").forEach(button => {
          button.addEventListener("click", () => openRenameDialog(button.dataset.rename, button.dataset.name));
        });
        list.querySelectorAll("[data-remove]").forEach(button => {
          button.addEventListener("click", () => removeFile(button.dataset.remove, button.dataset.name, button));
        });
      }

      window.__z7af_apply_filter = (category, query) => {
        let filtered = cachedFiles;
        if (category && category !== "all") {
          filtered = filtered.filter(f => {
            const cat = getFileCategory(f.name, f.contentType);
            return cat.tone === category;
          });
        }
        if (query) {
          filtered = filtered.filter(f => String(f.name || "").toLowerCase().includes(query));
        }
        renderFilteredFiles(filtered);
      };

      renderFilteredFiles(files);
      return;
} catch (error) {

      message.textContent =
        error.message ||
        "Unable to load files.";

      message.className =
        "z7af-message is-error";
    }
  }

  async function manageFile(action, id, name) {
    const response = await authFetch(MANAGE_API, {
      method: action === "rename" ? "PATCH" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The file could not be updated.");
    return payload;
  }

  function openRenameDialog(id, name) {
    const dialog = document.getElementById("file-rename-dialog");
    const input = document.getElementById("file-rename-input");
    if (!dialog || !input) return;
    document.getElementById("file-rename-id").value = id;
    input.value = name || "";
    dialog.showModal();
    window.setTimeout(() => input.focus(), 50);
  }

  async function removeFile(id, name, button) {
    if (!window.confirm(`Remove “${name}” from the client library? This also revokes all client access.`)) return;
    button.disabled = true;
    try {
      await manageFile("delete", id, name);
      button.closest(".z7af-file")?.remove();
      document.querySelector("#z7af-message").textContent = "File removed and client access revoked.";
      window.dispatchEvent(new CustomEvent("z7:admin-audit", { detail: { action: "Private file deleted" } }));
      await loadFiles();
    } catch (error) {
      window.alert(error.message || "The file could not be removed.");
    } finally {
      button.disabled = false;
    }
  }

  document.getElementById("file-rename-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const id = document.getElementById("file-rename-id").value;
    const name = document.getElementById("file-rename-input").value.trim();
    if (!name) return;
    const save = form.querySelector('[type="submit"]');
    save.disabled = true;
    try {
      await manageFile("rename", id, name);
      document.getElementById("file-rename-dialog").close();
      await loadFiles();
    } catch (error) {
      window.alert(error.message || "The file could not be renamed.");
    } finally {
      save.disabled = false;
    }
  });
  ["file-rename-close", "file-rename-cancel"].forEach(id => document.getElementById(id)?.addEventListener("click", () => document.getElementById("file-rename-dialog")?.close()));


  function activeDocument(
    name,
    type
  ) {

    const filename =
      String(name || "")
        .toLowerCase();


    const contentType =
      String(type || "")
        .toLowerCase();


    return (
      filename.endsWith(".html") ||
      filename.endsWith(".htm") ||
      filename.endsWith(".svg") ||
      contentType.includes(
        "text/html"
      ) ||
      contentType.includes(
        "application/xhtml"
      ) ||
      contentType.includes(
        "image/svg"
      )
    );
  }

  let lastUploadMessage = "";
  const uploadMessageObserver = new MutationObserver(() => {
    const message = document.getElementById("z7-upload-message");
    const value = message?.textContent?.trim() || "";
    if (!value || value === lastUploadMessage || !/uploaded successfully/i.test(value)) return;
    lastUploadMessage = value;
    loadFiles().then(() => document.dispatchEvent(new CustomEvent("z7:private-file-updated")));
  });
  uploadMessageObserver.observe(document.body, { childList: true, subtree: true, characterData: true });


  async function openFile(
    id,
    name,
    type
  ) {

    const tab =
      window.open(
        "",
        "_blank"
      );


    if (!tab) {

      alert(
        "Please allow pop-ups to preview files."
      );

      return;
    }


    tab.opener = null;


    try {
      let ticket = "";
      try {
        const ticketRes = await authFetch(
          `${API}?id=${encodeURIComponent(id)}&mode=ticket`
        );
        if (ticketRes.ok) {
          const data = await ticketRes.json();
          if (data?.ticket) {
            ticket = data.ticket;
          }
        }
      } catch {
        // Fall back to relying on active session cookies
      }

      const viewUrl =
        `/view/file?id=${encodeURIComponent(id)}${
          ticket ? `&ticket=${encodeURIComponent(ticket)}` : ""
        }`;

      // Directly render the uploaded deliverable in the dedicated isolated viewer endpoint with scoped CSP
      tab.location.replace(viewUrl);

    } catch (error) {

      tab.document.body.innerHTML = `
        <div style="
          min-height:100vh;
          display:grid;
          place-items:center;
          background:#050505;
          color:#ff6975;
          font:14px Arial,sans-serif;
          padding:30px;
        ">
          ${esc(
            error.message ||
            "Unable to open file."
          )}
        </div>
      `;
    }
  }


  async function downloadFile(
    id,
    filename,
    button
  ) {

    const label =
      button.textContent;


    button.disabled = true;

    button.textContent =
      "DOWNLOADING...";


    try {

      const response =
        await authFetch(
          `${API}?id=${
            encodeURIComponent(id)
          }&mode=download`
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


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.download =
        filename ||
        "private-file";


      document.body.appendChild(
        link
      );


      link.click();

      link.remove();


      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        30000
      );


    } catch (error) {

      alert(
        error.message ||
        "Download failed."
      );


    } finally {

      button.disabled = false;

      button.textContent =
        label;
    }
  }


  async function start() {

    /*
     * Wait for Clerk admin session.
     */
    for (
      let i = 0;
      i < 80;
      i++
    ) {

      if (
        (window.Clerk?.user || !document.querySelector('#app')?.classList.contains('hidden'))
      ) {

        ensurePanel();

        await loadFiles();

        break;
      }


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            250
          )
      );
    }


    /*
     * Upload / Access panels are themselves injected
     * dynamically, so keep File Library in the correct
     * position if they appear later.
     */
    const observer =
      new MutationObserver(
        () => {
          ensurePanel();
        }
      );


    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }



  document.addEventListener("z7:admin-ready", async () => {
    ensurePanel();
    await loadFiles();
  });

  window.z7EnsureAdminFilesPanel = async () => {
    ensurePanel();
    return loadFiles();
  };

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  } else {

    start();
  }

})();
