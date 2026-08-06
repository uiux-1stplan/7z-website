(() => {
  "use strict";

  const VIDEO_SELECTOR = "video";
  const SKIP_SELECTOR = "#loader, .loader, [data-preloader], .z7-route-transition";
  const HOST_SELECTOR =
    ".media-tile, .film-player, .manifest__media--cinema, .manifest__media, " +
    ".browser-frame, .phone-frame, .web-device, .intro, .hero, .hero-media";

  const managedVideos = new Set();
  const buttons = new WeakMap();
  const visibleVideos = new Set();

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

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const video = entry.target;

              if (entry.isIntersecting) {
                visibleVideos.add(video);
                playVideoMuted(video);
              } else {
                visibleVideos.delete(video);
                video.pause();
                muteVideo(video);
              }
            });
          },
          {
            rootMargin: "320px 0px",
            threshold: 0.04
          }
        )
      : null;

  function isContentVideo(video) {
    return (
      video instanceof HTMLVideoElement &&
      !video.closest(SKIP_SELECTOR)
    );
  }

  function getHost(video) {
    const existingHost = video.closest(HOST_SELECTOR);
    if (existingHost) return existingHost;

    const parent = video.parentElement;
    if (!parent) return null;

    const computed = getComputedStyle(parent);
    if (computed.position === "static") {
      parent.style.position = "relative";
    }

    return parent;
  }

  function loadSource(video) {
    if (!video.getAttribute("src") && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }

  function syncButton(video) {
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
  }

  function muteVideo(video) {
    video.muted = true;
    video.defaultMuted = true;
    syncButton(video);
  }

  function muteEveryOtherVideo(current) {
    managedVideos.forEach((video) => {
      if (video !== current) muteVideo(video);
    });
  }

  function playVideoMuted(video) {
    loadSource(video);

    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;

    video.setAttribute("loop", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");

    if (!video.muted) return;

    video.play().catch(() => {
      muteVideo(video);
      video.play().catch(() => {});
    });
  }

  function createSoundButton(video, host) {
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

      loadSource(video);

      if (video.muted || video.volume === 0) {
        muteEveryOtherVideo(video);
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
  }

  function prepareVideo(video) {
    if (!isContentVideo(video) || managedVideos.has(video)) return;

    const host = getHost(video);
    if (!host) return;

    managedVideos.add(video);
    host.classList.add("z7-video-host");

    video.controls = false;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "none";
    video.muted = true;
    video.defaultMuted = true;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;

    video.removeAttribute("controls");
    video.setAttribute("loop", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute(
      "controlslist",
      "nodownload noplaybackrate noremoteplayback"
    );
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("disableremoteplayback", "");
    video.setAttribute("oncontextmenu", "return false;");

    host.querySelectorAll("[data-inline-video]").forEach((control) => {
      control.hidden = true;
      control.setAttribute("aria-hidden", "true");
      control.setAttribute("tabindex", "-1");
    });

    createSoundButton(video, host);

    video.addEventListener("volumechange", () => syncButton(video));

    if (observer) {
      observer.observe(video);
    } else {
      playVideoMuted(video);
    }
  }

  function scan(root = document) {
    if (root instanceof HTMLVideoElement) {
      prepareVideo(root);
      return;
    }

    root.querySelectorAll?.(VIDEO_SELECTOR).forEach(prepareVideo);
  }

  scan();

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node);
      });
    });
  });

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      managedVideos.forEach((video) => video.pause());
      return;
    }

    visibleVideos.forEach((video) => playVideoMuted(video));
  });
})();
