const base='https://portal.fiveringsfinancial.com';
// Read the parameters used by the portal's own loaded DataTables. No credentials
// or arbitrary page code are exported or evaluated.
async function loadedTab(id){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(Error('A página de '+type+' demorou para abrir.'));},25000);function listener(id,info){if(id===id&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve();}}chrome.tabs.onUpdated.addListener(listener);chrome.tabs.get(id).then(t=>{if(t.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve();}}).catch(error=>{clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);reject(error);});});}
async function nativeTableQueryOnce(type,tab){
 await chrome.tabs.update(tab.id,{url:base+'/account/'+type});
 {
  await loadedTab(tab.id);
  const results=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',args:[type],func:async(type)=>{
   const limit=Date.now()+15000;
   while(Date.now()<limit){
    if(location.origin!=='https://portal.fiveringsfinancial.com'||location.pathname!=='/account/'+type)return {error:'A página de '+type+' pediu autenticação ou mudou de endereço.'};
    const jq=window.jQuery,settings=jq?.fn?.dataTable?.settings;
    for(const table of Array.from(settings||[])){
     const raw=typeof table.ajax==='string'?table.ajax:table.ajax?.url||table.sAjaxSource;
     if(!raw)continue;
     const url=new URL(raw,location.href);
     if(url.origin!==location.origin||url.pathname!=='/account/'+type+'/data')continue;
     const data=table.oAjaxData;
     if(!data?.columns?.length)continue;
     const query=new URLSearchParams();
     data.columns.forEach((c,i)=>{
      for(const key of ['data','name','searchable','orderable']){
       const value=c[key]??'';if(['string','number','boolean'].includes(typeof value))query.set(`columns[${i}][${key}]`,String(value));
      }
      query.set(`columns[${i}][search][value]`,'');query.set(`columns[${i}][search][regex]`,'false');
     });
     (data.order||[]).forEach((o,i)=>{if(Number.isInteger(Number(o.column))&&['asc','desc'].includes(o.dir)){query.set(`order[${i}][column]`,String(o.column));query.set(`order[${i}][dir]`,o.dir);}});
     return {query:query.toString()};
    }
    await new Promise(resolve=>setTimeout(resolve,200));
   }
   return {error:'Não foi possível identificar a consulta da tabela de '+type+'. Confira se a lista abre normalmente no Five Rings.'};
  }});
  const result=results[0]?.result;if(!result?.query)throw Error(result?.error||'Tabela de '+type+' indisponível.');return result.query;
 }
}
async function nativeTableQuery(type,tab){try{return await nativeTableQueryOnce(type,tab);}catch(error){if(!/back.?forward cache|message channel|receiving end|port.*closed/i.test(error.message||''))throw error;return await nativeTableQueryOnce(type,tab);}}
const jobs=new Map(),backgroundTasks=new Map();
async function collectSnapshot(message){
 const tabs=await chrome.tabs.query({url:base+'/*'});
 if(tabs.length>1)throw Error('Deixe apenas uma aba Five Rings aberta, na conta correta.');
 const reader=tabs[0]||await chrome.tabs.create({url:base+'/account/dashboard',active:false});
 const original=tabs[0]?.url?(()=>{const u=new URL(tabs[0].url);return /^\/account\/(?:dashboard|clients|policies)(?:\/[0-9a-f-]+)?$/.test(u.pathname)?base+u.pathname:base+'/account/dashboard';})():null;
 try{
  const queries={};for(const type of ['clients','policies'])queries[type]=await nativeTableQuery(type,reader);
  await chrome.tabs.update(reader.id,{url:base+'/account/dashboard'});await loadedTab(reader.id);
  const request={action:'collect',portalEmail:message.portalEmail,manualConfirmed:message.manualConfirmed===true,queries};
  try{return await chrome.tabs.sendMessage(reader.id,request);}
  catch(error){
   if(!/back.?forward cache|message channel|receiving end|port.*closed/i.test(error.message||''))throw error;
   await loadedTab(reader.id);
   return await chrome.tabs.sendMessage(reader.id,request);
  }
 }finally{if(!original)await chrome.tabs.remove(reader.id).catch(()=>{});else {const current=await chrome.tabs.get(reader.id).catch(()=>null);if(current&&['/account/clients','/account/policies','/account/dashboard'].includes(new URL(current.url).pathname))await chrome.tabs.update(reader.id,{url:original}).catch(()=>{});}}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(!sender.tab?.url?.startsWith('https://www.affinityfc.org/')||!['open','collectStart','collectStatus','ping','backgroundStart','backgroundFinish'].includes(message.action))return;
 (async()=>{
  for(const [id,job]of jobs)if(Date.now()-job.started>300000)jobs.delete(id);
  if(message.action==='ping')return {ok:true,version:chrome.runtime.getManifest().version};
  if(message.action==='backgroundFinish'){
   const task=[...backgroundTasks.values()].find(t=>t.tab===sender.tab.id);
   if(!task)throw Error('Tarefa não encontrada.');
   task.finished=Date.now();task.error=typeof message.error==='string'?message.error.slice(0,500):'';
   await chrome.tabs.remove(task.tab).catch(()=>{});return {ok:true};
  }
  if(message.action==='backgroundStart'){
   const owner=String(message.owner||'').trim().toLowerCase();if(!owner)throw Error('Entre novamente no portal.');
   const existing=backgroundTasks.get(owner);
   if(existing&&!existing.finished){const current=await chrome.tabs.get(existing.tab).catch(()=>null);if(!current||!current.url?.startsWith('https://www.affinityfc.org/agent-five-rings-sync.html')||Date.now()-existing.started>300000){existing.finished=Date.now();existing.error='A leitura foi interrompida. Verifique sua conexão Five Rings.';if(current)await chrome.tabs.remove(existing.tab).catch(()=>{});}}
   if(existing&&Date.now()-existing.started<900000)return {ok:true,processing:!existing.finished,error:existing.error||''};
   const task={started:Date.now(),finished:0,error:'',tab:null};backgroundTasks.set(owner,task);
   try{const tab=await chrome.tabs.create({url:'https://www.affinityfc.org/agent-five-rings-sync.html?background=1',active:false});task.tab=tab.id;}catch(error){backgroundTasks.delete(owner);throw error;}
   return {ok:true,processing:true};
  }
  if(message.action==='open'){const tabs=await chrome.tabs.query({url:base+'/*'});if(tabs.length===1)await chrome.tabs.update(tabs[0].id,{active:true});else await chrome.tabs.create({url:base+'/account/dashboard'});return {ok:true};}
  if(message.action==='collectStart'){
   if([...jobs.values()].some(j=>!j.result))throw Error('Uma leitura já está em andamento. Aguarde antes de tentar novamente.');
   const id=crypto.randomUUID(),job={tab:sender.tab.id,document:sender.documentId,started:Date.now(),result:null};jobs.set(id,job);
   collectSnapshot(message).then(result=>job.result=result&&typeof result.ok==='boolean'?result:{ok:false,error:'O canal de leitura não respondeu. Recarregue o Five Rings e tente novamente.'}).catch(error=>job.result={ok:false,error:error.message||'Leitura interrompida. Tente novamente.'});
   return {ok:true,jobId:id};
  }
  const job=jobs.get(message.jobId);
  if(!job||job.tab!==sender.tab.id||job.document!==sender.documentId)throw Error('A leitura foi interrompida pelo navegador. Recarregue a Affinity e tente novamente.');
  if(!job.result)return {ok:true,processing:true};
  jobs.delete(message.jobId);return job.result;
 })().then(reply).catch(error=>reply({ok:false,error:error.message||'Abra o Five Rings neste navegador e tente novamente.'}));return true;
});
