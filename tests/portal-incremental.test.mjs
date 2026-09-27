import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const playwrightUrl=pathToFileURL('C:/Users/usraf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const {chromium}=await import(playwrightUrl.href);
const portal=(await import('../recovered-live/worker/affinity-agent-whatsapp-portal.js')).default;

test('polling appends messages without replacing an active audio player and renders PDFs safely',async()=>{
  const html=await (await portal.fetch(new Request('https://portal.test/agentes/whatsapp'),{PORTAL:{fetch:async()=>Response.json({state:'ready'})}})).text();
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage();
    const messageReads=new Map();
    let messages=[{id:'audio-1',body:'',direction:'received',stamp:1700000000,ack:0,mediaKind:'audio',mime:'audio/ogg',filename:'voice.ogg',mediaUrl:'/api/agent/whatsapp/media?id=audio-1'},{id:'pdf-1',body:'[Anexo]',direction:'received',stamp:1700000001,ack:0,mediaKind:'document',mime:'application/pdf',filename:'statement.pdf',mediaUrl:'/api/agent/whatsapp/media?id=pdf-1'},{id:'xls-1',body:'[Anexo]',direction:'received',stamp:1700000002,ack:0,mediaKind:'spreadsheet',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',filename:'sheet.xlsx',mediaUrl:'/api/agent/whatsapp/media?id=xls-1'},{id:'old-1',body:'[Anexo]',direction:'received',stamp:1700000003,ack:0}];
    await page.route('https://portal.test/agentes/whatsapp',route=>route.fulfill({contentType:'text/html',body:html}));
    await page.route('**/api/agent/whatsapp/**',async route=>{const u=new URL(route.request().url()),action=u.pathname.split('/').at(-1);if(action==='status')return route.fulfill({json:{state:'ready',number:'15551234567'}});if(action==='contacts')return route.fulfill({json:[]});if(action==='chats')return route.fulfill({json:[{chat:'15551234567@c.us'},{chat:'12345678901234@lid'},{chat:'22345678901234@lid'}]});if(action==='messages'){const chat=u.searchParams.get('chat');messageReads.set(chat,(messageReads.get(chat)||0)+1);return route.fulfill({json:chat==='15551234567@c.us'?messages:[]})}if(action==='media')return route.fulfill({status:200,contentType:u.searchParams.get('id')==='pdf-1'?'application/pdf':'audio/ogg',body:'media'});return route.fulfill({json:{state:'sent'}})});
    await page.goto('https://portal.test/agentes/whatsapp');
    await page.locator('[data-chat]').click();
    await page.locator('#messages audio').waitFor();
    await page.evaluate(()=>{window.savedAudio=document.querySelector('.message audio');window.savedAudio.currentTime=4;window.savedAudio.dataset.playing='yes'});
    await page.waitForTimeout(4300);
    assert.equal(await page.evaluate(()=>document.querySelector('.message audio')===window.savedAudio),true);
    assert.equal(await page.evaluate(()=>document.querySelector('.message audio').dataset.playing),'yes');
    assert.equal(await page.evaluate(()=>document.querySelector('.message audio').currentTime),4);
    const pdfLink=page.getByRole('link',{name:/statement\.pdf/});
    assert.equal(await pdfLink.getAttribute('href'),'/api/agent/whatsapp/media?id=pdf-1');
    assert.equal(await pdfLink.getAttribute('rel'),'noopener');
    assert.equal(await page.getByRole('link',{name:/sheet\.xlsx/}).getAttribute('download'),'sheet.xlsx');
    await page.getByText('Anexo antigo indisponível').waitFor();
    messages=[...messages,{id:'new-2',body:'Nova mensagem',direction:'received',stamp:1700000002,ack:0}];
    await page.getByText('Nova mensagem').waitFor({timeout:7000});
    assert.equal(await page.evaluate(()=>document.querySelector('.message audio')===window.savedAudio),true);
    assert.equal(messageReads.get('12345678901234@lid'),1);
    assert.equal(messageReads.get('22345678901234@lid'),1);
  }finally{await browser.close()}
});
