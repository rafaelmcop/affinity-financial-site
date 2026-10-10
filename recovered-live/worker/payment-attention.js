export function isOverduePaymentNotice(subject,body=''){
const title=String(subject||'');
if(/starting line|newsletter|linha de partida|issue notification|policy issued|ap[oó]lice emitida|emiss[aã]o de ap[oó]lice/i.test(title))return false;
const text=(title+'\n'+String(body||'')).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
return /\b(?:payment|premium|bank draft|billing|pagamento|cobran[cç]a)\s+(?:(?:was|is|has been|could not be|não foi|nao foi|foi|est[aá])\s+)?(?:returned|declined|failed|rejected|reversed|overdue|past due|not received|not processed|recusado|devolvido|atrasado|vencido|não processado|nao processado)\b|\b(?:returned|declined|failed|rejected|overdue|past due|unpaid|missed)\s+(?:premium\s+)?(?:payment|premium|bank draft)\b|\b(?:insufficient funds|non.?sufficient funds|fundos insuficientes|saldo insuficiente|nsf)\b/i.test(text);
}
export async function paymentTasks(env,owner,pendingOnly=false){
const rows=(await env.DB.prepare("SELECT * FROM agentTasks WHERE lower(agentEmail)=? "+(pendingOnly?"AND status='pending' ":"")+"ORDER BY status,dueAt").bind(owner).all()).results;
const uids=[...new Set(rows.map(r=>String(r.title||'').match(/^\[Pagamento\s+([^\]]+)\]/i)?.[1]).filter(Boolean))],notices=[];
for(let i=0;i<uids.length;i+=80){const chunk=uids.slice(i,i+80);notices.push(...(await env.DB.prepare('SELECT imapUid,subject,body FROM agentMailboxEmails WHERE lower(agentEmail)=? AND CAST(imapUid AS TEXT) IN ('+chunk.map(()=>'?').join(',')+')').bind(owner,...chunk).all()).results);}
const byUid=new Map(notices.map(row=>[String(row.imapUid),row]));
return rows.filter(row=>{const uid=String(row.title||'').match(/^\[Pagamento\s+([^\]]+)\]/i)?.[1],notice=byUid.get(uid);return isOverduePaymentNotice(notice?.subject||row.title,notice?.body||'');});
}
export async function dismissEmailNotification(env,owner,id){
if(!Number.isSafeInteger(id)||id<=0)throw Error('Notificação inválida.');
const result=await env.DB.prepare("UPDATE clientEmails SET readAt=COALESCE(readAt,CURRENT_TIMESTAMP) WHERE id=? AND lower(agentEmail)=? AND direction='received'").bind(id,owner).run();
if(!result.meta?.changes)throw Error('Notificação não encontrada.');
return {success:true};
}
