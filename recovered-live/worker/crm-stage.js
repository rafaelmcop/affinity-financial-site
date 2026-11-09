export function isActiveClientPolicy(policy) {
  const status=String(policy?.status||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
  return ['active','ativa','ativo','inforce','issued'].includes(status);
}
export function policyBelongsToCrmClient(policy,client) {
  if(String(policy.agentEmail||'').trim().toLowerCase()!==String(client.assignedAdminEmail||'').trim().toLowerCase())return false;
  if(Number(policy.clientId)>0)return Number(policy.clientId)===Number(client.id);
  const email=v=>String(v||'').trim().toLowerCase(),phone=v=>String(v||'').replace(/\D/g,'').slice(-10);
  return !!email(client.email)&&email(policy.clientEmail)===email(client.email)||phone(client.phone||client.whatsapp).length===10&&phone(policy.clientPhone)===phone(client.phone||client.whatsapp);
}
