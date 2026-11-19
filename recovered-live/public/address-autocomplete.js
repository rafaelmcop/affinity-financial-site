(() => {
  const address = document.getElementById('address');
  const city = document.getElementById('city');
  const state = document.getElementById('state');
  const zip = document.getElementById('zipCode');
  if (!address || !city || !state || !zip) return;

  const results = document.createElement('select');
  results.hidden = true;
  results.setAttribute('aria-label', 'Endereços encontrados');
  const help = document.createElement('small');
  help.setAttribute('role', 'status');
  const hint = 'Digite o número e a rua. Inclua a cidade ou o ZIP Code para melhorar a busca.';
  help.textContent = hint;
  address.after(results, help);

  let timer, controller, choices = [];
  async function search(query) {
    const request = new AbortController();
    controller = request;
    help.textContent = 'Buscando endereços…';
    try {
      const input = encodeURIComponent(JSON.stringify({ json: { query } }));
      const response = await fetch('/api/trpc/address.search?input=' + input, { signal: request.signal });
      if (!response.ok) throw new Error('address lookup failed');
      const matches = (await response.json())?.result?.data?.json;
      if (request.signal.aborted) return;
      choices = Array.isArray(matches) ? matches : [];
      results.replaceChildren(new Option('Selecione um endereço', ''), ...choices.map((match, index) => new Option(match.full, String(index))));
      results.hidden = !choices.length;
      help.textContent = choices.length ? 'Escolha o endereço para preencher cidade, estado e ZIP Code.' : 'Nenhum endereço encontrado. Confira o número e a rua e informe a cidade ou o ZIP Code.';
    } catch {
      if (!request.signal.aborted) help.textContent = 'Busca indisponível. Você pode preencher o endereço manualmente.';
    }
  }
  function scheduleSearch() {
    clearTimeout(timer);
    controller?.abort();
    results.hidden = true;
    choices = [];
    const street = address.value.trim();
    if (street.length < 6) {
      help.textContent = hint;
      return;
    }
    const query = street.includes(',') ? street : [street, city.value, state.value, zip.value].filter(value => value.trim()).join(', ');
    timer = setTimeout(() => search(query), 650);
  }
  address.addEventListener('input', scheduleSearch);
  for (const field of [city, state, zip]) field.addEventListener('change', scheduleSearch);
  results.addEventListener('change', () => {
    const selected = choices[results.value];
    if (!selected) return;
    for (const [field, value] of [[address, selected.street], [city, selected.city], [state, selected.state], [zip, selected.zip]]) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    clearTimeout(timer);
    results.hidden = true;
    help.textContent = 'Endereço preenchido. Confira os dados e acrescente o apartamento, se necessário.';
  });
})();
