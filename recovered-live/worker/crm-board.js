import {samePersonRecord,samePersonName} from './person-identity.js';
export const boardColumns=[['new','Novos'],['scheduled','Reuniões marcadas'],['attended','Atendimento realizado'],['follow_up','Follow-up'],['proposal_sent','Proposta enviada'],['closed','Fechado'],['closed_documents_pending','Faltando documentos'],['application_submitted','Aplicação submetida'],['issued','InForce'],['not_interested','Sem interesse'],['already_insured','Já tem seguro'],['insurer_declined','Recusado pela seguradora'],['no_show','Não compareceu']];
const ready=new WeakSet();
export async function boardSchema(env){if(ready.has(env.DB))return;await env.DB.prepare('CREATE TABLE IF NOT EXISTS crmBoardColumns(owner TEXT NOT NULL,columnKey TEXT NOT NULL,label TEXT NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(owner,columnKey))').run();await env.DB.prepare('CREATE TABLE IF NOT EXISTS crmBoardCards(owner TEXT NOT NULL,clientId INTEGER NOT NULL,columnKey TEXT NOT NULL,updatedBy TEXT NOT NULL,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,clientId))').run();ready.add(env.DB);}
async function columns(env,owner){await boardSchema(env);await env.DB.batch(boardColumns.map(([key,label],i)=>env.DB.prepare('INSERT OR IGNORE INTO crmBoardColumns(owner,columnKey,label,position) VALUES(?,?,?,?)').bind(owner,key,label,i)));return(await env.DB.prepare('SELECT columnKey,label,position FROM crmBoardColumns WHERE owner=? ORDER BY position,columnKey').bind(owner).all()).results||[];}
export function classifyBoardClient(client,{policies=[],applications=[],meetings=[],now=new Date()}={}){
 if(policies.some(p=>Number(p.clientId)===Number(client.id)&&p.policyNumber&&['active','inforce','in_force','issued'].includes(String(p.status||'').toLowerCase())&&(!p.clientName||samePersonRecord(client,p))))return 'issued';
 if(applications.some(p=>samePersonRecord(client,p)&&['submitted','completed','complete','concluida','concluido'].includes(String(p.status||'').toLowerCase())))return 'application_submitted';
 const mapped={followup_documents:'closed_documents_pending',followup_application:'follow_up',followup_service:'follow_up',followup_review:'follow_up',follow_up:'follow_up',not_interested:'not_interested',no_interest:'not_interested',already_insured:'already_insured',insurer_declined:'insurer_declined',proposal:'proposal_sent',no_show:'no_show'}[client.status];if(mapped)return mapped;
 if(client.nextFollowUpAt)return 'follow_up';
 const ownMeetings=meetings.filter(m=>Number(m.clientId)===Number(client.id));
 if(ownMeetings.some(m=>!['canceled','cancelled','no_show','completed'].includes(String(m.status||'').toLowerCase())&&new Date(m.startTime)>=now))return 'scheduled';
 const recorded=ownMeetings.filter(m=>['completed','no_show'].includes(String(m.status||'').toLowerCase())&&new Date(m.startTime)<=now).sort((a,b)=>Date.parse(b.startTime)-Date.parse(a.startTime));
 if(recorded.length)return String(recorded[0].status).toLowerCase()==='no_show'?'no_show':'proposal_sent';
 if(['first_meeting','attended','completed'].includes(String(client.status)))return 'proposal_sent';
 if(['closed','client'].includes(String(client.status)))return 'closed';
 if(client.status==='meeting')return 'scheduled';return 'new';
}
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function crmBoard(env,owner,input={},operation='get',actor=owner){
 owner=String(owner).toLowerCase();actor=String(actor).toLowerCase();const available=await columns(env,owner);
 if(operation==='column'){
 const label=String(input.label||'').trim().replace(/\s+/g,' ');if(!label||label.length>60)throw fail('Dê um nome de até 60 caracteres para a coluna.');if(available.length>=43)throw fail('Limite de 30 colunas personalizadas atingido.');if(available.some(c=>c.label.toLowerCase()===label.toLowerCase()))throw fail('Já existe uma coluna com esse nome.');
 const columnKey='custom-'+crypto.randomUUID();await env.DB.prepare('INSERT INTO crmBoardColumns(owner,columnKey,label,position) VALUES(?,?,?,?)').bind(owner,columnKey,label,available.length).run();return {columnKey,label};
 }
 if(operation==='order'){
 const keys=input.columnKeys;if(!Array.isArray(keys)||keys.length!==available.length||keys.some(key=>typeof key!=='string')||new Set(keys).size!==keys.length||keys.some(key=>!available.some(c=>c.columnKey===key)))throw fail('As colunas mudaram. Atualize o quadro e tente novamente.');
 await env.DB.batch(keys.map((key,index)=>env.DB.prepare('UPDATE crmBoardColumns SET position=? WHERE owner=? AND columnKey=?').bind(index,owner,key)));return {success:true};
 }
 if(operation==='contact'){
 const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase(),rawPhone=String(input.phone||'').trim(),digits=rawPhone.replace(/\D/g,''),phone=digits.length===10?'+1'+digits:digits?'+'+digits:'';
 if(name.length<2||name.length>150||email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)||digits&&(digits.length<10||digits.length>15)||!email&&!phone)throw fail('Informe o nome e pelo menos um telefone ou e-mail válido.');
 const referrerId=Number(input.referrerId)||0,referrer=referrerId?await env.DB.prepare('SELECT id,name FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(referrerId,owner).first():null;if(referrerId&&!referrer)throw fail('Cliente indicador não encontrado.',404);
 const candidates=(await env.DB.prepare('SELECT id,name,email,phone FROM crmClients WHERE lower(assignedAdminEmail)=?').bind(owner).all()).results||[];
 const existing=candidates.find(c=>samePersonName(name,c.name)&&((email&&String(c.email||'').trim().toLowerCase()===email)||(phone&&('+'+(String(c.phone||'').replace(/\D/g,'').length===10?'1':'')+String(c.phone||'').replace(/\D/g,''))===phone)));if(existing)return {clientId:existing.id,existing:true,name:existing.name,email:existing.email,phone:existing.phone};
 const row=await env.DB.prepare("INSERT INTO crmClients(name,email,phone,status,source,assignedAdminEmail,notes) VALUES(?,?,?,'new',?,?,?) RETURNING id").bind(name,email||null,phone||null,referrer?'Indicação de cliente':'Cadastro manual',owner,referrer?'Indicado por: '+referrer.name+' · cadastro #'+referrer.id:'').first();
 await env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'note',?,?)").bind(row.id,'Contato adicionado por '+actor+(referrer?' · Indicação de '+referrer.name:''),owner).run();return {clientId:Number(row.id),name,email,phone};
 }
 if(operation==='move'){
 const clientId=Number(input.clientId),key=String(input.columnKey||''),date=String(input.followUpDate||'').trim(),target=available.find(c=>c.columnKey===key);if(!Number.isSafeInteger(clientId)||!target)throw fail('Cliente ou coluna inválidos.');
 const client=await env.DB.prepare('SELECT id,nextFollowUpAt FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(clientId,owner).first();if(!client)throw fail('Cliente não encontrado.',404);
 const follow=date||String(client.nextFollowUpAt||'').slice(0,10);if(key==='follow_up'&&!follow)throw fail('Informe a data para o follow-up.');if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))throw fail('Data de follow-up inválida.');
 const statements=[env.DB.prepare('INSERT INTO crmBoardCards(owner,clientId,columnKey,updatedBy) VALUES(?,?,?,?) ON CONFLICT(owner,clientId) DO UPDATE SET columnKey=excluded.columnKey,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(owner,clientId,key,actor),env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'status',?,?)").bind(clientId,'Quadro CRM: '+target.label+(date?' · Próximo contato: '+date:'')+'\nRegistrado por: '+actor,owner)];
 if(date)statements.push(env.DB.prepare('UPDATE crmClients SET nextFollowUpAt=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND lower(assignedAdminEmail)=?').bind(date,clientId,owner));await env.DB.batch(statements);return {success:true};
 }
 const queries=await env.DB.batch([env.DB.prepare('SELECT id,name,email,phone,status,birthDate,nextFollowUpAt FROM crmClients WHERE lower(assignedAdminEmail)=? ORDER BY name COLLATE NOCASE,id').bind(owner),env.DB.prepare('SELECT clientId,columnKey FROM crmBoardCards WHERE owner=?').bind(owner),env.DB.prepare('SELECT clientId,clientName,birthDate,policyNumber,status FROM agentPolicies WHERE lower(agentEmail)=?').bind(owner),env.DB.prepare('SELECT clientName,birthDate,status FROM agentApplications WHERE lower(agentEmail)=?').bind(owner),env.DB.prepare('SELECT clientId,startTime,status FROM calendlyMeetings WHERE lower(agentEmail)=?').bind(owner)]);
 const [clients,cards,policies,applications,meetings]=queries.map(q=>q.results||[]),saved=new Map(cards.map(c=>[Number(c.clientId),c.columnKey]));
 return {columns:available,clients:clients.map(c=>({...c,columnKey:saved.get(Number(c.id))||classifyBoardClient(c,{policies,applications,meetings})}))};
}
