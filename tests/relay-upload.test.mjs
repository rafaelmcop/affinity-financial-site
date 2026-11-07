import test from 'node:test';
import assert from 'node:assert/strict';
import relay from '../recovered-live/worker/affinity-whatsapp-relay.js';

test('relay forwards fixed media bodies without changing JSON', async () => {
  const original = globalThis.fetch;
  try {
    for (const media of [
      {kind:'image',mime:'image/png',filename:'screen.png',data:'A'.repeat(180_000)},
      {kind:'audio',mime:'audio/webm;codecs=opus',filename:'voice.webm',data:'B'.repeat(120_000)},
      {kind:'file',mime:'application/pdf',filename:'document.pdf',data:'C'.repeat(140_000)},
      {kind:'file',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',filename:'sheet.xlsx',data:'D'.repeat(160_000)},
    ]) {
      const body = JSON.stringify({chat:'15551234567@c.us',text:'',requestId:'00000000-0000-4000-a000-000000000000',media});
      let forwarded;
      globalThis.fetch = async (url, init) => {
        forwarded = {url:String(url), method:init.method, headers:init.headers, body:await new Response(init.body).text()};
        return Response.json({state:'sent'});
      };
      const request = new Request('https://affinity-whatsapp-relay.example/send',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body});
      const response = await relay.fetch(request);
      assert.equal(response.status,200);
      assert.equal(forwarded.url,'https://whatsapp-bridge.affinityfc.org/send');
      assert.equal(forwarded.method,'POST');
      assert.equal(forwarded.headers.get('authorization'),'Bearer test');
      assert.deepEqual(JSON.parse(forwarded.body),JSON.parse(body));
    }
  } finally { globalThis.fetch = original; }
});

test('relay rejects oversized bodies before contacting the tunnel', async()=>{
  const original=globalThis.fetch;let called=false;
  try{
    globalThis.fetch=async()=>{called=true;return Response.json({ok:true})};
    const request=new Request('https://affinity-whatsapp-relay.example/send',{method:'POST',body:new Uint8Array(11500001)});
    const response=await relay.fetch(request);
    assert.equal(response.status,413);assert.equal(called,false);
  }finally{globalThis.fetch=original}
});
