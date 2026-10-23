// Use the existing channel endpoints so each keeps its ownership checks,
// dispatch receipt, history and retry protection. Copies belong to WhatsApp only.
export async function sendMeetingBoth(api,input){
 if(!String(input.template||'').trim()||input.confirmed!==true)throw Error('Confirme o envio da mensagem.');
 if(!input.emailRequestId||!input.whatsappRequestId)throw Error('Identificadores de envio ausentes.');
 const {emailRequestId,whatsappRequestId,...common}=input,results={};
 // Sequential calls also prevent two channels from concurrently creating a CRM
 // client for a meeting which has not yet been linked to a customer record.
 for(const channel of ['email','whatsapp']){
  try{
   const result=await api(channel==='email'?'agent.sendMeetingEmail':'agent.sendMeetingWhatsapp',{
    ...common,channel,requestId:channel==='email'?emailRequestId:whatsappRequestId,
    jointSend:channel==='whatsapp'?common.jointSend:[]
   },'POST');
   results[channel]={status:'sent',result};
  }catch(error){results[channel]={status:'unconfirmed',error:error.message||'Não foi possível confirmar o envio.'};}
 }
 return results;
}

export function combinedSendSummary(results){
 return ['email','whatsapp'].map(channel=>{
  const item=results[channel],label=channel==='email'?'E-mail':'WhatsApp do cliente';
  return label+': '+(item?.status==='sent'?(item.result?.alreadySent?'já enviado; não foi repetido':'enviado e registrado no histórico'):item?.error||'Não confirmado');
 }).join('\n');
}
