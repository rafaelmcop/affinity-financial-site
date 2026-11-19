import {boundedJson} from './security-boundary.js';
import {confirmAdmin} from './admin-confirmation.js';
const cookies=['affinity_admin_session','affinity_affiliate_session','affinity_assistant_session'];
const backup='affinity_audit_master';
async function schema(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS adminAuditAccess(id TEXT PRIMARY KEY,actor TEXT NOT NULL,target TEXT NOT NULL,kind TEXT NOT NULL,startedAt INTEGER NOT NULL,expiresAt INTEGER NOT NULL,endedAt INTEGER)').run();}
const recorded=new WeakSet();
export async function auditSessionValid(env,session,request){
 if(!session.auditAccess)return true;
 const row=await env.DB.prepare('SELECT actor,expiresAt,endedAt FROM adminAuditAccess WHERE id=?').bind(session.auditAccess).first();
 if(!row||row.endedAt||row.expiresAt<Date.now()||row.actor!==session.auditActor)return false;
 const actor=await env.DB.prepare("SELECT email,accountType,adminRole,status,isActive,portalDeletedAt FROM adminAccounts WHERE lower(email)=?").bind(row.actor).first();
 const valid=!!actor&&!actor.portalDeletedAt&&Number(actor.isActive)===1&&actor.status==='approved'&&['admin','both'].includes(actor.accountType)&&(actor.adminRole==='master'||actor.email.toLowerCase()===String(env.ADMIN_EMAIL).toLowerCase());
 if(valid&&request&&!recorded.has(request)){recorded.add(request);await env.DB.prepare('CREATE TABLE IF NOT EXISTS adminAuditRequests(id TEXT PRIMARY KEY,auditId TEXT NOT NULL,actor TEXT NOT NULL,method TEXT NOT NULL,path TEXT NOT NULL,createdAt INTEGER NOT NULL)').run();await env.DB.prepare('INSERT INTO adminAuditRequests VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.auditAccess,row.actor,request.method,new URL(request.url).pathname,Date.now()).run();}
 return valid;
}
async function closeAudit(env,restore){
 await env.DB.prepare('UPDATE adminAuditAccess SET endedAt=? WHERE actor=? AND id=? AND endedAt IS NULL').bind(Date.now(),String(restore.email).toLowerCase(),restore.auditRestore).run();
}
export async function endAuditOnLogout(request,response,env,session){
 if(request.method!=='POST'||!response.ok||!(request.headers.get('cookie')||'').includes(backup+'='))return response;
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)return response;
 if(!['/api/auth.logout','/api/assistants/logout'].includes(url.pathname)&&!(url.pathname.startsWith('/api/trpc/')&&url.pathname.slice('/api/trpc/'.length).split(',').includes('auth.logout')))return response;
 const restore=await session(request,env,backup);
 if(restore?.type!=='admin'||!restore.auditRestore)return response;
 await closeAudit(env,restore);
 const headers=new Headers(response.headers);
 for(const name of [...cookies,backup])headers.append('set-cookie',name+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export async function adminAuditAccess(request,env,auth){
 const url=new URL(request.url);if(url.pathname!=='/api/admin/audit-access')return null;
 const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
 if(request.method!=='GET'&&(request.method!=='POST'||request.headers.get('origin')!==url.origin||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')))return json({error:'Solicitação inválida.'},403);
 try{
  const input=request.method==='GET'?{}:await boundedJson(request,4096),restore=await auth.session(request,env,backup),normal=await auth.session(request,env,cookies[0]);
  const original=restore?.type==='admin'&&!restore.auditAccess?restore:normal;
  if(original?.type!=='admin'||original.auditAccess)return json({error:'Entre como Admin mestre.'},403);
  const actor=String(original.email).toLowerCase(),access=await auth.access(actor,env),account=access?.account;
  if(!access?.isMaster||!account?.isActive||account.status!=='approved'||!['admin','both'].includes(account.accountType))return json({error:'Acesso exclusivo do Admin mestre.'},403);
  await schema(env);
  if(request.method==='GET'){const rows=await env.DB.prepare('SELECT id,actor,target,kind,startedAt,expiresAt,endedAt FROM adminAuditAccess ORDER BY startedAt DESC LIMIT 100').all();return json({sessions:rows.results||[]});}
  const headers=new Headers({'content-type':'application/json','cache-control':'private, no-store'});
  const set=(name,value,age=3600)=>headers.append('set-cookie',name+'='+value+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite=Lax');
  if(input.action==='stop'){
   if(!restore)return json({error:'Nenhuma auditoria aberta.'},400);
   await closeAudit(env,restore);
   for(const name of cookies)set(name,'',0);set(cookies[0],await auth.createSession({type:'admin',email:actor},env,28800),28800);set(backup,'',0);
   return new Response(JSON.stringify({ok:true,url:'/admin/usuarios'}),{headers});
  }
  if(restore&&(normal?.type!=='admin'||normal.auditAccess||String(normal.email).toLowerCase()!==actor))return json({error:'Encerre a auditoria atual antes de abrir outra.'},409);
  await confirmAdmin(env,actor,input,auth.compare);
  const email=String(input.email||'').trim().toLowerCase(),kind=input.kind;
  let target,payload,destination,cookie;
  if(kind==='assistant'){target=await env.DB.prepare('SELECT id,email,sessionVersion FROM portalAssistants WHERE lower(email)=? AND active=1 AND deletedAt IS NULL').bind(email).first();if(target){payload={type:'assistant',id:Number(target.id),version:Number(target.sessionVersion)};cookie=cookies[2];destination='/assistentes/dashboard';}}
  else if(kind==='affiliate'){target=await env.DB.prepare("SELECT id,email FROM affiliates WHERE lower(email)=? AND isActive=1 AND status='approved' AND portalDeletedAt IS NULL").bind(email).first();if(target){payload={type:'affiliate',affiliateId:Number(target.id)};cookie=cookies[1];destination='/afiliados/dashboard';}}
  else if(['agent','admin'].includes(kind)){target=await env.DB.prepare("SELECT id,email,accountType FROM adminAccounts WHERE lower(email)=? AND isActive=1 AND status='approved' AND portalDeletedAt IS NULL").bind(email).first();if(target&&!((kind==='agent'?['agent','both']:['admin','both']).includes(target.accountType)))target=null;if(target){payload={type:'admin',email};cookie=cookies[0];destination=kind==='agent'?'/agentes/dashboard':'/admin/dashboard';}}
  if(!target||email===actor)return json({error:'Selecione outra conta ativa e um portal disponível para ela.'},400);
  if(restore)await closeAudit(env,restore);
  const id=crypto.randomUUID(),now=Date.now();await env.DB.prepare('INSERT INTO adminAuditAccess(id,actor,target,kind,startedAt,expiresAt) VALUES(?,?,?,?,?,?)').bind(id,actor,email,kind,now,now+3600000).run();
  for(const name of cookies)set(name,'',0);set(backup,await auth.createSession({type:'admin',email:actor,auditRestore:id},env,3600));set(cookie,await auth.createSession({...payload,auditAccess:id,auditActor:actor},env,3600));
  return new Response(JSON.stringify({ok:true,url:destination}),{headers});
 }catch(e){return json({error:e.message||'Não foi possível abrir a auditoria.'},400);}
}
