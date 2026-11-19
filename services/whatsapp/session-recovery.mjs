// Retry saved sessions after boot/network failures, without clearing LocalAuth
// or attempting to pair sessions that require a fresh QR Code.
export function sessionRecovery({owners,sessions,connect,eligible=()=>true,now=Date.now,onError=()=>{}}){
 const attempts=new Map();let running=false,stopped=false;
 return {stop(){stopped=true;},async tick(){if(running||stopped)return;running=true;
  try{for(const owner of owners().filter(eligible)){
   if(stopped)break;const state=sessions.get(owner);
   if(state?.state==='ready'){attempts.delete(owner);continue;}
   if(['connecting','authenticating'].includes(state?.state)&&now()-(state.startedAt||now())>180000)state.state='error';
   if(state&&!['error','disconnected'].includes(state.state))continue;
   const previous=attempts.get(owner);if(previous&&now()<previous.next)continue;
   const count=(previous?.count||0)+1;attempts.set(owner,{count,next:now()+Math.min(300000,30000*2**Math.min(count-1,4))});
   try{const current=await connect(owner);let timeout;try{await Promise.race([current?.initialization,new Promise(resolve=>{timeout=setTimeout(resolve,150000);timeout.unref?.();})]);}finally{clearTimeout(timeout);}}catch{onError();}
  }}finally{running=false;}
 }};
}
