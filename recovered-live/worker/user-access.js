export const accessFeatures=[['crm','CRM e clientes'],['queue','Fila de atendimento e leads'],['whatsapp','Conversas e mensagens do WhatsApp'],['policies','Apólices e aplicações'],['tasks','Tarefas'],['calendar','Agenda e Calendly'],['messages','Mensagens e contato direto'],['email','E-mail e automações'],['five_rings','Integração Five Rings'],['marketing','Obrigações de marketing'],['reviews','Avaliações e página pública'],['referrals','Indicações de afiliados']];
const keys=accessFeatures.map(([key])=>key),all=JSON.stringify(keys);
export async function accessSchema(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalFeatureAccess(email TEXT PRIMARY KEY,featuresJson TEXT NOT NULL,updatedBy TEXT,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalFeatureAccessMeta(version TEXT PRIMARY KEY)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalFeatureAccessAudit(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,featuresJson TEXT NOT NULL,updatedBy TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 if(await env.DB.prepare("SELECT version FROM portalFeatureAccessMeta WHERE version='rollout-v1'").first())return;
 // Snapshot once; subsequent registrations start with core profile/settings only.
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccess(email,featuresJson,updatedBy) SELECT lower(email),?,'legacy-rollout' FROM adminAccounts WHERE NOT EXISTS(SELECT 1 FROM portalFeatureAccessMeta WHERE version='rollout-v1')").bind(all),
  env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccess(email,featuresJson,updatedBy) SELECT lower(email),?,'legacy-rollout' FROM affiliates WHERE NOT EXISTS(SELECT 1 FROM portalFeatureAccessMeta WHERE version='rollout-v1')").bind(all),
  env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccessMeta(version) VALUES('rollout-v1')")
 ]);
}
export async function userAccess(env,email){await accessSchema(env);const row=await env.DB.prepare('SELECT featuresJson,updatedAt FROM portalFeatureAccess WHERE email=?').bind(String(email).toLowerCase()).first();let features=[];try{features=JSON.parse(row?.featuresJson||'[]').filter(f=>keys.includes(f))}catch{}return {features,available:accessFeatures.map(([key,label])=>({key,label})),updatedAt:row?.updatedAt||null};}
export async function hasFeature(env,email,feature){const features=(await userAccess(env,email)).features;return !feature||(feature==='contacts'?features.includes('whatsapp')||features.includes('queue'):features.includes(feature));}
export function pageFeature(path,query=new URLSearchParams()){
 if(path==='/agentes/crm/whatsapp'||path==='/agentes/fila-leads')return 'queue';
 if(path.startsWith('/agentes/crm'))return 'crm';
 // Pairing and automatic import are mandatory and independent of chat permissions.
 if(path.includes('/contact-import/')||path==='/afiliados/whatsapp'||/^\/api\/affiliate\/whatsapp\//.test(path)||/^\/api\/agent\/whatsapp\/(status|connect|disconnect)$/.test(path))return null;
 if(path.includes('whatsapp'))return 'whatsapp';
 if(path.includes('lead-queue'))return 'queue';
 if(path.includes('obrigacoes-marketing')||/\/marketing\//.test(path))return 'marketing';
 if(path.includes('five-rings'))return 'five_rings';
 if(path.includes('apolices')||path.includes('clientes')||path.startsWith('/agent-application')||path.startsWith('/api/agent/application')||path.startsWith('/api/agent/policy'))return 'policies';
 if(path.includes('tarefas')||path.includes('payment-case'))return 'tasks';
 if(path.includes('agenda')||path.startsWith('/agent-meeting'))return 'calendar';
 if(path.includes('email'))return 'email';
 if(path.includes('mensagens')||path.includes('contato-direto'))return 'messages';
 if(path.includes('avaliacoes')||path.includes('pagina-publica')||path.startsWith('/agent-review'))return 'reviews';
 return null;
}
export function procedureFeature(name){
 const [role,op]=name.split('.');if(role==='affiliate')return op==='submitLead'?'referrals':null;
 if(role==='crm')return 'crm';if(role!=='agent')return null;
 if(['login','register','dashboard','pendingCounts','getProfile','updateProfile'].includes(op))return null;
 if(/FiveRings|fiveRings/.test(op))return 'five_rings';
 if(/Calendly|calendly|Meeting|meeting/.test(op))return 'calendar';
 if(/Review|review|ServiceFeedback|PublicProfile/.test(op))return 'reviews';
 if(/Task|Tasks/.test(op))return 'tasks';
 if(/Policy|Policies|Application|Applications|PcSheet|Spreadsheet|NationalLife/.test(op))return 'policies';
 if(/Email|Mailbox|mailbox|Inbox|Delivery|delivery|ScheduledMessage|scheduleMessage|Automation|automation|Payment/.test(op))return 'email';
 if(/Client|Clients/.test(op))return 'crm';
 return 'messages';
}
export async function saveUserAccess(env,email,features,admin){
 await accessSchema(env);email=String(email||'').trim().toLowerCase();if(!Array.isArray(features)||features.some(f=>!keys.includes(f)))throw Object.assign(Error('Permissões inválidas.'),{status:400});
 const exists=await env.DB.prepare('SELECT email FROM adminAccounts WHERE lower(email)=? UNION SELECT email FROM affiliates WHERE lower(email)=?').bind(email,email).first();if(!exists)throw Object.assign(Error('Usuário não encontrado.'),{status:404});
 const data=JSON.stringify([...new Set(features)]);
 await env.DB.batch([env.DB.prepare('INSERT INTO portalFeatureAccess(email,featuresJson,updatedBy) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET featuresJson=excluded.featuresJson,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(email,data,admin),env.DB.prepare('INSERT INTO portalFeatureAccessAudit(email,featuresJson,updatedBy) VALUES(?,?,?)').bind(email,data,admin)]);return userAccess(env,email);
}
export async function accessRoute(request,env,auth){
 const url=new URL(request.url),path=url.pathname;
 if(!['/api/admin/user-access','/api/agent/access','/api/affiliate/access'].includes(path))return null;
 try{
 let email=await auth.email(request,env);const admin=path==='/api/admin/user-access';
 if(admin){const a=email?await auth.access(email,env):null;if(!a||( !a.isMaster&&!(a.account?.isActive&&a.account.status==='approved'&&['admin','both'].includes(a.account.accountType))))return Response.json({error:'Acesso restrito ao Admin.'},{status:403});
  if(request.method==='POST'){if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Solicitação inválida.'},{status:403});const raw=await request.text();if(raw.length>8000)return Response.json({error:'Solicitação muito grande.'},{status:413});const input=JSON.parse(raw);return Response.json(await saveUserAccess(env,input.email,input.features,email),{headers:{'cache-control':'no-store'}});}
  email=url.searchParams.get('email');
 }else if(path.includes('/affiliate/')){const id=await auth.affiliate(request,env);const a=id?await env.DB.prepare("SELECT email FROM affiliates WHERE id=? AND isActive=1 AND status='approved'").bind(id).first():null;email=a?.email;
 }else{const a=email?await auth.access(email,env):null;if(!a?.account?.isActive||a.account.status!=='approved'||!['agent','both'].includes(a.account.accountType))email=null;}
 if(!email)return Response.json({error:'Entre no portal.'},{status:401});
 if(request.method!=='GET')return Response.json({error:'Método inválido.'},{status:405});
 return Response.json(await userAccess(env,email),{headers:{'cache-control':'no-store'}});
 }catch(e){return Response.json({error:e.message||'Não foi possível salvar.'},{status:e.status||400});}
}
