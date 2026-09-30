import {
  upload
} from "@vercel/blob/client";

(() => {

  "use strict";

  const INTENT_API =
    "/api/admin/blob-upload-intent";

  const FINALIZE_API =
    "/api/admin/blob-finalize";

  function $(
    selector,
    root = document
  ) {
    return root.querySelector(
      selector
    );
  }

  function formatBytes(bytes) {

    const value =
      Number(bytes || 0);

    if (!value) return "0 B";

    const units = [
      "B",
      "KB",
      "MB",
      "GB",
      "TB"
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
        index === 0
          ? 0
          : 1
      )
    } ${units[index]}`;
  }

  function safeFilename(name) {

    const cleaned =
      String(
        name || "file"
      )
        .normalize("NFKD")
        .replace(
          /[^\w.\-]+/g,
          "-"
        )
        .replace(
          /-+/g,
          "-"
        )
        .replace(
          /^[-.]+|[-.]+$/g,
          ""
        );

    return (
      cleaned ||
      "private-file"
    ).slice(
      0,
      180
    );
  }

  async function authFetch(
    url,
    options = {}
  ) {

    let token = null;

    try {

      token =
        await window
          .Clerk
          ?.session
          ?.getToken?.();

    } catch {}

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
          "same-origin"
      }
    );
  }

  function target() {

    return (
      document.querySelector(
        "#legacy-file-access-panel"
      )?.parentElement ||

      document.querySelector(
        "#app main"
      ) ||

      document.querySelector(
        "#app .main-content"
      ) ||

      document.querySelector(
        "#app"
      )
    );
  }

  function ensurePanel() {

    if (
      document.getElementById(
        "z7-private-upload-panel"
      )
    ) {
      return;
    }

    const container =
      target();

    if (!container) {
      return;
    }

    const panel =
      document.createElement(
        "section"
      );

    panel.id =
      "z7-private-upload-panel";

    panel.className =
      "panel z7-private-upload-panel";

    panel.innerHTML = `
      <div class="z7-upload-head">

        <div>
          <div class="page-kicker">
            PRIVATE STORAGE
          </div>

          <h2>
            Upload Private File
          </h2>

          <p>
            Upload protected documents,
            presentations, ZIP files,
            images or video directly to
            secure 7Z storage.
          </p>
        </div>

        <span class="z7-private-badge">
          PRIVATE
        </span>

      </div>

      <div class="z7-upload-drop">

        <input
          id="z7-upload-input"
          type="file"
          hidden
        >

        <button
          id="z7-upload-picker"
          type="button"
          class="z7-upload-picker">
          SELECT FILE
        </button>

        <div
          id="z7-upload-file"
          class="z7-upload-file">
          No file selected
        </div>

        <button
          id="z7-upload-submit"
          type="button"
          class="z7-upload-submit"
          disabled>
          UPLOAD PRIVATE FILE
        </button>

      </div>

      <div
        id="z7-upload-progress-wrap"
        class="z7-upload-progress-wrap"
        hidden>

        <div class="z7-upload-progress-meta">
          <span>Uploading securely...</span>
          <strong id="z7-upload-progress-label">
            0%
          </strong>
        </div>

        <div class="z7-upload-progress">
          <div
            id="z7-upload-progress-bar">
          </div>
        </div>

      </div>

      <div
        id="z7-upload-message"
        class="z7-upload-message">
      </div>
    `;

    const legacy =
      document.getElementById(
        "legacy-file-access-panel"
      );

    if (
      legacy &&
      legacy.parentElement ===
      container
    ) {

      container.insertBefore(
        panel,
        legacy
      );

    } else {

      container.appendChild(
        panel
      );
    }

    bind();
  }

  function bind() {

    const input =
      $("#z7-upload-input");

    const picker =
      $("#z7-upload-picker");

    const submit =
      $("#z7-upload-submit");

    const fileInfo =
      $("#z7-upload-file");

    picker?.addEventListener(
      "click",
      () => input?.click()
    );

    input?.addEventListener(
      "change",
      () => {

        const file =
          input.files?.[0];

        if (!file) {

          submit.disabled = true;

          fileInfo.textContent =
            "No file selected";

          return;
        }

        fileInfo.innerHTML = `
          <strong>
            ${escapeHtml(file.name)}
          </strong>

          <span>
            ${formatBytes(file.size)}
            ·
            ${escapeHtml(
              file.type ||
              "Unknown type"
            )}
          </span>
        `;

        submit.disabled = false;
      }
    );

    submit?.addEventListener(
      "click",
      uploadSelected
    );
  }

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

  async function uploadSelected() {

    const input =
      $("#z7-upload-input");

    const submit =
      $("#z7-upload-submit");

    const picker =
      $("#z7-upload-picker");

    const wrap =
      $("#z7-upload-progress-wrap");

    const label =
      $("#z7-upload-progress-label");

    const bar =
      $("#z7-upload-progress-bar");

    const message =
      $("#z7-upload-message");

    const file =
      input?.files?.[0];

    if (!file) {
      return;
    }

    submit.disabled = true;
    picker.disabled = true;

    wrap.hidden = false;

    label.textContent = "0%";
    bar.style.width = "0%";

    message.className =
      "z7-upload-message";

    message.textContent = "";

    try {

      /*
       * Step 1:
       * authenticated admin gets short-lived
       * signed upload intent.
       */
      const intentResponse =
        await authFetch(
          INTENT_API,
          {
            method: "POST"
          }
        );

      const intentPayload =
        await intentResponse.json();

      if (!intentResponse.ok) {

        throw new Error(
          intentPayload.error ||
          "Could not authorize upload."
        );
      }

      const safeName =
        safeFilename(
          file.name
        );

      const pathname =
        `portal/${Date.now()}-${safeName}`;

      /*
       * Step 2:
       * Browser -> Vercel Blob directly.
       *
       * Large files use multipart mode
       * and never pass through our Function body.
       */
      const blob =
        await upload(
          pathname,
          file,
          {
            access: "private",

            handleUploadUrl:
              "/api/admin/blob-upload" +
              "?intent=" +
              encodeURIComponent(
                intentPayload.intent
              ),

            multipart:
              file.size >
              (10 * 1024 * 1024),

            onUploadProgress({
              percentage
            }) {

              const value =
                Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      percentage || 0
                    )
                  )
                );

              label.textContent =
                `${value}%`;

              bar.style.width =
                `${value}%`;
            }
          }
        );

      label.textContent =
        "100%";

      bar.style.width =
        "100%";

      /*
       * Step 3:
       * Authenticated finalization into Neon.
       * This works locally; no Blob callback needed.
       */
      const finalizeResponse =
        await authFetch(
          FINALIZE_API,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                pathname:
                  blob.pathname,

                url:
                  blob.url,

                originalName:
                  file.name,

                size:
                  file.size,

                contentType:
                  file.type ||
                  blob.contentType ||
                  null
              })
          }
        );

      const finalize =
        await finalizeResponse.json();

      if (!finalizeResponse.ok) {

        throw new Error(
          finalize.error ||
          "File uploaded but could not be registered."
        );
      }

      message.className =
        "z7-upload-message is-success";

      message.textContent =
        "Private file uploaded successfully.";

      input.value = "";

      $("#z7-upload-file")
        .textContent =
          "No file selected";

      /*
       * Refresh file permissions panel
       * so new file appears immediately.
       */
      document
        .getElementById(
          "z7-cap-refresh"
        )
        ?.click();

    } catch (error) {

      console.error(
        "Private upload:",
        error
      );

      message.className =
        "z7-upload-message is-error";

      message.textContent =
        error?.message ||
        "Private upload failed.";

    } finally {

      submit.disabled =
        !input?.files?.length;

      picker.disabled = false;
    }
  }

  async function boot() {

    for (
      let attempt = 0;
      attempt < 60;
      attempt++
    ) {

      if (
        window.Clerk?.user &&
        target()
      ) {

        ensurePanel();
        return;
      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            500
          )
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();
  }

})();
