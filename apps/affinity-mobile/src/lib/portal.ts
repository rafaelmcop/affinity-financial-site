export type Role = 'agent' | 'admin' | 'affiliate';
export const ORIGIN = 'https://www.affinityfc.org';
export const roles: Record<Role, { title: string; description: string; login: string; tabs: { title: string; path: string }[] }> = {
  agent: { title: 'Agente', description: 'Sua fila, atendimentos e próximos retornos.', login: '/agentes/login', tabs: [
    { title: 'Minha fila', path: '/agentes/fila-leads' },
    { title: 'Contatos', path: '/agentes/inicio?configurar=1' },
    { title: 'Configurações', path: '/agentes/configuracoes' },
  ] },
  admin: { title: 'Admin', description: 'Distribuição de leads e acompanhamento da equipe.', login: '/admin/login', tabs: [
    { title: 'Central de leads', path: '/admin/central-leads' },
    { title: 'Portal', path: '/admin' },
  ] },
  affiliate: { title: 'Afiliado', description: 'Seus contatos, prioridades e portal.', login: '/afiliados/login', tabs: [
    { title: 'Portal', path: '/afiliados/dashboard' },
    { title: 'Prioridades', path: '/afiliados/inicio?configurar=1' },
    { title: 'WhatsApp', path: '/afiliados/whatsapp' },
  ] },
};
export function parseRole(value: unknown): Role | null {
  return value === 'agent' || value === 'admin' || value === 'affiliate' ? value : null;
}
export type Destination = { type: 'internal' } | { type: 'call' | 'whatsapp'; phone: string; message?: string } | { type: 'external'; url: string } | { type: 'blocked' };
// Navigation decisions are deliberately independent of authentication; the server enforces roles.
export function destination(raw: string): Destination {
  try {
    const url = new URL(raw);
    if (url.origin === ORIGIN) return { type: 'internal' };
    if (url.protocol === 'tel:' && /^\+\d{8,15}$/.test(url.pathname)) return { type: 'call', phone: url.pathname };
    if (url.protocol === 'https:' && url.hostname === 'wa.me' && /^\/\d{8,15}$/.test(url.pathname)) return { type: 'whatsapp', phone: '+' + url.pathname.slice(1), message: (url.searchParams.get('text') || '').slice(0, 2000) };
    if (url.protocol === 'https:') return { type: 'external', url: url.href };
  } catch { /* Reject malformed URLs and unrecognized custom schemes. */ }
  return { type: 'blocked' };
}
