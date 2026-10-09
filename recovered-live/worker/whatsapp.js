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
    if(action==='contacts'&&method==='GET'){
      const rows=await env.DB.prepare('SELECT id,name,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=? ORDER BY name COLLATE NOCASE').bind(email.toLowerCase()).all();
      return json(rows.results||[]);
    }
    if(action==='contact'&&method==='GET'){
      const id=Number(url.searchParams.get('clientId'));
      if(!Number.isInteger(id)||id<=0)return json({error:'Cliente inválido.'},400);
      const c=await env.DB.prepare('SELECT id,name,phone,whatsapp FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?').bind(id,email.toLowerCase()).first();
      if(!c)return json({error:'Cliente não encontrado.'},404);
      return json({id:c.id,name:c.name,phone:c.phone||c.whatsapp||''});
    }
    if(!(['status','chats','messages','media','group-contacts'].includes(action)&&method==='GET')&&!(['connect','disconnect','send'].includes(action)&&method==='POST'))return json({error:'Ação inválida.'},405);
    if(method==='POST'&&(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Solicitação inválida.'},403);
    if(!env.WHATSAPP_BRIDGE_URL||!env.WHATSAPP_BRIDGE_SECRET)return json({state:'setup_required',error:'A conexão de teste ainda precisa ser ativada pelo administrador.'},503);
    const base=new URL(env.WHATSAPP_BRIDGE_URL);
    if(base.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(base.hostname)&&url.hostname==='127.0.0.1'))return json({error:'Configuração da conexão inválida.'},503);
    let body;
    if(method==='POST'){
      const reader=request.body?.getReader(),parts=[];let size=0;
      if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>11500000){await reader.cancel();return json({error:'Mensagem ou arquivo muito grande.'},413);}parts.push(value);}
      body=await new Blob(parts).text();try{JSON.parse(body||'{}');}catch{return json({error:'Solicitação inválida.'},400);}
    }
    const encoder=new TextEncoder(),payload=encode(encoder.encode(JSON.stringify({aud:'affinity-whatsapp',owner:email.toLowerCase(),exp:Math.floor(Date.now()/1000)+60})));
    const key=await crypto.subtle.importKey('raw',encoder.encode(env.WHATSAPP_BRIDGE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))));
    const target=new URL('/'+action,base);if(action==='group-contacts')target.searchParams.set('group',url.searchParams.get('group')||'');if(action==='messages')target.searchParams.set('chat',url.searchParams.get('chat')||'');if(action==='media')target.searchParams.set('id',url.searchParams.get('id')||'');
    const upstreamHeaders={authorization:'Bearer '+payload+'.'+signature,'content-type':'application/json'};if(action==='media'&&request.headers.get('range'))upstreamHeaders.range=request.headers.get('range');
    const response=await fetch(target,{method,headers:upstreamHeaders,...(method==='POST'?{body:body||'{}'}:{}),redirect:'manual',signal:AbortSignal.timeout(action==='group-contacts'?120000:['send','media'].includes(action)?60000:20000)});
    if(action==='media'&&response.ok){const headers={'content-type':response.headers.get('content-type')||'application/octet-stream','content-disposition':response.headers.get('content-disposition')||'inline','cache-control':'private, max-age=3600','x-content-type-options':'nosniff'};for(const name of ['accept-ranges','content-range','content-length'])if(response.headers.get(name))headers[name]=response.headers.get(name);return new Response(response.body,{status:response.status,headers});}
    if(!response.headers.get('content-type')?.includes('application/json')){console.error('whatsapp_bridge_non_json',JSON.stringify({action,status:response.status,type:response.headers.get('content-type')||'',length:response.headers.get('content-length')||''}));return json({error:'O serviço de WhatsApp não respondeu corretamente.'},502);}
    return new Response(response.body,{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch(error){console.error('whatsapp_proxy_failure',JSON.stringify({name:error?.name||'Error',reason:String(error?.message||'').replace(/https?:\/\/\S+/g,'[url]').replace(/\b\d{8,}\b/g,'[id]').slice(0,200)}));return json({error:'Não foi possível acessar o WhatsApp agora. Tente novamente.'},503);}
}
