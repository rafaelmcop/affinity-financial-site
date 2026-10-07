export function mediaResponse(row, fileExists) {
  const {mediaKey,...message} = row;
  const available = Boolean(mediaKey && fileExists(mediaKey));
  const hasMedia = available || Boolean(message.mime || message.filename || message.mediaState);
  return {...message,
    mediaKind:hasMedia ? message.mediaKind : null,
    mediaState:available ? 'ready' : message.mediaState,
    mediaUrl:available ? '/api/agent/whatsapp/media?id=' + encodeURIComponent(message.id) : null};
}
