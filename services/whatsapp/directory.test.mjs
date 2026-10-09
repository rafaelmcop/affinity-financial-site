import {test} from 'node:test';import assert from 'node:assert/strict';import {chatDirectory,groupContacts,groupId} from './directory.mjs';
test('directory retains archived chats and groups without messages',async()=>{
 const rows=await chatDirectory({getChats:async()=>[{id:{_serialized:'123456789@c.us'},name:'Arquivada',archived:true,timestamp:3},{id:{_serialized:'123456789@g.us'},name:'Grupo',isGroup:true,timestamp:4},{id:{_serialized:'status@broadcast'}}]});
 assert.equal(rows.length,2);assert.equal(rows[0].isGroup,true);assert.equal(rows[1].archived,true);assert.equal(groupId('12345-67890@g.us'),true);assert.equal(groupId('123456789@c.us'),false);
});
test('group export deduplicates resolved phones and reports unavailable numbers',async()=>{
 const client={getChatById:async()=>({isGroup:true,name:'Grupo',participants:[{id:{_serialized:'123456789@c.us'}},{id:{_serialized:'111111111@lid'}},{id:{_serialized:'222222222@lid'}}]}),getContactLidAndPhone:async()=>[{lid:'111111111@lid',pn:'123456789@c.us'}],getContacts:async()=>[{id:{_serialized:'123456789@c.us'},pushname:'Contato'}]};
 const result=await groupContacts(client,'123456789@g.us');assert.equal(result.contacts.length,1);assert.equal(result.unresolved,1);assert.equal(result.total,3);await assert.rejects(()=>groupContacts(client,'status@broadcast'));
});
test('group export reads cached identities and names without bulk business-profile requests',async()=>{
 const previous=globalThis.window;const person={name:'Pessoa'};
 globalThis.window={require:key=>({'WAWebWidFactory':{createWid:id=>({_serialized:id,server:id.split('@')[1]})},'WAWebApiContact':{getPhoneNumber:()=>({_serialized:'123456789@c.us'})},'WAWebCollections':{Contact:{get:()=>person}},'WAWebContactGetters':{getName:()=>{throw Error('Missing getter');},getPushname:c=>c.name,getShortName:()=>''}}[key])};
 try{const client={getChatById:async()=>({isGroup:true,name:'Grupo',participants:[{id:{_serialized:'111111111@lid'}}]}),pupPage:{evaluate:async(fn,arg)=>fn(arg)},getContactLidAndPhone:()=>{throw Error('Cached mapping must avoid identity queries');},getContacts:()=>{throw Error('Must avoid bulk profiles');}};const result=await groupContacts(client,'123456789@g.us');assert.equal(result.contacts[0].phone,'+123456789');assert.equal(result.contacts[0].name,'Pessoa');}finally{globalThis.window=previous;}
});
test('all contacts merge saved contacts and all groups with source membership and names',async()=>{
 const {allContacts}=await import('./directory.mjs'),previous=globalThis.window;const saved={id:{_serialized:'123456781@c.us'},name:'Salvo'},models=new Map([[saved.id._serialized,saved],['123456782@c.us',{name:'Perfil'}]]);
 globalThis.window={require:key=>({'WAWebWidFactory':{createWid:id=>({_serialized:id,server:id.split('@')[1]})},'WAWebApiContact':{getCurrentLid:()=>null},'WAWebCollections':{Contact:{get:id=>models.get(id._serialized),getModelsArray:()=>[saved]}},'WAWebContactGetters':{getName:c=>c.name,getPushname:()=>'',getShortName:()=>''}}[key])};
 try{const client={pupPage:{evaluate:async(fn,arg)=>fn(arg)},getChats:async()=>[{id:{_serialized:'123456781@c.us'},name:'Salvo'},{id:{_serialized:'111111111@g.us'},name:'Grupo A',isGroup:true},{id:{_serialized:'222222222@g.us'},name:'Grupo B',isGroup:true}],getChatById:async id=>({isGroup:true,name:id==='111111111@g.us'?'Grupo A':'Grupo B',participants:[{id:{_serialized:'123456782@c.us'}}]})};const result=await allContacts(client);assert.equal(result.contacts.length,2);assert.equal(result.contacts.find(c=>c.name==='Perfil').groups.length,2);assert.equal(result.totalGroups,2);}finally{globalThis.window=previous;}
});
