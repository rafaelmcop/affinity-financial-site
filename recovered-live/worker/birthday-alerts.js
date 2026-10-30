import {birthdayIdentitySafe,personBirthDate} from './person-identity.js';
const holdReady=new WeakSet();
export async function birthdayHoldSchema(env){if(holdReady.has(env.DB))return;await env.DB.prepare('CREATE TABLE IF NOT EXISTS birthdayIdentityHolds(owner TEXT NOT NULL,clientId INTEGER NOT NULL,day TEXT NOT NULL,reason TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,clientId,day))').run();holdReady.add(env.DB);}
export function birthdayWhatsapp(client,agent,year){
 const seed=Number(client.id)+Number(year),wishes=['Que seu dia seja cheio de alegria e bons momentos.','Desejo muita saúde e felicidade neste novo ano de vida.','Que este novo ciclo traga paz e muitas conquistas.','Aproveite seu dia com quem você ama.','Que não faltem motivos para sorrir hoje e sempre.'];
 const closings=['Conte comigo sempre que precisar!','Estou por aqui. Conte comigo!','Conte comigo para o que precisar.','Um abraço, e conte comigo!','Seguimos juntos. Conte comigo!'];
 const signature=String(agent.messageSignature||'{agente_nome} | Affinity Financial Consulting\n{agente_telefone}').replaceAll('{agente_nome}',agent.name||'Seu agente').replaceAll('{agente}',agent.name||'Seu agente').replaceAll('{agente_telefone}',agent.phone||agent.whatsapp||'').replaceAll('{agente_whatsapp}',agent.whatsapp||agent.phone||'').replaceAll('{agente_email}',agent.contactEmail||agent.email||'').replaceAll('{telefone do agente}',agent.phone||'').replaceAll('{email do agente}',agent.contactEmail||agent.email||'');
 return `Feliz aniversário, ${client.name}! 🎉 ${wishes[seed%5]}\n\n${closings[Math.floor(seed/5)%5]}\n\n${signature}`;
}
export async function birthdayAlerts(env,owner,now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 const offsetLabel=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(now).find(p=>p.type==='timeZoneName').value;
 const offset=(offsetLabel.match(/GMT([+-]\d+)/)?.[1]||'0')+' hours';
 const clients=(await env.DB.prepare("SELECT id,name,email,phone,whatsapp,status,birthDate FROM crmClients WHERE lower(assignedAdminEmail)=? AND (strftime('%m-%d',birthDate)=? OR substr(trim(birthDate),1,5)=?) ORDER BY name").bind(owner,parts.month+'-'+parts.day,parts.month+'/'+parts.day).all()).results||[];
 const agent=await env.DB.prepare('SELECT name,email,phone,whatsapp,contactEmail,messageSignature FROM adminAccounts WHERE lower(email)=?').bind(owner).first()||{};
 const messages=(await env.DB.prepare("SELECT * FROM scheduledMessages WHERE lower(agentEmail)=? AND occasion='birthday' AND channel='email' AND isActive=1").bind(owner).all()).results||[];
 const emailConfigured=await env.DB.prepare("SELECT 1 FROM agentEmailSettings WHERE lower(agentEmail)=? AND trim(coalesce(fromEmail,''))<>''").bind(owner).first();
 await birthdayHoldSchema(env);
 const policies=(await env.DB.prepare('SELECT clientId,clientName,birthDate FROM agentPolicies WHERE lower(agentEmail)=?').bind(owner).all()).results||[];
 const applications=(await env.DB.prepare('SELECT clientName,birthDate FROM agentApplications WHERE lower(agentEmail)=?').bind(owner).all()).results||[];
 const holds=(await env.DB.prepare("SELECT clientId,day,reason FROM birthdayIdentityHolds WHERE owner=? AND day IN (?,'*')").bind(owner,parts.year+'-'+parts.month+'-'+parts.day).all()).results||[];
 const contacts=(await env.DB.prepare('SELECT id,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=?').bind(owner).all()).results||[];
 const phoneKey=value=>String(value||'').replace(/\D/g,'').slice(-10);
 const result=[];
 for(const c of clients){
 if(!birthdayIdentitySafe(c,policies,applications)||holds.some(row=>Number(row.clientId)===Number(c.id)&&row.day==='*'))continue;
 const hold=holds.find(row=>Number(row.clientId)===Number(c.id));
 const sharedPhone=!!phoneKey(c.whatsapp||c.phone)&&contacts.some(row=>Number(row.id)!==Number(c.id)&&phoneKey(row.whatsapp||row.phone)===phoneKey(c.whatsapp||c.phone));
 const sent=await env.DB.prepare("SELECT d.sentAt FROM automationDeliveries d JOIN scheduledMessages m ON m.id=d.messageId WHERE lower(m.agentEmail)=? AND m.occasion='birthday' AND d.clientId=? AND d.sentKey=? ORDER BY d.sentAt DESC LIMIT 1").bind(owner,c.id,'birthday-'+parts.year).first();
 const failed=await env.DB.prepare("SELECT l.errorMessage FROM crmDeliveryLogs l JOIN scheduledMessages m ON m.id=l.messageId WHERE lower(l.agentEmail)=? AND m.occasion='birthday' AND l.clientId=? AND l.status='failed' AND date(l.attemptedAt,?)=? ORDER BY l.attemptedAt DESC LIMIT 1").bind(owner,c.id,offset,parts.year+'-'+parts.month+'-'+parts.day).first();
 const disabled=await env.DB.prepare("SELECT 1 FROM crmAutomationSubscriptions WHERE lower(agentEmail)=? AND clientId=? AND occasion='birthday' AND isActive=0").bind(owner,c.id).first();
 const eligible=messages.some(m=>{if(m.clientId&&Number(m.clientId)!==Number(c.id))return false;if(m.selectedClientIds){try{if(!JSON.parse(m.selectedClientIds).map(Number).includes(Number(c.id)))return false;}catch{return false;}}if(m.audience==='group'&&m.recipientGroup&&!m.selectedClientIds)return m.recipientGroup==='leads'?['new','contacted','meeting','proposal','first_meeting','followup_documents','followup_service','followup_application','followup_review'].includes(c.status):m.recipientGroup===c.status;return true;});
 result.push({id:c.id,name:c.name,phone:c.whatsapp||c.phone,birthDate:personBirthDate(c.birthDate),sharedPhone,emailReviewReason:hold?.reason||null,emailStatus:hold?'identity_review':sent?'sent':!emailConfigured?'not_configured':!c.email?'no_email':disabled?'disabled':failed?'failed':eligible?'scheduled':'not_scheduled',sentAt:hold?null:sent?.sentAt||null,whatsappMessage:birthdayWhatsapp(c,agent,parts.year)});
 }
 return result;
}
