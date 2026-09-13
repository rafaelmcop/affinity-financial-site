import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyTicket} from './auth.mjs';
import {sendText,sendErrorCode} from './send.mjs';
test('Sending resolves recipient and does not depend on read receipts',async()=>{
 let sent=0;
 const client={getNumberId:async()=>({_serialized:'123456789@lid'}),sendMessage:async(chat,text,options)=>{sent++;assert.equal(chat,'123456789@lid');assert.equal(options.sendSeen,false);return {id:{_serialized:'test'}};}};
 assert.equal((await sendText(client,'123456789@c.us','test')).id._serialized,'test');
 client.getNumberId=async()=>null;
 await assert.rejects(sendText(client,'123456789@c.us','test'),/NOT_REGISTERED/);
 assert.equal(sent,1);
 client.getNumberId=async()=>({_serialized:'123456789@lid'});client.sendMessage=async()=>undefined;
 await assert.rejects(sendText(client,'123456789@c.us','test'),/NO_SEND_CONFIRMATION/);
 assert.equal(sendErrorCode(Error('private phone body getChat')),'web_client_incompatible');
});
import {whatsappRoute} from '../../recovered-live/worker/whatsapp.js';
const secret='test-only-secret-not-used-in-production';
function ticket(owner,exp=1060){const payload=Buffer.from(JSON.stringify({owner,exp,aud:'affinity-whatsapp'})).toString('base64url');return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');}
test('Signed sessions preserve owner and reject tampering and expiration',()=>{
  assert.equal(verifyTicket(ticket('one@example.test'),secret,1000),'one@example.test');
  assert.equal(verifyTicket(ticket('two@example.test'),secret,1000),'two@example.test');
  assert.throws(()=>verifyTicket(ticket('one@example.test'),secret,2000));
  assert.throws(()=>verifyTicket(ticket('one@example.test'),secret+'wrong',1000));
  assert.throws(()=>verifyTicket(ticket('one@example.test').replace(/^./,'x'),secret,1000));
  assert.throws(()=>verifyTicket(ticket('one@example.test',5000),secret,1000));
});
const active={isActive:1,status:'approved',accountType:'agent'};
test('Portal rejects missing sessions, blocked accounts and cross-origin writes',async()=>{
  const url='https://portal.test/api/agent/whatsapp/connect';
  assert.equal((await whatsappRoute(new Request(url),{}, {email:async()=>null})).status,401);
  assert.equal((await whatsappRoute(new Request(url),{}, {email:async()=> 'one@example.test',access:async()=>({account:{...active,status:'blocked'}})})).status,403);
  const auth={email:async()=> 'one@example.test',access:async()=>({account:active})};
  assert.equal((await whatsappRoute(new Request(url,{method:'POST',headers:{origin:'https://attacker.test','content-type':'application/json'},body:'{}'}),{},auth)).status,403);
  assert.equal((await whatsappRoute(new Request('https://portal.test/api/agent/whatsapp/status'),{},auth)).status,503);
});
test('Portal derives the agent from the session, not a caller supplied identity',async()=>{
  const original=globalThis.fetch;let verified;
  globalThis.fetch=async(url,options)=>{verified=verifyTicket(options.headers.authorization.slice(7),secret);return Response.json({state:'ready'});};
  try{
    const auth={email:async()=> 'one@example.test',access:async()=>({account:active})};
    const r=await whatsappRoute(new Request('https://portal.test/api/agent/whatsapp/status?owner=other@example.test'),{WHATSAPP_BRIDGE_URL:'https://bridge.test',WHATSAPP_BRIDGE_SECRET:secret},auth);
    assert.equal(r.status,200);assert.equal(verified,'one@example.test');
  }finally{globalThis.fetch=original;}
});
