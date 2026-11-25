import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const source=readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');const start=source.indexOf("    if(name==='agent.sendApplicationWhatsApp')"),end=source.indexOf('    if (name === "agent.sendApplicationEmail")',start);
test('application WhatsApp requires confirmation and uses only the authenticated owner and saved application recipient',async()=>{
 let app={id:5,clientPhone:'12025550100'},sends=[],reads=0;
 const owner='agent@example.invalid',context=vm.createContext({name:'agent.sendApplicationWhatsApp',owner,hasFeature:async()=>true,trpcError:message=>({error:message}),trpcResult:value=>value,matchedClient:()=>null,syncWhatsappAudit:async()=>{},console,sendMeetingMessage:async(...args)=>{sends.push(args);return{alreadySent:false}},env:{DB:{prepare(){return{bind(id,email){assert(email===owner||id===owner);return this},async first(){reads++;return app},async all(){return{results:[]}}}}}}});
 vm.runInContext('async function run(input){'+source.slice(start,end)+'}',context);
 assert((await context.run({applicationId:5,message:'Teste'})).error);assert.equal(reads,0);
 assert.equal((await context.run({applicationId:5,confirmed:true,message:'Teste',phone:'9999999999',requestId:'synthetic'})).success,true);
 assert.equal(sends[0][1],owner);assert.equal(sends[0][2].inviteePhone,'12025550100');assert.equal(sends[0][2].id,-5);assert.equal(sends[0][3].confirmed,true);
 app=null;assert((await context.run({applicationId:99,confirmed:true,message:'Teste'})).error);assert.equal(sends.length,1);
});
