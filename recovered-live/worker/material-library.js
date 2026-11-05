const schema=[`CREATE TABLE IF NOT EXISTS portalMaterials(id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,sha256 TEXT NOT NULL,createdBy TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,`CREATE TABLE IF NOT EXISTS portalMaterialChunks(materialId TEXT NOT NULL,part INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(materialId,part))`];
export async function ensureMaterials(db){for(const sql of schema)await db.prepare(sql).run();}
const json=(data,status=200)=>Response.json(data,{status});
export function validateMaterial(body){
 const title=String(body.title||'').trim(),category=String(body.category||'Outros').trim(),description=String(body.description||'').trim(),filename=String(body.filename||'').replace(/[\x00-\x1f\x7f\/\\"]/g,'_').slice(0,180);
 if(!title||title.length>160||!category||category.length>60||description.length>1500||!filename)throw Error('Informe título, categoria e arquivo válidos.');
 if(typeof body.data!=='string'||body.data.length>14000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.data))throw Error('Arquivo inválido.');
 const bytes=Uint8Array.from(atob(body.data),c=>c.charCodeAt(0));if(!bytes.length||bytes.length>10*1024*1024)throw Error('O limite por arquivo é 10 MB.');
 const ext=filename.split('.').pop().toLowerCase(),mimes={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
 const magic=ext==='pdf'?new TextDecoder().decode(bytes.slice(0,5))==='%PDF-':['docx','xlsx','pptx'].includes(ext)?bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4:ext==='png'?[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):['jpg','jpeg'].includes(ext)?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:false;
 if(!mimes[ext]||!magic)throw Error('Use PDF, DOCX, XLSX, PPTX, PNG ou JPG com conteúdo válido.');
 return {title,category,description,filename,mime:mimes[ext],size:bytes.length,bytes,data:body.data};
}
async function readBody(request){const reader=request.body?.getReader();if(!reader)throw Error('Solicitação vazia.');let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>14100000){await reader.cancel();throw Error('O limite por arquivo é 10 MB.');}chunks.push(value);}return JSON.parse(await new Blob(chunks).text());}
export async function materialLibrary(request,env,auth){
 const url=new URL(request.url),path=url.pathname;
 if(!['/agentes/materiais','/admin/materiais','/material-library.html'].includes(path)&&!path.startsWith('/api/materials'))return null;
 const email=await auth.email(request,env);if(!email)return path.startsWith('/api/')?json({error:'Entre novamente no portal.'},401):Response.redirect(new URL(path.startsWith('/admin/')?'/admin/login':'/agentes/login',url),302);
 const access=await auth.access(email,env),account=access.account;
 if(!account?.isActive||account.status!=='approved'||!['admin','both','agent'].includes(account.accountType))return json({error:'Acesso não permitido.'},403);
 const admin=['admin','both'].includes(account.accountType);
 if(path==='/admin/materiais'&&!admin)return json({error:'Somente Admin.'},403);
 if(['/agentes/materiais','/admin/materiais','/material-library.html'].includes(path))return env.ASSETS.fetch(new Request(new URL('/material-library.html',url),request));
 await ensureMaterials(env.DB);
 if(path==='/api/materials'&&request.method==='GET'){const rows=await env.DB.prepare('SELECT id,title,category,description,filename,mime,size,createdAt FROM portalMaterials ORDER BY title COLLATE NOCASE').all();return json({items:rows.results||[],canManage:admin});}
 const match=path.match(/^\/api\/materials\/([a-f0-9-]{36})$/);
 if(match&&request.method==='GET'){
  const row=await env.DB.prepare('SELECT * FROM portalMaterials WHERE id=?').bind(match[1]).first();if(!row)return json({error:'Material não encontrado.'},404);
  const parts=await env.DB.prepare('SELECT data FROM portalMaterialChunks WHERE materialId=? ORDER BY part').bind(row.id).all();
  const data=(parts.results||[]).map(p=>p.data).join(''),bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
  if(bytes.length!==row.size)return json({error:'Arquivo indisponível. Avise o Admin.'},503);
  return new Response(bytes,{headers:{'content-type':row.mime,'content-disposition':`attachment; filename="material.${row.filename.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(row.filename)}`,'x-content-type-options':'nosniff','cache-control':'private, no-store'}});
 }
 if(!admin)return json({error:'Somente Admin pode alterar os materiais.'},403);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Origem não autorizada.'},403);
 if(path==='/api/materials'&&request.method==='POST'){
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Envie JSON.'},415);
  let material;try{material=validateMaterial(await readBody(request));}catch(error){return json({error:error.message||'Arquivo inválido.'},400);}
  const id=crypto.randomUUID(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',material.bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const statements=[env.DB.prepare('INSERT INTO portalMaterials(id,title,category,description,filename,mime,size,sha256,createdBy) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,material.title,material.category,material.description,material.filename,material.mime,material.size,hash,email)];
  for(let start=0,part=0;start<material.data.length;start+=262144,part++)statements.push(env.DB.prepare('INSERT INTO portalMaterialChunks(materialId,part,data) VALUES(?,?,?)').bind(id,part,material.data.slice(start,start+262144)));
  await env.DB.batch(statements);return json({ok:true,id},201);
 }
 if(match&&request.method==='DELETE'){await env.DB.batch([env.DB.prepare('DELETE FROM portalMaterialChunks WHERE materialId=?').bind(match[1]),env.DB.prepare('DELETE FROM portalMaterials WHERE id=?').bind(match[1])]);return json({ok:true});}
 return json({error:'Método ou endereço inválido.'},405);
}
