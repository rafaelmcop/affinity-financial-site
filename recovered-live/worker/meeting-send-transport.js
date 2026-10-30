// Media uploads can outlive a tunnel HTTP request. Submit once and poll the
// owner-scoped receipt; never repeat a POST after an ambiguous/network failure.
export async function meetingSendTransport(url,options,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 const headers=async()=>({...options.headers,...(options.authorization?{authorization:await options.authorization()}: {})});
 const request=async(target,init)=>{const response=await fetch(target,{...init,signal:AbortSignal.timeout(60000)});let result;try{result=await response.json();}catch{console.error('meeting_send_invalid_response',JSON.stringify({status:response.status,type:response.headers.get('content-type')||''}));throw Object.assign(Error('O serviço retornou uma resposta inválida. Confira o WhatsApp antes de tentar novamente.'),{code:'send_invalid_response',status:502});}return{response,result};};
 const validate=({response,result})=>{
  if(!response.ok||result.state!=='sent'){
   // A JSON preflight refusal happens before the bridge queues a message. A
   // previously pending/uncertain receipt is different: never retry that POST.
   const preflight=[400,403,409,413].includes(response.status)&&!result.state;
   const status=[400,403,409,413,429].includes(response.status)?response.status:502;
   throw Object.assign(Error(result.error||'Não foi possível confirmar o envio do WhatsApp.'),{status,code:preflight?'send_preflight_refused':response.status===429?'send_busy':response.status===401?'send_auth_rejected':'send_unconfirmed',notSent:preflight||response.status===429||response.status===401});
  }return result;
 };
 for(let attempt=0;;attempt++){
  const {authorization,...init}=options;const receipt=await request(url,{...init,headers:await headers()});
  if(receipt.response.status===429&&attempt<3){await wait(3100);continue;}
  if(receipt.response.status===202&&receipt.result.state==='pending'){
   const id=JSON.parse(options.body).requestId,target=new URL('/send-status',url);target.searchParams.set('requestId',id);
   for(let poll=0;poll<120;poll++){await wait(1000);const state=await request(target,{method:'GET',headers:await headers()});if(state.response.ok&&state.result.state==='pending')continue;return validate(state);}
   throw Object.assign(Error('O anexo continua sem confirmação. Confira o WhatsApp antes de tentar novamente.'),{status:504,code:'send_pending'});
  }
  return validate(receipt);
 }
}
