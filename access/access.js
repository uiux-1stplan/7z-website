(() => {
  const resources = {
    silla: { type: 'PRIVATE CLIENT ACCESS', name: 'SILLA HALL — INTERACTIVE PRESENTATION', code: 'SILLA' },
    elcon: { type: 'PRIVATE CLIENT ACCESS', name: 'ELCON ARABIA — INTERACTIVE PRESENTATION', code: 'ELCON' },
    'blueprint-html': { type: 'PRIVATE INTERNAL ACCESS', name: '7Z STRATEGIC BLUEPRINT — PROTECTED HTML', code: 'BLUEPRINT / HTML' },
    'blueprint-pdf': { type: 'PRIVATE INTERNAL ACCESS', name: '7Z STRATEGIC BLUEPRINT — CONFIDENTIAL PDF', code: 'BLUEPRINT / PDF' },
    'tawjihi-quotation': { type: 'PRIVATE QUOTATION', name: 'TAWJIHI ENGLISH DIGITAL CURRICULUM', code: 'TQ-01' },
    'oman-partnership': { type: 'PRIVATE PARTNERSHIP', name: 'OMAN MARKET PARTNERSHIP', code: 'OM-01' },
    'scmc-proposal': { type: 'PRIVATE CLIENT ACCESS', name: 'SMILE CARE — BRAND EXPERIENCE PROPOSAL', code: 'SCMC-01' }
  };
  const params = new URLSearchParams(window.location.search);
  const resource = params.get('resource');
  const next = params.get('next');
  const config = resources[resource];
  const form = document.getElementById('access-form');
  const stage = document.querySelector('.access-stage');
  const clientId = document.getElementById('client-id');
  const accessKey = document.getElementById('access-key');
  const submit = document.getElementById('access-submit');
  const status = document.getElementById('form-status');

  if (!config || typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) {
    document.getElementById('access-type').textContent = 'PRIVATE ACCESS';
    document.getElementById('resource-name').textContent = 'REQUEST NOT RECOGNIZED';
    status.textContent = 'ACCESS REQUEST NOT RECOGNIZED';
    submit.disabled = true;
    return;
  }

  document.getElementById('access-type').textContent = config.type;
  document.getElementById('resource-name').textContent = config.name;
  document.getElementById('scope-code').textContent = config.code;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !stage.classList.contains('is-authenticating')) {
      status.textContent = '';
      accessKey.value = '';
      clientId.focus();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || !clientId.value || !accessKey.value) return;
    stage.classList.remove('is-failure');
    stage.classList.add('is-authenticating');
    submit.disabled = true;
    submit.firstElementChild.textContent = 'VERIFYING ACCESS';
    status.textContent = '';
    try {
      const response = await fetch('/api/private-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({ resource, clientId: clientId.value, accessKey: accessKey.value, next })
      });
      const result = await response.json().catch(() => null);
      accessKey.value = '';
      if (!response.ok || !result?.ok || typeof result.next !== 'string') throw new Error('not-recognized');
      stage.classList.remove('is-authenticating');
      stage.classList.add('is-success');
      document.querySelector('.grant-screen').setAttribute('aria-hidden', 'false');
      window.setTimeout(() => window.location.assign(result.next), 860);
    } catch {
      stage.classList.remove('is-authenticating');
      stage.classList.add('is-failure');
      status.textContent = 'ACCESS NOT RECOGNIZED';
      submit.disabled = false;
      submit.firstElementChild.textContent = 'ENTER EXPERIENCE';
      accessKey.focus();
    }
  });
})();
