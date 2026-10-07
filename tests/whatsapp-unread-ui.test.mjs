import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import portal from '../recovered-live/worker/affinity-agent-whatsapp-portal.js';
const {chromium}=await import(pathToFileURL('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);

test('only visible messages become read, failures retain badges, reads survive reload, and old conversations are scrollable',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}}),reads=new Set();let failReads=true;
  const html=await(await portal.fetch(new Request('https://fixture.test/'),{PORTAL:{fetch:async()=>Response.json({state:'ready'})}})).text();
  new vm.Script('(async()=>{'+html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1]+'})();');
  const messages=Array.from({length:60},(_,i)=>({id:'demo-'+i,body:'Mensagem fictícia '+i,direction:i%5===4?'sent':'received',stamp:1000+i,unread:i%5!==4,ack:3}));
  await page.route('https://fixture.test/**',async route=>{
   const request=route.request(),action=new URL(request.url()).pathname.split('/').at(-1);let data;
   if(action==='status')data={state:'ready',number:'15550000000'};
   else if(action==='contacts')data=[];
   else if(action==='chats')data=Array.from({length:90},(_,i)=>({chat:'1555000'+String(1000+i)+'@c.us',unread:i?0:messages.filter(m=>m.unread&&!reads.has(m.id)).length}));
   else if(action==='messages')data=messages.map(m=>({...m,unread:m.unread&&!reads.has(m.id)}));
   else if(action==='read'){
    if(failReads)return route.fulfill({status:503,json:{error:'Synthetic retryable failure'}});
    const {ids}=request.postDataJSON();ids.forEach(id=>reads.add(id));data={read:ids};
   }else return route.fulfill({contentType:'text/html',body:html});
   await route.fulfill({json:data});
  });
  await page.goto('https://fixture.test/');await page.locator('[data-chat="15550001000@c.us"]').click();
  await page.waitForTimeout(1300);
  assert.equal(await page.locator('[data-message-id="demo-58"]').getAttribute('data-unread'),'true');
  assert.equal(reads.size,0);
  failReads=false;await page.locator('[data-chat="15550001000@c.us"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-message-id="demo-58"]')?.dataset.unread==='false');
  assert.equal(await page.locator('[data-message-id="demo-0"]').getAttribute('data-unread'),'true');
  assert(!reads.has('demo-0'));assert(!reads.has('demo-59'));
  await page.locator('[data-chat="15550001089@c.us"]').click();
  assert(await page.locator('#chats').evaluate(node=>node.scrollTop>0&&node.scrollHeight>node.clientHeight));
  assert.equal(await page.locator('#chats').evaluate(node=>getComputedStyle(node).scrollbarWidth),'thin');
  await page.getByText('Mensagem fictícia 0',{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-message-id="demo-0"]')?.dataset.unread==='false');
  await page.reload();await page.locator('[data-chat="15550001000@c.us"]').click();
  assert.equal(await page.locator('[data-message-id="demo-0"]').getAttribute('data-unread'),'false');
  await page.setViewportSize({width:640,height:800});await page.locator('#menu').click();
  assert(await page.locator('.contacts').isVisible());await page.locator('[data-chat="15550001000@c.us"]').click();
  assert(await page.locator('.chat').isVisible());assert.equal(await page.locator('.contacts').isVisible(),false);
 }finally{await browser.close();}
});
