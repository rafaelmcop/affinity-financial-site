// Only join identities explicitly returned by WhatsApp for this account.
export function initializeContacts(db){
 db.exec('CREATE TABLE IF NOT EXISTS contactAliases(owner TEXT NOT NULL,lid TEXT NOT NULL,phone TEXT NOT NULL,PRIMARY KEY(owner,lid));');
}
export function rememberContact(db,owner,pair){
 if(!/^\d{8,20}@lid$/.test(pair?.lid)||!/^\d{8,15}@c\.us$/.test(pair?.pn))return false;
 db.prepare('INSERT INTO contactAliases(owner,lid,phone) VALUES(?,?,?) ON CONFLICT(owner,lid) DO UPDATE SET phone=excluded.phone').run(owner,pair.lid,pair.pn);
 return true;
}
export function contactIds(db,owner,chat){
 const phone=db.prepare('SELECT phone FROM contactAliases WHERE owner=? AND lid=?').get(owner,chat)?.phone||chat;
 return [...new Set([chat,phone,...db.prepare('SELECT lid FROM contactAliases WHERE owner=? AND phone=?').all(owner,phone).map(r=>r.lid)])];
}
export function listContacts(db,owner){
 const rows=db.prepare('SELECT chat,MAX(stamp) stamp,COUNT(*) count FROM messages WHERE owner=? GROUP BY chat ORDER BY stamp DESC LIMIT 100').all(owner);
 const merged=new Map();
 for(const row of rows){
  const phone=db.prepare('SELECT phone FROM contactAliases WHERE owner=? AND lid=?').get(owner,row.chat)?.phone;
  const chat=phone||row.chat,prior=merged.get(chat);
  if(prior){prior.count+=row.count;prior.stamp=Math.max(prior.stamp,row.stamp);}else merged.set(chat,{...row,chat,label:chat.endsWith('@c.us')?'+'+chat.split('@')[0]:'Contato WhatsApp · '+chat.split('@')[0].slice(-4)});
 }
 return [...merged.values()].sort((a,b)=>b.stamp-a.stamp);
}
