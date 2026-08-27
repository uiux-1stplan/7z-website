/* Z7_FOUNDERS_HERO_CLEANUP_V5 */

(() => {
  "use strict";

  if (window.__Z7_FOUNDERS_HERO_CLEANUP_V5__) return;
  window.__Z7_FOUNDERS_HERO_CLEANUP_V5__ = true;

  const D = document;

  function textOf(el) {
    return String(el?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isNewHeroImage(img) {
    return (
      img.classList.contains("z7-founders-hero-photo__image") ||
      /7z-founders-hero-20260828\.jpeg/i.test(img.currentSrc || img.src || "")
    );
  }

  function isLogoImage(img) {
    const value = [
      img.currentSrc || "",
      img.src || "",
      img.alt || "",
      img.className || ""
    ].join(" ");

    return /logo/i.test(value);
  }

  function chooseVisualAncestor(hero, start, copyHeading) {
    let node = start;
    let candidate = null;

    while (node && node !== hero) {
      if (copyHeading && node.contains(copyHeading)) break;

      const rect = node.getBoundingClientRect();
      const cls = String(node.className || "");

      const semanticCard =
        node.matches?.("article,figure") ||
        /card|founder|portrait|profile|visual|media|person/i.test(cls);

      const visualSize =
        rect.width >= 170 &&
        rect.height >= 170 &&
        rect.width <= hero.clientWidth * .82 &&
        rect.height <= hero.clientHeight * 1.05;

      if (semanticCard || visualSize) {
        candidate = node;
      }

      if (node.parentElement === hero) {
        break;
      }

      node = node.parentElement;
    }

    return candidate || start.parentElement;
  }

  function findCopy(hero) {
    const heading = [...hero.querySelectorAll("h1,h2")]
      .find(el => /two\s+minds/i.test(textOf(el))) ||
      hero.querySelector("h1");

    if (!heading) return { heading: null, copy: null };

    let node = heading.parentElement;
    let candidate = heading.parentElement;

    while (node && node !== hero) {
      const hasBody = Boolean(node.querySelector("p"));
      const oldImages = [...node.querySelectorAll("img")]
        .some(img => !isNewHeroImage(img) && !isLogoImage(img));

      if (hasBody && !oldImages) {
        candidate = node;
      }

      if (node.parentElement === hero) break;
      node = node.parentElement;
    }

    return { heading, copy: candidate };
  }

  function hideLegacyVisuals(hero, copyHeading) {
    const hidden = new Set();

    const oldImages = [...hero.querySelectorAll("img")]
      .filter(img => !isNewHeroImage(img) && !isLogoImage(img));

    for (const img of oldImages) {
      const target = chooseVisualAncestor(hero, img, copyHeading);

      if (
        target &&
        target !== hero &&
        (!copyHeading || !target.contains(copyHeading))
      ) {
        hidden.add(target);
      }
    }

    /* Fallback for founder cards whose image may be CSS/background-based. */
    const exactNameNodes = [...hero.querySelectorAll("*")]
      .filter(el => {
        if (el.children.length) return false;
        const t = textOf(el);
        return /^(Hasan Rayan|Khaled Bushnaq)$/i.test(t);
      });

    for (const node of exactNameNodes) {
      const target = chooseVisualAncestor(hero, node, copyHeading);

      if (
        target &&
        target !== hero &&
        (!copyHeading || !target.contains(copyHeading))
      ) {
        hidden.add(target);
      }
    }

    for (const target of hidden) {
      target.setAttribute("data-z7-old-founder-hero", "hidden");
      target.setAttribute("aria-hidden", "true");
      target.style.setProperty("display", "none", "important");
    }

    return hidden.size;
  }

  function apply() {
    const hero = D.querySelector('[data-z7-founders-hero="photo-v1"]');
    if (!hero) return;

    const { heading, copy } = findCopy(hero);

    if (copy) {
      copy.classList.add("z7-founders-hero-copy-clean");
    }

    const hiddenCount = hideLegacyVisuals(hero, heading);

    hero.dataset.z7FoundersHeroClean = "true";
    hero.dataset.z7HiddenLegacyVisuals = String(hiddenCount);
  }

  if (D.readyState === "loading") {
    D.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  /* One short settle pass for delayed image/layout hydration only. */
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
})();