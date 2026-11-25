// Local synthetic fixture only: no production accounts, credentials or messages.
import http from 'node:http';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import puppeteer from '../services/whatsapp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import portal from './worker/affinity-agent-whatsapp-portal.js';
const rows=Array.from({length:100},(_,i)=>({chat:String(16175550100+i)+'@c.us',label:'Contato fictício '+i,phone:'+'+(16175550100+i)}));
const server=http.createServer(async(req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p.endsWith('.js')||p.endsWith('.css')){try{res.setHeader('content-type',p.endsWith('.js')?'text/javascript':'text/css');res.end(readFileSync(new URL('./public'+p,import.meta.url)));}catch{res.statusCode=404;res.end();}return;}
 const data=p.endsWith('/status')?{state:'ready'}:p.endsWith('/chats')?rows:p.endsWith('/contacts')?[]:p.endsWith('/messages')?[]:null;
 if(data!==null){res.setHeader('content-type','application/json');res.end(JSON.stringify(data));return;}
 const r=await portal.fetch(new Request('https://fixture.test/agentes/whatsapp'),{PORTAL:{fetch:async()=>Response.json({state:'ready',features:['whatsapp'],theme:'light'})}});res.setHeader('content-type','text/html');res.end(await r.text());
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage();
 for(const [width,height] of [[1440,900],[820,700],[390,844]]){
  await page.setViewport({width,height});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.chat-row');if(width<=680)await page.click('#menu');
  const before=await page.$eval('#chats',el=>({height:el.clientHeight,total:el.scrollHeight,top:el.scrollTop}));assert(before.height>100);assert(before.total>before.height);
  await page.hover('#chats');await page.mouse.wheel({deltaY:10000});await page.waitForFunction(()=>document.querySelector('#chats').scrollTop>100);
  const after=await page.$eval('#chats',el=>({top:el.scrollTop,bottom:el.getBoundingClientRect().bottom}));assert(after.top>before.top);assert(after.bottom<=height+1);
  await page.focus('#chats');await page.keyboard.press('End');await page.waitForFunction(()=>{const e=document.querySelector('#chats');return e.scrollTop+e.clientHeight>=e.scrollHeight-2});
  assert(await page.$eval('#filter',e=>e.getBoundingClientRect().top>=0));
  console.log('PASS: mouse and keyboard scroll reach last conversation at '+width+'x'+height+'; search remains visible.');
 }
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
