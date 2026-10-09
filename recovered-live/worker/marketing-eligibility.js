export const MARKETING_START_DATE='2026-10-09';
export const MARKETING_START_UTC='2026-10-09 04:00:00'; // Midnight in America/New_York on the start date.
export function policyMarketingDate(value){
 const text=String(value||'').trim();let year,month,day;
 let match=/^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/.exec(text);
 if(match)[,year,month,day]=match;
 else if(match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)){[,month,day,year]=match;}
 else if(match=/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(text)){month=['january','february','march','april','may','june','july','august','september','october','november','december'].findIndex(m=>m===match[1].toLowerCase()||m.slice(0,3)===match[1].toLowerCase())+1;day=match[2];year=match[3];}
 else return null;
 const date=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));if(date.getUTCFullYear()!==Number(year)||date.getUTCMonth()+1!==Number(month)||date.getUTCDate()!==Number(day))return null;
 return date.toISOString().slice(0,10);
}
export function policyMarketingEligible(value){const date=policyMarketingDate(value);return !!date&&date>=MARKETING_START_DATE;}
export async function marketingEligibility(env,phone,payer){
 const policies=(await env.DB.prepare('SELECT p.issuedAt FROM centralPolicyLeadLinks l JOIN agentPolicies p ON p.id=l.policyId WHERE l.phone=? AND lower(l.agent)=lower(?)').bind(phone,payer).all()).results;
 if(policies.length){if(policies.some(p=>policyMarketingEligible(p.issuedAt)))return {eligible:true};return {eligible:false,reason:policies.every(p=>policyMarketingDate(p.issuedAt))?'ineligible_before_start':'awaiting_issue_date'};}
 const closure=await env.DB.prepare('SELECT confirmedAt FROM centralLeadClosures WHERE phone=? AND lower(agent)=lower(?)').bind(phone,payer).first();
 return {eligible:!!closure&&String(closure.confirmedAt)>=MARKETING_START_UTC,reason:'ineligible_before_start'};
}
export async function assertMarketingEligible(env,phone,payer){const eligibility=await marketingEligibility(env,phone,payer);if(!eligibility.eligible)throw Error(eligibility.reason==='awaiting_issue_date'?'Confirme a data de emissão da apólice antes de gerar obrigação de marketing.':'Apólice anterior a 09/10/2026: não elegível para obrigação de marketing.');}
