import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {parseMailAttachments} from '../recovered-live/worker/mail-attachments.js';
import {automationScope,preferenceToken,verifyPreferenceToken} from '../recovered-live/worker/automation-preferences.js';
import {parseFiveRingsCredits} from '../recovered-live/worker/five-rings-credits.js';
test('Attachments produce a real MIME message without accepting file paths or remote URLs',async()=>{
 const require=createRequire(import.meta.url),nodemailer=require('nodemailer');
 const attachments=parseMailAttachments([{filename:'../passport.pdf',content:Buffer.from('%PDF-test').toString('base64'),path:'/etc/passwd',href:'https://invalid.test'}]);
 assert.equal(attachments[0].filename,'passport.pdf');assert.equal(attachments[0].path,undefined);assert.equal(attachments[0].href,undefined);
 const output=await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail({from:'one@example.test',to:'two@example.test',subject:'Test',text:'Body',attachments});
 const mime=output.message.toString();assert.match(mime,/filename=passport.pdf/);assert.match(mime,/JVBERi10ZXN0/);
 assert.throws(()=>parseMailAttachments([{filename:'x',content:'bad'}]));
 assert.throws(()=>parseMailAttachments(Array(11).fill({filename:'x',content:'YQ=='})));
 assert.throws(()=>parseMailAttachments([{filename:'x',content:Buffer.alloc(10*1024*1024+1).toString('base64')}]));
});
test('Unsubscribe tokens are scoped to a recipient and campaign and reject changes',async()=>{
 const secret='test-private-key',payload={owner:'agent@example.test',clientId:123,email:'client@example.test',scope:'weekly_monday'};
 const token=await preferenceToken(secret,payload),value=await verifyPreferenceToken(secret,token);
 assert.equal(value.clientId,123);assert.equal(value.scope,'weekly_monday');
 await assert.rejects(verifyPreferenceToken('another-key',token));
 await assert.rejects(verifyPreferenceToken(secret,token.replace(/^./,'x')));
 assert.notEqual(automationScope({occasion:'monthly',monthNumber:9}),automationScope({occasion:'monthly',monthNumber:10}));
 assert.notEqual(automationScope({occasion:'custom',id:1}),automationScope({occasion:'custom',id:2}));
});
test('Credits separate rolling total from YTD and validate leadership arithmetic',()=>{
 const html='<div>Total Credits <small>Year to date</small>55,083 September 2026 784 <small>10/1/25 - 9/30/26</small>81,447</div><div>Leadership Retreat <small>8/1/26 - 7/31/27</small>12,021 Goal Remaining 85,000 72,979</div><h3>Scoreboards</h3>628';
 assert.deepEqual(parseFiveRingsCredits(html),{totalCredits:81447,leadershipCurrent:12021,leadershipGoal:85000,leadershipRemaining:72979});
 assert.throws(()=>parseFiveRingsCredits('<form>Sign in</form>'));
 assert.throws(()=>parseFiveRingsCredits(html.replace('72,979','20,000')));
 assert.throws(()=>parseFiveRingsCredits(html.replace('12,021','')));
});
