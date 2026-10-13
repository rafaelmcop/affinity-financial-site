const origin = 'https://whatsapp-bridge.affinityfc.org';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, origin);
    const headers = new Headers(request.headers);
    for (const name of ['host', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto', 'x-real-ip']) headers.delete(name);
    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
      signal: request.signal,
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      if(Number(request.headers.get('content-length'))>11500000)return Response.json({error:'Mensagem ou arquivo muito grande.'},{status:413});
      const chunks=[];let size=0;const reader=request.body?.getReader();
      if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>11500000){await reader.cancel();return Response.json({error:'Mensagem ou arquivo muito grande.'},{status:413});}chunks.push(value);}
      const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
      headers.delete('content-length');
      init.body = body;
    }
    try {
      const response = await fetch(target, init);
      console.log(JSON.stringify({event:'whatsapp_relay_response',method:request.method,path:incoming.pathname,status:response.status,type:response.headers.get('content-type')||'',length:response.headers.get('content-length')||''}));
      return response;
    } catch (error) {
      console.error(JSON.stringify({event:'whatsapp_relay_error',method:request.method,path:incoming.pathname,name:error?.name||'Error'}));
      throw error;
    }
  },
};
