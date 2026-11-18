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
