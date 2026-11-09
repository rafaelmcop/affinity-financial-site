(function () {
  const presets = {
    icloud: { smtp: "smtp.mail.me.com", smtpPort: "587", imap: "imap.mail.me.com", imapPort: "993" },
    gmail: { smtp: "smtp.gmail.com", smtpPort: "587", imap: "imap.gmail.com", imapPort: "993" }
  };

  function setInput(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function inputFor(card, labelText) {
    const label = [...card.querySelectorAll("label")].find((item) => item.textContent.trim().startsWith(labelText));
    return label?.querySelector("input") || null;
  }

  function enhance() {
    if (location.pathname !== "/agentes/configuracoes" || document.getElementById("email-provider-choice")) return;
    const heading = [...document.querySelectorAll("h2")].find((item) => item.textContent.includes("Meu e-mail"));
    const card = heading?.parentElement;
    const smtpHeading = [...(card?.querySelectorAll("h3") || [])].find((item) => item.textContent.includes("SMTP"));
    if (!card || !smtpHeading) return;

    const imapHost = inputFor(card, "Servidor de entrada")?.value || "";
    const current = /gmail/i.test(imapHost) ? "gmail" : /mail\.me/i.test(imapHost) ? "icloud" : "custom";
    const label = document.createElement("label");
    label.id = "email-provider-choice";
    label.className = "block text-sm text-gray-300";
    label.innerHTML = '<span>Provedor de e-mail</span><select class="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3 text-white"><option value="icloud">iCloud</option><option value="gmail">Gmail</option><option value="custom">Outro provedor</option></select><small class="mt-2 block text-xs text-gray-500">Para iCloud ou Gmail, use uma senha de aplicativo — nunca a senha normal da conta.</small>';
    const select = label.querySelector("select");
    select.value = current;
    select.addEventListener("change", () => {
      const preset = presets[select.value];
      if (!preset) return;
      setInput(inputFor(card, "Servidor"), preset.smtp);
      setInput(inputFor(card, "Porta"), preset.smtpPort);
      setInput(inputFor(card, "Servidor de entrada"), preset.imap);
      setInput(inputFor(card, "Porta segura"), preset.imapPort);
      const account = inputFor(card, "E-mail/usuário");
      const inbox = inputFor(card, "Conta que recebe respostas");
      if (account) account.placeholder = select.value === "gmail" ? "seu-email@gmail.com" : "seu-email@icloud.com";
      if (inbox) inbox.placeholder = select.value === "gmail" ? "Ex.: seu-email@gmail.com" : "Ex.: us.rafael@icloud.com";
    });
    smtpHeading.before(label);
  }

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener("popstate", enhance);
  enhance();
})();
