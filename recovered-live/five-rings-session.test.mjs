import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const source=readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');
const fresh=source.slice(source.indexOf('async function freshFiveRingsSession('),source.indexOf('__name(resumeFiveRingsSession'));
test('expired Five Rings session renews with saved credentials; pending MFA never resends the login',async()=>{
let logins=0,writes=[];
const ctx={resumeFiveRingsSession:async()=>{throw Error('expired')},decryptSmtpPassword:async x=>x,encryptSmtpPassword:async x=>'encrypted:'+x,verifyFiveRingsLogin:async()=>{logins++;return{requiresCode:false,session:{url:'https://portal.fiveringsfinancial.com/account/home',cookies:'fixture'}}}};
vm.createContext(ctx);vm.runInContext(fresh,ctx);
let row={portalEmail:'fixture@example.test',encryptedPassword:'fixture-secret',encryptedSession:'{}',status:'connected'};
const env={JWT_SECRET:'test',DB:{prepare(sql){return{bind(...args){return{first:async()=>row,run:async()=>writes.push({sql,args})}}}}}};
const renewed=await ctx.freshFiveRingsSession(env,'fixture@example.test');assert.equal(logins,1);assert(renewed.url.endsWith('/account/home'));assert(writes[0].args[0].startsWith('encrypted:'));
row={...row,status:'pending',encryptedChallenge:'encrypted-fixture'};assert.equal(await ctx.freshFiveRingsSession(env,'fixture@example.test'),null);assert.equal(logins,1);
row={...row,status:'connected',encryptedChallenge:null};ctx.verifyFiveRingsLogin=async()=>({requiresCode:true,challenge:{url:'fixture'}});writes=[];assert.equal(await ctx.freshFiveRingsSession(env,'fixture@example.test'),null);assert(writes[0].sql.includes("status='pending'"));assert(writes[0].args[0].startsWith('encrypted:'));
});
test('Five Rings credits use the authenticated destination and persist official card values',async()=>{
const parse=source.slice(source.indexOf('function parseFiveRingsCredits('),source.indexOf('__name(parseFiveRingsCredits'));
const refresh=source.slice(source.indexOf('async function refreshFiveRingsCredits('),source.indexOf('__name(refreshFiveRingsCredits'));
let saved;
const ctx={URL,SCHEMA2:'fixture-schema',__name:x=>x,cachedFiveRingsCredits:async()=>saved};vm.createContext(ctx);vm.runInContext(parse+refresh,ctx);
const env={DB:{
prepare(){return {
run:async()=>{},
bind(...args){return {run:async()=>{saved={totalCredits:args[1],leadershipCurrent:args[2],leadershipGoal:args[3],leadershipRemaining:args[4]};}};}
};}
}};
const result=await ctx.refreshFiveRingsCredits(env,'fixture@example.test',{url:'https://portal.fiveringsfinancial.com/account/home',cookies:'fixture'},async url=>{assert.equal(url.pathname,'/account/home');return{ok:true,text:async()=>'<h2>Total Credits</h2><b>123,456</b><h2>Leadership Retreat</h2><b>100,000</b><b>200,000</b><b>100,000</b><h3>Scoreboards</h3>'}});
assert.equal(result.totalCredits,123456);assert.equal(result.leadershipCurrent,100000);assert.equal(result.leadershipGoal,200000);assert.equal(result.leadershipRemaining,100000);
await assert.rejects(()=>ctx.refreshFiveRingsCredits(env,'fixture@example.test',{url:'https://evil.test',cookies:'fixture'},()=>{throw Error('must not transmit')}),/Sessão inválida/);
});
test('Five Rings login submits its actual remember-browser checkbox',async()=>{
const {fiveRingsLoginBody}=await import('./worker/five-rings-login.js');
const body=fiveRingsLoginBody('<input type="checkbox" name="remember_device" value="yes">','fixture@example.test','test','csrf');
assert.equal(body.get('remember_device'),'yes');assert.equal(body.get('_token'),'csrf');assert.equal(body.get('email'),'fixture@example.test');
assert.equal(fiveRingsLoginBody('<input type="checkbox" name="marketing">','fixture@example.test','test','csrf').has('marketing'),false);
});
test('Five Rings redirects preserve renewed cookies and reject other destinations',async()=>{
const follow=source.slice(source.indexOf('async function fiveRingsFollow('),source.indexOf('async function verifyFiveRingsLogin('));
let calls=[];
const ctx={URL,mergeFiveRingsCookies:(old,headers)=>headers.get('set-cookie')||old,fiveRingsFetch:async(url,options)=>{calls.push({path:url.pathname,cookie:options.headers.cookie});return calls.length===1?{ok:false,status:302,headers:new Headers({location:'/account/home','set-cookie':'session=renewed'}),text:async()=>''}:{ok:true,status:200,headers:new Headers(),text:async()=>'<h1>Dashboard</h1>'};}};
vm.createContext(ctx);vm.runInContext(follow,ctx);const result=await ctx.fiveRingsFollow('https://portal.fiveringsfinancial.com/account/start','session=old');
assert.equal(calls[1].cookie,'session=renewed');assert.equal(result.cookies,'session=renewed');assert(result.url.endsWith('/account/home'));
calls=[];ctx.fiveRingsFetch=async()=>({ok:false,status:302,headers:new Headers({location:'https://evil.test'}),text:async()=>''});
await assert.rejects(()=>ctx.fiveRingsFollow('https://portal.fiveringsfinancial.com/account/start','session=secret'),/endereço inesperado/);
});
test('combined Set-Cookie headers retain session cookies without splitting expiry dates',()=>{
const cookies=source.slice(source.indexOf('function fiveRingsCookies('),source.indexOf('__name(fiveRingsCookies'));
const ctx={};vm.createContext(ctx);vm.runInContext(cookies,ctx);
const header={get:()=> 'XSRF-TOKEN=test; Path=/; Expires=Wed, 14 Oct 2026 12:00:00 GMT, portal_session=valid; Path=/; HttpOnly'};
assert.equal(ctx.fiveRingsCookies(header),'XSRF-TOKEN=test; portal_session=valid');
});
