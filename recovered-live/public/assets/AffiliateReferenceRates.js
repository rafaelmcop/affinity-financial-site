import AdminMarketingObligations from './AdminMarketingObligations.js?v=3';
import { r as React } from './index-BIU-6RMI.js?v=20261009-setup-1';
const h = React.createElement;
async function api(name, data) {
  const response = await fetch('/api/trpc/' + name, data === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: data }) });
  const result = await response.json();
  if (!response.ok || result.error) throw Error(result.error?.json?.message || 'Não foi possível concluir agora.');
  return result.result.data.json;
}
const money = cents => cents === null || cents === undefined ? 'Não definido' : '$' + (Number(cents) / 100).toFixed(2);
const inputStyle = { width: '100%', color: '#fff', background: '#07101d', border: '1px solid #526070', borderRadius: 8, padding: 10 };
export default function AffiliateReferenceRates() {
  const [rates, setRates] = React.useState([]), [sources, setSources] = React.useState([]), [status, setStatus] = React.useState('Carregando referências…'), [busy, setBusy] = React.useState(false), [filter, setFilter] = React.useState('');
  async function load() {
    try { const [r, s] = await Promise.all([api('admin.affiliateReferenceRates'), api('admin.affiliateWhatsappSources')]); setRates(r); setSources(s); setStatus(''); }
    catch (error) { setStatus(error.message); }
  }
  React.useEffect(() => { load(); }, []);
  async function save() {
    setBusy(true);
    try { await api('admin.affiliateReferenceRates', { rates: rates.map(r => ({ key: r.key, payout: r.payout })) }); setStatus('Valores de referência salvos. Os fechamentos anteriores mantêm o valor registrado na confirmação.'); }
    catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }
  const names = [...new Set(sources.map(s => s.sourceName))].sort();
  return h('section', { style: { background: '#0b1524', border: '1px solid #d4af3755', padding: 22, borderRadius: 16 } },
    h('h2', { style: { fontSize: 22, fontWeight: 700 } }, 'Valores de referência por produto'),
    h('p', { style: { marginTop: 10, color: '#cbd5e1' } }, 'Faixas do prêmio mensal pago pelo cliente. Defina em dólares o valor de referência para o afiliado em cada faixa. Campos vazios ficam como não definidos.'),
    h('div', { style: { overflowX: 'auto', marginTop: 18 } }, h('table', { style: { width: '100%', minWidth: 540 } },
      h('thead', null, h('tr', null, ...['Produto', 'Prêmio mensal do cliente', 'Referência do afiliado (US$)'].map(t => h('th', { key: t, style: { textAlign: 'left', padding: 10 } }, t)))),
      h('tbody', null, ...rates.map(r => h('tr', { key: r.key }, h('td', { style: { padding: 10 } }, r.product), h('td', { style: { padding: 10 } }, r.label), h('td', { style: { padding: 10 } }, h('input', { type: 'number', min: 0, max: 100000, step: '0.01', style: inputStyle, 'aria-label': 'Referência ' + r.product + ' ' + r.label, placeholder: 'Definir valor', value: r.payout ?? '', onChange: e => setRates(previous => previous.map(x => x.key === r.key ? { ...x, payout: e.target.value } : x)) }))))))),
    h('button', { onClick: save, disabled: busy || !rates.length, style: { marginTop: 16, padding: '12px 18px', background: '#d4af37', color: '#000', borderRadius: 8, fontWeight: 700 } }, busy ? 'Salvando…' : 'Salvar valores de referência'),
    h('p', { role: 'status', style: { marginTop: 12 } }, status),
    h('h3', { style: { marginTop: 28, fontSize: 19, fontWeight: 700 } }, 'Leads importados do WhatsApp dos afiliados'),
    h('p', { style: { color: '#cbd5e1', marginTop: 8 } }, 'A origem de cada afiliado permanece identificada. A referência é registrada no fechamento confirmado pelo agente; nenhum pagamento é realizado automaticamente.'),
    h('label', { style: { display: 'block', marginTop: 14 } }, 'Filtrar afiliado', h('select', { value: filter, onChange: e => setFilter(e.target.value), style: { ...inputStyle, marginTop: 7 } }, h('option', { value: '' }, 'Todos os afiliados'), ...names.map(name => h('option', { key: name, value: name }, name)))),
    h('p', { style: { marginTop: 12 } }, sources.length ? 'Até 500 contatos de origem afiliada, com cada fonte preservada.' : 'Ainda não há contatos importados de afiliados. A tabela de referências acima já está disponível.'),
    h(AdminMarketingObligations),
    ...sources.filter(s => !filter || s.sourceName === filter).map(s => h('article', { key: s.phone + s.owner, style: { borderTop: '1px solid #ffffff22', padding: '15px 0' } },
      h('strong', null, s.name), h('p', null, s.phone + ' · ' + s.stage), h('p', { style: { color: '#cbd5e1' } }, 'Origem: ' + s.sourceName + ' · ' + s.sourceEmail),
      s.product ? h('p', { style: { color: '#d4af37' } }, s.product + ' · Prêmio mensal ' + money(s.monthlyPremiumCents) + ' · Referência ' + money(s.referencePayoutCents) + ' · Confirmado por ' + s.agent) : h('p', { style: { color: '#94a3b8' } }, 'Aguardando confirmação do produto e prêmio mensal no fechamento.'))));
}
