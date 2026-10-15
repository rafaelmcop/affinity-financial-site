import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mediaUpsert} from './media-record.mjs';
test('recovered attachments replace failed state and preserve owner isolation and successful media',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE messages(owner TEXT,id TEXT,chat TEXT,body TEXT,direction TEXT,stamp INTEGER,ack INTEGER,mediaKey TEXT,mime TEXT,filename TEXT,mediaKind TEXT,mediaSize INTEGER,mediaState TEXT,PRIMARY KEY(owner,id))');
 const write=(owner,key,mime,kind,state)=>db.prepare(mediaUpsert).run(owner,'message','chat','[Anexo]','received',1,1,key,mime,null,kind,10,state);
 write('a',null,null,'file','download_failed');
 write('b',null,null,'file','download_failed');
 write('a','stored-file','audio/ogg','audio','ready');
 let row=db.prepare("SELECT * FROM messages WHERE owner='a'").get();
 assert.equal(row.mediaState,'ready');assert.equal(row.mediaKind,'audio');assert.equal(row.mime,'audio/ogg');
 write('a',null,null,'file','unavailable');
 row=db.prepare("SELECT * FROM messages WHERE owner='a'").get();
 assert.equal(row.mediaState,'ready');assert.equal(row.mediaKind,'audio');assert.equal(row.mediaKey,'stored-file');
 assert.equal(db.prepare("SELECT mediaState FROM messages WHERE owner='b'").get().mediaState,'download_failed');
 db.close();
});
