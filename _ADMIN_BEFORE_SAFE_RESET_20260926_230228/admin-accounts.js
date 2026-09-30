(() => {

  "use strict";


  const API =
    "/api/admin/admin-accounts";


  let currentAdminId =
    null;


  function esc(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  async function authFetch(
    url,
    options = {}
  ) {

    const token =
      await window
        .Clerk
        ?.session
        ?.getToken?.();


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
          "same-origin",

        cache:
          "no-store"
      }
    );
  }


  function findOldPanel() {

    const heading =
      [
        ...document.querySelectorAll(
          "h1,h2,h3,h4"
        )
      ]
      .find(
        node => {

          const text =
            node
              .textContent
              .trim()
              .toLowerCase();


          return (
            text ===
              "user management" ||
            text ===
              "administrator management"
          );
        }
      );


    if (!heading) {
      return null;
    }


    return (
      heading.closest(
        "section"
      ) ||
      heading.parentElement
    );
  }


  function dashboardTarget() {

    return (
      document.querySelector(
        "#app main"
      ) ||

      document.querySelector(
        "#app"
      ) ||

      document.body
    );
  }


  function ensurePanel() {

    let panel =
      document.getElementById(
        "z7-admin-accounts"
      );


    if (panel) {
      return panel;
    }


    panel =
      document.createElement(
        "section"
      );


    panel.id =
      "z7-admin-accounts";


    panel.className =
      "panel z7-admin-accounts";


    panel.innerHTML = `
      <div class="z7aa-head">

        <div>

          <div class="page-kicker">
            ADMINISTRATOR ACCESS
          </div>

          <h2>
            Administrator Management
          </h2>

          <p>
            Create and manage administrators
            who have full access to this dashboard.
          </p>

        </div>


        <span class="z7aa-badge">
          FULL ACCESS
        </span>

      </div>


      <div class="z7aa-create">

        <input
          type="text"
          id="z7aa-name"
          autocomplete="off"
          placeholder="Administrator Name">


        <input
          type="email"
          id="z7aa-email"
          autocomplete="off"
          placeholder="Email Address">


        <input
          type="text"
          id="z7aa-company"
          autocomplete="off"
          placeholder="Company">


        <input
          type="password"
          id="z7aa-password"
          autocomplete="new-password"
          placeholder="Password — minimum 12 characters">


        <button
          type="button"
          id="z7aa-create">
          ADD ADMIN
        </button>

      </div>


      <div
        id="z7aa-message"
        class="z7aa-message">
      </div>


      <div
        id="z7aa-list"
        class="z7aa-list">
      </div>


      <div
        id="z7aa-password-modal"
        class="z7aa-modal"
        hidden>

        <div
          class="z7aa-modal-backdrop">
        </div>


        <div
          class="z7aa-modal-card">

          <div class="z7aa-modal-head">

            <div>

              <div class="page-kicker">
                ADMIN SECURITY
              </div>

              <h3>
                Change Password
              </h3>

              <p
                id="z7aa-password-name">
              </p>

            </div>


            <button
              type="button"
              id="z7aa-modal-close">
              ×
            </button>

          </div>


          <input
            type="password"
            id="z7aa-new-password"
            autocomplete="new-password"
            placeholder="New password — minimum 12 characters">


          <input
            type="password"
            id="z7aa-confirm-password"
            autocomplete="new-password"
            placeholder="Confirm password">


          <div
            id="z7aa-modal-message"
            class="z7aa-message">
          </div>


          <button
            type="button"
            id="z7aa-save-password"
            class="z7aa-primary">
            UPDATE PASSWORD
          </button>

        </div>

      </div>
    `;


    /*
     * Replace the old Clerk/User panel visually,
     * but do not delete its source code.
     */
    const oldPanel =
      findOldPanel();


    if (
      oldPanel &&
      oldPanel !== panel
    ) {

      oldPanel.style.display =
        "none";


      oldPanel.insertAdjacentElement(
        "afterend",
        panel
      );

    } else {

      const target =
        dashboardTarget();


      target.prepend(
        panel
      );
    }


    document
      .getElementById(
        "z7aa-create"
      )
      ?.addEventListener(
        "click",
        createAdmin
      );


    document
      .getElementById(
        "z7aa-modal-close"
      )
      ?.addEventListener(
        "click",
        closePasswordModal
      );


    document
      .querySelector(
        ".z7aa-modal-backdrop"
      )
      ?.addEventListener(
        "click",
        closePasswordModal
      );


    document
      .getElementById(
        "z7aa-save-password"
      )
      ?.addEventListener(
        "click",
        savePassword
      );


    return panel;
  }


  function setMessage(
    text,
    type = ""
  ) {

    const message =
      document.getElementById(
        "z7aa-message"
      );


    if (!message) {
      return;
    }


    message.textContent =
      text || "";


    message.className =
      `z7aa-message ${
        type
          ? `is-${type}`
          : ""
      }`;
  }


  async function createAdmin() {

    const button =
      document.getElementById(
        "z7aa-create"
      );


    const payload = {

      displayName:
        document
          .getElementById(
            "z7aa-name"
          )
          ?.value
          .trim(),

      email:
        document
          .getElementById(
            "z7aa-email"
          )
          ?.value
          .trim(),

      company:
        document
          .getElementById(
            "z7aa-company"
          )
          ?.value
          .trim(),

      password:
        document
          .getElementById(
            "z7aa-password"
          )
          ?.value || ""
    };


    if (
      !payload.displayName ||
      !payload.email ||
      payload.password.length < 12
    ) {

      setMessage(
        "Name, valid email and a 12+ character password are required.",
        "error"
      );

      return;
    }


    button.disabled =
      true;


    button.textContent =
      "CREATING...";


    try {

      const response =
        await authFetch(
          API,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );


      const result =
        await response.json();


      if (!response.ok) {

        throw new Error(
          result.error ||
          "Could not create administrator."
        );
      }


      [
        "z7aa-name",
        "z7aa-email",
        "z7aa-company",
        "z7aa-password"
      ]
      .forEach(
        id => {

          const field =
            document.getElementById(
              id
            );


          if (field) {
            field.value = "";
          }
        }
      );


      setMessage(
        "Administrator created successfully.",
        "success"
      );


      await loadAdmins();


    } catch (error) {

      setMessage(
        error.message ||
        "Could not create administrator.",
        "error"
      );


    } finally {

      button.disabled =
        false;


      button.textContent =
        "ADD ADMIN";
    }
  }


  async function loadAdmins() {

    try {

      const response =
        await authFetch(
          API
        );


      const payload =
        await response.json();


      if (!response.ok) {

        throw new Error(
          payload.error ||
          "Could not load administrators."
        );
      }


      currentAdminId =
        payload.currentAdminId;


      renderAdmins(
        payload.admins || []
      );


    } catch (error) {

      setMessage(
        error.message ||
        "Could not load administrators.",
        "error"
      );
    }
  }


  function renderAdmins(
    admins
  ) {

    const root =
      document.getElementById(
        "z7aa-list"
      );


    if (!root) {
      return;
    }


    if (!admins.length) {

      root.innerHTML = `
        <div class="z7aa-empty">
          No administrators found.
        </div>
      `;

      return;
    }


    root.innerHTML =
      admins.map(
        admin => {

          const active =
            admin.status ===
            "active";


          const self =
            admin.clerk_user_id ===
            currentAdminId;


          return `
            <article
              class="z7aa-admin">

              <div class="z7aa-info">

                <div class="z7aa-title">

                  <strong>
                    ${esc(
                      admin.display_name ||
                      admin.email
                    )}
                  </strong>

                  ${
                    self
                      ? `
                        <span class="z7aa-you">
                          YOU
                        </span>
                      `
                      : ""
                  }

                </div>


                <span>
                  ${esc(
                    admin.email
                  )}
                </span>


                <small>
                  ${esc(
                    admin.company ||
                    "7Z Magic"
                  )}
                </small>

              </div>


              <div class="z7aa-actions">

                <span class="z7aa-status ${
                  active
                    ? "is-active"
                    : "is-disabled"
                }">
                  ${
                    active
                      ? "ACTIVE"
                      : "DISABLED"
                  }
                </span>


                <button
                  type="button"
                  data-password="${esc(
                    admin.clerk_user_id
                  )}"
                  data-name="${esc(
                    admin.display_name ||
                    admin.email
                  )}">
                  CHANGE PASSWORD
                </button>


                ${
                  self
                    ? `
                      <span class="z7aa-self-lock">
                        CURRENT SESSION
                      </span>
                    `
                    : `
                      <button
                        type="button"
                        class="${
                          active
                            ? "is-danger"
                            : "is-enable"
                        }"
                        data-status="${esc(
                          admin.clerk_user_id
                        )}"
                        data-next="${
                          active
                            ? "disabled"
                            : "active"
                        }">

                        ${
                          active
                            ? "DISABLE"
                            : "ENABLE"
                        }

                      </button>
                    `
                }

              </div>

            </article>
          `;
        }
      )
      .join("");


    root
      .querySelectorAll(
        "[data-password]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              openPasswordModal(
                button.dataset.password,
                button.dataset.name
              );
            }
          );
        }
      );


    root
      .querySelectorAll(
        "[data-status]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              changeStatus(
                button.dataset.status,
                button.dataset.next,
                button
              );
            }
          );
        }
      );
  }


  function openPasswordModal(
    userId,
    name
  ) {

    const modal =
      document.getElementById(
        "z7aa-password-modal"
      );


    modal.dataset.userId =
      userId;


    document
      .getElementById(
        "z7aa-password-name"
      )
      .textContent =
        name || "";


    document
      .getElementById(
        "z7aa-new-password"
      )
      .value = "";


    document
      .getElementById(
        "z7aa-confirm-password"
      )
      .value = "";


    document
      .getElementById(
        "z7aa-modal-message"
      )
      .textContent = "";


    modal.hidden =
      false;
  }


  function closePasswordModal() {

    const modal =
      document.getElementById(
        "z7aa-password-modal"
      );


    if (modal) {

      modal.hidden =
        true;
    }
  }


  async function savePassword() {

    const modal =
      document.getElementById(
        "z7aa-password-modal"
      );


    const message =
      document.getElementById(
        "z7aa-modal-message"
      );


    const button =
      document.getElementById(
        "z7aa-save-password"
      );


    const password =
      document
        .getElementById(
          "z7aa-new-password"
        )
        ?.value || "";


    const confirm =
      document
        .getElementById(
          "z7aa-confirm-password"
        )
        ?.value || "";


    if (
      password.length < 12
    ) {

      message.textContent =
        "Password must contain at least 12 characters.";

      message.className =
        "z7aa-message is-error";

      return;
    }


    if (
      password !== confirm
    ) {

      message.textContent =
        "Passwords do not match.";

      message.className =
        "z7aa-message is-error";

      return;
    }


    button.disabled =
      true;


    button.textContent =
      "UPDATING...";


    try {

      const response =
        await authFetch(
          API,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                action:
                  "password",

                clerkUserId:
                  modal.dataset.userId,

                password
              })
          }
        );


      const result =
        await response.json();


      if (!response.ok) {

        throw new Error(
          result.error ||
          "Password update failed."
        );
      }


      message.textContent =
        "Password updated successfully.";

      message.className =
        "z7aa-message is-success";


      setTimeout(
        closePasswordModal,
        700
      );


    } catch (error) {

      message.textContent =
        error.message ||
        "Password update failed.";

      message.className =
        "z7aa-message is-error";


    } finally {

      button.disabled =
        false;


      button.textContent =
        "UPDATE PASSWORD";
    }
  }


  async function changeStatus(
    userId,
    status,
    button
  ) {

    const verb =
      status ===
      "active"
        ? "enable"
        : "disable";


    if (
      !window.confirm(
        `Are you sure you want to ${verb} this administrator?`
      )
    ) {

      return;
    }


    const original =
      button.textContent;


    button.disabled =
      true;


    button.textContent =
      "UPDATING...";


    try {

      const response =
        await authFetch(
          API,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                action:
                  "status",

                clerkUserId:
                  userId,

                status
              })
          }
        );


      const result =
        await response.json();


      if (!response.ok) {

        throw new Error(
          result.error ||
          "Administrator status update failed."
        );
      }


      await loadAdmins();


    } catch (error) {

      alert(
        error.message ||
        "Administrator status update failed."
      );


      button.disabled =
        false;


      button.textContent =
        original;
    }
  }


  async function boot() {

    for (
      let attempt = 0;
      attempt < 80;
      attempt++
    ) {

      if (
        window.Clerk?.user &&
        window.Clerk?.session
      ) {

        ensurePanel();

        await loadAdmins();

        return;
      }


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            250
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

/* Z7_ADMIN_WORKSPACE_PATCH_START */
(() => {
    "use strict";

    if (window.__Z7_ADMIN_WORKSPACE__) return;
    window.__Z7_ADMIN_WORKSPACE__ = true;

    const DEFINITIONS = {
        admins: [
            "Administrator Management"
        ],

        clients: [
            "Client Accounts"
        ],

        files: [
            "Upload Private File",
            "File Library"
        ],

        media: [
            "Clients & All Media"
        ]
    };

    const normalize = value =>
        String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    const normalizedDefinitions =
        Object.fromEntries(
            Object.entries(DEFINITIONS).map(
                ([group, titles]) => [
                    group,
                    titles.map(normalize)
                ]
            )
        );

    function elementText(el) {
        return normalize(
            el?.innerText ||
            el?.textContent ||
            ""
        );
    }

    function findExactElement(title) {
        const wanted = normalize(title);

        const candidates =
            document.querySelectorAll(
                "h1,h2,h3,h4,h5,h6,p,span,strong,div,label"
            );

        let best = null;

        for (const el of candidates) {
            if (elementText(el) !== wanted) {
                continue;
            }

            if (
                !best ||
                el.childElementCount <
                best.childElementCount
            ) {
                best = el;
            }
        }

        return best;
    }

    function groupsInside(el) {
        const text = elementText(el);

        return Object.entries(
            normalizedDefinitions
        )
        .filter(([, titles]) =>
            titles.some(title =>
                text.includes(title)
            )
        )
        .map(([group]) => group);
    }

    function findContainer(label, group) {
        let current = label;
        let best = label.parentElement;

        for (let depth = 0; depth < 16; depth++) {
            const parent =
                current?.parentElement;

            if (
                !parent ||
                parent === document.body ||
                parent === document.documentElement
            ) {
                break;
            }

            const found =
                groupsInside(parent);

            /*
             * Keep climbing while this ancestor contains
             * only content belonging to this workspace.
             */
            if (
                found.length === 1 &&
                found[0] === group
            ) {
                best = parent;
                current = parent;
                continue;
            }

            /*
             * We've reached a wrapper containing another
             * major admin workspace. Stop one level before it.
             */
            if (found.length > 1) {
                break;
            }

            current = parent;
        }

        return best;
    }

    function discover() {
        const result = new Map();

        for (
            const [group, titles]
            of Object.entries(DEFINITIONS)
        ) {
            const containers = [];

            for (const title of titles) {
                const label =
                    findExactElement(title);

                if (!label) continue;

                const container =
                    findContainer(
                        label,
                        group
                    );

                if (
                    container &&
                    !containers.includes(container)
                ) {
                    containers.push(container);
                }
            }

            if (containers.length) {
                result.set(
                    group,
                    containers
                );
            }
        }

        return result;
    }

    let sections = new Map();

    function createNavigation(anchor) {
        let nav =
            document.getElementById(
                "z7-admin-workspace"
            );

        if (nav) return nav;

        nav =
            document.createElement("nav");

        nav.id =
            "z7-admin-workspace";

        nav.innerHTML = `
            <button type="button" data-z7-tab="overview">Overview</button>
            <button type="button" data-z7-tab="clients">Clients</button>
            <button type="button" data-z7-tab="files">Files</button>
            <button type="button" data-z7-tab="media">Media</button>
            <button type="button" data-z7-tab="admins">Admins</button>
        `;

        anchor.parentElement.insertBefore(
            nav,
            anchor
        );

        nav.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest(
                        "[data-z7-tab]"
                    );

                if (!button) return;

                activate(
                    button.dataset.z7Tab
                );
            }
        );

        return nav;
    }

    function activate(tab) {
        sections.forEach(
            (containers, group) => {

                const visible =
                    tab !== "overview" &&
                    tab === group;

                containers.forEach(
                    container => {
                        container.classList.toggle(
                            "z7-workspace-hidden",
                            !visible
                        );
                    }
                );
            }
        );

        const nav =
            document.getElementById(
                "z7-admin-workspace"
            );

        nav?.querySelectorAll(
            "[data-z7-tab]"
        ).forEach(button => {

            const active =
                button.dataset.z7Tab === tab;

            button.classList.toggle(
                "is-active",
                active
            );

            button.setAttribute(
                "aria-selected",
                active ? "true" : "false"
            );
        });

        sessionStorage.setItem(
            "z7-admin-workspace-tab",
            tab
        );

        window.scrollTo({
            top: Math.max(
                0,
                (nav?.offsetTop || 0) - 110
            ),
            behavior: "smooth"
        });
    }

    function install() {
        const discovered =
            discover();

        const required = [
            "admins",
            "clients",
            "files",
            "media"
        ];

        /*
         * No more silent failure.
         * Navigation appears once Administrator Management
         * exists, even if another optional section is late.
         */
        if (!discovered.has("admins")) {
            return false;
        }

        sections =
            discovered;

        sections.forEach(
            (containers, group) => {
                containers.forEach(
                    container => {
                        container.dataset.z7Workspace =
                            group;
                    }
                );
            }
        );

        const all =
            [...sections.values()]
                .flat()
                .filter(
                    (item, index, array) =>
                        array.indexOf(item) === index
                );

        if (!all.length) {
            return false;
        }

        all.sort((a, b) => {
            const relation =
                a.compareDocumentPosition(b);

            return (
                relation &
                Node.DOCUMENT_POSITION_FOLLOWING
            ) ? -1 : 1;
        });

        const nav =
            createNavigation(all[0]);

        /*
         * Disable tabs whose sections genuinely
         * are not present yet instead of aborting everything.
         */
        required.forEach(group => {
            const button =
                nav.querySelector(
                    `[data-z7-tab="${group}"]`
                );

            if (button) {
                button.disabled =
                    !sections.has(group);
            }
        });

        const remembered =
            sessionStorage.getItem(
                "z7-admin-workspace-tab"
            );

        const initial =
            [
                "overview",
                "clients",
                "files",
                "media",
                "admins"
            ].includes(remembered)
                ? remembered
                : "overview";

        activate(initial);

        console.info(
            "[7Z] Admin workspace active:",
            [...sections.keys()]
        );

        return true;
    }

    function start() {
        let installed =
            install();

        const observer =
            new MutationObserver(() => {

                const currentNav =
                    document.getElementById(
                        "z7-admin-workspace"
                    );

                if (
                    !installed ||
                    !currentNav
                ) {
                    installed =
                        install();
                }
            });

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        let attempts = 0;

        const timer =
            setInterval(() => {
                attempts++;

                installed =
                    install() ||
                    installed;

                if (
                    installed &&
                    attempts > 8
                ) {
                    clearInterval(timer);
                }

                if (attempts >= 80) {
                    clearInterval(timer);
                }
            }, 250);
    }

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();
/* Z7_ADMIN_WORKSPACE_PATCH_END */
