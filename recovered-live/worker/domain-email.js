import {boundedJson} from './security-boundary.js';
const DOMAIN='team.affinityfc.org',ZONE='571fbc6e04919396d68b456b38ebead6',ACCOUNT='d00b4fce2ba60918d8859e92dd98cf9e';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export function domainAddress(value){const address=String(value||'').trim().toLowerCase();return /^[a-z0-9]+(?:[._+-][a-z0-9]+)*@(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)?affinityfc\.org$/.test(address)&&address.length<=254?address:null;}
export async function domainEmailSchema(env){await env.DB.batch([
 env.DB.prepare('CREATE TABLE IF NOT EXISTS domainEmailIntegration(id INTEGER PRIMARY KEY CHECK(id=1),encryptedToken TEXT NOT NULL,updatedBy TEXT NOT NULL,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'),
 env.DB.prepare("CREATE TABLE IF NOT EXISTS domainEmailDirectory(address TEXT PRIMARY KEY,destination TEXT NOT NULL,provider TEXT NOT NULL CHECK(provider IN ('icloud','cloudflare','other')),status TEXT NOT NULL CHECK(status IN ('reported','planned')),notes TEXT NOT NULL DEFAULT '',updatedBy TEXT NOT NULL,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS domainEmailAudit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,operation TEXT NOT NULL,address TEXT,detail TEXT,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')]);}
export async function mailProvider(domain,fetcher=fetch){
 const r=await fetcher('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(domain)+'&type=MX',{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Unable to check mail servers.');const data=await r.json();if(data.Status!==0)throw Error('The mail-server lookup could not be completed.');const mx=(data.Answer||[]).filter(x=>x.type===15).map(x=>String(x.data));
 return {domain,mx,provider:mx.length&&mx.every(x=>/\.mail\.icloud\.com\.?$/i.test(x))?'icloud':mx.length&&mx.every(x=>/\.mx\.cloudflare\.net\.?$/i.test(x))?'cloudflare':mx.length?'other':'none'};
}
export function routingRow(rule){const matcher=rule.matchers?.length===1&&rule.matchers[0],action=rule.actions?.length===1&&rule.actions[0];return {id:rule.tag||rule.id,name:String(rule.name||''),enabled:rule.enabled===true,address:matcher?.type==='literal'&&matcher.field==='to'?matcher.value:null,destinations:action?.type==='forward'?action.value:[],editable:!!(matcher?.type==='literal'&&matcher.field==='to'&&domainAddress(matcher.value)&&action?.type==='forward'&&action.value?.length===1),type:action?.type||'custom'};}
export async function domainEmailRoute(request,env,auth){
 const url=new URL(request.url),page=url.pathname==='/admin/emails-dominio',api=url.pathname==='/api/admin/domain-email';if(!page&&!api)return null;
 const actor=await auth.email(request,env),access=actor?await auth.access(actor,env):null;
 if(!actor||!access?.account?.isActive||access.account.status!=='approved')return page?Response.redirect(new URL('/admin/login',url),302):json({error:'Sign in as an Admin.'},401);
 if(!access.isMaster&&!['admin','both'].includes(access.account.accountType))return json({error:'Admin access required.'},403);
 if(page)return request.method==='GET'?env.ASSETS.fetch(new Request(new URL('/admin-domain-email.html',url),request)):json({error:'Use GET.'},405);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')))return json({error:'Invalid origin or request format.'},403);
 await domainEmailSchema(env);
 const audit=(operation,address,detail='')=>env.DB.prepare('INSERT INTO domainEmailAudit(actor,operation,address,detail) VALUES(?,?,?,?)').bind(actor,operation,address,detail).run();
 const call=async(token,path,body,method)=>{const response=await (auth.fetch||fetch)('https://api.cloudflare.com/client/v4/'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});let data;try{data=await response.json();}catch{throw Error('Cloudflare returned an unexpected response.');}if(!response.ok||!data.success)throw Error('Cloudflare rejected the operation (HTTP '+response.status+'). Check the integration permissions.');return data;};
 const all=async(token,path)=>{let rows=[];for(let page=1;page<=100;page++){const data=await call(token,path+'?per_page=100&page='+page);if(!Array.isArray(data.result))throw Error('Cloudflare returned an invalid list.');rows.push(...data.result);if(page>=Number(data.result_info?.total_pages||1))return rows;}throw Error('The list exceeded the reading limit.');};
 const getToken=async()=>{if(env.CLOUDFLARE_EMAIL_ROUTING_TOKEN)return env.CLOUDFLARE_EMAIL_ROUTING_TOKEN;const saved=await env.DB.prepare('SELECT encryptedToken FROM domainEmailIntegration WHERE id=1').first();return saved?auth.decrypt(saved.encryptedToken,env.JWT_SECRET):null;};
 try{
 if(request.method==='GET'){
  const token=await getToken(),domain=String(url.searchParams.get('domain')||DOMAIN).toLowerCase();if(!domainAddress('test@'+domain))return json({error:'Invalid domain.'},400);
  let provider=null,mainProvider=null,dnsError=null,rules=[],destinations=[],cloudflareError=null;
  try{[provider,mainProvider]=await Promise.all([mailProvider(domain,auth.fetch||fetch),mailProvider('affinityfc.org',auth.fetch||fetch)]);}catch(e){dnsError=e.message;}
  if(token)try{[rules,destinations]=await Promise.all([all(token,'zones/'+ZONE+'/email/routing/rules'),all(token,'accounts/'+ACCOUNT+'/email/routing/addresses')]);}catch(e){cloudflareError=e.message;}
  const directory=(await env.DB.prepare('SELECT address,destination,provider,status,notes,updatedAt FROM domainEmailDirectory ORDER BY address').all()).results;
  const users=(await env.DB.prepare("SELECT name,email FROM adminAccounts WHERE isActive=1 AND status='approved' AND portalDeletedAt IS NULL UNION SELECT name,email FROM affiliates WHERE isActive=1 AND status='approved' AND portalDeletedAt IS NULL UNION SELECT name,email FROM portalAssistants WHERE active=1 AND deletedAt IS NULL ORDER BY name").all()).results;
  const history=(await env.DB.prepare('SELECT actor,operation,address,detail,createdAt FROM domainEmailAudit ORDER BY id DESC LIMIT 50').all()).results;
  return json({domain,provider,mainProvider,dnsError,connected:!!token,isMaster:!!access.isMaster,cloudflareError,rules:rules.map(routingRow),destinations:destinations.map(x=>({email:x.email,verified:!!x.verified})),directory,users,history});
 }
 const input=await boundedJson(request,8192),action=input.action;
 if(action==='connect'){
  if(!access.isMaster)return json({error:'Only the master Admin can configure this integration.'},403);
  const token=String(input.token||'').trim();if(token.length<20||token.length>2048||/\s/.test(token))return json({error:'Enter a valid token.'},400);
  await Promise.all([all(token,'zones/'+ZONE+'/email/routing/rules'),all(token,'accounts/'+ACCOUNT+'/email/routing/addresses')]);
  const encrypted=await auth.encrypt(token,env.JWT_SECRET);await env.DB.prepare('INSERT INTO domainEmailIntegration(id,encryptedToken,updatedBy) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET encryptedToken=excluded.encryptedToken,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(encrypted,actor).run();await audit('connection',null,'Cloudflare integration connected');return json({ok:true});
 }
 const address=domainAddress(input.address),destination=String(input.destination||'').trim().toLowerCase();
 if(action==='record'){
  if(input.confirmed!==true)return json({error:'Review and confirm the record before saving.'},400);
  if(!address||!auth.validEmail(destination)||address===destination||!['icloud','cloudflare','other'].includes(input.provider)||!['reported','planned'].includes(input.status))return json({error:'Check the email address, destination and provider.'},400);
  await env.DB.prepare('INSERT INTO domainEmailDirectory(address,destination,provider,status,notes,updatedBy) VALUES(?,?,?,?,?,?) ON CONFLICT(address) DO UPDATE SET destination=excluded.destination,provider=excluded.provider,status=excluded.status,notes=excluded.notes,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(address,destination,input.provider,input.status,String(input.notes||'').slice(0,500),actor).run();await audit('record',address,'Directory record only; delivery unchanged');return json({ok:true,recordOnly:true});
 }
 if(input.confirmed!==true)return json({error:'Review the details and confirm the action.'},400);
 const token=await getToken();if(!token)return json({error:'Connect Cloudflare before performing this action.'},409);
 if(action==='verify'){
  if(!auth.validEmail(destination)||destination.endsWith('@'+DOMAIN))return json({error:'Enter the original destination email address.'},400);
  const rows=await all(token,'accounts/'+ACCOUNT+'/email/routing/addresses');if(rows.some(x=>x.email.toLowerCase()===destination))return json({ok:true,alreadyExists:true});
  await call(token,'accounts/'+ACCOUNT+'/email/routing/addresses',{email:destination});await audit('verification',null,destination);return json({ok:true,verificationRequested:true});
 }
 if(action==='create'){
  if(!address||address.split('@')[1]!==DOMAIN||!auth.validEmail(destination)||address===destination)return json({error:'Use an address at @team.affinityfc.org and a valid destination.'},400);
  const provider=await mailProvider(address.split('@')[1],auth.fetch||fetch);if(provider.provider!=='cloudflare')return json({error:'The team subdomain is not receiving through Cloudflare yet. Existing delivery was preserved. Complete subdomain setup before activating forwarding.'},409);
  const [rules,destinations]=await Promise.all([all(token,'zones/'+ZONE+'/email/routing/rules'),all(token,'accounts/'+ACCOUNT+'/email/routing/addresses')]);
  if(rules.some(r=>r.matchers?.some(m=>m.type==='literal'&&m.field==='to'&&String(m.value).toLowerCase()===address)))return json({error:'This address already has a rule. No existing rule was replaced.'},409);
  if(!destinations.some(x=>x.email.toLowerCase()===destination&&x.verified))return json({error:'The recipient must confirm the verification email first.'},409);
  await call(token,'zones/'+ZONE+'/email/routing/rules',{name:'Affinity · '+address,enabled:true,matchers:[{type:'literal',field:'to',value:address}],actions:[{type:'forward',value:[destination]}]});await audit('create',address,destination);return json({ok:true});
 }
 return json({error:'Invalid action.'},400);
 }catch(error){return json({error:/Cloudflare|mail.server|mail servers|list exceeded/.test(error.message)?error.message:'Unable to complete the request. No DNS change was requested.'},502);}
}
