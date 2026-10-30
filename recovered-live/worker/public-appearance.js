// Public-facing forms and legacy landing pages share the main site's palette.
// Explicit routes keep authenticated portal preferences and third-party frames intact.
const pages=new Set(['/agendar','/schedule.html','/agent-public-profile.html','/seguro-de-vida-para-brasileiros-nos-eua.html','/avaliar','/avaliacao-convite.html','/feedback-atendimento.html','/preencher-aplicacao.html','/reset-password','/404']);
export function usesPublicAppearance(path){
 const normalized=path.length>1?path.replace(/\/$/,''):path;
 return pages.has(normalized)||/^\/consultor\/[a-z0-9-]+$/i.test(normalized);
}
