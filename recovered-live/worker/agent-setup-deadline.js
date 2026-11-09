const fiveDays = 5 * 24 * 60 * 60 * 1000;
const prepared = new WeakSet();

async function schema(db) {
  if (prepared.has(db)) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS agentSetupDeadlines (
    agentId INTEGER PRIMARY KEY, dueAt INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('pending','complete','blocked'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS agentSetupDeadlineEmails (
    agentId INTEGER NOT NULL, cycle INTEGER NOT NULL, dueAt INTEGER NOT NULL,
    state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 1, retryAt INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(agentId,cycle)
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

function deadlineEmail(to, dueAt) {
  const date = new Intl.DateTimeFormat('pt-BR', {
    dateStyle:'long', timeStyle:'short', timeZone:'America/New_York'
  }).format(new Date(dueAt));
  const url = 'https://portal.affinityfc.org/agentes/login';
  const subject = 'URGENTE | Garanta seu acesso ao Affinity Portal';
  const intro = 'Você está entre os primeiros agentes convidados a testar o Affinity Portal. Aproveite essa oportunidade e conclua a configuração obrigatória do seu cadastro para garantir sua vaga.';
  const deadline = 'Você tem cinco dias. Seu prazo termina em ' + date + ' (horário de Nova York).';
  const impact = 'Se o cadastro continuar incompleto após esse prazo, seu acesso será bloqueado e a vaga poderá ser oferecida a outro agente.';
  return {
    to, subject, replyTo: 'info@affinityfc.org',
    text: intro+'\n\n'+deadline+'\n'+impact+'\n\nConcluir cadastro: '+url+'\n\nSe precisar de ajuda, responda a este e-mail.\nEquipe Affinity Portal',
    html: '<div style="font:16px Arial,sans-serif;line-height:1.5;color:#172b3a"><p style="color:#9b1c1c;font-weight:700">AÇÃO NECESSÁRIA</p><h1>Garanta sua vaga no Affinity Portal</h1><p>'+intro+'</p><p><strong>'+deadline+'</strong></p><p>'+impact+'</p><p><a style="display:inline-block;padding:12px 18px;background:#14633e;color:#fff;border-radius:8px;text-decoration:none;font-weight:700" href="'+url+'">Concluir meu cadastro</a></p><p>Se precisar de ajuda, responda a este e-mail.</p><p>Equipe Affinity Portal</p></div>'
  };
}

async function sendDeadlineNotice(db, row, cycle, services, now) {
  const dueAt = now + fiveDays;
  const claimed = await db.prepare(`INSERT INTO agentSetupDeadlineEmails(agentId,cycle,dueAt,state) VALUES(?,?,?,'sending')
    ON CONFLICT(agentId,cycle) DO UPDATE SET dueAt=excluded.dueAt,state='sending',attempts=attempts+1
    WHERE state='retry' AND retryAt<=? AND attempts<4`).bind(row.id,cycle,dueAt,now).run();
  if (!claimed.meta.changes) return;
  let state = 'accepted';
  try {
    const receipt = await services.send(deadlineEmail(row.email,dueAt));
    if (!receipt?.accepted?.some(value=>String(value).toLowerCase()===row.email.toLowerCase())) {
      throw Object.assign(Error('Recipient not accepted'),{notSent:true});
    }
  } catch (error) {
    state = services.definitelyNotSent(error)?'retry':'review';
    console.error('agent_setup_deadline_email_'+state);
  }
  await db.prepare("UPDATE agentSetupDeadlineEmails SET state=?,retryAt=? WHERE agentId=? AND cycle=? AND state='sending'")
    .bind(state,now+60*60*1000,row.id,cycle).run();
}

export async function enforceAgentSetupDeadlines(env, isConfigured, services, now = Date.now()) {
  const db = env.DB;
  await schema(db);
  const { results } = await db.prepare(`SELECT a.id,a.email,a.accountType,a.phone,d.state,e.state AS noticeState,e.dueAt AS noticeDueAt
    FROM adminAccounts a LEFT JOIN agentSetupDeadlines d ON d.agentId=a.id
    LEFT JOIN agentSetupDeadlineEmails e ON e.agentId=d.agentId AND e.cycle=d.dueAt
    WHERE a.accountType='agent' AND a.status='approved' AND a.isActive=1 AND a.portalDeletedAt IS NULL
      AND (d.agentId IS NULL OR d.state='blocked' OR (d.state='pending' AND
        (e.agentId IS NULL OR (e.state='retry' AND e.retryAt<=? AND e.attempts<4) OR (e.state='accepted' AND e.dueAt<=?))))
    ORDER BY COALESCE(e.dueAt,d.dueAt,0),a.id LIMIT 100`).bind(now,now).all();
  for (const row of results) {
    const staff = { ...row, owner: 'agent:' + row.email.toLowerCase(), kind: 'agent' };
    try {
      const configured = await isConfigured(env, staff, { strictBridge: true });
      const deadline = await agentSetupDeadline(db, staff, configured, now);
      if (!deadline) continue;
      if (row.noticeState !== 'accepted' || row.state === 'blocked') {
        await sendDeadlineNotice(db,row,deadline.dueAt,services,now);
        continue;
      }
      await db.batch([
        db.prepare(`UPDATE adminAccounts SET status='blocked',isActive=0,updatedAt=CURRENT_TIMESTAMP
          WHERE id=? AND accountType='agent' AND status='approved' AND isActive=1 AND portalDeletedAt IS NULL
          AND COALESCE(phone,'')=?
          AND EXISTS(SELECT 1 FROM agentSetupDeadlines d JOIN agentSetupDeadlineEmails e ON e.agentId=d.agentId AND e.cycle=d.dueAt
            WHERE d.agentId=adminAccounts.id AND d.state='pending' AND e.state='accepted' AND e.dueAt<=?)
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
