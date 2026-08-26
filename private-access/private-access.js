(() => {
  "use strict";

  const PUBLIC_SCOPES = [
    "silla",
    "elcon",
    "tawjihi-quotation",
    "oman-partnership"
  ];

  const ADMIN_SCOPES = [
    "silla",
    "elcon",
    "blueprint-html",
    "blueprint-pdf",
    "tawjihi-quotation",
    "oman-partnership"
  ];

  const cards =
    Array.from(
      document.querySelectorAll(
        "[data-z7pa-resource]"
      )
    );

  const grid =
    document.querySelector(
      "[data-z7pa-grid]"
    );

  const library =
    document.querySelector(
      ".z7pa-library"
    );

  const hero =
    document.querySelector(
      ".z7pa-hero"
    );

  const loginPanel =
    document.querySelector(
      "[data-z7pa-login-panel]"
    );

  const form =
    document.getElementById(
      "z7PrivateAccessLoginForm"
    );

  const clientId =
    document.getElementById(
      "z7HubClientId"
    );

  const accessKey =
    document.getElementById(
      "z7HubAccessKey"
    );

  const message =
    document.getElementById(
      "z7HubLoginMessage"
    );

  const count =
    document.querySelector(
      "[data-z7pa-count]"
    );

  const label =
    document.querySelector(
      "[data-z7pa-access-label]"
    );

  const siteHeader =
    document.querySelector(
      ".site-header"
    );

  const headerSocials =
    document.querySelector(
      ".header-socials"
    );

  let currentAuthenticated = false;


  /* --------------------------------------------------------
     HEADER SESSION BUTTON
  -------------------------------------------------------- */

  let accessButton =
    document.getElementById(
      "z7paHeaderAccessButton"
    );

  if (!accessButton) {

    accessButton =
      document.createElement(
        "button"
      );

    accessButton.type =
      "button";

    accessButton.className =
      "z7pa-header-access magnetic";

    accessButton.id =
      "z7paHeaderAccessButton";

    accessButton.innerHTML = `
      <span>LOGIN</span>
      <b aria-hidden="true">↗</b>
    `;

    if (siteHeader) {

      siteHeader.insertBefore(
        accessButton,
        headerSocials || null
      );
    }
  }


  function normalizeAllowed(
    payload
  ) {

    if (
      !payload ||
      typeof payload !== "object"
    ) {
      return [];
    }

    if (payload.admin) {
      return [...ADMIN_SCOPES];
    }

    if (
      !Array.isArray(
        payload.allowed
      )
    ) {
      return [];
    }

    return payload.allowed.filter(
      scope =>
        PUBLIC_SCOPES.includes(
          scope
        )
    );
  }


  function authenticatedFrom(
    payload,
    allowed
  ) {

    return Boolean(
      payload &&
      payload.ok !== false &&
      (
        payload.authenticated === true ||
        payload.admin === true ||
        payload.native === true ||
        allowed.length > 0
      )
    );
  }


  function updateHeaderButton(
    authenticated
  ) {

    if (!accessButton) return;

    const text =
      accessButton.querySelector(
        "span"
      );

    if (text) {

      text.textContent =
        authenticated
          ? "SIGN OUT"
          : "LOGIN";
    }

    accessButton.classList.toggle(
      "is-authenticated",
      authenticated
    );

    accessButton.setAttribute(
      "aria-label",
      authenticated
        ? "Sign out of private access"
        : "Login to private access"
    );
  }


  function applyAccess(
    payload
  ) {

    const allowed =
      normalizeAllowed(
        payload
      );

    const admin =
      Boolean(
        payload?.admin
      );

    const authenticated =
      authenticatedFrom(
        payload,
        allowed
      );

    const hasResources =
      allowed.length > 0;

    const fileOnly =
      authenticated &&
      !hasResources &&
      !admin;

    currentAuthenticated =
      authenticated;


    document.body.classList.toggle(
      "z7pa-is-authenticated",
      authenticated
    );

    document.body.classList.toggle(
      "z7pa-is-locked",
      !authenticated
    );

    document.body.classList.toggle(
      "z7pa-is-admin",
      admin
    );

    document.body.classList.toggle(
      "z7pa-file-only",
      fileOnly
    );


    /*
     * Login is controlled ONLY here.
     * No second script is allowed to fight it.
     */
    if (loginPanel) {

      loginPanel.hidden =
        authenticated;
    }


    /*
     * File-only users should see a clean
     * client workspace, not an empty legacy
     * resource selector.
     */
    if (hero) {

      hero.hidden =
        fileOnly;
    }

    if (library) {

      library.hidden =
        fileOnly;
    }


    if (grid) {

      grid.hidden =
        !hasResources;
    }


    cards.forEach(
      card => {

        const scope =
          card.getAttribute(
            "data-z7pa-resource"
          );

        card.hidden =
          !allowed.includes(
            scope
          );
      }
    );


    if (count) {

      count.textContent =
        String(
          allowed.length
        ).padStart(
          2,
          "0"
        );
    }


    if (label) {

      if (admin) {

        label.textContent =
          "ADMIN ACCESS";

      } else if (
        authenticated &&
        hasResources
      ) {

        label.textContent =
          "AUTHORIZED RESOURCES";

      } else if (
        authenticated
      ) {

        label.textContent =
          "PRIVATE FILE ACCESS";

      } else {

        label.textContent =
          "LOGIN REQUIRED";
      }
    }


    if (
      message &&
      authenticated
    ) {

      message.textContent = "";
    }


    updateHeaderButton(
      authenticated
    );
  }


  function broadcastAuth(
    authenticated
  ) {

    window.dispatchEvent(
      new CustomEvent(
        "z7pa:auth-changed",
        {
          detail: {
            authenticated
          }
        }
      )
    );
  }


  function focusLogin() {

    if (currentAuthenticated) {
      return;
    }

    if (hero) {
      hero.hidden = false;
    }

    if (library) {
      library.hidden = false;
    }

    if (loginPanel) {

      loginPanel.hidden =
        false;

      loginPanel.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });
    }

    window.setTimeout(
      () =>
        clientId?.focus(),
      300
    );
  }


  async function loadStatus() {

    try {

      const response =
        await fetch(
          "/api/private-auth/hub-status",
          {
            method:
              "GET",

            credentials:
              "same-origin",

            cache:
              "no-store"
          }
        );

      const payload =
        await response.json();

      applyAccess(
        response.ok
          ? payload
          : null
      );

    } catch {

      applyAccess(
        null
      );
    }
  }


  async function signOut() {

    if (!accessButton) return;

    accessButton.disabled =
      true;

    const text =
      accessButton.querySelector(
        "span"
      );

    if (text) {
      text.textContent =
        "SIGNING OUT";
    }

    try {

      const response =
        await fetch(
          "/api/private-auth/hub-logout",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              "{}"
          }
        );

      if (!response.ok) {
        throw new Error(
          "Logout failed"
        );
      }

      if (clientId) {
        clientId.value = "";
      }

      if (accessKey) {
        accessKey.value = "";
      }

      applyAccess(
        null
      );

      broadcastAuth(
        false
      );

      window.setTimeout(
        focusLogin,
        80
      );

    } catch {

      await loadStatus();

    } finally {

      accessButton.disabled =
        false;

      updateHeaderButton(
        currentAuthenticated
      );
    }
  }


  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const submit =
        form.querySelector(
          'button[type="submit"]'
        );

      if (submit) {
        submit.disabled = true;
      }

      if (message) {

        message.textContent =
          "VERIFYING ACCESS…";
      }

      try {

        const response =
          await fetch(
            "/api/private-auth/hub-login",
            {
              method:
                "POST",

              credentials:
                "same-origin",

              cache:
                "no-store",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  clientId:
                    clientId?.value || "",

                  accessKey:
                    accessKey?.value || ""
                })
            }
          );

        const payload =
          await response.json();


        if (
          !response.ok ||
          !payload.ok
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

          applyAccess(
            null
          );

          return;
        }


        if (accessKey) {

          accessKey.value =
            "";
        }


        /*
         * Login API succeeded.
         * That IS authentication even when
         * allowed[] is empty.
         */
        applyAccess({
          ...payload,
          authenticated:
            true
        });


        broadcastAuth(
          true
        );


      } catch {

        if (message) {

          message.textContent =
            "ACCESS TEMPORARILY UNAVAILABLE";
        }

      } finally {

        if (submit) {
          submit.disabled = false;
        }
      }
    }
  );


  accessButton?.addEventListener(
    "click",
    () => {

      if (
        currentAuthenticated
      ) {

        signOut();

      } else {

        focusLogin();
      }
    }
  );


  window.addEventListener(
    "z7pa:focus-login",
    focusLogin
  );


  /*
   * One status request on boot.
   * No recursive session-change loop.
   */
  loadStatus();


  window.addEventListener(
    "pageshow",
    event => {

      if (event.persisted) {
        loadStatus();
      }
    }
  );

})();

