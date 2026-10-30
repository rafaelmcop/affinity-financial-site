export function mountAssistantNotifications(open){
 let ids=new Set(),busy=false,sequence=0;
 async function refresh(reset=false){if(reset){++sequence;for(const id of ids)window.affinityClearNotice?.(id);ids.clear();busy=false;}if(busy)return;busy=true;const ticket=++sequence;try{const response=await fetch('/api/assistants/notifications',{credentials:'same-origin',cache:'no-store'});if(!response.ok){if([401,403].includes(response.status)){for(const id of ids)window.affinityClearNotice?.(id);ids.clear();}return;}const data=await response.json();if(ticket!==sequence)return;
 const next=new Set();for(const item of data.payments||[]){const id='assistant-payment:'+data.owner+':'+item.id;next.add(id);window.affinityNotify?.({id,persistent:true,message:'Pagamento pendente · '+String(item.title||'').replace(/^\[Pagamento [^\]]+\]\s*/,''),label:'Abrir caso de pagamento',onOpen:()=>open('/agentes/caso-pagamento?task='+encodeURIComponent(item.id))});}
 for(const id of ids)if(!next.has(id))window.affinityClearNotice?.(id);ids=next;
 }catch{}finally{if(ticket===sequence)busy=false;}}
 window.addEventListener('focus',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});window.addEventListener('affinity-notifications-changed',()=>void refresh());setInterval(()=>{if(!document.hidden)void refresh();},30000);void refresh();return refresh;
}
