(() => {

  "use strict";

  const LIST_API =
    "/api/private-auth/portal-files";

  let loading = false;


  function escapeHtml(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function formatBytes(bytes) {

    const value =
      Number(bytes || 0);

    if (!value) return "";

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

    return `${
      (
        value /
        Math.pow(
          1024,
          index
        )
      ).toFixed(
        index === 0 ? 0 : 1
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

    section.hidden = true;


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
            to your access account.
          </p>

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


  function applyNativeUi(
    payload
  ) {

    if (
      payload?.authenticated &&
      payload?.authType ===
        "native"
    ) {

      document
        .documentElement
        .classList
        .add(
          "z7-native-client-authenticated"
        );


      const loginPanel =
        document.querySelector(
          "[data-z7pa-login-panel]"
        );


      if (loginPanel) {
        loginPanel.hidden = true;
      }

    }
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


    if (!authenticated) {

      section.hidden = true;
      list.innerHTML = "";

      return;
    }


    section.hidden = false;


    if (
      !Array.isArray(files) ||
      !files.length
    ) {

      list.innerHTML = `
        <div class="z7cpf-empty">
          No files are currently assigned
          to this account.
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


          return `
            <article class="z7cpf-file">

              <div class="z7cpf-file-main">

                <div class="z7cpf-file-icon">
                  FILE
                </div>

                <div>

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
                  OPEN
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


  async function loadFiles() {

    if (loading) return;

    loading = true;


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


      const payload =
        await response.json();


      if (!response.ok) {

        render(
          [],
          false
        );

        return;
      }


      applyNativeUi(
        payload
      );


      render(
        payload.files || [],
        Boolean(
          payload.authenticated
        )
      );


    } catch (error) {

      console.warn(
        "Private files:",
        error
      );

    } finally {

      loading = false;
    }
  }


  function refreshAfterLogin() {

    [
      250,
      600,
      1100,
      1800
    ].forEach(
      delay => {

        setTimeout(
          loadFiles,
          delay
        );
      }
    );
  }


  document.addEventListener(
    "submit",
    refreshAfterLogin,
    true
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (!document.hidden) {
        loadFiles();
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
        loadFiles();
      }
    );

  } else {

    ensureSection();
    loadFiles();
  }

})();
