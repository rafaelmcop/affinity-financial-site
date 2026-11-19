(() => {
  if (!['/agentes/clientes', '/agentes/apolices'].includes(location.pathname)) return;
  const install = () => {
    if (document.getElementById('complete-profile-file')) return true;
    const heading = document.querySelector('main h1');
    if (!heading?.parentElement) return false;
    const button = document.createElement('button');
    button.id = 'complete-profile-file';
    button.type = 'button';
    button.textContent = 'Enviar PC Sheet ou Excel';
    button.style.cssText = 'margin-top:14px;padding:11px 16px;border:0;border-radius:9px;background:#dfb934;color:#050505;font-weight:900;cursor:pointer';
    button.addEventListener('click', () => location.href = '/agentes/pcsheet');
    heading.parentElement.appendChild(button);
    return true;
  };
  if (!install()) {
    const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
