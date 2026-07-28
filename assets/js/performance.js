(() => {
  "use strict";

  const all = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));

  const nativeSrc = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "src"
  );

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  const constrainedNetwork = Boolean(
    connection &&
      (connection.saveData ||
        /(^|-)2g$/.test(connection.effectiveType || ""))
  );

  const registered = new WeakSet();

  const isCritical = (video) =>
    video.id === "introVideo" ||
    video.classList.contains("loader__video") ||
    video.classList.contains("loader__video-bg");

  const posterFor = (source) => {
    const clean = String(source || "")
      .split(/[?#]/)[0]
      .replace(/^\/+/, "");

    if (!clean.startsWith("media/")) return "";

    return clean
      .replace(/^media\//, "media/posters/")
      .replace(/\.[^.]+$/, ".jpg");
  };

  const setNativeSource = (video, source) => {
    if (nativeSrc && nativeSrc.set) {
      nativeSrc.set.call(video, source);
      return;
    }

    video.setAttribute("src", source);
  };

  const ensurePoster = (video, source) => {
    if (video.poster) return;
    const poster = posterFor(source);
    if (poster) video.poster = poster;
  };

  const activate = (video, userInitiated = false) => {
    if (!video || isCritical(video) || video.getAttribute("src")) return;

    const source = video.dataset.src;
    if (!source) return;

    ensurePoster(video, source);
    video.preload = userInitiated ? "auto" : "metadata";
    setNativeSource(video, source);
    video.load();
  };

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              if (!constrainedNetwork) activate(entry.target, false);
              observer.unobserve(entry.target);
            });
          },
          { rootMargin: "420px 0px", threshold: 0.01 }
        )
      : null;

  const register = (video) => {
    if (!(video instanceof HTMLVideoElement) || registered.has(video)) return;

    registered.add(video);

    const source =
      video.dataset.src ||
      video.getAttribute("src") ||
      video.currentSrc;

    ensurePoster(video, source);

    if (isCritical(video)) {
      video.preload = video.id === "introVideo" ? "metadata" : "none";
      return;
    }

    if (video.getAttribute("src")) {
      video.dataset.src = video.getAttribute("src");
      video.removeAttribute("src");
      video.preload = "none";
      video.load();
    } else {
      video.preload = "none";
    }

    if (observer) observer.observe(video);
  };

  if (
    nativeSrc &&
    nativeSrc.configurable &&
    nativeSrc.get &&
    nativeSrc.set
  ) {
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      enumerable: nativeSrc.enumerable,

      get() {
        return nativeSrc.get.call(this);
      },

      set(value) {
        if (
          this instanceof HTMLVideoElement &&
          !isCritical(this) &&
          typeof value === "string" &&
          /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(value)
        ) {
          this.dataset.src = value;
          this.preload = "none";
          ensurePoster(this, value);
          if (this.isConnected) register(this);
          return;
        }

        nativeSrc.set.call(this, value);
      }
    });
  }

  all("video").forEach(register);

  const mutations = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("video")) register(node);
        all("video", node).forEach(register);
      });
    });
  });

  mutations.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  const activateFromControl = (event) => {
    if (!(event.target instanceof Element)) return;

    const trigger = event.target.closest("[data-inline-video]");
    if (!trigger) return;

    const container = trigger.closest(
      ".media-tile, .manifest__media, .browser-frame, .phone-frame, .film-player"
    );

    activate(container && container.querySelector("video"), true);
  };

  document.addEventListener("pointerdown", activateFromControl, true);

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        activateFromControl(event);
      }
    },
    true
  );

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    all("main video:not(#introVideo)").forEach((video) => video.pause());
  });

  window.setTimeout(() => mutations.disconnect(), 15000);
})();