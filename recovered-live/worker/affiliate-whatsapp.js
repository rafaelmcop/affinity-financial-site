const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const encoded=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
async function bridge(env,owner,action,method='GET'){
 if(!env.WHATSAPP_BRIDGE_URL||!env.WHATSAPP_BRIDGE_SECRET)return json({error:'Serviço de WhatsApp indisponível.'},503);
 const payload=encoded(new TextEncoder().encode(JSON.stringify({aud:'affinity-whatsapp',owner,exp:Math.floor(Date.now()/1000)+60}))),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.WHATSAPP_BRIDGE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']),signature=encoded(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))));
 return fetch(new URL('/'+action,env.WHATSAPP_BRIDGE_URL),{method,headers:{authorization:'Bearer '+payload+'.'+signature,'content-type':'application/json'},...(method==='POST'?{body:'{}'}:{}),redirect:'manual',signal:AbortSignal.timeout(20000)});
}
async function schema(env){await env.DB.prepare("CREATE TABLE IF NOT EXISTS affiliateWhatsappLeads (affiliateId INTEGER NOT NULL,affiliateName TEXT NOT NULL,affiliateEmail TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,groupsJson TEXT NOT NULL DEFAULT '[]',source TEXT NOT NULL DEFAULT 'whatsapp_affiliate',createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(affiliateId,phone))").run();await env.DB.prepare("CREATE TABLE IF NOT EXISTS affiliateWhatsappImports (affiliateId INTEGER PRIMARY KEY,state TEXT NOT NULL DEFAULT 'connecting',cursor INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL DEFAULT 0,unresolved INTEGER NOT NULL DEFAULT 0,consentedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completedAt TEXT)").run();}
export async function affiliateWhatsappRoute(request,env,auth){
 const url=new URL(request.url),adminPage=url.pathname==='/admin/contatos-whatsapp-afiliados',affiliatePage=url.pathname==='/afiliados/whatsapp',adminApi=url.pathname==='/api/admin/affiliate-whatsapp/leads',affiliateApi=url.pathname.startsWith('/api/affiliate/whatsapp/');
 if(!adminPage&&!affiliatePage&&!adminApi&&!affiliateApi)return null;
 try{
 if(adminPage||adminApi){
  const email=await auth.email(request,env);if(!email)return adminPage?Response.redirect(new URL('/admin/login',url),302):json({error:'Entre no painel administrativo.'},401);
  const access=await auth.access(email,env);if(!access.isMaster&&(!access.account||!Number(access.account.isActive)||access.account.status!=='approved'||!['admin','both'].includes(access.account.accountType)))return json({error:'Acesso exclusivo dos administradores.'},403);
  if(request.method!=='GET')return json({error:'A lista fixa não permite exclusões por esta interface.'},405);
  if(adminPage)return env.ASSETS.fetch(new Request(new URL('/admin-affiliate-whatsapp.html',url),request));await schema(env);
  const rows=await env.DB.prepare('SELECT affiliateId,affiliateName,affiliateEmail,name,phone,groupsJson,source,createdAt FROM affiliateWhatsappLeads ORDER BY createdAt DESC,affiliateId,phone').all();return json({leads:rows.results||[]});
 }
 const id=await auth.affiliate(request,env);if(!id)return affiliatePage?Response.redirect(new URL('/afiliados/login',url),302):json({error:'Entre no portal de afiliados.'},401);
 const affiliate=await env.DB.prepare('SELECT id,name,email,isActive,status FROM affiliates WHERE id=?').bind(id).first();if(!affiliate||!Number(affiliate.isActive)||affiliate.status!=='approved')return json({error:'Acesso restrito ao afiliado aprovado.'},403);
 if(affiliatePage)return env.ASSETS.fetch(new Request(new URL('/affiliate-whatsapp.html',url),request));
 const action=url.pathname.split('/').at(-1);if(!(['status','export'].includes(action)&&request.method==='GET')&&!(['connect','sync'].includes(action)&&request.method==='POST'))return json({error:'Esta função não permite alterar ou excluir leads.'},405);
 let input={};if(request.method==='POST'){if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Solicitação inválida.'},403);const text=await request.text();if(text.length>2000)return json({error:'Solicitação inválida.'},413);try{input=JSON.parse(text);}catch{return json({error:'Solicitação inválida.'},400);}}
 await schema(env);const owner='affiliate-'+id+'@affinity-whatsapp.invalid';let job=await env.DB.prepare('SELECT * FROM affiliateWhatsappImports WHERE affiliateId=?').bind(id).first();
 if(action==='connect'){
  if(input.consent!==true)return json({error:'Confirme que os contatos serão compartilhados com os administradores da Affinity.'},400);
  const response=await bridge(env,owner,'connect','POST');if(!response.ok)return response;
  await env.DB.prepare("INSERT INTO affiliateWhatsappImports(affiliateId,state,cursor,total,unresolved) VALUES(?,'connecting',0,0,0) ON CONFLICT(affiliateId) DO UPDATE SET state='connecting',cursor=0,total=0,unresolved=0,consentedAt=CURRENT_TIMESTAMP,completedAt=NULL").bind(id).run();return json({ok:true});
 }
 if(action==='export'){
  if(job?.state!=='done')return json({error:'Aguarde a importação terminar.'},409);
  const rows=await env.DB.prepare('SELECT name,phone,groupsJson FROM affiliateWhatsappLeads WHERE affiliateId=? ORDER BY name,phone').bind(id).all(),cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'").replaceAll('"','""')+'"';
  const csv='\ufeff'+[['Nome','Telefone','Origem','Grupos'],...(rows.results||[]).map(c=>[c.name===c.phone?'':c.name,c.phone,'WhatsApp',JSON.parse(c.groupsJson).map(g=>g.name).join(' / ')])].map(r=>r.map(cell).join(';')).join('\r\n');
  return new Response(csv,{headers:{'content-type':'text/csv;charset=utf-8','content-disposition':'attachment; filename="meus-contatos-whatsapp.csv"','cache-control':'no-store'}});
 }
 if(job?.state==='done')return json({state:'done',count:job.total,unresolved:job.unresolved,downloadKey:job.consentedAt});
 if(action==='status')return job?bridge(env,owner,'status'):json({state:'disconnected'});
 if(!job)return json({error:'Leia o QR Code para iniciar.'},409);
 const response=await bridge(env,owner,'all-contacts');if(!response.ok)return response;const result=await response.json();if(result.pending)return json({state:'reading',pending:true,group:result.group,totalGroups:result.totalGroups},202);
 const contacts=result.contacts.filter(c=>/^\+\d{8,15}$/.test(c.phone)),end=Math.min(job.cursor+200,contacts.length);
 for(let i=job.cursor;i<end;i+=20){const chunk=contacts.slice(i,Math.min(i+20,end));if(!chunk.length)continue;await env.DB.batch([
  env.DB.prepare('INSERT INTO affiliateWhatsappLeads(affiliateId,affiliateName,affiliateEmail,name,phone,groupsJson) VALUES '+chunk.map(()=>'(?,?,?,?,?,?)').join(',')+" ON CONFLICT(affiliateId,phone) DO UPDATE SET name=CASE WHEN affiliateWhatsappLeads.name=affiliateWhatsappLeads.phone AND excluded.name<>excluded.phone THEN excluded.name ELSE affiliateWhatsappLeads.name END,groupsJson=excluded.groupsJson").bind(...chunk.flatMap(c=>[id,affiliate.name,affiliate.email,String(c.name||c.phone).slice(0,200),c.phone,JSON.stringify(c.groups||[])])),
  env.DB.prepare("UPDATE affiliateWhatsappImports SET cursor=?,total=?,unresolved=?,state='importing' WHERE affiliateId=?").bind(Math.min(i+20,end),contacts.length,result.unresolved||0,id)
 ]);}
 if(end<contacts.length)return json({state:'importing',pending:true,imported:end,total:contacts.length},202);
 await env.DB.prepare("UPDATE affiliateWhatsappImports SET state='done',total=?,unresolved=?,completedAt=CURRENT_TIMESTAMP WHERE affiliateId=?").bind(contacts.length,result.unresolved||0,id).run();
 try{await bridge(env,owner,'disconnect','POST');}catch{}
 return json({state:'done',count:contacts.length,unresolved:result.unresolved||0,downloadKey:job.consentedAt});
 }catch(error){console.error('affiliate_whatsapp_failure',error?.name||'Error');return json({error:'Não foi possível concluir agora. Tente novamente.'},503);}
}
