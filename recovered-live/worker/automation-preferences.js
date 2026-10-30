const encode=value=>btoa(String.fromCharCode(...new TextEncoder().encode(value))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const automationScope=m=>m.occasion==='monthly'?'monthly:'+m.monthNumber:m.occasion==='custom'?'custom:'+m.id:m.occasion;
async function key(secret){return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function preferenceToken(secret,data){
 const payload=encode(JSON.stringify({...data,exp:Math.floor(Date.now()/1000)+365*86400}));
 const signature=await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(payload));
 return payload+'.'+btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export async function verifyPreferenceToken(secret,token){
 const [payload,signature,extra]=String(token).split('.');
 if(!payload||!signature||extra||token.length>2000||!await crypto.subtle.verify('HMAC',await key(secret),decode(signature),new TextEncoder().encode(payload)))throw Error('Link inválido');
 const data=JSON.parse(new TextDecoder().decode(decode(payload)));
 if(!Number.isFinite(data.exp)||data.exp<Math.floor(Date.now()/1000)||!Number.isSafeInteger(data.clientId)||!data.owner||!data.email||!/^[a-z_]+(?::\d+)?$/.test(data.scope))throw Error('Link expirado');
 return data;
}
export async function ensurePreferences(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS crmAutomationSubscriptions (agentEmail TEXT NOT NULL,clientId INTEGER NOT NULL,occasion TEXT NOT NULL,isActive INTEGER NOT NULL DEFAULT 1,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,requestedBy TEXT NOT NULL DEFAULT \'agent\',PRIMARY KEY(agentEmail,clientId,occasion))').run();
 try{await db.prepare('SELECT requestedBy FROM crmAutomationSubscriptions LIMIT 0').all();}catch(e){if(!String(e).includes('no such column'))throw e;try{await db.prepare("ALTER TABLE crmAutomationSubscriptions ADD COLUMN requestedBy TEXT NOT NULL DEFAULT 'agent'").run();}catch(other){if(!String(other).includes('duplicate column'))throw other;}}
}
export async function automationFooter(env,automation,client,html){
 const token=await preferenceToken(env.JWT_SECRET,{owner:String(automation.agentEmail).toLowerCase(),clientId:Number(client.id||client.clientId),email:String(client.email).toLowerCase(),scope:automationScope(automation),label:String(automation.title||'esta programação').slice(0,180)});
 const url=new URL('/email/preferences',env.VITE_FRONTEND_URL||'https://www.affinityfc.org');url.searchParams.set('token',token);
 return html+`<p style="font:12px Arial;color:#666;text-align:center;padding:16px">Para deixar de receber apenas esta programação, <a href="${escape(url.href)}">clique aqui</a>. As outras mensagens permanecem ativas.</p>`;
}
export async function preferenceRoute(request,env){
 const url=new URL(request.url);if(url.pathname!=='/email/preferences')return null;
 const page=(text,status=200)=>new Response(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>Preferências de mensagens</title><body style="font:18px Arial;max-width:580px;margin:70px auto;padding:24px"><h1>Preferências de mensagens</h1>${text}</body></html>`,{status,headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
 if(!['GET','POST'].includes(request.method))return page('Método não permitido.',405);
 try{
  const token=url.searchParams.get('token')||'',data=await verifyPreferenceToken(env.JWT_SECRET,token);
  const client=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=? AND lower(email)=?').bind(data.clientId,data.owner,data.email).first();
  if(!client)return page('Este link não corresponde mais ao cadastro. Entre em contato com seu agente.',400);
  if(request.method==='GET')return page(`<p>Deseja parar de receber <strong>${escape(data.label)}</strong>?</p><p>Isso não cancela as outras programações.</p><form method="post"><button style="padding:14px">Cancelar esta programação</button></form>`);
  await ensurePreferences(env.DB);
  const previous=await env.DB.prepare('SELECT isActive FROM crmAutomationSubscriptions WHERE agentEmail=? AND clientId=? AND occasion=?').bind(data.owner,data.clientId,data.scope).first();
  if(previous && Number(previous.isActive)===0)return page('<p>Esta programação já está cancelada para você.</p>');
  await env.DB.batch([
   env.DB.prepare("INSERT INTO crmAutomationSubscriptions(agentEmail,clientId,occasion,isActive,updatedAt,requestedBy) VALUES(?,?,?,0,CURRENT_TIMESTAMP,'client') ON CONFLICT(agentEmail,clientId,occasion) DO UPDATE SET isActive=0,updatedAt=CURRENT_TIMESTAMP,requestedBy='client'").bind(data.owner,data.clientId,data.scope),
   env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'note',?,?)").bind(data.clientId,'Cliente solicitou o cancelamento da programação: '+data.label,data.owner)
  ]);
  return page('<p>Pronto. Você deixou de receber esta programação. Suas outras preferências foram mantidas.</p>');
 }catch{return page('Não foi possível usar este link. Solicite ajuda ao seu agente.',400);}
}
