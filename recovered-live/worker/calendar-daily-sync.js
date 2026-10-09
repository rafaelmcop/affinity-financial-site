// Record the automatic attempt per account and New York calendar day.
// Manual sync never uses this gate and remains available after a failed attempt.
export async function claimDailyCalendarSync(env,email,now=new Date()) {
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS agentCalendarDailySync(agentEmail TEXT PRIMARY KEY,day TEXT NOT NULL,attemptedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
  const result=await env.DB.prepare('INSERT INTO agentCalendarDailySync(agentEmail,day) VALUES(?,?) ON CONFLICT(agentEmail) DO UPDATE SET day=excluded.day,attemptedAt=CURRENT_TIMESTAMP WHERE agentCalendarDailySync.day<>excluded.day').bind(email.toLowerCase(),day).run();
  return !!result.meta?.changes;
}
