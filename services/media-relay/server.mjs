import http from 'node:http';
import {createRelay} from './core.mjs';
const relay=createRelay({accessKey:process.env.MEDIA_RELAY_ACCESS_KEY,providers:(process.env.MEDIA_RELAY_PROVIDERS||'dsaasd.online').split(','),...(process.env.MEDIA_RELAY_ORIGINS?{origins:process.env.MEDIA_RELAY_ORIGINS.split(',')}:{})});
const server=http.createServer((req,res)=>void relay.handler(req,res));server.requestTimeout=35000;server.headersTimeout=10000;server.maxHeadersCount=40;server.listen(Number(process.env.MEDIA_RELAY_PORT||60994),'127.0.0.1',()=>console.log('Media relay listening on loopback only'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{relay.close();server.close(()=>process.exit());});
