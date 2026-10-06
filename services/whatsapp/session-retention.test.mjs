import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {retainingAuth,installAuthTimeoutGuard} from './session-retention.mjs';
test('automatic LocalAuth logout retains credentials', async () => {
  let deleted = false;
  class Auth { async logout() { deleted = true; } }
  const Retained = retainingAuth(Auth);
  await new Retained().logout();
  assert.equal(deleted,false);
});
test('navigation auth timeout marks session error without terminating HTTP process', () => {
  const emitter = new EventEmitter(), session = {state:'ready',qr:'stale'};
  const logs = [];
  installAuthTimeoutGuard(emitter,new Map([['owner',session]]),entry=>logs.push(entry));
  emitter.emit('unhandledRejection','auth timeout');
  assert.equal(session.state,'error');
  assert.equal(session.qr,null);
  assert.deepEqual(logs,['whatsapp_navigation_auth_timeout']);
  assert.throws(()=>emitter.emit('unhandledRejection',new Error('unrelated failure')),/unrelated failure/);
});
