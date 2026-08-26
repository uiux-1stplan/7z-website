(() => {
  "use strict";

  const VERSION =
    "Z7_CLIENT_DELIVERY_FINAL_V1";

  const STATUS_URL =
    "/api/private-auth/hub-status";

  let serial = 0;
  let timer = null;


  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function bytes(value) {
    const n =
      Number(value || 0);

    if (!n) {
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
          Math.log(n) /
          Math.log(1024)
        ),
        units.length - 1
      );

    const amount =
      n /
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
        file?.contentType || ""
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


  function ensureStyle() {
    if (
      document.getElementById(
        "z7-client-delivery-final-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "z7-client-delivery-final-style";

    style.textContent = `
      #z7-client-delivery-final {
        width: min(1180px, calc(100% - 40px));
        margin: 34px auto 72px;
        position: relative;
        z-index: 3;
      }

      #z7-client-delivery-final[hidden] {
        display: none !important;
      }

      .z7cdf-shell {
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 28px;
        padding: clamp(24px, 4vw, 46px);
        background:
          radial-gradient(circle at 82% 12%, rgba(200,166,82,.07), transparent 28%),
          linear-gradient(135deg, rgba(255,255,255,.028), rgba(255,255,255,.012));
        backdrop-filter: blur(12px);
      }

      .z7cdf-head {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 24px;
      }

      .z7cdf-kicker {
        color: #c9a652;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .z7cdf-title {
        margin: 8px 0 8px;
        color: #fff;
        font-size: clamp(34px, 5vw, 64px);
        line-height: .95;
        letter-spacing: -.045em;
      }

      .z7cdf-copy {
        margin: 0;
        color: rgba(255,255,255,.48);
        font-size: 14px;
      }

      .z7cdf-session {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        flex: 0 0 auto;
        padding: 10px 13px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 999px;
        color: rgba(255,255,255,.58);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .11em;
      }

      .z7cdf-session::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #6fe092;
        box-shadow: 0 0 16px rgba(111,224,146,.55);
      }

      .z7cdf-list {
        display: grid;
        gap: 10px;
      }

      .z7cdf-file {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        min-height: 86px;
        padding: 14px 15px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        background: rgba(255,255,255,.018);
      }

      .z7cdf-main {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }

      .z7cdf-icon {
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        border: 1px solid rgba(201,166,82,.24);
        border-radius: 13px;
        background: rgba(201,166,82,.06);
        color: #d4b35e;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .07em;
      }

      .z7cdf-meta {
        min-width: 0;
      }

      .z7cdf-name {
        display: block;
        overflow: hidden;
        color: rgba(255,255,255,.94);
        font-size: 14px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .z7cdf-size {
        display: block;
        margin-top: 5px;
        color: rgba(255,255,255,.36);
        font-size: 11px;
      }

      .z7cdf-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      .z7cdf-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 16px;
        border-radius: 999px;
        text-decoration: none;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .08em;
      }

      .z7cdf-open {
        border: 1px solid rgba(201,166,82,.34);
        background: rgba(201,166,82,.06);
        color: #e0c378;
      }

      .z7cdf-download {
        border: 1px solid rgba(255,255,255,.10);
        color: rgba(255,255,255,.66);
      }

      .z7cdf-empty {
        padding: 28px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        color: rgba(255,255,255,.55);
      }

      @media (max-width: 720px) {
        #z7-client-delivery-final {
          width: min(100% - 24px, 1180px);
          margin-top: 22px;
        }

        .z7cdf-head,
        .z7cdf-file {
          align-items: flex-start;
          flex-direction: column;
        }

        .z7cdf-actions {
          width: 100%;
        }

        .z7cdf-action {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }


  function ensureSection() {
    let section =
      document.getElementById(
        "z7-client-delivery-final"
      );

    if (section) {
      return section;
    }

    ensureStyle();

    section =
      document.createElement(
        "section"
      );

    section.id =
      "z7-client-delivery-final";

    section.hidden =
      true;

    section.innerHTML = `
      <div class="z7cdf-shell">
        <div class="z7cdf-head">
          <div>
            <div class="z7cdf-kicker">
              PRIVATE DELIVERY
            </div>
            <h1 class="z7cdf-title">
              Your Files
            </h1>
            <p class="z7cdf-copy">
              Secure deliverables assigned specifically to your 7Z access.
            </p>
          </div>

          <div class="z7cdf-session">
            SECURE SESSION
          </div>
        </div>

        <div
          id="z7-client-delivery-final-list"
          class="z7cdf-list">
        </div>
      </div>
    `;

    const header =
      document.querySelector(
        ".site-header, .main-header, header"
      );

    if (
      header?.parentNode
    ) {
      header.insertAdjacentElement(
        "afterend",
        section
      );
    } else {
      document.body.prepend(
        section
      );
    }

    return section;
  }


  function hideOldNativeAreas() {
    const selectors = [
      "[data-z7pa-login-panel]",
      "[data-z7pa-grid]",
      ".z7pa-library",
      ".z7pa-hero",
      "#z7-client-private-files"
    ];

    for (const selector of selectors) {
      document
        .querySelectorAll(selector)
        .forEach(
          element => {
            element.hidden =
              true;

            element.style.setProperty(
              "display",
              "none",
              "important"
            );
          }
        );
    }
  }


  function render(payload) {
    const section =
      ensureSection();

    const list =
      document.getElementById(
        "z7-client-delivery-final-list"
      );

    const isClient =
      Boolean(
        payload &&
        payload.ok === true &&
        payload.authenticated === true &&
        payload.admin !== true &&
        (
          payload.authType === "native" ||
          payload.authType === "legacy" ||
          payload.native === true
        )
      );

    if (!isClient) {
      section.hidden =
        true;

      return;
    }

    const files =
      Array.isArray(
        payload.files
      )
        ? payload.files
        : [];

    hideOldNativeAreas();

    section.hidden =
      false;

    if (!list) {
      return;
    }

    if (!files.length) {
      list.innerHTML = `
        <div class="z7cdf-empty">
          No files assigned to this account yet.
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
              <article class="z7cdf-file">
                <div class="z7cdf-main">
                  <div class="z7cdf-icon">
                    ${esc(typeLabel(file))}
                  </div>

                  <div class="z7cdf-meta">
                    <strong class="z7cdf-name">
                      ${esc(file.name)}
                    </strong>
                    <span class="z7cdf-size">
                      ${esc(bytes(file.sizeBytes))}
                    </span>
                  </div>
                </div>

                <div class="z7cdf-actions">
                  <a
                    class="z7cdf-action z7cdf-open"
                    href="${viewUrl}"
                    target="_blank"
                    rel="noopener">
                    OPEN ↗
                  </a>

                  ${
                    file.canDownload
                      ? `
                        <a
                          class="z7cdf-action z7cdf-download"
                          href="${downloadUrl}">
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


  async function refresh() {
    const current =
      ++serial;

    try {
      const response =
        await fetch(
          `${STATUS_URL}?clientDelivery=${Date.now()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "Cache-Control":
                "no-cache"
            }
          }
        );

      const payload =
        await response.json();

      if (
        current !== serial
      ) {
        return;
      }

      if (
        !response.ok
      ) {
        return;
      }

      render(
        payload
      );

    } catch (error) {
      console.error(
        VERSION,
        error
      );
    }
  }


  function boot() {
    ensureSection();
    refresh();

    if (!timer) {
      timer =
        window.setInterval(
          () => {
            if (!document.hidden) {
              refresh();
            }
          },
          1500
        );
    }
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }


  window.addEventListener(
    "z7pa:auth-changed",
    () => {
      window.setTimeout(
        refresh,
        50
      );
    }
  );


  window.addEventListener(
    "pageshow",
    refresh
  );


  window.addEventListener(
    "focus",
    refresh
  );
})();
