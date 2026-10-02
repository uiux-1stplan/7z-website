(() => {
  "use strict";

  const P = window.__Z7_WEBSITE_PROJECTS__ || [];
  if (!P.length) return;

  const $ = (selector, root = document) => root.querySelector(selector);

  const tabs = $("#projects");
  const devices = [...document.querySelectorAll("[data-device]")];
  const stage = $("#stage");
  const screen = $("#screen");
  const poster = $("#poster");
  const frame = $("#liveFrame");
  const openSite = $("#openSite");
  const address = $("#address");
  const status = $("#statusText");
  const retry = $("#retry");

  let projectIndex = 0;
  let device = "desktop";

  let token = 0;
  let ready = false;
  let timer = 0;
  let ping = 0;
  let liveRequested = false;

  const project = () => P[projectIndex];

  const picture = (item) =>
    device === "mobile"
      ? (item.mobile || item.desktop)
      : item.desktop;

  function stopHandshake() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }

    if (ping) {
      clearInterval(ping);
      ping = 0;
    }
  }

  function setLive(value) {
    ready = value;

    screen.classList.toggle("is-live", value);

    frame.setAttribute(
      "aria-hidden",
      value ? "false" : "true"
    );

    if (value) {
      stopHandshake();
      retry.hidden = true;
    }
  }

  function parkFrame() {
    token += 1;

    stopHandshake();

    ready = false;
    liveRequested = false;

    setLive(false);

    if (frame.src !== "about:blank") {
      frame.src = "about:blank";
    }

    status.textContent = "Static preview ready";

    retry.textContent = "Load live preview";
    retry.hidden = false;
  }

  function hello() {
    if (!frame.contentWindow) return;

    const messages = [
      {
        type: "7z-parent-ready",
        source: "7z-magic",
        device
      },
      {
        type: "7Z_PREVIEW_PARENT_READY",
        source: "7z-magic",
        device
      },
      {
        type: "7z:preview:hello",
        source: "7z-magic",
        device
      }
    ];

    messages.forEach((message) => {
      try {
        frame.contentWindow.postMessage(message, "*");
      } catch (_) {}
    });
  }

  function readyMessage(value) {
    if (value == null) return false;

    let text = "";

    try {
      text =
        typeof value === "string"
          ? value
          : JSON.stringify(value);
    } catch (_) {}

    return /(7z|preview|bridge).*(ready|heartbeat|alive)|(?:ready|heartbeat).*(7z|preview|bridge)/i.test(text);
  }

  function loadLivePreview() {
    if (liveRequested) return;

    const item = project();
    const myToken = ++token;

    stopHandshake();

    ready = false;
    liveRequested = true;

    setLive(false);

    status.textContent = "Loading live preview";

    retry.hidden = true;

    frame.src = "about:blank";

    requestAnimationFrame(() => {

      if (myToken !== token) return;

      frame.src = item.url;

      /*
        Old behavior:
        every 450ms.

        New behavior:
        once every 1200ms.
      */

      ping = setInterval(hello, 1200);

      timer = setTimeout(() => {

        if (
          myToken !== token ||
          ready
        ) {
          return;
        }

        stopHandshake();

        liveRequested = false;

        status.textContent = "Preview protected";

        retry.textContent = "Retry preview";
        retry.hidden = false;

      }, 9000);

    });
  }

  function render() {
    const item = project();

    [...tabs.children].forEach((button, index) => {
      button.classList.toggle(
        "is-active",
        index === projectIndex
      );
    });

    devices.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.device === device
      );
    });

    stage.classList.toggle(
      "is-mobile",
      device === "mobile"
    );

    stage.classList.toggle(
      "is-desktop",
      device === "desktop"
    );

    poster.src = picture(item);
    poster.alt = `${item.name} ${device} preview`;

    openSite.href = item.url;

    address.textContent = item.url
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    /*
      IMPORTANT:
      Do NOT load the external website here.

      Page now stays lightweight until the visitor
      explicitly requests the live preview.
    */

    parkFrame();
  }

  P.forEach((item, index) => {

    const button = document.createElement("button");

    button.type = "button";
    button.textContent = item.name;

    button.addEventListener("click", () => {

      if (projectIndex === index) return;

      projectIndex = index;

      render();

    });

    tabs.appendChild(button);

  });

  devices.forEach((button) => {

    button.addEventListener("click", () => {

      const nextDevice = button.dataset.device;

      if (
        !nextDevice ||
        nextDevice === device
      ) {
        return;
      }

      device = nextDevice;

      render();

    });

  });

  retry.addEventListener(
    "click",
    loadLivePreview
  );

  frame.addEventListener("load", () => {

    if (
      frame.src &&
      frame.src !== "about:blank"
    ) {
      hello();
    }

  });

  window.addEventListener("message", (event) => {

    if (
      event.source !== frame.contentWindow ||
      !readyMessage(event.data)
    ) {
      return;
    }

    status.textContent = "Live";

    setLive(true);

  });

  /*
    Stop background work completely when
    the browser tab is hidden.
  */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (document.hidden) {
        stopHandshake();
      }
      else if (
        liveRequested &&
        !ready
      ) {
        hello();
      }

    }
  );

  render();

})();


/* ----------------------------------------------------------
   Z7 CANONICAL HEADER BEHAVIOR
---------------------------------------------------------- */

(() => {

  const menu =
    document.querySelector(".services-menu");

  const trigger =
    document.querySelector(".services-trigger");

  const panel =
    document.querySelector(".services-panel");

  if (
    !menu ||
    !trigger ||
    !panel
  ) {
    return;
  }

  const close = () => {

    menu.classList.remove("is-open");

    trigger.setAttribute(
      "aria-expanded",
      "false"
    );

    panel.setAttribute(
      "aria-hidden",
      "true"
    );

  };

  trigger.addEventListener(
    "click",
    (event) => {

      event.stopPropagation();

      const open =
        !menu.classList.contains("is-open");

      menu.classList.toggle(
        "is-open",
        open
      );

      trigger.setAttribute(
        "aria-expanded",
        open ? "true" : "false"
      );

      panel.setAttribute(
        "aria-hidden",
        open ? "false" : "true"
      );

    }
  );

  document.addEventListener(
    "click",
    (event) => {

      if (!menu.contains(event.target)) {
        close();
      }

    }
  );

  document.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Escape") {
        close();
      }

    }
  );

})();
