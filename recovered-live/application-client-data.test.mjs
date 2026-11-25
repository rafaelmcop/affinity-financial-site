import test from 'node:test';
import assert from 'node:assert/strict';
import {clientApplicationColumns} from './worker/application-client-data.js';

const row={clientName:'Example Client',clientEmail:'client@example.invalid',clientPhone:'2025550100',birthDate:'1990-01-02',address:'Example Street',city:'Miami',state:'FL',zipCode:'00000'};
test('saving a financial or health section preserves all existing identity and address columns',()=>{
 const values=Object.values(row);
 assert.deepEqual(clientApplicationColumns(row,{bankName:'Example Bank'}),values);
 assert.deepEqual(clientApplicationColumns(row,{seenDoctor:'Sim',medicalDetails:'Synthetic data'}),values);
 assert.deepEqual(clientApplicationColumns(row,{attachments:[]}),values);
});
test('partial personal updates preserve omitted fields and accept explicit clearing',()=>{
 const values=clientApplicationColumns(row,{clientEmail:' NEW@EXAMPLE.INVALID ',clientPhone:''});
 assert.equal(values[0],row.clientName);assert.equal(values[1],'new@example.invalid');assert.equal(values[2],null);
 assert.deepEqual(values.slice(3),Object.values(row).slice(3));
});

import {applicationExtra,applicationFields,applicationClientFields,applicationRevision,applicationVersionGuard} from './worker/application-client-data.js';
import {webcrypto} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
globalThis.crypto ||= webcrypto;

test('canonical identity overrides old duplicate names while client-entered work and health fields survive',()=>{
 const stored={...row,id:1,occupation:null,sensitiveData:'encrypted',applicationData:'stored'};
 const extra={clientName:'Old wrong name',clientEmail:'old@example.invalid',occupation:'Synthetic job',serviceDate:'2026-11-18'};
 const data=applicationFields(stored,extra,{bankName:'Example bank'});
 assert.equal(data.clientName,row.clientName);
 assert.equal(data.clientEmail,row.clientEmail);
 assert.equal(data.occupation,'Synthetic job');
 assert.equal(data.serviceDate,'2026-11-18');
 assert.equal(data.applicationData,undefined);
 assert.equal(data.sensitiveData,undefined);
 assert.deepEqual(applicationExtra(extra),{occupation:'Synthetic job',serviceDate:'2026-11-18'});
 const client=applicationClientFields({...stored,clientToken:'secret',accessCode:'secret'},extra,{bankName:'Example bank'});
 assert.equal(client.occupation,'Synthetic job');assert.equal(client.clientToken,undefined);assert.equal(client.accessCode,undefined);
});
test('revision detects identity, ordinary and protected changes without returning their contents',async()=>{
 const source={...row,id:1,applicationData:'{"notes":"synthetic"}',sensitiveData:'encrypted'};
 const revision=await applicationRevision(source);
 assert.match(revision,/^[0-9a-f]{64}$/);
 for(const patch of [{clientName:'Changed'},{applicationData:'changed'},{sensitiveData:'changed'}]){
  assert.notEqual(await applicationRevision({...source,...patch}),revision);
 }
});
test('atomic version guard prevents a stale save from overwriting a simultaneous client update',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec("CREATE TABLE agentApplications(id INTEGER PRIMARY KEY,clientName TEXT,applicationData TEXT,sensitiveData TEXT,updatedAt TEXT); INSERT INTO agentApplications VALUES(1,'Initial','{}','encrypted','same-second')");
  const loaded=db.prepare('SELECT * FROM agentApplications WHERE id=1').get();
  const guard=applicationVersionGuard(loaded);
  db.prepare('UPDATE agentApplications SET clientName=? WHERE id=1').run('Concurrent correction');
  const stale=db.prepare('UPDATE agentApplications SET clientName=? WHERE id=? AND '+guard.sql).run('Stale value',1,...guard.values);
  assert.equal(stale.changes,0);assert.equal(db.prepare('SELECT clientName FROM agentApplications').get().clientName,'Concurrent correction');
 }finally{db.close()}
});

import fs from 'node:fs';
import vm from 'node:vm';


