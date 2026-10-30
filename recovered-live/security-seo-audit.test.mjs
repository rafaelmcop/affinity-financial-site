import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sensitiveResource,privatePage,unexpectedSpaPage,perimeterHeaders} from './worker/site-perimeter.js';
import {accessSchema,userAccess} from './worker/user-access.js';
import mailer from './dependencies/node_modules/nodemailer/dist/esm/nodemailer.js';

test('private files are blocked including encoded names; public assets stay available',()=>{
 for(const path of ['/.env','/%2egit/config','/private/backup','/backup.sqlite','/export.sql','/assets/app.js.map','/key.pem','/%ZZ'])assert.equal(sensitiveResource(path),true,path);
 for(const path of ['/assets/index.js','/robots.txt','/sitemap.xml','/family-hero.jpg','/affinity-five-rings-connector.zip'])assert.equal(sensitiveResource(path),false,path);
});
test('all private pages and early API responses are nonindexable and noncacheable',()=>{
 for(const path of ['/admin/login','/agentes','/afiliados/login','/assistentes/dashboard','/agent-email.html','/api/agent/access','/preencher-aplicacao.html','/reset-password']){
  assert.equal(privatePage(path),true,path);
  const r=perimeterHeaders(new Response('{}',{status:403,headers:{vary:'Origin'}}),path);
  assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('vary'),/Origin, Cookie, Authorization/);
 }
 const home=perimeterHeaders(new Response('home'),'/');assert.equal(home.headers.get('x-robots-tag'),null);
});
test('unknown SPA fallback is a real not-found without breaking valid routes or standalone public pages',()=>{
 const html='<div id="root"></div><script src="/assets/index-BIU-6RMI.js?v=stable"></script>';
 assert.equal(unexpectedSpaPage('/not-a-real-page',html),true);
 for(const path of ['/','/avaliar','/reset-password','/agendar','/agentes/dashboard','/admin/usuarios'])assert.equal(unexpectedSpaPage(path,html),false,path);
 assert.equal(unexpectedSpaPage('/agent-public-profile.html','<main>Published profile</main>'),false);
});
function schemaFixture(){let runs=0,fail=false,features=['calendar'];const DB={prepare(sql){return {bind(){return this},async run(){runs++;if(fail){fail=false;throw Error('transient initialization')}return {meta:{changes:0}}},async first(){return sql.includes('SELECT featuresJson')?{featuresJson:JSON.stringify(features)}:{version:'installed'}}}},async batch(q){return Promise.all(q.map(s=>s.run()))}};return {env:{DB},get runs(){return runs},setFail(){fail=true},features(value){features=value}};}
test('concurrent requests initialize schema once while permission revocations remain immediate',async()=>{
 const f=schemaFixture();await Promise.all([accessSchema(f.env),accessSchema(f.env),accessSchema(f.env)]);const runs=f.runs;
 assert.deepEqual((await userAccess(f.env,'a@example.invalid')).features,['calendar']);f.features([]);assert.deepEqual((await userAccess(f.env,'a@example.invalid')).features,[]);assert.equal(f.runs,runs);
});
test('failed schema initialization is retryable and a different database is initialized independently',async()=>{
 const f=schemaFixture();f.setFail();await assert.rejects(accessSchema(f.env));await accessSchema(f.env);const other=schemaFixture();await accessSchema(other.env);assert(other.runs>0);
});
test('patched mail runtime builds PDF attachment mail locally and blocks filesystem/URL attachment reads',async()=>{
 assert.equal(JSON.parse(fs.readFileSync(new URL('./dependencies/node_modules/nodemailer/package.json',import.meta.url))).version,'10.3.1');
 const transport=mailer.createTransport({streamTransport:true,buffer:true,disableFileAccess:true,disableUrlAccess:true});
 const result=await transport.sendMail({from:'Agent <agent@example.invalid>',to:'client@example.invalid',subject:'Synthetic attachment test',text:'Fixture only',attachments:[{filename:'proposal.pdf',content:Buffer.from('%PDF-fixture'),contentType:'application/pdf'}]});
 const raw=result.message.toString();assert.match(raw,/filename=proposal.pdf/);assert.match(raw,/application\/pdf/);
 await assert.rejects(transport.sendMail({from:'a@example.invalid',to:'b@example.invalid',attachments:[{path:'/etc/passwd'}]}),/File access rejected/);
 await assert.rejects(transport.sendMail({from:'a@example.invalid',to:'b@example.invalid',attachments:[{path:'https://example.invalid/file'}]}),/Url access rejected/);
});
test('homepage has crawlable initial text, valid structured data and accurate language alternatives',()=>{
 const html=fs.readFileSync(new URL('./public/index.html',import.meta.url),'utf8');
 assert.match(html,/<div id="root"><main/);assert.match(html,/<h1>Seguro de vida nos EUA/);assert.match(html,/href="\/seguro-de-vida-para-brasileiros-nos-eua.html"/);
 assert.doesNotMatch(html,/hreflang="(?:en-US|es-US)"/);assert.doesNotMatch(html,/maximum-scale=1/);
 for(const [,json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.equal(JSON.parse(json)['@context'],'https://schema.org');
 assert.match(html,/index-BIU-6RMI.js\?v=20261009-setup-1/);
});

// Static resources bypass the Worker only for the compiled JavaScript/CSS.
// Sensitive extensions and SPA fallbacks must still reach the perimeter.
test('asset routing cannot bypass sensitive-file checks and static assets carry security headers',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('./deploy/wrangler-main.jsonc',import.meta.url),'utf8'));
 assert.deepEqual(config.assets.run_worker_first,['/*','!/assets/*.js','!/assets/*.css','!/vendor/*.js','!/vendor/*.css']);
 const headers=fs.readFileSync(new URL('./public/_headers',import.meta.url),'utf8');
 for(const value of ['X-Content-Type-Options: nosniff','Strict-Transport-Security: max-age=31536000','Referrer-Policy: no-referrer'])assert(headers.includes(value));
 for(const path of ['/assets/app.js.map','/vendor/.env','/assets/backup.sqlite'])assert(sensitiveResource(path));
});

test('mail recipient parser preserves the real address in nested comments and quoted local parts',async()=>{
 const {default:parse}=await import('./dependencies/node_modules/nodemailer/dist/esm/addressparser/index.js');
 assert.deepEqual(parse('Recipient (x(y) <attacker@example.invalid>) <recipient@example.test>').map(x=>x.address),['recipient@example.test']);
 assert.deepEqual(parse('<"a@attacker.invalid>"@recipient.test>').map(x=>x.address),['"a@attacker.invalid>"@recipient.test']);
 const source=fs.readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');
 assert(source.includes('var addressparser = patchedAddressParser;'));
 assert(!source.includes('var addressparser = require_addressparser2();'));
 const transport=mailer.createTransport({streamTransport:true,buffer:true,disableFileAccess:true,disableUrlAccess:true});
 const sent=await transport.sendMail({from:'agent@example.test',to:'Recipient (x(y) <attacker@example.invalid>) <recipient@example.test>',subject:'Synthetic parser test',text:'Fixture only'});
 assert.deepEqual(sent.envelope.to,['recipient@example.test']);
});
