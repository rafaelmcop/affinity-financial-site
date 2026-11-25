import {requiredClientName,makeThankYouLetter,loadLetterFontkit} from './policy-print-kit.js?v=1';
import QRCode from './vendor/qrcode.mjs';
const clean=value=>String(value||'').normalize('NFC').replace(/[^\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2026]/g,'').trim();
export async function makePolicyLabel(agent,clientName,logoBytes){
 clientName=requiredClientName(clientName);
 const {PDFDocument,StandardFonts,rgb,PDFName,PDFString}=globalThis.PDFLib;
 const target=new URL(agent.url);if(!['https://www.affinityfc.org','https://portal.affinityfc.org'].includes(target.origin)||target.pathname!=='/minha-apolice'||!/^[a-f0-9-]{36}$/.test(target.searchParams.get('agente')||''))throw Error('Link do agente inválido.');
 const doc=await PDFDocument.create(),page=doc.addPage([288,432]),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);const black=rgb(0,0,0);
 const text=(value,y,size=10,x=null,f=font,max=252)=>{value=clean(value);while(f.widthOfTextAtSize(value,size)>max&&size>5)size-=.2;page.drawText(value,{x:x===null?(288-f.widthOfTextAtSize(value,size))/2:x,y,size,font:f,color:black});};
 const line=y=>page.drawLine({start:{x:18,y},end:{x:270,y},thickness:.5,color:black});
 if(agent.affinityTeam===false){text(agent.company||agent.name,374,22,null,bold);text('Sua proteção, sempre perto',351,10);}else{const logo=await doc.embedPng(logoBytes),height=230*logo.height/logo.width;page.drawImage(logo,{x:29,y:352,width:230,height});}line(337);
 text('Sua caixinha de proteção chegou!',316,13);
 const client=clean(clientName).slice(0,100);
 text(client?`Preparada para ${client}`:'Agora sua proteção está mais perto de você.',295,10.4,null,client?bold:font);
 text('Obrigado pela confiança!',277,11);
 text('Guarde sua apólice em um lugar seguro.',245,10.8);
 text('E conte às pessoas que você ama',227,10.8);
 text('onde ela está. Cuidar também é compartilhar.',209,10.8);line(195);
 const qr=QRCode.create(agent.url,{errorCorrectionLevel:'M'}),count=qr.modules.size,cell=102/(count+8);
 for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.modules.get(row,col))page.drawRectangle({x:18+(col+4)*cell,y:97+102-(row+5)*cell,width:cell+.01,height:cell+.01,color:black});
 text('SUA APÓLICE SEMPRE COM VOCÊ',179,7.4,127,bold,143);text('Baixe o app e cadastre',161,10,127,font,143);text('seu acesso na National Life.',146,9,127,font,143);text('Aponte a câmera para o QR.',128,8.5,127,font,143);text('Seu agente já estará selecionado.',114,7.8,127,font,143);line(96);
 text(agent.name,76,13,null,bold);text('Conte comigo!',61,10);if(agent.phone)text(agent.phone,44,10.5);if(agent.email)text(agent.email,29,9.3);text(agent.affinityTeam===false?agent.website||'': 'www.affinityfc.org',14,10);
 const annotation=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[18,97,120,199],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(agent.url)}}));page.node.set(PDFName.of('Annots'),doc.context.obj([annotation]));doc.setTitle('Sua apólice sempre com você');doc.setAuthor('Affinity Financial Consulting');return doc.save();
}
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id);let agent=null;
 $('personal-label-open')?.addEventListener('click',async()=>{$('personal-label-dialog').showModal();$('personal-agent').textContent='Carregando seus dados…';$('label-status').textContent='';$('personal-label-download').disabled=true;try{const r=await fetch('/api/materials/personalization',{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível carregar seu perfil.');agent=data;$('personal-agent').textContent=[agent.name,agent.phone,agent.email].filter(Boolean).join(' · ');if(!agent.phone&&!agent.email)throw Error('Adicione seu telefone ou e-mail profissional em Perfil antes de gerar a etiqueta.');$('personal-label-download').disabled=false;}catch(e){$('personal-agent').textContent=e.message;}});
 $('personal-label-cancel')?.addEventListener('click',()=>$('personal-label-dialog').close());
 let downloads=[];
 const clearDownloads=()=>{for(const url of downloads)URL.revokeObjectURL(url);downloads=[];$('print-files').hidden=true;};
 $('label-client')?.addEventListener('input',()=>{clearDownloads();$('label-client').setCustomValidity('');$('label-status').textContent='';});
 $('personal-label-download')?.addEventListener('click',async()=>{
  const button=$('personal-label-download');let name;
  try{name=requiredClientName($('label-client').value);}catch(error){$('label-client').setCustomValidity(error.message);$('label-client').reportValidity();$('label-status').textContent=error.message;return;}
  button.disabled=true;$('label-client').disabled=true;clearDownloads();$('label-status').textContent='Preparando a etiqueta e a carta…';
  try{
   const read=async path=>{const response=await fetch(path);if(!response.ok)throw Error('Não foi possível carregar o modelo de impressão. Tente novamente.');return response.arrayBuffer()};
   const [logo,template,font,fontkit]=await Promise.all([read('/policy-welcome-logo.png'),read('/print-templates/thank-you-letter-v1.pdf'),read('/print-templates/Caladea-Regular.ttf'),loadLetterFontkit()]);
   const label=await makePolicyLabel(agent,name,logo),letter=await makeThankYouLetter(template,name,font,fontkit),slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
   for(const [id,bytes,filename]of [['download-label',label,'etiqueta-'+slug+'.pdf'],['download-letter',letter,'carta-de-agradecimento-'+slug+'.pdf']]){const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));downloads.push(url);$(id).href=url;$(id).download=filename;}
   $('print-files').hidden=false;$('label-status').textContent='Dois PDFs prontos. Baixe separadamente e escolha a impressora de cada arquivo. Etiqueta: 4×6. Carta: papel Letter (8,5×11). Imprima em tamanho real (100%).';
  }catch(error){$('label-status').textContent=error.message||'Não foi possível gerar os documentos.';}finally{button.disabled=false;$('label-client').disabled=false;}
 });
 $('personal-label-open')?.addEventListener('click',clearDownloads);
 window.addEventListener('pagehide',clearDownloads);
}