/* Z7_SEAT_EXTERNAL_BRIDGE_V5 */
(() => {
  "use strict";

  const wire = () => {
    const btn = window.document.querySelector("#z7InnerCircleSeat");
    const panel = window.document.querySelector("[data-z7pa-login-panel]");

    if (!btn || !panel) return;
    if (btn.dataset.z7ExternalSeatWired === "1") return;

    btn.dataset.z7ExternalSeatWired = "1";
    btn.disabled = false;
    btn.style.pointerEvents = "auto";
    btn.style.cursor = "pointer";

    const open = (event) => {
      event?.preventDefault();
      event?.stopPropagation();

      panel.hidden = false;
      panel.removeAttribute("hidden");
      panel.setAttribute("aria-hidden", "false");
      panel.style.removeProperty("display");
      panel.classList.add("open");

      btn.setAttribute("aria-expanded", "true");

      try {
        window.dispatchEvent(new CustomEvent("z7pa:focus-login"));
      } catch {}

      panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      window.setTimeout(() => {
        const field =
          panel.querySelector("input:not([type='hidden'])") ||
          window.document.querySelector("#z7bubClientId") ||
          window.document.querySelector("#z7PrivateAccessLoginForm input");

        field?.focus();
      }, 650);
    };

    btn.addEventListener("click", open, false);

    btn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        open(event);
      }
    });
  };

  if (window.document.readyState === "loading") {
    window.document.addEventListener("DOMContentLoaded", wire, { once: true });
  } else {
    wire();
  }

  window.addEventListener("pageshow", wire);
  window.setTimeout(wire, 0);
})();
