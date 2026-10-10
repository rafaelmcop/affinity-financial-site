export async function fiveRingsSchema(env){await env.DB.prepare("CREATE TABLE IF NOT EXISTS agentFiveRingsRequirements(agentEmail TEXT PRIMARY KEY,exempt INTEGER NOT NULL DEFAULT 0,nextPromptAt INTEGER NOT NULL DEFAULT 0,lastPortalSyncAt INTEGER NOT NULL DEFAULT 0,updatedBy TEXT,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)").run();}
export async function fiveRingsRequirement(env,email,now=Date.now()){
await fiveRingsSchema(env);email=email.toLowerCase();
const row=await env.DB.prepare('SELECT exempt,nextPromptAt,lastPortalSyncAt FROM agentFiveRingsRequirements WHERE agentEmail=?').bind(email).first();
const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agentFiveRingsConnections'").first();
const connection=table?await env.DB.prepare('SELECT portalEmail,encryptedPassword FROM agentFiveRingsConnections WHERE lower(agentEmail)=?').bind(email).first():null;
const eastern=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const days=Math.floor((Date.parse(eastern+'T00:00:00Z')-Date.parse('2026-10-14T00:00:00Z'))/86400000),cycle=days>=0?Date.parse('2026-10-14T00:00:00Z')+Math.floor(days/14)*14*86400000:0;
return {fiveRingsSyncDue:!row?.exempt&&Number(row?.nextPromptAt||0)<=now&&cycle>0&&Number(row?.lastPortalSyncAt||0)<cycle,fiveRingsExempt:!!row?.exempt,fiveRingsConfigured:!!(connection?.portalEmail&&connection?.encryptedPassword),fiveRingsReminderDue:!row?.exempt&&!connection?.encryptedPassword&&Number(row?.nextPromptAt||0)<=now};
}
export async function postponeFiveRings(env,email,now=Date.now()){await fiveRingsSchema(env);await env.DB.prepare('INSERT INTO agentFiveRingsRequirements(agentEmail,nextPromptAt) VALUES(?,?) ON CONFLICT(agentEmail) DO UPDATE SET nextPromptAt=excluded.nextPromptAt,updatedAt=CURRENT_TIMESTAMP').bind(email.toLowerCase(),now+15*86400000).run();return {ok:true};}
export async function adminFiveRingsRequirements(env,input,admin){
await fiveRingsSchema(env);
if(input){const email=String(input.email||'').trim().toLowerCase();if(typeof input.exempt!=='boolean')throw Error('Informe a dispensa.');const agent=await env.DB.prepare("SELECT email FROM adminAccounts WHERE lower(email)=? AND accountType IN ('agent','both')").bind(email).first();if(!agent)throw Error('Agente não encontrado.');await env.DB.prepare('INSERT INTO agentFiveRingsRequirements(agentEmail,exempt,updatedBy) VALUES(?,?,?) ON CONFLICT(agentEmail) DO UPDATE SET exempt=excluded.exempt,updatedBy=excluded.updatedBy,nextPromptAt=0,updatedAt=CURRENT_TIMESTAMP').bind(email,input.exempt?1:0,admin).run();}
return (await env.DB.prepare("SELECT a.name,a.email,COALESCE(r.exempt,0) AS exempt FROM adminAccounts a LEFT JOIN agentFiveRingsRequirements r ON lower(a.email)=r.agentEmail WHERE a.accountType IN ('agent','both') ORDER BY a.name").all()).results;
}

export async function markPortalFiveRingsSync(env,email,now=Date.now()){await fiveRingsSchema(env);await env.DB.prepare('INSERT INTO agentFiveRingsRequirements(agentEmail,lastPortalSyncAt) VALUES(?,?) ON CONFLICT(agentEmail) DO UPDATE SET lastPortalSyncAt=excluded.lastPortalSyncAt,updatedAt=CURRENT_TIMESTAMP').bind(email.toLowerCase(),now).run();}
