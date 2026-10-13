const ready=new WeakSet();
export async function ensureUserDeletionSchema(env){
 if(ready.has(env.DB))return;
 for(const table of ['adminAccounts','affiliates']){const found=await env.DB.prepare("SELECT name FROM pragma_table_info(?) WHERE name='portalDeletedAt'").bind(table).first();if(!found)try{await env.DB.prepare('ALTER TABLE '+table+' ADD COLUMN portalDeletedAt TEXT').run();}catch(e){if(!/duplicate column/i.test(String(e.message)))throw e;}}
 ready.add(env.DB);
}
export async function deletePortalUser(env,actor,input,compare,send=null){
 await ensureUserDeletionSchema(env);
 const owner=String(actor).toLowerCase(),email=String(input.email||'').trim().toLowerCase();
 if(input.confirmed!==true||!email||!input.password)throw Error('Marque a confirmação e informe sua senha de administrador.');
 if(email===owner||email===String(env.ADMIN_EMAIL||'').toLowerCase())throw Error('Não é possível excluir sua própria conta ou o administrador principal.');
 const admin=await env.DB.prepare('SELECT passwordHash,accountType,adminRole,isActive FROM adminAccounts WHERE lower(email)=?').bind(owner).first();
 if(!admin||!Number(admin.isActive)||!['admin','both'].includes(admin.accountType))throw Error('Acesso administrativo necessário.');
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS userDeletionAttempts(actor TEXT PRIMARY KEY,attempts INTEGER NOT NULL,windowStart INTEGER NOT NULL)").run();
 const now=Date.now();
 const attempts=await env.DB.prepare('SELECT attempts,windowStart FROM userDeletionAttempts WHERE actor=?').bind(owner).first();
 if(Number(attempts?.attempts)>=5&&Number(attempts?.windowStart)>now-900000)throw Error('Muitas senhas incorretas. Aguarde 15 minutos antes de tentar novamente.');
 if(!await compare(String(input.password),String(admin.passwordHash))){
  await env.DB.prepare("INSERT INTO userDeletionAttempts(actor,attempts,windowStart) VALUES (?,1,?) ON CONFLICT(actor) DO UPDATE SET attempts=CASE WHEN windowStart<? THEN 1 ELSE attempts+1 END,windowStart=CASE WHEN windowStart<? THEN excluded.windowStart ELSE windowStart END").bind(owner,now,now-900000,now-900000).run();
  throw Error('Senha do administrador incorreta.');
 }
 await env.DB.prepare('DELETE FROM userDeletionAttempts WHERE actor=?').bind(owner).run();
 const target=await env.DB.prepare('SELECT id,adminRole,accountType FROM adminAccounts WHERE lower(email)=? AND portalDeletedAt IS NULL').bind(email).first();
 const affiliate=await env.DB.prepare('SELECT id FROM affiliates WHERE lower(email)=? AND portalDeletedAt IS NULL').bind(email).first();
 const assistantTable=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='portalAssistants'").first();
 const assistant=assistantTable?await env.DB.prepare('SELECT id FROM portalAssistants WHERE lower(email)=? AND deletedAt IS NULL').bind(email).first():null;
 if(!target&&!affiliate&&!assistant)throw Error('Usuário não encontrado.');
 if(target&&['admin','both'].includes(target.accountType)&&admin.adminRole!=='master')throw Error('Somente um administrador mestre pode excluir outro administrador.');
 // Keep the identity and financial references for audit; remove all portal access.
 const statements=[
  env.DB.prepare("UPDATE adminAccounts SET status='blocked',isActive=0,portalDeletedAt=CURRENT_TIMESTAMP,updatedAt=CURRENT_TIMESTAMP WHERE lower(email)=?").bind(email),
  env.DB.prepare("UPDATE affiliates SET status='blocked',isActive=0,portalDeletedAt=CURRENT_TIMESTAMP,updatedAt=CURRENT_TIMESTAMP WHERE lower(email)=?").bind(email),
  env.DB.prepare("INSERT INTO portalAuditLogs(actorEmail,action,entityType,targetId) VALUES (?,'Excluiu acesso do usuário','user',?)").bind(owner,email)
 ];
 if(assistant){statements.push(env.DB.prepare('UPDATE portalAssistants SET active=0,deletedAt=CURRENT_TIMESTAMP,sessionVersion=sessionVersion+1,updatedAt=CURRENT_TIMESTAMP WHERE id=?').bind(assistant.id));statements.push(env.DB.prepare('UPDATE assistantAgentAccess SET active=0 WHERE assistantId=?').bind(assistant.id));}
 await env.DB.batch(statements);
 let notification='not_requested';
 if(input.notifyUser===true){
  try{if(!send)throw Error('Mail unavailable');await send(env,{to:email,subject:'Affinity · Acesso à plataforma encerrado',text:'Informamos que seu acesso à plataforma Affinity Financial foi encerrado pela administração. Para esclarecer dúvidas, entre em contato com a equipe da Affinity. Este aviso não altera os registros administrativos necessários.',html:'<p>Informamos que seu acesso à plataforma <strong>Affinity Financial</strong> foi encerrado pela administração.</p><p>Para esclarecer dúvidas, entre em contato com a equipe da Affinity.</p><p>Este aviso não altera os registros administrativos necessários.</p>'});notification='accepted';}catch{notification='failed';console.error('user_deletion_notice_failed');}
  await env.DB.prepare("INSERT INTO portalAuditLogs(actorEmail,action,entityType,targetId) VALUES (?,?, 'user',?)").bind(owner,notification==='accepted'?'Aviso de exclusão aceito pelo servidor de e-mail':'Falha no aviso de exclusão',email).run();
 }
 return {success:true,notification};
}
