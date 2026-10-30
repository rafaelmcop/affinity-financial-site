// Synthetic loopback fixtures only. No WhatsApp session or real send is used.
import http from 'node:http';import fs from 'node:fs';import assert from 'node:assert/strict';import puppeteer from '../services/whatsapp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import {renderWhatsAppPage} from './worker/affinity-agent-whatsapp-portal.js';import {renderAssistantWhatsAppPage} from './worker/assistant-whatsapp-page.js';
let posts=0,reads=0,holdMessages=false,expectedPrefix='/api/agent/whatsapp/';const sent=[];
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');const json=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/api/')){if(!url.pathname.startsWith(expectedPrefix))return json({error:'Wrong account endpoint'},403);const action=url.pathname.slice(expectedPrefix.length);
  if(action==='status')return json({state:'ready',number:'16175550199'});
  if(action==='contacts')return json([{id:1,name:'Synthetic Client',phone:'+16175550100'}]);
  if(action==='chats')return json([{chat:'16175550100@c.us',label:'Synthetic Client',phone:'+16175550100',stamp:1}]);
  if(action.startsWith('messages')){if(holdMessages&&posts)return;return json([]);}
  if(action==='send'){let body='';for await(const c of req)body+=c;sent.push(JSON.parse(body));posts++;return json({state:'pending'},202);}
  if(action==='send-status'){reads++;return json({state:reads%2?'pending':'sent',messageId:'synthetic-receipt'});}
  return json({});
 }
 if(url.pathname==='/fixture-dialog'){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><body><script type="module">import {openWhatsApp} from "/portal-interactions.js?v=11";window.result=openWhatsApp({phone:"16175550100",text:"Synthetic message only"});</script></body></html>');}
 if(url.pathname==='/fixture-chat'||url.pathname==='/fixture-assistant'){res.setHeader('content-type','text/html');return res.end(url.pathname==='/fixture-chat'?renderWhatsAppPage():renderAssistantWhatsAppPage());}
 if(['/portal-interactions.js','/whatsapp-send-receipt.js'].includes(url.pathname)){res.setHeader('content-type','application/javascript');return res.end(fs.readFileSync(new URL('./public'+url.pathname,import.meta.url)));}
 res.setHeader('content-type',url.pathname.endsWith('.css')?'text/css':'application/javascript');res.end('');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/fixture-dialog');await page.waitForSelector('[role="dialog"] button');await page.click('[role="dialog"] button');await page.click('[role="dialog"] button');await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.includes('Envio confirmado'));assert.equal(posts,1);assert.equal(reads,2);assert.equal(await page.$eval('[role="dialog"] button',b=>b.disabled),true);assert.equal(await page.$eval('textarea',a=>a.readOnly),true);
 console.log('PASS dialog: one POST, pending receipt recovered, confirmation visible, duplicate click blocked.');
 for(const assistant of [false,true]){posts=0;reads=0;holdMessages=true;expectedPrefix=assistant?'/api/assistants/communications/whatsapp/':'/api/agent/whatsapp/';await page.goto(base+(assistant?'/fixture-assistant':'/fixture-chat'));await page.waitForSelector('[data-chat]');await page.click('[data-chat]');await page.type('#text','Synthetic message only');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#sendError').textContent.includes('Mensagem enviada e confirmada'));assert.equal(posts,1);assert.equal(await page.$eval('#send',b=>b.disabled),false);assert.equal(await page.$eval('#text',a=>a.value),'');console.log('PASS '+(assistant?'assistant':'agent')+': confirmation and composer released while history refresh remains hung.');}
 assert.deepEqual(errors,[]);assert(sent.every(x=>x.manual===true));console.log('All browser fixtures passed; no real messages sent.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
