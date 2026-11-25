import test from 'node:test';import assert from 'node:assert/strict';
import {agentTestimonialSharing} from './worker/agent-testimonial-sharing.js';import {testimonialPageFixture} from './test-support/testimonial-page-fixture.mjs';
const origin='https://portal.affinityfc.org',id='11111111-1111-4111-8111-111111111111';
function fixture(){const f=testimonialPageFixture(),base=f.env.DB.prepare.bind(f.env.DB);f.env.DB.prepare=sql=>{const statement=base(sql);let args=[];return{bind(...values){args=values;statement.bind(...values);return this},first:()=>statement.first(),all:()=>statement.all(),async run(){return{meta:f.db.prepare(sql).run(...args)}}}};f.env.DB.batch=async statements=>Promise.all(statements.map(statement=>statement.run()));f.db.exec("CREATE TABLE crmClients(id INTEGER PRIMARY KEY,name TEXT,email TEXT,phone TEXT,whatsapp TEXT,assignedAdminEmail TEXT);CREATE TABLE crmActivities(clientId INTEGER,type TEXT CHECK(type IN ('note','call','email','sms','whatsapp','status')),content TEXT,createdBy TEXT);INSERT INTO crmClients VALUES(1,'Own Client','own@example.invalid','18570000001',NULL,'agent@example.invalid'),(2,'Foreign Client','foreign@example.invalid','18570000002',NULL,'other@example.invalid')");const calls=[];const auth={email:async()=> 'agent@example.invalid',access:async()=>({account:{accountType:'agent',isActive:1,status:'approved',name:'Agent Example'}}),feature:async()=>true,whatsappAllowed:async()=>true,audit:async()=>false,send:async(channel,data)=>calls.push({channel,clientId:data.client.id})};return{...f,auth,calls};}
const request=(path,body,headers={})=>new Request(origin+'/api/agent/testimonial-sharing'+path,{...(body!==undefined?{method:'POST',body:JSON.stringify(body),headers:{origin,'content-type':'application/json',...headers}}:{})});
const input=(extra={})=>({videoId:1,clientId:1,channel:'email',requestId:id,confirmed:true,message:'Veja esta história https://www.affinityfc.org/depoimentos/1',subject:'História',...extra});
test('agent sharing isolates customer data and blocks unauthorized, cross-origin, audit and unpublished sends',async()=>{const f=fixture();try{
 const list=await(await agentTestimonialSharing(request('/clients'),f.env,f.auth)).json();assert.deepEqual(list.clients.map(row=>row.id),[1]);
 const videos=await(await agentTestimonialSharing(request(''),f.env,f.auth)).json();assert(!JSON.stringify(videos).includes('private@example.invalid'));assert(!videos.videos.some(row=>row.id===4));
 for(const [body,auth,headers,status] of [[input({clientId:2}),f.auth,{},404],[input({videoId:4}),f.auth,{},404],[input(),{...f.auth,feature:async()=>false},{},403],[input(),{...f.auth,audit:async()=>true},{},403],[input(),f.auth,{origin:'https://evil.invalid'},403],[null,f.auth,{},400],[input({confirmed:false}),f.auth,{},400]])assert.equal((await agentTestimonialSharing(request('/send',body,headers),f.env,auth)).status,status);
 assert.equal((await agentTestimonialSharing(request(''),f.env,{...f.auth,email:async()=>null})).status,401);assert.equal(f.calls.length,0);
}finally{f.db.close()}});
test('confirmed sends are owner scoped, bind content to a request ID, record WhatsApp and never replay uncertain requests',async()=>{const f=fixture();try{
 assert.equal((await agentTestimonialSharing(request('/send',input()),f.env,f.auth)).status,200);
 assert.equal((await(await agentTestimonialSharing(request('/send',input()),f.env,f.auth)).json()).alreadySent,true);assert.equal(f.calls.length,1);
 assert.equal((await agentTestimonialSharing(request('/send',input({message:input().message+' changed'})),f.env,f.auth)).status,409);
 const whatsapp=input({channel:'whatsapp',requestId:'22222222-2222-4222-8222-222222222222'});
 const responses=await Promise.all([agentTestimonialSharing(request('/send',whatsapp),f.env,f.auth),agentTestimonialSharing(request('/send',whatsapp),f.env,f.auth)]);assert(responses.some(response=>response.status===200));assert.equal(f.calls.filter(call=>call.channel==='whatsapp').length,1);assert.equal(f.db.prepare("SELECT count(*) n FROM crmActivities WHERE clientId=1 AND type='whatsapp'").get().n,1);
 const pending=input({requestId:'33333333-3333-4333-8333-333333333333'}),failed={...f.auth,send:async()=>{throw Error('Confirmação indisponível')}};
 assert.equal((await agentTestimonialSharing(request('/send',pending),f.env,failed)).status,400);assert.equal((await agentTestimonialSharing(request('/send',pending),f.env,f.auth)).status,409);assert.equal(f.calls.length,2);
}finally{f.db.close()}});

test('manual email and WhatsApp recipients do not require or create a CRM client and remain request-bound',async()=>{
 const f=fixture();try{
  const sent=[],auth={...f.auth,send:async(channel,data)=>sent.push({channel,client:data.client})};
  const email=input({clientId:0,toEmail:'new@example.invalid',requestId:'44444444-4444-4444-8444-444444444444'});
  assert.equal((await agentTestimonialSharing(request('/send',email),f.env,auth)).status,200);assert.equal(sent[0].client.id,null);assert.equal(sent[0].client.email,'new@example.invalid');
  assert.equal((await agentTestimonialSharing(request('/send',{...email,toEmail:'different@example.invalid'}),f.env,auth)).status,409);
  const whatsapp=input({clientId:0,channel:'whatsapp',toPhone:'+1 (857) 000-0003',requestId:'55555555-5555-4555-8555-555555555555'});
  assert.equal((await agentTestimonialSharing(request('/send',whatsapp),f.env,auth)).status,200);assert.equal(sent[1].client.whatsapp,'+1 (857) 000-0003');
  assert.equal((await agentTestimonialSharing(request('/send',input({clientId:0,toEmail:'invalid'})),f.env,auth)).status,400);
  assert.equal((await agentTestimonialSharing(request('/send',input({clientId:0,channel:'whatsapp',toPhone:'invalid'})),f.env,auth)).status,400);
  assert.equal(f.db.prepare('SELECT count(*) n FROM crmClients').get().n,2);assert.equal(f.db.prepare('SELECT count(*) n FROM crmActivities').get().n,0);
 }finally{f.db.close()}
});
