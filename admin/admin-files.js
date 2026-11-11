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

            <div class="page-kicker">
              PRIVATE STORAGE
            </div>

            <h2>
              File Library
            </h2>

            <p>
              Open or download every private file
              uploaded through the administration portal.
            </p>

          </div>


          <button
            type="button"
            id="z7af-refresh"
            class="z7af-refresh">
            REFRESH
          </button>

        </div>


        <div
          id="z7af-message"
          class="z7af-message">
        </div>


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

      const response =
        await authFetch(
          API
        );


      const payload =
        await response.json();


      if (!response.ok) {

        throw new Error(
          payload.error ||
          "Unable to load files."
        );
      }


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


      list.innerHTML =
        files.map(
          file => `
            <article class="z7af-file">

              <div class="z7af-file-info">

                <strong>
                  ${esc(
                    file.name
                  )}
                </strong>

                <span>
                  ${esc(
                    file.contentType ||
                    "Private file"
                  )}
                </span>

                <small>
                  ${esc(
                    bytes(
                      file.sizeBytes
                    )
                  )}
                </small>

              </div>


              <div class="z7af-actions">

                <button
                  type="button"
                  class="z7af-open"
                  data-open="${esc(
                    file.id
                  )}"
                  data-name="${esc(
                    file.name
                  )}"
                  data-type="${esc(
                    file.contentType ||
                    ""
                  )}">
                  OPEN
                </button>


                <button
                  type="button"
                  class="z7af-download"
                  data-download="${esc(
                    file.id
                  )}"
                  data-name="${esc(
                    file.name
                  )}">
                  DOWNLOAD
                </button>

                <button type="button" class="z7af-manage" data-rename="${esc(file.id)}" data-name="${esc(file.name)}">RENAME</button>
                <button type="button" class="z7af-manage is-danger" data-remove="${esc(file.id)}" data-name="${esc(file.name)}">REMOVE</button>

              </div>

            </article>
          `
        ).join("");


      list
        .querySelectorAll(
          "[data-open]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () =>
                openFile(
                  button.dataset.open,
                  button.dataset.name,
                  button.dataset.type
                )
            );
          }
        );


      list
        .querySelectorAll(
          "[data-download]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () =>
                downloadFile(
                  button.dataset.download,
                  button.dataset.name,
                  button
                )
            );
          }
        );

      list.querySelectorAll("[data-rename]").forEach(button => button.addEventListener("click", () => openRenameDialog(button.dataset.rename, button.dataset.name)));
      list.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => removeFile(button.dataset.remove, button.dataset.name, button)));


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

      tab.document.body.innerHTML = `
        <div style="
          min-height:100vh;
          display:grid;
          place-items:center;
          background:#050505;
          color:#c9aa58;
          font:12px Arial,sans-serif;
          letter-spacing:.08em;
        ">
          LOADING PRIVATE FILE...
        </div>
      `;


      const response =
        await authFetch(
          `${API}?id=${
            encodeURIComponent(id)
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


      if (
        activeDocument(
          name,
          blob.type || type
        )
      ) {

        tab.document.open();

        tab.document.write(`
          <!doctype html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>7Z Secure Preview</title>
            <style>
              html,body{
                width:100%;
                height:100%;
                margin:0;
                overflow:hidden;
                background:#050505;
              }

              iframe{
                width:100%;
                height:100%;
                border:0;
                display:block;
              }
            </style>
          </head>

          <body>
            <iframe
              id="preview"
              sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads">
            </iframe>
          </body>
          </html>
        `);

        tab.document.close();


        tab.document
          .getElementById(
            "preview"
          )
          .src = url;

      } else {

        tab.location.replace(
          url
        );
      }


      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        10 * 60 * 1000
      );


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
        window.Clerk?.user &&
        window.Clerk?.session
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
