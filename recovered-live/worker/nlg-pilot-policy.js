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

export async function saveNlgPilotPolicy(db, owner, input) {
  const number = String(input?.number ?? '').trim().toUpperCase().replace(/-/g, '');
  const issued = issueDay(input?.issueDate);
  const premium = cents(input?.premium);
  const benefit = cents(input?.deathBenefit);
  const mode = frequency(input?.frequency);
  if (!/^[A-Z0-9]{5,30}$/.test(number) || !issued || premium === null || benefit === null || !mode) return null;

  const matches = await db.prepare("SELECT issuedAt,premiumAmount,premiumFrequency,coverageAmount FROM agentPolicies WHERE lower(agentEmail)=? AND upper(replace(replace(policyNumber,'-',''),' ',''))=? LIMIT 2").bind(owner, number).all();
  const [policy] = matches.results;
  const differences = [];
  if (matches.results.length > 1) differences.push('número duplicado no CRM');
  else if (policy) {
    if (String(policy.issuedAt ?? '').slice(0, 10) !== issued) differences.push('data de emissão');
    if (policy.premiumAmount == null || Math.round(Number(policy.premiumAmount) * 100) !== premium) differences.push('prêmio');
    if (frequency(policy.premiumFrequency) !== mode) differences.push('frequência');
    if (policy.coverageAmount == null || Math.round(Number(policy.coverageAmount) * 100) !== benefit) differences.push('death benefit');
  }

  await db.prepare('CREATE TABLE IF NOT EXISTS nlgPilotPolicySnapshots (owner TEXT NOT NULL,policyNumber TEXT NOT NULL,issuedOn TEXT NOT NULL,premiumCents INTEGER NOT NULL,premiumFrequency TEXT NOT NULL,deathBenefitCents INTEGER NOT NULL,checkedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,policyNumber))').run();
  await db.prepare('INSERT INTO nlgPilotPolicySnapshots(owner,policyNumber,issuedOn,premiumCents,premiumFrequency,deathBenefitCents) VALUES (?,?,?,?,?,?) ON CONFLICT(owner,policyNumber) DO UPDATE SET issuedOn=excluded.issuedOn,premiumCents=excluded.premiumCents,premiumFrequency=excluded.premiumFrequency,deathBenefitCents=excluded.deathBenefitCents,checkedAt=CURRENT_TIMESTAMP').bind(owner, number, issued, premium, mode, benefit).run();
  return { saved: true, matched: Boolean(policy), differences };
}
