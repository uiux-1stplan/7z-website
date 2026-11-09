(() => {
  const root = document.querySelector('.z7-web-showcase');
  if (!root) return;

  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.querySelectorAll('[data-web-project]').forEach((project) => {
    project.querySelectorAll('[data-web-view]').forEach((button) => {
      button.addEventListener('click', () => {
        project.dataset.view = button.dataset.webView;
        project.querySelectorAll('[data-web-view]').forEach((item) => {
          item.setAttribute('aria-pressed', String(item === button));
        });
      });
    });
  });

  const loadVideo = (video) => {
    if (!video.src && video.dataset.webSrc) {
      video.src = video.dataset.webSrc;
      video.load();
    }
  };

  const playProject = (project) => {
    const view = project.dataset.view || 'duo';
    project.querySelectorAll('video[data-web-src]').forEach((video) => {
      const isPhone = video.closest('.ws-phone');
      const visible = view === 'duo' || (view === 'mobile' ? isPhone : !isPhone);
      if (!visible) {
        video.pause();
        return;
      }
      loadVideo(video);
      if (!motionOff) video.play().catch(() => {});
    });
  };

  if ('IntersectionObserver' in window) {
    const projectObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) playProject(entry.target);
        else entry.target.querySelectorAll('video').forEach((video) => video.pause());
      });
    }, { rootMargin: '120px 0px', threshold: 0.08 });
    root.querySelectorAll('[data-web-project]').forEach((project) => projectObserver.observe(project));
  } else {
    root.querySelectorAll('[data-web-project]').forEach(playProject);
  }

  root.querySelectorAll('[data-web-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const project = button.closest('[data-web-project]');
      if (project && project.getBoundingClientRect().top < innerHeight && project.getBoundingClientRect().bottom > 0) playProject(project);
    });
  });

  const stages = root.querySelectorAll('[data-web-stage]');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!motionOff && finePointer.matches) {
    stages.forEach((stage) => {
      let frame = 0;
      stage.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = stage.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          stage.style.setProperty('--ws-glow-x', `${(x * 100).toFixed(1)}%`);
          stage.style.setProperty('--ws-glow-y', `${(y * 100).toFixed(1)}%`);
          stage.style.setProperty('--ws-tilt-x', `${((0.5 - y) * 2.2).toFixed(2)}deg`);
          stage.style.setProperty('--ws-tilt-y', `${((x - 0.5) * 1.8).toFixed(2)}deg`);
        });
      });
      stage.addEventListener('pointerleave', () => {
        stage.style.setProperty('--ws-glow-x', '52%');
        stage.style.setProperty('--ws-glow-y', '44%');
        stage.style.setProperty('--ws-tilt-x', '0deg');
        stage.style.setProperty('--ws-tilt-y', '0deg');
      });
    });
  }

  const projectLinks = [...root.querySelectorAll('.ws-project-nav a[href^="#"]')];
  if ('IntersectionObserver' in window && projectLinks.length) {
    const linksById = new Map(projectLinks.map((link) => [link.hash.slice(1), link]));
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = linksById.get(entry.target.id);
        if (link && entry.isIntersecting) {
          projectLinks.forEach((item) => item.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'location');
        }
      });
    }, { rootMargin: '-22% 0px -58% 0px', threshold: 0 });
    root.querySelectorAll('[data-web-project]').forEach((project) => navObserver.observe(project));
  }
})();
