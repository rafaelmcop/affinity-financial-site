const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export async function whatsappRoute(request,env,auth){
  const url=new URL(request.url),page=['/agentes/whatsapp','/agent-whatsapp.html'].includes(url.pathname);
  if(!page&&!url.pathname.startsWith('/api/agent/whatsapp/'))return null;
  try{
    const email=await auth.email(request,env);
    if(!email)return page?Response.redirect(new URL('/agentes/login',url),302):json({error:'Entre novamente no portal.'},401);
    const {account}=await auth.access(email,env);
    if(!account||!Number(account.isActive)||account.status!=='approved'||!['agent','both'].includes(account.accountType))return json({error:'Acesso restrito ao agente.'},403);
    if(page)return env.ASSETS.fetch(new Request(new URL('/agent-whatsapp.html',url),request));
    const action=url.pathname.split('/').at(-1),method=request.method;
    if(action==='contact'&&method==='GET'){
      const id=Number(url.searchParams.get('clientId'));
      if(!Number.isInteger(id)||id<=0)return json({error:'Cliente inválido.'},400);
      const c=await env.DB.prepare('SELECT id,name,phone,whatsapp FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(id,email.toLowerCase()).first();
      if(!c)return json({error:'Cliente não encontrado.'},404);
      return json({id:c.id,name:c.name,phone:c.phone||c.whatsapp||''});
    }
    if(!(['status','chats','messages'].includes(action)&&method==='GET')&&!(['connect','disconnect','send'].includes(action)&&method==='POST'))return json({error:'Ação inválida.'},405);
    if(method==='POST'&&(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Solicitação inválida.'},403);
    if(!env.WHATSAPP_BRIDGE_URL||!env.WHATSAPP_BRIDGE_SECRET)return json({state:'setup_required',error:'A conexão de teste ainda precisa ser ativada pelo administrador.'},503);
    const base=new URL(env.WHATSAPP_BRIDGE_URL);
    if(base.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(base.hostname)&&url.hostname==='127.0.0.1'))return json({error:'Configuração da conexão inválida.'},503);
    let body;
    if(method==='POST'){
      const reader=request.body?.getReader(),parts=[];let size=0;
      if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();return json({error:'Mensagem muito grande.'},413);}parts.push(value);}
      body=await new Blob(parts).text();try{JSON.parse(body||'{}');}catch{return json({error:'Solicitação inválida.'},400);}
    }
    const encoder=new TextEncoder(),payload=encode(encoder.encode(JSON.stringify({aud:'affinity-whatsapp',owner:email.toLowerCase(),exp:Math.floor(Date.now()/1000)+60})));
    const key=await crypto.subtle.importKey('raw',encoder.encode(env.WHATSAPP_BRIDGE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))));
    const target=new URL('/'+action,base);if(action==='messages')target.searchParams.set('chat',url.searchParams.get('chat')||'');
    const response=await fetch(target,{method,headers:{authorization:'Bearer '+payload+'.'+signature,'content-type':'application/json'},...(method==='POST'?{body:body||'{}'}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.headers.get('content-type')?.includes('application/json'))return json({error:'O serviço de WhatsApp não respondeu corretamente.'},502);
    return new Response(response.body,{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch{return json({error:'Não foi possível acessar o WhatsApp agora. Tente novamente.'},503);}
}
