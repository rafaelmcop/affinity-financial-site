import {boardSchema,classifyBoardClient,linkedPolicyStage,columns} from './crm-board.js';
import {legacyStage,storedCrmStatus,displayCrmStatus,crmStageLabels} from '../public/crm-stage-rules.js';
export {legacyStage,storedCrmStatus};
export async function progressStatements(env,owner,clientId,stage,actor,date){
 await boardSchema(env);const policies=(await env.DB.prepare('SELECT clientId,policyNumber,status FROM agentPolicies WHERE lower(agentEmail)=? AND clientId=?').bind(owner,clientId).all()).results||[];const policyStage=linkedPolicyStage({id:clientId},policies);const statements=[env.DB.prepare('INSERT INTO crmBoardCards(owner,clientId,columnKey,updatedBy) VALUES(?,?,?,?) ON CONFLICT(owner,clientId) DO UPDATE SET columnKey=excluded.columnKey,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(owner,clientId,stage,actor),env.DB.prepare('UPDATE crmClients SET status=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND lower(assignedAdminEmail)=?').bind(storedCrmStatus(policyStage||stage),clientId,owner)];
 if(date!==undefined)statements.push(env.DB.prepare('UPDATE crmClients SET nextFollowUpAt=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND lower(assignedAdminEmail)=?').bind(date||null,clientId,owner));return statements;
}
export async function persistLegacyProgress(env,owner,clientId,status,actor,date){
 const stage=legacyStage(status);if(!stage||!owner)return;const own=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(clientId,owner).first();if(!own)return;await env.DB.batch(await progressStatements(env,owner,clientId,stage,actor,date));
}
export async function projectCrmProgress(env,clients,policies=[],applications=[]){
 if(!clients.length)return clients;await boardSchema(env);const owners=[...new Set(clients.map(c=>String(c.assignedAdminEmail||'').toLowerCase()).filter(Boolean))];
 const cards=(await env.DB.prepare('SELECT b.owner,b.clientId,b.columnKey,c.label FROM crmBoardCards b LEFT JOIN crmBoardColumns c ON c.owner=b.owner AND c.columnKey=b.columnKey WHERE b.owner IN (SELECT value FROM json_each(?))').bind(JSON.stringify(owners)).all()).results||[],saved=new Map(cards.map(c=>[c.owner+':'+c.clientId,c]));
 return clients.map(client=>{const owner=String(client.assignedAdminEmail||'').toLowerCase(),ownedPolicies=policies.filter(p=>!p.agentEmail||String(p.agentEmail).toLowerCase()===owner),ownedApps=applications.filter(p=>!p.agentEmail||String(p.agentEmail).toLowerCase()===owner),card=saved.get(owner+':'+client.id),policyStage=linkedPolicyStage(client,ownedPolicies),stage=policyStage||(client.hasInforcePolicy?'issued':client.hasLapsedPolicy?'lapsed':null)||card?.columnKey||classifyBoardClient(client,{policies:ownedPolicies,applications:ownedApps});
 return{...client,crmStage:stage,crmStageLabel:crmStageLabels[stage]||card?.label||stage,crmFollowUp:card?.columnKey==='follow_up'||stage==='follow_up',status:displayCrmStatus(stage,client.status),hasInforcePolicy:policyStage==='issued'||client.hasInforcePolicy===true,hasLapsedPolicy:ownedPolicies.some(p=>Number(p.clientId)===Number(client.id)&&['inactive','lapse','lapsed','inativa','inativo'].includes(String(p.status||'').trim().toLowerCase()))};});
}

export async function clientStageStatements(env,owner,clientId,key,actor,date){
 const client=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(clientId,owner).first();
 if(!client)throw Error('Cliente não encontrado nesta conta.');
 const target=(await columns(env,owner)).find(c=>c.columnKey===key);
 if(!target)throw Error('Esta categoria mudou no CRM. Atualize a ficha e selecione novamente.');
 if(key==='follow_up'&&!date)throw Error('Informe a data para o follow-up.');
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))throw Error('Data de follow-up inválida.');
 return [...await progressStatements(env,owner,clientId,key,actor,date),env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'status',?,?)").bind(clientId,'Acompanhamento CRM: '+target.label+(date?' · Próximo contato: '+date:'')+'\nRegistrado por: '+actor,owner)];
}
