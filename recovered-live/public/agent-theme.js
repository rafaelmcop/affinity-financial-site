(()=>{
if(window.affinityAgentTheme)return;window.affinityAgentTheme=true;
let saved='light',selected='light',loaded=false;
const apply=theme=>{document.documentElement.dataset.agentTheme=theme;document.documentElement.style.colorScheme=theme;selected=theme;};
apply(document.documentElement.dataset.agentTheme==='dark'?'dark':'light');
const api=async input=>{const r=await fetch('/api/agent/onboarding/theme',{credentials:'same-origin',cache:'no-store',...(input?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}:{})});const p=await r.json();if(!r.ok)throw Error(p.error||'Não foi possível salvar o tema.');return p;};
function mount(){
if(location.pathname!=='/agentes/configuracoes'||new URLSearchParams(location.search).get('view')==='profile')return;
const main=document.querySelector('main');if(!main||document.getElementById('agent-appearance'))return;
const section=document.createElement('section');section.id='agent-appearance';
section.innerHTML='<h2>Aparência do portal</h2><p>O tema escolhido será usado em todas as suas telas. O padrão é claro.</p><form><div class="theme-options"><label><input type="radio" name="theme" value="light"> Tema claro</label><label><input type="radio" name="theme" value="dark"> Tema escuro</label></div><button id="agent-theme-save" type="submit">Salvar tema</button><p role="status"></p></form>';
main.insertBefore(section,main.children[2]||null);
section.querySelector('input[value="'+selected+'"]').checked=true;
section.querySelector('button').disabled=!loaded;
section.querySelector('form').onchange=e=>{if(e.target.name==='theme')apply(e.target.value);};
section.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=section.querySelector('button'),notice=section.querySelector('[role=status]');button.disabled=true;try{const result=await api({theme:selected});saved=result.theme;apply(saved);notice.textContent='Tema salvo para todas as telas do portal.';}catch(e){apply(saved);section.querySelector('input[value="'+saved+'"]').checked=true;notice.textContent=e.message;}finally{button.disabled=false;}};
}
const observer=new MutationObserver(mount);
const start=()=>{mount();observer.observe(document.body,{childList:true,subtree:true});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
api().then(p=>{saved=p.theme;loaded=true;apply(saved);const section=document.getElementById('agent-appearance');if(section){section.querySelector('input[value="'+saved+'"]').checked=true;section.querySelector('button').disabled=false;}mount();}).catch(()=>{const notice=document.querySelector('#agent-appearance [role=status]');if(notice)notice.textContent='Não foi possível carregar sua preferência. Recarregue a página.';});
})();
