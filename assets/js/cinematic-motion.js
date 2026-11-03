(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  const economy = reduce.matches || saveData;
  if (economy) document.body.classList.add('z7-motion-economy');

  if (!document.body.classList.contains('z7-admin-theme')) {
    const wash = document.createElement('div');
    wash.className = 'z7-ambient-wash';
    wash.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wash);
  }

  if (!economy && 'IntersectionObserver' in window &&
      !document.body.classList.contains('z7-admin-theme')) {
    const path = location.pathname;
    const selectors = path === '/' || path === '/index.html'
      ? '.service-loop__intro, .chapter__intro, .gallery-copy, .pin-copy, .web-copy, .reach-copy, .film-copy, .studio-suite__intro'
      : path === '/course-registration/'
        ? '.section-head, .offer-item, .price-card, .date, .step'
        : path.startsWith('/websites/')
          ? '.wx-hero h1, .wx-hero p'
          : document.body.classList.contains('subpage')
            ? '.z7x-section-head, .z7x-statement__grid, .z7x-founder-profile__copy, .z7x-contact-brief__grid, .z7x-contact-services .z7x-kicker, .z7x-cta__panel'
            : '';
    const elements = selectors ? [...document.querySelectorAll(selectors)] : [];
    if (elements.length) {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('is-in-focus', entry.isIntersecting);
        }
      }, { threshold: 0, rootMargin: '-16% 0px -16% 0px' });
      for (const element of elements) {
        element.classList.add('z7-scroll-blur');
        observer.observe(element);
      }
      document.documentElement.classList.add('z7-scroll-ready');
    }
  }

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('z7-motion-paused', document.hidden);
  });
})();
