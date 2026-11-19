(()=>{
 if(window.affinityFiveRingsDirect)return;window.affinityFiveRingsDirect=true;
 const target='https://www.affinityfc.org/agent-five-rings-sync.html?manual=1';
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('[data-five-rings-connect],a[href="/agentes/configuracoes#five-rings"]');
  if(!link)return;
  event.preventDefault();event.stopImmediatePropagation();location.assign(target);
 },true);
})();
