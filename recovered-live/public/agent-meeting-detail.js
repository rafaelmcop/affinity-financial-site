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
  async function api() {
    const response = await fetch(
        `/api/trpc/agent.dashboard?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
        { credentials: "include" }
      ),
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
  async function load() {
    if (!meetingId) {
      content.innerHTML = "Compromisso não identificado.";
      return;
    }
    try {
      const data = await api(),
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
      const firstMessage = `Olá, ${firstName}!\n\nPassando para lembrar da nossa reunião de hoje, às ${time(meeting.startTime)} (horário de Nova York), com a Affinity Financial Consulting.${zoom ? `\n\nAcesse a reunião pelo Zoom:\n${zoom}` : ""}\n\nNos vemos em breve!\nAffinity Financial Consulting`;
      const secondMessage = `Olá, ${firstName}! Tudo bem?\n\nEstou entrando em contato para confirmar nossa segunda conversa hoje, às ${time(meeting.startTime)} (horário de Nova York).${zoom ? `\n\nLink da reunião:\n${zoom}` : ""}\n\nSe precisar ajustar o horário, por favor me avise.\nAffinity Financial Consulting`;
      content.className = "card";
      content.innerHTML = `<h2>${esc(meeting.inviteeName || meeting.eventName || "Compromisso")}</h2><p class="muted">${esc(meeting.eventName || "Reunião")}</p><div class="grid"><div class="field"><b>Data e horário</b>${esc(format(meeting.startTime))}</div><div class="field"><b>Término previsto</b>${esc(format(meeting.endTime))}</div><div class="field"><b>Telefone</b>${esc(phone || "Não informado")}</div><div class="field"><b>E-mail</b>${esc(email || "Não informado")}</div></div><div class="actions">${meeting.meetingUrl ? `<a class="primary" href="${esc(meeting.meetingUrl)}" target="_blank" rel="noopener">Entrar na reunião</a>` : ""}${clientId ? `<a href="/agentes/clientes?cliente=${clientId}">Abrir ficha completa</a>` : ""}<a href="/agentes/agenda">Voltar para a agenda</a></div>${whatsapp ? `<div class="card"><div class="eyebrow">Contato rápido</div><h2>Mensagem pronta para WhatsApp</h2><textarea id="meeting-message" style="width:100%;min-height:190px;margin-top:12px;border:1px solid #293b52;border-radius:10px;background:#050d18;color:#fff;padding:14px">${esc(firstMessage)}</textarea><div class="actions"><button id="first-message" class="primary" style="border:1px solid #dfb934;border-radius:10px;background:#dfb934;color:#050505;padding:12px 16px;font-weight:800">Abrir direto no WhatsApp</button><button id="second-message" style="border:1px solid #293b52;border-radius:10px;background:#101d2d;color:#fff;padding:12px 16px;font-weight:800">Usar mensagem de segunda chamada</button><button id="blank-message" style="border:1px solid #293b52;border-radius:10px;background:#101d2d;color:#fff;padding:12px 16px;font-weight:800">WhatsApp em branco</button></div></div>` : ""}`;
      const area = document.getElementById("meeting-message");
      document
        .getElementById("first-message")
        ?.addEventListener("click", () => {
          location.href = `whatsapp://send?phone=${whatsapp}&text=${encodeURIComponent(area.value)}`;
        });
      document
        .getElementById("second-message")
        ?.addEventListener("click", () => {
          area.value = secondMessage;
        });
      document
        .getElementById("blank-message")
        ?.addEventListener("click", () => {
          location.href = `whatsapp://send?phone=${whatsapp}`;
        });
    } catch (error) {
      content.innerHTML = esc(error.message);
    }
  }
  load();
})();
