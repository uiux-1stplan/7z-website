/**
 * 7Z MAGIC & MAJARA ACADEMY — CONTENT SHIELD ENGINE
 * Robust protection against right-click, selection, hotkeys, dragging, and inspect outside forms & admin.
 * Zero inline scripts, Zero pixel impact.
 */

(() => {
  "use strict";

  // Check if we are inside /admin/ or an exempt zone
  const isAdmin = () => {
    try {
      const path = (window.location.pathname || "").toLowerCase();
      return path.startsWith("/admin") || document.documentElement.classList.contains("admin-shield-exempt");
    } catch {
      return false;
    }
  };

  // If inside admin, mark root as exempt and exit completely
  if (isAdmin()) {
    document.documentElement.classList.add("admin-shield-exempt");
    return;
  }

  // Helper: check if target is an editable form element
  const isInputTarget = (target) => {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        "input, textarea, select, [contenteditable='true'], .allow-select, .shield-selectable"
      )
    );
  };

  // 1. Disable Context Menu (Right Click) across document and all elements
  document.addEventListener(
    "contextmenu",
    (e) => {
      if (isAdmin()) return;
      if (isInputTarget(e.target)) return; // Allow right click in inputs if user needs paste/spellcheck
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  // 2. Prevent Select Start outside form elements
  document.addEventListener(
    "selectstart",
    (e) => {
      if (isAdmin()) return;
      if (isInputTarget(e.target)) return;
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  // 3. Prevent Drag Start on images, videos, iframes, links
  document.addEventListener(
    "dragstart",
    (e) => {
      if (isAdmin()) return;
      if (isInputTarget(e.target)) return;
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  // 4. Block Copy & Cut outside form inputs
  document.addEventListener(
    "copy",
    (e) => {
      if (isAdmin()) return;
      if (isInputTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  document.addEventListener(
    "cut",
    (e) => {
      if (isAdmin()) return;
      if (isInputTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  // 5. Intercept and block protective keyboard shortcuts outside inputs
  document.addEventListener(
    "keydown",
    (e) => {
      if (isAdmin()) return;

      const isModifier = e.ctrlKey || e.metaKey;
      const key = (e.key || "").toLowerCase();
      const code = e.code || "";

      // Developer Tools: F12
      if (key === "f12" || code === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Inspect Shortcuts: Ctrl/Cmd + Shift + I / J / C
      if (isModifier && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Save Page: Ctrl/Cmd + S
      if (isModifier && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // View Source: Ctrl/Cmd + U
      if (isModifier && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Print: Ctrl/Cmd + P
      if (isModifier && key === "p") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // If user is inside an input/textarea/editable field, allow typing, Copy (Ctrl+C), Select All (Ctrl+A), Paste (Ctrl+V)
      if (isInputTarget(e.target)) {
        return;
      }

      // Select All: Ctrl/Cmd + A (outside inputs)
      if (isModifier && key === "a") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Copy: Ctrl/Cmd + C (outside inputs)
      if (isModifier && key === "c") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );
})();
