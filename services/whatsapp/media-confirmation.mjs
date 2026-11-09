// A media message must be accepted by WhatsApp, not merely have a local ID.
// Reading the acknowledgement never creates or repeats a message.
export async function confirmMedia(client,message,wait=ms=>new Promise(r=>setTimeout(r,ms)),attempts=40){
 if(!message?.id?._serialized)throw Error('WHATSAPP_NO_SEND_CONFIRMATION');
 let current=message;for(let i=0;i<=attempts;i++){
  if(Number(current?.ack)>=1)return current;
  if(Number(current?.ack)<0)throw Error('WHATSAPP_MEDIA_REJECTED');
  if(i===attempts||typeof client.getMessageById!=='function')break;
  await wait(500);current=await client.getMessageById(message.id._serialized)||current;
 }
 throw Error('WHATSAPP_NO_SEND_CONFIRMATION');
}
