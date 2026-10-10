export const cachedGroupContacts=async ids=>{
   const factory=window.require('WAWebWidFactory'),api=window.require('WAWebApiContact'),contacts=window.require('WAWebCollections').Contact,getters=window.require('WAWebContactGetters');
   return Promise.all(ids.map(async id=>{const wid=factory.createWid(id),phone=wid.server==='lid'?api.getPhoneNumber(wid):wid,lid=phone&&api.getCurrentLid?.(phone),models=[contacts.get(wid),phone&&contacts.get(phone),lid&&contacts.get(lid)].filter(Boolean);if(!models.length&&contacts.find)try{models.push(await contacts.find(wid));}catch{}let name='';
    for(const contact of models){for(const read of [()=>getters.getName(contact),()=>getters.getPushname(contact),()=>contact.pushname,()=>contact.name,()=>getters.getVerifiedName?.(contact),()=>getters.getShortName(contact)]){try{const value=String(read()||'').trim();if(value&&!/^[+\d\s().-]+$/.test(value)){name=value;break;}}catch{}}if(name)break;}
    return {id,phone:phone?._serialized,name};}));
  };
export const groupId=value=>/^\d{5,25}(?:-\d{5,25})?@g\.us$/.test(String(value||''));
export async function chatDirectory(client){
 const chats=await client.getChats();
 const rows=chats.filter(c=>groupId(c.id?._serialized)||/^\d{8,20}@(c\.us|lid)$/.test(c.id?._serialized||'')).map(c=>({chat:c.id._serialized,label:String(c.name||'Conversa WhatsApp'),archived:!!(c.archived??c.archive),isGroup:groupId(c.id._serialized)||!!c.isGroup,phone:/^\d{8,15}@c\.us$/.test(c.id._serialized)?'+'+c.id._serialized.split('@')[0]:null,stamp:Number(c.timestamp)||0,count:Number(c.unreadCount)||0}));
 const lids=rows.filter(c=>!c.isGroup&&c.chat.endsWith('@lid')).map(c=>c.chat),resolved=new Map();
 if(lids.length&&client.pupPage)try{for(const c of await client.pupPage.evaluate(cachedGroupContacts,lids))if(/^\d{8,15}@c\.us$/.test(c.phone||''))resolved.set(c.id,'+'+c.phone.split('@')[0]);}catch{}
 for(let i=0;i<lids.length;i+=50){const missing=lids.slice(i,i+50).filter(id=>!resolved.has(id));if(missing.length&&client.getContactLidAndPhone)try{for(const pair of await client.getContactLidAndPhone(missing))if(/^\d{8,15}@c\.us$/.test(pair.pn||''))resolved.set(pair.lid,'+'+pair.pn.split('@')[0]);}catch{}}
 for(const row of rows)if(resolved.has(row.chat))row.phone=resolved.get(row.chat);
 return rows.sort((a,b)=>b.stamp-a.stamp);
}
export async function groupContacts(client,id){
 if(!groupId(id))throw Error('Grupo inválido.');
 const chat=await client.getChatById(id);if(!chat.isGroup)throw Error('Selecione um grupo.');
 const ids=chat.participants.map(p=>p.id._serialized);let aliases=[];const names=new Map();
 if(client.pupPage){
  const cached=await client.pupPage.evaluate(cachedGroupContacts,ids);
  for(const c of cached){names.set(c.id,c.name);if(c.id.endsWith('@lid')&&c.phone)aliases.push({lid:c.id,pn:c.phone});}
 }else{try{for(const c of await client.getContacts())names.set(c.id?._serialized,c.name||c.pushname||c.shortName||'');}catch{}}
 const lids=ids.filter(id=>id.endsWith('@lid')&&!aliases.some(p=>p.lid===id));
 for(let i=0;i<lids.length;i+=50)try{aliases.push(...await client.getContactLidAndPhone(lids.slice(i,i+50)));}catch{}
 if(client.pupPage){const missing=ids.map(id=>id.endsWith('@c.us')?id:aliases.find(p=>p.lid===id)?.pn).filter(phone=>phone&&!names.get(phone));const resolved=await client.pupPage.evaluate(cachedGroupContacts,[...new Set(missing)]);for(const c of resolved)if(c.name)names.set(c.id,c.name);}
 const result=[],seen=new Set();let unresolved=0;
 for(const id of ids){
  const phone=id.endsWith('@c.us')?id:aliases.find(p=>p.lid===id)?.pn;
  if(!/^\d{8,15}@c\.us$/.test(phone||'')){unresolved++;continue;}
  const number='+'+phone.split('@')[0];if(seen.has(number))continue;seen.add(number);
  const name=names.get(id)||names.get(phone)||'';
  result.push({name:String(name||number).slice(0,200),phone:number});
 }
 return {groupId:id,groupName:String(chat.name||'Grupo WhatsApp').slice(0,200),contacts:result,unresolved,total:ids.length};
}
export async function allContacts(client,onProgress=()=>{}){
 const rows=await chatDirectory(client),groups=rows.filter(c=>c.isGroup),merged=new Map();
 const ids=await client.pupPage.evaluate(()=>window.require('WAWebCollections').Contact.getModelsArray().map(c=>c.id?._serialized).filter(id=>/^\d{8,20}@(c\.us|lid)$/.test(id||'')));
 const directIds=[...new Set([...ids,...rows.filter(c=>!c.isGroup).map(c=>c.chat)])];
 const direct=await cachedDirectoryContacts(client,directIds);
 for(const c of direct.contacts)merged.set(c.phone,{...c,groups:[]});let unresolved=direct.unresolved;
 for(let i=0;i<groups.length;i++){onProgress({group:i+1,totalGroups:groups.length});const result=await groupContacts(client,groups[i].chat);unresolved+=result.unresolved;for(const c of result.contacts){let item=merged.get(c.phone);if(!item){item={...c,groups:[]};merged.set(c.phone,item);}else if(item.name===item.phone&&c.name!==c.phone)item.name=c.name;item.groups.push({id:result.groupId,name:result.groupName});}}
 return {contacts:[...merged.values()],unresolved,totalGroups:groups.length};
}
async function cachedDirectoryContacts(client,ids){
 const contacts=[],cached=await client.pupPage.evaluate(cachedGroupContacts,ids),aliases=new Map();let unresolved=0;
 const missing=cached.filter(c=>c.id.endsWith('@lid')&&!c.phone).map(c=>c.id);
 for(let i=0;i<missing.length;i+=50)try{for(const pair of await client.getContactLidAndPhone(missing.slice(i,i+50)))if(pair.pn)aliases.set(pair.lid,pair.pn);}catch{}
 const extra=await client.pupPage.evaluate(cachedGroupContacts,[...new Set(aliases.values())]),names=new Map(extra.map(c=>[c.id,c.name]));
 for(const c of cached){const phone=c.phone||aliases.get(c.id);if(/^\d{8,15}@c\.us$/.test(phone||''))contacts.push({name:String(c.name||names.get(phone)||'+'+phone.split('@')[0]).slice(0,200),phone:'+'+phone.split('@')[0]});else unresolved++;}
 return {contacts,unresolved};
}
