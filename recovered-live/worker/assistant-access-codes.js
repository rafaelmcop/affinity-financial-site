import {readableMailboxBody} from './mailbox-body.js';
export function accessCodeProvider(mail,now=Date.now()){
 const sender=String(mail.fromEmail||mail.from?.value?.[0]?.address||mail.from?.text||'').trim().toLowerCase().replace(/^.*<([^>]+)>.*$/,'$1'),domain=sender.split('@')[1]||'';
 const provider=/(^|\.)nationallife\.com$/.test(domain)?'National Life':/(^|\.)(fiveringsfinancial\.com|fiverings\.com|mga360\.com)$/.test(domain)?'Five Rings':null;
 const date=Date.parse(mail.sentAt||mail.date||''),text=String(mail.subject||'')+'\n'+readableMailboxBody(mail);
 if(!provider||!Number.isFinite(date)||now-date>10*60000||date>now+120000)return null;
 if(/reset.{0,25}password|password.{0,25}reset|redefini.{0,25}senha|change.{0,15}(?:email|password)/i.test(text))return null;
 if(!/(?:verification|security|one[- ]time|login|access|authentication|sign[- ]in|2[- ]step|two[- ]step|verifica[cç][aã]o|autentica[cç][aã]o)[\s\S]{0,50}(?:code|c[oó]digo)|c[oó]digo[\s\S]{0,40}(?:verifica|acesso|seguran|autentica)/i.test(text)||!/(?:code|c[oó]digo)[^0-9]{0,100}[0-9]{4,10}(?![0-9])/i.test(text))return null;
 return provider;
}
export async function codeRecipients(env,owner){
 const rows=(await env.DB.prepare("SELECT p.id,p.name,p.email,c.address,l.permissionsJson FROM portalAssistants p JOIN assistantAgentAccess l ON l.assistantId=p.id JOIN assistantCommunications c ON c.assistantId=p.id JOIN adminAccounts a ON lower(a.email)=l.owner WHERE l.owner=? AND l.active=1 AND p.active=1 AND p.deletedAt IS NULL AND c.state='ready' AND a.isActive=1 AND a.status='approved'").bind(owner).all()).results||[];
 return rows.filter(row=>{try{return JSON.parse(row.permissionsJson).portal_codes?.includes('view');}catch{return false;}});
}
export async function relayAccessCode(env,owner,mail,now=Date.now()){
 const provider=accessCodeProvider(mail,now);if(!provider)return 0;const recipients=await codeRecipients(env,owner);if(!recipients.length)return 0;
 const source=String(mail.externalId||mail.messageId||'');if(!source)return 0;let count=0;
 const agent=await env.DB.prepare('SELECT name FROM adminAccounts WHERE lower(email)=?').bind(owner).first();
 for(const recipient of recipients){const result=await env.DB.prepare("INSERT OR IGNORE INTO assistantMailbox(assistantId,direction,externalId,fromEmail,toEmail,subject,body,sentAt) VALUES(?,'received',?,?,?,?,?,?)").bind(recipient.id,'access-code|'+owner+'|'+source,String(mail.fromEmail||mail.from?.value?.[0]?.address||mail.from?.text||''),recipient.address,'[Código de acesso · '+provider+' · '+(agent?.name||owner)+'] '+String(mail.subject||'').slice(0,250),'Agente: '+(agent?.name||owner)+'\nServiço: '+provider+'\nRecebido em: '+new Date(mail.sentAt||mail.date).toISOString()+'\n\n'+readableMailboxBody(mail),new Date(mail.sentAt||mail.date).toISOString()).run();
 if(Number(result.meta?.changes)>0){count++;await env.DB.prepare("INSERT INTO assistantAudit(assistantId,actor,owner,operation) VALUES(?,?,?,?)").bind(recipient.id,owner,owner,'verification_email_received_'+(provider==='Five Rings'?'five_rings':'national_life')).run();}}
 return count;
}
export async function pollAccessCodes(env,owner,services){
 if(!(await codeRecipients(env,owner)).length)return {delivered:0};
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS assistantCodePolls(owner TEXT PRIMARY KEY,checkedAt INTEGER NOT NULL)').run();const now=Date.now();
 const lease=await env.DB.prepare('INSERT INTO assistantCodePolls(owner,checkedAt) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET checkedAt=excluded.checkedAt WHERE assistantCodePolls.checkedAt<?').bind(owner,now,now-20000).run();if(!Number(lease.meta?.changes))return {delivered:0,waiting:true};
 let client,delivered=0;try{({client}=await services.open(env,owner));await client.command('C1','SELECT INBOX');const search=await client.command('C2','UID SEARCH SINCE '+services.imapDate(new Date(now-600000))+' (OR FROM "nationallife.com" (OR FROM "mga360.com" (OR FROM "fiveringsfinancial.com" FROM "fiverings.com")))');const uids=(search.text.match(/(?:^|\r\n)\* SEARCH([^\r\n]*)/i)?.[1]||'').trim().split(/\s+/).filter(x=>/^\d+$/.test(x)).slice(-20);let sequence=3;for(const uid of uids){const fetched=await client.command('C'+sequence++,'UID FETCH '+uid+' (BODY.PEEK[])'),raw=services.literal(fetched.bytes);if(!raw||raw.length>2000000)continue;const parsed=await services.parse(raw);delivered+=await relayAccessCode(env,owner,{...parsed,externalId:parsed.messageId||'icloud:'+owner+':'+uid},now);}return {delivered};}finally{if(client)await client.close();}
}
