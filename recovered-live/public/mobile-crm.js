const $ = id => document.getElementById(id);
let clients = [];
const labels = { lead: 'Lead', prospect: 'Prospect', contacted: 'Contato iniciado', interested: 'Interesse', followup: 'Follow-up', scheduled: 'Reunião agendada', application: 'Aplicação', submitted: 'Aplicado', client: 'Cliente ativo', completed: 'Cliente ativo', active: 'Cliente ativo', agent: 'Agente', lost: 'Perdido' };
function stage(client) { return labels[client.status] || client.status || 'Etapa não informada'; }
function render() {
  const search = $('search').value.trim().toLocaleLowerCase('pt-BR'), filter = $('stage-filter').value;
  const rows = clients.filter(c => (!filter || stage(c) === filter) && (!search || [c.name, c.phone, c.whatsapp].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(search))));
  $('clients').replaceChildren();
  for (const client of rows) {
    const card = document.createElement('article'), name = document.createElement('h2'), phone = document.createElement('p'), badge = document.createElement('span');
    card.className = 'client'; name.textContent = client.name || 'Nome indisponível'; phone.textContent = client.phone || client.whatsapp || 'Telefone não informado'; badge.className = 'badge'; badge.textContent = stage(client); card.append(name, phone, badge);
    if (client.hasInforcePolicy || client.hasCompletedApplication || client.hasApplication) { const progress = document.createElement('p'); progress.textContent = client.hasInforcePolicy ? 'Apólice em vigor' : client.hasCompletedApplication ? 'Aplicação enviada' : 'Aplicação em andamento'; card.append(progress); }
    $('clients').append(card);
  }
  $('status').textContent = rows.length ? rows.length + ' cliente(s)' : 'Nenhum cliente encontrado nesta seleção.';
}
async function load() {
  $('refresh').disabled = true; $('error').textContent = ''; $('status').textContent = 'Carregando…';
  try {
    const response = await fetch('/api/trpc/crm.list?input=' + encodeURIComponent(JSON.stringify({ json: { agentMode: true } })), { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data.error) throw Error(data?.error?.json?.message || 'Não foi possível consultar o CRM.');
    clients = data.result?.data?.json;
    if (!Array.isArray(clients)) throw Error('O CRM não retornou uma lista de clientes.');
    const selected = $('stage-filter').value;
    $('stage-filter').replaceChildren(new Option('Todas as etapas', ''));
    for (const value of [...new Set(clients.map(stage))].sort()) $('stage-filter').append(new Option(value, value));
    $('stage-filter').value = selected; render();
  } catch (error) { $('error').textContent = error.message; $('status').textContent = ''; }
  finally { $('refresh').disabled = false; }
}
$('search').oninput = render; $('stage-filter').onchange = render; $('refresh').onclick = load;
load();
