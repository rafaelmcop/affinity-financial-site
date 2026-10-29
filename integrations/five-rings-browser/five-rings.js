(()=>{function remember(){for(const input of document.querySelectorAll('input[type=checkbox]'))if(/remember|trust.?device/i.test(input.name)&&!input.checked){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}}remember();new MutationObserver(remember).observe(document.body,{childList:true,subtree:true});let running=false,deadline=0;const base='https://portal.fiveringsfinancial.com';function cleaned(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,form,input,textarea,iframe,meta,link').forEach(x=>x.remove());doc.querySelectorAll('*').forEach(x=>{for(const a of [...x.attributes])if(a.name!=='class'&&a.name!=='href')x.removeAttribute(a.name);if(x.hasAttribute('href')){try{const u=new URL(x.getAttribute('href'),base);if(u.origin!==base||u.search||!/^\/account\/(clients|policies)(?:\/[0-9a-f-]+)?$/.test(u.pathname))x.removeAttribute('href');else x.setAttribute('href',u.href);}catch{x.removeAttribute('href');}}});return doc.body.innerHTML;}
async function read(path){
 let r,html;
 for(let attempt=0;attempt<2;attempt++){
  const remaining=deadline-Date.now();
  if(remaining<=0)throw Error('O tempo total de leitura do Five Rings terminou. Os dados já salvos foram preservados.');
  try{
   r=await fetch(base+path,{credentials:'include',signal:AbortSignal.timeout(Math.max(1,Math.min(45000,remaining))),redirect:'follow',cache:'no-store',headers:path.includes('/data?')?{'x-requested-with':'XMLHttpRequest','accept':'application/json'}:{}});
   html=await r.text();break;
  }catch(error){
   if(!/TimeoutError|AbortError/.test(String(error?.name))&&!/signal timed out|operation.*timed out/i.test(String(error?.message)))throw error;
   if(attempt===0&&deadline-Date.now()>1000)continue;
   const endpoint=new URL(base+path).pathname;
   throw Error('O Five Rings demorou para responder ao ler '+endpoint+'. A leitura não foi concluída; os dados já salvos foram preservados. Tente sincronizar novamente.');
  }
 }
 const destination=new URL(r.url),json=r.headers.get('content-type')?.includes('application/json');const doc=json?null:new DOMParser().parseFromString(html,'text/html');const loginForm=doc&&[...doc.querySelectorAll('form')].some(form=>/\/account\/login(?:$|[?#])/i.test(new URL(form.getAttribute('action')||destination.href,base).href)&&form.querySelector('input[type=password]'));const loginPage=/\/(?:login|verify|verification|challenge|captcha)(?:\/|$)/i.test(destination.pathname);if(!r.ok)throw Error('Não foi possível ler '+new URL(base+path).pathname+' no Five Rings (HTTP '+r.status+', destino '+destination.pathname+').');if(destination.origin!==base||!/^\/account(?:\/|$)/.test(destination.pathname)||loginForm||loginPage)throw Error('O Five Rings pediu autenticação na leitura de '+new URL(base+path).pathname+' (HTTP '+r.status+', destino '+destination.pathname+'). Entre no Five Rings e tente novamente.');return {body:html,contentType:json?'application/json':'text/html'};}

async function collectTable(type,nativeQuery,cached=null){
 const label=type==='clients'?'clientes':'apólices',data=[],seen=new Set();let expected=null,sourceTotal=null,start=0;
 const count=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):null;
 while(start<20000){
  const params=new URLSearchParams(nativeQuery);params.set('draw',String(seen.size+1));params.set('start',String(start));params.set('length','100');params.set('search[value]','');params.set('search[regex]','false');
  const result=await read('/account/'+type+'/data?'+params);if(result.contentType!=='application/json')throw Error('Lista de '+label+' indisponível.');
  let payload;try{payload=JSON.parse(result.body);}catch{throw Error('O Five Rings retornou uma lista de '+label+' inválida.');}
  const total=count(payload.recordsTotal),filtered=payload.recordsFiltered===undefined?total:count(payload.recordsFiltered);
  if(!Array.isArray(payload.data)||total===null||filtered===null||filtered>total)throw Error('Lista de '+label+' sem contagem válida. A leitura não foi salva.');
  if(start===0&&cached&&cached.recordsTotal===total&&cached.recordsFiltered===filtered&&cached.data?.length===filtered){
   const prefix=payload.data.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>!/password|cookie|token|secret|csrf/i.test(key)).map(([key,value])=>[key,typeof value==='string'&&value.includes('<')?cleaned(value):value])));
   if(JSON.stringify(prefix)===JSON.stringify(cached.data.slice(0,prefix.length))){progress(type,filtered,filtered);return cached;}
  }

  if(expected!==null&&(expected!==filtered||sourceTotal!==total))throw Error('A lista de '+label+' mudou durante a leitura. Sincronize novamente.');
  expected=filtered;sourceTotal=total;
  if(expected>20000)throw Error('A lista de '+label+' excede o limite seguro de 20000 registros.');
  const fingerprint=JSON.stringify(payload.data);
  if(payload.data.length&&seen.has(fingerprint))throw Error('O Five Rings repetiu uma página de '+label+'. Leitura interrompida sem salvar uma lista parcial.');
  seen.add(fingerprint);
  if(data.length+payload.data.length>expected)throw Error('A contagem de '+label+' não corresponde à lista recebida.');
  if(!payload.data.length&&data.length<expected)throw Error('Lista de '+label+' incompleta: recebidos '+data.length+' de '+expected+'. Nenhum registro desta leitura foi importado.');
  for(const row of payload.data){if(!row||typeof row!=='object')throw Error('Registro de '+label+' inválido.');data.push(Object.fromEntries(Object.entries(row).filter(([key])=>!/password|cookie|token|secret|csrf/i.test(key)).map(([key,value])=>[key,typeof value==='string'&&value.includes('<')?cleaned(value):value])));}
  progress(type,data.length,expected);
  if(data.length===expected)return {data,recordsTotal:sourceTotal,recordsFiltered:expected};
  // Servers may cap a page below the requested length. Advance only past rows read.
  start+=payload.data.length;
 }
 throw Error('Lista de '+label+' maior que o limite seguro do conector.');
}
function progress(stage,processed=0,total=0){try{chrome.runtime.sendMessage?.({action:'readProgress',progress:{stage,processed,total}})?.catch(()=>{});}catch{}}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message.action!=='collect'||running)return;running=true;deadline=Date.now()+180000;
 const pages=[];let email='',capturedAt=Date.now();
 (async()=>{
  progress('dashboard');const dashboard=await read('/account/dashboard');if(dashboard.contentType!=='text/html')throw Error('Painel indisponível.');
  if(location.origin===base&&location.pathname==='/account/dashboard'&&document.body?.innerHTML){const waitUntil=Date.now()+8000;while(!/total\s+credits/i.test(document.body.innerText||'')&&Date.now()<waitUntil)await new Promise(resolve=>setTimeout(resolve,250));dashboard.body=document.body.innerHTML;}
  const cleanedDashboard=cleaned(dashboard.body);email=String(message.portalEmail||'').trim().toLowerCase();
  const matchedAccount=email&&cleanedDashboard.toLowerCase().includes(email);
  if(!email||(!matchedAccount&&message.manualConfirmed!==true))throw Error('Confirme que esta conta Five Rings pertence ao agente selecionado.');
  const resume=message.resume,canResume=matchedAccount&&resume?.owner===email&&Date.now()-resume.capturedAt>=0&&Date.now()-resume.capturedAt<600000&&Array.isArray(resume.pages)&&resume.pages.length<=63;
  const saved=new Map();if(canResume){capturedAt=resume.capturedAt;for(const page of resume.pages){try{const url=new URL(page.url);if(url.origin===base&&!url.search&&/^\/account\/(clients|policies)(?:\/data|\/[0-9a-f-]+)$/.test(url.pathname)&&typeof page.body==='string'&&page.body.length<=2000000)saved.set(url.pathname,page);}catch{}}}
  pages.push({url:base+'/account/dashboard',body:cleanedDashboard,contentType:'text/html'});
  for(const type of ['clients','policies']){
   const nativeQuery=message.queries?.[type];if(!nativeQuery)throw Error('Consulta nativa de '+type+' indisponível.');
   let cached=null;try{cached=JSON.parse(saved.get('/account/'+type+'/data')?.body||'null');}catch{}
   const table=await collectTable(type,nativeQuery,cached);pages.push({url:base+'/account/'+type+'/data',body:JSON.stringify(table),contentType:'application/json'});
  }
  const links=[...new Set([...pages.map(p=>p.body).join(' ').matchAll(/https:\/\/portal\.fiveringsfinancial\.com\/account\/(?:clients|policies)\/[0-9a-f-]+/gi)].map(x=>x[0]))].slice(0,60);
  let cursor=0,finished=0,failure=null;progress('details',finished,links.length);
  async function worker(){while(!failure&&cursor<links.length){const link=links[cursor++],path=new URL(link).pathname;try{let page=saved.get(path);if(!page){const detail=await read(path);if(detail.contentType!=='text/html')throw Error('Detalhe de cliente indisponível.');page={url:link,body:cleaned(detail.body),contentType:'text/html'};}pages.push(page);progress('details',++finished,links.length);}catch(error){failure ||= error;}}}
  await Promise.all(Array.from({length:Math.min(3,links.length)},()=>worker()));if(failure)throw failure;
  return {ok:true,snapshot:{version:1,capturedAt,portalEmail:email,manualConfirmed:message.manualConfirmed===true,pages}};
 })().then(reply).catch(error=>{
  const interrupted=/tempo total|demorou|timeout|timed out|Failed to fetch|NetworkError/i.test(error.message||'');
  const checkpoint=interrupted&&email&&pages.length?{owner:email,capturedAt,pages:pages.filter(p=>!p.url.endsWith('/dashboard'))}:undefined;
  reply({ok:false,error:interrupted?'O Five Rings demorou para responder'+(String(error.message).match(/\/account\/[a-z0-9/-]+/i)?.[0]?' ao ler '+String(error.message).match(/\/account\/[a-z0-9/-]+/i)[0]:'')+'. As etapas concluídas podem ser retomadas por até 10 minutos neste navegador. Tente novamente para retomar; os dados do portal foram preservados.':error.message,...(checkpoint?{checkpoint}:{})});
 }).finally(()=>running=false);return true;
});})();
