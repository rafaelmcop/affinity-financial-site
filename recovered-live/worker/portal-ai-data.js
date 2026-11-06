import {cachedFiveRingsCredits} from './five-rings-credits.js';
// Fixed, owner-bound read adapters. Model output never becomes SQL or a procedure name.
const text=(value,n=200)=>String(value??'').replace(/[\u0000-\u001f]/g,' ').slice(0,n);
export const aiDomains=Object.freeze({board:'policies',materials:null,assistants:null,marketing:'marketing',queue:'queue',messages:'messages',inbox:'email',applications:'applications',policies:'policies',payments:'tasks',whatsapp:'whatsapp',integrations:'five_rings',credits:'five_rings',reviews:'reviews',profile:'public_profile'});
export async function aiPortalRecords(env,{owner,actor,permissions},plan,{allowed,read,now=new Date()}){
 const domain=plan.intent;if(!Object.hasOwn(aiDomains,domain))return null;const feature=aiDomains[domain];
 let granted=feature?await allowed(feature):!permissions;if(domain==='applications')granted=granted||await allowed('application_create');if(domain==='integrations')granted=granted||await allowed('email')||await allowed('calendar');
 if(!granted)throw Object.assign(Error('O acesso a este módulo não está liberado para esta conta.'),{status:403});
 const records=[],sources=[],search=text(plan.search,80).trim().toLocaleLowerCase();let rows=[],href='/agentes/apps',limited=false;
 const query=async(sql,...params)=>(await env.DB.prepare(sql).bind(...params).all()).results||[];
 const service=async(name,input)=>{if(!read)throw Error('Fonte indisponível');const result=await read(name,input);if(result?.error)throw Error('Fonte indisponível');return result?.result?.data?.json;};
 try{
 if(domain==='board'){
  const board=await service('agent.getCrmBoard',{});href='/agentes/crm/quadro';rows=(board?.clients||[]).map(r=>({name:r.name,status:(board.columns||[]).find(c=>c.columnKey===r.columnKey)?.label||r.columnKey,date:r.nextFollowUpAt,href:'/agentes/cliente?clientId='+Number(r.id)}));
 }else if(domain==='materials'){
  rows=await query("SELECT title,category status,createdAt date FROM portalMaterials WHERE id<>'73a536f7-4949-4893-9bee-e38e05768713' ORDER BY title LIMIT 101");href='/agentes/materiais';
 }else if(domain==='assistants'){
  rows=await query('SELECT p.name,p.active status FROM portalAssistants p JOIN assistantAgentAccess l ON l.assistantId=p.id WHERE l.owner=? AND l.active=1 AND p.deletedAt IS NULL ORDER BY p.name LIMIT 101',owner);href='/agentes/assistentes';
 }else if(domain==='marketing'){
  rows=await query("SELECT beneficiaryName name,status,updatedAt date,amountCents/100.0 premiumAmount FROM marketingObligations WHERE lower(payer)=? AND status NOT IN ('exempt_agent','ineligible_before_start','awaiting_issue_date') ORDER BY updatedAt DESC LIMIT 101",owner);href='/agentes/obrigacoes-marketing';
 }else if(domain==='queue'){
  rows=await query('SELECT l.name,o.stage status,o.createdAt date,o.attempts FROM centralLeadOutcomes o JOIN centralLeads l ON l.phone=o.phone WHERE lower(o.agent)=? AND l.suppressed=0 ORDER BY o.id DESC LIMIT 101',owner);href='/agentes/fila-leads';
 }else if(domain==='messages'){
  rows=await service('agent.deliveryLog',{});if(plan.state==='sent'&&await allowed('email')){try{const mail=await service('agent.mailbox',{folder:'sent',search});rows.push(...(mail?.items||[]).map(r=>({subject:r.subject,status:'sent',date:r.sentAt,channel:'email',href:'/agentes/email?messageId='+Number(r.id)})));}catch{sources.push({module:'email',status:'indisponível',shown:0});}}href='/agentes/mensagens';
  const state=['scheduled','sent','failed','review'].includes(plan.state)?plan.state:null;
  rows=rows.filter(r=>(!state||r.status===state)&&(!['email','whatsapp'].includes(plan.channel)||(r.channel||'email')===plan.channel));
  rows=rows.map(r=>({title:r.subject||r.title,name:r.clientName,status:r.status,date:r.date,channel:r.channel||'email',summary:r.statusSummary,href:r.href,recipientCount:r.recipientCount,recipientsLimited:(r.recipients||[]).length>20,recipients:(Array.isArray(r.recipients)?r.recipients:[]).slice(0,20).map(p=>({name:text(p.name),status:text(p.status||p.state||r.status,40),date:text(p.sentAt||p.date,60)}))}));
 }else if(domain==='inbox'){
  const data=await service('agent.mailbox',{folder:plan.state==='sent'?'sent':'inbox',search});href='/agentes/email';
  rows=(data?.items||[]).filter(r=>r.topic!=='security'&&!/verification|security code|one.time|código|codigo|verify your|authentication/i.test(r.subject||'')).map(r=>({title:r.subject,status:r.direction,date:r.sentAt,href:'/agentes/email?messageId='+Number(r.id)}));limited=(data?.items||[]).length>=300;
 }else if(domain==='payments'){
  rows=(await service('agent.listTasks',{})).map(r=>({title:r.title,status:r.status,date:r.dueAt,href:'/agentes/caso-pagamento?task='+Number(r.id)}));href='/agentes/dashboard';
 }else if(domain==='applications'){
  rows=await query("SELECT clientName name,status,productInterest title,createdAt date,submittedAt FROM agentApplications WHERE lower(agentEmail)=? AND (?='' OR instr(lower(clientName),?)>0) ORDER BY updatedAt DESC LIMIT 101",owner,search,search);href='/agent-applications';
 }else if(domain==='policies'){
  rows=await query("SELECT clientName name,policyNumber title,status,product,premiumAmount,premiumFrequency,coverageAmount,issuedAt date,clientId FROM agentPolicies WHERE lower(agentEmail)=? AND (?='' OR instr(lower(clientName),?)>0 OR instr(lower(policyNumber),?)>0) ORDER BY updatedAt DESC LIMIT 101",owner,search,search,search);rows=rows.map(r=>({...r,href:r.clientId?'/agentes/cliente?clientId='+Number(r.clientId):'/agentes/crm?setor=clients'}));href='/agentes/crm?setor=clients';
 }else if(domain==='whatsapp'){
  // An assistant's WhatsApp is her own session, never the represented agent's session.
  rows=await query('SELECT a.direction status,a.sentAt date,a.mediaKind title,c.name FROM whatsappClientAudit a LEFT JOIN crmClients c ON c.id=a.clientId AND lower(c.assignedAdminEmail)=? WHERE lower(a.owner)=? ORDER BY a.sentAt DESC LIMIT 101',owner,actor||owner);href='/agentes/whatsapp';
 }else if(domain==='integrations'){
  for(const [key,sql,title] of [['five_rings','SELECT status,lastSyncAt date FROM agentFiveRingsConnections WHERE lower(agentEmail)=?','Five Rings'],['email',"SELECT CASE WHEN length(coalesce(user,''))>0 THEN 'configured' ELSE 'pending' END status,lastImapSyncAt date FROM agentEmailSettings WHERE lower(agentEmail)=?",'E-mail'],['calendar','SELECT status,lastSyncAt date FROM agentCalendlyConnections WHERE lower(agentEmail)=?','Calendly'],['calendar',"SELECT 'configured' status,updatedAt date FROM agentGoogleCalendar WHERE lower(owner)=?",'Google Calendar']]){if(await allowed(key)){try{rows.push(...(await query(sql,owner)).map(r=>({...r,title})));}catch{sources.push({module:title,status:'indisponível',shown:0});}}}
 }else if(domain==='credits'){
  const cached=await cachedFiveRingsCredits(env.DB,owner);rows=cached?[{...cached,date:cached.updatedAt,title:'Créditos e produção Five Rings'}]:[];
 }else if(domain==='reviews'){
  rows=await query('SELECT name,rating,quote title,adminDecision status,createdAt date FROM testimonials WHERE lower(agentEmail)=? ORDER BY createdAt DESC LIMIT 101',owner);href='/agentes/avaliacoes';
 }else if(domain==='profile'){
  rows=await query('SELECT headline title,jobTitle,name,phone FROM agentPublicProfiles p JOIN adminAccounts a ON lower(a.email)=lower(p.agentEmail) WHERE lower(p.agentEmail)=?',owner);href='/agentes/empresa';
 }
 if(!Array.isArray(rows))throw Error('Fonte inválida');
 limited=limited||rows.length>=100;
 const days=Math.max(1,Math.min(90,Number(plan.days)||30)),cutoff=now.getTime()-days*86400000;
 rows=rows.filter(r=>{if(search&&!JSON.stringify(r).toLocaleLowerCase().includes(search))return false;if(['messages','inbox','whatsapp'].includes(domain)&&r.status!=='scheduled'&&r.date){const stamp=Date.parse(r.date.includes('T')?r.date:r.date.replace(' ','T')+'Z');if(Number.isFinite(stamp)&&stamp<cutoff)return false;}return true;});
 limited=limited||rows.length>20;
 if(['messages','inbox','whatsapp'].includes(domain)&&plan.state!=='scheduled')rows.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
 for(const r of rows.slice(0,20)){
  const record={};for(const key of ['title','name','status','date','channel','summary','product','premiumFrequency'])if(r[key]!=null)record[key]=text(r[key],key==='title'?250:160);
  for(const key of ['premiumAmount','coverageAmount','totalCredits','leadershipCurrent','leadershipGoal','leadershipRemaining','rating','attempts'])if(r[key]!=null&&Number.isFinite(Number(r[key])))record[key]=Number(r[key]);
  if(r.recipients){record.recipients=r.recipients;record.recipientCount=Number(r.recipientCount)||r.recipients.length;record.recipientsLimited=!!r.recipientsLimited;}
  record.href=r.href||href;records.push(record);
 }
 sources.push({module:domain,status:'consultado',shown:records.length,limited});
 }catch{sources.push({module:domain,status:'indisponível',shown:0});}
 return {records,sources,limited,scope:'Metadados autorizados; não inclui textos completos, anexos ou credenciais. Histórico limitado ao período e à janela de registros consultada.',actions:[{label:'Abrir módulo para conferir os detalhes',href}]};
}
