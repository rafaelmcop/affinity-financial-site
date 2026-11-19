import {samePersonRecord,personName,personBirthDate} from './person-identity.js';
export function fiveRingsStatus(value){const status=String(value||'').trim().toLowerCase();if(/lapse/.test(status))return 'lapse';if(/surrender|resgat/.test(status))return 'surrendered';if(/declin|reject|recus/.test(status))return 'declined';if(/cancel|terminat/.test(status))return 'cancelled';if(/\binactive\b|\bnot\s+(?:active|in[ -]?forced?)\b|\bnon[ -]?active\b|pending|submitted|new business/.test(status))return 'inactive';return /\bactive\b|\bin[ -]?forced?\b|\bvigente\b/.test(status)?'active':'inactive';}
const present=value=>value!==undefined&&value!==null&&value!==''&&value!==0;
const contactFields=['email','phone','birthDate','address','clientDetailUrl'];
export function enrichFiveRingsRecords(records,details){
 const byUrl=new Map(details.map(detail=>[detail.url,detail.record]));
 const enriched=records.map(record=>{
  let result={...record};const policy=byUrl.get(record.detailUrl);
  if(policy&&(!policy.policyNumber||policy.policyNumber===record.policyNumber)){
   const values=Object.fromEntries(Object.entries(policy).filter(([key,value])=>present(value)&&!['policyNumber','sourceKind','statusKnown'].includes(key)&&(key!=='status'||policy.statusKnown)));
   // A detail page may include the owner rather than the insured: keep the list identity.
   if(record.clientName)delete values.clientName;
   result={...result,...values,policyNumber:record.policyNumber,sourceKind:record.sourceKind,statusKnown:record.statusKnown||policy.statusKnown};
  }
  const client=byUrl.get(record.clientDetailUrl);if(client&&samePersonRecord(record,client))for(const key of contactFields)if(!present(result[key])&&present(client[key]))result[key]=client[key];
  return result;
 });
 return enriched.map(record=>{const result={...record};for(const other of enriched){if(!samePersonRecord(record,other))continue;for(const key of contactFields)if(!present(result[key])&&present(other[key]))result[key]=other[key];}return result;});
}
export function uniqueFiveRingsRecords(records){
 const unique=new Map(),rank=record=>record.sourceKind==='policy'?2:record.sourceKind==='client'?1:0;
 for(const record of records){if(!record.clientName)continue;const key=record.policyNumber?'policy:'+record.policyNumber:'person:'+personName(record.clientName)+'|'+personBirthDate(record.birthDate)+'|'+String(record.email||'').toLowerCase()+'|'+String(record.phone||'');
 const current=unique.get(key);if(!current){unique.set(key,record);continue;}
 const preferred=rank(record)>=rank(current)?record:current,secondary=preferred===record?current:record;const merged={...secondary,...Object.fromEntries(Object.entries(preferred).filter(([,value])=>present(value)))};
 if(!preferred.statusKnown&&secondary.statusKnown&&secondary.sourceKind==='policy'){merged.status=secondary.status;merged.statusKnown=true;}unique.set(key,merged);
 }return [...unique.values()];
}
export function assertFiveRingsPolicyCoverage(expectedNumbers,records){const actual=new Set(records.map(r=>r.policyNumber).filter(Boolean));const expected=new Set(expectedNumbers.filter(Boolean));if([...expected].some(number=>!actual.has(number)))throw Error('A leitura de apólices perdeu registros durante o processamento. Nenhuma conclusão de sincronização será registrada; refaça a leitura.');}
// Reading previously missing historical policies must not trigger retroactive welcomes.
export function fiveRingsWelcomeEligible(record,now=new Date()){
 if(record.status!=='active')return false;const date=personBirthDate(record.issuedAt);if(!date)return false;const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),age=(Date.parse(today+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000;return age>=0&&age<=7;
}
