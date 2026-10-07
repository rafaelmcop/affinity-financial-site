import {createDecipheriv,createHash,createHmac,hkdfSync,timingSafeEqual} from 'node:crypto';

export function decryptMedia(encrypted,key,type,expectedHash){
 const names={image:'Image',sticker:'Image',audio:'Audio',ptt:'Audio',video:'Video',document:'Document'};
 if(!names[type]||key.length!==32||encrypted.length<26)throw Error('Invalid media metadata');
 const expanded=Buffer.from(hkdfSync('sha256',key,Buffer.alloc(32),Buffer.from('WhatsApp '+names[type]+' Keys'),112));
 const iv=expanded.subarray(0,16),cipherKey=expanded.subarray(16,48),macKey=expanded.subarray(48,80);
 const ciphertext=encrypted.subarray(0,-10),mac=encrypted.subarray(-10);
 const calculated=createHmac('sha256',macKey).update(iv).update(ciphertext).digest().subarray(0,10);
 if(!timingSafeEqual(mac,calculated))throw Error('Media authentication failed');
 const decipher=createDecipheriv('aes-256-cbc',cipherKey,iv);
 const bytes=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
 if(expectedHash&&!timingSafeEqual(createHash('sha256').update(bytes).digest(),Buffer.from(expectedHash,'base64')))throw Error('Media hash mismatch');
 return bytes;
}

export async function recoverMedia(message,fetcher=fetch){
 try{const media=await message.downloadMedia();if(media?.data)return media;}catch{/* Retry the authenticated encrypted attachment using its original metadata. */}
 const raw=message.rawData||message._data||{};
 if(typeof raw.directPath!=='string'||!raw.directPath.startsWith('/')||raw.directPath.startsWith('//'))throw Error('Missing media path');
 const key=Buffer.from(raw.mediaKey||message.mediaKey||'','base64');
 if(key.length!==32)throw Error('Missing media key');
 const url=new URL(raw.directPath,'https://mmg.whatsapp.net');
 if(url.origin!=='https://mmg.whatsapp.net')throw Error('Invalid media host');
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Origin:'https://web.whatsapp.com'}});
 if(!response.ok)throw Error('Media server HTTP '+response.status);
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>8000032)throw Error('Media exceeds 8 MB');chunks.push(chunk);}
 const encrypted=Buffer.concat(chunks);
 if(raw.encFilehash&&!timingSafeEqual(createHash('sha256').update(encrypted).digest(),Buffer.from(raw.encFilehash,'base64')))throw Error('Encrypted media hash mismatch');
 const bytes=decryptMedia(encrypted,key,raw.type||message.type,raw.filehash);
 if(bytes.length>8000000)throw Error('Media exceeds 8 MB');
 return {data:bytes.toString('base64'),mimetype:raw.mimetype||message.mimetype||'application/octet-stream',filename:raw.filename||message.filename};
}
