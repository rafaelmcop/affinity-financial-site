import {emailArchiveSchema,archiveRecoveredAttachments,messageKey} from './email-attachment-archive.js';
import {enrichArchivedDocuments} from './email-document-facts.js';
export async function recoverEmailAttachments(env,services){
 await emailArchiveSchema(env);const jobs=(await env.DB.prepare("SELECT * FROM emailAttachmentRecovery WHERE state='pending' AND attempts<3 ORDER BY updatedAt LIMIT 2").all()).results;
 for(const job of jobs){let client,found=false;try{
  ({client}=await services.open(env,job.owner));let sequence=1;
  for(const folder of ['Sent Messages','Sent','INBOX.Sent','[Gmail]/Sent Mail','[Gmail]/Enviados']){
   try{await client.command('EA'+sequence++,`SELECT ${services.quote(folder)}`);}catch{continue;}
   const key=messageKey(job.externalId);if(/[\r\n]/.test(key)||key.length>1000)throw Error('Invalid message reference');
   const search=await client.command('EA'+sequence++,`UID SEARCH HEADER Message-ID ${services.quote('<'+key+'>')}`),line=search.text.match(/(?:^|\r\n)\* SEARCH([^\r\n]*)/i)?.[1]||'';
   for(const uid of line.trim().split(/\s+/).filter(x=>/^\d+$/.test(x)).slice(-3)){
    const fetched=await client.command('EA'+sequence++,`UID FETCH ${uid} (BODY.PEEK[])`),source=services.literal(fetched.bytes);if(!source)continue;
    const parsed=await services.parse(source);if(messageKey(parsed.messageId)!==key)continue;
    const files=(parsed.attachments||[]).filter(file=>file.contentDisposition!=='inline');if(!files.length)continue;
    await archiveRecoveredAttachments(env,job.owner,key,job.clientId,files);found=true;await enrichArchivedDocuments(env,job.owner,key);break;
   }if(found)break;
  }
  await env.DB.prepare("UPDATE emailAttachmentRecovery SET state=?,attempts=attempts+1,updatedAt=CURRENT_TIMESTAMP WHERE owner=? AND externalId=?").bind(found?'recovered':'unavailable',job.owner,job.externalId).run();
 }catch{await env.DB.prepare("UPDATE emailAttachmentRecovery SET state=CASE WHEN attempts>=2 THEN 'unavailable' ELSE 'pending' END,attempts=attempts+1,updatedAt=CURRENT_TIMESTAMP WHERE owner=? AND externalId=?").bind(job.owner,job.externalId).run();console.error('email_attachment_recovery_failed');}finally{if(client)try{await client.close();}catch{}}
 }
}
