(() => {
  "use strict";

  if (window.__Z7_ISOLATED_FILES_V1__) {
    return;
  }

  window.__Z7_ISOLATED_FILES_V1__ = true;

  const D = window.document;

  const section =
    D.querySelector("#z7-client-private-files");

  const list =
    D.querySelector("#z7cpf-list");

  const policy =
    D.querySelector(".z7pa-policy");

  let serial = 0;

  function hideFiles() {
    if (!section) return;
    section.hidden = true;
    section.setAttribute("aria-hidden", "true");
    section.style.setProperty("display", "none", "important");
  }

  function showFiles() {
    if (!section) return;
    section.hidden = false;
    section.removeAttribute("hidden");
    section.setAttribute("aria-hidden", "false");
    section.style.setProperty("display", "block", "important");
    section.style.setProperty("visibility", "visible", "important");
    section.style.setProperty("opacity", "1", "important");
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    return (
      (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) +
      " " +
      units[index]
    );
  }

  function getFileMeta(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.contentType || "").toLowerCase();

    if (type.includes("html") || name.endsWith(".html") || name.endsWith(".htm")) {
      return {
        typeLabel: "INTERACTIVE 3D / WEB",
        badgeClass: "is-html",
        iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
      };
    }

    if (type.includes("pdf") || name.endsWith(".pdf")) {
      return {
        typeLabel: "EXECUTIVE PDF",
        badgeClass: "is-pdf",
        iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
      };
    }

    if (type.startsWith("image/")) {
      return {
        typeLabel: "HIGH-RES VISUAL",
        badgeClass: "is-img",
        iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
      };
    }

    if (type.startsWith("video/")) {
      return {
        typeLabel: "CINEMATIC FILM",
        badgeClass: "is-video",
        iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'
      };
    }

    return {
      typeLabel: "STUDIO DELIVERABLE",
      badgeClass: "is-generic",
      iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
    };
  }

  function makeFile(file) {
    const meta = getFileMeta(file);
    const id = encodeURIComponent(String(file.id || ""));
    const fileName = String(file.name || "Deliverable");
    const formattedSize = formatBytes(file.sizeBytes);

    const article = D.createElement("article");
    article.className = "z7cpf-card showroom-card";

    let actionsHtml = "";
    if (file.canView !== false) {
      actionsHtml += `<a class="z7cpf-btn z7cpf-btn--open" href="/api/private-auth/portal-file?id=${id}&mode=view" target="_blank" rel="noopener"><span>Preview ↗</span></a>`;
    }
    if (file.canDownload === true) {
      actionsHtml += `<a class="z7cpf-btn z7cpf-btn--download" href="/api/private-auth/portal-file?id=${id}&mode=download"><span>Download ⤓</span></a>`;
    }

    article.innerHTML = `
      <div class="showroom-card__preview">
        <div class="showroom-preview-plate ${meta.badgeClass}">
          <span class="showroom-prism-cut" aria-hidden="true"></span>
          <span class="showroom-pill ${meta.badgeClass}">${meta.typeLabel}</span>
          <div class="showroom-icon-center" aria-hidden="true">${meta.iconSvg}</div>
        </div>
      </div>
      <div class="z7cpf-card__body">
        <h3 class="z7cpf-card__title" title="${fileName}">${fileName}</h3>
        <div class="z7cpf-card__meta">
          <span class="z7cpf-card__size"><i aria-hidden="true">💾</i> ${formattedSize}</span>
          <span class="z7cpf-card__verified"><i aria-hidden="true">✓</i> Protected Vault Asset</span>
        </div>
      </div>
      <div class="z7cpf-card__actions">
        ${actionsHtml}
      </div>
    `;

    return article;
  }

  function render(files) {
    if (!section || !list) return;

    list.replaceChildren();

    for (const file of files) {
      list.appendChild(makeFile(file));
    }

    // Update counter badge if available
    const counter = section.querySelector("[data-z7cpf-counter]");
    if (counter) {
      counter.textContent = `${files.length} ${files.length === 1 ? 'DELIVERABLE' : 'DELIVERABLES'}`;
    }

    showFiles();

    if (policy) {
      policy.hidden = true;
    }
  }

  async function refresh() {
    const requestId = ++serial;

    try {
      const response = await window.fetch(
        `/api/private-auth/portal-files?t=${Date.now()}`,
        {
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store"
          }
        }
      );

      if (requestId !== serial) {
        return;
      }

      if (response.status === 401 || response.status === 403) {
        hideFiles();
        if (policy) policy.hidden = false;
        return;
      }

      if (!response.ok) {
        console.error("7Z file API HTTP", response.status);
        return;
      }

      const payload = await response.json();
      const files = Array.isArray(payload?.files) ? payload.files : [];

      if (payload?.authenticated === true && files.length > 0) {
        render(files);
      } else if (payload?.authenticated === true) {
        if (list) {
          list.innerHTML = `
            <div class="z7cpf-empty-state">
              <div class="z7cpf-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <span class="z7cpf-empty-badge">PRIVATE VAULT ACTIVE</span>
              <h3>Your Deliverables Vault is Primed</h3>
              <p>Your high-resolution assets, cinematic cuts, and interactive deliverables are currently being prepared with signature 7Z precision and will appear here immediately once published.</p>
              <div class="z7cpf-empty-footer">
                <span><i class="z7cpf-dot"></i> End-to-End Encrypted</span>
                <span><i class="z7cpf-dot"></i> Studio Direct Handoff</span>
              </div>
            </div>
          `;
        }
        showFiles();
        if (policy) policy.hidden = true;
      } else {
        hideFiles();
        if (policy) policy.hidden = false;
      }
    } catch (error) {
      console.error("7Z isolated file delivery error:", error);
    }
  }

  // Initial load
  refresh();

  window.addEventListener("pageshow", refresh);
  window.addEventListener("focus", refresh);
  D.addEventListener("visibilitychange", () => {
    if (!D.hidden) refresh();
  });

  window.__Z7_REFRESH_FILES__ = refresh;

  window.addEventListener("z7pa:auth-changed", (event) => {
    if (event.detail?.authenticated) {
      refresh();
    } else {
      hideFiles();
    }
  });

})();
