export function visibilitySchema(db){db.exec('CREATE TABLE IF NOT EXISTS hidden_messages(owner TEXT NOT NULL,id TEXT NOT NULL,hiddenAt INTEGER NOT NULL,PRIMARY KEY(owner,id))');}
export function hideMessage(db,owner,ids,input){
 if(input.confirmed!==true)throw Error('Confirme para apagar a mensagem do portal.');
 if(typeof input.id!=='string'||input.id.length>512)return false;
 const row=db.prepare('SELECT id,chat FROM messages WHERE owner=? AND id=?').get(owner,input.id);
 if(!row||!ids.includes(row.chat))return false;
 db.prepare('INSERT OR IGNORE INTO hidden_messages(owner,id,hiddenAt) VALUES(?,?,?)').run(owner,input.id,Date.now());return true;
}
export function restoreMessages(db,owner,ids){return db.prepare('DELETE FROM hidden_messages WHERE owner=? AND id IN (SELECT id FROM messages WHERE owner=? AND chat IN ('+ids.map(()=>'?').join(',')+'))').run(owner,owner,...ids).changes;}
