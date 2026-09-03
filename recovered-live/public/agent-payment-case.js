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
    Number(value || 0).toLocaleString("en-US", {
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
  async function load() {
    try {
      if (!taskId) throw new Error("Pendência inválida");
      const data = (await api("agent.paymentCase", { taskId })) || {};
      const task = data.task || {},
        candidate = data.candidate || {},
        history = Array.isArray(data.history) ? data.history : [];
      const identified = Boolean(data.client && data.policy);
      const status = String(data.notice?.actionStatus || "needs_review");
      const statusClass =
        status === "sent" ? "sent" : status === "failed" ? "failed" : "review";
      const statusText =
        status === "sent"
          ? "Mensagem automática enviada"
          : identified
            ? "Cliente identificado - mensagem pronta"
            : "Confirme os dados encontrados no e-mail";
      const phone =
          candidate.phone || data.client?.whatsapp || data.client?.phone || "",
        whatsapp = digits(phone);
      content.innerHTML = `<section class="card"><span class="status ${statusClass}">${statusText}</span><h2>${esc(candidate.name || data.client?.name || "Pagamento pendente")}</h2><p class="muted">${esc(data.notice?.actionDetail || "Revise os dados encontrados e tome a ação necessária.")}</p><div class="grid"><div><b>Cliente</b>${esc(candidate.name || "Ainda não identificado")}</div><div><b>Apólice</b>${esc(candidate.policyNumber || "Ainda não identificada")}</div><div><b>Telefone</b>${esc(phone || "Não informado")}</div><div><b>E-mail</b>${esc(candidate.email || "Não informado")}</div><div><b>Produto</b>${esc(data.policy?.product || "Não informado")}</div><div><b>Status</b>${esc(data.policy?.status || "Não informado")}</div><div><b>Premium</b>${data.policy ? money(data.policy.premiumAmount) : "Não informado"}</div><div><b>Cobertura</b>${data.policy ? money(data.policy.coverageAmount) : "Não informada"}</div></div><div class="actions">${data.client ? `<a class="primary" href="/agentes/clientes?cliente=${data.client.id}&conversa=1">Abrir ficha completa do cliente</a>` : ""}${data.policy ? `<a href="/agentes/apolices?busca=${encodeURIComponent(data.policy.policyNumber || "")}">Abrir esta apólice</a>` : ""}<button id="resolve">Marcar como resolvido</button><button id="delete">Excluir pendência</button></div></section>
      <section class="card"><div class="eyebrow">Mensagem pronta</div><h2>Aviso de pagamento</h2><label>Assunto<input id="prepared-subject" value="${esc(data.prepared?.subject || "Atualização importante sobre sua apólice")}"></label><label><textarea id="prepared-message">${esc(data.prepared?.message || "")}</textarea></label><div class="actions">${whatsapp ? '<button id="whatsapp-ready" class="primary">Abrir direto no WhatsApp</button><button id="whatsapp-blank">WhatsApp em branco</button>' : ""}${candidate.email ? '<button id="email-ready">Preparar e-mail</button>' : ""}<button id="copy-message">Copiar mensagem</button></div></section>
      <section class="card" ${identified ? "hidden" : ""}><div class="eyebrow">Identificação assistida</div><h2>Confirmar ou completar cliente</h2><p class="muted">Os dados encontrados no e-mail já aparecem preenchidos. O portal procura o cadastro por nome, e-mail ou apólice e une as informações sem duplicar.</p><form id="identify-form" class="form-grid"><label>Nome do cliente<input name="name" required value="${esc(candidate.name)}"></label><label>Número da apólice<input name="policyNumber" required value="${esc(candidate.policyNumber)}"></label><label>E-mail<input name="email" type="email" value="${esc(candidate.email)}"></label><label>Telefone / WhatsApp<input name="phone" value="${esc(phone)}"></label><div class="actions wide"><button class="primary" type="submit">Relacionar cadastro e preparar mensagem</button></div></form></section>
      <section class="card"><div class="eyebrow">E-mail recebido</div><h2>${esc(data.notice?.subject || "E-mail de pagamento")}</h2><p class="muted">${date(data.notice?.sentAt)}</p><div class="message">${esc(data.notice?.body || "Conteúdo original indisponível.")}</div></section>
      <section class="card"><div class="eyebrow">Auditoria</div><h2>Histórico de mensagens</h2><div class="history">${history.length ? history.map(item => `<article class="email ${item.direction === "sent" ? "out" : "in"}"><b>${item.direction === "sent" ? "Enviado" : "Recebido"} · ${date(item.sentAt)}</b><h3>${esc(item.subject)}</h3><div class="message">${esc(item.body)}</div></article>`).join("") : '<div class="empty">Nenhuma mensagem registrada.</div>'}</div></section>`;
      const message = () => document.getElementById("prepared-message").value;
      const subject = () => document.getElementById("prepared-subject").value;
      document.getElementById("copy-message").onclick = async () => {
        await navigator.clipboard.writeText(message());
        alert("Mensagem copiada.");
      };
      document
        .getElementById("whatsapp-ready")
        ?.addEventListener("click", () => {
          location.href = `whatsapp://send?phone=${whatsapp}&text=${encodeURIComponent(message())}`;
        });
      document
        .getElementById("whatsapp-blank")
        ?.addEventListener("click", () => {
          location.href = `whatsapp://send?phone=${whatsapp}`;
        });
      document.getElementById("email-ready")?.addEventListener("click", () => {
        location.href = `mailto:${encodeURIComponent(candidate.email)}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(message())}`;
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
      document.getElementById("resolve").onclick = async () => {
        await api("agent.toggleTask", { id: taskId, completed: true }, true);
        location.href = "/agentes/dashboard";
      };
      document.getElementById("delete").onclick = async () => {
        if (!confirm("Excluir esta pendência?")) return;
        await api("agent.deleteTask", { id: taskId }, true);
        location.href = "/agentes/dashboard";
      };
    } catch (error) {
      content.innerHTML = `<div class="card empty">${esc(error.message || "Não foi possível abrir este caso.")}</div>`;
    }
  }
  load();
})();
