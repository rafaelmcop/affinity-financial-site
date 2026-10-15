import http from 'node:http';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';

const secret=process.env.WHATSAPP_BRIDGE_SECRET;
if(!secret||secret.length<32)throw Error('Bridge secret missing');
let entrance=randomBytes(24).toString('hex');
const cookie=randomBytes(32).toString('hex');
const port=Number(process.env.WHATSAPP_PAIR_PORT||60713);
const origin='http://127.0.0.1:'+port;
let owner='';
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const page=`<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Affinity · conectar WhatsApp</title><style>body{font:18px system-ui;background:#151515;color:#eee;max-width:680px;margin:60px auto;padding:24px}input,button{font:inherit;padding:12px;margin:10px 0}button{background:#d2b573;border:0;border-radius:6px}img{display:block}small{display:block;color:#bbb}</style><h1>Conectar WhatsApp da Affinity</h1><p>Informe o mesmo e-mail usado como agente no portal.</p><input id="owner" type="email" autocomplete="email" placeholder="E-mail do agente"><button id="connect">Gerar QR Code</button><p id="status">Envios bloqueados até confirmação do responsável.</p><img id="qr" alt="QR Code do WhatsApp" hidden><p>No celular: WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho.</p><small>Esta página funciona somente neste Mac. A conexão usa WhatsApp Web via whatsapp-web.js, uma integração não oficial.</small><script src="/pair.js"></script></html>`;
const script=`const status=document.getElementById('status'),qr=document.getElementById('qr');document.getElementById('connect').onclick=async()=>{const owner=document.getElementById('owner').value.trim();if(!owner)return;const r=await fetch('/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({owner})});const d=await r.json();status.textContent=d.error||'Preparando conexão…';};async function poll(){try{const r=await fetch('/status');const d=await r.json();status.textContent=d.state==='ready'?'WhatsApp conectado. Envios continuam bloqueados.':d.state==='qr'?'Escaneie o QR Code abaixo.':d.state==='connecting'?'Abrindo WhatsApp Web…':d.state==='authenticating'?'Autenticando…':d.state==='error'?'Falha na conexão. Avise o responsável.':'Aguardando conexão.';qr.hidden=!d.qr;if(d.qr)qr.src=d.qr;}catch{status.textContent='Não foi possível consultar a conexão.';}setTimeout(poll,2000)}poll();`;
const ticket=()=>{const p=Buffer.from(JSON.stringify({aud:'affinity-whatsapp',owner,exp:Math.floor(Date.now()/1000)+60})).toString('base64url');return p+'.'+createHmac('sha256',secret).update(p).digest('base64url');};
const server=http.createServer(async(req,res)=>{
  const reply=(body,status=200,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'"});res.end(typeof body==='string'?body:JSON.stringify(body));};
  if(req.headers.host!==new URL(origin).host)return reply({error:'Host inválido'},403);
  if(entrance&&req.method==='GET'&&equal(req.url,'/start/'+entrance)){entrance=null;res.writeHead(302,{'set-cookie':`waPair=${cookie}; HttpOnly; SameSite=Strict; Path=/`,'location':'/','cache-control':'no-store','referrer-policy':'no-referrer'});return res.end();}
  const supplied=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('waPair='))?.slice(7)||'';
  if(!equal(supplied,cookie))return reply({error:'Use o link de acesso local.'},401);
  if(req.url==='/'&&req.method==='GET')return reply(page,200,'text/html;charset=utf-8');
  if(req.url==='/pair.js'&&req.method==='GET')return reply(script,200,'text/javascript');
  try{
    if(req.url==='/connect'&&req.method==='POST'){
      if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))return reply({error:'Origem inválida'},403);
      const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>1000)return reply({error:'Limite excedido'},413);parts.push(part);}
      const input=JSON.parse(Buffer.concat(parts).toString());const email=String(input.owner||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return reply({error:'Revise o e-mail'},400);
      if(owner&&owner!==email)return reply({error:'Reinicie a página local para trocar o agente.'},409);
      owner=email;
      const upstream=await fetch('http://127.0.0.1:3088/connect',{method:'POST',headers:{authorization:'Bearer '+ticket()},signal:AbortSignal.timeout(20000)});
      return reply(await upstream.text(),upstream.status);
    }
    if(req.url==='/status'&&req.method==='GET'){
      if(!owner)return reply({state:'disconnected'});
      const upstream=await fetch('http://127.0.0.1:3088/status',{headers:{authorization:'Bearer '+ticket()},signal:AbortSignal.timeout(10000)});
      const data=await upstream.json();delete data.number;return reply(data,upstream.status);
    }
    return reply({error:'Não encontrado'},404);
  }catch{return reply({error:'A conexão não respondeu.'},503);}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({event:'pairing_ready',url:origin+'/start/'+entrance})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
