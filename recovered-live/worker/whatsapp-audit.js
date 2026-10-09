import {contactBridge} from './affiliate-whatsapp.js';
export async function auditSchema(db){await db.batch([db.prepare("CREATE TABLE IF NOT EXISTS whatsappAuditCursors(owner TEXT PRIMARY KEY,cursor INTEGER DEFAULT 0,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)"),db.prepare("CREATE TABLE IF NOT EXISTS whatsappClientAudit(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,messageId TEXT NOT NULL,clientId INTEGER NOT NULL,phone TEXT NOT NULL,direction TEXT NOT NULL,body TEXT NOT NULL,sentAt TEXT NOT NULL,mediaKind TEXT,filename TEXT,mediaState TEXT,recordedAt TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(owner,messageId))"),db.prepare("CREATE INDEX IF NOT EXISTS whatsappAuditClient ON whatsappClientAudit(clientId,sentAt)")]);}
const phone=value=>String(value||'').replace(/@.*$/,'').replace(/\D/g,'');
export function matchedClient(clients,value){const number=phone(value);if(number.length<8)return null;const matches=clients.filter(client=>[client.phone,client.whatsapp].some(value=>phone(value)===number));return matches.length===1?matches[0]:null;}
export async function syncWhatsappAudit(env,owner){
 if(!env.WHATSAPP_BRIDGE_URL||!env.WHATSAPP_BRIDGE_SECRET)return {imported:0};
 owner=owner.toLowerCase();await auditSchema(env.DB);
 const state=await env.DB.prepare('SELECT cursor FROM whatsappAuditCursors WHERE owner=?').bind(owner).first();
 const response=await contactBridge(env,owner,'audit?cursor='+Number(state?.cursor||0));
 if(!response.ok)throw Error('WhatsApp audit unavailable');
 const data=await response.json();if(!Array.isArray(data.messages))throw Error('Invalid audit response');
 const clients=(await env.DB.prepare('SELECT id,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=?').bind(owner).all()).results||[];
 const statements=[];
 for(const message of data.messages){const client=matchedClient(clients,message.phone);if(!client||!message.id||!['sent','received'].includes(message.direction))continue;const stamp=Number(message.stamp);if(!Number.isFinite(stamp)||stamp<=0)continue;
 statements.push(env.DB.prepare('INSERT OR IGNORE INTO whatsappClientAudit(owner,messageId,clientId,phone,direction,body,sentAt,mediaKind,filename,mediaState) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(owner,String(message.id),Number(client.id),phone(message.phone),message.direction,String(message.body||'').slice(0,12000),new Date(stamp*1000).toISOString(),message.mediaKind||null,message.filename||null,message.mediaState||null));}
 for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));
 await env.DB.prepare('INSERT INTO whatsappAuditCursors(owner,cursor) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET cursor=max(cursor,excluded.cursor),updatedAt=CURRENT_TIMESTAMP').bind(owner,Number(data.cursor||state?.cursor||0)).run();
 return {processed:statements.length,more:!!data.more};
}
export async function syncAllWhatsappAudit(env){
 await auditSchema(env.DB);
 const owners=await env.DB.prepare("SELECT DISTINCT lower(a.email) AS owner FROM adminAccounts a JOIN crmClients c ON lower(c.assignedAdminEmail)=lower(a.email) WHERE a.isActive=1 ORDER BY coalesce((SELECT updatedAt FROM whatsappAuditCursors w WHERE w.owner=lower(a.email)),'1970-01-01') LIMIT 20").all();
 for(const {owner} of owners.results||[])try{await syncWhatsappAudit(env,owner);}catch{console.error('whatsapp_audit_sync_failed');}
}
