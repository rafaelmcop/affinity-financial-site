export function meetingAgentProfile(saved,responsible){
 const result={...responsible};for(const[key,value]of Object.entries(saved||{}))if(value!==null&&value!==undefined&&String(value).trim())result[key]=value;
 if(!String(result.name||'').trim())throw Error('Não foi possível identificar o agente responsável. Atualize a página antes de preparar a mensagem.');return result;
}
export function meetingAgentSignature(profile){
 const name=String(profile.name||'').trim();if(!name)throw Error('O agente responsável precisa ter o nome cadastrado.');
 const phone=profile.phone||profile.whatsapp||'',email=profile.contactEmail||profile.email||'';
 let text=String(profile.messageSignature||'{agente_nome}\nAffinity Financial Consulting Inc.\n📞 {agente_telefone}\n✉️ {agente_email}\n🌐 www.affinityfc.org').replaceAll('{agente_nome}',name).replaceAll('{agente}',name).replace(/Seu agente Affinity/gi,name).replaceAll('{agente_telefone}',phone).replaceAll('{telefone do agente}',phone).replaceAll('{agente_email}',email).replaceAll('{email do agente}',email);
 if(!text.toLocaleLowerCase().includes(name.toLocaleLowerCase()))text=name+'\n'+text;
 return text.split('\n').filter(line=>line.trim()&&!(line.includes('✉️')&&!email)&&!(line.includes('📞')&&!phone)).join('\n');
}
