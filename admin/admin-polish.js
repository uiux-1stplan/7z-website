(() => {
  "use strict";

  const STORAGE_KEY = "z7-admin-workspace-view-v1";

  const VIEW_PANELS = {
    overview: ["z7-admin-overview"],
    clients: ["z7-native-clients"],
    files: ["z7-private-upload-panel", "z7-admin-file-library"],
    media: ["legacy-file-access-panel"],
    admins: ["z7-admin-accounts"]
  };

  const VIEW_COPY = {
    overview: {
      kicker: "ADMINISTRATION / OVERVIEW",
      title: "Administration Overview",
      copy: "Manage administrators, client accounts, private files and media access."
    },
    clients: {
      kicker: "ADMINISTRATION / CLIENTS",
      title: "Client Accounts",
      copy: "Create and manage legacy and native client identities."
    },
    files: {
      kicker: "ADMINISTRATION / FILES",
      title: "Private Files",
      copy: "Upload protected files and manage the private file library."
    },
    media: {
      kicker: "ADMINISTRATION / MEDIA",
      title: "Client Media Access",
      copy: "Control which clients can access protected media and resources."
    },
    admins: {
      kicker: "ADMINISTRATION / ADMINS",
      title: "Administrator Management",
      copy: "Create and manage administrators with full dashboard access."
    }
  };

  const SEARCH_COPY = {
    clients: "Search clients by name, ID or company...",
    files: "Search private files by name or type...",
    media: "Search clients or media resources..."
  };

  const SEARCH_SELECTORS = {
    clients: ["#z7-native-clients .z7nc-client"],
    files: ["#z7-admin-file-library .z7af-file"],
    media: ["#legacy-file-access-panel .z7-cap-client", "#legacy-file-access-panel .z7-cap-file"]
  };

  const ALL_PANEL_IDS = [
    "z7-admin-overview",
    "z7-admin-accounts",
    "z7-native-clients",
    "z7-private-upload-panel",
    "z7-admin-file-library",
    "legacy-file-access-panel"
  ];

  let activeView = sessionStorage.getItem(STORAGE_KEY) || "overview";
  let scheduled = false;

  function normalizeView(view) {
    return Object.prototype.hasOwnProperty.call(VIEW_PANELS, view)
      ? view
      : "overview";
  }

  function mainRoot() {
    return document.querySelector("#app main") || document.querySelector("#app");
  }

  function restoreTopbar() {
    const topbar = document.querySelector("#app .topbar");
    if (!topbar) return;

    const copyBlock = topbar.firstElementChild;
    if (!copyBlock) return;

    if (copyBlock.style.display === "none") {
      copyBlock.style.removeProperty("display");
    }

    const view = normalizeView(activeView);
    const copy = VIEW_COPY[view];
    const kicker = copyBlock.querySelector(".page-kicker");
    const heading = copyBlock.querySelector("h1");
    const paragraph = copyBlock.querySelector("p");

    if (kicker && kicker.textContent.trim() !== copy.kicker) {
      kicker.textContent = copy.kicker;
    }

    if (heading && heading.textContent.trim() !== copy.title) {
      heading.textContent = copy.title;
    }

    if (paragraph && paragraph.textContent.trim() !== copy.copy) {
      paragraph.textContent = copy.copy;
    }
  }

  function hideLegacyWorkspace() {
    const legacy = document.querySelector("#app main .workspace-grid");
    if (legacy) {
      legacy.classList.add("z7-workspace-legacy-hidden");
    }
  }

  function ensureWorkspace() {
    const main = mainRoot();
    if (!main) return null;

    let shell = document.getElementById("z7-admin-workspace-shell");
    let nav = document.getElementById("z7-admin-workspace-nav");
    let search = document.getElementById("z7-admin-workspace-search");
    let searchInput = document.getElementById("z7-admin-workspace-search-input");
    let stage = document.getElementById("z7-admin-workspace-stage");

    if (!shell) {
      shell = document.createElement("section");
      shell.id = "z7-admin-workspace-shell";
      shell.className = "z7-admin-workspace-shell";
      shell.innerHTML = `
        <nav id="z7-admin-workspace-nav" class="z7-admin-workspace-nav" aria-label="Admin workspace">
          <button type="button" data-z7-view="overview">Overview</button>
          <button type="button" data-z7-view="clients">Clients</button>
          <button type="button" data-z7-view="files">Files</button>
          <button type="button" data-z7-view="media">Media</button>
          <button type="button" data-z7-view="admins">Admins</button>
        </nav>
        <div id="z7-admin-workspace-search" class="z7-admin-workspace-search" hidden>
          <span class="z7-admin-workspace-search-icon" aria-hidden="true"></span>
          <input id="z7-admin-workspace-search-input" type="search" autocomplete="off" spellcheck="false" aria-label="Search current admin section">
          <button type="button" id="z7-admin-workspace-search-clear" aria-label="Clear search">CLEAR</button>
        </div>
        <div id="z7-admin-workspace-stage" class="z7-admin-workspace-stage">
          <section id="z7-admin-overview" class="panel z7-admin-overview">
            <div class="z7-overview-heading"><div><span class="page-kicker">7Z MAGIC / CONTROL CENTER</span><h2>Workspace at a glance</h2><p>Choose an area to manage. Account totals above update from the live portal data.</p></div><span class="z7-overview-live"><i></i> LIVE WORKSPACE</span></div>
            <div class="z7-overview-actions">
              <button type="button" data-z7-shortcut="clients"><span class="z7-overview-icon">01</span><strong>Client accounts</strong><small>Manage access, passwords and account status</small><b>Open section <span aria-hidden="true">↗</span></b></button>
              <button type="button" data-z7-shortcut="files"><span class="z7-overview-icon">02</span><strong>Private files</strong><small>Upload and organize protected files</small><b>Open section <span aria-hidden="true">↗</span></b></button>
              <button type="button" data-z7-shortcut="media"><span class="z7-overview-icon">03</span><strong>Media access</strong><small>Review client access to shared resources</small><b>Open section <span aria-hidden="true">↗</span></b></button>
              <button type="button" data-z7-shortcut="admins"><span class="z7-overview-icon">04</span><strong>Administrators</strong><small>Manage authorized dashboard operators</small><b>Open section <span aria-hidden="true">↗</span></b></button>
            </div>
            <div class="z7-overview-note"><span class="z7-overview-note-mark">7Z</span><span><strong>Administration workspace</strong><small>Changes here apply to portal access and protected client resources.</small></span></div>
          </section>
        </div>
      `;

      const stats = main.querySelector(".stats");
      const legacy = main.querySelector(".workspace-grid");

      if (stats) {
        stats.insertAdjacentElement("afterend", shell);
      } else if (legacy) {
        legacy.insertAdjacentElement("beforebegin", shell);
      } else {
        main.prepend(shell);
      }

      nav = shell.querySelector("#z7-admin-workspace-nav");
      search = shell.querySelector("#z7-admin-workspace-search");
      searchInput = shell.querySelector("#z7-admin-workspace-search-input");
      stage = shell.querySelector("#z7-admin-workspace-stage");
    }

    if (!nav || !search || !searchInput || !stage) return null;

    if (stage.dataset.shortcutsBound !== "true") {
      stage.dataset.shortcutsBound = "true";
      stage.addEventListener("click", event => {
        const button = event.target.closest("[data-z7-shortcut]");
        if (!button) return;
        activeView = normalizeView(button.dataset.z7Shortcut);
        sessionStorage.setItem(STORAGE_KEY, activeView);
        reconcile();
      });
    }

    if (nav.dataset.bound !== "true") {
      nav.dataset.bound = "true";
      nav.addEventListener("click", event => {
        const button = event.target.closest("button[data-z7-view]");
        if (!button) return;
        activeView = normalizeView(button.dataset.z7View);
        sessionStorage.setItem(STORAGE_KEY, activeView);
        reconcile();
      });
    }

    if (search.dataset.bound !== "true") {
      search.dataset.bound = "true";
      searchInput.addEventListener("input", applySearch);
      search.querySelector("#z7-admin-workspace-search-clear")?.addEventListener("click", () => {
        searchInput.value = "";
        searchInput.focus();
        applySearch();
      });
    }

    return { shell, nav, search, searchInput, stage };
  }

  function moveKnownPanels(stage) {
    ALL_PANEL_IDS.forEach(id => {
      const panel = document.getElementById(id);
      if (panel && panel.parentElement !== stage) {
        stage.appendChild(panel);
      }
    });
  }

  function resetSearchFiltering() {
    document.querySelectorAll(".z7-search-filtered-out").forEach(element => {
      element.classList.remove("z7-search-filtered-out");
    });
  }

  function syncSearch(search, searchInput) {
    const searchable = Object.prototype.hasOwnProperty.call(SEARCH_SELECTORS, activeView);
    search.hidden = !searchable;

    if (!searchable) {
      searchInput.value = "";
      resetSearchFiltering();
      return;
    }

    searchInput.placeholder = SEARCH_COPY[activeView] || "Search...";
    applySearch();
  }

  function applySearch() {
    const input = document.getElementById("z7-admin-workspace-search-input");
    const query = String(input?.value || "").trim().toLowerCase();

    resetSearchFiltering();

    const selectors = SEARCH_SELECTORS[normalizeView(activeView)] || [];
    if (!query || !selectors.length) return;

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(card => {
        const text = String(card.textContent || "").toLowerCase();
        card.classList.toggle("z7-search-filtered-out", !text.includes(query));
      });
    });
  }

  function applyView(nav, search, searchInput, stage) {
    activeView = normalizeView(activeView);
    stage.dataset.z7View = activeView;

    const visibleIds = new Set(VIEW_PANELS[activeView]);

    ALL_PANEL_IDS.forEach(id => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.classList.toggle("z7-workspace-panel-hidden", !visibleIds.has(id));
      panel.classList.add("z7-workspace-panel");
    });

    nav.querySelectorAll("button[data-z7-view]").forEach(button => {
      const selected = button.dataset.z7View === activeView;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });

    syncSearch(search, searchInput);
  }

  function ensureThemeToggle() {
    const profile = document.querySelector("#app .admin-profile");
    if (!profile || document.getElementById("z7-admin-theme-toggle")) return;
    let theme = localStorage.getItem("z7-admin-theme") || "dark";
    const button = document.createElement("button");
    button.id = "z7-admin-theme-toggle";
    button.type = "button";
    button.className = "z7-admin-theme-toggle";
    button.setAttribute("aria-label", "Switch dashboard theme");
    const apply = () => {
      const app = document.getElementById("app");
      if (!app) return;
      app.dataset.adminTheme = theme;
      button.innerHTML = theme === "dark" ? "<span aria-hidden='true'>☼</span><small>Light mode</small>" : "<span aria-hidden='true'>◐</span><small>Dark mode</small>";
    };
    button.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem("z7-admin-theme", theme);
      apply();
    });
    profile.insertBefore(button, profile.querySelector("#clerk-user-button") || null);
    apply();
  }

  function reconcile() {
    scheduled = false;

    ensureThemeToggle();
    hideLegacyWorkspace();
    restoreTopbar();

    const workspace = ensureWorkspace();
    if (!workspace) return;

    moveKnownPanels(workspace.stage);
    applyView(workspace.nav, workspace.search, workspace.searchInput, workspace.stage);
    restoreTopbar();
  }

  function scheduleReconcile() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(reconcile);
  }

  function boot() {
    activeView = normalizeView(activeView);
    reconcile();

    const observer = new MutationObserver(scheduleReconcile);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("pageshow", scheduleReconcile);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
