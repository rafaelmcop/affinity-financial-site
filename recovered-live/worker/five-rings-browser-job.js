export async function claimBrowserChunk(env,owner,snapshot,total,now=Date.now()){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS fiveRingsBrowserSyncJobs(owner TEXT NOT NULL,fingerprint TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL,lease TEXT,leaseUntil INTEGER NOT NULL DEFAULT 0,updatedAt INTEGER NOT NULL,PRIMARY KEY(owner,fingerprint))').run();
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot)))),b=>b.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare('DELETE FROM fiveRingsBrowserSyncJobs WHERE updatedAt<?').bind(now-86400000).run();
 await env.DB.prepare('INSERT OR IGNORE INTO fiveRingsBrowserSyncJobs(owner,fingerprint,total,updatedAt) VALUES(?,?,?,?)').bind(owner,fingerprint,total,now).run();
 const token=crypto.randomUUID(),claimed=await env.DB.prepare('UPDATE fiveRingsBrowserSyncJobs SET lease=?,leaseUntil=?,updatedAt=? WHERE owner=? AND fingerprint=? AND leaseUntil<=?').bind(token,now+120000,now,owner,fingerprint,now).run();
 if(!claimed.meta?.changes)return {busy:true};const row=await env.DB.prepare('SELECT cursor,total FROM fiveRingsBrowserSyncJobs WHERE owner=? AND fingerprint=? AND lease=?').bind(owner,fingerprint,token).first();if(!row||Number(row.total)!==total)throw Error('Refaça a leitura do Five Rings.');return {owner,fingerprint,token,start:Number(row.cursor),end:Math.min(total,Number(row.cursor)+25),total};
}
export async function finishBrowserChunk(env,claim,success=true,counts={}){
 if(!claim||claim.busy)return;
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS fiveRingsBrowserChunkCounts(owner TEXT NOT NULL,fingerprint TEXT NOT NULL,chunkEnd INTEGER NOT NULL,clients INTEGER NOT NULL,policies INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(owner,fingerprint,chunkEnd))').run();
 if(success)await env.DB.prepare('INSERT OR IGNORE INTO fiveRingsBrowserChunkCounts(owner,fingerprint,chunkEnd,clients,policies,updated) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM fiveRingsBrowserSyncJobs WHERE owner=? AND fingerprint=? AND lease=?)').bind(claim.owner,claim.fingerprint,claim.end,Number(counts.clients||0),Number(counts.policies||0),Number(counts.updated||0),claim.owner,claim.fingerprint,claim.token).run();
 await env.DB.prepare('UPDATE fiveRingsBrowserSyncJobs SET cursor=?,lease=NULL,leaseUntil=0,updatedAt=? WHERE owner=? AND fingerprint=? AND lease=?').bind(success?claim.end:claim.start,Date.now(),claim.owner,claim.fingerprint,claim.token).run();
 return env.DB.prepare('SELECT coalesce(sum(clients),0) AS clients,coalesce(sum(policies),0) AS policies,coalesce(sum(updated),0) AS updated FROM fiveRingsBrowserChunkCounts WHERE owner=? AND fingerprint=?').bind(claim.owner,claim.fingerprint).first();
}
