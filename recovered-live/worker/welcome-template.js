export const DEFAULT_WELCOME_MESSAGE = `Ol\xE1, {nome}! \u{1F499}

Seja muito bem-vindo(a) \xE0 Affinity Financial Consulting. \xC9 uma satisfa\xE7\xE3o ter voc\xEA conosco.

Sua ap\xF3lice n\xBA {apolice numero} j\xE1 consta em nosso acompanhamento. A partir de agora, estaremos \xE0 disposi\xE7\xE3o para ajudar com d\xFAvidas, atualiza\xE7\xF5es e revis\xF5es sempre que precisar.

Salve nosso contato e conte comigo durante toda a sua jornada de prote\xE7\xE3o e planejamento financeiro.

{agente_nome}
\u{1F4DE} {agente_telefone}
Affinity Financial Consulting
\u{1F310} www.affinityfc.org`;;
export const DEFAULT_WELCOME_SUBJECT="Bem-vindo(a) à Affinity Financial Consulting";
async function ensure(db){await db.prepare("CREATE TABLE IF NOT EXISTS agentWelcomeTemplates(agentEmail TEXT PRIMARY KEY,subject TEXT NOT NULL,message TEXT NOT NULL,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)").run();}
export async function welcomeTemplate(db,owner){await ensure(db);return await db.prepare('SELECT subject,message FROM agentWelcomeTemplates WHERE agentEmail=?').bind(owner.toLowerCase()).first()||{subject:DEFAULT_WELCOME_SUBJECT,message:DEFAULT_WELCOME_MESSAGE};}
export async function saveWelcomeTemplate(db,owner,subject,message){await ensure(db);await db.prepare('INSERT INTO agentWelcomeTemplates(agentEmail,subject,message) VALUES(?,?,?) ON CONFLICT(agentEmail) DO UPDATE SET subject=excluded.subject,message=excluded.message,updatedAt=CURRENT_TIMESTAMP').bind(owner.toLowerCase(),subject,message).run();}
