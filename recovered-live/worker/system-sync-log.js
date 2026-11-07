const safePath=value=>/^\/api\/[a-zA-Z0-9/.,_-]{1,1024}$/.test(value||'')?value:'';
const incidentKey=input=>safePath(input.path)||input.event;
export async function syncLogSchema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS systemSyncLogs(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,event TEXT NOT NULL,state TEXT NOT NULL,count INTEGER,path TEXT,httpStatus INTEGER,errorCode TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 try{await db.prepare('SELECT path,httpStatus,errorCode FROM systemSyncLogs LIMIT 0').first();}catch{for(const column of ['path TEXT','httpStatus INTEGER','errorCode TEXT'])try{await db.prepare('ALTER TABLE systemSyncLogs ADD COLUMN '+column).run();}catch{}}
}
export async function resolveImportantLog(db,owner,input){
 await db.prepare('CREATE TABLE IF NOT EXISTS systemAlertIncidents(owner TEXT,event TEXT,incidentKey TEXT,active INTEGER DEFAULT 1,firstSeen TEXT DEFAULT CURRENT_TIMESTAMP,lastSeen TEXT DEFAULT CURRENT_TIMESTAMP,status TEXT DEFAULT \'pending\',attempts INTEGER DEFAULT 0,retryAt INTEGER DEFAULT 0,PRIMARY KEY(owner,event,incidentKey))').run();
 return db.prepare('UPDATE systemAlertIncidents SET active=0,lastSeen=CURRENT_TIMESTAMP WHERE owner=? AND event=? AND incidentKey=? AND active=1').bind(owner,input.event,incidentKey(input)).run();
}
export async function recordSyncLog(db,owner,input){
 if(!['contacts','service','email','calendar','five_rings','whatsapp'].includes(input.event)||!['started','continuing','completed','error','attention'].includes(input.state))throw Error('Evento de sincronização inválido.');
 await syncLogSchema(db);await db.prepare('INSERT INTO systemSyncLogs(owner,event,state,count,path,httpStatus,errorCode) VALUES(?,?,?,?,?,?,?)').bind(owner,input.event,input.state,input.count!=null&&Number.isFinite(Number(input.count))?Number(input.count):null,safePath(input.path)||null,Number.isInteger(input.httpStatus)?input.httpStatus:null,/^[a-zA-Z0-9_.-]{1,80}$/.test(input.errorCode||'')?input.errorCode:null).run();
 if(input.state==='completed')await resolveImportantLog(db,owner,input);return {success:true};
}
export async function notifyImportantLog(env,owner,input,send){
 if(!['error','attention'].includes(input.state))return;
 const recipient=String(env.SYSTEM_ALERT_EMAIL||'admin@affinityfc.org').toLowerCase();
 if(!await env.DB.prepare("SELECT 1 FROM adminAccounts WHERE lower(email)=? AND accountType IN ('admin','both') AND status='approved' AND isActive=1").bind(recipient).first())return;
 await resolveImportantLog(env.DB,'__schema__',{event:'service'});
 const key=incidentKey(input),now=Date.now();
 await env.DB.prepare("INSERT INTO systemAlertIncidents(owner,event,incidentKey) VALUES(?,?,?) ON CONFLICT(owner,event,incidentKey) DO UPDATE SET lastSeen=CURRENT_TIMESTAMP,firstSeen=CASE WHEN active=0 THEN CURRENT_TIMESTAMP ELSE firstSeen END,status=CASE WHEN active=0 THEN 'pending' ELSE status END,attempts=CASE WHEN active=0 THEN 0 ELSE attempts END,retryAt=CASE WHEN active=0 THEN 0 ELSE retryAt END,active=1").bind(owner,input.event,key).run();
 const reserved=await env.DB.prepare("UPDATE systemAlertIncidents SET status='sending',attempts=attempts+1 WHERE owner=? AND event=? AND incidentKey=? AND active=1 AND (status='pending' OR (status='failed' AND attempts<3 AND retryAt<=?))").bind(owner,input.event,key,now).run();if(!reserved.meta?.changes)return;
 const detail=safePath(input.path)?'<p>Operação: '+safePath(input.path)+(Number.isInteger(input.httpStatus)?' · HTTP '+input.httpStatus:'')+'</p>':'';
 try{await send(env,{to:recipient,subject:'Affinity · Alerta importante do sistema',html:'<p>Uma falha de sincronização ou serviço exige atenção.</p>'+detail+'<p>Este aviso corresponde a um incidente; repetições ficam apenas no log administrativo.</p><p><a href="https://www.affinityfc.org/admin/logs-sistema">Abrir logs do sistema</a></p>'});await env.DB.prepare("UPDATE systemAlertIncidents SET status='sent' WHERE owner=? AND event=? AND incidentKey=?").bind(owner,input.event,key).run();}catch{await env.DB.prepare("UPDATE systemAlertIncidents SET status='failed',retryAt=? WHERE owner=? AND event=? AND incidentKey=?").bind(now+300000,owner,input.event,key).run();}
}
// Keep the original failure for audit; recovery is a later successful event for
// the same owner, event and operation, never an unrelated request in a batch.
export async function listSyncLogs(db){await syncLogSchema(db);return (await db.prepare("SELECT l.*,(SELECT min(ok.createdAt) FROM systemSyncLogs ok WHERE ok.owner=l.owner AND ok.event=l.event AND ok.path IS l.path AND ok.state='completed' AND ok.id>l.id) resolvedAt FROM systemSyncLogs l ORDER BY l.id DESC LIMIT 200").all()).results||[];}
