export async function portfolioRows(env, owner) {
  // Fetch the agent's past meetings once rather than scanning them for each client.
  for (const sql of [
    'CREATE INDEX IF NOT EXISTS crmPortfolioOwner ON crmClients(lower(assignedAdminEmail))',
    'CREATE INDEX IF NOT EXISTS policyPortfolioOwner ON agentPolicies(lower(agentEmail))',
    'CREATE INDEX IF NOT EXISTS applicationPortfolioOwner ON agentApplications(lower(agentEmail))',
    'CREATE INDEX IF NOT EXISTS meetingPortfolioOwner ON calendlyMeetings(lower(agentEmail),startTime)',
  ]) await env.DB.prepare(sql).run();
  const [clients, policies, applications, meetings] = await Promise.all([
    env.DB.prepare('SELECT * FROM crmClients WHERE lower(assignedAdminEmail)=? ORDER BY name COLLATE NOCASE').bind(owner).all(),
    env.DB.prepare('SELECT * FROM agentPolicies WHERE lower(agentEmail)=? ORDER BY clientName,policyNumber').bind(owner).all(),
    env.DB.prepare('SELECT id,clientName,clientEmail,clientPhone,status,matchedPolicyId FROM agentApplications WHERE lower(agentEmail)=?').bind(owner).all(),
    env.DB.prepare("SELECT clientId,lower(trim(inviteeEmail)) AS email,max(startTime) AS lastMeetingAt FROM calendlyMeetings WHERE lower(agentEmail)=? AND datetime(startTime)<=datetime('now') GROUP BY clientId,lower(trim(inviteeEmail))").bind(owner).all(),
  ]);
  const ids = new Map(), emails = new Map();
  const put = (map, key, value) => { if (key && (!map.has(key) || value > map.get(key))) map.set(key, value); };
  for (const meeting of meetings.results) { put(ids, Number(meeting.clientId), meeting.lastMeetingAt); put(emails, meeting.email, meeting.lastMeetingAt); }
  for (const client of clients.results) {
    client.lastMeetingAt = [ids.get(Number(client.id)), emails.get(String(client.email || '').trim().toLowerCase())].filter(Boolean).sort().at(-1) || null;
  }
  return [clients, policies, applications];
}
