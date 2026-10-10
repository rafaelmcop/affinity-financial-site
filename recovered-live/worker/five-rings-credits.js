const SCHEMA='CREATE TABLE IF NOT EXISTS agentFiveRingsCredits(agentEmail TEXT PRIMARY KEY,totalCredits INTEGER NOT NULL,leadershipCurrent INTEGER NOT NULL,leadershipGoal INTEGER NOT NULL,leadershipRemaining INTEGER NOT NULL,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)';
export function parseFiveRingsCredits(html){
 const text=String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp);/g,' ').replace(/\s+/g,' ');
 const totalAt=text.search(/\btotal\s+credits\b/i),leaderAt=text.search(/\bleadership\s*(?:retreat)?\b/i);
 if(totalAt<0||leaderAt<=totalAt)throw Error('Os cartões de créditos não foram encontrados no painel Five Rings.');
 const numbers=value=>value.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,' ').replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/gi,' ').match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b/g)?.map(n=>Math.round(Number(n.replaceAll(',',''))))||[];
 const total=numbers(text.slice(totalAt,leaderAt));
 const leaderText=text.slice(leaderAt).split(/scoreboards?|life policies|annuity policies|new recruits/i)[0];
 const leader=numbers(leaderText);
 if(!total.length||leader.length!==3)throw Error('A Five Rings não retornou todos os valores dos cartões.');
 const [current,goal,remaining]=leader;
 if(current<0||goal<=0||remaining<0||Math.abs(Math.max(0,goal-current)-remaining)>1)throw Error('Os valores de Leadership retornados precisam ser conferidos.');
 return {totalCredits:total.at(-1),leadershipCurrent:current,leadershipGoal:goal,leadershipRemaining:remaining};
}
export async function cachedFiveRingsCredits(db,owner){
 try{return await db.prepare('SELECT totalCredits,leadershipCurrent,leadershipGoal,leadershipRemaining,updatedAt FROM agentFiveRingsCredits WHERE agentEmail=?').bind(owner).first();}catch(e){if(String(e).includes('no such table'))return null;throw e;}
}
export async function refreshFiveRingsCredits(env,owner,session,fetchPortal){
 const response=await fetchPortal('https://portal.fiveringsfinancial.com/account/dashboard',{headers:{cookie:session.cookies},redirect:'follow'},12000);
 if(!response.ok)throw Error('Não foi possível consultar os créditos no Five Rings.');
 const values=parseFiveRingsCredits(await response.text());
 await env.DB.prepare(SCHEMA).run();
 await env.DB.prepare('INSERT INTO agentFiveRingsCredits(agentEmail,totalCredits,leadershipCurrent,leadershipGoal,leadershipRemaining) VALUES(?,?,?,?,?) ON CONFLICT(agentEmail) DO UPDATE SET totalCredits=excluded.totalCredits,leadershipCurrent=excluded.leadershipCurrent,leadershipGoal=excluded.leadershipGoal,leadershipRemaining=excluded.leadershipRemaining,updatedAt=CURRENT_TIMESTAMP').bind(owner,values.totalCredits,values.leadershipCurrent,values.leadershipGoal,values.leadershipRemaining).run();
 return cachedFiveRingsCredits(env.DB,owner);
}
