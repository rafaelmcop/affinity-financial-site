export async function deletePortalUser(env,actor,input,compare){
 const owner=String(actor).toLowerCase(),email=String(input.email||'').trim().toLowerCase();
 if(input.confirmed!==true||!email||!input.password)throw Error('Marque a confirmação e informe sua senha de administrador.');
 if(email===owner||email===String(env.ADMIN_EMAIL||'').toLowerCase())throw Error('Não é possível excluir sua própria conta ou o administrador principal.');
 const admin=await env.DB.prepare('SELECT passwordHash,accountType,adminRole,isActive FROM adminAccounts WHERE lower(email)=?').bind(owner).first();
 if(!admin||!Number(admin.isActive)||!['admin','both'].includes(admin.accountType))throw Error('Acesso administrativo necessário.');
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS userDeletionAttempts(actor TEXT PRIMARY KEY,attempts INTEGER NOT NULL,windowStart INTEGER NOT NULL)").run();
 const now=Date.now();
 await env.DB.prepare("INSERT INTO userDeletionAttempts(actor,attempts,windowStart) VALUES (?,1,?) ON CONFLICT(actor) DO UPDATE SET attempts=CASE WHEN windowStart<? THEN 1 ELSE attempts+1 END,windowStart=CASE WHEN windowStart<? THEN excluded.windowStart ELSE windowStart END").bind(owner,now,now-900000,now-900000).run();
 const attempts=await env.DB.prepare('SELECT attempts FROM userDeletionAttempts WHERE actor=?').bind(owner).first();
 if(Number(attempts.attempts)>5)throw Error('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.');
 if(!await compare(String(input.password),String(admin.passwordHash)))throw Error('Senha do administrador incorreta.');
 const target=await env.DB.prepare('SELECT id,adminRole,accountType FROM adminAccounts WHERE lower(email)=?').bind(email).first();
 const affiliate=await env.DB.prepare('SELECT id FROM affiliates WHERE lower(email)=?').bind(email).first();
 if(!target&&!affiliate)throw Error('Usuário não encontrado.');
 if(target&&['admin','both'].includes(target.accountType)&&admin.adminRole!=='master')throw Error('Somente um administrador mestre pode excluir outro administrador.');
 // Keep the identity and financial references for audit; remove all portal access.
 await env.DB.batch([
  env.DB.prepare("UPDATE adminAccounts SET status='deleted',isActive=0,updatedAt=CURRENT_TIMESTAMP WHERE lower(email)=?").bind(email),
  env.DB.prepare("UPDATE affiliates SET status='deleted',isActive=0,updatedAt=CURRENT_TIMESTAMP WHERE lower(email)=?").bind(email),
  env.DB.prepare("INSERT INTO portalAuditLogs(actorEmail,action,entityType,targetId) VALUES (?,'Excluiu acesso do usuário','user',?)").bind(owner,email)
 ]);
 return {success:true};
}
