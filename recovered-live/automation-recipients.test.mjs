import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {automationCycle,completeAutomationCycle} from './worker/automation-cycles.js';
const source=readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');
const runner=source.slice(source.indexOf('async function runMessageAutomations(env)'),source.indexOf('__name(runMessageAutomations,'));
async function scenario(occasion='custom'){
 const clock={value:occasion==='monthly'?'2026-11-01T14:00:00Z':'2026-10-12T13:00:00Z'};const FixedDate=class extends Date{constructor(...args){super(...(args.length?args:[clock.value]));}static now(){return new Date(clock.value).getTime();}};
 const db=new DatabaseSync(':memory:');db.exec(`
 CREATE TABLE adminAccounts(email TEXT,name TEXT,phone TEXT,whatsapp TEXT,contactEmail TEXT,messageSignature TEXT,isActive INTEGER,status TEXT,accountType TEXT);
 INSERT INTO adminAccounts VALUES('owner@example.test','Agent','','','','Signature',0,'approved','agent');
 CREATE TABLE agentPolicies(id INTEGER,agentEmail TEXT,product TEXT);
 CREATE TABLE scheduledMessages(id INTEGER PRIMARY KEY,agentEmail TEXT,occasion TEXT,channel TEXT,title TEXT,subject TEXT,audience TEXT,message TEXT,isActive INTEGER,clientId INTEGER,selectedClientIds TEXT,scheduledAt TEXT,monthNumber INTEGER,recipientGroup TEXT);
 CREATE TABLE crmClients(id INTEGER PRIMARY KEY,name TEXT,email TEXT,assignedAdminEmail TEXT,status TEXT,birthDate TEXT);
 CREATE TABLE automationDeliveries(id INTEGER PRIMARY KEY,messageId INTEGER,clientId INTEGER,sentKey TEXT,UNIQUE(messageId,clientId,sentKey));
 CREATE TABLE crmAutomationSubscriptions(agentEmail TEXT,clientId INTEGER,occasion TEXT,isActive INTEGER);
 CREATE TABLE crmActivities(clientId INTEGER,type TEXT,content TEXT,createdBy TEXT);
 CREATE TABLE clientEmails(agentEmail TEXT,clientId INTEGER,direction TEXT,externalId TEXT,subject TEXT,body TEXT,fromEmail TEXT,toEmail TEXT,sentAt TEXT,visibility TEXT);
 CREATE TABLE crmDeliveryLogs(agentEmail TEXT,messageId INTEGER,clientId INTEGER,clientName TEXT,recipientEmail TEXT,subject TEXT,status TEXT,errorMessage TEXT,attemptedAt TEXT DEFAULT CURRENT_TIMESTAMP);
 `);
 for(let id=1;id<=178;id++)db.prepare('INSERT INTO crmClients VALUES(?,?,?,?,?,?)').run(id,'Contact '+id,id===177?'':'contact'+id+'@example.test',id===178?'other@example.test':'owner@example.test','client','');
 db.prepare('INSERT INTO scheduledMessages VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(1,'owner@example.test',occasion,'email','Test','Test','all','Hello {nome}',1,null,JSON.stringify(Array.from({length:178},(_,i)=>i+1)),'2026-01-01T00:00:00Z',occasion==='monthly'?11:null,null);
 const env={DB:{prepare(sql){let binds=[];return {bind(...args){assert(args.length<=100,'D1 bind limit');binds=args;return this;},async all(){return {results:db.prepare(sql).all(...binds)};},async first(){return db.prepare(sql).get(...binds);},async run(){return {meta:{changes:Number(db.prepare(sql).run(...binds).changes)}};}};},async batch(items){const out=[];for(const item of items)out.push(await item.run());return out;}}};
 const sent=[];const context=vm.createContext({Intl,Date:FixedDate,console,mondayMessageVariation:()=>'Hello {nome}',automationCycle,completeAutomationCycle,ensureAgentMessageSignatureColumn:async()=>{},DEFAULT_AGENT_MESSAGE_SIGNATURE:'Signature',DEFAULT_FLEX_LIFE_REVIEW_SUBJECT:'Review',DEFAULT_FLEX_LIFE_REVIEW_MESSAGE:'Review',LEGACY_POLICY_REVIEW_MESSAGE:'Legacy',DEFAULT_MONDAY_SUBJECT:'Monday',DEFAULT_MONDAY_MESSAGE:'Monday',escapeAutomationHtml:value=>String(value||''),clientEmailHtml:value=>value,automationFooter:async(_env,_a,_c,body)=>body,sendAgentEmail:async(_env,_owner,message)=>{sent.push(message.to);return {messageId:'fake-'+sent.length};},__name2:fn=>fn});
 vm.runInContext(runner,context);for(let batch=0;batch<10;batch++){await context.runMessageAutomations(env);clock.value=occasion==='monthly'?'2026-11-02T14:00:00Z':'2026-10-13T13:00:00Z';}
 assert.equal(sent.length,176);assert.equal(new Set(sent).size,176);assert.equal(db.prepare('SELECT count(*) n FROM automationDeliveries').get().n,176);assert.equal(db.prepare('SELECT count(*) n FROM crmDeliveryLogs').get().n,0);assert(!sent.includes('contact178@example.test'));db.close();
}
test('large selections continue across batches and never resend recorded recipients',()=>scenario());
test('Monday campaigns continue their remaining recipients on Tuesday',()=>scenario('weekly_monday'));
test('monthly campaigns continue their remaining recipients after the first day',()=>scenario('monthly'));

test('existing cycles do not resume unless a new due campaign starts',async()=>{const db=new DatabaseSync(':memory:');const env={DB:{prepare(sql){let args=[];return{bind(...values){args=values;return this;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};},async first(){return db.prepare(sql).get(...args);}};}}};const message={id:24,occasion:'monthly'};assert.equal(await automationCycle(env,message,'2026-10-09',false),undefined);const cycle=await automationCycle(env,message,'2026-11-01',true);assert.equal(cycle.sentKey,'monthly-2026-11');assert.equal((await automationCycle(env,message,'2026-11-02',false)).sentKey,cycle.sentKey);await completeAutomationCycle(env,message.id,cycle.sentKey);assert.equal(await automationCycle(env,message,'2026-11-03',false),undefined);db.close();});
