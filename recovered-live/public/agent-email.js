(() => {
  const state = { folder: 'inbox', folderId: null, items: [], selected: null, clients: [], folders: [], replyToId: null };
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  async function api(name, input = {}, mutation = false) {
    const options = { credentials: 'include', headers: {'content-type':'application/json'} };
    let url = `/api/trpc/${name}`;
    if (mutation) { options.method = 'POST'; options.body = JSON.stringify({json: input}); }
    else url += `?input=${encodeURIComponent(JSON.stringify({json: input}))}`;
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const detail = (await response.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      throw new Error(response.status >= 500
        ? 'A atualização do e-mail demorou além do limite. Tente novamente em alguns instantes.'
        : (detail.slice(0, 180) || 'O servidor devolveu uma resposta inesperada.'));
    }
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.json?.message || 'Não foi possível concluir a operação');
    return payload.result?.data?.json;
  }
  function notify(message, type = 'ok') { const box = $('notice'); box.textContent = message; box.className = `notice show ${type}`; setTimeout(() => box.className = 'notice', 6000); }
  function date(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value || '') : parsed.toLocaleString('pt-BR'); }
  const topicLabels = {returned_payment:'Pagamento retornado',exams:'Exame solicitado',extra_information:'Informações adicionais',documents:'Documento ou assinatura',underwriting:'Análise e status',general:'Geral'};
  function topic(email) { const value=email.topic || 'general'; return value === 'general' ? '' : `<span class="topic ${escape(value)}">${escape(topicLabels[value] || 'Geral')}</span>`; }
  function folderOptions(selectedId = null) { return '<option value="">Entrada / Enviados</option>' + state.folders.map(folder => `<option value="${folder.id}" ${Number(selectedId)===folder.id?'selected':''}>${escape(folder.name)}</option>`).join(''); }
  function setFolder(folder, folderId = null) {
    state.folder=folder; state.folderId=folderId; state.selected=null;
    document.querySelectorAll('[data-folder]').forEach(item=>item.classList.toggle('primary',item.dataset.folder===folder && folder!=='custom'));
    $('folder-select').value=folder==='custom'?`custom:${folderId}`:folder;
    $('detail').innerHTML='<div class="empty">Selecione uma mensagem para ler.</div>'; load();
  }
  async function loadFolders() {
    const data=await api('agent.mailboxFolders'); state.folders=data.folders || [];
    $('folder-select').innerHTML=`<option value="inbox">Entrada</option><option value="sent">Enviados</option>${state.folders.map(folder=>`<option value="custom:${folder.id}">${escape(folder.name)}${folder.total?` (${folder.total})`:''}</option>`).join('')}<option value="trash">Lixeira${data.trash?` (${data.trash})`:''}</option>`;
    $('folder-select').value=state.folder==='custom'?`custom:${state.folderId}`:state.folder;
  }
  function status(email) {
    if (!email.paymentStatus) return '';
    if (email.actionStatus === 'sent') return '<span class="pill sent">Aviso enviado automaticamente</span>';
    if (email.actionStatus === 'needs_review') return '<span class="pill pending">Ação manual necessária</span>';
    if (email.actionStatus === 'failed') return '<span class="pill failed">Falha no envio</span>';
    return '<span class="pill pending">Processando pagamento retornado</span>';
  }
  function renderList() {
    const list = $('list');
    if (!state.items.length) { list.innerHTML = '<div class="empty">Nenhuma mensagem encontrada nesta pasta.</div>'; return; }
    list.innerHTML = state.items.map(item => `<button class="email-row ${item.readAt || item.direction === 'sent' ? '' : 'unread'} ${state.selected?.id === item.id ? 'active' : ''}" data-id="${item.id}"><div class="who">${item.direction === 'received' ? escape(item.fromEmail) : `Para: ${escape(item.toEmail)}`}</div><div class="subject">${escape(item.subject)}</div><div class="preview">${escape(item.clientName || item.body)}</div>${topic(item)} <time>${escape(date(item.sentAt))}</time></button>`).join('');
    list.querySelectorAll('[data-id]').forEach(button => button.onclick = () => openMessage(Number(button.dataset.id)));
  }
  async function openMessage(id) {
    const summary = state.items.find(item => item.id === id);
    if (!summary) return;
    try { state.selected = await api('agent.mailboxMessage', {id}); } catch (error) { notify(error.message,'error'); return; }
    if (!state.selected) return;
    if (state.selected.direction === 'received' && !state.selected.readAt) { await api('agent.markMailboxRead', {id}, true); state.selected.readAt = new Date().toISOString(); load(false); }
    const item = state.selected;
    const visualBody=item.htmlBody?'<iframe class="email-frame" id="email-frame" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>':`<div class="body">${escape(item.body)}</div>`;
    const deleted=Boolean(item.deletedAt);
    $('detail').innerHTML = `<button class="back" id="back">← Voltar</button><div class="eyebrow">${item.direction === 'received' ? 'Recebido' : 'Enviado'}</div><h2>${escape(item.subject)}</h2><div class="meta"><span class="pill">De: ${escape(item.fromEmail)}</span><span class="pill">Para: ${escape(item.toEmail)}</span>${item.clientName ? `<span class="pill">Cliente: ${escape(item.clientName)}</span>` : ''}${item.policyNumber ? `<span class="pill">Apólice: ${escape(item.policyNumber)}</span>` : ''}${item.folderName?`<span class="pill">Pasta: ${escape(item.folderName)}</span>`:''}${topic(item)}${status(item)}</div>${item.actionDetail ? `<p class="muted"><strong>Ação do sistema:</strong> ${escape(item.actionDetail)}</p>` : ''}<p class="muted">${escape(date(item.sentAt))}</p>${visualBody}<div class="actions"><button class="primary" id="reply">Responder</button>${deleted?'<button id="restore">Restaurar</button>':`<select id="move-folder">${folderOptions(item.folderId)}</select><button id="move">Mover</button><button class="danger" id="delete-message">Excluir</button>`}</div>`;
    if (item.htmlBody) { const frame=$('email-frame'); frame.srcdoc=`<!doctype html><meta name="viewport" content="width=device-width"><base target="_blank"><style>body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:14px;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}</style>${item.htmlBody}`; }
    $('reply').onclick = () => compose(item);
    if (deleted) $('restore').onclick=async()=>{try{await api('agent.restoreMailboxEmail',{id:item.id},true);notify('Mensagem restaurada.');state.selected=null;await Promise.all([load(),loadFolders()]);}catch(error){notify(error.message,'error')}};
    else {
      $('move').onclick=async()=>{try{const value=$('move-folder').value;await api('agent.moveMailboxEmail',{id:item.id,folderId:value?Number(value):null},true);notify(value?'Mensagem armazenada na pasta.':'Mensagem devolvida à pasta principal.');state.selected=null;await Promise.all([load(),loadFolders()]);}catch(error){notify(error.message,'error')}};
      $('delete-message').onclick=async()=>{if(!confirm('Mover esta mensagem para a Lixeira?'))return;try{await api('agent.deleteMailboxEmail',{id:item.id},true);notify('Mensagem movida para a Lixeira.');state.selected=null;$('detail').innerHTML='<div class="empty">Selecione uma mensagem para ler.</div>';await Promise.all([load(),loadFolders()]);}catch(error){notify(error.message,'error')}};
    }
    const back = $('back'); if (back) back.onclick = () => { $('detail').classList.remove('mobile-open'); $('list').classList.remove('mobile-hidden'); };
    $('detail').classList.add('mobile-open'); $('list').classList.add('mobile-hidden'); renderList();
  }
  async function load(showLoading = true) {
    if (showLoading) $('list').innerHTML = '<div class="empty">Carregando mensagens…</div>';
    try {
      const data = await api('agent.mailbox', {folder: state.folder, folderId: state.folderId, search: $('search').value});
      state.items = data.items || []; renderList();
      for (const [id,value] of [['unread',data.unread],['side-unread',data.unread]]) { const badge=$(id); badge.textContent=value; badge.hidden=!value; }
      for (const key of ['returned_payment','exams','extra_information','documents','underwriting']) { const badge=$(`count-${key}`); const value=data.topicCounts?.[key]?.total || 0; badge.textContent=value; badge.hidden=!value; }
      $('last-update').textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · atualização automática a cada 5 minutos`;
    } catch (error) { $('list').innerHTML = `<div class="empty">${escape(error.message)}</div>`; }
  }
  function compose(reply = null) {
    state.replyToId = reply?.id || null; $('dialog-title').textContent = reply ? 'Responder e-mail' : 'Novo e-mail'; $('client-field').style.display = reply ? 'none' : 'grid'; $('to').value = reply ? (reply.direction === 'received' ? reply.fromEmail : reply.toEmail) : ''; $('subject').value = reply ? `Re: ${String(reply.subject || '').replace(/^(re:\s*)+/i,'')}` : ''; $('message').value = ''; $('modal').classList.add('open'); setTimeout(() => (reply ? $('message') : $('client')).focus(), 50);
  }
  async function init() {
    try {
      const me = await api('auth.me'); if (!me || !['agent','both'].includes(me.accountType)) { location.href='/agentes/login'; return; }
      $('account-label').textContent = `${me.name || 'Agente'} · ${me.email}`;
      state.clients = await api('agent.mailboxClients'); $('client').innerHTML = '<option value="">Selecione um dos seus clientes</option>' + state.clients.map(client => `<option value="${client.id}">${escape(client.name)} — ${escape(client.email)}</option>`).join('');
      await loadFolders();
      await load();
      setInterval(() => load(false), 300000);
    } catch (error) { notify(error.message, 'error'); }
  }
  document.querySelectorAll('[data-folder]').forEach(button => button.onclick = () => setFolder(button.dataset.folder));
  $('folder-select').onchange=()=>{const value=$('folder-select').value;if(value.startsWith('custom:'))setFolder('custom',Number(value.split(':')[1]));else setFolder(value)};
  let searchTimer; $('search').oninput = () => { clearTimeout(searchTimer); searchTimer=setTimeout(load,350); };
  $('sync').onclick = async () => { const button=$('sync'); button.disabled=true; button.textContent='Verificando…'; try { const result=await api('agent.syncInbox',{},true); notify(`${result.imported || 0} mensagem(ns) verificada(s).`); await load(); } catch(error){notify(error.message,'error')} finally{button.disabled=false;button.textContent='↻ Verificar e-mails agora'} };
  $('compose').onclick = () => compose(); $('cancel').onclick = () => $('modal').classList.remove('open'); $('client').onchange = () => { const client=state.clients.find(item=>item.id===Number($('client').value)); $('to').value=client?.email||''; };
  $('form').onsubmit = async event => { event.preventDefault(); const send=$('send'); send.disabled=true; send.textContent='Enviando…'; try { await api('agent.sendMailboxEmail',{replyToId:state.replyToId||undefined,clientId:state.replyToId?undefined:Number($('client').value),subject:$('subject').value,body:$('message').value},true); $('modal').classList.remove('open'); notify('E-mail enviado e registrado no portal.'); state.folder='sent'; document.querySelectorAll('[data-folder]').forEach(item=>item.classList.toggle('primary',item.dataset.folder==='sent')); await load(); } catch(error){notify(error.message,'error')} finally{send.disabled=false;send.textContent='Enviar'} };
  init();
})();
