export const legalVersion = '2026-11-23.1';
export const legalDocuments = {"terms": "29d960f54dfb03e74e8d88e6415082bf363c5f1e55b012ed374d4019138a5ad0", "privacy": "d30370de035e57b721ffb644a04288fc13152475e383eb614313742ab07bd643"};
export const legalCookie = 'affinity_legal_consent';
// Preserve the exact archived document bytes: shared HTML enhancements/nonces would change the fingerprint.
export function legalDocumentResponse(asset) {
 const response=new Response(asset.body,asset);
 response.headers.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Cache-Control','no-store, no-transform');
 return response;
}
const initialized = new WeakMap();
export async function privacySchema(env) {
 if (initialized.has(env.DB)) return initialized.get(env.DB);
 const pending = env.DB.batch([
  env.DB.prepare('CREATE TABLE IF NOT EXISTS legalConsentEvents(id TEXT PRIMARY KEY,actor TEXT,purpose TEXT NOT NULL,version TEXT NOT NULL,termsHash TEXT NOT NULL,privacyHash TEXT NOT NULL,accepted INTEGER NOT NULL,media INTEGER NOT NULL DEFAULT 0,ipHash TEXT,browser TEXT,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS userPrivacyChoices(actor TEXT PRIMARY KEY,aiProcessing INTEGER NOT NULL DEFAULT 0,aiMemory INTEGER NOT NULL DEFAULT 0,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS legalConsentEvents_ip_time ON legalConsentEvents(ipHash,createdAt)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS legalConsentEvents_actor ON legalConsentEvents(actor,accepted,createdAt)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS privacyChoiceEvents(id TEXT PRIMARY KEY,actor TEXT NOT NULL,aiProcessing INTEGER NOT NULL,aiMemory INTEGER NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')
 ]);
 initialized.set(env.DB,pending);
 try { await pending; } catch(error) { initialized.delete(env.DB); throw error; }
}
export async function privacyChoices(env, actor) {
 if (!actor) return {aiProcessing:false,aiMemory:false};
 await privacySchema(env);
 const row=await env.DB.prepare('SELECT aiProcessing,aiMemory FROM userPrivacyChoices WHERE actor=?').bind(actor.toLowerCase()).first();
 return {aiProcessing:row?.aiProcessing===1,aiMemory:row?.aiMemory===1};
}
async function hashIp(request, secret) {
 const ip=request.headers.get('cf-connecting-ip');
 if (!ip) return null;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('legal-ip:'+ip));
 return Array.from(new Uint8Array(signed),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function currentLegalReceipt(request,env,auth,actor) {
 // Account acceptance is durable. Browser expiry, logout, hosts and later document revisions do not reset it.
 if(actor){
  await privacySchema(env);
  const row=await env.DB.prepare('SELECT id,version,termsHash,privacyHash,media,createdAt FROM legalConsentEvents WHERE actor=? AND accepted=1 ORDER BY createdAt DESC,id DESC LIMIT 1').bind(String(actor).trim().toLowerCase()).first();
  return row?{type:'legal',actor:String(actor).trim().toLowerCase(),receiptId:row.id,version:row.version,termsHash:row.termsHash,privacyHash:row.privacyHash,media:Number(row.media)===1,acceptedAt:row.createdAt}:null;
 }
 // Anonymous forms still require a valid receipt for this browser; never inherit another account's agreement.
 const receipt=await auth.session(request,env,legalCookie);
 return receipt?.type==='legal'&&!receipt.actor&&receipt.version===legalVersion&&receipt.termsHash===legalDocuments.terms&&receipt.privacyHash===legalDocuments.privacy?receipt:null;
}
export async function recordRegistrationConsent(request,env,auth,email){
 const receipt=await currentLegalReceipt(request,env,auth,null);
 if(!receipt?.receiptId)return;
 await privacySchema(env);
 // Only called after successful creation of a new account, never on an arbitrary email supplied to the consent API.
 const recorded=await env.DB.prepare("INSERT INTO legalConsentEvents(id,actor,purpose,version,termsHash,privacyHash,accepted,media,ipHash,browser,createdAt) SELECT ?,?,'account',version,termsHash,privacyHash,1,media,ipHash,browser,createdAt FROM legalConsentEvents WHERE id=? AND actor IS NULL AND accepted=1 AND NOT EXISTS(SELECT 1 FROM legalConsentEvents WHERE actor=? AND accepted=1)")
  .bind(crypto.randomUUID(),email.toLowerCase(),receipt.receiptId,email.toLowerCase()).run();
 if(recorded.meta?.changes&&typeof receipt.aiProcessing==='boolean'){const actor=email.toLowerCase(),processing=receipt.aiProcessing===true,memory=processing&&receipt.aiMemory===true;await env.DB.batch([env.DB.prepare('INSERT INTO userPrivacyChoices(actor,aiProcessing,aiMemory) VALUES(?,?,?) ON CONFLICT(actor) DO NOTHING').bind(actor,Number(processing),Number(memory)),env.DB.prepare('INSERT INTO privacyChoiceEvents(id,actor,aiProcessing,aiMemory) VALUES(?,?,?,?)').bind(crypto.randomUUID(),actor,Number(processing),Number(memory))]);}
}
export async function legalRoute(request, env, auth) {
 const url=new URL(request.url);
 if(!['/api/legal/status','/api/legal/accept','/api/legal/choices','/api/admin/legal-consents'].includes(url.pathname))return null;
 const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'cache-control':'private, no-store',...headers}});
 const kind=url.pathname.startsWith('/api/admin/')?'admin':url.searchParams.get('kind')||'public';
 if(!['public','agent','admin','affiliate','assistant'].includes(kind))return json({error:'Contexto inválido.'},400);
 const identity=await auth.identity(request,env,kind);
 if(url.pathname==='/api/admin/legal-consents'){
  if(!identity?.isAdmin)return json({error:'Acesso administrativo obrigatório.'},403);
  if(request.method!=='GET')return json({error:'Método inválido.'},405);
  await privacySchema(env);
  const events=(await env.DB.prepare('SELECT id,actor,purpose,version,termsHash,privacyHash,accepted,media,createdAt FROM legalConsentEvents ORDER BY createdAt DESC LIMIT 250').all()).results||[];
  return json({events,version:legalVersion});
 }
 const actor=identity?.actor||null;
 if(request.method==='GET'&&url.pathname==='/api/legal/status'){
  const receipt=await currentLegalReceipt(request,env,auth,actor);
  return json({accepted:Boolean(receipt),version:legalVersion,documents:legalDocuments,acceptedAt:receipt?.acceptedAt||null,acceptedVersion:receipt?.version||null,authenticated:Boolean(actor),actorKind:identity?.kind||'public',media:receipt?.media===true,choices:await privacyChoices(env,actor)});
 }
 if(request.method!=='POST')return json({error:'Método inválido.'},405);
 if(request.headers.get('origin')!==url.origin||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({error:'Origem inválida.'},403);
 let input;try{input=await auth.json(request,4096);}catch{return json({error:'Solicitação inválida.'},400);}
 if(url.pathname==='/api/legal/choices'){
  if(!actor)return json({error:'Entre na sua conta.'},401);
  if(typeof input.aiProcessing!=='boolean'||typeof input.aiMemory!=='boolean')return json({error:'Escolhas inválidas.'},400);
  await privacySchema(env);
  const memory=input.aiProcessing&&input.aiMemory;
  await env.DB.batch([
   env.DB.prepare('INSERT INTO userPrivacyChoices(actor,aiProcessing,aiMemory) VALUES(?,?,?) ON CONFLICT(actor) DO UPDATE SET aiProcessing=excluded.aiProcessing,aiMemory=excluded.aiMemory,updatedAt=CURRENT_TIMESTAMP').bind(actor,Number(input.aiProcessing),Number(memory)),
   env.DB.prepare('INSERT INTO privacyChoiceEvents(id,actor,aiProcessing,aiMemory) VALUES(?,?,?,?)').bind(crypto.randomUUID(),actor,Number(input.aiProcessing),Number(memory))
  ]);
  return json({success:true,choices:{aiProcessing:input.aiProcessing,aiMemory:memory}});
 }
 if(input.accepted!==true||input.version!==legalVersion)return json({error:'Leia e aceite a versão atual dos termos e da política.'},400);
 await privacySchema(env);
 const id=crypto.randomUUID(),media=input.media===true,ipHash=await hashIp(request,env.JWT_SECRET);
 const previous=await currentLegalReceipt(request,env,auth,actor);
 if(previous&&previous.media===media&&(input.purpose!=='account'||previous.aiProcessing===(input.aiProcessing===true)&&previous.aiMemory===(input.aiProcessing===true&&input.aiMemory===true)))return json({success:true,accepted:true,receiptId:previous.receiptId,media});
 if(ipHash){const recent=await env.DB.prepare("SELECT count(*) n FROM legalConsentEvents WHERE ipHash=? AND datetime(createdAt)>datetime('now','-1 minute')").bind(ipHash).first();if(Number(recent?.n)>=10)return json({error:'Aguarde um minuto antes de registrar novamente.'},429,{'retry-after':'60'});}
 const purpose=['account','portal','application','review','contact','media','privacy'].includes(input.purpose)?input.purpose:'privacy';
 await env.DB.prepare('INSERT INTO legalConsentEvents(id,actor,purpose,version,termsHash,privacyHash,accepted,media,ipHash,browser) VALUES(?,?,?,?,?,?,1,?,?,?)')
  .bind(id,actor,purpose,legalVersion,legalDocuments.terms,legalDocuments.privacy,Number(media),ipHash,String(request.headers.get('user-agent')||'').slice(0,250)).run();
 const token=await auth.create({type:'legal',actor,version:legalVersion,termsHash:legalDocuments.terms,privacyHash:legalDocuments.privacy,receiptId:id,media,...(purpose==='account'?{aiProcessing:input.aiProcessing===true,aiMemory:input.aiProcessing===true&&input.aiMemory===true}:{})},env,31536000);
 return json({success:true,accepted:true,receiptId:id,media},200,{'set-cookie':legalCookie+'='+token+'; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax'});
}

export const legalProtectedProcedures = new Set([
 'agent.register','affiliate.register','applications.clientSave','applications.uploadDocument',
 'testimonials.submitReview','reviewInvites.submit','serviceFeedback.submit','calendly.contactAgent',
 // Authenticated portal use never requests another agreement after registration.
]);

export async function requireAiProcessing(env, actor) {
 const choices=await privacyChoices(env,actor);
 if(!choices.aiProcessing)throw Object.assign(Error('A assistente de IA está desativada nas suas configurações de privacidade.'),{status:403});
 return choices;
}
