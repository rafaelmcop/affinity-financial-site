(() => {
  const state = new Map();
  let scheduled = false;

  const currentRoute = () => location.pathname;
  const routeState = route => {
    if (!state.has(route)) state.set(route, { page: 1, pageSize: 25, signature: '' });
    return state.get(route);
  };

  function findCollection(route) {
    const main = document.querySelector('main');
    if (!main) return null;
    if (route === '/agentes/clientes') {
      const container = [...main.querySelectorAll('div')].find(node =>
        node.classList.contains('overflow-hidden') &&
        [...node.children].some(child => child.querySelector('button.flex-1'))
      );
      if (!container) return null;
      return {
        container,
        items: [...container.children].filter(child =>
          child.id !== 'affinity-list-pagination' && child.querySelector('button.flex-1')
        )
      };
    }
    if (route === '/agentes/apolices') {
      const search = main.querySelector('input[placeholder*="Buscar por cliente"]');
      const container = search?.closest('.grid.gap-4');
      if (!container) return null;
      return {
        container,
        items: [...container.children].filter(child =>
          child.id !== 'affinity-list-pagination' && child.querySelector('h2')
        )
      };
    }
    return null;
  }

  function pageButtons(totalPages, current) {
    if (totalPages <= 9) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const pages = new Set([1, 2, totalPages - 1, totalPages, current - 2, current - 1, current, current + 1, current + 2]);
    const sorted = [...pages].filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((page, index) => {
      if (index && page - sorted[index - 1] > 1) result.push('…');
      result.push(page);
    });
    return result;
  }

  function render() {
    scheduled = false;
    const route = currentRoute();
    const collection = findCollection(route);
    if (!collection) return;
    const config = routeState(route);
    const { container, items } = collection;
    const signature = items.map(item => item.textContent?.slice(0, 120) || '').join('|');
    if (config.signature && config.signature !== signature) config.page = 1;
    config.signature = signature;

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / config.pageSize));
    config.page = Math.min(Math.max(1, config.page), totalPages);
    const start = (config.page - 1) * config.pageSize;
    const end = start + config.pageSize;
    const renderKey = `${route}|${signature}|${config.page}|${config.pageSize}`;
    let controls = document.getElementById('affinity-list-pagination');
    if (controls && controls.previousElementSibling !== container) {
      controls.remove();
      controls = null;
    }
    if (controls?.previousElementSibling === container && controls.dataset.renderKey === renderKey) return;
    items.forEach((item, index) => { item.style.display = index >= start && index < end ? '' : 'none'; });

    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'affinity-list-pagination';
      controls.className = 'rounded-xl border border-white/10 bg-[#0b1524] p-4';
      container.insertAdjacentElement('afterend', controls);
    }
    controls.dataset.renderKey = renderKey;
    controls.style.display = total ? '' : 'none';
    controls.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px">
        <label style="display:flex;align-items:center;gap:8px;color:#d1d5db;font-size:14px">
          Mostrar
          <select data-page-size style="height:36px;border:1px solid rgba(255,255,255,.2);border-radius:7px;background:#000;color:#fff;padding:0 10px">
            ${[25, 50, 100].map(size => `<option value="${size}" ${size === config.pageSize ? 'selected' : ''}>${size}</option>`).join('')}
          </select>
          por página
        </label>
        <span style="color:#9ca3af;font-size:13px">${total ? start + 1 : 0}–${Math.min(end, total)} de ${total}</span>
        <nav data-pages style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">
          <button data-page="1" ${config.page === 1 ? 'disabled' : ''}>«</button>
          <button data-page="${config.page - 1}" ${config.page === 1 ? 'disabled' : ''}>‹</button>
          ${pageButtons(totalPages, config.page).map(page => page === '…'
            ? '<span style="padding:0 4px;color:#9ca3af">…</span>'
            : `<button data-page="${page}" ${page === config.page ? 'data-current="true"' : ''}>${page}</button>`).join('')}
          <button data-page="${config.page + 1}" ${config.page === totalPages ? 'disabled' : ''}>›</button>
          <button data-page="${totalPages}" ${config.page === totalPages ? 'disabled' : ''}>»</button>
        </nav>
      </div>`;

    controls.querySelectorAll('button').forEach(button => {
      button.style.cssText = 'min-width:36px;height:36px;border:1px solid rgba(212,175,55,.35);border-radius:7px;background:#05080d;color:#fff;padding:0 9px;cursor:pointer';
      if (button.dataset.current) button.style.cssText += ';background:#d4af37;color:#000;font-weight:800';
      if (button.disabled) button.style.cssText += ';opacity:.35;cursor:default';
      button.onclick = () => {
        if (button.disabled) return;
        config.page = Math.min(totalPages, Math.max(1, Number(button.dataset.page)));
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });
    controls.querySelector('[data-page-size]').onchange = event => {
      config.pageSize = Number(event.target.value);
      config.page = 1;
      render();
    };
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  addEventListener('popstate', schedule);
  addEventListener('pushState', schedule);
  addEventListener('replaceState', schedule);
  schedule();
})();
