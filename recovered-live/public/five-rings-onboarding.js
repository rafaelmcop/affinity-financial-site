(async()=>{
if(window.affinityFiveRingsReminder)return;window.affinityFiveRingsReminder=true;
if(!['/agentes/dashboard','/agentes/inicio'].includes(location.pathname))return;
try{
const response=await fetch('/api/agent/onboarding/status',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;
const status=await response.json();if(!status.fiveRingsReminderDue)return;
const panel=document.createElement('section');panel.id='five-rings-onboarding';panel.style.cssText='padding:20px;margin:16px 0;background:#fff7db;color:#16283b;border:2px solid #d4af37;border-radius:12px';
panel.innerHTML='<h2>Conecte seu portal Five Rings</h2><p>Cadastre o e-mail e a senha na conexão protegida para sincronizar clientes e apólices.</p><a href="/agentes/configuracoes#five-rings" style="display:inline-block;padding:12px 20px;background:#d4af37;color:#14283d;border-radius:8px;font-weight:bold">Cadastrar acesso Five Rings</a> <button type="button" style="padding:12px 20px;border:2px solid #526170;border-radius:8px;background:white;color:#14283d;font-weight:bold">Ainda não tenho — lembrar em 15 dias</button><p role="status"></p>';
(document.querySelector('main')||document.body).prepend(panel);
panel.querySelector('button').onclick=async e=>{e.target.disabled=true;try{const r=await fetch('/api/agent/onboarding/five-rings-postpone',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'});if(!r.ok)throw Error();panel.remove();}catch{panel.querySelector('[role=status]').textContent='Não foi possível adiar. Tente novamente.';e.target.disabled=false;}};
}catch{}
})();
