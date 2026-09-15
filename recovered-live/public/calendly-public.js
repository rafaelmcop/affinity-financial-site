(() => {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="calendly.com/affinityfc/consultoria-gratuita"]');
    if (!link) return;
    event.preventDefault();
    location.href = '/agendar';
  }, true);
})();
