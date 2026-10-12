import {test} from 'node:test';import assert from 'node:assert/strict';import {contactImportJob} from './contact-import-job.mjs';
test('one failed preparation backs off then recovers without reconnecting or repeating parallel reads',async()=>{
 const session={};let reads=0;const reports=[];const read=async()=>{reads++;if(reads===1)throw Error('Temporário 16175550100 contact@example.test');return {contacts:[{phone:'+16175550100'}]};};
 const first=contactImportJob(session,read,Date.now(),r=>reports.push(r));await first.promise;assert(first.error);assert(!reports[0].reason.includes('16175550100'));assert(!reports[0].reason.includes('contact@example.test'));
 assert.equal(contactImportJob(session,read,first.retryAt-1),first);assert.equal(reads,1);const retry=contactImportJob(session,read,first.retryAt);assert.equal(contactImportJob(session,read,first.retryAt),retry);await retry.promise;assert.equal(reads,2);assert.equal(retry.result.contacts.length,1);assert(!retry.error);assert.equal(contactImportJob(session,read,Date.now()),retry);
});
