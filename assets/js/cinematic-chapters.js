(() => {
  "use strict";
  const root = document.documentElement;
  const main = document.querySelector("main");
  if (!main) return;
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (root.hasAttribute("data-academy-ui")) {
    const rail = document.createElement("nav");
    rail.className = "academy-utility-rail";
    rail.setAttribute("aria-label", "Academy controls");
    rail.innerHTML = `<a href="/courses/" aria-label="Back to 7Z Academy">↖ <span>7Z ACADEMY</span></a><button type="button" data-theme-toggle aria-label="Switch color theme">◐</button>`;
    const languageControl = document.getElementById("lang");
    if (languageControl) {
      const language = document.createElement("button");
      language.type = "button"; language.className = "academy-language"; language.textContent = "EN";
      language.setAttribute("aria-label", "Switch language");
      language.addEventListener("click", () => languageControl.click());
      rail.append(language);
    }
    document.body.append(rail);
    rail.querySelector("[data-theme-toggle]").addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try { localStorage.setItem("z7-theme", next); localStorage.setItem("7z-course-theme", next); } catch {}
    });
    if (path !== "/courses") {
      const registration = main.querySelector('a[href*="/course-registration/form/"]');
      const outcomes = main.querySelector(".outcomes")?.closest("section");
      if (registration && outcomes && !main.querySelector(".course-mid-enroll")) {
        const band = document.createElement("aside");
        band.className = "course-mid-enroll";
        band.innerHTML = `<p>Turn your idea into a method you can put to work.</p>`;
        const cta = registration.cloneNode(true);
        cta.textContent = "Enroll in this course ↗";
        band.append(cta);
        outcomes.after(band);
      }
    }
  }
  const media = {
    architecture: "/media/posters/arch_projects/9-16H/1-optimized.svg",
    film: "/media/posters/film/1.jpg",
    campaign: "/media/posters/media_projects/Media (1).jpg",
    screens: "/media/posters/website_project/1.jpg"
  };
  const add = (className, html, before = null) => {
    const section = document.createElement("section");
    section.className = className;
    section.innerHTML = html;
    if (before) main.insertBefore(section, before); else main.append(section);
    return section;
  };
  if (path === "/services") {
    const close = main.querySelector(".services-vision");
    if (close) {
      const stories = [
        ["02 / THE METHOD", "Context first. A clear direction before choosing the tools.", "Every project moves through discovery, direction, prototyping, production, review, and delivery.", media.architecture, "01 — DISCOVER / DESIGN / DELIVER"],
        ["03 / IMAGE IN MOTION", "An idea should live beyond a single frame.", "We connect identity, image, movement, and sound into one story shaped around the project and its audience.", media.film, "02 — DIRECTION / MOTION / SOUND"],
        ["04 / DESIGNED TO PERFORM", "Digital experiences made clear on every screen.", "From information architecture to interface detail, we build websites that express the brand and make action intuitive.", media.screens, "03 — STRATEGY / INTERFACE / BUILD"]
      ];
      const fragment = document.createDocumentFragment();
      for (const [index,title,body,src,meta] of stories) {
        const section = document.createElement("section");
        section.className = "cinematic-story";
        section.innerHTML = `<div class="cinematic-story__visual"><img src="${src}" alt="7Z Magic studio work" loading="lazy"><span>${meta}</span></div><div class="cinematic-story__copy"><p class="eyebrow">${index}</p><h2>${title}</h2><p>${body}</p></div>`;
        fragment.append(section);
      }
      main.insertBefore(fragment, close);
    }
  }
  if (path === "/about") {
    const target = main.querySelector(".z7x-capability-grid")?.closest("section") || main.lastElementChild;
    if (target) {
      const story = add("cinematic-timeline", `<div class="cinematic-timeline__head"><p class="eyebrow">07 / OUR EVOLUTION</p><h2>Engineering gives images a system. Cinema gives systems a soul.</h2></div><ol><li><span>01</span><div><h3>Shape the space</h3><p>Translate plans into architectural experiences people can see, feel, and evaluate.</p></div></li><li><span>02</span><div><h3>Build the language</h3><p>Create a clear brand expression across visuals, interfaces, and every point of contact.</p></div></li><li><span>03</span><div><h3>Move the idea</h3><p>Use AI and cinematic production to open new creative possibilities.</p></div></li><li><span>04</span><div><h3>Connect the experience</h3><p>Bring content, web, and product together around the outcome each project needs.</p></div></li></ol>`, target);
      const strip = document.createElement("div");
      strip.className = "cinematic-story__visual cinematic-story__visual--wide";
      strip.innerHTML = `<img src="${media.campaign}" alt="7Z Magic campaign production" loading="lazy"><span>STRATEGY × ENGINEERING × CINEMA × AI</span>`;
      story.after(strip);
    }
  }
  const reveals = main.querySelectorAll(":scope > section, .z7x-founder-profile, .stage, .course-card, .website-work, .z7p-partner");
  if (reduce || !("IntersectionObserver" in window)) { reveals.forEach(node => node.classList.add("is-in-focus")); return; }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add("is-in-focus");
      observer.unobserve(entry.target);
    }
  }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
  reveals.forEach(node => { node.classList.add("will-focus"); observer.observe(node); });
})();
