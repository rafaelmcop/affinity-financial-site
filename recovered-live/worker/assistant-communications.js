import {discussionRecipients,readDiscussion} from './assistant-discussions.js';
import {assistantSignature,appendAssistantSignature} from './assistant-signature.js';
import {hasAssistantAction} from './assistant-permissions.js';
import {renderAssistantWhatsAppPage} from './assistant-whatsapp-page.js';
import {notificationResolution,recentNotificationActions} from './notification-actions.js';
import {codeRecipients} from './assistant-access-codes.js';
import {corporateEmailSchema,corporateMessage} from './corporate-email.js';
import {boundedJson} from './security-boundary.js';
const DOMAIN='team.affinityfc.org',ZONE='571fbc6e04919396d68b456b38ebead6',ACCOUNT='d00b4fce2ba60918d8859e92dd98cf9e';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
export function assistantAlias(name){const parts=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)||[];if(!parts.length)throw Error('Informe o nome completo.');return (parts.length>1?parts[0]+'.'+parts.at(-1):parts[0]).slice(0,55);}
export async function communicationsSchema(env){await corporateEmailSchema(env);await env.DB.batch([
 env.DB.prepare("CREATE TABLE IF NOT EXISTS assistantCommunications(assistantId INTEGER PRIMARY KEY,address TEXT NOT NULL UNIQUE,state TEXT NOT NULL DEFAULT 'pending',error TEXT,forwardVerified INTEGER NOT NULL DEFAULT 0,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
 env.DB.prepare("CREATE TABLE IF NOT EXISTS assistantMailbox(id INTEGER PRIMARY KEY AUTOINCREMENT,assistantId INTEGER NOT NULL,direction TEXT NOT NULL,externalId TEXT NOT NULL,fromEmail TEXT NOT NULL,toEmail TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,sentAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(assistantId,direction,externalId))")]);}
export async function provisionAssistantEmail(env,assistant,auth){
 await communicationsSchema(env);let saved=await env.DB.prepare('SELECT * FROM assistantCommunications WHERE assistantId=?').bind(assistant.id).first();
 if(saved?.state==='ready'&&!(assistant.email.endsWith('@'+DOMAIN)&&saved.address!==assistant.email))return saved;
 try{
 const stored=await env.DB.prepare('SELECT encryptedToken FROM domainEmailIntegration WHERE id=1').first();const token=env.CLOUDFLARE_EMAIL_ROUTING_TOKEN||(stored&&await auth.decrypt(stored.encryptedToken,env.JWT_SECRET));if(!token)throw Error('O Admin precisa conectar a Cloudflare.');
 const call=async(path,body,method)=>{const response=await (auth.fetch||fetch)('https://api.cloudflare.com/client/v4/'+path,{method:method||(body?'POST':'GET'),headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok||!result.success)throw Error('A configuração do e-mail aguarda a Cloudflare (HTTP '+response.status+').');return result;};
 const all=async path=>{const rows=[];for(let page=1;page<=100;page++){const result=await call(path+'?per_page=100&page='+page);rows.push(...result.result);if(page>=Number(result.result_info?.total_pages||1))return rows;}throw Error('Não foi possível conferir os endereços existentes.');};
 const rules=await all('zones/'+ZONE+'/email/routing/rules');
 const accountRule=assistant.email.endsWith('@'+DOMAIN)?rules.find(r=>r.matchers?.length===1&&r.matchers[0].type==='literal'&&r.matchers[0].field==='to'&&String(r.matchers[0].value).toLowerCase()===assistant.email):null;
 const canAdopt=accountRule&&accountRule.actions?.length===1&&accountRule.actions[0].type==='forward'&&accountRule.actions[0].value?.length===1;
 if(canAdopt){const assigned=await env.DB.prepare('SELECT assistantId FROM assistantCommunications WHERE address=? AND assistantId<>?').bind(assistant.email,assistant.id).first();if(assigned)throw Error('Este endereço já pertence a outra assistente.');if(!saved){await env.DB.prepare('INSERT INTO assistantCommunications(assistantId,address) VALUES(?,?)').bind(assistant.id,assistant.email).run();saved={assistantId:assistant.id,address:assistant.email};}}
 const oldAddress=saved?.address;const desiredAddress=canAdopt?assistant.email:saved?.address;
 if(!saved){const base=assistantAlias(assistant.name);for(let n=1;n<=100;n++){const address=base+(n===1?'':n)+'@'+DOMAIN;if(rules.some(r=>r.matchers?.some(m=>String(m.value).toLowerCase()===address))||await env.DB.prepare('SELECT 1 FROM domainEmailSenders WHERE address=?').bind(address).first())continue;try{await env.DB.prepare('INSERT INTO assistantCommunications(assistantId,address) VALUES(?,?)').bind(assistant.id,address).run();saved=await env.DB.prepare('SELECT * FROM assistantCommunications WHERE assistantId=?').bind(assistant.id).first();break;}catch(error){saved=await env.DB.prepare('SELECT * FROM assistantCommunications WHERE assistantId=?').bind(assistant.id).first();if(saved)break;if(!/UNIQUE/i.test(String(error.message)))throw error;}}if(!saved)throw Error('O Admin precisa definir um endereço disponível.');}
 if(canAdopt)saved={...saved,address:desiredAddress};
 const existing=rules.find(r=>r.matchers?.some(m=>String(m.value).toLowerCase()===saved.address));
 if(existing&&!canAdopt&&!(existing.actions?.length===1&&existing.actions[0].type==='worker'&&existing.actions[0].value?.[0]==='affinity-financial-staging'&&existing.name==='Affinity assistant '+assistant.id))throw Error('Endereço já utilizado. O Admin precisa revisar o cadastro.');
 const adopted=canAdopt?(await call('zones/'+ZONE+'/email/routing/rules/'+(accountRule.id||accountRule.tag),{name:'Affinity assistant '+assistant.id,enabled:true,matchers:accountRule.matchers,actions:[{type:'worker',value:['affinity-financial-staging']}]},'PUT')).result:null;
 const rule=adopted||existing||(await call('zones/'+ZONE+'/email/routing/rules',{name:'Affinity assistant '+assistant.id,enabled:true,matchers:[{type:'literal',field:'to',value:saved.address}],actions:[{type:'worker',value:['affinity-financial-staging']}]})).result;
 if(!rule.enabled)throw Error('A regra corporativa foi desativada pelo Admin.');
 const destinations=await all('accounts/'+ACCOUNT+'/email/routing/addresses');const destination=canAdopt?String(accountRule.actions[0].value[0]).toLowerCase():assistant.email;const forwardVerified=!destination.endsWith('@'+DOMAIN)&&destinations.some(row=>String(row.email).toLowerCase()===destination&&!!row.verified)?1:0;
 await env.DB.prepare('INSERT INTO domainEmailSenders(owner,address,displayName,ruleId,destination,updatedBy) VALUES(?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET address=excluded.address,displayName=excluded.displayName,ruleId=excluded.ruleId,destination=excluded.destination,enabled=1,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(assistant.email,saved.address,assistant.name,rule.id||rule.tag,destination,'assistant-setup').run();
 await env.DB.prepare("UPDATE assistantCommunications SET address=?,state='ready',error=NULL,forwardVerified=?,updatedAt=CURRENT_TIMESTAMP WHERE assistantId=?").bind(saved.address,forwardVerified,assistant.id).run();if(oldAddress&&oldAddress!==saved.address){const old=rules.find(r=>r.name==='Affinity assistant '+assistant.id&&r.matchers?.some(m=>m.value===oldAddress));if(old)await call('zones/'+ZONE+'/email/routing/rules/'+(old.id||old.tag),{name:old.name,enabled:false,matchers:old.matchers,actions:old.actions},'PUT');}return {...saved,state:'ready',error:null,forwardVerified};
 }catch(error){const message=String(error.message||'Não foi possível preparar o e-mail.').slice(0,250);if(saved)await env.DB.prepare("UPDATE assistantCommunications SET state='pending',error=?,updatedAt=CURRENT_TIMESTAMP WHERE assistantId=?").bind(message,assistant.id).run();return {...saved,state:'pending',error:message};}
}
export async function receiveAssistantEmail(message,env,parse){
 await communicationsSchema(env);const target=await env.DB.prepare("SELECT a.id,s.destination AS email,c.forwardVerified FROM portalAssistants a JOIN assistantCommunications c ON c.assistantId=a.id LEFT JOIN domainEmailSenders s ON s.owner=a.email AND s.address=c.address WHERE c.address=? AND c.state='ready' AND a.active=1 AND a.deletedAt IS NULL").bind(String(message.to).toLowerCase()).first();
 if(!target){message.setReject('Unknown or inactive corporate mailbox');return;}
 // Forward the original, including attachments, only to its verified owner.
 if(target.forwardVerified&&target.email&&!target.email.endsWith('@'+DOMAIN))await message.forward(target.email);
 if(message.rawSize>10*1024*1024){if(!target.forwardVerified)message.setReject('Message exceeds mailbox size limit');return;}
 const raw=await new Response(message.raw).arrayBuffer(),mail=await parse(raw),externalId='incoming|'+(mail.messageId||message.headers.get('message-id')||await crypto.subtle.digest('SHA-256',raw).then(bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')));
 const body=String(mail.text||'Esta mensagem contém apenas conteúdo HTML. Consulte o remetente para obter uma versão em texto.').slice(0,100000);
 await env.DB.prepare("INSERT OR IGNORE INTO assistantMailbox(assistantId,direction,externalId,fromEmail,toEmail,subject,body) VALUES(?,'received',?,?,?,?,?)").bind(target.id,externalId,String(message.from),String(message.to),String(mail.subject||'(Sem assunto)').slice(0,500),body).run();
}
export async function assistantCommunicationsRoute(request,env,assistant,auth){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/assistentes/whatsapp'){
  let theme='light';try{theme=(await auth.appearance?.(assistant.owner))?.theme||'light';}catch{}
  return new Response(renderAssistantWhatsAppPage(theme),{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-affinity-assistant-view':'1'}});
 }
 if(path.startsWith('/api/assistants/communications/whatsapp/')){
  const target=new URL('/api/agent/whatsapp/'+path.split('/').at(-1),url);target.search=url.search;
  let outgoing=new Request(target,request);if(path.endsWith('/send')&&request.method==='POST'){const input=await boundedJson(request,11500000);if(input.includeSignature!==false){const signature=await assistantSignature(env,assistant);input.text=appendAssistantSignature(input.text,signature.text);}outgoing=new Request(target,{method:'POST',headers:request.headers,body:JSON.stringify(input)});}
  return auth.whatsapp(outgoing,env,{email:async()=>assistant.email,access:async()=>({account:{isActive:1,status:'approved',accountType:'agent'}}),contactScopes:{crmOwners:hasAssistantAction(assistant.permissions,'policies','view')?[assistant.owner]:[],leadOwners:hasAssistantAction(assistant.permissions,['queue','whatsapp_leads'],'view')?[assistant.owner]:[]}});
 }
 if(path==='/assistentes/email'){const response=await env.ASSETS.fetch(new Request(new URL('/assistant-email.html',url),request));const headers=new Headers(response.headers);headers.set('x-affinity-assistant-view','1');return new Response(response.body,{status:response.status,headers});}
 if(!path.startsWith('/api/assistants/communications/'))return null;
 await communicationsSchema(env);
 if((path.endsWith('/sync-access-codes')||path.endsWith('/sync-portal-notices'))&&request.method==='POST'){if(!assistant.permissions?.portal_codes?.includes('view')&&!assistant.permissions?.policies?.includes('view')&&!assistant.permissions?.five_rings?.includes('view'))return json({error:'O agente precisa liberar o acesso às notificações do portal.'},403);try{return json(await auth.pollAccessCodes(env,assistant.owner));}catch{return json({error:'Não foi possível consultar os códigos agora. Tente atualizar novamente.'},503);}}
 if(path.endsWith('/read-discussion')&&request.method==='POST'){try{return json(await readDiscussion(env,assistant,Number((await boundedJson(request,4096)).messageId)));}catch(e){return json({error:e.message},e.status||400);}}
 if(path.endsWith('/setup')&&request.method==='POST')return json(await provisionAssistantEmail(env,assistant,auth));
 const config=await env.DB.prepare('SELECT address,state,error FROM assistantCommunications WHERE assistantId=?').bind(assistant.id).first();
 if(path.endsWith('/mailbox')&&request.method==='GET'){const rows=(await env.DB.prepare('SELECT id,direction,externalId,fromEmail,toEmail,subject,body,sentAt FROM assistantMailbox WHERE assistantId=? ORDER BY id DESC LIMIT 200').bind(assistant.id).all()).results;const granted=new Set();for(const link of assistant.links||[]){const recipients=await codeRecipients(env,link.owner);if(recipients.some(r=>Number(r.id)===Number(assistant.id)))granted.add(link.owner);}const discussionOwners=new Set();for(const link of assistant.links||[])if((await discussionRecipients(env,link.owner)).some(r=>Number(r.id)===Number(assistant.id)))discussionOwners.add(link.owner);const messages=[];for(const row of rows){const accessCode=row.externalId.startsWith('access-code|'),discussion=row.externalId.startsWith('discussion|'),owner=row.externalId.split('|')[1];if(discussion&&!discussionOwners.has(owner))continue;if(accessCode&&(!granted.has(owner)||Date.now()-Date.parse(row.sentAt+(/[zZ]|[+-]\d\d:\d\d$/.test(row.sentAt)?'':'Z'))>=600000||await notificationResolution(env,owner,'code',row.externalId)))continue;const permissions=assistant.links?.find(link=>link.owner===owner)?.permissions?.portal_codes||[];messages.push({...row,accessCode,discussion,canComplete:permissions.includes('edit'),canDelete:permissions.includes('delete')});}const resolutions=granted.has(assistant.owner)?(await recentNotificationActions(env,assistant.owner)).filter(row=>row.kind==='code'):[];return json({config,messages,resolutions,canRestoreCodes:assistant.permissions?.portal_codes?.includes('delete'),canSyncCodes:granted.has(assistant.owner),canSyncPortalMessages:discussionOwners.has(assistant.owner)});}
 if(path.endsWith('/send')&&request.method==='POST'){
  if(config?.state!=='ready')return json({error:'O e-mail corporativo ainda está sendo preparado.'},409);
  const input=await boundedJson(request,100000),to=String(input.to||'').trim().toLowerCase(),subject=String(input.subject||'').trim();let body=String(input.body||'').trim();
  if(input.confirmed!==true||!auth.validEmail(to)||/[\r\n]/.test(to)||!subject||subject.length>500||!body||body.length>50000)return json({error:'Revise o destinatário, assunto e mensagem e confirme o envio.'},400);
  body=appendAssistantSignature(body,(await assistantSignature(env,assistant)).text);
  const sender=await env.DB.prepare('SELECT address,displayName FROM domainEmailSenders WHERE owner=? AND enabled=1 AND address=?').bind(assistant.email,config.address).first();if(!sender||!env.CORPORATE_EMAIL?.send)return json({error:'Envio corporativo indisponível. Avise o Admin.'},503);
  const result=await env.CORPORATE_EMAIL.send(corporateMessage(sender,{to,subject,text:body}));if(!result?.messageId)return json({error:'O serviço não confirmou o envio. Confira o histórico antes de tentar novamente.'},502);
  await env.DB.prepare("INSERT INTO assistantMailbox(assistantId,direction,externalId,fromEmail,toEmail,subject,body) VALUES(?,'sent',?,?,?,?,?)").bind(assistant.id,result.messageId,sender.address,to,subject,body).run();return json({ok:true});
 }
 return json({error:'Ação inválida.'},405);
}
