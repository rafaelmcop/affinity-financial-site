(() => {
  const card = document.getElementById('nlg-pilot');
  if (!card || card.hidden) return;
  const start = card.querySelector('#nlg-pilot-start');
  const progress = card.querySelector('#nlg-pilot-progress');
  const details = card.querySelector('#nlg-pilot-issues');
  const list = details.querySelector('ul');
  let rendered = 0;
  async function refresh() {
    try {
      const job = await chrome.runtime.sendMessage({type:'nlg-progress'});
      if (!job) return;
      start.disabled = job.running;
      progress.textContent = job.message;
      if (rendered === job.issues.length) return;
      rendered = job.issues.length;
      details.hidden = !rendered;
      list.replaceChildren(...job.issues.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    } catch {
      start.disabled = false;
      progress.textContent = 'Recarregue a página depois de atualizar a extensão.';
    }
  }
  start.disabled = false;
  progress.textContent = 'Extensão pronta.';
  start.onclick = async () => {
    start.disabled = true;
    progress.textContent = 'Iniciando conferência…';
    try {
      const response = await chrome.runtime.sendMessage({type:'nlg-start'});
      if (!response?.ok) throw Error(response?.error || 'Não foi possível iniciar.');
      await refresh();
    } catch (error) {
      start.disabled = false;
      progress.textContent = error.message;
    }
  };
  setInterval(refresh, 1200);
  void refresh();
})();
