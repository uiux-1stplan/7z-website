(() => {
  "use strict";

  if (window.__z7StaticCopyUnlockLoaded) return;
  window.__z7StaticCopyUnlockLoaded = true;

  const copySelectors = [
    ".manifest__copy",
    ".service-loop__intro",
    ".chapter__intro",
    ".gallery-copy",
    ".pin-copy",
    ".web-copy",
    ".reach-copy",
    ".film-copy",
    ".ai-heading",
    ".studio-suite__intro"
  ];

  const textSelector = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "span",
    "strong",
    "em",
    "a",
    "div"
  ].join(",");

  const isTextLike = (element) => {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (element.closest("#loader, .loader, .preloader")) return false;
    if (element.closest(".site-header, .main-header, header")) return false;
    if (element.closest(".services-panel")) return false;
    if (element.closest(".intro")) return false;
    return String(element.textContent || "").trim().length > 0;
  };

  const getBlocks = () => {
    return Array.from(document.querySelectorAll(copySelectors.join(",")))
      .filter((block) => block instanceof HTMLElement);
  };

  const getTextTargets = () => {
    const blocks = getBlocks();
    const targets = [];

    blocks.forEach((block) => {
      targets.push(block);

      Array.from(block.querySelectorAll(textSelector)).forEach((element) => {
        if (isTextLike(element)) targets.push(element);
      });

      Array.from(block.children).forEach((element) => {
        if (isTextLike(element)) targets.push(element);
      });
    });

    return Array.from(new Set(targets)).filter(isTextLike);
  };

  const killCopyScrollTriggers = () => {
    if (!window.ScrollTrigger) return;

    const blocks = getBlocks();

    window.ScrollTrigger.getAll().forEach((trigger) => {
      const triggerElement = trigger.trigger;

      if (!triggerElement || !(triggerElement instanceof HTMLElement)) return;

      const isCopyTrigger = blocks.some((block) => {
        return triggerElement === block || block.contains(triggerElement);
      });

      if (!isCopyTrigger) return;

      if (trigger.animation) {
        trigger.animation.kill();
      }

      trigger.kill(false);
    });
  };

  const unlockText = () => {
    const targets = getTextTargets();

    if (window.gsap) {
      window.gsap.killTweensOf(targets);
      window.gsap.set(targets, {
        autoAlpha: 1,
        y: 0,
        x: 0,
        clearProps: "opacity,visibility,transform,filter,willChange"
      });
    }

    targets.forEach((element) => {
      element.style.opacity = "1";
      element.style.visibility = "visible";
      element.style.transform = "none";
      element.style.filter = "none";
      element.style.willChange = "auto";
    });

    console.info("[7Z] home static copy unlocked:", targets.length);
  };

  const run = () => {
    killCopyScrollTriggers();
    unlockText();

    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  };

  const schedule = () => {
    run();
    window.setTimeout(run, 450);
    window.setTimeout(run, 1200);
    window.setTimeout(run, 2400);
    window.setTimeout(run, 4200);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener("load", schedule, { once: true });
})();