(() => {
  "use strict";
  if (!document.documentElement.hasAttribute("data-z7-core") || !document.querySelector(".z7-home")) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const abort = new AbortController();
  const observers = [];
  const rafs = new Set();
  const comparisons = [
    ["/media/arch_projects/bef_af/1.1.jpeg", "/media/arch_projects/bef_af/1.2.png"],
    ["/media/arch_projects/bef_af/2.1.png", "/media/arch_projects/bef_af/2.2.png"],
    ["/media/arch_projects/bef_af/3.1.jpeg", "/media/arch_projects/bef_af/3.2.jpeg"]
  ];
  const architectureVideos = [
    { src: "/media/arch_projects/16-9V/1.mp4", poster: "/media/posters/arch_projects/16-9V/1.jpg", title: "Vertical Interior Film", layout: "is-tall" },
    { src: "/media/arch_projects/9-16H/1.mp4", poster: "/media/posters/arch_projects/9-16H/1.jpg", title: "Architectural Atmosphere", layout: "is-wide" },
    { src: "/media/arch_projects/9-16H/2.mp4", poster: "/media/posters/arch_projects/9-16H/2.jpg", title: "Residence Walkthrough", layout: "is-wide" }
  ];
  const mediaProjects = Array.from({ length: 12 }, (_, index) => ({
    src: `/media/media_projects/Media (${index + 1}).mp4`,
    poster: `/media/posters/media_projects/Media (${index + 1}).jpg`,
    title: `Campaign Film ${String(index + 1).padStart(2, "0")}`
  }));
  const presentations = [
    { src: "/media/prop/1.mp4", poster: "/media/posters/prop/1.jpg", title: "Interactive Presentation 01" },
    { src: "/media/prop/2.mp4", poster: "/media/posters/prop/2.jpg", title: "Interactive Presentation 02" }
  ];

  function renderComparisons() {
    const stage = $("#comparisonStage");
    if (!stage) return;
    const fragment = document.createDocumentFragment();
    comparisons.forEach(([before, after], index) => {
      const card = document.createElement("article");
      card.className = "compare";
      card.style.setProperty("--split", "50%");
      const first = document.createElement("img");
      first.src = before;
      first.alt = `Architecture project ${index + 1} before`;
      first.loading = "lazy";
      first.decoding = "async";
      const second = document.createElement("img");
      second.src = after;
      second.alt = `Architecture project ${index + 1} after`;
      second.className = "compare__after";
      second.loading = "lazy";
      second.decoding = "async";
      const divider = document.createElement("span");
      divider.className = "compare__divider";
      divider.setAttribute("aria-hidden", "true");
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "compare__handle";
      handle.textContent = "Drag";
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-label", `Compare architecture transformation ${index + 1}`);
      handle.setAttribute("aria-valuemin", "8");
      handle.setAttribute("aria-valuemax", "92");
      handle.setAttribute("aria-valuenow", "50");
      const labels = document.createElement("div");
      labels.className = "compare__labels";
      const beforeLabel = document.createElement("span");
      const afterLabel = document.createElement("span");
      beforeLabel.textContent = "Before";
      afterLabel.textContent = "After";
      labels.append(beforeLabel, afterLabel);
      card.append(first, second, divider, handle, labels);
      fragment.append(card);
    });
    stage.replaceChildren(fragment);
  }

  function renderTiles(selector, items) {
    const container = $(selector);
    if (!container) return;
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const tile = document.createElement("article");
      tile.className = `media-tile ${item.layout || ""}`.trim();
      const video = document.createElement("video");
      video.dataset.src = item.src;
      video.muted = true;
      video.playsInline = true;
      video.preload = "none";
      if (item.poster) video.poster = item.poster;
      video.setAttribute("playsinline", "");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "play-badge";
      button.dataset.inlineVideo = "";
      button.setAttribute("aria-label", `Play ${item.title}`);
      button.textContent = "Play";
      const title = document.createElement("span");
      title.textContent = item.title;
      tile.append(video, button, title);
      if (selector === "#mediaRail") {
        const slot = document.createElement("div");
        slot.className = "media-fan-slot";
        slot.dataset.fanIndex = String(index);
        slot.append(tile);
        fragment.append(slot);
      } else fragment.append(tile);
    });
    container.replaceChildren(fragment);
  }

  function initComparisons() {
    $$(".compare").forEach(card => {
      const handle = $(".compare__handle", card);
      let value = 50;
      const set = next => {
        value = Math.max(8, Math.min(92, next));
        card.style.setProperty("--split", `${value}%`);
        handle.setAttribute("aria-valuenow", String(Math.round(value)));
      };
      const onMove = event => {
        const rect = card.getBoundingClientRect();
        if (rect.width) set((event.clientX - rect.left) / rect.width * 100);
      };
      card.addEventListener("pointerdown", event => {
        if (event.target.closest("a")) return;
        handle.setPointerCapture?.(event.pointerId);
        onMove(event);
      }, { signal: abort.signal });
      handle.addEventListener("pointermove", event => {
        if (handle.hasPointerCapture?.(event.pointerId)) onMove(event);
      }, { signal: abort.signal });
      handle.addEventListener("keydown", event => {
        const step = event.key === "ArrowRight" ? 4 : event.key === "ArrowLeft" ? -4 : 0;
        if (!step && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        set(event.key === "Home" ? 8 : event.key === "End" ? 92 : value + step);
      }, { signal: abort.signal });
    });
  }

  function attachSource(video) {
    if (!video || video.src || !video.dataset.src) return;
    video.src = video.dataset.src;
    video.load();
  }

  function initHeroVideo() {
    const video = $(".z7-cinema__ambient-video");
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    const start = () => {
      if (navigator.connection?.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      attachSource(video);
      video.play().catch(() => {});
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true, signal: abort.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) video.pause();
      else if (video.src && !navigator.connection?.saveData) video.play().catch(() => {});
    }, { signal: abort.signal });
  }

  function initMedia() {
    const ambient = $(".z7-cinema__ambient-video");
    const reel = $(".z7-web-reel");
    if (reel && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !navigator.connection?.saveData) {
            attachSource(reel);
            reel.play().catch(() => {});
          } else reel.pause();
        });
      }, { rootMargin: "150px", threshold: .05 });
      observer.observe(reel);
      observers.push(observer);
    }
    document.addEventListener("click", event => {
      const button = event.target.closest?.("[data-inline-video]");
      if (!button) return;
      const card = button.closest(".media-tile, .manifest__media, .film-player");
      const video = card?.querySelector("video");
      if (!video) return;
      event.preventDefault();
      if (!video.paused) { video.pause(); button.textContent = "Play"; card.classList.remove("is-playing"); return; }
      $$(".z7-home video").forEach(other => {
        if (other !== video && other !== ambient && other !== reel && !other.paused) {
          other.pause();
          other.closest(".media-tile, .manifest__media, .film-player")?.classList.remove("is-playing");
        }
      });
      attachSource(video);
      video.controls = true;
      video.muted = false;
      video.play().then(() => {
        card.classList.add("is-playing");
        button.textContent = "Pause";
      }).catch(() => {
        video.muted = true;
        video.play().then(() => {
          card.classList.add("is-playing");
          button.textContent = "Pause";
        }).catch(() => {});
      });
    }, { signal: abort.signal });
    $$(".z7-home video:not(.z7-cinema__ambient-video):not(.z7-web-reel)").forEach(video => {
      video.addEventListener("ended", () => {
        const card = video.closest(".media-tile, .manifest__media, .film-player");
        card?.classList.remove("is-playing");
        const button = card?.querySelector("[data-inline-video]");
        if (button) button.textContent = "Play";
      }, { signal: abort.signal });
    });
  }

  function initCounters() {
    const nodes = $$("[data-count]");
    const reveal = node => {
      const total = Number(node.dataset.count);
      if (!Number.isFinite(total)) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = String(total); return; }
      const start = performance.now();
      let frameId = 0;
      const tick = now => {
        rafs.delete(frameId);
        const t = Math.min(1, (now - start) / 850);
        node.textContent = String(Math.round(total * (1 - (1 - t) ** 3)));
        if (t < 1) { frameId = requestAnimationFrame(tick); rafs.add(frameId); }
      };
      frameId = requestAnimationFrame(tick);
      rafs.add(frameId);
    };
    if (!("IntersectionObserver" in window)) { nodes.forEach(reveal); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }), { threshold: .3 });
    nodes.forEach(node => observer.observe(node));
    observers.push(observer);
  }

  function boot() {
    renderComparisons();
    renderTiles("#architectureVideos", architectureVideos);
    renderTiles("#mediaRail", mediaProjects);
    renderTiles("#presentationStack", presentations);
    initComparisons();
    initHeroVideo();
    initMedia();
    initCounters();
    window.addEventListener("pagehide", () => {
      abort.abort();
      observers.forEach(observer => observer.disconnect());
      rafs.forEach(cancelAnimationFrame);
      $$(".z7-home video").forEach(video => video.pause());
    }, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
