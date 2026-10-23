const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const key=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
// The CRM contact may be the policy owner rather than the insured. Keep both
// identities and never rename the contact or redirect communication recipients.
export function paymentCaseIdentity(policy,client,notice){
 const body=String(notice?.body||'').replace(/<[^>]+>/g,' '),subject=clean(notice?.subject);
 const insuredName=clean(body.match(/(?:primary\s+|proposed\s+)?insured\s*(?:name)?\s*[:#]\s*([^\r\n]{3,100})/i)?.[1]
  ||subject.match(/^Payment Returned by Bank\s*[-–:]\s*(.{3,100})$/i)?.[1]
  ||body.match(/payment attempted for\s+(.{3,100}?)\s+on\s+\d{1,2}\/\d{1,2}\/\d{4}/i)?.[1]);
 const storedName=clean(policy?.clientName||client?.name);
 const explicitOwner=clean(body.match(/(?:policy\s*owner|depositor)\s*(?:name)?\s*[:#]\s*([^\r\n]{3,100})/i)?.[1]);
 const responsibleName=explicitOwner||(insuredName&&storedName&&key(insuredName)!==key(storedName)?storedName:'');
 return {insuredName,responsibleName,displayName:insuredName||storedName,displayRole:insuredName?'Segurado':'Cliente'};
}
