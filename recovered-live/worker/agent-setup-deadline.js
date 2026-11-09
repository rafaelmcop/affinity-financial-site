const fiveDays = 5 * 24 * 60 * 60 * 1000;
const prepared = new WeakSet();

async function schema(db) {
  if (prepared.has(db)) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS agentSetupDeadlines (
    agentId INTEGER PRIMARY KEY, dueAt INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('pending','complete','blocked'))
  )`).run();
  prepared.add(db);
}

export async function agentSetupDeadline(db, agent, complete, now = Date.now()) {
  if (agent.accountType !== 'agent' || !Number.isSafeInteger(Number(agent.id))) return null;
  await schema(db);
  await db.prepare(`INSERT INTO agentSetupDeadlines(agentId,dueAt,state) VALUES(?,?,?)
    ON CONFLICT(agentId) DO UPDATE SET
      dueAt=CASE WHEN state='blocked' THEN excluded.dueAt ELSE dueAt END,
      state=CASE WHEN excluded.state='complete' THEN 'complete'
        WHEN state='blocked' THEN 'pending' ELSE state END`)
    .bind(Number(agent.id), now + fiveDays, complete ? 'complete' : 'pending').run();
  const row = await db.prepare('SELECT dueAt,state FROM agentSetupDeadlines WHERE agentId=?').bind(Number(agent.id)).first();
  return row?.state === 'pending' ? { dueAt: Number(row.dueAt) } : null;
}

export async function enforceAgentSetupDeadlines(env, isConfigured, now = Date.now()) {
  const db = env.DB;
  await schema(db);
  const { results } = await db.prepare(`SELECT a.id,a.email,a.accountType,a.phone,d.dueAt,d.state
    FROM adminAccounts a LEFT JOIN agentSetupDeadlines d ON d.agentId=a.id
    WHERE a.accountType='agent' AND a.status='approved' AND a.isActive=1 AND a.portalDeletedAt IS NULL
      AND (d.agentId IS NULL OR d.state='blocked' OR (d.state='pending' AND d.dueAt<=?))
    ORDER BY COALESCE(d.dueAt,0),a.id LIMIT 100`).bind(now).all();
  for (const row of results) {
    const staff = { ...row, owner: 'agent:' + row.email.toLowerCase(), kind: 'agent' };
    try {
      const configured = await isConfigured(env, staff, { strictBridge: true });
      const deadline = await agentSetupDeadline(db, staff, configured, now);
      if (!deadline || deadline.dueAt > now) continue;
      await db.batch([
        db.prepare(`UPDATE adminAccounts SET status='blocked',isActive=0,updatedAt=CURRENT_TIMESTAMP
          WHERE id=? AND accountType='agent' AND status='approved' AND isActive=1 AND portalDeletedAt IS NULL
          AND COALESCE(phone,'')=?
          AND EXISTS(SELECT 1 FROM agentSetupDeadlines WHERE agentId=adminAccounts.id AND state='pending' AND dueAt<=?)
          AND NOT EXISTS(SELECT 1 FROM staffOnboarding WHERE owner=? AND completed=1)`)
          .bind(row.id, row.phone || '', now, staff.owner),
        db.prepare(`UPDATE agentSetupDeadlines SET state='blocked' WHERE agentId=? AND state='pending'
          AND EXISTS(SELECT 1 FROM adminAccounts WHERE id=? AND status='blocked' AND isActive=0)`)
          .bind(row.id, row.id)
      ]);
    } catch {
      console.error('agent_setup_deadline_check_deferred');
    }
  }
}
