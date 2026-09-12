import http from 'node:http';
import {createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import whatsapp from 'whatsapp-web.js';
import QRCode from 'qrcode';
import {verifyTicket} from './auth.mjs';

const {Client,LocalAuth}=whatsapp;
const secret=process.env.WHATSAPP_BRIDGE_SECRET||'';
if(secret.length<32)throw Error('Configure WHATSAPP_BRIDGE_SECRET com pelo menos 32 caracteres.');
const dataDir=path.resolve(process.env.WHATSAPP_DATA_DIR||'data');
mkdirSync(dataDir,{recursive:true,mode:0o700});
process.umask(0o077);
const db=new DatabaseSync(path.join(dataDir,'history.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS messages(owner TEXT NOT NULL,id TEXT NOT NULL,chat TEXT NOT NULL,body TEXT NOT NULL,direction TEXT NOT NULL,stamp INTEGER NOT NULL,ack INTEGER DEFAULT 0,PRIMARY KEY(owner,id));
CREATE INDEX IF NOT EXISTS message_chat ON messages(owner,chat,stamp);
CREATE TABLE IF NOT EXISTS sends(owner TEXT NOT NULL,requestId TEXT NOT NULL,state TEXT NOT NULL,messageId TEXT,PRIMARY KEY(owner,requestId));`);
const sessions=new Map();
const maxSessions=Number(process.env.WHATSAPP_MAX_SESSIONS||1);
const safeChat=value=>/^\d{8,15}@c\.us$/.test(value)||/^\d{8,20}@lid$/.test(value);
function save(owner,m){
  const chat=m.fromMe?m.to:m.from;
  if(!safeChat(chat)||!m.id?._serialized)return;
  db.prepare('INSERT INTO messages(owner,id,chat,body,direction,stamp,ack) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET ack=excluded.ack').run(owner,m.id._serialized,chat,String(m.body|| (m.hasMedia?'[Anexo recebido no WhatsApp]':'')).slice(0,12000),m.fromMe?'sent':'received',Number(m.timestamp)||Math.floor(Date.now()/1000),Number(m.ack)||0);
}
async function connect(owner){
  if(sessions.has(owner))return sessions.get(owner);
  if(sessions.size>=maxSessions)throw Error('O limite de sessões de teste foi atingido.');
  const key=createHash('sha256').update(owner).digest('hex');
  const client=new Client({authStrategy:new LocalAuth({clientId:key,dataPath:path.join(dataDir,'sessions')}),puppeteer:{headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})},qrMaxRetries:5,authTimeoutMs:60000,webVersionCache:{type:'local',path:path.join(dataDir,'cache')}});
  const s={client,state:'connecting',qr:null,qrAt:0,number:null,busy:false,lastSend:0};sessions.set(owner,s);
  client.on('qr',qr=>{s.state='qr';s.qr=qr;s.qrAt=Date.now();});
  client.on('authenticated',()=>{s.state='authenticating';s.qr=null;});
  client.on('ready',()=>{s.state='ready';s.qr=null;s.number=client.info?.wid?.user||null;});
  client.on('message_create',m=>{try{save(owner,m);}catch{console.error('whatsapp_history_write_failed');s.state='history_error';}});
  client.on('message_ack',(m,ack)=>{try{db.prepare('UPDATE messages SET ack=? WHERE owner=? AND id=?').run(Number(ack),owner,m.id._serialized);}catch{console.error('whatsapp_ack_write_failed');}});
  client.on('auth_failure',()=>{s.state='auth_failure';s.qr=null;});
  client.on('disconnected',()=>{s.state='disconnected';s.qr=null;});
  s.initialization=client.initialize().catch(()=>{s.state='error';s.qr=null;});
  return s;
}
async function body(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>20000)throw Error('Mensagem muito grande.');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
const server=http.createServer(async(req,res)=>{
  const reply=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.url==='/health'&&req.method==='GET')return reply({ok:true});
  let owner;try{owner=verifyTicket(req.headers.authorization?.replace(/^Bearer /,''),secret);}catch{return reply({error:'Unauthorized'},401);}
  const url=new URL(req.url,'http://localhost'),action=url.pathname;
  try{
    if(action==='/connect'&&req.method==='POST'){await connect(owner);return reply({ok:true});}
    const s=sessions.get(owner);
    if(action==='/status'&&req.method==='GET')return reply({state:s?.state||'disconnected',number:s?.number||null,qr:s?.qr&&Date.now()-s.qrAt<45000?await QRCode.toDataURL(s.qr,{width:280,margin:2}):null});
    if(action==='/disconnect'&&req.method==='POST'){
      if(s){s.state='disconnecting';await s.client.logout();await s.client.destroy().catch(()=>{});sessions.delete(owner);}return reply({ok:true});
    }
    if(action==='/chats'&&req.method==='GET')return reply(db.prepare('SELECT chat,MAX(stamp) AS stamp,COUNT(*) AS count FROM messages WHERE owner=? GROUP BY chat ORDER BY stamp DESC LIMIT 100').all(owner));
    if(action==='/messages'&&req.method==='GET'){
      const chat=url.searchParams.get('chat')||'';if(!safeChat(chat))return reply({error:'Selecione uma conversa.'},400);
      return reply(db.prepare('SELECT id,body,direction,stamp,ack FROM messages WHERE owner=? AND chat=? ORDER BY stamp DESC LIMIT 100').all(owner,chat).reverse());
    }
    if(action==='/send'&&req.method==='POST'){
      if(s?.state!=='ready')return reply({error:'Conecte o WhatsApp primeiro.'},409);
      const input=await body(req),chat=String(input.chat||''),text=String(input.text||'').trim(),requestId=String(input.requestId||'');
      if(!safeChat(chat)||!text||text.length>4000||!/^[-a-f0-9]{36}$/.test(requestId))return reply({error:'Revise o telefone e a mensagem.'},400);
      const old=db.prepare('SELECT state,messageId FROM sends WHERE owner=? AND requestId=?').get(owner,requestId);
      if(old)return reply(old,old.state==='sent'?200:409);
      if(s.busy||Date.now()-s.lastSend<3000)return reply({error:'Aguarde o envio atual.'},429);
      s.busy=true;
      db.prepare("INSERT INTO sends(owner,requestId,state) VALUES(?,?,'pending')").run(owner,requestId);
      try{
        const m=await s.client.sendMessage(chat,text);save(owner,m);
        db.prepare("UPDATE sends SET state='sent',messageId=? WHERE owner=? AND requestId=?").run(m.id._serialized,owner,requestId);s.lastSend=Date.now();
        return reply({state:'sent',messageId:m.id._serialized});
      }catch{db.prepare("UPDATE sends SET state='uncertain' WHERE owner=? AND requestId=?").run(owner,requestId);return reply({error:'Não foi possível confirmar o envio. Confira no celular antes de tentar novamente.',state:'uncertain'},502);}finally{s.busy=false;}
    }
    return reply({error:'Não encontrado'},404);
  }catch{return reply({error:'A conexão não respondeu. Confira o status e tente novamente.'},503);}
});
server.requestTimeout=20000;
server.listen(Number(process.env.PORT||3088),process.env.HOST||'127.0.0.1',()=>console.log(JSON.stringify({event:'whatsapp_bridge_started',port:server.address().port})));
async function stop(){server.close();await Promise.allSettled([...sessions.values()].map(s=>s.client.destroy()));db.close();process.exit(0);}
process.on('SIGTERM',()=>{void stop();});process.on('SIGINT',()=>{void stop();});
