export function initializeReadState(db,now=Math.floor(Date.now()/1000)){
 db.exec('CREATE TABLE IF NOT EXISTS messageReads(owner TEXT NOT NULL,id TEXT NOT NULL,readAt INTEGER NOT NULL,source TEXT NOT NULL,PRIMARY KEY(owner,id)); CREATE TABLE IF NOT EXISTS readStateMeta(key TEXT PRIMARY KEY,value INTEGER NOT NULL);');
 if(!db.prepare("SELECT value FROM readStateMeta WHERE key='epoch'").get()){
  db.exec('BEGIN IMMEDIATE');
  try{db.prepare("INSERT INTO readStateMeta VALUES('epoch',?)").run(now);
   db.prepare("INSERT OR IGNORE INTO messageReads SELECT owner,id,?,'baseline' FROM messages WHERE direction='received'").run(now);db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
}
export function rememberHistoricalRead(db,owner,id,stamp,direction){
 const epoch=db.prepare("SELECT value FROM readStateMeta WHERE key='epoch'").get().value;
 if(direction==='received'&&stamp<epoch)db.prepare("INSERT OR IGNORE INTO messageReads VALUES(?,?,?,'baseline')").run(owner,id,epoch);
}
export function synchronizeUnread(db,owner,chats,count){
 if(!Number.isInteger(count)||count<1||!chats.length)return;
 const rows=db.prepare('SELECT id FROM messages WHERE owner=? AND direction=\'received\' AND chat IN ('+chats.map(()=>'?').join(',')+') ORDER BY stamp DESC LIMIT ?').all(owner,...chats,Math.min(count,5000));
 const clear=db.prepare("DELETE FROM messageReads WHERE owner=? AND id=? AND source='baseline'");
 for(const row of rows)clear.run(owner,row.id);
}
export function markRead(db,owner,ids,now=Math.floor(Date.now()/1000)){
 const write=db.prepare("INSERT INTO messageReads(owner,id,readAt,source) SELECT owner,id,?,'portal' FROM messages WHERE owner=? AND id=? AND direction='received' ON CONFLICT(owner,id) DO UPDATE SET readAt=excluded.readAt,source='portal'");
 const read=[];
 for(const id of new Set(ids)){if(typeof id==='string'&&id.length<300&&write.run(now,owner,id).changes)read.push(id);}
 return read;
}
