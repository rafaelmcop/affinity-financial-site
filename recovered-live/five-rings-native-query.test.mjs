import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../integrations/five-rings-browser/background.js',import.meta.url),'utf8');
test('native table read exports only matching table columns/order, closes temporary tabs and preserves useful errors',async()=>{
 let listener,closed=[],sent,query;
 const table={ajax:{url:'/account/clients/data'},oAjaxData:{columns:[{data:'actual_name',name:'clients.name',searchable:true,orderable:true,search:{value:'private search'}}],order:[{column:0,dir:'asc'}],csrf:'never-export'}};
 const context=vm.createContext({URL,URLSearchParams,setTimeout,clearTimeout,Date,location:{origin:'https://portal.fiveringsfinancial.com',pathname:'/account/clients'},window:{jQuery:{fn:{dataTable:{settings:[table]}}}},chrome:{runtime:{onMessage:{addListener(fn){listener=fn}},getManifest(){return{version:'1.0.3'}}},tabs:{async query(){return[{id:1}]},async create(){return{id:2}},onUpdated:{addListener(){},removeListener(){}},async get(){return{status:'complete'}},async remove(id){closed.push(id)},async sendMessage(id,msg){sent=msg;return{ok:true}}},scripting:{async executeScript(options){assert.equal(options.world,'MAIN');context.location.pathname='/account/'+options.args[0];context.location.href=context.location.origin+context.location.pathname;table.ajax.url=context.location.pathname+'/data';const result=await options.func(...options.args);query=result.query;return[{result}];}}}});
 vm.runInContext(code,context);
 const result=await new Promise(resolve=>listener({action:'collect',portalEmail:'synthetic@example.invalid',manualConfirmed:true},{tab:{url:'https://www.affinityfc.org/agent-five-rings-sync.html'}},resolve));
 assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(closed,[2,2]);
 assert.equal(new URLSearchParams(query).get('columns[0][name]'),'clients.name');
 assert.equal(new URLSearchParams(query).get('order[0][dir]'),'asc');
 assert(!query.includes('private'));assert(!query.includes('csrf'));assert(sent.queries.clients&&sent.queries.policies);
 let invalidReply=false;assert.equal(listener({action:'collect'},{tab:{url:'https://evil.invalid/'}},()=>invalidReply=true),undefined);assert.equal(invalidReply,false);
 table.ajax.url='https://evil.invalid/account/clients/data';
 // Exercise the error path without waiting for a missing-table timeout.
 context.chrome.scripting.executeScript=async()=>[{result:{error:'Native table unavailable'}}];
 const failed=await new Promise(resolve=>listener({action:'collect'},{tab:{url:'https://www.affinityfc.org/'}},resolve));
 assert.equal(failed.error,'Native table unavailable');assert.equal(closed.length,3);
});
