// Confirmed breaches require a human scope/jurisdiction assessment. Do not turn service failures into breach notices.
const initialized=new WeakMap();
async function schema(env){
 if(initialized.has(env.DB))return initialized.get(env.DB);
 const pending=env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS securityIncidents(id TEXT PRIMARY KEY,summary TEXT NOT NULL,detailsEncrypted TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('suspected','confirmed','resolved')),actor TEXT NOT NULL,adminAlertAt TEXT,alertAttemptAt TEXT,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS securityIncidentEvents(id TEXT PRIMARY KEY,incidentId TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
 ]);initialized.set(env.DB,pending);try{await pending}catch(e){initialized.delete(env.DB);throw e}
}
export async function flushSecurityAlerts(env,send){
 await schema(env);
 const rows=(await env.DB.prepare("SELECT id FROM securityIncidents WHERE adminAlertAt IS NULL AND (alertAttemptAt IS NULL OR datetime(alertAttemptAt)<datetime('now','-5 minutes')) ORDER BY createdAt LIMIT 10").all()).results||[];
 for(const row of rows){
  // Atomic claim prevents overlapping cron/request workers from sending the same alert concurrently.
  const claim=await env.DB.prepare("UPDATE securityIncidents SET alertAttemptAt=CURRENT_TIMESTAMP WHERE id=? AND adminAlertAt IS NULL AND (alertAttemptAt IS NULL OR datetime(alertAttemptAt)<datetime('now','-5 minutes'))").bind(row.id).run();
  if(!claim.meta?.changes)continue;
  const result=await send({to:'us.rafael@icloud.com',subject:'URGENT · Affinity security incident requires review',html:'<p>A security incident has been recorded. Review its scope and notification obligations promptly.</p><p><a href="https://www.affinityfc.org/admin/privacidade-seguranca">Open the authenticated incident register</a></p><p>Reference: '+row.id+'</p><p>This alert intentionally contains no customer data.</p>'});
  if(result?.sent)await env.DB.prepare('UPDATE securityIncidents SET adminAlertAt=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run();
 }
}
export async function securityIncidentRoute(request,env,auth){
 const url=new URL(request.url),page=url.pathname==='/admin/privacidade-seguranca',api=url.pathname==='/api/admin/security-incidents';
 if(!page&&!api)return null;
 const identity=await auth.identity(request,env,'admin');
 if(!identity?.isAdmin)return page?Response.redirect(url.origin+'/admin/login',302):Response.json({error:'Acesso administrativo obrigatório.'},{status:403});
 if(page){if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});return env.ASSETS.fetch(new Request(new URL('/admin-privacy-security.html',url),{method:request.method}));}
 const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
 await schema(env);
 if(request.method==='GET'){
  const rows=(await env.DB.prepare('SELECT id,summary,detailsEncrypted,state,actor,adminAlertAt,createdAt,updatedAt FROM securityIncidents ORDER BY createdAt DESC LIMIT 100').all()).results||[];
  const incidents=[];for(const {detailsEncrypted,...row}of rows)incidents.push({...row,details:await auth.decrypt(detailsEncrypted)});
  const events=(await env.DB.prepare('SELECT incidentId,actor,action,createdAt FROM securityIncidentEvents ORDER BY createdAt DESC LIMIT 250').all()).results||[];
  return json({incidents,events});
 }
 if(request.method!=='POST')return json({error:'Use POST.'},405);
 if(request.headers.get('origin')!==url.origin||!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({error:'Origem inválida.'},403);
 let input;try{input=await auth.json(request,12000)}catch{return json({error:'Solicitação inválida.'},400)}
 if(input.action==='create'){
  if(!['suspected','confirmed'].includes(input.state)||typeof input.summary!=='string'||!input.summary.trim()||input.summary.length>200||typeof input.details!=='string'||!input.details.trim()||input.details.length>8000)return json({error:'Informe título, situação e escopo do incidente.'},400);
  const id=crypto.randomUUID();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO securityIncidents(id,summary,detailsEncrypted,state,actor) VALUES(?,?,?,?,?)').bind(id,input.summary.trim(),await auth.encrypt(input.details.trim()),input.state,identity.actor),
   env.DB.prepare('INSERT INTO securityIncidentEvents(id,incidentId,actor,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(),id,identity.actor,'created:'+input.state)
  ]);
  await flushSecurityAlerts(env,auth.send);
  return json({success:true,id});
 }
 if(input.action==='record'){
  if(!['authority_notified','affected_notified','scope_reviewed','resolved'].includes(input.event))return json({error:'Ação inválida.'},400);
  const row=await env.DB.prepare('SELECT id FROM securityIncidents WHERE id=?').bind(String(input.id||'')).first();
  if(!row)return json({error:'Incidente não encontrado.'},404);
  await env.DB.batch([
   env.DB.prepare('INSERT INTO securityIncidentEvents(id,incidentId,actor,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(),row.id,identity.actor,input.event),
   env.DB.prepare("UPDATE securityIncidents SET updatedAt=CURRENT_TIMESTAMP,state=CASE WHEN ?='resolved' THEN 'resolved' ELSE state END WHERE id=?").bind(input.event,row.id)
  ]);return json({success:true});
 }
 return json({error:'Ação inválida.'},400);
}
