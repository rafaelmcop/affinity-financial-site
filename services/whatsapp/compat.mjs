// Executed only inside the bridge-owned WhatsApp Web session. The library
// still reads _serialized while newer WhatsApp key objects expose $1.
export function installKeyCompatibility(){
 const wid=window.require('WAWebWidFactory').createWid('123456789@c.us');
 const MsgKey=window.require('WAWebMsgKey');
 const sample=new MsgKey({fromMe:true,remote:wid,id:'COMPATIBILITYCHECK'});
 const serial=value=>typeof value==='string'?value:value?.$1||(value?.user&&value?.server?value.user+'@'+value.server:'');
 const install=(object,message)=>{
  if(typeof object._serialized==='string')return;
  const proto=Object.getPrototypeOf(object);
  if(!proto||Object.getOwnPropertyDescriptor(proto,'_serialized'))return;
  Object.defineProperty(proto,'_serialized',{configurable:true,get(){
   if(typeof this.$1==='string')return this.$1;
   if(!message)return serial(this);
   const remote=serial(this.remote);
   return typeof this.fromMe==='boolean'&&remote&&this.id?String(this.fromMe)+'_'+remote+'_'+this.id+(this.participant?'_'+serial(this.participant):''):undefined;
  }});
 };
 install(wid,false);install(sample,true);
 return {wid:typeof wid._serialized==='string',message:typeof sample._serialized==='string'};
}
