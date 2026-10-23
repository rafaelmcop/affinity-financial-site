import {paymentTasks} from './payment-attention.js';
import {weeklyMeetings} from './weekly-calendar.js';
import {birthdayAlerts} from './birthday-alerts.js';
export async function assistantHome(env,assistant,auth,services={}){
 const owner=assistant.owner,can=key=>assistant.permissions?.[key]?.includes('view'),now=services.now||new Date(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),weekday=new Date(today+'T12:00:00Z').getUTCDay(),start=services.start||new Date(Date.parse(today+'T12:00:00Z')-((weekday+6)%7)*86400000).toISOString().slice(0,10),end=new Date(Date.parse(start+'T12:00:00Z')+6*86400000).toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start)))throw Error('Selecione uma semana válida.');
 const result={owner,ownerName:assistant.links.find(x=>x.owner===owner)?.name||owner,today,start,end,canOpenClient:!!can('policies'),payments:null,birthdays:null,meetings:null,warnings:[]};
 const jobs=[];
 if(can('tasks'))jobs.push(['payments',()=> (services.payments||paymentTasks)(env,owner,true).then(rows=>rows.map(row=>({id:row.id,title:row.title,dueAt:row.dueAt,clientId:row.clientId}))) ]);
 if(can('calendar')||can('policies')||can('messages'))jobs.push(['birthdays',()=> (services.birthdays||birthdayAlerts)(env,owner,now).then(rows=>rows.map(row=>({id:row.id,name:row.name,emailStatus:row.emailStatus,sentAt:row.sentAt}))) ]);
 if(can('calendar')){result.calendarLinked=!!await auth.calendarLinked?.(owner);if(result.calendarLinked)jobs.push(['meetings',async()=> (await weeklyMeetings(env,owner,{start,end})).filter(row=>{const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.startTime));return day>=start&&day<=end;})]);}
 await Promise.all(jobs.map(async([key,run])=>{try{result[key]=await run();}catch{result.warnings.push(key);}}));return result;
}
