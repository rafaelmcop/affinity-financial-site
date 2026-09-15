import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('./worker/current-worker.js', import.meta.url), 'utf8');
const security = source.slice(source.indexOf('var contentSecurityPolicy ='), source.indexOf('__name(secureResponse,'));
const context = vm.createContext({ Response, Uint8Array, crypto: webcrypto,
  toBase64Url: bytes => Buffer.from(bytes).toString('base64url'),
  HTMLRewriter: class {
    on(selector, handler) { this.handler = handler; return this; }
    transform(response) {
      this.handler.element({ setAttribute(name, value) { assert.equal(name, 'nonce'); assert.ok(value.length >= 32); } });
      return response;
    }
  }
});
vm.runInContext(security, context);
test('HTML uses unique nonces in a non-breaking rollout and cannot be cached', () => {
  const first = context.secureResponse(new Response('<script>test</script>', {headers:{'content-type':'text/html','etag':'old'}}));
  const second = context.secureResponse(new Response('', {headers:{'content-type':'text/html'}}));
  const policy = first.headers.get('Content-Security-Policy-Report-Only');
  assert.match(policy, /nonce-/);
  assert.doesNotMatch(policy, /script-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(policy, /forge\.butterfly/);
  assert.notEqual(policy, second.headers.get('Content-Security-Policy-Report-Only'));
  assert.equal(first.headers.get('etag'), null);
  assert.match(first.headers.get('cache-control'), /no-store/);
  assert.equal(first.headers.get('referrer-policy'), 'no-referrer');
});
test('API and static resources keep their status and do not get HTML rewriting', () => {
  const response = context.secureResponse(new Response('{}', {status:401,headers:{'content-type':'application/json'}}), {privateData:true});
  assert.equal(response.status,401);
  assert.equal(response.headers.get('Content-Security-Policy-Report-Only'),null);
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');
});
