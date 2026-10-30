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
   document.getElementById('five-rings-import-summary')?.remove();
   const summary=connection.lastImport;
   const date=connection.lastSyncAt?new Date(connection.lastSyncAt.replace(' ','T')+'Z').toLocaleString('pt-BR',{timeZone:'America/New_York'})+' · Nova York':'Nenhuma sincronização concluída.';
   const message='Última sincronização Five Rings: '+date+(summary?' · '+summary.clients+' clientes novos · '+summary.policies+' apólices novas · '+summary.updated+' apólices conferidas/atualizadas · Créditos '+(summary.creditsUpdated?'atualizados':'pendentes'):'');
   const notice={id:'five-rings-import-summary',message,href:target,label:'Sincronizar pelo navegador'};
   if(window.affinityNotify)window.affinityNotify(notice);else{const queue=window.affinityNotificationQueue||=[];const previous=queue.findIndex(item=>item.id===notice.id);if(previous>=0)queue[previous]=notice;else queue.push(notice);}

  }catch{}finally{busy=false;}
 }
 void show();setInterval(()=>void show(),20000);
})();
