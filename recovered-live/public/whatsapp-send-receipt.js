const uncertain=()=>Object.assign(Error('O envio continua sem confirmação. Use “Verificar confirmação” para consultar o recibo sem reenviar a mensagem.'),{uncertain:true});
async function deadline(task,ms){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(uncertain()),ms);})]);}finally{clearTimeout(timer);}}
export async function sendPortalWhatsApp(input,{base='/api/agent/whatsapp/',fetcher=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now,timeoutMs=45000,requestMs=10000,resumeOnly=false,submit,onProgress=()=>{}}={}){
 const id=String(input.requestId||'');if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Identificador de envio inválido.');
 const expires=now()+timeoutMs;
 const read=async(route,options={})=>{const controller=new AbortController();try{return await deadline((async()=>{const response=await fetcher(base+route,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal});return {response,result:await response.json()};})(),Math.max(1,Math.min(requestMs,expires-now())));}finally{controller.abort();}};
 if(!resumeOnly){
  let posted;
  try{posted=submit?{response:{ok:true,status:200},result:await deadline(Promise.resolve().then(submit),requestMs)}:await read('send',{method:'POST',headers:{'content-type':'application/json',prefer:'respond-async'},body:JSON.stringify(input)});}catch{/* A lost response is not permission to repeat a POST. */}
  if(posted){const {response,result}=posted;if(response.ok&&result.state==='sent')return result;
   if(!response.ok&&[400,401,403,409,413,429].includes(response.status)&&!result.state)throw Object.assign(Error(result.error||'O envio não foi iniciado.'),{notSent:true});
   if(result.state==='uncertain')throw Object.assign(Error(result.error||uncertain().message),{uncertain:true});
  }
 }
 onProgress('Confirmando envio no WhatsApp…');
 while(now()<expires){
  try{const {response,result}=await read('send-status?requestId='+encodeURIComponent(id));if(response.ok&&result.state==='sent')return result;if(result.state==='uncertain')throw Object.assign(Error(result.error||uncertain().message),{uncertain:true,finalReceipt:true});}catch(error){if(error.finalReceipt)throw error;}
  if(now()<expires)await wait(Math.min(1000,Math.max(1,expires-now())));
 }
 throw uncertain();
}
