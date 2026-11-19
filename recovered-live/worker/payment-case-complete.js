export function paymentPolicyKey(value){let s=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^LS(?=\d)/,'');if(/^\d+$/.test(s)){s=s.replace(/^0+/,'');if(s.length===9&&s.endsWith('00'))s=s.slice(0,-2);}return s;}
// Fill only missing fields and only after a unique policy number from the notice
// agrees with the policy in this owner's account. Never guess another policy.
export async function completePaymentCase(env,owner,policy,sources,amount,mailboxId,taskId){
 if(!policy?.id)return policy;const keys=[...new Set(sources.map(paymentPolicyKey).filter(Boolean))];
 let current=await env.DB.prepare('SELECT * FROM agentPolicies WHERE id=? AND lower(agentEmail)=?').bind(Number(policy.id),owner).first();
 if(!current||keys.length!==1)return policy;
 if(!String(current.policyNumber||'').trim()&&current.clientId){
  const count=await env.DB.prepare('SELECT count(*) total FROM agentPolicies WHERE lower(agentEmail)=? AND clientId=?').bind(owner,current.clientId).first();
  if(Number(count?.total)===1){const number=String(sources[0]||'').trim().toUpperCase();if(/^[A-Z0-9-]{5,30}$/.test(number)){await env.DB.prepare("UPDATE agentPolicies SET policyNumber=? WHERE id=? AND lower(agentEmail)=? AND trim(coalesce(policyNumber,''))=''").bind(number,current.id,owner).run();current={...current,policyNumber:number};}}
 }
 if(keys[0]!==paymentPolicyKey(current.policyNumber))return policy;
 const monthly=['','monthly','mensal','month'].includes(String(current.premiumFrequency||'').trim().toLowerCase());
 if(monthly&&Number.isFinite(amount)&&amount>0&&Number(current.premiumAmount||0)<=0){
  await env.DB.prepare("UPDATE agentPolicies SET premiumAmount=?,premiumFrequency=CASE WHEN trim(coalesce(premiumFrequency,''))='' THEN 'monthly' ELSE premiumFrequency END,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND lower(agentEmail)=? AND coalesce(premiumAmount,0)<=0").bind(amount,Number(current.id),owner).run();
 }
 if(mailboxId)await env.DB.prepare("UPDATE agentMailboxEmails SET policyNumber=CASE WHEN trim(coalesce(policyNumber,''))='' THEN ? ELSE policyNumber END,clientId=coalesce(clientId,?) WHERE id=? AND lower(agentEmail)=? AND (trim(coalesce(policyNumber,''))='' OR clientId IS NULL)").bind(current.policyNumber,current.clientId||null,Number(mailboxId),owner).run();
 if(taskId&&current.clientId)await env.DB.prepare('UPDATE agentTasks SET clientId=? WHERE id=? AND lower(agentEmail)=? AND clientId IS NULL').bind(current.clientId,Number(taskId),owner).run();
 return await env.DB.prepare('SELECT * FROM agentPolicies WHERE id=? AND lower(agentEmail)=?').bind(Number(current.id),owner).first();
}
// A notice may reference a policy not yet imported. Keep the identified contact
// linked for communication and audit without inventing or substituting a policy.
export async function linkPaymentCaseContact(env,owner,clientId,mailboxId,taskId){
 if(!Number.isSafeInteger(Number(clientId))||Number(clientId)<=0)return;
 const client=await env.DB.prepare('SELECT id FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(Number(clientId),owner).first();if(!client)return;
 await env.DB.batch([
  env.DB.prepare('UPDATE agentTasks SET clientId=? WHERE id=? AND lower(agentEmail)=? AND clientId IS NULL').bind(Number(clientId),Number(taskId),owner),
  env.DB.prepare('UPDATE agentMailboxEmails SET clientId=? WHERE id=? AND lower(agentEmail)=? AND clientId IS NULL').bind(Number(clientId),Number(mailboxId||0),owner)
 ]);
}
