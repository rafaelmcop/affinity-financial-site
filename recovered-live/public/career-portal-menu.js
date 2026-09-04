(() => {
  const path = location.pathname;
  if (!path.startsWith('/admin/') && !path.startsWith('/agentes/')) return;
  const agentPortal = path.startsWith('/agentes/');
  let busy = false;
  async function access() {
    try {
      const response = await fetch('/api/trpc/careers.access?input=' + encodeURIComponent(JSON.stringify({json:{}})), {credentials:'include'});
      const payload = await response.json();
      return payload?.result?.data?.json || null;
    } catch { return null; }
  }
  function makeLink(anchor, key, href, label, count = 0) {
    if (document.querySelector(`[data-affinity-menu="${key}"]`)) return;
    const link = document.createElement('a');
    link.dataset.affinityMenu = key;
    link.href = href;
    link.className = anchor.className;
    link.style.textDecoration = 'none';
    link.innerHTML = `<span>${label}</span>${count > 0 ? `<b style="margin-left:auto;min-width:22px;padding:2px 6px;border-radius:99px;background:#ffb000;color:#000;font-size:11px;text-align:center">${count > 99 ? '99+' : count}</b>` : ''}`;
    anchor.parentElement?.insertBefore(link, anchor.nextSibling);
  }
  function add(info) {
    if (!info?.allowed) return;
    const elements = [...document.querySelectorAll('a,button')];
    const users = elements.find(el => /usuários|usuarios/i.test(el.textContent || ''));
    const reviews = elements.find(el => /avaliações|avaliacoes/i.test(el.textContent || ''));
    const settings = elements.find(el => /configurações|configuracoes/i.test(el.textContent || ''));
    if (agentPortal) {
      if (settings) makeLink(settings, 'careers', '/candidaturas.html?portal=agent', 'Candidaturas', Number(info.pendingCount || 0));
      return;
    }
    if (users) makeLink(users, 'careers', '/candidaturas.html?portal=admin', 'Candidaturas', Number(info.pendingCount || 0));
    const emailAnchor = reviews || users;
    if (emailAnchor) makeLink(emailAnchor, 'admin-email', '/admin/email', 'E-mail', Number(info.unreadEmails || 0));
  }
  access().then(info => {
    add(info);
    new MutationObserver(() => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => { add(info); busy = false; });
    }).observe(document.body, {childList:true, subtree:true});
  });
})();
