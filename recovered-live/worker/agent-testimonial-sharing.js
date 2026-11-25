import {publicTestimonialColumns} from './public-testimonials.js';
import {getVideoSource} from '../public/video-source.js';
import {boundedJson} from './security-boundary.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function agentTestimonialSharing(request,env,auth){
 const url=new URL(request.url),page=url.pathname==='/agentes/depoimentos',base='/api/agent/testimonial-sharing';
 if(!page&&!url.pathname.startsWith(base))return null;
 const email=await auth.email(request,env),access=email?await auth.access(email,env):null;
 if(!email||!access?.account?.isActive||access.account.status!=='approved')return page?Response.redirect(new URL('/agentes/login',url),302):reply({error:'Entre novamente no portal.'},401);
 if(!['agent','both'].includes(access.account.accountType))return reply({error:'Acesso exclusivo do agente.'},403);
 const owner=email.toLowerCase();
 if(page)return ['GET','HEAD'].includes(request.method)?env.ASSETS.fetch(new Request(new URL('/agent-testimonials.html',url),request)):reply({error:'Método inválido.'},405);
 const capabilities={email:await auth.feature(owner,'email'),whatsapp:await auth.feature(owner,'whatsapp')&&await auth.whatsappAllowed(owner)};
 if(request.method==='GET'&&url.pathname===base){
  const rows=(await env.DB.prepare('SELECT '+publicTestimonialColumns+' FROM testimonials WHERE isActive=1 AND mediaType=\'video\' ORDER BY createdAt DESC LIMIT 300').all()).results||[];
  return reply({videos:rows.filter(row=>getVideoSource(row.mediaUrl)).map(row=>({...row,url:'https://www.affinityfc.org/depoimentos/'+Number(row.id)})),capabilities,agentName:access.account.name||''});
 }
 if(request.method==='GET'&&url.pathname===base+'/clients'){
  const search='%'+String(url.searchParams.get('q')||'').trim().slice(0,100)+'%';
  const rows=await env.DB.prepare("SELECT id,name,email,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=? AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR whatsapp LIKE ?) ORDER BY name COLLATE NOCASE LIMIT 50").bind(owner,search,search,search,search).all();
  return reply({clients:rows.results||[]});
 }
 if(request.method!=='POST'||url.pathname!==base+'/send')return reply({error:'Método inválido.'},405);
 if(request.headers.get('origin')!==url.origin||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return reply({error:'Origem inválida.'},403);
 if(await auth.audit?.(request,env))return reply({error:'Envios indisponíveis durante auditoria.'},403);
 let input;try{input=await boundedJson(request,16000)}catch{return reply({error:'Solicitação inválida.'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Solicitação inválida.'},400);
 const channel=input.channel,clientId=Number(input.clientId),videoId=Number(input.videoId),requestId=String(input.requestId||''),message=String(input.message||'').trim(),subject=String(input.subject||'').trim();
 if(!['email','whatsapp'].includes(channel)||!capabilities[channel])return reply({error:'Este canal não está liberado para sua conta.'},403);
 if(input.confirmed!==true||!uuid.test(requestId)||!Number.isSafeInteger(clientId)||clientId<=0||!Number.isSafeInteger(videoId)||videoId<=0||!message||message.length>4000||subject.length>300)return reply({error:'Revise o cliente e a mensagem antes de enviar.'},400);
 const client=await env.DB.prepare('SELECT id,name,email,phone,whatsapp FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(clientId,owner).first();
 if(!client)return reply({error:'Cliente não encontrado na sua carteira.'},404);
 const video=await env.DB.prepare('SELECT id,mediaUrl FROM testimonials WHERE id=? AND isActive=1 AND mediaType=\'video\'').bind(videoId).first();
 if(!video||!getVideoSource(video.mediaUrl))return reply({error:'Este vídeo não está publicado.'},404);
 const link='https://www.affinityfc.org/depoimentos/'+videoId;
 if(!message.includes(link))return reply({error:'Mantenha o link do depoimento na mensagem.'},400);
 if(channel==='email'&&!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(String(client.email||'')))return reply({error:'O cliente não tem um e-mail válido.'},400);
 if(channel==='whatsapp'&&!/^\d{8,15}$/.test(String(client.whatsapp||client.phone||'').replace(/\D/g,'')))return reply({error:'O cliente não tem um telefone válido.'},400);
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS testimonialShareDispatches(owner TEXT NOT NULL,requestId TEXT NOT NULL,fingerprint TEXT NOT NULL,status TEXT NOT NULL,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,requestId))").run();
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([videoId,clientId,channel,message,subject]))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
 const old=await env.DB.prepare('SELECT fingerprint,status FROM testimonialShareDispatches WHERE owner=? AND requestId=?').bind(owner,requestId).first();
 if(old){if(old.fingerprint!==fingerprint)return reply({error:'Este envio já foi iniciado com outro conteúdo. Confira o histórico antes de preparar outro.'},409);if(old.status==='sent')return reply({status:'sent',alreadySent:true});if(old.status!=='not_sent')return reply({error:'O envio anterior está em processamento ou sem confirmação. Confira o histórico antes de tentar novamente.',status:'unconfirmed'},409);}
 const claim=old?await env.DB.prepare("UPDATE testimonialShareDispatches SET status='sending',updatedAt=CURRENT_TIMESTAMP WHERE owner=? AND requestId=? AND status='not_sent'").bind(owner,requestId).run():await env.DB.prepare("INSERT OR IGNORE INTO testimonialShareDispatches(owner,requestId,fingerprint,status) VALUES(?,?,?,'sending')").bind(owner,requestId,fingerprint).run();
 if(!claim.meta?.changes)return reply({error:'Este envio já está em processamento.'},409);
 try{
  await auth.send(channel,{owner,client,videoId,requestId,message,subject:subject||'Uma história de proteção para você',request});
  const statements=[env.DB.prepare("UPDATE testimonialShareDispatches SET status='sent',updatedAt=CURRENT_TIMESTAMP WHERE owner=? AND requestId=?").bind(owner,requestId)];
  if(channel==='whatsapp')statements.push(env.DB.prepare("INSERT INTO crmActivities(clientId,type,content,createdBy) VALUES(?,'whatsapp',?,?)").bind(clientId,'Depoimento enviado pelo portal\n'+message,owner));
  await env.DB.batch(statements);
  return reply({status:'sent',alreadySent:false});
 }catch(error){await env.DB.prepare('UPDATE testimonialShareDispatches SET status=?,updatedAt=CURRENT_TIMESTAMP WHERE owner=? AND requestId=?').bind(error.notSent?'not_sent':'unconfirmed',owner,requestId).run();return reply({status:error.notSent?'not_sent':'unconfirmed',error:error.message||'Envio não confirmado. Confira o histórico.'},400);}
}
