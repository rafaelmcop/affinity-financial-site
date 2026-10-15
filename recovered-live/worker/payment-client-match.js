export const compactClientName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
export function findPaymentClient(clients,subject,body=''){
 const notice=compactClientName(String(subject)+'\n'+String(body).replace(/<[^>]*>/g,' '));
 const matches=clients.filter(c=>{const name=compactClientName(c.name);return name.length>=10&&notice.includes(name);});
 return matches.length===1?matches[0]:null;
}
export function rawPaymentPolicies(subject,body=''){
 const result=new Set(),text=String(subject)+'\n'+String(body);
 for(const re of [/(?:policy|ap[oó]lice|contract|certificate)\s*(?:number|no\.?|#|n[º°o]|n[uú]mero)?\s*[:#-]?\s*([A-Z0-9-]{5,30})/gi,/\b(\d{7,12})\s*-\s*[A-ZÀ-Ý]/g]){for(const match of text.matchAll(re)){const number=match[1].replace(/[^A-Z0-9]/gi,'').toUpperCase();if(/\d{5,}/.test(number))result.add(number);}}
 return [...result];
}
