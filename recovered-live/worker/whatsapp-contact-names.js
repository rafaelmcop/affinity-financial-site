export async function whatsappContacts(env,email,scopes){
 const own=email.toLowerCase(),crmOwners=[...new Set([own,...scopes?.crmOwners||[]])],leadOwners=[...new Set([own,...scopes?.leadOwners||[]])];
 const clients=(await env.DB.prepare('SELECT id,name,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail) IN ('+crmOwners.map(()=>'?').join(',')+') ORDER BY name COLLATE NOCASE').bind(...crmOwners).all()).results||[];
 let leads=[];try{leads=(await env.DB.prepare('SELECT DISTINCT l.name,l.phone FROM centralLeads l JOIN centralLeadAssignments a ON a.phone=l.phone WHERE lower(a.agent) IN ('+leadOwners.map(()=>'?').join(',')+') AND l.suppressed=0 ORDER BY l.name COLLATE NOCASE').bind(...leadOwners).all()).results||[];}catch(e){if(!/no such table/i.test(e.message))throw e;}
 return [...clients,...leads.filter(l=>String(l.name||'').trim()&&!/^[+\d\s().-]+$/.test(l.name))];
}
