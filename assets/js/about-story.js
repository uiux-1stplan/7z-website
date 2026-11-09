(() => {
  const page = document.querySelector('.z7-about-story');
  if (!page) return;

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...page.querySelectorAll('[data-about-reveal]')];
  const chapterLinks = [...page.querySelectorAll('[data-about-nav]')];

  if (!reduceMotion && 'IntersectionObserver' in window) {
    doc.setAttribute('data-z7-about-enhanced', '');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const progress = page.querySelector('[data-about-progress]');
  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    if (!progress) return;
    const span = Math.max(1, doc.scrollHeight - window.innerHeight);
    const amount = Math.min(1, Math.max(0, window.scrollY / span));
    progress.style.transform = `scaleX(${amount})`;
  };
  const queueProgress = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress, { passive: true });
  updateProgress();

  if ('IntersectionObserver' in window && chapterLinks.length) {
    const sections = chapterLinks.map((link) => page.querySelector(link.getAttribute('href'))).filter(Boolean);
    const navById = new Map(chapterLinks.map((link) => [link.hash.slice(1), link]));
    const chapterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        chapterLinks.forEach((link) => link.removeAttribute('aria-current'));
        navById.get(entry.target.id)?.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-24% 0px -58% 0px', threshold: 0 });
    sections.forEach((section) => chapterObserver.observe(section));
  }

  const attachVideo = (video) => {
    if (!video.src) {
      video.src = video.dataset.aboutSrc;
      video.load();
    }
    if (!reduceMotion) video.play().catch(() => {});
  };
  const videos = [...page.querySelectorAll('video[data-about-src]')];
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) attachVideo(entry.target);
        else entry.target.pause();
      });
    }, { rootMargin: '240px 0px', threshold: 0.05 });
    videos.forEach((video) => videoObserver.observe(video));
  } else {
    videos.forEach(attachVideo);
  }

  const field = page.querySelector('.about-hero__field');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (field && finePointer && !reduceMotion) {
    let pointerFrame = 0;
    field.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = field.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        field.style.setProperty('--about-field-x', `${(x * 100).toFixed(1)}%`);
        field.style.setProperty('--about-field-y', `${(y * 100).toFixed(1)}%`);
        field.style.setProperty('--about-field-turn', `${((x - 0.5) * 7).toFixed(2)}deg`);
      });
    });
    field.addEventListener('pointerleave', () => {
      field.style.setProperty('--about-field-x', '50%');
      field.style.setProperty('--about-field-y', '50%');
      field.style.setProperty('--about-field-turn', '0deg');
    });
  }
})();
