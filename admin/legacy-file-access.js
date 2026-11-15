/**
 * 7Z Magic — Legacy File Access Cleaner (Inert & Purged)
 * Neutralizes all legacy unstyled "Clients - All Media" lists.
 */
(() => {
  "use strict";
  function purgeLegacy() {
    const ids = ["legacy-file-access-panel", "legacy-access-section"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll(".clients-all-media, .legacy-access-section").forEach(el => el.remove());
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", purgeLegacy);
  } else {
    purgeLegacy();
  }
})();
