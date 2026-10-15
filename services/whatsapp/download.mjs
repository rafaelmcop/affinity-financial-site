// Run only in the bridge-owned WhatsApp Web page. New Web builds can throw
// during the legacy mediaStage preparation even when decryption is available.
export async function downloadFromWeb(msgId){
  const collections=window.require('WAWebCollections');
  const msg=collections.Msg.get(msgId)||(await collections.Msg.getMessagesById([msgId]))?.messages?.[0];
  if(!msg)return {unavailable:true};
  const stage=String(msg.mediaData?.mediaStage||'unknown');
  try{
    const media=msg.mediaData?.mediaBlob;
    const url=typeof media?.url==='function'?media.url():null;
    if(typeof url==='string'&&url.startsWith('blob:')){
      const response=await fetch(url);if(response.ok){const bytes=await response.arrayBuffer();return {data:await window.WWebJS.arrayBufferToBase64Async(bytes),mimetype:msg.mimetype,filename:msg.filename,filesize:bytes.byteLength};}
    }
    let qpl;const noop=()=>qpl;
    qpl=new Proxy({addAnnotations:noop,addPoint:noop},{get:(target,name)=>name in target?target[name]:noop});
    const bytes=await window.require('WAWebDownloadManager').downloadManager.downloadAndMaybeDecrypt({directPath:msg.directPath,encFilehash:msg.encFilehash,filehash:msg.filehash,mediaKey:msg.mediaKey,mediaKeyTimestamp:msg.mediaKeyTimestamp,type:msg.type,mimetype:msg.mimetype,mimeType:msg.mimetype,signal:new AbortController().signal,downloadQpl:qpl});
    return {data:await window.WWebJS.arrayBufferToBase64Async(bytes),mimetype:msg.mimetype,filename:msg.filename,filesize:bytes.byteLength};
  }catch(error){return {failed:true,stage,name:error?.name,reason:String(error?.message||'')};}
}

export async function downloadMedia(message){
  let original;
  try{const media=await message.downloadMedia();if(media?.data)return media;}catch(error){original=error;}
  const result=await message.client.pupPage.evaluate(downloadFromWeb,message.id._serialized);
  if(result?.data)return result;
  if(result?.failed){const error=Error('Media fallback: '+JSON.stringify(result));error.name='MediaDownloadError';throw error;}
  if(original)throw original;
  return undefined;
}
