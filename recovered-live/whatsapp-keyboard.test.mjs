import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
test('Enter submits once, Shift+Enter preserves newline and IME/repeated keys never submit',()=>{
const source=readFileSync(new URL('./worker/affinity-agent-whatsapp-portal.js',import.meta.url),'utf8');
const handler=source.match(/\$\('#text'\)\.addEventListener\('keydown',([\s\S]*?)\);\$\('#menu'\)/)?.[1];assert(handler);
let submits=0,prevented=0;const context={$:()=>({requestSubmit:()=>submits++})};vm.createContext(context);const onKey=vm.runInContext('('+handler+')',context);
for(const properties of [{key:'Enter'},{key:'Enter',shiftKey:true},{key:'Enter',isComposing:true},{key:'Enter',repeat:true},{key:'a'}])onKey({...properties,preventDefault:()=>prevented++});
assert.equal(submits,1);assert.equal(prevented,1);
});
