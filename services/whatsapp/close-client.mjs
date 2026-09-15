export async function closeClient(client){
 const child=client.pupBrowser?.process?.();
 let timer;
 try{await Promise.race([client.destroy(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Close timeout')),5000);})]);}
 catch{/* A detached browser can leave its own child process running. */}
 finally{clearTimeout(timer);}
 if(child&&child.exitCode===null){
  child.kill('SIGTERM');
  await new Promise(resolve=>{const timeout=setTimeout(resolve,3000);child.once('exit',()=>{clearTimeout(timeout);resolve();});});
  if(child.exitCode===null&&child.signalCode===null)throw Error('O navegador do teste ainda está encerrando. Aguarde antes de reconectar.');
 }
}
