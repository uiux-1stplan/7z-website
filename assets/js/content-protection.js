(() => {
  "use strict";

  document.documentElement.classList.add("z7-content-protected");

  const isEditable = (target) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "input, textarea, select, option, [contenteditable='true']"
      )
    );

  document.addEventListener("contextmenu", (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("copy", (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("cut", (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("selectstart", (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("dragstart", (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("img, video, picture, source")
    ) {
      event.preventDefault();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (isEditable(event.target)) return;
    if (!(event.ctrlKey || event.metaKey)) return;

    const blocked = new Set(["c", "s", "u", "p"]);
    if (blocked.has(event.key.toLowerCase())) {
      event.preventDefault();
    }
  }, true);
})();
