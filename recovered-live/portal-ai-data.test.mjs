import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {aiPortalRecords} from './worker/portal-ai-data.js';
const identity={owner:'owner@example.invalid',actor:'owner@example.invalid'},now=new Date('2026-11-06T16:00:00Z');
test('message adapter allows fixed history, strips private fields and preserves uncertain group states',async()=>{
 const invoked=[];const data=await aiPortalRecords({},identity,{intent:'messages',state:'sent',days:7},{now,allowed:async k=>k==='messages',read:async(name)=>{invoked.push(name);return{result:{data:{json:[{subject:'Proposta',clientName:'Cliente',status:'sent',date:'2026-11-05 10:00:00',body:'PRIVATE BODY',birthDate:'SECRET',recipients:[{name:'Cliente',email:'PRIVATE EMAIL',birthDate:'SECRET',sentAt:'2026-11-05',status:'sent'}]},{subject:'Antiga',status:'sent',date:'2025-01-01'}]}}};}});
 assert.deepEqual(invoked,['agent.deliveryLog']);assert.equal(data.records.length,1);assert.equal(data.records[0].status,'sent');assert(!JSON.stringify(data).includes('PRIVATE'));assert(!JSON.stringify(data).includes('SECRET'));
});
test('module denial happens before any service or SQL, with no delegated access expansion',async()=>{
 let calls=0;await assert.rejects(aiPortalRecords({},identity,{intent:'payments'},{allowed:async()=>false,read:()=>calls++}),/liberado/);assert.equal(calls,0);
 await assert.rejects(aiPortalRecords({},{...identity,permissions:{ai:['view']}},{intent:'assistants'},{allowed:async()=>true}),/liberado/);
});
test('source errors are unavailable, not empty success, and raw errors never reach model context',async()=>{
 const r=await aiPortalRecords({},identity,{intent:'messages'},{allowed:async()=>true,read:async()=>{throw Error('D1 SQL SECRET');}});assert.equal(r.sources[0].status,'indisponível');assert(!JSON.stringify(r).includes('SECRET'));
});
test('owner-bound applications exclude sensitive payloads and cannot select a model-supplied owner',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE agentApplications(agentEmail TEXT,clientName TEXT,status TEXT,productInterest TEXT,createdAt TEXT,submittedAt TEXT,updatedAt TEXT,applicationData TEXT);INSERT INTO agentApplications VALUES('owner@example.invalid','Own','draft','IUL','2026-11-06',NULL,'2026-11-06','SECRET'),('other@example.invalid','FOREIGN','draft','Term','2026-11-06',NULL,'2026-11-06','SECRET');`);
 const env={DB:{prepare(sql){return{bind(...args){return{all:async()=>({results:db.prepare(sql).all(...args)})};}}}}};try{const r=await aiPortalRecords(env,identity,{intent:'applications',owner:'other@example.invalid'},{allowed:async()=>true});assert.equal(r.records[0].name,'Own');assert(!JSON.stringify(r).includes('FOREIGN'));assert(!JSON.stringify(r).includes('SECRET'));}finally{db.close();}
});
test('mailbox subjects never include authentication codes or full bodies',async()=>{
 const r=await aiPortalRecords({},identity,{intent:'inbox'},{now,allowed:async()=>true,read:async()=>({result:{data:{json:{items:[{id:1,subject:'Verification code 123456',body:'SECRET'},{id:2,subject:'Proposta',body:'PRIVATE BODY',direction:'received',sentAt:'2026-11-06'}]}}}})});assert.equal(r.records.length,1);assert(!JSON.stringify(r).includes('123456'));assert(!JSON.stringify(r).includes('PRIVATE'));
});
test('CRM board uses projected custom column labels rather than stale client status',async()=>{const r=await aiPortalRecords({},identity,{intent:'board'},{allowed:async()=>true,read:async()=>({result:{data:{json:{columns:[{columnKey:'follow_up',label:'Follow-up'}],clients:[{id:7,name:'Own',status:'new',columnKey:'follow_up',nextFollowUpAt:'2026-11-07'}]}}}})});assert.equal(r.records[0].status,'Follow-up');assert.equal(r.records[0].href,'/agentes/cliente?clientId=7');});
test('assistant personal WhatsApp metadata binds represented client owner and own session actor separately',async()=>{let params;const env={DB:{prepare(){return{bind(...p){params=p;return{all:async()=>({results:[]})};}}}}};await aiPortalRecords(env,{...identity,actor:'assistant@example.invalid',permissions:{whatsapp:['view']}},{intent:'whatsapp'},{allowed:async()=>true});assert.deepEqual(params,['owner@example.invalid','assistant@example.invalid']);});
