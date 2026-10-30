import {corporateMessage} from './corporate-email.js';
export async function assistantMessageSender(env,owner,identity){
 const row=await env.DB.prepare("SELECT p.id,p.email,p.name,c.address,c.state FROM portalAssistants p JOIN assistantAgentAccess l ON l.assistantId=p.id LEFT JOIN assistantCommunications c ON c.assistantId=p.id WHERE p.id=? AND lower(p.email)=? AND p.active=1 AND p.deletedAt IS NULL AND l.active=1 AND lower(l.owner)=?").bind(Number(identity.assistantId),String(identity.actorEmail).toLowerCase(),owner.toLowerCase()).first();
 if(!row)throw Object.assign(Error('O vínculo da assistente não está mais ativo.'),{notSent:true,status:403});return row;
}
export async function sendAssistantMessageEmail(env,owner,identity,options){
 const assistant=await assistantMessageSender(env,owner,identity);
 if(assistant.state!=='ready'||!assistant.address)throw Object.assign(Error('O e-mail corporativo da assistente ainda não está pronto. Abra Meu e-mail corporativo.'),{notSent:true,status:409});
 const sender=await env.DB.prepare('SELECT address,displayName FROM domainEmailSenders WHERE owner=? AND address=? AND enabled=1').bind(assistant.email,assistant.address).first();
 if(!sender||!env.CORPORATE_EMAIL?.send)throw Object.assign(Error('O envio corporativo da assistente está indisponível.'),{notSent:true,status:503});
 let prepared;try{prepared=corporateMessage(sender,options);}catch(error){error.notSent=true;throw error;}
 const sent=await env.CORPORATE_EMAIL.send(prepared);if(!sent?.messageId)throw Error('O serviço não confirmou o envio. Confira o histórico antes de repetir.');
 await env.DB.prepare("INSERT OR IGNORE INTO assistantMailbox(assistantId,direction,externalId,fromEmail,toEmail,subject,body) VALUES(?,'sent',?,?,?,?,?)").bind(assistant.id,sent.messageId,sender.address,String(options.to),String(options.subject),String(options.text||options.html||'')).run();
 return {messageId:sent.messageId,fromEmail:sender.address};
}
