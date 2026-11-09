// Limits are per trusted Cloudflare source IP and per IP+account; no global
// account lockout that would let strangers block a specific employee.
export async function authenticationLimit(request,env,name,input){
 if(!['admin.login','agent.login','affiliate.login','passwordReset.requestReset'].includes(name))return false;
 const ip=request.headers.get('cf-connecting-ip');if(!ip)return false;
 const now=Date.now(),bucket=Math.floor(now/900000),identifier=String(input?.email||'').trim().toLowerCase().slice(0,254);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS authenticationLimits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expiresAt INTEGER NOT NULL)').run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS authenticationLimits_expiry ON authenticationLimits(expiresAt)').run();
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const prefix=name==='passwordReset.requestReset'?'reset':'login';
 const keys=await Promise.all([hash(prefix+':'+bucket+':'+ip),hash(prefix+':'+bucket+':'+ip+':'+identifier)]);
 for(let i=0;i<keys.length;i++){
  await env.DB.prepare('INSERT INTO authenticationLimits(key,attempts,expiresAt) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').bind(keys[i],(bucket+1)*900000).run();
  const row=await env.DB.prepare('SELECT attempts FROM authenticationLimits WHERE key=?').bind(keys[i]).first();
  if(Number(row?.attempts)>(prefix==='reset'?(i===0?20:5):(i===0?60:12)))return true;
 }
 await env.DB.prepare('DELETE FROM authenticationLimits WHERE expiresAt<?').bind(now-900000).run();
 return false;
}
