export const compactClientName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
export function findPaymentClient(clients,subject,body='',policyClientIds=[]){
 const notice=compactClientName(String(subject)+'\n'+String(body).replace(/<[^>]*>/g,' '));
 const matches=clients.filter(c=>{const name=compactClientName(c.name);return name.length>=10&&notice.includes(name);});
 if(matches.length===1)return matches[0];
 // Only disambiguate an explicitly named responsible person against the
 // current owner's established policyholders, never against arbitrary leads.
 const responsible=String(body).match(/(?:policy\s*owner|depositor)\s*(?:name)?\s*[:#]\s*([^\r\n]{3,100})/i)?.[1];
 if(responsible){const exact=matches.filter(c=>compactClientName(c.name)===compactClientName(responsible)&&policyClientIds.includes(Number(c.id)));if(exact.length===1)return exact[0];}
 return null;
}
export function rawPaymentPolicies(subject,body=''){
 const result=new Set(),text=String(subject)+'\n'+String(body);
 for(const re of [/\b(LS\d{7,12})\b/gi,/(?:policy|ap[oó]lice|contract|certificate)\s*(?:number|no\.?|#|n[º°o]|n[uú]mero)?\s*[:#-]?\s*([A-Z0-9-]{5,30})/gi,/\b(\d{7,12})\s*-\s*[A-ZÀ-Ý]/g]){for(const match of text.matchAll(re)){const number=match[1].replace(/[^A-Z0-9]/gi,'').toUpperCase();if(/\d{5,}/.test(number))result.add(number);}}
 return [...result];
}
