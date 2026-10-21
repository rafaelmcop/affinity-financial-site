// Local synthetic cases only; no live account or customer actions.
import http from 'node:http';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import puppeteer from '../services/whatsapp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
let grants=['view','edit','delete'],calls=[],reject=false;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),path=url.pathname;
 const json=data=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(data));};
 if(path==='/api/assistants/home')return json({ownerName:'Synthetic Agent',warnings:[],payments:[{id:1,title:'Synthetic payment notice'}],birthdays:null,meetings:null,resolutions:[],canCompletePayments:true,canDeletePayments:true});
 if(path==='/test-home'){res.setHeader('content-type','text/html');res.end('<main id=home></main><script type=module>import {loadAssistantHome} from "/assistant-home.js";loadAssistantHome(document.querySelector("#home"),()=>{});</script>');return;}
 if(path==='/api/assistants/me')return json({permissions:{tasks:grants,policies:[]}});
 if(path.endsWith('/payment-case'))return json({task:{id:1},candidate:{name:'Synthetic',policyNumber:'TEST'},identity:{displayName:'Davi Example',displayRole:'Segurado',responsibleName:'Cintia Example'},history:[],actionPermissions:{complete:grants.includes('edit'),delete:grants.includes('delete')}});
 if(path.endsWith('/notification-action')){let body='';for await(const c of req)body+=c;calls.push(JSON.parse(body));if(reject){res.statusCode=403;return json({error:'Synthetic rejected action'});}return json({ok:true});}
 if(path==='/assistentes/dashboard'||path==='/agentes/dashboard'){res.setHeader('content-type','text/html');res.end('<h1>Home fixture</h1>');return;}
 if(path==='/frame'){res.setHeader('content-type','text/html');res.end('<iframe src="/agent-payment-case.html?task=1&assistantView=1"></iframe>');return;}
 try{const file=path==='/agentes/caso-pagamento'?'/agent-payment-case.html':path;let body=readFileSync(new URL('./public'+file,import.meta.url),'utf8');if(file.endsWith('.html')){body=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');body=body.replace('</body>',(url.searchParams.has('assistantView')?'<script src="/assistant-page-adapter.js"></script>':'')+'<script src="/agent-payment-case.js"></script></body>');}res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(base+'/test-home');await page.waitForSelector('#home article button');assert.equal(await page.$$eval('#home article button',nodes=>nodes.length),1);assert.equal(await page.$eval('#home article button',x=>x.textContent),'Synthetic payment notice');
 for(const action of ['complete','archive']){
  await page.goto(base+'/frame');const frame=await page.waitForFrame(f=>f.url().includes('agent-payment-case.html'));await frame.waitForSelector(action==='complete'?'#resolve':'#delete',{visible:true});assert.equal(await frame.$eval('#content h2',x=>x.textContent),'Davi Example');assert((await frame.$eval('#content .grid',x=>x.textContent)).includes('Responsável pela apóliceCintia Example'));await frame.click(action==='complete'?'#resolve':'#delete');await frame.waitForSelector('dialog[open]');
  if(action==='archive'){assert(await frame.$eval('dialog button:last-child',x=>x.disabled));await frame.click('dialog input[type=checkbox]');await frame.type('dialog input[type=password]','synthetic-password');}
  await frame.click('dialog button:last-child');await page.waitForFunction(()=>location.pathname==='/assistentes/dashboard');assert.equal(calls.at(-1).action,action);assert.equal(calls.at(-1).confirmed,true);if(action==='archive')assert(calls.at(-1).acknowledged);
 }
 // Server rejection must keep the case open and show feedback.
 reject=true;await page.goto(base+'/agentes/caso-pagamento?task=1&assistantView=1');await page.waitForSelector('#resolve',{visible:true});await page.click('#resolve');await page.waitForSelector('dialog[open]');await page.click('dialog button:last-child');await page.waitForFunction(()=>document.querySelector('dialog [role=alert]').textContent.includes('rejected'));assert(new URL(page.url()).pathname.includes('caso-pagamento'));reject=false;
 // View-only users do not acquire edit/delete through the UI correction.
 grants=['view'];await page.reload();await page.waitForSelector('#resolve');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#delete')).display==='none'||document.querySelector('#delete').hidden);assert(await page.$eval('#resolve',x=>x.hidden||getComputedStyle(x).display==='none'));
 // Ordinary agent completion returns to the agent home.
 grants=['view','edit','delete'];await page.goto(base+'/agentes/caso-pagamento?task=1');await page.waitForSelector('#resolve',{visible:true});await page.click('#resolve');await page.waitForSelector('dialog[open]');await page.click('dialog button:last-child');await page.waitForFunction(()=>location.pathname==='/agentes/dashboard');
 console.log('PASS: assistant completion/deletion returns top frame home; delete visible with tasks grant, checkbox/password required; rejection stays on case; view-only restrictions; agent home redirect.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
