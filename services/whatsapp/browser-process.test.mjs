import test from 'node:test';import assert from 'node:assert/strict';import {profileProcesses} from './browser-process.mjs';
test('orphan recovery only targets exact owned bridge profiles, never ordinary Chrome or another owner',()=>{
 const executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',profile='/private/bridge/session-abc',uid=501;
 const lines=[`501 11 ${executable} --user-data-dir=${profile} --headless=new`,`501 12 ${executable} --user-data-dir=${profile}-other --headless=new`,`502 13 ${executable} --user-data-dir=${profile} --headless=new`,`501 14 ${executable} --user-data-dir=/ordinary/profile --headless=new`,`501 15 ${executable} --type=renderer --user-data-dir=${profile}`,`501 16 /tmp/other --user-data-dir=${profile}`].join('\n');
 assert.deepEqual(profileProcesses(lines,{executable,profile,uid}),[11]);
});
