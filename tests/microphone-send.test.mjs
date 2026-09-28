import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import worker from '../recovered-live/worker/affinity-agent-whatsapp-portal.js';

const html=await (await worker.fetch(new Request('https://portal.test/agentes/whatsapp'),{PORTAL:{fetch:async()=>new Response('{}')}})).text();
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const tick=()=>new Promise(r=>setTimeout(r,30));
function setup({permission='ok',empty=false,failSend=false}={}){
 const nodes=new Map(),sent=[],tracks=[];let allow;
 function element(){const classes=new Set();return {value:'',textContent:'',hidden:false,disabled:false,files:[],dataset:{},style:{},classList:{toggle(c,on){if(on)classes.add(c);else classes.delete(c)},contains(c){return classes.has(c)}},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},children:[],focus(){},click(){},requestSubmit(){return this.onsubmit?.({preventDefault(){}})}};}
 const document={hidden:false,querySelector(q){if(!nodes.has(q))nodes.set(q,element());return nodes.get(q)},querySelectorAll(){return []}};
 const stream=()=>{const track={stopped:false,stop(){this.stopped=true}};tracks.push(track);return {getTracks:()=>[track]}};
 class Recorder{static isTypeSupported(t){return t.startsWith('audio/webm')}constructor(s,o){this.state='inactive';this.mimeType=o.mimeType}start(){this.state='recording'}stop(){this.state='inactive';setTimeout(()=>{this.ondataavailable?.({data:new Blob(empty?[]:['final-audio'],{type:this.mimeType})});this.onstop?.()},10)}}
 class Reader{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{setTimeout(()=>{this.result='data:audio/webm;base64,'+Buffer.from(bytes).toString('base64');this.onload()},5)})}}
 const context=vm.createContext({document,navigator:{mediaDevices:{getUserMedia:()=>permission==='denied'?Promise.reject(Object.assign(Error('denied'),{name:'NotAllowedError'})):permission==='wait'?new Promise(resolve=>allow=()=>resolve(stream())):Promise.resolve(stream())}},MediaRecorder:Recorder,Blob,FileReader:Reader,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},crypto:webcrypto,AbortController,setTimeout,clearTimeout,localStorage:{getItem:()=>null,setItem(){}},window:{MediaRecorder:Recorder,addEventListener(){}},console,fetch:async(url,opt)=>{if(url.endsWith('/send')){sent.push(JSON.parse(opt.body));return {ok:!failSend,json:async()=>failSend?{error:'test failure'}:{state:'sent'}}}return {ok:true,json:async()=>[]}}});
 vm.runInContext(script.slice(0,script.indexOf('const loadedContacts=await')),context);
 vm.runInContext("active='15555550101@c.us';loadMessages=async()=>{};",context);
 return {nodes,sent,tracks,context,allow:()=>allow(),mic:()=>nodes.get('#recordVoice').onclick(),submit:()=>nodes.get('#composer').onsubmit({preventDefault(){}}),cancel:()=>vm.runInContext('clearMedia()',context),change:()=>vm.runInContext("clearMedia();active='15555550102@c.us'",context)};
}
test('microphone precedes Send and exposes recording state without a text button',()=>{
 assert.match(html,/<button[^>]+id="recordVoice"[^>]+aria-label="Gravar áudio"/);
 assert(html.indexOf('id="recordVoice"')<html.indexOf('id="send"'));
 assert(!html.includes('>Gravar voz</button>'));
 assert.match(html,/\.mic\.recording svg\{animation:mic-blink/);
});
test('one Send click stops recording, awaits final audio, sends once, and releases microphone',async()=>{
 const h=setup();await h.mic();assert(h.nodes.get('#recordVoice').classList.contains('recording'));
 const sending=h.submit();await h.submit();assert.equal(h.sent.length,0);await sending;
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].media.data,Buffer.from('final-audio').toString('base64'));assert.equal(h.sent[0].media.kind,'audio');assert.equal(h.sent[0].chat,'15555550101@c.us');assert(h.tracks.every(t=>t.stopped));assert(!h.nodes.get('#recordVoice').classList.contains('recording'));
});
test('cancel or chat change discards late recording data without sending',async()=>{
 for(const action of ['cancel','change']){const h=setup();await h.mic();h[action]();await tick();await h.submit();assert.equal(h.sent.length,0);assert(h.tracks.every(t=>t.stopped));}
});
test('chat change while Send waits for final audio never sends to either chat',async()=>{
 const h=setup();await h.mic();const send=h.submit();h.change();await send;await tick();assert.equal(h.sent.length,0);
});
test('permission delay and denial do not leave recording active',async()=>{
 const h=setup({permission:'wait'});const pending=h.mic();h.change();h.allow();await pending;assert(h.tracks.every(t=>t.stopped));assert.equal(h.sent.length,0);
 const denied=setup({permission:'denied'});await denied.mic();assert.match(denied.nodes.get('#sendError').textContent,/Permita o microfone/);assert.equal(denied.nodes.get('#recordVoice').disabled,false);
});
test('empty recording never submits and a failed send retains the audio draft',async()=>{
 const empty=setup({empty:true});await empty.mic();await empty.submit();assert.equal(empty.sent.length,0);
 const failed=setup({failSend:true});await failed.mic();await failed.submit();assert.equal(failed.sent.length,1);assert.equal(failed.nodes.get('#mediaDraft').hidden,false);assert.match(failed.nodes.get('#sendError').textContent,/test failure/);
});
