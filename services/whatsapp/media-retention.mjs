import {readdirSync,statSync,unlinkSync} from 'node:fs';import path from 'node:path';
export const retentionSeconds=3*24*60*60;
export const mediaExpired=(stamp,now=Date.now())=>Number(stamp)>0&&Number(stamp)*1000<=now-retentionSeconds*1000;
export function pruneMedia(db,dir,now=Date.now()){
 let removed=0,bytes=0;const cutoff=Math.floor(now/1000)-retentionSeconds;
 const old=new Set(db.prepare('SELECT mediaKey FROM messages WHERE mediaKey IS NOT NULL AND stamp<=?').all(cutoff).map(r=>r.mediaKey));
 for(const key of readdirSync(dir)){if(!/^[a-f0-9]{64}$/.test(key))continue;const file=path.join(dir,key),stat=statSync(file);if(!stat.isFile()||(!old.has(key)&&stat.mtimeMs>now-retentionSeconds*1000))continue;unlinkSync(file);removed++;bytes+=stat.size;db.prepare("UPDATE messages SET mediaKey=NULL,mediaState='expired' WHERE mediaKey=?").run(key);}
 db.prepare("UPDATE messages SET mediaKey=NULL,mediaState='expired' WHERE mediaKey IS NOT NULL AND stamp<=?").run(cutoff);
 return {removed,bytes};
}
