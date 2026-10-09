import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

test('fresh bridge blocks sends, isolates attachments and preserves SQLite across process restart',async()=>{
  const directory=mkdtempSync(path.join(tmpdir(),'affinity-bridge-test-'));
  const secret='synthetic-test-secret-with-at-least-32-characters';
  let child;
  const start=async()=>{
    child=spawn(process.execPath,[path.join(import.meta.dirname,'server.mjs')],{env:{...process.env,WHATSAPP_BRIDGE_SECRET:secret,WHATSAPP_DATA_DIR:directory,WHATSAPP_SEND_ENABLED:'false',HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe']});
    const port=await new Promise((resolve,reject)=>{
      let output='';const timer=setTimeout(()=>reject(Error('Startup timeout')),15000);
      child.on('error',error=>{clearTimeout(timer);reject(error);});
      child.on('exit',code=>{clearTimeout(timer);reject(Error('Unexpected exit '+code));});
      child.stdout.on('data',chunk=>{output+=chunk;for(const line of output.split('\n'))try{const event=JSON.parse(line);if(event.port){clearTimeout(timer);resolve(event.port);}}catch{}});
    });
    return 'http://127.0.0.1:'+port;
  };
  const stop=()=>new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});
  const ticket=owner=>{const p=Buffer.from(JSON.stringify({aud:'affinity-whatsapp',owner,exp:Math.floor(Date.now()/1000)+60})).toString('base64url');return p+'.'+createHmac('sha256',secret).update(p).digest('base64url');};
  const request=(base,route,owner='one@example.test',options={})=>fetch(base+route,{...options,headers:{authorization:'Bearer '+ticket(owner),...options.headers}});
  try{
    let base=await start();
    assert.equal((await fetch(base+'/status')).status,401);
    assert.equal((await request(base,'/send',undefined,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,403);
    const db=new DatabaseSync(path.join(directory,'history.sqlite'));
    try{
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM messages').get().n,0);
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
      const key='a'.repeat(64);mkdirSync(path.join(directory,'media'),{recursive:true});writeFileSync(path.join(directory,'media',key),Buffer.from([1,2,3,4]));
      db.prepare('INSERT INTO messages(owner,id,chat,body,direction,stamp,mediaKey,mime,filename,mediaKind,mediaState) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('one@example.test','synthetic-media','123456789@c.us','','received',1,key,'audio/ogg',null,'audio','ready');
      db.prepare('INSERT INTO messages(owner,id,chat,body,direction,stamp,mediaKind) VALUES(?,?,?,?,?,?,?)').run('one@example.test','legacy-text','123456789@c.us','Texto simples','received',2,'file');
    }finally{db.close();}
    assert.equal((await request(base,'/media?id=synthetic-media','two@example.test')).status,404);
    const range=await request(base,'/media?id=synthetic-media',undefined,{headers:{range:'bytes=1-2'}});
    assert.match(range.headers.get('content-disposition'),/arquivo\.ogg/);
    const messages=await (await request(base,'/messages?chat=123456789%40c.us')).json();
    assert.equal(messages.find(x=>x.id==='legacy-text').mediaUrl,null);assert.equal(messages.find(x=>x.id==='legacy-text').mediaKind,null);
    assert.ok(messages.find(x=>x.id==='synthetic-media').mediaUrl);assert.equal('mediaKey' in messages[0],false);
    assert.equal(range.status,206);assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[2,3]);
    const suffix=await request(base,'/media?id=synthetic-media',undefined,{headers:{range:'bytes=-2'}});
    assert.equal(suffix.status,206);assert.equal(suffix.headers.get('content-range'),'bytes 2-3/4');assert.deepEqual([...new Uint8Array(await suffix.arrayBuffer())],[3,4]);
    for(const value of ['bytes=-0','bytes=9-10','bytes=','bytes=0-1,2-3'])assert.equal((await request(base,'/media?id=synthetic-media',undefined,{headers:{range:value}})).status,416);
    await stop();base=await start();
    assert.deepEqual([...new Uint8Array(await(await request(base,'/media?id=synthetic-media')).arrayBuffer())],[1,2,3,4]);
    assert.equal((await request(base,'/send',undefined,{method:'POST',body:'{}'})).status,403);
    await stop();
  }finally{if(child?.exitCode===null)child.kill('SIGKILL');rmSync(directory,{recursive:true,force:true});}
});
