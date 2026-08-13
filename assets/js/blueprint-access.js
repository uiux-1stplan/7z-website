(() => {
  const destination = '/api/private-documents/blueprint';
  document.querySelectorAll('[data-blueprint-access]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const documentTab = window.open(destination, '_blank');
      if (documentTab) documentTab.opener = null;
      else window.location.assign(destination);
    });
  });
})();
