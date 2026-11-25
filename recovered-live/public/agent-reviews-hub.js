(() => {
  if (location.pathname !== '/agentes/avaliacoes') return;
  const install = () => {
    if (document.getElementById('request-review-from-hub')) return true;
    const heading = [...document.querySelectorAll('h1')].find((item) => item.textContent.includes('Avaliações'));
    if (!heading?.parentElement) return false;
    const button = document.createElement('button');
    button.id = 'request-review-from-hub';
    button.type = 'button';
    button.textContent = '+ Solicitar nova avaliação';
    button.style.cssText = 'margin-top:16px;padding:11px 16px;border:0;border-radius:9px;background:#dfb934;color:#050505;font-weight:900;cursor:pointer';
    button.addEventListener('click', () => location.href = '/agent-review-invites.html');
    heading.parentElement.appendChild(button);
    return true;
  };
  if (!install()) {
    const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
