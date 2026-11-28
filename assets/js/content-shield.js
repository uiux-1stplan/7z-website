(() => {
  'use strict';
  const p = (window.location.pathname || '').toLowerCase();
  if (p === '/admin' || p.startsWith('/admin/')) {
    document.documentElement.classList.add('admin-shield-exempt');
    return;
  }

  const isEditable = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return Boolean(el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
  };

  const blockEvent = (e) => {
    if (e.type !== 'contextmenu' && isEditable(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  ['contextmenu', 'selectstart', 'copy', 'cut', 'dragstart'].forEach((evt) => {
    window.addEventListener(evt, blockEvent, true);
    document.addEventListener(evt, blockEvent, true);
  });

  document.addEventListener('selectionchange', () => {
    if (isEditable(document.activeElement)) return;
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount > 0 && String(sel).length > 0) {
      try { sel.removeAllRanges(); } catch (_) {}
    }
  }, true);

  window.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    if (e.key === 'F12' || (ctrl && shift && ['i','j','c','k'].includes(key)) || (ctrl && ['u','s','p'].includes(key))) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (ctrl && ['c','x','a'].includes(key) && !isEditable(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
})();
