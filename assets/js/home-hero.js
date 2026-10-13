(() => {
  'use strict';
  const opening = document.querySelector('.z7-opening');
  if (!opening) return;
  const hero = opening.querySelector('#intro');
  const universe = opening.querySelector('#universe');
  const stage = opening.querySelector('.z7-opening__stage');
  const background = opening.querySelector('.z7-cinema__background');
  const logo = opening.querySelector('.z7-cinema__logo');
  const light = opening.querySelector('.z7-cinema__light');
  const halo = opening.querySelector('.z7-cinema__halo');
  const copy = opening.querySelector('.z7-cinema__copy');
  const footer = opening.querySelector('.z7-cinema__footer');
  const cards = [...opening.querySelectorAll('.z7-cinema__card')];
  const ambient = opening.querySelector('.z7-cinema__ambient-video');
  const film = universe.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = n => Math.max(0, Math.min(1, n));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  let frame = 0, start = 0, travel = 1, stageWidth = 0, centerX = 0, centerY = 0, mx = 0, my = 0;
  let lastProgress = -1, lastMx = 0, lastMy = 0, forcePaint = true, deferredFilm = false;
  let ambientTimer = 0;
  const saveData = navigator.connection?.saveData === true;
  function startAmbientAfterPaint() {
    if (!ambient || ambientTimer || reduced.matches || saveData || document.hidden) return;
    ambientTimer = window.setTimeout(() => {
      ambientTimer = 0;
      if (reduced.matches || saveData || document.hidden || lastProgress > .12) return;
      if (!ambient.src && ambient.dataset.src) {
        ambient.src = ambient.dataset.src;
        ambient.preload = 'metadata';
      }
      ambient.play().catch(() => {});
    }, 700);
  }
  function measure() {
    opening.classList.toggle('is-enhanced', !reduced.matches);
    start = opening.getBoundingClientRect().top + scrollY;
    travel = Math.max(1, opening.offsetHeight - stage.offsetHeight);
    stageWidth = opening.clientWidth;
    centerX = stage.clientWidth / 2 - logo.offsetLeft;
    centerY = stage.clientHeight / 2 - logo.offsetTop;
    forcePaint = true;
    schedule();
  }
  function render() {
    frame = 0;
    const y = scrollY;
    const p = reduced.matches ? 0 : clamp((y - start) / travel);
    if (!forcePaint && p === lastProgress && mx === lastMx && my === lastMy) return;
    forcePaint = false;
    lastProgress = p; lastMx = mx; lastMy = my;
    // The existing site has overflow on body, which prevents native sticky pinning.
    // Pin only this stage; never change the site's global scrolling behavior.
    if (reduced.matches) {
      stage.style.position = '';
      stage.style.top = '';
      stage.style.width = '';
    } else {
      const active = y >= start && y < start + travel;
      stage.style.position = active ? 'fixed' : 'absolute';
      stage.style.top = active || y < start ? '0px' : `${travel}px`;
      stage.style.width = `${stageWidth}px`;
    }
    const zoom = range(p, .14, 1);
    const fly = range(p, 0, .38);
    const reveal = range(p, .42, .91);
    const textOpacity = 1 - range(p, .25, .48);
    const depth = 1 - range(p, 0, .22);
    // Direct scroll mapping: no smoothing loop, delayed scrub, blur or scroll interception.
    logo.style.transform = `translate3d(${centerX * zoom + mx * 11 * depth}px,${centerY * zoom + my * 9 * depth}px,0) scale(${Math.exp(zoom * Math.log(17))})`;
    logo.style.opacity = 1 - range(p, .69, .97);
    background.style.opacity = 1 - reveal;
    halo.style.opacity = 1 - range(p, .15, .48);
    light.style.transform = `translate3d(${mx * 45 * depth}px,${my * 35 * depth}px,0)`;
    copy.style.opacity = textOpacity;
    footer.style.opacity = 1 - range(p, .05, .24);
    copy.inert = textOpacity < .1;
    footer.inert = p > .22;
    cards.forEach((card, i) => {
      const direction = i % 2 ? 1 : -1;
      card.style.transform = `translate3d(${direction * fly * 180 + mx * (i + 1) * 5 * depth}px,${(i < 2 ? -1 : 1) * fly * 110 + my * (i + 1) * 4 * depth}px,0) scale(${1 + fly * .18})`;
      card.style.opacity = 1 - fly;
    });
    hero.style.pointerEvents = p >= .65 ? 'none' : '';
    hero.style.visibility = p >= 1 ? 'hidden' : 'visible';
    hero.inert = p >= .65;
    universe.inert = !reduced.matches && p < .65;
    universe.setAttribute('aria-hidden', String(!reduced.matches && p < .65));
    opening.classList.toggle('is-exiting', p > .02 || y > start + travel);
    if (ambient) {
      if (reduced.matches || p > .12 || document.hidden) {
        if (!ambient.paused) ambient.pause();
      } else if (ambient.paused && !saveData) {
        if (ambient.src) ambient.play().catch(() => {});
        else startAmbientAfterPaint();
      }
    }
    // Keep its poster visible during the zoom; video decoding resumes after the handoff.
    if (film && !reduced.matches && p < 1 && !film.paused) {
      deferredFilm = true;
      film.pause();
    } else if (film && deferredFilm && (reduced.matches || p >= 1)) {
      deferredFilm = false;
      setTimeout(() => {
        if (reduced.matches || lastProgress >= 1) film.play().catch(() => {});
        else deferredFilm = true;
      }, 150);
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  film?.addEventListener('play', () => {
    if (!reduced.matches && lastProgress < 1) { deferredFilm = true; film.pause(); }
  });
  ambient?.addEventListener('play', () => {
    if (reduced.matches || lastProgress > .12 || document.hidden) ambient.pause();
  });
  document.addEventListener('visibilitychange', schedule);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  reduced.addEventListener('change', measure);
  hero.addEventListener('pointermove', event => {
    if (!fine.matches || reduced.matches || scrollY > start + travel * .25) return;
    mx = event.clientX / innerWidth * 2 - 1;
    my = event.clientY / innerHeight * 2 - 1;
    schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mx = my = 0; schedule(); });
  function showUniverse(focus = false) {
    const destination = reduced.matches ? universe.getBoundingClientRect().top + scrollY : start + travel;
    scrollTo({ top: destination, behavior: 'instant' });
    render();
    if (focus) { universe.tabIndex = -1; universe.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href="#universe"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    history.pushState(null, '', '#universe');
    showUniverse(true);
  }, true);
  addEventListener('hashchange', () => { if (location.hash === '#universe') showUniverse(); });
  measure();
  if (location.hash === '#universe') requestAnimationFrame(() => showUniverse());
})();
