(()=>{const logo=document.getElementById('company-logo');if(!logo)return;fetch('/api/site-branding').then(r=>r.ok?r.json():null).then(data=>{const src=data?.images?.logo;if(!/^\/site-brand\/image\/logo\?v=[a-f0-9-]+$/.test(src||''))return;const image=new Image();image.onload=()=>{logo.src=src;};image.src=src;}).catch(()=>{});})();
(async()=>{
 const select=document.getElementById('policy-agent'),status=document.getElementById('agent-status'),contact=document.getElementById('agent-contact'),nav=document.getElementById('agent-nav'),share=document.getElementById('agent-share'),link=document.getElementById('agent-page-link');
 if(!select)return;
 try{
  const response=await fetch('/api/trpc/calendly.publicAgents');if(!response.ok)throw Error();
  const payload=await response.json(),agents=payload?.result?.data?.json;if(!Array.isArray(agents))throw Error();
  select.replaceChildren(new Option('Selecione seu agente',''));
  for(const agent of agents){if(/^[a-z0-9-]+$/.test(agent.slug)&&agent.name)select.add(new Option(String(agent.name),agent.slug));}
  select.disabled=false;
  const apply=()=>{
   const agent=agents.find(a=>a.slug===select.value);contact.hidden=!agent;share.hidden=!agent;
   document.getElementById('agent-heading').textContent=agent?`Conte com ${agent.name}`:'Fale com seu agente';
   document.getElementById('agent-description').textContent=agent?'Seu agente está por perto para orientar você sobre sua apólice.':'Selecione o agente que acompanha sua apólice.';
   nav.href=agent?`/consultor/${encodeURIComponent(agent.slug)}`:'#meu-agente';
   if(agent){contact.href=nav.href;contact.textContent=`Falar com ${agent.name} →`;link.value=`${location.origin}/minha-apolice?agente=${encodeURIComponent(agent.slug)}`;}
   const url=new URL(location.href);if(agent)url.searchParams.set('agente',agent.slug);else url.searchParams.delete('agente');history.replaceState(null,'',url);status.textContent='';
  };
  const requested=new URLSearchParams(location.search).get('agente');
  if(requested&&agents.some(a=>a.slug===requested)){select.value=requested;apply();}
  else if(requested)status.textContent='Este agente não está disponível. Selecione seu agente abaixo.';
  else if(!agents.length)status.textContent='Nenhum perfil de agente está disponível no momento. Confira o contato na sua apólice.';
  select.addEventListener('change',apply);
  document.getElementById('copy-agent-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link.value);status.textContent='Link copiado.';}catch{link.select();status.textContent='Selecione e copie o link acima.';}});
 }catch{select.replaceChildren(new Option('Agentes indisponíveis',''));status.textContent='Não foi possível carregar os agentes. Atualize a página ou consulte o contato na sua apólice.';}
})();
