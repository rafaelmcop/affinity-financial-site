import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {siteBrandingRoute} from './worker/site-branding.js';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE portalAuditLogs(actorEmail TEXT,action TEXT,entityType TEXT,targetId TEXT,details TEXT)');
 const prepare=sql=>{let args=[];return{bind(...v){args=v;return this},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return db.prepare(sql).run(...args)}}};
 const env={DB:{prepare,async batch(q){db.exec('BEGIN');try{const out=[];for(const x of q)out.push(await x.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}},ASSETS:{fetch:async r=>new Response(new URL(r.url).pathname)}};
 const auth={email:async r=>r.headers.get('x-user'),access:async email=>({isMaster:email==='admin'})};
 const call=(body,user='admin',origin='https://www.affinityfc.org')=>siteBrandingRoute(new Request('https://www.affinityfc.org'+(body?'/api/admin/site-branding':'/api/site-branding'),{method:body?'POST':'GET',headers:{'x-user':user,origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env,auth);
 const png=Buffer.from([137,80,78,71,13,10,26,10,...Array(20).fill(0)]).toString('base64');return{db,call,png,env,auth};
}
test('logo sizing persists, reset restores original and new upload reactivates custom image',async()=>{
 const {db,call,png,env,auth}=fixture();
 assert.equal((await(await call()).json()).images.logo,null);
 assert.equal((await call({slot:'logo',data:png,scale:180})).status,200);
 assert.equal((await(await call()).json()).logoScale,180);
 assert.equal((await call({slot:'logo',action:'resize',scale:240})).status,200);
 assert.equal((await(await call()).json()).logoScale,240);
 assert.equal((await call({slot:'logo',action:'reset'})).status,200);
 assert.equal((await(await call()).json()).images.logo,null);
 assert.equal((await siteBrandingRoute(new Request('https://www.affinityfc.org/site-brand/image/logo'),env,auth)).status,404);
 assert.equal(db.prepare('SELECT count(*) c FROM siteBrandImages').get().c,1);
 assert.equal((await call({slot:'logo',action:'resize',scale:100})).status,400);
 assert.equal((await call({slot:'logo',data:png})).status,200);
 assert.match((await(await call()).json()).images.logo,/site-brand\/image\/logo/);
 assert.equal((await call({slot:'hero',data:png})).status,200);
 assert.equal((await call({slot:'hero',action:'reset'})).status,200);
 assert.equal((await(await call()).json()).images.hero,'/family-hero.jpg');db.close();
});
test('branding mutations enforce administrator, origin, range and action validation',async()=>{
 const {db,call,png}=fixture();
 assert.equal((await call({slot:'logo',data:png},'agent')).status,403);
 assert.equal((await call({slot:'logo',data:png},'admin','https://other.test')).status,403);
 for(const scale of [0,301,'200',150.1])assert.equal((await call({slot:'logo',data:png,scale})).status,400);
 assert.equal((await call({slot:'hero',action:'resize',scale:200})).status,400);
 assert.equal((await call({slot:'logo',action:'unknown'})).status,400);db.close();
});
