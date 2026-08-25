(() => {
  "use strict";

  const STATUS_API =
    "/api/private-auth/hub-status";

  const LOGOUT_API =
    "/api/private-auth/hub-logout";

  let authenticated = false;
  let busy = false;


  function cleanText(element) {

    return String(
      element?.textContent || ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }


  function isSessionControl(element) {

    if (!element) {
      return false;
    }


    if (
      element.id ===
      "z7paHeaderAccessButton"
    ) {
      return true;
    }


    if (
      element.matches?.(
        [
          "[data-private-access-login]",
          "[data-private-access-auth]",
          "[data-private-access-control]",
          "[data-z7-login]",
          "[data-z7-logout]"
        ].join(",")
      )
    ) {
      return true;
    }


    const header =
      element.closest?.(
        ".site-header, .main-header, header"
      );


    if (!header) {
      return false;
    }


    const text =
      cleanText(element);


    return (
      /^LOGIN(?:\s|↗|→|$)/.test(text) ||
      /^LOGOUT(?:\s|\/|↗|→|$)/.test(text) ||
      /^SIGN OUT(?:\s|↗|→|$)/.test(text)
    );
  }


  function sessionControls() {

    const candidates =
      Array.from(
        document.querySelectorAll(
          [
            "#z7paHeaderAccessButton",
            ".site-header a",
            ".site-header button",
            ".main-header a",
            ".main-header button",
            "header [data-private-access-login]",
            "header [data-private-access-auth]",
            "header [data-private-access-control]",
            "header [data-z7-login]",
            "header [data-z7-logout]"
          ].join(",")
        )
      );


    return [
      ...new Set(
        candidates.filter(
          isSessionControl
        )
      )
    ];
  }


  function replaceTextNode(
    element,
    nextLabel
  ) {

    const walker =
      document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT
      );


    let node;


    while (
      (
        node =
          walker.nextNode()
      )
    ) {

      const value =
        String(
          node.nodeValue || ""
        );


      if (
        /\b(LOGIN|LOGOUT|SIGN OUT)\b/i.test(
          value
        )
      ) {

        node.nodeValue =
          value.replace(
            /\b(LOGIN|LOGOUT|SIGN OUT)\b/i,
            nextLabel
          );

        return true;
      }
    }


    return false;
  }


  function updateControl(
    control
  ) {

    const nextLabel =
      authenticated
        ? "SIGN OUT"
        : "LOGIN";


    if (
      !replaceTextNode(
        control,
        nextLabel
      )
    ) {

      const span =
        control.querySelector?.(
          "span"
        );


      if (span) {

        span.textContent =
          nextLabel;
      }
    }


    control.dataset.z7SessionControl =
      authenticated
        ? "logout"
        : "login";


    control.setAttribute(
      "aria-label",
      authenticated
        ? "Sign out of Private Access"
        : "Login to Private Access"
    );


    control.classList.toggle(
      "is-authenticated",
      authenticated
    );
  }


  function updateAllControls() {

    sessionControls()
      .forEach(
        updateControl
      );
  }


  function applyState(
    payload
  ) {

    const allowed =
      Array.isArray(
        payload?.allowed
      )
        ? payload.allowed
        : [];


    authenticated =
      Boolean(
        payload &&
        payload.ok !== false &&
        (
          payload.authenticated === true ||
          payload.admin === true ||
          payload.native === true ||
          allowed.length > 0
        )
      );


    updateAllControls();
  }


  async function syncState() {

    try {

      const response =
        await fetch(
          STATUS_API,
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


      applyState(
        response.ok
          ? payload
          : null
      );


    } catch {

      applyState(
        null
      );
    }
  }


  function focusLogin() {

    const panel =
      document.querySelector(
        "[data-z7pa-login-panel]"
      );


    if (panel) {

      panel.hidden =
        false;


      panel.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });
    }


    window.dispatchEvent(
      new CustomEvent(
        "z7pa:focus-login"
      )
    );


    window.setTimeout(
      () => {

        document
          .getElementById(
            "z7HubClientId"
          )
          ?.focus();

      },
      250
    );
  }


  async function logout() {

    if (busy) {
      return;
    }


    busy = true;


    const controls =
      sessionControls();


    controls.forEach(
      control => {

        if (
          "disabled" in control
        ) {

          control.disabled =
            true;
        }
      }
    );


    try {

      const response =
        await fetch(
          LOGOUT_API,
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


      authenticated =
        false;


      window.dispatchEvent(
        new CustomEvent(
          "z7pa:auth-changed",
          {
            detail: {
              authenticated:
                false
            }
          }
        )
      );


      /*
       * Hard navigation guarantees:
       * - all private UI clears
       * - no stale Blob/File state
       * - Login panel is restored
       * - all cookies are re-read from server
       */
      window.location.replace(
        "/private-access/?login=1"
      );


    } catch (error) {

      console.error(
        "7Z Private Access logout:",
        error
      );


      await syncState();


    } finally {

      busy =
        false;


      controls.forEach(
        control => {

          if (
            "disabled" in control
          ) {

            control.disabled =
              false;
          }
        }
      );
    }
  }


  /*
   * Capture phase is intentional.
   * It wins over the old site's LOGIN link handler
   * without changing its design or markup.
   */
  document.addEventListener(
    "click",
    event => {

      const target =
        event.target?.closest?.(
          "a, button"
        );


      if (
        !target ||
        !isSessionControl(
          target
        )
      ) {

        return;
      }


      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();


      if (
        authenticated
      ) {

        logout();

      } else {

        focusLogin();
      }

    },
    true
  );


  /*
   * The main Private Access controller already emits this.
   */
  window.addEventListener(
    "z7pa:auth-changed",
    event => {

      authenticated =
        Boolean(
          event.detail
            ?.authenticated
        );


      updateAllControls();
    }
  );


  /*
   * Catch buttons injected by the legacy site shell
   * without leaving a permanent observer running.
   */
  const refreshTimes = [
    0,
    100,
    350,
    800,
    1500,
    2500
  ];


  refreshTimes.forEach(
    delay => {

      window.setTimeout(
        updateAllControls,
        delay
      );
    }
  );


  syncState();


  window.addEventListener(
    "pageshow",
    () => {

      syncState();
    }
  );

})();