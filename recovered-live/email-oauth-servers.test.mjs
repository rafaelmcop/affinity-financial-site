import test from 'node:test';
import assert from 'node:assert/strict';
import {oauthMailServers} from './worker/email-oauth.js';
test('personal Microsoft tenant uses Outlook.com SMTP while organizational mail uses Microsoft 365',()=>{
 assert.equal(oauthMailServers('microsoft',{tid:'9188040d-6c67-4c5b-b112-36a304b66dad'}).smtp,'smtp-mail.outlook.com');
 assert.equal(oauthMailServers('microsoft',{tid:'444c38a8-f7b5-4630-aa3c-3b575515db06'}).smtp,'smtp.office365.com');
 assert.equal(oauthMailServers('microsoft',{}).smtp,'smtp.office365.com');
 assert.equal(oauthMailServers('microsoft',{smtp:'attacker.invalid'}).imap,'outlook.office365.com');
 assert.equal(oauthMailServers('google',{}).smtp,'smtp.gmail.com');
 assert.throws(()=>oauthMailServers('untrusted',{}));
});
