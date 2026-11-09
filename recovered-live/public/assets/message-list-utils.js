const timestamp=value=>{const raw=String(value||'');return Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)?raw.replace(' ','T')+'Z':raw);};
export function filterDeliveries(rows,{status='all',period='all',now=Date.now()}={}){
 const cutoff=new Date(now);
 if(period==='months6')cutoff.setUTCMonth(cutoff.getUTCMonth()-6);
 else if(period==='year')cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 else if(period!=='all')cutoff.setTime(now-Number(period)*86400000);
 const within=value=>{const time=timestamp(value);return Number.isFinite(time)&&time>=cutoff.getTime()&&time<=now;};
 return rows.flatMap(row=>{
  if(row.groupedDelivery){const recipients=(row.recipients||[]).filter(r=>(status==='all'||r.status===status)&&(period==='all'||r.status==='sent'&&within(r.sentAt)));if(!recipients.length)return [];const sent=recipients.filter(r=>r.status==='sent').length,pending=recipients.filter(r=>r.status==='review').length,failed=recipients.length-sent-pending;const date=recipients.reduce((last,r)=>timestamp(r.sentAt)>timestamp(last)?r.sentAt:last,recipients[0].sentAt);return [{...row,recipients,date,recipientCount:recipients.length,clientName:recipients.length+' '+(recipients.length===1?'destinatário':'destinatários'),status:pending?'review':failed?'failed':'sent',statusSummary:sent+' enviado(s) · '+pending+' pendente(s) · '+failed+' sem confirmação'}];}
  if(status!=='all'&&row.status!==status)return [];
  if(period==='all')return [row];
  if(row.status!=='sent')return [];
  if(Array.isArray(row.recipients)&&row.recipients.length){
   const recipients=row.recipients.filter(recipient=>within(recipient.sentAt));
   if(!recipients.length)return [];
   const date=recipients.reduce((last,recipient)=>timestamp(recipient.sentAt)>timestamp(last)?recipient.sentAt:last,recipients[0].sentAt);
   return [{...row,recipients,date,recipientCount:recipients.length,clientName:`${recipients.length} ${recipients.length===1?'contato recebeu':'contatos receberam'}`}];
  }
  return within(row.date)?[row]:[];
 });
}
