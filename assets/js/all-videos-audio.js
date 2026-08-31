(() => {
  "use strict";

  if (window.__Z7_VIDEO_ENGINE_V6__) return;
  window.__Z7_VIDEO_ENGINE_V6__ = true;

  const SKIP_SELECTOR =
    "#loader, .loader, [data-preloader], .z7-route-transition, #introVideo";

  const HOST_SELECTOR =
    ".media-tile, .film-player, .manifest__media--cinema, .manifest__media, " +
    ".browser-frame, .phone-frame, .web-device, .hero-media";

  const managed = new Set();
  const buttons = new WeakMap();
  const restartTimers = new WeakMap();

  const speakerMarkup = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 10v4h4l5 4V6L9 10H5Z"></path>
      <g class="z7-video-audio__waves">
        <path d="M17 9.2a4 4 0 0 1 0 5.6"></path>
        <path d="M19.7 6.7a7.5 7.5 0 0 1 0 10.6"></path>
      </g>
      <path class="z7-video-audio__slash" d="m17 10 4 4m0-4-4 4"></path>
    </svg>
  `;

  const isContentVideo = (video) =>
    video instanceof HTMLVideoElement &&
    !video.closest(SKIP_SELECTOR);

  const inViewport = (video) => {
    const rect = video.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    );
  };

  const getHost = (video) => {
    const host = video.closest(HOST_SELECTOR) || video.parentElement;
    if (!host) return null;

    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }

    return host;
  };

  const ensureLoop = (video) => {
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
  };

  const syncButton = (video) => {
    const button = buttons.get(video);
    if (!button) return;

    const audible = !video.muted && video.volume > 0;
    button.classList.toggle("is-audible", audible);
    button.setAttribute("aria-pressed", String(audible));
    button.setAttribute(
      "aria-label",
      audible ? "Mute this video" : "Turn sound on for this video"
    );
    button.title = audible ? "Mute video" : "Turn sound on";
  };

  const muteVideo = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    syncButton(video);
  };

  const muteOthers = (current) => {
    managed.forEach((video) => {
      if (video !== current) muteVideo(video);
    });
  };

  const activate = (video, eager = false) => {
    if (!isContentVideo(video)) return false;

    ensureLoop(video);

    if (video.getAttribute("src")) return true;

    const source = video.dataset.src;
    if (!source) return false;

    video.preload = eager ? "auto" : "metadata";
    video.setAttribute("src", source);

    try {
      video.load();
    } catch (_) {}

    return true;
  };

  const unload = (video) => {
    if (!isContentVideo(video) || !video.paused) return;

    const source = video.getAttribute("src");
    if (!source) return;

    video.dataset.src = source;
    video.removeAttribute("src");
    video.preload = "none";

    try {
      video.load();
    } catch (_) {}
  };

  const playVisible = (video) => {
    if (document.hidden || !inViewport(video)) return;

    activate(video, false);
    ensureLoop(video);

    video.play().catch(() => {
      muteVideo(video);
      video.play().catch(() => {});
    });
  };

  const scheduleHeal = (video) => {
    const old = restartTimers.get(video);
    if (old) window.clearTimeout(old);

    const timer = window.setTimeout(() => {
      restartTimers.delete(video);

      if (
        document.hidden ||
        !video.isConnected ||
        !inViewport(video)
      ) {
        return;
      }

      ensureLoop(video);
      if (video.paused) playVisible(video);
    }, 120);

    restartTimers.set(video, timer);
  };

  const createSoundButton = (video, host) => {
    const existing = host.querySelector(":scope > .z7-video-audio");

    if (existing) {
      buttons.set(video, existing);
      syncButton(video);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "z7-video-audio";
    button.innerHTML = speakerMarkup;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Turn sound on for this video");
    button.title = "Turn sound on";

    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      activate(video, true);
      ensureLoop(video);

      if (video.muted || video.volume === 0) {
        muteOthers(video);
        video.defaultMuted = false;
        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {});
      } else {
        muteVideo(video);
      }

      syncButton(video);
    });

    host.appendChild(button);
    buttons.set(video, button);
    syncButton(video);
  };

  const warmObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) activate(entry.target, false);
            });
          },
          { rootMargin: "700px 0px", threshold: 0.01 }
        )
      : null;

  const playObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const video = entry.target;

              if (entry.isIntersecting && entry.intersectionRatio >= 0.06) {
                playVisible(video);
                return;
              }

              const timer = restartTimers.get(video);
              if (timer) {
                window.clearTimeout(timer);
                restartTimers.delete(video);
              }

              video.pause();
              muteVideo(video);
            });
          },
          {
            rootMargin: "0px",
            threshold: [0, 0.06, 0.2, 0.5]
          }
        )
      : null;

  const coldObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) unload(entry.target);
            });
          },
          { rootMargin: "1600px 0px", threshold: 0 }
        )
      : null;

  const prepare = (video) => {
    if (!isContentVideo(video) || managed.has(video)) return;

    const host = getHost(video);
    if (!host) return;

    managed.add(video);
    host.classList.add("z7-video-host", "z7-autoloop-enabled");

    const directSource = video.getAttribute("src");
    if (directSource) {
      video.dataset.src = directSource;
      video.removeAttribute("src");
      try {
        video.load();
      } catch (_) {}
    }

    video.controls = false;
    video.autoplay = false;
    video.preload = "none";
    video.muted = true;
    video.defaultMuted = true;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;

    video.removeAttribute("controls");
    video.removeAttribute("autoplay");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute(
      "controlslist",
      "nodownload noplaybackrate noremoteplayback"
    );
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("disableremoteplayback", "");
    video.setAttribute("oncontextmenu", "return false;");

    ensureLoop(video);

    host.querySelectorAll("[data-inline-video]").forEach((control) => {
      control.hidden = true;
      control.setAttribute("aria-hidden", "true");
      control.setAttribute("tabindex", "-1");
    });

    createSoundButton(video, host);

    video.addEventListener("volumechange", () => syncButton(video));

    video.addEventListener("play", () => {
      ensureLoop(video);
      host.classList.add("is-playing");
    });

    video.addEventListener("pause", () => {
      host.classList.remove("is-playing");

      if (inViewport(video) && !document.hidden) {
        scheduleHeal(video);
      }
    });

    video.addEventListener("ended", () => {
      ensureLoop(video);

      if (!document.hidden && inViewport(video)) {
        try {
          video.currentTime = 0;
        } catch (_) {}
        playVisible(video);
      }
    });

    if (warmObserver) warmObserver.observe(video);
    if (playObserver) playObserver.observe(video);
    if (coldObserver) coldObserver.observe(video);

    if (!playObserver && inViewport(video)) {
      playVisible(video);
    }
  };

  const scan = (root = document) => {
    if (root instanceof HTMLVideoElement) {
      prepare(root);
      return;
    }

    root.querySelectorAll?.("video").forEach(prepare);
  };

  scan();

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node);
      });
    });
  });

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  const reconcile = () => {
    managed.forEach((video) => {
      if (inViewport(video)) {
        playVisible(video);
      } else {
        video.pause();
      }
    });
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      managed.forEach((video) => video.pause());
      return;
    }
    reconcile();
  });

  [250, 900, 2200, 4500].forEach((delay) => {
    window.setTimeout(reconcile, delay);
  });

  window.addEventListener("load", reconcile, { once: true });
})();
