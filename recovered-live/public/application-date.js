export function applicationDay(value=new Date()) {
 const raw=typeof value==='string'?value.trim():value;
 const date=new Date(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw)?raw.replace(' ','T')+'Z':raw);
 if(Number.isNaN(date.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),part=name=>parts.find(p=>p.type===name).value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
