import {leadSchema,storeCentralContacts,protectInternalContacts} from './lead-flow.js';
import {contactBridge} from './affiliate-whatsapp.js';
export async function syncExcludedWorkGroups(env,bridge=contactBridge){
 const email='rafael.cunha@affinityfc.org',owner='agent:'+email;
 await leadSchema(env);
 const admin=await env.DB.prepare("SELECT name FROM adminAccounts WHERE lower(email)=? AND adminRole='master' AND isActive=1 AND status='approved'").bind(email).first();if(!admin)return {groups:0};
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS centralWorkGroupImports(groupId TEXT PRIMARY KEY)').run();
 await env.DB.prepare("INSERT OR IGNORE INTO centralExcludedGroups(groupId,name,excludedBy) SELECT e.groupId,coalesce((SELECT max(json_extract(g.value,'$.name')) FROM centralLeadSources s,json_each(s.groupsJson) g WHERE json_extract(g.value,'$.id')=e.groupId),e.groupId),? FROM centralAgentExcludedGroups e WHERE e.owner=? AND NOT EXISTS(SELECT 1 FROM centralWorkGroupImports imported WHERE imported.groupId=e.groupId)").bind(email,owner).run();
 await env.DB.prepare('INSERT OR IGNORE INTO centralWorkGroupImports(groupId) SELECT groupId FROM centralAgentExcludedGroups WHERE owner=?').bind(owner).run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS excludedGroupRefresh(groupId TEXT PRIMARY KEY,checkedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 const groups=(await env.DB.prepare("SELECT g.* FROM centralExcludedGroups g LEFT JOIN excludedGroupRefresh r ON r.groupId=g.groupId WHERE EXISTS(SELECT 1 FROM centralLeadSources s,json_each(s.groupsJson) sourceGroup WHERE s.owner=? AND json_extract(sourceGroup.value,'$.id')=g.groupId) OR g.excludedBy=? ORDER BY coalesce(r.checkedAt,'1970-01-01') LIMIT 4").bind(owner,email).all()).results||[];
 let members=0;for(const group of groups){try{const r=await bridge(env,email,'group-contacts?group='+encodeURIComponent(group.groupId));if(r.status===202)continue;if(!r.ok){await env.DB.prepare('INSERT INTO excludedGroupRefresh(groupId) VALUES(?) ON CONFLICT(groupId) DO UPDATE SET checkedAt=CURRENT_TIMESTAMP').bind(group.groupId).run();continue;}const data=await r.json();if(data.pending||!Array.isArray(data.contacts))continue;const contacts=data.contacts.map(c=>({...c,groups:[{id:group.groupId,name:group.name}]}));await storeCentralContacts(env,{owner,kind:'agent',name:admin.name,email,channel:'whatsapp'},contacts);await protectInternalContacts(env);await env.DB.prepare('INSERT INTO excludedGroupRefresh(groupId) VALUES(?) ON CONFLICT(groupId) DO UPDATE SET checkedAt=CURRENT_TIMESTAMP').bind(group.groupId).run();members+=contacts.length;}catch{console.error('excluded_work_group_refresh_pending');}}
 await protectInternalContacts(env);return {groups:groups.length,members};
}
