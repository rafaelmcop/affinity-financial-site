const fieldLengths={text:200,stage:100,source:300,tag:80,email:10,phone:10,followUp:12};
export const normalizeTag=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
export function contactFilters(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Filtros inválidos.');
 const filters={};for(const [key,max]of Object.entries(fieldLengths)){if(input[key]!==undefined&&typeof input[key]!=='string')throw Error('Filtros inválidos.');const value=String(input[key]||'').trim();if(value.length>max||/[\x00-\x1f]/.test(value))throw Error('Filtro muito longo ou inválido.');filters[key]=value;}
 if(!['','yes','no'].includes(filters.email)||!['','yes','no'].includes(filters.phone)||!['','overdue','today','week','none'].includes(filters.followUp))throw Error('Filtro inválido.');return filters;
}
const folded=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const nyDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
export const contactToday=(now=new Date())=>nyDate.format(now);
export function matchesContact(client,filters={},tags=[],now=new Date()){
 const term=folded(filters.text).trim(),digits=term.replace(/\D/g,'');
 if(term&&!folded([client.name,client.email,client.phone].join(' ')).includes(term)&&!(digits.length>=3&&String(client.phone||'').replace(/\D/g,'').includes(digits)))return false;
 if(filters.stage&&client.columnKey!==filters.stage||filters.source&&String(client.source||'')!==filters.source||filters.tag&&!tags.some(tag=>normalizeTag(tag.key||tag.label||tag)===normalizeTag(filters.tag)))return false;
 for(const key of ['email','phone']){if(filters[key]==='yes'&&!String(client[key]||'').trim()||filters[key]==='no'&&String(client[key]||'').trim())return false;}
 const date=String(client.nextFollowUpAt||'').slice(0,10),today=contactToday(now),week=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 if(filters.followUp==='none'&&date||filters.followUp==='overdue'&&(!date||date>=today)||filters.followUp==='today'&&date!==today||filters.followUp==='week'&&(!date||date<today||date>week))return false;
 return true;
}
