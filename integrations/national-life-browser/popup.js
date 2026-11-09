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

function readPage(path, action) {
  if (location.origin !== 'https://www.nationallife.com' || !location.pathname.startsWith('/agent/')) return null;
  if (location.pathname.replace(/\/$/, '') === path) {
    const visible = element => element.getClientRects().length && !element.closest('[aria-disabled="true"],.disabled') && !element.disabled;
    if (action === 'next') {
      const next = [...document.querySelectorAll('button,a,[role=button]')].find(element => visible(element) && /^(next|›|»)$/.test((element.getAttribute('aria-label') || element.textContent).trim().toLowerCase()));
      if (!next) return false;
      next.click();
      return true;
    }
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
    const cells = policyIndex >= 0 && dateIndex >= 0 ? [...table.querySelectorAll('tbody tr')].map(row => [row.cells[policyIndex], row.cells[dateIndex]]) : [];
    const rows = cells.map(([policy, date]) => [
      policy?.textContent.trim(), date?.textContent.trim(), policy?.querySelector('a[href]')?.href || ''
    ]);
    if (typeof action === 'object' && action?.open) {
      const index = rows.findIndex(([number]) => number?.toUpperCase() === action.open);
      const link = cells[index]?.[0]?.querySelector('a,button,[role=link]');
      if (!link) return false;
      link.click();
      return true;
    }
    return { first, last, count, rows };
  }
  if (!action) return null;
  const body = () => document.body.innerText;
  const policy = () => body().match(/\bPolicy\s*#\s*([A-Z0-9-]{5,30})\b/i)?.[1]?.toUpperCase();
  const number = policy();
  if (!number) return null;
  const controls = [...document.querySelectorAll('button,a,[role=tab],[data-toggle="tab"],li')];
  const tab = name => controls.find(element => element.getClientRects().length && element.textContent.trim().toLowerCase() === name);
  if (!tab('policy') || !tab('payments')) return null;
  if (action === 'policy' || action === 'payments') {
    tab(action).click();
    return { number };
  }
  const lines = body().split('\n').map(line => line.trim()).filter(Boolean);
  function field(label, pattern) {
    const values = [...new Set(lines.flatMap((line, index) => line === label && pattern.test(lines[index - 1] || '') ? [lines[index - 1]] : []))];
    return values.length === 1 ? values[0] : null;
  }
  const money = /^\$[\d,]+\.\d{2}$/;
  return {
    number,
    deathBenefit: field('Net Death Benefit', money),
    premium: field('Premium', money),
    frequency: field('Premium Payment Frequency', /^(Monthly|Quarterly|Semi[ -]?Annual(?:ly)?|Annual(?:ly)?|Weekly|Biweekly)$/i)
  };
}

async function readPolicy(tab) {
  let expectedNumber;
  async function readSection(section, ready) {
    const opened = await runOn(tab, readPage, listPath, section);
    if (!opened || (expectedNumber && opened.number !== expectedNumber)) throw Error('A ficha mudou durante a leitura. Abra a apólice e tente novamente.');
    for (let attempt = 0; attempt < 10; attempt++) {
      const snapshot = await runOn(tab, readPage, listPath, 'snapshot');
      if (snapshot?.number !== opened.number) throw Error('A ficha mudou durante a leitura.');
      if (ready(snapshot)) return snapshot;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    throw Error('Não consegui confirmar os campos da aba ' + section + '. Abra essa aba na National Life e tente novamente.');
  }

  result.textContent = 'Conferindo a cobertura na aba Policy…';
  const policy = await readSection('policy', item => item.deathBenefit);
  expectedNumber = policy.number;
  result.textContent = 'Conferindo o prêmio na aba Payments…';
  const payment = await readSection('payments', item => item.premium && item.frequency);
  return { number: policy.number, deathBenefit: policy.deathBenefit, premium: payment.premium, frequency: payment.frequency };
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(tab, predicate, label) {
  for (let attempt = 0; attempt < 18; attempt++) {
    const current = await chrome.tabs.get(tab.id);
    if (current.status === 'complete' && current.url?.startsWith(base + '/agent/')) {
      const snapshot = await runOn(tab, readPage, listPath, 'snapshot');
      if (snapshot && predicate(snapshot)) return snapshot;
    }
    await pause(600);
  }
  throw Error(label);
}

async function goToListPage(tab, first) {
  let page = await waitFor(tab, snapshot => snapshot.count > 0, 'Não consegui abrir All Clients. Confira o login da National Life no Chrome.');
  while (page.first < first) {
    const previous = page;
    if (!await runOn(tab, readPage, listPath, 'next')) throw Error('Não encontrei o botão Next.');
    page = await waitFor(tab, snapshot => snapshot.first > previous.first, 'A próxima página não carregou.');
    if (page.first !== previous.last + 1 || page.count !== previous.count) throw Error('A lista mudou durante a leitura.');
  }
  if (page.first !== first) throw Error('A paginação mudou durante a leitura.');
  return page;
}

async function batch(affinity, origin, windowId) {
  const listUrl = base + listPath;
  let listTab, detailsTab, expected = 0, saved = 0, matched = 0, differing = 0, failed = 0, consecutiveFailures = 0;
  const seen = new Set();
  const counts = () => `Validadas: ${saved}/${expected} · No CRM: ${matched} · Com divergência: ${differing} · Não lidas: ${failed}`;
  try {
    if (!(await runOn(affinity, affinityRequest, origin, null))?.allowed) throw Error('Piloto indisponível para esta conta.');
    result.textContent = 'Abrindo All Clients na National Life…';
    listTab = await chrome.tabs.create({ url: listUrl, active: false, windowId });
    let page = await goToListPage(listTab, 1);
    expected = page.count;
    while (true) {
      if (page.rows.length !== page.last - page.first + 1) throw Error('A página da carteira veio incompleta.');
      for (const [rawNumber, issueDate, href] of page.rows) {
        const number = rawNumber?.toUpperCase();
        if (!number || !issueDate || seen.has(number)) { failed++; continue; }
        seen.add(number);
        result.textContent = counts() + '\nAbrindo a próxima apólice…';
        let direct;
        try {
          const url = new URL(href);
          if (url.origin === base && url.pathname.startsWith('/agent/') && url.pathname.replace(/\/$/, '') !== listPath) direct = url.href;
        } catch {}
        try {
          if (direct) {
            detailsTab = detailsTab ? await chrome.tabs.update(detailsTab.id, { url: direct }) : await chrome.tabs.create({ url: direct, active: false, windowId });
          } else {
            if (!await runOn(listTab, readPage, listPath, { open: number })) throw Error('O link da apólice não abriu.');
          }
          const reader = direct ? detailsTab : listTab;
          await waitFor(reader, item => item.number === number, 'A ficha da apólice não carregou.');
          const record = await readPolicy(reader);
          if (record.number !== number) throw Error('A ficha aberta tem outro número.');
          const comparison = await runOn(affinity, affinityRequest, origin, { ...record, issueDate });
          if (!comparison?.saved) throw Error('A sessão da Affinity deixou de responder.');
          saved++;
          consecutiveFailures = 0;
          if (comparison.matched) matched++;
          if (comparison.differences.length) differing++;
        } catch (error) {
          failed++;
          result.textContent = counts() + '\n' + error.message;
          if (++consecutiveFailures >= 3) throw Error('A leitura falhou em três apólices seguidas. ' + error.message);
        }
        if (!direct) {
          await chrome.tabs.update(listTab.id, { url: listUrl });
          await goToListPage(listTab, page.first);
        }
      }
      if (page.last >= expected) break;
      page = await goToListPage(listTab, page.last + 1);
      if (page.count !== expected) throw Error('O total da carteira mudou durante a leitura.');
    }
    result.textContent = (saved === expected ? 'Conferência concluída.' : 'Conferência parcial.') + '\n' + counts();
  } catch (error) {
    result.textContent = 'Conferência interrompida. ' + error.message + '\n' + counts();
  } finally {
    for (const tab of [detailsTab, listTab]) if (tab) await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

const params = new URLSearchParams(location.search);
const launcher = document.getElementById('inspect');
if (params.has('job')) {
  launcher.hidden = true;
  const origin = params.get('origin');
  const id = Number(params.get('job'));
  const windowId = Number(params.get('window'));
  if (origins.includes(origin) && Number.isInteger(id) && id > 0 && Number.isInteger(windowId)) void batch({ id }, origin, windowId);
  else result.textContent = 'Abra o piloto a partir da aba Integrações.';
} else {
  launcher.onclick = async () => {
    launcher.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab?.url || 'about:blank');
      if (!origins.includes(url.origin) || url.pathname !== '/agentes/apps') throw Error('Abra a extensão na aba Integrações da Affinity.');
      if (!(await runOn(tab, affinityRequest, url.origin, null))?.allowed) throw Error('Piloto indisponível para esta conta.');
      const job = new URLSearchParams({ job: String(tab.id), origin: url.origin, window: String(tab.windowId) });
      await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') + '?' + job, windowId: tab.windowId });
    } catch (error) { result.textContent = error.message; }
    finally { launcher.disabled = false; }
  };
}
