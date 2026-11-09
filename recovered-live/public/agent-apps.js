const $=id=>document.getElementById(id);
const released=await fetch('/api/agent/access',{credentials:'same-origin',cache:'no-store'}).then(async r=>r.ok?new Set((await r.json()).features||[]):new Set()).catch(()=>new Set());
for(const [id,key]of [['email','email'],['calendar','calendar'],['five-rings','five_rings']]){const el=$(id);if(el)el.hidden=!released.has(key);}

if(location.hash==='#national-life'&&$('nlg-pilot'))$('nlg-pilot').open=true;

if(released.has('five_rings')){
 const sync=document.createElement('script');
 sync.src='/agent-five-rings-sync.js?v=1.0.14';
 document.head.append(sync);
}
const pilotStart=$('nlg-pilot-start');
pilotStart?.addEventListener('click',()=>{
 if(pilotStart.dataset.connectorReady==='true')return;
 $('nlg-pilot-progress').textContent='Conector não detectado nesta aba. Abra Integrações no Chrome ou Edge onde a extensão atualizada está instalada. Em chrome://extensions, recarregue o conector, permita acesso a este site e atualize a página.';
});
const savedIssues=$('nlg-saved-issues');
if(savedIssues){
 const list=$('nlg-pending-list'),status=$('nlg-pending-status'),search=$('nlg-pending-search'),showReviewed=$('nlg-show-reviewed');
 const fields={'data de emissão':['issueDate','date'],'prêmio':['premium','number'],'frequência':['frequency',['Monthly','Quarterly','Semiannual','Annual','Weekly','Biweekly']],'death benefit':['deathBenefit','number'],'status':['status',['Active','Pending','Pending Lapse','Lapsed','Not Taken','Inactive','Declined','Cancelled']]};
 let rows=[];
 function renderPending(){
  const filter=search.value.trim().replace(/[^a-z0-9]/gi,'').toUpperCase();
  const visible=rows.filter(row=>row.policyNumber.includes(filter)&&(showReviewed.checked||row.outstanding.length));
  list.replaceChildren();
  status.textContent=visible.length+' apólice(s) nesta lista.';
  for(const row of visible){
   const card=document.createElement('details');
   const title=document.createElement('summary');
   title.textContent=row.policyNumber+' · '+row.category+' · '+(row.outstanding.join(', ')||'Correção registrada');
   card.append(title);
   const form=document.createElement('form');
   for(const missing of row.missing){
    const field=fields[missing];
    if(!field)continue;
    const [key,type]=field;
    const label=document.createElement('label');label.textContent=missing;
    const input=document.createElement(Array.isArray(type)?'select':'input');
    input.name=key;
    if(Array.isArray(type))input.replaceChildren(new Option('Selecione',''),...type.map(value=>new Option(value,value)));
    else{input.type=type;if(type==='number'){input.min='0';input.step='0.01';}}
    input.value=row.corrections[key]||'';
    label.append(input);form.append(label);
   }
   if(form.children.length){
    const save=document.createElement('button');save.type='submit';save.className='primary';save.textContent='Salvar correção';
    const feedback=document.createElement('p');feedback.setAttribute('role','status');
    form.append(save,feedback);
    form.onsubmit=async event=>{
     event.preventDefault();save.disabled=true;
     try{
      const values=Object.fromEntries(new FormData(form));
      const response=await fetch('/api/agent/nlg-pilot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'correct',number:row.policyNumber,values})});
      if(!response.ok)throw Error('Confira os campos e informe pelo menos um valor válido.');
      await loadPending();
      status.textContent='Correção salva para a apólice '+row.policyNumber+'.';
     }catch(error){feedback.textContent=error.message;}
     finally{save.disabled=false;}
    };
    card.append(form);
   }
   list.append(card);
  }
 }
 async function loadPending(){
  try{
   const response=await fetch('/api/agent/nlg-pilot?pending=1',{cache:'no-store'});
   if(!response.ok)throw Error();
   rows=(await response.json()).pending;
   renderPending();
  }catch{status.textContent='Não foi possível carregar as pendências.';}
 }
 savedIssues.addEventListener('toggle',()=>{if(savedIssues.open)void loadPending();});
 search.addEventListener('input',renderPending);
 showReviewed.addEventListener('change',renderPending);
 if(location.hash==='#nlg-saved-issues'){$('nlg-pilot').open=true;savedIssues.open=true;}
}

const sharedPolicies=$('nlg-shared-policies');
sharedPolicies?.addEventListener('toggle',async()=>{
 if(!sharedPolicies.open)return;
 const list=sharedPolicies.querySelector('ul');
 try{
  const response=await fetch('/api/agent/nlg-pilot?shared=1',{cache:'no-store'});
  if(!response.ok)throw Error();
  const {shared}=await response.json();
  list.replaceChildren(...(shared.length?shared.map(row=>row.policyNumber+' · '+row.agents.join(' / ')):['Nenhum vínculo múltiplo observado ainda.']).map(text=>{
   const item=document.createElement('li');item.textContent=text;return item;
  }));
 }catch{list.textContent='Não foi possível carregar os vínculos.';}
});

async function api(name,input){const r=await fetch('/api/trpc/'+name+(input===undefined?'?input='+encodeURIComponent(JSON.stringify({json:{}})):''),{credentials:'same-origin',cache:'no-store',...(input===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:input})})}),body=await r.json();if(!r.ok||body.error)throw Error(body.error?.json?.message||'Não foi possível concluir.');return body.result?.data?.json;}
function state(id,text,connected=false){$(id).textContent=text;$(id).classList.toggle('connected',connected);}
async function loadEmail(){try{const saved=await api('agent.getEmailSettings');state('email-state',saved?.passwordConfigured?'Configurado':'Não conectado',!!saved?.passwordConfigured);}catch{state('email-state','Verifique a conexão');}}
async function loadCalendar(){try{const [saved,r]=await Promise.all([api('agent.getCalendly'),fetch('/api/agent/calendar-provider',{cache:'no-store'})]);const feed=r.ok?(await r.json()).connection:null;const connected=!!saved?.connection||!!feed;state('calendar-state',connected?'Conectada':'Não conectada',connected);const calendly=saved?.calendlyConnection||(!saved?.connection?.provider||saved.connection.provider==='calendly'?saved?.connection:null);$('calendly-state').textContent=calendly?'Calendly conectado.':'Calendly não conectado.';$('calendly-app-form').hidden=!!calendly;$('calendly-app-actions').hidden=!calendly;}catch{state('calendar-state','Verifique a conexão');}}
for(const [formId,get,save,badge,notice]of [['five-app-form','agent.getFiveRingsConnection','agent.saveFiveRingsConnection','five-state','five-app-status']]){
 const form=$(formId);if(form.closest('details').hidden)continue;async function load(){try{const saved=await api(get);if(saved?.lastImport||saved?.lastError){const last=saved?.lastImport;$('five-app-status').textContent=[last&&('Última sincronização: '+last.policies+' apólices novas · '+last.updated+' atualizadas.'),saved.lastError||last?.warning].filter(Boolean).join(' ');}form.elements.portalEmail.value=saved?.portalEmail||'';form.elements.password.required=!saved?.passwordConfigured;state(badge,saved?.passwordConfigured?'Configurado':'Não conectado',!!saved?.passwordConfigured);}catch(error){state(badge,'Verifique a conexão');$(notice).textContent=error.message;}}
 form.onsubmit=async event=>{event.preventDefault();const b=event.submitter;b.disabled=true;try{await api(save,{portalEmail:form.elements.portalEmail.value.trim(),password:form.elements.password.value});form.elements.password.value='';await load();$(notice).textContent='Conexão salva. As verificações de segurança são feitas no portal do provedor.';}catch(error){$(notice).textContent=error.message;}finally{b.disabled=false;}};void load();
}
$('calendly-app-form').onsubmit=async event=>{event.preventDefault();const b=event.submitter;b.disabled=true;try{await api('agent.connectCalendly',{token:event.target.elements.token.value.trim()});event.target.elements.token.value='';await loadCalendar();}catch(error){$('calendly-state').textContent=error.message;}finally{b.disabled=false;}};
$('calendly-app-sync').onclick=async()=>{try{$('calendly-state').textContent='Atualizando agenda…';const result=await api('agent.syncCalendly',{});await loadCalendar();$('calendly-state').textContent=(result.saved||0)+' compromissos conferidos.';}catch(error){$('calendly-state').textContent=error.message;}};
$('calendly-app-disconnect').onclick=async()=>{if(!$('calendly-disconnect-confirm').checked){$('calendly-state').textContent='Confirme a desconexão antes de continuar.';return;}try{await api('agent.disconnectCalendly',{});$('calendly-disconnect-confirm').checked=false;await loadCalendar();}catch(error){$('calendly-state').textContent=error.message;}};
let waAllowed=false,waPolling=false;
async function whatsapp(){if(!waAllowed||document.hidden)return;try{const r=await fetch('/api/agent/whatsapp/status',{cache:'no-store'}),saved=await r.json();if(!r.ok)throw Error(saved.error||'Conexão indisponível.');state('wa-state',saved.state==='ready'?'Conectado':saved.qr?'Leia o QR Code':'Desconectado',saved.state==='ready');$('wa-app-connect').hidden=saved.state==='ready';$('wa-app-qr').hidden=!saved.qr;if(saved.qr)$('wa-app-qr').src=saved.qr;if(waPolling&&$('whatsapp').open&&saved.state!=='ready')setTimeout(whatsapp,3000);else waPolling=false;}catch(error){$('wa-app-status').textContent=error.message;waPolling=false;}}
$('whatsapp').addEventListener('toggle',()=>{if($('whatsapp').open)void whatsapp();});$('wa-app-connect').onclick=async()=>{if(!waAllowed)return;try{$('wa-app-status').textContent='Preparando QR Code…';const r=await fetch('/api/agent/whatsapp/connect',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(!r.ok)throw Error('Não foi possível iniciar a conexão.');waPolling=true;await whatsapp();}catch(error){$('wa-app-status').textContent=error.message;}};
async function loadWhatsAppAccess(){try{const r=await fetch('/api/agent/portal-whatsapp-access',{cache:'no-store'});waAllowed=r.ok&&(await r.json()).allowed===true;if(waAllowed){$('whatsapp').hidden=false;$('wa-app-connect').hidden=false;state('wa-state','Abra para verificar');}else{state('wa-state','Em preparação');$('wa-app-status').textContent='Esta integração não está liberada para sua conta.';}}catch{state('wa-state','Verifique a conexão');}openSection();}
function openSection(){const id=location.hash.slice(1),section=$(id);if(section?.tagName==='DETAILS'&&!section.hidden){section.open=true;section.scrollIntoView({block:'start'});}}window.addEventListener('hashchange',openSection);openSection();
if(released.has('whatsapp'))void loadWhatsAppAccess();
if(released.has('email'))void loadEmail();if(released.has('calendar'))void loadCalendar();document.getElementById('email-connect').addEventListener('submit',()=>setTimeout(loadEmail,2500));document.getElementById('calendar-connect').addEventListener('submit',()=>setTimeout(loadCalendar,2500));

window.addEventListener("affinity-calendar-connected",()=>void loadCalendar());
