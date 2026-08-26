(() => {
  "use strict";

  if (window.__Z7_CLIENT_FILES_RENDERER_V1__) {
    return;
  }

  window.__Z7_CLIENT_FILES_RENDERER_V1__ = true;

  const DOC = window.document;
  const LIST_API = "/api/private-auth/portal-files";

  let requestSerial = 0;
  let timer = null;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (!Number.isFinite(value) || value <= 0) {
      return "";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(value) / Math.log(1024)),
      units.length - 1
    );

    const result =
      value / Math.pow(1024, index);

    return `${
      result.toFixed(index === 0 ? 0 : 1)
    } ${units[index]}`;
  }

  function fileType(file) {
    const name = String(file?.name || "");
    const dot = name.lastIndexOf(".");

    if (dot > -1 && dot < name.length - 1) {
      return name.slice(dot + 1).toUpperCase().slice(0, 5);
    }

    return "FILE";
  }

  function ensureSection() {
    let section =
      DOC.querySelector("#z7-client-private-files");

    if (!section) {
      section = DOC.createElement("section");

      section.id = "z7-client-private-files";
      section.className = "z7-client-private-files";

      section.innerHTML = `
        <div class="z7cpf-inner">

          <div class="z7cpf-heading">

            <div class="z7cpf-kicker">
              PRIVATE DELIVERY
            </div>

            <h2>
              Your Files
            </h2>

            <p>
              Secure files assigned specifically
              to your private 7Z access.
            </p>

          </div>

          <div
            id="z7cpf-list"
            class="z7cpf-list">
          </div>

        </div>
      `;

      const footer =
        DOC.querySelector("footer");

      if (footer) {
        footer.before(section);
      } else {
        (
          DOC.querySelector("main") ||
          DOC.body
        ).appendChild(section);
      }
    }

    section.hidden = false;
    section.removeAttribute("hidden");
    section.style.removeProperty("display");

    return section;
  }

  function hideSection() {
    const section =
      DOC.querySelector("#z7-client-private-files");

    if (section) {
      section.hidden = true;
    }
  }

  function render(payload) {
    if (
      !payload ||
      payload.authenticated !== true
    ) {
      hideSection();
      return;
    }

    const section = ensureSection();

    let list =
      section.querySelector("#z7cpf-list");

    if (!list) {
      list = DOC.createElement("div");
      list.id = "z7cpf-list";
      list.className = "z7cpf-list";
      section.appendChild(list);
    }

    const files =
      Array.isArray(payload.files)
        ? payload.files
        : [];

    if (!files.length) {
      list.innerHTML = `
        <div class="z7cpf-empty">
          No files are currently assigned
          to this account.
        </div>
      `;

      return;
    }

    list.innerHTML = files.map(file => {
      const id =
        encodeURIComponent(
          String(file.id || "")
        );

      const viewUrl =
        `/api/private-auth/portal-file?id=${id}&mode=view`;

      const downloadUrl =
        `/api/private-auth/portal-file?id=${id}&mode=download`;

      return `
        <article
          class="z7cpf-file"
          data-file-id="${esc(file.id)}">

          <div class="z7cpf-file-main">

            <div
              class="z7cpf-file-icon"
              aria-hidden="true">
              ${esc(fileType(file))}
            </div>

            <div class="z7cpf-file-copy">

              <strong>
                ${esc(file.name)}
              </strong>

              <span>
                ${esc(
                  formatBytes(
                    file.sizeBytes
                  )
                )}
              </span>

            </div>

          </div>

          <div class="z7cpf-actions">

            ${
              file.canView !== false
                ? `
                  <a
                    href="${viewUrl}"
                    target="_blank"
                    rel="noopener"
                    class="z7cpf-open">
                    <span>OPEN</span>
                    <b aria-hidden="true">↗</b>
                  </a>
                `
                : ""
            }

            ${
              file.canDownload === true
                ? `
                  <a
                    href="${downloadUrl}"
                    class="z7cpf-download">
                    DOWNLOAD
                  </a>
                `
                : ""
            }

          </div>

        </article>
      `;
    }).join("");

    section.hidden = false;
    section.removeAttribute("hidden");
    section.style.removeProperty("display");
  }

  async function refresh(focus = false) {
    const serial = ++requestSerial;

    try {
      const response =
        await window.fetch(
          `${LIST_API}?t=${Date.now()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache"
            }
          }
        );

      let payload = null;

      try {
        payload =
          await response.json();
      } catch {}

      if (serial !== requestSerial) {
        return;
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        hideSection();
        return;
      }

      if (
        !response.ok ||
        !payload
      ) {
        return;
      }

      render(payload);

      if (
        focus &&
        payload.authenticated === true &&
        Array.isArray(payload.files) &&
        payload.files.length
      ) {
        window.setTimeout(() => {
          DOC
            .querySelector("#z7-client-private-files")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        }, 100);
      }

    } catch (error) {
      console.error(
        "7Z client file renderer:",
        error
      );
    }
  }

  function startPolling() {
    if (timer) {
      return;
    }

    timer =
      window.setInterval(
        () => {
          if (!DOC.hidden) {
            refresh(false);
          }
        },
        2000
      );
  }

  window.addEventListener(
    "z7pa:auth-changed",
    event => {
      if (
        event.detail?.authenticated
      ) {
        refresh(true);
      } else {
        hideSection();
      }
    }
  );

  window.addEventListener(
    "z7pa:session-change",
    () => refresh(true)
  );

  DOC.addEventListener(
    "submit",
    () => {
      [
        250,
        600,
        1100,
        1800
      ].forEach(delay => {
        window.setTimeout(
          () => refresh(true),
          delay
        );
      });
    },
    true
  );

  window.addEventListener(
    "pageshow",
    () => refresh(false)
  );

  window.addEventListener(
    "focus",
    () => refresh(false)
  );

  DOC.addEventListener(
    "visibilitychange",
    () => {
      if (!DOC.hidden) {
        refresh(false);
      }
    }
  );

  refresh(false);
  startPolling();
})();
