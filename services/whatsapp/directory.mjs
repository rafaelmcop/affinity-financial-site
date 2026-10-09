export const groupId=value=>/^\d{5,25}(?:-\d{5,25})?@g\.us$/.test(String(value||''));
export async function chatDirectory(client){
 const chats=await client.getChats();
 return chats.filter(c=>c.isGroup||/^\d{8,20}@(c\.us|lid)$/.test(c.id?._serialized||'')).map(c=>({chat:c.id._serialized,label:String(c.name||'Conversa WhatsApp'),archived:!!c.archived,isGroup:!!c.isGroup,stamp:Number(c.timestamp)||0,count:Number(c.unreadCount)||0})).sort((a,b)=>b.stamp-a.stamp);
}
export async function groupContacts(client,id){
 if(!groupId(id))throw Error('Grupo inválido.');
 const chat=await client.getChatById(id);if(!chat.isGroup)throw Error('Selecione um grupo.');
 const ids=chat.participants.map(p=>p.id._serialized);let aliases=[];const names=new Map();
 if(client.pupPage){
  const cached=await client.pupPage.evaluate(ids=>{
   const factory=window.require('WAWebWidFactory'),api=window.require('WAWebApiContact'),contacts=window.require('WAWebCollections').Contact,getters=window.require('WAWebContactGetters');
   return ids.map(id=>{const wid=factory.createWid(id),phone=wid.server==='lid'?api.getPhoneNumber(wid):wid,contact=contacts.get(wid)||(phone&&contacts.get(phone));let name='';try{if(contact)name=getters.getName(contact)||getters.getPushname(contact)||getters.getShortName(contact)||'';}catch{}return {id,phone:phone?._serialized,name};});
  },ids);
  for(const c of cached){names.set(c.id,c.name);if(c.id.endsWith('@lid')&&c.phone)aliases.push({lid:c.id,pn:c.phone});}
 }else{try{for(const c of await client.getContacts())names.set(c.id?._serialized,c.name||c.pushname||c.shortName||'');}catch{}}
 const lids=ids.filter(id=>id.endsWith('@lid')&&!aliases.some(p=>p.lid===id));
 for(let i=0;i<lids.length;i+=50)try{aliases.push(...await client.getContactLidAndPhone(lids.slice(i,i+50)));}catch{}
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
