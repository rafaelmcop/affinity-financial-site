import {emailDefinitelyNotSent} from './smtp-runtime.js';
import {meetingSendTransport} from './meeting-send-transport.js';
export async function sendMeetingMessage(env,owner,meeting,input,attachments,sendEmail){
 if(input.confirmed!==true)throw Object.assign(Error('Confirme o envio antes de continuar.'),{status:400});
 const requestId=String(input.requestId||'');if(!/^[a-f0-9-]{36}$/.test(requestId))throw Object.assign(Error('Identificador de envio inválido.'),{status:400});
 const channel=input.channel==='whatsapp'?'whatsapp':'email';
 if(channel==='whatsapp'&&(String(input.message||'').length>4000||attachments.some(f=>f.content.length>11200000)))throw Object.assign(Error('Use uma mensagem de até 4.000 caracteres e arquivos de até 7 MB para WhatsApp.'),{status:400});
 if(channel==='whatsapp'&&(!env.WHATSAPP_BRIDGE_URL||String(env.WHATSAPP_BRIDGE_SECRET||'').length<32))throw Object.assign(Error('A conexão de WhatsApp não está configurada.'),{status:503});
 let chat;if(channel==='whatsapp'){let phone=String(meeting.inviteePhone||'').replace(/\D/g,'');if(phone.length===10)phone='1'+phone;if(!/^\d{8,15}$/.test(phone))throw Object.assign(Error('Telefone inválido neste compromisso.'),{status:400});chat=phone+'@c.us';}
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS meetingMessageDispatches(owner TEXT,meetingId INTEGER,channel TEXT,requestId TEXT,status TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,requestId))').run();
 const old=await env.DB.prepare('SELECT status,meetingId,channel FROM meetingMessageDispatches WHERE owner=? AND requestId=?').bind(owner,requestId).first();
 if(old){if(old.meetingId!==Number(meeting.id)||old.channel!==channel)throw Error('Identificador já usado em outro envio.');if(old.status==='sent')return {alreadySent:true};if(old.status!=='not_sent')throw Object.assign(Error(old.status==='sending'?'Envio em processamento. Aguarde antes de tentar novamente.':channel==='email'?'Não foi possível confirmar o envio deste e-mail. Confira o histórico de e-mails antes de preparar uma nova tentativa.':'Este envio de WhatsApp não foi confirmado. Confira no aplicativo antes de tentar novamente.'),{status:409});}
 const reserved=old?.status==='not_sent'?await env.DB.prepare("UPDATE meetingMessageDispatches SET status='sending' WHERE owner=? AND requestId=? AND status='not_sent'").bind(owner,requestId).run():await env.DB.prepare("INSERT OR IGNORE INTO meetingMessageDispatches(owner,meetingId,channel,requestId,status) VALUES(?,?,?,?,'sending')").bind(owner,Number(meeting.id),channel,requestId).run();if(!reserved.meta?.changes)throw Object.assign(Error('Envio em processamento.'),{status:409});
 try{
  if(channel==='email')await sendEmail(attachments);
  else{
   const encoded=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');const encoder=new TextEncoder();
   const authorization=async()=>{const payload=encoded(encoder.encode(JSON.stringify({aud:'affinity-whatsapp',owner,exp:Math.floor(Date.now()/1000)+60})));const key=await crypto.subtle.importKey('raw',encoder.encode(env.WHATSAPP_BRIDGE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const ticket=payload+'.'+encoded(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))));return 'Bearer '+ticket;};
   for(let i=0;i<Math.max(1,attachments.length);i++){
    if(i)await new Promise(r=>setTimeout(r,3100));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(requestId+':'+i)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);const id=hash.slice(0,8)+'-'+hash.slice(8,12)+'-'+hash.slice(12,16)+'-'+hash.slice(16,20)+'-'+hash.slice(20);
    const file=attachments[i],mime=file&&file.contentType;
    const body={manual:true,chat,text:i===0?input.message:'',requestId:id,...file?{media:{kind:mime.startsWith('image/')?'image':'file',mime,filename:file.filename,data:file.content}}:{}};
    await meetingSendTransport(new URL('/send',env.WHATSAPP_BRIDGE_URL),{method:'POST',headers:{'content-type':'application/json',prefer:'respond-async'},authorization,body:JSON.stringify(body)});
   }
  }
  await env.DB.prepare("UPDATE meetingMessageDispatches SET status='sent' WHERE owner=? AND requestId=?").bind(owner,requestId).run();return {alreadySent:false};
 }catch(error){const notSent=channel==='email'?emailDefinitelyNotSent(error):error.notSent&&!attachments.length;
 await env.DB.prepare("UPDATE meetingMessageDispatches SET status=? WHERE owner=? AND requestId=?").bind(notSent?'not_sent':'uncertain',owner,requestId).run();
 if(channel==='email'&&notSent)throw Object.assign(Error('O e-mail não foi enviado: falha na conexão ou autenticação do servidor de e-mail. Tente novamente; se persistir, confira a configuração de e-mail.'),{status:400,notSent:true});throw error;}
}
