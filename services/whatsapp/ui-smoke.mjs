import fs from 'node:fs';
import {chromium} from '/Users/rafael/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];let sent=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://whatsapp-ui.test/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/agentes/whatsapp')return route.fulfill({contentType:'text/html',body:fs.readFileSync(new URL('../../recovered-live/public/agent-whatsapp.html',import.meta.url),'utf8')});
  if(url.pathname==='/agent-whatsapp.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('../../recovered-live/public/agent-whatsapp.js',import.meta.url),'utf8')});
  if(url.pathname==='/agent-unified-menu.js')return route.fulfill({contentType:'text/javascript',body:''});
  let data={};
  if(url.pathname.endsWith('/status'))data={state:'ready',number:'15555550100'};
  if(url.pathname.endsWith('/chats'))data=[{chat:'15555550101@c.us'}];
  if(url.pathname.endsWith('/messages'))data=[{body:'Mensagem de teste',direction:'received',stamp:1700000000}];
  if(url.pathname.endsWith('/send')){sent++;data={state:'sent'};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('https://whatsapp-ui.test/agentes/whatsapp');
 await page.getByRole('button',{name:'15555550101',exact:true}).click();
 await page.locator('#messages article').filter({hasText:'Mensagem de teste'}).waitFor();
 await page.getByLabel('Mensagem',{exact:true}).fill('Resposta de teste');
 await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
 await page.getByText('Mensagem enviada.',{exact:true}).waitFor();
 assert.equal(sent,1);
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('PASS chat UI opens, sends once through mocked service, and fits mobile; no real message sent');
}finally{await browser.close();}
