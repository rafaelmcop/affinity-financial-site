(()=>{let pending=false;
async function send(message){return await chrome.runtime.sendMessage(message);}
window.addEventListener('message',async event=>{
 if(event.source!==window||event.origin!=='https://www.affinityfc.org'||event.data?.type!=='affinity-five-rings-request'||typeof event.data.id!=='string'||!['open','collect','ping'].includes(event.data.action)||pending)return;
 pending=true;const id=event.data.id;
 try{
  let result;
  if(event.data.action==='collect'){
   result=await send({action:'collectStart',portalEmail:event.data.portalEmail,manualConfirmed:event.data.manualConfirmed===true});
   if(result?.ok){const jobId=result.jobId,deadline=Date.now()+230000;do{await new Promise(resolve=>setTimeout(resolve,1500));result=await send({action:'collectStatus',jobId});}while(result?.processing&&Date.now()<deadline);if(result?.processing)result={ok:false,error:'A leitura demorou demais. Tente novamente.'};}
  }else result=await send({action:event.data.action});
  window.postMessage({type:'affinity-five-rings-response',id,result},location.origin);
 }catch{window.postMessage({type:'affinity-five-rings-response',id,result:{ok:false,error:'O navegador interrompeu a leitura. Recarregue a Affinity e tente novamente.'}},location.origin);}
 finally{pending=false;}
});})();
