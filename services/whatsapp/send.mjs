export async function sendText(client, chat, text) {
  let destination = chat;
  if (chat.endsWith('@c.us')) {
    const registered = await client.getNumberId(chat.split('@')[0]);
    if (!registered?._serialized) throw Error('WHATSAPP_NUMBER_NOT_REGISTERED');
    destination = registered._serialized;
  }
  // Sending a message must not depend on marking earlier messages as read.
  const message = await client.sendMessage(destination, text, {sendSeen:false});
  if (!message?.id?._serialized) throw Error('WHATSAPP_NO_SEND_CONFIRMATION');
  return message;
}

export function sendErrorCode(error) {
  const message = String(error?.message || '');
  if (message.includes('WHATSAPP_NUMBER_NOT_REGISTERED')) return 'number_not_registered';
  if (message.includes('WHATSAPP_NO_SEND_CONFIRMATION')) return 'no_confirmation';
  if (/getChat|sendSeen|WWebJS|Store|markedUnread/.test(message)) return 'web_client_incompatible';
  if (/timeout/i.test(message)) return 'timeout';
  if (/Target closed|Session closed|Execution context was destroyed/.test(message)) return 'session_interrupted';
  return 'send_failed';
}
