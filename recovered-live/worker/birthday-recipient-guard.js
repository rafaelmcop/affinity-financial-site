import {samePersonName,personBirthDate} from './person-identity.js';
export function birthdayRecipientConflict(rows,day){const people=rows.filter(row=>personBirthDate(row.birthDate)?.slice(5)===day.slice(5));return people.some((row,index)=>people.slice(index+1).some(other=>!samePersonName(row.name,other.name)));}
// One birthday email per owner, normalized destination and New York day.
// A claimed/uncertain transport is never repeated automatically.
export async function claimBirthdayRecipient(env,owner,email,day,clientId){
 owner=String(owner).trim().toLowerCase();email=String(email).trim().toLowerCase();
 if(!email||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 await birthdayRecipientSchema(env);
 const people=(await env.DB.prepare('SELECT name,birthDate FROM crmClients WHERE lower(assignedAdminEmail)=? AND lower(trim(email))=?').bind(owner,email).all()).results||[];
 if(birthdayRecipientConflict(people,day))return false;
 // Include receipts predating this guard, including other automation templates.
 const prior=await env.DB.prepare(`SELECT 1 FROM automationDeliveries d JOIN scheduledMessages m ON m.id=d.messageId JOIN crmClients c ON c.id=d.clientId WHERE lower(m.agentEmail)=? AND m.occasion='birthday' AND lower(trim(c.email))=? AND d.sentKey=? AND (substr(c.birthDate,6,5)=? OR substr(trim(c.birthDate),1,5)=?) LIMIT 1`).bind(owner,email,'birthday-'+day.slice(0,4),day.slice(5),day.slice(5).replace('-','/')).first();
 if(prior)return false;
 const result=await env.DB.prepare(`INSERT OR IGNORE INTO birthdayRecipientDispatches(owner,recipient,day,clientId) VALUES (?,?,?,?)`).bind(owner,email,day,clientId).run();
 return Number(result.meta?.changes||0)===1;
}
export async function settleBirthdayRecipient(env,owner,email,day,state){
 await env.DB.prepare('UPDATE birthdayRecipientDispatches SET state=?,updatedAt=CURRENT_TIMESTAMP WHERE owner=? AND recipient=? AND day=?').bind(state,owner.toLowerCase(),email.trim().toLowerCase(),day).run();
}

const ready=new WeakSet();
export async function birthdayRecipientSchema(env){if(ready.has(env.DB))return;await env.DB.prepare(`CREATE TABLE IF NOT EXISTS birthdayRecipientDispatches(owner TEXT NOT NULL,recipient TEXT NOT NULL,day TEXT NOT NULL,clientId INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'claimed',updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,recipient,day))`).run();ready.add(env.DB);}
export async function birthdayRecipientStatus(env,owner,email,day){await birthdayRecipientSchema(env);return env.DB.prepare('SELECT state,updatedAt AS sentAt FROM birthdayRecipientDispatches WHERE owner=? AND recipient=? AND day=?').bind(owner.toLowerCase(),String(email||'').trim().toLowerCase(),day).first();}
