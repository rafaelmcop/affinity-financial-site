import {spawn} from 'node:child_process';
import {randomBytes,createHmac} from 'node:crypto';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const secret=randomBytes(32).toString('hex');
const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,WHATSAPP_BRIDGE_SECRET:secret,WHATSAPP_DATA_DIR:mkdtempSync(path.join(tmpdir(),'affinity-wa-smoke-')),HOST:'127.0.0.1',PORT:'0',CHROME_PATH:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},stdio:['ignore','pipe','pipe']});
child.stderr.on('data',data=>process.stderr.write(data));
const ticket=owner=>{const p=Buffer.from(JSON.stringify({aud:'affinity-whatsapp',owner,exp:Math.floor(Date.now()/1000)+60})).toString('base64url');return p+'.'+createHmac('sha256',secret).update(p).digest('base64url');};
try{
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timed out')),10000);child.once('exit',code=>{clearTimeout(timer);reject(Error('Service exited '+code));});child.stdout.on('data',data=>{for(const line of data.toString().trim().split('\n')){try{const event=JSON.parse(line);if(event.port){clearTimeout(timer);resolve(event.port);}}catch{}}});});
 const base='http://127.0.0.1:'+port;
 const call=(action,owner='one@example.test',method='GET')=>fetch(base+'/'+action,{method,headers:{authorization:'Bearer '+ticket(owner),'content-type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
 assert.equal((await fetch(base+'/status')).status,401);
 assert.equal((await (await call('status')).json()).state,'disconnected');
 assert.equal((await call('connect','one@example.test','POST')).status,200);
 assert.equal((await (await call('status','two@example.test')).json()).state,'disconnected');
 console.log('PASS unauthorized access blocked; second agent cannot see first session');
 let ready=false;
 for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,2000));const s=await (await call('status')).json();if(s.state==='qr'&&s.qr?.startsWith('data:image/png;base64,')){ready=true;break;}if(['error','auth_failure'].includes(s.state))throw Error('QR initialization failed: '+s.state);}
 assert(ready,'QR not generated within 90 seconds');
 console.log('PASS real WhatsApp Web QR generated; no number paired and no messages sent');
}finally{child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},5000).unref();});}
