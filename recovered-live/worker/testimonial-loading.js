// Reuse translation work while public requests render promptly.
const pendingByDatabase = new WeakMap();
export async function loadPublishedTestimonials(rows, language, env, context, localize, deadline = 200) {
 if (rows.every(row => String(row.language ?? 'pt') === language)) return rows;
 let jobs = pendingByDatabase.get(env.DB);
 if (!jobs) { jobs = new Map(); pendingByDatabase.set(env.DB, jobs); }
 const key = JSON.stringify([language, rows]);
 let pending = jobs.get(key);
 if (!pending) {
  pending = Promise.resolve().then(() => localize(rows, language, env)).catch(() => rows);
  jobs.set(key, pending);
  pending.then(() => { if (jobs.get(key) === pending) jobs.delete(key); });
 }
 if (context?.waitUntil) context.waitUntil(pending);
 let timer;
 try {
  return await Promise.race([
   pending,
   new Promise(resolve => { timer = setTimeout(() => resolve(rows), deadline); })
  ]);
 } finally { clearTimeout(timer); }
}
