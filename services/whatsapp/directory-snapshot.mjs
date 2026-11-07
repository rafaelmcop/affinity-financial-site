export function directorySchema(db){db.exec('CREATE TABLE IF NOT EXISTS chatDirectories(owner TEXT PRIMARY KEY,rowsJson TEXT NOT NULL,updatedAt INTEGER NOT NULL)');}
export async function directorySnapshot(db,owner,session,read,{now=Date.now,waitMs=4000,ttl=30000,timeoutMs=15000,onError=()=>{}}={}){
 if(!session.directory){const saved=db.prepare('SELECT rowsJson,updatedAt FROM chatDirectories WHERE owner=?').get(owner);if(saved)try{const rows=JSON.parse(saved.rowsJson);if(Array.isArray(rows))session.directory={rows,at:saved.updatedAt};}catch{}}
 if(!session.directory||now()-session.directory.at>ttl){
  if(!session.directoryPromise&&!(session.directoryRetryAt>now())){
   const job=Promise.resolve().then(read);let timer;
   session.directoryPromise=Promise.race([job,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('directory_timeout')),timeoutMs);})]).then(rows=>{
    if(!Array.isArray(rows))throw Error('invalid_directory');
    session.directory={rows,at:now()};db.prepare('INSERT INTO chatDirectories(owner,rowsJson,updatedAt) VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET rowsJson=excluded.rowsJson,updatedAt=excluded.updatedAt').run(owner,JSON.stringify(rows),now());
   }).catch(error=>{session.directoryRetryAt=now()+ttl;onError(error);}).finally(()=>{clearTimeout(timer);session.directoryPromise=null;});
  }
  if(!session.directory){let timer;try{await Promise.race([session.directoryPromise,new Promise(resolve=>{timer=setTimeout(resolve,waitMs);})]);}finally{clearTimeout(timer);}}
 }
 return session.directory?{rows:session.directory.rows}:{error:true};
}
