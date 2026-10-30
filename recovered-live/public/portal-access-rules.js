export const featureCatalog = [
 ['queue','Fila de atendimento','Prospecção'],['whatsapp_leads','Leads do WhatsApp','Prospecção'],['marketing','Obrigações de marketing','Prospecção'],
 ['application_create','Aplicação nova','Aplicações'],['applications','Em andamento','Aplicações'],
 ['email','E-mail','Comunicação'],['whatsapp','WhatsApp — conversas e mensagens','Comunicação'],
 ['messages','Mensagens e automações','CRM'],['direct_contacts','Contato direto','CRM'],['calendar','Agenda','CRM'],
 ['policies','Apólices','Cliente'],['tasks','Avisos de pagamentos atrasados','Notificações'],['reviews','Avaliações','Avaliações'],
 ['public_profile','Página pública do agente','Conta e integrações'],['five_rings','Integração Five Rings','Conta e integrações'],['referrals','Indicações de afiliados','Afiliados']
];
export function pageFeature(path,query=new URLSearchParams()) {
 path=path.replace(/\/$/,'');
 if(path==='/agentes/inicio'||path==='/afiliados/inicio'||path.includes('/contact-import/')||path==='/afiliados/whatsapp'||/^\/api\/affiliate\/whatsapp\//.test(path)||/^\/api\/agent\/whatsapp\/(status|connect|disconnect)$/.test(path))return null;
 if(path==='/agentes/crm/whatsapp')return 'whatsapp_leads';
 if(path.includes('fila-leads')||path.includes('lead-queue'))return 'queue';
 if(path.includes('obrigacoes-marketing')||/\/marketing\//.test(path))return 'marketing';
 if(path==='/agentes/novo-cliente'||path==='/agentes/pcsheet'||path==='/agentes/tarefas')return 'policies';
 if(path==='/agentes/clientes')return 'policies';
 if(path.startsWith('/agent-application')||path.startsWith('/api/agent/application'))return query.get('nova')==='1'||query.has('meetingId')?'application_create':'applications';
 if(path==='/agent-crm-client.html')return 'policies';
 if(path==='/agent-direct-contacts.html')return 'direct_contacts';
 if(path.startsWith('/agent-public-profile'))return 'public_profile';
 if(path.startsWith('/agent-calendar')||path==='/agentes/compromisso')return 'calendar';
 if(path==='/agent-whatsapp-leads.html')return 'whatsapp_leads';
 if(path.startsWith('/agentes/crm')||path==='/agentes/cliente'||path.includes('apolices')||path.startsWith('/api/agent/policy'))return 'policies';
 if(path.includes('whatsapp'))return 'whatsapp';
 if(path.includes('five-rings'))return 'five_rings';
 if(path.includes('tarefas')||path.includes('payment-case')||path==='/agentes/caso-pagamento')return 'tasks';
 if(path.includes('agenda')||path.startsWith('/agent-meeting'))return 'calendar';
 if(path.includes('email'))return 'email';
 if(path.includes('mensagens'))return 'messages';
 if(path.includes('contato-direto'))return 'direct_contacts';
 if(path.includes('pagina-publica'))return 'public_profile';
 if(path.includes('avaliacoes')||path.startsWith('/agent-review'))return 'reviews';
 if(path.includes('indicacoes'))return 'referrals';
 return null;
}
