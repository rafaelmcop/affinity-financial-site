const portals = {
 agent: {cookie: 'affinity_admin_session', type: 'admin', login: '/agentes/login'},
 admin: {cookie: 'affinity_admin_session', type: 'admin', login: '/admin/login'},
 affiliate: {cookie: 'affinity_affiliate_session', type: 'affiliate', login: '/afiliados/login'},
 assistant: {cookie: 'affinity_assistant_session', type: 'assistant', login: '/assistentes/login'}
};

export function portalSessionKind(url) {
 const path = url.pathname.replace(/\/$/, '');
 if (/\/(?:login|registrar)$/.test(path) || /(?:^|-)login\.html$/.test(path)) return null;
 if (path === '/agent-public-profile.html') return null;
 if (url.searchParams.get('assistantView') === '1') return 'assistant';
 if (/^\/admin(?:\/|-)/.test(path)) return 'admin';
 if (/^\/(?:afiliados\/|affiliate-)/.test(path)) return 'affiliate';
 if (/^\/(?:assistentes\/|assistant-)/.test(path)) return 'assistant';
 if (/^\/(?:agentes\/|agent-)/.test(path)) return 'agent';
 if (path === '/candidaturas.html' && ['agent','admin'].includes(url.searchParams.get('portal'))) return url.searchParams.get('portal');
 return null;
}

export async function portalSessionRoute(request, env, readSession) {
 const url = new URL(request.url);
 if (url.pathname !== '/api/portal/session-status') return null;
 const headers = {'cache-control':'private, no-store', 'x-content-type-options':'nosniff'};
 if (request.method !== 'GET') return Response.json({error:'Método indisponível.'}, {status:405, headers});
 const kind = url.searchParams.get('portal');
 const portal = Object.hasOwn(portals, kind) ? portals[kind] : null;
 if (!portal) return Response.json({error:'Portal inválido.'}, {status:400, headers});
 const session = await readSession(request, env, portal.cookie);
 const active = session?.type === portal.type && Number(session.expiresAt) > Date.now();
 return Response.json({
  active,
  expiresAt: active ? Number(session.expiresAt) : null,
  login: portal.login
 }, {status:active ? 200 : 401, headers});
}