test('agent save persists a corrected name and new fields, preserves client-only and protected data, and rejects stale versions',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(`CREATE TABLE agentApplications(
   id INTEGER PRIMARY KEY,agentEmail TEXT,clientName TEXT NOT NULL,clientEmail TEXT,clientPhone TEXT,birthDate TEXT,address TEXT,city TEXT,state TEXT,zipCode TEXT,
   maritalStatus TEXT,occupation TEXT,annualIncome REAL,beneficiaryName TEXT,beneficiaryRelationship TEXT,beneficiaryPercentage REAL,productInterest TEXT,coverageRequested REAL,premiumBudget REAL,applicationReason TEXT,notes TEXT,
   applicationData TEXT,sensitiveData TEXT,status TEXT,createdAt TEXT,updatedAt TEXT,clientToken TEXT);
  INSERT INTO agentApplications(id,agentEmail,clientName,clientEmail,applicationData,sensitiveData,status,createdAt,updatedAt)
  VALUES(1,'owner@example.invalid','Old name','synthetic@example.invalid','{"clientName":"Old duplicated name","referral1Name":"Stored referral","clientSavedSections":["Cliente"]}','{"bankName":"Old bank","medicalDetails":"Stored medical detail"}','draft','2026-11-18 12:00:00','2026-11-18 12:00:00');`);
  const env = {DB: {
   prepare(sql) {
    let args = [];
    return {
     bind(...values) { args = values; return this; },
     async first() { return db.prepare(sql).get(...args) || null; },
     async run() {
      const result = db.prepare(sql).run(...args);
      return {meta: {changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid)}};
     }
    };
   }
  }};

  const source=fs.readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');
  const start=source.indexOf('    if (name === "agent.saveApplication") {');
  const end=source.indexOf('    if (name === "agent.submitApplication") {',start);
  const context=vm.createContext({crypto:webcrypto,TextEncoder,clientApplicationColumns,applicationExtra,applicationFields,applicationClientFields,applicationRevision,applicationVersionGuard,applicationDay:value=>String(value).slice(0,10),validEmail:value=>value.includes('@'),encryptSmtpPassword:async value=>value,decryptSmtpPassword:async value=>value,syncApplicationClient:async()=>({}),trpcResult:value=>value,trpcError:(error,code,status)=>({error,code,status})});
  const save=vm.runInContext('(async function(input,env){const owner="owner@example.invalid",delegation=null,name="agent.saveApplication";'+source.slice(start,end)+'})',context);
  const before=db.prepare('SELECT * FROM agentApplications WHERE id=1').get();
  const revision=await applicationRevision(before);
  const response=await save({id:1,clientName:'Corrected full name',clientEmail:'synthetic@example.invalid',expectedRevision:revision,applicationData:{employer:'New employer',bankName:'Updated bank'}},env);
  assert.equal(response.success,true);
  const after=db.prepare('SELECT * FROM agentApplications WHERE id=1').get();
  assert.equal(after.clientName,'Corrected full name');
  assert.equal(JSON.parse(after.applicationData).clientName,undefined);
  assert.equal(JSON.parse(after.applicationData).employer,'New employer');
  assert.equal(JSON.parse(after.applicationData).referral1Name,'Stored referral');
  assert.equal(JSON.parse(after.sensitiveData).medicalDetails,'Stored medical detail');
  assert.equal(JSON.parse(after.sensitiveData).bankName,'Updated bank');
  assert.equal(response.revision,await applicationRevision(after));
  const stale=await save({id:1,clientName:'Stale old name',expectedRevision:revision},env);
  assert.equal(stale.status,409);
  assert.equal(db.prepare('SELECT clientName FROM agentApplications WHERE id=1').get().clientName,'Corrected full name');
  const token='a'.repeat(32);
  db.prepare('UPDATE agentApplications SET clientToken=? WHERE id=1').run(token);
  const clientStart=source.indexOf('  if (name === "applications.verifyCode" || name === "applications.clientSave") {');
  const clientEnd=source.indexOf('  if (name === "reviewInvites.get"',clientStart);
  const clientSave=vm.runInContext('(async function(input,env){const name="applications.clientSave";'+source.slice(clientStart,clientEnd)+'})',context);
  const clientBefore=db.prepare('SELECT * FROM agentApplications WHERE id=1').get();
  const clientResult=await clientSave({id:1,token,expectedRevision:await applicationRevision(clientBefore),applicationData:{occupation:'Updated occupation',clientSavedSections:['Cliente','Trabalho e finanças']}},env);
  assert.equal(clientResult.success,true);
  const final=db.prepare('SELECT * FROM agentApplications WHERE id=1').get();
  assert.equal(final.clientName,'Corrected full name');
  assert.equal(JSON.parse(final.applicationData).occupation,'Updated occupation');
  assert.equal(JSON.parse(final.applicationData).employer,'New employer');
  assert.equal(JSON.parse(final.sensitiveData).medicalDetails,'Stored medical detail');
  assert.equal(clientResult.revision,await applicationRevision(final));
  const staleClient=await clientSave({id:1,token,expectedRevision:await applicationRevision(clientBefore),applicationData:{clientName:'Outdated name'}},env);
  assert.equal(staleClient.status,409);

 }finally{db.close()}
});
