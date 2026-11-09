const frequencyAliases = {
  monthly: 'monthly', quarterly: 'quarterly', semiannual: 'semiannual',
  semiannually: 'semiannual', annual: 'annual', annually: 'annual',
  weekly: 'weekly', biweekly: 'biweekly'
};
const frequency = value => frequencyAliases[String(value ?? '').toLowerCase().replace(/[^a-z]/g, '')];

function cents(value) {
  const text = String(value ?? '');
  if (!/^\$\d{1,3}(?:,\d{3})*\.\d{2}$|^\$\d{1,12}\.\d{2}$/.test(text)) return null;
  const amount = Number(text.replace(/[$,.]/g, ''));
  return Number.isSafeInteger(amount) ? amount : null;
}

function issueDay(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value ?? ''));
  if (!match) return null;
  const date = match[3] + '-' + match[1] + '-' + match[2];
  const parsed = new Date(date);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

function policyStatus(value) {
  const source = String(value ?? '').trim().slice(0, 60);
  const key = source.toLowerCase().replace(/[^a-z]/g, '');
  const labels = {
    inforce: 'InForce', active: 'InForce', issued: 'InForce',
    newbusiness: 'New Business', pending: 'New Business', approved: 'New Business',
    pendinglapse: 'Pending Lapse', lapse: 'Lapse', lapsed: 'Lapse',
    nottaken: 'Not Taken', inactive: 'Inativa', notactive: 'Inativa',
    declined: 'Recusada', cancelled: 'Cancelada', canceled: 'Cancelada'
  };
  return { source, category: labels[key] || 'Status a conferir' };
}

const prepared = new WeakSet();
async function ensureReviews(db) {
  if (prepared.has(db)) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS nlgPilotPolicyReviews (owner TEXT NOT NULL,policyNumber TEXT NOT NULL,issuedOn TEXT,premiumCents INTEGER,premiumFrequency TEXT,deathBenefitCents INTEGER,carrierStatus TEXT NOT NULL,category TEXT NOT NULL,product TEXT NOT NULL,missingJson TEXT NOT NULL,checkedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,policyNumber))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nlgPilotPaymentChecks (owner TEXT NOT NULL,policyNumber TEXT NOT NULL,nextDueOn TEXT,paymentStatus TEXT,checkedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,policyNumber))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nlgPilotPolicyAgents (owner TEXT NOT NULL,policyNumber TEXT NOT NULL,agentKey TEXT NOT NULL,agentLabel TEXT NOT NULL,lastSeenAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,policyNumber,agentKey))').run();
  prepared.add(db);
}

export async function nlgPilotFreshPolicies(db, owner) {
  await ensureReviews(db);
  const {results} = await db.prepare(`SELECT policyNumber,issuedOn,carrierStatus,product
    FROM nlgPilotPolicyReviews WHERE owner=? AND checkedAt>=datetime('now','-30 days')
    AND missingJson='[]' AND issuedOn IS NOT NULL AND premiumCents IS NOT NULL
    AND premiumFrequency IS NOT NULL AND deathBenefitCents IS NOT NULL LIMIT 2000`).bind(owner).all();
  return results;
}

export async function nlgPilotPendingPolicies(db, owner) {
  await ensureReviews(db);
  const {results} = await db.prepare("SELECT r.policyNumber,r.category,r.missingJson,p.paymentStatus FROM nlgPilotPolicyReviews r LEFT JOIN nlgPilotPaymentChecks p ON p.owner=r.owner AND p.policyNumber=r.policyNumber WHERE r.owner=? AND (r.missingJson<>'[]' OR p.paymentStatus IN ('past due','overdue','delinquent')) ORDER BY r.checkedAt DESC,r.policyNumber LIMIT 400").bind(owner).all();
  return results.map(({policyNumber,category,missingJson,paymentStatus})=>({policyNumber,category,missing:[...JSON.parse(missingJson),...(['past due','overdue','delinquent'].includes(paymentStatus)?['atraso informado pela National Life']:[])]}));
}

export async function saveNlgPilotAgents(db, owner, assignments) {
  if (!Array.isArray(assignments) || assignments.length > 10) return null;
  await ensureReviews(db);
  const statements = [];
  for (const item of assignments) {
    const number = String(item?.number ?? '').trim().toUpperCase().replace(/-/g, '');
    const label = String(item?.agent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!/^[A-Z0-9]{5,30}$/.test(number) || !label) continue;
    statements.push(db.prepare(`INSERT INTO nlgPilotPolicyAgents(owner,policyNumber,agentKey,agentLabel) VALUES (?,?,?,?)
      ON CONFLICT(owner,policyNumber,agentKey) DO UPDATE SET agentLabel=excluded.agentLabel,lastSeenAt=CURRENT_TIMESTAMP`)
      .bind(owner,number,label.toLowerCase(),label));
  }
  if (statements.length) await db.batch(statements);
  return { saved: true };
}

