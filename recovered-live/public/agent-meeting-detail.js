const confirmPortalMessage=message=>import('/portal-interactions.js?v=11').then(module=>module.confirmPortalMessage(message));
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
    if(Array.isArray(payload))payload=payload[0];
    if (!response.ok||payload?.error||!payload?.result)
      throw new Error(
        payload?.error?.json?.message ||
          "Não foi possível carregar o compromisso."
      );
    return payload?.result?.data?.json;
  }
  function zoomAppLink(value,userAgent=navigator.userAgent) {
    try {
      const url=new URL(value);
      if(!['https:','http:'].includes(url.protocol)||!(url.hostname==='zoom.us'||url.hostname.endsWith('.zoom.us')))return value;
      const id=url.pathname.match(/\/(?:j|s|wc\/join)\/(\d{9,11})(?:\/|$)/)?.[1]||url.searchParams.get('confno');
      if(!/^\d{9,11}$/.test(id||''))return value;
      const params=new URLSearchParams({action:'join',confno:id});
      if(url.searchParams.has('pwd'))params.set('pwd',url.searchParams.get('pwd'));
      const scheme=/iPhone|iPad|iPod|Android/i.test(userAgent)?'zoomus':'zoommtg';
      return `${scheme}://zoom.us/join?${params}`;
    } catch {return value;}
  }
  async function load() {
    if (!meetingId) {
      content.innerHTML = "Compromisso não identificado.";
      return;
    }
    try {
      const [meeting, savedProfile] = await Promise.all([api("agent.meetingDetail",{id:meetingId}), api("agent.getProfile").catch(()=>null)]);
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
      const {meetingAgentProfile,meetingAgentSignature}=await import('/meeting-agent-signature.js?v=2');
      const profile=meetingAgentProfile(savedProfile,meeting.responsibleAgent);
      const personalSignature = meetingAgentSignature(profile);
      const agentName = String(profile?.name || "").trim();
      const meetingHost = agentName ? `${agentName} da Affinity Financial Consulting` : "a equipe da Affinity Financial Consulting";
      const dayFormat = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
      const meetingWhen = dayFormat.format(new Date(meeting.startTime)) === dayFormat.format(new Date()) ? 'de hoje' : 'do dia '+new Intl.DateTimeFormat('pt-BR',{timeZone:'America/New_York',day:'2-digit',month:'2-digit'}).format(new Date(meeting.startTime));
      const firstMessage = `Olá, ${firstName}!\n\nPassando para lembrar da nossa reunião ${meetingWhen}, às ${time(meeting.startTime)} (horário de Nova York), com ${meetingHost}.${zoom ? `\n\nAcesse a reunião pelo Zoom:\n${zoom}` : ""}\n\nNos vemos em breve!\n\n${personalSignature}`;
      const scheduleLink = meeting.rescheduleUrl || profile?.calendlyUrl || "";
      const secondMessage = `Olá, ${firstName}! Tudo bem?\n\nGostaria de retomar nosso atendimento exatamente de onde paramos e dar continuidade ao que conversamos.\n\nQuando for conveniente, responda esta mensagem ou escolha um horário para continuarmos.${scheduleLink ? `\n\n📅 Escolha seu horário:\n${scheduleLink}` : ""}\n\nFico à disposição.\n\n${personalSignature}`;
      const noShowMessage = `Olá, ${firstName}! Tudo bem?\n\nNão conseguimos nos encontrar no horário marcado. Espero que esteja tudo bem.\n\nSe desejar, podemos reagendar nossa conversa para um momento mais conveniente.${scheduleLink ? `\n\n📅 Reagende aqui:\n${scheduleLink}` : ""}\n\nFico à disposição.\n\n${personalSignature}`;
      const referralMessage = `Olá, ${firstName}! Tudo bem?\n\nFoi um prazer conversar com você. Se conhece alguém que também possa se beneficiar de uma orientação financeira cuidadosa e personalizada, ficarei muito feliz com a sua indicação.\n\nPode me enviar o nome e o telefone da pessoa por aqui. Entrarei em contato com todo cuidado e respeito.\n\nMuito obrigado pela confiança!\n\n${personalSignature}`;
      const proposalMessage=`Olá, ${firstName}!\n\nConforme conversamos na reunião, seguem as propostas de cobertura que analisamos. Confira os documentos anexos e me diga se ficou alguma dúvida ou se gostaria de ajustar alguma opção.\n\nConte comigo para ajudar na sua escolha.\n\n${personalSignature}`;
      let selectedTemplate = "Primeira chamada",selectedFiles=[];
      const requestIds=new Map();
      const requestIdFor=(channel,message,files)=>{const key=JSON.stringify([channel,message,files.map(f=>[f.name,f.size,f.lastModified])]);if(!requestIds.has(key))requestIds.set(key,crypto.randomUUID());return requestIds.get(key);};
      const encodeFiles=files=>Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({filename:file.name,content:String(reader.result).split(',')[1]});reader.onerror=()=>reject(Error('Não foi possível ler '+file.name));reader.readAsDataURL(file);})));
      content.className = "card";
      content.innerHTML = `<h2 class="meeting-client-name">${esc(meeting.inviteeName || meeting.eventName || "Compromisso")}</h2><p class="muted meeting-service-name">${esc(meeting.eventName || "Reunião")}</p><div class="grid"><div class="field"><b>Data e horário</b><span class="meeting-detail-value">${esc(format(meeting.startTime))}</span></div><div class="field"><b>Término previsto</b><span class="meeting-detail-value">${esc(format(meeting.endTime))}</span></div><div class="field"><b>Telefone</b><span class="meeting-detail-value">${esc(phone || "Não informado")}</span></div><div class="field"><b>E-mail</b><span class="meeting-detail-value">${esc(email || "Não informado")}</span></div></div><div class="actions">${meeting.meetingUrl ? `<a class="primary meeting-zoom-button" style="background:#0b5cdb!important;color:#fff!important;border-color:#0848ad!important" href="${esc(zoomAppLink(meeting.meetingUrl))}"><span class="meeting-zoom-icon" aria-hidden="true"></span>Entrar na reunião</a>` : ""}<button id="open-contact">Abrir ficha e histórico</button><a class="primary meeting-application-button" style="background:#166534!important;color:#fff!important;border-color:#14532d!important" href="/agent-applications?meetingId=${meetingId}">Iniciar nova aplicação</a><a href="/agentes/agenda">Voltar para a agenda</a></div>${(whatsapp || email) ? `<div class="card"><div class="eyebrow">Contato rápido</div><h2>Preparar mensagem</h2><div class="actions"><button id="template-first" class="primary">Primeira chamada</button><button id="template-second">Segunda chamada</button><button id="template-no-show">Não compareceu</button><button id="template-feedback">Pedir avaliação</button><button id="template-referral">Pedir indicação</button><button id="template-proposals">Propostas de cobertura</button><button id="template-blank">Mensagem em branco</button></div><textarea id="meeting-message" style="width:100%;min-height:220px;margin-top:12px;border:1px solid #293b52;border-radius:10px;background:#050d18;color:#fff;padding:14px">${esc(firstMessage)}</textarea><div class="field" style="margin-top:14px"><label for="meeting-attachments">Anexar documentos</label><input id="meeting-attachments" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls"><small>Até 10 arquivos, somando 10 MB. Para WhatsApp, até 7 MB por arquivo.</small><ul id="meeting-attachment-list"></ul></div><div class="actions"><button data-access-feature="email" id="send-email" data-message-channel="email">Enviar e-mail pelo portal</button><button data-access-feature="whatsapp" id="send-whatsapp" class="primary" style="border:1px solid #14532d!important;border-radius:10px;background:#166534!important;color:#fff!important;padding:12px 16px;font-weight:800">Enviar pelo WhatsApp do portal</button><span data-access-feature="email"><button id="send-both" data-access-feature="whatsapp" style="border:1px solid #1e40af!important;border-radius:10px;background:#1d4ed8!important;color:#fff!important;padding:12px 16px;font-weight:800"><img src="/message-icons/email.png" alt="" style="width:18px;height:18px;vertical-align:middle"> <img src="/message-icons/whatsapp.png" alt="" style="width:18px;height:18px;vertical-align:middle"> Enviar e-mail + WhatsApp</button></span></div><p class="muted">Escolha um canal ou envie pelos dois de uma vez. O resultado de cada envio será informado separadamente.</p></div>` : ""}`;
      document.getElementById("open-contact").onclick = async function () {
        this.disabled = true;
        try {
          const result = await api("agent.openMeetingClient", { meetingId }, "POST");
          if (!result?.clientId) throw new Error("Não foi possível abrir a ficha.");
          location.href = `/agentes/cliente?clientId=${Number(result.clientId)}`;
        } catch (error) { alert(error.message); this.disabled = false; }
      };
      const area = document.getElementById("meeting-message");
      const getCopies=await import("/meeting-copy.js?v=3").then(m=>m.meetingCopies(api,document.getElementById("meeting-attachment-list")));
      const jointSend=()=>["Primeira chamada","Segunda chamada"].includes(selectedTemplate)?getCopies():[];
      const copyResult=result=>result.jointResults?.length?'\nEnvio conjunto: '+result.jointResults.map(r=>r.name+': '+(r.status==='sent'?'enviado':r.reason||'não confirmado; confira antes de reenviar')).join('; '):'';
      const copyNotice=()=>jointSend().length?" Também receberão pelo WhatsApp: "+jointSend().map(r=>r.name+" (+"+r.phone+")").join(", ")+".":"";
      const renderFiles=()=>{
        const list=document.getElementById('meeting-attachment-list');list.innerHTML='';
        selectedFiles.forEach((file,index)=>{const li=document.createElement('li');li.textContent=file.name+' · '+(file.size/1024).toFixed(0)+' KB ';const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.onclick=()=>{selectedFiles.splice(index,1);renderFiles();};li.append(remove);list.append(li);});
        document.getElementById('send-whatsapp').textContent='Enviar pelo WhatsApp do portal';document.getElementById('send-whatsapp').setAttribute('data-message-channel','whatsapp');
      };
      document.getElementById('meeting-attachments').onchange=event=>{
        const incoming=[...selectedFiles,...event.target.files];const seen=new Set(),files=incoming.filter(file=>{const key=JSON.stringify([file.name,file.size,file.lastModified]);if(seen.has(key))return false;seen.add(key);return true;});
        if(files.length>10||files.reduce((total,file)=>total+file.size,0)>10*1024*1024)alert('Selecione até 10 anexos, somando no máximo 10 MB.');
        else if(files.some(file=>!file.size||!/\.(pdf|jpe?g|png|webp|gif|xlsx|xls)$/i.test(file.name)))alert('Selecione PDF, imagens ou planilhas válidas.');
        else{selectedFiles=files;renderFiles();}event.target.value='';
      };
      const emailButton = document.getElementById("send-email"),bothButton=document.getElementById('send-both');
      let sendingChannels=false;
      bothButton.disabled=!email||!whatsapp;
      bothButton.title=bothButton.disabled?'O cliente precisa ter e-mail e telefone para receber pelos dois canais.':'';
      const setSending=value=>{sendingChannels=value;emailButton.disabled=value||!email;document.getElementById('send-whatsapp').disabled=value||!whatsapp;bothButton.disabled=value||!email||!whatsapp;};
      if (emailButton) {
        emailButton.disabled = !email;
        emailButton.title = email ? `Enviar para ${email}` : "E-mail não informado";
        const sendEmailAction=async (combined=false) => {
          const message = area.value.trim();
          if (!message) return alert("Escreva a mensagem antes de enviar.");
          if(sendingChannels)return;
          const files=[...selectedFiles];
          if(combined&&(message.length>4000||files.some(file=>file.size>7*1024*1024)))return alert('Para enviar pelos dois canais, use até 4.000 caracteres e anexos de até 7 MB por arquivo.');
          if (!await confirmPortalMessage(combined?`Enviar esta mensagem${files.length?' e '+files.length+' anexo(s)':''} para ${meeting.inviteeName||'cliente'} por e-mail (${email}) e WhatsApp (${phone})?${copyNotice()}`:`Enviar esta mensagem${files.length?" e "+files.length+" anexo(s)":""} para ${meeting.inviteeName || "cliente"} (${email}) pelo seu e-mail configurado?${copyNotice()}`)) return;
          setSending(true);
          emailButton.textContent = "Enviando…";
          const subjects = { "Primeira chamada": "Lembrete da nossa reunião", "Segunda chamada": "Vamos continuar nosso atendimento?", "Não compareceu": "Sentimos sua falta na reunião", "Avaliação": "Como foi seu atendimento?", "Pedido de indicação": "Conhece alguém que podemos ajudar?", "Propostas de cobertura":"Propostas de cobertura que analisamos" };
          try {
            const payload={jointSend:jointSend(),meetingId,message,template:selectedTemplate,subject:subjects[selectedTemplate]||"Mensagem do seu consultor",attachments:await encodeFiles(files),confirmed:true};
            if(combined){
              const {sendMeetingBoth,combinedSendSummary}=await import('/meeting-combined-send.js?v=1');
              const results=await sendMeetingBoth(api,{...payload,emailRequestId:requestIdFor('email',message,files),whatsappRequestId:requestIdFor('whatsapp',message,files)});
              alert(combinedSendSummary(results)+(results.whatsapp.status==='sent'?copyResult(results.whatsapp.result):''));return;
            }
            const result=await api("agent.sendMeetingEmail", {...payload,requestId:requestIdFor("email",message,files)}, "POST");
            alert("E-mail enviado e registrado no histórico do cliente."+copyResult(result));
          } catch (error) {
            alert(error.message || "Não foi possível enviar o e-mail.");
          } finally {
            setSending(false);emailButton.textContent="Enviar e-mail pelo portal";
          }
        };
        emailButton.addEventListener('click',()=>sendEmailAction(false));
        bothButton.addEventListener('click',()=>sendEmailAction(true));
      }
      const whatsappButton = document.getElementById("send-whatsapp");
      if (whatsappButton) whatsappButton.disabled = !whatsapp;
      const selectTemplate=(id,label,message)=>{
        if(sendingChannels)return;
        selectedTemplate=label;getCopies.setTemplate(label);area.value=message;
        document.querySelectorAll('[id^="template-"]').forEach(button=>button.classList.toggle('primary',button.id===id));
      };
      const choose = (id,label,message)=>document.getElementById(id)?.addEventListener('click',()=>selectTemplate(id,label,message));
      choose("template-first", "Primeira chamada", firstMessage);
      choose("template-second", "Segunda chamada", secondMessage);
      choose("template-no-show", "Não compareceu", noShowMessage);
      choose("template-referral", "Pedido de indicação", referralMessage);
      choose("template-proposals", "Propostas de cobertura", proposalMessage);
      choose("template-blank", "Mensagem personalizada", "");
      document.getElementById("template-feedback")?.addEventListener("click", async () => {
        try {
          const invite = await api("agent.createServiceFeedbackInvite", { meetingId, clientName: meeting.inviteeName || "Cliente", clientEmail: email }, "POST");
          document.querySelectorAll('[id^="template-"]').forEach(button=>button.classList.toggle('primary',button.id==='template-feedback'));
          selectedTemplate = "Avaliação";getCopies.setTemplate(selectedTemplate);
          area.value = `Olá, ${firstName}! Tudo bem?\n\nObrigado por conversar comigo. Sua opinião é muito importante para que eu possa melhorar cada vez mais meu atendimento.\n\nPreparei um formulário rápido para você me contar como foi nossa conversa, se ficou alguma dúvida e o que gostaria de analisar melhor antes de tomar uma decisão:\n\n${invite.link}\n\nPode responder com total sinceridade. Ficarei à disposição para esclarecer qualquer dúvida.\n\n${personalSignature}`;
        } catch (error) {
          alert(error.message || "Não foi possível criar o link de avaliação.");
        }
      });
      const appButton=document.createElement('button');appButton.type='button';appButton.textContent='Abrir no aplicativo WhatsApp';appButton.setAttribute('data-message-channel','whatsapp');appButton.title='Para enviar os documentos anexados, use o envio pelo portal.';whatsappButton?.after(appButton);appButton.onclick=()=>{location.href='whatsapp://send?phone='+whatsapp+'&text='+encodeURIComponent(area.value);};
      whatsappButton?.addEventListener('click',async()=>{if(sendingChannels)return;const message=area.value.trim(),files=[...selectedFiles];if(!message)return alert('Escreva a mensagem antes de enviar.');if(!await confirmPortalMessage('Enviar a mensagem'+(files.length?' e '+files.length+' anexo(s)':'')+' pelo WhatsApp para '+(meeting.inviteeName||phone)+'?'+copyNotice()))return;setSending(true);try{const result=await api('agent.sendMeetingWhatsapp',{jointSend:jointSend(),meetingId,message,template:selectedTemplate,attachments:await encodeFiles(files),confirmed:true,requestId:requestIdFor('whatsapp',message,files)},'POST');alert('Envio confirmado pelo WhatsApp do agente.'+copyResult(result));}catch(error){alert(error.message);}finally{setSending(false);renderFiles();}});

    } catch (error) {
      content.innerHTML = esc(error.message);
    }
  }
  load();
})();
