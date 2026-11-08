(() => {
  "use strict";
  if (!document.documentElement.hasAttribute("data-z7-core") || (!document.querySelector(".z7-home") && !document.querySelector(".z7-services-page"))) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const abort = new AbortController();
  const observers = [];
  const frames = new Set();
  const comparisons = [
    ["/media/arch_projects/bef_af/1.1.jpeg", "/media/arch_projects/bef_af/1.2.png"],
    ["/media/arch_projects/bef_af/2.1.png", "/media/arch_projects/bef_af/2.2.png"],
    ["/media/arch_projects/bef_af/3.1.jpeg", "/media/arch_projects/bef_af/3.2.jpeg"]
  ];
  const architecture = [
    { src: "/media/arch_projects/16-9V/1.mp4", poster: "/media/posters/arch_projects/16-9V/1.jpg", title: "Vertical Interior Film", layout: "is-tall" },
    { src: "/media/arch_projects/9-16H/1.mp4", poster: "/media/posters/arch_projects/9-16H/1.jpg", title: "Architectural Atmosphere", layout: "is-wide" },
    { src: "/media/arch_projects/9-16H/2.mp4", poster: "/media/posters/arch_projects/9-16H/2.jpg", title: "Residence Walkthrough", layout: "is-wide" }
  ];
  const campaigns = Array.from({ length: 12 }, (_, i) => ({
    src: `/media/media_projects/Media (${i + 1}).mp4`,
    poster: `/media/posters/media_projects/Media (${i + 1}).jpg`,
    title: `Campaign Film ${String(i + 1).padStart(2, "0")}`
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
      for (const [src, className, suffix] of [[before, "", "before"], [after, "compare__after", "after"]]) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Architecture project ${index + 1} ${suffix}`;
        img.loading = "lazy";
        img.decoding = "async";
        if (className) img.className = className;
        card.append(img);
      }
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
      const first = document.createElement("span");
      const second = document.createElement("span");
      first.textContent = "Before";
      second.textContent = "After";
      labels.append(first, second);
      card.append(divider, handle, labels);
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
      video.autoplay = true;
      video.loop = true;
      video.preload = "none";
      video.poster = item.poster;
      video.setAttribute("autoplay", "");
      video.setAttribute("loop", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.removeAttribute("controls");
      const mute = document.createElement("button");
      mute.type = "button";
      mute.className = "z7-video-mute";
      mute.dataset.videoMute = "";
      mute.setAttribute("aria-label", `Unmute ${item.title}`);
      mute.setAttribute("aria-pressed", "false");
      mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"/></svg><span>Sound off</span>';
      const title = document.createElement("span");
      title.textContent = item.title;
      tile.append(video, mute, title);
      if (selector === "#mediaRail" || selector === "#homeVideoRail") {
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
        value = Math.min(92, Math.max(8, next));
        card.style.setProperty("--split", value + "%");
        handle.setAttribute("aria-valuenow", String(Math.round(value)));
      };
      const update = event => {
        const rect = card.getBoundingClientRect();
        if (rect.width) set((event.clientX - rect.left) / rect.width * 100);
      };
      card.addEventListener("pointerdown", event => {
        handle.setPointerCapture?.(event.pointerId);
        update(event);
      }, { signal: abort.signal });
      handle.addEventListener("pointermove", event => {
        if (handle.hasPointerCapture?.(event.pointerId)) update(event);
      }, { signal: abort.signal });
      handle.addEventListener("keydown", event => {
        const delta = event.key === "ArrowRight" ? 4 : event.key === "ArrowLeft" ? -4 : 0;
        if (!delta && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        set(event.key === "Home" ? 8 : event.key === "End" ? 92 : value + delta);
      }, { signal: abort.signal });
    });
  }

  function initServicePreview() {
    const cards = $$(".service-card");
    const preview = $(".service-preview");
    const image = $("[data-service-preview]");
    const title = $("[data-service-title]");
    const index = $("[data-service-index]");
    const shell = $(".service-loop");
    if (!cards.length || !preview || !image) return;
    let sequence = 0;
    const activate = card => {
      if (card.classList.contains("is-active")) return;
      cards.forEach(item => item.classList.toggle("is-active", item === card));
      shell?.style.setProperty("--service-tint", card.dataset.tint || "79,140,255");
      preview.classList.add("is-switching");
      const token = ++sequence;
      const nextSrc = card.dataset.preview;
      const preload = new Image();
      preload.decoding = "async";
      preload.onload = () => {
        if (token !== sequence) return;
        image.src = nextSrc;
        if (title) title.textContent = card.querySelector("strong")?.textContent || "";
        if (index) index.textContent = card.querySelector("span")?.textContent || "";
        requestAnimationFrame(() => preview.classList.remove("is-switching"));
      };
      preload.onerror = () => preview.classList.remove("is-switching");
      preload.src = nextSrc;
    };
    cards.forEach(card => {
      card.addEventListener("pointerenter", () => activate(card), { signal: abort.signal });
      card.addEventListener("focus", () => activate(card), { signal: abort.signal });
      card.addEventListener("click", () => activate(card), { signal: abort.signal });
    });
  }

  function attach(video) {
    if (!video) return;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.muted = true;
    if (!video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }
  function initHero() {
    const ambient = $("[data-z7-ambient]");
    const hero = $(".z7-cinema");
    if (!ambient || !hero || !matchMedia("(pointer:fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, x = 0, y = 0, tx = 0, ty = 0;
    const onMove = event => {
      const rect = hero.getBoundingClientRect();
      tx = ((event.clientX - rect.left) / rect.width - .5) * 12;
      ty = ((event.clientY - rect.top) / rect.height - .5) * 10;
      if (!frame) frame = requestAnimationFrame(function paint() {
        frame = 0;
        x += (tx - x) * .08; y += (ty - y) * .08;
        ambient.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (Math.abs(tx - x) + Math.abs(ty - y) > .08) frame = requestAnimationFrame(paint);
      });
    };
    hero.addEventListener("pointermove", onMove, { passive: true, signal: abort.signal });
    window.addEventListener("pagehide", () => { if (frame) cancelAnimationFrame(frame); }, { once: true, signal: abort.signal });
  }
  function initMedia() {
    const videos = $$(".z7-home video,.z7-services-page video");
    videos.forEach(video => {
      video.removeAttribute("controls");
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("autoplay", "");
      video.setAttribute("loop", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      const host = video.closest(".media-tile,.manifest__media,.film-player,.web-stage") || video.parentElement;
      if (host && !host.querySelector("[data-video-mute]")) {
        const mute = document.createElement("button");
        mute.type = "button";
        mute.className = "z7-video-mute";
        mute.dataset.videoMute = "";
        mute.setAttribute("aria-label", "Unmute video");
        mute.setAttribute("aria-pressed", "false");
        mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"/></svg><span>Sound off</span>';
        host.append(mute);
      }
    });
    const playVisible = video => {
      if (document.hidden || navigator.connection?.saveData) return;
      attach(video);
      video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) playVisible(video);
      }), { rootMargin: "180px", threshold: .06 });
      videos.forEach(video => observer.observe(video));
      observers.push(observer);
    } else videos.forEach(playVisible);
    document.addEventListener("click", event => {
      const button = event.target.closest?.("[data-video-mute]");
      if (!button) return;
      const video = button.closest(".media-tile,.manifest__media,.film-player,.web-stage")?.querySelector("video") || button.parentElement?.querySelector("video");
      if (!video) return;
      video.muted = !video.muted;
      if (!video.muted) video.volume = .7;
      button.setAttribute("aria-pressed", String(!video.muted));
      button.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
      const label = button.querySelector("span");
      if (label) label.textContent = video.muted ? "Sound off" : "Sound on";
      const icon = button.querySelector("svg");
      if (icon) icon.classList.toggle("is-muted", video.muted);
      if (!video.paused) video.play().catch(() => {});
    }, { signal: abort.signal });
  }
  function initCounters() {
    const nodes = $$("[data-count]");
    const reveal = node => {
      const total = Number(node.dataset.count);
      if (!Number.isFinite(total)) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = String(total); return; }
      const start = performance.now();
      let id = 0;
      const tick = now => {
        frames.delete(id);
        const progress = Math.min(1, (now - start) / 800);
        node.textContent = String(Math.round(total * (1 - (1 - progress) ** 3)));
        if (progress < 1) { id = requestAnimationFrame(tick); frames.add(id); }
      };
      id = requestAnimationFrame(tick);
      frames.add(id);
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
    renderTiles("#architectureVideos", architecture);
    renderTiles("#homeVideoRail", architecture);
    renderTiles("#mediaRail", campaigns);
    renderTiles("#presentationStack", presentations);
    initComparisons();
    if (document.querySelector(".z7-home")) initServicePreview();
    if (document.querySelector(".z7-home")) initHero();
    initMedia();
    initCounters();
    window.addEventListener("pagehide", () => {
      abort.abort();
      observers.forEach(observer => observer.disconnect());
      frames.forEach(cancelAnimationFrame);
      $$(".z7-home video").forEach(video => video.pause());
    }, { once: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
