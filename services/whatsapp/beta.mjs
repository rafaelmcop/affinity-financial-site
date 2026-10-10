import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
const dir=path.join(import.meta.dirname,'data');
for(const name of ['bridge-secret','cloudflared','tunnel.yml'])if(!existsSync(path.join(dir,name)))throw Error('Beta setup missing: '+name);
const local=spawn(process.execPath,[path.join(import.meta.dirname,'local.mjs')],{env:{...process.env,WHATSAPP_LOCAL_PORT:'60713',WHATSAPP_BRIDGE_PORT:'3088',WHATSAPP_MAX_SESSIONS:process.env.WHATSAPP_MAX_SESSIONS||'3',WHATSAPP_SECRET_FILE:path.join(dir,'bridge-secret')},stdio:'inherit'});
const tunnel=spawn(path.join(dir,'cloudflared'),['tunnel','--config',path.join(dir,'tunnel.yml'),'--no-autoupdate','run','affinity-whatsapp-beta'],{stdio:'inherit'});
let stopping=false;
function stop(){if(stopping)return;stopping=true;local.kill('SIGTERM');tunnel.kill('SIGTERM');}
for(const child of [local,tunnel]){child.on('error',stop);child.on('exit',stop);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
