(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'z7-theme';
  const valid = value => value === 'light' || value === 'dark';
  const stored = (() => {
    try { return localStorage.getItem(key) || localStorage.getItem('7z-course-theme'); }
    catch { return null; }
  })();
  const initial = valid(stored) ? stored : 'dark';
  function apply(theme) {
    const next = valid(theme) ? theme : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem(key, next);
      localStorage.setItem('7z-course-theme', next);
    } catch {}
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const light = next === 'dark';
      button.setAttribute('aria-label', light ? 'Switch to light theme' : 'Switch to dark theme');
      button.setAttribute('aria-pressed', String(next === 'light'));
      button.title = light ? 'Switch to light theme' : 'Switch to dark theme';
      const icon = button.querySelector('[aria-hidden="true"]');
      if (icon) icon.textContent = next === 'dark' ? '◐' : '☼';
    });
  }
  apply(initial);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    apply(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });
  window.addEventListener('storage', event => {
    if (event.key === key && valid(event.newValue)) apply(event.newValue);
  });
})();
