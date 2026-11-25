const columns = ['clientName', 'clientEmail', 'clientPhone', 'birthDate', 'address', 'city', 'state', 'zipCode'];

export function clientApplicationColumns(row, payload) {
 return columns.map(key => {
  const raw = Object.hasOwn(payload, key) ? payload[key] : row[key];
  const value = String(raw ?? '').trim();
  if (key === 'clientName') return value;
  return key === 'clientEmail' ? value.toLowerCase() || null : value || null;
 });
}

const applicationColumns = [
 'id','agentEmail','clientName','clientEmail','clientPhone','birthDate','address','city','state','zipCode',
 'maritalStatus','occupation','annualIncome','beneficiaryName','beneficiaryRelationship','beneficiaryPercentage',
 'productInterest','coverageRequested','premiumBudget','applicationReason','notes','status',
 'createdAt','updatedAt','submittedAt','completedAt','matchedPolicyId','clientToken','accessCode'
];

const identityColumns=[...applicationColumns.slice(0,11),...applicationColumns.slice(21)];

export function applicationExtra(data) {
 const extra = {...data};
 for (const key of [...identityColumns,'applicationData','sensitiveData','expectedRevision','revision']) delete extra[key];
 return extra;
}

export function applicationFields(row, extra, sensitive = {}) {
 const fields = {...row,...applicationExtra(extra),...sensitive};
 delete fields.applicationData;
 delete fields.sensitiveData;
 for (const key of identityColumns) if (Object.hasOwn(row,key)) fields[key]=row[key];
 return fields;
}

const revisionColumns = [...applicationColumns.filter(key=>!['clientToken','accessCode'].includes(key)),'applicationData','sensitiveData'];
export async function applicationRevision(row) {
 const data=JSON.stringify(revisionColumns.map(key=>row[key]??null));
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function applicationVersionGuard(row) {
 const keys=revisionColumns.filter(key=>Object.hasOwn(row,key));
 return {sql:keys.map(key=>key+' IS ?').join(' AND '),values:keys.map(key=>row[key]??null)};
}

export function applicationClientFields(row, extra, sensitive) {
 const data={...applicationExtra(extra),...sensitive};
 for(const key of applicationColumns.slice(2,21))if(!Object.hasOwn(data,key)&&Object.hasOwn(row,key))data[key]=row[key];
 return data;
}
