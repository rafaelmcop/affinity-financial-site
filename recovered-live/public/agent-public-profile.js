const escapeHtml = v =>
  String(v || "").replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]
  );
const safeUrl = value => {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};
const safeImage = value => {
  const image = String(value || "");
  return /^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(image)
    ? image
    : "";
};
const detailCard = (title, value, wide = false) =>
  value
    ? `<article class="detail-card${wide ? " wide" : ""}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(value)}</p></article>`
    : "";
(async () => {
  const slug = location.pathname.split("/").filter(Boolean).pop();
  try {
    const response = await fetch(
        `/api/trpc/calendly.publicProfile?input=${encodeURIComponent(JSON.stringify({ json: { slug } }))}`
      ),
      payload = await response.json(),
      profile = payload?.result?.data?.json;
    if (!profile) throw new Error("Perfil não encontrado");
    const calendly = safeUrl(profile.calendlyUrl),
      whatsapp = String(profile.whatsapp || profile.phone || "").replace(
        /\D/g,
        ""
      ),
      photo = safeImage(profile.photoUrl),
      socialLinks = [
        ["Site", profile.website],
        ["LinkedIn", profile.linkedInUrl],
        ["Instagram", profile.instagramUrl],
        ["Facebook", profile.facebookUrl],
      ].map(([label, value]) => [label, safeUrl(value)]).filter(([, value]) => value);
    document.title = `${profile.name} | Affinity Financial`;
    document.getElementById("content").innerHTML =
      `<section class="hero"><div><div class="eyebrow">Affinity Financial Consulting</div><h1>${escapeHtml(profile.name)}</h1><div class="headline">${escapeHtml(profile.jobTitle || profile.headline || "Consultor financeiro")}</div>${profile.headline && profile.jobTitle ? `<p class="headline">${escapeHtml(profile.headline)}</p>` : ""}${profile.sinceYear ? `<p class="headline">Atendendo famílias desde ${Number(profile.sinceYear)}</p>` : ""}<p class="bio">${escapeHtml(profile.bio || "Proteção financeira e planejamento personalizado para você e sua família.")}</p><div class="actions">${calendly ? '<a class="button primary" href="#agenda">Agendar atendimento</a>' : ""}${whatsapp ? `<a class="button" href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá ${profile.name}, encontrei seu perfil no site da Affinity e gostaria de conversar.`)}" target="_blank">Falar no WhatsApp</a>` : ""}<a class="button" href="#contato">Enviar mensagem</a></div>${socialLinks.length ? `<div class="social">${socialLinks.map(([label, url]) => `<a class="button" href="${url}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`).join("")}</div>` : ""}</div>${photo ? `<img class="photo" src="${photo}" alt="${escapeHtml(profile.name)}">` : `<div class="photo placeholder">${escapeHtml(String(profile.name || "A").charAt(0))}</div>`}</section><section class="profile-details"><div class="details-wrap"><div class="eyebrow">Experiência profissional</div><h2 style="font-size:38px;margin:10px 0 25px">Conheça meu trabalho</h2><div class="details-grid">${detailCard("Minha trajetória", profile.professionalHistory, true)}${detailCard("Empresas que represento", profile.companies)}${detailCard("Especialidades", profile.specialties)}${detailCard("Licenças e certificações", profile.licenses)}${detailCard("Formação", profile.education)}${detailCard("Idiomas", profile.languages)}${detailCard("Conquistas e reconhecimentos", profile.achievements)}${detailCard("Mais sobre meu trabalho", profile.additionalInfo, true)}</div></div></section><section class="calendar" id="contato"><h2>Fale diretamente comigo</h2><p>Sua mensagem será registrada com segurança no meu CRM.</p><form id="contact-form" style="max-width:700px;margin:25px auto;background:#0f223b;padding:24px;border-radius:18px"><input id="contact-name" required placeholder="Seu nome" style="width:100%;padding:13px;margin:7px 0;border-radius:8px;border:1px solid #53647a"><input id="contact-email" type="email" placeholder="Seu e-mail" style="width:100%;padding:13px;margin:7px 0;border-radius:8px;border:1px solid #53647a"><input id="contact-phone" placeholder="Seu telefone" style="width:100%;padding:13px;margin:7px 0;border-radius:8px;border:1px solid #53647a"><textarea id="contact-message" required placeholder="Como posso ajudar?" style="width:100%;min-height:120px;padding:13px;margin:7px 0;border-radius:8px;border:1px solid #53647a"></textarea><button class="button primary" type="submit">Enviar mensagem</button><p id="contact-result"></p></form></section>${calendly ? `<section class="calendar" id="agenda"><h2>Agende diretamente comigo</h2><p>Escolha um horário sem sair do site da Affinity.</p><div class="widget"><div class="calendly-inline-widget" data-url="${calendly}${calendly.includes("?") ? "&" : "?"}hide_gdpr_banner=1" style="min-width:320px;height:760px"></div></div></section>` : ""}`;
    document.getElementById("contact-form").onsubmit = async event => {
      event.preventDefault();
      const result = document.getElementById("contact-result");
      result.textContent = "Enviando…";
      const res = await fetch("/api/trpc/calendly.contactAgent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            json: {
              slug,
              name: document.getElementById("contact-name").value,
              email: document.getElementById("contact-email").value,
              phone: document.getElementById("contact-phone").value,
              message: document.getElementById("contact-message").value,
            },
          }),
        }),
        data = await res.json();
      if (data.error) {
        result.textContent =
          data.error.json?.message || "Não foi possível enviar.";
        return;
      }
      event.target.reset();
      result.textContent = "Mensagem enviada. Em breve entrarei em contato.";
    };
    if (calendly) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    }
  } catch (e) {
    document.getElementById("content").innerHTML =
      `<div class="error"><h1>Perfil não encontrado</h1><p>Confira o link recebido ou volte ao site principal.</p><a class="button primary" href="/">Voltar</a></div>`;
  }
})();
