const result = document.getElementById('result');
const base = 'https://www.nationallife.com';
const listPath = '/agent/book-of-business/inforce-book/all-clients/all-clients-agent';
const pilotMinimum = 264; // Last unfiltered total confirmed for the pilot portfolio.
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
  if (record && [401,403].includes(response.status)) throw Error('A sessão do piloto expirou.');
  if (record && !response.ok) throw Error(payload?.error || 'A Affinity recusou a validação.');
  return response.ok ? payload : null;
}

function readPage(path, action) {
  if (location.origin !== 'https://www.nationallife.com' || !location.pathname.startsWith('/agent/')) return null;
  if (location.pathname.replace(/\/$/, '') === path) {
    const visible = element => element.getClientRects().length && !element.closest('[aria-disabled="true"],.disabled') && !element.disabled;
    const table = [...document.querySelectorAll('table')].find(element => {
      const headers = [...element.querySelectorAll('th')].map(cell => cell.textContent.trim());
      return headers.some(text => /^policy\s*#/i.test(text)) && headers.some(text => /^insured\s*\/\s*annuitant/i.test(text));
    });
    const total = document.body.innerText.match(/Viewing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)\s+entries/i);
    if (!table || !total) return null;
    const [first, last, count] = total.slice(1).map(value => Number(value.replaceAll(',', '')));
    if (action === 'clear-filters') {
      const controls = [...document.querySelectorAll('button,a,[role=button],input[type=reset]')].filter(visible);
      const clear = controls.find(element => [element.textContent, element.getAttribute('aria-label'), element.getAttribute('title'), element.value].some(value => /^(clear|reset) (all )?(filters?|search)$/i.test(value?.trim() || '')));
      if (clear) {
        clear.click();
        return true;
      }
      const allClients = controls.find(element => /^all clients(?:\s+\d+)?$/i.test(element.textContent.trim()));
      if (allClients) {
        allClients.click();
        return true;
      }
      return false;
    }
    if (action === 'next') {
      if (last >= count) return false;
      const nextPage = String(Math.ceil(last / (last - first + 1)) + 1);
      const label = element => String(element.textContent || '').trim().replace(/\s+/g, ' ');
      const nextLabel = /^(next(?: page)?|›|»)[.!]?$/i;
      const footerText = /previous[\s\S]*next/i;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const controls = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (!nextLabel.test(text) && text !== nextPage) continue;
        const element = node.parentElement;
        if (!element || !visible(element)) continue;
        for (let group = element.parentElement, depth = 0; group && group !== document.body && depth < 10; group = group.parentElement, depth++) {
          if (!footerText.test(group.innerText || group.textContent)) continue;
          const clickable = element.closest('button,a,[role=button],[role=link],li,[tabindex]') || element;
          if (group.contains(clickable) && visible(clickable)) controls.push({ clickable, isNext: nextLabel.test(text), size: label(group).length });
          break;
        }
      }
      controls.sort((a, b) => a.size - b.size || Number(a.isNext) - Number(b.isNext));
      if (controls.length) {
        controls[0].clickable.click();
        return true;
      }
      const accessible = [...document.querySelectorAll('button,a,[role=button],[role=link]')].filter(element =>
        visible(element) && [element.getAttribute('aria-label'), element.getAttribute('title'), label(element)].some(value => nextLabel.test(value?.trim() || '')));
      if (accessible.length === 1) {
        accessible[0].click();
        return true;
      }
      return false;
    }
    const headers = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim());
    const policyIndex = headers.findIndex(text => /^policy\s*#/i.test(text));
    const dateIndex = headers.findIndex(text => /^issue date/i.test(text));
    const statusIndex = headers.findIndex(text => /^status$/i.test(text));
    const productIndex = headers.findIndex(text => /^(type|product)$/i.test(text));
    const cells = policyIndex >= 0 ? [...table.querySelectorAll('tbody tr')].map(row => [row.cells[policyIndex], row.cells[dateIndex], row.cells[statusIndex], row.cells[productIndex]]) : [];
    const rows = cells.map(([policy, date, status, product]) => [
      policy?.textContent.trim(), date?.textContent.trim(), policy?.querySelector('a[href]')?.href || '', status?.textContent.trim(), product?.textContent.trim()
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
  const normalize = value => String(value ?? '').replace(/[\s\u00a0]+/g, ' ').trim();
  const visible = element => element.getClientRects().length > 0;
  const tab = name => {
    for (const selector of ['[role=tab],button,a,[data-toggle="tab"],[data-bs-toggle="tab"]', 'li,span,div']) {
      const control = [...document.querySelectorAll(selector)].find(element =>
        visible(element) && normalize(element.textContent).toLowerCase() === name &&
        ![...element.children].some(child => visible(child) && normalize(child.textContent).toLowerCase() === name && child.matches('button,a,[role=tab]')));
      if (control) return control;
    }
    return null;
  };
  if (['policy','payments','transactions'].includes(action)) {
    const control = tab(action);
    if (!control) return { number, unavailable: true };
    control.click();
    return { number };
  }

  const lines = body().split('\n').map(normalize).filter(Boolean);
  function field(labels, pattern) {
    const keys = labels.map(label => label.toLowerCase());
    const candidates = new Set();
    const add = value => {
      let normalized = normalize(value).replace(/^(?:USD\s*)?\$\s*/i, '$');
      if (pattern === money) {
        const amount = /^\$(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(normalized);
        if (amount) normalized = '$' + amount[1] + '.' + (amount[2] || '').padEnd(2, '0');
      }
      if (pattern.test(normalized)) candidates.add(normalized);
    };
    const elements = [...document.querySelectorAll('span,div,p,label,small,dt,dd,strong,td')];
    for (const element of elements) {
      if (!keys.includes(normalize(element.textContent).toLowerCase()) || !visible(element)) continue;
      if ([...element.children].some(child => keys.includes(normalize(child.textContent).toLowerCase()))) continue;
      for (let group = element.parentElement, depth = 0; group && depth < 3; group = group.parentElement, depth++) {
        const text = normalize(group.innerText);
        const key = keys.find(label => text.toLowerCase().startsWith(label) || text.toLowerCase().endsWith(label));
        if (!key) continue;
        const value = text.toLowerCase().startsWith(key) ? text.slice(key.length) : text.slice(0, -key.length);
        const before = candidates.size;
        add(value.replace(/^\s*:\s*|\s*:\s*$/g, ''));
        if (candidates.size > before) break;
      }
    }
    if (!candidates.size) for (const [index, line] of lines.entries()) {
      if (!keys.includes(line.toLowerCase())) continue;
      add(lines[index - 1]);
    }
    return candidates.size === 1 ? [...candidates][0] : null;
  }
  const money = /^\$[\d,]+\.\d{2}$/;
  const paymentsVisible = lines.some(line => /^payment details$/i.test(line));
  const transactionsVisible = lines.some(line => /^(transaction history|transaction details|transaction date|transaction type)$/i.test(line));
  const paymentFieldsVisible = paymentsVisible || transactionsVisible;
  return {
    number,
    paymentsVisible,
    transactionsVisible,
    deathBenefit: field(['Net Death Benefit'], money),
    premium: paymentFieldsVisible ? (field(['Premium'], money) || field(['Modal Premium'], money)) : null,
    frequency: paymentFieldsVisible ? field(['Premium Payment Frequency', 'Payment Frequency'], /^(Monthly|Quarterly|Semi[ -]?Annual(?:ly)?|Annual(?:ly)?|Weekly|Bi[ -]?Weekly)$/i) : null
  };
}

async function readPolicy(tab, number) {
  let expectedNumber = number;
  async function readSection(section, ready) {
    const opened = await runOn(tab, readPage, listPath, section);
    if (!opened || (expectedNumber && opened.number !== expectedNumber)) throw Error('A ficha mudou durante a leitura. Abra a apólice e tente novamente.');
    if (opened.unavailable) return opened;
    let snapshot;
    for (let attempt = 0; attempt < 12; attempt++) {
      snapshot = await runOn(tab, readPage, listPath, 'snapshot');
      if (snapshot?.number !== opened.number) throw Error('A ficha mudou durante a leitura.');
      if (ready(snapshot)) return snapshot;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    return snapshot || opened;
  }

  result.textContent = 'Conferindo a cobertura na aba Policy…';
  const policy = await readSection('policy', item => item.deathBenefit);
  expectedNumber = policy.number;
  result.textContent = 'Conferindo o prêmio na aba Payments…';
  const payment = await readSection('payments', item => item.premium && item.frequency);
  let transactions;
  if (!payment.premium || !payment.frequency) {
    result.textContent = 'Conferindo prêmio e frequência na aba Transactions…';
    transactions = await readSection('transactions', item => item.transactionsVisible && (payment.premium || item.premium) && (payment.frequency || item.frequency));
    if (!transactions.transactionsVisible) transactions = null;
  }
  return { number: policy.number, deathBenefit: policy.deathBenefit, premium: payment.premium || transactions?.premium, frequency: payment.frequency || transactions?.frequency };
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
    if (!await runOn(tab, readPage, listPath, 'next')) throw Error('Não encontrei o controle da próxima página no rodapé de All Clients.');
    page = await waitFor(tab, snapshot => snapshot.first > previous.first, 'A próxima página não carregou.');
    if (page.first !== previous.last + 1 || page.count !== previous.count) throw Error('A lista mudou durante a leitura.');
  }
  if (page.first !== first) throw Error('A paginação mudou durante a leitura.');
  return page;
}

async function batch(affinity, origin, windowId) {
  const listUrl = base + listPath;
  let listTab, detailsTab, expected = pilotMinimum, saved = 0, matched = 0, differing = 0, failed = 0, pending = 0;
  const seen = new Set();
  const counts = () => `Registradas: ${saved}/${expected} · Com campos pendentes: ${pending} · No CRM: ${matched} · Com divergência: ${differing} · Não registradas: ${failed}`;
  const issues = document.getElementById('issues');
  const issueList = document.getElementById('issue-list');
  function note(number, message) {
    issues.hidden = false;
    const entry = document.createElement('li');
    entry.textContent = number + ' · ' + message;
    issueList.append(entry);
  }
  const tabMissing = error => /no tab with id|tab (?:was )?closed/i.test(error.message);
  async function openReader(tab, url) {
    if (tab) {
      try { return await chrome.tabs.update(tab.id, { url }); }
      catch (error) { if (!tabMissing(error)) throw error; }
    }
    return chrome.tabs.create({ url, active: false, windowId });
  }
  async function restorePage(first, reload = false) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (!listTab || reload || attempt) listTab = await openReader(listTab, listUrl);
        const listing = await waitFor(listTab, snapshot => snapshot.count > 0, 'Não consegui abrir All Clients. Confira o login da National Life.');
        if (listing.count < expected) {
          result.textContent = 'Lista com ' + listing.count + ' registro(s). Tentando remover filtros…';
          if (await runOn(listTab, readPage, listPath, 'clear-filters')) {
            await waitFor(listTab, snapshot => snapshot.count >= expected, 'All Clients continuou filtrada. Limpe a pesquisa e os filtros na National Life.');
          } else {
            throw Error('All Clients mostrou ' + listing.count + ' de pelo menos ' + expected + ' registros esperados. Limpe a pesquisa e os filtros na National Life.');
          }
        }
        return await goToListPage(listTab, first);
      } catch (error) {
        lastError = error;
        note('Página iniciada no registro ' + first, error.message);
        await pause(600);
      }
    }
    throw lastError;
  }
  try {
    if (!(await runOn(affinity, affinityRequest, origin, null))?.allowed) throw Error('Piloto indisponível para esta conta.');
    result.textContent = 'Abrindo All Clients na National Life…';
    let page = await restorePage(1);
    if (page.count < pilotMinimum) throw Error('A lista está abaixo do total de referência da carteira.');
    expected = page.count;
    while (true) {
      if (page.rows.length !== page.last - page.first + 1) throw Error('A página da carteira veio incompleta.');
      for (const [rawNumber, issueDate, href, status, product] of page.rows) {
        const number = rawNumber?.toUpperCase();
        if (!number || seen.has(number)) { failed++; continue; }
        seen.add(number);
        result.textContent = counts() + '\nAbrindo a próxima apólice…';
        let direct;
        try {
          const url = new URL(href);
          if (url.origin === base && url.pathname.startsWith('/agent/') && url.pathname.replace(/\/$/, '') !== listPath) direct = url.href;
        } catch {}
        let record = {}, detailError = '';
        for (let attempt = 0; attempt < 2; attempt++) try {
          if (direct) {
            detailsTab = await openReader(detailsTab, direct);
          } else if (!await runOn(listTab, readPage, listPath, { open: number })) {
            throw Error('O link da ficha não abriu.');
          }
          const reader = direct ? detailsTab : listTab;
          await waitFor(reader, item => item.number === number, 'A ficha não carregou.');
          record = await readPolicy(reader, number);
          if (record.number !== number) throw Error('A ficha aberta tem outro número.');
          break;
        } catch (error) {
          record = {};
          detailError = error.message;
          if (!tabMissing(error) || attempt) break;
          note(number, 'Aba de leitura fechada. Tentando novamente.');
          if (!direct) await restorePage(page.first, true);
        }
        let comparison;
        try {
          comparison = await runOn(affinity, affinityRequest, origin, { ...record, number, issueDate, status, product });
          if (!comparison?.saved) throw Error('A Affinity não confirmou o registro.');
        } catch (error) {
          failed++;
          note(number, 'Não registrada · ' + error.message);
          if (tabMissing(error) || /sessão do piloto expirou/i.test(error.message)) throw Error('A aba Integrações foi fechada ou perdeu a sessão. Abra a Affinity e inicie novamente.');
        }
        if (comparison?.saved) saved++;
        if (comparison?.matched) matched++;
        if (comparison?.differences.length) differing++;
        if (comparison?.saved && (comparison.missing.length || detailError)) {
          pending++;
          note(number, [comparison.category, comparison.missing.join(', '), detailError].filter(Boolean).join(' · '));
        }
        if (!direct) {
          await restorePage(page.first, true);
        }
      }
      if (page.last >= expected) break;
      page = await restorePage(page.last + 1);
      if (page.count !== expected) throw Error('O total da carteira mudou durante a leitura.');
    }
    result.textContent = (saved === expected ? 'Carteira percorrida.' : 'Conferência parcial.') + '\n' + counts();
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