export async function nlgPilotSharedPolicies(db, owner) {
  await ensureReviews(db);
  const {results} = await db.prepare(`SELECT policyNumber,json_group_array(agentLabel) AS agents
    FROM nlgPilotPolicyAgents WHERE owner=? GROUP BY policyNumber HAVING COUNT(*)>1 ORDER BY policyNumber LIMIT 400`).bind(owner).all();
  return results.map(row=>({policyNumber:row.policyNumber,agents:JSON.parse(row.agents)}));
}

export async function saveNlgPilotPolicy(db, owner, input) {
  const number = String(input?.number ?? '').trim().toUpperCase().replace(/-/g, '');
  const issued = issueDay(input?.issueDate);
  const premium = cents(input?.premium);
  const benefit = cents(input?.deathBenefit);
  const mode = frequency(input?.frequency);
  if (!/^[A-Z0-9]{5,30}$/.test(number)) return null;
  const { source, category } = policyStatus(input?.status);
  const missing = [!issued && 'data de emissão', premium === null && 'prêmio',
    !mode && 'frequência', benefit === null && 'death benefit', category === 'Status a conferir' && 'status', input?.detailUnavailable === true && 'ficha detalhada indisponível'].filter(Boolean);
  const product = String(input?.product ?? '').trim().slice(0, 120);

  const matches = await db.prepare("SELECT issuedAt,premiumAmount,premiumFrequency,coverageAmount FROM agentPolicies WHERE lower(agentEmail)=? AND upper(replace(replace(policyNumber,'-',''),' ',''))=? LIMIT 2").bind(owner, number).all();
  const [policy] = matches.results;
  const differences = [];
  if (matches.results.length > 1) differences.push('número duplicado no CRM');
  else if (policy) {
    if (issued && String(policy.issuedAt ?? '').slice(0, 10) !== issued) differences.push('data de emissão');
    if (premium !== null && (policy.premiumAmount == null || Math.round(Number(policy.premiumAmount) * 100) !== premium)) differences.push('prêmio');
    if (mode && frequency(policy.premiumFrequency) !== mode) differences.push('frequência');
    if (benefit !== null && (policy.coverageAmount == null || Math.round(Number(policy.coverageAmount) * 100) !== benefit)) differences.push('death benefit');
  }

  await ensureReviews(db);
  await db.prepare(`INSERT INTO nlgPilotPolicyReviews(owner,policyNumber,issuedOn,premiumCents,premiumFrequency,deathBenefitCents,carrierStatus,category,product,missingJson)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,policyNumber) DO UPDATE SET
    issuedOn=COALESCE(excluded.issuedOn,issuedOn),premiumCents=COALESCE(excluded.premiumCents,premiumCents),
    premiumFrequency=COALESCE(excluded.premiumFrequency,premiumFrequency),deathBenefitCents=COALESCE(excluded.deathBenefitCents,deathBenefitCents),
    carrierStatus=COALESCE(NULLIF(excluded.carrierStatus,''),carrierStatus),category=CASE WHEN excluded.carrierStatus='' THEN category ELSE excluded.category END,
    product=COALESCE(NULLIF(excluded.product,''),product),missingJson=excluded.missingJson,checkedAt=CURRENT_TIMESTAMP`)
    .bind(owner, number, issued, premium, mode || null, benefit, source, category, product, JSON.stringify(missing)).run();
  const nextDue = issueDay(input?.nextDue);
  const rawStatus = String(input?.paymentStatus ?? '').trim().toLowerCase();
  const payment = ['past due','overdue','paid','current','pending','delinquent'].includes(rawStatus) ? rawStatus : null;
  if (nextDue || payment) {
    await db.prepare(`INSERT INTO nlgPilotPaymentChecks(owner,policyNumber,nextDueOn,paymentStatus) VALUES(?,?,?,?)
      ON CONFLICT(owner,policyNumber) DO UPDATE SET nextDueOn=excluded.nextDueOn,paymentStatus=excluded.paymentStatus,checkedAt=CURRENT_TIMESTAMP`)
      .bind(owner,number,nextDue,payment).run();
  }
  const paymentNotice = ['past due','overdue','delinquent'].includes(payment) ? 'Atraso informado pela National Life' : '';
  return { saved: true, matched: Boolean(policy), differences, category, missing, paymentNotice };
}
