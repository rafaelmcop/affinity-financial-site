import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import portal from '../recovered-live/worker/affinity-agent-whatsapp-portal.js';
const {chromium} = await import(pathToFileURL('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);

test('portal never downloads JSON errors, and downloads successful PDFs', async () => {
  const html = await (await portal.fetch(new Request('https://portal.test/agentes/whatsapp'), {PORTAL:{fetch:async()=>Response.json({state:'ready'})}})).text();
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page = await browser.newPage({acceptDownloads:true});
    let status = 404, sendCalls = 0, downloads = 0;
    const scriptErrors = [];
    page.on('pageerror', error => scriptErrors.push(error.message));
    page.on('download', () => downloads++);
    await page.route('https://portal.test/agentes/whatsapp', route => route.fulfill({contentType:'text/html',body:html}));
    await page.route('**/api/agent/whatsapp/**', route => {
      const action = new URL(route.request().url()).pathname.split('/').at(-1);
      if (action === 'status') return route.fulfill({json:{state:'ready'}});
      if (action === 'contacts') return route.fulfill({json:[]});
      if (action === 'chats') return route.fulfill({json:[{chat:'15555550123@c.us'}]});
      if (action === 'messages') return route.fulfill({json:[{id:'pdf',stamp:1,direction:'received',mediaKind:'document',mime:'application/pdf',filename:'test.pdf',mediaState:'ready',mediaUrl:'/api/agent/whatsapp/media?id=pdf'}]});
      if (action === 'send') sendCalls++;
      if (action === 'media') return status === 206
        ? route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'})
        : route.fulfill({status,json:{error:'Anexo indisponível no teste.'}});
      return route.fulfill({json:{}});
    });
    await page.goto('https://portal.test/agentes/whatsapp');
    await page.locator('[data-chat]').click();
    const link = page.getByRole('link',{name:'Baixar PDF'});
    for (const code of [404,401,200]) {
      status = code;
      await link.click();
      await page.getByText('Anexo indisponível no teste.',{exact:true}).waitFor();
      assert.equal(downloads,0);
    }
    status = 206;
    const successfulDownload = page.waitForEvent('download');
    await link.click();
    assert.equal((await successfulDownload).suggestedFilename(),'test.pdf');
    assert.equal(downloads,1);
    assert.equal(sendCalls,0);
    assert.deepEqual(scriptErrors,[]);
  } finally { await browser.close(); }
});
