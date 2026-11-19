import {test} from 'node:test';import assert from 'node:assert/strict';import {filterDeliveries} from './public/assets/message-list-utils.js';
const now=Date.parse('2026-10-09T16:00:00Z');
test('periods exclude scheduled, failed, future and older deliveries regardless of status tab',()=>{
 const rows=[{id:1,status:'sent',date:'2026-10-03 16:00:00'},{id:2,status:'scheduled',date:'2026-10-08 16:00:00'},{id:3,status:'failed',date:'2026-10-08 16:00:00'},{id:4,status:'sent',date:'2026-10-01 16:00:00'},{id:5,status:'sent',date:'2026-10-10 16:00:00'}];
 assert.deepEqual(filterDeliveries(rows,{period:'7',now}).map(r=>r.id),[1]);
 assert.deepEqual(filterDeliveries(rows,{period:'7',status:'scheduled',now}),[]);
 assert.equal(filterDeliveries(rows,{period:'30',now}).length,2);
});
test('group counts and recipients use individual send timestamps',()=>{
 const rows=[{status:'sent',date:'2026-10-08 12:00:00',recipients:[{name:'Old',sentAt:'2026-09-01 12:00:00'},{name:'Recent',sentAt:'2026-10-08 12:00:00'}]}];
 const [row]=filterDeliveries(rows,{period:'7',now});assert.equal(row.recipientCount,1);assert.deepEqual(row.recipients.map(r=>r.name),['Recent']);assert.equal(rows[0].recipients.length,2);
});
test('one day, six months and one year respect each cutoff',()=>{
 const rows=['2026-10-09 12:00:00','2026-10-07 12:00:00','2026-05-01 12:00:00','2025-11-01 12:00:00','2025-09-01 12:00:00'].map(date=>({status:'sent',date}));
 assert.equal(filterDeliveries(rows,{period:'1',now}).length,1);assert.equal(filterDeliveries(rows,{period:'months6',now}).length,3);assert.equal(filterDeliveries(rows,{period:'year',now}).length,4);
});
