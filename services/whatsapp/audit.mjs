export function auditMessages(db,owner,cursor=0){
 const after=Number.isSafeInteger(Number(cursor))&&Number(cursor)>=0?Number(cursor):0;
 const rows=db.prepare("SELECT m.rowid AS cursor,m.id,m.chat,m.body,m.direction,m.stamp,m.ack,m.mime,m.filename,m.mediaKind,m.mediaState,coalesce(a.phone,CASE WHEN m.chat LIKE '%@c.us' THEN m.chat END) AS phone FROM messages m LEFT JOIN contactAliases a ON a.owner=m.owner AND a.lid=m.chat WHERE m.owner=? AND m.rowid>? AND (m.chat LIKE '%@c.us' OR m.chat LIKE '%@lid') ORDER BY m.rowid LIMIT 200").all(owner,after);
 return {messages:rows,cursor:rows.at(-1)?.cursor||after,more:rows.length===200};
}
