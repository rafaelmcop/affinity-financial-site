(()=>{
 let pending=false;
 function mount(){
  const active=location.pathname==='/agentes/configuracoes'&&new URLSearchParams(location.search).get('view')!=='profile';
  const existing=document.getElementById('assistant-settings-link');
  if(!active){existing?.remove();return;}
  // Wait for the real settings view. The React root is never a content host.
  const main=document.querySelector('main.agent-settings-integrations');
  if(!main){existing?.remove();return;}
  if(existing){if(existing.parentElement!==main)main.append(existing);return;}
  const section=document.createElement('section');section.id='assistant-settings-link';
  section.style.cssText='position:static;display:block;box-sizing:border-box;clear:both;max-width:100%;margin:24px 0;padding:24px;background:var(--agent-surface,#fff);color:var(--agent-text,#173348);border:1px solid var(--agent-border,#91a9bb);border-radius:12px';
  section.innerHTML='<h2>Minha assistente</h2><p>Cadastre ou administre o acesso da sua assistente. Escolha o que ela pode visualizar, editar e excluir.</p><a href="/agentes/assistentes" style="display:inline-block;background:#126448;color:#fff;padding:12px 18px;border-radius:8px;font-weight:700;text-decoration:none">Administrar assistente</a>';
  main.append(section);
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount();});}
 const start=()=>{mount();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('popstate',schedule);
})();
