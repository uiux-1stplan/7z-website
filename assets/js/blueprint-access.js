(() => {
  const triggers = document.querySelectorAll('[data-blueprint-access]');
  if (!triggers.length) return;

  const modal = document.createElement('div');
  modal.className = 'blueprint-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="blueprint-modal__backdrop" data-blueprint-close></div>
    <section class="blueprint-modal__panel" role="dialog" aria-modal="true" aria-labelledby="blueprint-modal-title">
      <p class="blueprint-modal__eyebrow">Private Document</p>
      <h2 class="blueprint-modal__title" id="blueprint-modal-title">Strategic Blueprint</h2>
      <p class="blueprint-modal__year">2026–2027</p>
      <form data-blueprint-form novalidate>
        <label class="blueprint-modal__label" for="blueprint-password">Enter Access Password</label>
        <input class="blueprint-modal__input" id="blueprint-password" name="password" type="password" autocomplete="current-password" maxlength="256" required />
        <p class="blueprint-modal__error" data-blueprint-error role="status" aria-live="polite"></p>
        <button class="blueprint-modal__submit" type="submit" data-blueprint-submit>Unlock Document</button>
        <button class="blueprint-modal__cancel" type="button" data-blueprint-close>Cancel</button>
      </form>
    </section>`;
  document.body.append(modal);

  const form = modal.querySelector('[data-blueprint-form]');
  const input = modal.querySelector('#blueprint-password');
  const submit = modal.querySelector('[data-blueprint-submit]');
  const error = modal.querySelector('[data-blueprint-error]');
  let previousFocus = null;
  let pending = false;

  const focusable = () => [...modal.querySelectorAll('input, button:not(:disabled)')];
  const close = () => {
    if (pending) return;
    modal.hidden = true;
    document.body.classList.remove('blueprint-modal-open');
    input.value = '';
    error.textContent = '';
    previousFocus?.focus();
  };
  const open = () => {
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('blueprint-modal-open');
    requestAnimationFrame(() => input.focus());
  };

  triggers.forEach((trigger) => trigger.addEventListener('click', open));
  modal.querySelectorAll('[data-blueprint-close]').forEach((control) => control.addEventListener('click', close));

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = focusable();
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || !input.value) return;
    const documentTab = window.open('', '_blank');
    if (documentTab) {
      documentTab.opener = null;
      documentTab.document.title = 'Unlocking document…';
      documentTab.document.body.textContent = 'Unlocking document…';
    }
    pending = true;
    submit.disabled = true;
    submit.textContent = 'Unlocking…';
    error.textContent = '';

    try {
      const response = await fetch('/api/blueprint-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({ password: input.value })
      });
      input.value = '';
      const result = await response.json().catch(() => ({ ok: false }));
      if (!response.ok || !result.ok || typeof result.url !== 'string') {
        documentTab?.close();
        error.textContent = response.status === 401 ? 'Incorrect password' : 'Unable to unlock document';
        input.focus();
        return;
      }
      modal.hidden = true;
      document.body.classList.remove('blueprint-modal-open');
      if (documentTab && !documentTab.closed) documentTab.location.replace(result.url);
      else window.location.assign(result.url);
    } catch {
      documentTab?.close();
      input.value = '';
      error.textContent = 'Unable to unlock document';
      input.focus();
    } finally {
      pending = false;
      submit.disabled = false;
      submit.textContent = 'Unlock Document';
    }
  });
})();
