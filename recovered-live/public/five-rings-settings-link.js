(()=>{
 const target='/agent-five-rings-sync.html?manual=1';
 document.addEventListener('click',event=>{
  if(location.pathname!=='/agentes/configuracoes')return;
  const button=event.target.closest?.('button');
  if(!button||!['Sincronizar clientes e apólices','Apenas verificar conexão'].includes(button.textContent.trim()))return;
  event.preventDefault();event.stopImmediatePropagation();location.assign(target);
 },true);
 let busy=false;
 async function show(){
  if(location.pathname!=='/agentes/configuracoes'){document.getElementById('five-rings-import-summary')?.remove();return;}
  if(busy)return;busy=true;
  try{const response=await fetch('/api/trpc/agent.getFiveRingsConnection?input=%7B%22json%22%3A%7B%7D%7D',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;const connection=(await response.json()).result?.data?.json;if(!connection)return;
   let box=document.getElementById('five-rings-import-summary');if(!box){box=document.createElement('aside');box.id='five-rings-import-summary';box.setAttribute('aria-label','Resultado da sincronização Five Rings');box.style.cssText='position:fixed;right:16px;bottom:100px;z-index:40;max-width:min(350px,calc(100vw - 32px));padding:14px;background:#fff;color:#173348;border:1px solid #9fb5c5;border-radius:12px;box-shadow:0 4px 16px #0002;font-size:14px';document.body.append(box);}
   box.replaceChildren();const title=document.createElement('strong');title.textContent='Última sincronização Five Rings';box.append(title);
   const date=document.createElement('p');date.textContent=connection.lastSyncAt?new Date(connection.lastSyncAt.replace(' ','T')+'Z').toLocaleString('pt-BR',{timeZone:'America/New_York'})+' · Nova York':'Nenhuma sincronização concluída.';box.append(date);
   if(connection.lastImport){const summary=connection.lastImport,p=document.createElement('p');p.textContent=summary.clients+' clientes novos · '+summary.policies+' apólices novas · '+summary.updated+' apólices conferidas/atualizadas · Créditos '+(summary.creditsUpdated?'atualizados':'pendentes');box.append(p);}
   const link=document.createElement('a');link.href=target;link.textContent='Sincronizar pelo navegador';link.style.cssText='color:#075d74;font-weight:700;text-decoration:underline';box.append(link);
  }catch{}finally{busy=false;}
 }
 void show();setInterval(()=>void show(),20000);
})();
