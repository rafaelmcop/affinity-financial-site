export const personalActivityPredicate="type<>'automation' AND content NOT LIKE 'E-mail automático enviado:%' AND content NOT LIKE 'Aviso de pagamento encaminhado automaticamente%' AND content NOT LIKE 'Mensagem de boas-vindas programada%'";
export const automaticEmailPredicate="(e.direction='sent' AND (coalesce(e.visibility,'client')='automation' OR coalesce(e.subject,'') LIKE 'Automático · %' OR EXISTS(SELECT 1 FROM crmActivities a WHERE a.clientId=e.clientId AND a.content LIKE 'Aviso de pagamento encaminhado automaticamente%' AND length(coalesce(e.externalId,''))>0 AND instr(a.content,e.externalId)>0)))";
export const personalEmailPredicate="coalesce(e.visibility,'client')='client' AND NOT "+automaticEmailPredicate;
export async function clientAutomations(db,clientId,owner){
 const [sent,failed,subscriptions]=await db.batch([
  db.prepare("SELECT e.id,e.subject,e.sentAt FROM clientEmails e WHERE e.clientId=? AND lower(e.agentEmail)=? AND "+automaticEmailPredicate+" ORDER BY e.sentAt DESC,e.id DESC LIMIT 30").bind(clientId,owner),
  db.prepare("SELECT id,subject,attemptedAt,errorMessage FROM crmDeliveryLogs WHERE clientId=? AND lower(agentEmail)=? AND messageId IS NOT NULL AND status='failed' ORDER BY attemptedAt DESC,id DESC LIMIT 10").bind(clientId,owner),
  db.prepare("SELECT occasion,isActive FROM crmAutomationSubscriptions WHERE clientId=? AND lower(agentEmail)=?").bind(clientId,owner)
 ]);
 return {sent:sent.results||[],failed:failed.results||[],subscriptions:subscriptions.results||[]};
}
