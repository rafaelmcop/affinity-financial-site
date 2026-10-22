import {unresolvedDeliveryFailureSQL,deliveryFailurePresentation} from './delivery-reconciliation.js';
export const personalActivityPredicate="type<>'automation' AND content NOT LIKE 'E-mail automático enviado:%' AND content NOT LIKE 'Aviso de pagamento encaminhado automaticamente%' AND content NOT LIKE 'Mensagem de boas-vindas programada%'";
export const automaticEmailPredicate="(e.direction='sent' AND (coalesce(e.visibility,'client')='automation' OR coalesce(e.subject,'') LIKE 'Automático · %' OR EXISTS(SELECT 1 FROM crmActivities a WHERE a.clientId=e.clientId AND a.content LIKE 'Aviso de pagamento encaminhado automaticamente%' AND length(coalesce(e.externalId,''))>0 AND instr(a.content,e.externalId)>0)))";
export const personalEmailPredicate="coalesce(e.visibility,'client')='client' AND NOT "+automaticEmailPredicate;
export async function clientAutomations(db,clientId,owner){
 const [sent,failed,subscriptions,confirmed]=await db.batch([
  db.prepare("SELECT e.id,e.subject,e.sentAt FROM clientEmails e WHERE e.clientId=? AND lower(e.agentEmail)=? AND "+automaticEmailPredicate+" ORDER BY e.sentAt DESC,e.id DESC LIMIT 30").bind(clientId,owner),
  db.prepare("SELECT id,subject,attemptedAt,errorMessage FROM crmDeliveryLogs WHERE clientId=? AND lower(agentEmail)=? AND messageId IS NOT NULL AND status='failed' AND "+unresolvedDeliveryFailureSQL+" AND id IN (SELECT max(id) FROM crmDeliveryLogs WHERE clientId=? AND lower(agentEmail)=? AND status='failed' GROUP BY messageId,subject,errorMessage) ORDER BY attemptedAt DESC,id DESC LIMIT 10").bind(clientId,owner,clientId,owner),
  db.prepare("SELECT occasion,isActive FROM crmAutomationSubscriptions WHERE clientId=? AND lower(agentEmail)=?").bind(clientId,owner),
  db.prepare("SELECT d.id,replace(coalesce(nullif(m.subject,''),m.title),'{nome}',coalesce(c.name,'Cliente')) subject,d.sentAt FROM automationDeliveries d JOIN scheduledMessages m ON m.id=d.messageId JOIN crmClients c ON c.id=d.clientId WHERE d.clientId=? AND lower(m.agentEmail)=? AND lower(c.assignedAdminEmail)=? ORDER BY d.sentAt DESC,d.id DESC LIMIT 30").bind(clientId,owner,owner)
 ]);
 const history=sent.results||[],normalize=value=>String(value||'').replace(/^Automático · /,'').trim(),timestamp=value=>Date.parse(String(value||'').replace(' ','T')+'Z');
 const receipts=(confirmed.results||[]).filter(receipt=>!history.some(email=>normalize(email.subject)===normalize(receipt.subject)&&Math.abs(timestamp(email.sentAt)-timestamp(receipt.sentAt))<=120000)).map(receipt=>({...receipt,id:'delivery-'+receipt.id,source:'delivery_confirmation'}));
 return {sent:[...history,...receipts].sort((a,b)=>String(b.sentAt).localeCompare(String(a.sentAt))).slice(0,30),failed:(failed.results||[]).map(row=>({...row,...deliveryFailurePresentation(row)})),subscriptions:subscriptions.results||[]};
}
