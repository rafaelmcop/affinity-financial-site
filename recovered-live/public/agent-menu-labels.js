(() => {
  if (!location.pathname.startsWith('/agentes/')) return;
  const update = () => {
    document.querySelectorAll('nav button').forEach((button) => {
      const text = (button.textContent || '').trim();
      if (!text.startsWith('Aplicações concluídas')) return;
      const label = [...button.querySelectorAll('span')].find((span) => (span.textContent || '').trim() === 'Aplicações concluídas');
      if (label) label.textContent = 'Apólices concluídas';
    });
  };
  update();
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
