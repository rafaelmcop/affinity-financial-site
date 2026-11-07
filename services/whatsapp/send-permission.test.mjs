import {test} from 'node:test';import assert from 'node:assert/strict';import {sendAllowed} from './send-permission.mjs';
test('manual authorization permits only explicitly marked requests while automation stays blocked',()=>{
const env={WHATSAPP_SEND_ENABLED:'false',WHATSAPP_MANUAL_SEND_ENABLED:'true'};
assert.equal(sendAllowed(env,{manual:true}),true);
for(const input of [{},{manual:false},{manual:'true'},undefined])assert.equal(sendAllowed(env,input),false);
assert.equal(sendAllowed({WHATSAPP_SEND_ENABLED:'false'},{manual:true}),false);
});
