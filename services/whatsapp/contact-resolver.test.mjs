import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveContacts} from './contact-resolver.mjs';
test('resolves confirmed modern identities without guessing failed lookups',async()=>{
 globalThis.window={WWebJS:{enforceLidAndPnRetrieval:async id=>{
  if(id==='missing')throw Error('unavailable');
  return {lid:{$1:'123456789012@lid'},phone:{user:'18574218325',server:'c.us'}};
 }}};
 try{assert.deepEqual(await resolveContacts(['known','missing']),[{lid:'123456789012@lid',pn:'18574218325@c.us'},null]);}finally{delete globalThis.window;}
});
