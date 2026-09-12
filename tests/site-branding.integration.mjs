import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from '/Users/rafael/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const require=createRequire(import.meta.url), wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=wr('miniflare');
const root=path.resolve('recovered-live'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'affinity-brand-test-'));
const fullPortal=process.env.FULL_PORTAL_TEST==='1';
const raw=fullPortal?fs.readFileSync(root+'/worker/current-worker.js','utf8').replace(/    if \(url\.hostname === "affinityfc\.org" \|\| url\.protocol === "http:"\) \{[\s\S]*?\n    \}/,''):`import {siteBrandingRoute,applySiteBranding} from './site-branding.js';export default {async fetch(request,env){const auth={email:async r=>r.headers.get('x-test-user'),access:async email=>({isMaster:email!=='agent@brand.test',account:{isActive:email!=='blocked@brand.test',status:email==='blocked@brand.test'?'blocked':'approved',accountType:email==='agent@brand.test'?'agent':'both'}})};const response=await siteBrandingRoute(request,env,auth);if(response)return applySiteBranding(response);if(new URL(request.url).pathname.endsWith('/dashboard')||new URL(request.url).pathname==='/'||new URL(request.url).pathname.endsWith('/agenda')||new URL(request.url).pathname.endsWith('/email'))return applySiteBranding(new Response('<html><head></head><body><aside><button><div>Affinity Financial</div></button></aside><a href="/admin/site-branding">Marca e imagens do site</a></body></html>',{headers:{'content-type':'text/html'}}));return applySiteBranding(await env.ASSETS.fetch(request));}}`;
fs.writeFileSync(temp+'/entry.js',raw);fs.copyFileSync(root+'/worker/site-branding.js',temp+'/site-branding.js');
fs.copyFileSync(root+'/worker/crm-stage.js',temp+'/crm-stage.js');
fs.copyFileSync(root+'/worker/whatsapp.js',temp+'/whatsapp.js');
await wr('esbuild').build({entryPoints:[temp+'/entry.js'],outfile:temp+'/worker.js',bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],logLevel:'error'});
const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:fs.readFileSync(temp+'/worker.js','utf8'),compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{JWT_SECRET:'test-only-private-secret-should-never-be-deployed',ADMIN_PASSWORD:'BrandTestOnly2026!',ADMIN_EMAIL:'admin@brand.test'},serviceBindings:{ASSETS:async request=>{
 const p=new URL(request.url).pathname;let file=path.resolve(root+'/public','.'+p);if(!file.startsWith(root+'/public/'))file=root+'/public/index.html';
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){if(path.extname(file))return new Response('Not found',{status:404});file=root+'/public/index.html';}
 return new Response(fs.readFileSync(file),{headers:{'content-type':mime[path.extname(file)]||'application/octet-stream'}});
}},outboundService:()=>new Response('External services disabled',{status:503})}));
const db=await mf.getD1Database('DB');
const schema=fs.readFileSync(process.env.TEST_SCHEMA_PATH||'/tmp/independent-portal-schema.sql','utf8');for(const statement of schema.split(';').map(x=>x.trim()).filter(Boolean))await db.prepare(statement).run();
const hash=await require('bcryptjs').hash('BrandTestOnly2026!',12);
for(const [email,type,role] of [['admin@brand.test','both','master'],['agent@brand.test','agent','standard'],['blocked@brand.test','both','master']])await db.prepare('INSERT INTO adminAccounts(email,name,passwordHash,accountType,adminRole,status,isActive) VALUES(?,?,?,?,?,?,?)').bind(email,'Brand Test',hash,type,role,email.startsWith('blocked')?'blocked':'approved',email.startsWith('blocked')?0:1).run();
server.on('request',async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const r=await mf.dispatchFetch(origin+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});res.statusCode=r.status;for(const [k,v]of r.headers)if(k!=='set-cookie')res.setHeader(k,v);if(r.headers.getSetCookie().length)res.setHeader('set-cookie',r.headers.getSetCookie());res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.statusCode=500;res.end(String(e));}});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 const initial=await (await page.request.get(origin+'/api/site-branding')).json();assert.equal(initial.images.logo,null);
 assert.equal((await page.request.get(origin+'/family-hero.jpg')).status(),200);console.log('PASS originals preserved before configuration');
 assert.equal((await page.request.post(origin+'/api/admin/site-branding',{data:{}})).status(),401);
 if(fullPortal){await page.goto(origin+'/admin/login');await page.locator('input[type=email]').fill('admin@brand.test');await page.locator('input[type=password]').fill('BrandTestOnly2026!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/admin/dashboard');await page.getByRole('button',{name:'Abrir menu da conta',exact:true}).click();}
 else{await page.setExtraHTTPHeaders({'x-test-user':'admin@brand.test'});await page.goto(origin+'/admin/dashboard');console.log('NOTICE: auth dependency and portal shells are fixtures; testing real branding module and D1');}
 await page.getByRole('link',{name:'Marca e imagens do site',exact:true}).click();await page.waitForURL('**/admin/site-branding');
 if(fullPortal){
   const call=(name,input)=>page.evaluate(async({name,input})=>{const r=await fetch('/api/trpc/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:input})});return r.json();},{name,input});
   const client={name:'CRM Stage Test',email:'client@stage.test',phone:'2125550100',assignedAdminEmail:'admin@brand.test',status:'new'};
   const created=await call('crm.create',client);client.id=created.result.data.json.id;
   assert((await call('crm.update',{...client,status:'client'})).error);
   await db.prepare("INSERT INTO agentPolicies(agentEmail,clientId,clientName,policyNumber,status) VALUES(?,?,?,'TEST-STAGE','lapsed')").bind(client.assignedAdminEmail,client.id,client.name).run();
   assert((await call('crm.update',{...client,status:'client'})).error);
   await db.prepare("UPDATE agentPolicies SET status='active' WHERE policyNumber='TEST-STAGE'").run();
   assert((await call('crm.update',{...client,status:'client'})).result);
   assert.equal((await db.prepare('SELECT status FROM crmClients WHERE id=?').bind(client.id).first()).status,'client');
   console.log('PASS Cliente stage saved only with active policy');
 }
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=300;const ctx=c.getContext('2d');ctx.fillStyle='#dbb537';ctx.fillRect(0,0,1000,300);ctx.fillStyle='#102239';ctx.font='bold 100px sans-serif';ctx.fillText('AFFINITY TEST',30,190);return c.toDataURL().split(',')[1];});
 page.on('dialog',d=>d.accept());
 for(const [label,slot]of [['Logo institucional','logo'],['Imagem principal','hero'],['Imagem da seção Sobre','about']]){
  await page.getByLabel(label,{exact:true}).setInputFiles({name:'brand.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByRole('button',{name:'Salvar '+label.toLowerCase(),exact:true}).click();await page.getByText('Imagem salva com sucesso. Atualize o site para conferir.',{exact:true}).waitFor();
  const data=await (await page.request.get(origin+'/api/site-branding',{headers:{'cache-control':'no-cache'}})).json();assert(data.images[slot].includes('/site-brand/image/'+slot));
 }
 await page.screenshot({path:temp+'/editor.png',fullPage:true});
 assert.equal((await db.prepare('SELECT count(*) AS n FROM siteBrandImages').first()).n,3);assert.equal((await db.prepare("SELECT count(*) AS n FROM portalAuditLogs WHERE entityType='siteBrandImages'").first()).n,3);console.log('PASS all image slots saved with audit');
 const invalid=await page.evaluate(async()=>{const r=await fetch('/api/admin/site-branding',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot:'logo',data:btoa('<svg onload="alert(1)"/>')})});return r.status;});assert.equal(invalid,400);
 for(const route of ['/admin/dashboard','/agentes/dashboard','/agentes/agenda','/agentes/email','/']){
  await page.goto(origin+route);await page.waitForFunction(()=>document.querySelector('.affinity-company-mark'));assert((await page.locator('script[src*="site-branding.js"]').count())>=1);console.log('PASS shared logo',route);
 }
 if(!fullPortal){for(const user of ['agent@brand.test','blocked@brand.test'])assert.equal((await page.request.post(origin+'/api/admin/site-branding',{headers:{'x-test-user':user,Origin:origin},data:{slot:'logo',data:png}})).status(),403);console.log('PASS agent and blocked administrator rejected');}
 assert.deepEqual(errors,[]);console.log('PASS no browser errors; screenshots:',temp);
}finally{await browser.close();await mf.dispose();await new Promise(r=>server.close(r));}
