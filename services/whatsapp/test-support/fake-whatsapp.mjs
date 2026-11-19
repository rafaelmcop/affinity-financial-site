import{EventEmitter}from'node:events';import{appendFileSync}from'node:fs';
class Client extends EventEmitter{
 constructor(){super();this.info={wid:{user:'15550001111'}};this.pupPage={evaluate:async(fn,ids)=>{if(fn.name==='installKeyCompatibility')return{wid:true,message:true};if(fn.name==='installMediaIdentityCompatibility')return{ok:true};if(fn.name==='cachedChatList')return[{id:{_serialized:'12345@g.us'},name:'Fixture group',archived:true,isGroup:true,timestamp:1}];if(fn.name==='cachedGroupContacts')return(ids||[]).map(id=>({id,phone:id,name:'Fixture contact'}));return['15550002222@c.us'];}};}
 async initialize(){setTimeout(()=>{this.emit('ready');setTimeout(()=>{const m={id:{_serialized:'false_15550002222@c.us_RECEIVED'},from:'15550002222@c.us',to:'15550001111@c.us',fromMe:false,body:'Private incoming fixture',timestamp:Math.floor(Date.now()/1000),hasMedia:true,_data:{mimetype:'image/png'},downloadMedia:async()=>{appendFileSync(process.env.TEST_DOWNLOAD_MARKER,'download\n');return{mimetype:'image/png',data:'AA==',filename:'fixture.png'};}};this.emit('message',m);this.emit('message_create',m);},40);},5);}
 async getNumberId(phone){return{_serialized:phone+'@c.us'};}
 async getChatById(id){return{id:{_serialized:id},isGroup:true,name:'Fixture group',participants:[{id:{_serialized:'15550002222@c.us'}}]};}
 async getContactLidAndPhone(){return[];}
 async sendMessage(chat,text){const m={id:{_serialized:'true_'+chat+'_SENT'},from:'15550001111@c.us',to:chat,fromMe:true,body:text,timestamp:Math.floor(Date.now()/1000),ack:1};this.emit('message_create',m);return m;}
 async destroy(){}async logout(){throw Error('Test must preserve authentication');}
}
class LocalAuth{constructor(options){this.options=options;}}
export default{Client,LocalAuth};
