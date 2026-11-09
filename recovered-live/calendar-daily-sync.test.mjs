import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {claimDailyCalendarSync} from './worker/calendar-daily-sync.js';
test('automatic calendar sync is once per account per New York day across browser sessions',async()=>{
 const db=new DatabaseSync(':memory:');const env={DB:{prepare(sql){let values=[];return {bind(...args){values=args;return this;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}}}}}}};
 assert(await claimDailyCalendarSync(env,'ONE@example.test',new Date('2026-10-09T04:01:00Z')));
 assert(!await claimDailyCalendarSync(env,'one@example.test',new Date('2026-10-10T03:59:00Z')));
 assert(await claimDailyCalendarSync(env,'two@example.test',new Date('2026-10-10T03:59:00Z')));
 assert(await claimDailyCalendarSync(env,'one@example.test',new Date('2026-10-10T04:00:00Z')));
 assert(!await claimDailyCalendarSync(env,'one@example.test',new Date('2026-10-10T18:00:00Z')));
 db.close();
});
