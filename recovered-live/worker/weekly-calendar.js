export async function weeklyMeetings(env,email,input={}) {
 const start=String(input.start||''),end=String(input.end||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(start))||Date.parse(end)-Date.parse(start)!==6*86400000)throw Error('Selecione uma semana válida.');
 const rows=await env.DB.prepare("SELECT id,inviteeName,eventName,startTime,endTime,meetingUrl FROM calendlyMeetings WHERE lower(agentEmail)=? AND lower(status) NOT IN ('canceled','cancelled') AND date(startTime)>=date(?,'-1 day') AND date(startTime)<=date(?,'+1 day') ORDER BY startTime").bind(email.toLowerCase(),start,end).all();
 return rows.results||[];
}
export async function ownMeeting(env,email,id){
 if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw Error('Compromisso inválido.');
 return env.DB.prepare("SELECT * FROM calendlyMeetings WHERE id=? AND lower(agentEmail)=? AND lower(status) NOT IN ('canceled','cancelled')").bind(Number(id),email.toLowerCase()).first();
}
