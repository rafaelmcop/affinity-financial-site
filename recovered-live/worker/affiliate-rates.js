export const referenceBands = [
  { key: 'term30', product: 'Term', label: 'Menos de US$ 30', min: 1, max: 2999 },
  { key: 'term50', product: 'Term', label: 'US$ 30 a menos de US$ 50', min: 3000, max: 4999 },
  { key: 'term100', product: 'Term', label: 'US$ 50 a menos de US$ 100', min: 5000, max: 9999 },
  { key: 'term150', product: 'Term', label: 'US$ 100 a menos de US$ 150', min: 10000, max: 14999 },
  { key: 'term150plus', product: 'Term', label: 'US$ 150 ou mais', min: 15000, max: null },
  { key: 'iul1', product: 'IUL tipo 1', label: 'US$ 100 a US$ 200 (inclusive)', min: 10000, max: 20000 },
  { key: 'iul2', product: 'IUL tipo 2', label: 'Acima de US$ 200', min: 20001, max: null },
];
export function classifySale(input) {
  const value = Number(input.monthlyPremium);
  if (!['Term', 'IUL'].includes(input.product) || !Number.isFinite(value) || value <= 0 || value > 100000 || input.confirmed !== true) throw Error('Confirme o produto e o prêmio mensal no fechamento.');
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 0.00001) throw Error('Informe o prêmio mensal com até duas casas decimais.');
  const band = referenceBands.find(b => (input.product === 'Term' ? b.product === 'Term' : b.key.startsWith('iul')) && cents >= b.min && (b.max === null || cents <= b.max));
  if (!band) throw Error('IUL tipo 1 exige prêmio mensal entre US$ 100 e US$ 200; tipo 2 exige mais de US$ 200.');
  return { band, cents };
}
export async function ratesSchema(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS affiliateReferenceRates(bandKey TEXT PRIMARY KEY,payoutCents INTEGER,updatedBy TEXT,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS centralLeadClosures(phone TEXT PRIMARY KEY,agent TEXT NOT NULL,product TEXT NOT NULL,monthlyPremiumCents INTEGER NOT NULL,bandKey TEXT NOT NULL,referencePayoutCents INTEGER,confirmedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
  await env.DB.batch(referenceBands.map(b => env.DB.prepare('INSERT OR IGNORE INTO affiliateReferenceRates(bandKey) VALUES(?)').bind(b.key)));
}
export async function readRates(env) {
  await ratesSchema(env);
  const data = await env.DB.prepare('SELECT * FROM affiliateReferenceRates').all();
  return referenceBands.map(b => ({ ...b, payout: data.results.find(r => r.bandKey === b.key)?.payoutCents ?? null })).map(b => ({ ...b, payout: b.payout === null ? null : b.payout / 100 }));
}
export async function saveRates(env, input, actor) {
  const rows = input.rates;
  if (!Array.isArray(rows) || rows.length !== referenceBands.length || new Set(rows.map(r => r.key)).size !== rows.length) throw Error('Revise todas as faixas da tabela.');
  const prepared = rows.map(r => {
    const value = r.payout === null || r.payout === '' ? null : Number(r.payout);
    if (!referenceBands.some(b => b.key === r.key) || (value !== null && (!Number.isFinite(value) || value < 0 || value > 100000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001))) throw Error('Informe valores em dólares com até duas casas decimais.');
    return { key: r.key, cents: value === null ? null : Math.round(value * 100) };
  });
  await ratesSchema(env);
  await env.DB.batch(prepared.map(r => env.DB.prepare('UPDATE affiliateReferenceRates SET payoutCents=?,updatedBy=?,updatedAt=CURRENT_TIMESTAMP WHERE bandKey=?').bind(r.cents, actor, r.key)));
  return { success: true };
}
export async function affiliateSourceSales(env) {
  await ratesSchema(env);
  const rows = await env.DB.prepare("SELECT l.phone,l.name,l.stage,s.sourceName,s.sourceEmail,s.owner,s.groupsJson,c.product,c.monthlyPremiumCents,c.bandKey,c.referencePayoutCents,c.agent,c.confirmedAt FROM centralLeadSources s JOIN centralLeads l ON l.phone=s.phone LEFT JOIN centralLeadClosures c ON c.phone=l.phone WHERE s.kind='affiliate' ORDER BY c.confirmedAt DESC,s.sourceName,l.name LIMIT 500").all();
  return rows.results;
}
