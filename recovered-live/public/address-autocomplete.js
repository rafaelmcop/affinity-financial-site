(() => {
  const attached = new WeakSet();
  const endpoint = '/api/trpc/address.search';
  const setup = address => {
    if (!address || attached.has(address)) return;
    const city = document.getElementById('city'), state = document.getElementById('state'), zip = document.getElementById('zipCode');
    if (!city || !state || !zip) return;
    attached.add(address);
    address.autocomplete = 'street-address';
    address.setAttribute('aria-autocomplete', 'list');
    const list = document.createElement('datalist');
    list.id = `address-suggestions-${Math.random().toString(36).slice(2)}`;
    address.setAttribute('list', list.id);
    address.insertAdjacentElement('afterend', list);
    const help = document.createElement('small');
    help.textContent = 'Comece a digitar e selecione um endereço sugerido.';
    help.style.cssText = 'display:block;margin-top:6px;color:#9ca3af;font-size:12px';
    list.insertAdjacentElement('afterend', help);
    let timer, controller, choices = new Map();
    const apply = value => {
      const selected = choices.get(value);
      if (!selected) return false;
      address.value = selected.street;
      city.value = selected.city;
      state.value = selected.state;
      zip.value = selected.zip;
      for (const field of [address, city, state, zip]) field.dispatchEvent(new Event('change', { bubbles: true }));
      help.textContent = 'Endereço confirmado e campos preenchidos automaticamente.';
      help.style.color = '#86efac';
      return true;
    };
    const search = async value => {
      controller?.abort();
      controller = new AbortController();
      help.textContent = 'Buscando endereços…';
      help.style.color = '#9ca3af';
      try {
        const input = encodeURIComponent(JSON.stringify({ json: { query: value } }));
        const response = await fetch(`${endpoint}?input=${input}`, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('address lookup failed');
        const payload = await response.json(), matches = payload?.result?.data?.json || [];
        choices = new Map(matches.slice(0, 6).map(match => [match.full, match]));
        list.innerHTML = [...choices.keys()].map(item => `<option value="${item.replaceAll('&','&amp;').replaceAll('"','&quot;')}"></option>`).join('');
        help.textContent = choices.size ? 'Selecione uma das sugestões para completar cidade, estado e ZIP Code.' : 'Continue digitando o endereço, incluindo número e rua.';
      } catch (error) {
        if (error?.name !== 'AbortError') help.textContent = 'Não foi possível buscar agora. Você ainda pode preencher manualmente.';
      }
    };
    address.addEventListener('input', () => {
      if (apply(address.value)) return;
      clearTimeout(timer);
      const value = address.value.trim();
      list.innerHTML = '';
      if (value.length < 6) { help.textContent = 'Digite pelo menos o número e o começo da rua.'; return; }
      timer = setTimeout(() => search(value), 650);
    });
    address.addEventListener('change', () => apply(address.value));
  };
  const scan = () => setup(document.getElementById('address'));
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
