export type Role = 'agent';
export const ORIGIN = 'https://www.affinityfc.org';
export const roles = {
  agent: { title: 'Agente', description: 'Sua fila de ligações e as etapas dos seus clientes.', login: '/agentes/login', tabs: [
    { title: 'Ligações', path: '/agentes/fila-leads' },
    { title: 'CRM', path: '/agentes/fila-leads?view=crm' },
  ] },
};
export function parseRole(value: unknown): Role | null {
  return value === 'agent' ? value : null;
}
export type Destination = { type: 'internal' } | { type: 'queue' } | { type: 'setup' } | { type: 'call' | 'whatsapp'; phone: string; message?: string } | { type: 'external'; url: string } | { type: 'blocked' };
// Navigation decisions are deliberately independent of authentication; the server enforces roles.
export function destination(raw: string): Destination {
  try {
    const url = new URL(raw);
    if (url.origin === ORIGIN) {
      if (['/agentes/dashboard', '/agentes', '/agentes/'].includes(url.pathname)) return { type: 'queue' };
      if (['/agentes/inicio', '/agentes/configuracoes'].includes(url.pathname)) return { type: 'setup' };
      if (url.pathname === '/agentes/login' || (url.pathname === '/agentes/fila-leads' && (!url.search || url.search === '?view=crm'))) return { type: 'internal' };
      return { type: 'blocked' };
    }
    if (url.protocol === 'tel:' && /^\+\d{8,15}$/.test(url.pathname)) return { type: 'call', phone: url.pathname };
    if (url.protocol === 'https:' && url.hostname === 'wa.me' && /^\/\d{8,15}$/.test(url.pathname)) return { type: 'whatsapp', phone: '+' + url.pathname.slice(1), message: (url.searchParams.get('text') || '').slice(0, 2000) };
    if (url.protocol === 'https:') return { type: 'external', url: url.href };
  } catch { /* Reject malformed URLs and unrecognized custom schemes. */ }
  return { type: 'blocked' };
}
