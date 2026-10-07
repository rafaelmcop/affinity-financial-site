import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initializeReadState,rememberHistoricalRead,synchronizeUnread,markRead} from './read-state.mjs';
import {initializeContacts,rememberContact,listContacts} from './contacts.mjs';
test('old history is not invented as unread; confirmed unread and portal reads persist and stay owner-isolated',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE messages(owner TEXT,id TEXT,chat TEXT,direction TEXT,stamp INTEGER,PRIMARY KEY(owner,id));');
 const insert=db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)');insert.run('a','old','chat','received',10);insert.run('a','waiting','chat','received',20);insert.run('b','private','chat','received',30);
 initializeReadState(db,100);
 synchronizeUnread(db,'a',['chat'],1);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM messageReads WHERE owner='a'").get().n,1);
 assert.deepEqual(markRead(db,'a',['waiting','private']),['waiting']);
 synchronizeUnread(db,'a',['chat'],1);initializeReadState(db,200);
 assert.equal(db.prepare("SELECT source FROM messageReads WHERE owner='a' AND id='waiting'").get().source,'portal');
 insert.run('a','new','chat','received',101);rememberHistoricalRead(db,'a','new',101,'received');
 assert.equal(db.prepare("SELECT id FROM messageReads WHERE owner='a' AND id='new'").get(),undefined);
 db.close();
});

test('conversation counts merge confirmed aliases and update after reading without exposing another owner',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE messages(owner TEXT,id TEXT,chat TEXT,direction TEXT,stamp INTEGER,PRIMARY KEY(owner,id));');
 initializeContacts(db);initializeReadState(db,100);
 rememberContact(db,'a',{lid:'123456789012@lid',pn:'15550001000@c.us'});
 const insert=db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)');
 insert.run('a','one','15550001000@c.us','received',101);insert.run('a','two','123456789012@lid','received',102);insert.run('a','sent','15550001000@c.us','sent',103);insert.run('b','private','15550001000@c.us','received',104);
 assert.equal(listContacts(db,'a').length,1);assert.equal(listContacts(db,'a')[0].unread,2);
 markRead(db,'a',['two','private']);assert.equal(listContacts(db,'a')[0].unread,1);assert.equal(listContacts(db,'b')[0].unread,1);
 db.close();
});
