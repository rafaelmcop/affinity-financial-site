// Runs inside the bridge-owned WhatsApp session, joining only confirmed identities.
export async function resolveContacts(ids){
 const serial=value=>typeof value==='string'?value:value?._serialized||value?.$1||(value?.user&&value?.server?String(value.user)+'@'+value.server:null);
 return Promise.all(ids.map(async id=>{
  try{const pair=await window.WWebJS.enforceLidAndPnRetrieval(id);return {lid:serial(pair.lid),pn:serial(pair.phone)};}catch{return null;}
 }));
}
