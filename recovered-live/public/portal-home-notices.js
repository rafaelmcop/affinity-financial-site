// Mirror authenticated home notices into the shared bell on every staff screen.
(()=>{
 if(window.top!==window||!/^\/(agentes|assistentes|agent-)/.test(location.pathname))return;
 if(window.affinityHomeNoticesMounted)return;window.affinityHomeNoticesMounted=true;
 const assistant=location.pathname.startsWith('/assistentes/'),groups=new Map();let busy=false,generation=0;
 const prefix=assistant?'/api/assistants/procedure/':'/api/trpc/';
 const destination=path=>assistant?(path.startsWith('/agentes/dashboard?review=')?'/assistentes/dashboard?review='+encodeURIComponent(new URL(path,location.origin).searchParams.get('review')):'/assistentes/dashboard?open='+encodeURIComponent(path)):path;
 function replace(key,rows){const next=new Set();for(const row of rows){const id='home:'+key+':'+row.id;next.add(id);window.affinityNotify?.({...row,id,persistent:true});}for(const id of groups.get(key)||[])if(!next.has(id))window.affinityClearNotice?.(id);groups.set(key,next);}
 function clear(){for(const key of groups.keys())replace(key,[]);}
 async function json(url){const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});if([401,403].includes(response.status)){clear();throw Error('unauthorized');}if(!response.ok)throw Error('unavailable');return response.json();}
 async function api(name){return (await json(prefix+'agent.'+name+'?input='+encodeURIComponent('{"json":{}}'))).result.data.json;}
 function birthdays(rows,canOpenClient=true){return (rows||[]).map(c=>({id:c.id,message:'🎂 Aniversário de hoje · '+c.name+(c.emailStatus==='shared_email_review'?' · Atenção: nomes diferentes para o mesmo e-mail; envio automático suspenso':c.sentAt?' · E-mail enviado em '+new Date(/Z$/.test(c.sentAt)?c.sentAt:c.sentAt.replace(' ','T')+'Z').toLocaleString('pt-BR',{timeZone:'America/New_York'}):' · Confira a programação do e-mail'),label:'Ver aniversariante',href:canOpenClient?destination('/agentes/cliente?clientId='+encodeURIComponent(c.id)+'&birthday=1'):(assistant?'/assistentes/dashboard':'/agentes/dashboard')}));}
 async function refresh(){if(busy||document.hidden)return;busy=true;const ticket=++generation;try{
 const access=await json(assistant?'/api/assistants/me':'/api/agent/access');if(ticket!==generation)return;
 const can=feature=>assistant?(access.permissions?.[feature]?.includes('view')===true):access.features?.includes(feature);
 const jobs=[];
 if(assistant){jobs.push(json('/api/assistants/home').then(data=>{if(ticket===generation&&!data.warnings?.includes('birthdays'))replace('birthdays',birthdays(data.birthdays,data.canOpenClient));}));}
 else{
 if(can('policies')||can('messages'))jobs.push(api('birthdayAlerts').then(rows=>{if(ticket===generation)replace('birthdays',birthdays(rows,can('policies')));}));else replace('birthdays',[]);
 if(can('email')||can('tasks'))jobs.push(api('homeNotices').then(data=>{if(ticket!==generation)return;replace('payments',(data.tasks||[]).filter(t=>t.status==='pending').map(t=>({id:t.id,message:'Pagamento pendente · '+String(t.title||'').replace(/^\[Pagamento [^\]]+\]\s*/,''),label:'Abrir caso de pagamento',href:'/agentes/caso-pagamento?task='+encodeURIComponent(t.id)})));replace('messages',(data.notifications||[]).map(t=>({id:t.id,message:'E-mail recebido · '+(t.clientName||t.subject||'Cliente'),label:'Abrir mensagem',href:'/agentes/email?clientEmailId='+encodeURIComponent(t.id)})));}));else{replace('payments',[]);replace('messages',[]);}
 }
 if(can('email')||can('email_review'))jobs.push(api('listEmailReviews').then(rows=>{if(ticket===generation)replace('reviews',rows.map(t=>({id:t.key,message:(t.kind==='bounce'?'Devolução de e-mail · ':'E-mail para revisão · ')+(t.name||t.to||'Destinatário a conferir')+' · '+(t.reason||t.subject||''),label:t.kind==='bounce'?'Ver motivo da devolução':'Revisar e-mail',href:destination('/agentes/dashboard?review='+encodeURIComponent(t.key))})));}));else replace('reviews',[]);
 await Promise.allSettled(jobs);
 }catch{}finally{busy=false;}}
 window.addEventListener('affinity-notifications-changed',()=>void refresh());window.addEventListener('focus',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});setInterval(refresh,60000);void refresh();
})();
