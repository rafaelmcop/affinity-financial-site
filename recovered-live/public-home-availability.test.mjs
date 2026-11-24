import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {emailDefinitelyNotSent} from './worker/smtp-runtime.js';

const source=fs.readFileSync(new URL('./worker/current-worker.js',import.meta.url),'utf8');
test('the public homepage serves its static shell even if the private database is unavailable',async()=>{
 const start=source.indexOf(' // Serve the public homepage independently');
 const end=source.indexOf(' // The public portal landing page',start);
 const context=vm.createContext({
  Request,URL,
  secureResponse:response=>response,
  clearPortalSessions:response=>response,
  perimeterHeaders:response=>response,
  HTMLRewriter:class{on(){return this}transform(response){return response}}
 });
 const fetch=vm.runInContext('(async function(request,env){const url=new URL(request.url);'+source.slice(start,end)+'return null;})',context);
 let reads=0;
 const env={
  get DB(){throw Error('Database unavailable')},
  ASSETS:{async fetch(request){reads++;assert.equal(new URL(request.url).pathname,'/index.html');return new Response('<main>Public homepage</main>',{headers:{'content-type':'text/html'}})}}
 };
 for(const method of ['GET','HEAD']){
  const response=await fetch(new Request('https://www.affinityfc.org/',{method}),env);
  assert.equal(response.status,200);
 }
 assert.equal(reads,2);
 assert.equal(await fetch(new Request('https://www.affinityfc.org/admin/usuarios'),env),null);
});
test('scheduled maintenance has its email failure classifier available before background tasks are queued',async()=>{
 assert.match(source,/import \{runtimeSmtpOptions,emailDefinitelyNotSent\} from '\.\/smtp-runtime\.js'/);
 const start=source.indexOf('  async scheduled(controller, env, ctx) {');
 const end=source.indexOf('\n};\nasync function runFiveRingsSyncAsAgent',start);
 const jobs=[],noop=async()=>{},classifiers=[];
 const context=vm.createContext({
  console,emailDefinitelyNotSent,
  pendingCommunicationProgress:noop,contactBridge:noop,storeCentralContacts:noop,protectInternalContacts:noop,
  runApplicationLifecycle:async(_,services)=>{classifiers.push(services.definitelyNotSent);},
  flushWhatsappPolicies:noop,importConnectedWhatsapp:noop,runMeetingReminders:noop,meetingReminderServices:()=>({}),runEventReminders:noop,drainAgentDirectoryImports:noop,runAgentRelationshipAutomations:noop
 });
 const worker=vm.runInContext('({'+source.slice(start,end)+'})',context);
 await worker.scheduled({cron:'* * * * *'},{},{waitUntil:promise=>jobs.push(promise)});
 await Promise.all(jobs);
 assert.equal(classifiers[0],emailDefinitelyNotSent);
});
