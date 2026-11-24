(() => {
 if(window.affinityPrivacy)return;
 let path=location.pathname;
 let kind=path.startsWith('/admin/')?'admin':path.startsWith('/assistentes/')||new URLSearchParams(location.search).get('assistantView')==='1'?'assistant':path.startsWith('/afiliados/')?'affiliate':/^\/(agentes\/|agent-)/.test(path)?'agent':'public';
 let status=null,loading=null,loadingContext='',dialog=null;
 const endpoint=route=>{path=location.pathname;kind=path.startsWith('/admin/')?'admin':path.startsWith('/assistentes/')||new URLSearchParams(location.search).get('assistantView')==='1'?'assistant':path.startsWith('/afiliados/')?'affiliate':/^\/(agentes\/|agent-)/.test(path)?'agent':'public';return '/api/legal/'+route+'?kind='+kind;};
 async function api(route,input){
  const response=await fetch(endpoint(route),{credentials:'same-origin',cache:'no-store',...(input?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}:{})});
  const body=await response.json();
  if(!response.ok)throw Error(body.error||'Não foi possível registrar suas escolhas. Tente novamente.');
  return body;
 }
 async function read(){
  const context=location.pathname+location.search;
  if(!loading||loadingContext!==context){loadingContext=context;const pending=api('status').then(value=>{if(context===location.pathname+location.search)status=value;return value;}).finally(()=>{if(loading===pending)loading=null;});loading=pending;}
  return loading;
 }
 function close(){dialog?.remove();dialog=null;}
 async function open(purpose='privacy'){
  if(dialog)return;
  if(!['account','privacy','ai'].includes(purpose))return;
  if(purpose==='account'&&!/^\/(?:agentes|afiliados|assistentes|admin)\/(?:login|registrar|cadastro)$/.test(location.pathname))return;
  let state;
  try{state=await read()}catch{return;}
  if(dialog)return;
  if(purpose!=='account'&&!['privacy','ai'].includes(purpose)&&['agent','assistant','admin','affiliate'].includes(kind))return;
  if(state.accepted&&!['privacy','ai'].includes(purpose))return;
  if(purpose==='ai'&&state.choices?.aiProcessing)return;
  const registration=purpose==='account',agreementRequired=registration&&!state.accepted;
  dialog=document.createElement('dialog');
  dialog.setAttribute('aria-label','Privacidade e termos');
  dialog.style.cssText='width:min(620px,calc(100% - 32px));max-height:85vh;overflow:auto;border:1px solid #9fb1c4;border-radius:16px;padding:24px;background:#fff;color:#14233b;font:16px/1.5 system-ui;box-shadow:0 12px 70px #0005';
  dialog.innerHTML='<h2 style="margin-top:0">Privacidade e termos</h2><p>Confira as informações sobre o uso do portal e seus dados.</p><p><a href="/terms-of-use.html" target="_blank" rel="noopener">Termos de Uso</a> · <a href="/portal-privacy.html" target="_blank" rel="noopener">Política de Privacidade</a></p><label style="display:flex;gap:12px;align-items:flex-start;margin:18px 0"><input id="legal-agree" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Li e concordo com os Termos de Uso e estou ciente da Política de Privacidade.</span></label><label style="display:flex;gap:12px;margin:18px 0"><input id="legal-media" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Permitir players externos de vídeo (Vimeo/YouTube). Esses serviços podem receber dados técnicos e usar cookies.</span></label><section id="legal-ai"><h3>IA opcional</h3><label style="display:flex;gap:12px;margin:14px 0"><input id="legal-ai-processing" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Autorizar o envio das minhas solicitações e do contexto permitido à IA da Cloudflare para responder e preparar rascunhos.</span></label><label style="display:flex;gap:12px;margin:14px 0"><input id="legal-ai-memory" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Guardar minhas conversas e preferências para personalização. Posso desativar depois. Não há treinamento de modelos com esses dados.</span></label></section><p id="legal-error" role="alert" style="color:#8b1e14"></p><div style="display:flex;flex-wrap:wrap;gap:12px"><button type="button" id="legal-save" style="background:#155a9c;color:white;border:0;border-radius:9px;padding:13px 20px;font-weight:700">Salvar minhas escolhas</button><button type="button" id="legal-close" style="background:#edf2f7;color:#17324d;border:1px solid #9fb1c4;border-radius:9px;padding:13px 20px">Agora não</button></div>';
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  document.body.append(dialog);
  const get=id=>dialog.querySelector('#'+id);
  get('legal-agree').checked=state.accepted;
  if(!agreementRequired)get('legal-agree').closest('label').remove();
  if(!agreementRequired){dialog.querySelector('h2').textContent=purpose==='ai'?'Ativar assistente de IA':'Preferências de privacidade';const intro=dialog.querySelector('h2+p');dialog.setAttribute('aria-label',purpose==='ai'?'Ativar assistente de IA':'Preferências de privacidade');intro.textContent=purpose==='ai'?'Escolha as permissões opcionais para usar a assistente de IA.':'Ajuste suas permissões opcionais de privacidade.';intro.nextElementSibling.remove();}
  get('legal-media').checked=state.media;
  if(purpose==='ai')get('legal-media').closest('label').remove();
  get('legal-ai').hidden=!state.authenticated&&!registration;
  get('legal-ai-processing').checked=state.choices?.aiProcessing===true;
  get('legal-ai-memory').checked=state.choices?.aiMemory===true;
  get('legal-ai-processing').onchange=()=>{if(!get('legal-ai-processing').checked)get('legal-ai-memory').checked=false;};
  get('legal-close').onclick=close;
  get('legal-save').onclick=async()=>{
   const button=get('legal-save'),error=get('legal-error');
   if(agreementRequired&&!get('legal-agree').checked){error.textContent='Marque o aceite dos termos e da política para continuar.';return;}
   button.disabled=true;error.textContent='';
   try{
    const media=get('legal-media')?.checked??state.media;
    if(agreementRequired||state.accepted&&media!==state.media)await api('accept',{accepted:true,version:state.version,purpose,media,aiProcessing:get('legal-ai-processing').checked,aiMemory:get('legal-ai-memory').checked});
    if(state.authenticated)await api('choices',{aiProcessing:get('legal-ai-processing').checked,aiMemory:get('legal-ai-memory').checked});
    try{localStorage.setItem('affinity_external_media',media?'yes':'no');}catch{}
    await read();
    close();
    window.dispatchEvent(new CustomEvent('affinity-privacy-changed',{detail:{media}}));
   }catch(e){error.textContent=e.message;button.disabled=false;}
  };
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 async function ensure(purpose){
  if(purpose!=='account')return true;
  try{const state=await read();if(state.accepted)return true;await open('account');return false}catch{return false}
 }
 window.affinityPrivacy={open,ensure,refresh:read};
 // Only account registration may interrupt a form to request service-term acceptance.
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.method==='dialog'||form.closest('dialog'))return;
  const authPage=/^\/(?:agentes|afiliados|assistentes|admin)\/(?:login|registrar|cadastro)$/.test(location.pathname);
  const passwordCount=form.querySelectorAll('input[type=password]').length;
  const registration=authPage&&passwordCount>0&&(passwordCount>=2||/\/(registrar|cadastro)$/.test(location.pathname)||/cadastr|registr|criar conta|create account|sign up/i.test(event.submitter?.textContent||''));
  if(!registration||status?.accepted)return;
  event.preventDefault();event.stopImmediatePropagation();
  const submitter=event.submitter;void read().then(state=>{if(state.accepted){if(submitter?.isConnected)form.requestSubmit(submitter);else form.requestSubmit();}else void open('account');}).catch(()=>{});
 },true);
 // Account agreements are collected only during registration; never open them on portal load.
 read().catch(()=>{});
})();
