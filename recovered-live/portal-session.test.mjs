import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {portalSessionKind,portalSessionRoute} from './worker/portal-session.js';

test('private pages choose the right login while public forms, profiles and sign-in pages stay accessible',()=>{
 const cases={
  '/agentes/dashboard':'agent','/agent-applications?applicationId=1':'agent',
  '/admin/usuarios':'admin','/admin-system-logs.html':'admin',
  '/afiliados/dashboard':'affiliate','/assistentes/dashboard':'assistant',
  '/agentes/crm?assistantView=1':'assistant','/candidaturas.html?portal=admin':'admin'
 };
 for(const [path,portal] of Object.entries(cases))assert.equal(portalSessionKind(new URL(path,'https://example.invalid')),portal);
 for(const path of ['/','/agentes','/agentes/login','/afiliados/registrar','/admin/login','/assistentes/login','/assistant-login.html','/agent-public-profile.html','/preencher-aplicacao.html?token=private','/avaliacao-convite.html?token=private','/teste/tesla/']){
  assert.equal(portalSessionKind(new URL(path,'https://example.invalid')),null,path);
 }
});
test('session status reports expiration without exposing user details and validates the requested portal',async()=>{
 const request=portal=>new Request('https://example.invalid/api/portal/session-status?portal='+portal);
 const expired=await portalSessionRoute(request('agent'),{},async()=>null);
 assert.equal(expired.status,401);assert.equal((await expired.json()).login,'/agentes/login');
 const live=await portalSessionRoute(request('assistant'),{},async(_,__,cookie)=>{
  assert.equal(cookie,'affinity_assistant_session');
  return {type:'assistant',email:'private@example.invalid',expiresAt:Date.now()+60000};
 });
 assert.equal(live.status,200);const body=await live.json();assert.equal(body.active,true);assert.equal(body.email,undefined);
 assert.match(live.headers.get('cache-control'),/no-store/);
 const wrongRole=await portalSessionRoute(request('affiliate'),{},async()=>({type:'admin',expiresAt:Date.now()+60000}));
 assert.equal(wrongRole.status,401);
 assert.equal((await portalSessionRoute(request('unknown'),{},async()=>null)).status,400);
});

const source=fs.readFileSync(new URL('./public/portal-session.js',import.meta.url),'utf8');
async function browserFixture(response){
 const events={},timers=[],redirects=[];let clock=100000,calls=0;
 const document={visibilityState:'visible',querySelector:()=>({dataset:{sessionPortal:'agent'}}),addEventListener:(event,fn)=>events[event]=fn};
 const context={window:{addEventListener:(event,fn)=>events[event]=fn},document,location:{replace:url=>redirects.push(url)},
  fetch:async()=>{calls++;if(response instanceof Error)throw response;return response},
  Date:{now:()=>clock},AbortSignal:{timeout:()=>undefined},
  setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval(){}};
 vm.runInNewContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {events,timers,redirects,document,get calls(){return calls},advance:milliseconds=>clock+=milliseconds};
}
test('a tab returning after expiry redirects to login once, using the verified expiration time',async()=>{
 const f=await browserFixture({status:200,json:async()=>({active:true,expiresAt:110000})});
 assert.equal(f.redirects.length,0);
 f.advance(11000);f.events.focus();f.events.visibilitychange();
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.redirects,['/agentes/login']);
 assert.equal(f.calls,2);
});
test('network failures and service outages do not log out a user',async()=>{
 for(const response of [new Error('offline'),{status:503},{status:403}]){
  const f=await browserFixture(response);assert.deepEqual(f.redirects,[]);
 }
 const expired=await browserFixture({status:401,json:async()=>({active:false,expiresAt:null})});
 assert.deepEqual(expired.redirects,['/agentes/login']);
});
test('legacy SPA authentication returns to local login without generating the old broken URL',()=>{
 const script=fs.readFileSync(new URL('./public/assets/index-BIU-6RMI.js',import.meta.url),'utf8');
 const start=script.indexOf('const uA=()=>{'),end=script.indexOf('},hs=new ex',start)+1;
 assert(start>=0&&end>start);
 for(const [path,expected] of [['/admin/dashboard','/admin/login'],['/agentes/dashboard','/agentes/login'],['/afiliados/dashboard','/afiliados/login'],['/assistentes/dashboard','/assistentes/login']]){
  let redirect;
  vm.runInNewContext(script.slice(start,end)+';uA();',{URLSearchParams,window:{location:{pathname:path,search:'',replace:value=>redirect=value}}});
  assert.equal(redirect,expected);
 }
});

test('renewal in another tab is checked before redirecting at the previous expiration time',async()=>{
 let expiry=110000;
 const f=await browserFixture({status:200,json:async()=>({active:true,expiresAt:expiry})});
 expiry=200000;
 f.advance(11000);f.events.focus();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.calls,2);assert.deepEqual(f.redirects,[]);
});
