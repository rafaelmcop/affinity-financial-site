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

export async function saveNlgPilotPolicy(db, owner, input) {
  const number = String(input?.number ?? '').trim().toUpperCase().replace(/-/g, '');
  const issued = issueDay(input?.issueDate);
  const premium = cents(input?.premium);
  const benefit = cents(input?.deathBenefit);
  const mode = frequency(input?.frequency);
  if (!/^[A-Z0-9]{5,30}$/.test(number)) return null;
  const { source, category } = policyStatus(input?.status);
  const missing = [!issued && 'data de emissão', premium === null && 'prêmio',
    !mode && 'frequência', benefit === null && 'death benefit', category === 'Status a conferir' && 'status'].filter(Boolean);
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

  await db.prepare('CREATE TABLE IF NOT EXISTS nlgPilotPolicyReviews (owner TEXT NOT NULL,policyNumber TEXT NOT NULL,issuedOn TEXT,premiumCents INTEGER,premiumFrequency TEXT,deathBenefitCents INTEGER,carrierStatus TEXT NOT NULL,category TEXT NOT NULL,product TEXT NOT NULL,missingJson TEXT NOT NULL,checkedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,policyNumber))').run();
  await db.prepare(`INSERT INTO nlgPilotPolicyReviews(owner,policyNumber,issuedOn,premiumCents,premiumFrequency,deathBenefitCents,carrierStatus,category,product,missingJson)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,policyNumber) DO UPDATE SET
    issuedOn=COALESCE(excluded.issuedOn,issuedOn),premiumCents=COALESCE(excluded.premiumCents,premiumCents),
    premiumFrequency=COALESCE(excluded.premiumFrequency,premiumFrequency),deathBenefitCents=COALESCE(excluded.deathBenefitCents,deathBenefitCents),
    carrierStatus=COALESCE(NULLIF(excluded.carrierStatus,''),carrierStatus),category=CASE WHEN excluded.carrierStatus='' THEN category ELSE excluded.category END,
    product=COALESCE(NULLIF(excluded.product,''),product),missingJson=excluded.missingJson,checkedAt=CURRENT_TIMESTAMP`)
    .bind(owner, number, issued, premium, mode || null, benefit, source, category, product, JSON.stringify(missing)).run();
  return { saved: true, matched: Boolean(policy), differences, category, missing };
}
