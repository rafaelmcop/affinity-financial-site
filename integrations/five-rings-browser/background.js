const base='https://portal.fiveringsfinancial.com';
// Read the parameters used by the portal's own loaded DataTables. No credentials
// or arbitrary page code are exported or evaluated.
async function nativeTableQuery(type){
 const tab=await chrome.tabs.create({url:base+'/account/'+type,active:false});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(Error('A página de '+type+' demorou para abrir.'));},25000);function listener(id,info){if(id===tab.id&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve();}}chrome.tabs.onUpdated.addListener(listener);chrome.tabs.get(tab.id).then(t=>{if(t.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve();}}).catch(error=>{clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);reject(error);});});
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
 }finally{await chrome.tabs.remove(tab.id).catch(()=>{});}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(!sender.tab?.url?.startsWith('https://www.affinityfc.org/')||!['open','collect','ping'].includes(message.action))return; (async()=>{if(message.action==='ping')return {ok:true,version:chrome.runtime.getManifest().version};const tabs=await chrome.tabs.query({url:base+'/*'});if(message.action==='open'){if(tabs.length===1)await chrome.tabs.update(tabs[0].id,{active:true});else await chrome.tabs.create({url:base+'/account/dashboard'});return {ok:true};}if(tabs.length!==1)throw Error('Deixe apenas uma aba Five Rings aberta, na conta correta.');const queries={};for(const type of ['clients','policies'])queries[type]=await nativeTableQuery(type);return await chrome.tabs.sendMessage(tabs[0].id,{action:'collect',portalEmail:message.portalEmail,manualConfirmed:message.manualConfirmed===true,queries});})().then(reply).catch(error=>reply({ok:false,error:error.message||'Abra o Five Rings neste navegador e tente novamente.'}));return true;});
