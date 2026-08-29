(() => {
  if (location.pathname !== "/agentes/clientes") return;
  const api = async (name, input = {}) => {
    const response = await fetch(`/api/trpc/${name}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, { credentials: "include" });
    const payload = await response.json();
    if (payload?.error) throw new Error(payload.error.json?.message || payload.error.message || "Não foi possível carregar");
    return payload?.result?.data?.json;
  };
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let clients = [], selectedId = 0, mountedName = "";
  const getClients = async () => { if (!clients.length) clients = await api("agent.listClients") || []; return clients; };
  const recapText = (value) => {
    if (!value) return '<p class="text-gray-500">Não informado pelo Calendly.</p>';
    const list = Array.isArray(value) ? value : [value];
    return list.map((item) => `<p class="mb-2 whitespace-pre-wrap">${esc(typeof item === "string" ? item : item.text || item.title || item.description || JSON.stringify(item))}</p>`).join("");
  };
  const ensureDialog = () => {
    if (document.getElementById("client-recap-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "client-recap-dialog";
    dialog.className = "w-[min(820px,calc(100%-28px))] max-h-[88vh] rounded-2xl border border-[#52647b] bg-[#0b1728] p-0 text-white backdrop:bg-black/80";
    dialog.innerHTML = '<div class="max-h-[88vh] overflow-auto p-6"><div class="flex items-start justify-between gap-4"><div><h2 id="client-recap-title" class="text-2xl font-bold text-[#dfb934]">Resumo da reunião</h2><p id="client-recap-date" class="mt-1 text-sm text-gray-400"></p></div><button id="client-recap-close" class="rounded-md border border-white/20 px-3 py-2">Fechar</button></div><div class="mt-5 border-t border-white/10 pt-4"><h3 class="font-bold text-[#dfb934]">Resumo</h3><div id="client-recap-summary" class="mt-2 leading-relaxed"></div></div><div class="mt-5 border-t border-white/10 pt-4"><h3 class="font-bold text-[#dfb934]">Próximos passos</h3><div id="client-recap-actions" class="mt-2 leading-relaxed"></div></div><div class="mt-5 border-t border-white/10 pt-4"><h3 class="font-bold text-[#dfb934]">Pontos discutidos</h3><div id="client-recap-discussion" class="mt-2 leading-relaxed"></div></div><details class="mt-5 border-t border-white/10 pt-4"><summary class="cursor-pointer font-bold text-[#dfb934]">Ver transcrição</summary><div id="client-recap-transcript" class="mt-3 max-h-80 overflow-auto rounded-xl bg-black/40 p-4 leading-relaxed"></div></details></div>';
    document.body.appendChild(dialog);
    document.getElementById("client-recap-close").onclick = () => dialog.close();
    dialog.onclick = (event) => { if (event.target === dialog) dialog.close(); };
  };
  const openRecap = async (id) => {
    try {
      const row = await api("agent.calendlyRecap", { id });
      document.getElementById("client-recap-title").textContent = row.title || "Resumo da reunião";
      document.getElementById("client-recap-date").textContent = row.startTime ? new Date(row.startTime).toLocaleString("pt-BR") : "";
      document.getElementById("client-recap-summary").innerHTML = recapText(row.summary);
      document.getElementById("client-recap-actions").innerHTML = recapText(row.actionItems);
      document.getElementById("client-recap-discussion").innerHTML = recapText(row.discussion);
      document.getElementById("client-recap-transcript").innerHTML = recapText(row.transcript);
      document.getElementById("client-recap-dialog").showModal();
    } catch (error) { alert(error.message); }
  };
  const render = async (host, clientId) => {
    host.innerHTML = '<p class="text-sm text-gray-400">Carregando resumos…</p>';
    try {
      const rows = await api("agent.calendlyRecaps", { clientId });
      host.innerHTML = rows.length ? rows.map((row) => `<button type="button" data-client-recap="${esc(row.id)}" class="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left hover:border-[#dfb934]/60"><span><strong class="block text-white">${esc(row.title || "Resumo da reunião")}</strong><small class="mt-1 block text-gray-400">${row.startTime ? new Date(row.startTime).toLocaleString("pt-BR") : "Data não informada"}</small></span><span class="font-bold text-[#dfb934]">Ver recap</span></button>`).join("") : '<p class="text-sm text-gray-500">Nenhum Meeting Recap encontrado para este cliente.</p>';
      host.querySelectorAll("[data-client-recap]").forEach((button) => button.onclick = () => openRecap(button.dataset.clientRecap));
    } catch (error) { host.innerHTML = `<p class="text-sm text-red-300">${esc(error.message)}</p>`; }
  };
  const mount = async () => {
    const marker = [...document.querySelectorAll("p")].find((node) => node.textContent.trim() === "Ficha do cliente");
    if (!marker) { mountedName = ""; return; }
    const card = marker.closest("div.rounded-xl") || marker.parentElement?.parentElement?.parentElement;
    const name = marker.parentElement?.querySelector("h2")?.textContent?.trim();
    if (!card || !name || (mountedName === name && document.getElementById("client-meeting-recaps"))) return;
    const rows = await getClients();
    const client = rows.find((item) => String(item.name || "").trim() === name);
    if (!client) return;
    selectedId = Number(client.id); mountedName = name;
    document.getElementById("client-meeting-recaps")?.remove();
    const section = document.createElement("div");
    section.id = "client-meeting-recaps";
    section.className = "mt-4 rounded-xl border border-[#dfb934]/25 bg-black/25 p-4";
    section.innerHTML = '<div class="mb-3"><p class="text-xs font-bold uppercase tracking-[.16em] text-[#dfb934]">Meeting Recaps</p><p class="mt-1 text-sm text-gray-400">Resumos e transcrições das reuniões deste cliente.</p></div><div id="client-recap-list" class="grid gap-2"></div>';
    card.appendChild(section);
    ensureDialog();
    render(document.getElementById("client-recap-list"), selectedId);
  };
  let timer;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(mount, 80); }).observe(document.documentElement, { childList: true, subtree: true });
  mount();
})();
