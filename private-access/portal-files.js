(() => {
  "use strict";

  const STATUS_API =
    "/api/private-auth/hub-status";

  let serial = 0;
  let timer = null;


  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function formatBytes(bytes) {
    const value =
      Number(bytes || 0);

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


  function typeLabel(file) {
    const type =
      String(
        file.contentType || ""
      ).toLowerCase();

    if (type.includes("html")) {
      return "HTML";
    }

    if (type.includes("pdf")) {
      return "PDF";
    }

    if (type.startsWith("image/")) {
      return "IMG";
    }

    if (type.startsWith("video/")) {
      return "VIDEO";
    }

    return "FILE";
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
            <h2>Your Files</h2>
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
        document.querySelector("main") ||
        document.body
      ).appendChild(
        section
      );
    }

    return section;
  }


  function render(payload) {
    const section =
      ensureSection();

    const list =
      document.getElementById(
        "z7cpf-list"
      );

    const authenticated =
      Boolean(
        payload &&
        payload.ok !== false &&
        (
          payload.native === true ||
          payload.authType === "native" ||
          payload.authType === "legacy" ||
          (
            Array.isArray(
              payload.allowed
            ) &&
            payload.allowed.length > 0
          )
        )
      );

    if (
      !authenticated ||
      payload?.admin === true
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

    if (!list) {
      return;
    }

    const files =
      Array.isArray(
        payload?.files
      )
        ? payload.files
        : [];

    if (!files.length) {
      list.innerHTML = `
        <div class="z7cpf-empty">
          <strong>No files assigned yet.</strong>
          <span>Your secure delivery area is active.</span>
        </div>
      `;
      return;
    }

    list.innerHTML =
      files
        .map(
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
              <article
                class="z7cpf-file"
                data-file-id="${escapeHtml(file.id)}">

                <div class="z7cpf-file-main">

                  <div
                    class="z7cpf-file-icon"
                    aria-hidden="true">
                    ${escapeHtml(typeLabel(file))}
                  </div>

                  <div class="z7cpf-file-copy">
                    <strong>
                      ${escapeHtml(file.name)}
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
        )
        .join("");
  }


  async function refresh(focus = false) {
    const current =
      ++serial;

    try {
      const response =
        await fetch(
          `${STATUS_API}?delivery=1&t=${Date.now()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache"
            }
          }
        );

      let payload =
        null;

      try {
        payload =
          await response.json();
      } catch {}

      if (
        current !==
        serial
      ) {
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
        payload?.files?.length
      ) {
        setTimeout(
          () => {
            document
              .getElementById(
                "z7-client-private-files"
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          },
          80
        );
      }

    } catch (error) {
      console.warn(
        "Private files refresh:",
        error
      );
    }
  }


  window.addEventListener(
    "z7pa:auth-changed",
    event => {
      if (
        event.detail?.authenticated
      ) {
        refresh(true);
      } else {
        serial++;
        render(null);
      }
    }
  );


  document.addEventListener(
    "submit",
    () => {
      [
        200,
        500,
        900,
        1500
      ].forEach(
        delay => {
          setTimeout(
            () => refresh(true),
            delay
          );
        }
      );
    },
    true
  );


  window.addEventListener(
    "focus",
    () => refresh(false)
  );


  window.addEventListener(
    "pageshow",
    () => refresh(false)
  );


  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        refresh(false);
      }
    }
  );


  ensureSection();
  refresh(false);

  timer =
    setInterval(
      () => {
        if (!document.hidden) {
          refresh(false);
        }
      },
      2000
    );
})();
