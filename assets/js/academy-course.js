(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll(
    '.academy-hero .academy-copy, .academy-art, .hero .copy, .hero-art, .section-heading, .section-head, .course-card, .stage, .outcome, .person, .bonus, .offer-item, .price-card, .step, .final > *'
  );
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  document.body.classList.add('academy-motion-ready');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
  targets.forEach((element, index) => {
    element.classList.add('academy-reveal');
    element.style.setProperty('--academy-delay', Math.min(index % 4, 3) * 55 + 'ms');
    observer.observe(element);
  });
})();