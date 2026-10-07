import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,createHash,createHmac,hkdfSync,randomBytes} from 'node:crypto';
import {recoverMedia,decryptMedia} from './media-recovery.mjs';
test('recovers authenticated media after browser downloader fails and rejects corruption',async()=>{
 const key=randomBytes(32),bytes=Buffer.from('synthetic attachment');
 const expanded=Buffer.from(hkdfSync('sha256',key,Buffer.alloc(32),Buffer.from('WhatsApp Image Keys'),112));
 const cipher=createCipheriv('aes-256-cbc',expanded.subarray(16,48),expanded.subarray(0,16));
 const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
 const mac=createHmac('sha256',expanded.subarray(48,80)).update(expanded.subarray(0,16)).update(ciphertext).digest().subarray(0,10);
 const encrypted=Buffer.concat([ciphertext,mac]),hash=createHash('sha256').update(bytes).digest('base64');
 const message={downloadMedia:async()=>{throw Error('browser incompatibility');},rawData:{directPath:'/v/test',mediaKey:key.toString('base64'),type:'image',mimetype:'image/png',filehash:hash,encFilehash:createHash('sha256').update(encrypted).digest('base64')}};
 const result=await recoverMedia(message,async url=>{assert.equal(url.origin,'https://mmg.whatsapp.net');return new Response(encrypted);});
 assert.deepEqual(Buffer.from(result.data,'base64'),bytes);
 const corrupted=Buffer.from(encrypted);corrupted[0]^=1;
 assert.throws(()=>decryptMedia(corrupted,key,'image',hash),/authentication/);
 await assert.rejects(recoverMedia({...message,rawData:{...message.rawData,directPath:'//untrusted.example/file'}},()=>{throw Error('must not fetch');}),/Missing media path/);
});
