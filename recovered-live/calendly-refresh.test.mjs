import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function syncCalendlyForAgent('),source.indexOf('__name(syncCalendlyForAgent'));
for(const status of ['active','canceled'])test('existing meeting with phone refreshes changed Calendly data: '+status,async()=>{
 const writes=[];const event={uri:'https://api.calendly.com/scheduled_events/test',name:'Updated appointment',start_time:new Date(Date.now()+3600000).toISOString(),end_time:new Date(Date.now()+7200000).toISOString(),status,location:{join_url:'https://example.test/new-meeting'}};
 const invitee={uri:'https://api.calendly.com/scheduled_events/test/invitees/person',name:'Updated name',email:'client@example.test',text_reminder_number:'+15555550100',status:'active'};
 const env={JWT_SECRET:'test',DB:{prepare(sql){let values;return {bind(...args){values=args;return this},async first(){if(sql.includes('agentCalendlyConnections'))return {encryptedToken:'test',userUri:'test'};return {id:1}},async all(){return {results:[{eventUri:event.uri,inviteeUri:invitee.uri}]}},async run(){writes.push({sql,values});return {meta:{changes:0}}}}}}};
 const sync=new Function('ensureCalendlyTables','backfillStoredCalendlyPhones','mergeClientSourcesForAgent','decryptSmtpPassword','calendlyRequest','calendlyUuid','calendlyPhoneFromAnswers','calendlyPhoneFrom',body+';return syncCalendlyForAgent;')(async()=>{},async()=>0,async()=>({}),async()=>'',async(token,path)=>path.startsWith('/scheduled_events?')?{collection:[event]}:path.endsWith('/person')?{resource:invitee}:{collection:[invitee]},uri=>uri.split('/').pop(),()=>'',()=> '');
 const result=await sync(env,'agent@example.test',{backfill:true});assert.equal(result.saved,1);
 const meeting=writes.find(row=>row.sql.startsWith('INSERT INTO calendlyMeetings'));assert.ok(meeting);assert.equal(meeting.values[3],'Updated appointment');assert.equal(meeting.values[4],'Updated name');assert.equal(meeting.values[9],status);assert.equal(meeting.values[11],'https://example.test/new-meeting');
});
