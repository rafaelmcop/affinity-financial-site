import {test} from 'node:test';import assert from 'node:assert/strict';import {optionalFiveRingsCredits} from './worker/five-rings-credit-status.js';
test('unavailable credit cards are an explicit partial-data warning, not a failed client/policy import',async()=>{
 const missing=await optionalFiveRingsCredits(async()=>{throw Error('Os cartões não foram encontrados.');});assert.equal(missing.updated,false);assert.match(missing.warning,/créditos não atualizados/);assert.match(missing.warning,/não foram encontrados/);
 const complete=await optionalFiveRingsCredits(async()=>({totalCredits:100}));assert.deepEqual(complete,{updated:true,warning:null});
});
