export function mediaFilename(filename,mime){
 const type=String(mime||'').split(';')[0].trim().toLowerCase();
 const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','audio/webm':'webm','video/mp4':'mp4','application/pdf':'pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-excel':'xls'}[type];
 const name=String(filename||'arquivo');
 if(!extension)return name;
 if(new RegExp('\\.'+(extension==='jpg'?'jpe?g':extension)+'$','i').test(name))return name;
 return name.replace(/\.(png|jpe?g|webp|gif|ogg|opus|mp3|m4a|wav|webm|mp4|pdf|xlsx?|json)$/i,'')+'.'+extension;
}

export function mediaResponse(row, fileExists) {
  const {mediaKey,...message} = row;
  const available = Boolean(mediaKey && fileExists(mediaKey));
  const hasMedia = available || Boolean(message.mime || message.filename || message.mediaState);
  return {...message,
    mediaKind:hasMedia ? message.mediaKind : null,
    mediaState:available ? 'ready' : message.mediaState,
    mediaUrl:available ? '/api/agent/whatsapp/media?id=' + encodeURIComponent(message.id) : null};
}
