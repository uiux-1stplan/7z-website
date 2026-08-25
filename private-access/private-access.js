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

/* === 7Z INNER CIRCLE LIVE START === */

(() => {

  "use strict";


  const gate =
    document.querySelector(
      "[data-z7icx-live]"
    );


  if (!gate) {
    return;
  }


  const seat =
    document.getElementById(
      "z7InnerCircleSeat"
    );


  const form =
    document.getElementById(
      "z7PrivateAccessLoginForm"
    );


  const memberId =
    document.getElementById(
      "z7HubClientId"
    );


  const message =
    document.getElementById(
      "z7HubLoginMessage"
    );


  const submitLabel =
    gate.querySelector(
      "[data-z7icx-submit-label]"
    );


  const grid =
    document.querySelector(
      "[data-z7pa-grid]"
    );


  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  let userOpened =
    false;


  let successPlaying =
    false;


  let finalHidden =
    false;



  function openCircle() {


    if (
      finalHidden ||
      userOpened
    ) {
      return;
    }


    userOpened =
      true;


    gate.classList.remove(
      "is-denied"
    );


    gate.classList.add(
      "is-opening"
    );


    window.setTimeout(
      () => {

        gate.classList.add(
          "is-open"
        );

      },
      reducedMotion
        ? 0
        : 140
    );


    window.setTimeout(
      () => {

        gate.classList.remove(
          "is-opening"
        );

      },
      reducedMotion
        ? 0
        : 1080
    );


    window.setTimeout(
      () => {

        if (memberId) {

          memberId.focus({
            preventScroll:
              true
          });

        }

      },
      reducedMotion
        ? 0
        : 670
    );

  }



  function setSubmitText(
    text
  ) {

    if (submitLabel) {

      submitLabel.textContent =
        text;

    }

  }



  function finalHide() {


    if (finalHidden) {
      return;
    }


    finalHidden =
      true;


    gate.hidden =
      true;


    gate.style.display =
      "none";


    if (grid) {

      window.setTimeout(
        () => {

          grid.scrollIntoView({
            behavior:
              reducedMotion
                ? "auto"
                : "smooth",

            block:
              "start"
          });

        },
        reducedMotion
          ? 0
          : 60
      );

    }

  }



  function playSuccess() {


    if (
      successPlaying ||
      finalHidden
    ) {
      return;
    }


    successPlaying =
      true;


    /*
      Existing auth can set hidden immediately.
      Bring it visually back just for the exit scene.
    */

    gate.hidden =
      false;


    gate.style.display =
      "";


    gate.classList.remove(
      "is-denied",
      "is-authenticating"
    );


    gate.classList.add(
      "is-open",
      "is-authorized"
    );


    setSubmitText(
      "WELCOME INSIDE"
    );


    window.setTimeout(
      () => {

        gate.classList.add(
          "is-leaving"
        );

      },
      reducedMotion
        ? 0
        : 890
    );


    window.setTimeout(
      finalHide,
      reducedMotion
        ? 0
        : 1270
    );

  }



  /*
    IMPORTANT:
    TAKE YOUR SEAT is the ONLY normal trigger.

    We intentionally removed the previous focusin trigger
    because the existing website/auth script may focus
    an input on page load.
  */

  if (seat) {

    seat.addEventListener(
      "click",
      openCircle
    );

  }



  /*
    Presentation only.
    Existing login JS still owns the real submit request.
  */

  if (form) {

    form.addEventListener(
      "submit",
      () => {


        if (!userOpened) {

          /*
            Keyboard / browser autofill fallback.
          */

          userOpened =
            true;


          gate.classList.add(
            "is-open"
          );

        }


        gate.classList.remove(
          "is-denied"
        );


        gate.classList.add(
          "is-authenticating"
        );


        setSubmitText(
          "CHECKING ACCESS…"
        );

      },
      true
    );

  }



  /*
    Real failure message.
  */

  if (message) {

    const observer =
      new MutationObserver(
        () => {


          if (
            successPlaying ||
            finalHidden
          ) {
            return;
          }


          const text =
            String(
              message.textContent || ""
            )
            .trim()
            .toUpperCase();


          if (!text) {
            return;
          }


          const failed =
            text.includes(
              "NOT RECOGNIZED"
            ) ||

            text.includes(
              "INVALID"
            ) ||

            text.includes(
              "INCORRECT"
            ) ||

            text.includes(
              "FAILED"
            ) ||

            text.includes(
              "DENIED"
            ) ||

            text.includes(
              "UNAVAILABLE"
            );


          if (!failed) {
            return;
          }


          gate.classList.remove(
            "is-authenticating",
            "is-denied"
          );


          void gate.offsetWidth;


          gate.classList.add(
            "is-denied"
          );


          setSubmitText(
            "ENTER THE CIRCLE"
          );

        }
      );


    observer.observe(
      message,
      {
        childList:
          true,

        subtree:
          true,

        characterData:
          true
      }
    );

  }



  /*
    Existing real authentication hides the login panel
    after successful login.

    Watch that existing behavior instead of replacing it.
  */

  const gateObserver =
    new MutationObserver(
      () => {


        if (
          !gate.hidden ||
          finalHidden ||
          successPlaying
        ) {
          return;
        }


        /*
          Existing valid session on initial load:
          do not replay login experience.
        */

        if (!userOpened) {

          finalHidden =
            true;


          gate.style.display =
            "none";


          return;
        }


        playSuccess();

      }
    );


  gateObserver.observe(
    gate,
    {
      attributes:
        true,

      attributeFilter:
        ["hidden"]
    }
  );



  /*
    Backup success signal:
    protected resources become visible.
  */

  if (grid) {

    const gridObserver =
      new MutationObserver(
        () => {


          if (
            !userOpened ||
            successPlaying ||
            finalHidden
          ) {
            return;
          }


          if (!grid.hidden) {

            playSuccess();

          }

        }
      );


    gridObserver.observe(
      grid,
      {
        attributes:
          true,

        attributeFilter:
          ["hidden"]
      }
    );

  }



  /*
    Initial appearance.

    DO NOT auto-open the form.
  */

  if (gate.hidden) {

    finalHidden =
      true;


    gate.style.display =
      "none";

  }
  else {

    gate.classList.remove(
      "is-open",
      "is-opening",
      "is-authorized",
      "is-leaving",
      "is-authenticating",
      "is-denied"
    );


    requestAnimationFrame(
      () => {

        gate.classList.add(
          "is-ready"
        );

      }
    );

  }



  /*
    Reduced-motion users still use the same concept,
    but without the theatrical animation.
  */

  if (
    reducedMotion &&
    !finalHidden
  ) {

    /*
      Keep the intro state.
      TAKE YOUR SEAT still matters.
    */

    gate.classList.add(
      "is-ready"
    );

  }

})();

