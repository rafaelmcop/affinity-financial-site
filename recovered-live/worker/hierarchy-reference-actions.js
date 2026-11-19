import {confirmAdmin} from './admin-confirmation.js';
export async function referenceAction(env,actor,input,compare){
 const source=await env.DB.prepare('SELECT * FROM agentUplineDirectory WHERE id=?').bind(Number(input.directoryId)||0).first();
 if(!source)throw Error('Referência de upline não encontrada. Atualize a página.');
 const links=(await env.DB.prepare('SELECT agentEmail,uplineEmail FROM agentHierarchy').all()).results||[],parents=new Map(links.map(r=>[r.agentEmail,r.uplineEmail]));
 let target=null,parent=null;
 if(input.action==='merge'){
  target=await env.DB.prepare("SELECT email,name FROM adminAccounts WHERE id=? AND portalDeletedAt IS NULL AND accountType IN ('agent','both')").bind(Number(input.targetId)||0).first();
  if(!target)throw Error('Selecione o cadastro de agente que será mantido.');
  target.email=target.email.toLowerCase();
 }
 if(input.parentId!==null){const id=Number(input.parentId);parent=id<0?await env.DB.prepare('SELECT nodeKey AS key FROM agentUplineDirectory WHERE id=?').bind(-id).first():await env.DB.prepare("SELECT lower(email) AS key FROM adminAccounts WHERE id=? AND portalDeletedAt IS NULL AND accountType IN ('agent','both')").bind(id||0).first();if(!parent)throw Error('Selecione um upline válido ou Sem upline.');}
 const replacement=target?.email||parent?.key||null;
 if(parent?.key===source.nodeKey||replacement===source.nodeKey||parent?.key===target?.email&&target)throw Error('O upline não pode ser a própria pessoa.');
 const children=links.filter(r=>r.uplineEmail===source.nodeKey&&r.agentEmail!==target?.email);
 const next=new Map(parents);next.delete(source.nodeKey);for(const child of children)next.set(child.agentEmail,replacement);if(target)next.set(target.email,parent?.key||null);
 // Validate the complete proposed graph before any mutation, including descendants of either node.
 for(const start of next.keys()){let cursor=start;const seen=new Set();while(cursor){if(seen.has(cursor))throw Error('A alteração criaria um ciclo na hierarquia. Escolha outro upline.');seen.add(cursor);cursor=next.get(cursor);}}
 await confirmAdmin(env,actor,input,compare);
 // All rewiring, audit and removal are one transaction. A graph change during confirmation aborts it.
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS hierarchyMutationGuard(ok INTEGER NOT NULL CHECK(ok=1))').run();
 const snapshot=JSON.stringify(links.map(r=>[r.agentEmail,r.uplineEmail]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0));
 const commands=[env.DB.prepare('INSERT INTO hierarchyMutationGuard(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM agentUplineDirectory WHERE id=? AND nodeKey=?) THEN 1 ELSE 0 END').bind(source.id,source.nodeKey)];
 commands.push(env.DB.prepare("INSERT INTO hierarchyMutationGuard(ok) SELECT CASE WHEN ?=(SELECT json_group_array(json_array(agentEmail,uplineEmail)) FROM (SELECT agentEmail,uplineEmail FROM agentHierarchy ORDER BY agentEmail COLLATE BINARY)) THEN 1 ELSE 0 END").bind(snapshot));
 if(target)commands.push(env.DB.prepare("INSERT INTO hierarchyMutationGuard(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM adminAccounts WHERE lower(email)=? AND portalDeletedAt IS NULL AND accountType IN ('agent','both')) THEN 1 ELSE 0 END").bind(target.email));
 commands.push(env.DB.prepare('UPDATE agentHierarchy SET uplineEmail=?,updatedAt=CURRENT_TIMESTAMP WHERE uplineEmail=?').bind(replacement,source.nodeKey));
 if(target)commands.push(env.DB.prepare('INSERT INTO agentHierarchy(agentEmail,uplineEmail) VALUES(?,?) ON CONFLICT(agentEmail) DO UPDATE SET uplineEmail=excluded.uplineEmail,updatedAt=CURRENT_TIMESTAMP').bind(target.email,parent?.key||null));
 commands.push(env.DB.prepare('DELETE FROM agentHierarchy WHERE agentEmail=?').bind(source.nodeKey));
 commands.push(env.DB.prepare('INSERT INTO agentHierarchyAudit(actor,nodeKey,oldUpline,newUpline,action,details) VALUES(?,?,?,?,?,?)').bind(actor,source.nodeKey,parents.get(source.nodeKey)||null,replacement,input.action,JSON.stringify({source:{name:source.name,email:source.email},target,parent:parent?.key||null,children:children.map(r=>r.agentEmail)})));
 if(target&&await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agentExternalUplines'").first())for(const child of children)commands.push(env.DB.prepare('UPDATE agentExternalUplines SET name=?,email=?,reviewedBy=? WHERE agentEmail=?').bind(target?.name||'',target?.email||'',actor,child.agentEmail));
 commands.push(env.DB.prepare('DELETE FROM agentUplineDirectory WHERE id=?').bind(source.id));
 commands.push(env.DB.prepare('DELETE FROM hierarchyMutationGuard').bind());
 try{await env.DB.batch(commands);}catch(e){if(/CHECK constraint.*ok=1/i.test(e.message))throw Error('A hierarquia mudou. Atualize a página e confirme novamente.');throw e;}return {ok:true,moved:children.length};
}
