import {publicDatabaseErrorMessage} from './worker/database-error-privacy.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {privacyFixture} from './privacy-test-fixture.mjs';
import {crmBoard,columns} from './worker/crm-board.js';
import {crmClientDetail} from './worker/crm-client-detail.js';
import {visibleLeadSQL} from './worker/lead-flow.js';
import {marketingParticipationSql} from './worker/marketing-participation.js';
import {applicationVersionGuard} from './worker/application-client-data.js';
const attacks=["' OR 1=1 --","'); DROP TABLE crmClients; --","x UNION SELECT passwordHash FROM adminAccounts --",'x/*comment*/ OR 1=1',"x;SELECT load_extension('evil')"];
test('dynamic SQL fragments accept only server-owned expressions, never arbitrary input',()=>{
 for(const expression of ['centralLeads.phone','l.phone','s.phone'])assert(visibleLeadSQL(expression).includes(expression));
 assert(marketingParticipationSql('c.agent','c.confirmedAt').includes('c.confirmedAt'));
 assert(marketingParticipationSql('centralLeads.leaseOwner','CURRENT_TIMESTAMP').includes('CURRENT_TIMESTAMP'));
 for(const payload of attacks){assert.throws(()=>visibleLeadSQL(payload),/não autorizada/);assert.throws(()=>marketingParticipationSql(payload,'c.confirmedAt'),/não autorizada/);assert.throws(()=>marketingParticipationSql('c.agent',payload),/não autorizada/);}
});
test('SQL-looking labels and apostrophes remain literal data; forged keys cannot update another account',async()=>{
 const {db,env}=privacyFixture(),statements=[],prepare=env.DB.prepare;
 env.DB.prepare=sql=>{statements.push(sql);return prepare(sql)};
 try{
  db.exec('CREATE TABLE crmClients(id INTEGER PRIMARY KEY,name TEXT);INSERT INTO crmClients VALUES(1,\'Preserved\')');
  const foreign=await crmBoard(env,'other@example.invalid',{label:'Private foreign label'},'column');
  for(const label of [...attacks,"O'Connor follow-up"]){
   const saved=await crmBoard(env,'owner@example.invalid',{label},'column');
   assert.equal(db.prepare('SELECT label FROM crmBoardColumns WHERE owner=? AND columnKey=?').get('owner@example.invalid',saved.columnKey).label,label);
   await crmBoard(env,'owner@example.invalid',{columnKey:saved.columnKey,label:label+'!'},'rename');
  }
  for(const payload of attacks){
   await assert.rejects(crmBoard(env,'owner@example.invalid',{columnKey:payload,label:'Tampered'},'rename'),/não encontrada/);
   const own=await columns(env,payload);assert(!own.some(row=>row.label==='Private foreign label'));
   assert(!statements.some(sql=>sql.includes(payload)));
  }
  await assert.rejects(crmBoard(env,'owner@example.invalid',{columnKey:foreign.columnKey,label:'Tampered'},'rename'),/não encontrada/);
  assert.equal(db.prepare('SELECT count(*) n FROM crmClients').get().n,1);
  assert.equal(db.prepare('SELECT label FROM crmBoardColumns WHERE owner=? AND columnKey=?').get('other@example.invalid',foreign.columnKey).label,'Private foreign label');
 }finally{db.close()}
});
test('injected client IDs are rejected before querying; application column identifiers stay allowlisted',async()=>{
 let calls=0;const env={DB:{prepare(){calls++;throw Error('Unexpected query')}}};
 for(const id of attacks)assert.equal(await crmClientDetail(env,'owner@example.invalid',id),null);
 assert.equal(calls,0);
 for(const payload of attacks){const guard=applicationVersionGuard({clientName:payload,[payload]:'not a column'});assert.equal(guard.sql,'clientName IS ?');assert.deepEqual(guard.values,[payload]);assert(!guard.sql.includes(payload));}
});

test('public errors omit SQL schema, query text and private exception values',()=>{
 for(const detail of ['D1_ERROR: no such table: private_clients','SQLITE_CONSTRAINT: SECRET ACCOUNT','CHECK constraint failed: private_status',"D1_EXEC_ERROR: SELECT passwordHash FROM adminAccounts"]){const message=publicDatabaseErrorMessage(detail);assert(!message.includes('SECRET'));assert(!message.includes('private_'));assert(!message.includes('passwordHash'));assert(!message.includes('SELECT'));assert.match(message,/suporte/);}
 assert.equal(publicDatabaseErrorMessage('Selecione uma data de follow-up.'),'Selecione uma data de follow-up.');
});
