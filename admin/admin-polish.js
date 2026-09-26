(() => {
  "use strict";

  const STORAGE_KEY = "z7-admin-workspace-view-v1";

  const VIEW_PANELS = {
    overview: [],
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
        <div id="z7-admin-workspace-stage" class="z7-admin-workspace-stage"></div>
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

  function reconcile() {
    scheduled = false;

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
