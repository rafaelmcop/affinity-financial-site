import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const exec=promisify(execFile);
// Match only this bridge's exact profile and browser executable. Never touch
// the user's normal browser, another account, or a prefix-similar directory.
export function profileProcesses(output,{profile,executable,uid=process.getuid?.()}){
 const marker='--user-data-dir='+path.resolve(profile);
 return output.split('\n').flatMap(line=>{
  const m=line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);if(!m||Number(m[1])!==uid)return [];
  const command=m[3],start=command.indexOf(marker),end=start+marker.length;
  if(!command.startsWith(executable+' ')||command.includes(' --type=')||start<0||!(end===command.length||command.slice(end).startsWith(' --')))return [];
  return [Number(m[2])];
 });
}
export async function stopProfileBrowser(profile,executable){
 if(!executable||process.platform!=='darwin')return;
 const scan=async()=>profileProcesses((await exec('/bin/ps',['-axo','uid=,pid=,args='],{maxBuffer:4*1024*1024})).stdout,{profile,executable});
 const pids=await scan();if(!pids.length)return;
 for(const pid of pids)try{process.kill(pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}
 const deadline=Date.now()+5000;
 while(Date.now()<deadline){if(!(await scan()).some(pid=>pids.includes(pid)))return;await new Promise(r=>setTimeout(r,100));}
 for(const pid of await scan())if(pids.includes(pid))try{process.kill(pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}
 for(let i=0;i<20;i++){if(!(await scan()).some(pid=>pids.includes(pid)))return;await new Promise(r=>setTimeout(r,100));}
 throw Error('O navegador anterior ainda está encerrando; a sessão será recuperada novamente.');
}
