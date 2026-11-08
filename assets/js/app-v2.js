(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const page = document.body.dataset.page || "home";
  const active = () => "";
  const logo = "/7Z-LogoT.png";
  const header = `<header class="site-header" aria-label="Primary"><a class="brand" href="/" aria-label="7Z Magic home"><img src="${logo}" alt="7Z Magic"></a><nav class="main-nav" aria-label="Main navigation"><a href="/"${active("home")}>Home</a><a href="/services/"${active("services")}>Services</a><a href="/about/"${active("about")}>About</a><a href="/founders/"${active("founders")}>Founders</a><a href="/partners/"${active("partners")}>Partners</a><a href="/contact/"${active("contact")}>Contact</a><a href="/private-access/"${active("private")}>Private Access</a></nav><div class="header-actions"><button class="icon-button" type="button" data-theme-toggle aria-label="Switch theme" title="Switch theme">◐</button><a class="button" href="/contact/">Start a project <span aria-hidden="true">↗</span></a><button class="icon-button mobile-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button></div></header>`;
  const footer = `<footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-brand"><a href="/" aria-label="7Z Magic home"><img src="${logo}" alt="7Z Magic"></a><p>Digital experiences, films and brand systems made to move businesses forward.</p></div><div class="footer-col"><strong>Explore</strong><a href="/services/">Services</a><a href="/about/">About 7Z</a><a href="/founders/">Founders</a><a href="/partners/">Partners</a></div><div class="footer-col"><strong>Academy</strong><a href="/course-registration/">AI Cinematic Filmmaking</a><a href="/course-registration/form/">Course registration</a></div><div class="footer-col"><strong>Connect</strong><a href="/contact/">Contact</a><a href="mailto:creative@7z-magic.com">creative@7z-magic.com</a><a href="/private-access/">Private Access</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} 7Z Magic</span><span>Made with intention in Amman</span></div></div></footer>`;
  const headerSlot = $("#site-header-slot"); if (headerSlot) headerSlot.outerHTML = header;
  const footerSlot = $("#site-footer-slot"); if (footerSlot) footerSlot.outerHTML = footer;
  const html = document.documentElement;
  const storedTheme = localStorage.getItem(page === "academy" ? "7z-course-theme" : "7z-theme-v2");
  html.dataset.theme = storedTheme === "light" ? "light" : "dark";
  $("[data-theme-toggle]")?.addEventListener("click", () => { if (page === "academy") { $("#theme")?.click(); return; } html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark"; localStorage.setItem("7z-theme-v2", html.dataset.theme); });
  if (page === "academy" && $("#lang")) { const language = document.createElement("button"); language.className = "button academy-language"; language.type = "button"; language.textContent = $("#lang").textContent; language.setAttribute("aria-label", "Change language"); language.addEventListener("click", () => $("#lang").click()); $(".site-header")?.after(language); $("#lang").addEventListener("click", () => { language.textContent = $("#lang").textContent; }); }
  $(".mobile-toggle")?.addEventListener("click", (e) => { const h = $(".site-header"); const open = h.classList.toggle("is-open"); e.currentTarget.setAttribute("aria-expanded", String(open)); });
  const videos = [...document.querySelectorAll("video")];
  videos.forEach((video) => { video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true; video.setAttribute("playsinline", ""); video.play().catch(() => {}); });
  if (videos.length) {
    const sound = document.createElement("button"); sound.className = "audio-toggle"; sound.type = "button"; sound.setAttribute("aria-label", "Turn video sound on"); sound.title = "Turn video sound on"; sound.textContent = "♫"; document.body.append(sound);
    sound.addEventListener("click", () => { const enabled = videos.some(v => v.muted); videos.forEach(v => { v.muted = !enabled; if (enabled) v.play().catch(() => {}); }); sound.setAttribute("aria-label", enabled ? "Mute videos" : "Turn video sound on"); sound.title = enabled ? "Mute videos" : "Turn video sound on"; sound.textContent = enabled ? "♪" : "♫"; });
  }
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    let lenis;
    if (window.Lenis && !matchMedia("(prefers-reduced-motion: reduce)").matches) { lenis = new Lenis({ lerp: .085, smoothWheel: true }); lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((time) => lenis.raf(time * 1000)); gsap.ticker.lagSmoothing(0); }
    document.querySelectorAll("[data-parallax]").forEach((el) => gsap.to(el, { yPercent: Number(el.dataset.parallax) || -8, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }));
    const pin = $("[data-horizontal-reel]"); const track = $("[data-reel-track]");
    if (pin && track && innerWidth > 800 && !matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.to(track, { x: () => -(track.scrollWidth - pin.clientWidth + 30), ease: "none", scrollTrigger: { trigger: pin, start: "top top+=85", end: () => `+=${track.scrollWidth}`, scrub: 1, pin: true, invalidateOnRefresh: true } });
    document.querySelectorAll("[data-marquee]").forEach((row, i) => gsap.to(row, { x: i % 2 ? 120 : -120, ease: "none", scrollTrigger: { trigger: row.parentElement, start: "top bottom", end: "bottom top", scrub: true } }));
    document.querySelectorAll("[data-reveal]").forEach((el) => gsap.fromTo(el, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }));
  }
  document.querySelectorAll("[data-kinetic-strip]").forEach((strip) => { const toggle = () => strip.setAttribute("aria-expanded", strip.getAttribute("aria-expanded") !== "true" ? "true" : "false"); strip.addEventListener("click", (e) => { if (e.target.closest("a")) return; toggle(); }); strip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }); });
})();
