import assert from 'node:assert/strict';
import test from 'node:test';
import { destination, ORIGIN, parseRole, roles } from '../src/lib/portal.ts';
test('Only known profiles are selectable; the server remains responsible for permissions', () => {
  assert.equal(parseRole('admin'), 'admin'); assert.equal(parseRole('owner'), null);
  assert(roles.agent.tabs.some(t => t.path === '/agentes/fila-leads'));
  assert(!roles.affiliate.tabs.some(t => t.path.includes('/admin') || t.path.includes('fila-leads')));
});
test('Only the Affinity HTTPS origin loads inside the authenticated view', () => {
  assert.equal(destination(ORIGIN + '/agentes/fila-leads').type, 'internal');
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'http://www.affinityfc.org', 'intent://call']) assert.equal(destination(url).type, 'blocked');
  assert.equal(destination('https://www.affinityfc.org.evil.test/').type, 'external');
  assert.equal(destination('https://www.affinityfc.org@evil.test/').type, 'external');
});
test('Telephone actions reject short codes and carry only an international phone', () => {
  assert.deepEqual(destination('tel:+16175550100'), { type: 'call', phone: '+16175550100' });
  assert.equal(destination('tel:*21*123#').type, 'blocked');
});
test('WhatsApp preserves editable Unicode drafts without generating a send action', () => {
  const text = 'Olá, Ana! Obrigado pela conversa. Estamos à disposição.';
  assert.deepEqual(destination('https://wa.me/16175550100?text=' + encodeURIComponent(text)), { type: 'whatsapp', phone: '+16175550100', message: text });
  assert.equal(destination('whatsapp://send?phone=123').type, 'blocked');
});
