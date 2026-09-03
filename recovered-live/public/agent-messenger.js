(() => {
  if (document.querySelector('[data-affinity-messenger], [aria-label^="Abrir chat"]')) return;

  async function api(name, input = {}, method = 'GET') {
    const options = { credentials: 'include', cache: 'no-store' };
    let url = `/api/trpc/${name}`;
    if (method === 'GET') url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}&fresh=${Date.now()}`;
    else {
      options.method = 'POST';
      options.headers = { 'content-type': 'application/json' };
      options.body = JSON.stringify({ json: input });
    }
    const response = await fetch(url, options);
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch { throw new Error('O portal não respondeu corretamente.'); }
    if (!response.ok || payload?.error) throw new Error(payload?.error?.json?.message || payload?.error?.message || 'Não foi possível concluir.');
    return payload?.result?.data?.json;
  }

  const root = document.createElement('section');
  root.dataset.affinityMessenger = 'true';
  root.innerHTML = `<button type="button" class="af-chat-launcher" aria-label="Abrir chat"><span class="af-chat-symbol">◯</span><span>Mensagens</span><b class="af-chat-badge" hidden></b></button><div class="af-chat-panel" hidden><header><div><strong>Mensagens internas</strong><small>Administração e agentes</small></div><button type="button" data-chat-close aria-label="Minimizar chat">−</button></header><div class="af-chat-tools"><select data-chat-contact aria-label="Contato"><option value="__admin__">Administração</option></select></div><div class="af-chat-messages"><p>Carregando conversa…</p></div><form class="af-chat-compose"><input data-chat-input maxlength="10000" placeholder="Escreva uma mensagem" autocomplete="off"><button type="submit">Enviar</button></form></div>`;
  document.body.appendChild(root);
  const style = document.createElement('style');
  style.textContent = `[data-affinity-messenger]{font-family:Lato,Arial,sans-serif}.af-chat-launcher{position:fixed!important;right:24px!important;bottom:22px!important;z-index:1000!important;display:flex!important;align-items:center!important;gap:10px!important;height:56px!important;padding:0 20px!important;border:1px solid #dfb934!important;border-radius:999px!important;background:#122742!important;color:#fff!important;font-weight:900!important;box-shadow:0 16px 40px #0009!important;cursor:pointer!important}.af-chat-launcher:hover{background:#193554!important}.af-chat-symbol{display:grid;width:24px;height:24px;place-items:center;border:2px solid #dfb934;border-radius:50%;color:#dfb934}.af-chat-badge{position:absolute;right:-3px;top:-6px;min-width:22px;height:22px;padding:3px 6px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;text-align:center}.af-chat-panel{position:fixed;right:24px;bottom:22px;z-index:1001;width:min(400px,calc(100vw - 28px));height:min(650px,calc(100vh - 44px));overflow:hidden;border:1px solid #806b2e;border-radius:18px;background:#0b1524;color:#fff;box-shadow:0 20px 55px #000c}.af-chat-panel:not([hidden]){display:flex!important;flex-direction:column}.af-chat-panel header{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-bottom:1px solid #554822;background:#122742}.af-chat-panel header small{display:block;margin-top:3px;color:#aeb7c5}.af-chat-panel header button{border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer}.af-chat-tools{padding:10px 12px;border-bottom:1px solid #24364d}.af-chat-tools select{width:100%;padding:10px;border:1px solid #354a63;border-radius:9px;background:#06101d;color:#fff}.af-chat-messages{display:flex;flex:1;flex-direction:column;gap:9px;overflow-y:auto;padding:14px;background:#050b13}.af-chat-messages>p{margin:auto;color:#9ca8b8}.af-chat-message{max-width:84%;padding:10px 12px;border-radius:15px;background:#193554;white-space:pre-wrap;overflow-wrap:anywhere}.af-chat-message.mine{align-self:flex-end;background:#dfb934;color:#050505}.af-chat-message small{display:block;margin-top:5px;font-size:10px;opacity:.65;text-align:right}.af-chat-compose{display:flex;gap:8px;padding:11px;border-top:1px solid #24364d}.af-chat-compose input{min-width:0;flex:1;padding:11px;border:1px solid #354a63;border-radius:9px;background:#050b13;color:#fff}.af-chat-compose button{padding:10px 14px;border:0;border-radius:9px;background:#dfb934;color:#050505;font-weight:900;cursor:pointer}@media(max-width:899px){.af-chat-launcher{right:14px!important;bottom:14px!important}.af-chat-panel{right:7px;bottom:7px;width:calc(100vw - 14px);height:calc(100vh - 14px)}}`;
  document.head.appendChild(style);

  const launcher = root.querySelector('.af-chat-launcher');
  const panel = root.querySelector('.af-chat-panel');
  const contact = root.querySelector('[data-chat-contact]');
  const messages = root.querySelector('.af-chat-messages');
  const input = root.querySelector('[data-chat-input]');
  const badge = root.querySelector('.af-chat-badge');
  let sessionEmail = '';
  try { sessionEmail = String(JSON.parse(localStorage.getItem('agentSession') || '{}').email || '').toLowerCase(); } catch {}
  const peer = () => contact.value === '__admin__' ? '' : contact.value;

  function render(rows) {
    messages.replaceChildren();
    if (!Array.isArray(rows) || !rows.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Comece uma conversa.';
      messages.appendChild(empty);
      return;
    }
    rows.forEach(row => {
      const mine = String(row.senderEmail || '').toLowerCase() === sessionEmail;
      const bubble = document.createElement('div');
      bubble.className = `af-chat-message${mine ? ' mine' : ''}`;
      const body = document.createElement('div');
      body.textContent = row.body || '';
      const meta = document.createElement('small');
      const sent = row.sentAt ? new Date(row.sentAt).toLocaleString('pt-BR') : '';
      meta.textContent = `${sent}${mine ? ` · ${row.readAt ? 'Lido' : 'Enviado'}` : ''}`;
      bubble.append(body, meta);
      messages.appendChild(bubble);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  async function refreshUnread() {
    try {
      const data = await api('crm.internalUnreadCount', { mode: 'agent' });
      const count = Number(data?.count || 0);
      badge.hidden = count <= 0;
      badge.textContent = count > 99 ? '99+' : String(count);
      launcher.setAttribute('aria-label', count ? `Abrir chat, ${count} mensagem(ns) nova(s)` : 'Abrir chat');
    } catch {}
  }

  async function loadConversation() {
    messages.innerHTML = '<p>Carregando conversa…</p>';
    try {
      const peerEmail = peer();
      const inputData = { mode: 'agent', ...(peerEmail ? { peerEmail } : {}) };
      render(await api('crm.internalMessages', inputData));
      await api('crm.markInternalMessagesRead', inputData, 'POST');
      refreshUnread();
    } catch (error) {
      messages.replaceChildren();
      const warning = document.createElement('p');
      warning.textContent = error.message;
      messages.appendChild(warning);
    }
  }

  async function loadContacts() {
    try {
      const rows = await api('crm.assignees');
      (Array.isArray(rows) ? rows : []).filter(row => ['agent', 'both'].includes(String(row.accountType || '')) && String(row.email || '').toLowerCase() !== sessionEmail).forEach(row => {
        const option = document.createElement('option');
        option.value = String(row.email || '').toLowerCase();
        option.textContent = row.name || row.email;
        contact.appendChild(option);
      });
    } catch {}
  }

  launcher.addEventListener('click', () => { panel.hidden = false; launcher.hidden = true; loadConversation(); });
  root.querySelector('[data-chat-close]').addEventListener('click', () => { panel.hidden = true; launcher.hidden = false; });
  contact.addEventListener('change', loadConversation);
  root.querySelector('.af-chat-compose').addEventListener('submit', async event => {
    event.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const peerEmail = peer();
      await api('crm.sendInternalMessage', { mode: 'agent', ...(peerEmail ? { peerEmail } : {}), body }, 'POST');
      input.value = '';
      await loadConversation();
    } catch (error) { alert(error.message); }
    finally { button.disabled = false; }
  });
  loadContacts();
  refreshUnread();
  setInterval(refreshUnread, 10000);
  setInterval(() => { if (!panel.hidden) loadConversation(); }, 10000);
})();
