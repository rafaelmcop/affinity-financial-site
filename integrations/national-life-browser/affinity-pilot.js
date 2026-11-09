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
      delete start.dataset.connectorReady;
      start.disabled = false;
      progress.textContent = 'Recarregue a página depois de atualizar a extensão.';
    }
  }

  start.addEventListener('click', async () => {
    if(start.dataset.connectorReady!=='true')return;
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
  });
  chrome.runtime.sendMessage({type:'nlg-ready'}).then(ready=>{
    if(!ready?.ok)throw Error('A extensão não respondeu.');
    start.dataset.connectorReady='true';
    start.disabled=false;
    progress.textContent='Extensão '+ready.version+' pronta.';
    setInterval(refresh, 1200);
    void refresh();
  }).catch(()=>{
    progress.textContent='A extensão não respondeu. Recarregue o conector e esta página.';
  });
})();
