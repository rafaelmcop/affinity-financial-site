import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';

// Loopback-only test launcher. Neither bridge credentials nor the signing key
// are given to the browser or saved in Git. Sessions/history persist in data/.
const secret=randomBytes(32).toString('hex'),cookie=randomBytes(32).toString('hex');
let entrance=randomBytes(24).toString('hex');
const owner=process.env.WHATSAPP_TEST_OWNER||'rafael.cunha@affinityfc.org';
const bridge=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,WHATSAPP_BRIDGE_SECRET:secret,HOST:'127.0.0.1',PORT:'0',CHROME_PATH:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},stdio:['ignore','pipe','pipe']});
bridge.stderr.on('data',data=>process.stderr.write(data));
const bridgePort=await new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error('O serviço não iniciou.')),15000);
 bridge.once('exit',()=>{clearTimeout(timer);reject(Error('O serviço encerrou antes de iniciar.'));});
 bridge.stdout.on('data',data=>{for(const line of data.toString().trim().split('\n'))try{const event=JSON.parse(line);if(event.port){clearTimeout(timer);resolve(event.port);}}catch{}});
}).catch(error=>{bridge.kill();throw error;});
const same=(a,b)=>{const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);};
const sign=()=>{const payload=Buffer.from(JSON.stringify({aud:'affinity-whatsapp',owner,exp:Math.floor(Date.now()/1000)+60})).toString('base64url');return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');};
const root=new URL('../../recovered-live/public/',import.meta.url);
let origin;
const server=http.createServer(async(req,res)=>{
 const reply=(body,status=200,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"});res.end(body);};
 if(req.headers.host!==new URL(origin).host)return reply('{"error":"Host inválido"}',403);
 const url=new URL(req.url,origin);
 if(entrance&&req.method==='GET'&&same(url.pathname,'/start/'+entrance)){
  entrance=null;res.writeHead(302,{'set-cookie':`waLocal=${cookie}; HttpOnly; SameSite=Strict; Path=/`,'location':'/','cache-control':'no-store','referrer-policy':'no-referrer'});return res.end();
 }
 const supplied=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('waLocal='))?.slice(8)||'';
 if(!same(supplied,cookie))return reply('Abra o link de acesso criado pelo inicializador do teste.',401,'text/plain;charset=utf-8');
 try{
  if(url.pathname==='/'&&req.method==='GET'){
   const html=readFileSync(new URL('agent-whatsapp.html',root),'utf8').replace(/<script src="\/agent-unified-menu[^>]*><\/script>/,'').replace('<h1>WhatsApp</h1>','<h1>WhatsApp · teste local</h1><p>Teste nesta máquina. Mantenha o serviço aberto e o computador ligado. O histórico fica salvo neste computador.</p>');
   return reply(html,200,'text/html;charset=utf-8');
  }
  if(url.pathname==='/agent-whatsapp.js'&&req.method==='GET')return reply(readFileSync(new URL('agent-whatsapp.js',root)),200,'text/javascript');
  const action=url.pathname.replace('/api/agent/whatsapp/','');
  if(!url.pathname.startsWith('/api/agent/whatsapp/')||!['status','connect','disconnect','chats','messages','send'].includes(action))return reply('{"error":"Não encontrado"}',404);
  const mutation=['connect','disconnect','send'].includes(action);
  if(req.method!==(mutation?'POST':'GET'))return reply('{"error":"Método inválido"}',405);
  if(mutation&&(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')))return reply('{"error":"Origem inválida"}',403);
  let body;if(mutation){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>20000)return reply('{"error":"Mensagem muito grande"}',413);chunks.push(c);}body=Buffer.concat(chunks);}
  const upstream=new URL('/'+action,'http://127.0.0.1:'+bridgePort);upstream.search=url.search;
  const response=await fetch(upstream,{method:req.method,headers:{authorization:'Bearer '+sign(),'content-type':'application/json'},...(mutation?{body}:{}),signal:AbortSignal.timeout(25000)});
  reply(await response.text(),response.status);
 }catch{reply('{"error":"O serviço não respondeu. Confira o status antes de reenviar."}',503);}
});
server.listen(Number(process.env.WHATSAPP_LOCAL_PORT||0),'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;console.log(JSON.stringify({event:'local_whatsapp_ready',url:origin+'/start/'+entrance}));});
function stop(){server.close();bridge.kill('SIGTERM');setTimeout(()=>{bridge.kill('SIGKILL');process.exit(0);},5000).unref();}
bridge.on('exit',()=>{server.close();process.exit(0);});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
