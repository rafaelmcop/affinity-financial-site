import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];let sent=0,lastSend;
 page.setDefaultTimeout(5000);
 await page.addInitScript(()=>{
  const stream={getTracks:()=>[{stop(){}}]};
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>stream}});
  class FakeRecorder{static isTypeSupported(){return true;}constructor(_stream,options){this.mimeType=options?.mimeType||'audio/webm';this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([1,2,3])],{type:this.mimeType})});this.onstop?.();}}
  Object.defineProperty(window,'MediaRecorder',{value:FakeRecorder});
 });
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://whatsapp-ui.test/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/agentes/whatsapp')return route.fulfill({contentType:'text/html',body:fs.readFileSync(new URL('../../recovered-live/public/agent-whatsapp.html',import.meta.url),'utf8')});
  if(url.pathname==='/agent-whatsapp.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('../../recovered-live/public/agent-whatsapp.js',import.meta.url),'utf8')});
  if(url.pathname==='/whatsapp-phone.mjs')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('../../recovered-live/public/whatsapp-phone.mjs',import.meta.url),'utf8')});
  if(url.pathname==='/agent-unified-menu.js')return route.fulfill({contentType:'text/javascript',body:''});
  if(url.pathname.endsWith('/media'))return route.fulfill({contentType:url.searchParams.get('id')==='voice'?'audio/ogg':'image/png',body:Buffer.from([1,2,3])});
  let data={};
  if(url.pathname.endsWith('/contacts'))data=[];
  if(url.pathname.endsWith('/status'))data={state:'ready',number:'15555550100'};
  if(url.pathname.endsWith('/chats'))data=[{chat:'15555550101@c.us'}];
  if(url.pathname.endsWith('/messages'))data=[{id:'image',body:'Foto',direction:'received',stamp:1700000000,mediaKind:'image',filename:'foto.png',mediaUrl:'/api/agent/whatsapp/media?id=image'},{id:'voice',body:'[Áudio]',direction:'received',stamp:1700000001,mediaKind:'audio',mediaUrl:'/api/agent/whatsapp/media?id=voice'}];
  if(url.pathname.endsWith('/send')){sent++;lastSend=route.request().postDataJSON();data={state:'sent'};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('https://whatsapp-ui.test/agentes/whatsapp');
 await page.waitForTimeout(300);
 if(errors.length)throw Error('UI errors: '+errors.join('; '));
 if(!await page.locator('#chats button').count())throw Error('No chats rendered: '+await page.locator('body').innerText());
 await page.getByRole('button',{name:'+15555550101',exact:true}).click();
 await page.locator('#messages img').waitFor();await page.locator('#messages audio').waitFor();
 await page.getByLabel('Mensagem',{exact:true}).fill('Resposta de teste');
 await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
 await page.getByText('Mensagem enviada.',{exact:true}).waitFor();
 assert.equal(sent,1);
 await page.locator('#image').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from([1,2,3])});
 await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await page.getByText('Imagem enviada.',{exact:true}).waitFor();
 assert.equal(sent,2);assert.equal(lastSend.media.kind,'image');assert.equal(lastSend.media.mime,'image/png');assert.equal(lastSend.media.data,'AQID');
 await page.getByRole('button',{name:'Gravar voz',exact:true}).click();await page.getByText('Gravando…',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Parar gravação',exact:true}).click();await page.getByText(/Mensagem de voz pronta/).waitFor();
 await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await page.getByText('Mensagem de voz enviada.',{exact:true}).waitFor();
 assert.equal(sent,3);assert.equal(lastSend.media.kind,'audio');assert.match(lastSend.media.mime,/^audio\/ogg/);assert.equal(lastSend.media.data,'AQID');
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('PASS chat UI renders image/audio, uploads an image, records/sends voice through the mocked service, and fits mobile; no real message sent');
}finally{await browser.close();}
