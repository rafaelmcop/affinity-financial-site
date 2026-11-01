export function legacyWhatsappTemplate(occasion){const lines={birthday:'Oi, {nome}! Feliz aniversário! 🎉 Que seu dia seja cheio de alegria e coisas boas. Conte comigo!\n\n{agente_primeiro_nome}',weekly_monday:'Oi, {nome}! Uma ótima semana para você! Se precisar de algo, é só me chamar.\n\n{agente_primeiro_nome}',monthly:'Oi, {nome}! Que este novo mês traga muita coisa boa para você e sua família. Estou por aqui se precisar!\n\n{agente_primeiro_nome}',christmas:'Oi, {nome}! Feliz Natal para você e sua família! Que não faltem paz, saúde e bons momentos. 🎄\n\n{agente_primeiro_nome}',new_year:'Oi, {nome}! Feliz Ano Novo! Que seja um ano de saúde e boas conquistas para você e sua família. ✨\n\n{agente_primeiro_nome}',thanksgiving:'Oi, {nome}! Happy Thanksgiving! Desejo um dia especial para você e sua família. Conte comigo!\n\n{agente_primeiro_nome}',policy_anniversary:'Oi, {nome}! Vamos conferir se sua cobertura continua acompanhando seus planos? Me avise um bom horário para conversarmos.\n\n{agente_primeiro_nome}'};return lines[occasion]||'Oi, {nome}! Passando para saber como você está. Se precisar de algo, pode me chamar por aqui.\n\n{agente_primeiro_nome}';}

const months=['','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const reflections=['','Ano novo, novos planos! Que janeiro traga boas oportunidades para você e sua família. ✨','Que fevereiro seja leve e cheio de bons momentos, mesmo sendo o mês mais curtinho! 💙','Março chegou! Que tal olhar com carinho para os planos do ano e ajustar o que precisar? 🌱','Que abril traga renovação e tranquilidade para cuidar de quem você ama. 🌷','Que maio tenha bons momentos em família e muitos motivos para celebrar. 💐','Já estamos na metade do ano! Que junho ajude a reconhecer as conquistas e renovar os planos. ☀️','Que julho seja leve, com bons momentos em família e tempo para respirar. 🌞','Que agosto traga energia para retomar os planos e seguir em frente. 🚀','Que setembro traga equilíbrio e boas oportunidades nesta nova estação. 🍂','Outubro chegou! Um bom momento para olhar os objetivos e cuidar do que mais importa. 🎃','Que novembro seja de gratidão pelas conquistas e por quem caminha com você. 🍁','Que dezembro traga bons encontros, gratidão e tranquilidade para os próximos planos. ✨'];
export function reducedEmailWhatsapp(email){let text=String(email||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\*\*/g,'*');text=text.split(/\n/).filter(line=>!/(Affinity Financial|Licensed? Agent|www\.affinityfc|\{agente_(?:nome|telefone|whatsapp|email)\}|\{telefone do agente\}|\{email do agente\})/i.test(line)&&!/^\s*(?:Atenciosamente|Cordialmente|Um abraço|Com os melhores cumprimentos)[,.!]?\s*$/i.test(line)).join('\n').replace(/^(?:Olá|Oi|Prezad[oa]|Car[oa]),?\s*\{nome\}[, !]*\s*/i,'').trim();text=text.replace(/quero aproveitar para agradecer sinceramente/gi,'quero agradecer').replace(/estamos à disposição/gi,'estou por aqui').replace(/Entre em contato comigo para/gi,'Me chame para').replace(/Sempre que precisar de orientação, esclarecer alguma dúvida ou conversar sobre seus objetivos, estarei à disposição\./gi,'Se precisar de algo, é só me chamar.');const paragraphs=text.split(/\n{2,}/).filter(Boolean),selected=[];let length=0;for(const paragraph of paragraphs){if(length+paragraph.length>650){if(!selected.length){const sentence=paragraph.match(/^.{1,450}?[.!?](?:\s|$)/)?.[0]?.trim();if(sentence)selected.push(sentence);}break;}selected.push(paragraph);length+=paragraph.length;}return 'Olá, {nome}! 😊\n\n'+(selected.join('\n\n')||'Se precisar de algo, pode me chamar por aqui.')+'\n\n{agente_primeiro_nome}';}
export function shortWhatsappTemplate(occasion,email='',context={}){if(occasion==='policy_anniversary')return `Olá, {nome}! 🎉

Parabéns! Sua apólice completou mais um ano de proteção! 💙

Nesse período, muita coisa pode ter mudado: família, saúde, trabalho ou planos financeiros.

Por isso, gostaria de convidar você para uma **breve revisão anual**, para avaliarmos sua cobertura e acompanharmos a evolução da sua apólice, mesmo que nada tenha mudado.

📅 **Vamos agendar?** Escolha o melhor horário para você:

👉 {link_agenda}

Será um prazer conversar com você! 🤝

**{agente_primeiro_nome}**
Affinity Financial Consulting`;
if(occasion==='weekly_monday')return 'Olá, {nome}! ☀️\n\n{mensagem_semana}\n\nUma ótima semana! Conte comigo. 💙\n\n{agente_primeiro_nome}';
if(email)return reducedEmailWhatsapp(email);
if(occasion==='monthly'&&reflections[Number(context.monthNumber)])return 'Olá, {nome}! 😊\n\n'+reflections[Number(context.monthNumber)]+'\n\nSe quiser conversar sobre seus planos, estou por aqui!\n\n{agente_primeiro_nome}';
if(occasion==='thanksgiving')return 'Olá, {nome}! 🍁\n\nNeste Thanksgiving, quero agradecer pela sua confiança! Desejo um dia de gratidão e bons momentos com quem você ama. 🤎\n\nConte comigo!\n\n{agente_primeiro_nome}';
if(occasion==='custom'&&email)return reducedEmailWhatsapp(email);
return legacyWhatsappTemplate(occasion);}
