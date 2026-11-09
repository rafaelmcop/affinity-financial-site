// Password confirmations count only incorrect passwords; audit operations never store them.
export async function confirmAdmin(env,actor,input,compare){
 if(input.confirmed!==true||typeof input.password!=='string'||!input.password||input.password.length>256)throw Error('Confirme a operação e informe sua senha de administrador.');
 const row=await env.DB.prepare("SELECT passwordHash,isActive,status,accountType FROM adminAccounts WHERE lower(email)=? AND portalDeletedAt IS NULL").bind(actor.toLowerCase()).first();
 if(!row||!row.isActive||row.status!=='approved'||!['admin','both'].includes(row.accountType))throw Error('Acesso administrativo necessário.');
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS adminConfirmationAttempts(actor TEXT PRIMARY KEY,attempts INTEGER NOT NULL,windowStart INTEGER NOT NULL)').run();
 const now=Date.now(),key=actor.toLowerCase(),attempt=await env.DB.prepare('SELECT * FROM adminConfirmationAttempts WHERE actor=?').bind(key).first();
 if(attempt?.attempts>=5&&attempt.windowStart>now-900000)throw Error('Muitas senhas incorretas. Aguarde 15 minutos.');
 if(!await compare(input.password,row.passwordHash)){await env.DB.prepare('INSERT INTO adminConfirmationAttempts VALUES(?,1,?) ON CONFLICT(actor) DO UPDATE SET attempts=CASE WHEN windowStart<? THEN 1 ELSE attempts+1 END,windowStart=CASE WHEN windowStart<? THEN excluded.windowStart ELSE windowStart END').bind(key,now,now-900000,now-900000).run();throw Error('Senha do administrador incorreta.');}
 await env.DB.prepare('DELETE FROM adminConfirmationAttempts WHERE actor=?').bind(key).run();
}
