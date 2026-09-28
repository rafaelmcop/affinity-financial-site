(() => {
  if (!location.pathname.startsWith('/agentes/')) return;
  const policySearch = location.pathname === '/agentes/apolices' ? new URLSearchParams(location.search).get('busca') : '';
  if (policySearch) {
    const applySearch = () => {
      const input = [...document.querySelectorAll('input')].find(item => /buscar por cliente/i.test(item.placeholder || ''));
      if (!input || input.dataset.caseSearchApplied) return false;
      input.dataset.caseSearchApplied = '1';
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, policySearch);
      input.dispatchEvent(new Event('input', {bubbles:true}));
      return true;
    };
    if (!applySearch()) new MutationObserver((_, observer) => { if (applySearch()) observer.disconnect(); }).observe(document.body,{childList:true,subtree:true});
  }
  let dashboard;
  async function getDashboard() {
    if (!dashboard) dashboard = fetch('/api/trpc/agent.dashboard?input=' + encodeURIComponent(JSON.stringify({json:{}})), {credentials:'include'}).then(r => r.json()).then(p => p?.result?.data?.json);
    return dashboard;
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    const match = button?.textContent?.match(/\[Pagamento\s+([^\]]+)\]/i);
    if (!button || !match) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const data = await getDashboard();
      const prefix = `[Pagamento ${match[1]}]`;
      const task = (data?.tasks || []).find(item => String(item.title || '').startsWith(prefix));
      if (!task?.id) throw new Error('Caso não localizado');
      location.href = `/agentes/caso-pagamento?task=${Number(task.id)}`;
    } catch {
      location.href = '/agentes/tarefas';
    }
  }, true);
})();
