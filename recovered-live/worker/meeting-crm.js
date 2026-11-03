import {boardSchema} from './crm-board.js';
export const meetingCrmStages=[['scheduled','Reunião agendada'],['attended','Atendimento realizado'],['no_show','Não compareceu'],['follow_up','Follow-up'],['proposal_sent','Proposta enviada / em análise'],['closed_documents_pending','Fechou · faltam documentos'],['application_submitted','Fechou · aplicação submetida'],['issued','Apólice emitida · InForce'],['not_interested','Sem interesse'],['already_insured','Já tem seguro'],['insurer_declined','Recusado pela seguradora']];
const ready=new WeakSet();
async function schema(env){if(ready.has(env.DB))return;await env.DB.prepare('CREATE TABLE IF NOT EXISTS meetingCrmProgress(owner TEXT NOT NULL,meetingId INTEGER NOT NULL,stage TEXT NOT NULL,followUpDate TEXT,notes TEXT NOT NULL DEFAULT \'\',updatedBy TEXT NOT NULL,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,meetingId))').run();ready.add(env.DB);}
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function meetingCrm(env,owner,input={},actor=owner,save=false){
 owner=String(owner).toLowerCase();const id=Number(input.meetingId);if(!Number.isSafeInteger(id)||id<1)throw fail('Compromisso inválido.');
 const meeting=await env.DB.prepare('SELECT id,clientId FROM calendlyMeetings WHERE id=? AND lower(agentEmail)=?').bind(id,owner).first();if(!meeting)throw fail('Compromisso não encontrado.',404);
 await schema(env);
 if(!save)return {stages:meetingCrmStages,progress:await env.DB.prepare('SELECT stage,followUpDate,notes,updatedAt FROM meetingCrmProgress WHERE owner=? AND meetingId=?').bind(owner,id).first()||{stage:'scheduled',followUpDate:null,notes:''}};
 const stage=String(input.stage||''),date=String(input.followUpDate||'').trim(),notes=String(input.notes||'').trim();
 if(!meetingCrmStages.some(([key])=>key===stage))throw fail('Selecione uma etapa válida.');
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))throw fail('Informe uma data válida para o próximo contato.');
 if(stage==='follow_up'&&!date)throw fail('Informe a data do follow-up.');if(notes.length>5000)throw fail('Use até 5.000 caracteres nas observações.');
 await boardSchema(env);
 const statements=[env.DB.prepare("INSERT INTO meetingCrmProgress(owner,meetingId,stage,followUpDate,notes,updatedBy) VALUES(?,?,?,?,?,?) ON CONFLICT(owner,meetingId) DO UPDATE SET stage=excluded.stage,followUpDate=excluded.followUpDate,notes=excluded.notes,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP").bind(owner,id,stage,date||null,notes,String(actor).toLowerCase())];
 // Only a previously linked, owned CRM record can receive an activity or follow-up.
 if(meeting.clientId){const client=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(meeting.clientId,owner).first();if(client){
 statements.push(env.DB.prepare('INSERT INTO crmBoardCards(owner,clientId,columnKey,updatedBy) VALUES(?,?,?,?) ON CONFLICT(owner,clientId) DO UPDATE SET columnKey=excluded.columnKey,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(owner,client.id,stage,String(actor).toLowerCase()));
 const text='Etapa do compromisso #'+id+': '+meetingCrmStages.find(([key])=>key===stage)[1]+(date?' · Próximo contato: '+date:'')+(notes?'\n'+notes:'')+'\nRegistrado por: '+String(actor);
 statements.push(env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'status',?,?)").bind(client.id,text,owner));
 // Do not erase an unrelated scheduled follow-up when no new date is provided.
 if(date)statements.push(env.DB.prepare('UPDATE crmClients SET nextFollowUpAt=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND lower(assignedAdminEmail)=?').bind(date,client.id,owner));
 }}
 await env.DB.batch(statements);return {success:true,stage,followUpDate:date||null};
}
