(() => {
 if(window.affinityPrivacy)return;
 let path=location.pathname;
 let kind=path.startsWith('/admin/')?'admin':path.startsWith('/assistentes/')||new URLSearchParams(location.search).get('assistantView')==='1'?'assistant':path.startsWith('/afiliados/')?'affiliate':/^\/(agentes\/|agent-)/.test(path)?'agent':'public';
 let status=null,loading=null,dialog=null;
 const endpoint=route=>{path=location.pathname;kind=path.startsWith('/admin/')?'admin':path.startsWith('/assistentes/')||new URLSearchParams(location.search).get('assistantView')==='1'?'assistant':path.startsWith('/afiliados/')?'affiliate':/^\/(agentes\/|agent-)/.test(path)?'agent':'public';return '/api/legal/'+route+'?kind='+kind;};
 async function api(route,input){
  const response=await fetch(endpoint(route),{credentials:'same-origin',cache:'no-store',...(input?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}:{})});
  const body=await response.json();
  if(!response.ok)throw Error(body.error||'Não foi possível registrar suas escolhas. Tente novamente.');
  return body;
 }
 async function read(){
  if(!loading)loading=api('status').then(value=>status=value).finally(()=>loading=null);
  return loading;
 }
 function close(){dialog?.remove();dialog=null;}
 async function open(purpose='privacy'){
  if(dialog)return;
  let state;
  try{state=await read()}catch{return;}
  dialog=document.createElement('dialog');
  dialog.setAttribute('aria-label','Privacidade e termos');
  dialog.style.cssText='width:min(620px,calc(100% - 32px));max-height:85vh;overflow:auto;border:1px solid #9fb1c4;border-radius:16px;padding:24px;background:#fff;color:#14233b;font:16px/1.5 system-ui;box-shadow:0 12px 70px #0005';
  dialog.innerHTML='<h2 style="margin-top:0">Privacidade e termos</h2><p>Confira as informações sobre o uso do portal e seus dados.</p><p><a href="/terms-of-use.html" target="_blank" rel="noopener">Termos de Uso</a> · <a href="/portal-privacy.html" target="_blank" rel="noopener">Política de Privacidade</a></p><label style="display:flex;gap:12px;align-items:flex-start;margin:18px 0"><input id="legal-agree" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Li e concordo com os Termos de Uso e estou ciente da Política de Privacidade.</span></label><label style="display:flex;gap:12px;margin:18px 0"><input id="legal-media" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Permitir players externos de vídeo (Vimeo/YouTube). Esses serviços podem receber dados técnicos e usar cookies.</span></label><section id="legal-ai"><h3>IA opcional</h3><label style="display:flex;gap:12px;margin:14px 0"><input id="legal-ai-processing" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Autorizar o envio das minhas solicitações e do contexto permitido à IA da Cloudflare para responder e preparar rascunhos.</span></label><label style="display:flex;gap:12px;margin:14px 0"><input id="legal-ai-memory" type="checkbox" style="width:22px;height:22px;flex-shrink:0;margin:0"><span>Guardar minhas conversas e preferências para personalização. Posso desativar depois. Não há treinamento de modelos com esses dados.</span></label></section><p id="legal-error" role="alert" style="color:#8b1e14"></p><div style="display:flex;flex-wrap:wrap;gap:12px"><button type="button" id="legal-save" style="background:#155a9c;color:white;border:0;border-radius:9px;padding:13px 20px;font-weight:700">Salvar minhas escolhas</button><button type="button" id="legal-close" style="background:#edf2f7;color:#17324d;border:1px solid #9fb1c4;border-radius:9px;padding:13px 20px">Agora não</button></div>';
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  document.body.append(dialog);
  const get=id=>dialog.querySelector('#'+id);
  get('legal-agree').checked=state.accepted;
  get('legal-agree').closest('label').hidden=state.accepted;
  if(state.accepted){dialog.querySelector('h2').textContent=purpose==='ai'?'Ativar assistente de IA':'Preferências de privacidade';const intro=dialog.querySelector('h2+p');intro.textContent=purpose==='ai'?'Seus termos já foram aceitos. Para usar a IA, escolha abaixo as permissões opcionais de processamento.':'Seus termos já foram aceitos. Você pode ajustar as permissões opcionais abaixo.';intro.nextElementSibling.hidden=true;}
  get('legal-media').checked=state.media;
  get('legal-ai').hidden=!state.authenticated;
  get('legal-ai-processing').checked=state.choices?.aiProcessing===true;
  get('legal-ai-memory').checked=state.choices?.aiMemory===true;
  get('legal-ai-processing').onchange=()=>{if(!get('legal-ai-processing').checked)get('legal-ai-memory').checked=false;};
  get('legal-close').onclick=close;
  get('legal-save').onclick=async()=>{
   const button=get('legal-save'),error=get('legal-error');
   if(!get('legal-agree').checked){error.textContent='Marque o aceite dos termos e da política para continuar.';return;}
   button.disabled=true;error.textContent='';
   try{
    const media=get('legal-media').checked;
    if(!state.accepted||media!==state.media)await api('accept',{accepted:true,version:state.version,purpose,media});
    if(state.authenticated)await api('choices',{aiProcessing:get('legal-ai-processing').checked,aiMemory:get('legal-ai-memory').checked});
    localStorage.setItem('affinity_external_media',media?'yes':'no');
    await read();
    close();
    footer.setAttribute('role','status');footer.title='Escolhas salvas. Continue a operação que estava realizando.';
    window.dispatchEvent(new CustomEvent('affinity-privacy-changed',{detail:{media}}));
   }catch(e){error.textContent=e.message;button.disabled=false;}
  };
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 async function ensure(purpose){
  try{const state=await read();if(state.accepted)return true;await open(purpose);return false}catch{return false}
 }
 window.affinityPrivacy={open,ensure,refresh:read};
 const footer=document.createElement('div');
 footer.id='affinity-legal-links';
 footer.style.cssText='position:relative;clear:both;padding:16px 24px;text-align:center;background:#edf2f7;color:#17324d;font:14px/1.5 system-ui';
 footer.innerHTML='<a href="/terms-of-use.html" style="color:#155a9c;margin:0 10px">Terms of Use</a><a href="/portal-privacy.html" style="color:#155a9c;margin:0 10px">Privacy Policy</a><button type="button" style="border:0;background:transparent;text-decoration:underline;color:#155a9c;font:inherit;padding:8px 10px">Privacy settings</button>';
 footer.querySelector('button').onclick=()=>void open();
 if(kind==='admin'){const a=document.createElement('a');a.href='/admin/privacidade-seguranca';a.textContent='Privacy & security records';a.style.cssText='color:#155a9c;margin:0 10px';footer.append(a);}
 document.body.append(footer);
 // Add a discoverable preference control to the existing, independently managed account menus.
 const attach=()=>{for(const menu of document.querySelectorAll('.agent-account-popover,#affinity-admin-account>div')){if(menu.querySelector('[data-privacy-settings]'))continue;const button=document.createElement('button');button.type='button';button.dataset.privacySettings='';button.textContent='Privacidade / Privacy';button.onclick=()=>void open();menu.append(button);}};
 attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
 // A visitor can browse without accepting service terms. Submission and portal use ask explicitly.
 document.addEventListener('submit',event=>{
  if(event.target.method==='dialog'||event.target.closest('dialog'))return;
  const loginOnly=/\/login$/.test(path)&&event.target.querySelectorAll('input[type=password]').length<2&&!/cadastr|registr|create account|sign up/i.test(event.submitter?.textContent||'');
  if(loginOnly)return;
  if(status?.accepted)return;
  event.preventDefault();event.stopImmediatePropagation();
  void open(path.includes('aplicacao')?'application':/registrar/.test(path)?'account':'contact');
 },true);
 document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||button.closest('dialog'))return;
  if(button.id==='portal-ai-open'&&!status?.choices?.aiProcessing){event.preventDefault();event.stopImmediatePropagation();void open('ai');return;}
  if(status?.accepted)return;
  if(button.matches('#save,#next-step,#save-draft,#next,#portal-ai-submit,[data-step-index]')){
   event.preventDefault();event.stopImmediatePropagation();void open(path.includes('aplicacao')?'application':'portal');
  }
 },true);
 read().then(state=>{
  if(state.authenticated&&!state.accepted&&!/\/(login|registrar)$/.test(path))void open('portal');
 }).catch(()=>{});
})();
