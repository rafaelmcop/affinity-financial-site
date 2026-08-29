(() => {
  if (location.pathname !== "/agentes/configuracoes") return;

  const api = async (name, input = {}, method = "GET") => {
    const options = { credentials: "include" };
    let url = `/api/trpc/${name}`;
    if (method === "GET") url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    else {
      options.method = "POST";
      options.headers = { "content-type": "application/json" };
      options.body = JSON.stringify({ json: input });
    }
    const response = await fetch(url, options);
    const payload = await response.json();
    if (payload?.error) throw new Error(payload.error.json?.message || payload.error.message || "Não foi possível concluir");
    return payload?.result?.data?.json;
  };
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const card = document.createElement("section");
  card.id = "calendly-settings-card";
  card.className = "rounded-xl border border-[#2d4665] bg-[#0b1524] p-6 text-white";
  card.innerHTML = `
    <h2 class="text-xl font-bold text-[#dfb934]">Agenda, perfil público e Meeting Recaps</h2>
    <p class="mt-2 text-sm leading-relaxed text-gray-400">Conecte sua própria conta do Calendly e configure a página pública que você enviará aos clientes.</p>
    <div id="calendly-settings-status" class="mt-4 rounded-lg bg-black/30 p-3 text-sm text-gray-300">Carregando configuração…</div>
    <div id="calendly-token-area" class="mt-4 hidden">
      <label class="block text-sm text-gray-300">Token pessoal do Calendly<input id="calendly-settings-token" type="password" autocomplete="off" class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white" /></label>
      <details class="mt-3 text-xs text-gray-400"><summary class="cursor-pointer font-bold text-[#dfb934]">Permissões necessárias</summary><p class="mt-2 leading-relaxed">users:read, invitees:read, contacts:read, meeting_recaps:read, event_types:write, availability:write, scheduled_events:write, locations:read, scheduling_links:write e webhooks:write.</p></details>
      <button id="calendly-settings-connect" class="mt-4 w-full rounded-md bg-[#dfb934] px-4 py-2.5 font-bold text-black">Conectar agenda</button>
    </div>
    <div id="calendly-connected-actions" class="mt-4 hidden flex flex-wrap gap-2">
      <button id="calendly-settings-sync" class="rounded-md bg-[#dfb934] px-4 py-2.5 font-bold text-black">Atualizar agenda</button>
      <button id="calendly-settings-disconnect" class="rounded-md border border-red-800 px-4 py-2.5 font-bold text-red-200">Desconectar</button>
      <a href="/agentes/agenda" class="rounded-md border border-white/20 px-4 py-2.5 font-bold text-white">Abrir agenda</a>
    </div>
    <div class="mt-6 border-t border-white/10 pt-5">
      <h3 class="font-bold text-[#dfb934]">Perfil público do agente</h3>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="text-sm text-gray-300">Endereço do perfil<input id="public-slug" class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white" placeholder="seu-nome" /></label>
        <label class="text-sm text-gray-300">Título profissional<input id="public-headline" class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white" placeholder="Consultor financeiro" /></label>
        <label class="text-sm text-gray-300">Consultor desde<input id="public-since" type="number" min="1950" max="2100" class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white" /></label>
        <label class="text-sm text-gray-300">URL da foto<input id="public-photo" type="url" class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white" placeholder="https://…" /></label>
        <label class="text-sm text-gray-300 sm:col-span-2">Link público do Calendly<input id="public-calendly" type="url" class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white" placeholder="https://calendly.com/…" /></label>
        <label class="text-sm text-gray-300 sm:col-span-2">Apresentação<textarea id="public-bio" class="mt-2 min-h-28 w-full rounded-md border border-white/20 bg-black p-3 text-white" placeholder="Conte sua experiência e como ajuda seus clientes"></textarea></label>
      </div>
      <label class="mt-4 flex items-center gap-2 text-sm text-gray-300"><input id="public-active" type="checkbox" /> Perfil público ativo</label>
      <div class="mt-4 flex flex-wrap gap-2"><button id="public-save" class="rounded-md bg-[#dfb934] px-4 py-2.5 font-bold text-black">Salvar perfil público</button><a id="public-open" target="_blank" class="hidden rounded-md border border-white/20 px-4 py-2.5 font-bold text-white">Abrir perfil</a></div>
    </div>`;

  let mounted = false;
  const mount = () => {
    if (mounted) return;
    const main = document.querySelector("main");
    if (!main || !main.textContent.includes("Configurações")) return;
    main.appendChild(card);
    mounted = true;
    bind();
    load();
  };
  const status = (message, error = false) => {
    const node = document.getElementById("calendly-settings-status");
    node.textContent = message;
    node.className = `mt-4 rounded-lg p-3 text-sm ${error ? "bg-red-500/10 text-red-200" : "bg-black/30 text-gray-300"}`;
  };
  const load = async () => {
    try {
      const data = await api("agent.getCalendly");
      const connected = Boolean(data?.connection);
      document.getElementById("calendly-token-area").classList.toggle("hidden", connected);
      document.getElementById("calendly-connected-actions").classList.toggle("hidden", !connected);
      status(connected ? `Calendly conectado${data.connection.lastSyncAt ? ` · Última atualização: ${new Date(data.connection.lastSyncAt).toLocaleString("pt-BR")}` : ""}` : "Calendly ainda não conectado.");
      const profile = data?.profile || {};
      document.getElementById("public-slug").value = profile.slug || "";
      document.getElementById("public-headline").value = profile.headline || "";
      document.getElementById("public-since").value = profile.sinceYear || "";
      document.getElementById("public-photo").value = profile.photoUrl || "";
      document.getElementById("public-calendly").value = profile.calendlyUrl || "";
      document.getElementById("public-bio").value = profile.bio || "";
      document.getElementById("public-active").checked = profile.isPublished !== 0;
      if (profile.slug) {
        const link = document.getElementById("public-open");
        link.href = `/consultor/${encodeURIComponent(profile.slug)}`;
        link.classList.remove("hidden");
      }
    } catch (error) { status(error.message, true); }
  };
  const bind = () => {
    document.getElementById("calendly-settings-connect").onclick = async () => {
      const token = document.getElementById("calendly-settings-token").value.trim();
      if (!token) return status("Cole o token do Calendly.", true);
      try { status("Conectando e sincronizando…"); await api("agent.connectCalendly", { token }, "POST"); document.getElementById("calendly-settings-token").value = ""; await load(); } catch (error) { status(error.message, true); }
    };
    document.getElementById("calendly-settings-sync").onclick = async () => { try { status("Atualizando agenda…"); const result = await api("agent.syncCalendly", {}, "POST"); status(`${result?.saved || 0} reunião(ões) conferida(s).`); } catch (error) { status(error.message, true); } };
    document.getElementById("calendly-settings-disconnect").onclick = async () => { if (!confirm("Desconectar sua agenda?")) return; try { await api("agent.disconnectCalendly", {}, "POST"); await load(); } catch (error) { status(error.message, true); } };
    document.getElementById("public-save").onclick = async () => {
      try {
        const result = await api("agent.savePublicProfile", { slug: document.getElementById("public-slug").value, headline: document.getElementById("public-headline").value, sinceYear: document.getElementById("public-since").value, photoUrl: document.getElementById("public-photo").value, calendlyUrl: document.getElementById("public-calendly").value, bio: document.getElementById("public-bio").value, isPublished: document.getElementById("public-active").checked }, "POST");
        status("Perfil público salvo.");
        const link = document.getElementById("public-open"); link.href = result.url; link.classList.remove("hidden");
      } catch (error) { status(error.message, true); }
    };
  };
  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  mount();
})();
