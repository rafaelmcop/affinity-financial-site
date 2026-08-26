(() => {
  const taskId = Number(new URLSearchParams(location.search).get('task') || 0);
  const content = document.getElementById('content');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => Number(value || 0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const date = value => {
    if (!value) return 'Não registrada';
    const parsed = new Date(String(value).replace(' ','T') + (String(value).includes('Z') ? '' : 'Z'));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('pt-BR');
  };
  async function api(name,input={},mutation=false) {
    const options = {credentials:'include',headers:{'content-type':'application/json'}};
    let url = '/api/trpc/' + name;
    if (mutation) { options.method='POST'; options.body=JSON.stringify({json:input}); }
    else url += '?input=' + encodeURIComponent(JSON.stringify({json:input}));
    const response = await fetch(url,options), text = await response.text();
    let payload;
    try { payload=JSON.parse(text); } catch { throw Error('O portal não respondeu corretamente. Atualize a página e tente novamente.'); }
    if (payload?.error) throw Error(payload.error.json?.message || 'Não foi possível abrir o caso');
    const data = payload?.result?.data?.json;
    if (data === undefined) throw Error('Os dados deste caso ainda não estão disponíveis.');
    return data;
  }
  function actionStatus(notice) {
    const status = String(notice?.actionStatus || 'needs_review');
    return status === 'sent' ? ['sent','Mensagem automática enviada'] : status === 'failed' ? ['failed','Falha no envio'] : ['review','Ação manual necessária'];
  }
  async function load() {
    try {
      if (!taskId) throw Error('Pendência inválida');
      const response = await api('agent.paymentCase',{taskId});
      const data = response && typeof response === 'object' ? response : {};
      const task = data.task || {}, history = Array.isArray(data.history) ? data.history : [];
      const [statusClass,statusText] = actionStatus(data.notice);
      content.innerHTML = `<section class="card"><span class="status ${statusClass}">${statusText}</span><h2>${esc(task.title||'Pendência de pagamento')}</h2><p class="muted">${esc(data.notice?.actionDetail||'O sistema ainda precisa relacionar esta notificação ao cadastro correto.')}</p><div class="grid"><div><b>Cliente</b>${esc(data.client?.name||'Ainda não identificado')}</div><div><b>Apólice</b>${esc(data.policy?.policyNumber||data.notice?.policyNumber||'Ainda não identificada')}</div><div><b>Produto</b>${esc(data.policy?.product||'Não informado')}</div><div><b>Status da apólice</b>${esc(data.policy?.status||'Não informado')}</div><div><b>Premium</b>${data.policy?money(data.policy.premiumAmount):'Não informado'}</div><div><b>Cobertura</b>${data.policy?money(data.policy.coverageAmount):'Não informada'}</div></div><div class="actions">${data.client?`<a href="/agentes/clientes?cliente=${data.client.id}&conversa=1">Abrir cliente e conversa</a>`:''}${data.policy?`<a href="/agentes/apolices?busca=${encodeURIComponent(data.policy.policyNumber||'')}">Abrir esta apólice</a>`:''}<button class="primary" id="resolve">Marcar como resolvido</button><button id="delete">Excluir pendência</button></div></section><section class="card"><div class="eyebrow">Aviso recebido</div><h2>${esc(data.notice?.subject||'E-mail de pagamento')}</h2><p class="muted">${date(data.notice?.sentAt)}</p><div class="message">${esc(data.notice?.body||'O conteúdo original não está disponível neste registro.')}</div></section><section class="card"><div class="eyebrow">Auditoria do cliente</div><h2>Histórico de mensagens</h2><p class="muted">Aqui aparece o que foi realmente enviado ou recebido para este cliente.</p><div class="history">${history.length?history.map(item=>`<article class="email ${item.direction==='sent'?'out':'in'}"><b>${item.direction==='sent'?'Enviado pelo portal':'Recebido do cliente'} · ${date(item.sentAt)}</b><h3>${esc(item.subject)}</h3><div class="message">${esc(item.body)}</div></article>`).join(''):'<div class="empty">Nenhuma mensagem registrada para este cliente.</div>'}</div></section>`;
      document.getElementById('resolve').onclick = async () => { await api('agent.toggleTask',{id:taskId,completed:true},true); location.href='/agentes/dashboard'; };
      document.getElementById('delete').onclick = async () => { if (!confirm('Excluir esta pendência?')) return; await api('agent.deleteTask',{id:taskId},true); location.href='/agentes/dashboard'; };
    } catch (error) {
      content.innerHTML = `<div class="card empty">${esc(error instanceof Error ? error.message : 'Não foi possível abrir este caso.')}</div>`;
    }
  }
  load();
})();
