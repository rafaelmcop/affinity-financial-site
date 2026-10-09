import {whatsappRoute} from './whatsapp.js';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
export async function whatsappLeadsRoute(request,env,auth){
 const url=new URL(request.url),page=url.pathname==='/agentes/crm/whatsapp';
 if(!page&&!url.pathname.startsWith('/api/agent/whatsapp-leads/'))return null;
 const email=await auth.email(request,env);if(!email)return page?Response.redirect(new URL('/agentes/login',url),302):json({error:'Entre no portal.'},401);
 const {account}=await auth.access(email,env);if(!account||!Number(account.isActive)||account.status!=='approved'||!['agent','both'].includes(account.accountType))return json({error:'Acesso restrito ao agente.'},403);
 if(page)return env.ASSETS.fetch(new Request(new URL('/agent-whatsapp-leads.html',url),request));
 const owner=email.toLowerCase(),action=url.pathname.split('/').at(-1);
 if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Solicitação inválida.'},403);
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS whatsappLeads (id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'whatsapp',stage TEXT NOT NULL DEFAULT 'Importados',createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(owner,phone))").run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS whatsappLeadGroups (owner TEXT NOT NULL,leadId INTEGER NOT NULL,groupId TEXT NOT NULL,groupName TEXT NOT NULL,PRIMARY KEY(owner,leadId,groupId))').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS whatsappLeadStages (owner TEXT PRIMARY KEY,stages TEXT NOT NULL)').run();
 const row=await env.DB.prepare('SELECT stages FROM whatsappLeadStages WHERE owner=?').bind(owner).first();const stages=row?JSON.parse(row.stages):['Importados',"1ª chamada","2ª chamada",'Interesse','Reunião agendada','Follow-up','Aplicação','Aplicado','Emitida','Recusada','Sem interesse','Já tem seguro'];
 if(action==='list'&&request.method==='GET'){
  const rows=await env.DB.prepare('SELECT id,name,phone,source,stage,createdAt,updatedAt FROM whatsappLeads WHERE owner=? ORDER BY id DESC').bind(owner).all();
  const groups=await env.DB.prepare('SELECT leadId,groupId,groupName FROM whatsappLeadGroups WHERE owner=?').bind(owner).all();
  return json({stages,leads:(rows.results||[]).map(l=>({...l,groups:(groups.results||[]).filter(g=>g.leadId===l.id)}))});
 }
 if(request.method!=='POST')return json({error:'Ação inválida.'},405);
 if(Number(request.headers.get('content-length')||0)>10000)return json({error:'Solicitação muito grande.'},413);
 const text=await request.text();if(text.length>10000)return json({error:'Solicitação muito grande.'},413);let input;try{input=JSON.parse(text);}catch{return json({error:'Solicitação inválida.'},400);}
 if(action==='stages'){
  const values=Array.isArray(input.stages)?[...new Set(input.stages.map(x=>String(x).trim()).filter(Boolean))]:[];
  if(!values.length||values.length>30||values.some(x=>x.length>60))return json({error:'Informe de 1 a 30 etapas, até 60 caracteres cada.'},400);
  const used=await env.DB.prepare('SELECT DISTINCT stage FROM whatsappLeads WHERE owner=?').bind(owner).all();if((used.results||[]).some(x=>!values.includes(x.stage)))return json({error:'Mova os leads das etapas removidas antes de alterar a lista.'},409);
  await env.DB.prepare('INSERT INTO whatsappLeadStages(owner,stages) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET stages=excluded.stages').bind(owner,JSON.stringify(values)).run();return json({ok:true});
 }
 if(action==='stage'){
  if(!Number.isInteger(input.id)||!stages.includes(input.stage))return json({error:'Etapa ou lead inválido.'},400);
  const updated=await env.DB.prepare('UPDATE whatsappLeads SET stage=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND owner=?').bind(input.stage,input.id,owner).run();return updated.meta?.changes?json({ok:true}):json({error:'Lead não encontrado.'},404);
 }
 if(['import','export-group'].includes(action)){
  if(!/^\d{5,25}(?:-\d{5,25})?@g\.us$/.test(input.group||''))return json({error:'Grupo inválido.'},400);
  const upstream=await whatsappRoute(new Request(new URL('/api/agent/whatsapp/group-contacts?group='+encodeURIComponent(input.group),url),{method:'GET',headers:request.headers}),env,auth);
  if(!upstream.ok)return upstream;const data=await upstream.json();if(data.pending)return json({pending:true},202);if(action==='export-group')return json(data);let added=0,existing=0;
  const current=await env.DB.prepare('SELECT phone FROM whatsappLeads WHERE owner=?').bind(owner).all();const seen=new Set((current.results||[]).map(x=>x.phone));
  const contacts=data.contacts.filter(c=>/^\+\d{8,15}$/.test(c.phone));
  for(const contact of contacts){if(seen.has(contact.phone))existing++;else{added++;seen.add(contact.phone);}}
  for(let i=0;i<contacts.length;i+=20){
   const chunk=contacts.slice(i,i+20);
   await env.DB.batch([
    env.DB.prepare('INSERT INTO whatsappLeads(owner,name,phone,stage) VALUES '+chunk.map(()=>'(?,?,?,?)').join(',')+" ON CONFLICT(owner,phone) DO UPDATE SET name=CASE WHEN (whatsappLeads.name=whatsappLeads.phone OR trim(whatsappLeads.name)='') AND excluded.name<>excluded.phone THEN excluded.name ELSE whatsappLeads.name END").bind(...chunk.flatMap(c=>[owner,c.name,c.phone,stages[0]])),
    env.DB.prepare('INSERT INTO whatsappLeadGroups(owner,leadId,groupId,groupName) SELECT ?,id,?,? FROM whatsappLeads WHERE owner=? AND phone IN ('+chunk.map(()=>'?').join(',')+') ON CONFLICT(owner,leadId,groupId) DO UPDATE SET groupName=excluded.groupName').bind(owner,data.groupId,data.groupName,owner,...chunk.map(c=>c.phone))
   ]);
  }
  return json({ok:true,added,existing,unresolved:data.unresolved,total:data.total});
 }
 return json({error:'Ação inválida.'},405);
}
