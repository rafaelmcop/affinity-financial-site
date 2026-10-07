import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappRoute} from '../recovered-live/worker/whatsapp.js';
test('read markers use the authenticated owner ticket and reject foreign origins and unauthenticated access',async()=>{
 const original=globalThis.fetch;let calls=0;
 const auth={email:async()=> 'agent@example.test',access:async()=>({account:{isActive:1,status:'approved',accountType:'agent'}})};
 const env={WHATSAPP_BRIDGE_URL:'https://bridge.test',WHATSAPP_BRIDGE_SECRET:'synthetic-test-only-read-marker-secret'};
 const request=origin=>new Request('https://portal.test/api/agent/whatsapp/read',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({ids:['synthetic-message']})});
 try{
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(url.pathname,'/read');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{ids:['synthetic-message']});assert.equal(JSON.parse(Buffer.from(options.headers.authorization.split(' ')[1].split('.')[0],'base64url')).owner,'agent@example.test');return Response.json({read:['synthetic-message']});};
  assert.equal((await whatsappRoute(request('https://portal.test'),env,auth)).status,200);
  assert.equal((await whatsappRoute(request('https://foreign.test'),env,auth)).status,403);
  assert.equal((await whatsappRoute(request('https://portal.test'),env,{...auth,email:async()=>null})).status,401);
  assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
