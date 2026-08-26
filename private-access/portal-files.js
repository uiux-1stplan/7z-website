(() => {
  "use strict";

  const LIST_API =
    "/api/private-auth/portal-files";

  let serial = 0;


  function escapeHtml(value) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      );
  }


  function formatBytes(bytes) {

    const value =
      Number(
        bytes || 0
      );

    if (!value) {
      return "";
    }

    const units = [
      "B",
      "KB",
      "MB",
      "GB"
    ];

    const index =
      Math.min(
        Math.floor(
          Math.log(value) /
          Math.log(1024)
        ),
        units.length - 1
      );

    const amount =
      value /
      Math.pow(
        1024,
        index
      );

    return `${
      amount.toFixed(
        index === 0
          ? 0
          : 1
      )
    } ${units[index]}`;
  }


  function ensureSection() {

    let section =
      document.getElementById(
        "z7-client-private-files"
      );

    if (section) {
      return section;
    }

    section =
      document.createElement(
        "section"
      );

    section.id =
      "z7-client-private-files";

    section.className =
      "z7-client-private-files";

    section.hidden =
      true;

    section.innerHTML = `
      <div class="z7cpf-inner">

        <div class="z7cpf-heading">

          <div>
            <div class="z7cpf-kicker">
              PRIVATE DELIVERY
            </div>

            <h2>
              Your Files
            </h2>

            <p>
              Secure deliverables assigned specifically
              to your private 7Z access.
            </p>
          </div>

          <div
            class="z7cpf-session"
            aria-label="Secure private session">
            <i></i>
            SECURE SESSION
          </div>

        </div>

        <div
          id="z7cpf-list"
          class="z7cpf-list">
        </div>

      </div>
    `;

    const footer =
      document.querySelector(
        "footer"
      );

    if (footer) {

      footer.before(
        section
      );

    } else {

      (
        document.querySelector(
          "main"
        ) ||
        document.body
      ).appendChild(
        section
      );
    }

    return section;
  }


  function render(
    files,
    authenticated = false
  ) {

    const section =
      ensureSection();

    const list =
      document.getElementById(
        "z7cpf-list"
      );

    if (
      !authenticated
    ) {

      section.hidden =
        true;

      if (list) {
        list.innerHTML = "";
      }

      return;
    }

    section.hidden =
      false;

    if (!list) return;


    if (
      !Array.isArray(files) ||
      files.length === 0
    ) {

      list.innerHTML = `
        <div class="z7cpf-empty">
          <strong>
            No files assigned yet.
          </strong>
          <span>
            Your secure delivery area is active.
          </span>
        </div>
      `;

      return;
    }


    list.innerHTML =
      files.map(
        file => {

          const id =
            encodeURIComponent(
              file.id
            );

          const viewUrl =
            `/api/private-auth/portal-file?id=${id}&mode=view`;

          const downloadUrl =
            `/api/private-auth/portal-file?id=${id}&mode=download`;

          const contentType =
            String(
              file.contentType || ""
            );

          let type =
            "FILE";

          if (
            contentType.includes(
              "pdf"
            )
          ) {
            type = "PDF";
          } else if (
            contentType.includes(
              "html"
            )
          ) {
            type = "HTML";
          } else if (
            contentType.startsWith(
              "image/"
            )
          ) {
            type = "IMG";
          } else if (
            contentType.startsWith(
              "video/"
            )
          ) {
            type = "VIDEO";
          }

          return `
            <article class="z7cpf-file">

              <div class="z7cpf-file-main">

                <div
                  class="z7cpf-file-icon"
                  aria-hidden="true">
                  ${escapeHtml(type)}
                </div>

                <div class="z7cpf-file-copy">

                  <strong>
                    ${escapeHtml(
                      file.name
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      formatBytes(
                        file.sizeBytes
                      )
                    )}
                  </span>

                </div>

              </div>

              <div class="z7cpf-actions">

                <a
                  href="${viewUrl}"
                  target="_blank"
                  rel="noopener"
                  class="z7cpf-open">
                  <span>OPEN</span>
                  <b aria-hidden="true">↗</b>
                </a>

                ${
                  file.canDownload
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
        }
      ).join("");
  }


  async function loadFiles(
    focus = false
  ) {

    const requestId =
      ++serial;

    try {

      const response =
        await fetch(
          LIST_API,
          {
            credentials:
              "same-origin",

            cache:
              "no-store"
          }
        );

      let payload = null;

      try {
        payload =
          await response.json();
      } catch {}


      /*
       * Ignore stale responses.
       * Prevents pre-login 401 racing
       * against successful login.
       */
      if (
        requestId !== serial
      ) {
        return;
      }


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        render(
          [],
          false
        );

        return;
      }


      if (
        !response.ok ||
        !payload
      ) {

        render(
          [],
          false
        );

        return;
      }


      render(
        payload.files || [],
        Boolean(
          payload.authenticated
        )
      );


      if (
        focus &&
        payload.authenticated
      ) {

        const section =
          document.getElementById(
            "z7-client-private-files"
          );

        window.setTimeout(
          () => {

            section?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start"
            });
          },
          80
        );
      }


    } catch (error) {

      console.warn(
        "Private files:",
        error
      );
    }
  }


  window.addEventListener(
    "z7pa:auth-changed",
    event => {

      const authenticated =
        Boolean(
          event.detail
            ?.authenticated
        );

      if (!authenticated) {

        serial++;

        render(
          [],
          false
        );

        return;
      }

      loadFiles(
        true
      );
    }
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        !document.hidden &&
        document.body.classList.contains(
          "z7pa-is-authenticated"
        )
      ) {

        loadFiles(
          false
        );
      }
    }
  );


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      () => {

        ensureSection();

        loadFiles(
          false
        );
      }
    );

  } else {

    ensureSection();

    loadFiles(
      false
    );
  }

})();