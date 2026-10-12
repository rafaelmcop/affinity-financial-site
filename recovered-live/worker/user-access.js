import {featureCatalog,pageFeature} from '../public/portal-access-rules.js';
export {pageFeature};
export const accessFeatures=featureCatalog.map(([key,label])=>[key,label]);
const keys=accessFeatures.map(([key])=>key),all=JSON.stringify(keys);
export async function accessSchema(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalFeatureAccess(email TEXT PRIMARY KEY,featuresJson TEXT NOT NULL,updatedBy TEXT,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalFeatureAccessMeta(version TEXT PRIMARY KEY)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalFeatureAccessAudit(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,featuresJson TEXT NOT NULL,updatedBy TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 await env.DB.batch([env.DB.prepare("UPDATE portalFeatureAccess SET featuresJson=json_insert(featuresJson,'$[#]','whatsapp_leads') WHERE EXISTS(SELECT 1 FROM json_each(featuresJson) WHERE value='crm') AND EXISTS(SELECT 1 FROM json_each(featuresJson) WHERE value='queue') AND NOT EXISTS(SELECT 1 FROM json_each(featuresJson) WHERE value='whatsapp_leads') AND NOT EXISTS(SELECT 1 FROM portalFeatureAccessMeta WHERE version='separate-leads-v1')"),env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccessMeta(version) VALUES('separate-leads-v1')")]);
 if(!await env.DB.prepare("SELECT version FROM portalFeatureAccessMeta WHERE version='menu-granular-v2'").first()){
  const split=[['policies','applications'],['policies','application_create'],['crm','policies'],['messages','direct_contacts'],['reviews','public_profile']];
  await env.DB.batch([...split.map(([oldKey,newKey])=>env.DB.prepare("UPDATE portalFeatureAccess SET featuresJson=json_insert(featuresJson,'$[#]',?) WHERE EXISTS(SELECT 1 FROM json_each(featuresJson) WHERE value=?) AND NOT EXISTS(SELECT 1 FROM json_each(featuresJson) WHERE value=?) AND NOT EXISTS(SELECT 1 FROM portalFeatureAccessMeta WHERE version='menu-granular-v2')").bind(newKey,oldKey,newKey)),env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccessMeta(version) VALUES('menu-granular-v2')")]);
 }
 if(await env.DB.prepare("SELECT version FROM portalFeatureAccessMeta WHERE version='rollout-v1'").first())return;
 // Snapshot once; subsequent registrations start with core profile/settings only.
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccess(email,featuresJson,updatedBy) SELECT lower(email),?,'legacy-rollout' FROM adminAccounts WHERE NOT EXISTS(SELECT 1 FROM portalFeatureAccessMeta WHERE version='rollout-v1')").bind(all),
  env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccess(email,featuresJson,updatedBy) SELECT lower(email),?,'legacy-rollout' FROM affiliates WHERE NOT EXISTS(SELECT 1 FROM portalFeatureAccessMeta WHERE version='rollout-v1')").bind(all),
  env.DB.prepare("INSERT OR IGNORE INTO portalFeatureAccessMeta(version) VALUES('rollout-v1')")
 ]);
}
export async function userAccess(env,email){await accessSchema(env);const row=await env.DB.prepare('SELECT featuresJson,updatedAt FROM portalFeatureAccess WHERE email=?').bind(String(email).toLowerCase()).first();let features=[];try{features=JSON.parse(row?.featuresJson||'[]').filter(f=>keys.includes(f))}catch{}return {features,available:featureCatalog.map(([key,label,group])=>({key,label,group})),updatedAt:row?.updatedAt||null};}
export async function hasFeature(env,email,feature){
 const features=(await userAccess(env,email)).features;
 const allowed=f=>features.includes(f==='crm'?'policies':f);
 return !feature||(Array.isArray(feature)?feature.some(allowed):feature==='contacts'?allowed('whatsapp')||allowed('queue'):allowed(feature));
}
export function procedureFeature(name){
 const [role,op]=name.split('.');if(role==='affiliate')return op==='submitLead'?'referrals':null;
 if(role==='crm')return 'crm';if(role!=='agent')return null;
 if(['login','register','dashboard','pendingCounts','getProfile','updateProfile'].includes(op))return null;
 if(/FiveRings|fiveRings/.test(op))return 'five_rings';
 if(/Calendly|calendly|Meeting|meeting/.test(op))return 'calendar';
 if(['logSyncStatus','logPortalInteraction'].includes(op))return null;
 if(/PublicProfile/.test(op))return 'public_profile';
 if(['listDirectContacts','markDirectContactRead'].includes(op))return 'direct_contacts';
 if(['sendPaymentCaseEmail','paymentCase','resolvePaymentCase'].includes(op))return 'tasks';
 if(['listMessages','messageHistory','deliveryLog','scheduleMessage','updateMessage','deleteMessage','automationSubscriptions'].includes(op))return 'messages';
 if(['listApplications','getApplication','getApplicationDocument','applicationAgentDetails'].includes(op))return ['application_create','applications','policies'];
 if(/Application|PcSheet/.test(op))return op==='requestApplicationDeletion'?['application_create','applications','policies']:'application_create';
 if(/Review|review|ServiceFeedback/.test(op))return 'reviews';
 if(/Task|Tasks/.test(op))return 'tasks';
 if(/Policy|Policies|Application|Applications|PcSheet|Spreadsheet|NationalLife/.test(op))return 'policies';
 if(/Email|Mailbox|mailbox|Inbox|Delivery|delivery|ScheduledMessage|scheduleMessage|Automation|automation|Payment|Welcome/.test(op))return 'email';
 if(/Client|Clients/.test(op))return 'crm';
 return 'messages';
}
export async function saveUserAccess(env,email,features,admin){
 await accessSchema(env);email=String(email||'').trim().toLowerCase();if(!Array.isArray(features)||features.some(f=>!keys.includes(f)&&f!=='crm'))throw Object.assign(Error('Permissões inválidas.'),{status:400});
 const exists=await env.DB.prepare('SELECT email FROM adminAccounts WHERE lower(email)=? UNION SELECT email FROM affiliates WHERE lower(email)=?').bind(email,email).first();if(!exists)throw Object.assign(Error('Usuário não encontrado.'),{status:404});
 const data=JSON.stringify([...new Set(features.map(f=>f==='crm'?'policies':f))]);
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
