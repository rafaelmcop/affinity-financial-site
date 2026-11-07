// Only newly due recurring campaigns enter this continuation queue.
// Existing delivery history is not backfilled or retried implicitly.
export async function automationCycle(env,message,day,due){
 if(!['monthly','weekly_monday'].includes(message.occasion))return null;
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS automationRuns(messageId INTEGER NOT NULL,sentKey TEXT NOT NULL,originDay TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,createdAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(messageId,sentKey))').run();
 if(due){const [year,month]=day.split('-');const key=message.occasion==='monthly'?`monthly-${year}-${Number(month)}`:`weekly-monday-${day}`;await env.DB.prepare('INSERT OR IGNORE INTO automationRuns(messageId,sentKey,originDay) VALUES(?,?,?)').bind(Number(message.id),key,day).run();}
 return env.DB.prepare('SELECT sentKey,originDay FROM automationRuns WHERE messageId=? AND completed=0 ORDER BY originDay LIMIT 1').bind(Number(message.id)).first();
}
export async function completeAutomationCycle(env,messageId,key){await env.DB.prepare('UPDATE automationRuns SET completed=1 WHERE messageId=? AND sentKey=?').bind(Number(messageId),key).run();}
