(() => {
  const video = document.querySelector('.z7-web-reel');
  if (!video) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (reducedMotion.matches || saveData) return;

  let visible = false;
  const start = () => {
    if (!visible || document.hidden) return;
    if (!video.src) {
      video.src = video.dataset.src;
      video.load();
    }
    video.play().catch(() => {});
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
    else video.pause();
  }, { rootMargin: '160px 0px', threshold: 0 });

  observer.observe(video);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else start();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) video.pause();
    else start();
  });
})();
