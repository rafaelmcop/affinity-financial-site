import {retentionSeconds} from './media-retention.mjs';
export function retentionSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS messageRetentionSequence(id INTEGER PRIMARY KEY CHECK(id=1),value INTEGER NOT NULL);
 INSERT OR IGNORE INTO messageRetentionSequence VALUES(1,0);
 UPDATE messageRetentionSequence SET value=max(value,coalesce((SELECT max(rowid) FROM messages),0)) WHERE id=1;
 CREATE TRIGGER IF NOT EXISTS messageRetentionCursor AFTER INSERT ON messages BEGIN
 UPDATE messageRetentionSequence SET value=max(value+1,NEW.rowid) WHERE id=1;
 UPDATE messages SET rowid=(SELECT value FROM messageRetentionSequence WHERE id=1) WHERE rowid=NEW.rowid;
 END;
 CREATE TABLE IF NOT EXISTS messageRetentionAcks(owner TEXT PRIMARY KEY,cursor INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS messageRetentionProtected(owner TEXT NOT NULL,id TEXT NOT NULL,reason TEXT NOT NULL,PRIMARY KEY(owner,id));
 PRAGMA secure_delete=ON;`);
}
export function acknowledgeArchive(db,owner,input,now=Date.now()){
 const cursor=Number(input.cursor),ids=input.protectedIds||[];
 if(!Number.isSafeInteger(cursor)||cursor<0||cursor>Number(db.prepare('SELECT value FROM messageRetentionSequence WHERE id=1').get().value)||!Array.isArray(ids)||ids.length>200||ids.some(id=>typeof id!=='string'||id.length>512))throw Error('Confirmação de arquivo inválida.');
 db.exec('BEGIN IMMEDIATE');try{
  for(const id of ids)if(db.prepare('SELECT 1 FROM messages WHERE owner=? AND id=? AND rowid<=?').get(owner,id,cursor))db.prepare("INSERT OR IGNORE INTO messageRetentionProtected VALUES(?,?,'unresolved_client')").run(owner,id);
  db.prepare('INSERT INTO messageRetentionAcks VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET cursor=max(cursor,excluded.cursor),updatedAt=excluded.updatedAt').run(owner,cursor,now);
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 return {ok:true};
}
export function pruneMessages(db,now=Date.now()){
 const cutoff=Math.floor(now/1000)-retentionSeconds;
 const result=db.prepare(`DELETE FROM messages WHERE stamp<=? AND mediaKey IS NULL
 AND (chat LIKE '%@g.us' OR rowid<=coalesce((SELECT cursor FROM messageRetentionAcks a WHERE a.owner=messages.owner),0))
 AND NOT EXISTS(SELECT 1 FROM messageRetentionProtected p WHERE p.owner=messages.owner AND p.id=messages.id)`).run(cutoff);
 db.prepare('DELETE FROM hidden_messages WHERE NOT EXISTS(SELECT 1 FROM messages m WHERE m.owner=hidden_messages.owner AND m.id=hidden_messages.id)').run();
 return {removed:Number(result.changes)};
}
