import {test} from 'node:test';import assert from 'node:assert/strict';import {prepareWhatsApp} from './public/portal-interactions.js';
test('WhatsApp preparation records intent and returns an app URL without opening or sending; failures stop preparation',async()=>{
 const prior=globalThis.fetch;let posted;
 try{globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/trpc/agent.logPortalInteraction');posted=JSON.parse(options.body).json;return{ok:true,json:async()=>({result:{data:{json:{ok:true}}}})}};
 const url=await prepareWhatsApp({applicationId:1,phone:'(202) 555-0100',text:'Teste sem envio'});assert.equal(posted.phone,'12025550100');assert.equal(posted.channel,'whatsapp');assert.match(url,/^whatsapp:\/\/send\?phone=12025550100&text=/);
 globalThis.fetch=async()=>({ok:false,json:async()=>({error:{json:{message:'Falha simulada no histórico'}}})});await assert.rejects(()=>prepareWhatsApp({phone:'2025550100'}),/Falha simulada/);
 }finally{globalThis.fetch=prior;}
});
