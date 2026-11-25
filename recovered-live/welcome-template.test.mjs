import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {welcomeTemplate,saveWelcomeTemplate,DEFAULT_WELCOME_MESSAGE} from './worker/welcome-template.js';
test('welcome edits persist per agent and retain default for other agents',async()=>{
 const sqlite=new DatabaseSync(':memory:');const db={prepare(sql){const stmt=sqlite.prepare(sql);let values=[];return {bind(...v){values=v;return this},async run(){return stmt.run(...values)},async first(){return stmt.get(...values)}}}};
 assert.equal((await welcomeTemplate(db,'OWNER@example.test')).message,DEFAULT_WELCOME_MESSAGE);
 await saveWelcomeTemplate(db,'OWNER@example.test','Welcome','Hello {nome}, policy {apolice numero}');
 assert.equal((await welcomeTemplate(db,'owner@example.test')).subject,'Welcome');assert.equal((await welcomeTemplate(db,'other@example.test')).message,DEFAULT_WELCOME_MESSAGE);
 sqlite.close();
});
