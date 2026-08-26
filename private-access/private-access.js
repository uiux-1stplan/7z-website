(() => {
  "use strict";

  if (
    window.__Z7_PRIVATE_ACCESS_FINAL_V1__
  ) {
    return;
  }

  window.__Z7_PRIVATE_ACCESS_FINAL_V1__ =
    true;


  const D =
    window.document;


  const API =
    Object.freeze({

      status:
        "/api/private-auth/hub-status",

      login:
        "/api/private-auth/hub-login",

      logout:
        "/api/private-auth/hub-logout",

      files:
        "/api/private-auth/portal-files",

      file:
        "/api/private-auth/portal-file"

    });


  const q =
    (
      selector,
      root = D
    ) =>
      root.querySelector(
        selector
      );


  const qa =
    (
      selector,
      root = D
    ) =>
      Array.from(
        root.querySelectorAll(
          selector
        )
      );


  const panel =
    q(
      "[data-z7pa-login-panel]"
    );


  const form =
    q(
      "#z7PrivateAccessLoginForm"
    );


  const clientId =
    q(
      "#z7HubClientId"
    );


  const accessKey =
    q(
      "#z7HubAccessKey"
    );


  const message =
    q(
      "#z7HubLoginMessage"
    );


  const seat =
    q(
      "#z7InnerCircleSeat"
    );


  const hero =
    q(
      ".z7pa-hero"
    );


  const library =
    q(
      ".z7pa-library"
    );


  const policy =
    q(
      ".z7pa-policy"
    );


  const grid =
    q(
      "[data-z7pa-grid]"
    );


  const cards =
    qa(
      "[data-z7pa-resource]"
    );


  const count =
    q(
      "[data-z7pa-count]"
    );


  const label =
    q(
      "[data-z7pa-access-label]"
    );


  const siteHeader =
    q(
      ".site-header"
    );


  const headerSocials =
    q(
      ".header-socials"
    );


  let authenticated =
    false;


  let serial =
    0;


  /*
   * HEADER LOGIN / LOGOUT
   */


  function ensureHeaderButton() {

    let button =
      q(
        "#z7paHeaderAccessButton"
      );


    if (button) {

      return button;
    }


    if (!siteHeader) {

      return null;
    }


    button =
      D.createElement(
        "button"
      );


    button.type =
      "button";


    button.id =
      "z7paHeaderAccessButton";


    button.className =
      "z7pa-header-access magnetic";


    button.innerHTML =
      '<span>LOGIN</span><b aria-hidden="true">↗</b>';


    siteHeader.insertBefore(
      button,
      headerSocials ||
      null
    );


    return button;
  }


  const accessButton =
    ensureHeaderButton();


  function updateHeader(
    active
  ) {

    if (!accessButton) {

      return;
    }


    const text =
      q(
        "span",
        accessButton
      );


    if (text) {

      text.textContent =
        active
          ? "SIGN OUT"
          : "LOGIN";
    }


    accessButton.classList.toggle(
      "is-authenticated",
      active
    );


    accessButton.setAttribute(
      "aria-label",

      active
        ? "Sign out of Private Access"
        : "Login to Private Access"
    );
  }


  /*
   * INNER CIRCLE
   */


  function openLogin() {

    if (
      authenticated ||
      !panel
    ) {

      return;
    }


    if (hero) {

      hero.hidden =
        false;
    }


    if (library) {

      library.hidden =
        false;
    }


    if (policy) {

      policy.hidden =
        false;
    }


    panel.hidden =
      false;


    panel.removeAttribute(
      "hidden"
    );


    panel.setAttribute(
      "aria-hidden",
      "false"
    );


    panel.classList.remove(
      "is-denied",
      "is-authorized"
    );


    /*
     * Current CSS requires is-open.
     */
    panel.classList.add(
      "is-opening",
      "is-open"
    );


    seat?.setAttribute(
      "aria-expanded",
      "true"
    );


    window.setTimeout(
      () =>
        panel.classList.remove(
          "is-opening"
        ),
      1100
    );


    window.setTimeout(
      () =>
        clientId?.focus(),
      350
    );
  }


  function closeLogin() {

    if (!panel) {

      return;
    }


    panel.classList.remove(
      "is-opening",
      "is-open",
      "is-denied",
      "is-authorized"
    );


    panel.hidden =
      true;


    panel.setAttribute(
      "aria-hidden",
      "true"
    );


    seat?.setAttribute(
      "aria-expanded",
      "false"
    );
  }


  /*
   * FILE DELIVERY
   */


  function esc(
    value
  ) {

    return String(
      value ??
      ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  function formatBytes(
    value
  ) {

    const number =
      Number(
        value ||
        0
      );


    if (
      !Number.isFinite(
        number
      ) ||
      number <= 0
    ) {

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
          Math.log(
            number
          ) /
          Math.log(
            1024
          )
        ),

        units.length -
        1
      );


    return (
      number /
      Math.pow(
        1024,
        index
      )
    ).toFixed(
      index
        ? 1
        : 0
    ) +
      " " +
      units[index];
  }


  function fileType(
    file
  ) {

    const type =
      String(
        file?.contentType ||
        ""
      )
        .toLowerCase();


    const name =
      String(
        file?.name ||
        ""
      )
        .toLowerCase();


    if (
      type.includes(
        "html"
      ) ||
      name.endsWith(
        ".html"
      ) ||
      name.endsWith(
        ".htm"
      )
    ) {

      return "HTML";
    }


    if (
      type.includes(
        "pdf"
      ) ||
      name.endsWith(
        ".pdf"
      )
    ) {

      return "PDF";
    }


    if (
      type.startsWith(
        "image/"
      )
    ) {

      return "IMG";
    }


    if (
      type.startsWith(
        "video/"
      )
    ) {

      return "VIDEO";
    }


    const dot =
      name.lastIndexOf(
        "."
      );


    return dot >= 0

      ? name
          .slice(
            dot + 1
          )
          .toUpperCase()
          .slice(
            0,
            5
          )

      : "FILE";
  }


  function ensureFilesSection() {

    let section =
      q(
        "#z7-client-private-files"
      );


    if (section) {

      return section;
    }


    section =
      D.createElement(
        "section"
      );


    section.id =
      "z7-client-private-files";


    section.className =
      "z7-client-private-files";


    section.hidden =
      true;


    section.innerHTML =
      '<div class="z7cpf-inner">' +
      '<div class="z7cpf-heading">' +
      '<div>' +
      '<div class="z7cpf-kicker">PRIVATE DELIVERY</div>' +
      '<h2>Your Files</h2>' +
      '<p>Secure deliverables assigned specifically to your private 7Z access.</p>' +
      '</div>' +
      '<div class="z7cpf-session"><i></i>SECURE SESSION</div>' +
      '</div>' +
      '<div id="z7cpf-list" class="z7cpf-list"></div>' +
      '</div>';


    const footer =
      q(
        "footer"
      );


    if (footer) {

      footer.before(
        section
      );

    } else {

      (
        q(
          "main"
        ) ||
        D.body
      ).appendChild(
        section
      );
    }


    return section;
  }


  function renderFiles(
    files,
    active,
    admin
  ) {

    const section =
      ensureFilesSection();


    const list =
      q(
        "#z7cpf-list",
        section
      );


    if (
      !active ||
      admin
    ) {

      section.hidden =
        true;


      section.style.setProperty(
        "display",
        "none",
        "important"
      );


      if (list) {

        list.innerHTML =
          "";
      }


      return;
    }


    section.hidden =
      false;


    section.removeAttribute(
      "hidden"
    );


    /*
     * Explicitly defeat stale display:none rules
     * from the previous renderer architecture.
     */
    section.style.setProperty(
      "display",
      "block",
      "important"
    );


    section.style.setProperty(
      "visibility",
      "visible",
      "important"
    );


    section.style.setProperty(
      "opacity",
      "1",
      "important"
    );


    if (!list) {

      return;
    }


    const safeFiles =
      Array.isArray(
        files
      )
        ? files
        : [];


    if (
      !safeFiles.length
    ) {

      list.innerHTML =
        '<div class="z7cpf-empty">' +
        'No files are currently assigned to this account.' +
        '</div>';


      return;
    }


    list.innerHTML =
      safeFiles
        .map(
          file => {

            const id =
              encodeURIComponent(
                String(
                  file.id ||
                  ""
                )
              );


            const viewUrl =
              API.file +
              "?id=" +
              id +
              "&mode=view";


            const downloadUrl =
              API.file +
              "?id=" +
              id +
              "&mode=download";


            return (
              '<article class="z7cpf-file" data-file-id="' +
              esc(
                file.id
              ) +
              '">' +

              '<div class="z7cpf-file-main">' +

              '<div class="z7cpf-file-icon">' +
              esc(
                fileType(
                  file
                )
              ) +
              '</div>' +

              '<div class="z7cpf-file-copy">' +
              '<strong>' +
              esc(
                file.name
              ) +
              '</strong>' +
              '<span>' +
              esc(
                formatBytes(
                  file.sizeBytes
                )
              ) +
              '</span>' +
              '</div>' +

              '</div>' +

              '<div class="z7cpf-actions">' +

              (
                file.canView !==
                false

                  ? '<a href="' +
                    viewUrl +
                    '" target="_blank" rel="noopener" class="z7cpf-open">' +
                    '<span>OPEN</span>' +
                    '<b aria-hidden="true">↗</b>' +
                    '</a>'

                  : ''
              ) +

              (
                file.canDownload ===
                true

                  ? '<a href="' +
                    downloadUrl +
                    '" class="z7cpf-download">' +
                    'DOWNLOAD' +
                    '</a>'

                  : ''
              ) +

              '</div>' +

              '</article>'
            );
          }
        )
        .join(
          ""
        );
  }


  /*
   * SESSION + PERMISSIONS
   */


  function allowedOf(
    payload
  ) {

    if (
      payload?.admin
    ) {

      return [
        "silla",
        "elcon",
        "blueprint-html",
        "blueprint-pdf",
        "tawjihi-quotation",
        "oman-partnership"
      ];
    }


    return Array.isArray(
      payload?.allowed
    )
      ? payload.allowed
      : [];
  }


  function apply(
    statusPayload,
    filesPayload
  ) {

    const allowed =
      allowedOf(
        statusPayload
      );


    const admin =
      Boolean(
        statusPayload?.admin
      );


    /*
     * File API is the authority for the
     * client's current file grants.
     */
    const files =
      Array.isArray(
        filesPayload?.files
      )

        ? filesPayload.files

        : Array.isArray(
            statusPayload?.files
          )

          ? statusPayload.files

          : [];


    const statusAuthenticated =
      Boolean(

        statusPayload &&

        statusPayload.ok !==
        false &&

        (
          statusPayload.authenticated ===
            true ||

          statusPayload.native ===
            true ||

          admin ||

          allowed.length >
            0
        )
      );


    const fileAuthenticated =
      Boolean(
        filesPayload?.authenticated ===
        true
      );


    /*
     * Critical fix:
     *
     * A Native client who has only file access
     * is STILL a valid authenticated client.
     */
    authenticated =
      statusAuthenticated ||
      fileAuthenticated;


    const hasResources =
      allowed.length >
      0;


    const fileOnly =
      authenticated &&
      !admin &&
      !hasResources;


    D.documentElement
      .classList.toggle(
        "z7icx-preauth",
        !authenticated
      );


    D.body
      .classList.toggle(
        "z7pa-is-authenticated",
        authenticated
      );


    D.body
      .classList.toggle(
        "z7pa-is-locked",
        !authenticated
      );


    D.body
      .classList.toggle(
        "z7pa-is-admin",
        admin
      );


    D.body
      .classList.toggle(
        "z7pa-file-only",
        fileOnly
      );


    if (
      authenticated
    ) {

      closeLogin();
    }


    /*
     * File-only client gets the delivery workspace,
     * not the empty Legacy Access Policy screen.
     */
    if (hero) {

      hero.hidden =
        fileOnly;
    }


    if (library) {

      library.hidden =
        fileOnly;
    }


    if (policy) {

      policy.hidden =
        fileOnly;
    }


    if (grid) {

      grid.hidden =
        !hasResources;
    }


    for (
      const card
      of cards
    ) {

      const scope =
        card.getAttribute(
          "data-z7pa-resource"
        );


      card.hidden =
        !allowed.includes(
          scope
        );
    }


    if (count) {

      count.textContent =
        String(
          fileOnly
            ? files.length
            : allowed.length
        )
          .padStart(
            2,
            "0"
          );
    }


    if (label) {

      label.textContent =

        admin
          ? "ADMIN ACCESS"

          : fileOnly
            ? "PRIVATE DELIVERY"

            : authenticated &&
              hasResources
              ? "AUTHORIZED RESOURCES"

              : "LOGIN REQUIRED";
    }


    if (
      message &&
      authenticated
    ) {

      message.textContent =
        "";
    }


    updateHeader(
      authenticated
    );


    renderFiles(
      files,
      authenticated,
      admin
    );
  }


  /*
   * NETWORK
   */


  async function fetchJson(
    url,
    options = {}
  ) {

    const response =
      await window.fetch(
        url,
        {
          credentials:
            "same-origin",

          cache:
            "no-store",

          ...options
        }
      );


    let payload =
      null;


    try {

      payload =
        await response.json();

    } catch {}


    return {
      response,
      payload
    };
  }


  async function sync() {

    const requestId =
      ++serial;


    try {

      const [
        statusResult,
        filesResult
      ] =
        await Promise.all([

          fetchJson(
            API.status +
            "?t=" +
            Date.now()
          ),

          fetchJson(
            API.files +
            "?t=" +
            Date.now()
          )
        ]);


      if (
        requestId !==
        serial
      ) {

        return;
      }


      apply(

        statusResult.response.ok
          ? statusResult.payload
          : null,

        filesResult.response.ok
          ? filesResult.payload
          : null
      );


    } catch (error) {

      console.error(
        "7Z Private Access sync:",
        error
      );
    }
  }


  /*
   * LOGIN
   */


  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const submit =
        q(
          'button[type="submit"]',
          form
        );


      if (submit) {

        submit.disabled =
          true;
      }


      if (message) {

        message.textContent =
          "VERIFYING ACCESS…";
      }


      try {

        const result =
          await fetchJson(
            API.login,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  clientId:
                    clientId?.value ||
                    "",

                  accessKey:
                    accessKey?.value ||
                    ""
                })
            }
          );


        if (
          !result.response.ok ||
          !result.payload?.ok
        ) {

          if (message) {

            message.textContent =
              "ACCESS NOT RECOGNIZED";
          }


          if (accessKey) {

            accessKey.value =
              "";

            accessKey.focus();
          }


          return;
        }


        if (accessKey) {

          accessKey.value =
            "";
        }


        /*
         * Cookies are stored by hub-login.
         * Immediately reread BOTH current authorities.
         */
        await sync();


      } catch (error) {

        console.error(
          "7Z login:",
          error
        );


        if (message) {

          message.textContent =
            "ACCESS TEMPORARILY UNAVAILABLE";
        }


      } finally {

        if (submit) {

          submit.disabled =
            false;
        }
      }
    }
  );


  /*
   * LOGOUT
   */


  async function logout() {

    if (accessButton) {

      accessButton.disabled =
        true;
    }


    try {

      await fetchJson(
        API.logout,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            "{}"
        }
      );


      authenticated =
        false;


      apply(
        null,
        null
      );


      openLogin();


    } finally {

      if (accessButton) {

        accessButton.disabled =
          false;
      }
    }
  }


  /*
   * EVENTS
   */


  seat?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      openLogin();
    }
  );


  accessButton?.addEventListener(
    "click",
    () => {

      if (authenticated) {

        logout();

      } else {

        openLogin();
      }
    }
  );


  window.addEventListener(
    "pageshow",
    sync
  );


  window.addEventListener(
    "focus",
    sync
  );


  D.addEventListener(
    "visibilitychange",
    () => {

      if (!D.hidden) {

        sync();
      }
    }
  );


  /*
   * Immediate session read.
   */
  sync();


  /*
   * Live Admin Grant / Revoke.
   */
  window.setInterval(
    () => {

      if (!D.hidden) {

        sync();
      }
    },
    2000
  );

})();
