import {boardSchema} from './crm-board.js';
import {contactFilters,normalizeTag} from '../public/crm-contact-filters.js';
const ready=new WeakSet();
async function schema(env){if(ready.has(env.DB))return;await env.DB.prepare('CREATE TABLE IF NOT EXISTS crmContactTags(owner TEXT NOT NULL,clientId INTEGER NOT NULL,tagKey TEXT NOT NULL,label TEXT NOT NULL,PRIMARY KEY(owner,clientId,tagKey))').run();await env.DB.prepare('CREATE TABLE IF NOT EXISTS crmSmartLists(owner TEXT NOT NULL,listId TEXT NOT NULL,label TEXT NOT NULL,filtersJson TEXT NOT NULL,updatedBy TEXT NOT NULL,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,listId))').run();ready.add(env.DB);}
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function contactSegmentation(env,owner,input={},operation='get',actor=owner){
 owner=String(owner).toLowerCase();actor=String(actor).toLowerCase();await schema(env);
 if(operation==='tags'){
 const id=Number(input.clientId);if(!Number.isSafeInteger(id)||id<1||!Array.isArray(input.tags)||input.tags.length>15)throw fail('Use até 15 etiquetas por contato.');
 const client=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(id,owner).first();if(!client)throw fail('Contato não encontrado.',404);
 const tags=new Map();for(const value of input.tags){if(typeof value!=='string')throw fail('Etiqueta inválida.');const label=value.normalize('NFKC').trim().replace(/\s+/g,' ');if(!label||label.length>40||/[\x00-\x1f]/.test(value))throw fail('Cada etiqueta deve ter entre 1 e 40 caracteres.');tags.set(normalizeTag(label),label);}
 await env.DB.batch([env.DB.prepare('DELETE FROM crmContactTags WHERE owner=? AND clientId=?').bind(owner,id),...Array.from(tags,([key,label])=>env.DB.prepare('INSERT INTO crmContactTags(owner,clientId,tagKey,label) VALUES(?,?,?,?)').bind(owner,id,key,label)),env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'note',?,?)").bind(id,'Etiquetas do CRM: '+([...tags.values()].join(', ')||'nenhuma')+'\nRegistrado por: '+actor,owner)]);return {success:true};
 }
 if(operation==='save'){
 const label=String(input.label||'').trim().replace(/\s+/g,' '),id=String(input.listId||'');if(!label||label.length>80||/[\x00-\x1f]/.test(label))throw fail('Dê um nome de até 80 caracteres à lista.');
 const filters=contactFilters(input.filters);if(filters.stage)await boardSchema(env);
 if(filters.stage&&!await env.DB.prepare('SELECT 1 FROM crmBoardColumns WHERE owner=? AND columnKey=?').bind(owner,filters.stage).first())throw fail('Etapa não encontrada.',404);
 const existing=id?await env.DB.prepare('SELECT listId FROM crmSmartLists WHERE owner=? AND listId=?').bind(owner,id).first():await env.DB.prepare('SELECT listId FROM crmSmartLists WHERE owner=? AND lower(label)=lower(?)').bind(owner,label).first();if(id&&!existing)throw fail('Lista não encontrada.',404);
 const count=await env.DB.prepare('SELECT count(*) total FROM crmSmartLists WHERE owner=?').bind(owner).first();if(!existing&&Number(count?.total)>=100)throw fail('Limite de 100 listas salvas atingido.');
 const listId=existing?.listId||crypto.randomUUID();await env.DB.prepare('INSERT INTO crmSmartLists(owner,listId,label,filtersJson,updatedBy) VALUES(?,?,?,?,?) ON CONFLICT(owner,listId) DO UPDATE SET label=excluded.label,filtersJson=excluded.filtersJson,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(owner,listId,label,JSON.stringify(filters),actor).run();return {success:true,listId};
 }
 if(operation==='delete'){
 const id=String(input.listId||'');if(!id||input.confirmed!==true)throw fail('Confirme a exclusão da lista.');const result=await env.DB.prepare('DELETE FROM crmSmartLists WHERE owner=? AND listId=?').bind(owner,id).run();if(!result.meta?.changes)throw fail('Lista não encontrada.',404);return {success:true};
 }
 const results=await env.DB.batch([env.DB.prepare('SELECT t.clientId,t.tagKey AS key,t.label FROM crmContactTags t JOIN crmClients c ON c.id=t.clientId AND lower(c.assignedAdminEmail)=t.owner WHERE t.owner=? ORDER BY t.label COLLATE NOCASE').bind(owner),env.DB.prepare('SELECT listId,label,filtersJson FROM crmSmartLists WHERE owner=? ORDER BY label COLLATE NOCASE').bind(owner)]);
 const assignments=results[0].results||[],tags=[...new Map(assignments.map(t=>[t.key,{key:t.key,label:t.label}])).values()],lists=(results[1].results||[]).map(row=>{try{return{listId:row.listId,label:row.label,filters:contactFilters(JSON.parse(row.filtersJson))};}catch{return null;}}).filter(Boolean);
 return {tags,lists,assignments};
}
