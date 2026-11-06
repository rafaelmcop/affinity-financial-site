const ready=new WeakSet();
export const automationDay=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function reserveAutomation(db,session,input,recipient,now=new Date()){
 if(input?.automation!==true&&input?.meetingReminder!==true)return {allowed:true,manual:true};
 const kind=input.meetingReminder===true&&['day_before','half_hour'].includes(input.stage)&&Number.isSafeInteger(input.meetingId)&&input.meetingId>0?'meeting':input.automation===true&&input.occasion==='birthday'?'birthday':null;
 if(!kind)return {allowed:false,code:'automation_not_allowed'};
 const day=automationDay(now);if(input.automationDay&&input.automationDay!==day||kind==='birthday'&&input.automationDay!==day)return {allowed:false,code:'automation_expired'};
 if(input.expiresAt&&(!Number.isFinite(Date.parse(input.expiresAt))||Date.parse(input.expiresAt)<=now.getTime()))return {allowed:false,code:'automation_expired'};
 if(!ready.has(db)){db.exec('CREATE TABLE IF NOT EXISTS automatic_send_quota(session TEXT NOT NULL,day TEXT NOT NULL,event TEXT NOT NULL,requestId TEXT NOT NULL,kind TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(session,day,event))');ready.add(db);}
 const event=kind==='birthday'?'birthday:'+recipient:'meeting:'+input.meetingId+':'+input.stage+':'+recipient;
 if(db.prepare('SELECT requestId FROM automatic_send_quota WHERE session=? AND day=? AND event=?').get(session,day,event))return {allowed:false,code:'automation_duplicate'};
 const row=db.prepare('INSERT OR IGNORE INTO automatic_send_quota(session,day,event,requestId,kind) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM automatic_send_quota WHERE session=? AND day=?)<5').run(session,day,event,input.requestId,kind,session,day);
 return row.changes?{allowed:true,kind,day}:{allowed:false,code:'automation_daily_limit'};
}
