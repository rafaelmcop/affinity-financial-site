import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyTicket} from './auth.mjs';
import {sendText,sendErrorCode} from './send.mjs';
import {normalizeMessage} from './message.mjs';
import {phoneNumber,matchContact} from '../../recovered-live/public/whatsapp-phone.mjs';
test('Country prefix defaults to USA without doubling codes; ambiguous contacts stay unlinked',()=>{
 assert.equal(phoneNumber('(857) 555-0123'),'18575550123');
 assert.equal(phoneNumber('18575550123'),'18575550123');
 assert.equal(phoneNumber('+55 11 99999-8888'),'5511999998888');
 assert.equal(phoneNumber('11 99999-8888','BR'),'5511999998888');
 assert.equal(phoneNumber('123'),'');
 const rows=[{id:1,name:'Example',phone:'8575550123'}];
 assert.equal(matchContact(rows,'18575550123').id,1);
 assert.equal(matchContact([...rows,{id:2,phone:'+18575550123'}],'18575550123'),null);
});
import {installKeyCompatibility} from './compat.mjs';
test('Compatibility restores keys inside the send library, not just after sending',()=>{
 class Wid{constructor(){this.user='123456789';this.server='c.us';}}
 class Key{constructor(data){Object.assign(this,data);}}
 const previous=globalThis.window;
 globalThis.window={require:name=>name==='WAWebWidFactory'?{createWid:()=>new Wid()}:Key};
 try{assert.deepEqual(installKeyCompatibility(),{wid:true,message:true});assert.equal(new Key({fromMe:true,remote:new Wid(),id:'ABC'})._serialized,'true_123456789@c.us_ABC');}finally{globalThis.window=previous;}
});
import {DatabaseSync} from 'node:sqlite';
import {initializeContacts,rememberContact,contactIds,listContacts} from './contacts.mjs';
test('Phone and internal identity share history only within their owner',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  initializeContacts(db);
  db.exec('CREATE TABLE messages(owner TEXT,chat TEXT,stamp INTEGER);');
  db.prepare('INSERT INTO messages VALUES(?,?,?)').run('one','123456789@lid',1);
  db.prepare('INSERT INTO messages VALUES(?,?,?)').run('one','987654321@c.us',2);
  assert.equal(rememberContact(db,'one',{lid:'123456789@lid',pn:'987654321@c.us'}),true);
  assert.deepEqual(contactIds(db,'one','987654321@c.us'),['987654321@c.us','123456789@lid']);
  assert.deepEqual(contactIds(db,'two','987654321@c.us'),['987654321@c.us']);
  assert.equal(listContacts(db,'one').length,1);
  assert.equal(listContacts(db,'one')[0].label,'+987654321');
  assert.equal(listContacts(db,'one')[0].count,2);
  assert.equal(rememberContact(db,'one',{lid:'bad',pn:'987654321@c.us'}),false);
 }finally{db.close();}
});
test('Reconstruct message keys without losing received replies',()=>{
 const message=normalizeMessage({id:{fromMe:false,remote:{user:'123456789',server:'lid'},id:'ABC'},body:'reply'});
 assert.equal(message.id._serialized,'false_123456789@lid_ABC');
 assert.equal(message.from,'123456789@lid');
 assert.equal(message.fromMe,false);
 assert.equal(normalizeMessage(message).id._serialized,'false_123456789@lid_ABC');
});
test('New WhatsApp keys preserve incoming/outgoing messages and acknowledgments',async()=>{
 const incoming=normalizeMessage({id:{$1:'false_123456789@c.us_ABC',fromMe:false},_data:{from:{$1:'123456789@c.us'},to:{$1:'987654321@c.us'}},body:'reply'});
 assert.equal(incoming.id._serialized,'false_123456789@c.us_ABC');
 assert.equal(incoming.from,'123456789@c.us');assert.equal(incoming.fromMe,false);
 let calls=0;
 const outgoing=await sendText({getNumberId:async()=>({$1:'123456789@c.us'}),sendMessage:async()=>{calls++;return {id:{$1:'true_123456789@c.us_DEF',fromMe:true,remote:'123456789@c.us'},_data:{to:{$1:'123456789@c.us'}},body:'hello'};}},'123456789@c.us','hello');
 assert.equal(outgoing.id._serialized,'true_123456789@c.us_DEF');assert.equal(outgoing.to,'123456789@c.us');assert.equal(outgoing.fromMe,true);assert.equal(calls,1);
 assert.equal(normalizeMessage(outgoing).id._serialized,outgoing.id._serialized);
 assert.equal(normalizeMessage({id:{},_data:{}}).id._serialized,undefined);
});
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
