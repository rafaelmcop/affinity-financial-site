// This device only. Non-extractable browser key; no credentials are sent to Affinity.
export async function encryptAccount(account,cryptoImpl=crypto){
 const key=await cryptoImpl.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const iv=cryptoImpl.getRandomValues(new Uint8Array(12));
 const value={name:account.name,server:account.server,username:account.username,password:account.password};
 const ciphertext=await cryptoImpl.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));
 return{version:1,key,iv,ciphertext};
}
export async function decryptAccount(record,cryptoImpl=crypto){
 if(record?.version!==1)return null;
 const plain=await cryptoImpl.subtle.decrypt({name:'AES-GCM',iv:record.iv},record.key,record.ciphertext);
 const value=JSON.parse(new TextDecoder().decode(plain));
 if(!value||['name','server','username','password'].some(key=>typeof value[key]!=='string'))throw Error('Invalid saved connection');
 return value;
}
async function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('affinity-play-device',1);const timer=setTimeout(()=>reject(Error('Device storage unavailable')),5000);request.onupgradeneeded=()=>request.result.createObjectStore('connection');request.onerror=()=>{clearTimeout(timer);reject(Error('Device storage unavailable'));};request.onblocked=()=>{clearTimeout(timer);reject(Error('Device storage unavailable'));};request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};});}
async function recordOperation(mode,operation){const db=await database();try{return await new Promise((resolve,reject)=>{let result;const tx=db.transaction('connection',mode);const request=operation(tx.objectStore('connection'));request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('Device storage unavailable'));});}finally{db.close();}}
export async function saveAccount(account){const record=await encryptAccount(account);await recordOperation('readwrite',store=>store.put(record,'iptv'));}
export async function readAccount(){const record=await recordOperation('readonly',store=>store.get('iptv'));return record?decryptAccount(record):null;}
export async function forgetAccount(){await recordOperation('readwrite',store=>store.clear());}
