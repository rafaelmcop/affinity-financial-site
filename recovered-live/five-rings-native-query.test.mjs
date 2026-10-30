import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const code=await readFile(new URL('../integrations/five-rings-browser/background.js',import.meta.url),'utf8');
test('native table read reuses one Five Rings tab, exports only columns/order and recovers closed channels',async()=>{
 let listener,closed=[],sent,query,reads=0;
 const table={ajax:{url:'/account/clients/data'},oAjaxData:{columns:[{data:'actual_name',name:'clients.name',searchable:true,orderable:true,search:{value:'private search'}}],order:[{column:0,dir:'asc'}],csrf:'never-export'}};
 const context=vm.createContext({crypto:webcrypto,URL,URLSearchParams,setTimeout,clearTimeout,Date,location:{origin:'https://portal.fiveringsfinancial.com',pathname:'/account/clients'},window:{jQuery:{fn:{dataTable:{settings:[table]}}}},chrome:{runtime:{onMessage:{addListener(fn){listener=fn}},getManifest(){return{version:'1.0.4'}}},tabs:{async query(){return[{id:1,url:'https://portal.fiveringsfinancial.com/account/dashboard'}]},async create(){return{id:2}},onUpdated:{addListener(){},removeListener(){}},async update(){return{}},async get(){return{status:'complete',url:'https://portal.fiveringsfinancial.com/account/policies'}},async remove(id){closed.push(id)},async sendMessage(id,msg){sent=msg;if(++reads===1)throw Error('The page keeping the extension port is moved into back/forward cache, so the message channel is closed.');return{ok:true}}},scripting:{async executeScript(options){assert.equal(options.world,'MAIN');context.location.pathname='/account/'+options.args[0];context.location.href=context.location.origin+context.location.pathname;table.ajax.url=context.location.pathname+'/data';const result=await options.func(...options.args);query=result.query;return[{result}];}}}});
 vm.runInContext(code,context);
 const sender={tab:{id:1,url:'https://www.affinityfc.org/agent-five-rings-sync.html'},documentId:'synthetic-doc'};
 const request=msg=>new Promise(resolve=>listener(msg,sender,resolve));
 const started=await request({action:'collectStart',portalEmail:'synthetic@example.invalid',manualConfirmed:true});
 assert(started.jobId);
 // Another document cannot consume this snapshot, even within the same tab.
 const denied=await new Promise(resolve=>listener({action:'collectStatus',jobId:started.jobId},{...sender,documentId:'another-document'},resolve));
 assert.equal(denied.ok,false);
 let result;for(let i=0;i<20;i++){result=await request({action:'collectStatus',jobId:started.jobId});if(!result.processing)break;await new Promise(resolve=>setImmediate(resolve));}
 assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(closed,[]);assert.equal(reads,2);
 assert.equal(new URLSearchParams(query).get('columns[0][name]'),'clients.name');
 assert.equal(new URLSearchParams(query).get('order[0][dir]'),'asc');
 assert(!query.includes('private'));assert(!query.includes('csrf'));assert(sent.queries.clients&&sent.queries.policies);
 let invalidReply=false;assert.equal(listener({action:'collect'},{tab:{url:'https://evil.invalid/'}},()=>invalidReply=true),undefined);assert.equal(invalidReply,false);
 table.ajax.url='https://evil.invalid/account/clients/data';
 // Exercise the error path without waiting for a missing-table timeout.
 context.chrome.scripting.executeScript=async()=>[{result:{error:'Native table unavailable'}}];
 const next=await request({action:'collectStart'});let failed;for(let i=0;i<20;i++){failed=await request({action:'collectStatus',jobId:next.jobId});if(!failed.processing)break;await new Promise(resolve=>setImmediate(resolve));}
 assert.equal(failed.error,'Native table unavailable');assert.equal(closed.length,0);
});
test('background sync keeps one independent task across user page navigation and only its task tab may finish it',async()=>{
 let listener,created=0,closed=[];
 const context=vm.createContext({crypto:webcrypto,Date,chrome:{runtime:{onMessage:{addListener(fn){listener=fn}}},tabs:{async create({active,url}){assert.equal(active,false);assert.match(url,/background=1/);return{id:++created+100}},async get(){return{url:'https://www.affinityfc.org/agent-five-rings-sync.html?background=1'}},async remove(id){closed.push(id)}}}});
 vm.runInContext(code,context);
 const request=(message,id=10,documentId='doc-1')=>new Promise(resolve=>listener(message,{tab:{id,url:'https://www.affinityfc.org/agentes/dashboard'},documentId},resolve));
 const a=await request({action:'backgroundStart',owner:'agent@example.invalid'});
 const b=await request({action:'backgroundStart',owner:'agent@example.invalid'},11,'doc-after-navigation');
 assert.equal(a.processing,true);assert.equal(b.processing,true);assert.equal(created,1);
 assert.equal((await request({action:'backgroundFinish',error:'wrong-tab'})).ok,false);
 assert.equal((await request({action:'backgroundFinish',error:'Needs verification'},101)).ok,true);
 assert.deepEqual(closed,[101]);
 const state=await request({action:'backgroundStart',owner:'agent@example.invalid'},11);
 assert.equal(state.processing,false);assert.equal(state.error,'Needs verification');assert.equal(created,1);
});
test('reader progress is accepted only from the active Five Rings tab; cached stages stay in extension session storage',async()=>{
 let listener,stored={},requestCount=0,savedResume,release;
 const context=vm.createContext({crypto:webcrypto,URL,URLSearchParams,setTimeout,clearTimeout,Date,chrome:{runtime:{onMessage:{addListener(fn){listener=fn}},getManifest(){return{version:'1.0.9'}}},storage:{session:{async get(key){return{[key]:stored[key]}},async set(value){Object.assign(stored,value)},async remove(key){delete stored[key]}}},tabs:{async query(){return[{id:71,url:'https://portal.fiveringsfinancial.com/account/dashboard'}]},onUpdated:{addListener(){},removeListener(){}},async update(){},async get(){return{status:'complete',url:'https://portal.fiveringsfinancial.com/account/dashboard'}},async sendMessage(id,msg){savedResume=msg.resume;if(++requestCount===1)return{ok:false,error:'Temporary timeout',checkpoint:{owner:'agent@example.invalid',capturedAt:Date.now(),pages:[{url:'https://portal.fiveringsfinancial.com/account/clients/data',body:'{"data":[],"recordsTotal":0,"recordsFiltered":0}',contentType:'application/json'}]}};await new Promise(resolve=>release=resolve);return{ok:true,snapshot:{version:1}}}},scripting:{async executeScript(){return[{result:{query:'columns[0][data]=id'}}]}}}});
 vm.runInContext(code,context);const sender={tab:{id:10,url:'https://www.affinityfc.org/agent-five-rings-sync.html'},documentId:'doc'},request=message=>new Promise(resolve=>listener(message,sender,resolve));
 let started=await request({action:'collectStart',portalEmail:'agent@example.invalid'}),result;for(let i=0;i<20;i++){result=await request({action:'collectStatus',jobId:started.jobId});if(!result.processing)break;await new Promise(r=>setImmediate(r));}assert.equal(result.ok,false);assert.equal(result.checkpoint,undefined);assert(stored['affinity-five-rings-checkpoint']);
 started=await request({action:'collectStart',portalEmail:'agent@example.invalid'});for(let i=0;i<20&&!release;i++)await new Promise(r=>setImmediate(r));assert.equal(savedResume.owner,'agent@example.invalid');
 let foreignReply=false;listener({action:'readProgress',progress:{stage:'details',processed:1,total:3}},{tab:{id:72,url:'https://portal.fiveringsfinancial.com/account/dashboard'}},()=>foreignReply=true);assert.equal(foreignReply,false);
 listener({action:'readProgress',progress:{stage:'details',processed:1,total:3}},{tab:{id:71,url:'https://portal.fiveringsfinancial.com/account/dashboard'}},()=>{});
 result=await request({action:'collectStatus',jobId:started.jobId});assert.equal(result.progress.stage,'details');assert.equal(result.progress.processed,1);release();for(let i=0;i<20;i++){result=await request({action:'collectStatus',jobId:started.jobId});if(!result.processing)break;await new Promise(r=>setImmediate(r));}assert.equal(result.ok,true);assert.equal(stored['affinity-five-rings-checkpoint'],undefined);
});
