const result = document.getElementById('result');
const base = 'https://www.nationallife.com';
const listPath = '/agent/book-of-business/inforce-book/all-clients/all-clients-agent';
const origins = ['https://www.affinityfc.org', 'https://portal.affinityfc.org', 'https://affinityfc.org'];

async function runOn(tab, func, ...args) {
  let timer;
  try {
    const [reply] = await Promise.race([
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('A aba não respondeu. Mantenha as abas abertas e tente novamente.')), 17000); })
    ]);
    return reply?.result;
  } finally { clearTimeout(timer); }
}

async function affinityRequest(origin, record) {
  if (location.origin !== origin || location.pathname !== '/agentes/apps') return null;
  const options = { cache: 'no-store', credentials: 'same-origin' };
  if (record) {
    options.method = 'POST';
    options.signal = AbortSignal.timeout(10000);
    options.headers = { 'content-type': 'application/json' };
    options.body = JSON.stringify(record);
  }
  const response = await fetch('/api/agent/nlg-pilot', options);
  const payload = await response.json().catch(() => null);
  if (record && !response.ok) throw Error(payload?.error || 'A Affinity recusou a validação.');
  return response.ok ? payload : null;
}

async function readPage(path, readDetail) {
  if (location.origin !== 'https://www.nationallife.com' || !location.pathname.startsWith('/agent/')) return null;
  if (location.pathname.replace(/\/$/, '') === path) {
    const table = [...document.querySelectorAll('table')].find(element => {
      const headers = [...element.querySelectorAll('th')].map(cell => cell.textContent.trim());
      return headers.some(text => /^policy\s*#/i.test(text)) && headers.some(text => /^insured\s*\/\s*annuitant/i.test(text));
    });
    const total = document.body.innerText.match(/Viewing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)\s+entries/i);
    if (!table || !total) return null;
    const [first, last, count] = total.slice(1).map(value => Number(value.replaceAll(',', '')));
    const headers = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim());
    const policyIndex = headers.findIndex(text => /^policy\s*#/i.test(text));
    const dateIndex = headers.findIndex(text => /^issue date/i.test(text));
    const rows = policyIndex >= 0 && dateIndex >= 0 ? [...table.querySelectorAll('tbody tr')].map(row => [
      row.cells[policyIndex]?.textContent.trim(), row.cells[dateIndex]?.textContent.trim()
    ]) : [];
    return { first, last, count, rows };
  }
  if (!readDetail) return null;
  const body = () => document.body.innerText;
  const policy = () => body().match(/\bPolicy\s*#\s*([A-Z0-9-]{5,30})\b/i)?.[1]?.toUpperCase();
  const number = policy();
  if (!number) return null;
  const controls = [...document.querySelectorAll('button,a,[role=tab],[data-toggle="tab"],li')];
  const tab = name => controls.find(element => element.getClientRects().length && element.textContent.trim().toLowerCase() === name);
  if (!tab('policy') || !tab('payments')) return null;
  async function field(label, pattern) {
    for (let i = 0; i < 30; i++) {
      if (policy() !== number) return null;
      const lines = body().split('\n').map(line => line.trim()).filter(Boolean);
      const values = [...new Set(lines.flatMap((line, index) => line === label && pattern.test(lines[index - 1] || '') ? [lines[index - 1]] : []))];
      if (values.length === 1) return values[0];
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    return null;
  }
  const money = /^\$[\d,]+\.\d{2}$/;
  const originalTab = controls.find(element => element.getAttribute('aria-selected') === 'true');
  try {
    tab('policy')?.click();
    const deathBenefit = await field('Net Death Benefit', money);
    tab('payments')?.click();
    const premium = await field('Premium', money);
    const frequency = premium ? await field('Premium Payment Frequency', /^(Monthly|Quarterly|Semi[ -]?Annual(?:ly)?|Annual(?:ly)?|Weekly|Biweekly)$/i) : null;
    if (policy() !== number) return null;
    return { number, deathBenefit, premium, frequency };
  } finally {
    if (policy() === number) (originalTab || tab('policy'))?.click();
  }
}

async function check(readDetail) {
  result.textContent = 'Conferindo a National Life…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || 'about:blank');
    if (!origins.includes(url.origin) || url.pathname !== '/agentes/apps') throw Error('Abra a extensão na aba Integrações da Affinity.');
    const permission = await runOn(tab, affinityRequest, url.origin, null);
    if (!permission?.allowed) throw Error('Piloto indisponível para esta conta.');
    const tabs = await chrome.tabs.query({ windowId: tab.windowId, url: base + '/agent/*' });
    const list = tabs.find(candidate => new URL(candidate.url).pathname.replace(/\/$/, '') === listPath);
    result.textContent = 'Lendo All Clients…';
    const snapshot = list ? await runOn(list, readPage, listPath, false) : null;
    if (!readDetail) {
      if (!snapshot) throw Error('Abra All Clients na National Life, na mesma janela.');
      result.textContent = 'Página atual: ' + snapshot.first + '–' + snapshot.last + '\nTotal informado: ' + snapshot.count + '\nLista conferida. Para avançar, abra uma apólice em outra aba e clique em Validar apólice aberta.';
      return;
    }
    const candidate = tabs.find(item => /inforce.*policy|policy.*details/i.test(item.title || '') && item.id !== list?.id);
    if (!candidate) throw Error('A lista está pronta. Falta abrir os detalhes de uma apólice em outra aba desta janela.');
    result.textContent = 'Lendo os detalhes e a aba Payments da apólice…';
    const detail = await runOn(candidate, readPage, listPath, true);
    if (!detail) throw Error('A ficha está aberta, mas não encontrei as abas Policy e Payments. Aguarde a ficha carregar e tente novamente.');
    if (!detail.deathBenefit || !detail.premium || !detail.frequency) throw Error('A leitura não confirmou prêmio, frequência e cobertura. Nenhum dado foi gravado.');
    const issueDate = snapshot?.rows.find(([number]) => number?.toUpperCase() === detail.number)?.[1];
    if (!issueDate) throw Error('Mantenha All Clients aberta em outra aba, na página que contém esta apólice, para confirmar a data de emissão.');
    result.textContent = 'Comparando com a carteira do Manezinho…';
    const comparison = await runOn(tab, affinityRequest, url.origin, { ...detail, issueDate });
    if (!comparison?.saved) throw Error('A Affinity recusou a validação desta apólice.');
    result.textContent = [
      'Apólice: ' + detail.number, 'Emissão: ' + issueDate,
      'Prêmio: ' + detail.premium + ' (' + detail.frequency + ')', 'Death benefit: ' + detail.deathBenefit,
      comparison.matched ? 'Apólice localizada no CRM. Campos divergentes: ' + (comparison.differences.join(', ') || 'nenhum') : 'Apólice ainda não cadastrada no CRM do Manezinho.',
      'Dados salvos apenas na área de teste.'
    ].join('\n');
  } catch (error) {
    result.textContent = error.message;
  }
}

for (const [id, detail] of [['inspect', false], ['inspect-policy', true]]) {
  const button = document.getElementById(id);
  button.onclick = async () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(item => { item.disabled = true; });
    try { await check(detail); } finally { buttons.forEach(item => { item.disabled = false; }); }
  };
}