/* === 7Z INNER CIRCLE LIVE END === */

/* === 7Z OLD PAGE FLASH FIX START === */

(() => {

  const root = document.documentElement;

  const gate =
    document.querySelector(
      "[data-z7icx-live]"
    );

  const grid =
    document.querySelector(
      "[data-z7pa-grid]"
    );

  if (!gate) {
    return;
  }

  /*
    Stay in preauth mode while the Inner Circle
    login experience is visible.
  */
  root.classList.add(
    "z7icx-preauth"
  );


  function unlockUnderlyingPrivatePage() {

    root.classList.remove(
      "z7icx-preauth"
    );

    root.classList.add(
      "z7icx-authenticated"
    );

  }


  /*
    If the gate becomes permanently hidden,
    the real session/auth flow succeeded.
  */

  const gateObserver =
    new MutationObserver(() => {

      const permanentlyHidden =
        gate.hidden ||
        gate.style.display === "none";

      if (permanentlyHidden) {

        unlockUnderlyingPrivatePage();

      }

    });


  gateObserver.observe(
    gate,
    {
      attributes: true,
      attributeFilter: [
        "hidden",
        "style"
      ]
    }
  );


  /*
    Backup signal:
    real protected resource grid is revealed.
  */

  if (grid) {

    const gridObserver =
      new MutationObserver(() => {

        if (!grid.hidden) {

          unlockUnderlyingPrivatePage();

        }

      });


    gridObserver.observe(
      grid,
      {
        attributes: true,
        attributeFilter: [
          "hidden"
        ]
      }
    );

  }

})();

/* === 7Z OLD PAGE FLASH FIX END === */
