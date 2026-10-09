import {auditMessages} from './audit.mjs';
import {sendAllowed} from './send-permission.mjs';
import {pruneMedia,mediaExpired} from './media-retention.mjs';
import {chatDirectory,groupContacts,groupId,allContacts} from './directory.mjs';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {mkdirSync,existsSync,renameSync,writeFileSync,statSync,createReadStream} from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import whatsapp from 'whatsapp-web.js';
import QRCode from 'qrcode';
import {verifyTicket} from './auth.mjs';
import {sendText,sendMedia,sendErrorCode} from './send.mjs';
import {normalizeMessage,serializedKey} from './message.mjs';
import {mediaUpsert} from './media-record.mjs';
import {installKeyCompatibility} from './compat.mjs';
import {closeClient} from './close-client.mjs';
import {downloadMedia} from './download.mjs';
import {initializeContacts,rememberContact,contactIds,listContacts} from './contacts.mjs';

const {Client,LocalAuth}=whatsapp;
const bridgeVersion='2026-09-28.1';
const secret=process.env.WHATSAPP_BRIDGE_SECRET||'';
if(secret.length<32)throw Error('Configure WHATSAPP_BRIDGE_SECRET com pelo menos 32 caracteres.');
const dataDir=path.resolve(process.env.WHATSAPP_DATA_DIR||'data');
mkdirSync(dataDir,{recursive:true,mode:0o700});
process.umask(0o077);
const db=new DatabaseSync(path.join(dataDir,'history.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS messages(owner TEXT NOT NULL,id TEXT NOT NULL,chat TEXT NOT NULL,body TEXT NOT NULL,direction TEXT NOT NULL,stamp INTEGER NOT NULL,ack INTEGER DEFAULT 0,mediaKey TEXT,mime TEXT,filename TEXT,mediaKind TEXT,mediaSize INTEGER,mediaState TEXT,PRIMARY KEY(owner,id));
CREATE INDEX IF NOT EXISTS message_chat ON messages(owner,chat,stamp);
CREATE TABLE IF NOT EXISTS session_owners(owner TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sends(owner TEXT NOT NULL,requestId TEXT NOT NULL,state TEXT NOT NULL,messageId TEXT,PRIMARY KEY(owner,requestId));`);
const sessions=new Map();
for(const [column,type] of [['mediaKey','TEXT'],['mime','TEXT'],['filename','TEXT'],['mediaKind','TEXT'],['mediaSize','INTEGER'],['mediaState','TEXT']])try{db.exec(`ALTER TABLE messages ADD COLUMN ${column} ${type}`);}catch{}
const mediaDir=path.join(dataDir,'media');mkdirSync(mediaDir,{recursive:true,mode:0o700});
initializeContacts(db);
const cleanupMedia=()=>{try{const result=pruneMedia(db,mediaDir);if(result.removed)console.log(JSON.stringify({event:'whatsapp_media_retention',...result}));}catch{console.error('whatsapp_media_retention_failed');}};
cleanupMedia();const mediaCleanup=setInterval(cleanupMedia,60000);mediaCleanup.unref();
const maxSessions=Number(process.env.WHATSAPP_MAX_SESSIONS||1);
const maxMediaBytes=Math.min(128000000,Math.max(8000000,Number(process.env.WHATSAPP_MAX_MEDIA_BYTES)||64000000));
const safeChat=value=>groupId(value)||/^\d{8,15}@c\.us$/.test(value)||/^\d{8,20}@lid$/.test(value);
const mediaKind=mime=>mime?.startsWith('image/')?'image':mime?.startsWith('audio/')?'audio':mime?.startsWith('video/')?'video':mime==='application/pdf'?'document':['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'].includes(mime)?'spreadsheet':'file';
const mediaFilename=(filename,mime)=>filename||'arquivo'+({'audio/ogg':'.ogg','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/wav':'.wav','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','video/mp4':'.mp4','video/webm':'.webm','application/pdf':'.pdf'}[String(mime||'').split(';')[0]]||'');
const mediaKey=(owner,id)=>createHash('sha256').update(owner+'\0'+id).digest('hex');
async function save(owner,m,providedMedia=null){
  normalizeMessage(m);
  const chat=m.fromMe?m.to:m.from;
  if(!safeChat(chat)||!m.id?._serialized){console.error(JSON.stringify({event:'whatsapp_message_shape',keys:Object.keys(m||{}),idKeys:Object.keys(m?.id||{}),rawKeys:Object.keys(m?._data||{}),hasChat:safeChat(chat),hasId:!!m?.id?._serialized}));return;}
  let key=null,mime=String(providedMedia?.mimetype||m?._data?.mimetype||m?.mimetype||'').slice(0,100)||null,filename=String(providedMedia?.filename||m?._data?.filename||m?.filename||'').slice(0,240)||null,kind=m.hasMedia||providedMedia||mime?mediaKind(mime):null,size=Number(m?._data?.size)||null,state=m.hasMedia||providedMedia?'unavailable':null;
  const previous=db.prepare('SELECT mediaKey,mime,filename,mediaKind,mediaSize,mediaState FROM messages WHERE owner=? AND id=?').get(owner,m.id._serialized);
  if((m.hasMedia||providedMedia||previous?.mediaState)&&mediaExpired(m.timestamp)){state='expired';key=null;mime=previous?.mime||mime;filename=previous?.filename||filename;kind=previous?.mediaKind||kind;}
  else if(previous?.mediaKey){({mediaKey:key,mime,filename,mediaKind:kind,mediaSize:size,mediaState:state}=previous);state=state||'ready';}
  else if(m.hasMedia||providedMedia){
    try{
      const media=providedMedia||await downloadMedia(m);
      mime=String(media?.mimetype||mime||'application/octet-stream').slice(0,100);filename=String(media?.filename||filename||'').slice(0,240)||null;kind=mediaKind(mime);
      if(media?.data&&media.data.length<=Math.ceil(maxMediaBytes*4/3)+4){
        const bytes=Buffer.from(media.data,'base64');
        size=bytes.length;if(bytes.length<=maxMediaBytes){key=mediaKey(owner,m.id._serialized);writeFileSync(path.join(mediaDir,key),bytes,{mode:0o600});state='ready';}else state='too_large';
      }else if(media?.data){size=Math.floor(media.data.length*3/4);state='too_large';}
    }catch(error){state='download_failed';console.error(JSON.stringify({event:'whatsapp_media_download_failed',name:error?.name,reason:String(error?.message||'').replace(/https?:\/\/\S+/g,'[url]').replace(/\b\d{8,}\b/g,'[id]').slice(0,400)}));}
  }
  const label=kind==='image'?'Imagem':kind==='audio'?'Áudio':kind==='video'?'Vídeo':filename?'Arquivo: '+filename:'Anexo',fallback=m.hasMedia?'['+label+(state==='too_large'?' maior que o limite de armazenamento':state==='download_failed'?' não pôde ser baixado':state!=='ready'?' não disponível':'')+']':'';
  db.prepare(mediaUpsert).run(owner,m.id._serialized,chat,String(m.body||fallback).slice(0,12000),m.fromMe?'sent':'received',Number(m.timestamp)||Math.floor(Date.now()/1000),Number(m.ack)||0,key,mime,filename,kind,size,state);
}
const affiliateOwner=owner=>/^affiliate-\d+@affinity-whatsapp\.invalid$/.test(owner);
async function connect(owner){
  if(['error','disconnected','auth_failure'].includes(sessions.get(owner)?.state)){
    const old=sessions.get(owner);
    if(!old.closing)old.closing=closeClient(old.client).then(()=>{if(sessions.get(owner)===old)sessions.delete(owner);}).finally(()=>{old.closing=null;});
    await old.closing;
  }
  if(sessions.has(owner))return sessions.get(owner);
  if(sessions.size>=maxSessions)throw Error('O limite de sessões de teste foi atingido.');
  const key=createHash('sha256').update(owner).digest('hex');
  const client=new Client({authStrategy:new LocalAuth({clientId:key,dataPath:path.join(dataDir,'sessions')}),puppeteer:{headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})},qrMaxRetries:5,authTimeoutMs:60000,webVersionCache:{type:'local',path:path.join(dataDir,'cache')}});
  const s={client,lastSeen:Date.now(),state:'connecting',qr:null,qrAt:0,number:null,busy:false,lastSend:0,refreshes:new Map()};sessions.set(owner,s);
  db.prepare('INSERT OR IGNORE INTO session_owners(owner) VALUES(?)').run(owner);
  client.on('qr',qr=>{s.state='qr';s.qr=qr;s.qrAt=Date.now();});
  client.on('authenticated',()=>{s.state='authenticating';s.qr=null;});
  client.on('ready',()=>{void (async()=>{try{
    const compatibility=await client.pupPage.evaluate(installKeyCompatibility);
    if(!compatibility.wid||!compatibility.message)throw Error('Key compatibility unavailable');
    s.state='ready';s.qr=null;s.number=client.info?.wid?.user||null;
  }catch{s.state='error';console.error('whatsapp_key_compatibility_failed');}})();});
  if(!affiliateOwner(owner))client.on('message_create',m=>{void save(owner,m).catch(()=>{console.error('whatsapp_history_write_failed');s.state='history_error';});});
  if(!affiliateOwner(owner))client.on('message',m=>{void save(owner,m).catch(()=>{console.error('whatsapp_history_write_failed');s.state='history_error';});});
  client.on('message_ack',(m,ack)=>{try{normalizeMessage(m);if(!m?.id?._serialized)return;db.prepare('UPDATE messages SET ack=MAX(ack,?) WHERE owner=? AND id=?').run(Number(ack),owner,m.id._serialized);}catch{console.error('whatsapp_ack_write_failed');}});
  client.on('auth_failure',()=>{s.state='auth_failure';s.qr=null;});
  client.on('disconnected',()=>{s.state='disconnected';s.qr=null;});
  s.initialization=client.initialize().catch(error=>{s.state='error';s.qr=null;console.error(JSON.stringify({event:'whatsapp_initialization_failed',name:error?.name,reason:String(error?.message||'').replace(/https?:\/\/\S+/g,'[url]').replace(/\b\d{8,}\b/g,'[id]').slice(0,400)}));});
  return s;
}
async function body(req,max=20000){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>max)throw Error('Mensagem muito grande.');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
const server=http.createServer(async(req,res)=>{
  const reply=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.url==='/health'&&req.method==='GET')return reply({ok:true,version:bridgeVersion});
  let owner;try{owner=verifyTicket(req.headers.authorization?.replace(/^Bearer /,''),secret);}catch{return reply({error:'Unauthorized'},401);}
  const url=new URL(req.url,'http://localhost'),action=url.pathname;
  try{
    if(affiliateOwner(owner)&&!['/connect','/status','/all-contacts','/disconnect'].includes(action))return reply({error:'Ação indisponível para importação de afiliado.'},403);
    if(action==='/audit'&&req.method==='GET')return reply(auditMessages(db,owner,url.searchParams.get('cursor'),url.searchParams.get('phone')));
    if(action==='/connect'&&req.method==='POST'){await connect(owner);return reply({ok:true});}
    const s=sessions.get(owner);if(s)s.lastSeen=Date.now();
    if(action==='/status'&&req.method==='GET')return reply({state:s?.state||'disconnected',number:s?.number||null,qr:s?.qr&&Date.now()-s.qrAt<45000?await QRCode.toDataURL(s.qr,{width:280,margin:2}):null});
    if(action==='/disconnect'&&req.method==='POST'){
      if(!s)return reply({ok:true});
      if(s.state==='disconnecting')return reply({error:'Aguarde a desconexão atual.'},409);
      s.state='disconnecting';s.qr=null;
      let revoked=false;
      try{
        try{await s.client.logout();revoked=true;}catch{console.error('whatsapp_logout_failed');}
        // Logout can fail before destroying Chrome. Always close it before
        // replacing the local credentials; keep message history untouched.
        await closeClient(s.client);
        const directory=s.client.authStrategy.userDataDir;
        if(directory&&existsSync(directory))renameSync(directory,directory+'.disconnected-'+Date.now());
        sessions.delete(owner);
        db.prepare('DELETE FROM session_owners WHERE owner=?').run(owner);
        return reply({ok:true,warning:revoked?null:'Conexão local removida. Confira Aparelhos conectados no celular e remova a sessão antiga, se ela ainda aparecer.'});
      }catch{s.state='error';return reply({error:'Não foi possível encerrar a sessão. Tente desconectar novamente.'},503);}
    }
    if(action==='/all-contacts'&&req.method==='GET'){
      if(s?.state!=='ready')return reply({error:'Conecte o WhatsApp primeiro.'},409);
      if(!s.allContactsJob){const job={result:null,error:false,progress:{}};s.allContactsJob=job;void allContacts(s.client,p=>job.progress=p).then(result=>job.result=result).catch(()=>job.error=true);}
      const job=s.allContactsJob;if(job.error)return reply({error:'Não foi possível preparar os contatos.'},503);
      return job.result?reply(job.result):reply({pending:true,...job.progress},202);
    }
    if(action==='/chats'&&req.method==='GET'){
      if(s?.state!=='ready')return reply(listContacts(db,owner));
      if(!s.directory||Date.now()-s.directory.at>30000){
        if(!s.directoryPromise)s.directoryPromise=chatDirectory(s.client).then(rows=>{s.directory={rows,at:Date.now()};return rows;}).finally(()=>s.directoryPromise=null);
        await s.directoryPromise;
      }
      return reply(s.directory.rows);
    }
    if(action==='/group-contacts'&&req.method==='GET'){
      if(s?.state!=='ready')return reply({error:'Conecte o WhatsApp primeiro.'},409);
      const id=url.searchParams.get('group')||'';if(!groupId(id))return reply({error:'Grupo inválido.'},400);
      const jobs=s.groupExports||(s.groupExports=new Map());let job=jobs.get(id);
      if(!job||Date.now()-job.at>300000){
        job={at:Date.now(),result:null,error:false};jobs.set(id,job);
        void groupContacts(s.client,id).then(result=>job.result=result).catch(()=>job.error=true);
      }
      if(job.error)return reply({error:'Não foi possível ler os participantes. Tente novamente em alguns minutos.'},503);
      return job.result?reply(job.result):reply({pending:true},202);
    }
    if(action==='/media'&&req.method==='GET'){
      const id=url.searchParams.get('id')||'',row=db.prepare('SELECT mediaKey,mime,filename FROM messages WHERE owner=? AND id=?').get(owner,id);
      if(!row?.mediaKey||!existsSync(path.join(mediaDir,row.mediaKey)))return reply({error:'Mídia não encontrada.'},404);
      const file=path.join(mediaDir,row.mediaKey),length=statSync(file).size,inline=/^(?:image\/(?:jpeg|png|webp|gif|avif)|audio\/[^;]+|video\/[^;]+)(?:;.*)?$/.test(String(row.mime||''))||row.mime==='application/pdf',base={'content-type':row.mime||'application/octet-stream','cache-control':'private, max-age=3600','x-content-type-options':'nosniff','accept-ranges':'bytes','content-disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(mediaFilename(row.filename,row.mime))}`};
      if(!length){res.writeHead(req.headers.range?416:200,{...base,'content-length':'0',...(req.headers.range?{'content-range':'bytes */0'}:{})});return res.end();}
      let start=0,end=length-1;
      if(req.headers.range){const range=req.headers.range.match(/^bytes=(\d*)-(\d*)$/);if(!range||(!range[1]&&!range[2])){res.writeHead(416,{...base,'content-range':`bytes */${length}`});return res.end();}start=range[1]?Number(range[1]):Math.max(0,length-Number(range[2]));end=range[1]&&range[2]?Math.min(Number(range[2]),length-1):length-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=length||(!range[1]&&Number(range[2])===0)){res.writeHead(416,{...base,'content-range':`bytes */${length}`});return res.end();}}
      res.writeHead(req.headers.range?206:200,{...base,...(req.headers.range?{'content-range':`bytes ${start}-${end}/${length}`} : {}),'content-length':String(end-start+1)});
      const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
    }
    if(action==='/messages'&&req.method==='GET'){
      const chat=url.searchParams.get('chat')||'';if(!safeChat(chat))return reply({error:'Selecione uma conversa.'},400);
      // Reconcile the selected conversation, including messages received while
      // the test was disconnected. A single in-flight read per chat prevents overlap.
      if(s?.state==='ready'){
        const previous=s.refreshes.get(chat);
        if(!previous||(!previous.promise&&Date.now()-previous.at>15000)){
          const refresh={at:Date.now(),promise:null};s.refreshes.set(chat,refresh);
          refresh.promise=(async()=>{try{
            try{for(const pair of await s.client.getContactLidAndPhone([chat]))rememberContact(db,owner,pair);}catch{/* Identity lookup must not block history. */}
            const conversation=await s.client.getChatById(chat);
            conversation.id={...conversation.id,_serialized:serializedKey(conversation.id)||chat};
            const items=await conversation.fetchMessages({limit:30});
            for(const item of items)await save(owner,item);
            console.log(JSON.stringify({event:'whatsapp_history_reconciled',count:items.length}));
          }catch(error){
            const reason=String(error?.message||'');
            if(/detached Frame|Target closed|Session closed|browser has disconnected/i.test(reason)){s.state='error';s.qr=null;}
            console.error(JSON.stringify({event:'whatsapp_history_read_failed',reason:reason.replace(/https?:\/\/\S+/g,'[url]').replace(/\b\d{8,}\b/g,'[id]').slice(0,300)}));
          }finally{refresh.at=Date.now();refresh.promise=null;}})();
        }
      }
      const ids=contactIds(db,owner,chat);
      return reply(db.prepare('SELECT id,body,direction,stamp,ack,mediaKey,mediaKind,mime,filename,mediaSize,mediaState FROM messages WHERE owner=? AND chat IN ('+ids.map(()=>'?').join(',')+') ORDER BY stamp DESC LIMIT 100').all(owner,...ids).reverse().map(({mediaKey,...item})=>({...item,mediaKind:mediaKey||item.mediaState?item.mediaKind:null,mediaUrl:mediaKey?'/api/agent/whatsapp/media?id='+encodeURIComponent(item.id):null})));
    }
    if(action==='/send'&&req.method==='POST'){
      const input=await body(req,11500000);
      if(!sendAllowed(process.env,input))return reply({error:'Envios bloqueados até confirmação do responsável.',code:'sending_disabled'},403);
      if(s?.state!=='ready')return reply({error:'Conecte o WhatsApp primeiro.'},409);
      const chat=String(input.chat||''),text=String(input.text||'').trim(),requestId=String(input.requestId||''),media=input.media;
      const validDocument=media?.kind==='file'&&((media.mime==='application/pdf'&&/\.pdf$/i.test(String(media.filename||'')))||(media.mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'&&/\.xlsx$/i.test(String(media.filename||'')))||(media.mime==='application/vnd.ms-excel'&&/\.xls$/i.test(String(media.filename||''))));
      const validMedia=media&&['image','audio','video','file'].includes(media.kind)&&typeof media.data==='string'&&media.data.length<=11200000&&((media.kind==='image'&&/^image\/(jpeg|png|webp|gif)$/.test(media.mime))||(media.kind==='audio'&&/^audio\/(ogg|webm|mpeg|mp4|wav)(;.*)?$/.test(media.mime))||(media.kind==='video'&&/^video\/(mp4|webm)$/.test(media.mime))||validDocument);
      if(!safeChat(chat)||(!text&&!validMedia)||text.length>4000||!/^[-a-f0-9]{36}$/.test(requestId))return reply({error:'Revise o telefone, a mensagem e o arquivo.'},400);
      const old=db.prepare('SELECT state,messageId FROM sends WHERE owner=? AND requestId=?').get(owner,requestId);
      if(old)return reply({...old,...(old.state==='sent'?{}:{error:'Este envio ainda não foi confirmado. Confira no celular antes de tentar novamente.'})},old.state==='sent'?200:409);
      if(s.busy||Date.now()-s.lastSend<3000)return reply({error:'Aguarde o envio atual.'},429);
      s.busy=true;
      db.prepare("INSERT INTO sends(owner,requestId,state) VALUES(?,?,'pending')").run(owner,requestId);
      try{
        const m=validMedia?await sendMedia(s.client,chat,{data:media.data,mime:media.mime,filename:String(media.filename||'').slice(0,240),caption:text,voice:media.kind==='audio'&&/^audio\/ogg(?:;|$)/i.test(media.mime)}):await sendText(s.client,chat,text);await save(owner,m,validMedia?{data:media.data,mimetype:media.mime,filename:String(media.filename||'').slice(0,240)}:null);
        db.prepare("UPDATE sends SET state='sent',messageId=? WHERE owner=? AND requestId=?").run(m.id._serialized,owner,requestId);s.lastSend=Date.now();
        return reply({state:'sent',messageId:m.id._serialized});
      }catch(error){const code=sendErrorCode(error);console.error(JSON.stringify({event:'whatsapp_send_failed',code}));db.prepare("UPDATE sends SET state='uncertain' WHERE owner=? AND requestId=?").run(owner,requestId);return reply({error:code==='number_not_registered'?'Este telefone não foi encontrado no WhatsApp. Confira o país e o número.':'Não foi possível confirmar o envio ('+code+'). Confira no celular antes de tentar novamente.',state:'uncertain',code},502);}finally{s.busy=false;}
    }
    return reply({error:'Não encontrado'},404);
  }catch{return reply({error:'A conexão não respondeu. Confira o status e tente novamente.'},503);}
});
server.requestTimeout=65000;
server.listen(Number(process.env.PORT||3088),process.env.HOST||'127.0.0.1',()=>{
  console.log(JSON.stringify({event:'whatsapp_bridge_started',port:server.address().port}));
  for(const {owner} of db.prepare('SELECT owner FROM session_owners').all().filter(row=>!affiliateOwner(row.owner)).slice(0,maxSessions))void connect(owner).catch(()=>console.error('whatsapp_session_restore_failed'));
});
const affiliateCleanup=setInterval(()=>{for(const [owner,s] of sessions){if(!affiliateOwner(owner)||s.state==='disconnecting'||Date.now()-(s.lastSeen||0)<900000)continue;s.state='disconnecting';void (async()=>{try{await s.client.logout();}catch{}await closeClient(s.client);sessions.delete(owner);db.prepare('DELETE FROM session_owners WHERE owner=?').run(owner);})().catch(()=>console.error('affiliate_session_cleanup_failed'));}},60000);affiliateCleanup.unref();
async function stop(){server.close();await Promise.allSettled([...sessions.values()].map(s=>closeClient(s.client)));db.close();process.exit(0);}
process.on('SIGTERM',()=>{void stop();});process.on('SIGINT',()=>{void stop();});
