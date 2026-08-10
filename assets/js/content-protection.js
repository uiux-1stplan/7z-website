(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("z7-content-protected");

  const isEditable = (target) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "input, textarea, select, option, [contenteditable='true']"
      )
    );

  /* Best-effort copy/download deterrence for normal visitors. */
  document.addEventListener(
    "contextmenu",
    (event) => {
      if (!isEditable(event.target)) event.preventDefault();
    },
    true
  );

  document.addEventListener(
    "copy",
    (event) => {
      if (!isEditable(event.target)) event.preventDefault();
    },
    true
  );

  document.addEventListener(
    "cut",
    (event) => {
      if (!isEditable(event.target)) event.preventDefault();
    },
    true
  );

  document.addEventListener(
    "selectstart",
    (event) => {
      if (!isEditable(event.target)) event.preventDefault();
    },
    true
  );

  document.addEventListener(
    "dragstart",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("img, video, picture, source")
      ) {
        event.preventDefault();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (isEditable(event.target)) return;
      if (!(event.ctrlKey || event.metaKey)) return;

      const blocked = new Set(["c", "s", "u", "p"]);
      if (blocked.has(event.key.toLowerCase())) {
        event.preventDefault();
      }
    },
    true
  );

  const managedVideos = Array.from(
    document.querySelectorAll("main video")
  ).filter(
    (video) =>
      video.id !== "introVideo" &&
      !video.closest("#loader") &&
      !video.classList.contains("loader__video") &&
      !video.classList.contains("loader__video-bg")
  );

  if (!managedVideos.length) return;

  const hosts = new WeakMap();
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

  function getHost(video) {
    return (
      video.closest(
        ".media-tile, .film-player, .manifest__media--cinema, .manifest__media, .browser-frame, .phone-frame, .web-device"
      ) || video.parentElement
    );
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

  function muteOtherVideos(current) {
    managedVideos.forEach((video) => {
      if (video !== current) muteVideo(video);
    });
  }

  function playMuted(video) {
    loadSource(video);
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("loop", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");

    if (video.paused) {
      video.play().catch(() => {
        muteVideo(video);
        video.play().catch(() => {});
      });
    }
  }

  function createSoundButton(video, host) {
    const existing = Array.from(
      host.querySelectorAll(":scope > .z7-video-audio")
    ).find((button) => button.dataset.videoSoundFor === video.dataset.z7VideoId);

    if (existing) {
      buttons.set(video, existing);
      syncButton(video);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "z7-video-audio";
    button.dataset.videoSoundFor = video.dataset.z7VideoId;
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
        muteOtherVideos(video);
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

  managedVideos.forEach((video, index) => {
    const host = getHost(video);
    if (!host) return;

    video.dataset.z7VideoId = `z7-video-${index + 1}`;
    hosts.set(video, host);

    host.classList.add("z7-video-host", "z7-autoloop-enabled");

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

    createSoundButton(video, host);

    video.addEventListener("volumechange", () => syncButton(video));
    video.addEventListener("play", () => host.classList.add("is-playing"));
    video.addEventListener("pause", () => host.classList.remove("is-playing"));
  });

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const video = entry.target;

              if (entry.isIntersecting) {
                visibleVideos.add(video);
                playMuted(video);
              } else {
                visibleVideos.delete(video);
                video.pause();
                muteVideo(video);
              }
            });
          },
          {
            rootMargin: "280px 0px",
            threshold: 0.06
          }
        )
      : null;

  managedVideos.forEach((video) => {
    if (observer) {
      observer.observe(video);
    } else {
      playMuted(video);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      managedVideos.forEach((video) => video.pause());
      return;
    }

    visibleVideos.forEach((video) => playMuted(video));
  });
})();
