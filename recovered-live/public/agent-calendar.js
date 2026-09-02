const $ = id => document.getElementById(id);
let state = {};
const permissionGuide = document.createElement("div");
permissionGuide.className = "muted";
permissionGuide.innerHTML =
  "<p><strong>Permissões necessárias no token:</strong></p><ul><li><code>users:read</code></li><li><code>invitees:read</code></li><li><code>contacts:read</code></li><li><code>meeting_recaps:read</code></li><li><code>event_types:write</code> (inclui leitura)</li><li><code>availability:write</code> (inclui leitura)</li><li><code>scheduled_events:write</code> (inclui leitura)</li><li><code>locations:read</code></li><li><code>scheduling_links:write</code></li><li><code>webhooks:write</code></li></ul><p>Não marque permissões de exclusão de dados, conformidade, grupos, faturamento ou administração da organização.</p>";
$("connect-card").querySelector("p")?.after(permissionGuide);
document
  .querySelectorAll("#connect-card,#connected-card")
  .forEach(node => node.classList.add("hidden"));
const agendaGrid = document.querySelector(".grid");
if (agendaGrid) agendaGrid.style.gridTemplateColumns = "1fr";
async function api(name, input = {}, method = "GET") {
  const options = { credentials: "include", cache: "no-store" };
  let url = `/api/trpc/${name}`;
  if (method === "GET")
    url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}&fresh=${Date.now()}`;
  else {
    options.method = "POST";
    options.headers = { "content-type": "application/json" };
    options.body = JSON.stringify({ json: input });
  }
  const response = await fetch(url, options),
    payload = await response.json();
  const data = payload?.result?.data?.json;
  if (payload?.error)
    throw new Error(
      payload.error.json?.message ||
        payload.error.message ||
        "Não foi possível concluir"
    );
  return data;
}
function notice(message, error = false) {
  $("notice").textContent = message;
  $("notice").className = `notice show${error ? " error" : ""}`;
  setTimeout(() => ($("notice").className = "notice"), 6000);
}
function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}
function meetingMoment(value) {
  const date = new Date(value),
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
    }).format(new Date()),
    day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
    }).format(date),
    label =
      day === today
        ? "hoje"
        : new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            timeZone: "America/New_York",
          }).format(date),
    time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    }).format(date);
  return { label, time };
}
function reminderMessage(row) {
  const moment = meetingMoment(row.startTime),
    zoom = safeUrl(row.meetingUrl);
  return `Olá, ${row.inviteeName || "tudo bem"}!\n\nPassando para lembrar da nossa reunião de ${moment.label}, às ${moment.time} (horário de Nova York), com a Affinity Financial Consulting.${zoom !== "#" ? `\n\n🔗 Acesse a reunião pelo Zoom:\n${zoom}` : ""}\n\nNos vemos em breve!\n\nAffinity Financial Consulting`;
}
function secondCallMessage(row) {
  const reschedule = safeUrl(row.rescheduleUrl || state.profile?.calendlyUrl);
  return `Olá, ${row.inviteeName || "tudo bem"}!\n\nNão conseguimos conversar no horário da nossa primeira chamada e gostaria de dar continuidade ao seu atendimento com a Affinity Financial Consulting.\n\nSe ainda tiver interesse, responda esta mensagem ou escolha um novo horário que seja mais conveniente para você.${reschedule !== "#" ? `\n\n📅 Reagende aqui:\n${reschedule}` : ""}\n\nFico à disposição e será um prazer falar com você.\n\nAffinity Financial Consulting`;
}
function feedbackMessage(row, link) {
  return `Olá, ${row.inviteeName || "tudo bem"}!\n\nObrigado por conversar comigo hoje. Sua opinião é muito importante para que eu possa melhorar cada vez mais meu atendimento.\n\nPreparei um formulário rápido para você me contar como foi nossa conversa, se ficou alguma dúvida e o que gostaria de analisar melhor antes de tomar uma decisão:\n\n${link}\n\nPode responder com total sinceridade. Ficarei à disposição para esclarecer qualquer dúvida.\n\nAffinity Financial Consulting`;
}
async function prepareFeedback(id) {
  const row = window.calendarRows.find(item => Number(item.id) === Number(id));
  if (!row) return notice("Reunião não encontrada.", true);
  try {
    const invite = await api("agent.createReviewInvite", {
      clientName: row.inviteeName || "Cliente",
      clientEmail: row.inviteeEmail || "",
    }, "POST");
    const link = `${invite.link}${invite.link.includes("?") ? "&" : "?"}followup=1`;
    const composer = $(`composer-${id}`), text = $(`message-${id}`);
    composer.classList.remove("hidden");
    text.value = feedbackMessage(row, link);
    composer.dataset.type = "feedback";
    notice("Link individual criado. Copie a mensagem ou abra no WhatsApp.");
  } catch (error) {
    notice(error.message, true);
  }
}
function setComposer(id, type) {
  const row = window.calendarRows.find(item => Number(item.id) === Number(id));
  if (!row) return;
  const composer = $(`composer-${id}`),
    text = $(`message-${id}`);
  composer.classList.remove("hidden");
  text.value =
    type === "second" ? secondCallMessage(row) : reminderMessage(row);
  composer.dataset.type = type;
  composer
    .querySelectorAll("[data-template]")
    .forEach(button =>
      button.classList.toggle("active", button.dataset.template === type)
    );
}
async function copyMessage(id) {
  const text = $(`message-${id}`).value;
  try {
    await navigator.clipboard.writeText(text);
    notice("Mensagem copiada. Agora é só colar no WhatsApp, SMS ou e-mail.");
  } catch {
    $(`message-${id}`).select();
    document.execCommand("copy");
    notice("Mensagem copiada.");
  }
}
function openWhatsApp(id) {
  const row = window.calendarRows.find(item => Number(item.id) === Number(id)),
    phone = String(row?.inviteePhone || "").replace(/\D/g, ""),
    message = $(`message-${id}`).value;
  if (!phone)
    return notice(
      "O Calendly não informou o WhatsApp deste cliente. Copie a mensagem e envie pelo contato cadastrado.",
      true
    );
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}
function openClientWhatsApp(withReminder) {
  if (!selectedClientRow) return;
  const phone = String(selectedClientRow.inviteePhone || "").replace(/\D/g, "");
  if (!phone)
    return notice("O Calendly não informou o telefone deste cliente.", true);
  const message = withReminder ? reminderMessage(selectedClientRow) : "";
  window.open(
    `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`,
    "_blank",
    "noopener,noreferrer"
  );
}
let selectedClientRow = null;
function openClientPopup(id) {
  const row = window.calendarRows.find(item => Number(item.id) === Number(id));
  if (!row) return;
  selectedClientRow = row;
  $("client-dialog-name").textContent = row.inviteeName || "Não informado";
  $("client-dialog-email").textContent = row.inviteeEmail || "Não informado";
  $("client-dialog-phone").textContent = row.inviteePhone || "Não informado";
  $("client-dialog").showModal();
}
function renderMeetings(rows) {
  rows = Array.isArray(rows) ? rows : [];
  window.calendarRows = rows;
  const now = new Date();
  const upcoming = rows
    .filter(
      row =>
        !["canceled", "cancelled", "no_show"].includes(
          String(row.status || "").toLowerCase()
        ) && new Date(row.endTime) > now
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const meetingCount = $("meeting-count");
  if (meetingCount)
    meetingCount.textContent = `${upcoming.length} próxima${upcoming.length === 1 ? " reunião" : "s reuniões"}`;
  $("meetings").innerHTML = upcoming.length
    ? upcoming
        .map(
          row =>
            `<article class="meeting"><div><div class="when">${formatDate(row.startTime)}</div><span class="pill">${row.status === "active" ? "Confirmada" : row.status}</span></div><div class="person"><strong>${escapeHtml(row.inviteeName || "Cliente")}</strong><span>${escapeHtml(row.eventName || "Reunião")}</span><span>${escapeHtml(row.inviteeEmail || "")}${row.inviteePhone ? ` · ${escapeHtml(row.inviteePhone)}` : ""}</span></div><div class="actions">${row.meetingUrl ? `<a class="button primary" href="${safeUrl(row.meetingUrl)}" target="_blank">Entrar no Zoom</a>` : ""}<button data-open-message="${row.id}">Preparar mensagem</button>${row.rescheduleUrl ? `<a class="button" href="${safeUrl(row.rescheduleUrl)}" target="_blank">Reagendar</a>` : ""}<button data-open-client="${row.id}">Abrir cliente</button><button class="danger" data-cancel="${row.id}">Cancelar</button></div><div id="composer-${row.id}" class="message-composer hidden"><div class="message-tabs"><button class="active" data-template="reminder" data-id="${row.id}">Lembrete da reunião</button><button data-template="second" data-id="${row.id}">Segunda chamada</button></div><p class="message-help">Você pode personalizar o texto antes de copiar ou abrir o WhatsApp.</p><textarea id="message-${row.id}" aria-label="Mensagem para ${escapeHtml(row.inviteeName || "cliente")}"></textarea><div class="actions"><button class="primary" data-copy-message="${row.id}">Copiar mensagem</button><button data-whatsapp-message="${row.id}">Abrir no WhatsApp</button><button data-close-message="${row.id}">Fechar</button></div></div></article>`
        )
        .join("")
    : '<p class="muted">Nenhuma reunião futura encontrada.</p>';
  const followUps = rows
    .filter(row => {
      const status = String(row.status || "").toLowerCase();
      return ["canceled", "cancelled", "no_show", "completed"].includes(status) ||
        (new Date(row.endTime) <= now && status === "active");
    })
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  $("followup-meetings").innerHTML = followUps.length
    ? followUps.map(row => {
        const status = String(row.status || "").toLowerCase();
        const label = status === "no_show" ? "Não compareceu" : ["canceled", "cancelled"].includes(status) ? "Cancelada" : status === "completed" ? "Compareceu" : "Confirmar comparecimento";
        return `<article class="meeting"><div><div class="when">${formatDate(row.startTime)}</div><span class="pill">${label}</span></div><div class="person"><strong>${escapeHtml(row.inviteeName || "Cliente")}</strong><span>${escapeHtml(row.eventName || "Reunião")}</span><span>${escapeHtml(row.inviteeEmail || "")}${row.inviteePhone ? ` · ${escapeHtml(row.inviteePhone)}` : ""}</span></div><div class="actions"><button class="primary" data-open-followup="${row.id}">Preparar follow-up</button><button data-feedback="${row.id}">Não fechou / pedir feedback</button>${row.rescheduleUrl ? `<a class="button" href="${safeUrl(row.rescheduleUrl)}" target="_blank">Reagendar</a>` : ""}<button data-open-client="${row.id}">Abrir cliente</button>${status === "active" ? `<button data-attended="${row.id}">Compareceu</button><button data-no-show="${row.id}">Não compareceu</button>` : ""}</div><div id="composer-${row.id}" class="message-composer hidden"><p class="message-help">Personalize a mensagem antes de copiar ou abrir o WhatsApp.</p><textarea id="message-${row.id}" aria-label="Follow-up para ${escapeHtml(row.inviteeName || "cliente")}"></textarea><div class="actions"><button class="primary" data-copy-message="${row.id}">Copiar mensagem</button><button data-whatsapp-message="${row.id}">Abrir no WhatsApp</button><button data-close-message="${row.id}">Fechar</button></div></div></article>`;
      }).join("")
    : '<p class="muted">Nenhuma reunião cancelada ou pendente de confirmação.</p>';
  document
    .querySelectorAll("[data-open-message]")
    .forEach(
      button =>
        (button.onclick = () =>
          setComposer(button.dataset.openMessage, "reminder"))
    );
  document
    .querySelectorAll("[data-open-followup]")
    .forEach(button => (button.onclick = () => setComposer(button.dataset.openFollowup, "second")));
  document
    .querySelectorAll("[data-feedback]")
    .forEach(button => (button.onclick = () => prepareFeedback(button.dataset.feedback)));
  document
    .querySelectorAll("[data-template]")
    .forEach(
      button =>
        (button.onclick = () =>
          setComposer(button.dataset.id, button.dataset.template))
    );
  document
    .querySelectorAll("[data-copy-message]")
    .forEach(
      button => (button.onclick = () => copyMessage(button.dataset.copyMessage))
    );
  document
    .querySelectorAll("[data-whatsapp-message]")
    .forEach(
      button =>
        (button.onclick = () => openWhatsApp(button.dataset.whatsappMessage))
    );
  document
    .querySelectorAll("[data-close-message]")
    .forEach(
      button =>
        (button.onclick = () =>
          $(`composer-${button.dataset.closeMessage}`).classList.add("hidden"))
    );
  document
    .querySelectorAll("[data-open-client]")
    .forEach(
      button =>
        (button.onclick = () => openClientPopup(button.dataset.openClient))
    );
  document.querySelectorAll("[data-cancel]").forEach(
    button =>
      (button.onclick = async () => {
        if (
          !confirm(
            "Cancelar esta reunião? O cliente será avisado pelo Calendly."
          )
        )
          return;
        try {
          await api(
            "agent.cancelCalendlyMeeting",
            {
              id: Number(button.dataset.cancel),
              reason: "Cancelado pelo agente",
            },
            "POST"
          );
          notice("Reunião cancelada.");
          loadMeetings();
        } catch (e) {
          notice(e.message, true);
        }
      })
  );
  document.querySelectorAll("[data-no-show]").forEach(button => {
    button.onclick = async () => {
      if (!confirm("Marcar esta reunião como não comparecimento e mantê-la na lista de follow-up?")) return;
      try {
        await api("agent.markCalendlyAttendance", { id: Number(button.dataset.noShow), status: "no_show" }, "POST");
        notice("Reunião marcada como não comparecimento.");
        await loadMeetings();
      } catch (error) {
        notice(error.message, true);
      }
    };
  });
  document.querySelectorAll("[data-attended]").forEach(button => {
    button.onclick = async () => {
      try {
        await api("agent.markCalendlyAttendance", { id: Number(button.dataset.attended), status: "completed" }, "POST");
        notice("Comparecimento confirmado.");
        await loadMeetings();
      } catch (error) {
        notice(error.message, true);
      }
    };
  });
}
function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]
  );
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}
document.addEventListener(
  "click",
  async event => {
    const cancelButton = event.target.closest?.("[data-cancel]");
    if (cancelButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const row = window.calendarRows?.find(
        item => Number(item.id) === Number(cancelButton.dataset.cancel)
      );
      if (!row) return notice("Reunião não encontrada.", true);
      if (
        !confirm(
          `ATENÇÃO: esta ação cancelará a reunião de ${row.inviteeName || "este cliente"} e o Calendly poderá enviar um aviso ao cliente. Deseja continuar?`
        )
      )
        return;
      const typed = prompt("Para confirmar definitivamente, digite CANCELAR:");
      if (
        String(typed || "")
          .trim()
          .toUpperCase() !== "CANCELAR"
      )
        return notice(
          "Cancelamento interrompido. Nenhuma alteração foi feita."
        );
      try {
        cancelButton.disabled = true;
        await api(
          "agent.cancelCalendlyMeeting",
          {
            id: Number(row.id),
            reason: "Cancelado pelo agente",
            confirmation: "CANCELAR",
          },
          "POST"
        );
        notice("Reunião cancelada com confirmação.");
        await loadMeetings();
      } catch (error) {
        notice(error.message, true);
      } finally {
        cancelButton.disabled = false;
      }
      return;
    }
    const rescheduleLink = event.target.closest?.("a");
    if (
      !rescheduleLink ||
      rescheduleLink.textContent.trim() !== "Reagendar" ||
      !rescheduleLink.closest(".meeting")
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const destination = safeUrl(rescheduleLink.href);
    if (destination === "#")
      return notice(
        "O Calendly não informou um link válido para reagendamento.",
        true
      );
    if (
      !confirm(
        "Você será levado ao Calendly para escolher um novo horário. A reunião atual não será alterada até você concluir o processo no Calendly. Deseja continuar?"
      )
    )
      return;
    const typed = prompt("Para abrir o reagendamento, digite REAGENDAR:");
    if (
      String(typed || "")
        .trim()
        .toUpperCase() !== "REAGENDAR"
    )
      return notice("Reagendamento interrompido. Nenhuma alteração foi feita.");
    window.open(destination, "_blank", "noopener,noreferrer");
  },
  true
);
async function loadMeetings() {
  try {
    const meetings = await api("agent.calendlyMeetings");
    renderMeetings(meetings);
  } catch (e) {
    $("meetings").innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
    const meetingCount = $("meeting-count");
    if (meetingCount) meetingCount.textContent = "Não foi possível atualizar";
  }
}
function recapParagraphs(value) {
  if (!value) return '<p class="muted">Não informado pelo Calendly.</p>';
  const parts = Array.isArray(value) ? value : String(value).split(/\n+/);
  return (
    parts
      .filter(Boolean)
      .map(
        item =>
          `<p>${escapeHtml(typeof item === "string" ? item : item.text || item.title || item.description || JSON.stringify(item))}</p>`
      )
      .join("") || '<p class="muted">Não informado pelo Calendly.</p>'
  );
}
function renderRecaps(rows) {
  $("meeting-recaps").innerHTML = rows.length
    ? rows
        .map(
          row =>
            `<article class="meeting"><div><div class="when">${row.startTime ? formatDate(row.startTime) : "Data não informada"}</div><span class="pill">Meeting Recap</span></div><div class="person"><strong>${escapeHtml(row.title || "Resumo da reunião")}</strong><span>${escapeHtml(row.attendee || "")}</span></div><div class="actions"><button class="primary" data-open-recap="${escapeHtml(row.id)}">Ver resumo</button></div></article>`
        )
        .join("")
    : '<p class="muted">Nenhum resumo disponível. O Calendly gera o recap depois da reunião quando o Meeting Recaps está ativo.</p>';
  document
    .querySelectorAll("[data-open-recap]")
    .forEach(
      button => (button.onclick = () => openRecap(button.dataset.openRecap))
    );
}
async function loadRecaps() {
  try {
    renderRecaps(await api("agent.calendlyRecaps"));
  } catch (e) {
    $("meeting-recaps").innerHTML =
      `<p class="muted">${escapeHtml(e.message)}${/scope|permiss/i.test(e.message) ? " Gere um novo token incluindo meeting_recaps:read." : ""}</p>`;
  }
}
async function openRecap(id) {
  try {
    const row = await api("agent.calendlyRecap", { id });
    $("recap-title").textContent = row.title || "Resumo da reunião";
    $("recap-date").textContent = row.startTime
      ? formatDate(row.startTime)
      : "";
    $("recap-summary").innerHTML = recapParagraphs(row.summary);
    $("recap-actions").innerHTML = recapParagraphs(row.actionItems);
    $("recap-discussion").innerHTML = recapParagraphs(row.discussion);
    $("recap-transcript").innerHTML = recapParagraphs(row.transcript);
    $("recap-dialog").showModal();
  } catch (e) {
    notice(e.message, true);
  }
}
async function load() {
  try {
    state = (await api("agent.getCalendly")) || {};
    if (state.connection) await loadMeetings();
    else
      $("meetings").innerHTML =
        '<p class="muted">Sua agenda ainda não está conectada. <a class="button" href="/agentes/configuracoes">Configurar Calendly</a></p>';
  } catch (e) {
    notice(e.message, true);
    $("meetings").innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
  }
}
$("connect").onclick = async () => {
  try {
    $("connect").disabled = true;
    await api("agent.connectCalendly", { token: $("token").value }, "POST");
    $("token").value = "";
    notice("Calendly conectado e agenda sincronizada.");
    await load();
  } catch (e) {
    notice(e.message, true);
  } finally {
    $("connect").disabled = false;
  }
};
$("sync").onclick = async () => {
  try {
    $("sync").disabled = true;
    const result = await api("agent.syncCalendly", {}, "POST");
    notice(`${result.saved || 0} reunião(ões) conferida(s).`);
    await load();
  } catch (e) {
    notice(e.message, true);
  } finally {
    $("sync").disabled = false;
  }
};
$("disconnect").onclick = async () => {
  if (
    !confirm(
      "Desconectar sua agenda? As reuniões já registradas serão preservadas."
    )
  )
    return;
  await api("agent.disconnectCalendly", {}, "POST");
  notice("Calendly desconectado.");
  load();
};
const dialogActions = $("copy-client").parentElement,
  reminderButton = document.createElement("button"),
  blankButton = document.createElement("button");
reminderButton.textContent = "WhatsApp com lembrete";
reminderButton.className = "primary";
blankButton.textContent = "WhatsApp em branco";
dialogActions.insertBefore(reminderButton, $("copy-client"));
dialogActions.insertBefore(blankButton, $("copy-client"));
reminderButton.onclick = () => openClientWhatsApp(true);
blankButton.onclick = () => openClientWhatsApp(false);
$("close-client").onclick = () => $("client-dialog").close();
$("client-dialog").onclick = event => {
  if (event.target === $("client-dialog")) $("client-dialog").close();
};
$("copy-client").onclick = async () => {
  if (!selectedClientRow) return;
  const details = `Nome: ${selectedClientRow.inviteeName || "Não informado"}\nE-mail: ${selectedClientRow.inviteeEmail || "Não informado"}\nTelefone: ${selectedClientRow.inviteePhone || "Não informado"}`;
  try {
    await navigator.clipboard.writeText(details);
    notice("Dados do cliente copiados.");
  } catch {
    notice("Não foi possível copiar automaticamente.", true);
  }
};
load();
