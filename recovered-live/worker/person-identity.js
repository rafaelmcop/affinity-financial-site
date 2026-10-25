export const personName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const samePersonName=(a,b)=>!!personName(a)&&personName(a).replace(/ /g,'')===personName(b).replace(/ /g,'');
export function personBirthDate(value){
 const text=String(value||'').trim(),iso=text.match(/^(\d{4})-(\d{2})-(\d{2})/),us=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 const result=iso?iso.slice(1):us?[us[3],us[1].padStart(2,'0'),us[2].padStart(2,'0')]:null;
 if(!result)return '';const date=result.join('-'),parsed=new Date(date+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:'';
}
export function samePersonRecord(client,record){
 if(!samePersonName(client.name,record.clientName||record.name))return false;
 const a=personBirthDate(client.birthDate),b=personBirthDate(record.birthDate);return !a||!b||a===b;
}
export async function findCrmPerson(env,owner,record,preferredId=0){
 const email=String(record.email||record.clientEmail||'').trim().toLowerCase(),phone=String(record.phone||record.clientPhone||'').replace(/\D/g,'').slice(-10),name=String(record.clientName||record.name||'').trim();
 if(!name)return null;
 const candidates=(await env.DB.prepare("SELECT id,name,birthDate,email,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=? AND (id=? OR lower(trim(name))=lower(trim(?)) OR (?<>'' AND lower(trim(email))=?) OR (?<>'' AND substr(replace(replace(replace(replace(replace(coalesce(phone,whatsapp,''),'(',''),')',''),'-',''),' ',''),'+',''),-10)=?))").bind(String(owner).toLowerCase(),Number(preferredId)||0,name,email,email,phone,phone).all()).results||[];
 const matches=candidates.filter(c=>samePersonRecord(c,record));
 const explicit=matches.find(c=>Number(c.id)===Number(preferredId));if(explicit)return explicit;
 return matches.length===1?matches[0]:null;
}
export function unambiguousPersonBirthdate(records){const dates=[...new Set(records.map(r=>personBirthDate(r.birthDate)).filter(Boolean))];return dates.length===1?dates[0]:null;}

// A policy can use a relative as its contact. Its insured's DOB must never be
// attributed to that contact. Conflicting linked identities block birthday use.
export function birthdayIdentitySafe(client,policies,applications=[]){
 const linked=policies.filter(p=>Number(p.clientId)===Number(client.id)),date=personBirthDate(client.birthDate);
 if(!date)return false;
 const matching=[...policies,...applications].filter(p=>samePersonName(client.name,p.clientName));
 if(matching.some(p=>personBirthDate(p.birthDate)&&personBirthDate(p.birthDate)!==date))return false;
 return !linked.some(p=>!samePersonName(client.name,p.clientName)&&personBirthDate(p.birthDate)===date);
}
