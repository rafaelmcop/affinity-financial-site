const button = document.getElementById('inspect');
const result = document.getElementById('result');

button.onclick = async () => {
  button.disabled = true;
  result.textContent = 'Conferindo a tabela…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || 'about:blank');
    if (!['https://www.affinityfc.org', 'https://portal.affinityfc.org', 'https://affinityfc.org'].includes(url.origin) || url.pathname !== '/agentes/apps') {
      throw Error('Abra a extensão na aba Integrações do portal Affinity.');
    }
    const [permission] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async origin => {
        if (location.origin !== origin || location.pathname !== '/agentes/apps') return false;
        const response = await fetch('/api/agent/nlg-pilot', { cache: 'no-store', credentials: 'same-origin' });
        return response.ok && (await response.json()).allowed === true;
      },
      args: [url.origin]
    });
    if (!permission?.result) throw Error('Piloto indisponível para esta conta.');
    const tabs = await chrome.tabs.query({ windowId: tab.windowId, url: 'https://www.nationallife.com/agent/*' });
    const path = '/agent/book-of-business/inforce-book/all-clients/all-clients-agent';
    const reader = tabs.find(candidate => new URL(candidate.url).pathname.replace(/\/$/, '') === path);
    if (!reader) throw Error('Abra My Business → Inforce Clients → All Clients na National Life, na mesma janela.');
    const [snapshot] = await chrome.scripting.executeScript({
      target: { tabId: reader.id },
      args: [path],
      func: expectedPath => {
        if (location.origin !== 'https://www.nationallife.com' || location.pathname.replace(/\/$/, '') !== expectedPath) return null;
        const table = [...document.querySelectorAll('table')].find(element => {
          const headings = [...element.querySelectorAll('th')].map(cell => cell.textContent.trim());
          return headings.some(text => /^policy\s*#/i.test(text)) && headings.some(text => /^insured\s*\/\s*annuitant/i.test(text));
        });
        const total = document.body.innerText.match(/Viewing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)\s+entries/i);
        if (!table || !total) return null;
        const [first, last, count] = total.slice(1).map(value => Number(value.replaceAll(',', '')));
        return { first, last, count };
      }
    });
    if (!snapshot?.result) throw Error('A lista All Clients ainda não está pronta ou mudou de formato.');
    const { first, last, count } = snapshot.result;
    result.textContent = ['Página atual: ' + first + '–' + last, 'Total informado pelo portal: ' + count, 'Nenhuma apólice importada.'].join('\n');
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
