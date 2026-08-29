(() => {

  "use strict";


  const API =
    "/api/admin/files";


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

    const upload =
      document.getElementById(
        "z7-private-upload-panel"
      );


    if (upload) {
      return {
        mode: "after",
        element: upload
      };
    }


    const access =
      document.getElementById(
        "legacy-file-access-panel"
      );


    if (access) {
      return {
        mode: "before",
        element: access
      };
    }


    return null;
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

      if (
        host.mode === "after" &&
        host.element.nextElementSibling !==
        panel
      ) {

        host.element.insertAdjacentElement(
          "afterend",
          panel
        );

      } else if (
        host.mode === "before" &&
        host.element.previousElementSibling !==
        panel
      ) {

        host.element.insertAdjacentElement(
          "beforebegin",
          panel
        );
      }

    } else if (!panel.isConnected) {

      (
        document.querySelector(
          "main"
        ) ||
        document.body
      ).appendChild(
        panel
      );
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


    } catch (error) {

      message.textContent =
        error.message ||
        "Unable to load files.";

      message.className =
        "z7af-message is-error";
    }
  }


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
