(() => {
  'use strict';

  const projects = window.__Z7_WEBSITE_PROJECTS__ || [];
  const tabs = document.getElementById('projects');
  const devices = [...document.querySelectorAll('[data-device]')];
  const clips = document.getElementById('clips');
  const stage = document.getElementById('stage');
  const screen = document.getElementById('screen');
  const poster = document.getElementById('poster');
  const video = document.getElementById('previewVideo');
  const playButton = document.getElementById('playPreview');
  const status = document.getElementById('statusText');
  const address = document.getElementById('address');
  const openSite = document.getElementById('openSite');
  if (!projects.length || !tabs || !stage || !screen || !video) return;

  video.controls = false;
  video.loop = true;
  video.addEventListener('contextmenu', (event) => event.preventDefault());

  let projectIndex = 0;
  let device = 'desktop';
  let clipIndex = 0;
  let nearViewport = false;
  const saveData = navigator.connection?.saveData === true;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mayAutoplay = !saveData && !reduceMotion;

  const currentClips = () => projects[projectIndex].videos[device] || [];
  const currentClip = () => currentClips()[clipIndex];
  const posterFor = (src) => src.replace(/\.mp4$/i, '.webp');

  function stopVideo() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    screen.classList.remove('is-ready', 'is-playing');
    playButton.hidden = false;
  }

  function loadSelected() {
    const clip = currentClip();
    if (!clip || !nearViewport || video.getAttribute('src') === clip.src) return;
    video.src = clip.src;
    video.preload = 'metadata';
    video.load();
    status.textContent = 'Loading recording';
  }

  function playSelected() {
    nearViewport = true;
    loadSelected();
    video.play().catch(() => {
      status.textContent = 'Press play to watch';
      playButton.hidden = false;
    });
  }

  function renderClips() {
    const options = currentClips();
    clips.replaceChildren();
    clips.hidden = options.length < 2;
    if (clips.hidden) return;
    options.forEach((clip, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = clip.label;
      button.classList.toggle('is-active', index === clipIndex);
      button.setAttribute('aria-pressed', String(index === clipIndex));
      button.addEventListener('click', () => {
        if (clipIndex === index) return;
        clipIndex = index;
        render();
      });
      clips.appendChild(button);
    });
  }

  function render() {
    const item = projects[projectIndex];
    const clip = currentClip();
    stopVideo();
    [...tabs.children].forEach((button, index) => {
      const selected = index === projectIndex;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    devices.forEach((button) => {
      const selected = button.dataset.device === device;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    stage.classList.toggle('is-mobile', device === 'mobile');
    stage.classList.toggle('is-desktop', device === 'desktop');
    renderClips();
    poster.src = posterFor(clip.src);
    poster.alt = `${item.name} ${device} recording poster`;
    video.poster = poster.src;
    video.setAttribute('aria-label', `${item.name} ${clip.label} website recording`);
    openSite.href = item.url;
    address.textContent = item.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    status.textContent = nearViewport ? 'Loading recording' : 'Recording ready';
    loadSelected();
  }

  projects.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.name;
    button.addEventListener('click', () => {
      if (index === projectIndex) return;
      projectIndex = index;
      clipIndex = 0;
      render();
    });
    tabs.appendChild(button);
  });

  devices.forEach((button) => button.addEventListener('click', () => {
    if (!button.dataset.device || button.dataset.device === device) return;
    device = button.dataset.device;
    clipIndex = 0;
    render();
  }));

  video.addEventListener('loadeddata', () => {
    screen.classList.add('is-ready');
    status.textContent = 'Ready to play';
    if (mayAutoplay && nearViewport && !document.hidden) playSelected();
  });
  video.addEventListener('playing', () => {
    screen.classList.add('is-ready', 'is-playing');
    playButton.hidden = true;
  });
  video.addEventListener('pause', () => {
    screen.classList.remove('is-playing');
    playButton.hidden = false;
  });
  video.addEventListener('error', () => {
    screen.classList.remove('is-ready', 'is-playing');
    status.textContent = 'Recording unavailable';
    playButton.hidden = false;
  });
  playButton.addEventListener('click', playSelected);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      nearViewport = entry.isIntersecting;
      if (nearViewport) {
        loadSelected();
        if (mayAutoplay && video.readyState >= 2 && !document.hidden) playSelected();
      } else {
        video.pause();
      }
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    observer.observe(stage);
  } else {
    nearViewport = true;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (mayAutoplay && nearViewport && video.readyState >= 2) playSelected();
  });

  render();
})();
