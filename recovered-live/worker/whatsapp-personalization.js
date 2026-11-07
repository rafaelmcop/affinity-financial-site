import {shortWhatsappTemplate,legacyWhatsappTemplate} from '../public/assets/whatsapp-automation-templates.js';
import {meetingReminderDefaults} from '../public/assets/meeting-reminder-templates.js';
// Curated contextual wording, not obfuscation or a bypass of provider safeguards.
const ready=new WeakSet();
const greetings=['Olá, {nome}!','Oi, {nome}!','{nome}, olá!','Olá, {nome}! 😊','Oi, {nome}! Tudo bem?'];
const birthday=[
 'Feliz aniversário! 🎉 Desejo um dia cheio de alegria e um novo ano de saúde e bons momentos. Conte comigo!',
 'Passando para desejar um feliz aniversário! 🎂 Que seu novo ciclo traga paz, saúde e muitas coisas boas. Estou por aqui se precisar.',
 'Parabéns pelo seu dia! 💙 Que não faltem motivos para celebrar hoje e durante todo o novo ano. Um abraço, conte comigo!',
 'Hoje é seu dia! Feliz aniversário! 🎉 Desejo saúde, tranquilidade e muitos momentos felizes com quem você ama. Pode contar comigo.',
 'Feliz aniversário! 🎂 Que este novo ano de vida venha com boas notícias e muitos motivos para sorrir. Receba meu abraço, estou à disposição.'
];
const meeting={day_before:[
 'Lembrando do nosso encontro em {data}, às {hora} (horário de Nova York). Vamos conversar pelo Zoom. Se ainda não tiver o aplicativo, confira os links abaixo. Até lá!',
 'Nosso encontro está marcado para {data}, às {hora} (horário de Nova York), pelo Zoom. Vale conferir câmera, áudio e aplicativo com antecedência. Até nosso encontro!',
 'Passando para confirmar nosso horário: {data}, às {hora} (horário de Nova York). A reunião será pelo Zoom. Os links para instalar o aplicativo estão abaixo. Se precisar de ajuda, me avise.'
],half_hour:[
 'Seu encontro com {agente_nome} é {quando}, às {hora} (horário de Nova York). Segue o acesso pelo Zoom:\n{link_reuniao}\n\nAté já!',
 'Passando para lembrar do horário da conversa com {agente_nome}: {quando}, às {hora} (horário de Nova York). Vamos nos encontrar pelo Zoom:\n{link_reuniao}\n\nNos vemos em breve!',
 'Está chegando o horário do encontro com {agente_nome} {quando}, às {hora} (horário de Nova York). Este é o link do Zoom para participar:\n{link_reuniao}\n\nSe precisar de ajuda para entrar, me avise.'
]};
export function contextualWhatsappTemplate(template,{kind,stage,sequence}){
 const original=String(template||''),index=Math.max(0,(Number(sequence)||1)-1),greeting=greetings[index%greetings.length];
 const standard=kind==='birthday'?[shortWhatsappTemplate('birthday'),legacyWhatsappTemplate('birthday')].includes(original):original===meetingReminderDefaults[stage]?.whatsappMessage;
 if(standard){const bodies=kind==='birthday'?birthday:meeting[stage];if(bodies)return greetings[Math.floor(index/bodies.length)%greetings.length]+'\n\n'+bodies[index%bodies.length]+(kind==='meeting'&&stage==='day_before'?'\n\niPhone: {zoom_iphone}\nAndroid: {zoom_android}':'')+'\n\n{agente_primeiro_nome}';}
 // Keep the agent's custom instructions, promises, links and closing verbatim.
 // Only a recognized initial greeting is varied; an unrecognized custom text is unchanged.
 const customPool=/^(?:Hello|Hi)\b/i.test(original)?['Hello, {nome}!','Hi, {nome}!','Hello, {nome}! 😊','Hi, {nome}! How are you?','{nome}, hello!']:/^¡?Hola\b/i.test(original)?['¡Hola, {nome}!','Hola, {nome}!','¡Hola, {nome}! 😊','Hola, {nome}! ¿Cómo estás?','{nome}, ¡hola!']:greetings;const customGreeting=customPool[index%customPool.length].replace(/ Tudo bem\?$/,' 😊');
 return original.replace(/^(?:Olá|Oi|Hello|Hi|¡?Hola),?\s*\{nome\}[!,.]?(?:[ \t]*😊)?[ \t]*/i,match=>customGreeting+(match.endsWith('\n')?'\n':original.slice(match.length).startsWith('\n')?'':' '));
}
export async function automaticWhatsappTemplate(env,{owner,eventKey,kind,stage,template}){
 if(!ready.has(env.DB)){await env.DB.prepare('CREATE TABLE IF NOT EXISTS whatsappCopySequence(owner TEXT NOT NULL,eventKey TEXT NOT NULL,kind TEXT NOT NULL,sequence INTEGER NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,eventKey))').run();ready.add(env.DB);}
 const inserted=await env.DB.prepare('INSERT INTO whatsappCopySequence(owner,eventKey,kind,sequence) SELECT ?,?,?,coalesce(max(sequence),0)+1 FROM whatsappCopySequence WHERE owner=? AND kind=? ON CONFLICT(owner,eventKey) DO NOTHING RETURNING sequence').bind(owner,eventKey,kind,owner,kind).first();
 const row=inserted||await env.DB.prepare('SELECT sequence FROM whatsappCopySequence WHERE owner=? AND eventKey=? AND kind=?').bind(owner,eventKey,kind).first();
 if(!row)throw Error('Não foi possível preparar o texto do aviso.');
 return contextualWhatsappTemplate(template,{kind,stage,sequence:row.sequence});
}
