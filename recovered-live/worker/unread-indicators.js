export function createUnreadTracker(root,{markRead,onRead=()=>{}}){
 const timers=new Map(),pending=new Set();let flushing=false;
 const visible=node=>{
  if(document.visibilityState!=='visible'||!document.hasFocus()||!node.isConnected||node.dataset.unread!=='true'||!root.clientHeight)return false;
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return Math.min(a.bottom,b.bottom,innerHeight)-Math.max(a.top,b.top,0)>=Math.min(120,a.height/2);
 };
 async function flush(){
  if(flushing||!pending.size)return;flushing=true;
  const ids=[...pending].slice(0,100);
  try{
   const result=await markRead(ids);
   for(const id of result.read||[]){const node=[...root.querySelectorAll('[data-message-id]')].find(n=>n.dataset.messageId===id);if(node){node.dataset.unread='false';node.querySelector('.unread-badge')?.remove();}}
   onRead(result.read||[]);
  }catch{/* Keep the badge until its read state is saved successfully. */}
  finally{ids.forEach(id=>pending.delete(id));flushing=false;if(pending.size)void flush();}
 }
 function schedule(node){
  const id=node.dataset.messageId;if(!visible(node)||timers.has(id)||pending.has(id))return;
  timers.set(id,setTimeout(()=>{timers.delete(id);if(visible(node)){pending.add(id);void flush();}},800));
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)schedule(entry.target);else{const id=entry.target.dataset.messageId;clearTimeout(timers.get(id));timers.delete(id);if(!entry.target.isConnected)observer.unobserve(entry.target);}}},{root,threshold:[0,0.1,0.5]});
 return {watch(){for(const node of root.querySelectorAll('[data-message-id]')){if(node.dataset.unread==='true'){observer.observe(node);schedule(node);}else observer.unobserve(node);}},destroy(){observer.disconnect();timers.forEach(clearTimeout);timers.clear();}};
}
export const unreadIndicatorsScript=createUnreadTracker.toString();
