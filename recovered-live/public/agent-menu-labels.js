(() => {
  if (!location.pathname.startsWith('/agentes/')) return;
  const update = () => {
    document.querySelectorAll('nav button').forEach((button) => {
      const text = (button.textContent || '').trim();
      if (!text.startsWith('Aplicações concluídas')) return;
      const label = [...button.querySelectorAll('span')].find((span) => (span.textContent || '').trim() === 'Aplicações concluídas');
      if (label) label.textContent = 'Apólices concluídas';
    });
    if (location.pathname.replace(/\/$/, '') !== '/agentes/crm') return;
    const stageLabels = {
      new: 'Primeiro contato',
      contacted: 'Follow-up',
      meeting: 'Reunião',
      proposal: 'Fechamento',
      client: 'Fechado',
      closed: 'Fechado'
    };
    document.querySelectorAll('select').forEach((select) => {
      const options = [...select.options];
      if (!options.some((option) => Object.hasOwn(stageLabels, option.value))) return;
      options.forEach((option) => {
        if (!Object.hasOwn(stageLabels, option.value)) return;
        option.textContent = stageLabels[option.value];
        if (option.value === 'closed' && select.value !== 'closed') option.hidden = true;
      });
      const desiredOrder = ['new', 'meeting', 'proposal', 'contacted', 'client', 'closed'];
      const currentOrder = options.filter((option) => desiredOrder.includes(option.value)).map((option) => option.value);
      if (currentOrder.join('|') !== desiredOrder.join('|')) desiredOrder.forEach((value) => {
          const option = options.find((item) => item.value === value);
          if (option) select.appendChild(option);
        });
    });
    const visibleLabels = new Map([
      ['Novo contato', 'Primeiro contato'],
      ['Contatado', 'Follow-up'],
      ['Proposta', 'Fechamento'],
      ['Cliente', 'Fechado'],
      ['Encerrado', 'Fechado']
    ]);
    document.querySelectorAll('main span').forEach((span) => {
      const current = (span.textContent || '').trim();
      if (visibleLabels.has(current)) span.textContent = visibleLabels.get(current);
    });
  };
  update();
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
