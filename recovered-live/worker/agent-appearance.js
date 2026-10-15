export async function agentAppearance(env,owner,input){
await env.DB.prepare("CREATE TABLE IF NOT EXISTS agentAppearance(owner TEXT PRIMARY KEY,theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light','dark')),updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)").run();
if(input!==undefined){if(!['light','dark'].includes(input.theme))throw Error('Escolha o tema claro ou escuro.');await env.DB.prepare('INSERT INTO agentAppearance(owner,theme) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET theme=excluded.theme,updatedAt=CURRENT_TIMESTAMP').bind(owner,input.theme).run();}
return {theme:(await env.DB.prepare('SELECT theme FROM agentAppearance WHERE owner=?').bind(owner).first())?.theme||'light'};
}
