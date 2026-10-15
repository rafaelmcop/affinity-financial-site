import assert from 'node:assert/strict';
import test from 'node:test';
import { destination, ORIGIN, parseRole, roles } from '../src/lib/portal.ts';
test('The initial application is agent-only with queue and read-only CRM navigation', () => {
  assert.equal(parseRole('admin'), null); assert.equal(parseRole('affiliate'), null); assert.equal(parseRole('agent'), 'agent');
  assert.deepEqual(roles.agent.tabs.map(t => t.path), ['/agentes/fila-leads', '/agentes/fila-leads?view=crm']);
  for (const path of ['/admin', '/afiliados/dashboard', '/agentes/crm', '/agentes/whatsapp']) assert.equal(destination(ORIGIN + path).type, 'blocked');
  assert.equal(destination(ORIGIN + '/agentes/dashboard').type, 'queue');
  assert.equal(destination(ORIGIN + '/agentes/configuracoes').type, 'setup');
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
