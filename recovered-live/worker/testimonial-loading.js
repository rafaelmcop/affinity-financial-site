import {isVideoTestimonial} from '../public/testimonial-kind.js';
// Cache plain results and short-lived leases, never a Promise from another
// request. Workers cannot await I/O owned by an invocation that has ended.
const workByDatabase = new WeakMap();
const leaseMs = 30000, resultMs = 60000, maxEntries = 12;
export async function loadPublishedTestimonials(rows, language, env, context, localize, deadline = 200) {
 rows = rows.filter(row => !isVideoTestimonial(row) || String(row.language ?? 'pt') === language);
 if (rows.every(row => String(row.language ?? 'pt') === language)) return rows;
 let jobs = workByDatabase.get(env.DB);
 if (!jobs) { jobs = new Map(); workByDatabase.set(env.DB, jobs); }
 const key = JSON.stringify([language, rows]), now = Date.now();
 for (const [id,entry] of jobs) if (entry.expires <= now) jobs.delete(id);
 const existing = jobs.get(key);
 if (existing) return existing.rows ?? rows;
 while (jobs.size >= maxEntries) jobs.delete(jobs.keys().next().value);
 const entry = {expires: now + leaseMs, rows: null};
 jobs.set(key,entry);
 const pending = Promise.resolve().then(() => localize(rows, language, env)).then(result => {
  if (jobs.get(key) === entry) {entry.rows = result; entry.expires = Date.now() + resultMs;}
  return result;
 }, () => {if (jobs.get(key) === entry) jobs.delete(key); return rows;});
 if (context?.waitUntil) context.waitUntil(pending);
 let timer;
 try {
  return await Promise.race([
   pending,
   new Promise(resolve => { timer = setTimeout(() => resolve(rows), deadline); })
  ]);
 } finally { clearTimeout(timer); }
}
