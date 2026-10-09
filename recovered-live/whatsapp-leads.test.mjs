import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {webcrypto} from 'node:crypto';import {whatsappLeadsRoute} from './worker/whatsapp-leads.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
test('group leads keep agent isolation, stages, origin and idempotent group memberships',async()=>{
 const db=new DatabaseSync(':memory:');const adapt=sql=>{let args=[];return {bind(...values){args=values;return this;},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async all(){return {results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args);}}};
 const env={DB:{prepare:adapt,batch:async xs=>Promise.all(xs.map(x=>x.run()))},WHATSAPP_BRIDGE_URL:'https://bridge.example.test',WHATSAPP_BRIDGE_SECRET:'a'.repeat(48)},auth={email:async r=>r.headers.get('x-test-owner'),access:async()=>({account:{isActive:1,status:'approved',accountType:'agent'}})};
 const original=globalThis.fetch;let pending=true,name='+12345678901';globalThis.fetch=async(_url,options)=>{assert.equal(options.redirect,'manual');if(pending){pending=false;return Response.json({pending:true},{status:202});}return Response.json({groupId:'123456789@g.us',groupName:'Grupo',contacts:[{name,phone:'+12345678901'}],unresolved:1,total:2});};
 const call=(action,input,owner='one@example.test')=>whatsappLeadsRoute(new Request('https://www.affinityfc.org/api/agent/whatsapp-leads/'+action,{headers:{'x-test-owner':owner,...(input?{origin:'https://www.affinityfc.org','content-type':'application/json'}:{})},...(input?{method:'POST',body:JSON.stringify(input)}:{})}),env,auth);
 try{
  assert.equal((await(await call('import',{group:'123456789@g.us'})).json()).pending,true);assert.equal((await(await call('list')).json()).leads.length,0);
  let r=await(await call('import',{group:'123456789@g.us'})).json();assert.equal(r.added,1);name='Pessoa';r=await(await call('import',{group:'123456789@g.us'})).json();assert.equal(r.added,0);assert.equal(r.existing,1);
  const list=await(await call('list')).json();assert.equal(list.leads.length,1);assert.equal(list.leads[0].name,'Pessoa');assert.equal(list.leads[0].groups.length,1);assert.equal(list.leads[0].stage,'Importados');assert.equal(list.leads[0].source,'whatsapp');assert.equal(list.stages.length,12);
  assert.equal((await(await call('list',null,'two@example.test')).json()).leads.length,0);
  assert.equal((await call('stage',{id:list.leads[0].id,stage:'Interesse'},'two@example.test')).status,404);
  assert.equal((await call('stage',{id:list.leads[0].id,stage:'Interesse'})).status,409);
  assert.equal((await call('stages',{stages:['Other']})).status,409);
  assert.equal((await call('import',{group:'bad'})).status,400);const exported=await(await call('export-group',{group:'123456789@g.us'})).json();assert.equal(exported.contacts[0].name,'Pessoa');assert.equal((await(await call('list')).json()).leads.length,1);
 }finally{globalThis.fetch=original;db.close();}
});
