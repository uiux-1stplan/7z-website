(() => {
  "use strict";

  const nativeMatchMedia = window.matchMedia.bind(window);
  const coarsePointer = nativeMatchMedia("(hover: none), (pointer: coarse)").matches;
  const narrowViewport = nativeMatchMedia("(max-width: 899px)").matches;
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  const constrainedNetwork = Boolean(
    connection?.saveData ||
    /(^|-)2g$/.test(connection?.effectiveType || "")
  );

  const compactMode =
    coarsePointer ||
    narrowViewport ||
    constrainedNetwork;

  /*
   * Force the existing short desktop loader path on mobile.
   * This prevents downloading the same loader video twice.
   */
  window.matchMedia = (query) => {
    const result = nativeMatchMedia(query);

    if (
      query.replace(/\s+/g, "") !== "(min-width:900px)" ||
      result.matches
    ) {
      return result;
    }

    return new Proxy(result, {
      get(target, property) {
        if (property === "matches") return true;

        const value = target[property];

        return typeof value === "function"
          ? value.bind(target)
          : value;
      }
    });
  };

  window.setTimeout(() => {
    window.matchMedia = nativeMatchMedia;
  }, 30000);

  /*
   * Mobile uses native scrolling and static reveals.
   * Desktop keeps the complete cinematic experience.
   */
  if (compactMode) {
    window.Lenis = null;
    window.gsap = null;
    window.ScrollTrigger = null;

    document.documentElement.classList.add(
      "performance-compact"
    );
  }

  const nativeSrcDescriptor =
    Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "src"
    );

  const registeredVideos = new WeakSet();

  const isCriticalVideo = (video) =>
    video.id === "introVideo" ||
    video.classList.contains("loader__video") ||
    video.classList.contains("loader__video-bg");

  const nativeSetSrc = (video, value) => {
    if (nativeSrcDescriptor?.set) {
      nativeSrcDescriptor.set.call(video, value);
      return;
    }

    video.setAttribute("src", value);
  };

  const activateVideo = (
    video,
    userInitiated = false
  ) => {
    if (
      !video ||
      isCriticalVideo(video) ||
      video.getAttribute("src")
    ) {
      return;
    }

    const source = video.dataset.src;

    if (!source) return;

    if (userInitiated) {
      video.dataset.userActivated = "true";
    }

    video.preload = userInitiated
      ? "auto"
      : "metadata";

    nativeSetSrc(video, source);
    video.load();

    video.classList.add("is-media-ready");
  };

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;

              const video = entry.target;

              /*
               * On Data Saver and 2G, videos download
               * only after the visitor presses Play.
               */
              if (!constrainedNetwork) {
                activateVideo(video, false);
              }

              observer.unobserve(video);
            });
          },
          {
            rootMargin: "320px 0px",
            threshold: 0.01
          }
        )
      : null;

  const registerVideo = (video) => {
    if (
      !(video instanceof HTMLVideoElement) ||
      registeredVideos.has(video) ||
      isCriticalVideo(video)
    ) {
      return;
    }

    registeredVideos.add(video);

    const currentSource =
      video.getAttribute("src") ||
      video.currentSrc;

    if (currentSource) {
      video.dataset.src = currentSource;
      video.removeAttribute("src");
      video.preload = "none";
      video.load();
    } else {
      video.preload = "none";
    }

    observer?.observe(video);
  };

  /*
   * Dynamic gallery cards assign video.src before
   * insertion. Capture that assignment and defer it.
   */
  if (
    nativeSrcDescriptor?.configurable &&
    nativeSrcDescriptor.set &&
    nativeSrcDescriptor.get
  ) {
    Object.defineProperty(
      HTMLMediaElement.prototype,
      "src",
      {
        configurable: true,
        enumerable: nativeSrcDescriptor.enumerable,

        get() {
          return nativeSrcDescriptor.get.call(this);
        },

        set(value) {
          if (
            this instanceof HTMLVideoElement &&
            !this.isConnected &&
            !isCriticalVideo(this) &&
            typeof value === "string" &&
            value
          ) {
            this.dataset.src = value;
            return;
          }

          nativeSrcDescriptor.set.call(
            this,
            value
          );
        }
      }
    );
  }

  document
    .querySelectorAll("video")
    .forEach(registerVideo);

  const mutationObserver =
    new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (node.matches("video")) {
            registerVideo(node);
          }

          node
            .querySelectorAll?.("video")
            .forEach(registerVideo);
        });
      });
    });

  mutationObserver.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  /*
   * Load the selected film before app.js receives
   * the Play click.
   */
  const activateFromInteraction = (event) => {
    if (!(event.target instanceof Element)) return;

    const trigger =
      event.target.closest(
        "[data-inline-video]"
      );

    if (!trigger) return;

    const root = trigger.closest(
      ".media-tile, .manifest__media, .browser-frame, .phone-frame, .film-player"
    );

    activateVideo(
      root?.querySelector("video"),
      true
    );
  };

  document.addEventListener(
    "pointerdown",
    activateFromInteraction,
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        activateFromInteraction(event);
      }
    },
    true
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) return;

      document
        .querySelectorAll(
          "main video:not(#introVideo)"
        )
        .forEach((video) => {
          video.pause();
        });
    }
  );

  window.setTimeout(() => {
    mutationObserver.disconnect();
  }, 12000);
})();