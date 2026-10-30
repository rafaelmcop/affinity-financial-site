const SLOTS = {logo: null, hero: '/family-hero.jpg', about: '/consulting.jpg'};
const SCHEMA = `CREATE TABLE IF NOT EXISTS siteBrandImages(slot TEXT PRIMARY KEY, data TEXT NOT NULL, mime TEXT NOT NULL, revision TEXT NOT NULL, updatedBy TEXT NOT NULL, updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`;
const BRAND_OPTIONS_SCHEMA = `CREATE TABLE IF NOT EXISTS siteBrandOptions(slot TEXT PRIMARY KEY, scale INTEGER NOT NULL DEFAULT 100, active INTEGER NOT NULL DEFAULT 1)`;
const json = (body, status=200) => Response.json(body,{status,headers:{'cache-control':'no-store'}});
async function read(db, sql, ...values) {
  try { return await db.prepare(sql).bind(...values).all(); }
  catch(error) { if(/no such table: siteBrand(?:Images|Options)/.test(String(error)))return {results:[]};throw error; }
}
export async function siteBrandingRoute(request, env, auth) {
  const url = new URL(request.url), path=url.pathname;
  const isPublic=path==='/api/site-branding' && request.method==='GET';
  const imageSlot=Object.keys(SLOTS).find(s=>SLOTS[s]===path)||(/^\/site-brand\/image\/(logo|hero|about)$/.exec(path)?.[1]);
  const isAdmin=path==='/api/admin/site-branding';
  if(!isPublic&&!imageSlot&&!isAdmin&&path!=='/admin/site-branding')return null;
  try {
    if(isPublic){
      const rows=await read(env.DB,'SELECT slot,revision FROM siteBrandImages');
      const options=(await read(env.DB,'SELECT slot,scale,active FROM siteBrandOptions')).results;
      const images={logo:null,hero:SLOTS.hero,about:SLOTS.about};
      for(const row of rows.results)if(Object.hasOwn(images,row.slot)&&!options.some(o=>o.slot===row.slot&&o.active===0))images[row.slot]='/site-brand/image/'+row.slot+'?v='+encodeURIComponent(row.revision);
      return Response.json({images,logoScale:options.find(o=>o.slot==='logo')?.scale||100},{headers:{'cache-control':'public,max-age=60'}});
    }
    if(imageSlot){
      if(!['GET','HEAD'].includes(request.method))return json({error:'Método não permitido.'},405);
      const row=(await read(env.DB,'SELECT data,mime,revision FROM siteBrandImages WHERE slot=?',imageSlot)).results[0];
      const option=(await read(env.DB,'SELECT slot,scale,active FROM siteBrandOptions WHERE slot=?',imageSlot)).results[0];
      if(!row||option?.active===0)return SLOTS[imageSlot]?env.ASSETS.fetch(new Request(new URL(SLOTS[imageSlot],url),request)):new Response(null,{status:404});
      const headers={'content-type':row.mime,'cache-control':'public,max-age=60','x-content-type-options':'nosniff',etag:'"'+row.revision+'"'};
      if(request.headers.get('if-none-match')===headers.etag)return new Response(null,{status:304,headers});
      return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(row.data),c=>c.charCodeAt(0)),{headers});
    }
    const email=await auth.email(request,env);
    if(!email)return path==='/admin/site-branding'?Response.redirect(new URL('/admin/login',url),302):json({error:'Entre no painel administrativo.'},401);
    const access=await auth.access(email,env), account=access.account;
    if(!access.isMaster||(account&&(!account.isActive||account.status!=='approved'||!['admin','both'].includes(account.accountType))))return json({error:'Somente o administrador principal pode alterar a identidade visual.'},403);
    if(path==='/admin/site-branding')return env.ASSETS.fetch(new Request(new URL('/admin-site-branding.html',url),request));
    if(request.method!=='POST')return json({error:'Método não permitido.'},405);
    if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Origem inválida.'},403);
    const reader=request.body?.getReader();if(!reader)return json({error:'Selecione uma imagem.'},400);
    let size=0;const parts=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1200000){await reader.cancel();return json({error:'A imagem otimizada deve ter até 800 KB.'},413);}parts.push(value);}
    let body;try{body=JSON.parse(await new Blob(parts).text());}catch{return json({error:'Solicitação inválida.'},400);}
    if(!Object.hasOwn(SLOTS,body.slot))return json({error:'Local da imagem inválido.'},400);
    const action=body.action||'upload';
    if(!['upload','resize','reset'].includes(action)||action==='resize'&&body.slot!=='logo')return json({error:'Ação inválida.'},400);
    const scale=body.scale===undefined?100:body.scale;
    if(!Number.isInteger(scale)||scale<50||scale>300)return json({error:'Escolha um tamanho entre 50% e 300%.'},400);
    if(action!=='upload'){
      await env.DB.prepare(BRAND_OPTIONS_SCHEMA).run();
      const queries=[];
      if(action==='resize'){
        const existing=(await read(env.DB,'SELECT revision FROM siteBrandImages WHERE slot=?',body.slot)).results[0];
        const options=(await read(env.DB,'SELECT active FROM siteBrandOptions WHERE slot=?',body.slot)).results[0];
        if(!existing||options?.active===0)return json({error:'Selecione um logo personalizado primeiro.'},400);
        queries.push(env.DB.prepare('INSERT INTO siteBrandOptions(slot,scale,active) VALUES(?,?,1) ON CONFLICT(slot) DO UPDATE SET scale=excluded.scale').bind(body.slot,scale));
      }else queries.push(env.DB.prepare('INSERT INTO siteBrandOptions(slot,scale,active) VALUES(?,100,0) ON CONFLICT(slot) DO UPDATE SET active=0,scale=100').bind(body.slot));
      queries.push(env.DB.prepare('INSERT INTO portalAuditLogs(actorEmail,action,entityType,targetId,details) VALUES(?,?,?,?,?)').bind(email,action==='reset'?'Restaurou imagem padrão':'Alterou tamanho do logo','siteBrandImages',body.slot,JSON.stringify({scale})));
      await env.DB.batch(queries);
      return json({ok:true,url:action==='reset'?SLOTS[body.slot]:undefined,logoScale:scale});
    }
    let bytes;try{if(typeof body.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.data))throw Error();bytes=Uint8Array.from(atob(body.data),c=>c.charCodeAt(0));}catch{return json({error:'Imagem inválida.'},400);}
    const png=bytes.length>24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v), jpg=bytes.length>4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if(bytes.length>800000||(!png&&!jpg))return json({error:'Use PNG ou JPG. O arquivo precisa ter até 800 KB após otimização.'},400);
    await env.DB.prepare(SCHEMA).run();
    await env.DB.prepare(BRAND_OPTIONS_SCHEMA).run();
    const revision=crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO siteBrandOptions(slot,scale,active) VALUES(?,?,1) ON CONFLICT(slot) DO UPDATE SET scale=excluded.scale,active=1').bind(body.slot,scale),
      env.DB.prepare('INSERT INTO siteBrandImages(slot,data,mime,revision,updatedBy) VALUES(?,?,?,?,?) ON CONFLICT(slot) DO UPDATE SET data=excluded.data,mime=excluded.mime,revision=excluded.revision,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(body.slot,body.data,png?'image/png':'image/jpeg',revision,email),
      env.DB.prepare('INSERT INTO portalAuditLogs(actorEmail,action,entityType,targetId,details) VALUES(?,?,?,?,?)').bind(email,'Alterou imagem institucional','siteBrandImages',body.slot,JSON.stringify({revision}))
    ]);
    return json({ok:true,url:'/site-brand/image/'+body.slot+'?v='+revision,logoScale:scale});
  }catch(error){
    console.error(JSON.stringify({event:'site_branding_error',path,message:String(error?.message||error)}));
    // Existing visual content remains usable even if its optional configuration is unavailable.
    if(imageSlot&&SLOTS[imageSlot])return env.ASSETS.fetch(new Request(new URL(SLOTS[imageSlot],url),request));
    if(isPublic)return Response.json({images:{logo:null,hero:SLOTS.hero,about:SLOTS.about}},{headers:{'cache-control':'no-store'}});
    return json({error:'Não foi possível salvar ou carregar a imagem. Tente novamente.'},503);
  }
}
export function applySiteBranding(response) {
  if(!response.headers.get('content-type')?.includes('text/html'))return response;
  // Stream the shared enhancement into every HTML shell; do not rewrite React-owned children.
  return new HTMLRewriter().on('head',{element(element){element.append('<script src="/brand-logo.js?v=1" defer></script><script src="/site-branding.js?v=3" defer></script>',{html:true});}}).transform(response);
}
