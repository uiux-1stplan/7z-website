(() => {
  "use strict";

  document.body.classList.add("is-loading");

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const navigationEntry = performance.getEntriesByType?.("navigation")?.[0];
  const shouldStartAtTop = navigationEntry?.type === "reload";
  const useStaticBackground = document.body.dataset.staticBackground === "true";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  if (shouldStartAtTop && location.hash) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  if (shouldStartAtTop) {
    window.scrollTo(0, 0);
  }

  let assets = {
    partners: [
      "media/partnetslogos/1.png",
      "media/partnetslogos/2.png",
      "media/partnetslogos/3.png",
      "media/partnetslogos/4.png",
      "media/partnetslogos/5.png",
      "media/partnetslogos/6.jpeg",
      "media/partnetslogos/7.jpg",
      "media/partnetslogos/8.jpg",
      "media/partnetslogos/9.jpg",
      "media/partnetslogos/10.jpg",
      "media/partnetslogos/11.jpg",
      "media/partnetslogos/12.jpg",
      "media/partnetslogos/13.jpg",
      "media/partnetslogos/14.png",
      "media/partnetslogos/15.png",
      "media/partnetslogos/16.jpg",
      "media/partnetslogos/17.jpg",
      "media/partnetslogos/18.jpg",
      "media/partnetslogos/19.jpg",
      "media/partnetslogos/20.jpg",
      "media/partnetslogos/21.png",
      "media/partnetslogos/22.jpg"
    ],
    comparisons: [
      ["media/arch_projects/bef_af/1.1.jpeg", "media/arch_projects/bef_af/1.2.png"],
      ["media/arch_projects/bef_af/2.1.png", "media/arch_projects/bef_af/2.2.png"],
      ["media/arch_projects/bef_af/3.1.jpeg", "media/arch_projects/bef_af/3.2.jpeg"]
    ],
    architectureVideos: [
      {
        src: "media/arch_projects/16-9V/1.mp4",
        title: "Vertical Interior Film",
        layout: "is-tall"
      },
      {
        src: "media/arch_projects/9-16H/1.mp4",
        title: "Architectural Atmosphere",
        layout: "is-wide"
      },
      {
        src: "media/arch_projects/9-16H/2.mp4",
        title: "Residence Walkthrough",
        layout: "is-wide"
      },
      {
        src: "media/arch_projects/9-16H/3.mp4",
        title: "Spatial Transformation",
        layout: "is-wide"
      },
      {
        src: "media/arch_projects/9-16H/4.mp4",
        title: "Luxury Detail Study",
        layout: "is-wide"
      }
    ],
    mediaProjects: Array.from({ length: 12 }, (_, index) => ({
      src: `media/media_projects/Media (${index + 1}).mp4`,
      title: `Campaign Film ${String(index + 1).padStart(2, "0")}`
    })),
    presentations: [
      { src: "media/prop/1.mp4", title: "Interactive Presentation 01" },
      { src: "media/prop/2.mp4", title: "Interactive Presentation 02" }
    ]
  };

  const whatsappNumber = "962797020089";
  const whatsappRequests = [
    {
      id: "intro",
      label: "Start a Project",
      message: "مرحباً، أريد بدء مشروع جديد مع 7Z Magic. أحتاج تفاصيل أكثر عن الخدمات والخطوات."
    },
    {
      id: "universe",
      label: "7Z Magic Universe",
      message: "مرحباً، أريد استشارة حول بناء تجربة رقمية متكاملة مع 7Z Magic."
    },
    {
      id: "architecture",
      label: "Architectural Design",
      message: "مرحباً، أريد طلب خدمة التصميم المعماري من 7Z Magic. أريد معرفة التفاصيل والتكلفة."
    },
    {
      id: "media",
      label: "Marketing Media Production",
      message: "مرحباً، أريد طلب خدمة إنتاج محتوى تسويقي وفيديوهات حملات من 7Z Magic."
    },
    {
      id: "websites",
      label: "Website Design",
      message: "مرحباً، أريد طلب خدمة تصميم موقع إلكتروني احترافي من 7Z Magic."
    },
    {
      id: "identity",
      label: "Brand Identity",
      message: "مرحباً، أريد طلب خدمة بناء هوية بصرية وبراند من 7Z Magic."
    },
    {
      id: "advertising-materials",
      label: "Advertising Materials",
      message: "مرحباً، أريد طلب خدمة تصميم مواد إعلانية وحملات من 7Z Magic."
    },
    {
      id: "product-design",
      label: "Product Design",
      message: "مرحباً، أريد طلب خدمة تصميم منتج أو واجهة رقمية من 7Z Magic."
    },
    {
      id: "advertising-7sanz",
      label: "Advertising on 7SANZ",
      message: "مرحباً، أريد الإعلان على 7SANZ ومعرفة تفاصيل الوصول والباكجات."
    },
    {
      id: "presentations",
      label: "Interactive Presentations",
      message: "مرحباً، أريد طلب خدمة تصميم عرض تقديمي تفاعلي واحترافي من 7Z Magic."
    },
    {
      id: "film",
      label: "Film Production",
      message: "مرحباً، أريد طلب خدمة إنتاج فيلم تجاري أو براند فيلم من 7Z Magic."
    },
    {
      id: "ai-masterclass",
      label: "AI Masterclass",
      message: "مرحباً، أريد الاستفسار عن AI Masterclass والتسجيل أو تدريب الفريق."
    },
    {
      id: "partners",
      label: "Partners",
      message: "مرحباً، أريد الاستفسار عن الشراكات أو التعاون مع 7Z Magic."
    }
  ];

  const hasGsap = Boolean(window.gsap && window.ScrollTrigger);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.ticker.lagSmoothing(500, 33);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  let lenis = null;

  function forceStartAtTop() {
    if (!shouldStartAtTop) return;

    if (location.hash) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }

    const reset = () => {
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true, force: true });
    };

    reset();
    requestAnimationFrame(reset);
    [80, 300, 900, 1800, 2800].forEach((delay) => window.setTimeout(reset, delay));
  }

  function initLenis() {
    if (!window.Lenis || prefersReducedMotion || window.matchMedia("(max-width: 899px), (hover: none), (pointer: coarse)").matches) return;

    lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 0.88,
      smoothWheel: true,
      syncTouch: false
    });

    lenis.on("scroll", () => {
      if (window.ScrollTrigger) ScrollTrigger.update();
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);
  }

  function initVirtualWall() {
    if (prefersReducedMotion || useStaticBackground) return;

    const root = document.documentElement;
    const state = {
      target: window.scrollY || 0,
      current: window.scrollY || 0
    };

    const update = () => {
      state.current += (state.target - state.current) * 0.085;
      const scrollY = state.current;
      root.style.setProperty("--wall-shift", `${Math.round(scrollY * -0.13)}px`);
      root.style.setProperty("--wall-shift-slow", `${Math.round(scrollY * -0.07)}px`);
      root.style.setProperty("--wall-drift", `${Math.round(scrollY * 0.045)}px`);
      root.style.setProperty("--wall-drift-reverse", `${Math.round(scrollY * -0.035)}px`);
      root.style.setProperty("--wall-transform", `${Math.round(scrollY * -0.025)}px`);
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", () => {
      state.target = window.scrollY || 0;
    }, { passive: true });
    window.addEventListener("resize", () => {
      state.target = window.scrollY || 0;
    });
    requestAnimationFrame(update);
  }

  function initAtmosphere() {
    const canvas = $("#atmosphere");
    if (!canvas || prefersReducedMotion || useStaticBackground) return;

    const context = canvas.getContext("2d", { alpha: true });
    const palette = [
      "116, 230, 255",
      "157, 136, 255",
      "130, 255, 193",
      "216, 182, 106",
      "255, 111, 127"
    ];
    const state = {
      width: 0,
      height: 0,
      nodes: [],
      scroll: 0,
      scrollTarget: 0,
      pointer: { x: -1000, y: -1000 }
    };

    const wrap = (value, max) => ((value % max) + max) % max;

    const buildNodes = () => {
      const count = Math.min(58, Math.max(30, Math.round(window.innerWidth / 30)));
      state.nodes = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        vx: (Math.random() - 0.5) * 0.045,
        vy: (Math.random() - 0.5) * 0.035,
        size: Math.random() * 1.45 + 0.65,
        layer: Math.random() * 0.75 + 0.45,
        pulse: Math.random() * Math.PI * 2,
        hue: palette[index % palette.length]
      }));
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.floor(state.width * ratio);
      canvas.height = Math.floor(state.height * ratio);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildNodes();
    };

    const draw = (time = 0) => {
      state.scrollTarget = window.scrollY || 0;
      state.scroll += (state.scrollTarget - state.scroll) * 0.055;
      context.clearRect(0, 0, state.width, state.height);
      context.globalCompositeOperation = "lighter";

      const projected = state.nodes.map((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -80) node.x = state.width + 80;
        if (node.x > state.width + 80) node.x = -80;
        if (node.y < -80) node.y = state.height + 80;
        if (node.y > state.height + 80) node.y = -80;

        const driftY = state.scroll * -0.028 * node.layer;
        const driftX = Math.sin((time * 0.00013) + node.pulse) * 18 * node.layer;
        return {
          node,
          x: wrap(node.x + driftX, state.width + 120) - 60,
          y: wrap(node.y + driftY, state.height + 120) - 60
        };
      });

      for (let i = 0; i < projected.length; i += 1) {
        const a = projected[i];

        for (let j = i + 1; j < projected.length; j += 1) {
          const b = projected[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          const maxDistance = 142;

          if (distance > maxDistance) continue;

          const opacity = (1 - distance / maxDistance) * 0.13;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.lineWidth = 0.7;
          context.strokeStyle = `rgba(${a.node.hue}, ${opacity})`;
          context.stroke();
        }
      }

      projected.forEach(({ node, x, y }) => {
        const pointerDistance = Math.hypot(x - state.pointer.x, y - state.pointer.y);
        const pulse = 0.55 + Math.sin(time * 0.0012 + node.pulse) * 0.24;
        const glow = pointerDistance < 150 ? 0.62 : 0.24;
        const radius = node.size * pulse;

        context.beginPath();
        context.arc(x, y, radius + 2.2, 0, Math.PI * 2);
        context.fillStyle = `rgba(${node.hue}, ${glow * 0.08})`;
        context.fill();

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${node.hue}, ${glow})`;
        context.fill();
      });

      context.globalCompositeOperation = "source-over";
      requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", () => {
      state.scrollTarget = window.scrollY || 0;
    }, { passive: true });
    window.addEventListener("pointermove", (event) => {
      state.pointer.x = event.clientX;
      state.pointer.y = event.clientY;
    });

    resize();
    draw();
  }

  async function loadManagedContent() {
    try {
      const response = await fetch("/api/site-content", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      if (!data.media) return;

      ["architectureVideos", "mediaProjects", "presentations"].forEach((section) => {
        if (Array.isArray(data.media[section])) {
          assets = { ...assets, [section]: data.media[section] };
        }
      });
    } catch (error) {
      // The static site still works without the editable content API.
    }
  }

  function getWhatsAppUrl(message) {
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function initSectionWhatsappButtons() {
    whatsappRequests.forEach((request) => {
      const section = document.getElementById(request.id);
      if (!section || $(".section-whatsapp", section)) return;

      const target =
        $(
          ".intro__content, .manifest__copy, .chapter__intro > div, .pin-copy, .web-copy, .soon-system, .blueprint-copy, .product-shell, .reach-copy, .film-copy, .ai-heading, .studio-suite__intro, .studio-card, .partners",
          section
        ) || section;

      const link = document.createElement("a");
      link.className = "section-whatsapp magnetic";
      link.href = getWhatsAppUrl(request.message);
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", `Request ${request.label} on WhatsApp`);
      link.innerHTML = "<span>Order via WhatsApp</span><i aria-hidden=\"true\"></i>";
      target.append(link);
    });
  }

  function postAnalytics(endpoint, payload) {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {});
  }

  function initAnalytics() {
    postAnalytics("/api/analytics/visit", {
      path: location.pathname,
      referrer: document.referrer || "Direct"
    });

    const seen = new Set();
    const sections = $$("main > section[id], footer[id]");
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || seen.has(entry.target.id)) return;
          seen.add(entry.target.id);
          postAnalytics("/api/analytics/section", { section: entry.target.id });
        });
      },
      { threshold: 0.42 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function createLogoTile(src, index) {
    const tile = document.createElement("div");
    tile.className = "logo-tile magnetic";

    const image = document.createElement("img");
    image.src = src;
    image.alt = `7Z Magic partner ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";

    tile.append(image);
    return tile;
  }

  function renderLogos() {
    const stack = $("#logoMarquee");
    if (!stack) return;
    stack.innerHTML = "";

    const makeTrack = (sources) => {
      const track = document.createElement("div");
      track.className = "marquee__track";
      sources.forEach((src, index) => track.append(createLogoTile(src, index)));
      return track;
    };

    const makeRow = (sources, direction, duration) => {
      const row = document.createElement("div");
      row.className = `marquee marquee--${direction}`;
      row.append(makeTrack(sources), makeTrack(sources));
      stack.append(row);
      return { row, direction, duration };
    };

    const rows = [
      makeRow(assets.partners, "primary", 44),
      makeRow([...assets.partners].reverse(), "reverse", 52)
    ];

    if (hasGsap && !prefersReducedMotion) {
      requestAnimationFrame(() => {
        rows.forEach(({ row, direction, duration }) => {
          const firstTrack = $(".marquee__track", row);
          const distance = firstTrack?.scrollWidth || row.scrollWidth / 2;
          if (!distance) return;

          gsap.set(row, { x: direction === "reverse" ? -distance : 0 });
          gsap.to(row, {
            x: direction === "reverse" ? 0 : -distance,
            duration,
            ease: "none",
            repeat: -1
          });
        });
      });
    }
  }

  function createVideoElement(src, poster = "") {
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("playsinline", "");
    if (poster) video.poster = poster;
    return video;
  }

  function createMediaTile(item) {
    const tile = document.createElement("article");
    tile.className = `media-tile magnetic ${item.layout || ""}`.trim();
    tile.dataset.mediaId = item.id || "";

    const isVideo = /\.(mp4|webm|mov)(\?|#|$)/i.test(item.src || "");
    const media = isVideo ? createVideoElement(item.src, item.poster || "") : document.createElement("img");

    if (!isVideo) {
      media.src = item.src;
      media.alt = item.title || "7Z Magic media";
      media.loading = "lazy";
      media.decoding = "async";
    }

    const title = document.createElement("span");
    title.textContent = item.title;

    tile.append(media);

    if (isVideo) {
      const play = document.createElement("button");
      play.type = "button";
      play.className = "play-badge magnetic";
      play.dataset.inlineVideo = "";
      play.setAttribute("aria-label", `Play ${item.title}`);
      play.textContent = "Play";
      tile.append(play);
    }

    tile.append(title);
    return tile;
  }

  function renderComparisons() {
    const stage = $("#comparisonStage");
    if (!stage) return;

    assets.comparisons.forEach(([before, after], index) => {
      const compare = document.createElement("article");
      compare.className = "compare";
      compare.style.setProperty("--split", "50%");

      const beforeImage = document.createElement("img");
      beforeImage.src = before;
      beforeImage.alt = `Architecture project ${index + 1} before`;
      beforeImage.loading = index === 0 ? "eager" : "lazy";
      beforeImage.decoding = "async";

      const afterImage = document.createElement("img");
      afterImage.className = "compare__after";
      afterImage.src = after;
      afterImage.alt = `Architecture project ${index + 1} after`;
      afterImage.loading = index === 0 ? "eager" : "lazy";
      afterImage.decoding = "async";

      const divider = document.createElement("span");
      divider.className = "compare__divider";
      divider.setAttribute("aria-hidden", "true");

      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "compare__handle magnetic";
      handle.setAttribute("aria-label", `Compare architecture transformation ${index + 1}`);
      handle.setAttribute("aria-valuemin", "0");
      handle.setAttribute("aria-valuemax", "100");
      handle.setAttribute("aria-valuenow", "50");
      handle.setAttribute("role", "slider");

      const labels = document.createElement("div");
      labels.className = "compare__labels";
      labels.innerHTML = "<span>Before</span><span>After</span>";

      compare.append(beforeImage, afterImage, divider, handle, labels);
      stage.append(compare);
    });
  }

  function renderMedia() {
    const architecture = $("#architectureVideos");
    const mediaRail = $("#mediaRail");
    const presentations = $("#presentationStack");

    if (architecture) {
      architecture.innerHTML = "";
      assets.architectureVideos.forEach((item) => {
        architecture.append(createMediaTile(item));
      });
    }

    if (mediaRail) {
      mediaRail.innerHTML = "";
      assets.mediaProjects.forEach((item) => {
        mediaRail.append(createMediaTile(item));
      });
    }

    if (presentations) {
      presentations.innerHTML = "";
      assets.presentations.forEach((item) => {
        presentations.append(createMediaTile(item));
      });
    }
  }

  function initComparisonSliders() {
    $$(".compare").forEach((compare) => {
      const handle = $(".compare__handle", compare);
      let active = false;
      let currentValue = 50;

      const setSplit = (clientX) => {
        const rect = compare.getBoundingClientRect();
        const raw = ((clientX - rect.left) / rect.width) * 100;
        currentValue = Math.max(8, Math.min(92, raw));
        compare.style.setProperty("--split", `${currentValue}%`);
        handle.setAttribute("aria-valuenow", String(Math.round(currentValue)));
      };

      const onPointerMove = (event) => {
        if (!active) return;
        setSplit(event.clientX);
      };

      const endDrag = () => {
        active = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", endDrag);
      };

      handle.addEventListener("pointerdown", (event) => {
        active = true;
        handle.setPointerCapture?.(event.pointerId);
        setSplit(event.clientX);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", endDrag);
      });

      compare.addEventListener("pointerdown", (event) => {
        if (event.target === handle) return;
        active = true;
        setSplit(event.clientX);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", endDrag);
      });

      handle.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") currentValue = 8;
        if (event.key === "End") currentValue = 92;
        if (event.key === "ArrowLeft") currentValue = Math.max(8, currentValue - 4);
        if (event.key === "ArrowRight") currentValue = Math.min(92, currentValue + 4);
        compare.style.setProperty("--split", `${currentValue}%`);
        handle.setAttribute("aria-valuenow", String(Math.round(currentValue)));
      });
    });
  }

  function initVideos() {
    $$("main video:not(#introVideo)").forEach((video) => {
      video.pause();
      video.removeAttribute("autoplay");
      video.loop = false;
      video.addEventListener("ended", () => resetInlineVideo(video));
    });
  }

  function getInlineRoot(element) {
    return element.closest(".media-tile, .manifest__media, .browser-frame, .phone-frame, .film-player");
  }

  function setInlineButtonState(root, isPlaying) {
    const button = $("[data-inline-video]", root);
    if (!button) return;

    const text = button.classList.contains("film-play") ? (isPlaying ? "Pause Film" : "Play Film") : (isPlaying ? "Pause" : "Play");
    button.setAttribute("aria-label", text);

    if (button.classList.contains("play-badge")) {
      button.textContent = text;
      return;
    }

    const label = $("span", button);
    if (label) label.textContent = text;
    else button.textContent = text;
  }

  function resetInlineVideo(video) {
    const root = getInlineRoot(video);
    if (!root) return;
    root.classList.remove("is-playing");
    video.controls = false;
    video.muted = true;
    setInlineButtonState(root, false);
  }

  function pauseOtherInlineVideos(currentVideo) {
    $$("main section:not(.intro) video").forEach((video) => {
      if (video === currentVideo || video.paused) return;
      video.pause();
      resetInlineVideo(video);
    });
  }

  function initInlineVideos() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-inline-video]");
      if (!trigger) return;

      event.preventDefault();
      const root = getInlineRoot(trigger);
      const video = root ? $("video", root) : null;
      if (!video) return;

      if (!video.paused) {
        video.pause();
        resetInlineVideo(video);
        return;
      }

      pauseOtherInlineVideos(video);
      video.controls = true;
      video.muted = false;
      video.play()
        .then(() => {
          root.classList.add("is-playing");
          setInlineButtonState(root, true);
        })
        .catch(() => {
          video.muted = true;
          video.play().then(() => {
            root.classList.add("is-playing");
            setInlineButtonState(root, true);
          }).catch(() => {});
        });
    });
  }

  function initMagneticElements() {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    $$(".magnetic").forEach((element) => {
      // 7Z static media exclusion v13:
      // Keep video surfaces and partner logos fixed; magnetic motion remains on controls/buttons only.
      const containsDirectVideo = Array.from(element.children).some(
        (child) => child.tagName === "VIDEO"
      );
      const isStaticMediaSurface = element.matches(
        ".logo-tile, .media-tile, .film-player, .manifest__media, .web-device, .browser-frame, .phone-frame"
      );

      if (containsDirectVideo || isStaticMediaSurface) {
        element.classList.remove("magnetic");
        element.dataset.staticMedia = "true";
        element.style.removeProperty("transform");
        return;
      }
      if (element.getAttribute("aria-disabled") === "true") return;

      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        element.style.transform = `translate3d(${x * 0.16}px, ${y * 0.16}px, 0)`;
      });

      element.addEventListener("pointerleave", () => {
        element.style.transform = "";
      });
    });
  }

  function initAnchorLinks() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") {
          event.preventDefault();
          return;
        }

        let target = null;
        try {
          target = $(href);
        } catch (error) {
          return;
        }

        if (!target) return;
        event.preventDefault();
        if (lenis) {
          const header = $(".site-header");
          const offset = header ? -Math.ceil(header.getBoundingClientRect().height + 18) : -88;
          lenis.scrollTo(target, { offset });
        } else {
          target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
      });
    });
  }

  function initServicesMenu() {
    const menu = $(".services-menu");
    if (!menu) return;
    const trigger = $(".services-trigger", menu);
    const panel = $(".services-panel", menu);
    if (!trigger || !panel) return;
    const canUseHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const setMenu = (isOpen) => {
      menu.classList.toggle("is-open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
      panel.setAttribute("aria-hidden", String(!isOpen));
    };

    const closeMenu = () => setMenu(false);

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isMobileNav = window.matchMedia("(max-width: 760px)").matches;
      const isOpen = isMobileNav ? true : !menu.classList.contains("is-open");
      setMenu(isOpen);
    });

    $$(".services-panel a", menu).forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    if (canUseHover) {
      menu.addEventListener("mouseenter", () => setMenu(true));
      menu.addEventListener("mouseleave", () => {
        if (!menu.contains(document.activeElement)) closeMenu();
      });
    }

    menu.addEventListener("focusin", (event) => {
      if (!canUseHover && event.target === trigger) return;
      setMenu(true);
    });
    menu.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!canUseHover) return;
        if (!menu.contains(document.activeElement)) closeMenu();
      }, 0);
    });

    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function initActiveNavigation() {
    const links = $$(".main-nav a[href^='#'], .services-panel a[href^='#'], .footer__links a[href^='#']");
    if (!links.length) return;

    const servicesTrigger = $(".services-trigger");
    const serviceIds = new Set($$(".services-panel a[href^='#']").map((link) => link.getAttribute("href")?.slice(1)).filter(Boolean));
    const sections = Array.from(
      new Set(links.map((link) => link.getAttribute("href")?.slice(1)).filter(Boolean))
    )
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const setActive = (activeId) => {
      links.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${activeId}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });

      servicesTrigger?.classList.toggle("is-active", serviceIds.has(activeId));
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      const anchorLine = window.innerHeight * 0.42;
      let activeId = sections[0]?.id;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= anchorLine && rect.bottom >= window.innerHeight * 0.16) {
          activeId = section.id;
        }
      });

      if (activeId) setActive(activeId);
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();
  }

  function animateCounters() {
    $$("[data-count]").forEach((element) => {
      const end = Number(element.dataset.count);
      let played = false;

      const play = () => {
        if (played) return;
        played = true;

        if (!hasGsap || prefersReducedMotion) {
          element.textContent = end.toLocaleString("en-US");
          return;
        }

        const state = { value: 0 };
        gsap.to(state, {
          value: end,
          duration: end > 1000 ? 2.4 : 1.5,
          ease: "power3.out",
          onUpdate: () => {
            element.textContent = Math.round(state.value).toLocaleString("en-US");
          }
        });
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            play();
            observer.disconnect();
          });
        },
        { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
      );

      observer.observe(element);
    });
  }

  function initScrollAnimations() {
    if (!hasGsap || prefersReducedMotion) {
      $$(".reveal").forEach((element) => {
        element.style.opacity = 1;
        element.style.transform = "none";
      });
      return;
    }

    const intro = $("#intro");
    const isCompactMotion = window.matchMedia("(max-width: 860px)").matches;

    if (!isCompactMotion) {
      gsap.to(".site-header", {
        background: "rgba(3, 4, 7, 0.9)",
        backdropFilter: "blur(18px)",
        boxShadow: "0 18px 58px rgba(0, 0, 0, 0.42)",
        scrollTrigger: {
          trigger: document.body,
          start: "180 top",
          end: "420 top",
          scrub: true
        }
      });
    }

    gsap.to(".intro video", {
      scale: 1.14,
      filter: "saturate(1.08) contrast(1.12) brightness(1.12)",
      ease: "none",
      scrollTrigger: {
        trigger: intro,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    gsap.to(".intro__content", {
      yPercent: -24,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: intro,
        start: "34% top",
        end: "82% top",
        scrub: true
      }
    });

    const sectionSelectors = [
      ".manifest__copy",
      ".chapter__intro",
      ".pin-copy",
      ".web-copy",
      ".soon-system",
      ".blueprint-copy",
      ".product-shell",
      ".reach-copy",
      ".film-copy",
      ".ai-heading",
      ".partners .section-kicker",
      ".service-loop__intro",
      ".studio-suite__intro"
    ];

    gsap.utils.toArray(sectionSelectors.join(", ")).forEach((block) => {
      const animatedItems = block.matches(".section-kicker")
        ? [block]
        : Array.from(block.children).filter((child) => !child.classList.contains("section-whatsapp"));

      if (!animatedItems.length) return;

      gsap.fromTo(
        animatedItems,
        {
          autoAlpha: 0,
          y: isCompactMotion ? 18 : 30,
          filter: isCompactMotion ? "blur(6px)" : "blur(10px)"
        },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: isCompactMotion ? 0.58 : 0.78,
          ease: "power3.out",
          stagger: isCompactMotion ? 0.045 : 0.075,
          immediateRender: false,
          overwrite: "auto",
          scrollTrigger: {
            trigger: block,
            start: isCompactMotion ? "top 88%" : "top 80%",
            end: isCompactMotion ? "bottom 8%" : "bottom 18%",
            toggleActions: "play reverse play reverse"
          }
        }
      );
    });

    gsap.utils.toArray(".manifest__media video").forEach((video) => {
      gsap.to(video, {
        yPercent: -10,
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".manifest",
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });

    gsap.utils.toArray(".compare").forEach((compare, index) => {
      gsap.from(compare, {
        opacity: 0,
        y: 90,
        rotate: index % 2 ? -1.8 : 1.8,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: compare,
          start: "top 82%"
        }
      });
    });

    gsap.utils.toArray(".media-tile").forEach((tile) => {
      gsap.from(tile, {
        opacity: 0,
        y: 44,
        scale: 0.96,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: tile,
          start: "top 88%"
        }
      });
    });

    const rail = $("#mediaRail");
    if (rail && window.innerWidth > 1180) {
      const setupHorizontal = () => {
        const distance = rail.scrollWidth - window.innerWidth * 0.58;
        if (distance <= 0) return;
        gsap.to(rail, {
          x: -distance,
          ease: "none",
          scrollTrigger: {
            trigger: "#media",
            start: "top top",
            end: () => `+=${distance}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true
          }
        });
      };

      requestAnimationFrame(setupHorizontal);
    }

    gsap.to(".browser-frame", {
      rotateY: 0,
      rotateX: 0,
      scale: 1.02,
      ease: "none",
      scrollTrigger: {
        trigger: ".chapter--web",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    gsap.from(".reach-metric", {
      clipPath: "inset(18% 18% 18% 18%)",
      opacity: 0,
      scale: 0.92,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".reach-metric",
        start: "top 76%"
      }
    });

    gsap.utils.toArray(".timeline article").forEach((item, index) => {
      gsap.from(item, {
        opacity: 0,
        y: index % 2 ? 40 : -40,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: item,
          start: "top 86%"
        }
      });
    });
  }

  function freezeHeroVideo(video) {
    const intro = video.closest(".intro");
    video.pause();

    if (Number.isFinite(video.duration) && video.duration > 0) {
      try {
        video.currentTime = Math.max(0, video.duration - 0.04);
      } catch (error) {
        // Some browsers defer seeking until metadata is fully ready.
      }
    }

    intro?.classList.add("is-video-ended");
  }

  function initHeroVideo() {
    const introVideo = $("#introVideo");
    if (!introVideo) return;

    const heroTitle = $("[data-hero-title]");
    const intro = introVideo.closest(".intro");
    const heroTitles = {
      initial: "Creating Digital Experiences Beyond Imagination",
      mid: "Where Vision Becomes Digital Reality",
      final: "Specializing in AI-Driven Visual Production Since 2022"
    };
    let titleStage = "";
    let titleTimer = 0;

    const setHeroTitle = (stage, immediate = false) => {
      if (!heroTitle || !heroTitles[stage] || (stage === titleStage && !immediate)) return;
      titleStage = stage;
      window.clearTimeout(titleTimer);

      const commit = () => {
        heroTitle.dataset.titleStage = stage;
        heroTitle.textContent = heroTitles[stage];
        heroTitle.classList.remove("is-swapping");
      };

      if (immediate) {
        commit();
        return;
      }

      heroTitle.classList.add("is-swapping");
      titleTimer = window.setTimeout(commit, 180);
    };

    const updateTitleByTime = () => {
      if (titleStage === "final" || introVideo.ended || intro?.classList.contains("is-video-ended")) return;
      if (!Number.isFinite(introVideo.duration) || introVideo.duration <= 0) return;

      setHeroTitle(introVideo.currentTime >= introVideo.duration * 0.5 ? "mid" : "initial");
    };

    introVideo.loop = false;
    introVideo.muted = true;
    introVideo.controls = false;
    introVideo.removeAttribute("loop");
    introVideo.removeAttribute("controls");
    setHeroTitle("initial", true);

    introVideo.addEventListener("play", () => {
      if (introVideo.currentTime < 0.5) {
        intro?.classList.remove("is-video-ended");
        setHeroTitle("initial", true);
      }
    });
    introVideo.addEventListener("loadedmetadata", updateTitleByTime);
    introVideo.addEventListener("timeupdate", updateTitleByTime);
    introVideo.addEventListener("ended", () => {
      setHeroTitle("final", true);
      freezeHeroVideo(introVideo);
    });
  }

  function initLoader() {
    const loader = $("#loader");
    if (!loader) return;

    const loaderVideo = $(".loader__video", loader);
    const loaderBgVideo = $(".loader__video-bg", loader);
    const phrasesLayer = $(".loader__phrases", loader);
    const soundButton = $(".loader__sound", loader);
    const introVideo = $("#introVideo");
    const progressBar = $("#loaderProgress");
    const count = $("#loaderCount");
    if (!progressBar || !count) return;

    const useFastDesktopLoader = true;
    const state = { progress: 0 };
    let completed = false;
    let progressFrame = 0;

    const setProgress = (value) => {
      state.progress = Math.max(0, Math.min(100, value));
      progressBar.style.width = `${state.progress}%`;
      count.textContent = String(Math.round(state.progress));
    };

    if (!useFastDesktopLoader) {
      [loaderVideo, loaderBgVideo].forEach((video) => {
        if (!video?.dataset.src || video.getAttribute("src")) return;
        video.src = video.dataset.src;
        video.load();
      });
    }

    const markVideoReady = () => loader.classList.add("is-video-ready");

    const renderLoaderPhrases = () => {
      if (!phrasesLayer || prefersReducedMotion) return;

      const phrases = [
        "AI visual production",
        "Cinematic brand systems",
        "Architecture in motion",
        "Digital reality loading",
        "Creative direction",
        "Premium launch assets",
        "Spatial storytelling",
        "Beyond imagination"
      ];
      const placements = [
        ["17%", "24%", "0.2s", "6.8s"],
        ["78%", "18%", "1.15s", "7.4s"],
        ["26%", "72%", "2.05s", "7.1s"],
        ["73%", "66%", "3.1s", "6.6s"],
        ["49%", "16%", "4.05s", "7.8s"],
        ["15%", "55%", "4.95s", "7.2s"],
        ["86%", "48%", "5.75s", "7.5s"],
        ["43%", "83%", "6.55s", "6.9s"]
      ];

      phrasesLayer.innerHTML = "";
      phrases.forEach((phrase, index) => {
        const item = document.createElement("span");
        item.className = "loader__phrase";
        item.textContent = phrase;
        const [x, y, delay, duration] = placements[index];
        item.style.setProperty("--x", x);
        item.style.setProperty("--y", y);
        item.style.setProperty("--delay", delay);
        item.style.setProperty("--duration", duration);
        phrasesLayer.append(item);
      });
    };

    const syncBackgroundVideo = () => {
      if (!loaderBgVideo || !loaderVideo) return;

      loaderBgVideo.muted = true;
      loaderBgVideo.loop = false;
      loaderBgVideo.controls = false;
      loaderBgVideo.removeAttribute("loop");
      loaderBgVideo.removeAttribute("controls");

      if (Number.isFinite(loaderVideo.currentTime)) {
        const drift = Math.abs((loaderBgVideo.currentTime || 0) - loaderVideo.currentTime);
        if (drift > 0.28) {
          try {
            loaderBgVideo.currentTime = loaderVideo.currentTime;
          } catch (error) {
            // Seeking can be delayed until the browser has enough video metadata.
          }
        }
      }

      if (loaderBgVideo.paused) {
        loaderBgVideo.play().catch(() => {});
      }
    };

    const revealPage = () => {
      if (hasGsap) {
        gsap.to(".reveal", {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out"
        });
        return;
      }

      $$(".reveal").forEach((element) => {
        element.style.opacity = 1;
        element.style.transform = "none";
      });
    };

    const updateProgressFromVideo = () => {
      if (completed) return;

      if (loaderVideo && Number.isFinite(loaderVideo.duration) && loaderVideo.duration > 0) {
        setProgress((loaderVideo.currentTime / loaderVideo.duration) * 100);
        syncBackgroundVideo();
      } else {
        setProgress(Math.min(96, state.progress + 0.08));
      }

      progressFrame = window.requestAnimationFrame(updateProgressFromVideo);
    };

    const completeLoader = () => {
      if (completed) return;
      completed = true;
      window.cancelAnimationFrame(progressFrame);
      setProgress(100);
      forceStartAtTop();

      if (loaderVideo) {
        loaderVideo.pause();
      }

      if (loaderBgVideo) {
        loaderBgVideo.pause();
      }

      if (introVideo) {
        introVideo.loop = false;
        introVideo.muted = true;
        try {
          introVideo.currentTime = 0;
        } catch (error) {
          // Browsers can defer seeking until metadata is available.
        }
        introVideo.play().catch(() => {});
      }

      loader.style.transition = "opacity 0.55s ease, visibility 0.55s ease";
      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
      loader.style.pointerEvents = "none";

      window.setTimeout(() => {
        loader.style.display = "none";
        document.body.classList.remove("is-loading");
        revealPage();
      }, 620);
    };

    if (useFastDesktopLoader) {
      loader.classList.add("loader--desktop-fast", "is-video-ready");
      soundButton.hidden = true;

      [loaderVideo, loaderBgVideo].forEach((video) => {
        if (!video) return;
        video.pause();
        video.removeAttribute("src");
        video.load();
      });

      const startedAt = performance.now();
      const duration = 980;
      const tickFastLoader = (now) => {
        if (completed) return;
        const progress = ((now - startedAt) / duration) * 100;
        setProgress(progress);

        if (progress >= 100) {
          completeLoader();
          return;
        }

        progressFrame = window.requestAnimationFrame(tickFastLoader);
      };

      progressFrame = window.requestAnimationFrame(tickFastLoader);
      return;
    }

    if (!loaderVideo) {
      completeLoader();
      return;
    }

    const showSoundButton = () => {
      if (!soundButton || completed) return;
      soundButton.hidden = false;
      loader.classList.add("needs-sound");
    };

    const hideSoundButton = () => {
      if (soundButton) soundButton.hidden = true;
      loader.classList.remove("needs-sound");
    };

    const playLoaderWithSound = () => {
      if (completed) return;

      loaderVideo.controls = false;
      loaderVideo.loop = false;
      loaderVideo.muted = false;
      loaderVideo.volume = 1;
      loaderVideo.removeAttribute("muted");
      loaderVideo.removeAttribute("loop");
      loaderVideo.removeAttribute("controls");
      syncBackgroundVideo();

      const playAttempt = loaderVideo.play();
      if (!playAttempt || typeof playAttempt.then !== "function") {
        hideSoundButton();
        return;
      }

      playAttempt.then(hideSoundButton).catch(showSoundButton);
    };

    soundButton?.addEventListener("click", () => {
      hideSoundButton();
      playLoaderWithSound();
    });

    if (loaderVideo.readyState >= 2) markVideoReady();
    if (loaderBgVideo?.readyState >= 2) markVideoReady();
    loaderVideo.addEventListener("loadeddata", markVideoReady, { once: true });
    loaderVideo.addEventListener("canplay", markVideoReady, { once: true });
    loaderBgVideo?.addEventListener("loadeddata", markVideoReady, { once: true });
    loaderBgVideo?.addEventListener("canplay", markVideoReady, { once: true });
    loaderVideo.addEventListener("play", syncBackgroundVideo);
    loaderVideo.addEventListener("ended", completeLoader, { once: true });
    loaderVideo.addEventListener("error", () => window.setTimeout(completeLoader, 1400), { once: true });

    renderLoaderPhrases();
    updateProgressFromVideo();
    window.setTimeout(markVideoReady, 650);
    playLoaderWithSound();
  }

  function fixStaticMarkup() {
    const footerSmall = $(".footer small");
    if (footerSmall) footerSmall.innerHTML = "Copyright &copy; 2026 7Z Magic. All rights reserved.";
  }

  function refreshAfterMedia() {
    const refresh = () => window.ScrollTrigger?.refresh();
    $$("img, video").forEach((media) => {
      if (media.complete || media.readyState >= 1) return;
      media.addEventListener("load", refresh, { once: true });
      media.addEventListener("loadedmetadata", refresh, { once: true });
    });
    window.setTimeout(refresh, 900);
    window.setTimeout(refresh, 2400);
  }

  async function boot() {
    fixStaticMarkup();
    initLenis();
    forceStartAtTop();
    initVirtualWall();
    initAtmosphere();
    await loadManagedContent();
    renderLogos();
    renderComparisons();
    renderMedia();
    initComparisonSliders();
    initVideos();
    initInlineVideos();
    initHeroVideo();
    initSectionWhatsappButtons();
    initMagneticElements();
    initAnchorLinks();
    initServicesMenu();
    initActiveNavigation();
    initAnalytics();
    animateCounters();
    initScrollAnimations();
    initLoader();
    refreshAfterMedia();
    window.addEventListener("load", forceStartAtTop, { once: true });
  }

  boot();
})();
