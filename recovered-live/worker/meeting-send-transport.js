// A 429 from the bridge occurs before its send reservation. Only that explicit
// refusal can be retried automatically; network failures remain unconfirmed.
export async function meetingSendTransport(url,options,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 for(let attempt=0;;attempt++){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(response.status===429&&attempt<3){await wait(3100);continue;}
  if(!response.ok||result.state!=='sent')throw Object.assign(Error(result.error||'Não foi possível confirmar o envio do WhatsApp.'),{status:response.status===429?429:502,code:response.status===429?'send_busy':'send_unconfirmed',notSent:response.status===429});
  return result;
 }
}
