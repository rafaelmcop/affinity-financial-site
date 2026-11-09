export async function sendPaymentCase(env,owner,input,send,html){
 if(input.confirmed!==true)throw Error('Confirme o envio do e-mail.');const subject=String(input.subject||'').trim(),body=String(input.body||'').trim();if(!subject||subject.length>500||!body||body.length>50000)throw Error('Revise o assunto e a mensagem.');
 const task=await env.DB.prepare("SELECT * FROM agentTasks WHERE id=? AND lower(agentEmail)=? AND title LIKE '[Pagamento %'").bind(Number(input.taskId),owner).first();if(!task)throw Error('Pendência não encontrada.');
 const client=await env.DB.prepare('SELECT id,email FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(Number(task.clientId),owner).first();if(!client||!/^\S+@\S+\.\S+$/.test(String(client.email||'')))throw Error('Relacione o cliente e confira seu e-mail antes de enviar.');
 const config=await env.DB.prepare('SELECT fromEmail FROM agentEmailSettings WHERE lower(agentEmail)=?').bind(owner).first();if(!config)throw Error('Configure o e-mail do agente antes de enviar.');
 const uid=String(task.title).match(/^\[Pagamento\s+([^\]]+)\]/)?.[1];const notice=uid?await env.DB.prepare('SELECT id,actionStatus FROM agentMailboxEmails WHERE lower(agentEmail)=? AND CAST(imapUid AS TEXT)=?').bind(owner,uid).first():null;
 if(notice?.actionStatus==='sent')throw Error('O aviso deste caso já foi enviado. Consulte a auditoria.');
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS paymentCaseEmailDispatches(owner TEXT,taskId INTEGER,status TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(owner,taskId))').run();
 const reservation=await env.DB.prepare("INSERT OR IGNORE INTO paymentCaseEmailDispatches(owner,taskId,status) VALUES(?,?,'processing')").bind(owner,task.id).run();
 if(!reservation.meta?.changes){const retry=await env.DB.prepare("UPDATE paymentCaseEmailDispatches SET status='processing' WHERE owner=? AND taskId=? AND status='failed'").bind(owner,task.id).run();if(!retry.meta?.changes)throw Error('Este envio já foi iniciado ou concluído. Consulte a auditoria antes de repetir.');}
 let sent;try{sent=await send(env,owner,{to:String(client.email),subject,html:html(body)});}catch(e){await env.DB.prepare("UPDATE paymentCaseEmailDispatches SET status='failed' WHERE owner=? AND taskId=?").bind(owner,task.id).run();throw e;}
 await env.DB.prepare("UPDATE paymentCaseEmailDispatches SET status='sent' WHERE owner=? AND taskId=?").bind(owner,task.id).run();
 const ref=String(sent.messageId||'payment-manual:'+owner+':'+task.id);
 await env.DB.batch([
  env.DB.prepare("INSERT INTO clientEmails(agentEmail,clientId,direction,externalId,subject,body,fromEmail,toEmail,sentAt,visibility) VALUES(?,?,'sent',?,?,?,?,?,CURRENT_TIMESTAMP,'client')").bind(owner,client.id,ref,subject,body,config.fromEmail,client.email),
  env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'email',?,?)").bind(client.id,'E-mail enviado pelo portal: '+subject,owner),
  env.DB.prepare("UPDATE agentMailboxEmails SET actionStatus='sent',actionDetail='Aviso enviado pelo agente no portal' WHERE id=? AND lower(agentEmail)=?").bind(notice?.id||0,owner)
 ]);return {success:true};
}
