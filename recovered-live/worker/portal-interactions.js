export const canonicalPhone=value=>{const n=String(value||'').replace(/@.*$/,'').replace(/\D/g,'');return n.length===10?'1'+n:n;};
export async function recordPortalInteraction(env,owner,input){
 const requestId=String(input.requestId||'');if(!/^[a-z0-9-]{20,80}$/i.test(requestId))throw Error('Identificador da interação inválido.');
 const channel=['whatsapp','call','sms','email'].includes(input.channel)?input.channel:'whatsapp';
 const phone=canonicalPhone(input.phone),text=String(input.text||'').slice(0,12000);let client=null;
 if(input.clientId)client=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(Number(input.clientId),owner).first();
 if(!client){const rows=(await env.DB.prepare('SELECT id,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=?').bind(owner).all()).results||[];const matches=rows.filter(c=>phone&&[c.phone,c.whatsapp].some(p=>canonicalPhone(p)===phone));if(matches.length===1)client=matches[0];}
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalContactInteractions(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,requestId TEXT NOT NULL,clientId INTEGER,phone TEXT,channel TEXT NOT NULL,body TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(owner,requestId))').run();
 await env.DB.prepare("INSERT OR IGNORE INTO portalContactInteractions(owner,requestId,clientId,phone,channel,body) VALUES(?,?,?,?,?,?)").bind(owner,requestId,client?.id||null,phone,channel,text).run();
 return {success:true,clientId:client?.id||null};
}
export async function interactionSchema(db){await db.prepare('CREATE TABLE IF NOT EXISTS portalContactInteractions(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,requestId TEXT NOT NULL,clientId INTEGER,phone TEXT,channel TEXT NOT NULL,body TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(owner,requestId))').run();}
