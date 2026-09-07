(() => {
  const content = document.getElementById("content"),
    meetingId = Number(
      new URLSearchParams(location.search).get("meetingId") || 0
    );
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
  const format = value =>
    value
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "America/New_York",
        }).format(new Date(value))
      : "Não informado";
  const time = value =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    }).format(new Date(value));
  async function api(name = "agent.dashboard", input = {}, method = "GET") {
    const options = { credentials: "include", method, headers: {} };
    let url = `/api/trpc/${name}`;
    if (method === "GET") url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    else {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify({ json: input });
    }
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
        payload.error.json?.message ||
          "Não foi possível carregar o compromisso."
      );
    return payload?.result?.data?.json;
  }
  function signature(profile) {
    const name = profile?.name || "Seu agente Affinity",
      phone = profile?.phone || profile?.whatsapp || "(857) 421-8325",
      email = profile?.contactEmail || profile?.email || "";
    return String(profile?.messageSignature || "{agente_nome}\nAffinity Financial Consulting Inc.\n📞 {agente_telefone}\n✉️ {agente_email}\n🌐 www.affinityfc.org")
      .replaceAll("{agente_nome}", name).replaceAll("{agente}", name)
      .replaceAll("{agente_telefone}", phone).replaceAll("{telefone do agente}", phone)
      .replaceAll("{agente_email}", email).replaceAll("{email do agente}", email)
      .split("\n").filter(line => line.trim() && !(line.includes("✉️") && !email)).join("\n");
  }
  async function load() {
    if (!meetingId) {
      content.innerHTML = "Compromisso não identificado.";
      return;
    }
    try {
      const [data, profile] = await Promise.all([api(), api("agent.getProfile")]),
        meeting = (data?.todayMeetings || []).find(
          item => Number(item.id) === meetingId
        );
      if (!meeting)
        throw new Error(
          "Este compromisso mudou ou foi cancelado. Atualize a agenda antes de enviar qualquer mensagem."
        );
      const phone = meeting.inviteePhone || "",
        whatsapp = digits(phone),
        email = meeting.inviteeEmail || "",
        clientId = Number(meeting.clientId || 0);
      const firstName = String(meeting.inviteeName || "cliente")
        .trim()
        .split(/\s+/)[0];
      const zoom = meeting.meetingUrl || "";
      const personalSignature = signature(profile);
      const firstMessage = `Olá, ${firstName}!\n\nPassando para lembrar da nossa reunião de hoje, às ${time(meeting.startTime)} (horário de Nova York), com a Affinity Financial Consulting.${zoom ? `\n\nAcesse a reunião pelo Zoom:\n${zoom}` : ""}\n\nNos vemos em breve!\n\n${personalSignature}`;
      const scheduleLink = meeting.rescheduleUrl || profile?.calendlyUrl || "";
      const secondMessage = `Olá, ${firstName}! Tudo bem?\n\nGostaria de retomar nosso atendimento exatamente de onde paramos e dar continuidade ao que conversamos.\n\nQuando for conveniente, responda esta mensagem ou escolha um horário para continuarmos.${scheduleLink ? `\n\n📅 Escolha seu horário:\n${scheduleLink}` : ""}\n\nFico à disposição.\n\n${personalSignature}`;
      const noShowMessage = `Olá, ${firstName}! Tudo bem?\n\nNão conseguimos nos encontrar no horário marcado. Espero que esteja tudo bem.\n\nSe desejar, podemos reagendar nossa conversa para um momento mais conveniente.${scheduleLink ? `\n\n📅 Reagende aqui:\n${scheduleLink}` : ""}\n\nFico à disposição.\n\n${personalSignature}`;
      const referralMessage = `Olá, ${firstName}! Tudo bem?\n\nFoi um prazer conversar com você. Se conhece alguém que também possa se beneficiar de uma orientação financeira cuidadosa e personalizada, ficarei muito feliz com a sua indicação.\n\nPode me enviar o nome e o telefone da pessoa por aqui. Entrarei em contato com todo cuidado e respeito.\n\nMuito obrigado pela confiança!\n\n${personalSignature}`;
      let selectedTemplate = "Primeira chamada";
      content.className = "card";
      content.innerHTML = `<h2>${esc(meeting.inviteeName || meeting.eventName || "Compromisso")}</h2><p class="muted">${esc(meeting.eventName || "Reunião")}</p><div class="grid"><div class="field"><b>Data e horário</b>${esc(format(meeting.startTime))}</div><div class="field"><b>Término previsto</b>${esc(format(meeting.endTime))}</div><div class="field"><b>Telefone</b>${esc(phone || "Não informado")}</div><div class="field"><b>E-mail</b>${esc(email || "Não informado")}</div></div><div class="actions">${meeting.meetingUrl ? `<a class="primary" href="${esc(meeting.meetingUrl)}" target="_blank" rel="noopener">Entrar na reunião</a>` : ""}${clientId ? `<a href="/agentes/clientes?cliente=${clientId}">Abrir ficha completa</a>` : ""}<a href="/agentes/agenda">Voltar para a agenda</a></div>${whatsapp ? `<div class="card"><div class="eyebrow">Contato rápido</div><h2>Preparar mensagem</h2><div class="actions"><button id="template-first" class="primary">Primeira chamada</button><button id="template-second">Segunda chamada</button><button id="template-no-show">Não compareceu</button><button id="template-feedback">Pedir avaliação</button><button id="template-referral">Pedir indicação</button><button id="template-blank">Mensagem em branco</button></div><textarea id="meeting-message" style="width:100%;min-height:220px;margin-top:12px;border:1px solid #293b52;border-radius:10px;background:#050d18;color:#fff;padding:14px">${esc(firstMessage)}</textarea><div class="actions"><button id="send-whatsapp" class="primary" style="border:1px solid #dfb934;border-radius:10px;background:#dfb934;color:#050505;padding:12px 16px;font-weight:800">Abrir direto no WhatsApp</button></div></div>` : ""}`;
      const area = document.getElementById("meeting-message");
      const choose = (id, label, message) => document.getElementById(id)?.addEventListener("click", () => {
        selectedTemplate = label;
        area.value = message;
      });
      choose("template-first", "Primeira chamada", firstMessage);
      choose("template-second", "Segunda chamada", secondMessage);
      choose("template-no-show", "Não compareceu", noShowMessage);
      choose("template-referral", "Pedido de indicação", referralMessage);
      choose("template-blank", "Mensagem personalizada", "");
      document.getElementById("template-feedback")?.addEventListener("click", async () => {
        try {
          const invite = await api("agent.createServiceFeedbackInvite", { meetingId, clientName: meeting.inviteeName || "Cliente", clientEmail: email }, "POST");
          selectedTemplate = "Avaliação";
          area.value = `Olá, ${firstName}! Tudo bem?\n\nObrigado por conversar comigo. Sua opinião é muito importante para que eu possa melhorar cada vez mais meu atendimento.\n\nPreparei um formulário rápido para você me contar como foi nossa conversa, se ficou alguma dúvida e o que gostaria de analisar melhor antes de tomar uma decisão:\n\n${invite.link}\n\nPode responder com total sinceridade. Ficarei à disposição para esclarecer qualquer dúvida.\n\n${personalSignature}`;
        } catch (error) {
          alert(error.message || "Não foi possível criar o link de avaliação.");
        }
      });
      document.getElementById("send-whatsapp")?.addEventListener("click", async () => {
        if (!area.value.trim()) {
          location.href = `whatsapp://send?phone=${whatsapp}`;
          return;
        }
        try {
          await api("agent.logMeetingMessage", { meetingId, template: selectedTemplate, channel: "whatsapp", message: area.value }, "POST");
        } catch {}
        location.href = `whatsapp://send?phone=${whatsapp}&text=${encodeURIComponent(area.value)}`;
      });
    } catch (error) {
      content.innerHTML = esc(error.message);
    }
  }
  load();
})();
