const ready=new WeakSet();
export const AUTOMATION_LIMITS=Object.freeze({birthday:5,meeting:15});
export const AUTOMATION_INTERVAL_MS=180000;
export const automationDay=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
function schema(db){if(ready.has(db))return;db.exec('CREATE TABLE IF NOT EXISTS automatic_send_quota(session TEXT NOT NULL,day TEXT NOT NULL,event TEXT NOT NULL,requestId TEXT NOT NULL,kind TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(session,day,event));CREATE INDEX IF NOT EXISTS automatic_send_recent ON automatic_send_quota(session,createdAt)');ready.add(db);}
function spacing(db,session,now){const last=db.prepare('SELECT createdAt FROM automatic_send_quota WHERE session=? ORDER BY julianday(createdAt) DESC LIMIT 1').get(session);if(!last)return 0;const value=String(last.createdAt),time=Date.parse(value.includes('T')?value:value.replace(' ','T')+'Z');return Math.max(0,Math.ceil((time+AUTOMATION_INTERVAL_MS-now.getTime())/1000));}
export function reserveAutomation(db,session,input,recipient,now=new Date()){
 if(input?.automation!==true&&input?.meetingReminder!==true)return {allowed:true,manual:true};
 const kind=input.meetingReminder===true&&['day_before','half_hour'].includes(input.stage)&&Number.isSafeInteger(input.meetingId)&&input.meetingId>0?'meeting':input.automation===true&&input.occasion==='birthday'?'birthday':null;
 if(!kind)return {allowed:false,code:'automation_not_allowed'};
 const limit=AUTOMATION_LIMITS[kind],day=automationDay(now);
 if(input.automationDay&&input.automationDay!==day||kind==='birthday'&&input.automationDay!==day)return {allowed:false,code:'automation_expired'};
 if(input.expiresAt&&(!Number.isFinite(Date.parse(input.expiresAt))||Date.parse(input.expiresAt)<=now.getTime()))return {allowed:false,code:'automation_expired'};
 schema(db);
 const event=kind==='birthday'?'birthday:'+recipient:'meeting:'+input.meetingId+':'+input.stage+':'+recipient;
 if(db.prepare('SELECT requestId FROM automatic_send_quota WHERE session=? AND day=? AND event=?').get(session,day,event))return {allowed:false,code:'automation_duplicate'};
 const count=()=>Number(db.prepare('SELECT count(*) n FROM automatic_send_quota WHERE session=? AND day=? AND kind=?').get(session,day,kind).n);
 if(count()>=limit)return {allowed:false,kind,limit,code:'automation_daily_limit'};
 const retryAfterSeconds=spacing(db,session,now);if(retryAfterSeconds)return {allowed:false,kind,code:'automation_spacing',retryAfterSeconds};
 const row=db.prepare('INSERT OR IGNORE INTO automatic_send_quota(session,day,event,requestId,kind,createdAt) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM automatic_send_quota WHERE session=? AND day=? AND kind=?)<? AND NOT EXISTS(SELECT 1 FROM automatic_send_quota WHERE session=? AND julianday(createdAt)>julianday(?))').run(session,day,event,input.requestId,kind,now.toISOString(),session,day,kind,limit,session,new Date(now.getTime()-AUTOMATION_INTERVAL_MS).toISOString());
 return row.changes?{allowed:true,kind,limit,day}:{allowed:false,kind,limit,code:count()>=limit?'automation_daily_limit':'automation_spacing',retryAfterSeconds:spacing(db,session,now)||180};
}
