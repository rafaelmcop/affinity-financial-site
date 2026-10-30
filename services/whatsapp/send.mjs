import {confirmMedia} from './media-confirmation.mjs';
import {normalizeMessage,serializedKey} from './message.mjs';

export async function sendText(client, chat, text) {
  let destination = chat;
  if (chat.endsWith('@c.us')) {
    const registered = await client.getNumberId(chat.split('@')[0]);
    if (!serializedKey(registered)) throw Error('WHATSAPP_NUMBER_NOT_REGISTERED');
    destination = serializedKey(registered);
  }
  // Sending a message must not depend on marking earlier messages as read.
  const message = normalizeMessage(await client.sendMessage(destination, text, {sendSeen:false,waitUntilMsgSent:true}));
  if (!message?.id?._serialized) throw Error('WHATSAPP_NO_SEND_CONFIRMATION');
  return message;
}

export async function sendMedia(client,chat,{data,mime,filename='',caption='',voice=false},MediaClass=null) {
  let stage='number_lookup',message=null;
  try{
  let destination=chat;
  if(chat.endsWith('@c.us')){
    const registered=await client.getNumberId(chat.split('@')[0]);
    if(!serializedKey(registered))throw Error('WHATSAPP_NUMBER_NOT_REGISTERED');
    destination=serializedKey(registered);
  }
  const MessageMedia=MediaClass||(await import('whatsapp-web.js')).default.MessageMedia;
  const media=new MessageMedia(mime,data,filename||undefined);
  // Chromium records voice notes as WebM. WhatsApp Web's voice-note path only
  // accepts Ogg/Opus reliably; passing WebM with sendAudioAsVoice can terminate
  // the browser target before the bridge can return a JSON error. Keep WebM as
  // a normal playable audio attachment instead of using the PTT conversion.
  const sendAudioAsVoice=voice&&/^audio\/ogg(?:;|$)/i.test(mime);
  stage='dispatch';
  message=normalizeMessage(await client.sendMessage(destination,media,{caption,sendAudioAsVoice,sendMediaAsDocument:!/^image\/|^audio\/|^video\//i.test(mime),sendSeen:false,waitUntilMsgSent:false}));
  if(!message?.id?._serialized)throw Error('WHATSAPP_NO_SEND_CONFIRMATION');
  stage='confirmation';
  return normalizeMessage(await confirmMedia(client,message));
  }catch(cause){const error=cause instanceof Error?cause:Error(String(cause));error.whatsappStage=stage;if(message?.id?._serialized)error.whatsappMessage=message;throw error;}
}

export function sendErrorCode(error) {
  const message = String(error?.message || '');
  if (message.includes('WHATSAPP_NUMBER_NOT_REGISTERED')) return 'number_not_registered';
  if (message.includes('WHATSAPP_MEDIA_REJECTED')) return 'media_rejected';
  if (/media-fault|upload failed|prepRawMedia|waitForPrep/.test(message)) return 'media_preparation_failed';
  if (message.includes('WHATSAPP_NO_SEND_CONFIRMATION')) return 'no_confirmation';
  if (/getChat|sendSeen|WWebJS|Store|markedUnread/.test(message)) return 'web_client_incompatible';
  if (/timeout/i.test(message)) return 'timeout';
  if (/Target closed|Session closed|Execution context was destroyed/.test(message)) return 'session_interrupted';
  return 'send_failed';
}
