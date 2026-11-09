import {boundedJson} from './security-boundary.js';
export async function noticeReadRoute(request,env,auth){
 const url=new URL(request.url);if(url.pathname!=='/api/portal/notice-read')return null;
 const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
 let owner=null;const assistant=await auth.session(request,env,'affinity_assistant_session');
 if(assistant?.type==='assistant'){const row=await env.DB.prepare('SELECT id FROM portalAssistants WHERE id=? AND sessionVersion=? AND active=1 AND deletedAt IS NULL').bind(assistant.id,assistant.version).first();if(row)owner='assistant:'+row.id;}
 if(!owner){const email=await auth.email(request,env);if(email)owner='account:'+email.toLowerCase();}
 if(!owner){const id=await auth.affiliate(request,env);if(id)owner='affiliate:'+id;}
 if(!owner)return json({error:'Entre novamente.'},401);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS portalNoticeRead(owner TEXT NOT NULL,fingerprint TEXT NOT NULL,readAt INTEGER NOT NULL,PRIMARY KEY(owner,fingerprint))').run();
 if(request.method==='GET'){const rows=await env.DB.prepare('SELECT fingerprint FROM portalNoticeRead WHERE owner=? ORDER BY readAt DESC LIMIT 1000').bind(owner).all();return json({read:(rows.results||[]).map(r=>r.fingerprint)});}
 if(request.method!=='POST'||request.headers.get('origin')!==url.origin||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({error:'Solicitação inválida.'},403);
 try{const input=await boundedJson(request,1024),fingerprint=String(input.fingerprint||'');if(!/^[a-f0-9]{16}$/.test(fingerprint))return json({error:'Aviso inválido.'},400);await env.DB.prepare('INSERT INTO portalNoticeRead VALUES(?,?,?) ON CONFLICT(owner,fingerprint) DO UPDATE SET readAt=excluded.readAt').bind(owner,fingerprint,Date.now()).run();return json({ok:true});}catch{return json({error:'Não foi possível marcar o aviso como lido.'},400);}
}
