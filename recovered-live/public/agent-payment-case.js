(() => {
  const taskId = Number(new URLSearchParams(location.search).get("task") || 0);
  const content = document.getElementById("content");
  const esc = value =>
    String(value ?? "").replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]
    );
  const digits = value => String(value || "").replace(/\D/g, "");
  const money = value =>
    value===null||value===undefined||String(value).trim()===""||!Number.isFinite(Number(value))||Number(value)<=0 ? "Não informado" : Number(value).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  const date = value =>
    value
      ? new Date(
          String(value).replace(" ", "T") +
            (String(value).includes("Z") ? "" : "Z")
        ).toLocaleString("pt-BR")
      : "Não registrada";
  async function api(name, input = {}, mutation = false) {
    const options = {
      credentials: "include",
      headers: { "content-type": "application/json" },
    };
    let url = `/api/trpc/${name}`;
    if (mutation) {
      options.method = "POST";
      options.body = JSON.stringify({ json: input });
    } else
      url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    const response = await fetch(url, options),
      text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("O portal não respondeu corretamente.");
    }
    if (payload?.error)
      throw new Error(
        payload.error.json?.message || "Não foi possível abrir o caso"
      );
    return payload?.result?.data?.json;
  }
  async function loadCase() {
    const response = await fetch(
      `/api/agent/payment-case?taskId=${encodeURIComponent(taskId)}`,
      { credentials: "include", cache: "no-store" }
    );
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("O portal não respondeu corretamente.");
    }
    if (!response.ok || payload?.error)
      throw new Error(payload?.error || "Não foi possível abrir o caso");
    return payload;
  }
  async function load() {
    try {
      if (!taskId) throw new Error("Pendência inválida");
      const data = (await loadCase()) || {};
      const task = data.task || {},
        candidate = data.candidate || {},
        history = Array.isArray(data.history) ? data.history : [];
      const identified = Boolean(data.client && candidate.policyNumber);
      const policy=data.policy||{}, name=policy.clientName||data.client?.name||candidate.name||"", email=data.client?.email||policy.clientEmail||candidate.email||"";
      const frequency=String(policy.premiumFrequency||"monthly").trim().toLowerCase();
      const divisor=({monthly:1,month:1,mensal:1,annual:12,annually:12,yearly:12,anual:12,quarterly:3,trimestral:3,"semi-annual":6,semiannual:6,"semi-annually":6,semestral:6})[frequency];
      const monthly=divisor?Number(policy.premiumAmount)/divisor:null;
      const status = String(data.notice?.actionStatus || "needs_review");
      const statusClass =
        status === "sent" ? "sent" : status === "failed" ? "failed" : "review";
      const statusText =
        status === "sent"
          ? "E-mail enviado"
          : identified
            ? "Cliente identificado - mensagem pronta"
            : "Confirme os dados encontrados no e-mail";
      const phone =
          data.client?.phone || data.client?.whatsapp || policy.clientPhone || candidate.phone || "",
        whatsapp = digits(phone);
      content.innerHTML = `<section class="card"><span class="status ${statusClass}">${statusText}</span><h2>${esc(name || "Pagamento pendente")}</h2><p class="muted">${esc(data.notice?.actionDetail || "Revise os dados encontrados e tome a ação necessária.")}</p><div class="grid"><div><b>Cliente</b>${esc(name || "Ainda não identificado")}</div><div><b>Apólice</b>${esc(candidate.policyNumber || "Ainda não identificada")}</div><div><b>Telefone</b>${esc(phone || "Não informado")}</div><div><b>E-mail</b>${esc(email || "Não informado")}</div><div><b>Produto</b>${esc(data.policy?.product || "Não informado")}</div><div><b>Status</b>${esc(data.policy?.status || "Não informado")}</div><div><b>Data da aplicação</b>${esc(data.policy?.issuedAt || "Não informada")}</div><div><b>Prêmio mensal</b>${money(monthly)}${divisor>1?" (equivalente mensal)":""}</div><div><b>Target premium anual</b>${data.policy ? money(data.policy.targetPremium) : "Não informado"}</div><div><b>Cobertura</b>${data.policy ? money(data.policy.coverageAmount) : "Não informada"}</div><div><b>Beneficiários</b>${esc(data.policy?.beneficiaries || "Não informados")}</div></div><div class="actions">${data.client ? `<a class="primary" href="/agentes/cliente?clientId=${data.client.id}">Abrir ficha completa do cliente</a>` : ""}${data.policy ? `<a href="/agentes/crm?setor=inforce&busca=${encodeURIComponent(data.policy.policyNumber || "")}">Abrir esta apólice</a>` : ""}<button id="resolve" style="background:#166534!important;color:#fff!important;border:2px solid #14532d!important;font-weight:800">Concluído</button><button id="delete" style="background:#b91c1c!important;color:#fff!important;border:2px solid #991b1b!important;font-weight:800">Excluir</button></div></section>
      <section class="card"><div class="eyebrow">Mensagem pronta</div><h2>Aviso de pagamento</h2><label>Assunto<input id="prepared-subject" value="${esc(data.prepared?.subject || "Atualização importante sobre sua apólice")}"></label><label><textarea id="prepared-message">${esc(data.prepared?.message || "")}</textarea></label><div class="actions">${whatsapp ? '<button id="whatsapp-ready" class="primary">Abrir direto no WhatsApp</button><button id="whatsapp-blank">WhatsApp em branco</button>' : ""}${candidate.email ? '<button id="email-ready">Enviar e-mail pelo portal</button>' : ""}<button id="copy-message">Copiar mensagem</button></div></section>
      <section class="card" ${identified ? "hidden" : ""}><div class="eyebrow">Identificação assistida</div><h2>Confirmar ou completar cliente</h2><p class="muted">Os dados encontrados no e-mail já aparecem preenchidos. O portal procura o cadastro por nome, e-mail ou apólice e une as informações sem duplicar.</p><form id="identify-form" class="form-grid"><label>Nome do cliente<input name="name" required value="${esc(candidate.name)}"></label><label>Número da apólice<input name="policyNumber" required value="${esc(candidate.policyNumber)}"></label><label>E-mail<input name="email" type="email" value="${esc(candidate.email)}"></label><label>Telefone / WhatsApp<input name="phone" value="${esc(phone)}"></label><div class="actions wide"><button class="primary" type="submit">Relacionar cadastro e preparar mensagem</button></div></form></section>
      <section class="card"><div class="eyebrow">E-mail recebido</div><h2>${esc(data.notice?.subject || "E-mail de pagamento")}</h2><p class="muted">${date(data.notice?.sentAt)}</p><div class="message">${esc(data.notice?.body || "Conteúdo original indisponível.")}</div></section>
      <section class="card"><div class="eyebrow">Auditoria</div><h2>Histórico de mensagens</h2><div class="history">${history.length ? history.map(item => `<article class="email ${item.direction === "sent" ? "out" : "in"}"><b>${item.direction === "sent" ? "Enviado" : "Recebido"} · ${date(item.sentAt)}</b><h3>${esc(item.subject)}</h3><div class="message">${esc(item.body)}</div></article>`).join("") : '<div class="empty">Nenhum e-mail enviado pelo agente.</div>'}${(data.interactions||[]).map(item=>`<article class="email out"><b>${esc(String(item.type).toUpperCase())} · ${date(item.createdAt)}</b><div class="message">${esc(item.content)}</div></article>`).join('')}</div></section>`;
      if(data.resolution){const banner=document.createElement('p');banner.style.cssText='padding:14px;background:#e5f4e9!important;color:#123b27!important;border:1px solid #6eab83;border-radius:8px;font-weight:700';banner.textContent=(data.resolution.state==='archived'?'Excluído':'Concluído')+' por '+data.resolution.actorName+' · '+date(data.resolution.actedAt);content.prepend(banner);document.getElementById('resolve').hidden=true;if(data.resolution.state==='archived'){document.getElementById('delete').hidden=true;const restore=document.createElement('button');restore.textContent='Restaurar pendência';restore.hidden=data.actionPermissions?.delete===false;restore.onclick=async()=>{if(await(await import('/notification-actions.js?v=1')).notificationAction('payment',taskId,'restore'))await load();};banner.append(' ',restore);}}
      if(data.actionPermissions?.complete===false)document.getElementById('resolve').hidden=true;if(data.actionPermissions?.delete===false)document.getElementById('delete').hidden=true;
      const message = () => document.getElementById("prepared-message").value;
      const subject = () => document.getElementById("prepared-subject").value;
      document.getElementById("copy-message").onclick = async () => {
        await navigator.clipboard.writeText(message());
        alert("Mensagem copiada.");
      };
      document
        .getElementById("whatsapp-ready")
        ?.addEventListener("click", async () => {
          try{const {openWhatsApp}=await import("/portal-interactions.js?v=9");await openWhatsApp({phone:whatsapp,text:message()});}catch(error){alert(error.message);}
        });
      document
        .getElementById("whatsapp-blank")
        ?.addEventListener("click", async () => {
          try{const {openWhatsApp}=await import("/portal-interactions.js?v=9");await openWhatsApp({phone:whatsapp,text:""});}catch(error){alert(error.message);}
        });
      document.getElementById("email-ready")?.addEventListener("click", async event => {
        if(!await (await import('/portal-interactions.js?v=9')).confirmPortalMessage(`Enviar este e-mail para ${candidate.name} (${candidate.email})?`))return;
        const button=event.currentTarget;button.disabled=true;button.textContent="Enviando…";
        try{await api("agent.sendPaymentCaseEmail",{taskId,subject:subject(),body:message(),confirmed:true},true);alert("E-mail enviado e registrado na auditoria.");await load();}catch(error){alert(error.message);button.disabled=false;button.textContent="Enviar e-mail pelo portal";}
      });
      const form = document.getElementById("identify-form");
      if (form)
        form.onsubmit = async event => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(form).entries());
          const button = form.querySelector("button");
          button.disabled = true;
          button.textContent = "Relacionando…";
          try {
            await api("agent.resolvePaymentCase", { taskId, ...values }, true);
            location.reload();
          } catch (error) {
            alert(error.message);
            button.disabled = false;
            button.textContent = "Relacionar cadastro e preparar mensagem";
          }
        };
      document.getElementById('resolve').onclick=async()=>{if(await(await import('/notification-actions.js?v=1')).notificationAction('payment',taskId,'complete'))await load();};
      document.getElementById('delete').onclick=async()=>{if(await(await import('/notification-actions.js?v=1')).notificationAction('payment',taskId,'archive'))await load();};
    } catch (error) {
      content.innerHTML = `<div class="card empty">${esc(error.message || "Não foi possível abrir este caso.")}</div>`;
    }
  }
  load();
})();
