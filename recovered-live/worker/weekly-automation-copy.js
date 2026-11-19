function mondayMessageVariation(year, month, day) {
  const seed = Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 6048e5);
  const openings = [
    "Uma nova semana come\xE7a trazendo novas oportunidades para avan\xE7ar com tranquilidade e confian\xE7a.",
    "Que esta segunda-feira renove sua energia e abra espa\xE7o para uma semana cheia de boas possibilidades.",
    "Come\xE7ar a semana \xE9 tamb\xE9m uma nova chance de cuidar dos planos, dos sonhos e de quem mais importa.",
    "Que a manh\xE3 de hoje traga clareza, disposi\xE7\xE3o e bons motivos para acreditar em uma \xF3tima semana.",
    "Toda segunda-feira \xE9 um convite para recome\xE7ar com esperan\xE7a, coragem e pensamentos positivos.",
    "Uma nova semana est\xE1 diante de n\xF3s: que ela venha com leveza, progresso e momentos especiais.",
    "Que esta segunda-feira seja o primeiro passo de uma semana produtiva, serena e cheia de conquistas.",
    "Hoje come\xE7a mais uma oportunidade de transformar pequenos passos em grandes resultados.",
    "Que sua semana comece com paz no cora\xE7\xE3o, foco nos objetivos e confian\xE7a no caminho.",
    "Segunda-feira chegou, trazendo uma p\xE1gina nova para construir uma semana muito especial.",
    "Que o in\xEDcio desta semana venha acompanhado de boas ideias, energia renovada e tranquilidade.",
    "Mais uma semana come\xE7a, e desejamos que cada dia traga motivos para sorrir e seguir em frente."
  ];
  const encouragements = [
    "Siga no seu ritmo: const\xE2ncia e boas escolhas constroem resultados duradouros.",
    "N\xE3o \xE9 preciso fazer tudo de uma vez; cada passo dado com prop\xF3sito j\xE1 \xE9 uma conquista.",
    "Confie no processo, valorize o que j\xE1 conquistou e continue construindo o futuro que deseja.",
    "Que voc\xEA encontre equil\xEDbrio para cuidar das prioridades e aproveitar os bons momentos.",
    "Grandes planos come\xE7am com decis\xF5es simples e consistentes tomadas ao longo do caminho.",
    "Leve para esta semana a certeza de que dedica\xE7\xE3o, paci\xEAncia e planejamento fazem diferen\xE7a.",
    "Que os desafios se transformem em aprendizado e as oportunidades em belas conquistas.",
    "Reserve tamb\xE9m um momento para respirar, agradecer e reconhecer tudo o que j\xE1 avan\xE7ou.",
    "Que n\xE3o faltem coragem para come\xE7ar, sabedoria para decidir e serenidade para continuar.",
    "Uma semana bem vivida come\xE7a com inten\xE7\xE3o, cuidado e espa\xE7o para aquilo que realmente importa.",
    "Acredite nas possibilidades desta semana e celebre cada progresso, mesmo os menores.",
    "Que seus objetivos ganhem for\xE7a e que voc\xEA encontre apoio sempre que precisar."
  ];
  const closings = [
    "Desejamos uma semana leve, produtiva e repleta de boas not\xEDcias.",
    "Que seja uma semana de paz, sa\xFAde, prosperidade e bons encontros.",
    "Desejamos dias positivos, decis\xF5es tranquilas e muitos motivos para comemorar.",
    "Que esta semana traga equil\xEDbrio, seguran\xE7a e novas realiza\xE7\xF5es para voc\xEA e sua fam\xEDlia.",
    "Esperamos que os pr\xF3ximos dias sejam acolhedores, produtivos e cheios de coisas boas.",
    "Que sua semana seja iluminada, organizada e cercada de pessoas que fazem bem.",
    "Desejamos uma semana de crescimento, serenidade e conquistas especiais.",
    "Que cada dia desta semana aproxime voc\xEA dos seus planos e sonhos."
  ];
  return `Ol\xE1, {nome}! \u2600\uFE0F

Bom dia e uma excelente segunda-feira!

${openings[seed % openings.length]}

${encouragements[Math.floor(seed / openings.length) % encouragements.length]}

${closings[Math.floor(seed / (openings.length * encouragements.length)) % closings.length]}

Sempre que precisar de orienta\xE7\xE3o ou quiser conversar sobre seus planos, estamos \xE0 disposi\xE7\xE3o.`;
}

const ready=new WeakSet();
export async function weeklyCopyPair(env,owner,day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Data semanal inválida.');if(!ready.has(env.DB)){await env.DB.prepare('CREATE TABLE IF NOT EXISTS weeklyAutomationCopies(owner TEXT NOT NULL,day TEXT NOT NULL,email TEXT NOT NULL,whatsapp TEXT NOT NULL,PRIMARY KEY(owner,day),UNIQUE(owner,email),UNIQUE(owner,whatsapp))').run();ready.add(env.DB);}const old=await env.DB.prepare('SELECT email,whatsapp FROM weeklyAutomationCopies WHERE owner=? AND day=?').bind(owner,day).first();if(old)return old;for(let attempt=0;attempt<1152;attempt++){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+attempt*7);const email=mondayMessageVariation(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate()),parts=email.split(/\n{2,}/),whatsapp=parts.slice(2,-1).join('\n\n');const used=await env.DB.prepare('SELECT 1 FROM weeklyAutomationCopies WHERE owner=? AND (email=? OR whatsapp=?) LIMIT 1').bind(owner,email,whatsapp).first();if(used)continue;let historical;try{historical=await env.DB.prepare("SELECT 1 FROM clientEmails WHERE lower(agentEmail)=? AND direction='sent' AND visibility='automation' AND instr(body,?)>0 LIMIT 1").bind(owner,whatsapp).first();}catch(error){if(!/no such table/i.test(String(error.message)))throw error;}if(historical)continue;await env.DB.prepare('INSERT OR IGNORE INTO weeklyAutomationCopies(owner,day,email,whatsapp) VALUES(?,?,?,?)').bind(owner,day,email,whatsapp).run();const saved=await env.DB.prepare('SELECT email,whatsapp FROM weeklyAutomationCopies WHERE owner=? AND day=?').bind(owner,day).first();if(saved)return saved;}throw Error('Os textos semanais precisam de novas variações antes de outro envio.');}
export async function weeklyAutomationText(env,owner,day,channel,template){const pair=await weeklyCopyPair(env,owner,day),text=String(template||'');if(text.includes('{mensagem_semana}'))return text.replaceAll('{mensagem_semana}',pair.whatsapp);if(channel==='email'){if(text.trim()==='Olá, {nome}! ☀️\n\nBom dia e uma excelente segunda-feira!\n\nA cada semana, o sistema prepara uma mensagem diferente, motivadora e acolhedora para começar a segunda-feira com energia e confiança.\n\nQue sua semana seja leve, produtiva e cheia de boas notícias. Sempre que precisar, conte conosco.')return pair.email;return text+'\n\n'+pair.whatsapp;}const signature=text.search(/\n\n\*?\*?\{agente_(?:primeiro_nome|nome)\}/);return signature>=0?text.slice(0,signature)+'\n\n'+pair.whatsapp+text.slice(signature):text+'\n\n'+pair.whatsapp;}
