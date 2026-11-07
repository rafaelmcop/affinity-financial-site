import test from 'node:test';import assert from 'node:assert/strict';
import {downloadMedia,downloadFromWeb} from './download.mjs';
test('legacy successful downloads do not redownload media',async()=>{const media={data:'AQI=',mimetype:'image/png'};assert.equal(await downloadMedia({downloadMedia:async()=>media}),media);});
test('fallback supplies the MIME required by current WhatsApp for audio, video, image, sticker and PDF',async()=>{
const previous=globalThis.window;
try{for(const [type,mimetype] of [['ptt','audio/ogg'],['video','video/mp4'],['image','image/png'],['sticker','image/webp'],['document','application/pdf']]){
const msg={type,mimetype,filename:'test',mediaData:{mediaStage:'RESOLVED'},directPath:'synthetic',mediaKey:'synthetic'};
globalThis.window={require:name=>name==='WAWebCollections'?{Msg:{get:()=>msg}}:{downloadManager:{downloadAndMaybeDecrypt:async input=>{assert.equal(input.mimetype,mimetype);assert.equal(input.mimeType,mimetype);assert.equal(input.type,type);input.downloadQpl.addPoint('test').addAnnotations({});return new Uint8Array([1,2]).buffer;}}},WWebJS:{arrayBufferToBase64Async:async b=>Buffer.from(b).toString('base64')}};
const result=await downloadFromWeb('synthetic-id');assert.equal(result.data,'AQI=');assert.equal(result.mimetype,mimetype);
}}finally{globalThis.window=previous;}
});
test('opaque legacy exceptions use the fallback and retain typed failures',async()=>{
const message={id:{_serialized:'synthetic'},downloadMedia:async()=>{throw Error('t');},client:{pupPage:{evaluate:async(fn,id)=>{assert.equal(fn,downloadFromWeb);assert.equal(id,'synthetic');return {data:'AQI=',mimetype:'audio/ogg'};}}}};
assert.equal((await downloadMedia(message)).mimetype,'audio/ogg');message.client.pupPage.evaluate=async()=>({failed:true,stage:'ERROR',name:'Unavailable',reason:'Expired'});await assert.rejects(downloadMedia(message),/Expired/);
});
